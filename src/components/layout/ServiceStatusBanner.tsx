import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Cloud, MessageCircle, TrendingUp, Wifi, X } from 'lucide-react';
import { useConnectivity, type ConnectivityBackendStatus } from '../../sdk/hooks/core/useConnectivity';
import { useMarketStatus, type MarketStatus } from '../../sdk/hooks/core/useMarketStatus';
import { useIpfsGatewayStatus, type IpfsGatewayStatus } from '../../sdk/hooks/core/useIpfsGatewayStatus';
import { useAggregatorStatus, type AggregatorStatus } from '../../sdk/hooks/core/useAggregatorStatus';

/**
 * Time (ms) the banner stays visible after the last service recovers,
 * so users see the green "all services back" confirmation before it
 * collapses. Matches the user-facing decision in issue #319's UI ask.
 */
const RECOVERY_CONFIRMATION_MS = 10_000;

type Severity = 'ok' | 'degraded' | 'down' | 'unknown';

interface ServiceRow {
  key: 'aggregator' | 'ipfs' | 'nostr' | 'market';
  label: string;
  shortLabel: string; // shown on mobile when space is tight
  icon: typeof Cloud;
  status: ConnectivityBackendStatus | MarketStatus | IpfsGatewayStatus | AggregatorStatus;
}

function severityOf(
  status: ConnectivityBackendStatus | MarketStatus | IpfsGatewayStatus | AggregatorStatus,
): Severity {
  switch (status) {
    case 'up':
      return 'ok';
    case 'degraded':
      return 'degraded';
    case 'down':
      return 'down';
    case 'unknown':
    default:
      return 'unknown';
  }
}

function dotClassFor(severity: Severity): string {
  switch (severity) {
    case 'ok':
      return 'bg-green-500 dark:bg-green-400';
    case 'degraded':
      return 'bg-amber-500 dark:bg-amber-400';
    case 'down':
      return 'bg-red-500 dark:bg-red-400';
    case 'unknown':
    default:
      return 'bg-neutral-400 dark:bg-neutral-500';
  }
}

function statusLabelFor(
  status: ConnectivityBackendStatus | MarketStatus | IpfsGatewayStatus | AggregatorStatus,
): string {
  switch (status) {
    case 'up':
      return 'OK';
    case 'degraded':
      return 'Degraded';
    case 'down':
      return 'Down';
    case 'unknown':
    default:
      return 'Checking…';
  }
}

/**
 * Aggregate the four severities into a single banner-level severity for
 * the headline + container chrome. Worst-of-all (down > degraded > ok),
 * with 'unknown' ignored so the banner doesn't shout while probes are
 * still in flight.
 */
function rollupSeverity(severities: Severity[]): Severity {
  if (severities.includes('down')) return 'down';
  if (severities.includes('degraded')) return 'degraded';
  if (severities.every((s) => s === 'unknown')) return 'unknown';
  return 'ok';
}

function headlineFor(severity: Severity, downCount: number, degradedCount: number): string {
  if (severity === 'down') {
    const noun = downCount === 1 ? 'service is' : 'services are';
    return `${downCount} ${noun} unreachable`;
  }
  if (severity === 'degraded') {
    const noun = degradedCount === 1 ? 'service is' : 'services are';
    return `${degradedCount} ${noun} degraded`;
  }
  if (severity === 'ok') {
    return 'All services back online';
  }
  return 'Checking service status…';
}

/**
 * Service-status banner.
 *
 * Behaviour (matches the chosen UX path in issue #319 follow-up):
 *
 *   - Hidden while every backend is `'up'` AND we are outside the
 *     post-recovery confirmation window.
 *   - Becomes visible the moment any backend transitions to `'down'`
 *     or `'degraded'`.
 *   - Stays visible for {@link RECOVERY_CONFIRMATION_MS} ms after the
 *     last service comes back up (shows a green "all services back"
 *     message), then collapses.
 *   - User can dismiss manually via the X button — re-appears
 *     immediately if any service goes down again.
 *
 * Responsive layout:
 *   - Mobile: vertical stack (headline row + pills below), pills show
 *     icons + short label so all four fit on a narrow screen.
 *   - Desktop: horizontal row (headline at left, pills at right).
 */
