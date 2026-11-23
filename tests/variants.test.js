/**
 * Reglas variantes de ANEMIA 4.0 (reglamento 4.0): `listVariants()`, `config.variants` → `s.variants` y un escenario con dados
 * trucados por cada una de las 15 variantes. Las cartas del modo se prueban en anemia.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, buildCatalog, listVariants, normalizeVariants, RNG } from '../iron_helm_game/js/engine/index.js';
import { rig, start, topDungeon, topEnemy, topLoot, give, discardAll, toAttack, fight, engage, plot, choose, treasure, runTask, resolveCard,
  codes, events, setEnv, hire, learn } from './helpers/scenario.js';
import { audit, play } from './helpers/bot.js';

const mods = (...m) => ({ modules: ['anemia', ...m] });
const V = (variants, extra = {}) => ({ modules: ['anemia'], variants, ...extra });
const ALL_IDS = ['diablillo', 'pueblo', 'motivacion', 'ceroEnergia', 'gastarXP', 'hogarSonado', 'sinRetorno', 'justoAntesDeMorir', 'enfrentarseParca',
  'entornosTematicos', 'muertesAtroces', 'lugaresRetiro', 'encantamientos', 'momentosPaz', 'metalInmortal'];
/** crea una partida con los primeros d6 trucados (los de la preparación: pueblo, motivación, rumbo) */
function createRigged(heroId, config, dice, seed = 5) {
  const orig = RNG.prototype.die; const q = [...dice];
  RNG.prototype.die = function die(sides = 6) { return q.length ? q.shift() : orig.call(this, sides); };
  try { return Game.create({ heroId, config, seed }); } finally { RNG.prototype.die = orig; }
}
function kill(g) { g.s.combat.hp = 1; g.act('attack', { energy: 0 }); treasure(g, 'gold'); }
function bossNow(g, hero = null) { g.q = []; g.s.prompt = null; g.s.eyes = 10; g._beginBossSequence('prueba'); g.run(); while (g.s.prompt?.type === 'divine') g.act('ack'); return hero; }

/* ====================================================================================== contrato */
test('listVariants(): 15 variantes con id, nombre, resumen, viñetas, default:false, needsPack y grupo', () => {
  const list = listVariants();
  assert.deepEqual(list.map((v) => v.id).sort(), [...ALL_IDS].sort());
  for (const v of list) {
    for (const k of ['id', 'name', 'blurb', 'rules', 'default', 'needsPack', 'group', 'groupName', 'needsModules', 'exclusive', 'forcesHero']) assert.ok(k in v, `${v.id}.${k}`);
    assert.equal(v.default, false); assert.ok(v.rules.length > 0 && v.blurb.length > 0 && v.name.length > 0); assert.ok(v.needsPack === null || v.needsPack === 'anemia');
  }
  const by = Object.fromEntries(list.map((v) => [v.id, v]));
  assert.equal(by.enfrentarseParca.needsPack, 'anemia'); assert.equal(by.metalInmortal.needsPack, 'anemia'); assert.equal(by.momentosPaz.needsPack, 'anemia');
  for (const id of ['diablillo', 'pueblo', 'motivacion', 'ceroEnergia', 'gastarXP', 'hogarSonado', 'sinRetorno', 'justoAntesDeMorir', 'entornosTematicos', 'muertesAtroces', 'lugaresRetiro', 'encantamientos'])
    assert.equal(by[id].needsPack, null, id);
  assert.deepEqual(by.entornosTematicos.needsModules, ['realms']); assert.deepEqual(by.hogarSonado.exclusive, ['sinRetorno']); assert.equal(by.metalInmortal.forcesHero, 'anc1');
  assert.ok(new Set(list.map((v) => v.group)).size >= 5);
  list[0].rules.push('x'); assert.notEqual(listVariants()[0].rules.length, list[0].rules.length, 'cada llamada devuelve copias');
});
test('Game.create({ config: { variants } }): se guardan en s.variants (todas las ids, true/false) y en la configuración; sin variantes todo es false', () => {
  const g = Game.create({ heroId: 'c1', config: { variants: { diablillo: true, pueblo: false } }, seed: 3 });
  assert.equal(g.s.variants.diablillo, true); assert.equal(g.s.variants.pueblo, false); assert.deepEqual(Object.keys(g.s.variants).sort(), [...ALL_IDS].sort());
  assert.deepEqual(g.s.config.variants, { diablillo: true }); assert.equal(g.cat.variants.diablillo, true);
  const h = Game.create({ heroId: 'c1', config: {}, seed: 3 }); assert.ok(Object.values(h.s.variants).every((x) => x === false)); assert.equal('variants' in h.s.config, false);
  const k = Game.create({ heroId: 'c1', config: { variants: {} }, seed: 3 }); assert.equal('variants' in k.s.config, false);
  const r = Game.restore(g.snapshot()); assert.deepEqual(r.s.variants, g.s.variants);
});
test('config.variants: se rechazan ids desconocidos, paquetes o módulos que faltan y variantes incompatibles', () => {
  assert.throws(() => Game.create({ heroId: 'c1', config: { variants: { inventada: true } }, seed: 1 }), /Variante desconocida: inventada/);
  assert.throws(() => Game.create({ heroId: 'c1', config: { variants: { enfrentarseParca: true } }, seed: 1 }), /necesita el paquete anemia/);
  assert.throws(() => Game.create({ heroId: 'c1', config: V({ entornosTematicos: true }), seed: 1 }), /necesita el módulo realms/);
  assert.throws(() => Game.create({ heroId: 'c1', config: V({ momentosPaz: true }), seed: 1 }), /necesita el módulo troll/);
  assert.throws(() => Game.create({ heroId: 'c1', config: V({ hogarSonado: true, sinRetorno: true }), seed: 1 }), /incompatibles/);
  assert.throws(() => Game.create({ heroId: 'c1', config: V({ metalInmortal: true }), seed: 1 }), /Gene Slash/);
  assert.throws(() => normalizeVariants({ nada: true }, []), /desconocida/);
  assert.doesNotThrow(() => Game.create({ heroId: 'c1', config: { variants: { diablillo: false, enfrentarseParca: false } }, seed: 1 }), 'false no exige nada');
  assert.doesNotThrow(() => buildCatalog({ variants: { pueblo: true } }), 'las variantes sin cartas de ANEMIA funcionan sin el modo');
});
test('Las variantes que no dependen de cartas de ANEMIA se pueden jugar sin el modo (base, campaña y otros módulos)', () => {
  const free = { diablillo: true, pueblo: true, motivacion: true, ceroEnergia: true, gastarXP: true, hogarSonado: true, justoAntesDeMorir: true, muertesAtroces: true, lugaresRetiro: true, encantamientos: true };
  for (const cfg of [{}, { campaign: 'warren' }, { modules: ['troll', 'realms'] }]) {
    for (let seed = 1; seed <= 8; seed++) { const g = Game.create({ heroId: 'c1', config: { ...cfg, variants: free }, seed }); const r = play(g, { seed, maxSteps: 6000 }); assert.ok(r.over); assert.equal(audit(g).problems.length, 0); }
  }
});

