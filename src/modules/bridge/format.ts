import type { PendingReturn } from './store';

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
