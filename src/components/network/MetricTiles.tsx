import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import type { NetworkSnapshot } from '../../modules/network-status/roundStore';
import { formatInteger, formatRate, formatSeconds, formatShare } from '../../modules/network-status/format';
import type { NetworkPalette } from './palette';

interface Tile {
  readonly label: string;
  readonly value: string;
  readonly unit: string;
  readonly sub: string;
  readonly definition: string;
  readonly tone?: 'good' | 'warn' | 'bad';
  readonly spark?: readonly number[];
}

export function MetricTiles({ snapshot, palette }: { snapshot: NetworkSnapshot; palette: NetworkPalette }) {
  const { metrics, quorum, roundsSinceOpen } = snapshot;
  const recent = snapshot.session.slice(-90);
  const signed = metrics.rootsSignedLatest;

  const tiles: Tile[] = [
    {
      label: 'Round time',
      value: formatSeconds(metrics.roundTimeMs),
      unit: 's',
      sub: 'block to block, per shard · last 60 s',
      definition:
        'Wall-clock time per round, from block timestamps. For each shard: (newest − oldest block time) ÷ blocks between them, over the last 60 s; then the median across shards. Block times are stamped when a block is proposed.',
      spark: recent.map((p) => p.roundTimeMs).filter((v): v is number => v !== null),
    },
    {
      label: 'Throughput',
      value: formatRate(metrics.commitmentsPerSecond),
      unit: 'commitments/s',
      sub: 'all shards · last 60 s',
      definition: 'Commitments in the blocks of the last 60 s, all shards, divided by the time those blocks span.',
      spark: recent.map((p) => p.commitments),
    },
    {
      label: 'Activity',
      value: formatShare(metrics.nonEmptyShare),
      unit: '% of blocks',
      sub: 'carried commitments · last 60 s',
      definition: 'Share of shard blocks in the last 60 s that carry at least one commitment. An empty block still certifies the shard’s state.',
    },
    {
      label: 'Shards',
      value: metrics.shardsTotal ? `${metrics.shardsOk}/${metrics.shardsTotal}` : '—',
      unit: 'healthy',
      sub: 'advanced in the last 15 s',
      definition:
        'Healthy: the shard’s block number advanced in the last 15 s, as seen from your browser. Stale: it answers but stopped advancing. Unreachable: requests to it have failed for 15 s.',
      tone: metrics.shardsTotal === 0 ? undefined : metrics.shardsOk === metrics.shardsTotal ? 'good' : metrics.shardsOk === 0 ? 'bad' : 'warn',
    },
    {
      label: 'Consensus',
      value: signed === null ? '—' : `${signed}/${metrics.rootsKnown}`,
      unit: 'roots signed',
      sub: quorum ? `latest round · quorum ${quorum}` : 'latest round',
      definition:
        'Signatures in the latest certified round’s unicity seal. A seal needs ⌊2n/3⌋ + 1 of the n roots. The roots listed are those seen signing since this page opened.',
      tone: signed === null ? undefined : signed === metrics.rootsKnown ? 'good' : quorum !== null && signed >= quorum ? 'warn' : 'bad',
    },
    {
      label: 'Rounds certified',
      value: formatInteger(roundsSinceOpen),
      unit: 'since you opened',
      sub: metrics.latestRootRound ? `root round #${formatInteger(metrics.latestRootRound)}` : 'waiting for the first round',
      definition:
        'Root rounds seen since this page opened that certified at least one shard. Shards are certified on their own schedules, so a root round can seal all of them or only some.',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {tiles.map((tile) => (
        <TileCard key={tile.label} tile={tile} palette={palette} />
      ))}
    </div>
  );
}

function TileCard({ tile, palette }: { tile: Tile; palette: NetworkPalette }) {
  const tone = tile.tone === 'good' ? palette.good : tile.tone === 'warn' ? palette.warn : tile.tone === 'bad' ? palette.bad : null;
  return (
    <div className="relative rounded-2xl border border-neutral-200 dark:border-white/[0.07] bg-white/80 dark:bg-black/40 backdrop-blur-md p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 dark:text-white/45">{tile.label}</span>
        <InfoPopover label={tile.label} text={tile.definition} />
      </div>
      <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
        {tone && <span className="self-center inline-block w-2 h-2 rounded-full" style={{ background: tone }} aria-hidden="true" />}
        <span className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 dark:text-white">{tile.value}</span>
        <span className="text-xs sm:text-sm text-neutral-500 dark:text-white/50">{tile.unit}</span>
      </div>
      <div className="mt-1 text-[11px] sm:text-xs text-neutral-500 dark:text-white/40">{tile.sub}</div>
      {tile.spark && tile.spark.length > 2 && new Set(tile.spark).size > 1 && <Sparkline values={tile.spark} color={palette.activity} />}
    </div>
  );
}

function Sparkline({ values, color }: { values: readonly number[]; color: string }) {
  const w = 120;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / span) * (h - 4)).toFixed(1)}`);
  return (
    <svg className="hidden sm:block absolute right-4 bottom-4 opacity-60" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const POPOVER_WIDTH = 256;
const VIEWPORT_MARGIN = 8;

/**
 * Portalled to <body> and fixed-position, clamped to the viewport: the cards'
 * backdrop blur makes them the containing block for fixed descendants, so an
 * in-place popover would be positioned and cut off by its card. Closes on
 * outside press, Escape, scroll and resize.
 */
export function InfoPopover({ label, text }: { label: string; text: string }) {
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const open = position !== null;

  const toggle = () => {
    if (open) return setPosition(null);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - 2 * VIEWPORT_MARGIN);
    const left = Math.min(Math.max(rect.right - width, VIEWPORT_MARGIN), window.innerWidth - width - VIEWPORT_MARGIN);
    setPosition({ left, top: rect.bottom + 6, width });
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setPosition(null);
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!ref.current?.contains(target) && !panelRef.current?.contains(target)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    document.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`How ${label} is measured`}
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
        className="p-1 -m-1 rounded text-neutral-400 hover:text-neutral-700 dark:text-white/30 dark:hover:text-white/70 transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {position &&
        createPortal(
          <div
            ref={panelRef}
            id={id}
            role="note"
            style={{ position: 'fixed', left: position.left, top: position.top, width: position.width }}
            className="z-50 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#141414] p-3 text-xs leading-relaxed text-neutral-700 dark:text-white/75 shadow-xl"
          >
            {text}
          </div>,
          document.body,
        )}
    </div>
  );
}
