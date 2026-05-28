import { STORAGE_KEYS } from '../config/storageKeys';

const DEFAULT_FAUCET_API_URL = 'https://faucet.unicity.network/api/v1/faucet/request';

/**
 * Resolve the faucet endpoint. Honors the dev-mode override
 * `STORAGE_KEYS.DEV_FAUCET_URL` (set via `sphereDev.setFaucet(...)` or
 * the localStorage key directly) so e2e / soak runs can point at a
 * locally-bootstrapped faucet. Read on every call so the override
 * picks up live without a page reload.
 */
function getFaucetApiUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_FAUCET_API_URL;
  return (
    localStorage.getItem(STORAGE_KEYS.DEV_FAUCET_URL) ?? DEFAULT_FAUCET_API_URL
  );
}

export interface FaucetRequest {
  unicityId: string;
  coin: string;
  amount: number;
}

export interface FaucetResponse {
  success: boolean;
  message?: string;
  coin: string;
  amount: number;
}

// Map raw API/network errors to user-friendly messages
function humanizeError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('net::'))
    return 'Network error. Check your connection';
  if (lower.includes('rate') && lower.includes('limit'))
    return 'Too many requests. Try again later';
  if (lower.includes('timeout') || lower.includes('timed out'))
    return 'Request timed out. Try again';
  if (lower.includes('unicityid') && (lower.includes('not found') || lower.includes('invalid')))
    return 'Unicity ID not found';
  if (lower.includes('coin') && (lower.includes('not found') || lower.includes('invalid') || lower.includes('unsupported')))
    return 'Unsupported coin type';
  if (lower.includes('500') || lower.includes('internal server'))
    return 'Faucet server error. Try again later';
  if (lower.includes('503') || lower.includes('unavailable'))
    return 'Faucet is temporarily unavailable';
  return raw;
}

export class FaucetService {
  static async requestTokens(unicityId: string, coin: string, amount: number): Promise<FaucetResponse> {
    if (import.meta.env.DEV) console.log(`🌊 Requesting ${amount} ${coin} for @${unicityId}...`);

    try {
      const requestBody = {
        unicityId,
        coin,
        amount,
      };

      if (import.meta.env.DEV) console.log(`📤 Sending request:`, requestBody);

      const response = await fetch(getFaucetApiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (import.meta.env.DEV) console.log(`📥 Response status for ${coin}:`, response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed response for ${coin}:`, errorText);
        throw new Error(humanizeError(`${response.statusText} - ${errorText}`));
      }

      const data = await response.json();
      if (import.meta.env.DEV) console.log(`✅ Success for ${coin}:`, data);

      return {
        success: true,
        coin,
        amount,
        ...data,
      };
    } catch (error) {
      console.error(`❌ Faucet request failed for ${coin}:`, error);
      return {
        success: false,
        message: humanizeError(error instanceof Error ? error.message : 'Unknown error'),
        coin,
        amount,
      };
    }
  }

  static async requestAllCoins(unicityId: string): Promise<FaucetResponse[]> {
    const requests = [
      { coin: 'unicity', amount: 100 },
      { coin: 'bitcoin', amount: 1 },
      { coin: 'solana', amount: 1000 },
      { coin: 'ethereum', amount: 42 },
      { coin: 'tether', amount: 1000 },
      { coin: 'usd-coin', amount: 1000 },
      { coin: 'unicity-usd', amount: 1000 },
    ];

    if (import.meta.env.DEV) console.log(`🚀 Starting parallel faucet requests for @${unicityId}...`);

    // Request all coins in parallel for better performance
    const results = await Promise.all(
      requests.map(({ coin, amount }) => this.requestTokens(unicityId, coin, amount))
    );

    if (import.meta.env.DEV) console.log(`📊 Faucet results:`, results);
    const successful = results.filter(r => r.success).length;
    if (import.meta.env.DEV) console.log(`✅ ${successful}/${results.length} requests successful`);

    window.dispatchEvent(new Event("wallet-updated"));
    return results;
  }
}
