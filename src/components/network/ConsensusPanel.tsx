import { motion } from 'framer-motion';
import type { NetworkSnapshot } from '../../modules/network-status/roundStore';
import { formatInteger } from '../../modules/network-status/format';
import type { NetworkPalette } from './palette';

/**
 * The roots that seal every round. Each certified round, the roots whose
 * signature is in the seal flash and ripple; a root missing from the seal
 * turns red. The ripple is keyed by the root round, so it fires once per real
 * round and never as idle decoration.
 */
export function ConsensusPanel({ snapshot, palette, reducedMotion }: { snapshot: NetworkSnapshot; palette: NetworkPalette; reducedMotion: boolean }) {
  const roots = snapshot.roots;
  const latest = snapshot.columns.at(-1) ?? null;
  const size = 240;
  const center = size / 2;
  const radius = roots.length > 1 ? 78 : 0;
  const nodes = roots.map((root, i) => {
    const angle = -Math.PI / 2 + (i / Math.max(roots.length, 1)) * Math.PI * 2;
    return { root, x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle), signed: latest ? latest.signers.includes(root.id) : null };
  });
  const signedCount = latest?.signers.length ?? null;

  return (
    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-6">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-52 h-52 shrink-0" role="img" aria-label={latest ? `${signedCount} of ${roots.length} roots signed root round ${latest.rootRound}` : 'Waiting for the first certified round'}>
        {nodes.flatMap((a, i) =>
          nodes.slice(i + 1).map((b) => (
            <line key={`${a.root.id}-${b.root.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={palette.grid} strokeWidth={1} />
          )),
        )}
        {!reducedMotion &&
          latest &&
          nodes.flatMap((a, i) =>
            nodes.slice(i + 1).map((b) =>
              a.signed && b.signed ? (
                <motion.line
                  key={`${latest.rootRound}-${a.root.id}-${b.root.id}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={palette.good}
                  strokeWidth={1.2}
                  initial={{ opacity: 0.55 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.75, ease: 'easeOut' }}
                />
              ) : null,
            ),
          )}
        {nodes.map((node) => (
          <g key={node.root.id}>
            {!reducedMotion && latest && node.signed && (
              <motion.circle
                key={latest.rootRound}
                cx={node.x}
                cy={node.y}
                fill="none"
                stroke={palette.good}
                strokeWidth={1.5}
                initial={{ r: 16, opacity: 0.7 }}
                animate={{ r: 30, opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            )}
            <circle cx={node.x} cy={node.y} r={16} className="fill-white dark:fill-[#0b0b0b]" stroke={node.signed === false ? palette.bad : palette.good} strokeWidth={1.8} />
            <circle cx={node.x} cy={node.y} r={5} fill={node.signed === false ? palette.bad : palette.good} opacity={node.signed === null ? 0.3 : 1} />
            <text x={node.x} y={node.y + 30} textAnchor="middle" className="font-mono" fontSize={9} fill={palette.inkMuted}>
              …{node.root.shortId.slice(-4)}
            </text>
          </g>
        ))}
        <text x={center} y={center + 4} textAnchor="middle" fontSize={30} fontWeight={600} fill={palette.ink}>
          {signedCount === null ? '—' : `${signedCount}/${roots.length}`}
        </text>
        <text x={center} y={center + 22} textAnchor="middle" fontSize={10} fill={palette.inkMuted}>
          {snapshot.quorum ? `signed · quorum ${snapshot.quorum}` : 'signed'}
        </text>
      </svg>

      <ul className="w-full space-y-2">
        {roots.length === 0 && <li className="text-sm text-neutral-500 dark:text-white/40">Waiting for the first certified round…</li>}
        {roots.map((root) => {
          const share = root.seen > 0 ? root.signed / root.seen : null;
          return (
            <li key={root.id} className="flex items-center gap-3 text-sm">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: root.signedLatest === false ? palette.bad : palette.good }} aria-hidden="true" />
              <span className="font-mono text-xs text-neutral-700 dark:text-white/75 truncate" title={root.id}>
                …{root.id.slice(-10)}
              </span>
              <span className="ml-auto text-right whitespace-nowrap">
                <span className="font-semibold text-neutral-900 dark:text-white">{share === null ? '—' : `${(share * 100).toFixed(share === 1 ? 0 : 1)}%`}</span>
                <span className="text-xs text-neutral-500 dark:text-white/40"> of {formatInteger(root.seen)} rounds</span>
              </span>
              <span className={`text-xs w-16 text-right ${root.signedLatest === false ? 'text-red-500 dark:text-red-400' : 'text-neutral-500 dark:text-white/40'}`}>
                {root.signedLatest === false ? 'missed' : 'signed'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
