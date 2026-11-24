import type { NetworkType } from '@unicitylabs/sphere-sdk';
import type { NetworkSnapshot } from '../../modules/network-status/roundStore';
import { explorerBlockUrl, formatInteger, formatSealTime } from '../../modules/network-status/format';

const ROWS = 30;

/** Everything the round matrix draws, as a table: readable without a canvas, a mouse, or colour. */
export function RoundsTable({ snapshot, network }: { snapshot: NetworkSnapshot; network: NetworkType }) {
  const columns = snapshot.columns.slice(-ROWS).reverse();
  const shards = snapshot.shards;
  return (
    <details className="group rounded-2xl border border-neutral-200 dark:border-white/[0.07] bg-white/80 dark:bg-black/40 backdrop-blur-md">
      <summary className="cursor-pointer select-none list-none px-4 sm:px-5 py-3 text-sm text-neutral-700 dark:text-white/70 flex items-center justify-between">
        <span>The last {ROWS} certified rounds, as a table</span>
        <span className="text-xs text-neutral-400 dark:text-white/30 group-open:rotate-180 transition-transform" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="overflow-x-auto px-4 sm:px-5 pb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-neutral-500 dark:text-white/40 font-mono uppercase tracking-wider text-[10px]">
              <th className="py-2 pr-4 font-normal">Root round</th>
              <th className="py-2 pr-4 font-normal">Sealed (UTC)</th>
              <th className="py-2 pr-4 font-normal">Roots signed</th>
              <th className="py-2 pr-4 font-normal">Commitments</th>
              {shards.map((s) => (
                <th key={s.shardId} className="py-2 pr-3 font-normal">
                  Shard {s.displayId}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-neutral-800 dark:text-white/80">
            {columns.map((column) => (
              <tr key={column.rootRound} className="border-t border-neutral-200 dark:border-white/[0.05]">
                <td className="py-1.5 pr-4">{formatInteger(column.rootRound)}</td>
                <td className="py-1.5 pr-4">{formatSealTime(column.certifiedAt)}</td>
                <td className="py-1.5 pr-4">
                  {column.signers.length}/{snapshot.roots.length}
                </td>
                <td className="py-1.5 pr-4">{formatInteger(column.totalCommitments)}</td>
                {shards.map((s) => {
                  const cell = column.cells.get(s.shardId);
                  return (
                    <td key={s.shardId} className="py-1.5 pr-3 whitespace-nowrap">
                      {cell ? (
                        <a href={explorerBlockUrl(network, s.shardId, cell.index)} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 dark:hover:text-brand-orange">
                          #{cell.index}
                          {cell.totalCommitments > 0 ? ` · ${cell.totalCommitments}` : ''}
                        </a>
                      ) : column.missed.has(s.shardId) ? (
                        <span className="text-red-500 dark:text-red-400">missed</span>
                      ) : (
                        <span className="text-neutral-400 dark:text-white/25">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {columns.length === 0 && <p className="py-3 text-neutral-500 dark:text-white/40">No rounds yet.</p>}
      </div>
    </details>
  );
}
