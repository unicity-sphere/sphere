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
import { ERROR_CODES } from '@unicitylabs/sphere-sdk/connect';

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
  movesRealFunds: false,
};

// A second target, so "per origin AND target" can be told apart from "per origin".
const MAINNET_OFFER: PendingNetworkSwitch['offer'] = {
  kind: 'offer',
  target: 'mainnet',
  targetLabel: 'Mainnet',
  currentLabel: 'Testnet',
  movesRealFunds: true,
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
function ask(
  host: ConnectHost,
  origin: string,
  expiresAt?: number,
  offer: PendingNetworkSwitch['offer'] = OFFER,
): ReturnType<typeof vi.fn> {
  const settled = vi.fn();
  act(() => {
    void ctx!.requestNetworkSwitch(host, origin, offer, expiresAt).then(settled);
  });
  return settled;
}

/** Ask, then answer the prompt with the modal's own "Not now" button. */
async function askAndDecline(
  host: ConnectHost,
  origin: string,
  offer: PendingNetworkSwitch['offer'] = OFFER,
): Promise<ReturnType<typeof vi.fn>> {
  const settled = ask(host, origin, undefined, offer);
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
  await flush();
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

  it('admits the next request once the previous prompt is answered, unless it is the pair the user just declined', async () => {
    render(tree());
    act(() => {
      ctx!.attachHost(hostA, ORIGIN_A);
      ctx!.attachHost(hostB, ORIGIN_B);
    });

    await askAndDecline(hostA, ORIGIN_A);

    // The slot is free again, so a DIFFERENT origin is admitted...
    const other = ask(hostB, ORIGIN_B);
    expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
    await flush();
    expect(other).not.toHaveBeenCalled(); // queued and shown, not refused

    // ...but the pair the user declined is not asked about again (see the next block).
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Testnet' }));
    await flush();
    const same = ask(hostA, ORIGIN_A);
    await flush();
    expect(same).toHaveBeenCalledWith(UNSEEN);
    expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
  });

  // Spec 2.1 and 6.1: a plain "Not now" is remembered for the rest of the page session, in
  // memory, per origin AND target. Without it a framed app could call connect() in a loop, and
  // each failed handshake would reopen a modal over the whole wallet the moment the user
  // closed the last one: the slot frees on the click, so "one prompt at a time" alone does
  // not bound anything. The persisted "do not ask again" record is a different thing.
  describe('a decline the user made is remembered for the page session', () => {
    it('refuses the same origin and target again, as unseen, without opening a prompt', async () => {
      render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));

      const declined = await askAndDecline(hostA, ORIGIN_A);
      expect(declined).toHaveBeenCalledWith({ accepted: false, suppressFuturePrompts: false });

      const again = ask(hostA, ORIGIN_A);
      await flush();

      // Answered on the spot, and NOT as a mute: nobody saw this refusal, so it must not be
      // recorded as a choice the user made.
      expect(again).toHaveBeenCalledTimes(1);
      expect(again).toHaveBeenCalledWith(UNSEEN);
      expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
      expect(ctx!.pendingNetworkSwitch).toBeNull();
    });

    it('bounds a framed app that calls connect() in a loop: the user is asked once, not once per call', async () => {
      render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));

      const first = ask(hostA, ORIGIN_A);
      expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
      await flush();
      expect(first).toHaveBeenCalledTimes(1);

      const repeats = Array.from({ length: 25 }, () => ask(hostA, ORIGIN_A));
      await flush();

      for (const repeat of repeats) expect(repeat).toHaveBeenCalledWith(UNSEEN);
      // No modal was raised by any of them, at any point.
      expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
      expect(ctx!.pendingNetworkSwitch).toBeNull();
    });

    it('is keyed by origin AND target: another target, or another origin, is still admitted', async () => {
      render(tree());
      act(() => {
        ctx!.attachHost(hostA, ORIGIN_A);
        ctx!.attachHost(hostB, ORIGIN_B);
      });
      await askAndDecline(hostA, ORIGIN_A); // A + testnet2 declined

      // Same origin, different target.
      const otherTarget = ask(hostA, ORIGIN_A, undefined, MAINNET_OFFER);
      expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
      expect(screen.getByTestId('network-switch-verified-origin').textContent).toBe(ORIGIN_A);
      await flush();
      expect(otherTarget).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Not now' })); // A + mainnet declined
      await flush();

      // Different origin, the same target as the first decline.
      const otherOrigin = ask(hostB, ORIGIN_B);
      expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
      expect(screen.getByTestId('network-switch-verified-origin').textContent).toBe(ORIGIN_B);
      await flush();
      expect(otherOrigin).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Not now' })); // B + testnet2 declined
      await flush();

      // And each declined pair stays declined, not just the latest one.
      for (const [origin, offer] of [
        [ORIGIN_A, OFFER],
        [ORIGIN_A, MAINNET_OFFER],
        [ORIGIN_B, OFFER],
      ] as const) {
        const refused = ask(hostA, origin, undefined, offer);
        await flush();
        expect(refused).toHaveBeenCalledWith(UNSEEN);
      }
      expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
    });

    it('remembers a dismissal by the close button or the backdrop, which is a decline too', async () => {
      render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));

      ask(hostA, ORIGIN_A);
      fireEvent.click(screen.getByTestId('modal-backdrop'));
      await flush();

      const again = ask(hostA, ORIGIN_A);
      await flush();
      expect(again).toHaveBeenCalledWith(UNSEEN);
      expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
    });

    it('does not remember an accepted switch', async () => {
      render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));

      ask(hostA, ORIGIN_A);
      fireEvent.click(screen.getByRole('button', { name: 'Switch to Testnet' }));
      await flush();

      const again = ask(hostA, ORIGIN_A);
      expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
      await flush();
      expect(again).not.toHaveBeenCalled();
    });

    it('does not remember a prompt that a lock settled, since the user never answered it', async () => {
      const { rerender } = render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));

      const settled = ask(hostA, ORIGIN_A);
      sphereMock.isLocked = true;
      await act(async () => { rerender(tree()); });
      expect(settled).toHaveBeenCalledWith(UNSEEN);
      sphereMock.isLocked = false;
      await act(async () => { rerender(tree()); });

      const again = ask(hostA, ORIGIN_A);
      expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
      await flush();
      expect(again).not.toHaveBeenCalled();
    });

    it('does not remember a prompt that a closing host settled, since the user never answered it', async () => {
      render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));

      const settled = ask(hostA, ORIGIN_A);
      act(() => ctx!.releaseHost(hostA));
      await flush();
      expect(settled).toHaveBeenCalledWith(UNSEEN);

      act(() => ctx!.attachHost(hostA, ORIGIN_A));
      const again = ask(hostA, ORIGIN_A);
      expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
      await flush();
      expect(again).not.toHaveBeenCalled();
    });

    it('is in-memory only: a remounted provider, which is what a page reload is, starts with none', async () => {
      const first = render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));
      await askAndDecline(hostA, ORIGIN_A);

      const refused = ask(hostA, ORIGIN_A);
      await flush();
      expect(refused).toHaveBeenCalledWith(UNSEEN); // it is remembered while this provider lives

      first.unmount();
      render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));

      const afresh = ask(hostA, ORIGIN_A);
      expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
      await flush();
      expect(afresh).not.toHaveBeenCalled();
    });

    it('writes nothing to storage: the persisted record belongs to the tick alone', async () => {
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      try {
        render(tree());
        act(() => ctx!.attachHost(hostA, ORIGIN_A));
        await askAndDecline(hostA, ORIGIN_A);
        ask(hostA, ORIGIN_A);
        await flush();
        expect(setItem).not.toHaveBeenCalled();
      } finally {
        setItem.mockRestore();
      }
    });
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

    // The prompt's whole trust story is the origin it displays, and the popup passes its raw
    // ?origin= query parameter. A value that is not the canonical form of one origin ('null'
    // is every sandboxed frame, '*' is allow-all, a path or an upper-case host is not what the
    // transport compares against) names nobody in particular, so nobody is asked on its behalf.
    it.each([
      ['the empty string', ''],
      ["'null' (every opaque or sandboxed frame)", 'null'],
      ["'*' (allow-all)", '*'],
      ['a path', 'https://a.example/path'],
      ['a trailing slash', 'https://a.example/'],
      ['an upper-case host', 'https://A.example'],
      ['a default port', 'https://a.example:443'],
      ['something that is not a URL', 'not a url'],
    ])('refuses %s as an origin, immediately, and never shows a prompt', async (_label, origin) => {
      render(tree());
      act(() => ctx!.attachHost(hostA, ORIGIN_A));

      const refused = ask(hostA, origin);
      await flush();

      expect(refused).toHaveBeenCalledTimes(1);
      expect(refused).toHaveBeenCalledWith(UNSEEN);
      expect(ctx!.pendingNetworkSwitch).toBeNull();
      expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
    });

    it('admits a canonical origin with a port, which is what a dev server sends', async () => {
      render(tree());
      act(() => ctx!.attachHost(hostA, 'http://localhost:5173'));

      const settled = ask(hostA, 'http://localhost:5173');
      expect(screen.getByTestId('network-switch-verified-origin').textContent).toBe('http://localhost:5173');
      await flush();
      expect(settled).not.toHaveBeenCalled();
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

  // The refusals above stop the PROMPT opening over another surface. This is the other
  // direction. Both modals paint at one z-index and the prompt paints last, so an approval or
  // an intent that opened underneath it would be revealed, live, exactly where "Switch to X"
  // was the moment the user clicked it: a swap under a stationary cursor, the hazard the
  // intent settle shield exists for. So while the prompt is open neither may open a modal.
  describe('admission the other way: nothing opens a modal under an open prompt', () => {
    const APP = { name: 'App', url: ORIGIN_B };

    it('refuses a connection approval on the spot, and leaves the open prompt alone', async () => {
      render(tree());
      act(() => {
        ctx!.attachHost(hostA, ORIGIN_A);
        ctx!.attachHost(hostB, ORIGIN_B);
      });
      const prompt = ask(hostA, ORIGIN_A);
      const promptId = ctx!.pendingNetworkSwitch!.id;

      const approval = vi.fn();
      act(() => {
        void ctx!.requestApproval(hostB, APP, [], ORIGIN_B).then(approval);
      });
      await flush();

      // Denied without ever being shown, and never queued behind the prompt.
      expect(approval).toHaveBeenCalledTimes(1);
      expect(approval).toHaveBeenCalledWith({ approved: false, grantedPermissions: [] });
      expect(ctx!.pendingApproval).toBeNull();
      expect(prompt).not.toHaveBeenCalled();
      expect(ctx!.pendingNetworkSwitch!.id).toBe(promptId);

      // Answering the prompt must not reveal an approval that was waiting behind it.
      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
      await flush();
      expect(ctx!.pendingApproval).toBeNull();
      expect(approval).toHaveBeenCalledTimes(1);
    });

    it('refuses an intent that needs a modal, as cancelled with nothing done, and shows none', async () => {
      render(tree());
      act(() => {
        ctx!.attachHost(hostA, ORIGIN_A);
        ctx!.attachHost(hostB, ORIGIN_B);
      });
      const prompt = ask(hostA, ORIGIN_A);

      const intent = vi.fn();
      act(() => {
        void ctx!.requestIntent(hostB, ORIGIN_B, 'send', {}).then(intent);
      });
      await flush();

      expect(intent).toHaveBeenCalledTimes(1);
      const answer = intent.mock.calls[0]![0] as { result?: unknown; error?: { code: number } };
      expect(answer.result).toBeUndefined();
      // INTENT_CANCELLED, not WALLET_LOCKED (which invites a retry after an unlock that is not
      // coming) and not INTENT_OUTCOME_UNKNOWN (which says the wallet may have acted): the
      // wallet never started anything.
      expect(answer.error?.code).toBe(ERROR_CODES.INTENT_CANCELLED);
      expect(ctx!.pendingIntent).toBeNull();
      expect(screen.queryByTestId('intent-modal')).toBeNull();
      expect(prompt).not.toHaveBeenCalled();
      expect(screen.getByTestId('network-switch-prompt')).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
      await flush();
      expect(screen.queryByTestId('intent-modal')).toBeNull();
      expect(intent).toHaveBeenCalledTimes(1);
    });

    it('still answers an auto-approved intent: it opens no modal, so there is nothing to swap in', async () => {
      render(tree());
      act(() => {
        ctx!.attachHost(hostA, ORIGIN_A);
        ctx!.attachHost(hostB, ORIGIN_B);
        ctx!.registerAutoIntent(hostB, 'send', async () => ({ result: { auto: true } }));
      });
      ask(hostA, ORIGIN_A);

      const intent = vi.fn();
      act(() => {
        void ctx!.requestIntent(hostB, ORIGIN_B, 'send', {}).then(intent);
      });
      await flush();

      expect(intent).toHaveBeenCalledWith({ result: { auto: true } });
      expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
    });

    it('admits an approval and an intent again once the prompt is gone', async () => {
      render(tree());
      act(() => {
        ctx!.attachHost(hostA, ORIGIN_A);
        ctx!.attachHost(hostB, ORIGIN_B);
      });
      ask(hostA, ORIGIN_A);
      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
      await flush();

      act(() => {
        void ctx!.requestApproval(hostB, APP, [], ORIGIN_B);
        void ctx!.requestIntent(hostB, ORIGIN_B, 'send', {});
      });
      expect(ctx!.pendingApproval).not.toBeNull();
      expect(ctx!.pendingIntent).not.toBeNull();
    });

    it('does not make approvals refuse each other: they still queue behind one another', async () => {
      render(tree());
      act(() => {
        ctx!.attachHost(hostA, ORIGIN_A);
        ctx!.attachHost(hostB, ORIGIN_B);
      });
      const first = vi.fn();
      const second = vi.fn();
      act(() => {
        void ctx!.requestApproval(hostA, APP, [], ORIGIN_A).then(first);
        void ctx!.requestApproval(hostB, APP, [], ORIGIN_B).then(second);
      });
      await flush();

      expect(first).not.toHaveBeenCalled();
      expect(second).not.toHaveBeenCalled(); // queued, not refused
      act(() => ctx!.denyConnection());
      await flush();
      expect(first).toHaveBeenCalledTimes(1);
      expect(ctx!.pendingApproval).not.toBeNull(); // the second is now at the head
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

      // Another origin: the pair just declined would be refused, not queued.
      const current = ask(hostB, ORIGIN_B);
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

describe('dismissal through the provider', () => {
  it('a backdrop click resolves declined and NOT muted, even with the box ticked', async () => {
    render(tree());
    act(() => ctx!.attachHost(hostA, ORIGIN_A));

    const settled = ask(hostA, ORIGIN_A);
    fireEvent.click(screen.getByLabelText('Do not ask again for this site'));
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    await flush();

    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith({ accepted: false, suppressFuturePrompts: false });
    expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
  });
});

/**
 * The provider frees the slot of a prompt nobody is listening to any more. The SDK
 * host answers its own refusal at ctx.expiresAt and has no way to tell the wallet, so
 * without this an abandoned prompt would sit for the life of the page and refuse every
 * OTHER origin as unseen. It is not what stops a late accept: a user can answer in the
 * last instant before the timer fires, and the handler re-checks the deadline itself.
 *
 * Timers only (setTimeout, clearTimeout, Date), so nothing else in the tree is slowed.
 */
describe('deadline: an abandoned prompt frees its slot', () => {
  const MINUTE = 60_000;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const advance = (ms: number) => act(async () => { vi.advanceTimersByTime(ms); });

  it('settles an open prompt as unseen when the deadline passes, and takes the modal down', async () => {
    render(tree());
    act(() => ctx!.attachHost(hostA, ORIGIN_A));

    const settled = ask(hostA, ORIGIN_A, Date.now() + 1_000);
    expect(screen.getByTestId('network-switch-prompt')).toBeDefined();

    await advance(999);
    expect(settled).not.toHaveBeenCalled();
    expect(screen.getByTestId('network-switch-prompt')).toBeDefined();

    await advance(1);
    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith(UNSEEN);
    expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
    expect(ctx!.pendingNetworkSwitch).toBeNull();
  });

  it('does not remember a prompt the deadline settled, since the user never answered it', async () => {
    // Only the user's own answer is a decision. A prompt taken down by the timer was never
    // declined by anyone, so the same origin must be asked again on its next attempt.
    render(tree());
    act(() => ctx!.attachHost(hostA, ORIGIN_A));

    const settled = ask(hostA, ORIGIN_A, Date.now() + 1_000);
    await advance(1_000);
    expect(settled).toHaveBeenCalledWith(UNSEEN);

    const again = ask(hostA, ORIGIN_A);
    expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
    await flush();
    expect(again).not.toHaveBeenCalled();
  });

  it('frees the slot: another origin is admitted once the abandoned prompt is gone', async () => {
    render(tree());
    act(() => {
      ctx!.attachHost(hostA, ORIGIN_A);
      ctx!.attachHost(hostB, ORIGIN_B);
    });

    ask(hostA, ORIGIN_A, Date.now() + MINUTE);
    const whileOpen = ask(hostB, ORIGIN_B);
    await flush();
    expect(whileOpen).toHaveBeenCalledWith(UNSEEN); // refused: the slot is taken

    await advance(MINUTE);
    const afterwards = ask(hostB, ORIGIN_B);
    expect(screen.getByTestId('network-switch-verified-origin').textContent).toBe(ORIGIN_B);
    await flush();
    expect(afterwards).not.toHaveBeenCalled(); // queued and shown this time
  });

  it('a normal answer clears the timer, and the old deadline never touches a later prompt', async () => {
    render(tree());
    act(() => {
      ctx!.attachHost(hostA, ORIGIN_A);
      ctx!.attachHost(hostB, ORIGIN_B);
    });
    const baseline = vi.getTimerCount();

    const first = ask(hostA, ORIGIN_A, Date.now() + MINUTE);
    expect(vi.getTimerCount()).toBe(baseline + 1);

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Testnet' }));
    await flush();
    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith({ accepted: true, suppressFuturePrompts: false });
    expect(vi.getTimerCount()).toBe(baseline); // cleared, not merely ignored

    const second = ask(hostB, ORIGIN_B); // no deadline of its own
    await advance(2 * MINUTE);
    expect(second).not.toHaveBeenCalled();
    expect(screen.getByTestId('network-switch-verified-origin').textContent).toBe(ORIGIN_B);
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('a lock settles the prompt and clears its timer, and the deadline then settles nothing twice', async () => {
    const { rerender } = render(tree());
    act(() => ctx!.attachHost(hostA, ORIGIN_A));
    const baseline = vi.getTimerCount();

    const settled = ask(hostA, ORIGIN_A, Date.now() + MINUTE);
    expect(vi.getTimerCount()).toBe(baseline + 1);

    sphereMock.isLocked = true;
    await act(async () => { rerender(tree()); });
    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith(UNSEEN);
    expect(vi.getTimerCount()).toBe(baseline);

    await advance(2 * MINUTE);
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it('releaseHost settles the prompt and clears its timer', async () => {
    render(tree());
    act(() => ctx!.attachHost(hostA, ORIGIN_A));
    const baseline = vi.getTimerCount();

    const settled = ask(hostA, ORIGIN_A, Date.now() + MINUTE);
    act(() => ctx!.releaseHost(hostA));
    await flush();

    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith(UNSEEN);
    expect(vi.getTimerCount()).toBe(baseline);

    await advance(2 * MINUTE);
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it('a deadline that has already passed is refused on the spot and never queued or armed', async () => {
    render(tree());
    act(() => ctx!.attachHost(hostA, ORIGIN_A));
    const baseline = vi.getTimerCount();

    // The past, this very instant, and a value that is not a time at all: with no
    // deadline to trust the host has already stopped waiting, so nobody is asked.
    for (const expiresAt of [Date.now() - 1, Date.now(), Number.NaN]) {
      const refused = ask(hostA, ORIGIN_A, expiresAt);
      await flush();
      expect(refused).toHaveBeenCalledTimes(1);
      expect(refused).toHaveBeenCalledWith(UNSEEN);
      expect(ctx!.pendingNetworkSwitch).toBeNull();
      expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
    }
    expect(vi.getTimerCount()).toBe(baseline);
  });

  it('with no deadline nothing is armed, and the prompt stays', async () => {
    render(tree());
    act(() => ctx!.attachHost(hostA, ORIGIN_A));
    const baseline = vi.getTimerCount();

    const settled = ask(hostA, ORIGIN_A);
    expect(vi.getTimerCount()).toBe(baseline);

    await advance(24 * 60 * MINUTE);
    expect(settled).not.toHaveBeenCalled();
    expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
  });

  it('a deadline beyond the timer range does not fire at once', async () => {
    // setTimeout reads a delay past 2^31-1 ms as 1 ms, which would dismiss a prompt the
    // instant it opened.
    render(tree());
    act(() => ctx!.attachHost(hostA, ORIGIN_A));

    const settled = ask(hostA, ORIGIN_A, Date.now() + 2 ** 31 + 60_000);
    await advance(1_000);

    expect(settled).not.toHaveBeenCalled();
    expect(screen.getByTestId('network-switch-prompt')).toBeDefined();
  });

  it('unmounting the provider clears the timer', async () => {
    const { unmount } = render(tree());
    act(() => ctx!.attachHost(hostA, ORIGIN_A));
    const baseline = vi.getTimerCount();

    ask(hostA, ORIGIN_A, Date.now() + MINUTE);
    expect(vi.getTimerCount()).toBe(baseline + 1);

    unmount();
    expect(vi.getTimerCount()).toBe(baseline);
  });

  it('settles exactly once at the deadline under StrictMode', async () => {
    render(<StrictMode>{tree()}</StrictMode>);
    act(() => ctx!.attachHost(hostA, ORIGIN_A));

    const settled = ask(hostA, ORIGIN_A, Date.now() + 1_000);
    await advance(1_000);
    await advance(MINUTE);

    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith(UNSEEN);
  });
});
