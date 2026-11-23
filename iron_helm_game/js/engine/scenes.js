/**
 * IRON HELM · Flujo de partida: niveles, turnos de exploración, cartas de mazmorra, tramas,
 * mercader, fin de nivel, visita divina y jefe final.
 */
import { Game, ACTIONS, WEAKNESS_ORDER } from './game.js';

const TURNS_PER_LEVEL = 8;
const BOSS_EYES = 10;

Object.assign(Game.prototype, {
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
      if (s.turn >= TURNS_PER_LEVEL || z.dungeon.length < 2) { this.push(this.endLevel); return; }
    }
    s.ctx = {};
    this.ask('turn', { turn: s.turn + 1, left: z.dungeon.length });
  },

  endLevel() {
    const s = this.s; const h = this.hero;
    const wasLast = s.level >= 5;
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
    if (d.code === 'AF5') this.gain('poison', 1, 'infección');
    if (d.code === 'AF2' && this.isOverweight()) this.push(this._weightCheck);
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
    const a = z.dungeon.shift(); const b = z.dungeon.shift();
    z.pair = [a, b];
    this.emit('deal', { uids: [a, b] });
    this.log(`Turno ${s.turn}/${TURNS_PER_LEVEL}: robas dos cartas de mazmorra.`, 'explore');
    this.ask('pair', { uids: [a, b] });
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
    this.ask('decide', { uid, other, slot, forced });
  },
  _peekOrb() {
    if (!this.hasCode('L24')) return;
    const top = this.s.z.enemies[0];
    if (top) { this.emit('peek', { uid: top }); this.log(`Orbe de Morthal: el próximo enemigo es ${this.def(top).name}.`, 'item'); }
  },

  /** Resuelve la carta elegida con la parte 1 o 2 (la otra se descarta) */
  resolveFirst(slot) {
    const z = this.s.z; const uid = z.pair[slot]; const other = z.pair[1 - slot];
    this.emit('discardCard', { uid: other, why: 'unseen' });
    this.emit('resolving', { uid, side: 1 });
    this.insert(function r() { this.resolveDungeon(uid, 1); });
  },
  discardAndResolveSecond(slot) {
    const z = this.s.z; const first = z.pair[slot]; const second = z.pair[1 - slot];
    this.emit('discardCard', { uid: first, why: 'declined' });
    this.emit('reveal', { uid: second, slot: 1 - slot, side: 2 });
    this.emit('resolving', { uid: second, side: 2 });
    this.log(`Descartas ${this.def(first).name} y estás obligado a resolver ${this.def(second).name} (parte 2).`, 'explore');
    this.insert(function r() { this.resolveDungeon(second, 2); });
  },

  /* ============================================================================ cartas de mazmorra */
  resolveDungeon(uid, side) {
    const d = this.def(uid);
    this.s.ctx.cardUid = uid; this.s.ctx.plotUid = null;
    const opt = side === 1 ? d.option1 : d.option2;
    switch (d.kind) {
      case 'ambush': case 'skirmish': return this._combatCard(uid, d, side);
      case 'treasure':
        if (side === 1) { this.gain('gold', 1, 'tesoro'); this.log('El cofre estaba saqueado: ganas 1 de oro.', 'explore'); }
        else { this.log('¡El cofre está lleno! Robas botín y poción.', 'explore'); this.gainLoot(1); this.gainPotion(1); }
        return;
      case 'labyrinth': {
        let cost = side === 1 ? 1 : 2;
        if (this.hasCode('L11')) cost = Math.max(0, cost - 1);
        const paid = Math.min(cost, this.hero.rations);
        if (paid) this.lose('rations', paid, 'laberinto');
        const missing = cost - paid;
        const dmg = side === 1 ? (missing > 0 ? 3 : 0) : 2 * missing;
        this.log(`Laberinto: descartas ${paid} ración(es)${dmg ? ` y pierdes ${dmg} de salud` : ''}.`, 'explore');
        if (dmg) { this.lose('hp', dmg, 'laberinto'); this.checkDeath(); }
        return;
      }
      case 'mushrooms': {
        const n = (side === 1 ? 1 : 2) + (this.hasCode('L10') ? 1 : 0);
        this.gain('rations', n, 'setas'); this.log(`Plantación de setas: ganas ${n} ración(es).`, 'explore');
        return;
      }
      case 'arrowTrap': {
        let n = side === 1 ? 1 : 2;
        if (this.hasSkill('S7')) n = Math.max(0, n - 1);
        this.log(`Trampa de flechas: ganas ${n} ficha(s) de veneno.`, 'explore');
        this.addPoison(n, 'trampa'); this.checkDeath();
        return;
      }
      case 'camp': return this._camp(d);
      case 'altar': return this._altar(d);
      case 'clearing': return this.drawPlot({ clearing: true });
      case 'merchant': return this.openMerchant();
      default: throw new Error(`Carta de mazmorra sin resolver: ${d.kind} ${opt || ''}`);
    }
  },

  addPoison(n, cause) {
    const before = this.hero.poison;
    this.gain('poison', n, cause);
    this._afterPoison(before);
  },

  _camp(d) {
    const h = this.hero;
    const opts = d.options.map((o) => ({ ...o }));
    const noRest = this.hasAffliction('AF7');
    const haveFood = h.rations > 0 || this.hasCode('L1');
    for (const o of opts) {
      if (o.id === 'cook') { o.disabled = noRest || !haveFood; o.reason = noRest ? 'Insomnio' : 'Sin raciones'; }
      if (o.id === 'rest') { o.disabled = noRest || !haveFood; o.reason = noRest ? 'Insomnio' : 'Sin raciones'; }
    }
    this.ask('choice', { title: d.name, source: this.s.ctx.cardUid || null, text: d.text, options: opts, scene: 'camp' });
  },
  _campChoose(id) {
    const h = this.hero;
    const eatFood = () => { if (h.rations > 0) this.lose('rations', 1, 'campamento'); else { const u = this.equippedUid('L1'); this.discardOwned(u, 'eat'); } };
    if (id === 'cook') {
      eatFood();
      const n = 3 + (this.hasCode('L13') ? 1 : 0) + (this.hasSkill('S3') ? 1 : 0);
      this.gain('energy', n, 'cocinar'); this.log(`Cocinas una ración: ganas ${n} de energía.`, 'camp');
    } else if (id === 'search') { this.gain('rations', 1, 'buscar'); this.log('Buscas provisiones: ganas 1 ración.', 'camp'); }
    else if (id === 'rest') { eatFood(); this.gain('hp', 2, 'descansar'); this.lose('poison', 1, 'descansar'); this.log('Descansas: +2 de salud y −1 de veneno.', 'camp'); }
  },
  _altar(d) {
    this.ask('choice', { title: d.name, text: d.text, options: d.options.map((o) => ({ ...o })), scene: 'altar' });
  },
  _altarChoose(id) {
    if (id === 'bless') {
      let n = 1;
      if (this.hasSkill('S4')) n = 2;
      if (this.hasCode('T16')) n = Math.max(n, 2);
      const got = this.gain('blessing', n, 'altar'); this.log(`Rezas en el altar: ganas ${got} ficha(s) de bendición.`, 'altar');
    } else {
      const [a, b] = this.roll(2, 'altar');
      const n = Math.abs(a - b);
      this.lose('poison', n, 'altar'); this.log(`El altar te cura ${n} ficha(s) de veneno (d6−d6).`, 'altar');
    }
  },

  /* ============================================================================ tramas */
  drawPlot({ clearing = false, endOfLevel = false, extra = false } = {}) {
    const z = this.s.z;
    this.s.ctx.endOfLevel = !!endOfLevel;
    if (!z.plots.length) { this.log('No quedan cartas de trama.', 'plot'); return; }
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
    this.s.ctx.plotUid = uid;
    this.emit('plot', { uid });
    this.log(`Trama: ${d.name}.`, 'plot');
    if (d.plotEnemy) return this._plotEnemy(uid, d);
    const opts = (d.options || []).map((o) => ({ id: o.id, label: o.prompt, text: o.text, ops: o.ops, ...this._feasible(o.ops) }));
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
    if (d.eyes) {
      this.s.eyes += d.eyes;
      this.emit('eyes', { uid, eyes: this.s.eyes });
      this.log(`+${d.eyes} ojo(s) · ${this.s.eyes}/${BOSS_EYES}`, 'plot');
    }
    this._checkEyes();
  },
  _checkEyes() {
    if (this.s.eyes >= BOSS_EYES && !this.s.bossStarted && !this.s.over) this._beginBossSequence('El jefe final ha notado tu presencia (10 ojos).');
  },
  _feasible(ops) {
    for (const op of ops || []) {
      if (op[0] === 'pay' && this._statNow(op[1]) < op[2]) return { disabled: true, reason: op[1] === 'gold' ? 'Sin oro' : 'No puedes pagarlo' };
    }
    return {};
  },
  _statNow(stat) { return stat === 'blessing' ? this.hero.blessings.length : this.hero[stat === 'hp' ? 'hp' : stat]; },

  /* ============================================================================ mercader */
  openMerchant() {
    const lvl = Math.min(5, this.s.level);
    const [nl, np] = this.cat.merchantStock[lvl];
    const stock = [];
    const mimics = [];
    for (let i = 0; i < nl; i++) {
      const u = this.draw('loot'); if (!u) break;
      if (this.def(u).kind === 'enemy') mimics.push(u); else stock.push(u);
    }
    for (let i = 0; i < np; i++) { const u = this.draw('potions'); if (u) stock.push(u); }
    this.log(`El mercader despliega su bazar (${stock.length} artículos).`, 'merchant');
    const tasks = mimics.map((u) => function mimicFight() { this._mimic(u); });
    this.insert(...tasks, function bazaar() { this.s.ctx.stock = stock; this.ask('merchant', { stock }); });
  },
  buyPrice(uid) { const p = this.def(uid).price || 0; return this.hasSkill('S1') ? Math.ceil(p / 2) : p; },
  sellPrice() { return this.hasSkill('S1') ? 2 : 1; },

  /* ============================================================================ plot enemy / mimic */
  _mimic(uid) {
    this.log('¡Era un Mimético! Debes combatirlo.', 'combat');
    this.startCombat(uid, { ambush: 'normal', hpBonus: this.s.level, source: 'mimic' });
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
    this.push(this.divineVisit, this.startBoss);
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
    for (const e of z.graveyard) counts[this.def(e.uid).weakness]++;
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
    this.endGame('victory', 'Has derrotado al jefe final.');
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
ACTIONS.pickOne = { // tras usar Antorcha/Lámpara: elegir una de las dos cartas reveladas
  in: ['chooseOne'],
  run({ slot }) {
    const z = this.s.z; const uid = z.pair[slot]; const other = z.pair[1 - slot];
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
      case 'camp': this._campChoose(id); break;
      case 'altar': this._altarChoose(id); break;
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
    for (const u of stock) this.s.z[this.def(u).deck === 'potion' ? 'potionsDiscard' : 'lootDiscard'].push(u);
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
    this.insert(function again() { this.ask('merchant', { stock: this.s.ctx.stock }); });
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
    this.s.z[d.deck === 'potion' ? 'potionsDiscard' : 'lootDiscard'].push(uid);
    this.emit('sellCard', { uid });
    this.gain('gold', p, 'venta'); this.log(`Vendes ${d.name} por ${p} de oro.`, 'merchant');
    this.clear(); this.insert(function again() { this.ask('merchant', { stock: this.s.ctx.stock }); });
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
    this.insert(function again() { this.ask('merchant', { stock: this.s.ctx.stock }); });
  },
};
