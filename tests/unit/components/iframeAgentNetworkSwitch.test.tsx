/**
 * The framed agent's ConnectHost answers "this dApp is built for another network".
 *
 * Nothing here mocks the decision: the wallet is pinned to testnet2 with mainnet a real,
 * switchable target (tests/support/networkSwitchFixtures.ts), so `evaluateSwitchOffer`, the
 * mute store and `setActiveNetwork` all run for real. Only the SDK host (a capture of its
 * config), the Connect context and the reload are stubbed. Every case re-imports the
 * component under a fresh module graph, because the grace marker is read once at module load.
 *
 * What the ordering tests defend: `setActiveNetwork` ends in `window.location.reload()`,
 * and the SDK host still has to post its answer through the window that reload destroys.
 * The failure mode is a frame that never arrives and a dApp that hangs until its own
 * timeout, which no assertion on "the switch happened" would ever notice.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import type { AgentConfig } from '../../../src/config/activities';
import {
  DAPP,
  MARKER_KEY,
  SUPPRESSED_KEY,
  ACTIVE_NETWORK_KEY,
  controllableClock,
  deferred,
  freshModules,
  macrotask,
  mismatchCtx,
  networkRejection,
  pinNetworkConfig,
  rawSuppressed,
  recordStorageWrites,
  seedSwitchMarker,
  unpinNetworkConfig,
  type CapturedHostConfig,
} from '../../support/networkSwitchFixtures';

const sphereMock = vi.hoisted(() => ({
  sphere: { identity: { chainPubkey: '02ab' } } as unknown | null,
  isLoading: false,
  isLocked: false,
  walletExists: true,
}));

const hostMock = vi.hoisted(() => ({
  instances: [] as Array<Record<string, unknown>>,
  configs: [] as Array<Record<string, unknown>>,
  reload: vi.fn(),
  requestNetworkSwitch: vi.fn(),
  requestApproval: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('@unicitylabs/sphere-sdk/connect', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@unicitylabs/sphere-sdk/connect')>();
  return {
    ...actual,
    ConnectHost: vi.fn(function (config: Record<string, unknown>) {
      const instance = {
        destroy: vi.fn(),
        updateSphere: vi.fn(),
        setLocked: vi.fn(),
        setUnavailable: vi.fn(),
        revokeSession: vi.fn(),
        getSession: vi.fn(() => null),
        getState: vi.fn(() => ({ walletState: 'live', session: null })),
        // The grace claim reads this: a locked host must not spend it.
        walletState: 'live' as string,
      };
      hostMock.configs.push(config);
      hostMock.instances.push(instance);
      return instance;
    }),
  };
});

vi.mock('@unicitylabs/sphere-sdk/connect/browser', () => ({
  PostMessageTransport: { forHost: vi.fn(() => ({ destroy: vi.fn() })) },
}));

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({
    sphere: sphereMock.sphere,
    isLoading: sphereMock.isLoading,
    isLocked: sphereMock.isLocked,
    walletExists: sphereMock.walletExists,
  }),
}));

vi.mock('../../../src/components/connect/ConnectContext', () => ({
  useConnectContext: () => ({
    requestApproval: hostMock.requestApproval,
    requestIntent: vi.fn(),
    requestNetworkSwitch: hostMock.requestNetworkSwitch,
    noteLockedRequest: vi.fn(),
    attachHost: vi.fn(),
    releaseHost: vi.fn(),
  }),
}));

vi.mock('../../../src/components/ui/toast-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/components/ui/toast-utils')>();
  return { ...actual, showToast: hostMock.showToast };
});

const URL_A = 'https://third-party.example/app';
/** What `new URL(URL_A).origin` gives, and so what the host closes over. */
const ORIGIN = 'https://third-party.example';

function makeAgent(url: string): AgentConfig {
  return {
    id: 'custom',
    name: 'Test Agent',
    description: '',
    Icon: (() => null) as unknown as AgentConfig['Icon'],
    category: 'Custom',
    color: '',
    type: 'iframe',
    iframeUrl: url,
  };
}

