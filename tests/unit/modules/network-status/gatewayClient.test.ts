import { describe, it, expect, vi } from 'vitest';
import { createGatewayClient, GatewayError, parseShards } from '@/modules/network-status/gatewayClient';
import liveBlock from './fixtures/get_block_testnet2.json';
import notFound from './fixtures/get_block_not_found.json';
import inspectBlock from './fixtures/inspect_block_testnet2.json';
import emptyBlock from './fixtures/inspect_empty_block_testnet2.json';
import inspectRecords from './fixtures/inspect_records_testnet2.json';
import inspectProof from './fixtures/inspect_proof_testnet2.json';

function fakeFetch(handler: (url: string, init: RequestInit) => { status?: number; body: unknown }) {
  const seen: { url: string; body: unknown }[] = [];
  const impl = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    seen.push({ url, body: init.body ? JSON.parse(String(init.body)) : undefined });
    const { status = 200, body } = handler(url, init);
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  }) as typeof fetch;
  return { impl, seen };
}

describe('createGatewayClient', () => {
  it('reads a live get_block answer into a round summary, seal included', async () => {
    const { impl, seen } = fakeFetch(() => ({ body: liveBlock }));
    const client = createGatewayClient('https://gateway.test/', impl);
    const round = await client.getBlock('000', 'latest');
    expect(seen[0]).toMatchObject({
      url: 'https://gateway.test/',
      body: { method: 'get_block', params: { blockNumber: 'latest', shardId: '000' } },
    });
    expect(round).toMatchObject({
      shardId: '000',
      index: 8263396,
      createdAt: 1795511680401,
      totalCommitments: 0,
      empty: true,
      seal: { rootRound: 24790909, certifiedAt: 1795511680 },
    });
  });

  it('answers null for a block the shard does not have, and throws for other RPC errors', async () => {
    const missing = createGatewayClient('https://g', fakeFetch(() => ({ body: notFound })).impl);
    expect(await missing.getBlock('000', 999)).toBeNull();

    const broken = createGatewayClient('https://g', fakeFetch(() => ({ body: { jsonrpc: '2.0', error: { code: -32603, message: 'boom' }, id: 1 } })).impl);
    await expect(broken.getBlock('000', 1)).rejects.toMatchObject({ kind: 'rpc' });
  });

  it('treats a 404 from /network/status as "not served", and anything else non-2xx as an error', async () => {
    const absent = createGatewayClient('https://g', fakeFetch(() => ({ status: 404, body: 'Not Found' })).impl);
    expect(await absent.getNetworkStatus(30)).toBeNull();

    const failing = createGatewayClient('https://g', fakeFetch(() => ({ status: 503, body: 'down' })).impl);
    await expect(failing.getNetworkStatus(30)).rejects.toBeInstanceOf(GatewayError);
  });

  it('parses the /network/status v1 contract, keeping a round whose seal is unreadable', async () => {
    const payload = {
      version: 1,
      generatedAt: 1795511597300,
      pollIntervalMs: 1000,
      staleAfterMs: 15000,
      shards: [
        {
          shardId: '010',
          status: 'ok',
          rounds: [
            { index: '8263291', createdAt: 1795511597300, totalCommitments: '4', rootHash: 'aa', empty: false, rootRound: '24790627', certifiedAt: 1795511597, signers: ['b', 'a'] },
            { index: '8263290', createdAt: 1795511596400, totalCommitments: '0', rootHash: 'bb', empty: true, rootRound: null, certifiedAt: null, signers: null },
          ],
        },
      ],
    };
    const { impl, seen } = fakeFetch(() => ({ body: payload }));
    const status = await createGatewayClient('https://g', impl).getNetworkStatus(30);
    expect(seen[0].url).toBe('https://g/network/status?recent=30');
    expect(status!.shards[0].rounds).toEqual([
      { shardId: '010', index: 8263291, createdAt: 1795511597300, totalCommitments: 4, rootHash: 'aa', empty: false, seal: { rootRound: 24790627, certifiedAt: 1795511597, signers: ['a', 'b'] } },
      { shardId: '010', index: 8263290, createdAt: 1795511596400, totalCommitments: 0, rootHash: 'bb', empty: true, seal: null },
    ]);
  });

  it('times out a response whose body stalls after the headers arrive', async () => {
    vi.useFakeTimers();
    try {
      const stalled = (async () => new Response(new ReadableStream({ start() {} }), { status: 200 })) as typeof fetch;
      const pending = createGatewayClient('https://g', stalled).getBlock('000', 'latest');
      const outcome = expect(pending).rejects.toMatchObject({ kind: 'timeout' });
      await vi.advanceTimersByTimeAsync(7_000);
      await outcome;
    } finally {
      vi.useRealTimers();
    }
  });

  it('refuses a payload from a different contract version', async () => {
    const client = createGatewayClient('https://g', fakeFetch(() => ({ body: { version: 2, shards: [] } })).impl);
    await expect(client.getNetworkStatus(30)).rejects.toMatchObject({ kind: 'malformed' });
  });
});

