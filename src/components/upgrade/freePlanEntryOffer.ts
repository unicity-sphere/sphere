/**
 * Once-per-app-load gate for the free-plan offer on wallet entry (sphere#496).
 *
 * Module-level rather than storage-backed on purpose: one offer per entry is
 * the agreed behaviour, and a reload is a new entry. If that turns out to nag,
 * throttle it HERE (planMemory, the downgrade watcher's pattern) rather than
 * spreading the rule across call sites.
 *
 * Its own module because FreePlanEntryWatcher may only export components
 * (react-refresh).
 */
let offered = false;

export function freePlanEntryOffered(): boolean {
  return offered;
}

export function markFreePlanEntryOffered() {
  offered = true;
}

/** Test seam: lets a suite replay the once-per-load gate. */
export function resetFreePlanEntryOffer() {
  offered = false;
}
