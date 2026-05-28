import { useEffect, useState, useRef } from 'react';

/**
 * Markets-module reachability status.
 *
 * "Market" in the Sphere context is the **intents database for trading
 * agents** — `modules/market/MarketModule.ts` in sphere-sdk, exposed as
 * `sphere.market`, backed by `https://market-api.unicity.network`. It
 * is NOT the CoinGecko price feed (that's the separate
 * `CoinGeckoPriceProvider` accessed via `sphere.payments.getAssets()`).
 *
 * The SDK's `sphere.connectivity` surface (issue #312) only covers
 * aggregator / IPFS / Nostr, so the banner probes market-api directly.
 */
export type MarketStatus = 'up' | 'down' | 'unknown';

/**
 * Mirrors `DEFAULT_MARKET_API_URL` in
 * `modules/market/MarketModule.ts`. The REST endpoint the app already
 * hits for `getRecentListings()` — when this responds OK the entire
 * Markets module is functional.
 */
const MARKET_API_PROBE_URL = 'https://market-api.unicity.network/api/feed/recent';

// Backoff: same schedule as the SDK's connectivity manager — 5s → 15s → 60s → 5m.
// On success the schedule resets to step 0.
const BACKOFF_SCHEDULE_MS = [5_000, 15_000, 60_000, 300_000] as const;

// Per-probe timeout. Probes that exceed this resolve as 'down'.
const PROBE_TIMEOUT_MS = 8_000;

/**
 * Hook that probes the Markets API on a backoff schedule and exposes
 * the current up/down/unknown status. The first probe is `'unknown'`
 * until it settles.
 *
 * The same endpoint is used by `useMarketFeed` for initial listings
 * fetch; the Markets module's WebSocket reconnect logic already paces
 * itself, so this lightweight probe runs independently without
 * doubling traffic during normal operation. On unmount the pending
 * probe is aborted and any pending timer is cleared.
 */
export function useMarketStatus(): MarketStatus {
  const [status, setStatus] = useState<MarketStatus>('unknown');
  const stepRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inflightController: AbortController | null = null;

    const probe = async () => {
      if (cancelled) return;
      inflightController = new AbortController();
      const timeoutTimer = setTimeout(
        () => inflightController?.abort(),
        PROBE_TIMEOUT_MS,
      );

      let nextStatus: MarketStatus = 'down';
      try {
        const res = await fetch(MARKET_API_PROBE_URL, {
          method: 'GET',
          signal: inflightController.signal,
          // Public endpoint; no cookies / referrer needed.
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          // Cache hint: the recent-listings endpoint already has its
          // own TTL on the server side; we don't need the browser to
          // bypass it.
          cache: 'no-cache',
        });
        // 2xx — Markets API is alive AND serving expected data.
        // 5xx — server reachable but not serving (treat as down so
        //       the operator surface flags it).
        // 4xx — same: e.g., a 401 on the public endpoint indicates a
        //       backend misconfiguration that warrants alerting.
        nextStatus = res.ok ? 'up' : 'down';
      } catch {
        // Network error, DNS failure, abort/timeout, CORS rejection.
        // All treated as 'down' — genuine unreachability.
        nextStatus = 'down';
      } finally {
        clearTimeout(timeoutTimer);
      }

      if (cancelled) return;

      setStatus(nextStatus);

      // Reset backoff on success, advance on failure.
      stepRef.current =
        nextStatus === 'up'
          ? 0
          : Math.min(stepRef.current + 1, BACKOFF_SCHEDULE_MS.length - 1);

      const delay = BACKOFF_SCHEDULE_MS[stepRef.current];
      // Defensive re-check before scheduling. Cleanup runs
      // synchronously and JS is single-threaded, so an interleaved
      // cleanup between the previous check and here is not generally
      // observable, but the defensive guard documents intent and
      // closes any future-refactor leak.
      if (cancelled) return;
      timer = setTimeout(probe, delay);
    };

    // Kick off the first probe asynchronously so the initial render
    // doesn't fire the request synchronously.
    timer = setTimeout(probe, 0);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (inflightController) inflightController.abort();
    };
  }, []);

  return status;
}
