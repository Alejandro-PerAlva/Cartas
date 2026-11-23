/**
 * Catálogo de cartas: une el juego base con las expansiones activas, aplica las reglas de campaña
 * (retirar cartas del juego base y sustituirlas) y adjunta poderes/efectos por clave de carta.
 *
 * Además mantiene un ÍNDICE GLOBAL con todas las cartas de todas las expansiones (activas o no): el equipo y las
 * habilidades iniciales de un héroe se resuelven por nombre entre todas ellas y, si su expansión no está activa,
 * la carta se inyecta como objeto propio del héroe sin entrar en los mazos.
 */
import * as BASE from '../data/base.js';
import { GENERATED } from '../data/packs/index.js';
import { PACKS, MISSING_PACKS, POWERS, FX, PLOT_OPS, ENV_FX, DUNGEON_FX } from '../data/pack-fx.js';

const clone = (o) => JSON.parse(JSON.stringify(o));

export const normName = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const STOP = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'a', 'en']);
/** Comparación tolerante: sin artículos, plurales ni género ("Cazador de Tesoros" ≈ "Cazadora de Tesoros"). */
export const looseName = (s) => normName(s).replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/)
  .filter((w) => w && !STOP.has(w)).map((w) => w.replace(/s$/, '').replace(/[aoe]$/, '')).join(' ');

const POOL_KEYS = ['heroes', 'bosses', 'enemies', 'dungeon', 'loot', 'potions', 'trappings', 'skills', 'plots', 'afflictions',
  'environments', 'artifacts', 'mercs', 'adventures'];
const GEN_KEYS = { heroes: 'heroes', bosses: 'bosses', enemies: 'enemies', loot: 'loot', potions: 'potions', trappings: 'trappings',
  skills: 'skills', plots: 'plots', afflictions: 'afflictions', environments: 'environments', artifacts: 'artifacts', mercs: 'mercenaries',
  adventures: 'adventures', dungeon: 'dungeon' };

/* ------------------------------------------------------------------------------------------- decoración */
function decorate(d) {
  const key = d.key || d.code;
  d.key = key;
  if (POWERS[key]) d.power = { ...(d.power || {}), ...POWERS[key] };
  if (FX[key]) d.fx = { ...(d.fx || {}), ...FX[key] };
  if (d.kind === 'environment' && ENV_FX[key]) d.env = { ...ENV_FX[key] };
  if (d.isDungeon && DUNGEON_FX[key]) d.params = clone(DUNGEON_FX[key]);
  if (d.kind === 'plot' && PLOT_OPS[key]) {
    const ops = PLOT_OPS[key];
    if (Array.isArray(ops.plot)) d.ops = ops.plot;
    if (Array.isArray(ops.pre)) d.pre = ops.pre;
    (d.options || []).forEach((o, i) => { if (ops.options?.[i]) o.ops = ops.options[i]; if (ops.req?.[i]) o.req = ops.req[i]; });
    if (ops.once) d.once = true;
  }
  if (d.kind === 'plot' && d.plotEnemy && d.power === undefined) d.power = {};
  if (d.kind === 'enemy' || d.kind === 'boss' || d.plotEnemy) d.tags = enemyTags(d.name);
  d.fx ||= {};
  return d;
}
/** Tribus de enemigos por nombre (Espada Enana, Semiorco). */
function enemyTags(name) {
  const n = normName(name); const t = [];
  if (/goblin/.test(n)) t.push('goblin');
  if (/\borco\b|\borcos\b/.test(n)) t.push('orc');
  if (/troll/.test(n)) t.push('troll');
  if (/grunkle/.test(n)) t.push('grunkle');
  return t;
}

