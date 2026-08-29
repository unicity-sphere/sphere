import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { TransactionHistoryEntry } from '@unicitylabs/sphere-sdk';

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
    getDefinition: (coinId: string) => ({ id: coinId, symbol: 'UCT', decimals: 0 }),
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
