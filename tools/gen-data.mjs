#!/usr/bin/env node
/**
 * Convierte las transcripciones de expansiones (iron_helm_game/data-src/*.json) en módulos de datos
 * normalizados (iron_helm_game/js/data/packs/<id>.gen.js) con el mismo esquema que js/data/base.js.
 *
 * Los textos se conservan literales. El comportamiento (poderes, efectos de objetos) NO va aquí:
 * está escrito a mano en js/data/pack-fx.js y se une por la CLAVE de carta (`key`).
 *
 * Identificadores:
 *  - `id`  = código en minúsculas (`t21`). Si otro paquete (o el juego base) ya usa ese id, se prefija con el
 *            paquete: `galnok_t21`. Así los ids son únicos entre TODAS las expansiones.
 *  - `key` = código impreso (`T21`) o, si colisiona, `paquete:código` (`galnok:T21`). Es la clave de pack-fx.js.
 *  Los paquetes se procesan en un orden fijo (los cinco primeros conservan sus ids históricos).
 *
 *   npm run gen:data
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as BASE from '../iron_helm_game/js/data/base.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'iron_helm_game');
const SRC = path.join(ROOT, 'data-src');
const OUT = path.join(ROOT, 'js', 'data', 'packs');
fs.mkdirSync(OUT, { recursive: true });

const ORDER = ['warren', 'blackened', 'loot_lore', 'fanny_pack', 'beasts', 'galnok', 'crystal', 'throne', 'malicia', 'spire',
  'realms', 'troll', 'howling', 'iron_chest', 'gnome'];

const slug = (c) => c.toLowerCase();
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const splitNames = (s) => (s || '').split(/\s+y\s+/i).map((x) => x.trim()).filter(Boolean);
const num = (v) => (typeof v === 'string' ? parseInt(v.replace('+', ''), 10) : v);

/* ids y códigos ya usados por el juego base */
const claimed = new Map(); // id -> paquete
const baseHeroes = new Map();
for (const k of ['HEROES', 'BOSSES', 'ENEMIES', 'DUNGEON', 'LOOT', 'POTIONS', 'TRAPPINGS', 'SKILLS', 'PLOTS']) {
  for (const d of BASE[k]) { claimed.set(d.id, 'base'); if (k === 'HEROES') baseHeroes.set(d.code, d.name); }
}

/* Tipo de carta de mazmorra según su nombre */
const DUNGEON_KIND = {
  emboscada: 'ambush', tesoro: 'treasure', laberinto: 'labyrinth', 'plantacion de setas': 'mushrooms', 'trampa de flechas': 'arrowTrap',
  escaramuza: 'skirmish', campamento: 'camp', mercader: 'merchant', altar: 'altar', claro: 'clearing', arcangel: 'archangel',
  'idolo falso': 'falseIdol', 'fuente mistica': 'fountain', 'encuentro salvaje': 'wildEncounter',
};
/* Identificador estable de cada opción de las cartas de mazmorra narrativas */
const OPTION_ID = {
  cocinar: 'cook', buscar: 'search', descansar: 'rest', 'una bendicion': 'bless', fuerza: 'strength', curacion: 'cure', merced: 'mercy',
  comprar: 'buy', vender: 'sell', comerciar: 'trade', 'suplicar poder': 'power', 'suplicar riqueza': 'wealth',
  'suplicar por tu vida': 'life', 'ignorar el falso idolo': 'ignore',
};
/* Iconos de los mapas de Encuentros Aleatorios (Iron Chest) */
const ICON = (s) => {
  const n = norm(s);
  if (n.includes('aleatorio')) return 'random';
  if (n.includes('seta')) return 'mushrooms';
  if (n.includes('trampa')) return 'trap';
  if (n.includes('pocion')) return 'potion';
  if (n.includes('enemigo')) return 'enemy';
  if (n.includes('tesoro')) return 'treasure';
  return n;
};

/** "Enemigos: Goblins, Orcos y Skinklings." → ['Goblins','Orcos','Skinklings'] */
function parseRemoves(text) {
  const out = { enemies: [], plots: [] };
  const grab = (label) => {
    const m = new RegExp(`${label}:\\s*([^\\n]+)`, 'i').exec(text || '');
    if (!m) return [];
    return m[1].replace(/\.$/, '').split(/,\s*|\s+y\s+/i).map((x) => x.trim()).filter(Boolean);
  };
  out.enemies = grab('Enemigos'); out.plots = grab('Tramas');
  return out;
}

