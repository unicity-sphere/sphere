import { ERROR_CODES, nftContentFromWire } from '@unicitylabs/sphere-sdk/connect';
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

/**
 * Shape and base64 only. The VALUE rules — non-empty text, media types, URI
 * schemes, the payload cap — stay with `payments.mintNft`, whose refusal becomes
 * the intent's error.
 */
function checkMintNft(params: Record<string, unknown>): IntentCheck {
  const sign = params.sign === undefined ? true : params.sign;
  if (typeof sign !== 'boolean') {
    return refuse(ERROR_CODES.INVALID_PARAMS, '"sign" must be a boolean when present');
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
