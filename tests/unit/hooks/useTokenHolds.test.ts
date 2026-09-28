import { describe, it, expect } from 'vitest';

import { holdPollInterval } from '../../../src/sdk/hooks/payments/useTokenHolds';

describe('holdPollInterval', () => {
  it('polls while a token is held or the holds are not known yet', () => {
    expect(holdPollInterval(new Map([['t', { reason: 'Settling on Ethereum, under a minute left' }]]))).toBe(30_000);
    expect(holdPollInterval(undefined)).toBe(30_000);
  });

  it('stops once no token is held', () => {
    expect(holdPollInterval(new Map())).toBe(false);
  });
});
