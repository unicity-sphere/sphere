/**
 * Resolves which aggregator API key the SDK oracle should use:
 * the per-wallet subscription key when the feature is enabled and one exists,
 * otherwise the static build-time env key (migration fallback).
 */
import { getStoredSubscriptionKey } from '../config/storageKeys';
import { SUBSCRIPTION_ENABLED } from '../config/subscription';

export function resolveOracleApiKey(opts: {
  storedKey: string | null;
  envKey: string | undefined;
  subscriptionEnabled: boolean;
}): string | undefined {
  if (opts.subscriptionEnabled && opts.storedKey) return opts.storedKey;
  return opts.envKey ?? undefined;
}

export function getActiveOracleApiKey(): string | undefined {
  return resolveOracleApiKey({
    storedKey: getStoredSubscriptionKey(),
    envKey: import.meta.env.VITE_AGGREGATOR_API_KEY,
    subscriptionEnabled: SUBSCRIPTION_ENABLED,
  });
}
