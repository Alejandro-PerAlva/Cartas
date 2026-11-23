import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, buildCatalog, listPacks } from '../iron_helm_game/js/engine/index.js';
import { play, audit, mulberry } from './helpers/bot.js';

const OLD = ['loot_lore', 'fanny_pack', 'beasts'];
const NEW = ['realms', 'troll', 'iron_chest', 'gnome'];
const ALL_MODULES = [...OLD, ...NEW]; // The Howling Abyss es exclusivo (mazo de mazmorra): se prueba aparte y con todo
/** ANEMIA 4.0: todas las variantes que se pueden combinar a la vez (Hogar Soñado, Sin Retorno y Metal Inmortal se prueban aparte) */
const VARIANTS_MIX = { diablillo: true, pueblo: true, motivacion: true, ceroEnergia: true, gastarXP: true, justoAntesDeMorir: true, enfrentarseParca: true,
  entornosTematicos: true, muertesAtroces: true, lugaresRetiro: true, encantamientos: true, momentosPaz: true };
const CONFIGS = [
  { name: 'base', config: {} },
  { name: 'warren', config: { campaign: 'warren' } },
  { name: 'blackened', config: { campaign: 'blackened' } },
  { name: 'módulos', config: { modules: OLD } },
  { name: 'warren+módulos', config: { campaign: 'warren', modules: OLD } },
  { name: 'blackened+módulos', config: { campaign: 'blackened', modules: OLD } },
  // campañas nuevas, solas
  { name: 'galnok', config: { campaign: 'galnok' } },
  { name: 'crystal', config: { campaign: 'crystal' } },
  { name: 'throne', config: { campaign: 'throne' } },
  { name: 'malicia', config: { campaign: 'malicia' } },
  { name: 'spire', config: { campaign: 'spire' } },
  // cada módulo solo
  { name: 'loot_lore', config: { modules: ['loot_lore'] } },
  { name: 'fanny_pack', config: { modules: ['fanny_pack'] } },
  { name: 'beasts', config: { modules: ['beasts'] } },
  { name: 'realms', config: { modules: ['realms'] } },
  { name: 'troll', config: { modules: ['troll'] } },
  { name: 'howling', config: { modules: ['howling'] } },
  { name: 'iron_chest', config: { modules: ['iron_chest'] } },
  { name: 'gnome', config: { modules: ['gnome'] }, custom: true },
  // combinaciones
  { name: 'troll+realms+iron_chest+gnome', config: { modules: NEW }, custom: true },
  { name: 'spire+todos', config: { campaign: 'spire', modules: [...ALL_MODULES, 'howling'] }, custom: true },
  { name: 'malicia+todos', config: { campaign: 'malicia', modules: [...ALL_MODULES, 'howling'] }, custom: true },
  { name: 'galnok+todos', config: { campaign: 'galnok', modules: ALL_MODULES } },
  // ANEMIA 4.0 (modo fanmade) y sus reglas variantes
  { name: 'anemia', config: { modules: ['anemia'] } },
  { name: 'anemia+módulos', config: { modules: ['anemia', ...ALL_MODULES] }, custom: true },
  { name: 'anemia+todas las variantes', config: { modules: ['anemia', 'realms', 'troll', 'beasts', 'fanny_pack', 'loot_lore'], variants: VARIANTS_MIX } },
  { name: 'anemia+hogar soñado', config: { modules: ['anemia', 'realms', 'troll'], variants: { ...VARIANTS_MIX, hogarSonado: true } } },
  { name: 'anemia+sin retorno', config: { modules: ['anemia', 'realms', 'troll'], variants: { ...VARIANTS_MIX, sinRetorno: true } } },
  { name: 'anemia+sin retorno+campaña', config: { campaign: 'crystal', modules: ['anemia', 'beasts'], variants: { sinRetorno: true, diablillo: true } } },
  { name: 'anemia+metal inmortal', config: { modules: ['anemia', 'realms', 'troll'], variants: { ...VARIANTS_MIX, metalInmortal: true } }, hero: 'anc1' },
  { name: 'spire+anemia+todos', config: { campaign: 'spire', modules: ['anemia', ...ALL_MODULES, 'howling'], variants: { ...VARIANTS_MIX, ceroEnergia: false } }, custom: true },
  { name: 'base+variantes sin ANEMIA', config: { variants: { diablillo: true, pueblo: true, ceroEnergia: true, gastarXP: true, justoAntesDeMorir: true, hogarSonado: true, encantamientos: true } } },
];

/** personaje aleatorio del Gnome Pack (raza, clase, signo, habilidad y equipo válidos) */
function randomCustom(seed) {
  const r = mulberry(seed * 31 + 7); const pick = (a) => a[Math.floor(r() * a.length)];
  const G = listPacks().gnome;
  const race = pick(G.races); const klass = pick(G.classes); const sign = pick(G.signs);
  const sel = { race: race.name, klass: klass.name, sign: sign.name, skill: pick(klass.startSkills), equipment: pick(sign.startEquipment) };
  if (race.name === 'Humano' && r() < 0.5) sel.equipment2 = 'Antorcha';
  if (race.name === 'Gnomo' && r() < 0.5) sel.potion = 'Antídoto';
  return sel;
}
function newGame({ config, custom, hero: forced }, seed, godMode) {
  const cat = buildCatalog(config);
  const heroes = cat.pools.heroes;
  if (custom && seed % 3 === 0) return Game.create({ heroId: 'custom', config: { ...config, custom: randomCustom(seed) }, seed, godMode });
  const hero = forced ? heroes.find((h) => h.id === forced) : heroes[seed % heroes.length];
  return Game.create({ heroId: hero.id, config, seed, godMode });
}

for (const cfg of CONFIGS) {
  const { name } = cfg;
  test(`partidas hasta el jefe, modo dios (${name})`, () => {
    const results = { victory: 0, defeat: 0 }; const reasons = {};
    let levels = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const g = newGame(cfg, seed, true);
      const res = play(g, { seed, maxSteps: 6000 });
      results[res.over.result]++; levels += g.s.level;
      reasons[res.over.reason] = (reasons[res.over.reason] || 0) + 1;
      const a = audit(g);
      assert.equal(a.problems.length, 0, `semilla ${seed}: ${a.problems.join('; ')}`);
    }
    console.log(`  ${name} (dios): victorias ${results.victory}, derrotas ${results.defeat}; nivel medio ${(levels / 40).toFixed(1)}`, reasons);
  });

  test(`partidas completas (${name})`, () => {
    let wins = 0; let games = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const g = newGame(cfg, seed, false);
      const res = play(g, { seed });
      games++; if (res.over.result === 'victory') wins++;
      const a = audit(g);
      assert.equal(a.problems.length, 0, `semilla ${seed}: ${a.problems.join('; ')}`);
    }
    console.log(`  ${name}: ${wins}/${games} victorias del bot aleatorio`);
  });
}

test('las partidas se pueden guardar y restaurar en mitad de una aventura con todos los módulos', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const g = newGame({ config: { campaign: 'spire', modules: [...ALL_MODULES, 'howling'] }, custom: true }, seed * 3, false);
    play(g, { seed, maxSteps: 60, stopAt: 'turn' });
    if (g.s.over || !g.canSave()) continue;
    const h = Game.restore(g.snapshot());
    assert.deepEqual(JSON.parse(JSON.stringify(h.s)), JSON.parse(JSON.stringify(g.s)));
    g.act('draw'); h.act('draw');
    assert.deepEqual(g.s.z.pair, h.s.z.pair);
  }
});
