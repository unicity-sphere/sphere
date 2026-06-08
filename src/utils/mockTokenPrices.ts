/**
 * Mock USD prices keyed by token registry `name` (the lowercased canonical
 * field, e.g. `bitcoin`, `ethereum`, `tether`).
 *
 * Used by the Astrid agent demo to compute USD-equivalent balances and task
 * values. Replace with real `sphere.providers.price.getPrices(...)` once we
 * wire the agent wallet to live data.
 */
export const MOCK_TOKEN_PRICES: Record<string, number> = {
  bitcoin: 60000,
  ethereum: 3000,
  solana: 150,
  unicity: 1,
  'unicity-usd': 1,
  tether: 1,
  'usd-coin': 1,
};

export function getMockPrice(name: string | undefined): number {
  if (!name) return 0;
  return MOCK_TOKEN_PRICES[name.toLowerCase()] ?? 0;
}
