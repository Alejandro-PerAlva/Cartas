/**
 * Aplicación: une el motor, la mesa, el director de animaciones y los overlays.
 */
import { Game } from '../engine/index.js';
import { h, $, sleep, store, speed, WK_ICON } from './dom.js';
import { Table } from './table.js';
import { Director } from './director.js';
import { Overlays } from './overlays.js';
import { Arena } from './arena.js';
import { Menu } from './menu.js';
import { sound } from './audio.js';
import { setBacks, cardPath, cardEl, backOf } from './cards.js';
import { FOCUS, ZONES } from './layout.js';

const SAVE_KEY = 'ironhelm.save.v2', PREF_KEY = 'ironhelm.prefs.v2', SET_KEY = 'ironhelm.settings.v2', SCORE_KEY = 'ironhelm.scores.v2';
const DEFAULTS = { sound: true, fast: false, autoCam: true, captions: true };
const USE_CODES = new Set(['L1', 'L5', 'P1', 'P2', 'P6', 'L20', 'T2', 'T23', 'L25', 'AT9']);

export class App {
  constructor(root) {
    this.root = root; this.ls = store();
    this.settings = { ...DEFAULTS, ...this._json(SET_KEY, {}) };
    sound.setMuted(!this.settings.sound); speed.k = this.settings.fast ? 0.55 : 1; window.__speed = (k) => { speed.k = k; };
    this.game = null; this.table = null; this.busy = false; this.screen = null;
    this._keys();
    this.showMenu();
  }
  _json(k, d) { try { return JSON.parse(this.ls.getItem(k)) ?? d; } catch { return d; } }
  loadPrefs() { return this._json(PREF_KEY, {}); }
  savePrefs(p) { this.ls.setItem(PREF_KEY, JSON.stringify(p)); }
  saveSettings() { this.ls.setItem(SET_KEY, JSON.stringify(this.settings)); }
  hasSave() { return !!this.ls.getItem(SAVE_KEY); }
  recordScore(score, win) { const s = this._json(SCORE_KEY, { best: 0, wins: 0, games: 0 }); s.games++; if (win) { s.wins++; s.best = Math.max(s.best, score); } this.ls.setItem(SCORE_KEY, JSON.stringify(s)); this.ls.removeItem(SAVE_KEY); return s.best; }

  /* ================================================================ pantallas */
  showMenu() {
    this._teardownGame();
    this.root.innerHTML = '';
    this.menu = new Menu(this, this.root);
  }
  startGame({ heroId, config, seed, godMode = false }) {
    this.savePrefs({ ...config, heroId });
    const game = Game.create({ heroId, config, seed: seed ?? (Math.random() * 2 ** 32) >>> 0, godMode });
    this.lastStart = { heroId, config };
    this.mountGame(game);
  }
  continueGame() {
    try { const g = Game.restore(this.ls.getItem(SAVE_KEY)); this.lastStart = { heroId: g.s.heroId, config: g.s.config }; this.mountGame(g); }
    catch (e) { console.error(e); this.ls.removeItem(SAVE_KEY); this.showMenu(); }
  }
  restart() { const { heroId, config } = this.lastStart; this.startGame({ heroId, config }); }
  leaveToMenu() { this.showMenu(); }
  _teardownGame() { this.unsub?.(); this.unsub = null; this.game = null; this.table = null; this.arena?.close(); }

