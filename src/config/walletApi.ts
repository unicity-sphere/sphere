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

/**
 * True when this bundle declares wallet-api intent (`VITE_REQUIRE_WALLET_API`).
 * Set by deployments whose custody model is wallet-api (the Pages workflow):
 * any value other than empty/`false`/`0` counts as set.
 */
export function isWalletApiRequired(): boolean {
  const raw = import.meta.env.VITE_REQUIRE_WALLET_API as string | undefined;
  return !!raw && raw !== 'false' && raw !== '0';
}

/**
 * Backend base URL when wallet-api mode is enabled; null otherwise.
 *
 * #351 assert (2026-06-12 incident): a bundle built with
 * `VITE_REQUIRE_WALLET_API` but without `VITE_WALLET_API_URL` must fail at
 * provider composition instead of silently falling back to the legacy
 * local-custody composition — a missing URL would otherwise CHANGE the
 * custody model, not just degrade a feature.
 */
export function getWalletApiBaseUrl(): string | null {
  const raw = import.meta.env.VITE_WALLET_API_URL as string | undefined;
  if (!raw) {
    if (isWalletApiRequired()) {
      throw new Error(
        'VITE_REQUIRE_WALLET_API is set but VITE_WALLET_API_URL is missing or empty — ' +
          'this build declares wallet-api custody, so composing the legacy local-custody ' +
          'bundle instead would silently change the custody model. Bake VITE_WALLET_API_URL ' +
          'into the build, or unset VITE_REQUIRE_WALLET_API for an intentionally legacy deployment.',
      );
    }
    return null;
  }
  return resolveUrl(raw);
}

/**
 * True when the asset path rides wallet-api (drives IPFS-off, UI hints).
 * Reads the raw env (no #351 assert) so render paths never throw: the assert
 * fires once, at provider composition (`buildProviders`), where
 * SphereProvider catches it and surfaces a visible initialization error.
 */
export function isWalletApiEnabled(): boolean {
  return !!(import.meta.env.VITE_WALLET_API_URL as string | undefined);
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
