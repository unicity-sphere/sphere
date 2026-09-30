import { createContext, useContext } from 'react';
import type {
  ConnectHost,
  DAppMetadata,
  LockedRequestContext,
  PermissionScope,
} from '@unicitylabs/sphere-sdk/connect';
import type { SwitchOffer } from './networkSwitchOffer';

export interface PendingApproval {
  /** Monotonic id — approvals queue, so entries need identity. */
  id: number;
  /**
   * The host that asked. All pending state is keyed by host: DesktopLayout keeps
   * every open tab mounted, so several hosts can be asking at once and a single
   * global slot silently dropped one of them (graceful lock §8.4).
   */
  host: ConnectHost;
  dapp: DAppMetadata;
  permissions: PermissionScope[];
  /**
   * The transport-verified origin the dApp is loaded from (from the iframe URL
   * or the popup `origin` param, enforced by the transport's allowedOrigins).
   * This — NOT the dApp-supplied `dapp.url` — is the trust anchor shown to the
   * user. See config/agentOrigins.ts.
   */
  origin: string;
  resolve: (result: { approved: boolean; grantedPermissions: PermissionScope[] }) => void;
}

/** The wallet's answer to an intent. The host relays `error.data` to the dApp as the error's `data`. */
export interface IntentAnswer {
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface PendingIntent {
  id: number;
  host: ConnectHost;
  /** Transport-verified origin of the dApp that sent the intent. Never dapp.url. */
  origin: string;
  action: string;
  params: Record<string, unknown>;
  resolve: (result: IntentAnswer) => void;
  /**
   * The host's signal for this intent. It aborts once the host stops waiting — its
   * deadline, a lock, a revoked session — having answered the dApp itself; the intent
   * then leaves the queue, and nothing may act on it.
   */
  signal?: AbortSignal;
}

/**
 * Two independent facts, so they cannot be conflated: whether to switch now, and
 * whether this origin may ask again. A user can decline once without muting, and
 * can mute while still accepting this one switch.
 *
 * Every path that ends WITHOUT the user having answered resolves
 * `{ accepted: false, suppressFuturePrompts: false }`: a refusal nobody saw must
 * never be recorded as a decision they made. Those paths are the ones refused at
 * the door (locked, another modal up, a prompt already open, an origin that is not
 * usable, an origin and target the user already declined this session, a deadline
 * already past) and the ones that settle a prompt that was open: a lock, a closing
 * host, and the deadline timer that takes down a prompt whose host has stopped
 * waiting. None of them is the user's decline, and none may be recorded as one.
 * Note the consequence: a caller cannot tell any of them from a plain "Not now".
 */
export interface NetworkSwitchAnswer {
  accepted: boolean;
  suppressFuturePrompts: boolean;
}

export interface PendingNetworkSwitch {
  id: number;
  host: ConnectHost;
  /** The transport-verified origin. NEVER dapp.url — this is what the prompt names. */
  origin: string;
  /**
   * What the prompt says, resolved by evaluateSwitchOffer from the wallet's own
   * network table. Both labels come from there, never from the peer's declared
   * network name.
   */
  offer: Extract<SwitchOffer, { kind: 'offer' }>;
  resolve: (answer: NetworkSwitchAnswer) => void;
}

export type AutoIntentHandler = (
  action: string,
  params: Record<string, unknown>,
) => Promise<IntentAnswer | null>;

export interface ConnectContextValue {
  /**
   * Called by a ConnectHost (IframeAgent / ConnectPage) when a dApp requests connection.
   * Queued FIFO, except that it is denied on the spot (`approved: false`, never shown) while
   * a network-switch prompt is open: an approval queued behind it would be uncovered under
   * the cursor when the prompt is answered.
   */
  requestApproval: (
    host: ConnectHost,
    dapp: DAppMetadata,
    permissions: PermissionScope[],
    origin: string,
  ) => Promise<{ approved: boolean; grantedPermissions: PermissionScope[] }>;

