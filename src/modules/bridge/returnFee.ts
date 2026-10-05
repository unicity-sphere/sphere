/** What a per-token return fee takes from the tokens sent out, in the asset's smallest unit. */
export interface ReturnFeeSummary {
  /** The fee over every token that is sent. */
  readonly total: bigint;
  /** What is released once the fee is taken from each of them. */
  readonly received: bigint;
}

/** A token is worth sending only when something of it is left after the fee. */
export function coversReturnFee(amount: bigint, fee: bigint): boolean {
  return amount > fee;
}

/** The tokens that can be sent out at this fee; all of them while the fee is not known yet. */
export function tokensCoveringFee<T extends { readonly amount: string }>(tokens: readonly T[], fee: bigint | undefined): T[] {
  return tokens.filter((t) => fee === undefined || coversReturnFee(BigInt(t.amount || '0'), fee));
}

/** Counts only the tokens that cover the fee: a smaller one is never sent, so it pays nothing and releases nothing. */
export function summarizeReturnFee(fee: bigint, amounts: readonly bigint[]): ReturnFeeSummary {
  const sent = amounts.filter((amount) => coversReturnFee(amount, fee));
  const total = fee * BigInt(sent.length);
  return { total, received: sent.reduce((sum, amount) => sum + amount, 0n) - total };
}
