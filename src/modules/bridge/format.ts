import type { PendingLock, PendingReturn } from './store';
import type { ReturnServiceTiming } from './types';

export function formatUnits(amount: bigint, decimals: number): string {
  const sign = amount < 0n ? '-' : '';
  const abs = amount < 0n ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  if (decimals === 0 || frac === 0n) return `${sign}${whole.toString()}`;
  return `${sign}${whole.toString()}.${frac.toString().padStart(decimals, '0').replace(/0+$/, '')}`;
}

export function returnStatusSentence(r: Pick<PendingReturn, 'status' | 'message' | 'recoverable'>, chainName: string): string {
  switch (r.status) {
    case 'burned': return 'The bridge service has not accepted the burn yet. This wallet keeps the burned token and retries by itself.';
    case 'queued': return 'The bridge service accepted the burn and queued it for proving.';
    case 'proving': return 'The bridge service is generating proof of burn.';
    case 'proven': return `The burn is proven. The release is being sent to ${chainName}.`;
    case 'submitted': return `The release is waiting for confirmation on ${chainName}.`;
    case 'settled': return `Released on ${chainName}.`;
    case 'failed':
      return r.recoverable
        ? `The bridge service could not accept the burn yet${r.message ? `: ${r.message}` : ''}. This wallet keeps the burned token and retries by itself.`
        : `The bridge service refused the burn${r.message ? `: ${r.message}` : '.'}`;
  }
}

export function returnTimingSentence(
  r: Pick<PendingReturn, 'status' | 'queuePosition' | 'sinceMs'>,
  timing: ReturnServiceTiming | null,
  now: number,
): string | null {
  const pace = timing?.averageProofMs
    ? `A proof takes about ${formatDuration(timing.averageProofMs)} on average.`
    : 'No proof has finished on this service yet.';
  switch (r.status) {
    case 'proving':
      return `${r.sinceMs === undefined ? '' : `Proving for ${formatDuration(now - r.sinceMs)}. `}${pace}`;
    case 'queued': {
      const place = r.queuePosition ? `Position ${r.queuePosition} in the queue. ` : '';
      const busy = timing?.provingSinceMs === undefined
        ? ''
        : `Another batch has been proving for ${formatDuration(now - timing.provingSinceMs)}; this burn joins the next one. `;
      return `${place}${busy}${pace}`;
    }
    default:
      return null;
  }
}

export function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.max(0, Math.round(ms / 1000))} s`;
  const minutes = Math.round(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function pendingLockSentence(lock: Pick<PendingLock, 'status' | 'lockTxid' | 'lockRequested'>): string {
  if (lock.lockTxid) return lock.status === 'locked' ? 'locked, not yet minted' : 'lock sent';
  if (lock.lockRequested) return "the lock may have been sent; check your wallet's activity before discarding";
  return 'not signed, nothing is locked';
}

/**
 * Where a bridge-out stopped and why. The failing token is left to its own reason: its burn
 * may have gone out before the failure, in which case the wallet's journal finishes it and it
 * turns up under Returns. Only the tokens after it are certainly still in the wallet.
 */
export function burnStoppedSentence(progress: { done: number; total: number }, reason: string): string {
  const left = progress.total - progress.done - 1;
  const kept = left === 0 ? '' : ` The last ${left === 1 ? 'token was' : `${left} tokens were`} not burned and ${left === 1 ? 'stays' : 'stay'} in this wallet.`;
  return `Burning stopped at token ${progress.done + 1} of ${progress.total}: ${reason}${kept}`;
}
