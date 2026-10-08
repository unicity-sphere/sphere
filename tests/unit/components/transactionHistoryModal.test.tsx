import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { TransactionHistoryEntry } from '@unicitylabs/sphere-sdk';
import type { CoinPresentation } from '../../../src/modules/types';

// ============================================================================
// Transaction history — direction of a row (issue #488).
//
// The history feed carries three record types: SENT, RECEIVED and MINT. Only
// SENT leaves the wallet. MINT is a self-mint credit — it is what "Top Up"
// produces (one row per coin in the basket), and it is also the receive leg of
// a Swap, which is implemented as a send to the swap stub plus a self-mint.
//
// The modal used to decide direction with a single binary `=== 'RECEIVED'`
// test, so every MINT row fell into the outgoing branch: the word "Sent", a
// "-" sign, the orange up-arrow badge and the neutral (non-credit) amount
// colour — money arriving was presented as money leaving.
// ============================================================================

const hoisted = vi.hoisted(() => ({
  // TransactionHistoryModal calls TokenRegistry.getInstance() at MODULE scope,
  // so the fake has to exist before the component module is evaluated.
  registry: {
    // The token registry lists every coin here except UNLISTED_BRIDGED_COIN ('e' x 64), a
    // bridged coin it does not know: its decimals and symbol have to come from the module.
    getDefinition: (coinId: string) =>
      coinId === 'e'.repeat(64) ? undefined : { id: coinId, symbol: 'UCT', decimals: 0 },
    getIconUrl: () => null,
  },
}));

vi.mock('@unicitylabs/sphere-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@unicitylabs/sphere-sdk')>();
  return { ...actual, TokenRegistry: { getInstance: () => hoisted.registry } };
});

let history: TransactionHistoryEntry[] = [];

vi.mock('../../../src/sdk', () => ({
  useTransactionHistory: () => ({ history, isLoading: false, error: null, refetch: vi.fn() }),
}));

// The modal asks the module registry how to present a coin. Here the registry
// knows two coins: one a bridge module marks as bridged in from Ethereum, and
// one a module only badges (a short tag, not a claim about where it came from).
const BRIDGED_COIN = 'b'.repeat(64);
const BADGED_COIN = 'd'.repeat(64);
const presentations: Record<string, CoinPresentation> = {
  [BRIDGED_COIN]: { symbol: 'USDC', name: 'USD Coin', decimals: 0, badge: 'Ethereum', sourceChain: 'Ethereum' },
  [BADGED_COIN]: { symbol: 'XYZ', name: 'Tagged coin', decimals: 0, badge: 'Beta' },
  ['e'.repeat(64)]: { symbol: 'USDC', name: 'USD Coin', decimals: 6, badge: 'Ethereum', sourceChain: 'Ethereum' },
};

vi.mock('../../../src/modules/registry', () => ({
  describeCoin: (coinId: string) => presentations[coinId],
}));

import { TransactionHistoryModal } from '../../../src/components/wallet/L3/modals/TransactionHistoryModal';

const COIN = 'c'.repeat(64);

function entry(over: Partial<TransactionHistoryEntry>): TransactionHistoryEntry {
  return {
    dedupKey: 'k',
    id: 'e1',
    type: 'MINT',
    amount: '500',
    coinId: COIN,
    symbol: 'UCT',
    timestamp: 1_700_000_000_000,
    ...over,
  } as TransactionHistoryEntry;
}

function open() {
  return render(<TransactionHistoryModal isOpen onClose={vi.fn()} />);
}

/** The amount cell — the node carrying the sign, so its class is the colour under test. */
function amountCell(text: RegExp): HTMLElement {
  return screen.getByText(text);
}

/** The direction badge over the coin icon: its colour and its arrow. */
function badge(container: HTMLElement): { credit: boolean; arrow: string | null } {
  const node = container.querySelector('.bg-emerald-500, .bg-orange-500')!;
  const svg = node.querySelector('svg');
  return {
    credit: node.classList.contains('bg-emerald-500'),
    arrow: svg && (svg.getAttribute('class')?.match(/lucide-arrow-[a-z-]+/)?.[0] ?? null),
  };
}

beforeEach(() => {
  history = [];
});

describe('TransactionHistoryModal — row direction', () => {
  it('renders a self-mint (Top Up / swap receive leg) as an incoming credit', () => {
    history = [entry({ id: 'mint-1', type: 'MINT' })];

    const { container } = open();

    expect(screen.getByText('Received')).toBeTruthy();
    expect(screen.queryByText('Sent')).toBeNull();
    expect(amountCell(/\+500 UCT/).className).toMatch(/text-emerald/);
    expect(screen.queryByText(/-500 UCT/)).toBeNull();
    expect(badge(container)).toEqual({ credit: true, arrow: 'lucide-arrow-down-left' });
  });

  it('still renders an incoming transfer as a credit', () => {
    history = [entry({ id: 'recv-1', type: 'RECEIVED', senderNametag: 'bob' })];

    open();

    expect(screen.getByText(/from @bob/)).toBeTruthy();
    expect(amountCell(/\+500 UCT/).className).toMatch(/text-emerald/);
  });

  it('still renders an outgoing transfer as a debit', () => {
    history = [entry({ id: 'sent-1', type: 'SENT', recipientNametag: 'bob' })];

    const { container } = open();

    expect(screen.getByText('Sent')).toBeTruthy();
    expect(badge(container)).toEqual({ credit: false, arrow: 'lucide-arrow-up-right' });
    expect(screen.getByText(/to @bob/)).toBeTruthy();
    expect(amountCell(/-500 UCT/).className).not.toMatch(/text-emerald/);
    expect(screen.queryByText(/\+500 UCT/)).toBeNull();
  });
});

