/**
 * Catálogo de cartas: une el juego base con las expansiones activas, aplica las reglas de campaña
 * (retirar cartas del juego base y sustituirlas) y adjunta poderes/efectos por código de carta.
 */
import * as BASE from '../data/base.js';
import { GENERATED } from '../data/packs/index.js';
import { PACKS, MISSING_PACKS, POWERS, FX, PLOT_OPS } from '../data/pack-fx.js';

const clone = (o) => JSON.parse(JSON.stringify(o));

export function listPacks() {
  return {
    packs: PACKS.map((p) => {
      const g = GENERATED[p.id];
      return { ...p, available: !!g, intro: g?.meta?.intro || null, map: g?.meta?.map || null, heroes: g?.heroes || [] };
    }),
    missing: MISSING_PACKS,
  };
}

export const normName = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/**
 * @param {{campaign?: string|null, modules?: string[]}} cfg
 */
export function buildCatalog(cfg = {}) {
  const campaign = cfg.campaign || null;
  const modules = (cfg.modules || []).filter((m) => GENERATED[m] && PACKS.find((p) => p.id === m)?.type === 'module');
  const packIds = ['base', ...(campaign ? [campaign] : []), ...modules];
  const campaignMeta = campaign ? PACKS.find((p) => p.id === campaign) : null;

  const pools = { heroes: [], bosses: [], enemies: [], dungeon: [], loot: [], potions: [], trappings: [], skills: [], plots: [], afflictions: [] };
  const add = (key, defs) => { for (const d of defs) pools[key].push(clone(d)); };

  add('heroes', BASE.HEROES.map((h) => ({ ...h, kind: 'hero', pack: 'base' })));
  add('bosses', BASE.BOSSES.map((b) => ({ ...b, kind: 'boss', pack: 'base' })));
  add('enemies', BASE.ENEMIES.map((e) => ({ ...e, kind: 'enemy', pack: 'base' })));
  add('dungeon', BASE.DUNGEON.map((d) => ({ ...d, isDungeon: true, pack: 'base' })));
  add('loot', BASE.LOOT.map((d) => ({ ...d, pack: 'base' })));
  add('potions', BASE.POTIONS.map((d) => ({ ...d, pack: 'base' })));
  add('trappings', BASE.TRAPPINGS.map((d) => ({ ...d, pack: 'base' })));
  add('skills', BASE.SKILLS.map((d) => ({ ...d, pack: 'base' })));
  add('plots', BASE.PLOTS.map((d) => ({ ...d, pack: 'base' })));

  let mapImg = BASE.IMAGES.map;
  let intros = [];
  for (const id of packIds.slice(1)) {
    const g = GENERATED[id];
    for (const k of ['heroes', 'bosses', 'enemies', 'loot', 'potions', 'trappings', 'skills', 'plots', 'afflictions']) add(k, g[k] || []);
    add('plots', g.plotEnemies || []);
    if (g.meta?.intro) intros.push({ id, ...g.meta.intro });
    if (id === campaign && g.meta?.map) mapImg = g.meta.map;
  }

  // Reglas de campaña: retirar cartas del juego base.
  if (campaignMeta?.remove) {
    const rm = campaignMeta.remove;
    pools.enemies = pools.enemies.filter((e) => !(rm.enemies || []).includes(e.code) || e.pack !== 'base');
    pools.plots = pools.plots.filter((p) => !(rm.plots || []).includes(p.code) || p.pack !== 'base');
  }

  // Los objetos que son criaturas en el mazo de botín (Mimético) se tratan aparte.
  const lootItems = pools.loot.filter((d) => d.kind === 'item');
  const mimics = pools.loot.filter((d) => d.kind === 'enemy');

  // Adjuntar poderes / efectos por código
  const decorate = (d) => {
    if (POWERS[d.code]) d.power = { ...(d.power || {}), ...POWERS[d.code] };
    if (FX[d.code]) d.fx = { ...(d.fx || {}), ...FX[d.code] };
    if (d.kind === 'plot' && PLOT_OPS[d.code]) {
      const ops = PLOT_OPS[d.code];
      if (Array.isArray(ops.plot)) d.ops = ops.plot;
      (d.options || []).forEach((o, i) => { if (ops.options?.[i]) o.ops = ops.options[i]; });
      if (ops.once) d.once = true;
    }
    if (d.kind === 'plot' && d.plotEnemy && d.power === undefined) d.power = {};
    d.fx ||= {};
    return d;
  };
  for (const list of Object.values(pools)) list.forEach(decorate);
  mimics.forEach(decorate);

  const all = [...Object.values(pools).flat(), ...mimics];
  const byId = new Map(all.map((d) => [d.id, d]));
  const byCode = new Map(all.map((d) => [d.code, d]));
  const byName = new Map();
  for (const key of ['trappings', 'skills', 'loot', 'potions']) for (const d of pools[key]) if (!byName.has(normName(d.name))) byName.set(normName(d.name), d);

  // Resolver equipamiento y habilidad inicial de los héroes
  for (const h of pools.heroes) {
    const resolved = [];
    for (const n of h.trappingNames || h.trappings || []) {
      const d = byId.get(n) || pools.trappings.find((t) => normName(t.name) === normName(n)) || byName.get(normName(n));
      if (!d) throw new Error(`Héroe ${h.name}: equipo inicial desconocido "${n}"`);
      resolved.push(d.id);
    }
    h.trappings = resolved;
    const sk = [];
    for (const n of h.skillNames || [h.skill]) {
      const d = byId.get(n) || pools.skills.find((s) => normName(s.name) === normName(n));
      if (!d) throw new Error(`Héroe ${h.name}: habilidad inicial desconocida "${n}"`);
      sk.push(d.id);
    }
    h.skills = sk;
  }

  const bossOverride = campaignMeta?.boss ? byCode.get(campaignMeta.boss)?.id || null : null;

  return {
    cfg: { campaign, modules }, packIds, campaignMeta, intros,
    defs: all, byId, byCode, pools: { ...pools, loot: lootItems, mimics },
    bossOverride, mapImg, moralityImg: BASE.IMAGES.morality, backs: BASE.IMAGES.backs,
    mapSpots: BASE.MAP_SPOTS, moralitySpots: BASE.MORALITY_SPOTS, merchantStock: BASE.MERCHANT_STOCK,
    def(id) { const d = byId.get(id); if (!d) throw new Error(`Carta desconocida: ${id}`); return d; },
  };
}
