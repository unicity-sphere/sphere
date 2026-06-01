import { useEffect, useState, useRef } from 'react';
import { STORAGE_KEYS } from '../../../config/storageKeys';

/**
 * Aggregator reachability — direct probe.
 *
 * Background: the SDK's `sphere.connectivity.aggregator` is fed by an
 * internal `AggregatorPinger` whose entire verdict comes from one
 * `getCurrentRound()` → `getBlockHeight()` round-trip wrapped in an 8s
 * timeout. That single read-path call has three documented failure
 * modes (issue #329):
 *
 *   1. **No quorum.** A single transient blip on the read path flips
 *      the verdict to `'down'` for up to 5 minutes (backoff schedule).
 *   2. **8s timeout is tight.** A foregrounded tab with a contended
 *      event loop can blow past 8s on the fetch alone even when the
 *      aggregator is fine.
 *   3. **Read-path-only.** The aggregator can briefly throttle reads
 *      while the SMT rebuilds without affecting `/health` or the
 *      write-submit path. A wallet that's still capable of minting
 *      gets falsely flagged as "Aggregator Down".
 *
 * Reference truth is the `@unicitylabs/infra-probe` aggregator probe:
 * it runs 4 independent checks (`/health`, JSON-RPC alive,
 * `submit_commitment`, `get_inclusion_proof`) and only verdicts
 * `unreachable` when ≥2 of them fail.
 *
 * For an in-browser banner running every few seconds in every tab we
 * cannot do the write-path checks (`submit_commitment` makes real
 * commits) — but we CAN do the two cheap operator-facing probes that
 * the infra-probe relies on most:
 *
 *   - `GET <aggregator>/health` — primary signal. Operator endpoint,
 *     doesn't traverse the read API path. Returns
 *     `{status: 'healthy' | 'degraded' | 'unhealthy', ...}`.
 *   - `POST <aggregator>/` JSON-RPC `get_block_height` with a
 *     deliberately bogus shardId — only used as a fallback when
 *     `/health` is indeterminate (e.g., older aggregators without the
 *     endpoint, or a transient TCP error). ANY structured JSON-RPC
 *     reply (result OR error) proves the handler is alive.
 *
 * This mirrors the design call made for IPFS in `useIpfsGatewayStatus`:
 * rather than chase the SDK pinger to make it correct, we expose the
 * banner-only truth users actually experience and let the SDK fix
 * land upstream on its own schedule.
 */
export type AggregatorStatus = 'up' | 'down' | 'degraded' | 'unknown';

/**
 * Mirrors the per-network testnet aggregator URL in
 * `SettingsModal.tsx` and `sphere-sdk/constants.ts` → `NETWORKS.testnet`.
 * The app is currently testnet-only (`SphereProvider network="testnet"`
 * in `main.tsx`). If this changes, switch to reading the URL from the
 * Sphere context (`sphere.connectivity` exposes the configured oracle).
 */
const DEFAULT_AGGREGATOR_BASE = 'https://goggregator-test.unicity.network';

const HEALTH_PATH = '/health';

// Backoff: same schedule as the SDK's connectivity manager and the
// sibling banner hooks. 5s → 15s → 60s → 5min on consecutive failures;
// resets to step 0 on any success.
const BACKOFF_SCHEDULE_MS = [5_000, 15_000, 60_000, 300_000] as const;

// Per-fetch timeout. Health probe is single-digit ms in practice
// (44ms in the issue's repro from the same host); 8s is the same
// generous ceiling the SDK uses and well inside the 5s minimum backoff
// step so we never overlap probes.
const PROBE_TIMEOUT_MS = 8_000;

/**
 * Resolve the aggregator BASE URL to probe. Honors
 * `STORAGE_KEYS.DEV_AGGREGATOR_URL` so e2e / soak runs that point the
 * wallet at a locally-bootstrapped aggregator see the probe target
 * the same backend the SDK does, not the production default.
 */
function getProbeBase(): string {
  if (typeof window === 'undefined') return DEFAULT_AGGREGATOR_BASE;
  return (
    localStorage.getItem(STORAGE_KEYS.DEV_AGGREGATOR_URL) ??
    DEFAULT_AGGREGATOR_BASE
  );
}

/** Build `<base>/health`, normalising trailing slashes. */
function buildHealthUrl(): string {
  return `${getProbeBase().replace(/\/+$/, '')}${HEALTH_PATH}`;
}

/** Build `<base>/` for JSON-RPC, normalising trailing slashes. */
function buildJsonRpcUrl(): string {
  return `${getProbeBase().replace(/\/+$/, '')}/`;
}

/**
 * One full probe round. Tries `/health` first; only falls back to the
 * JSON-RPC liveness check when `/health` is indeterminate (non-200,
 * non-JSON body, missing status field, or transport error). A 5xx
 * `/health` short-circuits to `'down'` — the server reachable-but-
 * broken signal is more authoritative than any JSON-RPC reply.
 */
