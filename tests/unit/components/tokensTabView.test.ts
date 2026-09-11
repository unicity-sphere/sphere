import { describe, it, expect } from 'vitest';
import { tokensTabView } from '../../../src/components/wallet/L3/views/tokensTabView';

describe('tokensTabView', () => {
  it('shows both kinds unfiltered', () => {
    const v = tokensTabView({ coinless: 2, coins: 3, nftOnly: false });
    expect(v).toMatchObject({ showToggle: true, showCoinless: true, showCoins: true, emptyText: null });
  });

  it('hides coin tokens while filtering to NFTs', () => {
    const v = tokensTabView({ coinless: 2, coins: 3, nftOnly: true });
    expect(v.showCoins).toBe(false);
    expect(v.showCoinless).toBe(true);
    expect(v.emptyText).toBeNull();
  });

  it('keeps the toggle reachable after the LAST NFT leaves while filtering', () => {
    // The dead-end this guards: gate the toggle on `coinless > 0` alone and
    // sending the last NFT hides it while nftOnly is still true — the coin
    // tokens stay filtered out with no control left to unhide them.
    const v = tokensTabView({ coinless: 0, coins: 3, nftOnly: true });
    expect(v.showToggle).toBe(true);
    expect(v.showCoins).toBe(false);
  });

  it('names the filter as the reason the list is empty, not a missing wallet', () => {
    // "No individual tokens found" would be false — there are 3 coin tokens.
    const v = tokensTabView({ coinless: 0, coins: 3, nftOnly: true });
    expect(v.emptyText).toBe('No NFTs in this wallet.');
  });

  it('reports a genuinely empty wallet plainly', () => {
    const v = tokensTabView({ coinless: 0, coins: 0, nftOnly: false });
    expect(v.emptyText).toBe('No individual tokens found.');
    // Nothing to filter, so the toggle stays out of the way.
    expect(v.showToggle).toBe(false);
  });

  it('is not empty when the wallet holds ONLY NFTs', () => {
    // tokens() and coinless() are disjoint, so a coin count of 0 says nothing
    // about whether there is anything to show.
    const v = tokensTabView({ coinless: 2, coins: 0, nftOnly: false });
    expect(v.emptyText).toBeNull();
    expect(v.showCoinless).toBe(true);
  });
});
