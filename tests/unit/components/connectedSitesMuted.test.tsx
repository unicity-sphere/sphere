/**
 * The "Muted network prompts" section of Connected Sites.
 *
 * "Do not ask again" on the network-switch prompt is a refusal the user made once and can
 * change their mind about. The refusal copy already says where to undo it, so this list is
 * what makes that sentence true. The properties worth pinning:
 *
 *  - it lists what the store holds and nothing else, and is absent when that is nothing;
 *  - Unmute removes the row only when the store agrees. `clearSwitchPromptSuppression` can
 *    fail (write refused, storage unreadable), and its failure is the serious direction: a
 *    mute the user asked to remove is still standing. A row that vanished anyway would tell
 *    them the origin is unmuted while the wallet keeps refusing to ask;
 *  - the store's own read cannot be trusted to say so: with storage unreadable it lists
 *    NOTHING, which is exactly what a successful removal looks like.
 *
 * The real mute store runs. Both sides of every test go through the same module instance,
 * so whichever network the developer's .env selects, the bucket read is the bucket written.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ConnectedSitesModal } from '../../../src/components/wallet/L3/modals/ConnectedSitesModal';
import {
  clearSwitchPromptSuppression,
  getSuppressedOrigins,
  isSwitchPromptSuppressed,
  suppressSwitchPrompt,
} from '../../../src/utils/network-switch-prompts';
import { getApprovedOrigins, saveApprovedOrigin } from '../../../src/utils/connected-sites';
import { NETWORKS } from '@unicitylabs/sphere-sdk';
import { SPHERE_NETWORK } from '../../../src/config/network';
import { SUPPRESSED_KEY } from '../../support/networkSwitchFixtures';

const MUTED_A = 'https://muted-a.example';
const MUTED_B = 'https://muted-b.example';
const CONNECTED = 'https://connected.example';

function open() {
  return render(<ConnectedSitesModal isOpen onClose={vi.fn()} />);
}

/** Make reads or writes of the mute store fail, as blocked or full site data does, and no other key. */
function breakStore(method: 'getItem' | 'setItem') {
  const real = Storage.prototype[method] as (this: Storage, ...args: string[]) => string | null | void;
  vi.spyOn(Storage.prototype, method).mockImplementation(function (this: Storage, key: string, ...rest: string[]) {
    if (this === localStorage && key === SUPPRESSED_KEY) throw new Error(`${method} refused`);
    return real.call(this, key, ...rest);
  } as never);
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Connected Sites: the muted network prompts section', () => {
  it('is absent when nothing is muted', () => {
    open();

    expect(screen.queryByText('Muted network prompts')).toBeNull();
    expect(screen.queryByRole('button', { name: /unmute/i })).toBeNull();
  });

  it('lists a muted origin with what muting it means, and an Unmute control', () => {
    expect(suppressSwitchPrompt(MUTED_A, 'mainnet')).toBe(true);
    open();

    expect(screen.getByText('Muted network prompts')).toBeTruthy();
    expect(screen.getByText(MUTED_A)).toBeTruthy();
    expect(screen.getByText('Will not ask to switch networks')).toBeTruthy();
    expect(screen.getByRole('button', { name: `Unmute ${MUTED_A}` })).toBeTruthy();
  });

  it('lists one row per origin, however many targets are muted for it', () => {
    suppressSwitchPrompt(MUTED_A, 'mainnet');
    suppressSwitchPrompt(MUTED_A, 'testnet2');
    suppressSwitchPrompt(MUTED_B, 'mainnet');
    open();

    expect(screen.getAllByRole('button', { name: /^unmute /i })).toHaveLength(2);
  });

  it('sits BELOW the connected sites, and is shown even with no connected site', () => {
    saveApprovedOrigin(CONNECTED, { name: 'Connected App', url: CONNECTED }, []);
    suppressSwitchPrompt(MUTED_A, 'mainnet');
    const { unmount } = open();

    const site = screen.getByText('Connected App');
    const heading = screen.getByText('Muted network prompts');
    expect(site.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    unmount();

    localStorage.clear();
    suppressSwitchPrompt(MUTED_A, 'mainnet');
    open();
    expect(screen.getByText('No connected sites')).toBeTruthy();
    expect(screen.getByText(MUTED_A)).toBeTruthy();
  });

  it('removes the row on Unmute, once the store no longer holds it', () => {
    suppressSwitchPrompt(MUTED_A, 'mainnet');
    open();

    fireEvent.click(screen.getByRole('button', { name: `Unmute ${MUTED_A}` }));

    expect(screen.queryByText(MUTED_A)).toBeNull();
    expect(getSuppressedOrigins()).toEqual({});
    expect(isSwitchPromptSuppressed(MUTED_A, 'mainnet')).toBe(false);
    // Nothing left to list, so the whole section goes with it.
    expect(screen.queryByText('Muted network prompts')).toBeNull();
  });

  it('unmutes ONLY the origin asked for, every target of it, and touches no approval', () => {
    saveApprovedOrigin(CONNECTED, { name: 'Connected App', url: CONNECTED }, []);
    suppressSwitchPrompt(MUTED_A, 'mainnet');
    suppressSwitchPrompt(MUTED_A, 'testnet2');
    suppressSwitchPrompt(MUTED_B, 'mainnet');
    open();

    fireEvent.click(screen.getByRole('button', { name: `Unmute ${MUTED_A}` }));

    expect(screen.queryByText(MUTED_A)).toBeNull();
    expect(screen.getByText(MUTED_B)).toBeTruthy();
    expect(getSuppressedOrigins()).toEqual({ [MUTED_B]: ['mainnet'] });
    // An unmute is not a disconnect and a disconnect is not an unmute: separate stores.
    expect(Object.keys(getApprovedOrigins())).toEqual([CONNECTED]);
    expect(screen.getByText('Connected App')).toBeTruthy();
  });

  it('does not unmute anything when a connected site is disconnected', () => {
    saveApprovedOrigin(CONNECTED, { name: 'Connected App', url: CONNECTED }, []);
    suppressSwitchPrompt(MUTED_A, 'mainnet');
    open();

    fireEvent.click(screen.getByTitle('Disconnect'));

    expect(screen.queryByText('Connected App')).toBeNull();
    expect(screen.getByText(MUTED_A)).toBeTruthy();
    expect(isSwitchPromptSuppressed(MUTED_A, 'mainnet')).toBe(true);
  });
});

