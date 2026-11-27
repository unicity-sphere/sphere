import { lazy, type ComponentType } from 'react';

/** `React.lazy` that reloads the page once when a chunk fails to load (a stale deployment), and throws on a second failure. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors React.lazy's own constraint
export function lazyWithRetry<T extends ComponentType<any>>(importFn: () => Promise<{ default: T }>) {
  return lazy(() =>
    importFn().catch((error) => {
      const key = 'chunk_reload';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return new Promise<never>(() => {});
      }
      sessionStorage.removeItem(key);
      throw error;
    }),
  );
}
