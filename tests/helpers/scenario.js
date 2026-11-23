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
