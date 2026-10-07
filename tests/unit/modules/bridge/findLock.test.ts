/**
 * The Ethereum asset finds a deposit's lock by itself: the vault's Lock events for the signer
 * since the deposit started, matched on the deposit's commitment. A read of the chain, nothing
 * is sent. Exercised against the real Sepolia USDC asset with the node's answers stubbed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LOCK_EVENT_TOPIC0 } from '@unicitylabs/bridge-plugin';
import { SEPOLIA_USDC_BRIDGE } from '@unicitylabs/bridge-plugin/wallet';

import evmUsdc from '@/modules/bridge/assets/evm-usdc';
import { resetBridgeAssets } from '@/modules/bridge/assets';

const FROM = '0x2B00d708fc777F174A248B9bE01c8E8379d69Caf';
const COMMITMENT = '33'.repeat(32);
const TXID = 'cd'.repeat(32);

function lockLog(commitmentHex: string) {
  return {
    address: SEPOLIA_USDC_BRIDGE.vault,
    topics: [`0x${LOCK_EVENT_TOPIC0}`, `0x${'1'.padStart(64, '0')}`, `0x${FROM.slice(2).toLowerCase().padStart(64, '0')}`],
    data: `0x${'5'.padStart(64, '0')}${'00'.repeat(32)}${commitmentHex}`,
    blockNumber: '0x100',
    transactionHash: `0x${TXID}`,
  };
}

function node(logs: unknown[]) {
  const requests: { method: string; params: unknown[] }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: { body?: string }) => {
    const req = JSON.parse(init?.body ?? '{}');
    requests.push(req);
    const result = req.method === 'eth_blockNumber' ? '0x200' : logs;
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }));
  }));
  return requests;
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetBridgeAssets();
});

describe('finding a deposit lock on Ethereum', () => {
  it('asks the vault for the signer locks since the deposit started and returns the one with its commitment', async () => {
    const requests = node([lockLog('44'.repeat(32)), lockLog(COMMITMENT)]);
    const [asset] = evmUsdc.load();
    const txid = await asset.findLock!({ from: FROM, recipientCommitmentHex: COMMITMENT, createdAt: Date.now() - 60_000 });
    expect(txid).toBe(`0x${TXID}`);
    const filter = requests.find((r) => r.method === 'eth_getLogs')!.params[0] as { address: string; topics: (string | null)[] };
    expect(filter.address.toLowerCase()).toBe(SEPOLIA_USDC_BRIDGE.vault.toLowerCase());
    expect(filter.topics).toEqual([`0x${LOCK_EVENT_TOPIC0}`, null, `0x${FROM.slice(2).toLowerCase().padStart(64, '0')}`]);
  });

  it('answers null when the signer locked nothing with that commitment', async () => {
    node([lockLog('44'.repeat(32))]);
    const [asset] = evmUsdc.load();
    expect(await asset.findLock!({ from: FROM, recipientCommitmentHex: COMMITMENT, createdAt: Date.now() })).toBeNull();
  });
});
