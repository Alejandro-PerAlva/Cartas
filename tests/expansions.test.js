import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../iron_helm_game/js/engine/index.js';
import { rig, start, topDungeon, topEnemy, topPlot, give, discardAll, turn, toAttack, affliction, fight } from './helpers/scenario.js';

const ALL = { modules: ['loot_lore', 'fanny_pack', 'beasts'] };
const BLK = { campaign: 'blackened', modules: ['loot_lore', 'fanny_pack', 'beasts'] };

test('Warren: el Grunkle te hace perder 1 de energía al impactar', () => {
  const g = start('c1', { campaign: 'warren' }); discardAll(g); const e0 = g.hero.energy;
  rig(g, [6, 2]); fight(g, 'E13');
  assert.equal(g.hero.energy, e0 - 1);
});

test('Warren: el Cíclope rompe tu arma principal si te inflige 9 o más', () => {
  const g = start('c1', { campaign: 'warren' }); discardAll(g); give(g, 'L14'); g.hero.hp = 16; g.s.prompt = null;
  rig(g, [6, 1]);                                  // dif 5 + daño 5 = 10 (sin armadura)
  const uid = g.mk(g.cat.byCode.get('B4').id); g.startCombat(uid, { boss: true, ambush: 'normal', hpBonus: 0, source: 'boss' }); g.run();
  assert.equal(g.s.eq.MP, null);
});

test('Warren: los Titilantes dan un ojo al ser derrotados', () => {
  const g = start('c1', { campaign: 'warren' }); discardAll(g); give(g, 'T5'); g.hero.energy = 12;
  rig(g, [3, 3]); fight(g, 'E14', { hpBonus: 0 });
  const e0 = g.s.eyes; rig(g, [5, 5, 5]); g.act('attack', { energy: 3 }); // 15 > 7 de salud
  assert.equal(g.s.eyes, e0 + 1);
});

test('Hacha de Batalla: los resultados de 1 infligen 6 de daño', () => {
  const g = start('c1', { campaign: 'warren' }); discardAll(g); give(g, 'T15'); topDungeon(g, 'D6', 'D10'); topEnemy(g, 'E10'); rig(g, [4, 4]);
  turn(g, 1); toAttack(g);
  assert.equal(g.previewDamage([1, 1], 2), 12); assert.equal(g.previewDamage([1, 3], 2), 9);
});

test('Blackened: la Avispa Llameante no hace daño pero envenena y quita energía', () => {
  const g = start('c1', { campaign: 'blackened' }); discardAll(g); const hp = g.hero.hp, en = g.hero.energy;
  rig(g, [6, 2]); fight(g, 'E16');
  assert.equal(g.hero.hp, hp); assert.equal(g.hero.poison, 1); assert.equal(g.hero.energy, en - 1);
});

test('Blackened: la Madre Colmena duplica tu veneno con un golpe inicial', () => {
  const g = start('c1', { campaign: 'blackened' }); discardAll(g); g.hero.poison = 2; g.hero.hp = 16; g.s.prompt = null;
  rig(g, [5, 1]); const uid = g.mk(g.cat.byCode.get('B5').id); g.startCombat(uid, { boss: true, ambush: 'normal', source: 'boss' }); g.run();
  assert.equal(g.hero.poison, 4);
});

test('Cetrería: al empezar cada nivel el pájaro puede traer oro o una ración', () => {
  const g = Game.create({ heroId: 'c6', config: { campaign: 'blackened' }, seed: 3 });
  assert.ok(g.hasSkill('S14'));
  rig(g, [5]); const r0 = g.hero.rations; g.act('begin');
  assert.equal(g.hero.rations, r0 + 1);
});

test('Colmillo de Grubrot, Corcesca y Destrozalápidas: bonificaciones por dobles', () => {
  const g = start('c1', BLK); discardAll(g);
  const e = start('c1', BLK); discardAll(e);
  give(g, 'L23'); topDungeon(g, 'D6', 'D10'); topEnemy(g, 'E10'); rig(g, [4, 4]); turn(g, 1); toAttack(g);
  assert.equal(g.previewDamage([3, 3], 2), 6 + 5); assert.equal(g.previewDamage([3, 4], 2), 7);
  give(e, 'T21'); topDungeon(e, 'D6', 'D10'); topEnemy(e, 'E10'); rig(e, [4, 4]); turn(e, 1); toAttack(e);
  assert.equal(e.previewDamage([2, 2], 2), 4 + 3);
  const u = start('c1', BLK); discardAll(u); give(u, 'L28'); topDungeon(u, 'D6', 'D10'); topEnemy(u, 'E8'); rig(u, [4, 4]); turn(u, 1); toAttack(u);
  assert.equal(u.previewDamage([2, 2], 2), 4 + 4);   // E8 Guerrero No Muerto
});