/* ====================================================================================== Nuevas reglas */
test('Diablillo: empieza sobre el Botín y avanza una posición al robar cada par (Botín → Pociones → fuera); quita 1 carta de ese mazo', () => {
  const g = start('c1', V({ diablillo: true })); assert.equal(g.s.imp, 'loot');
  const ev = events(g); g.act('draw'); assert.equal(g.s.imp, 'potions'); assert.ok(ev.some((e) => e.t === 'imp' && e.pos === 'potions'));
  const n = g.allItems().length;
  runTask(g, function t() { this.gainPotion(1); }); assert.equal(g.allItems().length, n, 'el Diablillo está sobre las pociones: 0 cartas'); runTask(g, function t() { this.gainLoot(1); }); assert.equal(g.allItems().length, n + 1, 'sobre pociones sí robas botín');
  g.q = []; g.s.prompt = null; g.s.ctx = {}; g.act; g.s.z.pair = [null, null]; runTask(g, function t() { this.drawPair(); }); assert.equal(g.s.imp, 'out');
  const m = g.allItems().length; runTask(g, function t() { this.gainPotion(1); }); runTask(g, function t() { this.gainLoot(1); }); assert.equal(g.allItems().length, m + 2, 'fuera de ambos: sin penalización');
  runTask(g, function t() { this.drawPair(); }); assert.equal(g.s.imp, 'loot'); const k = g.allItems().length; runTask(g, function t() { this.gainLoot(2); }); assert.equal(g.allItems().length, k + 1, '2 − 1 = 1 carta de botín');
});
test('Diablillo: afecta también a los tesoros de enemigos, tramas y mazmorra (loot/potion/pickLoot/lootSearch/pickPotionFromDeck)', () => {
  const g = start('c1', V({ diablillo: true })); discardAll(g); g.s.imp = 'loot'; itemsOnlyLoot(g);
  runTask(g, function t() { this._op(['pickLoot', 3], null); }); assert.equal(g.s.prompt.type, 'turn'); // 1 − 1 = 0: ni siquiera se ofrece
  g.s.imp = 'potions'; runTask(g, function t() { this._op(['pickPotionFromDeck'], null); }); assert.equal(g.s.prompt.type, 'turn');
  g.s.imp = 'out'; runTask(g, function t() { this._op(['pickPotionFromDeck'], null); }); assert.equal(g.s.prompt.type, 'pickCards');
  const h = start('c1', V({ diablillo: true })); discardAll(h); h.s.imp = 'loot'; itemsOnlyLoot(h); resolveCard(h, 'D2', 2); assert.equal(h.allItems().length, 1, 'Tesoro 2: botín (0 por el Diablillo) + poción');
});
const itemsOnlyLoot = (g) => { g.s.z.loot = g.s.z.loot.filter((u) => g.def(u).kind === 'item'); };
test('Pueblo de Origen: un d6 al empezar da +1 de salud, energía, carga, ración, oro o bendición (Thrawdin…Mucktown)', () => {
  const base = start('c1', {}, 5); const b = { hp: base.hero.hp, mhp: base.maxHp(), en: base.hero.energy, w: base.maxWeight(), r: base.hero.rations, gold: base.hero.gold };
  const cfg = { variants: { pueblo: true } };
  const t = (d) => createRigged('c1', cfg, [d]);
  let g = t(1); assert.equal(g.s.origin.town, 'Thrawdin'); assert.equal(g.hero.hp, b.hp + 1); assert.equal(g.maxHp(), b.mhp + 1);
  g = t(2); assert.equal(g.s.origin.town, 'Victorsville'); assert.equal(g.hero.energy, b.en + 1);
  g = t(3); assert.equal(g.s.origin.town, 'Stubben'); assert.equal(g.maxWeight(), b.w + 1);
  g = t(4); assert.equal(g.s.origin.town, 'Vandale'); assert.equal(g.hero.rations, b.r + 1);
  g = t(5); assert.equal(g.s.origin.town, 'Appleton'); assert.equal(g.hero.gold, b.gold + 1);
  g = t(6); assert.equal(g.s.origin.town, 'Mucktown'); assert.equal(g.hero.blessings.length, 1);
  assert.equal(g.s.origin.roll, 6); assert.equal(g.s.prompt.type, 'setup'); assert.equal(g.s.prompt.intro.origin.town, 'Mucktown');
  assert.ok(g.s.log.some((l) => l.msg.includes('Mucktown')));
});
test('Motivación: un d6 al empezar cuenta por qué vuelves a la aventura (solo narrativa) y llega en el prompt "setup"', () => {
  const texts = new Set();
  for (let d = 1; d <= 6; d++) { const g = createRigged('c1', { variants: { motivacion: true } }, [d]); assert.equal(g.s.motivation.roll, d); texts.add(g.s.motivation.text); assert.equal(g.s.prompt.intro.motivation.text, g.s.motivation.text); }
  assert.equal(texts.size, 6); assert.match(createRigged('c1', { variants: { motivacion: true } }, [2]).s.motivation.text, /tabernero/);
  const g = start('c1', { variants: { motivacion: true } }); const h = start('c1', {}); assert.equal(g.hero.hp, h.hero.hp); assert.equal(g.hero.gold, h.hero.gold);
  const k = start('c1', {}); assert.equal(k.s.motivation, undefined);
});
test('Cero Energía: el puñetazo exige un d6: 1 fallas y −1 de salud · 2-3 impactas y −1 de salud · 4 fallas · 5-6 impactas', () => {
  const run = (d) => { const g = start('c1', { variants: { ceroEnergia: true } }); discardAll(g); rig(g, [3, 3]); fight(g, 'E12', { hpBonus: 10 }); const hp = g.s.combat.hp; const h0 = g.hero.hp; rig(g, [d, 3, 3]); g.act('attack', { energy: 0 }); return { dmg: hp - g.s.combat.hp, lost: h0 - g.hero.hp }; };
  assert.deepEqual(run(1), { dmg: 0, lost: 1 }); assert.deepEqual(run(2), { dmg: 1, lost: 1 }); assert.deepEqual(run(3), { dmg: 1, lost: 1 });
  assert.deepEqual(run(4), { dmg: 0, lost: 0 }); assert.deepEqual(run(5), { dmg: 1, lost: 0 }); assert.deepEqual(run(6), { dmg: 1, lost: 0 });
  const g = start('c1', {}); discardAll(g); rig(g, [3, 3]); fight(g, 'E12', { hpBonus: 10 }); const hp = g.s.combat.hp; rig(g, [1, 3, 3]); g.act('attack', { energy: 0 }); assert.equal(hp - g.s.combat.hp, 1, 'sin la variante el puñetazo siempre impacta');
  const h = start('c1', { variants: { ceroEnergia: true } }); discardAll(h); give(h, 'T36'); rig(h, [3, 3]); fight(h, 'E12', { hpBonus: 10 }); const k = h.s.combat.hp; rig(h, [6, 3, 3]); h.act('attack', { energy: 0 }); assert.equal(k - h.s.combat.hp, 2, 'Dagas de Puño: 2 si impactas');
  const m = start('c1', { variants: { ceroEnergia: true } }); discardAll(m); give(m, 'T5'); rig(m, [3, 3]); fight(m, 'E12', { hpBonus: 10 }); const q = m.s.combat.hp; rig(m, [4, 5, 3, 3]); m.act('attack', { energy: 1 }); assert.equal(q - m.s.combat.hp, 4, 'atacar con energía no tira la tabla');
});
test('Gastar Puntos de Experiencia: 7 enemigos derrotados sin gastar → +1 salud máxima o +1 energía máxima', () => {
  const g = start('c1', { variants: { gastarXP: true } }); const dead = () => g.s.z.graveyard.push({ uid: g.mk(g.cat.byCode.get('E1').id), spent: false });
  for (let i = 0; i < 6; i++) dead(); assert.equal(g.act('spendXp', { stat: 'hp' }).ok, false); dead();
  assert.equal(g.act('spendXp', { stat: 'oro' }).ok, false);
  const hp = g.hero.hp; const mx = g.maxHp(); assert.equal(g.act('spendXp', { stat: 'hp' }).ok, true);
  assert.equal(g.maxHp(), mx + 1); assert.equal(g.hero.hp, hp + 1); assert.equal(g.unspentEnemies().length, 0); assert.equal(g.s.prompt.type, 'turn');
  for (let i = 0; i < 7; i++) dead(); const en = g.hero.energy; g.act('spendXp', { stat: 'energy' }); assert.equal(g.hero.energy, en + 1); assert.equal(g.maxEnergy(), 15);
  g.hero.energy = 14; for (let i = 0; i < 7; i++) dead(); g.act('spendXp', { stat: 'energy' }); assert.equal(g.hero.energy, 15); assert.equal(g.maxEnergy(), 16);
  const h = start('c1', {}); for (let i = 0; i < 7; i++) h.s.z.graveyard.push({ uid: h.mk(h.cat.byCode.get('E1').id), spent: false }); assert.equal(h.act('spendXp', { stat: 'hp' }).ok, false);
  const k = start('c1', { variants: { gastarXP: true } }); for (let i = 0; i < 7; i++) k.s.z.graveyard.push({ uid: k.mk(k.cat.byCode.get('E1').id), spent: false });
  assert.equal(k.act('spendXp', { stat: 'hp' }).ok, true); assert.equal(k.s.z.graveyard.length, 7, 'las cartas gastadas siguen contando para la puntuación');
});

