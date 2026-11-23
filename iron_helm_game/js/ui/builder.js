/**
 * Constructor de personaje del Gnome Pack: Raza → Clase → Signo astral → habilidad y equipo.
 * Cada paso se elige tocando las cartas reales; la columna derecha muestra el héroe resultante en vivo.
 */
import { h } from './dom.js';
import { listPacks, buildCustomHeroPreview } from '../engine/index.js';
import { sound } from './audio.js';
import { cardPath } from './cards.js';
import { icon } from './icons.js';

const PROF = { agilidad: 'Agilidad', mente: 'Mente', fuerza: 'Fuerza' };
const signed = (n) => (n > 0 ? `+${n}` : String(n));

export class Builder {
  constructor(menu, initial = {}) {
    this.menu = menu; this.data = listPacks().gnome; this.sel = { race: null, klass: null, sign: null, skill: null, equipment: null, equipment2: null, potion: null, ...initial };
    this.step = 'race';
  }
  open() {
    this.el = h('div.modal.builder', h('div.veil.dark'),
      h('div.builder-panel', h('div.builder-head', h('h2', 'FORJA TU HÉROE'), h('div.steps', ...[['race', 'Raza'], ['klass', 'Clase'], ['sign', 'Signo'], ['gear', 'Equipo']].map(([id, t], i) => h('button.step', { dataset: { s: id }, onclick: () => this.go(id) }, h('i', String(i + 1)), t))),
        h('button.close-x', { onclick: () => this.close(), 'aria-label': 'Cerrar' }, icon('x', 18))),
        h('div.builder-body', this.main = h('div.builder-main'), this.side = h('aside.builder-side')),
        h('div.builder-foot', this.back = h('button.btn.quiet', { onclick: () => this.prev() }, 'ATRÁS'), this.next = h('button.btn.primary', { onclick: () => this.advance() }, 'SIGUIENTE'))));
    this.menu.menuEl.append(this.el); this.render();
  }
  close() { this.el?.remove(); }
  order() { return ['race', 'klass', 'sign', 'gear']; }
  go(step) { const i = this.order().indexOf(step); const ok = (s) => s === 'race' || (s === 'klass' && this.sel.race) || (s === 'sign' && this.sel.race && this.sel.klass) || (s === 'gear' && this.sel.race && this.sel.klass && this.sel.sign); if (ok(step)) { this.step = step; this.render(); } void i; }
  prev() { const o = this.order(); const i = o.indexOf(this.step); if (i > 0) { this.step = o[i - 1]; this.render(); } else this.close(); }
  advance() {
    const o = this.order(); const i = o.indexOf(this.step); const pv = this.preview();
    if (this.step !== 'gear') { if (!this.sel[this.step === 'race' ? 'race' : this.step]) return; this.step = o[i + 1]; this.render(); return; }
    if (!pv.valid) { this.menu.app.toast(pv.errors[0] || 'Faltan elecciones.'); return; }
    sound.gong(); this.menu.useCustom({ ...this.sel }, pv); this.close();
  }
  preview() { return buildCustomHeroPreview(this.sel); }

