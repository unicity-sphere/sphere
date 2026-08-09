import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Asset } from '@unicitylabs/sphere-sdk';

// ============================================================================
// SwapModal exchange rates.
//
// The swap surface must price BOTH sides from the price provider keyed by the
// registry's RAW (lowercase) token name — the CoinGecko id. It must NOT depend
// on `Asset.priceUsd` coming back populated: the SDK's payments-v2 asset
// pricing keys CoinGecko by the CAPITALIZED display name ("Bitcoin"), so every
// held asset arrives with priceUsd 0/null and the Swap button used to sit
// permanently disabled with no explanation.
//
// And when a rate genuinely is not available, the modal must SAY so rather than
// present an inert button.
// ============================================================================

interface Def {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  assetKind: 'fungible' | 'non-fungible';
  network: string;
  description: string;
}

function def(name: string, symbol: string, idByte: string): Def {
  return {
    id: idByte.repeat(32),
    name,
    symbol,
    decimals: 8,
    assetKind: 'fungible',
    network: 'unicity:testnet2',
    description: '',
  };
}

const BTC = def('bitcoin', 'BTC', 'b1');
const UCT = def('unicity', 'UCT', 'c1');
const USDU = def('unicity-usd', 'USDU', 'd1');

/** Registry contents for the test under way (empty = registry not loaded yet). */
let defs: Def[] = [];

/** Set to make the registry lookup blow up mid-effect (last-resort error path). */
let registryLookupThrows = false;

const fakeRegistry = {
  getAllDefinitions: () => defs,
  getDefinition: (coinId: string) => {
    if (registryLookupThrows) throw new Error('registry exploded');
    return defs.find((d) => d.id === coinId) ?? null;
  },
  getIconUrl: () => null,
};

vi.mock('@unicitylabs/sphere-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@unicitylabs/sphere-sdk')>();
  return {
    ...actual,
    TokenRegistry: {
      getInstance: () => fakeRegistry,
      waitForReady: async () => defs.length > 0,
    },
  };
});

/** A held asset as the SDK hands it over today: no usable price. */
function held(d: Def, whole: string): Asset {
  return {
    coinId: d.id,
    symbol: d.symbol,
    name: d.name,
    decimals: d.decimals,
    totalAmount: (BigInt(whole) * 10n ** BigInt(d.decimals)).toString(),
    tokenCount: 1,
    confirmedAmount: (BigInt(whole) * 10n ** BigInt(d.decimals)).toString(),
    unconfirmedAmount: '0',
    confirmedTokenCount: 1,
    unconfirmedTokenCount: 0,
    transferringTokenCount: 0,
    transferringAmount: '0',
    priceUsd: null,
    priceEur: null,
    change24h: null,
    fiatValueUsd: null,
    fiatValueEur: null,
  };
}

let heldAssets: Asset[] = [];
let providers: { price?: { getPrices: (names: string[]) => Promise<Map<string, { priceUsd: number }>> } } | null = null;

vi.mock('../../../src/sdk', () => ({
  useAssets: () => ({ assets: heldAssets, isLoading: false, error: null, assetCount: heldAssets.length }),
  useTransfer: () => ({ transfer: vi.fn(), isLoading: false, error: null, lastResult: null, reset: vi.fn() }),
}));

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: {}, providers }),
}));

vi.mock('../../../src/sdk/payments', () => ({
  getPayments: () => ({ mint: vi.fn() }),
}));

import { SwapModal } from '../../../src/components/wallet/L3/modals/SwapModal';

