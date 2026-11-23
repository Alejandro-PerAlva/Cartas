/**
 * IRON HELM · Motor de juego (sin DOM, determinista con semilla).
 *
 * Modelo:
 *  - Todo el estado vive en `g.s` (JSON puro) → guardar/restaurar es trivial.
 *  - El flujo se expresa como una COLA DE TAREAS. Una tarea puede pedir una decisión al jugador con
 *    `g.ask(tipo, datos)`: el motor se detiene hasta que llega la acción correspondiente (`g.act`).
 *  - Todo lo que ocurre se emite como EVENTOS (`g.on(fn)`); la interfaz los anima. El motor nunca espera a la UI.
 *
 * Los demás módulos (combat.js, scenes.js, items.js, expansions.js) extienden el prototipo de Game.
 */
import { RNG } from './rng.js';
import { buildCatalog, normName, planChain } from './catalog.js';

export const SLOTS = ['MP', 'OM', 'CA', 'CP'];
export const CAPS = { energy: 14, rations: 10, poison: 10 };
export const WEAKNESS_ORDER = ['fire', 'undead', 'ice']; // Fuego vence a No muerto, No muerto a Hielo, Hielo a Fuego
export const MAX_MERCS = 3;
/** Pérdidas de salud voluntarias (no son "daño recibido" para Matilda) */
const VOLUNTARY_HP = new Set(['furia', 'ataque', 'pago', 'portador', 'kroling', 'bastón']);

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
    // Desafío «Sin Retorno»: tres aventuras seguidas (niveles 1, 2 y 3); la primera fija la campaña inicial
    const chain = config.variants?.sinRetorno ? planChain(config, seed) : null;
    const cat = buildCatalog(chain ? { ...config, campaign: chain.adventures[0].campaign } : config);
    const rng = new RNG(seed);
    // Sin Retorno: el héroe puede ser de la campaña elegida aunque la primera aventura sea el juego base
    const heroDef = cat.pools.heroes.find((h) => h.id === heroId) || (chain ? buildCatalog(config).pools.heroes.find((h) => h.id === heroId) : null);
    if (!heroDef) throw new Error(heroId === 'custom' ? 'Para un personaje personalizado indica config.custom {race, klass, sign, skill, equipment}' : `Héroe desconocido: ${heroId}`);
    if (cat.variants.metalInmortal && heroDef.key !== 'ANC1') throw new Error('La aventura Metal Inmortal exige jugar con Gene Slash.');
    const carry = typeof heroDef.encumbrance === 'number' ? heroDef.encumbrance : 0; // La Bestia: carga "*" (solo armas)
    const s = {
      v: 3, seed, config: cat.cfg, heroId, godMode, nextUid: 1, cards: {},
      prompt: null, over: null, level: 1, turn: 0, eyes: 0, log: [], stats: { kills: 0, turns: 0 },
      adventureLevel: cat.adventureLevel, env: null, mercs: [], artifactsBought: 0, encounter: null,
      hero: {
        name: heroDef.name, key: heroDef.key, maxHp: heroDef.health, hp: heroDef.health, energy: heroDef.energy, rations: heroDef.rations,
        gold: heroDef.gold, poison: 0, blessings: [], morality: heroDef.morality || 0, encumbrance: carry,
        proficiency: heroDef.proficiency, skills: [], skillCards: {}, afflictions: [], divinidad: 'energy', carryBonus: 0,
        scoreBonus: heroDef.finalScoreBonus || 0, race: heroDef.race || null, custom: heroDef.custom || null,
        initial: { rations: heroDef.rations, gold: heroDef.gold, energy: heroDef.energy },
      },
      z: { dungeon: [], dungeonDiscard: [], pair: [null, null], enemies: [], enemiesDiscard: [], loot: [], lootDiscard: [],
        potions: [], potionsDiscard: [], plots: [], plotsPlayed: [], trappings: [], skills: [], afflictions: [], afflictionsDiscard: [],
        bosses: [], graveyard: [], hand: [], blessingPile: [], removed: [],
        environments: [], environmentsDiscard: [], artifacts: [], artifactsDiscard: [], mercenaries: [], adventure: [] },
      eq: { MP: null, OM: null, CA: null, CP: null, AC: [] },
      lvl: {},       // banderas del nivel actual (anillo usado, lámpara, trofeo...)
      game: {},      // banderas de la partida (pozo bebido, etc.)
      ctx: {},       // contexto del turno en curso
      combat: null,
      variants: { ...cat.variants },   // reglas variantes de ANEMIA 4.0 (id → true|false)
      chain,                           // «Sin Retorno» / Adrenalina: aventuras encadenadas (o null)
    };
    if (typeof heroDef.encumbrance !== 'number') s.hero.carryRule = 'weaponsOnly';
    const g = new Game(cat, s, rng);
    g._build(heroDef);
    return g;
  }

  /** Cartas físicas de un mazo: expande `copies` e imágenes alternativas. `skip` = multiconjunto de ids ya en poder del héroe. */
  _expand(defs, skip = null) {
    const out = [];
    for (const d of defs) {
      const n = d.copies || 1;
      for (let i = 0; i < n; i++) {
        if (skip?.get(d.id) > 0) { skip.set(d.id, skip.get(d.id) - 1); continue; }
        out.push({ id: d.id, img: (d.imgs && d.imgs[i % d.imgs.length]) || d.img, def: d });
      }
    }
    return out;
  }
  /** Construye (o reconstruye, al encadenar aventuras) todos los mazos de la partida a partir del catálogo activo. */
  _buildDecks(skip = null) {
    const { s, cat, rng } = this;
    const mk = (list) => list.map((x) => this.mk(x.id, x.img));
    const mkAll = (defs) => mk(this._expand(defs, skip));
    const p = cat.pools;
    s.z.dungeon = rng.shuffle(mkAll(p.dungeon));
    if (cat.variants.metalInmortal) { // Metal Inmortal: 18 enemigos y 12 tramas al azar (4 de 1 ojo, 6 de 2, 2 de 3)
      s.z.enemies = rng.shuffle(mk(rng.shuffle(this._expand(p.enemies, skip)).slice(0, 18)));
      const plotCards = this._expand(p.plots, skip); const chosen = [];
      for (const [eyes, n] of [[1, 4], [2, 6], [3, 2]]) chosen.push(...rng.shuffle(plotCards.filter((x) => x.def.eyes === eyes)).slice(0, n));
      s.z.plots = rng.shuffle(mk(chosen));
    } else {
      s.z.enemies = rng.shuffle(mkAll(p.enemies));
      s.z.plots = rng.shuffle(mkAll(p.plots));
    }
    s.z.loot = rng.shuffle([...mkAll(p.loot), ...mkAll(p.mimics)]);
    s.z.potions = rng.shuffle(mkAll(p.potions));
    s.z.trappings = mkAll(p.trappings);
    s.z.skills = mkAll(p.skills);
    s.z.afflictions = rng.shuffle(mkAll(p.afflictions));
    s.z.bosses = mkAll(p.bosses);
    if (cat.extras.environments) s.z.environments = rng.shuffle(mkAll(p.environments));
    if (cat.extras.artifacts) s.z.artifacts = rng.shuffle(mkAll(p.artifacts));
    if (cat.extras.mercenaries && !s.chain?.index) s.z.mercenaries = mkAll(p.mercs.map((d) => ({ ...d, copies: 1 })));
    if (cat.extras.encounters) {
      // Iron Chest: mapa de encuentros del nivel de la aventura (hay dos copias idénticas; se elige una al azar)
      const maps = p.adventures.filter((a) => a.level === s.adventureLevel);
      const def = maps.length ? maps[0] : null;
      if (def) {
        const imgs = def.imgs || [def.img];
        const uid = this.mk(def.id, imgs[rng.int(imgs.length)]);
        s.z.adventure = [uid];
        s.encounter = { map: uid };
      }
    }
  }

  _build(heroDef) {
    const { s, rng } = this;
    this._buildDecks();
    // fichas de bendición: 12, boca abajo y barajadas (caras: salud / energía / veneno)
    const faces = [{ k: 'hp', n: 1 }, { k: 'hp', n: 1 }, { k: 'hp', n: 2 }, { k: 'hp', n: 2 }, { k: 'hp', n: 3 },
      { k: 'en', n: 1 }, { k: 'en', n: 1 }, { k: 'en', n: 2 }, { k: 'en', n: 2 }, { k: 'en', n: 3 },
      { k: 'cure', n: 0 }, { k: 'cure', n: 0 }];
    s.z.blessingPile = rng.shuffle(faces);

    // equipo y habilidades iniciales (si la carta no está en ningún mazo activo se inyecta como objeto propio)
    for (const id of heroDef.trappings) {
      const uid = this._takeFromDeck('trappings', id) || this.mk(id);
      this.acquire(uid, { silent: true, noWeightCheck: true });
    }
    for (const id of heroDef.skills) this._learnSkillFree(id);
    if (heroDef.potion) { // Gnomo: poción elegida en la creación
      const uid = this._takeFromDeck('potions', heroDef.potion) || this.mk(heroDef.potion);
      this.acquire(uid, { silent: true, noWeightCheck: true });
    }
    this._variantsSetup?.(heroDef); // ANEMIA 4.0: pueblo de origen, motivación, rumbo, Diablillo…
    this._askSetup();
  }

  /** Petición de preparación (tienda de equipo y, con La Posada del Troll Solitario, contratación de esbirros). */
  _askSetup() {
    // candidates = todos los esbirros de la posada (los contratados también; se distinguen por `hired`)
    const inn = this.cat.extras.mercenaries && !this.s.chain?.index
      ? { candidates: [...this.s.z.mercenaries, ...this.s.mercs.map((m) => m.uid)].sort((a, b) => a - b), hired: this.s.mercs.map((m) => m.uid), max: MAX_MERCS } : null;
    const o = this.s.origin; const m = this.s.motivation; const d = this.s.direction;
    this.ask('setup', { shop: !this.s.chain?.index, inn, ...(o || m || d ? { intro: { origin: o || null, motivation: m || null, direction: d || null } } : {}) });
  }

  /* ============================================================================ eventos y utilidades */
  on(fn) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter((f) => f !== fn); }; }
  emit(t, data = {}) {
    if (t === 'reveal' && data.uid != null) { const seen = (this.s.seen ||= []); if (!seen.includes(data.uid)) seen.push(data.uid); }   // cartas que el jugador ha visto (el descarte oculta las demás)
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
  maxWeight() { return this.hero.carryRule === 'weaponsOnly' ? 0 : this.hero.encumbrance + this.hero.carryBonus + this.sumFx('carryBonus'); }
  /** ¿El héroe es de esta raza? (Gnome Pack) */
  isRace(name) { return !!this.hero.race && normName(this.hero.race) === normName(name); }

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
    if (stat === 'poison' && this.poisonImmune()) { this.log('Sangre Envenenada: eres inmune al veneno.', 'skill'); return 0; }
    if (stat === 'energy' && h.divinidad === 'health' && this.hasSkill('S4')) {
      this.log(`Divinidad: conviertes ${n} de energía en salud.`, 'skill');
      return this.gain('hp', n, cause);
    }
    let cap = Infinity;
    if (stat === 'hp') cap = this.maxHp(); else if (stat === 'energy') cap = this.maxEnergy(); else if (CAPS[stat]) cap = CAPS[stat];
    const from = this._getStat(stat);
    const to = Math.max(from, Math.min(cap, from + n)); // nunca baja si ya estás por encima del tope (Sangre de Lobo, Necronomicón)
    this._setStat(stat, to, cause);
    const got = to - from;
    // Mediano: cada ración ganada da también 1 de salud
    if (stat === 'rations' && got > 0 && this.isRace('Mediano')) { this.gain('hp', got, 'mediano'); this.log(`Mediano: +${got} de salud por las raciones.`, 'skill'); }
    return got;
  }
  lose(stat, n, cause = '') {
    if (n <= 0) return 0;
    if (stat === 'blessing') return this.loseBlessing(n, cause);
    const from = this._getStat(stat);
    if (stat === 'hp' && this.s.godMode) return 0;
    const to = Math.max(0, from - n);
    this._setStat(stat, to, cause);
    if (stat === 'hp' && n >= 3 && !VOLUNTARY_HP.has(cause)) this._mercHurt?.(n);
    if (stat === 'gold' && from > to) this._mercSpendGold?.(cause);
    return from - to;
  }
  /** ¿Eres inmune al veneno? (Sangre Envenenada) */
  poisonImmune() { return this.activeSources().some((x) => x.def.fx?.poisonImmune); }
  /** tope de energía: 14 fichas (+1 por cada «Gastar puntos de experiencia») */
  maxEnergy() { return CAPS.energy + (this.hero.energyBonus || 0); }
  gainBlessing(n, cause = '') {
    if (this.hasSkill('S21') || this.activeSources().some((x) => x.def.fx?.noBlessings)) { this.log('Drenaje Vital / Artes Oscuras: no puedes ganar fichas de bendición.', 'skill'); return 0; }
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
  /** ganar ojos (tramas, enemigos, entornos); Farzad pierde 1 de moral por cada uno */
  addEyes(n, uid = null) {
    if (n <= 0) return;
    this.s.eyes += n;
    this.emit('eyes', { uid, eyes: this.s.eyes });
    this.log(`+${n} ojo(s) · ${this.s.eyes}/10`, 'plot');
    this._mercEyes?.(n);
  }

  /** Comprueba muerte por salud o veneno. Devuelve true si el héroe ha muerto. */
  checkDeath() {
    const h = this.hero;
    if (this.s.over) return true;
    if (this.s.parca?.stage === 'offer') return true; // ya estás ante La Parca
    if (h.hp <= 0) { this._die('Tu salud ha llegado a 0.'); return true; }
    if (h.poison > 0 && h.poison >= h.hp) { this._die('El veneno ha igualado tu salud: sucumbes.'); return true; }
    return false;
  }
  /** El héroe muere: con «Enfrentarse a La Parca» se le ofrece combatir; si no, la partida termina. */
  _die(reason) {
    if (this.s.over) return;
    if (this._parcaOffer?.(reason)) return;
    this.endGame('defeat', reason);
  }
  endGame(result, reason, extra = {}) {
    if (this.s.over) return;
    const score = result === 'victory' ? this.score() : null;
    const epilogue = result === 'defeat' ? this._epilogue?.() || null : null; // «Muertes Atroces»
    this.s.over = { result, reason, score, ...(epilogue ? { epilogue } : {}), ...extra };
    this.s.prompt = null; this.q = [];
    this.log(result === 'victory' ? '¡Victoria!' : `Has muerto. ${reason}`, 'end');
    this.emit('gameover', { result, reason, score, ...(epilogue ? { epilogue } : {}), ...extra });
  }

  /* ============================================================================ dados */
  roll(n, purpose = '', who = 'hero', sides = 6) {
    const values = []; for (let i = 0; i < n; i++) values.push(this.rng.die(sides));
    this.emit('dice', { who, values, purpose, sides });
    return values;
  }
  rollOne(purpose = '', who = 'hero') { return this.roll(1, purpose, who)[0]; }

  /* ============================================================================ efectos activos */
  /** Cartas activas con efecto: equipadas, habilidades conocidas, aflicciones y esbirros contratados. */
  activeSources() {
    const out = [];
    const e = this.s.eq;
    for (const slot of ['MP', 'OM', 'CA', 'CP']) if (e[slot]) out.push({ uid: e[slot], def: this.def(e[slot]), slot });
    for (const u of e.AC) out.push({ uid: u, def: this.def(u), slot: 'AC' });
    for (const id of this.hero.skills) if (id !== this.s.lvl.forgotten) out.push({ uid: null, def: this.cat.def(id), slot: 'skill' }); // Amnesia: una habilidad olvidada por nivel
    for (const u of this.hero.afflictions) out.push({ uid: u, def: this.def(u), slot: 'affliction' });
    for (const m of this.s.mercs || []) out.push({ uid: m.uid, def: this.def(m.uid), slot: 'merc' });
    return out;
  }
  sumFx(key, filter = () => true) {
    let n = 0;
    for (const src of this.activeSources()) { const v = src.def.fx?.[key]; if (typeof v === 'number' && filter(src)) n += v; }
    return n;
  }
  hasCode(code) { return this.activeSources().some((x) => x.def.key === code); }
  hasSkill(code) { return this.hero.skills.some((id) => this.cat.def(id).key === code && id !== this.s.lvl.forgotten); }
  hasAffliction(code) { return this.hero.afflictions.some((u) => this.def(u).key === code); }
  hasMerc(code) { return (this.s.mercs || []).some((m) => this.def(m.uid).key === code); }
  equippedUid(code) { const x = this.activeSources().find((s) => s.def.key === code && s.uid && s.slot !== 'merc'); return x ? x.uid : null; }
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
  /** La Bestia (carga "*"): solo puede llevar dos armas de una mano o una de dos manos. Devuelve cuántos objetos sobran. */
  _beastExcess() {
    const items = this.allItems().filter((u) => this.weightOf(u) > 0 && !this.def(u).fx?.cursed); // lo maldito no se puede soltar
    const weapons = items.filter((u) => ['MP', 'OM', '2M'].includes(this.def(u).slot));
    const two = weapons.filter((u) => this.def(u).slot === '2M').length; const one = weapons.length - two;
    const others = items.length - weapons.length;
    const keepTwo = two > 0 ? weapons.length - 1 : Infinity; // me quedo con una sola arma a dos manos
    const keepOne = two + Math.max(0, one - 2);             // me quedo con dos armas de una mano
    return others + (two === 0 && one <= 2 ? 0 : Math.min(keepTwo, keepOne));
  }
  weight() {
    if (this.hero.carryRule === 'weaponsOnly') return this._beastExcess();
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
    if (d.fx?.instant) { // cartas que se resuelven al robarlas (Alijo de Mizlak, Boñiga de Dragón)
      this.s.z[this.pileFor(d)].push(uid);
      this.insert(function instant() { this._instantItem(uid); });
      return;
    }
    if (d.slot === 'AC') { this.s.eq.AC.push(uid); this.emit('equip', { uid, slot: 'AC', auto: true }); }
    else if (d.slot && !this.s.combat && this._canAutoEquip(d) && this._slotFree(d)) this._equipInto(uid, d);
    else this.s.z.hand.push(uid);
    if (d.fx?.maxHpBonus) this.emit('stat', { stat: 'maxhp', from: 0, to: this.maxHp() });
    if (!noWeightCheck) this.insert(this._weightCheck);
  }
  _canAutoEquip() { return true; }
  _slotFree(d) {
    const e = this.s.eq;
    if (this.hero.armLost && (d.slot === 'OM' || d.slot === '2M')) return false; // Justo Antes de Morir
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
  _fitsOffHand(d) { return !this.hero.armLost && (d.slot === 'OM' || (!!d.fx?.dagger && this.hasSkill('S10'))); }

  equip(uid) {
    const d = this.def(uid);
    const e = this.s.eq;
    if (this.s.combat) this.fail('No puedes cambiar de equipo durante un combate.');
    const idx = this.s.z.hand.indexOf(uid);
    if (idx < 0) this.fail('Ese objeto no está en tu mano.');
    if (!d.slot) this.fail(`${d.name} no se puede equipar.`);
    if (this.hero.armLost && (d.slot === 'OM' || d.slot === '2M')) this.fail('Has perdido el uso de tu otra mano: no puedes equipar eso.');
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
    if (ai >= 0) {
      if (this.def(uid).fx?.cursed) this.fail(`${this.def(uid).name} está maldito: no puedes quitártelo.`);
      e.AC.splice(ai, 1); this.s.z.hand.push(uid); this.emit('unequip', { uid, slot: 'AC' }); return;
    }
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
  /** pila de descarte que corresponde a una carta de objeto */
  pileFor(d) { return d.deck === 'potion' ? 'potionsDiscard' : d.deck === 'trapping' ? 'removed' : d.deck === 'artifact' ? 'artifactsDiscard' : 'lootDiscard'; }
  /** descarta un objeto del héroe al mazo de descarte que le corresponda */
  discardOwned(uid, why = 'discard') {
    if (!this.removeOwned(uid)) return false;
    const d = this.def(uid);
    this.s.z[this.pileFor(d)].push(uid);
    this.emit('discardCard', { uid, why });
    if (why === 'use') this._incantation?.(d); // «Encantamientos»
    return true;
  }
  /** destruye un objeto del héroe (sale de la partida) */
  destroyOwned(uid, why = 'destroyed') {
    if (!this.removeOwned(uid)) return false;
    this.s.z.removed.push(uid);
    this.emit('discardCard', { uid, why });
    return true;
  }

  /* ============================================================================ robar de mazos */
  draw(deck) {
    const z = this.s.z;
    const disc = { enemies: 'enemiesDiscard', loot: 'lootDiscard', potions: 'potionsDiscard', plots: 'plotsPlayed', afflictions: 'afflictionsDiscard',
      environments: 'environmentsDiscard', artifacts: 'artifactsDiscard' }[deck];
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
    let uid = i >= 0 ? this.s.z.skills.splice(i, 1)[0] : null;
    if (!uid && !this.hero.skillCards[id]) uid = this.mk(id); // habilidad de una expansión inactiva (inyectada)
    if (uid) this.hero.skillCards[id] = uid;
    this.emit('learnSkill', { id, uid, free: true });
    if (this.cat.def(id).key === 'S2') this._alchemyStart = true;
    const lfx = this.cat.def(id).fx || {};
    if (lfx.hpOnLearn) this._setStat('hp', this.hero.hp + lfx.hpOnLearn, 'habilidad');       // Sangre Envenenada: +7 de salud
    if (lfx.moralityOnLearn) this.addMorality(lfx.moralityOnLearn);                           // Artes Oscuras
    if (lfx.potionOnLearn) this.gainPotion(lfx.potionOnLearn);
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
    if (this.cat.def(skillId).key === 'S2') this._grantAlchemy();
  }
  _grantAlchemy() { this.insert(this._grantAlchemyTask); }
  _grantAlchemyTask() { this._pickFromDeck('potions', 2, 'Alquimia: elige 2 pociones'); }

  /* ============================================================================ puntuación */
  score() {
    const h = this.hero;
    const items = this.allItems().reduce((n, u) => n + (this.def(u).price || 0), 0);
    const parts = {
      hp: h.hp, energy: h.energy, gold: (h.gold + (this.s.variants?.sinRetorno ? 25 : 0)) * 3, // Sin Retorno: +25 monedas para el recuento
      enemies: this.s.z.graveyard.length * 2, items, level: Math.min(5, this.s.level) * 2, morality: this.morality(),
    };
    if (h.scoreBonus) parts.bonus = h.scoreBonus; // Mizlak el Mendigo: +10 si completas la partida
    const total = Object.values(parts).reduce((a, b) => a + b, 0);
    const ranks = [[61, 'Fortaleza'], [51, 'Mansión'], [41, 'Granja'], [31, 'Cabaña'], [0, 'Tugurio']];
    let rank = ranks.find(([min]) => total >= min)[1];
    if (this.s.game.mansion && ['Tugurio', 'Cabaña', 'Granja'].includes(rank)) rank = 'Mansión'; // Hogar Soñado: ya vives en tu mansión
    const retreat = this._retreatText?.(rank) || null;                                       // «Lugares de Retiro»
    return { total, parts, rank, ...(retreat ? { retreat } : {}) };
  }

  /* ============================================================================ guardado */
  snapshot() {
    return JSON.stringify({ s: this.s, rng: this.rng.state });
  }
  static restore(json) {
    const { s, rng } = JSON.parse(json);
    s.variants ||= {}; s.chain ||= null;
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
    // Gnomo: empieza con 1 poción a su elección (si no la eligió al crearlo)
    if (this.isRace('Gnomo') && !this.cat.pools.heroes.find((h) => h.id === this.s.heroId)?.potion && !this.s.game.gnomePotion) {
      this.s.game.gnomePotion = true;
      this.push(function gnomePotion() { this._pickFromDeck('potions', 1, 'Gnomo: elige 1 poción para empezar'); });
    }
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
    this.clear(); this.insert(function back() { this._askSetup(); });
  },
};
ACTIONS.sellTrapping = {
  in: ['setup'],
  run({ uid }) {
    const d = this.def(uid);
    if (d.deck !== 'trapping') this.fail('Solo puedes devolver equipo inicial.');
    if (d.fx?.cursed) this.fail(`${d.name} está maldito.`);
    if (!this.removeOwned(uid)) this.fail('No tienes ese objeto.');
    this.s.z.trappings.push(uid);
    this.gain('gold', d.price, 'devolución');
    this.emit('returnCard', { uid });
    this.clear(); this.insert(function back() { this._askSetup(); });
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
  in: [...FREE, 'attack', 'pre', 'pair', 'avoidCard', 'overweight'],
  run({ uid }) {
    const wasOver = this.s.prompt?.type === 'overweight';
    this.useItem(uid);
    if (wasOver && this.s.prompt?.type === 'overweight') { // beber una poción en vez de soltarla
      if (this.isOverweight()) this.s.prompt.need = this.weight() - this.maxWeight(); else this.clear();
    }
    if (!(wasOver && !this.s.prompt)) this.emit('prompt', { prompt: this.s.prompt });
  },
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
