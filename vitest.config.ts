import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────────────────
// SCAFFOLDING FOR THE `file:../sphere-ui` LINK ONLY.
//
// This whole block (the alias entries below and the `server.deps.inline`
// entry in the `test` config) exists solely to make `@unicitylabs/sphere-ui:
// file:../sphere-ui` in package.json work under vitest — see
// `tests/unit/dependency-hygiene.test.ts` for why that dependency is
// temporary. It has no purpose once that dependency reverts to a published
// semver range, and at that point it describes a problem that no longer
// exists. DELETE THIS ENTIRE BLOCK IN THE SAME COMMIT THAT REVERTS THE LINK.
//
// Why it exists at all: sphere-ui has its own nested node_modules (a real
// directory reached through the symlink, not deduped away by it) with its
// own copies of every package it shares with this repo — react, react-dom,
// framer-motion, the @dnd-kit/* trio, @tanstack/react-query,
// @tanstack/react-table. Node resolves each of THOSE bare imports against
// sphere-ui's own node_modules first (sibling directories are invisible to
// Node's upward node_modules walk either way), producing a second module
// instance of each — which surfaced as "Invalid hook call" / "Cannot read
// properties of null (reading 'useState')" inside ProjectLogo (rendered from
// sphere-ui) once the full suite ran, none of which is an actual bug in that
// component. `resolve.alias` rewrites the bare specifier itself before any
// directory walk happens, so every importer — this repo's own source AND
// anything inside the sphere-ui bundle — resolves to the exact same file.
const localPkg = (pkg: string) => fileURLToPath(new URL(`./node_modules/${pkg}`, import.meta.url));
const SHARED_WITH_SPHERE_UI = [
  'react', 'react-dom', 'framer-motion',
  '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities',
  '@tanstack/react-query', '@tanstack/react-table',
];
// ─────────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // Part of the `file:../sphere-ui` scaffolding above — see that comment;
    // delete this block in the same commit that removes it. Vitest's SSR
    // module runner externalizes node_modules packages by default — meaning
    // it hands them to plain Node `require`/`import` instead of Vite's own
    // transform+resolve pipeline, so `resolve.alias` above is silently
    // skipped for them. Scoped to sphere-ui itself plus the specific
    // dependencies of ITS that pull react in transitively (react-dropzone,
    // framer-motion, react-easy-crop) or are themselves a CJS offender
    // (@dnd-kit/core) — deliberately not `inline: true` for every package,
    // which would slow down every test file in this repo, not just the ones
    // that touch a sphere-ui component.
    server: {
      deps: {
        inline: [/@unicitylabs\/sphere-ui/, /react-dropzone/, /@dnd-kit/, /framer-motion/, /react-easy-crop/],
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
      ...Object.fromEntries(SHARED_WITH_SPHERE_UI.map(pkg => [pkg, localPkg(pkg)])),
    },
  },
});
