/**
 * El director convierte los eventos del motor en animaciones, en orden y esperando a cada una.
 * El motor ya está en su estado final: aquí solo se cuenta lo que ha pasado.
 */
import { h, sleep, speed, WK_ICON } from './dom.js';
import { Ghost, flyChip, floatText, vignette, shake, burst } from './fx.js';
import { backOf, backOfDeck, cardPath, cardEl } from './cards.js';
import { sound } from './audio.js';
import { L, CARD_D } from './layout.js';

const STAT_WELL = { hp: 'health', energy: 'energy', gold: 'gold', rations: 'ration', poison: 'poison', blessing: 'blessing' };
const STAT_NAME = { hp: 'salud', energy: 'energía', gold: 'oro', rations: 'raciones', poison: 'veneno', blessing: 'bendición' };
/** eventos que no cuentan como «ha pasado algo» sobre la carta que se está mirando */
const QUIET = new Set(['reveal', 'resolving', 'deal', 'discardCard', 'prompt', 'log', 'peek', 'draw', 'plot', 'turnEnd', 'diceReroll']);
const CAPTION_CATS = new Set(['explore', 'plot', 'item', 'skill', 'camp', 'altar', 'merchant', 'boss', 'moral', 'affliction', 'level']);

export class Director {
  constructor(app) { this.app = app; this.q = []; this.spot = null; this.drawn = new Map(); this.running = false; this.recent = []; this.dismissed = new Set(); this.holding = false; }
  get g() { return this.app.game; }
  get T() { return this.app.table; }
  get vs() { return this.app.table.vs; }
  get arena() { return this.app.arena; }
  push(ev) { this.q.push(ev); }
  k(ms) { return ms; }
  wait(ms) { return sleep(ms); }

  async drain() {
    this.running = true;
    while (this.q.length) {
      const ev = this.q.shift();
      try { await this.handle(ev); } catch (e) { console.error('Evento', ev, e); }
      if (this.spot && !QUIET.has(ev.t)) this.spot.fx = true;
    }
    this.running = false;
  }

  /* ================================================================ geometría */
  spotRect() {
    const vw = innerWidth, vh = innerHeight;
    const hh = Math.min(vh * 0.62, vw * 0.78 * 675 / 480, 660); const ww = hh * 480 / 675;
    return { x: (vw - ww) / 2, y: Math.max(66, (vh - hh) / 2 - 20), w: ww, h: hh };
  }
  deckZoneOf(def) {
    if (def.kind === 'item') return def.deck === 'potion' ? 'potions' : def.deck === 'trapping' ? 'trappings' : 'loot';
    if (def.kind === 'enemy') return def.inLootDeck ? 'loot' : 'enemies';
    return { plot: 'plots', boss: 'door4', skill: 'skills' }[def.kind] || 'dungeon';
  }
  discardZoneOf(def) {
    if (def.isDungeon) return 'door3';
    if (def.kind === 'item') return def.deck === 'potion' ? 'potionsUsed' : 'lootUsed';
    return 'lootUsed';
  }
  /** dónde está (o dónde irá) un objeto del héroe, en pantalla: su ranura si el tablero de personaje está a la vista; si no, el botón de navegación */
  tableRectOfOwned(uid) {
    const T = this.T; const e = this.vs.eq;
    if (T.tab === 'char') {
      for (const [slot, z] of [['MP', 'c_main'], ['OM', 'c_off'], ['CA', 'c_head'], ['CP', 'c_body']]) if (e[slot] === uid) return T.screenRect(z);
      if (e.AC.includes(uid)) return T.screenRect('c_acc');
      return this._navRect('pack');
    }
    return this._navRect(e.AC.includes(uid) || ['MP', 'OM', 'CA', 'CP'].some((k) => e[k] === uid) ? 'char' : 'pack');
  }
  _navRect(which) {
    const el = document.querySelector(which === 'char' ? '#nav [data-tab="char"]' : '#nav .pack') || document.querySelector('#nav [data-tab="char"]');
    const t = el?.getBoundingClientRect(); return t ? { x: t.left + t.width / 2 - 24, y: t.top - 10, w: 48, h: 68 } : { x: innerWidth / 2 - 24, y: innerHeight - 90, w: 48, h: 68 };
  }
  _trayRect() { return this._navRect('pack'); }