describe('parseShards', () => {
  it('reads v2 binary prefixes and legacy numeric ids', () => {
    expect(parseShards({ version: 1, mode: 'bft-shard', bftShardPrefixes: ['00', '01'] })).toEqual(['00', '01']);
    expect(parseShards({ shardIds: [2, 3] })).toEqual(['2', '3']);
    expect(() => parseShards({})).toThrow(GatewayError);
  });
});

describe('block inspector calls', () => {
  it('reads a full block, its certificate hex and its counts', async () => {
    const { impl, seen } = fakeFetch(() => ({ body: inspectBlock }));
    const block = await createGatewayClient('https://g', impl).getBlockDetail('000', 8464891);
    expect(seen[0].body).toMatchObject({ method: 'get_block', params: { blockNumber: '8464891', shardId: '000' } });
    expect(block).toMatchObject({
      shardId: '000',
      index: 8464891,
      totalCommitments: 1,
      empty: false,
      rootHash: inspectBlock.result.block.rootHash,
      previousBlockHash: inspectBlock.result.block.previousBlockHash,
      certificateHex: inspectBlock.result.block.unicityCertificate,
    });
  });

  it('marks an empty block and answers null for a block the shard does not have', async () => {
    expect(await createGatewayClient('https://g', fakeFetch(() => ({ body: emptyBlock })).impl).getBlockDetail('000', 8464890)).toMatchObject({ empty: true });
    expect(await createGatewayClient('https://g', fakeFetch(() => ({ body: notFound })).impl).getBlockDetail('000', 1)).toBeNull();
  });

  it('refuses an answer for a different block than the one asked for', async () => {
    const client = createGatewayClient('https://g', fakeFetch(() => ({ body: inspectBlock })).impl);
    await expect(client.getBlockDetail('000', 8464892)).rejects.toMatchObject({ kind: 'malformed' });
  });

  it('reads a block’s aggregator records', async () => {
    const { impl, seen } = fakeFetch(() => ({ body: inspectRecords }));
    const records = await createGatewayClient('https://g', impl).getBlockRecords('000', 8464891);
    expect(seen[0].body).toMatchObject({ method: 'get_block_records', params: { blockNumber: '8464891', shardId: '000' } });
    expect(records).toEqual([
      {
        stateId: '0feb784b3166004ba1540d72581bc13c26eeb926c83f1904098ad23c5ac1c3f0',
        transactionHash: 'a29a0155c11d3e3104258aeaa53b2c8f30afd3f37ed9670441a5921436cb2919',
        sourceStateHash: '553832997310058fdef41505b0287bac3203e442cc1eb771925b8f612161d7d7',
        ownerPredicate: { engine: 1, code: 'AQ==', params: 'AyNUI4w/cd7QgCUC2wDQ0f1W+rO/pmczFSx7H5+5jY0M' },
        witness:
          'd2c0b46af7bf3f900cfb226efb7b26fd30f2c658e90006e310fec54cee4aa85a07de13d7b6940caaaf148fe10170f1bbcba727b1bb7ea0bc6cef33d609c005f701',
        expiresAt: null,
        referenceTime: 1795687469,
        aggregateRequestCount: 1,
        leafIndex: 0,
        createdAt: 1795687469628,
        blockNumber: 8464891,
      },
    ]);
  });

  it('keeps a deadline too large for a JavaScript number, as a decimal string', async () => {
    const big = structuredClone(inspectRecords) as { result: { aggregatorRecords: { certificationData: Record<string, unknown> }[] } };
    big.result.aggregatorRecords[0].certificationData.expiresAt = '18446744073709551615';
    const [record] = await createGatewayClient('https://g', fakeFetch(() => ({ body: big })).impl).getBlockRecords('000', 1);
    expect(record.expiresAt).toBe('18446744073709551615');
  });

  it('refuses a record it cannot read rather than dropping it', async () => {
    const broken = structuredClone(inspectRecords) as { result: { aggregatorRecords: Record<string, unknown>[] } };
    delete broken.result.aggregatorRecords[0].stateId;
    await expect(createGatewayClient('https://g', fakeFetch(() => ({ body: broken })).impl).getBlockRecords('000', 1)).rejects.toMatchObject({ kind: 'malformed' });
  });

  it('returns an inclusion proof as hex, and refuses a non-hex answer', async () => {
    const { impl, seen } = fakeFetch(() => ({ body: inspectProof }));
    const hex = await createGatewayClient('https://g', impl).getInclusionProof('0feb78');
    expect(seen[0].body).toMatchObject({ method: 'get_inclusion_proof.v2', params: { stateId: '0feb78' } });
    expect(hex).toBe(inspectProof.result);

    const odd = fakeFetch(() => ({ body: { jsonrpc: '2.0', result: { proof: 'zz' }, id: 1 } }));
    await expect(createGatewayClient('https://g', odd.impl).getInclusionProof('0feb78')).rejects.toMatchObject({ kind: 'malformed' });
  });
});
