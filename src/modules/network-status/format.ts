const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatInteger(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : integer.format(n);
}

/** `0.4 s`, `12 s`, `3 min` — an age for humans. */
export function formatAge(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1_000) return '<1 s';
  if (ms < 10_000) return `${Math.max(0, ms / 1000).toFixed(1)} s`;
  if (ms < 120_000) return `${Math.round(ms / 1000)} s`;
  return `${Math.round(ms / 60_000)} min`;
}

export function formatSeconds(ms: number | null, digits = 2): string {
  return ms === null ? '—' : (ms / 1000).toFixed(digits);
}

export function formatRate(perSecond: number | null): string {
  if (perSecond === null) return '—';
  if (perSecond === 0) return '0';
  if (perSecond < 0.1) return perSecond.toFixed(3);
  if (perSecond < 10) return perSecond.toFixed(2);
  return integer.format(perSecond);
}

export function formatShare(share: number | null): string {
  return share === null ? '—' : `${(share * 100).toFixed(share > 0 && share < 0.01 ? 1 : 0)}`;
}

/** A Date for `ms`, or `null` when it is outside the range a Date can hold. */
function dateOf(ms: number): Date | null {
  const date = new Date(ms);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** UTC wall time of a unix-seconds seal timestamp, e.g. `14:03:27`; the raw number when no date can hold it. */
export function formatSealTime(unixSeconds: number): string {
  return dateOf(unixSeconds * 1000)?.toISOString().slice(11, 19) ?? String(unixSeconds);
}

/** `2026-11-26 10:04:29 UTC` for a unix-seconds value (number or decimal string); the raw value when no date can hold it. */
export function formatUtcSeconds(unixSeconds: number | string): string {
  const seconds = Number(unixSeconds);
  const date = Number.isSafeInteger(seconds) ? dateOf(seconds * 1000) : null;
  return date ? `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC` : String(unixSeconds);
}

/** Local date and time of a milliseconds timestamp; the raw number when no date can hold it. */
export function formatLocalTime(ms: number): string {
  return dateOf(ms)?.toLocaleString() ?? String(ms);
}

export function formatClock(ms: number): string {
  return new Date(ms).toISOString().slice(11, 19);
}
