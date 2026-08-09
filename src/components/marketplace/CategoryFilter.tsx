export interface CategoryOption {
  category: string;
  count:    number;
}

interface CategoryFilterProps {
  categories: CategoryOption[];
  active: string | null;
  onChange: (category: string | null) => void;
  /** Total across the categories shown, for the "All" pill. Omitted → no count. */
  totalCount?: number;
}

const categoryLabels: Record<string, string> = {
  game: 'Games', defi: 'DeFi', social: 'Social', tool: 'Tools', nft: 'NFT', other: 'Other',
  utility: 'Utility', trading: 'Trading',
};

/**
 * A category with no label of its own still gets a readable chip. The list
 * is data-driven now (the API reports which categories actually have
 * published projects), so a category nobody remembered to add here must not
 * render as raw lowercase.
 */
function labelFor(category: string): string {
  return categoryLabels[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

const pillClass = (isActive: boolean) =>
  `shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
    isActive
      ? 'bg-orange-500 dark:bg-brand-orange text-white shadow-md shadow-orange-500/20'
      : 'bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/8 text-neutral-500 dark:text-white/45 hover:text-neutral-700 dark:hover:text-white hover:border-neutral-300 dark:hover:border-white/15'
  }`;

/**
 * Counts render inside an aria-hidden span so each button's accessible name
 * stays the bare label — screen readers announce "Tools", not "Tools 5".
 */
function Count({ value }: { value?: number }) {
  if (value === undefined || value <= 0) return null;
  return <span aria-hidden className="ml-1.5 opacity-60 tabular-nums">{value}</span>;
}

export function CategoryFilter({ categories, active, onChange, totalCount }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      <button onClick={() => onChange(null)} className={pillClass(active === null)}>
        All
        <Count value={totalCount} />
      </button>
      {/* A row without a category cannot be filtered on, so it gets no chip —
          `category` is required by the schema today, but a chip that renders
          as "Null" and filters to nothing is not the way to find that out. */}
      {categories.filter(c => !!c.category).map(({ category, count }) => (
        <button
          key={category}
          onClick={() => onChange(active === category ? null : category)}
          className={pillClass(active === category)}
        >
          {labelFor(category)}
          <Count value={count} />
        </button>
      ))}
    </div>
  );
}
