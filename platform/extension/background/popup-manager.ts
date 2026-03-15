/// <reference types="chrome" />

/**
 * Popup window management for the extension background service worker.
 * Extracted to avoid circular dependencies between index.ts and connect-host.ts.
 */

const SPHERE_URL = chrome.runtime.getURL('index.html');
const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 720;

// Track the popup window ID (in-memory + session storage for service worker restarts)
let sphereWindowId: number | null = null;

// Guard against concurrent window creation (race condition)
let pendingWindowCreate: Promise<chrome.tabs.Tab> | null = null;

// Persist window ID across service worker restarts
async function persistWindowId(id: number | null) {
  sphereWindowId = id;
  await chrome.storage.session.set({ sphereWindowId: id });
}

// Restore window ID from session storage on service worker wake
export async function restoreWindowId() {
  const data = await chrome.storage.session.get('sphereWindowId');
  if (typeof data.sphereWindowId === 'number') {
    sphereWindowId = data.sphereWindowId;
  }
}

async function findSphereTab(): Promise<chrome.tabs.Tab | null> {
  if (sphereWindowId !== null) {
    try {
      const win = await chrome.windows.get(sphereWindowId, { populate: true });
      const tab = win.tabs?.find((t: chrome.tabs.Tab) => t.url?.startsWith(SPHERE_URL));
      if (tab) return tab;
    } catch {
      persistWindowId(null);
    }
  }

  // Scan all windows to find sphere tab
  const allWindows = await chrome.windows.getAll({ populate: true });
  for (const win of allWindows) {
    const tab = win.tabs?.find((t: chrome.tabs.Tab) => t.url?.startsWith(SPHERE_URL));
    if (tab) {
      persistWindowId(win.id ?? null);
      return tab;
    }
  }
  return null;
}

export async function openOrFocusSphereWindow(): Promise<chrome.tabs.Tab> {
  const existing = await findSphereTab();
  if (existing?.id) {
    if (existing.windowId) {
      await chrome.windows.update(existing.windowId, { focused: true });
    }
    return existing;
  }

  if (pendingWindowCreate) {
    return pendingWindowCreate;
  }

  pendingWindowCreate = (async () => {
    const win = await chrome.windows.create({
      url: SPHERE_URL,
      type: 'popup',
      width: POPUP_WIDTH,
      height: POPUP_HEIGHT,
      focused: true,
    });

    persistWindowId(win?.id ?? null);
    return win!.tabs![0];
  })();

  try {
    return await pendingWindowCreate;
  } finally {
    pendingWindowCreate = null;
  }
}

export function onWindowRemoved(windowId: number) {
  if (windowId === sphereWindowId) {
    sphereWindowId = null;
  }
}
