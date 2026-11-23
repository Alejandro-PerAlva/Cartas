/**
 * Campañas nuevas: El Laberinto de Galnok, Cavernas de Cristal, El Trono Ardiente, El Refugio de Malicia y
 * El Torreón de Zogar. Un escenario (con dados trucados) por cada carta con efecto mecánico.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRemovals } from '../iron_helm_game/js/engine/index.js';
import { PACKS } from '../iron_helm_game/js/data/pack-fx.js';
import { GENERATED } from '../iron_helm_game/js/data/packs/index.js';
import { rig, start, topDungeon, topEnemy, topLoot, give, discardAll, turn, toAttack, fight, engage, plot, choose, treasure, runTask,
  resolveCard, codes, events } from './helpers/scenario.js';

const GAL = { campaign: 'galnok' }; const CRY = { campaign: 'crystal' }; const THR = { campaign: 'throne' };
const MAL = { campaign: 'malicia' }; const SPI = { campaign: 'spire' };
/** remata al enemigo actual con un puñetazo y coge oro del tesoro tipo 1 */
function kill(g) { g.s.combat.hp = 1; g.act('attack', { energy: 0 }); treasure(g, 'gold'); }
const has = (g, key) => g.allItems().some((u) => g.def(u).key === key);

/* ====================================================================================== reglas de campaña */
test('Campañas: las cartas retiradas se resuelven por NOMBRE desde la carta de campaña y coinciden con PACKS.remove', () => {
  for (const p of PACKS.filter((x) => x.type === 'campaign')) {
    const r = resolveRemovals(GENERATED[p.id].meta.campaign.removes);
    assert.deepEqual(r.enemies, p.remove.enemies, p.id); assert.deepEqual(r.plots, p.remove.plots, p.id);
    assert.equal(GENERATED[p.id].meta.campaign.level, p.adventureLevel, `${p.id}: NIVEL impreso`);
  }
});

function campaignSetup(cfg, { gone, plotsGone, added, boss, level, hero }) {
  const g = start('c1', cfg);
  const enemies = [...codes(g, 'enemies')];
  for (const c of gone) assert.equal(enemies.includes(c), false, `${c} debería retirarse`);
  for (const [c, n] of Object.entries(added)) assert.equal(enemies.filter((x) => x === c).length, n, c);
  for (const c of plotsGone) assert.equal(codes(g, 'plots').includes(c), false, `${c} debería retirarse`);
  assert.equal(g.def(g.determineBoss()).key, boss);
  assert.equal(g.s.adventureLevel, level);
  assert.equal(g.s.level, 1, 'el NIVEL de la campaña es la dificultad de la aventura, no el nivel inicial');
  if (hero) assert.ok(g.cat.pools.heroes.some((h) => h.code === hero));
  return g;
}

