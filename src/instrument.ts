/**
 * Sentry bootstrap. Must be the FIRST import in main.tsx so the SDK is
 * initialized before any app module runs its side effects (SphereProvider
 * executes module-level code on import).
 */
import { useEffect } from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { SENTRY_DSN, detectEnvironment } from './config/sentry';
import { redactUrl, scrubBreadcrumb, scrubEvent, scrubTransactionEvent } from './utils/sentryScrub';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: detectEnvironment(),
    integrations: [
      Sentry.reactRouterBrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      // Console breadcrumbs are how Slope Wallet leaked seed phrases to
      // Sentry — and this app console.errors raw SDK errors in 20+ places.
      Sentry.breadcrumbsIntegration({ console: false }),
      // Defaults stay on: maskAllText, maskAllInputs, blockAllMedia.
      Sentry.replayIntegration({
        // Mutation failures are routine user-facing errors (aggregator
        // flakiness, nametag taken): keep the error event, don't spend one
        // of the 50/month free-tier error-replays on it.
        beforeErrorSampling: (event) => event.tags?.source !== 'mutation',
        // Replay recordings never pass beforeSend/beforeBreadcrumb — redact
        // request/navigation URLs inside the recording payload itself.
        beforeAddRecordingEvent: (event) => {
          const payload = (event.data ?? {}) as {
            payload?: { description?: unknown; data?: Record<string, unknown> };
          };
          const frame = payload.payload;
          if (frame) {
            if (typeof frame.description === 'string') frame.description = redactUrl(frame.description);
            if (frame.data) {
              for (const key of ['url', 'to', 'from', 'previous']) {
                if (typeof frame.data[key] === 'string') frame.data[key] = redactUrl(frame.data[key] as string);
              }
            }
          }
          return event;
        },
      }),
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
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSendTransaction: scrubTransactionEvent,
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],
    // Errors thrown by injected extension scripts (other wallets) and the GA
    // tag are not ours
    denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /googletagmanager\.com/],
    tracesSampleRate: 0.1,
    // Free tier includes 50 replays/month: record nothing routinely, keep the
    // ~1 minute leading up to each error.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });

  // The replay summary event lists every visited URL and skips
  // beforeSend/beforeBreadcrumb entirely
  Sentry.addEventProcessor((event) => {
    if (event.type === 'replay_event') {
      const replay = event as { urls?: unknown[] };
      if (Array.isArray(replay.urls)) {
        replay.urls = replay.urls.map((u) => (typeof u === 'string' ? redactUrl(u) : u));
      }
    }
    return event;
  });
}
