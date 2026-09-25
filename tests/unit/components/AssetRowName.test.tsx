import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AssetRow } from '../../../src/components/wallet/shared/components/AssetRow';

const LONG = 'USDT (bridged · Tron), a name longer than the row shows';

const asset = {
  coinId: 'ab'.repeat(32), symbol: 'USDT', name: LONG, decimals: 6, totalAmount: '10000000', tokenCount: 1,
  confirmedAmount: '10000000', unconfirmedAmount: '0', confirmedTokenCount: 1, unconfirmedTokenCount: 0,
  transferringTokenCount: 0, transferringAmount: '0', priceUsd: 1, priceEur: null, change24h: null,
  fiatValueUsd: 10, fiatValueEur: null,
};

describe('AssetRow name', () => {
  it('is cut off by default and shown whole on click, without triggering the row', () => {
    let rowClicks = 0;
    render(<AssetRow asset={asset} showBalances delay={0} isNew={false} onClick={() => { rowClicks += 1; }} />);
    const name = screen.getByText(LONG);
    expect(name.className).toContain('truncate');
    expect(name.getAttribute('title')).toBe(LONG);

    fireEvent.click(name);
    expect(name.className).not.toContain('truncate');
    expect(name.className).toContain('whitespace-normal');
    expect(rowClicks).toBe(0);

    fireEvent.click(name);
    expect(name.className).toContain('truncate');
  });
});
