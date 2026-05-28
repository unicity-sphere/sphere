import { useEffect, useState, useRef } from 'react';
import { STORAGE_KEYS } from '../../../config/storageKeys';

/**
 * IPFS gateway reachability — direct probe.
 *
 * Background: the SDK's `sphere.connectivity.ipfs` is fed by an internal
 * `IpfsPinger` that HEADs `<gateway>/ipfs/bafyaabakaieac` against the
 * configured gateway list. In production we observed the SDK reading
 * 'down' for IPFS even when the actual data path (`/api/feed/recent`-
 * adjacent IPFS storage logs show `1 healthy gateway(s) found` and
 * `[IPFS-HTTP] Fetched from ...`) was working fine. Rather than chase
 * the SDK bug, this hook does an independent same-CID probe and
 * exposes the result so the banner can show the truth users actually
 * experience.
 *
 * The probe URL mirrors the SDK's: empty-unixfs CID `bafyaabakaieac`
 * against the BUILTIN_IPFS_GATEWAYS default. If the wallet was
 * configured with a different gateway, the SDK still pings its own
 * list — but the banner's IPFS pill will reflect THIS hook's verdict
 * since the data path universally targets the unicity-managed gateway
 * for testnet/mainnet.
 */
export type IpfsGatewayStatus = 'up' | 'down' | 'unknown';

const DEFAULT_IPFS_GATEWAY = 'https://unicity-ipfs1.dyndns.org';
/** Empty unixfs directory — universally pinned, ~10 bytes. Same CID
 *  the SDK's `IpfsPinger` uses. */
const PROBE_CID = 'bafyaabakaieac';

/**
 * Resolve the gateway BASE to probe. Honors
 * `STORAGE_KEYS.DEV_IPFS_GATEWAY_URL` so e2e / soak runs against a
 * locally-bootstrapped gateway show 'up' when that gateway is alive
 * (and 'down' when it isn't), instead of always probing the
 * production default. The gateway value is the BASE URL — the probe
 * path is appended at fetch time so trailing slashes are normalised.
 */
function getProbeGateway(): string {
  if (typeof window === 'undefined') return DEFAULT_IPFS_GATEWAY;
  return (
    localStorage.getItem(STORAGE_KEYS.DEV_IPFS_GATEWAY_URL) ??
    DEFAULT_IPFS_GATEWAY
  );
}

function buildProbeUrl(): string {
  const gateway = getProbeGateway().replace(/\/+$/, '');
  return `${gateway}/ipfs/${PROBE_CID}`;
}

// Backoff: same schedule as the SDK's connectivity manager.
const BACKOFF_SCHEDULE_MS = [5_000, 15_000, 60_000, 300_000] as const;
const PROBE_TIMEOUT_MS = 8_000;

/**
 * Hook that probes the IPFS gateway on a backoff schedule and exposes
 * the current up/down/unknown status. Independent from
 * `sphere.connectivity.ipfs` so the banner reads accurately even when
 * the SDK's internal probe is misbehaving.
 */
export function useIpfsGatewayStatus(): IpfsGatewayStatus {
  const [status, setStatus] = useState<IpfsGatewayStatus>('unknown');
  // `epoch` bumps when the dev-config-changed event fires, which
  // forces the effect to tear down and re-mount — so a fresh probe
  // fires immediately against the new gateway URL.
  const [epoch, setEpoch] = useState(0);
  const stepRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      stepRef.current = 0;
      setStatus('unknown');
      setEpoch((e) => e + 1);
    };
    window.addEventListener('dev-config-changed', handler);
    return () => window.removeEventListener('dev-config-changed', handler);
  }, []);

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

      let nextStatus: IpfsGatewayStatus = 'down';
      try {
        // GET (not HEAD) — `bafyaabakaieac` is the empty unixfs
        // directory (~10 bytes) so GET-vs-HEAD is the same cost in
        // practice, and some gateways serve HEAD redirects oddly.
        // The CORS preflight requirement is identical for both
        // (simple methods, no custom headers).
        const res = await fetch(buildProbeUrl(), {
          method: 'GET',
          signal: inflightController.signal,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          cache: 'no-cache',
        });
        // Treat 2xx OR 3xx as 'up' — some gateways redirect from
        // `/ipfs/<cid>` to `/ipfs/<cid>/` (HTTP 301), which fetch
        // would normally follow automatically, but if redirect
        // handling glitches we still know the edge is alive.
        // res.ok covers 200-299; status < 400 is the wider net.
        nextStatus = res.status < 400 ? 'up' : 'down';
      } catch {
        // Network error, DNS failure, abort/timeout, CORS rejection.
        nextStatus = 'down';
      } finally {
        clearTimeout(timeoutTimer);
      }

      if (cancelled) return;

      setStatus(nextStatus);

      stepRef.current =
        nextStatus === 'up'
          ? 0
          : Math.min(stepRef.current + 1, BACKOFF_SCHEDULE_MS.length - 1);

      const delay = BACKOFF_SCHEDULE_MS[stepRef.current];
      if (cancelled) return;
      timer = setTimeout(probe, delay);
    };

    timer = setTimeout(probe, 0);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (inflightController) inflightController.abort();
    };
    // `epoch` is in the deps so a dev-config-changed event remounts
    // the probe cycle and immediately retargets the new gateway URL.
  }, [epoch]);

  return status;
}