describe('Connected Sites: an Unmute that could not be saved', () => {
  it('keeps the row and says so, because the mute is still standing', () => {
    suppressSwitchPrompt(MUTED_A, 'mainnet');
    open();
    breakStore('setItem');
    // Control: the failure is real. The store refuses this removal.
    expect(clearSwitchPromptSuppression(MUTED_A)).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: `Unmute ${MUTED_A}` }));

    // The store still holds it, and so does the list.
    expect(isSwitchPromptSuppressed(MUTED_A, 'mainnet')).toBe(true);
    expect(screen.getByText(MUTED_A)).toBeTruthy();
    expect(screen.getByRole('button', { name: `Unmute ${MUTED_A}` })).toBeTruthy();
    // ...and the person who pressed Unmute is told it did not happen.
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Could not unmute');
    expect(alert.textContent).toContain(MUTED_A);
  });

  it('keeps every row when storage cannot be READ, where the store itself would report an empty list', () => {
    suppressSwitchPrompt(MUTED_A, 'mainnet');
    suppressSwitchPrompt(MUTED_B, 'mainnet');
    open();
    breakStore('getItem');
    // The trap: with reads refused the store lists nothing, the same picture a successful
    // removal leaves behind. A list rebuilt from it alone would drop BOTH rows.
    expect(getSuppressedOrigins()).toEqual({});

    fireEvent.click(screen.getByRole('button', { name: `Unmute ${MUTED_A}` }));

    expect(screen.getByText(MUTED_A)).toBeTruthy();
    expect(screen.getByText(MUTED_B)).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Could not unmute');
  });

  it('clears the message once a retry of THAT origin lands', () => {
    suppressSwitchPrompt(MUTED_A, 'mainnet');
    suppressSwitchPrompt(MUTED_B, 'mainnet');
    open();
    breakStore('setItem');
    fireEvent.click(screen.getByRole('button', { name: `Unmute ${MUTED_A}` }));
    expect(screen.getByRole('alert')).toBeTruthy();

    vi.restoreAllMocks();
    fireEvent.click(screen.getByRole('button', { name: `Unmute ${MUTED_A}` }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(MUTED_A)).toBeNull();
    expect(within(document.body).getByText(MUTED_B)).toBeTruthy();
  });

  it('keeps the message while ITS origin is still muted, when a DIFFERENT site is unmuted', () => {
    suppressSwitchPrompt(MUTED_A, 'mainnet');
    suppressSwitchPrompt(MUTED_B, 'mainnet');
    open();
    breakStore('setItem');
    fireEvent.click(screen.getByRole('button', { name: `Unmute ${MUTED_A}` }));
    expect(screen.getByRole('alert').textContent).toContain(MUTED_A);

    vi.restoreAllMocks();
    fireEvent.click(screen.getByRole('button', { name: `Unmute ${MUTED_B}` }));

    // B is gone, and A is still muted, so A still says why.
    expect(screen.queryByRole('button', { name: `Unmute ${MUTED_B}` })).toBeNull();
    expect(isSwitchPromptSuppressed(MUTED_A, 'mainnet')).toBe(true);
    expect(screen.getByRole('button', { name: `Unmute ${MUTED_A}` })).toBeTruthy();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Could not unmute');
    expect(alert.textContent).toContain(MUTED_A);
  });

  it('keeps one message per failed origin: a second failure does not replace the first', () => {
    suppressSwitchPrompt(MUTED_A, 'mainnet');
    suppressSwitchPrompt(MUTED_B, 'mainnet');
    open();
    breakStore('setItem');

    fireEvent.click(screen.getByRole('button', { name: `Unmute ${MUTED_A}` }));
    fireEvent.click(screen.getByRole('button', { name: `Unmute ${MUTED_B}` }));

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(2);
    expect(alerts.some((a) => a.textContent?.includes(MUTED_A))).toBe(true);
    expect(alerts.some((a) => a.textContent?.includes(MUTED_B))).toBe(true);

    // Retrying one clears only its own message.
    vi.restoreAllMocks();
    fireEvent.click(screen.getByRole('button', { name: `Unmute ${MUTED_A}` }));
    const left = screen.getAllByRole('alert');
    expect(left).toHaveLength(1);
    expect(left[0]!.textContent).toContain(MUTED_B);
  });
});

describe('Connected Sites: which network the muted list is for', () => {
  it('names the network it is showing, from the wallet\'s own table', () => {
    suppressSwitchPrompt(MUTED_A, 'mainnet');
    open();

    const caption = screen.getByTestId('muted-prompts-network');
    expect(caption.textContent).toContain(NETWORKS[SPHERE_NETWORK].name);
    // Says the list is not every mute the wallet holds, since the store is scoped per network.
    expect(caption.textContent).toContain('another network');
  });

  it('leaves the row subtitle as it was', () => {
    suppressSwitchPrompt(MUTED_A, 'mainnet');
    open();

    expect(screen.getByText('Will not ask to switch networks')).toBeTruthy();
  });

  it('is absent with the section, when nothing is muted', () => {
    open();

    expect(screen.queryByTestId('muted-prompts-network')).toBeNull();
  });
});
