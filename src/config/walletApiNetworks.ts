/**
 * Per-network wallet-api backends: which network this deployment can actually
 * serve, and at what URL.
 *
 * WHY PER NETWORK: the SDK's wallet-api client is bound to the active network
 * and refuses a challenge naming a different one, so pointing a mainnet session
 * at a testnet2 backend does not degrade — it kills the whole asset/custody
 * path at sign-in. One URL per deployment cannot serve two networks.
 *
 * WHY THE RUNTIME GLOBAL: these values decide whether a network is offered at
 * all, and an availability decision is a BRANCH. Delivered through the sed
 * `__RUNTIME_*__` placeholders it would fold at build time — and fold OPEN
 * (`Boolean('__RUNTIME_…__')` → true), marking a network available in every
 * container regardless of the env, while erasing the placeholder the CI guard
 * greps for. See src/config/runtimeConfig.ts. Hence: NO new placeholders and no
 * Dockerfile ARGs for these — the container writes them into
 * window.__SPHERE_RUNTIME_CONFIG__ instead.
 *
 * This module is a LEAF (SDK types + runtimeConfig only). Both src/config/network.ts
 * and src/config/walletApi.ts import from it, so the graph stays a DAG.
 */
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import { readRuntimeConfig, type SphereRuntimeConfig } from './runtimeConfig';

/**
 * The network a build falls back to when no valid choice is persisted, and the
 * one the legacy single-URL env refers to. Lives here (not in network.ts) so
 * this module stays a leaf and the import graph has no cycle.
 */
export const BUILD_DEFAULT_NETWORK: NetworkType = 'testnet2';

/**
 * Runtime-config key per network. A SOURCE-level map with literal keys — no env
 * is involved, so nothing here can fold. Networks absent from this map are
 * never wallet-api-served: 'dev' is a local escape hatch (it composes the
 * legacy local-custody bundle) and 'testnet' is an alias of testnet2.
 */
const RUNTIME_KEY: Partial<Record<NetworkType, keyof SphereRuntimeConfig>> = {
  testnet2: 'WALLET_API_URL_TESTNET2',
  mainnet: 'WALLET_API_URL_MAINNET',
};

/**
 * Build-time per-network URLs, for builds that HAVE no container to write the
 * global: `npm run dev`, GitHub Pages, tests. Docker images must never define
 * these — see the warning below.
 *
 * ⚠️ NEVER add a Dockerfile ARG / `__RUNTIME_*__` placeholder for these keys.
 * The safety of this map rests on WHAT the env holds, not on the map's shape:
 *  - dev/Pages bake the REAL value, so even if a bundler folds a branch on it,
 *    it folds to the truth — harmless;
 *  - Docker leaves them undefined (no ARG), so they fold to `undefined` and the
 *    runtime global stays the only source — also harmless.
 * Give them a placeholder and that invariant dies: the fold would go fail-OPEN
 * against a truthy `'__RUNTIME_…__'` and mark the network available in every
 * image, exactly the bug this module exists to prevent.
 */
const ENV_URL: Partial<Record<NetworkType, string | undefined>> = {
  testnet2: import.meta.env.VITE_WALLET_API_URL_TESTNET2 as string | undefined,
  mainnet: import.meta.env.VITE_WALLET_API_URL_MAINNET as string | undefined,
};

/**
 * The wallet-api base for `network`, or null when this deployment does not
 * serve it. Raw value — callers resolve relative URLs against the origin.
 */
export function walletApiUrlFor(network: NetworkType): string | null {
  const key = RUNTIME_KEY[network];
  // Computed access on a window global: unfoldable by construction. The
  // container is authoritative, so it wins over anything baked at build time.
  const runtime = key ? readRuntimeConfig()?.[key] : undefined;
  if (runtime !== undefined && runtime !== '') return runtime;

  // Build-time per-network URL (dev / Pages / tests — never Docker).
  const env = ENV_URL[network];
  if (env !== undefined && env !== '') return env;

  // Legacy single-URL deployments (VITE_WALLET_API_URL, and every deployment
  // predating per-network config) mean "the build default network's backend".
  //
  // THE INVARIANT: an env term is fold-eligible anywhere, and survives here
  // only in the expression form below. It is permitted ONLY for the build
  // default, where a fold-to-true is a provable no-op: resolveActiveNetwork
  // returns BUILD_DEFAULT_NETWORK unconditionally without consulting
  // availability, and runtime-config.sh already fails closed on an empty
  // legacy URL under REQUIRE_WALLET_API. Every OTHER network reads the global
  // exclusively — zero env terms — so its gate cannot fail open.
  if (network !== BUILD_DEFAULT_NETWORK) return null;

  const legacy = import.meta.env.VITE_WALLET_API_URL as string | undefined;
  // Do NOT reduce to a bare truthiness test: `!!legacy` folds to true against
  // the baked placeholder; the `!== ''` term is what survives into the Docker
  // bundle and keeps this runtime-decided after substitution.
  return !!legacy && legacy !== '' ? legacy : null;
}

/** Non-throwing capability predicate — safe to call at module scope. */
export function hasWalletApiUrl(network: NetworkType): boolean {
  return walletApiUrlFor(network) !== null;
}

/**
 * True when this bundle declares wallet-api intent (`VITE_REQUIRE_WALLET_API`).
 * Set by deployments whose custody model is wallet-api (the Pages workflow):
 * any value other than empty/`false`/`0` counts as set.
 *
 * Lives in this leaf (not walletApi.ts) so src/config/network.ts can ask "is
 * this a wallet-api deployment?" without importing walletApi.ts — which imports
 * SUPPORTED_NETWORKS back from network.ts. Re-exported from walletApi.ts to
 * keep that module's public surface unchanged.
 */
export function isWalletApiRequired(): boolean {
  const raw = import.meta.env.VITE_REQUIRE_WALLET_API as string | undefined;
  return !!raw && raw !== 'false' && raw !== '0';
}
