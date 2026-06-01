# Sphere — Deployment Manual

How to ship a change in this repo from local commit to the live host
at <https://sphere-telco-test.dyndns.org/>, plus the lightweight
per-branch preview at GitHub Pages.

This repo has **three** CI/CD workflows; each one fires on a different
trigger and ships to a different surface. Knowing which workflow does
what is the whole skill — everything else is `gh workflow run` or
`git push`.

```
.github/workflows/
├── ci.yml                  ← lint + test + build on every push/PR
├── deploy-pages-branch.yml ← per-branch GH Pages preview on every push
└── deploy-manual.yml       ← prod SSH deploy on workflow_dispatch
```

| Surface | URL | Triggered by | Workflow |
|---|---|---|---|
| **Per-branch preview** | `https://unicity-sphere.github.io/sphere/<sanitized-branch>/` | `git push` to any branch (except `gh-pages`) | `deploy-pages-branch.yml` |
| **Live testnet host** | <https://sphere-telco-test.dyndns.org/> | manual `gh workflow run deploy-manual.yml` | `deploy-manual.yml` |
| **CI gate** | n/a (status check) | every `git push` and PR | `ci.yml` |

> **Branch-name sanitization for previews.** Slashes in branch names
> are replaced with dashes. `fix/aggregator-status-banner-329` →
> `fix-aggregator-status-banner-329`. The full preview URL is then
> `https://unicity-sphere.github.io/sphere/fix-aggregator-status-banner-329/`.

---

## 1. Per-branch preview (fast iteration, fully automatic)

Every `git push` to any branch automatically:

1. Runs `ci.yml` — `npm ci && npm run lint && npm run test:run && npm run build`.
2. Runs `deploy-pages-branch.yml` — builds with `BASE_PATH=/sphere/<sanitized-branch>/`
   and publishes `dist/` to the `gh-pages` branch under a subdirectory
   matching the sanitized branch name.

There is **nothing to trigger manually**. Push, wait ~3 minutes, visit
the URL.

```bash
git push -u origin fix/aggregator-status-banner-329
# Wait for the "Deploy Branch to GitHub Pages" workflow to go green:
gh run watch
# Or list and watch the latest run for this branch:
gh run list --branch fix/aggregator-status-banner-329 --workflow deploy-pages-branch.yml
# Preview will be at:
#   https://unicity-sphere.github.io/sphere/fix-aggregator-status-banner-329/
```

### When a branch is deleted

`deploy-pages-branch.yml` listens for the `delete` event and removes
the subdirectory from `gh-pages` automatically. No cleanup needed.

### Limits of the preview

The preview build sets `BASE_PATH` to a subdirectory, so:

- Routes and asset paths are all relative to the subdirectory.
- A 404 fallback page (`/sphere/<branch>/404.html`) re-routes deep links
  back to the SPA's `BrowserRouter` via a `?p=` query parameter.
