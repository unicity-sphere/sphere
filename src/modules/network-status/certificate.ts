import { CborTag, decodeCbor, type CborValue } from './cbor';
import type { SealInfo } from './types';

/** bft-go-base CBOR tags: `UnicityCertificate` and `UnicitySeal`. */
const UNICITY_CERTIFICATE_TAG = 39001;
const UNICITY_SEAL_TAG = 39005;

/** `UnicityCertificate` array: [version, inputRecord, trHash, shardConfHash, shardTreeCert, unicityTreeCert, unicitySeal]. */
const SEAL_INDEX = 6;
/** `UnicitySeal` array: [version, networkId, rootChainRoundNumber, epoch, timestamp, previousHash, hash, signatures]. */
const SEAL_ROOT_ROUND = 2;
const SEAL_TIMESTAMP = 4;
const SEAL_SIGNATURES = 7;

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error('not a hex string');
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * Reads the seal out of a block's hex `unicityCertificate`. Display data only:
 * this does NOT verify the signatures, and it returns `null` (never throws) for
 * anything it cannot read, so one odd certificate can never break the page.
 */
export function decodeSeal(certificateHex: string): SealInfo | null {
  try {
    const certificate = untag(decodeCbor(hexToBytes(certificateHex)), UNICITY_CERTIFICATE_TAG);
    if (!Array.isArray(certificate)) return null;
    const seal = untag(certificate[SEAL_INDEX], UNICITY_SEAL_TAG);
    if (!Array.isArray(seal)) return null;

    const rootRound = seal[SEAL_ROOT_ROUND];
    const certifiedAt = seal[SEAL_TIMESTAMP];
    const signatures = seal[SEAL_SIGNATURES];
    if (!isCount(rootRound) || !isCount(certifiedAt) || !(signatures instanceof Map)) return null;

    const signers: string[] = [];
    for (const key of signatures.keys()) {
      if (typeof key !== 'string') return null;
      signers.push(key);
    }
    signers.sort();
    return { rootRound, certifiedAt, signers };
  } catch {
    return null;
  }
}

function untag(value: CborValue, tag: number): CborValue | undefined {
  return value instanceof CborTag && value.tag === tag ? value.value : undefined;
}

function isCount(value: CborValue | undefined): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
