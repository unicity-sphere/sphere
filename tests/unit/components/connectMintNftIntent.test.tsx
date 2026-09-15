/**
 * The `mint_nft` Connect intent (Connect 2.3, sphere-sdk#785): the wallet mints ONE
 * dApp-described NFT to its own address, signed as the user by default. So the
 * user is shown exactly what will be minted, every time — never auto-approved —
 * and a mint that failed after it was journaled tells the dApp it may still
 * complete, with the token id to reconcile against.
 *
 * Runs the real handler, the real NFT preview and the real media and document
 * hooks; the wallet, the subscription guard and the Connect context are fakes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHash } from 'node:crypto';
import type { ReactNode } from 'react';
import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';
import { ERROR_CODES, nftContentFromWire, nftContentToWire } from '@unicitylabs/sphere-sdk/connect';
import { NFT_DOCUMENT_MEDIA_TYPE, encodeNftContent } from '@unicitylabs/sphere-sdk';
import type { NftLink, NftMetadata } from '@unicitylabs/sphere-sdk';
import type { MintNftRequest, MintResult } from '@unicitylabs/sphere-sdk/payments-v2';
import type { PendingIntent } from '../../../src/components/connect/ConnectContext';
import { truncateId } from '../../../src/utils/identifiers';

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
const armIntentShield = vi.fn();
let pendingIntent: PendingIntent | null = null;

vi.mock('../../../src/components/connect/ConnectContext', () => ({
  useConnectContext: () => ({
    pendingIntent,
    resolveIntent,
    rejectIntent,
    registerAutoIntent,
    armIntentShield,
  }),
}));

import { ConnectIntentHandler } from '../../../src/components/connect/ConnectIntentHandler';
import { NFT_PREVIEW_WAIT_MS } from '../../../src/sdk/hooks/payments/useNftPreviewState';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const TOKEN_ID = 'ab'.repeat(32);
const INTENT_ID = 11;
const ORIGIN = 'https://memes.example';
const SIGNED_LINE = 'You will be its creator — signed with your wallet key';
const UNSIGNED_LINE = 'Unsigned — anyone could mint an identical token';
const VALID_SIGNATURE_LINE = 'Signed by this key — it attributes the item to its signer, not to a collection';
const UNSHOWN_SIGNED = 'Linked content could not be shown — minting will sign its link without it having been shown to you';
const UNSHOWN_UNSIGNED =
  'Linked content could not be shown — the NFT will carry its link without it having been shown to you';
const COLLECTION_ID = 'c0ffee' + '00'.repeat(10) + 'beef';
const DOCUMENT_URI = 'https://memes.example/cat.cbor';

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
    collection_id: null,
    ...overrides,
  };
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function hostedImage(): NftLink {
  return {
    kind: 'link',
    media_type: 'image/png',
    uri: 'https://example.com/cat.png',
    sha256: sha256Hex(PNG),
  };
}

/** A hosted metadata document: its own name, collection, claimed collection id and inline image. */
const DOCUMENT = encodeNftContent(metadata({ name: 'Doc Cat #1', collection: 'Doc Cats', collection_id: COLLECTION_ID }));

/** A document link pinned to `pinned`'s fingerprint. */
function documentLink(pinned: Uint8Array = DOCUMENT): NftLink {
  return { kind: 'link', media_type: NFT_DOCUMENT_MEDIA_TYPE, uri: DOCUMENT_URI, sha256: sha256Hex(pinned) };
}

function served(bytes: Uint8Array): Response {
  return new Response(new Uint8Array(bytes), { status: 200 });
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
  armIntentShield.mockClear();
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

function mintButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Mint' }) as HTMLButtonElement;
}

async function clickMint() {
  await act(async () => {
    fireEvent.click(mintButton());
  });
}

