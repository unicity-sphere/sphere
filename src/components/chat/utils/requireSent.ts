/**
 * The chat SDK methods (`GroupChatModule.sendMessage`, `deleteMessage`,
 * `kickUser`, ...) catch their own errors and resolve to `null` on failure
 * instead of throwing. A mutation that wraps that as `return !!result` therefore
 * RESOLVES with `false` — react-query runs `onSuccess` (which clears the input),
 * the global `onError` toast never fires, and the user's typed message is
 * silently discarded.
 *
 * `requireSent` converts the silent `null`/`undefined` into a rejection so the
 * mutation fails: `onSuccess` is skipped (input preserved) and the global
 * `onError` toast surfaces the failure. Falsy-but-valid results (`''`, `0`) are
 * treated as success.
 */
export function requireSent<T>(result: T | null | undefined, action = 'send message'): T {
  if (result == null) {
    throw new Error(`Failed to ${action}`);
  }
  return result;
}
