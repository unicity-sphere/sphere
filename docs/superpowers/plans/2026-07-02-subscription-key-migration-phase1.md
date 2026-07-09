# Subscription-Key Migration — Phase 1 Implementation Plan (Key Lifecycle)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each wallet a per-wallet aggregator API key from the SGW subscription service — provisioned at creation and recovered at restore via identity-bound challenge/verify — wired into the SDK oracle so token sends use it, all behind a feature flag with the static env key as fallback.

**Architecture:** A new `subscriptionApi.ts` client drives SGW `/auth/challenge` → `sphere.signMessage` → `/auth/verify` to get-or-create a free-plan key. The key is cached in `localStorage` and threaded into `buildProviders(network, apiKey?)` so `Sphere.init` builds the oracle with it; if absent (flag off / provisioning fails), the build falls back to `VITE_AGGREGATOR_API_KEY`. Onboarding calls the client at its single convergence point (`doFinalizeWallet`) and shows a plan-capabilities screen before finalizing.

**Tech Stack:** React 19 + TypeScript, TanStack Query v5, Vitest 4 + jsdom, `@unicitylabs/sphere-sdk`. Path alias `@` → `/src`. Test globals (`describe/it/expect/vi`) enabled.

## Global Constraints

- All localStorage keys use the `sphere_` prefix and live in `src/config/storageKeys.ts` (verbatim rule from the repo).
- Money fields from SGW are **decimal strings**, never numbers (`price`).
- The aggregator key is attached by the SDK as the `X-API-Key` header on `certification_request` only. Sphere never sends it upstream itself.
- Signature scheme for `/auth/verify` is the Sphere non-standard scheme (double-SHA256 `"Sphere Signed Message:\n"` prefix; wire = `v(1)+r(32)+s(32)` with `v = 31 + recid`). Never assume Ethereum `ecrecover`. Golden vector: spec §4.1.
- Feature flag `VITE_SUBSCRIPTION_ENABLED === 'true'` gates all new behavior; when off, current static-key behavior is unchanged.
- Design spec: `docs/superpowers/specs/2026-07-02-subscription-key-migration-design.md`.

---

## File Structure (Phase 1)

- Create `src/config/subscription.ts` — env-driven config (`SUBSCRIPTION_API_URL`, `SUBSCRIPTION_ENABLED`).
- Modify `src/config/storageKeys.ts` — add `SUBSCRIPTION_API_KEY` + typed getters/setters.
- Create `src/services/subscriptionApi.ts` — SGW HTTP client (auth + plans + key-info + usage + checkout) and its types.
- Create `src/sdk/hooks/subscription/useSubscription.ts`, `usePlans.ts`, `useSubscriptionUsage.ts`, `useCheckout.ts`, `index.ts` — TanStack Query adapters.
- Modify `src/sdk/queryKeys.ts` — add `SPHERE_KEYS.subscription`.
- Create `src/sdk/oracleKey.ts` — pure `resolveOracleApiKey()` + stored-key accessors (unit-testable, no React).
- Modify `src/sdk/SphereProvider.tsx` — `buildProviders(network, apiKey?)`; read stored key in `initialize()`; expose `applySubscriptionKey(key)` on context.
- Modify `src/sdk/SphereContext.ts` — add `applySubscriptionKey` to the context type.
- Create `src/components/wallet/onboarding/components/PlanCapabilitiesScreen.tsx` — post-onboarding capabilities screen.
- Modify `src/components/wallet/onboarding/components/index.ts` — export the screen.
- Modify `src/components/wallet/onboarding/hooks/useOnboardingFlow.ts` — add `"planCapabilities"` step, `planInfo` state, provisioning at `doFinalizeWallet`, routing.
- Modify `src/components/wallet/onboarding/CreateWalletFlow.tsx` — render the new step.
- Modify `.env.example` — document the two new vars.
- Tests under `tests/unit/services/`, `tests/unit/sdk/`, `tests/unit/config/`.

---

## Task 1: Config + storage key for the subscription key

**Files:**
- Create: `src/config/subscription.ts`
- Modify: `src/config/storageKeys.ts:40` (add key), append getters
- Modify: `.env.example`
- Test: `tests/unit/config/subscription.test.ts`

**Interfaces:**
- Produces: `SUBSCRIPTION_API_URL: string`, `SUBSCRIPTION_ENABLED: boolean` (from `src/config/subscription.ts`); `STORAGE_KEYS.SUBSCRIPTION_API_KEY`, `getStoredSubscriptionKey(): string | null`, `setStoredSubscriptionKey(k: string): void` (from `storageKeys.ts`).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/config/subscription.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { STORAGE_KEYS, getStoredSubscriptionKey, setStoredSubscriptionKey } from '@/config/storageKeys';

