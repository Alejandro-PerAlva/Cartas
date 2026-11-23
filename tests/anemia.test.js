/**
 * ANEMIA 4.0 (modo fanmade): contrato de datos y un escenario con dados trucados por cada carta con efecto mecánico
 * (héroes, jefes, enemigos, equipo, pociones, aflicciones, habilidades, entornos, esbirros y las 22 tramas).
 * Las reglas variantes del libro se prueban en variants.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, buildCatalog, listPacks } from '../iron_helm_game/js/engine/index.js';
import { GENERATED } from '../iron_helm_game/js/data/packs/index.js';
import { audit } from './helpers/bot.js';
import { rig, start, topDungeon, topEnemy, topPlot, topLoot, give, discardAll, toAttack, fight, engage, plot, choose, treasure, runTask,
  resolveCard, codes, events, setEnv, hire, merc, learn, affliction, topPotion } from './helpers/scenario.js';

const AN = { modules: ['anemia'] };
const ANR = { modules: ['anemia', 'realms'] };
const ANT = { modules: ['anemia', 'troll'] };
function kill(g) { g.s.combat.hp = 1; g.act('attack', { energy: 0 }); treasure(g, 'gold'); }
const itemsOnly = (g) => { g.s.z.loot = g.s.z.loot.filter((u) => g.def(u).kind === 'item'); };
const has = (g, key) => g.allItems().some((u) => g.def(u).key === key);
const boss = (g, key, extra = {}) => fight(g, key, { boss: true, hpBonus: 0, source: 'boss', ...extra });
/** roba un enemigo como lo hace el motor (peligros y Mutante incluidos) y avanza hasta el turno de ataque */
function drawFight(g, key, opts = {}) {
  const uid = g.mk(g.cat.byCode.get(key).id);
  runTask(g, function t() { this._fightDrawn(uid, { source: 'dungeon', ambush: 'normal', hpBonus: g.s.level, initialBonus: 0, ...opts }); });
  return toAttack(g);
}
function endOfLevel(g) { g.q = []; g.s.prompt = null; g.s.turn = 8; g.s.ctx = { turnActive: true }; g.s.z.dungeon = []; g.run(); }

/* ====================================================================================== datos y catálogo */
test('ANEMIA: paquete de tipo "mode" con las 72 cartas reales transcritas y sus campos de listPacks()', () => {
  const lp = listPacks(); const p = lp.packs.find((x) => x.id === 'anemia');
  assert.equal(p.type, 'mode'); assert.equal(p.available, true); assert.equal(p.number, 16);
  for (const k of ['id', 'name', 'es', 'type', 'number', 'blurb', 'rules', 'counts', 'heroes', 'boss', 'keyCards', 'intro']) assert.ok(k in p, k);
  assert.equal(p.boss, null); assert.ok(p.rules.length >= 3); assert.ok(p.keyCards.length > 0 && p.keyCards.length <= 8); assert.ok(p.intro.img.includes('anemia'));
  assert.deepEqual({ ...p.counts }, { heroes: 5, enemies: 13, bosses: 8, items: 9, plots: 22, skills: 7, environments: 4, artifacts: 0, mercenaries: 2, adventures: 0, dungeonCards: 0, afflictions: 3 });
  assert.deepEqual(p.heroes.map((h) => h.name), ['Gene Slash', 'La Bestia', 'Mae', 'Samurái', 'Thorn']);
  const g = GENERATED.anemia; // 5+8+12+5+4+7+22+3+4+2 = 72 cartas con imagen real
  const n = g.heroes.length + g.bosses.length + g.enemies.length + g.plots.length + g.plotEnemies.length + g.trappings.length + g.potions.length + g.skills.length
    + g.afflictions.length + g.environments.length + g.mercenaries.length;
  assert.equal(n, 72);
  assert.equal(g.meta.backs.environments.includes('anemia'), true);
});
test('ANEMIA: todas las claves son únicas y cada carta tiene imagen; los textos del libro están en el paquete', () => {
  const g = GENERATED.anemia; const keys = new Set();
  for (const [k, v] of Object.entries(g)) if (Array.isArray(v) && k !== 'rules') for (const d of v) { assert.ok(!keys.has(d.key), d.key); keys.add(d.key); assert.ok(d.img.startsWith('expansions/anemia/card_'), d.key); }
  const groups = new Set(g.rules.map((r) => r.group));
  for (const k of ['intro', 'origin', 'motivation', 'camp_moments', 'themed_env', 'epilogue', 'enchantment', 'retreat', 'metal', 'challenge']) assert.ok(groups.has(k), k);
  assert.equal(g.rules.filter((r) => r.group === 'epilogue').length, 21); // 16 jefes + 5 minijefes assert.equal(g.rules.filter((r) => r.group === 'enchantment').length, 10);
  assert.equal(g.rules.filter((r) => r.group === 'retreat').length, 5);
});
test('ANEMIA: las cartas de "Metal Inmortal" y La Parca no entran en los mazos; el resto sí', () => {
  const c = buildCatalog(AN);
  const names = (pool) => c.pools[pool].map((d) => d.name);
  assert.ok(!names('trappings').includes('Guitarra Hacha') && !names('trappings').includes('Chaqueta con Tachuelas'));
  assert.ok(['La Bomba de Dios', 'Espada de Appleton', 'Espada Samurái'].every((n) => names('trappings').includes(n)));
  assert.ok(!names('skills').includes('Lírica Bestial')); assert.equal(c.pools.skills.filter((d) => d.pack === 'anemia').length, 6);
  assert.ok(!names('bosses').includes('La Parca') && !names('bosses').includes('El Señor del Tiempo')); assert.equal(c.pools.bosses.filter((d) => d.pack === 'anemia').length, 6);
  assert.equal(c.pools.heroes.filter((d) => d.pack === 'anemia').length, 5); assert.equal(c.pools.enemies.filter((d) => d.pack === 'anemia').length, 12);
  assert.equal(c.pools.plots.filter((d) => d.pack === 'anemia').length, 22); assert.equal(c.pools.afflictions.length, 3); assert.equal(c.pools.mercs.length, 2);
  assert.equal(c.byCode.get('ANB1').name, 'La Parca'); assert.equal(c.byCode.get('ANT1').name, 'Guitarra Hacha');
  assert.equal(c.extras.environments, false, 'los entornos de ANEMIA solo se usan con Terreno y Reliquias');
  assert.equal(c.extras.afflictions, true); assert.equal(c.extras.mercenaries, false);
  assert.equal(buildCatalog(ANR).pools.environments.length, 9 + 4); assert.equal(buildCatalog(ANT).extras.mercenaries, true);
  assert.equal(buildCatalog({ modules: ['anemia', 'troll'] }).pools.mercs.length, 10);
});
test('ANEMIA: sin el modo activo nada cambia (la partida base no incluye cartas de ANEMIA)', () => {
  const g = start('c1', {}); assert.equal(g.s.z.enemies.some((u) => g.def(u).pack === 'anemia'), false);
  assert.equal(g.s.z.plots.some((u) => g.def(u).pack === 'anemia'), false); assert.deepEqual(g.s.variants.diablillo, false);
  assert.equal(g.s.chain, null);
});

/* ====================================================================================== héroes */
test('ANC1 Gene Slash: 10/8/8/0/0, Guitarra Hacha (+1 a los ataques) y Chaqueta con Tachuelas (−1 al daño inicial), habilidad Lírica Bestial', () => {
  const g = start('anc1', AN);
  assert.deepEqual([g.hero.hp, g.hero.energy, g.maxWeight(), g.hero.rations, g.hero.gold], [10, 8, 8, 0, 0]);
  assert.equal(g.def(g.s.eq.MP).name, 'Guitarra Hacha'); assert.equal(g.def(g.s.eq.CP).name, 'Chaqueta con Tachuelas'); assert.ok(g.hasSkill('ANS7'));
  assert.equal(g.hero.proficiency, 'fuerza');
  rig(g, [5, 1]); fight(g, 'ANE3'); assert.equal(g.hero.hp, 10 - (4 + 1 - 1)); // dif 4 + daño 1 − chaqueta 1
  assert.equal(g.previewDamage([3, 4], 2), 8);
  assert.equal(g.s.z.trappings.some((u) => g.def(u).key === 'ANT1'), false);
});
test('ANC2 La Bestia: 14/14, carga "*" (solo dos armas de una mano o una de dos manos) y se come a los enemigos derrotados (+2 de energía)', () => {
  const g = start('anc2', AN);
  assert.equal(g.hero.carryRule, 'weaponsOnly'); assert.equal(g.def(g.s.eq.MP).name, 'Hacha'); assert.equal(g.isOverweight(), false);
  give(g, 'T5'); assert.equal(g.isOverweight(), false, 'dos armas de una mano');
  const u = give(g, 'L12'); runTask(g, g._weightCheck); // una arma a dos manos más: sobran dos (se queda con la de dos manos o con las dos de una mano)
  assert.equal(g.s.prompt.type, 'overweight'); assert.equal(g.s.prompt.need, 1); g.act('dropOver', { uid: u });
  assert.equal(g.isOverweight(), false); assert.equal(g.s.prompt.type, 'turn');
  const h = start('anc2', AN); const a = give(h, 'T5'); const b = give(h, 'T13'); runTask(h, h._weightCheck); assert.equal(h.s.prompt.need, 1); h.act('dropOver', { uid: b }); assert.equal(h.isOverweight(), false); void a;
  const k = start('anc2', AN); discardAll(k); give(k, 'L12'); assert.equal(k.isOverweight(), false, 'una sola arma a dos manos'); give(k, 'T5'); assert.equal(k.isOverweight(), true);
});
test('ANC2 La Bestia: no puede llevar nada que no sea un arma (una poción obliga a soltar algo) y puede beberla en vez de soltarla', () => {
  const g = start('anc2', AN); g.hero.hp = 5;
  const p = give(g, 'P1'); runTask(g, g._weightCheck);
  assert.equal(g.s.prompt.type, 'overweight'); assert.equal(g.weight(), 1); assert.equal(g.maxWeight(), 0);
  g.act('use', { uid: p }); assert.equal(g.s.prompt?.type === 'overweight', false); assert.equal(g.hero.hp, 9);
  const h = start('anc2', AN); const q = give(h, 'P1'); runTask(h, h._weightCheck); h.act('dropOver', { uid: q }); assert.equal(h.isOverweight(), false);
});
test('ANC2 La Bestia: tras el combate puede comerse al enemigo derrotado para ganar 2 de energía (y su carta ya no sirve de experiencia)', () => {
  const g = start('anc2', AN); discardAll(g); give(g, 'T1'); g.hero.energy = 5; fight(g, 'ANE3'); g.s.combat.hp = 1; g.act('attack', { energy: 0 });
  assert.equal(g.s.prompt.type, 'choice'); assert.equal(g.s.prompt.options[0].id, 'eat'); choose(g, 'eat');
  assert.equal(g.hero.energy, 7); assert.equal(g.s.z.graveyard[0].spent, true);
  const h = start('anc2', AN); discardAll(h); give(h, 'T1'); h.hero.energy = 5; fight(h, 'ANE3'); h.s.combat.hp = 1; h.act('attack', { energy: 0 }); choose(h, 'no');
  assert.equal(h.hero.energy, 5); assert.equal(h.s.z.graveyard[0].spent, false);
});
test('ANC3 Mae (heroína): 10/10/9/1/4, Espada de Appleton (+1 a la suma del ataque) y Estrategia', () => {
  const g = start('anc3', AN);
  assert.deepEqual([g.hero.hp, g.hero.energy, g.maxWeight(), g.hero.rations, g.hero.gold], [10, 10, 9, 1, 4]);
  assert.equal(g.def(g.s.eq.MP).name, 'Espada de Appleton'); assert.ok(g.hasSkill('S19')); assert.equal(g.heroFemale(), true);
  rig(g, [3, 3]); fight(g, 'ANE3'); assert.equal(g.previewDamage([2, 5], 2), 8);
  assert.equal(start('c1', AN).heroFemale(), false); assert.equal(start('c3', AN).heroFemale(), true);
});
test('ANC4 Samurái: 12/12/10/1/1 con Espada Samurái y Doble Fase', () => {
  const g = start('anc4', AN);
  assert.deepEqual([g.hero.hp, g.hero.energy, g.maxWeight(), g.hero.rations, g.hero.gold], [12, 12, 10, 1, 1]);
  assert.equal(g.def(g.s.eq.MP).name, 'Espada Samurái'); assert.ok(g.hasSkill('ANS5'));
});
test('ANC5 Thorn: 7/10/11/1/2 con Bastón del Cuervo, Vestiduras y Sangre Envenenada (+7 de salud, inmune al veneno)', () => {
  const g = start('anc5', AN);
  assert.deepEqual([g.hero.hp, g.maxHp(), g.hero.energy, g.maxWeight(), g.hero.rations, g.hero.gold], [14, 14, 10, 11, 1, 2]);
  assert.ok(has(g, 'T28') && has(g, 'T12')); assert.ok(g.hasSkill('ANS1'));
  g.addPoison(3, 'prueba'); assert.equal(g.hero.poison, 0); assert.equal(g.s.prompt.type, 'turn', 'el Bastón del Cuervo no pregunta si eres inmune');
  g.gain('poison', 2, 'prueba'); assert.equal(g.hero.poison, 0);
});

