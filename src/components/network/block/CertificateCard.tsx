import { useState } from 'react';
import { formatInteger, formatSealTime } from '../../../modules/network-status/format';
import type { CertificateReport, TrustBaseInfo } from '../../../modules/network-status/verify/types';
import { CopyButton, Field, HashValue } from './HashValue';
import { StructureToggle } from './StructureTree';
import { CheckList, VerifyBadge } from './VerifyBadge';

/**
 * A unicity certificate: the verification outcome and each check, then what the
 * certificate says. `report === null` while it is being checked.
 */
export function CertificateCard(props: {
  title: string;
  report: CertificateReport | null;
  trust: TrustBaseInfo | null;
  hex: string | null;
  note?: string;
}) {
  const { title, report, trust, hex, note } = props;
  const summary = report?.summary ?? null;

  return (
    <section aria-label={title} className="rounded-xl border border-neutral-200 dark:border-white/[0.08] bg-neutral-50/70 dark:bg-white/[0.03] p-3 sm:p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-mono uppercase tracking-wider text-neutral-600 dark:text-white/55">{title}</h3>
        <VerifyBadge outcome={report ? report.outcome : 'checking'} />
      </header>
      {note && <p className="mt-1.5 text-xs text-neutral-500 dark:text-white/45">{note}</p>}
      {report?.reason && <p className="mt-2 text-xs text-neutral-700 dark:text-white/70">{report.reason}</p>}
      {report && report.checks.length > 0 && (
        <div className="mt-3">
          <CheckList checks={report.checks} />
        </div>
      )}

      {summary && (
        <>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Root round" value={formatInteger(summary.rootRound)} />
            <Stat label="Shard round" value={formatInteger(summary.shardRound)} />
            <Stat label="Epoch" value={String(summary.epoch)} />
            <Stat label="Sealed (UTC)" value={formatSealTime(summary.sealedAt)} hint="Root-chain clock, whole seconds" />
          </div>
          <Signers signers={summary.signers} trust={trust} />
          <dl className="mt-2 divide-y divide-neutral-200/70 dark:divide-white/[0.05]">
            <Field label="Certified root">
              <HashValue value={summary.inputRecordHash} label="certified root" />
            </Field>
            {summary.previousHash && (
              <Field label="Previous root">
                <HashValue value={summary.previousHash} label="previous root" />
              </Field>
            )}
            <Field label="Seal hash">
              <HashValue value={summary.sealHash} label="seal hash" />
            </Field>
          </dl>
        </>
      )}

      {hex && (
        <div className="mt-2 space-y-2">
          <RawHex label="certificate" hex={hex} />
          <StructureToggle label="certificate" kind="certificate" hex={hex} />
        </div>
      )}
    </section>
  );
}

/** Hex CBOR as the gateway sent it, behind a toggle, copyable. */
export function RawHex({ label, hex }: { label: string; hex: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-xs text-neutral-500 hover:text-orange-500 dark:text-white/45 dark:hover:text-brand-orange transition-colors"
      >
        {open ? `Hide raw ${label}` : `Show raw ${label}`}
      </button>
      {open && (
        <div className="mt-2 flex gap-2 items-start rounded-lg bg-white dark:bg-black/40 border border-neutral-200 dark:border-white/[0.06] p-2">
          <pre className="flex-1 max-h-40 overflow-auto font-mono text-[11px] leading-4 text-neutral-700 dark:text-white/70 whitespace-pre-wrap break-all">{hex}</pre>
          <CopyButton text={hex} label={`Copy raw ${label}`} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-white dark:bg-black/30 border border-neutral-200/80 dark:border-white/[0.05] px-2.5 py-1.5" title={hint}>
      <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-white/40">{label}</div>
      <div className="font-mono text-sm text-neutral-900 dark:text-white/90">{value}</div>
    </div>
  );
}

/** Every root of the trust base, lit when its signature is in the seal. */
function Signers({ signers, trust }: { signers: readonly string[]; trust: TrustBaseInfo | null }) {
  const roots = trust ? [...new Set([...trust.nodeIds, ...signers])].sort() : [...signers];
  const signed = new Set(signers);
  return (
    <div className="mt-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-white/40 mb-1.5">
        Signed by {signers.length}
        {trust ? ` of ${trust.nodeIds.length} roots · ${trust.quorum} needed` : ' roots'}
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {roots.map((id) => {
          const has = signed.has(id);
          return (
            <li
              key={id}
              title={id}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] ${
                has
                  ? 'border-lime-600/30 bg-lime-500/10 text-lime-800 dark:border-lime-400/30 dark:text-lime-200'
                  : 'border-neutral-300 text-neutral-500 dark:border-white/10 dark:text-white/40'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${has ? 'bg-lime-500 dark:bg-lime-400' : 'bg-neutral-300 dark:bg-white/20'}`} aria-hidden="true" />
              {id.slice(-6)}
              <span className="sr-only">{has ? ' signed' : ' did not sign'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
