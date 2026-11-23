/**
 * La mesa de juego: DOS tableros (Mazmorra y Personaje) sobre roble oscuro; la cámara se desliza entre ellos.
 *
 * Renderizado por huecos ("slots"): cada elemento de la mesa tiene una clave y una firma; solo se reconstruye si su
 * firma cambia. Así un `render()` completo con el estado sin cambios no toca el DOM (nada parpadea ni se re-decodifica).
 * El estado que se dibuja es un "estado de vista" (`vs`) que el director va moviendo al ritmo de las animaciones.
 */
import { h } from './dom.js';
import { L, configureLayout, CARD_D, CARD_C, CARD_X, cardRect, center } from './layout.js';
import { cardEl, backOf, backOfDeck, cardPath } from './cards.js';
import { Camera } from './camera.js';
import { Drag } from './drag.js';
import { mapSpotsFor } from './mapspots.js';

const SQUARE = new Set(['ration']);
/** fichas que se dibujan como máximo en un pocillo (tres capas de siete) */
const PILE_MAX = 21;

export class Table {
  constructor(app, root) {
    this.app = app; this.root = root;
    this.slots = new Map(); this.tab = 'dungeon';
    this.cue = {}; this.faceUp = new Set(); this.hiddenUids = new Set();
    this._build();
    this.drag = new Drag(app, this);
  }
  get game() { return this.app.game; }
  get cat() { return this.game?.cat; }
  get hasExtras() { return L.extras; }

  /* ================================================================ construcción */
  _build() {
    const ex = this.cat?.extras; const extras = true;   // la franja de extras siempre existe: ahí están los jefes finales
    configureLayout({ extras, side: !!(ex?.mercenaries || ex?.afflictions) });
    this.viewport = h('div#viewport');
    this.table = h('div#table', { style: { width: L.TABLE.w + 'px', height: L.TABLE.h + 'px' } });
    this.surface = h('div.surface');
    const B = L.BOARDS;
    this.boardD = h('div.board.bd', { style: this._rectStyle(B.dungeon) });
    this.boardC = h('div.board.bc', { style: this._rectStyle(B.char) });
    this.dmat = h('div.mat', { style: this._rectStyle(L.DMAT) }, h('img', { src: L.DMAT.img, alt: '' }));
    this.cmat = h('div.mat', { style: this._rectStyle(L.CMAT) }, h('img', { src: L.CMAT.img, alt: '' }));
    // capas de elementos (coordenadas de mesa: se posicionan con left/top absolutos dentro de la mesa)
    this.layerD = h('div.layer', { style: { position: 'absolute', left: 0, top: 0, width: '0', height: '0' } });
    this.layerC = h('div.layer', { style: { position: 'absolute', left: 0, top: 0, width: '0', height: '0' } });
    this.layers = { d: this.layerD, c: this.layerC };
    this.table.append(this.surface, this.boardD, this.boardC, this.dmat, this.cmat, this.layerD, this.layerC);
    this.viewport.append(this.table, h('div#lightfx'));
    this.root.append(this.viewport);
    // (el suelo de madera es fijo: repintarlo en cada fotograma del arrastre costaba fluidez en móvil)
    this.cam = new Camera(this.viewport, this.table, { ...B.dungeon }, { safe: () => this.safeInsets() });
    this.cam.onResize = () => this.fit(false);
    this.cam.onUser = () => { this.userMoved = true; };       // solo cuenta si el jugador de verdad mueve o acerca la mesa (no un simple toque)
    this._panels();
    this._staticParts();
  }
  _rectStyle(r) { return { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }; }
  safeInsets() {
    const small = innerWidth < 760 || innerHeight < 520; const narrow = innerWidth < 520;
    // con la mochila abierta en el tablero de personaje, la mesa se encuadra por encima de ella
    return { t: narrow ? 92 : small ? 52 : 62, b: (small ? 56 : 74) + (this.app.trayInset?.() || 0), l: 6, r: 6 };
  }

  /** Paneles de madera del tablero de personaje y franja de expansiones */
  _panels() {
    const Z = L.ZONES;
    const add = (layer, el) => { this.layers[layer].append(el); return el; };
    // lateral: ficha del aventurero, compañeros, aflicciones y papelera
    if (Z.side) this.sidePanel = add('c', h('div.panel.side', { style: this._rectStyle(Z.side) }, h('div.panel-title', 'COMPAÑEROS')));
    this.trashEl = add('c', h('div.trash', { style: this._rectStyle(Z.trash), dataset: { drop: 'trash' } }, h('span', '✕'), h('b', 'SOLTAR AQUÍ'), h('small', 'descartar el objeto')));
    // franja de expansiones
    if (L.extras) {
      this.stripPanel = add('d', h('div.panel.strip', { style: this._rectStyle(Z.strip) }, h('div.panel-title', 'EXTRAS')));
    }
  }

