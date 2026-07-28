import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ensureJwt } from '../../../src/services/userApi';

/**
 * The backend attributes a user to a frontend from the X-Client header on
 * sign-in. authFetch already sends it, but the challenge/verify pair runs
 * before any JWT exists and used a bare fetch — so every wallet sign-in
 * landed in the 'unknown' bucket and the wallet audience read as empty.
 */
describe('ensureJwt — client attribution', () => {
  const fakeSphere = {
    identity: {
      directAddress: 'DIRECT://wallet-user',
      chainPubkey:   '02' + 'ab'.repeat(32),
      nametag:       null,
    },
    signMessage: () => 'aa'.repeat(65),
  } as never;

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn(async () => ({
      ok:   true,
      json: async () => ({ nonce: 'n1', challenge: 'sign me', jwt: 'jwt-token' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const headersOf = (callIndex: number): Headers => {
    const init = fetchMock.mock.calls[callIndex][1] as RequestInit | undefined;
    return new Headers(init?.headers);
  };

  it('identifies the wallet when requesting the challenge', async () => {
    await ensureJwt(fakeSphere);
    expect(headersOf(0).get('x-client')).toBe('sphere');
  });

  it('identifies the wallet when verifying the signature', async () => {
    await ensureJwt(fakeSphere);
    expect(headersOf(1).get('x-client')).toBe('sphere');
  });

  it('still sends the payload the verify endpoint expects', async () => {
    await ensureJwt(fakeSphere);
    const init = fetchMock.mock.calls[1][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({ nonce: 'n1' });
  });
});