  mountGame(game) {
    this._teardownGame();
    this.game = game; this.root.innerHTML = '';
    setBacks(game.cat.backs);
    const screen = h('div.screen#screen-game'); this.root.append(screen); this.screen = screen;
    this.table = new Table(this, screen);
    this.director = new Director(this);
    this.unsub = game.on((ev) => this.director.push(ev));
    this.table.vs = this.table.extract(); this.table.render(true);
    // capas de interfaz
    this.hudEl = h('div#hud', h('div.hud-stats'), h('div.hud-btns',
      h('button.iconbtn', { title: 'Diario (J)', onclick: () => this.openJournal() }, '📖'),
      h('button.iconbtn', { title: 'Ajustes', onclick: () => { sound.click(); this.overlays.showSettings(); } }, '⚙')));
    this.hintEl = h('div#hint'); this.captionEl = h('div#caption'); this.toastEl = h('div#toast'); this.actionsEl = h('div#actions', { style: 'position:absolute;left:0;right:0;bottom:calc(74px + var(--sai-b));z-index:62;display:flex;justify-content:center;gap:16px;pointer-events:none;flex-wrap:wrap;padding:0 10px' });
    this.fxhost = h('div#fxhost'); this.overlayEl = h('div#overlay');
    this.fanEl = h('div#fan'); this.tabEl = h('button#trayTab', { onclick: () => this.toggleTray() });
    this.trayEl = h('div#tray', this.fanEl, this.tabEl);
    this.camctl = h('div#camctl', h('button.iconbtn', { title: 'Ver toda la mesa (F)', onclick: () => { this.table.userMoved = false; this.table.fit(); } }, '⌂'),
      h('button.iconbtn', { title: 'Mazmorra', onclick: () => this.table.focus('dungeon') }, '🚪'), h('button.iconbtn', { title: 'Personaje', onclick: () => this.table.focus('hero') }, '🛡'));
    screen.append(this.hudEl, this.hintEl, this.captionEl, this.toastEl, this.actionsEl, this.trayEl, this.camctl, this.fxhost, this.overlayEl);
    this.overlays = new Overlays(this, this.overlayEl); this.arena = new Arena(this);
    this.table.fit(false); this.table.cam.onResize = () => { if (!this.table.userMoved) this.table.fit(false); this.updateTray(); };
    this.table.viewport.addEventListener('pointerdown', () => { this.table.userMoved = true; });
    this._longPress();
    this.updateHud(); this.updateTray();
    window.__ih = this;
    this.afterIdle();
  }

  /* ================================================================ HUD */
  updateHud() {
    if (!this.game) return; const s = this.table.vs.stats; const g = this.game;
    const st = (img, val, title, cls = '') => h('div.stat' + (cls ? '.' + cls : ''), { title }, h('img', { src: `assets/tokens/tk_${img}.png`, alt: title }), String(val));
    const w = g.weight(), mw = g.maxWeight();
    const box = this.hudEl.querySelector('.hud-stats'); box.innerHTML = '';
    box.append(st('health', `${s.hp}`, `Salud ${s.hp}/${s.maxHp}`, s.hp <= Math.max(3, s.maxHp * 0.25) ? 'low' : ''), st('energy', s.energy, 'Energía'), st('gold', s.gold, 'Oro'), st('ration', s.rations, 'Raciones'),
      st('poison', s.poison, 'Veneno', s.poison >= s.hp - 1 && s.poison > 0 ? 'low' : ''), st('blessing', s.blessing, 'Bendiciones'),
      h('div.stat', { title: `Carga ${w}/${mw}`, style: w > mw ? 'color:#ff8a78' : '' }, '🎒', `${w}`, h('small', `/${mw}`)),
      h('div.stat', { title: 'Moral' }, '⚖', `${s.morality > 0 ? '+' : ''}${s.morality}`), h('div.stat', { title: 'Ojos del jefe', style: s.eyes >= 8 ? 'color:#ff8a78' : '' }, '👁', `${s.eyes}`, h('small', '/10')));
  }
  hint(text) { this.hintEl.textContent = text || ''; this.hintEl.classList.toggle('show', !!text); }
  caption(text) {
    clearTimeout(this._capT); if (!text) { this.captionEl.classList.remove('show'); return; }
    this.captionEl.textContent = text; this.captionEl.classList.add('show'); this._capT = setTimeout(() => this.captionEl.classList.remove('show'), 3200);
  }
  toast(text) { clearTimeout(this._toastT); this.toastEl.textContent = text; this.toastEl.classList.add('show'); this._toastT = setTimeout(() => this.toastEl.classList.remove('show'), 2400); }
  setActions(list) {
    this.actionsEl.innerHTML = '';
    for (const a of list) this.actionsEl.append(h('button.seal' + (a.cls ? '.' + a.cls.split(' ').join('.') : ''), { style: 'pointer-events:auto', onclick: () => { sound.click(); a.fn(); } }, ...(Array.isArray(a.label) ? a.label : [a.label])));
  }
  onLog(ev) { /* el registro vive en game.s.log; el diario lo lee */ }
  fitCamera() { this.table.userMoved = false; this.table.fit(); }

