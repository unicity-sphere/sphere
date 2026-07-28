/**
 * The wallet origin holds the mnemonic seed, the private keys and the wallet state in
 * localStorage/IndexedDB. Any script served from a third party runs there with full DOM
 * and storage access, and its contents can change without a deploy or a review on our
 * side — a bundled npm dependency is pinned by the lockfile, a CDN <script src> is not.
 *
 * The Google tag also could not be pinned even in principle: gtag.js has no stable
 * content, so Subresource Integrity does not apply to it.
 *
 * The load-bearing assertion here is the same-origin one. It is not about Google — it
 * fails for ANY future CDN script added to this document, which is the regression this
 * file exists to prevent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(__dirname, '../../../src/index.html'), 'utf8');

/** `src="…"` of every <script> in the document, in order. */
function scriptSources(): string[] {
  return [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)].map((m) => m[1]);
}

/** `href="…"` of every <link> in the document. */
function linkHrefs(): string[] {
  return [...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/g)].map((m) => m[1]);
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null; // relative — same-origin by construction
  }
}

describe('index.html script origins', () => {
  it('executes no script from a third-party origin', () => {
    const external = scriptSources().filter((s) => hostOf(s) !== null);
    // Vite rewrites relative sources at build time; anything absolute here ships as-is.
    expect(external).toEqual([]);
  });

  it('loads nothing from googletagmanager.com', () => {
    // Note for future greps: "googletagmanager" does NOT contain the substring "gtag"
    // (…le-tag-man…), so searching only for `gtag` misses it.
    expect(html).not.toMatch(/googletagmanager\.com/);
  });

  it('declares no gtag/dataLayer globals', () => {
    expect(html).not.toMatch(/\bdataLayer\b/);
    expect(html).not.toMatch(/\bgtag\s*\(/);
  });

  it('still loads the runtime config before the module bundle', () => {
    // Deleting the analytics block must not disturb script ORDER: runtime-config.js is a
    // classic script that has to execute before the module bundle reads its values.
    const sources = scriptSources();
    const runtime = sources.findIndex((s) => s.includes('runtime-config.js'));
    const bundle = sources.findIndex((s) => s.includes('main.tsx'));
    expect(runtime).toBeGreaterThanOrEqual(0);
    expect(bundle).toBeGreaterThan(runtime);
  });

  it('has no inline script at all, which is what lets script-src be self', () => {
    // A CSP cannot distinguish our inline block from an injected one, so allowing
    // 'unsafe-inline' would make the policy meaningless on an origin holding a seed.
    // Both former inline blocks live in public/boot.js.
    const inline = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
      .filter(([, attrs, body]) => !/\bsrc=/.test(attrs) && body.trim() !== '');
    expect(inline).toEqual([]);
  });

  it('loads boot.js before the module bundle', () => {
    // boot.js applies the theme class and restores the SPA path; both must happen
    // before React reads the URL or paints.
    const sources = scriptSources();
    const boot = sources.findIndex((s) => s.includes('boot.js'));
    const bundle = sources.findIndex((s) => s.includes('main.tsx'));
    expect(boot).toBeGreaterThanOrEqual(0);
    expect(bundle).toBeGreaterThan(boot);
  });

  it('has exactly the Google Fonts pair as its only cross-origin links', () => {
    // A tripwire, not a pin: self-hosting the fonts is a separate change, and when it
    // lands this expectation becomes an empty array.
    const hosts = [...new Set(linkHrefs().map(hostOf).filter((h): h is string => h !== null))];
    expect(hosts.sort()).toEqual(['fonts.googleapis.com', 'fonts.gstatic.com']);
  });
});
