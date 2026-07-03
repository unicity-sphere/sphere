# Subscription Integration — Handoff / Continuation Brief

**Audience:** the backend developer (and their coding agent) building the subscription gateway (SGW = `aggregator-subscription`), plus anyone continuing the Sphere-side work.
**Status date:** 2026-07-03
**Sphere branch:** `feat/subscription-key-migration` (in `unicity-agentsphere`), tip includes all work below.
**This file is self-contained** — you can act on the API contract in §3–§4 without the Sphere repo. Deeper detail lives in the Sphere design spec: `docs/superpowers/specs/2026-07-02-subscription-key-migration-design.md` and the three plans in `docs/superpowers/plans/`.

---

## 1. What we're building

Replace the single static aggregator API key (`AGGREGATOR_API_KEY`, baked into the Sphere build) with a **per-wallet subscription key** issued by the SGW. The SGW is the reverse proxy that gates the Unicity aggregator's write path (`certification_request`, i.e. every L3 token send/mint) by `X-API-Key` + a subscription plan (rate limits: `requestsPerSecond`, `requestsPerDay`, 30-day validity).

Two repos, two owners:
- **`unicity-agentsphere`** (React wallet, frontend) — **DONE** on this branch, behind feature flags, with a mock layer so the UI runs without a live backend.
- **`aggregator-subscription`** (SGW, Java/Jetty backend) — **TO DO**: implement the 4 new endpoints in §3 to the exact shapes the Sphere client already expects.

## 2. Confirmed product decisions

| # | Decision |
|---|---|
| **D1** | On wallet **creation**, the wallet gets a **per-wallet key on a free plan** (so it can send immediately). |
| **D2** | On wallet **restore**, the same key is recovered **by identity** (challenge/verify). Provisioning is one idempotent get-or-create. |
| **D3** | **Upgrade payment is external**: SGW returns a hosted `paymentUrl`; the user pays there with MetaMask/other in other currencies. **No in-wallet UCT payment** — the legacy `/api/payment/initiate` + `/complete` flow is NOT used by Sphere. |
| **D4** | Pre-send quota gate is **proactive** via a public usage endpoint (+ reactive 429 as a safety net). |

## 3. API contract the SGW must implement