  /* ================================================================ mochila (abanico) */
  toggleTray(force) {
    const open = force ?? !this.fanEl.classList.contains('open');
    if (open) this.updateTray(true); this.fanEl.classList.toggle('open', open); this.screen.classList.toggle('tray-open', open); sound.page();
  }
  updateTray() {
    if (!this.game) return; const g = this.game; const hand = this.table.vs.hand;
    const over = g.isOverweight();
    this.tabEl.innerHTML = ''; this.tabEl.append('MOCHILA', h('span.dot' + (over ? '.warn' : ''), over ? `${g.weight()}/${g.maxWeight()}` : String(hand.length)));
    this.fanEl.innerHTML = '';
    this.fanEl.append(h('div#fanTitle', hand.length ? 'Toca una carta para ver sus opciones' : 'No llevas nada sin equipar'));
    const n = hand.length; const W = innerWidth; const cw = innerWidth < 700 ? 118 : 170; const ch = cw * 675 / 480;
    const gap = Math.min(cw * 0.78, Math.max(36, (W - cw - 40) / Math.max(1, n - 1)));
    hand.forEach((uid, i) => {
      const k = i - (n - 1) / 2; const x = W / 2 - cw / 2 + k * gap; const rot = k * (n > 6 ? 3 : 5); const lift = Math.abs(k) ** 1.7 * 3;
      const el = h('div.fan-card', { style: `width:${cw}px;height:${ch}px;left:${x}px;margin-bottom:${-lift}px;transform:rotate(${rot}deg);z-index:${10 + i}`, onclick: () => this.onHandTap(uid) },
        cardEl({ front: g.img(uid), back: backOf(g.def(uid)), up: true }), h('div.tag', g.def(uid).name));
      this.fanEl.append(el);
    });
  }
  onHandTap(uid) {
    const g = this.game; const d = g.def(uid); const pt = g.s.prompt?.type; const can = ['turn', 'setup'].includes(pt);
    const actions = [];
    if (can) {
      if (d.slot !== 'AC' || true) actions.push({ label: 'EQUIPAR', cls: 'gold', fn: () => this.act('equip', { uid }) });
      if (g.hasSkill('S10') && d.fx?.dagger && g.s.eq.MP && !g.twoHanded()) actions.push({ label: 'OTRA MANO', fn: () => this.act('equipOff', { uid }) });
      if (!d.fx?.cursed) actions.push({ label: 'SOLTAR', cls: 'sm', fn: () => this.act('drop', { uid }) });
    } else if (pt === 'overweight') actions.push({ label: 'SOLTAR', fn: () => this.act('dropOver', { uid }) });
    this.overlays.inspect({ uid, actions });
  }

