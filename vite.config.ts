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

  return {
    plugins: [
      react(),
      tailwindcss(),
      nodePolyfills({
        protocolImports: true,
        // Explicitly polyfill `fs` (covers `fs/promises`) so that
        // unreachable Node-only branches inside sphere-sdk's Profile
        // bundle (e.g. defaultNodeLockPrimitives, which is wrapped in a
        // never-called-in-browser code path but contains a static
        // `await import("fs/promises")` Vite resolves at build time)
        // don't break the production build. The polyfill resolves to an
        // empty module in the browser; the code path is never executed.
        include: ['fs'],
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
            const isAsset = url.startsWith('/src/') || url.startsWith('/node_modules/') || url.startsWith('/@') || url.includes('.');
            if (!isAsset) {
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
        }
      }
    },
    // Ensure polyfill shims resolve correctly for symlinked file: dependencies
    resolve: {
      alias: {
        'vite-plugin-node-polyfills/shims/buffer': path.resolve(__dirname, 'node_modules/vite-plugin-node-polyfills/shims/buffer'),
        'vite-plugin-node-polyfills/shims/process': path.resolve(__dirname, 'node_modules/vite-plugin-node-polyfills/shims/process'),
        'vite-plugin-node-polyfills/shims/global': path.resolve(__dirname, 'node_modules/vite-plugin-node-polyfills/shims/global'),
        // sphere-sdk's Profile browser bundle (vendor-sphere-sdk/dist/profile/browser.js)
        // contains unreachable Node-only branches (defaultNodeLockPrimitives,
        // FsBlockstore fallback inside the Helia constructor) that do static
        // `await import("fs/promises" | "blockstore-fs" | "proper-lockfile")`.
        // Vite's static analyzer resolves those strings at BUILD time even
        // though the branches never execute in the browser. Without the
        // aliases below, Vite either:
        //   1. chases `node-stdlib-browser/.../empty.js/promises` (treats the
        //      empty mock file as a directory and aborts), or
        //   2. resolves to the real npm packages, which themselves `import "node:fs"`
        //      (e.g., blockstore-fs, proper-lockfile).
        // Mapping every Node-only target to an empty mock makes the build
        // succeed; runtime never actually executes these branches.
        'fs/promises': path.resolve(__dirname, 'node_modules/node-stdlib-browser/esm/mock/empty.js'),
        'node:fs/promises': path.resolve(__dirname, 'node_modules/node-stdlib-browser/esm/mock/empty.js'),
        'node:fs': path.resolve(__dirname, 'node_modules/node-stdlib-browser/esm/mock/empty.js'),
        fs: path.resolve(__dirname, 'node_modules/node-stdlib-browser/esm/mock/empty.js'),
        'blockstore-fs': path.resolve(__dirname, 'node_modules/node-stdlib-browser/esm/mock/empty.js'),
        'proper-lockfile': path.resolve(__dirname, 'node_modules/node-stdlib-browser/esm/mock/empty.js'),
      },
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
    }
  };
});