/* ====================================================================================== Desafíos */
test('Hogar Soñado: con 30 o más de oro al aparecer el jefe puedes comprar la mansión y ganar sin combatir', () => {
  const g = start('c1', { variants: { hogarSonado: true } }); g.hero.gold = 31; bossNow(g);
  assert.equal(g.s.prompt.type, 'choice'); assert.deepEqual(g.s.prompt.options.map((o) => o.id), ['buy', 'fight']);
  g.act('choose', { id: 'buy' }); assert.equal(g.s.over.result, 'victory'); assert.equal(g.s.over.ending, 'mansion'); assert.equal(g.hero.gold, 1);
  assert.ok(['Mansión', 'Fortaleza'].includes(g.s.over.score.rank)); assert.equal(g.s.combat, null);
  const h = start('c1', { variants: { hogarSonado: true } }); h.hero.gold = 40; bossNow(h); h.act('choose', { id: 'fight' }); assert.equal(h.hero.gold, 40); assert.notEqual(h.s.prompt.type, 'choice'); assert.equal(h.s.over, null);
  const k = start('c1', { variants: { hogarSonado: true } }); k.hero.gold = 29; bossNow(k); assert.notEqual(k.s.prompt.type, 'choice'); assert.equal(k.s.over, null);
  const m = start('c1', {}); m.hero.gold = 50; bossNow(m); assert.notEqual(m.s.prompt.type, 'choice', 'sin la variante no hay mansión');
});
test('Sin Retorno: tres aventuras seguidas (niveles 1, 2 y 3): base → campaña de nivel 2 → campaña de nivel 3, sin Posada entre ellas', () => {
  const a = Game.create({ heroId: 'c1', config: { variants: { sinRetorno: true } }, seed: 11 });
  assert.deepEqual(a.s.chain.adventures.map((x) => x.level), [1, 2, 3]); assert.equal(a.s.chain.adventures[0].campaign, null); assert.ok(!a.s.config.campaign);
  assert.ok(['warren', 'galnok', 'throne'].includes(a.s.chain.adventures[1].campaign)); assert.ok(['blackened', 'crystal', 'malicia'].includes(a.s.chain.adventures[2].campaign));
  const b = Game.create({ heroId: 'c1', config: { campaign: 'crystal', variants: { sinRetorno: true } }, seed: 11 }); assert.equal(b.s.chain.adventures[2].campaign, 'crystal');
  assert.equal(Game.create({ heroId: 'c1', config: { campaign: 'warren', variants: { sinRetorno: true } }, seed: 9 }).s.chain.adventures[1].campaign, 'warren');
  assert.throws(() => Game.create({ heroId: 'c1', config: { campaign: 'spire', variants: { sinRetorno: true } }, seed: 1 }), /nivel 2 o 3/);
  assert.deepEqual(Game.create({ heroId: 'c1', config: { variants: { sinRetorno: true } }, seed: 11 }).s.chain, a.s.chain, 'el plan depende solo de la semilla');
});
test('Sin Retorno: al derrotar al jefe empieza la siguiente aventura conservando héroe, objetos y enemigos derrotados; solo el último jefe da la victoria', () => {
  const g = start('c1', { variants: { sinRetorno: true } }, 11); const camp2 = g.s.chain.adventures[1].campaign;
  const sword = give(g, 'L14'); g.hero.gold = 7; g.hero.hp = 9; g.hero.morality = 2; learn(g, 'S6');
  g.s.z.graveyard.push({ uid: g.mk(g.cat.byCode.get('E1').id), spent: false });
  const dead = g.s.z.graveyard[0].uid; const tr = g.s.z.trappings.length;
  bossNow(g); g.s.combat.hp = 1; g.act('attack', { energy: 0 }); treasure(g, 'gold'); while (g.s.prompt?.type === 'choice' && g.s.prompt.treasure) treasure(g, 'gold');
  assert.equal(g.s.over, null); assert.equal(g.s.chain.index, 1); assert.equal(g.s.config.campaign, camp2); assert.equal(g.cat.adventureLevel, 2);
  assert.equal(g.s.level, 1); assert.equal(g.s.eyes, 0); assert.equal(g.s.bossStarted, false); assert.equal(g.s.prompt.type, 'turn', 'sin tienda ni esbirros: se sigue adelante');
  assert.ok(g.allItems().includes(sword)); assert.equal(g.hero.morality, 2); assert.ok(g.hero.hp > 0); assert.ok(g.hasSkill('S6'));
  assert.ok(g.s.z.graveyard.some((e) => e.uid === dead)); void tr;
  assert.equal(audit(g).problems.length, 0); assert.equal(audit(g).orphans, 0);
  assert.ok(g.s.z.enemies.every((u) => g.def(u).key !== g.def(sword).key), 'no se duplica lo que llevas');
  assert.equal(g.s.z.environments.length, 0); assert.equal(g.s.z.mercenaries.length, 0);
});
test('Sin Retorno: tres jefes derrotados = victoria con +25 de oro en el recuento (×3 puntos); partidas completas con auditoría', () => {
  const g = start('c1', { variants: { sinRetorno: true } }, 4); g.hero.gold = 0; g.s.godMode = true;
  for (let i = 0; i < 3; i++) {
    assert.equal(g.s.chain.index, i); bossNow(g); g.s.combat.hp = 1; g.act('attack', { energy: 0 }); while (g.s.prompt?.type === 'choice' && g.s.prompt.treasure) treasure(g, 'gold');
    if (i < 2) { assert.equal(g.s.over, null); assert.equal(audit(g).problems.length, 0); }
  }
  assert.equal(g.s.over.result, 'victory'); assert.equal(g.s.over.score.parts.gold, (g.hero.gold + 25) * 3);
  for (let seed = 1; seed <= 12; seed++) {
    const h = Game.create({ heroId: 'c1', config: { modules: ['loot_lore', 'beasts'], variants: { sinRetorno: true } }, seed, godMode: true }); const r = play(h, { seed, maxSteps: 12000 });
    assert.ok(r.over); assert.equal(audit(h).problems.length, 0, `semilla ${seed}`);
    if (r.over.result === 'victory') assert.equal(h.s.chain.index, 2);
  }
});
test('Sin Retorno: la partida se puede guardar y restaurar en mitad de la cadena (la campaña vigente va en la configuración)', () => {
  const g = start('c1', { variants: { sinRetorno: true } }, 11); bossNow(g); g.s.combat.hp = 1; g.act('attack', { energy: 0 }); while (g.s.prompt?.type === 'choice' && g.s.prompt.treasure) treasure(g, 'gold');
  assert.ok(g.canSave()); const h = Game.restore(g.snapshot()); assert.deepEqual(JSON.parse(JSON.stringify(h.s)), JSON.parse(JSON.stringify(g.s)));
  assert.equal(h.cat.cfg.campaign, g.s.chain.adventures[1].campaign); g.act('draw'); h.act('draw'); assert.deepEqual(g.s.z.pair, h.s.z.pair);
});

