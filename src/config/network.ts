import type { NetworkType } from '@unicitylabs/sphere-sdk';

/**
 * The Unicity network this build targets. Single source of truth — used by
 * SphereProvider (main.tsx) and for deriving per-network service URLs
 * (src/config/subscription.ts). The network is a BUILD-time decision: the SDK
 * bakes per-network URLs, relays and registries from its NETWORKS table, so a
 * mainnet deployment is a different build, not a runtime flip.
 */
export const SPHERE_NETWORK: NetworkType = 'testnet2';
