/**
 * Efectos en coordenadas de pantalla: cartas fantasma que vuelan entre zonas, fichas voladoras,
 * números flotantes, viñetas de daño.
 */
import { h, animate, sleep, ease } from './dom.js';
import { cardEl, CARD_W, CARD_H } from './cards.js';
import { sound } from './audio.js';

const host = () => document.getElementById('fxhost') || document.body;

/** Fantasma de carta: base 480×675 escalada. rect = {x,y,w,h} en pantalla */
export class Ghost {
  constructor({ front, back, rect, up = false, rot = 0, z = 300, cls = '' }) {
    this.el = h('div.ghost', { style: { width: CARD_W + 'px', height: CARD_H + 'px', zIndex: z } });
    this.card = cardEl({ front, back, up, cls });
    this.el.append(this.card);
    this.set(rect, rot);
    host().append(this.el);
  }
  set(rect, rot = 0) { this.rect = rect; this.rot = rot; this.el.style.transform = this._tf(rect, rot); }
  _tf(r, rot) { return `translate(${r.x}px, ${r.y}px) rotate(${rot}deg) scale(${r.w / CARD_W}, ${r.h / CARD_H})`; }
  /** vuela hasta `rect` (con arco opcional) */
  async fly(rect, { ms = 520, rot = 0, arc = 0, flip: f = null, ease: e = 'cubic-bezier(.3,.7,.25,1)', delay = 0 } = {}) {
    const from = this.rect; const midY = Math.min(from.y, rect.y) - arc;
    const frames = [{ transform: this._tf(from, this.rot) }];
    if (arc) frames.push({ transform: this._tf({ x: (from.x + rect.x) / 2, y: midY, w: (from.w + rect.w) / 2 * 1.08, h: (from.h + rect.h) / 2 * 1.08 }, (this.rot + rot) / 2), offset: 0.5 });
    frames.push({ transform: this._tf(rect, rot) });
    if (f !== null) setTimeout(() => this.card.classList.toggle('up', f), ms * 0.28 + delay);
    const a = await animate(this.el, frames, { duration: ms, easing: e, delay });
    this.rect = rect; this.rot = rot; this.el.style.transform = this._tf(rect, rot);
    a?.cancel?.();   // la animación terminada ya no debe pisar la posición (si no, no se podría recolocar al girar la pantalla)
    return this;
  }
  remove() { this.el.remove(); }
}

/** Ficha voladora desde un punto de pantalla a otro */
export async function flyChip(src, from, to, { ms = 600, delay = 0, size = 44, cls = '' } = {}) {
  const el = h('img.fly-chip', { src, style: { left: '0px', top: '0px', width: size + 'px', height: size + 'px', margin: `-${size / 2}px 0 0 -${size / 2}px` } }); host().append(el);
  const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 60 };
  await animate(el, [{ transform: `translate(${from.x}px, ${from.y}px) scale(.5)`, opacity: 0 }, { transform: `translate(${mid.x}px, ${mid.y}px) scale(1.1)`, opacity: 1, offset: 0.45 }, { transform: `translate(${to.x}px, ${to.y}px) scale(.85)`, opacity: 1 }],
    { duration: ms, delay, easing: 'cubic-bezier(.3,.7,.3,1)' });
  el.remove();
}

export function floatText(text, at, kind = '') {
  const el = h('div.float-num' + (kind ? '.' + kind : ''), { style: { left: at.x + 'px', top: at.y + 'px' } }, text); host().append(el);
  animate(el, [{ opacity: 0, transform: 'translate(-50%,-30%) scale(.6)' }, { opacity: 1, transform: 'translate(-50%,-90%) scale(1.15)', offset: 0.22 }, { opacity: 1, transform: 'translate(-50%,-140%) scale(1)', offset: 0.7 }, { opacity: 0, transform: 'translate(-50%,-200%) scale(.9)' }], { duration: 1500, easing: 'ease-out' }).then(() => el.remove());
}

export function vignette(kind = '') {
  const v = h('div.vignette' + (kind ? '.' + kind : '')); host().append(v);
  requestAnimationFrame(() => v.classList.add('on')); setTimeout(() => v.remove(), 900);
}
export function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 480); }

/** Destello radial en un punto de pantalla */
export function burst(at, color = '255,200,110', size = 220) {
  const el = h('div', { style: { position: 'fixed', left: at.x - size / 2 + 'px', top: at.y - size / 2 + 'px', width: size + 'px', height: size + 'px', borderRadius: '50%', pointerEvents: 'none', zIndex: 330, background: `radial-gradient(circle, rgba(${color},.9), rgba(${color},0) 68%)` } });
  host().append(el); animate(el, [{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: 650, easing: 'ease-out' }).then(() => el.remove());
}
export { sleep, ease, sound };