/* ------------------------------------------------------------------------------------------- índice global */
let GLOBAL = null;
function baseDefs() {
  return {
    heroes: BASE.HEROES.map((h) => ({ ...h, kind: 'hero', pack: 'base' })),
    bosses: BASE.BOSSES.map((b) => ({ ...b, kind: 'boss', pack: 'base' })),
    enemies: BASE.ENEMIES.map((e) => ({ ...e, kind: 'enemy', pack: 'base' })),
    dungeon: BASE.DUNGEON.map((d) => ({ ...d, isDungeon: true, pack: 'base' })),
    loot: BASE.LOOT.map((d) => ({ ...d, pack: 'base' })),
    potions: BASE.POTIONS.map((d) => ({ ...d, pack: 'base' })),
    trappings: BASE.TRAPPINGS.map((d) => ({ ...d, pack: 'base' })),
    skills: BASE.SKILLS.map((d) => ({ ...d, pack: 'base' })),
    plots: BASE.PLOTS.map((d) => ({ ...d, pack: 'base' })),
  };
}
/** Todas las cartas de todos los paquetes (clonadas y decoradas). Solo lectura. */
function globalIndex() {
  if (GLOBAL) return GLOBAL;
  const lists = {}; const all = [];
  const add = (pool, defs) => { for (const d of defs) { const c = decorate(clone(d)); (lists[pool] ||= []).push(c); all.push(c); } };
  for (const [k, v] of Object.entries(baseDefs())) add(k, v);
  for (const g of Object.values(GENERATED)) {
    for (const [pool, gk] of Object.entries(GEN_KEYS)) add(pool, g[gk] || []);
    add('plots', g.plotEnemies || []);
  }
  GLOBAL = { lists, all, byId: new Map(all.map((d) => [d.id, d])) };
  return GLOBAL;
}

/** Busca una carta por nombre: primero en las listas preferidas (activas), luego en todas las expansiones. */
function findByName(name, prefer = [], kinds = ['trappings']) {
  const G = globalIndex();
  const cands = [];
  for (const k of kinds) cands.push(...prefer.filter((d) => d.__pool === k));
  for (const k of kinds) cands.push(...(G.lists[k] || []));
  for (const d of prefer) if (!cands.includes(d)) cands.push(d);
  for (const k of Object.keys(G.lists)) if (!kinds.includes(k)) cands.push(...G.lists[k]);
  const n = normName(name);
  const exact = cands.find((d) => d.kind !== 'hero' && normName(d.name) === n);
  if (exact) return exact;
  const l = looseName(name);
  return cands.find((d) => d.kind !== 'hero' && looseName(d.name) === l) || null;
}

/* ------------------------------------------------------------------------------------------- listPacks */
const copies = (list) => (list || []).reduce((n, d) => n + (d.copies || 1), 0);
export function listPacks() {
  const G = globalIndex();
  return {
    packs: PACKS.map((p) => {
      const g = GENERATED[p.id];
      const bossDef = p.boss ? G.all.find((d) => d.kind === 'boss' && d.key === p.boss) || null : null;
      const counts = g ? {
        heroes: g.heroes.length, bosses: g.bosses.length,
        enemies: copies(g.enemies) + copies((g.loot || []).filter((d) => d.kind === 'enemy')) + copies(g.plotEnemies),
        items: copies((g.loot || []).filter((d) => d.kind === 'item')) + copies(g.potions) + copies(g.trappings),
        plots: copies(g.plots) + copies(g.plotEnemies), skills: g.skills.length, environments: copies(g.environments),
        artifacts: copies(g.artifacts) + copies((g.loot || []).filter((d) => d.artifact)), mercenaries: copies(g.mercenaries),
        adventures: copies(g.adventures), dungeonCards: copies(g.dungeon), afflictions: copies(g.afflictions),
      } : null;
      const keyCards = [];
      const kc = (d, kind) => { if (d && keyCards.length < 8 && !keyCards.some((k) => k.img === d.img)) keyCards.push({ img: d.img, name: d.name, kind }); };
      if (g) {
        kc(bossDef, 'boss');
        for (const h of g.heroes) kc(h, 'hero');
        const order = [['enemies', 'enemy'], ['plotEnemies', 'plot'], ['plots', 'plot'], ['environments', 'environment'], ['mercenaries', 'mercenary'],
          ['artifacts', 'artifact'], ['dungeon', 'dungeon'], ['loot', 'loot'], ['trappings', 'trapping'], ['skills', 'skill'], ['potions', 'potion'],
          ['afflictions', 'affliction'], ['adventures', 'adventure']];
        for (let round = 0; round < 3 && keyCards.length < 8; round++) for (const [k, kind] of order) kc((g[k] || [])[round], kind);
        if (g.gnome) for (const r of g.gnome.races) kc(r, 'race');
      }
      const intro = g?.meta?.intro ? { name: g.meta.intro.name, text: g.meta.intro.text, img: g.meta.intro.img } : null;
      return {
        id: p.id, name: p.name, es: p.es, type: p.type, number: p.number, blurb: p.blurb,
        ...(p.adventureLevel ? { adventureLevel: p.adventureLevel } : {}), rules: p.rules || [], counts,
        heroes: g ? clone(g.heroes) : [], boss: bossDef ? clone(bossDef) : null, keyCards,
        ...(p.exclusive ? { exclusive: p.exclusive } : {}), ...(p.includes ? { includes: p.includes } : {}),
        intro, available: !!g, map: g?.meta?.map || null,
      };
    }),
    gnome: GENERATED.gnome?.gnome ? clone(GENERATED.gnome.gnome) : null,
    missing: MISSING_PACKS,
  };
}

