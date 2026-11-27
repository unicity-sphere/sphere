import { describe, it, expect } from 'vitest';
import { certificateStructure, proofStructure, type StructureNode } from '@/modules/network-status/structure/schema';
import { formatUtcSeconds } from '@/modules/network-status/format';
import blockFixture from './fixtures/inspect_block_testnet2.json';
import proofFixture from './fixtures/inspect_proof_testnet2.json';
import nonInclusionFixture from './fixtures/inspect_nonincl_mainnet.json';

const certificateHex: string = blockFixture.result.block.unicityCertificate;
const SHARD_CONFIGURATION_HASH = 'dcf8c1decc62018d313776b56d906b49c8f2fa2dc722e6d7b8fc935e8ef9ce48';

/** The node reached by following field names (or labels) from `node`. */
function at(node: StructureNode | null, ...path: string[]): StructureNode {
  let current = node;
  for (const step of path) {
    const next = current?.children.find((c) => c.name === step || c.label === step);
    if (!next) throw new Error(`no ${step} under ${current?.name ?? current?.label}`);
    current = next;
  }
  if (!current) throw new Error('no root');
  return current;
}

const names = (node: StructureNode) => node.children.map((c) => c.name);

function edited(from: string, to: string): string {
  expect(certificateHex.split(from)).toHaveLength(2);
  return certificateHex.replace(from, to);
}

describe('certificateStructure', () => {
  it('names every field of a live block certificate and finds no mismatch', () => {
    const view = certificateStructure(certificateHex);
    expect(view.mismatches).toBe(0);
    expect(view.trailing).toBe(0);
    expect(view.size).toBe(certificateHex.length / 2);
    const root = view.root!;
    expect(root).toMatchObject({ name: 'UnicityCertificate', type: 'tag 39001 · array(7)', offset: 0, length: view.size });
    expect(names(root)).toEqual([
      'version',
      'inputRecord',
      'technicalRecordHash',
      'shardConfigurationHash',
      'shardTreeCertificate',
      'unicityTreeCertificate',
      'unicitySeal',
    ]);
    expect(at(root, 'inputRecord')).toMatchObject({ type: 'tag 39002 · array(10)' });
    expect(at(root, 'inputRecord', 'roundNumber')).toMatchObject({ type: 'uint', value: '8464891', label: '[1]' });
    expect(at(root, 'inputRecord', 'summaryValue')).toMatchObject({ type: 'bytes(0)', value: '(empty)' });
    expect(at(root, 'inputRecord', 'executedTransactionsHash')).toMatchObject({ type: 'null', value: null, mismatch: null });
    expect(at(root, 'shardConfigurationHash')).toMatchObject({ type: 'bytes(32)', value: SHARD_CONFIGURATION_HASH, copy: SHARD_CONFIGURATION_HASH });
    expect(at(root, 'shardTreeCertificate', 'shard')).toMatchObject({ note: 'shard 000' });
    expect(at(root, 'shardTreeCertificate', 'siblingHashList').children).toHaveLength(3);
    expect(at(root, 'unicitySeal', 'networkId')).toMatchObject({ value: '4', note: 'testnet2' });
    expect(at(root, 'unicitySeal', 'timestamp')).toMatchObject({ value: '1795687470', note: formatUtcSeconds('1795687470') });
    const signatures = at(root, 'unicitySeal', 'signatures');
    expect(signatures.type).toBe('map(4)');
    // A key row, then its value row labelled with the key, for each of the four signers.
    expect(signatures.children).toHaveLength(8);
    for (let i = 0; i < 8; i += 2) {
      const [key, signature] = [signatures.children[i], signatures.children[i + 1]];
      expect(key).toMatchObject({ label: 'key', type: 'text', value: expect.stringMatching(/^16Uiu2/) });
      expect(signature.label).toBe(key.value);
      expect(signature.type).toBe('bytes(65)');
      expect(signature.value).toMatch(/^[0-9a-f]{130}$/);
    }
  });

  it('flags a field of the wrong type and still shows its value', () => {
    const view = certificateStructure(edited('d9985a8a011a008129fb', 'd9985a8a0144008129fb'));
    expect(at(view.root, 'inputRecord', 'roundNumber')).toMatchObject({ mismatch: 'expected uint, got bytes(4)', value: '008129fb' });
    expect(view.mismatches).toBe(1);
  });

  it('flags missing and extra elements', () => {
    expect(certificateStructure('d998598101').root).toMatchObject({ mismatch: expect.stringMatching(/^missing inputRecord, technicalRecordHash/) });
    const extra = certificateStructure(edited('d9985987', 'd9985988') + '00');
    expect(extra.root!.children).toHaveLength(8);
    expect(extra.root!.children[7]).toMatchObject({ name: null, label: '[7]', value: '0', mismatch: 'not in the schema' });
    expect(extra.mismatches).toBe(1);
  });

  it('flags a wrong version and an unknown tag, still showing the children', () => {
    expect(at(certificateStructure(edited('d998598701', 'd998598702')).root, 'version')).toMatchObject({
      value: '2',
      mismatch: 'expected version 1, got 2',
    });
    const record = at(certificateStructure(edited('d9985a', 'd998bc')).root, 'inputRecord');
    expect(record).toMatchObject({ type: 'tag 39100 · array(10)', mismatch: 'expected tag 39002, got tag 39100' });
    expect(record.children).toHaveLength(10);
    expect(record.children.every((c) => c.name === null)).toBe(true);
    expect(record.children[1]).toMatchObject({ label: '[1]', value: '8464891' });
  });

  it('flags a hash of the wrong size', () => {
    const view = certificateStructure(edited('5820' + SHARD_CONFIGURATION_HASH, '581f' + SHARD_CONFIGURATION_HASH.slice(2)));
    expect(at(view.root, 'shardConfigurationHash')).toMatchObject({ type: 'bytes(31)', mismatch: 'expected 32 bytes, got 31' });
  });

  it('flags a shard id without its end marker', () => {
    const view = certificateStructure(edited('d9985b83014110', 'd9985b83014100'));
    expect(at(view.root, 'shardTreeCertificate', 'shard')).toMatchObject({ mismatch: 'no end marker', note: null });
  });

  it('keeps the readable fields of a cut certificate and says which fields the input ends before', () => {
    const view = certificateStructure('d998598701');
    expect(view.root).toMatchObject({
      type: 'tag 39001 · array(7)',
      mismatch: 'not read: the input ends before technicalRecordHash, shardConfigurationHash, shardTreeCertificate, unicityTreeCertificate, unicitySeal',
    });
    expect(at(view.root, 'version')).toMatchObject({ value: '1', mismatch: null });
    expect(at(view.root, 'inputRecord')).toMatchObject({ type: 'fault', mismatch: expect.stringMatching(/truncated/) });
  });

  it('refuses a shard id whose end marker is not in its last byte, as the decoders do', () => {
    for (const shard of ['421000', '428000']) {
      const view = certificateStructure(edited('d9985b83014110', 'd9985b8301' + shard));
      expect(at(view.root, 'shardTreeCertificate', 'shard'), shard).toMatchObject({ mismatch: 'no end marker', note: null });
    }
  });

  it('shows every map key as its own element, with its offset and any mismatch', () => {
    const key = '16Uiu2HAm33LfAYP811b4fpW5x8qejmujuB1LFCXPGGTT6bumHrvy';
    const keyHex = Array.from(new TextEncoder().encode(key), (b) => b.toString(16).padStart(2, '0')).join('');
    const intact = at(certificateStructure(certificateHex).root, 'unicitySeal', 'signatures');
    expect(intact.children).toHaveLength(8);
    expect(intact.children[0]).toMatchObject({ label: 'key', type: 'text', value: key });
    expect(intact.children[1]).toMatchObject({ label: key, type: 'bytes(65)' });
    let cursor = intact.children[0].offset;
    for (const child of intact.children) {
      expect(child.offset).toBe(cursor);
      cursor += child.length;
    }
    expect(cursor).toBe(intact.offset + intact.length);

    const view = certificateStructure(edited('7835' + keyHex, '5835' + keyHex));
    const signatures = at(view.root, 'unicitySeal', 'signatures');
    expect(signatures.children[0]).toMatchObject({ label: 'key', type: 'bytes(53)', value: keyHex, mismatch: 'expected text, got bytes(53)' });
    expect(view.mismatches).toBe(1);
  });

  it('counts trailing bytes and turns non-hex input into a fault', () => {
    const trailing = certificateStructure(certificateHex + '00');
    expect(trailing).toMatchObject({ trailing: 1, mismatches: 1 });
    expect(certificateStructure('zz').root).toMatchObject({ type: 'fault', mismatch: 'not hex' });
    expect(certificateStructure('abc').root).toMatchObject({ type: 'fault', mismatch: 'not hex' });
  });

  it('shows where malformed bytes stop being readable', () => {
    const view = certificateStructure(certificateHex.slice(0, 400));
    expect(view.mismatches).toBeGreaterThan(0);
    expect(at(view.root, 'version')).toMatchObject({ value: '1', mismatch: null });
    expect(JSON.stringify(view.root)).toMatch(/truncated/);
  });
});

