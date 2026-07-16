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

/** Networks where free self-mint is acceptable (test money only). */
const SELF_MINT_NETWORKS: ReadonlySet<string> = new Set(['testnet2', 'testnet', 'dev']);

/** User-facing error for gated mint attempts (hook throws + Connect intent reject). */
export const MINT_UNAVAILABLE_MESSAGE = 'Minting is not available on this network';

/**
 * Fail-closed allowlist: true only for known test networks. Any other value —
 * including 'mainnet', '', case variants and future network names — is false.
 * Exact match by design: a typo'd network must not unlock minting.
 */
export function canSelfMint(network: string): boolean {
  return SELF_MINT_NETWORKS.has(network);
}
