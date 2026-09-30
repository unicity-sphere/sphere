/**
 * The popup host answers "this dApp is built for another network".
 *
 * Same wiring as the framed agent's (iframeAgentNetworkSwitch.test.tsx), on the other
 * host: one shared handler, so what differs here is only where the origin comes from (the
 * popup's `origin` query parameter, not an iframe URL) and where a refusal is shown (the
 * "Unable to connect" modal, not a toast).
 *
 * Nothing mocks the decision. The wallet is pinned to testnet2 with mainnet a real,
 * switchable target, so `evaluateSwitchOffer`, the mute store and `setActiveNetwork` all
 * run for real; only the SDK host (a capture of its config), the Connect context and the
 * reload are stubbed. Every case re-imports the page under a fresh module graph, because
 * the grace marker is read once at module load.
 *
 * The popup's switch is deliberately a manual re-Connect: after the reload the dApp is in
 * another window and has to press Connect again. The last block pins the screen that says
 * so, which reads the switch marker's RECORD and never its one-shot claim.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NETWORKS } from '@unicitylabs/sphere-sdk';
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

vi.mock('../../../src/components/wallet/WalletPanel', () => ({ WalletPanel: () => null }));

vi.mock('../../../src/components/ui/toast-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/components/ui/toast-utils')>();
  return { ...actual, showToast: hostMock.showToast };
});

/** The popup's `origin` query parameter, decoded: what the host closes over. */
const ORIGIN = 'https://dapp.example';

/** Fresh module graph, then open the popup and hand back what the SDK would be given. */
async function mount() {
  freshModules(hostMock.reload);
  const { ConnectPage } = await import('../../../src/pages/ConnectPage');
  const net = await import('../../../src/config/network');
  const store = await import('../../../src/utils/network-switch-prompts');
  const view = render(
    <MemoryRouter initialEntries={['/connect?origin=https%3A%2F%2Fdapp.example']}>
      <ConnectPage />
    </MemoryRouter>,
  );
  expect(hostMock.configs).toHaveLength(1);
  return {
    config: hostMock.configs[0] as unknown as CapturedHostConfig,
    instance: hostMock.instances[0] as { walletState: string },
    net,
    store,
    view,
    ConnectPage,
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
  // ConnectPage refuses to run without an opener.
  Object.defineProperty(window, 'opener', { value: {}, configurable: true, writable: true });
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
  Object.defineProperty(window, 'opener', { value: null, configurable: true, writable: true });
  unpinNetworkConfig();
  localStorage.clear();
  sessionStorage.clear();
});

describe('ConnectPage: onNetworkMismatch', () => {
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
});

