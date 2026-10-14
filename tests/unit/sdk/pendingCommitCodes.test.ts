import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { PartialSendConflictError, SphereError } from '@unicitylabs/sphere-sdk';
import { PENDING_COMMIT_CODES, SDK_CANCEL_UNCONFIRMED_MESSAGE, isPendingCommitCode, keepOpenKindOf } from '@/sdk/errors';

// The ONE source of truth for the possibly-committed keep-open send codes shared
// by useTransfer and useIncomingPaymentRequests.pay (#440/#441). This test pins
// the exact set: dropping a code here silently re-opens the double-pay path.

describe('PENDING_COMMIT_CODES', () => {
  it('is exactly the possibly-committed, non-re-sendable set (keep-open certification codes + the partial-send outcome)', () => {
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

// sphere-sdk 0.19.0 (#835): only a 'converging' keep-open send finishes on its own.
describe('keepOpenKindOf', () => {
  const cancelling = (): SphereError => new SphereError(SDK_CANCEL_UNCONFIRMED_MESSAGE, 'SEND_SYNC_PENDING');

  it('reads a send being cancelled by the SDK message it carries', () => {
    expect(keepOpenKindOf(cancelling())).toBe('cancelling');
  });

  it('reads every other keep-open code as converging (held sends included)', () => {
    expect(keepOpenKindOf(new SphereError('held: the intent was not confirmed', 'SEND_SYNC_PENDING'))).toBe('converging');
    expect(keepOpenKindOf(new SphereError('proof pending', 'CERTIFICATION_UNCONFIRMED'))).toBe('converging');
  });

  it('reads a partial send with a remainder still owed as owed', () => {
    expect(keepOpenKindOf(new PartialSendConflictError('part sent', 'tid-1', ['tok'], '400'))).toBe('owed');
  });

  it("reads a partial send whose remainder '0' rides a later attempt by that attempt's own kind", () => {
    const converging = new SphereError('held', 'SEND_SYNC_PENDING');
    expect(keepOpenKindOf(new PartialSendConflictError('part sent', 'tid-1', ['tok'], '0', converging))).toBe('converging');
    expect(keepOpenKindOf(new PartialSendConflictError('part sent', 'tid-1', ['tok'], '0', cancelling()))).toBe('cancelling');
  });

  it('matches the message the installed SDK actually throws (an SDK bump that rewords it fails here)', () => {
    const require = createRequire(import.meta.url);
    const dist = dirname(require.resolve('@unicitylabs/sphere-sdk'));
    const bundles = readdirSync(dist).filter((name) => /\.(c?js|mjs)$/.test(name));
    expect(bundles.some((name) => readFileSync(join(dist, name), 'utf8').includes(SDK_CANCEL_UNCONFIRMED_MESSAGE))).toBe(true);
  });
});
