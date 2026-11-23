/**
 * Módulos nuevos: Terreno y Reliquias, Posada del Troll Solitario, The Howling Abyss, Iron Chest y Gnome Pack #1,
 * más el contrato de datos (gen-data, listPacks, buildCatalog). Un escenario por carta con efecto mecánico.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, buildCatalog, listPacks, buildCustomHeroPreview } from '../iron_helm_game/js/engine/index.js';
import { GENERATED } from '../iron_helm_game/js/data/packs/index.js';
import * as BASE from '../iron_helm_game/js/data/base.js';
import { rig, start, topDungeon, topEnemy, topPlot, give, discardAll, toAttack, fight, engage, plot, choose, treasure, runTask,
  resolveCard, codes, events, setEnv, hire, merc, topArtifact } from './helpers/scenario.js';

const RLM = { modules: ['realms'] }; const TRL = { modules: ['troll'] }; const HOW = { modules: ['howling'] };
const ICH = { modules: ['iron_chest'] }; const GNM = { modules: ['gnome'] };
function kill(g) { g.s.combat.hp = 1; g.act('attack', { energy: 0 }); treasure(g, 'gold'); }
const itemsOnly = (g) => { g.s.z.loot = g.s.z.loot.filter((u) => g.def(u).kind === 'item'); };
const has = (g, key) => g.allItems().some((u) => g.def(u).key === key);
function endOfLevel(g) { g.q = []; g.s.prompt = null; g.s.turn = 8; g.s.ctx = { turnActive: true }; g.s.z.dungeon = []; g.run(); }

/* ====================================================================================== Terreno y Reliquias: entornos */
test('Entornos: al empezar cada nivel se roba una carta de entorno (evento environment) y la anterior va al descarte', () => {
  const g = Game.create({ heroId: 'c1', config: RLM, seed: 3 }); const ev = events(g); g.act('begin');
  assert.ok(g.s.env); assert.equal(ev.find((e) => e.t === 'environment').uid, g.s.env);
  assert.equal(g.s.z.environments.length, 8);
  const first = g.s.env; runTask(g, function t() { this.startLevel(); });
  assert.notEqual(g.s.env, first); assert.ok(g.s.z.environmentsDiscard.includes(first));
  g.s.z.environmentsDiscard.push(...g.s.z.environments.splice(0)); runTask(g, function t() { this.startLevel(); });
  assert.ok(g.s.env, 'si se agota el mazo de entornos se baraja el descarte');
});
test('EN1 La Ciénaga: enemigos +1 de daño; +1 ración al buscar en el Campamento y en las setas', () => {
  const g = start('c1', RLM); setEnv(g, 'EN1'); discardAll(g); rig(g, [3, 3]); fight(g, 'E10'); assert.equal(g.s.combat.damage, 4);
  const h = start('c1', RLM); setEnv(h, 'EN1'); const r = h.hero.rations; resolveCard(h, 'D7'); choose(h, 'search'); assert.equal(h.hero.rations, r + 2);
  resolveCard(h, 'D4', 1); assert.equal(h.hero.rations, r + 4);
});
test('EN2 El Yermo: hielo +2 de daño; sin buscar comida ni setas; +2 bendiciones en el Altar; +1 oro por enemigo de hielo', () => {
  const g = start('c1', RLM); setEnv(g, 'EN2'); discardAll(g); itemsOnly(g); rig(g, [3, 3]); fight(g, 'E10'); assert.equal(g.s.combat.damage, 5);
  const gold = g.hero.gold; kill(g); assert.equal(g.hero.gold, gold + 1);
  const h = start('c1', RLM); setEnv(h, 'EN2'); const r = h.hero.rations; resolveCard(h, 'D7');
  assert.equal(h.s.prompt.options.find((o) => o.id === 'search').disabled, true); choose(h, 'cook');
  resolveCard(h, 'D4', 2); assert.equal(h.hero.rations, r - 1);
  resolveCard(h, 'D9'); choose(h, 'bless'); assert.equal(h.hero.blessings.length, 3);
});
test('EN3 La Sombra: la emboscada como primera carta se resuelve como segunda; +2 de oro en el Tesoro; +1 poción por enemigo', () => {
  const g = start('c1', RLM); setEnv(g, 'EN3'); discardAll(g); topDungeon(g, 'D1', 'D10'); topEnemy(g, 'E10');
  g.act('draw'); g.act('reveal', { slot: 0 }); assert.ok(g.s.prompt.forced); assert.equal(g.act('decline').ok, false);
  rig(g, [5, 2]); g.act('resolve'); toAttack(g);
  assert.equal(g.s.combat.maxHp, 7 + 1 + 4); assert.equal(g.hero.hp, 14 - (3 + 3 + 1));
  const n = g.allItems().length; itemsOnly(g); kill(g); assert.equal(g.allItems().length, n + 3); // botín + poción del tesoro 2 + poción del entorno
  const h = start('c1', RLM); setEnv(h, 'EN3'); const gold = h.hero.gold; resolveCard(h, 'D2', 1); assert.equal(h.hero.gold, gold + 3);
});
test('EN4 El Glaciar: fuego +2 de daño; sin forraje; +1 poción en el Tesoro; +1 oro por enemigo de fuego', () => {
  const g = start('c1', RLM); setEnv(g, 'EN4'); discardAll(g); rig(g, [3, 3]); fight(g, 'E8'); assert.equal(g.s.combat.damage, 3);
  const h = start('c1', RLM); setEnv(h, 'EN4'); discardAll(h); rig(h, [3, 3]); fight(h, 'E12'); assert.equal(h.s.combat.damage, 6);
  const gold = h.hero.gold; itemsOnly(h); kill(h); assert.equal(h.hero.gold, gold + 1 + 1);
  const k = start('c1', RLM); setEnv(k, 'EN4'); discardAll(k); resolveCard(k, 'D2', 1); assert.equal(k.allItems().length, 1);
});
test('EN5 Las Catacumbas: no muertos +2; sin Altar; robas 2 tramas y eliges 1; +1 oro por no muerto', () => {
  const g = start('c1', RLM); setEnv(g, 'EN5'); discardAll(g); rig(g, [3, 3]); fight(g, 'E8'); assert.equal(g.s.combat.damage, 5);
  const gold = g.hero.gold; kill(g); assert.equal(g.hero.gold, gold + 1 + 1 + 1);
  const h = start('c1', RLM); setEnv(h, 'EN5'); assert.equal(resolveCard(h, 'D9').type, 'turn');
  const pr = runTask(h, function t() { this.drawPlot({ clearing: true }); }); assert.equal(pr.purpose, 'plot'); assert.equal(pr.uids.length, 2);
});
test('EN6 Túnel Abandonado: la trampa de flechas hace 2 de daño; el Mercader es una Emboscada; +1 oro en Tesoro, Altar y por enemigo', () => {
  const g = start('c1', RLM); setEnv(g, 'EN6'); resolveCard(g, 'D5', 1); assert.equal(g.hero.hp, 12);
  const h = start('c1', RLM); setEnv(h, 'EN6'); discardAll(h); topEnemy(h, 'E10'); resolveCard(h, 'D8', 1); toAttack(h);
  assert.ok(h.s.combat); assert.equal(h.s.combat.ambush, 'player');
  const gold = h.hero.gold; itemsOnly(h); kill(h); assert.equal(h.hero.gold, gold + 1);
  const k = start('c1', RLM); setEnv(k, 'EN6'); resolveCard(k, 'D2', 1); assert.equal(k.hero.gold, 3 + 1 + 1);
  resolveCard(k, 'D9'); choose(k, 'bless'); assert.equal(k.hero.gold, 6);
});
test('EN7 El Santuario: bendición inmediata; +1 poción en el Tesoro; +3 de salud en el Altar; +1 bendición por enemigo', () => {
  const g = start('c1', RLM); g.s.z.environments.unshift(g.mk('en7')); runTask(g, function t() { this._drawEnvironment(); });
  assert.equal(g.hero.blessings.length, 1);
  g.hero.hp = 5; resolveCard(g, 'D9'); choose(g, 'cure'); assert.equal(g.hero.hp, 8);
  discardAll(g); resolveCard(g, 'D2', 1); assert.equal(g.allItems().length, 1);
  rig(g, [3, 3]); fight(g, 'E8'); kill(g); assert.equal(g.hero.blessings.length, 2);
});
test('EN8 Las Miradas: 1 ojo inmediato y otro al resolver el Campamento; +1 bendición en el Tesoro', () => {
  const g = start('c1', RLM); g.s.z.environments.unshift(g.mk('en8')); runTask(g, function t() { this._drawEnvironment(); });
  assert.equal(g.s.eyes, 1); resolveCard(g, 'D7'); assert.equal(g.s.eyes, 2); choose(g, 'search');
  resolveCard(g, 'D2', 1); assert.equal(g.hero.blessings.length, 1);
});
test('EN9 El Altiplano: el Laberinto exige 1 ración más (3 de daño por cada una que falte); Altar cura según la moral; +2 contra el jefe', () => {
  const g = start('c1', RLM); setEnv(g, 'EN9'); g.hero.rations = 1; resolveCard(g, 'D3', 1); assert.equal(g.hero.rations, 0); assert.equal(g.hero.hp, 11);
  const h = start('c1', RLM); setEnv(h, 'EN9'); h.hero.morality = 3; h.hero.hp = 5; resolveCard(h, 'D9'); choose(h, 'bless'); assert.equal(h.hero.hp, 8);
  const k = start('c1', RLM); setEnv(k, 'EN9'); discardAll(k); rig(k, [3, 3]); fight(k, 'B1', { boss: true, hpBonus: 0, source: 'boss' });
  assert.equal(k.previewDamage([3, 4], 2), 9);
});