/* ====================================================================================== El Laberinto de Galnok */
test('Galnok: retira Guerrero Orco, Goblins, Lobos y Peciforme y La Anciana, El Pasadizo y El Lobo; jefe Galnok; aventura de nivel 2', () => {
  campaignSetup(GAL, { gone: ['E7', 'E1', 'E5', 'E9'], plotsGone: ['PT1', 'PT4', 'PT7'], added: { E17: 3, E18: 2 }, boss: 'B6', level: 2, hero: 'C7' });
});
test('B6 Galnok: con dobles no falla, te impacta por el valor de uno de los dados', () => {
  const g = start('c1', GAL); discardAll(g);
  rig(g, [4, 4]); fight(g, 'B6', { boss: true, hpBonus: 0, source: 'boss' });
  assert.equal(g.hero.hp, 14 - (4 + 2));
});
test('E17 Calavera Flotante: al derrotarla sube la moral', () => {
  const g = start('c1', GAL); discardAll(g); rig(g, [3, 3]); fight(g, 'E17'); const m = g.hero.morality;
  kill(g); assert.equal(g.hero.morality, m + 1);
});
test('E18 Vidente de la Muerte: inmune a las pociones (no se ofrecen)', () => {
  const g = start('c1', GAL); discardAll(g); give(g, 'P4'); rig(g, [3, 3]);
  assert.deepEqual(fight(g, 'E18').potions, []);
  const h = start('c1', GAL); discardAll(h); give(h, 'P4'); rig(h, [3, 3]);
  assert.equal(fight(h, 'E17').potions.length, 1);
});
test('S15 Sexto Sentido (Azzlar): evita una emboscada o revela ambas cartas, una vez por nivel', () => {
  const g = start('c7', GAL); topDungeon(g, 'D1', 'D10');
  g.act('draw'); assert.equal(g.s.prompt.sixthSense, true);
  g.act('reveal', { slot: 0 }); g.act('resolve');
  assert.ok(g.s.prompt.options.some((o) => o.id === 'sexto'));
  g.act('avoidCard', { id: 'sexto' });
  assert.equal(g.s.combat, null); assert.equal(g.s.prompt.type, 'turn');
  g.act('draw'); assert.equal(g.s.prompt.sixthSense, false);
  assert.equal(g.act('sixthSense').ok, false);
  const h = start('c7', GAL); h.act('draw'); assert.equal(h.act('sixthSense').ok, true); assert.equal(h.s.prompt.type, 'chooseOne');
});
test('T19 Brebaje de Hulnot: +3 de energía', () => {
  const g = start('c1', GAL); g.hero.energy = 5; const u = give(g, 'T19'); g.act('use', { uid: u });
  assert.equal(g.hero.energy, 8); assert.equal(has(g, 'T19'), false);
});
test('T21 Mochila Grande (galnok): +2 de carga y +1 de salud al descansar en el Campamento', () => {
  const g = start('c1', GAL); const w = g.maxWeight(); give(g, 'galnok:T21'); assert.equal(g.maxWeight(), w + 2);
  g.hero.hp = 8; g.hero.rations = 2; resolveCard(g, 'D7'); choose(g, 'rest');
  assert.equal(g.hero.hp, 8 + 2 + 1);
});
test('T20 Daga de la Luna: una vez por nivel relanza la tirada de ataque de un enemigo', () => {
  const g = start('c7', GAL); // Azzlar empieza con la Daga de la Luna en la mano principal
  rig(g, [6, 1]); const pr = engage(g, 'E10');
  assert.equal(pr.type, 'enemyRoll'); assert.ok(pr.options.some((o) => o.id === 'moon'));
  rig(g, [2, 2]); g.act('enemyReact', { id: 'moon' });
  assert.equal(g.hero.hp, 12); assert.ok(g.s.lvl.moon);
  rig(g, [6, 1]); g.act('attack', { energy: 0 });
  assert.equal(g.hero.hp, 12 - 8); assert.equal(g.s.prompt.type, 'attack');
});
test('L27 Alijo de Mizlak: se resuelve al robarlo (botín+poción+ración o d6 de oro+ración)', () => {
  const g = start('c1', GAL); topLoot(g, 'L27'); const gold = g.hero.gold; const r = g.hero.rations;
  runTask(g, function t() { this.gainLoot(1); });
  assert.deepEqual(g.s.prompt.options.map((o) => o.id), ['loot', 'gold']);
  rig(g, [4]); choose(g, 'gold');
  assert.equal(g.hero.gold, gold + 4); assert.equal(g.hero.rations, r + 1); assert.ok(codes(g, 'lootDiscard').includes('L27'));
  const h = start('c1', GAL); discardAll(h); topLoot(h, 'L27'); const n = h.allItems().length;
  runTask(h, function t() { this.gainLoot(1); }); h.s.z.loot = h.s.z.loot.filter((u) => h.def(u).kind === 'item'); choose(h, 'loot');
  assert.equal(h.allItems().length, n + 2);
});
test('L25 Máscara de Mizlak (galnok): evita a los no muertos de 4 o menos de salud base', () => {
  const g = start('c1', GAL); discardAll(g); give(g, 'galnok:L25');
  const pr = engage(g, 'E2'); assert.equal(pr.type, 'avoidEnemy'); assert.ok(pr.options.find((o) => o.id === 'mask'));
  g.act('avoidEnemy', { id: 'mask' }); assert.equal(g.s.combat, null);
  const h = start('c1', GAL); discardAll(h); give(h, 'galnok:L25'); rig(h, [3, 3]);
  assert.notEqual(engage(h, 'E8').type, 'avoidEnemy'); // Guerrero No Muerto: salud base 5
});
test('L26 Diario de Mizlak: revela 5 de botín, descarta las que quieras y devuelve el resto encima', () => {
  const g = start('c1', GAL); const top = g.s.z.loot.slice(0, 5); const u = give(g, 'L26');
  g.act('use', { uid: u }); assert.equal(g.s.prompt.purpose, 'diary'); assert.deepEqual(g.s.prompt.uids, top);
  g.act('pickCards', { uids: [top[0], top[2]] });
  assert.deepEqual(g.s.z.loot.slice(0, 3), [top[1], top[3], top[4]]);
  assert.ok(g.s.z.lootDiscard.includes(top[0]) && g.s.z.lootDiscard.includes(top[2]));
});
test('PT16 El Agresor: pierdes 1 de salud antes de elegir; 2 de oro o moral +1 y bendición', () => {
  const g = start('c1', GAL); const gold = g.hero.gold; plot(g, 'PT16'); assert.equal(g.hero.hp, 13);
  choose(g, 'o1'); assert.equal(g.hero.gold, gold + 2); assert.equal(g.s.eyes, 1);
  const h = start('c1', GAL); plot(h, 'PT16'); choose(h, 'o2'); assert.equal(h.hero.morality, 1); assert.equal(h.hero.blessings.length, 1);
});
test('PT18 Comida Sospechosa: dado par +2 de energía, impar +1 y veneno; dar comida exige una ración', () => {
  const g = start('c1', GAL); g.hero.energy = 5; g.hero.rations = 0; plot(g, 'PT18');
  assert.equal(g.s.prompt.options.find((o) => o.id === 'o3').disabled, true);
  rig(g, [4]); choose(g, 'o2'); assert.equal(g.hero.energy, 7);
  const h = start('c1', GAL); h.hero.energy = 5; plot(h, 'PT18'); rig(h, [3]); choose(h, 'o2');
  assert.equal(h.hero.energy, 6); assert.equal(h.hero.poison, 1);
  const k = start('c1', GAL); plot(k, 'PT18'); choose(k, 'o3');
  assert.equal(k.hero.rations, 0); assert.equal(k.hero.blessings.length, 1); assert.equal(k.hero.morality, 1);
});
test('PT17 Venganza: 2 de oro para retirar al Mimético del botín; si ya lo derrotaste te paga 2 de oro', () => {
  const g = start('c1', GAL); plot(g, 'PT17');
  assert.equal(g.s.prompt.options.find((o) => o.id === 'o3').disabled, true);
  choose(g, 'o1'); assert.equal(g.hero.gold, 1);
  assert.equal([...codes(g, 'loot'), ...codes(g, 'lootDiscard')].includes('L8'), false); assert.ok(codes(g, 'removed').includes('L8'));
  const h = start('c1', GAL); h.s.z.graveyard.push({ uid: h.mk('l8'), spent: false }); plot(h, 'PT17'); choose(h, 'o3');
  assert.equal(h.hero.gold, 5);
});

