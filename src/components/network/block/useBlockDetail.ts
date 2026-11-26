import { useEffect, useState } from 'react';
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import type { GatewayClient } from '../../../modules/network-status/gatewayClient';
import type { AggregatorRecord, BlockDetail } from '../../../modules/network-status/types';
import { inspectBlockCertificate, messageOf } from '../../../modules/network-status/verify/certificate';
import { loadTrustBase } from '../../../modules/network-status/verify/trustBase';
import type { CertificateReport, TrustBaseInfo } from '../../../modules/network-status/verify/types';

export type RecordsState =
  | { readonly status: 'empty' }
  | { readonly status: 'loading' }
  | { readonly status: 'loaded'; readonly list: readonly AggregatorRecord[] }
  | { readonly status: 'error'; readonly message: string };

export type BlockState =
  | { readonly status: 'loading' }
  | { readonly status: 'missing' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly block: BlockDetail; readonly records: RecordsState };

/**
 * One block and its records. A change of block aborts the previous requests, and
 * an answer for a block no longer shown is dropped, so fast stepping can never
 * paint an older block over the current one.
 */
export function useBlockDetail(client: GatewayClient, shardId: string | null, index: number | null, attempt: number): BlockState {
  const key = shardId === null || index === null ? null : `${client.baseUrl}|${shardId}|${index}|${attempt}`;
  const [result, setResult] = useState<{ key: string; state: BlockState } | null>(null);

  useEffect(() => {
    if (key === null || shardId === null || index === null) return;
    const controller = new AbortController();
    let live = true;
    const settle = (state: BlockState) => {
      if (live) setResult({ key, state });
    };
    (async () => {
      let block: BlockDetail | null;
      try {
        block = await client.getBlockDetail(shardId, index, controller.signal);
      } catch (error) {
        settle({ status: 'error', message: messageOf(error) });
        return;
      }
      if (!block) return settle({ status: 'missing' });
      if (block.empty) return settle({ status: 'ready', block, records: { status: 'empty' } });
      settle({ status: 'ready', block, records: { status: 'loading' } });
      try {
        const list = await client.getBlockRecords(shardId, index, controller.signal);
        settle({ status: 'ready', block, records: { status: 'loaded', list } });
      } catch (error) {
        settle({ status: 'ready', block, records: { status: 'error', message: messageOf(error) } });
      }
    })();
    return () => {
      live = false;
      controller.abort();
    };
  }, [client, key, shardId, index]);

  return result && result.key === key ? result.state : { status: 'loading' };
}

export interface CertificateCheck {
  readonly report: CertificateReport;
  readonly trust: TrustBaseInfo | null;
}

/** The block's own certificate, verified against the trust base Sphere embeds for `network`; `null` while checking. */
export function useBlockCertificate(network: NetworkType, block: BlockDetail | null): CertificateCheck | null {
  const [result, setResult] = useState<{ block: BlockDetail; check: CertificateCheck } | null>(null);

  useEffect(() => {
    if (!block) return;
    let live = true;
    loadTrustBase(network)
      .then(async (ctx) => ({ report: await inspectBlockCertificate(ctx, block), trust: ctx.info }))
      .catch((error: unknown): CertificateCheck => ({
        report: { outcome: 'unchecked', reason: `Couldn’t load the trust base: ${messageOf(error)}`, checks: [], summary: null },
        trust: null,
      }))
      .then((check) => {
        if (live) setResult({ block, check });
      });
    return () => {
      live = false;
    };
  }, [network, block]);

  return result && result.block === block ? result.check : null;
}
