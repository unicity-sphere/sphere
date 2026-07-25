/**
 * Graceful lock §8.1 (blocker): logout ≠ lock.
 *
 * A lock now PRESERVES the session, so every logout / wallet-deleted path must
 * use revokeSession() — otherwise an approval granted to the deleted wallet
 * stays live and the next onboarded wallet inherits it via updateSphere()
 * ("Delete wallet -> create new wallet -> getSession() === null").
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { AgentConfig } from '../../../src/config/activities';

const sphereMock = vi.hoisted(() => ({
  sphere: { identity: { chainPubkey: '02ab' } } as unknown | null,
}));

const hostMock = vi.hoisted(() => ({
  order: [] as string[],
  session: { id: 'session-1', active: true } as unknown,
  instance: null as null | Record<string, ReturnType<typeof vi.fn>>,
}));

vi.mock('@unicitylabs/sphere-sdk/connect', () => ({
  ConnectHost: vi.fn(function () {
    const instance = {
      destroy: vi.fn(),
      updateSphere: vi.fn(() => { hostMock.order.push('updateSphere'); }),
      setLocked: vi.fn(() => { hostMock.order.push('setLocked'); }),
      setUnavailable: vi.fn(() => { hostMock.order.push('setUnavailable'); }),
      revokeSession: vi.fn(() => {
        hostMock.order.push('revokeSession');
        hostMock.session = null;
      }),
      getSession: vi.fn(() => hostMock.session),
      getState: vi.fn(() => ({ walletState: 'live', session: hostMock.session })),
    };
    hostMock.instance = instance;
    return instance;
  }),
  HOST_READY_TYPE: 'sphere-connect:host-ready',
  ERROR_CODES: { WALLET_LOCKED: 4009, INTERNAL_ERROR: -32603, INTENT_CANCELLED: 4200 },
}));

vi.mock('@unicitylabs/sphere-sdk/connect/browser', () => ({
  PostMessageTransport: { forHost: vi.fn(() => ({ destroy: vi.fn() })) },
}));

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: sphereMock.sphere }),
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

import { IframeAgent } from '../../../src/components/agents/IframeAgent';

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

beforeEach(() => {
  hostMock.order.length = 0;
  hostMock.session = { id: 'session-1', active: true };
  hostMock.instance = null;
  sphereMock.sphere = { identity: { chainPubkey: '02ab' } };
});

describe('IframeAgent — logout destroys the session (graceful lock §8.1)', () => {
  it('revokes the session on sphere:wallet-logout, and does NOT merely lock it', () => {
    render(<IframeAgent agent={makeAgent('https://third-party.example/app')} />);

    window.dispatchEvent(new CustomEvent('sphere:wallet-logout'));

    expect(hostMock.instance!.revokeSession).toHaveBeenCalledTimes(1);
    expect(hostMock.instance!.setLocked).not.toHaveBeenCalled();
  });

  it('a wallet onboarded after the logout cannot inherit the old session', () => {
    const { rerender } = render(<IframeAgent agent={makeAgent('https://third-party.example/app')} />);

    // deleteWallet(): the in-window signal fires, then a brand-new wallet is
    // onboarded and the [sphere] effect hands the host a different Sphere.
    window.dispatchEvent(new CustomEvent('sphere:wallet-logout'));
    sphereMock.sphere = { identity: { chainPubkey: '02cd' } };
    rerender(<IframeAgent agent={makeAgent('https://third-party.example/app')} />);

    // The revoke landed BEFORE the new Sphere was bound, so there is no session
    // for the new wallet to be re-armed into: getApprovedOrigin() will have to
    // be consulted again at the dApp's next handshake.
    expect(hostMock.order).toEqual(['revokeSession', 'updateSphere']);
    expect(hostMock.instance!.getSession()).toBeNull();
  });
});
