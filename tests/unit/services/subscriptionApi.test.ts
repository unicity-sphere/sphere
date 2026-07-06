import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  provisionOrRecoverKey,
  getUtilization,
  getStorePlans,
  createStoreCheckout,
  getOrderStatus,
} from '@/services/subscriptionApi';

const PUBKEY = '02aa'.padEnd(66, 'b');
const NONCE = '6f7c2e1a-8b1d-4f3e-9c5a-2d4b6e8f0a1c';

function mockFetchSequence(responses: Array<{ url?: string; ok?: boolean; status?: number; json: unknown }>) {
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

function mockFetchOnce(response: { url?: string; ok?: boolean; status?: number; json: unknown }) {
  return mockFetchSequence([response]);
}

describe('subscriptionApi', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('provisionOrRecoverKey validates the challenge and returns plan as string', async () => {
    const challenge =
      'unicity:sgw:auth:v1\n' +
      JSON.stringify({
        network: 'testnet2',
        pubkey: PUBKEY,
        nonce: NONCE,
        issuedAt: new Date(Date.now() - 1000).toISOString().replace(/\.\d{3}Z$/, '.000Z'),
        expiresAt: new Date(Date.now() + 4 * 60_000).toISOString().replace(/\.\d{3}Z$/, '.000Z'),
      });
    const fetchMock = mockFetchSequence([
      { url: '/auth/challenge', json: { nonce: NONCE, challenge, expiresAt: '2026-07-03T12:05:00.000Z' } },
      { url: '/auth/verify', json: { apiKey: 'sk_abc', plan: 'free', created: true } },
    ]);
    const sphere = { identity: { chainPubkey: PUBKEY }, signMessage: vi.fn(() => '1f'.padEnd(130, '0')) };

    const result = await provisionOrRecoverKey(sphere as never);

    // challenge POST body carries the pubkey
    const challengeCall = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(challengeCall).toEqual({ pubkey: PUBKEY });
    // wallet signed the exact (validated) challenge string, verbatim
    expect(sphere.signMessage).toHaveBeenCalledWith(challenge);
    // verify POST body carries nonce + signature (no pubkey needed — server recovers it)
    const verifyCall = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(verifyCall).toEqual({ nonce: NONCE, signature: '1f'.padEnd(130, '0') });

    expect(result).toEqual({ apiKey: 'sk_abc', plan: 'free', created: true });
  });

  it('provisionOrRecoverKey refuses to sign a tampered challenge', async () => {
    const bad =
      'unicity:sgw:auth:v1\n' +
      JSON.stringify({
        network: 'testnet2',
        pubkey: '02' + 'a'.repeat(64),
        nonce: NONCE,
        issuedAt: '2026-07-03T12:00:00.000Z',
        expiresAt: '2026-07-03T12:05:00.000Z',
      });
    mockFetchSequence([{ url: '/auth/challenge', json: { nonce: NONCE, challenge: bad, expiresAt: '' } }]);
    const sphere = { identity: { chainPubkey: PUBKEY }, signMessage: vi.fn() };

    await expect(provisionOrRecoverKey(sphere as never)).rejects.toThrow(/SGW challenge rejected/);
    expect(sphere.signMessage).not.toHaveBeenCalled();
  });

  it('provisionOrRecoverKey: throws if identity is missing', async () => {
    const noIdentity = { signMessage: vi.fn() } as unknown as import('@unicitylabs/sphere-sdk').Sphere;
    await expect(provisionOrRecoverKey(noIdentity)).rejects.toThrow(/identity/i);
  });

  it('getUtilization calls GET /api/utilization with X-API-Key and returns the flat shape', async () => {
    const body = {
      status: 'active',
      activeUntil: null,
      plan: { name: 'free', requestsPerMinute: 60, requestsPerDay: 1000 },
      utilization: {
        consumedPerMinute: 3,
        maxPerMinute: 60,
        availablePerMinute: 57,
        utilizationPercentPerMinute: 5,
        consumedPerDay: 42,
        maxPerDay: 1000,
        availablePerDay: 958,
        utilizationPercentPerDay: 4,
      },
    };
    const fetchSpy = mockFetchOnce({ json: body });

    const result = await getUtilization('sk_abc');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/utilization'),
      expect.objectContaining({ headers: { 'x-api-key': 'sk_abc' } }),
    );
    expect(result).toEqual(body);
  });

  it('getStorePlans maps store id → planId', async () => {
    mockFetchOnce({
      json: {
        availablePlans: [
          { id: 2, name: 'basic', requestsPerMinute: 300, requestsPerDay: 50000, priceCents: 500, fiatCurrency: 'USD' },
        ],
      },
    });
    const plans = await getStorePlans();
    expect(plans).toEqual([
      { planId: 2, name: 'basic', requestsPerMinute: 300, requestsPerDay: 50000, priceCents: 500, fiatCurrency: 'USD' },
    ]);
  });

  it('createStoreCheckout posts planId+email and returns orderId+redirectUrl', async () => {
    const fetchSpy = mockFetchOnce({ json: { orderId: 'ssc-1', redirectUrl: 'https://app.paymento.io/gateway?token=t' } });
    const res = await createStoreCheckout(2, 'a@b.c');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/paymento/checkout'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ planId: 2, email: 'a@b.c' }) }),
    );
    expect(res.orderId).toBe('ssc-1');
  });

  it('getOrderStatus passes orderId and surfaces the one-time apiKey', async () => {
    mockFetchOnce({
      json: { orderId: 'ssc-1', status: 'paid', statusName: 'Confirmed', fulfilled: true, confirming: false, apiKey: 'sk_new', keyShownOnce: true },
    });
    const res = await getOrderStatus('ssc-1');
    expect(res.status).toBe('paid');
    expect(res.apiKey).toBe('sk_new');
  });

  it('throws on non-ok responses', async () => {
    mockFetchSequence([{ ok: false, status: 500, json: {} }]);
    await expect(getUtilization('key_abc')).rejects.toThrow(/500/);
  });

  it("surfaces the gateway's error message on non-ok responses", async () => {
    mockFetchOnce({
      ok: false,
      status: 503,
      json: { error: "Store isn't configured yet — the operator still needs to add Paymento API credentials." },
    });
    await expect(createStoreCheckout(2, 'a@b.c')).rejects.toThrow(/Store isn't configured yet/);
  });
});
