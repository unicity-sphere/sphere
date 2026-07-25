/**
 * Graceful lock §8.2: an IframeAgent's ConnectHost must OUTLIVE a lock.
 *
 * Before: `sphereReady` (IframeAgent.tsx:63) was in the construction effect's
 * deps (:169), so a lock ran its cleanup (:165-167) and destroyed the host — the
 * session died with it and a fresh unlock minted a brand-new session the
 * already-loaded dApp never learned about. Only a real navigation (url switch /
 * reload) may tear a host down.
 *
 * Cold-start-locked must still get a host: with an encrypted wallet initialize()
 * takes the classifyInitFailure === 'locked' branch (SphereProvider.tsx:554-566)
 * and never calls setSphere, so a host gated on a live Sphere would never exist
 * and Connect would be dead until a reload.
 *
 * And a host that re-arms with NO session must re-announce HOST_READY: after a
 * wallet reload during a lock the dApp's resume handshake carries a sessionId the
 * fresh host has never seen, so it is refused and nothing else would ever prompt
 * the dApp to handshake again.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { AgentConfig } from '../../../src/config/activities';

const sphereMock = vi.hoisted(() => ({
  sphere: { identity: { chainPubkey: '02ab' } } as unknown | null,
  isLoading: false,
  isLocked: false,
  walletExists: true,
}));

const hostMock = vi.hoisted(() => ({
  instances: [] as Array<Record<string, ReturnType<typeof vi.fn>>>,
  configs: [] as Array<Record<string, unknown>>,
  session: null as unknown,
}));

vi.mock('@unicitylabs/sphere-sdk/connect', () => ({
  ConnectHost: vi.fn(function (config: Record<string, unknown>) {
    const instance = {
      destroy: vi.fn(),
      updateSphere: vi.fn(),
      setLocked: vi.fn(),
      setUnavailable: vi.fn(),
      revokeSession: vi.fn(),
      getSession: vi.fn(() => hostMock.session),
      getState: vi.fn(() => ({ walletState: 'live', session: hostMock.session })),
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

import { IframeAgent } from '../../../src/components/agents/IframeAgent';

const URL_A = 'https://third-party.example/app';

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
  hostMock.instances.length = 0;
  hostMock.configs.length = 0;
  hostMock.session = null;
  sphereMock.sphere = { identity: { chainPubkey: '02ab' } };
  sphereMock.isLoading = false;
  sphereMock.isLocked = false;
  sphereMock.walletExists = true;
});

describe('IframeAgent lock lifecycle (graceful lock §8.2)', () => {
  it('keeps the host alive on a lock and tells it setLocked()', () => {
    const { rerender } = render(<IframeAgent agent={makeAgent(URL_A)} />);
    expect(hostMock.instances).toHaveLength(1);
    const host = hostMock.instances[0]!;

    sphereMock.sphere = null;
    sphereMock.isLocked = true;
    rerender(<IframeAgent agent={makeAgent(URL_A)} />);

    expect(host.setLocked).toHaveBeenCalledTimes(1);
    expect(host.setUnavailable).not.toHaveBeenCalled();
    // The whole point: the host object — and its session — survives.
    expect(host.destroy).not.toHaveBeenCalled();
    expect(hostMock.instances).toHaveLength(1);
  });

  it('re-arms the SAME host on unlock instead of building a new one', () => {
    const { rerender } = render(<IframeAgent agent={makeAgent(URL_A)} />);
    const host = hostMock.instances[0]!;

    sphereMock.sphere = null;
    sphereMock.isLocked = true;
    rerender(<IframeAgent agent={makeAgent(URL_A)} />);

    sphereMock.sphere = { identity: { chainPubkey: '02ab' } };
    sphereMock.isLocked = false;
    rerender(<IframeAgent agent={makeAgent(URL_A)} />);

    expect(host.updateSphere).toHaveBeenCalledTimes(1);
    expect(hostMock.instances).toHaveLength(1);
  });

  it('treats a NON-lock loss of Sphere as unavailable, not as a lock', () => {
    const { rerender } = render(<IframeAgent agent={makeAgent(URL_A)} />);
    const host = hostMock.instances[0]!;

    // A generic init failure leaves sphere === null with isLocked === false
    // (SphereProvider.tsx:643-644). Unlocking cannot cure that, so promising an
    // unlock would be a lie.
    sphereMock.sphere = null;
    sphereMock.isLocked = false;
    rerender(<IframeAgent agent={makeAgent(URL_A)} />);

    expect(host.setUnavailable).toHaveBeenCalledTimes(1);
    expect(host.setLocked).not.toHaveBeenCalled();
  });

  it('builds a LOCKED host on a cold start with an encrypted wallet', () => {
    sphereMock.sphere = null;
    sphereMock.isLocked = true;
    render(<IframeAgent agent={makeAgent(URL_A)} />);

    expect(hostMock.configs).toHaveLength(1);
    expect(hostMock.configs[0]!.initialWalletState).toBe('locked');
    expect(hostMock.configs[0]!.sphere).toBeNull();
    expect(hostMock.configs[0]!.origin).toBe('https://third-party.example');
    expect(typeof hostMock.configs[0]!.onLockedRequest).toBe('function');
  });

  it('re-announces HOST_READY when a SESSIONLESS host re-arms (wallet reloaded during a lock)', () => {
    sphereMock.sphere = null;
    sphereMock.isLocked = true;
    const { container, rerender } = render(<IframeAgent agent={makeAgent(URL_A)} />);

    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.contentWindow).not.toBeNull();
    const postMessage = vi.spyOn(iframe!.contentWindow!, 'postMessage');

    hostMock.session = null; // the fresh host never saw the dApp's sessionId
    sphereMock.sphere = { identity: { chainPubkey: '02ab' } };
    sphereMock.isLocked = false;
    rerender(<IframeAgent agent={makeAgent(URL_A)} />);

    expect(postMessage).toHaveBeenCalledWith(
      { type: 'sphere-connect:host-ready' },
      'https://third-party.example',
    );
  });

  it('does NOT re-announce HOST_READY when the host kept its session', () => {
    const { container, rerender } = render(<IframeAgent agent={makeAgent(URL_A)} />);

    sphereMock.sphere = null;
    sphereMock.isLocked = true;
    rerender(<IframeAgent agent={makeAgent(URL_A)} />);

    const iframe = container.querySelector('iframe');
    expect(iframe!.contentWindow).not.toBeNull();
    const postMessage = vi.spyOn(iframe!.contentWindow!, 'postMessage');

    hostMock.session = { id: 'session-1', active: true }; // still connected
    sphereMock.sphere = { identity: { chainPubkey: '02ab' } };
    sphereMock.isLocked = false;
    rerender(<IframeAgent agent={makeAgent(URL_A)} />);

    // The dApp is still connected — a HOST_READY here would make it re-handshake
    // for nothing.
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('builds no host when there is no wallet at all (onboarding)', () => {
    sphereMock.sphere = null;
    sphereMock.isLocked = false;
    sphereMock.walletExists = false;
    render(<IframeAgent agent={makeAgent(URL_A)} />);
    expect(hostMock.instances).toHaveLength(0);
  });

  it('builds no host while the provider is still initializing', () => {
    sphereMock.sphere = null;
    sphereMock.isLoading = true;
    sphereMock.isLocked = true;
    render(<IframeAgent agent={makeAgent(URL_A)} />);
    expect(hostMock.instances).toHaveLength(0);
  });
});
