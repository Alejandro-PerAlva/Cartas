/**
 * Arena de combate: sobre la mesa se coloca una bandeja de fieltro. El enemigo se ve en grande, los dados
 * 3D ruedan sobre el fieltro y todo se maneja tocando fichas, dados y cartas (sin formularios).
 */
import { h, sleep, animate, WK, WK_ICON, $ } from './dom.js';
import { cardEl, backOf, cardPath } from './cards.js';
import { DiceTray } from './dice.js';
import { sound } from './audio.js';
import { floatText, vignette, shake, burst } from './fx.js';

export class Arena {
  constructor(app) { this.app = app; this.el = null; this.tray = null; this.energy = 1; this.armed = null; this.furia = false; this.mandoble = false; this.payHp = null; }
  get g() { return this.app.game; }
  get open_() { return !!this.el; }

  /* ================================================================ abrir / cerrar */
  async open(ev) {
    this.close(true);
    const g = this.g; const def = g.def(ev.uid); this.uid = ev.uid; this.def = def;
    this.hp = ev.hp; this.maxHp = ev.maxHp;
    this.ecard = cardEl({ front: g.img(ev.uid), back: backOf(def), up: false });
    this.enemyBox = h('div.ecard', { style: 'position:relative;height:100%;aspect-ratio:480/675;max-height:100%', onclick: () => this.app.overlays.inspect({ uid: ev.uid }) }, h('div.shadow-drop'), this.ecard);
    this.nameEl = h('div.foename', def.name);
    this.plates = h('div.hpbar'); this.hpNum = h('div.hpnum');
    this.wkEl = def.weakness ? h('div.wk', `Debilidad: ${WK_ICON[def.weakness]} ${WK[def.weakness]}`) : null;
    this.powerEl = h('div.epower', def.text || '');
    this.dz = h('div.dicezone'); this.hint = h('div.a-hint'); this.say_ = h('div.logline'); this.choices = h('div.a-choices');
    this.tray = new DiceTray(this.dz, { size: Math.round(Math.min(78, Math.max(54, Math.min(innerWidth, innerHeight) / 9))) });
    this.felt = h('div.felt.a-tray', this.dz, this.hint, this.say_, this.choices);
    this.heroChips = h('div.herochips'); this.energyRow = h('div.energy-row'); this.actions = h('div.actions-row'); this.seals = h('div.a-seals');
    this.heroBox = h('div.a-hero', this.heroChips, this.energyRow, this.actions, this.seals);
    this.el = h('div.arena', { class: innerWidth < innerHeight * 1.05 ? 'port' : 'land' },
      h('div.veil'),
      h('div.a-enemy', this.nameEl, this.enemyBox, this.plates, this.wkEl, this.powerEl),
      this.felt, this.heroBox);
    this.app.overlays.root.append(this.el); this.app.screen.classList.add('arena-open');
    this._resize = () => { this.el?.classList.toggle('port', innerWidth < innerHeight * 1.05); this.el?.classList.toggle('land', !(innerWidth < innerHeight * 1.05)); };
    addEventListener('resize', this._resize);
    this.duel = false; this.setHp(this.hp, this.maxHp, true); this.refreshHero();
    this.felt.addEventListener('click', (e) => { if (e.target.closest('.a-choices,.die-label')) return; this._tapTray(); });
    sound.gong();
    await sleep(250); this.ecard.classList.add('up'); sound.flip(); await sleep(450);
  }
  close(silent = false) {
    removeEventListener('resize', this._resize); this.el?.remove(); this.el = null; this.tray = null; this.app.screen?.classList.remove('arena-open');
  }
  /** cierra con una pequeña pausa para poder ver el final */
  async end() { if (!this.el) return; this.el.style.transition = 'opacity .5s'; this.el.style.opacity = '0'; await sleep(500); this.close(); }

