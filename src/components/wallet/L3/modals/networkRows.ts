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
 * The screen offers exactly the public networks (testnet2, mainnet). The
 * append below keeps one promise on top of that: the screen never lies about
 * where the wallet is. It is a guarantee of this pure function, not a live path
 * — the console escape hatch that used to reach it ('dev') is gone with the
 * sphere-sdk 0.16.0-dev.1 bump, and the only remaining NetworkType outside the
 * list is the 'testnet' alias, which resolveActiveNetwork can never return. It
 * stays as the one line that keeps a future network from rendering a screen
 * with no current row and no way back.
 */
export function buildNetworkRows(active: NetworkType): SupportedNetwork[] {
  const rows: SupportedNetwork[] = [...SUPPORTED_NETWORKS];

  if (!rows.some((n) => n.id === active)) {
    // `available` describes whether a row can be SELECTED. The active network
    // never can (it is already current), and claiming otherwise would be a
    // false assertion the moment anything else reads this list.
    rows.push({ id: active, label: NETWORKS[active].name, available: false });
  }
  return rows;
}

/** The presentation state of one row given the active network. */
export function rowState(row: SupportedNetwork, active: NetworkType): RowState {
  if (row.id === active) return 'current';
  return row.available ? 'selectable' : 'unavailable';
}

/**
 * The badge for an unavailable row. The two reasons are operationally
 * opposite — "the network does not exist yet" versus "it exists but this
 * deployment cannot reach it" — and this badge is the only signal a user or a
 * support engineer gets, so it must not flatten them into one word.
 */
export function unavailableLabel(row: SupportedNetwork): string {
  switch (row.unavailableReason) {
    case 'not-served-here':
      return 'Not available here';
    // 'not-onboarded' and 'not-rolled-out' are both "not live for you yet", and
    // the distinction (SDK vs rollout switch) is ours, not the user's.
    default:
      return 'Coming soon';
  }
}
