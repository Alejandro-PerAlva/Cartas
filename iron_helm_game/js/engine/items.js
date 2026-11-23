/**
 * IRON HELM · Objetos consumibles, robo de botín/pociones, selección de cartas y operaciones de trama.
 */
import { Game, ACTIONS } from './game.js';

Object.assign(Game.prototype, {
  /* ============================================================================ uso de objetos */
  useItem(uid) {
    if (!this.allItems().includes(uid)) this.fail('No tienes ese objeto.');
    const d = this.def(uid); const pr = this.s.prompt.type;
    const heal = (n) => {
      this.discardOwned(uid, 'use');
      let amount = n;
      if (this.hasCode('T7')) { amount += 2; this.log('Tiara: +2 de salud adicionales.', 'item'); }
      if (this.hasSkill('S16')) { amount += 1; this.log('Entereza: +1 de salud.', 'skill'); }
      this.gain('hp', amount, d.name); this.log(`Bebes ${d.name}: +${amount} de salud.`, 'item');
      this._cureAfflictions(false);
    };
    switch (d.code) {
      case 'L1': this.discardOwned(uid, 'use'); this.gain('energy', 2, d.name); this.log('Comes una ración: +2 de energía.', 'item'); break;
      case 'L5': case 'P1': heal(4); break;
      case 'P2': {
        this.discardOwned(uid, 'use');
        const n = this.hasSkill('S3') ? this.hero.poison : 3;
        this.lose('poison', n, d.name); this.log(`Bebes el antídoto: −${n} de veneno${this.hasSkill('S3') ? ' (Herboristería)' : ''}.`, 'item');
        this._cureAfflictions(true);
        break;
      }
      case 'P6': case 'L20': this.discardOwned(uid, 'use'); this.gain('energy', 2, d.name); this.log(`Bebes ${d.name}: +2 de energía.`, 'item'); break;
      case 'T2': this.discardOwned(uid, 'use'); this.gain('rations', 2, d.name); this.log('Sacas dos raciones adicionales.', 'item'); break;
      case 'T23': this.discardOwned(uid, 'use'); this.gain('energy', 2, d.name); this.gain('hp', 2, d.name); this.log('Comes el hongo: +2 de energía y +2 de salud.', 'item'); break;
      case 'L25': this.discardOwned(uid, 'use'); this.gain('hp', 4, d.name); this.gain('energy', 2, d.name); this.addPoison(1, d.name); this.log('Remedio de Wrenna: +4 salud, +2 energía y +1 veneno.', 'item'); this.checkDeath(); break;
      case 'AT9': { this.discardOwned(uid, 'use'); const r = this.roll(2, 'capsula'); const n = r[0] + r[1]; this.gain('hp', n, d.name); this.log(`Cápsula Corazón: +${n} de salud.`, 'item'); break; }
      case 'T3': case 'L16': {
        if (pr !== 'pair') this.fail('Solo puedes usarlo justo después de robar las dos cartas de mazmorra.');
        if (d.code === 'L16') { if (this.s.lvl.lamp) this.fail('Ya has usado la Lámpara en este nivel.'); this.s.lvl.lamp = true; }
        else this.discardOwned(uid, 'use');
        const z = this.s.z;
        z.pair.forEach((u, i) => this.emit('reveal', { uid: u, slot: i, side: 1, both: true }));
        this.log(`${d.name}: revelas ambas cartas y eliges una.`, 'item');
        this.ask('chooseOne', { uids: z.pair.slice() });
        break;
      }
      default: this.fail(`${d.name} no se usa de esta forma.`);
    }
    if (!this.s.over) this.checkDeath();
  },

  /** Aflicciones (Bestias y Trabas): una poción de salud cura una; un antídoto las cura todas. */
  _cureAfflictions(all) {
    const list = this.hero.afflictions;
    if (!list.length) return;
    if (all || list.length === 1) {
      for (const u of list.splice(0)) { this.s.z.afflictionsDiscard.push(u); this.emit('cureAffliction', { uid: u }); }
      this.log('Te curas de tus aflicciones.', 'affliction');
      return;
    }
    this.insert(function pickAf() { this.ask('pickCards', { title: 'Elige la aflicción que quieres curar', uids: list.slice(), min: 1, max: 1, purpose: 'cureAffliction' }); });
  },

  /* ============================================================================ robar botín / pociones */
  gainLoot(n = 1) {
    const tasks = [];
    for (let i = 0; i < n; i++) tasks.push(function lootOne() { this._lootOne(); });
    this.insert(...tasks);
  },
  _drawLootNoMimic() {
    // Si sale un Mimético hay que combatirlo.
    const uid = this.draw('loot');
    return uid;
  },
  _lootOne() {
    const lucky = this.equippedUid('L18'); // Amuleto de la Suerte
    const first = this.draw('loot');
    if (!first) { this.log('No quedan cartas de botín.', 'inv'); return; }
    if (this.def(first).kind === 'enemy') { this._mimic(first); return; }
    if (lucky && this.s.z.loot.length) {
      const second = this.draw('loot');
      if (second && this.def(second).kind === 'enemy') { this.s.z.lootDiscard.push(second); this.acquireLoot(first); return; }
      this.ask('pickCards', { title: 'Amuleto de la Suerte: elige una carta de botín', uids: [first, second].filter(Boolean), min: 1, max: 1, purpose: 'loot' });
      return;
    }
    this.acquireLoot(first);
  },
  acquireLoot(uid) { this.log(`Robas botín: ${this.def(uid).name}.`, 'inv'); this.acquire(uid); },

  gainPotion(n = 1) {
    const tasks = [];
    for (let i = 0; i < n; i++) tasks.push(function potionOne() { this._potionOne(); });
    this.insert(...tasks);
  },
  _potionOne() {
    const first = this.draw('potions');
    if (!first) { this.log('No quedan pociones.', 'inv'); return; }
    if (this.hasSkill('S2') && this.s.z.potions.length) {
      const second = this.draw('potions');
      this.ask('pickCards', { title: 'Alquimia: elige una poción y descarta la otra', uids: [first, second], min: 1, max: 1, purpose: 'potion' });
      return;
    }
    this.log(`Robas una poción: ${this.def(first).name}.`, 'inv'); this.acquire(first);
  },
  /** Elegir `n` cartas de un mazo concreto (Alquimia inicial, tramas…) */
  _pickFromDeck(deck, n, title) {
    const uids = this.s.z[deck].slice();
    if (!uids.length) return;
    this.ask('pickCards', { title, uids, min: Math.min(n, uids.length), max: Math.min(n, uids.length), purpose: 'deckPick', deck });
  },

  _pickDone(pr, chosen) {
    const z = this.s.z;
    const rest = pr.uids.filter((u) => !chosen.includes(u));
    switch (pr.purpose) {
      case 'plot':
        for (const u of rest) { z.removed.push(u); this.emit('discardCard', { uid: u, why: 'plotDiscard' }); }
        this._startPlot(chosen[0]); break;
      case 'loot':
        for (const u of rest) { z.lootDiscard.push(u); this.emit('discardCard', { uid: u, why: 'unchosen' }); }
        for (const u of chosen) this.acquireLoot(u);
        break;
      case 'potion':
        for (const u of rest) { z.potionsDiscard.push(u); this.emit('discardCard', { uid: u, why: 'unchosen' }); }
        for (const u of chosen) { this.log(`Robas una poción: ${this.def(u).name}.`, 'inv'); this.acquire(u); }
        break;
      case 'drawKeep': // robar N y quedarse con algunas
        for (const u of rest) { z.lootDiscard.push(u); this.emit('discardCard', { uid: u, why: 'unchosen' }); }
        for (const u of chosen) this.acquireLoot(u);
        break;
      case 'deckPick': {
        for (const u of chosen) { z[pr.deck].splice(z[pr.deck].indexOf(u), 1); this.log(`Eliges ${this.def(u).name}.`, 'inv'); this.acquire(u); }
        break;
      }
      case 'discardForBlessing': {
        for (const u of chosen) this.discardOwned(u, 'offering');
        const n = Math.floor(chosen.length / 2);
        if (n) this.gain('blessing', n, 'ofrenda');
        this.log(`Depositas ${chosen.length} carta(s) como ofrenda: ganas ${n} bendición(es).`, 'plot');
        break;
      }
      case 'avoidValue': {
        for (const u of chosen) this.discardOwned(u, 'tribute');
        this.log('Pagas el tributo y evitas el enfrentamiento.', 'combat');
        this._endCombat('avoid'); break;
      }
      case 'cureAffliction': {
        for (const u of chosen) { this.hero.afflictions.splice(this.hero.afflictions.indexOf(u), 1); z.afflictionsDiscard.push(u); this.emit('cureAffliction', { uid: u }); }
        this.log('Te curas de una aflicción.', 'affliction'); break;
      }
      default: throw new Error(`Selección desconocida: ${pr.purpose}`);
    }
  },

  /* ============================================================================ operaciones de trama */
  applyOps(ops, src) {
    this.insert(...(ops || []).map((op) => function opTask() { this._op(op, src); }));
  },
  _op(op, src) {
    const [name, a, b] = op;
    const z = this.s.z; const h = this.hero;
    switch (name) {
      case 'gain': if (a === 'poison') { this.addPoison(b, src?.name); this.log(`Ganas ${b} ficha(s) de veneno.`, 'plot'); this.checkDeath(); } else this.gain(a, b, src?.name); break;
      case 'lose': case 'pay': this.lose(a, b, src?.name); if (a === 'hp') this.checkDeath(); break;
      case 'morality': this.addMorality(a); break;
      case 'loot': this.gainLoot(a); break;
      case 'potion': this.gainPotion(a); break;
      case 'plot': this.drawPlot({ extra: true }); break;
      case 'blessingByMorality': {
        const n = Math.max(0, this.morality());
        this.log(`Tu moral (${this.morality()}) te concede ${n} ficha(s) de bendición.`, 'plot');
        if (n) this.gain('blessing', n, src?.name); break;
      }
      case 'healthOrEnergyByMorality': {
        const n = Math.max(0, this.morality());
        if (!n) { this.log('Tu moral no es positiva: no ganas nada.', 'plot'); break; }
        this.ask('choice', { title: src?.name, text: `Ganas ${n} de salud o de energía.`, scene: 'generic',
          options: [{ id: 'hp', label: `+${n} de salud`, text: '' }, { id: 'energy', label: `+${n} de energía`, text: '' }],
          onChoose: (id) => { this.gain(id, n, src?.name); this.log(`Ganas ${n} de ${id === 'hp' ? 'salud' : 'energía'}.`, 'plot'); } });
        break;
      }
      case 'gamble': this._gamble(0); break;
      case 'removeEnemy': {
        const code = a; let n = 0;
        z.enemies = z.enemies.filter((u) => { if (this.def(u).code === code) { z.removed.push(u); n++; return false; } return true; });
        z.enemiesDiscard = z.enemiesDiscard.filter((u) => { if (this.def(u).code === code) { z.removed.push(u); n++; return false; } return true; });
        if (n) this.log(`Los ${this.cat.byCode.get(code)?.name || code} te ignoran a partir de ahora.`, 'plot');
        break;
      }
      case 'pickLoot': {
        const uids = []; let guard = 0;
        while (uids.length < a && guard++ < 30) { const u = this.draw('loot'); if (!u) break; if (this.def(u).kind === 'enemy') { z.loot.push(u); continue; } uids.push(u); }
        if (uids.length) this.ask('pickCards', { title: `Roba ${a} cartas de botín y quédate con una`, uids, min: 1, max: 1, purpose: 'drawKeep' });
        break;
      }
      case 'pickPotionFromDeck': this._pickFromDeck('potions', 1, 'Elige una poción del mazo'); break;
      case 'discardForBlessing': {
        const items = this.allItems();
        if (!items.length) { this.log('No tienes nada que ofrendar.', 'plot'); break; }
        this.ask('pickCards', { title: 'Elige las cartas que dejas como ofrenda (1 bendición por cada dos)', uids: items, min: 0, max: items.length, purpose: 'discardForBlessing' });
        break;
      }
      case 'clerigaGift': {
        const m = this.morality();
        if (m > 0) { this.lose('poison', m, 'clériga'); this.log(`La clériga te cura ${Math.min(m, h.poison + m)} ficha(s) de veneno.`, 'plot'); }
        if (this.hasCode('T16')) { this.log('Ya tienes el Broche: recibes una poción y una bendición.', 'plot'); this.gainPotion(1); this.gain('blessing', 1, 'clériga'); }
        else if (m >= 3) {
          const uid = this._takeFromDeck('trappings', 't16');
          if (uid) { this.log('La clériga te concede el Broche de la Penitencia.', 'plot'); this.acquire(uid); }
        } else this.log('Tu moral no es suficiente para recibir el Broche.', 'plot');
        break;
      }
      case 'dieTable': {
        const d = this.rollOne('tabla');
        const row = a.find((r) => r[0] === d);
        this.log(`Tiras un d6: ${d}.`, 'plot');
        if (row) this.applyOps(row[1], src);
        break;
      }
      case 'curePoison': this.lose('poison', h.poison, src?.name); this.log('Te curas todo el veneno.', 'plot'); break;
      case 'espejo': {
        const d = this.rollOne('espejo');
        this.log(`Atraviesas el espejo: ${d}.`, 'plot');
        if (d <= 2) this._drawAndFight({ source: 'espejo', ambush: 'normal', hpBonus: this.s.level, initialBonus: 0 });
        else if (d <= 4) { h.carryBonus += 1; this.log('Te sientes más corpulento: tu valor máximo de carga aumenta en 1.', 'plot'); }
        else {
          const skip = (arr) => arr.splice(0, 4);
          if (this.s.ctx.endOfLevel) { this.s.game.skipNext = 4; this.log('Descartarás las cuatro primeras cartas del siguiente nivel.', 'plot'); }
          else { const cards = skip(z.dungeon); z.dungeonDiscard.push(...cards); this.log('Descartas las cuatro siguientes cartas de mazmorra sin mirarlas.', 'plot'); }
        }
        break;
      }
      default: throw new Error(`Operación de trama desconocida: ${name}`);
    }
  },
  _gamble(won) {
    const h = this.hero;
    const can = h.gold >= 1 && won < 5;
    if (!can) { if (won >= 5) this.log('Has ganado demasiado: te echan a patadas de la taberna.', 'plot'); return; }
    this.ask('choice', { title: 'Posada de Hidd', text: `Gasta 1 de oro para jugar (beneficio hasta ahora: ${won}).`, scene: 'generic',
      options: [{ id: 'play', label: 'Jugar (1 de oro)', text: 'Tira 1d6: 1-4 pierdes el oro, 5 ganas 1, 6 ganas 2.' }, { id: 'leave', label: 'Marcharte', text: '' }],
      onChoose: (id) => {
        if (id !== 'play') return;
        this.lose('gold', 1, 'apuesta');
        const d = this.rollOne('apuesta');
        if (d <= 4) { this.log(`Sacas ${d}: pierdes tu oro.`, 'plot'); this.insert(function again() { this._gamble(won - 0); }); }
        else { const g = d === 5 ? 1 : 2; this.gain('gold', 1 + g, 'apuesta'); this.log(`Sacas ${d}: recuperas tu moneda y ganas ${g} de oro.`, 'plot'); this.insert(function again() { this._gamble(won + g); }); }
      } });
  },
});

