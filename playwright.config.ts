/**
 * Playwright config for the two-profile wallet-api smoke (LOCAL-ONLY).
 *
 * Requires the wallet-api dev stack (postgres + redis + minio + mock
 * aggregator + wallet-api) running on the default loopback ports:
 *
 *   cd ../wallet-api && docker compose -f docker-compose.dev.yml up --build --wait
 *   npm run test:e2e
 *
 * NOT part of CI (`.github/workflows/ci.yml` runs lint/unit/build only) —
 * it needs docker and reaches public Nostr relays for nametag bindings.
 *
 * The app is built with the smoke env (wallet-api + LOCAL mock aggregator +
 * the trustbase that same aggregator serves — never mix trustbases) and
 * served by `vite preview`, whose proxy provides the same-origin route to
 * the stack. Set SMOKE_BASE_URL to reuse an already-running dev server
 * (e.g. `VITE_WALLET_API_URL=/wallet-api ... npm run dev`) while iterating.
 */
import { defineConfig } from '@playwright/test';

const PORT = 4317;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 600_000,
  expect: { timeout: 30_000 },
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.SMOKE_BASE_URL || `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: process.env.SMOKE_BASE_URL
    ? undefined
    : {
        command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: false,
        timeout: 240_000,
        env: {
          VITE_WALLET_API_URL: '/wallet-api',
          VITE_AGGREGATOR_URL: '/local-agg',
          VITE_TRUSTBASE_URL: '/local-agg/trustbase.json',
          // Keep the sphere-quest marketplace off the mock aggregator's port
          // (its default base URL collides with :3001 on the dev stack).
          VITE_SPHERE_API_URL: 'http://127.0.0.1:1',
        },
      },
});
