import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHash } from 'node:crypto';
import type { ReactNode } from 'react';
import type { NftLink, NftMedia } from '@unicitylabs/sphere-sdk';
import { NftMediaView } from '../../../../src/components/wallet/shared/nft/NftMediaView';
import {
  NftMediaDisplayContext,
  type NftMediaDisplayReporter,
} from '../../../../src/components/wallet/shared/nft/mediaDisplay';

/**
 * NftMediaView renders only what useNftMedia cleared, and says why when it
 * shows nothing. These run the real hook, with jsdom's missing object-URL API
 * and fetch stubbed.
 */

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function inline(media_type: string, bytes: Uint8Array = PNG): NftMedia {
  return { kind: 'media', media_type, bytes };
}

function link(overrides: Partial<NftLink> = {}): NftLink {
  return {
    kind: 'link',
    media_type: 'image/png',
    // Through the IPFS gateway, so it is fetched as soon as it is shown.
    uri: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/cat.png',
    sha256: sha256Hex(PNG),
    ...overrides,
  };
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

let urlSeq = 0;
const createObjectURL = vi.fn<(obj: Blob | MediaSource) => string>(() => `blob:nft-${String(++urlSeq)}`);
const revokeObjectURL = vi.fn<(url: string) => void>();
const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

beforeEach(() => {
  urlSeq = 0;
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  fetchMock.mockReset();
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
  vi.unstubAllGlobals();
});

function renderView(ui: ReactNode) {
  return render(ui, { wrapper: makeWrapper() });
}

// Long enough for a mount effect and a query to have started a fetch, had one been due.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

describe('NftMediaView — full', () => {
  it('shows a cleared image with its alt text', async () => {
    const { container } = renderView(<NftMediaView media={inline('image/png')} alt="Cool Cat #7" variant="full" />);

    await waitFor(() => expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:nft-1'));
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('Cool Cat #7');
  });

  it('plays video with controls, inline, and never on its own', async () => {
    const { container } = renderView(<NftMediaView media={inline('video/mp4')} alt="Clip" variant="full" />);

    await waitFor(() => expect(container.querySelector('video')?.getAttribute('src')).toBe('blob:nft-1'));
    const video = container.querySelector('video');
    expect(video?.hasAttribute('controls')).toBe(true);
    expect(video?.hasAttribute('playsinline')).toBe(true);
    expect(video?.hasAttribute('autoplay')).toBe(false);
    expect(container.querySelector('img')).toBeNull();
  });

  it('plays audio with controls', async () => {
    const { container } = renderView(<NftMediaView media={inline('audio/mpeg')} alt="Song" variant="full" />);

    await waitFor(() => expect(container.querySelector('audio')?.getAttribute('src')).toBe('blob:nft-1'));
    expect(container.querySelector('audio')?.hasAttribute('controls')).toBe(true);
  });

  it('says a type it does not display is not shown — and never makes a URL for it', () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const { container } = renderView(<NftMediaView media={inline('image/svg+xml', svg)} alt="x" variant="full" />);

    expect(screen.getByText('Not shown — image/svg+xml files are not displayed')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('says a link it cannot fetch is not shown — and never requests it', async () => {
    const { container } = renderView(
      <NftMediaView media={link({ uri: 'http://example.com/cat.png' })} alt="x" variant="full" />,
    );
    await settle();

    expect(screen.getByText('Not shown — this wallet does not fetch from its link')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows nothing of a hosted file that does not match its fingerprint, and says so', async () => {
    fetchMock.mockResolvedValue(new Response(GIF, { status: 200 }));
    const { container } = renderView(<NftMediaView media={link()} alt="x" variant="full" />);

    await waitFor(() => expect(screen.getByText('Image does not match its fingerprint — not shown')).toBeTruthy());
    expect(container.querySelector('img')).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('names the kind of file that failed its fingerprint', async () => {
    fetchMock.mockResolvedValue(new Response(GIF, { status: 200 }));
    renderView(<NftMediaView media={link({ media_type: 'video/mp4' })} alt="x" variant="full" />);

    await waitFor(() => expect(screen.getByText('Video does not match its fingerprint — not shown')).toBeTruthy());
  });

  it('falls back to the icon when the browser cannot decode a cleared file', async () => {
    const { container } = renderView(<NftMediaView media={inline('image/png')} alt="x" variant="full" />);
    await waitFor(() => expect(container.querySelector('img')).toBeTruthy());

    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders nothing without media', () => {
    const { container } = renderView(<NftMediaView media={null} alt="x" variant="full" />);

    expect(container.innerHTML).toBe('');
  });
});

describe('NftMediaView — thumb', () => {
  it('shows a cleared image', async () => {
    const { container } = renderView(<NftMediaView media={inline('image/png')} alt="Cat" variant="thumb" />);

    await waitFor(() => expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:nft-1'));
  });

  it('neither downloads nor plays a linked video — a row shows images only', async () => {
    const { container } = renderView(
      <NftMediaView media={link({ media_type: 'video/mp4', uri: 'https://example.com/clip.mp4' })} alt="x" variant="thumb" />,
    );
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('never wraps inline audio in a player', async () => {
    const { container } = renderView(<NftMediaView media={inline('audio/mpeg')} alt="x" variant="thumb" />);
    await settle();

    expect(container.querySelector('audio')).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('falls back to the icon when the browser cannot decode the image', async () => {
    const { container } = renderView(<NftMediaView media={inline('image/png')} alt="x" variant="thumb" />);
    await waitFor(() => expect(container.querySelector('img')).toBeTruthy());

    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

describe('NftMediaView — reporting what the browser displayed', () => {
  it.each([
    ['an image', 'image/png', 'img', 'load'],
    ['a video', 'video/mp4', 'video', 'loadedData'],
    ['audio', 'audio/mpeg', 'audio', 'loadedData'],
  ] as const)('reports %s displayed once its element has it, and failed on an element error', async (_what, type, tag, event) => {
    const report = vi.fn<NftMediaDisplayReporter>();
    const media = inline(type);
    const { container } = renderView(
      <NftMediaDisplayContext.Provider value={report}>
        <NftMediaView media={media} alt="x" variant="full" />
      </NftMediaDisplayContext.Provider>,
    );
    await waitFor(() => expect(container.querySelector(tag)).toBeTruthy());
    expect(report).not.toHaveBeenCalled();

    fireEvent[event](container.querySelector(tag) as HTMLElement);
    expect(report).toHaveBeenLastCalledWith(media, 'displayed');

    fireEvent.error(container.querySelector(tag) as HTMLElement);
    expect(report).toHaveBeenLastCalledWith(media, 'failed');
    expect(report).toHaveBeenCalledTimes(2);
  });

  it('reports nothing, and renders the same, without a reporter', async () => {
    const { container } = renderView(<NftMediaView media={inline('video/mp4')} alt="x" variant="full" />);
    await waitFor(() => expect(container.querySelector('video')).toBeTruthy());

    expect(() => fireEvent.loadedData(container.querySelector('video') as HTMLVideoElement)).not.toThrow();
    expect(container.querySelector('video')?.getAttribute('preload')).toBe('auto');
  });
});

describe('NftMediaView — a file on a host its minter chose', () => {
  const HOSTED = link({ uri: 'https://cats.example/cat.png' });
  const PROMPT = 'Image hosted at cats.example. Loading it shows that site your IP address.';

  it('asks before loading it in the full view, and fetches nothing until asked', async () => {
    const { container } = renderView(<NftMediaView media={HOSTED} alt="x" variant="full" />);
    await settle();

    expect(screen.getByText(PROMPT)).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the file once the user loads it, and asks no more', async () => {
    fetchMock.mockResolvedValue(new Response(PNG, { status: 200 }));
    const { container } = renderView(<NftMediaView media={HOSTED} alt="Cat" variant="full" />);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Load' }));

    await waitFor(() => expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:nft-1'));
    expect(fetchMock).toHaveBeenCalledWith('https://cats.example/cat.png', expect.objectContaining({ credentials: 'omit' }));
    expect(screen.queryByText(PROMPT)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Load' })).toBeNull();
  });

  it('offers to try again when it could not be loaded', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    renderView(<NftMediaView media={HOSTED} alt="x" variant="full" />);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Load' }));

    expect(await screen.findByText('Image could not be loaded from cats.example')).toBeTruthy();
    fetchMock.mockResolvedValue(new Response(PNG, { status: 200 }));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('shows the icon in a row, fetching nothing and asking nothing', async () => {
    const { container } = renderView(<NftMediaView media={HOSTED} alt="x" variant="thumb" />);
    await settle();

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