  /** Elementos que no cambian: zonas pulsables, números de pocillo, peones */
  _staticParts() {
    const Z = L.ZONES;
    for (const name of Object.keys(Z)) {
      if (['trash', 'side', 'strip', 'mercs', 'afflictions'].includes(name)) continue;
      if (name.startsWith('x_') && !L.extras) continue;
      const z = Z[name];
      const hit = h('div.slot-hit', { dataset: { zone: name }, style: this._rectStyle(z) });
      hit.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onZoneTap(name, e); });
      this.layers[z.mat].append(hit); (this.hits ||= {})[name] = hit;
    }
    // pocillos: las fichas del héroe se ven en los dos tapetes (sin números: la cifra está en la barra superior)
    this.wellHits = {};
    for (const [wells, layer, tag] of [[L.CWELLS, this.layerC, 'c'], [L.WELLS, this.layerD, 'd']]) {
      for (const [k, w] of Object.entries(wells)) {
        const hit = h('div.well-hit', { dataset: { well: k, mat: tag }, style: { left: w.cx - w.r + 'px', top: w.cy - w.r + 'px', width: w.r * 2 + 'px', height: w.r * 2 + 'px' } });
        hit.addEventListener('click', (e) => { e.stopPropagation(); this.app.onWellTap(k, hit); });
        layer.append(hit); this.wellHits[tag + k] = hit;
      }
    }
    // peones
    this.pawnLevel = h('div.pawn'); this.pawnMoral = h('div.pawn.blue');
    this.layerD.append(this.pawnLevel, this.pawnMoral);
  }

  /* ================================================================ pestañas y cámara */
  focusRect(name) { return L.FOCUS[name]; }
  /** encuadre por defecto de la pestaña activa, según el tamaño de pantalla */
  defaultFrame() {
    const small = innerWidth < 760 || innerHeight < 520; const portrait = innerHeight > innerWidth;
    if (this.tab === 'dungeon') return small ? (portrait ? L.FOCUS.doorsP : L.FOCUS.doors) : L.FOCUS.dungeon;
    if (small && !portrait) return L.FOCUS.charTop;
    return portrait || small ? L.FOCUS.charMat : L.FOCUS.char;
  }
  fit(animate = true) { this.userMoved = false; return this.cam.frame(this.defaultFrame(), { animate, pad: 0.01, ms: 420 }); }
  focus(name, animate = true) { return this.cam.frame(L.FOCUS[name], { animate, pad: 0.02 }); }
  setTab(tab, { animate = true } = {}) {
    if (tab === this.tab && this._tabReady) return this.fit(animate);
    this.tab = tab; this._tabReady = true; if (this.vs) this.render();   // (las cartas del tapete son arrastrables solo en el tablero de personaje)
    const b = L.BOARDS[tab === 'dungeon' ? 'dungeon' : 'char'];
    this.cam.bounds = { x: b.x, y: b.y, w: b.w, h: b.h };
    this.root.dataset.tab = tab; this.userMoved = false;
    this._offs(false);                                  // los dos tableros visibles mientras la cámara se desliza
    const token = (this._tabToken = (this._tabToken || 0) + 1);
    const p = this.cam.frame(this.defaultFrame(), { animate, pad: 0.01, ms: 380 });
    const done = () => { if (token === this._tabToken) this._offs(true); };
    if (animate) Promise.resolve(p).then(done); else done();
    return p;
  }
  /** oculta el tablero que no está a la vista (no se pinta: menos trabajo para el navegador) */
  _offs(apply) {
    const d = this.tab !== 'dungeon', c = this.tab !== 'char';
    for (const [els, off] of [[[this.boardD, this.dmat, this.layerD], d], [[this.boardC, this.cmat, this.layerC], c]]) for (const el of els) el.classList.toggle('off', apply && off);
  }

  /* ================================================================ estado de vista */
  extract(g = this.game) {
    const s = g.s; const z = s.z; const h2 = s.hero;
    return {
      counts: { dungeon: z.dungeon.length, enemies: z.enemies.length, loot: z.loot.length, potions: z.potions.length, plots: z.plots.length, trappings: z.trappings.length, skills: z.skills.length, bosses: z.bosses.length,
        artifacts: z.artifacts?.length ?? 0, afflictions: z.afflictions?.length ?? 0, environments: z.environments?.length ?? 0 },
      piles: { dungeonDiscard: z.dungeonDiscard.slice(), lootUsed: z.lootDiscard.slice(), potionsUsed: z.potionsDiscard.slice(), plotsPlayed: z.plotsPlayed.slice(), graveyard: z.graveyard.map((e) => ({ ...e })) },
      pair: z.pair.slice(), hidePair: [false, false],
      eq: { MP: s.eq.MP, OM: s.eq.OM, CA: s.eq.CA, CP: s.eq.CP, AC: s.eq.AC.slice() }, hand: z.hand.slice(),
      skills: h2.skills.map((id) => ({ id, uid: h2.skillCards[id] })), afflictions: h2.afflictions.slice(),
      imp: s.imp ?? null, env: s.env ?? null, mercs: (s.mercs || []).map((m) => ({ ...m })), encounter: s.encounter ? { ...s.encounter } : null, adventureLevel: s.adventureLevel || 1,
      stats: { hp: h2.hp, maxHp: g.maxHp(), energy: h2.energy, gold: h2.gold, rations: h2.rations, poison: h2.poison, blessing: h2.blessings.length, morality: g.morality(), level: s.level, turn: s.turn, eyes: s.eyes, weight: g.weight(), maxWeight: g.maxWeight() },
      heroId: s.heroId, canEquip: ['turn', 'setup'].includes(s.prompt?.type), invCount: g.allItems().length,
      learnable: z.skills.some((u) => g.canLearn(g.def(u).id)),
    };
  }
  sync() { this.vs = this.extract(); this.render(); }

  /* ================================================================ utilidades de huecos */
  /** (re)construye el hueco `key` solo si cambia su firma */
  slot(key, layer, sig, build) {
    const cur = this.slots.get(key); const s = typeof sig === 'string' ? sig : JSON.stringify(sig);
    if (cur && cur.sig === s) return cur.el;
    cur?.el?.remove();
    const el = build();
    if (el) this.layers[layer].append(el);
    this.slots.set(key, { sig: s, el });
    return el;
  }
  /** carta de mesa (dos caras) posicionada */
  tableCard(uid, rect, { up = true, cls = '', z = 4, onclick, drag = null, noShadow = false } = {}) {
    const g = this.game; const d = g.def(uid);
    const el = cardEl({ front: g.img(uid), back: backOf(d), up, cls: 'tap ' + cls });
    Object.assign(el.style, { left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px', zIndex: z });
    el.dataset.nodrag = '1'; el.dataset.uid = uid;
    if (!noShadow) el.querySelector('.card-in').insertAdjacentElement('beforebegin', h('div.shadow-drop'));
    if (onclick) el.addEventListener('click', (e) => { if (this.cam.wasDrag() || el.dataset.dragged) return; e.stopPropagation(); onclick(e); });
    if (drag) { el.dataset.drag = '1'; this.drag.bind(el, uid, drag); }
    return el;
  }

  /* ================================================================ renderizado */
  render() {
    if (!this.vs) return;
    this._decks(); this._piles(); this._doors(); this._char(); this._side(); this._tokens(); this._trackers(); this._imp(); this._extras(); this._applyCue(); this._live();
  }

  /** Mazo: pila de dorsos con grosor y contador */
  _deck(key, zoneName, count, backSrc, { size = CARD_D, label = '', empty = '', badge = '', layer = 'd', cls = '', dy = 0 } = {}) {
    return this.slot(key, layer, [zoneName, count, backSrc, label, empty, badge], () => {
      const r = cardRect(zoneName, size, 0, dy);
      const el = h('div.deck' + (cls ? '.' + cls : ''), { dataset: { deck: key, nodrag: '1' }, style: { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', zIndex: 3 } });
      if (count > 0) {
        const layers = Math.min(7, Math.ceil(count / 2.2)); const shadows = [];
        for (let i = 1; i <= layers; i++) shadows.push(`${i * 1.2}px ${i * 1.6}px 0 ${i % 2 ? '#e8dcc0' : '#2a2018'}`);
        shadows.push(`${layers * 1.2 + 3}px ${layers * 1.6 + 5}px 14px rgba(0,0,0,.65)`);
        el.append(h('div.stack', { style: { backgroundImage: `url(${backSrc})`, boxShadow: shadows.join(',') } }), h('div.count', String(count)));
      } else if (empty) el.append(h('div.empty-deck', empty));
      if (badge) el.append(h('div.deck-badge', badge));
      if (label) el.append(h('div.zone-label', { style: { left: 0, right: 0, top: '100%', marginTop: '6px', textAlign: 'center' } }, label));
      el.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onZoneTap(zoneName, e); });
      return el;
    });
  }
  _decks() {
    const c = this.vs.counts; const b = (n) => backOfDeck(n); const learn = this.vs.learnable ? '!' : '';
    this._deck('d_dungeon', 'dungeon', c.dungeon, b('dungeon'));
    this._deck('d_enemies', 'enemies', c.enemies, b('enemies'));
    this._deck('d_loot', 'loot', c.loot, b('loot'));
    this._deck('d_potions', 'potions', c.potions, b('potions'));
    this._deck('d_plots', 'plots', c.plots, b('plots'));
    this._deck('d_trappings', 'trappings', c.trappings, b('trappings'), { empty: 'Equipo agotado' });
    this._deck('d_skills', 'skills', c.skills, b('skills'), { badge: learn });
    // jefes finales: junto al resto de cartas extras (se pueden consultar en cualquier momento)
    if (c.bosses > 0 && this.cat.pools.bosses.length) this._deck('d_bosses', 'x_boss', c.bosses, b('bosses'), { size: CARD_X });
    else this.slot('d_bosses', 'd', [0], () => null);
  }

  /** Pilas de descarte, cementerio y tramas resueltas */
  _piles() {
    const p = this.vs.piles; const g = this.game;
    const topPile = (key, zone, list, faceDown = false, dim = false) => this.slot(key, 'd', [list.length, list[list.length - 1], faceDown, dim], () => {
      if (!list.length) return null;
      const uid = list[list.length - 1]; const r = cardRect(zone, CARD_D); const d = g.def(uid);
      const el = h('div.pile', { dataset: { nodrag: '1' }, style: { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', zIndex: 3 } });
      const n = Math.min(5, Math.ceil(list.length / 2)); const sh = [];
      for (let i = 1; i <= n; i++) sh.push(`${i}px ${i * 1.4}px 0 ${i % 2 ? '#e8dcc0' : '#2a2018'}`); sh.push('3px 8px 14px rgba(0,0,0,.6)');
      el.append(h('div.stack', { style: { backgroundImage: `url(${faceDown ? backOf(d) : cardPath(g.img(uid))})`, boxShadow: sh.join(','), transform: `rotate(${((uid * 37) % 7) - 3}deg)`, filter: dim ? 'brightness(.55)' : '' } }), h('div.count', String(list.length)));
      el.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onZoneTap(zone, e); });
      return el;
    });
    topPile('p_loot', 'lootUsed', p.lootUsed); topPile('p_potions', 'potionsUsed', p.potionsUsed); topPile('p_dd', 'ddiscard', p.dungeonDiscard, true);
    // cementerio: pila de enemigos derrotados, igual que las de objetos y pociones (la carta de arriba se oscurece si ya se gastó en una habilidad)
    topPile('p_grave', 'graveyard', p.graveyard.map((e) => e.uid), false, !!p.graveyard[p.graveyard.length - 1]?.spent);
    // tramas resueltas: escalonadas con los ojos a la vista
    this.slot('p_plots', 'd', [p.plotsPlayed.slice(-4), this.vs.stats.eyes], () => {
      const pl = p.plotsPlayed; if (!pl.length) return null;
      const r = cardRect('plotsUsed', CARD_D); const show = pl.slice(-4);
      const el = h('div.plots-played', { dataset: { nodrag: '1' }, style: { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', zIndex: 3 } });
      // la última trama queda exactamente en la casilla; las anteriores asoman por detrás como en el resto de montones
      show.forEach((u, i) => { const k = show.length - 1 - i; el.append(h('div.pcard', { style: { transform: `translate(${k * 2}px, ${k * 2.6}px) rotate(${k ? ((u * 37) % 5) - 2 : 0}deg)` } }, h('img', { src: cardPath(g.img(u)) }))); });
      el.append(h('div.count.eyes', `👁 ${this.vs.stats.eyes}`));
      el.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onZoneTap('plotsUsed', e); });
      return el;
    });
  }

  /** Puertas verdes: las dos cartas del turno */
  _doors() {
    const v = this.vs;
    ['door1', 'door2'].forEach((zone, i) => {
      const uid = v.pair[i]; const hidden = v.hidePair[i] || this.hiddenUids.has(uid);
      const up = this.faceUp.has(uid);
      this.slot('door' + i, 'd', [uid, hidden, up], () => {
        if (!uid || hidden) return null;
        const g = this.game; const r = cardRect(zone, CARD_D);
        const el = this.tableCard(uid, r, { up, onclick: () => this.app.onDoorTap(i) });
        if (!up) delete el.dataset.uid;
        return el;
      });
    });
  }

  /** Tapete de personaje: héroe, habilidades, equipo y accesorios */
  _char() {
    const v = this.vs; const g = this.game; const eq = v.eq;
    const heroDef = this.cat.pools.heroes.find((x) => x.id === v.heroId) || this.cat.pools.heroes[0];
    const dragOk = !!this.app.tray?.dragOk();
    const slotCard = (key, zone, uid, opts = {}) => this.slot(key, 'c', [uid, opts.dim, opts.src, opts.tag, v.canEquip, dragOk], () => {
      if (!uid && !opts.src) return null;
      const rect = cardRect(zone, CARD_C);
      if (opts.src) { // carta decorativa (héroe)
        const el = cardEl({ front: opts.src, back: backOfDeck('heroes'), up: true, cls: 'tap' });
        Object.assign(el.style, { left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px', zIndex: 4 }); el.dataset.nodrag = '1';
        el.querySelector('.card-in').insertAdjacentElement('beforebegin', h('div.shadow-drop'));
        el.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onZoneTap(zone, e); });
        return el;
      }
      const el = this.tableCard(uid, rect, { cls: opts.dim ? 'dim' : '', onclick: () => this.app.onCardTap(uid, zone), drag: v.canEquip && !opts.dim && dragOk ? { from: zone } : null });
      if (opts.tag) el.append(h('div.slot-tag', opts.tag));
      return el;
    });
    slotCard('c_hero', 'c_hero', null, { src: heroDef.img });
    slotCard('c_head', 'c_head', eq.CA); slotCard('c_body', 'c_body', eq.CP); slotCard('c_main', 'c_main', eq.MP);
    const two = eq.MP && g.def(eq.MP).slot === '2M';
    if (eq.OM) slotCard('c_off', 'c_off', eq.OM); else if (two) slotCard('c_off', 'c_off', eq.MP, { dim: true, tag: 'DOS MANOS' }); else this.slot('c_off', 'c', ['none'], () => null);
    // habilidades: cascada centrada en la ranura (la primera carta queda a la misma altura que las demás)
    this.slot('c_skills', 'c', v.skills.map((s) => s.id), () => {
      const list = v.skills; if (!list.length) return null;
      const zn = L.ZONES.c_skills; const n = list.length;
      const step = n > 1 ? Math.min(46, Math.max(5, (zn.h - CARD_C.h) / (n - 1))) : 0;
      const total = CARD_C.h + (n - 1) * step; const y0 = Math.round((zn.h - total) / 2);
      const box = h('div', { style: { position: 'absolute', left: zn.x + 'px', top: zn.y + 'px', width: zn.w + 'px', height: zn.h + 'px', zIndex: 4 } });
      list.forEach((sk, i) => {
        const d = this.cat.def(sk.id); const el = cardEl({ front: d.img, back: backOfDeck('skills'), up: true, cls: 'tap' });
        Object.assign(el.style, { left: (zn.w - CARD_C.w) / 2 + 'px', top: y0 + i * step + 'px', width: CARD_C.w + 'px', height: CARD_C.h + 'px', zIndex: i }); el.dataset.nodrag = '1';
        el.querySelector('.card-in').insertAdjacentElement('beforebegin', h('div.shadow-drop'));
        el.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onSkillTap(sk.id); });
        box.append(el);
      });
      if (n > 1) box.append(h('div.count', { style: { right: '-6px', top: y0 - 8 + 'px', bottom: 'auto' } }, String(n)));
      return box;
    });
    // accesorios: pila desplegada (centrada en la ranura)
    this.slot('c_acc', 'c', [eq.AC, v.canEquip, dragOk], () => {
      const list = eq.AC; if (!list.length) return null;
      const zn = L.ZONES.c_acc; const n = list.length;
      const step = n > 1 ? Math.min(56, Math.max(5, (zn.h - CARD_C.h) / (n - 1))) : 0;
      const y0 = Math.round((zn.h - (CARD_C.h + (n - 1) * step)) / 2);
      const box = h('div', { style: { position: 'absolute', left: zn.x + 'px', top: zn.y + 'px', width: zn.w + 'px', height: zn.h + 'px', zIndex: 4 } });
      list.forEach((u, i) => {
        const el = this.tableCard(u, { x: (zn.w - CARD_C.w) / 2, y: y0 + i * step, w: CARD_C.w, h: CARD_C.h }, { onclick: () => this.app.onAccTap(u), drag: v.canEquip && dragOk ? { from: 'c_acc' } : null });
        box.append(el);
      });
      if (n > 1) box.append(h('div.count', { style: { right: '-6px', top: y0 - 8 + 'px', bottom: 'auto' } }, String(n)));
      return box;
    });
  }

  /** Panel lateral: ficha del aventurero y, si hay expansión, compañeros y aflicciones */
  _side() {
    if (!L.ZONES.side) return;
    const v = this.vs; const g = this.game; const S = L.ZONES.side; const s = v.stats; const Zm = L.ZONES.mercs, Za = L.ZONES.afflictions;
    this.trashEl.classList.toggle('on', v.canEquip);
    const sub = (txt, y) => h('div.side-sub', { style: { left: S.x + 'px', top: y + 'px', width: S.w + 'px' } }, txt);
    const mercs = v.mercs || []; const afs = v.afflictions || [];
    this.slot('side_mercs', 'c', [mercs.map((m) => [m.uid, m.morale, m.max])], () => {
      if (!this.cat.extras?.mercenaries) return null;
      const box = h('div', { style: { position: 'absolute', left: 0, top: 0 } }, sub('ESBIRROS', Zm.y - 6));
      const w = 130, hh = 183; const x0 = S.x + (S.w - 2 * w - 16) / 2;
      if (!mercs.length) box.append(h('div.side-empty', { style: { left: S.x + 'px', top: Zm.y + 70 + 'px', width: S.w + 'px' } }, 'Sin compañeros'));
      mercs.slice(0, 3).forEach((m, i) => {
        const el = this.tableCard(m.uid, { x: x0 + (i % 2) * (w + 16), y: Zm.y + 34 + Math.floor(i / 2) * (hh * 0.64), w, h: hh }, { z: 4 + i, onclick: () => this.app.onMercTap(m.uid) });
        el.append(h('div.morale', ...Array.from({ length: m.max }, (_, k) => h('i' + (k < m.morale ? '.on' : ''))))); box.append(el);
      });
      return box;
    });
    this.slot('side_afs', 'c', [afs], () => {
      if (!this.cat.extras?.afflictions) return null;
      const box = h('div', { style: { position: 'absolute', left: 0, top: 0 } }, sub('AFLICCIONES', Za.y - 6));
      if (!afs.length) box.append(h('div.side-empty', { style: { left: S.x + 'px', top: Za.y + 60 + 'px', width: S.w + 'px' } }, 'Sin aflicciones'));
      const w = 110, hh = 155; const gap = afs.length > 1 ? Math.min(w + 12, (S.w - 60 - w) / (afs.length - 1)) : 0;
      afs.slice(0, 5).forEach((u, i) => box.append(this.tableCard(u, { x: S.x + 30 + i * gap, y: Za.y + 34, w, h: hh }, { z: 4 + i, onclick: () => this.app.overlays.inspect({ uid: u }) })));
      return box;
    });
  }

  /** Fichas del héroe: el mismo montón en los pocillos de los dos tapetes (sin números: la cifra está en la barra superior) */
  _tokens() {
    const s = this.vs.stats;
    const vals = { gold: s.gold, poison: s.poison, health: s.hp, blessing: s.blessing, ration: s.rations, energy: s.energy };
    for (const k of Object.keys(vals)) {
      const n = Math.max(0, Math.min(vals[k], PILE_MAX)); const sq = SQUARE.has(k);
      this.slot('hero_' + k, 'c', [n], () => this._chips(L.CWELLS[k], n, k, sq));
      this.slot('bank_' + k, 'd', [n], () => this._chips(L.WELLS[k], n, k, sq));
    }
  }
  /** Montón de fichas: un racimo hexagonal de siete que va subiendo en capas; la altura y la anchura dependen de la cantidad */
  _chips(w, n, k, sq) {
    if (n <= 0) return null;
    const box = h('div.chips', { style: { position: 'absolute', left: w.cx + 'px', top: w.cy + 'px', width: 0, height: 0, zIndex: 5, pointerEvents: 'none' } });
    const sz = Math.max(30, Math.min(46, w.r * 0.95)); const d = sz * 0.74; const order = [0, 3, 1, 4, 2, 5];
    const hash = (i, m) => ((i * 2654435761 + m * 40503) >>> 0) % 1000 / 1000;
    for (let i = 0; i < n; i++) {
      const L_ = Math.floor(i / 7); const j = i % 7;
      let x = 0, y = 0;
      if (j > 0) { const a = ((order[j - 1] * 60 + (L_ % 2 ? 30 : 0)) * Math.PI) / 180; x = Math.cos(a) * d * (L_ % 2 ? 0.86 : 1); y = Math.sin(a) * d * (L_ % 2 ? 0.86 : 1) * 0.92; }
      x += (hash(i, 1) - 0.5) * 3; y += (hash(i, 2) - 0.5) * 3 - L_ * sz * 0.3 + sz * 0.12;
      box.append(h('img.chip' + (sq ? '.sq' : ''), { src: `assets/tokens/tk_${k}.png`, alt: k, style: { left: x + 'px', top: y + 'px', width: sz + 'px', height: sz + 'px', margin: `-${sz / 2}px 0 0 -${sz / 2}px`, transform: `rotate(${Math.round((hash(i, 3) - 0.5) * 30)}deg)`, zIndex: L_ * 20 + Math.round(y + 40) } }));
    }
    return box;
  }

  /** Cartas de marcador con peones: nivel (mapa) y moral */
  _trackers() {
    const s = this.vs.stats; const cat = this.cat;
    const mk = (key, zone, img) => this.slot(key, 'd', [img], () => {
      const r = L.ZONES[zone];
      const el = h('div.tracker', { dataset: { nodrag: '1' }, style: { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', zIndex: 2 } }, h('img', { src: cardPath(img) }));
      el.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onZoneTap(zone, e); });
      return el;
    });
    mk('t_map', 'map', cat.mapImg); mk('t_mor', 'morality', cat.moralityImg);
    const place = (pawn, zone, spot) => { const r = L.ZONES[zone]; pawn.style.left = r.x + spot[0] * r.w + 'px'; pawn.style.top = r.y + spot[1] * r.h + 'px'; };
    place(this.pawnLevel, 'map', mapSpotsFor(cat)[Math.max(1, Math.min(5, s.level))] || [0.5, 0.5]);
    place(this.pawnMoral, 'morality', cat.moralitySpots[String(Math.max(-5, Math.min(5, Math.round(s.morality))))] || [0.5, 0.5]);
  }

  /** El Diablillo (variante de ANEMIA): se sienta sobre el mazo de botín, luego sobre el de pociones, y se marcha */
  _imp() {
    const pos = this.vs.imp;
    this.slot('imp', 'd', [pos], () => {
      const z = pos === 'loot' ? 'loot' : pos === 'potions' ? 'potions' : null; if (!z) return null;
      const r = L.ZONES[z]; const svg = '<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M12 22 L6 4 L24 14 Z M52 22 L58 4 L40 14 Z" fill="#7a1b11" stroke="#1b0603" stroke-width="2"/><circle cx="32" cy="36" r="22" fill="#c0301c" stroke="#1b0603" stroke-width="2.5"/><ellipse cx="23" cy="32" rx="4.5" ry="5.5" fill="#ffe9a8"/><ellipse cx="41" cy="32" rx="4.5" ry="5.5" fill="#ffe9a8"/><circle cx="23.5" cy="33" r="2" fill="#1b0603"/><circle cx="40.5" cy="33" r="2" fill="#1b0603"/><path d="M20 46 Q32 56 44 46" fill="none" stroke="#1b0603" stroke-width="3" stroke-linecap="round"/><path d="M27 48 L29 53 L31 48 M33 48 L35 53 L37 48" fill="#fff" stroke="none"/></svg>';
      return h('div.imp', { title: 'El Diablillo', style: { left: r.x - 14 + 'px', top: r.y - 22 + 'px' }, html: svg });
    });
  }

  /** Franja de expansiones: entorno, artefactos, aflicciones y mapa de encuentros */
  _extras() {
    if (!L.extras) return;
    const ex = this.cat.extras || {}; const v = this.vs; const g = this.game; const Z = L.ZONES;
    const label = (zone, text) => h('div.zone-label.x', { style: { left: Z[zone].x - 20 + 'px', top: Z[zone].y - 30 + 'px', width: Z[zone].w + 40 + 'px', textAlign: 'center', zIndex: 4 } }, text);
    if (v.counts.bosses > 0 && this.cat.pools.bosses.length) this.slot('x_boss_lbl', 'd', [1], () => label('x_boss', 'JEFES'));
    if (ex.environments) {
      this.slot('x_env', 'd', [v.env], () => {
        const box = h('div', { style: { position: 'absolute', inset: 0, pointerEvents: 'none' } }, label('x_env', 'ENTORNO'));
        const r = Z.x_env;
        if (v.env) box.append(this.tableCard(v.env, r, { onclick: () => this.app.overlays.inspect({ uid: v.env }) }));
        else box.append(h('div.empty-slot', { style: this._rectStyle(r) }, 'Sin entorno'));
        return box;
      });
    }
    if (ex.artifacts) {
      this._deck('x_art_deck', 'x_art', v.counts.artifacts, backOfDeck('artifacts'), { size: CARD_X, empty: 'Sin artefactos', label: '' });
      this.slot('x_art_lbl', 'd', [1], () => label('x_art', 'ARTEFACTOS'));
    }
    if (ex.afflictions) {
      this._deck('x_aff_deck', 'x_aff', v.counts.afflictions, backOfDeck('afflictions'), { size: CARD_X, empty: 'Sin aflicciones' });
      this.slot('x_aff_lbl', 'd', [1], () => label('x_aff', 'AFLICCIONES'));
    }
    if (ex.encounters) {
      this.slot('x_enc', 'd', [v.encounter?.map, v.stats.level], () => {
        const r = Z.x_enc; const box = h('div', { style: { position: 'absolute', inset: 0, pointerEvents: 'none' } }, label('x_enc', 'ENCUENTROS'));
        const wrap = h('div.enc-map', { style: this._rectStyle(r) });
        if (v.encounter?.map) {
          wrap.append(h('img', { src: cardPath(g.img(v.encounter.map)) }));
          wrap.style.pointerEvents = 'auto'; wrap.addEventListener('click', (e) => { e.stopPropagation(); this.app.overlays.inspect({ uid: v.encounter.map }); });
        } else wrap.append(h('div.empty-slot.in', 'Sin mapa'));
        box.append(wrap); return box;
      });
    }
  }

  /** el cursor de mano solo aparece en lo que de verdad responde ahora (no en huecos vacíos o inertes) */
  _live() {
    if (!this.hits) return; const g = this.game; const pt = g.s.prompt?.type; const v = this.vs; const p = v.piles;
    const on = new Set(['dungeon', 'enemies', 'loot', 'potions', 'plots', 'map', 'morality', 'c_hero', 'x_art', 'x_aff', 'x_enc', 'x_boss']);
    if (['pair', 'decide', 'chooseOne'].includes(pt)) { on.add('door1'); on.add('door2'); }
    if (pt === 'setup') on.add('trappings');
    if (v.skills.length) { on.add('c_skills'); on.add('skills'); }
    if (v.canEquip) for (const z of ['c_head', 'c_body', 'c_main', 'c_off', 'c_acc']) on.add(z);
    if (p.graveyard.length) on.add('graveyard'); if (p.plotsPlayed.length) on.add('plotsUsed');
    if (p.lootUsed.length) on.add('lootUsed'); if (p.potionsUsed.length) on.add('potionsUsed'); if (p.dungeonDiscard.length) on.add('ddiscard');
    for (const [name, el] of Object.entries(this.hits)) el.classList.toggle('live', on.has(name));
  }
  /** señales discretas de qué se puede tocar (sin brillos) */
  setCue(cue) { this.cue = cue || {}; this._applyCue(); }
  _applyCue() {
    const set = (key, on) => { const el = this.slots.get(key)?.el; if (el) el.classList.toggle('cue', !!on); };
    set('d_dungeon', this.cue.dungeon); set('door0', this.cue.pair); set('door1', this.cue.pair);
    set('d_trappings', this.cue.trappings); set('d_skills', this.cue.skills);
  }

  /* ================================================================ geometría de pantalla */
  screenRect(zoneName, size, dx = 0, dy = 0) {
    const r = cardRect(zoneName, size, dx, dy); const a = this.cam.toScreen(r.x, r.y);
    return { x: a.x, y: a.y, w: r.w * this.cam.s, h: r.h * this.cam.s };
  }
  zoneCenter(name) { const c = center(L.ZONES[name]); return this.cam.toScreen(c.x, c.y); }
  /** centro (en pantalla) del pocillo del héroe, o null si ese tablero no está a la vista */
  wellCenter(k) { const w = L.CWELLS[k]; return this.cam.toScreen(w.cx, w.cy); }
  bankCenter(k) { const w = L.WELLS[k]; return this.cam.toScreen(w.cx, w.cy); }
  hide(uid) { this.hiddenUids.add(uid); this.render(); }
  show(uid) { this.hiddenUids.delete(uid); this.render(); }
}