  /* ================================================================ entrada */
  async act(type, payload = {}) {
    if (this.busy || !this.game) return { ok: false };
    sound.unlock(); this.busy = true; this.actionsEl.innerHTML = '';
    const res = this.game.act(type, payload);
    if (!res.ok) { this.busy = false; this.toast(res.error); sound.error(); this.afterIdle(); return res; }
    await this.director.drain();
    this.busy = false; await this.afterIdle();
    return res;
  }
  onZoneTap(zone) {
    sound.unlock(); const g = this.game; const pt = g.s.prompt?.type;
    if (this.overlays.busyModal) return;
    switch (zone) {
      case 'dungeon': if (pt === 'turn') this.act('draw'); else if (pt === 'setup') this.toast('Pulsa COMENZAR cuando estés listo.'); else this.toast(`Mazo de mazmorra: ${g.s.z.dungeon.length} cartas.`); break;
      case 'door1': this.onDoorTap(0); break;
      case 'door2': this.onDoorTap(1); break;
      case 'trappings': if (['setup', 'turn'].includes(pt)) this.overlays.showShop(); break;
      case 'skills': this.openJournal('skills'); break;
      case 'map': case 'morality': this.openJournal('map'); break;
      case 'graveyard': this.openJournal('grave'); break;
      case 'plotsUsed': this.openJournal('plots'); break;
      case 'enemies': this.toast(`Mazo de enemigos: ${g.s.z.enemies.length} cartas.`); break;
      case 'loot': this.toast(`Mazo de botín: ${g.s.z.loot.length} cartas.`); break;
      case 'potions': this.toast(`Mazo de pociones: ${g.s.z.potions.length} cartas.`); break;
      case 'plots': this.toast(`Mazo de tramas: ${g.s.z.plots.length} cartas.`); break;
      case 'c_hero': this.overlays.inspect({ img: g.cat.pools.heroes.find((x) => x.id === g.s.heroId).img }); break;
      case 'c_skills': this.openJournal('skills'); break;
      case 'c_head': case 'c_body': case 'c_main': case 'c_off': if (this.game.s.z.hand.length && ['turn', 'setup'].includes(pt)) this.toggleTray(true); else this.toast('Casilla vacía'); break;
      case 'c_acc': if (this.game.s.z.hand.length && ['turn', 'setup'].includes(pt)) this.toggleTray(true); break;
      default: break;
    }
  }
  onDoorTap(i) {
    const g = this.game; const pr = g.s.prompt; if (!pr || this.overlays.busyModal) return;
    if (pr.type === 'pair') this.act('reveal', { slot: i });
    else if (pr.type === 'decide') { if (pr.slot !== i) this.onDecline(); }
    else if (pr.type === 'chooseOne') this.act('pickOne', { slot: i });
  }
  onSpotTap() { const pr = this.game.s.prompt; if (pr?.type === 'decide') this.act('resolve'); else if (this.director.spot?.plot) { /* se cierra sola */ } }
  onDecline() { const pr = this.game.s.prompt; if (pr?.forced) { this.toast(pr.forced); sound.error(); return; } this.act('decline'); }
  onCardTap(uid, zone) {
    if (!uid) return; const g = this.game; const d = g.def(uid); const pt = g.s.prompt?.type; const actions = [];
    if (['turn', 'setup'].includes(pt)) { if (!d.fx?.cursed) actions.push({ label: 'QUITAR', cls: 'sm', fn: () => this.act('unequip', { uid }) }); }
    this.overlays.inspect({ uid, actions });
  }
  onAccTap(uid) {
    const g = this.game; const d = g.def(uid); const pt = g.s.prompt?.type; const actions = [];
    if (USE_CODES.has(d.code) && pt === 'turn') actions.push({ label: 'USAR', cls: 'gold', fn: () => this.act('use', { uid }) });
    if (['T3', 'L16'].includes(d.code) && pt === 'pair') actions.push({ label: 'USAR', cls: 'gold', fn: () => this.act('use', { uid }) });
    if (['turn', 'setup'].includes(pt) && !d.fx?.cursed) { actions.push({ label: 'QUITAR', cls: 'sm', fn: () => this.act('unequip', { uid }) }); actions.push({ label: 'SOLTAR', cls: 'sm', fn: () => this.act('drop', { uid }) }); }
    this.overlays.inspect({ uid, actions });
  }
  onSkillTap(id) { const d = this.game.cat.def(id); const acts = d.code === 'S4' ? [{ label: this.game.s.hero.divinidad === 'health' ? 'ENERGÍA→SALUD ✔' : 'ENERGÍA→SALUD', cls: 'gold', fn: () => this.act('toggleDivinidad') }] : []; this.overlays.inspect({ img: d.img, actions: acts }); }
  onWellTap(k) {
    const g = this.game; const h2 = g.s.hero; const s = this.table.vs.stats;
    const m = { health: `Salud: ${s.hp} / ${s.maxHp}`, energy: `Energía: ${s.energy}`, gold: `Oro: ${s.gold} (3 puntos cada moneda)`, ration: `Raciones: ${s.rations} (una por nivel)`, poison: `Veneno: ${s.poison} — si iguala tu salud, mueres`, blessing: `Bendiciones: ${s.blessing} (se revelan antes del jefe)` };
    this.toast(m[k]); void h2;
  }
  openJournal(tab) { if (this.overlays.busyModal && this.game.s.prompt?.type !== 'decide') return; sound.page(); this.overlays.showJournal(tab || 'map'); }

