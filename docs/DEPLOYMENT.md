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
| **Live testnet host** (HAProxy + ssl-manager) | <https://sphere-telco-test.dyndns.org/> | **SSH session — `deploy-manual.yml` does NOT ship this surface** (see warning below) | none functional |
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

## 2. Live testnet host (HAProxy + ssl-manager, SSH-based)

The live host at `sphere-telco-test.dyndns.org` runs an
**HAProxy-fronted** container called `sphere-app` (NOT the `sphere-frontend`
container in `docker-compose.yml` — that compose file is for local dev).

**Production image** — `sphere-app:latest` built from `Dockerfile.ssl`:

- Base image: `ghcr.io/unicitynetwork/ssl-manager` (nginx + tini + certbot wiring)
- Exposes 8080 (HTTP) and 443 (HTTPS) internally
- `dist/` is staged from a `node:20-alpine` builder stage and copied to
  `/usr/share/nginx/html`
- Entrypoint: `deploy/entrypoint.sh` — runs ssl-setup before nginx so the
  container can serve TLS directly if HAProxy is bypassed

**Launcher** — `run-sphere.sh`, which sources
`../ssl-manager/run-lib.sh`. By default:

- Container name: `sphere-app`, volume: `sphere-data`
- `USE_HAPROXY=true`, `HAPROXY_HOST=haproxy`, `HAPROXY_NET=haproxy-net`
- The container joins the `haproxy-net` docker network; HAProxy fronts
  port 443 → container 8080. **No ports are published from the container
  in HAProxy mode** — HAProxy owns the public 80/443 of the host.
- HAProxy registration uses the bearer token in `--haproxy-api-key`
  (or `HAPROXY_API_KEY` env). HAProxy reloads its config on register.

### Prerequisites

