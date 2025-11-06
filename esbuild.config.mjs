import esbuild from 'esbuild';
import { readFileSync } from 'fs';

const production = process.argv[2] === 'production';
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));

esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'main.js',
  external: [
    'obsidian',
    'electron',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common'
  ],
  format: 'cjs',
  platform: 'browser',
  target: 'es2018',
  sourcemap: production ? false : 'inline',
  minify: production,
  treeShaking: true,
  banner: { js: `/* ${manifest.name} v${manifest.version} */` },
  logLevel: 'info'
}).catch(() => process.exit(1));

