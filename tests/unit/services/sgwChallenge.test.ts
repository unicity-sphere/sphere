import { verifySgwChallenge, SgwChallengeError, SGW_CHALLENGE_PREFIX } from '@/services/sgwChallenge';

const NET = 'testnet2';
const PUBKEY = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const NONCE = '6f7c2e1a-8b1d-4f3e-9c5a-2d4b6e8f0a1c';
const NOW = Date.parse('2026-07-03T12:00:30.000Z');

function makeChallenge(overrides: Record<string, string> = {}, bodyOverride?: string): string {
  const payload = {
    network: 'testnet2',
    pubkey: PUBKEY,
    nonce: NONCE,
    issuedAt: '2026-07-03T12:00:00.000Z',
    expiresAt: '2026-07-03T12:05:00.000Z',
    ...overrides,
  };
  return SGW_CHALLENGE_PREFIX + (bodyOverride ?? JSON.stringify(payload));
}

describe('verifySgwChallenge', () => {
  it('accepts a well-formed SGW challenge', () => {
    expect(() => verifySgwChallenge(makeChallenge(), { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: NOW })).not.toThrow();
  });

  it('rejects a wrong prefix (e.g. the wallet-api prefix)', () => {
    const c = 'unicity:wallet-api:auth:v1\n' + JSON.stringify({ network: 'testnet2', pubkey: PUBKEY, nonce: NONCE, issuedAt: '2026-07-03T12:00:00.000Z', expiresAt: '2026-07-03T12:05:00.000Z' });
    expect(() => verifySgwChallenge(c, { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: NOW })).toThrow(SgwChallengeError);
  });

  it('rejects a pubkey mismatch', () => {
    expect(() => verifySgwChallenge(makeChallenge({ pubkey: '02' + 'a'.repeat(64) }), { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: NOW })).toThrow(SgwChallengeError);
  });

  it('accepts case-insensitive pubkey echo', () => {
    expect(() => verifySgwChallenge(makeChallenge(), { network: NET, pubkey: PUBKEY.toUpperCase(), nonce: NONCE, nowMs: NOW })).not.toThrow();
  });

  it('rejects a nonce mismatch', () => {
    expect(() => verifySgwChallenge(makeChallenge({ nonce: 'ffffffff-ffff-4fff-8fff-ffffffffffff' }), { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: NOW })).toThrow(SgwChallengeError);
  });

  it('rejects a network mismatch (cross-network relay defense)', () => {
    // A challenge issued by mainnet's SGW, replayed to a testnet2 wallet.
    expect(() => verifySgwChallenge(makeChallenge({ network: 'mainnet' }), { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: NOW })).toThrow(SgwChallengeError);
  });

  it('accepts a case-insensitive network echo', () => {
    expect(() => verifySgwChallenge(makeChallenge({ network: 'Testnet2' }), { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: NOW })).not.toThrow();
  });

  it('rejects an expired challenge', () => {
    const past = Date.parse('2026-07-03T12:06:00.000Z');
    expect(() => verifySgwChallenge(makeChallenge(), { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: past })).toThrow(SgwChallengeError);
  });

  it('rejects issuedAt too far in the future (clock skew > 5 min)', () => {
    const early = Date.parse('2026-07-03T11:54:00.000Z');
    expect(() => verifySgwChallenge(makeChallenge(), { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: early })).toThrow(SgwChallengeError);
  });

  it('rejects a validity window over 60 min', () => {
    expect(() => verifySgwChallenge(makeChallenge({ expiresAt: '2026-07-03T13:30:00.000Z' }), { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: NOW })).toThrow(SgwChallengeError);
  });

  it('rejects multi-line or non-JSON bodies', () => {
    expect(() => verifySgwChallenge(makeChallenge({}, '{"a":1}\n{"b":2}'), { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: NOW })).toThrow(SgwChallengeError);
    expect(() => verifySgwChallenge(makeChallenge({}, 'not-json'), { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: NOW })).toThrow(SgwChallengeError);
  });

  it('rejects missing/non-string fields', () => {
    const body = JSON.stringify({ network: 'testnet2', pubkey: PUBKEY, nonce: NONCE, issuedAt: '2026-07-03T12:00:00.000Z' }); // no expiresAt
    expect(() => verifySgwChallenge(SGW_CHALLENGE_PREFIX + body, { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: NOW })).toThrow(SgwChallengeError);
  });
});
