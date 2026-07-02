import { describe, it, expect } from 'vitest';
// core crypto is re-exported from the SDK root (index.ts): signMessage, recoverPubkeyFromSignature
import { signMessage, recoverPubkeyFromSignature } from '@unicitylabs/sphere-sdk';

// Golden vector — design spec §4.1. Generated from the SDK's documented scheme.
const PRIV = '1111111111111111111111111111111111111111111111111111111111111111';
const PUBKEY = '034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa';
const MESSAGE =
  'unicity:sgw:auth:v1\n' +
  'network=testnet2\n' +
  `pubkey=${PUBKEY}\n` +
  'nonce=f3d94c7a1e8b2f5c9a0d3e6b4f7c8a1d2e5b9c0f3a6d7e8b1c4f5a9d0e3b6c7f\n' +
  'expiresAt=2026-07-02T12:05:00Z';
const EXPECTED_SIG =
  '1f585fe41581eac97482be88d6eb1c904db3697c3ec9ef51a4fe89d91762f90a1d465fda8f4ca3166f245a68ae0dcf069d8c5701ffa4d04ad3ce50c9f074b37ebe';

describe('signMessage interop (SGW backend must match)', () => {
  it('produces the golden v+r+s signature and recovers the pubkey', () => {
    const sig = signMessage(PRIV, MESSAGE);
    expect(sig).toBe(EXPECTED_SIG);
    expect(sig.slice(0, 2)).toBe('1f'); // v = 31 (0x1f), recid 0 — v is FIRST, not Ethereum's 27/28
    expect(recoverPubkeyFromSignature(MESSAGE, sig)).toBe(PUBKEY);
  });
});
