import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { provisionOrRecoverKey, getPlans, getKeyInfo, getUsage, createCheckout } from '@/services/subscriptionApi';

function mockFetchSequence(responses: Array<{ ok?: boolean; status?: number; json: unknown }>) {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce({
      ok: r.ok ?? true,
      status: r.status ?? 200,
      json: async () => r.json,
    });
  }
  vi.stubGlobal('fetch', fn);
  return fn;
}

const fakeSphere = {
  identity: { chainPubkey: '02aa'.padEnd(66, 'b') },
  signMessage: vi.fn((msg: string) => `sig(${msg})`),
} as unknown as import('@unicitylabs/sphere-sdk').Sphere;

describe('subscriptionApi', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('provisionOrRecoverKey: challenge -> sign -> verify', async () => {
    const fetchMock = mockFetchSequence([
      { json: { nonce: 'n1', challenge: 'CHALLENGE_STRING', expiresAt: 'x' } },
      { json: { apiKey: 'key_abc', plan: { planId: 0, name: 'free', requestsPerSecond: 5, requestsPerDay: 50000, price: '0' }, created: true } },
    ]);

    const result = await provisionOrRecoverKey(fakeSphere);

    // challenge POST body carries the pubkey
    const challengeCall = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(challengeCall).toEqual({ pubkey: fakeSphere.identity!.chainPubkey });
    // wallet signed the exact challenge string
    expect(fakeSphere.signMessage).toHaveBeenCalledWith('CHALLENGE_STRING');
    // verify POST body carries nonce + signature (no pubkey needed — server recovers it)
    const verifyCall = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(verifyCall).toEqual({ nonce: 'n1', signature: 'sig(CHALLENGE_STRING)' });

    expect(result.apiKey).toBe('key_abc');
    expect(result.created).toBe(true);
    expect(result.plan.name).toBe('free');
  });

  it('provisionOrRecoverKey: throws if identity is missing', async () => {
    const noIdentity = { signMessage: vi.fn() } as unknown as import('@unicitylabs/sphere-sdk').Sphere;
    await expect(provisionOrRecoverKey(noIdentity)).rejects.toThrow(/identity/i);
  });

  it('getPlans: unwraps availablePlans', async () => {
    mockFetchSequence([{ json: { availablePlans: [{ planId: 1, name: 'basic', requestsPerSecond: 5, requestsPerDay: 50000, price: '1000000' }] } }]);
    const plans = await getPlans();
    expect(plans).toHaveLength(1);
    expect(plans[0].name).toBe('basic');
  });

  it('getKeyInfo: sends X-API-Key header and returns parsed KeyInfo', async () => {
    const fetchMock = mockFetchSequence([
      { json: { status: 'active', expiresAt: null, pricingPlan: { id: 1, planId: 1, name: 'basic', requestsPerSecond: 5, requestsPerDay: 50000, price: '1000000' } } },
    ]);
    const keyInfo = await getKeyInfo('key_abc');
    expect(keyInfo.status).toBe('active');
    expect(keyInfo.pricingPlan?.name).toBe('basic');
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['x-api-key']).toBe('key_abc');
  });

  it('getUsage: sends X-API-Key header', async () => {
    const fetchMock = mockFetchSequence([{ json: { perDay: { limit: 50000, used: 3, remaining: 49997, resetAt: null }, perSecond: { limit: 5, remaining: 4 } } }]);
    const usage = await getUsage('key_abc');
    expect(usage.perDay.remaining).toBe(49997);
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['x-api-key']).toBe('key_abc');
  });

  it('createCheckout: sends X-API-Key header, JSON body, and returns parsed CheckoutResult', async () => {
    const fetchMock = mockFetchSequence([{ json: { paymentUrl: 'https://pay.example/session', sessionId: 'sess_123' } }]);
    const result = await createCheckout('key_abc', 3, 'https://ret');
    expect(result).toEqual({ paymentUrl: 'https://pay.example/session', sessionId: 'sess_123' });
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['x-api-key']).toBe('key_abc');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ targetPlanId: 3, returnUrl: 'https://ret' });
  });

  it('throws on non-ok responses', async () => {
    mockFetchSequence([{ ok: false, status: 500, json: {} }]);
    await expect(getPlans()).rejects.toThrow(/500/);
  });
});