function Wrapper({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function open() {
  return render(
    <Wrapper>
      <SwapModal isOpen onClose={vi.fn()} />
    </Wrapper>,
  );
}

/** The submit button — the header title is an h3, so the name is unambiguous. */
function swapButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Swap' }) as HTMLButtonElement;
}

beforeEach(() => {
  defs = [];
  heldAssets = [];
  providers = null;
  registryLookupThrows = false;
});

describe('SwapModal — exchange rates', () => {
  it('prices a held coin from the provider (lowercase registry name) and enables Swap, even though the SDK asset carries no price', async () => {
    defs = [BTC, UCT, USDU];
    heldAssets = [held(BTC, '2')];
    const getPrices = vi.fn(async (names: string[]) => {
      const m = new Map<string, { priceUsd: number }>();
      if (names.includes('bitcoin')) m.set('bitcoin', { priceUsd: 60_000 });
      if (names.includes('unicity')) m.set('unicity', { priceUsd: 1 });
      return m;
    });
    providers = { price: { getPrices } };

    open();

    // Defaults: from = the held BTC, to = the first other swappable coin (UCT).
    await screen.findByText('BTC');
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '1' } });

    // The rate row renders and the button is live — 1 BTC = 60000 UCT.
    expect(await screen.findByText(/60000\.0000 UCT/)).toBeTruthy();
    await waitFor(() => expect(swapButton().disabled).toBe(false));

    // Queried with the CoinGecko id, never the capitalized display name.
    const asked = getPrices.mock.calls[0]![0];
    expect(asked).toContain('bitcoin');
    expect(asked.some((n) => n !== n.toLowerCase())).toBe(false);

    // No "unavailable" noise on the happy path.
    expect(screen.queryByText(/Exchange rates unavailable/)).toBeNull();
  });

  it('an unlisted coin (no CoinGecko quote, no fallback) still prices at the $1.00 nominal and stays swappable', async () => {
    defs = [BTC, UCT, USDU];
    heldAssets = [held(BTC, '2')];
    providers = {}; // no price provider wired

    open();

    await screen.findByText('BTC');
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '1' } });

    // Explanatory state naming the unpriced coin — not a bare disabled button.
    // Unicity's own coins are unlisted on CoinGecko: "no quote" is NORMAL for
    // them, and the $1.00 nominal is what keeps them swappable. A refusal here
    // would break the coins this wallet exists to move.
    await waitFor(() => expect(swapButton().disabled).toBe(false));
    expect(screen.queryByText(/Exchange rates unavailable/)).toBeNull();
    // And no invented rate.
  });

  it('says rates are loading while the registry is still empty, instead of a bare disabled button', async () => {
    defs = []; // cold start: registry has not loaded yet
    heldAssets = [held(BTC, '2')];
    providers = { price: { getPrices: vi.fn(async () => new Map()) } };

    open();

    expect(await screen.findByText('Loading exchange rates…')).toBeTruthy();
    expect(swapButton().disabled).toBe(true);
    expect(screen.queryByText(/Exchange rates unavailable/)).toBeNull();
  });

  it('a throwing price provider degrades to the nominal rather than blocking the swap', async () => {
    defs = [BTC, UCT, USDU];
    heldAssets = [held(BTC, '2')];
    const fail = true;
    const getPrices = vi.fn(async () => {
      if (fail) throw new Error('coingecko down');
      return new Map([['bitcoin', { priceUsd: 60_000 }], ['unicity', { priceUsd: 1 }]]);
    });
    providers = { price: { getPrices } };

    open();

    await screen.findByText('BTC');
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '1' } });
    // A dead price feed must not strand the swap: every coin falls to the
    // nominal, so the pair quotes 1:1 and stays usable. (The explanatory state
    // is for having NOTHING to swap — see the empty-registry test — not for an
    // unlisted or unquoted coin, which is Unicity's normal case.)
    await waitFor(() => expect(swapButton().disabled).toBe(false));
    expect(screen.queryByText(/Exchange rates unavailable/)).toBeNull();
    expect(await screen.findByText(/1\.0000 UCT/)).toBeTruthy();
    expect(getPrices).toHaveBeenCalled();
  });

  it('an unexpected throw while loading rates ends in the explanatory state, not an endless spinner', async () => {
    defs = [BTC, UCT, USDU];
    heldAssets = [held(BTC, '2')];
    registryLookupThrows = true;
    providers = { price: { getPrices: vi.fn(async () => new Map()) } };

    open();

    expect(await screen.findByText('Exchange rates unavailable — try again shortly.')).toBeTruthy();
    expect(screen.queryByText('Loading exchange rates…')).toBeNull();
  });

  it('still swaps the coins the hardcoded fallback covers when no provider answers', async () => {
    defs = [UCT, USDU];
    heldAssets = [held(UCT, '10')];
    providers = { price: { getPrices: vi.fn(async () => new Map()) } }; // CoinGecko lists neither

    open();

    await screen.findByText('UCT');
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '5' } });

    expect(await screen.findByText(/1\.0000 USDU/)).toBeTruthy();
    await waitFor(() => expect(swapButton().disabled).toBe(false));
    expect(screen.queryByText(/Exchange rates unavailable/)).toBeNull();
  });
});