// ============================================================================
// A bridge-in is a MINT too: the bridge module mints the bridged coin into the
// user's own wallet. Labelled "Received", it read as if someone had sent it.
// A MINT of a coin a module marks with a source chain is shown as "Bridged in",
// with the chain in its details; every other MINT (Top Up, a Swap's receive
// leg) keeps "Received".
// ============================================================================

describe('TransactionHistoryModal — bridge-in rows', () => {
  it('renders a mint of a bridged coin as "Bridged in", a credit with the bridge icon', () => {
    history = [entry({ id: 'bridge-1', type: 'MINT', coinId: BRIDGED_COIN, symbol: 'USDC' })];

    const { container } = open();

    expect(screen.getByText('Bridged in')).toBeTruthy();
    expect(screen.queryByText('Received')).toBeNull();
    expect(screen.queryByText('Sent')).toBeNull();
    expect(amountCell(/\+500 USDC/).className).toMatch(/text-emerald/);
    expect(badge(container)).toEqual({ credit: true, arrow: 'lucide-arrow-left-right' });
  });

  it('names the source chain in the details and no sender', () => {
    history = [entry({ id: 'bridge-1', type: 'MINT', coinId: BRIDGED_COIN, symbol: 'USDC' })];

    open();
    fireEvent.click(screen.getByText('Bridged in'));

    const from = screen.getByText('From');
    expect(from.parentElement!.textContent).toBe('FromEthereum');
    expect(screen.queryByText('Sender')).toBeNull();
    expect(screen.queryByText(/^from /)).toBeNull();
  });

  it('keeps "Received" for a mint of a coin no module marks as bridged (Top Up)', () => {
    history = [entry({ id: 'topup-1', type: 'MINT', coinId: COIN })];

    const { container } = open();
    fireEvent.click(screen.getByText('Received'));

    expect(screen.queryByText('Bridged in')).toBeNull();
    expect(screen.queryByText('From')).toBeNull();
    expect(badge(container)).toEqual({ credit: true, arrow: 'lucide-arrow-down-left' });
  });

  it('keeps "Received" for a mint of a coin a module only badges', () => {
    history = [entry({ id: 'badged-1', type: 'MINT', coinId: BADGED_COIN, symbol: 'XYZ' })];

    open();

    expect(screen.getByText('Received')).toBeTruthy();
    expect(screen.queryByText('Bridged in')).toBeNull();
  });

  it('keeps "Received" for a transfer of a bridged coin someone sent', () => {
    history = [entry({ id: 'recv-b', type: 'RECEIVED', coinId: BRIDGED_COIN, symbol: 'USDC', senderNametag: 'bob' })];

    const { container } = open();

    expect(screen.getByText('Received')).toBeTruthy();
    expect(screen.getByText(/from @bob/)).toBeTruthy();
    expect(screen.queryByText('Bridged in')).toBeNull();
    expect(badge(container)).toEqual({ credit: true, arrow: 'lucide-arrow-down-left' });
  });

  it('keeps "Sent" for a transfer of a bridged coin the user sent', () => {
    history = [entry({ id: 'sent-b', type: 'SENT', coinId: BRIDGED_COIN, symbol: 'USDC', recipientNametag: 'bob' })];

    const { container } = open();

    expect(screen.getByText('Sent')).toBeTruthy();
    expect(screen.queryByText('Bridged in')).toBeNull();
    expect(amountCell(/-500 USDC/).className).not.toMatch(/text-emerald/);
    expect(badge(container)).toEqual({ credit: false, arrow: 'lucide-arrow-up-right' });
  });

  it('formats a bridged coin the token registry does not list with the module decimals and symbol', () => {
    // The SDK falls back to the coin id's first hex characters for an unknown symbol, and the
    // registry has no decimals for it: the row used to read "+3000000 EAE954".
    history = [entry({ id: 'bridge-2', type: 'MINT', coinId: 'e'.repeat(64), amount: '3000000', symbol: 'EAE954' })];

    open();

    expect(screen.getByText('Bridged in')).toBeTruthy();
    expect(amountCell(/\+3 USDC/)).toBeTruthy();
    expect(screen.queryByText(/EAE954/)).toBeNull();
  });
});
