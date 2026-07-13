/** Usage as a clamped 0–100 integer percentage; guards a zero/negative limit. */
export function usagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

/**
 * A subscription snapshot is on a PAID plan iff it carries an expiry.
 * Free (and gateway-demoted-from-expired) keys have `activeUntil === null`.
 * Used to decide whether inheriting the wallet key onto a new address is a
 * real choice worth prompting for (only paid plans are).
 */
export function isPaidPlan(activeUntil: string | null | undefined): boolean {
  return activeUntil != null;
}

/** Human-readable expiry; '—' when there is no expiry. */
export function formatExpiry(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Milliseconds until `resetAtIso`, clamped to ≥ 0. Returns `null` when there is
 * no reset time (e.g. a rolling refill) or the timestamp is unparseable.
 */
export function msUntil(resetAtIso: string | null, nowMs: number): number | null {
  if (!resetAtIso) return null;
  const t = new Date(resetAtIso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, t - nowMs);
}

/** Format a ms duration as a compact countdown: "1h 05m", "12m 30s", "45s". */
export function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) return `${h}h ${pad(m)}m`;
  if (m > 0) return `${m}m ${pad(s)}s`;
  return `${s}s`;
}
