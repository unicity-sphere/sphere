import { useEffect, useState } from 'react';

/**
 * Trailing debounce for a value that drives a network request.
 *
 * Explore's search box filters server-side, so every keystroke would
 * otherwise be its own request to /api/marketplace. Debouncing collapses a
 * burst of typing into the one term the user actually stopped on.
 *
 * Clearing is applied IMMEDIATELY rather than after the delay: emptying the
 * search box (or a tab switch that resets it) should bring the full list
 * back at once, and delaying it would fire one extra request for a term the
 * user has already deleted.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (!value) {
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
