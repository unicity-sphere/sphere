#!/bin/sh
# Per-environment public config at container start — two jobs:
#   1. sed the baked __RUNTIME_*__ placeholders in the built JS (string values);
#   2. write /runtime-config.js (window.__SPHERE_RUNTIME_CONFIG__) for values
#      that must gate feature branches at runtime (the subscription flags).
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
#   SPHERE_API_URL         quest-api base (marketplace / user / maintenance)
#   WALLET_API_URL         wallet-api backend base (S4 asset custody)
#   REQUIRE_WALLET_API     #351 fail-closed custody flag ('' / false / 0 = off)
#   DEV_PORTAL_URL         developer-portal link target
#   AGGREGATOR_API_KEY     aggregator API key (non-secret on testnet2) —
#                          REQUIRED only when SUBSCRIPTION_ENABLED != 'true';
#                          IGNORED when subscriptions are on (per-wallet keys)
#   SUBSCRIPTION_ENABLED   per-wallet SGW subscription keys — the app checks
#                          for EXACTLY 'true'; anything else leaves it off
#   PAID_PLANS_ENABLED     paid-plan purchases (EXACTLY 'true'; testnet: off)
#
# The SGW base URL is NOT part of this contract: the SGW is the aggregator
# gateway, so the app derives it from the SDK's per-network config (see
# src/config/subscription.ts) — all SGW endpoints serve CORS for direct
# browser calls (unicitynetwork/aggregator-subscription#57).
# (VITE_SUBSCRIPTION_MOCK is intentionally NOT part of this contract either —
# mock mode is dev-only and stays a build-time constant.)
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
# Even without REQUIRE_WALLET_API, an empty WALLET_API_URL is broken in the
# Docker bundle: the compiled getWalletApiBaseUrl() cannot fall back to the
# legacy local-custody composition (its unset-branch is compile-time
# eliminated against the placeholder — see src/config/walletApi.ts) and would
# compose wallet-api against the app's own origin. Warn loudly.
if [ -z "${WALLET_API_URL-}" ]; then
  log "WARNING: WALLET_API_URL is empty — this image cannot compose the legacy"
  log "         local-custody bundle; the app would target its own origin as wallet-api."
fi

# ── Subscription flag sanity ─────────────────────────────────────────────────
# The app enables these flags only on EXACTLY 'true' (src/config/subscription.ts),
# so catch near-miss spellings ('TRUE', '1', 'yes') an operator would expect
# to work — for BOTH flags; PAID_PLANS_ENABLED's flip is the one-shot mainnet
# switch where a silent no-op costs the most.
for flag in SUBSCRIPTION_ENABLED PAID_PLANS_ENABLED; do
  eval "fv=\${$flag-}"
  case "$fv" in
    '' | true | false | 0) ;;
    *) log "WARNING: $flag='$fv' does NOT enable it — the app checks for exactly 'true'" ;;
  esac
done

# ── AGGREGATOR_API_KEY requirement (conditional on subscriptions) ─────────────
# The two oracle-key modes are mutually exclusive (src/sdk/oracleKey.ts):
#   Subscriptions ON  → the per-wallet SGW key is the oracle credential and the
#                       static AGGREGATOR_API_KEY is IGNORED (not required).
#   Subscriptions OFF → AGGREGATOR_API_KEY is the ONLY oracle credential, so it
#                       is REQUIRED — without it the app has no key to sign L3
#                       state transitions; fail closed rather than ship a wallet
#                       that can't send.
if [ "${SUBSCRIPTION_ENABLED-}" = "true" ]; then
  [ -n "${AGGREGATOR_API_KEY-}" ] && \
    log "NOTE: AGGREGATOR_API_KEY is set but ignored — SUBSCRIPTION_ENABLED=true uses per-wallet keys."
elif [ -z "${AGGREGATOR_API_KEY-}" ]; then
  log "ERROR: AGGREGATOR_API_KEY is empty and SUBSCRIPTION_ENABLED is not 'true' —"
  log "       refusing to start (the app would have no aggregator key to send with)."
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
add __RUNTIME_REQUIRE_WALLET_API__ "${REQUIRE_WALLET_API-}"
add __RUNTIME_DEV_PORTAL_URL__     "${DEV_PORTAL_URL-}"
add __RUNTIME_AGGREGATOR_API_KEY__ "${AGGREGATOR_API_KEY-}"

# ── Runtime config global (window.__SPHERE_RUNTIME_CONFIG__) ────────────────
# The subscription flags do NOT ride the sed mechanism above: Rollup
# statically evaluates branch conditions against baked literals at build time
# and prunes every `if (FLAG)` in the app, so a substituted placeholder can
# never turn a feature ON (see src/config/subscription.ts). Instead they are
# served as a tiny classic script the app loads before the bundle
# (src/index.html), rewritten here from the container env on every start.
# Empty values fall back to the build-time VITE_* env inside the app.
# LF *and* CR are rejected: both are JS LineTerminators, and a raw one inside
# the generated string literal would SyntaxError the whole file — the global
# would never be assigned and every value here would silently fall back (a
# trailing \r from a CRLF .env paste is exactly how that happens).
nl='
'
cr=$(printf '\r')
for v in SUBSCRIPTION_ENABLED PAID_PLANS_ENABLED; do
  eval "val=\${$v-}"
  case "$val" in
    *"$nl"* | *"$cr"*)
      log "ERROR: \$$v contains a line break (CR or LF) — refusing to write runtime-config.js."
      exit 1 ;;
  esac
