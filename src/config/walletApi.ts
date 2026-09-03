/**
 * wallet-api composition config (S4 provider swap).
 *
 * The ASSET path rides the wallet-api backend whenever the wallet can run at
 * all; messaging, DMs and nametags stay on Nostr. With no URL for the active
 * network there is NO composition to fall back to: sphere-sdk 0.15.0's
 * Sphere.init calls resolvePaymentsV2Composition() before anything else and
 * throws INVALID_CONFIG without a `walletApi` config, and the Nostr asset rail
 * that used to back local custody (kinds 31113/31115/31116) no longer exists in
 * the SDK. A missing URL therefore means the wallet cannot start on that
 * network — which is why the availability gate in network.ts hides such a
 * network outright rather than letting a user select it.
 *
 * Which URL applies is a PER-NETWORK question — the SDK client is bound to the
 * active network and a backend configured for another one refuses its sign-in.
 * Resolution therefore lives in walletApiNetworks.ts, along with the reason it
 * reads the runtime global rather than a sed placeholder.
 *
 * URLs may be relative (e.g. `/wallet-api`): they resolve against the app
 * origin, which is how the dev/preview proxy in vite.config.ts is reached —
 * the backend serves no CORS headers, so cross-origin browser calls need the
 * local proxy (production deployments must solve this at the edge).
 *
 * Docker runtime substitution — READ BEFORE EDITING: Rollup statically
 * evaluates BRANCH conditions against baked literals (following const bindings,
 * across modules) and prunes them, so a value that gates an `if` cannot ride
 * the `__RUNTIME_*__` sed placeholders at all — see src/config/runtimeConfig.ts
 * for the rule, the fold directions and the mechanism that replaces it.
 *
 * Two former hazards documented here are now gone, and the notes are kept only
 * to stop them being reintroduced:
 *  - getWalletApiBaseUrl's null branch used to be compile-eliminated (it tested
 *    a baked literal directly), so a Docker image silently pointed the wallet at
 *    its own origin instead of returning null. It now tests the result of
 *    walletApiUrlFor(), a function call the bundler cannot fold, so the branch
 *    survives and an unconfigured network reads as null — which is a refusal
 *    (the #351 assert, or the SDK's INVALID_CONFIG), not a fallback.
 *  - isWalletApiRequired() used to fold to a hardcoded `true` and vanish, which
 *    silently armed both the #351 throw and the availability gate while the
 *    start-up check still believed the flag was off. It now reads the runtime
 *    global.
 */

import type { NetworkType } from '@unicitylabs/sphere-sdk';
import { DEFAULT_NETWORK, SUPPORTED_NETWORKS } from './network';
import { hasWalletApiUrl, isWalletApiRequired, walletApiUrlFor } from './walletApiNetworks';

// Re-exported so this module's public surface is unchanged; it lives in the
// leaf so network.ts can read it without importing this file (which imports
// SUPPORTED_NETWORKS from network.ts — that would be a cycle).
export { isWalletApiRequired };

/** Engine override for the LOCAL compose stack (smoke tests / local dev). */
export interface EngineOverrideConfig {
  /** Aggregator gateway URL (the mock aggregator of the dev stack). */
  aggregatorUrl: string;
  /** Trust base JSON URL — MUST be the trustbase the same gateway serves. */
  trustBaseUrl: string;
}

/** Resolve an env URL; relative values resolve against the app origin. */
function resolveUrl(value: string): string {
  return new URL(value, window.location.origin).toString();
}

/**
 * Backend base URL for `network`, or null when this deployment does not serve
 * it — a network the wallet cannot run at all (Sphere.init refuses to compose
 * money without a `walletApi` config; see the module docstring).
 *
 * #351 assert (2026-06-12 incident): a bundle that DECLARES wallet-api custody
 * but has no URL for the network it is about to run must fail at provider
 * composition. When #351 was filed the failure it prevented was a SILENT swap
 * to local custody; that fallback is gone, so what the assert buys now is
 * WHERE the failure lands — a named, actionable error at buildProviders rather
 * than the SDK's generic INVALID_CONFIG a step later.
 *
 * Armed only for networks the switcher can select (SUPPORTED_NETWORKS), which
 * since the 0.16.0-dev.1 bump is exactly {testnet2, mainnet}. The exemption
 * used to exist for the console-only 'dev' hatch; the SDK deleted that network
 * and src/config/network.ts deleted the hatch, so what remains outside the list
 * is the 'testnet' alias — never a resolvable active network, so the assert is
 * never asked about it in practice. Note the availability gate largely SUBSUMES
 * this assert: a network is only selectable when a URL exists for it, so in
 * practice this now guards the build-default network.
 */
