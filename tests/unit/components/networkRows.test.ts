import { describe, it, expect, vi } from 'vitest';

// The helper reads SUPPORTED_NETWORKS from the config; mock it to the two
// public networks so the policy is exercised independently of the SDK table.
vi.mock('../../../src/config/network', () => ({
  SUPPORTED_NETWORKS: [
    { id: 'testnet2', label: 'Testnet2', available: true },
    { id: 'mainnet', label: 'Mainnet', available: false, unavailableReason: 'not-onboarded' },
  ],
}));

import {
  buildNetworkRows,
  rowState,
  unavailableLabel,
} from '../../../src/components/wallet/L3/modals/networkRows';

describe('buildNetworkRows', () => {
  it('offers exactly the public networks', () => {
    const rows = buildNetworkRows('testnet2');
    expect(rows.map((r) => r.id)).toEqual(['testnet2', 'mainnet']);
  });

  it('does not duplicate an active network that is already listed', () => {
    const rows = buildNetworkRows('mainnet');
    expect(rows.filter((r) => r.id === 'mainnet')).toHaveLength(1);
    expect(rows.map((r) => r.id)).toEqual(['testnet2', 'mainnet']);
  });

  // DELETED with the sphere-sdk 0.16.0-dev.1 bump: 'appends a console-set
  // active network as a current-only row'. It exercised buildNetworkRows('dev'),
  // and 'dev' is no longer a NetworkType. The append branch itself survives as
  // a guarantee of the pure function, but nothing in the app can reach it: the
  // sole caller passes SPHERE_NETWORK, which resolveActiveNetwork can only ever
  // set to a SUPPORTED_NETWORKS id, and the one remaining NetworkType outside
  // that list — the 'testnet' alias — is refused by isSwitchableNetwork. Pinning
  // it with the alias would assert a state the wallet cannot be in.
});

describe('unavailableLabel — the badge must not flatten opposite causes', () => {
  it('says the deployment cannot reach it when that is the reason', () => {
    // "Coming soon" here would be a lie: the network exists and is live, this
    // deployment just has no backend for it. Support cannot act on the wrong word.
    expect(
      unavailableLabel({
        id: 'mainnet',
        label: 'Mainnet',
        available: false,
        unavailableReason: 'not-served-here',
      }),
    ).toBe('Not available here');
  });

  it("says Coming soon while the network is not live for anyone yet", () => {
    expect(
      unavailableLabel({
        id: 'mainnet',
        label: 'Mainnet',
        available: false,
        unavailableReason: 'not-onboarded',
      }),
    ).toBe('Coming soon');
  });

  it('treats an un-rolled-out network as Coming soon (the switch is ours, not the user\'s)', () => {
    expect(
      unavailableLabel({
        id: 'mainnet',
        label: 'Mainnet',
        available: false,
        unavailableReason: 'not-rolled-out',
      }),
    ).toBe('Coming soon');
  });

  it('falls back to Coming soon when no reason is recorded', () => {
    expect(unavailableLabel({ id: 'mainnet', label: 'Mainnet', available: false })).toBe(
      'Coming soon',
    );
  });
});

describe('rowState', () => {
  const testnet2 = { id: 'testnet2', label: 'Testnet2', available: true } as const;
  const mainnet = { id: 'mainnet', label: 'Mainnet', available: false } as const;

  it('marks the active network as current', () => {
    expect(rowState(testnet2, 'testnet2')).toBe('current');
  });

  it('marks an available non-current network as selectable', () => {
    expect(rowState(testnet2, 'mainnet')).toBe('selectable');
  });

  it('marks an unavailable network as unavailable', () => {
    expect(rowState(mainnet, 'testnet2')).toBe('unavailable');
  });
});
