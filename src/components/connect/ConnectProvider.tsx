import { useState, useCallback, useRef, type ReactNode } from 'react';
import type { DAppMetadata, PermissionScope } from '@unicitylabs/sphere-sdk/connect';
import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';
import { ERROR_CODES } from '@unicitylabs/sphere-sdk/connect';
import {
  ConnectContext,
  type PendingApproval,
  type PendingIntent,
  type ConnectContextValue,
} from './ConnectContext';
import { ConnectionApprovalModal } from './ConnectionApprovalModal';
import { ConnectIntentHandler } from './ConnectIntentHandler';
import { registerConnectHost, unregisterConnectHost } from '../../sdk/connectHostRegistry';

interface ConnectProviderProps {
  children: ReactNode;
}

export function ConnectProvider({ children }: ConnectProviderProps) {
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);
  const connectHostRef = useRef<ConnectHost | null>(null);
  const [, forceUpdate] = useState(0);

  type AutoHandler = (action: string, params: Record<string, unknown>) => Promise<{ result?: unknown; error?: { code: number; message: string } } | null>;
  // Auto-approve handlers scoped to a specific ConnectHost instance
  const autoIntentHandlersRef = useRef<Map<string, { host: ConnectHost; handler: AutoHandler }>>(new Map());

  const setConnectHost = useCallback((host: ConnectHost | null, origin?: string) => {
    // Clear auto-approve handlers when host changes (URL switch, disconnect, etc.)
    if (host !== connectHostRef.current) {
      autoIntentHandlersRef.current.clear();
    }
    // Mirror into the module-scoped registry so SphereProvider.lock() — an
    // ANCESTOR in the tree that can't consume this context — can still reach
    // EVERY live host to notify it before destroying the Sphere instance (#449).
    // Unregistration is scoped to the host being dropped: DesktopLayout keeps every
    // tab mounted, so a blanket clear here would evict a live neighbour's host.
    if (host) {
      registerConnectHost(host, { origin: origin ?? '' });
    } else if (connectHostRef.current) {
      unregisterConnectHost(connectHostRef.current);
    }
    connectHostRef.current = host;
    forceUpdate((n) => n + 1);
  }, []);

  const requestApproval = useCallback(
    (dapp: DAppMetadata, permissions: PermissionScope[], origin: string) => {
      return new Promise<{ approved: boolean; grantedPermissions: PermissionScope[] }>((resolve) => {
        setPendingApproval({ dapp, permissions, origin, resolve });
      });
    },
    [],
  );

  const registerAutoIntent = useCallback(
    (
      action: string,
      handler: AutoHandler,
    ) => {
      const host = connectHostRef.current;
      if (!host) return;
      autoIntentHandlersRef.current.set(action, { host, handler });
    },
    [],
  );

  const requestIntent = useCallback(
    async (action: string, params: Record<string, unknown>): Promise<{ result?: unknown; error?: { code: number; message: string } }> => {
      // Check auto-approve handlers — only if registered by the current host
      const entry = autoIntentHandlersRef.current.get(action);
      if (entry && entry.host === connectHostRef.current) {
        try {
          const handled = await entry.handler(action, params);
          // A null result means the handler declined (e.g. a DM to a recipient
          // other than the one the user approved) — fall through to the modal.
          if (handled) return handled;
        } catch (err) {
          return { error: { code: ERROR_CODES.INTERNAL_ERROR, message: err instanceof Error ? err.message : 'Auto-approve handler failed' } };
        }
      }

      // Otherwise show modal
      return new Promise<{ result?: unknown; error?: { code: number; message: string } }>((resolve) => {
        setPendingIntent({ action, params, resolve });
      });
    },
    [],
  );

  const approveConnection = useCallback(
    (grantedPermissions: PermissionScope[]) => {
      pendingApproval?.resolve({ approved: true, grantedPermissions });
      setPendingApproval(null);
    },
    [pendingApproval],
  );

  const denyConnection = useCallback(() => {
    pendingApproval?.resolve({ approved: false, grantedPermissions: [] });
    setPendingApproval(null);
  }, [pendingApproval]);

  const resolveIntent = useCallback(
    (result: unknown) => {
      pendingIntent?.resolve({ result });
      setPendingIntent(null);
    },
    [pendingIntent],
  );

  const rejectIntent = useCallback(
    (code: number, message: string) => {
      pendingIntent?.resolve({ error: { code, message } });
      setPendingIntent(null);
    },
    [pendingIntent],
  );

  const value: ConnectContextValue = {
    requestApproval,
    requestIntent,
    pendingApproval,
    pendingIntent,
    approveConnection,
    denyConnection,
    resolveIntent,
    rejectIntent,
    connectHost: connectHostRef.current,
    setConnectHost,
    registerAutoIntent,
  };

  return (
    <ConnectContext.Provider value={value}>
      {children}
      <ConnectionApprovalModal />
      <ConnectIntentHandler />
    </ConnectContext.Provider>
  );
}