  /* ================================================================ pausas para leer */
  /**
   * Mantiene la escena hasta que el jugador toque (o Intro/Espacio). Con "timed" espera un tiempo según el texto y con "off" casi nada.
   * `lines`: lo que ha pasado (se muestra en una placa abajo). Mientras tanto no hay nada más que tape la carta.
   */
  async hold({ lines = [], cue = 'Toca para continuar', min = 900 } = {}) {
    const mode = this.app.settings.reading || 'tap'; const txt = lines.filter(Boolean).slice(-3);
    if (mode === 'off') { await this.wait(Math.min(min, 350)); return; }
    this.app.caption('');
    return new Promise((resolve) => {
      let done = false; let timer = null;
      const el = h('div#hold', { role: 'button', tabindex: '-1', 'aria-label': 'Continuar' },
        h('div.hold-plate', ...txt.map((t) => h('p', t)), h('span.hold-cue', mode === 'tap' ? cue : '…')));
      const finish = () => {
        if (done) return; done = true; clearTimeout(timer); removeEventListener('keydown', key, true); this.holding = false;
        el.classList.add('leaving'); setTimeout(() => el.remove(), 180); sound.tap(); resolve();
      };
      const key = (e) => { if (['Enter', ' ', 'Escape'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); finish(); } };
      this.holding = true; this.app.screen.append(el); addEventListener('keydown', key, true);
      el.addEventListener('click', () => { if (el.classList.contains('armed')) finish(); });
      if (mode === 'timed') timer = setTimeout(finish, Math.min(7000, 1500 + txt.join(' ').length * 32) * (speed.k || 1));
      setTimeout(() => el.classList.add('armed'), 250);   // evita que el toque que acaba de dar la acción cierre la pausa
    });
  }
  /** línea de texto sobre lo ocurrido (para la placa de la pausa) */
  note(msg) { if (msg) this.recent.push(msg); if (this.recent.length > 6) this.recent.shift(); }

  /* ================================================================ eventos */
  async handle(ev) {
    const fn = this['on_' + ev.t]; if (fn) await fn.call(this, ev);
  }

  async on_log(ev) {
    this.app.onLog(ev);
    if (this.arena.open_ && ev.cat === 'combat') this.arena.say(ev.msg);
    if (CAPTION_CATS.has(ev.cat) && ev.cat !== 'combat') this.note(ev.msg);
    // con una carta a la vista, lo ocurrido se lee en la placa de la pausa; si no, sale como rótulo
    if (this.app.settings.captions && CAPTION_CATS.has(ev.cat) && (!this.spot || this.app.settings.reading === 'off')) { this.app.caption(ev.msg); }
  }

  /* ---- reparto y revelado ---- */
  async on_deal(ev) {
    this.recent = []; this.dismissed.clear();
    const T = this.T; this.vs.counts.dungeon = Math.max(0, this.vs.counts.dungeon - 2); T.render();
    this.vs.pair = [null, null]; this.vs.hidePair = [true, true]; T.faceUp = new Set();
    const from = T.screenRect('dungeon'); const back = backOfDeck('dungeon');
    sound.deal();
    const gs = [0, 1].map(() => new Ghost({ front: null, back, rect: from }));
    await Promise.all(gs.map((g, i) => g.fly(T.screenRect('door' + (i + 1)), { ms: this.k(560), delay: i * this.k(150), arc: 40 * T.cam.s + 20, rot: i ? 2 : -2 })));
    this.vs.pair = ev.uids.slice(); this.vs.hidePair = [false, false]; T.render(); gs.forEach((g) => g.remove());
    await this.wait(80);
  }
  async on_reveal(ev) {
    const T = this.T; const g = this.g; const def = g.def(ev.uid);
    if (ev.both) { // antorcha / lámpara: ambas cartas se giran sobre la mesa
      (T.faceUp ||= new Set()).add(ev.uid); T.render(); sound.flip(); await this.wait(350); return;
    }
    const from = T.screenRect('door' + (ev.slot + 1));
    this.vs.hidePair[ev.slot] = true; T.render();
    const gh = new Ghost({ front: g.img(ev.uid), back: backOf(def), rect: from, z: 150 });
    sound.flip();
    await gh.fly(this.spotRect(), { ms: this.k(650), flip: true, arc: 30 });
    this.clearSpot(true); this.recent = []; this.spot = { gh, uid: ev.uid, side: ev.side, fx: false };
    gh.el.style.pointerEvents = 'auto'; gh.el.style.cursor = 'pointer'; gh.el.dataset.nodrag = '1';
    gh.el.addEventListener('click', () => this.app.onSpotTap());
    this.markSide(ev.side, def);
    await this.wait(250);
  }
  /** atenúa la mitad de la carta que no se aplica (partes 1 y 2) */
  markSide(side, def) {
    if (!this.spot || !def.type || def.type !== 2) return;
    const gh = this.spot.gh; gh.el.querySelectorAll('.half').forEach((n) => n.remove());
    const mk = (top, hgt, active) => h('div.half', { style: `position:absolute;left:0;width:480px;top:${top}px;height:${hgt}px;z-index:6;pointer-events:none;border-radius:10px;background:${active ? 'transparent' : 'rgba(0,0,0,.62)'};${active ? 'box-shadow:inset 0 0 0 4px #86683a, inset 0 0 0 8px #1b0f08' : ''}` });
    gh.el.append(mk(96, 262, side === 1), mk(364, 262, side === 2));
  }
  async on_resolving(ev) { if (this.spot?.uid === ev.uid) this.markSide(ev.side, this.g.def(ev.uid)); await this.wait(120); }
  clearSpot(instant = false) { if (!this.spot) return; this.spot.gh.remove(); this.spot = null; }
  async dismissSpot(zone = 'door3') {
    if (!this.spot) return;
    const gh = this.spot.gh; const uid = this.spot.uid; const def = this.g.def(uid); this.spot = null; this.dismissed.add(uid);
    gh.el.querySelectorAll('.half').forEach((n) => n.remove()); gh.el.style.pointerEvents = 'none';
    sound.slide();
    await gh.fly(this.T.screenRect(zone, undefined), { ms: this.k(520), flip: false, rot: 4 });
    gh.remove();
    if (def.isDungeon && zone === 'door3') { const l = this.vs.piles.dungeonDiscard; if (!l.includes(uid)) l.push(uid); this.T.render(); }
  }
  /** al girar la pantalla, la carta que se está mirando se vuelve a colocar en su sitio */
  relayout() { if (this.spot) this.spot.gh.set(this.spotRect(), 0); }
  /** a dónde va la carta que se está mirando cuando se retira: trama → tramas resueltas, enemigo → cementerio, resto → descarte */
  spotZone() {
    const sp = this.spot; if (!sp) return 'door3'; if (sp.plot) return 'plotsUsed';
    const d = this.g.def(sp.uid); return d.kind === 'enemy' && !d.isDungeon ? 'graveyard' : 'door3';
  }
  /** la carta de una escena (trama, altar…) se queda a la vista mientras se resuelve lo que has elegido */
  adoptSpot(uid, rect, { plot = false } = {}) {
    if (this.spot?.uid === uid) return;
    this.clearSpot(true); const g = this.g; const def = g.def(uid);
    const gh = new Ghost({ front: g.img(uid), back: backOf(def), rect, up: true, z: 150 });
    this.spot = { gh, uid, side: 0, plot, fx: false }; this.recent = [];
    gh.fly(this.spotRect(), { ms: this.k(260) });
  }

