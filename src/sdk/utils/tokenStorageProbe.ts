/**
 * Token-storage data-presence probe — shared helper.
 *
 * This module exports {@link hasMaterialContent}, the canonical
 * "does this `TokenStorageProvider.load()` snapshot contain
 * user-meaningful data?" predicate used by:
 *
 *   - `uxfProfileMigration.runProfileMigration` — to skip the
 *     overwrite-style migration when Profile target already holds tokens
 *     (fresh-wallet path, see `uxfProfileMigration.ts` docstring).
 *   - `SphereProvider` boot-time probes — to populate the
 *     `hasLegacyData` / `hasProfileData` flags on `SphereContext` so
 *     the `UxfBanner` mode-switcher can render the correct buttons.
 *
 * Why a shared helper rather than two copies: the two callers MUST agree
 * on what counts as "material" content. The migration-overwrite guard
 * being stricter or laxer than the banner-probe would silently produce a
 * UI/data mismatch — e.g. the banner says "no data in Profile" while the
 * migration guard says "Profile has data, skipping". This file is the
 * single source of truth.
 *
 * Mirrors {@link TXF_RESERVED_COLLECTIONS} from the sphere-sdk
 * `types/txf.ts` RESERVED_KEYS set, intentionally excluding `_meta`
 * because every load() returns a `_meta` block even when no tokens have
 * ever been written.
 */

/**
 * Reserved structural keys in `TxfStorageDataBase` (see sphere-sdk
 * types/txf.ts RESERVED_KEYS). `_meta` is omitted on purpose — it is
 * always present (the helper synthesizes it) and never indicates the
 * presence of user token data.
 */
export const TXF_RESERVED_COLLECTIONS = new Set<string>([
  '_nametag',
  '_nametags',
  '_tombstones',
  '_invalidatedNametags',
  '_outbox',
  '_mintOutbox',
  '_sent',
  '_invalid',
  '_integrity',
  '_history',
  '_audit',
  '_finalizationQueue',
]);

/**
 * Returns `true` if the loaded snapshot contains any user-meaningful
 * data — active tokens (`_<hexTokenId>`), archived tokens
 * (`archived-<tokenId>`), forks (`_forked_<tokenId>_<state>`), OR any
 * reserved collection with non-empty contents.
 *
 * `_meta` alone is NOT material content (the helper always emits it
 * even when migrating an empty wallet, and Profile providers emit it
 * on every load() call).
 */
export function hasMaterialContent(data: Record<string, unknown>): boolean {
  for (const key of Object.keys(data)) {
    if (key === '_meta') continue;
    const v = data[key];
    if (v === undefined || v === null) continue;
    if (TXF_RESERVED_COLLECTIONS.has(key)) {
      // Reserved collections are arrays/objects — check non-empty.
      if (Array.isArray(v) && v.length > 0) return true;
      if (!Array.isArray(v) && typeof v === 'object' && Object.keys(v as object).length > 0) {
        return true;
      }
      continue;
    }
    // Anything else (token keys `_<hex>`, archived `archived-…`,
    // forks `_forked_…`) is a token-shaped entry — its presence is
    // material content.
    return true;
  }
  return false;
}
