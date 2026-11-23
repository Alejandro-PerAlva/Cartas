/**
 * Batería de partidas de interfaz: juega varias configuraciones pulsando la UI real (escritorio y móvil)
 * y falla si hay errores de JavaScript, partidas atascadas o pantallas sin salida.
 *   node tools/uisuite.mjs [rápida|completa]
 */
import { playUI } from './uibot.mjs';

const MODS_ALL = ['loot_lore', 'fanny_pack', 'beasts', 'realms', 'troll', 'iron_chest'];
const CASES = [
  { name: 'base', hero: 'c1', config: {}, seed: 21 },
  { name: 'howling', hero: 'c3', config: { modules: ['howling'] }, seed: 22 },
  { name: 'realms+iron_chest', hero: 'c4', config: { modules: ['realms', 'iron_chest'] }, seed: 23 },
  { name: 'troll', hero: 'c2', config: { modules: ['troll'] }, seed: 24 },
  { name: 'beasts', hero: 'c11', config: { modules: ['beasts'] }, seed: 25 },
  { name: 'spire', hero: 'c1', config: { campaign: 'spire' }, seed: 26 },
  { name: 'throne+todos', hero: 'c1', config: { campaign: 'throne', modules: MODS_ALL }, seed: 27 },
  { name: 'gnome-custom', hero: 'custom', config: { modules: ['gnome'], custom: { race: 'Enano', klass: 'Guardián', sign: 'De la Tortuga', skill: 'Parar con el Escudo', equipment: 'Hacha' } }, seed: 28 },
];
const mobile = process.argv[2] === 'móvil';
const results = [];
for (const c of CASES) {
  const r = await playUI({ seed: c.seed, hero: c.hero, god: true, config: c.config, maxSteps: 900, shots: false, quiet: true, speedK: 0.08, ...(mobile ? { width: 844, height: 390, touch: true } : {}) });
  const ok = !r.errors.length && !r.log.some((l) => l.startsWith('ATASCADO')) && r.info.over;
  results.push({ name: c.name, ok, info: r.info, errors: r.errors.slice(0, 3), log: r.log.slice(0, 3), seen: r.seen.size });
  console.log(ok ? '✔' : '✖', c.name.padEnd(20), JSON.stringify(r.info), r.errors.slice(0, 2).join(' | '), r.log.slice(0, 2).join(' | '));
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
