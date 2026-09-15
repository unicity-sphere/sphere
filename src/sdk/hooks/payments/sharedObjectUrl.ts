/**
 * Object URLs for NFT media bytes: one per (bytes, media type), however many views
 * show them (#785). Every row showing a collection's shared image watches the same
 * cached bytes, and a URL per row would hold one Blob copy of them — up to
 * MAX_LINKED_MEDIA_BYTES — per row. Keyed by the array itself: a query hands the same
 * array to everything watching it, and an array nothing shows any more can be
 * collected.
 */

interface Entry {
  readonly url: string;
  refs: number;
}

const entries = new WeakMap<Uint8Array, Map<string, Entry>>();

/** A `blob:` URL of `bytes` as `type`, kept until every acquire of it is released. */
export function acquireObjectUrl(bytes: Uint8Array, type: string): string {
  let byType = entries.get(bytes);
  if (!byType) {
    byType = new Map();
    entries.set(bytes, byType);
  }
  let entry = byType.get(type);
  if (!entry) {
    entry = { url: URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type })), refs: 0 };
    byType.set(type, entry);
  }
  entry.refs += 1;
  return entry.url;
}

/** Gives back one acquire of `bytes` as `type`; the URL is revoked once none is left. */
export function releaseObjectUrl(bytes: Uint8Array, type: string): void {
  const byType = entries.get(bytes);
  const entry = byType?.get(type);
  if (!byType || !entry) return;
  entry.refs -= 1;
  if (entry.refs > 0) return;
  byType.delete(type);
  if (byType.size === 0) entries.delete(bytes);
  URL.revokeObjectURL(entry.url);
}
