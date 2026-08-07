import { configure } from '@testing-library/react';

/**
 * CI-load deflake, applied once for every suite instead of per call site.
 *
 * These are jsdom component tests: every wait is for a local state flush or a
 * framer-motion screen transition — milliseconds when the box is idle. The
 * failures we have seen are runner starvation (vitest workers + a heavy SDK
 * module graph), not product latency: `importPassword` crossed the 1s default
 * at 1079ms (sphere#470 run 30903923228), then the hand-raised 3s deadline at
 * 3069ms (run 31129018868), passing locally every time.
 *
 * Ratcheting individual `waitFor` deadlines chases that forever, so the wait
 * budget lives here. A REAL regression still fails — it just fails by never
 * satisfying the assertion rather than by beating a stopwatch.
 */
configure({ asyncUtilTimeout: 15_000 });