/** Fresh module graph, then mount the agent and hand back what the SDK would be given. */
async function mount(url = URL_A) {
  freshModules(hostMock.reload);
  const { IframeAgent } = await import('../../../src/components/agents/IframeAgent');
  const net = await import('../../../src/config/network');
  const store = await import('../../../src/utils/network-switch-prompts');
  const view = render(<IframeAgent agent={makeAgent(url)} />);
  expect(hostMock.configs).toHaveLength(1);
  return {
    config: hostMock.configs[0] as unknown as CapturedHostConfig,
    instance: hostMock.instances[0] as { walletState: string },
    net,
    store,
    view,
  };
}

const ACCEPT = { accepted: true, suppressFuturePrompts: false };
const DECLINE = { accepted: false, suppressFuturePrompts: false };

let clock: ReturnType<typeof controllableClock> | null = null;

beforeEach(() => {
  pinNetworkConfig();
  localStorage.clear();
  sessionStorage.clear();
  hostMock.instances.length = 0;
  hostMock.configs.length = 0;
  hostMock.reload.mockReset();
  hostMock.requestNetworkSwitch.mockReset();
  hostMock.requestApproval.mockReset();
  hostMock.showToast.mockReset();
  sphereMock.sphere = { identity: { chainPubkey: '02ab' } };
  sphereMock.isLoading = false;
  sphereMock.isLocked = false;
  sphereMock.walletExists = true;
});

afterEach(async () => {
  // Let any switch a test scheduled and did not await run NOW, under this test's own
  // storage and reload spy, not halfway through the next test.
  await macrotask();
  // A spy left behind by a test that failed half way (Date.now, Storage.setItem) would
  // otherwise poison every test after it.
  vi.restoreAllMocks();
  clock?.restore();
  clock = null;
  unpinNetworkConfig();
  localStorage.clear();
  sessionStorage.clear();
});

