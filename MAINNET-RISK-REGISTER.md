# Pre-Mainnet Risk Register & Findings

Generated 2026-07-15 from two adversarial multi-agent code sweeps (app + sdk/wallet-api as a
unit + a wallet-api concurrency pass), followed by hand-verification of the criticals.

**Repos:** `sphere` (React app), `sphere-sdk` (client SDK, published 0.11.12), `wallet-api`
(TypeScript server). They operate as one unit.

## Confidence legend

- ✅ **hand-verified** — re-derived against shipped source with exact line citations (the 4
  criticals + SPHERE-4 + the two filed server items).
- 🤖 **agent-confirmed** — surfaced by a finder and passed a 3-lens adversarial panel, but NOT
  hand-verified. Some may not survive scrutiny; a few were partially refuted. Verify before fixing.

## Key framing: double-PAY, not double-SPEND

The consensus layer's single-spend protection is intact — re-spending the *same* coin is rejected
(`TransferConflictError`). These bugs route *around* it: the client mis-reports a spend that already
committed as a clean "failure," then spends **fresh, different** coins for the same payment. Result:
the **sender** is debited twice (spends 10 for a 5 payment); the recipient is over-credited. Nothing
is minted or stolen from a third party. In sub-cases where the retry would reuse the same coins, the
conflict check catches it → no loss (safe). Loss happens when the retry/resume selects different coins.

---

# FILED ISSUES — ready to implement

## 🔴 Critical double-pays (client-side)

### sphere-sdk#676 — resume re-executes a failed send (abortPending) ✅
- **Mechanism:** on a clean pre-cert failure the handler calls `abortIntent` best-effort
  (`PaymentsModule.ts:2285-2290`). If the POST fails, the local copy goes `aborted`+`abortPending`
  but the **server row stays `open`** (`client.ts:986-989`). The replay that converges it
  (`resyncOpenIntents`) runs **only on a syncEpoch change** (`noteSyncEpoch` → `client.ts:1102`),
  never at a normal sign-in. `Sphere.ts:4666` calls `resumeOpenIntents()` directly, which reads only
  the server `listIntents('open')` (`client.ts:970-971`) and never the local `abortPending`
  (`PaymentsModule.ts:5622-5637`). The failed send restored its sources to `confirmed`
  (`PaymentsModule.ts:2322-2324`), so resume re-runs a real spend.
- **Fix:** in `resumeOpenIntents`, skip/abort any server-`open` intent that is locally
  `aborted`+`abortPending`; and/or drive `resyncOpenIntents` at sign-in, not only on epoch change.

### sphere-sdk#677 — partially-certified send reported as flat failure ✅
- **Mechanism:** `SEND_SYNC_PENDING` is thrown only when
  `onChainCommitComplete && !TransferConflictError && !keepOpen` (`PaymentsModule.ts:2354`). A conflict
  falls to `throw error` (`:2363`) as an outright failure, while the already-certified leg was marked
  `spent` and **journaled for delivery** (`:2318-2321`) — the recipient received it. A full re-send
  overpays by the certified leg.
- **Fix:** on a partial-certification failure, surface a partial/pending-delivery outcome carrying what
  already sent, so the caller re-plans only the remainder under a new transferId.

### sphere#440 — CHECKPOINT_PERSIST_FAILED presented as re-sendable ✅
- **Mechanism:** `CheckpointPersistFailedError` is a **keep-open** error (`sphere-sdk
  PaymentsModule.ts:2276-2280`), so it is excluded from the `SEND_SYNC_PENDING` reassurance
  (`:2354`) and re-thrown raw (`:2363`). App-side `useTransfer.ts` maps only `SEND_SYNC_PENDING`
  (:118) and `CERTIFICATION_UNCONFIRMED` (:126); everything else `throw e` (:157) → `SendModal`
  returns to the confirm step with a live Send button, while the intent stays open and resume
  completes the original.
- **Fix:** extend the `useTransfer` guard to treat `CHECKPOINT_PERSIST_FAILED` (and any keep-open
  certification code) the same as the other two → synthetic pending-success, never re-sendable.
  (Separately: the SDK also emits `transfer:failed` for keep-open cases at `PaymentsModule.ts:2362` —
  arguably wrong, worth a follow-up SDK fix.)

### sphere#441 — paying a payment request has no pending-code guard ✅
- **Mechanism:** `pay()` calls `sphere.payments.payPaymentRequest()` directly with no pending-code
  handling (`useIncomingPaymentRequests.ts:134-145`); it "routes through payments.send()" so it can
  throw `SEND_SYNC_PENDING`/`CERTIFICATION_UNCONFIRMED`. `finally { refresh() }` re-lists the still-
  pending request as payable. Contrast `useTransfer.ts:118-155`, which guards exactly these.
- **Fix:** route `payPaymentRequest` through the same pending-code handling (share the helper); on
  those codes treat as pending-success and mark the request settled so it is not re-presented.
