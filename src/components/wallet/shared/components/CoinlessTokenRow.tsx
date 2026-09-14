import { motion } from 'framer-motion';
import type { CoinlessToken, NftView } from '@unicitylabs/sphere-sdk';
import { Image as ImageIcon, Copy, CheckCircle2, Loader2, Send, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useState, memo } from 'react';
import { copyToClipboard } from '../../../../utils/copyToClipboard';
import { NftMediaView } from '../nft/NftMediaView';
import { nftThumbnailRef, nftTitle } from '../nft/nftDisplay';

interface CoinlessTokenRowProps {
  token: CoinlessToken;
  /** The token's genesis payload read as an NFT (#785). Absent while it loads, or when it is not one. */
  nft?: NftView;
  delay: number;
  isNew?: boolean;
  onSend?: (token: CoinlessToken) => void;
  /** Open the raw genesis payload. Omit to render the row uninspectable. */
  onInspect?: (token: CoinlessToken) => void;
}

// Every field the render branches on must be compared here, or a change to it
// alone is swallowed and the Send action keeps reflecting the old value.
// `nft` compares by identity: a reading is immutable, and useNfts hands out
// the same object until its query changes.
function areEqual(prev: CoinlessTokenRowProps, next: CoinlessTokenRowProps): boolean {
  return (
    prev.token.tokenId === next.token.tokenId &&
    prev.token.tokenType === next.token.tokenType &&
    prev.token.transferring === next.token.transferring &&
    prev.token.suspectedSpent === next.token.suspectedSpent &&
    prev.token.name === next.token.name &&
    prev.token.iconUrl === next.token.iconUrl &&
    prev.token.createdAt === next.token.createdAt &&
    prev.nft === next.nft &&
    prev.isNew === next.isNew &&
    prev.delay === next.delay &&
    prev.onSend === next.onSend &&
    prev.onInspect === next.onInspect
  );
}

const PILL = 'text-[10px] font-bold px-2 py-0.5 rounded-md';

/**
 * A holding that names no coin. There is no amount and no decimals to show — the
 * token IS the thing. An UNRECOGNISED type still renders: the registry supplies a
 * display name, never permission to show the token, so an unknown one falls back
 * to its type and stays fully usable.
 *
 * An NFT reading's name, collection and media are attacker-chosen: they render
 * as plain text, and media only through NftMediaView's checks.
 */
export const CoinlessTokenRow = memo(function CoinlessTokenRow({
  token,
  nft,
  delay,
  isNew = true,
  onSend,
  onInspect,
}: CoinlessTokenRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (await copyToClipboard(token.tokenId)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const className =
    'p-3 rounded-xl bg-neutral-50 dark:bg-[rgba(255,255,255,0.03)] hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.05)] transition-all group' +
    (onInspect ? ' cursor-pointer' : '');
  const rowProps = onInspect
    ? {
        onClick: () => { onInspect(token); },
        role: 'button' as const,
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onInspect(token); }
        },
      }
    : {};

  const title = nftTitle(token, nft);
  const thumbnail = nftThumbnailRef(nft);
  const collection = nft?.content.kind === 'metadata' ? nft.content.collection : null;

  const content = (
    <div className="flex items-center justify-between gap-2">
      {/* min-w-0 down to the text: a long NFT name truncates instead of pushing the actions off the row. */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-10 h-10 shrink-0 rounded-lg flex items-center justify-center overflow-hidden bg-neutral-200/50 dark:bg-white/5">
          {thumbnail ? (
            <NftMediaView media={thumbnail} alt={title} variant="thumb" />
          ) : token.iconUrl ? (
            <img src={token.iconUrl} alt={title} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-neutral-900 dark:text-[#fefefe] font-medium text-sm truncate">
            {title}
          </div>
          {collection && (
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
              {collection}
            </div>
          )}
          <div
            className="flex items-center gap-1 text-[10px] text-neutral-500 font-mono cursor-pointer hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
            onClick={handleCopyId}
          >
            <span>ID: {token.tokenId.slice(0, 8)}...</span>
            {copied ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {/* Same rule as the coin row: in-flight or #625-demoted is not spendable,
            so the action is withheld rather than offered and refused. */}
        {onSend && !token.transferring && token.suspectedSpent !== true && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSend(token);
            }}
            aria-label="Send this token"
            title="Send this token"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            {/* The creator's signature binds this token's id, so a copy of someone
                else's NFT cannot carry a valid one. Unsigned claims nothing. */}
            {nft?.signature === 'valid' && (
              <span className={`${PILL} bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-1`}>
                <ShieldCheck className="w-2.5 h-2.5" />
                Verified
              </span>
            )}
            {nft?.signature === 'invalid' && (
              <span className={`${PILL} bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-1`}>
                <ShieldAlert className="w-2.5 h-2.5" />
                Invalid signature
              </span>
            )}
            {token.transferring ? (
              <span className={`${PILL} bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center gap-1`}>
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Sending
              </span>
            ) : (
              <span className={`${PILL} bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400`}>
                NFT
              </span>
            )}
          </div>
          <span
            className="text-[10px] text-neutral-400 dark:text-[rgba(255,255,255,0.28)]"
            style={{ fontFamily: "'Geist Mono', 'SF Mono', 'Fira Code', monospace" }}
          >
            {new Date(token.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );

  if (!isNew) {
    return <div className={className} {...rowProps}>{content}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={className}
      {...rowProps}
    >
      {content}
    </motion.div>
  );
}, areEqual);
