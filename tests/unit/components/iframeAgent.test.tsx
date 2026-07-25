/**
 * #451: the in-app agent iframe is a trust boundary. It must never bridge the
 * wallet to its own origin (a same-origin frame could reach the parent DOM),
 * and third-party frames must run under a hardened sandbox (no escaping popups,
 * no clipboard write).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AgentConfig } from '../../../src/config/activities';
import { AGENT_IFRAME_SANDBOX } from '../../../src/config/agentOrigins';

const { ConnectHostMock } = vi.hoisted(() => ({
  ConnectHostMock: vi.fn(function () {
    return {
      destroy: vi.fn(),
      updateSphere: vi.fn(),
      setLocked: vi.fn(),
      setUnavailable: vi.fn(),
      revokeSession: vi.fn(),
      getSession: vi.fn(() => null),
      getState: vi.fn(() => ({ walletState: 'live', session: null })),
    };
  }),
}));

vi.mock('@unicitylabs/sphere-sdk/connect', () => ({
  ConnectHost: ConnectHostMock,
  HOST_READY_TYPE: 'sphere-connect:host-ready',
}));

vi.mock('@unicitylabs/sphere-sdk/connect/browser', () => ({
  PostMessageTransport: { forHost: vi.fn(() => ({ destroy: vi.fn() })) },
}));

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: { identity: { chainPubkey: '02ab' } } }),
}));

vi.mock('../../../src/components/connect/ConnectContext', () => ({
  useConnectContext: () => ({
    requestApproval: vi.fn(),
    requestIntent: vi.fn(),
    setConnectHost: vi.fn(),
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
  ConnectHostMock.mockClear();
});

describe('IframeAgent trust boundary', () => {
  it('refuses to frame the wallet own origin and never attaches a Connect host', () => {
    render(<IframeAgent agent={makeAgent(`${window.location.origin}/malicious`)} />);

    expect(ConnectHostMock).not.toHaveBeenCalled();
    expect(screen.queryByTitle('Test Agent')).toBeNull(); // no iframe rendered
    expect(screen.getByTestId('agent-self-origin-blocked')).toBeDefined();
  });

  it('frames a third-party origin under the hardened sandbox (no escaping popups, no clipboard-write)', () => {
    render(<IframeAgent agent={makeAgent('https://third-party.example/app')} />);

    const iframe = screen.getByTitle('Test Agent') as HTMLIFrameElement;
    expect(iframe.getAttribute('sandbox')).toBe(AGENT_IFRAME_SANDBOX);
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-popups-to-escape-sandbox');
    expect(iframe.getAttribute('allow') ?? '').not.toContain('clipboard-write');
    expect(ConnectHostMock).toHaveBeenCalledTimes(1);
  });
});
