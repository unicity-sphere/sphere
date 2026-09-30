/**
 * The network-switch prompt anchors trust the way ConnectionApprovalModal does:
 * it names the TRANSPORT-VERIFIED origin, and it takes both network labels from
 * the offer, which was built from the wallet's own table. Nothing the peer sent
 * may reach the screen: a hostile origin can declare mainnet's id under the name
 * "Testnet", and the offer has already resolved that — the modal must not undo
 * it by printing a peer string.
 *
 * The modal only ANSWERS. It never writes the "do not ask again" record; the
 * answer carries `suppressFuturePrompts` and the handler that owns the origin and
 * the target owns the write. Two writers for one record is how they diverge.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NETWORKS } from '@unicitylabs/sphere-sdk';
import type { NetworkType } from '@unicitylabs/sphere-sdk';

// Getter-based, like NetworkModal.test.tsx: the mocked module binding reads the
// holder lazily, so a test can change the wallet's network. Both networks are
// available here so the REAL evaluateSwitchOffer can build a mainnet offer.
const netState = vi.hoisted(() => ({ active: 'testnet2' as NetworkType }));

vi.mock('../../../src/config/network', () => {
  const supported = () => [
    { id: 'testnet2', label: 'Testnet', available: true },
    { id: 'mainnet', label: 'Mainnet', available: true },
  ];
  return {
    get SPHERE_NETWORK() {
      return netState.active;
    },
    get SUPPORTED_NETWORKS() {
      return supported();
    },
    isSwitchableNetwork: (id: string) => supported().some((n) => n.id === id && n.available),
  };
});

interface HoistedPending {
  id: number;
  host: unknown;
  origin: string;
  offer: {
    kind: 'offer';
    target: NetworkType;
    targetLabel: string;
    currentLabel: string;
    isMainnet: boolean;
  };
  resolve: () => void;
  // Peer-supplied decoration that must NEVER render. Not part of the real entry's
  // type; present so a modal that starts reading it would fail the tests below.
  dapp?: { name: string; url: string };
  clientNetwork?: { id: number; name: string };
}

const state = vi.hoisted(() => ({
  pending: null as null | HoistedPending,
  answer: vi.fn(),
}));

vi.mock('../../../src/components/connect/ConnectContext', () => ({
  useConnectContext: () => ({
    pendingNetworkSwitch: state.pending,
    answerNetworkSwitch: state.answer,
  }),
}));

import { NetworkSwitchPromptModal } from '../../../src/components/connect/NetworkSwitchPromptModal';
import { evaluateSwitchOffer } from '../../../src/components/connect/networkSwitchOffer';
import { INTENT_SETTLE_MS } from '../../../src/components/connect/settleWindow';

const TESTNET_OFFER = {
  kind: 'offer' as const,
  target: 'testnet2' as NetworkType,
  targetLabel: 'Testnet',
  currentLabel: 'Mainnet',
  isMainnet: false,
};
const MAINNET_OFFER = {
  kind: 'offer' as const,
  target: 'mainnet' as NetworkType,
  targetLabel: 'Mainnet',
  currentLabel: 'Testnet',
  isMainnet: true,
};

function pend(overrides: Partial<HoistedPending> = {}): HoistedPending {
  return {
    id: 7,
    host: {},
    origin: 'https://app.example',
    offer: TESTNET_OFFER,
    resolve: () => {},
    ...overrides,
  };
}

const bodyText = () => document.body.textContent ?? '';

/** Let the settle window that guards the mainnet Continue button elapse. */
const settle = () => act(() => { vi.advanceTimersByTime(INTENT_SETTLE_MS); });

