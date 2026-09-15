import { ERROR_CODES, nftContentFromWire } from '@unicitylabs/sphere-sdk/connect';
import { NFT_MAX_PAYLOAD_BYTES } from '@unicitylabs/sphere-sdk';
import type { NftContent } from '@unicitylabs/sphere-sdk';

/** A refusal to hand an intent to the UI at all: malformed, or not implemented. */
export interface IntentError {
  code: number;
  message: string;
}

/** A well-formed `mint_nft` intent's params, decoded into what `payments.mintNft` takes. */
export interface MintNftParams {
  content: NftContent;
  /** The dApp's `sign` with its default applied: only an explicit `false` mints unsigned. */
  sign: boolean;
}

/**
 * validateIntent's full answer: the refusal, or — for a well-formed `mint_nft` —
 * its decoded params. That content arrives as base64 of up to ~1 MB, so the
 * decode done to check it is handed on, and the caller never decodes it a second
 * time to preview or to mint.
 */
export type IntentCheck =
  | { error: IntentError; mintNft: null }
  | { error: null; mintNft: MintNftParams | null };

const COIN_ID_RE = /^([0-9a-f]{2})+$/;

const SUPPORTED_INTENTS = new Set(['send', 'payment_request', 'dm', 'sign_message', 'mint', 'mint_nft', 'receive']);

function refuse(code: number, message: string): IntentCheck {
  return { error: { code, message }, mintNft: null };
}

/**
 * Validate dApp-supplied intent params up front. Returns a structured error to
 * reject with (INVALID_PARAMS / METHOD_NOT_FOUND), or null when the intent is
 * supported and well-formed. `mint` does its own engine-specific validation in
 * its handler, so it is only checked for support here.
 */
export function validateIntent(action: string, params: Record<string, unknown>): IntentError | null {
  return checkIntent(action, params).error;
}

export function checkIntent(action: string, params: Record<string, unknown>): IntentCheck {
  if (!SUPPORTED_INTENTS.has(action)) {
    return refuse(ERROR_CODES.METHOD_NOT_FOUND, `Intent "${action}" is not supported by this wallet`);
  }
  // NOT gated on the network. Minting through a dApp is the USER's own authority
  // — their gateway subscription, their key, their asset ids — so it is a
  // permission question, and the permission machinery already answers it: the
  // `mint:request` scope plus an explicit approval, which is network-scoped, so
  // a dApp approved on testnet must be approved again before it mints on
  // mainnet. Sphere's own Top Up and Swap stay testnet-only for their own
  // reasons; that is a product decision about those features, not a statement
  // about what the network can do.
  //
  // `mint_nft` is the same authority under its own `nft:mint` scope, which no
  // other grant implies. Its content is the dApp's and is signed as the user by
  // default, so the handler shows every one and never offers auto-approval.
  if (action === 'mint_nft') return checkMintNft(params);
  const error = paramsError(action, params);
  return error ? { error, mintNft: null } : { error: null, mintNft: null };
}

type WireRecord = Record<string, unknown>;

function isWireRecord(value: unknown): value is WireRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A text field's size once UTF-8 encoded, counted without copying it. Counting UTF-16
 * code units instead would let multibyte text past the limit: 400,000 CJK characters
 * are 1.2 MB of UTF-8. A lone surrogate encodes as U+FFFD, three bytes. Stops counting
 * once over the limit — past it the exact figure no longer matters.
 */
