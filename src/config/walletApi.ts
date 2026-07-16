/**
 * wallet-api composition config (S4 provider swap).
 *
 * The ASSET path moves to the wallet-api backend when `VITE_WALLET_API_URL`
 * is set; messaging, DMs and nametags stay on Nostr. When unset, the app
 * keeps the legacy local-custody composition (IndexedDB + Nostr asset
 * delivery) unchanged.
 *
 * URLs may be relative (e.g. `/wallet-api`): they resolve against the app
 * origin, which is how the dev/preview proxy in vite.config.ts is reached —
 * the backend serves no CORS headers, so cross-origin browser calls need the
 * local proxy (production deployments must solve this at the edge).
 *
 * Docker runtime substitution — READ BEFORE EDITING: the Docker image bakes
 * `__RUNTIME_*__` placeholder strings for these env vars and sed-rewrites
 * them at container start (deploy/runtime-config.sh). Know what survives into
 * that bundle: Rollup statically evaluates BRANCH conditions against the
 * baked literals (following const bindings, across modules) and prunes them —
 * in Docker images the `if (!raw)` branch of getWalletApiBaseUrl(), with the
 * whole #351 throw and the legacy `return null` fallback, is compile-time
 * eliminated, and isWalletApiRequired() is tree-shaken with it. The #351 half
 * is guarded at runtime by the fail-closed check in deploy/runtime-config.sh
 * (container refuses to start); the legacy half has NO runtime equivalent —
 * an empty WALLET_API_URL makes the compiled getWalletApiBaseUrl() return the
 * app's own origin instead of null, so legacy local-custody composition is
 * unreachable in Docker images and deployments must always set
 * WALLET_API_URL (runtime-config.sh warns). Expression-position string
 * comparisons (isWalletApiEnabled's `raw !== ''`) DO survive and stay
 * runtime-decided — that is what keeps enable/disable working at runtime.
 * A value that must gate `if` branches at runtime cannot use the placeholder
 * mechanism at all: use window.__SPHERE_RUNTIME_CONFIG__ instead (see
 * src/config/subscription.ts). Non-Docker builds (dev, GitHub Pages) bake
 * real values, so all of this folds correctly per environment there.
 */

import type { NetworkType } from '@unicitylabs/sphere-sdk';
import { SUPPORTED_NETWORKS } from './network';
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
 * Which wallet-api URL applies is a PER-NETWORK question: the SDK client is
 * bound to the active network and refuses a challenge naming another one, so
 * one URL cannot serve two networks. Resolution (and the reason it reads the
 * runtime global rather than a sed placeholder) lives in walletApiNetworks.ts.
 */

/**
 * Backend base URL for `network`, or null when this deployment does not serve
 * it (which composes the legacy local-custody bundle).
 *
 * #351 assert (2026-06-12 incident): a bundle that DECLARES wallet-api custody
 * but has no URL for the network it is about to run must fail at provider
 * composition instead of silently composing local custody — a missing URL
 * CHANGES the custody model, not just degrades a feature.
 *
 * Armed only for networks the switcher can select (SUPPORTED_NETWORKS). 'dev'
 * is exempt on purpose: it is a console-only local escape hatch with no
 * deployed backend, and arming it there would break the very deployment used
 * to verify switching (the Pages build sets VITE_REQUIRE_WALLET_API=true) —
 * dev correctly falls back to local custody instead. Note the availability
 * gate largely SUBSUMES this assert: a network is only selectable when a URL
 * exists for it, so in practice this now guards the build-default network.
 */
export function getWalletApiBaseUrl(network: NetworkType): string | null {
  const raw = walletApiUrlFor(network);
  // Unlike the previous single-env version, this null branch is NOT foldable:
  // `raw` comes from a function call rather than a baked literal, so legacy
  // local custody is reachable in Docker bundles again.
  if (raw === null) {
    if (isWalletApiRequired() && SUPPORTED_NETWORKS.some((n) => n.id === network)) {
      throw new Error(
        `This build declares wallet-api custody (VITE_REQUIRE_WALLET_API) but has no ` +
          `wallet-api URL for network "${network}", so composing the legacy local-custody ` +
          `bundle instead would silently change the custody model. Set ` +
          `WALLET_API_URL_${network.toUpperCase()} on the container env (or ` +
          `VITE_WALLET_API_URL for the build default network), or unset ` +
          `VITE_REQUIRE_WALLET_API for an intentionally legacy deployment.`,
      );
    }
    return null;
  }
  return resolveUrl(raw);
}

/**
 * True when the asset path rides wallet-api for `network` (drives IPFS-off, UI
 * hints). Never throws (no #351 assert) so render paths are safe: the assert
 * fires once, at provider composition (`buildProviders`), where
 * SphereProvider catches it and surfaces a visible initialization error.
 *
 * Per-network on purpose: a deployment-wide flag would disagree with the
 * composition once URLs are per-network — reporting "wallet-api on" for a
 * network that actually composed local custody would force IPFS token sync off
 * beside local custody (and the reverse on dev).
 */
export function isWalletApiEnabled(network: NetworkType): boolean {
  return hasWalletApiUrl(network);
}

/**
 * Aggregator + trustbase override for the LOCAL dev stack. Both URLs must be
 * set together: the trustbase is the engine's source of truth for the
 * network id, and mixing a gateway with another network's trustbase would
 * make the engine reject every proof (or worse, accept the wrong network).
 */
export function getEngineOverride(): EngineOverrideConfig | null {
  const aggregatorUrl = import.meta.env.VITE_AGGREGATOR_URL as string | undefined;
  const trustBaseUrl = import.meta.env.VITE_TRUSTBASE_URL as string | undefined;
  if (!aggregatorUrl && !trustBaseUrl) return null;
  if (!aggregatorUrl || !trustBaseUrl) {
    throw new Error(
      'VITE_AGGREGATOR_URL and VITE_TRUSTBASE_URL must be set together — ' +
        'a gateway must be paired with the trustbase it serves (never mix trustbases).',
    );
  }
  return {
    aggregatorUrl: resolveUrl(aggregatorUrl),
    trustBaseUrl: resolveUrl(trustBaseUrl),
  };
}
