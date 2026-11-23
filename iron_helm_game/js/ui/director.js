/**
 * El director convierte los eventos del motor en animaciones, en orden y esperando a cada una.
 * El motor ya está en su estado final: aquí solo se cuenta lo que ha pasado.
 */
import { h, sleep, WK_ICON } from './dom.js';
import { Ghost, flyChip, floatText, vignette, shake, burst } from './fx.js';
import { backOf, backOfDeck, cardPath, cardEl } from './cards.js';
import { sound } from './audio.js';
import { ZONES, CARD_D } from './layout.js';

const STAT_WELL = { hp: 'health', energy: 'energy', gold: 'gold', rations: 'ration', poison: 'poison', blessing: 'blessing' };
const STAT_NAME = { hp: 'salud', energy: 'energía', gold: 'oro', rations: 'raciones', poison: 'veneno', blessing: 'bendición' };
const CAPTION_CATS = new Set(['explore', 'plot', 'item', 'skill', 'camp', 'altar', 'merchant', 'boss', 'moral', 'affliction', 'level']);

export class Director {
  constructor(app) { this.app = app; this.q = []; this.spot = null; this.drawn = new Map(); this.running = false; }
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
    return { plot: 'plots', boss: 'rubble', skill: 'skills' }[def.kind] || 'dungeon';
  }
  discardZoneOf(def) {
    if (def.isDungeon) return 'door3';
    if (def.kind === 'item') return def.deck === 'potion' ? 'potionsUsed' : 'lootUsed';
    return 'lootUsed';
  }
  tableRectOfOwned(uid) {
    // dónde está ahora (en pantalla) un objeto del héroe
    const e = this.vs.eq; const g = this.g;
    for (const [slot, z] of [['MP', 'c_main'], ['OM', 'c_off'], ['CA', 'c_head'], ['CP', 'c_body']]) if (e[slot] === uid) return this.T.screenRect(z, undefined);
    if (e.AC.includes(uid)) return this.T.screenRect('c_acc');
    return this._trayRect();
  }
  _trayRect() { const t = document.getElementById('trayTab')?.getBoundingClientRect(); return t ? { x: t.left + t.width / 2 - 28, y: t.top - 20, w: 56, h: 79 } : { x: innerWidth / 2 - 28, y: innerHeight - 90, w: 56, h: 79 }; }

  /* ================================================================ eventos */
  async handle(ev) {
    const fn = this['on_' + ev.t]; if (fn) await fn.call(this, ev);
  }

  async on_log(ev) {
    this.app.onLog(ev);
    if (this.arena.open_ && ev.cat === 'combat') this.arena.say(ev.msg);
    if (this.app.settings.captions && CAPTION_CATS.has(ev.cat)) { this.app.caption(ev.msg); }
  }

  /* ---- reparto y revelado ---- */
  async on_deal(ev) {
    const T = this.T; this.vs.counts.dungeon = Math.max(0, this.vs.counts.dungeon - 2); T.render(true);
    this.vs.pair = [null, null]; this.vs.hidePair = [true, true]; T.faceUp = new Set();
    const from = T.screenRect('dungeon'); const back = backOfDeck('dungeon');
    sound.deal();
    const gs = [0, 1].map(() => new Ghost({ front: null, back, rect: from }));
    await Promise.all(gs.map((g, i) => g.fly(T.screenRect('door' + (i + 1)), { ms: this.k(560), delay: i * this.k(150), arc: 40 * T.cam.s + 20, rot: i ? 2 : -2 })));
    this.vs.pair = ev.uids.slice(); this.vs.hidePair = [false, false]; T.render(true); gs.forEach((g) => g.remove());
    await this.wait(80);
  }
  async on_reveal(ev) {
    const T = this.T; const g = this.g; const def = g.def(ev.uid);
    if (ev.both) { // antorcha / lámpara: ambas cartas se giran sobre la mesa
      (T.faceUp ||= new Set()).add(ev.uid); T.render(true); sound.flip(); await this.wait(350); return;
    }
    const from = T.screenRect('door' + (ev.slot + 1));
    this.vs.hidePair[ev.slot] = true; T.render(true);
    const gh = new Ghost({ front: g.img(ev.uid), back: backOf(def), rect: from, z: 150 });
    sound.flip();
    await gh.fly(this.spotRect(), { ms: this.k(650), flip: true, arc: 30 });
    this.clearSpot(true); this.spot = { gh, uid: ev.uid, side: ev.side };
    gh.el.style.pointerEvents = 'auto'; gh.el.style.cursor = 'pointer'; gh.el.dataset.nodrag = '1';
    gh.el.addEventListener('click', () => this.app.onSpotTap());
    this.markSide(ev.side, def);
    await this.wait(250);
  }
  /** atenúa la mitad de la carta que no se aplica (partes 1 y 2) */
  markSide(side, def) {
    if (!this.spot || !def.type || def.type !== 2) return;
    const gh = this.spot.gh; gh.el.querySelectorAll('.half').forEach((n) => n.remove());
    const mk = (top, hgt, active) => h('div.half', { style: `position:absolute;left:0;width:480px;top:${top}px;height:${hgt}px;z-index:6;pointer-events:none;border-radius:10px;background:${active ? 'transparent' : 'rgba(0,0,0,.62)'};${active ? 'box-shadow:inset 0 0 0 5px #ffd479, 0 0 30px 6px rgba(255,200,110,.75)' : ''}` });
    gh.el.append(mk(96, 262, side === 1), mk(364, 262, side === 2));
  }
  async on_resolving(ev) { if (this.spot?.uid === ev.uid) this.markSide(ev.side, this.g.def(ev.uid)); await this.wait(120); }
  clearSpot(instant = false) { if (!this.spot) return; this.spot.gh.remove(); this.spot = null; }
  async dismissSpot(zone = 'door3') {
    if (!this.spot) return;
    const gh = this.spot.gh; const def = this.g.def(this.spot.uid); this.spot = null;
    gh.el.querySelectorAll('.half').forEach((n) => n.remove()); gh.el.style.pointerEvents = 'none';
    sound.slide();
    await gh.fly(this.T.screenRect(zone, undefined), { ms: this.k(520), flip: false, rot: 4 });
    gh.remove(); void def;
  }

  /* ---- descartes ---- */
  async on_discardCard(ev) {
    const T = this.T; const g = this.g; const def = g.def(ev.uid); const vs = this.vs;
    const toZone = this.discardZoneOf(def);
    const push = (list) => { if (!list.includes(ev.uid)) list.push(ev.uid); T.render(true); };
    if (this.spot?.uid === ev.uid) {
      await this.dismissSpot(toZone); push(vs.piles.dungeonDiscard); return;
    }
    if (def.isDungeon) {
      const slot = vs.pair.indexOf(ev.uid); let from = slot >= 0 ? T.screenRect('door' + (slot + 1)) : T.screenRect('door1');
      if (slot >= 0) { vs.hidePair[slot] = true; T.render(true); }
      const gh = new Ghost({ front: g.img(ev.uid), back: backOf(def), rect: from, z: 150 }); sound.slide();
      await gh.fly(T.screenRect(toZone), { ms: this.k(480), rot: -3 }); gh.remove(); push(vs.piles.dungeonDiscard); return;
    }
    // objetos del héroe u otras cartas
    if (def.kind === 'item') {
      const from = this.tableRectOfOwned(ev.uid);
      for (const k of ['MP', 'OM', 'CA', 'CP']) if (vs.eq[k] === ev.uid) vs.eq[k] = null;
      vs.eq.AC = vs.eq.AC.filter((u) => u !== ev.uid); vs.hand = vs.hand.filter((u) => u !== ev.uid); T.render(true); this.app.updateTray();
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
    if (def.kind === 'affliction') this.drawn.set(ev.uid, { from: this.T.screenRect('enemies') }); else this.drawn.set(ev.uid, { zone: z });
    this.T.render(true);
  }
  async on_gainCard(ev) {
    if (ev.silent) { this._syncOwned(); return; }
    const T = this.T; const g = this.g; const def = g.def(ev.uid); const info = this.drawn.get(ev.uid); this.drawn.delete(ev.uid);
    const zone = info?.zone || this.deckZoneOf(def);
    const from = T.screenRect(zone === 'rubble' ? 'enemies' : zone);
    const gh = new Ghost({ front: g.img(ev.uid), back: backOf(def), rect: from, z: 160 });
    sound.deal();
    const showRect = (() => { const r = this.spotRect(); const k = 0.62; return { x: r.x + r.w * (1 - k) / 2, y: r.y + r.h * (1 - k) / 2 + 20, w: r.w * k, h: r.h * k }; })();
    await gh.fly(showRect, { ms: this.k(560), flip: true, arc: 40 });
    this.app.caption(`${def.deck === 'potion' ? 'Poción' : def.deck === 'trapping' ? 'Equipo' : 'Botín'}: ${def.name}`);
    sound.token(); await this.wait(def.deck === 'potion' || def.deck === 'trapping' ? 650 : 900);
    // destino: ranura o mochila
    this._syncOwned();
    const dest = this.tableRectOfOwned(ev.uid);
    await gh.fly(dest, { ms: this.k(520), arc: 30 }); gh.remove(); sound.equip();
    T.render(true); this.app.updateTray();
  }
  _syncOwned() { const g = this.g; const vs = this.vs; vs.eq = { MP: g.s.eq.MP, OM: g.s.eq.OM, CA: g.s.eq.CA, CP: g.s.eq.CP, AC: g.s.eq.AC.slice() }; vs.hand = g.s.z.hand.slice(); this.T.render(true); this.app.updateTray(); }
  async on_equip(ev) { this._syncOwned(); if (!ev.auto) sound.equip(); }
  async on_unequip() { this._syncOwned(); sound.equip(); }
  async on_returnCard() { this._syncOwned(); sound.coin(); }
  async on_sellCard() { this._syncOwned(); sound.coin(); }
  async on_learnSkill(ev) { this.vs.skills = this.g.s.hero.skills.map((id) => ({ id, uid: this.g.s.hero.skillCards[id] })); if (!ev.free) { sound.level(); this.app.caption(`Nueva habilidad: ${this.g.cat.def(ev.id).name}`); } this.T.render(true); this.vs.counts.skills = this.g.s.z.skills.length; this.T.render(true); await this.wait(ev.free ? 0 : 500); }
  async on_reshuffle() { sound.deal(); }
  async on_peek(ev) { await this.wait(100); }

  /* ---- estadísticas ---- */
  async on_stat(ev) {
    const T = this.T; const s = this.vs.stats; const map = { hp: 'hp', energy: 'energy', gold: 'gold', rations: 'rations', poison: 'poison', blessing: 'blessing', morality: 'morality', maxhp: 'maxHp' };
    const key = map[ev.stat]; if (key) s[key] = ev.stat === 'maxhp' ? this.g.maxHp() : ev.to;
    T.render(true); this.app.updateHud(); this.arena.open_ && this.arena.refreshHero();
    if (ev.stat === 'morality' || ev.stat === 'maxhp') { await this.wait(ev.stat === 'morality' ? 450 : 0); return; }
    const delta = ev.to - ev.from; if (!delta) return;
    const well = STAT_WELL[ev.stat]; const at = this.arena.open_ ? this._arenaChipAt(ev.stat) : T.wellCenter(well);
    const good = ev.stat === 'poison' ? delta < 0 : delta > 0;
    floatText(`${delta > 0 ? '+' : '−'}${Math.abs(delta)}`, at, good ? 'good' : 'bad');
    const tk = `assets/tokens/tk_${well}.png`;
    if (delta > 0) { const src = this.arena.open_ ? { x: at.x, y: at.y + 140 } : { x: at.x, y: at.y + 130 }; for (let i = 0; i < Math.min(delta, 4); i++) flyChip(tk, src, at, { ms: this.k(520), delay: i * 90 }); }
    else for (let i = 0; i < Math.min(-delta, 4); i++) flyChip(tk, at, { x: at.x + (i - 1.5) * 26, y: at.y + 120 }, { ms: this.k(520), delay: i * 70 });
    if (ev.stat === 'hp') { if (delta < 0) { sound.hurt(); vignette(); } else { sound.heal(); vignette('green'); } }
    else if (ev.stat === 'gold') sound.coin(); else if (ev.stat === 'poison') { if (delta > 0) { sound.poison(); vignette('green'); } else sound.heal(); }
    else if (ev.stat === 'blessing') sound.bless(); else sound.token();
    await this.wait(380);
  }
  _arenaChipAt(stat) {
    const el = this.arena.heroChips; const idx = { hp: 0, energy: 1, poison: 2, blessing: 3, gold: 4, rations: 5 }[stat] ?? 0; const kid = el.children[idx];
    const r = (kid || el).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  async on_eyes(ev) { this.vs.stats.eyes = ev.eyes; this.T.render(true); sound.eye(); vignette(); const e = this.T.eyesBadge; e.style.transform = 'scale(1.5)'; e.style.transition = 'transform .5s'; await this.wait(500); e.style.transform = ''; this.app.updateHud(); }

  /* ---- trama ---- */
  async on_plot(ev) {
    const g = this.g; const def = g.def(ev.uid);
    this.clearSpot();
    const from = this.T.screenRect('plots'); const gh = new Ghost({ front: g.img(ev.uid), back: backOf(def), rect: from, z: 150 });
    sound.deal(); await gh.fly(this.spotRect(), { ms: this.k(650), flip: true, arc: 40 });
    this.spot = { gh, uid: ev.uid, side: 0, plot: true }; await this.wait(450);
  }

  /* ---- niveles y turnos ---- */
  async on_levelStart(ev) { this.vs.stats.level = ev.level; this.vs.stats.turn = 0; this.vs.counts.dungeon = this.g.s.z.dungeon.length; this.vs.piles.dungeonDiscard = []; this.T.render(true); this.app.updateHud(); await this.banner(`NIVEL ${ev.level}`, 'La mazmorra se agita…'); }
  async on_levelUp(ev) { this.vs.stats.level = ev.level; this.T.render(true); sound.level(); await this.wait(300); }
  async on_levelEnd(ev) { await this.banner('FIN DEL NIVEL', `Nivel ${ev.level} completado`); }
  async on_turnEnd(ev) { this.vs.stats.turn = ev.turn; this.T.render(true); }
  async banner(title, sub = '') {
    sound.level();
    const el = h('div', { style: 'position:fixed;inset:0;z-index:420;display:grid;place-items:center;pointer-events:none;background:linear-gradient(transparent,rgba(0,0,0,.55) 40%,rgba(0,0,0,.55) 60%,transparent);animation:fadein .3s both' },
      h('div', { style: 'text-align:center' }, h('div', { style: 'font:900 clamp(40px,9vw,92px) var(--font-title);letter-spacing:.14em;color:#f1d79a;text-shadow:0 0 30px rgba(255,160,50,.6),0 4px 0 #6a3a10,0 8px 18px #000' }, title),
        sub ? h('div', { style: 'font:italic 500 clamp(18px,3vw,28px) var(--font-body);color:#e8d3a6;text-shadow:0 2px 6px #000' }, sub) : null));
    document.body.append(el); await this.wait(1100); el.style.transition = 'opacity .45s'; el.style.opacity = '0'; await this.wait(450); el.remove();
  }
  async on_trap(ev) { sound.hit(); await this.wait(300); }

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
  async on_enemyDefeated() { if (this.arena.open_) await this.arena.enemyDie(); }
  async on_throw(ev) { sound.sword(); await this.wait(150); }
  async on_potionThrown() { sound.potion(); await this.wait(150); }
  async on_combatEnd(ev) { if (this.arena.open_) await this.arena.end(); this.T.faceUp = new Set(); this.T.render(true); }

  /* ---- jefe, visita divina, final ---- */
  async on_boss(ev) {
    const g = this.g; const def = g.def(ev.uid); this.clearSpot();
    sound.gong(); vignette('gold');
    const gh = new Ghost({ front: g.img(ev.uid), back: backOf(def), rect: this.T.screenRect('rubble'), z: 150 });
    await gh.fly(this.spotRect(), { ms: this.k(900), flip: true, arc: 60 }); this.app.caption(`¡${def.name} despierta!`); await this.wait(1400); gh.remove();
  }
  async on_divine() { sound.bless(); }
  async on_gameover(ev) { this.clearSpot(); if (this.arena.open_) await this.arena.end(); sound.victory?.call(sound); if (ev.result !== 'victory') sound.defeat(); await this.wait(700); }
  async on_affliction(ev) {
    const def = this.g.def(ev.uid); sound.poison();
    const gh = new Ghost({ front: this.g.img(ev.uid), back: backOf(def), rect: this.T.screenRect('enemies'), z: 150 });
    await gh.fly(this.spotRect(), { ms: this.k(600), flip: true, arc: 40 }); await this.wait(1300); gh.remove();
  }
  async on_cureAffliction() { sound.heal(); }
  async on_enemyHitDone() {}

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
