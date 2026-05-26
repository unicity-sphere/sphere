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