describe('IframeAgent: onNetworkMismatch', () => {
  it('is wired on the host', async () => {
    const { config } = await mount();
    expect(typeof config.onNetworkMismatch).toBe('function');
  });

  it('asks about the verified origin with labels from the wallet, and resolves the switch BEFORE the reload', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue(ACCEPT);
    const { config, instance } = await mount();
    const order: string[] = [];
    hostMock.reload.mockImplementation(() => order.push('reload'));

    const decision = await config.onNetworkMismatch(DAPP, mismatchCtx());
    order.push('resolved');

    expect(decision).toEqual({ action: 'switch', to: { id: 1 } });
    expect(hostMock.requestNetworkSwitch).toHaveBeenCalledOnce();
    const [askedHost, askedOrigin, offer] = hostMock.requestNetworkSwitch.mock.calls[0]!;
    expect(askedHost).toBe(instance);
    expect(askedOrigin).toBe(ORIGIN);
    expect(offer).toMatchObject({
      target: 'mainnet',
      targetLabel: 'Mainnet',
      currentLabel: 'Testnet',
      movesRealFunds: true,
    });

    // The answer is out and nothing has moved yet: not the reload, not the stored choice.
    // A microtask queued before returning would already have run by now.
    expect(hostMock.reload).not.toHaveBeenCalled();
    expect(localStorage.getItem('sphere_active_network')).toBeNull();

    await macrotask();

    expect(order).toEqual(['resolved', 'reload']);
    expect(hostMock.reload).toHaveBeenCalledOnce();
    expect(localStorage.getItem('sphere_active_network')).toBe('mainnet');
  });

  it('records the switch under the SAME origin the host closes over, and the grace claim takes it back', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue(ACCEPT);
    const { config } = await mount();
    await config.onNetworkMismatch(DAPP, mismatchCtx());
    await macrotask();

    const marker = JSON.parse(sessionStorage.getItem(MARKER_KEY) ?? 'null') as { origin: string; to: string };
    expect(marker.origin).toBe(ORIGIN);
    expect(marker.origin).toBe(config.origin);
    // The writer only accepts a canonical origin, and the claim compares with ===.
    expect(new URL(marker.origin).origin).toBe(marker.origin);
    expect(marker.to).toBe('mainnet');

    // The page that comes back from the reload: fresh modules, same storage.
    freshModules(hostMock.reload);
    const back = await import('../../../src/config/network');
    expect(back.SPHERE_NETWORK).toBe('mainnet');
    expect(back.NETWORK_SWITCHED_FOR).toEqual({ origin: ORIGIN, to: 'mainnet' });
    expect(back.claimNetworkSwitchGrace(config.origin)).toBe(true);
  });

  it('refuses, without switching or muting, when the user declines', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue(DECLINE);
    const { config, store } = await mount();

    expect(await config.onNetworkMismatch(DAPP, mismatchCtx())).toEqual({ action: 'refuse' });
    await macrotask();

    expect(hostMock.reload).not.toHaveBeenCalled();
    expect(localStorage.getItem('sphere_active_network')).toBeNull();
    expect(store.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
  });

  it('mutes THIS origin and target when the user declines with the box ticked, and then asks no more', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue({ accepted: false, suppressFuturePrompts: true });
    const { config, store } = await mount();

    expect(await config.onNetworkMismatch(DAPP, mismatchCtx())).toEqual({ action: 'refuse' });
    expect(store.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
    expect(store.isSwitchPromptSuppressed('https://other.example', 'mainnet')).toBe(false);

    // The next attempt never reaches the user.
    hostMock.requestNetworkSwitch.mockClear();
    expect(await config.onNetworkMismatch(DAPP, mismatchCtx())).toEqual({ action: 'refuse' });
    expect(hostMock.requestNetworkSwitch).not.toHaveBeenCalled();
  });

  it('says so when the mute could not be saved', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue({ accepted: false, suppressFuturePrompts: true });
    const { config, store } = await mount();
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage) {
      if (this === localStorage) throw new Error('quota');
    });

    expect(await config.onNetworkMismatch(DAPP, mismatchCtx())).toEqual({ action: 'refuse' });

    setItem.mockRestore();
    expect(store.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
    expect(hostMock.showToast).toHaveBeenCalledWith(expect.stringContaining('may ask again'), 'warning');
  });

  it('leaves no trace of the decline on the network: no switch, and nothing but the mute is stored', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue({ accepted: false, suppressFuturePrompts: true });
    const { config } = await mount();
    const writes = recordStorageWrites();

    expect(await config.onNetworkMismatch(DAPP, mismatchCtx())).toEqual({ action: 'refuse' });
    await macrotask();

    expect(writes).toEqual([SUPPRESSED_KEY]);
    expect(hostMock.reload).not.toHaveBeenCalled();
    expect(localStorage.getItem(ACTIVE_NETWORK_KEY)).toBeNull();
  });
});

