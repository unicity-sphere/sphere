import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTokenData } from '../../../../sdk/hooks';
import { copyToClipboard } from '../../../../utils/copyToClipboard';

export interface TokenDataTarget {
  tokenId: string;
  label: string;
  /** Token CLASS for a coinless token; absent for a coin token. */
  tokenType?: string;
}

interface TokenDataModalProps {
  target: TokenDataTarget | null;
  onClose: () => void;
}

function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyToClipboard(value)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-neutral-400">{label}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-orange-400"
        >
          {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="max-h-40 overflow-auto rounded-lg bg-black/40 p-2 font-mono text-[11px] break-all text-neutral-200">
        {value}
      </div>
    </div>
  );
}

/**
 * Shows a token's raw GENESIS payload as hex, for both kinds.
 *
 * The same bytes mean different things by kind and that is the point: a
 * coinless token's payload is whatever its minter wrote, while a coin token's
 * is the value envelope — so pasting the hex into a CBOR parser shows the coin
 * amounts. Rendering it raw rather than decoding keeps this honest about what
 * is actually stored, and works for payloads this wallet has no schema for.
 */
export function TokenDataModal({ target, onClose }: TokenDataModalProps) {
  const { hex, byteLength, isLoading, error } = useTokenData(target?.tokenId ?? null);

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-lg rounded-2xl bg-neutral-900 p-5 text-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="truncate text-lg font-semibold">{target.label}</h2>
              <button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <CopyableField label="Token ID" value={target.tokenId} />
            {target.tokenType !== undefined && (
              <CopyableField label="Token type (class)" value={target.tokenType} />
            )}

            {isLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-neutral-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Reading genesis data…
              </div>
            ) : error ? (
              <p className="py-3 text-sm text-red-400">{error.message}</p>
            ) : hex === '' || hex === null ? (
              <p className="py-3 text-sm text-neutral-400">This token carries no genesis data.</p>
            ) : (
              <>
                <CopyableField label={`Genesis data — ${String(byteLength)} bytes, CBOR`} value={hex} />
                <p className="text-xs text-neutral-500">
                  Paste the hex into any CBOR decoder to read it.
                  {target.tokenType === undefined && ' For a coin token this is the value envelope.'}
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