done
json_escape() { printf '%s' "$1" | sed -e 's/[\\"]/\\&/g'; }
cat > "$WEBROOT/runtime-config.js" <<EOF
// Generated at container start by sphere-runtime-config — do not edit.
// Empty values fall back to the build-time VITE_* env (src/config/subscription.ts).
window.__SPHERE_RUNTIME_CONFIG__ = {
  "SUBSCRIPTION_ENABLED": "$(json_escape "${SUBSCRIPTION_ENABLED-}")",
  "PAID_PLANS_ENABLED": "$(json_escape "${PAID_PLANS_ENABLED-}")"
};
EOF
log "wrote $WEBROOT/runtime-config.js"

# Visibility: warn (don't fail) when a public var is unset — it substitutes to
# an empty string, which is almost always an operator mistake worth seeing.
# (AGGREGATOR_API_KEY is handled by the conditional requirement above, not here.)
for v in SPHERE_API_URL DEV_PORTAL_URL; do
  eval "val=\${$v-}"
  [ -z "$val" ] && log "WARNING: \$$v is unset; substituting empty string"
done

# ── Apply over the built JS (one sed program, all files) ─────────────────────
# `-exec ... \;` (not `+`) for portability across BusyBox (alpine image) and
# GNU (SSL image) find. A handful of hashed JS files — per-file cost is nil.
find "$WEBROOT" -type f -name '*.js' -exec sed -i -f "$SED_SCRIPT" {} \;

log "applied runtime config to JS assets in $WEBROOT"

# ── Content-Security-Policy ──────────────────────────────────────────────────
# Regenerated here rather than baked, because connect-src carries per-environment
# backend origins and this image is built once and promoted unchanged.
#
# The file COPYed at build time holds `.invalid` placeholders (RFC 2606, can never
# resolve), so if this block does not run the failure mode is a blocked-and-reported
# request rather than a silent bypass.
#
# nginx has not started yet — the stock entrypoint runs /docker-entrypoint.d hooks
# first — so rewriting an included conf file here is safe and needs no reload.
HEADERS_CONF="${SPHERE_HEADERS_CONF:-/etc/nginx/sphere-security-headers.conf}"

if [ -w "$(dirname "$HEADERS_CONF")" ]; then
  # Origin (scheme://host[:port]) of a URL — CSP matches origins, not paths, and a
  # trailing path in a source expression silently narrows the match.
  origin_of() {
    printf '%s' "$1" | sed -n 's|^\(https\{0,1\}://[^/]*\).*|\1|p'
  }

  CONNECT="'self'"
  for u in "${SPHERE_API_URL-}" "${WALLET_API_URL-}" "${AGGREGATOR_URL-}" \
           "${SUBSCRIPTION_API_URL-}" "${TRUSTBASE_URL-}"; do
    o=$(origin_of "$u")
    [ -n "$o" ] && CONNECT="$CONNECT $o"
  done

  # Fixed destinations the SDK reaches regardless of environment: Nostr relays over
  # websocket, the price feed, IPFS, the market API, and Sentry's ingest host.
  CONNECT="$CONNECT wss://relay.unicity.network wss://sphere-relay.unicity.network"
  CONNECT="$CONNECT wss://nostr-relay.testnet.unicity.network"
  CONNECT="$CONNECT wss://relay.damus.io wss://relay.nostr.band wss://nos.lol"
  CONNECT="$CONNECT https://api.coingecko.com https://market-api.unicity.network"
  # The market client derives its feed socket by rewriting the API scheme
  # (SDK: apiUrl.replace(/^http/,'ws') + '/ws/feed'), and CSP treats wss:// as a
  # DIFFERENT origin than https:// — the https entry above does not cover it.
  CONNECT="$CONNECT wss://market-api.unicity.network"
  CONNECT="$CONNECT https://unicity-ipfs1.dyndns.org"
  CONNECT="$CONNECT https://o4511695062237184.ingest.de.sentry.io"

  # Report-Only until staging reports are clean. Flip the header NAME to enforce —
  # nothing else about the policy changes.
  CSP_HEADER="${SPHERE_CSP_HEADER_NAME:-Content-Security-Policy-Report-Only}"

  cat > "$HEADERS_CONF" <<EOF
# Generated at container start by sphere-runtime-config — do not edit.
add_header $CSP_HEADER "default-src 'self'; base-uri 'self'; object-src 'none'; worker-src 'none'; form-action 'self'; frame-ancestors 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; frame-src https: http://localhost:* http://127.0.0.1:*; connect-src $CONNECT; upgrade-insecure-requests" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
EOF
  log "wrote $HEADERS_CONF ($CSP_HEADER)"
else
  log "WARNING: $(dirname "$HEADERS_CONF") not writable — keeping the baked policy with .invalid placeholders"
fi
