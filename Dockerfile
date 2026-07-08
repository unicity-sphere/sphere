FROM node:20-alpine@sha256:f598378b5240225e6beab68fa9f356db1fb8efe55173e6d4d8153113bb8f333c AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
# Build-once, promote-many: Vite inlines VITE_* into the static bundle at
# `vite build`, so a runtime env cannot change an already-built bundle. To get
# ONE image we can auto-deploy to staging and promote to prod, we bake unique
# sentinel PLACEHOLDERS (the ARG defaults below) instead of real values, then
# rewrite them to the real per-environment values at container start
# (deploy/runtime-config.sh, run as the /docker-entrypoint.d hook below).
# Override an ARG only to pin a literal at build time (e.g. a one-off image).
ARG VITE_SPHERE_API_URL=__RUNTIME_SPHERE_API_URL__
ARG VITE_WALLET_API_URL=__RUNTIME_WALLET_API_URL__
ARG VITE_REQUIRE_WALLET_API=__RUNTIME_REQUIRE_WALLET_API__
ARG VITE_AGGREGATOR_API_KEY=__RUNTIME_AGGREGATOR_API_KEY__
ARG VITE_DEV_PORTAL_URL=__RUNTIME_DEV_PORTAL_URL__
# Subscription vars (VITE_SUBSCRIPTION_*, VITE_PAID_PLANS_ENABLED) have NO
# placeholders on purpose: feature flags can't ride the sed mechanism (Rollup
# prunes every `if (FLAG)` against a baked literal at build time). They are
# runtime-provided via window.__SPHERE_RUNTIME_CONFIG__ instead — the
# runtime-config hook writes /runtime-config.js from the container env
# (SUBSCRIPTION_ENABLED, PAID_PLANS_ENABLED, SUBSCRIPTION_API_URL).
# BASE_PATH is a true build-time concern (Vite rewrites asset URLs + router
# basename); both AWS envs serve at root, so it stays baked as `/`.
ARG BASE_PATH=/
ENV VITE_SPHERE_API_URL=$VITE_SPHERE_API_URL \
    VITE_WALLET_API_URL=$VITE_WALLET_API_URL \
    VITE_REQUIRE_WALLET_API=$VITE_REQUIRE_WALLET_API \
    VITE_AGGREGATOR_API_KEY=$VITE_AGGREGATOR_API_KEY \
    VITE_DEV_PORTAL_URL=$VITE_DEV_PORTAL_URL \
    BASE_PATH=$BASE_PATH
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Rewrites the baked __RUNTIME_*__ placeholders to real per-env values before
# nginx starts. The stock nginx entrypoint runs executable /docker-entrypoint.d
# scripts (in name order) and exits the container if one fails — so the #351
# fail-closed check in this script keeps a misconfigured task def from serving.
COPY deploy/runtime-config.sh /docker-entrypoint.d/40-sphere-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-sphere-runtime-config.sh
# The `include ...sphere-sgw-location*.conf` below is the same-origin /sgw
# route to the subscription gateway, generated at container start from
# $SGW_UPSTREAM by the runtime-config hook. Glob include: no file
# (SGW_UPSTREAM unset) = no route, not a startup error. NOTE: this echo
# collapses to a SINGLE line of nginx config (Dockerfile line continuations),
# so never put an nginx `#` comment inside it — it would comment out the rest.
RUN mkdir -p /etc/nginx/snippets && echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript; \
    location = /index.html { \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
    } \
    location /assets/ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    include /etc/nginx/snippets/sphere-sgw-location*.conf; \
    location / { \
        try_files $uri $uri/ /index.html; \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
    } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