export function ServiceStatusBanner() {
  const connectivity = useConnectivity();
  const market = useMarketStatus();
  // Production-observed: the SDK's `IpfsPinger` reports `'down'` even
  // when the data path (`[IPFS-HTTP] Fetched`, `[IPNS-WS] connected`)
  // is clearly functional. We bypass `connectivity.ipfs` and use a
  // direct same-CID probe to the canonical Unicity IPFS gateway —
  // matching the truth users actually experience.
  const ipfsGateway = useIpfsGatewayStatus();
  // Issue #329: the SDK's `AggregatorPinger` uses a single
  // `getCurrentRound()` read-path call with an 8s timeout. A transient
  // blip or contended event loop trips it into 'down' and the backoff
  // schedule (5s → 5min) keeps it there long after recovery. We bypass
  // `connectivity.aggregator` and run an independent two-step probe
  // (GET /health → POST / JSON-RPC fallback) mirroring the
  // @unicitylabs/infra-probe reference checks.
  const aggregator = useAggregatorStatus();
  const [manuallyDismissed, setManuallyDismissed] = useState(false);
  const [recoveryWindowOpen, setRecoveryWindowOpen] = useState(false);
  // Tracks whether the PREVIOUS render had a live incident. Only the
  // bad→ok transition opens the recovery-confirmation window — an
  // initial mount with everything already up must NOT trigger the
  // green "all services back" message, and neither must transitions
  // out of `'unknown'` into `'ok'` on a fresh wallet.
  const previousHadIncidentRef = useRef(false);
  // Steelman: snapshot of the failing-services set captured at the
  // moment the user clicked dismiss. The dismissal only "covers" a
  // failing set that is a SUBSET of this snapshot — i.e., adding a new
  // failing service (e.g., user dismissed aggregator-only, then IPFS
  // also fails) voids the dismissal so the user sees the new info.
  // Severity changes WITHIN the dismissed set (down ↔ degraded for a
  // service that was already failing) do not void the dismissal.
  const dismissedAtFailingRef = useRef<Set<string> | null>(null);

  const rows: ServiceRow[] = useMemo(
    () => [
      {
        key: 'aggregator',
        label: 'Aggregator',
        shortLabel: 'Agg',
        icon: Cloud,
        // Direct multi-check probe — see comment on `aggregator` above.
        status: aggregator,
      },
      {
        key: 'ipfs',
        label: 'IPFS',
        shortLabel: 'IPFS',
        icon: Cloud,
        // Direct gateway probe — see comment on `ipfsGateway` above.
        status: ipfsGateway,
      },
      {
        key: 'nostr',
        label: 'Nostr',
        shortLabel: 'Nostr',
        icon: MessageCircle,
        status: connectivity.nostr,
      },
      {
        key: 'market',
        label: 'Market',
        shortLabel: 'Market',
        icon: TrendingUp,
        status: market,
      },
    ],
    [aggregator, connectivity.nostr, ipfsGateway, market],
  );

  const severities = rows.map((r) => severityOf(r.status));
  const overall = rollupSeverity(severities);
  const downCount = severities.filter((s) => s === 'down').length;
  const degradedCount = severities.filter((s) => s === 'degraded').length;
  const hasIncident = overall === 'down' || overall === 'degraded';

  // Current set of failing service keys. Memoized so the deps below
  // are stable references when the set hasn't changed (useMemo returns
  // the same Set instance across renders for the same severity tuple).
  const failingServices = useMemo(() => {
    const result = new Set<string>();
    for (const row of rows) {
      const sev = severityOf(row.status);
      if (sev === 'down' || sev === 'degraded') result.add(row.key);
    }
    return result;
  }, [rows]);

  // Dismissal still "covers" the current state iff every currently-
  // failing service was ALREADY in the snapshot at dismiss time. Adding
  // a new failing service voids the dismissal — that's a new fault the
  // user has not seen yet. Severity downgrade (down→degraded) within
  // the same set does NOT void.
  const dismissalStillCovers = useMemo(() => {
    if (!manuallyDismissed) return false;
    const snapshot = dismissedAtFailingRef.current;
    if (snapshot === null) return false;
    for (const k of failingServices) {
      if (!snapshot.has(k)) return false;
    }
    return true;
  }, [manuallyDismissed, failingServices]);

  // Open the recovery-confirmation window only on the bad→ok edge.
  // The ref captures whether the PRIOR render observed a live incident
  // so an initial mount with everything-already-up (or first probes
  // landing as `'ok'`) does NOT show the green "all services back"
  // message — there was nothing to recover from.
  //
  // Steelman: do NOT reset `manuallyDismissed` in the active-incident
  // branch. The old behaviour cleared dismissal on every effect re-run
  // with hasIncident=true, which meant any severity change during an
  // incident (e.g., down→degraded as one service starts to recover)
  // re-asserted the banner the user had explicitly dismissed. The new
  // model relies on `dismissalStillCovers` — the dismissal naturally
  // becomes void when a NEW service joins the failing set.
  useEffect(() => {
    if (hasIncident) {
      setRecoveryWindowOpen(false);
      previousHadIncidentRef.current = true;
      return;
    }
    // No live incident. Did the previous render have one? If yes AND
    // we've fully recovered (overall === 'ok'), open the confirmation
    // window. The ref is consumed ONLY when we actually fire the
    // confirmation; a bad→'unknown' transient (e.g., sphere swap
    // momentarily resets connectivity) keeps the ref armed so the
    // eventual unknown→ok transition still shows confirmation.
    if (!previousHadIncidentRef.current) return; // dormant
    if (overall !== 'ok') return; // bad→'unknown' — keep ref armed
    previousHadIncidentRef.current = false;
    // If the user dismissed during the incident, don't pop a green
    // confirmation banner — they explicitly asked for quiet. Just
    // silently clear the dismissal state so a future incident is fresh.
    if (manuallyDismissed) {
      setManuallyDismissed(false);
      dismissedAtFailingRef.current = null;
      return;
    }
    setRecoveryWindowOpen(true);
    const t = setTimeout(() => {
      setRecoveryWindowOpen(false);
    }, RECOVERY_CONFIRMATION_MS);
    return () => clearTimeout(t);
  }, [hasIncident, overall, manuallyDismissed]);

  const visible = !dismissalStillCovers && (hasIncident || recoveryWindowOpen);

  // Theme tokens for the container chrome, indexed by overall severity.
  const chrome = (() => {
    switch (overall) {
      case 'down':
        return {
          bg: 'rgba(239, 68, 68, 0.10)',
          border: 'rgba(239, 68, 68, 0.40)',
          fg: '#dc2626',
          Icon: AlertTriangle,
        };
      case 'degraded':
        return {
          bg: 'rgba(245, 158, 11, 0.10)',
          border: 'rgba(245, 158, 11, 0.40)',
          fg: '#d97706',
          Icon: AlertTriangle,
        };
      case 'ok':
        return {
          bg: 'rgba(34, 197, 94, 0.10)',
          border: 'rgba(34, 197, 94, 0.40)',
          fg: '#16a34a',
          Icon: CheckCircle2,
        };
      case 'unknown':
      default:
        return {
          bg: 'rgba(115, 115, 115, 0.10)',
          border: 'rgba(115, 115, 115, 0.30)',
          fg: '#525252',
          Icon: Wifi,
        };
    }
  })();

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="service-status-banner"
          role="status"
          aria-live="polite"
          aria-label="Service status"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="overflow-hidden"
          style={{
            background: chrome.bg,
            borderBottom: `1px solid ${chrome.border}`,
            color: chrome.fg,
          }}
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-3 sm:px-4 py-2 text-xs font-medium">
            {/* Headline */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <chrome.Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate font-semibold">
                {headlineFor(overall, downCount, degradedCount)}
              </span>
            </div>

            {/* Pills row — flex-wraps to a 2x2 grid on narrow phones */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {rows.map((row) => {
                const sev = severityOf(row.status);
                return (
                  <div
                    key={row.key}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] whitespace-nowrap"
                    style={{
                      background:
                        'color-mix(in srgb, currentColor 8%, transparent)',
                    }}
                    title={`${row.label}: ${statusLabelFor(row.status)}`}
                    aria-label={`${row.label}: ${statusLabelFor(row.status)}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClassFor(sev)}`}
                      aria-hidden="true"
                    />
                    <row.icon className="w-3 h-3 hidden sm:inline-block" aria-hidden="true" />
                    {/* Full label on >=sm, short label on mobile */}
                    <span className="hidden sm:inline">{row.label}</span>
                    <span className="sm:hidden">{row.shortLabel}</span>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  // Snapshot the currently-failing set; dismissal will
                  // be voided automatically if any NEW service joins.
                  dismissedAtFailingRef.current = new Set(failingServices);
                  setManuallyDismissed(true);
                }}
                className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                aria-label="Dismiss service status banner"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
