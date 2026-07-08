/**
 * Subscription gateway (SGW) config. Env-driven so each environment points at
 * its own SGW host. When SUBSCRIPTION_ENABLED is false the app keeps using the
 * static VITE_AGGREGATOR_API_KEY and no subscription calls are made.
 *
 * Default is a relative path so the store endpoints (`/api/paymento/*`, which
 * send no CORS headers) ride the same-origin dev/preview proxy (see
 * vite.config.ts `/sgw` entry, target `SGW_PROXY_TARGET`).
 */
export const SUBSCRIPTION_API_URL =
  import.meta.env.VITE_SUBSCRIPTION_API_URL ?? '/sgw';

export const SUBSCRIPTION_ENABLED =
  import.meta.env.VITE_SUBSCRIPTION_ENABLED === 'true';

/** When true, the SGW client returns canned data instead of hitting the network — lets the UI be built before the backend is live. */
export const SUBSCRIPTION_MOCK =
  import.meta.env.VITE_SUBSCRIPTION_MOCK === 'true';

/**
 * Whether PAID plans can be purchased. Off by default on testnet — paid plans
 * render as "Coming on Mainnet" (visible but not selectable); only the free
 * plan is usable. Flip to 'true' for mainnet once the store is live.
 */
export const PAID_PLANS_ENABLED =
  import.meta.env.VITE_PAID_PLANS_ENABLED === 'true';