  /* ---- descartes ---- */
  async on_discardCard(ev) {
    const T = this.T; const g = this.g; const def = g.def(ev.uid); const vs = this.vs;
    const toZone = this.discardZoneOf(def);
    const push = (list) => { if (!list.includes(ev.uid)) list.push(ev.uid); T.render(); };
    if (this.spot?.uid === ev.uid) {
      await this.dismissSpot(toZone); push(vs.piles.dungeonDiscard); return;
    }
    if (this.dismissed.has(ev.uid)) { push(def.isDungeon ? vs.piles.dungeonDiscard : vs.piles.lootUsed); return; }
    if (def.isDungeon) {
      const slot = vs.pair.indexOf(ev.uid); let from = slot >= 0 ? T.screenRect('door' + (slot + 1)) : T.screenRect('door1');
      if (slot >= 0) { vs.hidePair[slot] = true; T.render(); }
      const gh = new Ghost({ front: g.img(ev.uid), back: backOf(def), rect: from, z: 150 }); sound.slide();
      await gh.fly(T.screenRect(toZone), { ms: this.k(480), rot: -3 }); gh.remove(); push(vs.piles.dungeonDiscard); return;
    }
    // objetos del héroe u otras cartas
    if (def.kind === 'item') {
      const from = this.tableRectOfOwned(ev.uid);
      for (const k of ['MP', 'OM', 'CA', 'CP']) if (vs.eq[k] === ev.uid) vs.eq[k] = null;
      vs.eq.AC = vs.eq.AC.filter((u) => u !== ev.uid); vs.hand = vs.hand.filter((u) => u !== ev.uid); T.render(); this.app.updateTray();
      const gh = new Ghost({ front: g.img(ev.uid), back: backOf(def), rect: from, up: true, z: 150 });
      const why = ev.why;
      if (why === 'use' || why === 'eat') { sound.potion(); burst({ x: from.x + from.w / 2, y: from.y + from.h / 2 }, '255,230,150', 240); await gh.fly({ x: from.x - from.w * 0.25, y: from.y - from.h * 0.7, w: from.w * 1.5, h: from.h * 1.5 }, { ms: this.k(400) }); gh.remove(); }
      else if (why === 'broken' || why === 'devoured') { sound.hit(); burst({ x: from.x + from.w / 2, y: from.y + from.h / 2 }, '255,120,90', 220); await sleep(this.k(200)); gh.remove(); }
      else { await gh.fly(T.screenRect(toZone), { ms: this.k(500), arc: 30 }); gh.remove(); }
      if (def.deck === 'potion') push(vs.piles.potionsUsed); else if (def.deck !== 'trapping') push(vs.piles.lootUsed);
      return;
    }
    // cartas sin destino visible (tramas descartadas…): se apagan
    await this.wait(120);
  }

