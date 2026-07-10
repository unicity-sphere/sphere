import type { ProjectQuest } from '../services/marketplaceApi';

export interface QuestTrackGroup {
  /** Track slug, or 'general' for trackless quests. */
  key: string;
  title: string;
  sortOrder: number;
  quests: ProjectQuest[];
}

/**
 * Group marketplace quests by their (active) track, ordered by track
 * sortOrder. Trackless quests fall into a trailing "General" group.
 */
export function groupQuestsByTrack(quests: ProjectQuest[]): QuestTrackGroup[] {
  const groups = new Map<string, QuestTrackGroup>();
  for (const quest of quests) {
    const key = quest.track?.slug ?? 'general';
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        title: quest.track?.title ?? 'General',
        sortOrder: quest.track ? quest.track.sortOrder : Number.MAX_SAFE_INTEGER,
        quests: [],
      };
      groups.set(key, group);
    }
    group.quests.push(quest);
  }
  return [...groups.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
  );
}
