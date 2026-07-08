#!/bin/sh
# Per-environment public config at container start — three jobs:
#   1. sed the baked __RUNTIME_*__ placeholders in the built JS (string values);
#   2. write /runtime-config.js (window.__SPHERE_RUNTIME_CONFIG__) for values
#      that must gate feature branches at runtime (subscriptions);
#   3. generate the nginx /sgw reverse-proxy snippet from SGW_UPSTREAM.
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
#   AGGREGATOR_API_KEY     aggregator API key (non-secret on testnet2)
#   SUBSCRIPTION_ENABLED   per-wallet SGW subscription keys — the app checks
#                          for EXACTLY 'true'; anything else leaves it off
#   PAID_PLANS_ENABLED     paid-plan purchases (EXACTLY 'true'; testnet: off)
#   SUBSCRIPTION_API_URL   SGW base as the BROWSER sees it (default /sgw,
#                          which rides the same-origin proxy below)
#   SGW_UPSTREAM           subscription-gateway origin the nginx /sgw
#                          reverse proxy forwards to (plain http(s) URL);
#                          unset = no /sgw route is generated
#
# (VITE_SUBSCRIPTION_MOCK is intentionally NOT part of this contract — mock
# mode is dev-only and stays a build-time constant; see src/config/subscription.ts.)
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

