import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/subscriptionApi', () => ({
  getKeyInfo: vi.fn(),
}));

import { validatePastedKey } from '@/sdk/subscription/keyCheck';
import { getKeyInfo } from '@/services/subscriptionApi';

describe('validatePastedKey', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts a key the gateway knows', async () => {
    vi.mocked(getKeyInfo).mockResolvedValue({
      maskedKey: 'sk_...abcd',
      planName: 'basic',
      subscriptionState: 'active',
      activeUntil: null,
    });
    await expect(validatePastedKey('sk_' + 'a'.repeat(32))).resolves.toEqual({ valid: true });
  });

  it('rejects a definitively unknown/revoked key with a message', async () => {
    vi.mocked(getKeyInfo).mockResolvedValue(null);
    const res = await validatePastedKey('sk_' + 'b'.repeat(32));
    expect(res.valid).toBe(false);
    expect(res.message).toMatch(/wasn't found|revoked/i);
  });

  it('fails open when the lookup itself fails (old gateway / network hiccup)', async () => {
    vi.mocked(getKeyInfo).mockRejectedValue(new Error('Not found'));
    await expect(validatePastedKey('sk_' + 'c'.repeat(32))).resolves.toEqual({ valid: true });
  });
});
