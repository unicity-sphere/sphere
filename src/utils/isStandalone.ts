/**
 * Canonical project `type` values, matching what sphere-api's marketplace
 * endpoints return in the `type` field of a project record.
 *
 * These constants do NOT protect against drift with the backend: there is no
 * shared package between this repo and sphere-api (or the other repos that
 * mirror the same value — sphere-backoffice, sphere-dev-portal). Each repo
 * holds its own copy of this string. If the API ever changes what it sends,
 * this file has to be updated by hand to match.
 */
export const PROJECT_TYPES = {
  APP: 'app',
  SKILL: 'skill',
  STANDALONE: 'standalone',
} as const;

export type ProjectType = (typeof PROJECT_TYPES)[keyof typeof PROJECT_TYPES];

/**
 * True when a project's `type` is `PROJECT_TYPES.STANDALONE` — it has a
 * public source repository and is cloned/installed and run on the user's own
 * machine, rather than opened inside Sphere (unlike `app` and `skill`, which
 * both launch in-app).
 *
 * Centralised so the handful of call sites that branch on this (ProjectPage's
 * action row, the desktop shortcut's launch/context-menu logic, both
 * marketplace card badges) share one place that knows the meaning of the type
 * union, instead of repeating the same string comparison — and so a future
 * fourth type doesn't need to be reasoned about at every call site by hand.
 *
 * Takes a minimal shape rather than the full `ProjectSummary` so it also
 * accepts the narrower inline project shape on `InstalledApp` (userApi.ts).
 */
export function isStandalone(project: { type: ProjectType }): boolean {
  return project.type === PROJECT_TYPES.STANDALONE;
}