/* ------------------------------------------------------------------------------------------- campañas */
/** Resuelve los nombres de la carta de campaña ("Goblins", "Orcos"…) a códigos del juego base. */
export function resolveRemovals(removes) {
  const out = { enemies: [], plots: [] };
  const B = baseDefs();
  const pick = (name, list) => {
    const l = looseName(name).split(' ');
    const exact = list.find((d) => looseName(d.name) === l.join(' '));
    if (exact) return exact.code;
    const part = list.filter((d) => { const w = looseName(d.name).split(' '); return l.every((x) => w.includes(x)); });
    if (part.length === 1) return part[0].code;
    throw new Error(`No se puede resolver la carta "${name}" del juego base`);
  };
  for (const n of removes?.enemies || []) out.enemies.push(pick(n, B.enemies));
  for (const n of removes?.plots || []) out.plots.push(pick(n, B.plots));
  return out;
}

/* ------------------------------------------------------------------------------------------- creador de personajes (Gnome Pack) */
function gnomeData() { return GENERATED.gnome?.gnome || { races: [], classes: [], signs: [] }; }
const findL = (list, name) => list.find((x) => normName(x.name) === normName(name)) || list.find((x) => looseName(x.name) === looseName(name)) || null;

/**
 * Valida una selección {race, klass, sign, skill, equipment, equipment2?, potion?, name?} y calcula el héroe.
 * Devuelve { def, errors }. `prefer` son las cartas activas (para tomar el equipo del mazo si existe).
 */
function evalCustomHero(sel = {}, prefer = []) {
  const G = gnomeData(); const errors = [];
  const race = findL(G.races, sel.race); const klass = findL(G.classes, sel.klass ?? sel.class); const sign = findL(G.signs, sel.sign);
  if (!race) errors.push(`Raza desconocida: "${sel.race}" (opciones: ${G.races.map((r) => r.name).join(', ')})`);
  if (!klass) errors.push(`Clase desconocida: "${sel.klass ?? sel.class}" (opciones: ${G.classes.map((r) => r.name).join(', ')})`);
  if (!sign) errors.push(`Signo astral desconocido: "${sel.sign}" (opciones: ${G.signs.map((r) => r.name).join(', ')})`);
  const skills = []; const trappings = []; let goldBonus = 0;
  if (klass) {
    if (!sel.skill) errors.push(`Elige una habilidad inicial de ${klass.name}: ${klass.startSkills.join(', ')}`);
    else if (!klass.startSkills.some((s) => looseName(s) === looseName(sel.skill))) errors.push(`La clase ${klass.name} no puede empezar con "${sel.skill}" (opciones: ${klass.startSkills.join(', ')})`);
    else {
      const d = findByName(sel.skill, prefer, ['skills']);
      if (!d || d.kind !== 'skill') errors.push(`La habilidad "${sel.skill}" no existe en ninguna expansión`); else skills.push(d);
    }
  }
  if (sign) {
    if (!sel.equipment) errors.push(`Elige un equipo inicial de ${sign.name}: ${sign.startEquipment.join(', ')}`);
    else if (!sign.startEquipment.some((s) => looseName(s) === looseName(sel.equipment))) errors.push(`El signo ${sign.name} no ofrece "${sel.equipment}" (opciones: ${sign.startEquipment.join(', ')})`);
    else if (/^\d+\s+de\s+oro$/i.test(sel.equipment.trim())) goldBonus += parseInt(sel.equipment, 10);
    else for (const n of sel.equipment.split(/\s+y\s+/i)) {
      const d = findByName(n, prefer, ['trappings']);
      if (!d || d.kind !== 'item') errors.push(`El equipo "${n}" no existe en ninguna expansión`); else trappings.push(d);
    }
  }
  if (sel.equipment2) {
    if (race && normName(race.name) !== 'humano') errors.push('Solo los humanos pueden elegir un equipo adicional en la creación.');
    else {
      const d = findByName(sel.equipment2, prefer, ['trappings']);
      if (!d || d.kind !== 'item' || d.deck !== 'trapping') errors.push(`El equipo adicional "${sel.equipment2}" no existe`);
      else if (d.price !== 1) errors.push(`El equipo adicional del humano debe costar 1 de oro (${d.name} cuesta ${d.price})`);
      else trappings.push(d);
    }
  }
  let potion = null;
  if (sel.potion) {
    if (race && normName(race.name) !== 'gnomo') errors.push('Solo los gnomos empiezan con una poción a su elección.');
    else {
      const d = findByName(sel.potion, prefer, ['potions']);
      if (!d || d.deck !== 'potion') errors.push(`La poción "${sel.potion}" no existe`); else potion = d;
    }
  }
  if (!race || !klass || !sign) return { def: null, errors };
  const mediano = normName(race.name) === 'mediano';
  const def = {
    id: 'custom', kind: 'hero', code: 'CX', key: 'CX', pack: 'gnome', name: sel.name || `${race.name} ${klass.name}`, img: race.img,
    health: race.health + klass.health, energy: race.energy + klass.energy, encumbrance: race.carry,
    rations: klass.rations + (mediano ? 1 : 0), gold: klass.gold + goldBonus, morality: sign.moral, proficiency: sign.proficiency,
    trappings: trappings.map((d) => d.id), skills: skills.map((d) => d.id), race: race.name, klass: klass.name, sign: sign.name,
    potion: potion?.id || null, raceAbility: race.ability, fx: {},
    custom: { race: race.name, klass: klass.name, sign: sign.name, skill: skills[0]?.name || sel.skill || null, equipment: sel.equipment || null,
      ...(sel.equipment2 ? { equipment2: sel.equipment2 } : {}), ...(sel.potion ? { potion: sel.potion } : {}) },
  };
  return { def, errors, skills, trappings, potion };
}

