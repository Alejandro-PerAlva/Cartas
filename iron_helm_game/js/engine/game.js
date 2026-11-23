/**
 * IRON HELM · Motor de juego (sin DOM, determinista con semilla).
 *
 * Modelo:
 *  - Todo el estado vive en `g.s` (JSON puro) → guardar/restaurar es trivial.
 *  - El flujo se expresa como una COLA DE TAREAS. Una tarea puede pedir una decisión al jugador con
 *    `g.ask(tipo, datos)`: el motor se detiene hasta que llega la acción correspondiente (`g.act`).
 *  - Todo lo que ocurre se emite como EVENTOS (`g.on(fn)`); la interfaz los anima. El motor nunca espera a la UI.
 *
 * Los demás módulos (combat.js, scenes.js, items.js) extienden el prototipo de Game.
 */
import { RNG } from './rng.js';
import { buildCatalog } from './catalog.js';

export const SLOTS = ['MP', 'OM', 'CA', 'CP'];
export const CAPS = { energy: 14, rations: 10, poison: 10 };
export const WEAKNESS_ORDER = ['fire', 'undead', 'ice']; // Fuego vence a No muerto, No muerto a Hielo, Hielo a Fuego

export class Game {
  constructor(cat, s, rng) {
    this.cat = cat;
    this.s = s;
    this.rng = rng;
    this.q = [];
    this.listeners = [];
    this.recording = [];
  }

  /* ============================================================================ creación */
  static create({ heroId, config = {}, seed = (Date.now() & 0xffffffff) >>> 0, godMode = false }) {
    const cat = buildCatalog(config);
    const rng = new RNG(seed);
    const heroDef = cat.pools.heroes.find((h) => h.id === heroId);
    if (!heroDef) throw new Error(`Héroe desconocido: ${heroId}`);
    const s = {
      v: 2, seed, config: cat.cfg, heroId, godMode, nextUid: 1, cards: {},
      prompt: null, over: null, level: 1, turn: 0, eyes: 0, log: [], stats: { kills: 0, turns: 0 },
      hero: {
        name: heroDef.name, maxHp: heroDef.health, hp: heroDef.health, energy: heroDef.energy, rations: heroDef.rations,
        gold: heroDef.gold, poison: 0, blessings: [], morality: 0, encumbrance: heroDef.encumbrance,
        proficiency: heroDef.proficiency, skills: [], skillCards: {}, afflictions: [], divinidad: 'energy', carryBonus: 0,
      },
      z: { dungeon: [], dungeonDiscard: [], pair: [null, null], enemies: [], enemiesDiscard: [], loot: [], lootDiscard: [],
        potions: [], potionsDiscard: [], plots: [], plotsPlayed: [], trappings: [], skills: [], afflictions: [], afflictionsDiscard: [],
        bosses: [], graveyard: [], hand: [], blessingPile: [], removed: [] },
      eq: { MP: null, OM: null, CA: null, CP: null, AC: [] },
      lvl: {},       // banderas del nivel actual (anillo usado, lámpara, trofeo...)
      game: {},      // banderas de la partida (pozo bebido, etc.)
      ctx: {},       // contexto del turno en curso
      combat: null,
    };
    const g = new Game(cat, s, rng);
    g._build(heroDef);
    return g;
  }