  /* ================================================================ enemigo */
  setHp(hp, maxHp = this.maxHp, instant = false) {
    this.hp = hp; this.maxHp = maxHp;
    const a = Math.min(12, hp), b = Math.max(0, hp - 12);
    this.plates.innerHTML = '';
    this.plates.append(h('div.d12' + (instant ? '' : '.tick'), String(a)), ...(maxHp > 12 ? [h('div.d12' + (instant ? '' : '.tick'), { style: b ? '' : 'opacity:.35' }, String(b))] : []));
    this.plates.append(h('div.hpnum', `${this.duel ? '⚡' : '❤'} ${hp} / ${maxHp}`));
  }
  async hitEnemy(dmg, cause) {
    if (!this.el) return;
    const r = this.enemyBox.getBoundingClientRect(); const at = { x: r.left + r.width / 2, y: r.top + r.height * 0.45 };
    this.enemyBox.classList.remove('hit'); void this.enemyBox.offsetWidth; this.enemyBox.classList.add('hit');
    if (cause === 'ataque' || cause === 'puño' || cause === 'preStrike' || cause === 'sombra') { this._slash(r); sound.sword(); await sleep(160); }
    sound.hit(); floatText(`−${dmg}`, at, 'bad'); burst(at, '255,120,90', 200);
    await sleep(420);
  }
  _slash(r) {
    const s = h('div', { style: `position:fixed;left:${r.left}px;top:${r.top + r.height * 0.2}px;width:${r.width}px;height:${r.height * 0.6}px;pointer-events:none;z-index:340;overflow:hidden` },
      h('div', { style: 'position:absolute;left:-10%;top:48%;width:130%;height:7px;background:linear-gradient(90deg,transparent,#fff 40%,#ffe9a8 60%,transparent);box-shadow:0 0 22px 6px rgba(255,230,170,.9);transform:rotate(-24deg) translateX(-110%);animation:slashmove .32s ease-out forwards' }));
    document.body.append(s); setTimeout(() => s.remove(), 500);
  }
  async enemyLunge() { if (!this.el) return; this.enemyBox.classList.remove('lunge'); void this.enemyBox.offsetWidth; this.enemyBox.classList.add('lunge'); sound.sword(); await sleep(260); }
  /** el enemigo cae: se queda a la vista con su sello hasta que el jugador toque */
  async defeated() {
    if (!this.el) return; sound.victory();
    this.enemyBox.append(h('div.stamp', 'DERROTADO'));
    this.choices.innerHTML = ''; this.seals.innerHTML = ''; this.actions.innerHTML = ''; this.hint.textContent = '';
    await sleep(350);
  }
  /** Asesino Sigiloso: se licúa y se filtra por una grieta */
  async enemyEscape() {
    if (!this.el) return; sound.poison();
    this.enemyBox.append(h('div.stamp.flee', 'ESCAPA')); await sleep(500);
    this.enemyBox.style.transition = 'transform .9s ease-in, opacity .9s'; this.enemyBox.style.transform = 'translateY(40px) scaleY(.25)'; this.enemyBox.style.opacity = '0'; await sleep(900);
  }
  async enemyDie() { if (!this.el) return; this.enemyBox.classList.add('dead'); await sleep(900); }
  setWeakness(w) { if (this.wkEl) this.wkEl.textContent = `Debilidad: ${WK_ICON[w]} ${WK[w]}`; }

  /* ================================================================ héroe */
  refreshHero() {
    if (!this.el) return; const s = this.app.table.vs.stats;
    const chip = (k, v, label) => h('span.stat', { title: label }, h('img', { src: `assets/tokens/tk_${k}.png`, alt: label }), String(v));
    this.heroChips.innerHTML = '';
    this.heroChips.append(chip('health', `${s.hp}`, 'Salud'), chip('energy', s.energy, 'Energía'), chip('poison', s.poison, 'Veneno'), chip('blessing', s.blessing, 'Bendiciones'), chip('gold', s.gold, 'Oro'), chip('ration', s.rations, 'Raciones'));
    this._energyRow();
  }
  _energyRow() {
    const pr = this.g.s.prompt; const s = this.app.table.vs.stats;
    this.energyRow.innerHTML = '';
    if (pr?.type !== 'attack') return;
    const extra = (pr.payHp || []).find((o) => o.id === this.payHp)?.extra || 0; this.payHpExtra = extra;
    const max = this.payHp ? Math.min(3, Math.max(0, s.hp - 1 - extra)) : Math.min(3, s.energy);
    if (this.energy > max) this.energy = max;
    if (!pr.hasWeapon) this.energy = 0;
    for (let i = 1; i <= 3; i++) {
      const on = i <= this.energy; const usable = pr.hasWeapon && i <= max;
      this.energyRow.append(h('div.etoken' + (on ? '.on' : ''), { style: usable ? '' : 'opacity:.25;pointer-events:none', onclick: (e) => { e.stopPropagation(); sound.token(); this.energy = (this.energy === i) ? i - 1 : i; this._energyRow(); this._restDice(); this._sealRefresh(); } }, h('img', { src: `assets/tokens/tk_${this.payHp ? 'health' : 'energy'}.png`, alt: this.payHp ? 'salud' : 'energía' })));
    }
  }
  _restDice() { if (!this.tray || this.g.s.prompt?.type !== 'attack') return; this.tray.place(Array(this.energy + (this.furia ? 1 : 0) + (this.mandoble ? 1 : 0)).fill(6)); }

