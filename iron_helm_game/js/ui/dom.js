/** Utilidades de DOM y animación. */
// Salvaguarda: el `append`/`prepend` nativos convierten null/undefined/false en el texto "null"/"false".
// Con esto cualquier hijo opcional (`cond ? x : null`) se ignora, como ya hace `h()`.
for (const proto of [Element.prototype, DocumentFragment.prototype]) {
  for (const name of ['append', 'prepend', 'replaceChildren']) {
    const native = proto[name];
    proto[name] = function (...nodes) { return native.apply(this, nodes.flat(Infinity).filter((n) => n != null && n !== false)); };
  }
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** h('div.clase#id', {attrs}, ...hijos) */
export function h(tag, attrs, ...kids) {
  let id, cls;
  tag = tag.replace(/\.+$/, '').replace(/\.{2,}/g, '.');
  const m = tag.match(/^([a-z0-9]+)((?:[.#][\w-]+)*)$/i);
  if (!m) throw new Error(`Etiqueta inválida: ${tag}`);
  const el = document.createElement(m ? m[1] : tag);
  if (m && m[2]) for (const part of m[2].match(/[.#][\w-]+/g)) { if (part[0] === '.') (cls ||= []).push(part.slice(1)); else id = part.slice(1); }
  if (id) el.id = id; if (cls) el.className = cls.join(' ');
  if (attrs && typeof attrs === 'object' && !(attrs instanceof Node) && !Array.isArray(attrs)) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className += (el.className ? ' ' : '') + v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'style') el.style.cssText += v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  } else if (attrs != null) kids.unshift(attrs);
  for (const k of kids.flat(Infinity)) { if (k == null || k === false) continue; el.append(k.nodeType ? k : document.createTextNode(String(k))); }
  return el;
}

/** factor global de velocidad de las animaciones (1 = normal; menor = más rápido) */
export const speed = { k: 1 };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms * speed.k));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const raf = () => new Promise((r) => requestAnimationFrame(r));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = { out: (t) => 1 - (1 - t) ** 3, inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2), bounce: (t) => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; } };

/** Anima con Web Animations y devuelve una promesa (con salvaguarda si la pestaña está en segundo plano). */
export function animate(el, keyframes, opts) {
  if (!el.animate) return Promise.resolve();
  const o = { ...opts, duration: (opts.duration || 300) * speed.k, delay: (opts.delay || 0) * speed.k };
  const a = el.animate(keyframes, { fill: 'forwards', ...o });
  return new Promise((res) => { a.onfinish = () => res(a); a.oncancel = () => res(a); setTimeout(() => res(a), o.duration + o.delay + 250); });
}
/** icono de moneda de oro (en vez del emoji, que cambia según el sistema) */
export const coinImg = () => h('img.coin', { src: 'assets/tokens/tk_gold.png', alt: 'oro' });
export function bbox(el) { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }

/** Texto con el nombre en español de una debilidad */
export const WK = { fire: 'Fuego', ice: 'Hielo', undead: 'No muerto' };
export const WK_ICON = { fire: '🔥', ice: '❄️', undead: '💀' };
export const pad = (n) => String(n).padStart(3, '0');
export const card = (p) => `assets/cards/${p}`;

const imgCache = new Map();
export function preload(src) {
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  imgCache.set(src, p); return p;
}
export function store() {
  try { const k = '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; } }; }
}
