/**
 * Builds the onboarding wallet-backup file (#450).
 *
 * The old flow wrote `exportToJSON({ includeMnemonic: true })` with no password
 * — a cleartext recovery phrase — into a file named after the user's public
 * handle (`@alice.json`), which is both unencrypted and trivially identifiable.
 *
 * This returns a generic filename (never the handle) and threads an OPTIONAL
 * encryption password to `exportToJSON` (mirroring the in-wallet "Save Wallet").
 * An empty password means plaintext (password omitted, not passed as '').
 */
export interface BackupSphere {
  exportToJSON(opts: { includeMnemonic: boolean; password?: string }): unknown;
}

export function buildWalletBackup(
  sphere: BackupSphere,
  password?: string,
): { fileName: string; json: unknown; encrypted: boolean } {
  const json = sphere.exportToJSON({
    includeMnemonic: true,
    password: password ? password : undefined,
  });
  return {
    fileName: 'sphere-wallet-recovery.json',
    json,
    encrypted: !!password,
  };
}
