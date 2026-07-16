import { NETWORKS } from '@unicitylabs/sphere-sdk';
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import { SUPPORTED_NETWORKS, type SupportedNetwork } from '../../../../config/network';

/** How a network row presents: the active one, a switch target, or not-yet-live. */
export type RowState = 'current' | 'selectable' | 'unavailable';

/**
 * The network rows to render, in display order. Pure (no env, no React) so the
 * "which networks to show" policy is testable on its own, separate from the
 * view.
 *
 * The screen offers exactly the public networks (testnet2, mainnet). The one
 * exception is honesty about the current state: an active network that is not
 * in that list — only reachable by setting `sphere_active_network` from the
 * browser console, the developer escape hatch used to verify switching while
 * testnet2 is the single live network — is appended as a current-only row, so
 * the screen never lies about where the wallet is and always offers a way back
 * to a public network.
 */
export function buildNetworkRows(active: NetworkType): SupportedNetwork[] {
  const rows: SupportedNetwork[] = [...SUPPORTED_NETWORKS];

  if (!rows.some((n) => n.id === active)) {
    rows.push({ id: active, label: NETWORKS[active].name, available: true });
  }
  return rows;
}

/** The presentation state of one row given the active network. */
export function rowState(row: SupportedNetwork, active: NetworkType): RowState {
  if (row.id === active) return 'current';
  return row.available ? 'selectable' : 'unavailable';
}
