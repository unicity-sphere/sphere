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
 *
 * Docker runtime substitution — READ BEFORE EDITING: the Docker image bakes
 * `__RUNTIME_*__` placeholder strings for these env vars and sed-rewrites
 * them at container start (deploy/runtime-config.sh). Know what survives into
 * that bundle: Rollup statically evaluates BRANCH conditions against the
 * baked literals (following const bindings, across modules) and prunes them —
 * in Docker images the `if (!raw)` branch of getWalletApiBaseUrl(), with the
 * whole #351 throw and the legacy `return null` fallback, is compile-time
 * eliminated, and isWalletApiRequired() is tree-shaken with it. The #351 half
 * is guarded at runtime by the fail-closed check in deploy/runtime-config.sh
 * (container refuses to start); the legacy half has NO runtime equivalent —
 * an empty WALLET_API_URL makes the compiled getWalletApiBaseUrl() return the
 * app's own origin instead of null, so legacy local-custody composition is
 * unreachable in Docker images and deployments must always set
 * WALLET_API_URL (runtime-config.sh warns). Expression-position string
 * comparisons (isWalletApiEnabled's `raw !== ''`) DO survive and stay
 * runtime-decided — that is what keeps enable/disable working at runtime.
 * A value that must gate `if` branches at runtime cannot use the placeholder
 * mechanism at all: use window.__SPHERE_RUNTIME_CONFIG__ instead (see
 * src/config/subscription.ts). Non-Docker builds (dev, GitHub Pages) bake
 * real values, so all of this folds correctly per environment there.
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
  // NOTE: in Docker images this branch is compile-time-eliminated against the
  // baked placeholder (see file header); deploy/runtime-config.sh enforces
  // #351 there. This code path is live in dev / GitHub Pages builds.
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
  // The `!!raw` term folds to `true` against the baked placeholder; the
  // `raw !== ''` term is what survives into the Docker bundle and keeps this
  // a runtime decision after substitution (see file header). Don't reduce
  // this to a bare truthiness test.
  const raw = import.meta.env.VITE_WALLET_API_URL as string | undefined;
  return !!raw && raw !== '';
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
