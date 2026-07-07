import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  showToast,
  showTransferToast,
  showMintToast,
  type ShowToastDetail,
} from '../../../src/components/ui/toast-utils';
import * as Sentry from '@sentry/react';

vi.mock('@sentry/react', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

/** Capture the next `show-toast` CustomEvent dispatched on window. */
function captureToast(fire: () => void): ShowToastDetail {
  let detail: ShowToastDetail | undefined;
  const handler = (e: Event) => {
    detail = (e as CustomEvent<ShowToastDetail>).detail;
  };
  window.addEventListener('show-toast', handler);
  try {
    fire();
  } finally {
    window.removeEventListener('show-toast', handler);
  }
  if (!detail) throw new Error('show-toast event was not dispatched');
  return detail;
}

describe('showToast', () => {
  it('dispatches a plain toast with message and type', () => {
    const detail = captureToast(() => showToast('hello', 'warning', 1234));
    expect(detail).toEqual({ message: 'hello', type: 'warning', duration: 1234 });
  });
});

describe('showToast Sentry mirroring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('captures error toasts as Sentry messages', () => {
    captureToast(() => showToast('Transfer failed: insufficient balance', 'error'));
    expect(Sentry.captureMessage).toHaveBeenCalledWith('Transfer failed: insufficient balance', {
      level: 'error',
      tags: { source: 'toast' },
    });
  });

  it('captures the original error when a cause is provided', () => {
    const cause = new Error('boom');
    captureToast(() => showToast('Something failed', 'error', undefined, { cause }));
    expect(Sentry.captureException).toHaveBeenCalledWith(cause, { tags: { source: 'toast' } });
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('does not report when report: false (already captured upstream)', () => {
    captureToast(() => showToast('Transfer failed', 'error', undefined, { report: false }));
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('does not report non-error toasts', () => {
    captureToast(() => showToast('Copied!', 'success'));
    captureToast(() => showToast('FYI', 'info'));
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});

describe('showTransferToast', () => {
  it('dispatches a transfer toast with sender line', () => {
    const detail = captureToast(() =>
      showTransferToast({ sender: '@alice', amount: '5', symbol: 'UCT' }),
    );
    expect(detail.type).toBe('success');
    expect(detail.message).toBe('@alice sent you 5 UCT');
    expect(detail.transfer).toMatchObject({ sender: '@alice', amount: '5', symbol: 'UCT' });
  });
});

describe('showMintToast', () => {
  it('dispatches a senderless transfer toast titled "Top Up"', () => {
    const detail = captureToast(() =>
      showMintToast({ amount: '100', symbol: 'UCT', iconUrl: 'https://x/uct.png' }),
    );
    expect(detail.type).toBe('success');
    expect(detail.message).toBe('Received 100 UCT');
    expect(detail.transfer).toEqual({
      title: 'Top Up',
      amount: '100',
      symbol: 'UCT',
      iconUrl: 'https://x/uct.png',
    });
    expect(detail.transfer?.sender).toBeUndefined();
  });

  it('works without an icon', () => {
    const detail = captureToast(() => showMintToast({ amount: '0.5', symbol: 'ETH' }));
    expect(detail.message).toBe('Received 0.5 ETH');
    expect(detail.transfer).toEqual({ title: 'Top Up', amount: '0.5', symbol: 'ETH', iconUrl: undefined });
  });
});
