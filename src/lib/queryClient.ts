import { MutationCache, QueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { getErrorMessage } from '../sdk/errors';
import { showToast } from '../components/ui/toast-utils';

/**
 * Shared QueryClient instance for TanStack Query.
 *
 * Usage in services:
 *   import { queryClient } from '@/lib/queryClient';
 *   queryClient.invalidateQueries({ queryKey: ['some', 'key'] });
 */
export const queryClient = new QueryClient({
  // Cache-level onError fires for EVERY mutation failure — per-mutation
  // onError options replace defaultOptions.mutations.onError rather than
  // merging, so the Sentry capture must not live there
  mutationCache: new MutationCache({
    onError: (err) => {
      // Mutations are user actions (sends, mints, registrations) whose
      // failures are otherwise only visible as a toast
      Sentry.captureException(err, { tags: { source: 'mutation' } });
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      onError: (err) => {
        // report: false — the MutationCache above already captured the
        // exception with its stack; don't double-report the toast text
        showToast(getErrorMessage(err), 'error', undefined, { report: false });
      },
    },
  },
});

// Dev tools: expose queryClient on window for debugging
declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__?: import('@tanstack/query-core').QueryClient;
  }
}

window.__TANSTACK_QUERY_CLIENT__ = queryClient;
