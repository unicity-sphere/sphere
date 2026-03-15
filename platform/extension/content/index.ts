/// <reference types="chrome" />

/**
 * Content script - message relay between inject script and background.
 *
 * This script runs in the context of web pages and:
 * - Injects the inject.js script into the page
 * - Relays messages between page (window.sphere) and background service worker
 */

import { isSphereRequest, isSphereResponse } from '../shared/messages';

console.log('Sphere content script loaded');

// Inject the inject.js script into the page
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
}

injectScript();

// ===========================================================================
// Connect protocol relay
// ===========================================================================

// Cache own tab ID (fetched from background on first use)
let ownTabId: number | undefined;

async function getOwnTabId(): Promise<number | undefined> {
  if (ownTabId !== undefined) return ownTabId;
  try {
    const response = await chrome.runtime.sendMessage({ type: 'sphere-get-tab-id' });
    ownTabId = response?.tabId;
    return ownTabId;
  } catch {
    return undefined;
  }
}

// Forward sphere-connect-ext:tohost and sphere-open-wallet messages from dApp page → background
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type !== 'sphere-connect-ext:tohost' && data.type !== 'sphere-open-wallet') return;

  // Inject sender tab ID so the sphere extension page knows where to send responses
  const tabId = await getOwnTabId();

  // Fire-and-forget: both background and sphere tab receive this broadcast
  chrome.runtime.sendMessage({ ...data, _senderTabId: tabId }).catch(() => {
    // Background may not be ready yet — ignore
  });
});

// Forward sphere-connect-ext:toclient messages from background → dApp page
chrome.runtime.onMessage.addListener((message) => {
  if (!message || typeof message !== 'object') return;
  if (message.type !== 'sphere-connect-ext:toclient') return;
  window.postMessage(message, '*');
});

// ===========================================================================
// Legacy SPHERE_* relay
// ===========================================================================

// Listen for messages from the page (inject script)
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;

  const { type, requestId, ...data } = event.data || {};
  if (!type || !isSphereRequest(type)) return;

  console.log('Content script received request:', type, requestId);

  try {
    const response = await chrome.runtime.sendMessage({
      type,
      requestId,
      origin: window.location.origin,
      ...data,
    });

    console.log('Content script received response:', response);

    // Don't forward "pending" responses
    if (response.pending) return;

    window.postMessage({ ...response, requestId }, '*');
  } catch (error) {
    console.error('Content script error:', error);
    window.postMessage(
      {
        type: `${type}_RESPONSE`,
        requestId,
        success: false,
        error: (error as Error).message || 'Unknown error',
      },
      '*',
    );
  }
});

// Listen for messages from background (transaction results)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type && isSphereResponse(message.type)) {
    window.postMessage(message, '*');
  }
  sendResponse({ received: true });
  return true;
});

export {};