describe('IframeAgent: the "do not ask again" tick on an ACCEPTED switch', () => {
  const TICKED = { accepted: true, suppressFuturePrompts: true };

  it('is honoured: the mute is written for this origin and target, and the switch still happens', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue(TICKED);
    const { config, store } = await mount();

    expect(await config.onNetworkMismatch(DAPP, mismatchCtx())).toEqual({ action: 'switch', to: { id: 1 } });
    await macrotask();

    expect(store.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
    expect(store.isSwitchPromptSuppressed('https://other.example', 'mainnet')).toBe(false);
    expect(store.isSwitchPromptSuppressed(ORIGIN, 'testnet2')).toBe(false);
    expect(hostMock.reload).toHaveBeenCalledOnce();
    expect(localStorage.getItem(ACTIVE_NETWORK_KEY)).toBe('mainnet');
  });

  it('is written in the bucket of the network being LEFT, not the one being entered', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue(TICKED);
    const { config } = await mount();

    await config.onNetworkMismatch(DAPP, mismatchCtx());
    await macrotask();

    const store = rawSuppressed();
    expect(Object.keys(store?.byNetwork ?? {})).toEqual(['testnet2']);
    expect(Object.keys(store?.byNetwork.testnet2?.[ORIGIN]?.targets ?? {})).toEqual(['mainnet']);
  });

  it('is written BEFORE the switch is scheduled: already stored when the answer is out, and before the active network is persisted', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue(TICKED);
    const { config, store } = await mount();
    const writes = recordStorageWrites();

    const decision = await config.onNetworkMismatch(DAPP, mismatchCtx());

    // Answer out, switch not yet run: and the mute is already in storage.
    expect(decision).toEqual({ action: 'switch', to: { id: 1 } });
    expect(hostMock.reload).not.toHaveBeenCalled();
    expect(writes).toEqual([SUPPRESSED_KEY]);
    expect(store.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);

    await macrotask();

    // The switch persists its choice only after the mute has landed.
    expect(writes).toEqual([SUPPRESSED_KEY, ACTIVE_NETWORK_KEY]);
    expect(hostMock.reload).toHaveBeenCalledOnce();
  });

  it('is not needed for a plain accept: without the tick nothing is written but the switch itself', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue(ACCEPT);
    const { config, store } = await mount();
    const writes = recordStorageWrites();

    expect(await config.onNetworkMismatch(DAPP, mismatchCtx())).toEqual({ action: 'switch', to: { id: 1 } });
    await macrotask();

    expect(writes).toEqual([ACTIVE_NETWORK_KEY]);
    expect(store.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
    expect(rawSuppressed()).toBeNull();
    expect(hostMock.reload).toHaveBeenCalledOnce();
  });

  it('never blocks the switch when the mute cannot be saved', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue(TICKED);
    const { config, store } = await mount();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (this === localStorage && key === SUPPRESSED_KEY) throw new Error('quota');
      real.call(this, key, value);
    });

    expect(await config.onNetworkMismatch(DAPP, mismatchCtx())).toEqual({ action: 'switch', to: { id: 1 } });
    await macrotask();

    expect(store.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
    expect(hostMock.reload).toHaveBeenCalledOnce();
    expect(localStorage.getItem(ACTIVE_NETWORK_KEY)).toBe('mainnet');
    // A toast would die with the reload a few milliseconds away, so it is logged instead.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Could not save'));
    expect(hostMock.showToast).not.toHaveBeenCalled();
  });

  it('is not honoured for a LATE accept: the host already refused, so nothing is written at all', async () => {
    clock = controllableClock();
    const prompt = deferred<typeof TICKED>();
    hostMock.requestNetworkSwitch.mockReturnValue(prompt.promise);
    const { config, store } = await mount();

    const pending = config.onNetworkMismatch(DAPP, mismatchCtx({ expiresAt: Date.now() + 60_000 }));
    await macrotask();
    clock.advance(61_000);
    prompt.resolve(TICKED);

    expect(await pending).toEqual({ action: 'refuse' });
    await macrotask();
    expect(store.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
    expect(rawSuppressed()).toBeNull();
    expect(hostMock.reload).not.toHaveBeenCalled();
  });
});

describe('IframeAgent: the deadline is checked twice', () => {
  it('refuses without prompting when the host has already stopped waiting', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue(ACCEPT);
    const { config } = await mount();

    const decision = await config.onNetworkMismatch(DAPP, mismatchCtx({ expiresAt: Date.now() - 1 }));
    await macrotask();

    expect(decision).toEqual({ action: 'refuse' });
    expect(hostMock.requestNetworkSwitch).not.toHaveBeenCalled();
    expect(hostMock.reload).not.toHaveBeenCalled();
  });

  it('refuses at the exact deadline: the boundary belongs to the host', async () => {
    const { config } = await mount();
    const now = Date.now();
    const spy = vi.spyOn(Date, 'now').mockReturnValue(now);

    const decision = await config.onNetworkMismatch(DAPP, mismatchCtx({ expiresAt: now }));
    spy.mockRestore();

    expect(decision).toEqual({ action: 'refuse' });
    expect(hostMock.requestNetworkSwitch).not.toHaveBeenCalled();
  });

  it('does NOT switch on a late accept: the host already refused, and its side effects would still run', async () => {
    clock = controllableClock();
    const prompt = deferred<typeof ACCEPT>();
    hostMock.requestNetworkSwitch.mockReturnValue(prompt.promise);
    const { config } = await mount();

    const pending = config.onNetworkMismatch(DAPP, mismatchCtx({ expiresAt: Date.now() + 60_000 }));
    await macrotask();
    expect(hostMock.requestNetworkSwitch).toHaveBeenCalledOnce(); // the prompt is up

    clock.advance(61_000); // the user is still deciding while the host gives up
    prompt.resolve(ACCEPT);

    expect(await pending).toEqual({ action: 'refuse' });
    await macrotask();
    expect(hostMock.reload).not.toHaveBeenCalled();
    expect(localStorage.getItem('sphere_active_network')).toBeNull();
    expect(sessionStorage.getItem(MARKER_KEY)).toBeNull();
  });

  it('does not write a mute for a late decline either: the user is simply asked again', async () => {
    clock = controllableClock();
    const prompt = deferred<{ accepted: boolean; suppressFuturePrompts: boolean }>();
    hostMock.requestNetworkSwitch.mockReturnValue(prompt.promise);
    const { config, store } = await mount();

    const pending = config.onNetworkMismatch(DAPP, mismatchCtx({ expiresAt: Date.now() + 60_000 }));
    await macrotask();
    clock.advance(61_000);
    prompt.resolve({ accepted: false, suppressFuturePrompts: true });

    expect(await pending).toEqual({ action: 'refuse' });
    expect(store.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
  });
});

