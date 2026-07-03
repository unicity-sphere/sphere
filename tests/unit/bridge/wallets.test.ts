/**
 * Bridge-in wallet picker (08 Phase 3). Guards the provider list Sphere offers and
 * the Trust-on-Tron gate: Trust's WalletConnect namespaces are EVM+Solana, not Tron,
 * so we must never present Trust as a Tron bridge wallet. Advertising it would need an
 * acceptance test proving Trust-on-Tron actually round-trips; until then, the WC entry
 * stays generic and "All Wallets" is hidden (see walletconnect.ts).
 */
import { describe, it, expect } from 'vitest';

import { getAppTronWallets } from '@/bridge/loadBridges';

describe('bridge-in wallet picker (08 Phase 3)', () => {
  it('offers TronLink and WalletConnect (projectId configured by default)', () => {
    const ids = getAppTronWallets().map((w) => w.id);
    expect(ids).toContain('tronlink');
    expect(ids).toContain('walletconnect');
  });

  it('does not advertise Trust-on-Tron — the WalletConnect option is labelled generically', () => {
    const wc = getAppTronWallets().find((w) => w.id === 'walletconnect');
    expect(wc?.name).toBe('WalletConnect');
    expect(wc?.name.toLowerCase()).not.toContain('trust');
  });

  it('every offered wallet can build a signer (create is wired)', () => {
    for (const w of getAppTronWallets()) {
      const signer = w.create(3448148188);
      expect(typeof signer.connect).toBe('function');
      expect(typeof signer.sendCall).toBe('function');
    }
  });
});
