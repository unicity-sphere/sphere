import type { NetworkType } from '@unicitylabs/sphere-sdk';
import { STORAGE_KEYS } from '../config/storageKeys';
import { SPHERE_NETWORK } from '../config/network';

// ---------------------------------------------------------------------------
// "Do not ask again" for the Connect network-switch prompt
// ---------------------------------------------------------------------------

/**
 * An origin the user has no relationship with can raise the "this app runs on
 * testnet2, your wallet is on mainnet, switch?" prompt just by connecting. A
 * prompt anyone can raise needs a way for the user to make it stop; this is it.
 *
 * NOT part of the Connect approval store (`connected-sites.ts`), and it must
 * never become part of it. The two say opposite things: an approval is consent
 * to act, this is a refusal to be asked. Sharing a key or an entry shape would
 * leave one bug — a wrong field read, a wrong migration — between "the user
 * pushed this origin away" and "this origin is approved". So it has its own
 * storage key, its own entry shape, and no code path here reads or writes the
 * approval key (nor the other way round). The `sphere_` prefix on the key means
 * `clearAllSphereData()` wipes it with the wallet.
 *
 * Scoped on two axes besides the origin:
 *  - the ACTIVE network, like approvals (#497 item 1): a decision about one
 *    network says nothing about another. "Stop asking me about this app" made
 *    on testnet2 is not made on mainnet.
 *  - the TARGET being offered: muting "switch me to mainnet" for a site does
 *    not mute "switch me to testnet2" for it.
 *
 * Every failure reads as "not suppressed", i.e. the user is asked again. That is
 * the direction a refusal should fail: the prompt is an invitation the user can
 * always decline, whereas a phantom "never ask" would hide it for good.
 */
interface SuppressedTarget {
  /** When the user muted this target (epoch ms). */
  at: number;
}

interface SuppressedOriginEntry {
  targets: Record<string, SuppressedTarget>;
}

interface SuppressionStore {
  v: 1;
  byNetwork: Record<string, Record<string, SuppressedOriginEntry>>;
}

/** Arrays and primitives are not usable as a key->value map. */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * A dictionary with no prototype. Origins come from dApps and targets from the
 * persisted value; on a plain `{}`, `dict['__proto__'] = x` re-parents the
 * object instead of storing a key, and `dict['constructor']` reads a function.
 * Either would make the record disagree with what was stored.
 */
function dict<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

/** Keep only well-formed `{ at: <finite number> }` targets. */
function sanitizeTargets(raw: unknown): Record<string, SuppressedTarget> {
  const out = dict<SuppressedTarget>();
  if (!isPlainObject(raw)) return out;
  for (const [target, entry] of Object.entries(raw)) {
    if (isPlainObject(entry) && typeof entry.at === 'number' && Number.isFinite(entry.at)) {
      out[target] = { at: entry.at };
    }
  }
  return out;
}

/**
 * A per-network bucket that is not a plain object cannot hold anything, and
 * writing through one throws (`bucket[origin] = ...` on a primitive is a
 * TypeError under ESM strict mode). Returns null for those so the caller drops
 * ONLY the unusable bucket — a corrupt mainnet bucket must not cost the user
 * their testnet2 record. Inside a usable bucket, an origin with no valid target
 * left is dropped too, so `getSuppressedOrigins()` never lists an empty origin.
 */
function sanitizeBucket(raw: unknown): Record<string, SuppressedOriginEntry> | null {
  if (!isPlainObject(raw)) return null;
  const out = dict<SuppressedOriginEntry>();
  for (const [origin, entry] of Object.entries(raw)) {
    if (!isPlainObject(entry)) continue;
    const targets = sanitizeTargets(entry.targets);
    if (Object.keys(targets).length > 0) out[origin] = { targets };
  }
  return out;
}

function emptyStore(): SuppressionStore {
  return { v: 1, byNetwork: dict() };
}

function readStore(): SuppressionStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NETWORK_SWITCH_SUPPRESSED);
    if (!raw) return emptyStore();
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed) || parsed.v !== 1 || !isPlainObject(parsed.byNetwork)) {
      return emptyStore();
    }
    const byNetwork = dict<Record<string, SuppressedOriginEntry>>();
    for (const [network, bucket] of Object.entries(parsed.byNetwork)) {
      const clean = sanitizeBucket(bucket);
      if (clean) byNetwork[network] = clean;
    }
    return { v: 1, byNetwork };
  } catch {
    // Blocked storage (the localStorage getter itself throws), or unparseable JSON.
    return emptyStore();
  }
}

function writeStore(store: SuppressionStore): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NETWORK_SWITCH_SUPPRESSED, JSON.stringify(store));
  } catch { /* ignore — the user is simply asked again */ }
}

// ---------------------------------------------------------------------------
// Public API (synchronous — localStorage)
// ---------------------------------------------------------------------------

/** Has the user muted offering `target` to `origin`, on the ACTIVE network? */
export function isSwitchPromptSuppressed(origin: string, target: NetworkType): boolean {
  return readStore().byNetwork[SPHERE_NETWORK]?.[origin]?.targets[target] !== undefined;
}

/**
 * Mute offering `target` to `origin`, on the ACTIVE network. Idempotent: muting
 * again keeps the original timestamp. Best-effort — if storage is blocked or
 * full nothing is saved and the user is asked again next time.
 */
export function suppressSwitchPrompt(origin: string, target: NetworkType): void {
  const store = readStore();
  const forNetwork = store.byNetwork[SPHERE_NETWORK] ?? dict<SuppressedOriginEntry>();
  const entry = forNetwork[origin] ?? { targets: dict<SuppressedTarget>() };
  if (entry.targets[target] !== undefined) return;
  entry.targets[target] = { at: Date.now() };
  forNetwork[origin] = entry;
  store.byNetwork[SPHERE_NETWORK] = forNetwork;
  writeStore(store);
}

/**
 * Forget every muted target of `origin` on the ACTIVE network, so it may be
 * offered a switch again. Other origins and other networks are untouched.
 */
export function clearSwitchPromptSuppression(origin: string): void {
  const store = readStore();
  const forNetwork = store.byNetwork[SPHERE_NETWORK];
  if (!forNetwork?.[origin]) return;
  delete forNetwork[origin];
  writeStore(store);
}

/** origin -> muted targets, on the ACTIVE network. */
export function getSuppressedOrigins(): Record<string, string[]> {
  const forNetwork = readStore().byNetwork[SPHERE_NETWORK] ?? {};
  return Object.fromEntries(
    Object.entries(forNetwork).map(([origin, entry]) => [origin, Object.keys(entry.targets)]),
  );
}