  /* ---- robar de mazos ---- */
  async on_draw(ev) {
    const def = this.g.def(ev.uid); const z = this.deckZoneOf(def); const key = { loot: 'loot', potions: 'potions', enemies: 'enemies', plots: 'plots', trappings: 'trappings', skills: 'skills' }[z === 'rubble' ? '' : z];
    if (key && key in this.vs.counts) this.vs.counts[key] = Math.max(0, this.vs.counts[key] - 1);
    if (def.kind === 'affliction') this.drawn.set(ev.uid, { from: this.T.screenRect(L.extras ? 'x_aff' : 'enemies') }); else this.drawn.set(ev.uid, { zone: z });
    this.T.render();
  }
  /** rectángulo (en pantalla) donde se enseña una carta ganada, a buen tamaño para leerla */
  showRect(k = 0.7) { const r = this.spotRect(); return { x: r.x + r.w * (1 - k) / 2, y: r.y + r.h * (1 - k) / 2 + 14, w: r.w * k, h: r.h * k }; }
  async on_gainCard(ev) {
    if (ev.silent || this.app.overlays.userKind === 'shop') {
      this.drawn.delete(ev.uid); const o = this.app.takeOrigin(ev.uid); const to = this.app.overlays.shopMineRect();
      if (o && to && this.app.overlays.userKind === 'shop') { // lo comprado viaja a "Tu equipo"
        const gh = new Ghost({ front: this.g.img(ev.uid), back: backOf(this.g.def(ev.uid)), rect: o, up: true, z: 460 }); sound.token(); this._syncOwned();
        await gh.fly(to, { ms: this.k(420), arc: 24 }); gh.remove(); sound.equip();
      } else this._syncOwned();
      return;
    }
    const T = this.T; const g = this.g; const def = g.def(ev.uid); const info = this.drawn.get(ev.uid); this.drawn.delete(ev.uid);
    const origin = this.app.takeOrigin(ev.uid);
    let gh;
    if (origin) { // el jugador la ha elegido en un menú: sale de donde la tocó
      sound.deal();
      gh = new Ghost({ front: g.img(ev.uid), back: backOf(def), rect: origin, up: true, z: 160 });
      this._syncOwned(); sound.token();
      await gh.fly(this.tableRectOfOwned(ev.uid), { ms: this.k(520), arc: 30 }); gh.remove(); sound.equip(); T.render(); this.app.updateTray(); return;
    }
    // Mientras se enseña el objeto no hay nada más en pantalla: la carta que lo ha dado se retira primero
    if (this.spot) await this.dismissSpot(this.spotZone());
    sound.deal();
    const zone = info?.zone || this.deckZoneOf(def);
    const from = info?.from || T.screenRect(zone === 'door4' ? 'enemies' : zone);
    gh = new Ghost({ front: g.img(ev.uid), back: backOf(def), rect: from, z: 160 });
    await gh.fly(this.showRect(), { ms: this.k(560), flip: true, arc: 40 });
    const what = def.kind === 'artifact' || def.deck === 'artifact' ? 'Artefacto' : def.deck === 'potion' ? 'Poción' : def.deck === 'trapping' ? 'Equipo' : 'Botín';
    sound.token();
    await this.hold({ lines: [`${what}: ${def.name}`, ...(def.price != null && def.kind === 'item' ? [`Peso ${def.weight ?? '—'} · valor ${def.price}`] : [])], min: def.deck === 'potion' || def.deck === 'trapping' ? 650 : 900 });
    this._syncOwned();
    await gh.fly(this.tableRectOfOwned(ev.uid), { ms: this.k(520), arc: 30 }); gh.remove(); sound.equip();
    T.render(); this.app.updateTray();
  }
  _syncOwned() { const g = this.g; const vs = this.vs; vs.eq = { MP: g.s.eq.MP, OM: g.s.eq.OM, CA: g.s.eq.CA, CP: g.s.eq.CP, AC: g.s.eq.AC.slice() }; vs.hand = g.s.z.hand.slice(); this.T.render(); this.app.updateTray(); }
  async on_equip(ev) { this._syncOwned(); if (!ev.auto) sound.equip(); }
  async on_unequip() { this._syncOwned(); sound.equip(); }
  async on_returnCard() { this._syncOwned(); sound.coin(); }
  async on_sellCard() { this._syncOwned(); sound.coin(); }
  async on_learnSkill(ev) {
    const g = this.g; const d = g.cat.def(ev.id);
    this.vs.skills = g.s.hero.skills.map((id) => ({ id, uid: g.s.hero.skillCards[id] })); this.vs.counts.skills = g.s.z.skills.length;
    if (ev.free) { this.T.render(); return; }
    sound.level();
    if (this.spot) await this.dismissSpot(this.spotZone());
    this.app.overlays.clearUser(); this.app.screen.classList.add('showcase');
    const gh = new Ghost({ front: d.img, back: backOfDeck('skills'), rect: this.T.screenRect('skills'), z: 160 });
    await gh.fly(this.showRect(), { ms: this.k(560), flip: true, arc: 40 });
    await this.hold({ lines: [`Nueva habilidad: ${d.name}`, d.text ? String(d.text).slice(0, 160) : ''] });
    gh.remove(); this.app.screen.classList.remove('showcase'); this.T.render();
  }
  async on_reshuffle() { sound.deal(); }
  async on_peek(ev) { await this.wait(100); }

