import type { MyRating } from '../../services/userApi';

export interface HiddenNotice { at: string; reason: string | null }

/** The author's own review, reduced to whether a moderator hid it. */
export function hiddenNoticeFor(mine: MyRating | undefined): HiddenNotice | null {
  if (!mine?.hiddenAt) return null;
  return { at: mine.hiddenAt, reason: mine.hiddenReason };
}
