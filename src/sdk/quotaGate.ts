/**
 * Pre-send quota gate (spec §2, proactive path). A single choke point
 * (`useTransfer.ts` mutationFn, Task 3) calls `checkSendQuota()` right before
 * `sphere.payments.send` to decide whether the send should proceed, warn, or
 * be blocked — WITHOUT throwing itself. The caller owns the decision: it may
 * construct/throw `QuotaBlockedError` on a `'block'` verdict, show a
 * non-blocking banner on `'warn'`, or do nothing on `'allow'`.
 *
 * Every failure path (flag off, mock mode, no stored key, fetch error,
 * timeout) resolves to `{verdict:'allow'}` — this module must never block
 * money on a metering-endpoint problem (spec §2 "Fail-open").
 */
import { getUtilization, type UtilizationInfo } from '../services/subscriptionApi';
import { getStoredSubscriptionKey } from '../config/storageKeys';
import { SUBSCRIPTION_ENABLED, SUBSCRIPTION_MOCK } from '../config/subscription';

/**
 * Warn threshold, in remaining per-minute ops. Covers a ≤5-token combination
 * strategy plus a split's 3 submits (1 burn + 2 output mints — see
 * `PaymentsModule.ts:1832-1835`). This is a heuristic, not an exact quote:
 * `SplitPlan`/`SpendPlanner` internals are unexported from sphere-sdk, so the
 * wallet cannot compute the precise op count before sending (spec §2/§3.1).
 * A greedy strategy combined with a split can still exceed this headroom.
 */
export const SEND_OPS_HEADROOM = 8;

/** Default imperative-fetch timeout before the gate fails open (spec §2). */
const DEFAULT_TIMEOUT_MS = 2500;

export type QuotaBlockReason = 'expired' | 'exhausted';

/**
 * Derives the block reason from a `UtilizationInfo` snapshot. `'expired'`
 * wins when both could apply (an expired plan naturally reads as 0 available
 * too); everything else that reaches this function is an exhausted quota.
 * Exported so callers that already have a `'block'` verdict + info can reuse
 * the exact same derivation `QuotaBlockedError` uses internally.
 */
export function blockReason(info: UtilizationInfo): QuotaBlockReason {
  return info.status === 'expired' ? 'expired' : 'exhausted';
}

/**
 * Typed error for callers that want to throw on a `'block'` verdict.
 * `checkSendQuota` itself never throws this — it only returns the verdict;
 * the caller (Task 3's `useTransfer` mutationFn) decides to construct and
 * throw it.
 */
export class QuotaBlockedError extends Error {
  readonly reason: QuotaBlockReason;
  readonly info: UtilizationInfo;

  constructor(info: UtilizationInfo) {
    const reason = blockReason(info);
    super(
      reason === 'expired'
        ? 'Your subscription plan has expired. Renew to keep sending.'
        : 'Send quota exhausted for now. Try again shortly or upgrade your plan.'
    );
    this.name = 'QuotaBlockedError';
    this.reason = reason;
    this.info = info;
  }
}

export interface QuotaVerdict {
  verdict: 'allow' | 'warn' | 'block';
  info?: UtilizationInfo;
}

/**
 * Imperative (non-react-query) pre-send quota check. See module docstring
 * for the fail-open contract and spec §2 for the full policy table.
 */
export async function checkSendQuota(opts?: { timeoutMs?: number }): Promise<QuotaVerdict> {
  if (!SUBSCRIPTION_ENABLED || SUBSCRIPTION_MOCK) return { verdict: 'allow' };

  const apiKey = getStoredSubscriptionKey();
  if (!apiKey) return { verdict: 'allow' };

  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // jsdom lacks a reliable AbortSignal.timeout; a plain Promise.race timer is
  // simpler and sufficient here since we only need to stop waiting, not abort
  // the in-flight fetch.
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
  });

  try {
    const outcome = await Promise.race([getUtilization(apiKey), timeout]);
    if (outcome === 'timeout') return { verdict: 'allow' };
    const info = outcome;

    // Plan-less keys (no plan ever provisioned/attached) fail open — the env
    // fallback or the gateway itself decides; we must not block money on a
    // key that was never meant to carry a plan (spec §2 note).
    if (info.status === 'inactive') return { verdict: 'allow', info };

    // 'expired' is NOT a block: since gateway commit f7b9aa7 a lapsed paid key
    // is lazily demoted to the free tier on its next use — the send this gate
    // protects would SUCCEED (under free limits). 'expired' only survives in a
    // ≤60s key-cache window, so blocking here would fail-closed on a send the
    // gateway accepts. The numeric zero-quota checks below still apply.

    if (info.utilization.availablePerMinute === 0 || info.utilization.availablePerDay === 0) {
      return { verdict: 'block', info };
    }

    if (info.utilization.availablePerMinute < SEND_OPS_HEADROOM) {
      return { verdict: 'warn', info };
    }

    return { verdict: 'allow', info };
  } catch {
    return { verdict: 'allow' };
  } finally {
    clearTimeout(timer);
  }
}
