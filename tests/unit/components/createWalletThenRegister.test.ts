/**
 * #448: creating a wallet WITH a nametag in one shot publishes the first-write-
 * wins Nostr binding inside Sphere.init; if anything then fails, cleanupOnError
 * wipes the only key that owns the binding — the nametag is burned forever and
 * the mnemonic was never shown. The fix: create the wallet WITHOUT a nametag
 * first (no binding published, safe to wipe on failure), report/preserve it,
 * then register the nametag as a SEPARATE step whose failure never wipes the
 * wallet.
 */
import { describe, it, expect, vi } from 'vitest';
import { createWalletThenRegister } from '../../../src/components/wallet/onboarding/hooks/createWalletThenRegister';

function makeSphere() {
  return { registerNametag: vi.fn(async () => {}) };
}

describe('createWalletThenRegister', () => {
  it('creates the wallet WITHOUT a nametag, then registers it separately', async () => {
    const sphere = makeSphere();
    const createWallet = vi.fn(async () => ({ mnemonic: 'seed words', sphere }));
    const onWalletCreated = vi.fn();

    await createWalletThenRegister({ createWallet, onWalletCreated, nametag: 'alice' });

    // Wallet is created with no arguments — so Sphere.init publishes no binding.
    expect(createWallet).toHaveBeenCalledTimes(1);
    expect(createWallet).toHaveBeenCalledWith();
    // The nametag is registered as a separate step on the created wallet.
    expect(sphere.registerNametag).toHaveBeenCalledWith('alice');
  });

  it('preserves the created wallet BEFORE the fallible nametag step', async () => {
    const sphere = makeSphere();
    const result = { mnemonic: 'seed words', sphere };
    const createWallet = vi.fn(async () => result);
    const calls: string[] = [];
    const onWalletCreated = vi.fn(() => calls.push('created'));
    sphere.registerNametag.mockImplementation(async () => {
      calls.push('register');
    });

    await createWalletThenRegister({ createWallet, onWalletCreated, nametag: 'alice' });

    // The wallet must be handed back (and stored by the caller) BEFORE register.
    expect(calls).toEqual(['created', 'register']);
    expect(onWalletCreated).toHaveBeenCalledWith(result);
  });

  it('keeps the wallet when nametag registration fails (no re-create, no wipe)', async () => {
    const sphere = makeSphere();
    const result = { mnemonic: 'seed words', sphere };
    const createWallet = vi.fn(async () => result);
    const onWalletCreated = vi.fn();
    sphere.registerNametag.mockRejectedValue(new Error('relay down'));

    await expect(
      createWalletThenRegister({ createWallet, onWalletCreated, nametag: 'alice' }),
    ).rejects.toThrow('relay down');

    // Wallet was created once and preserved; registration failure must NOT
    // trigger another createWallet (which is where cleanupOnError lives).
    expect(createWallet).toHaveBeenCalledTimes(1);
    expect(onWalletCreated).toHaveBeenCalledWith(result);
  });

  it('skips registration entirely when no nametag is given', async () => {
    const sphere = makeSphere();
    const createWallet = vi.fn(async () => ({ mnemonic: 'seed words', sphere }));
    const onWalletCreated = vi.fn();

    await createWalletThenRegister({ createWallet, onWalletCreated });

    expect(createWallet).toHaveBeenCalledWith();
    expect(sphere.registerNametag).not.toHaveBeenCalled();
  });
});
