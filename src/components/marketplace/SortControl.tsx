export const SORT_OPTIONS = [
  { value: 'relevant', label: 'Relevant' },
  { value: 'new',      label: 'New' },
  { value: 'top',      label: 'Top' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

interface SortControlProps {
  value: SortValue;
  onChange: (value: SortValue) => void;
}

/**
 * How the catalog is ordered.
 *
 * A segmented control rather than pills, deliberately: the category chips
 * directly below are pills, and they are a FILTER — several could sensibly be
 * on at once, and turning one on changes how many projects exist. Sort is
 * exactly one choice and changes no counts. Giving the two different shapes
 * is what keeps "Top" from reading as another category.
 *
 * Smaller than the Apps/Standalone tabs above it for the same reason in
 * reverse: those partition the catalog into two different things, this only
 * reorders what is already on screen, and matching their size would claim
 * equal importance.
 */
export function SortControl({ value, onChange }: SortControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Sort projects"
      className="inline-flex items-center gap-0.5 rounded-full border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/4 p-0.5"
    >
      {SORT_OPTIONS.map(option => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={
              isActive
                ? 'rounded-full px-3.5 py-1.5 text-xs font-semibold text-white bg-orange-500 dark:bg-brand-orange shadow-sm cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60'
                : 'rounded-full px-3.5 py-1.5 text-xs font-semibold text-neutral-500 dark:text-white/50 hover:text-neutral-900 dark:hover:text-white cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 transition-colors'
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