- **Open Q:** exact click-count (one-click vs re-tap) depends on when the SDK marks the request
  processed — not traced. The guard asymmetry is confirmed.

## 🟠 High

### sphere-sdk#679 — SPHERE-4 phantom balance: suspectedSpent demotion not durable ✅
- **Mechanism:** `demoteSuspectedSpent` sets the flag + `save()` (`PaymentsModule.ts:1739-1742`), but
  `WalletApiTokenStorageProvider.save()` persists only additions + `_tombstones` (confirmed spends),
  **not** `suspectedSpent` (`WalletApiTokenStorageProvider.ts:504,514`). `load()` returns only
  `_meta`+`_tombstones` (`:493-497`); on reload `mergeLazyInventory` re-stamps every server-`active`
  row `confirmed` (`PaymentsModule.ts:2566`). The `:1699` "durable" comment is true for local-storage
  custody, **false for the prod wallet-api thin provider**. → phantom re-inflates every session →
  `SEND_INSUFFICIENT_BALANCE` (Sentry SPHERE-4 P0, ~370 events).
- **Constraint:** wallet-api is **aggregator-independent by design** — no server-side chain
  reconciliation (would risk overloading the aggregator). Fix must be client-only.
- **Fix:** durable client-local `suspectedSpent` overlay persisted to base KV storage, re-applied in
  `mergeLazyInventory` so a matching server-`active` row is demoted out of spendable `confirmed`.
  Per-device scope is acceptable.

## 🟡 Server (medium / low)