test('Entereza: el veneno ya no aumenta al final del nivel', () => {
  const g = start('c1', ALL); g.s.hero.skills.push('s16'); g.s.hero.poison = 4; g.s.hero.rations = 3; topPlot(g, 'PT4');
  g.s.turn = 8; g.s.ctx = { turnActive: true }; g.s.z.dungeon = []; g.s.prompt = null; g.run();
  while (g.s.prompt?.type === 'choice') g.act('choose', { id: g.s.prompt.options.find((o) => !o.disabled).id });
  assert.equal(g.hero.poison, 4);
});

test('Cazadora de Tesoros: cada moneda del botín da también 1 de energía', () => {
  const g = start('c4', ALL); discardAll(g); g.s.hero.skills.push('s17'); give(g, 'T1'); g.hero.energy = 5;
  rig(g, [5, 5]); fight(g, 'E7');                   // Orco: purse 1
  const en = g.hero.energy; const gold = g.hero.gold;
  rig(g, [6, 6, 6]); g.act('attack', { energy: 3 });
  assert.equal(g.hero.gold, gold + 1); assert.equal(g.hero.energy, en - 3 + 1);
});

test('Fanny Pack: el Asesino ataca dos veces si la emboscada se resuelve como segunda carta', () => {
  const g = start('c1', ALL); discardAll(g); g.hero.hp = 16; g.s.prompt = null;
  rig(g, [5, 1, 4, 1]); const uid = g.mk(g.cat.byCode.get('E34').id);
  g.startCombat(uid, { ambush: 'enemy', hpBonus: 5, initialBonus: 1, source: 'dungeon' }); g.run(); toAttack(g);
  assert.equal(g.hero.hp, 16 - (4 + 1 + 1) - (3 + 1 + 1));
});

test('Fanny Pack: la Araña Gigante encarece tu siguiente ataque', () => {
  const g = start('c1', ALL); discardAll(g); give(g, 'T5'); g.hero.energy = 8; rig(g, [5, 1]); fight(g, 'E35');
  rig(g, [3]); const en = g.hero.energy; g.act('attack', { energy: 1 });
  assert.equal(g.hero.energy, en - 2);
});

test('Fanny Pack: la Trampa de Foso se evita en una emboscada como primera carta; en otro caso cuesta d6−d6', () => {
  const g = start('c1', ALL); discardAll(g); topDungeon(g, 'D1', 'D10'); topEnemy(g, 'E36'); rig(g, []);
  const hp = g.hero.hp; turn(g, 1); toAttack(g);
  assert.equal(g.hero.hp, hp); assert.equal(g.s.combat, null);
  const h = start('c1', ALL); discardAll(h); topDungeon(h, 'D6', 'D10'); topEnemy(h, 'E36'); rig(h, [6, 2]); turn(h, 1); toAttack(h);
  assert.equal(h.hero.hp, 14 - 4);
});

test('Fanny Pack: el Morlock cae con una antorcha antes del daño inicial', () => {
  const g = start('c4', ALL); // Moliclan tiene antorcha
  const hp = g.hero.hp; topDungeon(g, 'D6', 'D10'); topEnemy(g, 'E37'); rig(g, [6, 1]);
  turn(g, 1); const pr = g.s.prompt;
  assert.equal(pr.type, 'pre'); assert.ok(pr.options.some((o) => o.id === 'light_torch'));
  g.act('preUse', { id: 'light_torch' });
  assert.equal(g.hero.hp, hp); assert.equal(g.s.z.graveyard.length, 1);
});

test('Fanny Pack: Mandoble Ávido añade un dado por 1 de oro; Riñonera libera 3 accesorios de carga', () => {
  const g = start('c1', ALL); discardAll(g); give(g, 'L47'); g.hero.gold = 3; topDungeon(g, 'D6', 'D10'); topEnemy(g, 'E10'); rig(g, [5, 5]); turn(g, 1); toAttack(g);
  rig(g, [2, 3, 4]); g.act('attack', { energy: 2, mandoble: true });
  assert.equal(g.hero.gold, 2);
  const h = start('c1', ALL); discardAll(h); const w0 = h.weight(); give(h, 'L13'); give(h, 'L10'); give(h, 'L11'); assert.equal(h.weight(), w0 + 3); give(h, 'T39'); assert.equal(h.weight(), w0 + 1);
});

test('Cápsula Corazón: +2 de salud máxima; al perderla la salud se ajusta', () => {
  const g = start('c1', ALL); discardAll(g); const u = give(g, 'AT9'); assert.equal(g.maxHp(), 16); g.s.hero.hp = 16; g.discardOwned(u);
  assert.equal(g.s.hero.hp, 14);
});

test('Broquel de Talhoffer convive con un arma a dos manos', () => {
  const g = start('c1', ALL); discardAll(g); const bow = give(g, 'T10'); const bro = give(g, 'L50');
  assert.equal(g.s.eq.MP, bow); assert.equal(g.s.eq.OM, bro);
  const sword = give(g, 'L14'); g.equip(sword); assert.equal(g.s.eq.MP, sword); assert.equal(g.s.eq.OM, bro);
});