/* ====================================================================================== Terreno y Reliquias: artefactos */
test('Artefactos: al robar botín puedes pagar bendiciones (1, 2, 3… acumulativo) para robar un artefacto aleatorio', () => {
  const g = start('c1', RLM); assert.equal(g.canBuyArtifact(), false); g.gain('blessing', 3); assert.equal(g.nextArtifactCost(), 1);
  const ev = events(g); runTask(g, function t() { this.gainLoot(1); });
  assert.equal(g.s.prompt.artifact, true); choose(g, 'artifact');
  assert.equal(g.hero.blessings.length, 2); assert.equal(g.s.artifactsBought, 1); assert.equal(g.nextArtifactCost(), 2);
  const paid = ev.find((e) => e.t === 'artifactPaid'); assert.equal(g.def(paid.uid).deck, 'artifact'); assert.equal(paid.cost, 1);
  runTask(g, function t() { this.gainLoot(1); }); choose(g, 'artifact'); assert.equal(g.hero.blessings.length, 0);
  assert.equal(g.canBuyArtifact(), false);
});
test('AT9 Cápsula Corazón (Fanny Pack) pasa al mazo de artefactos cuando se juega con Terreno y Reliquias', () => {
  const c = buildCatalog({ modules: ['realms', 'fanny_pack'] });
  assert.ok(c.pools.artifacts.some((d) => d.key === 'AT9')); assert.equal(c.pools.loot.some((d) => d.key === 'AT9'), false);
  assert.ok(buildCatalog({ modules: ['fanny_pack'] }).pools.loot.some((d) => d.key === 'AT9'));
});
test('AT1 Cinturón de Poder de Ogro: una vez por nivel +2 de daño por cada energía de un ataque', () => {
  const g = start('c1', RLM); discardAll(g); give(g, 'T5'); give(g, 'AT1'); rig(g, [3, 3]); fight(g, 'E10', { hpBonus: 20 }); const hp = g.s.combat.hp;
  rig(g, [2, 3, 3, 3]); g.act('attack', { energy: 2 }); assert.ok(g.s.prompt.options.some((o) => o.id === 'bonus:AT1'));
  g.act('reroll', { id: 'bonus:AT1' }); if (g.s.prompt.type === 'postRoll') g.act('accept');
  assert.equal(g.s.combat.hp, hp - (5 + 4)); assert.ok(g.s.lvl.ogre);
});
test('AT2 Seta de Colmena Dorada: cocinarla en el Campamento recupera toda la salud', () => {
  const g = start('c1', RLM); const u = give(g, 'AT2'); g.hero.hp = 3; resolveCard(g, 'D7'); choose(g, 'goldenShroom');
  assert.equal(g.hero.hp, 14); assert.ok(g.s.z.artifactsDiscard.includes(u));
});
test('AT3 Armadura Divina: resta tu moral +1 al daño inicial y a los contraataques', () => {
  const g = start('c1', RLM); discardAll(g); give(g, 'AT3'); g.hero.morality = 2; rig(g, [3, 3]); fight(g, 'E10');
  assert.equal(g.armorReduction('initial'), 3); assert.equal(g.armorReduction('counter'), 3);
});
test('AT4 Venganza: +1 de salud por cada 6 de un ataque', () => {
  const g = start('c1', RLM); discardAll(g); give(g, 'AT4'); g.hero.hp = 6; rig(g, [3, 3]); fight(g, 'E10', { hpBonus: 30 });
  rig(g, [6, 6, 2, 3, 3]); g.act('attack', { energy: 3 }); if (g.s.prompt.type === 'postRoll') g.act('accept');
  assert.equal(g.hero.hp, 8);
});
test('AT5 Estrella de Brahma: cada vez que el enemigo saca dobles le infliges 5 de daño', () => {
  const g = start('c1', RLM); discardAll(g); give(g, 'AT5'); rig(g, [4, 4]); fight(g, 'E10'); assert.equal(g.s.combat.hp, 8 - 5);
});
test('AT6 Desangradora: cada 6 suma el nivel de la mazmorra', () => {
  const g = start('c1', RLM); discardAll(g); give(g, 'AT6'); g.s.level = 3; rig(g, [3, 3]); fight(g, 'E10'); assert.equal(g.previewDamage([6, 2], 2), 6 + 3 + 2);
});
test('AT7 Portador del Destino: atacar gastando salud en vez de energía (+1 de salud)', () => {
  const g = start('c1', RLM); discardAll(g); give(g, 'T5'); give(g, 'AT7'); rig(g, [3, 3]); const pr = fight(g, 'E10', { hpBonus: 20 });
  assert.ok(pr.payHp.some((o) => o.id === 'AT7')); const hp0 = g.s.combat.hp;
  rig(g, [3, 4, 3, 3]); g.act('attack', { energy: 2, payHp: 'AT7' });
  assert.equal(g.hero.energy, 11); assert.equal(g.hero.hp, 14 - 3); assert.equal(g.s.combat.hp, hp0 - 7);
});
test('AT8 Boñiga de Dragón: al robarla encuentras 1d6 de oro y se descarta', () => {
  const g = start('c1', RLM); g.gain('blessing', 1); topArtifact(g, 'AT8'); runTask(g, function t() { this.gainLoot(1); });
  rig(g, [5]); choose(g, 'artifact'); assert.equal(g.hero.gold, 8); assert.ok(codes(g, 'artifactsDiscard').includes('AT8'));
});

