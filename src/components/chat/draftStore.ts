/**
 * Composer drafts that survive an unmount.
 *
 * Two things unmount a chat composer without the user deciding to leave: the locked-wallet
 * blocker (a lock can arrive from the idle timer, another tab, or a tab switch that trips the
 * resume gate) and the DM composer's own address-change reset, which fires whenever the
 * identity query goes away. Keeping the text in `useState` meant a half-typed message died in
 * either case — the same silent data loss #454 fixed for the group send path.
 *
 * A module-scoped map rather than React state on purpose: it has to outlive the component tree
 * that owns the input. Memory-only and never persisted — a draft is user content, and writing
 * it to storage would leave it readable behind the very lock screen this exists to survive.
 */

const drafts = new Map<string, string>();

/** `scope` distinguishes DM from group so an id collision cannot cross them. */
function keyOf(scope: 'dm' | 'group', id: string | null): string {
  return `${scope}:${id ?? ''}`;
}

export function getDraft(scope: 'dm' | 'group', id: string | null): string {
  return drafts.get(keyOf(scope, id)) ?? '';
}

export function setDraft(scope: 'dm' | 'group', id: string | null, value: string): void {
  if (value === '') {
    drafts.delete(keyOf(scope, id));
    return;
  }
  drafts.set(keyOf(scope, id), value);
}

/** Called once a message is actually sent — the draft is spent, not lost. */
export function clearDraft(scope: 'dm' | 'group', id: string | null): void {
  drafts.delete(keyOf(scope, id));
}

/** Wallet deleted / logged out: drafts belong to that wallet's conversations. */
export function clearAllDrafts(): void {
  drafts.clear();
}
