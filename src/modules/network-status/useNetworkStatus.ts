import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createGatewayClient } from './gatewayClient';
import { startNetworkFeed, type Feed } from './feeds';
import { RoundStore, type NetworkSnapshot } from './roundStore';
import type { FeedSource } from './types';

/** React re-renders at most this often; the canvas reads the store every frame. */
const UI_REFRESH_MS = 250;

export interface NetworkStatus {
  readonly store: RoundStore;
  readonly snapshot: NetworkSnapshot;
  readonly source: FeedSource | null;
}

/**
 * Runs a feed against `gatewayUrl` while the page is visible, and exposes the
 * store plus a snapshot throttled for React. A hidden tab makes no requests;
 * on return the feed resumes and fetches the rounds it skipped (bounded).
 *
 * One store per mount: render the consumer with `key={gatewayUrl}` so a
 * network switch starts from an empty store.
 */
export function useNetworkStatus(gatewayUrl: string): NetworkStatus {
  const [store] = useState(() => new RoundStore());
  const [source, setSource] = useState<FeedSource | null>(null);

  useEffect(() => {
    const client = createGatewayClient(gatewayUrl);
    let feed: Feed | null = null;
    const start = () => {
      store.resume();
      if (!feed) feed = startNetworkFeed(client, store, { onSource: setSource });
    };
    const stop = () => {
      feed?.stop();
      feed = null;
      store.pause();
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    setSource(null);
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    const ticker = setInterval(() => store.tick(), 1_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(ticker);
      stop();
    };
  }, [gatewayUrl, store]);

  const subscribe = useMemo(() => throttledSubscribe(store, UI_REFRESH_MS), [store]);
  const snapshot = useSyncExternalStore(subscribe, store.getSnapshot);
  return { store, snapshot, source };
}

function throttledSubscribe(store: RoundStore, ms: number) {
  return (listener: () => void) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let last = 0;
    const off = store.subscribe(() => {
      if (timer) return;
      const wait = Math.max(0, last + ms - Date.now());
      timer = setTimeout(() => {
        timer = null;
        last = Date.now();
        listener();
      }, wait);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  };
}
