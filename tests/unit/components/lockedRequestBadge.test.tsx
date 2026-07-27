/**
 * Graceful lock §8.3 + FINAL DECISION 4: a locked wallet answers 4009 and lights
 * a PASSIVE badge in permanent chrome. NO dApp request may raise the credential
 * surface — the password field appears only after a human clicks the badge.
 *
 * The load-bearing assertion in this file is "no password field before the
 * click". If it ever passes trivially (because the badge stopped rendering) the
 * count assertions above it fail first.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

const sphereMock = vi.hoisted(() => ({ isLocked: true }));

vi.mock('../../../src/components/connect/ConnectionApprovalModal', () => ({
  ConnectionApprovalModal: () => null,
}));
vi.mock('../../../src/components/connect/ConnectIntentHandler', () => ({
  ConnectIntentHandler: () => null,
}));
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ isLocked: sphereMock.isLocked, unlock: vi.fn(async () => {}) }),
}));

import { ConnectProvider } from '../../../src/components/connect/ConnectProvider';
import { useConnectContext, type ConnectContextValue } from '../../../src/components/connect/ConnectContext';
import { clearConnectHosts } from '../../../src/sdk/connectHostRegistry';

let ctx: ConnectContextValue | null = null;
function Probe() {
  ctx = useConnectContext();
  return null;
}

function renderProvider() {
  return render(<ConnectProvider><Probe /></ConnectProvider>);
}

beforeEach(() => {
  ctx = null;
  sphereMock.isLocked = true;
  clearConnectHosts();
});
afterEach(() => clearConnectHosts());

describe('locked-request badge (graceful lock §8.3)', () => {
  it('shows nothing at all until a locked request is noted', () => {
    renderProvider();
    expect(screen.queryByTestId('locked-request-badge')).toBeNull();
  });

  it('counts locked requests and names the verified origin', () => {
    renderProvider();

    act(() => {
      ctx!.noteLockedRequest('https://dapp.example', { kind: 'intent', name: 'send' });
      ctx!.noteLockedRequest('https://dapp.example', { kind: 'query', name: 'sphere_getBalance' });
    });

    expect(screen.getByTestId('locked-request-count').textContent).toBe('2');
    expect(screen.getByTestId('locked-request-badge').textContent).toContain('https://dapp.example');
  });

  it('NEVER mounts a credential surface before a human clicks — the whole point', () => {
    renderProvider();

    act(() => {
      for (let i = 0; i < 25; i += 1) {
        ctx!.noteLockedRequest('https://dapp.example', { kind: 'intent', name: 'send' });
      }
    });

    // A dApp firing intents in a loop gets a bigger number on a passive badge,
    // and nothing else. No password field, no modal, no focus stolen.
    expect(screen.getByTestId('locked-request-count').textContent).toBe('25');
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(screen.queryByTestId('locked-request-unlock-surface')).toBeNull();
  });

  it('raises the credential surface on a click, focused, naming the origin', () => {
    renderProvider();
    act(() => { ctx!.noteLockedRequest('https://dapp.example', { kind: 'intent', name: 'send' }); });

    act(() => { fireEvent.click(screen.getByTestId('locked-request-badge')); });

    expect(screen.getByTestId('locked-request-unlock-surface')).toBeDefined();
    // A human asked for this surface, so claiming focus is correct here.
    expect(document.activeElement).toBe(screen.getByLabelText(/password/i));
    expect(screen.getByTestId('unlock-origin').textContent).toContain('https://dapp.example');
    // The destructive restore path is NOT offered from a dApp-motivated surface.
    expect(screen.queryByText(/recovery phrase/i)).toBeNull();
  });

  it('closes on the surface Close control and leaves the badge in place', () => {
    renderProvider();
    act(() => { ctx!.noteLockedRequest('https://dapp.example', { kind: 'intent', name: 'send' }); });
    act(() => { fireEvent.click(screen.getByTestId('locked-request-badge')); });

    act(() => { fireEvent.click(screen.getByLabelText('Close')); });

    expect(screen.queryByTestId('locked-request-unlock-surface')).toBeNull();
    // No cooldown, no dismissal channel: the passive badge simply stays.
    expect(screen.getByTestId('locked-request-badge')).toBeDefined();
  });

  it('does not count a refused handshake — that origin may hold no approval', () => {
    renderProvider();
    act(() => { ctx!.noteLockedRequest('https://stranger.example', { kind: 'handshake', name: 'handshake' }); });
    expect(screen.queryByTestId('locked-request-badge')).toBeNull();
  });

  it('summarises several origins instead of naming one of them', () => {
    renderProvider();
    act(() => {
      ctx!.noteLockedRequest('https://a.example', { kind: 'query', name: 'sphere_getBalance' });
      ctx!.noteLockedRequest('https://b.example', { kind: 'intent', name: 'send' });
    });

    expect(screen.getByTestId('locked-request-count').textContent).toBe('2');
    expect(screen.getByTestId('locked-request-badge').textContent).toContain('2 connected apps');
  });

  it('clears on unlock, and starts from zero if the wallet locks again', () => {
    const { rerender } = renderProvider();
    act(() => { ctx!.noteLockedRequest('https://dapp.example', { kind: 'intent', name: 'send' }); });
    act(() => { fireEvent.click(screen.getByTestId('locked-request-badge')); });

    sphereMock.isLocked = false;
    act(() => { rerender(<ConnectProvider><Probe /></ConnectProvider>); });

    expect(screen.queryByTestId('locked-request-badge')).toBeNull();
    expect(screen.queryByTestId('locked-request-unlock-surface')).toBeNull();

    sphereMock.isLocked = true;
    act(() => { rerender(<ConnectProvider><Probe /></ConnectProvider>); });
    act(() => { ctx!.noteLockedRequest('https://dapp.example', { kind: 'intent', name: 'send' }); });

    expect(screen.getByTestId('locked-request-count').textContent).toBe('1');
  });
});