/* ====================================================================================== Cavernas de Cristal */
test('Crystal: retira Skinklings, Zombies, Lobos y Peciforme; jefe Dragón de Cristal; aventura de nivel 3', () => {
  campaignSetup(CRY, { gone: ['E3', 'E2', 'E5', 'E9'], plotsGone: ['PT3', 'PT4', 'PT2'], added: { E20: 4, E19: 1 }, boss: 'B7', level: 3, hero: 'C8' });
});
test('B7 Dragón de Cristal: con 8 o más de daño destruye un objeto equipado a tu elección', () => {
  const g = start('c1', CRY); const vest = g.s.eq.CP; // Fayon: Broquel + Vestiduras
  rig(g, [6, 1]); const pr = fight(g, 'B7', { boss: true, hpBonus: 0, source: 'boss' });
  assert.equal(g.hero.hp, 14 - 9);
  assert.equal(pr.type, 'pickCards'); assert.equal(pr.purpose, 'destroy'); assert.deepEqual(pr.uids, [vest]); // el Broquel ya se rompió (4+)
  g.act('pickCards', { uids: [vest] }); assert.ok(g.s.z.removed.includes(vest)); assert.equal(g.s.eq.CP, null);
});
test('E20 Blizzling: si te inflige 3 o más de daño ganas 1 de veneno', () => {
  const g = start('c1', CRY); discardAll(g); rig(g, [5, 1]); fight(g, 'E20'); assert.equal(g.hero.poison, 1);
  const h = start('c1', CRY); discardAll(h); rig(h, [2, 1]); fight(h, 'E20'); assert.equal(h.hero.poison, 0);
});
test('E19 Cubo de Hielo: no falla con dobles', () => {
  const g = start('c1', CRY); discardAll(g); rig(g, [3, 3]); fight(g, 'E19'); assert.equal(g.hero.hp, 14 - 3);
});
test('PT22 El Huraño: compartir comida (−1 ración, moral +2), nada, o robar (poción, moral −2)', () => {
  const g = start('c1', CRY); plot(g, 'PT22'); choose(g, 'o1'); assert.equal(g.hero.rations, 0); assert.equal(g.hero.morality, 2);
  const h = start('c1', CRY); discardAll(h); plot(h, 'PT22'); choose(h, 'o3'); assert.equal(h.allItems().length, 1); assert.equal(h.hero.morality, -2);
  const k = start('c1', CRY); k.hero.rations = 0; plot(k, 'PT22'); assert.equal(k.s.prompt.options[0].disabled, true);
});
test('PT23 El Pináculo de Marfil: moral positiva → bendiciones; negativa → enemigo con +3 de daño inicial y +6 de salud', () => {
  const g = start('c1', CRY); g.hero.morality = 2; plot(g, 'PT23');
  assert.equal(g.s.prompt.options[1].disabled, true); choose(g, 'o1'); assert.equal(g.hero.blessings.length, 2);
  const h = start('c1', CRY); discardAll(h); h.hero.morality = -1; topEnemy(h, 'E10'); plot(h, 'PT23');
  assert.equal(h.s.prompt.options[0].disabled, true); rig(h, [4, 1]); choose(h, 'o2'); toAttack(h);
  assert.equal(h.s.combat.maxHp, 7 + 6); assert.equal(h.hero.hp, 14 - (3 + 3 + 3));
  const k = start('c1', CRY); plot(k, 'PT23'); assert.ok(k.s.prompt.options.some((o) => o.id === 'skip'));
});
test('PT24 El Viejo Libro: 2 de daño y una habilidad aleatoria', () => {
  const g = start('c1', CRY); const n = g.hero.skills.length; plot(g, 'PT24'); choose(g, 'o1');
  assert.equal(g.hero.hp, 12); assert.equal(g.hero.skills.length, n + 1);
});
test('L33 El Cetro: al robar un enemigo robas dos y eliges', () => {
  const g = start('c1', CRY); discardAll(g); give(g, 'L33'); topEnemy(g, 'E10'); topEnemy(g, 'E12');
  const [a, b] = g.s.z.enemies.slice(0, 2);
  runTask(g, function t() { this._drawAndFight({ source: 'dungeon', ambush: 'normal', hpBonus: 1, initialBonus: 0 }); });
  assert.equal(g.s.prompt.purpose, 'scepter'); assert.deepEqual(g.s.prompt.uids, [a, b]);
  g.act('pickCards', { uids: [b] }); assert.equal(g.def(g.s.combat.uid).key, 'E10'); assert.ok(g.s.z.enemiesDiscard.includes(a));
});
test('L31 Mortero y Maja: +1 de salud con pociones de salud y +2 de daño con pociones de ataque', () => {
  const g = start('c1', CRY); g.hero.hp = 6; give(g, 'L31'); const p = give(g, 'P1'); g.act('use', { uid: p }); assert.equal(g.hero.hp, 11);
  const h = start('c1', CRY); discardAll(h); give(h, 'L31'); const b = give(h, 'P4'); rig(h, [3, 3]); fight(h, 'E10', { hpBonus: 10 });
  rig(h, [3, 4]); h.act('potionAttack', { uid: b }); assert.equal(h.s.combat.hp, 17 - 9);
});
test('L34 Excremento de Troll: no tiene efecto (vale 0 y pesa 1)', () => {
  const g = start('c1', CRY); const u = give(g, 'L34'); const d = g.def(u);
  assert.equal(d.price, 0); assert.equal(d.weight, 1); assert.equal(g.act('use', { uid: u }).ok, false);
});
test('L32 Sello de Zogar: una vez por nivel miras el descarte del mazo de mazmorra', () => {
  const g = start('c1', CRY); const u = give(g, 'L32'); g.s.z.dungeonDiscard.push(...g.s.z.dungeon.splice(0, 3));
  const ev = events(g); g.act('use', { uid: u });
  const peek = ev.find((e) => e.t === 'peekCards'); assert.deepEqual(peek.uids, g.s.z.dungeonDiscard);
  assert.equal(g.act('use', { uid: u }).ok, false);
});
test('T24 Capa de Lana (Brazwitz): una vez por nivel resta 1 a un daño inicial', () => {
  const g = start('c8', CRY); rig(g, [6, 1]); const pr = engage(g, 'E10');
  assert.ok(pr.options.some((o) => o.id === 'cape'));
  g.act('enemyReact', { id: 'cape' }); assert.equal(g.hero.hp, 13 - 7); assert.ok(g.s.lvl.cape);
});
test('T25 Espada Enana: +2 contra goblins, orcos y trolls', () => {
  const g = start('c8', CRY); rig(g, [3, 3]); fight(g, 'E12'); assert.equal(g.previewDamage([3, 3], 2), 8);
  const h = start('c8', CRY); rig(h, [3, 3]); fight(h, 'E10'); assert.equal(h.previewDamage([3, 3], 2), 6);
});
test('S19 Estrategia: tras tirar puedes gastar 1 de energía para relanzar todos los dados', () => {
  const g = start('c8', CRY); rig(g, [3, 3]); fight(g, 'E10', { hpBonus: 20 });
  rig(g, [1, 2]); g.act('attack', { energy: 2 });
  assert.ok(g.s.prompt.options.some((o) => o.id === 'all:S19'));
  rig(g, [6, 6]); g.act('reroll', { id: 'all:S19' });
  assert.deepEqual(g.s.prompt.type === 'postRoll' ? g.s.prompt.dice : [6, 6], [6, 6]);
  assert.equal(g.hero.energy, 11 - 2 - 1);
});

