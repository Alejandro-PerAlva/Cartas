/** Fábrica de cartas (con caras y volteo 3D), dorsos por mazo y utilidades de imagen. */
import { h, animate } from './dom.js';

export const CARD_W = 480, CARD_H = 675;
let BACKS = {};
export function setBacks(b) { BACKS = b; }
export const cardPath = (p) => `assets/cards/${p}`;

/** dorso correspondiente a una definición de carta */
export function backOf(def) {
  if (!def) return cardPath(BACKS.dungeon);
  if (def.isDungeon) return cardPath(BACKS.dungeon);
  switch (def.kind) {
    case 'enemy': case 'enemyTrap': return cardPath(def.inLootDeck ? BACKS.loot : BACKS.enemies);
    case 'boss': return cardPath(BACKS.bosses);
    case 'plot': return cardPath(BACKS.plots);
    case 'skill': return cardPath(BACKS.skills);
    case 'hero': return cardPath(BACKS.heroes);
    case 'affliction': return cardPath(BACKS.afflictions);
    case 'item': return cardPath(def.deck === 'potion' ? BACKS.potions : def.deck === 'trapping' ? BACKS.trappings : BACKS.loot);
    default: return cardPath(BACKS.dungeon);
  }
}
export const backOfDeck = (name) => cardPath(BACKS[name] || BACKS.dungeon);

/**
 * Elemento de carta con dos caras. `front` y `back` son rutas de imagen (relativas a assets/cards si no empiezan por assets/).
 * @returns {HTMLElement} .card[.up] — tamaño lo fija el contenedor (inset/width/height)
 */
export function cardEl({ front, back, up = false, cls = '', title = '' }) {
  const f = front && !front.startsWith('assets/') ? cardPath(front) : front;
  const el = h('div.card' + (up ? '.up' : '') + (cls ? '.' + cls.split(' ').join('.') : ''), { title },
    h('div.card-in',
      h('div.face.back', h('img', { src: back, alt: '', draggable: 'false' })),
      h('div.face.front', f ? h('img', { src: f, alt: '', draggable: 'false' }) : null)));
  return el;
}
export function setFront(el, front) {
  const f = front && !front.startsWith('assets/') ? cardPath(front) : front;
  const face = el.querySelector('.face.front'); face.innerHTML = ''; if (f) face.append(h('img', { src: f, alt: '', draggable: 'false' }));
}
export function flip(el, up = true) { el.classList.toggle('up', up); }
export const flipAndWait = async (el, up = true, ms = 560) => { el.classList.toggle('up', up); await new Promise((r) => setTimeout(r, ms)); };
export { animate };
