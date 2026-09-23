import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(process.cwd(), 'src');
const MODULE_DIR = join(SRC, 'modules', 'bridge');
const FORBIDDEN = [/modules\/bridge/, /@unicitylabs\/bridge-core/, /@unicitylabs\/bridge-plugin/, /['"]tronweb['"]/];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe('bridge module isolation', () => {
  it('is referenced by nothing outside src/modules/bridge', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      if (file.startsWith(MODULE_DIR)) continue;
      const src = readFileSync(file, 'utf8');
      if (FORBIDDEN.some((re) => re.test(src))) offenders.push(relative(process.cwd(), file));
    }
    expect(offenders).toEqual([]);
  });

  it('is discovered by the registry glob, not by an import', () => {
    const registry = readFileSync(join(SRC, 'modules', 'registry.ts'), 'utf8');
    expect(registry).toMatch(/import\.meta\.glob/);
    expect(registry).not.toMatch(/from '\.\/bridge/);
  });
});
