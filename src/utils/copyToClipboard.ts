/**
 * Copy text to the clipboard without ever throwing.
 *
 * `navigator.clipboard` does not exist outside a "secure context" (HTTPS or
 * localhost) — and Sphere is routinely opened over plain http on a LAN
 * address during development and demos. Reading the property there throws a
 * TypeError, which — in a click handler with no try/catch — becomes a dead
 * button and a console error with zero feedback to the user. Even when the
 * modern API IS present, `writeText` returns a promise that can reject:
 * permission denied, or the document not being focused (e.g. the click came
 * from inside an iframe, or the window lost focus).
 *
 * The `document.execCommand('copy')` fallback below is what makes "Copy"
 * work at all on plain http — do not delete it as dead/legacy code. It
 * copies via a temporary off-screen `<textarea>`: select the text, ask the
 * browser to copy the current selection, then clean up. `execCommand` is
 * deprecated but still implemented everywhere Sphere runs, and there is no
 * secure-context-free replacement for it.
 *
 * Sphere is a wallet: what gets copied here is addresses, mnemonics,
 * transaction ids and install commands. A copy that silently does nothing
 * while the UI implies it worked is worse than an ordinary app's clipboard
 * bug — a user could paste a stale value into a transfer. So this function
 * never throws; callers get a boolean and decide how to reflect it.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy path — e.g. permission denied, or the
      // document not being focused (iframe click, backgrounded window).
    }
  }

  return legacyCopy(text);
}

/** `execCommand('copy')` via a temporary off-screen textarea. Never throws. */
function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined' || !document.body) return false;

  const previousFocus = document.activeElement as HTMLElement | null;
  const textarea = document.createElement('textarea');
  try {
    textarea.value = text;
    // Keep it out of the layout and off-screen so nothing visibly flashes.
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.opacity = '0';
    textarea.setAttribute('readonly', '');

    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    return document.execCommand('copy') === true;
  } catch {
    return false;
  } finally {
    if (textarea.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
    // Restore focus/selection to whatever had it before we hijacked it.
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
  }
}
