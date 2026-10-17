// Bundles src/index.js into dist/ as a single self-contained file (ESM + IIFE).
import { build } from 'esbuild';
import { readFileSync, mkdirSync, statSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const banner = `/*! asciiiii v${pkg.version} — ${pkg.homepage} — MIT */`;
mkdirSync('dist', { recursive: true });

const common = {
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: ['es2022'],
  banner: { js: banner },
  legalComments: 'none',
};

await build({ ...common, format: 'esm', outfile: 'dist/ascii-art.min.js' });
await build({ ...common, format: 'iife', globalName: 'asciiiii', outfile: 'dist/ascii-art.iife.js' });
await build({ ...common, entryPoints: ['src/core.js'], format: 'esm', outfile: 'dist/ascii-art.core.min.js' });

for (const f of ['dist/ascii-art.min.js', 'dist/ascii-art.iife.js', 'dist/ascii-art.core.min.js']) {
  console.log(`${f}  ${(statSync(f).size / 1024).toFixed(1)} kB`);
}
