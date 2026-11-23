/**
 * La mochila: una bandeja que se abre desde el botón MOCHILA (en las dos pestañas) y muestra TODO lo que lleva el héroe:
 * lo que usa ahora (con la ranura que ocupa) y lo que guarda. Sirve para ver, usar, equipar, guardar y soltar.
 *   · Tocar una carta → ficha grande con sus acciones (USAR / EQUIPAR / GUARDAR / SOLTAR).
 *   · En el tablero de personaje, además, se arrastra: del tray a una ranura del tapete (equipar), de una ranura al tray
 *     (guardar) o al cubo SOLTAR (descartar). Con el dedo se "levanta" la carta tirando de ella hacia arriba.
 */
import { h } from './dom.js';
import { cardEl, backOf } from './cards.js';
import { sound } from './audio.js';

const SLOT_NAME = { MP: 'Mano principal', OM: 'Otra mano', CA: 'Cabeza', CP: 'Cuerpo', AC: 'Accesorio' };

export class Tray {
  constructor(app) {
    this.app = app; this.sig = '';
    this.title = h('b.tray-title', 'MOCHILA'); this.load = h('span.tray-load'); this.hintEl = h('span.tray-hint');
    this.rail = h('div.tray-rail');
    this.el = h('div#tray', { dataset: { nodrag: '1' } },
      h('div.tray-head', this.title, this.load, this.hintEl, h('button.tray-x', { 'aria-label': 'Cerrar la mochila', onclick: () => app.toggleTray(false) }, '✕')),
      this.rail);
  }
  get isOpen() { return this.el.classList.contains('open'); }
  open(v = true) {
    if (v === this.isOpen) return;
    if (v) this.update(true);
    this.el.classList.toggle('open', v); this.app.screen.classList.toggle('tray-open', v); sound.page();
    // el tablero de personaje se re-encuadra por encima de la bandeja (y vuelve al cerrarla)
    setTimeout(() => { const T = this.app.table; if (T && !T.userMoved) T.fit(); }, 30);
  }
  /** alto (px) que la bandeja le quita a la mesa en el tablero de personaje (0 en pantallas pequeñas o si está cerrada) */
  inset() {
    if (!this.isOpen || this.app.small || this.app.table?.tab !== 'char') return 0;
    return Math.max(0, this.el.offsetHeight - 74);   // (la barra de navegación ya está en el margen seguro)
  }
  dragOk() { const T = this.app.table; return !!T && T.tab === 'char' && !this.app.small && ['turn', 'setup'].includes(this.app.game?.s.prompt?.type); }

  update(force = false) {
    const app = this.app; const g = app.game; if (!g) return;
    const e = g.s.eq; const hand = g.s.z.hand.slice();
    const worn = [['MP', e.MP], ['OM', e.OM], ['CA', e.CA], ['CP', e.CP], ...e.AC.map((u) => ['AC', u])].filter(([, u]) => u);
    const canDrag = this.dragOk();
    const sig = JSON.stringify([worn, hand, canDrag, g.s.prompt?.type, worn.concat(hand.map((u) => ['', u])).map(([, u]) => !!g.usableNow?.(u)), g.weight(), g.maxWeight(), innerWidth, innerHeight]);
    this.load.textContent = g.s.hero.carryRule === 'weaponsOnly' ? 'Solo armas' : `Carga ${g.weight()} / ${g.maxWeight()}`; this.load.classList.toggle('over', g.isOverweight());
    const pt = g.s.prompt?.type;
    this.hintEl.textContent = !worn.length && !hand.length ? '' : canDrag ? 'Arrastra una carta a su ranura del tapete, o toca para ver sus opciones' : ['turn', 'setup'].includes(pt) ? 'Toca una carta para ver sus opciones' : 'Solo puedes cambiar de equipo entre turnos';
    if (sig === this.sig && !force) return; this.sig = sig;
    const two = e.MP && g.def(e.MP).slot === '2M';
    const card = ([slot, uid]) => {
      const d = g.def(uid); const use = g.usableNow?.(uid); const equipped = !!slot;
      const el = h('div.tc' + (equipped ? '.eq' : '') + (use ? '.can-use' : ''), { dataset: { uid, nodrag: '1' }, title: d.name },
        cardEl({ front: g.img(uid), back: backOf(d), up: true }),
        equipped ? h('i.tc-tag', slot === 'MP' && two ? 'Dos manos' : SLOT_NAME[slot]) : null, use ? h('b.tc-use', 'USAR') : null);
      el.addEventListener('click', () => { if (el.dataset.dragged) return; app.onItemTap(uid); });
      if (canDrag) { el.dataset.drag = '1'; app.table.drag.bind(el, uid, { from: 'tray', equipped, axis: 'up' }); }
      return el;
    };
    const group = (label, items, cls) => h('div.tray-group' + cls, h('label', label), h('div.tray-cards', ...items.map(card)));
    const groups = [];
    if (worn.length) groups.push(group('EN USO', worn, '.worn'));
    if (hand.length) groups.push(group('GUARDADO EN LA MOCHILA', hand.map((u) => ['', u]), '.bag'));
    if (!groups.length) groups.push(h('div.tray-empty', 'No llevas nada todavía.', h('small', 'Compra equipo en la Posada o encuentra botín en la mazmorra.')));
    this.rail.replaceChildren(h('div.tray-in', ...groups));
  }
  /** la bandeja como destino de arrastre (guardar un objeto puesto) */
  rect() { return this.el.getBoundingClientRect(); }
  setDrop(on) { this.el.classList.toggle('drop-over', !!on); }
}
