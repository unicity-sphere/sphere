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
