/**
 * IRON HELM · Combate.
 *
 * Secuencia (reglamento): salud del enemigo = base + nivel (+ ajuste de la carta) → daño inicial del enemigo
 * (2d6: mayor − menor + daño base; dobles = falla; se resta la armadura) → turno del héroe (gasta hasta 3 de
 * energía, 1d6 por ficha; sin energía, un puñetazo de 1) → contraataque (misma fórmula) → …
 */
import { Game, ACTIONS } from './game.js';

const WK = { fire: 'fuego', ice: 'hielo', undead: 'no muerto', '*': 'ninguna' };
export const weaknessName = (w) => WK[w] || w;
const POTION_ELEMENT = { P3: 'ice', P4: 'fire', P5: 'holy' };
const POTION_WEAK = { P3: 'ice', P4: 'fire', P5: 'undead' };

Object.assign(Game.prototype, {
  /* ============================================================================ cartas que provocan combate */
  _combatCard(uid, d, side) {
    const lvl = this.s.level;
    const P = this.cardParams(d, side);
    const opts = { source: 'dungeon', cardKind: d.kind, side, ambush: P.ambush || 'normal', hpBonus: lvl + (P.hp || 0),
      initialBonus: P.initialLevel ? lvl : 0, firstAttackBonus: P.firstAttackBonus || 0, goldOnDefeat: P.goldOnDefeat || 0 };

    const options = [];
    const wedge = this.equippedUid('T6');
    if (wedge) options.push({ id: 'wedge', uid: wedge, label: 'Cuña de Puerta', text: 'Descarta la cuña para evitar el encuentro.' });
    if (d.kind === 'ambush' && this.hasCode('L15') && !this.s.lvl.ring)
      options.push({ id: 'ring', uid: this.equippedUid('L15'), label: 'Anillo Mágico', text: 'Evita esta emboscada (una vez por nivel).' });
    if (d.kind === 'ambush' && this.canSixthSense())
      options.push({ id: 'sexto', label: 'Sexto Sentido', text: 'Evita esta emboscada (una vez por nivel).' });
    if (d.kind === 'skirmish') {
      if (this.hasCode('T12') && !this.s.lvl.vest)
        options.push({ id: 'vest', uid: this.equippedUid('T12'), label: 'Vestiduras', text: 'Evita esta escaramuza (una vez por nivel).' });
      if (this.hasSkill('S5') && !this._skillBlocked('S5'))
        options.push({ id: 'hide', label: 'Ocultación', text: 'Tira 1d6: 5-6 evitas el combate; 1-2 suma 2 al daño inicial.' });
      if (this.hasCode('L41') && !this.s.lvl.boots && opts.ambush !== 'player')
        options.push({ id: 'boots', uid: this.equippedUid('L41'), label: 'Botas de la Presteza', text: 'Atacas primero en esta escaramuza (una vez por nivel).' });
    }
    if (this.canFlee()) options.push({ id: 'correr', label: 'Correr', text: 'Tira 1d6 para ver cuánta energía gastas y evita esta carta (una vez por nivel).' });
    if (options.length) this.ask('avoidCard', { uid, kind: d.kind, side, options, opts });
    else this._drawAndFight(opts);
  },
  /** habilidades anuladas por el equipo (Armadura de Escamas anula Ocultación y Sombra) */
  _skillBlocked(code) {
    return this.activeSources().some((x) => x.def.fx?.noSkills?.includes(code));
  },

  _drawAndFight(opts) {
    const z = this.s.z;
    // El Cetro: cuando tengas que robar una carta de enemigo, roba dos, elige una y descarta la otra
    if (this.hasCode('L33') && z.enemies.length + z.enemiesDiscard.length >= 2) {
      const a = this.draw('enemies'); const b = this.draw('enemies');
      this.log('El Cetro: robas dos enemigos y eliges uno.', 'item');
      this.ask('pickCards', { title: 'El Cetro: elige a qué enemigo te enfrentas', uids: [a, b].filter(Boolean), min: 1, max: 1, purpose: 'scepter', opts });
      return;
    }
    const uid = this.draw('enemies');
    if (!uid) { this.log('No quedan enemigos en el mazo.', 'combat'); return; }
    this._fightDrawn(uid, opts);
  },
  /** combate contra un enemigo ya robado (o trampa del mazo de enemigos) */
  _fightDrawn(uid, opts) {
    const d = this.def(uid);
    if (d.power?.trap || d.trap) {
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
      this.lose('hp', dmg, 'necrofobia');
      if (opts.plot) this._plotEyes(uid); else this.s.z[opts.source === 'mimic' ? 'lootDiscard' : 'enemiesDiscard'].push(uid);
      this.checkDeath();
      return;
    }
    const env = this.envFx();
    const envDmg = (env.dmgAll || 0) + (env.dmgVs?.[d.weakness] || 0);
    const c = {
      uid, name: d.name, power: { ...(d.power || {}) }, weakness: d.weakness, damage: (d.damage || 0) + envDmg, purse: d.purse || 0, treasure: d.treasure || 0,
      hp: d.health + (opts.hpBonus || 0), maxHp: d.health + (opts.hpBonus || 0), baseHp: d.health, tags: d.tags || [],
      ambush: opts.ambush || 'normal', initialBonus: opts.initialBonus || 0,
      boss: !!opts.boss, plot: !!opts.plot, source: opts.source || 'dungeon', round: 1, nextCost: 0, blockInitial: false, mimic: opts.source === 'mimic',
      firstAttackBonus: opts.firstAttackBonus || 0, goldOnDefeat: opts.goldOnDefeat || 0, onWin: opts.onWin || null, attacks: 0,
    };
    this.s.combat = c;
    this.emit('combatStart', { uid, hp: c.hp, maxHp: c.maxHp, ambush: c.ambush, boss: c.boss });
    this.log(`¡Combate contra ${d.name}! Salud ${c.hp}${c.ambush === 'player' ? ' · tienes la iniciativa' : c.ambush === 'enemy' ? ' · el enemigo te sorprende' : ''}.`, 'combat');
    if (envDmg) this.log(`Entorno: ${d.name} inflige +${envDmg} de daño en este nivel.`, 'env');
    if (this.s.mercs.length) this._mercOnCombat(c);
    this.insert(this._cAvoidEnemy, this._cPre, this._cInitial, this._cPlayerTurn);
  },

  /** Cierra un combate. `c` puede no ser el combate actual: el botín de un enemigo derrotado puede destapar un
   *  Mimético, que se combate antes de terminar de cobrar el tesoro del primero. */
  _endCombat(result, c = this.s.combat) {
    if (!c || c.ended) return;
    c.ended = true;
    if (this.s.combat === c) this.s.combat = null;
    this.emit('combatEnd', { result, uid: c.uid, boss: c.boss });
    if (result === 'win' && c.boss) { this.victory(); return; }
    if (result === 'avoid') {
      if (c.plot) this._plotEyes(c.uid);
      else this.s.z[c.mimic ? 'lootDiscard' : 'enemiesDiscard'].push(c.uid);
    } else if (result === 'win' && c.plot) this._plotEyes(c.uid);
  },
  /** ¿Es el enemigo actual inmune a este tipo de ataque? (Zogar: sagrado, fuego, hielo) */
  immune(element) { return !!element && !!this.s.combat?.power?.immune?.includes(element); },

  /* ============================================================================ evitar al enemigo */
  _cAvoidEnemy() {
    const c = this.s.combat; if (!c || c.defeated) return;
    const pw = c.power; const options = [];
    if (pw.avoid) {
      for (const [res, n] of Object.entries(pw.avoid)) {
        const have = res === 'gold' ? this.hero.gold : res === 'blessing' ? this.hero.blessings.length : this.hero.rations;
        const what = res === 'gold' ? 'de oro' : res === 'blessing' ? (n === 1 ? 'ficha de bendición' : 'fichas de bendición') : n === 1 ? 'ración' : 'raciones';
        options.push({ id: `pay_${res}`, label: `Gastar ${n} ${what}`, disabled: have < n, reason: 'No te alcanza', res, n });
      }
    }
    if (pw.avoidDiscardValue) {
      const val = this._ownedValue();
      options.push({ id: 'discardValue', label: `Descartar cartas por valor ${pw.avoidDiscardValue}+`, disabled: val < pw.avoidDiscardValue, reason: 'Valor insuficiente', n: pw.avoidDiscardValue });
    }
    if (!c.boss) {
      if (this.hasCode('galnok:L25') && c.weakness === 'undead' && c.baseHp <= 4)
        options.push({ id: 'mask', free: true, label: 'Máscara de Mizlak', text: 'Evitas a este no muerto de 4 o menos de salud base.' });
      if (this.hasCode('L45') && !this.s.lvl.cultist && c.baseHp <= 5)
        options.push({ id: 'cultist', free: true, label: 'Capa de Cultista', text: 'Evitas a este enemigo de 5 o menos de salud base (una vez por nivel).' });
      if (this.isRace('Semiorco') && c.tags.some((t) => ['orc', 'grunkle', 'goblin'].includes(t)))
        options.push({ id: 'halforc', free: true, label: 'Semiorco', text: 'Los orcos, grunkles y goblins te dejan pasar.' });
    }
    if (options.some((o) => !o.disabled)) this.ask('avoidEnemy', { options, name: c.name });
  },
  _ownedValue() { return this.allItems().reduce((n, u) => n + (this.def(u).price || 0), 0); },

  /* ============================================================================ antes del daño inicial */
  _preOptions() {
    const c = this.s.combat; const opts = []; const h = this.hero;
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
    if (this.hasSkill('S21') && !c.usedDrain && h.energy >= 2)
      opts.push({ id: 'drain', label: 'Drenaje Vital', text: 'Gasta 2 de energía: infliges d6 de daño al enemigo y ganas esa misma cantidad de salud.' });
    const sting = this.equippedUid('L35');
    if (sting && !this.s.lvl.sting) opts.push({ id: 'sting', uid: sting, label: 'Aguijón de Grasgol', text: 'Disparas una flecha: d6 de daño (una vez por nivel).' });
    const dshield = this.equippedUid('L44');
    if (initialComing && dshield && !this.s.lvl.drainShield)
      opts.push({ id: 'drainShield', uid: dshield, label: 'Escudo de Drenaje', text: 'Bloqueas todo el daño inicial y ganas 3 de salud (una vez por nivel).' });
    return opts.concat(this._specialOptions());
  },
  _specialOptions() {
    const c = this.s.combat; const opts = [];
    const acorn = this.equippedUid('T40');
    if (acorn && !c.boss) opts.push({ id: 'bellota', uid: acorn, label: 'Bellota Mágica', text: 'Descártala para derrotar a este enemigo (sin tesoro).' });
    const nm = this.equippedUid('L49');
    if (nm && !c.power.potionImmune && !this.immune('holy')) {
      if (c.weakness === 'undead' && c.hp <= 5 && !c.boss) opts.push({ id: 'nomuerto_kill', uid: nm, label: 'Poción de la No Muerte', text: 'Destruye a este enemigo no muerto (5 o menos de salud).' });
      if (c.weakness !== 'undead') opts.push({ id: 'nomuerto_weak', uid: nm, label: 'Poción de la No Muerte', text: 'Este enemigo pasa a tener la debilidad no muerto.' });
    }
    const gren = this.equippedUid('L40');
    if (gren && !c.boss && c.baseHp <= 6 && !this.immune('holy'))
      opts.push({ id: 'granada', uid: gren, label: 'Granada de Mano Sagrada', text: 'Descártala para derrotar a este enemigo (6 o menos de salud base).' });
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
      if (!this.s.combat || c.defeated) return;
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
      ...(twice ? [function strike2() { const k = this.s.combat; if (k && !k.defeated && !this.s.over) { this.log(`${k.name} ataca por segunda vez.`, 'combat'); this._enemyStrike('initial'); } }] : []));
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
      if (fx.reduceVs?.[c?.weakness]) total += fx.reduceVs[c.weakness];
      if (fx.armorByMorality) total += Math.max(0, this.morality() + fx.armorByMorality); // Armadura Divina: moral + 1
    }
    if (kind === 'initial' && hasShield && this.hasSkill('S11')) total += 1;
    return total;
  },
  /** daño base del ataque enemigo (sin la tirada) */
  _enemyDamageBase(kind, c = this.s.combat) {
    const pw = c.power;
    let base = (c.damage || 0) + (kind === 'initial' ? c.initialBonus : 0);
    if (pw.damageByMorality) base += this.morality();                                   // Malicia
    if (kind === 'initial' && pw.initialPlusBlessings) base += this.hero.blessings.length; // Sacerdote Maldito
    return base;
  },

  _enemyStrike(kind) {
    const c = this.s.combat; if (!c || c.defeated || this.s.over) return;
    const dice = this.roll(2, kind === 'initial' ? 'enemy-initial' : 'enemy-counter', 'enemy');
    this._enemyResolve(kind, dice, {});
  },
  /** reacciones del héroe ante un ataque enemigo que va a hacer daño */
  _enemyReactions(kind, react) {
    const c = this.s.combat; const opts = [];
    const luck = this.equippedUid('T38');
    if (luck && !react.luck) opts.push({ id: 'luck', uid: luck, label: 'Poción de Suerte', text: 'Descártala: el enemigo relanza sus dados.' });
    if (this.mainWeapon()?.def.key === 'T20' && !this.s.lvl.moon && !react.moon) opts.push({ id: 'moon', label: 'Daga de la Luna', text: 'Relanza la tirada del enemigo (una vez por nivel).' });
    if (kind === 'initial' && this.hasCode('T24') && !this.s.lvl.cape && !react.cape) opts.push({ id: 'cape', label: 'Capa de Lana', text: 'Resta 1 a este daño inicial (una vez por nivel).' });
    const garlic = this.equippedUid('T33');
    if (garlic && c.weakness === 'undead') opts.push({ id: 'garlic', uid: garlic, label: 'Ajo', text: 'Descártalo para evitar este ataque del no muerto.' });
    return opts;
  },
  _enemyResolve(kind, dice, react = {}) {
    const c = this.s.combat; if (!c || c.defeated) return;
    const [a, b] = dice; const pw = c.power;
    const doubles = a === b;
    const sed = this.hasAffliction('AF1') && c.purse > 0;
    const hitsOnDoubles = sed || pw.noMissOnDoubles || pw.doublesHitDie;
    const miss = doubles && !hitsOnDoubles;
    const diff = doubles && pw.doublesHitDie ? a : Math.abs(a - b);
    const base = this._enemyDamageBase(kind);
    const dmg = pw.noDamageAttack ? 0 : Math.max(0, diff + base);
    const red = this.armorReduction(kind, c) + (react.minus || 0);
    const final = pw.noDamageAttack ? 0 : Math.max(0, dmg - red);
    // Reacciones (Poción de Suerte, Daga de la Luna, Capa de Lana, Ajo) antes de aplicar el daño
    if (!miss && !react.done && !this.s.over && final > 0) {
      const options = this._enemyReactions(kind, react);
      if (options.length) {
        this.ask('enemyRoll', { kind, dice, uid: options.find((o) => o.id === 'luck')?.uid || null, dmg: final, options, react });
        return;
      }
    }
    if (doubles && hitsOnDoubles) this.log(sed ? 'Sed de Oro: el enemigo no puede fallar.' : `${c.name} no falla con dobles.`, sed ? 'affliction' : 'combat');
    if (miss) {
      this.log(`${c.name} saca dobles [${a}, ${b}] y falla ${kind === 'initial' ? 'su ataque inicial' : 'el contraataque'}.`, 'combat');
      this.emit('enemyMiss', { kind });
      this._enemyDoubles();
      return;
    }
    this.log(`${c.name} ataca [${a}, ${b}→${diff}] + ${base}${react.minus ? ` (−${react.minus})` : ''} = ${dmg}; armadura −${red - (react.minus || 0)}: sufres ${final}.`, 'combat');
    if (final > 0) this.lose('hp', final, kind === 'initial' ? 'daño inicial' : 'contraataque');
    this.emit('enemyHit', { kind, dmg: final });
    this._onHit(kind, final);
    if (doubles) this._enemyDoubles();
    this.checkDeath();
  },
  /** efectos de que el enemigo saque dobles (falle o no) */
  _enemyDoubles() {
    const c = this.s.combat; if (!c) return; const pw = c.power;
    if (pw.afflictionOnEnemyDoubles) this.gainAffliction('enemigo');
    if (pw.energyLossOnDoubles) { const n = this.lose('energy', pw.energyLossOnDoubles, c.name); if (n) this.log(`${c.name} saca dobles: pierdes ${n} de energía.`, 'combat'); }
    const star = this.equippedUid('AT5');
    if (star && !c.defeated) { this.log(`Estrella de Brahma: el enemigo saca dobles y le infliges 5 de daño.`, 'item'); this._damageEnemy(5, 'estrella'); }
  },
  /** efectos secundarios de un impacto del enemigo (la tirada no falló) */
  _onHit(kind, final) {
    const c = this.s.combat; const pw = c.power; const h = this.hero;
    if (pw.poisonOnHit) { this.addPoison(pw.poisonOnHit, c.name); this.log(`${c.name} te envenena (+${pw.poisonOnHit}).`, 'combat'); }
    if (kind === 'initial' && pw.poisonOnInitialHit) { this.addPoison(pw.poisonOnInitialHit, c.name); this.log(`${c.name} te envenena con el golpe inicial.`, 'combat'); }
    if (kind === 'counter' && pw.poisonOnCounterHit) { this.addPoison(pw.poisonOnCounterHit, c.name); this.log(`${c.name} te envenena con su contraataque (+${pw.poisonOnCounterHit}).`, 'combat'); }
    if (pw.poisonIfDamage && final >= pw.poisonIfDamage.min) { this.addPoison(pw.poisonIfDamage.n, c.name); this.log(`${c.name} te inflige ${final} de daño y te envenena.`, 'combat'); }
    if (kind === 'initial' && pw.doublePoisonOnInitialHit && h.poison > 0) { const n = h.poison; this.addPoison(n, c.name); this.log(`${c.name} duplica tu veneno.`, 'combat'); }
    if (pw.loseBlessingOnHit || (kind === 'initial' && pw.loseBlessingOnInitialHit)) {
      const n = pw.loseBlessingOnHit || pw.loseBlessingOnInitialHit; const lost = this.lose('blessing', n, c.name);
      if (lost) this.log(`${c.name} te roba ${lost} bendición(es).`, 'combat');
    }
    if (pw.stealEnergyOnHit) { const n = this.lose('energy', pw.stealEnergyOnHit, c.name); if (n) this.log(`${c.name} te roba ${n} de energía.`, 'combat'); }
    if (pw.energyLossOnHit) { const n = this.lose('energy', pw.energyLossOnHit, c.name); if (n) this.log(`${c.name} te hace perder ${n} de energía.`, 'combat'); }
    if (pw.energyLossOnDamage && final > 0) { const n = this.lose('energy', pw.energyLossOnDamage, c.name); if (n) this.log(`${c.name} te hace perder ${n} de energía.`, 'combat'); }
    if (pw.nextAttackExtraEnergy) { c.nextCost = pw.nextAttackExtraEnergy; this.log('Tu siguiente ataque costará 1 de energía adicional.', 'combat'); }
    if (kind === 'initial' && pw.afflictionOnInitialDamage && final > 0) this.gainAffliction('enemigo');
    if (pw.breakWeaponOnDamage && final >= pw.breakWeaponOnDamage) {
      const mw = this.mainWeapon();
      if (mw) { this.log(`¡${c.name} rompe tu ${mw.def.name}!`, 'combat'); this.discardOwned(mw.uid, 'broken'); }
    }
    if (pw.destroyBodyOnDamage && final >= pw.destroyBodyOnDamage && this.s.eq.CP) {
      const u = this.s.eq.CP; this.log(`¡${c.name} destruye tu ${this.def(u).name}!`, 'combat'); this.destroyOwned(u, 'burned');
    }
    if (pw.destroyEquippedOnDamage && final >= pw.destroyEquippedOnDamage) {
      this.insert(function destroyOne() {
        const e = this.s.eq; const uids = [...['MP', 'OM', 'CA', 'CP'].map((s) => e[s]).filter(Boolean), ...e.AC];
        if (!uids.length || this.s.over) return;
        this.ask('pickCards', { title: `${c.name}: elige el objeto equipado que destruye`, uids, min: 1, max: 1, purpose: 'destroy' });
      });
    }
    // Broquel, Cofia Tachonada: se rompen con un impacto de 4 o más (Parar con el Escudo protege los escudos)
    const brittle = this.activeSources().filter((x) => x.def.fx?.brittle && final >= x.def.fx.brittle && x.uid);
    for (const b of brittle) {
      if (b.def.fx.shield && this.hasSkill('S11')) continue;
      this.log(`Tu ${b.def.name} se rompe.`, 'combat'); this.discardOwned(b.uid, 'broken');
    }
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
      throwables: this.allItems().filter((u) => this.def(u).fx?.throwDice && this.def(u).key !== 'T15')
        .filter((u) => this.s.eq.MP === u || this.s.z.hand.includes(u) || (this.def(u).fx.throwAny && this.s.eq.AC.includes(u))),
      potions: this._attackPotions(),
      specials: this._specialOptions(),
      fist: this._fistDamage(),
      payHp: canRoll ? this._payHpOptions() : [],
    });
  },
  _fistDamage() { return this.hasSkill('S18') || this.hasCode('T36') ? 2 : 1; },
  /** pociones ofensivas que se pueden lanzar a este enemigo */
  _attackPotions() {
    const c = this.s.combat;
    if (c?.power?.potionImmune) return [];
    return this.allItems().filter((u) => { const k = this.def(u).key; return k in POTION_ELEMENT && !this.immune(POTION_ELEMENT[k]); });
  },
  /** formas de atacar gastando salud en vez de energía (Portador del Destino, Kroling) */
  _payHpOptions() {
    const out = [];
    if (this.equippedUid('AT7')) out.push({ id: 'AT7', label: 'Portador del Destino', extra: 1, text: 'Gasta salud en vez de energía (+1 de salud).' });
    if (this.isRace('Kroling') && !this.s.lvl.kroling) out.push({ id: 'kroling', label: 'Kroling', extra: 0, text: 'Una vez por nivel: gasta salud en vez de energía; si matas, +1 bendición.' });
    return out;
  },

  _damageEnemy(n, cause = '') {
    const c = this.s.combat; if (!c || c.defeated) return;
    c.hp = Math.max(0, c.hp - n);
    this.emit('enemyHp', { uid: c.uid, hp: c.hp, maxHp: c.maxHp, dmg: n, cause });
    if (c.hp <= 0) this._defeat();
  },

  _defeat({ noTreasure = false, byTrick = false } = {}) {
    const c = this.s.combat; if (!c || c.defeated) return;
    c.defeated = true;
    const pw = c.power; const d = this.def(c.uid); const env = this.envFx();
    this.log(`¡Has derrotado a ${c.name}!`, 'combat');
    this.s.stats.kills++;
    this.emit('enemyDefeated', { uid: c.uid });
    if (!c.boss && !c.plot) this.s.z.graveyard.push({ uid: c.uid, spent: false });
    // Espada del Vidente: al derrotar a un enemigo con ella puedes revelar el siguiente enemigo
    if (this.mainWeapon()?.def.key === 'L43' && this.s.z.enemies[0]) {
      const top = this.s.z.enemies[0]; this.emit('peek', { uid: top }); this.log(`Espada del Vidente: el próximo enemigo es ${this.def(top).name}.`, 'item');
    }
    if (c.boss) { this._endCombat('win'); return; }
    const tasks = [];
    const kroling = c.krolingAttack;
    if (!noTreasure) {
      const gold = c.purse + (c.goldOnDefeat || 0) + (env.goldOnDefeat || 0) + (env.goldVs?.[c.weakness] || 0);
      if (gold) tasks.push(function purse() {
        this.gain('gold', gold, c.name); this.log(`Obtienes ${gold} de oro.`, 'combat');
        if (this.hasSkill('S17')) this.gain('energy', gold, 'cazadora de tesoros');
      });
      if (c.treasure === 1) tasks.push(function loot1() {
        // Reglamento p. 14: tesoro tipo 1 = una carta de botín O una moneda de oro (a elegir)
        const options = [{ id: 'loot', label: 'Carta de botín', text: 'Robas una carta aleatoria del mazo de botín.' },
          { id: 'gold', label: 'Moneda de oro', text: 'Coges 1 moneda de oro de la reserva.' }];
        if (pw.potionInsteadOfLoot) options.push({ id: 'potion', label: 'Poción aleatoria', text: 'Robas una carta de poción en vez de botín.' });
        this.ask('choice', { title: `Tesoro: ${d.name}`, text: 'Tesoro tipo 1: elige una carta de botín o una moneda de oro.', options, scene: 'generic', treasure: 1,
          onChoose: (id) => {
            if (id === 'potion') this.gainPotion(1);
            else if (id === 'gold') { this.gain('gold', 1, 'tesoro'); this.log('Coges 1 moneda de oro del tesoro.', 'combat'); if (this.hasSkill('S17')) this.gain('energy', 1, 'cazadora de tesoros'); }
            else this.gainLoot(1);
          } });
      });
      if (c.treasure >= 2) tasks.push(function loot2() { this.gainLoot(1); }, function potion1() { this.gainPotion(1); });
      if (env.potionOnDefeat) tasks.push(function envPotion() { this.log('La Sombra: el enemigo llevaba una poción.', 'env'); this.gainPotion(env.potionOnDefeat); });
    }
    tasks.push(function reward() {
      if (pw.rationOnDefeat) { this.gain('rations', pw.rationOnDefeat, c.name); this.log(`¡Pescado delicioso! +${pw.rationOnDefeat} ración.`, 'combat'); }
      if (pw.eyesOnDefeat) this.addEyes(pw.eyesOnDefeat, c.uid);
      if (pw.blessingOnDefeat) this.gain('blessing', pw.blessingOnDefeat, c.name);
      if (pw.moralityOnDefeat) this.addMorality(pw.moralityOnDefeat);
      if (pw.blessingsByMoralityOnDefeat) { const n = Math.max(0, this.morality()); this.log(`${c.name}: ganas ${n} bendición(es) por tu moral.`, 'combat'); if (n) this.gain('blessing', n, c.name); }
      if (env.blessingOnDefeat) this.gain('blessing', env.blessingOnDefeat, 'entorno');
      if (kroling) { this.gain('blessing', 1, 'kroling'); this.log('Kroling: tu sacrificio es recompensado con una bendición.', 'skill'); }
      if (this.s.mercs.length) this._mercOnDefeat(c);
      if (c.onWin) this.applyOps(c.onWin, d);
    });
    tasks.push(function finish() { this._endCombat('win', c); this._checkEyes(); });
    // los pasos de combate pendientes (contraataque, turno...) dejan de tener sentido
    this.q = this.q.filter((f) => f !== this._cCounter && f !== this._cPlayerTurn && f !== this._cInitial && f !== this._cPre);
    this.insert(...tasks);
  },

  /* ============================================================================ ataque del héroe */
  doAttack({ energy = 0, furia = false, mandoble = false, payHp = null } = {}) {
    const c = this.s.combat; const h = this.hero; const mw = this.mainWeapon();
    const canRoll = !!mw || this.hasSkill('S18');
    energy = Math.max(0, Math.min(3, Math.floor(energy)));
    let hpCost = 0; let hpMode = null;
    if (payHp) {
      hpMode = this._payHpOptions().find((o) => o.id === payHp);
      if (!hpMode) this.fail('No puedes pagar el ataque con salud.');
      if (energy === 0) this.fail('Elige cuántos dados quieres tirar.');
      hpCost = energy + hpMode.extra;
      if (h.hp <= hpCost) this.fail('No tienes salud suficiente.');
    } else if (energy > h.energy) this.fail('No tienes tanta energía.');
    if (energy > 0 && !canRoll) this.fail('Necesitas un arma en la mano principal para tirar dados.');
    if ((furia || mandoble) && energy === 0) this.fail('Para añadir un dado extra tienes que tirar dados.');
    if (furia && !(this.hasSkill('S9') && h.hp > 2 + hpCost)) this.fail('No puedes usar Furia.');
    if (mandoble && !(this.equippedUid('L47') && h.gold >= 1)) this.fail('No puedes pagar el dado extra.');
    this.clear();
    const spent = payHp ? 0 : energy;
    // coste adicional (Araña Gigante)
    if (c.nextCost) { const extra = Math.min(c.nextCost, h.energy - spent); if (extra > 0) { this.lose('energy', extra, 'araña'); this.log(`Pagas ${extra} de energía adicional.`, 'combat'); } c.nextCost = 0; }
    if (payHp) {
      this.lose('hp', hpCost, payHp === 'kroling' ? 'kroling' : 'portador');
      this.log(`${hpMode.label}: gastas ${hpCost} de salud en vez de energía.`, payHp === 'kroling' ? 'skill' : 'item');
      if (payHp === 'kroling') { this.s.lvl.kroling = true; c.krolingAttack = true; }
      if (this.checkDeath()) return;
    } else if (energy > 0) this.lose('energy', energy, 'ataque');
    if (furia) { this.lose('hp', 2, 'furia'); this.log('Furia: gastas 2 de salud para un dado extra.', 'skill'); if (this.checkDeath()) return; }
    if (mandoble) { this.lose('gold', 1, 'mandoble'); this.log('Mandoble Ávido: pagas 1 de oro por un dado extra.', 'item'); }
    if (energy === 0) {
      const dmg = this._fistDamage() + this._firstAttackBonus();
      this.log(`Golpeas con los puños: ${dmg} de daño.`, 'combat');
      this.emit('punch', { dmg });
      c.attacks++;
      this._damageEnemy(dmg, 'puño');
      if (this.s.combat && !c.defeated) this._afterAttack();
      return;
    }
    const n = energy + (furia ? 1 : 0) + (mandoble ? 1 : 0);
    const dice = this.roll(n, 'attack', 'hero');
    c.roll = { dice, energy: spent, used: {}, log: [] };
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
  _firstAttackBonus() { const c = this.s.combat; return c && !c.attacks ? c.firstAttackBonus || 0 : 0; },

  _rerollOptions() {
    const c = this.s.combat; const r = c.roll; const mw = this.mainWeapon(); const opts = []; const lv = this.s.lvl;
    for (const src of this.activeSources()) {
      const mr = src.def.fx?.mayReroll; if (!mr) continue;
      if (mr.vs && c.weakness !== mr.vs) continue;
      if (mr.weaponTag && !mw?.def.fx?.[mr.weaponTag]) continue;
      if (src.slot !== 'skill' && src.uid !== mw?.uid) continue;
      if (!r.dice.some((v) => mr.values.includes(v))) continue;
      opts.push({ id: `some:${src.def.key}`, label: `${src.def.name}: relanzar ${mr.values.join(' y ')}`, values: mr.values, once: true });
    }
    const trofeo = this.equippedUid('T22');
    if (trofeo && !lv.trofeo) opts.push({ id: 'all:T22', label: 'Trofeo: repetir todos los dados', uid: trofeo, once: true });
    const luck = this.equippedUid('T38');
    if (luck) opts.push({ id: 'all:T38', label: 'Poción de Suerte: relanzar todos', uid: luck });
    if (this.hero.blessings.length) opts.push({ id: 'all:blessing', label: 'Bendición: relanzar todos los dados' });
    if (this.hasSkill('S19') && this.hero.energy >= 1) opts.push({ id: 'all:S19', label: 'Estrategia: gasta 1 de energía y relanza todos', once: true });
    if (this.hasMerc('HM6') && !lv.farzad) opts.push({ id: 'all:HM6', label: 'Farzad: relanza todos tus dados (una vez por nivel)', once: true });
    if (this.hasCode('T31') && !lv.flipT31) opts.push({ id: 'flip:T31', label: 'Piedra de Afilar: da la vuelta a un dado', needsDie: true, once: true });
    if (this.hasMerc('HM1') && !lv.flipHM1) opts.push({ id: 'flip:HM1', label: 'Borko: da la vuelta a un dado', needsDie: true, once: true });
    if (this.hasCode('AT1') && !lv.ogre && r.energy > 0 && !r.ogre) opts.push({ id: 'bonus:AT1', label: `Cinturón de Poder de Ogro: +${2 * r.energy} de daño`, once: true });
    return opts.filter((o) => !(o.once && r.used[o.id]));
  },
  _postRoll() {
    const c = this.s.combat; const r = c.roll;
    const opts = this._rerollOptions();
    if (!opts.length) { this._applyAttack(); return; }
    this.ask('postRoll', { dice: r.dice.slice(), options: opts, preview: this.previewDamage(r.dice, r.energy) });
  },
  doReroll(id, die = null) {
    const c = this.s.combat; const r = c.roll; const pr = this.s.prompt;
    const o = pr.options.find((x) => x.id === id);
    if (!o) this.fail('Esa opción ya no está disponible.');
    if (id.startsWith('some:')) {
      const idx = []; r.dice.forEach((v, i) => { if (o.values.includes(v)) idx.push(i); });
      const nv = this.roll(idx.length, 'reroll', 'hero'); idx.forEach((i, k) => { r.dice[i] = nv[k]; });
      this.emit('diceReroll', { dice: r.dice.slice(), idx });
      r.used[id] = true;
      this.log(`Relanzas ${idx.length} dado(s).`, 'combat');
    } else if (id.startsWith('flip:')) {
      const i = Number.isInteger(die) ? die : -1;
      if (i < 0 || i >= r.dice.length) this.fail('Elige el dado al que quieres dar la vuelta.');
      const from = r.dice[i]; r.dice[i] = 7 - from;
      this.s.lvl[id === 'flip:T31' ? 'flipT31' : 'flipHM1'] = true; r.used[id] = true;
      this.emit('diceReroll', { dice: r.dice.slice(), idx: [i], flip: true });
      this.log(`${o.label.split(':')[0]}: el ${from} pasa a ser un ${r.dice[i]}.`, id === 'flip:HM1' ? 'merc' : 'item');
    } else if (id === 'bonus:AT1') {
      r.ogre = true; this.s.lvl.ogre = true; r.used[id] = true;
      this.log(`Cinturón de Poder de Ogro: +${2 * r.energy} de daño en este ataque.`, 'item');
    } else {
      if (id === 'all:T22') { this.s.lvl.trofeo = true; }
      else if (id === 'all:T38') this.discardOwned(o.uid, 'use');
      else if (id === 'all:blessing') this.loseBlessing(1, 'relanzar');
      else if (id === 'all:S19') { this.lose('energy', 1, 'estrategia'); this.log('Estrategia: gastas 1 de energía.', 'skill'); }
      else if (id === 'all:HM6') { this.s.lvl.farzad = true; this.log('Farzad te enseña un golpe mejor.', 'merc'); }
      const nv = this.roll(r.dice.length, 'reroll', 'hero'); nv.forEach((v, i) => { r.dice[i] = v; });
      this.emit('diceReroll', { dice: r.dice.slice(), idx: r.dice.map((_, i) => i) });
      this.log('Relanzas todos tus dados.', 'combat');
      r.used[id] = true;
    }
  },

  /** Daño total de un ataque con estos dados (sin aplicar). */
  previewDamage(dice, energy = dice.length) {
    const c = this.s.combat; const mw = this.mainWeapon(); const fx = mw?.def.fx || {};
    const lvl = this.s.level;
    const elementOk = !this.immune(fx.element);
    let sum = 0;
    for (const v of dice) {
      let e = v;
      if (fx.dieValue && fx.dieValue[v] && elementOk) e = fx.dieValue[v];
      if (fx.oneDamage && v === 1) e = fx.oneDamage;
      if (fx.plusPerSix && v === 6) e += fx.plusPerSix;
      if (fx.plusPerHigh && fx.plusPerHigh.values.includes(v) && c.weakness === fx.plusPerHigh.vs) e += fx.plusPerHigh.n;
      if (fx.plusPerSixLevel && v === 6) e += lvl;
      sum += e;
    }
    let bonus = 0;
    if (fx.attackVs?.[c.weakness]) bonus += fx.attackVs[c.weakness];
    if (fx.attackVsTags && c.tags?.some((t) => fx.attackVsTags.tags.includes(t))) bonus += fx.attackVsTags.n;
    bonus += this.sumFx('attackBonus');
    for (const src of this.activeSources()) { const v = src.def.fx?.attackVsAll?.[c.weakness]; if (v) bonus += v; }
    const off = this.offHand();
    if (this.hasSkill('S10') && off?.def.fx?.dagger) bonus += 2;
    const hasDouble = new Set(dice).size < dice.length && dice.length >= 2;
    if (hasDouble) {
      if (fx.doublesBonus) bonus += fx.doublesBonus;
      if (fx.doublesBonusVs?.[c.weakness]) bonus += fx.doublesBonusVs[c.weakness];
    }
    if (this.hasAffliction('AF1') && c.purse > 0) bonus += energy;
    if (c.boss && this.envFx().bossAttackBonus) bonus += this.envFx().bossAttackBonus;
    bonus += this._firstAttackBonus();
    if (c.roll?.ogre) bonus += 2 * energy;
    return sum + bonus;
  },
  _applyAttack() {
    const c = this.s.combat; const r = c.roll;
    const total = this.previewDamage(r.dice, r.energy);
    this.log(`Atacas con [${r.dice.join(', ')}] → ${total} de daño.`, 'combat');
    const ones = r.dice.filter((v) => v === 1).length;
    const sixes = r.dice.filter((v) => v === 6).length;
    const doubles = new Set(r.dice).size < r.dice.length && r.dice.length >= 2;
    this.emit('attackResolved', { dice: r.dice.slice(), total });
    const heal = this.mainWeapon()?.def.fx?.healPerSix;
    if (heal && sixes) { this.gain('hp', heal * sixes, 'venganza'); this.log(`Venganza: ganas ${heal * sixes} de salud.`, 'item'); }
    c.roll = null; c.attacks++;
    this._damageEnemy(total, 'ataque');
    if (!this.s.combat || c.defeated) return;
    c.krolingAttack = false;
    if (c.power.loseWeaponsOnOnes && ones >= c.power.loseWeaponsOnOnes) {
      this.log(`¡${c.name} devora tus armas!`, 'combat');
      for (const slot of ['MP', 'OM']) { const u = this.s.eq[slot]; if (u && u !== 'TWO' && (slot === 'MP' || this.def(u).slot === 'MP')) this.discardOwned(u, 'devoured'); }
      if (this.s.eq.OM === 'TWO') this.s.eq.OM = null;
    }
    if (c.power.afflictionOnOnes && ones >= c.power.afflictionOnOnes) this.gainAffliction('enemigo');
    // Látigo: si los dados coinciden, vuelves a atacar inmediatamente (sin contraataque)
    if (doubles && this.mainWeapon()?.def.fx?.whip) {
      this.log('Látigo: tus dados coinciden y vuelves a atacar.', 'item');
      this.insert(function nextRound() { if (this.s.combat) this.s.combat.round++; }, this._cPlayerTurn);
      return;
    }
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
    let total = dice.reduce((a, b) => a + b, 0) + this._firstAttackBonus();
    if (d.fx.axe && this.hasSkill('S9')) { total += 5; this.log('Furia: +5 de daño al arrojar el hacha.', 'skill'); }
    this.log(`Arrojas ${d.name} [${dice.join(', ')}] → ${total} de daño. Se pierde.`, 'combat');
    this.removeOwned(uid); this.s.z.removed.push(uid);
    this.emit('throw', { uid, total });
    c.attacks++;
    this._damageEnemy(total, 'arrojar');
    if (this.s.combat && !c.defeated) this._afterAttack();
  },
  potionAttack(uid) {
    const d = this.def(uid); const c = this.s.combat;
    const dice = this.roll(2, 'potion', 'hero');
    let total = dice[0] + dice[1];
    const type = POTION_WEAK[d.key];
    if (type && c.weakness === type) { total += 5; this.log(`¡Es débil al ${weaknessName(type)}! +5.`, 'combat'); }
    const bonus = this.sumFx('potionBonus'); if (bonus) { total += bonus; this.log(`+${bonus} de daño con pociones.`, 'item'); }
    if (this.activeSources().some((s) => s.def.fx?.potionDouble === d.key)) { total *= 2; this.log(`${d.name}: el tomo duplica el daño.`, 'item'); }
    total += this._firstAttackBonus();
    this.log(`Lanzas ${d.name} [${dice.join(', ')}] → ${total} de daño.`, 'combat');
    this.discardOwned(uid, 'use');
    this.emit('potionThrown', { uid, total });
    if (this.isRace('Tritón')) { this.gain('energy', 1, 'tritón'); this.log('Tritón: +1 de energía al atacar con una poción.', 'skill'); }
    c.attacks++;
    this._damageEnemy(total, 'poción');
    if (this.s.combat && !c.defeated) this._afterAttack();
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
      case 'granada': this.discardOwned(o.uid, 'use'); this.log('La Granada de Mano Sagrada derrota al enemigo.', 'item'); this._defeat(); break;
      case 'drain': {
        c.usedDrain = true; this.lose('energy', 2, 'drenaje');
        const d = this.rollOne('drenaje');
        this.log(`Drenaje Vital: infliges ${d} de daño y ganas ${d} de salud.`, 'skill');
        this.gain('hp', d, 'drenaje'); this._damageEnemy(d, 'drenaje'); break;
      }
      case 'sting': { this.s.lvl.sting = true; const d = this.rollOne('aguijon'); this.log(`Aguijón de Grasgol: la flecha inflige ${d} de daño.`, 'item'); this._damageEnemy(d, 'flecha'); break; }
      case 'drainShield': this.s.lvl.drainShield = true; c.blockInitial = true; this.gain('hp', 3, 'escudo'); this.log('Escudo de Drenaje: bloqueas el daño inicial y ganas 3 de salud.', 'item'); break;
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
    if (id === 'fight') {
      if (pr.resolve) { const uid = pr.uid; const side = pr.side; this.insert(function r() { this.resolveDungeon(uid, side); }); return; }
      this.insert(function fight() { this._drawAndFight(opts); }); return;
    }
    if (id === 'wedge') { this.discardOwned(opt.uid, 'use'); this.log('Usas la Cuña de Puerta: evitas el encuentro.', 'item'); return; }
    if (id === 'ring') { this.s.lvl.ring = true; this.log('El Anillo Mágico te protege: evitas la emboscada.', 'item'); return; }
    if (id === 'sexto') { this.s.lvl.sexto = true; this.log('Sexto Sentido: presientes la emboscada y la evitas.', 'skill'); return; }
    if (id === 'vest') { this.s.lvl.vest = true; this.log('Tus vestiduras te permiten escabullirte: evitas la escaramuza.', 'item'); return; }
    if (id === 'correr') { this._flee(); return; }
    if (id === 'boots') {
      this.s.lvl.boots = true; this.log('Botas de la Presteza: atacas primero.', 'item');
      const o2 = { ...opts, ambush: 'player' };
      this.insert(function fight() { this._drawAndFight(o2); }); return;
    }
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
    if (o.free) {
      if (id === 'cultist') this.s.lvl.cultist = true;
      this.log(`${o.label}: evitas el enfrentamiento con ${c.name}.`, 'combat');
      this.clear(); this._endCombat('avoid'); return;
    }
    this.lose(o.res === 'gold' ? 'gold' : o.res === 'blessing' ? 'blessing' : 'rations', o.n, 'evitar');
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
/** reacción ante el ataque enemigo: luck (Poción de Suerte) · moon (Daga de la Luna) · cape (Capa de Lana) · garlic (Ajo) */
function enemyReact(id, pr) {
  const o = pr.options?.find((x) => x.id === id);
  if (!o) this.fail('Esa reacción no está disponible.');
  this.clear();
  const react = { ...(pr.react || {}) };
  const reroll = () => this.roll(2, pr.kind === 'initial' ? 'enemy-initial' : 'enemy-counter', 'enemy');
  if (id === 'luck') { this.discardOwned(o.uid, 'use'); react.luck = true; this.log('Poción de Suerte: el enemigo relanza sus dados.', 'item'); this._enemyResolve(pr.kind, reroll(), react); }
  else if (id === 'moon') { this.s.lvl.moon = true; react.moon = true; this.log('Daga de la Luna: el enemigo relanza sus dados.', 'item'); this._enemyResolve(pr.kind, reroll(), react); }
  else if (id === 'cape') { this.s.lvl.cape = true; react.cape = true; react.minus = (react.minus || 0) + 1; this.log('Capa de Lana: restas 1 al daño inicial.', 'item'); this._enemyResolve(pr.kind, pr.dice, react); }
  else if (id === 'garlic') { this.discardOwned(o.uid, 'use'); this.log('Ajo: el no muerto retrocede y su ataque no te alcanza.', 'item'); this.emit('enemyMiss', { kind: pr.kind, avoided: true }); }
}
ACTIONS.enemyReact = { in: ['enemyRoll'], run({ id }, pr) { enemyReact.call(this, id, pr); } };
ACTIONS.luckReroll = {
  in: ['enemyRoll'],
  run(_, pr) { if (!pr.uid) this.fail('No tienes una Poción de Suerte.'); enemyReact.call(this, 'luck', pr); },
};
ACTIONS.luckKeep = { in: ['enemyRoll'], run(_, pr) { this.clear(); this._enemyResolve(pr.kind, pr.dice, { ...(pr.react || {}), done: true }); } };
ACTIONS.throwItem = { in: ['attack'], run({ uid }, pr) { if (!pr.throwables.includes(uid)) this.fail('No puedes arrojar eso.'); this.clear(); this.throwWeapon(uid); } };
ACTIONS.potionAttack = { in: ['attack'], run({ uid }, pr) { if (!pr.potions.includes(uid)) this.fail('No es una poción ofensiva.'); this.clear(); this.potionAttack(uid); } };
ACTIONS.special = {
  in: ['attack'],
  run({ id }) { this.doSpecial(id); this.clear(); const c = this.s.combat; if (c && !c.defeated && !this.s.over) this.insert(this._cPlayerTurn); },
};
ACTIONS.reroll = { in: ['postRoll'], run({ id, die }) { this.doReroll(id, die); this.clear(); this.insert(this._postRoll); } };
ACTIONS.accept = { in: ['postRoll'], run() { this.clear(); this._applyAttack(); } };
