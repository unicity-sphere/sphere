/**
 * The Sepolia USDC vault keeps one balance per Ethereum account, so the payout keys every
 * spelling of an account the same, and the returns list offers one collect for it. A collect
 * counts once its transaction is mined, and a reverted one says so. Exercised against the
 * real asset with the Ethereum RPC stubbed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import evmUsdc from '@/modules/bridge/assets/evm-usdc';
import { resetBridgeAssets } from '@/modules/bridge/assets';
import type { BridgePayout } from '@/modules/bridge/types';

const ACCOUNT = '0x32984BdCB769a01A0175145538CC9594bdd1baF7';
const TXID = `0x${'cc'.repeat(32)}`;

/** Answers every receipt request with a mined receipt of `status`, and records each request. */
function receiptsWithStatus(status: '0x1' | '0x0'): { method: string; params: unknown[] }[] {
  const requests: { method: string; params: unknown[] }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      const { method, params } = JSON.parse(String(init.body)) as { method: string; params: unknown[] };
      requests.push({ method, params });
      const result = method === 'eth_getTransactionReceipt' ? { blockNumber: '0x10', status, logs: [] } : null;
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }));
    }),
  );
  return requests;
}

function sepoliaPayout(): BridgePayout {
  vi.stubEnv('VITE_BRIDGE_RETURN_SERVICE_URL_SEPOLIA_USDC', 'https://return.example.test');
  const [asset] = evmUsdc.load();
  if (!asset.out?.payout) throw new Error('Sepolia USDC credits no payouts');
  return asset.out.payout;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetBridgeAssets();
});

describe('the Sepolia USDC payout', () => {
  it('keys every spelling of one account the same, and different accounts apart', () => {
    const payout = sepoliaPayout();
    expect(payout.account(ACCOUNT)).toBe(payout.account(ACCOUNT.toLowerCase()));
    expect(payout.account(ACCOUNT)).not.toBe(payout.account(`0x${'11'.repeat(20)}`));
  });

  it('confirms a collect once its transaction is mined', async () => {
    const requests = receiptsWithStatus('0x1');
    await expect(sepoliaPayout().confirmed(TXID)).resolves.toBeUndefined();
    expect(requests).toContainEqual({ method: 'eth_getTransactionReceipt', params: [TXID] });
  });

  it('rejects a collect whose transaction reverted', async () => {
    receiptsWithStatus('0x0');
    await expect(sepoliaPayout().confirmed(TXID)).rejects.toThrow('The "collect" transaction reverted. Please try again.');
  });
});
