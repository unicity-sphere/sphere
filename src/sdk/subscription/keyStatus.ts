/**
 * Subscription-key readiness for the send path.
 *
 * With subscriptions ON and no env-key fallback (#418), the SDK oracle carries
 * NO aggregator credential until the per-wallet key is provisioned — and
 * provisioning is an async, fire-and-forget step that runs AFTER the wallet
 * becomes interactive (see SphereProvider `reconcileSubscriptionKey`). A send
 * issued in that window would hit `certification_request` unauthenticated
 * (→ 401). This module lets the send path refuse until the oracle actually
 * holds the key, closing the window (see issue: keyless L3-send window).
 *
 * `ready` means the CURRENT oracle instance was built WITH the key — not merely
 * that a key exists in storage — so it also covers the brief re-init gap
 * between "key persisted" and "SDK re-initialized with it".
 */

export type SubscriptionKeyStatus =
  | 'not-required' // subscriptions disabled — the static env key is the oracle credential
  | 'provisioning' // subscriptions on, the per-wallet key is being fetched/recovered
  | 'ready' //        the live oracle holds the subscription key
  | 'failed'; //      provisioning failed on the initial load — no key to send with

/** A send is safe to attempt only when the oracle has a credential. */
export function isSubscriptionKeyReady(status: SubscriptionKeyStatus): boolean {
  return status === 'ready' || status === 'not-required';
}

/**
 * Thrown by the send path when subscriptions are on but the oracle has no key
 * yet. Distinct from `QuotaBlockedError` (which is an upgrade/quota signal) —
 * this is a transient "not set up yet" state, surfaced as a plain error so the
 * existing generic error UI shows the message without an Upgrade CTA.
 */
export class SubscriptionNotReadyError extends Error {
  readonly status: 'provisioning' | 'failed';

  constructor(status: 'provisioning' | 'failed') {
    super(
      status === 'failed'
        ? "Couldn't set up your subscription. Reload the app to retry."
        : 'Setting up your subscription — try again in a moment.',
    );
    this.name = 'SubscriptionNotReadyError';
    this.status = status;
  }
}