  /* ================================================================ dados */
  async rollDice(ev) {
    if (!this.tray) return;
    this.hint.textContent = ''; this.choices.innerHTML = '';
    const black = ev.who === 'enemy';
    if (ev.purpose === 'reroll') return; // se anima con diceReroll
    this.say(ev.who === 'enemy' ? `${this.def.name} tira los dados…` : '¡Dados al aire!');
    // el atacante lanza desde su lado (enemigo: arriba, héroe: abajo)
    const from = black ? { x: this.dz.clientWidth * 0.5, y: -90 } : null;
    this.tray.clearLabels(); this.tray.clear();
    await this.tray.throw(ev.values, { black, from });
    this._lastDice = ev;
    if (ev.who === 'enemy') {
      const [a, b] = ev.values;
      if (a === b) this.tray.label('¡DOBLES!', 0).style.left = '50%';
      else this.tray.label(`${Math.max(a, b)} − ${Math.min(a, b)} = ${Math.abs(a - b)}`).style.left = '50%';
    }
    await sleep(ev.who === 'enemy' ? 650 : 350);
  }
  async rerolled(ev) {
    if (!this.tray) return; this.tray.clearLabels();
    if (ev.flip) { await this.tray.flip(ev.idx[0], ev.dice[ev.idx[0]]); await sleep(300); return; }
    await this.tray.reroll(ev.idx, ev.dice); await sleep(300);
  }
  showTotal(total) { if (!this.tray) return; this.tray.clearLabels(); const l = this.tray.label(`= ${total}`); l.style.left = '50%'; l.style.fontSize = '38px'; }
  say(msg) { if (this.say_) this.say_.textContent = msg; }

