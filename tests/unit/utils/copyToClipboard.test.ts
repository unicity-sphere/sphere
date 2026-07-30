/**
 * copyToClipboard must never throw or reject — see src/utils/copyToClipboard.ts
 * for why: navigator.clipboard does not exist outside a secure context (Sphere
 * is routinely opened over plain http on a LAN address), and even when it does
 * exist, writeText can reject (permission denied, document not focused). The
 * legacy execCommand('copy') fallback via a temporary textarea is what makes
 * copy work at all in the no-Clipboard-API case, so every fallback path is
 * covered here, including that the temporary textarea never survives the call.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { copyToClipboard } from '../../../src/utils/copyToClipboard';

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', {
    value,
    configurable: true,
    writable: true,
  });
}

function textareaCount(): number {
  return document.querySelectorAll('textarea').length;
}

// jsdom does not implement document.execCommand at all (the property is
// absent, not just a no-op), so vi.spyOn — which requires the property to
// already exist — can't be used here. Define it directly instead.
const originalExecCommandDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand');

function setExecCommand(impl: (command: string) => boolean) {
  Object.defineProperty(document, 'execCommand', {
    value: vi.fn(impl),
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
  } else {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  }
  if (originalExecCommandDescriptor) {
    Object.defineProperty(document, 'execCommand', originalExecCommandDescriptor);
  } else {
    // @ts-expect-error test cleanup — restore jsdom's default "not defined" state
    delete document.execCommand;
  }
});

describe('copyToClipboard', () => {
  it('returns true when the modern Clipboard API succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    const result = await copyToClipboard('hello');

    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(textareaCount()).toBe(0);
  });

  it('falls back to execCommand when navigator.clipboard is unavailable, and returns the fallback result', async () => {
    setClipboard(undefined);
    setExecCommand(() => true);

    const result = await copyToClipboard('fallback text');

    expect(result).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(textareaCount()).toBe(0);
  });

  it('does not throw when writeText rejects, and falls back (returning false when the fallback also fails)', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('document not focused'));
    setClipboard({ writeText });
    setExecCommand(() => false);

    await expect(copyToClipboard('secret')).resolves.toBe(false);
    expect(textareaCount()).toBe(0);
  });

  it('returns false when the fallback execCommand reports failure', async () => {
    setClipboard(undefined);
    setExecCommand(() => false);

    const result = await copyToClipboard('nope');

    expect(result).toBe(false);
    expect(textareaCount()).toBe(0);
  });

  it('cleans up the temporary textarea even when execCommand throws', async () => {
    setClipboard(undefined);
    setExecCommand(() => {
      throw new Error('boom');
    });

    const result = await copyToClipboard('boom text');

    expect(result).toBe(false);
    expect(textareaCount()).toBe(0);
  });

  it('never throws for a rejecting writeText even when the fallback API is entirely missing', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    setClipboard({ writeText });
    // Simulate an environment with neither modern nor legacy copy support.
    setExecCommand(() => false);

    await expect(copyToClipboard('x')).resolves.toBe(false);
  });
});
