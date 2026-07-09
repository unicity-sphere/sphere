# Subscription-Key Migration — Phase 2 Plan (Settings › Subscription UI)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a "Subscription" section to wallet Settings — a modal showing the current plan, live usage (per-day / per-second) with progress bars, expiry, and an "Upgrade" button.

**Architecture:** A `SubscriptionModal` (slide-in `WalletScreen`) reads `useSubscription` (plan + expiry) and `useSubscriptionUsage` (usage). Built entirely against Phase 1's hooks; with `VITE_SUBSCRIPTION_MOCK=true` it renders full canned data with no backend. A pure `usagePercent` helper is unit-tested.

**Tech Stack:** React 19 + TS, TanStack Query, Vitest + jsdom, `lucide-react`, Framer Motion. Reuses `src/components/wallet/ui` primitives.

## Global Constraints

- **Depends on Phase 1** (`src/sdk/hooks/subscription`, `subscriptionApi`, `VITE_SUBSCRIPTION_MOCK`).
- Money is a decimal string. Reuse existing UI primitives (`WalletScreen`, `ModalHeader`, `MenuButton`, `Button`, `EmptyState`, `AlertMessage`) — do not hand-roll modals.
- Buildable and demoable now with `VITE_SUBSCRIPTION_MOCK=true`; no backend required.
- Keep `SubscriptionModal` decoupled from the upgrade flow via an `onUpgrade?` prop (Phase 3 supplies the real handler).

---

## File Structure

- Create `src/sdk/subscription/usage.ts` — pure `usagePercent()` + `formatExpiry()` helpers.
- Create `src/components/wallet/L3/modals/SubscriptionModal.tsx` — the settings sub-screen.
- Modify `src/components/wallet/L3/modals/SettingsModal.tsx` — add the "Subscription" row + sibling modal.
- Tests: `tests/unit/sdk/usage.test.ts`.

---

## Task 1: Pure usage/format helpers

**Files:**
- Create: `src/sdk/subscription/usage.ts`
- Test: `tests/unit/sdk/usage.test.ts`

**Interfaces:**
- Produces: `usagePercent(used: number, limit: number): number` (0–100, clamped); `formatExpiry(iso: string | null): string`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/sdk/usage.test.ts
import { describe, it, expect } from 'vitest';
import { usagePercent, formatExpiry } from '@/sdk/subscription/usage';

describe('usagePercent', () => {
  it('computes a rounded percentage', () => {
    expect(usagePercent(497, 500)).toBe(99);
    expect(usagePercent(0, 500)).toBe(0);
  });
  it('clamps to 100 and guards a zero/negative limit', () => {
    expect(usagePercent(600, 500)).toBe(100);
    expect(usagePercent(5, 0)).toBe(0);
  });
});

