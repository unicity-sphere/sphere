# Subscription-Key Migration — Design Spec

**Date:** 2026-07-02
**Status:** Draft for review
**Scope owner (this repo):** `unicity-agentsphere` (Sphere wallet). The subscription API (`aggregator-subscription`, "SGW") is built by a separate developer against the contract defined here.

---

## 1. Goal

Replace the single static `AGGREGATOR_API_KEY` (baked into the build) with a **per-wallet subscription key** obtained from the subscription gateway (SGW). The wallet must:

1. Obtain a personal API key on a **free plan** at wallet **creation** and recover the same key on **restore** (identity-bound challenge/verify).
2. Show the user their **plan capabilities** after onboarding, and a **Subscription** section in Settings (plan, usage, expiry, upgrade).
3. **Gate token sends** against the subscription's remaining quota *before* spending, offering "upgrade or wait".
4. Let the user **upgrade** via a plans modal in Sphere that **redirects to an external payment page** (third-party payment provider, other currencies — not a Sphere-wallet token payment).

Sphere changes live in this repo only. The SGW API changes are a coordinated dependency (contract in §5–6).

---

## 2. Background: what exists today (verified)

- **The API key gates the aggregator write path.** `X-API-Key` is required only for the `certification_request` JSON-RPC method — the write call behind **every** L3 token send/mint. It is sent by the SDK's `AggregatorClient` on `certification_request` only (`sphere-sdk` `oracle/UnicityAggregatorProvider.ts:148,193`; state-transition-sdk `AggregatorClient.submitCertificationRequest`).
- **The key is a build-time constant, frozen at `Sphere.init`.** `buildProviders()` bakes `import.meta.env.VITE_AGGREGATOR_API_KEY` into the oracle provider at [SphereProvider.tsx:126](../../../src/sdk/SphereProvider.tsx#L126); it is captured `private readonly` in `AggregatorClient`. **No runtime setter exists** — a dynamic key requires rebuilding the provider bundle and re-running `Sphere.init`.
- **A plan is a rate limit, not a balance.** Plans define `requestsPerSecond` (5/10/20/50) and `requestsPerDay` (50k–1M), refilled continuously (bucket4j greedy refill — *not* a midnight reset). Subscription lasts 30 days.
- **Commitment count of one send** = `tokensToTransferDirectly.length + (requiresSplit ? 3 : 0)` (`sphere-sdk` dist `PaymentsModule.send`; split = 1 burn + 2 mints). This is exactly the "2 tokens → 2 commitments" scenario.
- **The current SGW public API is insufficient for these flows** and must be extended (§5):
  - No public JSON endpoint to provision a usable (plan-bearing) key. `POST /generate` returns HTML + a **planless** key that 401s on `certification_request`.
  - No public usage/quota endpoint (`GET /api/payment/key/{apiKey}` returns plan + expiry, no counters). Live usage exists only at admin-only `GET /admin/api/utilization`.
  - `POST /api/payment/complete` returns **501** (in-wallet UCT payment path is disabled). No hosted payment page exists anywhere.

---

## 3. Confirmed product decisions

| # | Decision | Choice |
|---|---|---|
| D1 | First key at creation | **Per-wallet key on a free plan**, provisioned via SGW; wallet can send immediately. |
| D2 | Key recovery on restore | **Identity-bound** via challenge/verify — SGW returns the key bound to the wallet's identity (get-or-create). |
| D3 | Upgrade payment UX | **Redirect to an external hosted payment page** returned by SGW (`paymentUrl`). Payment is made off-Sphere (MetaMask/other, other currencies). No UCT/`/complete` flow. |
| D4 | Pre-send quota gate | **Proactive** via a new SGW usage endpoint; reactive `429` catch as a safety net. |

---

## 4. Authentication flow (agreed with backend dev)

Identity-bound challenge/verify. Used **only** for bootstrap (provision/recover the key). All other authenticated SGW endpoints use the returned `apiKey` via the `X-API-Key` header — **no separate bearer/session token.**

```
1. POST /auth/challenge   { pubkey }                       → { nonce, challenge, expiresAt }
2. Wallet signs `challenge` with its identity private key  (sphere.signMessage)
3. POST /auth/verify      { nonce, signature }             → { apiKey, plan, created }
```

- SGW stores one `auth_challenges` row per challenge (`nonce` PK, `pubkey`, `challenge`, `expires_at = now()+5min`, `used_at`), single-use, plus a cron to purge expired rows.
- `challenge` binds `network`, `pubkey`, `nonce`, `expiresAt` (anti-replay, anti-cross-network).
- On `verify`, SGW **recovers** the pubkey from the signature, checks it against the challenge row's pubkey, then **get-or-creates** a free-plan key for that identity and returns it. `created` distinguishes new vs recovered.
- **`plan` should be returned as an object** (`{planId,name,requestsPerSecond,requestsPerDay,price}`) so the wallet can render capabilities without a second call.

### 4.1 Signature scheme (CRITICAL — non-standard, backend must match exactly)

Source of truth: `sphere-sdk/core/crypto.ts` (`hashSignMessage` / `signMessage` / `recoverPubkeyFromSignature`). **This is not Ethereum `ecrecover`.**

```
DIGEST (double-SHA256 over a Bitcoin-style length-prefixed preimage):
  prefix   = "Sphere Signed Message:\n"                 // UTF-8, 23 bytes
  preimage = varint(len(prefix)) ++ prefix ++ varint(len(msg)) ++ msg    // msg = challenge string, UTF-8
  varint   = Bitcoin compact size (n<0xfd → 1 byte; 0xfd..0xffff → 0xfd ++ uint16LE)
  digest   = SHA256(SHA256(preimage))                   // 32 bytes

SIGNATURE:
  ECDSA secp256k1 over `digest`, canonical (low-S).
  Wire format = 130 hex = v(1) ++ r(32) ++ s(32)        // v FIRST
  v = 31 + recid,  recid ∈ [0..3]   →   recid = v_byte - 31   (v_byte ∈ 0x1f..0x22)

RECOVERY (server):
  recover secp256k1 pubkey from (digest, r, s, recid) → COMPRESSED 33-byte pubkey (02/03) = 66 hex
  compare to auth_challenges.pubkey.
```

**Golden test vector** (backend validates its impl against this):

```
privateKey  = 1111111111111111111111111111111111111111111111111111111111111111
pubkey      = 034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa
message     = "unicity:sgw:auth:v1\nnetwork=testnet2\npubkey=034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa\nnonce=f3d94c7a1e8b2f5c9a0d3e6b4f7c8a1d2e5b9c0f3a6d7e8b1c4f5a9d0e3b6c7f\nexpiresAt=2026-07-02T12:05:00Z"
                # 212 UTF-8 bytes → single-byte varint 0xd4
digest      = 80ee940391f92fbf1f9b0a5a5a4ca2c6ed2beea117b331d6ef9231c5601c43cf
signature   = 1f585fe41581eac97482be88d6eb1c904db3697c3ec9ef51a4fe89d91762f90a1d465fda8f4ca3166f245a68ae0dcf069d8c5701ffa4d04ad3ce50c9f074b37ebe
                # v=1f(31)→recid 0 ; r=585f…f90a1d ; s=465f…b37ebe
recoverPubkey(message, signature) == pubkey
```

### 4.2 Which identity signs

The wallet signs with a **stable primary identity** key (deterministic from the mnemonic), *not* a per-address/account key — so the subscription survives restore and is unaffected by switching the active payment address. **Open item O1:** confirm `sphere.identity.chainPubkey` is stable across address switches, or select the account-0/root identity explicitly for subscription auth.

---

## 5. SGW API contract (dependency — built by the backend dev)

| Endpoint | Status | Purpose / shape |
|---|---|---|
| `POST /auth/challenge` | **new** | `{pubkey}` → `{nonce, challenge, expiresAt}` |
| `POST /auth/verify` | **new** | `{nonce, signature}` → `{apiKey, plan:{…}, created}` (get-or-create free-plan key by identity) |
| `GET /api/payment/plans` | exists | `{availablePlans:[{planId,name,requestsPerSecond,requestsPerDay,price}]}` — plans modal |
| `GET /api/payment/key/{apiKey}` | exists | `{status, expiresAt, pricingPlan}` — settings + post-payment poll |
| `GET /api/payment/key/{apiKey}/usage` | **new** | Auth: `X-API-Key`. → `{perDay:{limit,used,remaining,resetAt}, perSecond:{limit,remaining}}`. Authoritative (needs a real server-side counter; the in-memory rolling counter is insufficient). |
| `POST /api/payment/checkout` | **new** | Auth: `X-API-Key`. `{targetPlanId, returnUrl?}` → `{paymentUrl, sessionId}`. Redirect user to `paymentUrl`; SGW updates the plan server-side after the external provider confirms; wallet polls `key/{apiKey}` until `pricingPlan.id == targetPlanId`. |

Money = decimal strings. `plan`/`pricingPlan` fields use consistent limits so the wallet renders capabilities uniformly.

Notes for the backend dev:
- `X-API-Key` is the sole credential for `usage`/`checkout` (no bearer). Prefer the **header** over URL path for these to avoid access-log leakage.
- The legacy `POST /api/payment/initiate` + `/complete` (in-wallet UCT payment) are **not used** by Sphere and are superseded by `checkout`.

---

## 6. Sphere-side architecture

### 6.1 Subscription API client
`src/services/subscriptionApi.ts` — mirrors the challenge-sign pattern of [userApi.ts:71-113](../../../src/services/userApi.ts#L71). Functions: `provisionOrRecoverKey(sphere)` (challenge→sign→verify), `getPlans()`, `getKeyInfo(apiKey)`, `getUsage(apiKey)`, `createCheckout(apiKey, planId, returnUrl?)`. Base URL from a **new env** `VITE_SUBSCRIPTION_API_URL`.

### 6.2 SDK-adapter hooks
`src/sdk/hooks/subscription/`: `useSubscription` (key + plan + status), `useSubscriptionUsage` (polled), `usePlans`, `useCheckout`. New query-key namespace `SPHERE_KEYS.subscription` in [queryKeys.ts](../../../src/sdk/queryKeys.ts).

### 6.3 Dynamic key wiring
- Parametrize `buildProviders(network, apiKey?)` at [SphereProvider.tsx:121-151](../../../src/sdk/SphereProvider.tsx#L121); line 126 becomes `oracle: { apiKey: apiKey ?? import.meta.env.VITE_AGGREGATOR_API_KEY }` (env key = **fallback** during migration).
- Persist the provisioned key at `storageKeys` `sphere_subscription_api_key` (new). It is *also* always recoverable from identity, so localStorage is a cache, not the source of truth.
- On `initialize()`, if a stored key exists, build providers with it; otherwise fall back to env key. Changing the key = rebuild providers + re-`Sphere.init` (existing `reinitialize`/`deleteWallet` machinery already rebuilds).

### 6.4 Onboarding — provisioning + capabilities screen
Insertion converges at [doFinalizeWallet (useOnboardingFlow.ts:584)](../../../src/components/wallet/onboarding/hooks/useOnboardingFlow.ts#L584), reached by both create and restore.

- **Key-timing / chicken-and-egg (end state, when the env fallback is removed):** the onboarding nametag mint is a `certification_request` needing a valid key, but the key is provisioned *from* the identity that `Sphere.init` generates. Resolve by **splitting** create into: (i) `Sphere.init({autoGenerate:true})` **without** nametag → identity+mnemonic; (ii) `provisionOrRecoverKey()` (identity-bound); (iii) rebuild providers with the key; (iv) `sphere.registerNametag()` separately (the restore path already registers nametag via a separate `registerNametag` call). During migration the env fallback lets the nametag mint work without the split, so the split can land with Phase 5.
- **Capabilities screen:** add step `"planCapabilities"` to the onboarding step union ([useOnboardingFlow.ts:15-24](../../../src/components/wallet/onboarding/hooks/useOnboardingFlow.ts#L15)); new `PlanCapabilitiesScreen` under `src/components/wallet/onboarding/components/`; render branch in `CreateWalletFlow.tsx`; route the two finalize triggers (create: `handleMnemonicBackupComplete`; restore: auto-transition non-create branch) to `"planCapabilities"`, whose Continue calls `doFinalizeWallet`.

### 6.5 Settings — Subscription section
Add a `MenuButton` ("Subscription") to [SettingsModal.tsx](../../../src/components/wallet/L3/modals/SettingsModal.tsx) + sibling `SubscriptionModal` (plan name, usage bars from `useSubscriptionUsage`, expiry, "Upgrade" button). Reuse `WalletScreen` + `ModalHeader variant="screen"`; `TopUpModal` is the plan-card template.

### 6.6 Upgrade / plans modal (global trigger)
Triggered from both Settings and the send-flow gate → a global `UpgradeProvider` mirroring `ConnectProvider` (`src/components/connect/ConnectProvider.tsx`), exposing `openUpgrade(reason?)`, mounted in `main.tsx`. Renders plan cards (`TopUpModal` pattern). "Upgrade" → `createCheckout` → open `paymentUrl` (new tab) → poll `getKeyInfo` until plan changes → success + toast + query invalidation.

### 6.7 Pre-send quota gate
- Insert in [SendModal.handleSend (SendModal.tsx:143-164)](../../../src/components/wallet/L3/modals/SendModal.tsx#L143), before `await transfer(...)`; also in `SendIntentModal.handleSend` (dApp-connect path).
- **Predict commitment count** for `{coinId, amount}` by a faithful port of the SDK's `calculateOptimalSplitSync` over `useTokens()` data (formula: `k whole tokens + (split ? 3 : 0)`), unit-tested against known fragmentation scenarios. (Follow-up: upstream a `payments.quote()` to the SDK to remove drift risk — **O2**.)
- Compare predicted count to `usage.remaining` (per-second **and** per-day, min). If insufficient → `openUpgrade('quota')` / "upgrade or wait for reset", abort the send.
- **Reactive safety net:** catch the aggregator `429` in `useTransfer`/`SendModal` (`err?.name === 'JsonRpcNetworkError' && err.status === 429`) and surface the same modal. Note: multi-commitment sends can partially spend on a mid-send 429 — the **proactive** gate is the real protection; reactive is fallback only.

---

## 7. Rollout phases (feature-flagged; env key stays as fallback)

Guarded by a `VITE_SUBSCRIPTION_ENABLED` flag; env `AGGREGATOR_API_KEY` remains the fallback until Phase 5. A second flag `VITE_SUBSCRIPTION_MOCK` makes the SGW client return canned data, so **all UI (Phases 2–4) is built and visually verified locally before the backend is live** — going live is a flag flip with no UI changes.

0. **Contract freeze** with backend dev (§4–5). Golden vector validated on the Java side.
1. **Key lifecycle:** `subscriptionApi` client + dynamic-key wiring + provision on create/restore + capabilities screen. Fallback to env key if provisioning fails or flag off.
2. **Settings:** Subscription section + usage display.
3. **Upgrade:** plans modal + `checkout` redirect + poll-to-activate.
4. **Send gate:** proactive quota check + reactive 429.
5. **Cutover:** remove static `VITE_AGGREGATOR_API_KEY` (and its Docker/CI wiring) once the SGW flows are stable; land the onboarding identity/nametag split.

---

## 8. Risks & open items

- **O1** — Confirm a stable identity pubkey for subscription binding across address switches (§4.2).
- **O2** — Commitment-count prediction ports SDK internals; risk of drift across SDK versions. Mitigate with unit tests + a version check; ideally upstream `payments.quote()`.
- **O3** — Usage authority: SGW must expose an authoritative remaining-quota (current in-memory rolling counter is per-instance and non-authoritative). Rolling refill means "resetAt" is approximate; UX copy should say "as limits refill", not "at midnight".
- **O4** — External payment confirmation latency: the wallet only learns of a successful upgrade by polling `key/{apiKey}`; define a poll window + a "check again later" fallback if the provider is slow. Optional SGW webhook/`returnUrl` deep-link to shortcut polling.
- **O5** — dApp-connect and any future SDK-internal send paths (swaps, invoices) bypass the app-level gate; a hard SDK-level gate is out of scope for v1 (app changes only).
- **O6** — Key rotation/revocation UX (expired/revoked key → 401 on send) needs a recovery path (re-provision via challenge/verify).

---

## 9. Testing

- Unit: signature/challenge client; commitment-count predictor (fragmentation scenarios: exact 1-token, 2–5 combo, greedy+split); usage-gate arithmetic.
- Integration: provision-on-create, recover-on-restore (same mnemonic → same key), dynamic-key rebuild + re-init, quota-gate blocks an over-limit send, reactive 429 path.
- Manual/e2e against an SGW test instance once the new endpoints land.
