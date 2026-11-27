import { memo, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatInteger } from '../../../modules/network-status/format';
import { certificateStructure, proofStructure, type StructureNode, type StructureView } from '../../../modules/network-status/structure/schema';
import { CopyButton } from './HashValue';

/**
 * Every CBOR element of a certificate or proof, behind a toggle. Built once per open and per
 * value, so the page's own refreshes don't re-decode it.
 */
export function StructureToggle({ label, kind, hex }: { label: string; kind: 'certificate' | 'proof'; hex: string }) {
  const [open, setOpen] = useState(false);
  const view = useMemo(() => (open ? (kind === 'certificate' ? certificateStructure(hex) : proofStructure(hex)) : null), [open, kind, hex]);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-xs text-neutral-500 hover:text-orange-500 dark:text-white/45 dark:hover:text-brand-orange transition-colors"
      >
        {open ? 'Hide structure' : 'Show structure'}
      </button>
      {view && <StructureTree view={view} label={label} />}
    </div>
  );
}

const StructureTree = memo(function StructureTree({ view, label }: { view: StructureView; label: string }) {
  const { root, size, trailing, mismatches } = view;
  return (
    <div className="mt-2 rounded-lg bg-white dark:bg-black/40 border border-neutral-200 dark:border-white/[0.06]">
      <p className="px-2.5 py-1.5 border-b border-neutral-200 dark:border-white/[0.06] text-[11px] font-mono text-neutral-500 dark:text-white/45">
        {label} · {formatInteger(size)} bytes ·{' '}
        {mismatches === 0 ? (
          <span>matches the schema</span>
        ) : (
          <span className="text-red-600 dark:text-red-300">
            {mismatches} mismatch{mismatches === 1 ? '' : 'es'}
          </span>
        )}
        {trailing > 0 && (
          <span className="text-red-600 dark:text-red-300">
            {' '}
            · ✗ {formatInteger(trailing)} trailing byte{trailing === 1 ? '' : 's'} after the last element
          </span>
        )}
      </p>
      <div className="max-h-[28rem] overflow-auto p-1.5">
        {root ? (
          <ul>
            <Node node={root} />
          </ul>
        ) : (
          <p className="px-1 text-xs text-neutral-500 dark:text-white/45">No bytes.</p>
        )}
      </div>
    </div>
  );
});

function Node({ node }: { node: StructureNode }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const title = node.name ?? node.label ?? node.type;
  const longValue = node.value !== null && node.value.length > 24;

  return (
    <li>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded px-1 py-0.5 font-mono text-[11px] leading-5 hover:bg-neutral-100 dark:hover:bg-white/[0.03]">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
            className="self-center -ml-0.5 shrink-0 rounded text-neutral-400 hover:text-orange-500 dark:text-white/35 dark:hover:text-brand-orange"
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} aria-hidden="true" />
          </button>
        ) : (
          <span className="w-3.5 shrink-0" aria-hidden="true" />
        )}
        {node.label && <span className="text-neutral-400 dark:text-white/35 break-all">{node.label}</span>}
        {node.name && <span className="text-neutral-900 dark:text-white/90">{node.name}</span>}
        <span className="text-neutral-500 dark:text-white/40">{node.type}</span>
        {node.value !== null && !longValue && <span className="text-neutral-800 dark:text-white/85 break-all">{node.value}</span>}
        {node.note && <span className="text-sky-700 dark:text-sky-300/80">{node.note}</span>}
        <span className="ml-auto pl-2 text-[10px] text-neutral-400 dark:text-white/30 whitespace-nowrap" title="Byte offset and length">
          @{node.offset} · {node.length} B
        </span>
        {longValue && (
          <span className="basis-full flex items-start gap-1.5 pl-5">
            <span className="min-w-0 text-neutral-800 dark:text-white/85 break-all">{node.value}</span>
            {node.copy && <CopyButton text={node.copy} label={`Copy ${title}`} />}
          </span>
        )}
        {node.mismatch && (
          <span className="basis-full pl-5 text-red-600 dark:text-red-300">
            <span aria-hidden="true">✗ </span>
            {node.mismatch}
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <ul className="ml-[0.6rem] pl-2 border-l border-neutral-200 dark:border-white/[0.07]">
          {node.children.map((child, i) => (
            <Node key={i} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}
