import { useCallback, useRef } from 'react';
import type {
  ConnectHost,
  DAppMetadata,
  NetworkMismatchContext,
  NetworkMismatchDecision,
} from '@unicitylabs/sphere-sdk/connect';
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import { claimNetworkSwitchGrace, setActiveNetwork } from '../../config/network';
import { isSwitchPromptSuppressed, suppressSwitchPrompt } from '../../utils/network-switch-prompts';
import { showToast } from '../ui/toast-utils';
import { useConnectContext } from './ConnectContext';
import type { NetworkSwitchAnswer, PendingNetworkSwitch } from './ConnectContext';
import { evaluateSwitchOffer } from './networkSwitchOffer';
import type { SwitchRefusal } from './networkSwitchOffer';

/**
 * The wallet's answer to "this dApp is built for another network", shared by BOTH
 * Connect hosts (the ConnectPage popup and the framed IframeAgent). One body, so the
 * copy, the deadline rules and the ordering below cannot drift between them.
 *
 * Everything here is about ordering, because every wrong order fails quietly:
 *
 * 1. DEADLINE, TWICE. `ctx.expiresAt` is when the host stops waiting and answers the
 *    dApp with its own refusal. It is checked before anything is asked (no point putting
 *    a question to a human whose answer nobody is listening for) and again after the
 *    answer comes back, because a prompt can outlive the deadline. The host ignores a
 *    late answer, but this wallet's side effects would still run: a late accept would
 *    switch networks and reload the page for a handshake that was already refused.
 *
 * 2. RESOLVE, THEN SWITCH. `setActiveNetwork`'s last statement is
 *    `window.location.reload()`, and the host still has to post its answer to the dApp
 *    through the window that reload destroys. So the decision is returned first and the
 *    switch runs from a TIMER, not a microtask: a microtask queued before this function
 *    returns runs BEFORE the host's own continuation (the promise reactions are queued
 *    later), so `queueMicrotask` would reload the page ahead of the frame it is meant to
 *    follow. A timer callback runs only after the microtask queue drains, and the host's
 *    whole path from our return to `transport.send` is microtasks.
 *
 * 3. THE ORIGIN. `origin` is the transport-verified one the host was built with, the
 *    same variable its `onConnectionRequest` closes over. The mute store and the switch
 *    marker only accept it in canonical form, and the grace claim compares it with `===`,
 *    so a re-derived spelling would fail closed and silently: the dApp comes back to a
 *    refused handshake with no UI. Never `ctx.origin`, never `dapp.url`.
 *
 * Nothing the peer typed is read. `dapp` is ignored, and only `ctx.clientNetwork.id`
 * decides the target (evaluateSwitchOffer).
 */

type MismatchHandler = (
  dapp: DAppMetadata,
  ctx: NetworkMismatchContext,
) => Promise<NetworkMismatchDecision>;

/**
 * Carries a refusal's reason from the network hook to the host's rejection surface.
 *
 * The SDK calls `onNetworkMismatch` first and, when it refuses, `onConnectionRejected`
 * right after for the SAME handshake. The reason is only known to the first, and the
 * copy is drawn by the second, so it has to travel. One note per host; both callbacks
 * run on the same host, in that order, with only microtasks between them.
 */
export interface SwitchRefusalNote {
  /** Remember why this network id was not offered a switch. Overwrites. */
  record(clientNetworkId: number, reason: SwitchRefusal): void;
  /**
   * Hand the reason over exactly once, from `onConnectionRejected`. It is returned only
   * when the rejection is about the SAME declared network id, so a note left behind by a
   * handshake whose rejection never came (the SDK skips it when the wallet's own network
   * moved under the prompt) cannot decorate an unrelated one. Always clears.
   */
  take(rejectionData: Record<string, unknown> | undefined): SwitchRefusal | undefined;
  /** Drop whatever is held. Called at the start of every hook run. */
  discard(): void;
}

export function createSwitchRefusalNote(): SwitchRefusalNote {
  let held: { clientNetworkId: number; reason: SwitchRefusal } | null = null;
  return {
    record(clientNetworkId, reason) {
      held = { clientNetworkId, reason };
    },
    take(rejectionData) {
      const mine = held;
      held = null;
      if (!mine) return undefined;
      // error.data.clientNetwork is the raw wire value; only its id is compared, and it is
      // never rendered.
      const declared = rejectionData?.clientNetwork;
      const id =
        typeof declared === 'object' && declared !== null
          ? (declared as { id?: unknown }).id
          : undefined;
      return id === mine.clientNetworkId ? mine.reason : undefined;
    },
    discard() {
      held = null;
    },
  };
}

export interface NetworkMismatchDeps {
  /** The host asking. Each host passes the one it just built, not a ref that may point at a successor. */
  host: ConnectHost;
  /** The transport-verified origin, exactly as the host's onConnectionRequest sees it. */
  origin: string;
  note: SwitchRefusalNote;
  requestNetworkSwitch: (
    host: ConnectHost,
    origin: string,
    offer: PendingNetworkSwitch['offer'],
  ) => Promise<NetworkSwitchAnswer>;
  /** Persist the choice and reload. Injectable because a reload cannot run under jsdom. */
  switchNetwork: (target: NetworkType, origin: string) => void;
}