/** Estadísticas finales de un personaje creado con el Gnome Pack (para la interfaz). Nunca lanza. */
export function buildCustomHeroPreview(sel = {}) {
  const r = evalCustomHero(sel);
  const d = r.def;
  return {
    valid: !!d && !r.errors.length, errors: r.errors,
    name: d?.name || null, race: d?.race || null, klass: d?.klass || null, sign: d?.sign || null, raceAbility: d?.raceAbility || null,
    health: d?.health ?? null, energy: d?.energy ?? null, encumbrance: d?.encumbrance ?? null, rations: d?.rations ?? null,
    gold: d?.gold ?? null, morality: d?.morality ?? null, proficiency: d?.proficiency ?? null,
    skills: (r.skills || []).map((x) => ({ id: x.id, name: x.name, img: x.img })),
    equipment: (r.trappings || []).map((x) => ({ id: x.id, name: x.name, img: x.img })),
    potion: r.potion ? { id: r.potion.id, name: r.potion.name, img: r.potion.img } : null,
  };
}

/* ------------------------------------------------------------------------------------------- catálogo */
/**
 * @param {{campaign?: string|null, modules?: string[], custom?: object}} cfg
 */
export function buildCatalog(cfg = {}) {
  const G = globalIndex();
  const campaignMeta = cfg.campaign ? PACKS.find((p) => p.id === cfg.campaign && p.type === 'campaign') || null : null;
  if (cfg.campaign && !campaignMeta) throw new Error(`Campaña desconocida: ${cfg.campaign}`);
  const campaign = campaignMeta ? campaignMeta.id : null;
  let modules = [...new Set(cfg.modules || [])].filter((m) => GENERATED[m] && PACKS.find((p) => p.id === m)?.type === 'module');
  for (const inc of campaignMeta?.includes || []) if (!modules.includes(inc)) modules.push(inc);
  if (cfg.custom && !modules.includes('gnome')) modules.push('gnome');
  const packIds = ['base', ...(campaign ? [campaign] : []), ...modules];
  const has = (id) => packIds.includes(id);

  const pools = Object.fromEntries(POOL_KEYS.map((k) => [k, []]));
  const add = (key, defs) => { for (const d of defs) { const c = decorate(clone(d)); c.__pool = key; pools[key].push(c); } };
  for (const [k, v] of Object.entries(baseDefs())) add(k, v);

  const intros = [];
  let mapImg = BASE.IMAGES.map;
  const backs = { ...BASE.IMAGES.backs };
  for (const id of packIds.slice(1)) {
    const g = GENERATED[id];
    for (const [pool, gk] of Object.entries(GEN_KEYS)) { if (pool === 'dungeon') continue; add(pool, g[gk] || []); }
    add('plots', g.plotEnemies || []);
    if (g.meta?.intro) intros.push({ id, ...g.meta.intro });
    if (id === campaign && g.meta?.map) mapImg = g.meta.map;
    for (const [k, v] of Object.entries(g.meta?.backs || {})) if (k !== 'dungeon' || id === 'howling') backs[k] = v;
  }
  // The Howling Abyss: sustituye TODO el mazo de mazmorra del juego base
  if (has('howling')) { pools.dungeon = []; add('dungeon', GENERATED.howling.dungeon); }

  // Reglas de campaña: retirar cartas del juego base.
  if (campaignMeta?.remove) {
    const rm = campaignMeta.remove;
    pools.enemies = pools.enemies.filter((e) => !(rm.enemies || []).includes(e.code) || e.pack !== 'base');
    pools.plots = pools.plots.filter((p) => !(rm.plots || []).includes(p.code) || p.pack !== 'base');
  }
  // Terreno y Reliquias: los artefactos de otras expansiones (Cápsula Corazón) pasan al mazo de artefactos
  if (has('realms')) {
    const moved = pools.loot.filter((d) => d.artifact);
    pools.loot = pools.loot.filter((d) => !d.artifact);
    for (const d of moved) { d.deck = 'artifact'; d.__pool = 'artifacts'; pools.artifacts.push(d); }
  }
  // Duplicados de héroes (reimpresiones): uno por código
  pools.heroes = pools.heroes.filter((h, i, a) => a.findIndex((x) => x.code === h.code) === i);

  // Los objetos que son criaturas en el mazo de botín (Mimético) se tratan aparte.
  const lootItems = pools.loot.filter((d) => d.kind === 'item');
  const mimics = pools.loot.filter((d) => d.kind === 'enemy');

  const active = [...Object.values(pools).flat()];
  // Resolver equipamiento y habilidad inicial de los héroes (por nombre, en todas las expansiones)
  for (const h of pools.heroes) {
    const resolved = [];
    for (const n of h.trappingNames || h.trappings || []) {
      const d = active.find((x) => x.id === n) || findByName(n, active, ['trappings']);
      if (!d) throw new Error(`Héroe ${h.name}: equipo inicial desconocido "${n}"`);
      resolved.push(d.id);
    }
    h.trappings = resolved;
    const sk = [];
    for (const n of h.skillNames || (h.skill ? [h.skill] : [])) {
      const d = active.find((x) => x.id === n) || findByName(n, active, ['skills']);
      if (!d || d.kind !== 'skill') throw new Error(`Héroe ${h.name}: habilidad inicial desconocida "${n}"`);
      sk.push(d.id);
    }
    h.skills = sk;
  }
  if (cfg.custom) {
    const r = evalCustomHero(cfg.custom, active);
    if (r.errors.length) throw new Error(`Personaje personalizado no válido: ${r.errors.join(' · ')}`);
    pools.heroes.push(r.def);
  }

  // Índices: byId incluye TODAS las cartas (las inactivas solo se usan para equipo/habilidades inyectados)
  const all = [...Object.values(pools).flat(), ...mimics.filter((m) => !pools.loot.includes(m))];
  const byId = new Map(G.all.map((d) => [d.id, d]));
  for (const d of all) byId.set(d.id, d);
  const byCode = new Map();
  for (const d of all) if (d.key && !byCode.has(d.key)) byCode.set(d.key, d);
  for (const d of G.all) if (d.key && !byCode.has(d.key)) byCode.set(d.key, d);

  const bossOverride = campaignMeta?.boss ? pools.bosses.find((b) => b.key === campaignMeta.boss)?.id || null : null;
  const adventureLevel = campaignMeta?.adventureLevel || 1;
  const extras = {
    environments: has('realms') && pools.environments.length > 0, artifacts: has('realms') && pools.artifacts.length > 0,
    afflictions: pools.afflictions.length > 0, mercenaries: has('troll') && pools.mercs.length > 0,
    encounters: has('iron_chest') && pools.adventures.length > 0,
  };

  return {
    cfg: { campaign, modules, ...(cfg.custom ? { custom: clone(cfg.custom) } : {}) }, packIds, campaignMeta, intros, extras, adventureLevel,
    defs: all, byId, byCode, pools: { ...pools, loot: lootItems, mimics },
    bossOverride, mapImg, moralityImg: BASE.IMAGES.morality, backs,
    mapSpots: BASE.MAP_SPOTS, moralitySpots: BASE.MORALITY_SPOTS, merchantStock: BASE.MERCHANT_STOCK,
    encounterTable: GENERATED.iron_chest?.meta?.encounterTable || null,
    def(id) { const d = byId.get(id); if (!d) throw new Error(`Carta desconocida: ${id}`); return d; },
    findByName(name, kinds) { return findByName(name, all, kinds); },
  };
}
