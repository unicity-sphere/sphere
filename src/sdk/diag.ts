/**
 * Receive-path diagnostics (#491). Off unless the wallet is opened with
 * `?diag=1` or `localStorage.sphereDiag = '1'`, so it costs nothing normally.
 *
 * Exists because the balance-not-updating report survived fixes at the server,
 * SDK-cadence and query-invalidation layers, each of which verifies correct in
 * isolation. This prints the actual event -> invalidation -> refetch sequence in
 * the browser so the broken link stops being a matter of inference.
 */
let enabled: boolean | null = null;

function on(): boolean {
  if (enabled !== null) return enabled;
  try {
    enabled =
      new URLSearchParams(window.location.search).get('diag') === '1' ||
      window.localStorage.getItem('sphereDiag') === '1';
  } catch {
    enabled = false;
  }
  return enabled;
}

export function diag(message: string): void {
  if (!on()) return;
  console.log(`[sphere-diag ${String(Math.round(performance.now()))}ms] ${message}`);
}
