#!/bin/bash
set -e

# ── Export env so ssl-setup inherits our defaults ────────────────────────────
export APP_HTTP_PORT="${APP_HTTP_PORT:-8080}"
export SSL_HTTPS_PORT="${SSL_HTTPS_PORT:-443}"

# ── Normalize SSL_REQUIRED (fail closed on unknown values) ───────────────────
# Accept common boolean spellings; anything else errors so a typo doesn't
# silently downgrade the security posture. Whitespace is trimmed first
# because operators commonly paste values with stray spaces from .env files
# or orchestrator dashboards.
_ssl_req="${SSL_REQUIRED:-true}"
_ssl_req="${_ssl_req#"${_ssl_req%%[![:space:]]*}"}"  # ltrim
_ssl_req="${_ssl_req%"${_ssl_req##*[![:space:]]}"}"  # rtrim
case "$_ssl_req" in
    true|TRUE|True|1|yes|YES|Yes) SSL_REQUIRED=true ;;
    false|FALSE|False|0|no|NO|No) SSL_REQUIRED=false ;;
    *) echo "ERROR: SSL_REQUIRED must be true/false, got: '${SSL_REQUIRED}'" >&2; exit 1 ;;
esac
unset _ssl_req

# ── Validate env vars before use in nginx config ────────────────────────────
validate_port() {
    if ! [[ "$2" =~ ^[0-9]+$ ]] || [ "$((10#$2))" -lt 1 ] || [ "$((10#$2))" -gt 65535 ]; then
        echo "ERROR: $1 must be a port number (1-65535), got: '$2'" >&2; exit 1
    fi
}
validate_path() {
    local allowed='^[a-zA-Z0-9/._-]+$'
    if ! [[ "$2" =~ $allowed ]]; then
        echo "ERROR: $1 contains invalid characters: '$2'" >&2; exit 1
    fi
    if [[ "$2" == *..* ]]; then
        echo "ERROR: $1 contains path traversal: '$2'" >&2; exit 1
    fi
}
# kill by pidfile, only if the file contains a plausible numeric pid.
# Guards against corrupt pidfiles, empty strings (which kill rejects), and
# the rare PID-reuse race that can target an unrelated process.
kill_pidfile() {
    local pidfile="$1"
    local pid
    pid=$(cat "$pidfile" 2>/dev/null || true)
    if [[ "$pid" =~ ^[0-9]+$ ]] && [ "$pid" -gt 1 ]; then
        kill "$pid" 2>/dev/null || true
    fi
}

validate_port "APP_HTTP_PORT" "$APP_HTTP_PORT"
validate_port "SSL_HTTPS_PORT" "$SSL_HTTPS_PORT"

# ── SSL setup (certs + HAProxy registration) ─────────────────────────────────
ssl-setup || {
    rc=$?
    echo "WARNING: SSL setup failed (exit $rc)" >&2
    # Kill any orphaned ssl-manager processes from partial setup
    kill_pidfile /tmp/.ssl-http-proxy.pid
    if [ "$SSL_REQUIRED" = "true" ]; then exit 1; fi
}

# Parse cert paths from ssl-env without sourcing (avoid code execution).
# tail -n1 matches shell-sourcing semantics (last assignment wins); using
# head -1 would let an earlier blank line silently downgrade us to HTTP.
SSL_CERT_FILE=""
SSL_KEY_FILE=""
if [ -f /tmp/.ssl-env ]; then
    SSL_CERT_FILE=$(grep '^SSL_CERT_FILE=' /tmp/.ssl-env | tail -n1 | cut -d= -f2- || true)
    SSL_KEY_FILE=$(grep '^SSL_KEY_FILE=' /tmp/.ssl-env | tail -n1 | cut -d= -f2- || true)
fi

# Validate cert paths if set
if [ -n "$SSL_CERT_FILE" ]; then validate_path "SSL_CERT_FILE" "$SSL_CERT_FILE"; fi
if [ -n "$SSL_KEY_FILE" ]; then validate_path "SSL_KEY_FILE" "$SSL_KEY_FILE"; fi