  _build(heroDef) {
    const { s, cat, rng } = this;
    const mkAll = (defs) => {
      const out = [];
      for (const d of defs) {
        const n = d.copies || 1;
        for (let i = 0; i < n; i++) out.push(this.mk(d.id, (d.imgs && d.imgs[i % d.imgs.length]) || d.img));
      }
      return out;
    };
    const p = cat.pools;
    s.z.dungeon = rng.shuffle(mkAll(p.dungeon));
    s.z.enemies = rng.shuffle(mkAll(p.enemies));
    s.z.loot = rng.shuffle([...mkAll(p.loot), ...mkAll(p.mimics)]);
    s.z.potions = rng.shuffle(mkAll(p.potions));
    s.z.plots = rng.shuffle(mkAll(p.plots));
    s.z.trappings = mkAll(p.trappings);
    s.z.skills = mkAll(p.skills);
    s.z.afflictions = rng.shuffle(mkAll(p.afflictions));
    s.z.bosses = mkAll(p.bosses);
    // fichas de bendición: 12, boca abajo y barajadas (caras: salud / energía / veneno)
    const faces = [{ k: 'hp', n: 1 }, { k: 'hp', n: 1 }, { k: 'hp', n: 2 }, { k: 'hp', n: 2 }, { k: 'hp', n: 3 },
      { k: 'en', n: 1 }, { k: 'en', n: 1 }, { k: 'en', n: 2 }, { k: 'en', n: 2 }, { k: 'en', n: 3 },
      { k: 'cure', n: 0 }, { k: 'cure', n: 0 }];
    s.z.blessingPile = rng.shuffle(faces);

    // equipo y habilidades iniciales
    for (const id of heroDef.trappings) {
      const uid = this._takeFromDeck('trappings', id);
      if (uid) this.acquire(uid, { silent: true, noWeightCheck: true });
    }
    for (const id of heroDef.skills) this._learnSkillFree(id);
    this.ask('setup', {});
  }