test('Yelmo del Loco: no se puede quitar ni soltar', () => {
  const g = start('c1', BLK); discardAll(g); const u = give(g, 'L22'); assert.equal(g.s.eq.CA, u);
  assert.equal(g.act('unequip', { uid: u }).ok, false); assert.equal(g.act('drop', { uid: u }).ok, false);
});

test('Zurrón de Alquimista: las pociones no pesan', () => {
  const g = start('c1', BLK); discardAll(g); give(g, 'T17'); const w = g.weight(); give(g, 'P1'); give(g, 'P2'); assert.equal(g.weight(), w);
});

test('Moneda del Destino: roba dos tramas y te quedas con una', () => {
  const g = start('c1', ALL); discardAll(g); give(g, 'L30'); topPlot(g, 'PT4'); topPlot(g, 'PT9'); g.s.prompt = null; g.drawPlot({ clearing: true }); g.run();
  assert.equal(g.s.prompt.type, 'choice'); g.act('choose', { id: 'use' });
  assert.equal(g.s.prompt.type, 'pickCards'); assert.equal(g.s.prompt.uids.length, 2);
});

test('Beasts: la tercera ficha de veneno provoca una aflicción; el antídoto las cura todas', () => {
  const g = start('c1', ALL); g.hero.poison = 2; g.s.prompt = null; g.addPoison(1, 'test');
  assert.equal(g.hero.afflictions.length, 1);
  give(g, 'P2'); const u = g.allItems().find((x) => g.def(x).code === 'P2'); g.s.prompt = { type: 'turn' }; g.useItem(u); assert.equal(g.hero.afflictions.length, 0);
});

test('Aflicciones: Gula (2 raciones), Histeria (resolver la primera), Soberbia (resolver combates), Insomnio (sin campamento)', () => {
  const g = start('c1', ALL); affliction(g, 'AF4'); g.hero.rations = 1; g.hero.hp = 14; g.s.turn = 8; g.s.ctx = { turnActive: true }; g.s.z.dungeon = []; g.s.prompt = null; topPlot(g, 'PT4'); g.run();
  while (g.s.prompt?.type === 'choice') g.act('choose', { id: g.s.prompt.options.find((o) => !o.disabled).id });
  assert.equal(g.hero.hp <= 14 - 3, true);
  const h = start('c1', ALL); affliction(h, 'AF6'); topDungeon(h, 'D4', 'D10'); h.act('draw'); h.act('reveal', { slot: 0 });
  assert.equal(h.act('decline').ok, false);
  const s = start('c1', ALL); affliction(s, 'AF8'); topDungeon(s, 'D6', 'D4'); s.act('draw'); s.act('reveal', { slot: 0 });
  assert.equal(s.act('decline').ok, false);
  const i = start('c1', ALL); affliction(i, 'AF7'); topDungeon(i, 'D7', 'D4'); turn(i, 1);
  assert.equal(i.s.prompt.type, 'choice'); assert.ok(i.s.prompt.options.filter((o) => o.disabled).length === 2);
});

test('Beasts: los minijefes dan 4 ojos; Necrofobia hace huir de los no muertos', () => {
  const g = start('c1', ALL); discardAll(g); give(g, 'T5'); g.hero.energy = 12; g.hero.hp = 16; topPlot(g, 'PT32'); g.s.prompt = null;
  rig(g, [5, 5]); g.drawPlot({ endOfLevel: true }); g.run(); toAttack(g);
  rig(g, [6, 6, 6]); g.act('attack', { energy: 3 }); rig(g, [6, 6, 6]);
  while (g.s.combat && g.s.prompt?.type === 'attack') { rig(g, [6, 6, 6, 5, 5]); g.act('attack', { energy: 3 }); if (g.s.hero.energy < 3) break; }
  const h = start('c1', ALL); affliction(h, 'AF3'); topDungeon(h, 'D6', 'D10'); topEnemy(h, 'E2'); const hp = h.hero.hp; turn(h, 1);
  assert.equal(h.s.combat, null); assert.equal(h.hero.hp, hp - (0 + 1));
});

test('Moral y plots de campaña: Clériga concede el Broche y El Pozo respeta la tabla', () => {
  const g = start('c1', { campaign: 'warren' }); g.s.hero.morality = 4; g.s.hero.poison = 3; g.s.prompt = null; topPlot(g, 'PT12'); g.drawPlot({ clearing: true }); g.run();
  assert.equal(g.hero.poison, 0); assert.ok(g.hasCode('T16'));
  const h = start('c1', ALL); h.s.prompt = null; topPlot(h, 'PT21'); h.drawPlot({ clearing: true }); h.run(); rig(h, [6]); h.act('choose', { id: 'o1' });
  assert.equal(h.hero.poison, 0);
});