# ── Fail-closed (subscriptions) ──────────────────────────────────────────────
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
if [ "${SUBSCRIPTION_ENABLED-}" = true ]; then sub_enabled=1; else sub_enabled=0; fi
# A relative SUBSCRIPTION_API_URL (the default /sgw) resolves against the app's
# own origin, so it only works if this container also serves the reverse proxy
# below. Enabling subscriptions without that route would make every SGW call
# hit the SPA fallback and get index.html instead of JSON — refuse to start so
# the misconfiguration surfaces in the orchestrator, not as broken onboarding.
sub_api_url="${SUBSCRIPTION_API_URL:-/sgw}"
case "$sub_api_url" in
  /*) if [ "$sub_enabled" = 1 ] && [ -z "${SGW_UPSTREAM-}" ]; then
        log "ERROR: SUBSCRIPTION_ENABLED=true with a relative SUBSCRIPTION_API_URL ('$sub_api_url')"
        log "       but SGW_UPSTREAM is empty — there is no route from '$sub_api_url' to an SGW."
        log "       Set SGW_UPSTREAM to the subscription-gateway origin (or an absolute"
        log "       SUBSCRIPTION_API_URL, which only works for the CORS-enabled endpoints)."
        exit 1
      fi ;;
esac

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
# The subscription values do NOT ride the sed mechanism above: Rollup
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
for v in SUBSCRIPTION_API_URL SUBSCRIPTION_ENABLED PAID_PLANS_ENABLED; do
  eval "val=\${$v-}"
  case "$val" in
    *"$nl"* | *"$cr"*)
      log "ERROR: \$$v contains a line break (CR or LF) — refusing to write runtime-config.js."
      exit 1 ;;
  esac
done
json_escape() { printf '%s' "$1" | sed -e 's/[\\"]/\\&/g'; }
# The RAW env values go in (no /sgw default here): empty means "not set on the
# container", and the app resolves empty -> build-time VITE_* -> '/sgw', so a
# value pinned at image build time stays honored.
cat > "$WEBROOT/runtime-config.js" <<EOF
// Generated at container start by sphere-runtime-config — do not edit.
// Empty values fall back to the build-time VITE_* env (src/config/subscription.ts).
window.__SPHERE_RUNTIME_CONFIG__ = {
  "SUBSCRIPTION_API_URL": "$(json_escape "${SUBSCRIPTION_API_URL-}")",
  "SUBSCRIPTION_ENABLED": "$(json_escape "${SUBSCRIPTION_ENABLED-}")",
  "PAID_PLANS_ENABLED": "$(json_escape "${PAID_PLANS_ENABLED-}")"
};
EOF
log "wrote $WEBROOT/runtime-config.js"

# Visibility: warn (don't fail) when a public var is unset — it substitutes to
# an empty string, which is almost always an operator mistake worth seeing.
for v in SPHERE_API_URL DEV_PORTAL_URL AGGREGATOR_API_KEY; do
  eval "val=\${$v-}"
  [ -z "$val" ] && log "WARNING: \$$v is unset; substituting empty string"
done

# ── nginx /sgw reverse proxy (same-origin SGW route) ─────────────────────────
# The SGW store endpoints send no CORS headers, so the browser reaches the SGW
# through a same-origin /sgw route on this container — the production mirror of
# the vite dev proxy (`/sgw/<path>` -> `${SGW_UPSTREAM}/<path>`, prefix
# stripped). The server configs (Dockerfile + deploy/entrypoint.sh) include
# this snippet by GLOB (`sphere-sgw-location*.conf`) so a missing file means
# "no route", not an nginx startup error. Regenerated on every container start.
SGW_SNIPPET_DIR="${SPHERE_SGW_SNIPPET_DIR:-/etc/nginx/snippets}"
SGW_SNIPPET="$SGW_SNIPPET_DIR/sphere-sgw-location.conf"
if [ -n "${SGW_UPSTREAM-}" ]; then
  # The value is interpolated into nginx config, so validate hard: an http(s)
  # ORIGIN only — scheme://host[:port], conservative charset, no path (the
  # variable proxy_pass below would silently ignore one), nothing that could
  # terminate the directive and inject config. grep is line-based, so reject
  # embedded newlines first (a payload after a newline would otherwise be
  # invisible to the pattern match).
  if [ "$(printf '%s' "$SGW_UPSTREAM" | wc -l)" -ne 0 ]; then
    log "ERROR: SGW_UPSTREAM contains a newline — refusing to write nginx config."
    exit 1
  fi
  sgw_upstream="${SGW_UPSTREAM%/}"
  if ! printf '%s\n' "$sgw_upstream" | grep -Eq '^https?://[A-Za-z0-9._-]+(:[0-9]+)?$'; then
    log "ERROR: SGW_UPSTREAM must be an http(s) ORIGIN — scheme://host[:port], no path,"
    log "       host charset [A-Za-z0-9._-] — got: '$SGW_UPSTREAM'"
    exit 1
  fi
  # Request-time DNS: a literal proxy_pass hostname is resolved ONCE at nginx
  # startup and is FATAL if unresolvable — that would crash-loop the whole
  # wallet app on a DNS blip, and rotated upstream IPs (the gateway publishes
  # short-TTL records) would go stale for the container's lifetime. Putting
  # the upstream in a variable defers resolution to request time, which needs
  # an explicit resolver: use the container's own nameservers (VPC DNS on
  # ECS, embedded DNS under docker) from resolv.conf. IPv6 entries get
  # bracketed; scoped (%iface) entries are skipped.
  resolvers=$(awk '/^nameserver/ { ns=$2; if (ns ~ /%/) next; if (ns ~ /:/) ns="["ns"]"; r = r ns " " } END { printf "%s", r }' /etc/resolv.conf 2>/dev/null || true)
  mkdir -p "$SGW_SNIPPET_DIR"
  if [ -n "$resolvers" ]; then
    cat > "$SGW_SNIPPET" <<EOF
# Generated at container start by sphere-runtime-config from \$SGW_UPSTREAM.
# Same-origin route to the subscription gateway, mirroring the vite dev proxy:
# /sgw/<path> -> ${sgw_upstream}/<path> (the /sgw prefix is stripped).
# The upstream rides a VARIABLE so nginx resolves it per request (short TTL)
# instead of once-at-startup (which is fatal when unresolvable); the rewrite
# does the prefix strip that a literal proxy_pass URI would have done.
location /sgw/ {
    resolver ${resolvers}valid=30s;
    resolver_timeout 5s;
    set \$sphere_sgw_upstream ${sgw_upstream};
    rewrite ^/sgw(/.*)\$ \$1 break;
    proxy_pass \$sphere_sgw_upstream;
    proxy_http_version 1.1;
    # SNI + Host for TLS upstreams behind name-based routing (ALB/CloudFront).
    proxy_ssl_server_name on;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
}
EOF
  else
    # No usable nameserver found (unusual). Fall back to a literal proxy_pass:
    # resolution happens once at nginx startup, and an unresolvable host is
    # fatal there — degraded but functional; the log line calls it out.
    log "WARNING: no nameserver found in /etc/resolv.conf — /sgw upstream will be"
    log "         resolved once at nginx startup (fatal if unresolvable, never re-resolved)."
    cat > "$SGW_SNIPPET" <<EOF
# Generated at container start by sphere-runtime-config from \$SGW_UPSTREAM.
# Same-origin route to the subscription gateway (startup-time DNS fallback —
# no nameserver was found in resolv.conf for request-time resolution).
location /sgw/ {
    proxy_pass ${sgw_upstream}/;
    proxy_http_version 1.1;
    proxy_ssl_server_name on;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
}
EOF
  fi
  log "wrote $SGW_SNIPPET (/sgw -> $sgw_upstream)"
else
  # Stale-route guard: an earlier start of this container may have written the
  # snippet; SGW_UPSTREAM now unset must mean NO /sgw route.
  rm -f "$SGW_SNIPPET"
  log "SGW_UPSTREAM unset; no /sgw reverse proxy configured"
fi

# ── Apply over the built JS (one sed program, all files) ─────────────────────
# `-exec ... \;` (not `+`) for portability across BusyBox (alpine image) and
# GNU (SSL image) find. A handful of hashed JS files — per-file cost is nil.
find "$WEBROOT" -type f -name '*.js' -exec sed -i -f "$SED_SCRIPT" {} \;

log "applied runtime config to JS assets in $WEBROOT"
