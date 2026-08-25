import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ToastContainer } from '../../../src/components/ui/Toast';
import type { ShowToastDetail } from '../../../src/components/ui/toast-utils';

/**
 * Issue #490: a multi-token receive fires one `transfer:incoming` toast per
 * delivered entry, so ~10+ toasts arrive in a burst. The container must cap how
 * many render at once (newest on top) and collapse the rest into a single
 * "+N more" chip — otherwise the stack grows up the screen and covers the
 * wallet. These tests drive the container the way the app does: by dispatching
 * the `show-toast` window CustomEvent it listens for.
 *
 * framer-motion is stubbed so AnimatePresence removal is synchronous and no
 * frame loop competes with fake timers — nothing under test depends on the
 * animation, only on which toasts are in the DOM.
 */
vi.mock('framer-motion', async () => (await import('../../support/framerMotionStub')).framerMotionStub());

const CAP = 3;

/** Dispatch a `show-toast` event exactly as toast-utils / the SDK hooks do. */
function fireToast(message: string, duration?: number) {
  act(() => {
    window.dispatchEvent(
      new CustomEvent<ShowToastDetail>('show-toast', {
        detail: { message, type: 'info', duration },
      }),
    );
  });
}

/** Visible toast messages, top → bottom of the stack. */
function visibleMessages(): string[] {
  return screen.getAllByTestId('toast').map((el) => el.textContent?.trim() ?? '');
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ToastContainer stack cap (#490)', () => {
  it('caps a burst at CAP visible toasts and collapses the rest into "+N more"', () => {
    render(<ToastContainer />);

    const total = 12;
    // duration 0 → no auto-dismiss timer, so the burst stays put for the assertion.
    for (let i = 0; i < total; i++) fireToast(`msg-${i}`, 0);

    // Never more than the cap render, no matter how big the burst.
    expect(screen.getAllByTestId('toast')).toHaveLength(CAP);

    // The visible ones are the newest CAP, newest on top.
    expect(visibleMessages()).toEqual(['msg-11', 'msg-10', 'msg-9']);

    // Everything older is hidden, not rendered.
    expect(screen.queryByText('msg-0')).toBeNull();
    expect(screen.queryByText('msg-8')).toBeNull();

    // Overflow is a single compact chip showing the remainder (12 - 3 = 9).
    const overflow = screen.getByTestId('toast-overflow');
    expect(overflow.textContent).toBe(`+${total - CAP} more`);
  });

  it('leaves low-volume behavior unchanged — no cap, no overflow chip', () => {
    render(<ToastContainer />);

    fireToast('only-a', 0);
    fireToast('only-b', 0);

    expect(screen.getAllByTestId('toast')).toHaveLength(2);
    expect(screen.queryByTestId('toast-overflow')).toBeNull();
  });

  it('promotes a queued toast when a visible one auto-dismisses', () => {
    vi.useFakeTimers();
    render(<ToastContainer />);

    // t0..t4 arrive; t4 (newest, visible) has a short timer, the rest long ones.
    fireToast('t0', 10_000);
    fireToast('t1', 10_000);
    fireToast('t2', 10_000);
    fireToast('t3', 10_000);
    fireToast('t4', 1_000);

    // Newest 3 visible (t2,t3,t4), t0+t1 collapsed.
    expect(visibleMessages()).toEqual(['t4', 't3', 't2']);
    expect(screen.getByTestId('toast-overflow').textContent).toBe('+2 more');

    // t4's timer fires: it leaves and a queued (older) toast surfaces.
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.queryByText('t4')).toBeNull();
    expect(visibleMessages()).toEqual(['t3', 't2', 't1']);
    expect(screen.getByTestId('toast-overflow').textContent).toBe('+1 more');
  });
});
