// Sentry project in the unicity-labs org (EU region). A DSN is not a secret —
// it can only submit events, never read them — so it ships in the bundle like
// any other public config.
const DEFAULT_DSN =
  'https://89bdde35ad30c0364bcf064bd37a9d74@o4511695062237184.ingest.de.sentry.io/4511695233679440';

// `npm run dev` does not report unless VITE_SENTRY_DSN is set in .env.local;
// setting VITE_SENTRY_DSN='' at build time ships a build with Sentry disabled.
export const SENTRY_DSN: string =
  import.meta.env.VITE_SENTRY_DSN ?? (import.meta.env.PROD ? DEFAULT_DSN : '');

// One Docker image is promoted unchanged from staging to prod (see CLAUDE.md),
// so the environment tag cannot be baked at build time — derive it at runtime.
// GitHub Pages branch previews are the only builds with a non-root BASE_PATH.
export function detectEnvironment(): string {
  if (import.meta.env.BASE_URL !== '/') return 'preview';
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return 'development';
  if (host.includes('staging')) return 'staging';
  return 'production';
}
