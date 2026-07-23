/**
 * #450: the onboarding "Download Backup" wrote the mnemonic as an UNENCRYPTED
 * JSON named after the user's public handle (`@alice.json`) — trivially
 * identifiable and cleartext. buildWalletBackup fixes both: a generic filename
 * (no handle leak) and an optional at-file encryption password threaded to
 * exportToJSON (mirroring the in-wallet "Save Wallet").
 */
import { describe, it, expect, vi } from 'vitest';
import { buildWalletBackup } from '../../../src/components/wallet/onboarding/hooks/buildWalletBackup';

function makeSphere(nametag?: string) {
  return {
    exportToJSON: vi.fn((opts) => ({ opts })),
    identity: { nametag },
  };
}

describe('buildWalletBackup', () => {
  it('never names the file after the public handle', () => {
    const sphere = makeSphere('@alice');
    const { fileName } = buildWalletBackup(sphere);
    expect(fileName).not.toContain('alice');
    expect(fileName).toBe('sphere-wallet-recovery.json');
  });

  it('encrypts the export when a password is given', () => {
    const sphere = makeSphere('@alice');
    const { encrypted } = buildWalletBackup(sphere, 'hunter2');
    expect(sphere.exportToJSON).toHaveBeenCalledWith({ includeMnemonic: true, password: 'hunter2' });
    expect(encrypted).toBe(true);
  });

  it('exports plaintext (password omitted, not empty string) when no password', () => {
    const sphere = makeSphere();
    const { encrypted } = buildWalletBackup(sphere, '');
    expect(sphere.exportToJSON).toHaveBeenCalledWith({ includeMnemonic: true, password: undefined });
    expect(encrypted).toBe(false);
  });
});
