import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sphere } from '@unicitylabs/sphere-sdk';
import { cancellingSends, forgetCancellingSends, rememberCancellingSend } from '@/sdk/cancellingSends';

// sphere-sdk 0.19.0: a send being cancelled is not in pendingTransfers(), yet another device of the
// wallet could still complete it. The duplicate-send guards read these rows beside that list.

const BOB = `02${'b'.repeat(64)}`;
const ALICE = `03${'a'.repeat(64)}`;
const CAROL = `03${'c'.repeat(64)}`;
/** A sphere signed in as `chainPubkey`, resolving every nametag to BOB unless told otherwise. */
function sphereAs(chainPubkey: string, resolve = vi.fn(async () => ({ chainPubkey: BOB }))): Sphere {
  return { identity: { chainPubkey }, resolve } as unknown as Sphere;
}

beforeEach(() => forgetCancellingSends());

describe('rememberCancellingSend', () => {
  it('records a send to a chain pubkey as a row the duplicate guards match', async () => {
    await rememberCancellingSend(sphereAs(ALICE), { transferId: 'tid-1', recipient: BOB, coinId: 'c', amount: '100' });

    expect(cancellingSends(sphereAs(ALICE))).toEqual([
      expect.objectContaining({ transferId: 'tid-1', recipient: BOB, coinId: 'c', amount: '100' }),
    ]);
  });

  it('resolves a nametag the way the send path does', async () => {
    const resolve = vi.fn(async () => ({ chainPubkey: BOB }));

    await rememberCancellingSend(sphereAs(ALICE, resolve), { transferId: 'tid-2', recipient: '@bob', coinId: 'c', amount: '5' });

    expect(resolve).toHaveBeenCalledWith('bob');
    expect(cancellingSends(sphereAs(ALICE)).map((row) => row.recipient)).toEqual([BOB]);
  });

  it('never rejects, even when the resolver throws synchronously', async () => {
    const resolve = vi.fn(() => {
      throw new Error('not wired');
    });

    await expect(
      rememberCancellingSend(sphereAs(ALICE, resolve as never), { transferId: 'tid-4', recipient: '@bob', coinId: 'c', amount: '5' }),
    ).resolves.toBeUndefined();
    expect(cancellingSends(sphereAs(ALICE))).toEqual([]);
  });

  it('records nothing for a recipient it cannot resolve', async () => {
    const resolve = vi.fn(async () => {
      throw new Error('relay down');
    });

    await rememberCancellingSend(sphereAs(ALICE, resolve as never), { transferId: 'tid-3', recipient: '@ghost', coinId: 'c', amount: '5' });

    expect(cancellingSends(sphereAs(ALICE))).toEqual([]);
  });

  it("returns only the active address's rows: after a switch, another address's cancel is not this one's duplicate", async () => {
    await rememberCancellingSend(sphereAs(ALICE), { transferId: 'tid-alice', recipient: BOB, coinId: 'c', amount: '5' });

    expect(cancellingSends(sphereAs(CAROL))).toEqual([]);
    expect(cancellingSends(sphereAs(ALICE)).map((row) => row.transferId)).toEqual(['tid-alice']);
    expect(cancellingSends(null)).toEqual([]);
  });
});
