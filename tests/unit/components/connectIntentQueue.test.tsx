/**
 * Graceful lock §8.4: ConnectProvider state is PER HOST and intents QUEUE.
 *
 * Before: a second requestIntent() overwrote the single pending slot and lost the
 * previous `resolve` forever — `await onIntent(...)` in the host never settled.
 * Auto-approve grants were keyed by action alone, so a grant made in one tab
 * leaked to another host.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';
import { ERROR_CODES } from '@unicitylabs/sphere-sdk/connect';

vi.mock('../../../src/components/connect/ConnectionApprovalModal', () => ({
  ConnectionApprovalModal: () => null,
}));
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ isLocked: false, unlock: vi.fn(async () => {}) }),
}));
// Stand-in for the real intent handler: renders whatever is at the head of the
// queue so the test can see which intent is actually on screen.
vi.mock('../../../src/components/connect/ConnectIntentHandler', async () => {
  const { useConnectContext } = await import('../../../src/components/connect/ConnectContext');
  return {
    ConnectIntentHandler: () => {
      const { pendingIntent } = useConnectContext();
      return <div data-testid="head">{pendingIntent ? pendingIntent.action : 'none'}</div>;
    },
  };
});

import { ConnectProvider } from '../../../src/components/connect/ConnectProvider';
import { useConnectContext, type ConnectContextValue } from '../../../src/components/connect/ConnectContext';
import {
  clearConnectHosts,
  getConnectHosts,
  getConnectHostEntry,
} from '../../../src/sdk/connectHostRegistry';

const hostA = { id: 'A' } as unknown as ConnectHost;
const hostB = { id: 'B' } as unknown as ConnectHost;

let ctx: ConnectContextValue | null = null;
function Probe() {
  ctx = useConnectContext();
  return null;
}

function renderProvider() {
  render(<ConnectProvider><Probe /></ConnectProvider>);
}

beforeEach(() => {
  ctx = null;
  clearConnectHosts();
});
afterEach(() => clearConnectHosts());

describe('ConnectProvider intent queue', () => {
  it('queues a second intent instead of losing the first resolve', async () => {
    renderProvider();
    act(() => ctx!.attachHost(hostA, 'https://a.example'));

    let first: unknown;
    let second: unknown;
    act(() => {
      void ctx!.requestIntent(hostA, 'https://a.example', 'send', { to: 'x' }).then((r) => { first = r; });
      void ctx!.requestIntent(hostA, 'https://a.example', 'dm', { to: 'y' }).then((r) => { second = r; });
    });

    // FIFO: the first intent is on screen, the second waits.
    expect(screen.getByTestId('head').textContent).toBe('send');

    act(() => ctx!.resolveIntent(ctx!.pendingIntent!.id, { ok: 1 }));
    await waitFor(() => expect(first).toEqual({ result: { ok: 1 } }));
    expect(screen.getByTestId('head').textContent).toBe('dm');

    act(() => ctx!.rejectIntent(ctx!.pendingIntent!.id, ERROR_CODES.USER_REJECTED, 'User cancelled'));
    await waitFor(() =>
      expect(second).toEqual({ error: { code: ERROR_CODES.USER_REJECTED, message: 'User cancelled' } }),
    );
    expect(screen.getByTestId('head').textContent).toBe('none');
  });

  it("settles a released host's intents and leaves the other host's alone", async () => {
    renderProvider();
    act(() => {
      ctx!.attachHost(hostA, 'https://a.example');
      ctx!.attachHost(hostB, 'https://b.example');
    });

    let fromA: unknown;
    let fromB: unknown;
    act(() => {
      void ctx!.requestIntent(hostA, 'https://a.example', 'send', {}).then((r) => { fromA = r; });
      void ctx!.requestIntent(hostB, 'https://b.example', 'dm', {}).then((r) => { fromB = r; });
    });

    act(() => ctx!.releaseHost(hostA));

    await waitFor(() =>
      expect(fromA).toEqual({
        error: { code: ERROR_CODES.INTENT_CANCELLED, message: 'Wallet view closed' },
      }),
    );
    expect(fromB).toBeUndefined();
    expect(screen.getByTestId('head').textContent).toBe('dm');
    // Paired add/remove: releasing A must not touch B's registry entry.
    expect(getConnectHosts()).toEqual([hostB]);
  });

  it('isolates two hosts that serve the SAME origin', async () => {
    renderProvider();
    act(() => {
      ctx!.attachHost(hostA, 'https://same.example');
      ctx!.attachHost(hostB, 'https://same.example');
    });

    let fromA: unknown;
    let fromB: unknown;
    act(() => {
      void ctx!.requestIntent(hostA, 'https://same.example', 'send', {}).then((r) => { fromA = r; });
      void ctx!.requestIntent(hostB, 'https://same.example', 'dm', {}).then((r) => { fromB = r; });
    });

    act(() => ctx!.releaseHost(hostA));

    await waitFor(() => expect(fromA).toBeDefined());
    // Same origin, different host identity — B keeps its queue entry AND its
    // registry entry. Everything is keyed by host, never by origin.
    expect(fromB).toBeUndefined();
    expect(getConnectHosts()).toEqual([hostB]);
    expect(getConnectHostEntry(hostB)?.origin).toBe('https://same.example');
  });

  it('registers the host with its verified origin', () => {
    renderProvider();
    act(() => ctx!.attachHost(hostA, 'https://a.example'));

    expect(getConnectHosts()).toEqual([hostA]);
    expect(getConnectHostEntry(hostA)?.origin).toBe('https://a.example');
  });

  it('scopes auto-approve grants to the host that made them', async () => {
    const auto = vi.fn(async () => ({ result: { sent: true } }));
    renderProvider();
    act(() => {
      ctx!.attachHost(hostA, 'https://a.example');
      ctx!.attachHost(hostB, 'https://b.example');
      ctx!.registerAutoIntent(hostA, 'dm', auto);
    });

    const viaA = await act(async () => ctx!.requestIntent(hostA, 'https://a.example', 'dm', { to: 'x' }));
    expect(viaA).toEqual({ result: { sent: true } });
    expect(auto).toHaveBeenCalledTimes(1);

    // Host B has no grant — its intent must reach the modal, not the handler.
    act(() => { void ctx!.requestIntent(hostB, 'https://b.example', 'dm', { to: 'x' }); });
    expect(auto).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('head').textContent).toBe('dm');
  });
});

describe('settling an intent is keyed by ID, never by queue position', () => {
  it('delivers a late result to the intent it belongs to, not to whatever is now the head', async () => {
    renderProvider();
    act(() => ctx!.attachHost(hostA, 'https://a.example'));

    let alice: unknown;
    let bob: unknown;
    act(() => {
      void ctx!.requestIntent(hostA, 'https://a.example', 'send', { to: 'alice' }).then((r) => { alice = r; });
      void ctx!.requestIntent(hostA, 'https://a.example', 'send', { to: 'bob' }).then((r) => { bob = r; });
    });

    // The modal rendered for ALICE captured her id. The head then advances, because she was
    // settled some other way while her transfer was still in flight.
    const aliceId = ctx!.pendingIntent!.id;
    act(() => ctx!.rejectIntent(aliceId, ERROR_CODES.USER_REJECTED, 'declined'));
    await waitFor(() => expect(alice).toEqual({ error: { code: ERROR_CODES.USER_REJECTED, message: 'declined' } }));

    // Alice's transfer now resolves. Settling "the head" would hand HER success to BOB — the
    // dApp would be told bob's payment was delivered when nothing was ever sent to bob.
    act(() => ctx!.resolveIntent(aliceId, { success: true, transferId: 'alice-tx' }));
    await waitFor(() => expect(screen.getByTestId('head').textContent).toBe('send'));

    // Bob is untouched and still waiting for his own decision.
    expect(bob).toBeUndefined();
  });
});