describe('proofStructure', () => {
  it('names every field of a live inclusion proof', () => {
    const view = proofStructure(proofFixture.result);
    expect(view.mismatches).toBe(0);
    expect(view.root).toMatchObject({ name: 'InclusionProofResponse', type: 'array(2)' });
    expect(names(view.root!)).toEqual(['blockNumber', 'inclusionProof']);
    const proof = at(view.root, 'inclusionProof');
    expect(names(proof)).toEqual(['version', 'certificationData', 'referenceTime', 'inclusionCertificate', 'unicityCertificate']);
    expect(names(at(proof, 'certificationData'))).toEqual(['version', 'lockScript', 'sourceStateHash', 'transactionHash', 'expiresAt', 'unlockScript']);
    expect(names(at(proof, 'certificationData', 'lockScript'))).toEqual(['engine', 'code', 'parameters']);
    expect(at(proof, 'unicityCertificate', 'unicitySeal', 'networkId').note).toBe('testnet2');
  });

  it('flags leaf fields that are neither all present nor all null, as the SDK refuses them', () => {
    expect(nonInclusionFixture.result.split('d998798501f6f6f6')).toHaveLength(2);
    const view = proofStructure(nonInclusionFixture.result.replace('d998798501f6f6f6', 'd998798501f600f6'));
    expect(at(view.root, 'inclusionProof')).toMatchObject({
      mismatch: 'certificationData, referenceTime and inclusionCertificate must be all present or all null',
    });
    expect(at(view.root, 'inclusionProof', 'referenceTime')).toMatchObject({ value: '0', mismatch: null });
    expect(view.mismatches).toBe(1);
  });

  it('names a non-inclusion answer, whose leaf fields are null', () => {
    const view = proofStructure(nonInclusionFixture.result);
    expect(view.mismatches).toBe(0);
    const proof = at(view.root, 'inclusionProof');
    for (const field of ['certificationData', 'referenceTime', 'inclusionCertificate']) {
      expect(at(proof, field)).toMatchObject({ type: 'null', mismatch: null });
    }
    expect(at(proof, 'unicityCertificate', 'unicitySeal', 'networkId').note).toBe('mainnet');
  });
});
