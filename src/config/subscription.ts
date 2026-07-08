/**
 * Subscription gateway (SGW) config. Env-driven so each environment points at
 * its own SGW host. When SUBSCRIPTION_ENABLED is false the app keeps using the
 * static VITE_AGGREGATOR_API_KEY and no subscription calls are made.
 *
 * Default is a relative path so the store endpoints (`/api/paymento/*`, which
 * send no CORS headers) ride the same-origin dev/preview proxy (see
 * vite.config.ts `/sgw` entry, target `SGW_PROXY_TARGET`). In the Docker
 * image the same relative path is served by an nginx reverse proxy generated
 * at container start from `SGW_UPSTREAM` (deploy/runtime-config.sh).
 *
 * WHY window.__SPHERE_RUNTIME_CONFIG__ and not a `__RUNTIME_*__` sed
 * placeholder: the Docker image is built once and promoted across
 * environments, so these values must be swappable at container start. The
 * sed-placeholder mechanism cannot carry a FEATURE FLAG — Rollup statically
 * evaluates branch conditions during tree-shaking, following const bindings
 * across modules, so every `if (SUBSCRIPTION_ENABLED)` in the app gets pruned
 * against the baked literal (`'__RUNTIME_…__' === 'true'` → false) and the
 * feature is compile-time OFF no matter what the container substitutes (this
 * actually happened; see also the note in src/config/walletApi.ts). Reading
 * from a window global set before the bundle loads (public/runtime-config.js,
 * rewritten at container start by deploy/runtime-config.sh) keeps the value
 * genuinely unknown at build time, so no branch can fold. Dev and GitHub
 * Pages builds ship the default empty config and fall back to the VITE_* env
 * baked at build time.
 */

interface SphereRuntimeConfig {
  SUBSCRIPTION_API_URL?: string;
  SUBSCRIPTION_ENABLED?: string;
  PAID_PLANS_ENABLED?: string;
}

/**
 * Runtime value if present and non-empty, else the build-time env value.
 * Empty string means "not set on the container env" (runtime-config.sh always
 * writes all keys), so it must not shadow a value baked at build time.
 */
function setting(
  key: keyof SphereRuntimeConfig,
  envValue: string | undefined,
): string | undefined {
  const config =
    typeof window === 'undefined'
      ? undefined
      : (window as { __SPHERE_RUNTIME_CONFIG__?: SphereRuntimeConfig })
          .__SPHERE_RUNTIME_CONFIG__;
  const value = config?.[key];
  if (value === undefined || value === '') return envValue;
  return value;
}

function resolveSubscriptionApiUrl(): string {
  const value = setting(
    'SUBSCRIPTION_API_URL',
    import.meta.env.VITE_SUBSCRIPTION_API_URL as string | undefined,
  );
  if (value === undefined || value === '') return '/sgw';
  return value;
}
export const SUBSCRIPTION_API_URL = resolveSubscriptionApiUrl();

/** Exactly 'true' enables; anything else (including 'TRUE', '1') is off. */
export const SUBSCRIPTION_ENABLED =
  setting(
    'SUBSCRIPTION_ENABLED',
    import.meta.env.VITE_SUBSCRIPTION_ENABLED as string | undefined,
  ) === 'true';

/**
 * When true, the SGW client returns canned data instead of hitting the
 * network — lets the UI be built before the backend is live. Deliberately
 * NOT runtime-swappable (not part of the runtime config): mock mode is
 * dev-only, and with the env unset at build time the comparison folds to
 * `false` so production builds tree-shake the canned data. Never wire this
 * into the Docker runtime-config mechanism.
 */
export const SUBSCRIPTION_MOCK =
  import.meta.env.VITE_SUBSCRIPTION_MOCK === 'true';

/**
 * Whether PAID plans can be purchased. Off by default on testnet — paid plans
 * render as "Coming on Mainnet" (visible but not selectable); only the free
 * plan is usable. Flip to 'true' for mainnet once the store is live.
 */
export const PAID_PLANS_ENABLED =
  setting(
    'PAID_PLANS_ENABLED',
    import.meta.env.VITE_PAID_PLANS_ENABLED as string | undefined,
  ) === 'true';
