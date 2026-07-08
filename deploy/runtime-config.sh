#!/bin/sh
# Substitute per-environment public config into the already-built JS bundle.
#
# Why this exists: Vite *inlines* `import.meta.env.VITE_*` into the static
# bundle at `vite build`, so a normal build is environment-locked — a runtime
# env (ECS task def, `docker -e`) cannot change an already-built bundle. To get
# ONE image we can promote staging -> prod, the Docker build bakes unique
# sentinel placeholders (the Dockerfile ARG defaults, e.g.
# `__RUNTIME_SPHERE_API_URL__`) instead of real values, and this script rewrites
# them to the real per-environment values when the container starts.
#
# This mirrors the sphere-dev-portal convention (entrypoint sed's env vars into
# the built JS). Vite's content-hashed filenames stay identical across env-var
# changes, so a CDN/CloudFront cache in front of this MUST be invalidated after
# changing any of these values.
#
# Runtime contract — set these on the ECS task definition / `docker -e`:
#   SPHERE_API_URL       quest-api base (marketplace / user / maintenance)
#   WALLET_API_URL       wallet-api backend base (S4 asset custody)
#   BRIDGE_RETURN_SERVICE_URL bridge-return-service / prover base URL
#   REQUIRE_WALLET_API   #351 fail-closed custody flag ('' / false / 0 = off)
#   DEV_PORTAL_URL       developer-portal link target
#   AGGREGATOR_API_KEY   aggregator API key (non-secret on testnet2)
#
# Runs as a stock-nginx `/docker-entrypoint.d/` hook (POSIX sh, BusyBox-safe)
# and is also invoked from deploy/entrypoint.sh in the SSL image.
set -eu

WEBROOT="${SPHERE_WEBROOT:-/usr/share/nginx/html}"
log() { echo "sphere-runtime-config: $*" >&2; }

# ── Fail-closed (#351) ───────────────────────────────────────────────────────
# A bundle that DECLARES wallet-api custody (REQUIRE_WALLET_API truthy) but has
# no backend URL must not boot: silently composing the legacy local-custody
# bundle would change the custody model, not just degrade a feature (the
# 2026-06-12 incident). Truthiness matches src/config/walletApi.ts exactly:
# only '', 'false', '0' count as off.
case "${REQUIRE_WALLET_API-}" in
  '' | false | 0) require_wallet_api=0 ;;
  *)              require_wallet_api=1 ;;
esac
if [ "$require_wallet_api" = 1 ] && [ -z "${WALLET_API_URL-}" ]; then
  log "ERROR: REQUIRE_WALLET_API is set but WALLET_API_URL is empty —"
  log "       refusing to start (would silently change the custody model, #351)."
  exit 1
fi

# ── Build the substitution program ───────────────────────────────────────────
# Escape the replacement for a sed `s|...|...|` command: backslash, the `|`
# delimiter, and `&` (whole-match backreference) are the only specials.
sed_escape() { printf '%s' "$1" | sed -e 's/[\\&|]/\\&/g'; }

SED_SCRIPT="$(mktemp)"
trap 'rm -f "$SED_SCRIPT"' EXIT
add() { printf 's|%s|%s|g\n' "$1" "$(sed_escape "$2")" >> "$SED_SCRIPT"; }

add __RUNTIME_SPHERE_API_URL__     "${SPHERE_API_URL-}"
add __RUNTIME_WALLET_API_URL__     "${WALLET_API_URL-}"
add __RUNTIME_BRIDGE_RETURN_SERVICE_URL__ "${BRIDGE_RETURN_SERVICE_URL-}"
add __RUNTIME_REQUIRE_WALLET_API__ "${REQUIRE_WALLET_API-}"
add __RUNTIME_DEV_PORTAL_URL__     "${DEV_PORTAL_URL-}"
add __RUNTIME_AGGREGATOR_API_KEY__ "${AGGREGATOR_API_KEY-}"

# Visibility: warn (don't fail) when a public var is unset — it substitutes to
# an empty string, which is almost always an operator mistake worth seeing.
for v in SPHERE_API_URL BRIDGE_RETURN_SERVICE_URL DEV_PORTAL_URL AGGREGATOR_API_KEY; do
  eval "val=\${$v-}"
  [ -z "$val" ] && log "WARNING: \$$v is unset; substituting empty string"
done

# ── Apply over the built JS (one sed program, all files) ─────────────────────
# `-exec ... \;` (not `+`) for portability across BusyBox (alpine image) and
# GNU (SSL image) find. A handful of hashed JS files — per-file cost is nil.
find "$WEBROOT" -type f -name '*.js' -exec sed -i -f "$SED_SCRIPT" {} \;

log "applied runtime config to JS assets in $WEBROOT"
