export const IS_UXF_BUILD = import.meta.env.VITE_UXF_BUILD === 'true';

export const UXF_MIGRATION_SKIP_KEY = 'sphere_uxf_migration_skipped';
export const UXF_MIGRATION_CHOICE_KEY = 'sphere_uxf_migration_choice';

export type UxfMigrationChoice = 'merge' | 'legacy-only' | 'uxf-only';

// Known legacy IndexedDB database names (pre-UXF schema)
export const LEGACY_DB_NAMES = ['sphere-storage'] as const;
// UXF OrbitDB uses a different storage key pattern
export const UXF_DB_PATTERN = /^orbitdb/i;

export async function detectStorageState(): Promise<{
  hasLegacy: boolean;
  hasUxf: boolean;
}> {
  if (!('databases' in indexedDB)) {
    // Firefox <126 doesn't support indexedDB.databases()
    return { hasLegacy: false, hasUxf: false };
  }
  try {
    const dbs = await indexedDB.databases();
    const names = dbs.map(d => d.name ?? '');
    const hasLegacy = names.some(n => LEGACY_DB_NAMES.includes(n as typeof LEGACY_DB_NAMES[number]));
    const hasUxf = names.some(n => UXF_DB_PATTERN.test(n));
    return { hasLegacy, hasUxf };
  } catch {
    return { hasLegacy: false, hasUxf: false };
  }
}
