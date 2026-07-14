/**
 * Maps a settled checkout poll onto the single UI action it warrants. Kept
 * pure (UpgradeModal only executes the action) so the branching — the part the
 * gateway contract change actually altered — is unit-testable without
 * mounting the modal.
 */
import type { OrderPollResult } from './pollOrder';

export type CheckoutOutcomeAction =
  | { kind: 'upgraded'; maskedKey?: string; planName?: string }
  | { kind: 'adopt'; apiKey: string }
  | { kind: 'claim' }
  | { kind: 'failed' }
  | { kind: 'timeout' }
  | { kind: 'cancelled' };

export function resolveCheckoutOutcome(result: OrderPollResult): CheckoutOutcomeAction {
  if (result.outcome !== 'paid') return { kind: result.outcome };
  // Upgrade orders never deliver a key — the buyer already holds it; the plan
  // change is entirely server-side.
  if (result.upgrade) return { kind: 'upgraded', maskedKey: result.maskedKey, planName: result.planName };
  if (result.apiKey) return { kind: 'adopt', apiKey: result.apiKey };
  // Paid but keyless non-upgrade order: a pre-ack gateway whose one-time
  // reveal was consumed by the payment return page — fall back to pasting it.
  return { kind: 'claim' };
}
