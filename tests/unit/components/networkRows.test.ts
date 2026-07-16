import { describe, it, expect, vi } from 'vitest';

// The helper reads SUPPORTED_NETWORKS from the config; mock it to the two
// public networks so the policy is exercised independently of the SDK table.
vi.mock('../../../src/config/network', () => ({
  SUPPORTED_NETWORKS: [
    { id: 'testnet2', label: 'Testnet2', available: true },
    { id: 'mainnet', label: 'Mainnet', available: false },
  ],
}));

import { buildNetworkRows, rowState } from '../../../src/components/wallet/L3/modals/networkRows';

describe('buildNetworkRows', () => {
  it('offers exactly the public networks — never dev', () => {
    const rows = buildNetworkRows('testnet2');
    expect(rows.map((r) => r.id)).toEqual(['testnet2', 'mainnet']);
  });

  it('does not duplicate an active network that is already listed', () => {
    const rows = buildNetworkRows('mainnet');
    expect(rows.filter((r) => r.id === 'mainnet')).toHaveLength(1);
    expect(rows.map((r) => r.id)).toEqual(['testnet2', 'mainnet']);
  });

  it('appends a console-set active network as a current-only row', () => {
    // 'dev' is reachable only via the console escape hatch; the screen must
    // still show where the wallet actually is. Label comes from the real SDK
    // NETWORKS table: dev = 'Development'.
    const rows = buildNetworkRows('dev');
    expect(rows.map((r) => r.id)).toEqual(['testnet2', 'mainnet', 'dev']);
    expect(rows.find((r) => r.id === 'dev')).toEqual({
      id: 'dev',
      label: 'Development',
      available: true,
    });
  });
});

describe('rowState', () => {
  const testnet2 = { id: 'testnet2', label: 'Testnet2', available: true } as const;
  const mainnet = { id: 'mainnet', label: 'Mainnet', available: false } as const;

  it('marks the active network as current', () => {
    expect(rowState(testnet2, 'testnet2')).toBe('current');
  });

  it('marks an available non-current network as selectable', () => {
    expect(rowState(testnet2, 'dev')).toBe('selectable');
  });

  it('marks an unavailable network as unavailable', () => {
    expect(rowState(mainnet, 'testnet2')).toBe('unavailable');
  });
});
