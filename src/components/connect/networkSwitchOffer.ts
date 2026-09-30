import { resolveSphereNetwork } from '@unicitylabs/sphere-sdk/connect';
import type { NetworkInfo } from '@unicitylabs/sphere-sdk/connect';
import { NETWORKS } from '@unicitylabs/sphere-sdk';
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import { SPHERE_NETWORK, SUPPORTED_NETWORKS, isSwitchableNetwork } from '../../config/network';
import { isTestMoney } from '../../config/networkCapabilities';

/**
 * Why evaluateSwitchOffer will not offer a switch. Every value is a state the caller can
 * log and word honestly; none of them is a generic "something went wrong".
 *
 * This is NOT every case of spec section 9, and cannot be. It names only what this pure
 * function decides: the id and wallet-network checks, availability, and the mute.
 *  - A dApp that declared no network never reaches this function (the SDK does not call
 *    the hook for it), so there is deliberately no such member: that case's copy belongs to
 *    the rejection message (describeConnectRejection). The same holds for a failure that
 *    is not the network check, and for a silent attempt.
 *  - A locked wallet and another consent modal being up (the rest of section 9's last
 *    item) are decided by ConnectProvider.requestNetworkSwitch, which also refuses an
 *    origin that is not usable, a pair the user already declined this session, and a
 *    deadline already past. Its unseen refusals come back as
 *    `{ accepted: false, suppressFuturePrompts: false }`, which is exactly what a user's
 *    plain "Not now" looks like, so the caller cannot tell them apart and no reason
 *    reaches the rejection copy for them. Only the generic sentence is shown. Widening
 *    the answer type to say why was considered and left out.
 */
export type SwitchRefusal =
  | 'unknown-network'
  | 'already-current'
  | 'wallet-network-unknown'
  | 'not-served-here'
  | 'coming-soon'
  | 'suppressed';

export type SwitchOffer =
  | {
      kind: 'offer';
      target: NetworkType;
      targetLabel: string;
      currentLabel: string;
      /**
       * Whether switching to `target` puts the user on a network whose money is real.
       * Answered by the wallet's fail-closed test-money allowlist, so it is true for
       * every network that list does not name, mainnet or not, and stays true for a
       * network added later until someone lists it as play money on purpose.
       */
      movesRealFunds: boolean;
    }
  | { kind: 'refuse'; reason: SwitchRefusal };

/**
 * Turn a network mismatch into either a concrete target or a named refusal.
 *
 * Pure: no React, no storage, no host. The checks run in the order below, and
 * the order is load-bearing:
 *   1. suppressed, hoisted to the front so a muted origin is refused before
 *      anything names a network at all;
 *   2. wallet-network-unknown, hoisted ahead of resolving the peer's id, because
 *      comparing a dApp's network against a wallet network we do not trust is a
 *      guess, and every label a prompt could show would inherit that guess;
 *   3. unknown-network, then already-current, then availability
 *      (not-served-here or coming-soon). already-current precedes availability
 *      so an inconsistent state is logged as itself rather than as "coming soon".
 * Spec section 9 lists these refusals as a set of cases, not an evaluation
 * order; do not reorder this to match its numbering.
 *
 * The dApp's declared `name` is never read. Only its `id` decides the target: a
 * hostile origin can label id 1 "Testnet" and would otherwise talk a user onto
 * real funds.
 */
export function evaluateSwitchOffer(input: {
  clientNetwork: NetworkInfo;
  walletNetwork: NetworkInfo;
  suppressed: boolean;
}): SwitchOffer {
  if (input.suppressed) return { kind: 'refuse', reason: 'suppressed' };

  // The wallet's own side of the comparison comes from the SDK's trust base, not
  // from this deployment's config. When the two disagree, or the host passed its
  // "I do not know" sentinel, every sentence a prompt could say would be a guess.
  //
  // The first two clauses (non-integer, negative) are deliberate and independent
  // of the third, even though the third subsumes them today. The third only
  // holds while `ours` is guaranteed to be a real id; this check exists to
  // refuse when the wallet does not know itself, so it must not lean on that.
  const ours = NETWORKS[SPHERE_NETWORK].networkId;
  if (
    !Number.isInteger(input.walletNetwork.id) ||
    input.walletNetwork.id < 0 ||
    input.walletNetwork.id !== ours
  ) {
    return { kind: 'refuse', reason: 'wallet-network-unknown' };
  }

  // resolveSphereNetwork, never a lookup over NETWORKS: testnet and testnet2 both
  // hold networkId 4, so that table cannot be inverted, and the alias it would
  // hand back is not switchable. A malformed id (NaN, negative, fractional,
  // Infinity) matches no entry, so it falls out here as unknown-network with no
  // separate validation.
  const entry = resolveSphereNetwork(input.clientNetwork.id);
  if (!entry) return { kind: 'refuse', reason: 'unknown-network' };

  const target: NetworkType = entry.name;
  if (target === SPHERE_NETWORK) return { kind: 'refuse', reason: 'already-current' };

  const row = SUPPORTED_NETWORKS.find((n) => n.id === target);
  if (!row || !row.available || !isSwitchableNetwork(target)) {
    // setActiveNetwork THROWS on an unswitchable id, so this branch is what keeps
    // an offer from becoming an exception at the click. 'not-onboarded' and
    // 'not-rolled-out' both read as "coming soon", the copy networkRows.ts already
    // shows for them; 'not-served-here' keeps its own reason because it says
    // something different: this deployment has no backend for that network.
    return {
      kind: 'refuse',
      reason: row?.unavailableReason === 'not-served-here' ? 'not-served-here' : 'coming-soon',
    };
  }

  return {
    kind: 'offer',
    target,
    targetLabel: NETWORKS[target].name,
    currentLabel: NETWORKS[SPHERE_NETWORK].name,
    // The wallet's own question, answered the wallet's own way: config/networkCapabilities
    // is where "is this play money" lives, and it FAILS CLOSED (an explicit allowlist, so a
    // network nobody has listed is treated as real). Every other money gate in the wallet,
    // including the Settings switcher that also calls setActiveNetwork, asks it. A literal
    // `target === 'mainnet'` would fail open the day a second real-value network is served:
    // one click onto real funds here while every other gate refuses it. So the modal never
    // needs the network table to decide, and nothing here needs to know it is mainnet.
    movesRealFunds: !isTestMoney(target),
  };
}
