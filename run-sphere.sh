#!/bin/bash
#
# Sphere App — Docker launcher with SSL + HAProxy integration
#
# Usage:
#   ./run-sphere.sh --domain sphere-test.dyndns.org --ssl-email admin@example.com
#   ./run-sphere.sh --domain sphere-test.dyndns.org --ssl-test-mode   # self-signed
#   ./run-sphere.sh --no-ssl                                          # HTTP only
#   ./run-sphere.sh --no-haproxy --domain sphere-test.dyndns.org      # direct ports
#
# Build first:
#   docker build -f Dockerfile.ssl -t sphere-app:latest .
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── App identity ─────────────────────────────────────────────────────────────
CONTAINER_NAME="${CONTAINER_NAME:-sphere-app}"
IMAGE_NAME="${SPHERE_IMAGE:-sphere-app:latest}"
APP_TITLE="Sphere App"

# ── App networking ───────────────────────────────────────────────────────────
# APP_NET intentionally unset — sphere needs no app-specific network.
# run-lib.sh's ${APP_NET:-default} falls back correctly when unset.
unset APP_NET
DATA_VOLUME="${DATA_VOLUME:-sphere-data}"
SSL_CHECK_PORT=443
SSL_HTTPS_PORT="${SSL_HTTPS_PORT:-443}"
APP_HTTP_PORT="${APP_HTTP_PORT:-8080}"

# ── Source ssl-manager run library ───────────────────────────────────────────
SSL_MANAGER_DIR="${SSL_MANAGER_DIR:-$(cd "$SCRIPT_DIR/../ssl-manager" 2>/dev/null && pwd || echo "")}"
if [ -z "$SSL_MANAGER_DIR" ] || [ ! -f "${SSL_MANAGER_DIR}/run-lib.sh" ]; then
    echo "ERROR: ssl-manager/run-lib.sh not found." >&2
    echo "  Tried: ${SSL_MANAGER_DIR:-$SCRIPT_DIR/../ssl-manager}" >&2
    echo "  Set SSL_MANAGER_DIR to the ssl-manager repo path." >&2
    exit 1
fi
source "${SSL_MANAGER_DIR}/run-lib.sh"

# ── App hooks ────────────────────────────────────────────────────────────────

# Called after CLI parsing — sync HEALTH_PORT with final APP_HTTP_PORT
app_validate() {
    HEALTH_PORT="$APP_HTTP_PORT"
}

app_health_check() {
    local container="$1"
    local resp
    if [ "$APP_HTTP_PORT" != "0" ]; then
        resp=$(docker exec "$container" curl -sf "http://localhost:${APP_HTTP_PORT}/" 2>/dev/null | head -c 100)
        if [ -n "$resp" ]; then
            echo "pass:HTTP endpoint responding"
        else
            echo "fail:HTTP endpoint not responding"
        fi
    fi

    if [ -n "$SSL_DOMAIN" ]; then
        resp=$(docker exec "$container" curl -sfk "https://localhost:${SSL_HTTPS_PORT}/" 2>/dev/null | head -c 100)
        if [ -n "$resp" ]; then
            echo "pass:HTTPS endpoint responding"
        else
            echo "fail:HTTPS endpoint not responding"
        fi
    fi
}

app_summary() {
    echo ""
    echo "Endpoints:"
    if [ "$USE_HAPROXY" = true ] && [ -n "$HAPROXY_HOST" ] && [ -n "$SSL_DOMAIN" ]; then
        echo "  HTTPS: https://$SSL_DOMAIN"
        echo "  HTTP:  http://$SSL_DOMAIN"
    elif [ -n "$SSL_DOMAIN" ]; then
        echo "  HTTPS: https://localhost"
        echo "  HTTP:  http://localhost"
    else
        echo "  HTTP:  http://localhost"
    fi
}

app_help() {
    cat <<'HELP'
Sphere Build:
  Build the image first:
    docker build -f Dockerfile.ssl -t sphere-app:latest .

  With custom env:
    docker build -f Dockerfile.ssl -t sphere-app:latest \
      --build-arg VITE_AGGREGATOR_URL=https://... \
      --build-arg VITE_KBBOT_URL=https://... .
HELP
}

ssl_manager_run "$@"
