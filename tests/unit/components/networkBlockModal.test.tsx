import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import BlockModal from '@/components/network/block/BlockModal';
import { GatewayError, parseBlockDetail, parseBlockRecords, type GatewayClient } from '@/modules/network-status/gatewayClient';
import type { BlockLinkState } from '@/modules/network-status/blockLink';
import type { BlockDetail } from '@/modules/network-status/types';
import blockFixture from '../modules/network-status/fixtures/inspect_block_testnet2.json';
import emptyFixture from '../modules/network-status/fixtures/inspect_empty_block_testnet2.json';
import recordsFixture from '../modules/network-status/fixtures/inspect_records_testnet2.json';
import proofFixture from '../modules/network-status/fixtures/inspect_proof_testnet2.json';

vi.mock('@/modules/network-status/verify/trustBase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/network-status/verify/trustBase')>();
  const trustBaseJson = (await import('../modules/network-status/fixtures/trustbase_testnet2.json')).default;
  const context = actual.verifyContextFromJson(trustBaseJson);
  return { ...actual, loadTrustBase: async () => context };
});

const SHARDS = ['000', '001', '010', '011', '100', '101', '110', '111'];
const FULL = parseBlockDetail(blockFixture.result, '000'); // #8464891, one record
const EMPTY = parseBlockDetail(emptyFixture.result, '000'); // #8464890
const RECORDS = parseBlockRecords(recordsFixture.result);

function fakeClient(blocks: Record<number, () => Promise<BlockDetail | null>>) {
  const calls: string[] = [];
  const client: GatewayClient = {
    baseUrl: 'https://gateway.test',
    getShards: async () => SHARDS,
    getBlock: async () => null,
    getNetworkStatus: async () => null,
    getBlockDetail: async (shardId, index) => {
      calls.push(`block:${shardId}:${index}`);
      const answer = blocks[index];
      return answer ? answer() : null;
    },
    getBlockRecords: async (shardId, index) => {
      calls.push(`records:${shardId}:${index}`);
      return RECORDS;
    },
    getInclusionProof: async (stateId) => {
      calls.push(`proof:${stateId}`);
      return proofFixture.result;
    },
  };
  return { client, calls };
}

const open = (index: number): BlockLinkState => ({ kind: 'open', link: { network: 'testnet2', shardId: '000', index } });

function renderModal(state: BlockLinkState, client: GatewayClient, extra: { newestIndex?: number | null; onNavigate?: () => void; onClose?: () => void } = {}) {
  const props = { shardIds: SHARDS, newestIndex: null, onNavigate: vi.fn(), onClose: vi.fn(), ...extra };
  const view = render(<BlockModal state={state} client={client} {...props} />);
  return { ...view, props, rerenderWith: (next: BlockLinkState) => view.rerender(<BlockModal state={next} client={client} {...props} />) };
}

describe('BlockModal', () => {
  it('shows an empty block without asking for its records, and verifies its certificate', async () => {
    const { client, calls } = fakeClient({ 8464890: async () => EMPTY });
    renderModal(open(8464890), client);
    expect(await screen.findByText(/No commitments/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Shard 0 · Block #8,464,890/ })).toBeTruthy();
    const certificate = screen.getByRole('region', { name: 'Block certificate' });
    expect(await within(certificate).findByText('Verified')).toBeTruthy();
    expect(calls.some((c) => c.startsWith('records:'))).toBe(false);
  });

  it('lists a block’s commitments and verifies a commitment’s proof when it is expanded', async () => {
    const { client, calls } = fakeClient({ 8464891: async () => FULL });
    renderModal(open(8464891), client);
    const card = await screen.findByRole('button', { name: /Commitment #1/ });
    expect(calls.some((c) => c.startsWith('proof:'))).toBe(false);
    fireEvent.click(card);
    const proof = await screen.findByRole('region', { name: 'Inclusion proof' });
    // The proof's own badge, and the badge of the certificate that signs the root it leads to.
    expect(await within(proof).findAllByText('Verified')).toHaveLength(2);
    expect(calls.filter((c) => c.startsWith('proof:'))).toEqual([`proof:${RECORDS[0].stateId}`]);
  });

  it('says a block does not exist yet when the gateway reports it missing', async () => {
    const { client } = fakeClient({});
    renderModal(open(5), client);
    expect(await screen.findByText('Shard 0 has no block #5 yet.')).toBeTruthy();
  });

  it('keeps a gateway failure apart from a missing block, and retries', async () => {
    let attempts = 0;
    const { client } = fakeClient({
      8464890: async () => {
        attempts++;
        if (attempts === 1) throw new GatewayError('timeout', 'get_block timed out');
        return EMPTY;
      },
    });
    renderModal(open(8464890), client);
    expect(await screen.findByText(/Couldn’t reach the gateway/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/No commitments/)).toBeTruthy();
    expect(attempts).toBe(2);
  });

  it('never paints an older block’s answer over the block now shown', async () => {
    let releaseFull!: (block: BlockDetail) => void;
    const { client } = fakeClient({
      8464891: () => new Promise<BlockDetail>((resolve) => (releaseFull = resolve)),
      8464890: async () => EMPTY,
    });
    const { rerenderWith } = renderModal(open(8464891), client);
    rerenderWith(open(8464890));
    expect(await screen.findByText(/No commitments/)).toBeTruthy();
    await act(async () => releaseFull(FULL));
    expect(screen.queryByRole('button', { name: /Commitment #1/ })).toBeNull();
    expect(screen.getByRole('heading', { name: /Block #8,464,890/ })).toBeTruthy();
  });

  it('explains an invalid link and asks the gateway nothing', async () => {
    const { client, calls } = fakeClient({});
    renderModal({ kind: 'invalid', reason: "This link is for mainnet, which this deployment doesn't offer." }, client);
    expect(screen.getByText("This link is for mainnet, which this deployment doesn't offer.")).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('closes on Escape and steps blocks with the arrow keys', async () => {
    const { client } = fakeClient({ 8464890: async () => EMPTY });
    const { props } = renderModal(open(8464890), client);
    await screen.findByText(/No commitments/);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(props.onNavigate).toHaveBeenLastCalledWith({ network: 'testnet2', shardId: '000', index: 8464891 });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(props.onNavigate).toHaveBeenLastCalledWith({ network: 'testnet2', shardId: '000', index: 8464889 });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('offers no next block past the newest one the page knows of', async () => {
    const { client } = fakeClient({ 8464890: async () => EMPTY });
    const { props } = renderModal(open(8464890), client, { newestIndex: 8464890 });
    await screen.findByText(/No commitments/);
    expect((screen.getByRole('button', { name: 'Next block' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(props.onNavigate).not.toHaveBeenCalled();
  });
});
