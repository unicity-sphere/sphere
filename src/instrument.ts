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

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: detectEnvironment(),
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
    ],
    // Errors thrown by injected extension scripts (other wallets) and the GA
    // tag are not ours
    denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /googletagmanager\.com/],
  });
}
