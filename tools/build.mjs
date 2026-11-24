#!/usr/bin/env node
/**
 * Empaqueta js/main.js en app.bundle.js (IIFE, funciona con file://) y genera pwa-assets.json + hash en sw.js.
 */
import { build } from 'esbuild';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'iron_helm_game');
const watch = process.argv.includes('--watch');
const opts = {
  entryPoints: [path.join(root, 'js', 'main.js')], bundle: true, format: 'iife', target: ['es2020', 'safari14', 'chrome90', 'firefox90'],
  outfile: path.join(root, 'app.bundle.js'), minify: !watch, sourcemap: false, legalComments: 'none', logLevel: 'info',
  banner: { js: '/* IRON HELM · generado por tools/build.mjs desde js/ — no editar a mano */' },
};

function walkRel(relDir) {
  const out = [];
  const base = path.join(root, relDir);
  if (!fs.existsSync(base)) return out;
  for (const e of fs.readdirSync(base, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.startsWith('.') || e.name === 'Thumbs.db' || e.name === 'desktop.ini') continue;
    const rel = relDir ? `${relDir}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walkRel(rel));
    else out.push(rel.replace(/\\/g, '/'));
  }
  return out;
}

/** Genera pwa-assets.json y actualiza la versión de caché de sw.js sin afectar al APK ni a file://. */
function writePwaAssets() {
  const ESSENTIAL_CARDS = [
    'assets/cards/base/card_009.jpg', 'assets/cards/base/card_010.jpg', 'assets/cards/base/card_011.jpg',
    'assets/cards/base/card_024.jpg', 'assets/cards/base/card_037.jpg', 'assets/cards/base/card_055.jpg',
    'assets/cards/base/card_061.jpg', 'assets/cards/base/card_074.jpg', 'assets/cards/base/card_075.jpg',
    'assets/cards/base/card_080.jpg', 'assets/cards/base/card_091.jpg',
  ].filter((p) => fs.existsSync(path.join(root, p)));

  const core = [
    'index.html', 'manifest.webmanifest', 'app.bundle.js', 'css/style.css',
    ...walkRel('fonts'), ...walkRel('icons'),
    ...walkRel('assets/mats'), ...walkRel('assets/textures'), ...walkRel('assets/tokens'),
    ...ESSENTIAL_CARDS,
  ].filter((p) => fs.existsSync(path.join(root, p)));

  const cards = [
    ...walkRel('assets/cards/base'),
    ...walkRel('assets/cards/expansions'),
  ];

  const h = crypto.createHash('sha256');
  for (const p of core) {
    h.update(p + '\0');
    h.update(fs.readFileSync(path.join(root, p)));
    h.update('\0');
  }
  h.update(`cards:${cards.length}\n`);
  const version = h.digest('hex').slice(0, 12);

  const manifest = { version, core: ['./', ...core.map((p) => './' + p)], base: walkRel('assets/cards/base').map((p) => './' + p), cards: cards.map((p) => './' + p) };
  fs.writeFileSync(path.join(root, 'pwa-assets.json'), JSON.stringify(manifest) + '\n');

  const swPath = path.join(root, 'sw.js');
  if (fs.existsSync(swPath)) {
    const src = fs.readFileSync(swPath, 'utf8');
    const next = src.replace(/const CACHE_VER = '[^']+';/, `const CACHE_VER = 'ih-core-${version}';`);
    if (next !== src) fs.writeFileSync(swPath, next);
  }
}

if (watch) {
  const { context } = await import('esbuild');
  const ctx = await context(opts);
  await ctx.watch();
  writePwaAssets();
  console.log('observando cambios…');
} else {
  await build(opts);
  writePwaAssets();
}
