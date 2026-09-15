import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isValidNametag, normalizeNametag } from '@unicitylabs/sphere-sdk';
import type { NftAttribute, NftContent, NftSignatureStatus, NftView } from '@unicitylabs/sphere-sdk';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestionMark,
} from 'lucide-react';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { useResolvedNftContent, type NftDocumentState } from '../../../../sdk/hooks/payments/useNftDocument';
import { SPHERE_KEYS } from '../../../../sdk/queryKeys';
import { copyToClipboard } from '../../../../utils/copyToClipboard';
import { isChainPubkey, truncateId } from '../../../../utils/identifiers';
import { isHttpsUrl } from '../../../../utils/isHttpsUrl';
import { NftMediaView } from './NftMediaView';
import { nftContentMediaRef, shortPubkey } from './nftDisplay';

interface NftDetailsProps {
  nft: NftView;
  /** Names the media when the NFT carries no name of its own (a bare media or link NFT). */
  fallbackTitle: string;
}

interface NftContentDetailsProps {
  content: NftContent;
  /** Names the media when the content carries no name of its own (a bare media or link NFT). */
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

function CopyButton({ value }: { value: string }) {
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

/**
 * The key whose signature over this token verifies — the only key given a name.
 * A valid signature attributes the item to that key: it says who signed the item
 * for this token, not that a collection authorised it, so the key is its signer.
 */
function Signer({ creator }: { creator: string }) {
  const nametag = useCreatorNametag(creator);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className={LABEL}>Signer</span>
        <CopyButton value={creator} />
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
        <CopyButton value={creator} />
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
        Signed by this key — it attributes the item to its signer, not to a collection
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
 * The collection an item says it belongs to. Whoever writes an item can write any
 * id into it, and nothing checks membership — a valid signature included — so the
 * id is shown as the item's claim, never as a fact about the token.
 */
function CollectionId({ id }: { id: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className={LABEL}>Collection ID</span>
        <CopyButton value={id} />
      </div>
      <div className="font-mono text-xs text-neutral-300" title={id}>
        {truncateId(id)}
      </div>
      <p className="mt-0.5 text-xs text-neutral-500">Claimed by the item — not verified</p>
    </div>
  );
}

/** A metadata document that cannot be shown, yet or at all. Nothing from the file itself appears. */
function DocumentNotShown({ state }: { state: Extract<NftDocumentState, 'loading' | 'mismatch' | 'invalid'> }) {
  return (
    <div>
      <div className="overflow-hidden rounded-lg bg-black/40">
        {state === 'loading' ? (
          <div role="status" aria-label="Loading metadata" className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center">
            <ImageIcon className="h-10 w-10 text-neutral-500" />
          </div>
        )}
      </div>
      {state === 'mismatch' && (
        <p className="mt-1 text-xs text-amber-400">Metadata does not match its fingerprint — not shown</p>
      )}
      {state === 'invalid' && <p className="mt-1 text-xs text-amber-400">Linked metadata is not a valid NFT document</p>}
    </div>
  );
}

/**
 * What an NFT's content shows (#785): its media, then its metadata. Every string
 * in it is chosen by whoever wrote the content, so all of it renders as plain
 * text; media renders only through NftMediaView's checks. It says nothing about
 * who signed the token or whether that signature verifies, so it also serves a
 * mint preview, for a token that does not exist yet. Renders the parts
 * unwrapped: the caller's container spaces them.
 */
export function NftContentDetails({ content, fallbackTitle }: NftContentDetailsProps) {
  const metadata = content.kind === 'metadata' ? content : null;
  const title = metadata?.name ?? fallbackTitle;
  const media = nftContentMediaRef(content);

  return (
    <>
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
      {metadata && metadata.collection_id !== null && <CollectionId id={metadata.collection_id} />}
    </>
  );
}

/**
 * NftContentDetails with a metadata document link resolved (#785): the document's
 * item once its bytes have matched the link's fingerprint and parsed, with where it
 * is hosted. While it loads, or when it fails either check, a placeholder says so
 * and nothing from the file is shown. A document that could not be fetched at all
 * leaves the content as it is. The token detail view and the mint preview both show
 * content through it, so a hosted document is checked the same way in each.
 */
export function NftResolvedContentDetails({ content, fallbackTitle }: NftContentDetailsProps) {
  const resolved = useResolvedNftContent(content);
  const { documentState, hostedAt } = resolved;

  if (documentState === 'loading' || documentState === 'mismatch' || documentState === 'invalid') {
    return <DocumentNotShown state={documentState} />;
  }
  return (
    <>
      <NftContentDetails content={resolved.content ?? content} fallbackTitle={fallbackTitle} />
      {hostedAt && (
        <p className="text-xs break-all text-neutral-400">
          {`Metadata hosted at ${hostedAt.uri}, checked against its fingerprint`}
        </p>
      )}
    </>
  );
}

/**
 * A coinless token's NFT reading (#785) for the token detail view: its content —
 * a hosted metadata document's, once resolved — then the key that signed it and
 * whether that signature verifies. The signature is always the token's: a document
 * never carries one.
 */
export function NftDetails({ nft, fallbackTitle }: NftDetailsProps) {
  return (
    <section aria-label="NFT" className="mb-4 space-y-3">
      <NftResolvedContentDetails content={nft.content} fallbackTitle={fallbackTitle} />
      {nft.creator !== null && nft.signature === 'valid' && <Signer creator={nft.creator} />}
      {nft.creator !== null && nft.signature === 'invalid' && <ClaimedCreator creator={nft.creator} />}
      <SignatureLine status={nft.signature} />
    </section>
  );
}
