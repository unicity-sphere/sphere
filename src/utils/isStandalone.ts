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
 *
 * `type` is nullable even though `ProjectSummary.type` is declared required:
 * the schema default is `app`, and documents created before the `type` field
 * existed have none at all, so an absent type reaching this function at
 * runtime (despite what the TS type claims) must resolve the same way the
 * rest of the codebase treats it — as `app`, which is never standalone.
 */
export function isStandalone(project: { type: ProjectType | null | undefined }): boolean {
  return (project.type ?? PROJECT_TYPES.APP) === PROJECT_TYPES.STANDALONE;
}

/**
 * True when projects of this `type` participate in the quest system — have
 * quests, quest-derived stats (active quests / completions), etc.
 *
 * This is a capability question, not a "where does it run" question: gate
 * quest-derived UI on `supportsQuests`, never on `isStandalone`/`!isStandalone`
 * or a direct `type === ...` check. The distinction matters because the two
 * questions diverge on `skill`: a skill is a capability invoked by Astrid,
 * not something that runs a quest campaign, so it does NOT support quests —
 * even though it isn't standalone either (it launches in-app, same as
 * `app`). `isStandalone(skill)` is `false` and `supportsQuests(skill)` is
 * also `false`, but for unrelated reasons; do not assume `!isStandalone` and
 * `supportsQuests` are interchangeable.
 *
 * ONLY `app` supports quests. `type` is nullable: the schema default is
 * `app` and pre-migration documents may have no `type` at all, so an absent
 * type must fall back to `app` here too — treating it as "not app" would
 * make untyped (i.e. actually-app) projects silently stop supporting quests,
 * the same category of bug already corrected once for `skill`. This also
 * covers a project's own data still being loaded, when a call site hasn't
 * got a `type` to read yet at all.
 */
export function supportsQuests(type: ProjectType | null | undefined): boolean {
  return (type ?? PROJECT_TYPES.APP) === PROJECT_TYPES.APP;
}
