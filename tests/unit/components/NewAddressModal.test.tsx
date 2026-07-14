import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewAddressModal } from '../../../src/components/wallet/shared/modals/NewAddressModal';
import type {
  NewAddressState,
  UseNewAddressFlowReturn,
} from '../../../src/components/wallet/shared/hooks/useNewAddressFlow';

const NEW_PUBKEY = '02' + 'cd'.repeat(32);

let flow: UseNewAddressFlowReturn;

// Keep the real cleanNametagInput/NAMETAG_FORMAT_HINT exports; fake only the hook.
vi.mock(
  '../../../src/components/wallet/shared/hooks/useNewAddressFlow',
  async importOriginal => {
    const actual = await importOriginal<Record<string, unknown>>();
    return { ...actual, useNewAddressFlow: () => flow };
  },
);

function makeState(overrides: Partial<NewAddressState> = {}): NewAddressState {
  return {
    step: 'nametag_input',
    error: null,
    registerError: null,
    newAddress: { chainPubkey: NEW_PUBKEY, index: 4 },
    completedNametag: null,
    outcome: null,
    slow: false,
    ...overrides,
  };
}

beforeEach(() => {
  flow = {
    state: makeState(),
    start: vi.fn(async () => {}),
    register: vi.fn(async () => {}),
    skip: vi.fn(),
    checkAvailability: vi.fn(async () => 'available' as const),
    clearRegisterError: vi.fn(),
    reset: vi.fn(),
  };
});

function renderModal() {
  return render(<NewAddressModal isOpen onClose={vi.fn()} />);
}

describe('NewAddressModal — nametag prompt', () => {
  it('shows the new address pubkey-first and starts the flow on open', () => {
    renderModal();
    expect(flow.start).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Address #4')).toBeDefined();
    // MetaMask-style 6+4 truncation of the chain pubkey
    expect(
      screen.getByText(`${NEW_PUBKEY.slice(0, 6)}...${NEW_PUBKEY.slice(-4)}`),
    ).toBeDefined();
  });

  it('disables Register and shows the SDK format hint for an invalid ID', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('id'), { target: { value: 'ab' } });

    expect(screen.getByText(/use a-z, 0-9/i)).toBeDefined();
    const register = screen.getByRole('button', { name: 'Register' }) as HTMLButtonElement;
    expect(register.disabled).toBe(true);
  });

  it('treats an unverifiable availability as "cannot verify", not as free', async () => {
    flow.checkAvailability = vi.fn(async () => 'unknown' as const);
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('id'), {
      target: { value: 'validname' },
    });

    await waitFor(
      () => expect(screen.getByText(/can't verify availability/i)).toBeDefined(),
      { timeout: 2000 },
    );
    expect(screen.queryByText(/is available/i)).toBeNull();
    // Registration stays possible — the relay is the final uniqueness gate.
    const register = screen.getByRole('button', { name: 'Register' }) as HTMLButtonElement;
    expect(register.disabled).toBe(false);
    fireEvent.click(register);
    expect(flow.register).toHaveBeenCalledWith('validname');
  });

  it('blocks Register when the ID is taken', async () => {
    flow.checkAvailability = vi.fn(async () => 'taken' as const);
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('id'), {
      target: { value: 'takenname' },
    });

    await waitFor(
      () => expect(screen.getByText('@takenname is already taken')).toBeDefined(),
      { timeout: 2000 },
    );
    const register = screen.getByRole('button', { name: 'Register' }) as HTMLButtonElement;
    expect(register.disabled).toBe(true);
  });

  it('Skip hands off to the flow', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(flow.skip).toHaveBeenCalledTimes(1);
  });

  it('cannot be closed while registering — backdrop, X and Escape are all inert', () => {
    flow.state = makeState({ step: 'registering' });
    const onClose = vi.fn();
    render(<NewAddressModal isOpen onClose={onClose} />);

    expect(screen.getByText(/don't close this window/i)).toBeDefined();

    const backdrop = document.querySelector('.fixed.inset-0') as HTMLElement;
    fireEvent.click(backdrop);
    const xButton = document.querySelector('button:disabled') as HTMLButtonElement;
    expect(xButton).not.toBeNull();
    fireEvent.click(xButton);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('Escape closes the prompt while input is possible', () => {
    const onClose = vi.fn();
    render(<NewAddressModal isOpen onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('never renders a DIRECT:// value', () => {
    const { container } = renderModal();
    expect(container.innerHTML).not.toContain('DIRECT://');
    expect(document.body.innerHTML).not.toContain('DIRECT://');
  });
});
