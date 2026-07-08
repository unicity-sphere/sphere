# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc,required=false npm ci --ignore-scripts
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
ARG VITE_BRIDGE_RETURN_SERVICE_URL=__RUNTIME_BRIDGE_RETURN_SERVICE_URL__
ARG VITE_REQUIRE_WALLET_API=__RUNTIME_REQUIRE_WALLET_API__
ARG VITE_AGGREGATOR_API_KEY=__RUNTIME_AGGREGATOR_API_KEY__
ARG VITE_DEV_PORTAL_URL=__RUNTIME_DEV_PORTAL_URL__
# BASE_PATH is a true build-time concern (Vite rewrites asset URLs + router
# basename); both AWS envs serve at root, so it stays baked as `/`.
ARG BASE_PATH=/
ENV VITE_SPHERE_API_URL=$VITE_SPHERE_API_URL \
    VITE_WALLET_API_URL=$VITE_WALLET_API_URL \
    VITE_BRIDGE_RETURN_SERVICE_URL=$VITE_BRIDGE_RETURN_SERVICE_URL \
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
RUN echo 'server { \
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
    location / { \
        try_files $uri $uri/ /index.html; \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
    } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
