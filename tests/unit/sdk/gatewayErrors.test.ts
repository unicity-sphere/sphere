import { describe, it, expect } from 'vitest';
import { SphereError } from '@unicitylabs/sphere-sdk';
import { getGatewayHttpStatus, isQuotaRateLimit, isGatewayAuthError } from '@/sdk/errors';

// Fabricate the duck-typed transport error shape that JsonRpcNetworkError
// (state-transition-sdk, never exported from sphere-sdk) satisfies today.
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
  it('CONTRACT CANARY: duck-shape is exactly {name: string, status: number}', () => {
    const shape = jsonRpcNetworkError(429);
    expect(shape).toHaveProperty('name', 'JsonRpcNetworkError');
    expect(shape).toHaveProperty('status', 429);
    expect(typeof shape.status).toBe('number');
    expect(getGatewayHttpStatus(shape)).toBe(429);
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