async function runProbe(
  setCurrentController: (c: AbortController | null) => void,
): Promise<AggregatorStatus> {
  // ---- Step 1: GET /health ----
  const healthCtrl = new AbortController();
  setCurrentController(healthCtrl);
  const healthTimeout = setTimeout(
    () => healthCtrl.abort(),
    PROBE_TIMEOUT_MS,
  );

  let healthBody: unknown = null;
  let healthStatusCode: number | null = null;
  try {
    const res = await fetch(buildHealthUrl(), {
      method: 'GET',
      signal: healthCtrl.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-cache',
    });
    healthStatusCode = res.status;
    if (res.status === 200) {
      try {
        healthBody = await res.json();
      } catch {
        // Non-JSON 200 body → indeterminate, fall through to JSON-RPC.
        healthBody = null;
      }
    }
  } catch {
    // Network error, DNS failure, abort/timeout, CORS rejection.
    // Indeterminate — try the JSON-RPC fallback before verdicting down.
  } finally {
    clearTimeout(healthTimeout);
  }

  // 5xx → server reachable but broken. Don't try JSON-RPC — the same
  // server is going to fail that too, and we want operator surfaces
  // to alert immediately on this case.
  if (healthStatusCode !== null && healthStatusCode >= 500) {
    return 'down';
  }

  // 200 with a structured status → trust it.
  if (
    healthStatusCode === 200 &&
    healthBody &&
    typeof healthBody === 'object'
  ) {
    const status = (healthBody as { status?: unknown }).status;
    if (status === 'healthy') return 'up';
    if (status === 'degraded') return 'degraded';
    if (status === 'unhealthy') return 'down';
    // Other status values or missing status: fall through.
  }

  // ---- Step 2: JSON-RPC liveness probe (fallback) ----
  // Goal: prove the JSON-RPC handler is alive. We use a deliberately
  // bogus shardId so the call is guaranteed to return a structured
  // error reply (cheap; no SMT lookup actually attempted). The
  // infra-probe uses the same trick (`Shard ID not found: 0`).
  const rpcCtrl = new AbortController();
  setCurrentController(rpcCtrl);
  const rpcTimeout = setTimeout(() => rpcCtrl.abort(), PROBE_TIMEOUT_MS);

  try {
    const res = await fetch(buildJsonRpcUrl(), {
      method: 'POST',
      signal: rpcCtrl.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-cache',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'get_block_height',
        params: { shardId: '__sphere_aggregator_probe__' },
        id: 1,
      }),
    });
    // Accept ANY 2xx-4xx with a structured JSON-RPC reply (result OR
    // error). 5xx is the same "server reachable but broken" signal as
    // the health-probe 5xx branch above.
    if (res.status >= 500) return 'down';
    try {
      const body = (await res.json()) as {
        result?: unknown;
        error?: unknown;
      } | null;
      if (
        body &&
        typeof body === 'object' &&
        (body.result !== undefined || body.error !== undefined)
      ) {
        return 'up';
      }
      return 'down';
    } catch {
      return 'down';
    }
  } catch {
    return 'down';
  } finally {
    clearTimeout(rpcTimeout);
    setCurrentController(null);
  }
}

/**
 * Hook that probes the aggregator on a backoff schedule and exposes
 * the current up/degraded/down/unknown status. Independent of
 * `sphere.connectivity.aggregator` so the banner reads accurately even
 * when the SDK's internal probe is misbehaving (issue #329).
 *
 * Lifecycle:
 *   - Starts with `'unknown'` on mount; first probe runs on the next
 *     tick so the initial render doesn't fire a synchronous fetch.
 *   - On `dev-config-changed` (e.g. `sphereDev.setAggregator(...)`),
 *     bumps the epoch which remounts the effect, resets the backoff,
 *     and re-probes immediately against the new URL.
 *   - Cleanup aborts any in-flight fetch (`/health` or JSON-RPC)
 *     and clears the next-probe timer.
 */
export function useAggregatorStatus(): AggregatorStatus {
  const [status, setStatus] = useState<AggregatorStatus>('unknown');
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
    let currentController: AbortController | null = null;

    const setCurrentController = (c: AbortController | null) => {
      currentController = c;
    };

    const probe = async () => {
      if (cancelled) return;

      const nextStatus = await runProbe(setCurrentController);

      if (cancelled) return;

      setStatus(nextStatus);

      // Reset backoff on success ('up' or 'degraded' — both mean the
      // aggregator is reachable). Advance on outright 'down'.
      stepRef.current =
        nextStatus === 'down'
          ? Math.min(stepRef.current + 1, BACKOFF_SCHEDULE_MS.length - 1)
          : 0;

      const delay = BACKOFF_SCHEDULE_MS[stepRef.current];
      if (cancelled) return;
      timer = setTimeout(probe, delay);
    };

    timer = setTimeout(probe, 0);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (currentController) currentController.abort();
    };
    // `epoch` is in the deps so a dev-config-changed event remounts
    // the probe cycle and immediately retargets the new aggregator URL.
  }, [epoch]);

  return status;
}
