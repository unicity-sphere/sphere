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

    act(() => ctx!.resolveIntent(ctx!.pendingIntent!.id, { ok: true }));

    // The modal contents just swapped under the cursor — shielded again.
    expect(screen.getByTestId('intent-settle-shield')).toBeDefined();
    expect(screen.getByTestId('interactive').textContent).toBe('false');
  });

  it('re-arms on demand, even after the arrival window has already elapsed', () => {
    render(<ConnectProvider><Probe /></ConnectProvider>);
    act(() => ctx!.attachHost(host, 'https://a.example'));

    act(() => { void ctx!.requestIntent(host, 'https://a.example', 'send', {}); });
    act(() => { vi.advanceTimersByTime(500); });
    expect(screen.getByTestId('interactive').textContent).toBe('true');

    // Same intent, but its actionable UI is only being PRESENTED now (a
    // duplicate-send check that finally answered). The window measures from
    // here — arrival shielded a blank screen.
    act(() => ctx!.armIntentShield());

    expect(screen.getByTestId('intent-settle-shield')).toBeDefined();
    expect(screen.getByTestId('interactive').textContent).toBe('false');

    act(() => { vi.advanceTimersByTime(499); });
    expect(screen.getByTestId('interactive').textContent).toBe('false');
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByTestId('interactive').textContent).toBe('true');
  });

  it('an arm mid-window restarts it in full instead of inheriting the remainder', () => {
    render(<ConnectProvider><Probe /></ConnectProvider>);
    act(() => ctx!.attachHost(host, 'https://a.example'));

    act(() => { void ctx!.requestIntent(host, 'https://a.example', 'send', {}); });
    act(() => { vi.advanceTimersByTime(400); });

    act(() => ctx!.armIntentShield());

    // The arrival timer must have been cleared: if it survived, 100 ms more
    // would release the button 400 ms early.
    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.getByTestId('interactive').textContent).toBe('false');

    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.getByTestId('interactive').textContent).toBe('true');
  });

  it('arming with nothing on screen shields nothing', () => {
    render(<ConnectProvider><Probe /></ConnectProvider>);

    act(() => ctx!.armIntentShield());

    // No intent, no actionable UI — and therefore no full-screen click eater
    // over a wallet the user is using normally.
    expect(screen.queryByTestId('intent-settle-shield')).toBeNull();
    expect(screen.getByTestId('interactive').textContent).toBe('false');
  });

  it('renders no shield when there is no intent on screen', () => {
    render(<ConnectProvider><Probe /></ConnectProvider>);
    expect(screen.queryByTestId('intent-settle-shield')).toBeNull();
    expect(screen.getByTestId('interactive').textContent).toBe('false');
  });
});
