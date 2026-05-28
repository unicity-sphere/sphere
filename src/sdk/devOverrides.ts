/**
 * Dev-mode endpoint overrides.
 *
 * Lives in its own module (not next to SphereProvider) so it can be
 * imported by both the provider and the Header chip without tripping
 * react-refresh's "only-export-components" rule.
 *
 * Storage keys are defined in `config/storageKeys.ts`. The `sphereDev`
 * console namespace and the SphereProvider wiring are the only setters
 * — everything else just reads.
 */
import { STORAGE_KEYS } from '../config/storageKeys';

export interface DevOverrideSnapshot {
  aggregatorUrl: string | null;
  skipTrustBase: boolean;
  nostrRelayUrl: string | null;
  ipfsGatewayUrl: string | null;
  faucetUrl: string | null;
  marketApiUrl: string | null;
}

export function readDevOverrideSnapshot(): DevOverrideSnapshot {
  return {
    aggregatorUrl: localStorage.getItem(STORAGE_KEYS.DEV_AGGREGATOR_URL),
    skipTrustBase:
      localStorage.getItem(STORAGE_KEYS.DEV_SKIP_TRUST_BASE) === 'true',
    nostrRelayUrl: localStorage.getItem(STORAGE_KEYS.DEV_NOSTR_RELAY_URL),
    ipfsGatewayUrl: localStorage.getItem(STORAGE_KEYS.DEV_IPFS_GATEWAY_URL),
    faucetUrl: localStorage.getItem(STORAGE_KEYS.DEV_FAUCET_URL),
    marketApiUrl: localStorage.getItem(STORAGE_KEYS.DEV_MARKET_API_URL),
  };
}

export function hasAnyDevOverride(snap?: DevOverrideSnapshot): boolean {
  const s = snap ?? readDevOverrideSnapshot();
  return Boolean(
    s.aggregatorUrl ||
      s.skipTrustBase ||
      s.nostrRelayUrl ||
      s.ipfsGatewayUrl ||
      s.faucetUrl ||
      s.marketApiUrl,
  );
}