/* ====================================================================================== El Trono Ardiente */
test('Throne: retira Orcos y Troll de las Cavernas; jefe Elemental de Fuego; aventura de nivel 2', () => {
  campaignSetup(THR, { gone: ['E7', 'E12'], plotsGone: ['PT9', 'PT4', 'PT1'], added: { E21: 2, E22: 3 }, boss: 'B8', level: 2, hero: 'C9' });
});
test('B8 Elemental de Fuego: con 8 o más de daño destruye lo que llevas en el Cuerpo', () => {
  const g = start('c1', THR); discardAll(g); const arm = give(g, 'T4');
  rig(g, [6, 1]); fight(g, 'B8', { boss: true, hpBonus: 0, source: 'boss' });
  assert.equal(g.hero.hp, 14 - 8); assert.equal(g.s.eq.CP, null); assert.ok(g.s.z.removed.includes(arm));
});
test('E21 Piel de Lagarto: si te inflige daño pierdes también 1 de energía', () => {
  const g = start('c1', THR); discardAll(g); rig(g, [5, 2]); fight(g, 'E21'); assert.equal(g.hero.energy, 10);
  const h = start('c1', THR); discardAll(h); rig(h, [4, 4]); fight(h, 'E21'); assert.equal(h.hero.energy, 11);
});
test('E22 Vampiro de Fuego: solo su contraataque envenena (+2)', () => {
  const g = start('c1', THR); discardAll(g); rig(g, [5, 2]); fight(g, 'E22', { hpBonus: 10 }); assert.equal(g.hero.poison, 0);
  rig(g, [5, 2]); g.act('attack', { energy: 0 }); assert.equal(g.hero.poison, 2);
});
test('L35 Aguijón de Grasgol: una vez por nivel, antes del daño inicial, una flecha de d6', () => {
  const g = start('c1', THR); discardAll(g); give(g, 'L35'); const pr = engage(g, 'E10');
  assert.equal(pr.type, 'pre'); rig(g, [5]); g.act('preUse', { id: 'sting' });
  assert.equal(g.s.combat.hp, 8 - 5); assert.ok(g.s.lvl.sting);
});
test('L36 Cuerno Maldito: no se puede tirar ni vender', () => {
  const g = start('c1', THR); const u = give(g, 'L36');
  assert.equal(g.act('drop', { uid: u }).ok, false); assert.equal(g.act('unequip', { uid: u }).ok, false);
  g.s.prompt = { type: 'merchant', stock: [] }; g.s.ctx.stock = []; assert.equal(g.act('merchantSell', { uid: u }).ok, false);
});
test('L37 Cazadora de Olum: cada 5 o 6 inflige +3 contra enemigos débiles al fuego', () => {
  const g = start('c1', THR); discardAll(g); give(g, 'L37'); rig(g, [3, 3]); fight(g, 'E5');
  assert.equal(g.previewDamage([5, 6, 1], 3), 12 + 6);
  const h = start('c1', THR); discardAll(h); give(h, 'L37'); rig(h, [3, 3]); fight(h, 'E10');
  assert.equal(h.previewDamage([5, 6, 1], 3), 12);
});
test('L38 Protección de Olum: −1 al daño inicial y a los contraataques; −1 más contra enemigos débiles al hielo', () => {
  const g = start('c1', THR); discardAll(g); give(g, 'L38'); rig(g, [3, 3]); fight(g, 'E10');
  assert.equal(g.armorReduction('initial'), 2); assert.equal(g.armorReduction('counter'), 2);
  const h = start('c1', THR); discardAll(h); give(h, 'L38'); rig(h, [3, 3]); fight(h, 'E5');
  assert.equal(h.armorReduction('counter'), 1);
});
test('PT26 La Vieja Goblin: ayudarla (poción, −2 energía, moral +2) o robarla (poción, 2 de oro, moral −2)', () => {
  const g = start('c1', THR); discardAll(g); plot(g, 'PT26'); choose(g, 'o1');
  assert.equal(g.allItems().length, 1); assert.equal(g.hero.energy, 9); assert.equal(g.hero.morality, 2);
  const h = start('c1', THR); discardAll(h); plot(h, 'PT26'); choose(h, 'o2');
  assert.equal(h.allItems().length, 1); assert.equal(h.hero.gold, 5); assert.equal(h.hero.morality, -2);
});
test('PT27 Columna de Fuego: arroja un enemigo derrotado sin gastar, gana su oro y pierde 1 de energía', () => {
  const g = start('c1', THR); plot(g, 'PT27'); assert.equal(g.s.prompt.options[0].disabled, true);
  const h = start('c1', THR); const e = h.mk('e8'); h.s.z.graveyard.push({ uid: e, spent: false }); plot(h, 'PT27'); choose(h, 'o1');
  assert.equal(h.s.prompt.purpose, 'feedFire'); h.act('pickCards', { uids: [e] });
  assert.equal(h.hero.gold, 4); assert.equal(h.hero.energy, 10); assert.equal(h.s.z.graveyard.length, 0);
});
test('PT25 El Loco: tabla d6 (1-2 enemigo, 3-4 +2 de energía, 5-6 botín)', () => {
  const g = start('c1', THR); g.hero.energy = 5; plot(g, 'PT25'); rig(g, [3]); choose(g, 'o1'); assert.equal(g.hero.energy, 7);
  const h = start('c1', THR); plot(h, 'PT25'); rig(h, [1, 3, 3]); choose(h, 'o1'); assert.ok(h.s.combat);
});
test('T27 Bastón de Peregrino: relanza los 6 y +2 contra no muertos', () => {
  const g = start('c1', THR); discardAll(g); give(g, 'T27'); rig(g, [3, 3]); fight(g, 'E8', { hpBonus: 20 });
  assert.equal(g.previewDamage([2, 3], 2), 7);
  rig(g, [6, 2, 4]); g.act('attack', { energy: 2 }); assert.equal(g.s.combat.hp, 25 - (4 + 2 + 2));
});
test('T26 Petaca (Grimmly): +2 de salud, una vez; se rellena gratis en el Campamento', () => {
  const g = start('c9', THR); const u = g.allItems().find((x) => g.def(x).key === 'T26'); g.hero.hp = 10;
  g.act('use', { uid: u }); assert.equal(g.hero.hp, 12); assert.equal(g.act('use', { uid: u }).ok, false);
  resolveCard(g, 'D7'); assert.equal(g.s.cards[u].empty, false); choose(g, 'search');
  g.act('use', { uid: u }); assert.equal(g.hero.hp, 14);
});
test('S20 Correr (Grimmly): una vez por nivel evitas cualquier carta de mazmorra gastando energía según el dado', () => {
  const g = start('c9', THR); topDungeon(g, 'D5', 'D10'); g.act('draw'); g.act('reveal', { slot: 0 });
  assert.equal(g.s.prompt.flee, true); rig(g, [1]); g.act('flee');
  assert.equal(g.hero.energy, 5); assert.equal(g.hero.poison, 0); assert.equal(g.s.prompt.type, 'turn');
  g.act('draw'); g.act('reveal', { slot: 0 }); assert.equal(g.s.prompt.flee, false);
  const h = start('c9', THR); topDungeon(h, 'D6', 'D10'); h.act('draw'); h.act('reveal', { slot: 0 }); h.act('resolve');
  rig(h, [5]); h.act('avoidCard', { id: 'correr' }); assert.equal(h.s.combat, null); assert.equal(h.hero.energy, 10);
  const k = start('c9', THR); topDungeon(k, 'D10', 'D5'); k.act('draw'); k.act('reveal', { slot: 0 }); k.act('decline');
  assert.equal(k.s.prompt.type, 'avoidCard'); assert.equal(k.s.prompt.resolve, true);
  rig(k, [3]); k.act('avoidCard', { id: 'correr' }); assert.equal(k.hero.energy, 9); assert.equal(k.hero.poison, 0);
});

