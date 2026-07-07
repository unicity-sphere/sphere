import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPublicKey, recoverPubkeyFromSignature } from '@unicitylabs/sphere-sdk';
import {
  provisionOrRecoverKey,
  getUtilization,
  getStorePlans,
  createStoreCheckout,
  getOrderStatus,
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
