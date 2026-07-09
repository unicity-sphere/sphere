# Subscription-Key Migration — Phase 3 Plan (Upgrade Modal + Checkout Redirect UI)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A global "Upgrade" modal (openable from anywhere — Settings and the send-flow gate) showing plan cards; selecting a plan calls SGW `/checkout`, opens the returned external `paymentUrl` in a new tab, then polls until the plan activates and shows success.

**Architecture:** `UpgradeProvider` mirrors the existing `ConnectProvider` pattern — mounted app-wide, it exposes `openUpgrade(reason?)` via context and renders `<UpgradeModal>` as a sibling of `{children}`. The modal uses Phase-1 hooks (`usePlans`, `useSubscription`, `useCheckout`) and a pure, tested `pollForPlan` util. With `VITE_SUBSCRIPTION_MOCK=true` the whole flow is demoable without a backend.

**Tech Stack:** React 19 + TS, TanStack Query, Vitest + jsdom, Framer Motion, `lucide-react`.

## Global Constraints

- **Depends on Phase 1** (hooks, client, mock mode) and reuses Phase 2's UI primitives.
- Upgrade keeps the **same** apiKey (only the plan changes server-side) → after activation, invalidate `SPHERE_KEYS.subscription.*`; do **not** re-provision.
- Payment is **external** (third-party provider, other currencies): the wallet only opens `paymentUrl` and polls `key/{apiKey}` for activation. No in-wallet token payment.
- Mirror `ConnectProvider`/`ConnectContext`/`useConnectContext` structure exactly (`src/components/connect/`).
- Buildable/demoable now with mock mode.

---

## File Structure

- Create `src/sdk/subscription/pollForPlan.ts` — pure poll-until-plan-activates util.
- Create `src/components/upgrade/UpgradeContext.ts` — context + `useUpgrade()`.
- Create `src/components/upgrade/UpgradeProvider.tsx` — provider + modal mount.
- Create `src/components/upgrade/UpgradeModal.tsx` — plan cards + checkout + poll UI.
- Create `src/components/upgrade/index.ts` — barrel.
- Modify `src/main.tsx` — mount `<UpgradeProvider>` in the tree.
- Modify `src/components/wallet/L3/modals/SettingsModal.tsx` — replace the Phase-2 `onUpgrade` placeholder with `openUpgrade('settings')`.
- Tests: `tests/unit/sdk/pollForPlan.test.ts`.

---

## Task 1: `pollForPlan` util

**Files:**
- Create: `src/sdk/subscription/pollForPlan.ts`
- Test: `tests/unit/sdk/pollForPlan.test.ts`

**Interfaces:**
- Produces: `pollForPlan(fetchKeyInfo, targetPlanId, opts?): Promise<boolean>` where `fetchKeyInfo: () => Promise<{ pricingPlan: { id: number } | null }>` and `opts?: { intervalMs?: number; timeoutMs?: number; now?: () => number; sleep?: (ms: number) => Promise<void> }`. Resolves `true` when the key reports `pricingPlan.id === targetPlanId` before the timeout, else `false`. Transient fetch errors are swallowed and polling continues.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/sdk/pollForPlan.test.ts
import { describe, it, expect, vi } from 'vitest';
import { pollForPlan } from '@/sdk/subscription/pollForPlan';

const noSleep = () => Promise.resolve();

