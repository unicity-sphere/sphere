export interface TokensTabView {
  /** Render the NFT-only toggle. */
  showToggle: boolean;
  showCoinless: boolean;
  showCoins: boolean;
  /** Empty-state copy, or null when there are rows to show. */
  emptyText: string | null;
}

/**
 * What the Tokens tab shows, given what the wallet holds and the filter state.
 *
 * The load-bearing rule is that the toggle must stay reachable whenever the
 * filter is ON. Gating it on `coinless > 0` alone strands the user: send the
 * last NFT while filtering and the toggle disappears while `nftOnly` is still
 * true, so the coin tokens are hidden with no control left to unhide them.
 *
 * The empty copy has to name the real reason too — "no individual tokens" is
 * false when the wallet holds coin tokens that a filter is hiding.
 */
export function tokensTabView(input: {
  coinless: number;
  coins: number;
  nftOnly: boolean;
}): TokensTabView {
  const { coinless, coins, nftOnly } = input;
  const showCoins = !nftOnly && coins > 0;
  const showCoinless = coinless > 0;

  let emptyText: string | null = null;
  if (!showCoins && !showCoinless) {
    emptyText = nftOnly ? 'No NFTs in this wallet.' : 'No individual tokens found.';
  }

  return {
    // `|| nftOnly` is the escape hatch, not cosmetics — see above.
    showToggle: coinless > 0 || nftOnly,
    showCoinless,
    showCoins,
    emptyText,
  };
}
