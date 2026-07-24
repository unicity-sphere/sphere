import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';

/**
 * Bridges the live ConnectHost instance up to `SphereProvider.lock()` (#449
 * Task 8a: dApp notify on lock).
 *
 * `ConnectHost` is created and owned by `ConnectProvider`
 * (src/components/connect/ConnectProvider.tsx), which is mounted as a
 * DESCENDANT of `SphereProvider` in the app tree (see src/main.tsx). React
 * context only flows downward, so `SphereProvider` cannot `useContext` a
 * context provided further down the tree — this tiny module-scoped mirror is
 * the bridge instead. `ConnectProvider.setConnectHost()` keeps it in sync;
 * `SphereProvider.lock()` reads it to notify the connected dApp (if any)
 * BEFORE destroying the Sphere instance.
 */
let activeConnectHost: ConnectHost | null = null;

export function setActiveConnectHost(host: ConnectHost | null): void {
  activeConnectHost = host;
}

export function getActiveConnectHost(): ConnectHost | null {
  return activeConnectHost;
}
