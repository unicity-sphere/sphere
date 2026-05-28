/**
 * ServiceStatusBanner — visibility + headline behavior tests.
 *
 * The banner shows when any backend (aggregator, IPFS, Nostr, market)
 * is `'down'` or `'degraded'` and stays visible for 10s after the last
 * service recovers (the post-recovery confirmation window). A user
 * dismiss collapses it immediately; a fresh incident clears the
 * dismissal and re-asserts the banner.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { createElement, type ReactNode, type HTMLAttributes } from 'react';

// Bypass framer-motion's enter/exit animations in tests so DOM
// presence / absence tracks visibility directly (no animation lingering
// the element in DOM after state goes to "hidden"). The banner's UX
// chrome is still exercised via the production component in dev; what
// we want to test here is the visibility state machine.
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({ children, ...props }: HTMLAttributes<HTMLElement> & { children?: ReactNode }) =>
          createElement(tag, props as Record<string, unknown>, children),
    },
  ),
  AnimatePresence: ({ children }: { children?: ReactNode }) => children as JSX.Element,
}));

import { ServiceStatusBanner } from '../../../src/components/layout/ServiceStatusBanner';
import type { UseConnectivityReturn } from '../../../src/sdk/hooks/core/useConnectivity';
import type { MarketStatus } from '../../../src/sdk/hooks/core/useMarketStatus';

// Mock the two hooks the banner consumes so each test can drive the
// status independently of the SDK/CoinGecko probes.
const connectivityMock = vi.fn<() => UseConnectivityReturn>();
const marketMock = vi.fn<() => MarketStatus>();

vi.mock('../../../src/sdk/hooks/core/useConnectivity', () => ({
  useConnectivity: () => connectivityMock(),
}));
vi.mock('../../../src/sdk/hooks/core/useMarketStatus', () => ({
  useMarketStatus: () => marketMock(),
}));

function allUp(): UseConnectivityReturn {
  return {
    aggregator: 'up',
    ipfs: 'up',
    nostr: 'up',
    lastOnlineAt: Date.now(),
    lastChangedAt: Date.now(),
  };
}

function withOverrides(
  base: UseConnectivityReturn,
  overrides: Partial<UseConnectivityReturn>,
): UseConnectivityReturn {
  return { ...base, ...overrides };
}

beforeEach(() => {
  connectivityMock.mockReset();
  marketMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ServiceStatusBanner — visibility gate', () => {
  it('hides when all four services are up', () => {
    connectivityMock.mockReturnValue(allUp());
    marketMock.mockReturnValue('up');
    render(<ServiceStatusBanner />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('hides when status is still unknown (probes haven\'t landed)', () => {
    connectivityMock.mockReturnValue({
      aggregator: 'unknown',
      ipfs: 'unknown',
      nostr: 'unknown',
      lastOnlineAt: null,
      lastChangedAt: 0,
    });
    marketMock.mockReturnValue('unknown');
    render(<ServiceStatusBanner />);
    // Banner stays dormant while everything is 'unknown' — surfaces
    // would otherwise scream on every fresh wallet load.
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows when aggregator is down (issue #319 repro scenario)', () => {
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { aggregator: 'down' }),
    );
    marketMock.mockReturnValue('up');
    render(<ServiceStatusBanner />);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText(/1 service is unreachable/)).toBeDefined();
  });

  it('shows when IPFS is down', () => {
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { ipfs: 'down' }),
    );
    marketMock.mockReturnValue('up');
    render(<ServiceStatusBanner />);
    expect(screen.getByText(/1 service is unreachable/)).toBeDefined();
  });

  it('shows when Nostr is down', () => {
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { nostr: 'down' }),
    );
    marketMock.mockReturnValue('up');
    render(<ServiceStatusBanner />);
    expect(screen.getByText(/1 service is unreachable/)).toBeDefined();
  });

  it('shows when market is down (CoinGecko unreachable)', () => {
    connectivityMock.mockReturnValue(allUp());
    marketMock.mockReturnValue('down');
    render(<ServiceStatusBanner />);
    expect(screen.getByText(/1 service is unreachable/)).toBeDefined();
  });

  it('counts multiple down services in the headline', () => {
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { aggregator: 'down', ipfs: 'down' }),
    );
    marketMock.mockReturnValue('down');
    render(<ServiceStatusBanner />);
    expect(screen.getByText(/3 services are unreachable/)).toBeDefined();
  });

  it('distinguishes degraded from down in the headline', () => {
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { aggregator: 'degraded' }),
    );
    marketMock.mockReturnValue('up');
    render(<ServiceStatusBanner />);
    expect(screen.getByText(/1 service is degraded/)).toBeDefined();
  });

  it('headline reflects worst severity (down beats degraded)', () => {
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { aggregator: 'down', ipfs: 'degraded' }),
    );
    marketMock.mockReturnValue('up');
    render(<ServiceStatusBanner />);
    expect(screen.getByText(/1 service is unreachable/)).toBeDefined();
    expect(screen.queryByText(/degraded/)).toBeNull();
  });
});

describe('ServiceStatusBanner — pills and labels', () => {
  it('renders one pill per backend with the right aria-label', () => {
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { aggregator: 'down', ipfs: 'degraded' }),
    );
    marketMock.mockReturnValue('up');
    render(<ServiceStatusBanner />);

    expect(screen.getByLabelText('Aggregator: Down')).toBeDefined();
    expect(screen.getByLabelText('IPFS: Degraded')).toBeDefined();
    expect(screen.getByLabelText('Nostr: OK')).toBeDefined();
    expect(screen.getByLabelText('Market: OK')).toBeDefined();
  });
});

describe('ServiceStatusBanner — recovery-confirmation window', () => {
  it('stays visible after recovery and collapses after 10s', async () => {
    vi.useFakeTimers();
    // Start with an incident.
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { aggregator: 'down' }),
    );
    marketMock.mockReturnValue('up');
    const { rerender } = render(<ServiceStatusBanner />);
    expect(screen.getByText(/1 service is unreachable/)).toBeDefined();

    // Recovery: all services back up. The useEffect that opens the
    // confirmation window runs after rerender; wrap in async act so
    // pending state from the effect flushes.
    connectivityMock.mockReturnValue(allUp());
    marketMock.mockReturnValue('up');
    await act(async () => {
      rerender(<ServiceStatusBanner />);
    });
    expect(screen.getByText(/All services back online/)).toBeDefined();

    // 9s later — still visible.
    await act(async () => {
      vi.advanceTimersByTime(9_000);
    });
    expect(screen.queryByText(/All services back online/)).not.toBeNull();

    // Past 10s — timer fires, setState(recoveryWindowOpen=false),
    // banner collapses. Async act flushes the state update from the
    // setTimeout callback.
    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });
    // Headline is gone — banner returned null (AnimatePresence exit
    // started; with fake timers the exit animation also ran).
    expect(screen.queryByText(/All services back online/)).toBeNull();
  });

  it('re-asserts itself if a new incident hits during the confirmation window', async () => {
    vi.useFakeTimers();
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { aggregator: 'down' }),
    );
    marketMock.mockReturnValue('up');
    const { rerender } = render(<ServiceStatusBanner />);

    // Recover.
    connectivityMock.mockReturnValue(allUp());
    await act(async () => {
      rerender(<ServiceStatusBanner />);
    });
    expect(screen.getByText(/All services back online/)).toBeDefined();

    // Mid-window, a NEW incident hits. Headline must flip back to the
    // incident headline; we're not stuck in a green "all back" message.
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { nostr: 'down' }),
    );
    await act(async () => {
      rerender(<ServiceStatusBanner />);
    });
    expect(screen.getByText(/1 service is unreachable/)).toBeDefined();
    expect(screen.queryByText(/All services back online/)).toBeNull();
  });
});

describe('ServiceStatusBanner — manual dismissal', () => {
  it('collapses on click of the dismiss button', async () => {
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { aggregator: 'down' }),
    );
    marketMock.mockReturnValue('up');
    render(<ServiceStatusBanner />);
    expect(screen.getByRole('status')).toBeDefined();

    const dismissBtn = screen.getByRole('button', {
      name: 'Dismiss service status banner',
    });
    await act(async () => {
      fireEvent.click(dismissBtn);
    });
    // Headline gone (banner collapsed to null via AnimatePresence).
    expect(screen.queryByText(/1 service is unreachable/)).toBeNull();
  });

  it('re-asserts the banner when a SECOND service fails during a dismissed incident', async () => {
    // Steelman finding: previously the effect deps were too narrow
    // ([hasIncident, overall]), so a second backend going down while
    // the user had already dismissed an aggregator-only incident did
    // NOT re-show the banner — the user missed the new fault entirely.
    // With the failing-set snapshot model, the dismissal is voided
    // automatically when a new service joins the failing set.
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { aggregator: 'down' }),
    );
    marketMock.mockReturnValue('up');
    const { rerender } = render(<ServiceStatusBanner />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Dismiss service status banner' }),
      );
    });
    expect(screen.queryByText(/1 service is unreachable/)).toBeNull();

    // IPFS ALSO goes down — same incident period, but a new fault.
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { aggregator: 'down', ipfs: 'down' }),
    );
    await act(async () => {
      rerender(<ServiceStatusBanner />);
    });
    // Banner re-asserts with the new headline.
    expect(screen.getByText(/2 services are unreachable/)).toBeDefined();
  });

  it('keeps the banner dismissed when severity changes WITHIN the dismissed set (down→degraded)', async () => {
    // Steelman finding: previously the effect's hasIncident=true branch
    // unconditionally called setManuallyDismissed(false) on every
    // re-run, so a severity change (down → degraded for a service that
    // was ALREADY failing and dismissed) re-asserted the banner — even
    // though the situation actually improved. Now the dismissal sticks
    // because the failing-set is unchanged (only severity moved).
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { aggregator: 'down' }),
    );
    marketMock.mockReturnValue('up');
    const { rerender } = render(<ServiceStatusBanner />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Dismiss service status banner' }),
      );
    });
    expect(screen.queryByText(/unreachable/)).toBeNull();

    // Aggregator improves down→degraded. Same service, less severe.
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { aggregator: 'degraded' }),
    );
    await act(async () => {
      rerender(<ServiceStatusBanner />);
    });
    // Banner STAYS dismissed — no new information for the user.
    expect(screen.queryByText(/unreachable/)).toBeNull();
    expect(screen.queryByText(/degraded/)).toBeNull();
  });

  it('does NOT pop the green recovery confirmation when the user had dismissed the incident', async () => {
    // Steelman: the user explicitly said "be quiet" by dismissing the
    // warning banner. Popping a green "all services back" message a
    // few seconds later is just as intrusive — they don't want it.
    vi.useFakeTimers();
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { aggregator: 'down' }),
    );
    marketMock.mockReturnValue('up');
    const { rerender } = render(<ServiceStatusBanner />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Dismiss service status banner' }),
      );
    });

    // Full recovery.
    connectivityMock.mockReturnValue(allUp());
    await act(async () => {
      rerender(<ServiceStatusBanner />);
    });
    // No green confirmation — the user was already informed and dismissed.
    expect(screen.queryByText(/All services back online/)).toBeNull();
  });

  it('re-asserts the banner when a fresh bad→ok→bad cycle hits after dismissal', async () => {
    // Dismissal is sticky for the CURRENT incident — the user told
    // us they don't want to see it. But once everything recovers and
    // a new fault appears, the banner re-asserts because that is a
    // fundamentally new incident the user has not seen yet.
    vi.useFakeTimers();
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { aggregator: 'down' }),
    );
    marketMock.mockReturnValue('up');
    const { rerender } = render(<ServiceStatusBanner />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Dismiss service status banner' }),
      );
    });
    expect(screen.queryByText(/1 service is unreachable/)).toBeNull();

    // Recovery — full ok state. The post-recovery 10s window stays
    // hidden because the user dismissed; no green confirmation needed.
    connectivityMock.mockReturnValue(allUp());
    await act(async () => {
      rerender(<ServiceStatusBanner />);
    });

    // Drain the recovery confirmation window so we're back in the
    // dormant all-ok state with no banner active.
    await act(async () => {
      vi.advanceTimersByTime(11_000);
    });

    // A NEW incident arrives. Banner re-asserts because the bad→ok→bad
    // transition resets the dismissal (the previous fault is over).
    connectivityMock.mockReturnValue(
      withOverrides(allUp(), { ipfs: 'down' }),
    );
    await act(async () => {
      rerender(<ServiceStatusBanner />);
    });
    expect(screen.getByText(/1 service is unreachable/)).toBeDefined();
  });
});
