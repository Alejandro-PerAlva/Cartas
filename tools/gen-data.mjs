#!/usr/bin/env node
/**
 * Convierte las transcripciones de expansiones (iron_helm_game/data-src/*.json) en módulos de datos
 * normalizados (iron_helm_game/js/data/packs/<id>.gen.js) con el mismo esquema que js/data/base.js.
 *
 * Los textos se conservan literales. El comportamiento (poderes, efectos de objetos) NO va aquí:
 * está escrito a mano en js/data/pack-fx.js y se une por código de carta.
 *
 *   npm run gen:data
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'iron_helm_game');
const SRC = path.join(ROOT, 'data-src');
const OUT = path.join(ROOT, 'js', 'data', 'packs');
fs.mkdirSync(OUT, { recursive: true });

const slug = (c) => c.toLowerCase();
const splitNames = (s) => (s || '').split(/\s+y\s+/i).map((x) => x.trim()).filter(Boolean);

function normalize(pack, cards) {
  const out = { heroes: [], bosses: [], enemies: [], loot: [], potions: [], trappings: [], skills: [], plots: [], plotEnemies: [], afflictions: [], dungeon: [], meta: {} };
  const byCode = new Map(); // fusiona copias idénticas
  const push = (list, def) => {
    const key = list === out.enemies || list === out.loot ? `${list === out.loot ? 'L' : 'E'}${def.code}` : def.code;
    const exist = byCode.get(`${key}|${def.code}|${def.name}`);
    if (exist) { exist.copies = (exist.copies || 1) + 1; (exist.imgs ||= [exist.img]).push(def.img); return; }
    byCode.set(`${key}|${def.code}|${def.name}`, def); list.push(def);
  };
  const P = (img) => `expansions/${pack}/${img}`;

  for (const c of cards) {
    const img = P(c.img);
    switch (c.kind) {
      case 'divider': case 'other': {
        if (c.category === 'affliction') push(out.afflictions, { id: slug(c.code), kind: 'affliction', code: c.code, name: c.name, img, text: c.text, pack });
        else if (c.subkind === 'artifact') push(out.loot, { id: slug(c.code), kind: 'item', deck: 'loot', code: c.code, name: c.name, img, price: c.price, weight: c.weight, slot: c.slot, text: c.text, pack, rare: true });
        break;
      }
      case 'campaign': out.meta.intro = { name: c.name, text: c.text, img }; break;
      case 'map': out.meta.map = img; break;
      case 'hero':
        push(out.heroes, { id: slug(c.code), kind: 'hero', code: c.code, name: c.name, img, health: c.health, energy: c.energy, encumbrance: c.encumbrance,
          rations: c.rations, gold: c.gold, trappingNames: splitNames(c.trappings), skillNames: splitNames(c.skill), proficiency: c.proficiency, pack });
        break;
      case 'boss':
        push(out.bosses, { id: slug(c.code), kind: 'boss', code: c.code, name: c.name, img, health: c.health, damage: c.damage, treasure: c.treasure,
          weakness: c.weakness, purse: c.purse, text: c.text, pack });
        break;
      case 'enemy': {
        const base = { id: slug(c.code), kind: 'enemy', code: c.code, name: c.name, img, text: c.text, pack };
        if (c.trap) { push(out.enemies, { ...base, trap: true }); break; }
        Object.assign(base, { health: c.health, damage: c.damage, treasure: c.treasure, weakness: c.weakness, purse: c.purse || 0 });
        if (c.inLootDeck) push(out.loot, { ...base, inLootDeck: true });
        else if (c.inPlotDeck || c.plotEnemy) push(out.plotEnemies, { ...base, kind: 'plot', plotEnemy: true, eyes: c.eyes || 0 });
        else push(out.enemies, base);
        break;
      }
      case 'loot': case 'trapping': case 'potion': {
        const list = c.kind === 'loot' ? out.loot : c.kind === 'trapping' ? out.trappings : out.potions;
        push(list, { id: slug(c.code), kind: 'item', deck: c.kind, code: c.code, name: c.name, img, price: c.price, weight: c.weight, slot: c.slot, text: c.text, pack });
        break;
      }
      case 'skill': push(out.skills, { id: slug(c.code), kind: 'skill', code: c.code, name: c.name, img, proficiency: c.proficiency, text: c.text, pack }); break;
      case 'plot': {
        if (c.miniboss) {
          push(out.plotEnemies, { id: slug(c.code), kind: 'plot', plotEnemy: true, miniboss: true, code: c.code, name: c.name, img, eyes: c.eyes, health: c.health, damage: c.damage,
            treasure: c.treasure, weakness: c.weakness, purse: c.purse || 0, text: c.text, pack });
          break;
        }
        push(out.plots, { id: slug(c.code), kind: 'plot', code: c.code, name: c.name, img, eyes: c.eyes, narrative: c.narrative || '', text: c.text || '',
          options: (c.options || []).map((o, i) => ({ id: `o${i + 1}`, prompt: o.prompt, text: o.text })), pack });
        break;
      }
      default: break;
    }
  }
  return out;
}

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.json')).sort();
const index = [];
for (const f of files) {
  const pack = f.replace(/\.json$/, '');
  const cards = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
  const data = normalize(pack, cards);
  const body = `// GENERADO por tools/gen-data.mjs a partir de data-src/${f}. No editar a mano.\nexport default ${JSON.stringify(data, null, 1)};\n`;
  fs.writeFileSync(path.join(OUT, `${pack}.gen.js`), body);
  const n = Object.entries(data).filter(([k]) => k !== 'meta').map(([k, v]) => `${k}:${v.length}`).join(' ');
  console.log(pack.padEnd(12), n);
  index.push(pack);
}
fs.writeFileSync(path.join(OUT, 'index.js'),
  `// GENERADO por tools/gen-data.mjs\n${index.map((p) => `import ${p} from './${p}.gen.js';`).join('\n')}\nexport const GENERATED = { ${index.join(', ')} };\n`);
