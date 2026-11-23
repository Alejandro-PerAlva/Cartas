/**
 * IRON HELM · Objetos consumibles, robo de botín/pociones/artefactos, selección de cartas y operaciones de trama.
 */
import { Game } from './game.js';

const inRow = (row, v) => (Array.isArray(row) ? row.includes(v) : row === v);
/** claves de carta con uso activo (`useItem`) y cuándo se pueden usar */
export const USE_KEYS = {
  L1: 'free', L5: 'free', P1: 'free', P2: 'free', P6: 'free', L20: 'free', T2: 'free', T23: 'free', L25: 'free', AT9: 'free',
  T19: 'free', L46: 'free', T26: 'free', T29: 'free', L26: 'free', L32: 'free', T3: 'pair', L16: 'pair',
  // ANEMIA 4.0: Sangre de Lobo se bebe cuando quieras; las demás pociones y La Bomba de Dios solo durante un combate ('combat')
  ANP1: 'free', ANP2: 'combat', ANP3: 'combat', ANP4: 'combat', ANT3: 'combat',
};
const USE_PROMPTS = ['turn', 'setup', 'attack', 'pre', 'avoidCard'];

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
      const extra = this.sumFx('healBonus'); // Mortero y Maja, Matilda
      if (extra) { amount += extra; this.log(`+${extra} de salud adicional con la poción.`, 'item'); }
      this.gain('hp', amount, d.name); this.log(`Bebes ${d.name}: +${amount} de salud.`, 'item');
      this._cureAfflictions(false);
    };
    switch (d.key) {
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
        if (d.key === 'L16') { if (this.s.lvl.lamp) this.fail('Ya has usado la Lámpara en este nivel.'); this.s.lvl.lamp = true; }
        else this.discardOwned(uid, 'use');
        const z = this.s.z;
        z.pair.forEach((u, i) => this.emit('reveal', { uid: u, slot: i, side: 1, both: true }));
        this.log(`${d.name}: revelas ambas cartas y eliges una.`, 'item');
        this.ask('chooseOne', { uids: z.pair.slice() });
        break;
      }
      // --- expansiones ---
      case 'T19': this.discardOwned(uid, 'use'); this.gain('energy', 3, d.name); this.log('Brebaje de Hulnot: +3 de energía.', 'item'); break;
      case 'L46': this.discardOwned(uid, 'use'); this.gain('hp', 3, d.name); this.gain('energy', 3, d.name); this.lose('poison', 2, d.name); this.log('Elixir de Helgen: +3 de salud, +3 de energía y −2 de veneno.', 'item'); break;
      case 'T26': {
        if (this.s.cards[uid].empty) this.fail('La Petaca está vacía: se rellena en el Campamento.');
        this.s.cards[uid].empty = true; this.gain('hp', 2, d.name); this.log('Bebes de la Petaca: +2 de salud.', 'item');
        this.emit('cardState', { uid, empty: true });
        break;
      }
      case 'T29': {
        const n = this.hero.blessings.length;
        this.discardOwned(uid, 'use'); this.loseBlessing(n, d.name); this.gain('energy', n, d.name);
        this.log(`Pan de Bruja: descartas ${n} bendición(es) y ganas ${n} de energía.`, 'item');
        break;
      }
      case 'L26': { // Diario de Mizlak: revela 5 de botín, descarta las que quieras y devuelve el resto encima
        if (!FREE_USE.includes(pr)) this.fail('Solo puedes usarlo entre turnos.');
        this.discardOwned(uid, 'use');
        const z = this.s.z; const top = [];
        for (let i = 0; i < 5; i++) { const u = this.draw('loot'); if (u) top.push(u); }
        this.log(`Diario de Mizlak: revelas ${top.length} cartas de botín.`, 'item');
        if (!top.length) break;
        this.s.prompt = null;
        this.ask('pickCards', { title: 'Diario de Mizlak: elige las cartas de botín que descartas (el resto vuelve encima del mazo)', uids: top, min: 0, max: top.length, purpose: 'diary', back: true });
        void z;
        break;
      }
      case 'L32': { // Sello de Zogar: mirar el descarte del mazo de mazmorra (una vez por nivel)
        if (this.s.lvl.seal) this.fail('Ya has usado el Sello de Zogar en este nivel.');
        this.s.lvl.seal = true;
        const uids = this.s.z.dungeonDiscard.slice();
        this.emit('peekCards', { uids, deck: 'dungeonDiscard' });
        this.log(`Sello de Zogar: el descarte de mazmorra contiene ${uids.length ? uids.map((u) => this.def(u).name).join(', ') : 'nada'}.`, 'item');
        break;
      }
      default: if (!this._anemiaUse?.(d, uid, pr)) this.fail(`${d.name} no se usa de esta forma.`);
    }
    if (!this.s.over) this.checkDeath();
  },

  /**
   * ¿Tiene este objeto un uso activo AHORA? Lo consulta la interfaz para ofrecer «USAR».
   * Devuelve `null` o `{ when: 'free' | 'pair' }` (`pair` = solo justo después de robar las dos cartas).
   * Las expansiones añaden sus claves en `USE_KEYS` (arriba del fichero) o con `fx.use` en la carta.
   */
  usableNow(uid) {
    if (!this.s.prompt || !this.allItems().includes(uid)) return null;
    const d = this.def(uid); const pr = this.s.prompt.type;
    const when = USE_KEYS[d.key] || (d.fx?.use ? 'free' : null);
    if (!when) return null;
    if (when === 'pair') return pr === 'pair' && !(d.key === 'L16' && this.s.lvl.lamp) ? { when } : null;
    if (when === 'combat') return this.s.combat && ['attack', 'pre'].includes(pr) && !(d.key === 'ANP4' && this.s.combat.boss) ? { when } : null;
    if (!USE_PROMPTS.includes(pr)) return null;
    if (d.key === 'T26' && this.s.cards[uid].empty) return null;
    if (d.key === 'L32' && this.s.lvl.seal) return null;
    return { when };
  },

  /** Aflicciones (Bestias y Trabas): una poción de salud cura una; un antídoto las cura todas. */
  _cureAfflictions(all) {
    const list = this.hero.afflictions;
    if (!list.length) return;
    if (all || list.length === 1) {
      for (const u of list.splice(0)) { this.s.z.afflictionsDiscard.push(u); this.emit('cureAffliction', { uid: u }); this._afflictionCured?.(u); }
      this.log('Te curas de tus aflicciones.', 'affliction');
      return;
    }
    this.insert(function pickAf() { if (list.length) this.ask('pickCards', { title: 'Elige la aflicción que quieres curar', uids: list.slice(), min: 1, max: 1, purpose: 'cureAffliction' }); }); // (un antídoto pudo curarlas antes)
  },

  /** cartas que se resuelven en cuanto se roban (ya están en su pila de descarte) */
  _instantItem(uid) {
    const d = this.def(uid);
    if (d.key === 'L27') {
      this.ask('choice', { title: d.name, source: uid, text: d.text, scene: 'ops', options: [
        { id: 'loot', label: 'Botín, poción y ración', text: 'Roba 1 carta de botín, 1 poción y gana 1 ración.', ops: [['loot', 1], ['potion', 1], ['gain', 'rations', 1]] },
        { id: 'gold', label: 'Oro y ración', text: 'Ganas d6 de oro y 1 ración.', ops: [['gainDie', 'gold'], ['gain', 'rations', 1]] }] });
    } else if (d.key === 'AT8') {
      const n = this.rollOne('boñiga'); this.gain('gold', n, d.name); this.log(`Boñiga de Dragón: encuentras ${n} monedas de oro.`, 'item');
    }
  },

  /* ============================================================================ robar botín / pociones / artefactos */
  gainLoot(n = 1) {
    n = this._impCut ? this._impCut('loot', n) : n; // El Diablillo
    const tasks = [];
    for (let i = 0; i < n; i++) tasks.push(function lootOne() { this._lootOne(); });
    this.insert(...tasks);
  },
  _drawLootNoMimic() {
    // Si sale un Mimético hay que combatirlo.
    const uid = this.draw('loot');
    return uid;
  },
  /** Terreno y Reliquias: coste en bendiciones del siguiente artefacto (1, 2, 3… acumulado en la partida) */
  nextArtifactCost() { return (this.s.artifactsBought || 0) + 1; },
  canBuyArtifact() {
    if (!this.cat.extras.artifacts) return false;
    const z = this.s.z;
    return z.artifacts.length + z.artifactsDiscard.length > 0 && this.hero.blessings.length >= this.nextArtifactCost();
  },
  _buyArtifact() {
    const cost = this.nextArtifactCost();
    const uid = this.draw('artifacts');
    if (!uid) { this._lootDraw(); return; }
    this.loseBlessing(cost, 'artefacto');
    this.s.artifactsBought = (this.s.artifactsBought || 0) + 1;
    this.emit('artifactPaid', { uid, cost });
    this.log(`Pagas ${cost} bendición(es) y robas el artefacto ${this.def(uid).name}.`, 'inv');
    this.acquire(uid);
  },
  _lootOne() {
    if (this.canBuyArtifact()) {
      const cost = this.nextArtifactCost();
      this.ask('choice', { title: 'Robar botín', text: `Puedes pagar ${cost} ficha(s) de bendición para robar un artefacto en vez de una carta de botín.`, scene: 'generic', artifact: true,
        options: [{ id: 'loot', label: 'Carta de botín', text: 'Robas la carta superior del mazo de botín.' },
          { id: 'artifact', label: `Artefacto (${cost} bendición${cost > 1 ? 'es' : ''})`, text: 'Robas un artefacto aleatorio.' }],
        onChoose: (id) => { if (id === 'artifact') this._buyArtifact(); else this._lootDraw(); } });
      return;
    }
    this._lootDraw();
  },
  _lootDraw() {
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
    n = this._impCut ? this._impCut('potions', n) : n; // El Diablillo
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
  _pickFromDeck(deck, n, title, filter = null) {
    const uids = this.s.z[deck].filter((u) => !filter || filter(u));
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
        if (pr.reshuffle) z[pr.deck] = this.rng.shuffle(z[pr.deck]);
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
        for (const u of chosen) { this.hero.afflictions.splice(this.hero.afflictions.indexOf(u), 1); z.afflictionsDiscard.push(u); this.emit('cureAffliction', { uid: u }); this._afflictionCured?.(u); }
        this.log('Te curas de una aflicción.', 'affliction'); break;
      }
      // --- expansiones ---
      case 'scepter': case 'wild': // El Cetro / Encuentro Salvaje (empate): combatir al elegido
        for (const u of rest) { z.enemiesDiscard.push(u); this.emit('discardCard', { uid: u, why: 'unchosen' }); }
        this._fightDrawn(chosen[0], pr.opts); break;
      case 'destroy': // Dragón de Cristal
        for (const u of chosen) { this.log(`El objeto ${this.def(u).name} queda destruido.`, 'combat'); this.destroyOwned(u, 'destroyed'); }
        break;
      case 'diary': // Diario de Mizlak
        for (const u of chosen) { z.lootDiscard.push(u); this.emit('discardCard', { uid: u, why: 'diary' }); }
        z.loot.unshift(...rest);
        this.log(`Descartas ${chosen.length} carta(s) y devuelves ${rest.length} encima del mazo de botín.`, 'item');
        break;
      case 'lighten': // El Viejo Puente
        for (const u of chosen) this.discardOwned(u, 'bridge');
        this.insert(function lightenAgain() { this._op(['lightenTo', pr.target], null); });
        break;
      case 'discardItem':
        for (const u of chosen) { this.log(`Descartas ${this.def(u).name}.`, 'plot'); this.discardOwned(u, 'plot'); }
        break;
      case 'feedFire': { // Columna de Fuego: descarta un enemigo derrotado sin gastar y gana su oro
        const e = z.graveyard.find((x) => x.uid === chosen[0]);
        z.graveyard.splice(z.graveyard.indexOf(e), 1); z.enemiesDiscard.push(e.uid);
        this.emit('discardCard', { uid: e.uid, why: 'fire' });
        const n = this.def(e.uid).purse || 0;
        this.log(`Arrojas ${this.def(e.uid).name} a las llamas: ganas ${n} de oro.`, 'plot');
        if (n) this.gain('gold', n, 'columna de fuego');
        this.lose('energy', 1, 'columna de fuego');
        break;
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
    const z = this.s.z; const h = this.hero; const lvl = this.s.level;
    switch (name) {
      case 'gain': if (a === 'poison') { this.addPoison(b, src?.name); this.log(`Ganas ${b} ficha(s) de veneno.`, 'plot'); this.checkDeath(); } else this.gain(a, b, src?.name); break;
      case 'lose': case 'pay': this.lose(a, b, src?.name); if (a === 'hp') this.checkDeath(); break;
      case 'gainDie': { const n = this.rollOne('tesoro'); this.gain(a, n, src?.name); this.log(`Ganas ${n} de ${a === 'gold' ? 'oro' : a}.`, 'explore'); break; }
      case 'morality': this.addMorality(a); break;
      case 'eyes': this.addEyes(a); this._checkEyes(); break;
      case 'loot': this.gainLoot(a); break;
      case 'potion': this.gainPotion(a); break;
      case 'plot': this.drawPlot({ extra: true }); break;
      case 'blessingByMorality': {
        const n = Math.max(0, this.morality());
        this.log(`Tu moral (${this.morality()}) te concede ${n} ficha(s) de bendición.`, 'plot');
        if (n) this.gain('blessing', n, src?.name); break;
      }
      case 'blessingByLevel': this.log(`Ganas ${lvl} ficha(s) de bendición (nivel de la mazmorra).`, 'plot'); this.gain('blessing', lvl, src?.name); break;
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
        z.enemies = z.enemies.filter((u) => { if (this.def(u).key === code) { z.removed.push(u); n++; return false; } return true; });
        z.enemiesDiscard = z.enemiesDiscard.filter((u) => { if (this.def(u).key === code) { z.removed.push(u); n++; return false; } return true; });
        if (n) this.log(`Los ${this.cat.byCode.get(code)?.name || code} te ignoran a partir de ahora.`, 'plot');
        break;
      }
      case 'removeMimic': { // Venganza: retira al mimético del mazo de botín y vuelve a barajarlo
        let n = 0;
        for (const k of ['loot', 'lootDiscard']) z[k] = z[k].filter((u) => { if (this.def(u).key === a) { z.removed.push(u); n++; return false; } return true; });
        z.loot = this.rng.shuffle(z.loot);
        this.log(n ? 'Detectas al mimético y lo retiras del mazo de botín.' : 'No queda ningún mimético en el mazo de botín.', 'plot');
        break;
      }
      case 'pickLoot': {
        if (this._impCut?.('loot', 1) === 0) break;
        const uids = []; let guard = 0;
        while (uids.length < a && guard++ < 30) { const u = this.draw('loot'); if (!u) break; if (this.def(u).kind === 'enemy') { z.loot.push(u); continue; } uids.push(u); }
        if (uids.length) this.ask('pickCards', { title: `Roba ${a} cartas de botín y quédate con una`, uids, min: 1, max: 1, purpose: 'drawKeep' });
        break;
      }
      case 'pickPotionFromDeck': if (this._impCut?.('potions', 1) === 0) break; this._pickFromDeck('potions', 1, 'Elige una poción del mazo'); break;
      case 'lootSearch': { // La Estatua con Alas (4/5): coge la carta de botín que quieras y baraja
        if (this._impCut?.('loot', 1) === 0) break;
        const cand = z.loot.filter((u) => this.def(u).kind === 'item');
        if (!cand.length) { this.log('El mazo de botín está vacío.', 'plot'); break; }
        this.ask('pickCards', { title: 'Elige la carta de botín que quieras', uids: cand, min: 1, max: 1, purpose: 'deckPick', deck: 'loot', reshuffle: true });
        break;
      }
      case 'discardForBlessing': {
        const items = this.allItems();
        if (!items.length) { this.log('No tienes nada que ofrendar.', 'plot'); break; }
        this.ask('pickCards', { title: 'Elige las cartas que dejas como ofrenda (1 bendición por cada dos)', uids: items, min: 0, max: items.length, purpose: 'discardForBlessing' });
        break;
      }
      case 'discardItem': {
        const items = this.allItems().filter((u) => !this.def(u).fx?.cursed);
        if (!items.length) { this.log('No tienes objetos que descartar.', 'plot'); break; }
        this.ask('pickCards', { title: 'Descarta un objeto de tu inventario', uids: items, min: 1, max: 1, purpose: 'discardItem' });
        break;
      }
      case 'lightenTo': { // El Viejo Puente: descarta objetos hasta una carga máxima de n
        if (this.weight() <= a) { this.log(`Tu carga (${this.weight()}) ya no supera ${a}.`, 'plot'); break; }
        const items = this.allItems().filter((u) => !this.def(u).fx?.cursed);
        if (!items.length) break;
        this.ask('pickCards', { title: `Descarta objetos hasta que tu carga no supere ${a} (ahora ${this.weight()})`, uids: items, min: 1, max: items.length, purpose: 'lighten', target: a });
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
        const row = a.find((r) => inRow(r[0], d));
        this.log(`Tiras un d6: ${d}.`, 'plot');
        if (row) this.applyOps(row[1], src);
        break;
      }
      case 'dieParity': { // Comida Sospechosa
        const d = this.rollOne('tabla');
        this.log(`Tiras un d6: ${d} (${d % 2 ? 'impar' : 'par'}).`, 'plot');
        this.applyOps(d % 2 ? b : a, src);
        break;
      }
      case 'moralityTable': {
        const m = Math.max(-5, Math.min(5, this.morality()));
        const row = a.find((r) => inRow(r[0], m));
        this.log(`Tu moral es ${m > 0 ? '+' : ''}${m}.`, 'plot');
        if (row) this.applyOps(row[1], src);
        break;
      }
      case 'loseAllBlessings': { const n = this.hero.blessings.length; this.loseBlessing(n, src?.name); this.log(`Pierdes todas tus fichas de bendición (${n}).`, 'plot'); break; }
      case 'loseLevelHp': this.lose('hp', lvl, src?.name); this.log(`Pierdes ${lvl} de salud.`, 'plot'); this.checkDeath(); break;
      case 'curePoison': this.lose('poison', h.poison, src?.name); this.log('Te curas todo el veneno.', 'plot'); break;
      case 'fight': { // roba un enemigo y combate con los ajustes de la carta
        const o = a || {};
        this._drawAndFight({ source: o.source || 'plot', ambush: o.ambush || 'normal', hpBonus: (o.hpBonus || 0) + (o.hpLevel ? this.eLvl() : 0), initialBonus: o.initialBonus || 0, onWin: o.onWin || null });
        break;
      }
      case 'fightRandom': this.log('¡Aparece un enemigo!', 'plot'); this._drawAndFight({ source: 'plot', ambush: 'normal', hpBonus: this.eLvl(), initialBonus: 0 }); break;
      case 'randomSkill': { // El Viejo Libro
        const cand = z.skills.filter((u) => !h.skills.includes(this.s.cards[u].id));
        if (!cand.length) { this.log('No quedan habilidades por aprender.', 'plot'); break; }
        const u = cand[this.rng.int(cand.length)]; const id = this.s.cards[u].id;
        this._learnSkillFree(id);
        this.log(`Aprendes la habilidad ${this.cat.def(id).name}.`, 'skill');
        if (this.cat.def(id).key === 'S2') this._grantAlchemy();
        break;
      }
      case 'feedFire': {
        const uids = this.unspentEnemies().map((e) => e.uid);
        if (!uids.length) { this.log('No tienes enemigos derrotados sin gastar.', 'plot'); break; }
        this.ask('pickCards', { title: 'Elige el enemigo derrotado que arrojas al fuego', uids, min: 1, max: 1, purpose: 'feedFire' });
        break;
      }
      case 'climb': { // La Pendiente Resbaladiza: se repite hasta sacar un 6
        const d = this.rollOne('escalar');
        this.log(`Escalas: sacas ${d}.`, 'plot');
        if (d === 1) { this.lose('hp', lvl + 2, 'caída'); this.log(`Te resbalas y caes: pierdes ${lvl + 2} de salud.`, 'plot'); if (this.checkDeath()) break; }
        else if (d <= 3) { this.lose('energy', 1, 'escalar'); this.log('Pierdes el equilibrio: −1 de energía.', 'plot'); }
        else if (d <= 5) { this.gain('gold', 1, 'escalar'); this.log('Encuentras 1 moneda de oro entre las rocas.', 'plot'); }
        else {
          this.log(`¡Llegas a la cima! Ganas ${lvl} de oro, 1 botín y 1 poción.`, 'plot');
          this.gain('gold', lvl, 'cima'); this.gainLoot(1); this.gainPotion(1);
          break;
        }
        this.ask('choice', { title: src?.name || 'La Pendiente Resbaladiza', source: null, text: 'Puedes seguir escalando hasta que saques un 6.', scene: 'ops',
          options: [{ id: 'climb', label: 'Seguir escalando', text: 'Vuelve a tirar 1d6.', ops: [['climb']] }, { id: 'stop', label: 'Marcharte', text: '', ops: [] }] });
        break;
      }
      case 'sellBlessings': { // El Maligno
        const n = this.hero.blessings.length;
        this.ask('choice', { title: src?.name || 'El Maligno', text: 'Puedes cambiar 1 bendición por 2 de oro o 1 ración, o 2 bendiciones por 1 poción.', scene: 'ops',
          options: [
            { id: 'gold', label: '1 bendición → 2 de oro', text: '', ops: [['pay', 'blessing', 1], ['gain', 'gold', 2]], disabled: n < 1, reason: 'Sin bendiciones' },
            { id: 'ration', label: '1 bendición → 1 ración', text: '', ops: [['pay', 'blessing', 1], ['gain', 'rations', 1]], disabled: n < 1, reason: 'Sin bendiciones' },
            { id: 'potion', label: '2 bendiciones → 1 poción', text: '', ops: [['pay', 'blessing', 2], ['potion', 1]], disabled: n < 2, reason: 'Necesitas 2 bendiciones' },
            { id: 'none', label: 'No vender', text: '', ops: [] }] });
        break;
      }
      case 'altarBlessing': {
        let n = 1;
        if (this.hasSkill('S4')) n = 2;
        if (this.hasCode('T16')) n = Math.max(n, 2);
        n += this.envFx().altarBlessings || 0;
        const got = this.gain('blessing', n, 'altar'); this.log(`Rezas en el altar: ganas ${got} ficha(s) de bendición.`, 'altar');
        break;
      }
      case 'altarCure': {
        const [x, y] = this.roll(2, 'altar');
        const n = Math.abs(x - y);
        this.lose('poison', n, 'altar'); this.log(`El altar te cura ${n} ficha(s) de veneno (d6−d6).`, 'altar');
        break;
      }
      case 'espejo': {
        const d = this.rollOne('espejo');
        this.log(`Atraviesas el espejo: ${d}.`, 'plot');
        if (d <= 2) this._drawAndFight({ source: 'espejo', ambush: 'normal', hpBonus: this.eLvl(), initialBonus: 0 });
        else if (d <= 4) { h.carryBonus += 1; this.log('Te sientes más corpulento: tu valor máximo de carga aumenta en 1.', 'plot'); }
        else {
          const skip = (arr) => arr.splice(0, 4);
          if (this.s.ctx.endOfLevel) { this.s.game.skipNext = 4; this.log('Descartarás las cuatro primeras cartas del siguiente nivel.', 'plot'); }
          else { const cards = skip(z.dungeon); z.dungeonDiscard.push(...cards); this.log('Descartas las cuatro siguientes cartas de mazmorra sin mirarlas.', 'plot'); }
        }
        break;
      }
      default: if (!this._opAnemia?.(op, src)) throw new Error(`Operación de trama desconocida: ${name}`);
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

const FREE_USE = ['turn', 'setup'];
