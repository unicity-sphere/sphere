/**
 * SGW auth-challenge template validation — the wallet must never sign
 * unverified server-chosen text (same rule as the SDK's wallet-api
 * verifyChallengeTemplate, ported for the SGW prefix/format).
 * The challenge is still signed VERBATIM after validation — never re-serialize.
 */
export const SGW_CHALLENGE_PREFIX = 'unicity:sgw:auth:v1\n';

const MAX_VALIDITY_WINDOW_MS = 60 * 60_000;
const FIELDS = ['network', 'pubkey', 'nonce', 'issuedAt', 'expiresAt'] as const;

export class SgwChallengeError extends Error {
  constructor(message: string) {
    super(`SGW challenge rejected: ${message}`);
    this.name = 'SgwChallengeError';
  }
}

/**
 * @param expect.nowMs Accepted and deliberately IGNORED. It is what the device
 * believes the time is, and nothing here is allowed to depend on that (see the
 * timestamp block below). Kept only so the tests can prove that independence by
 * passing values that used to be fatal. Nothing in the SDK mirrors it: #662
 * deprecated its `nowMs` and the field is gone from `ChallengeExpectation`
 * altogether in the version this repo pins.
 */
export function verifySgwChallenge(
  challenge: string,
  expect: { network: string; pubkey: string; nonce: string; nowMs?: number },
): void {
  if (!challenge.startsWith(SGW_CHALLENGE_PREFIX)) throw new SgwChallengeError('unexpected prefix');

  const body = challenge.slice(SGW_CHALLENGE_PREFIX.length);
  if (body.includes('\n')) throw new SgwChallengeError('payload must be single-line');

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new SgwChallengeError('payload is not valid JSON');
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new SgwChallengeError('payload is not a JSON object');
  }
  for (const f of FIELDS) {
    if (typeof payload[f] !== 'string' || payload[f] === '') throw new SgwChallengeError(`missing field ${f}`);
  }

  const p = payload as Record<(typeof FIELDS)[number], string>;
  // Anti-cross-network relay: a challenge issued by ANOTHER network's SGW must
  // not be signable here. Key derivation + the signMessage scheme are
  // network-independent, so without this the wallet's index-0 signature over a
  // (say) mainnet challenge is redeemable at the mainnet SGW — a confused
  // deputy that harvests the victim's key on a network they never authenticated
  // to. The SDK's own verifyChallengeTemplate enforces the same equality.
  if (p.network.toLowerCase() !== expect.network.toLowerCase()) throw new SgwChallengeError('network mismatch');
  if (p.pubkey.toLowerCase() !== expect.pubkey.toLowerCase()) throw new SgwChallengeError('pubkey mismatch');
  if (p.nonce !== expect.nonce) throw new SgwChallengeError('nonce mismatch');

  const issuedAt = Date.parse(p.issuedAt);
  const expiresAt = Date.parse(p.expiresAt);
  if (Number.isNaN(issuedAt) || Number.isNaN(expiresAt)) throw new SgwChallengeError('unparseable timestamps');
  // Server timestamps only, compared against each other — never against the
  // device clock (sphere-sdk#662, which deleted the same two comparisons from
  // the function this one is ported from).
  //
  // The wallet fetches, verifies and signs a challenge in one synchronous run,
  // so in the gateway's own time it is never stale, and the gateway enforces
  // the nonce TTL on its own clock when the signature comes back. A device
  // clock adds no evidence about any of that: what keeps this wallet from
  // signing foreign or replayed text is the prefix, network, pubkey and nonce
  // binding checked above, and none of it involves time. All the comparison
  // achieved was to lock out every wallet whose clock had drifted, silently
  // and permanently, because the throw happens before the request that could
  // have corrected it.
  if (expiresAt <= issuedAt || expiresAt - issuedAt > MAX_VALIDITY_WINDOW_MS) {
    throw new SgwChallengeError('implausible validity window');
  }
}
