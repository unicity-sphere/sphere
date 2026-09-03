/**
 * Per-network capability gates for the wallet UI.
 *
 * WHY: self-mint (Top Up, Swap's mint leg, the Connect `mint` intent) creates
 * fungible tokens out of thin air. The aggregator cannot police it server-side:
 * a certification_request carries no coinId, and MINTER_SECRET is public — so
 * on mainnet a self-mint would create REAL coinIds for free. The wallet is the
 * only gate, therefore it must FAIL CLOSED: minting is allowed only on the
 * explicit test-network allowlist below; 'mainnet', unknown or future network
 * names are denied by default.
 */

/**
 * Networks that carry test money only. Every capability below is granted from
 * this one allowlist, so a new network is denied everything until it is listed
 * deliberately. Exact match by design: a typo'd network unlocks nothing.
 */
const TEST_NETWORKS: ReadonlySet<string> = new Set(['testnet2', 'testnet', 'dev']);

/** User-facing error for gated mint attempts (hook throws + Connect intent reject). */
export const MINT_UNAVAILABLE_MESSAGE = 'Minting is not available on this network';

/**
 * Fail-closed allowlist: true only for known test networks. Any other value —
 * including 'mainnet', '', case variants and future network names — is false.
 */
export function canSelfMint(network: string): boolean {
  return TEST_NETWORKS.has(network);
}

/**
 * Fail-closed allowlist: true when the money on this network is play money.
 *
 * A SEPARATE question from canSelfMint, and a separate set on purpose even though
 * the two coincide today. "May the wallet mint here" and "is this real value" are
 * different: a test network could have minting switched off, and the badge would
 * then have to keep saying the tokens are worthless. Borrowing canSelfMint for the
 * badge made it lie in exactly that case. testMoneyMatchesSelfMint() below pins
 * that they agree, so any divergence has to be written down rather than drifting.
 */
const TEST_MONEY_NETWORKS: ReadonlySet<string> = new Set(['testnet2', 'testnet', 'dev']);

export function isTestMoney(network: string): boolean {
  return TEST_MONEY_NETWORKS.has(network);
}

/** The two allowlists agree today; exported so a test can pin it. */
export function testMoneyMatchesSelfMint(network: string): boolean {
  return isTestMoney(network) === canSelfMint(network);
}

/**
 * Whether ONE shared, build-time aggregator key (VITE_AGGREGATOR_API_KEY) may
 * serve every wallet on this network.
 *
 * WHY: that key is compiled into the JS the browser downloads (and
 * deploy/runtime-config.sh seds it into the built bundle), so it is readable by
 * every visitor — it is not, and cannot be, a secret. On a test network that is
 * harmless: the key guards worthless money and is published on purpose. On a
 * real-value network it would hand the operator's aggregator quota to anyone
 * who opens devtools, which is exactly what per-wallet subscription keys exist
 * to prevent. Fail closed: only test networks may use the shared key.
 */
export function allowsSharedAggregatorKey(network: string): boolean {
  return TEST_NETWORKS.has(network);
}
