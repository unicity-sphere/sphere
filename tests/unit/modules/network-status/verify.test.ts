import { describe, it, expect } from 'vitest';
import { parseBlockDetail, parseBlockRecords } from '@/modules/network-status/gatewayClient';
import { loadTrustBase, verifyContextFromJson } from '@/modules/network-status/verify/trustBase';
import { inspectBlockCertificate } from '@/modules/network-status/verify/certificate';
import { inspectProof } from '@/modules/network-status/verify/proof';
import { decodePath } from '@/modules/network-status/verify/path';
import type { BlockDetail } from '@/modules/network-status/types';
import trustBaseJson from './fixtures/trustbase_testnet2.json';
import mainnetTrustBaseJson from './fixtures/trustbase_mainnet.json';
import blockFixture from './fixtures/inspect_block_testnet2.json';
import recordsFixture from './fixtures/inspect_records_testnet2.json';
import proofFixture from './fixtures/inspect_proof_testnet2.json';
import nonInclusionFixture from './fixtures/inspect_nonincl_mainnet.json';

const ctx = verifyContextFromJson(trustBaseJson);
const block: BlockDetail = parseBlockDetail(blockFixture.result, '000');
const [record] = parseBlockRecords(recordsFixture.result);
const proofHex = proofFixture.result;

describe('inspectBlockCertificate', () => {
  it('verifies a live block certificate with every check passing', async () => {
    const report = await inspectBlockCertificate(ctx, block);
    expect(report.outcome).toBe('verified');
    expect(report.reason).toBeNull();
    expect(report.checks.map((c) => c.result)).toEqual(['pass', 'pass', 'pass', 'pass', 'pass', 'pass']);
    expect(report.checks.find((c) => c.label === 'Quorum')?.detail).toBe('4 of 4 roots signed, 3 needed');
    expect(report.summary).toMatchObject({ networkId: 4, epoch: 1, shardId: '000', shardRound: 8464891, inputRecordHash: block.rootHash });
    expect(report.summary?.signers).toHaveLength(4);
  });

  it('fails the root-hash check when the block reports a different root', async () => {
    const report = await inspectBlockCertificate(ctx, { ...block, rootHash: '00'.repeat(32) });
    expect(report.outcome).toBe('failed');
    expect(report.checks.find((c) => c.label === 'Root hash')?.result).toBe('fail');
  });

  it('fails the block binding when the certificate is for another block number', async () => {
    const report = await inspectBlockCertificate(ctx, { ...block, index: block.index + 1 });
    expect(report.outcome).toBe('failed');
    expect(report.checks.at(-1)).toMatchObject({ label: 'This block', result: 'fail' });
  });

  it('fails the block binding when the certificate is for another shard', async () => {
    const report = await inspectBlockCertificate(ctx, { ...block, shardId: '001' });
    expect(report.outcome).toBe('failed');
    expect(report.checks.at(-1)).toMatchObject({ label: 'This block', result: 'fail' });
  });

  it('fails the network check against another network’s trust base, and skips the rest', async () => {
    const other = verifyContextFromJson({ ...trustBaseJson, networkId: 1 });
    const report = await inspectBlockCertificate(other, block);
    expect(report.outcome).toBe('failed');
    expect(report.checks[0]).toMatchObject({ label: 'Network', result: 'fail' });
    expect(report.checks.slice(1).every((c) => c.result === 'skipped')).toBe(true);
  });

  it('cannot check, rather than fails, a seal from another validator epoch', async () => {
    const later = verifyContextFromJson({ ...trustBaseJson, epoch: 2 });
    const report = await inspectBlockCertificate(later, block);
    expect(report.outcome).toBe('unchecked');
    expect(report.reason).toBe("Signed by epoch 1's roots; this page has epoch 2's keys");
  });

  it('cannot check a certificate it cannot decode, or a block without one', async () => {
    expect((await inspectBlockCertificate(ctx, { ...block, certificateHex: 'd99859ff' })).outcome).toBe('unchecked');
    expect((await inspectBlockCertificate(ctx, { ...block, certificateHex: null })).outcome).toBe('unchecked');
  });
});