# If SSL_DOMAIN was set but cert paths weren't populated, fail loudly unless
# SSL_REQUIRED=false explicitly opted out. Silent HTTP downgrade is a
# security posture regression operators need to see.
if [ -n "${SSL_DOMAIN:-}" ] && { [ -z "$SSL_CERT_FILE" ] || [ -z "$SSL_KEY_FILE" ]; }; then
    echo "WARNING: SSL_DOMAIN=$SSL_DOMAIN set but no cert paths found in /tmp/.ssl-env" >&2
    if [ "$SSL_REQUIRED" = "true" ]; then
        echo "ERROR: refusing to start without SSL (set SSL_REQUIRED=false to allow HTTP-only)" >&2
        exit 1
    fi
fi

# Ensure cert directories are readable by nginx workers
chmod 0755 /etc/letsencrypt/archive/ /etc/letsencrypt/live/ 2>/dev/null || true

# ── Generate nginx config ────────────────────────────────────────────────────
rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf

NGINX_CONF=/etc/nginx/conf.d/sphere.conf

if [ -n "$SSL_CERT_FILE" ] && [ -f "$SSL_CERT_FILE" ] && [ -f "$SSL_KEY_FILE" ]; then
    cat > "$NGINX_CONF" <<NGINX
server {
    listen ${APP_HTTP_PORT};
    server_name _;
    return 301 https://\$host\$request_uri;
}

server {
    listen ${SSL_HTTPS_PORT} ssl;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    ssl_certificate     ${SSL_CERT_FILE};
    ssl_certificate_key ${SSL_KEY_FILE};
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_ecdh_curve      X25519:secp384r1:prime256v1;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;

    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;
    ssl_stapling        on;
    ssl_stapling_verify on;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location = /index.html {
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    location /assets/ {
        expires 1y;
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header Cache-Control "public, immutable";
    }
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
NGINX
    echo "nginx: HTTP :${APP_HTTP_PORT} (redirect), HTTPS :${SSL_HTTPS_PORT}"
else
    cat > "$NGINX_CONF" <<NGINX
server {
    listen ${APP_HTTP_PORT};
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX
    echo "nginx: HTTP-only on :${APP_HTTP_PORT} (no SSL certs found)"
fi

# ── Graceful shutdown ────────────────────────────────────────────────────────
# Signal propagation: tini forwards SIGTERM/SIGINT here. We run cleanup in the
# trap handler and exit with the canonical signal code (128 + signum) so the
# orchestrator sees a real shutdown reason, not a fake "exit 0".
NGINX_PID=""
_cleaned=""
cleanup() {
    [ -n "$_cleaned" ] && return 0
    _cleaned=1
    echo "Shutting down..."
    kill_pidfile /tmp/.ssl-http-proxy.pid
    kill_pidfile /tmp/.ssl-renew.pid
    nginx -s quit 2>/dev/null || true
    # Poll for nginx to flush rather than re-waiting on a reaped PID.
    # 10s matches nginx's own graceful-stop SLA; integer sleeps keep the
    # loop portable to BusyBox if the base image is ever swapped from
    # Debian (which has GNU coreutils sleep supporting fractions).
    if [ -n "$NGINX_PID" ]; then
        local _drained=""
        for _ in 1 2 3 4 5 6 7 8 9 10; do
            kill -0 "$NGINX_PID" 2>/dev/null || { _drained=1; break; }
            sleep 1
        done
        if [ -z "$_drained" ]; then
            echo "WARNING: nginx did not drain within 10s; forcing exit" >&2
        fi
    fi
}
trap cleanup EXIT
trap 'cleanup; exit 143' TERM
trap 'cleanup; exit 130' INT

# ── Start nginx ──────────────────────────────────────────────────────────────
echo "Starting nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!
# Propagate nginx's real exit code. A crashed nginx must not report success:
# orchestrators rely on non-zero exit to restart or alert.
set +e
wait "$NGINX_PID"
NGINX_EXIT=$?
set -e
exit "$NGINX_EXIT"
