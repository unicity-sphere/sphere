/**
 * The network-switch prompt is a THIRD consent surface, and it is queued and
 * settled exactly like the connection-approval and intent surfaces: an entry
 * carries the `resolve` of a promise the SDK host is awaiting, and every path
 * out of the queue settles it exactly once.
 *
 * Two facts travel in the answer, independently: whether to switch now, and
 * whether this origin may ask again. So the one thing these tests police above
 * all is that a refusal the user NEVER SAW (locked, another modal up, a second
 * request, a closing host) resolves `{ accepted: false, suppressFuturePrompts:
 * false }` — a refusal nobody saw must never be recorded as a decision they made.
 *
 * The real prompt modal is rendered (only the other two surfaces are stubbed),
 * so accept / decline / the checkbox are driven through real clicks and the
 * provider-to-modal wiring is exercised rather than assumed.
 */
import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';

const sphereMock = vi.hoisted(() => ({ isLocked: false }));

vi.mock('../../../src/components/connect/ConnectionApprovalModal', () => ({
  ConnectionApprovalModal: () => null,
}));
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ isLocked: sphereMock.isLocked, unlock: vi.fn(async () => {}) }),
}));
vi.mock('../../../src/components/connect/ConnectIntentHandler', async () => {
  const { useConnectContext } = await import('../../../src/components/connect/ConnectContext');
  return {
    ConnectIntentHandler: () => {
      const { pendingIntent } = useConnectContext();
      return pendingIntent ? <div data-testid="intent-modal">{pendingIntent.action}</div> : null;
    },
  };
});

import { ConnectProvider } from '../../../src/components/connect/ConnectProvider';
import {
  useConnectContext,
  type ConnectContextValue,
  type NetworkSwitchAnswer,
  type PendingNetworkSwitch,
} from '../../../src/components/connect/ConnectContext';
import { clearConnectHosts } from '../../../src/sdk/connectHostRegistry';

const hostA = { id: 'A' } as unknown as ConnectHost;
const hostB = { id: 'B' } as unknown as ConnectHost;
const ORIGIN_A = 'https://a.example';
const ORIGIN_B = 'https://b.example';

const OFFER: PendingNetworkSwitch['offer'] = {
  kind: 'offer',
  target: 'testnet2',
  targetLabel: 'Testnet',
  currentLabel: 'Mainnet',
  isMainnet: false,
};

const UNSEEN: NetworkSwitchAnswer = { accepted: false, suppressFuturePrompts: false };

let ctx: ConnectContextValue | null = null;
function Probe() {
  ctx = useConnectContext();
  return null;
}

function tree() {
  return (
    <ConnectProvider>
      <Probe />
    </ConnectProvider>
  );
}

/** Ask for a switch and record every settlement, so "exactly once" is countable. */
function ask(host: ConnectHost, origin: string): ReturnType<typeof vi.fn> {
  const settled = vi.fn();
  act(() => {
    void ctx!.requestNetworkSwitch(host, origin, OFFER).then(settled);
  });
  return settled;
}

/** Let any pending promise callbacks run. */
const flush = () => act(async () => { await Promise.resolve(); });

beforeEach(() => {
  ctx = null;
  sphereMock.isLocked = false;
  clearConnectHosts();
});
afterEach(() => clearConnectHosts());

