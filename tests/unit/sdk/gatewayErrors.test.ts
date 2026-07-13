import { describe, it, expect } from 'vitest';
import { SphereError } from '@unicitylabs/sphere-sdk';
// The REAL transport error the classifier duck-types. Never re-exported from
// sphere-sdk, so the canary below deep-imports it from state-transition-sdk
// (a transitive dep). If a bump moves/renames it, this import fails loudly —
// which is exactly the drift signal the canary exists to raise.
import { JsonRpcNetworkError } from '@unicitylabs/state-transition-sdk/lib/api/json-rpc/JsonRpcNetworkError.js';
import { getGatewayHttpStatus, isQuotaRateLimit, isGatewayAuthError } from '@/sdk/errors';

// Fabricate the duck-typed transport error shape that JsonRpcNetworkError
// satisfies today (used for the behavioural cases; the CONTRACT CANARY below
// pins the REAL class so a shape drift can't slip past these fakes).
function jsonRpcNetworkError(status: number, name = 'JsonRpcNetworkError') {
  return { name, status, message: 'transport error' };
}

describe('getGatewayHttpStatus', () => {
  it('reads status off a CERTIFICATION_UNCONFIRMED cause duck-typing JsonRpcNetworkError (429)', () => {
    const err = new SphereError(
      'certification unconfirmed',
      'CERTIFICATION_UNCONFIRMED',
      jsonRpcNetworkError(429)
    );
    expect(getGatewayHttpStatus(err)).toBe(429);
  });

  it('reads status off a CERTIFICATION_UNCONFIRMED cause duck-typing JsonRpcNetworkError (401)', () => {
    const err = new SphereError(
      'certification unconfirmed',
      'CERTIFICATION_UNCONFIRMED',
      jsonRpcNetworkError(401)
    );
    expect(getGatewayHttpStatus(err)).toBe(401);
  });

  it('reads status off a CERTIFICATION_UNCONFIRMED cause duck-typing JsonRpcNetworkError (403)', () => {
    const err = new SphereError(
      'certification unconfirmed',
      'CERTIFICATION_UNCONFIRMED',
      jsonRpcNetworkError(403)
    );
    expect(getGatewayHttpStatus(err)).toBe(403);
  });

  it('returns null when the cause has the wrong name', () => {
    const err = new SphereError(
      'certification unconfirmed',
      'CERTIFICATION_UNCONFIRMED',
      { name: 'SleepError', status: 429 }
    );
    expect(getGatewayHttpStatus(err)).toBeNull();
  });

  it('returns null when cause is missing entirely', () => {
    const err = new SphereError('certification unconfirmed', 'CERTIFICATION_UNCONFIRMED');
    expect(getGatewayHttpStatus(err)).toBeNull();
  });

  it('returns null for a SphereError with a different code, even with a valid-shaped cause', () => {
    const err = new SphereError('transfer failed', 'TRANSFER_FAILED', jsonRpcNetworkError(429));
    expect(getGatewayHttpStatus(err)).toBeNull();
  });

  it('reads status off a raw error duck-typing JsonRpcNetworkError (pre-first-submit throw)', () => {
    const raw = jsonRpcNetworkError(429);
    expect(getGatewayHttpStatus(raw)).toBe(429);
  });

  it('returns null for a plain Error', () => {
    expect(getGatewayHttpStatus(new Error('boom'))).toBeNull();
  });

  it('returns null for a string', () => {
    expect(getGatewayHttpStatus('nope')).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(getGatewayHttpStatus(null)).toBeNull();
    expect(getGatewayHttpStatus(undefined)).toBeNull();
  });

  // Contract canary — see spec §5 "Duck-typed cause detection depends on
  // JsonRpcNetworkError's name/status fields (state-transition-sdk pinned
  // 2.0.0-rc.68bc1e5) ... A state-transition-sdk bump could silently break
  // detection; add a unit test that fails loudly if the shape changes."
  // This test pins the exact duck-shape our classifier trusts. If a
  // state-transition-sdk upgrade renames `name`/`status` on its transport
  // error, this is the test that should go red first, before it's discovered
  // in production as a gate that silently stops firing.
  it('CONTRACT CANARY: the REAL state-transition-sdk JsonRpcNetworkError still classifies', () => {
    // Construct the actual SDK error, not our fabricated duck — this is what
    // makes it a canary. If a bump renames `name`/`status` (or the class),
    // these assertions (or the import) go red before it silently stops the
    // gate from firing in production.
    const real = new JsonRpcNetworkError(429, 'transport error');
    expect(real.name).toBe('JsonRpcNetworkError');
    expect(typeof (real as { status?: unknown }).status).toBe('number');
    expect(getGatewayHttpStatus(real)).toBe(429);
    expect(
      isQuotaRateLimit(new SphereError('certification unconfirmed', 'CERTIFICATION_UNCONFIRMED', real)),
    ).toBe(true);
  });
});

describe('isQuotaRateLimit', () => {
  it('is true for a 429 cause', () => {
    const err = new SphereError(
      'certification unconfirmed',
      'CERTIFICATION_UNCONFIRMED',
      jsonRpcNetworkError(429)
    );
    expect(isQuotaRateLimit(err)).toBe(true);
  });

  it('is false for a 401 cause', () => {
    const err = new SphereError(
      'certification unconfirmed',
      'CERTIFICATION_UNCONFIRMED',
      jsonRpcNetworkError(401)
    );
    expect(isQuotaRateLimit(err)).toBe(false);
  });

  it('is false when there is no gateway status', () => {
    expect(isQuotaRateLimit(new Error('boom'))).toBe(false);
  });
});

describe('isGatewayAuthError', () => {
  it('is true for a 401 cause', () => {
    const err = new SphereError(
      'certification unconfirmed',
      'CERTIFICATION_UNCONFIRMED',
      jsonRpcNetworkError(401)
    );
    expect(isGatewayAuthError(err)).toBe(true);
  });

  it('is true for a 403 cause', () => {
    const err = new SphereError(
      'certification unconfirmed',
      'CERTIFICATION_UNCONFIRMED',
      jsonRpcNetworkError(403)
    );
    expect(isGatewayAuthError(err)).toBe(true);
  });

  it('is false for a 429 cause', () => {
    const err = new SphereError(
      'certification unconfirmed',
      'CERTIFICATION_UNCONFIRMED',
      jsonRpcNetworkError(429)
    );
    expect(isGatewayAuthError(err)).toBe(false);
  });

  it('is false when there is no gateway status', () => {
    expect(isGatewayAuthError('nope')).toBe(false);
  });
});
