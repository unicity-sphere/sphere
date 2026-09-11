import { motion } from 'framer-motion';
import type { CoinlessToken } from '@unicitylabs/sphere-sdk';
import { Image as ImageIcon, Copy, CheckCircle2, Loader2, Send } from 'lucide-react';
import { useState, memo } from 'react';
import { copyToClipboard } from '../../../../utils/copyToClipboard';

interface CoinlessTokenRowProps {
  token: CoinlessToken;
  delay: number;
  isNew?: boolean;
  onSend?: (token: CoinlessToken) => void;
}

function areEqual(prev: CoinlessTokenRowProps, next: CoinlessTokenRowProps): boolean {
  return (
    prev.token.tokenId === next.token.tokenId &&
    prev.token.transferring === next.token.transferring &&
    prev.token.name === next.token.name &&
    prev.token.iconUrl === next.token.iconUrl &&
    prev.isNew === next.isNew &&
    prev.delay === next.delay
  );
}

/**
 * A holding that names no coin. There is no amount and no decimals to show — the
 * token IS the thing. An UNRECOGNISED type still renders: the registry supplies a
 * display name, never permission to show the token, so an unknown one falls back
 * to its type and stays fully usable.
 */
export const CoinlessTokenRow = memo(function CoinlessTokenRow({
  token,
  delay,
  isNew = true,
  onSend,
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
    'p-3 rounded-xl bg-neutral-50 dark:bg-[rgba(255,255,255,0.03)] hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.05)] transition-all group';

  const title = token.name || (token.tokenType ? `Type ${token.tokenType.slice(0, 8)}…` : 'Unknown type');

  const content = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-neutral-200/50 dark:bg-white/5">
          {token.iconUrl ? (
            <img src={token.iconUrl} alt={title} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-neutral-900 dark:text-[#fefefe] font-medium text-sm truncate">
            {title}
          </div>
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
      <div className="flex items-center gap-2">
        {onSend && !token.transferring && (
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
          {token.transferring ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              Sending
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
              NFT
            </span>
          )}
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
    return <div className={className}>{content}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={className}
    >
      {content}
    </motion.div>
  );
}, areEqual);
