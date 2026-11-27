import { describe, it, expect } from 'vitest';
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import { canonicalNetwork, parseBlockLink, withNetwork, writeBlockLink } from '@/modules/network-status/blockLink';

const OFFERED: NetworkType[] = ['testnet2'];
const parse = (query: string, offered: NetworkType[] = OFFERED) => parseBlockLink(new URLSearchParams(query), offered, 'testnet2');

describe('parseBlockLink', () => {
  it('is none without shard and block', () => {
    expect(parse('network=testnet2')).toEqual({ kind: 'none' });
    expect(parse('')).toEqual({ kind: 'none' });
  });

  it('opens a fully specified link', () => {
    expect(parse('network=testnet2&shard=000&block=8464891')).toEqual({
      kind: 'open',
      link: { network: 'testnet2', shardId: '000', index: 8464891 },
    });
  });

  it('reads the legacy testnet spelling as testnet2', () => {
    expect(parse('network=testnet&shard=000&block=1')).toEqual({ kind: 'open', link: { network: 'testnet2', shardId: '000', index: 1 } });
  });

  it('uses the fallback network when the link names none', () => {
    expect(parse('shard=01&block=7')).toEqual({ kind: 'open', link: { network: 'testnet2', shardId: '01', index: 7 } });
  });

  it('refuses a network this deployment does not offer instead of falling back', () => {
    const state = parse('network=mainnet&shard=00&block=5');
    expect(state.kind).toBe('invalid');
    expect(state.kind === 'invalid' && state.reason).toMatch(/mainnet/);
  });

  it('refuses an unknown network value', () => {
    expect(parse('network=devnet&shard=00&block=5').kind).toBe('invalid');
  });

  it('refuses a malformed shard', () => {
    expect(parse('network=testnet2&shard=all&block=5').kind).toBe('invalid');
    expect(parse('network=testnet2&block=5').kind).toBe('invalid');
  });

  it('refuses a block that is not a non-negative safe integer', () => {
    for (const block of ['-1', '1.5', 'latest', '', '99999999999999999999']) {
      expect(parse(`network=testnet2&shard=000&block=${block}`).kind, block).toBe('invalid');
    }
    expect(parse('network=testnet2&shard=000').kind).toBe('invalid');
  });
});

describe('writeBlockLink', () => {
  it('always writes the network, even when it is the app network', () => {
    const next = writeBlockLink(new URLSearchParams(''), { network: 'testnet2', shardId: '000', index: 42 });
    expect(next.get('network')).toBe('testnet2');
    expect(next.get('shard')).toBe('000');
    expect(next.get('block')).toBe('42');
  });

  it('round-trips through parseBlockLink', () => {
    const link = { network: 'mainnet' as const, shardId: '11', index: 9578840 };
    expect(parseBlockLink(writeBlockLink(new URLSearchParams('x=1'), link), ['testnet2', 'mainnet'], 'testnet2')).toEqual({ kind: 'open', link });
  });

  it('closing removes shard and block, keeps everything else, and copies', () => {
    const params = new URLSearchParams('network=mainnet&shard=00&block=5&x=1');
    const next = writeBlockLink(params, null);
    expect(next.toString()).toBe('network=mainnet&x=1');
    expect(params.get('block')).toBe('5');
  });
});

describe('canonicalNetwork', () => {
  it('maps the alias and rejects unknown values', () => {
    expect(canonicalNetwork('testnet')).toBe('testnet2');
    expect(canonicalNetwork('testnet2')).toBe('testnet2');
    expect(canonicalNetwork('mainnet')).toBe('mainnet');
    expect(canonicalNetwork('devnet')).toBeNull();
    expect(canonicalNetwork(null)).toBeNull();
  });
});

describe('withNetwork', () => {
  it('switching network closes the block, whose number belongs to the old network', () => {
    const next = withNetwork(new URLSearchParams('network=testnet2&shard=000&block=5&x=1'), 'mainnet', 'testnet2');
    expect(next.toString()).toBe('network=mainnet&x=1');
  });

  it('drops the network parameter when switching back to the app network', () => {
    expect(withNetwork(new URLSearchParams('network=mainnet&shard=00&block=5'), 'testnet2', 'testnet2').toString()).toBe('');
  });
});
