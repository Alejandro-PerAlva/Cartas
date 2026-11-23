/**
 * La mesa de juego: dos tapetes oficiales sobre roble oscuro, con mazos, pilas, puertas, marcadores y fichas.
 * Mantiene un "estado de vista" (vs) que el director va actualizando al ritmo de las animaciones;
 * al quedar libre se resincroniza con el estado real del motor.
 */
import { h, $, sleep, bbox } from './dom.js';
import { DMAT, CMAT, TABLE, ZONES, WELLS, CWELLS, CARD_D, CARD_C, cardRect, center, FOCUS } from './layout.js';
import { cardEl, backOf, backOfDeck, cardPath } from './cards.js';
import { Camera } from './camera.js';

const CHIP = { gold: 'tk_gold', poison: 'tk_poison', health: 'tk_health', blessing: 'tk_blessing', ration: 'tk_ration', energy: 'tk_energy' };
const SQUARE = new Set(['ration', 'energy']);
const MAXCHIPS = { gold: 8, poison: 8, health: 8, blessing: 9, ration: 8, energy: 8 };

export class Table {
  constructor(app, root) {
    this.app = app; this.root = root;
    this.z = {}; this.vs = null; this.sigs = {};
    this._build();
  }
  get game() { return this.app.game; }
  get cat() { return this.game.cat; }

  /* ================================================================ construcción */
  _build() {
    this.viewport = h('div#viewport');
    this.table = h('div#table', { style: { width: TABLE.w + 'px', height: TABLE.h + 'px' } });
    this.surface = h('div.surface');
    this.dmat = h('div.mat.dmat', { style: { left: DMAT.x + 'px', top: DMAT.y + 'px', width: DMAT.w + 'px', height: DMAT.h + 'px' } }, h('img', { src: DMAT.img, alt: '' }));
    this.cmat = h('div.mat.cmat', { style: { left: CMAT.x + 'px', top: CMAT.y + 'px', width: CMAT.w + 'px', height: CMAT.h + 'px' } }, h('img', { src: CMAT.img, alt: '' }));
    this.layer = h('div#cards', { style: { position: 'absolute', inset: '0' } });
    this.table.append(this.surface, this.dmat, this.cmat, this.layer);
    this.viewport.append(this.table, h('div#lightfx'));
    this.root.append(this.viewport);
    this.cam = new Camera(this.viewport, this.table, TABLE, {
      safe: () => this.safeInsets(),
    });
    this.cam.onResize = () => { if (!this.userMoved) this.fit(false); };
    this._staticParts();
  }
  safeInsets() {
    const small = innerWidth < 760 || innerHeight < 520;
    return { t: small ? 54 : 64, b: small ? 54 : 68, l: 6, r: 6 };
  }
  fit(animate = true) { return this.cam.frame(FOCUS.all, { animate, pad: 0.01 }); }
  focus(name, animate = true) { return this.cam.frame(FOCUS[name], { animate, pad: 0.02 }); }

