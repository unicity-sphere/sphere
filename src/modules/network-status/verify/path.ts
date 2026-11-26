import type { PathView } from './types';

const BITMAP_SIZE = 32;
const HASH_SIZE = 32;

/**
 * An `InclusionCertificate` wire form: a 32-byte bitmap, most significant bit
 * first, with one bit per tree depth where the path has a sibling, then those
 * siblings' 32-byte hashes in depth order.
 */
export function decodePath(bytes: Uint8Array): PathView {
  if (bytes.length < BITMAP_SIZE || (bytes.length - BITMAP_SIZE) % HASH_SIZE !== 0) {
    throw new Error('inclusion certificate has an invalid length');
  }
  const depths: number[] = [];
  for (let depth = 0; depth < BITMAP_SIZE * 8; depth++) {
    if (bytes[depth >> 3] & (0x80 >> (depth & 7))) depths.push(depth);
  }
  const siblings: string[] = [];
  for (let offset = BITMAP_SIZE; offset < bytes.length; offset += HASH_SIZE) {
    siblings.push(toHex(bytes.subarray(offset, offset + HASH_SIZE)));
  }
  if (siblings.length !== depths.length) {
    throw new Error(`inclusion certificate declares ${depths.length} siblings but carries ${siblings.length}`);
  }
  return { depths, siblings };
}

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}
