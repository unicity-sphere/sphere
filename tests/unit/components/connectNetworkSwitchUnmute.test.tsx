/**
 * "Do not ask again" and the page-session decline memory must not disagree about who can
 * undo them.
 *
 * A plain "Not now" is remembered in memory for the rest of the page session (spec 2.1);
 * ticking "Do not ask again" writes the PERSISTED mute instead, and that record is the one
 * Connected Sites can list and Unmute. If a tick ALSO recorded the session decline, Unmute
 * would clear the persisted record, report success, and change nothing: the dApp's next
 * connect() would still be refused, unseen, by a set nothing can clear, until a reload. So a
 * decline that asks to be muted is NOT recorded in the session set. The persisted record
 * covers it completely, and Unmute takes effect at once.
 *
 * This drives the real provider, the real modal, the real handler and the real store
 * together, because the property lives in the seams between them: neither the provider tests
 * (no store) nor the handler tests (no provider) can see it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';
import {
  DAPP,
  SUPPRESSED_KEY,
  mismatchCtx,
  networkRejection,
  pinNetworkConfig,
  unpinNetworkConfig,
} from '../../support/networkSwitchFixtures';

vi.mock('../../../src/components/connect/ConnectionApprovalModal', () => ({
  ConnectionApprovalModal: () => null,
}));
vi.mock('../../../src/components/connect/ConnectIntentHandler', () => ({
  ConnectIntentHandler: () => null,
}));
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ isLocked: false, unlock: vi.fn(async () => {}) }),
}));

const ORIGIN = 'https://dapp.example';
const TICK = 'Do not ask again for this site';

/** Fresh module graph under the pinned config: wallet on testnet2, mainnet a real target. */
async function load() {
  vi.resetModules();
  const provider = await import('../../../src/components/connect/ConnectProvider');
  const context = await import('../../../src/components/connect/ConnectContext');
  const handler = await import('../../../src/components/connect/useNetworkMismatchHandler');
  const store = await import('../../../src/utils/network-switch-prompts');
  return { provider, context, handler, store };
}

type Loaded = Awaited<ReturnType<typeof load>>;

/** Mount the provider and build the handler exactly as a host does, over its live context. */
function mount(loaded: Loaded) {
  const seen: { ctx: ReturnType<typeof loaded.context.useConnectContext> | null } = { ctx: null };
  function Probe() {
    seen.ctx = loaded.context.useConnectContext();
    return null;
  }
  render(
    <loaded.provider.ConnectProvider>
      <Probe />
    </loaded.provider.ConnectProvider>,
  );

  const host = { walletState: 'live' } as unknown as ConnectHost;
  const note = loaded.handler.createSwitchRefusalNote();
  const asked = vi.fn();
  const handle = loaded.handler.createNetworkMismatchHandler({
    host,
    origin: ORIGIN,
    note,
    requestNetworkSwitch: (h, o, offer, expiresAt) => {
      asked();
      return seen.ctx!.requestNetworkSwitch(h, o, offer, expiresAt);
    },
    switchNetwork: vi.fn(),
  });
  act(() => seen.ctx!.attachHost(host, ORIGIN));
  return { handle, note, asked };
}

/** One dApp handshake against a wallet on another network, driven through the handler. */
const handshake = (handle: ReturnType<typeof mount>['handle']) => handle(DAPP, mismatchCtx());

const promptIsOpen = () => screen.queryByTestId('network-switch-prompt') !== null;

/** Wait until the prompt for a pending handshake is on screen. */
const promptShown = () => screen.findByTestId('network-switch-prompt');

beforeEach(() => {
  pinNetworkConfig();
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  unpinNetworkConfig();
  localStorage.clear();
  sessionStorage.clear();
});

describe('a decline WITH the "do not ask again" tick', () => {
  it('writes the mute and is refused by the STORE afterwards, not by the session set', async () => {
    const loaded = await load();
    const { handle, note, asked } = mount(loaded);

    const first = handshake(handle);
    await promptShown();
    fireEvent.click(screen.getByLabelText(TICK));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    });
    expect(await first).toEqual({ action: 'refuse' });
    expect(loaded.store.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
    expect(asked).toHaveBeenCalledTimes(1);

    // The next connect() never reaches the provider: the store refuses it, and says why.
    expect(await handshake(handle)).toEqual({ action: 'refuse' });
    expect(asked).toHaveBeenCalledTimes(1);
    expect(note.take(networkRejection().data)).toBe('suppressed');
    expect(promptIsOpen()).toBe(false);
  });

  it('is asked again straight after Unmute, with no reload: Unmute changes something', async () => {
    const loaded = await load();
    const { handle, asked } = mount(loaded);

    const first = handshake(handle);
    await promptShown();
    fireEvent.click(screen.getByLabelText(TICK));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    });
    await first;
    expect(loaded.store.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);

    // What the Unmute control in Connected Sites calls.
    expect(loaded.store.clearSwitchPromptSuppression(ORIGIN)).toBe(true);
    expect(loaded.store.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);

    const again = handshake(handle);
    await promptShown(); // the prompt is back: nothing else was still refusing this pair
    expect(asked).toHaveBeenCalledTimes(2);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    });
    expect(await again).toEqual({ action: 'refuse' });
  });
});

describe('a decline WITHOUT the tick', () => {
  it('is remembered for the session and writes nothing to storage', async () => {
    const loaded = await load();
    const { handle, note, asked } = mount(loaded);

    const first = handshake(handle);
    await promptShown();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    });
    expect(await first).toEqual({ action: 'refuse' });
    expect(localStorage.getItem(SUPPRESSED_KEY)).toBeNull();
    expect(loaded.store.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);

    // The next connect() reaches the provider and is refused there, unseen, by the session set.
    expect(await handshake(handle)).toEqual({ action: 'refuse' });
    expect(asked).toHaveBeenCalledTimes(2);
    expect(promptIsOpen()).toBe(false);
    expect(localStorage.getItem(SUPPRESSED_KEY)).toBeNull();
    // Not the mute's reason: nothing persistent was written, so nothing claims one.
    expect(note.take(networkRejection().data)).toBeUndefined();
  });
});
