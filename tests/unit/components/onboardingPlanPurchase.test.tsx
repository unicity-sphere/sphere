/**
 * sphere#496: one plan screen, every entry point.
 *
 * PlanScreen is THE plan surface — onboarding renders it as a step, the app
 * root renders the same component as a dialog for Settings / quota / expiry /
 * wallet entry. These tests pin the behaviour that differs per mode and the
 * behaviour that must NOT:
 *  - paid cards are buyable, and the purchase advances the SAME screen (no
 *    bounce into a second component);
 *  - declining is a NAMED action everywhere: entering the wallet during
 *    onboarding, closing the dialog otherwise;
 *  - onboarding has no dismissal (no close X) — the dialog does;
 *  - a restored wallet already on a PAID plan gets ONE card for it, priced
 *    from the store rather than a synthetic "Free" duplicate;
 *  - a user who already holds a key adopts it inline instead of being told to
 *    find Settings later.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
// Type-only: erased at compile time, so it is safe above the hoisted mocks.
import type { PlanInfo, UtilizationInfo } from '@/services/subscriptionApi';

const PAID_PLAN = {
  planId: 7,
  name: 'basic',
  requestsPerMinute: 60,
  requestsPerDay: 5000,
  priceCents: 900,
  fiatCurrency: 'USD',
};

const PREMIUM_PLAN = {
  planId: 9,
  name: 'premium',
  requestsPerMinute: 1200,
  requestsPerDay: 500000,
  priceCents: 3000,
  fiatCurrency: 'USD',
};

const utilizationFor = (name: string, perMinute: number, perDay: number): UtilizationInfo => ({
  status: 'active',
  activeUntil: null,
  plan: { name, requestsPerMinute: perMinute, requestsPerDay: perDay },
  utilization: {
    consumedPerMinute: 0,
    maxPerMinute: perMinute,
    availablePerMinute: perMinute,
    utilizationPercentPerMinute: 0,
    consumedPerDay: 0,
    maxPerDay: perDay,
    availablePerDay: perDay,
    utilizationPercentPerDay: 0,
  },
});

const FREE_UTILIZATION = utilizationFor('free', 10, 100);
const PREMIUM_UTILIZATION = utilizationFor('premium', 1200, 500000);

// Mutable so each test can pose a different wallet/store state.
const h = vi.hoisted(() => ({
  plans: [] as PlanInfo[],
  util: null as UtilizationInfo | null,
  applySubscriptionKey: vi.fn(),
  validate: vi.fn(),
}));

// Paid plans are off on testnet — the whole feature is gated behind this flag.
vi.mock('../../../src/config/subscription', async (orig) => ({
  ...(await orig<typeof import('../../../src/config/subscription')>()),
  PAID_PLANS_ENABLED: true,
  SUBSCRIPTION_MOCK: false,
}));

vi.mock('../../../src/sdk/hooks/subscription', () => ({
  usePlans: () => ({ data: h.plans, isLoading: false, isError: false }),
  useUtilization: () => ({ data: h.util, isLoading: false, isError: false }),
  useCheckout: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// PlanScreen reads the wallet only to decide wallet-wide vs per-address; the
// key row applies the pasted key through it.
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({
    sphere: null,
    applySubscriptionKey: h.applySubscriptionKey,
    network: 'testnet',
  }),
  useSphere: () => null,
}));

vi.mock('../../../src/sdk/subscription/keyCheck', () => ({
  validatePastedKey: (key: string) => h.validate(key),
}));

import { PlanCapabilitiesScreen } from '@/components/wallet/onboarding/components/PlanCapabilitiesScreen';
import { PlanScreen } from '@/components/upgrade/PlanScreen';

function withQuery(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Onboarding mode, through the wrapper the flow actually renders. */
function renderOnboarding(props: { onContinue?: () => void; created?: boolean } = {}) {
  return render(
    withQuery(
      <PlanCapabilitiesScreen
        planName="free"
        created={props.created ?? true}
        onContinue={props.onContinue ?? (() => {})}
      />,
    ),
  );
}

/** Dialog mode, as the app root mounts it. */
function renderDialog(onClose: () => void = () => {}) {
  return render(withQuery(<PlanScreen isOpen onClose={onClose} />));
}