  /* ---- estadísticas ---- */
  async on_stat(ev) {
    const T = this.T; const s = this.vs.stats; const map = { hp: 'hp', energy: 'energy', gold: 'gold', rations: 'rations', poison: 'poison', blessing: 'blessing', morality: 'morality', maxhp: 'maxHp' };
    const key = map[ev.stat]; if (key) s[key] = ev.stat === 'maxhp' ? this.g.maxHp() : ev.to;
    s.weight = this.g.weight(); s.maxWeight = this.g.maxWeight();
    T.render(); this.app.updateHud(); this.arena.open_ && this.arena.refreshHero();
    if (ev.stat === 'morality' || ev.stat === 'maxhp') { await this.wait(ev.stat === 'morality' ? 450 : 0); return; }
    const delta = ev.to - ev.from; if (!delta) return;
    const well = STAT_WELL[ev.stat];
    const at = this._statTarget(ev.stat, well);
    const good = ev.stat === 'poison' ? delta < 0 : delta > 0;
    floatText(`${delta > 0 ? '+' : '−'}${Math.abs(delta)}`, at, good ? 'good' : 'bad');
    const tk = `assets/tokens/tk_${well}.png`;
    const sr = this.spot ? this.spot.gh.rect : null;
    const src = this.arena.open_ ? { x: at.x, y: at.y + 130 } : sr ? { x: sr.x + sr.w / 2, y: sr.y + sr.h / 2 } : { x: innerWidth / 2, y: innerHeight * 0.46 };
    if (delta > 0) { for (let i = 0; i < Math.min(delta, 4); i++) flyChip(tk, src, at, { ms: this.k(520), delay: i * 90 }); }
    else for (let i = 0; i < Math.min(-delta, 4); i++) flyChip(tk, at, { x: src.x + (i - 1.5) * 12, y: src.y }, { ms: this.k(520), delay: i * 70 });
    if (ev.stat === 'hp') { if (delta < 0) { sound.hurt(); vignette(); } else { sound.heal(); vignette('green'); } }
    else if (ev.stat === 'gold') sound.coin(); else if (ev.stat === 'poison') { if (delta > 0) { sound.poison(); vignette('green'); } else sound.heal(); }
    else if (ev.stat === 'blessing') sound.bless(); else sound.token();
    await this.wait(380);
  }
  /** punto de pantalla donde "aterrizan" las fichas: arena > pocillo del tapete visible > barra superior */
  _statTarget(stat, well) {
    if (this.arena.open_) return this._arenaChipAt(stat);
    const T = this.T; const p = T.tab === 'char' ? T.wellCenter(well) : T.bankCenter(well);
    if (p.x > 24 && p.x < innerWidth - 24 && p.y > 56 && p.y < innerHeight - 76) return p;
    const chip = document.querySelector(`#hud .stat[data-stat="${stat}"]`); const r = chip?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: 40 };
  }
  _arenaChipAt(stat) {
    const el = this.arena.heroChips; const idx = { hp: 0, energy: 1, poison: 2, blessing: 3, gold: 4, rations: 5 }[stat] ?? 0; const kid = el.children[idx];
    const r = (kid || el).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  async on_eyes(ev) { this.vs.stats.eyes = ev.eyes; this.T.render(); sound.eye(); vignette(); const e = this.T.eyesBadge; e.classList.add('pop'); await this.wait(500); e.classList.remove('pop'); this.app.updateHud(); }

  /* ---- trama ---- */
  async on_plot(ev) {
    const g = this.g; const def = g.def(ev.uid);
    this.clearSpot();
    const from = this.T.screenRect('plots'); const gh = new Ghost({ front: g.img(ev.uid), back: backOf(def), rect: from, z: 150 });
    sound.deal(); await gh.fly(this.spotRect(), { ms: this.k(650), flip: true, arc: 40 });
    this.recent = []; this.spot = { gh, uid: ev.uid, side: 0, plot: true, fx: false }; await this.wait(450);
  }

  /* ---- niveles y turnos ---- */
  async on_levelStart(ev) { this.vs.stats.level = ev.level; this.vs.stats.turn = 0; this.vs.counts.dungeon = this.g.s.z.dungeon.length; this.vs.piles.dungeonDiscard = []; this.T.render(); this.app.updateHud(); await this.banner(`NIVEL ${ev.level}`, 'La mazmorra se agita…'); }
  async on_levelUp(ev) { this.vs.stats.level = ev.level; this.T.render(); sound.level(); await this.wait(300); }
  async on_levelEnd(ev) { await this.banner('FIN DEL NIVEL', `Nivel ${ev.level} completado`); }
  async on_turnEnd(ev) { this.vs.stats.turn = ev.turn; this.T.render(); }
  async banner(title, sub = '') {
    sound.level();
    const el = h('div', { style: 'position:fixed;inset:0;z-index:420;display:grid;place-items:center;pointer-events:none;background:linear-gradient(transparent,rgba(0,0,0,.55) 40%,rgba(0,0,0,.55) 60%,transparent);animation:fadein .3s both' },
      h('div', { style: 'text-align:center' }, h('div', { style: 'font:900 clamp(40px,9vw,92px) var(--font-title);letter-spacing:.14em;color:#f1d79a;text-shadow:0 0 30px rgba(255,160,50,.6),0 4px 0 #6a3a10,0 8px 18px #000' }, title),
        sub ? h('div', { style: 'font:italic 500 clamp(18px,3vw,28px) var(--font-body);color:#e8d3a6;text-shadow:0 2px 6px #000' }, sub) : null));
    document.body.append(el); await this.wait(1100); el.style.transition = 'opacity .45s'; el.style.opacity = '0'; await this.wait(450); el.remove();
  }
  async on_trap(ev) { sound.hit(); if (ev?.hazard === 'gas' || ev?.hazard === 'acid') vignette('green'); else if (ev?.hazard === 'sand') vignette('gold'); await this.wait(300); }

  /* ---- combate ---- */
  async on_combatStart(ev) {
    this.clearSpot(); this.app.overlays.clearPrompt();
    const sp = this.spot; void sp;
    await this.arena.open(ev);
  }
  async on_dice(ev) {
    if (this.arena.open_) await this.arena.rollDice(ev);
    else await this.miniRoll(ev);
  }
  async on_diceReroll(ev) { if (this.arena.open_) await this.arena.rerolled(ev); }
  async on_enemyHp(ev) { if (!this.arena.open_) return; this.arena.setHp(ev.hp, ev.maxHp); await this.arena.hitEnemy(ev.dmg, ev.cause); }
  async on_attackResolved(ev) { if (this.arena.open_) { this.arena.showTotal(ev.total); await this.wait(450); } }
  async on_punch() { await this.wait(100); }
  async on_enemyHit(ev) {
    if (!this.arena.open_) return;
    await this.arena.enemyLunge();
    if (ev.dmg > 0) { shake(this.arena.el); } else { this.arena.say('¡Tu armadura detiene el golpe!'); sound.equip(); }
    await this.wait(200);
  }
  async on_enemyMiss() { if (!this.arena.open_) return; sound.miss(); this.arena.say('¡El enemigo falla!'); await this.wait(550); }
  async on_enemyDefeated() {
    if (!this.arena.open_) return;
    await this.arena.defeated();
    await this.hold({ lines: [`Has derrotado a ${this.arena.def?.name || 'tu enemigo'}`], cue: 'Toca para continuar', min: 600 });
    await this.arena.enemyDie();
  }
  async on_throw(ev) { sound.sword(); await this.wait(150); }
  async on_potionThrown() { sound.potion(); await this.wait(150); }
  async on_combatEnd(ev) { if (this.arena.open_) await this.arena.end(); this.T.faceUp = new Set(); this.T.render(); }

  /* ---- jefe, visita divina, final ---- */
  async on_boss(ev) {
    const g = this.g; const def = g.def(ev.uid); this.clearSpot();
    sound.gong(); vignette('gold');
    const gh = new Ghost({ front: g.img(ev.uid), back: backOf(def), rect: this.T.screenRect('door4'), z: 150 });
    await gh.fly(this.spotRect(), { ms: this.k(900), flip: true, arc: 60 });
    await this.hold({ lines: [`¡${def.name} despierta!`], cue: 'Toca para enfrentarte a él' }); gh.remove();
  }
  async on_divine() { sound.bless(); }
  async on_gameover(ev) { this.clearSpot(); if (this.arena.open_) await this.arena.end(); sound.victory?.call(sound); if (ev.result !== 'victory') sound.defeat(); await this.wait(700); }
  async on_affliction(ev) {
    const def = this.g.def(ev.uid); sound.poison();
    if (this.spot) await this.dismissSpot(this.spotZone());
    const gh = new Ghost({ front: this.g.img(ev.uid), back: backOf(def), rect: this.T.screenRect(L.extras ? 'x_aff' : 'enemies'), z: 150 });
    await gh.fly(this.showRect(0.8), { ms: this.k(600), flip: true, arc: 40 });
    await this.hold({ lines: [`Sufres una aflicción: ${def.name}`, def.text ? String(def.text).slice(0, 170) : ''] }); gh.remove();
    this.vs.afflictions = this.g.s.hero.afflictions.slice(); this.T.render();
  }
  async on_cureAffliction() { sound.heal(); this.vs.afflictions = this.g.s.hero.afflictions.slice(); this.T.render(); this.note('Una aflicción se cura.'); }
  async on_enemyHitDone() {}

  /* ---- expansiones: entornos, esbirros, encuentros, artefactos y mirar cartas ---- */
  async on_environment(ev) {
    const g = this.g; const T = this.T; const def = g.def(ev.uid);
    this.vs.counts.environments = Math.max(0, (this.vs.counts.environments || 0) - 1);
    if (this.spot) await this.dismissSpot(this.spotZone());
    sound.deal();
    const from = L.ZONES.x_env ? T.screenRect('x_env') : T.screenRect('enemies');
    const gh = new Ghost({ front: g.img(ev.uid), back: backOfDeck('environments'), rect: from, z: 160 });
    await gh.fly(this.showRect(0.8), { ms: this.k(600), flip: true, arc: 40 });
    await this.hold({ lines: [`Entorno de este nivel: ${def.name}`] });
    this.vs.env = ev.uid; T.render();
    if (L.ZONES.x_env) await gh.fly(T.screenRect('x_env'), { ms: this.k(480) });
    gh.remove();
  }
  async on_mercenary(ev) {
    const g = this.g; const def = g.def(ev.uid);
    this.vs.mercs = (g.s.mercs || []).map((m) => ({ ...m })); this.T.render();
    if (ev.kind === 'hire') { sound.coin(); this.note(`${def.name} se une a tu grupo.`); return; }
    if (ev.kind === 'morale') { sound.token(); this.note(`${def.name}: moral ${ev.morale}.`); await this.wait(250); return; }
    if (ev.kind === 'leave' && this.app.overlays.userKind !== 'shop') {
      sound.poison();
      const gh = new Ghost({ front: g.img(ev.uid), back: backOf(def), rect: this.T.screenRect('c_hero'), z: 160 });
      await gh.fly(this.showRect(0.8), { ms: this.k(520), flip: true, arc: 30 });
      await this.hold({ lines: [`${def.name} te abandona: su moral se ha agotado.`] }); gh.remove();
    }
  }
  async on_encounter(ev) {
    const g = this.g; this.vs.encounter = g.s.encounter ? { ...g.s.encounter } : null; this.T.render();
    const txt = { trap: 'una trampa', enemy: 'un enemigo', mushrooms: 'setas', treasure: 'un tesoro', potion: 'una poción', random: 'algo inesperado' }[ev.icon] || 'algo';
    this.note(`Encuentro aleatorio: ${txt}.`); sound.eye(); await this.wait(500);
  }
  async on_artifactPaid(ev) { sound.bless(); this.note(`Pagas ${ev.cost} bendición${ev.cost === 1 ? '' : 'es'} por ${this.g.def(ev.uid).name}.`); await this.wait(200); }
  async on_peekCards(ev) {
    const g = this.g; const uids = ev.uids || [];
    if (!uids.length) { this.app.toast('No hay cartas que mirar.'); return; }
    sound.page();
    const n = uids.length; const cw = Math.min(innerWidth * 0.8 / n, innerHeight * 0.5 * 480 / 675, 190);
    const row = h('div.peek-row', ...uids.map((u) => h('div.peek-card', { style: `width:${cw}px;height:${cw * 675 / 480}px` }, cardEl({ front: g.img(u), back: backOf(g.def(u)), up: true }))));
    const el = h('div.peek', h('div.peek-title', ev.deck === 'dungeonDiscard' ? 'Descarte de la mazmorra' : 'Cartas reveladas'), row); this.app.screen.append(el);
    await this.hold({ lines: [`${n} carta${n === 1 ? '' : 's'}: ${uids.map((u) => g.def(u).name).join(', ')}`], cue: 'Toca para cerrar' });
    el.remove();
  }
  async on_tradeCard() { sound.coin(); }

  /* ---- ANEMIA y reglas variantes ---- */
  async on_imp(ev) {
    this.vs.imp = ev.pos; this.T.render();
    if (ev.steals) { const k = { loot: 'loot', potions: 'potions' }[ev.steals]; if (k) this.vs.counts[k] = Math.max(0, this.vs.counts[k] - 1); this.T.render(); sound.poison(); this.note('El Diablillo se lleva una carta del mazo.'); floatText('−1 carta', this.T.zoneCenter(ev.steals === 'potions' ? 'potions' : 'loot'), 'bad'); await this.wait(500); }
    else await this.wait(260);
  }
  async on_xpSpent(ev) { sound.level(); this.note(ev.stat === 'hp' ? 'Gastas 7 enemigos: +1 de salud máxima.' : 'Gastas 7 enemigos: +1 de energía máxima.'); this.vs.stats.maxHp = this.g.maxHp(); this.T.render(); this.app.updateHud(); await this.wait(350); }
  async on_armLost() { sound.hurt(); vignette(); this.note('Pierdes el uso de tu otra mano.'); await this.hold({ lines: ['Justo antes de morir, sacrificas el uso de tu otra mano.'], cue: 'Toca para continuar' }); }
  async on_parcaOffer() { sound.gong(); vignette(); await this.wait(300); }
  async on_afterlife(ev) {
    if (ev.enter) { this.clearSpot(true); sound.gong(); await this.banner('TIERRA DE NOD', 'La Parca te espera…'); }
    else { sound.bless(); vignette('gold'); await this.banner('¡REGRESAS!', 'Has derrotado a La Parca'); this.vs.skills = this.g.s.hero.skills.map((id) => ({ id, uid: this.g.s.hero.skillCards[id] })); this.T.render(); }
  }
  async on_bomb() { sound.hit(); vignette('gold'); burst({ x: innerWidth / 2, y: innerHeight / 2 }, '255,200,110', 520); this.note('¡La Bomba de Dios estalla!'); await this.wait(700); }
  async on_adventure(ev) { sound.gong(); await this.banner(`AVENTURA ${ev.index + 1} DE ${ev.total}`, `Nivel de aventura ${ev.level}`); }
  async on_incantation(ev) { sound.bless(); this.note(`${ev.name}: ${ev.text}`); await this.hold({ lines: [`Encantamiento · ${ev.name}`, ev.text], cue: 'Toca para continuar', min: 700 }); }
  async on_campMoment(ev) { sound.page(); await this.hold({ lines: [`Momento de paz con ${ev.who}`, ev.text], cue: 'Toca para continuar', min: 700 }); }
  async on_dungeonSwap(ev) {
    const g = this.g; const def = g.def(ev.to); sound.flip();
    if (this.spot?.uid === ev.from) await this.dismissSpot('door3'); else this.dismissed.add(ev.from);
    const p = this.vs.piles.dungeonDiscard; if (!p.includes(ev.from)) p.push(ev.from);
    this.vs.counts.dungeon = Math.max(0, this.vs.counts.dungeon - 1); this.T.render();
    const gh = new Ghost({ front: g.img(ev.to), back: backOf(def), rect: this.T.screenRect('dungeon'), z: 150 });
    await gh.fly(this.spotRect(), { ms: this.k(600), flip: true, arc: 30 }); this.clearSpot(true); this.recent = [];
    this.spot = { gh, uid: ev.to, side: 0, fx: false }; gh.el.style.pointerEvents = 'auto'; gh.el.style.cursor = 'pointer'; gh.el.addEventListener('click', () => this.app.onSpotTap());
    this.markSide(1, def); await this.wait(250);
  }
  async on_enemyEscaped() { if (this.arena.open_) await this.arena.enemyEscape(); }
  async on_heroSwap(ev) {
    const g = this.g; const hero = g.cat.pools.heroes.find((x) => x.id === ev.id);
    this.vs.heroId = ev.id; this.vs.skills = g.s.hero.skills.map((id) => ({ id, uid: g.s.hero.skillCards[id] })); this.vs.stats.maxHp = g.maxHp(); this.T.render(); this.app.updateHud();
    if (!hero) return;
    sound.level(); const gh = new Ghost({ front: hero.img, back: backOfDeck('heroes'), rect: this.T.screenRect('c_hero'), z: 160 });
    await gh.fly(this.showRect(0.8), { ms: this.k(600), flip: true, arc: 40 });
    await this.hold({ lines: [`Cambias de cuerpo: ahora eres ${ev.name}`] }); gh.remove();
  }
  async on_skillForgotten(ev) {
    const d = this.g.cat.def(ev.id); this.vs.skills = this.g.s.hero.skills.map((id) => ({ id, uid: this.g.s.hero.skillCards[id] })); this.T.render();
    sound.poison(); this.note(`Olvidas «${d?.name || 'una habilidad'}» durante este nivel.`); this.app.caption(`Olvidas «${d?.name || 'una habilidad'}» durante este nivel`); await this.wait(500);
  }
  async on_cardState() { this.app.updateTray(); this.T.render(); }

  /* ---- tiradas fuera de combate ---- */
  async miniRoll(ev) {
    if (ev.purpose === 'reroll') return;
    const titles = { altar: 'Altar', cetreria: 'Cetrería', apuesta: 'Apuesta', ocultacion: 'Ocultación', bloquear: 'Bloquear', trap: 'Trampa de foso', tabla: 'Tirada', espejo: 'El espejo', capsula: 'Cápsula Corazón', shuriken: 'Shuriken', sombra: 'Sombra' };
    const label = titles[ev.purpose] || 'Tirada';
    const box = h('div', { style: 'position:fixed;left:50%;top:44%;width:min(420px,86vw);height:200px;transform:translate(-50%,-50%);z-index:410;border-radius:22px;background:url(assets/textures/felt.jpg) center/320px,#1d4a33;box-shadow:inset 0 0 50px 8px rgba(0,0,0,.65),0 0 0 7px #3b2412,0 20px 50px #000e;animation:rise .3s both' },
      h('div', { style: 'position:absolute;left:0;right:0;top:-44px;text-align:center;font:800 22px var(--font-title);color:var(--gold2);text-shadow:0 2px 6px #000' }, label));
    const dz = h('div', { style: 'position:absolute;inset:0' }); box.append(dz); document.body.append(box);
    const { DiceTray } = await import('./dice.js'); const tray = new DiceTray(dz, { size: 62 });
    await tray.throw(ev.values, { black: ev.who === 'enemy' });
    const sum = ev.values.reduce((a, b) => a + b, 0);
    const txt = ev.values.length === 2 ? (ev.purpose === 'altar' || ev.purpose === 'trap' ? `${Math.max(...ev.values)} − ${Math.min(...ev.values)} = ${Math.abs(ev.values[0] - ev.values[1])}` : `= ${sum}`) : '';
    if (txt) { const l = tray.label(txt); l.style.left = '50%'; }
    await this.wait(900); box.style.transition = 'opacity .35s'; box.style.opacity = '0'; await this.wait(350); box.remove();
  }
}
