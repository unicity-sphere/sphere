# Security & correctness audit — fix tracking (2026-07)

Integration branch for the fixes from the 2026-07 multi-agent audit of Sphere (base: `main` @ `b477d4d7`, sphere-sdk 0.12.0). GitHub issues #447–#455.

## Workflow

- **Integration branch:** `audit-fixes-2026-07` (this branch). All fixes land here first.
- **Per-issue branches:** one branch per issue, **based on this integration branch** (`git switch -c fix/... audit-fixes-2026-07`).
- **Merge when ready:** a finished issue branch merges back into `audit-fixes-2026-07` (direct merge, or a PR *into the integration branch* for CI/review — not into `main`).
- **One PR to main:** only `audit-fixes-2026-07 → main` is opened against `main`, at the end. This document is its running description.

Rationale: keeps `main` untouched until the whole audit-fix set is green and reviewable as one unit, while each issue stays an isolated, revertible branch. Dependent fixes (e.g. #452 reuses #451's verified-origin plumbing) sequence cleanly because every issue branch already contains the previously merged fixes.

## Prerequisite

`npm ci` (local `node_modules` holds sphere-sdk 0.11.12 vs the 0.12.0 lockfile pin → `tsc` currently fails). Do this before any branch work.

## Gate before merging an issue branch into the integration branch

1. `npm run lint` — 0 errors.
2. `npx tsc --noEmit -p tsconfig.app.json` — clean.
3. `npm run test:run` — green, **including a new test for the fixed behaviour**.
4. Manual check of the specific flow where feasible.
5. **NO EXISTING USER LOSES THEIR WALLET.** Hard requirement, overrides everything. Any change that reads/writes wallet storage, the mnemonic, identity, IndexedDB DB names, or a persisted-state schema MUST keep already-created wallets loadable. For those changes add a regression test that a wallet persisted by the PRE-fix code still opens/restores after the change. Migrations must be non-destructive and forward-only; never gate an existing user out of a wallet they already have.

### Backward-compatibility risk per issue (existing wallets)

| # | Storage / identity touched? | Backward-compat requirement |
|---|---|---|
| #451 | no (iframe framing only) | none — merged, safe |
| #452 | connected-sites display only | keep reading the existing approved-origins shape |
| #448 | new-wallet create flow + nametag persistence | existing wallets & restore path must be untouched; only the create ordering changes |
| #453 | `SphereProvider.initialize()` (no storage writes) | guard must never end with zero live instance or destroy the winner → transient lockout risk; test init still resolves for an existing wallet |
| **#449** | **mnemonic at-rest encryption** | **HIGHEST RISK.** Existing wallets are stored UNENCRYPTED. Password must be an opt-in migration: an existing plaintext wallet must still load with no password, then be offered encryption. NEVER pass a password to `Sphere.init` for a wallet stored without one (decrypt would fail → wallet appears lost). Add a test: a plaintext-persisted wallet opens after the change. |
| #450 | backup export only | none (export path, not the live store) |
| #454 / #455 / #447 | no | none |

## Issues → branches

| # | Sev | Branch | Depends on | Status |
|---|-----|--------|-----------|--------|
| #451 | high | `fix/iframe-agent-origin-allowlist` | — | **merged** (self-origin guard + hardened sandbox + `agentOrigins` trust module); follow-ups: verified-origin in modal → #452, CSP `frame-src` |
| #452 | high | `fix/connect-verified-origin` | #451 | **merged** (approval modal shows verified origin + untrusted/host-mismatch warnings; `requestApproval` carries the pinned origin) |
| #449 | high | `feat/wallet-password-unlock` | — | todo |
| #450 | high | `fix/onboarding-encrypted-backup` | #449 | todo |
| #448 | high | `fix/nametag-create-atomicity` | — | todo |
| #453 | high | `fix/sphere-init-reentrancy-guard` | — | todo |
| #454 | high | `fix/group-send-throw-on-null` | — | todo |
| #455 | high | `fix/desktop-layout-shared-route` | — | todo |
| #447 | medium | `fix/swap-atomicity` (testnet-only) | — | todo |

Deferred / not yet filed as issues (drafts exist): a11y dialog primitive, HTTP-service hardening, deploy-config follow-ups (may go into #443 instead), money-action modal-flow, marketplace pagination, perf dedupe.

## Sequencing

1. **Security first:** #451 → #452 (shared "show verified origin"); #448; #453.
2. **Secrets:** #449 → #450.
3. **Silent failures:** #454.
4. **State/UX:** #455; #447 (testnet-only, low urgency).

## Companion SDK improvements (separate repo, not in this branch)

- `GroupChatModule.sendMessage` (+ moderation methods) should signal failure instead of returning `null` (root of #454).
- `registerNametag` should be atomic / extractable from `Sphere.create` (root of #448).