  /**
   * Called by a ConnectHost when a dApp sends an intent. Queued FIFO per wallet. Pass the
   * host's `IntentContext.signal`: the SDK requires the wallet to dismiss an intent's
   * modal once it aborts.
   *
   * An intent that needs a modal is refused on the spot, as `INTENT_CANCELLED` (nothing was
   * started, so the dApp may ask again), while a network-switch prompt is open: it would
   * otherwise be uncovered under the cursor when the prompt is answered. An auto-approved
   * intent opens no modal and is unaffected.
   */
  requestIntent: (
    host: ConnectHost,
    origin: string,
    action: string,
    params: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<IntentAnswer>;

  /**
   * Called by a ConnectHost when a dApp's declared network differs from the wallet's and the
   * wallet could switch. Resolves with the user's answer; the caller acts on it.
   *
   * One prompt at a time, and never over another consent surface, so it is REFUSED
   * IMMEDIATELY (resolved, never queued):
   *   - while the wallet is locked;
   *   - while any approval or intent modal is pending, or a network-switch prompt is open;
   *   - for an `origin` that is not a usable one (`isUsableOrigin`): the prompt names it, so
   *     it must name exactly one site;
   *   - for an origin that already turned down this same target in this page session. That
   *     memory is in-memory only; the persisted "do not ask again" record is the caller's,
   *     and separate.
   * Those checks live here, not in the hosts, so no host can forget one. A refusal the user
   * never saw resolves `{ accepted: false, suppressFuturePrompts: false }`.
   *
   * This provider never writes the "do not ask again" record: `suppressFuturePrompts` rides
   * back in the answer and the caller, which also owns the origin and the target, writes it.
   *
   * `expiresAt` (epoch ms, the `NetworkMismatchContext` deadline) is when the SDK host stops
   * waiting and answers its own refusal. It exists so an abandoned prompt frees its slot: the
   * entry settles as unseen when it passes, and a request whose deadline is already past is
   * refused on the spot. It is NOT the guard against a late accept (a user can answer in the
   * last instant before it fires): the caller re-checks the deadline after the answer.
   */
  requestNetworkSwitch: (
    host: ConnectHost,
    origin: string,
    offer: PendingNetworkSwitch['offer'],
    expiresAt?: number,
  ) => Promise<NetworkSwitchAnswer>;

  /**
   * NOTIFY-ONLY: a host has just answered WALLET_LOCKED (4009). The host has
   * ALREADY answered and never waits for this.
   *
   * THIS MUST NEVER RAISE A CREDENTIAL SURFACE. A dApp request may trigger a
   * CONSENT prompt; it may never trigger a password field (graceful lock §3.3).
   * The only permitted reaction is a PASSIVE badge in permanent chrome; the
   * password field appears only after a human clicks it. Volume is bounded by
   * the host's own rate limiter — there is no coalescing, no cooldown and no cap
   * here by design.
   */
  noteLockedRequest: (origin: string, ctx: LockedRequestContext) => void;

  /** Head of the approval queue (for modal rendering). */
  pendingApproval: PendingApproval | null;
  /** Head of the intent queue (for modal rendering). */
  pendingIntent: PendingIntent | null;
  /** The open network-switch prompt (for modal rendering). At most one is ever open. */
  pendingNetworkSwitch: PendingNetworkSwitch | null;
  /**
   * False for a short settle window after the intent modal's contents change.
   * All intent modals share button geometry, so a swap under a stationary cursor
   * is clickjacking without an iframe (graceful lock §8.4).
   */
  intentInteractive: boolean;
  /**
   * (Re)start that settle window.
   *
   * THE INVARIANT: the window measures from the moment ACTIONABLE intent UI is
   * first PRESENTED to the user — never from queue arrival. Any UI that can
   * authorize or refuse an intent starts the window when it becomes visible.
   *
   * Arrival IS presentation for every modal that renders as soon as its intent
   * reaches the head of the queue, and the provider arms then. UI that is held
   * back first (the `send` intent's duplicate-payment check, which can take
   * seconds) must call this when it finally appears — otherwise a check slower
   * than the window hands the user a live primary button the instant the modal
   * shows up, which is precisely what the shield exists to prevent.
   *
   * Every call restarts the window, so arming once per presentation — never on
   * every render — is the CALLER's responsibility.
   */
  armIntentShield: () => void;

  approveConnection: (grantedPermissions: PermissionScope[]) => void;
  denyConnection: () => void;
  /**
   * Answer a specific network-switch prompt. BY ID, like resolveIntent: a late click on a
   * prompt that was already settled (a lock, a closing host) finds no entry and does nothing,
   * and can never answer a DIFFERENT origin's prompt that has since taken the slot.
   *
   * This is the USER's answer, and the only path that remembers a decline for the rest of the
   * page session (any `accepted: false`, however it was made): the settles a lock, a closing
   * host or the deadline timer perform are internal and record nothing.
   */
  answerNetworkSwitch: (id: number, answer: NetworkSwitchAnswer) => void;
  /**
   * Settle a specific queued intent. The ID IS REQUIRED — settling "the head" was correct only
   * while there was one slot. With a FIFO queue the head advances while a modal's async work is
   * still in flight, so a completed transfer's result would land on a DIFFERENT dApp's intent.
   */
  resolveIntent: (id: number, result: unknown) => void;
  /** `data`, when given, reaches the dApp as the error's `data` (e.g. a journaled mint's `{ tokenId }`). */
  rejectIntent: (id: number, code: number, message: string, data?: unknown) => void;
  /**
   * Whether an intent is still queued, and so still waited for. False once it settled —
   * answered, or dropped because its host stopped waiting — even before the modal showing
   * it re-renders: check it before starting anything that cannot be undone.
   */
  isIntentPending: (id: number) => boolean;

  /** Register a live host with its transport-verified origin. Paired with releaseHost(). */
  attachHost: (host: ConnectHost, origin: string) => void;
  /** Remove a host (tab closed, url switched, popup unloaded) and settle its pending work. */
  releaseHost: (host: ConnectHost) => void;

  /**
   * Register an auto-approve handler for an intent action, scoped to ONE host.
   * Never consulted for an always-ask intent (`mint_nft`): that one reaches the modal every time.
   */
  registerAutoIntent: (host: ConnectHost, action: string, handler: AutoIntentHandler) => void;
}

export const ConnectContext = createContext<ConnectContextValue | null>(null);

export function useConnectContext(): ConnectContextValue {
  const ctx = useContext(ConnectContext);
  if (!ctx) throw new Error('useConnectContext must be used within ConnectProvider');
  return ctx;
}
