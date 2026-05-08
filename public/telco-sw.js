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

self.addEventListener('notificationclose', (event) => {
  // User dismissed the notification without choosing an action — treat as
  // 'decline' for now so the call doesn't keep ringing on the caller's side.
  const payload = event.notification.data || {};
  if (event.notification.tag !== 'sphere-incoming-call') return;
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    for (const client of allClients) {
      try {
        client.postMessage({
          type: 'telco-action',
          action: 'dismiss',
          callId: payload.callId,
          peerPubkey: payload.peerPubkey,
        });
      } catch { /* ignore */ }
    }
  })());
});
