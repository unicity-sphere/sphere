/**
 * Returns true only when `value` is a string that parses as a URL whose
 * protocol is exactly `https:`.
 *
 * Gates any anchor `href` sourced from server data (e.g. a marketplace
 * project's `repoUrl` / `websiteUrl`) before it is rendered. This app is the
 * wallet — the same origin that holds the user's keys — so a stored
 * `javascript:` (or any other non-https) value reaching an `href` would
 * execute in that origin on click. Server-side validation
 * (`assertRepoUrl` in sphere-api) is not a substitute for this: the client
 * must not trust the server completely, since admin/migration/seed paths
 * can write values that skip the usual validated write path.
 */
export function isHttpsUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}
