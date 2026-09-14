/**
 * The `mint_nft` Connect intent (Connect 2.3, sphere-sdk#785): the wallet mints ONE
 * dApp-described NFT to its own address, signed as the user by default. So the
 * user is shown exactly what will be minted, every time — never auto-approved —
 * and a mint that failed after it was journaled tells the dApp it may still
 * complete, with the token id to reconcile against.
 *
 * Runs the real handler, the real NFT preview and the real media hook; the wallet,
 * the subscription guard and the Connect context are fakes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHash } from 'node:crypto';
import type { ReactNode } from 'react';
import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';
import { ERROR_CODES, nftContentFromWire, nftContentToWire } from '@unicitylabs/sphere-sdk/connect';
import type { NftLink, NftMetadata } from '@unicitylabs/sphere-sdk';
import type { MintNftRequest, MintResult } from '@unicitylabs/sphere-sdk/payments-v2';
import type { PendingIntent } from '../../../src/components/connect/ConnectContext';

const mocks = vi.hoisted(() => ({
  mintNft: vi.fn<(request: MintNftRequest) => Promise<MintResult>>(),
  subscriptionReady: true,
}));

// The real decoder, counted: a meme is up to ~1 MB of base64, decoded once per intent.
vi.mock('@unicitylabs/sphere-sdk/connect', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@unicitylabs/sphere-sdk/connect')>();
  return { ...actual, nftContentFromWire: vi.fn(actual.nftContentFromWire) };
});
vi.mock('../../../src/sdk', () => ({
  useSphereContext: () => ({ sphere: {} }),
}));
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: {} }),
}));
vi.mock('../../../src/sdk/payments', () => ({
  getPayments: () => ({ mintNft: mocks.mintNft }),
}));
vi.mock('../../../src/sdk/hooks/subscription', () => ({
  useSubscriptionKeyGuard: () => ({ ready: mocks.subscriptionReady, assertReady: vi.fn() }),
}));
vi.mock('../../../src/sdk/hooks/comms/useSendDM', () => ({
  useSendDM: () => ({ sendDM: vi.fn(), isLoading: false }),
}));
vi.mock('../../../src/components/upgrade', () => ({
  useUpgrade: () => ({ openUpgrade: vi.fn() }),
}));

const resolveIntent = vi.fn();
const rejectIntent = vi.fn();
const registerAutoIntent = vi.fn();
let pendingIntent: PendingIntent | null = null;

vi.mock('../../../src/components/connect/ConnectContext', () => ({
  useConnectContext: () => ({
    pendingIntent,
    resolveIntent,
    rejectIntent,
    registerAutoIntent,
    armIntentShield: vi.fn(),
  }),
}));

import { ConnectIntentHandler } from '../../../src/components/connect/ConnectIntentHandler';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const TOKEN_ID = 'ab'.repeat(32);
const INTENT_ID = 11;
const ORIGIN = 'https://memes.example';
const SIGNED_LINE = 'You will be its creator — signed with your wallet key';
const UNSIGNED_LINE = 'Unsigned — anyone could mint an identical token';

function metadata(overrides: Partial<NftMetadata> = {}): NftMetadata {
  return {
    kind: 'metadata',
    name: 'Cool Cat #7',
    description: 'A very cool cat',
    image: { kind: 'media', media_type: 'image/png', bytes: PNG },
    animation_url: null,
    external_url: null,
    attributes: [{ trait_type: 'Eyes', value: 'green' }],
    collection: 'Cats',
    ...overrides,
  };
}

function hostedImage(): NftLink {
  return {
    kind: 'link',
    media_type: 'image/png',
    uri: 'https://example.com/cat.png',
    sha256: createHash('sha256').update(PNG).digest('hex'),
  };
}

function mintNftIntent(params: Record<string, unknown>): PendingIntent {
  return { id: INTENT_ID, host: {} as ConnectHost, origin: ORIGIN, action: 'mint_nft', params, resolve: vi.fn() };
}

let urlSeq = 0;
const createObjectURL = vi.fn<(obj: Blob | MediaSource) => string>(() => `blob:nft-${String(++urlSeq)}`);
const revokeObjectURL = vi.fn<(url: string) => void>();
const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

beforeEach(() => {
  mocks.mintNft.mockReset();
  mocks.subscriptionReady = true;
  resolveIntent.mockClear();
  rejectIntent.mockClear();
  registerAutoIntent.mockClear();
  vi.mocked(nftContentFromWire).mockClear();
  urlSeq = 0;
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  fetchMock.mockReset();
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
  vi.stubGlobal('fetch', fetchMock);
  pendingIntent = mintNftIntent({ content: nftContentToWire(metadata()) });
});

afterEach(() => {
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
  vi.unstubAllGlobals();
});

function renderHandler() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<ConnectIntentHandler />, { wrapper: Wrapper });
}

async function clickMint() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Mint' }));
  });
}

describe('mint_nft intent — what the user is shown', () => {
  it('previews the image, name, collection, description and attributes, and names who asks', async () => {
    renderHandler();

    expect(screen.getByText('Mint NFT')).toBeTruthy();
    expect(
      screen.getByText((_, element) => element?.textContent === 'This dApp is asking to mint an NFT to your own wallet.'),
    ).toBeTruthy();
    expect(screen.getByText(ORIGIN)).toBeTruthy();
    expect(screen.getByText('Cool Cat #7')).toBeTruthy();
    expect(screen.getByText('Cats')).toBeTruthy();
    expect(screen.getByText('A very cool cat')).toBeTruthy();
    expect(screen.getByText('Eyes')).toBeTruthy();
    expect(screen.getByText('green')).toBeTruthy();
    await waitFor(() => expect(screen.getByAltText('Cool Cat #7').getAttribute('src')).toBe('blob:nft-1'));
  });

  it('says what signing will mean — and shows no signature status for a token that does not exist yet', () => {
    renderHandler();

    expect(screen.getByText(SIGNED_LINE)).toBeTruthy();
    expect(screen.queryByText(UNSIGNED_LINE)).toBeNull();
    expect(screen.queryByText('Signed by its creator')).toBeNull();
    expect(screen.queryByText(/Creator/)).toBeNull();
  });

  it('says an unsigned mint is unsigned', () => {
    pendingIntent = mintNftIntent({ content: nftContentToWire(metadata()), sign: false });
    renderHandler();

    expect(screen.getByText(UNSIGNED_LINE)).toBeTruthy();
    expect(screen.queryByText(SIGNED_LINE)).toBeNull();
  });

  it('shows a hosted image only once it matches its fingerprint', async () => {
    fetchMock.mockResolvedValue(new Response(PNG, { status: 200 }));
    pendingIntent = mintNftIntent({ content: nftContentToWire(metadata({ image: hostedImage() })) });
    renderHandler();

    await waitFor(() => expect(screen.getByAltText('Cool Cat #7').getAttribute('src')).toBe('blob:nft-1'));
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/cat.png',
      expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }),
    );
  });

  it('keeps the preview a fixed-height scroll box while a hosted image loads, so Mint cannot move under the cursor', async () => {
    // jsdom does no layout, so this pins the invariant the layout depends on: the
    // preview's height is set by the box, not by whatever media arrives, and the
    // same box is still there, unchanged, once the image has loaded.
    let answer!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (answer = resolve)));
    pendingIntent = mintNftIntent({ content: nftContentToWire(metadata({ image: hostedImage() })) });
    renderHandler();

    const preview = screen.getByTestId('nft-mint-preview');
    const fixedBox = ['h-80', 'overflow-y-auto'];
    expect(fixedBox.every((name) => preview.classList.contains(name))).toBe(true);

    await act(async () => answer(new Response(PNG, { status: 200 })));
    await waitFor(() => expect(screen.getByAltText('Cool Cat #7').getAttribute('src')).toBe('blob:nft-1'));

    expect(screen.getByTestId('nft-mint-preview')).toBe(preview);
    expect(fixedBox.every((name) => preview.classList.contains(name))).toBe(true);
  });

  it('shows nothing of a hosted image that fails its fingerprint and says so — the user may still mint', async () => {
    fetchMock.mockResolvedValue(new Response(GIF, { status: 200 }));
    mocks.mintNft.mockResolvedValue({ success: true, tokenId: TOKEN_ID });
    pendingIntent = mintNftIntent({ content: nftContentToWire(metadata({ image: hostedImage() })) });
    renderHandler();

    expect(await screen.findByText('Image does not match its fingerprint — not shown')).toBeTruthy();
    expect(screen.queryByAltText('Cool Cat #7')).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();

    await clickMint();
    await waitFor(() => expect(resolveIntent).toHaveBeenCalledWith(INTENT_ID, { tokenId: TOKEN_ID }));
  });

  it('refuses malformed content before any modal, with INVALID_PARAMS naming the field', () => {
    pendingIntent = mintNftIntent({ content: { kind: 'media', media_type: 'image/png', bytes: 'not base64!' } });
    renderHandler();

    expect(rejectIntent).toHaveBeenCalledWith(
      INTENT_ID,
      ERROR_CODES.INVALID_PARAMS,
      expect.stringContaining('content.bytes'),
    );
    expect(screen.queryByText('Mint NFT')).toBeNull();
  });
});

describe('mint_nft intent — minting', () => {
  it('mints the DECODED content, signed by default, and resolves { tokenId }', async () => {
    mocks.mintNft.mockResolvedValue({ success: true, tokenId: TOKEN_ID });
    renderHandler();

    await clickMint();

    await waitFor(() => expect(resolveIntent).toHaveBeenCalledWith(INTENT_ID, { tokenId: TOKEN_ID }));
    expect(mocks.mintNft).toHaveBeenCalledTimes(1);
    const [request] = mocks.mintNft.mock.calls[0]!;
    expect(request.sign).toBe(true);
    // The file itself, not the base64 that carried it over the wire.
    expect(request.content).toEqual(metadata());
    expect(rejectIntent).not.toHaveBeenCalled();
  });

  it('mints unsigned when the dApp asks for it', async () => {
    mocks.mintNft.mockResolvedValue({ success: true, tokenId: TOKEN_ID });
    pendingIntent = mintNftIntent({ content: nftContentToWire(metadata()), sign: false });
    renderHandler();

    await clickMint();

    await waitFor(() => expect(resolveIntent).toHaveBeenCalledWith(INTENT_ID, { tokenId: TOKEN_ID }));
    expect(mocks.mintNft.mock.calls[0]![0].sign).toBe(false);
  });

  it('Cancel rejects with USER_REJECTED and mints nothing', () => {
    renderHandler();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(rejectIntent).toHaveBeenCalledWith(INTENT_ID, ERROR_CODES.USER_REJECTED, expect.any(String));
    expect(mocks.mintNft).not.toHaveBeenCalled();
    expect(resolveIntent).not.toHaveBeenCalled();
  });

  it('a journaled failure says the mint may still complete, and names the token id in the message and the data', async () => {
    mocks.mintNft.mockResolvedValue({ success: false, tokenId: TOKEN_ID, error: 'gateway timeout' });
    renderHandler();

    await clickMint();

    await waitFor(() => expect(rejectIntent).toHaveBeenCalledTimes(1));
    const [id, code, message, data] = rejectIntent.mock.calls[0]!;
    expect(id).toBe(INTENT_ID);
    expect(code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(message).toMatch(/may still complete/);
    expect(message).toContain(TOKEN_ID);
    expect(message).toContain('gateway timeout');
    expect(data).toEqual({ tokenId: TOKEN_ID });
    expect(resolveIntent).not.toHaveBeenCalled();
  });

  it('a refusal — nothing journaled — is the intent error, with no token id', async () => {
    mocks.mintNft.mockResolvedValue({ success: false, error: 'Invalid NFT name: must not be empty' });
    renderHandler();

    await clickMint();

    await waitFor(() => expect(rejectIntent).toHaveBeenCalledTimes(1));
    expect(rejectIntent.mock.calls[0]).toEqual([
      INTENT_ID,
      ERROR_CODES.INTERNAL_ERROR,
      'Invalid NFT name: must not be empty',
    ]);
  });

  it('shows a thrown error in the modal and settles nothing', async () => {
    mocks.mintNft.mockRejectedValue(new Error('Payments are not running'));
    renderHandler();

    await clickMint();

    expect(await screen.findByText(/Payments are not running/)).toBeTruthy();
    expect(resolveIntent).not.toHaveBeenCalled();
    expect(rejectIntent).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Mint' })).toHaveProperty('disabled', false);
  });

  it('refuses while the subscription key is still being set up: INTERNAL_ERROR, and no mint', async () => {
    mocks.subscriptionReady = false;
    renderHandler();

    await clickMint();

    expect(mocks.mintNft).not.toHaveBeenCalled();
    expect(rejectIntent).toHaveBeenCalledWith(INTENT_ID, ERROR_CODES.INTERNAL_ERROR, expect.stringMatching(/Subscription/));
  });

  it('offers no auto-approval: no control to grant one, and none registered by a successful mint', async () => {
    mocks.mintNft.mockResolvedValue({ success: true, tokenId: TOKEN_ID });
    renderHandler();

    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByText(/without confirmation/i)).toBeNull();

    await clickMint();

    await waitFor(() => expect(resolveIntent).toHaveBeenCalled());
    expect(registerAutoIntent).not.toHaveBeenCalled();
  });

  it('decodes the content once however often the modal re-renders, and cannot be cancelled mid-mint', async () => {
    let finish!: (result: MintResult) => void;
    mocks.mintNft.mockImplementation(() => new Promise<MintResult>((resolve) => { finish = resolve; }));
    const { rerender } = renderHandler();
    rerender(<ConnectIntentHandler />);
    rerender(<ConnectIntentHandler />);

    await clickMint();
    expect(screen.getByRole('button', { name: 'Minting…' })).toBeTruthy();
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(cancel).toHaveProperty('disabled', true);
    fireEvent.click(cancel);
    expect(rejectIntent).not.toHaveBeenCalled();

    await act(async () => { finish({ success: true, tokenId: TOKEN_ID }); });

    expect(resolveIntent).toHaveBeenCalledWith(INTENT_ID, { tokenId: TOKEN_ID });
    expect(vi.mocked(nftContentFromWire)).toHaveBeenCalledTimes(1);
  });
});
