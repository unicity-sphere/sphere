import { useEffect, useRef, useState } from 'react';
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import type { Column, NetworkSnapshot, RoundStore } from '../../modules/network-status/roundStore';
import type { FeedSource, RoundSummary } from '../../modules/network-status/types';
import { explorerBlockUrl, formatInteger, formatSealTime } from '../../modules/network-status/format';
import { ClockEstimator } from '../../modules/network-status/clock';
import { statusColor, type NetworkPalette } from './palette';

/**
 * The round matrix and heartbeat: one canvas, one time axis.
 *
 * Every column is one certified root round, placed by its blocks' own
 * timestamp, so the spacing IS the round time. Rows: one dot per root (its
 * signature in that round's seal), then one cell per shard (its block in that
 * round). Under them, the heartbeat beats once per certified round, taller
 * when the round carried commitments.
 *
 * Nothing moves except on data: a column appears because a round was sealed.
 * Hovering pauses the scroll so a round can be inspected; leaving resumes it.
 */

const PAD_TOP = 10;
const ROOT_ROW = 14;
const SECTION_GAP = 14;
const SHARD_ROW = 18;
const CELL = 12;
const HEART_GAP = 18;
const HEART_H = 84;
const PAD_BOTTOM = 6;
const RIGHT_PAD = 18;
const SIGHTING_WINDOW_MS = 8_000;

function beatCanvasHeight(roots: number, shards: number): number {
  return PAD_TOP + Math.max(roots, 1) * ROOT_ROW + SECTION_GAP + Math.max(shards, 1) * SHARD_ROW + HEART_GAP + HEART_H + PAD_BOTTOM;
}

interface Hover {
  readonly column: Column;
  readonly row: { kind: 'root'; id: string } | { kind: 'shard'; shardId: string } | { kind: 'heart' };
  readonly x: number;
  readonly y: number;
}

interface BeatCanvasProps {
  readonly store: RoundStore;
  readonly snapshot: NetworkSnapshot;
  readonly network: NetworkType;
  readonly source: FeedSource | null;
  readonly palette: NetworkPalette;
  readonly reducedMotion: boolean;
}

