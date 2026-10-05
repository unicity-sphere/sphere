/** A token is worth sending only when something of it is left after the bridge service's per-token fee. */
export function coversReturnFee(amount: bigint, fee: bigint): boolean {
  return amount > fee;
}

/** The tokens that can be sent out at this fee; all of them while the fee is not known yet. */
export function tokensCoveringFee<T extends { readonly amount: string }>(tokens: readonly T[], fee: bigint | undefined): T[] {
  return tokens.filter((t) => fee === undefined || coversReturnFee(BigInt(t.amount || '0'), fee));
}
