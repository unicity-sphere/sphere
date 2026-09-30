/**
 * The handler both Connect hosts share, against the REAL SDK host.
 *
 * The two host suites (iframeAgentNetworkSwitch, connectPageNetworkSwitch) capture the
 * host's config and call it by hand, which proves the wiring and the arguments. What they
 * cannot prove is the one thing this feature can quietly get wrong: that the SDK's own
 * answer to the dApp goes out BEFORE the wallet reloads. `setActiveNetwork` ends in
 * `window.location.reload()`, the host still has to post its frame through the window that
 * reload destroys, and the failure mode is a dApp that hangs until its own timeout. So the
 * ordering test here runs a real ConnectHost against a real ConnectClient over an
 * in-memory transport and records `frame` and `reload` on ONE timeline.
 *
 * Nothing mocks the decision (the wallet is pinned to testnet2, mainnet is switchable); only
 * the reload, which jsdom cannot perform, goes through the seam `setActiveNetwork` already has.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import type { NetworkMismatchContext } from '@unicitylabs/sphere-sdk/connect';
import {
  DAPP,
  MARKER_KEY,
  freshModules,
  macrotask,
  mismatchCtx,
  networkRejection,
  pinNetworkConfig,
  unpinNetworkConfig,
} from '../../support/networkSwitchFixtures';

const mocks = vi.hoisted(() => ({
  reload: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('../../../src/components/ui/toast-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/components/ui/toast-utils')>();
  return { ...actual, showToast: mocks.showToast };
});

const ORIGIN = 'https://dapp.example';
const SUPPRESSED_KEY = 'sphere_network_switch_suppressed';
const ACTIVE_NETWORK_KEY = 'sphere_active_network';
const ACCEPT = { accepted: true, suppressFuturePrompts: false };

/** Fresh module graph under the pinned config, with everything these tests touch. */
async function load() {
  freshModules(mocks.reload);
  const handler = await import('../../../src/components/connect/useNetworkMismatchHandler');
  const context = await import('../../../src/components/connect/ConnectContext');
  const sdk = await import('@unicitylabs/sphere-sdk/connect');
  const net = await import('../../../src/config/network');
  const store = await import('../../../src/utils/network-switch-prompts');
  return { handler, context, sdk, net, store };
}

type Loaded = Awaited<ReturnType<typeof load>>;

/**
 * The hook, rendered under a Connect context whose `requestNetworkSwitch` the test owns.
 * `current.request` is read each time the wrapper renders, so a test can swap it and
 * rerender to hand the provider a NEW function, as a real re-render would.
 */
function renderFactory(loaded: Loaded, request: ReturnType<typeof vi.fn>) {
  const current = { request };
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      loaded.context.ConnectContext.Provider,
      { value: { requestNetworkSwitch: current.request } as never },
      children,
    );
  const view = renderHook(() => loaded.handler.useNetworkMismatchHandler(), { wrapper });
  return { view, current };
}

const fakeHost = (walletState = 'live') => ({ walletState }) as never;

beforeEach(() => {
  pinNetworkConfig();
  localStorage.clear();
  sessionStorage.clear();
  mocks.reload.mockReset();
  mocks.showToast.mockReset();
});

afterEach(async () => {
  // Let any switch a test scheduled and did not await run NOW, under this test's own
  // storage and reload spy: a timer that fired during the NEXT test would move ITS wallet
  // to mainnet halfway through.
  await macrotask();
  // A spy left behind by a test that failed half way (Storage.setItem) would otherwise
  // poison every test after it.
  vi.restoreAllMocks();
  unpinNetworkConfig();
  localStorage.clear();
  sessionStorage.clear();
});

