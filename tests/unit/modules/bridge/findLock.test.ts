/**
 * The Ethereum asset finds a deposit's lock by itself: the vault's Lock events for the signer
 * since the deposit started, matched on the deposit's token id, which its salt makes unique;
 * the commitment is the wallet's and the same for all its deposits. A read of the chain,
 * nothing is sent. Exercised against the real Sepolia USDC asset with the node's answers stubbed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LOCK_EVENT_TOPIC0 } from '@unicitylabs/bridge-plugin';
import { SEPOLIA_USDC_BRIDGE } from '@unicitylabs/bridge-plugin/wallet';

import evmUsdc from '@/modules/bridge/assets/evm-usdc';
import { resetBridgeAssets } from '@/modules/bridge/assets';

const FROM = '0x2B00d708fc777F174A248B9bE01c8E8379d69Caf';
const COMMITMENT = '33'.repeat(32);
const TOKEN_ID = '22'.repeat(32);
const TXID = 'cd'.repeat(32);

function lockLog(tokenIdHex: string, txid = TXID) {
  return {
    address: SEPOLIA_USDC_BRIDGE.vault,
    topics: [`0x${LOCK_EVENT_TOPIC0}`, `0x${'1'.padStart(64, '0')}`, `0x${FROM.slice(2).toLowerCase().padStart(64, '0')}`],
    data: `0x${'5'.padStart(64, '0')}${tokenIdHex}${COMMITMENT}`,
    blockNumber: '0x100',
    transactionHash: `0x${txid}`,
  };
}

/** A node whose vault reports `locked` for the token id and whose account has `pending` transactions above `latest`. */
function node(logs: unknown[], locked = logs.length > 0, pending = 0) {
  const requests: { method: string; params: unknown[] }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: { body?: string }) => {
    const req = JSON.parse(init?.body ?? '{}');
    requests.push(req);
    const result =
      req.method === 'eth_blockNumber' ? '0x200'
      : req.method === 'eth_call' ? `0x${(locked ? '1' : '0').padStart(64, '0')}`
      : req.method === 'eth_getTransactionCount' ? `0x${(req.params[1] === 'pending' ? 5 + pending : 5).toString(16)}`
      : logs;
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }));
  }));
  return requests;
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetBridgeAssets();
});

describe('finding a deposit lock on Ethereum', () => {
  it('asks the vault whether the token id is locked, then the signer locks since the deposit started, and returns the transaction', async () => {
    const requests = node([lockLog('44'.repeat(32), 'ab'.repeat(32)), lockLog(TOKEN_ID)]);
    const [asset] = evmUsdc.load();
    const found = await asset.findLock!({ from: FROM, tokenIdHex: TOKEN_ID, createdAt: Date.now() - 60_000 });
    expect(found).toEqual({ outcome: 'found', lockTxid: `0x${TXID}` });
    const call = requests.find((r) => r.method === 'eth_call')!.params[0] as { to: string; data: string };
    expect(call.to.toLowerCase()).toBe(SEPOLIA_USDC_BRIDGE.vault.toLowerCase());
    expect(call.data.endsWith(TOKEN_ID)).toBe(true);
    const filter = requests.find((r) => r.method === 'eth_getLogs')!.params[0] as { address: string; topics: (string | null)[] };
    expect(filter.address.toLowerCase()).toBe(SEPOLIA_USDC_BRIDGE.vault.toLowerCase());
    expect(filter.topics).toEqual([`0x${LOCK_EVENT_TOPIC0}`, null, `0x${FROM.slice(2).toLowerCase().padStart(64, '0')}`]);
  });

  it('answers absent when the vault has no lock with the token id and nothing from the account is pending', async () => {
    node([], false);
    const [asset] = evmUsdc.load();
    expect(await asset.findLock!({ from: FROM, tokenIdHex: TOKEN_ID, createdAt: Date.now() })).toEqual({ outcome: 'absent' });
  });

  it('answers unknown with the reason while a transaction from the account is pending', async () => {
    node([], false, 1);
    const [asset] = evmUsdc.load();
    expect(await asset.findLock!({ from: FROM, tokenIdHex: TOKEN_ID, createdAt: Date.now() })).toMatchObject({ outcome: 'unknown', why: expect.stringMatching(/pending/) });
  });
});