// Long enough for a query or an effect to have run, had one been due.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
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
    expect(screen.queryByText(VALID_SIGNATURE_LINE)).toBeNull();
    expect(screen.queryByText(/Creator|Signer/)).toBeNull();
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
    expect(screen.getByText(UNSHOWN_SIGNED)).toBeTruthy();

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

  it('refuses metadata without collection_id before any modal, with INVALID_PARAMS naming the field', () => {
    const content: Record<string, unknown> = { ...nftContentToWire(metadata()) };
    delete content.collection_id;
    pendingIntent = mintNftIntent({ content });
    renderHandler();

    expect(rejectIntent).toHaveBeenCalledWith(
      INTENT_ID,
      ERROR_CODES.INVALID_PARAMS,
      expect.stringContaining('content.collection_id'),
    );
    expect(screen.queryByText('Mint NFT')).toBeNull();
    expect(mocks.mintNft).not.toHaveBeenCalled();
  });
});

describe('mint_nft intent — a claimed collection and a hosted metadata document (#785)', () => {
  it("shows a claimed collection_id shortened, captioned as the item's claim", () => {
    pendingIntent = mintNftIntent({ content: nftContentToWire(metadata({ collection_id: COLLECTION_ID })) });
    renderHandler();

    const preview = screen.getByTestId('nft-mint-preview');
    expect(within(preview).getByText('Collection ID')).toBeTruthy();
    expect(within(preview).getByText(truncateId(COLLECTION_ID)).getAttribute('title')).toBe(COLLECTION_ID);
    expect(within(preview).getByText('Claimed by the item — not verified')).toBeTruthy();
  });

  it('shows no collection id, and no caption, for an item that claims none', () => {
    renderHandler();

    expect(screen.getByText('Cool Cat #7')).toBeTruthy();
    expect(screen.queryByText('Collection ID')).toBeNull();
    expect(screen.queryByText('Claimed by the item — not verified')).toBeNull();
  });

  it('previews the document a link resolves to — name and image — and still mints the link itself', async () => {
    fetchMock.mockImplementation(async () => served(DOCUMENT));
    mocks.mintNft.mockResolvedValue({ success: true, tokenId: TOKEN_ID });
    const link = documentLink();
    pendingIntent = mintNftIntent({ content: nftContentToWire(link) });
    renderHandler();

    const preview = screen.getByTestId('nft-mint-preview');
    expect(await within(preview).findByRole('heading', { name: 'Doc Cat #1' })).toBeTruthy();
    await waitFor(() => expect(within(preview).getByAltText('Doc Cat #1').getAttribute('src')).toBe('blob:nft-1'));
    expect(within(preview).getByText('Doc Cats')).toBeTruthy();
    expect(within(preview).getByText('Claimed by the item — not verified')).toBeTruthy();
    expect(
      within(preview).getByText(`Metadata hosted at ${DOCUMENT_URI}, checked against its fingerprint`),
    ).toBeTruthy();
    expect(screen.queryByText(UNSHOWN_SIGNED)).toBeNull();
    // Fetched under the linked-media policy, exactly as the token detail view fetches it — once,
    // though the preview and the Mint gate both watch it.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      DOCUMENT_URI,
      expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }),
    );
    // The signing line is the intent's `sign`, never anything the document says.
    expect(screen.getByText(SIGNED_LINE)).toBeTruthy();
    expect(screen.queryByText(VALID_SIGNATURE_LINE)).toBeNull();

    await clickMint();
    await waitFor(() => expect(resolveIntent).toHaveBeenCalledWith(INTENT_ID, { tokenId: TOKEN_ID }));
    // What is minted — and signed — is the dApp's content: the link pinning the document.
    expect(mocks.mintNft.mock.calls[0]![0].content).toEqual(link);
  });

  it('says a hosted document minted unsigned is unsigned, whatever the document holds', async () => {
    fetchMock.mockImplementation(async () => served(DOCUMENT));
    pendingIntent = mintNftIntent({ content: nftContentToWire(documentLink()), sign: false });
    renderHandler();

    expect(await screen.findByRole('heading', { name: 'Doc Cat #1' })).toBeTruthy();
    expect(screen.getByText(UNSIGNED_LINE)).toBeTruthy();
    expect(screen.queryByText(SIGNED_LINE)).toBeNull();
  });

  it('keeps the preview a fixed-height scroll box while the document loads, and after', async () => {
    let answer!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (answer = resolve)));
    pendingIntent = mintNftIntent({ content: nftContentToWire(documentLink()) });
    renderHandler();

    const preview = screen.getByTestId('nft-mint-preview');
    const fixedBox = ['h-80', 'overflow-y-auto'];
    expect(within(preview).getByRole('status', { name: 'Loading metadata' })).toBeTruthy();
    expect(fixedBox.every((name) => preview.classList.contains(name))).toBe(true);

    await act(async () => answer(served(DOCUMENT)));
    expect(await within(preview).findByRole('heading', { name: 'Doc Cat #1' })).toBeTruthy();

    expect(screen.getByTestId('nft-mint-preview')).toBe(preview);
    expect(fixedBox.every((name) => preview.classList.contains(name))).toBe(true);
  });

  it('shows nothing of a document that does not match its fingerprint and says so — the signing line is still the intent’s', async () => {
    fetchMock.mockImplementation(async () => served(GIF));
    pendingIntent = mintNftIntent({ content: nftContentToWire(documentLink()), sign: false });
    renderHandler();

    expect(await screen.findByText('Metadata does not match its fingerprint — not shown')).toBeTruthy();
    expect(screen.queryByText('Doc Cat #1')).toBeNull();
    expect(screen.queryByText(/Metadata hosted at/)).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(screen.getByText(UNSIGNED_LINE)).toBeTruthy();
    expect(screen.queryByText(SIGNED_LINE)).toBeNull();
    expect(screen.getByText(UNSHOWN_UNSIGNED)).toBeTruthy();
  });
});

