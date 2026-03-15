/// <reference types="chrome" />

/**
 * Background service worker for Sphere popup-window extension.
 *
 * SDK runs in this service worker (not in the popup window).
 *
 * Responsibilities:
 * 1. Opening/focusing the Sphere popup window on icon click
 * 2. Routing POPUP_* messages from popup to WalletManager/ConnectHost
 * 3. Routing SPHERE_* messages from content scripts to WalletManager
 * 4. ConnectHost handles Connect protocol messages directly via ExtensionTransport
 */

import { isSphereRequest } from '../shared/messages';
import { handlePopupMessage, handleContentMessage } from './message-handler';
import { walletManager } from './wallet-manager';
import {
  openOrFocusSphereWindow,
  onWindowRemoved,
  restoreWindowId,
} from './popup-manager';

// Restore popup window ID on startup
restoreWindowId();

chrome.windows.onRemoved.addListener(onWindowRemoved);

chrome.action.onClicked.addListener(() => {
  openOrFocusSphereWindow();
});

// ============ Message Routing ============

chrome.runtime.onMessage.addListener(
  (message: Record<string, unknown>, sender: chrome.runtime.MessageSender, sendResponse: (r?: unknown) => void) => {
    const { type } = message || {};
    if (!type) return false;

    // Content script asks for its own tab ID
    if (type === 'sphere-get-tab-id') {
      sendResponse({ tabId: sender.tab?.id });
      return false;
    }

    // Explicit request from dApp to open the wallet window
    if (type === 'sphere-open-wallet') {
      openOrFocusSphereWindow().then(() => sendResponse({ success: true })).catch((error: Error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }

    // POPUP_* and SPHERE_PROXY_CALL messages from popup window → message-handler
    if (typeof type === 'string' && (type.startsWith('POPUP_') || type === 'SPHERE_PROXY_CALL')) {
      handlePopupMessage(message).then(sendResponse).catch((error: Error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }

    // Legacy SPHERE_* API: content script → message-handler (direct handling, no relay)
    if (isSphereRequest(type as string)) {
      handleContentMessage(message).then(sendResponse).catch((error: Error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }

    // SDK_EVENT broadcasts from wallet-manager — let them pass through to popup
    if (type === 'SDK_EVENT') {
      return false;
    }

    return false;
  },
);

// ============ Background Sync via chrome.alarms ============
// Wake the service worker periodically to receive incoming tokens/DMs.
// SDK reconnects to Nostr/Electrum on wake, processes new events,
// then the worker goes back to sleep.

const SYNC_ALARM_NAME = 'sphere-background-sync';

chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== SYNC_ALARM_NAME) return;

  // Only sync if wallet is unlocked (SDK is initialized)
  try {
    if (!walletManager.isUnlocked()) return;

    // Finalize pending tokens (triggers SDK reconnect + sync)
    await walletManager.finalizeTokens();
  } catch (e) {
    console.warn('[Background] Sync alarm error:', e);
  }
});

console.log('Sphere background service worker loaded');
