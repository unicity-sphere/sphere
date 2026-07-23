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

## Issues → branches

| # | Sev | Branch | Depends on | Status |
|---|-----|--------|-----------|--------|
| #451 | high | `fix/iframe-agent-origin-allowlist` | — | **merged** (self-origin guard + hardened sandbox + `agentOrigins` trust module); follow-ups: verified-origin in modal → #452, CSP `frame-src` |
| #452 | high | `fix/connect-verified-origin` | #451 | todo |
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