export function getWalletApiBaseUrl(network: NetworkType): string | null {
  const raw = walletApiUrlFor(network);
  // Unlike the previous single-env version, this null branch is NOT foldable:
  // `raw` comes from a function call rather than a baked literal, so a Docker
  // bundle reports "no URL for this network" truthfully instead of folding to
  // the app's own origin.
  if (raw === null) {
    if (isWalletApiRequired() && SUPPORTED_NETWORKS.some((n) => n.id === network)) {
      throw new Error(
        `This build declares wallet-api custody (VITE_REQUIRE_WALLET_API) but has no ` +
          `wallet-api URL for network "${network}", and there is no local-custody ` +
          `composition to fall back to — the wallet cannot start on it. Set ` +
          `WALLET_API_URL_${network.toUpperCase()} on the container env (or ` +
          `VITE_WALLET_API_URL for the build default network). Unsetting ` +
          `VITE_REQUIRE_WALLET_API only moves this failure later, into Sphere.init.`,
      );
    }
    return null;
  }
  return resolveUrl(raw);
}

/**
 * True when the asset path rides wallet-api for `network` (drives UI hints).
 * Never throws (no #351 assert) so render paths are safe: the assert
 * fires once, at provider composition (`buildProviders`), where
 * SphereProvider catches it and surfaces a visible initialization error.
 *
 * Per-network on purpose: a deployment-wide flag would disagree with the
 * composition once URLs are per-network — reporting "wallet-api on" for a
 * network that in fact has no backend here (and the reverse on dev).
 */
export function isWalletApiEnabled(network: NetworkType): boolean {
  return hasWalletApiUrl(network);
}

/**
 * Aggregator + trustbase override for the LOCAL dev stack. Both URLs must be
 * set together: the trustbase is the engine's source of truth for the
 * network id, and mixing a gateway with another network's trustbase would
 * make the engine reject every proof (or worse, accept the wrong network).
 *
 * A gateway+trustbase pair IS a network, and there is only one pair of vars —
 * so the override describes exactly one network: the one this deployment
 * starts on, which is what a local stack is brought up for. It must therefore
 * NOT follow a network switch: applying it to another network is precisely the
 * trustbase mixing the pairing rule above exists to prevent. Before switching
 * existed the active network was always the start network, so this could not
 * arise; now it can, so the override is scoped rather than global.
 */
export function getEngineOverride(network: NetworkType): EngineOverrideConfig | null {
  const aggregatorUrl = import.meta.env.VITE_AGGREGATOR_URL as string | undefined;
  const trustBaseUrl = import.meta.env.VITE_TRUSTBASE_URL as string | undefined;
  if (!aggregatorUrl && !trustBaseUrl) return null;
  if (!aggregatorUrl || !trustBaseUrl) {
    throw new Error(
      'VITE_AGGREGATOR_URL and VITE_TRUSTBASE_URL must be set together — ' +
        'a gateway must be paired with the trustbase it serves (never mix trustbases).',
    );
  }
  if (network !== DEFAULT_NETWORK) {
    // Ignore rather than throw: the SDK's own preset for this network is
    // correct, so the switch should work — the override simply does not
    // describe where the wallet now is.
    if (import.meta.env.DEV) {
      console.warn(
        `[walletApi] Ignoring VITE_AGGREGATOR_URL/VITE_TRUSTBASE_URL on network "${network}": ` +
          `the override is configured for "${DEFAULT_NETWORK}", and pairing its gateway with ` +
          `another network's trustbase would make the engine reject every proof.`,
      );
    }
    return null;
  }
  return {
    aggregatorUrl: resolveUrl(aggregatorUrl),
    trustBaseUrl: resolveUrl(trustBaseUrl),
  };
}
