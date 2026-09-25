import type { PendingReturn } from './store';
import type { ReturnServiceTiming } from './types';

export function parseUnits(input: string, decimals: number): bigint {
  const [whole, frac = ''] = input.trim().split('.');
  if (!/^\d*$/.test(whole) || !/^\d*$/.test(frac)) return 0n;
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const digits = (whole || '0') + fracPadded;
  return BigInt(digits.replace(/^0+(?=\d)/, ''));
}

export function formatUnits(amount: bigint, decimals: number): string {
  const sign = amount < 0n ? '-' : '';
  const abs = amount < 0n ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  if (decimals === 0 || frac === 0n) return `${sign}${whole.toString()}`;
  return `${sign}${whole.toString()}.${frac.toString().padStart(decimals, '0').replace(/0+$/, '')}`;
}

export function returnStatusSentence(r: Pick<PendingReturn, 'status' | 'message'>, chainName: string): string {
  switch (r.status) {
    case 'burned': return 'The return service has not accepted the burn yet. This wallet keeps the burned token and retries by itself.';
    case 'queued': return 'The return service accepted the burn and queued it for proving.';
    case 'proving': return 'The return service is proving the burn.';
    case 'proven': return `The burn is proven. The release is being sent to ${chainName}.`;
    case 'submitted': return `The release is waiting for confirmation on ${chainName}.`;
    case 'settled': return `Released on ${chainName}.`;
    case 'failed': return `The return service refused the burn${r.message ? `: ${r.message}` : '.'}`;
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
