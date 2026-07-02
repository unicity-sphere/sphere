/**
 * Subscription gateway (SGW) config. Env-driven so each environment points at
 * its own SGW host. When SUBSCRIPTION_ENABLED is false the app keeps using the
 * static VITE_AGGREGATOR_API_KEY and no subscription calls are made.
 */
export const SUBSCRIPTION_API_URL =
  import.meta.env.VITE_SUBSCRIPTION_API_URL ?? 'http://localhost:8080';

export const SUBSCRIPTION_ENABLED =
  import.meta.env.VITE_SUBSCRIPTION_ENABLED === 'true';