  /* ============================================================================ eventos y utilidades */
  on(fn) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter((f) => f !== fn); }; }
  emit(t, data = {}) {
    const ev = { t, ...data };
    for (const fn of this.listeners) fn(ev, this);
  }
  log(msg, cat = 'game') {
    this.s.log.push({ msg, cat, lvl: this.s.level, turn: this.s.turn });
    if (this.s.log.length > 400) this.s.log.shift();
    this.emit('log', { msg, cat });
  }

  mk(defId, img = null) {
    const uid = this.s.nextUid++;
    this.s.cards[uid] = { uid, id: defId, img: img || this.cat.def(defId).img };
    return uid;
  }
  card(uid) { return this.s.cards[uid]; }
  def(uid) { return this.cat.def(this.s.cards[uid].id); }
  img(uid) { return this.s.cards[uid].img; }
  _takeFromDeck(deck, defId) {
    const arr = this.s.z[deck];
    const i = arr.findIndex((u) => this.s.cards[u].id === defId);
    return i >= 0 ? arr.splice(i, 1)[0] : null;
  }

  /* ============================================================================ cola y peticiones */
  ask(type, data = {}) {
    this.s.prompt = { type, ...data };
    this.emit('prompt', { prompt: this.s.prompt });
  }
  push(...fns) { this.q.push(...fns); }
  insert(...fns) { this.q.unshift(...fns); }
  run() {
    let guard = 0;
    for (;;) {
      while (!this.s.prompt && this.q.length && !this.s.over) {
        if (++guard > 20000) throw new Error('Bucle infinito en la cola de tareas');
        this.q.shift().call(this);
      }
      if (this.s.prompt || this.s.over) break;
      this._nextTurnOrEnd();                       // cola vacía y sin decisiones: toca cerrar/abrir turno
      if (!this.s.prompt && !this.q.length) break;
    }
  }

  /* ============================================================================ acciones del jugador */
  /** Ejecuta una acción. Devuelve { ok, error? }. */
  act(type, payload = {}) {
    if (this.s.over) return { ok: false, error: 'La partida ha terminado' };
    const pr = this.s.prompt;
    if (!pr) return { ok: false, error: 'No se esperaba ninguna acción' };
    const h = ACTIONS[type];
    if (!h) return { ok: false, error: `Acción desconocida: ${type}` };
    if (!h.in.includes(pr.type)) return { ok: false, error: `La acción "${type}" no es válida durante "${pr.type}"` };
    let res;
    try { res = h.run.call(this, payload, pr) || { ok: true }; }
    catch (e) { if (e.userError) return { ok: false, error: e.message }; throw e; }
    if (res.ok !== false) { this.s.stats.actions = (this.s.stats.actions || 0) + 1; this.run(); }
    return res;
  }
  fail(msg) { const e = new Error(msg); e.userError = true; throw e; }
  /** limpia el prompt actual (las acciones lo llaman al aceptar la decisión) */
  clear() { this.s.prompt = null; }

  /* ============================================================================ estadísticas del héroe */
  get hero() { return this.s.hero; }
  maxHp() { return this.hero.maxHp + this.sumFx('maxHpBonus'); }
  maxWeight() { return this.hero.encumbrance + this.hero.carryBonus + this.sumFx('carryBonus'); }

  /** cambio de una estadística con topes; emite evento 'stat' */
  _setStat(stat, to, cause) {
    const h = this.hero; const from = this._getStat(stat);
    if (to === from) return from;
    if (stat === 'hp') h.hp = to; else if (stat === 'blessing') return from; else h[stat] = to;
    this.emit('stat', { stat, from, to, cause });
    return to;
  }
  _getStat(stat) { return stat === 'blessing' ? this.hero.blessings.length : this.hero[stat === 'hp' ? 'hp' : stat]; }

  gain(stat, n, cause = '') {
    if (n <= 0) return 0;
    const h = this.hero;
    if (stat === 'blessing') return this.gainBlessing(n, cause);
    if (stat === 'energy' && h.divinidad === 'health' && this.hasSkill('S4')) {
      this.log(`Divinidad: conviertes ${n} de energía en salud.`, 'skill');
      return this.gain('hp', n, cause);
    }
    let cap = Infinity;
    if (stat === 'hp') cap = this.maxHp(); else if (CAPS[stat]) cap = CAPS[stat];
    const from = this._getStat(stat);
    const to = Math.min(cap, from + n);
    this._setStat(stat, to, cause);
    return to - from;
  }
  lose(stat, n, cause = '') {
    if (n <= 0) return 0;
    if (stat === 'blessing') return this.loseBlessing(n, cause);
    const from = this._getStat(stat);
    if (stat === 'hp' && this.s.godMode) return 0;
    const to = Math.max(0, from - n);
    this._setStat(stat, to, cause);
    return from - to;
  }
  gainBlessing(n, cause = '') {
    let got = 0;
    for (let i = 0; i < n; i++) {
      if (!this.s.z.blessingPile.length) break;
      const f = this.s.z.blessingPile.shift();
      this.hero.blessings.push(f); got++;
    }
    if (got) this.emit('stat', { stat: 'blessing', from: this.hero.blessings.length - got, to: this.hero.blessings.length, cause });
    return got;
  }
  loseBlessing(n, cause = '') {
    let lost = 0;
    for (let i = 0; i < n && this.hero.blessings.length; i++) { this.s.z.blessingPile.push(this.hero.blessings.pop()); lost++; }
    if (lost) this.emit('stat', { stat: 'blessing', from: this.hero.blessings.length + lost, to: this.hero.blessings.length, cause });
    return lost;
  }
  addMorality(n) {
    const from = this.hero.morality;
    const to = Math.max(-5, Math.min(5, from + n));
    this.hero.morality = to;
    if (to !== from) { this.emit('stat', { stat: 'morality', from, to }); this.log(`Moral ${to >= from ? 'sube' : 'baja'} a ${to > 0 ? '+' : ''}${to}.`, 'moral'); }
  }
  /** posición efectiva en el marcador de moral (con bonificaciones de objetos) */
  morality() { return this.hero.morality + this.sumFx('moralityBonus'); }

  /** Comprueba muerte por salud o veneno. Devuelve true si el héroe ha muerto. */
  checkDeath() {
    const h = this.hero;
    if (this.s.over) return true;
    if (h.hp <= 0) { this.endGame('defeat', 'Tu salud ha llegado a 0.'); return true; }
    if (h.poison > 0 && h.poison >= h.hp) { this.endGame('defeat', 'El veneno ha igualado tu salud: sucumbes.'); return true; }
    return false;
  }
  endGame(result, reason) {
    if (this.s.over) return;
    const score = result === 'victory' ? this.score() : null;
    this.s.over = { result, reason, score };
    this.s.prompt = null; this.q = [];
    this.log(result === 'victory' ? '¡Victoria!' : `Has muerto. ${reason}`, 'end');
    this.emit('gameover', { result, reason, score });
  }

  /* ============================================================================ dados */
  roll(n, purpose = '', who = 'hero', sides = 6) {
    const values = []; for (let i = 0; i < n; i++) values.push(this.rng.die(sides));
    this.emit('dice', { who, values, purpose, sides });
    return values;
  }
  rollOne(purpose = '', who = 'hero') { return this.roll(1, purpose, who)[0]; }

  /* ============================================================================ efectos activos */
  /** Cartas activas con efecto: equipadas, habilidades conocidas y aflicciones. */
  activeSources() {
    const out = [];
    const e = this.s.eq;
    for (const slot of ['MP', 'OM', 'CA', 'CP']) if (e[slot]) out.push({ uid: e[slot], def: this.def(e[slot]), slot });
    for (const u of e.AC) out.push({ uid: u, def: this.def(u), slot: 'AC' });
    for (const id of this.hero.skills) out.push({ uid: null, def: this.cat.def(id), slot: 'skill' });
    for (const u of this.hero.afflictions) out.push({ uid: u, def: this.def(u), slot: 'affliction' });
    return out;
  }
  sumFx(key, filter = () => true) {
    let n = 0;
    for (const src of this.activeSources()) { const v = src.def.fx?.[key]; if (typeof v === 'number' && filter(src)) n += v; }
    return n;
  }
  hasCode(code) { return this.activeSources().some((x) => x.def.code === code); }
  hasSkill(code) { return this.hero.skills.some((id) => this.cat.def(id).code === code); }
  hasAffliction(code) { return this.hero.afflictions.some((u) => this.def(u).code === code); }
  equippedUid(code) { const x = this.activeSources().find((s) => s.def.code === code && s.uid); return x ? x.uid : null; }
  mainWeapon() { const u = this.s.eq.MP; return u ? { uid: u, def: this.def(u) } : null; }
  offHand() { const u = this.s.eq.OM; return u ? { uid: u, def: this.def(u) } : null; }
  twoHanded() { const u = this.s.eq.MP; return !!u && this.def(u).slot === '2M'; }

  /* ============================================================================ inventario */
  allItems() {
    const e = this.s.eq; const out = [...this.s.z.hand];
    for (const slot of ['MP', 'OM', 'CA', 'CP']) if (e[slot]) out.push(e[slot]);
    out.push(...e.AC);
    return out;
  }
  weightOf(uid) {
    const d = this.def(uid);
    let w = d.weight || 0;
    const zero = this.activeSources().find((s) => s.def.fx?.weightZero && (s.def.fx.weightZero === 'potion') && d.deck === 'potion');
    if (zero) w = 0;
    return w;
  }
  weight() {
    let total = 0; const accs = [];
    for (const u of this.allItems()) {
      const w = this.weightOf(u);
      if (this.s.eq.AC.includes(u)) accs.push(w);
      total += w;
    }
    const free = this.sumFx('accessoriesFree');
    if (free > 0) total -= accs.sort((a, b) => b - a).slice(0, free).reduce((a, b) => a + b, 0);
    return total;
  }
  isOverweight() { return this.weight() > this.maxWeight(); }

  /** Añade una carta a la mochila/equipo del héroe. Accesorios se equipan siempre; el resto en hueco libre. */
  acquire(uid, { silent = false, noWeightCheck = false } = {}) {
    const d = this.def(uid);
    this.emit('gainCard', { uid, silent });
    if (d.slot === 'AC') { this.s.eq.AC.push(uid); this.emit('equip', { uid, slot: 'AC', auto: true }); }
    else if (!this.s.combat && this._canAutoEquip(d) && this._slotFree(d)) this._equipInto(uid, d);
    else this.s.z.hand.push(uid);
    if (d.fx?.maxHpBonus) this.emit('stat', { stat: 'maxhp', from: 0, to: this.maxHp() });
    if (!noWeightCheck) this.insert(this._weightCheck);
  }
  _canAutoEquip() { return true; }
  _slotFree(d) {
    const e = this.s.eq;
    if (d.slot === '2M') return !e.MP && (!e.OM || !!this.def(e.OM).fx?.withTwoHanded);
    if (d.slot === 'OM') return !e.OM && (!this.twoHanded() || !!d.fx?.withTwoHanded);
    return !e[d.slot];
  }
  _equipInto(uid, d) {
    const e = this.s.eq;
    if (d.slot === '2M') e.MP = uid; else e[d.slot] = uid;
    this.emit('equip', { uid, slot: d.slot === '2M' ? 'MP' : d.slot });
  }
  _weightCheck() {
    if (this.isOverweight()) this.ask('overweight', { need: this.weight() - this.maxWeight() });
  }
  /** ¿Puede ir este objeto en la mano secundaria? (cualquier OM, o una daga con Doble Arma) */
  _fitsOffHand(d) { return d.slot === 'OM' || (!!d.fx?.dagger && this.hasSkill('S10')); }

  equip(uid) {
    const d = this.def(uid);
    const e = this.s.eq;
    if (this.s.combat) this.fail('No puedes cambiar de equipo durante un combate.');
    const idx = this.s.z.hand.indexOf(uid);
    if (idx < 0) this.fail('Ese objeto no está en tu mano.');
    if (d.slot === 'AC') { this.s.z.hand.splice(idx, 1); e.AC.push(uid); this.emit('equip', { uid, slot: 'AC' }); return; }
    // comprobar antes de mover nada (los objetos malditos no se pueden quitar)
    const blockers = [];
    if (d.slot === '2M') { if (e.MP) blockers.push('MP'); if (e.OM && !this.def(e.OM).fx?.withTwoHanded) blockers.push('OM'); }
    else if (d.slot === 'OM') { if (e.OM) blockers.push('OM'); if (this.twoHanded() && !d.fx?.withTwoHanded) blockers.push('MP'); }
    else if (e[d.slot]) blockers.push(d.slot);
    for (const s of blockers) { const bd = this.def(e[s]); if (bd.fx?.cursed) this.fail(`${bd.name} está maldito: no puedes quitártelo.`); }
    this.s.z.hand.splice(idx, 1);
    for (const s of blockers) this._unequipSlot(s);
    if (d.slot === '2M') e.MP = uid; else e[d.slot] = uid;
    this.emit('equip', { uid, slot: d.slot === '2M' ? 'MP' : d.slot });
  }
  equipOff(uid) { // Doble Arma: daga en la otra mano
    const d = this.def(uid);
    const e = this.s.eq;
    if (this.s.combat) this.fail('No puedes cambiar de equipo durante un combate.');
    if (!this._fitsOffHand(d)) this.fail('Solo puedes llevar una daga en la otra mano con la habilidad Doble Arma.');
    const idx = this.s.z.hand.indexOf(uid);
    if (idx < 0) this.fail('Ese objeto no está en tu mano.');
    if (this.twoHanded()) this._unequipSlot('MP');
    this.s.z.hand.splice(idx, 1);
    this._unequipSlot('OM');
    e.OM = uid;
    this.emit('equip', { uid, slot: 'OM' });
  }
  _unequipSlot(slot) {
    const e = this.s.eq; const u = e[slot];
    if (!u) return;
    const d = this.def(u);
    if (d.fx?.cursed) this.fail(`${d.name} está maldito: no puedes quitártelo.`);
    e[slot] = null;
    this.s.z.hand.push(u);
    this.emit('unequip', { uid: u, slot });
  }
  unequip(uid) {
    if (this.s.combat) this.fail('No puedes cambiar de equipo durante un combate.');
    const e = this.s.eq;
    const ai = e.AC.indexOf(uid);
    if (ai >= 0) { e.AC.splice(ai, 1); this.s.z.hand.push(uid); this.emit('unequip', { uid, slot: 'AC' }); return; }
    for (const slot of ['MP', 'OM', 'CA', 'CP']) if (e[slot] === uid) { this._unequipSlot(slot); return; }
    this.fail('Ese objeto no está equipado.');
  }
  /** retira una carta de cualquier lugar donde la tenga el héroe */
  removeOwned(uid) {
    const e = this.s.eq;
    let i = this.s.z.hand.indexOf(uid);
    if (i >= 0) { this.s.z.hand.splice(i, 1); return true; }
    i = e.AC.indexOf(uid);
    if (i >= 0) { e.AC.splice(i, 1); this._clampHp(); return true; }
    for (const slot of ['MP', 'OM', 'CA', 'CP']) if (e[slot] === uid) { e[slot] = null; this._clampHp(); return true; }
    return false;
  }
  _clampHp() { const m = this.maxHp(); if (this.hero.hp > m) this._setStat('hp', m, 'máximo'); }
  /** descarta un objeto del héroe al mazo de descarte que le corresponda */
  discardOwned(uid, why = 'discard') {
    if (!this.removeOwned(uid)) return false;
    const d = this.def(uid);
    const pile = d.deck === 'potion' ? 'potionsDiscard' : d.deck === 'trapping' ? 'removed' : 'lootDiscard';
    this.s.z[pile].push(uid);
    this.emit('discardCard', { uid, why });
    return true;
  }

  /* ============================================================================ robar de mazos */
  draw(deck) {
    const z = this.s.z;
    const disc = { enemies: 'enemiesDiscard', loot: 'lootDiscard', potions: 'potionsDiscard', plots: 'plotsPlayed', afflictions: 'afflictionsDiscard' }[deck];
    if (!z[deck].length && disc && deck !== 'plots') {
      z[deck] = this.rng.shuffle(z[disc].splice(0));
      this.emit('reshuffle', { deck });
      this.log('Se baraja el descarte para formar un nuevo mazo.', 'game');
    }
    const uid = z[deck].shift();
    if (uid) this.emit('draw', { uid, deck });
    return uid || null;
  }

  /* ============================================================================ habilidades */
  _learnSkillFree(id) {
    if (!this.hero.skills.includes(id)) this.hero.skills.push(id);
    const i = this.s.z.skills.findIndex((u) => this.s.cards[u].id === id);
    const uid = i >= 0 ? this.s.z.skills.splice(i, 1)[0] : null;
    if (uid) this.hero.skillCards[id] = uid;
    this.emit('learnSkill', { id, uid, free: true });
    if (this.cat.def(id).code === 'S2') this._alchemyStart = true;
  }
  skillCost(skillId) { return this.cat.def(skillId).proficiency === this.hero.proficiency ? 3 : 5; }
  unspentEnemies() { return this.s.z.graveyard.filter((e) => !e.spent); }
  canLearn(skillId) {
    return !this.hero.skills.includes(skillId) && this.unspentEnemies().length >= this.skillCost(skillId);
  }
  learnSkill(skillId) {
    if (!this.canLearn(skillId)) this.fail('No tienes suficientes enemigos derrotados para aprender esa habilidad.');
    let n = this.skillCost(skillId);
    for (const e of this.s.z.graveyard) { if (n > 0 && !e.spent) { e.spent = true; n--; } }
    this._learnSkillFree(skillId);
    this.log(`Aprendes la habilidad ${this.cat.def(skillId).name}.`, 'skill');
    if (this.cat.def(skillId).code === 'S2') this._grantAlchemy();
  }
  _grantAlchemy() { this.insert(this._grantAlchemyTask); }
  _grantAlchemyTask() { this._pickFromDeck('potions', 2, 'Alquimia: elige 2 pociones'); }

  /* ============================================================================ puntuación */
  score() {
    const h = this.hero;
    const items = this.allItems().reduce((n, u) => n + (this.def(u).price || 0), 0);
    const parts = {
      hp: h.hp, energy: h.energy, gold: h.gold * 3, enemies: this.s.z.graveyard.length * 2, items,
      level: Math.min(5, this.s.level), morality: this.morality(),
    };
    const total = Object.values(parts).reduce((a, b) => a + b, 0);
    const ranks = [[61, 'Fortaleza'], [51, 'Mansión'], [41, 'Granja'], [31, 'Cabaña'], [0, 'Tugurio']];
    const rank = ranks.find(([min]) => total >= min)[1];
    return { total, parts, rank };
  }

  /* ============================================================================ guardado */
  snapshot() {
    return JSON.stringify({ s: this.s, rng: this.rng.state });
  }
  static restore(json) {
    const { s, rng } = JSON.parse(json);
    const cat = buildCatalog(s.config);
    const g = new Game(cat, s, new RNG(rng));
    return g;
  }
  /** Solo es seguro guardar cuando no hay tareas pendientes y se espera la acción de inicio de turno. */
  canSave() { return !this.q.length && this.s.prompt?.type === 'turn' && !this.s.over; }
}

