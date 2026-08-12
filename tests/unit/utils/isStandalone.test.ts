import { describe, it, expect } from 'vitest';
import {
  PROJECT_TYPES,
  isStandalone,
  supportsQuests,
  isChatAgent,
  hasQuestSurface,
} from '../../../src/utils/isStandalone';

describe('isStandalone', () => {
  it('is true only for a standalone project', () => {
    expect(isStandalone({ type: PROJECT_TYPES.STANDALONE })).toBe(true);
    expect(isStandalone({ type: PROJECT_TYPES.APP })).toBe(false);
    expect(isStandalone({ type: PROJECT_TYPES.SKILL })).toBe(false);
  });

  // The schema default is `app`, and documents created before the `type`
  // field existed have none at all — the rest of the codebase reads an
  // absent type as `app`, so this must too (`app` is never standalone).
  // Treating an absent type as "not app" here would be harmless by
  // coincidence (undefined !== 'standalone' either way) but the fallback is
  // made explicit anyway, matching supportsQuests below and guarding against
  // this function's comparison ever changing shape later.
  it('treats an absent type as app (not standalone)', () => {
    expect(isStandalone({ type: null })).toBe(false);
    expect(isStandalone({ type: undefined })).toBe(false);
  });
});

describe('supportsQuests', () => {
  it('is true for app only', () => {
    expect(supportsQuests(PROJECT_TYPES.APP)).toBe(true);
  });

  // A skill is a capability invoked by Astrid, not something that runs a
  // quest campaign — it does not support quests, even though (like app) it
  // launches in-app rather than running standalone. Pinned separately from
  // isStandalone's own test above: the two predicates must NOT be treated as
  // interchangeable (isStandalone(skill) is also false, but for an unrelated
  // reason).
  it('is false for skill', () => {
    expect(supportsQuests(PROJECT_TYPES.SKILL)).toBe(false);
  });

  it('is false for standalone', () => {
    expect(supportsQuests(PROJECT_TYPES.STANDALONE)).toBe(false);
  });

  // The schema default is `app`, and pre-migration documents may have no
  // `type` field at all — an absent type must resolve to `app` (and
  // therefore true), never to "not app". Getting this backwards would make
  // untyped (i.e. actually-app) projects silently stop supporting quests —
  // the same category of bug already caught once on the `skill` case, just
  // triggered by missing data instead of a wrong predicate.
  it('treats an absent type as app (true), not as "not app"', () => {
    expect(supportsQuests(null)).toBe(true);
    expect(supportsQuests(undefined)).toBe(true);
  });

  it('recognises chat agents and keeps supportsQuests app-only', () => {
    expect(isChatAgent({ type: 'chat-agent' })).toBe(true);
    expect(isChatAgent({ type: null })).toBe(false);
    expect(supportsQuests('chat-agent')).toBe(false);
    expect(supportsQuests('app')).toBe(true);
  });
});

describe('hasQuestSurface', () => {
  it('excludes standalone and chat agents only', () => {
    expect(hasQuestSurface({ type: 'app' })).toBe(true);
    expect(hasQuestSurface({ type: 'skill' })).toBe(true);
    expect(hasQuestSurface({ type: 'standalone' })).toBe(false);
    expect(hasQuestSurface({ type: 'chat-agent' })).toBe(false);
  });
});
