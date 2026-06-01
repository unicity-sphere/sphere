export const IS_UXF_BUILD = import.meta.env.VITE_UXF_BUILD === 'true';

export const UXF_MIGRATION_SKIP_KEY = 'sphere_uxf_migration_skipped';
export const UXF_MIGRATION_CHOICE_KEY = 'sphere_uxf_migration_choice';

export type UxfMigrationChoice = 'merge' | 'legacy-only' | 'uxf-only';

// ── Tombstone: detectStorageState() / LEGACY_DB_NAMES / UXF_DB_PATTERN ───
//
// REMOVED — issue #331.
//
// A shallow `indexedDB.databases()` name probe is the wrong shape for
// "is there material legacy / UXF data?". Both stores share the
// `sphere-storage` IndexedDB (the Profile local cache is also wired
// through `createIndexedDBStorageProvider()`), so once *any* wallet —
// legacy OR fresh Profile — has booted in the browser the legacy DB
// name is present and a pure name probe always answers
// `hasLegacy = true`. That made `UxfMigrationPrompt` fire on every
// reload for fresh Profile-only wallets.
//
// The canonical predicate lives in
// `src/sdk/utils/tokenStorageProbe.ts → hasMaterialContent`, surfaced
// to consumers as `SphereContext.hasLegacyData` /
// `SphereContext.hasProfileData`. Both `UxfBanner` and
// `UxfMigrationPrompt` route through it — do NOT reintroduce a
// name-based probe here.
