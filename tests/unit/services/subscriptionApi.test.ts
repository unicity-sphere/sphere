import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPublicKey, recoverPubkeyFromSignature } from '@unicitylabs/sphere-sdk';

// Pin the real network path: these tests exercise the actual challenge/verify
// crypto, so SUBSCRIPTION_MOCK must be false regardless of ambient
// VITE_SUBSCRIPTION_MOCK (a dev shell with it =true otherwise fails all 9).
vi.mock('@/config/subscription', async (orig) => ({
  ...(await orig<typeof import('@/config/subscription')>()),
  SUBSCRIPTION_MOCK: false,
}));
import {
  provisionOrRecoverKey,
  getUtilization,
  getStorePlans,
  createStoreCheckout,
  getOrderStatus,
  ackOrderKeyDelivery,
  getKeyInfo,
} from '@/services/subscriptionApi';

// The subscription identity is the wallet's INDEX-0 keypair (stable across
// active-address switches) — real crypto, golden test pair.
const ROOT_PRIV = '1'.repeat(64);
const ROOT_PUBKEY = getPublicKey(ROOT_PRIV);
const NONCE = '6f7c2e1a-8b1d-4f3e-9c5a-2d4b6e8f0a1c';

/** Active address deliberately DIFFERENT from index 0 — provisioning must ignore it. */
function fakeSphere() {
  return {
    deriveAddress: (i: number) => {
      if (i !== 0) throw new Error('expected index 0');
      return { privateKey: ROOT_PRIV };
    },
    identity: { chainPubkey: '02' + 'f'.repeat(64) },
    signMessage: vi.fn(() => {
      throw new Error('active-identity signMessage must NOT be used');
    }),
  };
}

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

  it('provisionOrRecoverKey signs with the INDEX-0 key (not the active identity) and returns plan as string', async () => {
    const challenge =
      'unicity:sgw:auth:v1\n' +
      JSON.stringify({
        network: 'testnet2',
        pubkey: ROOT_PUBKEY,
        nonce: NONCE,
        issuedAt: new Date(Date.now() - 1000).toISOString().replace(/\.\d{3}Z$/, '.000Z'),
        expiresAt: new Date(Date.now() + 4 * 60_000).toISOString().replace(/\.\d{3}Z$/, '.000Z'),
      });
    const fetchMock = mockFetchSequence([
      { url: '/auth/challenge', json: { nonce: NONCE, challenge, expiresAt: '2026-07-03T12:05:00.000Z' } },
      { url: '/auth/verify', json: { apiKey: 'sk_abc', plan: 'free', created: true } },
    ]);
    const sphere = fakeSphere();

    const result = await provisionOrRecoverKey(sphere as never);

    // challenge POST body carries the ROOT pubkey, not the active identity's
    const challengeCall = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(challengeCall).toEqual({ pubkey: ROOT_PUBKEY });
    // signed VERBATIM with the index-0 key: the signature recovers to the root pubkey
    const verifyCall = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(verifyCall.nonce).toBe(NONCE);
    expect(verifyCall.signature).toMatch(/^[0-9a-f]{130}$/);
    expect(recoverPubkeyFromSignature(challenge, verifyCall.signature)).toBe(ROOT_PUBKEY);
    // the active-identity signer was never touched
    expect(sphere.signMessage).not.toHaveBeenCalled();

    expect(result).toEqual({ apiKey: 'sk_abc', plan: 'free', created: true });
  });

  it('provisionOrRecoverKey refuses to sign a tampered challenge', async () => {
    const bad =
      'unicity:sgw:auth:v1\n' +
      JSON.stringify({
        network: 'testnet2',
        pubkey: '02' + 'a'.repeat(64), // NOT the root pubkey we requested for
        nonce: NONCE,
        issuedAt: '2026-07-03T12:00:00.000Z',
        expiresAt: '2026-07-03T12:05:00.000Z',
      });
    const fetchMock = mockFetchSequence([
      { url: '/auth/challenge', json: { nonce: NONCE, challenge: bad, expiresAt: '' } },
    ]);

    await expect(provisionOrRecoverKey(fakeSphere() as never)).rejects.toThrow(/SGW challenge rejected/);
    expect(fetchMock).toHaveBeenCalledTimes(1); // never reached /auth/verify
  });

  it('provisionOrRecoverKey: throws when the root key is unavailable', async () => {
    const noRootKey = {
      deriveAddress: () => ({ privateKey: undefined }),
    } as unknown as import('@unicitylabs/sphere-sdk').Sphere;
    await expect(provisionOrRecoverKey(noRootKey)).rejects.toThrow(/root key/i);
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

  it('createStoreCheckout includes the upgrade apiKey in the body when provided', async () => {
    const fetchSpy = mockFetchOnce({ json: { orderId: 'ssc-2', redirectUrl: 'https://app.paymento.io/gateway?token=u' } });
    await createStoreCheckout(3, 'a@b.c', 'sk_' + 'e'.repeat(32));
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/paymento/checkout'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ planId: 3, email: 'a@b.c', apiKey: 'sk_' + 'e'.repeat(32) }),
      }),
    );
  });

  it('createStoreCheckout omits the apiKey field for blank upgrade keys', async () => {
    const fetchSpy = mockFetchOnce({ json: { orderId: 'ssc-3', redirectUrl: 'https://x' } });
    await createStoreCheckout(2, 'a@b.c', '  ');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ body: JSON.stringify({ planId: 2, email: 'a@b.c' }) }),
    );
  });

  it('getOrderStatus passes through the ack-contract fields (apiKey on every poll, upgrade/maskedKey/planName)', async () => {
    mockFetchOnce({
      json: {
        orderId: 'ssc-1', status: 'paid', statusName: 'Approve', fulfilled: true, confirming: false,
        upgrade: true, maskedKey: 'sk_...abcd', planName: 'premium',
      },
    });
    const res = await getOrderStatus('ssc-1');
    expect(res.status).toBe('paid');
    expect(res.upgrade).toBe(true);
    expect(res.maskedKey).toBe('sk_...abcd');
    expect(res.planName).toBe('premium');
    expect(res.apiKey).toBeUndefined();
  });

  describe('ackOrderKeyDelivery', () => {
    it('POSTs to order-key-ack and resolves true on 200', async () => {
      const fetchSpy = mockFetchOnce({ json: { acknowledged: true } });
      await expect(ackOrderKeyDelivery('ssc-1')).resolves.toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/paymento/order-key-ack?orderId=ssc-1'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('resolves false without retrying on 409 (upgrade order) and 404 (old gateway / unknown order)', async () => {
      const on409 = mockFetchOnce({ ok: false, status: 409, json: { error: 'Upgrade orders have no key to acknowledge.' } });
      await expect(ackOrderKeyDelivery('ssc-upg')).resolves.toBe(false);
      expect(on409).toHaveBeenCalledTimes(1);

      const on404 = mockFetchOnce({ ok: false, status: 404, json: { error: 'Not found' } });
      await expect(ackOrderKeyDelivery('ssc-x')).resolves.toBe(false);
      expect(on404).toHaveBeenCalledTimes(1);
    });

    it('retries transient failures and never throws', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('net'))
        .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ acknowledged: true }) });
      vi.stubGlobal('fetch', fn);
      await expect(ackOrderKeyDelivery('ssc-1', { sleep: async () => {} })).resolves.toBe(true);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('gives up after the attempt budget on persistent failures', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('net'));
      vi.stubGlobal('fetch', fn);
      await expect(ackOrderKeyDelivery('ssc-1', { attempts: 2, sleep: async () => {} })).resolves.toBe(false);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('getKeyInfo', () => {
    it('GETs key-info with the key as X-API-Key credential and returns the info', async () => {
      const body = { maskedKey: 'sk_...abcd', planName: 'basic', subscriptionState: 'active', activeUntil: '2026-08-12T00:00:00Z' };
      const fetchSpy = mockFetchOnce({ json: body });
      const res = await getKeyInfo('sk_' + 'a'.repeat(32));
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/paymento/key-info'),
        expect.objectContaining({ headers: { 'x-api-key': 'sk_' + 'a'.repeat(32) } }),
      );
      expect(res).toEqual(body);
    });

    it('returns null on the definitive unknown/revoked 404', async () => {
      mockFetchOnce({ ok: false, status: 404, json: { error: 'Unknown API key.' } });
      await expect(getKeyInfo('sk_dead')).resolves.toBeNull();
    });

    it("throws on an old gateway's route-missing 404 (must not read as a dead key)", async () => {
      mockFetchOnce({ ok: false, status: 404, json: { error: 'Not found' } });
      await expect(getKeyInfo('sk_abc')).rejects.toThrow(/Not found/);
    });

    it('throws on server errors', async () => {
      mockFetchOnce({ ok: false, status: 503, json: { error: 'nope' } });
      await expect(getKeyInfo('sk_abc')).rejects.toThrow();
    });
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
