/**
 * Graceful lock §8.4: "ConnectPage never removes itself today; with a collection
 * that leaks dead popup hosts."
 *
 * The registry is a collection now, so an unloaded popup that never released its
 * host leaves a dead ConnectHost behind and SphereProvider.lock()'s fan-out calls
 * setLocked() on a host whose transport is gone. Unload and SPA logout must
 * revoke the session AND release the host.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const hostMock = vi.hoisted(() => ({
  instances: [] as Array<Record<string, ReturnType<typeof vi.fn>>>,
  configs: [] as Array<Record<string, unknown>>,
}));

const ctxMock = vi.hoisted(() => ({
  attachHost: vi.fn(),
  releaseHost: vi.fn(),
}));

vi.mock('@unicitylabs/sphere-sdk/connect', () => ({
  ConnectHost: vi.fn(function (config: Record<string, unknown>) {
    const instance = {
      destroy: vi.fn(),
      updateSphere: vi.fn(),
      setLocked: vi.fn(),
      setUnavailable: vi.fn(),
      revokeSession: vi.fn(),
      getSession: vi.fn(() => null),
      getState: vi.fn(() => ({ walletState: 'live', session: null })),
    };
    hostMock.configs.push(config);
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
    sphere: { identity: { chainPubkey: '02ab' } },
    isLoading: false,
    isLocked: false,
    walletExists: true,
  }),
}));

vi.mock('../../../src/components/connect/ConnectContext', () => ({
  useConnectContext: () => ({
    requestApproval: vi.fn(),
    requestIntent: vi.fn(),
    noteLockedRequest: vi.fn(),
    attachHost: ctxMock.attachHost,
    releaseHost: ctxMock.releaseHost,
  }),
}));

vi.mock('../../../src/components/wallet/WalletPanel', () => ({ WalletPanel: () => null }));

import { ConnectPage } from '../../../src/pages/ConnectPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/connect?origin=https%3A%2F%2Fdapp.example']}>
      <ConnectPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  hostMock.instances.length = 0;
  hostMock.configs.length = 0;
  ctxMock.attachHost.mockClear();
  ctxMock.releaseHost.mockClear();
  // ConnectPage refuses to run without an opener (ConnectPage.tsx:86-90).
  Object.defineProperty(window, 'opener', { value: {}, configurable: true, writable: true });
});

afterEach(() => {
  Object.defineProperty(window, 'opener', { value: null, configurable: true, writable: true });
});

describe('ConnectPage host registration', () => {
  it('attaches the host with the transport-verified origin from the search param', () => {
    renderPage();
    expect(ctxMock.attachHost).toHaveBeenCalledTimes(1);
    expect(ctxMock.attachHost.mock.calls[0]![0]).toBe(hostMock.instances[0]);
    expect(ctxMock.attachHost.mock.calls[0]![1]).toBe('https://dapp.example');
    expect(hostMock.configs[0]!.origin).toBe('https://dapp.example');
  });

  it('revokes AND releases on beforeunload, so no dead host leaks into the registry', () => {
    renderPage();
    const host = hostMock.instances[0]!;

    window.dispatchEvent(new Event('beforeunload'));

    expect(host.revokeSession).toHaveBeenCalledTimes(1);
    expect(ctxMock.releaseHost).toHaveBeenCalledWith(host);
  });

  it('revokes AND releases on SPA logout', () => {
    renderPage();
    const host = hostMock.instances[0]!;

    window.dispatchEvent(new CustomEvent('sphere:wallet-logout'));

    expect(host.revokeSession).toHaveBeenCalledTimes(1);
    expect(ctxMock.releaseHost).toHaveBeenCalledWith(host);
  });
});
