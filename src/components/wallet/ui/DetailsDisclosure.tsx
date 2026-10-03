import { useId, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

/**
 * The ONE disclosure on the wallet's consent surfaces.
 *
 * The disclosure holds exactly the things the wallet does not vouch for — content the peer
 * chose, and numeric diagnostics. That is why a warning can never go inside it: a warning you
 * have to open is not a warning.
 *
 * DELIBERATELY UNCONTROLLED. There is no `open`/`onToggle` prop. A parent that can force it
 * open can make it expand under a stationary cursor on a re-render, which is the same shape of
 * attack settleWindow.ts exists to prevent. No caller needs it; do not add it.
 *
 * Children are NOT in the DOM while closed, so nothing a test reads out of
 * document.body.textContent may live in here.
 *
 * Not a native `<details>`: its marker cannot be styled consistently across browsers and it
 * cannot animate height, and this repo already animates with framer-motion.
 */
interface DetailsDisclosureProps {
  /** Trigger text. A noun phrase naming what is inside. Identical in both states — the chevron carries open/closed. */
  label: string;
  children: ReactNode;
  /** Open on mount. Default false; on a consent surface it starts closed. */
  defaultOpen?: boolean;
  /** Trigger gets this testid; the revealed panel gets `${testId}-panel`. */
  testId?: string;
}

export function DetailsDisclosure({ label, children, defaultOpen = false, testId }: DetailsDisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="border-t border-neutral-200/60 dark:border-white/8">
      <button
        type="button"
        data-testid={testId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 py-3 text-left text-xs font-medium
                   text-neutral-500 dark:text-white/45 hover:text-neutral-700 dark:hover:text-white/70 transition-colors"
      >
        <span>{label}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            data-testid={testId ? `${testId}-panel` : undefined}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <dl className="pb-4 space-y-3">{children}</dl>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DetailRowProps {
  /** Sentence case, never uppercase tracking — that treatment belongs to section headings. */
  label: string;
  children: ReactNode;
  mono?: boolean;
}

/** One label/value line inside a DetailsDisclosure. */
export function DetailRow({ label, children, mono = false }: DetailRowProps) {
  return (
    <div>
      <dt className="text-[11px] text-neutral-400 dark:text-white/30">{label}</dt>
      <dd className={`text-xs leading-relaxed text-neutral-600 dark:text-white/55 break-words ${mono ? 'font-mono' : ''}`}>
        {children}
      </dd>
    </div>
  );
}