/* ====================================================================================== jefes */
test('ANB1 La Parca: 24/4, no muerto; si saca dobles lanza ambos dados de nuevo', () => {
  const g = start('c1', AN); discardAll(g); const d = g.cat.byCode.get('ANB1'); assert.deepEqual([d.health, d.damage, d.treasure, d.weakness, d.purse], [24, 4, 0, 'undead', 0]);
  rig(g, [3, 3, 6, 2]); boss(g, 'ANB1'); assert.equal(g.hero.hp, 14 - (4 + 4)); // dobles → relanza [6,2] → 4 + 4
});
test('ANB2 Malnok: con dobles te impacta por el valor de un dado +1', () => {
  const g = start('c1', AN); discardAll(g); rig(g, [3, 3]); boss(g, 'ANB2');
  assert.equal(g.hero.hp, 14 - (3 + 1 + 3)); // 3 (dado) +1 + daño 3
  const d = g.cat.byCode.get('ANB2'); assert.deepEqual([d.health, d.damage, d.treasure, d.weakness, d.purse], [20, 3, 2, 'undead', 3]);
});
test('ANB3 Tzxefytd: no se le puede dañar; tiene d6+10 de energía (par hacia arriba) y gasta 2 en cada ataque; cuando se agota es derrotado', () => {
  const g = start('c1', AN); discardAll(g); g.hero.hp = 40; g.s.godMode = false;
  rig(g, [3, 1, 2]); boss(g, 'ANB3'); // energía 3+10 = 13 → 14; primer ataque [1,2] → gasta 2 (queda 12)
  assert.equal(g.s.combat.maxHp, 14); assert.equal(g.s.combat.hp, 12); assert.equal(g.s.prompt.duel, true);
  g.act('attack', { energy: 0 }); // intentar atacar no hace nada; contraataca (gasta 2)
  assert.equal(g.s.combat.hp, 10);
  g.hero.energy = 5; rig(g, [1, 2]); g.act('attack', { energy: 3 }); assert.equal(g.hero.energy, 5, 'no gastas energía en un ataque inútil');
  assert.equal(g.s.combat.hp, 8);
  let guard = 0; while (g.s.combat && g.s.prompt?.type === 'attack' && guard++ < 20) { rig(g, [1, 2]); g.act('attack', { energy: 0 }); }
  assert.equal(g.s.over.result, 'victory'); assert.equal(g.s.combat, null); assert.ok(g.hero.hp > 0);
  const cd = g.cat.byCode.get('ANB3'); assert.deepEqual([cd.damage, cd.treasure, cd.weakness, cd.purse], [2, 0, '*', 3]);
});
test('ANB3 Tzxefytd: la energía se redondea a número par hacia arriba (d6=2 → 12; d6=5 → 16)', () => {
  const a = start('c1', AN); discardAll(a); rig(a, [2, 1, 2]); boss(a, 'ANB3'); assert.equal(a.s.combat.maxHp, 12);
  const b = start('c1', AN); discardAll(b); rig(b, [5, 1, 2]); boss(b, 'ANB3'); assert.equal(b.s.combat.maxHp, 16);
});
test('ANB4 El Rey de los Muertos: lo que añade daño contra no muertos solo suma la mitad (redondeada hacia abajo)', () => {
  const g = start('c1', AN); discardAll(g); give(g, 'L12'); // Martillo de Guerra: +3 contra no muertos
  rig(g, [3, 3]); boss(g, 'ANB4'); assert.equal(g.previewDamage([3, 3], 2), 6 + 1); // 3 → 1
  const h = start('c1', AN); discardAll(h); give(h, 'L12'); rig(h, [3, 3]); fight(h, 'E8'); assert.equal(h.previewDamage([3, 3], 2), 6 + 3); // normal
  const k = start('c1', AN); discardAll(k); const p = give(k, 'P5'); rig(k, [3, 3]); boss(k, 'ANB4'); rig(k, [2, 2]); k.act('potionAttack', { uid: p });
  assert.equal(k.s.combat.hp, 24 - (4 + 2)); // Agua Bendita: +5 → +2
  const m = start('c1', AN); discardAll(m); const q = give(m, 'P5'); rig(m, [3, 3]); fight(m, 'E8', { hpBonus: 20 }); rig(m, [2, 2]); m.act('potionAttack', { uid: q });
  assert.equal(m.s.combat.hp, 25 - (4 + 5));
});
test('ANB5 El Reptiliano: si tu ataque con un arma le inflige menos de 2 de daño pierdes el arma', () => {
  const g = start('c1', AN); discardAll(g); const w = give(g, 'T5'); // Daga: mustReroll 6
  rig(g, [3, 3]); boss(g, 'ANB5'); assert.equal(g.s.eq.MP, w);
  rig(g, [1, 5, 5]); g.act('attack', { energy: 1 }); // saca 1 → inflige 1 → pierde la daga
  assert.equal(g.s.eq.MP, null); assert.ok(g.s.z.removed.includes(w) || g.s.z.lootDiscard.includes(w) || g.s.z.trappings.includes(w) || codes(g, 'removed').includes('T5'));
  const h = start('c1', AN); discardAll(h); const x = give(h, 'T5'); rig(h, [3, 3]); boss(h, 'ANB5'); rig(h, [2, 5, 5]); h.act('attack', { energy: 1 });
  assert.equal(h.s.eq.MP, x, 'con 2 o más de daño conservas el arma');
});
test('ANB6 Gigante de los Hielos: contra manos desnudas dobla el valor de su tirada de ataque', () => {
  const g = start('c1', AN); discardAll(g); rig(g, [6, 2]); boss(g, 'ANB6'); assert.equal(g.hero.hp, 14 - (4 * 2 + 5)); // sin arma: 4×2 + 5
  const h = start('c1', AN); discardAll(h); give(h, 'T5'); rig(h, [6, 2]); boss(h, 'ANB6'); assert.equal(h.hero.hp, 14 - (4 + 5)); // con arma: normal
});
test('ANB7 Samurái de las Sombras: esquiva con 1-4 (sin daño, contraataca) e impacta con 5-6; pociones y puñetazos también tiran', () => {
  const g = start('c1', AN); discardAll(g); give(g, 'T1'); rig(g, [3, 3]); boss(g, 'ANB7'); const hp0 = g.s.combat.hp;
  rig(g, [5, 4, 2, 1]); g.act('attack', { energy: 1 }); // ataque 5, esquiva 4 → falla; el contraataque [2,1]
  assert.equal(g.s.combat.hp, hp0); assert.equal(g.hero.hp, 14 - 4);
  rig(g, [5, 6, 2, 1]); g.act('attack', { energy: 1 }); assert.equal(g.s.combat.hp, hp0 - 5);
  rig(g, [2]); g.act('attack', { energy: 0 }); assert.equal(g.s.combat.hp, hp0 - 5, 'el puñetazo también debe superar la esquiva');
  assert.deepEqual(g.s.combat.weaknesses, ['fire', 'ice']);
  const h = start('c1', AN); discardAll(h); const p = give(h, 'P4'); rig(h, [3, 3]); boss(h, 'ANB7'); rig(h, [2, 3, 6]); h.act('potionAttack', { uid: p });
  assert.equal(h.s.combat.hp, 17 - (2 + 3 + 5), 'Bomba de Mecha: 2+3 y +5 por su debilidad al fuego; la esquiva sale 6');
  const k = start('c1', AN); discardAll(k); const q = give(k, 'P3'); rig(k, [3, 3]); boss(k, 'ANB7'); rig(k, [2, 3, 4, 1, 1]); k.act('potionAttack', { uid: q });
  assert.equal(k.s.combat.hp, 17, 'esquiva con 4: sin daño (la poción se gasta)'); assert.ok(!k.allItems().includes(q));
});
test('ANB8 El Señor del Tiempo: tras cada ataque tiras 2d6; con dobles lo aturdes y vuelves a 1987 (victoria)', () => {
  const g = start('anc1', { modules: ['anemia'], variants: { metalInmortal: true } });
  assert.equal(g.cat.bossOverride, g.cat.byCode.get('ANB8').id);
  g.hero.hp = 40; g.s.z.enemies = []; g.s.eyes = 10; runTask(g, function t() { this._beginBossSequence('prueba'); });
  while (g.s.prompt?.type === 'divine') g.act('ack');
  assert.equal(g.def(g.s.combat.uid).name, 'El Señor del Tiempo'); assert.equal(g.s.combat.maxHp, 20);
  toAttack(g); rig(g, [1, 5, 2]); g.act('attack', { energy: 1 }); // ataque 1 (+1 guitarra); 2d6 [5,2] → sigue
  assert.equal(g.s.over, null);
  rig(g, [1, 4, 4]); g.act('attack', { energy: 1 }); // dobles [4,4]
  assert.equal(g.s.over.result, 'victory'); assert.equal(g.s.over.ending, 'home');
});
test('ANB8 El Señor del Tiempo: si le matas quedas atrapado en esta época (victoria con final "trapped")', () => {
  const g = start('anc1', { modules: ['anemia'], variants: { metalInmortal: true } });
  g.s.z.enemies = []; runTask(g, function t() { this._beginBossSequence('prueba'); }); while (g.s.prompt?.type === 'divine') g.act('ack'); toAttack(g);
  g.s.combat.hp = 1; rig(g, [1]); g.act('attack', { energy: 0 }); treasure(g, 'gold');
  assert.equal(g.s.over.result, 'victory'); assert.equal(g.s.over.ending, 'trapped');
});
test('Jefes de ANEMIA: entran en el sorteo por debilidad (y Tzxefytd sirve para cualquiera); el base ya no es el único', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    const g = start('c1', AN, seed); g.s.z.graveyard = [];
    for (let i = 0; i < 3; i++) g.s.z.graveyard.push({ uid: g.mk(g.cat.byCode.get('E8').id), spent: false }); // no muertos
    seen.add(g.def(g.determineBoss()).name);
  }
  assert.ok(seen.has('Lich') && seen.has('Malnok') && seen.has('El Rey de los Muertos') && seen.has('Tzxefytd'), [...seen].join(','));
  assert.ok(![...seen].some((n) => ['Naga', 'Merodeador', 'El Reptiliano', 'La Parca', 'El Señor del Tiempo'].includes(n)));
  const hielo = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    const g = start('c1', AN, seed); g.s.z.graveyard = []; for (let i = 0; i < 3; i++) g.s.z.graveyard.push({ uid: g.mk(g.cat.byCode.get('E1').id), spent: false });
    hielo.add(g.def(g.determineBoss()).name);
  }
  assert.ok(hielo.has('Merodeador') && hielo.has('El Reptiliano') && hielo.has('Samurái de las Sombras'), [...hielo].join(','));
});

