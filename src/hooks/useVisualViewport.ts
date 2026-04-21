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
 * snapshot a stable baseline at mount and compare the current visualViewport
 * height to that baseline.
 *
 * NOTE: We intentionally use `window.innerHeight` (NOT `screen.availHeight`)
 * as the baseline. screen.availHeight is the full device screen height, which
 * on Android with the browser URL bar visible is 100+px larger than
 * innerHeight. Using it would make every page load appear to have a ~100px
 * "keyboard open" at mount — which falsely hides the bottom nav. The real
 * tradeoff: if the keyboard is ALREADY OPEN when the hook first runs (rare;
 * autofocus fires after mount), our baseline captures the shrunk height and
 * detection is off until the user closes the keyboard once. The self-heal
 * branch (delta < 50) then grows the baseline on the first no-keyboard frame.
 *
 * To recover from a poisoned baseline WHILE the keyboard is still open
 * (BFCache restore, autofocus race), we use `window.screen.height` as a
 * secondary signal: if the current visualViewport.height is >= 60% of the
 * screen height, the keyboard is almost certainly not up (keyboards typically
 * consume 30-50% of screen height). In that case we grow the baseline to the
 * current height even when the delta would normally be interpreted as
 * "keyboard open".
 *
 * To avoid false positives on orientation changes (which shrink height AND
 * change width), we track the previous width in a ref: a width change means
 * "rotate/resize — recalibrate baseline", while a width-stable height change
 * is treated as potential keyboard activity. We also set an
 * "orientation in progress" flag that forces isKeyboardOpen=false for the
 * 300ms settle window, since visualViewport.resize can fire before innerWidth
 * updates during rotation.
 */
function initialBaseHeight(): number {
  if (typeof window === 'undefined') return 0;
  return window.innerHeight || 0;
}

export function useVisualViewport() {
  const baseHeight = useRef<number>(initialBaseHeight());
  const prevWidthRef = useRef<number>(typeof window !== 'undefined' ? window.innerWidth : 0);
  const orientationInProgressRef = useRef<boolean>(false);

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

      // During orientation change settle, force no-keyboard to avoid a
      // false-positive flash while innerWidth hasn't caught up yet.
      if (orientationInProgressRef.current) {
        setViewport({ height, offsetTop, isKeyboardOpen: false });
        return;
      }

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

      // Screen-height-based baseline correction. If the current visualViewport
      // height is close to the full screen height, the keyboard is almost
      // certainly NOT up — grow the baseline regardless of the computed delta
      // so a poisoned baseline (BFCache/autofocus race) self-heals on the
      // first no-keyboard frame rather than after one full open/close cycle.
      const screenH = window.screen?.height ?? 0;
      if (screenH > 0 && height >= screenH * 0.6) {
        baseHeight.current = Math.max(baseHeight.current, height);
      }

      const delta = baseHeight.current - height;

      // If the shrink is small (< 50px) it's almost certainly not a keyboard —
      // could be a browser chrome resize, orientation change settling, etc.
      // Track the current unbolstered viewport so baseline doesn't ratchet
      // monotonically upward across many small desktop resizes.
      if (delta < 50) {
        baseHeight.current = Math.max(window.innerHeight, height);
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
      orientationInProgressRef.current = true;
      setTimeout(() => {
        const vvHeight = window.visualViewport?.height ?? 0;
        baseHeight.current = Math.max(window.innerHeight, vvHeight);
        prevWidthRef.current = window.innerWidth;
        orientationInProgressRef.current = false;
        // Force a re-render with the corrected baseline so consumers don't see
        // stale isKeyboardOpen until the next unrelated resize event.
        updateViewport();
      }, 300);
    };

    orientation.addEventListener('change', onOrientationChange);
    return () => {
      orientation.removeEventListener('change', onOrientationChange);
    };
  }, [updateViewport]);

  return viewport;
}
