/// <reference types="chrome" />

/**
 * ConnectHost manager for the extension background service worker.
 *
 * Bridges the Sphere Connect protocol:
 * - Creates ConnectHost with ExtensionTransport when wallet is unlocked
 * - Routes onConnectionRequest → popup (approval modal)
 * - Routes onIntent → popup (intent modal)
 * - Exposes pending approval/intent queues that popup polls via POPUP_* messages
 */

import { ConnectHost } from '@unicitylabs/sphere-sdk/connect';
import { ExtensionTransport } from '@unicitylabs/sphere-sdk/connect/browser';
import type { DAppMetadata, ConnectSession, PermissionScope, SphereConnectMessage } from '@unicitylabs/sphere-sdk/connect';
import { walletManager } from './wallet-manager';
import { openOrFocusSphereWindow } from './popup-manager';

// =============================================================================
// Approved origins (chrome.storage.local)
// =============================================================================

const APPROVED_ORIGINS_KEY = 'sphere_approved_origins';

export interface ApprovedOriginEntry {
  permissions: PermissionScope[];
  connectedAt: number;
  lastSeenAt: number;
  dapp: DAppMetadata;
}

async function getApprovedOrigins(): Promise<Record<string, ApprovedOriginEntry>> {
  const result = await chrome.storage.local.get(APPROVED_ORIGINS_KEY);
  return (result[APPROVED_ORIGINS_KEY] as Record<string, ApprovedOriginEntry>) ?? {};
}

async function saveApprovedOrigin(
  origin: string,
  dapp: DAppMetadata,
  permissions: PermissionScope[],
): Promise<void> {
  const current = await getApprovedOrigins();
  current[origin] = { permissions, connectedAt: Date.now(), lastSeenAt: Date.now(), dapp };
  await chrome.storage.local.set({ [APPROVED_ORIGINS_KEY]: current });
}

export async function getConnectedSites(): Promise<Record<string, ApprovedOriginEntry>> {
  return getApprovedOrigins();
}

export async function revokeConnectedSite(origin: string): Promise<void> {
  const current = await getApprovedOrigins();
  delete current[origin];
  await chrome.storage.local.set({ [APPROVED_ORIGINS_KEY]: current });
}

// =============================================================================
// Pending approval / intent types
// =============================================================================

export interface PendingConnectApproval {
  id: string;
  dapp: DAppMetadata;
  requestedPermissions: PermissionScope[];
  resolve: (result: { approved: boolean; grantedPermissions: PermissionScope[] }) => void;
}

export interface PendingConnectIntent {
  id: string;
  action: string;
  params: Record<string, unknown>;
  session: ConnectSession;
  resolve: (result: { result?: unknown; error?: { code: number; message: string } }) => void;
}

// =============================================================================
// State
// =============================================================================

let pendingApproval: PendingConnectApproval | null = null;
let pendingIntent: PendingConnectIntent | null = null;
let connectHost: ConnectHost | null = null;

// =============================================================================
// Persistent transport — created once, lives for the entire service worker lifetime.
// This ensures connect messages from dApps are captured even while the wallet
// is locked (before ConnectHost exists). Messages are buffered and replayed
// once the user unlocks and initConnectHost() is called.
// =============================================================================

const hostTransport = ExtensionTransport.forHost({
  onMessage: chrome.runtime.onMessage,
  tabs: chrome.tabs,
});

/** Buffered connect messages that arrived before ConnectHost was ready. */
interface BufferedConnectMessage {
  payload: SphereConnectMessage;
  receivedAt: number;
}
const connectMessageBuffer: BufferedConnectMessage[] = [];

/** Max age for buffered messages (30 seconds) — older messages are discarded on replay. */
const BUFFER_MAX_AGE_MS = 30_000;

/** Reference to ConnectHost's message handler, captured via onMessage wrapper. */
let capturedHostHandler: ((msg: SphereConnectMessage) => void) | null = null;

// Buffer handler — always active on the transport.
// When ConnectHost is null, incoming messages are queued for later replay.
hostTransport.onMessage((msg: SphereConnectMessage) => {
  if (!connectHost) {
    connectMessageBuffer.push({ payload: msg, receivedAt: Date.now() });
  }
});

// Wrap transport.onMessage so we can capture ConnectHost's handler for replay.
const originalOnMessage = hostTransport.onMessage.bind(hostTransport);
(hostTransport as { onMessage: typeof hostTransport.onMessage }).onMessage = (
  handler: (msg: SphereConnectMessage) => void,
) => {
  capturedHostHandler = handler;
  return originalOnMessage(handler);
};

/** Replay buffered messages through ConnectHost's handler (discard stale ones). */
function replayBufferedMessages(): void {
  if (!capturedHostHandler || connectMessageBuffer.length === 0) return;

  const now = Date.now();
  const fresh = connectMessageBuffer.splice(0).filter(
    (m) => now - m.receivedAt < BUFFER_MAX_AGE_MS,
  );

  console.log(`[ConnectHost] Replaying ${fresh.length} buffered connect messages`);
  for (const { payload } of fresh) {
    try {
      capturedHostHandler(payload);
    } catch (err) {
      console.warn('[ConnectHost] Error replaying buffered message:', err);
    }
  }
}

// =============================================================================
// Popup helpers
// =============================================================================

