#!/usr/bin/env node
/** Empaqueta js/main.js en un único app.bundle.js (IIFE) que funciona abriendo index.html directamente (file://). */
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'iron_helm_game');
const watch = process.argv.includes('--watch');
const opts = {
  entryPoints: [path.join(root, 'js', 'main.js')], bundle: true, format: 'iife', target: ['es2020', 'safari14', 'chrome90', 'firefox90'],
  outfile: path.join(root, 'app.bundle.js'), minify: !watch, sourcemap: false, legalComments: 'none', logLevel: 'info',
  banner: { js: '/* IRON HELM · generado por tools/build.mjs desde js/ — no editar a mano */' },
};
if (watch) { const { context } = await import('esbuild'); const ctx = await context(opts); await ctx.watch(); console.log('observando cambios…'); }
else await build(opts);
