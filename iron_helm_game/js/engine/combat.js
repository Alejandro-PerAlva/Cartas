/**
 * IRON HELM · Combate.
 *
 * Secuencia (reglamento): salud del enemigo = base + nivel (+ ajuste de la carta) → daño inicial del enemigo
 * (2d6: mayor − menor + daño base; dobles = falla; se resta la armadura) → turno del héroe (gasta hasta 3 de
 * energía, 1d6 por ficha; sin energía, un puñetazo de 1) → contraataque (misma fórmula) → …
 */
import { Game, ACTIONS } from './game.js';

const WK = { fire: 'fuego', ice: 'hielo', undead: 'no muerto' };
export const weaknessName = (w) => WK[w] || w;

Object.assign(Game.prototype, {
  /* ============================================================================ cartas que provocan combate */
  _combatCard(uid, d, side) {
    const lvl = this.s.level;
    const opts = { source: 'dungeon', cardKind: d.kind, side, ambush: 'normal', hpBonus: lvl, initialBonus: 0 };
    if (d.kind === 'ambush') {
      if (side === 1) Object.assign(opts, { ambush: 'player', hpBonus: lvl });
      else Object.assign(opts, { ambush: 'enemy', hpBonus: lvl + 4, initialBonus: lvl });
    } else Object.assign(opts, { ambush: 'normal', hpBonus: lvl + (side === 1 ? 2 : 4) });

    const options = [];
    const wedge = this.equippedUid('T6');
    if (wedge) options.push({ id: 'wedge', uid: wedge, label: 'Cuña de Puerta', text: 'Descarta la cuña para evitar el encuentro.' });
    if (d.kind === 'ambush' && this.hasCode('L15') && !this.s.lvl.ring)
      options.push({ id: 'ring', uid: this.equippedUid('L15'), label: 'Anillo Mágico', text: 'Evita esta emboscada (una vez por nivel).' });
    if (d.kind === 'skirmish') {
      if (this.hasCode('T12') && !this.s.lvl.vest)
        options.push({ id: 'vest', uid: this.equippedUid('T12'), label: 'Vestiduras', text: 'Evita esta escaramuza (una vez por nivel).' });
      if (this.hasSkill('S5') && !this._skillBlocked('S5'))
        options.push({ id: 'hide', label: 'Ocultación', text: 'Tira 1d6: 5-6 evitas el combate; 1-2 suma 2 al daño inicial.' });
    }
    if (options.length) this.ask('avoidCard', { uid, kind: d.kind, options, opts });
    else this._drawAndFight(opts);
  },
  /** habilidades anuladas por el equipo (Armadura de Escamas anula Ocultación y Sombra) */
  _skillBlocked(code) {
    return this.activeSources().some((x) => x.def.fx?.noSkills?.includes(code));
  },

  _drawAndFight(opts) {
    const uid = this.draw('enemies');
    if (!uid) { this.log('No quedan enemigos en el mazo.', 'combat'); return; }
    const d = this.def(uid);
    if (d.power?.trap) {
      this.emit('trap', { uid });
      if (opts.ambush === 'player') this.log(`${d.name}: lo evitas por haber visto la emboscada.`, 'combat');
      else { const [a, b] = this.roll(2, 'trap'); const n = Math.abs(a - b); this.log(`${d.name}: pierdes ${n} de salud.`, 'combat'); this.lose('hp', n, 'trampa'); this.checkDeath(); }
      this.s.z.enemiesDiscard.push(uid);
      return;
    }
    this.startCombat(uid, opts);
  },

  /* ============================================================================ inicio / fin */
  startCombat(uid, opts = {}) {
    const d = this.def(uid);
    const lvl = this.s.level;
    if (this.hasAffliction('AF3') && d.weakness === 'undead') {
      if (opts.boss) { this.endGame('defeat', 'Necrofobia: huyes del jefe no muerto.'); return; }
      const dmg = (d.damage || 0) + lvl;
      this.log(`Necrofobia: huyes de ${d.name} y sufres ${dmg} de daño.`, 'affliction');
      this.lose('hp', dmg, 'necrofobia'); this.s.z.enemiesDiscard.push(uid); this.checkDeath();
      return;
    }
    const c = {
      uid, name: d.name, power: { ...(d.power || {}) }, weakness: d.weakness, damage: d.damage, purse: d.purse || 0, treasure: d.treasure || 0,
      hp: d.health + (opts.hpBonus || 0), maxHp: d.health + (opts.hpBonus || 0), ambush: opts.ambush || 'normal', initialBonus: opts.initialBonus || 0,
      boss: !!opts.boss, plot: !!opts.plot, source: opts.source || 'dungeon', round: 1, nextCost: 0, blockInitial: false, mimic: opts.source === 'mimic',
    };
    this.s.combat = c;
    this.emit('combatStart', { uid, hp: c.hp, maxHp: c.maxHp, ambush: c.ambush, boss: c.boss });
    this.log(`¡Combate contra ${d.name}! Salud ${c.hp}${c.ambush === 'player' ? ' · tienes la iniciativa' : c.ambush === 'enemy' ? ' · el enemigo te sorprende' : ''}.`, 'combat');
    this.insert(this._cAvoidEnemy, this._cPre, this._cInitial, this._cPlayerTurn);
  },

  _endCombat(result) {
    const c = this.s.combat;
    if (!c) return;
    this.s.combat = null;
    this.emit('combatEnd', { result, uid: c.uid, boss: c.boss });
    if (result === 'win' && c.boss) { this.victory(); return; }
    if (result === 'avoid') {
      if (c.plot) this._plotEyes(c.uid);
      else this.s.z[c.mimic ? 'lootDiscard' : 'enemiesDiscard'].push(c.uid);
    } else if (result === 'win' && c.plot) this._plotEyes(c.uid);
  },

  /* ============================================================================ evitar al enemigo */
  _cAvoidEnemy() {
    const c = this.s.combat; if (!c || c.defeated) return;
    const pw = c.power; const options = [];
    if (pw.avoid) {
      for (const [res, n] of Object.entries(pw.avoid)) {
        const have = res === 'gold' ? this.hero.gold : this.hero.rations;
        options.push({ id: `pay_${res}`, label: `Gastar ${n} ${res === 'gold' ? 'de oro' : n === 1 ? 'ración' : 'raciones'}`, disabled: have < n, reason: 'No te alcanza', res, n });
      }
    }
    if (pw.avoidDiscardValue) {
      const val = this._ownedValue();
      options.push({ id: 'discardValue', label: `Descartar cartas por valor ${pw.avoidDiscardValue}+`, disabled: val < pw.avoidDiscardValue, reason: 'Valor insuficiente', n: pw.avoidDiscardValue });
    }
    if (options.some((o) => !o.disabled)) this.ask('avoidEnemy', { options, name: c.name });
  },
  _ownedValue() { return this.allItems().reduce((n, u) => n + (this.def(u).price || 0), 0); },

  /* ============================================================================ antes del daño inicial */
  _preOptions() {
    const c = this.s.combat; const opts = [];
    const mw = this.mainWeapon();
    const initialComing = c.ambush !== 'player' && !c.power.noInitial && !c.blockInitial;
    if (initialComing && this.hasSkill('S12') && mw)
      opts.push({ id: 'bloquear', label: 'Bloquear', text: 'Tira 1d6: 5-6 evitas todo el daño inicial; 1 rompe tu arma principal.' });
    if (c.ambush === 'player' && this.hasSkill('S8') && mw?.def.fx?.dagger && !this._skillBlocked('S8') && !c.usedSombra)
      opts.push({ id: 'sombra', label: 'Sombra', text: 'Infliges d6 de daño antes del daño inicial.' });
    const shuriken = this.equippedUid('L19');
    if (shuriken) opts.push({ id: 'shuriken', uid: shuriken, label: 'Shuriken', text: 'Descártalo para infligir d6 de daño.' });
    if (c.power.killWithLight) {
      const torch = this.equippedUid('T3');
      if (torch) opts.push({ id: 'light_torch', uid: torch, label: 'Antorcha', text: 'Descarta la antorcha para derrotar al Morlock.' });
      else if (this.hasCode('L16') && !this.s.lvl.lamp) opts.push({ id: 'light_lamp', uid: this.equippedUid('L16'), label: 'Lámpara', text: 'Usa la lámpara para derrotar al Morlock.' });
    }
    return opts.concat(this._specialOptions());
  },
  _specialOptions() {
    const c = this.s.combat; const opts = [];
    const acorn = this.equippedUid('T40');
    if (acorn && !c.boss) opts.push({ id: 'bellota', uid: acorn, label: 'Bellota Mágica', text: 'Descártala para derrotar a este enemigo (sin tesoro).' });
    const nm = this.equippedUid('L49');
    if (nm) {
      if (c.weakness === 'undead' && c.hp <= 5 && !c.boss) opts.push({ id: 'nomuerto_kill', uid: nm, label: 'Poción de la No Muerte', text: 'Destruye a este enemigo no muerto (5 o menos de salud).' });
      if (c.weakness !== 'undead') opts.push({ id: 'nomuerto_weak', uid: nm, label: 'Poción de la No Muerte', text: 'Este enemigo pasa a tener la debilidad no muerto.' });
    }
    return opts;
  },
  _cPre() {
    const c = this.s.combat; if (!c || c.defeated) return;
    // arcos: daño automático antes del daño inicial
    const mw = this.mainWeapon();
    const pre = mw?.def.fx?.preStrike || 0;
    if (pre && !c.usedPreStrike) {
      c.usedPreStrike = true;
      this.log(`${mw.def.name}: infliges ${pre} de daño antes del daño inicial.`, 'combat');
      this._damageEnemy(pre, 'preStrike');
      if (!this.s.combat) return;
    }
    const opts = this._preOptions();
    if (opts.length) this.ask('pre', { options: opts });
  },

  /* ============================================================================ golpes del enemigo */
  _cInitial() {
    const c = this.s.combat; if (!c || c.defeated) return;
    if (c.ambush === 'player') { this.log('Tienes la iniciativa: ignoras el daño inicial.', 'combat'); return; }
    if (c.power.noInitial) { this.log(`${c.name} no inflige daño inicial.`, 'combat'); return; }
    if (c.blockInitial) { this.log('Has bloqueado el daño inicial.', 'combat'); return; }
    const twice = c.power.doubleInitialIfAmbush2 && c.ambush === 'enemy';
    this.insert(function strike1() { this._enemyStrike('initial'); },
      ...(twice ? [function strike2() { if (this.s.combat && !this.s.over) { this.log(`${this.s.combat.name} ataca por segunda vez.`, 'combat'); this._enemyStrike('initial'); } }] : []));
  },
  _cCounter() {
    const c = this.s.combat; if (!c || this.s.over || c.defeated) return;
    this._enemyStrike('counter');
  },

  /** Reducción total de daño por equipo (inicial o contraataque). */
  armorReduction(kind, c = this.s.combat) {
    const pw = c?.power || {};
    if (kind === 'initial' && pw.noArmorInitial) return 0;
    let total = 0; let hasShield = false;
    for (const src of this.activeSources()) {
      const fx = src.def.fx || {};
      const val = kind === 'initial' ? fx.reduceInitial : fx.reduceCounter;
      if (fx.shield && src.slot !== 'skill') { if (pw.ignoreShields) continue; hasShield = true; }
      if (val) total += val;
    }
    if (kind === 'initial' && hasShield && this.hasSkill('S11')) total += 1;
    return total;
  },

  _enemyStrike(kind) {
    const c = this.s.combat; if (!c) return;
    const dice = this.roll(2, kind === 'initial' ? 'enemy-initial' : 'enemy-counter', 'enemy');
    this._enemyResolve(kind, dice, false);
  },
  _enemyResolve(kind, dice, decided) {
    const c = this.s.combat; if (!c) return;
    const [a, b] = dice;
    const sed = this.hasAffliction('AF1') && c.purse > 0;
    const miss = a === b && !sed;
    // Poción de Suerte: relanzar los dados de un ataque enemigo (antes de aplicar el daño)
    const luck = this.equippedUid('T38');
    if (!miss && luck && !decided && !this.s.over) {
      const dmg = Math.abs(a - b) + (c.damage || 0) + (kind === 'initial' ? c.initialBonus : 0) - this.armorReduction(kind, c);
      if (dmg > 0 && !c.power.noDamageAttack) { this.ask('enemyRoll', { kind, dice, uid: luck, dmg: Math.max(0, dmg) }); return; }
    }
    if (a === b && sed) this.log('Sed de Oro: el enemigo no puede fallar.', 'affliction');
    if (miss) {
      this.log(`${c.name} saca dobles [${a}, ${b}] y falla ${kind === 'initial' ? 'su ataque inicial' : 'el contraataque'}.`, 'combat');
      if (c.power.afflictionOnEnemyDoubles) this.gainAffliction('enemigo');
      this.emit('enemyMiss', { kind });
      return;
    }
    const diff = Math.abs(a - b);
    const dmg = c.power.noDamageAttack ? 0 : diff + (c.damage || 0) + (kind === 'initial' ? c.initialBonus : 0);
    const red = this.armorReduction(kind, c);
    const final = c.power.noDamageAttack ? 0 : Math.max(0, dmg - red);
    this.log(`${c.name} ataca [${a}, ${b}→${diff}] + ${c.damage || 0}${kind === 'initial' && c.initialBonus ? ` + ${c.initialBonus}` : ''} = ${dmg}; armadura −${red}: sufres ${final}.`, 'combat');
    if (final > 0) this.lose('hp', final, kind === 'initial' ? 'daño inicial' : 'contraataque');
    this.emit('enemyHit', { kind, dmg: final });
    this._onHit(kind, final);
    this.checkDeath();
  },
  /** efectos secundarios de un impacto del enemigo (la tirada no fue doble) */
  _onHit(kind, final) {
    const c = this.s.combat; const pw = c.power; const h = this.hero;
    if (pw.poisonOnHit) { this.addPoison(pw.poisonOnHit, c.name); this.log(`${c.name} te envenena (+${pw.poisonOnHit}).`, 'combat'); }
    if (kind === 'initial' && pw.poisonOnInitialHit) { this.addPoison(pw.poisonOnInitialHit, c.name); this.log(`${c.name} te envenena con el golpe inicial.`, 'combat'); }
    if (kind === 'initial' && pw.doublePoisonOnInitialHit && h.poison > 0) { const n = h.poison; this.addPoison(n, c.name); this.log(`${c.name} duplica tu veneno.`, 'combat'); }
    if (pw.loseBlessingOnHit || (kind === 'initial' && pw.loseBlessingOnInitialHit)) {
      const n = pw.loseBlessingOnHit || pw.loseBlessingOnInitialHit; const lost = this.lose('blessing', n, c.name);
      if (lost) this.log(`${c.name} te roba ${lost} bendición(es).`, 'combat');
    }
    if (pw.stealEnergyOnHit) { const n = this.lose('energy', pw.stealEnergyOnHit, c.name); if (n) this.log(`${c.name} te roba ${n} de energía.`, 'combat'); }
    if (pw.energyLossOnHit) { const n = this.lose('energy', pw.energyLossOnHit, c.name); if (n) this.log(`${c.name} te hace perder ${n} de energía.`, 'combat'); }
    if (pw.nextAttackExtraEnergy) { c.nextCost = pw.nextAttackExtraEnergy; this.log('Tu siguiente ataque costará 1 de energía adicional.', 'combat'); }
    if (kind === 'initial' && pw.afflictionOnInitialDamage && final > 0) this.gainAffliction('enemigo');
    if (pw.breakWeaponOnDamage && final >= pw.breakWeaponOnDamage) {
      const mw = this.mainWeapon();
      if (mw) { this.log(`¡${c.name} rompe tu ${mw.def.name}!`, 'combat'); this.discardOwned(mw.uid, 'broken'); }
    }
    // Broquel: se rompe con un impacto de 4 o más
    const b = this.activeSources().find((x) => x.def.fx?.brittle && final >= x.def.fx.brittle);
    if (b && !this.hasSkill('S11')) { this.log(`Tu ${b.def.name} se rompe.`, 'combat'); this.discardOwned(b.uid, 'broken'); }
  },

  /* ============================================================================ turno del héroe */
  _cPlayerTurn() {
    const c = this.s.combat; if (!c || this.s.over || c.defeated) return;
    const h = this.hero; const mw = this.mainWeapon();
    const canRoll = !!mw || this.hasSkill('S18');
    const cost = c.nextCost || 0;
    this.ask('attack', {
      round: c.round, hasWeapon: canRoll, maxEnergy: Math.min(3, h.energy),
      furia: this.hasSkill('S9') && h.hp > 2, mandoble: !!this.equippedUid('L47') && h.gold >= 1,
      extraCost: cost,
      throwables: this.allItems().filter((u) => this.def(u).fx?.throwDice && this.def(u).code !== 'T15').filter((u) => this.s.eq.MP === u || this.s.z.hand.includes(u)),
      potions: this.allItems().filter((u) => ['P3', 'P4', 'P5'].includes(this.def(u).code)),
      specials: this._specialOptions(),
      fist: this.hasSkill('S18') ? 2 : 1,
    });
  },

  _damageEnemy(n, cause = '') {
    const c = this.s.combat; if (!c) return;
    c.hp = Math.max(0, c.hp - n);
    this.emit('enemyHp', { uid: c.uid, hp: c.hp, maxHp: c.maxHp, dmg: n, cause });
    if (c.hp <= 0) this._defeat();
  },

  _defeat({ noTreasure = false, byTrick = false } = {}) {
    const c = this.s.combat; if (!c || c.defeated) return;
    c.defeated = true;
    const pw = c.power; const d = this.def(c.uid);
    this.log(`¡Has derrotado a ${c.name}!`, 'combat');
    this.s.stats.kills++;
    this.emit('enemyDefeated', { uid: c.uid });
    if (!c.boss && !c.plot) this.s.z.graveyard.push({ uid: c.uid, spent: false });
    if (c.boss) { this._endCombat('win'); return; }
    const tasks = [];
    if (!noTreasure) {
      if (c.purse) tasks.push(function purse() {
        this.gain('gold', c.purse, c.name); this.log(`Obtienes ${c.purse} de oro.`, 'combat');
        if (this.hasSkill('S17')) this.gain('energy', c.purse, 'cazadora de tesoros');
      });
      if (c.treasure >= 1) tasks.push(function loot1() {
        if (pw.potionInsteadOfLoot && c.treasure === 1) this.ask('choice', { title: d.name, text: 'Puedes robar una poción aleatoria en vez de una carta de botín.',
          options: [{ id: 'loot', label: 'Carta de botín', text: 'Robas una carta de botín.' }, { id: 'potion', label: 'Poción aleatoria', text: 'Robas una carta de poción.' }], scene: 'generic',
          onChoose: (id) => { if (id === 'potion') this.gainPotion(1); else this.gainLoot(1); } });
        else this.gainLoot(1);
      });
      if (c.treasure >= 2) tasks.push(function potion1() { this.gainPotion(1); });
    }
    tasks.push(function reward() {
      if (pw.rationOnDefeat) { this.gain('rations', pw.rationOnDefeat, c.name); this.log(`¡Pescado delicioso! +${pw.rationOnDefeat} ración.`, 'combat'); }
      if (pw.eyesOnDefeat) { this.s.eyes += pw.eyesOnDefeat; this.emit('eyes', { uid: c.uid, eyes: this.s.eyes }); this.log(`Ganas ${pw.eyesOnDefeat} ojo(s) · ${this.s.eyes}/10.`, 'plot'); }
      if (pw.blessingOnDefeat) this.gain('blessing', pw.blessingOnDefeat, c.name);
      if (pw.moralityOnDefeat) this.addMorality(pw.moralityOnDefeat);
    });
    tasks.push(function finish() { this._endCombat('win'); this._checkEyes(); });
    // los pasos de combate pendientes (contraataque, turno...) dejan de tener sentido
    this.q = this.q.filter((f) => f !== this._cCounter && f !== this._cPlayerTurn && f !== this._cInitial && f !== this._cPre);
    this.insert(...tasks);
  },

  /* ============================================================================ ataque del héroe */
  doAttack({ energy = 0, furia = false, mandoble = false } = {}) {
    const c = this.s.combat; const h = this.hero; const mw = this.mainWeapon();
    const canRoll = !!mw || this.hasSkill('S18');
    energy = Math.max(0, Math.min(3, Math.floor(energy)));
    if (energy > h.energy) this.fail('No tienes tanta energía.');
    if (energy > 0 && !canRoll) this.fail('Necesitas un arma en la mano principal para tirar dados.');
    if ((furia || mandoble) && energy === 0) this.fail('Para añadir un dado extra tienes que tirar dados.');
    if (furia && !(this.hasSkill('S9') && h.hp > 2)) this.fail('No puedes usar Furia.');
    if (mandoble && !(this.equippedUid('L47') && h.gold >= 1)) this.fail('No puedes pagar el dado extra.');
    this.clear();
    // coste adicional (Araña Gigante)
    if (c.nextCost) { const extra = Math.min(c.nextCost, h.energy - energy); if (extra > 0) { this.lose('energy', extra, 'araña'); this.log(`Pagas ${extra} de energía adicional.`, 'combat'); } c.nextCost = 0; }
    if (energy > 0) this.lose('energy', energy, 'ataque');
    if (furia) { this.lose('hp', 2, 'furia'); this.log('Furia: gastas 2 de salud para un dado extra.', 'skill'); if (this.checkDeath()) return; }
    if (mandoble) { this.lose('gold', 1, 'mandoble'); this.log('Mandoble Ávido: pagas 1 de oro por un dado extra.', 'item'); }
    if (energy === 0) {
      const dmg = this.hasSkill('S18') ? 2 : 1;
      this.log(`Golpeas con los puños: ${dmg} de daño.`, 'combat');
      this.emit('punch', { dmg });
      this._damageEnemy(dmg, 'puño');
      if (this.s.combat) this._afterAttack();
      return;
    }
    const n = energy + (furia ? 1 : 0) + (mandoble ? 1 : 0);
    const dice = this.roll(n, 'attack', 'hero');
    c.roll = { dice, energy, used: {}, log: [] };
    // relanzamientos obligatorios (daga/arco: 6; sable: 1)
    const must = mw?.def.fx?.mustReroll || [];
    if (must.length) {
      const rr = []; dice.forEach((v, i) => { if (must.includes(v)) rr.push(i); });
      if (rr.length) {
        const nv = this.roll(rr.length, 'reroll', 'hero'); rr.forEach((i, k) => { dice[i] = nv[k]; });
        this.log(`${mw.def.name}: relanzas ${rr.length} resultado(s) de ${must.join('/')}.`, 'combat');
        this.emit('diceReroll', { dice: dice.slice(), idx: rr });
      }
    }
    this._postRoll();
  },

  _rerollOptions() {
    const c = this.s.combat; const r = c.roll; const mw = this.mainWeapon(); const opts = [];
    for (const src of this.activeSources()) {
      const mr = src.def.fx?.mayReroll; if (!mr) continue;
      if (mr.vs && c.weakness !== mr.vs) continue;
      if (mr.weaponTag && !mw?.def.fx?.[mr.weaponTag]) continue;
      if (src.slot !== 'skill' && src.uid !== mw?.uid) continue;
      if (!r.dice.some((v) => mr.values.includes(v))) continue;
      opts.push({ id: `some:${src.def.code}`, label: `${src.def.name}: relanzar ${mr.values.join(' y ')}`, values: mr.values, once: true });
    }
    const trofeo = this.equippedUid('T22');
    if (trofeo && !this.s.lvl.trofeo) opts.push({ id: 'all:T22', label: 'Trofeo: repetir todos los dados', uid: trofeo, once: true });
    const luck = this.equippedUid('T38');
    if (luck) opts.push({ id: 'all:T38', label: 'Poción de Suerte: relanzar todos', uid: luck });
    if (this.hero.blessings.length) opts.push({ id: 'all:blessing', label: 'Bendición: relanzar todos los dados' });
    return opts.filter((o) => !(o.once && r.used[o.id]));
  },
  _postRoll() {
    const c = this.s.combat; const r = c.roll;
    const opts = this._rerollOptions();
    if (!opts.length) { this._applyAttack(); return; }
    this.ask('postRoll', { dice: r.dice.slice(), options: opts, preview: this.previewDamage(r.dice, r.energy) });
  },
  doReroll(id) {
    const c = this.s.combat; const r = c.roll; const pr = this.s.prompt;
    const o = pr.options.find((x) => x.id === id);
    if (!o) this.fail('Esa opción ya no está disponible.');
    if (id.startsWith('some:')) {
      const idx = []; r.dice.forEach((v, i) => { if (o.values.includes(v)) idx.push(i); });
      const nv = this.roll(idx.length, 'reroll', 'hero'); idx.forEach((i, k) => { r.dice[i] = nv[k]; });
      this.emit('diceReroll', { dice: r.dice.slice(), idx });
      r.used[id] = true;
      this.log(`Relanzas ${idx.length} dado(s).`, 'combat');
    } else {
      if (id === 'all:T22') { this.s.lvl.trofeo = true; }
      else if (id === 'all:T38') this.discardOwned(o.uid, 'use');
      else if (id === 'all:blessing') this.loseBlessing(1, 'relanzar');
      const nv = this.roll(r.dice.length, 'reroll', 'hero'); nv.forEach((v, i) => { r.dice[i] = v; });
      const must = this.mainWeapon()?.def.fx?.mustReroll || [];
      this.emit('diceReroll', { dice: r.dice.slice(), idx: r.dice.map((_, i) => i) });
      this.log('Relanzas todos tus dados.', 'combat');
      if (must.length) { /* los relanzamientos forzosos no se encadenan: el nuevo resultado vale */ }
      r.used[id] = true;
    }
  },

  /** Daño total de un ataque con estos dados (sin aplicar). */
  previewDamage(dice, energy = dice.length) {
    const c = this.s.combat; const mw = this.mainWeapon(); const fx = mw?.def.fx || {};
    let sum = 0;
    for (const v of dice) {
      let e = v;
      if (fx.dieValue && fx.dieValue[v]) e = fx.dieValue[v];
      if (fx.oneDamage && v === 1) e = fx.oneDamage;
      if (fx.plusPerSix && v === 6) e += fx.plusPerSix;
      sum += e;
    }
    const parts = { dice: sum, bonus: 0 };
    let bonus = 0;
    if (fx.attackVs?.[c.weakness]) bonus += fx.attackVs[c.weakness];
    bonus += this.sumFx('attackBonus');
    const off = this.offHand();
    if (this.hasSkill('S10') && off?.def.fx?.dagger) bonus += 2;
    const hasDouble = new Set(dice).size < dice.length && dice.length >= 2;
    if (hasDouble) {
      if (fx.doublesBonus) bonus += fx.doublesBonus;
      if (fx.doublesBonusVs?.[c.weakness]) bonus += fx.doublesBonusVs[c.weakness];
    }
    if (this.hasAffliction('AF1') && c.purse > 0) bonus += energy;
    parts.bonus = bonus;
    return sum + bonus;
  },
  _applyAttack() {
    const c = this.s.combat; const r = c.roll;
    const total = this.previewDamage(r.dice, r.energy);
    this.log(`Atacas con [${r.dice.join(', ')}] → ${total} de daño.`, 'combat');
    const ones = r.dice.filter((v) => v === 1).length;
    this.emit('attackResolved', { dice: r.dice.slice(), total });
    c.roll = null;
    this._damageEnemy(total, 'ataque');
    if (!this.s.combat) return;
    if (c.power.loseWeaponsOnOnes && ones >= c.power.loseWeaponsOnOnes) {
      this.log(`¡${c.name} devora tus armas!`, 'combat');
      for (const slot of ['MP', 'OM']) { const u = this.s.eq[slot]; if (u && u !== 'TWO' && (slot === 'MP' || this.def(u).slot === 'MP')) this.discardOwned(u, 'devoured'); }
      if (this.s.eq.OM === 'TWO') this.s.eq.OM = null;
    }
    if (c.power.afflictionOnOnes && ones >= c.power.afflictionOnOnes) this.gainAffliction('enemigo');
    this._afterAttack();
  },
  _afterAttack() {
    const c = this.s.combat; if (!c || c.defeated) return;
    this.insert(this._cCounter, function nextRound() { if (this.s.combat) { this.s.combat.round++; } }, this._cPlayerTurn);
  },

  /* ============================================================================ armas arrojadizas y pociones */
  throwWeapon(uid) {
    const d = this.def(uid); const c = this.s.combat;
    const n = d.fx.throwDice;
    const dice = this.roll(n, 'throw', 'hero');
    let total = dice.reduce((a, b) => a + b, 0);
    if (d.fx.axe && this.hasSkill('S9')) { total += 5; this.log('Furia: +5 de daño al arrojar el hacha.', 'skill'); }
    this.log(`Arrojas ${d.name} [${dice.join(', ')}] → ${total} de daño. Se pierde.`, 'combat');
    this.removeOwned(uid); this.s.z.removed.push(uid);
    this.emit('throw', { uid, total });
    this._damageEnemy(total, 'arrojar');
    if (this.s.combat) this._afterAttack();
  },
  potionAttack(uid) {
    const d = this.def(uid); const c = this.s.combat;
    const dice = this.roll(2, 'potion', 'hero');
    let total = dice[0] + dice[1];
    const type = { P3: 'ice', P4: 'fire', P5: 'undead' }[d.code];
    if (type && c.weakness === type) { total += 5; this.log(`¡Es débil al ${weaknessName(type)}! +5.`, 'combat'); }
    const bonus = this.sumFx('potionBonus'); if (bonus) { total += bonus; this.log(`Báculo: +${bonus} de daño con pociones.`, 'item'); }
    this.log(`Lanzas ${d.name} [${dice.join(', ')}] → ${total} de daño.`, 'combat');
    this.discardOwned(uid, 'use');
    this.emit('potionThrown', { uid, total });
    this._damageEnemy(total, 'poción');
    if (this.s.combat) this._afterAttack();
  },

  /* ============================================================================ especiales (antes del daño / durante el combate) */
  doSpecial(id) {
    const c = this.s.combat; const pr = this.s.prompt;
    const o = pr.options?.find((x) => x.id === id) || pr.specials?.find((x) => x.id === id);
    if (!o) this.fail('Esa opción ya no está disponible.');
    switch (id) {
      case 'bloquear': {
        const d = this.rollOne('bloquear');
        if (d >= 5) { c.blockInitial = true; this.log(`Bloquear (${d}): ¡evitas todo el daño inicial!`, 'skill'); }
        else if (d === 1) { const mw = this.mainWeapon(); this.log('Bloquear (1): tu arma principal se rompe.', 'skill'); if (mw) this.discardOwned(mw.uid, 'broken'); }
        else this.log(`Bloquear (${d}): fallas.`, 'skill');
        c.usedBloquear = true; break;
      }
      case 'sombra': { const d = this.rollOne('sombra'); c.usedSombra = true; this.log(`Sombra: infliges ${d} de daño.`, 'skill'); this._damageEnemy(d, 'sombra'); break; }
      case 'shuriken': { const d = this.rollOne('shuriken'); this.discardOwned(o.uid, 'use'); this.log(`Shuriken: infliges ${d} de daño.`, 'item'); this._damageEnemy(d, 'shuriken'); break; }
      case 'light_torch': this.discardOwned(o.uid, 'use'); this.log('Cegas al Morlock con la antorcha.', 'item'); this._defeat(); break;
      case 'light_lamp': this.s.lvl.lamp = true; this.log('Cegas al Morlock con la lámpara.', 'item'); this._defeat(); break;
      case 'bellota': this.discardOwned(o.uid, 'use'); this.log('La Bellota Mágica derrota al enemigo.', 'item'); this._defeat({ noTreasure: true }); break;
      case 'nomuerto_kill': this.discardOwned(o.uid, 'use'); this.log('La Poción de la No Muerte destruye al enemigo.', 'item'); this._defeat(); break;
      case 'nomuerto_weak': this.discardOwned(o.uid, 'use'); c.weakness = 'undead'; this.log('El enemigo es ahora débil al no muerto.', 'item'); break;
      default: this.fail('Opción desconocida.');
    }
    this.checkDeath();
  },
});

