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

  it('rejects a validity window that ends before it starts', () => {
    const inverted = makeChallenge({ issuedAt: '2026-07-03T12:05:00.000Z', expiresAt: '2026-07-03T12:00:00.000Z' });
    expect(() => verifySgwChallenge(inverted, { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: NOW })).toThrow(SgwChallengeError);
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

/**
 * The device clock is not evidence about anything here.
 *
 * sphere-sdk hit this first (unicity-sphere/sphere-sdk#662): ~63 production
 * Sentry events, gateway answering 200 in 200ms, and users whose clock had
 * drifted could not sign in at all. The challenge is fetched, verified and
 * signed in one synchronous run, so in SERVER time it is never stale; the
 * gateway enforces the nonce TTL authoritatively on its own clock. What stops
 * the wallet signing foreign or replayed text is the pubkey, nonce and network
 * binding above, none of which involve time. So the SDK deleted its two
 * device-clock comparisons and this file, a port of that function, follows.
 *
 * Support cost of keeping them here: one wallet, three weeks, four people,
 * ending at "your computer's clock is wrong" (Discord, Aug-Sep 2026).
 */
describe('verifySgwChallenge ignores the device clock', () => {
  it('accepts a challenge when the device clock runs 12 minutes behind', () => {
    // The gateway stamps 12:00; this device believes it is 11:48.
    const behind = Date.parse('2026-07-03T11:48:00.000Z');
    expect(() => verifySgwChallenge(makeChallenge(), { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: behind })).not.toThrow();
  });

  it('accepts a challenge the device clock believes has already expired', () => {
    // The gateway stamps 12:00-12:05; this device believes it is 12:07.
    const ahead = Date.parse('2026-07-03T12:07:00.000Z');
    expect(() => verifySgwChallenge(makeChallenge(), { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: ahead })).not.toThrow();
  });

  it('accepts it on a device whose DATE is wrong, not just its time', () => {
    // A dead RTC battery lands the machine years off, which is commoner than
    // a few minutes of drift and used to be just as fatal.
    const yearsOff = Date.parse('2019-01-01T00:00:00.000Z');
    expect(() => verifySgwChallenge(makeChallenge(), { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: yearsOff })).not.toThrow();
  });

  it('still refuses to sign for another wallet, whatever the clock says', () => {
    const behind = Date.parse('2026-07-03T11:48:00.000Z');
    const foreign = makeChallenge({ pubkey: '02' + 'a'.repeat(64) });
    expect(() => verifySgwChallenge(foreign, { network: NET, pubkey: PUBKEY, nonce: NONCE, nowMs: behind })).toThrow(SgwChallengeError);
  });
});