### wallet-api#106 — concurrent refresh revokes the whole session (forced logout) ✅
- **Mechanism:** `rotateRefreshToken` revokes the entire session when its CAS loses
  (`auth/service.ts:126-130`; the comment at `:128` admits it "covers losing the CAS to a concurrent
  rotation"). Two browser tabs share one refresh token → a normal concurrent double-refresh logs the
  user out. Compounds sdk#673 (client refresh not single-flighted).
- **Fix:** grace window — a replay of the just-rotated token within N seconds returns the already-
  rotated pair (idempotent refresh); only revoke on an older-generation replay.

### wallet-api#107 — server concurrency hygiene bundle (4 lows) ✅
1. **intents PUT → 500 instead of no-op** (`intents/repository.ts:219`) — concurrent first-PUTs both
   insert; loser's 23505 maps to 500 (inventory path handles this via `retryOnInventoryRace`; intents
   doesn't). Fix: catch the PK 23505 → resolve to existing-row no-op / 409.
2. **advisory-lock 32-bit truncation** (`db/advisory.ts:16`) — `hashtext` collapses 64→32-bit;
   collision serializes unrelated keys and GC holds the lock across an S3 delete. Fix:
   `hashtextextended(key,0)`.
3. **AB-BA deposit vs claim** (`mailbox/service.ts:236` vs `:464`) — real inversion but absorbed by the
   `40P01` retry in `withTransaction` → latency blip. Likely won't-fix / document.
4. **payment-request create not idempotent** (`payments/service.ts:99`) — retry duplicates the
   *request* (not a payment). Cosmetic. Fix: optional client idempotency key + `ON CONFLICT DO NOTHING`.

## Already shipped (PR #435, merged)
- Intent send result propagation (transferId/status/deliveryPending) — was sphere#433.
- `delivery:undeliverable` + `delivery:deferred` event bridging — was sphere#434.

## Related open PRs
- sphere#437 — remove dead elliptic/crypto-js deps + bump sphere-sdk 0.11.12.
- sphere-sdk#675 — migrate elliptic → @noble/curves (⚠️ crypto; needs review before merge).

---

# OUTSTANDING — confirmed but NOT yet filed

**All 🤖 agent-confirmed only — hand-verify before fixing.** Recommended: hand-verify the SDK highs
first (esp. `recoverRemoved` resurrection + Nostr cursor swallow — money/loss surface), file survivors
individually, bundle mediums/lows.

## Highs (unfiled)

**sphere-sdk:**
- `resumeIntent` misclassifies a FOREIGN spend as "certified by us" → records the spend, completes the
  intent, writes a full-amount SENT record while the recipient got partial/nothing.
- `ack('rejected')` permanently poisons the persistent seen-set → a transiently-misclassified legit
  delivery is unrecoverable by the wallet (server keeps it claimable).
- burn-certified split is ABORTED (value stranded) when a mint leg gets a clean-reject
  (`SphereTokenEngine.ts` ~414).
- `recoverRemoved()` resurrects genuinely-spent tokens (no on-chain isSpent check) → double-spend
  surface (`WalletApiTokenStorageProvider.ts` ~412).
- **Nostr cursor swallow** — incoming transfers during the init/add-address window are dropped AND the
  cursor advances past them → permanent loss on the pure-Nostr rail (Node wallets). ("Alt B" from the
  @squid-city support case.) (`NostrTransportProvider.ts` ~1415).
- un-serialized concurrent `syncInventory` — SPHERE-4's *second* mechanism, a distinct race from #679
  (`WalletApiTokenStorageProvider.ts` ~245).

**sphere (app):**
- **`transfer:invalid` never bridged** — incoming money rejected by local verification vanishes with
  zero user signal. File WITH the SDK low "transfer:invalid emitted for benign already-processed
  deliveries" → bridge *with* dedup so it doesn't false-alarm.
- logout/delete DESTROYS the `PENDING_V2_DELIVERIES` journal — the only copy of certified-but-
  undelivered recipient tokens (`useGlobalSyncStatus` is a hardcoded stub, no outstanding-work warning).
- host teardown (nav away / iframe reload / URL switch) never cancels the pending intent — a live money
  modal survives the dead dApp session; approval still moves funds (`IframeAgent.tsx` ~62).
- SwapModal: after the 'from' transfer succeeds, a failed mint returns a fully retryable form → each
  retry re-sends the already-spent 'from' amount (`SwapModal.tsx` ~147).
- `subscriptionKeyStatus` never reset on wallet deletion → stale 'ready' reopens the #419 keyless-send
  window after delete + re-import (`SphereProvider.tsx` ~663).
- wallet executes a send AFTER the dApp's intent already timed out client-side → committed spend
  reported to the dApp as failure → double-pay retry invite.

**cross-boundary:**
- restore-rebuilt mailbox entries (NULL transferId/senderPubkey) are unparseable by the SDK codec →
  incoming-token discovery permanently wedges after a server restore (`sphere-sdk wallet-api/codec.ts`
  ~214; server produces the NULL rows).

## Mediums (unfiled)
- `inventory:conflict` never bridged (silent cross-device conflict; esp. background split-resume).
- open wallet-api intents resume only at sign-in — a pending-success send stalls all session; no UI
  lists open intents.
- dApp's 120s intent timeout includes user think-time and is never signalled to the wallet.
- a single transient vault read failure silently replaces a purchased PAID key with the free key.
- first-run dApp connect always fails: onboarding takes longer than the 30s HOST_READY timeout.
- nothing guards the popup against closing during an in-flight approved send.
- real on-chain spends recorded as 'unevidenced' when the mailbox deposit transiently fails before
  applyDelta (cross-boundary).
- restore rebuild ignores §6 custody disposition — materializes ACTIVE rows for external-custody blobs.
  *(Partially refuted by the concurrency sweep — verify carefully before filing.)*
- idle browser wake sockets force-reconnected every ~60s (protocol pings invisible to browser JS).
- `transfer:incoming` and other per-address events carry no address discriminator → misattribution.

## Lows (unfiled)
- lock-free intent-copy read-modify-write JSON blob — concurrent sends can drop an intent copy or an
  `abortPending` flag (weakens the double-pay backstop).
- an intent whose payload this SDK version can't decode is skipped but left OPEN forever (warn-loops).
- rejected mailbox entries count against inbox caps forever and are never GC'd (Sybil inbox-wedge).
- expired `auth_nonces` never swept (unbounded table growth).
- SDK collapses RATE_LIMITED vs QUOTA_EXCEEDED 429s → a sender's deposit rate-limit defers committed
  transfers 1h as "recipient mailbox full".
- `tryRefresh` destroys the rotating refresh token on ANY non-200 (incl. 429/503), contradicting its
  own 4xx-only contract.
- DM auto-approve consent scoped to host lifetime, not session/identity — survives lock + address switch.
- wallet-side failures reported to dApps as USER_REJECTED — insufficient balance / DM / mint errors are
  indistinguishable from the user declining.
- reconnect of an approved origin returns the stale saved permission set, ignoring what the dApp
  requested this time.

---

# What held up (the reassuring half)

The wallet-api server's **money-critical invariants are sound** under a focused concurrency probe:
- **IDOR clean** — every money endpoint derives owner from the verified JWT, scopes by `owner_id`.
- **`apply` idempotent** — `applied_transfers` PK + `ON CONFLICT DO NOTHING`; a client retry mutates
  nothing (this is the server-side backstop to the client double-pays).
- **Ledger** — partial unique index makes two active rows per token impossible; external-custody claims
  write no inventory row (no cross-custody double-count).
- **GC/workers** — safe by construction.

Every fund-loss risk found is a **client/SDK re-execution-or-presentation** bug, not server ledger
corruption. Consistent with all 4 double-pay criticals being client-side.

# Reference
- Cron/aggregator note: wallet-api does NOT talk to the aggregator by design (`AGGREGATOR_URL`
  intentionally unused; validation is offline proof-verification vs a RootTrustBase). SPHERE-4 has no
  server-side fix for this reason.
- Sweep reports (fuller evidence): were delivered as `pre-mainnet-sweep-report.md` and
  `sdk-walletapi-sweep-report.md` (scratchpad).
