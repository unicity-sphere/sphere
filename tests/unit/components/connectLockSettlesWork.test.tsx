/**
 * Graceful lock §8.4: a lock must settle everything Connect is holding — with
 * the same typed CODE the host answers new requests with — and unmount the
 * intent modal. An unsettled resolve behind the lock screen leaves the host's
 * `await onIntent(...)` hanging until its own deadline; an approve button left on
 * screen would operate on a Sphere the provider already destroyed.
 *
 * The assertions are on `code` only: the refusal TEXT is a documented
 * recommendation, never a wire contract (spec §2.2.11).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';
import { ERROR_CODES } from '@unicitylabs/sphere-sdk/connect';

const sphereMock = vi.hoisted(() => ({ isLocked: false }));

vi.mock('../../../src/components/connect/ConnectionApprovalModal', () => ({
  ConnectionApprovalModal: () => null,
}));
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ isLocked: sphereMock.isLocked, unlock: vi.fn(async () => {}) }),
}));
vi.mock('../../../src/components/connect/ConnectIntentHandler', async () => {
  const { useConnectContext } = await import('../../../src/components/connect/ConnectContext');
  return {
    ConnectIntentHandler: () => {
      const { pendingIntent } = useConnectContext();
      return pendingIntent ? <div data-testid="intent-modal">{pendingIntent.action}</div> : null;
    },
  };
});

import { ConnectProvider } from '../../../src/components/connect/ConnectProvider';
import { useConnectContext, type ConnectContextValue } from '../../../src/components/connect/ConnectContext';
import { clearConnectHosts } from '../../../src/sdk/connectHostRegistry';

const host = { id: 'A' } as unknown as ConnectHost;

let ctx: ConnectContextValue | null = null;
function Probe() {
  ctx = useConnectContext();
  return null;
}

beforeEach(() => {
  ctx = null;
  sphereMock.isLocked = false;
  clearConnectHosts();
});
afterEach(() => clearConnectHosts());

describe('lock settles pending Connect work', () => {
  it('rejects every queued intent with WALLET_LOCKED and unmounts the modal', async () => {
    const { rerender } = render(<ConnectProvider><Probe /></ConnectProvider>);
    act(() => ctx!.attachHost(host, 'https://a.example'));

    let first: { error?: { code: number } } | undefined;
    let second: { error?: { code: number } } | undefined;
    act(() => {
      void ctx!.requestIntent(host, 'https://a.example', 'send', {}).then((r) => { first = r; });
      void ctx!.requestIntent(host, 'https://a.example', 'dm', {}).then((r) => { second = r; });
    });
    expect(screen.getByTestId('intent-modal')).toBeDefined();

    sphereMock.isLocked = true;
    await act(async () => { rerender(<ConnectProvider><Probe /></ConnectProvider>); });

    await waitFor(() => expect(first?.error?.code).toBe(ERROR_CODES.WALLET_LOCKED));
    expect(second?.error?.code).toBe(ERROR_CODES.WALLET_LOCKED);
    expect(screen.queryByTestId('intent-modal')).toBeNull();
  });

  it('denies a pending connection approval — a locked wallet cannot approve one', async () => {
    const { rerender } = render(<ConnectProvider><Probe /></ConnectProvider>);
    act(() => ctx!.attachHost(host, 'https://a.example'));

    let approval: unknown;
    act(() => {
      void ctx!
        .requestApproval(host, { name: 'App', url: 'https://a.example' }, [], 'https://a.example')
        .then((r) => { approval = r; });
    });

    sphereMock.isLocked = true;
    await act(async () => { rerender(<ConnectProvider><Probe /></ConnectProvider>); });

    await waitFor(() => expect(approval).toEqual({ approved: false, grantedPermissions: [] }));
  });

  it('does nothing while the wallet stays unlocked', () => {
    render(<ConnectProvider><Probe /></ConnectProvider>);
    act(() => ctx!.attachHost(host, 'https://a.example'));

    let settled: unknown;
    act(() => { void ctx!.requestIntent(host, 'https://a.example', 'send', {}).then((r) => { settled = r; }); });

    expect(settled).toBeUndefined();
    expect(screen.getByTestId('intent-modal')).toBeDefined();
  });
});
