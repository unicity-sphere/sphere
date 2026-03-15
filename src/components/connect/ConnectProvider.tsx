import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
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
import { useSphereContext } from '../../sdk/hooks/core/useSphere';

interface ConnectProviderProps {
  children: ReactNode;
}

export function ConnectProvider({ children }: ConnectProviderProps) {
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);
  const connectHostRef = useRef<ConnectHost | null>(null);
  const [, forceUpdate] = useState(0);

  type AutoHandler = (action: string, params: Record<string, unknown>) => Promise<{ result?: unknown; error?: { code: number; message: string } }>;
  // Auto-approve handlers scoped to a specific ConnectHost instance
  const autoIntentHandlersRef = useRef<Map<string, { host: ConnectHost; handler: AutoHandler }>>(new Map());

  const setConnectHost = useCallback((host: ConnectHost | null) => {
    // Clear auto-approve handlers when host changes (URL switch, disconnect, etc.)
    if (host !== connectHostRef.current) {
      autoIntentHandlersRef.current.clear();
    }
    connectHostRef.current = host;
    forceUpdate((n) => n + 1);
  }, []);

  const requestApproval = useCallback(
    (dapp: DAppMetadata, permissions: PermissionScope[]) => {
      return new Promise<{ approved: boolean; grantedPermissions: PermissionScope[] }>((resolve) => {
        setPendingApproval({ dapp, permissions, resolve });
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
          return await entry.handler(action, params);
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

  // Extension mode: poll background for pending Connect approvals/intents.
  // Polling starts immediately (even while locked) so the approval is already
  // in state by the time the user unlocks — the modal appears instantly.
  const { isUnlocked } = useSphereContext();

  useEffect(() => {
    if (import.meta.env.VITE_PLATFORM !== 'extension') return;

    const poll = async () => {
      try {
        // Poll for pending approval
        if (!pendingApproval) {
          const resp = await chrome.runtime.sendMessage({ type: 'POPUP_GET_CONNECT_APPROVAL' });
          if (resp?.success && resp.approval) {
            const { id, dapp, requestedPermissions: permissions } = resp.approval;
            setPendingApproval({
              dapp,
              permissions,
              resolve: (result) => {
                chrome.runtime.sendMessage({
                  type: 'POPUP_RESOLVE_CONNECT_APPROVAL',
                  id,
                  approved: result.approved,
                  grantedPermissions: result.grantedPermissions,
                }).catch(() => {});
              },
            });
          }
        }

        // Poll for pending intent
        if (!pendingIntent) {
          const resp = await chrome.runtime.sendMessage({ type: 'POPUP_GET_CONNECT_INTENT' });
          if (resp?.success && resp.intent) {
            const { id, action, params } = resp.intent;
            setPendingIntent({
              action,
              params,
              resolve: (result) => {
                chrome.runtime.sendMessage({
                  type: 'POPUP_RESOLVE_CONNECT_INTENT',
                  id,
                  result,
                }).catch(() => {});
              },
            });
          }
        }
      } catch {
        // Background not ready or extension context invalidated
      }
    };

    const interval = setInterval(poll, 500);
    poll(); // Initial poll
    return () => clearInterval(interval);
  }, [pendingApproval, pendingIntent]);

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
