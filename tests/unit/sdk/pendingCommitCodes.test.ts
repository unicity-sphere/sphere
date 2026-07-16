import { describe, it, expect } from 'vitest';
import { SphereError } from '@unicitylabs/sphere-sdk';
import { PENDING_COMMIT_CODES, isPendingCommitCode } from '@/sdk/errors';

// The ONE source of truth for the possibly-committed keep-open send codes shared
// by useTransfer and useIncomingPaymentRequests.pay (#440/#441). This test pins
// the exact set: dropping a code here silently re-opens the double-pay path.

describe('PENDING_COMMIT_CODES', () => {
  it('is exactly the possibly-committed keep-open set (SDK PaymentsModule send-failure catch)', () => {
    // Sorted compare so the assertion is order-independent but membership-exact.
    expect([...PENDING_COMMIT_CODES].sort()).toEqual(
      [
        'CERTIFICATION_UNCONFIRMED',
        'CHECKPOINT_PERSIST_FAILED',
        'CHECKPOINT_TRUSTBASE_MISMATCH',
        'SEND_PARTIALLY_COMPLETED',
        'SEND_SYNC_PENDING',
        'SPLIT_CHECKPOINT_LOST',
      ].sort(),
    );
  });
});

describe('isPendingCommitCode', () => {
  it.each(PENDING_COMMIT_CODES)(
    'classifies a SphereError(%s) as pending-commit (present as pending, never re-send)',
    (code) => {
      expect(isPendingCommitCode(new SphereError('keep-open', code))).toBe(true);
    },
  );

  it('does NOT classify a genuine failure code (still a re-sendable failure)', () => {
    expect(isPendingCommitCode(new SphereError('not enough balance', 'INSUFFICIENT_BALANCE'))).toBe(false);
    expect(isPendingCommitCode(new SphereError('conflict', 'TRANSFER_CONFLICT'))).toBe(false);
    expect(isPendingCommitCode(new SphereError('bad input', 'VALIDATION_ERROR'))).toBe(false);
  });

  it('does NOT classify non-SphereError throwables (plain Error, string, null)', () => {
    expect(isPendingCommitCode(new Error('CERTIFICATION_UNCONFIRMED'))).toBe(false);
    expect(isPendingCommitCode('CERTIFICATION_UNCONFIRMED')).toBe(false);
    expect(isPendingCommitCode(null)).toBe(false);
    expect(isPendingCommitCode(undefined)).toBe(false);
  });
});
