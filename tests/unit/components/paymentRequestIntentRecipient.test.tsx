/**
 * The Connect `payment_request` intent bills the `to` the dApp named, in the
 * same spelling the `send` intent spends against (`sendIntentRecipient`). A bare
 * chain pubkey stays bare: an `@` in front of one made it a Unicity ID lookup
 * that failed, so a dApp could not bill a payer it knew only by pubkey.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const create = vi.fn();
vi.mock('../../../src/sdk', () => ({
  useSphereContext: () => ({ sphere: { payments: { requests: { create } } } }),
}));

import { PaymentRequestIntentModal } from '../../../src/components/connect/PaymentRequestIntentModal';

const COIN = 'c'.repeat(64);
const PAYER_PUBKEY = `02${'a'.repeat(64)}`;

function renderModal(to: string) {
  const onResolve = vi.fn();
  const onReject = vi.fn();
  render(
    <PaymentRequestIntentModal
      to={to}
      amount="100"
      coinId={COIN}
      onResolve={onResolve}
      onReject={onReject}
      onCancel={vi.fn()}
      isPending={() => true}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
  return { onResolve, onReject };
}

beforeEach(() => {
  create.mockReset().mockResolvedValue({ success: true, requestId: 'r1' });
});

describe('Connect payment_request recipient', () => {
  it.each([
    ['a bare chain pubkey', PAYER_PUBKEY, PAYER_PUBKEY],
    ['an @-prefixed Unicity ID', '@alice', 'alice'],
    ['a bare Unicity ID', 'alice', 'alice'],
  ])('bills %s as the send intent would spend against it', async (_label, to, billed) => {
    const { onResolve, onReject } = renderModal(to);
    await waitFor(() => expect(onResolve).toHaveBeenCalledWith('r1'));
    expect(create).toHaveBeenCalledWith(billed, { amount: '100', coinId: COIN });
    expect(onReject).not.toHaveBeenCalled();
  });
});
