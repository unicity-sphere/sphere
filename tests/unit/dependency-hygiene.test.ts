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
   * The companion tripwire. `vitest.config.ts`, `tsconfig.app.json` and
   * `tsconfig.test.json` each carry their own "SCAFFOLDING FOR THE
   * `file:../sphere-ui` LINK ONLY" block, solely to make the `file:`
   * dependency above work under vitest / tsc / the production build — none
   * has a purpose once that dependency reverts to a published semver range,
   * and at that point each describes a problem that no longer exists,
   * misleading the next reader into thinking this repo still needs it.
   * Without this assertion, the test above could go green on its own
   * (dependency reverted) while the scaffolding it was written to justify
   * sat there, dead and unexplained, in ANY of the three files, with nothing
   * failing to catch it — the exact blind spot this file exists to close for
   * the dependency itself. `tsconfig.app.json`'s is the one most worth
   * catching: unlike the vitest block it is mildly harmful even once dead,
   * since its `baseUrl: "."` newly permits accidental root-relative bare
   * imports that would otherwise be caught as unresolved. This assertion
   * only engages once the dependency is no longer a `file:` link (while it
   * still is, the scaffolding is expected and this is vacuously satisfied —
   * the test above is the one carrying that signal), so all tripwires clear
   * together.
   */
  it('requires the vitest/tsconfig scaffolding to be removed once the file: link is gone', () => {
    const version = packageJson.dependencies['@unicitylabs/sphere-ui'];
    const isFileLink = version.startsWith('file:');
    const marker = 'SCAFFOLDING FOR THE `file:../sphere-ui` LINK ONLY';
    const scaffoldedFiles = ['vitest.config.ts', 'tsconfig.app.json', 'tsconfig.test.json'];
    const hasScaffoldingMarker = scaffoldedFiles.some((file) =>
      readFileSync(join(process.cwd(), file), 'utf8').includes(marker),
    );

    expect(isFileLink || !hasScaffoldingMarker).toBe(true);
  });
});