/* ====================================================================================== enemigos */
test('ANE1 Mutante: atributos del primer enemigo robado y habilidad y recompensa del segundo', () => {
  const g = start('c1', AN); discardAll(g); topEnemy(g, 'E12'); topEnemy(g, 'ANE6'); // primero Perro No Muerto (el último en entrar queda arriba)... se roba E12? comprobamos orden
  const [a, b] = g.s.z.enemies.slice(0, 2); rig(g, [3, 3]);
  drawFight(g, 'ANE1'); const c = g.s.combat; const A = g.def(a); const B = g.def(b);
  assert.equal(c.maxHp, A.health + 1); assert.equal(c.damage, A.damage); assert.equal(c.weakness, A.weakness);
  assert.equal(c.treasure, B.treasure); assert.equal(c.purse, B.purse); assert.deepEqual(c.power, { ...B.power });
  assert.ok(g.s.z.enemiesDiscard.includes(a) && g.s.z.enemiesDiscard.includes(b));
});
test('ANE1 Mutante: sin peligros ni otro Mutante entre las dos cartas y se cuenta con la debilidad del primero para el jefe', () => {
  const g = start('c1', AN); discardAll(g); g.s.z.enemies = []; topEnemy(g, 'ANE5'); topEnemy(g, 'ANE7'); topEnemy(g, 'ANE1'); topEnemy(g, 'E8');
  // orden de robo: E8 (A), ANE1 (se salta), ANE7 (se salta), ANE5 (B)
  rig(g, [3, 3]); drawFight(g, 'ANE1'); const c = g.s.combat; assert.equal(c.weakness, 'undead'); assert.ok(c.power.silverKill);
  kill(g); assert.equal(g.s.z.graveyard.at(-1).weakness, 'undead'); assert.equal(g.s.z.graveyard.length, 1);
});
test('ANE2 Asesino Sigiloso: al llegar a 0 de salud se filtra por el suelo y su carta se baraja de nuevo en el mazo de enemigos', () => {
  const g = start('c1', AN); discardAll(g); const gold = g.hero.gold; const n = g.s.z.enemies.length; fight(g, 'ANE2');
  const uid = g.s.combat.uid; g.s.combat.hp = 1; g.act('attack', { energy: 0 });
  assert.equal(g.s.combat, null); assert.ok(g.s.z.enemies.includes(uid)); assert.equal(g.s.z.enemies.length, n + 1); assert.equal(g.s.z.graveyard.length, 0);
  assert.equal(g.hero.gold, gold); assert.equal(g.s.stats.kills, 1 * 1 && g.s.stats.kills);
  assert.notEqual(g.s.prompt?.type, 'choice');
});
test('ANE3 Rata Gigante 6/1/0, fuego, sin habilidad especial · ANE4 Ogro 6/1/1, fuego, 1 de oro', () => {
  const g = start('c1', AN); const r = g.cat.byCode.get('ANE3'); const o = g.cat.byCode.get('ANE4');
  assert.deepEqual([r.health, r.damage, r.treasure, r.weakness, r.purse], [6, 1, 0, 'fire', 0]); assert.deepEqual([o.health, o.damage, o.treasure, o.weakness, o.purse], [6, 1, 1, 'fire', 1]);
  assert.deepEqual(r.power ?? {}, {}); assert.deepEqual(o.power ?? {}, { avoidGrows: 1 });
});
test('ANE4 Ogro: si evitas por cualquier medio que te inflija daño, gana +1 al daño en su próximo ataque (y solo en ese)', () => {
  const g = start('c1', AN); discardAll(g); rig(g, [3, 3]); fight(g, 'ANE4'); // dobles: falla el ataque inicial
  assert.equal(g.s.combat.avoidBonus, 1);
  rig(g, [4, 1]); g.act('attack', { energy: 0 }); assert.equal(g.hero.hp, 14 - (3 + 1 + 1)); assert.equal(g.s.combat.avoidBonus, 0); // +1 al daño
  rig(g, [4, 1]); g.act('attack', { energy: 0 }); assert.equal(g.hero.hp, 14 - 5 - 4);
  const h = start('c1', AN); discardAll(h); give(h, 'T4'); rig(h, [2, 1]); fight(h, 'ANE4'); // armadura de cuero: 1+1−1 = 1... dif 1 + 1 − 1 = 1; sin evitar
  assert.equal(h.s.combat.avoidBonus || 0, 0);
  const k = start('c1', AN); discardAll(k); give(k, 'T4'); give(k, 'T14'); rig(k, [2, 2]); fight(k, 'ANE4'); // dobles
  assert.equal(k.s.combat.avoidBonus, 1);
});
test('ANE5 Hombre Lobo: un solo impacto con la Daga de la Luna lo mata; descartar la Moneda del Destino también', () => {
  const g = start('c1', AN); discardAll(g); give(g, 'T20'); // Daga de la Luna en la mano principal
  rig(g, [3, 3]); fight(g, 'ANE5'); assert.equal(g.s.combat.maxHp, 8);
  rig(g, [2, 5, 5]); g.act('attack', { energy: 1 }); treasure(g, 'gold'); assert.equal(g.s.combat, null); assert.equal(g.s.stats.kills, 1);
  const h = start('c1', AN); discardAll(h); const coin = give(h, 'L30'); rig(h, [3, 3]); fight(h, 'ANE5');
  assert.ok(h.s.prompt.specials.some((s) => s.id === 'moneda')); h.act('special', { id: 'moneda' });
  treasure(h, 'gold'); assert.equal(h.s.combat, null); assert.ok(!h.allItems().includes(coin));
  const k = start('c1', AN); discardAll(k); give(k, 'T1'); rig(k, [3, 3]); fight(k, 'ANE5'); rig(k, [2, 5, 5]); k.act('attack', { energy: 1 }); assert.ok(k.s.combat, 'una hacha no basta');
});
test('ANE6 Perro No Muerto: tus tiradas de ataque restan −2 al resultado', () => {
  const g = start('c1', AN); discardAll(g); give(g, 'T5'); rig(g, [3, 3]); fight(g, 'ANE6'); assert.equal(g.previewDamage([5, 4], 2), 9 - 2);
  assert.equal(g.s.combat.weakness, 'undead'); assert.equal(g.s.combat.damage, 0);
});
test('ANE7 Nube Gaseosa: una Emboscada robada como primera carta la evita; en cualquier otro caso ganas d6−d6 de veneno', () => {
  const g = start('c1', AN); discardAll(g); topEnemy(g, 'ANE7'); topDungeon(g, 'D1', 'D10'); g.act('draw'); g.act('reveal', { slot: 0 }); g.act('resolve');
  assert.equal(g.hero.poison, 0); assert.ok(g.s.z.enemiesDiscard.some((u) => g.def(u).key === 'ANE7')); assert.equal(g.s.combat, null);
  const h = start('c1', AN); discardAll(h); topEnemy(h, 'ANE7'); topDungeon(h, 'D6', 'D10'); rig(h, [6, 2]); h.act('draw'); h.act('reveal', { slot: 0 }); h.act('resolve');
  assert.equal(h.hero.poison, 4);
  const k = start('c1', AN); discardAll(k); topEnemy(k, 'ANE7'); topDungeon(k, 'D10', 'D1'); rig(k, [6, 2]); k.act('draw'); k.act('reveal', { slot: 0 }); k.act('decline'); // Emboscada como 2ª carta
  assert.equal(k.hero.poison, 4);
});
test('ANE8 Arenas Movedizas: tiradas d6 hasta 5-6; cada fallo cuesta 1 de energía; sin energía mueres', () => {
  const g = start('c1', AN); discardAll(g); g.hero.energy = 5; topEnemy(g, 'ANE8'); topDungeon(g, 'D6', 'D10'); rig(g, [1, 3, 6]);
  g.act('draw'); g.act('reveal', { slot: 0 }); g.act('resolve'); assert.equal(g.hero.energy, 3); assert.equal(g.s.over, null);
  const h = start('c1', AN); discardAll(h); h.hero.energy = 2; topEnemy(h, 'ANE8'); topDungeon(h, 'D6', 'D10'); rig(h, [1, 2, 6]);
  h.act('draw'); h.act('reveal', { slot: 0 }); h.act('resolve'); assert.equal(h.s.over.result, 'defeat'); assert.match(h.s.over.reason, /Arenas Movedizas/);
  const k = start('c1', AN); discardAll(k); k.hero.energy = 1; topEnemy(k, 'ANE8'); topDungeon(k, 'D1', 'D10'); k.act('draw'); k.act('reveal', { slot: 0 }); k.act('resolve');
  assert.equal(k.s.over, null); assert.equal(k.hero.energy, 1);
});
test('ANE9 Poza de Ácido: pierdes todo lo que no sea de metal, cristal o piedra; una Emboscada como primera carta la evita', () => {
  const g = start('c1', AN); discardAll(g); give(g, 'T5'); give(g, 'T4'); give(g, 'P1'); give(g, 'T3'); give(g, 'L29'); give(g, 'T12');
  topEnemy(g, 'ANE9'); topDungeon(g, 'D6', 'D10'); g.act('draw'); g.act('reveal', { slot: 0 }); g.act('resolve');
  assert.deepEqual(g.allItems().map((u) => g.def(u).key).sort(), ['L29', 'P1', 'T5']); // Daga, Poción de Salud (cristal) y Esmeralda (piedra)
  const h = start('c1', AN); const n = h.allItems().length; topEnemy(h, 'ANE9'); topDungeon(h, 'D1', 'D10'); h.act('draw'); h.act('reveal', { slot: 0 }); h.act('resolve');
  assert.equal(h.allItems().length, n);
});
test('ANE10 Hombre Cerdo: salvo en una Emboscada, en vez de su ataque inicial te roba 1 ración y se la come', () => {
  const g = start('c1', AN); discardAll(g); g.hero.rations = 2; rig(g, [6, 1]); fight(g, 'ANE10'); assert.equal(g.hero.rations, 1); assert.equal(g.hero.hp, 14);
  const h = start('c1', AN); discardAll(h); h.hero.rations = 0; fight(h, 'ANE10'); assert.equal(h.hero.hp, 14);
  const k = start('c1', AN); discardAll(k); k.hero.rations = 2; rig(k, [6, 1]); fight(k, 'ANE10', { cardKind: 'ambush', ambush: 'enemy' }); assert.equal(k.hero.rations, 2); assert.equal(k.hero.hp, 14 - 6);
});
test('ANE11 Centauro: con una heroína no ataca primero y puedes evitar el enfrentamiento si lo deseas', () => {
  const g = start('anc3', AN); discardAll(g); rig(g, [6, 1]); const pr = engage(g, 'ANE11');
  assert.equal(pr.type, 'avoidEnemy'); assert.ok(pr.options.some((o) => o.id === 'centauro'));
  g.act('avoidEnemy', { id: 'fight' }); toAttack(g); assert.equal(g.hero.hp, 10);
  const h = start('c1', AN); discardAll(h); rig(h, [6, 1]); engage(h, 'ANE11'); h.act('avoidEnemy', { id: 'fight' }); toAttack(h); assert.equal(h.hero.hp, 14 - (5 + 2));
  const k = start('c1', AN); discardAll(k); engage(k, 'ANE11'); k.act('avoidEnemy', { id: 'centauro' }); assert.equal(k.s.combat, null); assert.ok(codes(k, 'enemiesDiscard').includes('ANE11'));
});
test('ANE12 Masa Ósea: si su ataque tiene éxito se adhiere y te inflige 1 de daño cuando atacas; luego se desprende', () => {
  const g = start('c1', AN); discardAll(g); rig(g, [4, 1]); fight(g, 'ANE12'); assert.equal(g.s.combat.stuck, true); assert.equal(g.hero.hp, 14 - 4);
  rig(g, [3, 3]); g.act('attack', { energy: 0 }); assert.equal(g.hero.hp, 14 - 4 - 1); assert.equal(g.s.combat.stuck, false);
  const h = start('c1', AN); discardAll(h); rig(h, [3, 3]); fight(h, 'ANE12'); assert.equal(h.s.combat.stuck, false); rig(h, [3, 3]); h.act('attack', { energy: 0 }); assert.equal(h.hero.hp, 14);
});