describe('formatExpiry', () => {
  it('returns a readable date', () => {
    expect(formatExpiry('2026-08-01T00:00:00Z')).toMatch(/2026/);
  });
  it('handles null', () => {
    expect(formatExpiry(null)).toBe('—');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/unit/sdk/usage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/sdk/subscription/usage.ts
/** Usage as a clamped 0–100 integer percentage; guards a zero/negative limit. */
export function usagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

/** Human-readable expiry; '—' when there is no expiry. */
export function formatExpiry(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/unit/sdk/usage.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/sdk/subscription/usage.ts tests/unit/sdk/usage.test.ts
git commit -m "feat(subscription): pure usagePercent + formatExpiry helpers"
```

---

## Task 2: `SubscriptionModal`

**Files:**
- Create: `src/components/wallet/L3/modals/SubscriptionModal.tsx`

**Interfaces:**
- Consumes: `useSubscription`, `useSubscriptionUsage` (Phase 1); `usagePercent`, `formatExpiry` (Task 1); `Button`, `EmptyState` from `../../ui`; `WalletScreen`, `ModalHeader`.
- Produces: `SubscriptionModal` — props `{ isOpen: boolean; onClose: () => void; onUpgrade?: () => void }`.

- [ ] **Step 1: Implement the modal**

```tsx
// src/components/wallet/L3/modals/SubscriptionModal.tsx
import { CreditCard, Sparkles, Zap } from 'lucide-react';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader, Button, EmptyState, AlertMessage } from '../../ui';
import { useSubscription, useSubscriptionUsage } from '../../../../sdk/hooks/subscription';
import { usagePercent, formatExpiry } from '../../../../sdk/subscription/usage';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export function SubscriptionModal({ isOpen, onClose, onUpgrade }: SubscriptionModalProps) {
  const sub = useSubscription();
  const usage = useSubscriptionUsage();
  const plan = sub.data?.pricingPlan;

  return (
    <WalletScreen isOpen={isOpen} onClose={onClose}>
      <ModalHeader variant="screen" title="Subscription" icon={CreditCard} iconVariant="gradient" onClose={onClose} />

      <div className="px-5 py-6 space-y-5 flex-1 overflow-y-auto">
        {sub.isError && (
          <AlertMessage variant="error">Couldn't load your subscription. Try again later.</AlertMessage>
        )}

        {!sub.isError && !plan && !sub.isLoading && (
          <EmptyState icon={Sparkles} title="No active plan" description="You don't have an active subscription yet." />
        )}

        {plan && (
          <>
            {/* Current plan card */}
            <div className="p-5 rounded-2xl bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span className="font-semibold font-mono capitalize">{plan.name} plan</span>
              </div>
              <div className="text-xs text-neutral-500 dark:text-white/45">
                Renews / expires: {formatExpiry(sub.data?.expiresAt ?? null)}
              </div>
            </div>

            {/* Usage bars */}
            <div className="space-y-4">
              <UsageBar
                icon={Zap}
                label="Daily transactions"
                used={usage.data?.perDay.used ?? 0}
                limit={usage.data?.perDay.limit ?? plan.requestsPerDay}
                loading={usage.isLoading}
              />
              <UsageBar
                icon={Zap}
                label="Per second"
                used={(usage.data ? usage.data.perSecond.limit - usage.data.perSecond.remaining : 0)}
                limit={usage.data?.perSecond.limit ?? plan.requestsPerSecond}
                loading={usage.isLoading}
              />
            </div>
          </>
        )}
      </div>

      <div className="px-5 pb-6">
        <Button variant="primary" fullWidth icon={Sparkles} onClick={onUpgrade} disabled={!onUpgrade}>
          Upgrade plan
        </Button>
      </div>
    </WalletScreen>
  );
}

function UsageBar({ icon: Icon, label, used, limit, loading }: {
  icon: typeof Zap; label: string; used: number; limit: number; loading?: boolean;
}) {
  const pct = usagePercent(used, limit);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-sm">
        <span className="flex items-center gap-1.5 text-neutral-600 dark:text-white/60">
          <Icon className="w-3.5 h-3.5" /> {label}
        </span>
        <span className="font-mono text-xs text-neutral-500 dark:text-white/45">
          {loading ? '…' : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-neutral-200 dark:bg-white/8 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (If `AlertMessage`/`EmptyState` prop names differ, check `src/components/wallet/ui/index.ts` and adjust — `AlertMessage` takes `variant` + children; `EmptyState` takes `{ icon, title, description }`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/wallet/L3/modals/SubscriptionModal.tsx
git commit -m "feat(subscription): SubscriptionModal (plan, usage bars, expiry, upgrade CTA)"
```

---

## Task 3: Add the "Subscription" row to Settings

**Files:**
- Modify: `src/components/wallet/L3/modals/SettingsModal.tsx`

**Interfaces:**
- Consumes: `SubscriptionModal` (Task 2); `showToast` (existing) as the Phase-2 placeholder upgrade handler.

- [ ] **Step 1: Wire the row + sibling modal**

Edit `src/components/wallet/L3/modals/SettingsModal.tsx`:

Add imports (line 2-7 area):

```ts
import { Settings, Download, LogOut, Key, AtSign, Link, CreditCard } from 'lucide-react';
import { SubscriptionModal } from './SubscriptionModal';
import { showToast } from '../../../ui/toast-utils';
```

Add state (after line 25):

```ts
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
```

Add the `MenuButton` after the "Connected Sites" button (after line 58):

```tsx
          <MenuButton
            icon={CreditCard}
            color="orange"
            label="Subscription"
            subtitle="Manage your plan"
            onClick={() => setIsSubscriptionOpen(true)}
          />
```

Add the sibling modal after `<ConnectedSitesModal ... />` (after line 98):

```tsx
      <SubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
        onUpgrade={() => showToast('Upgrade coming soon', 'info')}
      />
```

> The `onUpgrade` placeholder is replaced by `openUpgrade('settings')` in Phase 3.

- [ ] **Step 2: Type-check + full test run**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run test:run`
Expected: all PASS.

- [ ] **Step 3: Manual verification (mock mode)**

1. `.env`: `VITE_SUBSCRIPTION_MOCK=true`, `VITE_SUBSCRIPTION_ENABLED=true`. `npm run dev`.
2. Open wallet → gear (Settings) → "Subscription". Expected: "free plan" card, daily-usage bar near-full (497/500, red), per-second bar, expiry date, "Upgrade plan" button (shows the placeholder toast).

- [ ] **Step 4: Commit**

```bash
git add src/components/wallet/L3/modals/SettingsModal.tsx
git commit -m "feat(subscription): add Subscription section to Settings"
```

---

## Phase 2 Self-Review Checklist

- [ ] `npm run test:run` green; `npx tsc --noEmit` clean; `npm run lint` clean.
- [ ] Mock mode renders the full modal (plan + both usage bars + expiry).
- [ ] `AlertMessage`/`EmptyState`/`Button` prop names match the actual `src/components/wallet/ui` exports.
- [ ] `SubscriptionModal` has no dependency on the (not-yet-built) upgrade provider — only the `onUpgrade?` prop.
