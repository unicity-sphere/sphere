/**
 * SGW auth-challenge template validation — the wallet must never sign
 * unverified server-chosen text (same rule as the SDK's wallet-api
 * verifyChallengeTemplate, ported for the SGW prefix/format).
 * The challenge is still signed VERBATIM after validation — never re-serialize.
 */
export const SGW_CHALLENGE_PREFIX = 'unicity:sgw:auth:v1\n';

const MAX_CLOCK_SKEW_MS = 5 * 60_000;
const MAX_VALIDITY_WINDOW_MS = 60 * 60_000;
const FIELDS = ['network', 'pubkey', 'nonce', 'issuedAt', 'expiresAt'] as const;

export class SgwChallengeError extends Error {
  constructor(message: string) {
    super(`SGW challenge rejected: ${message}`);
    this.name = 'SgwChallengeError';
  }
}

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

  const now = expect.nowMs ?? Date.now();
  const issuedAt = Date.parse(p.issuedAt);
  const expiresAt = Date.parse(p.expiresAt);
  if (Number.isNaN(issuedAt) || Number.isNaN(expiresAt)) throw new SgwChallengeError('unparseable timestamps');
  if (issuedAt > now + MAX_CLOCK_SKEW_MS) throw new SgwChallengeError('issuedAt too far in the future');
  if (expiresAt <= now) throw new SgwChallengeError('challenge expired');
  if (expiresAt - issuedAt > MAX_VALIDITY_WINDOW_MS) throw new SgwChallengeError('validity window too long');
}