describe('plan screen (sphere#496)', () => {
  beforeEach(() => {
    h.plans = [PAID_PLAN];
    h.util = FREE_UTILIZATION;
    h.applySubscriptionKey = vi.fn(async () => {});
    h.validate = vi.fn(async () => ({ valid: true }));
  });

  it('buys inside the SAME screen during onboarding — no second component', () => {
    renderOnboarding();

    expect(screen.queryByText(/your plan is ready/i)).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /choose plan/i }));

    // The onboarding screen itself advanced to the checkout step.
    expect(screen.queryByText(/basic — \$9\.00 \/ 30 days/i)).not.toBeNull();
    expect(screen.queryByRole('button', { name: /continue to payment/i })).not.toBeNull();
    expect(screen.queryByText(/your plan is ready/i)).toBeNull();
  });

  it('says "Subscription restored" for a restored wallet', () => {
    renderOnboarding({ created: false });
    expect(screen.queryByText(/subscription restored/i)).not.toBeNull();
  });

  it('keeps the current free plan card CTA-less', () => {
    renderOnboarding();

    // The free card marks itself as current instead of offering a purchase —
    // the only CTA on the grid is the paid plan's.
    expect(screen.queryByText(/your current plan/i)).not.toBeNull();
    expect(screen.queryAllByRole('button', { name: /choose plan|get started/i })).toHaveLength(1);
  });

  it('names the kept plan on the onboarding footer and enters the wallet', () => {
    const onContinue = vi.fn();
    renderOnboarding({ onContinue });

    // Walking past the paid cards has to say which plan the user keeps — the
    // footer CTA is never the plan-less "Enter Wallet" while plans are on sale.
    expect(screen.queryByText(/^enter wallet$/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /continue with free plan/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('keeps one chrome, and labels the corner button for what it does', () => {
    const onContinue = vi.fn();
    const onboarding = renderOnboarding({ onContinue });

    // Same header in both modes, but onboarding has nothing to close — its
    // corner button goes into the wallet, and says so.
    expect(screen.queryByRole('button', { name: /^close$/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /enter wallet/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);

    onboarding.unmount();
    const onClose = vi.fn();
    renderDialog(onClose);
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('declines from the checkout step into the wallet during onboarding', () => {
    const onContinue = vi.fn();
    renderOnboarding({ onContinue });

    fireEvent.click(screen.getByRole('button', { name: /choose plan/i }));
    fireEvent.click(screen.getByRole('button', { name: /keep my free plan/i }));

    // Nothing to close during onboarding — declining means going in on free.
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('declines from the dialog by closing it', () => {
    const onClose = vi.fn();
    renderDialog(onClose);

    fireEvent.click(screen.getByRole('button', { name: /keep my free plan/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns to the line-up from the checkout step without losing it', () => {
    renderOnboarding();

    fireEvent.click(screen.getByRole('button', { name: /choose plan/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to plans/i }));

    expect(screen.queryByText(/your plan is ready/i)).not.toBeNull();
    expect(screen.queryByRole('button', { name: /continue to payment/i })).toBeNull();
  });

  it('gives a restored PAID wallet one correctly-priced card, not a synthetic "Free" twin', () => {
    h.util = PREMIUM_UTILIZATION;
    h.plans = [PAID_PLAN, PREMIUM_PLAN];
    renderOnboarding({ created: false });

    // One premium card (the store's, with its real price), marked current.
    expect(screen.getAllByText('premium')).toHaveLength(1);
    expect(screen.queryByText('$30.00')).not.toBeNull();
    // The synthetic card would have mispriced premium as Free (priceCents 0).
    expect(screen.queryByText('Free')).toBeNull();
    expect(screen.getAllByText(/your current plan/i)).toHaveLength(1);
    // ...and the footer names the plan actually being kept.
    expect(screen.queryByRole('button', { name: /continue with premium plan/i })).not.toBeNull();
  });

  it('adopts an existing key inline instead of sending the user to Settings', async () => {
    renderOnboarding();

    fireEvent.click(screen.getByRole('button', { name: /already have a key/i }));

    const input = screen.getByPlaceholderText('sk_…');
    // Malformed keys can't be submitted at all.
    fireEvent.change(input, { target: { value: 'nope' } });
    expect(screen.getByRole('button', { name: /^apply$/i }).hasAttribute('disabled')).toBe(true);

    const key = `sk_${'a'.repeat(32)}`;
    fireEvent.change(input, { target: { value: key } });
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }));

    await waitFor(() => expect(h.applySubscriptionKey).toHaveBeenCalledTimes(1));
    // Wallet-wide: the provisioned key it replaces was stored wallet-wide too.
    expect(h.applySubscriptionKey).toHaveBeenCalledWith(key, { walletWide: true });
    expect(screen.queryByText(/key applied/i)).not.toBeNull();
  });

  it('surfaces a rejected key inline and does not apply it', async () => {
    h.validate = vi.fn(async () => ({ valid: false, message: 'This key was revoked.' }));
    renderOnboarding();

    fireEvent.click(screen.getByRole('button', { name: /already have a key/i }));
    fireEvent.change(screen.getByPlaceholderText('sk_…'), { target: { value: `sk_${'b'.repeat(32)}` } });
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }));

    await waitFor(() => expect(screen.queryByText(/this key was revoked/i)).not.toBeNull());
    expect(h.applySubscriptionKey).not.toHaveBeenCalled();
  });
});
