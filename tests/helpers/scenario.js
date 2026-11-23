import { Game } from '../../iron_helm_game/js/engine/index.js';

/** Dados trucados: los siguientes resultados de d6 saldrán en este orden. */
export function rig(g, values) {
  const q = [...values];
  const orig = g.rng.die.bind(g.rng);
  g.rng.die = (sides = 6) => (q.length ? q.shift() : orig(sides));
  return () => q.length;
}
export function start(heroId = 'c1', config = {}, seed = 7) {
  const g = Game.create({ heroId, config, seed });
  g.act('begin');
  return g;
}
const byCode = (g, code) => g.cat.byCode.get(code).id;
/** Pone cartas concretas arriba del mazo de mazmorra */
export function topDungeon(g, ...codes) { g.s.z.dungeon.unshift(...codes.map((c) => g.mk(byCode(g, c)))); }
export function topEnemy(g, code) { g.s.z.enemies.unshift(g.mk(byCode(g, code))); }
export function topLoot(g, code) { g.s.z.loot.unshift(g.mk(byCode(g, code))); }
export function topPlot(g, code) { g.s.z.plots.unshift(g.mk(byCode(g, code))); }
/** Da un objeto al héroe (se equipa solo si el hueco está libre) */
export function give(g, code) { const uid = g.mk(byCode(g, code)); g.acquire(uid, { silent: true, noWeightCheck: true }); return uid; }
export function discardAll(g) { for (const u of g.allItems()) g.discardOwned(u); }
/** Roba y revela la carta de arriba (parte 1) o descarta y resuelve la 2 */
export function turn(g, side = 1, { fight = true } = {}) {
  g.act('draw'); g.act('reveal', { slot: 0 });
  const r = g.act(side === 1 ? 'resolve' : 'decline');
  if (fight && g.s.prompt?.type === 'avoidCard') g.act('avoidCard', { id: 'fight' });
  return r;
}

/** Avanza por las peticiones previas al combate (evitar, opciones previas) hasta el turno de ataque */
export function toAttack(g, { avoid = false } = {}) {
  for (let i = 0; i < 6; i++) {
    const t = g.s.prompt?.type;
    if (t === 'avoidCard') g.act('avoidCard', { id: 'fight' });
    else if (t === 'avoidEnemy') g.act('avoidEnemy', { id: 'fight' });
    else if (t === 'pre') g.act('proceed');
    else break;
  }
  return g.s.prompt;
}

export function affliction(g, code) { const id = g.cat.byCode.get(code).id; let uid = g._takeFromDeck('afflictions', id); if (!uid) uid = g.mk(id); g.hero.afflictions.push(uid); return uid; }
/** inicia un combate directo contra un enemigo (por código) saltándose el mazo */
export function fight(g, code, opts = {}) {
  const uid = g.mk(g.cat.byCode.get(code).id);
  g.s.prompt = null; g.startCombat(uid, { ambush: 'normal', hpBonus: g.s.level, source: 'dungeon', ...opts }); g.run();
  return toAttack(g);
}

/* ---------------------------------------------------------------- ayudas para las expansiones */
const idOf = (g, key) => { const d = g.cat.byCode.get(key); if (!d) throw new Error(`Carta desconocida en el catálogo: ${key}`); return d.id; };
/** pone el entorno indicado (Terreno y Reliquias) como entorno del nivel actual */
export function setEnv(g, key) {
  const uid = g.mk(idOf(g, key));
  if (g.s.env) g.s.z.environmentsDiscard.push(g.s.env);
  g.s.env = uid; return uid;
}
/** contrata un esbirro sin pagar (Posada del Troll Solitario) */
export function hire(g, key) {
  const z = g.s.z; let uid = z.mercenaries.find((u) => g.def(u).key === key);
  if (uid) z.mercenaries.splice(z.mercenaries.indexOf(uid), 1); else uid = g.mk(idOf(g, key));
  const d = g.def(uid); g.s.mercs.push({ uid, morale: d.die, max: d.die }); return uid;
}
export function merc(g, key) { return g.s.mercs.find((m) => g.def(m.uid).key === key) || null; }
export function topArtifact(g, key) { g.s.z.artifacts.unshift(g.mk(idOf(g, key))); }
export function topPotion(g, key) { g.s.z.potions.unshift(g.mk(idOf(g, key))); }
/** aprende una habilidad gratis */
export function learn(g, key) { g._learnSkillFree(idOf(g, key)); }
/** deja la partida esperando el siguiente turno (sin tareas) */
export function idle(g) { g.q = []; g.s.prompt = null; g.s.ctx = {}; g.ask('turn', { turn: g.s.turn + 1 }); }
/** ejecuta una tarea del motor como si viniera de la cola y sigue hasta la próxima decisión */
export function runTask(g, fn) { g.s.prompt = null; g.q = []; g.insert(fn); g.run(); return g.s.prompt; }
/** resuelve una carta de mazmorra concreta con la parte indicada */
export function resolveCard(g, key, side = 1) {
  const uid = g.mk(idOf(g, key));
  g.s.ctx = { turnActive: true }; g.s.z.pair = [uid, null];
  return runTask(g, function r() { this.resolveDungeon(uid, side); });
}
/** resuelve una trama concreta */
export function plot(g, key) {
  const uid = g.mk(idOf(g, key));
  return runTask(g, function p() { this._startPlot(uid); });
}
/** elige una opción de la petición "choice" actual por id (o la primera habilitada) */
export function choose(g, id) {
  const pr = g.s.prompt; if (pr?.type !== 'choice') throw new Error(`No hay elección: ${pr?.type}`);
  const o = id ? pr.options.find((x) => x.id === id) : pr.options.find((x) => !x.disabled);
  if (!o) throw new Error(`Opción ${id} no encontrada: ${pr.options.map((x) => x.id).join(',')}`);
  const r = g.act('choose', { id: o.id }); if (!r.ok) throw new Error(r.error); return g.s.prompt;
}
/** si hay que elegir el tesoro tipo 1, coge la opción indicada */
export function treasure(g, id = 'loot') { if (g.s.prompt?.type === 'choice' && g.s.prompt.treasure) g.act('choose', { id }); return g.s.prompt; }
/** inicia un combate SIN avanzar las peticiones previas (para probar evitar / opciones previas) */
export function engage(g, key, opts = {}) {
  const uid = g.mk(idOf(g, key)); g.s.prompt = null; g.q = [];
  g.startCombat(uid, { ambush: 'normal', hpBonus: g.s.level, source: 'dungeon', ...opts }); g.run();
  return g.s.prompt;
}
/** códigos de las cartas de una zona */
export function codes(g, zone) { return g.s.z[zone].map((u) => g.def(u).key); }
/** eventos emitidos a partir de ahora */
export function events(g) { const out = []; g.on((ev) => out.push(ev)); return out; }
