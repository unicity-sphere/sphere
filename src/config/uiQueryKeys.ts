/**
 * React Query is used here for two unrelated jobs: caching WALLET data, and holding
 * localStorage-backed UI state (which desktop tabs are open, whether the wallet panel is out,
 * app order, installed apps). A lock must wipe the first and must NOT touch the second.
 *
 * Why it matters, concretely: `DesktopLayout` consumes no Sphere hook, so a lock never
 * re-renders it. Removing `['desktop','state']` leaves its mounted observer bound to a
 * discarded Query object, and the next `setWalletOpen(true)` writes into a fresh instance
 * nobody reads — so after an auto-lock the Wallet button, fullscreen and Escape all go dead.
 * That would make the locked screens' own "Unlock Wallet" button dead too, which is exactly
 * the affordance the lock is supposed to offer.
 *
 * The list lives in one module so it cannot drift away from the hooks that own the data.
 * Adding a new localStorage-backed UI query means adding its root here — a hook whose data is
 * `staleTime: Infinity` and written only by `setQueryData` is the shape to look for.
 */

/** Root segments of caches that hold UI state, never wallet data. */
const UI_ONLY_QUERY_ROOTS: readonly string[] = [
  'desktop', // useDesktopState — open tabs, active tab, walletOpen, fullscreen
  'ui', // useUIState — chrome-level toggles
  'desktop-order', // useDesktopOrder — user's app arrangement
  'installed-projects', // useInstalledProjects — which apps the user added
];

/**
 * True when this query holds UI state a lock must preserve.
 *
 * Deliberately keyed on the ROOT segment, so `['installed-projects','server']` is covered by
 * `'installed-projects'` — a sub-key of a UI store is still UI state.
 */
export function isUiOnlyQuery(query: { queryKey: readonly unknown[] }): boolean {
  const root = query.queryKey[0];
  return typeof root === 'string' && UI_ONLY_QUERY_ROOTS.includes(root);
}