describe('network-switch prompt queue', () => {
  it('renders the prompt for a queued request and resolves accepted on accept', async () => {
    render(tree());
    act(() => ctx!.attachHost(hostA, ORIGIN_A));

    const settled = ask(hostA, ORIGIN_A);
    expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
    expect(screen.getByTestId('network-switch-verified-origin').textContent).toBe(ORIGIN_A);
    await flush();
    expect(settled).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Testnet' }));
    await flush();

    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith({ accepted: true, suppressFuturePrompts: false });
    expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
  });

  it('resolves declined, and not muted, on Not now', async () => {
    render(tree());
    act(() => ctx!.attachHost(hostA, ORIGIN_A));

    const settled = ask(hostA, ORIGIN_A);
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    await flush();

    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith({ accepted: false, suppressFuturePrompts: false });
    expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
  });

  it('carries the checkbox through the provider: mute while accepting, mute while declining', async () => {
    render(tree());
    act(() => ctx!.attachHost(hostA, ORIGIN_A));

    const accepted = ask(hostA, ORIGIN_A);
    fireEvent.click(screen.getByLabelText('Do not ask again for this site'));
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Testnet' }));
    await flush();
    expect(accepted).toHaveBeenCalledWith({ accepted: true, suppressFuturePrompts: true });

    // The next prompt starts unticked: a mute must never leak from one prompt to the next.
    const declined = ask(hostA, ORIGIN_A);
    expect((screen.getByLabelText('Do not ask again for this site') as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByLabelText('Do not ask again for this site'));
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    await flush();
    expect(declined).toHaveBeenCalledWith({ accepted: false, suppressFuturePrompts: true });
  });

  it('admits the next request once the previous prompt is answered', async () => {
    render(tree());
    act(() => ctx!.attachHost(hostA, ORIGIN_A));

    ask(hostA, ORIGIN_A);
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    await flush();

    const second = ask(hostA, ORIGIN_A);
    expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
    await flush();
    expect(second).not.toHaveBeenCalled(); // queued and shown, not refused
  });

  describe('admission: refused without the user ever seeing a prompt', () => {
    it('refuses a second request while one is open, immediately, and never queues it', async () => {
      render(tree());
      act(() => {
        ctx!.attachHost(hostA, ORIGIN_A);
        ctx!.attachHost(hostB, ORIGIN_B);
      });

      const first = ask(hostA, ORIGIN_A);
      const firstId = ctx!.pendingNetworkSwitch!.id;
      const second = ask(hostB, ORIGIN_B);
      await flush();

      // Refused on the spot — without anyone touching the modal.
      expect(second).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledWith(UNSEEN);
      // The open prompt is untouched: still the first request's, still awaiting.
      expect(first).not.toHaveBeenCalled();
      expect(ctx!.pendingNetworkSwitch!.id).toBe(firstId);
      expect(screen.getByTestId('network-switch-verified-origin').textContent).toBe(ORIGIN_A);

      // Answering the open prompt must not surface the refused one behind it.
      fireEvent.click(screen.getByRole('button', { name: 'Switch to Testnet' }));
      await flush();
      expect(first).toHaveBeenCalledTimes(1);
      expect(first).toHaveBeenCalledWith({ accepted: true, suppressFuturePrompts: false });
      expect(second).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
      expect(ctx!.pendingNetworkSwitch).toBeNull();
    });

    it('refuses while a connection approval is up, then admits once it is settled', async () => {
      render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));

      act(() => {
        void ctx!.requestApproval(hostA, { name: 'App', url: ORIGIN_A }, [], ORIGIN_A);
      });
      expect(ctx!.pendingApproval).not.toBeNull();

      const refused = ask(hostA, ORIGIN_A);
      await flush();

      expect(refused).toHaveBeenCalledTimes(1);
      expect(refused).toHaveBeenCalledWith(UNSEEN);
      expect(ctx!.pendingNetworkSwitch).toBeNull();
      expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
      expect(ctx!.pendingApproval).not.toBeNull(); // the approval is not disturbed

      act(() => ctx!.denyConnection());
      const admitted = ask(hostA, ORIGIN_A);
      expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
      await flush();
      expect(admitted).not.toHaveBeenCalled();
    });

    it('refuses while an intent modal is up, then admits once it is settled', async () => {
      render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));

      let intentSettled = false;
      act(() => {
        void ctx!.requestIntent(hostA, ORIGIN_A, 'send', {}).then(() => { intentSettled = true; });
      });
      expect(screen.getByTestId('intent-modal')).toBeDefined();

      const refused = ask(hostA, ORIGIN_A);
      await flush();

      expect(refused).toHaveBeenCalledTimes(1);
      expect(refused).toHaveBeenCalledWith(UNSEEN);
      expect(ctx!.pendingNetworkSwitch).toBeNull();
      expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
      // The intent is still on screen and still awaited.
      expect(screen.getByTestId('intent-modal')).toBeDefined();
      expect(intentSettled).toBe(false);

      act(() => ctx!.resolveIntent(ctx!.pendingIntent!.id, { ok: true }));
      const admitted = ask(hostA, ORIGIN_A);
      expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
      await flush();
      expect(admitted).not.toHaveBeenCalled();
    });

    it('refuses while the wallet is locked, without queueing', async () => {
      sphereMock.isLocked = true;
      render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));

      const refused = ask(hostA, ORIGIN_A);
      await flush();

      expect(refused).toHaveBeenCalledTimes(1);
      expect(refused).toHaveBeenCalledWith(UNSEEN);
      expect(ctx!.pendingNetworkSwitch).toBeNull();
      expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
    });

    it('sees a lock that landed after mount, on the very next request', async () => {
      const { rerender } = render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));

      sphereMock.isLocked = true;
      await act(async () => { rerender(tree()); });

      const refused = ask(hostA, ORIGIN_A);
      await flush();
      expect(refused).toHaveBeenCalledWith(UNSEEN);
      expect(ctx!.pendingNetworkSwitch).toBeNull();
    });
  });

  describe('settling: every way out of the queue resolves exactly once', () => {
    it('a lock settles the pending request as unseen and unmounts the prompt', async () => {
      const { rerender } = render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));

      const settled = ask(hostA, ORIGIN_A);
      expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
      const pendingId = ctx!.pendingNetworkSwitch!.id;

      sphereMock.isLocked = true;
      await act(async () => { rerender(tree()); });

      await waitFor(() => expect(settled).toHaveBeenCalledTimes(1));
      expect(settled).toHaveBeenCalledWith(UNSEEN);
      expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
      expect(ctx!.pendingNetworkSwitch).toBeNull();

      // Nothing else may settle it a second time.
      act(() => ctx!.answerNetworkSwitch(pendingId, { accepted: true, suppressFuturePrompts: true }));
      act(() => ctx!.releaseHost(hostA));
      await flush();
      expect(settled).toHaveBeenCalledTimes(1);
    });

    it('releaseHost settles a request belonging to that host, as unseen', async () => {
      render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));

      const settled = ask(hostA, ORIGIN_A);
      const pendingId = ctx!.pendingNetworkSwitch!.id;
      expect(screen.getByTestId('network-switch-prompt')).toBeDefined();

      act(() => ctx!.releaseHost(hostA));
      await flush();

      expect(settled).toHaveBeenCalledTimes(1);
      expect(settled).toHaveBeenCalledWith(UNSEEN);
      expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
      expect(ctx!.pendingNetworkSwitch).toBeNull();

      // A late click on a modal that is gone, or a second release, is harmless.
      act(() => ctx!.answerNetworkSwitch(pendingId, { accepted: true, suppressFuturePrompts: false }));
      act(() => ctx!.releaseHost(hostA));
      await flush();
      expect(settled).toHaveBeenCalledTimes(1);
    });

    it('releaseHost leaves another host\'s request alone', async () => {
      render(tree());
      act(() => {
        ctx!.attachHost(hostA, ORIGIN_A);
        ctx!.attachHost(hostB, ORIGIN_B);
      });

      const settled = ask(hostA, ORIGIN_A);
      act(() => ctx!.releaseHost(hostB));
      await flush();

      expect(settled).not.toHaveBeenCalled();
      expect(screen.getByTestId('network-switch-verified-origin').textContent).toBe(ORIGIN_A);

      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
      await flush();
      expect(settled).toHaveBeenCalledTimes(1);
    });

    it('answering by id twice resolves once — the second answer is a no-op', async () => {
      render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));

      const settled = ask(hostA, ORIGIN_A);
      const pendingId = ctx!.pendingNetworkSwitch!.id;

      act(() => ctx!.answerNetworkSwitch(pendingId, { accepted: true, suppressFuturePrompts: false }));
      act(() => ctx!.answerNetworkSwitch(pendingId, { accepted: false, suppressFuturePrompts: true }));
      await flush();

      expect(settled).toHaveBeenCalledTimes(1);
      expect(settled).toHaveBeenCalledWith({ accepted: true, suppressFuturePrompts: false });
    });

    it('answering a stale id does not settle the request that replaced it', async () => {
      render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));

      ask(hostA, ORIGIN_A);
      const staleId = ctx!.pendingNetworkSwitch!.id;
      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
      await flush();

      const current = ask(hostA, ORIGIN_A);
      act(() => ctx!.answerNetworkSwitch(staleId, { accepted: true, suppressFuturePrompts: true }));
      await flush();

      expect(current).not.toHaveBeenCalled();
      expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
    });

    it('resolves exactly once on every path under StrictMode, which double-invokes updaters', async () => {
      const { rerender } = render(<StrictMode>{tree()}</StrictMode>);
      act(() => {
        ctx!.attachHost(hostA, ORIGIN_A);
        ctx!.attachHost(hostB, ORIGIN_B);
      });

      // answer
      const answered = ask(hostA, ORIGIN_A);
      fireEvent.click(screen.getByRole('button', { name: 'Switch to Testnet' }));
      await flush();
      expect(answered).toHaveBeenCalledTimes(1);
      expect(answered).toHaveBeenCalledWith({ accepted: true, suppressFuturePrompts: false });

      // refused: second request while one is open
      const first = ask(hostA, ORIGIN_A);
      const refused = ask(hostB, ORIGIN_B);
      await flush();
      expect(refused).toHaveBeenCalledTimes(1);
      expect(refused).toHaveBeenCalledWith(UNSEEN);

      // released host
      act(() => ctx!.releaseHost(hostA));
      await flush();
      expect(first).toHaveBeenCalledTimes(1);
      expect(first).toHaveBeenCalledWith(UNSEEN);

      // lock
      const locked = ask(hostA, ORIGIN_A);
      sphereMock.isLocked = true;
      await act(async () => { rerender(<StrictMode>{tree()}</StrictMode>); });
      await flush();
      expect(locked).toHaveBeenCalledTimes(1);
      expect(locked).toHaveBeenCalledWith(UNSEEN);
      expect(refused).toHaveBeenCalledTimes(1);
      expect(answered).toHaveBeenCalledTimes(1);
      expect(first).toHaveBeenCalledTimes(1);
    });
  });
});
