import { describe, it, expect } from 'vitest';
import { canSelfMint, MINT_UNAVAILABLE_MESSAGE } from '../../../src/config/networkCapabilities';

describe('canSelfMint — fail-closed allowlist', () => {
  it('allows the test networks', () => {
    expect(canSelfMint('testnet2')).toBe(true);
    expect(canSelfMint('testnet')).toBe(true);
    expect(canSelfMint('dev')).toBe(true);
  });

  it('denies mainnet', () => {
    expect(canSelfMint('mainnet')).toBe(false);
  });

  it('denies unknown, empty, cased and padded values', () => {
    expect(canSelfMint('')).toBe(false);
    expect(canSelfMint('testnet3')).toBe(false);
    expect(canSelfMint('some-future-network')).toBe(false);
    expect(canSelfMint('MAINNET')).toBe(false);
    expect(canSelfMint('Testnet2')).toBe(false); // exact match only — no case folding
    expect(canSelfMint(' testnet2')).toBe(false); // no trimming either
  });

  it('exposes the shared user-facing message', () => {
    expect(MINT_UNAVAILABLE_MESSAGE).toBe('Minting is not available on this network');
  });
});
