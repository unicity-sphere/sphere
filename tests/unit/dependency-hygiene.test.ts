// tests/unit/dependency-hygiene.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Blocks this branch from reaching `main` with the sphere-ui workspace link
 * still in place.
 *
 * `@unicitylabs/sphere-ui` is temporarily `dependencies["@unicitylabs/sphere-ui"]:
 * "file:../sphere-ui"` (see vitest.config.ts's own "SCAFFOLDING FOR THE
 * `file:../sphere-ui` LINK ONLY" comment, and MEMORY.md's SDK rule 3) because
 * the announcement centre (bell, popover, modal) only exists on sphere-ui's
 * unmerged `feat/announcements` branch — not yet published to npm.
 *
 * Without this test, the only thing standing between this state and `main`
 * is the production Dockerfile: it copies `package*.json` and runs
 * `npm install` inside a build context that excludes `../sphere-ui`, so a
 * `file:` dependency there fails to resolve — but that failure surfaces deep
 * in a container build log, as a generic "not found" error, with nothing
 * connecting it back to this cause. This test states the actual blocker in
 * one line instead, and goes green by itself the moment the dependency is
 * reverted to a published semver range (which should happen together with
 * deleting the scaffolding block in vitest.config.ts).
 */
describe('dependency hygiene', () => {
  const packageJson = JSON.parse(
    readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
  ) as { dependencies: Record<string, string> };

  it('requires @unicitylabs/sphere-ui to be a published range before merge, not a local file: link', () => {
    const version = packageJson.dependencies['@unicitylabs/sphere-ui'];
    expect(version.startsWith('file:')).toBe(false);
  });

  /**
   * The companion tripwire. `vitest.config.ts`'s own "SCAFFOLDING FOR THE
   * `file:../sphere-ui` LINK ONLY" block exists solely to make the `file:`
   * dependency above work under vitest — it has no purpose once that
   * dependency reverts to a published semver range, and at that point it
   * describes a problem that no longer exists, misleading the next reader
   * into thinking this repo still needs it. Without this assertion, the test
   * above could go green on its own (dependency reverted) while the
   * scaffolding it was written to justify sat there, dead and unexplained,
   * with nothing failing to catch it — the exact blind spot this file exists
   * to close for the dependency itself. This assertion only engages once the
   * dependency is no longer a `file:` link (while it still is, the
   * scaffolding is expected and this is vacuously satisfied — the test above
   * is the one carrying that signal), so both tripwires clear together.
   */
  it('requires vitest.config.ts scaffolding to be removed once the file: link is gone', () => {
    const version = packageJson.dependencies['@unicitylabs/sphere-ui'];
    const isFileLink = version.startsWith('file:');
    const vitestConfigSource = readFileSync(join(process.cwd(), 'vitest.config.ts'), 'utf8');
    const hasScaffoldingMarker = vitestConfigSource.includes('SCAFFOLDING FOR THE `file:../sphere-ui` LINK ONLY');

    expect(isFileLink || !hasScaffoldingMarker).toBe(true);
  });
});