/* ====================================================================================== El Refugio de Malicia */
test('Malicia: retira Skinklings y Goblins; Mimético No Muerto en el botín; jefe Malicia; aventura de nivel 3', () => {
  const g = campaignSetup(MAL, { gone: ['E3', 'E1'], plotsGone: ['PT6', 'PT4', 'PT3'], added: { E23: 3, E24: 2 }, boss: 'B9', level: 3, hero: 'C10' });
  assert.ok(codes(g, 'loot').includes('L39'));
});
test('B9 Malicia: su daño se modifica con tu posición en el control de moral', () => {
  const g = start('c1', MAL); discardAll(g); g.hero.morality = 3; rig(g, [6, 4]); fight(g, 'B9', { boss: true, hpBonus: 0, source: 'boss' });
  assert.equal(g.hero.hp, 14 - (2 + 4 + 3));
  const h = start('c1', MAL); discardAll(h); h.hero.morality = -3; rig(h, [6, 4]); fight(h, 'B9', { boss: true, hpBonus: 0, source: 'boss' });
  assert.equal(h.hero.hp, 14 - (2 + 4 - 3));
});
test('E23 Guerrero Maldito: se evita gastando una bendición; al derrotarlo ganas una', () => {
  const g = start('c1', MAL); discardAll(g); g.gain('blessing', 1); const pr = engage(g, 'E23');
  assert.equal(pr.type, 'avoidEnemy'); g.act('avoidEnemy', { id: 'pay_blessing' });
  assert.equal(g.hero.blessings.length, 0); assert.equal(g.s.combat, null);
  const h = start('c1', MAL); discardAll(h); rig(h, [3, 3]); fight(h, 'E23'); kill(h); assert.equal(h.hero.blessings.length, 1);
});
test('E24 Sacerdote Maldito: daño inicial extra igual a tus bendiciones (solo el inicial)', () => {
  const g = start('c1', MAL); discardAll(g); g.gain('blessing', 3); rig(g, [4, 2]); fight(g, 'E24', { hpBonus: 10 });
  assert.equal(g.hero.hp, 14 - (2 + 3)); rig(g, [4, 2]); g.act('attack', { energy: 0 }); assert.equal(g.hero.hp, 14 - 5 - 2);
});
test('L39 Mimético No Muerto: sale del mazo de botín y se evita con una bendición', () => {
  const g = start('c1', MAL); g.gain('blessing', 1); topLoot(g, 'L39'); runTask(g, function t() { this.gainLoot(1); });
  assert.equal(g.s.prompt.type, 'avoidEnemy'); g.act('avoidEnemy', { id: 'pay_blessing' }); assert.ok(codes(g, 'lootDiscard').includes('L39'));
});
test('L40 Granada de Mano Sagrada: derrota a un enemigo de 6 o menos de salud base', () => {
  const g = start('c1', MAL); discardAll(g); give(g, 'L40'); const pr = engage(g, 'E23');
  assert.ok(pr.options.some((o) => o.id === 'granada')); g.act('preUse', { id: 'granada' }); assert.equal(g.s.z.graveyard.length, 1);
  const h = start('c1', MAL); discardAll(h); give(h, 'L40'); rig(h, [3, 3]);
  assert.equal(engage(h, 'E24').type === 'pre', false); // Sacerdote: 7 de salud base
});
test('L41 Botas de la Presteza: una vez por nivel atacas primero en una escaramuza', () => {
  const g = start('c1', MAL); discardAll(g); give(g, 'L41'); topDungeon(g, 'D6', 'D10'); topEnemy(g, 'E10');
  g.act('draw'); g.act('reveal', { slot: 0 }); g.act('resolve');
  assert.ok(g.s.prompt.options.some((o) => o.id === 'boots')); g.act('avoidCard', { id: 'boots' }); toAttack(g);
  assert.equal(g.s.combat.ambush, 'player'); assert.equal(g.hero.hp, 14); assert.ok(g.s.lvl.boots);
});
test('L42 Látigo: si los dados coinciden vuelves a atacar sin contraataque', () => {
  const g = start('c1', MAL); discardAll(g); give(g, 'L42'); rig(g, [3, 3]); fight(g, 'E10', { hpBonus: 20 });
  rig(g, [4, 4]); g.act('attack', { energy: 2 }); assert.equal(g.s.prompt.type, 'attack'); assert.equal(g.hero.hp, 14); assert.equal(g.s.combat.round, 2);
  rig(g, [4, 5, 6, 1]); g.act('attack', { energy: 2 }); assert.equal(g.hero.hp, 14 - 8);
});
test('PT28 La Pendiente Resbaladiza: se escala hasta sacar un 6 (1: nivel+2 de daño, 2-3: −1 energía, 4-5: oro, 6: oro=nivel, botín y poción)', () => {
  const g = start('c1', MAL); discardAll(g); g.s.z.loot = g.s.z.loot.filter((u) => g.def(u).kind === 'item'); plot(g, 'PT28');
  rig(g, [4]); choose(g, 'o1'); assert.equal(g.hero.gold, 4); assert.deepEqual(g.s.prompt.options.map((o) => o.id), ['climb', 'stop']);
  rig(g, [2]); choose(g, 'climb'); assert.equal(g.hero.energy, 10);
  rig(g, [6]); choose(g, 'climb'); assert.equal(g.hero.gold, 5); assert.equal(g.allItems().length, 2);
  const h = start('c1', MAL); plot(h, 'PT28'); rig(h, [1]); choose(h, 'o1'); assert.equal(h.hero.hp, 14 - 3);
});
test('PT29 La Estatua con Alas: tabla según la moral', () => {
  const mk = (m) => { const g = start('c1', MAL); g.hero.morality = m; g.gain('blessing', 2); plot(g, 'PT29'); choose(g, 'o1'); return g; };
  let g = mk(-5); assert.equal(g.hero.blessings.length, 0); assert.equal(g.hero.hp, 13);
  g = mk(-2); assert.equal(g.s.prompt.purpose, 'discardItem'); g.act('pickCards', { uids: [g.allItems()[0]] }); assert.equal(g.allItems().length, 1); assert.equal(g.hero.energy, 10);
  g = mk(0); assert.equal(g.hero.blessings.length, 2);
  g = mk(3); assert.equal(g.hero.blessings.length, 3); assert.equal(g.hero.energy, 12);
  g = mk(5); assert.equal(g.s.prompt.purpose, 'deckPick'); const pick = g.s.prompt.uids[0]; g.act('pickCards', { uids: [pick] }); assert.ok(g.allItems().includes(pick));
});
test('PT30 El Hombre Enjaulado: liberarlo (−2 energía, moral +2) o matarlo (poción, moral −2)', () => {
  const g = start('c1', MAL); plot(g, 'PT30'); choose(g, 'o1'); assert.equal(g.hero.energy, 9); assert.equal(g.hero.morality, 2);
  const h = start('c1', MAL); discardAll(h); plot(h, 'PT30'); choose(h, 'o2'); assert.equal(h.allItems().length, 1); assert.equal(h.hero.morality, -2);
});
test('T28 Bastón del Cuervo (Eldra): puedes perder salud en vez de ganar veneno', () => {
  const g = start('c10', MAL); g.hero.hp = 9; runTask(g, function t() { this.addPoison(2, 'prueba'); });
  assert.equal(g.s.prompt.type, 'choice'); choose(g, 'hp'); assert.equal(g.hero.hp, 7); assert.equal(g.hero.poison, 0);
  const h = start('c10', MAL); runTask(h, function t() { this.addPoison(2, 'prueba'); }); choose(h, 'poison'); assert.equal(h.hero.poison, 2);
});
test('T29 Pan de Bruja: descarta tus bendiciones y gana esa energía', () => {
  const g = start('c1', MAL); g.gain('blessing', 3); g.hero.energy = 4; const u = give(g, 'T29'); g.act('use', { uid: u });
  assert.equal(g.hero.energy, 7); assert.equal(g.hero.blessings.length, 0);
});
test('S21 Drenaje Vital (Eldra): 2 de energía para infligir d6 y ganar esa salud; no puedes ganar bendiciones', () => {
  const g = start('c10', MAL); g.hero.hp = 4; const pr = engage(g, 'E10');
  assert.ok(pr.options.some((o) => o.id === 'drain')); rig(g, [4, 3, 3]); g.act('preUse', { id: 'drain' });
  assert.equal(g.hero.energy, 12); assert.equal(g.s.combat.hp, 8 - 4); assert.equal(g.hero.hp, 8);
  assert.equal(g.gain('blessing', 2), 0); assert.equal(g.hero.blessings.length, 0);
});

