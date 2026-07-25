/**
 * Graceful lock §8.4: after the intent modal's CONTENTS change (a fresh intent,
 * or the FIFO queue advancing to the next one) clicks are blocked for a short
 * settle window. All intent modals share button geometry, so a swap under a
 * stationary cursor is clickjacking without an iframe — and a queue hands an
 * attacker a predictable moment.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';

vi.mock('../../../src/components/connect/ConnectionApprovalModal', () => ({
  ConnectionApprovalModal: () => null,
}));
vi.mock('../../../src/components/connect/ConnectIntentHandler', () => ({
  ConnectIntentHandler: () => null,
}));
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ isLocked: false, unlock: vi.fn(async () => {}) }),
}));

import { ConnectProvider } from '../../../src/components/connect/ConnectProvider';
import { useConnectContext, type ConnectContextValue } from '../../../src/components/connect/ConnectContext';
import { clearConnectHosts } from '../../../src/sdk/connectHostRegistry';

const host = { id: 'A' } as unknown as ConnectHost;

let ctx: ConnectContextValue | null = null;
function Probe() {
  ctx = useConnectContext();
  return <div data-testid="interactive">{String(ctx.intentInteractive)}</div>;
}

beforeEach(() => {
  ctx = null;
  clearConnectHosts();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  clearConnectHosts();
});

describe('intent settle-time guard', () => {
  it('shields a freshly opened intent modal, then releases it', () => {
    render(<ConnectProvider><Probe /></ConnectProvider>);
    act(() => ctx!.attachHost(host, 'https://a.example'));

    act(() => { void ctx!.requestIntent(host, 'https://a.example', 'send', {}); });

    expect(screen.getByTestId('intent-settle-shield')).toBeDefined();
    expect(screen.getByTestId('interactive').textContent).toBe('false');

    act(() => { vi.advanceTimersByTime(500); });

    expect(screen.queryByTestId('intent-settle-shield')).toBeNull();
    expect(screen.getByTestId('interactive').textContent).toBe('true');
  });

  it('re-shields when the queue advances to the NEXT intent (the swap moment)', () => {
    render(<ConnectProvider><Probe /></ConnectProvider>);
    act(() => ctx!.attachHost(host, 'https://a.example'));

    act(() => {
      void ctx!.requestIntent(host, 'https://a.example', 'send', {});
      void ctx!.requestIntent(host, 'https://a.example', 'dm', {});
    });

    act(() => { vi.advanceTimersByTime(500); });
    expect(screen.getByTestId('interactive').textContent).toBe('true');

    act(() => ctx!.resolveIntent({ ok: true }));

    // The modal contents just swapped under the cursor — shielded again.
    expect(screen.getByTestId('intent-settle-shield')).toBeDefined();
    expect(screen.getByTestId('interactive').textContent).toBe('false');
  });

  it('renders no shield when there is no intent on screen', () => {
    render(<ConnectProvider><Probe /></ConnectProvider>);
    expect(screen.queryByTestId('intent-settle-shield')).toBeNull();
    expect(screen.getByTestId('interactive').textContent).toBe('false');
  });
});