/* ================================================================================ catálogo de acciones */
export const ACTIONS = {};
const FREE = ['turn', 'setup'];

ACTIONS.begin = {
  in: ['setup'],
  run() {
    this.clear();
    if (this.hasSkill('S2') && !this.s.game.alchemy) { this.s.game.alchemy = true; this.push(this._grantAlchemyTask); }
    this.push(this.startLevel);
  },
};
ACTIONS.buy = {
  in: ['setup'],
  run({ id }) {
    const d = this.cat.def(id);
    const uid = this.s.z.trappings.find((u) => this.s.cards[u].id === id);
    if (!uid) this.fail('Ese objeto ya no está disponible.');
    if (this.hero.gold < d.price) this.fail('No tienes oro suficiente.');
    this._takeFromDeck('trappings', id);
    this.lose('gold', d.price, 'compra');
    this.log(`Compras ${d.name} por ${d.price} de oro.`, 'inv');
    this.acquire(uid);
    this.clear(); this.insert(function back() { this.ask('setup', {}); });
  },
};
ACTIONS.sellTrapping = {
  in: ['setup'],
  run({ uid }) {
    const d = this.def(uid);
    if (d.deck !== 'trapping') this.fail('Solo puedes devolver equipo inicial.');
    if (!this.removeOwned(uid)) this.fail('No tienes ese objeto.');
    this.s.z.trappings.push(uid);
    this.gain('gold', d.price, 'devolución');
    this.emit('returnCard', { uid });
    this.clear(); this.insert(function back() { this.ask('setup', {}); });
  },
};