describe('pollForPlan', () => {
  it('resolves true when the plan activates on a later poll', async () => {
    const fetchKeyInfo = vi.fn()
      .mockResolvedValueOnce({ pricingPlan: { id: 0 } })
      .mockResolvedValueOnce({ pricingPlan: { id: 2 } });
    const ok = await pollForPlan(fetchKeyInfo, 2, { intervalMs: 1, sleep: noSleep });
    expect(ok).toBe(true);
    expect(fetchKeyInfo).toHaveBeenCalledTimes(2);
  });

  it('resolves false on timeout', async () => {
    let t = 0;
    const now = () => (t += 1000); // advances 1s each call → crosses a 2s timeout quickly
    const fetchKeyInfo = vi.fn().mockResolvedValue({ pricingPlan: { id: 0 } });
    const ok = await pollForPlan(fetchKeyInfo, 2, { intervalMs: 1, timeoutMs: 2, now, sleep: noSleep });
    expect(ok).toBe(false);
  });

  it('keeps polling through transient errors', async () => {
    const fetchKeyInfo = vi.fn()
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValueOnce({ pricingPlan: { id: 3 } });
    const ok = await pollForPlan(fetchKeyInfo, 3, { intervalMs: 1, sleep: noSleep });
    expect(ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/unit/sdk/pollForPlan.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/sdk/subscription/pollForPlan.ts
/**
 * Polls a key-info fetcher until the subscription reports the target plan,
 * or until the timeout elapses. Used after redirecting the user to the
 * external payment page — activation happens server-side, so we poll.
 */
export async function pollForPlan(
  fetchKeyInfo: () => Promise<{ pricingPlan: { id: number } | null }>,
  targetPlanId: number,
  opts: {
    intervalMs?: number;
    timeoutMs?: number;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<boolean> {
  const intervalMs = opts.intervalMs ?? 4000;
  const timeoutMs = opts.timeoutMs ?? 5 * 60_000;
  const now = opts.now ?? (() => Date.now());
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));

  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    try {
      const info = await fetchKeyInfo();
      if (info.pricingPlan?.id === targetPlanId) return true;
    } catch {
      // transient — keep polling
    }
    await sleep(intervalMs);
  }
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/unit/sdk/pollForPlan.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/sdk/subscription/pollForPlan.ts tests/unit/sdk/pollForPlan.test.ts
git commit -m "feat(subscription): pollForPlan util (await external-payment activation)"
```

---

## Task 2: Upgrade context + provider + modal

**Files:**
- Create: `src/components/upgrade/UpgradeContext.ts`, `UpgradeProvider.tsx`, `UpgradeModal.tsx`, `index.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `usePlans`, `useSubscription`, `useCheckout` (Phase 1); `pollForPlan` (Task 1); `getKeyInfo`, `getStoredSubscriptionKey`, `SUBSCRIPTION_MOCK`; `showToast`; `useQueryClient` + `SPHERE_KEYS`.
- Produces: `useUpgrade(): { openUpgrade: (reason?: string) => void }`; `UpgradeProvider`.

- [ ] **Step 1: Context + hook**

```ts
// src/components/upgrade/UpgradeContext.ts
import { createContext, useContext } from 'react';

export interface UpgradeContextValue {
  openUpgrade: (reason?: string) => void;
}

export const UpgradeContext = createContext<UpgradeContextValue | null>(null);

export function useUpgrade(): UpgradeContextValue {
  const ctx = useContext(UpgradeContext);
  if (!ctx) throw new Error('useUpgrade must be used within UpgradeProvider');
  return ctx;
}
```

- [ ] **Step 2: Provider**

```tsx
// src/components/upgrade/UpgradeProvider.tsx
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { UpgradeContext } from './UpgradeContext';
import { UpgradeModal } from './UpgradeModal';

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();

  const openUpgrade = useCallback((r?: string) => {
    setReason(r);
    setIsOpen(true);
  }, []);

  const value = useMemo(() => ({ openUpgrade }), [openUpgrade]);

  return (
    <UpgradeContext.Provider value={value}>
      {children}
      <UpgradeModal isOpen={isOpen} reason={reason} onClose={() => setIsOpen(false)} />
    </UpgradeContext.Provider>
  );
}
```

- [ ] **Step 3: Modal**

```tsx
// src/components/upgrade/UpgradeModal.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { WalletScreen } from '../wallet/ui/WalletScreen';
import { ModalHeader, Button } from '../wallet/ui';
import { usePlans, useSubscription, useCheckout } from '../../sdk/hooks/subscription';
import { pollForPlan } from '../../sdk/subscription/pollForPlan';
import { getKeyInfo, type PlanInfo } from '../../services/subscriptionApi';
import { getStoredSubscriptionKey } from '../../config/storageKeys';
import { SUBSCRIPTION_MOCK } from '../../config/subscription';
import { showToast } from '../ui/toast-utils';
import { useQueryClient } from '@tanstack/react-query';
import { SPHERE_KEYS } from '../../sdk/queryKeys';

type Step = 'plans' | 'awaiting' | 'success' | 'error';

interface UpgradeModalProps {
  isOpen: boolean;
  reason?: string;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, reason, onClose }: UpgradeModalProps) {
  const plans = usePlans();
  const sub = useSubscription();
  const checkout = useCheckout();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('plans');
  const [error, setError] = useState<string | null>(null);
  const currentPlanId = sub.data?.pricingPlan?.id ?? 0;

  const handleSelect = async (plan: PlanInfo) => {
    if (plan.planId === currentPlanId) return;
    setError(null);
    try {
      const { paymentUrl } = await checkout.mutateAsync({ targetPlanId: plan.planId });
      window.open(paymentUrl, '_blank', 'noopener,noreferrer');
      setStep('awaiting');

      const apiKey = getStoredSubscriptionKey();
      const activated = SUBSCRIPTION_MOCK
        ? true // mock: no real external payment — show success so the flow is demoable
        : apiKey
          ? await pollForPlan(() => getKeyInfo(apiKey), plan.planId)
          : false;

      if (activated) {
        await queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.subscription.all });
        setStep('success');
        showToast(`Upgraded to ${plan.name}`, 'success', 4000);
      } else {
        setStep('error');
        setError('Payment not detected yet. If you paid, it may take a few minutes — check again later.');
      }
    } catch (e) {
      setStep('error');
      setError(e instanceof Error ? e.message : 'Checkout failed');
    }
  };

  const handleClose = () => {
    setStep('plans');
    setError(null);
    onClose();
  };

  return (
    <WalletScreen isOpen={isOpen} onClose={handleClose}>
      <ModalHeader variant="screen" title="Upgrade plan" icon={Sparkles} iconVariant="gradient" onClose={handleClose} />

      <div className="px-5 py-6 space-y-3 flex-1 overflow-y-auto">
        {reason === 'quota' && step === 'plans' && (
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-sm">
            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <span>You've reached your plan's limit. Upgrade for more, or wait for your quota to refill.</span>
          </div>
        )}

        {step === 'plans' && plans.data?.map((plan) => {
          const isCurrent = plan.planId === currentPlanId;
          return (
            <motion.button
              key={plan.planId}
              whileHover={isCurrent ? {} : { scale: 1.01 }}
              whileTap={isCurrent ? {} : { scale: 0.99 }}
              disabled={isCurrent || checkout.isPending}
              onClick={() => handleSelect(plan)}
              className={`w-full p-5 flex items-center gap-4 rounded-2xl border text-left transition-colors ${
                isCurrent
                  ? 'bg-emerald-500/10 border-emerald-500/20 cursor-default'
                  : 'bg-neutral-50 dark:bg-white/4 border-neutral-200 dark:border-white/8 hover:bg-neutral-100 dark:hover:bg-white/8'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold font-mono capitalize">{plan.name}</div>
                <div className="text-xs text-neutral-500 dark:text-white/45 mt-0.5">
                  {plan.requestsPerDay.toLocaleString()} tx/day · {plan.requestsPerSecond}/s
                </div>
              </div>
              {isCurrent ? (
                <span className="flex items-center gap-1 text-xs text-emerald-500"><Check className="w-4 h-4" /> Current</span>
              ) : (
                <ArrowRight className="w-4 h-4 text-neutral-400 dark:text-neutral-600 shrink-0" />
              )}
            </motion.button>
          );
        })}

        {step === 'awaiting' && (
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-sm">Complete the payment in the new tab. We'll activate your plan automatically.</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              <Check className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="font-semibold">Plan upgraded</p>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <p className="text-sm">{error}</p>
            <Button variant="secondary" onClick={() => setStep('plans')}>Back to plans</Button>
          </div>
        )}
      </div>
    </WalletScreen>
  );
}
```

- [ ] **Step 4: Barrel + mount**

```ts
// src/components/upgrade/index.ts
export { UpgradeProvider } from './UpgradeProvider';
export { useUpgrade } from './UpgradeContext';
```

In `src/main.tsx`, add the import and wrap `App` (inside `ConnectProvider`, outside `ThemeInitializer`):

```tsx
import { UpgradeProvider } from './components/upgrade';
```

```tsx
          <ConnectProvider>
            <UpgradeProvider>
              <ThemeInitializer>
                <BrowserRouter basename={import.meta.env.BASE_URL}>
                  <App />
                </BrowserRouter>
                <ToastContainer />
              </ThemeInitializer>
            </UpgradeProvider>
          </ConnectProvider>
