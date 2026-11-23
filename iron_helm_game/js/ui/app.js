/**
 * Aplicación: une el motor, la mesa (dos pestañas), el director de animaciones y las superposiciones.
 */
import { Game } from '../engine/index.js';
import { h, store, speed, clamp, sleep } from './dom.js';
import { Table } from './table.js';
import { Director } from './director.js';
import { Overlays } from './overlays.js';
import { Arena } from './arena.js';
import { Menu } from './menu.js';
import { sound } from './audio.js';
import { setBacks } from './cards.js';
import { Tray } from './tray.js';
import { icon } from './icons.js';

const SAVE_KEY = 'ironhelm.save.v2', PREF_KEY = 'ironhelm.prefs.v2', SET_KEY = 'ironhelm.settings.v2', SCORE_KEY = 'ironhelm.scores.v2';
/** reading: 'tap' = las cartas esperan a que toques · 'timed' = esperan un tiempo proporcional al texto · 'off' = sin pausas */
const DEFAULTS = { sound: true, fast: false, autoCam: true, captions: true, autoReveal: true, autoDraw: false, preShop: true, reading: 'tap' };
const FLOW = new Set(['turn', 'pair', 'decide', 'chooseOne']);
/** acciones de gestión: no mueven la partida, así que no cambian de pestaña */
const MANAGE = new Set(['equip', 'equipOff', 'unequip', 'drop', 'use', 'eat', 'learn', 'toggleDivinidad', 'buy', 'payMorale', 'hire', 'dropOver']);

export class App {
  constructor(root) {
    this.root = root; this.ls = store(); window.ironHelmBack = () => this.back();
    this.settings = { ...DEFAULTS, ...this._json(SET_KEY, {}) };
    sound.setMuted(!this.settings.sound); speed.k = this.settings.fast ? 0.55 : 1; window.__speed = (k) => { speed.k = k; };
    this.game = null; this.table = null; this.busy = false; this.screen = null; this.origins = new Map();
    this._keys();
    this.showMenu();
  }
  _json(k, d) { try { return JSON.parse(this.ls.getItem(k)) ?? d; } catch { return d; } }
  loadPrefs() { return this._json(PREF_KEY, {}); }
  savePrefs(p) { this.ls.setItem(PREF_KEY, JSON.stringify(p)); }
  saveSettings() { this.ls.setItem(SET_KEY, JSON.stringify(this.settings)); }
  hasSave() { return !!this.ls.getItem(SAVE_KEY); }
  recordScore(score, win) { const s = this._json(SCORE_KEY, { best: 0, wins: 0, games: 0 }); s.games++; if (win) { s.wins++; s.best = Math.max(s.best, score); } this.ls.setItem(SCORE_KEY, JSON.stringify(s)); this.ls.removeItem(SAVE_KEY); return s.best; }
  get small() { return innerWidth < 760 || innerHeight < 520; }
  get portrait() { return innerHeight > innerWidth; }

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
  _teardownGame() { this.unsub?.(); this.unsub = null; this.game = null; this.table = null; this.arena?.close(); this.closePop?.(); }

