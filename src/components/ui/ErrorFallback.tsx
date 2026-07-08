/**
 * Full-screen fallback rendered by the root Sentry.ErrorBoundary. Kept
 * dependency-free (no framer-motion, no shared UI components) — if the app
 * crashed, the fallback must not be able to crash with it.
 */
export function ErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center bg-white dark:bg-neutral-950">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
        Something went wrong
      </h1>
      <p className="text-sm text-neutral-500 dark:text-white/60 max-w-sm leading-relaxed">
        The error has been reported and we&apos;re on it. Reload the page to
        continue — if you were in the middle of an operation, check your
        transaction history after reloading.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-brand-orange to-brand-orange-dark text-white text-sm font-bold shadow-xl shadow-brand-orange/25"
      >
        Reload
      </button>
    </div>
  );
}
