import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const UI_STATE_KEY = ['ui', 'state'] as const;

// Use Bootstrap-convention breakpoint (1023.98px) to match useMobileNav.
const MOBILE_MQ = '(max-width: 1023.98px)';

interface UIState {
  isFullscreen: boolean;
}

const defaultState: UIState = {
  isFullscreen: false,
};

function isMobileViewport(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(MOBILE_MQ).matches
  );
}

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
    if (value && isMobileViewport()) {
      return;
    }
    queryClient.setQueryData<UIState>(UI_STATE_KEY, (prev) => ({
      ...(prev ?? defaultState),
      isFullscreen: value,
    }));
  }, [queryClient]);

  const toggleFullscreen = useCallback(() => {
    queryClient.setQueryData<UIState>(UI_STATE_KEY, (prev) => {
      const next = !prev?.isFullscreen;
      // Same mobile guard as setFullscreen: never transition *into* fullscreen
      // on mobile, but allow toggling *out* (next === false) from any viewport.
      if (next && isMobileViewport()) {
        return prev ?? defaultState;
      }
      return {
        ...(prev ?? defaultState),
        isFullscreen: next,
      };
    });
  }, [queryClient]);

  // Defense-in-depth: even if isFullscreen somehow becomes true on mobile
  // (e.g. BFCache restore of a persisted desktop session, or a race between
  // resize and setter), mask it to false for consumers. This guarantees the
  // "fullscreen trap on mobile" bug cannot manifest.
  const rawFullscreen = uiState.isFullscreen;
  const isFullscreen = rawFullscreen && !isMobileViewport();

  return {
    isFullscreen,
    setFullscreen,
    toggleFullscreen,
  };
}