  mountGame(game) {
    this._teardownGame();
    this.game = game; this.root.innerHTML = ''; this._introShown = false; this._hudSig = null;
    setBacks(game.cat.backs);
    const screen = h('div.screen#screen-game'); this.root.append(screen); this.screen = screen;
    this.tray = new Tray(this);
    this.table = new Table(this, screen);
    this.director = new Director(this);
    this.unsub = game.on((ev) => this.director.push(ev));
    this.table.vs = this.table.extract(); this.table.setTab('dungeon', { animate: false }); this.table.render();
    // capas de interfaz
    this.hudEl = h('div#hud', h('div.hud-stats'), h('div.hud-btns',
      h('button.iconbtn', { title: 'Diario (J)', onclick: () => this.openJournal() }, icon('book', 24)),
      h('button.iconbtn', { title: 'Ajustes', onclick: () => { sound.click(); this.overlays.showSettings(); } }, icon('gear', 24))));
    this.hintEl = h('div#hint'); this.captionEl = h('div#caption'); this.toastEl = h('div#toast');
    this.actionsEl = h('div#actions');
    this.fxhost = h('div#fxhost'); this.overlayEl = h('div#overlay');
    this.navEl = h('div#nav',
      h('button.nav-btn', { dataset: { tab: 'dungeon' }, onclick: () => this.goTab('dungeon') }, icon('door', 22), h('span', 'Mazmorra')),
      h('button.nav-btn', { dataset: { tab: 'char' }, onclick: () => this.goTab('char') }, icon('shield', 22), h('span', 'Personaje')),
      h('button.nav-btn.pack', { dataset: { act: 'pack' }, onclick: () => this.toggleTray() }, icon('pack', 22), h('span', 'Mochila'), h('b.dot')));
    this.camctl = h('div#camctl', h('button.iconbtn', { title: 'Encuadrar la mesa (F)', onclick: () => this.fitCamera() }, icon('fit', 22)));
    screen.append(this.hudEl, this.hintEl, this.captionEl, this.toastEl, this.actionsEl, this.tray.el, this.navEl, this.camctl, this.fxhost, this.overlayEl);
    this.overlays = new Overlays(this, this.overlayEl); this.arena = new Arena(this);
    // al rotar o cambiar el tamaño de la ventana la mesa se vuelve a encuadrar siempre (el encuadre depende de la orientación)
    this.table.cam.onResize = () => { this.table.fit(false); this.updateTray(); this.updateNav(); this.director?.relayout(); setTimeout(() => { this.table?.fit(false); this.director?.relayout(); }, 120); };
    this._longPress();
    this.updateHud(); this.updateTray(); this.updateNav();
    window.__ih = this;
    this.afterIdle();
  }

  /**
   * Botón «atrás» (Android) o Escape: cierra lo más superficial que haya abierto.
   * Devuelve `true` si lo ha consumido y `false` si no hay nada que cerrar (el contenedor nativo decide entonces si sale de la app).
   */
  back() {
    if (!this.game) { // menú: ficha de expansión, constructor de héroe o zoom
      const top = this.menu?.menuEl?.querySelector(':scope > .modal:last-of-type'); if (top) { top.remove(); sound.tap(); return true; }
      return false;
    }
    const O = this.overlays; const D = this.director;
    if (D?.holding) { document.getElementById('hold')?.click(); return true; }
    if (O.inspecting) { O.closeInspector(); return true; }
    if (this._pop) { this.closePop(); return true; }
    if (this.tray?.isOpen) { this.toggleTray(false); return true; }
    if (O.user && !['shop', 'intro'].includes(O.userKind)) { O.clearUser(); return true; }
    if (O.userKind === 'shop') { this.toast('Pulsa «Entrar en la mazmorra» para empezar.'); return true; }
    if (O.prompt || this.arena?.open_) { this.toast('Elige una opción para continuar.'); return true; }
    if (this._backAsk) return true; this._backAsk = true;
    O.confirm({ title: '¿Volver al menú?', text: 'La partida se guarda al inicio de cada turno y podrás continuarla desde el menú.', yes: 'AL MENÚ', no: 'SEGUIR' }).then((ok) => { this._backAsk = false; if (ok) this.leaveToMenu(); });
    return true;
  }

