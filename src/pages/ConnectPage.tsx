import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConnectHost, HOST_READY_TYPE } from '@unicitylabs/sphere-sdk/connect';
import type { DAppMetadata, PermissionScope } from '@unicitylabs/sphere-sdk/connect';
import { PostMessageTransport } from '@unicitylabs/sphere-sdk/connect/browser';
import { CONNECT_MIN_SDK_VERSION } from '../config/connect';
import { useSphereContext } from '../sdk/hooks/core/useSphere';
import { useConnectContext } from '../components/connect/ConnectContext';
import { describeConnectRejection } from '../components/connect/rejectionMessage';
import { WalletPanel } from '../components/wallet/WalletPanel';
import {
  getApprovedOrigin,
  saveApprovedOrigin,
  updateLastSeen,
  revokeApprovedOrigin,
} from '../utils/connected-sites';

type RejectionInfo = { dappName: string; code: number; message: string; data: Record<string, unknown> | undefined };

export function ConnectPage() {
  const [searchParams] = useSearchParams();
  const origin = searchParams.get('origin');
  const { sphere, isLoading, isLocked, walletExists } = useSphereContext();
  const { requestApproval, requestIntent, noteLockedRequest, attachHost, releaseHost } = useConnectContext();
  const hostRef = useRef<ConnectHost | null>(null);
  const transportRef = useRef<PostMessageTransport | null>(null);
  const [status, setStatus] = useState<'waiting' | 'ready' | 'error'>('waiting');
  const [errorMsg, setErrorMsg] = useState('');
  const [connectedDapp, setConnectedDapp] = useState<string | null>(null);
  const [rejection, setRejection] = useState<RejectionInfo | null>(null);

  // Stable refs so the effect doesn't re-run when these change
  const sphereRef = useRef(sphere);
  sphereRef.current = sphere;
  const requestApprovalRef = useRef(requestApproval);
  requestApprovalRef.current = requestApproval;
  const requestIntentRef = useRef(requestIntent);
  requestIntentRef.current = requestIntent;
  const noteLockedRequestRef = useRef(noteLockedRequest);
  noteLockedRequestRef.current = noteLockedRequest;

  // A host is built even for a LOCKED wallet: with `sphere: null,
  // initialWalletState: 'locked'` the dApp gets HOST_READY and a typed
  // WALLET_LOCKED (4009) instead of a handshake that silently times out
  // (graceful lock §8.2).
  const canHost = !isLoading && (!!sphere || (walletExists && isLocked));

  // Prevent StrictMode double-mount from destroying the host.
  // In dev, React runs: mount → cleanup → mount. The cleanup would destroy host1,
  // then mount creates host2 — but the dApp already connected to host1.
  // Since this is a popup page, browser GC handles cleanup when the window closes.
  const initializedRef = useRef(false);

  // Address switch, lock, and non-lock loss of Sphere. A LOCK preserves the
  // session: the host answers WALLET_LOCKED (4009) until updateSphere() re-arms
  // it. A generic init failure (sphere === null while isLocked === false) is a
  // DEAD END — unlocking cannot cure it — so it is setUnavailable(), which
  // revokes the session and pushes wallet:disconnected instead of promising an
  // unlock that will never help (graceful lock §8.2).
  useEffect(() => {
    if (sphere && hostRef.current) {
      hostRef.current.updateSphere(sphere);
    } else if (!sphere && !isLoading && hostRef.current) {
      if (isLocked) hostRef.current.setLocked();
      else hostRef.current.setUnavailable();
    }
  }, [sphere, isLoading, isLocked]);

  // Logout (SPA navigation) or page unload (refresh/close) — both DESTROY the
  // session; neither is a lock. revokeSession() pushes wallet:disconnected, so
  // the dApp stops believing it is connected instead of finding out at its next
  // 4001. The host is ALSO released: ConnectPage never removed itself, and with
  // a registry collection every unloaded popup would leak a dead host that
  // SphereProvider.lock() then calls setLocked() on (graceful lock §8.4).
  useEffect(() => {
    const teardown = () => {
      const host = hostRef.current;
      if (!host) return;
      host.revokeSession();
      releaseHost(host);
    };
    // SPA logout — dispatched by SphereProvider.deleteWallet before destroy
    window.addEventListener('sphere:wallet-logout', teardown);
    // Page refresh or close
    window.addEventListener('beforeunload', teardown);
    return () => {
      window.removeEventListener('sphere:wallet-logout', teardown);
      window.removeEventListener('beforeunload', teardown);
    };
  }, [releaseHost]);

  useEffect(() => {
    if (!canHost) return;
    // Already initialized (incl. StrictMode second mount) — skip
    if (initializedRef.current) return;

    if (!origin) {
      setStatus('error');
      setErrorMsg('Missing origin parameter');
      return;
    }
    if (!window.opener) {
      setStatus('error');
      setErrorMsg('This page must be opened as a popup from a dApp');
      return;
    }

    initializedRef.current = true;
    const currentSphere = sphereRef.current;

    const transport = PostMessageTransport.forHost(window.opener as Window, {
      allowedOrigins: [origin],
    });
    transportRef.current = transport;

    const host = new ConnectHost({
      sphere: currentSphere,
      initialWalletState: currentSphere ? 'live' : 'locked',
      // The transport-verified origin — never the dApp-claimed dapp.url.
      origin,
      transport,
      // Reject dApps built against sphere-sdk < 0.12 (incompatible Connect/token contract).
      minSdkVersion: CONNECT_MIN_SDK_VERSION,
      onConnectionRequest: async (dapp: DAppMetadata, perms: PermissionScope[], silent?: boolean) => {
        // Check if this origin was already approved
        const saved = getApprovedOrigin(origin);
        if (saved) {
          updateLastSeen(origin);
          setConnectedDapp(saved.dapp.name);
          return { approved: true, grantedPermissions: saved.permissions };
        }

        // Silent mode: reject immediately without showing UI
        if (silent) {
          return { approved: false, grantedPermissions: [] };
        }

        // First time — show approval modal (anchor trust to the verified origin).
        const result = await requestApprovalRef.current(hostRef.current!, dapp, perms, origin);
        if (result.approved) {
          setConnectedDapp(dapp.name);
          saveApprovedOrigin(origin, dapp, result.grantedPermissions);
        }
        return result;
      },
      onConnectionRejected: (dapp, error, silent) => {
        // The compatibility gate refused the connection (protocol/network mismatch).
        // Surface the reason to the user — but stay quiet for background (silent) auto-connect attempts.
        if (silent) return;
        setRejection({
          dappName: dapp?.name ?? 'An app',
          code: error.code,
          message: error.message,
          data: (error.data as Record<string, unknown> | undefined) ?? undefined,
        });
      },
      onDisconnect: () => {
        revokeApprovedOrigin(origin);
        setConnectedDapp(null);
      },
      // NOTIFY-ONLY: the host has ALREADY answered WALLET_LOCKED (4009) and never
      // waits for us. It must NEVER raise a credential surface — it only feeds the
      // passive badge, and the password field appears solely after a human clicks
      // it (graceful lock §8.3).
      onLockedRequest: (ctx) => noteLockedRequestRef.current(origin, ctx),
      onIntent: (action, params) =>
        requestIntentRef.current(hostRef.current!, origin, action, params),
    });
    hostRef.current = host;
    attachHost(host, origin);

    setStatus('ready');

    // Signal to dApp that host is ready
    try {
      (window.opener as Window).postMessage(
        { type: HOST_READY_TYPE },
        origin,
      );
    } catch {
      try {
        (window.opener as Window).postMessage(
          { type: HOST_READY_TYPE },
          '*',
        );
      } catch { /* ignore */ }
    }

    // No cleanup — popup page is GC'd when window closes.
    // Returning a cleanup would break StrictMode (destroy host on first unmount).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canHost, origin]);

  return (
    <div className="h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-neutral-950 dark:to-neutral-900 flex flex-col">
      {/* Connection status bar */}
      {status === 'ready' && (
        <div className="shrink-0 mx-3 mt-3 bg-white dark:bg-neutral-800 rounded-2xl border border-gray-200 dark:border-neutral-700 p-3 shadow-sm">
          <div className="flex items-center gap-2">
            {/* A lock no longer disconnects the dApp — but a pulsing green
                "Connected" while every request is answered 4009 is a lie. */}
            <div
              data-testid="connect-status-dot"
              className={`w-2 h-2 rounded-full ${isLocked ? 'bg-amber-500' : 'bg-green-500 animate-pulse'}`}
            />
            <span
              data-testid="connect-status-text"
              className="text-sm font-medium text-gray-700 dark:text-neutral-300"
            >
              {isLocked
                ? connectedDapp
                  ? `Wallet locked — ${connectedDapp} stays connected`
                  : 'Wallet locked'
                : connectedDapp
                  ? `Connected to ${connectedDapp}`
                  : 'Ready for connections'}
            </span>
          </div>
          {origin && (
            <div className="text-xs text-gray-400 dark:text-neutral-500 mt-1">
              Origin: <span className="font-mono">{origin}</span>
            </div>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="shrink-0 mx-3 mt-3 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 p-4 text-center text-red-600 dark:text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Wallet panel — fills remaining space */}
      <div className="flex-1 min-h-0 p-3">
        <WalletPanel autoFocusUnlock />
      </div>

      {rejection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <span className="text-amber-600 dark:text-amber-400 text-xl">⚠</span>
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100">Unable to connect</h2>
            </div>
            <p className="text-sm text-gray-700 dark:text-neutral-300">
              <span className="font-medium">{rejection.dappName}</span> {describeConnectRejection(rejection.data)}
            </p>
            <p className="mt-2 text-xs text-gray-400 dark:text-neutral-500">Error code {rejection.code}</p>
            <button
              onClick={() => setRejection(null)}
              className="mt-4 w-full rounded-xl bg-gray-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium py-2.5 hover:opacity-90 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