describe('IframeAgent: why the wallet did not offer a switch', () => {
  const GENERIC = 'Hostile Swap is built for mainnet (1), but your wallet is on testnet2 (4), so it cannot connect here.';

  it('appends the reason to the existing rejection toast when the offer is refused', async () => {
    const { config } = await mount();
    const unknown = { id: 987_654 };

    expect(await config.onNetworkMismatch(DAPP, mismatchCtx({ clientNetwork: unknown }))).toEqual({
      action: 'refuse',
    });
    expect(hostMock.requestNetworkSwitch).not.toHaveBeenCalled();

    config.onConnectionRejected(DAPP, networkRejection(unknown), false);

    expect(hostMock.showToast).toHaveBeenCalledOnce();
    const [message, type] = hostMock.showToast.mock.calls[0]!;
    expect(type).toBe('warning');
    expect(message).toContain('so it cannot connect here.');
    expect(message).toContain('nothing to switch to');
  });

  it('says a muted origin was muted, and names where to undo it', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue({ accepted: false, suppressFuturePrompts: true });
    const { config } = await mount();
    await config.onNetworkMismatch(DAPP, mismatchCtx()); // decline + tick

    await config.onNetworkMismatch(DAPP, mismatchCtx()); // now muted
    config.onConnectionRejected(DAPP, networkRejection({ id: 1 }), false);

    const [message] = hostMock.showToast.mock.calls[0]!;
    expect(message).toContain('You asked not to be offered a network switch');
    expect(message).toContain('Connected Sites');
  });

  it('adds nothing when the user simply declined: the existing copy, unchanged', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue(DECLINE);
    const { config } = await mount();
    await config.onNetworkMismatch(DAPP, mismatchCtx());

    config.onConnectionRejected(DAPP, networkRejection({ id: 1 }), false);

    expect(hostMock.showToast).toHaveBeenCalledWith(GENERIC, 'warning');
  });

  it('never lets a reason outlive its handshake: a silent rejection consumes it', async () => {
    const { config } = await mount();
    await config.onNetworkMismatch(DAPP, mismatchCtx({ clientNetwork: { id: 987_654 } }));

    config.onConnectionRejected(DAPP, networkRejection({ id: 987_654 }), true);
    expect(hostMock.showToast).not.toHaveBeenCalled(); // silent: no UI, as before

    config.onConnectionRejected(DAPP, networkRejection({ id: 987_654 }), false);
    const [message] = hostMock.showToast.mock.calls[0]!;
    expect(message).not.toContain('nothing to switch to');
  });

  it('does not decorate a rejection about a different network, or a protocol rejection', async () => {
    const { config } = await mount();
    await config.onNetworkMismatch(DAPP, mismatchCtx({ clientNetwork: { id: 987_654 } }));

    config.onConnectionRejected(DAPP, networkRejection({ id: 1 }), false);
    expect(hostMock.showToast.mock.calls[0]![0]).toBe(GENERIC);

    await config.onNetworkMismatch(DAPP, mismatchCtx({ clientNetwork: { id: 987_654 } }));
    config.onConnectionRejected(
      DAPP,
      { code: 4002, message: 'x', data: { reason: 'protocol_incompatible', clientProtocol: '1.0', walletProtocol: '2.3' } },
      false,
    );
    expect(hostMock.showToast.mock.calls[1]![0]).not.toContain('nothing to switch to');
  });
});

