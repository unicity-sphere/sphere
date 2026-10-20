/**
 * `to` on the `send` and `payment_request` intents: `@` names a Unicity ID, and
 * without it the string must be a pubkey (66-hex chain or 64-hex transport). Anything else is refused before
 * the intent opens, so the SDK never falls back to looking a bare string up as a tag.
 */
import { describe, it, expect } from 'vitest';
import { ERROR_CODES } from '@unicitylabs/sphere-sdk/connect';
import { validateIntent } from '../../../src/components/connect/intentValidation';

const COIN = 'c'.repeat(64);
const PUBKEY = `02${'a'.repeat(64)}`;

describe.each(['send', 'payment_request'])('the %s intent recipient', (action) => {
  const check = (to: string) => validateIntent(action, { to, amount: '100', coinId: COIN });

  it.each([
    ['an @-prefixed Unicity ID', '@alice'],
    ['an @-prefixed tag that looks like a pubkey', `@${PUBKEY}`],
    ['a chain pubkey', PUBKEY],
    ['an upper-case chain pubkey', `03${'A'.repeat(64)}`],
    ['a 64-hex transport pubkey', 'a'.repeat(64)],
  ])('accepts %s', (_label, to) => {
    expect(check(to)).toBeNull();
  });

  it.each([
    ['a Unicity ID without the @', 'alice'],
    ['a padded chain pubkey', ` ${PUBKEY}`],
    ['a padded transport pubkey', `${'a'.repeat(64)} `],
    ['a 65-hex string', 'a'.repeat(65)],
    ['a lone @', '@'],
  ])('refuses %s', (_label, to) => {
    expect(check(to)).toMatchObject({ code: ERROR_CODES.INVALID_PARAMS, message: expect.stringMatching(/"to" must be/) });
  });
});
