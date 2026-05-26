import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runProfileMigration } from '../../../src/sdk/uxfProfileMigration';
import type { Sphere, InitProgress } from '@unicitylabs/sphere-sdk';
import type { BrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';

// ──────────────────────────────────────────────────────────────────────────
// Test fixtures
// ──────────────────────────────────────────────────────────────────────────

const FAKE_IDENTITY = {
  chainPubkey: '02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  l1Address: 'alpha1example',
  directAddress: 'DIRECT://example',
} as const;

function makeFakeProfileProviders(opts?: {
  loadResult?: { success: boolean; data?: Record<string, unknown> };
}) {
  const tokenStorage = {
    setIdentity: vi.fn(),
    initialize: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
    // Default: target Profile storage is empty (legacy → Profile path).
    load: vi
      .fn()
      .mockResolvedValue(
        opts?.loadResult ?? {
          success: true,
          data: { _meta: { version: 1, address: '', formatVersion: '2.0', updatedAt: 0 } },
        },
      ),
  };
  const storage = {
    setIdentity: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  };
  return { tokenStorage, storage };
}

function makeFakeLegacyProviders(): BrowserProviders {
  return {
    storage: { id: 'legacy-storage' },
    tokenStorage: { id: 'legacy-token-storage' },
    transport: {},
    oracle: { id: 'oracle' },
    ipfsTokenStorage: { id: 'ipfs-token-storage' },
    publishToIpfs: vi.fn(),
    cidFetchGateways: ['https://gateway'],
  } as unknown as BrowserProviders;
}

function makeFakeSphere(identity = FAKE_IDENTITY): Sphere {
  return { identity } as unknown as Sphere;
}

const baseMigrationResult = {
  success: true,
  addressId: 'example',
  direction: 'legacy-to-profile' as const,
  skippedDueToMarker: false,
  dryRun: false,
  tokensMigrated: 5,
  archivedMigrated: 1,
  tombstonesMigrated: 0,
  outboxMigrated: 0,
  sentMigrated: 0,
  historyMigrated: 0,
  auditMigrated: 0,
  finalizationQueueMigrated: 0,
  invalidMigrated: 0,
  forksMigrated: 0,
  spentTokensArchived: 0,
  oracleProbeErrors: 0,
  durationMs: 42,
  errors: [],
};

// ──────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────

describe('runProfileMigration', () => {
  let progress: InitProgress[];
  let setInitProgress: (p: InitProgress | null) => void;

  beforeEach(() => {
    progress = [];
    setInitProgress = vi.fn((p) => {
      if (p) progress.push(p);
    });
  });

  it('migrates tokens, sets identity on both Profile providers, and returns swap refs', async () => {
    const profile = makeFakeProfileProviders();
    const createProfileProviders = vi.fn().mockReturnValue(profile);
    const migrate = vi.fn().mockResolvedValue({
      ...baseMigrationResult,
      skippedDueToMarker: false,
    });

    const legacy = makeFakeLegacyProviders();
    const sphere = makeFakeSphere();

    const result = await runProfileMigration({
      legacyProviders: legacy,
      sphere,
      network: 'testnet',
      setInitProgress,
      createProfileProviders: createProfileProviders as never,
      migrate: migrate as never,
    });

    // Profile providers were constructed with the shared oracle
    expect(createProfileProviders).toHaveBeenCalledExactlyOnceWith({
      network: 'testnet',
      oracle: legacy.oracle,
    });

    // Both providers got setIdentity + their respective init/connect
    expect(profile.tokenStorage.setIdentity).toHaveBeenCalledOnce();
    expect(profile.storage.setIdentity).toHaveBeenCalledOnce();
    expect(profile.tokenStorage.initialize).toHaveBeenCalledOnce();
    expect(profile.storage.connect).toHaveBeenCalledOnce();

    // Identity passed to setIdentity matches sphere.identity with zero priv key
    const passedIdentity = profile.tokenStorage.setIdentity.mock.calls[0][0];
    expect(passedIdentity.directAddress).toBe(FAKE_IDENTITY.directAddress);
    expect(passedIdentity.chainPubkey).toBe(FAKE_IDENTITY.chainPubkey);
    expect(passedIdentity.privateKey).toBe('');

    // Migration call args check
    expect(migrate).toHaveBeenCalledOnce();
    const migrateArgs = migrate.mock.calls[0][0];
    expect(migrateArgs.legacy).toBe(legacy.tokenStorage);
    expect(migrateArgs.profile).toBe(profile.tokenStorage);
    expect(migrateArgs.oracle).toBe(legacy.oracle);
    expect(migrateArgs.markerStorage).toBe(profile.storage);

    // Success path: returns the swap refs + counts + skippedDueToMarker
    expect(result).not.toBeNull();
    expect(result!.profileStorage).toBe(profile.storage);
    expect(result!.profileTokenStorage).toBe(profile.tokenStorage);
    expect(result!.migrationCounts.tokensMigrated).toBe(5);
    expect(result!.skippedDueToMarker).toBe(false);

    // No cleanup-disconnect on success
    expect(profile.tokenStorage.disconnect).not.toHaveBeenCalled();
    expect(profile.storage.disconnect).not.toHaveBeenCalled();

    // Progress was emitted at least once with the migration message
    expect(progress.some((p) => p.step === 'syncing_tokens')).toBe(true);
  });

  it('is idempotent — second call short-circuits via marker (skippedDueToMarker=true)', async () => {
    const profile = makeFakeProfileProviders();
    const createProfileProviders = vi.fn().mockReturnValue(profile);
    const migrate = vi.fn().mockResolvedValue({
      ...baseMigrationResult,
      skippedDueToMarker: true,
      tokensMigrated: 0,
      archivedMigrated: 0,
    });

    const legacy = makeFakeLegacyProviders();
    const sphere = makeFakeSphere();

    const result = await runProfileMigration({
      legacyProviders: legacy,
      sphere,
      network: 'testnet',
      setInitProgress,
      createProfileProviders: createProfileProviders as never,
      migrate: migrate as never,
    });

    expect(result).not.toBeNull();
    expect(result!.skippedDueToMarker).toBe(true);
    expect(result!.migrationCounts.tokensMigrated).toBe(0);
    // The helper itself signals "already done" — caller still gets the
    // Profile providers back so it can swap.
    expect(result!.profileStorage).toBe(profile.storage);
    expect(result!.profileTokenStorage).toBe(profile.tokenStorage);
  });

  it('returns null and cleans up Profile providers when migration fails', async () => {
    const profile = makeFakeProfileProviders();
    const createProfileProviders = vi.fn().mockReturnValue(profile);
    const migrate = vi.fn().mockResolvedValue({
      ...baseMigrationResult,
      success: false,
      tokensMigrated: 0,
      errors: [{ phase: 'target-save', error: 'disk full' }],
    });

    const legacy = makeFakeLegacyProviders();
    const sphere = makeFakeSphere();

    const result = await runProfileMigration({
      legacyProviders: legacy,
      sphere,
      network: 'testnet',
      setInitProgress,
      createProfileProviders: createProfileProviders as never,
      migrate: migrate as never,
    });

    expect(result).toBeNull();
    // Best-effort disconnect on the half-init Profile providers so we
    // don't leak handles.
    expect(profile.tokenStorage.disconnect).toHaveBeenCalledOnce();
    expect(profile.storage.disconnect).toHaveBeenCalledOnce();
  });

  it('returns null when sphere identity is missing (defensive)', async () => {
    const profile = makeFakeProfileProviders();
    const createProfileProviders = vi.fn().mockReturnValue(profile);
    const migrate = vi.fn();

    const legacy = makeFakeLegacyProviders();
    const sphere = { identity: null } as unknown as Sphere;

    const result = await runProfileMigration({
      legacyProviders: legacy,
      sphere,
      network: 'testnet',
      setInitProgress,
      createProfileProviders: createProfileProviders as never,
      migrate: migrate as never,
    });

    expect(result).toBeNull();
    // Migration never ran; Profile providers were never even constructed
    expect(createProfileProviders).not.toHaveBeenCalled();
    expect(migrate).not.toHaveBeenCalled();
  });

  it('returns null when identity has no directAddress', async () => {
    const profile = makeFakeProfileProviders();
    const createProfileProviders = vi.fn().mockReturnValue(profile);
    const migrate = vi.fn();

    const legacy = makeFakeLegacyProviders();
    const sphere = makeFakeSphere({
      ...FAKE_IDENTITY,
      directAddress: undefined as unknown as string,
    });

    const result = await runProfileMigration({
      legacyProviders: legacy,
      sphere,
      network: 'testnet',
      setInitProgress,
      createProfileProviders: createProfileProviders as never,
      migrate: migrate as never,
    });

    expect(result).toBeNull();
    expect(createProfileProviders).not.toHaveBeenCalled();
    expect(migrate).not.toHaveBeenCalled();
  });

  it('returns null and cleans up when an unexpected error throws from the helper', async () => {
    const profile = makeFakeProfileProviders();
    const createProfileProviders = vi.fn().mockReturnValue(profile);
    const migrate = vi.fn().mockRejectedValue(new Error('aggregator unreachable'));

    const legacy = makeFakeLegacyProviders();
    const sphere = makeFakeSphere();

    const result = await runProfileMigration({
      legacyProviders: legacy,
      sphere,
      network: 'testnet',
      setInitProgress,
      createProfileProviders: createProfileProviders as never,
      migrate: migrate as never,
    });

    expect(result).toBeNull();
    expect(profile.tokenStorage.disconnect).toHaveBeenCalledOnce();
    expect(profile.storage.disconnect).toHaveBeenCalledOnce();
  });

  it('CRITICAL: skips migration (no overwrite) when Profile token storage already has data', async () => {
    // Simulate a Profile-native wallet (created fresh under UXF on a
    // prior boot). The legacy local cache (shared `sphere-storage`
    // IndexedDB) holds the mnemonic, so `Sphere.exists(legacy)`
    // returns true and the exists-branch runs. But the legacy
    // tokenStorage was never written — only the Profile OrbitDB-backed
    // tokenStorage has tokens.
    //
    // The migration helper's `target.save()` is a FULL overwrite of
    // `_meta` + (shallow copy of) source contents. If we let it run
    // with an empty source, Profile data would be wiped.
    //
    // The guard probes Profile target via `tokenStorage.load()`; if
    // the returned snapshot has ANY active/archived/outbox/sent/etc
    // entries, we return early and DO NOT call the migration helper.
    const profile = makeFakeProfileProviders({
      loadResult: {
        success: true,
        data: {
          _meta: { version: 1, address: '', formatVersion: '2.0', updatedAt: 0 },
          '_abc123': { /* a real token entry */ genesis: { /* ... */ } },
        },
      },
    });
    const createProfileProviders = vi.fn().mockReturnValue(profile);
    const migrate = vi.fn();

    const result = await runProfileMigration({
      legacyProviders: makeFakeLegacyProviders(),
      sphere: makeFakeSphere(),
      network: 'testnet',
      setInitProgress,
      createProfileProviders: createProfileProviders as never,
      migrate: migrate as never,
    });

    // Migration helper MUST NOT have been called.
    expect(migrate).not.toHaveBeenCalled();

    // Caller still gets the Profile providers + `skippedDueToMarker:true`
    // so the swap proceeds.
    expect(result).not.toBeNull();
    expect(result!.skippedDueToMarker).toBe(true);
    expect(result!.profileStorage).toBe(profile.storage);
    expect(result!.profileTokenStorage).toBe(profile.tokenStorage);

    // No cleanup-disconnect — we're handing the providers to the caller.
    expect(profile.tokenStorage.disconnect).not.toHaveBeenCalled();
    expect(profile.storage.disconnect).not.toHaveBeenCalled();
  });

  it('treats `_outbox`/`_sent`/`_tombstones` populated arrays as "Profile has data" and skips', async () => {
    const profile = makeFakeProfileProviders({
      loadResult: {
        success: true,
        data: {
          _meta: { version: 1, address: '', formatVersion: '2.0', updatedAt: 0 },
          _outbox: [{ id: 'outbox-1' }],
        },
      },
    });
    const createProfileProviders = vi.fn().mockReturnValue(profile);
    const migrate = vi.fn();

    const result = await runProfileMigration({
      legacyProviders: makeFakeLegacyProviders(),
      sphere: makeFakeSphere(),
      network: 'testnet',
      setInitProgress,
      createProfileProviders: createProfileProviders as never,
      migrate: migrate as never,
    });

    expect(migrate).not.toHaveBeenCalled();
    expect(result?.skippedDueToMarker).toBe(true);
  });

  it('runs migration normally when Profile target has only `_meta` (truly empty)', async () => {
    const profile = makeFakeProfileProviders({
      loadResult: {
        success: true,
        data: {
          _meta: { version: 1, address: '', formatVersion: '2.0', updatedAt: 0 },
          _outbox: [],
          _sent: [],
        },
      },
    });
    const createProfileProviders = vi.fn().mockReturnValue(profile);
    const migrate = vi.fn().mockResolvedValue(baseMigrationResult);

    const result = await runProfileMigration({
      legacyProviders: makeFakeLegacyProviders(),
      sphere: makeFakeSphere(),
      network: 'testnet',
      setInitProgress,
      createProfileProviders: createProfileProviders as never,
      migrate: migrate as never,
    });

    // Helper IS called — Profile target is empty, safe to overwrite.
    expect(migrate).toHaveBeenCalledOnce();
    expect(result?.skippedDueToMarker).toBe(false);
    expect(result?.migrationCounts.tokensMigrated).toBe(5);
  });

  it('proceeds with migration if the pre-flight load() probe throws (degrades to helper-driven path)', async () => {
    const profile = makeFakeProfileProviders();
    profile.tokenStorage.load = vi.fn().mockRejectedValue(new Error('orbitdb attach pending'));
    const createProfileProviders = vi.fn().mockReturnValue(profile);
    const migrate = vi.fn().mockResolvedValue(baseMigrationResult);

    const result = await runProfileMigration({
      legacyProviders: makeFakeLegacyProviders(),
      sphere: makeFakeSphere(),
      network: 'testnet',
      setInitProgress,
      createProfileProviders: createProfileProviders as never,
      migrate: migrate as never,
    });

    // Probe failure is non-fatal — the migration helper runs and its
    // own source.load() guards take over.
    expect(migrate).toHaveBeenCalledOnce();
    expect(result?.skippedDueToMarker).toBe(false);
  });

  // ── force: true (user-initiated "Merge Legacy → UXF (overwrite)") ──
  describe('force: true (merge-overwrite path)', () => {
    it('bypasses the Profile-already-populated guard AND passes `force` through to the SDK helper', async () => {
      // Profile target IS populated (would normally short-circuit) —
      // but `force: true` means the user has explicitly opted in to
      // overwriting Profile with legacy data.
      const profile = makeFakeProfileProviders({
        loadResult: {
          success: true,
          data: {
            _meta: { version: 1, address: '', formatVersion: '2.0', updatedAt: 0 },
            _abc123: { genesis: { tokenId: 'abc123' } },
            _outbox: [{ id: 'outbox-existing' }],
          },
        },
      });
      const createProfileProviders = vi.fn().mockReturnValue(profile);
      const migrate = vi.fn().mockResolvedValue(baseMigrationResult);

      const result = await runProfileMigration({
        legacyProviders: makeFakeLegacyProviders(),
        sphere: makeFakeSphere(),
        network: 'testnet',
        setInitProgress,
        createProfileProviders: createProfileProviders as never,
        migrate: migrate as never,
        force: true,
      });

      // The Profile load() probe should NOT have been called when
      // force:true (because we don't even check — we WANT to overwrite).
      expect(profile.tokenStorage.load).not.toHaveBeenCalled();
      // Helper IS called even though target has data
      expect(migrate).toHaveBeenCalledOnce();
      // `force: true` is forwarded to the SDK helper so its own marker
      // check is bypassed.
      const args = migrate.mock.calls[0][0];
      expect(args.force).toBe(true);

      expect(result).not.toBeNull();
      expect(result!.skippedDueToMarker).toBe(false);
      expect(result!.migrationCounts.tokensMigrated).toBe(5);
    });

    it('defaults to force: false (boot-time path) when the option is omitted', async () => {
      const profile = makeFakeProfileProviders();
      const createProfileProviders = vi.fn().mockReturnValue(profile);
      const migrate = vi.fn().mockResolvedValue(baseMigrationResult);

      await runProfileMigration({
        legacyProviders: makeFakeLegacyProviders(),
        sphere: makeFakeSphere(),
        network: 'testnet',
        setInitProgress,
        createProfileProviders: createProfileProviders as never,
        migrate: migrate as never,
        // No `force` — default path
      });

      // Probe RAN (force:false means we check Profile target first).
      expect(profile.tokenStorage.load).toHaveBeenCalled();
      // And the SDK helper got `force: false`.
      const args = migrate.mock.calls[0][0];
      expect(args.force).toBe(false);
    });
  });

  it('forwards every onProgress phase as a syncing_tokens step', async () => {
    const profile = makeFakeProfileProviders();
    const createProfileProviders = vi.fn().mockReturnValue(profile);
    let onProgressCb:
      | ((p: {
          phase:
            | 'check-marker'
            | 'source-load'
            | 'oracle-probe'
            | 'target-save'
            | 'await-flush'
            | 'stamp-marker'
            | 'complete';
          processed: number;
          total: number;
        }) => void)
      | undefined;
    const migrate = vi.fn(async (opts: { onProgress?: typeof onProgressCb }) => {
      onProgressCb = opts.onProgress;
      // simulate a few phase notifications
      onProgressCb?.({ phase: 'oracle-probe', processed: 2, total: 10 });
      onProgressCb?.({ phase: 'target-save', processed: 0, total: 0 });
      onProgressCb?.({ phase: 'await-flush', processed: 0, total: 0 });
      onProgressCb?.({ phase: 'stamp-marker', processed: 0, total: 0 });
      return baseMigrationResult;
    });

    await runProfileMigration({
      legacyProviders: makeFakeLegacyProviders(),
      sphere: makeFakeSphere(),
      network: 'testnet',
      setInitProgress,
      createProfileProviders: createProfileProviders as never,
      migrate: migrate as never,
    });

    // We expect at least 5 progress emissions (initial + 4 phases)
    expect(progress.length).toBeGreaterThanOrEqual(5);
    expect(progress.every((p) => p.step === 'syncing_tokens')).toBe(true);

    const messages = progress.map((p) => p.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('2/10'),
        expect.stringContaining('Writing'),
        expect.stringContaining('Flushing'),
        expect.stringContaining('Finalizing'),
      ]),
    );
  });
});