  /* ================================================================ prompts */
  setPrompt(pr) {
    if (!this.el) return;
    this.choices.innerHTML = ''; this.actions.innerHTML = ''; this.seals.innerHTML = ''; this.hint.textContent = '';
    this.choices.classList.toggle('mid', pr.type === 'avoidEnemy' || pr.type === 'pre' || pr.type === 'enemyRoll');
    this.armed = null; this._energyRow();
    const g = this.g;
    const plaque = (n, label, text, fn, off) => h('button.plaque' + (off ? '.off' : ''), { 'data-n': n, onclick: (e) => { e.stopPropagation(); if (off) return; sound.click(); fn(); } }, h('b', label), text ? h('span', text) : null);
    switch (pr.type) {
      case 'avoidEnemy': {
        this.say(`¿Quieres evitar a ${pr.name}?`);
        pr.options.forEach((o, i) => this.choices.append(plaque(i + 1, o.label, o.disabled ? o.reason : (o.text || (o.free ? 'Sin coste: evitas el combate.' : 'Evitas el combate.')), () => this.app.act('avoidEnemy', { id: o.id }), o.disabled)));
        this.choices.append(plaque('⚔', 'Luchar', 'Te enfrentas a él.', () => this.app.act('avoidEnemy', { id: 'fight' })));
        break;
      }
      case 'pre': {
        this.say('Antes del primer golpe puedes actuar…');
        pr.options.forEach((o, i) => this.choices.append(plaque(i + 1, o.label, o.text, () => this.app.act('preUse', { id: o.id }))));
        this._usables();
        this.seals.append(h('button.btn.primary.big', { onclick: () => { sound.click(); this.app.act('proceed'); } }, '¡A LUCHAR!'));
        break;
      }
      case 'attack': this._attackUi(pr); break;
      case 'postRoll': {
        this.say(`Dados: ${pr.dice.join(' · ')} → ${pr.preview} de daño`);
        pr.options.forEach((o, i) => this.choices.append(plaque(i + 1, o.label, o.needsDie ? 'Elige después el dado.' : '', () => (o.needsDie ? this._pickDie(o, pr) : this.app.act('reroll', { id: o.id })))));
        this.seals.append(h('button.btn.primary.big', { onclick: () => { sound.click(); this.app.act('accept'); } }, 'ACEPTAR', h('br'), `${pr.preview} daño`));
        break;
      }
      case 'enemyRoll': {
        this.say(`Ataque enemigo: ${pr.dmg} de daño.`);
        const opts = pr.options?.length ? pr.options : (pr.uid ? [{ id: 'luck', label: 'Poción de Suerte', text: 'Descártala para que el enemigo relance sus dados.' }] : []);
        opts.forEach((o, i) => this.choices.append(plaque(i + 1, o.label, o.text, () => this.app.act('enemyReact', { id: o.id }))));
        this.choices.append(plaque(opts.length + 1, 'Aceptar el golpe', pr.dmg ? `Recibes ${pr.dmg} de daño.` : '', () => this.app.act('luckKeep')));
        break;
      }
      default: break;
    }
  }
  /** carta pequeña de la fila de acciones: la primera pulsación la prepara, la segunda la usa */
  _mini(uid, label, fn, src) {
    const m = h('div.mini', { onclick: (e) => { e.stopPropagation(); if (this.armed === m) { sound.click(); fn(); } else { this.actions.querySelectorAll('.mini').forEach((x) => x.classList.remove('armed')); this.armed = m; m.classList.add('armed'); sound.tap(); } }, oncontextmenu: (e) => { e.preventDefault(); uid != null && this.app.overlays.inspect({ uid }); } },
      h('div.tip', `${label} · toca otra vez`), cardEl({ front: src, back: backOf(null), up: true }));
    this.actions.append(m); return m;
  }
  /** objetos que se pueden usar ahora mismo (pociones…) */
  _usables() { const g = this.g; for (const u of g.allItems()) if (g.usableNow?.(u)) this._mini(u, `Usar ${g.def(u).name}`, () => this.app.act('use', { uid: u }), g.img(u)); }
  /** «da la vuelta a un dado»: los dados se marcan y el jugador toca uno */
  _pickDie(o, pr) {
    if (!this.tray?.dice.length) return;
    this.choices.innerHTML = ''; this.seals.innerHTML = '';
    this.say(`${o.label.split(':')[0]}: toca el dado al que darle la vuelta`);
    const done = () => { this.tray.dice.forEach((d) => { d.el.classList.remove('pickable'); d.el.onclick = null; }); this.setPrompt(pr); };
    this.tray.dice.forEach((d, i) => { d.el.classList.add('pickable'); d.el.onclick = (e) => { e.stopPropagation(); sound.click(); this.tray.dice.forEach((x) => { x.el.classList.remove('pickable'); x.el.onclick = null; }); this.app.act('reroll', { id: o.id, die: i }); }; });
    this.seals.append(h('button.btn.quiet', { onclick: (e) => { e.stopPropagation(); done(); } }, 'CANCELAR'));
  }
  _attackUi(pr) {
    const g = this.g;
    if (this.energy === 0 && pr.hasWeapon && pr.maxEnergy > 0 && !this._touchedEnergy) this.energy = Math.min(1, pr.maxEnergy);
    if (!pr.hasWeapon) this.energy = 0;
    this._energyRow();
    this.furia = this.furia && pr.furia; this.mandoble = this.mandoble && pr.mandoble;
    if (pr.duel && !this.duel) { this.duel = true; this.setHp(this.hp, this.maxHp, true); }
    if (this.payHp && !(pr.payHp || []).some((o) => o.id === this.payHp)) this.payHp = null;
    this.payHpExtra = (pr.payHp || []).find((o) => o.id === this.payHp)?.extra || 0;
    const restTxt = pr.rest ? (pr.rest.mode === 'energy' ? `Cada ataque que no hagas te devuelve 2 de energía (${pr.rest.skipped} hasta ahora).` : `Cada ataque que no hagas suma +2 al siguiente (${pr.rest.skipped} hasta ahora).`) : '';
    this.say(restTxt || (pr.extraCost ? `Tu siguiente ataque cuesta ${pr.extraCost} de energía más.` : this.payHp ? 'Pagas el ataque con tu salud: elige cuántos dados.' : pr.duel ? 'No se le puede herir: resiste hasta que se quede sin energía.' : 'Elige tu energía y toca el fieltro para tirar.'));
    this.hint.textContent = this.energy > 0 ? 'Toca el tapete para lanzar los dados' : (pr.hasWeapon ? `Sin energía: puñetazo de ${pr.fist || 1}` : `Sin arma: solo puedes dar puñetazos (${pr.fist || 1})`);
    // objetos: lanzables, pociones ofensivas, especiales, consumibles
    const mini = (uid, label, fn, src) => this._mini(uid, label, fn, src);
    for (const u of pr.throwables) mini(u, `Arrojar ${g.def(u).name}`, () => this.app.act('throwItem', { uid: u }), g.img(u));
    for (const u of pr.potions) mini(u, `Lanzar ${g.def(u).name}`, () => this.app.act('potionAttack', { uid: u }), g.img(u));
    for (const o of pr.specials) mini(o.uid, o.label, () => this.app.act('special', { id: o.id }), o.uid != null ? g.img(o.uid) : '');
    for (const u of g.allItems()) { if (g.usableNow?.(u)) mini(u, `Usar ${g.def(u).name}`, () => this.app.act('use', { uid: u }), g.img(u)); }
    // pagar el ataque con salud en vez de energía (Portador del Destino, Kroling)
    for (const o of pr.payHp || []) this.seals.append(h('button.btn.quiet' + (this.payHp === o.id ? '.on' : ''), { title: o.text, onclick: (e) => { e.stopPropagation(); this.payHp = this.payHp === o.id ? null : o.id; this.energy = this.payHp ? Math.max(1, this.energy) : Math.min(this.energy, 3); sound.token(); this.setPrompt(pr); } }, o.label.toUpperCase(), h('br'), this.payHp === o.id ? 'pagas con salud ✔' : 'pagar con salud'));
    // opciones de dado extra
    if (pr.furia) this.seals.append(h('button.btn.quiet' + (this.furia ? '.on' : ''), { onclick: (e) => { e.stopPropagation(); this.furia = !this.furia; sound.token(); this.setPrompt(pr); this._restDice(); } }, 'FURIA', h('br'), '−2❤ +1🎲'));
    if (pr.mandoble) this.seals.append(h('button.btn.quiet' + (this.mandoble ? '.on' : ''), { onclick: (e) => { e.stopPropagation(); this.mandoble = !this.mandoble; sound.token(); this.setPrompt(pr); this._restDice(); } }, 'MANDOBLE', h('br'), '−1🪙 +1🎲'));
    this._sealBtn = h('button.btn.primary.big', { onclick: (e) => { e.stopPropagation(); this._doAttack(); } });
    this.seals.prepend(this._sealBtn); this._sealRefresh();
    this._restDice();
  }
  _sealRefresh() {
    const pr = this.g.s.prompt; if (!this._sealBtn || pr?.type !== 'attack') return;
    this._sealBtn.innerHTML = ''; const n = this.energy + (this.furia ? 1 : 0) + (this.mandoble ? 1 : 0); const fist = pr.fist || 1;
    const cost = this.payHp ? `−${this.energy + this.payHpExtra}❤` : `−${this.energy}⚡`;
    this._sealBtn.append(this.energy === 0 ? 'PUÑETAZO' : '¡ATACAR!', h('br'), h('small', { style: 'font-size:13px;letter-spacing:.05em' }, this.energy === 0 ? `${fist} de daño` : `${n}d6 · ${cost}`));
    this.hint.textContent = this.energy > 0 ? 'Toca el tapete para lanzar los dados' : (pr.hasWeapon ? `Sin energía: puñetazo de ${fist}` : `Sin arma: solo puedes dar puñetazos (${fist})`);
  }
  _tapTray() { if (this.g.s.prompt?.type === 'attack' && !this.app.busy) this._doAttack(); }
  _doAttack() { sound.click(); this._touchedEnergy = true; const pay = this.payHp; this.app.act('attack', { energy: this.energy, furia: this.furia, mandoble: this.mandoble, ...(pay && this.energy > 0 ? { payHp: pay } : {}) }); this.furia = false; this.mandoble = false; this.payHp = null; }
}
