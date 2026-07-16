import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SphereError } from '@unicitylabs/sphere-sdk';
import type { UtilizationInfo } from '../../../src/services/subscriptionApi';
import { useTransfer } from '../../../src/sdk/hooks/payments/useTransfer';
import { SubscriptionNotReadyError, type SubscriptionKeyStatus } from '../../../src/sdk/subscription/keyStatus';

// The hook reads the wallet + subscription-key readiness from useSphereContext —
// swap in a fake with just payments.send. The SDK throws a ProofUnconfirmedError
// (extends SphereError, code CERTIFICATION_UNCONFIRMED) for a possibly-certified
// send (#631/#633). `subscriptionKeyStatus` defaults to 'ready' so the readiness
// gate is transparent to the quota/send tests; the gate tests flip it.
let fakeSphere: { payments: { send: ReturnType<typeof vi.fn> } } | null = null;
let subscriptionKeyStatus: SubscriptionKeyStatus = 'ready';
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere, subscriptionKeyStatus }),
}));

// Task 3: proactive quota gate. Mock checkSendQuota (keep the real
// QuotaBlockedError class so `instanceof` in useTransfer still works) and
// make SUBSCRIPTION_ENABLED independently toggleable per test.
vi.mock('../../../src/sdk/quotaGate', async (orig) => ({
  ...(await orig<typeof import('../../../src/sdk/quotaGate')>()),
  checkSendQuota: vi.fn(),
}));
vi.mock('../../../src/config/subscription', async (orig) => ({
  ...(await orig<typeof import('../../../src/config/subscription')>()),
  SUBSCRIPTION_ENABLED: true,
}));

// Task 4: reactive 429/401 annotation. Mock the upgrade barrel (simpler than
// wrapping renderHook in a real UpgradeProvider) and the disambiguation
// dependencies (getUtilization, getStoredSubscriptionKey, showToast).
vi.mock('../../../src/components/upgrade', () => ({
  useUpgrade: vi.fn(),
}));
vi.mock('../../../src/services/subscriptionApi', async (orig) => ({
  ...(await orig<typeof import('../../../src/services/subscriptionApi')>()),
  getUtilization: vi.fn(),
}));
vi.mock('../../../src/config/storageKeys', async (orig) => ({
  ...(await orig<typeof import('../../../src/config/storageKeys')>()),
  getStoredSubscriptionKey: vi.fn(),
}));
vi.mock('../../../src/components/ui/toast-utils', () => ({
  showToast: vi.fn(),
}));

import { checkSendQuota, QuotaBlockedError } from '../../../src/sdk/quotaGate';
import * as subscriptionConfig from '../../../src/config/subscription';
import { useUpgrade } from '../../../src/components/upgrade';
import { getUtilization } from '../../../src/services/subscriptionApi';
import { getStoredSubscriptionKey } from '../../../src/config/storageKeys';
import { showToast } from '../../../src/components/ui/toast-utils';

// Fabricate the duck-typed transport error shape that JsonRpcNetworkError
// (state-transition-sdk, never exported from sphere-sdk) satisfies today —
// mirrors tests/unit/sdk/gatewayErrors.test.ts.
function jsonRpcNetworkError(status: number, name = 'JsonRpcNetworkError') {
  return { name, status, message: 'transport error' };
}

function utilization(overrides: { status?: UtilizationInfo['status']; availablePerMinute?: number } = {}): UtilizationInfo {
  return {
    status: overrides.status ?? 'active',
    plan: { name: 'free', requestsPerMinute: 60, requestsPerDay: 1000 },
    activeUntil: null,
    utilization: {
      consumedPerMinute: 0,
      maxPerMinute: 60,
      availablePerMinute: overrides.availablePerMinute ?? 60,
      utilizationPercentPerMinute: 0,
      consumedPerDay: 0,
      maxPerDay: 1000,
      availablePerDay: 1000,
      utilizationPercentPerDay: 0,
    },
  };
}

function Wrapper({ children }: { children: ReactNode }) {
  // One stable client per wrapper instance — a fresh QueryClient on each render
  // would reset mutation state mid-test and flake.
  const [qc] = useState(
    () => new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } }),
  );
  return createElement(QueryClientProvider, { client: qc }, children);
}

const PARAMS = { coinId: 'c', amount: '100', recipient: '@bob' };

let openUpgradeMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fakeSphere = null;
  subscriptionKeyStatus = 'ready';
  vi.mocked(checkSendQuota).mockReset().mockResolvedValue({ verdict: 'allow' });
  (subscriptionConfig as { SUBSCRIPTION_ENABLED: boolean }).SUBSCRIPTION_ENABLED = true;

  openUpgradeMock = vi.fn();
  vi.mocked(useUpgrade).mockReset().mockReturnValue({ openUpgrade: openUpgradeMock });
  vi.mocked(getUtilization).mockReset();
  vi.mocked(getStoredSubscriptionKey).mockReset().mockReturnValue('sk_test');
  vi.mocked(showToast).mockReset();
});

describe('useTransfer — #631/#633 possibly-certified send', () => {
  it('converts a CERTIFICATION_UNCONFIRMED reject into a delivery-pending SUCCESS (no re-send → no double-pay)', async () => {
    const send = vi.fn().mockRejectedValue(
      new SphereError('certification unconfirmed — the source spend may be on-chain', 'CERTIFICATION_UNCONFIRMED'),
    );
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: { deliveryPending?: boolean } | undefined;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });

    // Resolved (NOT rejected) as a pending success: the send screen shows "Sent —
    // pending" and never returns to a re-sendable confirm step. send() ran exactly once.
    expect(res?.deliveryPending).toBe(true);
    expect(result.current.error).toBeNull();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('converts a SEND_SYNC_PENDING reject into a pending SUCCESS (post-commit mirror-sync — no re-send) (#665)', async () => {
    const send = vi.fn().mockRejectedValue(
      new SphereError('Your payment was sent. Your wallet is syncing.', 'SEND_SYNC_PENDING'),
    );
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: { deliveryPending?: boolean } | undefined;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });

    // Resolved (NOT rejected) as pending success — the money is on-chain, resume converges.
    expect(res?.deliveryPending).toBe(true);
    expect(result.current.error).toBeNull();
    expect(send).toHaveBeenCalledTimes(1);
  });

  // #440: the E.4 split-checkpoint keep-open codes are re-thrown RAW by the SDK
  // (they are NOT re-tagged SEND_SYNC_PENDING). Each is possibly/definitely
  // committed on-chain with the intent kept OPEN, so they MUST resolve as a
  // pending success — never a re-sendable failure (a re-send would double-pay).
  it.each([
    'CHECKPOINT_PERSIST_FAILED',
    'SPLIT_CHECKPOINT_LOST',
    'CHECKPOINT_TRUSTBASE_MISMATCH',
  ] as const)(
    'converts a %s reject into a delivery-pending SUCCESS (keep-open E.4 — no re-send → no double-pay) (#440)',
    async (code) => {
      const send = vi.fn().mockRejectedValue(new SphereError('split checkpoint stuck', code));
      fakeSphere = { payments: { send } };
      const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

      let res: { deliveryPending?: boolean } | undefined;
      await act(async () => {
        res = await result.current.transfer(PARAMS);
      });

      // Resolved (NOT rejected) as pending — the split burn is on-chain, resume completes it.
      expect(res?.deliveryPending).toBe(true);
      expect(result.current.error).toBeNull();
      expect(send).toHaveBeenCalledTimes(1);
    },
  );

  it('converts a SEND_PARTIALLY_COMPLETED reject into a delivery-pending SUCCESS — a partial send is never re-sendable (no double-pay of the delivered legs) (#681)', async () => {
    // sdk #681: a multi-leg send certified + delivered >=1 leg, then could not cover
    // the remainder → PartialSendConflictError (code SEND_PARTIALLY_COMPLETED). Money
    // has irreversibly left the wallet; a full re-send would double-pay the delivered
    // legs, so useTransfer MUST present it as pending, never a re-sendable failure.
    const send = vi.fn().mockRejectedValue(new SphereError('part sent', 'SEND_PARTIALLY_COMPLETED'));
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: { deliveryPending?: boolean } | undefined;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });

    expect(res?.deliveryPending).toBe(true);
    expect(result.current.error).toBeNull();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('still rejects a genuine failure so the user is told (and can retry safely)', async () => {
    const send = vi.fn().mockRejectedValue(new SphereError('not enough balance', 'INSUFFICIENT_BALANCE'));
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    await expect(
      act(async () => {
        await result.current.transfer(PARAMS);
      }),
    ).rejects.toThrow(/not enough balance/);
  });

  it('passes a normal success result through unchanged', async () => {
    const ok = { id: 't1', status: 'completed', tokens: [], tokenTransfers: [] };
    const send = vi.fn().mockResolvedValue(ok);
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: unknown;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });
    expect(res).toEqual(ok);
  });
});

