/**
 * UxfBanner button-state matrix tests.
 *
 * The banner conditionally renders Migrate / Switch / Merge buttons
 * based on `(walletMode, hasLegacyData, hasProfileData)`. These tests
 * lock that decision table down so a refactor can't silently flip a
 * conditional and ship a busted UI.
 *
 * Decision table:
 *   | mode    | legacy | profile | shown                                         |
 *   |---------|--------|---------|-----------------------------------------------|
 *   | legacy  |  any   | false   | Migrate to UXF Profile                        |
 *   | legacy  |  any   | true    | Switch to UXF Profile  +  Merge Legacy → UXF  |
 *   | profile | true   |  any    | Switch back to Legacy  +  Merge Legacy → UXF  |
 *   | profile | false  |  any    | (status only — no buttons)                    |
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { UxfBanner } from '../../../src/components/uxf/UxfBanner';
import { SphereContext, type SphereContextValue, type WalletMode } from '../../../src/sdk/SphereContext';

// ── Helpers ───────────────────────────────────────────────────────────

function makeCtx(
  overrides: Partial<SphereContextValue> & {
    walletMode: WalletMode;
    hasLegacyData: boolean | null;
    hasProfileData: boolean | null;
  },
): SphereContextValue {
  return {
    sphere: null,
    providers: null,
    isLoading: false,
    isInitialized: false,
    walletExists: false,
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
    isSwitchingMode: false,
    switchWalletMode: vi.fn(),
    runLegacyToProfileMigration: vi.fn(),
    refreshDataProbes: vi.fn(),
    ...overrides,
  } as unknown as SphereContextValue;
}

function renderBanner(ctx: SphereContextValue) {
  return render(
    <SphereContext.Provider value={ctx}>
      <UxfBanner />
    </SphereContext.Provider>,
  );
}

// Helpers that match button labels — they include the loading/progress
// suffix during pending operations, so we use partial regex matchers.
const labelMigrate = /Migrate to UXF Profile/;
const labelSwitchToProfile = /Switch to UXF Profile/;
const labelSwitchToLegacy = /Switch back to Legacy/;
const labelMerge = /Merge Legacy → UXF/;
const labelRefresh = /Re-check stores/;

beforeEach(() => {
  // Reset jsdom between tests
});

afterEach(() => {
  cleanup();
});

// ── Decision table ────────────────────────────────────────────────────

describe('UxfBanner — button matrix', () => {
  it('legacy mode + no profile data → only Migrate button', () => {
    renderBanner(
      makeCtx({
        walletMode: 'legacy',
        hasLegacyData: true,
        hasProfileData: false,
      }),
    );
    expect(screen.getByRole('button', { name: labelMigrate })).toBeDefined();
    expect(screen.queryByRole('button', { name: labelSwitchToProfile })).toBeNull();
    expect(screen.queryByRole('button', { name: labelSwitchToLegacy })).toBeNull();
    expect(screen.queryByRole('button', { name: labelMerge })).toBeNull();
  });

  it('legacy mode + profile data exists → Switch to Profile + Merge', () => {
    renderBanner(
      makeCtx({
        walletMode: 'legacy',
        hasLegacyData: true,
        hasProfileData: true,
      }),
    );
    expect(screen.getByRole('button', { name: labelSwitchToProfile })).toBeDefined();
    expect(screen.getByRole('button', { name: labelMerge })).toBeDefined();
    expect(screen.queryByRole('button', { name: labelMigrate })).toBeNull();
    expect(screen.queryByRole('button', { name: labelSwitchToLegacy })).toBeNull();
  });

  it('profile mode + legacy data exists → Switch to Legacy + Merge', () => {
    renderBanner(
      makeCtx({
        walletMode: 'profile',
        hasLegacyData: true,
        hasProfileData: true,
      }),
    );
    expect(screen.getByRole('button', { name: labelSwitchToLegacy })).toBeDefined();
    expect(screen.getByRole('button', { name: labelMerge })).toBeDefined();
    expect(screen.queryByRole('button', { name: labelMigrate })).toBeNull();
    expect(screen.queryByRole('button', { name: labelSwitchToProfile })).toBeNull();
  });

  it('profile mode + no legacy data → status only (no action buttons except refresh + dismiss)', () => {
    renderBanner(
      makeCtx({
        walletMode: 'profile',
        hasLegacyData: false,
        hasProfileData: true,
      }),
    );
    expect(screen.queryByRole('button', { name: labelMigrate })).toBeNull();
    expect(screen.queryByRole('button', { name: labelSwitchToLegacy })).toBeNull();
    expect(screen.queryByRole('button', { name: labelSwitchToProfile })).toBeNull();
    expect(screen.queryByRole('button', { name: labelMerge })).toBeNull();
    // Refresh + dismiss are always present
    expect(screen.getByRole('button', { name: labelRefresh })).toBeDefined();
    expect(screen.getByRole('button', { name: /Dismiss UXF banner/ })).toBeDefined();
  });

  it('shows a "checking stores…" hint while probes are pending', () => {
    renderBanner(
      makeCtx({
        walletMode: 'legacy',
        hasLegacyData: null,
        hasProfileData: null,
      }),
    );
    expect(screen.getByText(/checking stores/i)).toBeDefined();
    // No actionable buttons yet — we don't know which to show.
    expect(screen.queryByRole('button', { name: labelMigrate })).toBeNull();
    expect(screen.queryByRole('button', { name: labelSwitchToProfile })).toBeNull();
  });

  it('shows the wallet-mode label in the status text', () => {
    const { rerender } = renderBanner(
      makeCtx({
        walletMode: 'legacy',
        hasLegacyData: true,
        hasProfileData: false,
      }),
    );
    expect(screen.getByText(/Legacy/i)).toBeDefined();

    rerender(
      <SphereContext.Provider
        value={makeCtx({
          walletMode: 'profile',
          hasLegacyData: false,
          hasProfileData: true,
        })}
      >
        <UxfBanner />
      </SphereContext.Provider>,
    );
    expect(screen.getByText(/UXF Profile/i)).toBeDefined();
  });

  it('all action buttons are disabled while `isSwitchingMode` is true', () => {
    renderBanner(
      makeCtx({
        walletMode: 'legacy',
        hasLegacyData: true,
        hasProfileData: true,
        isSwitchingMode: true,
      }),
    );
    const switchBtn = screen.getByRole('button', { name: labelSwitchToProfile });
    const mergeBtn = screen.getByRole('button', { name: labelMerge });
    expect((switchBtn as HTMLButtonElement).disabled).toBe(true);
    expect((mergeBtn as HTMLButtonElement).disabled).toBe(true);
  });
});

// ── Migrate action ────────────────────────────────────────────────────

describe('UxfBanner — actions', () => {
  it('clicking Migrate invokes runLegacyToProfileMigration WITHOUT force', async () => {
    const runMigration = vi.fn().mockResolvedValue(undefined);
    renderBanner(
      makeCtx({
        walletMode: 'legacy',
        hasLegacyData: true,
        hasProfileData: false,
        runLegacyToProfileMigration: runMigration,
      }),
    );
    const btn = screen.getByRole('button', { name: labelMigrate });
    btn.click();
    // The action is fire-and-forget; assert it was kicked off.
    expect(runMigration).toHaveBeenCalledWith({ force: false });
  });

  it('clicking Switch to Profile invokes switchWalletMode("profile")', () => {
    const switchMode = vi.fn().mockResolvedValue(undefined);
    renderBanner(
      makeCtx({
        walletMode: 'legacy',
        hasLegacyData: true,
        hasProfileData: true,
        switchWalletMode: switchMode,
      }),
    );
    screen.getByRole('button', { name: labelSwitchToProfile }).click();
    expect(switchMode).toHaveBeenCalledWith('profile');
  });

  it('clicking Switch to Legacy invokes switchWalletMode("legacy")', () => {
    const switchMode = vi.fn().mockResolvedValue(undefined);
    renderBanner(
      makeCtx({
        walletMode: 'profile',
        hasLegacyData: true,
        hasProfileData: true,
        switchWalletMode: switchMode,
      }),
    );
    screen.getByRole('button', { name: labelSwitchToLegacy }).click();
    expect(switchMode).toHaveBeenCalledWith('legacy');
  });

  it('clicking Merge opens the confirmation modal BEFORE running the migration', () => {
    const runMigration = vi.fn().mockResolvedValue(undefined);
    renderBanner(
      makeCtx({
        walletMode: 'profile',
        hasLegacyData: true,
        hasProfileData: true,
        runLegacyToProfileMigration: runMigration,
      }),
    );
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: labelMerge }));
    });
    // Migration MUST NOT have been called yet — modal is up.
    expect(runMigration).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeDefined();
    // Modal copy is the canonical warning text — assert verbatim.
    expect(screen.getByText(/Merge Legacy → UXF \(overwrite\)\?/)).toBeDefined();
    expect(
      screen.getByText(
        /This will OVERWRITE your UXF Profile token data with your Legacy data\. Tokens currently in Profile that aren't in Legacy will be lost\. Continue\?/,
      ),
    ).toBeDefined();
  });

  it('confirming the merge modal invokes runLegacyToProfileMigration WITH force: true', () => {
    const runMigration = vi.fn().mockResolvedValue(undefined);
    renderBanner(
      makeCtx({
        walletMode: 'profile',
        hasLegacyData: true,
        hasProfileData: true,
        runLegacyToProfileMigration: runMigration,
      }),
    );
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: labelMerge }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Yes, overwrite Profile/ }));
    });
    expect(runMigration).toHaveBeenCalledWith({ force: true });
  });

  it('cancelling the merge modal does NOT trigger migration', () => {
    const runMigration = vi.fn().mockResolvedValue(undefined);
    renderBanner(
      makeCtx({
        walletMode: 'profile',
        hasLegacyData: true,
        hasProfileData: true,
        runLegacyToProfileMigration: runMigration,
      }),
    );
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: labelMerge }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
    });
    expect(runMigration).not.toHaveBeenCalled();
  });

  it('clicking Refresh invokes refreshDataProbes', () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    renderBanner(
      makeCtx({
        walletMode: 'legacy',
        hasLegacyData: true,
        hasProfileData: false,
        refreshDataProbes: refresh,
      }),
    );
    screen.getByRole('button', { name: labelRefresh }).click();
    expect(refresh).toHaveBeenCalled();
  });
});
