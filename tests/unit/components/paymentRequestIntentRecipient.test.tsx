/**
 * The Connect `payment_request` intent bills `to` as a Unicity ID, always
 * behind an `@`: without it a tag that looks like hex would be read as a pubkey.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const create = vi.fn();
vi.mock('../../../src/sdk', () => ({
  useSphereContext: () => ({ sphere: { payments: { requests: { create } } } }),
}));

import { PaymentRequestIntentModal } from '../../../src/components/connect/PaymentRequestIntentModal';

const COIN = 'c'.repeat(64);
const HEX_LOOKING = `02${'a'.repeat(64)}`;

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
    ['an @-prefixed Unicity ID', '@alice', '@alice'],
    ['a bare Unicity ID', 'alice', '@alice'],
    ['a bare hex-looking string', HEX_LOOKING, `@${HEX_LOOKING}`],
  ])('bills %s as a Unicity ID', async (_label, to, billed) => {
    const { onResolve, onReject } = renderModal(to);
    await waitFor(() => expect(onResolve).toHaveBeenCalledWith('r1'));
    expect(create).toHaveBeenCalledWith(billed, { amount: '100', coinId: COIN });
    expect(onReject).not.toHaveBeenCalled();
  });
});
