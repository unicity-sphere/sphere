import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import fs from 'fs';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), '');

  // SSL certificate path from .env (optional - leave empty to disable HTTPS)
  const sslCertPath = env.SSL_CERT_PATH || '';

  // Check if SSL certificates exist (only if path is configured)
  const sslEnabled = sslCertPath &&
                     fs.existsSync(path.join(sslCertPath, 'fullchain.pem')) &&
                     fs.existsSync(path.join(sslCertPath, 'privkey.pem'));

  // HMR host from .env (optional - for remote development)
  const hmrHost = env.HMR_HOST || '';

  // Paths served by the dev proxy (see server.proxy below). These MUST bypass
  // the SPA HTML fallback — a proxied URL without a "." (e.g.
  // /coingecko/simple/price?ids=bitcoin) would otherwise be rewritten to
  // index.html and never reach the proxy (the SDK then gets HTML, not JSON).
  const proxyPaths = ['/rpc', '/dev-rpc', '/coingecko', '/wallet-api', '/local-agg'];

  // wallet-api backend + LOCAL dev-stack aggregator (docker-compose.dev.yml
  // in the wallet-api repo). Neither serves CORS headers, so the browser app
  // reaches them through this same-origin proxy in dev/preview (set
  // VITE_WALLET_API_URL=/wallet-api etc.); production deployments must solve
  // CORS/edge routing on the backend side.
  const localStackProxy = {
    '/wallet-api': {
      target: env.WALLET_API_PROXY_TARGET || 'http://127.0.0.1:3000',
      changeOrigin: true,
      ws: true, // the SDK's wake socket (/v1/ws) rides the same base URL
      rewrite: (p: string) => p.replace(/^\/wallet-api/, ''),
    },
    '/local-agg': {
      target: env.AGGREGATOR_PROXY_TARGET || 'http://127.0.0.1:3001',
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/local-agg/, ''),
    },
  };

  return {
    plugins: [
      react(),
      tailwindcss(),
      nodePolyfills({
        protocolImports: true,
        globals: {
          Buffer: 'build',
        },
      }),
      {
        name: 'html-from-src',
        configureServer(server) {
          // SPA fallback: rewrite HTML requests to src/index.html
          // This runs before Vite's built-in middleware so it handles
          // both "/" and deep routes like "/home", "/agents/dm", etc.
          server.middlewares.use((req, _res, next) => {
            const url = req.url || '';
            const isProxied = proxyPaths.some((p) => url.startsWith(p));
            const isAsset = url.startsWith('/src/') || url.startsWith('/node_modules/') || url.startsWith('/@') || url.includes('.');
            if (!isProxied && !isAsset) {
              req.url = '/src/index.html';
            }
            next();
          });
        },
        closeBundle() {
          // Move index.html from dist/src/ to dist/ after build
          const srcHtml = path.resolve(__dirname, 'dist/src/index.html');
          const destHtml = path.resolve(__dirname, 'dist/index.html');
          if (fs.existsSync(srcHtml)) {
            fs.renameSync(srcHtml, destHtml);
            fs.rmdirSync(path.resolve(__dirname, 'dist/src'));
          }
        },
      },
    ],
    base: env.BASE_PATH || '/',
    server: {
      // Allow Vite to serve files from the parent directory (needed for
      // local file: references like "@unicitylabs/sphere-sdk": "file:../sphere-sdk")
      fs: {
        allow: ['.', '..'],
      },
      // Enable HTTPS if certificates are available
      https: sslEnabled ? {
        key: fs.readFileSync(path.join(sslCertPath, 'privkey.pem')),
        cert: fs.readFileSync(path.join(sslCertPath, 'fullchain.pem')),
      } : undefined,
      // Allow external connections
      host: '0.0.0.0',
      // Configure HMR WebSocket - use env var for custom host, or auto-detect
      hmr: hmrHost ? {
        host: hmrHost,
        protocol: sslEnabled ? 'wss' : 'ws',
      } : true,
      proxy: {
        '/rpc': {
          target: 'https://goggregator-test.unicity.network',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/rpc/, ''),
        },
        '/dev-rpc': {
          target: 'https://dev-aggregator.dyndns.org',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/dev-rpc/, ''),
        },
        '/coingecko': {
          target: 'https://api.coingecko.com/api/v3',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/coingecko/, ''),
        },
        ...localStackProxy,
      }
    },
    // `vite preview` (used by the Playwright smoke) needs the same
    // same-origin route to the local stack as the dev server.
    preview: {
      proxy: { ...localStackProxy },
    },
    // Ensure polyfill shims resolve correctly for symlinked file: dependencies
    resolve: {
      alias: {
        'vite-plugin-node-polyfills/shims/buffer': path.resolve(__dirname, 'node_modules/vite-plugin-node-polyfills/shims/buffer'),
        'vite-plugin-node-polyfills/shims/process': path.resolve(__dirname, 'node_modules/vite-plugin-node-polyfills/shims/process'),
        'vite-plugin-node-polyfills/shims/global': path.resolve(__dirname, 'node_modules/vite-plugin-node-polyfills/shims/global'),
      },
      // Dedupe peer deps so file:-linked sphere-ui doesn't pull a second copy of React etc.
      // through its devDependencies, which would break hooks across the module boundary.
      dedupe: ['react', 'react-dom', 'framer-motion', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
    },
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'src/index.html'),
      },
    },
    // Pre-bundle heavy CJS dependencies to speed up dev server cold start
    optimizeDeps: {
      include: [
        'elliptic',
        'crypto-js',
        'framer-motion',
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
      ],
      // Force re-bundling on dev start so the file:-linked sphere-ui is freshly resolved
      // against the deduped peer deps (otherwise Vite caches stale pre-bundles).
      force: true,
    }
  };
});