  /* ================================================================ HUD, navegación y ventanas emergentes */
  updateHud() {
    if (!this.game) return; const s = this.table.vs.stats;
    const sig = JSON.stringify(s); if (sig === this._hudSig) return; this._hudSig = sig;
    const st = (key, img, val, title, cls = '', small = '') => h('div.stat' + (cls ? '.' + cls : ''), { title, dataset: { stat: key }, onclick: (e) => this.showStatPop(key, e.currentTarget) },
      typeof img === 'string' ? h('img', { src: `assets/tokens/tk_${img}.png`, alt: title }) : img, String(val), small ? h('small', small) : null);
    const box = this.hudEl.querySelector('.hud-stats'); box.innerHTML = '';
    box.append(st('hp', 'health', s.hp, `Salud ${s.hp}/${s.maxHp}`, s.hp <= Math.max(3, s.maxHp * 0.25) ? 'low' : ''), st('energy', 'energy', s.energy, 'Energía'), st('gold', 'gold', s.gold, 'Oro'), st('rations', 'ration', s.rations, 'Raciones'),
      st('poison', 'poison', s.poison, 'Veneno', s.poison >= s.hp - 1 && s.poison > 0 ? 'low' : ''), st('blessing', 'blessing', s.blessing, 'Bendiciones'),
      st('weight', icon('weight', 20), s.weight, this.game.s.hero.carryRule === 'weaponsOnly' ? 'Solo puedes llevar armas' : 'Carga', s.weight > s.maxWeight ? 'low' : '', this.game.s.hero.carryRule === 'weaponsOnly' ? 'armas' : `/${s.maxWeight}`),
      st('morality', icon('scale', 20), `${s.morality > 0 ? '+' : ''}${s.morality}`, 'Moral'), st('eyes', icon('eye', 20), s.eyes, 'Ojos del jefe', s.eyes >= 8 ? 'low' : '', '/10'));
  }
  closePop() { this._pop?.remove(); this._pop = null; if (this._popOff) { window.removeEventListener('pointerdown', this._popOff, true); this._popOff = null; } }
  showStatPop(key, anchor) {
    sound.tap(); this.closePop(); const g = this.game; const s = this.table.vs.stats; const pr = g.s.prompt?.type;
    const info = {
      hp: ['Salud', `Tienes ${s.hp} de ${s.maxHp}. Si llega a 0 mueres. Se recupera con pociones, campamentos y bendiciones.`],
      energy: ['Energía', 'Cada ficha te da un d6 al atacar (hasta 3 por ataque). Se recupera en el campamento y con raciones o pociones.'],
      gold: ['Oro', 'Compra equipo y mercancías. Cada moneda vale 3 puntos al final de la aventura.'],
      rations: ['Raciones', 'Al final de cada nivel comes una (sin ración pierdes 3 de salud). Entre turnos puedes comer una para ganar 1 de energía.'],
      poison: ['Veneno', 'Al final de cada nivel crece (+1 por cada 2 fichas). Si iguala tu salud, mueres. Los antídotos y el altar lo curan.'],
      blessing: ['Bendiciones', 'Fichas boca abajo. Se revelan antes del jefe (salud, energía o curar el veneno) y puedes gastar una en combate para relanzar todos tus dados.'],
      weight: ['Carga', this.game.s.hero.carryRule === 'weaponsOnly' ? 'Este personaje solo puede llevar armas: dos de una mano o una de dos manos. Cualquier otro objeto cuenta como exceso.' : `Llevas ${s.weight} de ${s.maxWeight}. Si te pasas tendrás que soltar objetos.`],
      morality: ['Moral', `Tu posición en el marcador es ${s.morality > 0 ? '+' : ''}${s.morality}. Suma o resta puntos al final de la aventura.`],
      eyes: ['Ojos del jefe', `${s.eyes} de 10. Al llegar a 10 el jefe final despierta.`],
    }[key] || ['', ''];
    const body = h('div.pop-body', h('b', info[0]), h('p', info[1]));
    const acts = [];
    if (key === 'rations' && pr === 'turn' && s.rations > 0 && s.energy < 14) acts.push(h('button.btn.sm', { onclick: () => { this.closePop(); this.act('eat'); } }, 'COMER · +1 energía'));
    if (key === 'weight') acts.push(h('button.btn.sm.quiet', { onclick: () => { this.closePop(); this.toggleTray(true); } }, 'VER MOCHILA'));
    if (acts.length) body.append(h('div.pop-acts', ...acts));
    const pop = h('div#pop', body); this.screen.append(pop); this._pop = pop;
    const r = anchor.getBoundingClientRect(); const w = Math.min(300, innerWidth - 16); pop.style.width = w + 'px';
    pop.style.left = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8) + 'px';
    const below = r.bottom + 10 + 150 < innerHeight; pop.style.top = (below ? r.bottom + 10 : Math.max(8, r.top - pop.offsetHeight - 10)) + 'px';
    pop.classList.toggle('up', !below);
    setTimeout(() => { this._popOff = (e) => { if (!pop.contains(e.target)) this.closePop(); }; window.addEventListener('pointerdown', this._popOff, true); }, 0);
  }
  onWellTap(k, el) { const map = { health: 'hp', energy: 'energy', gold: 'gold', ration: 'rations', poison: 'poison', blessing: 'blessing' }; this.showStatPop(map[k], el); }

  goTab(tab, { auto = false } = {}) {
    if (!this.table || this.table.tab === tab) return;
    sound.page(); this.closePop();
    if (!auto) this.autoTab = false;
    this.table.setTab(tab); this.updateNav(); this.updateTray();
  }
  updateNav() {
    if (!this.navEl) return; const T = this.table;
    this.navEl.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === T.tab));
    const n = T.vs?.invCount || 0; const over = this.game.isOverweight();
    const btn = this.navEl.querySelector('.pack'); btn.classList.toggle('on', this.tray.isOpen);
    const dot = btn.querySelector('.dot'); dot.textContent = over ? '!' : String(n); dot.classList.toggle('warn', over); dot.classList.toggle('hidden', !n && !over);
    this.screen.classList.toggle('tab-char', T.tab === 'char');
  }
  hint(text) { this.hintEl.textContent = text || ''; this.hintEl.classList.toggle('show', !!text); }
  caption(text) {
    clearTimeout(this._capT); if (!text || !this.settings.captions) { this.captionEl.classList.remove('show'); return; }
    this.captionEl.textContent = text; this.captionEl.classList.add('show'); this._capT = setTimeout(() => this.captionEl.classList.remove('show'), 3200);
  }
  toast(text) { if (!this.game || !this.toastEl?.isConnected) { this.menu?.menuToast?.(text); return; } clearTimeout(this._toastT); this.toastEl.textContent = text; this.toastEl.classList.add('show'); this._toastT = setTimeout(() => this.toastEl.classList.remove('show'), 2400); }
  setActions(list) {
    this.actionsEl.innerHTML = '';
    for (const a of list) this.actionsEl.append(h('button.btn' + (a.cls ? '.' + a.cls.split(' ').join('.') : ''), { onclick: () => { sound.click(); a.fn(); } }, ...(Array.isArray(a.label) ? a.label : [a.label])));
  }
  onLog() { /* el registro vive en game.s.log; el diario lo lee */ }
  fitCamera() { this.table.fit(); }

  /* ================================================================ mochila (bandeja) */
  toggleTray(force) { const open = force ?? !this.tray.isOpen; this.closePop(); this.tray.open(open); this.updateNav(); }
  updateTray() { if (!this.game) return; this.tray.update(); this.updateNav(); }
  trayInset() { return this.tray?.inset() || 0; }
  trayDragOk() { return !!this.tray?.dragOk(); }
  /** acciones que se ofrecen sobre un objeto, según dónde esté y qué pida el motor ahora */
  itemActions(uid) {
    const g = this.game; const d = g.def(uid); const pt = g.s.prompt?.type; const acts = []; const e = g.s.eq;
    const manage = ['turn', 'setup'].includes(pt); const inHand = g.s.z.hand.includes(uid);
    const worn = ['MP', 'OM', 'CA', 'CP'].some((k) => e[k] === uid) || e.AC.includes(uid);
    const use = g.usableNow?.(uid);
    if (use) acts.push({ label: 'USAR', cls: 'primary', fn: () => this.act('use', { uid }) });
    if (manage && inHand && d.slot) {
      acts.push({ label: 'EQUIPAR', cls: use ? '' : 'primary', fn: () => this.act('equip', { uid }) });
      if (g.hasSkill('S10') && d.fx?.dagger && e.MP && !g.twoHanded()) acts.push({ label: 'OTRA MANO', fn: () => this.act('equipOff', { uid }) });
    }
    if (manage && worn && !d.fx?.cursed) acts.push({ label: 'GUARDAR', cls: 'quiet', fn: () => this.act('unequip', { uid }) });
    if (pt === 'overweight') acts.push({ label: 'SOLTAR', cls: 'quiet', fn: () => this.act('dropOver', { uid }) });
    else if (manage && !d.fx?.cursed) acts.push({ label: 'SOLTAR', cls: 'quiet', fn: () => this.act('drop', { uid }) });
    return acts;
  }
  onItemTap(uid) { this.overlays.inspect({ uid, actions: this.itemActions(uid) }); }
  onHandTap(uid) { this.onItemTap(uid); }

  /* ================================================================ entrada */
  noteOrigin(uid, el) { if (el?.getBoundingClientRect) { const r = el.getBoundingClientRect(); this.origins.set(uid, { x: r.left, y: r.top, w: r.width, h: r.height }); } }
  takeOrigin(uid) { const o = this.origins.get(uid); this.origins.delete(uid); return o || null; }

  async act(type, payload = {}, { keep = false } = {}) {
    if (this.busy || !this.game) return { ok: false };
    sound.unlock();
    if (['draw', 'reveal', 'resolve', 'decline', 'pickOne'].includes(type) && this.table.tab !== 'dungeon') { this.goTab('dungeon', { auto: true }); await sleep(520); }
    const res = this.game.act(type, payload);
    if (!res.ok) { this.toast(res.error); sound.error(); return res; }
    this.busy = true; this.actionsEl.innerHTML = ''; this.hint('');
    this.closePop(); if (!MANAGE.has(type)) this.toggleTray(false); this.overlays.closeInspector();
    if (!keep) this.overlays.closeForAction();
    this.autoTab = !MANAGE.has(type);
    await this.director.drain();
    this.origins.clear();
    try { await this.afterIdle(); } finally { this.busy = false; }   // ocupado también mientras se espera a que el jugador lea y se monta la siguiente decisión
    return res;
  }
  onZoneTap(zone) {
    sound.unlock(); const g = this.game; const pt = g.s.prompt?.type;
    if (this.overlays.busyModal || this.busy) return;
    switch (zone) {
      case 'dungeon': if (pt === 'turn') this.act('draw'); else this.toast(`Mazo de mazmorra: ${g.s.z.dungeon.length} cartas.`); break;
      case 'door1': this.onDoorTap(0); break;
      case 'door2': this.onDoorTap(1); break;
      case 'trappings': if (pt === 'setup') this.overlays.showShop(); else this.toast('El equipo de la posada solo se compra antes de entrar en la mazmorra.'); break;
      case 'skills': case 'c_skills': this.openJournal('skills'); break;
      case 'map': case 'morality': this.openJournal('map'); break;
      case 'graveyard': if (g.s.z.graveyard.length) this.openJournal('grave'); break;
      case 'plotsUsed': if (g.s.z.plotsPlayed.length) this.openJournal('plots'); break;
      case 'lootUsed': this.overlays.showPile('Botín descartado', 'Las cartas de botín que ya has usado o descartado (la última, arriba).', g.s.z.lootDiscard); break;
      case 'potionsUsed': this.overlays.showPile('Pociones usadas', 'Las pociones que ya has bebido o lanzado (la última, arriba).', g.s.z.potionsDiscard); break;
      case 'door3': this.overlays.showPile('Descarte de la mazmorra', 'Las cartas de mazmorra de este nivel (la última, arriba). Las que descartaste sin mirar siguen boca abajo.', g.s.z.dungeonDiscard, { hidden: (u) => !(g.s.seen || []).includes(u) }); break;
      case 'door4': this.toast(`Mazo de jefes finales: ${g.s.z.bosses?.length ?? 0} cartas. El jefe se decide al terminar la aventura.`); break;
      case 'enemies': this.toast(`Mazo de enemigos: ${g.s.z.enemies.length} cartas.`); break;
      case 'loot': this.toast(`Mazo de botín: ${g.s.z.loot.length} cartas.`); break;
      case 'potions': this.toast(`Mazo de pociones: ${g.s.z.potions.length} cartas.`); break;
      case 'plots': this.toast(`Mazo de tramas: ${g.s.z.plots.length} cartas.`); break;
      case 'x_art': this.toast(`Mazo de artefactos: ${g.s.z.artifacts?.length ?? 0} cartas. Se compran con fichas de bendición en vez de robar botín.`); break;
      case 'x_aff': this.toast(`Mazo de aflicciones: ${g.s.z.afflictions?.length ?? 0} cartas.`); break;
      case 'c_hero': this.overlays.inspect({ img: g.cat.pools.heroes.find((x) => x.id === g.s.heroId).img }); break;
      case 'c_head': case 'c_body': case 'c_main': case 'c_off': case 'c_acc':
        if (['turn', 'setup'].includes(pt)) { this.toggleTray(true); this.toast(this.tray.dragOk() ? 'Arrastra aquí un objeto de la mochila para equiparlo.' : 'Elige un objeto de la mochila para equiparlo.'); } else this.toast('Solo puedes cambiar de equipo entre turnos.');
        break;
      default: break;
    }
  }
  onDoorTap(i) {
    const g = this.game; const pr = g.s.prompt; if (!pr || this.overlays.busyModal || this.busy) return;
    if (pr.type === 'pair') this.act('reveal', { slot: i });
    else if (pr.type === 'decide') { if (pr.slot !== i) this.toast('Pulsa ARRIESGAR si quieres descartar esta carta y resolver la otra.'); }
    else if (pr.type === 'chooseOne') this.act('pickOne', { slot: i });
  }
  onSpotTap() { const pr = this.game.s.prompt; if (pr?.type === 'decide') this.act('resolve'); }
  onDecline() { const pr = this.game.s.prompt; if (pr?.forced) { this.toast(pr.forced); sound.error(); return; } this.act('decline'); }
  onCardTap(uid) { if (uid) this.onItemTap(uid); }
  onAccTap(uid) { this.onItemTap(uid); }
  onMercTap(uid) {
    const g = this.game; const pt = g.s.prompt?.type; const m = (g.s.mercs || []).find((x) => x.uid === uid); const actions = [];
    if (m && ['turn', 'setup'].includes(pt) && m.morale < m.max) actions.push({ label: 'RESTAURAR MORAL (1 ORO)', cls: 'primary', fn: () => this.act('payMorale', { uid }) });
    this.overlays.inspect({ uid, actions });
  }
  onSkillTap(id) {
    const d = this.game.cat.def(id);
    const acts = d.code === 'S4' ? [{ label: this.game.s.hero.divinidad === 'health' ? 'ENERGÍA → SALUD ✔' : 'ENERGÍA → SALUD', cls: 'primary', fn: () => this.act('toggleDivinidad') }] : [];
    this.overlays.inspect({ img: d.img, actions: acts });
  }
  openJournal(tab) { if (this.overlays.busyModal && this.game.s.prompt?.type !== 'decide') return; sound.page(); this.overlays.showJournal(tab || this._jTab || 'map'); }

  /** pulsación larga / clic derecho sobre una carta → verla grande */
  _longPress() {
    const vp = this.table.viewport; let timer = null; let start = null;
    const find = (t) => t.closest?.('[data-uid]');
    vp.addEventListener('pointerdown', (e) => { const el = find(e.target); if (!el) return; start = { x: e.clientX, y: e.clientY }; timer = setTimeout(() => { if (!document.body.classList.contains('dragging')) this.overlays.inspect({ uid: +el.dataset.uid }); timer = null; }, 520); });
    vp.addEventListener('pointermove', (e) => { if (timer && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) { clearTimeout(timer); timer = null; } });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => vp.addEventListener(t, () => { clearTimeout(timer); timer = null; }));
    vp.addEventListener('contextmenu', (e) => { const el = find(e.target); if (el) { e.preventDefault(); this.overlays.inspect({ uid: +el.dataset.uid }); } });
  }
  _keys() {
    addEventListener('keydown', (e) => {
      if (!this.game || e.repeat || this.director?.holding) return; const k = e.key.toLowerCase();
      if (k === 'escape') { this.closePop(); this.overlays.closeInspector(); if (this.overlays.user && this.overlays.userKind !== 'shop') this.overlays.clearUser(); else this.toggleTray(false); }
      else if (k === 'j') this.openJournal(); else if (k === 'i') this.toggleTray(); else if (k === 'f') this.fitCamera();
      else if (k === '1') this.goTab('dungeon'); else if (k === '2') this.goTab('char');
      else if (k === 'm') { this.settings.sound = !this.settings.sound; sound.setMuted(!this.settings.sound); this.saveSettings(); this.toast(this.settings.sound ? 'Sonido activado' : 'Sonido silenciado'); }
      else if (k === ' ' || k === 'enter') {
        const pr = this.game.s.prompt; if (this.busy || this.overlays.busyModal) return; e.preventDefault();
        if (pr?.type === 'turn') this.act('draw'); else if (pr?.type === 'decide') this.act('resolve');
        else if (pr?.type === 'attack') this.arena._tapTray(); else if (pr?.type === 'postRoll') this.act('accept');
      }
    });
  }

  /* ================================================================ petición del motor → interfaz */
  async afterIdle() {
    if (!this.game) return;
    const g = this.game; const T = this.table; const pr = g.s.prompt;
    if (g.s.over) { this.hint(''); this.setActions([]); if (this.director.spot?.fx) await this.director.hold({ lines: this.director.recent }); await this.director.dismissSpot?.('door3'); T.vs = T.extract(); T.render(); this.updateHud(); this.updateTray(); this.arena.close(); this.overlays.clearPrompt(); this.overlays.showEnd(g.s.over); return; }
    const inCombat = ['avoidEnemy', 'pre', 'attack', 'postRoll', 'enemyRoll'].includes(pr?.type);
    if (!inCombat && !['decide', 'choice'].includes(pr?.type) && this.director.spot) {
      const sp = this.director.spot; const plot = sp.plot;
      if (sp.fx && !g.s.over) await this.director.hold({ lines: this.director.recent });   // ha pasado algo: que dé tiempo a leerlo
      await this.director.dismissSpot(this.director.spotZone()); void plot;
    }
    if (!inCombat && this.arena.open_) await this.arena.end();
    T.vs = T.extract(); T.faceUp = pr?.type === 'chooseOne' ? new Set(pr.uids) : new Set(); T.render(); this.updateHud(); this.updateTray();
    if (this.autoTab && FLOW.has(pr?.type) && T.tab !== 'dungeon') this.goTab('dungeon', { auto: true });
    this.showPrompt();
    this.autoSave();
  }
  /** ¿merece la pena abrir la tienda de la posada antes de entrar? */
  needsShop(pr) {
    const g = this.game;
    if (pr.inn) return true;
    if (!g.mainWeapon()) return true;
    return this.settings.preShop && g.s.z.trappings.some((u) => g.def(u).price <= g.hero.gold);
  }
  showPrompt() {
    const g = this.game; const T = this.table; const pr = g.s.prompt; const O = this.overlays;
    if (!['choice', 'pickCards', 'avoidCard', 'merchant', 'overweight', 'divine'].includes(pr?.type)) O.clearPrompt();
    this.hint(''); this.setActions([]); T.setCue({});
    if (!pr) return;
    if (!['turn', 'setup', 'pair', 'decide', 'chooseOne'].includes(pr.type)) this.toggleTray(false);   // los menús de decisión y el combate van por encima de la mochila
    const small = this.small; const portrait = this.portrait;
    const playFocus = () => { if (small && this.settings.autoCam && !T.userMoved && T.tab === 'dungeon') T.cam.frame(portrait ? T.focusRect('doorsP') : T.focusRect('doors'), { pad: 0.01 }); };
    switch (pr.type) {
      case 'setup':
        if (O.userKind === 'shop') { O.refreshShop(); break; }
        if (pr.intro && !this._introShown) { this._introShown = true; O.showIntro(pr.intro, () => this.showPrompt(), this.needsShop(pr) ? 'A LA POSADA' : 'A LA MAZMORRA'); break; }
        if (O.userKind === 'intro') break;
        if (this.needsShop(pr)) O.showShop({ auto: true }); else setTimeout(() => this.game?.s.prompt?.type === 'setup' && this.act('begin'), 250);
        break;
      case 'turn': {
        T.setCue({ dungeon: true });
        this.hint(`Toca la puerta para robar 2 cartas · turno ${pr.turn} de 8`);
        if (this.settings.autoDraw && T.tab === 'dungeon') setTimeout(() => this.game?.s.prompt?.type === 'turn' && !this.busy && !this.overlays.busyModal && this.act('draw'), 650);
        playFocus(); break;
      }
      case 'pair': {
        T.setCue({ pair: true });
        const lamp = g.allItems().filter((u) => g.usableNow?.(u)?.when === 'pair');
        const sexto = !!pr.sixthSense;
        if (this.settings.autoReveal && !lamp.length && !sexto) {
          this.hint('Revelas la primera carta…'); const key = pr.uids.join(); this._autoPair = key;
          setTimeout(() => { if (this._autoPair === key && this.game?.s.prompt?.type === 'pair') this.act('reveal', { slot: 0 }); }, 280);
        } else {
          this.hint('Elige una de las dos cartas para revelarla');
          this.setActions([
            { label: ['REVELAR', h('br'), 'UNA CARTA'], cls: 'primary', fn: () => this.act('reveal', { slot: 0 }) },
            ...lamp.map((u) => ({ label: [g.def(u).name.toUpperCase(), h('br'), 'VER AMBAS'], cls: 'quiet', fn: () => this.act('use', { uid: u }) })),
            ...(sexto ? [{ label: ['SEXTO SENTIDO', h('br'), 'VER AMBAS'], cls: 'quiet', fn: () => this.act('sixthSense') }] : [])]);
        }
        playFocus(); break;
      }
      case 'chooseOne': T.setCue({ pair: true }); this.hint('Elige cuál de las dos cartas resolver'); break;
      case 'decide': {
        const d = g.def(pr.uid); const t2 = d.type === 2;
        this.hint(pr.forced ? pr.forced : t2 ? 'Afronta la parte 1, o descarta y arriesga con la parte 2' : 'Afrontar o descartar y arriesgar con la otra carta');
        const acts = [{ label: t2 ? ['AFRONTAR', h('br'), 'PARTE 1'] : 'AFRONTAR', cls: 'primary', fn: () => this.act('resolve') }];
        if (!pr.forced) acts.push({ label: t2 ? ['ARRIESGAR', h('br'), 'PARTE 2'] : ['DESCARTAR', h('br'), 'Y ARRIESGAR'], fn: () => this.onDecline() });
        if (pr.flee) acts.push({ label: ['CORRER', h('br'), 'EVITARLA'], cls: 'quiet', fn: () => this.act('flee') });
        this.setActions(acts); break;
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