const freeAct = (fn, extra = []) => ({
  in: [...FREE, ...extra],
  run(p) { fn.call(this, p); const pr = this.s.prompt; this.emit('prompt', { prompt: pr }); return { ok: true }; },
});
ACTIONS.equip = freeAct(function ({ uid }) { this.equip(uid); });
ACTIONS.equipOff = freeAct(function ({ uid }) { this.equipOff(uid); });
ACTIONS.unequip = freeAct(function ({ uid }) { this.unequip(uid); });
ACTIONS.drop = freeAct(function ({ uid }) {
  if (!this.allItems().includes(uid)) this.fail('No tienes ese objeto.');
  const d = this.def(uid);
  if (d.fx?.cursed) this.fail(`${d.name} está maldito: no puedes soltarlo.`);
  this.discardOwned(uid, 'drop'); this.log(`Sueltas ${d.name}.`, 'inv');
});
ACTIONS.use = {
  in: [...FREE, 'attack', 'pre', 'pair', 'avoidCard'],
  run({ uid }) { this.useItem(uid); this.emit('prompt', { prompt: this.s.prompt }); },
};
ACTIONS.eat = freeAct(function () {
  if (this.hero.rations < 1) this.fail('No tienes raciones.');
  this.lose('rations', 1, 'comer'); this.gain('energy', 1, 'comer');
  this.log('Comes una ración entre turnos: +1 de energía.', 'game');
});
ACTIONS.learn = freeAct(function ({ id }) { this.learnSkill(id); });
ACTIONS.toggleDivinidad = freeAct(function () {
  this.hero.divinidad = this.hero.divinidad === 'energy' ? 'health' : 'energy';
  this.log(`Divinidad: la energía ganada se convierte en ${this.hero.divinidad === 'health' ? 'salud' : 'energía (sin conversión)'}.`, 'skill');
});
ACTIONS.dropOver = {
  in: ['overweight'],
  run({ uid }) {
    if (!this.allItems().includes(uid)) this.fail('No tienes ese objeto.');
    const d = this.def(uid);
    if (d.fx?.cursed) this.fail(`${d.name} está maldito: no puedes soltarlo.`);
    this.discardOwned(uid, 'drop'); this.log(`Sueltas ${d.name} para aligerar la carga.`, 'inv');
    this.clear(); this.insert(this._weightCheck);
  },
};
ACTIONS.ack = { in: ['divine', 'info'], run() { this.clear(); } };