/* ================================================================================ acciones de combate */
ACTIONS.avoidCard = {
  in: ['avoidCard'],
  run({ id }, pr) {
    const opt = pr.options.find((o) => o.id === id);
    if (id !== 'fight' && !opt) this.fail('Opción inválida.');
    const opts = pr.opts;
    this.clear();
    if (id === 'fight') { this.insert(function fight() { this._drawAndFight(opts); }); return; }
    if (id === 'wedge') { this.discardOwned(opt.uid, 'use'); this.log('Usas la Cuña de Puerta: evitas el encuentro.', 'item'); return; }
    if (id === 'ring') { this.s.lvl.ring = true; this.log('El Anillo Mágico te protege: evitas la emboscada.', 'item'); return; }
    if (id === 'vest') { this.s.lvl.vest = true; this.log('Tus vestiduras te permiten escabullirte: evitas la escaramuza.', 'item'); return; }
    if (id === 'hide') {
      const d = this.rollOne('ocultacion');
      if (d >= 5) { this.log(`Ocultación (${d}): ¡evitas el combate!`, 'skill'); return; }
      if (d <= 2) { opts.initialBonus += 2; this.log(`Ocultación (${d}): fallas y el enemigo te sorprende (+2 al daño inicial).`, 'skill'); }
      else this.log(`Ocultación (${d}): fallas.`, 'skill');
      this.insert(function fight() { this._drawAndFight(opts); });
    }
  },
};
ACTIONS.avoidEnemy = {
  in: ['avoidEnemy'],
  run({ id }, pr) {
    const c = this.s.combat;
    if (id === 'fight') { this.clear(); return; }
    const o = pr.options.find((x) => x.id === id);
    if (!o || o.disabled) this.fail('No puedes pagar eso.');
    if (id === 'discardValue') {
      this.clear();
      this.ask('pickCards', { title: `Descarta cartas con valor combinado ${o.n}+`, uids: this.allItems(), min: 1, max: 99, purpose: 'avoidValue', need: o.n });
      return;
    }
    this.lose(o.res === 'gold' ? 'gold' : 'rations', o.n, 'evitar');
    this.log(`Evitas el enfrentamiento con ${c.name} (${o.label.toLowerCase()}).`, 'combat');
    this.clear(); this._endCombat('avoid');
  },
};
ACTIONS.preUse = { in: ['pre'], run({ id }) { this.doSpecial(id); this.clear(); const c = this.s.combat; if (c && !c.defeated) this.insert(function again() { this._cPreAgain(); }); } };
Game.prototype._cPreAgain = function _cPreAgain() {
  const c = this.s.combat; if (!c || c.defeated) return;
  const opts = this._preOptions().filter((o) => !(o.id === 'bloquear' && c.usedBloquear) && !(o.id === 'sombra' && c.usedSombra));
  if (opts.length) this.ask('pre', { options: opts });
};
ACTIONS.proceed = { in: ['pre'], run() { this.clear(); } };
ACTIONS.attack = { in: ['attack'], run(p) { this.doAttack(p); } };
ACTIONS.luckReroll = {
  in: ['enemyRoll'],
  run(_, pr) { this.discardOwned(pr.uid, 'use'); this.clear(); const dice = this.roll(2, pr.kind === 'initial' ? 'enemy-initial' : 'enemy-counter', 'enemy'); this.log('Poción de Suerte: el enemigo relanza sus dados.', 'item'); this._enemyResolve(pr.kind, dice, true); },
};
ACTIONS.luckKeep = { in: ['enemyRoll'], run(_, pr) { this.clear(); this._enemyResolve(pr.kind, pr.dice, true); } };
ACTIONS.throwItem = { in: ['attack'], run({ uid }, pr) { if (!pr.throwables.includes(uid)) this.fail('No puedes arrojar eso.'); this.clear(); this.throwWeapon(uid); } };
ACTIONS.potionAttack = { in: ['attack'], run({ uid }, pr) { if (!pr.potions.includes(uid)) this.fail('No es una poción ofensiva.'); this.clear(); this.potionAttack(uid); } };
ACTIONS.special = {
  in: ['attack'],
  run({ id }) { this.doSpecial(id); this.clear(); const c = this.s.combat; if (c && !c.defeated && !this.s.over) this.insert(this._cPlayerTurn); },
};
ACTIONS.reroll = { in: ['postRoll'], run({ id }) { this.doReroll(id); this.clear(); this.insert(this._postRoll); } };
ACTIONS.accept = { in: ['postRoll'], run() { this.clear(); this._applyAttack(); } };
