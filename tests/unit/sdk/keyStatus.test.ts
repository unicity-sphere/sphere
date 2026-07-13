import { describe, it, expect } from 'vitest';
import {
  isSubscriptionKeyReady,
  SubscriptionNotReadyError,
  type SubscriptionKeyStatus,
} from '@/sdk/subscription/keyStatus';

describe('isSubscriptionKeyReady', () => {
  it('is true only when the oracle has a credential', () => {
    expect(isSubscriptionKeyReady('ready')).toBe(true);
    expect(isSubscriptionKeyReady('not-required')).toBe(true);
  });

  it('is false while there is no key on the oracle (the keyless-send window)', () => {
    expect(isSubscriptionKeyReady('provisioning')).toBe(false);
    expect(isSubscriptionKeyReady('failed')).toBe(false);
  });

  it('covers every status in the union (exhaustive)', () => {
    const all: SubscriptionKeyStatus[] = ['not-required', 'provisioning', 'ready', 'failed'];
    // ready + not-required allowed → exactly 2 of 4 are "ready"
    expect(all.filter(isSubscriptionKeyReady)).toEqual(['not-required', 'ready']);
  });
});

describe('SubscriptionNotReadyError', () => {
  it('carries a transient "provisioning" message', () => {
    const err = new SubscriptionNotReadyError('provisioning');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('SubscriptionNotReadyError');
    expect(err.status).toBe('provisioning');
    expect(err.message).toMatch(/setting up/i);
  });

  it('carries a reload hint when provisioning failed', () => {
    const err = new SubscriptionNotReadyError('failed');
    expect(err.status).toBe('failed');
    expect(err.message).toMatch(/reload/i);
  });
});
