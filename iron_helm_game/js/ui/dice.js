/**
 * Dados 3D (CSS) con lanzamiento físico simulado: trayectoria con rebotes sobre el fieltro,
 * rotación caótica que termina exactamente en la cara que ha sacado el motor.
 */
import { h, sleep, speed } from './dom.js';
import { sound } from './audio.js';

/* posiciones de los puntos (rejilla 3×3) para cada cara */
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
/* rotación del cubo para dejar cada cara hacia arriba (viendo desde arriba: eje Z hacia el espectador) */
const ORIENT = { 1: [0, 0, 0], 2: [0, -90, 0], 3: [-90, 0, 0], 4: [90, 0, 0], 5: [0, 90, 0], 6: [0, 180, 0] };

export function dieEl(black = false, size = 70) {
  const el = h('div.die' + (black ? '.black' : ''), { style: { width: size + 'px', height: size + 'px' } });
  for (let f = 1; f <= 6; f++) {
    const face = h('div.f.p' + f);
    for (let i = 0; i < 9; i++) face.append(PIPS[f].includes(i) ? h('i') : h('span'));
    face.style.gridTemplateColumns = 'repeat(3,1fr)'; face.style.gridTemplateRows = 'repeat(3,1fr)';
    face.style.transform = face.style.transform; el.append(face);
  }
  const half = size / 2;
  const t = { 1: `translateZ(${half}px)`, 2: `rotateY(90deg) translateZ(${half}px)`, 3: `rotateX(90deg) translateZ(${half}px)`, 4: `rotateX(-90deg) translateZ(${half}px)`, 5: `rotateY(-90deg) translateZ(${half}px)`, 6: `rotateY(180deg) translateZ(${half}px)` };
  el.querySelectorAll('.f').forEach((f, i) => { f.style.transform = t[i + 1]; });
  return el;
}
const rotTf = (v, extra = [0, 0, 0]) => { const [x, y, z] = ORIENT[v]; return `rotateX(${x + extra[0]}deg) rotateY(${y + extra[1]}deg) rotateZ(${z + extra[2]}deg)`; };

/**
 * Bandeja de dados: contenedor posicionado donde se lanzan.
 * Mantiene los dados que han salido (para poder relanzar algunos).
 */
