import { describe, it, expect } from 'vitest';
import { isChainPubkey, truncateId, stripDirectScheme } from '../../../src/utils/identifiers';

const PUBKEY_02 = '02' + 'ab'.repeat(32); // 66 hex chars
const PUBKEY_03 = '03' + 'CD'.repeat(32); // uppercase hex is valid too

describe('isChainPubkey', () => {
  it('accepts 02/03-prefixed 66-char hex (any case), with surrounding whitespace', () => {
    expect(isChainPubkey(PUBKEY_02)).toBe(true);
    expect(isChainPubkey(PUBKEY_03)).toBe(true);
    expect(isChainPubkey(`  ${PUBKEY_02}  `)).toBe(true);
  });
  it('rejects wrong prefix, wrong length, non-hex, nametags and DIRECT addresses', () => {
    expect(isChainPubkey('04' + 'ab'.repeat(32))).toBe(false); // uncompressed prefix
    expect(isChainPubkey('02' + 'ab'.repeat(31))).toBe(false); // too short
    expect(isChainPubkey('02' + 'ab'.repeat(32) + 'ff')).toBe(false); // too long
    expect(isChainPubkey('02' + 'zz'.repeat(32))).toBe(false); // non-hex
    expect(isChainPubkey('@alice')).toBe(false);
    expect(isChainPubkey('DIRECT://abc')).toBe(false);
    expect(isChainPubkey('')).toBe(false);
  });
});

describe('truncateId', () => {
  it('middle-truncates long values with defaults 8/4', () => {
    expect(truncateId(PUBKEY_02)).toBe(`${PUBKEY_02.slice(0, 8)}...${PUBKEY_02.slice(-4)}`);
  });
  it('returns short values unchanged', () => {
    expect(truncateId('02abcd')).toBe('02abcd');
  });
  it('honors custom lengths', () => {
    expect(truncateId(PUBKEY_02, 12, 6)).toBe(`${PUBKEY_02.slice(0, 12)}...${PUBKEY_02.slice(-6)}`);
  });
});

describe('stripDirectScheme', () => {
  it('removes a leading DIRECT:// scheme', () => {
    expect(stripDirectScheme('DIRECT://abc123')).toBe('abc123');
  });
  it('leaves other values untouched', () => {
    expect(stripDirectScheme('02abcd')).toBe('02abcd');
    expect(stripDirectScheme('PROXY://xyz')).toBe('PROXY://xyz');
  });
});
