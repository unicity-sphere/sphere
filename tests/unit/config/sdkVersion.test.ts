/**
 * `/developers/docs` prints SDK_VERSION as the version it documents. That value has
 * to be a literal (see src/config/sdkVersion.ts for why nothing else is available in
 * the client bundle), and an unguarded literal is how the page came to advertise
 * `v0.4.7` long after the pin had moved on.
 *
 * This is the guard: the label is wrong the moment it stops matching the pin, and it
 * fails here rather than shipping a stale version number to every reader.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SDK_VERSION } from '../../../src/config/sdkVersion';

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../../../package.json'), 'utf8'),
) as { dependencies?: Record<string, string> };

describe('SDK_VERSION', () => {
  it('matches the @unicitylabs/sphere-sdk pin in package.json', () => {
    expect(pkg.dependencies?.['@unicitylabs/sphere-sdk']).toBe(SDK_VERSION);
  });

  it('is an exact pin, not a range', () => {
    // A range would make "the version this page documents" unanswerable.
    expect(SDK_VERSION).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/);
  });
});