/* ====================================================================================== equipo y pociones */
test('ANT3 La Bomba de Dios: mueres al instante y te llevas por delante a tu enemigo (solo en combate)', () => {
  const g = start('c1', AN); const b = give(g, 'ANT3'); assert.equal(g.act('use', { uid: b }).ok, false);
  discardAll(g); const b2 = give(g, 'ANT3'); rig(g, [3, 3]); fight(g, 'ANE12');
  assert.equal(g.usableNow(b2)?.when, 'combat'); g.act('use', { uid: b2 });
  assert.equal(g.s.over.result, 'defeat'); assert.equal(g.hero.hp, 0); assert.match(g.s.over.reason, /Bomba de Dios/);
});
test('ANT4/ANT5 Espadas: Appleton +1 a la suma; Samurái mata al enemigo que deja con 1 de salud', () => {
  const g = start('c1', AN); discardAll(g); give(g, 'ANT4'); rig(g, [3, 3]); fight(g, 'ANE3'); assert.equal(g.previewDamage([2, 2], 2), 5);
  assert.deepEqual([g.def(g.s.eq.MP).price, g.def(g.s.eq.MP).weight, g.def(g.s.eq.MP).slot], [12, 3, '2M']);
  const h = start('c1', AN); discardAll(h); give(h, 'ANT5'); rig(h, [3, 3]); fight(h, 'ANE3'); // 6+1 = 7 de salud
  rig(h, [3, 3]); h.act('attack', { energy: 2 }); // 6 de daño → deja 1 → muere
  assert.equal(h.s.combat, null); treasure(h, 'gold');
  const k = start('c1', AN); discardAll(k); give(k, 'ANT5'); rig(k, [3, 3]); fight(k, 'ANE3'); rig(k, [2, 2, 3, 3]); k.act('attack', { energy: 2 }); assert.equal(k.s.combat.hp, 3, 'con 3 de salud restante no muere');
});
test('ANP1 Sangre de Lobo: +3 de salud y de energía aunque superes el máximo; tras el combate vuelve al máximo y baja la moral', () => {
  const g = start('c1', AN); discardAll(g); const p = give(g, 'ANP1'); const maxHp = g.maxHp(); g.hero.energy = 14;
  assert.equal(g.usableNow(p)?.when, 'free'); g.act('use', { uid: p });
  assert.equal(g.hero.hp, maxHp + 3); assert.equal(g.hero.energy, 17); assert.equal(g.hero.morality, 0);
  rig(g, [3, 3]); fight(g, 'ANE3'); g.s.combat.hp = 1; g.act('attack', { energy: 0 });
  assert.equal(g.hero.hp, maxHp); assert.equal(g.hero.energy, 14); assert.equal(g.hero.morality, -1);
  const h = start('c1', AN); discardAll(h); h.hero.hp = 5; h.hero.energy = 3; const q = give(h, 'ANP1'); h.act('use', { uid: q }); assert.equal(h.hero.hp, 8); assert.equal(h.hero.energy, 6);
});
test('ANP2 Energía Potencial: en combate, recuperas 2 de energía por cada ataque que no realices hasta que vuelvas a atacar', () => {
  const g = start('c1', AN); discardAll(g); give(g, 'T5'); const p = give(g, 'ANP2'); g.hero.energy = 4; assert.equal(g.act('use', { uid: p }).ok, false);
  rig(g, [3, 3]); fight(g, 'ANE12', { hpBonus: 20 }); assert.equal(g.usableNow(p)?.when, 'combat');
  g.act('use', { uid: p }); assert.equal(g.s.prompt.rest.mode, 'energy'); assert.ok(g.s.prompt.specials.some((s) => s.id === 'rest'));
  rig(g, [3, 3]); g.act('special', { id: 'rest' }); assert.equal(g.hero.energy, 6); assert.equal(g.s.prompt.type, 'attack');
  rig(g, [3, 3]); g.act('special', { id: 'rest' }); assert.equal(g.hero.energy, 8);
  rig(g, [3, 3, 3]); g.act('attack', { energy: 1 }); assert.equal(g.s.combat.restMode, null); assert.equal(g.s.prompt.rest, undefined);
});
test('ANP3 Absorción: +2 en tu siguiente ataque por cada ataque que no hayas realizado', () => {
  const g = start('c1', AN); discardAll(g); give(g, 'T5'); const p = give(g, 'ANP3'); rig(g, [3, 3]); fight(g, 'ANE12', { hpBonus: 30 });
  g.act('use', { uid: p }); rig(g, [3, 3]); g.act('special', { id: 'rest' }); rig(g, [3, 3]); g.act('special', { id: 'rest' }); assert.equal(g.s.combat.restSkips, 2);
  const hp = g.s.combat.hp; rig(g, [4, 3, 3]); g.act('attack', { energy: 1 }); assert.equal(g.s.combat.hp, hp - (4 + 4)); // 4 + 2×2
  rig(g, [4, 3, 3]); g.act('attack', { energy: 1 }); assert.equal(g.s.combat.hp, hp - 8 - 4);
});
test('ANP4 Silencio: anula la habilidad especial del enemigo (no funciona con jefes finales)', () => {
  const g = start('c1', AN); discardAll(g); const p = give(g, 'ANP4'); rig(g, [3, 3]); fight(g, 'ANE6'); assert.equal(g.previewDamage([5], 1), 3);
  g.act('use', { uid: p }); assert.equal(g.previewDamage([5], 1), 5); assert.deepEqual(g.s.combat.power, {});
  const h = start('c1', AN); discardAll(h); const q = give(h, 'ANP4'); rig(h, [3, 3]); boss(h, 'ANB2'); assert.equal(h.usableNow(q), null); assert.equal(h.act('use', { uid: q }).ok, false);
});

/* ====================================================================================== aflicciones */
test('ANAF1 Amnesia: cada nivel una habilidad aleatoria queda inutilizada (y se pierde su bonificación)', () => {
  const g = start('anc5', AN); learn(g, 'S6'); affliction(g, 'ANAF1'); g._amnesiaPick();
  const id = g.s.lvl.forgotten; assert.ok(g.hero.skills.includes(id)); assert.equal(g.hasSkill(g.cat.def(id).key), false);
  assert.ok(g.hero.hp <= g.maxHp());
  const seen = new Set(); for (let i = 0; i < 30; i++) { g._amnesiaPick(); seen.add(g.s.lvl.forgotten); } assert.equal(seen.size, 2);
  const h = start('anc5', AN); affliction(h, 'ANAF1'); h._amnesiaPick(); assert.equal(h.hasSkill('ANS1'), false); assert.equal(h.maxHp(), 7); assert.equal(h.hero.hp, 7);
  runTask(h, function t() { this.startLevel(); }); assert.equal(h.hasSkill('ANS1'), false, 'sigue habiendo una habilidad olvidada cada nivel');
});
test('ANAF1 Amnesia al robarla: se aplica de inmediato', () => {
  const g = start('c4', AN); g.s.z.afflictions.unshift(g.mk(g.cat.byCode.get('ANAF1').id)); learn(g, 'S6');
  g.gainAffliction('prueba'); assert.ok(g.s.lvl.forgotten);
});
test('ANAF2 Fiebre del Oro: al derrotar a un enemigo de tesoro 1 eliges siempre la moneda de oro', () => {
  const g = start('c1', AN); discardAll(g); affliction(g, 'ANAF2'); const gold = g.hero.gold; fight(g, 'ANE4'); g.s.combat.hp = 1; g.act('attack', { energy: 0 });
  assert.equal(g.hero.gold, gold + 1 + 1); assert.notEqual(g.s.prompt?.type, 'choice'); assert.equal(g.allItems().length, 0);
});
test('ANAF3 Adrenalina: encadena 3 aventuras seguidas (la actual cuenta como la primera) sin pasar por la Posada', () => {
  const g = start('c1', AN); g.s.z.afflictions.unshift(g.mk(g.cat.byCode.get('ANAF3').id)); g.gainAffliction('prueba');
  assert.equal(g.s.chain.total, 3); assert.equal(g.s.chain.adrenaline, true); assert.equal(g.s.chain.index, 0);
  runTask(g, g.victory); assert.equal(g.s.over, null); assert.equal(g.s.chain.index, 1); assert.equal(g.s.level, 1); assert.equal(g.s.prompt.type, 'turn');
  runTask(g, g.victory); assert.equal(g.s.chain.index, 2); runTask(g, g.victory); assert.equal(g.s.over.result, 'victory');
});

