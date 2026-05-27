/**
 * UXF Profile mode bring-up — safe legacy→Profile token migration.
 *
 * Why this exists (post PR #305 / #306):
 *  - PR #305 swapped providers WITHOUT migration → stranded existing wallets'
 *    tokens (balance went to 0). PR #306 reverted #305.
 *  - sphere-sdk PRs #287/#288/#289 (integration/all-fixes @ 8307711) deliver:
 *      • CidRefStore for OpLog 128 KiB cap relief (GroupChat regression fix)
 *      • migrateLegacyToProfile() helper with idempotency marker,
 *        aggregator-spent gating, partial-write safety, crash-safety
 *  - This module chains the helper into the SphereProvider initialize()
 *    flow so users with existing legacy data keep their tokens after the
 *    Profile swap.
 *
 * Migration contract (see sphere-sdk PR #289 docstring):
 *  - Idempotent: marker check short-circuits the second call.
 *  - Atomic at the target: target.save() runs once after a full snapshot
 *    transform; partial writes do NOT stamp the marker, so a crash
 *    mid-migration leaves both stores intact and the next boot retries.
 *  - Aggregator-spent gating: active tokens whose state is already spent
 *    on-chain are demoted to `archived-`; throws during probe are tolerated
 *    (left in active slot, retried by the runtime SpentStateRescanWorker).
 */

