/** What a per-token return fee does to a selection of tokens, in the asset's smallest unit. */
export interface ReturnFeeSummary {
  /** The fee over every selected token. */
  readonly total: bigint;
  /** What is released once the fee is taken from each token. */
  readonly received: bigint;
  /** Amounts of the tokens the fee would take whole; these cannot be sent out on their own. */
  readonly consumed: readonly bigint[];
}

export function summarizeReturnFee(fee: bigint, amounts: readonly bigint[]): ReturnFeeSummary {
  const total = fee * BigInt(amounts.length);
  const sent = amounts.reduce((sum, amount) => sum + amount, 0n);
  return { total, received: sent - total, consumed: amounts.filter((amount) => amount <= fee) };
}