/* ====================================================================================== habilidades */
test('ANS1 Sangre Envenenada: +7 de salud adicionales (fichas de veneno tratadas como salud) e inmunidad al veneno', () => {
  const g = start('c1', AN); const hp = g.hero.hp; learn(g, 'ANS1'); assert.equal(g.maxHp(), 14 + 7); assert.equal(g.hero.hp, hp + 7);
  g.hero.poison = 0; g.lose('hp', 10, 'prueba'); g.addPoison(5, 'x'); assert.equal(g.hero.poison, 0);
});
test('ANS2 Pacificador: en vez de atacar tiras d6: 5-6 terminas el combate sin experiencia ni botín; 1-4 el enemigo ataca', () => {
  const g = start('c1', AN); discardAll(g); learn(g, 'ANS2'); rig(g, [3, 3]); fight(g, 'ANE12');
  assert.ok(g.s.prompt.specials.some((s) => s.id === 'pacificador')); rig(g, [2, 6, 1]); g.act('special', { id: 'pacificador' });
  assert.equal(g.hero.hp, 14 - 6); assert.equal(g.s.prompt.type, 'attack'); assert.equal(g.s.combat.hp, g.s.combat.maxHp);
  rig(g, [5]); g.act('special', { id: 'pacificador' }); assert.equal(g.s.combat, null); assert.equal(g.s.z.graveyard.length, 0); assert.ok(codes(g, 'enemiesDiscard').includes('ANE12'));
  assert.equal(g.s.prompt.type !== 'choice', true);
  const h = start('c1', AN); discardAll(h); learn(h, 'ANS2'); rig(h, [3, 3]); boss(h, 'ANB2'); assert.equal(h.s.prompt.specials.some((s) => s.id === 'pacificador'), false);
});
test('ANS3 Artes Oscuras: baja la moral, ganas 1 poción y no puedes ganar fichas de bendición', () => {
  const g = start('c1', AN); const n = g.allItems().length; learn(g, 'ANS3'); g.s.prompt = null; g.run();
  assert.equal(g.hero.morality, -1); assert.equal(g.allItems().length, n + 1);
  assert.equal(g.gain('blessing', 2, 'prueba'), 0); assert.equal(g.hero.blessings.length, 0);
});
test('ANS4 Más Rápido que la Vista: una vez por nivel puedes ignorar una trama con ojos (sin ganar sus ojos)', () => {
  const g = start('c1', AN); learn(g, 'ANS4'); runTask(g, function t() { this._startPlot(g.mk(g.cat.byCode.get('PT1').id)); });
  assert.equal(g.s.prompt.type, 'choice'); assert.deepEqual(g.s.prompt.options.map((o) => o.id), ['ignore', 'resolve']);
  g.act('choose', { id: 'ignore' }); assert.equal(g.s.eyes, 0); assert.ok(g.s.lvl.rapido); assert.ok(g.s.z.plotsPlayed.length === 1);
  runTask(g, function t() { this._startPlot(g.mk(g.cat.byCode.get('PT1').id)); }); assert.equal(g.s.prompt.type, 'choice'); assert.ok(g.s.prompt.options.some((o) => o.id === 'help'), 'segunda vez: se resuelve');
  const h = start('c1', AN); learn(h, 'ANS4'); runTask(h, function t() { this._startPlot(h.mk(h.cat.byCode.get('PT1').id)); }); h.act('choose', { id: 'resolve' });
  assert.ok(h.s.prompt.options.some((o) => o.id === 'help')); assert.equal(h.s.lvl.rapido, undefined);
});
test('ANS5 Doble Fase: 1 de energía tras la tirada del enemigo; 1-2 +1 de daño, 3-4 fallas, 5-6 evitas el ataque; no con un arma a dos manos', () => {
  const g = start('c1', AN); discardAll(g); learn(g, 'ANS5'); rig(g, [6, 1]); let pr = engage(g, 'ANE12');
  assert.equal(pr.type, 'enemyRoll'); assert.ok(pr.options.some((o) => o.id === 'fase'));
  rig(g, [5]); g.act('enemyReact', { id: 'fase' }); assert.equal(g.hero.energy, 10); assert.equal(g.hero.hp, 14);
  const h = start('c1', AN); discardAll(h); learn(h, 'ANS5'); rig(h, [6, 1]); engage(h, 'ANE12'); rig(h, [1]); h.act('enemyReact', { id: 'fase' });
  assert.equal(h.hero.hp, 14 - (5 + 1 + 1)); // +1 de la tirada fallida
  const k = start('c1', AN); discardAll(k); learn(k, 'ANS5'); rig(k, [6, 1]); engage(k, 'ANE12'); rig(k, [3]); k.act('enemyReact', { id: 'fase' }); assert.equal(k.hero.hp, 14 - 6);
  const m = start('c1', AN); discardAll(m); give(m, 'L12'); learn(m, 'ANS5'); rig(m, [6, 1]); assert.equal(engage(m, 'ANE12').options?.some((o) => o.id === 'fase') || false, false);
});
test('ANS6 Puños de Fuerza: una vez por nivel, si 3 de daño derrotan al enemigo, gastas 1 de energía y lo infliges automáticamente', () => {
  const g = start('c1', AN); discardAll(g); learn(g, 'ANS6'); rig(g, [3, 3]); fight(g, 'ANE12'); assert.equal(g.s.prompt.specials.some((s) => s.id === 'punos'), false);
  g.s.combat.hp = 3; g.s.prompt.specials = g._specialOptions('attack'); assert.ok(g.s.prompt.specials.some((s) => s.id === 'punos'));
  g.act('special', { id: 'punos' }); assert.equal(g.hero.energy, 10); treasure(g, 'gold'); assert.equal(g.s.combat, null);
  fight(g, 'ANE12'); g.s.combat.hp = 3; assert.equal(g._specialOptions('attack').some((s) => s.id === 'punos'), false, 'una vez por nivel');
});
test('ANS7 Lírica Bestial: una vez por nivel evitas un encuentro con un no muerto (no con jefes)', () => {
  const g = start('anc1', AN); const pr = engage(g, 'ANE12'); assert.equal(pr.type, 'avoidEnemy'); assert.ok(pr.options.some((o) => o.id === 'lirica'));
  g.act('avoidEnemy', { id: 'lirica' }); assert.equal(g.s.combat, null); assert.ok(g.s.lvl.lirica);
  const pr2 = engage(g, 'ANE6'); assert.notEqual(pr2?.type === 'avoidEnemy' && pr2.options.some((o) => o.id === 'lirica'), true);
  const h = start('anc1', AN); assert.notEqual(engage(h, 'ANE3').type, 'avoidEnemy'); // fuego: no es no muerto
});

/* ====================================================================================== entornos */
test('ANEN1 La Niebla: combate antes del Campamento, el Altar y las Setas; sin cocinar; los enemigos no suman el nivel', () => {
  const g = start('c1', ANR); setEnv(g, 'ANEN1'); discardAll(g); g.s.level = 3; topEnemy(g, 'E8'); rig(g, [3, 3]);
  resolveCard(g, 'D7'); toAttack(g); assert.equal(g.s.combat.maxHp, 5, 'ni el nivel (3) ni nada se suma');
  kill(g); assert.equal(g.s.prompt.type, 'choice'); assert.equal(g.s.prompt.scene, 'camp'); assert.equal(g.s.prompt.options.find((o) => o.id === 'cook').disabled, true);
  const h = start('c1', ANR); setEnv(h, 'ANEN1'); discardAll(h); h.s.level = 4; topEnemy(h, 'E12'); rig(h, [3, 3]); resolveCard(h, 'D9'); toAttack(h); assert.equal(h.s.combat.maxHp, 8);
  const k = start('c1', ANR); setEnv(k, 'ANEN1'); discardAll(k); k.s.level = 4; topDungeon(k, 'D10', 'D1'); topEnemy(k, 'E12'); k.act('draw'); k.act('reveal', { slot: 0 }); k.act('decline');
  toAttack(k); assert.equal(k.s.combat.maxHp, 8 + 4, 'la Emboscada 2 suma +4 (no el nivel)'); assert.equal(k.s.combat.initialBonus, 0);
  const m = start('c1', ANR); setEnv(m, 'ANEN1'); discardAll(m); assert.equal(resolveCard(m, 'D2', 1).type, 'turn');
});
test('ANEN2 El Reino Arborícola: fuego +2 de daño; sin Bellota Mágica; el Claro se sustituye por otra carta; +2 bendiciones ante jefes y minijefes', () => {
  const g = start('c1', ANR); setEnv(g, 'ANEN2'); discardAll(g); rig(g, [3, 3]); fight(g, 'E12'); assert.equal(g.s.combat.damage, 6);
  const h = start('c1', ANR); setEnv(h, 'ANEN2'); discardAll(h); const a = give(h, 'T40'); rig(h, [3, 3]); fight(h, 'E8'); assert.equal(h.s.prompt.specials.some((s) => s.id === 'bellota'), false);
  const k = start('c1', ANR); setEnv(k, 'ANEN2'); discardAll(k); const top = k.s.z.dungeon[0]; k.s.z.dungeon.unshift(k.mk(k.cat.byCode.get('D10').id), k.mk(k.cat.byCode.get('D9').id));
  const evk = events(k); topDungeon(k, 'D10'); const clearing = k.s.z.dungeon[0]; k.act('draw'); k.act('reveal', { slot: 0 }); k.act('resolve');
  assert.ok(evk.some((e) => e.t === 'dungeonSwap' && e.from === clearing)); void top; void a;
  const m = start('c1', ANR); setEnv(m, 'ANEN2'); discardAll(m); rig(m, [3, 3]); boss(m, 'B1'); assert.equal(m.hero.blessings.length, 2);
  const n = start('c1', ANR); setEnv(n, 'ANEN2'); discardAll(n); rig(n, [3, 3]); fight(n, 'ANPT16', { plot: true, hpBonus: 0, source: 'plot' }); assert.equal(n.hero.blessings.length, 2);
  const o = start('c1', ANR); setEnv(o, 'ANEN2'); discardAll(o); rig(o, [3, 3]); fight(o, 'E8'); assert.equal(o.hero.blessings.length, 0);
});
test('ANEN3 Cielo Resquebrajado: 1 de energía (o de salud) por ronda; puedes dar por terminado el nivel en el Campamento; −1 al daño de los enemigos', () => {
  const g = start('c1', ANR); setEnv(g, 'ANEN3'); discardAll(g); rig(g, [4, 1]); fight(g, 'E12'); assert.equal(g.s.combat.damage, 3);
  assert.equal(g.hero.hp, 14 - 6); assert.equal(g.hero.energy, 10); // 11 − 1 de la ronda 1
  rig(g, [6, 6]); g.act('attack', { energy: 0 }); assert.equal(g.hero.energy, 9); // ronda 2 (el ataque a puño no gasta; la ronda sí)
  g.hero.energy = 0; rig(g, [6, 6]); g.act('attack', { energy: 0 }); assert.equal(g.hero.hp, 14 - 6 - 1);
  const h = start('c1', ANR); setEnv(h, 'ANEN3'); resolveCard(h, 'D7'); assert.ok(h.s.prompt.options.some((o) => o.id === 'endLevel')); choose(h, 'endLevel');
  assert.equal(h.s.ctx.endLevelNow, true);
  const k = start('c1', ANR); setEnv(k, 'ANEN3'); discardAll(k); boss(k, 'B1'); assert.equal(k.s.combat.damage, k.cat.byCode.get('B1').damage - 1);
});
test('ANEN3 Cielo Resquebrajado: "finalizar automáticamente este nivel" cierra el nivel tras el Campamento', () => {
  const g = start('c1', ANR); setEnv(g, 'ANEN3'); topDungeon(g, 'D7', 'D10'); g.act('draw'); g.act('reveal', { slot: 0 }); g.act('resolve'); choose(g, 'endLevel');
  assert.equal(g.s.level, 2); assert.equal(g.s.prompt.type, 'choice', 'tras terminar el nivel llega la trama del final de nivel');
});
test('ANEN4 La Ciudad Caída: Emboscada = Escaramuza; combate inicial con iniciativa; Campamento sin Buscar; 1 ración para evitar al jefe (+1 de energía)', () => {
  const g = start('c1', ANR); discardAll(g); g.s.z.environments.unshift(g.mk(g.cat.byCode.get('ANEN4').id)); g.s.env = null; topEnemy(g, 'E10'); rig(g, [3, 3]);
  runTask(g, function t() { this.startLevel(); }); toAttack(g); assert.equal(g.s.combat.ambush, 'player'); assert.equal(g.s.combat.maxHp, 7 + 1); assert.equal(g.hero.hp, 14);
  const h = start('c1', ANR); setEnv(h, 'ANEN4'); discardAll(h); topEnemy(h, 'E10'); rig(h, [3, 3]); resolveCard(h, 'D1', 1); toAttack(h);
  assert.equal(h.s.combat.maxHp, 7 + 1 + 2, 'una Emboscada se resuelve como la Escaramuza (parte 1: +2 de salud)'); assert.equal(h.s.combat.ambush, 'normal');
  const k = start('c1', ANR); setEnv(k, 'ANEN4'); resolveCard(k, 'D7'); assert.equal(k.s.prompt.options.find((o) => o.id === 'search').disabled, true);
  const m = start('c1', ANR); setEnv(m, 'ANEN4'); m.hero.energy = 4; const r = m.hero.rations; const pr = engage(m, 'B1', { boss: true, hpBonus: 0, source: 'boss' });
  assert.equal(pr.type, 'avoidEnemy'); g.act; m.act('avoidEnemy', { id: 'ciudad' }); assert.equal(m.hero.rations, r - 1); assert.equal(m.hero.energy, 5);
  assert.equal(m.s.over.result, 'victory'); assert.equal(m.s.over.ending, 'evaded');
});