- The preview talks to **the same testnet aggregator / Nostr relay /
  IPFS gateway** as the live host. So a backend service health probe
  (this is what issue #329 is about) verdicts the same on the preview
  as on the live host — that's by design.

---

## 2. Live testnet host (manual, SSH-based)

The live host runs an `nginx` Docker container built from this repo's
`Dockerfile`, served on port 3010 behind whatever reverse proxy
terminates TLS at `sphere-telco-test.dyndns.org`. The
`deploy-manual.yml` workflow SSHs in, fast-forwards the working copy,
and rebuilds the container.

### Prerequisites

- You need write access to the `unicity-sphere/sphere` repo on GitHub
  (to dispatch the workflow).
- The repo `production` environment must have these secrets set:
  `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `SSH_PORT` (optional, defaults to 22).
- The server already has the repo cloned at `~/sphere` with Docker installed.

### Step-by-step

1. **Land your fix on the branch the server tracks.** The server is
   currently on `feat/telco-webrtc-calls` (set out-of-band — see
   "The workflow does NOT match the live host" below). The
   `deploy-manual.yml` workflow still references `main`; until it's
   updated, the recommended path is the SSH session shown in that
   section, not `gh workflow run`.

2. **Dispatch the workflow (once it's fixed to pull the right
   branch).**

   ```bash
   # From any clean checkout
   gh workflow run deploy-manual.yml --ref feat/telco-webrtc-calls

   # Watch the run
   gh run watch
   ```

   The workflow logs print the previous and current HEAD commits, so
   you can verify the deploy actually moved forward (or didn't — the
   pull is a no-op if there's nothing new on the tracked branch).

3. **Verify the live host.**

   - Open <https://sphere-telco-test.dyndns.org/> in a private window
     (to bypass service-worker / cached `dist/` assets).
   - Check the version surfaced by the app — Header → Settings →
     About — and confirm the short SHA matches your deploy.
   - Watch the Service Status banner pills for one full backoff cycle
     (15 s) to confirm they verdict OK against the testnet backends.

### Rollback

```bash
# On the server:
cd ~/sphere
git log --oneline -5            # find the prior good commit
git checkout <prior-good-sha>
docker compose build
docker compose up -d
docker compose ps
```

The workflow can also be re-pointed at any branch via the `--ref` flag
in step 2, but the workflow script itself only knows how to
`git pull origin main` once it's on the server, so a real rollback
needs SSH access.

---

## 3. CI gate (`ci.yml`)

Runs on every push/PR. Required steps:

```bash
npm ci
npm run lint           # → eslint .
npm run test:run       # → vitest run (107+ tests as of 2026-06-01)
npm run build          # → tsc -b && vite build
```

A red CI does **not** block the per-branch preview deploy
(`deploy-pages-branch.yml` runs in parallel and has no dependency on
`ci.yml`). It DOES block PR merge if branch protection requires the
CI check.

Run the same gate locally before pushing:

```bash
npm run lint && npm run test:run && npm run build
```

---

## End-to-end checklist for a fix

For a bug fix that needs to land on the live host (the most common
case, e.g. issue #329):

```bash
# 0. Branch off the development branch the server actually serves.
#    Currently feat/telco-webrtc-calls in practice; main per the
#    workflow. Clarify with the host admin if in doubt.
git checkout -b fix/<slug> origin/feat/telco-webrtc-calls   # or origin/main

# 1. Implement + test locally.
npm run lint && npm run test:run

# 2. Push — triggers ci.yml + deploy-pages-branch.yml automatically.
git push -u origin fix/<slug>

# 3. Open PR. Review on the preview URL.
gh pr create --base feat/telco-webrtc-calls --title '...' --body '...'

# 4. After merge, dispatch the prod deploy.
gh workflow run deploy-manual.yml --ref main   # (or whichever ref the server pulls)

# 5. Verify on the live host. Watch backend probes for one backoff
#    cycle (≤ 15 s) to confirm pills verdict OK.
```

---

## ⚠ The workflow does NOT match the live host

> **As of 2026-06-01:** the server at `sphere-telco-test.dyndns.org`
> has `feat/telco-webrtc-calls` checked out (set out-of-band, not by
> any workflow). But `deploy-manual.yml` runs
> `git pull origin main`. `origin/main` is currently 96 commits behind
> `origin/feat/telco-webrtc-calls` — so dispatching the workflow as-is
> will either no-op or pull stale `main` history into the feat
> checkout. Either way it will **not** ship a fix that landed on
> `feat/telco-webrtc-calls`.
>
> **Until the workflow is fixed**, deploying to the live host requires
> an SSH session:
>
> ```bash
> ssh "$SSH_USER@$SSH_HOST"
> cd ~/sphere
> git fetch origin
> git checkout feat/telco-webrtc-calls
> git pull --ff-only origin feat/telco-webrtc-calls
> docker compose build
> docker compose up -d
> docker compose ps
> ```
>
> **Suggested workflow fix** — change line 25 of
> `.github/workflows/deploy-manual.yml` from
> `git pull origin main` to `git pull origin feat/telco-webrtc-calls`
> (or parameterize the branch via `workflow_dispatch` input). Track
> this here so the next dev doesn't trip on it.

---

## Local quick-iterate (no deploy needed)

For most UI / banner / hook changes, the fastest dev loop is local:

```bash
npm run dev       # Vite dev server on http://localhost:5173
```

The dev server points at the same testnet backends by default, so the
Service Status banner exercises the same probes as the live host.
Toggle dev overrides from the browser console without restarting:

```js
sphereDev.setAggregator('http://127.0.0.1:11003')   // probe a local aggregator
sphereDev.setAggregator(null)                       // back to network default
sphereDev.show()                                    // current overrides
```

A `dev-config-changed` event is dispatched on every setter — the
banner's direct-probe hooks (`useAggregatorStatus`,
`useIpfsGatewayStatus`, `useMarketStatus`) listen for it and re-probe
immediately, so you don't need to reload to see a verdict against the
new endpoint.

---

## Quick reference

| I want to… | Do this |
|---|---|
| See my branch on a public URL | `git push` — wait for `deploy-pages-branch.yml` |
| Push to live testnet host | SSH session per the "workflow does NOT match the live host" section (until the workflow is fixed to pull `feat/telco-webrtc-calls`) |
| Roll back live host | SSH to the host, `git checkout <prev-sha>`, `docker compose build && docker compose up -d` |
| Re-run CI without a commit | `gh workflow run ci.yml --ref <branch>` |
| Tear down a stale preview | Delete the branch on GitHub — `deploy-pages-branch.yml` cleans up `gh-pages` automatically |