/* ====================================================================================== Posada del Troll Solitario */
test('Posada: en la preparación se contratan hasta 3 esbirros pagando su coste; moral inicial = dado', () => {
  const g = Game.create({ heroId: 'c1', config: TRL, seed: 1 }); const pr = g.s.prompt;
  assert.equal(pr.type, 'setup'); assert.equal(pr.inn.candidates.length, 8); assert.equal(pr.inn.max, 3);
  const eydis = pr.inn.candidates.find((u) => g.def(u).key === 'HM4'); const ev = events(g);
  assert.equal(g.act('hire', { uid: eydis }).ok, true); assert.equal(g.hero.gold, 1);
  assert.deepEqual(g.s.mercs, [{ uid: eydis, morale: 1, max: 1 }]); assert.equal(ev.find((e) => e.t === 'mercenary').kind, 'hire');
  assert.deepEqual(g.s.prompt.inn.hired, [eydis]);
  const borko = g.s.prompt.inn.candidates.find((u) => g.def(u).key === 'HM1'); assert.equal(g.act('hire', { uid: borko }).ok, false); // sin oro
  g.hero.gold = 20; for (const k of ['HM1', 'HM5']) g.act('hire', { uid: g.s.prompt.inn.candidates.find((u) => g.def(u).key === k) });
  assert.equal(g.s.mercs.length, 3); assert.equal(g.s.prompt.inn.candidates.length, 8);
  const free = g.s.prompt.inn.candidates.find((u) => !g.s.prompt.inn.hired.includes(u));
  assert.equal(g.act('hire', { uid: free }).ok, false); assert.equal(g.act('hire', { uid: eydis }).ok, false);
  g.act('begin'); assert.equal(g.act('hire', { uid: g.s.z.mercenaries[0] }).ok, false);
});
test('Esbirros: la moral perdida se restaura pagando 1 de oro por punto (entre turnos); con moral 0 te abandonan', () => {
  const g = start('c1', TRL); const u = hire(g, 'HM6'); const m = merc(g, 'HM6'); m.morale = 3;
  assert.equal(g.act('payMorale', { uid: u }).ok, true); assert.equal(m.morale, 4); assert.equal(g.hero.gold, 2);
  m.morale = 5; assert.equal(g.act('payMorale', { uid: u }).ok, false);
  const ev = events(g); g.addEyes(5); assert.equal(g.s.mercs.length, 0); assert.ok(g.s.z.removed.includes(u));
  assert.equal(ev.filter((e) => e.t === 'mercenary').pop().kind, 'leave');
});
test('HM1 Borko: da la vuelta a un dado (1/nivel); busca en el Campamento (+1 ración); hay que alimentarlo al final del nivel', () => {
  const g = start('c1', TRL); hire(g, 'HM1'); discardAll(g); give(g, 'T5'); rig(g, [3, 3]); fight(g, 'E10', { hpBonus: 20 });
  rig(g, [1, 2]); g.act('attack', { energy: 2 }); g.act('reroll', { id: 'flip:HM1', die: 0 });
  assert.deepEqual(g.s.prompt.type === 'postRoll' ? g.s.prompt.dice : [6, 2], [6, 2]); assert.ok(g.s.lvl.flipHM1);
  const h = start('c1', TRL); hire(h, 'HM1'); const r = h.hero.rations; resolveCard(h, 'D7'); assert.equal(h.hero.rations, r + 1); choose(h, 'search');
  const k = start('c1', TRL); hire(k, 'HM1'); topPlot(k, 'PT4'); topPlot(k, 'PT4'); endOfLevel(k); assert.equal(merc(k, 'HM1').morale, 1);
  const j = start('c1', TRL); hire(j, 'HM1'); j.hero.rations = 2; topPlot(j, 'PT4'); topPlot(j, 'PT4'); endOfLevel(j);
  assert.equal(merc(j, 'HM1').morale, 2); assert.equal(j.hero.rations, 0);
});
test('HM2 Matilda: +1 a las pociones de ataque y de salud; cocina (+1 energía y salud); pierde moral con golpes de 3+; no se le paga', () => {
  const g = start('c1', TRL); const u = hire(g, 'HM2'); discardAll(g); const b = give(g, 'P4'); rig(g, [3, 3]); fight(g, 'E10', { hpBonus: 10 });
  rig(g, [3, 4, 3, 3]); g.act('potionAttack', { uid: b }); assert.equal(g.s.combat.hp, 17 - 8);
  const h = start('c1', TRL); hire(h, 'HM2'); h.hero.hp = 6; const p = give(h, 'P1'); h.act('use', { uid: p }); assert.equal(h.hero.hp, 11);
  h.hero.energy = 5; resolveCard(h, 'D7'); assert.equal(h.hero.energy, 6); assert.equal(h.hero.hp, 12); choose(h, 'search');
  const k = start('c1', TRL); const mu = hire(k, 'HM2'); discardAll(k); rig(k, [6, 1]); fight(k, 'E10'); assert.equal(merc(k, 'HM2').morale, 3);
  assert.equal(k.act('attack', { energy: 0 }).ok, true); void u; void mu;
  const j = start('c1', TRL); const ju = hire(j, 'HM2'); merc(j, 'HM2').morale = 2; assert.equal(j.act('payMorale', { uid: ju }).ok, false);
});
test('HM3 Yak: +4 de carga; +1 de energía si descansas en el Campamento; pierde moral ante no muertos', () => {
  const g = start('c1', TRL); const w = g.maxWeight(); hire(g, 'HM3'); assert.equal(g.maxWeight(), w + 4);
  g.hero.energy = 5; resolveCard(g, 'D7'); choose(g, 'rest'); assert.equal(g.hero.energy, 6);
  rig(g, [3, 3]); fight(g, 'E8'); assert.equal(merc(g, 'HM3').morale, 2);
});
test('HM4 Eydis: +1 al ataque y −1 a los ataques enemigos; +1 ración en el Campamento; al final del nivel cobra 1 de oro o se va', () => {
  const g = start('c1', TRL); hire(g, 'HM4'); discardAll(g); give(g, 'T5'); rig(g, [5, 2]); fight(g, 'E10');
  assert.equal(g.hero.hp, 14 - (3 + 3 - 1)); assert.equal(g.previewDamage([3, 4], 2), 8);
  const h = start('c1', TRL); hire(h, 'HM4'); const r = h.hero.rations; resolveCard(h, 'D7'); assert.equal(h.hero.rations, r + 1); choose(h, 'cook');
  const k = start('c1', TRL); hire(k, 'HM4'); k.hero.rations = 1; topPlot(k, 'PT4'); topPlot(k, 'PT4'); endOfLevel(k);
  assert.equal(k.s.prompt.title, 'Eydis'); choose(k, 'pay'); assert.equal(k.hero.gold, 2); assert.ok(merc(k, 'HM4'));
  const j = start('c1', TRL); hire(j, 'HM4'); j.hero.gold = 0; topPlot(j, 'PT4'); topPlot(j, 'PT4'); endOfLevel(j); assert.equal(merc(j, 'HM4'), null);
});
test('HM5 Bogdana: +1 ración en las setas; +3 de energía en el Campamento; pierde moral contra enemigos de 5+ de salud', () => {
  const g = start('c1', TRL); hire(g, 'HM5'); const r = g.hero.rations; resolveCard(g, 'D4', 1); assert.equal(g.hero.rations, r + 2);
  g.hero.energy = 5; resolveCard(g, 'D7'); assert.equal(g.hero.energy, 8); choose(g, 'search');
  rig(g, [3, 3]); fight(g, 'E2'); assert.equal(merc(g, 'HM5').morale, 4);
  const h = start('c1', TRL); hire(h, 'HM5'); rig(h, [3, 3]); fight(h, 'E10'); assert.equal(merc(h, 'HM5').morale, 3);
});
test('HM6 Farzad: ignora el Laberinto; relanza todos tus dados una vez por nivel; pierde 1 de moral por ojo', () => {
  const g = start('c1', TRL); hire(g, 'HM6'); const r = g.hero.rations; resolveCard(g, 'D3', 2); choose(g, 'ignore');
  assert.equal(g.hero.rations, r); assert.equal(g.hero.hp, 14);
  discardAll(g); give(g, 'T5'); rig(g, [3, 3]); fight(g, 'E10', { hpBonus: 20 }); rig(g, [1, 2]); g.act('attack', { energy: 2 });
  assert.ok(g.s.prompt.options.some((o) => o.id === 'all:HM6')); rig(g, [5, 5]); g.act('reroll', { id: 'all:HM6' }); assert.ok(g.s.lvl.farzad);
  g.addEyes(2); assert.equal(merc(g, 'HM6').morale, 3);
});
test('HM7 Godfrey: +2 contra no muertos; reza en el Altar (+2 energía); pierde moral al derrotar a vivos; veta tramas que bajan la moral', () => {
  const g = start('c1', TRL); hire(g, 'HM7'); discardAll(g); give(g, 'T5'); rig(g, [3, 3]); fight(g, 'E8'); assert.equal(g.previewDamage([3, 4], 2), 9);
  const h = start('c1', TRL); hire(h, 'HM7'); h.hero.energy = 5; resolveCard(h, 'D9'); assert.equal(h.hero.energy, 7); choose(h, 'bless');
  discardAll(h); itemsOnly(h); rig(h, [3, 3]); fight(h, 'E10'); kill(h); assert.equal(merc(h, 'HM7').morale, 5);
  const k = start('c1', TRL); hire(k, 'HM7'); plot(k, 'PT2'); const opt = k.s.prompt.options.find((o) => o.id === 'butcher');
  assert.equal(opt.disabled, true); assert.match(opt.reason, /Godfrey/);
});
test('HM8 Olive: cura todo el veneno en el Campamento; pierde moral al derrotar a enemigos de 6+ de salud', () => {
  const g = start('c1', TRL); hire(g, 'HM8'); g.hero.poison = 4; resolveCard(g, 'D7'); assert.equal(g.hero.poison, 0); choose(g, 'search');
  discardAll(g); itemsOnly(g); rig(g, [3, 3]); fight(g, 'E2'); kill(g); assert.equal(merc(g, 'HM8').morale, 2);
  rig(g, [3, 3]); fight(g, 'E10'); kill(g); assert.equal(merc(g, 'HM8').morale, 1);
});
test('T30 Rosario de Fe: +2 de salud en el Altar', () => {
  const g = start('c1', TRL); give(g, 'T30'); g.hero.hp = 5; resolveCard(g, 'D9'); choose(g, 'bless'); assert.equal(g.hero.hp, 7);
});
test('T31 Piedra de Afilar: una vez por nivel da la vuelta a un dado', () => {
  const g = start('c1', TRL); discardAll(g); give(g, 'T5'); give(g, 'T31'); rig(g, [3, 3]); fight(g, 'E10', { hpBonus: 20 });
  rig(g, [2, 3]); g.act('attack', { energy: 2 }); assert.equal(g.act('reroll', { id: 'flip:T31' }).ok, false);
  g.act('reroll', { id: 'flip:T31', die: 1 }); assert.equal(g.s.prompt.type === 'postRoll' ? g.s.prompt.dice[1] : 4, 4); assert.ok(g.s.lvl.flipT31);
});
test('T32 Dardo Envenenado: se descarta para infligir 3d6 (desde los accesorios)', () => {
  const g = start('c1', TRL); discardAll(g); const u = give(g, 'T32'); rig(g, [3, 3]); const pr = fight(g, 'E10', { hpBonus: 20 });
  assert.ok(pr.throwables.includes(u)); rig(g, [3, 4, 5, 3, 3]); g.act('throwItem', { uid: u }); assert.equal(g.s.combat.hp, 27 - 12);
});
test('T33 Ajo: se descarta para evitar un ataque de un no muerto', () => {
  const g = start('c1', TRL); discardAll(g); const u = give(g, 'T33'); rig(g, [6, 1]); const pr = engage(g, 'E8');
  assert.ok(pr.options.some((o) => o.id === 'garlic')); g.act('enemyReact', { id: 'garlic' }); assert.equal(g.hero.hp, 14); assert.equal(g.allItems().includes(u), false);
});
test('T34 Tomo de Fuego: duplica la Bomba de Mecha; +1 contra enemigos de fuego', () => {
  const g = start('c1', TRL); discardAll(g); give(g, 'T34'); const b = give(g, 'P4'); rig(g, [3, 3]); fight(g, 'E10', { hpBonus: 20 });
  rig(g, [3, 4, 3, 3]); g.act('potionAttack', { uid: b }); assert.equal(g.s.combat.hp, 27 - 14);
  const h = start('c1', TRL); discardAll(h); give(h, 'T34'); give(h, 'T5'); rig(h, [3, 3]); fight(h, 'E12'); assert.equal(h.previewDamage([3, 4], 2), 8);
});
test('T35 Tomo de Hielo: duplica la Esquirla de Hielo; +1 contra enemigos de hielo', () => {
  const g = start('c1', TRL); discardAll(g); give(g, 'T35'); const b = give(g, 'P3'); rig(g, [3, 3]); fight(g, 'E10', { hpBonus: 30 });
  rig(g, [3, 4, 3, 3]); g.act('potionAttack', { uid: b }); assert.equal(g.s.combat.hp, 37 - 24);
  assert.equal(g.previewDamage([3, 4], 2), 8);
});
test('T36 Dagas de Puño: los puñetazos infligen 2 de daño', () => {
  const g = start('c1', TRL); discardAll(g); give(g, 'T36'); rig(g, [3, 3]); const pr = fight(g, 'E10'); assert.equal(pr.fist, 2);
  rig(g, [3, 3]); g.act('attack', { energy: 0 }); assert.equal(g.s.combat.hp, 8 - 2);
});
test('T37 Cofia Tachonada: −1 al daño inicial; se rompe con un impacto de 4 o más', () => {
  const g = start('c1', TRL); discardAll(g); const u = give(g, 'T37'); rig(g, [6, 1]); fight(g, 'E10');
  assert.equal(g.hero.hp, 14 - 7); assert.equal(g.s.eq.CA, null); assert.ok(g.s.z.removed.includes(u));
});
test('C15 Mizlak el Mendigo: sin equipo, habilidad ni raciones; +10 puntos si ganas; el mazo de Equipo incluye T30-T37', () => {
  const g = start('c15', TRL); assert.equal(g.allItems().length, 0); assert.equal(g.hero.skills.length, 0); assert.equal(g.hero.rations, 0);
  assert.equal(g.score().parts.bonus, 10);
  for (const k of ['T30', 'T31', 'T32', 'T33', 'T34', 'T35', 'T36', 'T37']) assert.ok(codes(g, 'trappings').includes(k), k);
});

