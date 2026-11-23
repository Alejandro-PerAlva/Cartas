/**
 * Cámara de la mesa: encuadre automático, zoom con rueda / pellizco, arrastre para desplazarse.
 * Las cartas y huecos interactivos NO inician el arrastre (usan `data-nodrag`), así tocar y arrastrar
 * cartas y mover la cámara no se estorban.
 */
import { clamp } from './dom.js';

export class Camera {
  constructor(viewport, table, bounds, { safe = () => ({ t: 0, b: 0, l: 0, r: 0 }), onChange } = {}) {
    this.vp = viewport; this.table = table; this.bounds = bounds; this.safe = safe; this.onChange = onChange;
    this.s = 1; this.x = 0; this.y = 0; this.enabled = true; this.anim = null;
    this.pointers = new Map(); this.drag = null; this.pinch = null;
    this._bind();
  }
  get minScale() { return this.fitScale() * 0.8; }
  get maxScale() { return Math.max(1.6, this.fitScale() * 4); }
  viewSize() { const r = this.vp.getBoundingClientRect(); return { w: r.width, h: r.height }; }
  area() { const v = this.viewSize(); const s = this.safe(); return { x: s.l, y: s.t, w: v.w - s.l - s.r, h: v.h - s.t - s.b }; }
  fitScale(rect = this.bounds) { const a = this.area(); return Math.min(a.w / rect.w, a.h / rect.h); }
  apply() {
    this.table.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.s})`;
    this.onChange?.(this);
  }
  /** Encuadra un rectángulo de mesa en el área visible */
  frame(rect = this.bounds, { pad = 0.02, animate = true, zoomMax = 3 } = {}) {
    const a = this.area();
    const w = rect.w * (1 + pad * 2), h = rect.h * (1 + pad * 2);
    const s = Math.min(a.w / w, a.h / h, zoomMax);
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    const x = a.x + a.w / 2 - cx * s, y = a.y + a.h / 2 - cy * s;
    return this.to({ s, x, y }, animate);
  }
  to({ s, x, y }, animate = true, ms = 650) {
    cancelAnimationFrame(this.anim);
    s = clamp(s, this.minScale, this.maxScale); ({ x, y } = this.clampPos(x, y, s));
    if (!animate) { this.s = s; this.x = x; this.y = y; this.apply(); return Promise.resolve(); }
    const s0 = this.s, x0 = this.x, y0 = this.y, t0 = performance.now();
    return new Promise((res) => {
      const step = (t) => {
        const k = clamp((t - t0) / ms, 0, 1); const e = 1 - (1 - k) ** 3;
        this.s = s0 + (s - s0) * e; this.x = x0 + (x - x0) * e; this.y = y0 + (y - y0) * e; this.apply();
        if (k < 1) this.anim = requestAnimationFrame(step); else res();
      };
      this.anim = requestAnimationFrame(step);
    });
  }
  clampPos(x, y, s = this.s) {
    const a = this.area(); const b = this.bounds; const bw = b.w * s, bh = b.h * s; const m = 90;
    let left = x + b.x * s, top = y + b.y * s;
    left = bw <= a.w ? a.x + (a.w - bw) / 2 : Math.max(a.x + a.w - bw - m, Math.min(a.x + m, left));
    top = bh <= a.h ? a.y + (a.h - bh) / 2 : Math.max(a.y + a.h - bh - m, Math.min(a.y + m, top));
    return { x: left - b.x * s, y: top - b.y * s };
  }
  zoomAt(factor, cx, cy) {
    const s = clamp(this.s * factor, this.minScale, this.maxScale);
    const k = s / this.s; const r = this.vp.getBoundingClientRect();
    const px = cx - r.left, py = cy - r.top;
    this.x = px - (px - this.x) * k; this.y = py - (py - this.y) * k; this.s = s;
    const c = this.clampPos(this.x, this.y); this.x = c.x; this.y = c.y; this.apply();
  }
  /** de coordenadas de pantalla a coordenadas de mesa */
  toTable(px, py) { const r = this.vp.getBoundingClientRect(); return { x: (px - r.left - this.x) / this.s, y: (py - r.top - this.y) / this.s }; }
  toScreen(tx, ty) { const r = this.vp.getBoundingClientRect(); return { x: r.left + this.x + tx * this.s, y: r.top + this.y + ty * this.s }; }

  _bind() {
    const vp = this.vp;
    vp.addEventListener('wheel', (e) => { if (!this.enabled) return; e.preventDefault(); cancelAnimationFrame(this.anim); this.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });
    vp.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      if (e.target.closest('#hud, #camctl, #nav, #fan, #overlay, #actions, #pop, [data-drag]')) return;
      cancelAnimationFrame(this.anim);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) this.drag = { x: e.clientX, y: e.clientY, ox: this.x, oy: this.y, moved: false, id: e.pointerId };
      if (this.pointers.size === 2) { this.drag = null; this._startPinch(); }
    });
    window.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId); if (!p) return;
      p.x = e.clientX; p.y = e.clientY;
      if (this.pinch && this.pointers.size >= 2) { this._movePinch(); return; }
      if (this.drag && e.pointerId === this.drag.id) {
        const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
        if (!this.drag.moved && Math.hypot(dx, dy) < 6) return;
        this.drag.moved = true; const c = this.clampPos(this.drag.ox + dx, this.drag.oy + dy); this.x = c.x; this.y = c.y; this.apply();
      }
    });
    const up = (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (this.pointers.size === 1) { const [id, p] = [...this.pointers][0]; this.drag = { x: p.x, y: p.y, ox: this.x, oy: this.y, moved: true, id }; }
      if (this.pointers.size === 0) { if (this.drag?.moved) this.justDragged = performance.now(); this.drag = null; }
    };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    window.addEventListener('resize', () => { this.onResize?.(); });
    // el navegador puede desplazar contenedores ocultos al enfocar elementos: la cámara manda
    vp.addEventListener('scroll', () => { vp.scrollTop = 0; vp.scrollLeft = 0; });
    document.addEventListener('scroll', () => { document.scrollingElement.scrollTop = 0; document.scrollingElement.scrollLeft = 0; }, true);
  }
  _startPinch() { const [a, b] = [...this.pointers.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: this.s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; }
  _movePinch() {
    const [a, b] = [...this.pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (!this.pinch.d) return;
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const target = clamp(this.pinch.s * (d / this.pinch.d), this.minScale, this.maxScale);
    this.zoomAt(target / this.s, cx, cy);
    const r = this.vp.getBoundingClientRect(); const c = this.clampPos(this.x + (cx - this.pinch.cx), this.y + (cy - this.pinch.cy)); this.x = c.x; this.y = c.y; this.pinch.cx = cx; this.pinch.cy = cy; this.apply(); void r;
  }
  /** ¿acaba de terminar un arrastre? (para ignorar el "click" que le sigue) */
  wasDrag() { return this.drag?.moved || (this.justDragged && performance.now() - this.justDragged < 220); }
}
