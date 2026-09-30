import { useState, useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import type {
  ConnectHost,
  DAppMetadata,
  LockedRequestContext,
  PermissionScope,
} from '@unicitylabs/sphere-sdk/connect';
import { ERROR_CODES, INTENT_ACTIONS } from '@unicitylabs/sphere-sdk/connect';
import {
  ConnectContext,
  type AutoIntentHandler,
  type IntentAnswer,
  type NetworkSwitchAnswer,
  type PendingApproval,
  type PendingIntent,
  type PendingNetworkSwitch,
  type ConnectContextValue,
} from './ConnectContext';
import { ConnectionApprovalModal } from './ConnectionApprovalModal';
import { ConnectIntentHandler } from './ConnectIntentHandler';
import { NetworkSwitchPromptModal } from './NetworkSwitchPromptModal';
import { registerConnectHost, unregisterConnectHost } from '../../sdk/connectHostRegistry';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { LockedRequestBadge, type LockedRequestCounts } from './LockedRequestBadge';
import { INTENT_SETTLE_MS } from './settleWindow';

/**
 * Recommended refusal text for WALLET_LOCKED, matching what the host sends. It
 * is NOT a wire contract (spec §2.2.11) — every consumer discriminates on the
 * 4009 code. Nothing may depend on this string being byte-identical anywhere.
 */
const WALLET_LOCKED_MESSAGE = 'Wallet is locked';

/**
 * Intents that always reach the confirmation modal, whatever auto-approve
 * handler a host holds — this provider's twin of the SDK host's own rule, which
 * cannot see the map below. Minting an NFT signs dApp-chosen content as the
 * user, so no earlier grant may stand in for the prompt.
 */
const ALWAYS_ASK_INTENTS: ReadonlySet<string> = new Set<string>([INTENT_ACTIONS.MINT_NFT]);

/**
 * The answer for every network-switch request that ends WITHOUT the user having
 * decided anything: refused at the door, settled by a lock, or orphaned by a host
 * that went away. `suppressFuturePrompts` is false on purpose — a refusal nobody
 * saw must never be recorded as a decision they made. A fresh object per call, so
 * one consumer can never see another's mutation.
 */
const unseenRefusal = (): NetworkSwitchAnswer => ({ accepted: false, suppressFuturePrompts: false });

interface ConnectProviderProps {
  children: ReactNode;
}

export function ConnectProvider({ children }: ConnectProviderProps) {
  // Queues live in refs and are MIRRORED into state for rendering. Settling an
  // entry calls its `resolve` — a side effect that must never run inside a
  // setState updater, which React StrictMode double-invokes.
  const approvalQueueRef = useRef<PendingApproval[]>([]);
  const intentQueueRef = useRef<PendingIntent[]>([]);
  // The third surface. Admission (requestNetworkSwitch) keeps it at zero or one
  // entry, but it is a queue of the same shape so it settles through the same paths.
  const networkSwitchQueueRef = useRef<PendingNetworkSwitch[]>([]);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);
  const [pendingNetworkSwitch, setPendingNetworkSwitch] = useState<PendingNetworkSwitch | null>(null);
  const nextIdRef = useRef(0);

  // Auto-approve handlers, scoped to the host that granted them. Keyed by host
  // FIRST: keying by action alone let a grant made in one tab answer another
  // host's intent.
  const autoIntentHandlersRef = useRef<Map<ConnectHost, Map<string, AutoIntentHandler>>>(new Map());

  const syncHeads = useCallback(() => {
    setPendingApproval(approvalQueueRef.current[0] ?? null);
    setPendingIntent(intentQueueRef.current[0] ?? null);
    setPendingNetworkSwitch(networkSwitchQueueRef.current[0] ?? null);
  }, []);

  const attachHost = useCallback((host: ConnectHost, origin: string) => {
    registerConnectHost(host, { origin });
  }, []);

  const settleIntent = useCallback(
    (id: number, result: IntentAnswer) => {
      const index = intentQueueRef.current.findIndex((entry) => entry.id === id);
      if (index === -1) return; // already settled — never resolve the same intent twice
      const [entry] = intentQueueRef.current.splice(index, 1);
      entry!.resolve(result);
      syncHeads();
    },
    [syncHeads],
  );

  const settleApproval = useCallback(
    (id: number, result: { approved: boolean; grantedPermissions: PermissionScope[] }) => {
      const index = approvalQueueRef.current.findIndex((entry) => entry.id === id);
      if (index === -1) return;
      const [entry] = approvalQueueRef.current.splice(index, 1);
      entry!.resolve(result);
      syncHeads();
    },
    [syncHeads],
  );

  const settleNetworkSwitch = useCallback(
    (id: number, answer: NetworkSwitchAnswer) => {
      const index = networkSwitchQueueRef.current.findIndex((entry) => entry.id === id);
      if (index === -1) return; // already settled — never resolve the same prompt twice
      const [entry] = networkSwitchQueueRef.current.splice(index, 1);
      entry!.resolve(answer);
      syncHeads();
    },
    [syncHeads],
  );

  /** Settle every queued intent matching `match` (all of them when it returns true). */
  const settleIntentsWhere = useCallback(
    (match: (entry: PendingIntent) => boolean, error: { code: number; message: string }) => {
      const doomed = intentQueueRef.current.filter(match);
      if (doomed.length === 0) return;
      intentQueueRef.current = intentQueueRef.current.filter((entry) => !match(entry));
      for (const entry of doomed) entry.resolve({ error });
      syncHeads();
    },
    [syncHeads],
  );

  /**
   * Settle every network-switch prompt matching `match` as UNSEEN: no decision was
   * made, so none is recorded. Shared by the lock effect and releaseHost.
   */
  const settleNetworkSwitchesWhere = useCallback(
    (match: (entry: PendingNetworkSwitch) => boolean) => {
      const doomed = networkSwitchQueueRef.current.filter(match);
      if (doomed.length === 0) return;
      networkSwitchQueueRef.current = networkSwitchQueueRef.current.filter((entry) => !match(entry));
      for (const entry of doomed) entry.resolve(unseenRefusal());
      syncHeads();
    },
    [syncHeads],
  );

  const { isLocked } = useSphereContext();

  // requestNetworkSwitch reads the lock through a ref so it can stay a stable
  // callback while never acting on a stale value: a host may hold on to it, and a
  // stale `false` would open a consent prompt over a wallet that is locked. A layout
  // effect (not a render-time write) so an abandoned concurrent render cannot set it.
  const isLockedRef = useRef(isLocked);
  useLayoutEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  // A lock landed. Settle everything Connect is holding with the SAME code the
  // host answers new requests with, and unmount the intent modal: its approve
  // button would operate on a Sphere the provider has already destroyed, and its
  // `resolve` would sit unsettled behind the lock screen until the host's own
  // deadline fired. A pending connection approval is denied — a locked wallet
  // cannot consent to anything (graceful lock §8.4). Likewise a pending network-switch
  // prompt: it settles as refused-and-unseen, so nothing is muted on the user's behalf.
  useEffect(() => {
    if (!isLocked) return;
    settleIntentsWhere(() => true, {
      code: ERROR_CODES.WALLET_LOCKED,
      message: WALLET_LOCKED_MESSAGE,
    });
    const doomed = approvalQueueRef.current;
    if (doomed.length > 0) {
      approvalQueueRef.current = [];
      for (const entry of doomed) entry.resolve({ approved: false, grantedPermissions: [] });
      syncHeads();
    }
    settleNetworkSwitchesWhere(() => true);
  }, [isLocked, settleIntentsWhere, settleNetworkSwitchesWhere, syncHeads]);

  // Locked-request tally, per verified origin, in first-seen order. There is no
  // cap, no coalescing and no cooldown BY DESIGN: the host's own checkRateLimit()
  // already bounds how often onLockedRequest can fire, and a passive badge has
  // nothing to abuse (graceful lock §8.3).
  const [lockedRequests, setLockedRequests] = useState<{ total: number; origins: string[] }>(
    { total: 0, origins: [] },
  );

  const noteLockedRequest = useCallback((origin: string, ctx: LockedRequestContext) => {
    // A refused HANDSHAKE is not counted. While locked every handshake is forced
    // silent, and an origin WITHOUT an approval gets today's empty refusal — so
    // counting it would light a badge naming an origin that holds no approval,
    // leaking the lock to it and putting an unvetted name in the wallet's chrome.
    if (ctx.kind === 'handshake') return;
    const label = origin || '';
    setLockedRequests((prev) => ({
      total: prev.total + 1,
      origins: label && !prev.origins.includes(label) ? [...prev.origins, label] : prev.origins,
    }));
  }, []);

  // The wallet came back — the tally is history. Returning `prev` unchanged when
  // it is already empty is load-bearing: a fresh object every render would loop.
  useEffect(() => {
    if (isLocked) return;
    setLockedRequests((prev) => (prev.total === 0 ? prev : { total: 0, origins: [] }));
  }, [isLocked]);

  const lockedRequestCounts: LockedRequestCounts = lockedRequests;

  const [intentInteractive, setIntentInteractive] = useState(false);

  // THE INVARIANT: the settle window measures from the moment ACTIONABLE intent
  // UI is first PRESENTED to the user — never from queue arrival. For every
  // modal that renders as soon as its intent reaches the head those are the same
  // instant, and arrival arms the window below. UI that is held back first — the
  // `send` intent's duplicate-payment check, up to DUPLICATE_CHECK_TIMEOUT_MS —
  // re-arms via armIntentShield() when it actually appears; otherwise a check
  // slower than INTENT_SETTLE_MS handed the user a live Send button the instant
  // the modal rendered, with the whole window already spent behind a blank
  // screen.
  const [shieldArm, setShieldArm] = useState(0);
  const armIntentShield = useCallback(() => setShieldArm((n) => n + 1), []);

  useEffect(() => {
    if (!pendingIntent) {
      setIntentInteractive(false);
      return;
    }
    setIntentInteractive(false);
    const timer = setTimeout(() => setIntentInteractive(true), INTENT_SETTLE_MS);
    return () => clearTimeout(timer);
    // Keyed on the intent IDENTITY, not the object: the queue head object is
    // re-read on every sync, and depending on the object would restart the
    // window forever. `shieldArm` is the explicit re-arm — it only ever changes
    // when a caller says new actionable UI just appeared.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIntent?.id, shieldArm]);

  const releaseHost = useCallback(
    (host: ConnectHost) => {
      unregisterConnectHost(host);
      autoIntentHandlersRef.current.delete(host);
      // Anything this host is still awaiting must be settled: `await onIntent()`
      // inside a host that is going away would otherwise never return, and the
      // dApp would sit on a dead promise until the host's own deadline fires.
      settleIntentsWhere((entry) => entry.host === host, {
        code: ERROR_CODES.INTENT_CANCELLED,
        message: 'Wallet view closed',
      });
      const doomedApprovals = approvalQueueRef.current.filter((entry) => entry.host === host);
      if (doomedApprovals.length > 0) {
        approvalQueueRef.current = approvalQueueRef.current.filter((entry) => entry.host !== host);
        for (const entry of doomedApprovals) {
          entry.resolve({ approved: false, grantedPermissions: [] });
        }
        syncHeads();
      }
      // A prompt this host was awaiting: `await` inside a host that is going away
      // would otherwise never return. Unseen, so nothing is muted.
      settleNetworkSwitchesWhere((entry) => entry.host === host);
    },
    [settleIntentsWhere, settleNetworkSwitchesWhere, syncHeads],
  );

  const requestApproval = useCallback(
    (host: ConnectHost, dapp: DAppMetadata, permissions: PermissionScope[], origin: string) =>
      new Promise<{ approved: boolean; grantedPermissions: PermissionScope[] }>((resolve) => {
        const id = ++nextIdRef.current;
        approvalQueueRef.current.push({ id, host, dapp, permissions, origin, resolve });
        syncHeads();
      }),
    [syncHeads],
  );

  const requestNetworkSwitch = useCallback(
    (host: ConnectHost, origin: string, offer: PendingNetworkSwitch['offer']) =>
      new Promise<NetworkSwitchAnswer>((resolve) => {
        // Admission lives here, not in the two hosts, so neither can forget a rule.
        // A refusal resolves on the spot and never queues: the user never sees it,
        // so it is answered as unseen. The queues are read from the refs, not from
        // state — a settle lands there synchronously, before any re-render.
        if (
          isLockedRef.current ||
          approvalQueueRef.current.length > 0 ||
          intentQueueRef.current.length > 0 ||
          networkSwitchQueueRef.current.length > 0
        ) {
          resolve(unseenRefusal());
          return;
        }
        const id = ++nextIdRef.current;
        networkSwitchQueueRef.current.push({ id, host, origin, offer, resolve });
        syncHeads();
      }),
    [syncHeads],
  );

  const registerAutoIntent = useCallback(
    (host: ConnectHost, action: string, handler: AutoIntentHandler) => {
      const perHost = autoIntentHandlersRef.current.get(host) ?? new Map<string, AutoIntentHandler>();
      perHost.set(action, handler);
      autoIntentHandlersRef.current.set(host, perHost);
    },
    [],
  );

  const requestIntent = useCallback(
    async (
      host: ConnectHost,
      origin: string,
      action: string,
      params: Record<string, unknown>,
      signal?: AbortSignal,
    ): Promise<IntentAnswer> => {
      // Auto-approve handlers — only the ones THIS host granted, and never for an
      // intent that must be asked every time.
      const handler = ALWAYS_ASK_INTENTS.has(action)
        ? undefined
        : autoIntentHandlersRef.current.get(host)?.get(action);
      if (handler) {
        try {
          const handled = await handler(action, params);
          // A null result means the handler declined (e.g. a DM to a recipient
          // other than the one the user approved) — fall through to the modal.
          if (handled) return handled;
        } catch (err) {
          return {
            error: {
              code: ERROR_CODES.INTERNAL_ERROR,
              message: err instanceof Error ? err.message : 'Auto-approve handler failed',
            },
          };
        }
      }

      // Otherwise queue for the modal. FIFO, never a single overwritten slot: a
      // second requestIntent used to replace the state and lose the previous
      // `resolve` forever, leaving `await onIntent(...)` unsettled.
      //
      // Unless the host has stopped waiting: past its deadline, or once a lock or a revoked
      // session settled the intent, the host has answered the dApp itself. A modal left
      // open would act on an intent nothing waits for — a late Mint mints what the dApp
      // may send again. So an aborted intent never queues, and one that aborts while
      // queued leaves the queue, taking its modal with it. The host ignores this answer.
      const stopped: IntentAnswer = {
        error: { code: ERROR_CODES.INTENT_OUTCOME_UNKNOWN, message: 'The Connect host stopped waiting for this intent' },
      };
      if (signal?.aborted) return stopped;
      return new Promise((resolve) => {
        const id = ++nextIdRef.current;
        intentQueueRef.current.push({ id, host, origin, action, params, resolve, ...(signal ? { signal } : {}) });
        signal?.addEventListener('abort', () => settleIntent(id, stopped), { once: true });
        syncHeads();
      });
    },
    [settleIntent, syncHeads],
  );

  const approveConnection = useCallback(
    (grantedPermissions: PermissionScope[]) => {
      const head = approvalQueueRef.current[0];
      if (head) settleApproval(head.id, { approved: true, grantedPermissions });
    },
    [settleApproval],
  );

  const denyConnection = useCallback(() => {
    const head = approvalQueueRef.current[0];
    if (head) settleApproval(head.id, { approved: false, grantedPermissions: [] });
  }, [settleApproval]);

  // BY ID, never by queue position. settleIntent() already no-ops on an id that is gone, so a
  // late callback from a modal whose intent was settled some other way is harmless.
  const resolveIntent = useCallback(
    (id: number, result: unknown) => settleIntent(id, { result }),
    [settleIntent],
  );

  const rejectIntent = useCallback(
    (id: number, code: number, message: string, data?: unknown) =>
      settleIntent(id, { error: data === undefined ? { code, message } : { code, message, data } }),
    [settleIntent],
  );

  // Read from the queue itself, not from state: a settle lands here synchronously, before
  // any re-render, so a click on a modal that is about to close already sees it.
  const isIntentPending = useCallback(
    (id: number) => intentQueueRef.current.some((entry) => entry.id === id),
    [],
  );

  const value: ConnectContextValue = {
    requestApproval,
    requestIntent,
    requestNetworkSwitch,
    noteLockedRequest,
    pendingApproval,
    pendingIntent,
    pendingNetworkSwitch,
    intentInteractive,
    armIntentShield,
    approveConnection,
    denyConnection,
    answerNetworkSwitch: settleNetworkSwitch,
    resolveIntent,
    rejectIntent,
    isIntentPending,
    attachHost,
    releaseHost,
    registerAutoIntent,
  };

  return (
    <ConnectContext.Provider value={value}>
      {children}
      <ConnectionApprovalModal />
      <ConnectIntentHandler />
      <NetworkSwitchPromptModal />
      {pendingIntent && !intentInteractive && (
        <div
          data-testid="intent-settle-shield"
          aria-hidden="true"
          className="fixed inset-0 z-101 cursor-progress"
        />
      )}
      <LockedRequestBadge counts={lockedRequestCounts} />
    </ConnectContext.Provider>
  );
}
