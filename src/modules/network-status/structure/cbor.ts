/**
 * A CBOR reader for looking at bytes, not for trusting them: every item keeps its byte
 * offset and length, and any defect (truncation, an unsupported header, bad UTF-8, nesting
 * past the limit) becomes a `fault` item in place, so whatever was read before it is still
 * shown. It never throws and never allocates by a declared size.
 */

interface At {
  readonly offset: number;
  /** Header plus content, in bytes. */
  readonly length: number;
}

export type CborItem = At &
  (
    | { readonly kind: 'uint' | 'nint'; readonly value: bigint }
    | { readonly kind: 'bytes'; readonly value: Uint8Array }
    | { readonly kind: 'text'; readonly value: string }
    /** `declared` is the count in the header; fewer items were read when the input ended first. */
    | { readonly kind: 'array'; readonly declared: bigint; readonly items: readonly CborItem[] }
    | { readonly kind: 'map'; readonly declared: bigint; readonly entries: readonly { readonly key: CborItem; readonly value: CborItem }[] }
    | { readonly kind: 'tag'; readonly tag: bigint; readonly item: CborItem }
    | { readonly kind: 'simple'; readonly value: boolean | null | undefined | number }
    | { readonly kind: 'float'; readonly value: number }
    | { readonly kind: 'fault'; readonly message: string }
  );

export interface CborDocument {
  readonly root: CborItem | null;
  readonly size: number;
  /** Bytes after the top-level item; 0 when reading stopped at a fault. */
  readonly trailing: number;
}

/** Containers nested deeper than this are not read. */
export const MAX_DEPTH = 32;

const utf8 = new TextDecoder('utf-8', { fatal: true });

export function readCbor(bytes: Uint8Array): CborDocument {
  if (bytes.length === 0) return { root: null, size: 0, trailing: 0 };
  const reader = new Reader(bytes);
  const root = reader.item(0);
  return { root, size: bytes.length, trailing: reader.stopped ? 0 : bytes.length - root.length };
}

class Reader {
  private pos = 0;
  /** Set by the first fault: nothing after it can be located, so reading ends there. */
  stopped = false;
  private readonly bytes: Uint8Array;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  item(depth: number): CborItem {
    const offset = this.pos;
    if (depth >= MAX_DEPTH) return this.fault(offset, `nested too deep (more than ${MAX_DEPTH} levels)`);
    if (offset >= this.bytes.length) return this.fault(offset, 'truncated: input ends before this item');

    const initial = this.bytes[this.pos++];
    const major = initial >> 5;
    const info = initial & 0x1f;

    if (major === 7) return this.simple(offset, info);
    if (info === 31) {
      return this.fault(offset, major >= 2 && major <= 5 ? 'indefinite length is not supported' : 'malformed header');
    }
    const argument = this.argument(info);
    if (typeof argument === 'string') return this.fault(offset, argument);

    switch (major) {
      case 0:
        return { kind: 'uint', value: argument, offset, length: this.pos - offset };
      case 1:
        return { kind: 'nint', value: -1n - argument, offset, length: this.pos - offset };
      case 2:
      case 3: {
        const left = this.bytes.length - this.pos;
        if (argument > BigInt(left)) return this.fault(offset, `truncated: needs ${argument} bytes, ${left} left`);
        const content = this.bytes.slice(this.pos, this.pos + Number(argument));
        this.pos += content.length;
        if (major === 2) return { kind: 'bytes', value: content, offset, length: this.pos - offset };
        try {
          return { kind: 'text', value: utf8.decode(content), offset, length: this.pos - offset };
        } catch {
          return this.fault(offset, 'text is not valid UTF-8');
        }
      }
      case 4: {
        // Bounded by the input, not the declared count: every item reads at least one byte,
        // and the end of the input is a fault, which stops the loop.
        const items: CborItem[] = [];
        for (let i = 0n; i < argument && !this.stopped; i++) items.push(this.item(depth + 1));
        return { kind: 'array', declared: argument, items, offset, length: this.end(offset) };
      }
      case 5: {
        const entries: { key: CborItem; value: CborItem }[] = [];
        for (let i = 0n; i < argument && !this.stopped; i++) {
          const key = this.item(depth + 1);
          if (this.stopped) {
            entries.push({ key, value: { kind: 'fault', message: 'no value: reading stopped at the key', offset: this.bytes.length, length: 0 } });
            break;
          }
          entries.push({ key, value: this.item(depth + 1) });
        }
        return { kind: 'map', declared: argument, entries, offset, length: this.end(offset) };
      }
      default: {
        const item = this.item(depth + 1);
        return { kind: 'tag', tag: argument, item, offset, length: this.end(offset) };
      }
    }
  }

  /** The header's argument, or why it cannot be read. */
  private argument(info: number): bigint | string {
    if (info < 24) return BigInt(info);
    if (info > 27) return 'reserved header value';
    const size = 1 << (info - 24);
    if (this.pos + size > this.bytes.length) return `truncated: header needs ${size} more bytes`;
    let value = 0n;
    for (let i = 0; i < size; i++) value = (value << 8n) | BigInt(this.bytes[this.pos++]);
    return value;
  }

  private simple(offset: number, info: number): CborItem {
    const at = (length: number) => ({ offset, length });
    if (info < 20) return { kind: 'simple', value: info, ...at(1) };
    if (info === 20) return { kind: 'simple', value: false, ...at(1) };
    if (info === 21) return { kind: 'simple', value: true, ...at(1) };
    if (info === 22) return { kind: 'simple', value: null, ...at(1) };
    if (info === 23) return { kind: 'simple', value: undefined, ...at(1) };
    if (info === 31) return this.fault(offset, 'unexpected break');
    if (info > 27) return this.fault(offset, 'reserved header value');
    const size = 1 << (info - 24);
    if (this.pos + size > this.bytes.length) return this.fault(offset, `truncated: needs ${size} more bytes`);
    const view = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.pos, size);
    this.pos += size;
    if (info === 24) return { kind: 'simple', value: view.getUint8(0), ...at(2) };
    const value = info === 25 ? half(view.getUint16(0)) : info === 26 ? view.getFloat32(0) : view.getFloat64(0);
    return { kind: 'float', value, ...at(1 + size) };
  }

  private fault(offset: number, message: string): CborItem {
    this.stopped = true;
    this.pos = this.bytes.length;
    return { kind: 'fault', message, offset, length: this.bytes.length - offset };
  }

  private end(offset: number): number {
    return this.pos - offset;
  }
}

function half(bits: number): number {
  const sign = bits & 0x8000 ? -1 : 1;
  const exponent = (bits >> 10) & 0x1f;
  const fraction = bits & 0x3ff;
  if (exponent === 0) return sign * 2 ** -14 * (fraction / 1024);
  if (exponent === 31) return fraction ? NaN : sign * Infinity;
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}
