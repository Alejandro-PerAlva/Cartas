/**
 * IRON HELM · Flujo de partida: niveles, turnos de exploración, cartas de mazmorra, tramas,
 * mercader, fin de nivel, visita divina y jefe final.
 *
 * Las cartas de mazmorra se resuelven por su TIPO (`kind`) con PARÁMETROS por carta (`def.params`, de
 * DUNGEON_FX en pack-fx.js). Las del juego base usan los valores por defecto de su tipo; The Howling Abyss
 * redefine los suyos y añade tipos nuevos (arcángel, ídolo falso, fuente mística, encuentro salvaje).
 */
import { Game, ACTIONS, WEAKNESS_ORDER } from './game.js';
import { DUNGEON_FX } from '../data/pack-fx.js';

const TURNS_PER_LEVEL = 8;
const BOSS_EYES = 10;
/** Carta del juego base cuyos parámetros son los de cada tipo por defecto */
const DEFAULT_OF_KIND = { ambush: 'D1', treasure: 'D2', labyrinth: 'D3', mushrooms: 'D4', arrowTrap: 'D5', skirmish: 'D6', camp: 'D7', merchant: 'D8', altar: 'D9', clearing: 'D10' };
const inRow = (row, v) => (Array.isArray(row) ? row.includes(v) : row === v);

