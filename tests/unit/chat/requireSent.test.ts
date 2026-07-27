/**
 * #454: chat SDK methods (sendMessage, deleteMessage, ...) resolve to null on
 * failure instead of throwing, so a mutation wrapping them as `return !!result`
 * RESOLVES with false — onSuccess (which clears the input) runs and the typed
 * message is silently discarded. requireSent turns the silent null into a
 * rejection so onError fires and onSuccess is skipped.
 */
import { describe, it, expect } from 'vitest';
import { requireSent } from '../../../src/components/chat/utils/requireSent';

describe('requireSent (silent-null guard for chat SDK results)', () => {
  it('throws when the SDK returned null', () => {
    expect(() => requireSent(null)).toThrow(/failed to send message/i);
  });

  it('throws when the SDK returned undefined', () => {
    expect(() => requireSent(undefined)).toThrow();
  });

  it('uses the action label in the error message', () => {
    expect(() => requireSent(null, 'delete message')).toThrow(/failed to delete message/i);
  });

  it('returns the value unchanged when the send succeeded', () => {
    const message = { id: 'm1' };
    expect(requireSent(message)).toBe(message);
  });

  it('treats falsy-but-valid values (empty string, 0) as success, not failure', () => {
    expect(requireSent('')).toBe('');
    expect(requireSent(0)).toBe(0);
  });
});
