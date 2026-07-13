/**
 * Resolves which aggregator API key the SDK oracle should use.
 *
 * The two modes are mutually exclusive — the static env key
 * (VITE_AGGREGATOR_API_KEY) and the per-wallet subscription key are NEVER
 * both in play:
 * - Subscriptions ON: the per-wallet subscription key is the ONLY source. The
 *   env key is completely ignored — even before a key is provisioned we return
 *   undefined rather than fall back to it (provisioning runs before any send).
 * - Subscriptions OFF: the static env key is the source (and is required at
 *   deploy time — deploy/runtime-config.sh fails closed without it).
 */
import { getStoredSubscriptionKey } from '../config/storageKeys';
import { SUBSCRIPTION_ENABLED } from '../config/subscription';

export function resolveOracleApiKey(opts: {
  storedKey: string | null;
  envKey: string | undefined;
  subscriptionEnabled: boolean;
}): string | undefined {
  if (opts.subscriptionEnabled) return opts.storedKey ?? undefined;
  return opts.envKey ?? undefined;
}

export function getActiveOracleApiKey(): string | undefined {
  return resolveOracleApiKey({
    storedKey: getStoredSubscriptionKey(),
    envKey: import.meta.env.VITE_AGGREGATOR_API_KEY,
    subscriptionEnabled: SUBSCRIPTION_ENABLED,
  });
}
