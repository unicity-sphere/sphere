import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Globe, ExternalLink, RotateCw, ShieldAlert } from 'lucide-react';
import { ConnectHost, HOST_READY_TYPE } from '@unicitylabs/sphere-sdk/connect';
import type { DAppMetadata, PermissionScope } from '@unicitylabs/sphere-sdk/connect';
import { PostMessageTransport } from '@unicitylabs/sphere-sdk/connect/browser';
import type { AgentConfig } from '../../config/activities';
import { CONNECT_MIN_SDK_VERSION } from '../../config/connect';
import {
  isWalletOwnOrigin,
  AGENT_IFRAME_SANDBOX,
  AGENT_IFRAME_ALLOW,
} from '../../config/agentOrigins';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { useConnectContext } from '../connect/ConnectContext';
import { describeConnectRejection } from '../connect/rejectionMessage';
import { showToast } from '../ui/toast-utils';
import {
  getApprovedOrigin,
  saveApprovedOrigin,
  updateLastSeen,
  revokeApprovedOrigin,
} from '../../utils/connected-sites';

interface IframeAgentProps {
  agent: AgentConfig;
}

export function IframeAgent({ agent }: IframeAgentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeUrl, setActiveUrl] = useState(() => agent.iframeUrl ?? '');
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hostRef = useRef<ConnectHost | null>(null);
  const transportRef = useRef<PostMessageTransport | null>(null);
  const initializedRef = useRef(false);
  const { sphere } = useSphereContext();
  const { requestApproval, requestIntent, setConnectHost } = useConnectContext();

  const hasUrlOptions = agent.iframeUrls && agent.iframeUrls.length > 1;

  // Trust boundary: a frame on the wallet's OWN origin, with allow-same-origin,
  // could execute as the wallet and reach the parent DOM. Refuse to frame it or
  // attach a Connect host — this URL only ever arrives from an untrusted source
  // (e.g. a deep link in a DM). See config/agentOrigins.ts.
  const framedOrigin = (() => {
    try {
      return new URL(activeUrl).origin;
    } catch {
      return null;
    }
  })();
  const isSelfOrigin = framedOrigin !== null && isWalletOwnOrigin(framedOrigin);

  // Stable refs to avoid effect re-runs
  const sphereRef = useRef(sphere);
  sphereRef.current = sphere;
  const requestApprovalRef = useRef(requestApproval);
  requestApprovalRef.current = requestApproval;
  const requestIntentRef = useRef(requestIntent);
  requestIntentRef.current = requestIntent;

  // Track sphere availability so the effect re-runs when sphere loads
  const sphereReady = !!sphere;

  // When user switches address — notify the connected dApp
  useEffect(() => {
    if (sphere && hostRef.current) {
      hostRef.current.updateSphere(sphere);
    }
  }, [sphere]);

  // Notify dApp on logout
  useEffect(() => {
    const notifyLocked = () => {
      if (hostRef.current) {
        hostRef.current.notifyWalletLocked();
      }
    };
    window.addEventListener('sphere:wallet-logout', notifyLocked);
    return () => window.removeEventListener('sphere:wallet-logout', notifyLocked);
  }, []);

  const cleanup = useCallback(() => {
    hostRef.current?.destroy();
    hostRef.current = null;
    setConnectHost(null);
    transportRef.current?.destroy();
    transportRef.current = null;
    initializedRef.current = false;
  }, [setConnectHost]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !sphereRef.current || !activeUrl) return;
    // Prevent StrictMode double-init
    if (initializedRef.current) return;

    let origin: string;
    try {
      origin = new URL(activeUrl).origin;
    } catch {
      console.warn('[Connect] Invalid iframe URL:', activeUrl);
      return;
    }

    // Never bridge the wallet to its own origin (see isSelfOrigin above).
    if (isWalletOwnOrigin(origin)) {
      console.warn('[Connect] Refusing to attach a Connect host to the wallet own origin:', origin);
      return;
    }

    initializedRef.current = true;

    const transport = PostMessageTransport.forHost(iframe, {
      allowedOrigins: [origin],
    });
    transportRef.current = transport;

    const host = new ConnectHost({
      sphere: sphereRef.current,
      transport,
      // Reject dApps built against sphere-sdk < 0.12 (incompatible Connect/token contract).
      minSdkVersion: CONNECT_MIN_SDK_VERSION,
      onConnectionRequest: async (dapp: DAppMetadata, perms: PermissionScope[], silent?: boolean) => {
        // Check if this iframe origin was already approved
        const saved = getApprovedOrigin(origin);
        if (saved) {
          updateLastSeen(origin);
          return { approved: true, grantedPermissions: saved.permissions };
        }

        // Silent mode: reject immediately
        if (silent) {
          return { approved: false, grantedPermissions: [] };
        }

        // First time — show approval modal via ConnectProvider
        const result = await requestApprovalRef.current(dapp, perms);
        if (result.approved) {
          saveApprovedOrigin(origin, dapp, result.grantedPermissions);
        }
        return result;
      },
      onConnectionRejected: (dapp, error, silent) => {
        // The compatibility gate refused the connection (e.g. an app built against
        // sphere-sdk < 0.12). Surface why — but stay quiet for background auto-connect.
        if (silent) return;
        const data = (error.data as Record<string, unknown> | undefined) ?? undefined;
        showToast(`${dapp?.name ?? 'This app'} ${describeConnectRejection(data)}`, 'warning');
      },
      onDisconnect: () => {
        revokeApprovedOrigin(origin);
      },
      onIntent: (action, params) => requestIntentRef.current(action, params),
    });
    hostRef.current = host;
    setConnectHost(host);

    // Signal to iframe that host is ready (iframe may already be loaded or still loading)
    try {
      iframe.contentWindow?.postMessage({ type: HOST_READY_TYPE }, origin);
    } catch { /* cross-origin or iframe not ready yet — handled by onLoad below */ }

    return () => {
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUrl, sphereReady, reloadKey]);

  const handleUrlSwitch = (url: string) => {
    if (url === activeUrl) return;
    cleanup();
    setIsLoading(true);
    setActiveUrl(url);
  };

  let displayHost = '';
  try {
    displayHost = new URL(activeUrl).host;
  } catch {
    displayHost = activeUrl;
  }

  if (isSelfOrigin) {
    return (
      <div
        data-testid="agent-self-origin-blocked"
        className="h-full min-h-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <ShieldAlert className="w-10 h-10 text-orange-500" />
        <div className="font-semibold text-neutral-900 dark:text-white">
          This page can't be opened as an agent
        </div>
        <p className="max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
          It points at Sphere's own address, so opening it here would give an untrusted page
          access to your wallet. Open it in a normal browser tab instead.
        </p>
        <a
          href={activeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-500/10 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open in new tab
        </a>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {hasUrlOptions && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800/50 bg-neutral-50/80 dark:bg-neutral-800/40 shrink-0">
          {agent.iframeUrls!.map((option) => (
            <button
              key={option.url}
              onClick={() => handleUrlSwitch(option.url)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150 ${
                activeUrl === option.url
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/40'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Address bar — always visible so user can open in new tab if iframe is blocked */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-neutral-200 dark:border-neutral-800/50 bg-neutral-50/50 dark:bg-neutral-800/30 shrink-0">
        <Globe className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate flex-1">
          {displayHost}
        </span>
        <button
          onClick={() => {
            const iframe = iframeRef.current;
            if (iframe) {
              cleanup();
              setIsLoading(true);
              iframe.src = activeUrl;
              setReloadKey((k) => k + 1);
            }
          }}
          className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-500 dark:hover:text-orange-400 rounded-md hover:bg-neutral-200/60 dark:hover:bg-neutral-700/40 transition-colors shrink-0"
          title="Reload page"
        >
          <RotateCw className="w-3 h-3" />
          <span className="hidden sm:inline">Reload</span>
        </button>
        <a
          href={activeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-500 dark:hover:text-orange-400 rounded-md hover:bg-neutral-200/60 dark:hover:bg-neutral-700/40 transition-colors shrink-0"
          title="Open in new tab"
        >
          <ExternalLink className="w-3 h-3" />
          <span className="hidden sm:inline">Open</span>
        </a>
      </div>

      <div className="relative flex-1 min-h-0">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-[#060606]/50">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                Loading {agent.name}...
              </span>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={activeUrl}
          title={agent.name}
          className="w-full h-full border-0"
          onLoad={() => {
            setIsLoading(false);
            if (hostRef.current && iframeRef.current?.contentWindow) {
              const sendReady = () => {
                try {
                  const o = new URL(activeUrl).origin;
                  iframeRef.current?.contentWindow?.postMessage({ type: HOST_READY_TYPE }, o);
                } catch { /* ignore */ }
              };
              // Send immediately for cases where iframe React effects are already running
              sendReady();
              // Send again after 300ms to guarantee delivery after iframe React effects mount
              setTimeout(sendReady, 300);
            }
          }}
          allow={AGENT_IFRAME_ALLOW}
          sandbox={AGENT_IFRAME_SANDBOX}
        />
      </div>
    </div>
  );
}