/* ====================================================================================== esbirros */
test('ANM1 David Galahad: 1 de daño con su honda antes del daño inicial; pierde 1 de moral cuando recibes 6 o más de daño', () => {
  const g = start('c1', ANT); discardAll(g); const m = hire(g, 'ANM1'); assert.equal(g.merc(m).max, 3);
  rig(g, [6, 1]); fight(g, 'ANE3'); assert.equal(g.s.combat.hp, 7 - 1); assert.equal(g.hero.hp, 14 - 6); assert.equal(merc(g, 'ANM1').morale, 2);
  rig(g, [3, 1]); g.act('attack', { energy: 0 }); assert.equal(merc(g, 'ANM1').morale, 2, 'menos de 6');
  const d = g.cat.byCode.get('ANM1'); assert.deepEqual([d.cost, d.die], [1, 3]);
});
test('ANM2 Gral el Pirata: pierde 1 de moral cada vez que gastas oro; combate en tu lugar (1d6, sin energía, una vez por combate)', () => {
  const g = start('c1', ANT); discardAll(g); hire(g, 'ANM2'); g.hero.gold = 6; assert.equal(merc(g, 'ANM2').max, 5);
  g.lose('gold', 2, 'compra'); assert.equal(merc(g, 'ANM2').morale, 4); g.lose('gold', 1, 'moral'); assert.equal(merc(g, 'ANM2').morale, 4);
  g.gain('gold', 3); assert.equal(merc(g, 'ANM2').morale, 4);
  give(g, 'T5'); rig(g, [3, 3]); fight(g, 'ANE12', { hpBonus: 20 }); const sp = g.s.prompt.specials.find((s) => s.id === 'gral'); assert.ok(sp);
  const e = g.hero.energy; rig(g, [5, 3, 3]); g.act('special', { id: 'gral' }); assert.equal(g.hero.energy, e); assert.equal(g.s.combat.hp, 23 - 5);
  assert.equal(g.s.prompt.specials.some((s) => s.id === 'gral'), false);
});
test('ANM2 Gral: con 11 o más de oro al llegar al Campamento un 1 en d6 le hace intentar robártelo; si te mata, te roba todo el oro', () => {
  const g = start('c1', ANT); discardAll(g); hire(g, 'ANM2'); g.hero.gold = 12; g.hero.hp = 3; rig(g, [1, 6, 1]); resolveCard(g, 'D7');
  assert.ok(g.s.log.some((l) => l.msg.includes('Combate contra Gral') || l.msg.includes('¡Combate contra Gral')));
  assert.equal(g.hero.gold, 0); assert.equal(g.hero.hp, 3); assert.equal(merc(g, 'ANM2'), null); assert.equal(g.s.over, null);
  assert.equal(g.s.prompt.scene, 'camp', 'después de la pelea elegirías la acción de Campamento');
  const h = start('c1', ANT); discardAll(h); hire(h, 'ANM2'); h.hero.gold = 12; rig(h, [4]); resolveCard(h, 'D7'); assert.equal(h.s.combat, null); assert.equal(h.s.prompt.scene, 'camp');
  const k = start('c1', ANT); discardAll(k); hire(k, 'ANM2'); k.hero.gold = 10; rig(k, [1]); resolveCard(k, 'D7'); assert.equal(k.s.combat, null);
});
test('ANM2 Gral: si le derrotas en el Campamento te deja su botín (tesoro 1) y se marcha', () => {
  const g = start('c1', ANT); discardAll(g); hire(g, 'ANM2'); g.hero.gold = 12; rig(g, [1, 3, 3]); resolveCard(g, 'D7');
  g.s.combat.hp = 1; g.act('attack', { energy: 0 }); treasure(g, 'gold'); assert.equal(merc(g, 'ANM2'), null); assert.equal(g.s.z.graveyard.length, 0); assert.equal(g.hero.gold, 13);
});

