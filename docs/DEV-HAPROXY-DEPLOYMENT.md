# Dev Page — HAProxy Deployment

How to rebuild and redeploy <https://sphere-telco-test.dyndns.org/>
**locally on this host**, against any sphere-sdk git branch you want
to test. This is the loop you run every time you ship a Sphere or
sphere-sdk fix and want to see it on the test page.

No SSH, no GitHub Actions for this surface. Everything below runs from
the working copy at `/home/vrogojin/sphere.telco`.

For the unrelated per-branch GitHub Pages preview (auto on `git push`),
see [§ Per-branch GH Pages preview](#per-branch-gh-pages-preview) at
the bottom.

---

## What's running

The page is served by a local docker container `sphere-app`, which
HAProxy fronts on the same host:

```
[ Internet ]  ──443──▶  [ haproxy container ]  ──haproxy-net──▶  [ sphere-app:8080 ]
                            host port 443                            (nginx in container)
```

| Piece | Container | Image | Network | Volumes |
|---|---|---|---|---|
| Page server | `sphere-app` | `sphere-app:latest` (built from `Dockerfile.ssl`) | `haproxy-net` | `sphere-data:/data`, `letsencrypt-data:/etc/letsencrypt` |
| TLS terminator + router | `haproxy` | (managed externally, ports 80/443 on the host) | `haproxy-net` | — |

`docker-compose.yml` at the repo root is the **dev variant** (simple
`Dockerfile`, image `sphere-frontend`, port 3010, no HAProxy). It is
NOT what serves `sphere-telco-test.dyndns.org`. Don't touch it for
prod-page work.

### sphere-sdk consumption

`sphere.telco`'s `package.json` consumes sphere-sdk via a file dep:

```json
"@unicitylabs/sphere-sdk": "file:./vendor-sphere-sdk"
```

`vendor-sphere-sdk/` is a **vendored copy** of a `sphere-sdk` build —
just `dist/` + `package.json` (with version tag) + `SHA.txt` (carrying
the upstream commit SHA). The bundler resolves the file dep at build
time. To change the SDK code the page runs against, you swap the
contents of `vendor-sphere-sdk/` for a different SDK build.

---

## Hosts at a glance

| | Value |
|---|---|
| Project working copy | `/home/vrogojin/sphere.telco` |
| sphere-sdk working copy | `/home/vrogojin/uxf` |
| ssl-manager working copy | `/home/vrogojin/ssl-manager` (sourced by `run-sphere.sh`) |
| Container name | `sphere-app` |
| Image tag | `sphere-app:latest` |
| Public domain | `sphere-telco-test.dyndns.org` |
| SSL admin email | `admin@unicity.network` |
| HAProxy host (in docker) | `haproxy` on docker network `haproxy-net` |
| Volumes | `sphere-data` (app data), `letsencrypt-data` (cert store) |

---

## The full rebuild + redeploy cycle

This is the loop. Run all four steps when you change sphere-sdk code.
Skip Steps 1–2 when you only change `sphere.telco` source.

### Step 1 — Build the sphere-sdk branch you want to test

```bash
cd /home/vrogojin/uxf
git fetch --all
git checkout <sphere-sdk-branch>             # e.g. fix/aggregator-pinger-cleanup
git pull --ff-only
npm ci                                       # only if package-lock.json moved
npm run build                                # tsup → ./dist
```

This produces `./dist/`, the bundle that `vendor-sphere-sdk/dist/`
mirrors. Note the source SHA:

```bash
git rev-parse --short HEAD                   # e.g. a1b2c3d
```

### Step 2 — Refresh `vendor-sphere-sdk/` against that build

The vendor directory needs three things to match the source build:

- `vendor-sphere-sdk/dist/` — the freshly-built `dist/` from sphere-sdk
- `vendor-sphere-sdk/package.json` — sphere-sdk's `package.json`, with
  `version` retagged so the dep graph sees a unique version
- `vendor-sphere-sdk/SHA.txt` — the short SHA for traceability

```bash
cd /home/vrogojin/sphere.telco

# Mirror the freshly-built dist/. --delete removes files that no longer
# exist upstream (stale bundles from a previous SDK version).
rsync -a --delete /home/vrogojin/uxf/dist/ vendor-sphere-sdk/dist/

# Carry the upstream package.json (it declares the dist/* exports map).
# Then retag version so npm sees a unique resolved version on install.
cp /home/vrogojin/uxf/package.json vendor-sphere-sdk/package.json
SDK_SHA=$(cd /home/vrogojin/uxf && git rev-parse --short HEAD)
SDK_BRANCH=$(cd /home/vrogojin/uxf && git rev-parse --abbrev-ref HEAD | tr '/' '-')
# Bump the "version" field — npm caches by version string, so reusing
# the same string after a code change can serve a stale install.
node -e "const p=require('./vendor-sphere-sdk/package.json'); \
  p.version='0.8.0-sdk-${SDK_SHA}-${SDK_BRANCH}'; \
  require('fs').writeFileSync('./vendor-sphere-sdk/package.json', JSON.stringify(p, null, 2));"
echo "$SDK_SHA" > vendor-sphere-sdk/SHA.txt

# Relink the file: dep so node_modules/@unicitylabs/sphere-sdk points
# at the freshly-mirrored vendor copy.
npm install
```

> **Why retag `version`.** npm/pnpm cache packages by their version
> string. Reusing the same string after changing the contents (which
> is exactly what a vendor refresh does) can leave a stale install
> behind. Encoding the SDK SHA into the version makes every refresh
> resolve as a new package and forces a clean install.

### Step 3 — Rebuild the container image

```bash
cd /home/vrogojin/sphere.telco
docker build -f Dockerfile.ssl -t sphere-app:latest .
```

> **Use `Dockerfile.ssl`, NOT the default `Dockerfile`.** The default
> Dockerfile builds the dev variant (`sphere-frontend` image, port
> 3010, no SSL). `Dockerfile.ssl` builds on
> `ghcr.io/unicitynetwork/ssl-manager` (nginx + tini + certbot) and is
> the only image `run-sphere.sh` knows how to launch into HAProxy mode.

The builder stage runs `npm ci --ignore-scripts && npm run build`
against the vendored SDK you just refreshed, so the bundle that ends
up in `/usr/share/nginx/html` is built against your chosen SDK branch.

### Step 4 — Redeploy in HAProxy mode

```bash
cd /home/vrogojin/sphere.telco
./run-sphere.sh \
    --domain sphere-telco-test.dyndns.org \
    --ssl-email admin@unicity.network
```

`run-sphere.sh` (which sources `../ssl-manager/run-lib.sh`):

1. Stops and removes the existing `sphere-app` container.
2. Creates a fresh container on `haproxy-net` from `sphere-app:latest`,
   mounting the persistent `sphere-data` and `letsencrypt-data`
   volumes.
3. Registers the container with the local `haproxy` container's
   Registration API. HAProxy reloads its config and starts forwarding
   `443 → sphere-app:8080`.

No host ports are published from `sphere-app` itself — HAProxy owns
the public 80/443. Cert state persists across redeploys via
`letsencrypt-data`, so you don't trigger certbot on every iteration.

### Step 5 — Verify

```bash
# Container is up.
docker ps --filter "name=^sphere-app$" \
    --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Networks}}"

# Entrypoint logs (SSL setup + nginx boot) look clean.
docker logs --tail 50 sphere-app

# Internal HTTP probe — should print the page <head>.
docker exec sphere-app curl -sf http://localhost:8080/ | head -c 200

# Public HTTPS through HAProxy — should be the same bundle hash you
# just built.
curl -sI https://sphere-telco-test.dyndns.org/ | head -5
```

Then open <https://sphere-telco-test.dyndns.org/> in a **private window**
(or DevTools → "Disable cache"). The default `Cache-Control` headers
keep `index.html` uncached but the SW from the prior bundle may still
be holding `/assets/`. Hard refresh.

---

## Quick redeploy — page-only change, same SDK

When only `src/` changed (no SDK touch), skip Steps 1–2:

```bash
cd /home/vrogojin/sphere.telco
git pull --ff-only                       # whatever branch the page change is on
docker build -f Dockerfile.ssl -t sphere-app:latest .
./run-sphere.sh \
    --domain sphere-telco-test.dyndns.org \
    --ssl-email admin@unicity.network
```

## Switching to a different sphere-sdk branch

Re-run Steps 1–4 with the new branch. The vendor refresh in Step 2
overwrites whatever was there.

## Reverting to the previously deployed image (instant rollback)

Tag the prior image as a rescue point **before** you rebuild:

```bash
# Right before Step 3 of a fresh deploy, capture the current :latest.
docker tag sphere-app:latest sphere-app:pre-$(date +%Y%m%d-%H%M%S)
docker images sphere-app                 # confirm the snapshot is there
```

Roll back without rebuilding:

```bash
docker tag sphere-app:pre-<stamp> sphere-app:latest
./run-sphere.sh \
    --domain sphere-telco-test.dyndns.org \
    --ssl-email admin@unicity.network
```

## Common gotchas

- **Build went green but the page is unchanged.** You probably built
  the wrong Dockerfile. Check `docker images sphere-frontend` — if
  that exists, you accidentally ran `docker compose build` instead of
  `docker build -f Dockerfile.ssl`. The dev compose image doesn't
  feed HAProxy. Rebuild with `-f Dockerfile.ssl`.
- **SDK change isn't visible in the page bundle.** Either Step 2 was
  skipped, or the `version` field in `vendor-sphere-sdk/package.json`
  didn't change. Re-run Step 2 and confirm `cat
  vendor-sphere-sdk/SHA.txt` matches
  `git -C /home/vrogojin/uxf rev-parse --short HEAD`.
- **`sphere-app` container doesn't appear on `haproxy-net`.** The
  HAProxy container may have been recreated without `haproxy-net`
  pre-existing. `docker network inspect haproxy-net` to confirm; if
  missing, `run-sphere.sh` creates it but HAProxy needs to be
  reattached (`docker network connect haproxy-net haproxy`).
- **TLS cert expired during a long pause.** The cert store lives in
  the `letsencrypt-data` volume and is shared across redeploys.
  `run-sphere.sh` re-runs ssl-setup on every restart, which renews if
  needed. If renewal fails (rate-limit, DNS), pass `--ssl-test-mode`
  to fall back to a self-signed cert and unblock the iteration loop.
- **Stale `vendor-sphere-sdk/node_modules/`.** The vendor dir has its
  own `node_modules/` (created when sphere-sdk's own build ran). If
  a vendor refresh leaves stale node_modules around, delete them
  before Step 2: `rm -rf vendor-sphere-sdk/node_modules` — the
  Docker build doesn't need them.
- **HAProxy registration silently failed.** Inspect with
  `docker logs sphere-app 2>&1 | grep -i haproxy`. The
  `--haproxy-api-key` flag isn't required for the current local
  setup (the haproxy container's Registration API accepts unauth
  registrations from `haproxy-net`), but if you've enabled auth,
  pass it explicitly.

---

## Per-branch GH Pages preview (unrelated, for code review only)

Every `git push` to a sphere.telco branch (except `gh-pages`)
auto-deploys a preview at:

```
https://unicity-sphere.github.io/sphere/<sanitized-branch>/
```

Branch names are slug-sanitized: `fix/foo-bar` →
`fix-foo-bar`. The preview build talks to the same testnet backends
as the dev page, so a Service Status banner verdicts the same. Useful
for PR review without running the local rebuild loop.

Triggered by `.github/workflows/deploy-pages-branch.yml`. Cleanup is
automatic when the branch is deleted.

## CI gate

`.github/workflows/ci.yml` runs on every push + PR:

```bash
npm ci
npm run lint
npm run test:run
npm run build
```

Run the same locally before pushing:

```bash
npm run lint && npm run test:run && npm run build
```

---

## Cheat sheet

```bash
# Full cycle (SDK + page change)
cd /home/vrogojin/uxf && git checkout <sdk-branch> && git pull --ff-only && npm run build
cd /home/vrogojin/sphere.telco
rsync -a --delete /home/vrogojin/uxf/dist/ vendor-sphere-sdk/dist/
cp /home/vrogojin/uxf/package.json vendor-sphere-sdk/package.json
SDK_SHA=$(cd /home/vrogojin/uxf && git rev-parse --short HEAD); \
  SDK_BRANCH=$(cd /home/vrogojin/uxf && git rev-parse --abbrev-ref HEAD | tr '/' '-'); \
  node -e "const p=require('./vendor-sphere-sdk/package.json'); \
    p.version='0.8.0-sdk-'+'${SDK_SHA}'+'-'+'${SDK_BRANCH}'; \
    require('fs').writeFileSync('./vendor-sphere-sdk/package.json', JSON.stringify(p, null, 2));" && \
  echo "$SDK_SHA" > vendor-sphere-sdk/SHA.txt
npm install
docker build -f Dockerfile.ssl -t sphere-app:latest .
./run-sphere.sh --domain sphere-telco-test.dyndns.org --ssl-email admin@unicity.network
docker ps --filter "name=^sphere-app$"

# Page-only change (no SDK touch)
cd /home/vrogojin/sphere.telco && git pull --ff-only
docker build -f Dockerfile.ssl -t sphere-app:latest .
./run-sphere.sh --domain sphere-telco-test.dyndns.org --ssl-email admin@unicity.network

# Instant rollback (need a pre-snapshot tag)
docker tag sphere-app:pre-<stamp> sphere-app:latest
./run-sphere.sh --domain sphere-telco-test.dyndns.org --ssl-email admin@unicity.network
```
