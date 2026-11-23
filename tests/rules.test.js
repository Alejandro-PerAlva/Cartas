import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../iron_helm_game/js/engine/index.js';
import { rig, start, topDungeon, topEnemy, topLoot, topPlot, give, discardAll, turn, toAttack } from './helpers/scenario.js';

test('Escaramuza (parte 1): salud del enemigo = base + nivel + 2; el enemigo ataca primero (2d6, mayor − menor)', () => {
  const g = start('c1'); discardAll(g);
  topDungeon(g, 'D6', 'D10'); topEnemy(g, 'E7'); // Guerrero Orco: 5 de salud, daño 2
  rig(g, [5, 2]);                                 // dif 3 + daño 2 = 5
  turn(g, 1);
  const c = g.s.combat;
  toAttack(g);
  assert.equal(c.maxHp, 5 + 1 + 2);
  assert.equal(g.s.hero.hp, 14 - 5);
  assert.equal(g.s.prompt.type, 'attack');
});

test('Dobles: el enemigo falla su ataque inicial', () => {
  const g = start('c1'); discardAll(g);
  topDungeon(g, 'D6', 'D10'); topEnemy(g, 'E12'); rig(g, [4, 4]);
  turn(g, 1); toAttack(g);
  assert.equal(g.s.hero.hp, 14);
});

test('Armadura: el Broquel resta 1 al daño inicial; el Arquero No Muerto ignora tu armadura', () => {
  const g = start('c1'); // Fayon: Broquel + Vestiduras
  topDungeon(g, 'D6', 'D10'); topEnemy(g, 'E3'); rig(g, [6, 2]); // Skinkling: daño 0 → 4 − (broquel 1) = 3
  turn(g, 1); toAttack(g);
  assert.equal(g.s.hero.hp, 14 - 3);
  const h = start('c1'); topDungeon(h, 'D6', 'D10'); topEnemy(h, 'E6'); rig(h, [6, 2]); // Arquero: 4 + 2 = 6, sin defensa
  turn(h, 1); toAttack(h);
  assert.equal(h.s.hero.hp, 14 - 6);
});

test('Emboscada parte 1: iniciativa del héroe (sin daño inicial); salud + nivel', () => {
  const g = start('c1'); topDungeon(g, 'D1', 'D10'); topEnemy(g, 'E12'); rig(g, []);
  turn(g, 1); g.act('avoidEnemy', { id: 'pay_gold' }).ok; // no se puede pagar 3 de oro: Fayon solo tiene 3→ sí puede
});

test('Emboscada parte 2: +nivel al daño inicial y salud + nivel + 4', () => {
  const g = start('c1'); discardAll(g); topDungeon(g, 'D10', 'D1'); topEnemy(g, 'E7'); rig(g, [6, 1]); // dif 5 + 2 + nivel 1 = 8
  g.act('draw'); g.act('reveal', { slot: 0 }); g.act('decline'); toAttack(g);
  const c = g.s.combat;
  assert.ok(c);
  assert.equal(c.maxHp, 5 + 1 + 4);
  assert.equal(g.s.hero.hp, 14 - 8);
});

test('Ataque: 1d6 por ficha de energía + bonificación; mata y da oro y botín', () => {
  const g = start('c4'); // Moliclan: hacha + antorcha
  topDungeon(g, 'D6', 'D10'); topEnemy(g, 'E1'); topLoot(g, 'L5'); rig(g, [1, 3]); // goblin: dif 2 + 1 = 3 − 0
  turn(g, 1); toAttack(g);
  const gold0 = g.s.hero.gold; const energy0 = g.s.hero.energy;
  rig(g, [6]);
  g.act('attack', { energy: 1 });
  assert.equal(g.s.hero.energy, energy0 - 1);
  assert.equal(g.s.hero.gold, gold0 + 1);       // moneda del Goblin
  assert.equal(g.s.z.graveyard.length, 1);
  assert.ok(g.allItems().some((u) => g.def(u).code === 'L5')); // botín robado
});

test('Daga: los 6 se relanzan una vez; Espada Larga: cada 6 suma +1; Espada Ardiente: los 6 valen 7 (+3 contra fuego)', () => {
  const g = start('c1'); discardAll(g);
  give(g, 'T5'); topDungeon(g, 'D6', 'D10'); topEnemy(g, 'E10'); rig(g, [5, 5]); // Masa Devoradora: dobles → falla
  turn(g, 1); toAttack(g);
  rig(g, [6, 2, 4]);                              // dados 6,2 → el 6 se relanza a 4
  g.act('attack', { energy: 2 });
  assert.equal(g.s.combat.hp, 7 + 1 + 2 - (4 + 2));
  const h = start('c1'); discardAll(h); give(h, 'L14'); topDungeon(h, 'D6', 'D10'); topEnemy(h, 'E10'); rig(h, [5, 5]);
  turn(h, 1); toAttack(h);
  assert.equal(h.previewDamage([6, 6], 2), 6 + 1 + 6 + 1);
  assert.equal(h.previewDamage([3, 2], 2), 5);
  const f = start('c1'); discardAll(f); give(f, 'L7'); topDungeon(f, 'D6', 'D10'); topEnemy(f, 'E12'); rig(f, [5, 5]); // Troll: débil al fuego
  turn(f, 1); toAttack(f);
  assert.equal(f.previewDamage([6, 6], 2), 7 + 7 + 3);
  assert.equal(f.previewDamage([6, 1], 2), 7 + 1 + 3);
});

