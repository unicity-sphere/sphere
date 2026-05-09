/**
 * Push-relay client integration.
 *
 * Two responsibilities:
 *   1. Subscribe this device to Web Push (via the service worker) and
 *      register the resulting subscription with the relay over Sphere DM.
 *   2. Fire-and-forget a `wake` DM to the relay whenever this device
 *      initiates an outgoing call, so the callee gets a system push even
 *      if their Sphere tab is closed.
 *
 * Configuration (set at build time via Vite env):
 *   - VITE_PUSH_RELAY_NAMETAG          e.g. 'sphere-push-relay'
 *   - VITE_PUSH_RELAY_VAPID_PUBLIC_KEY base64url of the relay's VAPID pubkey
 *
 * Both must be present, otherwise this module no-ops cleanly. That lets the
 * PWA build remain functional in dev/test where no relay is deployed yet.
 */

import { registerTelcoServiceWorker } from './serviceWorkerManager';

interface PushRelayConfig {
  nametag: string;
  vapidPublicKey: string;
}

interface SendDMFn {
  (recipientAddress: string, content: string): Promise<unknown>;
}

const REGISTRATION_LS_KEY = 'sphere_push_registered_endpoint';
const REGISTRATION_TS_LS_KEY = 'sphere_push_registered_at';
/** Re-register at most once per 7 days. The registration is durable on the
 *  relay side; refreshing too eagerly burns battery and DM bandwidth. */
const REREGISTER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/** Read both env vars; return null if either is missing. */
export function getPushRelayConfig(): PushRelayConfig | null {
  const nametag = import.meta.env['VITE_PUSH_RELAY_NAMETAG'] as string | undefined;
  const vapidPublicKey = import.meta.env['VITE_PUSH_RELAY_VAPID_PUBLIC_KEY'] as string | undefined;
  if (!nametag || !vapidPublicKey) return null;
  return { nametag, vapidPublicKey };
}

/**
 * Convert base64url (URL-safe, no padding) to a Uint8Array — the format
 * pushManager.subscribe wants for applicationServerKey.
 */
function urlBase64ToUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  // Construct from an explicit ArrayBuffer (not ArrayBufferLike) so the type
  // satisfies BufferSource for pushManager.subscribe — which forbids
  // SharedArrayBuffer-backed views.
  const buf = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Ensure this device is subscribed to push and registered with the relay.
 * Idempotent — safe to call on every app start. Returns silently if push
 * isn't supported, permission isn't granted, or the relay isn't configured.
 *
 * `sendDM` is injected so this module doesn't take a hard dependency on the
 * Sphere SDK shape; CallProvider supplies it via sphere.communications.sendDM.
 */
export async function ensurePushRegistration(sendDM: SendDMFn): Promise<void> {
  const config = getPushRelayConfig();
  if (!config) return;
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const reg = await registerTelcoServiceWorker();
  if (!reg) return;

  let sub: PushSubscription | null = null;
  try {
    sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey),
      });
    }
  } catch (err) {
    console.warn('[telco] Push subscribe failed:', err);
    return;
  }

  // Skip the registration-DM if we already registered this exact endpoint
  // recently. This avoids a register DM on every app open.
  const lastEndpoint = localStorage.getItem(REGISTRATION_LS_KEY);
  const lastAtRaw = localStorage.getItem(REGISTRATION_TS_LS_KEY);
  const lastAt = lastAtRaw ? parseInt(lastAtRaw, 10) : 0;
  const fresh = lastEndpoint === sub.endpoint && Date.now() - lastAt < REREGISTER_INTERVAL_MS;
  if (fresh) return;

  const subscriptionJSON = sub.toJSON();
  const message = JSON.stringify({
    kind: 'register',
    subscription: {
      endpoint: subscriptionJSON.endpoint,
      keys: subscriptionJSON.keys ?? {},
    },
  });

  try {
    await sendDM(`@${config.nametag.replace(/^@/, '')}`, message);
    localStorage.setItem(REGISTRATION_LS_KEY, sub.endpoint);
    localStorage.setItem(REGISTRATION_TS_LS_KEY, String(Date.now()));
    console.log('[telco] Push subscription registered with relay');
  } catch (err) {
    console.warn('[telco] Push relay register DM failed:', err);
  }
}

/**
 * Tell the relay to wake the callee with a Web Push. Fire-and-forget;
 * failures are logged but don't break the call flow (the offer DM has
 * already been sent and will reach the callee whenever Sphere wakes up).
 */
export function sendWakeRequest(
  sendDM: SendDMFn,
  target: { peerPubkey: string; peerNametag: string | undefined },
  call: { callId: string; mediaType: 'audio' | 'video' },
  myNametag: string | undefined,
): void {
  const config = getPushRelayConfig();
  if (!config) return;

  const payload: Record<string, unknown> = {
    kind: 'wake',
    target_pubkey: target.peerPubkey,
    reason: 'incoming-call',
    call_id: call.callId,
    media_type: call.mediaType,
  };
  if (myNametag) payload['caller_nametag'] = myNametag;

  // Fire-and-forget. We don't await — the call flow shouldn't stall on
  // a slow relay or relay outage.
  sendDM(`@${config.nametag.replace(/^@/, '')}`, JSON.stringify(payload)).catch((err) => {
    console.warn('[telco] Push relay wake DM failed:', err);
  });
}

/**
 * Optional cleanup if the user explicitly disables notifications. Sends an
 * `unregister` DM and clears the local cache so we re-register if they
 * re-enable later.
 */
export async function unregisterPush(sendDM: SendDMFn): Promise<void> {
  const config = getPushRelayConfig();
  if (!config) return;
  try {
    await sendDM(`@${config.nametag.replace(/^@/, '')}`, JSON.stringify({ kind: 'unregister' }));
  } catch (err) {
    console.warn('[telco] Push relay unregister DM failed:', err);
  }
  localStorage.removeItem(REGISTRATION_LS_KEY);
  localStorage.removeItem(REGISTRATION_TS_LS_KEY);
}
