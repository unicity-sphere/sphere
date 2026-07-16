import { NETWORKS } from '@unicitylabs/sphere-sdk';
import { SPHERE_NETWORK } from './network';
import { runtimeSetting as setting } from './runtimeConfig';

/**
 * Subscription gateway (SGW) config. When SUBSCRIPTION_ENABLED is false the
 * app keeps using the static VITE_AGGREGATOR_API_KEY and no subscription
 * calls are made.
 *
 * The SGW *is* the aggregator gateway (it fronts the aggregator's write
 * path), so its base URL is derived from the SDK's per-network config — no
 * env var needed, and it follows the network automatically like every other
 * backend URL. All SGW endpoints serve CORS for browser calls
 * (unicitynetwork/aggregator-subscription#57), so the wallet talks to it
 * directly. VITE_SUBSCRIPTION_API_URL remains as a dev override: the local
 * SGW compose stack is reached via the same-origin `/sgw` vite proxy
 * (SGW_PROXY_TARGET, see vite.config.ts).
 *
 * The flags come from window.__SPHERE_RUNTIME_CONFIG__ rather than a
 * `__RUNTIME_*__` sed placeholder because a placeholder cannot carry a value a
 * branch decides on — every `if (SUBSCRIPTION_ENABLED)` would be pruned against
 * the baked literal at build time (this actually happened). The rule, the fold
 * directions and the mechanism now live in src/config/runtimeConfig.ts; read
 * that before adding a value here.
 */

function resolveSubscriptionApiUrl(): string {
  const raw = import.meta.env.VITE_SUBSCRIPTION_API_URL as string | undefined;
  if (raw !== undefined && raw !== '') return raw;
  return NETWORKS[SPHERE_NETWORK].aggregatorUrl;
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