/* ====================================================================================== tramas */
const eyesOf = (key) => buildCatalog(AN).byCode.get(key).eyes;
test('Tramas de ANEMIA: 22 cartas con 40 ojos en total (1-4 por carta) y el minijefe Unicornio Bicéfalo con 4', () => {
  const c = buildCatalog(AN); const list = c.pools.plots.filter((d) => d.pack === 'anemia');
  assert.equal(list.length, 22); assert.equal(list.reduce((n, d) => n + d.eyes, 0), 40);
  assert.equal(eyesOf('ANPT16'), 4); assert.equal(c.byCode.get('ANPT16').miniboss, true); assert.deepEqual([c.byCode.get('ANPT16').health, c.byCode.get('ANPT16').damage], [9, 2]);
  for (const d of list) assert.ok(d.plotEnemy || d.options.length > 0 || d.text, d.key);
});
test('ANPT1 La Criatura: dos enemigos seguidos; si derrotas a ambos: moral +1 y d6 (1 pierdes 1 de salud, 6 ganas 1 de energía); huir cuesta 1 de energía y moral', () => {
  const g = start('c1', AN); discardAll(g); g.s.z.enemies = []; topEnemy(g, 'E2'); topEnemy(g, 'E1'); plot(g, 'ANPT1'); rig(g, [6, 1]); choose(g, 'o1'); toAttack(g);
  assert.equal(g.def(g.s.combat.uid).key, 'E1'); kill(g); toAttack(g); assert.equal(g.def(g.s.combat.uid).key, 'E2'); rig(g, [6]); kill(g);
  assert.equal(g.hero.morality, 1); assert.equal(g.hero.energy, 12); assert.equal(g.s.eyes, 1);
  const h = start('c1', AN); discardAll(h); h.s.z.enemies = []; topEnemy(h, 'E2'); topEnemy(h, 'E1'); plot(h, 'ANPT1'); choose(h, 'o1'); toAttack(h); kill(h); toAttack(h); rig(h, [1]); kill(h);
  assert.equal(h.hero.hp, 13); const k = start('c1', AN); plot(k, 'ANPT1'); choose(k, 'o2'); assert.equal(k.hero.energy, 10); assert.equal(k.hero.morality, -1);
});
test('ANPT2 La Jaula: roba una carta de enemigo y enfréntate a él (2 ojos)', () => {
  const g = start('c1', AN); discardAll(g); topEnemy(g, 'E12'); plot(g, 'ANPT2'); toAttack(g); assert.equal(g.def(g.s.combat.uid).key, 'E12'); assert.equal(g.s.combat.maxHp, 9);
  rig(g, [1]); kill(g); assert.equal(g.s.eyes, 2);
});
test('ANPT3 El Santo Grial: d6 1 pierdes 4 de salud, 2-5 todo recuperado y sin veneno, 6 ganas 4 de veneno', () => {
  const g = start('c1', AN); g.hero.hp = 2; g.hero.energy = 3; g.hero.poison = 1; plot(g, 'ANPT3'); rig(g, [3]); choose(g, 'o1');
  assert.equal(g.hero.hp, 14); assert.equal(g.hero.energy, 14); assert.equal(g.hero.poison, 0);
  const h = start('c1', AN); plot(h, 'ANPT3'); rig(h, [1]); choose(h, 'o1'); assert.equal(h.hero.hp, 10);
  const k = start('c1', AN); plot(k, 'ANPT3'); rig(k, [6]); choose(k, 'o1'); assert.equal(k.hero.poison, 4); assert.equal(k.s.eyes, 2);
  const m = start('c1', AN); plot(m, 'ANPT3'); choose(m, 'o2'); assert.equal(m.hero.hp, 14);
});
test('ANPT4 El Hombre de Latón: tres tiradas (la 2ª y la 3ª pueden costar energía); puedes abandonar; recompensa: 2 de botín y moral +1', () => {
  const g = start('c1', AN); discardAll(g); itemsOnly(g); plot(g, 'ANPT4'); rig(g, [4, 2]); choose(g, 'o1');
  assert.equal(g.hero.energy, 11); assert.equal(g.s.prompt.type, 'choice'); assert.deepEqual(g.s.prompt.options.map((o) => o.id), ['go', 'leave']);
  g.act('choose', { id: 'go' }); assert.equal(g.hero.energy, 11 - 2); // 2 < 4: gastas 2 para igualarlo
  rig(g, [5]); g.act('choose', { id: 'go' }); assert.equal(g.hero.energy, 9); // 5 ≥ 2: sin coste
  assert.equal(g.allItems().length, 2); assert.equal(g.hero.morality, 1); assert.equal(g.s.eyes, 1);
  const h = start('c1', AN); discardAll(h); plot(h, 'ANPT4'); rig(h, [6, 1]); choose(h, 'o1'); h.act('choose', { id: 'go' }); assert.equal(h.hero.energy, 11 - 5); h.act('choose', { id: 'leave' });
  assert.equal(h.allItems().length, 0); assert.equal(h.hero.morality, 0);
  const k = start('c1', AN); discardAll(k); itemsOnly(k); k.hero.energy = 1; plot(k, 'ANPT4'); rig(k, [5, 1]); choose(k, 'o1'); k.act('choose', { id: 'go' });
  assert.equal(k.allItems().length, 0, 'sin energía suficiente tienes que abandonar'); assert.equal(k.hero.energy, 1);
  const m = start('c1', AN); discardAll(m); itemsOnly(m); plot(m, 'ANPT4'); rig(m, [5, 6, 3]); choose(m, 'o1'); m.act('choose', { id: 'go' }); m.act('choose', { id: 'go' });
  assert.equal(m.hero.energy, 11 - 2, 'la 3ª (3) es menor que la 2ª (6): gastas lo necesario para igualar la primera (5)'); assert.equal(m.allItems().length, 2);
});
test('ANPT5 Marea Gris: gastas un d6 en energía (y en salud si no alcanza) y la moral sube; o pagas 2 de oro', () => {
  const g = start('c1', AN); g.hero.energy = 2; plot(g, 'ANPT5'); rig(g, [5]); choose(g, 'o1'); assert.equal(g.hero.energy, 0); assert.equal(g.hero.hp, 14 - 3); assert.equal(g.hero.morality, 1);
  const h = start('c1', AN); h.hero.gold = 1; plot(h, 'ANPT5'); assert.equal(h.s.prompt.options.find((o) => o.id === 'o2').disabled, true);
  const k = start('c1', AN); k.hero.gold = 3; plot(k, 'ANPT5'); choose(k, 'o2'); assert.equal(k.hero.gold, 1); assert.equal(k.s.eyes, 2);
});
test('ANPT6 Los Tres Túneles: izquierda (3d6 sin 6: −1 salud y energía), centro (3-5: +1 veneno), derecha (2d6, el menor 1-2: −2 de energía)', () => {
  const g = start('c1', AN); plot(g, 'ANPT6'); assert.equal(g.s.prompt.options.length, 3); rig(g, [1, 2, 3]); choose(g, 'o1'); assert.equal(g.hero.hp, 13); assert.equal(g.hero.energy, 10);
  const g2 = start('c1', AN); plot(g2, 'ANPT6'); rig(g2, [1, 6, 3]); choose(g2, 'o1'); assert.equal(g2.hero.hp, 14);
  const h = start('c1', AN); plot(h, 'ANPT6'); rig(h, [4]); choose(h, 'o2'); assert.equal(h.hero.poison, 1);
  const h2 = start('c1', AN); plot(h2, 'ANPT6'); rig(h2, [2]); choose(h2, 'o2'); assert.equal(h2.hero.poison, 0);
  const k = start('c1', AN); plot(k, 'ANPT6'); rig(k, [6, 2]); choose(k, 'o3'); assert.equal(k.hero.energy, 9); // el menor es 2
  const k2 = start('c1', AN); k2.hero.energy = 1; plot(k2, 'ANPT6'); rig(k2, [1, 5]); choose(k2, 'o3'); assert.equal(k2.hero.energy, 0); assert.equal(k2.hero.hp, 13);
  const k3 = start('c1', AN); plot(k3, 'ANPT6'); rig(k3, [4, 5]); choose(k3, 'o3'); assert.equal(k3.hero.energy, 11); assert.equal(k3.s.eyes, 2);
});
test('ANPT7 Alora: recoges a la niña (+3 de moral, ocupa 3 de carga) o la dejas (−2 de moral)', () => {
  const g = start('c1', AN); const w = g.maxWeight(); plot(g, 'ANPT7'); choose(g, 'o1'); assert.equal(g.hero.morality, 3); assert.equal(g.maxWeight(), w - 3);
  const h = start('c1', AN); plot(h, 'ANPT7'); choose(h, 'o2'); assert.equal(h.hero.morality, -2); assert.equal(h.maxWeight(), 10);
  const k = start('c1', AN); k.hero.carryBonus = 0; give(k, 'L12'); give(k, 'L6'); plot(k, 'ANPT7'); choose(k, 'o1'); assert.equal(k.s.prompt.type, 'overweight');
});
test('ANPT8 Cambio de Cuerpo: cambias de personaje (se recortan los atributos que superen los del nuevo y cambia la habilidad inicial)', () => {
  const g = start('c1', AN); plot(g, 'ANPT8'); choose(g, 'o1'); assert.equal(g.s.prompt.type, 'choice'); assert.ok(g.s.prompt.options.some((o) => o.id === 'anc5'));
  assert.equal(g.s.prompt.options.some((o) => o.id === 'c1'), false);
  g.act('choose', { id: 'anc5' }); assert.equal(g.hero.name, 'Thorn'); assert.equal(g.hero.key, 'ANC5'); assert.equal(g.s.heroId, 'anc5');
  assert.deepEqual(g.hero.skills.map((id) => g.cat.def(id).key), ['ANS1']); assert.equal(g.hasSkill('S7'), false); assert.ok(g.s.z.skills.some((u) => g.def(u).key === 'S7'), 'Esquivar vuelve a su mazo');
  assert.equal(g.maxHp(), 14, 'Thorn: 7 + 7 de Sangre Envenenada');
  assert.equal(g.hero.hp, 14); assert.equal(g.hero.energy, 10); assert.equal(g.hero.encumbrance, 11); assert.equal(g.hero.proficiency, 'agilidad');
  const h = start('c1', AN); plot(h, 'ANPT8'); choose(h, 'o2'); assert.equal(h.hero.energy, 12); assert.equal(h.hero.morality, 1);
});
test('ANPT9 Doya: 2 de energía, 1 de salud y 1 de ración por una habilidad cualquiera y 1 bendición; o una comida rápida (+1 energía, +1 ración)', () => {
  const g = start('c1', AN); plot(g, 'ANPT9'); choose(g, 'o1'); assert.equal(g.s.prompt.purpose, 'learnSkill'); const sk = g.s.prompt.uids[0];
  g.act('pickCards', { uids: [sk] }); assert.equal(g.hero.energy, 9); assert.equal(g.hero.hp, 13); assert.equal(g.hero.rations, 0); assert.equal(g.hero.blessings.length, 1); assert.equal(g.hero.skills.length, 2);
  const h = start('c1', AN); h.hero.rations = 0; plot(h, 'ANPT9'); assert.equal(h.s.prompt.options[0].disabled, true); choose(h, 'o2'); assert.equal(h.hero.rations, 1); assert.equal(h.hero.energy, 12);
});
test('ANPT10 Arena de Combate: dos enemigos (el más débil primero) como no muertos para tus bonificaciones, sin botín; +4 de oro al final', () => {
  const g = start('c1', AN); discardAll(g); give(g, 'T27'); g.s.z.enemies = []; topEnemy(g, 'E7'); topEnemy(g, 'E3'); const gold = g.hero.gold;
  plot(g, 'ANPT10'); rig(g, [3, 3]); choose(g, 'o1'); toAttack(g); assert.equal(g.def(g.s.combat.uid).key, 'E3'); assert.equal(g.s.combat.asUndead, true);
  assert.equal(g.previewDamage([3, 3], 2), 6 + 2, 'el Bastón de Peregrino (+2 contra no muertos) funciona'); g.s.combat.hp = 1; g.act('attack', { energy: 0 });
  assert.equal(g.hero.gold, gold, 'sin botín'); toAttack(g); assert.equal(g.def(g.s.combat.uid).key, 'E7'); g.s.combat.hp = 1; rig(g, [1]); g.act('attack', { energy: 0 });
  assert.equal(g.hero.gold, gold + 4); assert.equal(g.s.stats.kills, 2); assert.equal(g.s.z.graveyard.length, 2); assert.equal(g.s.eyes, 3);
});
test('ANPT11 Aquelarre: sangre (−1 de salud, moral −1) o huir (+1 de veneno y 1 más antes de cada combate hasta derrotar a un enemigo a puñetazos)', () => {
  const g = start('c1', AN); plot(g, 'ANPT11'); choose(g, 'o1'); assert.equal(g.hero.hp, 13); assert.equal(g.hero.morality, -1); assert.equal(g.s.eyes, 3);
  const h = start('c1', AN); discardAll(h); plot(h, 'ANPT11'); choose(h, 'o2'); assert.equal(h.hero.poison, 1); assert.equal(h.s.game.curse, true);
  rig(h, [6, 6]); fight(h, 'ANE3'); assert.equal(h.hero.poison, 2); h.s.combat.hp = 1; h.act('attack', { energy: 0 }); treasure(h, 'gold'); assert.equal(h.s.game.curse, false);
  fight(h, 'ANE3'); assert.equal(h.hero.poison, 2);
  const k = start('c1', AN); discardAll(k); give(k, 'T5'); plot(k, 'ANPT11'); choose(k, 'o2'); rig(k, [6, 6]); fight(k, 'ANE3'); k.s.combat.hp = 1; rig(k, [4]); k.act('attack', { energy: 1 }); treasure(k, 'gold');
  assert.equal(k.s.game.curse, true, 'matar con un arma no rompe la maldición');
});
test('ANPT12 Nido de Víboras: 4 tiradas de 3d6; cada una con dos o más 1 te da 1 de veneno; si ninguna muerde, +1 de energía', () => {
  const g = start('c1', AN); rig(g, [2, 3, 4, 2, 2, 5, 3, 6, 6, 4, 4, 2]); plot(g, 'ANPT12'); assert.equal(g.hero.poison, 0); assert.equal(g.hero.energy, 12);
  const h = start('c1', AN); rig(h, [1, 1, 3, 2, 3, 4, 1, 1, 1, 5, 6, 2]); plot(h, 'ANPT12'); assert.equal(h.hero.poison, 2); assert.equal(h.hero.energy, 11); assert.equal(h.s.eyes, 1);
  const k = start('c1', AN); rig(k, [2, 3, 4, 5, 5, 5, 6, 6, 6, 1, 2, 3]); plot(k, 'ANPT12'); assert.equal(k.hero.poison, 0); assert.equal(k.hero.energy, 12);
});
test('ANPT13 El Portal: te lleva a otro nivel (relanza 6 o tu nivel) o combates ya contra el jefe final', () => {
  const g = start('c1', AN); g.s.level = 3; plot(g, 'ANPT13'); rig(g, [6, 3, 4]); choose(g, 'o1'); assert.equal(g.s.level, 4);
  const h = start('c1', AN); h.s.level = 2; plot(h, 'ANPT13'); rig(h, [2, 1]); choose(h, 'o1'); assert.equal(h.s.level, 1);
  const k = start('c1', AN); plot(k, 'ANPT13'); choose(k, 'o2'); assert.equal(k.s.bossStarted, true); assert.ok(['divine', 'attack', 'avoidEnemy', 'pre'].includes(k.s.prompt.type), k.s.prompt.type);
});
test('ANPT14 Poza Cristalina: 2 de energía por +2 de salud y −1 de veneno; o respetar el lugar sagrado (+1 bendición)', () => {
  const g = start('c1', AN); g.hero.hp = 5; g.hero.poison = 2; plot(g, 'ANPT14'); choose(g, 'o1'); assert.equal(g.hero.hp, 7); assert.equal(g.hero.poison, 1); assert.equal(g.hero.energy, 9);
  const h = start('c1', AN); h.hero.energy = 1; plot(h, 'ANPT14'); assert.equal(h.s.prompt.options[0].disabled, true); choose(h, 'o2'); assert.equal(h.hero.blessings.length, 1);
});
test('ANPT15 La Horda: resolución con dados, sin energía y sacrificando a un esbirro', () => {
  const g = start('c1', ANT); rig(g, [12]); plot(g, 'ANPT15'); assert.equal(g.s.prompt.type, 'choice'); rig(g, [6, 5]); g.act('choose', { id: 'dice2' });
  assert.equal(g.hero.energy, 9); assert.equal(g.hero.hp, 14 - 1); // 11 contra 12
  const h = start('c1', ANT); rig(h, [8]); plot(h, 'ANPT15'); rig(h, [3, 5]); h.act('choose', { id: 'dice2' }); assert.equal(h.hero.hp, 14);
  const k = start('c1', ANT); k.hero.energy = 0; rig(k, [9]); plot(k, 'ANPT15'); assert.deepEqual(k.s.prompt.options.map((o) => o.id), ['dice1', 'dice2', 'dice3', 'resign']); k.act('choose', { id: 'resign' }); assert.equal(k.hero.hp, 14 - 9);
  const m = start('c1', ANT); hire(m, 'ANM1'); rig(m, [20]); plot(m, 'ANPT15'); const mu = m.s.mercs[0].uid; m.act('choose', { id: `merc:${mu}` }); assert.equal(m.s.mercs.length, 0); assert.equal(m.hero.hp, 14);
});
test('ANPT16 Unicornio Bicéfalo (minijefe 4 ojos): realiza 2 ataques al contraatacar', () => {
  const g = start('c1', AN); discardAll(g); g.hero.hp = 40; rig(g, [3, 3]); plot(g, 'ANPT16'); toAttack(g); assert.equal(g.s.combat.maxHp, 9);
  rig(g, [4, 1, 5, 2]); g.act('attack', { energy: 0 }); assert.equal(g.hero.hp, 40 - (3 + 2) - (3 + 2)); // dos contraataques
});
test('ANPT17 A Través de la Batalla: pierdes d6 de salud y d6 de energía y ganas 2 bendiciones; o esperas y gastas 1 ración', () => {
  const g = start('c1', AN); plot(g, 'ANPT17'); rig(g, [3, 2]); choose(g, 'o1'); assert.equal(g.hero.hp, 11); assert.equal(g.hero.energy, 9); assert.equal(g.hero.blessings.length, 2);
  const h = start('c1', AN); plot(h, 'ANPT17'); choose(h, 'o2'); assert.equal(h.hero.rations, 0); assert.equal(h.s.eyes, 2);
});
test('ANPT18 La Pitonisa: 1-2 una ficha de veneno, 5-6 una de salud (pasan a tu carta al final de tu próximo combate)', () => {
  const g = start('c1', AN); discardAll(g); rig(g, [1]); plot(g, 'ANPT18'); assert.equal(g.hero.poison, 0); rig(g, [3, 3]); fight(g, 'ANE3'); g.s.combat.hp = 1; g.act('attack', { energy: 0 }); treasure(g, 'gold');
  assert.equal(g.hero.poison, 1);
  const h = start('c1', AN); discardAll(h); h.hero.hp = 5; rig(h, [6]); plot(h, 'ANPT18'); fight(h, 'ANE3'); h.s.combat.hp = 1; h.act('attack', { energy: 0 }); treasure(h, 'gold'); assert.equal(h.hero.hp, 6);
  const k = start('c1', AN); rig(k, [4]); plot(k, 'ANPT18'); assert.equal(k.s.game.delayed?.length || 0, 0); assert.equal(k.s.eyes, 1);
});
test('ANPT19 El gusano Volador: luchar (d6: 1 → 0, 2-5 → 1, 6 → 2 de salud; siempre −2 de energía) o viajar (−2 de energía y 1 de botín)', () => {
  const g = start('c1', AN); plot(g, 'ANPT19'); rig(g, [6]); choose(g, 'o1'); assert.equal(g.hero.hp, 12); assert.equal(g.hero.energy, 9);
  const h = start('c1', AN); plot(h, 'ANPT19'); rig(h, [1]); choose(h, 'o1'); assert.equal(h.hero.hp, 14);
  const k = start('c1', AN); discardAll(k); itemsOnly(k); plot(k, 'ANPT19'); choose(k, 'o2'); assert.equal(k.hero.energy, 9); assert.equal(k.allItems().length, 1);
});
test('ANPT20 El Trato: robas las fichas de bendición que quieras; corazones curan, veneno envenena; luego se barajan en la reserva', () => {
  const g = start('c1', AN); g.hero.hp = 3; g.s.z.blessingPile = [{ k: 'hp', n: 3 }, { k: 'en', n: 2 }, { k: 'cure', n: 0 }, { k: 'hp', n: 1 }];
  plot(g, 'ANPT20'); choose(g, 'o1'); g.act('choose', { id: 'more' }); g.act('choose', { id: 'more' }); g.act('choose', { id: 'more' }); g.act('choose', { id: 'stop' });
  assert.equal(g.hero.hp, 6); assert.equal(g.hero.poison, 1); assert.equal(g.s.z.blessingPile.length, 4); assert.equal(g.s.eyes, 2);
  const h = start('c1', AN); plot(h, 'ANPT20'); choose(h, 'o1'); h.act('choose', { id: 'stop' }); assert.equal(h.hero.hp, 14); assert.equal(h.s.z.blessingPile.length, 12);
  const k = start('c1', AN); k.s.z.blessingPile = [{ k: 'hp', n: 2 }]; plot(k, 'ANPT20'); choose(k, 'o1'); k.act('choose', { id: 'more' }); assert.equal(k.s.prompt?.type === 'choice', false); assert.equal(k.s.z.blessingPile.length, 1);
});
test('ANPT21 El Libro Prohibido: pierdes una habilidad para siempre (+1 bendición, moral +2) o rezas (moral −1, −1 bendición)', () => {
  const g = start('c1', AN); learn(g, 'S6'); plot(g, 'ANPT21'); choose(g, 'o1'); assert.equal(g.s.prompt.purpose, 'loseSkill'); const u = g.s.prompt.uids[0];
  g.act('pickCards', { uids: [u] }); assert.equal(g.hero.skills.length, 1); assert.ok(g.s.z.removed.includes(u)); assert.equal(g.hero.blessings.length, 1); assert.equal(g.hero.morality, 2); assert.equal(g.s.eyes, 3);
  const h = start('c1', AN); h.gain('blessing', 2); plot(h, 'ANPT21'); choose(h, 'o2'); assert.equal(h.hero.blessings.length, 1); assert.equal(h.hero.morality, -1);
  const k = start('c1', AN); k.hero.skills = []; k.hero.skillCards = {}; plot(k, 'ANPT21'); choose(k, 'o1'); assert.equal(k.hero.blessings.length, 1);
});
test('ANPT22 Necronomicón: −2 de salud, +3 de energía (superando el máximo) y +1 bendición; o te acobardas (−2 de energía, moral +1)', () => {
  const g = start('c1', AN); g.hero.energy = 14; plot(g, 'ANPT22'); choose(g, 'o1'); assert.equal(g.hero.hp, 12); assert.equal(g.hero.energy, 17); assert.equal(g.hero.blessings.length, 1);
  g.gain('energy', 2); assert.equal(g.hero.energy, 17, 'ganar más energía no la baja');
  const h = start('c1', AN); plot(h, 'ANPT22'); choose(h, 'o2'); assert.equal(h.hero.energy, 9); assert.equal(h.hero.morality, 1);
});

