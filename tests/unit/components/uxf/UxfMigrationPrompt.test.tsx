/**
 * UxfMigrationPrompt visibility matrix — regression cover for issue #331.
 *
 * The modal must render only when there is REAL legacy data to migrate.
 * The previous implementation used a shallow `indexedDB.databases()`
 * name probe that fired on every reload for fresh Profile-only wallets
 * because both stores share the `sphere-storage` IndexedDB.
 *
 * Decision table (mirrors the issue body):
 *
 *   | walletExists | hasLegacyData | hasProfileData | variant      |
 *   |--------------|---------------|----------------|--------------|
 *   | false        | any           | any            | none         |
 *   | true         | null          | null           | none (defer) |
 *   | true         | false         | false          | none         |
 *   | true         | false         | true           | NONE (#331)  |
 *   | true         | true          | false          | legacy-only  |
 *   | true         | true          | true           | both         |
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { UxfMigrationPrompt } from '../../../../src/components/uxf/UxfMigrationPrompt';
import {
  SphereContext,
  type SphereContextValue,
} from '../../../../src/sdk/SphereContext';
import {
  UXF_MIGRATION_SKIP_KEY,
  UXF_MIGRATION_CHOICE_KEY,
} from '../../../../src/config/uxf';

function makeCtx(
  overrides: Partial<SphereContextValue>,
): SphereContextValue {
  return {
    sphere: null,
    providers: null,
    isLoading: false,
    isInitialized: false,
    walletExists: true,
    error: null,
    isDiscoveringAddresses: false,
    initProgress: null,
    resolveNametag: vi.fn(),
    createWallet: vi.fn(),
    importWallet: vi.fn(),
    importFromFile: vi.fn(),
    finalizeWallet: vi.fn(),
    deleteWallet: vi.fn(),
    reinitialize: vi.fn(),
    ipfsEnabled: true,
    toggleIpfs: vi.fn(),
    walletMode: 'profile',
    hasLegacyData: null,
    hasProfileData: null,
    isSwitchingMode: false,
    switchWalletMode: vi.fn(),
    runLegacyToProfileMigration: vi.fn(),
    refreshDataProbes: vi.fn(),
    ...overrides,
  } as unknown as SphereContextValue;
}

function renderPrompt(ctx: SphereContextValue) {
  return render(
    <SphereContext.Provider value={ctx}>
      <UxfMigrationPrompt />
    </SphereContext.Provider>,
  );
}

const titleBoth = /Legacy & UXF profiles detected/;
const titleLegacyOnly = /Legacy wallet detected/;

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
});

describe('UxfMigrationPrompt — visibility matrix', () => {
  it('hides during onboarding (walletExists=false)', () => {
    renderPrompt(
      makeCtx({
        walletExists: false,
        hasLegacyData: true,
        hasProfileData: true,
      }),
    );
    expect(screen.queryByText(titleBoth)).toBeNull();
    expect(screen.queryByText(titleLegacyOnly)).toBeNull();
  });

  it('hides while probes are pending (defer rather than flash)', () => {
    renderPrompt(
      makeCtx({
        walletExists: true,
        hasLegacyData: null,
        hasProfileData: null,
      }),
    );
    expect(screen.queryByText(titleBoth)).toBeNull();
    expect(screen.queryByText(titleLegacyOnly)).toBeNull();
  });

  it('hides when both stores are empty', () => {
    renderPrompt(
      makeCtx({
        walletExists: true,
        hasLegacyData: false,
        hasProfileData: false,
      }),
    );
    expect(screen.queryByText(titleBoth)).toBeNull();
    expect(screen.queryByText(titleLegacyOnly)).toBeNull();
  });

  // ─── Issue #331 regression case ────────────────────────────────────
  it('hides when ONLY the Profile store has data (fresh Profile-only wallet)', () => {
    renderPrompt(
      makeCtx({
        walletExists: true,
        hasLegacyData: false,
        hasProfileData: true,
      }),
    );
    // The bug fired the "both" variant here on every reload — there is
    // no legacy data to migrate, so the modal must stay hidden.
    expect(screen.queryByText(titleBoth)).toBeNull();
    expect(screen.queryByText(titleLegacyOnly)).toBeNull();
  });

  it('shows the legacy-only variant when only the legacy store has data', () => {
    renderPrompt(
      makeCtx({
        walletExists: true,
        hasLegacyData: true,
        hasProfileData: false,
      }),
    );
    expect(screen.getByText(titleLegacyOnly)).toBeDefined();
    expect(screen.queryByText(titleBoth)).toBeNull();
  });

  it('shows the both variant when both stores carry data', () => {
    renderPrompt(
      makeCtx({
        walletExists: true,
        hasLegacyData: true,
        hasProfileData: true,
      }),
    );
    expect(screen.getByText(titleBoth)).toBeDefined();
    expect(screen.queryByText(titleLegacyOnly)).toBeNull();
  });
});

describe('UxfMigrationPrompt — skip/persisted gates', () => {
  it('stays hidden when the session skip key is set', () => {
    sessionStorage.setItem(UXF_MIGRATION_SKIP_KEY, '1');
    renderPrompt(
      makeCtx({
        walletExists: true,
        hasLegacyData: true,
        hasProfileData: true,
      }),
    );
    expect(screen.queryByText(titleBoth)).toBeNull();
    expect(screen.queryByText(titleLegacyOnly)).toBeNull();
  });

  it('stays hidden when a persisted choice is recorded', () => {
    localStorage.setItem(
      UXF_MIGRATION_CHOICE_KEY,
      JSON.stringify({ choice: 'merge', eraseLegacy: false }),
    );
    renderPrompt(
      makeCtx({
        walletExists: true,
        hasLegacyData: true,
        hasProfileData: false,
      }),
    );
    expect(screen.queryByText(titleBoth)).toBeNull();
    expect(screen.queryByText(titleLegacyOnly)).toBeNull();
  });
});
