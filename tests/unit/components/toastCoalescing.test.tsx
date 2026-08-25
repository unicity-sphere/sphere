import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';

import { ToastContainer } from '../../../src/components/ui/Toast';
import type { ShowToastDetail } from '../../../src/components/ui/toast-utils';

/**
 * Issue #490, second pass. Capping the rendered stack treated the symptom: a
 * 54-token payment still produced 54 toasts, so the visible three churned on
 * every arrival (a flicker) and the wallet was still buried behind a stack.
 *
 * The fix is coalescing — a `groupId` makes an incoming toast REPLACE its live
 * predecessor in place, so one payment is one toast whose amount climbs.
 *
 * framer-motion is stubbed so AnimatePresence removal is synchronous; nothing
 * under test depends on the animation, only on what is in the DOM.
 */
vi.mock('framer-motion', async () => (await import('../../support/framerMotionStub')).framerMotionStub());

function fire(detail: ShowToastDetail) {
  act(() => {
    window.dispatchEvent(new CustomEvent<ShowToastDetail>('show-toast', { detail }));
  });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('incoming toast coalescing (#490)', () => {
  it('collapses a many-token payment into one toast that keeps the latest total', () => {
    render(<ToastContainer />);

    // What a 54-token receive actually looks like: one event per token, each
    // carrying the running total for that sender.
    for (let i = 1; i <= 54; i++) {
      fire({
        message: `@api-4 sent you ${i * 100} UCT`,
        type: 'success',
        duration: 0,
        groupId: 'incoming:api-4:UCT',
      });
    }

    expect(screen.getAllByTestId('toast')).toHaveLength(1);
    expect(screen.queryByTestId('toast-overflow')).toBeNull();
    expect(screen.getByText('@api-4 sent you 5400 UCT')).toBeTruthy();
  });

  it('keeps unrelated senders as separate toasts', () => {
    render(<ToastContainer />);

    fire({ message: 'from alice', duration: 0, groupId: 'incoming:alice:UCT' });
    fire({ message: 'from bob', duration: 0, groupId: 'incoming:bob:UCT' });
    fire({ message: 'from alice again', duration: 0, groupId: 'incoming:alice:UCT' });

    expect(screen.getAllByTestId('toast')).toHaveLength(2);
    expect(screen.getByText('from alice again')).toBeTruthy();
    expect(screen.getByText('from bob')).toBeTruthy();
  });

  it('restarts the dismiss timer on each update, so a long payment stays visible', () => {
    vi.useFakeTimers();
    render(<ToastContainer />);

    fire({ message: 'tick 1', duration: 1000, groupId: 'incoming:api-4:UCT' });
    act(() => { vi.advanceTimersByTime(800); });

    // A later token lands before the first would have dismissed.
    fire({ message: 'tick 2', duration: 1000, groupId: 'incoming:api-4:UCT' });
    act(() => { vi.advanceTimersByTime(800); });

    // Still up: the update reset its own timer rather than leaving the original.
    expect(screen.getByText('tick 2')).toBeTruthy();

    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('still stacks ungrouped toasts, so unrelated alerts are unaffected', () => {
    render(<ToastContainer />);

    fire({ message: 'error one', type: 'error', duration: 0 });
    fire({ message: 'error two', type: 'error', duration: 0 });

    expect(screen.getAllByTestId('toast')).toHaveLength(2);
  });
});
