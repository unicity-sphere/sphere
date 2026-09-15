import { verifyNftLinkContent } from '@unicitylabs/sphere-sdk';
import type { NftLink } from '@unicitylabs/sphere-sdk';

/**
 * What fetching a link came to. `unavailable` is every answer that leaves no
 * file to check: an HTTP error, a file over the size cap, a body that broke off.
 */
export type LinkedFile =
  | { verified: true; bytes: Uint8Array }
  | { verified: false; reason: 'mismatch' | 'unavailable' };

const UNAVAILABLE: LinkedFile = { verified: false, reason: 'unavailable' };

function tooLarge(maxBytes: number): Error {
  return new Error(`Linked file exceeds ${String(maxBytes)} bytes`);
}

// Counts bytes as they arrive: a missing or lying content-length must not be
// able to make the wallet buffer an arbitrarily large file.
async function readCapped(res: Response, maxBytes: number): Promise<Uint8Array> {
  if (!res.body) {
    const whole = new Uint8Array(await res.arrayBuffer());
    if (whole.byteLength > maxBytes) throw tooLarge(maxBytes);
    return whole;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      reader.cancel().catch(() => {});
      throw tooLarge(maxBytes);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * The one fetch policy for everything an NFT links to (#785) — media files and
 * metadata documents alike: the file at `url`, at most `maxBytes`, returned
 * only once its bytes hash to the link's sha256.
 */
export async function fetchLinkedFile(
  link: NftLink,
  url: string,
  maxBytes: number,
  signal: AbortSignal,
): Promise<LinkedFile> {
  // No cookies and no referrer: the host of an attacker-chosen link learns
  // nothing about which wallet is looking. This throws only when the host never
  // answered — nothing was downloaded, so a later view may ask again.
  const res = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'force-cache', signal });
  // Once the host has answered, its answer is the outcome: returned, not thrown,
  // so it is cached like a match. A thrown refusal would be retried, and fetched
  // again by every remount and every other view of the link — each time costing
  // up to the size cap, from a host the NFT's sender chose.
  try {
    if (!res.ok || Number(res.headers.get('content-length')) > maxBytes) {
      res.body?.cancel().catch(() => {});
      return UNAVAILABLE;
    }
    const bytes = await readCapped(res, maxBytes);
    return verifyNftLinkContent(link, bytes) ? { verified: true, bytes } : { verified: false, reason: 'mismatch' };
  } catch (err) {
    // Cancelled because nothing shows the link any more: that says nothing about the file.
    if (signal.aborted) throw err;
    return UNAVAILABLE;
  }
}
