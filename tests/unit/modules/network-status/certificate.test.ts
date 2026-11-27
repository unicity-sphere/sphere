import { describe, it, expect } from 'vitest';
import { CborError, CborTag, decodeCbor } from '@/modules/network-status/cbor';
import { decodeSeal, hexToBytes } from '@/modules/network-status/certificate';
import liveBlock from './fixtures/get_block_testnet2.json';

/** A real `get_block` answer captured from gateway.testnet2.unicity.network (shard 000). */
const LIVE_UC = liveBlock.result.block.unicityCertificate;

describe('decodeCbor', () => {
  it('decodes the scalar and container types a unicity certificate uses', () => {
    // [1, -2, h'0aff', "ab", {"k": true}, null, 39001(0)]
    const bytes = hexToBytes('87' + '01' + '21' + '420aff' + '626162' + 'a1616bf5' + 'f6' + 'd9985900');
    const value = decodeCbor(bytes) as unknown[];
    expect(value[0]).toBe(1);
    expect(value[1]).toBe(-2);
    expect(Array.from(value[2] as Uint8Array)).toEqual([0x0a, 0xff]);
    expect(value[3]).toBe('ab');
    expect((value[4] as Map<unknown, unknown>).get('k')).toBe(true);
    expect(value[5]).toBeNull();
    expect(value[6]).toBeInstanceOf(CborTag);
    expect((value[6] as CborTag).tag).toBe(39001);
  });

  it('reads 64-bit integers exactly, as a bigint beyond the safe range', () => {
    expect(decodeCbor(hexToBytes('1b0000000100000000'))).toBe(4294967296);
    expect(decodeCbor(hexToBytes('1bffffffffffffffff'))).toBe(18446744073709551615n);
  });

  it('refuses truncated input instead of reading past the end', () => {
    expect(() => decodeCbor(hexToBytes('5a00000010aabb'))).toThrow(CborError);
    expect(() => decodeCbor(hexToBytes('83 01 02'.replace(/ /g, '')))).toThrow(CborError);
  });

  it('refuses indefinite-length items and trailing bytes', () => {
    expect(() => decodeCbor(hexToBytes('9f01ff'))).toThrow(CborError);
    expect(() => decodeCbor(hexToBytes('0101'))).toThrow(CborError);
  });

  it('refuses nesting deep enough to exhaust the stack', () => {
    expect(() => decodeCbor(hexToBytes('81'.repeat(200) + '01'))).toThrow(CborError);
  });
});

describe('decodeSeal', () => {
  it('reads the root round, seal time and signer set from a live testnet2 certificate', () => {
    expect(decodeSeal(LIVE_UC)).toEqual({
      rootRound: 24790909,
      certifiedAt: 1795511680,
      signers: [
        '16Uiu2HAm33LfAYP811b4fpW5x8qejmujuB1LFCXPGGTT6bumHrvy',
        '16Uiu2HAmFCiccNnmDEdcBiBq5Giz5VsEUzdcL8uDe2QPTjE3ZL3M',
        '16Uiu2HAmFzgCoCdKt8y7so3w5jfgxc2FCW8p1bffHzY3L6zqc8BC',
        '16Uiu2HAmU5T1TqKyKkUB3sitWb431hVFfp9nqvaLgVagQF6ywLFF',
      ],
    });
  });

  it('returns null, never throws, for anything that is not a certificate', () => {
    expect(decodeSeal('')).toBeNull();
    expect(decodeSeal('zz')).toBeNull();
    expect(decodeSeal('abc')).toBeNull();
    expect(decodeSeal('01')).toBeNull();
    // A truncated live certificate.
    expect(decodeSeal(LIVE_UC.slice(0, LIVE_UC.length - 40))).toBeNull();
    // The right tag around the wrong shape.
    expect(decodeSeal('d998598101')).toBeNull();
  });
});