/** Open the popup window for user interaction. */
async function openPopupForConnect(): Promise<void> {
  try {
    await openOrFocusSphereWindow();
  } catch {
    // ignore
  }
}

// =============================================================================
// ConnectHost lifecycle
// =============================================================================

export function initConnectHost(): void {
  destroyConnectHost();

  const sphere = walletManager.getSphereInstance();
  if (!sphere) return;

  connectHost = new ConnectHost({
    sphere,
    transport: hostTransport,

    onConnectionRequest: async (dapp, requestedPermissions, silent) => {
      // Check approved origins
      try {
        const origin = new URL(dapp.url).origin;
        const approved = await getApprovedOrigins();
        if (approved[origin]) {
          approved[origin].lastSeenAt = Date.now();
          await chrome.storage.local.set({ [APPROVED_ORIGINS_KEY]: approved });
          return { approved: true, grantedPermissions: approved[origin].permissions };
        }
      } catch {
        // Invalid URL — fall through
      }

      // Silent mode: reject without UI
      if (silent) {
        return { approved: false, grantedPermissions: [] };
      }

      // First-time — open popup for approval
      await openPopupForConnect();

      return new Promise<{ approved: boolean; grantedPermissions: PermissionScope[] }>((resolve) => {
        pendingApproval = {
          id: crypto.randomUUID(),
          dapp,
          requestedPermissions,
          resolve: (result) => {
            if (result.approved) {
              try {
                const origin = new URL(dapp.url).origin;
                saveApprovedOrigin(origin, dapp, result.grantedPermissions).catch(console.error);
              } catch { /* ignore */ }
            }
            resolve(result);
          },
        };

        // Timeout: 2 minutes
        setTimeout(() => {
          if (pendingApproval) {
            pendingApproval.resolve({ approved: false, grantedPermissions: [] });
            pendingApproval = null;
          }
        }, 120_000);
      });
    },

    onDisconnect: async (session) => {
      try {
        const origin = new URL(session.dapp.url).origin;
        await revokeConnectedSite(origin);
      } catch { /* ignore */ }
    },

    onIntent: async (action, params, session) => {
      await openPopupForConnect();

      return new Promise<{ result?: unknown; error?: { code: number; message: string } }>((resolve) => {
        pendingIntent = {
          id: crypto.randomUUID(),
          action,
          params,
          session,
          resolve,
        };

        // Timeout: 5 minutes
        setTimeout(() => {
          if (pendingIntent) {
            pendingIntent.resolve({ error: { code: 4001, message: 'User rejected' } });
            pendingIntent = null;
          }
        }, 300_000);
      });
    },
  });

  console.log('[ConnectHost] Initialized');

  // Restore persisted DM auto-approve setting
  restoreDmAutoApprove();

  // Replay any connect messages that arrived while the wallet was locked
  replayBufferedMessages();
}

export function destroyConnectHost(): void {
  if (connectHost) {
    connectHost.destroy();
    connectHost = null;
  }
  if (pendingApproval) {
    pendingApproval.resolve({ approved: false, grantedPermissions: [] });
    pendingApproval = null;
  }
  if (pendingIntent) {
    pendingIntent.resolve({ error: { code: 4001, message: 'User rejected' } });
    pendingIntent = null;
  }
}

const DM_AUTO_APPROVE_KEY = 'sphere_dm_auto_approve';

function applyDmAutoApprove(): void {
  if (!connectHost) return;
  connectHost.setIntentAutoApprove('dm', async (_action, params) => {
    try {
      const dm = await walletManager.sendDM(
        params.to as string,
        params.message as string,
      );
      return { result: { sent: true, messageId: dm.id, timestamp: dm.timestamp } };
    } catch (err) {
      return {
        error: {
          code: 5000,
          message: err instanceof Error ? err.message : 'DM failed',
        },
      };
    }
  });
}

export async function setDmAutoApprove(): Promise<void> {
  await chrome.storage.local.set({ [DM_AUTO_APPROVE_KEY]: true });
  applyDmAutoApprove();
}

/** Restore DM auto-approve from storage (called after initConnectHost) */
async function restoreDmAutoApprove(): Promise<void> {
  const data = await chrome.storage.local.get(DM_AUTO_APPROVE_KEY);
  if (data[DM_AUTO_APPROVE_KEY]) {
    applyDmAutoApprove();
  }
}

// =============================================================================
// Popup message handlers (called from message-handler.ts)
// =============================================================================

export function getConnectApproval(): Omit<PendingConnectApproval, 'resolve'> | null {
  if (!pendingApproval) return null;
  const { id, dapp, requestedPermissions } = pendingApproval;
  return { id, dapp, requestedPermissions };
}

export function resolveConnectApproval(
  id: string,
  approved: boolean,
  grantedPermissions: PermissionScope[],
): boolean {
  if (!pendingApproval || pendingApproval.id !== id) return false;
  pendingApproval.resolve({ approved, grantedPermissions });
  pendingApproval = null;
  return true;
}

export function getConnectIntent(): Omit<PendingConnectIntent, 'resolve'> | null {
  if (!pendingIntent) return null;
  const { id, action, params, session } = pendingIntent;
  return { id, action, params, session };
}

export function resolveConnectIntent(
  id: string,
  result: { result?: unknown; error?: { code: number; message: string } },
): boolean {
  if (!pendingIntent || pendingIntent.id !== id) return false;
  pendingIntent.resolve(result);
  pendingIntent = null;
  return true;
}