/* ====================================================================================== The Howling Abyss */
test('Howling: sustituye todo el mazo de mazmorra por sus 18 cartas (dorso: puerta azul)', () => {
  const g = start('c1', HOW); const all = [...codes(g, 'dungeon'), ...codes(g, 'dungeonDiscard'), ...g.s.z.pair.filter(Boolean).map((u) => g.def(u).key)];
  assert.equal(all.length, 18); assert.equal(all.filter((k) => k === 'D11').length, 3); assert.equal(all.filter((k) => k === 'D16').length, 2);
  assert.equal(all.filter((k) => k === 'D24').length, 2); assert.equal(all.some((k) => /^D([1-9]|10)$/.test(k)), false);
  assert.equal(g.cat.backs.dungeon, 'expansions/howling/card_009.jpg');
  for (let t = 0; t < 8; t++) { g.s.prompt = null; g.q = []; g.drawPair(); g.s.prompt = null; g.run(); if (g.s.prompt?.type !== 'turn') break; }
});
test('D11 Emboscada (Howling): parte 1 +3 al primer ataque; parte 2 salud +nivel+5 y +nivel al daño inicial', () => {
  const g = start('c1', HOW); discardAll(g); topEnemy(g, 'E10'); resolveCard(g, 'D11', 1); toAttack(g);
  assert.equal(g.s.combat.ambush, 'player'); assert.equal(g.s.combat.maxHp, 8); g.act('attack', { energy: 0 }); assert.equal(g.s.combat.hp, 8 - 4);
  const h = start('c1', HOW); discardAll(h); topEnemy(h, 'E10'); rig(h, [5, 2]); resolveCard(h, 'D11', 2); toAttack(h);
  assert.equal(h.s.combat.maxHp, 7 + 1 + 5); assert.equal(h.hero.hp, 14 - (3 + 3 + 1));
});
test('D12 Tesoro (Howling): parte 2 a elegir: botín y poción, o d6 de oro y 1 ración', () => {
  const g = start('c1', HOW); resolveCard(g, 'D12', 1); assert.equal(g.hero.gold, 4);
  const h = start('c1', HOW); resolveCard(h, 'D12', 2); rig(h, [5]); choose(h, 'gold'); assert.equal(h.hero.gold, 8); assert.equal(h.hero.rations, 2);
  const k = start('c1', HOW); discardAll(k); itemsOnly(k); resolveCard(k, 'D12', 2); choose(k, 'loot'); assert.equal(k.allItems().length, 2);
});
test('D13 Laberinto (Howling): parte 1 ración (o 3 de daño) y +1 oro; parte 2 dos raciones (3 por cada una que falte) y +1 poción', () => {
  const g = start('c1', HOW); g.hero.rations = 0; resolveCard(g, 'D13', 1); assert.equal(g.hero.hp, 11); assert.equal(g.hero.gold, 4);
  const h = start('c1', HOW); discardAll(h); h.hero.rations = 1; resolveCard(h, 'D13', 2); assert.equal(h.hero.hp, 11); assert.equal(h.allItems().length, 1);
});
test('D14 Plantación de Setas (Howling): tablas de d6 por parte', () => {
  const g = start('c1', HOW); rig(g, [1]); resolveCard(g, 'D14', 1); assert.equal(g.hero.poison, 1);
  rig(g, [5]); resolveCard(g, 'D14', 1); assert.equal(g.hero.rations, 3); rig(g, [6]); resolveCard(g, 'D14', 2); assert.equal(g.hero.rations, 6);
});
test('D15 Trampa de Flechas (Howling): tablas de d6 por parte', () => {
  const g = start('c1', HOW); rig(g, [1]); resolveCard(g, 'D15', 1); assert.equal(g.hero.poison, 1); // Fayon: Esquivar −1
  const h = start('c2', HOW); rig(h, [6]); resolveCard(h, 'D15', 1); assert.equal(h.hero.poison, 0); rig(h, [3]); resolveCard(h, 'D15', 2); assert.equal(h.hero.poison, 2);
});
test('D16 Escaramuza (Howling): parte 1 salud +nivel; parte 2 +nivel+4 y +1 de oro si la derrotas', () => {
  const g = start('c1', HOW); discardAll(g); topEnemy(g, 'E10'); rig(g, [3, 3]); resolveCard(g, 'D16', 1); toAttack(g); assert.equal(g.s.combat.maxHp, 8);
  const h = start('c1', HOW); discardAll(h); itemsOnly(h); topEnemy(h, 'E10'); rig(h, [3, 3]); resolveCard(h, 'D16', 2); toAttack(h);
  assert.equal(h.s.combat.maxHp, 12); kill(h); assert.equal(h.hero.gold, 4);
});
test('D17 Campamento (Howling): Buscar = ración + oro; Descansar = 3 de salud y −1 de veneno', () => {
  const g = start('c1', HOW); resolveCard(g, 'D17'); choose(g, 'search'); assert.equal(g.hero.rations, 2); assert.equal(g.hero.gold, 4);
  g.hero.hp = 5; g.hero.poison = 2; resolveCard(g, 'D17'); choose(g, 'rest'); assert.equal(g.hero.hp, 8); assert.equal(g.hero.poison, 1);
});
test('D18 Mercader (Howling): bazar fijo de 3 botines y 2 pociones; Comerciar un objeto tuyo por otro de menor valor', () => {
  const g = start('c1', HOW); itemsOnly(g); g.s.level = 5; const pr = resolveCard(g, 'D18');
  assert.equal(pr.type, 'merchant'); assert.equal(pr.stock.length, 5); assert.equal(pr.trade, true);
  const give1 = g.allItems().find((u) => g.def(u).key === 'T8'); // Broquel: valor 2
  const cheap = pr.stock.find((u) => g.def(u).price < 2); const dear = pr.stock.find((u) => g.def(u).price >= 2);
  if (dear) assert.equal(g.act('merchantTrade', { give: give1, take: dear }).ok, false);
  if (cheap) { assert.equal(g.act('merchantTrade', { give: give1, take: cheap }).ok, true); assert.ok(g.allItems().includes(cheap)); assert.ok(g.s.prompt.stock.includes(give1)); }
  const h = start('c1'); h.s.prompt = null; h.openMerchant(h.cat.def('d8')); h.run(); assert.equal(h.s.prompt.trade, false);
});
test('D19 Altar (Howling): Bendición, Fuerza (+2 energía), Curación o Merced (moral +1)', () => {
  const g = start('c1', HOW); assert.deepEqual(resolveCard(g, 'D19').options.map((o) => o.id), ['bless', 'strength', 'cure', 'mercy']);
  g.hero.energy = 5; choose(g, 'strength'); assert.equal(g.hero.energy, 7);
  resolveCard(g, 'D19'); choose(g, 'mercy'); assert.equal(g.hero.morality, 1);
});
test('D20 Claro (Howling): roba una trama', () => {
  const g = start('c1', HOW); topPlot(g, 'PT2'); const pr = resolveCard(g, 'D20'); assert.equal(pr.plotUid && g.def(pr.plotUid).key, 'PT2');
});
test('D21 Arcángel: salud según tu posición en el control de moral', () => {
  for (const [m, hp] of [[4, 4], [2, 2], [1, 1], [0, 0], [-1, -1], [-3, -2], [-5, -4]]) {
    const g = start('c1', HOW); g.hero.hp = 8; g.hero.morality = m; resolveCard(g, 'D21'); assert.equal(g.hero.hp, 8 + hp, `moral ${m}`);
  }
});
test('D22 Ídolo Falso: suplicar poder, riqueza o vida (moral −1) o ignorarlo (moral +1, −1 de salud)', () => {
  const g = start('c1', HOW); discardAll(g); itemsOnly(g); g.hero.energy = 5; resolveCard(g, 'D22'); choose(g, 'power');
  assert.deepEqual([g.hero.morality, g.hero.energy, g.allItems().length], [-1, 7, 1]);
  const h = start('c1', HOW); resolveCard(h, 'D22'); choose(h, 'ignore'); assert.deepEqual([h.hero.morality, h.hero.hp], [1, 13]);
  const k = start('c1', HOW); k.hero.hp = 5; resolveCard(k, 'D22'); choose(k, 'life'); assert.deepEqual([k.hero.hp, k.hero.rations], [7, 2]);
});
test('D23 Fuente Mística: tabla de d6 (1 enemigo, 2 +3 salud, 3 veneno, 4 poción, 5 oro, 6 bendiciones = nivel)', () => {
  const g = start('c1', HOW); g.hero.hp = 5; rig(g, [2]); resolveCard(g, 'D23'); assert.equal(g.hero.hp, 8);
  rig(g, [5]); resolveCard(g, 'D23'); assert.equal(g.hero.gold, 4); g.s.level = 2; rig(g, [6]); resolveCard(g, 'D23'); assert.equal(g.hero.blessings.length, 2);
  rig(g, [3]); resolveCard(g, 'D23'); assert.equal(g.hero.poison, 1);
  discardAll(g); topEnemy(g, 'E10'); rig(g, [1, 3, 3]); resolveCard(g, 'D23'); toAttack(g); assert.equal(g.s.combat.maxHp, 7 + 2);
});
test('D24 Encuentro Salvaje: roba 2 (o 4) enemigos y lucha contra el de MÁS salud con +nivel+1 (+nivel+3); en empate eliges', () => {
  const g = start('c1', HOW); discardAll(g); topEnemy(g, 'E2'); topEnemy(g, 'E10'); const [a, b] = g.s.z.enemies.slice(0, 2);
  rig(g, [3, 3]); resolveCard(g, 'D24', 1); toAttack(g); assert.equal(g.s.combat.uid, a); assert.equal(g.s.combat.maxHp, 7 + 2); assert.ok(g.s.z.enemiesDiscard.includes(b));
  const h = start('c1', HOW); discardAll(h); topEnemy(h, 'E11'); topEnemy(h, 'E10'); const pr = resolveCard(h, 'D24', 1);
  assert.equal(pr.purpose, 'wild'); assert.equal(pr.uids.length, 2); rig(h, [3, 3]); h.act('pickCards', { uids: [pr.uids[1]] }); assert.equal(h.def(h.s.combat.uid).key, 'E11');
  const k = start('c1', HOW); discardAll(k); for (const c of ['E2', 'E4', 'E12', 'E3']) topEnemy(k, c); rig(k, [3, 3]); resolveCard(k, 'D24', 2); toAttack(k);
  assert.equal(k.def(k.s.combat.uid).key, 'E12'); assert.equal(k.s.combat.maxHp, 8 + 1 + 3);
});

