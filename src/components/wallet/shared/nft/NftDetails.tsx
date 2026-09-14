import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isValidNametag, normalizeNametag } from '@unicitylabs/sphere-sdk';
import type { NftAttribute, NftSignatureStatus, NftView } from '@unicitylabs/sphere-sdk';
import { CheckCircle2, Copy, ExternalLink, ShieldAlert, ShieldCheck, ShieldQuestionMark } from 'lucide-react';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { SPHERE_KEYS } from '../../../../sdk/queryKeys';
import { copyToClipboard } from '../../../../utils/copyToClipboard';
import { isChainPubkey } from '../../../../utils/identifiers';
import { isHttpsUrl } from '../../../../utils/isHttpsUrl';
import { NftMediaView } from './NftMediaView';
import { nftThumbnailRef, shortPubkey } from './nftDisplay';

interface NftDetailsProps {
  nft: NftView;
  /** Names the media when the NFT carries no name of its own (a bare media or link NFT). */
  fallbackTitle: string;
}

const LABEL = 'text-xs text-neutral-400';

/** The fields of a resolved identity binding that say whose it is. */
interface BindingKeys {
  readonly chainPubkey: string;
  readonly transportPubkey: string;
}

/**
 * Whether a resolved binding is `creator`'s own: it names that key, and it was
 * signed by that key. A Sphere wallet signs its binding with the x-only form of
 * its chain key; the key named inside a binding is only its publisher's word.
 */
function isBindingOf(peer: BindingKeys | null, creator: string): boolean {
  if (!peer) return false;
  const key = creator.toLowerCase();
  return peer.chainPubkey.toLowerCase() === key && peer.transportPubkey.toLowerCase() === key.slice(2);
}

/** The creator key's nametag from its identity binding. Best effort: the key shows either way. */
function useCreatorNametag(creator: string): string | null {
  const { sphere } = useSphereContext();
  const query = useQuery({
    queryKey: SPHERE_KEYS.nft.creator(creator),
    queryFn: async () => {
      if (!sphere) return null;
      // A lookup by KEY returns whatever name its binding states, and a binding
      // can state a name its publisher does not own. A name has a single owner
      // only on the lookup by NAME, so the name counts only when its own binding
      // points back at this key — and both bindings were signed by the key itself.
      const byKey = await sphere.resolve(creator);
      if (!byKey?.nametag || !isBindingOf(byKey, creator)) return null;
      // Canonical, and only in the format a nametag is registered in: a name
      // that merely renders like another — an invisible character, say — is a
      // different name, and whoever published it may well own it.
      const nametag = normalizeNametag(byKey.nametag);
      if (!isValidNametag(nametag)) return null;
      const byName = await sphere.resolve(`@${nametag}`);
      return isBindingOf(byName, creator) ? nametag : null;
    },
    enabled: !!sphere && isChainPubkey(creator),
    // Unlike the reading, a binding can appear later.
    staleTime: 5 * 60_000,
    retry: false,
  });
  return query.data ?? null;
}

function CopyKeyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyToClipboard(value)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 text-xs text-neutral-400 hover:text-orange-400">
      {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/** The key whose signature over this token verifies — the only key presented as the creator, or given a name. */
function VerifiedCreator({ creator }: { creator: string }) {
  const nametag = useCreatorNametag(creator);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className={LABEL}>Creator</span>
        <CopyKeyButton value={creator} />
      </div>
      <div className="flex min-w-0 items-baseline gap-2 text-sm">
        {nametag !== null && <span className="truncate font-medium text-white">{`@${nametag}`}</span>}
        <span className="font-mono text-xs text-neutral-300" title={creator}>
          {shortPubkey(creator)}
        </span>
      </div>
    </div>
  );
}

/**
 * The key an unverifiable signature names. A copy carries its original's creator
 * field verbatim, so the key proves nothing: labelled a claim, never resolved to
 * a name, and styled as plain data rather than authorship.
 */
function ClaimedCreator({ creator }: { creator: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className={LABEL}>Claimed creator (not verified)</span>
        <CopyKeyButton value={creator} />
      </div>
      <div className="font-mono text-xs text-neutral-500" title={creator}>
        {shortPubkey(creator)}
      </div>
    </div>
  );
}

function SignatureLine({ status }: { status: NftSignatureStatus }) {
  if (status === 'valid') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-emerald-400">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        Signed by its creator
      </p>
    );
  }
  if (status === 'invalid') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-red-400">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
        Creator signature does not verify — this may be a copy
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-xs text-neutral-400">
      <ShieldQuestionMark className="h-3.5 w-3.5 shrink-0" />
      Unsigned — anyone could mint an identical token
    </p>
  );
}

function Attributes({ attributes }: { attributes: readonly NftAttribute[] }) {
  return (
    <div>
      <div className={`mb-1 ${LABEL}`}>Attributes</div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-black/40 p-2 text-xs">
        {attributes.map((attribute, i) => (
          // Index keys: trait names are the minter's and may repeat.
          <Fragment key={i}>
            <dt className="break-words text-neutral-400">{attribute.trait_type}</dt>
            <dd className="break-words text-neutral-200">{String(attribute.value)}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}

/** The format puts no scheme restriction on external_url, so only an https one becomes a link. */
function ExternalUrl({ url }: { url: string }) {
  return (
    <div>
      <div className={`mb-1 ${LABEL}`}>External link</div>
      {isHttpsUrl(url) ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex max-w-full items-center gap-1 text-sm break-all text-orange-400 hover:underline"
        >
          {url}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      ) : (
        <p className="text-sm break-all text-neutral-300">{url}</p>
      )}
    </div>
  );
}

/**
 * A coinless token's NFT reading (#785) for the token detail view. Every string
 * in it is chosen by whoever minted the token, so all of it renders as plain
 * text; media renders only through NftMediaView's checks.
 */
export function NftDetails({ nft, fallbackTitle }: NftDetailsProps) {
  const metadata = nft.content.kind === 'metadata' ? nft.content : null;
  const title = metadata?.name ?? fallbackTitle;
  const media = nftThumbnailRef(nft);

  return (
    <section aria-label="NFT" className="mb-4 space-y-3">
      {media && <NftMediaView media={media} alt={title} variant="full" />}
      {metadata?.animation_url && <NftMediaView media={metadata.animation_url} alt={title} variant="full" />}
      {metadata && (
        <div>
          <h3 className="text-base font-semibold break-words">{metadata.name}</h3>
          {metadata.collection && <p className="text-xs break-words text-neutral-400">{metadata.collection}</p>}
        </div>
      )}
      {metadata?.description && (
        <p className="text-sm whitespace-pre-wrap break-words text-neutral-200">{metadata.description}</p>
      )}
      {metadata && metadata.attributes.length > 0 && <Attributes attributes={metadata.attributes} />}
      {metadata?.external_url && <ExternalUrl url={metadata.external_url} />}
      {nft.creator !== null && nft.signature === 'valid' && <VerifiedCreator creator={nft.creator} />}
      {nft.creator !== null && nft.signature === 'invalid' && <ClaimedCreator creator={nft.creator} />}
      <SignatureLine status={nft.signature} />
    </section>
  );
}
