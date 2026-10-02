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

describe('AssetRow verification', () => {
  it('marks a refused holding unverified and never shows where a bridged asset came from on it', () => {
    render(<AssetRow asset={{ ...asset, unverified: 'refused' }} badge="Tron" showBalances delay={0} isNew={false} />);
    expect(screen.getByText('Unverified')).toBeTruthy();
    expect(screen.queryByText('Tron')).toBeNull();
  });

  it('marks a holding still being verified as pending, not as unverified', () => {
    render(<AssetRow asset={{ ...asset, unverified: 'pending' }} badge="Tron" showBalances delay={0} isNew={false} />);
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.queryByText('Unverified')).toBeNull();
    expect(screen.queryByText('Tron')).toBeNull();
  });

  it('shows the source chain on a verified holding', () => {
    render(<AssetRow asset={asset} badge="Tron" showBalances delay={0} isNew={false} />);
    expect(screen.getByText('Tron')).toBeTruthy();
    expect(screen.queryByText('Unverified')).toBeNull();
  });
});

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
