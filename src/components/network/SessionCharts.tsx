import { useEffect, useMemo, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { NetworkSnapshot, SessionPoint } from '../../modules/network-status/roundStore';
import { formatClock } from '../../modules/network-status/format';
import type { NetworkPalette } from './palette';

const CHART_HEIGHT = 180;
const BUCKET_MS = 10_000;

/** Charts since the page opened. They redraw every 2 s, not on every round. */
export function SessionCharts({ snapshot, palette }: { snapshot: NetworkSnapshot; palette: NetworkPalette }) {
  const session = snapshot.session;
  const tick = Math.floor(snapshot.computedAt / 2_000);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh on the 2 s tick, not on every snapshot
  const roundTime = useMemo(() => roundTimeSeries(session), [tick, session.length]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- as above
  const commitments = useMemo(() => commitmentSeries(session), [tick, session.length]);
  const noCommitments = commitments[1].every((v) => v === 0);

  return (
    <div className="grid lg:grid-cols-2 gap-3">
      <ChartCard title="Round time" caption="Seconds between certified rounds, from block timestamps">
        <UPlotChart data={roundTime} palette={palette} kind="line" format={(v) => `${v.toFixed(3)} s`} />
      </ChartCard>
      <ChartCard title="Commitments" caption="All shards, per 10 seconds">
        <div className="relative">
          <UPlotChart data={commitments} palette={palette} kind="bars" format={(v) => `${Math.round(v)} commitments`} />
          {noCommitments && session.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-neutral-500 dark:text-white/40">
              No commitments since you opened this page — every round so far was empty
            </div>
          )}
        </div>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-white/[0.07] bg-white/80 dark:bg-black/40 backdrop-blur-md p-4 sm:p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</h3>
        <p className="text-xs text-neutral-500 dark:text-white/40">{caption}</p>
      </div>
      {children}
    </div>
  );
}

function roundTimeSeries(session: readonly SessionPoint[]): uPlot.AlignedData {
  const xs: number[] = [];
  const ys: (number | null)[] = [];
  for (const p of session) {
    xs.push(p.createdAt / 1000);
    ys.push(p.roundTimeMs === null ? null : p.roundTimeMs / 1000);
  }
  return [xs, ys];
}

function commitmentSeries(session: readonly SessionPoint[]): [number[], number[]] {
  const buckets = new Map<number, number>();
  for (const p of session) {
    const key = Math.floor(p.createdAt / BUCKET_MS) * BUCKET_MS;
    buckets.set(key, (buckets.get(key) ?? 0) + p.commitments);
  }
  const keys = [...buckets.keys()].sort((a, b) => a - b);
  return [keys.map((k) => k / 1000), keys.map((k) => buckets.get(k)!)];
}

interface UPlotChartProps {
  readonly data: uPlot.AlignedData;
  readonly palette: NetworkPalette;
  readonly kind: 'line' | 'bars';
  readonly format: (v: number) => string;
}

function UPlotChart({ data, palette, kind, format }: UPlotChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const plot = useRef<uPlot | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const formatRef = useRef(format);
  formatRef.current = format;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const axis: uPlot.Axis = {
      stroke: palette.inkMuted,
      grid: { stroke: palette.grid, width: 1 },
      ticks: { show: false },
      font: '11px Geist, ui-sans-serif, system-ui, sans-serif',
    };
    const tooltip = document.createElement('div');
    tooltip.className =
      'absolute z-10 pointer-events-none rounded-md border border-neutral-200 dark:border-white/10 bg-white/95 dark:bg-[#111]/95 px-2 py-1 text-xs whitespace-nowrap hidden';
    const tooltipValue = document.createElement('div');
    tooltipValue.className = 'font-semibold text-neutral-900 dark:text-white';
    const tooltipTime = document.createElement('div');
    tooltipTime.className = 'text-[10px] text-neutral-500 dark:text-white/45';
    tooltip.append(tooltipValue, tooltipTime);

    const options: uPlot.Options = {
      width: el.clientWidth,
      height: CHART_HEIGHT,
      padding: [8, 28, 0, 0],
      legend: { show: false },
      cursor: { points: { size: 7, fill: palette.activity }, y: false, drag: { x: false, y: false } },
      scales: {
        x: { time: true },
        y: kind === 'line' ? { range: (_u, _min, max) => [0, Math.max(1.2, (max ?? 0) * 1.2)] } : { range: (_u, _min, max) => [0, Math.max(5, (max ?? 0) * 1.15)] },
      },
      axes: [
        {
          ...axis,
          // Seconds on the axis while the session is short; minutes once it spans 10 min.
          values: (u, splits) => {
            const span = (u.scales.x.max ?? 0) - (u.scales.x.min ?? 0);
            return splits.map((s) => formatClock(s * 1000).slice(0, span < 600 ? 8 : 5));
          },
        },
        { ...axis, size: 44 },
      ],
      series: [
        {},
        kind === 'line'
          ? { stroke: palette.activity, width: 1.5, spanGaps: false, points: { show: false } }
          : { stroke: palette.activity, fill: palette.activity, width: 0, paths: uPlot.paths.bars!({ size: [0.7, 14], radius: 0.25 }), points: { show: false } },
      ],
      hooks: {
        init: [(u) => u.over.appendChild(tooltip)],
        setCursor: [
          (u) => {
            const idx = u.cursor.idx;
            const value = idx === null || idx === undefined ? null : (u.data[1][idx] as number | null | undefined);
            if (idx === null || idx === undefined || value === null || value === undefined) {
              tooltip.classList.add('hidden');
              return;
            }
            tooltipValue.textContent = formatRef.current(value);
            tooltipTime.textContent = `${formatClock(u.data[0][idx] * 1000)} UTC`;
            const left = u.valToPos(u.data[0][idx], 'x');
            tooltip.style.left = `${Math.min(left + 10, u.over.clientWidth - 140)}px`;
            tooltip.style.top = '4px';
            tooltip.classList.remove('hidden');
          },
        ],
      },
    };
    const chart = new uPlot(options, dataRef.current, el);
    plot.current = chart;
    const observer = new ResizeObserver(([entry]) => chart.setSize({ width: Math.floor(entry.contentRect.width), height: CHART_HEIGHT }));
    observer.observe(el);
    return () => {
      observer.disconnect();
      chart.destroy();
      plot.current = null;
    };
  }, [palette, kind]);

  useEffect(() => {
    plot.current?.setData(data);
  }, [data]);

  return <div ref={ref} className="w-full" style={{ height: CHART_HEIGHT }} />;
}
