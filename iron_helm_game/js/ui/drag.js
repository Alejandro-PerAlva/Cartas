/**
 * Arrastrar y soltar objetos en el tablero de personaje:
 *   mochila → ranura del tapete (equipar) · ranura → mochila (guardar) · cualquiera → SOLTAR (descartar).
 * Solo se puede entre turnos (reglamento: no se cambia de equipo mientras se resuelve una carta).
 * Un toque sin arrastre sigue abriendo el inspector de la carta.
 */
import { h } from './dom.js';
import { L, hit } from './layout.js';
import { cardEl, backOf } from './cards.js';
import { sound } from './audio.js';

const SLOT_ZONE = { MP: ['c_main'], OM: ['c_off'], '2M': ['c_main', 'c_off'], CA: ['c_head'], CP: ['c_body'], AC: ['c_acc'] };

export class Drag {
  constructor(app, table) {
    this.app = app; this.t = table; this.pending = null; this.st = null;
    window.addEventListener('pointermove', (e) => this._move(e));
    window.addEventListener('pointerup', (e) => this._up(e));
    window.addEventListener('pointercancel', (e) => this._up(e, true));
  }
  get g() { return this.app.game; }

  bind(el, uid, info) {
    el.addEventListener('pointerdown', (e) => {
      if (e.button && e.button !== 0) return;
      if (this.st) return;
      this.pending = { el, uid, info, x: e.clientX, y: e.clientY, id: e.pointerId };
    });
  }

  /** zonas válidas donde se puede soltar este objeto */
  targets(uid, from) {
    const g = this.g; const d = g.def(uid); const out = [];
    for (const z of SLOT_ZONE[d.slot] || []) out.push(z);
    if (g.hasSkill('S10') && d.fx?.dagger && d.slot !== 'OM' && !out.includes('c_off')) out.push('c_off');
    if (from !== 'pack') return ['pack', 'trash'];   // un objeto puesto solo se guarda o se suelta
    return [...out, 'trash'];
  }

  _start(e) {
    const p = this.pending; const g = this.g;
    if (!['turn', 'setup'].includes(g.s.prompt?.type) || this.app.busy) { this.pending = null; this.app.toast('Solo puedes cambiar de equipo entre turnos.'); return; }
    const d = g.def(p.uid); const r = p.el.getBoundingClientRect();
    const ghost = h('div.drag-ghost', { style: { width: r.width * 1.06 + 'px', height: r.height * 1.06 + 'px', left: 0, top: 0 } },
      cardEl({ front: g.img(p.uid), back: backOf(d), up: true }));
    document.body.append(ghost);
    p.el.classList.add('lifting');
    const targets = this.targets(p.uid, p.info.from);
    const hints = targets.map((z) => {
      const R = L.ZONES[z];
      const el = h('div.drop-hint' + (z === 'trash' ? '.trash-h' : ''), { dataset: { zone: z }, style: { left: R.x + 'px', top: R.y + 'px', width: R.w + 'px', height: R.h + 'px' } });
      this.t.layerC.append(el); return el;
    });
    this.st = { ...p, ghost, targets, hints, offX: p.x - r.left, offY: p.y - r.top, w: r.width * 1.06, h: r.height * 1.06, origin: r, over: null };
    this.pending = null; document.body.classList.add('dragging'); sound.tap();
    this._place(e);
  }
  _place(e) {
    const s = this.st; s.ghost.style.transform = `translate(${e.clientX - s.offX}px, ${e.clientY - s.offY}px) rotate(-3deg)`;
    const tp = this.t.cam.toTable(e.clientX, e.clientY);
    let over = null; for (const z of s.targets) { const R = L.ZONES[z]; if (R && tp.x >= R.x && tp.x <= R.x + R.w && tp.y >= R.y && tp.y <= R.y + R.h) { over = z; break; } }
    if (over !== s.over) { s.hints.forEach((el) => el.classList.toggle('over', el.dataset.zone === over)); s.over = over; }
  }
  _move(e) {
    if (this.pending && e.pointerId === this.pending.id) {
      if (Math.hypot(e.clientX - this.pending.x, e.clientY - this.pending.y) > 9) this._start(e);
    }
    if (this.st && e.pointerId === this.st.id) { e.preventDefault(); this._place(e); }
  }
  async _up(e, cancel = false) {
    if (this.pending && e.pointerId === this.pending.id) this.pending = null;
    const s = this.st; if (!s || e.pointerId !== s.id) return;
    this.st = null; document.body.classList.remove('dragging');
    s.hints.forEach((el) => el.remove());
    s.el.dataset.dragged = '1'; setTimeout(() => delete s.el.dataset.dragged, 120);
    const over = cancel ? null : s.over;
    const finish = () => { s.ghost.remove(); s.el.classList.remove('lifting'); };
    if (!over) { // vuelve a su sitio
      const o = s.origin; await s.ghost.animate([{ transform: s.ghost.style.transform }, { transform: `translate(${o.left}px, ${o.top}px) rotate(0deg)` }], { duration: 180, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
      finish(); return;
    }
    // vuela hasta el hueco y ejecuta la acción
    const R = L.ZONES[over]; const a = this.t.cam.toScreen(R.x + R.w / 2, R.y + R.h / 2);
    await s.ghost.animate([{ transform: s.ghost.style.transform, opacity: 1 }, { transform: `translate(${a.x - s.w / 2}px, ${a.y - s.h / 2}px) rotate(0deg) scale(${over === 'trash' ? 0.5 : 0.9})`, opacity: over === 'trash' ? 0 : 1 }], { duration: 160, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
    finish();
    const d = this.g.def(s.uid);
    if (over === 'trash') this.app.act('drop', { uid: s.uid });
    else if (over === 'pack') this.app.act('unequip', { uid: s.uid });
    else if (over === 'c_off' && d.slot !== 'OM' && d.slot !== '2M') this.app.act('equipOff', { uid: s.uid });
    else this.app.act('equip', { uid: s.uid });
  }
}
