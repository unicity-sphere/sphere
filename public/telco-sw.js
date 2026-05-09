// Sphere Telco Service Worker
//
// Handles incoming-call system notifications with action buttons (Accept /
// Decline) — the page can't add action buttons to a regular Notification, so
// the SW does it via registration.showNotification().
//
// Flow:
//   1. CallProvider posts {type: 'show-incoming-call', ...} to the SW.
//   2. SW shows a notification with Accept/Decline buttons.
//   3. User taps an action button (or the body / Accept).
//   4. SW notificationclick handler broadcasts {type: 'telco-action', ...} to
//      all clients. Each Sphere tab/window receives it; only the one whose
//      currentCall.callId matches will actually act on it.
//   5. SW also focuses an existing window for accept/click; opens '/' if none.

self.addEventListener('install', () => {
  // Activate the new SW immediately, replacing any older one.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of any clients that were already loaded under the old SW
  // (or no SW at all) so we can post messages to them on first call.
  event.waitUntil(self.clients.claim());
});

// Chrome's "Add to Home Screen" / installability check requires a fetch
// handler in the SW. We don't need any caching strategy — just a no-op
// passthrough so the install prompt becomes available.
self.addEventListener('fetch', () => { /* network passthrough */ });

// ── Web Push wake-up ────────────────────────────────────────────────────────
// The push-relay tenant POSTs an encrypted payload here when an incoming call
// arrives for this user. We decrypt and either:
//   - if a Sphere tab is already visible: postMessage the page so it can show
//     the call UI directly (avoids duplicate notifications),
//   - otherwise: show the system Accept/Decline notification, which on tap
//     will open / focus a Sphere window.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  if (payload.type !== 'sphere-wake') return;

  // Best-effort dedup: drop pushes older than 60s. Web Push has TTL but FCM
  // can deliver late if the device was offline; an old "incoming call" push
  // for a long-finished call would be confusing.
  if (typeof payload.ts === 'number' && Date.now() - payload.ts > 60_000) return;

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    const visible = allClients.find((c) => c.visibilityState === 'visible');
    if (visible) {
      // App is open and on screen — let the page handle this (it'll see the
      // actual call-signal DM via Nostr in a moment anyway).
      try {
        visible.postMessage({
          type: 'telco-wake',
          reason: payload.reason,
          caller_pubkey: payload.caller_pubkey,
          caller_nametag: payload.caller_nametag,
          call_id: payload.call_id,
          media_type: payload.media_type,
        });
      } catch { /* ignore */ }
      return;
    }

    // App is closed or backgrounded — show the system notification.
    const isVideo = payload.media_type === 'video';
    const callerName = payload.caller_nametag
      ? `@${String(payload.caller_nametag).replace(/^@/, '')}`
      : (payload.caller_pubkey ? String(payload.caller_pubkey).slice(0, 8) + '…' : 'Someone');
    await self.registration.showNotification(
      `Incoming ${isVideo ? 'video' : 'voice'} call`,
      {
        body: `From ${callerName}`,
        icon: '/icons/sphere-192.png',
        badge: '/icons/sphere-192.png',
        tag: 'sphere-incoming-call',
        requireInteraction: true,
        silent: false,
        data: { callId: payload.call_id, peerPubkey: payload.caller_pubkey },
        actions: [
          { action: 'accept', title: 'Accept' },
          { action: 'decline', title: 'Decline' },
        ],
      },
    );
  })());
});

// ── Push subscription rotation ──────────────────────────────────────────────
// Browsers occasionally invalidate a push subscription (key rotation, vendor
// purges, etc.) and fire pushsubscriptionchange on the SW. We can't directly
// re-register from here without VAPID public key + a way to talk to the relay,
// so we just notify all clients — the foreground page will re-subscribe.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    for (const client of allClients) {
      try {
        client.postMessage({ type: 'telco-push-subscription-changed' });
      } catch { /* ignore */ }
    }
  })());
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'show-incoming-call') {
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/UnicityLogo.svg',
        badge: data.icon || '/UnicityLogo.svg',
        tag: 'sphere-incoming-call',
        requireInteraction: true,
        silent: false,
        data: { callId: data.callId, peerPubkey: data.peerPubkey },
        actions: [
          { action: 'accept', title: 'Accept' },
          { action: 'decline', title: 'Decline' },
        ],
      })
    );
  } else if (data.type === 'hide-incoming-call') {
    event.waitUntil(
      self.registration.getNotifications({ tag: 'sphere-incoming-call' })
        .then((notifs) => notifs.forEach((n) => n.close()))
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  const action = event.action || 'click'; // 'accept' | 'decline' | '' (body click)
  const payload = event.notification.data || {};
  event.notification.close();

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    // Broadcast the action to every Sphere client. Only the one that owns
    // the call (matching callId) will act on it.
    for (const client of allClients) {
      try {
        client.postMessage({
          type: 'telco-action',
          action,
          callId: payload.callId,
          peerPubkey: payload.peerPubkey,
        });
      } catch {
        // ignore unreachable clients
      }
    }

    // For accept or body-click, bring a Sphere window into focus so the user
    // lands on the active-call UI. Decline can be handled silently.
    if (action === 'accept' || action === 'click') {
      // Prefer an already-focused client; otherwise focus the first; else open.
      const focused = allClients.find((c) => c.focused);
      if (focused) {
        await focused.focus();
      } else if (allClients.length > 0) {
        try { await allClients[0].focus(); } catch { /* ignore */ }
      } else {
        // No open Sphere window — open the home page. The CallProvider in
        // the new tab will see the incoming offer DM and pick it up.
        await self.clients.openWindow('/');
      }
    }
  })());
});

// NOTE: we intentionally do NOT translate notificationclose into a
// decline. On Android, tapping an action button (Accept or Decline)
// causes the OS to auto-dismiss the notification, which then fires
// notificationclose right after notificationclick. Treating that as a
// dismiss-decline would cancel a call the user just accepted. If the
// user really wants to reject without answering, they tap the Decline
// action; otherwise the call rings out via the caller's CALL_TIMEOUT.