describe('IframeAgent: the switch grace', () => {
  const PERMS = ['identity:read'];
  const APPROVED = { approved: true, grantedPermissions: PERMS };

  it('opens the ordinary approval modal for a silent handshake from the origin switched for', async () => {
    seedSwitchMarker(ORIGIN);
    hostMock.requestApproval.mockResolvedValue(APPROVED);
    const { config, instance } = await mount();

    const result = await config.onConnectionRequest(DAPP, PERMS, true);

    expect(result).toEqual(APPROVED);
    expect(hostMock.requestApproval).toHaveBeenCalledOnce();
    expect(hostMock.requestApproval).toHaveBeenCalledWith(instance, DAPP, PERMS, ORIGIN);
  });

  it('grants nothing by itself: a denied prompt is still a refusal', async () => {
    seedSwitchMarker(ORIGIN);
    hostMock.requestApproval.mockResolvedValue({ approved: false, grantedPermissions: [] });
    const { config } = await mount();

    expect(await config.onConnectionRequest(DAPP, PERMS, true)).toEqual({ approved: false, grantedPermissions: [] });
    expect(hostMock.requestApproval).toHaveBeenCalledOnce(); // the user WAS asked, and said no
    expect(localStorage.getItem('sphere_connected_sites')).toBeNull();
  });

  it('spends the grace once: the second silent handshake is refused silently again', async () => {
    seedSwitchMarker(ORIGIN);
    hostMock.requestApproval.mockResolvedValue({ approved: false, grantedPermissions: [] });
    const { config } = await mount();

    await config.onConnectionRequest(DAPP, PERMS, true);
    expect(hostMock.requestApproval).toHaveBeenCalledOnce(); // the first one used it
    hostMock.requestApproval.mockClear();

    expect(await config.onConnectionRequest(DAPP, PERMS, true)).toEqual({ approved: false, grantedPermissions: [] });
    expect(hostMock.requestApproval).not.toHaveBeenCalled();
  });

  it('still refuses a silent handshake from any other origin, and does not spend the grace on it', async () => {
    seedSwitchMarker('https://the-site-we-switched-for.example');
    const { config, net } = await mount();

    expect(await config.onConnectionRequest(DAPP, PERMS, true)).toEqual({ approved: false, grantedPermissions: [] });
    expect(hostMock.requestApproval).not.toHaveBeenCalled();
    // A stranger's silent attempt must not have burned the one-shot.
    expect(net.claimNetworkSwitchGrace('https://the-site-we-switched-for.example')).toBe(true);
  });

  it('refuses a silent handshake on a plain load, as before', async () => {
    const { config } = await mount();
    expect(await config.onConnectionRequest(DAPP, PERMS, true)).toEqual({ approved: false, grantedPermissions: [] });
    expect(hostMock.requestApproval).not.toHaveBeenCalled();
  });

  it('never opens the modal over a LOCKED wallet, and keeps the grace for after the unlock', async () => {
    seedSwitchMarker(ORIGIN);
    hostMock.requestApproval.mockResolvedValue(APPROVED);
    const { config, instance } = await mount();

    // The SDK forces a handshake silent while the wallet is locked.
    instance.walletState = 'locked';
    expect(await config.onConnectionRequest(DAPP, PERMS, true)).toEqual({ approved: false, grantedPermissions: [] });
    expect(hostMock.requestApproval).not.toHaveBeenCalled();

    instance.walletState = 'live';
    expect(await config.onConnectionRequest(DAPP, PERMS, true)).toEqual(APPROVED);
    expect(hostMock.requestApproval).toHaveBeenCalledOnce();
  });

  it('still shows the modal for a non-silent handshake, whatever the marker says', async () => {
    hostMock.requestApproval.mockResolvedValue(APPROVED);
    const { config } = await mount();

    expect(await config.onConnectionRequest(DAPP, PERMS, false)).toEqual(APPROVED);
    expect(hostMock.requestApproval).toHaveBeenCalledOnce();
  });
});
