import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Link2, X } from 'lucide-react';
import type { BlockLink, BlockLinkState } from '../../../modules/network-status/blockLink';
import type { GatewayClient } from '../../../modules/network-status/gatewayClient';
import { formatAge, formatInteger, formatLocalTime } from '../../../modules/network-status/format';
import { displayShardId } from '../../../modules/network-status/roundStore';
import { CertificateCard } from './CertificateCard';
import { CommitmentCard } from './CommitmentCard';
import { Field, HashValue } from './HashValue';
import { useBlockCertificate, useBlockDetail, type BlockState } from './useBlockDetail';

export interface BlockModalProps {
  readonly state: BlockLinkState;
  readonly client: GatewayClient;
  /** The network's shards, for display numbers; may be empty before the page has loaded them. */
  readonly shardIds: readonly string[];
  /** The newest block of this shard the page knows of; `null` when it knows none. */
  readonly newestIndex: number | null;
  onNavigate(link: BlockLink): void;
  onClose(): void;
}

/**
 * A block, opened from the network page: what the block says, its own unicity
 * certificate verified against the trust base Sphere ships, and its commitments,
 * each expandable to its verified inclusion proof.
 */
export default function BlockModal({ state, client, shardIds, newestIndex, onNavigate, onClose }: BlockModalProps) {
  const link = state.kind === 'open' ? state.link : null;
  const [attempt, setAttempt] = useState(0);
  const block = useBlockDetail(client, link?.shardId ?? null, link?.index ?? null, attempt);
  const dialog = useRef<HTMLDivElement>(null);

  const canPrev = link !== null && link.index > 0;
  const canNext = link !== null && (newestIndex === null || link.index < newestIndex);
  const step = (delta: number) => {
    if (!link || (delta < 0 ? !canPrev : !canNext)) return;
    onNavigate({ ...link, index: link.index + delta });
  };
  const stepRef = useRef(step);
  stepRef.current = step;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Escape') closeRef.current();
      else if (event.key === 'ArrowLeft') stepRef.current(-1);
      else if (event.key === 'ArrowRight') stepRef.current(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Modal: the page behind is inert while it is open, and focus returns to whatever opened it.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const page = document.getElementById('root');
    const wasInert = page?.inert ?? false;
    if (page) page.inert = true;
    dialog.current?.focus();
    return () => {
      if (page) page.inert = wasInert;
      opener?.focus();
    };
  }, []);

  /** Tab cycles within the dialog. */
  const trapTab = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !dialog.current) return;
    const focusable = [...dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialog.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const shardNumber = link ? displayShardId(link.shardId, shardIds.length > 0 ? shardIds : [link.shardId]) : null;
  const title = link ? `Shard ${shardNumber} · Block #${formatInteger(link.index)}` : 'Can’t open this block';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <motion.div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-modal-title"
        tabIndex={-1}
        onKeyDown={trapTab}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="relative w-full sm:max-w-3xl max-h-[92dvh] sm:max-h-[88dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-neutral-200 dark:border-white/[0.09] bg-white dark:bg-neutral-950 shadow-2xl outline-none text-neutral-900 dark:text-white"
      >
        <header className="flex items-start gap-3 px-4 sm:px-6 pt-4 pb-3 border-b border-neutral-200 dark:border-white/[0.07]">
          <div className="min-w-0 flex-1">
            <h2 id="block-modal-title" className="font-mono text-base sm:text-lg font-semibold tracking-tight">
              {title}
            </h2>
            <BlockSubtitle state={block} networkLabel={link ? (link.network === 'mainnet' ? 'Mainnet' : 'Testnet') : null} />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {link && (
              <>
                <IconButton label="Previous block" disabled={!canPrev} onClick={() => step(-1)}>
                  <ChevronLeft className="w-4 h-4" />
                </IconButton>
                <IconButton label="Next block" disabled={!canNext} onClick={() => step(1)}>
                  <ChevronRight className="w-4 h-4" />
                </IconButton>
                <CopyLinkButton />
              </>
            )}
            <IconButton label="Close" onClick={onClose}>
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        </header>

        <div className="overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-5">
          {state.kind === 'invalid' && <p className="text-sm text-neutral-700 dark:text-white/75">{state.reason}</p>}
          {link && <BlockBody state={block} link={link} shardNumber={shardNumber ?? 0} client={client} onRetry={() => setAttempt((a) => a + 1)} />}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

function BlockSubtitle({ state, networkLabel }: { state: BlockState; networkLabel: string | null }) {
  if (!networkLabel) return null;
  const created = state.status === 'ready' ? state.block.createdAt : null;
  return (
    <p className="mt-0.5 text-xs text-neutral-500 dark:text-white/45">
      <span className="inline-flex items-center rounded-full border border-neutral-300 dark:border-white/15 px-2 py-px mr-2 text-[10px] font-mono uppercase tracking-wider text-neutral-600 dark:text-white/60">
        {networkLabel}
      </span>
      {created !== null && (
        <span>
          {formatLocalTime(created)} · {formatAge(Math.max(0, Date.now() - created))} ago
        </span>
      )}
    </p>
  );
}

function BlockBody({ state, link, shardNumber, client, onRetry }: { state: BlockState; link: BlockLink; shardNumber: number; client: GatewayClient; onRetry: () => void }) {
  const ready = state.status === 'ready' ? state.block : null;
  const certificate = useBlockCertificate(link.network, ready);

  if (state.status === 'loading') return <p className="text-sm text-neutral-500 dark:text-white/45">Loading block…</p>;
  if (state.status === 'missing') {
    return <p className="text-sm text-neutral-700 dark:text-white/75">{`Shard ${shardNumber} has no block #${link.index} yet.`}</p>;
  }
  if (state.status === 'error') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-neutral-700 dark:text-white/75">Couldn’t reach the gateway: {state.message}</p>
        <RetryButton onClick={onRetry} />
      </div>
    );
  }

  const { block, records } = state;
  const listed = records.status === 'loaded' ? records.list.length : null;
  return (
    <>
      <section aria-label="Block">
        <dl className="divide-y divide-neutral-200/70 dark:divide-white/[0.05]">
          <Field label="Root hash">
            <HashValue value={block.rootHash} label="root hash" />
          </Field>
          <Field label="Previous hash">
            <HashValue value={block.previousBlockHash} label="previous block hash" />
          </Field>
          <Field label="Commitments">
            <span className="font-mono text-sm">
              {formatInteger(block.totalCommitments)}
              {listed !== null && listed !== block.totalCommitments && (
                <span className="text-neutral-500 dark:text-white/45"> requests · {formatInteger(listed)} in this block’s tree</span>
              )}
            </span>
          </Field>
        </dl>
      </section>

      <CertificateCard title="Block certificate" report={certificate?.report ?? null} trust={certificate?.trust ?? null} hex={block.certificateHex} />

      <section aria-label="Commitments" className="space-y-2">
        <h3 className="text-[11px] font-mono uppercase tracking-wider text-neutral-600 dark:text-white/55">
          Commitments{listed !== null ? ` · ${formatInteger(listed)}` : ''}
        </h3>
        {records.status === 'empty' && <p className="text-sm text-neutral-500 dark:text-white/45">No commitments: this round changed nothing.</p>}
        {records.status === 'loading' && <p className="text-sm text-neutral-500 dark:text-white/45">Loading commitments…</p>}
        {records.status === 'error' && (
          <div className="space-y-2">
            <p className="text-sm text-neutral-700 dark:text-white/75">Couldn’t load the commitments: {records.message}</p>
            <RetryButton onClick={onRetry} />
          </div>
        )}
        {records.status === 'loaded' && records.list.length === 0 && (
          <p className="text-sm text-neutral-500 dark:text-white/45">No commitments are listed for this block.</p>
        )}
        {records.status === 'loaded' && records.list.length > 0 && (
          <ul className="space-y-2">
            {records.list.map((record, i) => (
              <CommitmentCard key={record.stateId} position={i + 1} record={record} blockIndex={block.index} network={link.network} client={client} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-white/55 dark:hover:text-white dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
    >
      {children}
    </button>
  );
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the address bar still holds the link.
    }
  };
  return (
    <IconButton label={copied ? 'Link copied' : 'Copy link to this block'} onClick={copy}>
      <Link2 className={`w-4 h-4 ${copied ? 'text-lime-600 dark:text-lime-400' : ''}`} />
    </IconButton>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-neutral-300 dark:border-white/15 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-white/75 dark:hover:bg-white/10 transition-colors"
    >
      Retry
    </button>
  );
}
