/**
 * UXF Profile mode bring-up — safe legacy→Profile token migration.
 *
 * Why this exists (post sphere-sdk #294, vendor-bumped to fdd8db6):
 *  - sphere-sdk PR #294 (issue #292) introduced Sphere-bound Profile
 *    factories that build providers with identity ALREADY attached, via
 *    `Sphere._withFullIdentityForProfileFactory`. The private key never
 *    crosses the SDK boundary — this consumer holds zero key material.
 *  - Before #294 this file synthesized a `FullIdentity` with
 *    `privateKey: ''` and passed it through the old
 *    `setIdentity(identity)` surface, which Profile providers rejected
 *    via `hexToBytes('')` (Issue #292). That synthesis is now DELETED.
 *
 * Public API used here:
 *   - `createBrowserProfileProvidersFromSphere(sphere, { network, oracle })`
 *     — returns ready-to-use Profile providers, identity already bound.
 *   - `migrateLegacyToProfileBrowser({ sphere, legacy, network, oracle, ... })`
 *     — runs the legacy→Profile copy via the SDK's `migrateTokenStorage`
 *     core, with the Sphere-bound factory injected internally. Returns
 *     `{ ...migrationResult, profileProviders }`.
 *
 * Migration contract (unchanged):
 *  - Idempotent: the SDK's marker check short-circuits the second call.
 *  - Atomic at the target: target.save() runs once after a full snapshot
 *    transform; partial writes do NOT stamp the marker, so a crash
 *    mid-migration leaves both stores intact and the next boot retries.
 *  - Aggregator-spent gating: active tokens whose state is already spent
 *    on-chain are demoted to `archived-`; probe throws are tolerated
 *    (left in active slot, retried by the runtime SpentStateRescanWorker).
 *
 * Architectural invariant (user, verbatim): "Private key materials should
 * never leave Sphere SDK itself! However, it should be possible to perform
 * all the relevant cryptographic operations within Sphere SDK over external
 * materials by means of undisclosed respective private key (like, generating
 * digital signature, etc.)". This file enforces that — no `FullIdentity`
 * is ever constructed here, no `privateKey` field is ever read or written.
 */

