import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runProfileMigration } from '../../../src/sdk/uxfProfileMigration';
import type { Sphere, InitProgress } from '@unicitylabs/sphere-sdk';
import type { BrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';

// ──────────────────────────────────────────────────────────────────────────
// Test fixtures
//
// Post sphere-sdk #294 surface: the consumer no longer constructs
// `FullIdentity` or calls `setIdentity` itself. The SDK helper
// (`migrateLegacyToProfileBrowser`) builds Profile providers internally
// via the Sphere-bound factory and returns them in
// `result.profileProviders`. These tests stub the helper directly.
//
// The pre-flight Profile-already-populated guard still exists (the SDK
// helper's `target.save()` is a full overwrite). The guard now uses
// `createBrowserProfileProvidersFromSphere` — we cannot easily stub
// that factory here (it's imported directly, not injected), so we
// hand-construct the probe shape by intercepting calls indirectly.
//
// Instead of stubbing the factory, we stub `migrate` to inspect what
// the caller passes through. The guard probe path runs unmocked
// against a fake Sphere whose factory call we don't see, BUT — the
// guard catches a thrown probe via try/catch and falls through to
// the migration call. We exploit this: passing `sphere: null-shaped`
// causes the SDK factory call to throw, the guard logs + falls
// through, and we assert on what the migration helper receives.
//
// For tests that need the guard to RUN successfully, we stub
// `migrate` so it never gets called (the probe never reaches the
// migration step) — that path is intentionally probed via integration
// or e2e tests with a real Sphere.
// ──────────────────────────────────────────────────────────────────────────

const FAKE_IDENTITY = {
  chainPubkey: '02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  l1Address: 'alpha1example',
  directAddress: 'DIRECT://example',
} as const;

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

function makeFakeSphere(identity: typeof FAKE_IDENTITY | null = FAKE_IDENTITY): Sphere {
  return { identity } as unknown as Sphere;
}

/**
 * Fake migration result matching `MigrateLegacyToProfileFromSphereResult`
 * — extends `TokenStorageMigrationResult` and carries
 * `profileProviders`.
 */
function makeFakeMigrationResult(overrides?: {
  success?: boolean;
  skippedDueToMarker?: boolean;
  tokensMigrated?: number;
  archivedMigrated?: number;
  errors?: ReadonlyArray<{ phase: string; error: string }>;
}) {
  const fakeStorage = {
    setIdentity: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  };
  const fakeTokenStorage = {
    setIdentity: vi.fn(),
    initialize: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
    load: vi.fn(),
  };
  return {
    success: overrides?.success ?? true,
    addressId: 'example',
    direction: 'legacy-to-profile' as const,
    skippedDueToMarker: overrides?.skippedDueToMarker ?? false,
    dryRun: false,
    tokensMigrated: overrides?.tokensMigrated ?? 5,
    archivedMigrated: overrides?.archivedMigrated ?? 1,
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
    errors: overrides?.errors ?? [],
    profileProviders: {
      storage: fakeStorage,
      tokenStorage: fakeTokenStorage,
    },
  };
}

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

  it('forwards sphere/legacy/network/oracle to the SDK helper and returns provider refs from result.profileProviders', async () => {
    const migrationResult = makeFakeMigrationResult({
      success: true,
      skippedDueToMarker: false,
      tokensMigrated: 5,
    });
    const migrate = vi.fn().mockResolvedValue(migrationResult);

    const legacy = makeFakeLegacyProviders();
    const sphere = makeFakeSphere();

    const result = await runProfileMigration({
      legacyProviders: legacy,
      sphere,
      network: 'testnet',
      setInitProgress,
      migrate: migrate as never,
      // force:true so the pre-flight probe is SKIPPED — that path
      // hits the real `createBrowserProfileProvidersFromSphere`
      // factory which we can't easily stub in a unit test.
      force: true,
    });

    expect(migrate).toHaveBeenCalledOnce();
    const args = migrate.mock.calls[0][0];
    // New SDK helper surface — no synthesized FullIdentity, no
    // `identity` field, no `markerStorage` (the helper picks the
    // Profile storage internally).
    expect(args.sphere).toBe(sphere);
    expect(args.legacy).toBe(legacy.tokenStorage);
    expect(args.network).toBe('testnet');
    expect(args.oracle).toBe(legacy.oracle);
    expect(args.force).toBe(true);
    // Critical invariant: no privateKey field of any shape is
    // passed through this consumer.
    expect(args).not.toHaveProperty('identity');
    expect(JSON.stringify(args)).not.toContain('privateKey');

    // Result re-exports the providers the SDK constructed.
    expect(result).not.toBeNull();
    expect(result!.profileStorage).toBe(migrationResult.profileProviders.storage);
    expect(result!.profileTokenStorage).toBe(migrationResult.profileProviders.tokenStorage);
    expect(result!.migrationCounts.tokensMigrated).toBe(5);
    expect(result!.migrationCounts.archivedMigrated).toBe(1);
    expect(result!.skippedDueToMarker).toBe(false);

    // Progress was emitted with the migration message.
    expect(progress.some((p) => p.step === 'syncing_tokens')).toBe(true);
  });

  it('is idempotent — short-circuits via marker (skippedDueToMarker=true)', async () => {
    const migrationResult = makeFakeMigrationResult({
      success: true,
      skippedDueToMarker: true,
      tokensMigrated: 0,
      archivedMigrated: 0,
    });
    const migrate = vi.fn().mockResolvedValue(migrationResult);

    const result = await runProfileMigration({
      legacyProviders: makeFakeLegacyProviders(),
      sphere: makeFakeSphere(),
      network: 'testnet',
      setInitProgress,
      migrate: migrate as never,
      force: true,
    });

    expect(result).not.toBeNull();
    expect(result!.skippedDueToMarker).toBe(true);
    expect(result!.migrationCounts.tokensMigrated).toBe(0);
    // Caller still gets the Profile providers back so it can swap.
    expect(result!.profileStorage).toBe(migrationResult.profileProviders.storage);
    expect(result!.profileTokenStorage).toBe(migrationResult.profileProviders.tokenStorage);
  });

  it('returns null and cleans up Profile providers when migration fails', async () => {
    const migrationResult = makeFakeMigrationResult({
      success: false,
      tokensMigrated: 0,
      errors: [{ phase: 'target-save', error: 'disk full' }],
    });
    const migrate = vi.fn().mockResolvedValue(migrationResult);

    const result = await runProfileMigration({
      legacyProviders: makeFakeLegacyProviders(),
      sphere: makeFakeSphere(),
      network: 'testnet',
      setInitProgress,
      migrate: migrate as never,
      force: true,
    });

    expect(result).toBeNull();
    // Best-effort disconnect on the half-init Profile providers so we
    // don't leak handles.
    expect(migrationResult.profileProviders.tokenStorage.disconnect).toHaveBeenCalledOnce();
    expect(migrationResult.profileProviders.storage.disconnect).toHaveBeenCalledOnce();
  });

  it('returns null when sphere identity is missing (defensive)', async () => {
    const migrate = vi.fn();

    const result = await runProfileMigration({
      legacyProviders: makeFakeLegacyProviders(),
      sphere: makeFakeSphere(null),
      network: 'testnet',
      setInitProgress,
      migrate: migrate as never,
    });

    expect(result).toBeNull();
    expect(migrate).not.toHaveBeenCalled();
  });

  it('returns null when identity has no directAddress', async () => {
    const migrate = vi.fn();

    const result = await runProfileMigration({
      legacyProviders: makeFakeLegacyProviders(),
      sphere: makeFakeSphere({
        ...FAKE_IDENTITY,
        directAddress: undefined as unknown as string,
      }),
      network: 'testnet',
      setInitProgress,
      migrate: migrate as never,
    });

    expect(result).toBeNull();
    expect(migrate).not.toHaveBeenCalled();
  });

  it('returns null when the migration helper throws unexpectedly', async () => {
    const migrate = vi.fn().mockRejectedValue(new Error('aggregator unreachable'));

    const result = await runProfileMigration({
      legacyProviders: makeFakeLegacyProviders(),
      sphere: makeFakeSphere(),
      network: 'testnet',
      setInitProgress,
      migrate: migrate as never,
      force: true,
    });

    expect(result).toBeNull();
  });

  it('force:true skips the pre-flight Profile-already-populated probe', async () => {
    // With force:true we never spin up the probe Sphere-bound factory.
    // Migrate is called immediately.
    const migrate = vi.fn().mockResolvedValue(makeFakeMigrationResult());

    await runProfileMigration({
      legacyProviders: makeFakeLegacyProviders(),
      sphere: makeFakeSphere(),
      network: 'testnet',
      setInitProgress,
      migrate: migrate as never,
      force: true,
    });

    expect(migrate).toHaveBeenCalledOnce();
    const args = migrate.mock.calls[0][0];
    expect(args.force).toBe(true);
  });

  it('boot-time path (force omitted) passes force:false through to the SDK helper', async () => {
    // Pre-flight probe throws (factory call against the fake Sphere
    // hits the real SDK code path and throws somewhere — we catch it
    // and fall through). Then the migration helper is called.
    const migrate = vi.fn().mockResolvedValue(makeFakeMigrationResult());

    await runProfileMigration({
      legacyProviders: makeFakeLegacyProviders(),
      sphere: makeFakeSphere(),
      network: 'testnet',
      setInitProgress,
      migrate: migrate as never,
      // No `force` — boot-time path.
    });

    expect(migrate).toHaveBeenCalledOnce();
    const args = migrate.mock.calls[0][0];
    expect(args.force).toBe(false);
  });

  it('forwards every onProgress phase as a syncing_tokens step', async () => {
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
      return makeFakeMigrationResult();
    });

    await runProfileMigration({
      legacyProviders: makeFakeLegacyProviders(),
      sphere: makeFakeSphere(),
      network: 'testnet',
      setInitProgress,
      migrate: migrate as never,
      force: true,
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

  // ── Architectural invariant assertions (Issue #292) ───────────────────
  describe('architectural invariant: no private key leaves the SDK', () => {
    it('the migrate call payload contains no `identity` field and no `privateKey` substring', async () => {
      const migrate = vi.fn().mockResolvedValue(makeFakeMigrationResult());

      await runProfileMigration({
        legacyProviders: makeFakeLegacyProviders(),
        sphere: makeFakeSphere(),
        network: 'testnet',
        setInitProgress,
        migrate: migrate as never,
        force: true,
      });

      const args = migrate.mock.calls[0][0];
      // No FullIdentity ever constructed here.
      expect(args).not.toHaveProperty('identity');
      // Stringify-grep — catches accidental nested `privateKey: ''`
      // even if a field is added later.
      expect(JSON.stringify(args)).not.toContain('privateKey');
    });
  });
});