/* ====================================================================================== regresiones */
test('Regresión: Encuentro Salvaje con un peligro o el Mutante entre los robados no deja la selección vacía', () => {
  const g = start('c1', { modules: ['anemia', 'howling'] }); discardAll(g); g.s.z.enemies = []; topEnemy(g, 'ANE7'); topEnemy(g, 'ANE1');
  resolveCard(g, 'D24', 1); assert.equal(g.s.prompt.type, 'pickCards'); assert.equal(g.s.prompt.purpose, 'wild'); assert.equal(g.s.prompt.uids.length, 2);
  const h = start('c1', { modules: ['anemia', 'howling'] }); discardAll(h); h.s.z.enemies = []; topEnemy(h, 'E12'); topEnemy(h, 'ANE1'); resolveCard(h, 'D24', 1);
  assert.equal(h.def(h.s.combat.uid).key, 'E12', 'el Mutante (salud "*") cuenta como el más débil'); assert.ok(h.s.combat.maxHp > 0);
});
test('Regresión: Necrofobia ante un enemigo de una serie de combates no deja cartas sin zona ni corta la serie', () => {
  const g = start('c1', AN); discardAll(g); affliction(g, 'AF3'); topEnemy(g, 'E8'); topEnemy(g, 'E2'); // los dos no muertos
  plot(g, 'ANPT10'); rig(g, [1, 1]); choose(g, 'o1');
  assert.equal(g.s.z.enemiesDiscard.length, 2, 'huyes de ambos'); assert.equal(g.s.eyes, 3); assert.equal(audit(g).problems.length, 0); assert.equal(audit(g).orphans, 0);
});
test('Regresión: un antídoto bebido antes de elegir qué aflicción cura una poción de salud no deja una selección vacía', () => {
  const g = start('c1', AN); affliction(g, 'ANAF1'); affliction(g, 'ANAF2'); g.hero.hp = 3; const p = give(g, 'P1'); const a = give(g, 'P2'); g.act('use', { uid: p }); g.act('use', { uid: a });
  assert.equal(g.hero.afflictions.length, 0); g.act('draw'); assert.notEqual(g.s.prompt.type, 'pickCards');
});
test('Regresión: Cambio de Cuerpo hacia La Bestia aplica su regla de carga y desde ella la quita', () => {
  const g = start('c1', AN); plot(g, 'ANPT8'); choose(g, 'o1'); g.act('choose', { id: 'anc2' });
  assert.equal(g.hero.carryRule, 'weaponsOnly'); assert.equal(g.maxWeight(), 0); assert.equal(g.hero.name, 'La Bestia');
  const h = start('anc2', AN); plot(h, 'ANPT8'); choose(h, 'o1'); h.act('choose', { id: 'c1' }); assert.equal(h.hero.carryRule, undefined); assert.equal(h.hero.encumbrance, 10);
});
