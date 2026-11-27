import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import type { GatewayClient } from '../../../modules/network-status/gatewayClient';
import { formatInteger, formatUtcSeconds } from '../../../modules/network-status/format';
import type { AggregatorRecord, OwnerPredicate } from '../../../modules/network-status/types';
import { messageOf } from '../../../modules/network-status/verify/certificate';
import { toHex } from '../../../modules/network-status/verify/path';
import { inspectProof } from '../../../modules/network-status/verify/proof';
import { loadTrustBase } from '../../../modules/network-status/verify/trustBase';
import type { ProofReport, TrustBaseInfo } from '../../../modules/network-status/verify/types';
import { CertificateCard, RawHex } from './CertificateCard';
import { Field, HashValue } from './HashValue';
import { CheckList, VerifyBadge } from './VerifyBadge';

interface ProofResult {
  readonly report: ProofReport;
  readonly trust: TrustBaseInfo | null;
  /** The gateway's answer as received, hex CBOR; `null` when there was none. */
  readonly hex: string | null;
}

/**
 * One commitment of a block. Collapsed it names the state and transaction;
 * expanded it shows every field the block reports and, fetched on first expand,
 * the commitment's inclusion proof, verified against the trust base.
 */
export function CommitmentCard(props: { position: number; record: AggregatorRecord; blockIndex: number; network: NetworkType; client: GatewayClient }) {
  const { position, record, blockIndex, network, client } = props;
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [proof, setProof] = useState<{ attempt: number; result: ProofResult } | null>(null);
  const started = useRef<number | null>(null);

  useEffect(() => {
    if (!open || started.current === attempt) return;
    started.current = attempt;
    const controller = new AbortController();
    let live = true;
    let done = false;
    (async (): Promise<ProofResult> => {
      let hex: string;
      try {
        hex = await client.getInclusionProof(record.stateId, controller.signal);
      } catch (error) {
        return { report: unchecked(`Couldn’t reach the gateway: ${messageOf(error)}`), trust: null, hex: null };
      }
      try {
        const ctx = await loadTrustBase(network);
        return { report: await inspectProof(ctx, record, blockIndex, hex), trust: ctx.info, hex };
      } catch (error) {
        return { report: unchecked(`Couldn’t load the trust base: ${messageOf(error)}`), trust: null, hex };
      }
    })().then((result) => {
      done = true;
      if (live) setProof({ attempt, result });
    });
    return () => {
      live = false;
      controller.abort();
      // Collapsed before the answer came: fetch again on the next expand.
      if (!done && started.current === attempt) started.current = null;
    };
  }, [open, attempt, client, network, record, blockIndex]);

  const result = proof && proof.attempt === attempt ? proof.result : null;

  return (
    <li className="rounded-xl border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Commitment #${position}, state ${record.stateId}`}
        className="w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors"
      >
        <span className="font-mono text-xs text-neutral-500 dark:text-white/40 w-8 shrink-0">#{position}</span>
        <span className="min-w-0 flex-1 grid grid-cols-[2.75rem_1fr] gap-x-2 gap-y-0.5 font-mono text-xs">
          <span className="text-neutral-500 dark:text-white/40">state</span>
          <span className="min-w-0 break-all text-neutral-900 dark:text-white/90">{record.stateId}</span>
          <span className="text-neutral-500 dark:text-white/40">tx</span>
          <span className="min-w-0 break-all text-neutral-700 dark:text-white/65">{record.transactionHash}</span>
        </span>
        {record.aggregateRequestCount > 1 && (
          <span className="hidden sm:inline text-[11px] text-neutral-500 dark:text-white/45 whitespace-nowrap">aggregates {formatInteger(record.aggregateRequestCount)}</span>
        )}
        <ChevronDown className={`w-4 h-4 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="border-t border-neutral-200 dark:border-white/[0.06] px-3 sm:px-4 py-3 space-y-4">
          <dl className="divide-y divide-neutral-200/70 dark:divide-white/[0.05]">
            <Field label="State ID">
              <HashValue value={record.stateId} label="state ID" />
            </Field>
            <Field label="Transaction">
              <HashValue value={record.transactionHash} label="transaction hash" />
            </Field>
            <Field label="Source state">
              <HashValue value={record.sourceStateHash} label="source state hash" />
            </Field>
            <Field label="Owner">
              <Owner predicate={record.ownerPredicate} />
            </Field>
            <Field label="Witness">
              <HashValue value={record.witness} label="witness" />
            </Field>
            <Field label="Reference time">
              <span className="font-mono text-xs">{formatUtcSeconds(record.referenceTime)}</span>
            </Field>
            <Field label="Deadline">
              <span className="font-mono text-xs">{record.expiresAt === null ? 'none' : formatUtcSeconds(record.expiresAt)}</span>
            </Field>
            <Field label="Leaf index">
              <span className="font-mono text-xs">{formatInteger(record.leafIndex)}</span>
            </Field>
            <Field label="Requests">
              <span className="font-mono text-xs">{formatInteger(record.aggregateRequestCount)}</span>
            </Field>
          </dl>
          <ProofSection result={result} blockIndex={blockIndex} onRetry={() => setAttempt((a) => a + 1)} />
        </div>
      )}
    </li>
  );
}

function ProofSection({ result, blockIndex, onRetry }: { result: ProofResult | null; blockIndex: number; onRetry: () => void }) {
  const report = result?.report ?? null;
  return (
    <section aria-label="Inclusion proof" className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-mono uppercase tracking-wider text-neutral-600 dark:text-white/55">Inclusion proof</h3>
        <VerifyBadge outcome={report ? report.outcome : 'checking'} />
      </header>
      {report?.reason && <p className="text-xs text-neutral-700 dark:text-white/70">{report.reason}</p>}
      {report?.outcome === 'unchecked' && (
        <button type="button" onClick={onRetry} className="text-xs font-medium text-orange-600 hover:text-orange-500 dark:text-brand-orange">
          Retry
        </button>
      )}
      {report && <CheckList checks={report.checks} />}
      {report?.answeredAtBlock != null && (
        <p className="text-xs text-neutral-500 dark:text-white/45">
          The gateway answers against its latest certified root: block {formatInteger(report.answeredAtBlock)}
          {report.answeredAtBlock > blockIndex ? `, ${formatInteger(report.answeredAtBlock - blockIndex)} blocks after this one` : ''}.
        </p>
      )}
      {report?.path && <Path depths={report.path.depths} siblings={report.path.siblings} />}
      {result?.hex && <RawHex label="proof" hex={result.hex} />}
      {report?.certificate && (
        <CertificateCard
          title={`Proof certificate · block ${formatInteger(report.answeredAtBlock)}`}
          report={report.certificate}
          trust={result?.trust ?? null}
          hex={null}
          note="Certifies the root the proof leads to, not this block’s root."
        />
      )}
    </section>
  );
}

/** The path from the leaf to the root: one sibling hash at each depth where the tree branches. */
function Path({ depths, siblings }: { depths: readonly number[]; siblings: readonly string[] }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-white/40 mb-1.5">
        Merkle path · {siblings.length} sibling{siblings.length === 1 ? '' : 's'}
      </div>
      <ol className="max-h-48 overflow-auto rounded-lg border border-neutral-200 dark:border-white/[0.06] divide-y divide-neutral-200/70 dark:divide-white/[0.04]">
        {siblings.map((sibling, i) => (
          <li key={depths[i]} className="flex items-center gap-3 px-2.5 py-1">
            <span className="w-16 shrink-0 font-mono text-[11px] text-neutral-500 dark:text-white/40">depth {depths[i]}</span>
            <HashValue value={sibling} label={`sibling at depth ${depths[i]}`} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function Owner({ predicate }: { predicate: OwnerPredicate }) {
  const code = decodeBase64(predicate.code);
  const params = decodeBase64(predicate.params);
  const kind = predicate.engine === 1 && code?.length === 1 ? BUILT_IN[code[0]] : undefined;
  if (kind && params) {
    return (
      <span className="block space-y-0.5">
        <span className="block text-xs text-neutral-700 dark:text-white/75">{kind}</span>
        <HashValue value={toHex(params)} label={kind === 'Signature predicate' ? 'public key' : 'predicate parameters'} />
      </span>
    );
  }
  return (
    <span className="font-mono text-xs break-all">
      engine {predicate.engine} · code {predicate.code} · params {predicate.params}
    </span>
  );
}

const BUILT_IN: Record<number, string> = { 1: 'Signature predicate', 2: 'Burn predicate' };

function decodeBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function unchecked(reason: string): ProofReport {
  return { outcome: 'unchecked', reason, checks: [], kind: null, answeredAtBlock: null, certificate: null, path: null };
}
