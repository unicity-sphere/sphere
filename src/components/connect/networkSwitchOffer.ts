import { resolveSphereNetwork } from '@unicitylabs/sphere-sdk/connect';
import type { NetworkInfo } from '@unicitylabs/sphere-sdk/connect';
import { NETWORKS } from '@unicitylabs/sphere-sdk';
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import { SPHERE_NETWORK, SUPPORTED_NETWORKS, isSwitchableNetwork } from '../../config/network';

/**
 * Why a network switch cannot be offered. Every value is a state the caller can
 * log and word honestly; none of them is a generic "something went wrong".
 *
 * 'no-network-declared' is part of the vocabulary but is never produced here:
 * this function takes a DECLARED network by construction. A caller that has no
 * `clientNetwork` at all refuses with that reason itself, before it gets this far.
 */
export type SwitchRefusal =
  | 'no-network-declared'
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
      isMainnet: boolean;
    }
  | { kind: 'refuse'; reason: SwitchRefusal };

/**
 * Turn a network mismatch into either a concrete target or a named refusal.
 *
 * Pure: no React, no storage, no host. The order of the checks below is
 * load-bearing and is the order of the refusal list in the spec (section 9): a
 * suppressed origin is refused before anything that would name a network, and
 * `already-current` comes before availability, so an inconsistent state is
 * logged as itself rather than as "coming soon".
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
  // hand back is not switchable.
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
    // So the modal never needs the network table to decide whether real funds
    // are involved.
    isMainnet: target === 'mainnet',
  };
}
