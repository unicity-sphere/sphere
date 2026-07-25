import { createContext, useContext } from 'react';
import type {
  ConnectHost,
  DAppMetadata,
  LockedRequestContext,
  PermissionScope,
} from '@unicitylabs/sphere-sdk/connect';

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

export interface PendingIntent {
  id: number;
  host: ConnectHost;
  /** Transport-verified origin of the dApp that sent the intent. Never dapp.url. */
  origin: string;
  action: string;
  params: Record<string, unknown>;
  resolve: (result: { result?: unknown; error?: { code: number; message: string } }) => void;
}

export type AutoIntentHandler = (
  action: string,
  params: Record<string, unknown>,
) => Promise<{ result?: unknown; error?: { code: number; message: string } } | null>;

export interface ConnectContextValue {
  /** Called by a ConnectHost (IframeAgent / ConnectPage) when a dApp requests connection. */
  requestApproval: (
    host: ConnectHost,
    dapp: DAppMetadata,
    permissions: PermissionScope[],
    origin: string,
  ) => Promise<{ approved: boolean; grantedPermissions: PermissionScope[] }>;

  /** Called by a ConnectHost when a dApp sends an intent. Queued FIFO per wallet. */
  requestIntent: (
    host: ConnectHost,
    origin: string,
    action: string,
    params: Record<string, unknown>,
  ) => Promise<{ result?: unknown; error?: { code: number; message: string } }>;

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
  /**
   * False for a short settle window after the intent modal's contents change.
   * All intent modals share button geometry, so a swap under a stationary cursor
   * is clickjacking without an iframe (graceful lock §8.4).
   */
  intentInteractive: boolean;

  approveConnection: (grantedPermissions: PermissionScope[]) => void;
  denyConnection: () => void;
  resolveIntent: (result: unknown) => void;
  rejectIntent: (code: number, message: string) => void;

  /** Register a live host with its transport-verified origin. Paired with releaseHost(). */
  attachHost: (host: ConnectHost, origin: string) => void;
  /** Remove a host (tab closed, url switched, popup unloaded) and settle its pending work. */
  releaseHost: (host: ConnectHost) => void;

  /** Register an auto-approve handler for an intent action, scoped to ONE host. */
  registerAutoIntent: (host: ConnectHost, action: string, handler: AutoIntentHandler) => void;
}

export const ConnectContext = createContext<ConnectContextValue | null>(null);

export function useConnectContext(): ConnectContextValue {
  const ctx = useContext(ConnectContext);
  if (!ctx) throw new Error('useConnectContext must be used within ConnectProvider');
  return ctx;
}