import { logger } from '@unicitylabs/sphere-sdk';
import type {
  FullIdentity,
  InitProgress,
  NetworkType,
  Sphere,
} from '@unicitylabs/sphere-sdk';
import type { BrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';
import {
  createBrowserProfileProviders,
  type BrowserProfileProviders,
} from '@unicitylabs/sphere-sdk/profile/browser';
import { migrateLegacyToProfile } from '@unicitylabs/sphere-sdk/profile';
import { hasMaterialContent } from './utils/tokenStorageProbe';

/**
 * Inputs to {@link runProfileMigration}. Kept narrow so unit tests don't
 * need to construct full provider objects.
 */
export interface RunProfileMigrationInput {
  readonly legacyProviders: BrowserProviders;
  readonly sphere: Sphere;
  readonly network: NetworkType;
  readonly setInitProgress: (p: InitProgress | null) => void;
  /**
   * Override the Profile providers factory — used by tests.
   * Defaults to `createBrowserProfileProviders` from sphere-sdk.
   */
  readonly createProfileProviders?: typeof createBrowserProfileProviders;
  /**
   * Override the migration helper — used by tests.
   * Defaults to `migrateLegacyToProfile` from sphere-sdk.
   */
  readonly migrate?: typeof migrateLegacyToProfile;
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
 */
export interface RunProfileMigrationResult {
  readonly profileStorage: BrowserProfileProviders['storage'];
  readonly profileTokenStorage: BrowserProfileProviders['tokenStorage'];
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
 */
export async function runProfileMigration(
  input: RunProfileMigrationInput,
): Promise<RunProfileMigrationResult | null> {
  const {
    legacyProviders,
    sphere,
    network,
    setInitProgress,
    createProfileProviders = createBrowserProfileProviders,
    migrate = migrateLegacyToProfile,
    force = false,
  } = input;

  const identity = sphere.identity;
  if (!identity || !identity.directAddress) {
    logger.warn('SphereProvider', 'UXF migration skipped: identity unavailable');
    return null;
  }

  let profile: BrowserProfileProviders | null = null;
  try {
    // Construct Profile providers (OrbitDB + aggregator pointer). Share the
    // same `oracle` instance so the embedded RootTrustBase matches the L4
    // aggregator (sphere-sdk SPEC §8.4.2 H6).
    profile = createProfileProviders({
      network,
      oracle: legacyProviders.oracle,
    });

    // The migration helper requires a FullIdentity, but only reads
    // `directAddress`, `chainPubkey`, and `l1Address` (see sphere-sdk
    // profile/token-storage-migration.ts). `privateKey` is never touched
    // by the helper itself — it's only needed for the provider's own
    // setIdentity hook. We synthesize a zero-key FullIdentity here ONLY
    // for the helper's contract.
    const migrationIdentity: FullIdentity = {
      ...identity,
      privateKey: '',
    };

    // Both providers must accept the identity + be initialized BEFORE
    // running the migration (per the helper's example contract).
    //   - tokenStorage: `setIdentity(...)` + `initialize()`
    //   - storage:      `setIdentity(...)` + `connect()` (StorageProvider
    //                   interface uses connect(), not initialize())
    profile.tokenStorage.setIdentity(migrationIdentity);
    profile.storage.setIdentity(migrationIdentity);
    await profile.tokenStorage.initialize();
    await profile.storage.connect();

    // CRITICAL — wallet-data-loss guard.
    //
    // The migration helper's target.save() is a FULL OVERWRITE (it
    // saves `shallowCopyStorageData(sourceData)` which only contains
    // `_meta` plus whatever was in source). If the source (legacy
    // tokenStorage) is empty and the target (Profile tokenStorage)
    // already has tokens, the helper would silently wipe Profile.
    //
    // This can legitimately happen when a wallet was created FRESH
    // under UXF on a previous boot (fresh-wallet branch wrote to
    // Profile-only) and then a later boot enters the
    // `Sphere.exists(legacy)===true` branch (because the local-cache
    // IndexedDB for wallet keys is shared between legacy and Profile
    // local caches — Profile uses `createIndexedDBStorageProvider()`
    // for its local cache, identical DB name to legacy).
    //
    // We probe target Profile token storage first; if it already has
    // any active tokens, archived entries, outbox, sent, or tombstone
    // records, we skip migration entirely and adopt Profile as-is.
    // The SDK marker check inside the helper does NOT cover this case
    // (the marker is only stamped by a previous run of the helper, not
    // by fresh-wallet creation).
    //
    // FORCE OVERRIDE — when the caller explicitly opts into overwrite
    // (e.g. the user clicked "Merge Legacy → UXF (overwrite)" in the
    // banner), this guard is skipped because the user has acknowledged
    // that Profile-only data will be lost.
    if (!force) {
      try {
        const targetSnapshot = await profile.tokenStorage.load();
        if (targetSnapshot.success && targetSnapshot.data) {
          if (hasMaterialContent(targetSnapshot.data as unknown as Record<string, unknown>)) {
            logger.debug(
              'SphereProvider',
              'UXF migration skipped: Profile storage already populated (fresh-wallet path or prior migration)',
            );
            return {
              profileStorage: profile.storage,
              profileTokenStorage: profile.tokenStorage,
              migrationCounts: { tokensMigrated: 0, archivedMigrated: 0 },
              skippedDueToMarker: true,
            };
          }
        }
      } catch (err) {
        // Probe failure is non-fatal — the helper will be called and its
        // own source/target guards take over. We log and continue.
        logger.warn(
          'SphereProvider',
          'Profile token storage probe failed before migration; proceeding',
          err,
        );
      }
    }

    setInitProgress({
      step: 'syncing_tokens',
      message: 'Migrating tokens to Profile storage…',
    });

    const result = await migrate({
      legacy: legacyProviders.tokenStorage,
      profile: profile.tokenStorage,
      identity: migrationIdentity,
      // Aggregator-spent gating: probes throw → token left in active
      // slot (defensive). Keeps us tolerant of transient oracle errors.
      oracle: legacyProviders.oracle,
      // Marker lives in the TARGET (Profile) storage so a future
      // profile-only client also sees the marker.
      markerStorage: profile.storage,
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
      logger.error('SphereProvider', 'UXF migration failed; falling back to legacy mode', {
        errors: result.errors,
      });
      // Best-effort cleanup: disconnect the half-initialized Profile
      // providers so we don't leak handles.
      try { await profile.tokenStorage.disconnect(); } catch { /* ignore */ }
      try { await profile.storage.disconnect(); } catch { /* ignore */ }
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
      profileStorage: profile.storage,
      profileTokenStorage: profile.tokenStorage,
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
    // Best-effort cleanup on construction or attach failures.
    if (profile) {
      try { await profile.tokenStorage.disconnect(); } catch { /* ignore */ }
      try { await profile.storage.disconnect(); } catch { /* ignore */ }
    }
    return null;
  }
}

