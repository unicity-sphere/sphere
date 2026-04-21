import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const UI_STATE_KEY = ['ui', 'state'] as const;

interface UIState {
  isFullscreen: boolean;
}

const defaultState: UIState = {
  isFullscreen: false,
};

export function useUIState() {
  const queryClient = useQueryClient();

  const { data: uiState = defaultState } = useQuery({
    queryKey: UI_STATE_KEY,
    queryFn: () => defaultState,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const setFullscreen = useCallback((value: boolean) => {
    // Mobile guard: fullscreen mode has no exit UI on mobile viewports (the
    // Header toggle is hidden on lg- breakpoints), so entering fullscreen here
    // would trap the user. `typeof window` guards SSR / test environments that
    // lack `matchMedia`.
    if (
      value &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 1023px)').matches
    ) {
      return;
    }
    queryClient.setQueryData<UIState>(UI_STATE_KEY, (prev) => ({
      ...prev,
      ...defaultState,
      isFullscreen: value,
    }));
  }, [queryClient]);

  const toggleFullscreen = useCallback(() => {
    queryClient.setQueryData<UIState>(UI_STATE_KEY, (prev) => {
      const next = !prev?.isFullscreen;
      // Same mobile guard as setFullscreen: never transition *into* fullscreen
      // on mobile, but allow toggling *out* (next === false) from any viewport.
      if (
        next &&
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(max-width: 1023px)').matches
      ) {
        return prev ?? defaultState;
      }
      return {
        ...prev,
        ...defaultState,
        isFullscreen: next,
      };
    });
  }, [queryClient]);

  return {
    isFullscreen: uiState.isFullscreen,
    setFullscreen,
    toggleFullscreen,
  };
}