beforeEach(() => {
  state.pending = null;
  state.answer.mockReset();
  netState.active = 'testnet2';
  // Only the timers the settle window uses, so nothing else in the tree is slowed.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('NetworkSwitchPromptModal', () => {
  it('renders nothing when nothing is pending', () => {
    const { container } = render(<NetworkSwitchPromptModal />);
    expect(container.innerHTML).toBe('');
    expect(screen.queryByTestId('network-switch-prompt')).toBeNull();
  });

  describe('trust anchor', () => {
    it('names the transport-verified origin and never the dApp-reported name or url', () => {
      state.pending = pend({
        origin: 'https://evil.attacker.example',
        dapp: { name: 'Totally Legit Wallet', url: 'https://accounts.google.com' },
      });

      render(<NetworkSwitchPromptModal />);

      expect(screen.getByTestId('network-switch-verified-origin').textContent).toBe(
        'https://evil.attacker.example',
      );
      expect(bodyText()).not.toContain('Totally Legit Wallet');
      expect(bodyText()).not.toContain('accounts.google.com');
    });

    it('takes both labels from the offer, and a peer-declared network name never appears', () => {
      state.pending = pend({
        offer: { ...TESTNET_OFFER, targetLabel: 'Testnet', currentLabel: 'Mainnet' },
        clientNetwork: { id: 4, name: 'Free-Money-Net' },
        dapp: { name: 'Free-Money-Net', url: 'https://x.example' },
      });

      render(<NetworkSwitchPromptModal />);

      expect(bodyText()).toContain('runs on Testnet. Your wallet is on Mainnet.');
      expect(bodyText()).not.toContain('Free-Money-Net');
    });

    it('a hostile origin that names mainnet "Testnet" is still shown as Mainnet, through the real offer builder', () => {
      // The attack: the peer declares MAINNET's id under the name "Testnet",
      // hoping the prompt reads "switch to Testnet" and a click lands on real funds.
      const offer = evaluateSwitchOffer({
        clientNetwork: { id: NETWORKS.mainnet.networkId as number, name: 'Testnet' },
        walletNetwork: { id: NETWORKS.testnet2.networkId as number, name: 'testnet2' },
        suppressed: false,
      });
      expect(offer.kind).toBe('offer');
      if (offer.kind !== 'offer') return;

      state.pending = pend({ offer });
      render(<NetworkSwitchPromptModal />);

      expect(bodyText()).toContain(`runs on ${NETWORKS.mainnet.name}. Your wallet is on ${NETWORKS.testnet2.name}.`);
      expect(screen.getByRole('button', { name: `Switch to ${NETWORKS.mainnet.name}` })).toBeDefined();
      // ...and clicking it lands on the real-funds step, not on an answer.
      fireEvent.click(screen.getByRole('button', { name: `Switch to ${NETWORKS.mainnet.name}` }));
      expect(state.answer).not.toHaveBeenCalled();
      expect(screen.getByTestId('network-switch-mainnet-confirm').textContent).toContain('real funds');
    });
  });

  describe('copy', () => {
    it('uses the exact prompt copy for a non-mainnet target', () => {
      state.pending = pend();
      render(<NetworkSwitchPromptModal />);

      expect(screen.getByText('Switch network?')).toBeDefined();
      expect(bodyText()).toContain('https://app.example runs on Testnet. Your wallet is on Mainnet.');
      expect(bodyText()).toContain(
        'Switching reloads Sphere and disconnects apps connected on Mainnet. Your wallet, keys and balances are not affected.',
      );
      expect(screen.getByLabelText('Do not ask again for this site')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Switch to Testnet' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Not now' })).toBeDefined();
    });
  });

  describe('accepting', () => {
    it('a non-mainnet target has no second step: accept answers at once', () => {
      state.pending = pend();
      render(<NetworkSwitchPromptModal />);

      fireEvent.click(screen.getByRole('button', { name: 'Switch to Testnet' }));

      expect(screen.queryByTestId('network-switch-mainnet-confirm')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
      expect(state.answer).toHaveBeenCalledTimes(1);
      expect(state.answer).toHaveBeenCalledWith(7, { accepted: true, suppressFuturePrompts: false });
    });

    it('accept calls back with the checkbox state', () => {
      state.pending = pend();
      render(<NetworkSwitchPromptModal />);

      fireEvent.click(screen.getByLabelText('Do not ask again for this site'));
      fireEvent.click(screen.getByRole('button', { name: 'Switch to Testnet' }));

      expect(state.answer).toHaveBeenCalledWith(7, { accepted: true, suppressFuturePrompts: true });
    });

    it('a mainnet target needs a second, explicit confirmation naming real funds', () => {
      state.pending = pend({ offer: MAINNET_OFFER });
      render(<NetworkSwitchPromptModal />);

      fireEvent.click(screen.getByRole('button', { name: 'Switch to Mainnet' }));

      // Not answered yet — the click only opened the second step.
      expect(state.answer).not.toHaveBeenCalled();
      const confirm = screen.getByTestId('network-switch-mainnet-confirm');
      expect(confirm.textContent).toContain('Mainnet is the live network.');
      expect(confirm.textContent).toContain('Transactions there move real funds.');
      // The step REPLACES the buttons until confirmed.
      expect(screen.queryByRole('button', { name: 'Switch to Mainnet' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Not now' })).toBeNull();

      settle();
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

      expect(state.answer).toHaveBeenCalledTimes(1);
      expect(state.answer).toHaveBeenCalledWith(7, { accepted: true, suppressFuturePrompts: false });
    });

    it('the mainnet confirmation also carries the checkbox state', () => {
      state.pending = pend({ offer: MAINNET_OFFER });
      render(<NetworkSwitchPromptModal />);

      fireEvent.click(screen.getByLabelText('Do not ask again for this site'));
      fireEvent.click(screen.getByRole('button', { name: 'Switch to Mainnet' }));
      settle();
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

      expect(state.answer).toHaveBeenCalledWith(7, { accepted: true, suppressFuturePrompts: true });
    });

    it('a double-tap on "Switch to Mainnet" cannot walk through both steps as one', () => {
      // The Continue that replaces the button is under the cursor that just
      // clicked it: it must be inert for the settle window (settleWindow.ts).
      state.pending = pend({ offer: MAINNET_OFFER });
      render(<NetworkSwitchPromptModal />);

      fireEvent.click(screen.getByRole('button', { name: 'Switch to Mainnet' }));
      const early = screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement;
      expect(early.disabled).toBe(true);
      fireEvent.click(early);
      expect(state.answer).not.toHaveBeenCalled();

      act(() => { vi.advanceTimersByTime(INTENT_SETTLE_MS - 1); });
      expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true);

      settle();
      expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('Cancel is never held back, and re-entering the step re-arms the window', () => {
      state.pending = pend({ offer: MAINNET_OFFER });
      render(<NetworkSwitchPromptModal />);

      fireEvent.click(screen.getByRole('button', { name: 'Switch to Mainnet' }));
      expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(false);
      settle();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      fireEvent.click(screen.getByRole('button', { name: 'Switch to Mainnet' }));
      expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('Cancel backs out of the second step without answering, and the step is not sticky', () => {
      state.pending = pend({ offer: MAINNET_OFFER });
      render(<NetworkSwitchPromptModal />);

      fireEvent.click(screen.getByRole('button', { name: 'Switch to Mainnet' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(state.answer).not.toHaveBeenCalled();
      expect(screen.queryByTestId('network-switch-mainnet-confirm')).toBeNull();
      expect(screen.getByRole('button', { name: 'Switch to Mainnet' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Not now' })).toBeDefined();

      // Switching again still has to be confirmed again.
      fireEvent.click(screen.getByRole('button', { name: 'Switch to Mainnet' }));
      expect(state.answer).not.toHaveBeenCalled();
    });

    it('a mainnet decline needs no second step', () => {
      state.pending = pend({ offer: MAINNET_OFFER });
      render(<NetworkSwitchPromptModal />);

      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

      expect(state.answer).toHaveBeenCalledTimes(1);
      expect(state.answer).toHaveBeenCalledWith(7, { accepted: false, suppressFuturePrompts: false });
    });
  });

  describe('declining', () => {
    it('decline with the checkbox ticked reports the mute, and decline without it does not', () => {
      state.pending = pend();
      const { unmount } = render(<NetworkSwitchPromptModal />);
      fireEvent.click(screen.getByLabelText('Do not ask again for this site'));
      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
      expect(state.answer).toHaveBeenLastCalledWith(7, { accepted: false, suppressFuturePrompts: true });
      unmount();

      state.answer.mockReset();
      render(<NetworkSwitchPromptModal />);
      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
      expect(state.answer).toHaveBeenLastCalledWith(7, { accepted: false, suppressFuturePrompts: false });
    });

    it('never writes the suppression record itself — the answer carries it to the owner of the write', () => {
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
      state.pending = pend();
      render(<NetworkSwitchPromptModal />);

      fireEvent.click(screen.getByLabelText('Do not ask again for this site'));
      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

      expect(state.answer).toHaveBeenCalledWith(7, { accepted: false, suppressFuturePrompts: true });
      expect(setItem).not.toHaveBeenCalled();
      expect(removeItem).not.toHaveBeenCalled();
    });

    it('dismissing with the close button declines but never mutes, even with the box ticked', () => {
      // A persistent mute must come from an explicit "Not now", not from an
      // accidental dismissal: failing to honour a tick asks again, honouring a
      // stray click hides the prompt for good.
      state.pending = pend();
      render(<NetworkSwitchPromptModal />);

      fireEvent.click(screen.getByLabelText('Do not ask again for this site'));
      // ModalHeader's close control is the only button that is neither of ours.
      const close = screen
        .getAllByRole('button')
        .find((b) => !['Switch to Testnet', 'Not now'].includes(b.textContent ?? ''))!;
      fireEvent.click(close);

      expect(state.answer).toHaveBeenCalledTimes(1);
      expect(state.answer).toHaveBeenCalledWith(7, { accepted: false, suppressFuturePrompts: false });
    });
  });

  describe('per-prompt state', () => {
    it('a new prompt starts unticked and on the first step', () => {
      state.pending = pend({ id: 1, offer: MAINNET_OFFER, origin: 'https://one.example' });
      const { rerender } = render(<NetworkSwitchPromptModal />);
      fireEvent.click(screen.getByLabelText('Do not ask again for this site'));
      fireEvent.click(screen.getByRole('button', { name: 'Switch to Mainnet' }));
      expect(screen.getByTestId('network-switch-mainnet-confirm')).toBeDefined();

      // A different entry reaches the head — one origin's tick and half-way step
      // must not be carried onto another origin's prompt.
      state.pending = pend({ id: 2, offer: MAINNET_OFFER, origin: 'https://two.example' });
      rerender(<NetworkSwitchPromptModal />);

      expect(screen.getByTestId('network-switch-verified-origin').textContent).toBe('https://two.example');
      expect(screen.queryByTestId('network-switch-mainnet-confirm')).toBeNull();
      expect((screen.getByLabelText('Do not ask again for this site') as HTMLInputElement).checked).toBe(false);
    });

    it('answers the entry that is showing, by its id', () => {
      state.pending = pend({ id: 42 });
      render(<NetworkSwitchPromptModal />);

      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

      expect(state.answer).toHaveBeenCalledWith(42, { accepted: false, suppressFuturePrompts: false });
    });
  });
});
