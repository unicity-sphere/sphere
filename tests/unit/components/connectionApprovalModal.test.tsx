/**
 * #452: the connection-approval modal must anchor trust to the transport-verified
 * origin, not to the dApp-self-reported metadata (name/url/icon). A malicious
 * embed supplies attacker-controlled decoration, so the verified origin is the
 * only thing the user can rely on.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PermissionScope } from '@unicitylabs/sphere-sdk/connect';

const state = vi.hoisted(() => ({
  pending: null as null | {
    dapp: { name: string; url: string; icon?: string };
    permissions: PermissionScope[];
    origin: string;
    resolve: () => void;
  },
}));

vi.mock('../../../src/components/connect/ConnectContext', () => ({
  useConnectContext: () => ({
    pendingApproval: state.pending,
    approveConnection: vi.fn(),
    denyConnection: vi.fn(),
  }),
}));

import { ConnectionApprovalModal } from '../../../src/components/connect/ConnectionApprovalModal';

beforeEach(() => {
  state.pending = null;
});

describe('ConnectionApprovalModal — verified origin as trust anchor', () => {
  it('shows the transport-verified origin, not the dApp-reported url', () => {
    state.pending = {
      dapp: { name: 'Totally Legit Wallet', url: 'https://accounts.google.com' },
      permissions: [],
      origin: 'https://evil.attacker.example',
      resolve: () => {},
    };

    render(<ConnectionApprovalModal />);

    // The verified origin is shown as the primary identity.
    expect(screen.getByTestId('connect-verified-origin').textContent).toContain(
      'https://evil.attacker.example',
    );
  });

  it('warns that an unverified third-party origin is not trusted by Sphere', () => {
    state.pending = {
      dapp: { name: 'App', url: 'https://app.example' },
      permissions: [],
      origin: 'https://app.example',
      resolve: () => {},
    };

    render(<ConnectionApprovalModal />);

    expect(screen.getByTestId('connect-origin-warning')).toBeDefined();
  });

  it('warns when the dApp-reported url host does not match the verified origin', () => {
    state.pending = {
      dapp: { name: 'App', url: 'https://accounts.google.com/signin' },
      permissions: [],
      origin: 'https://evil.attacker.example',
      resolve: () => {},
    };

    render(<ConnectionApprovalModal />);

    expect(screen.getByTestId('connect-origin-mismatch')).toBeDefined();
  });
});