/* ====================================================================================== Mirar a los ojos de la Muerte */
test('Justo Antes de Morir: si un ataque te mataría puedes perder el uso de tu otra mano (una vez por partida) en vez de esa salud', () => {
  const g = start('c1', { variants: { justoAntesDeMorir: true } }); discardAll(g); const sh = give(g, 'T11'); give(g, 'T5'); g.hero.hp = 4; assert.equal(g.s.eq.OM, sh);
  rig(g, [6, 1]); engage(g, 'E10'); assert.equal(g.s.prompt.type, 'choice'); assert.deepEqual(g.s.prompt.options.map((o) => o.id), ['arm', 'die']);
  g.act('choose', { id: 'arm' }); toAttack(g);
  assert.equal(g.hero.hp, 4); assert.equal(g.hero.armLost, true); assert.equal(g.s.eq.OM, null); assert.ok(g.s.z.hand.includes(sh)); assert.equal(g.s.over, null);
  const inCombat = g.s.combat; g.s.combat = null; // fuera de combate se puede cambiar de equipo
  assert.throws(() => g.equip(sh), /otra mano/); const two = give(g, 'L12'); assert.equal(g.s.eq.MP !== two, true, 'no se equipa solo un arma a dos manos'); assert.ok(g.s.z.hand.includes(two));
  assert.equal(g._fitsOffHand(g.def(g.mk(g.cat.byCode.get('T5').id))), false); assert.throws(() => g.equip(two), /otra mano/); g.s.combat = inCombat;
  g.s.combat.hp = 99; rig(g, [6, 1]); g.act('attack', { energy: 0 }); assert.equal(g.s.over.result, 'defeat', 'solo una vez por partida');
});
test('Justo Antes de Morir: puedes rehusar y morir; los ataques que no te matan no preguntan; un arma a dos manos queda en la mochila', () => {
  const g = start('c1', { variants: { justoAntesDeMorir: true } }); discardAll(g); g.hero.hp = 4; rig(g, [6, 1]); engage(g, 'E10'); g.act('choose', { id: 'die' }); assert.equal(g.s.over.result, 'defeat');
  const h = start('c1', { variants: { justoAntesDeMorir: true } }); discardAll(h); h.hero.hp = 9; rig(h, [6, 1]); assert.equal(engage(h, 'E10').type, 'attack'); assert.equal(h.hero.hp, 9 - 8);
  const k = start('c1', { variants: { justoAntesDeMorir: true } }); discardAll(k); const w = give(k, 'L12'); assert.equal(k.s.eq.MP, w); k.hero.hp = 3; rig(k, [6, 1]); engage(k, 'E10'); k.act('choose', { id: 'arm' });
  assert.equal(k.s.eq.MP, null); assert.ok(k.s.z.hand.includes(w));
  const m = start('c1', {}); discardAll(m); m.hero.hp = 3; rig(m, [6, 1]); engage(m, 'E10'); assert.equal(m.s.over.result, 'defeat', 'sin la variante mueres');
});
function dieNow(g, reason = 'prueba') { g.hero.hp = 0; g.checkDeath(); }
test('Enfrentarse a La Parca: al morir se ofrece combatir; rehusar termina la partida', () => {
  const g = start('c1', V({ enfrentarseParca: true })); dieNow(g); assert.equal(g.s.over, null); assert.equal(g.s.prompt.type, 'choice'); assert.deepEqual(g.s.prompt.options.map((o) => o.id), ['fight', 'accept']);
  g.act('choose', { id: 'accept' }); assert.equal(g.s.over.result, 'defeat');
  const h = start('c1', {}); dieNow(h); assert.equal(h.s.over.result, 'defeat', 'sin la variante mueres sin más');
});
test('Enfrentarse a La Parca: solo conservas las armas de las manos; salud y energía al máximo; sin bendiciones, habilidades ni esbirros', () => {
  const g = start('c1', V({ enfrentarseParca: true }, { modules: ['anemia', 'troll'] })); const sw = give(g, 'L14'); const sh = g.s.eq.OM; const vest = g.s.eq.CP; give(g, 'P1'); give(g, 'L29'); learn(g, 'S6');
  g.gain('blessing', 2); g.hero.gold = 9; g.hero.rations = 5; g.hero.poison = 2; hire(g, 'ANM1'); dieNow(g);
  rig(g, [3, 3]); g.act('choose', { id: 'fight' }); toAttack(g);
  assert.equal(g.def(g.s.combat.uid).name, 'La Parca'); assert.equal(g.s.combat.maxHp, 24); assert.equal(g.s.combat.boss, false);
  assert.equal(g.hero.hp, g.maxHp()); assert.equal(g.hero.energy, g.maxEnergy()); assert.equal(g.hero.poison, 0);
  assert.deepEqual(g.allItems().sort(), [g.s.eq.MP, sh].filter(Boolean).sort()); assert.equal(g.s.eq.CP, null); assert.equal(vest !== null, true);
  assert.equal(g.hero.skills.length, 0); assert.equal(g.hero.blessings.length, 0); assert.equal(g.s.mercs.length, 0); assert.equal(g.hasSkill('S6'), false);
  assert.equal(audit(g).problems.length, 0); assert.equal(audit(g).orphans, 0); void sw;
});
test('Enfrentarse a La Parca: si la derrotas regresas con tus armas, habilidades y bendiciones y con el oro y las raciones iniciales; el combate interrumpido sigue', () => {
  const g = start('c1', V({ enfrentarseParca: true }, { modules: ['anemia', 'troll'] })); discardAll(g); const sw = give(g, 'L14'); learn(g, 'S6'); g.gain('blessing', 2); g.hero.gold = 9; g.hero.rations = 5; hire(g, 'ANM1');
  rig(g, [6, 1]); fight(g, 'E12', { hpBonus: 20 }); const enemy = g.s.combat.uid; const ehp = g.s.combat.hp; g.hero.hp = 1; g.s.combat.round = 1;
  g.hero.hp = 0; g.checkDeath(); g.act('choose', { id: 'fight' }); toAttack(g);
  g.s.combat.hp = 1; rig(g, [1]); g.act('attack', { energy: 0 }); // derrotas a La Parca (sin botín)
  assert.equal(g.s.over, null); assert.equal(g.hero.skills.length, 2); assert.ok(g.hasSkill('S6')); assert.equal(g.hero.blessings.length, 2); assert.equal(g.hero.gold, g.hero.initial.gold); assert.equal(g.hero.rations, g.hero.initial.rations);
  assert.equal(g.s.mercs.length, 1); assert.equal(g.s.eq.MP, sw); assert.equal(g.s.afterlife, null); assert.equal(g.s.parca, null);
  assert.equal(g.s.combat.uid, enemy, 'vuelves a tu combate original'); assert.equal(g.s.combat.hp, ehp); assert.equal(g.s.prompt.type, 'attack');
  assert.equal(g.s.stats.kills >= 1, true); assert.equal(g.s.z.graveyard.length, 0, 'La Parca no cuenta como enemigo derrotado'); assert.equal(audit(g).problems.length, 0); assert.equal(audit(g).orphans, 0);
});
test('Enfrentarse a La Parca: si ella te derrota la aventura termina para siempre; vale también para la Bomba de Dios', () => {
  const g = start('c1', V({ enfrentarseParca: true })); dieNow(g); rig(g, [3, 3]); g.act('choose', { id: 'fight' }); toAttack(g); g.hero.hp = 0; g.checkDeath(); assert.equal(g.s.over.result, 'defeat');
  const h = start('c1', V({ enfrentarseParca: true })); discardAll(h); const b = give(h, 'ANT3'); rig(h, [3, 3]); fight(h, 'ANE12'); h.act('use', { uid: b });
  assert.equal(h.s.prompt.type, 'choice'); assert.equal(h.s.over, null); h.act('choose', { id: 'fight' }); toAttack(h); h.s.combat.hp = 1; rig(h, [1]); h.act('attack', { energy: 0 });
  treasure(h, 'gold'); assert.equal(h.s.over, null); assert.equal(h.s.combat, null, 'la bomba se llevó al enemigo original'); assert.equal(h.s.stats.kills, 2); assert.equal(audit(h).problems.length, 0);
});
test('Enfrentarse a La Parca: morir por veneno o hambre (sin combate) también la ofrece y el flujo continúa después', () => {
  const g = start('c1', V({ enfrentarseParca: true })); g.hero.poison = 20; g.checkDeath(); assert.equal(g.s.prompt.type, 'choice');
  rig(g, [3, 3]); g.act('choose', { id: 'fight' }); toAttack(g); assert.equal(g.hero.poison, 0); g.s.combat.hp = 1; rig(g, [1]); g.act('attack', { energy: 0 }); assert.equal(g.s.prompt.type, 'turn'); assert.equal(g.s.over, null);
});