/* ====================================================================================== Iron Chest */
test('Iron Chest: el mapa de encuentros se elige por el nivel de la aventura (base 1, campañas según su NIVEL)', () => {
  for (const [cfg, lvl] of [[ICH, 1], [{ campaign: 'warren', modules: ['iron_chest'] }, 2], [{ campaign: 'crystal', modules: ['iron_chest'] }, 3], [{ campaign: 'spire', modules: ['iron_chest'] }, 4]]) {
    const g = start('c1', cfg); assert.equal(g.s.adventureLevel, lvl); assert.equal(g.def(g.s.encounter.map).level, lvl); assert.deepEqual(g.s.z.adventure, [g.s.encounter.map]);
  }
});
test('Iron Chest: al bajar de nivel se resuelve el icono del tramo (evento encounter)', () => {
  const g = start('c1', ICH); g.hero.rations = 3; topPlot(g, 'PT4'); topPlot(g, 'PT4'); const ev = events(g);
  rig(g, [3, 6]); endOfLevel(g); while (g.s.prompt?.type === 'choice') choose(g);
  const e = ev.find((x) => x.t === 'encounter'); assert.deepEqual([e.icon, e.from, e.to], ['random', 1, 2]);
});
test('Encuentros: TRAMPA, ENEMIGO (sin bonificaciones), SETAS, TESORO, POCIÓN y ENCUENTRO ALEATORIO (6 → subtabla)', () => {
  const run = (g, icon, dice) => { rig(g, dice); return runTask(g, function t() { this._encounterIcon(icon); }); };
  let g = start('c2', ICH); run(g, 'trap', [1]); assert.equal(g.hero.poison, 2); run(g, 'trap', [3]); assert.equal(g.hero.poison, 3); run(g, 'trap', [6]); assert.equal(g.hero.poison, 3);
  g = start('c1', ICH); discardAll(g); topEnemy(g, 'E10'); run(g, 'enemy', [5, 2]); toAttack(g); assert.equal(g.s.combat.maxHp, 7); assert.equal(g.hero.hp, 14 - 6);
  g = start('c1', ICH); run(g, 'mushrooms', [1]); assert.equal(g.hero.poison, 1); run(g, 'mushrooms', [4]); assert.equal(g.hero.rations, 2); run(g, 'mushrooms', [6]); assert.equal(g.hero.rations, 4);
  g = start('c1', ICH); discardAll(g); itemsOnly(g); run(g, 'treasure', []); run(g, 'potion', []); assert.equal(g.allItems().length, 2);
  g = start('c1', ICH); run(g, 'random', [6, 1]); assert.equal(g.hero.hp, 11); run(g, 'random', [6, 2]); assert.equal(g.hero.poison, 1);
  run(g, 'random', [6, 3]); choose(g, 'energy'); assert.equal(g.hero.energy, 13);
  discardAll(g); const t0 = g.s.z.trappings.length; run(g, 'random', [6, 5]); assert.equal(g.s.z.trappings.length, t0 - 1);
  g = start('c1', ICH); run(g, 'random', [3, 4]); assert.equal(g.hero.rations, 2);
});

