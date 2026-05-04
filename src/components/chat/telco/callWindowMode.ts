// Helpers for the three call-window modes:
//
//   'embedded'    — default; call overlay sits on top of the Sphere page
//   'fullscreen'  — uses the standard Fullscreen API; the overlay element
//                   takes over the whole screen, all other browser chrome
//                   is hidden.
//   'separate'    — uses the Document Picture-in-Picture API (Chrome 116+);
//                   spawns a small detached browser window containing the
//                   call UI while the user keeps using the Sphere tab.
//
// The Fullscreen API is broadly supported; Document PIP is Chromium-only
// at the time of writing. isSeparateWindowSupported() returns false on
// browsers that don't support it so the UI can hide the button.

interface DocumentPictureInPictureWindow extends Window {
  // No additional methods used; just type-tag the result.
  documentPictureInPicture?: undefined;
}

interface DocumentPictureInPicture {
  readonly window: DocumentPictureInPictureWindow | null;
  requestWindow(options?: { width?: number; height?: number }): Promise<DocumentPictureInPictureWindow>;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

export function isFullscreenSupported(): boolean {
  return typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;
}

export function isSeparateWindowSupported(): boolean {
  return typeof window !== 'undefined' && !!window.documentPictureInPicture;
}

export function isFullscreenActive(): boolean {
  return typeof document !== 'undefined' && !!document.fullscreenElement;
}

export async function enterFullscreen(element: HTMLElement): Promise<void> {
  if (!element.requestFullscreen) return;
  await element.requestFullscreen();
}

export async function exitFullscreen(): Promise<void> {
  if (typeof document === 'undefined') return;
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  }
}

/**
 * Open a Document Picture-in-Picture window. The caller is responsible for
 * rendering its UI into pipWindow.document (typically via createPortal).
 *
 * Returns the spawned window, or null if the browser doesn't support it
 * or the request was rejected.
 */
export async function openSeparateWindow(
  width = 480,
  height = 720,
): Promise<DocumentPictureInPictureWindow | null> {
  const dpip = window.documentPictureInPicture;
  if (!dpip) return null;
  try {
    const w = await dpip.requestWindow({ width, height });
    // Copy stylesheet links so Tailwind classes work inside the PiP window.
    Array.from(document.styleSheets).forEach((stylesheet) => {
      try {
        const cssRules = Array.from(stylesheet.cssRules)
          .map((rule) => rule.cssText)
          .join('');
        const style = w.document.createElement('style');
        style.textContent = cssRules;
        w.document.head.appendChild(style);
      } catch {
        // Cross-origin stylesheet — fall back to <link>
        const link = w.document.createElement('link');
        link.rel = 'stylesheet';
        link.type = stylesheet.type;
        link.media = stylesheet.media as unknown as string;
        if (stylesheet.href) link.href = stylesheet.href;
        w.document.head.appendChild(link);
      }
    });
    w.document.body.style.margin = '0';
    w.document.body.style.background = '#171717';
    return w;
  } catch (err) {
    console.warn('[telco] openSeparateWindow failed:', err);
    return null;
  }
}