- SSH access to the live host (no automation does this end-to-end yet —
  the `deploy-manual.yml` workflow targets the dev compose file, not
  this production chain; see "The workflow does NOT match the live
  host" below).
- On the host: the `unicity-sphere/sphere` repo cloned at `~/sphere`,
  the `ssl-manager` repo cloned at `~/ssl-manager` (or set
  `SSL_MANAGER_DIR`), an HAProxy container running on the
  `haproxy-net` network with a Registration API.
- For SSL refresh / first registration:
  `SSL_ADMIN_EMAIL` (or `--ssl-email` on the CLI), `HAPROXY_API_KEY`.

### Step-by-step

```bash
# 0. SSH to the host. Credentials live in the production environment
#    secrets on GitHub — not in this repo.
ssh "$SSH_USER@$SSH_HOST"

# 1. Update the working copy. The server is currently on
#    feat/telco-webrtc-calls (set out-of-band — see the warning
#    section below).
cd ~/sphere
git fetch origin
git checkout feat/telco-webrtc-calls
git pull --ff-only origin feat/telco-webrtc-calls

# 2. Build the production image. NOTE: -f Dockerfile.ssl, NOT the
#    default Dockerfile (which builds the dev image used by docker-
#    compose.yml). The image MUST be tagged sphere-app:latest because
#    that's what run-sphere.sh defaults to via SPHERE_IMAGE.
docker build -f Dockerfile.ssl -t sphere-app:latest .

# 3. Re-launch via run-sphere.sh. This stops + removes the existing
#    `sphere-app` container, recreates it on haproxy-net, attaches the
#    persistent sphere-data volume, and re-registers with HAProxy so
#    443 → sphere-app:8080 stays alive across the swap.
./run-sphere.sh \
    --domain sphere-telco-test.dyndns.org \
    --ssl-email "$SSL_ADMIN_EMAIL" \
    --haproxy-api-key "$HAPROXY_API_KEY"

# 4. Verify the container is up and the HAProxy registration stuck.
docker ps --filter "name=^sphere-app$"
docker logs --tail 50 sphere-app
docker exec sphere-app curl -sf http://localhost:8080/ | head -c 200
```

For a self-signed cert / dev TLS, swap `--ssl-email …` for `--ssl-test-mode`.
For a no-SSL bypass (direct port publishing, HAProxy disabled), use
`--no-haproxy --domain <host>` — useful only when HAProxy is being
rotated.

### Verify the live deploy

- Open <https://sphere-telco-test.dyndns.org/> in a **private window**
  (the service worker and `Cache-Control: public, immutable` on
  `/assets/` will otherwise mask a fresh deploy).
- Service Status banner pills should verdict OK against the testnet
  backends within one probe interval (≤ 5 s) per the new
  `useAggregatorStatus` hook (issue #329).
- `curl -sI https://sphere-telco-test.dyndns.org/index.html` —
  `Cache-Control: no-cache, no-store, must-revalidate` confirms
  `index.html` is not cached and a hard refresh picks up the new
  bundle hashes.

### Rollback

```bash
# On the host:
cd ~/sphere
git log --oneline -5                    # find the prior good commit
git checkout <prior-good-sha>
docker build -f Dockerfile.ssl -t sphere-app:latest .
./run-sphere.sh \
    --domain sphere-telco-test.dyndns.org \
    --ssl-email "$SSL_ADMIN_EMAIL" \
    --haproxy-api-key "$HAPROXY_API_KEY"
```

For an emergency rollback without rebuild, keep prior images tagged
(e.g. `docker tag sphere-app:latest sphere-app:pre-329` before each
deploy) and `docker tag sphere-app:pre-329 sphere-app:latest` then
re-run `run-sphere.sh` — skips the rebuild entirely.

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

# 4. After merge, SSH to the live host and run the production
#    deploy chain (Dockerfile.ssl + run-sphere.sh, HAProxy mode).
#    `deploy-manual.yml` cannot do this — see warning in section 2.
ssh "$SSH_USER@$SSH_HOST"
cd ~/sphere
git fetch origin
git checkout feat/telco-webrtc-calls
git pull --ff-only origin feat/telco-webrtc-calls
docker build -f Dockerfile.ssl -t sphere-app:latest .
./run-sphere.sh --domain sphere-telco-test.dyndns.org \
    --ssl-email "$SSL_ADMIN_EMAIL" \
    --haproxy-api-key "$HAPROXY_API_KEY"

# 5. Verify on the live host. Watch backend probes for one backoff
#    cycle (≤ 15 s) to confirm pills verdict OK.
```

---

## ⚠ The workflow does NOT match the live host

> **`deploy-manual.yml` cannot deploy the production HAProxy
> container.** As written, it runs:
>
> ```yaml
> cd ~/sphere
> git pull origin main
> docker compose build       # builds Dockerfile, image `sphere-frontend`, port 3010
> docker compose up -d       # starts the dev container
> ```
>
> But the live host runs `sphere-app` (from `Dockerfile.ssl`, with
> HAProxy fronting it) — a different image, container name, and
> network model. `docker compose up -d` would start the dev
> `sphere-frontend` on port 3010 **alongside** the real `sphere-app`
> without touching it; HAProxy still points at the unchanged
> `sphere-app`. Net effect: the workflow appears to succeed but the
> live host is untouched.
>
> Compounding this, `origin/main` is currently 96 commits behind
> `origin/feat/telco-webrtc-calls` (the server's checked-out branch as
> of 2026-06-01), so even the dev container the workflow does start
> would be stale.
>
> **Until the workflow is rewritten, every prod deploy needs the SSH
> session shown in section 2.** A correct workflow would:
>
> 1. Parameterize the branch via `workflow_dispatch` input (default
>    `feat/telco-webrtc-calls` for now) instead of hardcoding `main`.
> 2. Replace `docker compose build / up -d` with:
>
>    ```bash
>    docker build -f Dockerfile.ssl -t sphere-app:latest .
>    ./run-sphere.sh --domain "$DEPLOY_DOMAIN" \
>        --ssl-email "$SSL_ADMIN_EMAIL" \
>        --haproxy-api-key "$HAPROXY_API_KEY"
>    ```
>
> 3. Move `SSL_ADMIN_EMAIL`, `HAPROXY_API_KEY`, and `DEPLOY_DOMAIN`
>    into the `production` environment secrets alongside the existing
>    SSH credentials.
>
> Track this here so the next dev doesn't trip on it.

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
| Push to live testnet host | SSH session — `git pull` + `docker build -f Dockerfile.ssl -t sphere-app:latest .` + `./run-sphere.sh --domain sphere-telco-test.dyndns.org …` (`deploy-manual.yml` builds the wrong image — see section 2 warning) |
| Roll back live host | SSH to the host, `git checkout <prev-sha>`, `docker build -f Dockerfile.ssl -t sphere-app:latest .`, re-run `./run-sphere.sh` (or `docker tag sphere-app:pre-<n> sphere-app:latest` if you tagged the prior image) |
| Re-run CI without a commit | `gh workflow run ci.yml --ref <branch>` |
| Tear down a stale preview | Delete the branch on GitHub — `deploy-pages-branch.yml` cleans up `gh-pages` automatically |
