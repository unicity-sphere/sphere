/**
 * HOST_READY is a promise the popup makes to the dApp: "a host that can COMPLETE a handshake
 * is listening". Breaking that promise is the whole bug this file guards.
 *
 * A popup that cold-starts on a LOCKED wallet builds its host with `sphere: null`, so the
 * host's snapshot is empty and the SDK refuses EVERY handshake it receives — a resume and an
 * already-approved origin included — with an errorless empty response the dApp can only
 * render as "Connection rejected by wallet". Announcing from such a host also burns the
 * dApp's one-shot readiness wait, so the next attempt hangs until it times out.
 *
 * So the announcement is deferred to the moment a human unlocks, which is exactly where the
 * dApp is still waiting.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const sphereMock = vi.hoisted(() => ({
  sphere: { identity: { chainPubkey: '02ab' } } as unknown | null,
  isLoading: false,
  isLocked: false,
  walletExists: true,
}));

const hostMock = vi.hoisted(() => ({
  instances: [] as Array<Record<string, ReturnType<typeof vi.fn>>>,
  /** Set by a test BEFORE the re-arm to model a host that still holds a dApp session. */
  session: null as unknown,
  /** Interleaving probe: proves getSession() is sampled before updateSphere() runs. */
  order: [] as string[],
}));

vi.mock('@unicitylabs/sphere-sdk/connect', () => ({
  ConnectHost: vi.fn(function () {
    const instance = {
      destroy: vi.fn(),
      updateSphere: vi.fn(() => {
        hostMock.order.push('updateSphere');
        // The real updateSphere() revokes on an identity mismatch or an expired session.
        // Modelled here so a sample taken AFTER it would read null and look sessionless.
        hostMock.session = null;
      }),
      setLocked: vi.fn(() => { hostMock.order.push('setLocked'); }),
      setUnavailable: vi.fn(() => { hostMock.order.push('setUnavailable'); }),
      revokeSession: vi.fn(),
      getSession: vi.fn(() => {
        hostMock.order.push('getSession');
        return hostMock.session;
      }),
      getState: vi.fn(() => ({ walletState: 'live', session: hostMock.session })),
    };
    hostMock.instances.push(instance);
    return instance;
  }),
  HOST_READY_TYPE: 'sphere-connect:host-ready',
  ERROR_CODES: { WALLET_LOCKED: 4009, INTERNAL_ERROR: -32603, INTENT_CANCELLED: 4200 },
}));

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
    requestApproval: vi.fn(),
    requestIntent: vi.fn(),
    noteLockedRequest: vi.fn(),
    attachHost: vi.fn(),
    releaseHost: vi.fn(),
  }),
}));

vi.mock('../../../src/components/wallet/WalletPanel', () => ({ WalletPanel: () => null }));

import { ConnectPage } from '../../../src/pages/ConnectPage';

const ORIGIN = 'https://dapp.example';
let postMessage: ReturnType<typeof vi.fn>;

/** A FRESH element every time: React bails out of `rerender` when handed the same one. */
function tree() {
  return (
    <MemoryRouter initialEntries={[`/connect?origin=${encodeURIComponent(ORIGIN)}`]}>
      <ConnectPage />
    </MemoryRouter>
  );
}

/** HOST_READY posts only, in call order. */
function announcements(): unknown[] {
  return postMessage.mock.calls
    .filter((c) => (c[0] as { type?: string } | undefined)?.type === 'sphere-connect:host-ready')
    .map((c) => c[1]);
}

beforeEach(() => {
  hostMock.instances.length = 0;
  hostMock.order.length = 0;
  hostMock.session = null;
  sphereMock.sphere = { identity: { chainPubkey: '02ab' } };
  sphereMock.isLoading = false;
  sphereMock.isLocked = false;
  sphereMock.walletExists = true;
  postMessage = vi.fn();
  Object.defineProperty(window, 'opener', {
    value: { postMessage },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  Object.defineProperty(window, 'opener', { value: null, configurable: true, writable: true });
});

describe('ConnectPage HOST_READY announcements', () => {
  it('announces at construction when the wallet is already unlocked, targeted at the verified origin', () => {
    render(tree());
    expect(announcements()).toEqual([ORIGIN]);
  });

  it('stays SILENT at construction when the popup cold-starts locked', () => {
    sphereMock.sphere = null;
    sphereMock.isLocked = true;

    render(tree());

    // The host exists — it is needed for onLockedRequest and must survive the unlock…
    expect(hostMock.instances).toHaveLength(1);
    // …but it would refuse every handshake, so promising readiness is a lie that costs the
    // dApp its one-shot wait.
    expect(announcements()).toEqual([]);
  });

  it('announces on the locked -> live re-arm, so a dApp still waiting can finally handshake', () => {
    sphereMock.sphere = null;
    sphereMock.isLocked = true;
    const { rerender } = render(tree());
    expect(announcements()).toEqual([]);

    // A human types the password.
    sphereMock.sphere = { identity: { chainPubkey: '02ab' } };
    sphereMock.isLocked = false;
    act(() => { rerender(tree()); });

    const host = hostMock.instances[0]!;
    expect(host.updateSphere).toHaveBeenCalledTimes(1);
    expect(announcements()).toEqual([ORIGIN]);
  });

  it('does NOT announce on a re-arm when the host kept its session', () => {
    sphereMock.sphere = null;
    sphereMock.isLocked = true;
    const { rerender } = render(tree());
    // A dApp connected before the lock and still holds this session.
    hostMock.session = { id: 'sess-1' };

    sphereMock.sphere = { identity: { chainPubkey: '02ab' } };
    sphereMock.isLocked = false;
    act(() => { rerender(tree()); });

    // That dApp is still connected: it gets wallet:unlocked, not an order to re-handshake,
    // which would make it tear its transport down.
    expect(hostMock.instances[0]!.updateSphere).toHaveBeenCalledTimes(1);
    expect(announcements()).toEqual([]);
  });

  it('samples the session BEFORE updateSphere(), so a revoke inside it cannot fake a re-arm', () => {
    sphereMock.sphere = null;
    sphereMock.isLocked = true;
    const { rerender } = render(tree());
    hostMock.session = { id: 'sess-1' };
    hostMock.order.length = 0;

    sphereMock.sphere = { identity: { chainPubkey: '02ab' } };
    sphereMock.isLocked = false;
    act(() => { rerender(tree()); });

    // updateSphere() nulls the session in this mock, exactly as the real revoke paths do.
    // Sampling afterwards would report "sessionless" and announce — the assertion above
    // would flip. The order is the invariant.
    expect(hostMock.order).toEqual(['getSession', 'updateSphere']);
  });

  it('never announces when there is no opener to announce to', () => {
    Object.defineProperty(window, 'opener', { value: null, configurable: true, writable: true });
    render(tree());
    expect(postMessage).not.toHaveBeenCalled();
  });
});
