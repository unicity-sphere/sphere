import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Whether an element has come within `rootMargin` of the viewport yet; once it has,
 * it stays seen (#785). An NFT row fetches its linked thumbnail and metadata document
 * only once seen, so opening a long token list does not download every token's files
 * at once. Where IntersectionObserver does not exist, everything counts as seen.
 */
export function useSeenOnce<T extends Element>(rootMargin = '200px'): [ref: (node: T | null) => void, seen: boolean] {
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: T | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node || seen) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          setSeen(true);
        },
        { rootMargin },
      );
      observer.observe(node);
      observerRef.current = observer;
    },
    [seen, rootMargin],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return [ref, seen];
}
