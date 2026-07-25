/**
 * Graceful lock §8.2/§8.3 for the popup host: it must be built even when the
 * wallet is locked (so the dApp gets HOST_READY and a typed 4009 rather than a
 * silent handshake timeout), must carry the notify-only onLockedRequest, and must
 * stop claiming a healthy green "Connected" while the wallet is locked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const sphereMock = vi.hoisted(() => ({
  sphere: { identity: { chainPubkey: '02ab' } } as unknown | null,
  isLoading: false,
  isLocked: false,
  walletExists: true,
}));

const hostMock = vi.hoisted(() => ({
  instances: [] as Array<Record<string, ReturnType<typeof vi.fn>>>,
  configs: [] as Array<Record<string, unknown>>,
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
  sphereMock.sphere = { identity: { chainPubkey: '02ab' } };
  sphereMock.isLoading = false;
  sphereMock.isLocked = false;
  sphereMock.walletExists = true;
  // ConnectPage refuses to run without an opener (ConnectPage.tsx:86-90).
  Object.defineProperty(window, 'opener', { value: {}, configurable: true, writable: true });
});

afterEach(() => {
  Object.defineProperty(window, 'opener', { value: null, configurable: true, writable: true });
});

describe('ConnectPage under lock', () => {
  it('passes the verified origin and a live initialWalletState when the wallet is unlocked', () => {
    renderPage();
    expect(hostMock.configs).toHaveLength(1);
    expect(hostMock.configs[0]!.origin).toBe('https://dapp.example');
    expect(hostMock.configs[0]!.initialWalletState).toBe('live');
  });

  it('builds a locked host when the popup opens on a locked wallet', () => {
    sphereMock.sphere = null;
    sphereMock.isLocked = true;
    renderPage();

    expect(hostMock.configs).toHaveLength(1);
    expect(hostMock.configs[0]!.initialWalletState).toBe('locked');
    expect(hostMock.configs[0]!.sphere).toBeNull();
    expect(typeof hostMock.configs[0]!.onLockedRequest).toBe('function');
  });

  it('stops claiming a healthy green Connected while the wallet is locked', () => {
    const { rerender } = renderPage();
    expect(screen.getByTestId('connect-status-text').textContent).toContain('Ready for connections');
    expect(screen.getByTestId('connect-status-dot').className).toContain('bg-green-500');

    sphereMock.sphere = null;
    sphereMock.isLocked = true;
    act(() => {
      rerender(
        <MemoryRouter initialEntries={['/connect?origin=https%3A%2F%2Fdapp.example']}>
          <ConnectPage />
        </MemoryRouter>,
      );
    });

    expect(screen.getByTestId('connect-status-text').textContent).toContain('locked');
    expect(screen.getByTestId('connect-status-dot').className).toContain('bg-amber-500');
    expect(screen.getByTestId('connect-status-dot').className).not.toContain('bg-green-500');
  });
});