  /* pulsación larga / clic derecho sobre una carta → verla grande */
  _longPress() {
    const vp = this.table.viewport; let timer = null; let start = null;
    const find = (t) => t.closest?.('[data-uid]');
    vp.addEventListener('pointerdown', (e) => { const el = find(e.target); if (!el) return; start = { x: e.clientX, y: e.clientY }; timer = setTimeout(() => { this.overlays.inspect({ uid: +el.dataset.uid }); timer = null; }, 480); });
    vp.addEventListener('pointermove', (e) => { if (timer && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) { clearTimeout(timer); timer = null; } });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => vp.addEventListener(t, () => { clearTimeout(timer); timer = null; }));
    vp.addEventListener('contextmenu', (e) => { const el = find(e.target); if (el) { e.preventDefault(); this.overlays.inspect({ uid: +el.dataset.uid }); } });
  }
  _keys() {
    addEventListener('keydown', (e) => {
      if (!this.game || e.repeat) return; const k = e.key.toLowerCase();
      if (k === 'escape') { this.overlays.closeInspector(); if (this.overlays.user) this.overlays.clearUser(); else this.toggleTray(false); }
      else if (k === 'j') this.openJournal(); else if (k === 'i') this.toggleTray(); else if (k === 'f') this.fitCamera();
      else if (k === 'm') { this.settings.sound = !this.settings.sound; sound.setMuted(!this.settings.sound); this.saveSettings(); this.toast(this.settings.sound ? 'Sonido activado' : 'Sonido silenciado'); }
      else if (k === ' ' || k === 'enter') {
        const pr = this.game.s.prompt; if (this.busy || this.overlays.busyModal) return; e.preventDefault();
        if (pr?.type === 'turn') this.act('draw'); else if (pr?.type === 'decide') this.act('resolve'); else if (pr?.type === 'setup') this.act('begin');
        else if (pr?.type === 'attack') this.arena._tapTray(); else if (pr?.type === 'postRoll') this.act('accept');
      }
    });
  }

  /* ================================================================ prompt → interfaz */
  async afterIdle() {
    if (!this.game) return;
    const g = this.game; const T = this.table; const pr = g.s.prompt;
    // si el motor termina (victoria/derrota)
    if (g.s.over) { this.hint(''); this.setActions([]); await this.director.dismissSpot?.('door3'); T.vs = T.extract(); T.render(true); this.updateHud(); this.updateTray(); this.arena.close(); this.overlays.clearPrompt(); this.overlays.showEnd(g.s.over); return; }
    // cartas del turno resuelto (no combate): la carta en foco se descarta
    const inCombat = ['avoidEnemy', 'pre', 'attack', 'postRoll', 'enemyRoll'].includes(pr?.type);
    if (!inCombat && !['decide', 'choice'].includes(pr?.type) && this.director.spot) {
      const plot = this.director.spot.plot; await this.director.dismissSpot(plot ? 'plotsUsed' : 'door3');
    }
    if (!inCombat && this.arena.open_) await this.arena.end();
    T.vs = T.extract(); T.faceUp = pr?.type === 'chooseOne' ? new Set(pr.uids) : new Set(); T.render(true); this.updateHud(); this.updateTray();
    this.showPrompt();
    this.autoSave();
  }
  showPrompt() {
    const g = this.game; const T = this.table; const pr = g.s.prompt; const O = this.overlays;
    if (!['choice', 'pickCards', 'avoidCard', 'merchant', 'overweight', 'divine'].includes(pr?.type)) O.clearPrompt();
    this.hint(''); this.setActions([]); T.setGlow({});
    if (!pr) return;
    const small = innerWidth < 760 || innerHeight < 520; const portrait = innerHeight > innerWidth;
    const playFocus = () => { if (small && this.settings.autoCam && !T.userMoved) T.focus(portrait ? 'doorsP' : 'doors'); };
    switch (pr.type) {
      case 'setup':
        T.setGlow({ trappings: true });
        this.hint('Prepara tu aventura · toca el Equipo para comprar con tu oro inicial');
        {
          const armed = !!g.mainWeapon(); if (!armed) this.hint('¡No llevas arma! Sin ella solo darás puñetazos de 1 de daño · toca el Equipo para comprar una');
          this.setActions([{ label: ['COMENZAR', h('br'), 'AVENTURA'], cls: armed ? 'pulse' : '', fn: async () => { if (!armed && !(await O.confirm({ title: 'Sin arma', text: 'No llevas ningún arma en la mano principal: solo podrás dar puñetazos de 1 de daño. Puedes comprar una con tu oro inicial en el Equipo.', yes: 'ENTRAR IGUAL', no: 'VOLVER' }))) return; this.act('begin'); } }, { label: ['EQUIPO'], cls: (armed ? 'gold sm' : 'pulse gold sm'), fn: () => O.showShop() }]);
        }
        if (small && this.settings.autoCam && !T.userMoved) T.focus(portrait ? 'hero' : 'play'); break;
      case 'turn': {
        T.setGlow({ dungeon: true });
        this.hint(`Toca la puerta para robar 2 cartas · turno ${pr.turn} de 8`);
        const learn = g.s.z.skills.some((u) => g.canLearn(g.def(u).id)); const acts = [];
        if (learn) acts.push({ label: ['APRENDER', h('br'), 'HABILIDAD'], cls: 'gold sm', fn: () => this.openJournal('skills') });
        if (g.hero.rations > 0 && g.hero.energy < 14) acts.push({ label: ['COMER', h('br'), '+1⚡'], cls: 'sm green', fn: () => this.act('eat') });
        this.setActions(acts); playFocus(); break;
      }
      case 'pair': {
        playFocus(); T.setGlow({ pair: true }); this.hint('Elige una de las dos cartas para revelarla');
        const lamp = g.allItems().filter((u) => ['T3', 'L16'].includes(g.def(u).code) && !(g.def(u).code === 'L16' && g.s.lvl.lamp));
        this.setActions(lamp.map((u) => ({ label: [g.def(u).name.toUpperCase(), h('br'), 'VER AMBAS'], cls: 'gold sm', fn: () => this.act('use', { uid: u }) })));
        break;
      }
      case 'chooseOne': T.setGlow({ pair: true }); this.hint('Elige cuál de las dos cartas resolver'); break;
      case 'decide': {
        const d = g.def(pr.uid); const t2 = d.type === 2;
        this.hint(pr.forced ? pr.forced : t2 ? 'Afronta la parte 1, o descarta y arriesga con la parte 2' : 'Afrontar o descartar y arriesgar con la otra carta');
        const acts = [{ label: ['AFRONTAR', h('br'), t2 ? 'PARTE 1' : ''], cls: 'pulse', fn: () => this.act('resolve') }];
        if (!pr.forced) acts.push({ label: t2 ? ['ARRIESGAR', h('br'), 'PARTE 2'] : ['DESCARTAR', h('br'), 'Y ARRIESGAR'], cls: 'gold', fn: () => this.onDecline() });
        this.setActions(acts); T.setGlow({ pair: !pr.forced }); break;
      }
      case 'choice': this.director.clearSpot(true); O.showChoice(pr); break;
      case 'pickCards': this.director.clearSpot(true); O.showPick(pr); break;
      case 'avoidCard': this.director.clearSpot(true); O.showAvoidCard(pr); break;
      case 'merchant': this.director.clearSpot(true); O.showMerchant(pr); break;
      case 'overweight': this.director.clearSpot(true); O.showOverweight(pr); break;
      case 'divine': O.showDivine(pr); break;
      case 'avoidEnemy': case 'pre': case 'attack': case 'postRoll': case 'enemyRoll': this.arena.setPrompt(pr); break;
      default: break;
    }
  }
  autoSave() {
    try { if (this.game?.canSave()) this.ls.setItem(SAVE_KEY, this.game.snapshot()); } catch (e) { console.warn('No se pudo guardar', e); }
  }
}