```

- [ ] **Step 5: Type-check + tests**

Run: `npx tsc --noEmit` → no errors. `npm run test:run` → all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/upgrade/ src/main.tsx
git commit -m "feat(subscription): global Upgrade modal + provider (checkout redirect + poll)"
```

---

## Task 3: Wire the Settings "Upgrade" button to the provider

**Files:**
- Modify: `src/components/wallet/L3/modals/SettingsModal.tsx`

- [ ] **Step 1: Replace the Phase-2 placeholder**

Remove the `showToast` import if now unused. Add:

```ts
import { useUpgrade } from '../../../upgrade';
```

Inside `SettingsModal`:

```ts
  const { openUpgrade } = useUpgrade();
```

Change the `SubscriptionModal` usage:

```tsx
      <SubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
        onUpgrade={() => { setIsSubscriptionOpen(false); openUpgrade('settings'); }}
      />
```

- [ ] **Step 2: Type-check + tests + manual (mock mode)**

Run: `npx tsc --noEmit` → clean. `npm run test:run` → PASS.
Manual (`VITE_SUBSCRIPTION_MOCK=true`): Settings → Subscription → "Upgrade plan" opens the plans grid (free marked "Current"); selecting "basic" opens the mock `paymentUrl` tab, then shows "Plan upgraded" + toast.

- [ ] **Step 3: Commit**

```bash
git add src/components/wallet/L3/modals/SettingsModal.tsx
git commit -m "feat(subscription): wire Settings upgrade button to global Upgrade modal"
```

---

## Phase 3 Self-Review Checklist

- [ ] `npm run test:run` green; `npx tsc --noEmit` clean; `npm run lint` clean.
- [ ] `UpgradeProvider` mounted where `usePlans`/`useSubscription` have a `QueryClientProvider` ancestor (they do — it's inside `QueryClientProvider` in `main.tsx`).
- [ ] Mock mode: full plans → awaiting → success path is demoable; `paymentUrl` opens in a new tab.
- [ ] Real mode: after `window.open`, `pollForPlan` runs against `getKeyInfo`; upgrade keeps the same apiKey and only invalidates subscription queries.
- [ ] `useUpgrade()` is only called under `UpgradeProvider` (Settings is, since the whole app is wrapped).
