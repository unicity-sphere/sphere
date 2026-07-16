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
ARG VITE_AGGREGATOR_API_KEY=__RUNTIME_AGGREGATOR_API_KEY__
ARG VITE_DEV_PORTAL_URL=__RUNTIME_DEV_PORTAL_URL__
# The subscription flags (VITE_SUBSCRIPTION_ENABLED, VITE_PAID_PLANS_ENABLED)
# have NO placeholders on purpose: feature flags can't ride the sed mechanism
# (Rollup prunes every `if (FLAG)` against a baked literal at build time).
# They are runtime-provided via window.__SPHERE_RUNTIME_CONFIG__ instead — the
# runtime-config hook writes /runtime-config.js from the container env
# (SUBSCRIPTION_ENABLED, PAID_PLANS_ENABLED). The SGW base URL needs no config
# at all: it is derived from the SDK's per-network aggregator gateway
# (src/config/subscription.ts).
# BASE_PATH is a true build-time concern (Vite rewrites asset URLs + router
# basename); both AWS envs serve at root, so it stays baked as `/`.
ARG BASE_PATH=/
# Sentry release tag. Baked (not a placeholder) because it is env-AGNOSTIC:
# the same sha ships to staging and prod, so it never breaks build-once,
# promote-many. Empty (release unset) in docker-validate and local builds.
ARG VITE_BUILD_SHA=
ENV VITE_SPHERE_API_URL=$VITE_SPHERE_API_URL \
    VITE_WALLET_API_URL=$VITE_WALLET_API_URL \
    VITE_REQUIRE_WALLET_API=$VITE_REQUIRE_WALLET_API \
    VITE_AGGREGATOR_API_KEY=$VITE_AGGREGATOR_API_KEY \
    VITE_DEV_PORTAL_URL=$VITE_DEV_PORTAL_URL \
    VITE_BUILD_SHA=$VITE_BUILD_SHA \
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
# Real files rather than a `RUN echo '…'`. The old form wrapped the config in a
# single-quoted shell string, and every CSP keyword source ('self', 'none') uses that
# same delimiter — the shell would strip the quotes and ship `script-src self`, a
# valid-but-matches-nothing policy that passes `nginx -t` and blanks the page.
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
# Baked default; runtime-config.sh rewrites it from the container env before nginx
# starts. Must NOT live under conf.d/ — stock nginx.conf includes conf.d/*.conf at
# http level, where these add_header directives would sit at the wrong level.
COPY deploy/security-headers.conf /etc/nginx/sphere-security-headers.conf
EXPOSE 80