export class DiceTray {
  constructor(zone, { size = 70 } = {}) { this.zone = zone; this.size = size; this.dice = []; this.throwFrom = null; }
  clear() { this.dice.forEach((d) => { d.el.remove(); d.shadow.remove(); }); this.dice = []; }
  /** posiciones de reposo para n dados */
  _rest(i, n) {
    const w = this.zone.clientWidth, hgt = this.zone.clientHeight; const gap = this.size * 1.35;
    const total = (n - 1) * gap; const x = w / 2 - total / 2 + i * gap - this.size / 2;
    const y = hgt / 2 - this.size / 2 + (i % 2 ? 10 : -8);
    return { x, y };
  }
  /** Muestra dados en reposo con valor (sin animar) */
  place(values, { black = false } = {}) {
    this.clear(); this.zone.querySelectorAll('.die-label').forEach((e) => e.remove());
    values.forEach((v, i) => this._add(v, this._rest(i, values.length), black));
  }
  _add(v, pos, black, rot = [0, 0, 0]) {
    const el = dieEl(black, this.size); const shadow = h('div.die-shadow', { style: { width: this.size * 0.9 + 'px', height: this.size * 0.9 + 'px' } });
    el.style.transform = `translate(${pos.x}px, ${pos.y}px) ${rotTf(v, rot)}`; shadow.style.transform = `translate(${pos.x + 4}px, ${pos.y + 8}px)`;
    this.zone.append(shadow, el);
    const d = { el, shadow, v, pos, black }; this.dice.push(d); return d;
  }
  /** Lanza dados: values = resultado final de cada dado. Devuelve cuando todos han parado. */
  async throw(values, { black = false, from = null, keep = false } = {}) {
    if (!keep) this.clear();
    const n = values.length; const w = this.zone.clientWidth, hgt = this.zone.clientHeight;
    const start = from || { x: w * 0.5, y: hgt + 90 };
    sound.diceRoll(n);
    const runs = values.map((v, i) => this._rollOne(v, i, n, start, black));
    await Promise.all(runs);
  }
  /** relanza solo los dados de los índices dados */
  async reroll(idx, values, { black = false } = {}) {
    sound.diceRoll(idx.length);
    await Promise.all(idx.map((i, k) => { const d = this.dice[i]; if (!d) return null; d.el.remove(); d.shadow.remove(); this.dice[i] = null; return this._rollOne(values[i], i, this.dice.length, { x: this.zone.clientWidth * 0.5, y: this.zone.clientHeight + 90 }, black, true); }));
    this.dice = this.dice.filter(Boolean);
  }
  _rollOne(value, i, n, start, black, replace = false) {
    const rest = this._rest(i, n);
    const el = dieEl(black, this.size); const shadow = h('div.die-shadow', { style: { width: this.size * 0.9 + 'px', height: this.size * 0.9 + 'px' } });
    this.zone.append(shadow, el);
    const d = { el, shadow, v: value, pos: rest, black };
    if (replace) this.dice[i] = d; else this.dice.push(d);
    return new Promise((res) => {
      const dur = (1250 + Math.random() * 380) * speed.k; const t0 = performance.now() + i * 70 * speed.k;
      const ang = [(Math.random() * 2 - 1) * 900 + 720, (Math.random() * 2 - 1) * 900 + 720, (Math.random() * 2 - 1) * 540];
      const sx = start.x - this.size / 2 + (Math.random() - 0.5) * 80, sy = start.y;
      // trayectoria: llega a la zona con velocidad, rebota 2 veces y se detiene en `rest`
      const overshoot = { x: (Math.random() - 0.5) * 60, y: -30 - Math.random() * 40 };
      let bounced = 0;
      const step = (now) => {
        let k = (now - t0) / dur; if (k < 0) { requestAnimationFrame(step); return; } k = Math.min(1, k);
        const e = 1 - (1 - k) ** 3;                                           // desaceleración
        const px = sx + (rest.x + overshoot.x * (1 - e) - sx) * e;
        const py0 = sy + (rest.y - sy) * e;
        const bounce = Math.abs(Math.sin(k * Math.PI * 3.2)) * (1 - k) ** 1.6 * 70; // rebotes con amortiguación
        const py = py0 + overshoot.y * (1 - e) - bounce;
        const lift = bounce / 70;
        const rotk = (1 - e) ** 1.4;
        const [ox, oy, oz] = ORIENT[value];
        el.style.transform = `translate(${px}px, ${py}px) scale(${1 + lift * 0.28}) rotateX(${ox + ang[0] * rotk}deg) rotateY(${oy + ang[1] * rotk}deg) rotateZ(${oz + ang[2] * rotk}deg)`;
        shadow.style.transform = `translate(${px + 4 + lift * 22}px, ${py0 + 8 + lift * 20}px) scale(${1 - lift * 0.2})`; shadow.style.opacity = String(0.5 - lift * 0.3);
        if (bounce < 3 && k > 0.3 && k < 0.98 && bounced < 4 && Math.sin(k * Math.PI * 3.2) < 0.08) { bounced++; sound.diceLand(); }
        if (k < 1) requestAnimationFrame(step); else { el.style.transform = `translate(${rest.x}px, ${rest.y}px) ${rotTf(value)}`; shadow.style.transform = `translate(${rest.x + 4}px, ${rest.y + 8}px)`; sound.diceLand(); res(); }
      };
      requestAnimationFrame(step);
    });
  }
  /** etiqueta numérica sobre el dado */
  label(text, i = null) {
    const d = i == null ? null : this.dice[i];
    const x = d ? d.pos.x + this.size / 2 : this.zone.clientWidth / 2; const y = d ? d.pos.y - 34 : this.zone.clientHeight * 0.5 + this.size * 0.75;
    const el = h('div.die-label', { style: { left: x + 'px', top: y + 'px' } }, text); this.zone.append(el); return el;
  }
  async clearLabels() { this.zone.querySelectorAll('.die-label').forEach((e) => e.remove()); }
}
export { sleep };