describe('ConnectPage: the decline of a ticked prompt', () => {
  it('leaves no trace on the network: no switch, and nothing but the mute is stored', async () => {
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

describe('ConnectPage: the "do not ask again" tick on an ACCEPTED switch', () => {
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

describe('ConnectPage: the deadline is checked twice', () => {
  it('refuses without prompting when the host has already stopped waiting', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue(ACCEPT);
    const { config } = await mount();

    const decision = await config.onNetworkMismatch(DAPP, mismatchCtx({ expiresAt: Date.now() - 1 }));
    await macrotask();

    expect(decision).toEqual({ action: 'refuse' });
    expect(hostMock.requestNetworkSwitch).not.toHaveBeenCalled();
    expect(hostMock.reload).not.toHaveBeenCalled();
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
});

describe('ConnectPage: why the wallet did not offer a switch', () => {
  const GENERIC = 'Hostile Swap is built for mainnet (1), but your wallet is on testnet2 (4), so it cannot connect here.';

  it('shows the reason inside the existing "Unable to connect" modal when the offer is refused', async () => {
    const { config } = await mount();
    const unknown = { id: 987_654 };

    expect(await config.onNetworkMismatch(DAPP, mismatchCtx({ clientNetwork: unknown }))).toEqual({
      action: 'refuse',
    });
    expect(hostMock.requestNetworkSwitch).not.toHaveBeenCalled();

    act(() => config.onConnectionRejected(DAPP, networkRejection(unknown), false));

    const text = document.body.textContent ?? '';
    expect(text).toContain('Unable to connect');
    expect(text).toContain('so it cannot connect here.');
    expect(text).toContain('nothing to switch to');
  });

  it('says a muted origin was muted, and names where to undo it', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue({ accepted: false, suppressFuturePrompts: true });
    const { config } = await mount();
    await config.onNetworkMismatch(DAPP, mismatchCtx()); // decline + tick

    await config.onNetworkMismatch(DAPP, mismatchCtx()); // now muted
    act(() => config.onConnectionRejected(DAPP, networkRejection({ id: 1 }), false));

    const text = document.body.textContent ?? '';
    expect(text).toContain('You asked not to be offered a network switch');
    expect(text).toContain('Connected Sites');
  });

  it('adds nothing when the user simply declined: the existing copy, unchanged', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue(DECLINE);
    const { config } = await mount();
    await config.onNetworkMismatch(DAPP, mismatchCtx());

    act(() => config.onConnectionRejected(DAPP, networkRejection({ id: 1 }), false));

    expect(document.body.textContent).toContain(GENERIC);
    expect(document.body.textContent).not.toContain('nothing to switch to');
    expect(document.body.textContent).not.toContain('You asked not to be offered');
  });

  it('shows no modal for a silent rejection, and never lets the reason outlive its handshake', async () => {
    const { config } = await mount();
    await config.onNetworkMismatch(DAPP, mismatchCtx({ clientNetwork: { id: 987_654 } }));

    act(() => config.onConnectionRejected(DAPP, networkRejection({ id: 987_654 }), true));
    expect(document.body.textContent).not.toContain('Unable to connect');

    act(() => config.onConnectionRejected(DAPP, networkRejection({ id: 987_654 }), false));
    expect(document.body.textContent).toContain('Unable to connect');
    expect(document.body.textContent).not.toContain('nothing to switch to');
  });

  it('does not decorate a protocol rejection', async () => {
    const { config } = await mount();
    await config.onNetworkMismatch(DAPP, mismatchCtx({ clientNetwork: { id: 987_654 } }));

    act(() =>
      config.onConnectionRejected(
        DAPP,
        { code: 4002, message: 'x', data: { reason: 'protocol_incompatible', clientProtocol: '1.0', walletProtocol: '2.3' } },
        false,
      ),
    );

    expect(document.body.textContent).toContain('Unable to connect');
    expect(document.body.textContent).not.toContain('nothing to switch to');
  });
});

describe('ConnectPage: the switch grace', () => {
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

describe('ConnectPage: the screen after a switch THIS popup asked for', () => {
  const SCREEN = 'connect-network-switched';
  const screenText = () => screen.queryByTestId(SCREEN)?.textContent ?? null;

  const LIVE =
    'Your wallet is now on Mainnet. Go back to https://dapp.example and press Connect. ' +
    'You will be asked to approve the connection on Mainnet.';
  const LOCKED =
    'Your wallet is now on Mainnet, and it is locked. Unlock it first, then go back to ' +
    'https://dapp.example and press Connect. You will be asked to approve the connection on Mainnet.';

  /** What the popup's page finds after a switch to mainnet: the stored choice, and the marker. */
  function cameBackOnMainnet(markerOrigin = ORIGIN, to = 'mainnet', at = Date.now()) {
    localStorage.setItem(ACTIVE_NETWORK_KEY, 'mainnet');
    seedSwitchMarker(markerOrigin, to, at);
  }

  it('says where the wallet is, where to go back to, and that the approval is asked again', async () => {
    cameBackOnMainnet();
    await mount();

    expect(screenText()).toBe(LIVE);
  });

  it('is what the round trip really leaves: accept the switch, then load the page that comes back', async () => {
    hostMock.requestNetworkSwitch.mockResolvedValue(ACCEPT);
    const first = await mount();
    // The dApp names the target "Free Testnet Tokens". Only its id may decide anything.
    await first.config.onNetworkMismatch(
      DAPP,
      mismatchCtx({ clientNetwork: { id: 1, name: 'Free Testnet Tokens' } }),
    );
    await macrotask();
    expect(hostMock.reload).toHaveBeenCalledOnce();
    expect(screenText()).toBeNull(); // nothing on the page that is about to be destroyed
    first.view.unmount();
    hostMock.configs.length = 0;
    hostMock.instances.length = 0;

    // The reload: fresh modules, same storage.
    await mount();

    expect(screenText()).toBe(LIVE);
    expect(document.body.textContent).not.toContain('Free Testnet Tokens');
  });

  it('names the network from the wallet\'s own config, whatever the dApp called it', async () => {
    cameBackOnMainnet();
    await mount();

    expect(screenText()).toContain(NETWORKS.mainnet.name);
    expect(screenText()).not.toContain(DAPP.name);
  });

  it('does not render for a switch made in Settings, which leaves no origin to name', async () => {
    freshModules(hostMock.reload);
    const settings = await import('../../../src/config/network');
    settings.setActiveNetwork('mainnet'); // the Settings path: no forOrigin
    expect(hostMock.reload).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem(MARKER_KEY)).toBeNull();

    const { net } = await mount();

    // The switch happened and this load knows it (the plans offer reads that); it has no site to name.
    expect(localStorage.getItem(ACTIVE_NETWORK_KEY)).toBe('mainnet');
    expect(net.NETWORK_SWITCHED_TO).toBe('mainnet');
    expect(net.NETWORK_SWITCHED_FOR).toBeNull();
    expect(screenText()).toBeNull();
  });

  it('does not render on a plain load', async () => {
    await mount();
    expect(screenText()).toBeNull();
  });

  it('does not render for a switch that was made for ANOTHER origin', async () => {
    cameBackOnMainnet('https://some-other-site.example');
    const { net } = await mount();

    // The marker is intact and valid: it is the origin comparison that withholds the screen.
    expect(net.NETWORK_SWITCHED_FOR).toEqual({ origin: 'https://some-other-site.example', to: 'mainnet' });
    expect(screenText()).toBeNull();
  });

  it('does not render for a stale marker', async () => {
    cameBackOnMainnet(ORIGIN, 'mainnet', Date.now() - 6 * 60_000);
    const { net } = await mount();

    expect(net.NETWORK_SWITCHED_FOR).toBeNull(); // the record itself refused it
    expect(screenText()).toBeNull();
  });

  it('does not render for a switch that did not survive the boot', async () => {
    // The marker says mainnet, the wallet came up on testnet2: announcing "now on Mainnet" would be false.
    seedSwitchMarker(ORIGIN, 'mainnet');
    const { net } = await mount();

    expect(net.SPHERE_NETWORK).toBe('testnet2');
    expect(net.NETWORK_SWITCHED_FOR).toBeNull();
    expect(screenText()).toBeNull();
  });

  it('says the wallet is LOCKED when the idle window expired during the switch, and promises nothing before the unlock', async () => {
    cameBackOnMainnet();
    sphereMock.sphere = null;
    sphereMock.isLocked = true;
    await mount();

    expect(screenText()).toBe(LOCKED);
    expect(screenText()).not.toBe(LIVE);
  });

  it('changes to the live line by itself once the wallet is unlocked', async () => {
    cameBackOnMainnet();
    sphereMock.sphere = null;
    sphereMock.isLocked = true;
    const { view, ConnectPage } = await mount();
    expect(screenText()).toBe(LOCKED);

    sphereMock.sphere = { identity: { chainPubkey: '02ab' } };
    sphereMock.isLocked = false;
    view.rerender(
      <MemoryRouter initialEntries={['/connect?origin=https%3A%2F%2Fdapp.example']}>
        <ConnectPage />
      </MemoryRouter>,
    );

    expect(screenText()).toBe(LIVE);
  });

  it('goes away when the wallet is lost for good: neither live nor locked, so no connection can come', async () => {
    cameBackOnMainnet();
    const { view, ConnectPage } = await mount();
    expect(screenText()).toBe(LIVE);

    // A generic init failure, not a lock: unlocking cannot cure it.
    sphereMock.sphere = null;
    sphereMock.isLocked = false;
    view.rerender(
      <MemoryRouter initialEntries={['/connect?origin=https%3A%2F%2Fdapp.example']}>
        <ConnectPage />
      </MemoryRouter>,
    );

    expect(screenText()).toBeNull();
  });

  it('goes away once the dApp is connected: "press Connect" would no longer be true', async () => {
    cameBackOnMainnet();
    hostMock.requestApproval.mockResolvedValue({ approved: true, grantedPermissions: ['identity:read'] });
    const { config } = await mount();
    expect(screenText()).toBe(LIVE);

    await act(async () => {
      await config.onConnectionRequest(DAPP, ['identity:read'], false);
    });

    expect(screenText()).toBeNull();
    expect(document.body.textContent).toContain('Connected to Hostile Swap');
  });

  // A repeat switcher: the origin already holds an approval on the network the wallet moved to.
  // Approvals persist per network and never expire, and onConnectionRequest auto-approves a saved
  // origin with NO modal, so "you will be asked" would promise a checkpoint that does not happen.
  const LIVE_APPROVED =
    'Your wallet is now on Mainnet. Go back to https://dapp.example and press Connect.';
  const LOCKED_APPROVED =
    'Your wallet is now on Mainnet, and it is locked. Unlock it first, then go back to ' +
    'https://dapp.example and press Connect.';

  /**
   * Save an approval for ORIGIN under `network`, through the real writer, BEFORE the marker is
   * seeded: importing a module graph reads and consumes the marker at load, so seeding it first
   * would hand it to this throwaway graph instead of the one `mount()` builds.
   */
  async function approvedBefore(network: 'testnet2' | 'mainnet') {
    if (network === 'mainnet') localStorage.setItem(ACTIVE_NETWORK_KEY, 'mainnet');
    else localStorage.removeItem(ACTIVE_NETWORK_KEY);
    freshModules(hostMock.reload);
    const sites = await import('../../../src/utils/connected-sites');
    sites.saveApprovedOrigin(ORIGIN, DAPP, ['identity:read']);
    expect(sites.getApprovedOrigin(ORIGIN)).not.toBeNull();
  }

  it('drops the promise of an approval when the origin already holds one on this network', async () => {
    await approvedBefore('mainnet');
    cameBackOnMainnet();
    await mount();

    expect(screenText()).toBe(LIVE_APPROVED);
  });

  it('drops it in the LOCKED line too', async () => {
    await approvedBefore('mainnet');
    cameBackOnMainnet();
    sphereMock.sphere = null;
    sphereMock.isLocked = true;
    await mount();

    expect(screenText()).toBe(LOCKED_APPROVED);
  });

  it('keeps the promise when the only approval is on the network the wallet LEFT', async () => {
    await approvedBefore('testnet2'); // approved on testnet2, then switched to mainnet: nothing there
    cameBackOnMainnet();
    await mount();

    expect(screenText()).toBe(LIVE);
  });

  it('does not come back after a disconnect: the page has moved on, and "now" would be stale', async () => {
    cameBackOnMainnet();
    hostMock.requestApproval.mockResolvedValue({ approved: true, grantedPermissions: ['identity:read'] });
    const { config } = await mount();
    expect(screenText()).toBe(LIVE);

    await act(async () => {
      await config.onConnectionRequest(DAPP, ['identity:read'], false);
    });
    expect(screenText()).toBeNull();

    act(() => (config as unknown as { onDisconnect: () => void }).onDisconnect());

    // The status block is back to "ready" and the notice stays gone.
    expect(document.body.textContent).toContain('Ready for connections');
    expect(screenText()).toBeNull();
  });

  it('only READS the marker: showing the screen leaves the silent-handshake grace unspent', async () => {
    cameBackOnMainnet();
    hostMock.requestApproval.mockResolvedValue({ approved: false, grantedPermissions: [] });
    const { config, net } = await mount();
    expect(screenText()).toBe(LIVE);
    expect(net.NETWORK_SWITCHED_FOR).toEqual({ origin: ORIGIN, to: 'mainnet' });

    // The other reader still gets its evidence: the silent handshake is upgraded to the modal...
    await config.onConnectionRequest(DAPP, ['identity:read'], true);
    expect(hostMock.requestApproval).toHaveBeenCalledOnce();

    // ...and spending it does not take the screen away.
    expect(screenText()).toBe(LIVE);
    expect(net.NETWORK_SWITCHED_FOR).toEqual({ origin: ORIGIN, to: 'mainnet' });
  });
});
