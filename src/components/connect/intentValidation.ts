import { ERROR_CODES } from '@unicitylabs/sphere-sdk/connect';

/** A refusal to hand an intent to the UI at all: malformed, or not implemented. */
export interface IntentError {
  code: number;
  message: string;
}

const COIN_ID_RE = /^([0-9a-f]{2})+$/;

const SUPPORTED_INTENTS = new Set(['send', 'payment_request', 'dm', 'sign_message', 'mint', 'receive']);

/**
 * Validate dApp-supplied intent params up front. Returns a structured error to
 * reject with (INVALID_PARAMS / METHOD_NOT_FOUND), or null when the intent is
 * supported and well-formed. `mint` does its own engine-specific validation in
 * its handler, so it is only checked for support here.
 */
export function validateIntent(action: string, params: Record<string, unknown>): IntentError | null {
  if (!SUPPORTED_INTENTS.has(action)) {
    return {
      code: ERROR_CODES.METHOD_NOT_FOUND,
      message: `Intent "${action}" is not supported by this wallet`,
    };
  }
  // NOT gated on the network. Minting through a dApp is the USER's own authority
  // — their gateway subscription, their key, their asset ids — so it is a
  // permission question, and the permission machinery already answers it: the
  // `mint:request` scope plus an explicit approval, which is network-scoped, so
  // a dApp approved on testnet must be approved again before it mints on
  // mainnet. Sphere's own Top Up and Swap stay testnet-only for their own
  // reasons; that is a product decision about those features, not a statement
  // about what the network can do.
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