describe('subscription storage key', () => {
  beforeEach(() => localStorage.clear());

  it('uses the sphere_ prefix', () => {
    expect(STORAGE_KEYS.SUBSCRIPTION_API_KEY).toBe('sphere_subscription_api_key');
  });

  it('round-trips the stored key', () => {
    expect(getStoredSubscriptionKey()).toBeNull();
    setStoredSubscriptionKey('key_abc123');
    expect(getStoredSubscriptionKey()).toBe('key_abc123');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/unit/config/subscription.test.ts`
Expected: FAIL — `SUBSCRIPTION_API_KEY`/`getStoredSubscriptionKey` not exported.

- [ ] **Step 3: Implement — add the storage key + accessors**

In `src/config/storageKeys.ts`, add to the `STORAGE_KEYS` object (after `WALLET_API_DEVICE_ID`, line 40):

```ts
  // Per-wallet aggregator subscription API key (cached; also recoverable
  // from identity via the SGW /auth flow). Cleared on wallet deletion.
  SUBSCRIPTION_API_KEY: 'sphere_subscription_api_key',
```

Append near the bottom of the file (after `getOrCreateWalletApiDeviceId`):

```ts
export function getStoredSubscriptionKey(): string | null {
  return localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_API_KEY);
}

export function setStoredSubscriptionKey(key: string): void {
  localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_API_KEY, key);
}
```

- [ ] **Step 4: Create the config module**

```ts
// src/config/subscription.ts
/**
 * Subscription gateway (SGW) config. Env-driven so each environment points at
 * its own SGW host. When SUBSCRIPTION_ENABLED is false the app keeps using the
 * static VITE_AGGREGATOR_API_KEY and no subscription calls are made.
 */
export const SUBSCRIPTION_API_URL =
  import.meta.env.VITE_SUBSCRIPTION_API_URL ?? 'http://localhost:8080';

export const SUBSCRIPTION_ENABLED =
  import.meta.env.VITE_SUBSCRIPTION_ENABLED === 'true';
```

- [ ] **Step 5: Document env vars**

Append to `.env.example`:

```env
# Subscription gateway (SGW) — per-wallet aggregator subscription keys
VITE_SUBSCRIPTION_API_URL=http://localhost:8080
# Master switch for the subscription flow (falls back to VITE_AGGREGATOR_API_KEY when not 'true')
VITE_SUBSCRIPTION_ENABLED=false
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test:run -- tests/unit/config/subscription.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/config/subscription.ts src/config/storageKeys.ts .env.example tests/unit/config/subscription.test.ts
git commit -m "feat(subscription): add SGW config + subscription-key storage accessors"
```

---

## Task 2: SGW HTTP client (`subscriptionApi.ts`)

**Files:**
- Create: `src/services/subscriptionApi.ts`
- Test: `tests/unit/services/subscriptionApi.test.ts`

**Interfaces:**
- Consumes: `SUBSCRIPTION_API_URL` (Task 1); a `Sphere`-like object exposing `identity.chainPubkey: string` and `signMessage(msg: string): string`.
- Produces:
  - `provisionOrRecoverKey(sphere): Promise<ProvisionResult>` where `ProvisionResult = { apiKey: string; plan: PlanInfo; created: boolean }`
  - `getPlans(): Promise<PlanInfo[]>`, `getKeyInfo(apiKey): Promise<KeyInfo>`, `getUsage(apiKey): Promise<UsageInfo>`, `createCheckout(apiKey, targetPlanId, returnUrl?): Promise<CheckoutResult>`
  - Types `PlanInfo`, `UsageInfo`, `KeyInfo`, `CheckoutResult`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/services/subscriptionApi.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { provisionOrRecoverKey, getPlans, getUsage } from '@/services/subscriptionApi';

function mockFetchSequence(responses: Array<{ ok?: boolean; status?: number; json: unknown }>) {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce({
      ok: r.ok ?? true,
      status: r.status ?? 200,
      json: async () => r.json,
    });
  }
  vi.stubGlobal('fetch', fn);
  return fn;
}

const fakeSphere = {
  identity: { chainPubkey: '02aa'.padEnd(66, 'b') },
  signMessage: vi.fn((msg: string) => `sig(${msg})`),
} as unknown as import('@unicitylabs/sphere-sdk').Sphere;

describe('subscriptionApi', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('provisionOrRecoverKey: challenge -> sign -> verify', async () => {
    const fetchMock = mockFetchSequence([
      { json: { nonce: 'n1', challenge: 'CHALLENGE_STRING', expiresAt: 'x' } },
      { json: { apiKey: 'key_abc', plan: { planId: 0, name: 'free', requestsPerSecond: 5, requestsPerDay: 50000, price: '0' }, created: true } },
    ]);

    const result = await provisionOrRecoverKey(fakeSphere);

    // challenge POST body carries the pubkey
    const challengeCall = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(challengeCall).toEqual({ pubkey: fakeSphere.identity!.chainPubkey });
    // wallet signed the exact challenge string
    expect(fakeSphere.signMessage).toHaveBeenCalledWith('CHALLENGE_STRING');
    // verify POST body carries nonce + signature (no pubkey needed — server recovers it)
    const verifyCall = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(verifyCall).toEqual({ nonce: 'n1', signature: 'sig(CHALLENGE_STRING)' });

    expect(result.apiKey).toBe('key_abc');
    expect(result.created).toBe(true);
    expect(result.plan.name).toBe('free');
  });

  it('provisionOrRecoverKey: throws if identity is missing', async () => {
    const noIdentity = { signMessage: vi.fn() } as unknown as import('@unicitylabs/sphere-sdk').Sphere;
    await expect(provisionOrRecoverKey(noIdentity)).rejects.toThrow(/identity/i);
  });

  it('getPlans: unwraps availablePlans', async () => {
    mockFetchSequence([{ json: { availablePlans: [{ planId: 1, name: 'basic', requestsPerSecond: 5, requestsPerDay: 50000, price: '1000000' }] } }]);
    const plans = await getPlans();
    expect(plans).toHaveLength(1);
    expect(plans[0].name).toBe('basic');
  });

  it('getUsage: sends X-API-Key header', async () => {
    const fetchMock = mockFetchSequence([{ json: { perDay: { limit: 50000, used: 3, remaining: 49997, resetAt: null }, perSecond: { limit: 5, remaining: 4 } } }]);
    const usage = await getUsage('key_abc');
    expect(usage.perDay.remaining).toBe(49997);
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['x-api-key']).toBe('key_abc');
  });

  it('throws on non-ok responses', async () => {
    mockFetchSequence([{ ok: false, status: 500, json: {} }]);
    await expect(getPlans()).rejects.toThrow(/500/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/unit/services/subscriptionApi.test.ts`
Expected: FAIL — module `@/services/subscriptionApi` not found.

- [ ] **Step 3: Implement the client**

```ts
// src/services/subscriptionApi.ts
/**
 * SGW (aggregator-subscription) client. Bootstrap auth is identity-bound
 * challenge/verify (Sphere signMessage); every other call authenticates with
 * the returned apiKey via the X-API-Key header. Contract: design spec §4–5.
 */
import type { Sphere } from '@unicitylabs/sphere-sdk';
import { SUBSCRIPTION_API_URL } from '../config/subscription';

export interface PlanInfo {
  planId: number;
  name: string;
  requestsPerSecond: number;
  requestsPerDay: number;
  price: string; // decimal string
}

export interface ProvisionResult {
  apiKey: string;
  plan: PlanInfo;
  created: boolean;
}

export interface UsageInfo {
  perDay: { limit: number; used: number; remaining: number; resetAt: string | null };
  perSecond: { limit: number; remaining: number };
}

export interface KeyInfo {
  status: string;
  expiresAt: string | null;
  pricingPlan: (PlanInfo & { id: number }) | null;
}

export interface CheckoutResult {
  paymentUrl: string;
  sessionId: string;
}

interface Challenge {
  nonce: string;
  challenge: string;
  expiresAt: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SUBSCRIPTION_API_URL}${path}`, init);
  if (!res.ok) throw new Error(`subscription ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

function postJson<T>(path: string, body: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(extraHeaders ?? {}) },
    body: JSON.stringify(body),
  });
}

/**
 * Challenge -> signMessage -> verify. Idempotent get-or-create of the wallet's
 * free-plan key. Used by BOTH create (created=true) and restore (created=false).
 */
export async function provisionOrRecoverKey(sphere: Sphere): Promise<ProvisionResult> {
  const pubkey = sphere.identity?.chainPubkey;
  if (!pubkey) throw new Error('Wallet identity unavailable (no chainPubkey)');

  const { nonce, challenge } = await postJson<Challenge>('/auth/challenge', { pubkey });
  const signature = sphere.signMessage(challenge);
  return postJson<ProvisionResult>('/auth/verify', { nonce, signature });
}

export async function getPlans(): Promise<PlanInfo[]> {
  const data = await request<{ availablePlans: PlanInfo[] }>('/api/payment/plans');
  return data.availablePlans;
}

export function getKeyInfo(apiKey: string): Promise<KeyInfo> {
  return request<KeyInfo>(`/api/payment/key/${encodeURIComponent(apiKey)}`);
}

export function getUsage(apiKey: string): Promise<UsageInfo> {
  return request<UsageInfo>(`/api/payment/key/${encodeURIComponent(apiKey)}/usage`, {
    headers: { 'x-api-key': apiKey },
  });
}

export function createCheckout(apiKey: string, targetPlanId: number, returnUrl?: string): Promise<CheckoutResult> {
  return postJson<CheckoutResult>(
    '/api/payment/checkout',
    { targetPlanId, ...(returnUrl ? { returnUrl } : {}) },
    { 'x-api-key': apiKey },
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/unit/services/subscriptionApi.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/subscriptionApi.ts tests/unit/services/subscriptionApi.test.ts
git commit -m "feat(subscription): add SGW client (auth/verify, plans, key-info, usage, checkout)"
```

---

## Task 3: Interop guard — lock the signMessage scheme against the golden vector

**Files:**
- Test: `tests/unit/services/signMessage-interop.test.ts`

**Interfaces:**
- Consumes: `signMessage`, `recoverPubkeyFromSignature` exported from `@unicitylabs/sphere-sdk` core crypto.

**Why:** the SGW backend recovers the signer pubkey from the signature. This test pins the exact scheme (double-SHA256 prefix, `v=31+recid`) so an SDK version bump that changes it fails loudly here rather than silently breaking auth in production.

- [ ] **Step 1: Write the test (this is the deliverable — a regression pin)**

```ts
// tests/unit/services/signMessage-interop.test.ts
import { describe, it, expect } from 'vitest';
// core crypto is re-exported from the SDK root (index.ts): signMessage, recoverPubkeyFromSignature
import { signMessage, recoverPubkeyFromSignature } from '@unicitylabs/sphere-sdk';

// Golden vector — design spec §4.1. Generated from the SDK's documented scheme.
const PRIV = '1111111111111111111111111111111111111111111111111111111111111111';
const PUBKEY = '034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa';
const MESSAGE =
  'unicity:sgw:auth:v1\n' +
  'network=testnet2\n' +
  `pubkey=${PUBKEY}\n` +
  'nonce=f3d94c7a1e8b2f5c9a0d3e6b4f7c8a1d2e5b9c0f3a6d7e8b1c4f5a9d0e3b6c7f\n' +
  'expiresAt=2026-07-02T12:05:00Z';
const EXPECTED_SIG =
  '1f585fe41581eac97482be88d6eb1c904db3697c3ec9ef51a4fe89d91762f90a1d465fda8f4ca3166f245a68ae0dcf069d8c5701ffa4d04ad3ce50c9f074b37ebe';

describe('signMessage interop (SGW backend must match)', () => {
  it('produces the golden v+r+s signature and recovers the pubkey', () => {
    const sig = signMessage(PRIV, MESSAGE);
    expect(sig).toBe(EXPECTED_SIG);
    expect(sig.slice(0, 2)).toBe('1f'); // v = 31 (0x1f), recid 0 — v is FIRST, not Ethereum's 27/28
    expect(recoverPubkeyFromSignature(MESSAGE, sig)).toBe(PUBKEY);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm run test:run -- tests/unit/services/signMessage-interop.test.ts`
Expected: PASS. If it FAILS on the signature equality, the SDK's signing scheme changed — update the spec §4.1 golden vector AND notify the SGW backend dev before shipping. (If the exports are not found at the SDK root, import from `@unicitylabs/sphere-sdk/core` instead — verify the export path with `grep -n "recoverPubkeyFromSignature" node_modules/@unicitylabs/sphere-sdk/dist/index.js`.)

- [ ] **Step 3: Commit**

```bash
git add tests/unit/services/signMessage-interop.test.ts
git commit -m "test(subscription): pin signMessage scheme to golden vector for SGW interop"
```

---

## Task 4: Query keys + subscription hooks

**Files:**
- Modify: `src/sdk/queryKeys.ts:54` (add `subscription` block)
- Create: `src/sdk/hooks/subscription/usePlans.ts`, `useSubscription.ts`, `useSubscriptionUsage.ts`, `useCheckout.ts`, `index.ts`
- Test: `tests/unit/sdk/subscriptionHooks.test.tsx`

**Interfaces:**
- Consumes: `subscriptionApi` functions (Task 2); `getStoredSubscriptionKey` (Task 1); `useSphere()` (existing, exposes `{ sphere }`).
- Produces:
  - `SPHERE_KEYS.subscription.{ all, key, plans, usage }`
  - `usePlans(): UseQueryResult<PlanInfo[]>`
  - `useSubscription(): UseQueryResult<KeyInfo>` (keyed on the stored apiKey)
  - `useSubscriptionUsage(): UseQueryResult<UsageInfo>` (polled every 30s)
  - `useCheckout(): UseMutationResult<CheckoutResult, Error, { targetPlanId: number; returnUrl?: string }>`

- [ ] **Step 1: Add query keys**

In `src/sdk/queryKeys.ts`, add before the closing `} as const;` (after the `market` block, line 54):

```ts
  subscription: {
    all: ['sphere', 'subscription'] as const,
    key: (apiKey: string) => ['sphere', 'subscription', 'key', apiKey] as const,
    plans: ['sphere', 'subscription', 'plans'] as const,
    usage: (apiKey: string) => ['sphere', 'subscription', 'usage', apiKey] as const,
  },
```

- [ ] **Step 2: Write the failing test**

```tsx
// tests/unit/sdk/subscriptionHooks.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('@/services/subscriptionApi', () => ({
  getPlans: vi.fn(async () => [{ planId: 1, name: 'basic', requestsPerSecond: 5, requestsPerDay: 50000, price: '1000000' }]),
  getUsage: vi.fn(async () => ({ perDay: { limit: 50000, used: 1, remaining: 49999, resetAt: null }, perSecond: { limit: 5, remaining: 5 } })),
  getKeyInfo: vi.fn(async () => ({ status: 'active', expiresAt: null, pricingPlan: null })),
}));
vi.mock('@/config/storageKeys', async (orig) => ({
  ...(await orig<typeof import('@/config/storageKeys')>()),
  getStoredSubscriptionKey: () => 'key_abc',
}));

import { usePlans, useSubscriptionUsage } from '@/sdk/hooks/subscription';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('subscription hooks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('usePlans returns the plan list', async () => {
    const { result } = renderHook(() => usePlans(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe('basic');
  });

  it('useSubscriptionUsage returns usage for the stored key', async () => {
    const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.perDay.remaining).toBe(49999);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:run -- tests/unit/sdk/subscriptionHooks.test.tsx`
Expected: FAIL — `@/sdk/hooks/subscription` not found. (If `@testing-library/react` is missing, install it as a dev dep: `npm i -D @testing-library/react` — verify first with `node -e "require.resolve('@testing-library/react')"`.)

- [ ] **Step 4: Implement the hooks**

```ts
// src/sdk/hooks/subscription/usePlans.ts
import { useQuery } from '@tanstack/react-query';
import { getPlans } from '../../../services/subscriptionApi';
import { SPHERE_KEYS } from '../../queryKeys';

export function usePlans() {
  return useQuery({
    queryKey: SPHERE_KEYS.subscription.plans,
    queryFn: getPlans,
    staleTime: 5 * 60_000,
  });
}
```

```ts
// src/sdk/hooks/subscription/useSubscription.ts
import { useQuery } from '@tanstack/react-query';
import { getKeyInfo } from '../../../services/subscriptionApi';
import { getStoredSubscriptionKey } from '../../../config/storageKeys';
import { SPHERE_KEYS } from '../../queryKeys';

export function useSubscription() {
  const apiKey = getStoredSubscriptionKey();
  return useQuery({
    queryKey: apiKey ? SPHERE_KEYS.subscription.key(apiKey) : SPHERE_KEYS.subscription.all,
    queryFn: () => getKeyInfo(apiKey as string),
    enabled: !!apiKey,
    staleTime: 60_000,
  });
}
```

```ts
// src/sdk/hooks/subscription/useSubscriptionUsage.ts
import { useQuery } from '@tanstack/react-query';
import { getUsage } from '../../../services/subscriptionApi';
import { getStoredSubscriptionKey } from '../../../config/storageKeys';
import { SPHERE_KEYS } from '../../queryKeys';

export function useSubscriptionUsage() {
  const apiKey = getStoredSubscriptionKey();
  return useQuery({
    queryKey: apiKey ? SPHERE_KEYS.subscription.usage(apiKey) : SPHERE_KEYS.subscription.all,
    queryFn: () => getUsage(apiKey as string),
    enabled: !!apiKey,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
```

```ts
// src/sdk/hooks/subscription/useCheckout.ts
import { useMutation } from '@tanstack/react-query';
import { createCheckout } from '../../../services/subscriptionApi';
import { getStoredSubscriptionKey } from '../../../config/storageKeys';

export function useCheckout() {
  return useMutation({
    mutationFn: ({ targetPlanId, returnUrl }: { targetPlanId: number; returnUrl?: string }) => {
      const apiKey = getStoredSubscriptionKey();
      if (!apiKey) throw new Error('No subscription key to upgrade');
      return createCheckout(apiKey, targetPlanId, returnUrl);
    },
  });
}
```

```ts
// src/sdk/hooks/subscription/index.ts
export { usePlans } from './usePlans';
export { useSubscription } from './useSubscription';
export { useSubscriptionUsage } from './useSubscriptionUsage';
export { useCheckout } from './useCheckout';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- tests/unit/sdk/subscriptionHooks.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/sdk/queryKeys.ts src/sdk/hooks/subscription/ tests/unit/sdk/subscriptionHooks.test.tsx
git commit -m "feat(subscription): add query keys + plans/subscription/usage/checkout hooks"
```

---

## Task 5: Dynamic oracle-key resolution (pure helper)

**Files:**
- Create: `src/sdk/oracleKey.ts`
- Test: `tests/unit/sdk/oracleKey.test.ts`

**Interfaces:**
- Consumes: `getStoredSubscriptionKey` (Task 1), `SUBSCRIPTION_ENABLED` (Task 1).
- Produces: `resolveOracleApiKey(opts: { storedKey: string | null; envKey: string | undefined; subscriptionEnabled: boolean }): string | undefined` and a convenience `getActiveOracleApiKey(): string | undefined` that reads live values.

**Why a pure helper:** the resolution rule (use the per-wallet key when the flag is on and a key exists, else the env key) must be unit-testable without React/`import.meta`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/sdk/oracleKey.test.ts
import { describe, it, expect } from 'vitest';
import { resolveOracleApiKey } from '@/sdk/oracleKey';

describe('resolveOracleApiKey', () => {
  it('uses the per-wallet key when enabled and present', () => {
    expect(resolveOracleApiKey({ storedKey: 'key_sub', envKey: 'sk_env', subscriptionEnabled: true })).toBe('key_sub');
  });
  it('falls back to the env key when no stored key', () => {
    expect(resolveOracleApiKey({ storedKey: null, envKey: 'sk_env', subscriptionEnabled: true })).toBe('sk_env');
  });
  it('ignores the stored key when the flag is off', () => {
    expect(resolveOracleApiKey({ storedKey: 'key_sub', envKey: 'sk_env', subscriptionEnabled: false })).toBe('sk_env');
  });
  it('returns undefined when nothing is available', () => {
    expect(resolveOracleApiKey({ storedKey: null, envKey: undefined, subscriptionEnabled: true })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/unit/sdk/oracleKey.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/sdk/oracleKey.ts
/**
 * Resolves which aggregator API key the SDK oracle should use:
 * the per-wallet subscription key when the feature is enabled and one exists,
 * otherwise the static build-time env key (migration fallback).
 */
import { getStoredSubscriptionKey } from '../config/storageKeys';
import { SUBSCRIPTION_ENABLED } from '../config/subscription';

export function resolveOracleApiKey(opts: {
  storedKey: string | null;
  envKey: string | undefined;
  subscriptionEnabled: boolean;
}): string | undefined {
  if (opts.subscriptionEnabled && opts.storedKey) return opts.storedKey;
  return opts.envKey ?? undefined;
}

export function getActiveOracleApiKey(): string | undefined {
  return resolveOracleApiKey({
    storedKey: getStoredSubscriptionKey(),
    envKey: import.meta.env.VITE_AGGREGATOR_API_KEY,
    subscriptionEnabled: SUBSCRIPTION_ENABLED,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/unit/sdk/oracleKey.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/sdk/oracleKey.ts tests/unit/sdk/oracleKey.test.ts
git commit -m "feat(subscription): pure oracle-key resolver (per-wallet key vs env fallback)"
```

---

## Task 6: Thread the resolved key through `buildProviders` + expose `applySubscriptionKey`

**Files:**
- Modify: `src/sdk/SphereProvider.tsx` (`buildProviders` signature + `initialize` + context value)
- Modify: `src/sdk/SphereContext.ts` (add `applySubscriptionKey` to `SphereContextValue`)

**Interfaces:**
- Consumes: `getActiveOracleApiKey` (Task 5), `setStoredSubscriptionKey` (Task 1), `reinitialize` (existing `initialize`).
- Produces: `applySubscriptionKey(apiKey: string): Promise<void>` on the Sphere context — persists the key and re-inits Sphere so the oracle rebuilds with it.

- [ ] **Step 1: Parametrize `buildProviders`**

In `src/sdk/SphereProvider.tsx`, change the signature and the oracle line (currently line 121 and 126):

```ts
function buildProviders(network: NetworkType, apiKey?: string): SphereAppProviders {
  const base = createBrowserProviders({
    network,
    // Per-wallet subscription key when provided; else the static env key (fallback).
    oracle: { apiKey: apiKey ?? import.meta.env.VITE_AGGREGATOR_API_KEY },
    price: { platform: 'coingecko', baseUrl: COINGECKO_BASE_URL, cacheTtlMs: 5 * 60_000 },
    groupChat: true,
    market: true,
    ...getIpfsConfig(),
  });
  // ...unchanged below
```

- [ ] **Step 2: Use the resolved key in `initialize`**

Add the import at the top of the file:

```ts
import { getActiveOracleApiKey } from './oracleKey';
import { setStoredSubscriptionKey } from '../config/storageKeys';
```

In `initialize()`, replace the `buildProviders(network)` call (line 197) with:

```ts
      const browserProviders = buildProviders(network, getActiveOracleApiKey());
```

- [ ] **Step 3: Add `applySubscriptionKey` to the provider**

In `SphereProvider`, add this callback (near `toggleIpfs`, ~line 492):

```ts
  const applySubscriptionKey = useCallback(async (apiKey: string) => {
    setStoredSubscriptionKey(apiKey);
    // Rebuild providers (oracle) with the new key and re-init the SDK.
    await initialize(0, true);
  }, [initialize]);
```

Add it to the `value` object (the `SphereContextValue` literal, ~line 500):

```ts
    applySubscriptionKey,
```

- [ ] **Step 4: Extend the context type**

In `src/sdk/SphereContext.ts`, add to the `SphereContextValue` interface:

```ts
  /** Persist a per-wallet subscription API key and re-init the SDK oracle with it. */
  applySubscriptionKey: (apiKey: string) => Promise<void>;
```

- [ ] **Step 5: Verify the type-check and existing tests pass**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run test:run`
Expected: all existing tests still PASS (no behavior change when flag off / no stored key: `getActiveOracleApiKey()` returns the env key exactly as before).

- [ ] **Step 6: Commit**

```bash
git add src/sdk/SphereProvider.tsx src/sdk/SphereContext.ts
git commit -m "feat(subscription): thread per-wallet key into buildProviders + applySubscriptionKey"
```

---

## Task 7: Plan-capabilities onboarding screen

**Files:**
- Create: `src/components/wallet/onboarding/components/PlanCapabilitiesScreen.tsx`
- Modify: `src/components/wallet/onboarding/components/index.ts`

**Interfaces:**
- Consumes: `PlanInfo` (Task 2).
- Produces: `PlanCapabilitiesScreen` — props `{ plan: PlanInfo | null; created: boolean; onContinue: () => void; isBusy?: boolean }`.

- [ ] **Step 1: Implement the screen (follow the MnemonicBackupScreen motion/style pattern)**

```tsx
// src/components/wallet/onboarding/components/PlanCapabilitiesScreen.tsx
import { motion } from 'framer-motion';
import { Sparkles, Check } from 'lucide-react';
import type { PlanInfo } from '../../../../services/subscriptionApi';
import { Button } from '../../ui';

interface PlanCapabilitiesScreenProps {
  plan: PlanInfo | null;
  created: boolean;
  onContinue: () => void;
  isBusy?: boolean;
}

export function PlanCapabilitiesScreen({ plan, created, onContinue, isBusy }: PlanCapabilitiesScreenProps) {
  return (
    <motion.div
      key="planCapabilities"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.1 }}
      className="flex flex-col h-full px-6 py-8"
    >
      <div className="flex flex-col items-center text-center gap-3 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-orange-500" />
        </div>
        <h2 className="text-xl font-semibold">
          {created ? 'Your plan is ready' : 'Subscription restored'}
        </h2>
        <p className="text-sm text-neutral-500 dark:text-white/45">
          {plan ? `You're on the ${plan.name} plan.` : 'Your subscription is active.'}
        </p>
      </div>

      {plan && (
        <div className="space-y-3 mb-8">
          <Capability label={`${plan.requestsPerDay.toLocaleString()} transactions per day`} />
          <Capability label={`Up to ${plan.requestsPerSecond} per second`} />
        </div>
      )}

      <div className="mt-auto">
        <Button variant="primary" fullWidth loading={isBusy} onClick={onContinue}>
          Enter Wallet
        </Button>
      </div>
    </motion.div>
  );
}

function Capability({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-white/4 rounded-2xl">
      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
```

- [ ] **Step 2: Export it**

In `src/components/wallet/onboarding/components/index.ts`, add:

```ts
export { PlanCapabilitiesScreen } from './PlanCapabilitiesScreen';
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/wallet/onboarding/components/PlanCapabilitiesScreen.tsx src/components/wallet/onboarding/components/index.ts
git commit -m "feat(subscription): add plan-capabilities onboarding screen"
```

---

## Task 8: Provision the key at onboarding + route to the capabilities screen

**Files:**
- Modify: `src/components/wallet/onboarding/hooks/useOnboardingFlow.ts`
- Modify: `src/components/wallet/onboarding/CreateWalletFlow.tsx`

**Interfaces:**
- Consumes: `provisionOrRecoverKey`, `ProvisionResult`, `PlanInfo` (Task 2); `applySubscriptionKey` (Task 6, via `useSphere()`); `SUBSCRIPTION_ENABLED` (Task 1); `PlanCapabilitiesScreen` (Task 7).
- Produces: onboarding step `"planCapabilities"`; hook returns `planInfo: PlanInfo | null`, `planCreated: boolean`.

**Behavior:** at the single convergence point `doFinalizeWallet`, when the flag is on, provision-or-recover the key, persist+apply it, then show the capabilities screen; its Continue finishes finalization. When the flag is off (or provisioning throws), skip straight to the existing finalize (env-key fallback) so onboarding never breaks.

- [ ] **Step 1: Add the step to the union**

In `useOnboardingFlow.ts`, extend the `OnboardingStep` union (lines 15-24):

```ts
export type OnboardingStep =
  | "start" | "restoreMethod" | "restore" | "importFile"
  | "passwordPrompt" | "addressSelection" | "nametag"
  | "processing" | "mnemonicBackup" | "planCapabilities";
```

- [ ] **Step 2: Add hook state + imports**

Near the other imports:

```ts
import { provisionOrRecoverKey, type PlanInfo } from '../../../../services/subscriptionApi';
import { SUBSCRIPTION_ENABLED } from '../../../../config/subscription';
```

`useSphere()`/`useSphereContext()` is already used in this hook to get `createWallet`, `importWallet`, `finalizeWallet`, etc. Add `applySubscriptionKey` to that destructure.

Add state alongside the other `useState`s (~lines 134-142):

```ts
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [planCreated, setPlanCreated] = useState(false);
```

- [ ] **Step 3: Provision inside a new async finalize path**

Replace the body of `doFinalizeWallet` (lines 584-592) — keep the existing finalize as an inner function and gate provisioning in front of it:

```ts
  const finishFinalize = useCallback(() => {
    finalizeWallet(importedSphereRef.current ?? undefined);
    importedSphereRef.current = null;
    isCreateFlowRef.current = false;
    queryClient.removeQueries({ queryKey: SPHERE_KEYS.all });
    window.dispatchEvent(new Event("wallet-loaded"));
    window.dispatchEvent(new Event("wallet-updated"));
    setStep("start");
  }, [queryClient, finalizeWallet]);

  // Provision/recover the subscription key, then show capabilities. On any
  // failure (or flag off) fall through to finalize with the env-key fallback.
  const doFinalizeWallet = useCallback(async () => {
    const active = importedSphereRef.current ?? sphere;
    if (SUBSCRIPTION_ENABLED && active) {
      try {
        const result = await provisionOrRecoverKey(active);
        await applySubscriptionKey(result.apiKey);
        setPlanInfo(result.plan);
        setPlanCreated(result.created);
        setStep("planCapabilities");
        return;
      } catch (err) {
        // Non-fatal: keep onboarding working on the env-key fallback.
        console.warn('subscription provisioning failed; using fallback key', err);
      }
    }
    finishFinalize();
  }, [sphere, applySubscriptionKey, finishFinalize]);
```

> Note: `sphere` here is the context sphere; for the create flow the freshly created instance lives in `importedSphereRef.current` (set in `handleMintNametag`/`handleSkipNametag`), which is why `active` prefers the ref.

- [ ] **Step 4: Make the callers await the now-async finalize**

`doFinalizeWallet` is called from three places. Update them:
- `handleMnemonicBackupComplete` (lines 614-616): `const handleMnemonicBackupComplete = useCallback(() => { void doFinalizeWallet(); }, [doFinalizeWallet]);`
- The auto-transition effect's restore branch (line ~601): change `doFinalizeWallet()` to `void doFinalizeWallet();`
- `handleCompleteOnboarding` (legacy, line ~610): `void doFinalizeWallet();`

- [ ] **Step 5: Expose the new state + a capabilities-continue handler from the hook**

Add a handler:

```ts
  const handlePlanCapabilitiesContinue = useCallback(() => {
    finishFinalize();
  }, [finishFinalize]);
```

Add `planInfo`, `planCreated`, `handlePlanCapabilitiesContinue` to the hook's return object (the big object at ~lines 767-835).

- [ ] **Step 6: Render the step in `CreateWalletFlow.tsx`**

Destructure the new values from `useOnboardingFlow()` (line 93) and add a render branch immediately after the `mnemonicBackup` block (after line 234), inside the `<AnimatePresence>`:

```tsx
      {step === "planCapabilities" && (
        <PlanCapabilitiesScreen
          plan={planInfo}
          created={planCreated}
          onContinue={handlePlanCapabilitiesContinue}
          isBusy={isBusy}
        />
      )}
```

Add `PlanCapabilitiesScreen` to the existing import from `./components`.

- [ ] **Step 7: Type-check + full test run**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run test:run`
Expected: all PASS.

- [ ] **Step 8: Manual verification (flag on, against an SGW test instance or a stub)**

1. Set `.env`: `VITE_SUBSCRIPTION_ENABLED=true`, `VITE_SUBSCRIPTION_API_URL=<sgw test url>`.
2. `npm run dev`; create a new wallet. Expected: after mnemonic backup, the capabilities screen shows the free plan; `localStorage.sphere_subscription_api_key` is set; DevTools Network shows `/auth/challenge` then `/auth/verify`.
3. Delete the wallet, restore the same mnemonic. Expected: capabilities screen shows "Subscription restored" (`created:false`) and the **same** `apiKey` is returned.
4. Set `VITE_SUBSCRIPTION_ENABLED=false`, reload. Expected: no `/auth/*` calls; sends still work on the env key.

- [ ] **Step 9: Commit**

```bash
git add src/components/wallet/onboarding/hooks/useOnboardingFlow.ts src/components/wallet/onboarding/CreateWalletFlow.tsx
git commit -m "feat(subscription): provision/recover key at onboarding + capabilities screen"
```

---

## Task 9: Dev mock mode — build the UI without a live SGW

**Files:**
- Modify: `src/config/subscription.ts` (add `SUBSCRIPTION_MOCK`)
- Create: `src/services/subscriptionApi.mock.ts`
- Modify: `src/services/subscriptionApi.ts` (short-circuit to canned data when mock is on)
- Modify: `.env.example`
- Test: `tests/unit/services/subscriptionApi.mock.test.ts`

**Interfaces:**
- Consumes: `SUBSCRIPTION_MOCK` (this task); the types from Task 2.
- Produces: `SUBSCRIPTION_MOCK: boolean`; canned `mockPlans`, `mockUsage`, `mockKeyInfo`, `mockProvision`, `mockCheckout`.

**Why:** the SGW `/auth/*`, `/usage`, `/checkout` endpoints may not be live yet. A mock flag makes every client function return realistic canned data so the entire UI (Phases 2–4) is built and visually verified locally. Flipping `VITE_SUBSCRIPTION_MOCK=false` uses the real HTTP paths with **zero UI changes**.

- [ ] **Step 1: Add the flag to config**

Append to `src/config/subscription.ts`:

```ts
/** When true, the SGW client returns canned data instead of hitting the network — lets the UI be built before the backend is live. */
export const SUBSCRIPTION_MOCK =
  import.meta.env.VITE_SUBSCRIPTION_MOCK === 'true';
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/unit/services/subscriptionApi.mock.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/config/subscription', async (orig) => ({
  ...(await orig<typeof import('@/config/subscription')>()),
  SUBSCRIPTION_MOCK: true,
}));

import { getPlans, getUsage } from '@/services/subscriptionApi';

describe('subscriptionApi mock mode', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns canned plans without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const plans = await getPlans();
    expect(plans.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns canned usage without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const usage = await getUsage('key_mock');
    expect(usage.perDay.limit).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:run -- tests/unit/services/subscriptionApi.mock.test.ts`
Expected: FAIL — mock not wired; `fetch` is called.

- [ ] **Step 4: Create the canned data module**

```ts
// src/services/subscriptionApi.mock.ts
import type { PlanInfo, UsageInfo, KeyInfo, ProvisionResult, CheckoutResult } from './subscriptionApi';

export const mockPlans: PlanInfo[] = [
  { planId: 0, name: 'free', requestsPerSecond: 2, requestsPerDay: 500, price: '0' },
  { planId: 1, name: 'basic', requestsPerSecond: 5, requestsPerDay: 50000, price: '1000000' },
  { planId: 2, name: 'standard', requestsPerSecond: 10, requestsPerDay: 100000, price: '5000000' },
  { planId: 3, name: 'premium', requestsPerSecond: 20, requestsPerDay: 500000, price: '10000000' },
];

export const mockProvision: ProvisionResult = { apiKey: 'key_mock_free', plan: mockPlans[0], created: true };

export const mockUsage: UsageInfo = {
  perDay: { limit: 500, used: 497, remaining: 3, resetAt: null }, // low remaining → exercises the gate UX
  perSecond: { limit: 2, remaining: 2 },
};

export const mockKeyInfo: KeyInfo = {
  status: 'active',
  expiresAt: '2026-08-01T00:00:00Z',
  pricingPlan: { id: 0, planId: 0, name: 'free', requestsPerSecond: 2, requestsPerDay: 500, price: '0' },
};

export const mockCheckout: CheckoutResult = {
  paymentUrl: 'https://pay.example.test/checkout/mock-session',
  sessionId: 'mock-session',
};
```

- [ ] **Step 5: Short-circuit each client function**

In `src/services/subscriptionApi.ts`, add the imports:

```ts
import { SUBSCRIPTION_API_URL, SUBSCRIPTION_MOCK } from '../config/subscription';
import * as mock from './subscriptionApi.mock';
```

Add a mock guard as the first line of each exported function:

```ts
export async function provisionOrRecoverKey(sphere: Sphere): Promise<ProvisionResult> {
  if (SUBSCRIPTION_MOCK) return mock.mockProvision;
  // ...existing body
}
export async function getPlans(): Promise<PlanInfo[]> {
  if (SUBSCRIPTION_MOCK) return mock.mockPlans;
  // ...existing body
}
export function getKeyInfo(apiKey: string): Promise<KeyInfo> {
  if (SUBSCRIPTION_MOCK) return Promise.resolve(mock.mockKeyInfo);
  // ...existing body
}
export function getUsage(apiKey: string): Promise<UsageInfo> {
  if (SUBSCRIPTION_MOCK) return Promise.resolve(mock.mockUsage);
  // ...existing body
}
export function createCheckout(apiKey: string, targetPlanId: number, returnUrl?: string): Promise<CheckoutResult> {
  if (SUBSCRIPTION_MOCK) return Promise.resolve(mock.mockCheckout);
  // ...existing body
}
```

(`provisionOrRecoverKey` still reads `sphere.identity` in the real path; the mock returns before touching it, so a not-yet-real identity won't break UI demos.)

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test:run -- tests/unit/services/subscriptionApi.mock.test.ts`
Expected: PASS (2 tests). Also re-run Task 2's test — unchanged (mock off by default).

- [ ] **Step 7: Document env var**

Append to `.env.example`:

```env
# Return canned subscription data instead of calling SGW (build the UI before the backend is live)
VITE_SUBSCRIPTION_MOCK=false
```

- [ ] **Step 8: Commit**

```bash
git add src/config/subscription.ts src/services/subscriptionApi.mock.ts src/services/subscriptionApi.ts .env.example tests/unit/services/subscriptionApi.mock.test.ts
git commit -m "feat(subscription): dev mock mode so the UI can be built without a live SGW"
```

---

## Phase 1 Self-Review Checklist (run before handing off)

- [ ] `npm run test:run` — all green.
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm run lint` — clean.
- [ ] Flag OFF path is byte-for-byte the old behavior (env key only, no `/auth/*` calls).
- [ ] Flag ON, provisioning failure → onboarding still completes on the fallback key (no dead-end).

---

## Subsequent Plans (Phases 2–5)

**UI is built NOW, decoupled from the backend.** With Task 9's `VITE_SUBSCRIPTION_MOCK=true`, the client returns canned data, so Phases 2–4 (all the UI) are built and visually verified locally without a live SGW. Going live = flipping `VITE_SUBSCRIPTION_MOCK=false` (and `VITE_SUBSCRIPTION_ENABLED=true`) — **no UI changes**. Phases 2 and 3 have their own full TDD plan files (written alongside this one); Phase 4–5 are scoped below and get their files when their logic lands.

- **Phase 2 — Settings › Subscription UI** → `docs/superpowers/plans/2026-07-02-subscription-key-migration-phase2-settings.md`. `MenuButton` "Subscription" in `SettingsModal.tsx` + `SubscriptionModal` (plan name, `useSubscriptionUsage` progress bars, expiry from `useSubscription`, "Upgrade" button). Reuse `WalletScreen`/`ModalHeader variant="screen"`; card style from `TopUpModal`. Mock-backed; buildable now.
- **Phase 3 — Upgrade modal + checkout UI** → `docs/superpowers/plans/2026-07-02-subscription-key-migration-phase3-upgrade.md`. `UpgradeProvider` mirroring `ConnectProvider`, mounted in `main.tsx`, exposing `openUpgrade(reason?)`. Plans grid (`usePlans`), "Upgrade" → `useCheckout` → open `paymentUrl` in a new tab → poll `useSubscription`/`getKeyInfo` until `pricingPlan.id === targetPlanId` → success toast + `applySubscriptionKey` refresh + query invalidation. Wire the Settings "Upgrade" button to `openUpgrade()`. Mock-backed; buildable now (poll loop is exercised with the mock returning the target plan on the 2nd call).
- **Phase 4 — Pre-send quota gate (needs `/usage` to be authoritative for production).** Port `calculateOptimalSplitSync` to `src/sdk/subscription/commitmentCount.ts` (`predictCommitmentCount(tokens, coinId, amount) → number`), unit-tested for the exact/2–5-combo/greedy+split cases. In `SendModal.handleSend` and `SendIntentModal.handleSend`, before `transfer(...)`: if `predicted > usage.remaining` → `openUpgrade('quota')` + abort. Add reactive `429` detection (`err?.name === 'JsonRpcNetworkError' && err.status === 429`) as a fallback surfacing the same modal. The gate UI/logic is buildable now against the mock (mock `perDay.remaining=3` triggers the gate for a 4+ commitment send).
- **Phase 5 — Cutover.** Remove `VITE_AGGREGATOR_API_KEY` and its Docker/CI/runtime-config wiring; land the onboarding identity/nametag split (init-without-nametag → provision → rebuild providers → `registerNametag`) so minting no longer needs the env fallback; make provisioning failure a hard onboarding error (with retry) instead of a silent fallback. Requires the live SGW.

- **Phase 2 — Settings › Subscription (needs `/usage`).** Add a `MenuButton` "Subscription" to `SettingsModal.tsx` + a `SubscriptionModal` (plan name, `useSubscriptionUsage` progress bars, expiry from `useSubscription`, "Upgrade" button). Reuse `WalletScreen`/`ModalHeader variant="screen"`; card style from `TopUpModal`.
- **Phase 3 — Upgrade modal + checkout redirect (needs `/checkout`).** `UpgradeProvider` mirroring `ConnectProvider`, mounted in `main.tsx`, exposing `openUpgrade(reason?)`. Plans grid (`usePlans`), "Upgrade" → `useCheckout` → open `paymentUrl` in a new tab → poll `useSubscription`/`getKeyInfo` until `pricingPlan.id === targetPlanId` → success toast + `applySubscriptionKey` refresh + query invalidation. Wire the Settings "Upgrade" button to `openUpgrade()`.
- **Phase 4 — Pre-send quota gate (needs `/usage`).** Port `calculateOptimalSplitSync` to `src/sdk/subscription/commitmentCount.ts` (`predictCommitmentCount(tokens, coinId, amount) → number`), unit-tested for the exact/2–5-combo/greedy+split cases. In `SendModal.handleSend` and `SendIntentModal.handleSend`, before `transfer(...)`: if `predicted > usage.remaining` → `openUpgrade('quota')` + abort. Add reactive `429` detection (`err?.name === 'JsonRpcNetworkError' && err.status === 429`) as a fallback surfacing the same modal.
- **Phase 5 — Cutover.** Remove `VITE_AGGREGATOR_API_KEY` and its Docker/CI/runtime-config wiring; land the onboarding identity/nametag split (init-without-nametag → provision → rebuild providers → `registerNametag`) so minting no longer needs the env fallback; make provisioning failure a hard onboarding error (with retry) instead of a silent fallback.