const refuse = (): NetworkMismatchDecision => ({ action: 'refuse' });

/**
 * True once the host has stopped waiting. Written as the negation of "still before it" so
 * a missing or non-numeric `expiresAt` reads as expired: with no deadline to trust, the
 * safe answer is to not prompt and not act.
 */
const pastDeadline = (ctx: NetworkMismatchContext): boolean => !(Date.now() < ctx.expiresAt);

export function createNetworkMismatchHandler(deps: NetworkMismatchDeps): MismatchHandler {
  const { host, origin, note } = deps;

  return async (_dapp, ctx) => {
    note.discard();

    // Deadline check 1 of 2: before a human is asked anything.
    if (pastDeadline(ctx)) return refuse();

    // The target has to be known before the mute can be looked up (it is keyed by target),
    // and evaluateSwitchOffer is the only thing allowed to name one. So: evaluate once to
    // learn it; if that target is muted for this origin, evaluate again with the mute on, so
    // the refusal (and its reason) still comes from the same function.
    const input = { clientNetwork: ctx.clientNetwork, walletNetwork: ctx.walletNetwork };
    const probe = evaluateSwitchOffer({ ...input, suppressed: false });
    const offer =
      probe.kind === 'offer' && isSwitchPromptSuppressed(origin, probe.target)
        ? evaluateSwitchOffer({ ...input, suppressed: true })
        : probe;

    if (offer.kind === 'refuse') {
      // Say why through the host's own rejection surface; it runs right after this returns.
      note.record(ctx.clientNetwork.id, offer.reason);
      return refuse();
    }

    const answer = await deps.requestNetworkSwitch(host, origin, offer);

    // Deadline check 2 of 2: the prompt may have been open past it. The host has already
    // answered the dApp and ignores whatever this returns, so do nothing that has an effect,
    // including the mute: a decision made about a handshake that no longer exists is not one
    // to act on, and failing to act on it only means the user is asked again.
    if (pastDeadline(ctx)) return refuse();

    if (!answer.accepted) {
      // The mute is written HERE, not by the modal or the provider: this is the one place
      // that owns both the origin and the target, so there is a single writer to diverge.
      if (answer.suppressFuturePrompts && !suppressSwitchPrompt(origin, offer.target)) {
        showToast('Could not save your choice, so this app may ask again.', 'warning');
      }
      return refuse();
    }

    const { target, targetLabel } = offer;
    // Resolve FIRST, switch after (see the header). The timer is what puts the reload
    // behind the host's frame.
    setTimeout(() => {
      try {
        deps.switchNetwork(target, origin);
      } catch (err) {
        // The host has already told the dApp the wallet is switching. Say the wallet is not.
        showToast(`Could not switch to ${targetLabel}. You can switch in Settings.`, 'error', undefined, {
          cause: err,
        });
      }
    }, 0);
    return { action: 'switch', to: { id: ctx.clientNetwork.id } };
  };
}

export type MakeNetworkMismatchHandler = (
  host: ConnectHost,
  origin: string,
  note: SwitchRefusalNote,
) => MismatchHandler;

/**
 * `(host, origin, note) => onNetworkMismatch`. The returned factory is stable across
 * renders and always reads the LATEST `requestNetworkSwitch`, so a host may build its
 * ConnectHost once and keep calling it.
 */
export function useNetworkMismatchHandler(): MakeNetworkMismatchHandler {
  const { requestNetworkSwitch } = useConnectContext();
  const requestRef = useRef(requestNetworkSwitch);
  requestRef.current = requestNetworkSwitch;

  return useCallback(
    (host, origin, note) =>
      createNetworkMismatchHandler({
        host,
        origin,
        note,
        requestNetworkSwitch: (h, o, offer) => requestRef.current(h, o, offer),
        switchNetwork: (target, forOrigin) => setActiveNetwork(target, { forOrigin }),
      }),
    [],
  );
}

/**
 * May this SILENT handshake be upgraded to the ordinary approval modal? The one place
 * both hosts ask, so the rule cannot differ between them.
 *
 * Only for a LIVE wallet. The SDK forces a handshake silent while the wallet is locked,
 * so "silent" also means "locked", and a locked wallet cannot consent to anything: opening
 * the approval modal there would let whoever is at the lock screen grant an origin, and
 * would spend the one-shot on a handshake that cannot use it. Refusing without claiming
 * keeps the grace for the retry the dApp makes once the wallet is unlocked.
 *
 * It grants nothing. It only lets the approval modal appear, which still asks for consent,
 * on the new network. `origin` must be the host's own variable (see the header).
 */
export function claimGraceForSilentHandshake(host: ConnectHost, origin: string): boolean {
  if (host.walletState !== 'live') return false;
  return claimNetworkSwitchGrace(origin);
}