function textBytes(value: unknown): number {
  if (typeof value !== 'string') return 0;
  // Every code unit takes at least one byte.
  if (value.length > NFT_MAX_PAYLOAD_BYTES) return value.length;
  let bytes = 0;
  for (let i = 0; i < value.length && bytes <= NFT_MAX_PAYLOAD_BYTES; i++) {
    const unit = value.charCodeAt(i);
    if (unit < 0x80) {
      bytes += 1;
    } else if (unit < 0x800) {
      bytes += 2;
    } else if (unit >= 0xd800 && unit <= 0xdbff && i + 1 < value.length) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4; // a surrogate pair: one code point beyond the BMP
        i++;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

/** What a hex field decodes to. */
function hexBytes(value: unknown): number {
  return typeof value === 'string' ? Math.floor(value.length / 2) : 0;
}

/** What base64 decodes to, from its length and its trailing padding alone. */
function base64Bytes(value: unknown): number {
  if (typeof value !== 'string') return 0;
  const n = value.length;
  const padding = n > 0 && value.charCodeAt(n - 1) === 0x3d ? (n > 1 && value.charCodeAt(n - 2) === 0x3d ? 2 : 1) : 0;
  return Math.max(0, Math.floor((n * 3) / 4) - padding);
}

function mediaRefBytes(ref: unknown): number {
  if (!isWireRecord(ref)) return 0;
  if (ref.kind === 'media') return textBytes(ref.media_type) + base64Bytes(ref.bytes);
  if (ref.kind === 'link') return textBytes(ref.media_type) + textBytes(ref.uri) + hexBytes(ref.sha256);
  return 0;
}

/**
 * A LOWER bound on the size of wire NFT content once encoded, read from the fields as
 * they are — text counted in UTF-8 bytes, base64 and hex by what they decode to,
 * nothing decoded or copied. The encoded payload is larger still
 * (CBOR framing, and the NftSigned wrapper when signed), so content over
 * NFT_MAX_PAYLOAD_BYTES by this count is over it for certain: `payments.mintNft`
 * would refuse it. Only the fields of the declared kind count, so a malformed shape
 * is left to nftContentFromWire, whose refusal names the offending field.
 */
function payloadLowerBound(content: unknown): number {
  if (!isWireRecord(content)) return 0;
  if (content.kind === 'media' || content.kind === 'link') return mediaRefBytes(content);
  if (content.kind !== 'metadata') return 0;
  let total =
    textBytes(content.name) +
    textBytes(content.description) +
    textBytes(content.external_url) +
    textBytes(content.collection) +
    hexBytes(content.collection_id) +
    mediaRefBytes(content.image) +
    mediaRefBytes(content.animation_url);
  if (Array.isArray(content.attributes)) {
    for (const attribute of content.attributes) {
      if (total > NFT_MAX_PAYLOAD_BYTES) break;
      if (!isWireRecord(attribute)) continue;
      // An attribute is at least a one-byte CBOR array header, besides its text.
      total += 1 + textBytes(attribute.trait_type) + textBytes(attribute.value);
    }
  }
  return total;
}

/**
 * Size first, then shape and base64. nftContentFromWire decodes base64 of any
 * length, and the preview then builds a Blob of it — all before the user has been
 * asked, for content `payments.mintNft` refuses only after approval — so content
 * over the payload limit is refused before anything is decoded. The other VALUE
 * rules — non-empty text, media types, URI schemes — stay with `payments.mintNft`,
 * whose refusal becomes the intent's error.
 */
function checkMintNft(params: Record<string, unknown>): IntentCheck {
  const sign = params.sign === undefined ? true : params.sign;
  if (typeof sign !== 'boolean') {
    return refuse(ERROR_CODES.INVALID_PARAMS, '"sign" must be a boolean when present');
  }
  if (payloadLowerBound(params.content) > NFT_MAX_PAYLOAD_BYTES) {
    return refuse(
      ERROR_CODES.INVALID_PARAMS,
      `NFT content exceeds the ${String(NFT_MAX_PAYLOAD_BYTES)}-byte payload limit (NFT_MAX_PAYLOAD_BYTES)`,
    );
  }
  try {
    // Throws a message naming the offending field, e.g. `Invalid NFT content.image.bytes: …`.
    return { error: null, mintNft: { content: nftContentFromWire(params.content), sign } };
  } catch (err) {
    return refuse(ERROR_CODES.INVALID_PARAMS, err instanceof Error ? err.message : 'Invalid NFT content');
  }
}

function paramsError(action: string, params: Record<string, unknown>): IntentError | null {
  if (action === 'send' || action === 'payment_request') {
    if (typeof params.to !== 'string' || params.to.trim() === '') {
      return { code: ERROR_CODES.INVALID_PARAMS, message: 'Missing or invalid "to"' };
    }
    // amount is in BASE UNITS (smallest indivisible unit) — a positive integer
    // string, exactly like the `mint` intent. Whole-token/decimal amounts are
    // rejected: every major wallet carries dApp-requested amounts in base units
    // (exactness, no float), and the dApp converts at its own UI edge.
    const amountStr = params.amount == null ? '' : String(params.amount).trim();
    if (!/^\d+$/.test(amountStr) || BigInt(amountStr) <= 0n) {
      return { code: ERROR_CODES.INVALID_PARAMS, message: 'amount must be a positive integer string in base units' };
    }
    if (typeof params.coinId !== 'string' || !COIN_ID_RE.test(params.coinId)) {
      return { code: ERROR_CODES.INVALID_PARAMS, message: 'coinId must be lowercase even-length hex' };
    }
    return null;
  }
  if (action === 'dm') {
    if (typeof params.to !== 'string' || params.to.trim() === '') {
      return { code: ERROR_CODES.INVALID_PARAMS, message: 'Missing or invalid "to"' };
    }
    if (typeof params.message !== 'string' || params.message === '') {
      return { code: ERROR_CODES.INVALID_PARAMS, message: 'Missing or invalid "message"' };
    }
    return null;
  }
  if (action === 'sign_message') {
    if (typeof params.message !== 'string' || params.message === '') {
      return { code: ERROR_CODES.INVALID_PARAMS, message: 'Missing or invalid "message"' };
    }
    return null;
  }
  return null;
}
