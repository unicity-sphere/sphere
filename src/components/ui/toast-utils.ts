import * as Sentry from '@sentry/react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface TransferToastData {
  /** Header label; defaults to 'Incoming Transfer' when omitted. */
  title?: string;
  /** Omitted for self-mints (top-up), where there is no counterparty. */
  sender?: string;
  amount: string;
  symbol: string;
  iconUrl?: string | null;
  memo?: string;
}

export interface ShowToastDetail {
  message: string;
  type?: ToastType;
  duration?: number;
  transfer?: TransferToastData;
  /**
   * Stable identity for coalescing. Two toasts sharing a groupId are the same
   * notification: the later one replaces the earlier in place and restarts its
   * timer, rather than stacking. Used for incoming payments, which arrive as
   * one event per token.
   */
  groupId?: string;
}

export interface ShowToastOptions {
  /**
   * Set false when the underlying exception was already captured upstream
   * (e.g. the MutationCache onError in lib/queryClient.ts) to avoid a
   * duplicate Sentry event for the same failure.
   */
  report?: boolean;
  /** The original error, when the call site has it — captured with its stack
   * instead of just the toast text. */
  cause?: unknown;
}

// Helper function to show a toast from anywhere
export function showToast(
  message: string,
  type: ToastType = 'info',
  duration?: number,
  options?: ShowToastOptions
) {
  // Red toasts are the errors users see (and screenshot) — mirror them to
  // Sentry so every one of them exists there in text, even when the throwing
  // code swallowed the exception into this toast.
  if (type === 'error' && options?.report !== false) {
    if (options?.cause !== undefined) {
      Sentry.captureException(options.cause, { tags: { source: 'toast' } });
    } else {
      Sentry.captureMessage(message, { level: 'error', tags: { source: 'toast' } });
    }
  }
  window.dispatchEvent(
    new CustomEvent<ShowToastDetail>('show-toast', {
      detail: { message, type, duration },
    })
  );
}

export function showTransferToast(transfer: TransferToastData, duration = 6000, groupId?: string) {
  const message = `${transfer.sender} sent you ${transfer.amount} ${transfer.symbol}`;
  window.dispatchEvent(
    new CustomEvent<ShowToastDetail>('show-toast', {
      detail: { message, type: 'success', duration, transfer, ...(groupId !== undefined ? { groupId } : {}) },
    })
  );
}

/** Toast for coins self-minted via top-up — a transfer toast without a sender. */
export function showMintToast(
  mint: { amount: string; symbol: string; iconUrl?: string | null },
  duration = 6000,
) {
  window.dispatchEvent(
    new CustomEvent<ShowToastDetail>('show-toast', {
      detail: {
        message: `Received ${mint.amount} ${mint.symbol}`,
        type: 'success',
        duration,
        transfer: { title: 'Top Up', amount: mint.amount, symbol: mint.symbol, iconUrl: mint.iconUrl },
      },
    })
  );
}
