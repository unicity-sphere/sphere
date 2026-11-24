import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { NETWORKS } from '@unicitylabs/sphere-sdk';
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import { SPHERE_NETWORK, SUPPORTED_NETWORKS } from '../config/network';
import { useNetworkStatus } from '../modules/network-status/useNetworkStatus';
import type { NetworkSnapshot, Verdict } from '../modules/network-status/roundStore';
import type { FeedSource } from '../modules/network-status/types';
import { formatAge, formatInteger } from '../modules/network-status/format';
import { BeatCanvas } from '../components/network/BeatCanvas';
import { MetricTiles } from '../components/network/MetricTiles';
import { ConsensusPanel } from '../components/network/ConsensusPanel';
import { ShardsPanel } from '../components/network/ShardsPanel';
import { SessionCharts } from '../components/network/SessionCharts';
import { RoundsTable } from '../components/network/RoundsTable';
import { useNetworkPalette, usePrefersReducedMotion, type NetworkPalette } from '../components/network/palette';

interface NetworkOption {
  readonly id: NetworkType;
  readonly label: string;
}

/**
 * The networks this page offers: the one the app runs on, plus every network
 * this deployment has rolled out. A network still behind its rollout switch
 * is not shown here either.
 */
function networkOptions(): NetworkOption[] {
  const options: NetworkOption[] = SUPPORTED_NETWORKS.filter((n) => n.available || n.id === SPHERE_NETWORK).map((n) => ({ id: n.id, label: shortLabel(n.id) }));
  if (!options.some((o) => o.id === SPHERE_NETWORK)) options.unshift({ id: SPHERE_NETWORK, label: shortLabel(SPHERE_NETWORK) });
  return options;
}

function shortLabel(id: NetworkType): string {
  return id === 'mainnet' ? 'Mainnet' : 'Testnet';
}

export function NetworkPage() {
  const options = useMemo(networkOptions, []);
  const [params, setParams] = useSearchParams();
  const requested = params.get('network');
  const network = options.find((o) => o.id === requested)?.id ?? SPHERE_NETWORK;
  const gatewayUrl = NETWORKS[network].aggregatorUrl;

  const selectNetwork = (id: NetworkType) => {
    const next = new URLSearchParams(params);
    if (id === SPHERE_NETWORK) next.delete('network');
    else next.set('network', id);
    setParams(next, { replace: true });
  };

  // Keyed by gateway: a network switch starts from an empty store and a fresh canvas.
  return <NetworkView key={gatewayUrl} network={network} gatewayUrl={gatewayUrl} options={options} onSelect={selectNetwork} />;
}

function NetworkView(props: { network: NetworkType; gatewayUrl: string; options: readonly NetworkOption[]; onSelect: (id: NetworkType) => void }) {
  const { network, gatewayUrl, options, onSelect: selectNetwork } = props;
  const { store, snapshot, source } = useNetworkStatus(gatewayUrl);
  const palette = useNetworkPalette();
  const reducedMotion = usePrefersReducedMotion();
  const latest = snapshot.columns.at(-1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-neutral-900 dark:text-white px-4 sm:px-0 pb-10 max-w-7xl mx-auto">
      <Hero
        snapshot={snapshot}
        network={network}
        options={options}
        onSelect={selectNetwork}
        source={source}
        gatewayUrl={gatewayUrl}
        palette={palette}
        reducedMotion={reducedMotion}
      />

      <section className="mt-6 rounded-3xl border border-neutral-200 dark:border-white/[0.07] bg-white/80 dark:bg-black/45 backdrop-blur-md p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold">Certified rounds</h2>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-white/45 mt-1">
              Each column is one root round. A single certificate seals every shard in it: one dot per root that signed, one cell per shard block.
              Hover to pause, click a cell to open its block.
            </p>
          </div>
          <div className="sm:text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-white/40">Root round</div>
            <div className="font-mono text-2xl sm:text-3xl font-semibold tracking-tight">{latest ? formatInteger(latest.rootRound) : '—'}</div>
          </div>
        </div>
        <div className="pt-5">
          <BeatCanvas store={store} snapshot={snapshot} network={network} source={source} palette={palette} reducedMotion={reducedMotion} />
        </div>
        <Legend palette={palette} />
      </section>

      <section className="mt-3">
        <MetricTiles snapshot={snapshot} palette={palette} />
      </section>

      <section className="mt-3 grid lg:grid-cols-2 gap-3">
        <Panel title="Consensus" caption="The roots that seal every round, and how often each one signed while you watched.">
          <ConsensusPanel snapshot={snapshot} palette={palette} reducedMotion={reducedMotion} />
        </Panel>
        <Panel title="Shards" caption="Each shard runs its own chain of blocks; every certified round includes all of them.">
          <ShardsPanel snapshot={snapshot} network={network} palette={palette} />
        </Panel>
      </section>

      <section className="mt-3">
        <h2 className="sr-only">Since you opened this page</h2>
        <SessionCharts snapshot={snapshot} palette={palette} />
      </section>

      <section className="mt-3">
        <RoundsTable snapshot={snapshot} network={network} />
      </section>

      <HowItWorks gatewayUrl={gatewayUrl} source={source} />
    </motion.div>
  );
}

const VERDICT_TEXT: Record<Verdict, string> = {
  connecting: 'Connecting',
  live: 'Live',
  degraded: 'Degraded',
  down: 'Down',
};