Base URL is configured in Sphere as `VITE_SUBSCRIPTION_API_URL`. All money fields are **decimal strings** (never JSON numbers). Timestamps are ISO-8601. CORS must allow `X-API-Key` (already in the SGW's default allow-list).

Legend: **NEW** = Sphere depends on it, does not exist yet in `docs/API.md`. **EXISTS** = already documented/implemented.

### 3.1 `POST /auth/challenge` — NEW
Start identity-bound auth. Unauthenticated.
- **Request:** `{ "pubkey": "<66-hex compressed secp256k1>" }`
- **Response 200:** `{ "nonce": "<hex>", "challenge": "<string to sign>", "expiresAt": "<ISO-8601, now+5min>" }`
- Persist one row per challenge (single-use), e.g.:
  ```sql
  CREATE TABLE auth_challenges (
    nonce      CHAR(64)    PRIMARY KEY,
    pubkey     CHAR(66)    NOT NULL,
    challenge  TEXT        NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,   -- now() + 5 min
    used_at    TIMESTAMPTZ             -- NULL = not yet consumed
  );
  ```
- The `challenge` string should bind network + pubkey + nonce + expiry (anti-replay, anti-cross-network). Example content:
  ```
  unicity:sgw:auth:v1
  network=testnet2
  pubkey=<pubkey>
  nonce=<nonce>
  expiresAt=<ISO-8601>
  ```
- Add a cron job to delete expired `auth_challenges` rows.

### 3.2 `POST /auth/verify` — NEW
Verify signature, then **get-or-create** the identity's free-plan key. Unauthenticated (the signature is the credential).
- **Request:** `{ "nonce": "<hex>", "signature": "<130-hex, v+r+s>" }`  (pubkey is NOT sent — recover it, see §4)
- **SGW steps:** look up the `nonce` row (must exist, not expired, not used) → **recover** the pubkey from `(challenge, signature)` per §4 → check it equals the row's `pubkey` → mark `used_at` → find existing key for that pubkey or create a new one on the **free plan** → return it.
- **Response 200:**
  ```json
  { "apiKey": "<key string>",
    "plan": { "planId": 0, "name": "free", "requestsPerSecond": 2, "requestsPerDay": 500, "price": "0" },
    "created": true }
  ```
  - `plan` MUST be an **object** (Sphere renders plan capabilities from it), not a string. Shape = the `PricingPlanInfo` used by `/api/payment/plans` (`planId`, `name`, `requestsPerSecond`, `requestsPerDay`, `price`).
  - `created` = `true` for a brand-new key, `false` when an existing key was recovered.
- This one endpoint serves BOTH create and restore (idempotent). It requires binding key↔identity in the DB (e.g. add a `pubkey` column to `api_keys`, or a join table).
- **Precondition:** a **free/default plan** must exist and be assignable so the returned key is immediately usable for `certification_request` (a plan-less key 401s).

### 3.3 `GET /api/payment/plans` — EXISTS
- **Response 200:** `{ "availablePlans": [ { "planId": <int>, "name": <str>, "requestsPerSecond": <int>, "requestsPerDay": <int>, "price": "<decimal string>" }, ... ] }`
- Sphere uses this for the upgrade modal's plan grid.

### 3.4 `GET /api/payment/key/{apiKey}` — EXISTS
- Auth today: none (the `{apiKey}` in the path is a lookup value). Sphere ALSO sends `X-API-Key: {apiKey}` (harmless; if you unify auth later, keep accepting it).
- **Response 200:**
  ```json
  { "status": "active",
    "expiresAt": "<ISO-8601 | null>",
    "pricingPlan": { "id": <int>, "name": <str>, "requestsPerSecond": <int>, "requestsPerDay": <int>, "price": "<decimal string>" } | null }
  ```
- ⚠️ **Field-name gotcha (already handled on the Sphere side):** here the plan node uses **`id`**, whereas `/api/payment/plans` uses **`planId`** for the same value (documented in `docs/API.md`). Sphere's current-plan detection reads `pricingPlan.id`; keep it that way. (See commit "current-plan detection uses key-info `id`, not `planId`".)
- Sphere uses this for the Settings › Subscription screen and for **polling** after an external payment (until `pricingPlan.id === targetPlanId`).

### 3.5 `GET /api/payment/key/{apiKey}/usage` — NEW
Authoritative remaining quota. Auth: `X-API-Key: {apiKey}` header.
- **Response 200:**
  ```json
  { "perDay":    { "limit": <int>, "used": <int>, "remaining": <int>, "resetAt": "<ISO-8601 | null>" },
    "perSecond": { "limit": <int>, "remaining": <int> } }
  ```
- Must be **authoritative** (fleet-aggregated if running distributed). The existing in-memory `RateLimitEntry.consumedPerDay` / `X-RateLimit-Remaining` header are per-instance and non-authoritative — a real counter (or the bucket4j remaining) is needed. `resetAt` may be `null` if the refill is rolling rather than a calendar reset (Sphere copy says "as limits refill", not "at midnight").
- Sphere uses this for the usage bars AND for the future pre-send quota gate (Phase 4).

### 3.6 `POST /api/payment/checkout` — NEW
Start an external (redirect) payment. Auth: `X-API-Key: {apiKey}` header.
- **Request:** `{ "targetPlanId": <int>, "returnUrl": "<optional string>" }`
- **Response 200:** `{ "paymentUrl": "<hosted checkout URL>", "sessionId": "<string>" }`
- Sphere opens `paymentUrl` in a new tab; after the external provider confirms, SGW updates the plan server-side; Sphere **polls** `GET /api/payment/key/{apiKey}` until the plan changes. An optional webhook/return-URL that Sphere can deep-link back to would let us shortcut the polling, but polling is the baseline.
- Replaces the legacy `/initiate` + `/complete` (UCT-in-wallet) flow, which Sphere does not call.

### 3.7 Auth model summary for the SGW
- The **only** signature-authenticated endpoints are `/auth/challenge` + `/auth/verify` (bootstrap: you can't present a key before you have one).
- Every other authenticated call uses the returned **`apiKey` via the `X-API-Key` header** — no separate bearer/session token. (This was the backend dev's proposal; confirmed good. Prefer the header over the URL path to avoid access-log leakage.)

## 4. Sphere `signMessage` scheme — CRITICAL for `/auth/verify`

The SGW must **recover** the signer's pubkey from the signature. **This is NOT Ethereum `ecrecover`.** Source of truth: `sphere-sdk/core/crypto.ts` (`hashSignMessage` / `signMessage` / `recoverPubkeyFromSignature`). Pinned by a Sphere test that still passes on SDK **0.11.0** (scheme unchanged).

```
DIGEST (Bitcoin-style double-SHA256 over a length-prefixed preimage):
  prefix   = "Sphere Signed Message:\n"                 // UTF-8, 23 bytes
  preimage = varint(len(prefix)) ++ prefix ++ varint(len(msg)) ++ msg   // msg = the challenge string, UTF-8
  varint   = Bitcoin compact size (n<0xfd → 1 byte; 0xfd..0xffff → 0xfd ++ uint16LE)   // msg>252 bytes → 3-byte varint
  digest   = SHA256(SHA256(preimage))                   // 32 bytes

SIGNATURE:
  ECDSA secp256k1 over `digest`, canonical (low-S).
  Wire = 130 hex = v(1) ++ r(32) ++ s(32)               // v is FIRST
  v = 31 + recid,  recid ∈ [0..3]   →   recid = v_byte - 31   (v_byte ∈ 0x1f..0x22)

RECOVERY (server):
  recover secp256k1 pubkey from (digest, r, s, recid) → COMPRESSED 33-byte pubkey (02/03) = 66 hex
  compare to auth_challenges.pubkey.   // Java: BouncyCastle + the custom digest above
```

**Golden test vector** (validate your Java impl against this exact case):
```
privateKey  = 1111111111111111111111111111111111111111111111111111111111111111
pubkey      = 034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa
message     = "unicity:sgw:auth:v1\nnetwork=testnet2\npubkey=034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa\nnonce=f3d94c7a1e8b2f5c9a0d3e6b4f7c8a1d2e5b9c0f3a6d7e8b1c4f5a9d0e3b6c7f\nexpiresAt=2026-07-02T12:05:00Z"
                # 212 UTF-8 bytes → single-byte varint 0xd4
digest      = 80ee940391f92fbf1f9b0a5a5a4ca2c6ed2beea117b331d6ef9231c5601c43cf
signature   = 1f585fe41581eac97482be88d6eb1c904db3697c3ec9ef51a4fe89d91762f90a1d465fda8f4ca3166f245a68ae0dcf069d8c5701ffa4d04ad3ce50c9f074b37ebe
                # v=1f(31)→recid 0 ; r=585f…f90a1d ; s=465f…b37ebe
recoverPubkey(message, signature) MUST == pubkey
```

## 5. How Sphere consumes each endpoint (client behavior)

All in `unicity-agentsphere/src/services/subscriptionApi.ts` (the single client) — these are the exact requests the SGW will receive:
- `provisionOrRecoverKey(sphere)` → `POST /auth/challenge {pubkey}` → `sphere.signMessage(challenge)` → `POST /auth/verify {nonce, signature}`. Called once at onboarding finalize (create + restore).
- `getPlans()` → `GET /api/payment/plans`. Called only when the upgrade modal is open AND the feature flag is on.
- `getKeyInfo(apiKey)` → `GET /api/payment/key/{apiKey}` with `X-API-Key`. Settings screen + post-checkout polling.
- `getUsage(apiKey)` → `GET /api/payment/key/{apiKey}/usage` with `X-API-Key`. Polled ~30s while the Subscription screen is open.
- `createCheckout(apiKey, targetPlanId, returnUrl?)` → `POST /api/payment/checkout` with `X-API-Key`.

Non-2xx responses throw; the app degrades gracefully (onboarding falls back to the env key if provisioning fails — see §7).

## 6. Current status

### 6.1 Sphere side — DONE (this branch, behind flags)
Implemented via 15 TDD tasks across 3 phases, each reviewed (spec + quality); a final whole-branch review + fixes; SDK aligned to 0.11.0; build + 90/90 tests + lint all green.
- **Phase 1 — key lifecycle:** SGW client (`src/services/subscriptionApi.ts`) + mock (`subscriptionApi.mock.ts`); config/flags (`src/config/subscription.ts`, `src/config/storageKeys.ts`); TanStack Query hooks (`src/sdk/hooks/subscription/`); pure oracle-key resolver (`src/sdk/oracleKey.ts`); dynamic-key wiring in `src/sdk/SphereProvider.tsx` (`buildProviders(network, apiKey?)`, `applySubscriptionKey`); onboarding provisioning + `PlanCapabilitiesScreen` (`src/components/wallet/onboarding/`); a `signMessage` golden-vector interop test.
- **Phase 2 — Settings UI:** `SubscriptionModal` (plan, usage bars, expiry) + a "Subscription" row in `SettingsModal`; pure `usagePercent`/`formatExpiry` (`src/sdk/subscription/usage.ts`).
- **Phase 3 — Upgrade UI:** global `UpgradeProvider`/`UpgradeModal` (plan grid → `checkout` → open `paymentUrl` → `pollForPlan` → activate) mounted in `src/main.tsx`; wired from Settings.

### 6.2 SGW / backend side — TO DO
1. `POST /auth/challenge` + `POST /auth/verify` (§3.1–3.2) with the recovery in §4 — validate against the golden vector.
2. A **free/default plan** + key↔identity binding so `/auth/verify` returns a usable key.
3. `GET /api/payment/key/{apiKey}/usage` (§3.5) — authoritative counters.
4. `POST /api/payment/checkout` (§3.6) — integrate the external payment provider, return `paymentUrl`; update the plan on confirmation.
5. `auth_challenges` table + expiry cron.
6. Keep the `id` vs `planId` field names as they are (§3.4); Sphere already matches.

### 6.3 Pending on the Sphere side (future phases — not yet built)
- **Phase 4 — pre-send quota gate:** predict a send's commitment count (`tokensToTransferDirectly + (split?3:0)`) and block over-quota sends before spending (needs §3.5 to be authoritative); reactive 429 fallback. Insertion points: `SendModal.handleSend`, `SendIntentModal.handleSend`.
- **Phase 5 — cutover:** remove the static `VITE_AGGREGATOR_API_KEY` and its Docker/CI wiring; split onboarding so the key is provisioned BEFORE the nametag mint (init-without-nametag → provision → rebuild providers → `registerNametag`) so the per-wallet key is used from the first init; make provisioning failure a hard onboarding error with retry.

### 6.4 Open questions (design spec §8)
- **O1** — confirm a stable primary-identity pubkey is used for subscription binding (so switching the active address doesn't "lose" the key).
- **O3** — usage endpoint authority (fleet-aggregated; rolling vs calendar reset).
- **O4** — external-payment confirmation: polling window + optional webhook/return-URL.
- **O5** — dApp-connect/SDK-internal send paths bypass the app-level gate (out of scope for v1).
- **O6** — key rotation/revocation UX (expired/revoked key → 401 → re-provision).

## 7. Decisions & gotchas already baked in (don't re-litigate)
- **Feature flags:** `VITE_SUBSCRIPTION_ENABLED` gates ALL new behavior; when off (the default) the app is byte-for-byte the pre-feature behavior (oracle uses `VITE_AGGREGATOR_API_KEY`). `VITE_SUBSCRIPTION_MOCK` makes the client return canned data (no network).
- **Env key stays** as the fallback until Phase 5. The per-wallet key is **persisted at onboarding and becomes the active oracle key on the next SDK `initialize()`** (documented Phase-1 tradeoff; env key covers sends meanwhile).
- **Upgrade keeps the same `apiKey`** (only the plan changes) — Sphere invalidates its subscription queries and does NOT re-provision.
- **`id` vs `planId`:** key-info uses `id`, plans use `planId` (§3.4) — Sphere matches; keep it.
- **SDK pinned to 0.11.0** (`node_modules` was stale at `0.9.0-dev.0`, which broke `npm run build` repo-wide; realigning fixed it). The `signMessage` scheme is unchanged at 0.11.0.
- **`npx tsc --noEmit` is a no-op in this repo** (root `tsconfig.json` is a solution file with `files: []`). Real type-check = `npm run build` (`tsc -b`) or `npx tsc -p tsconfig.app.json --noEmit`.

## 8. Run & test the Sphere UI without a backend (mock mode)
```bash
cd unicity-agentsphere
VITE_SUBSCRIPTION_ENABLED=true VITE_SUBSCRIPTION_MOCK=true npm run dev -- --port 5199 --strictPort
```
Then: create a wallet → the **"Your plan is ready"** capabilities screen → Settings → **Subscription** (plan + usage bars: mock shows 497/500/day to exercise the near-limit state) → **Upgrade plan** → pick "basic" → mock success. Restore the same mnemonic → **"Subscription restored"**. With the flags off, none of this appears (flag-off invariant).

Verification commands: `npm run build` (tsc + vite), `npm run test:run` (90 tests), `npm run lint`.

## 9. Where everything lives
- **Sphere design spec:** `docs/superpowers/specs/2026-07-02-subscription-key-migration-design.md`
- **Sphere plans (TDD, task-by-task):** `docs/superpowers/plans/2026-07-02-subscription-key-migration-phase{1,2-settings,3-upgrade}.md`
- **Sphere client (the real request shapes):** `src/services/subscriptionApi.ts` (+ `.mock.ts`)
- **SGW backend:** `../aggregator-subscription/` — start at `docs/API.md`, `src/main/java/org/unicitylabs/proxy/PaymentHandler.java`, `service/PaymentService.java`, `service/ApiKeyService.java`, `src/main/resources/db/migration/`.