describe('resolve first, switch after', () => {
  /**
   * One handshake from a mainnet dApp against a wallet on testnet2, on a REAL ConnectHost and
   * ConnectClient over an in-memory transport. Returns ONE timeline of everything whose order
   * matters: the mute landing in storage ('mute'), the host posting its frame ('frame:<code>'),
   * the active network being persisted ('active-network') and the reload ('reload').
   */
  async function handshakeAgainstRealHost(answer: { accepted: boolean; suppressFuturePrompts: boolean }) {
    const loaded = await load();
    const { ConnectHost, ConnectClient, ERROR_CODES } = loaded.sdk;
    const request = vi.fn().mockResolvedValue(answer);
    const { view } = renderFactory(loaded, request);
    const note = loaded.handler.createSwitchRefusalNote();

    const timeline: string[] = [];
    mocks.reload.mockImplementation(() => timeline.push('reload'));
    const realSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (this === localStorage && key === SUPPRESSED_KEY) timeline.push('mute');
      if (this === localStorage && key === ACTIVE_NETWORK_KEY) timeline.push('active-network');
      realSetItem.call(this, key, value);
    });

    // In-memory transport pair. The host side records the frames it POSTS.
    type Msg = { type?: string; direction?: string; error?: { code: number } };
    const hostHandlers = new Set<(msg: Msg) => void>();
    const clientHandlers = new Set<(msg: Msg) => void>();
    const hostTransport = {
      send(msg: Msg) {
        if (msg.type === 'handshake' && msg.direction === 'response') {
          timeline.push(`frame:${msg.error?.code ?? 'ok'}`);
        }
        for (const h of clientHandlers) h(msg);
      },
      onMessage(h: (msg: Msg) => void) {
        hostHandlers.add(h);
        return () => hostHandlers.delete(h);
      },
      destroy() {
        hostHandlers.clear();
      },
    };
    const clientTransport = {
      send(msg: Msg) {
        for (const h of hostHandlers) h(msg);
      },
      onMessage(h: (msg: Msg) => void) {
        clientHandlers.add(h);
        return () => clientHandlers.delete(h);
      },
      destroy() {
        clientHandlers.clear();
      },
    };

    const sphere = {
      identity: { chainPubkey: '02abc123', directAddress: 'DIRECT://test', nametag: 'alice' },
      networkId: 4, // testnet2
      on: vi.fn(() => () => {}),
    };
    // Annotated: the callback below reads `host`, a circular inference otherwise (TS7022).
    const host: InstanceType<typeof ConnectHost> = new ConnectHost({
      sphere,
      transport: hostTransport as never,
      origin: ORIGIN,
      onConnectionRequest: async () => ({ approved: true, grantedPermissions: [] }),
      onIntent: async () => ({}),
      onNetworkMismatch: (dapp, ctx) => view.result.current(host, ORIGIN, note)(dapp, ctx),
    });
    const client = new ConnectClient({
      transport: clientTransport as never,
      dapp: { name: 'd', url: ORIGIN },
      permissions: [],
      network: { id: 1 }, // mainnet, and the wallet is on testnet2
    });

    // The dApp is answered promptly: a host that waited on the wallet and forgot to answer
    // would hang here until the client's own 30 s timeout.
    await expect(client.connect()).rejects.toMatchObject({ code: ERROR_CODES.INCOMPATIBLE_NETWORK });
    await macrotask();

    return { timeline, request, frame: `frame:${ERROR_CODES.INCOMPATIBLE_NETWORK}` };
  }

  it('posts the SDK host frame to the dApp BEFORE the wallet reloads (real ConnectHost, real ConnectClient)', async () => {
    const { timeline, request, frame } = await handshakeAgainstRealHost(ACCEPT);

    expect(request).toHaveBeenCalledOnce();
    expect(timeline).toEqual([frame, 'active-network', 'reload']);
    expect(localStorage.getItem('sphere_active_network')).toBe('mainnet');
  });

  it('writes the mute of a ticked ACCEPT before the frame, the persisted network and the reload', async () => {
    const { timeline, frame } = await handshakeAgainstRealHost({ accepted: true, suppressFuturePrompts: true });

    // The mute lands while the wallet is still on the network the prompt was raised on.
    expect(timeline).toEqual(['mute', frame, 'active-network', 'reload']);
    expect(localStorage.getItem('sphere_active_network')).toBe('mainnet');
  });

  it('resolves before a single timer runs, and switches from the timer', async () => {
    const loaded = await load();
    const request = vi.fn().mockResolvedValue(ACCEPT);
    const { view } = renderFactory(loaded, request);
    const note = loaded.handler.createSwitchRefusalNote();

    const decision = await view.result.current(fakeHost(), ORIGIN, note)(DAPP, mismatchCtx());

    expect(decision).toEqual({ action: 'switch', to: { id: 1 } });
    expect(mocks.reload).not.toHaveBeenCalled();
    await macrotask();
    expect(mocks.reload).toHaveBeenCalledOnce();
  });

  it('answers with the dApp-declared id and nothing else of the peer', async () => {
    const loaded = await load();
    const request = vi.fn().mockResolvedValue(ACCEPT);
    const { view } = renderFactory(loaded, request);
    const note = loaded.handler.createSwitchRefusalNote();

    // Mainnet's id wearing testnet's label: the id decides, the name is never read.
    const decision = await view.result.current(fakeHost(), ORIGIN, note)(
      DAPP,
      mismatchCtx({ clientNetwork: { id: 1, name: 'Testnet' } }),
    );

    expect(decision).toEqual({ action: 'switch', to: { id: 1 } });
    const [, , offer] = request.mock.calls[0]!;
    expect(offer).toMatchObject({ target: 'mainnet', targetLabel: 'Mainnet', isMainnet: true });
    expect(JSON.stringify(request.mock.calls[0]!.slice(1))).not.toContain(DAPP.name);
  });

  it('hands the host\'s deadline to the prompt, so the provider can free the slot when it passes', async () => {
    const loaded = await load();
    const request = vi.fn().mockResolvedValue(ACCEPT);
    const { view } = renderFactory(loaded, request);
    const note = loaded.handler.createSwitchRefusalNote();
    const ctx = mismatchCtx({ expiresAt: Date.now() + 12_345 });

    await view.result.current(fakeHost(), ORIGIN, note)(DAPP, ctx);

    // The fourth argument, exactly as the SDK supplied it. No SDK signal exists; this is
    // the only way the wallet learns the host stopped waiting.
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0]![3]).toBe(ctx.expiresAt);
  });

  it('tells the user when the switch itself fails, after the host has already said it is switching', async () => {
    const loaded = await load();
    const request = vi.fn().mockResolvedValue(ACCEPT);
    const { view } = renderFactory(loaded, request);
    const note = loaded.handler.createSwitchRefusalNote();
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage) {
      if (this === localStorage) throw new Error('quota');
    });

    const decision = await view.result.current(fakeHost(), ORIGIN, note)(DAPP, mismatchCtx());
    await macrotask();
    setItem.mockRestore();

    expect(decision).toEqual({ action: 'switch', to: { id: 1 } });
    expect(mocks.reload).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalledWith(
      expect.stringContaining('Could not switch to Mainnet'),
      'error',
      undefined,
      expect.objectContaining({ cause: expect.any(Error) }),
    );
  });
});