test('Fin de nivel: ración o 3 de daño; veneno +1 por cada 2; peón de nivel; trama', () => {
  const g = start('c1');
  g.s.hero.rations = 0; g.s.hero.poison = 5; g.s.hero.hp = 14; topPlot(g, 'PT4');
  // saltar a fin de nivel
  g.s.turn = 8; g.s.ctx = { turnActive: true }; g.s.z.dungeon = []; g.s.prompt = null; g.run();
  while (g.s.prompt?.type === 'choice') g.act('choose', { id: g.s.prompt.options.find((o) => !o.disabled).id });
  assert.equal(g.s.level, 2);
  assert.equal(g.s.hero.hp <= 14 - 3, true);
  assert.equal(g.s.hero.poison, 7);               // 5 + floor(5/2)
  assert.ok(g.s.eyes >= 1);                         // el pasadizo (1 ojo) + otra trama
});

test('Diez ojos: tras resolver la trama aparece el jefe; el jefe se decide por la debilidad más común', () => {
  const g = start('c1'); discardAll(g);
  g.s.eyes = 9; topPlot(g, 'PT8'); // 3 ojos → 12
  g.s.z.graveyard.push({ uid: g.mk(g.cat.byCode.get('E1').id), spent: false }, { uid: g.mk(g.cat.byCode.get('E4').id), spent: false }); // 2 × hielo
  g.drawPlot({ endOfLevel: true }); g.run();
  g.act('choose', { id: 'steal' });
  assert.equal(g.s.prompt.type, 'attack', JSON.stringify(g.s.prompt));
  assert.equal(g.def(g.s.combat.uid).code, 'B1'); // Merodeador (hielo)
});

test('Empate de debilidades: Fuego vence a No muerto, No muerto a Hielo, Hielo a Fuego', () => {
  const g = start('c1');
  const push = (code) => g.s.z.graveyard.push({ uid: g.mk(g.cat.byCode.get(code).id), spent: false });
  push('E3'); push('E2'); // fuego + no muerto → fuego
  assert.equal(g.def(g.determineBoss()).code, 'B2');
  const h = start('c1'); const ph = (code) => h.s.z.graveyard.push({ uid: h.mk(h.cat.byCode.get(code).id), spent: false });
  ph('E2'); ph('E1'); // no muerto + hielo → no muerto
  assert.equal(h.def(h.determineBoss()).code, 'B3');
});

test('Puntuación final: salud + energía + 3×oro + 2×enemigos + valor de objetos + nivel + moral', () => {
  const g = start('c1'); discardAll(g);
  g.s.hero.hp = 10; g.s.hero.energy = 5; g.s.hero.gold = 4; g.s.level = 3; g.s.hero.morality = -2;
  g.s.z.graveyard.push({ uid: g.mk('e1'), spent: false });
  give(g, 'T4'); // armadura de cuero: valor 3
  const sc = g.score();
  assert.equal(sc.total, 10 + 5 + 12 + 2 + 3 + 3 - 2);
});

test('Campaña Warren: retira Goblins, Orcos y Skinklings y sustituye el jefe por el Cíclope', () => {
  const g = start('c1', { campaign: 'warren' });
  const codes = g.s.z.enemies.map((u) => g.def(u).code);
  for (const c of ['E1', 'E7', 'E3']) assert.equal(codes.includes(c), false, c);
  assert.equal(codes.filter((c) => c === 'E13').length, 3);
  assert.equal(g.def(g.determineBoss()).code, 'B4');
});

test('Guardar y restaurar produce exactamente la misma partida', () => {
  const g = start('c3', { modules: ['loot_lore'] }, 99);
  const snap = g.snapshot();
  const h = Game.restore(snap);
  g.act('draw'); h.act('draw');
  assert.deepEqual(g.s.z.pair.map((u) => g.def(u).code), h.s.z.pair.map((u) => h.def(u).code));
});

test('Mercader: botín y pociones según el nivel; Valorar vende a 2 y compra a mitad de precio', () => {
  const g = start('c1'); g.s.level = 3; g.hero.gold = 10; g.s.hero.skills.push('s1');
  g.s.prompt = null; g.openMerchant(); g.run();
  assert.equal(g.s.prompt.type, 'merchant');
  assert.equal(g.s.prompt.stock.length, 4); // 2 botín + 2 pociones
  const u = g.s.prompt.stock[0];
  assert.equal(g.buyPrice(u), Math.ceil(g.def(u).price / 2));
  assert.equal(g.sellPrice(), 2);
});

test('Aprender habilidades: 3 enemigos de tu competencia, 5 de otra', () => {
  const g = start('c4'); // fuerza
  for (let i = 0; i < 5; i++) g.s.z.graveyard.push({ uid: g.mk('e1'), spent: false });
  assert.equal(g.skillCost('s9'), 3); assert.equal(g.skillCost('s6'), 5);
  g.s.prompt = { type: 'turn' };
  assert.equal(g.act('learn', { id: 's9' }).ok, true);
  assert.equal(g.unspentEnemies().length, 2);
  assert.equal(g.act('learn', { id: 's6' }).ok, false);
});
