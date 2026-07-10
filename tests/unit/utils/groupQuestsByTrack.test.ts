import { describe, it, expect } from 'vitest';
import { groupQuestsByTrack } from '../../../src/utils/groupQuestsByTrack';
import type { ProjectQuest } from '../../../src/services/marketplaceApi';

function quest(id: string, track: ProjectQuest['track']): ProjectQuest {
  return {
    _id: id,
    title: `Quest ${id}`,
    description: '',
    points: 10,
    platform: null,
    imageUrl: null,
    tags: [],
    questType: 'SOCIAL',
    track,
  };
}

describe('groupQuestsByTrack', () => {
  it('groups quests by track slug, ordered by track sortOrder', () => {
    const groups = groupQuestsByTrack([
      quest('a', { slug: 'transact', title: 'Transact', sortOrder: 2 }),
      quest('b', { slug: 'account', title: 'Account', sortOrder: 1 }),
      quest('c', { slug: 'transact', title: 'Transact', sortOrder: 2 }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['account', 'transact']);
    expect(groups[1].quests.map((q) => q._id)).toEqual(['a', 'c']);
  });

  it('puts trackless quests into a trailing General group', () => {
    const groups = groupQuestsByTrack([
      quest('a', null),
      quest('b', { slug: 'account', title: 'Account', sortOrder: 5 }),
      quest('c', undefined as unknown as ProjectQuest['track']),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['account', 'general']);
    expect(groups[1].title).toBe('General');
    expect(groups[1].quests.map((q) => q._id)).toEqual(['a', 'c']);
  });

  it('preserves quest order inside each group', () => {
    const track = { slug: 't', title: 'T', sortOrder: 0 };
    const groups = groupQuestsByTrack([quest('1', track), quest('2', track), quest('3', track)]);
    expect(groups[0].quests.map((q) => q._id)).toEqual(['1', '2', '3']);
  });

  it('returns an empty list for no quests', () => {
    expect(groupQuestsByTrack([])).toEqual([]);
  });
});
