import type { Column } from '../../modules/network-status/roundStore';

/**
 * The column a pointer at `x` points at, or `null` when none is within `reach` px.
 *
 * On a shard row it is the nearest column holding THAT shard's block. Shards are
 * certified on their own schedules, so a root round that sealed other shards can
 * sit a few pixels from the cell under the pointer, closer than the cell's own
 * column. When the shard has no block within reach, the nearest column of any
 * kind answers, and the caller reports the shard as having no block there.
 */
export function pickColumn(
  columns: readonly Column[],
  xOf: (column: Column) => number,
  x: number,
  shardId: string | null,
  reach: number,
): Column | null {
  let nearest: Column | null = null;
  let nearestDistance = Infinity;
  let own: Column | null = null;
  let ownDistance = Infinity;
  for (const column of columns) {
    const distance = Math.abs(xOf(column) - x);
    if (distance < nearestDistance) {
      nearest = column;
      nearestDistance = distance;
    }
    if (shardId !== null && distance < ownDistance && column.cells.has(shardId)) {
      own = column;
      ownDistance = distance;
    }
  }
  if (own && ownDistance <= reach) return own;
  return nearest && nearestDistance <= reach ? nearest : null;
}
