/**
 * Sentry bootstrap. Must be the FIRST import in main.tsx so the SDK is
 * initialized before any app module runs its side effects (SphereProvider
 * executes module-level code on import).
 *
 * Errors only: no performance tracing, no session replay. The goal is error
 * messages (with stack traces) for wallet operations — transfers, splits,
 * burns, swaps — which reach Sentry via the MutationCache hook in
 * lib/queryClient.ts and the error-toast mirror in ui/toast-utils.ts.
 */
import * as Sentry from '@sentry/react';
import { SENTRY_DSN, detectEnvironment } from './config/sentry';
import { isInjectedProviderNoise, scrubBreadcrumb, scrubEvent, scrubTransactionEvent } from './utils/sentryScrub';

// Baked at build time (Dockerfile ARG from GITHUB_SHA; absent in local dev and
// docker-validate builds). Without an explicit release, extension-injected
// window.SENTRY_RELEASE wins — production events were tagged with Phantom's
// "26.15.2", a VPN extension's version, etc., corrupting release-based
// filtering and regression detection. Env-agnostic: the same sha ships to
// staging and prod (build-once, promote-many).
const BUILD_SHA: string | undefined = import.meta.env.VITE_BUILD_SHA || undefined;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: detectEnvironment(),
    // The explicit `undefined` is load-bearing: applyDefaultOptions spreads
    // user options OVER the window.SENTRY_RELEASE fallback, so even sha-less
    // builds are protected from extension-injected releases. Do NOT "clean up"
    // to a conditional spread.
    release: BUILD_SHA ? `sphere@${BUILD_SHA.slice(0, 12)}` : undefined,
    integrations: [
      // Console breadcrumbs are how Slope Wallet leaked seed phrases to
      // Sentry — and this app console.errors raw SDK errors in 20+ places.
      Sentry.breadcrumbsIntegration({ console: false }),
    ],
    // Wallet posture: pin every collection category off so an SDK upgrade
    // (v11 removes sendDefaultPii; unset dataCollection categories default
    // permissive) can never silently start attaching user info, headers,
    // bodies, query params, or stack-frame locals.
    sendDefaultPii: false,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      httpBodies: [],
      queryParams: false,
      genAI: { inputs: false, outputs: false },
      stackFrameVariables: false,
    },
    // denyUrls can't catch extension-origin PLAIN-OBJECT rejections (no stack
    // frames on the synthetic event) — isInjectedProviderNoise drops those.
    beforeSend: (event) => (isInjectedProviderNoise(event) ? null : scrubEvent(event)),
    beforeBreadcrumb: scrubBreadcrumb,
    // No tracesSampleRate is set, so no transactions are ever sent — this
    // guard exists so that if tracing is enabled later, fetch/XHR span
    // attributes (which bypass beforeSend) don't leak query strings.
    beforeSendTransaction: scrubTransactionEvent,
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Extension / in-app-browser / webview noise: none of these strings
      // exist anywhere in our bundle or the SDK (verified per-issue in the
      // 2026-07 Sentry triage — SPHERE-G/K/1M/1T/16/1B/13).
      'Failed to connect to MetaMask',
      'Could not establish connection. Receiving end does not exist',
      /A listener indicated an asynchronous response by returning true/,
      'not found rainbowkit',
      /Error invoking postEvent/, // Telegram in-app WebApp bridge
      /zaloJSV2/, // Zalo in-app browser injection
      'WKWebView API client did not respond to this postMessage',
      // TODO(sphere-sdk IDB InvalidStateError retry): remove once the SDK
      // reopens-and-retries on pagehide/bfcache connection teardown
      // (SPHERE-M/1G) — until then these are unactionable lifecycle noise.
      'The database connection is closing',
    ],
    // Errors thrown by injected extension scripts (other wallets) are not ours.
    // blob: is safe to deny wholesale — first-party code never executes from
    // blob: URLs (createObjectURL is only used for backup file downloads);
    // extensions injecting code via blob: do (SPHERE-1F).
    denyUrls: [
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      /^safari-(?:web-)?extension:\/\//,
      /^blob:/,
    ],
  });
}
