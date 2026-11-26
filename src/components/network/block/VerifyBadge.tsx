import { CircleCheck, CircleHelp, CircleX, LoaderCircle } from 'lucide-react';
import type { Check, Outcome } from '../../../modules/network-status/verify/types';

const STYLE: Record<Outcome | 'checking', { label: string; className: string; Icon: typeof CircleCheck }> = {
  verified: {
    label: 'Verified',
    className: 'bg-lime-500/10 text-lime-700 border-lime-600/30 dark:text-lime-300 dark:border-lime-400/30',
    Icon: CircleCheck,
  },
  failed: { label: 'Failed', className: 'bg-red-500/10 text-red-700 border-red-600/30 dark:text-red-300 dark:border-red-400/30', Icon: CircleX },
  unchecked: {
    label: 'Couldn’t check',
    className: 'bg-neutral-500/10 text-neutral-600 border-neutral-400/40 dark:text-white/60 dark:border-white/15',
    Icon: CircleHelp,
  },
  checking: {
    label: 'Checking…',
    className: 'bg-neutral-500/5 text-neutral-500 border-neutral-300 dark:text-white/50 dark:border-white/10',
    Icon: LoaderCircle,
  },
};

/** The outcome of a verification: an icon and a word, never colour alone. */
export function VerifyBadge({ outcome }: { outcome: Outcome | 'checking' }) {
  const { label, className, Icon } = STYLE[outcome];
  return (
    <span aria-live="polite" className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${className}`}>
      <Icon className={`w-3.5 h-3.5 ${outcome === 'checking' ? 'animate-spin' : ''}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

const MARK: Record<Check['result'], { glyph: string; className: string; sr: string }> = {
  pass: { glyph: '✓', className: 'text-lime-600 dark:text-lime-400', sr: 'passed' },
  fail: { glyph: '✗', className: 'text-red-600 dark:text-red-400', sr: 'failed' },
  skipped: { glyph: '–', className: 'text-neutral-400 dark:text-white/30', sr: 'not run' },
};

export function CheckList({ checks }: { checks: readonly Check[] }) {
  if (checks.length === 0) return null;
  return (
    <ul className="space-y-1">
      {checks.map((check) => {
        const mark = MARK[check.result];
        return (
          <li key={check.label} className="flex gap-2 text-xs leading-5">
            <span className={`w-3 shrink-0 text-center font-mono ${mark.className}`} aria-hidden="true">
              {mark.glyph}
            </span>
            <span className="min-w-0">
              <span className="text-neutral-800 dark:text-white/85">{check.label}</span>
              <span className="sr-only"> {mark.sr}</span>
              {check.detail && <span className="text-neutral-500 dark:text-white/45"> · {check.detail}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
