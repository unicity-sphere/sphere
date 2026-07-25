import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';

/**
 * Bridges every live ConnectHost instance up to `SphereProvider.lock()` (#449
 * Task 8a: dApp notify on lock).
 *
 * `ConnectHost` is created and owned by `ConnectProvider`
 * (src/components/connect/ConnectProvider.tsx), which is mounted as a
 * DESCENDANT of `SphereProvider` in the app tree (see src/main.tsx). React
 * context only flows downward, so `SphereProvider` cannot `useContext` a
 * context provided further down the tree — this module-scoped mirror is the
 * bridge instead.
 *
 * A COLLECTION, not a slot. `DesktopLayout` keeps every open tab mounted
 * (inactive tabs are `hidden`, not unmounted), so N framed dApps mean N live
 * hosts. With a single slot:
 *   - a lock reached only the LAST-registered host, leaving every other framed
 *     dApp talking to a wallet it believes is unlocked, and
 *   - any tab's cleanup nulled a live neighbour, because cleanup wrote `null`
 *     without checking whether the slot still held its own host.
 * Registration is keyed by the host instance itself, so unregistering one tab
 * can never affect another.
 */

/** What the wallet knows about a host. `origin` is the wallet-verified origin
 *  this host serves — never `session.dapp.url`, which is dApp-CLAIMED metadata. */
export interface ConnectHostEntry {
  readonly origin: string;
}

const hosts = new Map<ConnectHost, ConnectHostEntry>();

export function registerConnectHost(host: ConnectHost, entry: ConnectHostEntry): void {
  hosts.set(host, entry);
}

/** Idempotent, and scoped to THIS host: a tab unmounting cannot evict a neighbour. */
export function unregisterConnectHost(host: ConnectHost): void {
  hosts.delete(host);
}

export function getConnectHostEntry(host: ConnectHost): ConnectHostEntry | undefined {
  return hosts.get(host);
}

export function getConnectHosts(): ConnectHost[] {
  return [...hosts.keys()];
}

/** Iterates a SNAPSHOT: a callback that registers or unregisters a host (a lock
 *  tearing a popup down, say) cannot mutate the map mid-iteration. A throwing
 *  callback must not stop the fan-out — one dead host cannot leave the others
 *  believing the wallet is unlocked. */
export function forEachConnectHost(fn: (host: ConnectHost, entry: ConnectHostEntry) => void): void {
  for (const [host, entry] of [...hosts.entries()]) {
    try {
      fn(host, entry);
    } catch (err) {
      console.warn('[connectHostRegistry] host callback threw', err);
    }
  }
}

export function clearConnectHosts(): void {
  hosts.clear();
}