describe('useTransfer — subscription-key readiness gate (keyless-send window)', () => {
  it('refuses the send while the key is still provisioning (never reaches quota/send → no keyless 401)', async () => {
    subscriptionKeyStatus = 'provisioning';
    const send = vi.fn();
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    await expect(
      act(async () => {
        await result.current.transfer(PARAMS);
      }),
    ).rejects.toBeInstanceOf(SubscriptionNotReadyError);

    // The send never left, and the gate fired BEFORE the quota check.
    expect(send).not.toHaveBeenCalled();
    expect(checkSendQuota).not.toHaveBeenCalled();
  });

  it('refuses with a reload hint when provisioning has failed', async () => {
    subscriptionKeyStatus = 'failed';
    const send = vi.fn();
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let caught: unknown;
    await act(async () => {
      caught = await result.current.transfer(PARAMS).catch((e) => e);
    });
    expect(caught).toBeInstanceOf(SubscriptionNotReadyError);
    expect((caught as SubscriptionNotReadyError).status).toBe('failed');
    expect(send).not.toHaveBeenCalled();
  });

  it('allows the send once the key is ready', async () => {
    subscriptionKeyStatus = 'ready';
    const ok = { id: 't1', status: 'completed', tokens: [], tokenTransfers: [] };
    const send = vi.fn().mockResolvedValue(ok);
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.transfer(PARAMS);
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does not gate when SUBSCRIPTION_ENABLED is false (env-key mode), even if status is not ready', async () => {
    (subscriptionConfig as { SUBSCRIPTION_ENABLED: boolean }).SUBSCRIPTION_ENABLED = false;
    subscriptionKeyStatus = 'provisioning';
    const ok = { id: 't1', status: 'completed', tokens: [], tokenTransfers: [] };
    const send = vi.fn().mockResolvedValue(ok);
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.transfer(PARAMS);
    });
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('useTransfer — proactive quota gate (Task 3)', () => {
  it('rejects with QuotaBlockedError and never calls send on a "block" verdict', async () => {
    const info = utilization({ status: 'expired' });
    vi.mocked(checkSendQuota).mockResolvedValue({ verdict: 'block', info });
    const send = vi.fn().mockResolvedValue({ id: 't1', status: 'completed', tokens: [], tokenTransfers: [] });
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    await expect(
      act(async () => {
        await result.current.transfer(PARAMS);
      }),
    ).rejects.toThrow(QuotaBlockedError);
    expect(send).not.toHaveBeenCalled();
  });

  it('proceeds to send on an "allow" verdict', async () => {
    vi.mocked(checkSendQuota).mockResolvedValue({ verdict: 'allow' });
    const ok = { id: 't1', status: 'completed', tokens: [], tokenTransfers: [] };
    const send = vi.fn().mockResolvedValue(ok);
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: unknown;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });
    expect(res).toEqual(ok);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('proceeds to send on a "warn" verdict (UI-only, no hook effect)', async () => {
    const info = utilization({ availablePerMinute: 3 });
    vi.mocked(checkSendQuota).mockResolvedValue({ verdict: 'warn', info });
    const ok = { id: 't1', status: 'completed', tokens: [], tokenTransfers: [] };
    const send = vi.fn().mockResolvedValue(ok);
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: unknown;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });
    expect(res).toEqual(ok);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('still calls send when checkSendQuota throws unexpectedly (defensive fail-open)', async () => {
    vi.mocked(checkSendQuota).mockRejectedValue(new Error('boom'));
    const ok = { id: 't1', status: 'completed', tokens: [], tokenTransfers: [] };
    const send = vi.fn().mockResolvedValue(ok);
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: unknown;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });
    expect(res).toEqual(ok);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('never calls checkSendQuota when SUBSCRIPTION_ENABLED is false', async () => {
    (subscriptionConfig as { SUBSCRIPTION_ENABLED: boolean }).SUBSCRIPTION_ENABLED = false;
    const ok = { id: 't1', status: 'completed', tokens: [], tokenTransfers: [] };
    const send = vi.fn().mockResolvedValue(ok);
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: unknown;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });
    expect(res).toEqual(ok);
    expect(checkSendQuota).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('useTransfer — reactive 429/401 annotation (Task 4)', () => {
  it('opens the upgrade modal with reason "quota" on a 429 cause (still delivery-pending)', async () => {
    const send = vi.fn().mockRejectedValue(
      new SphereError('certification unconfirmed', 'CERTIFICATION_UNCONFIRMED', jsonRpcNetworkError(429)),
    );
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: { deliveryPending?: boolean } | undefined;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });

    expect(res?.deliveryPending).toBe(true);
    expect(openUpgradeMock).toHaveBeenCalledWith('quota');
  });

  it('disambiguates a 401 cause via getUtilization: expired status → openUpgrade("expired")', async () => {
    vi.mocked(getUtilization).mockResolvedValue(utilization({ status: 'expired' }));
    const send = vi.fn().mockRejectedValue(
      new SphereError('certification unconfirmed', 'CERTIFICATION_UNCONFIRMED', jsonRpcNetworkError(401)),
    );
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: { deliveryPending?: boolean } | undefined;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });

    // Synthetic pending result returns immediately — disambiguation is fire-and-forget.
    expect(res?.deliveryPending).toBe(true);
    await waitFor(() => expect(openUpgradeMock).toHaveBeenCalledWith('expired'));
    expect(showToast).not.toHaveBeenCalled();
  });

  it('disambiguates a 401 cause via getUtilization: rejection → warns + toasts, no upgrade modal', async () => {
    vi.mocked(getUtilization).mockRejectedValue(new Error('unauthorized'));
    const send = vi.fn().mockRejectedValue(
      new SphereError('certification unconfirmed', 'CERTIFICATION_UNCONFIRMED', jsonRpcNetworkError(401)),
    );
    fakeSphere = { payments: { send } };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: { deliveryPending?: boolean } | undefined;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });

    expect(res?.deliveryPending).toBe(true);
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith(
      expect.stringMatching(/subscription key was rejected/i),
      'error',
      6000,
    );
    expect(openUpgradeMock).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('does not open the upgrade modal for a plain CERTIFICATION_UNCONFIRMED (no cause)', async () => {
    const send = vi.fn().mockRejectedValue(
      new SphereError('certification unconfirmed — the source spend may be on-chain', 'CERTIFICATION_UNCONFIRMED'),
    );
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: { deliveryPending?: boolean } | undefined;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });

    expect(res?.deliveryPending).toBe(true);
    expect(openUpgradeMock).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(getUtilization).not.toHaveBeenCalled();
  });

  it('still resolves delivery-pending when the annotation itself throws synchronously (401 + storage-blocked iframe)', async () => {
    // Money-safety invariant: disambiguateGatewayAuthError's FIRST statement
    // is getStoredSubscriptionKey() → localStorage.getItem, which throws a
    // SecurityError in storage-blocked iframes. That throw must never escape
    // ahead of the synthetic pending return — a possibly-certified spend
    // surfacing as a hard failure invites a re-send (double-pay).
    vi.mocked(getStoredSubscriptionKey).mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    const send = vi.fn().mockRejectedValue(
      new SphereError('certification unconfirmed', 'CERTIFICATION_UNCONFIRMED', jsonRpcNetworkError(401)),
    );
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: { deliveryPending?: boolean } | undefined;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });

    // Resolved as pending, NOT rejected — annotation failure is swallowed.
    expect(res?.deliveryPending).toBe(true);
    expect(result.current.error).toBeNull();
    expect(openUpgradeMock).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('never annotates when SUBSCRIPTION_ENABLED is false, even on a 429 cause', async () => {
    (subscriptionConfig as { SUBSCRIPTION_ENABLED: boolean }).SUBSCRIPTION_ENABLED = false;
    const send = vi.fn().mockRejectedValue(
      new SphereError('certification unconfirmed', 'CERTIFICATION_UNCONFIRMED', jsonRpcNetworkError(429)),
    );
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: { deliveryPending?: boolean } | undefined;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });

    expect(res?.deliveryPending).toBe(true);
    expect(openUpgradeMock).not.toHaveBeenCalled();
  });
});
