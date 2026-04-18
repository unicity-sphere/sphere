#!/bin/bash
set -e

# ── Export env so ssl-setup inherits our defaults ────────────────────────────
export APP_HTTP_PORT="${APP_HTTP_PORT:-8080}"
export SSL_HTTPS_PORT="${SSL_HTTPS_PORT:-443}"

# ── Validate env vars before use in nginx config ────────────────────────────
validate_port() {
    if ! [[ "$2" =~ ^[0-9]+$ ]] || [ "$2" -lt 1 ] || [ "$2" -gt 65535 ]; then
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
validate_port "APP_HTTP_PORT" "$APP_HTTP_PORT"
validate_port "SSL_HTTPS_PORT" "$SSL_HTTPS_PORT"

# ── SSL setup (certs + HAProxy registration) ─────────────────────────────────
ssl-setup || {
    rc=$?
    echo "WARNING: SSL setup failed (exit $rc)"
    # Kill any orphaned ssl-manager processes from partial setup
    kill "$(cat /tmp/.ssl-http-proxy.pid 2>/dev/null)" 2>/dev/null || true
    if [ "${SSL_REQUIRED:-true}" = "true" ]; then exit 1; fi
}

# Parse cert paths from ssl-env without sourcing (avoid code execution)
SSL_CERT_FILE=""
SSL_KEY_FILE=""
if [ -f /tmp/.ssl-env ]; then
    SSL_CERT_FILE=$(grep '^SSL_CERT_FILE=' /tmp/.ssl-env | head -1 | cut -d= -f2- || true)
    SSL_KEY_FILE=$(grep '^SSL_KEY_FILE=' /tmp/.ssl-env | head -1 | cut -d= -f2- || true)
fi

# Validate cert paths if set
if [ -n "$SSL_CERT_FILE" ]; then validate_path "SSL_CERT_FILE" "$SSL_CERT_FILE"; fi
if [ -n "$SSL_KEY_FILE" ]; then validate_path "SSL_KEY_FILE" "$SSL_KEY_FILE"; fi

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

# ── Graceful shutdown: forward signals to ssl-manager background processes ───
NGINX_PID=""
cleanup() {
    echo "Shutting down..."
    kill "$(cat /tmp/.ssl-http-proxy.pid 2>/dev/null)" 2>/dev/null || true
    kill "$(cat /tmp/.ssl-renew.pid 2>/dev/null)" 2>/dev/null || true
    nginx -s quit 2>/dev/null || true
    [ -n "$NGINX_PID" ] && wait "$NGINX_PID" 2>/dev/null
}
trap cleanup EXIT
trap 'exit 0' TERM INT

# ── Start nginx ──────────────────────────────────────────────────────────────
echo "Starting nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!
wait "$NGINX_PID" 2>/dev/null || true