describe('mint_nft intent — Mint waits for what the user is asked to approve', () => {
  it('keeps Mint disabled while the hosted document loads, and enables it once the document is shown', async () => {
    let answer!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (answer = resolve)));
    pendingIntent = mintNftIntent({ content: nftContentToWire(documentLink()) });
    renderHandler();

    expect(mintButton().disabled).toBe(true);
    await settle();
    expect(mintButton().disabled).toBe(true);

    await act(async () => answer(served(DOCUMENT)));
    expect(await screen.findByRole('heading', { name: 'Doc Cat #1' })).toBeTruthy();
    await waitFor(() => expect(mintButton().disabled).toBe(false));
  });

  it('keeps Mint disabled while a linked image loads, and enables it once the image is shown', async () => {
    let answer!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (answer = resolve)));
    pendingIntent = mintNftIntent({ content: nftContentToWire(metadata({ image: hostedImage() })) });
    renderHandler();

    expect(mintButton().disabled).toBe(true);

    await act(async () => answer(served(PNG)));
    await waitFor(() => expect(screen.getByAltText('Cool Cat #7').getAttribute('src')).toBe('blob:nft-1'));
    expect(mintButton().disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps Mint disabled while the resolved document's own linked image loads", async () => {
    const withLinkedImage = encodeNftContent(metadata({ name: 'Doc Cat #2', image: hostedImage() }));
    let answerImage!: (response: Response) => void;
    const image = new Promise<Response>((resolve) => (answerImage = resolve));
    fetchMock.mockImplementation(async (url) => (url === DOCUMENT_URI ? served(withLinkedImage) : image));
    pendingIntent = mintNftIntent({ content: nftContentToWire(documentLink(withLinkedImage)) });
    renderHandler();

    expect(await screen.findByRole('heading', { name: 'Doc Cat #2' })).toBeTruthy();
    expect(mintButton().disabled).toBe(true);

    await act(async () => answerImage(served(PNG)));
    await waitFor(() => expect(screen.getByAltText('Doc Cat #2').getAttribute('src')).toMatch(/^blob:nft-/));
    expect(mintButton().disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows the document link's URI and fingerprint from the first paint, while the document loads", () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));
    const link = documentLink();
    pendingIntent = mintNftIntent({ content: nftContentToWire(link) });
    renderHandler();

    expect(
      screen.getByText(`Metadata document: ${DOCUMENT_URI} · SHA-256 ${truncateId(link.sha256)}`),
    ).toBeTruthy();
    expect(mintButton().disabled).toBe(true);
  });

  it.each([
    ['cannot be fetched', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['does not match its fingerprint', () => served(GIF)],
  ] as const)(
    'warns, when the hosted document %s, that minting signs a link whose content was not shown — Mint stays enabled',
    async (_how, respond) => {
      fetchMock.mockImplementation(async () => respond());
      pendingIntent = mintNftIntent({ content: nftContentToWire(documentLink()) });
      renderHandler();

      expect(await screen.findByText(UNSHOWN_SIGNED)).toBeTruthy();
      expect(within(screen.getByTestId('nft-mint-preview')).getByRole('alert')).toBeTruthy();
      expect(mintButton().disabled).toBe(false);
    },
  );

  it('arms the settle shield once when Mint becomes actionable after its preview loaded — not while loading, not again', async () => {
    let answer!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (answer = resolve)));
    pendingIntent = mintNftIntent({ content: nftContentToWire(documentLink()) });
    const { rerender } = renderHandler();

    await settle();
    expect(armIntentShield).not.toHaveBeenCalled();

    await act(async () => answer(served(DOCUMENT)));
    await waitFor(() => expect(mintButton().disabled).toBe(false));
    expect(armIntentShield).toHaveBeenCalledTimes(1);

    rerender(<ConnectIntentHandler />);
    rerender(<ConnectIntentHandler />);
    await settle();
    expect(armIntentShield).toHaveBeenCalledTimes(1);
  });

  it('arms nothing more for a preview with nothing to load — the arrival arm already covers it', async () => {
    renderHandler();
    await settle();

    expect(mintButton().disabled).toBe(false);
    expect(armIntentShield).not.toHaveBeenCalled();
  });

  it('holds Mint back for a stalled link only for its bounded wait — then enables it with the warning, arming the shield once', async () => {
    // A host can accept the request and never finish it. That must not make the
    // intent impossible to approve: once the wait is over, what has not loaded
    // counts as not shown.
    vi.useFakeTimers();
    try {
      fetchMock.mockReturnValue(new Promise<Response>(() => {}));
      pendingIntent = mintNftIntent({ content: nftContentToWire(documentLink()) });
      renderHandler();

      await act(async () => {
        vi.advanceTimersByTime(NFT_PREVIEW_WAIT_MS - 1);
      });
      expect(mintButton().disabled).toBe(true);
      expect(screen.queryByText(UNSHOWN_SIGNED)).toBeNull();
      expect(armIntentShield).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(mintButton().disabled).toBe(false);
      expect(screen.getByText(UNSHOWN_SIGNED)).toBeTruthy();
      expect(screen.getByRole('status', { name: 'Loading metadata' })).toBeTruthy();
      expect(armIntentShield).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
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

  it.each([
    ['rejects', () => Promise.reject(new Error('Payments are not running'))],
    ['throws synchronously', () => { throw new Error('Payments are not running'); }],
  ] as const)(
    'settles a mint that %s as an unknown outcome at once, and never offers Mint again — a retry could mint a second NFT',
    async (_how, failure) => {
      mocks.mintNft.mockImplementation(failure);
      renderHandler();

      await clickMint();

      await waitFor(() => expect(rejectIntent).toHaveBeenCalledTimes(1));
      const [id, code, message] = rejectIntent.mock.calls[0]!;
      expect(id).toBe(INTENT_ID);
      expect(code).toBe(ERROR_CODES.INTENT_OUTCOME_UNKNOWN);
      expect(message).toMatch(/may have started/);
      expect(message).toMatch(/may still complete/);
      expect(message).toMatch(/Tokens tab/);
      expect(message).toContain('Payments are not running');
      expect(resolveIntent).not.toHaveBeenCalled();

      // The dialog does not stay open with Mint enabled, and nothing here settles the intent again.
      expect(mintButton().disabled).toBe(true);
      expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true);
      await clickMint();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mocks.mintNft).toHaveBeenCalledTimes(1);
      expect(rejectIntent).toHaveBeenCalledTimes(1);
    },
  );

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
