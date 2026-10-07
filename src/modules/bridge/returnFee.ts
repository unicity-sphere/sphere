/** A token is worth sending only when something of it is left after the bridge service's per-token fee. */
export function coversReturnFee(amount: bigint, fee: bigint): boolean {
  return amount > fee;
}

/** The tokens that can be sent out at this fee; all of them while the fee is not known yet. */
export function tokensCoveringFee<T extends { readonly amount: string }>(tokens: readonly T[], fee: bigint | undefined): T[] {
  return tokens.filter((t) => fee === undefined || coversReturnFee(BigInt(t.amount || '0'), fee));
}

/** The return service could not be asked what it charges, so no burn can be made. */
export class ReturnServiceUnreachable extends Error {
  constructor(cause: Error) {
    super(`The bridge service did not respond: ${cause.message}`, { cause });
    this.name = 'ReturnServiceUnreachable';
  }
}