describe('inspectProof', () => {
  it('verifies a live inclusion proof against a root later than the block', async () => {
    const report = await inspectProof(ctx, record, block.index, proofHex);
    expect(report.outcome).toBe('verified');
    expect(report.kind).toBe('inclusion');
    expect(report.answeredAtBlock).toBeGreaterThan(block.index);
    expect(report.path?.siblings.length).toBeGreaterThan(0);
    expect(report.path?.depths).toHaveLength(report.path!.siblings.length);
    expect(report.certificate?.outcome).toBe('verified');
  });

  it('fails when the block lists different certification data than the proof certifies', async () => {
    const report = await inspectProof(ctx, { ...record, transactionHash: 'ff'.repeat(32) }, block.index, proofHex);
    expect(report.outcome).toBe('failed');
    expect(report.checks.find((c) => c.label === 'Record matches proof')?.result).toBe('fail');
  });

  it('fails when the block lists a different reference time, witness or block than the proof certifies', async () => {
    for (const [field, altered, blockIndex] of [
      ['reference time', { ...record, referenceTime: record.referenceTime + 1 }, block.index],
      ['witness', { ...record, witness: '00' + record.witness.slice(2) }, block.index],
      ['block', record, block.index + 1],
    ] as const) {
      const report = await inspectProof(ctx, altered, blockIndex, proofHex);
      expect(report.outcome, field).toBe('failed');
      expect(report.checks.find((c) => c.label === 'Record matches proof')?.detail, field).toContain(field);
    }
  });

  it('fails a valid proof that is for a different state than the block lists', async () => {
    const report = await inspectProof(ctx, { ...record, stateId: 'ff'.repeat(32) }, block.index, proofHex);
    expect(report.outcome).toBe('failed');
    expect(report.checks.find((c) => c.label === 'Record matches proof')).toMatchObject({ result: 'fail', detail: expect.stringMatching(/state ID/) });
  });

  it('cannot check a non-inclusion answer whose certificate it cannot check', async () => {
    const report = await inspectProof(verifyContextFromJson({ ...mainnetTrustBaseJson, epoch: 99 }), record, 0, nonInclusionFixture.result);
    expect(report.kind).toBe('non-inclusion');
    expect(report.outcome).toBe('unchecked');
  });

  it('cannot check a proof sealed in another validator epoch', async () => {
    const report = await inspectProof(verifyContextFromJson({ ...trustBaseJson, epoch: 2 }), record, block.index, proofHex);
    expect(report.outcome).toBe('unchecked');
    expect(report.reason).toMatch(/epoch 1/);
  });

  it('fails a proof under another network’s trust base', async () => {
    const report = await inspectProof(verifyContextFromJson({ ...trustBaseJson, networkId: 1 }), record, block.index, proofHex);
    expect(report.outcome).toBe('failed');
  });

  it('treats non-inclusion from a root that predates the block as no evidence', async () => {
    const report = await inspectProof(ctx, record, 999_999_999, nonInclusionFixture.result);
    expect(report.kind).toBe('non-inclusion');
    expect(report.outcome).toBe('unchecked');
    expect(report.reason).toMatch(/before this commitment's block/);
  });

  it('fails on an authenticated non-inclusion from a root that already contains the block', async () => {
    const report = await inspectProof(verifyContextFromJson(mainnetTrustBaseJson), record, 0, nonInclusionFixture.result);
    expect(report.kind).toBe('non-inclusion');
    expect(report.certificate?.outcome).toBe('verified');
    expect(report.outcome).toBe('failed');
    expect(report.reason).toMatch(/^The gateway says this state is not in the tree at block/);
  });

  it('fails a non-inclusion answer whose certificate fails, saying so', async () => {
    const report = await inspectProof(ctx, record, 0, nonInclusionFixture.result);
    expect(report.outcome).toBe('failed');
    expect(report.reason).toMatch(/certificate did not verify: Network/);
  });

  it('cannot check a proof it cannot decode', async () => {
    expect((await inspectProof(ctx, record, block.index, 'd99879ff')).outcome).toBe('unchecked');
  });
});

describe('decodePath', () => {
  it('reads the sibling depths from the bitmap, most significant bit first', () => {
    const bytes = new Uint8Array(32 + 64);
    bytes[0] = 0x80; // depth 0
    bytes[1] = 0x40; // depth 9
    bytes.fill(0xaa, 32, 64);
    bytes.fill(0xbb, 64, 96);
    expect(decodePath(bytes)).toEqual({ depths: [0, 9], siblings: ['aa'.repeat(32), 'bb'.repeat(32)] });
  });

  it('refuses a path whose siblings do not match its bitmap', () => {
    const bytes = new Uint8Array(32 + 32);
    bytes[0] = 0xc0; // two siblings declared, one present
    expect(() => decodePath(bytes)).toThrow();
  });
});

describe('loadTrustBase', () => {
  it('loads the trust base Sphere embeds for each network', async () => {
    expect((await loadTrustBase('testnet2')).info).toMatchObject({ networkId: 4, epoch: 1, quorum: 3 });
    expect((await loadTrustBase('mainnet')).info).toMatchObject({ networkId: 1 });
  });
});
