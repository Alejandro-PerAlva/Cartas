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
    const lvl = this.eLvl();
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
    if (d.power?.hazard) return this._hazard(uid, d, opts);   // ANEMIA: Nube Gaseosa, Arenas Movedizas, Poza de Ácido
    if (d.power?.mutant) return this._startMutant(uid, opts); // ANEMIA: Mutante
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
    const lvl = this.eLvl();
    const base = opts.stats ? { ...d, ...opts.stats } : d; // Mutante, Gral, La Parca… (atributos propios del combate)
    const weaknesses = base.weaknesses || [base.weakness];
    if (this.hasAffliction('AF3') && base.weakness === 'undead' && !opts.parca) {
      if (opts.boss) { this.s.z.bosses.push(uid); this.s.game.bossPending = true; this._die('Necrofobia: huyes del jefe no muerto.'); return; }
      const dmg = (base.damage || 0) + lvl;
      this.log(`Necrofobia: huyes de ${d.name} y sufres ${dmg} de daño.`, 'affliction');
      this.lose('hp', dmg, 'necrofobia');
      if (opts.plot) this._plotEyes(uid); else this.s.z[opts.source === 'mimic' ? 'lootDiscard' : 'enemiesDiscard'].push(uid);
      if (opts.series) this._seriesNext({ series: opts.series }, 'avoid'); // La Criatura / Arena de Combate: la serie sigue
      this.checkDeath();
      return;
    }
    const env = this.envFx();
    const envDmg = (env.dmgAll || 0) + weaknesses.reduce((n, w) => n + (env.dmgVs?.[w] || 0), 0);
    const power = { ...(opts.stats?.power ?? d.power ?? {}) };
    const health = typeof base.health === 'number' ? base.health : 0;
    const c = {
      uid, name: d.name, power, weakness: base.weakness, weaknesses: [...weaknesses], damage: (base.damage || 0) + envDmg, purse: base.purse || 0, treasure: base.treasure || 0,
      hp: health + (opts.hpBonus || 0), maxHp: health + (opts.hpBonus || 0), baseHp: health, tags: base.tags || d.tags || [],
      ambush: opts.ambush || 'normal', initialBonus: opts.initialBonus || 0,
      boss: !!opts.boss, plot: !!opts.plot, source: opts.source || 'dungeon', round: 1, nextCost: 0, blockInitial: false, mimic: opts.source === 'mimic',
      firstAttackBonus: opts.firstAttackBonus || 0, goldOnDefeat: opts.goldOnDefeat || 0, onWin: opts.onWin || null, attacks: 0,
      cardKind: opts.cardKind || null, series: opts.series || null, asUndead: !!opts.asUndead, noTreasure: !!opts.noTreasure, noGrave: !!opts.noGrave,
      parca: !!opts.parca, gral: !!opts.gral, fistOnly: true, miniboss: !!d.miniboss, stuck: false, avoidBonus: 0,
    };
    if (power.energyDuel) { // Tzxefytd: no tiene salud sino energía (d6+10 redondeado a par); c.hp/maxHp muestran esa energía
      const r = this.rollOne('tzxefytd'); const e = r + power.energyDuel.base; const even = e % 2 ? e + 1 : e;
      c.hp = c.maxHp = even; this.log(`Tzxefytd tiene ${even} de energía (d6 = ${r}) y gasta ${power.energyDuel.step} en cada ataque.`, 'combat');
    }
    this.s.combat = c;
    this.emit('combatStart', { uid, hp: c.hp, maxHp: c.maxHp, ambush: c.ambush, boss: c.boss });
    this.log(`¡Combate contra ${d.name}! ${power.energyDuel ? 'Energía' : 'Salud'} ${c.hp}${c.ambush === 'player' ? ' · tienes la iniciativa' : c.ambush === 'enemy' ? ' · el enemigo te sorprende' : ''}.`, 'combat');
    if (envDmg) this.log(`Entorno: ${d.name} ${envDmg > 0 ? `inflige +${envDmg}` : `inflige ${envDmg}`} de daño en este nivel.`, 'env');
    if (env.bossBlessings && (opts.boss || d.miniboss)) { this.log('El Reino Arborícola te bendice antes del combate.', 'env'); this.gain('blessing', env.bossBlessings, 'entorno'); }
    if (this.s.mercs.length && !c.gral && !c.parca) this._mercOnCombat(c);
    this.insert(this._cAvoidEnemy, this._cPre, this._cInitial, this._cPlayerTurn);
    if (this.s.game.curse && !c.parca) { // Aquelarre: maldición, 1 de veneno antes de cada combate
      this.log('La maldición del aquelarre te envenena antes del combate.', 'plot'); this.addPoison(1, 'maldición'); this.checkDeath();
    }
  },

  /** Cierra un combate. `c` puede no ser el combate actual: el botín de un enemigo derrotado puede destapar un
   *  Mimético, que se combate antes de terminar de cobrar el tesoro del primero. */
  _endCombat(result, c = this.s.combat) {
    if (!c || c.ended) return;
    c.ended = true;
    if (this.s.combat === c) this.s.combat = null;
    this.emit('combatEnd', { result, uid: c.uid, boss: c.boss, ...(c.escaped ? { escaped: true } : {}) });
    this._afterCombatHooks?.(result, c); // Sangre de Lobo, Pitonisa, series de combates, La Parca…
    if (c.parca) return;
    if (result === 'win' && c.boss) { this.victory(); return; }
    if (result === 'avoid') {
      if (c.plot) this._plotEyes(c.uid);
      else if (c.escaped) { this.s.z.enemies.push(c.uid); this.s.z.enemies = this.rng.shuffle(this.s.z.enemies); } // Asesino Sigiloso
      else if (c.gral) { /* el esbirro ya salió de la partida */ }
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
    if (c.boss && this.envFx().avoidBossRation) { // La Ciudad Caída: 1 ración para evitar al jefe final (y +1 de energía)
      options.push({ id: 'ciudad', label: 'Gastar 1 ración', text: 'Evitas al jefe final y ganas 1 de energía.', res: 'rations', n: 1, bossAvoid: true, disabled: this.hero.rations < 1, reason: 'No te alcanza' });
    }
    if (c.power.freeAvoid) options.push({ id: 'centauro', free: true, label: 'Evitar el enfrentamiento', text: 'El Centauro te deja pasar si lo deseas.' });
    if (!c.boss) {
      if (this.hasSkill('ANS7') && !this.s.lvl.lirica && this._isWeak(c, 'undead'))
        options.push({ id: 'lirica', free: true, label: 'Lírica Bestial', text: 'Evitas a este no muerto cantando death metal (una vez por nivel).' });
      if (this.hasCode('galnok:L25') && this._isWeak(c, 'undead') && c.baseHp <= 4)
        options.push({ id: 'mask', free: true, label: 'Máscara de Mizlak', text: 'Evitas a este no muerto de 4 o menos de salud base.' });
      if (this.hasCode('L45') && !this.s.lvl.cultist && c.baseHp <= 5)
        options.push({ id: 'cultist', free: true, label: 'Capa de Cultista', text: 'Evitas a este enemigo de 5 o menos de salud base (una vez por nivel).' });
      if (this.isRace('Semiorco') && c.tags.some((t) => ['orc', 'grunkle', 'goblin'].includes(t)))
        options.push({ id: 'halforc', free: true, label: 'Semiorco', text: 'Los orcos, grunkles y goblins te dejan pasar.' });
    }
    if (options.some((o) => !o.disabled)) this.ask('avoidEnemy', { options, name: c.name });
  },
  /** ¿Es el enemigo del combate débil a este tipo? (cuenta las dos debilidades de un jefe y la Arena de Combate) */
  _isWeak(c, type) { return !!c && (c.weaknesses ? c.weaknesses.includes(type) : c.weakness === type) || (type === 'undead' && !!c?.asUndead); },
  /** suma de un mapa de bonificaciones por debilidad ({fire: 3}) para este enemigo */
  _vsSum(map, c = this.s.combat) {
    if (!map || !c) return 0;
    const list = new Set([...(c.weaknesses || [c.weakness]), ...(c.asUndead ? ['undead'] : [])]);
    let n = 0; for (const w of list) n += map[w] || 0;
    return n;
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
  _specialOptions(phase = 'pre') {
    const c = this.s.combat; const opts = [];
    const acorn = this.equippedUid('T40');
    if (acorn && !c.boss && !this.envFx().noBellota) opts.push({ id: 'bellota', uid: acorn, label: 'Bellota Mágica', text: 'Descártala para derrotar a este enemigo (sin tesoro).' });
    const nm = this.equippedUid('L49');
    if (nm && !c.power.potionImmune && !this.immune('holy')) {
      if (this._isWeak(c, 'undead') && c.hp <= 5 && !c.boss) opts.push({ id: 'nomuerto_kill', uid: nm, label: 'Poción de la No Muerte', text: 'Destruye a este enemigo no muerto (5 o menos de salud).' });
      if (!this._isWeak(c, 'undead')) opts.push({ id: 'nomuerto_weak', uid: nm, label: 'Poción de la No Muerte', text: 'Este enemigo pasa a tener la debilidad no muerto.' });
    }
    const gren = this.equippedUid('L40');
    if (gren && !c.boss && c.baseHp <= 6 && !this.immune('holy'))
      opts.push({ id: 'granada', uid: gren, label: 'Granada de Mano Sagrada', text: 'Descártala para derrotar a este enemigo (6 o menos de salud base).' });
    return opts.concat(this._anemiaSpecials?.(c, phase) || []);
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
    const sling = this.sumFx('sling'); // David Galahad: 1 de daño con su honda antes del daño inicial
    if (sling && !c.usedSling) {
      c.usedSling = true; this.log(`David Galahad dispara su honda: ${sling} de daño antes del daño inicial.`, 'merc');
      this._damageEnemy(sling, 'david');
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
    if (c.power.femaleNoInitial && this.heroFemale()) { this.log(`${c.name} no ataca primero contra una heroína.`, 'combat'); return; }
    if (c.power.stealRation && c.cardKind !== 'ambush') { // Hombre Cerdo: en vez de su ataque inicial, te roba una ración
      if (this.hero.rations > 0) { this.lose('rations', 1, c.name); this.log(`${c.name} te roba 1 ración y se la come.`, 'combat'); }
      else this.log(`${c.name} busca una ración que robarte, pero no tienes ninguna.`, 'combat');
      return;
    }
    if (c.blockInitial) { this.log('Has bloqueado el daño inicial.', 'combat'); return; }
    const twice = c.power.doubleInitialIfAmbush2 && c.ambush === 'enemy';
    this.insert(function strike1() { this._enemyStrike('initial'); },
      ...(twice ? [function strike2() { const k = this.s.combat; if (k && !k.defeated && !this.s.over) { this.log(`${k.name} ataca por segunda vez.`, 'combat'); this._enemyStrike('initial'); } }] : []));
  },
  _cCounter() {
    const c = this.s.combat; if (!c || this.s.over || c.defeated) return;
    this._enemyStrike('counter');
    if (c.power.counterTwice) this.insert(function counter2() { // Unicornio Bicéfalo: 2 ataques al contraatacar
      const k = this.s.combat; if (k && !k.defeated && !this.s.over) { this.log(`${k.name} ataca por segunda vez.`, 'combat'); this._enemyStrike('counter'); }
    });
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
      if (fx.reduceVs && c) total += this._vsSum(fx.reduceVs, c);
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
    if (c.avoidBonus) base += c.avoidBonus;                                                 // Ogro: +1 tras un ataque evitado
    return base;
  },

  _enemyStrike(kind) {
    const c = this.s.combat; if (!c || c.defeated || this.s.over) return;
    let dice = this.roll(2, kind === 'initial' ? 'enemy-initial' : 'enemy-counter', 'enemy');
    if (c.power.rerollDoubles && dice[0] === dice[1]) { // La Parca: con dobles lanza ambos dados de nuevo
      this.log(`${c.name} saca dobles [${dice[0]}, ${dice[1]}] y vuelve a lanzar ambos dados.`, 'combat');
      dice = this.roll(2, kind === 'initial' ? 'enemy-initial' : 'enemy-counter', 'enemy');
    }
    if (c.power.energyDuel) this._duelDrain(c); // Tzxefytd: cada ataque le cuesta energía
    this._enemyResolve(kind, dice, {});
  },
  /** reacciones del héroe ante un ataque enemigo que va a hacer daño */
  _enemyReactions(kind, react) {
    const c = this.s.combat; const opts = [];
    const luck = this.equippedUid('T38');
    if (luck && !react.luck) opts.push({ id: 'luck', uid: luck, label: 'Poción de Suerte', text: 'Descártala: el enemigo relanza sus dados.' });
    if (this.mainWeapon()?.def.key === 'T20' && !this.s.lvl.moon && !react.moon) opts.push({ id: 'moon', label: 'Daga de la Luna', text: 'Relanza la tirada del enemigo (una vez por nivel).' });
    if (kind === 'initial' && this.hasCode('T24') && !this.s.lvl.cape && !react.cape) opts.push({ id: 'cape', label: 'Capa de Lana', text: 'Resta 1 a este daño inicial (una vez por nivel).' });
    if (this.hasSkill('ANS5') && !react.fase && this.hero.energy >= 1 && !this.twoHanded())
      opts.push({ id: 'fase', label: 'Doble Fase', text: 'Gasta 1 de energía y tira 1d6: 1-2 el enemigo te inflige +1; 3-4 fallas; 5-6 evitas el ataque.' });
    const garlic = this.equippedUid('T33');
    if (garlic && this._isWeak(c, 'undead')) opts.push({ id: 'garlic', uid: garlic, label: 'Ajo', text: 'Descártalo para evitar este ataque del no muerto.' });
    return opts;
  },
  _enemyResolve(kind, dice, react = {}) {
    const c = this.s.combat; if (!c || c.defeated) return;
    const [a, b] = dice; const pw = c.power;
    const doubles = a === b;
    const sed = this.hasAffliction('AF1') && c.purse > 0;
    const hitsOnDoubles = sed || pw.noMissOnDoubles || pw.doublesHitDie;
    const miss = doubles && !hitsOnDoubles;
    let diff = doubles && pw.doublesHitDie ? a + (pw.doublesHitPlus || 0) : Math.abs(a - b);
    if (pw.doubleVsBare && !this.mainWeapon() && !miss) diff *= 2; // Gigante de los Hielos: tirada doble contra manos desnudas
    const base = this._enemyDamageBase(kind);
    const dmg = pw.noDamageAttack ? 0 : Math.max(0, diff + base + (react.plus || 0));
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
      this._enemyAvoided(c);
      this._enemyDoubles();
      return;
    }
    if (c.gral && final >= this.hero.hp) { this._gralRobs(c); return; } // Gral: si fuese a matarte, te roba todo el oro
    const info = { a, b, diff, base, dmg, red, react };
    if (final > 0 && final >= this.hero.hp && this._offerArm?.(c, (noDamage) => this._enemyApply(kind, final, doubles, info, { noDamage }))) return; // Justo Antes de Morir
    this._enemyApply(kind, final, doubles, info);
  },
  /** aplica el daño de un ataque enemigo que ha impactado */
  _enemyApply(kind, final, doubles, { a, b, diff, base, dmg, red, react }, { noDamage = false } = {}) {
    const c = this.s.combat; if (!c || this.s.over) return;
    this.log(`${c.name} ataca [${a}, ${b}→${diff}] + ${base}${react.minus ? ` (−${react.minus})` : ''} = ${dmg}; armadura −${red - (react.minus || 0)}: sufres ${noDamage ? 0 : final}.`, 'combat');
    if (final > 0 && !noDamage) this.lose('hp', final, kind === 'initial' ? 'daño inicial' : 'contraataque');
    this.emit('enemyHit', { kind, dmg: noDamage ? 0 : final });
    if (final === 0) this._enemyAvoided(c); else c.avoidBonus = 0;
    this._onHit(kind, final);
    if (doubles) this._enemyDoubles();
    this.checkDeath();
  },
  /** Ogro: si evitas el daño de su ataque, el siguiente suma +1 */
  _enemyAvoided(c) { if (c?.power?.avoidGrows) { c.avoidBonus = c.power.avoidGrows; this.log(`${c.name} se enfurece: su próximo ataque suma +${c.power.avoidGrows}.`, 'combat'); } },
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
    if (pw.sticky && !c.stuck) { c.stuck = true; this.log(`${c.name} se adhiere a ti: te infligirá 1 de daño cuando ataques.`, 'combat'); }
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
    if (c.duelEmpty) { this.log(`${c.name} se ha quedado sin energía: ¡has resistido!`, 'combat'); this._defeat(); return; } // Tzxefytd
    if (this.envFx().roundDrain && !c.parca) { // Cielo Resquebrajado: 1 de energía (o de salud) por ronda
      if (this.hero.energy > 0) { this.lose('energy', 1, 'cielo'); this.log('Cielo Resquebrajado: gastas 1 de energía en esta ronda.', 'env'); }
      else { this.lose('hp', 1, 'cielo'); this.log('Cielo Resquebrajado: sin energía, gastas 1 de salud en esta ronda.', 'env'); if (this.checkDeath()) return; }
    }
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
      specials: this._specialOptions('attack'),
      fist: this._fistDamage(),
      payHp: canRoll ? this._payHpOptions() : [],
      ...(c.restMode ? { rest: { mode: c.restMode, skipped: c.restSkips || 0 } } : {}),   // Energía Potencial / Absorción
      ...(c.power.noDamage ? { duel: true } : {}),                                          // Tzxefytd: no se le puede dañar
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
    if (c.power.noDamage) { this.log(`No puedes infligir daño a ${c.name}.`, 'combat'); return; }
    if (cause !== 'puño') c.fistOnly = false;
    if (c.power.dodge && n > 0 && cause !== 'estrella') { // Samurái de las Sombras: solo impactas con 5-6 en un d6
      const r = this.rollOne('esquiva');
      if (r < c.power.dodge) { this.log(`${c.name} es demasiado rápido (${r}): evade tu ataque y contraataca.`, 'combat'); return; }
      this.log(`Impactas al Samurái (${r}).`, 'combat');
    }
    c.hp = Math.max(0, c.hp - n);
    this.emit('enemyHp', { uid: c.uid, hp: c.hp, maxHp: c.maxHp, dmg: n, cause });
    if (c.hp === 1 && cause !== 'estrella' && cause !== 'david' && this.mainWeapon()?.def.fx?.finishAtOne) { // Espada Samurái
      this.log(`${this.mainWeapon().def.name}: el enemigo queda con 1 de salud y muere.`, 'item');
      c.hp = 0; this.emit('enemyHp', { uid: c.uid, hp: 0, maxHp: c.maxHp, dmg: 1, cause: 'espada' });
    }
    if (c.hp <= 0) { if (c.power.escapeOnZero) this._escape(); else this._defeat(); }
  },
  /** Asesino Sigiloso: se filtra por una grieta y su carta vuelve a barajarse en el mazo de enemigos */
  _escape() {
    const c = this.s.combat; if (!c || c.defeated) return;
    c.defeated = true; c.escaped = true;
    this.log(`${c.name} muta en un líquido y se filtra por una grieta del suelo.`, 'combat');
    this.emit('enemyEscaped', { uid: c.uid });
    this.q = this.q.filter((f) => f !== this._cCounter && f !== this._cPlayerTurn && f !== this._cInitial && f !== this._cPre);
    this.insert(function escaped() { this._endCombat('avoid', c); });
  },

  _defeat({ noTreasure = false, byTrick = false } = {}) {
    const c = this.s.combat; if (!c || c.defeated) return;
    c.defeated = true;
    const pw = c.power; const d = this.def(c.uid); const env = this.envFx();
    this.log(`¡Has derrotado a ${c.name}!`, 'combat');
    this.s.stats.kills++;
    this.emit('enemyDefeated', { uid: c.uid });
    if (!c.boss && !c.plot && !c.noGrave && !c.parca) this.s.z.graveyard.push({ uid: c.uid, spent: false, ...(this.def(c.uid).power?.mutant ? { weakness: c.weakness } : {}) });
    // Espada del Vidente: al derrotar a un enemigo con ella puedes revelar el siguiente enemigo
    if (this.mainWeapon()?.def.key === 'L43' && this.s.z.enemies[0]) {
      const top = this.s.z.enemies[0]; this.emit('peek', { uid: top }); this.log(`Espada del Vidente: el próximo enemigo es ${this.def(top).name}.`, 'item');
    }
    if (c.boss) { this._endCombat('win'); return; }
    const tasks = [];
    const kroling = c.krolingAttack;
    noTreasure = noTreasure || c.noTreasure || c.parca;
    if (this.s.game.curse && c.fistOnly && c.attacks > 0) { this.s.game.curse = false; this.log('Derrotas a tu enemigo a puñetazos: la maldición del aquelarre se rompe.', 'plot'); }
    if (c.gral) { const m = this._mercByKey('ANM2'); if (m) this._mercLeave(m, 'Lo has derrotado.'); }
    if (!noTreasure) {
      const gold = c.purse + (c.goldOnDefeat || 0) + (env.goldOnDefeat || 0) + this._vsSum(env.goldVs, c);
      if (gold) tasks.push(function purse() {
        this.gain('gold', gold, c.name); this.log(`Obtienes ${gold} de oro.`, 'combat');
        if (this.hasSkill('S17')) this.gain('energy', gold, 'cazadora de tesoros');
      });
      if (c.treasure === 1 && this.hasAffliction('ANAF2')) tasks.push(function goldFever() { // Fiebre del Oro: siempre la moneda
        this.gain('gold', 1, 'fiebre del oro'); this.log('Fiebre del Oro: eliges siempre 1 de oro en vez de botín.', 'affliction'); if (this.hasSkill('S17')) this.gain('energy', 1, 'cazadora de tesoros');
      });
      else if (c.treasure === 1) tasks.push(function loot1() {
        // Reglamento p. 14: tesoro tipo 1 = una carta de botín O una moneda de oro (a elegir)
        const options = [{ id: 'loot', label: 'Carta de botín', text: 'Robas una carta aleatoria del mazo de botín.' },
          { id: 'gold', label: 'Moneda de oro', text: 'Coges 1 moneda de oro de la reserva.' }];
        if (pw.potionInsteadOfLoot) options.push({ id: 'potion', label: 'Poción aleatoria', text: 'Robas una carta de poción en vez de botín.' });
        this.ask('choice', { title: `Tesoro: ${d.name}`, source: c.uid, text: 'Tesoro tipo 1: elige una carta de botín o una moneda de oro.', options, scene: 'generic', treasure: 1,
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
      if (this.s.mercs.length && !c.gral) this._mercOnDefeat(c);
      if (c.onWin) this.applyOps(c.onWin, d);
    });
    if (this.heroFx('eatEnemy') && !c.boss && !c.plot && !c.noGrave && !c.parca) tasks.push(function eatEnemy() { // La Bestia
      this.ask('choice', { title: 'La Bestia', text: `Puedes comerte a ${d.name} para ganar 2 fichas de energía (su carta ya no servirá como experiencia).`, scene: 'generic',
        options: [{ id: 'eat', label: 'Comérselo', text: '+2 de energía' }, { id: 'no', label: 'Dejarlo', text: '' }],
        onChoose: (id) => { if (id !== 'eat') return; const e = this.s.z.graveyard.find((x) => x.uid === c.uid); if (e) e.spent = true; this.gain('energy', 2, 'bestia'); this.log(`La Bestia devora a ${d.name}: +2 de energía.`, 'skill'); } });
    });
    tasks.push(function finish() { this._endCombat('win', c); this._checkEyes(); });
    // los pasos de combate pendientes (contraataque, turno...) dejan de tener sentido
    this.q = this.q.filter((f) => f !== this._cCounter && f !== this._cPlayerTurn && f !== this._cInitial && f !== this._cPre);
    this.insert(...tasks);
  },

  /* ============================================================================ ataque del héroe */
  doAttack({ energy = 0, furia = false, mandoble = false, payHp = null } = {}) {
    const c = this.s.combat; const h = this.hero; const mw = this.mainWeapon();
    if (c.power.noDamage) { this.clear(); this.log(`Resistes los ataques de ${c.name}: no puedes hacerle daño.`, 'combat'); this._afterAttack(); return; } // Tzxefytd
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
    if (this._attackStart(c)) return; // la Masa Ósea puede matarte al desprenderse
    if (energy === 0) {
      let dmg = this._fistDamage() + this._firstAttackBonus() + (c.restBonusNow || 0);
      if (this.s.variants?.ceroEnergia) { // Cero Energía: el puñetazo exige una tirada d6
        const d = this.rollOne('cero-energia'); const hurt = d <= 3; const hit = d === 2 || d === 3 || d >= 5;
        this.log(`Cero Energía (${d}): ${hit ? 'impactas' : 'fallas'}${hurt ? ' y pierdes 1 de salud' : ''}.`, 'combat');
        if (hurt) { this.lose('hp', 1, 'puño'); if (this.checkDeath()) return; }
        if (!hit) dmg = 0;
      }
      c.restBonusNow = 0;
      if (dmg > 0) { this.log(`Golpeas con los puños: ${dmg} de daño.`, 'combat'); this.emit('punch', { dmg }); }
      c.attacks++;
      if (dmg > 0) this._damageEnemy(dmg, 'puño');
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
  /** al empezar cualquier ataque: acaba el modo reposo (Energía Potencial / Absorción) y la Masa Ósea adherida te daña */
  _attackStart(c) {
    c.restBonusNow = c.restMode === 'power' ? 2 * (c.restSkips || 0) : 0;
    c.restMode = null; c.restSkips = 0;
    if (c.restBonusNow) this.log(`Absorción: +${c.restBonusNow} de daño en este ataque.`, 'item');
    if (c.stuck) { c.stuck = false; this.log(`${c.name} se desprende hiriéndote: pierdes 1 de salud.`, 'combat'); this.lose('hp', 1, 'masa ósea'); return this.checkDeath(); }
    return false;
  },
  _firstAttackBonus() { const c = this.s.combat; return c && !c.attacks ? c.firstAttackBonus || 0 : 0; },

  _rerollOptions() {
    const c = this.s.combat; const r = c.roll; const mw = this.mainWeapon(); const opts = []; const lv = this.s.lvl;
    for (const src of this.activeSources()) {
      const mr = src.def.fx?.mayReroll; if (!mr) continue;
      if (mr.vs && !this._isWeak(c, mr.vs)) continue;
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
      if (fx.plusPerHigh && fx.plusPerHigh.values.includes(v) && this._isWeak(c, fx.plusPerHigh.vs)) e += fx.plusPerHigh.n;
      if (fx.plusPerSixLevel && v === 6) e += lvl;
      sum += e;
    }
    let bonus = 0; let undeadPart = 0; // undeadPart: lo que suma contra no muertos (El Rey de los Muertos solo deja la mitad)
    bonus += this._vsSum(fx.attackVs, c); undeadPart += this._isWeak(c, 'undead') ? fx.attackVs?.undead || 0 : 0;
    if (fx.attackVsTags && c.tags?.some((t) => fx.attackVsTags.tags.includes(t))) bonus += fx.attackVsTags.n;
    bonus += this.sumFx('attackBonus');
    for (const src of this.activeSources()) {
      const m = src.def.fx?.attackVsAll; if (!m) continue;
      bonus += this._vsSum(m, c); undeadPart += this._isWeak(c, 'undead') ? m.undead || 0 : 0;
    }
    const off = this.offHand();
    if (this.hasSkill('S10') && off?.def.fx?.dagger) bonus += 2;
    const hasDouble = new Set(dice).size < dice.length && dice.length >= 2;
    if (hasDouble) {
      if (fx.doublesBonus) bonus += fx.doublesBonus;
      bonus += this._vsSum(fx.doublesBonusVs, c); undeadPart += this._isWeak(c, 'undead') ? fx.doublesBonusVs?.undead || 0 : 0;
    }
    if (c.power.halveUndeadBonus && undeadPart) bonus -= undeadPart - Math.floor(undeadPart / 2);
    if (this.hasAffliction('AF1') && c.purse > 0) bonus += energy;
    if (c.boss && this.envFx().bossAttackBonus) bonus += this.envFx().bossAttackBonus;
    bonus += this._firstAttackBonus();
    if (c.roll?.ogre) bonus += 2 * energy;
    bonus += c.restBonusNow || 0;
    return Math.max(0, sum + bonus - (c.power.attackPenalty || 0)); // Perro No Muerto: tus tiradas restan -2
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
    c.roll = null; c.attacks++; c.restBonusNow = 0;
    const silver = c.power.silverKill && this.mainWeapon()?.def.key === c.power.silverKill && total > 0; // Hombre Lobo + Daga de la Luna
    if (silver) this.log(`${this.mainWeapon().def.name}: un solo impacto basta para matar a ${c.name}.`, 'item');
    const weaponBefore = this.mainWeapon();
    this._damageEnemy(silver ? c.hp : total, 'ataque');
    if (c.power.loseWeaponUnder && total < c.power.loseWeaponUnder && weaponBefore && this.s.combat === c && !c.defeated) { // Reptiliano
      this.log(`Tu ataque inflige menos de ${c.power.loseWeaponUnder}: ¡pierdes ${weaponBefore.def.name}!`, 'combat'); this.discardOwned(weaponBefore.uid, 'broken');
    }
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
    if (c.power.timeLord && this._timeLordStun(c)) return;
    this.insert(this._cCounter, function nextRound() { if (this.s.combat) { this.s.combat.round++; } }, this._cPlayerTurn);
  },

  /* ============================================================================ armas arrojadizas y pociones */
  throwWeapon(uid) {
    const d = this.def(uid); const c = this.s.combat;
    const n = d.fx.throwDice;
    if (this._attackStart(c)) return;
    const dice = this.roll(n, 'throw', 'hero');
    let total = dice.reduce((a, b) => a + b, 0) + this._firstAttackBonus() + (c.restBonusNow || 0); c.restBonusNow = 0;
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
    if (this._attackStart(c)) return;
    const dice = this.roll(2, 'potion', 'hero');
    let total = dice[0] + dice[1] + (c.restBonusNow || 0); c.restBonusNow = 0;
    const type = POTION_WEAK[d.key];
    if (type && this._isWeak(c, type)) {
      const plus = type === 'undead' && c.power.halveUndeadBonus ? 2 : 5; // El Rey de los Muertos: la mitad (redondeada hacia abajo)
      total += plus; this.log(`¡Es débil al ${weaknessName(type)}! +${plus}.`, 'combat');
    }
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
      case 'nomuerto_weak': this.discardOwned(o.uid, 'use'); c.weakness = 'undead'; c.weaknesses = ['undead']; this.log('El enemigo es ahora débil al no muerto.', 'item'); break;
      case 'granada': this.discardOwned(o.uid, 'use'); this.log('La Granada de Mano Sagrada derrota al enemigo.', 'item'); this._defeat(); break;
      case 'drain': {
        c.usedDrain = true; this.lose('energy', 2, 'drenaje');
        const d = this.rollOne('drenaje');
        this.log(`Drenaje Vital: infliges ${d} de daño y ganas ${d} de salud.`, 'skill');
        this.gain('hp', d, 'drenaje'); this._damageEnemy(d, 'drenaje'); break;
      }
      case 'sting': { this.s.lvl.sting = true; const d = this.rollOne('aguijon'); this.log(`Aguijón de Grasgol: la flecha inflige ${d} de daño.`, 'item'); this._damageEnemy(d, 'flecha'); break; }
      case 'drainShield': this.s.lvl.drainShield = true; c.blockInitial = true; this.gain('hp', 3, 'escudo'); this.log('Escudo de Drenaje: bloqueas el daño inicial y ganas 3 de salud.', 'item'); break;
      default: if (!this._anemiaSpecial?.(id, c, o)) this.fail('Opción desconocida.');
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
    if (o.bossAvoid) { // La Ciudad Caída: 1 ración para evitar al jefe final (+1 de energía)
      this.lose('rations', 1, 'ciudad caída'); this.gain('energy', 1, 'ciudad caída'); this.clear();
      this.log('Gastas 1 ración y rodeas al jefe final entre las ruinas: ganas 1 de energía y termina la aventura.', 'boss');
      c.defeated = true; this._dropCombatTasks(); this.insert(function evade() { this._endCombat('avoid', c); this.endGame('victory', 'Evitas al jefe final en La Ciudad Caída.', { ending: 'evaded' }); });
      return;
    }
    if (o.free) {
      if (id === 'cultist') this.s.lvl.cultist = true;
      if (id === 'lirica') this.s.lvl.lirica = true;
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
  else if (id === 'garlic') { this.discardOwned(o.uid, 'use'); this.log('Ajo: el no muerto retrocede y su ataque no te alcanza.', 'item'); this.emit('enemyMiss', { kind: pr.kind, avoided: true }); this._enemyAvoided(this.s.combat); }
  else if (id === 'fase') { // Doble Fase (ANEMIA)
    this.lose('energy', 1, 'doble fase'); react.fase = true;
    const d = this.rollOne('doble-fase');
    if (d >= 5) { this.log(`Doble Fase (${d}): ¡evitas el ataque enemigo!`, 'skill'); this.emit('enemyMiss', { kind: pr.kind, avoided: true }); this._enemyAvoided(this.s.combat); }
    else if (d <= 2) { react.plus = (react.plus || 0) + 1; this.log(`Doble Fase (${d}): fallas y el enemigo te inflige +1 de daño.`, 'skill'); this._enemyResolve(pr.kind, pr.dice, react); }
    else { this.log(`Doble Fase (${d}): fallas.`, 'skill'); this._enemyResolve(pr.kind, pr.dice, react); }
  }
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
  run({ id }) {
    this._turnUsed = false;
    this.doSpecial(id); this.clear();
    const c = this.s.combat; const used = this._turnUsed; this._turnUsed = false;
    if (!c || c.defeated || c.ended || this.s.over) return;
    if (used) this._afterAttack(); // Pacificador, Gral, reposo…: sustituyen a tu ataque (el enemigo contraataca)
    else this.insert(this._cPlayerTurn);
  },
};
ACTIONS.reroll = { in: ['postRoll'], run({ id, die }) { this.doReroll(id, die); this.clear(); this.insert(this._postRoll); } };
ACTIONS.accept = { in: ['postRoll'], run() { this.clear(); this._applyAttack(); } };