  /** Elementos que no cambian: etiquetas, pocillos, zonas pulsables */
  _staticParts() {
    const L = this.layer;
    // etiquetas discretas bajo los huecos
    const label = (zone, text, dy = -26) => { const z = ZONES[zone]; L.append(h('div.zone-label', { style: { left: z.x + 'px', top: z.y + z.h + dy + 'px', width: z.w + 'px', textAlign: 'center' } }, text)); };
    void label;
    // zonas pulsables (hit areas)
    for (const name of Object.keys(ZONES)) {
      const z = ZONES[name];
      const hit = h('div.slot-hit', { dataset: { zone: name, nodrag: '1' }, style: { left: z.x + 'px', top: z.y + 'px', width: z.w + 'px', height: z.h + 'px' } });
      hit.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onZoneTap(name, e); });
      this.z[name] = { hit, rect: z }; L.append(hit);
    }
    // pocillos de fichas
    this.wells = {};
    for (const [k, w] of Object.entries(WELLS)) {
      const box = h('div', { style: { position: 'absolute', left: w.cx + 'px', top: w.cy + 'px', width: 0, height: 0, zIndex: 5 } });
      const num = h('div.well-num', { style: { left: w.cx + w.r * 0.78 + 'px', top: w.cy + w.r * 0.72 + 'px' } });
      const hit = h('div.well-hit.tap', { dataset: { nodrag: '1', well: k }, style: { position: 'absolute', left: w.cx - w.r + 'px', top: w.cy - w.r + 'px', width: w.r * 2 + 'px', height: w.r * 2 + 'px', zIndex: 7, cursor: 'help' } });
      hit.addEventListener('click', () => this.app.onWellTap(k));
      L.append(box, num, hit); this.wells[k] = { box, num, hit };
    }
    this.cwNums = {};
    for (const [k, w] of Object.entries(CWELLS)) { const n = h('div.cw-num', { style: { left: w.cx + 'px', top: w.cy + 'px' } }); L.append(n); this.cwNums[k] = n; }
    // peones
    this.pawnLevel = h('div.pawn'); this.pawnMoral = h('div.pawn', { style: { filter: 'hue-rotate(205deg) drop-shadow(0 6px 3px rgba(0,0,0,.6))' } });
    L.append(this.pawnLevel, this.pawnMoral);
    this.eyesBadge = h('div.card-badge', { style: { position: 'absolute', zIndex: 9, pointerEvents: 'none', font: '800 26px var(--font-title)', color: '#fff', textShadow: '0 2px 4px #000, 0 0 8px #000', background: 'rgba(20,6,6,.82)', border: '2px solid #7a1b11', borderRadius: '22px', padding: '2px 14px 4px' } });
    L.append(this.eyesBadge);
    // placa del turno en la 4.ª puerta
    this.plaque = h('div', { style: { position: 'absolute', zIndex: 5, pointerEvents: 'none', textAlign: 'center' } });
    L.append(this.plaque);
  }

  /* ================================================================ estado de vista */
  extract(g = this.game) {
    const s = g.s; const z = s.z; const h2 = s.hero;
    return {
      counts: { dungeon: z.dungeon.length, enemies: z.enemies.length, loot: z.loot.length, potions: z.potions.length, plots: z.plots.length, trappings: z.trappings.length, skills: z.skills.length, bosses: z.bosses.length },
      piles: { dungeonDiscard: z.dungeonDiscard.slice(), lootUsed: z.lootDiscard.slice(), potionsUsed: z.potionsDiscard.slice(), plotsPlayed: z.plotsPlayed.slice(), graveyard: z.graveyard.map((e) => ({ ...e })) },
      pair: z.pair.slice(), hidePair: [false, false],
      eq: { MP: s.eq.MP, OM: s.eq.OM, CA: s.eq.CA, CP: s.eq.CP, AC: s.eq.AC.slice() }, hand: z.hand.slice(),
      skills: h2.skills.map((id) => ({ id, uid: h2.skillCards[id] })), afflictions: h2.afflictions.slice(),
      stats: { hp: h2.hp, maxHp: g.maxHp(), energy: h2.energy, gold: h2.gold, rations: h2.rations, poison: h2.poison, blessing: h2.blessings.length, morality: g.morality(), level: s.level, turn: s.turn, eyes: s.eyes },
      bossUid: null, heroId: s.heroId,
    };
  }
  sync() { this.vs = this.extract(); this.render(true); }

  /* ================================================================ renderizado */
  render(force = false) {
    if (!this.vs) return;
    this._decks(force); this._piles(force); this._doors(force); this._char(force); this._tokens(force); this._trackers(force); this._plaque(force);
  }
  _sig(name, v, force) { const s = JSON.stringify(v); if (!force && this.sigs[name] === s) return false; this.sigs[name] = s; return true; }
  _mount(key, el) { this.z[key]?.mount?.remove(); if (this.z[key]) this.z[key].mount = el; if (el) this.layer.append(el); return el; }

  /** Mazo: pila de dorsos con grosor y contador */
  _deck(key, zoneName, count, backSrc, { size = CARD_D, glow = false, label = '', empty = '' } = {}) {
    const r = cardRect(zoneName, size);
    const el = h('div.deck', { dataset: { deck: key, nodrag: '1' }, style: { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', zIndex: 3 } });
    if (count > 0) {
      const layers = Math.min(7, Math.ceil(count / 2.2));
      const shadows = []; for (let i = 1; i <= layers; i++) shadows.push(`${i * 1.2}px ${i * 1.6}px 0 ${i % 2 ? '#e8dcc0' : '#2a2018'}`);
      shadows.push(`${layers * 1.2 + 3}px ${layers * 1.6 + 5}px 14px rgba(0,0,0,.65)`);
      el.append(h('div.stack', { style: { backgroundImage: `url(${backSrc})`, boxShadow: shadows.join(',') } }), h('div.count', String(count)));
    } else if (empty) el.append(h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', font: '700 15px var(--font-title)', color: 'rgba(255,230,180,.55)', textAlign: 'center', textShadow: '0 2px 3px #000' } }, empty));
    if (glow) el.classList.add('glow');
    if (label) el.append(h('div.zone-label', { style: { left: 0, right: 0, top: '100%', marginTop: '6px', textAlign: 'center' } }, label));
    el.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onZoneTap(zoneName, e); });
    return this._mount(key, el);
  }
  _decks(force) {
    const c = this.vs.counts; const gl = this.glow || {};
    const k = { c, gl, setup: this.game.s.prompt?.type };
    if (!this._sig('decks', k, force)) return;
    const b = (n) => backOfDeck(n);
    this._deck('d_dungeon', 'dungeon', c.dungeon, b('dungeon'), { glow: gl.dungeon });
    this._deck('d_enemies', 'enemies', c.enemies, b('enemies'));
    this._deck('d_loot', 'loot', c.loot, b('loot'));
    this._deck('d_potions', 'potions', c.potions, b('potions'));
    this._deck('d_plots', 'plots', c.plots, b('plots'));
    this._deck('d_trappings', 'trappings', c.trappings, b('trappings'), { glow: gl.trappings, empty: 'Equipo agotado' });
    this._deck('d_skills', 'skills', c.skills, b('skills'), { glow: gl.skills });
    // jefes: pila bajo los escombros (oculta hasta el final)
    const bz = ZONES.rubble; const bc = center(bz);
    if (c.bosses > 0 && this.cat.pools.bosses.length) {
      const r = { x: bc.x - 150, y: bc.y - 100, w: 150, h: 211 };
      const el = h('div.deck', { dataset: { nodrag: '1' }, style: { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', zIndex: 3, transform: 'rotate(-6deg)', opacity: 0.92 } },
        h('div.stack', { style: { backgroundImage: `url(${b('bosses')})`, boxShadow: '3px 4px 0 #2a2018, 6px 8px 0 #e8dcc0, 9px 12px 12px rgba(0,0,0,.7)', filter: 'brightness(.7)' } }));
      el.addEventListener('click', () => this.app.toast('El jefe final duerme tras los escombros… por ahora.'));
      this._mount('d_bosses', el);
    } else this._mount('d_bosses', null);
  }

  /** Pilas de descarte y demás */
  _piles(force) {
    const p = this.vs.piles;
    if (!this._sig('piles', [p, this.glow?.graveyard], force)) return;
    const g = this.game; const top = (uid, size = CARD_D, zone) => {
      const r = cardRect(zone, size); const d = g.def(uid);
      return { r, def: d, src: g.img(uid) };
    };
    // helper para pila "carta de arriba + contador"
    const topPile = (key, zone, list, { faceDown = false, label = '' } = {}) => {
      if (!list.length) return this._mount(key, null);
      const uid = list[list.length - 1]; const t = top(uid, CARD_D, zone);
      const el = h('div.pile', { dataset: { nodrag: '1' }, style: { left: t.r.x + 'px', top: t.r.y + 'px', width: t.r.w + 'px', height: t.r.h + 'px', zIndex: 3 } });
      const cardsShadow = Math.min(5, Math.ceil(list.length / 2));
      const sh = []; for (let i = 1; i <= cardsShadow; i++) sh.push(`${i}px ${i * 1.4}px 0 ${i % 2 ? '#e8dcc0' : '#2a2018'}`); sh.push('3px 8px 14px rgba(0,0,0,.6)');
      el.append(h('div.stack', { style: { backgroundImage: `url(${faceDown ? backOf(t.def) : cardPath(t.src)})`, boxShadow: sh.join(','), transform: `rotate(${((uid * 37) % 7) - 3}deg)` } }), h('div.count', String(list.length)));
      el.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onZoneTap(zone, e); });
      return this._mount(key, el);
    };
    topPile('p_loot', 'lootUsed', p.lootUsed); topPile('p_potions', 'potionsUsed', p.potionsUsed);
    topPile('p_dd', 'door3', p.dungeonDiscard, { faceDown: true });
    // cementerio: abanico de enemigos derrotados (los gastados en habilidades, oscurecidos)
    {
      const gv = p.graveyard; if (!gv.length) this._mount('p_grave', null);
      else {
        const zone = ZONES.graveyard; const el = h('div', { dataset: { nodrag: '1' }, style: { position: 'absolute', left: zone.x + 'px', top: zone.y + 'px', width: zone.w + 'px', height: zone.h + 'px', zIndex: 3, cursor: 'pointer' } });
        const show = gv.slice(-4); const step = Math.min(34, (zone.w - 150) / Math.max(1, show.length - 1));
        show.forEach((e, i) => {
          const w = 150, hh = 211;
          el.append(h('div', { style: { position: 'absolute', left: i * step + 'px', top: 36 + i * 4 + 'px', width: w + 'px', height: hh + 'px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 3px 8px #000b', transform: `rotate(${(i - 1.5) * 3}deg)`, filter: e.spent ? 'grayscale(1) brightness(.5)' : 'none' } }, h('img', { src: cardPath(g.img(e.uid)), style: { width: '100%', height: '100%' } })));
        });
        el.append(h('div.count', { style: { right: '4px', bottom: '2px' } }, String(gv.length)));
        el.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onZoneTap('graveyard', e); });
        this._mount('p_grave', el);
      }
    }
    // tramas resueltas: escalonadas con los ojos a la vista
    {
      const pl = p.plotsPlayed; if (!pl.length) this._mount('p_plots', null);
      else {
        const zone = ZONES.plotsUsed; const show = pl.slice(-4); const w = 168, hh = 236; const step = 22;
        const el = h('div', { dataset: { nodrag: '1' }, style: { position: 'absolute', left: zone.x + (zone.w - w) / 2 + 'px', top: zone.y + zone.h - hh - 4 + 'px', width: w + 'px', height: hh + 'px', zIndex: 3, cursor: 'pointer' } });
        show.forEach((u, i) => { const off = (show.length - 1 - i) * step; el.append(h('div', { style: { position: 'absolute', inset: 0, transform: `translate(${(i - 1.5) * 2}px, ${-off}px)`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 3px 8px #000b' } }, h('img', { src: cardPath(g.img(u)), style: { width: '100%', height: '100%' } }))); });
        el.append(h('div.count', { style: { right: '-8px', bottom: '-8px', fontSize: '17px', minWidth: '52px' } }, `👁 ${this.vs.stats.eyes}`));
        el.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onZoneTap('plotsUsed', e); });
        this._mount('p_plots', el);
      }
    }
  }

  /** Puertas verdes: las dos cartas del turno; la 4.ª lleva la placa de turno */
  _doors(force) {
    const v = this.vs; const g = this.game;
    if (!this._sig('doors', [v.pair, v.hidePair, this.glow?.pair, this.hiddenUids && [...this.hiddenUids]], force)) return;
    ['door1', 'door2'].forEach((zone, i) => {
      const uid = v.pair[i]; const key = 'door' + i;
      if (!uid || v.hidePair[i] || this.hiddenUids?.has(uid)) return this._mount(key, null);
      const r = cardRect(zone, CARD_D);
      const el = cardEl({ front: g.img(uid), back: backOf(g.def(uid)), up: !!this.faceUp?.has(uid), cls: 'tap' });
      Object.assign(el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', zIndex: 4 }); el.dataset.nodrag = '1';
      if (this.faceUp?.has(uid)) el.dataset.uid = uid;
      el.querySelector('.card-in').insertAdjacentElement('beforebegin', h('div.shadow-drop'));
      if (this.glow?.pair) el.classList.add('glow');
      el.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onDoorTap(i); });
      this._mount(key, el);
    });
  }

  /** Tapete de personaje: héroe, habilidades, equipo y accesorios */
  _char(force) {
    const v = this.vs; const g = this.game;
    if (!this._sig('char', [v.eq, v.skills, v.heroId, v.hand.length, this.glow?.equip], force)) return;
    const put = (key, zone, uid, { src, size = CARD_C, dim = false, tag = '' } = {}) => {
      if (!uid && !src) return this._mount(key, null);
      const r = cardRect(zone, size);
      const el = cardEl({ front: src || g.img(uid), back: backOf(uid ? g.def(uid) : null), up: true, cls: 'tap' + (dim ? ' dim' : '') });
      Object.assign(el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', zIndex: 4 }); el.dataset.nodrag = '1';
      if (uid) el.dataset.uid = uid;
      el.querySelector('.card-in').insertAdjacentElement('beforebegin', h('div.shadow-drop'));
      if (tag) el.append(h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', font: '800 18px var(--font-title)', color: '#fff', textShadow: '0 2px 4px #000', textAlign: 'center', zIndex: 5 } }, tag));
      el.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onCardTap(uid, zone, e); });
      return this._mount(key, el);
    };
    const heroDef = this.cat.pools.heroes.find((x) => x.id === v.heroId);
    put('c_hero', 'c_hero', null, { src: heroDef.img });
    put('c_head', 'c_head', v.eq.CA); put('c_body', 'c_body', v.eq.CP); put('c_main', 'c_main', v.eq.MP);
    const two = v.eq.MP && g.def(v.eq.MP).slot === '2M';
    if (v.eq.OM) put('c_off', 'c_off', v.eq.OM);
    else if (two) put('c_off', 'c_off', v.eq.MP, { dim: true, tag: 'DOS\nMANOS' }); else this._mount('c_off', null);
    // habilidades: cascada
    {
      const zn = ZONES.c_skills; const list = v.skills; if (!list.length) this._mount('c_skills', null);
      else {
        const box = h('div', { style: { position: 'absolute', left: zn.x + 'px', top: zn.y + 'px', width: zn.w + 'px', height: zn.h + 'px', zIndex: 4 } });
        const step = list.length > 1 ? Math.min(46, (zn.h - CARD_C.h) / (list.length - 1) || 0) : 0;
        list.forEach((sk, i) => {
          const d = this.cat.def(sk.id); const el = cardEl({ front: d.img, back: backOfDeck('skills'), up: true, cls: 'tap' });
          Object.assign(el.style, { left: (zn.w - CARD_C.w) / 2 + 'px', top: i * Math.max(step, 0) + 'px', width: CARD_C.w + 'px', height: CARD_C.h + 'px' }); el.dataset.nodrag = '1';
          el.querySelector('.card-in').insertAdjacentElement('beforebegin', h('div.shadow-drop'));
          el.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onSkillTap(sk.id); });
          box.append(el);
        });
        this._mount('c_skills', box);
      }
    }
    // accesorios: pila desplegada
    {
      const zn = ZONES.c_acc; const list = v.eq.AC; if (!list.length) this._mount('c_acc', null);
      else {
        const box = h('div', { style: { position: 'absolute', left: zn.x + 'px', top: zn.y + 'px', width: zn.w + 'px', height: zn.h + 'px', zIndex: 4 } });
        const step = list.length > 1 ? Math.min(56, Math.max(14, (zn.h - CARD_C.h) / (list.length - 1))) : 0;
        list.forEach((u, i) => {
          const el = cardEl({ front: g.img(u), back: backOf(g.def(u)), up: true, cls: 'tap' });
          Object.assign(el.style, { left: (zn.w - CARD_C.w) / 2 + 'px', top: i * step + 'px', width: CARD_C.w + 'px', height: CARD_C.h + 'px' }); el.dataset.nodrag = '1'; el.dataset.uid = u;
          el.querySelector('.card-in').insertAdjacentElement('beforebegin', h('div.shadow-drop'));
          el.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onAccTap(u, e); });
          box.append(el);
        });
        if (list.length > 1) box.append(h('div.count', { style: { right: '-6px', top: '-8px', bottom: 'auto', minWidth: '34px', height: '34px', lineHeight: '30px', fontSize: '18px' } }, String(list.length)));
        this._mount('c_acc', box);
      }
    }
  }

  /** Fichas en los pocillos y contadores espejo */
  _tokens(force) {
    const s = this.vs.stats;
    const vals = { gold: s.gold, poison: s.poison, health: s.hp, blessing: s.blessing, ration: s.rations, energy: s.energy };
    if (!this._sig('tokens', [vals, s.maxHp], force)) return;
    for (const [k, w] of Object.entries(this.wells)) {
      const n = vals[k]; w.box.innerHTML = '';
      const shown = Math.min(n, MAXCHIPS[k]); const wl = WELLS[k];
      const spread = k === 'blessing' ? 4.2 : 3.6;
      for (let i = 0; i < shown; i++) {
        const dx = ((i * 53) % 7 - 3) * 0.7; const dy = -i * spread + wl.r * 0.28;
        const sz = wl.r * 1.45;
        w.box.append(h('img.chip' + (SQUARE.has(k) ? '.sq' : ''), { src: `assets/tokens/tk_${k}.png`, alt: k, style: { left: dx + 'px', top: dy + 'px', width: sz + 'px', height: sz + 'px', margin: `-${sz / 2}px 0 0 -${sz / 2}px`, transform: `rotate(${((i * 29) % 25) - 12}deg)`, zIndex: i } }));
      }
      w.num.textContent = n; w.num.style.opacity = n ? 1 : 0.55;
      w.num.style.color = k === 'health' && n <= Math.max(3, s.maxHp * 0.25) ? '#ff8a78' : '#fff';
    }
    const cn = { gold: s.gold, poison: s.poison, ration: s.rations, blessing: s.blessing, energy: s.energy, health: s.hp };
    for (const [k, el] of Object.entries(this.cwNums)) el.textContent = cn[k];
  }

  /** Cartas de marcador con peones: nivel (mapa) y moral */
  _trackers(force) {
    const s = this.vs.stats; const cat = this.cat;
    if (!this._sig('trk', [s.level, s.morality, s.eyes, cat.mapImg], force)) return;
    const mk = (key, zone, img) => {
      const r = ZONES[zone]; const el = h('div', { dataset: { nodrag: '1' }, style: { position: 'absolute', left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', zIndex: 2, borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 12px #000a' } }, h('img', { src: cardPath(img), style: { width: '100%', height: '100%', objectFit: 'cover' } }));
      el.addEventListener('click', (e) => { if (this.cam.wasDrag()) return; e.stopPropagation(); this.app.onZoneTap(zone, e); });
      return this._mount(key, el);
    };
    mk('t_map', 'map', cat.mapImg); mk('t_mor', 'morality', cat.moralityImg);
    const place = (pawn, zone, spot) => { const r = ZONES[zone]; pawn.style.left = r.x + spot[0] * r.w + 'px'; pawn.style.top = r.y + spot[1] * r.h + 'px'; };
    const maps = cat.mapSpots[Math.max(1, Math.min(5, s.level))] || [0.5, 0.5];
    place(this.pawnLevel, 'map', maps);
    const m = Math.max(-5, Math.min(5, Math.round(s.morality)));
    place(this.pawnMoral, 'morality', cat.moralitySpots[String(m)] || [0.5, 0.5]);
    const mr = ZONES.morality; this.eyesBadge.textContent = `👁 ${s.eyes}/10`; this.eyesBadge.style.left = mr.x + mr.w / 2 - 50 + 'px'; this.eyesBadge.style.top = mr.y + mr.h + 6 + 'px';
    this.eyesBadge.style.color = s.eyes >= 8 ? '#ff8a78' : '#fff';
    this.layer.append(this.pawnLevel, this.pawnMoral, this.eyesBadge); // por encima de las cartas
  }

  /** Placa del turno (puerta 4) */
  _plaque(force) {
    const s = this.vs.stats; if (!this._sig('plq', [s.turn, s.level], force)) return;
    const z = ZONES.door4; this.plaque.style.left = z.x + 'px'; this.plaque.style.top = z.y + 'px'; this.plaque.style.width = z.w + 'px'; this.plaque.style.height = z.h + 'px';
    const pips = []; for (let i = 1; i <= 8; i++) pips.push(`<i style="display:inline-block;width:14px;height:14px;margin:0 3px;border-radius:50%;background:${i <= s.turn ? 'radial-gradient(circle at 35% 30%,#ffd98a,#d98a1c 70%)' : 'rgba(0,0,0,.55)'};border:1px solid #000;box-shadow:${i <= s.turn ? '0 0 8px #ffb23a' : 'none'}"></i>`);
    this.plaque.innerHTML = `<div style="position:absolute;left:12px;right:12px;top:32px;padding:8px 6px 10px;border-radius:8px;background:linear-gradient(rgba(36,22,10,.9),rgba(18,10,4,.92));border:2px solid #8a6a2c;box-shadow:0 6px 14px #000b">
      <div style="font:700 13px var(--font-title);letter-spacing:.2em;color:#cfae6a">NIVEL</div><div style="font:900 56px/1 var(--font-title);color:#f1d79a;text-shadow:0 3px 6px #000">${s.level}</div>
      <div style="font:700 13px var(--font-title);letter-spacing:.2em;color:#cfae6a;margin-top:4px">TURNO ${Math.min(8, Math.max(0, s.turn))} / 8</div><div style="margin-top:6px">${pips.join('')}</div></div>`;
  }

  /* ================================================================ resalte de acciones */
  setGlow(glow) { this.glow = glow || {}; this.render(true); }

  /* ================================================================ geometría de pantalla */
  /** rectángulo en pantalla de una carta ubicada en la zona (tamaño de carta de mesa) */
  screenRect(zoneName, size, dx = 0, dy = 0) {
    const r = cardRect(zoneName, size, dx, dy);
    const a = this.cam.toScreen(r.x, r.y);
    return { x: a.x, y: a.y, w: r.w * this.cam.s, h: r.h * this.cam.s };
  }
  zoneCenter(name) { const c = center(ZONES[name]); return this.cam.toScreen(c.x, c.y); }
  wellCenter(k) { const w = WELLS[k]; return this.cam.toScreen(w.cx, w.cy); }
  /** ocultar/mostrar cartas de las puertas durante animaciones */
  hide(uid) { (this.hiddenUids ||= new Set()).add(uid); this.render(true); }
  show(uid) { this.hiddenUids?.delete(uid); this.render(true); }
}
export { FOCUS, ZONES };
