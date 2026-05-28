import { useEffect, useState, useRef } from 'react';

/**
 * Market-data backend status (CoinGecko).
 *
 * The SDK's `sphere.connectivity` surface does not include CoinGecko in
 * its probe set (issue #312 explicitly scopes to aggregator / IPFS /
 * Nostr). This hook polls CoinGecko's free `/ping` endpoint directly so
 * the service-status banner can show market alongside the other three.
 */
export type MarketStatus = 'up' | 'down' | 'unknown';

const COINGECKO_PING_URL = 'https://api.coingecko.com/api/v3/ping';

// Backoff: same schedule as the SDK's connectivity manager — 5s → 15s → 60s → 5m.
// On success the schedule resets to step 0.
const BACKOFF_SCHEDULE_MS = [5_000, 15_000, 60_000, 300_000] as const;

// Per-probe timeout. Probes that exceed this resolve as 'down'.
const PROBE_TIMEOUT_MS = 8_000;

/**
 * Hook that probes CoinGecko on a backoff schedule and exposes the
 * current up/down/unknown status. The first probe is `'unknown'`
 * until it settles.
 *
 * On unmount the pending probe is aborted and any pending timer is
 * cleared — no work continues after the component is gone.
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
        const res = await fetch(COINGECKO_PING_URL, {
          method: 'GET',
          signal: inflightController.signal,
          // CoinGecko CORS is permissive; no special headers needed.
        });
        nextStatus = res.ok ? 'up' : 'down';
      } catch {
        // Network error, abort, CORS — all treated as 'down'.
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