/* ====================================================================================== Entornos Temáticos */
const ENVS = { 1: ['El Altiplano', 'El Glaciar', 'La Sombra'], 2: ['La Ciénaga', 'El Santuario', 'Las Miradas'], 3: ['Túnel Abandonado', 'Las Catacumbas', 'El Yermo'], 4: ['La Niebla', null, 'La Ciudad Caída'] };
test('Entornos Temáticos: un d4 al empezar fija el rumbo y el entorno de los niveles 1 a 3 sale de la tabla (Norte/Este/Sur/Oeste)', () => {
  for (const d of [1, 2, 3, 4]) {
    const g = createRigged('c1', { modules: ['anemia', 'realms'], variants: { entornosTematicos: true } }, [d]); assert.equal(g.s.direction.roll, d); assert.equal(g.s.direction.name, ['Norte', 'Este', 'Sur', 'Oeste'][d - 1]);
    g.act('begin'); assert.equal(g.def(g.s.env).name, ENVS[d][0], `rumbo ${d}, nivel 1`);
    for (const lvl of [2, 3]) { g.s.level = lvl; runTask(g, function t() { this._drawEnvironment(); }); if (ENVS[d][lvl - 1]) assert.equal(g.def(g.s.env).name, ENVS[d][lvl - 1], `rumbo ${d}, nivel ${lvl}`); else assert.ok(['El Reino Arborícola', 'Cielo Resquebrajado'].includes(g.def(g.s.env).name)); }
  }
  const o = createRigged('c1', { modules: ['anemia', 'realms'], variants: { entornosTematicos: true } }, [4]); o.act('begin'); o.s.level = 2; rig(o, [2]); runTask(o, function t() { this._drawEnvironment(); }); assert.equal(o.def(o.s.env).name, 'El Reino Arborícola');
  o.s.level = 2; rig(o, [5]); runTask(o, function t() { this._drawEnvironment(); }); assert.equal(o.def(o.s.env).name, 'Cielo Resquebrajado');
});
test('Entornos Temáticos: los niveles 4 y 5 (que el libro no define) roban un entorno al azar; sin ANEMIA el Oeste también cae en el azar', () => {
  const g = createRigged('c1', { modules: ['anemia', 'realms'], variants: { entornosTematicos: true } }, [1]); g.act('begin'); g.s.level = 4; runTask(g, function t() { this._drawEnvironment(); }); assert.ok(g.s.env);
  assert.ok(g.s.log.some((l) => l.msg.includes('no define el nivel 4')));
  const h = createRigged('c1', { modules: ['realms'], variants: { entornosTematicos: true } }, [4]); h.act('begin'); assert.ok(h.s.env, 'entorno al azar si falta la carta del Oeste');
  const k = Game.create({ heroId: 'c1', config: { modules: ['anemia', 'realms'] }, seed: 1 }); assert.equal(k.s.direction, undefined);
  const set = new Set(); for (let seed = 1; seed <= 40; seed++) { const x = Game.create({ heroId: 'c1', config: { modules: ['anemia', 'realms'], variants: { entornosTematicos: true } }, seed }); set.add(x.s.direction.name); } assert.equal(set.size, 4);
});