function Hero(props: {
  snapshot: NetworkSnapshot;
  network: NetworkType;
  options: readonly NetworkOption[];
  onSelect: (id: NetworkType) => void;
  source: FeedSource | null;
  gatewayUrl: string;
  palette: NetworkPalette;
  reducedMotion: boolean;
}) {
  const { snapshot, network, options, onSelect, source, gatewayUrl, palette, reducedMotion } = props;
  const { verdict, metrics, reasons, feedError } = snapshot;
  const color = verdict === 'live' ? palette.good : verdict === 'degraded' ? palette.warn : verdict === 'down' ? palette.bad : palette.inkMuted;
  const host = hostOf(gatewayUrl);

  return (
    <header className="pt-2 sm:pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-mono uppercase tracking-widest text-orange-500 dark:text-brand-orange">Sphere / Network</p>
        {options.length > 1 && (
          <div role="radiogroup" aria-label="Network" className="inline-flex rounded-full border border-neutral-200 dark:border-white/10 bg-white/70 dark:bg-black/40 p-0.5 text-xs">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={o.id === network}
                onClick={() => onSelect(o.id)}
                className={`px-3 py-1 rounded-full transition-colors ${
                  o.id === network ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'text-neutral-600 hover:text-neutral-900 dark:text-white/55 dark:hover:text-white'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <span className="relative flex w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true">
          {verdict === 'live' && !reducedMotion && <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: color }} />}
          <span className="relative inline-flex w-full h-full rounded-full" style={{ background: color, boxShadow: `0 0 18px ${color}` }} />
        </span>
        <h1 className="font-display uppercase leading-none text-6xl sm:text-7xl lg:text-8xl tracking-wide" style={{ color, textShadow: verdict === 'live' ? `0 0 40px ${palette.goodGlow}` : undefined }}>
          <span className="sr-only">Network status: </span>
          {VERDICT_TEXT[verdict]}
        </h1>
      </div>

      <p className="mt-3 text-sm sm:text-base text-neutral-600 dark:text-white/60">
        {shortLabel(network)} · {snapshot.shards.length || '—'} shards · {metrics.rootsKnown || '—'} roots
        {metrics.lastRoundAgeMs !== null && <> · newest block {formatAge(metrics.lastRoundAgeMs)} ago</>}
      </p>

      {reasons.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-sm" style={{ color }}>
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {feedError && verdict === 'connecting' && (
        <p className="mt-2 text-sm text-red-500 dark:text-red-400">
          Can’t read {host} ({feedError}). Retrying…
        </p>
      )}

      <p className="mt-3 text-[11px] font-mono text-neutral-500 dark:text-white/35">
        Live from {host}
        {source === 'status-endpoint' ? ' · gateway status feed' : source === 'polling' ? ' · every shard, every second' : ''}
      </p>
    </header>
  );
}

function Legend({ palette }: { palette: NetworkPalette }) {
  const item = 'inline-flex items-center gap-1.5';
  return (
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-neutral-500 dark:text-white/45">
      <span className={item}>
        <span className="w-2.5 h-2.5 rounded-[3px] border" style={{ background: palette.cellEmpty, borderColor: palette.cellEmptyStroke }} /> empty block
      </span>
      <span className={item}>
        <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: palette.activity }} /> block with commitments
      </span>
      <span className={item}>
        <span className="w-2 h-2 rounded-full" style={{ background: palette.good }} /> root signed
      </span>
      <span className={item}>
        <span className="w-2 h-2 rounded-full border-[1.5px]" style={{ borderColor: palette.bad }} /> root missing from the seal
      </span>
      <span className={item}>
        <span className="font-bold leading-none" style={{ color: palette.bad }}>
          ×
        </span>{' '}
        shard has no block in that round
      </span>
    </div>
  );
}

function Panel({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-white/[0.07] bg-white/80 dark:bg-black/40 backdrop-blur-md p-4 sm:p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-xs text-neutral-500 dark:text-white/40 mb-4">{caption}</p>
      {children}
    </div>
  );
}

function HowItWorks({ gatewayUrl, source }: { gatewayUrl: string; source: FeedSource | null }) {
  return (
    <section className="mt-8 grid sm:grid-cols-2 gap-x-10 gap-y-4 text-xs leading-relaxed text-neutral-500 dark:text-white/40">
      <h2 className="sm:col-span-2 text-[11px] font-mono uppercase tracking-wider text-neutral-600 dark:text-white/55">How this page works</h2>
      <p>
        Everything here is read live from the public gateway at {hostOf(gatewayUrl)}
        {source === 'status-endpoint' ? ', from its cached status feed' : ', one request per shard per second while this tab is visible'}. Nothing is stored; history starts when you open the page.
      </p>
      <p>
        Root signatures are read from each block’s unicity certificate. This page displays them; it does not verify them. To check a block’s proof,
        open it in the SMT explorer.
      </p>
      <p>
        Round time uses block timestamps, which the aggregator sets when it proposes a block. Seal times come from the root chain in whole seconds, so
        certification latency is not shown here.
      </p>
      <p>
        Health is judged from your browser: a shard is stalled when its block number has not advanced for 15 seconds, and unreachable when requests to
        it have failed for 15 seconds.
      </p>
    </section>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
