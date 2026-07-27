/**
 * Atomic-safe wallet creation for the onboarding "create" flow (#448).
 *
 * Creating a wallet WITH a nametag in one shot publishes the first-write-wins
 * Nostr binding inside `Sphere.init`. If a later step throws, `createWallet`'s
 * cleanup wipes the only key that owns the binding — the nametag is burned
 * forever and the mnemonic was never shown.
 *
 * This orchestrator splits the two concerns:
 *  1. Create the wallet WITHOUT a nametag — no binding is published, so a
 *     failure here can safely wipe storage (nothing is owned yet).
 *  2. Hand the created wallet back via `onWalletCreated` so the caller stores it
 *     and the mnemonic BEFORE the fallible step.
 *  3. Register the nametag as a SEPARATE step on the created wallet. A failure
 *     here never re-runs `createWallet` and never wipes the wallet — the key
 *     survives, so the binding (if it did publish) stays owned by the user and
 *     the nametag can be retried.
 */
export interface CreateWalletThenRegisterDeps<
  S extends { registerNametag(nametag: string): Promise<void> },
> {
  /** Creates the wallet with NO nametag (so no binding is published). */
  createWallet: () => Promise<{ mnemonic: string; sphere: S }>;
  /** Called with the created wallet BEFORE the fallible nametag step. */
  onWalletCreated: (result: { mnemonic: string; sphere: S }) => void;
  /** Bare nametag to register (without '@'); omit to skip registration. */
  nametag?: string;
}

export async function createWalletThenRegister<
  S extends { registerNametag(nametag: string): Promise<void> },
>(deps: CreateWalletThenRegisterDeps<S>): Promise<{ mnemonic: string; sphere: S }> {
  const result = await deps.createWallet();
  // Preserve the wallet + mnemonic before anything that can fail: from here on
  // the wallet exists and must never be lost by a nametag-registration failure.
  deps.onWalletCreated(result);
  if (deps.nametag) {
    await result.sphere.registerNametag(deps.nametag);
  }
  return result;
}
