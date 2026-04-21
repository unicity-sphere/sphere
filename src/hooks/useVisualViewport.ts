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
 * snapshot a stable baseline (max of innerHeight and screen.availHeight — the
 * latter doesn't shrink for keyboard on iOS/Android) at mount and compare
 * the current visualViewport height to that baseline.
 *
 * To avoid false positives on orientation changes (which shrink height AND
 * change width), we track the previous width in a ref: a width change means
 * "rotate/resize — recalibrate baseline", while a width-stable height change
 * is treated as potential keyboard activity.
 */
function initialBaseHeight(): number {
  if (typeof window === 'undefined') return 0;
  const inner = window.innerHeight || 0;
  const avail = window.screen?.availHeight || 0;
  return Math.max(inner, avail);
}

export function useVisualViewport() {
  const baseHeight = useRef<number>(initialBaseHeight());
  const prevWidthRef = useRef<number>(typeof window !== 'undefined' ? window.innerWidth : 0);

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
      const currentWidth = window.innerWidth;
      const widthChanged = currentWidth !== prevWidthRef.current;

      if (widthChanged) {
        // Orientation change or window resize — width changed, so any height
        // change is NOT a keyboard. Recalibrate the baseline and report no
        // keyboard rather than emitting a false positive during rotation.
        baseHeight.current = Math.max(window.innerHeight, height);
        prevWidthRef.current = currentWidth;
        setViewport({ height, offsetTop, isKeyboardOpen: false });
        return;
      }

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
      prevWidthRef.current = window.innerWidth;
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

  // Listen to orientation change events for more reliable detection than the
  // resize heuristic above. Give layout a moment to settle before recalibrating.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const orientation = window.screen?.orientation;
    if (!orientation || typeof orientation.addEventListener !== 'function') return;

    const onOrientationChange = () => {
      setTimeout(() => {
        const vvHeight = window.visualViewport?.height ?? 0;
        baseHeight.current = Math.max(window.innerHeight, vvHeight);
        prevWidthRef.current = window.innerWidth;
      }, 300);
    };

    orientation.addEventListener('change', onOrientationChange);
    return () => {
      orientation.removeEventListener('change', onOrientationChange);
    };
  }, []);

  return viewport;
}
