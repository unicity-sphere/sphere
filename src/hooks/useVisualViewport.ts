import { useEffect, useState, useCallback, useRef } from 'react';

interface ViewportState {
  height: number;
  offsetTop: number;
  isKeyboardOpen: boolean;
}

/**
 * Hook to track visual viewport changes (especially for mobile keyboard)
 * Uses the Visual Viewport API for accurate mobile viewport tracking
 *
 * NOTE: With interactive-widget=resizes-content, the browser handles layout
 * automatically. This hook is kept for components that need to know if keyboard is open.
 *
 * Keyboard detection uses a snapshot-based baseline rather than comparing
 * visualViewport.height to window.innerHeight. On Android Chrome with
 * interactive-widget=resizes-content, both shrink together when the keyboard
 * opens, so the delta is ~0 and the old approach never fired. We instead
 * snapshot window.innerHeight at mount and compare the current visualViewport
 * height to that baseline. Non-keyboard resizes (orientation change, window
 * resize — delta < 50px) update the baseline so they don't masquerade as a
 * keyboard.
 */
export function useVisualViewport() {
  const baseHeight = useRef<number>(typeof window !== 'undefined' ? window.innerHeight : 0);

  const [viewport, setViewport] = useState<ViewportState>(() => ({
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    offsetTop: 0,
    isKeyboardOpen: false,
  }));

  const updateViewport = useCallback(() => {
    if (typeof window === 'undefined') return;

    const visualViewport = window.visualViewport;
    if (visualViewport) {
      const height = visualViewport.height;
      const offsetTop = visualViewport.offsetTop;
      const delta = baseHeight.current - height;

      // If the shrink is small (< 50px) it's almost certainly not a keyboard —
      // could be a browser chrome resize, orientation change settling, etc.
      // Treat it as a new baseline so a subsequent keyboard open is detectable.
      if (delta < 50) {
        baseHeight.current = Math.max(baseHeight.current, window.innerHeight, height);
      }

      const isKeyboardOpen = baseHeight.current - height > 150;

      setViewport({ height, offsetTop, isKeyboardOpen });
    } else {
      // No Visual Viewport API — fall back to innerHeight and assume no keyboard.
      baseHeight.current = Math.max(baseHeight.current, window.innerHeight);
      setViewport({
        height: window.innerHeight,
        offsetTop: 0,
        isKeyboardOpen: false,
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    updateViewport();

    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', updateViewport);
    }
    window.addEventListener('resize', updateViewport);

    return () => {
      visualViewport?.removeEventListener('resize', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, [updateViewport]);

  return viewport;
}
