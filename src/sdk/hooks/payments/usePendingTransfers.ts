import { useState, useEffect, useCallback, useRef } from 'react';
import { getPayments } from '../../payments';
import { useSphereContext } from '../core/useSphere';
import type { PendingTransfer } from '@unicitylabs/sphere-sdk/payments-v2';

/**
 * Slow-poll interval while the pending list is non-empty. The SDK already
 * auto-retries keep-open transfers in-session (backoff 5s→120s, reset on
 * connection recovery) and emits `transfer:updated` as they converge — the
 * poll is only a display backstop for anything an event pass missed.
 */
export const PENDING_TRANSFERS_POLL_MS = 15_000;

export interface UsePendingTransfersReturn {
  /** Open/shortfall transfers still converging (sphere-sdk 0.14 `payments.pendingTransfers()`). */
  pending: PendingTransfer[];
  /** Re-read the list from the SDK (also runs automatically, see below). */
  refresh: () => Promise<void>;
  /**
   * Kick the SDK's in-session convergence immediately
   * (`payments.resumeNow()`). This is the ONLY correct user-facing retry:
   * it converges the SAME transferIds. NEVER wire a retry affordance to
   * send() — a fresh send consumes a different source and double-pays.
   */
  resumeNow: () => Promise<void>;
  /** True while a manual resumeNow() round-trip is in flight. */
  isResuming: boolean;
}

/**
 * Pending (still-converging) outgoing transfers, read from
 * `sphere.payments.pendingTransfers()` — the SDK derives the list from its
 * durable stores, so transfers left pending across a close/reopen are visible
 * from the very first mount.
 *
 * Refresh triggers:
 *  - mount / sphere change (the reopen case),
 *  - `transfer:updated` (convergence progress),
 *  - `connection:status` (recovery resets the SDK's retry backoff),
 *  - a slow poll ({@link PENDING_TRANSFERS_POLL_MS}) while the list is non-empty.
 */
export function usePendingTransfers(): UsePendingTransfersReturn {
  const { sphere } = useSphereContext();
  const [pending, setPending] = useState<PendingTransfer[]>([]);
  const [isResuming, setIsResuming] = useState(false);
  // Guards against out-of-order resolution of overlapping reads and against
  // setState after unmount/sphere-swap.
  const generationRef = useRef(0);

  const refresh = useCallback(async (): Promise<void> => {
    const payments = getPayments(sphere);
    if (!payments) {
      setPending([]);
      return;
    }
    const generation = ++generationRef.current;
    try {
      const rows = await payments.pendingTransfers();
      if (generationRef.current === generation) setPending(rows);
    } catch {
      // Transient read failure: keep the last known list (the poll/events
      // will converge it) — never blank a real pending state on an outage.
    }
  }, [sphere]);

  useEffect(() => {
    // Invalidate in-flight reads from the previous sphere instance.
    generationRef.current++;
    if (!sphere) {
      setPending([]);
      return;
    }

    // Seed at mount — the whole point of the surface: transfers pending
    // across a close/reopen render immediately, before any event arrives.
    void refresh();

    const handler = () => void refresh();
    sphere.on('transfer:updated', handler);
    sphere.on('connection:status', handler);
    return () => {
      sphere.off('transfer:updated', handler);
      sphere.off('connection:status', handler);
    };
  }, [sphere, refresh]);

  // Slow poll backstop — active only while something is pending.
  const hasPending = pending.length > 0;
  useEffect(() => {
    if (!sphere || !hasPending) return;
    const timer = setInterval(() => void refresh(), PENDING_TRANSFERS_POLL_MS);
    return () => clearInterval(timer);
  }, [sphere, hasPending, refresh]);

  const resumeNow = useCallback(async (): Promise<void> => {
    const payments = getPayments(sphere);
    if (!payments) return;
    setIsResuming(true);
    try {
      await payments.resumeNow();
    } finally {
      setIsResuming(false);
      void refresh();
    }
  }, [sphere, refresh]);

  return { pending, refresh, resumeNow, isResuming };
}
