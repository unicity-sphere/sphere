/**
 * wallet-api composition config (S4 provider swap).
 *
 * The ASSET path moves to the wallet-api backend when `VITE_WALLET_API_URL`
 * is set; messaging, DMs and nametags stay on Nostr. When unset, the app
 * keeps the legacy local-custody composition (IndexedDB + Nostr asset
 * delivery) unchanged.
 *
 * URLs may be relative (e.g. `/wallet-api`): they resolve against the app
 * origin, which is how the dev/preview proxy in vite.config.ts is reached —
 * the backend serves no CORS headers, so cross-origin browser calls need the
 * local proxy (production deployments must solve this at the edge).
 */

/** Engine override for the LOCAL compose stack (smoke tests / local dev). */
export interface EngineOverrideConfig {
  /** Aggregator gateway URL (the mock aggregator of the dev stack). */
  aggregatorUrl: string;
  /** Trust base JSON URL — MUST be the trustbase the same gateway serves. */
  trustBaseUrl: string;
}

/** Resolve an env URL; relative values resolve against the app origin. */
function resolveUrl(value: string): string {
  return new URL(value, window.location.origin).toString();
}

/** Backend base URL when wallet-api mode is enabled; null otherwise. */
export function getWalletApiBaseUrl(): string | null {
  const raw = import.meta.env.VITE_WALLET_API_URL as string | undefined;
  if (!raw) return null;
  return resolveUrl(raw);
}

/** True when the asset path rides wallet-api (drives IPFS-off, UI hints). */
export function isWalletApiEnabled(): boolean {
  return getWalletApiBaseUrl() !== null;
}

/**
 * Aggregator + trustbase override for the LOCAL dev stack. Both URLs must be
 * set together: the trustbase is the engine's source of truth for the
 * network id, and mixing a gateway with another network's trustbase would
 * make the engine reject every proof (or worse, accept the wrong network).
 */
export function getEngineOverride(): EngineOverrideConfig | null {
  const aggregatorUrl = import.meta.env.VITE_AGGREGATOR_URL as string | undefined;
  const trustBaseUrl = import.meta.env.VITE_TRUSTBASE_URL as string | undefined;
  if (!aggregatorUrl && !trustBaseUrl) return null;
  if (!aggregatorUrl || !trustBaseUrl) {
    throw new Error(
      'VITE_AGGREGATOR_URL and VITE_TRUSTBASE_URL must be set together — ' +
        'a gateway must be paired with the trustbase it serves (never mix trustbases).',
    );
  }
  return {
    aggregatorUrl: resolveUrl(aggregatorUrl),
    trustBaseUrl: resolveUrl(trustBaseUrl),
  };
}