Object.assign(Game.prototype, {
  /* ============================================================================ parámetros de cartas de mazmorra */
  /** Parámetros de una carta de mazmorra (para una parte concreta si es de tipo 2). */
  cardParams(d, side = null) {
    const P = d.params || DUNGEON_FX[DEFAULT_OF_KIND[d.kind]] || {};
    if (side && P[side]) return P[side];
    return P;
  },

  /* ============================================================================ niveles */
  startLevel() {
    const s = this.s; const z = s.z;
    s.turn = 0; s.lvl = {}; s.ctx = {};
    z.dungeon = this.rng.shuffle([...z.dungeon, ...z.dungeonDiscard.splice(0), ...z.pair.filter(Boolean)]);
    z.pair = [null, null];
    if (s.game.skipNext) {
      const cards = z.dungeon.splice(0, s.game.skipNext); z.dungeonDiscard.push(...cards);
      this.log(`El espejo te hace perder ${cards.length} cartas de mazmorra del nuevo nivel.`, 'plot'); s.game.skipNext = 0;
    }
    this.emit('levelStart', { level: s.level });
    this.log(`— Comienza el nivel ${s.level} de la mazmorra —`, 'level');
    this._amnesiaPick?.(); // Amnesia: olvidas otra habilidad en cada nivel
    // Terreno y Reliquias: carta de entorno del nivel
    if (this.cat.extras.environments) this._drawEnvironment();
    // Cetrería (Blackened): al principio de cada nivel, tirada de pájaro
    if (this.hasSkill('S14')) {
      const d = this.rollOne('cetreria');
      if (d >= 5) { this.gain('rations', 1, 'cetrería'); this.log('Tu pájaro encuentra una ración.', 'skill'); }
      else if (d >= 3) { this.gain('gold', 1, 'cetrería'); this.log('Tu pájaro encuentra una moneda de oro.', 'skill'); }
      else this.log('Tu pájaro no encuentra nada.', 'skill');
    }
  },

  /** Lo llama el bucle cuando no queda nada por hacer: cierra el turno o pide el siguiente. */
  _nextTurnOrEnd() {
    const s = this.s; const z = s.z;
    if (s.ctx.turnActive) {
      s.ctx.turnActive = false;
      for (const u of z.pair) if (u) z.dungeonDiscard.push(u);
      z.pair = [null, null];
      s.stats.turns++;
      this.emit('turnEnd', { turn: s.turn });
      if (s.turn >= TURNS_PER_LEVEL || z.dungeon.length < 2 || s.ctx.endLevelNow) { this.push(this.endLevel); return; }
    }
    s.ctx = {};
    this.ask('turn', { turn: s.turn + 1, left: z.dungeon.length });
  },

  endLevel() {
    const s = this.s; const h = this.hero;
    const wasLast = s.level >= 5;
    const from = s.level;
    this.emit('levelEnd', { level: s.level });
    this.log(`=== Fin del nivel ${s.level} ===`, 'level');
    this.insert(
      // 1. Alimentar (Gula: 2 raciones, 3 de salud por cada una que falte)
      function feed() {
        const need = this.hasAffliction('AF4') ? 2 : 1;
        const eaten = Math.min(need, h.rations);
        if (eaten) { this.lose('rations', eaten, 'alimento'); this.log(`Consumes ${eaten} ración(es) de sustento.`, 'game'); }
        const missing = need - eaten;
        if (missing > 0) {
          this.log(`Te faltan ${missing} ración(es): sufres ${3 * missing} de daño por inanición.`, 'game');
          this.lose('hp', 3 * missing, 'inanición');
          if (this.checkDeath()) return;
          this.gainAffliction('hambre');
        }
      },
      // 1b. Esbirros: comida de Borko, paga de Eydis
      function mercUpkeep() { if (this.s.mercs.length) this._mercUpkeep(); },
      // 2. Veneno: por cada 2 fichas ganas 1 más (Entereza lo impide; Infección lo duplica)
      function poison() {
        if (this.hasSkill('S16')) { this.log('Entereza: el veneno ya no aumenta al final del nivel.', 'skill'); return; }
        const p = h.poison;
        if (this.hasAffliction('AF5') && p >= 1) this.gain('poison', p, 'infección');
        else if (p >= 2) { this.gain('poison', Math.floor(p / 2), 'veneno'); this.log('El veneno avanza por tu sangre.', 'game'); }
        this._afterPoison(p);
        this.checkDeath();
      },
      // 3. Avanza el peón de nivel
      function advance() { if (s.level < 5) { s.level++; this.emit('levelUp', { level: s.level }); } },
      // 4. Roba y resuelve una trama
      function plotStep() { this.drawPlot({ endOfLevel: true }); },
      // 4b. Iron Chest: encuentro aleatorio del tramo recorrido en el mapa de aventura
      function encounter() { if (this.s.encounter && !wasLast && !s.bossStarted) this._encounterStep(from, from + 1); },
      // 5. Nuevo nivel; tras el nivel 5 se acaba la mazmorra y aparece el jefe aunque falten ojos
      function next() {
        if (s.bossStarted) return;
        if (wasLast) this._beginBossSequence('Has agotado los niveles de la mazmorra.');
        else this.push(this.startLevel);
      },
    );
  },

  gainAffliction(cause) {
    const z = this.s.z;
    if (!z.afflictions.length && !z.afflictionsDiscard.length) return null;
    const uid = this.draw('afflictions');
    if (!uid) return null;
    this.hero.afflictions.push(uid);
    const d = this.def(uid);
    this.emit('affliction', { uid, cause });
    this.log(`¡Sufres una aflicción: ${d.name}!`, 'affliction');
    this._afflictionGained?.(d);   // Amnesia olvida una habilidad ya; Adrenalina encadena aventuras
    if (d.key === 'AF5') this.gain('poison', 1, 'infección');
    if (d.key === 'AF2' && this.isOverweight()) this.push(this._weightCheck);
    return uid;
  },
  /** tercer veneno → aflicción (Bestias y Trabas) */
  _afterPoison(before) {
    if (before < 3 && this.hero.poison >= 3 && this.s.z.afflictions.length + this.s.z.afflictionsDiscard.length) this.gainAffliction('veneno');
  },

  /* ============================================================================ exploración */
  drawPair() {
    const s = this.s; const z = s.z;
    s.turn++;
    s.ctx = { turnActive: true };
    this._impMove?.(); // El Diablillo avanza una posición
    const a = z.dungeon.shift(); const b = z.dungeon.shift();
    z.pair = [a, b];
    this.emit('deal', { uids: [a, b] });
    this.log(`Turno ${s.turn}/${TURNS_PER_LEVEL}: robas dos cartas de mazmorra.`, 'explore');
    this.ask('pair', { uids: [a, b], sixthSense: this.canSixthSense() });
  },
  /** Sexto Sentido (S15): una vez por nivel, evitar una emboscada o revelar ambas cartas y elegir una */
  canSixthSense() { return this.hasSkill('S15') && !this.s.lvl.sexto; },
  /** Correr (S20): una vez por nivel, gastar energía para evitar cualquier carta de mazmorra */
  canFlee() { return this.hasSkill('S20') && !this.s.lvl.correr; },
  _flee() {
    this.s.lvl.correr = true;
    const d = this.rollOne('correr'); const h = this.hero;
    const cost = d <= 2 ? Math.floor(h.energy / 2) : d <= 4 ? 1 : 0;
    if (cost) this.lose('energy', cost, 'correr');
    this.log(`Correr (${d}): evitas la carta de mazmorra${cost ? ` gastando ${cost} de energía` : ' sin gastar energía'}.`, 'skill');
  },

  revealFirst(slot) {
    const z = this.s.z; const uid = z.pair[slot]; const other = z.pair[1 - slot];
    const d = this.def(uid);
    this.s.ctx.first = slot;
    this.emit('reveal', { uid, slot, side: 1 });
    this.log(`Revelas: ${d.name}.`, 'explore');
    if (d.kind === 'skirmish') this._peekOrb();
    let forced = null;
    if (this.hasAffliction('AF6')) forced = 'Histeria: debes resolver la primera carta.';
    else if (this.hasAffliction('AF8') && (d.kind === 'ambush' || d.kind === 'skirmish')) forced = 'Soberbia: debes resolver esta carta.';
    if (d.kind === 'ambush' && this.envFx().ambushAsSecond) {
      forced = 'La Sombra: debes resolver la emboscada como si fuera la segunda carta.';
      this.s.ctx.asSecond = true;
    }
    this.ask('decide', { uid, other, slot, forced, flee: this.canFlee() });
  },
  _peekOrb() {
    if (!this.hasCode('L24')) return;
    const top = this.s.z.enemies[0];
    if (top) { this.emit('peek', { uid: top }); this.log(`Orbe de Morthal: el próximo enemigo es ${this.def(top).name}.`, 'item'); }
  },

  /** Resuelve la carta elegida con la parte 1 o 2 (la otra se descarta) */
  resolveFirst(slot) {
    const z = this.s.z; const uid = z.pair[slot]; const other = z.pair[1 - slot];
    const side = this.s.ctx.asSecond ? 2 : 1;
    this.emit('discardCard', { uid: other, why: 'unseen' });
    this.emit('resolving', { uid, side });
    this.insert(function r() { this.resolveDungeon(uid, side); });
  },
  discardAndResolveSecond(slot) {
    const z = this.s.z; const first = z.pair[slot]; const second = z.pair[1 - slot];
    this.emit('discardCard', { uid: first, why: 'declined' });
    this.emit('reveal', { uid: second, slot: 1 - slot, side: 2 });
    this.emit('resolving', { uid: second, side: 2 });
    this.log(`Descartas ${this.def(first).name} y estás obligado a resolver ${this.def(second).name} (parte 2).`, 'explore');
    const d = this.def(second);
    // Correr también sirve para la carta obligada (los combates lo ofrecen en su propia petición)
    if (this.canFlee() && !['ambush', 'skirmish'].includes(d.kind)) {
      this.ask('avoidCard', { uid: second, kind: d.kind, side: 2, resolve: true, opts: null,
        options: [{ id: 'correr', label: 'Correr', text: 'Tira 1d6 para ver cuánta energía gastas y evita esta carta (una vez por nivel).' }] });
      return;
    }
    this.insert(function r() { this.resolveDungeon(second, 2); });
  },

  /* ============================================================================ cartas de mazmorra */
  resolveDungeon(uid, side, { skipEnv = false } = {}) {
    let d = this.def(uid);
    this.s.ctx.cardUid = uid; this.s.ctx.plotUid = null; this.s.ctx.side = side;
    const env = this.envFx();
    if (!skipEnv && env.fightBefore?.includes(d.kind)) { // La Niebla: combates antes del Campamento, el Altar y las Setas
      this.log(`${this.def(this.s.env).name}: antes de resolver ${d.name} debes combatir contra un enemigo.`, 'env');
      this.insert(function mistFight() { this._drawAndFight({ source: 'env', ambush: 'normal', hpBonus: this.eLvl(), initialBonus: 0 }); },
        function mistResume() { if (!this.s.over) this.resolveDungeon(uid, side, { skipEnv: true }); });
      return;
    }
    if (env.noClearing && d.kind === 'clearing') return this._swapDungeonCard(uid, side);          // El Reino Arborícola: roba otra
    if (env.ambushAsSkirmish && d.kind === 'ambush') d = this.cat.pools.dungeon.find((x) => x.kind === 'skirmish') || this.cat.def('d6'); // La Ciudad Caída
    switch (d.kind) {
      case 'ambush': case 'skirmish': return this._combatCard(uid, d, side);
      case 'treasure': return this._treasure(d, side);
      case 'labyrinth': return this._labyrinth(d, side);
      case 'mushrooms': return this._mushrooms(d, side);
      case 'arrowTrap': return this._arrowTrap(d, side);
      case 'camp': return this._camp(d);
      case 'altar': return this._altar(d);
      case 'clearing': return this.drawPlot({ clearing: true });
      case 'merchant':
        if (env.merchantToAmbush) {
          this.log('Túnel Abandonado: el mercader era una emboscada.', 'env');
          const amb = this.cat.pools.dungeon.find((x) => x.kind === 'ambush') || this.cat.def('d1');
          return this._combatCard(uid, amb, side);
        }
        return this.openMerchant(d);
      case 'archangel': return this._archangel(d);
      case 'falseIdol': return this.ask('choice', { title: d.name, source: uid, text: d.text, scene: 'ops',
        options: d.options.map((o) => ({ id: o.id, label: o.label, text: o.text, ops: this.cardParams(d).options?.[o.id] || [] })) });
      case 'fountain': return this._fountain(d);
      case 'wildEncounter': return this._wildEncounter(uid, d, side);
      default: throw new Error(`Carta de mazmorra sin resolver: ${d.kind}`);
    }
  },

  addPoison(n, cause) {
    if (n <= 0) return;
    if (this.poisonImmune()) { this.log('Sangre Envenenada: eres inmune al veneno.', 'skill'); return; }
    // Bastón del Cuervo: puedes perder esa misma cantidad de salud en vez de ganar veneno
    if (this.hasCode('T28') && !this.s.over) {
      this.insert(function crow() {
        this.ask('choice', { title: 'Bastón del Cuervo', text: `Vas a ganar ${n} ficha(s) de veneno. Puedes perder ${n} de salud en su lugar.`, scene: 'generic',
          options: [{ id: 'poison', label: `Ganar ${n} de veneno`, text: '' }, { id: 'hp', label: `Perder ${n} de salud`, text: '' }],
          onChoose: (id) => {
            if (id === 'hp') { this.lose('hp', n, 'bastón'); this.log(`Bastón del Cuervo: pierdes ${n} de salud en vez de envenenarte.`, 'item'); }
            else this._addPoisonRaw(n, cause);
            this.checkDeath();
          } });
      });
      return;
    }
    this._addPoisonRaw(n, cause);
  },
  _addPoisonRaw(n, cause) {
    const before = this.hero.poison;
    this.gain('poison', n, cause);
    this._afterPoison(before);
  },

  _treasure(d, side) {
    const P = this.cardParams(d, side);
    if (side === 1) this.log('El cofre estaba saqueado.', 'explore'); else this.log('¡El cofre está lleno!', 'explore');
    const first = P.choice
      ? function treasureChoice() { this.ask('choice', { title: d.name, source: this.s.ctx.cardUid, text: d.option2 || '', scene: 'ops', options: P.choice.map((o) => ({ ...o })) }); }
      : function treasureOps() { this.applyOps(P.ops || [], d); };
    this.insert(first, function treasureExtras() {
      const env = this.envFx();
      if (this.isRace('Enano')) { this.gain('hp', 1, 'enano'); this.log('Enano: +1 de salud al resolver el tesoro.', 'skill'); }
      if (env.treasureGold) { this.gain('gold', env.treasureGold, 'entorno'); this.log(`Entorno: +${env.treasureGold} de oro en el tesoro.`, 'env'); }
      if (env.treasureBlessing) this.gain('blessing', env.treasureBlessing, 'entorno');
      if (env.treasurePotion) this.gainPotion(env.treasurePotion);
    });
  },
  _labyrinth(d, side) {
    if (this.hasMerc('HM6') && !this.s.ctx.labResolve) {
      this.ask('choice', { title: d.name, source: this.s.ctx.cardUid, text: 'Farzad conoce el camino: puedes ignorar el Laberinto.', scene: 'generic',
        options: [{ id: 'ignore', label: 'Ignorar el Laberinto', text: 'Farzad te guía por el camino más seguro.' }, { id: 'resolve', label: 'Resolverlo', text: '' }],
        onChoose: (id) => { if (id === 'ignore') this.log('Farzad te saca del laberinto sin problemas.', 'merc'); else { this.s.ctx.labResolve = true; this._labyrinth(d, side); } } });
      return;
    }
    const P = this.cardParams(d, side); const h = this.hero;
    let cost = P.rations || 0;
    if (this.hasCode('L11')) cost = Math.max(0, cost - 1);
    const paid = Math.min(cost, h.rations);
    if (paid) this.lose('rations', paid, 'laberinto');
    const missing = cost - paid;
    let dmg = P.missingFlat ? (missing > 0 ? P.missingFlat : 0) : missing * (P.perMissing || 0);
    const extra = this.envFx().labyrinthExtra || 0;
    if (extra) {
      const p2 = Math.min(extra, h.rations); if (p2) this.lose('rations', p2, 'altiplano');
      dmg += 3 * (extra - p2);
      this.log(`El Altiplano: debes descartar ${extra} ración adicional.`, 'env');
    }
    this.log(`Laberinto: descartas ${paid} ración(es)${dmg ? ` y pierdes ${dmg} de salud` : ''}.`, 'explore');
    if (dmg) { this.lose('hp', dmg, 'laberinto'); if (this.checkDeath()) return; }
    if (P.after) this.applyOps(P.after, d);
  },
  _mushrooms(d, side) {
    const P = this.cardParams(d, side); const env = this.envFx();
    let rations = P.rations || 0; let poison = 0;
    if (P.table) {
      const r = this.rollOne('setas'); const row = P.table.find((x) => inRow(x[0], r));
      rations = row?.[1].rations || 0; poison = row?.[1].poison || 0;
      this.log(`Plantación de setas: tiras ${r}.`, 'explore');
    }
    let n = rations + (this.hasCode('L10') ? 1 : 0) + (this.hasMerc('HM5') ? 1 : 0) + (env.mushroomsRations || 0);
    if (env.noForage) { n = 0; this.log('Entorno: la plantación de setas no proporciona raciones.', 'env'); }
    if (n) { this.gain('rations', n, 'setas'); this.log(`Plantación de setas: ganas ${n} ración(es).`, 'explore'); }
    if (n && this.isRace('Elfo del Bosque')) { this.gain('energy', 1, 'elfo'); this.log('Elfo del Bosque: +1 de energía.', 'skill'); }
    if (poison) { this.log(`Las setas eran venenosas: ganas ${poison} ficha(s) de veneno.`, 'explore'); this.addPoison(poison, 'setas'); this.checkDeath(); }
  },
  _arrowTrap(d, side) {
    const P = this.cardParams(d, side);
    let n = P.poison || 0;
    if (P.table) { const r = this.rollOne('flechas'); n = P.table.find((x) => inRow(x[0], r))?.[1] ?? 0; this.log(`Trampa de flechas: tiras ${r}.`, 'explore'); }
    if (this.hasSkill('S7')) n = Math.max(0, n - 1);
    this.log(`Trampa de flechas: ganas ${n} ficha(s) de veneno.`, 'explore');
    this.addPoison(n, 'trampa');
    const dmg = this.envFx().arrowTrapDamage || 0;
    if (dmg) { this.lose('hp', dmg, 'trampa'); this.log(`Túnel Abandonado: las flechas te infligen ${dmg} de daño.`, 'env'); }
    this.checkDeath();
  },

  _camp(d) {
    this._campAuto(d);
    if (this.s.over) return;
    if (this.s.ctx.gralFight) { // Gral intenta robarte el oro: combate antes de elegir las acciones del Campamento
      this.s.ctx.gralFight = false;
      this.insert(function gralDuel() { this._gralDuel(); }, function campMenu() { if (!this.s.over) this._campMenu(d); });
      return;
    }
    this._campMenu(d);
  },
  _campMenu(d) {
    const h = this.hero; const env = this.envFx();
    const opts = d.options.map((o) => ({ ...o }));
    const noRest = this.hasAffliction('AF7');
    const haveFood = h.rations > 0 || this.hasCode('L1');
    for (const o of opts) {
      if (o.id === 'cook' && env.noCook) { o.disabled = true; o.reason = 'La Niebla: no puedes cocinar'; continue; }
      if (o.id === 'search' && env.campNoSearch) { o.disabled = true; o.reason = 'La Ciudad Caída: solo Cocinar o Descansar'; continue; }
      if (o.id === 'cook') { o.disabled = noRest || !haveFood; o.reason = noRest ? 'Insomnio' : 'Sin raciones'; }
      if (o.id === 'rest') { o.disabled = noRest || !haveFood; o.reason = noRest ? 'Insomnio' : 'Sin raciones'; }
      if (o.id === 'search' && env.noForage) { o.disabled = true; o.reason = 'No puedes buscar comida en este entorno'; }
    }
    const seta = this.equippedUid('AT2');
    if (env.campEndLevel) opts.push({ id: 'endLevel', label: 'Dar por terminado el nivel', text: 'Cielo Resquebrajado: puedes finalizar automáticamente este nivel.' });
    if (seta) opts.push({ id: 'goldenShroom', label: 'Cocinar la Seta de Colmena Dorada', text: 'Descarta la seta para recuperar toda tu salud.', disabled: noRest, reason: 'Insomnio' });
    if (opts.every((o) => o.disabled)) opts.push({ id: 'skip', label: 'Seguir adelante', text: 'No puedes hacer nada aquí.' });
    this.ask('choice', { title: d.name, source: this.s.ctx.cardUid || null, text: d.text, options: opts, scene: 'camp' });
  },
  /** efectos automáticos al llegar al Campamento (esbirros, Petaca, entorno) */
  _campAuto() {
    const env = this.envFx();
    for (const u of this.allItems()) if (this.def(u).key === 'T26' && this.s.cards[u].empty) { this.s.cards[u].empty = false; this.log('Rellenas tu Petaca.', 'item'); }
    if (env.campEyes) { this.log('Las Miradas: los ojos de las paredes te observan en el campamento.', 'env'); this.addEyes(env.campEyes); }
    this._mercCamp();
    this._checkEyes();
  },
  _campChoose(id, pr) {
    const h = this.hero;
    const card = pr?.source ? this.def(pr.source) : this.cat.def('d7');
    const P = card.kind === 'camp' ? this.cardParams(card) : this.cardParams(this.cat.def('d7'));
    const env = this.envFx();
    const eatFood = () => { if (h.rations > 0) this.lose('rations', 1, 'campamento'); else { const u = this.equippedUid('L1'); this.discardOwned(u, 'eat'); } };
    if (id === 'cook') {
      eatFood();
      const n = (P.cook?.energy ?? 3) + (this.hasCode('L13') ? 1 : 0) + (this.hasSkill('S3') ? 1 : 0);
      this.gain('energy', n, 'cocinar'); this.log(`Cocinas una ración: ganas ${n} de energía.`, 'camp');
    } else if (id === 'search') {
      const n = (P.search?.rations ?? 1) + (env.campSearchRations || 0);
      this.gain('rations', n, 'buscar');
      if (P.search?.gold) this.gain('gold', P.search.gold, 'buscar');
      this.log(`Buscas provisiones: ganas ${n} ración(es)${P.search?.gold ? ` y ${P.search.gold} de oro` : ''}.`, 'camp');
    } else if (id === 'rest') {
      eatFood();
      const hp = (P.rest?.hp ?? 2) + this.sumFx('restHp');
      this.gain('hp', hp, 'descansar'); this.lose('poison', P.rest?.poison ?? 1, 'descansar');
      this.log(`Descansas: +${hp} de salud y −${P.rest?.poison ?? 1} de veneno.`, 'camp');
      if (this.isRace('Elfo del Bosque')) { this.gain('energy', 1, 'elfo'); this.log('Elfo del Bosque: +1 de energía al descansar.', 'skill'); }
      if (this.hasMerc('HM3')) { this.gain('energy', 1, 'yak'); this.log('Yak hace guardia mientras descansas: +1 de energía.', 'merc'); }
    } else if (id === 'goldenShroom') {
      const u = this.equippedUid('AT2'); this.discardOwned(u, 'eat');
      this.gain('hp', this.maxHp() - h.hp, 'seta dorada'); this.log('Cocinas la Seta de Colmena Dorada: recuperas toda tu salud.', 'camp');
    } else if (id === 'endLevel') { this.s.ctx.endLevelNow = true; this.log('Das por terminado el nivel desde el Campamento.', 'camp'); }
    else if (id === 'skip') this.log('No puedes hacer nada en el campamento.', 'camp');
  },
  _altar(d) {
    if (this.envFx().noAltar) { this.log('Las Catacumbas: en este nivel no puedes resolver el Altar.', 'env'); return; }
    if (this.hasMerc('HM7')) { this.gain('energy', 2, 'godfrey'); this.log('Godfrey reza en el altar: +2 de energía.', 'merc'); }
    this.ask('choice', { title: d.name, source: this.s.ctx.cardUid || null, text: d.text, options: d.options.map((o) => ({ ...o })), scene: 'altar' });
  },
  _altarChoose(id, pr) {
    const card = pr?.source ? this.def(pr.source) : this.cat.def('d9');
    const P = this.cardParams(card.kind === 'altar' ? card : this.cat.def('d9'));
    const ops = P.options?.[id] || (id === 'bless' ? [['altarBlessing']] : [['altarCure']]);
    this.insert(function altarOps() { this.applyOps(ops, card); }, function altarExtras() {
      const env = this.envFx();
      if (this.hasCode('T30')) { this.gain('hp', 2, 'rosario'); this.log('Rosario de Fe: +2 de salud en el altar.', 'item'); }
      if (env.altarGold) { this.gain('gold', env.altarGold, 'entorno'); this.log(`Entorno: +${env.altarGold} de oro en el altar.`, 'env'); }
      if (env.altarHp) { this.gain('hp', env.altarHp, 'entorno'); this.log(`Entorno: +${env.altarHp} de salud en el altar.`, 'env'); }
      if (env.altarHpByMorality && this.morality() > 0) { this.gain('hp', this.morality(), 'entorno'); this.log(`El Altiplano: +${this.morality()} de salud (tu moral).`, 'env'); }
    });
  },
  _archangel(d) {
    const m = Math.max(-5, Math.min(5, this.morality()));
    const row = (this.cardParams(d).table || []).find((r) => inRow(r[0], m));
    this.log(`El arcángel juzga tu moral (${m > 0 ? '+' : ''}${m}).`, 'explore');
    if (row) this.applyOps(row[1], d);
    this.insert(function ac() { this.checkDeath(); });
  },
  _fountain(d) {
    const r = this.rollOne('fuente');
    const row = (this.cardParams(d).table || []).find((x) => inRow(x[0], r));
    this.log(`Fuente Mística: tiras ${r}.`, 'explore');
    if (row) this.applyOps(row[1], d);
  },
  _wildEncounter(uid, d, side) {
    const P = this.cardParams(d, side); const lvl = this.eLvl();
    const drawn = [];
    for (let i = 0; i < P.draw; i++) { const u = this.draw('enemies'); if (u) drawn.push(u); }
    if (!drawn.length) { this.log('No quedan enemigos en el mazo.', 'combat'); return; }
    const hpOf = (u) => (this.def(u).trap || typeof this.def(u).health !== 'number' ? -1 : this.def(u).health); // trampas, peligros y Mutante cuentan como la menor salud
    const max = Math.max(...drawn.map(hpOf));
    const top = drawn.filter((u) => hpOf(u) === max);
    const opts = { source: 'dungeon', cardKind: 'wildEncounter', side, ambush: 'normal', hpBonus: lvl + P.hp, initialBonus: 0 };
    for (const u of drawn) if (!top.includes(u)) { this.s.z.enemiesDiscard.push(u); this.emit('discardCard', { uid: u, why: 'weaker' }); }
    this.log(`Encuentro Salvaje: robas ${drawn.length} enemigo(s) y te enfrentas al más fuerte.`, 'combat');
    if (top.length === 1) { this._fightDrawn(top[0], opts); return; }
    this.ask('pickCards', { title: 'Encuentro Salvaje: empate, elige a qué enemigo te enfrentas', uids: top, min: 1, max: 1, purpose: 'wild', opts });
  },

  /* ============================================================================ tramas */
  drawPlot({ clearing = false, endOfLevel = false, extra = false } = {}) {
    const z = this.s.z;
    this.s.ctx.endOfLevel = !!endOfLevel;
    if (!z.plots.length) { this.log('No quedan cartas de trama.', 'plot'); return; }
    // Las Catacumbas (entorno): roba 2 tramas, elige 1 y descarta la otra
    if (this.envFx().plotPick2 && z.plots.length >= 2) {
      this.insert(function cat2() {
        const a = this.draw('plots'); const b = this.draw('plots');
        this.log('Las Catacumbas: robas dos tramas y eliges una.', 'env');
        this.ask('pickCards', { title: 'Las Catacumbas: elige la trama que resuelves', uids: [a, b].filter(Boolean), min: 1, max: 1, purpose: 'plot' });
      });
      return;
    }
    // Moneda del Destino: robar 2 y elegir una
    const coin = this.equippedUid('L30');
    if (coin && z.plots.length >= 2) {
      this.insert(function coinAsk() {
        this.ask('choice', { title: 'Moneda del Destino', text: 'Cuando se te pida robar una carta de trama, puedes descartar la Moneda del Destino para robar 2, elegir una y descartar la otra.',
          options: [{ id: 'use', label: 'Usar la Moneda', text: 'Robas 2 cartas de trama y eliges una.' }, { id: 'no', label: 'Robar una sola', text: 'Roba la carta superior.' }], scene: 'coin', coin });
      });
      return;
    }
    const uid = this.draw('plots');
    this._startPlot(uid);
  },
  _startPlot(uid) {
    const d = this.def(uid);
    if (this._offerIgnorePlot?.(uid, d)) return;
    this.s.ctx.plotUid = uid;
    const inPlay = (this.s.ctx.inPlay ||= []); if (!inPlay.includes(uid)) inPlay.push(uid); // tramas en resolución (aún no están en la pila de jugadas)
    if (this.s.ctx.plotChecked !== uid) this.emit('plot', { uid });
    this.log(`Trama: ${d.name}.`, 'plot');
    if (d.plotEnemy) return this._plotEnemy(uid, d);
    if (d.pre?.length) {
      this.insert(function plotPre() { this.applyOps(d.pre, d); }, function plotAfterPre() { if (!this.s.over) this._plotOptions(uid); });
      return;
    }
    this._plotOptions(uid);
  },
  _plotOptions(uid) {
    const d = this.def(uid);
    const opts = (d.options || []).map((o) => ({ id: o.id, label: o.prompt, text: o.text, ops: o.ops, ...this._feasible(o.ops, o.req) }));
    if (opts.length) {
      if (opts.every((o) => o.disabled)) opts.push({ id: 'skip', label: 'Seguir adelante', text: 'No puedes hacer nada aquí.', ops: [] });
      this.ask('choice', { title: d.name, source: uid, text: d.narrative, options: opts, scene: 'plot', plotUid: uid });
    } else {
      this.insert(function plotDirect() { this.applyOps(d.ops || [], d); }, function eyes() { this._plotEyes(uid); });
    }
  },
  _plotEyes(uid) {
    const d = this.def(uid);
    this.s.z.plotsPlayed.push(uid);
    if (this.s.ctx.inPlay) this.s.ctx.inPlay = this.s.ctx.inPlay.filter((u) => u !== uid);
    if (d.eyes) this.addEyes(d.eyes, uid);
    this._checkEyes();
  },
  _checkEyes() {
    if (this.s.eyes >= BOSS_EYES && !this.s.bossStarted && !this.s.over) this._beginBossSequence('El jefe final ha notado tu presencia (10 ojos).');
  },
  _feasible(ops, req) {
    for (const op of ops || []) {
      if (op[0] === 'pay' && this._statNow(op[1]) < op[2]) return { disabled: true, reason: op[1] === 'gold' ? 'Sin oro' : 'No puedes pagarlo' };
    }
    if (this.hasMerc('HM7') && (ops || []).some((op) => op[0] === 'morality' && op[1] < 0)) return { disabled: true, reason: 'Godfrey no te lo permite' };
    if (req) {
      const [k, a, b] = req; let ok = true;
      if (k === 'morality') ok = a === '>' ? this.morality() > b : a === '<' ? this.morality() < b : this.morality() === b;
      else if (k === 'graveyard') ok = this.s.z.graveyard.some((e) => this.def(e.uid).key === a);
      else if (k === 'unspentEnemy') ok = this.unspentEnemies().length > 0;
      else if (k === 'blessings') ok = this.hero.blessings.length >= a;
      if (!ok) return { disabled: true, reason: 'No se cumple la condición' };
    }
    return {};
  },
  _statNow(stat) { return stat === 'blessing' ? this.hero.blessings.length : this.hero[stat === 'hp' ? 'hp' : stat]; },

  /* ============================================================================ mercader */
  openMerchant(d = null) {
    const P = d ? this.cardParams(d) : {};
    const lvl = Math.min(5, this.s.level);
    const [nl, np] = Array.isArray(P.stock) ? P.stock : this.cat.merchantStock[lvl];
    const stock = [];
    const mimics = [];
    for (let i = 0; i < nl; i++) {
      const u = this.draw('loot'); if (!u) break;
      if (this.def(u).kind === 'enemy') mimics.push(u); else stock.push(u);
    }
    for (let i = 0; i < np; i++) { const u = this.draw('potions'); if (u) stock.push(u); }
    this.log(`El mercader despliega su bazar (${stock.length} artículos).`, 'merchant');
    const trade = !!P.trade;
    this.s.ctx.stock = stock; // el bazar ya está desplegado aunque antes haya que luchar contra un mimético
    const tasks = mimics.map((u) => function mimicFight() { this._mimic(u); });
    this.insert(...tasks, function bazaar() { this.s.ctx.trade = trade; this._askMerchant(); });
  },
  _askMerchant() { this.ask('merchant', { stock: this.s.ctx.stock, trade: !!this.s.ctx.trade }); },
  buyPrice(uid) { const p = this.def(uid).price || 0; return this.hasSkill('S1') ? Math.ceil(p / 2) : p; },
  sellPrice() { return this.hasSkill('S1') ? 2 : 1; },

  /* ============================================================================ plot enemy / mimic */
  _mimic(uid) {
    this.log('¡Era un Mimético! Debes combatirlo.', 'combat');
    this.startCombat(uid, { ambush: 'normal', hpBonus: this.eLvl(), source: 'mimic' });
  },
  _plotEnemy(uid, d) {
    this.startCombat(uid, { ambush: 'normal', hpBonus: 0, source: 'plot', plot: true });
  },

  /* ============================================================================ final de partida */
  _beginBossSequence(reason) {
    if (this.s.bossStarted) return;
    this.s.bossStarted = true;
    this.log(reason, 'boss');
    this.q.length = 0;
    this.s.prompt = null;
    this.push(...(this.s.variants?.hogarSonado ? [this._dreamHome] : []), this.divineVisit, this.startBoss);
  },
  divineVisit() {
    const h = this.hero;
    const faces = h.blessings.slice();
    if (!faces.length) { this.log('No tienes fichas de bendición para la Visita Divina.', 'boss'); return; }
    this.emit('divine', { faces });
    let hp = 0; let en = 0; let cure = false;
    for (const f of faces) { if (f.k === 'hp') hp += f.n; else if (f.k === 'en') en += f.n; else cure = true; }
    h.blessings = []; this.s.z.blessingPile.push(...faces);
    this.emit('stat', { stat: 'blessing', from: faces.length, to: 0, cause: 'divine' });
    if (hp) this.gain('hp', hp, 'visita divina');
    if (en) this.gain('energy', en, 'visita divina');
    if (cure) this.lose('poison', h.poison, 'visita divina');
    this.log(`Visita Divina: +${hp} salud, +${en} energía${cure ? ' y se elimina todo el veneno' : ''}.`, 'boss');
    this.ask('divine', { faces, hp, en, cure });
  },
  determineBoss() {
    const z = this.s.z;
    if (this.cat.bossOverride) return this._takeFromDeck('bosses', this.cat.bossOverride) || z.bosses[0];
    const counts = { fire: 0, undead: 0, ice: 0 };
    for (const e of z.graveyard) { const w = e.weakness ?? this.def(e.uid).weakness; if (w in counts) counts[w]++; } // "*" (Zogar) no cuenta
    const max = Math.max(...Object.values(counts));
    const top = WEAKNESS_ORDER.filter((w) => counts[w] === max);
    let w;
    if (top.length === 1) w = top[0];
    else if (top.length === 2) {
      // Fuego vence a No muerto, No muerto vence a Hielo, Hielo vence a Fuego
      const beats = { fire: 'undead', undead: 'ice', ice: 'fire' };
      w = beats[top[0]] === top[1] ? top[0] : top[1];
    } else w = this.rng.pick(WEAKNESS_ORDER);
    this.log(`Debilidades de tus enemigos: Fuego ${counts.fire}, No muerto ${counts.undead}, Hielo ${counts.ice} → ${w}.`, 'boss');
    const hasW = (u) => (this.def(u).weaknesses || [this.def(u).weakness]).includes(w);
    if (this.cat.packIds.includes('anemia')) { // ANEMIA: los jefes nuevos entran en el sorteo (Tzxefytd, sin debilidad, sirve para cualquiera)
      const cands = z.bosses.filter((u) => hasW(u) || this.def(u).weakness === '*');
      const pick = cands.length ? this.rng.pick(cands) : z.bosses[0];
      this.log(`Jefes candidatos: ${cands.map((u) => this.def(u).name).join(', ')}.`, 'boss');
      z.bosses.splice(z.bosses.indexOf(pick), 1);
      return pick;
    }
    const uid = z.bosses.find((u) => this.def(u).weakness === w && !this.cat.bossOverride && this.def(u).pack === 'base') || z.bosses.find((u) => this.def(u).weakness === w) || z.bosses[0];
    z.bosses.splice(z.bosses.indexOf(uid), 1);
    return uid;
  },
  startBoss() {
    const uid = this.determineBoss();
    this.emit('boss', { uid });
    this.log(`¡El jefe final aparece: ${this.def(uid).name}!`, 'boss');
    this.startCombat(uid, { ambush: 'normal', hpBonus: 0, source: 'boss', boss: true });
  },
  victory() {
    if (this._nextAdventureIfChained?.()) return; // Sin Retorno / Adrenalina: la aventura siguiente
    this.endGame('victory', 'Has derrotado al jefe final.', this.s.variants?.metalInmortal ? { ending: 'trapped' } : {});
  },
});