describe('the deadline', () => {
  it.each([
    ['already past', Date.now() - 1],
    ['missing', undefined],
    ['not a number', Number.NaN],
  ])('refuses without prompting when the deadline is %s', async (_label, expiresAt) => {
    const loaded = await load();
    const request = vi.fn().mockResolvedValue(ACCEPT);
    const { view } = renderFactory(loaded, request);
    const note = loaded.handler.createSwitchRefusalNote();

    const decision = await view.result.current(fakeHost(), ORIGIN, note)(
      DAPP,
      mismatchCtx({ expiresAt: expiresAt as number }),
    );
    await macrotask();

    expect(decision).toEqual({ action: 'refuse' });
    expect(request).not.toHaveBeenCalled();
    expect(mocks.reload).not.toHaveBeenCalled();
    // Refused for the host's own reason, so no wallet-side reason is left for a rejection.
    expect(note.take(networkRejection({ id: 1 }).data)).toBeUndefined();
  });
});

describe('every refusal names its reason', () => {
  function withConfig(patch: Record<string, string>) {
    const cfg = (window as unknown as { __SPHERE_RUNTIME_CONFIG__: Record<string, string> }).__SPHERE_RUNTIME_CONFIG__;
    Object.assign(cfg, patch);
  }

  const REFUSALS: Array<{ reason: string; patch: Record<string, string>; ctx: Partial<NetworkMismatchContext> }> = [
    { reason: 'unknown-network', patch: {}, ctx: { clientNetwork: { id: 987_654 } } },
    { reason: 'wallet-network-unknown', patch: {}, ctx: { walletNetwork: { id: -1 } } },
    { reason: 'already-current', patch: {}, ctx: { clientNetwork: { id: 4 }, walletNetwork: { id: 4 } } },
    { reason: 'coming-soon', patch: { MAINNET_ROLLOUT_ENABLED: 'false' }, ctx: {} },
    { reason: 'not-served-here', patch: { WALLET_API_URL_MAINNET: '' }, ctx: {} },
  ];

  it.each(REFUSALS)('$reason: refuses without prompting and hands the reason to the rejection', async ({ reason, patch, ctx }) => {
    withConfig(patch);
    const loaded = await load();
    const request = vi.fn().mockResolvedValue(ACCEPT);
    const { view } = renderFactory(loaded, request);
    const note = loaded.handler.createSwitchRefusalNote();
    const mismatch = mismatchCtx(ctx);

    const decision = await view.result.current(fakeHost(), ORIGIN, note)(DAPP, mismatch);
    await macrotask();

    expect(decision).toEqual({ action: 'refuse' });
    expect(request).not.toHaveBeenCalled();
    expect(mocks.reload).not.toHaveBeenCalled();
    expect(note.take(networkRejection(mismatch.clientNetwork).data)).toBe(reason);
  });

  it('suppressed: a muted origin is refused without prompting', async () => {
    const loaded = await load();
    expect(loaded.store.suppressSwitchPrompt(ORIGIN, 'mainnet')).toBe(true);
    const request = vi.fn().mockResolvedValue(ACCEPT);
    const { view } = renderFactory(loaded, request);
    const note = loaded.handler.createSwitchRefusalNote();

    const decision = await view.result.current(fakeHost(), ORIGIN, note)(DAPP, mismatchCtx());

    expect(decision).toEqual({ action: 'refuse' });
    expect(request).not.toHaveBeenCalled();
    expect(note.take(networkRejection({ id: 1 }).data)).toBe('suppressed');
  });

  it('a mute for one origin does not silence another', async () => {
    const loaded = await load();
    loaded.store.suppressSwitchPrompt('https://someone-else.example', 'mainnet');
    const request = vi.fn().mockResolvedValue(ACCEPT);
    const { view } = renderFactory(loaded, request);
    const note = loaded.handler.createSwitchRefusalNote();

    await view.result.current(fakeHost(), ORIGIN, note)(DAPP, mismatchCtx());

    expect(request).toHaveBeenCalledOnce();
  });
});