export function BeatCanvas({ store, snapshot, network, source, palette, reducedMotion }: BeatCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHoverState] = useState<Hover | null>(null);
  const hoverRef = useRef<Hover | null>(null);
  const pausedAt = useRef<number | null>(null);
  const setHover = (next: Hover | null) => {
    hoverRef.current = next;
    setHoverState(next);
  };
  const layoutRef = useRef<{ drawNow: number; pxPerMs: number; right: number; rootIds: string[]; shardIds: string[] }>({
    drawNow: 0,
    pxPerMs: 0.02,
    right: 0,
    rootIds: [],
    shardIds: [],
  });

  const rootCount = Math.max(snapshot.roots.length, 4);
  const shardCount = snapshot.shards.length;
  const height = beatCanvasHeight(rootCount, shardCount);
  const gutter = width < 520 ? 52 : 92;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The draw loop: reads the store directly, never through React state.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const plotWidth = width - gutter;
    canvas.width = Math.floor(plotWidth * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${plotWidth}px`;
    canvas.style.height = `${height}px`;

    const clock = new ClockEstimator(SIGHTING_WINDOW_MS);
    const lagMs = source === 'status-endpoint' ? 2_300 : 1_500;
    const pxPerMs = (plotWidth < 480 ? 14 : 20) / 1000;
    let raf = 0;

    const frame = () => {
      const now = performance.now();
      const snap = store.getSnapshot();
      const latest = snap.columns.at(-1);
      if (latest) clock.observe(latest.rootRound, latest.createdAt, now);
      const offset = clock.offset(now);

      const live = offset === null ? 0 : now + offset - lagMs;
      const drawNow = pausedAt.current ?? (reducedMotion && latest ? latest.createdAt + 200 : live);
      const rootIds = snap.roots.map((r) => r.id);
      const shardIds = snap.shards.map((s) => s.shardId);
      layoutRef.current = { drawNow, pxPerMs, right: plotWidth - RIGHT_PAD, rootIds, shardIds };

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, plotWidth, height);
      draw(ctx, snap.columns, {
        drawNow,
        pxPerMs,
        width: plotWidth,
        rootIds,
        shardIds,
        rootRows: rootCount,
        palette,
        hover: hoverRef.current,
        sessionStart: snap.session.length === 0 || snap.columns[0]?.rootRound === snap.session[0].rootRound,
      });

      // Reduced motion: redraw on data only, never as a continuous animation.
      if (!reducedMotion) raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    const redraw = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    };
    redrawRef.current = reducedMotion ? redraw : () => undefined;
    const offStore = reducedMotion ? store.subscribe(redraw) : () => undefined;
    return () => {
      cancelAnimationFrame(raf);
      offStore();
      redrawRef.current = () => undefined;
    };
  }, [store, width, height, gutter, palette, reducedMotion, source, rootCount]);

  const redrawRef = useRef<() => void>(() => undefined);

  const locate = (x: number, y: number): Hover | null => {
    const { drawNow, pxPerMs, right, rootIds, shardIds } = layoutRef.current;
    const columns = store.getSnapshot().columns;
    let best: Column | null = null;
    let bestDistance = Infinity;
    for (const column of columns) {
      const cx = right - (drawNow - column.createdAt) * pxPerMs;
      const d = Math.abs(cx - x);
      if (d < bestDistance) {
        bestDistance = d;
        best = column;
      }
    }
    if (!best || bestDistance > 12) return null;
    const cx = right - (drawNow - best.createdAt) * pxPerMs;
    const rootsTop = PAD_TOP;
    const shardsTop = rootsTop + rootCount * ROOT_ROW + SECTION_GAP;
    const heartTop = shardsTop + shardIds.length * SHARD_ROW + HEART_GAP;
    if (y >= rootsTop && y < rootsTop + rootIds.length * ROOT_ROW) {
      return { column: best, row: { kind: 'root', id: rootIds[Math.floor((y - rootsTop) / ROOT_ROW)] }, x: cx, y };
    }
    if (y >= shardsTop && y < shardsTop + shardIds.length * SHARD_ROW) {
      return { column: best, row: { kind: 'shard', shardId: shardIds[Math.floor((y - shardsTop) / SHARD_ROW)] }, x: cx, y };
    }
    if (y >= heartTop - 8) return { column: best, row: { kind: 'heart' }, x: cx, y };
    return null;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (pausedAt.current === null) pausedAt.current = layoutRef.current.drawNow;
    setHover(locate(x, y));
    redrawRef.current();
  };

  const onPointerLeave = () => {
    pausedAt.current = null;
    setHover(null);
    redrawRef.current();
  };

  const onClick = () => {
    if (hover?.row.kind !== 'shard') return;
    const cell = hover.column.cells.get(hover.row.shardId);
    if (cell) window.open(explorerBlockUrl(network, cell.shardId, cell.index), '_blank', 'noopener,noreferrer');
  };

  const latest = snapshot.columns.at(-1);
  const label = latest
    ? `Certified rounds, scrolling. Latest root round ${formatInteger(latest.rootRound)}: ${latest.cells.size} of ${shardCount} shards, ${latest.signers.length} of ${snapshot.roots.length} roots signed.`
    : 'Waiting for the first certified round.';

  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      <RowLabels snapshot={snapshot} gutter={gutter} rootRows={rootCount} palette={palette} />
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className={`absolute top-0 ${hover?.row.kind === 'shard' && hover.column.cells.has(hover.row.shardId) ? 'cursor-pointer' : 'cursor-crosshair'}`}
        style={{ left: gutter }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onClick={onClick}
      />
      {hover && <BeatTooltip hover={hover} snapshot={snapshot} gutter={gutter} plotWidth={width - gutter} />}
      {hover && (
        <div className="absolute right-2 -top-7 text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-white/40">
          Paused — move away to resume
        </div>
      )}
    </div>
  );
}

interface DrawOptions {
  readonly drawNow: number;
  readonly pxPerMs: number;
  readonly width: number;
  readonly rootIds: readonly string[];
  readonly shardIds: readonly string[];
  readonly rootRows: number;
  readonly palette: NetworkPalette;
  readonly hover: Hover | null;
  /** The oldest column is the start of this page's history (nothing was evicted yet). */
  readonly sessionStart: boolean;
}

function draw(ctx: CanvasRenderingContext2D, columns: readonly Column[], o: DrawOptions): void {
  const { drawNow, pxPerMs, width, rootIds, shardIds, palette } = o;
  const right = width - RIGHT_PAD;
  const rootsTop = PAD_TOP;
  const shardsTop = rootsTop + o.rootRows * ROOT_ROW + SECTION_GAP;
  const heartTop = shardsTop + shardIds.length * SHARD_ROW + HEART_GAP;
  const baseline = heartTop + HEART_H * 0.7;
  const xOf = (c: Column) => right - (drawNow - c.createdAt) * pxPerMs;

  // The "now" edge: where certified rounds land.
  const edge = ctx.createLinearGradient(right - 60, 0, right + 8, 0);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, palette.goodGlow);
  ctx.fillStyle = edge;
  ctx.globalAlpha = 0.12;
  ctx.fillRect(right - 60, 0, 68, heartTop + HEART_H);
  ctx.globalAlpha = 1;

  // Faint row rails.
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i < shardIds.length; i++) {
    const y = Math.round(shardsTop + i * SHARD_ROW + SHARD_ROW / 2) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, Math.round(baseline) + 0.5);
  ctx.lineTo(width, Math.round(baseline) + 0.5);
  ctx.stroke();

  const visible = columns.filter((c) => {
    const x = xOf(c);
    return x > -CELL && x < width + CELL;
  });
  const maxCommitments = Math.max(1, ...visible.map((c) => c.totalCommitments));
  const maxCell = Math.max(1, ...visible.flatMap((c) => [...c.cells.values()].map((r) => r.totalCommitments)));

  for (const column of visible) {
    const x = xOf(column);
    const fresh = clamp01(1 - (right - x) / 70) * (x <= right + 1 ? 1 : 0);
    const hovered = o.hover?.column.rootRound === column.rootRound;

    if (hovered) {
      ctx.fillStyle = palette.grid;
      ctx.fillRect(x - CELL / 2 - 3, rootsTop - 4, CELL + 6, heartTop + HEART_H - rootsTop);
    }

    // Root signatures.
    for (let i = 0; i < rootIds.length; i++) {
      const y = rootsTop + i * ROOT_ROW + ROOT_ROW / 2;
      const signed = column.signers.includes(rootIds[i]);
      ctx.beginPath();
      ctx.arc(x, y, signed ? 3.2 : 3, 0, Math.PI * 2);
      if (signed) {
        ctx.fillStyle = palette.good;
        ctx.globalAlpha = 0.55 + 0.45 * fresh;
        ctx.shadowColor = palette.goodGlow;
        ctx.shadowBlur = 6 * fresh;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = palette.bad;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }

    // Shard cells.
    for (let i = 0; i < shardIds.length; i++) {
      const y = shardsTop + i * SHARD_ROW + (SHARD_ROW - CELL) / 2;
      const cell = column.cells.get(shardIds[i]);
      const left = x - CELL / 2;
      if (cell) {
        roundRect(ctx, left, y, CELL, CELL, 3);
        if (cell.totalCommitments > 0) {
          const intensity = 0.45 + 0.55 * (Math.log1p(cell.totalCommitments) / Math.log1p(maxCell));
          ctx.fillStyle = palette.activity;
          ctx.globalAlpha = intensity;
          ctx.shadowColor = palette.activityGlow;
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = palette.cellEmpty;
          ctx.fill();
          ctx.strokeStyle = fresh > 0 ? mix(palette.cellEmptyStroke, palette.good, fresh) : palette.cellEmptyStroke;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else if (column.missed.has(shardIds[i])) {
        ctx.strokeStyle = palette.bad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(left + 3, y + 3);
        ctx.lineTo(left + CELL - 3, y + CELL - 3);
        ctx.moveTo(left + CELL - 3, y + 3);
        ctx.lineTo(left + 3, y + CELL - 3);
        ctx.stroke();
      }
    }
  }

  // Where this page's history begins, when that is inside the view.
  const oldest = columns[0];
  if (oldest && o.sessionStart) {
    const x = xOf(oldest);
    const label = 'history starts when you open the page →';
    ctx.font = '10px "Geist Mono", ui-monospace, monospace';
    if (x - 14 - ctx.measureText(label).width > 0) {
      ctx.fillStyle = palette.inkFaint;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x - 14, shardsTop + (shardIds.length * SHARD_ROW) / 2);
      ctx.textAlign = 'start';
    }
  }

  // Heartbeat: one beat per certified round.
  const trace = ctx.createLinearGradient(0, 0, right, 0);
  trace.addColorStop(0, 'rgba(0,0,0,0)');
  trace.addColorStop(0.25, palette.goodGlow);
  trace.addColorStop(1, palette.good);
  ctx.strokeStyle = trace;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = palette.goodGlow;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, baseline);
  const beats: { x: number; amp: number; column: Column }[] = [];
  for (const column of visible) {
    const x = xOf(column);
    if (x > right) continue;
    const amp = 14 + (column.totalCommitments > 0 ? 12 + 44 * (Math.log1p(column.totalCommitments) / Math.log1p(maxCommitments)) : 0);
    beats.push({ x, amp, column });
    ctx.lineTo(x - 7, baseline);
    ctx.lineTo(x - 4, baseline + 3);
    ctx.lineTo(x - 1.2, baseline - amp);
    ctx.lineTo(x + 1.6, baseline + amp * 0.26);
    ctx.lineTo(x + 4.5, baseline);
  }
  ctx.lineTo(right, baseline);
  ctx.stroke();
  ctx.shadowBlur = 0;

  for (const beat of beats) {
    if (beat.column.totalCommitments === 0) continue;
    ctx.beginPath();
    ctx.arc(beat.x - 1.2, baseline - beat.amp, 3, 0, Math.PI * 2);
    ctx.fillStyle = palette.activity;
    ctx.shadowColor = palette.activityGlow;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // The pen: pulses as each round lands.
  const newest = beats.at(-1);
  const pulse = newest ? clamp01(1 - (right - newest.x) / 50) : 0;
  ctx.beginPath();
  ctx.arc(right, baseline, 3, 0, Math.PI * 2);
  ctx.fillStyle = palette.good;
  ctx.fill();
  if (pulse > 0) {
    ctx.beginPath();
    ctx.arc(right, baseline, 3 + 10 * (1 - pulse), 0, Math.PI * 2);
    ctx.strokeStyle = palette.good;
    ctx.globalAlpha = pulse * 0.8;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function RowLabels({ snapshot, gutter, rootRows, palette }: { snapshot: NetworkSnapshot; gutter: number; rootRows: number; palette: NetworkPalette }) {
  const narrow = gutter < 80;
  const shardsTop = PAD_TOP + rootRows * ROOT_ROW + SECTION_GAP;
  const heartTop = shardsTop + snapshot.shards.length * SHARD_ROW + HEART_GAP;
  const latest = snapshot.columns.at(-1);
  return (
    <div className="absolute left-0 top-0 font-mono text-[10px] leading-none" style={{ width: gutter }} aria-hidden="true">
      {snapshot.roots.map((root, i) => {
        const signed = latest ? latest.signers.includes(root.id) : null;
        return (
          <div key={root.id} className="absolute flex items-center gap-1.5 text-neutral-500 dark:text-white/45" style={{ top: PAD_TOP + i * ROOT_ROW, height: ROOT_ROW }} title={root.id}>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: signed === false ? palette.bad : palette.good }} />
            {narrow ? root.shortId.slice(-4) : `root ${root.shortId}`}
          </div>
        );
      })}
      {snapshot.shards.map((shard, i) => (
        <div key={shard.shardId} className="absolute flex items-center gap-1.5 text-neutral-700 dark:text-white/70 text-[11px]" style={{ top: shardsTop + i * SHARD_ROW, height: SHARD_ROW }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: statusColor(shard.status, palette) }} />
          {narrow ? `S${shard.displayId}` : `Shard ${shard.displayId}`}
        </div>
      ))}
      <div className="absolute uppercase tracking-wider text-neutral-500 dark:text-white/40" style={{ top: heartTop + HEART_H * 0.7 - 5 }}>
        {narrow ? 'Beat' : 'Heartbeat'}
      </div>
    </div>
  );
}

function BeatTooltip({ hover, snapshot, gutter, plotWidth }: { hover: Hover; snapshot: NetworkSnapshot; gutter: number; plotWidth: number }) {
  const { column, row } = hover;
  const flip = hover.x > plotWidth - 220;
  const style: React.CSSProperties = {
    top: Math.max(0, hover.y - 20),
    left: flip ? undefined : gutter + hover.x + 14,
    right: flip ? plotWidth - hover.x + 14 : undefined,
  };
  let detail: React.ReactNode;
  if (row.kind === 'shard') {
    const shard = snapshot.shards.find((s) => s.shardId === row.shardId);
    const cell: RoundSummary | undefined = column.cells.get(row.shardId);
    detail = cell ? (
      <>
        <Line strong={formatInteger(cell.totalCommitments)} label={cell.totalCommitments === 1 ? 'commitment' : 'commitments'} />
        <Line strong={`#${formatInteger(cell.index)}`} label={`block, shard ${shard?.displayId ?? row.shardId}`} />
        <div className="mt-1.5 text-[10px] text-orange-500 dark:text-brand-orange">Click to open in SMT explorer ↗</div>
      </>
    ) : column.missed.has(row.shardId) ? (
      <div className="text-red-500 dark:text-red-400">Shard {shard?.displayId} has no block in this round</div>
    ) : (
      <div className="text-neutral-500 dark:text-white/50">Shard {shard?.displayId}: block not fetched</div>
    );
  } else if (row.kind === 'root') {
    const signed = column.signers.includes(row.id);
    detail = (
      <div className={signed ? '' : 'text-red-500 dark:text-red-400'}>
        Root …{row.id.slice(-6)} {signed ? 'signed this round' : 'did not sign this round'}
      </div>
    );
  } else {
    detail = <Line strong={formatInteger(column.totalCommitments)} label="commitments, all shards" />;
  }
  return (
    <div
      className="absolute z-20 pointer-events-none min-w-[190px] rounded-lg border border-neutral-200 dark:border-white/10 bg-white/95 dark:bg-[#111]/95 backdrop-blur px-3 py-2 text-xs shadow-xl"
      style={style}
    >
      <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 dark:text-white/45 mb-1">
        Root round {formatInteger(column.rootRound)} · sealed {formatSealTime(column.certifiedAt)} UTC
      </div>
      {detail}
      <div className="mt-1 text-[10px] text-neutral-500 dark:text-white/40">
        {column.signers.length} of {snapshot.roots.length} roots signed · {column.cells.size} of {snapshot.shards.length} shards
      </div>
    </div>
  );
}

function Line({ strong, label }: { strong: string; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-semibold text-sm text-neutral-900 dark:text-white">{strong}</span>
      <span className="text-neutral-500 dark:text-white/50">{label}</span>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Blend two CSS colours (hex or rgba) — used only for the landing highlight. */
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab, aa] = parse(a);
  const [br, bg, bb, ba] = parse(b);
  const k = clamp01(t);
  return `rgba(${Math.round(ar + (br - ar) * k)}, ${Math.round(ag + (bg - ag) * k)}, ${Math.round(ab + (bb - ab) * k)}, ${aa + (ba - aa) * k})`;
}

function parse(color: string): [number, number, number, number] {
  if (color.startsWith('#')) {
    const n = parseInt(color.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
  return [m[0], m[1], m[2], m[3] ?? 1];
}