/* ====================================================================================== epílogos y narrativa */
test('Muertes Atroces: si mueres ante un jefe final o un minijefe se adjunta su epílogo (s.over.epilogue y evento gameover)', () => {
  const g = start('c1', V({ muertesAtroces: true })); discardAll(g); const ev = events(g); g.hero.hp = 1; rig(g, [6, 1]); engage(g, 'B3', { boss: true, hpBonus: 0, source: 'boss' });
  assert.equal(g.s.over.result, 'defeat'); assert.equal(g.s.over.epilogue.name, 'Lich'); assert.match(g.s.over.epilogue.text, /El Lich levanta su cayado/); assert.equal(ev.find((e) => e.t === 'gameover').epilogue.name, 'Lich');
  const h = start('c1', V({ muertesAtroces: true })); discardAll(h); h.hero.hp = 1; rig(h, [6, 1]); engage(h, 'ANPT16', { plot: true, hpBonus: 0, source: 'plot' }); assert.equal(h.s.over.epilogue.name, 'Unicornio Bicéfalo');
  const k = start('c1', V({ muertesAtroces: true })); discardAll(k); k.hero.hp = 1; rig(k, [6, 1]); engage(k, 'E10'); assert.equal(k.s.over.epilogue, undefined, 'un enemigo normal no tiene epílogo');
  const m = start('c1', {}); discardAll(m); m.hero.hp = 1; rig(m, [6, 1]); engage(m, 'B3', { boss: true, hpBonus: 0, source: 'boss' }); assert.equal(m.s.over.epilogue, undefined);
  const n = start('c1', V({ muertesAtroces: true })); n.hero.poison = 30; n.checkDeath(); assert.equal(n.s.over.epilogue, undefined, 'morir sin combate no tiene epílogo');
});
test('Muertes Atroces: hay epílogo para los 3 jefes base, los 7 de campaña, los 6 de ANEMIA y los 5 minijefes', () => {
  const names = ['Naga', 'Lich', 'Merodeador', 'Cíclope', 'Madre Colmena', 'Galnok', 'Dragón de Cristal', 'Elemental de Fuego', 'Malicia', 'Zogar', 'Malnok', 'Tzxefytd', 'El Rey de los Muertos', 'El Reptiliano',
    'Gigante de los Hielos', 'Samurái de las Sombras', 'Rey Goblin', 'Caballero de la Muerte', 'Dreadtrodón', 'Tundra', 'Unicornio Bicéfalo'];
  const all = buildCatalog({ modules: ['anemia', 'fanny_pack', 'beasts'], campaign: null }); const bosses = [...all.defs.filter((d) => d.kind === 'boss' || d.miniboss)];
  const camp = ['warren', 'blackened', 'galnok', 'crystal', 'throne', 'malicia', 'spire'].flatMap((c) => buildCatalog({ campaign: c }).defs.filter((d) => d.kind === 'boss'));
  for (const d of [...bosses, ...camp].filter((x) => x.name !== 'La Parca' && x.name !== 'El Señor del Tiempo')) {
    const g = start('c1', V({ muertesAtroces: true }, { modules: ['anemia', 'fanny_pack', 'beasts'] })); discardAll(g); g.hero.hp = 1; rig(g, [6, 1]);
    const uid = g.mk(d.id); g.s.prompt = null; g.startCombat(uid, { ambush: 'enemy', boss: d.kind === 'boss', plot: d.kind !== 'boss', source: d.kind === 'boss' ? 'boss' : 'plot', hpBonus: 0 }); g.run();
    assert.ok(g.s.over?.epilogue, d.name);
  }
  assert.equal(names.length, 21);
});
test('Lugares de Retiro: al ganar se adjunta el texto del lugar (Tugurio, Cabaña, Granja, Mansión o Fortaleza) según la puntuación', () => {
  const run = (adjust) => { const g = start('c1', V({ lugaresRetiro: true })); adjust(g); g.victory(); return g.s.over.score; };
  let sc = run((g) => { g.hero.hp = 1; g.hero.energy = 0; g.hero.gold = 0; }); assert.equal(sc.rank, 'Tugurio'); assert.equal(sc.retreat.name, 'Tugurio'); assert.match(sc.retreat.text, /choza/);
  sc = run((g) => { g.hero.hp = 14; g.hero.energy = 14; g.hero.gold = 5; }); assert.equal(sc.retreat.name, sc.rank);
  sc = run((g) => { g.hero.gold = 30; g.s.level = 5; }); assert.equal(sc.rank, 'Fortaleza'); assert.match(sc.retreat.text, /castillo/);
  for (const [rank, rx] of [['Cabaña', /cabaña/], ['Granja', /granjero/], ['Mansión', /mansión/]]) { const r = buildCatalog({}) && start('c1', V({ lugaresRetiro: true })); r.s.game.mansion = false; assert.ok(rx.test(r._retreatText(rank).text), rank); }
  const g = start('c1', {}); g.victory(); assert.equal(g.s.over.score.retreat, undefined);
});
test('Encantamientos: cada vez que usas una poción se muestra su encantamiento (evento incantation y registro)', () => {
  const g = start('c1', V({ encantamientos: true })); g.hero.hp = 5; const ev = events(g); const p = give(g, 'P1'); g.act('use', { uid: p });
  const e = ev.find((x) => x.t === 'incantation'); assert.equal(e.name, 'Poción de Salud'); assert.match(e.text, /Señor de las Tierras, con gracia vuelve/); assert.ok(g.s.log.some((l) => l.msg.startsWith('Recitas')));
  const names = [['P2', 'Antídoto'], ['P3', 'Esquirla de Hielo'], ['P4', 'Bomba de Mecha'], ['P5', 'Agua Bendita'], ['P6', 'Poción de Energía'], ['ANP1', 'Sangre de Lobo']];
  for (const [key, name] of names) { const h = start('c1', V({ encantamientos: true })); const ev2 = events(h); const u = give(h, key); if (['P3', 'P4', 'P5'].includes(key)) { discardAll(h); const w = give(h, key); void w; rig(h, [3, 3]); fight(h, 'E12'); h.act('potionAttack', { uid: h.allItems()[0] }); } else h.act('use', { uid: u }); assert.equal(ev2.find((x) => x.t === 'incantation')?.name, name, key); }
  const n = start('c1', V({ encantamientos: true })); const ev3 = events(n); const r = give(n, 'L1'); n.act('use', { uid: r }); assert.equal(ev3.some((x) => x.t === 'incantation'), false);
  const m = start('c1', {}); const ev4 = events(m); m.hero.hp = 5; m.act('use', { uid: give(m, 'P1') }); assert.equal(ev4.some((x) => x.t === 'incantation'), false);
});
test('Momentos de Paz y Descanso: en el Campamento con David Galahad o Gral se tira un d6 para saber en qué se entretiene', () => {
  const g = start('c1', V({ momentosPaz: true }, { modules: ['anemia', 'troll'] })); hire(g, 'ANM1'); const ev = events(g); rig(g, [3]); resolveCard(g, 'D7');
  const e = ev.find((x) => x.t === 'campMoment'); assert.equal(e.roll, 3); assert.equal(e.text, 'Cuenta un chiste.'); assert.equal(e.who, 'David Galahad');
  const texts = new Set(); for (let d = 1; d <= 6; d++) { const h = start('c1', V({ momentosPaz: true }, { modules: ['anemia', 'troll'] })); hire(h, 'ANM2'); const ev2 = events(h); rig(h, [d]); resolveCard(h, 'D7'); texts.add(ev2.find((x) => x.t === 'campMoment').text); }
  assert.equal(texts.size, 6); assert.ok(texts.has('Corta madera.') && texts.has('Canta una canción.'));
  const k = start('c1', V({}, { modules: ['anemia', 'troll'] })); hire(k, 'ANM1'); const ev3 = events(k); resolveCard(k, 'D7'); assert.equal(ev3.some((x) => x.t === 'campMoment'), false);
  const m = start('c1', V({ momentosPaz: true }, { modules: ['anemia', 'troll'] })); const ev4 = events(m); resolveCard(m, 'D7'); assert.equal(ev4.some((x) => x.t === 'campMoment'), false, 'sin esbirros del libro no hay momento');
});

