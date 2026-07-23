import { createContext, useContext } from 'react';
import type { DAppMetadata, PermissionScope } from '@unicitylabs/sphere-sdk/connect';
import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';

export interface PendingApproval {
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

export interface PendingIntent {
  action: string;
  params: Record<string, unknown>;
  resolve: (result: { result?: unknown; error?: { code: number; message: string } }) => void;
}

export interface ConnectContextValue {
  /**
   * Called by the ConnectHost host (IframeAgent / ConnectPage) when a dApp
   * requests connection. `origin` is the transport-verified origin — pass the
   * value the transport pins (never `dapp.url`).
   */
  requestApproval: (
    dapp: DAppMetadata,
    permissions: PermissionScope[],
    origin: string,
  ) => Promise<{ approved: boolean; grantedPermissions: PermissionScope[] }>;

  /** Called by IframeAgent's ConnectHost when a dApp sends an intent */
  requestIntent: (
    action: string,
    params: Record<string, unknown>,
  ) => Promise<{ result?: unknown; error?: { code: number; message: string } }>;

  /** Current pending approval (for modal rendering) */
  pendingApproval: PendingApproval | null;

  /** Current pending intent (for intent handler rendering) */
  pendingIntent: PendingIntent | null;

  /** Approve the pending connection */
  approveConnection: (grantedPermissions: PermissionScope[]) => void;

  /** Deny the pending connection */
  denyConnection: () => void;

  /** Resolve the pending intent with a result */
  resolveIntent: (result: unknown) => void;

  /** Reject the pending intent with an error */
  rejectIntent: (code: number, message: string) => void;

  /** Reference to the ConnectHost instance for auto-approve management */
  connectHost: ConnectHost | null;

  /** Set the ConnectHost reference */
  setConnectHost: (host: ConnectHost | null) => void;

  /** Register an auto-approve handler for an intent action (bypasses modal) */
  registerAutoIntent: (
    action: string,
    handler: (action: string, params: Record<string, unknown>) => Promise<{ result?: unknown; error?: { code: number; message: string } } | null>,
  ) => void;
}

export const ConnectContext = createContext<ConnectContextValue | null>(null);

export function useConnectContext(): ConnectContextValue {
  const ctx = useContext(ConnectContext);
  if (!ctx) throw new Error('useConnectContext must be used within ConnectProvider');
  return ctx;
}
