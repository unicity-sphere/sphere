/**
 * Display/validation helpers for user-facing identifiers.
 * Issue #411: the UI shows @nametag or chain pubkey — the DIRECT:// address
 * is visible only in Settings > My Public Keys.
 */

/** 33-byte compressed secp256k1 pubkey in hex: 02/03 prefix + 64 hex chars. */
export function isChainPubkey(value: string): boolean {
  return /^0[23][0-9a-fA-F]{64}$/.test(value.trim());
}

/** Middle-truncate an identifier MetaMask-style: "02ab12...9f01" (6 leading + 4 trailing). */
export function truncateId(value: string, startLen = 6, endLen = 4): string {
  if (value.length <= startLen + endLen + 3) return value;
  return `${value.slice(0, startLen)}...${value.slice(-endLen)}`;
}

/** Strip the DIRECT:// scheme for last-resort display of legacy stored values. */
export function stripDirectScheme(value: string): string {
  return value.replace(/^DIRECT:\/\//, '');
}