/* ====================================================================================== Metal Inmortal */
test('Metal Inmortal: obliga a Gene Slash; 18 enemigos al azar, 12 tramas (4 de 1 ojo, 6 de 2, 2 de 3) y el Señor del Tiempo como jefe', () => {
  const g = start('anc1', V({ metalInmortal: true }), 3);
  assert.equal(g.s.z.enemies.length, 18); assert.equal(g.s.z.plots.length, 12);
  const eyes = (n) => g.s.z.plots.filter((u) => g.def(u).eyes === n).length; assert.deepEqual([eyes(1), eyes(2), eyes(3)], [4, 6, 2]);
  assert.ok(g.s.z.bosses.some((u) => g.def(u).name === 'El Señor del Tiempo'));
  assert.equal(g.def(g.s.eq.MP).name, 'Guitarra Hacha'); assert.ok(g.hasSkill('ANS7')); assert.equal(audit(g).problems.length, 0); assert.equal(audit(g).orphans, 0);
  assert.equal(g.cat.bossOverride, g.cat.byCode.get('ANB8').id); assert.equal(g.def(g.determineBoss()).name, 'El Señor del Tiempo');
  const h = start('anc1', V({ metalInmortal: true }), 99); assert.notDeepEqual(h.s.z.enemies.map((u) => h.def(u).key), g.s.z.enemies.map((u) => g.def(u).key), 'al azar según la semilla');
  const n = start('anc1', V({}), 3); assert.equal(n.s.z.enemies.length > 18, true); assert.equal(n.s.z.bosses.every((u) => n.def(u).name !== 'El Señor del Tiempo'), true);
});
test('Metal Inmortal: partidas completas con Gene Slash hasta el Señor del Tiempo (victoria por 1987 o por quedar atrapado)', () => {
  const endings = {};
  for (let seed = 1; seed <= 40; seed++) {
    const g = Game.create({ heroId: 'anc1', config: V({ metalInmortal: true }), seed, godMode: true }); const r = play(g, { seed, maxSteps: 6000 }); assert.equal(audit(g).problems.length, 0, `semilla ${seed}`);
    if (r.over.result === 'victory') endings[r.over.ending] = (endings[r.over.ending] || 0) + 1;
  }
  assert.ok((endings.home || 0) + (endings.trapped || 0) > 0, JSON.stringify(endings));
});

/* ====================================================================================== partidas con todo activo */
test('Partidas automáticas con ANEMIA y todas las variantes compatibles: invariantes y ninguna carta duplicada o perdida', () => {
  const variants = { diablillo: true, pueblo: true, motivacion: true, ceroEnergia: true, gastarXP: true, justoAntesDeMorir: true, enfrentarseParca: true, entornosTematicos: true,
    muertesAtroces: true, lugaresRetiro: true, encantamientos: true, momentosPaz: true };
  const config = { modules: ['anemia', 'realms', 'troll', 'beasts', 'fanny_pack', 'loot_lore'], variants }; const cat = buildCatalog(config);
  let wins = 0; const kinds = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const hero = cat.pools.heroes[seed % cat.pools.heroes.length]; const g = Game.create({ heroId: hero.id, config, seed, godMode: seed % 2 === 0 });
    const r = play(g, { seed, maxSteps: 8000 }); if (r.over.result === 'victory') wins++; kinds.add(r.over.result);
    const a = audit(g); assert.equal(a.problems.length, 0, `semilla ${seed}: ${a.problems.join('; ')}`); // (play() ya vigila las cartas perdidas en cada paso)
  }
  assert.ok(wins > 0);
});