/* ================================================================================ acciones de exploración */
ACTIONS.draw = {
  in: ['turn'],
  run() { this.clear(); this.drawPair(); },
};
ACTIONS.reveal = {
  in: ['pair'],
  run({ slot }) {
    if (slot !== 0 && slot !== 1) this.fail('Carta inválida.');
    this.clear(); this.revealFirst(slot);
  },
};
ACTIONS.sixthSense = { // Sexto Sentido: revelar ambas cartas y elegir una (una vez por nivel)
  in: ['pair'],
  run() {
    if (!this.canSixthSense()) this.fail('No puedes usar Sexto Sentido ahora.');
    this.s.lvl.sexto = true;
    const z = this.s.z;
    this.clear();
    z.pair.forEach((u, i) => this.emit('reveal', { uid: u, slot: i, side: 1, both: true }));
    this.log('Sexto Sentido: revelas ambas cartas y eliges una.', 'skill');
    this.ask('chooseOne', { uids: z.pair.slice() });
  },
};
ACTIONS.resolve = {
  in: ['decide'],
  run(_, pr) { this.clear(); this.resolveFirst(pr.slot); },
};
ACTIONS.decline = {
  in: ['decide'],
  run(_, pr) {
    if (pr.forced) this.fail(pr.forced);
    this.clear(); this.discardAndResolveSecond(pr.slot);
  },
};
ACTIONS.flee = { // Correr: evitar la carta revelada (la otra se descarta sin mirar)
  in: ['decide'],
  run(_, pr) {
    if (!this.canFlee()) this.fail('No puedes usar Correr ahora.');
    this.clear();
    this.emit('discardCard', { uid: pr.other, why: 'unseen' });
    this.emit('discardCard', { uid: pr.uid, why: 'fled' });
    this._flee();
  },
};
ACTIONS.pickOne = { // tras usar Antorcha/Lámpara/Sexto Sentido: elegir una de las dos cartas reveladas
  in: ['chooseOne'],
  run({ slot }) {
    const z = this.s.z; const uid = z.pair[slot]; const other = z.pair[1 - slot];
    if (!uid) this.fail('Carta inválida.');
    this.clear();
    this.emit('discardCard', { uid: other, why: 'unchosen' });
    this.emit('resolving', { uid, side: 1 });
    this.insert(function r() { this.resolveDungeon(uid, 1); });
  },
};
ACTIONS.choose = {
  in: ['choice'],
  run({ id }, pr) {
    const o = pr.options.find((x) => x.id === id);
    if (!o) this.fail('Opción inválida.');
    if (o.disabled) this.fail(`No disponible: ${o.reason || ''}`);
    this.clear();
    switch (pr.scene) {
      case 'camp': this._campChoose(id, pr); break;
      case 'altar': this._altarChoose(id, pr); break;
      case 'plot': {
        const d = this.def(pr.plotUid);
        if (id === 'skip') this.log('Sigues adelante sin hacer nada.', 'plot');
        this.log(`Eliges: ${o.label}`, 'plot');
        this.insert(function plotOps() { this.applyOps(o.ops || [], d); }, function eyes() { this._plotEyes(pr.plotUid); });
        break;
      }
      case 'coin': {
        if (id === 'use') {
          this.discardOwned(pr.coin, 'use');
          const a = this.draw('plots'); const b = this.draw('plots');
          this.ask('pickCards', { title: 'Moneda del Destino: elige una trama', uids: [a, b].filter(Boolean), min: 1, max: 1, purpose: 'plot' });
        } else { const u = this.draw('plots'); this._startPlot(u); }
        break;
      }
      case 'ops': { // elección cuyas opciones llevan operaciones (cartas de mazmorra, tramas encadenadas…)
        const src = pr.source ? this.def(pr.source) : { name: pr.title };
        if (o.label) this.log(`Eliges: ${o.label}`, 'explore');
        this.insert(function opsChoice() { this.applyOps(o.ops || [], src); });
        break;
      }
      case 'generic': this.insert(function g() { pr.onChoose?.(id); }); break;
      default: throw new Error(`Escena desconocida: ${pr.scene}`);
    }
  },
};
ACTIONS.pickCards = {
  in: ['pickCards'],
  run({ uids }, pr) {
    if (!Array.isArray(uids) || uids.length < pr.min || uids.length > pr.max) this.fail(`Debes elegir entre ${pr.min} y ${pr.max} carta(s).`);
    if (!uids.every((u) => pr.uids.includes(u)) || new Set(uids).size !== uids.length) this.fail('Selección inválida.');
    if (pr.purpose === 'avoidValue' && uids.reduce((n, u) => n + (this.def(u).price || 0), 0) < pr.need) this.fail(`El valor combinado debe ser al menos ${pr.need}.`);
    this.clear();
    this._pickDone(pr, uids);
  },
};
ACTIONS.leaveMerchant = {
  in: ['merchant'],
  run() {
    const stock = this.s.ctx.stock || [];
    for (const u of stock) this.s.z[this.pileFor(this.def(u))].push(u);
    this.emit('merchantClose', { left: stock });
    this.s.ctx.stock = [];
    this.clear();
  },
};
ACTIONS.merchantBuy = {
  in: ['merchant'],
  run({ uid }) {
    const stock = this.s.ctx.stock; const i = stock.indexOf(uid);
    if (i < 0) this.fail('Ese artículo ya no está.');
    const p = this.buyPrice(uid);
    if (this.hero.gold < p) this.fail('No tienes oro suficiente.');
    stock.splice(i, 1); this.lose('gold', p, 'compra');
    this.log(`Compras ${this.def(uid).name} por ${p} de oro.`, 'merchant');
    this.clear(); this.acquire(uid);
    this.insert(function again() { this._askMerchant(); });
  },
};
ACTIONS.merchantSell = {
  in: ['merchant'],
  run({ uid }) {
    if (!this.allItems().includes(uid)) this.fail('No tienes ese objeto.');
    const d = this.def(uid);
    if (d.fx?.cursed) this.fail(`${d.name} está maldito.`);
    const p = this.sellPrice();
    this.removeOwned(uid);
    this.s.z[this.pileFor(d)].push(uid);
    this.emit('sellCard', { uid });
    this.gain('gold', p, 'venta'); this.log(`Vendes ${d.name} por ${p} de oro.`, 'merchant');
    this.clear(); this.insert(function again() { this._askMerchant(); });
  },
};
ACTIONS.merchantTrade = { // Mercader de The Howling Abyss: cambia un objeto tuyo por otro suyo de MENOR valor
  in: ['merchant'],
  run({ give, take }) {
    if (!this.s.ctx.trade) this.fail('Este mercader no comercia.');
    if (!this.allItems().includes(give)) this.fail('No tienes ese objeto.');
    const stock = this.s.ctx.stock; const i = stock.indexOf(take);
    if (i < 0) this.fail('Ese artículo ya no está.');
    const dg = this.def(give); const dt = this.def(take);
    if (dg.fx?.cursed) this.fail(`${dg.name} está maldito.`);
    if (!((dg.price || 0) > (dt.price || 0))) this.fail('El objeto que entregas debe valer más que el que recibes.');
    this.removeOwned(give); stock.splice(i, 1, give);
    this.emit('tradeCard', { give, take });
    this.log(`Cambias ${dg.name} por ${dt.name}.`, 'merchant');
    this.clear(); this.acquire(take);
    this.insert(function again() { this._askMerchant(); });
  },
};
ACTIONS.merchantEmerald = {
  in: ['merchant'],
  run({ uid }) {
    const em = this.equippedUid('L29');
    if (!em) this.fail('No tienes una Esmeralda.');
    const stock = this.s.ctx.stock; const i = stock.indexOf(uid);
    if (i < 0) this.fail('Ese artículo ya no está.');
    this.discardOwned(em, 'trade'); stock.splice(i, 1);
    this.log(`Pagas con tu Esmeralda y te llevas ${this.def(uid).name}.`, 'merchant');
    this.clear(); this.acquire(uid);
    this.insert(function again() { this._askMerchant(); });
  },
};
