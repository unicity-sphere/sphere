import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type {
  ConnectHost,
  DAppMetadata,
  LockedRequestContext,
  PermissionScope,
} from '@unicitylabs/sphere-sdk/connect';
import { ERROR_CODES } from '@unicitylabs/sphere-sdk/connect';
import {
  ConnectContext,
  type AutoIntentHandler,
  type PendingApproval,
  type PendingIntent,
  type ConnectContextValue,
} from './ConnectContext';
import { ConnectionApprovalModal } from './ConnectionApprovalModal';
import { ConnectIntentHandler } from './ConnectIntentHandler';
import { registerConnectHost, unregisterConnectHost } from '../../sdk/connectHostRegistry';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';

/**
 * Recommended refusal text for WALLET_LOCKED, matching what the host sends. It
 * is NOT a wire contract (spec §2.2.11) — every consumer discriminates on the
 * 4009 code. Nothing may depend on this string being byte-identical anywhere.
 */
const WALLET_LOCKED_MESSAGE = 'Wallet is locked';

/**
 * Clicks are swallowed for this long after the intent modal's contents change.
 * Every intent modal shares button geometry, so a swap under a stationary cursor
 * is clickjacking without an iframe — and a FIFO queue makes the moment
 * predictable (graceful lock §8.4).
 */
const INTENT_SETTLE_MS = 500;

interface ConnectProviderProps {
  children: ReactNode;
}

export function ConnectProvider({ children }: ConnectProviderProps) {
  // Queues live in refs and are MIRRORED into state for rendering. Settling an
  // entry calls its `resolve` — a side effect that must never run inside a
  // setState updater, which React StrictMode double-invokes.
  const approvalQueueRef = useRef<PendingApproval[]>([]);
  const intentQueueRef = useRef<PendingIntent[]>([]);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);
  const nextIdRef = useRef(0);

  // Auto-approve handlers, scoped to the host that granted them. Keyed by host
  // FIRST: keying by action alone let a grant made in one tab answer another
  // host's intent.
  const autoIntentHandlersRef = useRef<Map<ConnectHost, Map<string, AutoIntentHandler>>>(new Map());

  const syncHeads = useCallback(() => {
    setPendingApproval(approvalQueueRef.current[0] ?? null);
    setPendingIntent(intentQueueRef.current[0] ?? null);
  }, []);

  const attachHost = useCallback((host: ConnectHost, origin: string) => {
    registerConnectHost(host, { origin });
  }, []);

  const settleIntent = useCallback(
    (id: number, result: { result?: unknown; error?: { code: number; message: string } }) => {
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

  const { isLocked } = useSphereContext();

  // A lock landed. Settle everything Connect is holding with the SAME code the
  // host answers new requests with, and unmount the intent modal: its approve
  // button would operate on a Sphere the provider has already destroyed, and its
  // `resolve` would sit unsettled behind the lock screen until the host's own
  // deadline fired. A pending connection approval is denied — a locked wallet
  // cannot consent to anything (graceful lock §8.4).
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
  }, [isLocked, settleIntentsWhere, syncHeads]);

  const [intentInteractive, setIntentInteractive] = useState(false);

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
    // window forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIntent?.id]);

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
    },
    [settleIntentsWhere, syncHeads],
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
    ): Promise<{ result?: unknown; error?: { code: number; message: string } }> => {
      // Auto-approve handlers — only the ones THIS host granted.
      const handler = autoIntentHandlersRef.current.get(host)?.get(action);
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
      return new Promise((resolve) => {
        const id = ++nextIdRef.current;
        intentQueueRef.current.push({ id, host, origin, action, params, resolve });
        syncHeads();
      });
    },
    [syncHeads],
  );

  const noteLockedRequest = useCallback((origin: string, ctx: LockedRequestContext) => {
    // The passive attention surface lands in Task 13 (graceful lock §8.3). It
    // must never raise a credential surface — see ConnectContext. Both arguments
    // are voided rather than underscored so the real signature is already in
    // place and `@typescript-eslint/no-unused-vars` (args: 'after-used') stays
    // quiet on the trailing one.
    void origin;
    void ctx;
  }, []);

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

  const resolveIntent = useCallback(
    (result: unknown) => {
      const head = intentQueueRef.current[0];
      if (head) settleIntent(head.id, { result });
    },
    [settleIntent],
  );

  const rejectIntent = useCallback(
    (code: number, message: string) => {
      const head = intentQueueRef.current[0];
      if (head) settleIntent(head.id, { error: { code, message } });
    },
    [settleIntent],
  );

  const value: ConnectContextValue = {
    requestApproval,
    requestIntent,
    noteLockedRequest,
    pendingApproval,
    pendingIntent,
    intentInteractive,
    approveConnection,
    denyConnection,
    resolveIntent,
    rejectIntent,
    attachHost,
    releaseHost,
    registerAutoIntent,
  };

  return (
    <ConnectContext.Provider value={value}>
      {children}
      <ConnectionApprovalModal />
      <ConnectIntentHandler />
      {pendingIntent && !intentInteractive && (
        <div
          data-testid="intent-settle-shield"
          aria-hidden="true"
          className="fixed inset-0 z-101 cursor-progress"
        />
      )}
    </ConnectContext.Provider>
  );
}