describe('SwitchRefusalNote', () => {
  it('hands the reason over once, only for the same declared network id, and always clears', async () => {
    const { handler } = await load();
    const note = handler.createSwitchRefusalNote();

    note.record(1, 'coming-soon');
    expect(note.take(networkRejection({ id: 2 }).data)).toBeUndefined(); // a different network: cleared, not shown
    expect(note.take(networkRejection({ id: 1 }).data)).toBeUndefined(); // and gone for good

    note.record(1, 'coming-soon');
    expect(note.take(networkRejection({ id: 1, name: 'anything the peer typed' }).data)).toBe('coming-soon');
    expect(note.take(networkRejection({ id: 1 }).data)).toBeUndefined();
  });

  it.each([
    ['no data at all', undefined],
    ['no declared network', { reason: 'network_incompatible' }],
    ['a null network', { clientNetwork: null }],
    ['a string id', { clientNetwork: { id: '1' } }],
    ['a primitive network', { clientNetwork: 1 }],
  ])('never matches on %s', async (_label, data) => {
    const { handler } = await load();
    const note = handler.createSwitchRefusalNote();
    note.record(1, 'coming-soon');
    expect(note.take(data as Record<string, unknown> | undefined)).toBeUndefined();
  });

  it('is emptied by discard() and at the start of every hook run', async () => {
    const loaded = await load();
    const note = loaded.handler.createSwitchRefusalNote();
    note.record(1, 'coming-soon');
    note.discard();
    expect(note.take(networkRejection({ id: 1 }).data)).toBeUndefined();

    // A leftover from a handshake whose rejection never came.
    note.record(987_654, 'unknown-network');
    const request = vi.fn().mockResolvedValue({ accepted: false, suppressFuturePrompts: false });
    const { view } = renderFactory(loaded, request);
    await view.result.current(fakeHost(), ORIGIN, note)(DAPP, mismatchCtx());
    expect(note.take(networkRejection({ id: 987_654 }).data)).toBeUndefined();
  });
});

