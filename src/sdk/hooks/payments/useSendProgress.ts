/**
 * Live progress for a send that is consuming several source tokens.
 *
 * The SDK reports each leg as it certifies (sphere-sdk#749): `transfer:updated`
 * with `status: 'submitted'` and a `tokenTransfers[]` holding the legs certified
 * SO FAR. Only a fresh send emits those — resume and the convergence heartbeat
 * go through a different path — so while a send is in flight they are its own.
 *
 * Amounts are not on the wire, and do not need to be: each leg names its
 * `sourceTokenId`, and we already hold the inventory, so value is a local lookup.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import type { Token, TransferResult } from '@unicitylabs/sphere-sdk';

import { useSphereContext } from '../core/useSphere';

export interface SendProgress {
  /** Source tokens certified so far. */
  readonly certifiedTokens: number;
  /** Their combined value, in the coin's smallest unit, capped at the send total. */
  readonly certifiedAmount: bigint;
  /** 0..1 of the amount being sent, or null until the first leg lands. */
  readonly fraction: number | null;
}

const IDLE: SendProgress = { certifiedTokens: 0, certifiedAmount: 0n, fraction: null };

/**
 * @param active   True while the send is in flight; flipping it true resets.
 * @param totalAmount The amount being sent, smallest unit. `0n` disables the fraction.
 * @param tokens   Current inventory, used to price each certified leg.
 */
export function useSendProgress(
  active: boolean,
  totalAmount: bigint,
  tokens: readonly Token[]
): SendProgress {
  const { sphere } = useSphereContext();
  const [sourceIds, setSourceIds] = useState<readonly string[]>([]);

  // Price legs off a snapshot taken when the send starts: the inventory query
  // refetches mid-send, and a source that has already been spent drops out of
  // it — pricing against the live list would make progress go backwards.
  const pricesRef = useRef<Map<string, bigint>>(new Map());
  useEffect(() => {
    if (!active) return;
    setSourceIds([]);
    pricesRef.current = new Map(tokens.map((t) => [t.id, BigInt(t.amount)]));
    // `tokens` deliberately excluded: the snapshot is taken once, at start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!sphere || !active) return;
    const onUpdated = (result: TransferResult): void => {
      if (result.status !== 'submitted') return; // outcome, not progress
      setSourceIds(result.tokenTransfers.map((d) => d.sourceTokenId));
    };
    sphere.on('transfer:updated', onUpdated);
    return () => {
      sphere.off('transfer:updated', onUpdated);
    };
  }, [sphere, active]);

  return useMemo(() => {
    if (sourceIds.length === 0) return IDLE;
    let sum = 0n;
    for (const id of sourceIds) sum += pricesRef.current.get(id) ?? 0n;
    // A split leg consumes its whole source but sends only part of it, so the
    // sum can exceed the transfer — clamp rather than show >100%.
    const certifiedAmount = totalAmount > 0n && sum > totalAmount ? totalAmount : sum;
    return {
      certifiedTokens: sourceIds.length,
      certifiedAmount,
      fraction: totalAmount > 0n ? Number(certifiedAmount) / Number(totalAmount) : null,
    };
  }, [sourceIds, totalAmount]);
}