/* ====================================================================================== El Torreón de Zogar */
test('Spire: retira Skinklings, Goblins, Lobos y Serpientes Aladas; añade Bestias y Trabas con aflicciones; jefe Zogar; aventura de nivel 4', () => {
  const g = campaignSetup(SPI, { gone: ['E3', 'E1', 'E5', 'E4'], plotsGone: ['PT8', 'PT1', 'PT6'], added: { E31: 2, E32: 3, E33: 1, E25: 1 }, boss: 'B10', level: 4 });
  assert.equal(g.s.z.afflictions.length, 8); assert.ok(g.cat.packIds.includes('beasts'));
  assert.ok(codes(g, 'plots').includes('PT31') && codes(g, 'plots').includes('spire:PT31'));
});
test('B10 Zogar: inmune a pociones de fuego, hielo y sagradas y a la parte de fuego de las armas; sus dobles te quitan 2 de energía', () => {
  const g = start('c1', SPI); discardAll(g); for (const k of ['P3', 'P4', 'P5']) give(g, k); give(g, 'L7');
  rig(g, [3, 3]); const pr = fight(g, 'B10', { boss: true, hpBonus: 0, source: 'boss' });
  assert.equal(g.hero.hp, 14); assert.equal(g.hero.energy, 9); assert.deepEqual(pr.potions, []);
  assert.equal(g.previewDamage([6, 6], 2), 12); // Espada Ardiente: sus 6 no valen 7 y no hay debilidad
  assert.equal(g.s.combat.weakness, '*');
});
test('E31 Umruss (veneno al impactar), E32 Poseído (−1 bendición al impactar), E33 Señor de Huesos (bendiciones = moral)', () => {
  const g = start('c1', SPI); discardAll(g); rig(g, [5, 2]); fight(g, 'E31'); assert.equal(g.hero.poison, 1);
  const h = start('c1', SPI); discardAll(h); h.gain('blessing', 2); rig(h, [5, 2]); fight(h, 'E32'); assert.equal(h.hero.blessings.length, 1);
  const k = start('c1', SPI); discardAll(k); k.hero.morality = 3; rig(k, [3, 3]); fight(k, 'E33'); kill(k); assert.equal(k.hero.blessings.length, 3);
});
test('L43 Espada del Vidente: al derrotar a un enemigo con ella revelas el siguiente enemigo', () => {
  const g = start('c1', SPI); discardAll(g); give(g, 'L43'); rig(g, [3, 3]); fight(g, 'E10'); const ev = events(g);
  kill(g); const peek = ev.find((e) => e.t === 'peek'); assert.ok(peek); assert.equal(peek.uid, g.s.z.enemies[0]);
});
test('L44 Escudo de Drenaje: una vez por nivel bloquea todo el daño inicial y gana 3 de salud', () => {
  const g = start('c1', SPI); discardAll(g); give(g, 'L44'); g.hero.hp = 10; const pr = engage(g, 'E10');
  assert.ok(pr.options.some((o) => o.id === 'drainShield')); g.act('preUse', { id: 'drainShield' });
  if (g.s.prompt.type === 'pre') g.act('proceed');
  assert.equal(g.hero.hp, 13); assert.equal(g.s.prompt.type, 'attack'); assert.ok(g.s.lvl.drainShield);
});
test('L45 Capa de Cultista: una vez por nivel evita a un enemigo de 5 o menos de salud base', () => {
  const g = start('c1', SPI); discardAll(g); give(g, 'L45');
  const pr = engage(g, 'E2'); assert.ok(pr.options.some((o) => o.id === 'cultist')); g.act('avoidEnemy', { id: 'cultist' });
  assert.equal(g.s.combat, null); assert.notEqual(engage(g, 'E2').type, 'avoidEnemy');
});
test('L46 Elixir de Helgen: +3 de salud, +3 de energía y −2 de veneno', () => {
  const g = start('c1', SPI); g.hero.hp = 5; g.hero.energy = 5; g.hero.poison = 3; const u = give(g, 'L46'); g.act('use', { uid: u });
  assert.deepEqual([g.hero.hp, g.hero.energy, g.hero.poison], [8, 8, 1]);
});
test('PT31 El Maligno (spire): vende bendiciones por oro, raciones o una poción', () => {
  const g = start('c1', SPI); plot(g, 'spire:PT31'); assert.equal(g.s.prompt.options[0].disabled, true);
  const h = start('c1', SPI); discardAll(h); h.gain('blessing', 2); plot(h, 'spire:PT31'); choose(h, 'o1');
  choose(h, 'gold'); assert.equal(h.hero.gold, 5); assert.equal(h.hero.blessings.length, 1);
  const k = start('c1', SPI); discardAll(k); k.gain('blessing', 2); plot(k, 'spire:PT31'); choose(k, 'o1'); choose(k, 'potion');
  assert.equal(k.hero.blessings.length, 0); assert.equal(k.allItems().length, 1);
});
test('PT32 La Choza (spire): emboscada con iniciativa; tras la victoria +1 botín y 3 de oro', () => {
  const g = start('c1', SPI); discardAll(g); topEnemy(g, 'E8'); g.s.z.loot = g.s.z.loot.filter((u) => g.def(u).kind === 'item');
  plot(g, 'spire:PT32'); choose(g, 'o1'); toAttack(g);
  assert.equal(g.s.combat.ambush, 'player'); assert.equal(g.s.combat.maxHp, 5 + 1); assert.equal(g.hero.hp, 14);
  kill(g); assert.equal(g.hero.gold, 3 + 1 + 1 + 3); assert.equal(g.allItems().length, 1);
  const h = start('c1', SPI); plot(h, 'spire:PT32'); choose(h, 'o2'); assert.equal(h.hero.energy, 10);
});
test('PT33 El Ciervo Atrapado (spire): liberarlo (moral +2, bendición) o festín (+3 salud, +2 energía, moral −2)', () => {
  const g = start('c1', SPI); plot(g, 'spire:PT33'); choose(g, 'o1'); assert.equal(g.hero.morality, 2); assert.equal(g.hero.blessings.length, 1);
  const h = start('c1', SPI); h.hero.hp = 5; h.hero.energy = 5; plot(h, 'spire:PT33'); choose(h, 'o2');
  assert.deepEqual([h.hero.hp, h.hero.energy, h.hero.morality], [8, 7, -2]);
});
test('PT34 El Viejo Puente: aligerar la carga hasta 8 o cruzar (−2 salud, −1 energía)', () => {
  const g = start('c1', SPI); discardAll(g); for (const k of ['L6', 'L12', 'L13', 'L10', 'L2']) give(g, k); assert.ok(g.weight() > 8);
  plot(g, 'PT34'); choose(g, 'o1'); assert.equal(g.s.prompt.purpose, 'lighten');
  const heavy = g.allItems().find((u) => g.def(u).key === 'L6'); g.act('pickCards', { uids: [heavy] });
  assert.ok(g.weight() <= 8); assert.notEqual(g.s.prompt.type, 'pickCards');
  const h = start('c1', SPI); plot(h, 'PT34'); choose(h, 'o2'); assert.equal(h.hero.hp, 12); assert.equal(h.hero.energy, 10);
});
test('PT35 La Pila de Huesos: buscar (poción, 2 de oro, −1 energía, moral −1) o ignorarla (moral +2)', () => {
  const g = start('c1', SPI); discardAll(g); plot(g, 'PT35'); choose(g, 'o1');
  assert.deepEqual([g.allItems().length, g.hero.gold, g.hero.energy, g.hero.morality], [1, 5, 10, -1]);
  const h = start('c1', SPI); plot(h, 'PT35'); choose(h, 'o2'); assert.equal(h.hero.morality, 2);
});
