/**
 * #452: the connection-approval modal must anchor trust to the transport-verified
 * origin, not to the dApp-self-reported metadata (name/url/icon). A malicious
 * embed supplies attacker-controlled decoration, so the verified origin is the
 * only thing the user can rely on.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PERMISSION_SCOPES } from '@unicitylabs/sphere-sdk/connect';
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

  it('names the NFT scopes — minting NFTs and sending them are separate grants', () => {
    state.pending = {
      dapp: { name: 'Sphere Memes', url: 'https://memes.example' },
      permissions: ['nft:mint', 'nft:transfer'] as PermissionScope[],
      origin: 'https://memes.example',
      resolve: () => {},
    };

    render(<ConnectionApprovalModal />);

    expect(screen.getByText('Mint an NFT, signed as you')).toBeDefined();
    expect(screen.getByText('Send an NFT from your wallet')).toBeDefined();
    // The raw scope id never reaches the user. It used to be one missing label away from doing
    // so: the old map fell back to printing the scope itself. There is no fallback now — a scope
    // the SDK adds fails the build instead — and the developer list behind the disclosure joins
    // every name into one value, so no node's text is a bare scope id either.
    expect(screen.queryByText('nft:mint')).toBeNull();
  });

  // dm:manage is in the SDK and was absent from the label map, so this screen printed the string
  // "dm:manage" at the user. The exhaustive record is what makes that unrepresentable.
  it('describes every scope the SDK defines, including the one the old label map forgot', () => {
    state.pending = {
      dapp: { name: 'Chat', url: 'https://chat.example' },
      permissions: Object.values(PERMISSION_SCOPES) as PermissionScope[],
      origin: 'https://chat.example',
      resolve: () => {},
    };

    render(<ConnectionApprovalModal />);

    for (const scope of Object.values(PERMISSION_SCOPES)) {
      expect(screen.queryByText(scope as string)).toBeNull();
    }
    expect(screen.getByText('Mark your messages as read')).toBeDefined();
  });
});
