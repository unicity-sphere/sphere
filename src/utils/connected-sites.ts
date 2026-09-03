import type { DAppMetadata, PermissionScope } from '@unicitylabs/sphere-sdk/connect';
import { STORAGE_KEYS } from '../config/storageKeys';
import { SPHERE_NETWORK } from '../config/network';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApprovedOriginEntry {
  permissions: PermissionScope[];
  connectedAt: number;
  lastSeenAt: number;
  dapp: DAppMetadata;
}

// ---------------------------------------------------------------------------
// CRUD helpers (synchronous — localStorage)
// ---------------------------------------------------------------------------

/**
 * Approvals are scoped BY NETWORK (#497 item 1).
 *
 * A grant is consent to spend on the network it was given on. Stored flat by
 * origin, a `transfer:request` the user approved for test money was silently
 * re-granted on mainnet — auto-approved, no prompt, no indication. The Connect
 * handshake does not catch this: its 4008 network check asserts the dApp and the
 * wallet agree with EACH OTHER, never that the user consented on this network.
 *
 * `v: 2` is what makes the migration honest. Anything without it is the flat
 * pre-network shape, and a flat entry cannot say which network it was granted
 * on — so it is DROPPED and the user is prompted again, rather than inherited
 * into a network it may never have been meant for. A one-time re-prompt is the
 * right price for a permission store.
 */
interface ApprovalStore {
  v: 2;
  byNetwork: Record<string, Record<string, ApprovedOriginEntry>>;
}

function readStore(): ApprovalStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONNECTED_SITES);
    if (!raw) return { v: 2, byNetwork: {} };
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' && parsed !== null &&
      (parsed as ApprovalStore).v === 2 &&
      typeof (parsed as ApprovalStore).byNetwork === 'object' &&
      (parsed as ApprovalStore).byNetwork !== null
    ) {
      return parsed as ApprovalStore;
    }
    return { v: 2, byNetwork: {} };
  } catch {
    return { v: 2, byNetwork: {} };
  }
}

function writeStore(store: ApprovalStore): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONNECTED_SITES, JSON.stringify(store));
  } catch { /* ignore */ }
}

/** Approvals granted on the ACTIVE network. */
export function getApprovedOrigins(): Record<string, ApprovedOriginEntry> {
  return readStore().byNetwork[SPHERE_NETWORK] ?? {};
}

export function getApprovedOrigin(origin: string): ApprovedOriginEntry | null {
  return getApprovedOrigins()[origin] ?? null;
}

export function saveApprovedOrigin(
  origin: string,
  dapp: DAppMetadata,
  permissions: PermissionScope[],
): void {
  const store = readStore();
  const forNetwork = store.byNetwork[SPHERE_NETWORK] ?? {};
  const existing = forNetwork[origin];
  forNetwork[origin] = {
    permissions,
    connectedAt: existing?.connectedAt ?? Date.now(),
    lastSeenAt: Date.now(),
    dapp,
  };
  store.byNetwork[SPHERE_NETWORK] = forNetwork;
  writeStore(store);
}

export function updateLastSeen(origin: string): void {
  const store = readStore();
  const forNetwork = store.byNetwork[SPHERE_NETWORK];
  if (!forNetwork?.[origin]) return;
  forNetwork[origin].lastSeenAt = Date.now();
  writeStore(store);
}

export function revokeApprovedOrigin(origin: string): void {
  const store = readStore();
  const forNetwork = store.byNetwork[SPHERE_NETWORK];
  if (!forNetwork?.[origin]) return;
  delete forNetwork[origin];
  writeStore(store);
}

// ---------------------------------------------------------------------------
// Migration from the pre-network formats
// ---------------------------------------------------------------------------

const OLD_KEY = 'sphere-connect:approved';

/**
 * Clears both pre-network shapes: the `sphere-connect:approved` array and the
 * flat `Record<origin, entry>` that replaced it.
 *
 * Neither records the network its grants were given on, and a permission store
 * must not guess. Inheriting them into the active network is how test-money
 * consent becomes real-money authority (#497 item 1); the flat shape is dropped
 * by `readStore()` on the first read, and this removes the older key so the
 * migration cannot run twice. Users re-approve once, with a prompt.
 */
export function migrateApprovedSessions(): void {
  try {
    localStorage.removeItem(OLD_KEY);
  } catch { /* ignore */ }
}
