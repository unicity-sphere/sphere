/**
 * Per-environment config the container supplies at START, not at build.
 *
 * WHY THIS EXISTS AND WHEN TO USE IT — READ BEFORE ADDING A VALUE.
 * Vite inlines `import.meta.env.VITE_*` into the bundle, so the Docker image
 * bakes `__RUNTIME_*__` placeholder strings and sed-rewrites them at container
 * start (deploy/runtime-config.sh). That mechanism carries plain VALUES fine,
 * but it CANNOT carry anything a branch decides on: Rollup statically evaluates
 * branch conditions against the baked literal and prunes the dead side, so the
 * decision is frozen at build time no matter what the container substitutes.
 * That already happened once with the subscription flags.
 *
 * The fold direction is what makes this dangerous rather than merely broken:
 *   `env === 'true'`  folds to FALSE  → a feature is stuck off (annoying)
 *   `Boolean(env)`    folds to TRUE   → a capability is stuck ON (unsafe), and
 *                     the placeholder is ERASED from the file, so the CI guard
 *                     that greps for surviving `__RUNTIME_` placeholders cannot
 *                     see it either.
 *
 * A read of a `window` global is unfoldable by construction — no optimizer can
 * know a global's value. So: anything that GATES a branch (feature flags,
 * capability/availability decisions) belongs here; a value that is only ever
 * passed through may use the sed placeholders.
 *
 * Written by deploy/runtime-config.sh into /runtime-config.js, loaded as a
 * classic script in <head> BEFORE the module bundle (src/index.html) — so
 * module-scope consts may read it safely. Dev and GitHub Pages builds ship the
 * default empty object (public/runtime-config.js) and fall back to the VITE_*
 * env baked at build time.
 */

export interface SphereRuntimeConfig {
  SUBSCRIPTION_ENABLED?: string;
  PAID_PLANS_ENABLED?: string;
  /** Per-network wallet-api backend bases; absent/empty = not served here. */
  WALLET_API_URL_TESTNET2?: string;
  WALLET_API_URL_MAINNET?: string;
  /** Deliberate mainnet rollout switch; anything but exactly 'true' is off. */
  MAINNET_ROLLOUT_ENABLED?: string;
}

/** The container-supplied config, or undefined (SSR / not yet written). */
export function readRuntimeConfig(): SphereRuntimeConfig | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as { __SPHERE_RUNTIME_CONFIG__?: SphereRuntimeConfig })
    .__SPHERE_RUNTIME_CONFIG__;
}

/**
 * Runtime value if present and non-empty, else the build-time env value.
 * Empty string means "not set on the container env" (runtime-config.sh always
 * writes every key), so it must not shadow a value baked at build time.
 */
export function runtimeSetting(
  key: keyof SphereRuntimeConfig,
  envValue: string | undefined,
): string | undefined {
  const value = readRuntimeConfig()?.[key];
  if (value === undefined || value === '') return envValue;
  return value;
}

/** A runtime flag is on only for EXACTLY 'true' (matches runtime-config.sh). */
export function runtimeFlag(key: keyof SphereRuntimeConfig, envValue: string | undefined): boolean {
  return runtimeSetting(key, envValue) === 'true';
}
