/**
 * Arrastrar y soltar objetos en el tablero de personaje:
 *   bandeja → ranura del tapete (equipar) · ranura → bandeja (guardar) · cualquiera → SOLTAR (descartar).
 * Solo se puede entre turnos (reglamento: no se cambia de equipo mientras se resuelve una carta).
 * Un toque sin arrastre sigue abriendo la ficha de la carta.
 */
import { h } from './dom.js';
import { L } from './layout.js';
import { cardEl, backOf } from './cards.js';
import { sound } from './audio.js';

const SLOT_ZONE = { MP: ['c_main'], OM: ['c_off'], '2M': ['c_main', 'c_off'], CA: ['c_head'], CP: ['c_body'], AC: ['c_acc'] };
const inRect = (x, y, r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

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
      this.pending = { el, uid, info, x: e.clientX, y: e.clientY, id: e.pointerId, touch: e.pointerType === 'touch' };
    });
  }

  /** destinos válidos para este objeto: zonas del tapete, 'tray' (guardar) y 'trash' (soltar) */
  targets(uid, info) {
    const g = this.g; const d = g.def(uid); const out = [];
    if (info.equipped || info.from.startsWith('c_')) return ['tray', 'trash'];   // un objeto puesto solo se guarda o se suelta
    for (const z of SLOT_ZONE[d.slot] || []) out.push(z);
    if (g.hasSkill('S10') && d.fx?.dagger && d.slot !== 'OM' && !out.includes('c_off')) out.push('c_off');
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
    const targets = this.targets(p.uid, p.info);
    const hints = targets.filter((z) => L.ZONES[z] && z !== 'trash').map((z) => {
      const R = L.ZONES[z];
      const el = h('div.drop-hint', { dataset: { zone: z }, style: { left: R.x + 'px', top: R.y + 'px', width: R.w + 'px', height: R.h + 'px' } });
      this.t.layerC.append(el); return el;
    });
    // cubo de descarte en pantalla (siempre al alcance, sea cual sea el encuadre)
    // en el tablero de personaje se suelta sobre la reja del tapete; en el de mazmorra, sobre un cubo flotante
    const bin = h('div#dragbin', h('b', '✕ SOLTAR'), h('small', 'descartar el objeto')); if (this.t.tab !== 'char') document.body.append(bin);
    const tray = this.app.tray; let keep = null;
    if (targets.includes('tray')) { if (tray.isOpen) tray.el.classList.add('drop-ready'); else { keep = h('div#dragkeep', h('b', 'GUARDAR'), h('small', 'en la mochila')); document.body.append(keep); } }
    this.st = { ...p, ghost, targets, hints, bin, keep, offX: p.x - r.left, offY: p.y - r.top, w: r.width * 1.06, h: r.height * 1.06, origin: r, over: null };
    this.pending = null; document.body.classList.add('dragging'); sound.tap();
    this._place(e);
  }
  _binHit(x, y) { return this.st?.bin && inRect(x, y, this.st.bin.getBoundingClientRect()); }
  _place(e) {
    const s = this.st; s.ghost.style.transform = `translate(${e.clientX - s.offX}px, ${e.clientY - s.offY}px) rotate(-3deg)`;
    const tp = this.t.cam.toTable(e.clientX, e.clientY);
    let over = null;
    for (const z of s.targets) {
      if (z === 'tray') { if (inRect(e.clientX, e.clientY, s.keep ? s.keep.getBoundingClientRect() : this.app.tray.rect())) { over = 'tray'; break; } continue; }
      if (z === 'trash') { const R = L.ZONES.trash; if (this._binHit(e.clientX, e.clientY) || (this.t.tab === 'char' && R && tp.x >= R.x && tp.x <= R.x + R.w && tp.y >= R.y && tp.y <= R.y + R.h)) { over = 'trash'; break; } continue; }
      const R = L.ZONES[z]; if (R && tp.x >= R.x && tp.x <= R.x + R.w && tp.y >= R.y && tp.y <= R.y + R.h) { over = z; break; }
    }
    if (over !== s.over) {
      s.hints.forEach((el) => el.classList.toggle('over', el.dataset.zone === over));
      s.bin.classList.toggle('over', over === 'trash'); this.t.trashEl.classList.toggle('over', over === 'trash'); s.keep ? s.keep.classList.toggle('over', over === 'tray') : this.app.tray.setDrop(over === 'tray'); s.over = over;
    }
  }
  _move(e) {
    const p = this.pending;
    if (p && e.pointerId === p.id) {
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      // con el dedo, desde la bandeja se levanta tirando hacia arriba (así no estorba al desplazamiento horizontal)
      const ok = p.info.axis === 'up' && p.touch ? dy < -12 && -dy > Math.abs(dx) * 0.8 : Math.hypot(dx, dy) > 9;
      if (ok) this._start(e);
      else if (p.info.axis === 'up' && p.touch && Math.abs(dx) > 14) this.pending = null;
    }
    if (this.st && e.pointerId === this.st.id) { e.preventDefault(); this._place(e); }
  }
  async _up(e, cancel = false) {
    if (this.pending && e.pointerId === this.pending.id) this.pending = null;
    const s = this.st; if (!s || e.pointerId !== s.id) return;
    this.st = null; document.body.classList.remove('dragging');
    const over = cancel ? null : s.over;
    // punto de pantalla del destino (antes de retirar los avisos)
    let a = null;
    if (over === 'tray') { const R = s.keep ? s.keep.getBoundingClientRect() : this.app.tray.rect(); a = { x: R.left + R.width / 2, y: R.top + R.height / 2 }; }
    else if (over === 'trash') { if (s.bin.isConnected) { const R = s.bin.getBoundingClientRect(); a = { x: R.left + R.width / 2, y: R.top + R.height / 2 }; } else { const Z = L.ZONES.trash; a = this.t.cam.toScreen(Z.x + Z.w / 2, Z.y + Z.h / 2); } }
    else if (over) { const R = L.ZONES[over]; a = this.t.cam.toScreen(R.x + R.w / 2, R.y + R.h / 2); }
    s.hints.forEach((el) => el.remove()); s.bin.remove(); s.keep?.remove(); this.t.trashEl.classList.remove('over'); this.app.tray.setDrop(false); this.app.tray.el.classList.remove('drop-ready');
    s.el.dataset.dragged = '1'; setTimeout(() => delete s.el.dataset.dragged, 160);
    const finish = () => { s.ghost.remove(); s.el.classList.remove('lifting'); };
    if (!over) { // vuelve a su sitio
      const o = s.origin; await s.ghost.animate([{ transform: s.ghost.style.transform }, { transform: `translate(${o.left}px, ${o.top}px) rotate(0deg)` }], { duration: 180, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
      finish(); return;
    }
    await s.ghost.animate([{ transform: s.ghost.style.transform, opacity: 1 }, { transform: `translate(${a.x - s.w / 2}px, ${a.y - s.h / 2}px) rotate(0deg) scale(${over === 'trash' ? 0.5 : 0.9})`, opacity: over === 'trash' || over === 'tray' ? 0 : 1 }], { duration: 160, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
    finish();
    const d = this.g.def(s.uid);
    if (over === 'trash') this.app.act('drop', { uid: s.uid });
    else if (over === 'tray') this.app.act('unequip', { uid: s.uid });
    else if (over === 'c_off' && d.slot !== 'OM' && d.slot !== '2M') this.app.act('equipOff', { uid: s.uid });
    else this.app.act('equip', { uid: s.uid });
  }
}