  /* ------------------------------------------------------------------ pasos */
  cardGrid(items, key, { text } = {}) {
    return h('div.bgrid', ...items.map((it) => h('button.bcard' + (this.sel[key] === it.name ? '.on' : ''), { onclick: () => { sound.flip(); this.sel[key] = it.name; if (key === 'klass') this.sel.skill = null; if (key === 'sign') this.sel.equipment = null; if (key === 'race') { this.sel.equipment2 = null; this.sel.potion = null; } this.render(); } },
      h('div.bimg', h('img', { src: cardPath(it.img), alt: it.name })), h('div.btxt', h('b', it.name), h('small', text(it))))));
  }
  render() {
    const o = this.order(); const i = o.indexOf(this.step); const pv = this.preview();
    this.el.querySelectorAll('.step').forEach((b) => { const s = b.dataset.s; b.classList.toggle('on', s === this.step); b.classList.toggle('done', o.indexOf(s) < i); });
    const D = this.data;
    let body;
    if (this.step === 'race') body = [h('h3', 'Elige tu raza'), h('p.bhint', 'Determina tu salud, energía y carga básicas, y te da una habilidad única.'),
      this.cardGrid(D.races, 'race', { text: (r) => `❤ ${r.health}  ⚡ ${r.energy}  🎒 ${r.carry}` })];
    else if (this.step === 'klass') body = [h('h3', 'Elige tu clase'), h('p.bhint', 'Suma salud y energía, fija tu oro y raciones iniciales y te deja escoger una habilidad.'),
      this.cardGrid(D.classes, 'klass', { text: (c) => `❤ +${c.health}  ⚡ +${c.energy}  🍖 ${c.rations}  ● ${c.gold}` })];
    else if (this.step === 'sign') body = [h('h3', 'Elige tu signo astral'), h('p.bhint', 'Fija tu competencia, tu moral inicial y te deja escoger tu primer equipo.'),
      this.cardGrid(D.signs, 'sign', { text: (s) => `${PROF[s.proficiency]} · moral ${signed(s.moral)}` })];
    else {
      const klass = D.classes.find((c) => c.name === this.sel.klass); const sign = D.signs.find((s) => s.name === this.sel.sign);
      const pick = (title, list, key) => h('div.bsec', h('h4', title), h('div.chips-pick', ...list.map((n) => h('button.pill' + (this.sel[key] === n ? '.on' : ''), { onclick: () => { sound.tap(); this.sel[key] = n; this.render(); } }, n))));
      body = [h('h3', 'Habilidad y equipo'), pick(`Habilidad inicial de ${klass.name}`, klass.startSkills, 'skill'), pick(`Equipo inicial de ${sign.name}`, sign.startEquipment, 'equipment'),
        this.sel.race === 'Humano' ? h('p.bhint', 'Humano: puedes añadir además 1 equipo que cueste 1 de oro (se elige en la Posada con tu oro).') : null,
        this.sel.race === 'Gnomo' ? pick('Poción inicial de Gnomo', ['Poción de Salud', 'Antídoto', 'Esquirla de Hielo', 'Bomba de Mecha', 'Agua Bendita'], 'potion') : null];
    }
    this.main.replaceChildren(...body.filter(Boolean));
    this.side.replaceChildren(this.sidePreview(pv));
    this.back.textContent = i === 0 ? 'CERRAR' : 'ATRÁS'; this.next.textContent = this.step === 'gear' ? 'USAR ESTE HÉROE' : 'SIGUIENTE';
    this.next.classList.toggle('off', this.step === 'gear' ? !pv.valid : !this.sel[this.step]);
  }
  sidePreview(pv) {
    const rows = [['Salud', pv.health], ['Energía', pv.energy], ['Carga', pv.encumbrance], ['Raciones', pv.rations], ['Oro', pv.gold], ['Moral', pv.morality == null ? null : signed(pv.morality)], ['Competencia', pv.proficiency ? PROF[pv.proficiency] : null]];
    return h('div.preview', h('div.pv-name', this.sel.race ? `${this.sel.race}${this.sel.klass ? ' ' + this.sel.klass : ''}` : 'Tu héroe'), this.sel.sign ? h('div.pv-sign', this.sel.sign) : null,
      h('dl', ...rows.flatMap(([k, v]) => [h('dt', k), h('dd', v == null ? '—' : String(v))])),
      pv.raceAbility ? h('p.pv-ab', h('b', 'Habilidad de raza. '), pv.raceAbility) : null,
      pv.skills?.length ? h('p.pv-ab', h('b', 'Habilidad. '), pv.skills.map((s) => s.name).join(', ')) : null,
      pv.equipment?.length ? h('p.pv-ab', h('b', 'Equipo. '), pv.equipment.map((s) => s.name).join(', ')) : null);
  }
}
