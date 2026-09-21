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
