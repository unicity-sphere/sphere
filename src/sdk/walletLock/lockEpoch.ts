/**
 * Persisted "the wallet was locked at T" marker (graceful lock §8.4).
 *
 * A tab restored from the bfcache (back/forward, or a mobile browser returning
 * to a backgrounded tab) resumes its React tree EXACTLY as it was — including a
 * decrypted Sphere instance — without re-running SphereProvider.initialize() and
 * without having received the lock BroadcastChannel message it was asleep for.
 * Comparing this marker against the moment this tab's session started is what
 * lets it notice and catch up.
 *
 * localStorage (shared across the origin's tabs, survives bfcache), and it
 * carries no secret — only a timestamp.
 */
import { STORAGE_KEYS } from '../../config/storageKeys';

/** Record that a lock just happened. Called from SphereProvider.lock(). */
export function markLockEpoch(now: number = Date.now()): void {
  localStorage.setItem(STORAGE_KEYS.LOCK_EPOCH, String(now));
}

/** Drop the marker — the wallet is live again. Called when a Sphere is adopted. */
export function clearLockEpoch(): void {
  localStorage.removeItem(STORAGE_KEYS.LOCK_EPOCH);
}

/**
 * Timestamp of the most recent lock, or null when no lock is on record. A
 * corrupt/tampered value fails CLOSED — it reads as "locked just now", never as
 * "never locked".
 */
export function readLockEpoch(): number | null {
  const raw = localStorage.getItem(STORAGE_KEYS.LOCK_EPOCH);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Date.now();
}

/**
 * True when a lock was recorded at or after `sessionStartedAt` — i.e. the
 * decrypted Sphere this tab is holding is stale and the tab must lock itself.
 * `null` means the tab holds no live session, so there is nothing to catch up
 * on. Ties count as pending (fail closed).
 */
export function isLockPending(sessionStartedAt: number | null): boolean {
  if (sessionStartedAt === null) return false;
  const epoch = readLockEpoch();
  return epoch !== null && epoch >= sessionStartedAt;
}
