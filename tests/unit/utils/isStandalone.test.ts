import { describe, it, expect } from 'vitest';
import { PROJECT_TYPES, isStandalone, supportsQuests } from '../../../src/utils/isStandalone';

describe('isStandalone', () => {
  it('is true only for a standalone project', () => {
    expect(isStandalone({ type: PROJECT_TYPES.STANDALONE })).toBe(true);
    expect(isStandalone({ type: PROJECT_TYPES.APP })).toBe(false);
    expect(isStandalone({ type: PROJECT_TYPES.SKILL })).toBe(false);
  });
});

describe('supportsQuests', () => {
  it('is true for app and skill', () => {
    expect(supportsQuests(PROJECT_TYPES.APP)).toBe(true);
    expect(supportsQuests(PROJECT_TYPES.SKILL)).toBe(true);
  });

  it('is false for standalone', () => {
    expect(supportsQuests(PROJECT_TYPES.STANDALONE)).toBe(false);
  });

  // Accepts null/undefined so a call site doesn't need an extra guard while
  // the project it's asking about is still loading.
  it('is false for null/undefined (no project loaded yet)', () => {
    expect(supportsQuests(null)).toBe(false);
    expect(supportsQuests(undefined)).toBe(false);
  });
});