import { logger } from '@unicitylabs/sphere-sdk';
import type {
  InitProgress,
  NetworkType,
  Sphere,
  StorageProvider,
  TokenStorageProvider,
  TxfStorageDataBase,
} from '@unicitylabs/sphere-sdk';
import type { BrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';
import {
  createBrowserProfileProvidersFromSphere,
  migrateLegacyToProfileBrowser,
  type BrowserProfileProviders,
} from '@unicitylabs/sphere-sdk/profile/browser';
import { hasMaterialContent } from './utils/tokenStorageProbe';

/**
 * tsup bundles `Sphere` separately into `dist/index.d.ts` and
 * `dist/profile/browser.d.ts`. Each declaration has private fields, so
 * TS treats them as distinct nominal types and rejects passing one
 * where the other is expected. The runtime class is the same. We cast
 * through `unknown` at the call boundary into the profile/browser
 * bundle. Documented in CLAUDE.md ("tsup bundle duplication note").
 */
type SphereInProfileBundle = Parameters<typeof createBrowserProfileProvidersFromSphere>[0];

/**
 * Inputs to {@link runProfileMigration}. Kept narrow so unit tests don't
 * need to construct full provider objects.
 *
 * Note: there is NO `createProfileProviders` test seam — the SDK helper
 * `migrateLegacyToProfileBrowser` builds the Profile providers internally
 * via the Sphere-bound factory. Tests stub the entire `migrate` call.
 */
export interface RunProfileMigrationInput {
  readonly legacyProviders: BrowserProviders;
  readonly sphere: Sphere;
  readonly network: NetworkType;
  readonly setInitProgress: (p: InitProgress | null) => void;
  /**
   * Override the migration helper — used by tests.
   * Defaults to `migrateLegacyToProfileBrowser` from sphere-sdk.
   */
  readonly migrate?: typeof migrateLegacyToProfileBrowser;
  /**
   * Bypass the data-presence guard AND the SDK marker. Used by the
   * user-initiated "Merge Legacy → UXF (overwrite)" banner button in
   * `UxfBanner.tsx`. When `true`:
   *   - The pre-flight `hasMaterialContent(profile.load())` short-circuit
   *     is skipped (we WANT to overwrite).
   *   - `migrate({ force: true })` is set so the SDK's marker check is
   *     bypassed and the marker is rewritten with the new timestamp.
   *
   * Default: `false` (boot-time path).
   */
  readonly force?: boolean;
}

/**
 * Successful migration result — caller swaps `legacyProviders.storage`
 * / `tokenStorage` to these references and deletes `ipfsTokenStorage`.
 *
 * Types are deliberately the BROAD `StorageProvider` /
 * `TokenStorageProvider<TxfStorageDataBase>` (rather than the narrow
 * `ProfileStorageProvider`/`ProfileTokenStorageProvider`) because:
 *   1. The SDK helper's result types are already broad (see
 *      `MigrateLegacyToProfileFromSphereResult.profileProviders`).
 *   2. `BrowserProviders` consumers (e.g. `SphereProvider`) only need
 *      the abstract interface — they assign these into fields typed
 *      against the broad interfaces.
 */
export interface RunProfileMigrationResult {
  readonly profileStorage: StorageProvider;
  readonly profileTokenStorage: TokenStorageProvider<TxfStorageDataBase>;
  readonly migrationCounts: {
    readonly tokensMigrated: number;
    readonly archivedMigrated: number;
  };
  /**
   * `true` when the migration short-circuited because the marker was
   * present (idempotent re-entry). `false` when fresh data was copied.
   */
  readonly skippedDueToMarker: boolean;
}

/**
 * Run the safe legacy→Profile token migration AFTER the legacy Sphere
 * has loaded identity. Returns the constructed Profile providers + the
 * migration result on success, or `null` when the migration failed
 * (caller MUST keep using the legacy providers — DO NOT swap on failure).
 *
 * The `sphere` argument MUST be a LIVE Sphere instance (not a synthetic
 * `{ identity }` cast) — the SDK's Sphere-bound factory reaches into the
 * Sphere's INTERNAL `_identity.privateKey` via
 * `Sphere._withFullIdentityForProfileFactory` to build providers with
 * encryption keys correctly derived. A synthetic object will cause the
 * factory to throw `SphereError('NOT_INITIALIZED')`.
 */
export async function runProfileMigration(
  input: RunProfileMigrationInput,
): Promise<RunProfileMigrationResult | null> {
  const {
    legacyProviders,
    sphere,
    network,
    setInitProgress,
    migrate = migrateLegacyToProfileBrowser,
    force = false,
  } = input;

  const identity = sphere.identity;
  if (!identity || !identity.directAddress) {
    logger.warn('SphereProvider', 'UXF migration skipped: identity unavailable');
    return null;
  }

  // CRITICAL — wallet-data-loss guard (pre-flight probe).
  //
  // The SDK helper's `migrateTokenStorage` does a FULL OVERWRITE of the
  // target (it writes `shallowCopyStorageData(sourceData)` after probing).
  // If the source (legacy tokenStorage) is empty and the target (Profile
  // tokenStorage) already has tokens, the helper would silently wipe
  // Profile. This can legitimately happen when a wallet was created
  // FRESH under UXF on a previous boot (fresh-wallet branch wrote to
  // Profile-only) and then a later boot enters the
  // `Sphere.exists(legacy)===true` branch (because the local-cache
  // IndexedDB for wallet keys is shared between legacy and Profile
  // local caches — Profile uses `createIndexedDBStorageProvider()` for
  // its local cache, identical DB name to legacy).
  //
  // The SDK's marker check inside the helper does NOT cover this case
  // (the marker is only stamped by a previous run of the helper, not
  // by fresh-wallet creation). So we still probe Profile target first
  // via the new Sphere-bound factory (which attaches identity properly
  // — no `privateKey: ''` synthesis required) and short-circuit if
  // target already holds material content.
  //
  // FORCE OVERRIDE — when the caller explicitly opts into overwrite
  // (e.g. the user clicked "Merge Legacy → UXF (overwrite)" in the
  // banner), this guard is skipped because the user has acknowledged
  // that Profile-only data will be lost.
  if (!force) {
    let probe: BrowserProfileProviders | null = null;
    try {
      probe = await createBrowserProfileProvidersFromSphere(
        sphere as unknown as SphereInProfileBundle,
        {
          network,
          oracle: legacyProviders.oracle,
        },
      );
      const targetSnapshot = await probe.tokenStorage.load();
      if (targetSnapshot.success && targetSnapshot.data) {
        if (hasMaterialContent(targetSnapshot.data as unknown as Record<string, unknown>)) {
          logger.debug(
            'SphereProvider',
            'UXF migration skipped: Profile storage already populated (fresh-wallet path or prior migration)',
          );
          // Hand the probe providers back to the caller — they're
          // already initialized + identity-attached, and there's no
          // material content to copy from legacy. Caller swaps these
          // in directly. (We deliberately do NOT disconnect the probe
          // providers here on the success path.)
          return {
            profileStorage: probe.storage,
            profileTokenStorage: probe.tokenStorage,
            migrationCounts: { tokensMigrated: 0, archivedMigrated: 0 },
            skippedDueToMarker: true,
          };
        }
      }
      // Target is empty — disconnect the probe providers cleanly; the
      // migration call below will spin up its own (the SDK helper
      // builds them internally and there's no API to inject ours).
      // Double Helia/OrbitDB attach to the same content-addressed DB
      // is safe, but we still want to release the probe handle.
      try { await probe.tokenStorage.disconnect(); } catch { /* ignore */ }
      try { await probe.storage.disconnect(); } catch { /* ignore */ }
      probe = null;
    } catch (err) {
      // Probe failure is non-fatal — fall through to the migration
      // call, which has its own source/target guards. We log and
      // continue. Clean up any half-built probe providers.
      logger.warn(
        'SphereProvider',
        'Profile token storage probe failed before migration; proceeding',
        err,
      );
      if (probe) {
        try { await probe.tokenStorage.disconnect(); } catch { /* ignore */ }
        try { await probe.storage.disconnect(); } catch { /* ignore */ }
      }
    }
  }

  setInitProgress({
    step: 'syncing_tokens',
    message: 'Migrating tokens to Profile storage…',
  });

  try {
    // The Sphere-bound helper builds Profile providers internally with
    // the SDK's `_withFullIdentityForProfileFactory` — the private key
    // never crosses this boundary. We pass the live Sphere, the legacy
    // source tokenStorage, the network preset, and the oracle (shared
    // RootTrustBase per SPEC §8.4.2 H6). The helper returns the
    // constructed providers in `result.profileProviders`.
    const result = await migrate({
      sphere: sphere as unknown as SphereInProfileBundle,
      legacy: legacyProviders.tokenStorage,
      network,
      // Aggregator-spent gating: probes throw → token left in active
      // slot (defensive). Keeps us tolerant of transient oracle errors.
      oracle: legacyProviders.oracle,
      // When the caller passed `force: true` (merge-overwrite path),
      // skip the SDK's idempotency-marker short-circuit so the helper
      // re-copies legacy → Profile even if a prior migration was
      // already stamped. The marker is REWRITTEN on success so
      // subsequent boots still short-circuit.
      force,
      onProgress: (p) => {
        // Surface the helper's own phase into the existing initProgress
        // pipeline. We map the helper's phases onto the SDK's
        // 'syncing_tokens' step so existing UI components don't need
        // a new step constant.
        const phaseLabel =
          p.phase === 'oracle-probe'
            ? `Checking ${p.processed}/${p.total} tokens on-chain`
            : p.phase === 'target-save'
              ? 'Writing migrated tokens to Profile storage'
              : p.phase === 'await-flush'
                ? 'Flushing Profile storage to disk'
                : p.phase === 'stamp-marker'
                  ? 'Finalizing migration marker'
                  : 'Migrating tokens to Profile storage';
        setInitProgress({ step: 'syncing_tokens', message: phaseLabel });
      },
    });

    // CRITICAL: partial success → DO NOT swap. The helper itself does
    // NOT stamp the marker on partial failures (it only stamps after a
    // successful target.save() + flush), so re-entry will retry. But
    // for THIS session we keep the legacy providers active so the user
    // sees their full balance.
    if (!result.success) {
      // Serialize each error inline so the browser console doesn't collapse
      // them to "Array(2)" — without this the operator has no idea which
      // phase failed. The SDK reports `{phase, error}` entries.
      const errorSummary = (result.errors ?? [])
        .map((e, i) => `#${i + 1} [${e.phase}] ${e.error}`)
        .join(' | ');
      logger.error(
        'SphereProvider',
        `UXF migration failed; falling back to legacy mode — ${errorSummary || '(no error details from SDK)'}`,
        {
          errorCount: result.errors?.length ?? 0,
          errors: result.errors,
        },
      );
      // Best-effort cleanup: disconnect the half-initialized Profile
      // providers the helper built so we don't leak handles.
      try { await result.profileProviders.tokenStorage.disconnect(); } catch { /* ignore */ }
      try { await result.profileProviders.storage.disconnect(); } catch { /* ignore */ }
      return null;
    }

    if (result.skippedDueToMarker) {
      logger.debug(
        'SphereProvider',
        'UXF migration already complete (marker present); reusing Profile providers',
      );
    } else {
      logger.debug('SphereProvider', 'UXF migration completed', {
        tokensMigrated: result.tokensMigrated,
        archivedMigrated: result.archivedMigrated,
        spentTokensArchived: result.spentTokensArchived,
        durationMs: result.durationMs,
      });
    }

    return {
      profileStorage: result.profileProviders.storage,
      profileTokenStorage: result.profileProviders.tokenStorage,
      migrationCounts: {
        tokensMigrated: result.tokensMigrated,
        archivedMigrated: result.archivedMigrated,
      },
      skippedDueToMarker: result.skippedDueToMarker,
    };
  } catch (err) {
    logger.error(
      'SphereProvider',
      'UXF migration threw unexpectedly; falling back to legacy mode',
      err,
    );
    return null;
  }
}
