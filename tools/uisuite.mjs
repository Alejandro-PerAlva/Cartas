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
  { name: 'anemia', hero: 'anc2', config: { modules: ['anemia'] }, seed: 31 },
  { name: 'anemia+reglas', hero: 'anc3', config: { modules: ['anemia', 'realms', 'troll'], variants: { diablillo: true, pueblo: true, motivacion: true, ceroEnergia: true, gastarXP: true, justoAntesDeMorir: true, enfrentarseParca: true, entornosTematicos: true, muertesAtroces: true, lugaresRetiro: true, encantamientos: true, momentosPaz: true } }, seed: 32 },
  { name: 'anemia-sin-retorno', hero: 'c1', config: { modules: ['anemia'], variants: { sinRetorno: true } }, seed: 33, steps: 2400 },
  { name: 'anemia-hogar', hero: 'anc5', config: { modules: ['anemia'], variants: { hogarSonado: true } }, seed: 34 },
  { name: 'metal-inmortal', hero: 'anc1', config: { modules: ['anemia'], variants: { metalInmortal: true } }, seed: 35 },
  { name: 'gnome-custom', hero: 'custom', config: { modules: ['gnome'], custom: { race: 'Enano', klass: 'Guardián', sign: 'De la Tortuga', skill: 'Parar con el Escudo', equipment: 'Hacha' } }, seed: 28 },
];
const mobile = process.argv[2] === 'móvil';
const results = [];
const only = (process.argv[3] || '').split(',').filter(Boolean);   // node tools/uisuite.mjs móvil base,anemia  → solo esos casos
for (const c of CASES.filter((x) => !only.length || only.includes(x.name))) {
  const r = await playUI({ seed: c.seed, hero: c.hero, god: true, config: c.config, maxSteps: c.steps || 900, shots: false, quiet: true, speedK: 0.08, ...(mobile ? { width: 844, height: 390, touch: true } : {}) });
  const ok = !r.errors.length && !r.log.some((l) => l.startsWith('ATASCADO')) && r.info.over;
  results.push({ name: c.name, ok, info: r.info, errors: r.errors.slice(0, 3), log: r.log.slice(0, 3), seen: r.seen.size });
  console.log(ok ? '✔' : '✖', c.name.padEnd(20), JSON.stringify(r.info), r.errors.slice(0, 2).join(' | '), r.log.slice(0, 2).join(' | '));
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