describe('the hook', () => {
  it('always asks the LATEST requestNetworkSwitch through a factory that never changes identity', async () => {
    const loaded = await load();
    const first = vi.fn().mockResolvedValue({ accepted: false, suppressFuturePrompts: false });
    const second = vi.fn().mockResolvedValue({ accepted: false, suppressFuturePrompts: false });
    const { view, current } = renderFactory(loaded, first);
    const make = view.result.current;
    const note = loaded.handler.createSwitchRefusalNote();

    // A host builds its ConnectHost once, and keeps the factory it got on that first render.
    current.request = second;
    view.rerender();
    await make(fakeHost(), ORIGIN, note)(DAPP, mismatchCtx());

    expect(view.result.current).toBe(make);
    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
  });

  it('switches through setActiveNetwork with the origin it was given', async () => {
    const loaded = await load();
    const request = vi.fn().mockResolvedValue(ACCEPT);
    const { view } = renderFactory(loaded, request);
    const note = loaded.handler.createSwitchRefusalNote();

    await view.result.current(fakeHost(), ORIGIN, note)(DAPP, mismatchCtx());
    await macrotask();

    const marker = JSON.parse(sessionStorage.getItem(MARKER_KEY) ?? 'null') as { origin: string; to: string };
    expect(marker.origin).toBe(ORIGIN);
    expect(marker.to).toBe('mainnet');
  });
});

describe('a mute written on accept', () => {
  it('lands in the network being LEFT: dormant on the new one, in force and listed on return', async () => {
    const first = await load();
    const request = vi.fn().mockResolvedValue({ accepted: true, suppressFuturePrompts: true });
    const { view } = renderFactory(first, request);
    await view.result.current(fakeHost(), ORIGIN, first.handler.createSwitchRefusalNote())(DAPP, mismatchCtx());
    await macrotask();
    view.unmount();

    // The page that comes back from the switch runs on mainnet, where nothing is muted yet.
    const onMainnet = await load();
    expect(onMainnet.net.SPHERE_NETWORK).toBe('mainnet');
    expect(onMainnet.store.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
    expect(onMainnet.store.getSuppressedOrigins()).toEqual({});

    // The user goes back to testnet2, which is the network the prompt was raised on: the
    // record is in force again, and it is the one Task 7's list will show.
    localStorage.setItem('sphere_active_network', 'testnet2');
    const back = await load();
    expect(back.net.SPHERE_NETWORK).toBe('testnet2');
    expect(back.store.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
    expect(back.store.getSuppressedOrigins()).toEqual({ [ORIGIN]: ['mainnet'] });
  });
});

describe('claimGraceForSilentHandshake', () => {
  /** A switch made on one page, then the page that comes back: fresh modules, same storage. */
  async function comeBackFromSwitchFor(origin: string) {
    const first = await load();
    const request = vi.fn().mockResolvedValue(ACCEPT);
    const { view } = renderFactory(first, request);
    await view.result.current(fakeHost(), origin, first.handler.createSwitchRefusalNote())(DAPP, mismatchCtx());
    await macrotask();
    view.unmount();
    return load();
  }

  it('is true once, for the origin switched for, on a live wallet', async () => {
    const back = await comeBackFromSwitchFor(ORIGIN);

    expect(back.net.SPHERE_NETWORK).toBe('mainnet');
    expect(back.handler.claimGraceForSilentHandshake(fakeHost(), 'https://other.example')).toBe(false);
    expect(back.handler.claimGraceForSilentHandshake(fakeHost(), ORIGIN)).toBe(true);
    expect(back.handler.claimGraceForSilentHandshake(fakeHost(), ORIGIN)).toBe(false);
  });

  it.each(['locked', 'unavailable'])(
    'is false, and spends nothing, while the wallet is %s',
    async (state) => {
      const back = await comeBackFromSwitchFor(ORIGIN);

      expect(back.handler.claimGraceForSilentHandshake(fakeHost(state), ORIGIN)).toBe(false);
      expect(back.handler.claimGraceForSilentHandshake(fakeHost('live'), ORIGIN)).toBe(true);
    },
  );

  it('is false on a plain load', async () => {
    const { handler } = await load();
    expect(handler.claimGraceForSilentHandshake(fakeHost(), ORIGIN)).toBe(false);
  });
});