/* ====================================================================================== Gnome Pack #1 */
const SEL = { race: 'Humano', klass: 'Asesino', sign: 'Del Zorro', skill: 'Sombra', equipment: 'Vestiduras' };
const custom = (sel, seed = 1, mods = ['gnome']) => Game.create({ heroId: 'custom', config: { modules: mods, custom: sel }, seed });
test('Gnome: creador de personajes (raza → salud/energía/carga; clase → bonos, raciones, oro y habilidad; signo → competencia, moral y equipo)', () => {
  const g = custom(SEL); const h = g.hero;
  assert.deepEqual([h.maxHp, h.energy, h.encumbrance, h.rations, h.gold, h.morality, h.proficiency], [13, 12, 10, 1, 2, 0, 'agilidad']);
  assert.ok(g.hasSkill('S8')); assert.ok(has(g, 'T12')); assert.equal(g.s.hero.custom.race, 'Humano');
  const lp = listPacks().gnome; assert.equal(lp.races.length, 8); assert.equal(lp.classes.length, 8); assert.equal(lp.signs.length, 12);
  const p = buildCustomHeroPreview(SEL); assert.equal(p.valid, true); assert.equal(p.health, 13); assert.deepEqual(p.skills.map((s) => s.name), ['Sombra']);
  assert.equal(buildCustomHeroPreview({ race: 'Humano' }).valid, false);
});
test('Gnome: validación con errores claros', () => {
  assert.throws(() => custom({ ...SEL, skill: 'Furia' }), /no puede empezar con "Furia"/);
  assert.throws(() => custom({ ...SEL, equipment: 'Maza' }), /no ofrece "Maza"/);
  assert.throws(() => custom({ ...SEL, race: 'Dragón' }), /Raza desconocida/);
  assert.throws(() => custom({ ...SEL, equipment2: 'Daga' }), /debe costar 1 de oro/);
  assert.throws(() => custom({ ...SEL, race: 'Enano', equipment2: 'Antorcha' }), /Solo los humanos/);
  assert.throws(() => Game.create({ heroId: 'custom', config: {}, seed: 1 }), /config.custom/);
});
test('Gnome: el equipo y las habilidades de otras expansiones se resuelven por nombre aunque no estén activas', () => {
  const g = custom({ race: 'Enano', klass: 'Monje', sign: 'Del Zorro', skill: 'Correr', equipment: 'Daga de la Luna' });
  assert.ok(g.hasSkill('S20')); assert.ok(has(g, 'T20')); assert.equal(codes(g, 'trappings').includes('T20'), false);
  const s = custom({ race: 'Humano', klass: 'Ladrón', sign: 'Del Búho', skill: 'Cazador de Tesoros', equipment: 'Zurrón del Alquimista' });
  assert.ok(s.hasSkill('S17')); assert.ok(has(s, 'T17'));
  const t = custom({ race: 'Humano', klass: 'Asesino', sign: 'De la Serpiente', skill: 'Sombra', equipment: 'Dardo Envenenado y Ajo' });
  assert.ok(has(t, 'T32') && has(t, 'T33'));
  const o = custom({ race: 'Humano', klass: 'Asesino', sign: 'De la Araña', skill: 'Sombra', equipment: '2 de Oro' }); assert.equal(o.hero.gold, 4); assert.equal(o.hero.morality, -2);
  const r = Game.restore(t.snapshot()); assert.equal(r.hero.custom.equipment, 'Dardo Envenenado y Ajo');
});
test('Raza Humano: 1 equipo adicional que cueste 1 de oro', () => {
  const g = custom({ ...SEL, equipment2: 'Antorcha' }); assert.ok(has(g, 'T3')); assert.equal(codes(g, 'trappings').includes('T3'), false);
});
test('Raza Kroling: una vez por nivel ataca gastando salud en vez de energía; si mata, +1 bendición', () => {
  const g = custom({ race: 'Kroling', klass: 'Guardián', sign: 'De la Tortuga', skill: 'Bloquear', equipment: 'Hacha' }); g.act('begin');
  rig(g, [3, 3]); const pr = fight(g, 'E2'); assert.ok(pr.payHp.some((o) => o.id === 'kroling'));
  const hp = g.hero.hp; const en = g.hero.energy; g.s.z.loot = g.s.z.loot.filter((u) => g.def(u).kind === 'item');
  rig(g, [6]); g.act('attack', { energy: 1, payHp: 'kroling' }); treasure(g, 'gold');
  assert.equal(g.hero.hp, hp - 1); assert.equal(g.hero.energy, en); assert.equal(g.hero.blessings.length, 1); assert.ok(g.s.lvl.kroling);
  rig(g, [3, 3]); assert.equal(fight(g, 'E2').payHp.length, 0);
});
test('Raza Enano: +1 de salud al resolver el Tesoro', () => {
  const g = custom({ race: 'Enano', klass: 'Guardián', sign: 'De la Tortuga', skill: 'Bloquear', equipment: 'Hacha' }); g.act('begin');
  g.hero.hp = 5; resolveCard(g, 'D2', 1); assert.equal(g.hero.hp, 6);
});
test('Raza Elfo del Bosque: +1 de energía al descansar o encontrar setas', () => {
  const g = custom({ race: 'Elfo del Bosque', klass: 'Nómada', sign: 'Del Zorro', skill: 'Furia', equipment: 'Vestiduras' }); g.act('begin');
  g.hero.energy = 5; g.hero.rations = 2; resolveCard(g, 'D7'); choose(g, 'rest'); assert.equal(g.hero.energy, 6);
  resolveCard(g, 'D4', 1); assert.equal(g.hero.energy, 7);
});
test('Raza Gnomo: empieza con 1 poción a su elección', () => {
  const g = custom({ race: 'Gnomo', klass: 'Clérigo', sign: 'Del Búho', skill: 'Divinidad', equipment: 'Vestiduras' }); g.act('begin');
  assert.equal(g.s.prompt.type, 'pickCards'); const p = g.s.prompt.uids[0]; g.act('pickCards', { uids: [p] }); assert.ok(g.allItems().includes(p));
  const h = custom({ race: 'Gnomo', klass: 'Clérigo', sign: 'Del Búho', skill: 'Divinidad', equipment: 'Vestiduras', potion: 'Antídoto' });
  assert.ok(has(h, 'P2')); h.act('begin'); assert.equal(h.s.prompt.type, 'turn');
});
test('Raza Mediano: +1 ración inicial y +1 de salud por cada ración que gane', () => {
  const g = custom({ race: 'Mediano', klass: 'Monje', sign: 'Del Escarabajo', skill: 'Esquivar', equipment: 'Ajo' }); g.act('begin');
  assert.equal(g.hero.rations, 4); g.hero.hp = 5; g.gain('rations', 2); assert.equal(g.hero.hp, 7);
});
test('Raza Semiorco: puede evitar combatir contra orcos, grunkles y goblins', () => {
  const g = custom({ race: 'Semiorco', klass: 'Nómada', sign: 'Del Lagarto', skill: 'Furia', equipment: 'Maza' }); g.act('begin');
  const pr = engage(g, 'E7'); assert.ok(pr.options.some((o) => o.id === 'halforc')); g.act('avoidEnemy', { id: 'halforc' }); assert.equal(g.s.combat, null);
  rig(g, [3, 3]); assert.notEqual(engage(g, 'E10').type, 'avoidEnemy');
});
test('Raza Tritón: +1 de energía al atacar con una poción', () => {
  const g = custom({ race: 'Tritón', klass: 'Curandero', sign: 'De la Rata', skill: 'Valorar', equipment: 'Tomo de Fuego' }); g.act('begin');
  const b = give(g, 'P4'); g.hero.energy = 5; rig(g, [3, 3]); fight(g, 'E10', { hpBonus: 30 }); rig(g, [3, 4, 3, 3]); g.act('potionAttack', { uid: b });
  assert.equal(g.hero.energy, 6);
});
test('C18 Grubrot: Bastón del Cuervo (de otra expansión, inyectado), Vestiduras y Alquimia', () => {
  const g = Game.create({ heroId: 'c18', config: GNM, seed: 2 }); assert.ok(has(g, 'T28') && has(g, 'T12')); assert.ok(g.hasSkill('S2'));
  g.act('begin'); assert.equal(g.s.prompt.type, 'pickCards');
});

