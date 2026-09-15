import { useContext, useState } from 'react';
import type { NftMediaRef } from '@unicitylabs/sphere-sdk';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { useNftMedia } from '../../../../sdk/hooks/payments/useNftMedia';
import { mediaKindOf, type NftMediaKind } from './media';
import { NftMediaDisplayContext } from './mediaDisplay';

interface NftMediaViewProps {
  /** The media to show. Named `media`, not `ref`: `ref` is reserved by React. */
  media: NftMediaRef | null;
  alt: string;
  /** `thumb` fills a list row's icon box and shows images only; `full` also plays video and audio. */
  variant: 'thumb' | 'full';
}

const NOUN: Record<NftMediaKind, string> = { image: 'Image', video: 'Video', audio: 'Audio' };

/**
 * An NFT's image, video or audio (#785), rendered only from bytes `useNftMedia`
 * cleared: an allowlisted type, and for a hosted file a matching SHA-256.
 * Anything else — and a file the browser then fails to decode — falls back to
 * the generic icon.
 *
 * Inside a NftMediaDisplayContext it also reports the element's verdict on the item:
 * displayed once an image has loaded or a video or audio has its first data, failed
 * on an element error.
 */
export function NftMediaView({ media, alt, variant }: NftMediaViewProps) {
  const kind = media ? mediaKindOf(media.media_type) : null;
  // A row never plays video or audio, so it never downloads a file for one either.
  const shown = variant === 'thumb' && kind !== 'image' ? null : media;
  const { url, state } = useNftMedia(shown);
  const report = useContext(NftMediaDisplayContext);
  // Keyed by URL: a new file gets its own attempt instead of inheriting a failure.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const playable = state === 'ready' && url !== null && url !== failedUrl ? url : null;
  const onDisplayed = () => {
    if (media) report?.(media, 'displayed');
  };
  const onError = () => {
    setFailedUrl(playable);
    if (media) report?.(media, 'failed');
  };

  if (variant === 'thumb') {
    return playable ? (
      <img src={playable} alt={alt} onLoad={onDisplayed} onError={onError} className="w-full h-full object-cover" />
    ) : (
      <ImageIcon className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
    );
  }

  if (!media) return null;

  // `loadeddata`, not `canplay`: it is the first moment a frame or sample is decoded and
  // can be shown, which is all "displayed" claims. preload="auto" lets it come without a
  // tap — the bytes are an in-memory blob, so preloading fetches nothing.
  let body: React.ReactNode;
  if (playable && kind === 'image') {
    body = (
      <img
        src={playable}
        alt={alt}
        onLoad={onDisplayed}
        onError={onError}
        className="max-h-80 w-full object-contain"
      />
    );
  } else if (playable && kind === 'video') {
    body = (
      <video
        src={playable}
        controls
        playsInline
        preload="auto"
        aria-label={alt}
        onLoadedData={onDisplayed}
        onError={onError}
        className="max-h-80 w-full"
      />
    );
  } else if (playable && kind === 'audio') {
    body = (
      <audio
        src={playable}
        controls
        preload="auto"
        aria-label={alt}
        onLoadedData={onDisplayed}
        onError={onError}
        className="w-full p-2"
      />
    );
  } else if (state === 'loading') {
    body = (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    );
  } else {
    body = (
      <div className="flex h-32 items-center justify-center">
        <ImageIcon className="h-10 w-10 text-neutral-500" />
      </div>
    );
  }

  let caption: React.ReactNode = null;
  if (state === 'mismatch' && kind) {
    caption = <p className="mt-1 text-xs text-amber-400">{NOUN[kind]} does not match its fingerprint — not shown</p>;
  } else if (state === 'unsupported') {
    caption = (
      <p className="mt-1 text-xs text-neutral-400">
        {kind ? 'Not shown — this wallet does not fetch from its link' : `Not shown — ${media.media_type} files are not displayed`}
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg bg-black/40">{body}</div>
      {caption}
    </div>
  );
}
