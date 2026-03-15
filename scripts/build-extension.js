/**
 * Build script for Sphere full-tab Chrome extension.
 * Builds the SPA + background, content, and inject scripts separately.
 */

import { build } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist-extension');
const platformDir = resolve(root, 'platform/extension');

/**
 * Copy directory recursively.
 */
function copyDir(src, dest, exclude = []) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  for (const file of readdirSync(src)) {
    if (exclude.includes(file)) continue;
    const srcPath = resolve(src, file);
    const destPath = resolve(dest, file);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath, exclude);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Post-process index.html to remove inline scripts (CSP compliance).
 * - Remove GTAG inline scripts
 * - Replace theme init inline script with external file reference
 */
function postProcessHtml(htmlPath) {
  let html = readFileSync(htmlPath, 'utf-8');

  // Remove Google Analytics script tag and inline gtag code
  html = html.replace(
    /\s*<!-- Google tag \(gtag\.js\) -->[\s\S]*?<\/script>\s*<script>[\s\S]*?gtag\('config'[^)]*\);\s*<\/script>/,
    '',
  );

  // Replace inline theme init script with external file reference
  html = html.replace(
    /\s*<script>\s*\/\/ Prevent FOUC[\s\S]*?<\/script>/,
    '\n    <script src="theme-init.js"></script>',
  );

  // Fix relative paths: after moving from src/ to root, "../" should be "./"
  html = html.replace(/"\.\.\//g, '"./');

  writeFileSync(htmlPath, html);
  console.log('Post-processed index.html (removed inline scripts, fixed paths)');
}

async function buildExtension() {
  console.log('Building Sphere full-tab Chrome extension...\n');

  // Clean dist directory
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true });
  }
  mkdirSync(distDir, { recursive: true });

  // Step 1: Build SPA with HashRouter and extension platform flag
  console.log('Step 1: Building SPA...');
  await build({
    configFile: resolve(root, 'vite.config.ts'),
    define: {
      'import.meta.env.VITE_HASH_ROUTER': JSON.stringify('true'),
      'import.meta.env.VITE_PLATFORM': JSON.stringify('extension'),
    },
    build: {
      outDir: distDir,
      emptyOutDir: false,
    },
    base: './',
  });

  // Move index.html from dist-extension/src/ to dist-extension/ (html-from-src plugin)
  const srcHtml = resolve(distDir, 'src/index.html');
  const destHtml = resolve(distDir, 'index.html');
  if (existsSync(srcHtml)) {
    const srcDir = resolve(distDir, 'src');
    copyFileSync(srcHtml, destHtml);
    rmSync(srcDir, { recursive: true });
  }

  // Step 2: Post-process index.html for CSP compliance
  console.log('\nStep 2: Post-processing index.html...');
  postProcessHtml(destHtml);

  // Step 3: Build background service worker
  // Background now bundles the full SDK (Sphere, crypto, Nostr) so it needs
  // Node polyfills for Buffer/process used by elliptic/crypto-js.
  console.log('\nStep 3: Building background script...');
  await build({
    configFile: false,
    publicDir: false,
    plugins: [
      nodePolyfills({
        globals: { Buffer: true, process: true },
      }),
    ],
    resolve: {
      preserveSymlinks: true,
    },
    build: {
      outDir: distDir,
      emptyOutDir: false,
      lib: {
        entry: resolve(platformDir, 'background/index.ts'),
        name: 'background',
        formats: ['es'],
        fileName: () => 'background.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
      target: 'esnext',
      minify: false,
      sourcemap: true,
    },
  });

  // Step 4: Build content script
  console.log('\nStep 4: Building content script...');
  await build({
    configFile: false,
    publicDir: false,
    resolve: {
      preserveSymlinks: true,
    },
    build: {
      outDir: distDir,
      emptyOutDir: false,
      lib: {
        entry: resolve(platformDir, 'content/index.ts'),
        name: 'content',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
      target: 'esnext',
      minify: false,
      sourcemap: true,
    },
  });

  // Step 5: Build inject script
  console.log('\nStep 5: Building inject script...');
  await build({
    configFile: false,
    publicDir: false,
    resolve: {
      preserveSymlinks: true,
    },
    build: {
      outDir: distDir,
      emptyOutDir: false,
      lib: {
        entry: resolve(platformDir, 'inject/index.ts'),
        name: 'inject',
        formats: ['iife'],
        fileName: () => 'inject.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
      target: 'esnext',
      minify: false,
      sourcemap: true,
    },
  });

  // Step 6: Copy extension assets
  console.log('\nStep 6: Copying extension assets...');

  // Copy manifest.json with version from package.json
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
  const manifest = JSON.parse(readFileSync(resolve(platformDir, 'manifest.json'), 'utf-8'));
  manifest.version = pkg.version || '0.0.1';
  writeFileSync(resolve(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`manifest.json version set to ${manifest.version}`);

  // Copy icons
  copyDir(resolve(platformDir, 'icons'), resolve(distDir, 'icons'));

  // Copy theme-init.js
  copyFileSync(resolve(platformDir, 'theme-init.js'), resolve(distDir, 'theme-init.js'));

  console.log('\n✅ Extension build complete!');
  console.log(`Extension files are in ${distDir}`);
  console.log('Load unpacked extension from dist-extension/ in chrome://extensions');
}

buildExtension().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
