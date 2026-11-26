import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { shortHash } from '../../../modules/network-status/format';

/** A hash or other long hex value: monospace, wraps anywhere, copyable. */
export function HashValue({ value, label, short = false }: { value: string; label: string; short?: boolean }) {
  return (
    <span className="inline-flex items-start gap-1.5 min-w-0 max-w-full">
      <span className="font-mono text-xs text-neutral-800 dark:text-white/85 break-all" title={short ? value : undefined}>
        {short ? shortHash(value) : value}
      </span>
      <CopyButton text={value} label={`Copy ${label}`} />
    </span>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard blocked (insecure context, permissions): the value stays selectable.
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      className="shrink-0 p-0.5 -m-0.5 rounded text-neutral-400 hover:text-orange-500 dark:text-white/30 dark:hover:text-brand-orange transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-lime-600 dark:text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/** One labelled row of a definition list. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-0.5 py-1.5">
      <dt className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 dark:text-white/40 sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 text-sm text-neutral-900 dark:text-white/90">{children}</dd>
    </div>
  );
}
