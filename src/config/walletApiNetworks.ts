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
import { readRuntimeConfig, runtimeSetting, type SphereRuntimeConfig } from './runtimeConfig';

/**
 * The network the LEGACY single URL (VITE_WALLET_API_URL) refers to.
 *
 * A build-time fact, not a deployment choice: that env var was introduced when
 * the app ran one network, so it can only ever have meant this one. Which
 * network a fresh wallet STARTS on is a separate, deployment-configurable
 * question — see DEFAULT_NETWORK / resolveActiveNetwork in network.ts. The two
 * were the same value once, and conflating them made a mainnet-first
 * deployment impossible.
 *
 * Lives here (not network.ts) so this module stays a leaf and the import graph
 * has no cycle.
 */
export const LEGACY_URL_NETWORK: NetworkType = 'testnet2';

/** Last-resort start network when a deployment names none. */
export const FALLBACK_NETWORK: NetworkType = 'testnet2';

/**
 * Runtime-config key per network. A SOURCE-level map with literal keys — no env
 * is involved, so nothing here can fold. Networks absent from this map are
 * never wallet-api-served: 'testnet' is an alias of testnet2, and 'dev' is a
 * console-only escape hatch with no deployed backend — which since sphere-sdk
 * 0.15.0 means a wallet cannot actually run on it (Sphere.init refuses to
 * compose money without a `walletApi` config, and there is no local-custody
 * bundle any more). It is kept here only so the switching machinery has a
 * second network to exercise; removing it is owned by the SDK-bump PR.
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
  // TRIMMED, not merely non-empty. A pasted ' ' passed a `!== ''` test, made the
  // network selectable, and then `new URL(' ', origin)` resolved to the WALLET'S
  // OWN origin — so the network would launch with its custody backend pointing at
  // the app instead of failing closed. Whitespace is a missing value.
  const runtime = key ? readRuntimeConfig()?.[key]?.trim() : undefined;
  if (runtime !== undefined && runtime !== '') return runtime;

  // Build-time per-network URL (dev / Pages / tests — never Docker).
  const env = ENV_URL[network]?.trim();
  if (env !== undefined && env !== '') return env;

  // Legacy single-URL deployments (VITE_WALLET_API_URL, and every deployment
  // predating per-network config) mean "the backend for the one network this
  // app used to run" — testnet2, and nothing else.
  //
  // THE INVARIANT: an env term is fold-eligible anywhere, and survives here
  // only in the expression form below. It is permitted ONLY for that one
  // network, where a fold cannot open a gate that matters: the legacy var only
  // ever described testnet2, and runtime-config.sh seeds it into the
  // per-network key anyway. Every OTHER network reads the global exclusively —
  // zero env terms — so its gate cannot fail open.
  if (network !== LEGACY_URL_NETWORK) return null;

  const legacy = import.meta.env.VITE_WALLET_API_URL as string | undefined;
  // Do NOT reduce to a bare truthiness test: `!!legacy` folds to true against
  // the baked placeholder; the `!== ''` term is what survives into the Docker
  // bundle and keeps this runtime-decided after substitution.
  return !!legacy && legacy.trim() !== '' ? legacy.trim() : null;
}

/** Non-throwing capability predicate — safe to call at module scope. */
export function hasWalletApiUrl(network: NetworkType): boolean {
  return walletApiUrlFor(network) !== null;
}

/**
 * True when this deployment declares wallet-api custody (#351). Any value other
 * than empty/`false`/`0` counts as set.
 *
 * Reads the runtime global, NOT a sed placeholder: this gates branches (the
 * availability gate in network.ts and the #351 throw in walletApi.ts), and as a
 * placeholder the whole expression const-folded to `true` and was erased from
 * the Docker bundle — arming both unconditionally while the shell still thought
 * the flag was off. A container could then pass every start-up check and die in
 * every browser, with the error naming a remedy ("unset VITE_REQUIRE_WALLET_API")
 * that no longer existed in the artifact.
 *
 * Lives in this leaf (not walletApi.ts) so src/config/network.ts can ask "is
 * this a wallet-api deployment?" without importing walletApi.ts — which imports
 * SUPPORTED_NETWORKS back from network.ts. Re-exported from walletApi.ts to
 * keep that module's public surface unchanged.
 */
export function isWalletApiRequired(): boolean {
  const raw = runtimeSetting(
    'REQUIRE_WALLET_API',
    import.meta.env.VITE_REQUIRE_WALLET_API as string | undefined,
  );
  return !!raw && raw !== 'false' && raw !== '0';
}