function normalize(pack, cards) {
  const out = {
    heroes: [], bosses: [], enemies: [], loot: [], potions: [], trappings: [], skills: [], plots: [], plotEnemies: [], afflictions: [],
    dungeon: [], environments: [], artifacts: [], mercenaries: [], adventures: [], gnome: null, rules: [], meta: { backs: {} },
  };
  const seen = new Map(); // fusiona copias idénticas
  const ident = (code) => {
    let id = slug(code); let key = code;
    const owner = claimed.get(id);
    if (owner && owner !== pack) { id = `${pack}_${slug(code)}`; key = `${pack}:${code}`; }
    claimed.set(id, pack);
    return { id, key };
  };
  const push = (list, def) => {
    const k = `${out[list] ? list : ''}|${def.code}|${def.name}`;
    const exist = seen.get(k);
    if (exist) { exist.copies = (exist.copies || 1) + 1; (exist.imgs ||= [exist.img]).push(def.img); return; }
    if (def.code && !def.id) Object.assign(def, ident(def.code));
    seen.set(k, def); out[list].push(def);
  };
  const P = (img) => `expansions/${pack}/${img}`;
  const gnome = { races: [], classes: [], signs: [] };
  const gpush = (list, def) => {
    const ex = gnome[list].find((x) => x.name === def.name);
    if (ex) { (ex.imgs ||= [ex.img]).push(def.img); return; }
    gnome[list].push(def);
  };

  for (const c of cards) {
    const img = P(c.img);
    switch (c.kind) {
      case 'divider': {
        const deck = c.deck === 'other' && norm(c.name).includes('puerta azul') ? 'dungeon' : c.deck;
        if (['environments', 'artifacts', 'mercenaries', 'afflictions', 'dungeon'].includes(deck) && !out.meta.backs[deck]) out.meta.backs[deck] = img;
        break;
      }
      case 'other': {
        if (c.category === 'affliction') push('afflictions', { kind: 'affliction', code: c.code, name: c.name, img, text: c.text, pack });
        else if (c.subkind === 'artifact') push('loot', { kind: 'item', deck: 'loot', code: c.code, name: c.name, img, price: c.price, weight: c.weight, slot: c.slot, text: c.text, pack, rare: true, artifact: true });
        break;
      }
      case 'campaign': {
        out.meta.intro = { name: c.name, text: c.text, img };
        if (/Retira las siguientes cartas/i.test(c.text || '')) {
          out.meta.campaign = { name: c.name, level: c.level || +(/NIVEL\s+(\d)/.exec(c.text || '')?.[1] || 0) || null,
            removes: c.removes || parseRemoves(c.text), boss: c.boss || (/Jefe Final:\s*([^.\n]+)/.exec(c.text || '')?.[1] || null), adds: c.adds || null };
        }
        break;
      }
      case 'rules': out.rules.push({ name: c.name, text: c.text, img, ...(c.table ? { table: c.table } : {}) }); break;
      case 'map': out.meta.map = img; break;
      case 'tracker': break;
      case 'hero': {
        if (baseHeroes.get(c.code) === c.name) break; // reimpresión de un héroe del juego base (Uln-Rolk)
        push('heroes', { kind: 'hero', code: c.code, name: c.name, img, health: c.health, energy: c.energy, encumbrance: c.encumbrance,
          rations: c.rations, gold: c.gold, trappingNames: splitNames(c.trappings), skillNames: splitNames(c.skill), proficiency: c.proficiency, pack,
          ...(c.text ? { text: c.text } : {}), ...(c.finalScoreBonus ? { finalScoreBonus: c.finalScoreBonus } : {}) });
        break;
      }
      case 'boss':
        push('bosses', { kind: 'boss', code: c.code, name: c.name, img, health: c.health, damage: c.damage, treasure: c.treasure,
          weakness: c.weakness, purse: c.purse, text: c.text, pack, ...(c.immunities ? { immunities: c.immunities } : {}) });
        break;
      case 'enemy': {
        const base = { kind: 'enemy', code: c.code, name: c.name, img, text: c.text, pack };
        if (c.trap) { push('enemies', { ...base, trap: true }); break; }
        Object.assign(base, { health: c.health, damage: c.damage, treasure: c.treasure, weakness: c.weakness, purse: c.purse || 0 });
        if (c.inLootDeck) push('loot', { ...base, inLootDeck: true });
        else if (c.inPlotDeck || c.plotEnemy) push('plotEnemies', { ...base, kind: 'plot', plotEnemy: true, eyes: c.eyes || 0 });
        else push('enemies', base);
        break;
      }
      case 'loot': case 'trapping': case 'potion': {
        const list = c.kind === 'loot' ? 'loot' : c.kind === 'trapping' ? 'trappings' : 'potions';
        push(list, { kind: 'item', deck: c.kind, code: c.code, name: c.name, img, price: c.price, weight: c.weight, slot: c.slot, text: c.text, pack });
        break;
      }
      case 'artifact':
        push('artifacts', { kind: 'item', deck: 'artifact', artifact: true, code: c.code, name: c.name, img, price: c.price, weight: c.weight, slot: c.slot, text: c.text, pack });
        break;
      case 'skill': push('skills', { kind: 'skill', code: c.code, name: c.name, img, proficiency: c.proficiency, text: c.text, pack, ...(c.table ? { table: c.table } : {}) }); break;
      case 'plot': {
        if (c.miniboss) {
          push('plotEnemies', { kind: 'plot', plotEnemy: true, miniboss: true, code: c.code, name: c.name, img, eyes: c.eyes, health: c.health, damage: c.damage,
            treasure: c.treasure, weakness: c.weakness, purse: c.purse || 0, text: c.text, pack });
          break;
        }
        push('plots', { kind: 'plot', code: c.code, name: c.name, img, eyes: c.eyes, narrative: c.narrative || '', text: c.text || '',
          options: (c.options || []).map((o, i) => ({ id: `o${i + 1}`, prompt: o.prompt, text: o.text, ...(o.table ? { table: o.table } : {}) })),
          ...(c.table ? { table: c.table } : {}), pack });
        break;
      }
      case 'environment':
        push('environments', { kind: 'environment', code: c.code, name: c.name, img, flavor: c.flavor || '', red: c.red || [], white: c.white || [],
          blue: c.blue || [], text: c.text, pack });
        break;
      case 'mercenary':
        push('mercenaries', { kind: 'mercenary', code: c.code, name: c.name, img, cost: c.cost, die: c.die, white: c.white || [], red: c.red || [],
          quote: c.quote || '', text: c.text, pack });
        break;
      case 'dungeon1': case 'dungeon2': {
        const kind = DUNGEON_KIND[norm(c.name)];
        if (!kind) throw new Error(`${pack}: carta de mazmorra desconocida ${c.name}`);
        const def = { kind, type: c.kind === 'dungeon1' ? 1 : 2, code: c.code, name: c.name, img, isDungeon: true, pack };
        if (c.option1) def.option1 = c.option1;
        if (c.option2) def.option2 = c.option2;
        if (c.table1) def.table1 = c.table1;
        if (c.table2) def.table2 = c.table2;
        if (c.table) def.table = c.table;
        if (c.text) def.text = c.text;
        if (c.options) def.options = c.options.map((o) => ({ id: OPTION_ID[norm(o.label)] || norm(o.label), label: o.label, text: o.text }));
        push('dungeon', def);
        break;
      }
      case 'adventure': {
        const def = { kind: 'adventure', code: `MAP${c.level}`, name: c.name, img, level: c.level, color: c.color || null,
          transitions: (c.transitions || []).map((t) => ({ from: t.from, to: t.to, icon: ICON(t.icon) })), pack };
        push('adventures', def);
        break;
      }
      case 'race':
        gpush('races', { name: c.name, health: c.health, energy: c.energy, carry: c.carry, ability: c.ability, text: c.text, img });
        break;
      case 'class':
        gpush('classes', { name: c.name, health: num(c.health), energy: num(c.energy), rations: c.rations, gold: c.gold, startSkills: c.startSkills || [],
          poem: c.poem || '', text: c.text, img });
        break;
      case 'sign':
        gpush('signs', { name: c.name, proficiency: c.proficiency, moral: c.moral, startEquipment: c.startEquipment || [], text: c.text, img });
        break;
      default: break;
    }
  }
  if (gnome.races.length) out.gnome = gnome;
  if (!out.meta.intro && out.rules.length) out.meta.intro = { name: out.rules[0].name, text: out.rules[0].text, img: out.rules[0].img };
  // tabla de Encuentros Aleatorios (Iron Chest)
  const enc = out.rules.find((r) => r.table && norm(r.name).includes('encuentros aleatorios'));
  if (enc) out.meta.encounterTable = enc.table;
  return out;
}

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
const packs = [...ORDER.filter((p) => files.includes(p)), ...files.filter((p) => !ORDER.includes(p)).sort()];
const index = [];
for (const pack of packs) {
  const cards = JSON.parse(fs.readFileSync(path.join(SRC, `${pack}.json`), 'utf8'));
  const data = normalize(pack, cards);
  const body = `// GENERADO por tools/gen-data.mjs a partir de data-src/${pack}.json. No editar a mano.\nexport default ${JSON.stringify(data, null, 1)};\n`;
  fs.writeFileSync(path.join(OUT, `${pack}.gen.js`), body);
  const n = Object.entries(data).filter(([k, v]) => Array.isArray(v) && v.length).map(([k, v]) => `${k}:${v.length}`).join(' ');
  console.log(pack.padEnd(12), n, data.gnome ? `gnome:${data.gnome.races.length}/${data.gnome.classes.length}/${data.gnome.signs.length}` : '');
  index.push(pack);
}
index.sort();
fs.writeFileSync(path.join(OUT, 'index.js'),
  `// GENERADO por tools/gen-data.mjs\n${index.map((p) => `import ${p} from './${p}.gen.js';`).join('\n')}\nexport const GENERATED = { ${index.join(', ')} };\n`);