/* ====================================================================================== datos y contrato con la interfaz */
test('gen-data: ids únicos entre todas las expansiones; las colisiones de código usan clave "paquete:código"', () => {
  const ids = new Set(Object.values(BASE).filter(Array.isArray).flat().map((d) => d.id));
  for (const [p, g] of Object.entries(GENERATED)) {
    for (const [k, v] of Object.entries(g)) if (Array.isArray(v) && k !== 'rules') for (const d of v) { assert.equal(ids.has(d.id), false, `${p}:${d.id}`); ids.add(d.id); }
  }
  const c = buildCatalog({ campaign: 'spire', modules: ['loot_lore'] });
  assert.equal(c.byCode.get('T21').name, 'Corcesca'); assert.equal(c.byCode.get('PT31').name, 'Dreadtrodón'); assert.equal(c.byCode.get('spire:PT31').name, 'El Maligno');
  assert.equal(buildCatalog({ campaign: 'galnok' }).byCode.get('galnok:T21').fx.carryBonus, 2);
});
test('listPacks(): contrato para el menú (paquetes, viñetas, recuentos, héroes, jefe, cartas clave, exclusivos, gnome)', () => {
  const lp = listPacks();
  assert.equal(lp.packs.length, 16); // 15 oficiales + ANEMIA 4.0 (modo fanmade)
  for (const p of lp.packs) {
    for (const k of ['id', 'name', 'es', 'type', 'number', 'blurb', 'rules', 'counts', 'heroes', 'boss', 'keyCards', 'intro']) assert.ok(k in p, `${p.id}.${k}`);
    assert.ok(p.keyCards.length > 0 && p.keyCards.length <= 8, p.id); assert.ok(p.rules.length > 0, p.id);
    if (p.type === 'campaign') { assert.ok(p.boss, p.id); assert.ok(p.adventureLevel >= 2, p.id); }
  }
  const by = Object.fromEntries(lp.packs.map((p) => [p.id, p]));
  assert.equal(by.howling.exclusive, 'dungeonDeck'); assert.equal(by.howling.counts.dungeonCards, 18);
  assert.deepEqual(by.spire.includes, ['beasts']); assert.equal(by.spire.boss.weakness, '*');
  assert.equal(by.realms.counts.environments, 9); assert.equal(by.realms.counts.artifacts, 8); assert.equal(by.troll.counts.mercenaries, 8);
  assert.equal(by.iron_chest.counts.adventures, 8); assert.ok(lp.gnome.races.length === 8);
});
test('buildCatalog(): extras, dorsos y mazos nuevos', () => {
  const c = buildCatalog({ campaign: 'spire', modules: ['realms', 'troll', 'iron_chest', 'gnome', 'howling'] });
  assert.deepEqual(c.extras, { environments: true, artifacts: true, afflictions: true, mercenaries: true, encounters: true });
  for (const k of ['environments', 'artifacts', 'mercenaries', 'afflictions', 'dungeon']) assert.ok(c.backs[k], k);
  assert.equal(c.pools.environments.length, 9); assert.equal(c.pools.mercs.length, 8); assert.equal(c.pools.adventures.length, 4);
  assert.deepEqual(buildCatalog({}).extras, { environments: false, artifacts: false, afflictions: false, mercenaries: false, encounters: false });
  const g = start('c1', { modules: ['realms', 'troll', 'iron_chest'] });
  for (const k of ['env', 'mercs', 'artifactsBought', 'encounter', 'adventureLevel']) assert.ok(k in g.s, k);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(g.s)));
});
test('Gnome: todas las habilidades de clase y todos los equipos de signo existen en alguna expansión', () => {
  const G = listPacks().gnome;
  for (const k of G.classes) for (const skill of k.startSkills) {
    const p = buildCustomHeroPreview({ race: 'Humano', klass: k.name, sign: 'Del Zorro', skill, equipment: 'Vestiduras' });
    assert.equal(p.valid, true, `${k.name}/${skill}: ${p.errors.join(' · ')}`);
  }
  for (const s of G.signs) for (const equipment of s.startEquipment) {
    const p = buildCustomHeroPreview({ race: 'Humano', klass: 'Asesino', sign: s.name, skill: 'Sombra', equipment });
    assert.equal(p.valid, true, `${s.name}/${equipment}: ${p.errors.join(' · ')}`);
  }
});
