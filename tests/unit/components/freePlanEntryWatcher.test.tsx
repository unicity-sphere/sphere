/**
 * sphere#496: a wallet that walked past the upgrade during onboarding meets the
 * same plan screen on the way in — but a paid wallet is never interrupted, and
 * nobody sees it twice in one app load.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { UtilizationInfo } from '@/services/subscriptionApi';

const h = vi.hoisted(() => ({
  util: null as UtilizationInfo | null,
  walletExists: true,
  isLocked: false,
  storedKey: 'sk_00000000000000000000000000000000' as string | null,
}));

vi.mock('../../../src/config/subscription', async (orig) => ({
  ...(await orig<typeof import('../../../src/config/subscription')>()),
  SUBSCRIPTION_ENABLED: true,
  PAID_PLANS_ENABLED: true,
}));

vi.mock('../../../src/sdk/hooks/subscription', () => ({
  useUtilization: () => ({ data: h.util, isLoading: false, isError: false }),
  usePlans: () => ({ data: [], isLoading: false, isError: false }),
  useCheckout: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({
    walletExists: h.walletExists,
    isLocked: h.isLocked,
    sphere: null,
    network: 'testnet',
    applySubscriptionKey: vi.fn(),
  }),
  useSphere: () => null,
}));

vi.mock('../../../src/config/storageKeys', async (orig) => ({
  ...(await orig<typeof import('../../../src/config/storageKeys')>()),
  getStoredSubscriptionKey: () => h.storedKey,
}));

import { FreePlanEntryWatcher } from '@/components/upgrade/FreePlanEntryWatcher';
import { resetFreePlanEntryOffer } from '@/components/upgrade/freePlanEntryOffer';
import { PlanCapabilitiesScreen } from '@/components/wallet/onboarding/components/PlanCapabilitiesScreen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const utilFor = (name: string): UtilizationInfo => ({
  status: 'active',
  activeUntil: null,
  plan: { name, requestsPerMinute: 10, requestsPerDay: 100 },
  utilization: {
    consumedPerMinute: 0,
    maxPerMinute: 10,
    availablePerMinute: 10,
    utilizationPercentPerMinute: 0,
    consumedPerDay: 0,
    maxPerDay: 100,
    availablePerDay: 100,
    utilizationPercentPerDay: 0,
  },
});

describe('FreePlanEntryWatcher', () => {
  beforeEach(() => {
    resetFreePlanEntryOffer();
    h.util = utilFor('free');
    h.walletExists = true;
    h.isLocked = false;
    h.storedKey = 'sk_00000000000000000000000000000000';
  });

  it('offers the plan screen once when the wallet is on the free plan', () => {
    const openUpgrade = vi.fn();
    const { unmount } = render(<FreePlanEntryWatcher openUpgrade={openUpgrade} />);

    expect(openUpgrade).toHaveBeenCalledWith('entry');
    expect(openUpgrade).toHaveBeenCalledTimes(1);

    // A remount within the same app load must not offer again.
    unmount();
    render(<FreePlanEntryWatcher openUpgrade={openUpgrade} />);
    expect(openUpgrade).toHaveBeenCalledTimes(1);
  });

  it('stays quiet after onboarding already offered the plans', () => {
    // The bug this pins: declining on the onboarding step finalizes the
    // wallet, walletExists flips, and the watcher used to reopen the SAME
    // screen as a dialog one click later.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    h.walletExists = false; // onboarding still owns the viewport
    const onboarding = render(
      <QueryClientProvider client={client}>
        <PlanCapabilitiesScreen planName="free" created onContinue={() => {}} />
      </QueryClientProvider>,
    );

    // ...user declines and the wallet finalizes.
    onboarding.unmount();
    h.walletExists = true;

    const openUpgrade = vi.fn();
    render(<FreePlanEntryWatcher openUpgrade={openUpgrade} />);
    expect(openUpgrade).not.toHaveBeenCalled();
  });

  it('lets a paid wallet straight in', () => {
    h.util = utilFor('premium');
    const openUpgrade = vi.fn();
    render(<FreePlanEntryWatcher openUpgrade={openUpgrade} />);
    expect(openUpgrade).not.toHaveBeenCalled();
  });

  it('stays quiet until the wallet is really open', () => {
    const openUpgrade = vi.fn();

    h.walletExists = false; // onboarding still owns the viewport
    const first = render(<FreePlanEntryWatcher openUpgrade={openUpgrade} />);
    expect(openUpgrade).not.toHaveBeenCalled();
    first.unmount();

    h.walletExists = true;
    h.isLocked = true; // lock screen owns it
    const second = render(<FreePlanEntryWatcher openUpgrade={openUpgrade} />);
    expect(openUpgrade).not.toHaveBeenCalled();
    second.unmount();

    h.isLocked = false;
    h.storedKey = null; // no subscription key yet → nothing to upgrade
    render(<FreePlanEntryWatcher openUpgrade={openUpgrade} />);
    expect(openUpgrade).not.toHaveBeenCalled();
  });
});
