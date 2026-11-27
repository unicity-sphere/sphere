import { describe, it, expect } from 'vitest';
import { MAX_DEPTH, readCbor, type CborItem } from '@/modules/network-status/structure/cbor';
import blockFixture from './fixtures/inspect_block_testnet2.json';

const certificateHex: string = blockFixture.result.block.unicityCertificate;
const bytes = (hex: string) => Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16));
const read = (hex: string) => readCbor(bytes(hex));

function childrenOf(item: CborItem): CborItem[] {
  switch (item.kind) {
    case 'array':
      return [...item.items];
    case 'map':
      return item.entries.flatMap((e) => [e.key, e.value]);
    case 'tag':
      return [item.item];
    default:
      return [];
  }
}

/** Every container's children sit back to back and fill it after its header. */
function assertContiguous(item: CborItem): void {
  const children = childrenOf(item);
  if (children.length === 0) return;
  const contentStart = children[0].offset;
  let cursor = contentStart;
  for (const child of children) {
    expect(child.offset).toBe(cursor);
    cursor += child.length;
    assertContiguous(child);
  }
  expect(cursor).toBe(item.offset + item.length);
  expect(contentStart).toBeGreaterThan(item.offset);
}

function all(item: CborItem): CborItem[] {
  return [item, ...childrenOf(item).flatMap(all)];
}

function last(item: CborItem): CborItem {
  const children = childrenOf(item);
  return children.length === 0 ? item : last(children[children.length - 1]);
}

describe('readCbor', () => {
  it('reads a live certificate with offsets that account for every byte', () => {
    const input = bytes(certificateHex);
    const doc = readCbor(input);
    expect(doc.root).toMatchObject({ kind: 'tag', tag: 39001n, offset: 0, length: input.length });
    expect(doc.size).toBe(input.length);
    expect(doc.trailing).toBe(0);
    assertContiguous(doc.root!);
    expect(all(doc.root!).some((i) => i.kind === 'fault')).toBe(false);
  });

  it('keeps unsigned integers above 2^53 exact', () => {
    expect(read('1bffffffffffffffff').root).toMatchObject({ kind: 'uint', value: 18446744073709551615n, length: 9 });
  });

  it('stops at a truncated item and keeps what it read', () => {
    const doc = read(certificateHex.slice(0, 400));
    expect(doc.root?.kind).toBe('tag');
    const array = doc.root!.kind === 'tag' ? doc.root!.item : null;
    expect(array?.kind).toBe('array');
    expect(array!.kind === 'array' && array!.items.length).toBeGreaterThanOrEqual(2);
    expect(last(doc.root!)).toMatchObject({ kind: 'fault', message: expect.stringMatching(/truncated/) });
    expect(doc.trailing).toBe(0);
  });

  it('marks an item cut off by the end of the input, after a container used up the bytes counted for it', () => {
    const doc = read('828101');
    expect(doc.root).toMatchObject({ kind: 'array', offset: 0, length: 3 });
    expect(doc.root!.kind === 'array' && doc.root!.items[1]).toMatchObject({ kind: 'fault', message: expect.stringMatching(/truncated/) });
    expect(read('d998').root).toMatchObject({ kind: 'fault', message: expect.stringMatching(/truncated/) });
    expect(read('d99859').root).toMatchObject({ kind: 'tag', item: { kind: 'fault', message: expect.stringMatching(/truncated/) } });
  });

  it('marks a map whose key ends the input', () => {
    const doc = read('a161ff00');
    expect(doc.root?.kind).toBe('map');
    const entries = doc.root!.kind === 'map' ? doc.root!.entries : [];
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toMatchObject({ kind: 'fault', message: expect.stringMatching(/UTF-8/) });
    expect(entries[0].value).toMatchObject({ kind: 'fault', length: 0 });
  });

  it('reports bytes left after the top item', () => {
    expect(read(certificateHex + '00').trailing).toBe(1);
  });

  it('marks indefinite lengths and reserved headers instead of throwing', () => {
    expect(read('9f01ff').root).toMatchObject({ kind: 'fault', message: expect.stringMatching(/indefinite/) });
    expect(read('1c').root).toMatchObject({ kind: 'fault', message: expect.stringMatching(/reserved/) });
  });

  it('refuses nesting deeper than the limit', () => {
    const doc = read('81'.repeat(100) + '00');
    let item = doc.root!;
    let depth = 0;
    while (item.kind === 'array') {
      item = item.items[0];
      depth++;
    }
    expect(item).toMatchObject({ kind: 'fault', message: expect.stringMatching(/deep/) });
    expect(depth).toBe(MAX_DEPTH);
  });

  it('refuses a declared size larger than the input without allocating it', () => {
    expect(read('5bffffffffffffffff').root).toMatchObject({ kind: 'fault', message: expect.stringMatching(/truncated/) });
    expect(read('9bffffffffffffffff').root).toMatchObject({ kind: 'fault', message: expect.stringMatching(/truncated/) });
    expect(read('bbffffffffffffffff').root).toMatchObject({ kind: 'fault', message: expect.stringMatching(/truncated/) });
  });

  it('reads floats, simple values and negative integers', () => {
    expect(read('f93c00').root).toMatchObject({ kind: 'float', value: 1 });
    expect(read('fb3ff8000000000000').root).toMatchObject({ kind: 'float', value: 1.5 });
    expect(read('f4').root).toMatchObject({ kind: 'simple', value: false });
    expect(read('f6').root).toMatchObject({ kind: 'simple', value: null });
    expect(read('f7').root).toMatchObject({ kind: 'simple', value: undefined });
    expect(read('20').root).toMatchObject({ kind: 'nint', value: -1n });
    expect(read('3bffffffffffffffff').root).toMatchObject({ kind: 'nint', value: -18446744073709551616n });
  });

  it('marks text that is not UTF-8', () => {
    expect(read('61ff').root).toMatchObject({ kind: 'fault', message: expect.stringMatching(/UTF-8/) });
  });

  it('reads an empty input as no item', () => {
    expect(readCbor(new Uint8Array(0))).toEqual({ root: null, size: 0, trailing: 0 });
  });
});
