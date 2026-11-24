/**
 * A minimal, strict CBOR (RFC 8949) decoder — just enough to read a unicity
 * certificate's seal in the browser without pulling the state-transition SDK
 * into the page bundle.
 *
 * Strict on purpose: the input comes from the network, so every length is
 * bounds-checked, nesting is capped, indefinite-length items and trailing bytes
 * are refused. Anything it cannot read exactly throws `CborError`.
 */

export class CborError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CborError';
  }
}

export class CborTag {
  readonly tag: number;
  readonly value: CborValue;

  constructor(tag: number, value: CborValue) {
    this.tag = tag;
    this.value = value;
  }
}

export type CborValue =
  | number
  | bigint
  | string
  | boolean
  | null
  | undefined
  | Uint8Array
  | CborValue[]
  | Map<CborValue, CborValue>
  | CborTag;

const MAX_DEPTH = 64;
const textDecoder = new TextDecoder('utf-8', { fatal: true });

export function decodeCbor(bytes: Uint8Array): CborValue {
  const reader = new Reader(bytes);
  const value = reader.item(0);
  if (reader.offset !== bytes.length) {
    throw new CborError(`trailing bytes after item (${bytes.length - reader.offset})`);
  }
  return value;
}

class Reader {
  offset = 0;
  private readonly bytes: Uint8Array;
  private readonly view: DataView;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  item(depth: number): CborValue {
    if (depth > MAX_DEPTH) throw new CborError('nesting too deep');
    const initial = this.u8();
    const major = initial >> 5;
    const info = initial & 0x1f;

    if (major === 7) return this.simple(info);

    const argument = this.argument(info);
    switch (major) {
      case 0:
        return argument;
      case 1:
        return typeof argument === 'bigint' ? -1n - argument : -1 - argument;
      case 2:
        return this.take(this.length(argument)).slice();
      case 3:
        try {
          return textDecoder.decode(this.take(this.length(argument)));
        } catch {
          throw new CborError('invalid UTF-8 in text string');
        }
      case 4: {
        const count = this.length(argument);
        const out: CborValue[] = [];
        for (let i = 0; i < count; i++) out.push(this.item(depth + 1));
        return out;
      }
      case 5: {
        const count = this.length(argument);
        const out = new Map<CborValue, CborValue>();
        for (let i = 0; i < count; i++) {
          const key = this.item(depth + 1);
          out.set(key, this.item(depth + 1));
        }
        return out;
      }
      case 6:
        if (typeof argument === 'bigint') throw new CborError('tag number out of range');
        return new CborTag(argument, this.item(depth + 1));
      default:
        throw new CborError(`unknown major type ${major}`);
    }
  }

  private argument(info: number): number | bigint {
    if (info < 24) return info;
    switch (info) {
      case 24:
        return this.u8();
      case 25:
        return this.read(2, () => this.view.getUint16(this.offset));
      case 26:
        return this.read(4, () => this.view.getUint32(this.offset));
      case 27: {
        const big = this.read(8, () => this.view.getBigUint64(this.offset));
        return big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big;
      }
      case 31:
        throw new CborError('indefinite-length items are not supported');
      default:
        throw new CborError(`reserved additional info ${info}`);
    }
  }

  private simple(info: number): CborValue {
    switch (info) {
      case 20:
        return false;
      case 21:
        return true;
      case 22:
        return null;
      case 23:
        return undefined;
      case 25:
        return this.read(2, () => decodeHalf(this.view.getUint16(this.offset)));
      case 26:
        return this.read(4, () => this.view.getFloat32(this.offset));
      case 27:
        return this.read(8, () => this.view.getFloat64(this.offset));
      case 31:
        throw new CborError('unexpected break');
      default:
        throw new CborError(`unsupported simple value ${info}`);
    }
  }

  /** A container or string length: must fit both a JS number and the bytes left. */
  private length(argument: number | bigint): number {
    if (typeof argument === 'bigint' || argument > this.bytes.length - this.offset) {
      throw new CborError('length exceeds input');
    }
    return argument;
  }

  private u8(): number {
    return this.read(1, () => this.view.getUint8(this.offset));
  }

  private take(length: number): Uint8Array {
    this.ensure(length);
    const out = this.bytes.subarray(this.offset, this.offset + length);
    this.offset += length;
    return out;
  }

  private read<T>(width: number, get: () => T): T {
    this.ensure(width);
    const value = get();
    this.offset += width;
    return value;
  }

  private ensure(width: number): void {
    if (this.offset + width > this.bytes.length) throw new CborError('unexpected end of input');
  }
}

function decodeHalf(half: number): number {
  const sign = half & 0x8000 ? -1 : 1;
  const exponent = (half >> 10) & 0x1f;
  const fraction = half & 0x3ff;
  if (exponent === 0) return sign * 2 ** -14 * (fraction / 1024);
  if (exponent === 0x1f) return fraction ? NaN : sign * Infinity;
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}
