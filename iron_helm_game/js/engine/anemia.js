/**
 * IRON HELM · ANEMIA 4.0 (modo): mecánicas de las cartas (peligros, Mutante, esbirros, pociones, habilidades y tramas).
 *
 * El comportamiento declarativo está en js/data/pack-fx.js (POWERS, FX, ENV_FX, PLOT_OPS); aquí viven los casos que el
 * vocabulario no cubre. Las reglas variantes del libro están en variants.js.
 */
import { Game } from './game.js';
import { HARD_ITEMS, FEMALE_HEROES } from '../data/pack-fx.js';

Object.assign(Game.prototype, {
  /* ============================================================================ utilidades */
  /** nivel de mazmorra que se suma a los enemigos (La Niebla: ninguno) */
  eLvl() { return this.envFx().noLevelBonus ? 0 : this.s.level; },
  /** efecto declarativo del héroe actual (FX de su carta) */
  heroFx(name) { const d = this.hero.key ? this.cat.byCode.get(this.hero.key) : null; return d?.fx?.[name]; },
  /** «si tu personaje es femenino» (Centauro): por el arte de la carta; el Gnome Pack no define género */
  heroFemale() { return FEMALE_HEROES.has(this.hero.key); },
  V(id) { return !!this.s.variants?.[id]; },
  /** quita de la cola los pasos pendientes del combate actual */
  _dropCombatTasks() { this.q = this.q.filter((f) => f !== this._cCounter && f !== this._cPlayerTurn && f !== this._cInitial && f !== this._cPre); },
  /** ganar sin tope (Sangre de Lobo, Necronomicón) */
  gainOver(stat, n, cause = '') {
    if (n <= 0) return 0;
    const from = this._getStat(stat);
    this._setStat(stat, from + n, cause);
    return n;
  },
  /** paga `n` con energía y, si no alcanza, con salud */
  _payEnergyOrHp(n, cause) {
    const e = Math.min(n, this.hero.energy); if (e) this.lose('energy', e, cause);
    if (n - e > 0) this.lose('hp', n - e, cause);
    this.checkDeath();
  },

  /* ============================================================================ aflicciones */
  _afflictionGained(d) {
    if (d.key === 'ANAF1') this._amnesiaPick();
    if (d.key === 'ANAF3' && !this.s.chain) { // Adrenalina: 3 aventuras seguidas (la actual cuenta como la primera)
      const adv = { level: this.s.adventureLevel, campaign: this.s.config.campaign || null };
      this.s.chain = { total: 3, index: 0, adrenaline: true, adventures: [adv, { ...adv }, { ...adv }] };
      this.log('Adrenalina: pasarás directamente de una aventura a la siguiente hasta completar 3.', 'affliction');
    }
  },
  /** curar Amnesia devuelve la habilidad; curar Adrenalina cancela las aventuras encadenadas que aún no se hayan empezado */
  _afflictionCured(uid) {
    const k = this.def(uid).key;
    if (k === 'ANAF1') { delete this.s.lvl.forgotten; this._clampHp(); }
    if (k === 'ANAF3' && this.s.chain?.adrenaline) { this.s.chain = null; this.log('Adrenalina curada: ya no tienes que encadenar aventuras.', 'affliction'); }
  },
  /** Amnesia: una habilidad aleatoria queda olvidada durante este nivel */
  _amnesiaPick() {
    if (!this.hasAffliction('ANAF1')) return;
    const h = this.hero; delete this.s.lvl.forgotten;
    if (!h.skills.length) return;
    const last = this.s.game.lastForgotten;
    const pool = h.skills.length > 1 ? h.skills.filter((id) => id !== last) : h.skills;
    const id = pool[this.rng.int(pool.length)];
    this.s.lvl.forgotten = id; this.s.game.lastForgotten = id;
    this.log(`Amnesia: olvidas «${this.cat.def(id).name}» durante este nivel.`, 'affliction');
    this.emit('skillForgotten', { id });
    this._clampHp();
  },

  /* ============================================================================ peligros y Mutante */
  /** Nube Gaseosa, Arenas Movedizas y Poza de Ácido: peligros del mazo de enemigos */
  _hazard(uid, d, opts) {
    const z = this.s.z; const kind = d.power.hazard;
    this.emit('trap', { uid, hazard: kind });
    const avoided = opts.cardKind === 'ambush' && opts.side === 1; // Emboscada robada como primera carta
    if (avoided) this.log(`${d.name}: la evitas porque resuelves una Emboscada robada como primera carta.`, 'combat');
    else if (kind === 'gas') {
      const [a, b] = this.roll(2, 'nube'); const n = Math.abs(a - b);
      this.log(`${d.name}: respiras el gas (d6−d6 = ${n}) y ganas ${n} de veneno.`, 'combat');
      if (n) { this.addPoison(n, d.name); this.checkDeath(); }
    } else if (kind === 'sand') {
      this.log(`${d.name}: te hundes en la arena; debes sacar 5 o 6 en un d6.`, 'combat');
      for (let guard = 0; guard < 200 && !this.s.over; guard++) {
        const r = this.rollOne('arenas');
        if (r >= 5) { this.log(`Sacas ${r}: consigues salir.`, 'combat'); break; }
        this.lose('energy', 1, 'arenas'); this.log(`Sacas ${r}: pierdes 1 de energía.`, 'combat');
        if (this.hero.energy <= 0) { this.log('Te quedas sin energía.', 'combat'); this._die('Mueres tragado por las Arenas Movedizas.'); break; }
      }
    } else if (kind === 'acid') {
      const lost = this.allItems().filter((u) => !HARD_ITEMS.has(this.def(u).key));
      for (const u of lost) this.discardOwned(u, 'acid');
      this.log(`${d.name}: el ácido disuelve ${lost.length ? lost.map((u) => this.def(u).name).join(', ') : 'nada (solo llevabas metal, cristal o piedra)'}.`, 'combat');
    }
    z.enemiesDiscard.push(uid);
    if (opts.series) this._seriesNext({ series: opts.series }, 'avoid');
  },
  /** roba la siguiente carta de enemigo que se pueda combatir (los peligros y otros Mutantes se descartan) */
  _drawFightable() {
    for (let i = 0; i < 40; i++) {
      const u = this.draw('enemies'); if (!u) return null;
      const d = this.def(u);
      if (d.power?.hazard || d.power?.trap || d.trap || d.power?.mutant) { this.s.z.enemiesDiscard.push(u); this.emit('discardCard', { uid: u, why: 'skipped' }); continue; }
      return u;
    }
    return null;
  },
  /** Mutante: atributos del primer enemigo robado y habilidad y recompensa del segundo */
  _startMutant(uid, opts) {
    const a = this._drawFightable(); const b = this._drawFightable();
    if (!a || !b) { this.log('Mutante: no quedan enemigos suficientes en el mazo.', 'combat'); this.s.z.enemiesDiscard.push(uid); if (a) this.s.z.enemiesDiscard.push(a); if (opts.series) this._seriesNext({ series: opts.series }, 'avoid'); return; }
    const A = this.def(a); const B = this.def(b);
    this.s.z.enemiesDiscard.push(a, b); this.emit('discardCard', { uid: a, why: 'mutant' }); this.emit('discardCard', { uid: b, why: 'mutant' });
    this.log(`Mutante: atributos de ${A.name} y habilidad y recompensa de ${B.name}.`, 'combat');
    this.startCombat(uid, { ...opts, stats: { health: A.health, damage: A.damage, weakness: A.weakness, weaknesses: A.weaknesses, tags: A.tags || [],
      treasure: B.treasure, purse: B.purse, power: { ...(B.power || {}) } } });
  },

  /* ============================================================================ opciones de combate de ANEMIA */
  /** especiales (botones del turno de ataque) de las cartas de ANEMIA */
  _anemiaSpecials(c, phase) {
    const out = []; const h = this.hero;
    if (!c) return out;
    if (c.power.coinKill && this.equippedUid(c.power.coinKill))
      out.push({ id: 'moneda', uid: this.equippedUid(c.power.coinKill), label: 'Moneda del Destino', text: 'Descártala para matar al Hombre Lobo.' });
    if (phase !== 'attack') return out;
    if (c.restMode) out.push({ id: 'rest', label: 'No atacar', text: c.restMode === 'energy' ? 'Recuperas 2 de energía; el enemigo contraataca.' : 'Acumulas +2 al siguiente ataque; el enemigo contraataca.' });
    if (this.hasSkill('ANS2') && !c.boss && !c.parca && !c.power.noDamage)
      out.push({ id: 'pacificador', label: 'Pacificador', text: 'En vez de atacar, tira 1d6: 5-6 terminas el combate sin experiencia ni botín; 1-4 el enemigo ataca.' });
    if (this.hasSkill('ANS6') && !this.s.lvl.punos && c.hp <= 3 && h.energy >= 1 && !c.power.noDamage)
      out.push({ id: 'punos', label: 'Puños de Fuerza', text: 'Gasta 1 de energía: infliges 3 de daño de forma automática (una vez por nivel).' });
    if (this.hasMerc('ANM2') && !c.gral && !c.gralUsed && !c.power.noDamage && !c.parca)
      out.push({ id: 'gral', label: 'Gral combate por ti', text: 'Gral ataca en tu lugar con 1d6, sin gastar energía (una vez por combate).' });
    return out;
  },
  _anemiaSpecial(id, c, o) {
    switch (id) {
      case 'moneda': this.discardOwned(o.uid, 'use'); this.log('Descartas la Moneda del Destino: el Hombre Lobo muere.', 'item'); this._defeat(); return true;
      case 'rest': {
        this._turnUsed = true; c.restSkips = (c.restSkips || 0) + 1;
        if (c.restMode === 'energy') { this.gain('energy', 2, 'energía potencial'); this.log('Energía Potencial: no atacas y recuperas 2 de energía.', 'item'); }
        else this.log(`Absorción: no atacas; acumulas +${2 * c.restSkips} para tu siguiente ataque.`, 'item');
        return true;
      }
      case 'pacificador': {
        const d = this.rollOne('pacificador'); this._turnUsed = true;
        if (d >= 5) {
          this.log(`Pacificador (${d}): terminas el combate de forma amistosa, sin experiencia ni botín.`, 'skill');
          this._dropCombatTasks(); this._turnUsed = false; this._endCombat('avoid', c);
        } else this.log(`Pacificador (${d}): el enemigo no se deja convencer y ataca.`, 'skill');
        return true;
      }
      case 'punos': {
        this.s.lvl.punos = true; this._turnUsed = true; this.lose('energy', 1, 'puños de fuerza');
        if (this._attackStart(c)) return true; c.attacks++;
        this.log('Puños de Fuerza: infliges 3 de daño de forma automática.', 'skill'); this._damageEnemy(3, 'puños');
        return true;
      }
      case 'gral': {
        c.gralUsed = true; this._turnUsed = true; if (this._attackStart(c)) return true; c.attacks++;
        const d = this.rollOne('gral'); this.log(`Gral combate en tu lugar: ${d} de daño.`, 'merc'); this._damageEnemy(d, 'gral');
        return true;
      }
      default: return false;
    }
  },
  /** usos activos de las cartas de ANEMIA (`useItem` cae aquí si no lo conoce) */
  _anemiaUse(d, uid, pr) {
    const c = this.s.combat;
    switch (d.key) {
      case 'ANP1': { // Sangre de Lobo
        this.discardOwned(uid, 'use'); this.gainOver('hp', 3, d.name); this.gainOver('energy', 3, d.name);
        this.s.game.wolf = (this.s.game.wolf || 0) + 1;
        this.log('Sangre de Lobo: +3 de salud y +3 de energía (aunque superes el máximo hasta el final del combate).', 'item');
        return true;
      }
      case 'ANP2': case 'ANP3': { // Energía Potencial / Absorción
        if (!c || !['attack', 'pre'].includes(pr)) this.fail('Solo puedes usarla durante un combate.');
        this.discardOwned(uid, 'use'); c.restMode = d.key === 'ANP2' ? 'energy' : 'power'; c.restSkips = 0;
        this.log(`${d.name}: mientras no ataques ${c.restMode === 'energy' ? 'recuperas 2 de energía' : 'acumulas +2 para tu siguiente ataque'} por cada ataque que dejes de hacer.`, 'item');
        if (pr === 'attack' && this.s.prompt) { this.s.prompt.rest = { mode: c.restMode, skipped: 0 }; this.s.prompt.specials = this._specialOptions('attack'); }
        return true;
      }
      case 'ANP4': { // Silencio
        if (!c || !['attack', 'pre'].includes(pr)) this.fail('Solo puedes usarla durante un combate.');
        if (c.boss) this.fail('Esta poción no funciona con jefes finales.');
        this.discardOwned(uid, 'use'); c.power = {}; this.log(`Silencio: ${c.name} pierde su habilidad especial.`, 'item');
        if (pr === 'attack' && this.s.prompt) this.s.prompt.specials = this._specialOptions('attack');
        return true;
      }
      case 'ANT3': { // La Bomba de Dios
        if (!c || !['attack', 'pre'].includes(pr)) this.fail('La Bomba de Dios solo puede detonarse durante un combate.');
        this.destroyOwned(uid, 'bomb'); c.bombed = true;
        this.log('¡Detonas La Bomba de Dios! Mueres al instante, pero te llevas por delante a tu enemigo.', 'item');
        this.emit('bomb', { uid });
        this._setStat('hp', 0, 'bomba'); this.hero.poison = 0;
        this._dropCombatTasks();
        this._die('La Bomba de Dios: mueres llevándote por delante a tu enemigo.');
        return true;
      }
      default: return false;
    }
  },

  /* ============================================================================ fin de un combate */
  _afterCombatHooks(result, c) {
    if (c.parca) { if (result === 'win') this._parcaReturn?.(c); return; }
    const s = this.s; const h = this.hero;
    if (s.game.wolf) { // Sangre de Lobo: tras el combate vuelves al máximo y baja la moral
      const n = s.game.wolf; s.game.wolf = 0;
      if (h.hp > this.maxHp()) this._setStat('hp', this.maxHp(), 'sangre de lobo');
      if (h.energy > this.maxEnergy()) this._setStat('energy', this.maxEnergy(), 'sangre de lobo');
      this.log('Sangre de Lobo: se acaba el efecto; tu salud y energía vuelven al máximo.', 'item'); this.addMorality(-n);
    }
    if (s.game.delayed?.length) { // La Pitonisa: la ficha pasa a tu carta de personaje
      const list = s.game.delayed.splice(0);
      for (const { stat, n } of list) {
        if (stat === 'poison') { this.log('La profecía de la pitonisa se cumple: ganas 1 ficha de veneno.', 'plot'); this.addPoison(n, 'pitonisa'); }
        else { this.log('La profecía de la pitonisa se cumple: ganas 1 de salud.', 'plot'); this.gain('hp', n, 'pitonisa'); }
      }
      this.checkDeath();
    }
    if (c.series) this._seriesNext(c, result);
  },
  /** series de combates seguidos (La Criatura, Arena de Combate) */
  _seriesNext(c, result) {
    const ser = c.series; if (!ser) return;
    if (result === 'win') ser.wins = (ser.wins || 0) + 1;
    ser.i = (ser.i || 0) + 1;
    if (ser.i < ser.n) this.insert(function nextFight() { if (!this.s.over) this._fightSeries(ser); });
    else {
      for (const u of this.s.ctx.seriesQueue || []) this.s.z.enemiesDiscard.push(u); // enemigos robados que ya no se combatirán
      this.s.ctx.seriesQueue = [];
      if (ser.wins === ser.n && ser.onAll?.length) this.applyOps(ser.onAll, null);
    }
  },
  _fightSeries(ser) {
    const opts = { source: 'plot', ambush: 'normal', hpBonus: this.eLvl(), initialBonus: 0, series: ser, ...(ser.fightOpts || {}) };
    const q = this.s.ctx.seriesQueue;
    if (q?.length) this._fightDrawn(q.shift(), opts); else this._drawAndFight(opts);
  },

  /* ============================================================================ Gral, David y Momentos de Paz */
  /** Gral pierde 1 de moral cada vez que gastas oro */
  _mercSpendGold(cause) { if (cause === 'moral' || cause === 'gral') return; this._mercLose('ANM2', 1, 'gastas oro'); },
  /** al llegar al Campamento con 11 o más de oro Gral puede intentar robártelo (tirada d6: 1) */
  _gralCamp() {
    if (!this.hasMerc('ANM2') || this.hero.gold < 11) return;
    const d = this.rollOne('gral');
    if (d === 1) { this.log(`Gral (${d}) intenta robarte el oro combatiendo contra ti.`, 'merc'); this.s.ctx.gralFight = true; }
    else this.log(`Gral (${d}) ve tu oro, pero esta vez se contiene.`, 'merc');
  },
  _gralDuel() {
    const m = this._mercByKey('ANM2'); if (!m) return;
    const d = this.def(m.uid); const st = d.stats || { health: 8, damage: 2, treasure: 1 };
    this.startCombat(m.uid, { ambush: 'normal', hpBonus: 0, source: 'gral', gral: true, noGrave: true,
      stats: { health: st.health, damage: st.damage, treasure: st.treasure, purse: 0, weakness: null, weaknesses: [], tags: [], power: {} } });
  },
  /** El ataque de Gral te mataría: en vez de eso te roba todo el oro y se marcha */
  _gralRobs(c) {
    const gold = this.hero.gold;
    if (gold) this.lose('gold', gold, 'gral');
    this.log(`Gral habría acabado contigo, pero prefiere robarte todo el oro (${gold}) y se marcha.`, 'merc');
    const m = this._mercByKey('ANM2'); if (m) this._mercLeave(m, 'Se marcha con tu oro.');
    c.defeated = true; this._dropCombatTasks();
    this.insert(function gralLeaves() { this._endCombat('avoid', c); });
  },
  _campMoment() {
    if (!this.V('momentosPaz') || !(this.hasMerc('ANM1') || this.hasMerc('ANM2'))) return;
    const name = this.hasMerc('ANM1') && this.hasMerc('ANM2') ? 'David Galahad y Gral' : this.hasMerc('ANM1') ? 'David Galahad' : 'Gral';
    const d = this.rollOne('momentos'); const row = this._bookTable('camp_moments').find((r) => r.dice.includes(d));
    this.log(`${name} se entretiene en el campamento (${d}): ${row?.text || ''}`, 'merc');
    this.emit('campMoment', { roll: d, text: row?.text || '', who: name });
  },

  /* ============================================================================ jefes: Señor del Tiempo y Tzxefytd */
  /** tras cada ataque: 2d6; con dobles lo aturdes y te devuelve a 1987 */
  _timeLordStun(c) {
    const [a, b] = this.roll(2, 'señor-del-tiempo');
    if (a !== b) { this.log(`El Señor del Tiempo resiste tu ataque [${a}, ${b}].`, 'combat'); return false; }
    this.log(`¡Dobles [${a}, ${b}]! Aturdes al Señor del Tiempo y lo obligas a devolverte a 1987.`, 'boss');
    c.defeated = true; this._dropCombatTasks();
    this.endGame('victory', 'Aturdes al Señor del Tiempo y te devuelve a 1987.', { ending: 'home' });
    return true;
  },
  /** Tzxefytd gasta energía en cada ataque; al quedarse sin ella será derrotado */
  _duelDrain(c) {
    const step = c.power.energyDuel.step;
    c.hp = Math.max(0, c.hp - step);
    this.emit('enemyHp', { uid: c.uid, hp: c.hp, maxHp: c.maxHp, dmg: step, cause: 'energía' });
    this.log(`${c.name} gasta ${step} de energía en su ataque: le quedan ${c.hp}.`, 'combat');
    if (c.hp <= 0) c.duelEmpty = true;
  },

  /* ============================================================================ tramas */
  /** Más Rápido que la Vista: una vez por nivel puedes ignorar una trama con ojos */
  _offerIgnorePlot(uid, d) {
    if (!this.hasSkill('ANS4') || this.s.lvl.rapido || !(d.eyes > 0) || this.s.ctx.plotChecked === uid) return false;
    this.s.ctx.plotChecked = uid;
    (this.s.ctx.inPlay ||= []).push(uid);
    this.emit('plot', { uid });
    this.insert(function askIgnore() {
      this.ask('choice', { title: 'Más Rápido que la Vista', source: uid, scene: 'generic',
        text: `Puedes ignorar la trama «${d.name}» (${d.eyes} ojo${d.eyes > 1 ? 's' : ''}) una vez por nivel de mazmorra.`,
        options: [{ id: 'ignore', label: 'Ignorar la trama', text: 'No la resuelves ni ganas sus ojos.' }, { id: 'resolve', label: 'Resolverla', text: '' }],
        onChoose: (id) => {
          this.s.ctx.inPlay = (this.s.ctx.inPlay || []).filter((u) => u !== uid);
          if (id === 'ignore') {
            this.s.lvl.rapido = true; this.s.z.plotsPlayed.push(uid); this.emit('discardCard', { uid, why: 'ignored' });
            this.log(`Más Rápido que la Vista: ignoras «${d.name}».`, 'skill');
          } else this._startPlot(uid);
        } });
    });
    return true;
  },
  /** Reino Arborícola: no puedes resolver el Claro, roba otra carta de mazmorra */
  _swapDungeonCard(uid, side) {
    const z = this.s.z; const nu = z.dungeon.shift();
    this.log('El Reino Arborícola: no puedes resolver el Claro; robas otra carta de mazmorra.', 'env');
    if (!nu) return;
    z.dungeonDiscard.push(nu); // se resuelve desde el descarte (ya está en una zona)
    this.emit('dungeonSwap', { from: uid, to: nu });
    this.resolveDungeon(nu, side);
  },
  /** fija una trama como terminada (sin sus ojos) y la manda a la pila de jugadas */
  _closePlotNow() {
    const u = this.s.ctx.plotUid; if (u == null) return;
    this.s.ctx.inPlay = (this.s.ctx.inPlay || []).filter((x) => x !== u);
    if (!this.s.z.plotsPlayed.includes(u)) this.s.z.plotsPlayed.push(u);
  },

  _opAnemia(op, src) {
    const [name, a, b] = op; const z = this.s.z; const h = this.hero;
    switch (name) {
      case 'fightSeries': { // La Criatura: dos enemigos seguidos; solo si derrotas a ambos, las ops de `onAll`
        this._fightSeries({ i: 0, n: a, wins: 0, onAll: b?.onAll || [] }); return true;
      }
      case 'restoreAll': {
        this.gain('hp', this.maxHp() - h.hp, src?.name); this.gain('energy', this.maxEnergy() - h.energy, src?.name); this.lose('poison', h.poison, src?.name);
        this.log('Recuperas toda tu salud y energía y eliminas el veneno.', 'plot'); return true;
      }
      case 'latonAssemble': this._latonStep(1, []); return true;
      case 'spendDie': { // Marea Gris: gasta un d6 en energía y, si no alcanza, en salud
        const n = this.rollOne('marea'); this.log(`Cargas contra los gnomos: gastas ${n}.`, 'plot'); this._payEnergyOrHp(n, src?.name); return true;
      }
      case 'tunnel': this._tunnel(a); return true;
      case 'carryPenalty': h.carryBonus -= a; this.log(`El bebé ocupa ${a} de carga.`, 'plot'); this.insert(this._weightCheck); return true;
      case 'bodySwap': this._bodySwapAsk(); return true;
      case 'learnAnySkill': {
        const cand = z.skills.filter((u) => !h.skills.includes(this.s.cards[u].id));
        if (!cand.length) { this.log('No quedan habilidades por aprender.', 'plot'); return true; }
        this.ask('pickCards', { title: 'Doya te entrena: elige la habilidad que quieras', uids: cand, min: 1, max: 1, purpose: 'learnSkill' }); return true;
      }
      case 'arena': this._arena(); return true;
      case 'curse': this.s.game.curse = true; this.log('Una maldición te persigue: ganarás 1 de veneno antes de cada combate hasta que derrotes a un enemigo a puñetazos.', 'plot'); return true;
      case 'vipers': {
        let bites = 0;
        for (let i = 0; i < 4; i++) {
          const d = this.roll(3, 'víboras'); const ones = d.filter((x) => x === 1).length;
          if (ones >= 2) { bites++; this.log(`Víboras [${d.join(', ')}]: te muerden (+1 de veneno).`, 'plot'); this.addPoison(1, src?.name); } else this.log(`Víboras [${d.join(', ')}]: esquivas.`, 'plot');
        }
        if (!bites) { this.log('Escapas sin un solo mordisco: +1 de energía.', 'plot'); this.gain('energy', 1, src?.name); }
        this.checkDeath(); return true;
      }
      case 'portal': {
        let lvl = 0;
        for (let g = 0; g < 100 && !lvl; g++) { const d = this.rollOne('portal'); if (d !== 6 && d !== this.s.level) lvl = d; else this.log(`Portal: sacas ${d}; relanzas.`, 'plot'); }
        if (!lvl) lvl = this.s.level === 1 ? 2 : 1;
        this.log(`El portal te transporta al nivel ${lvl} de la mazmorra.`, 'plot');
        this.s.level = lvl; this.emit('levelUp', { level: lvl, portal: true }); return true;
      }
      case 'finalBoss': this._closePlotNow(); this._beginBossSequence('El Portal: te enfrentas ya al jefe final.'); return true;
      case 'horde': this._hordeAsk(); return true;
      case 'loseDie': { const n = this.rollOne('dado'); this.log(`Pierdes ${n} de ${a === 'hp' ? 'salud' : 'energía'}.`, 'plot'); this.lose(a, n, src?.name); if (a === 'hp') this.checkDeath(); return true; }
      case 'delayed': (this.s.game.delayed ||= []).push({ stat: a, n: b }); this.log('Una ficha queda sobre la carta de la trama hasta el final de tu próximo combate.', 'plot'); return true;
      case 'deal': this.s.ctx.deal = { drawn: [] }; this._dealStep(); return true;
      case 'loseSkill': {
        const uids = h.skills.map((id) => h.skillCards[id]).filter((u) => u != null);
        if (!uids.length) { this.log('No tienes habilidades que perder.', 'plot'); return true; }
        this.ask('pickCards', { title: 'La voz extrae tus recuerdos: elige la habilidad que pierdes para siempre', uids, min: 1, max: 1, purpose: 'loseSkill' }); return true;
      }
      case 'gainOver': this.gainOver(a, b, src?.name); this.log(`Ganas ${b} de ${a === 'energy' ? 'energía' : 'salud'} (incluso superando el máximo).`, 'plot'); return true;
      default: return false;
    }
  },

  /** El Hombre de Latón: tres tiradas seguidas; puedes abandonar entre una y otra */
  _latonStep(n, rolls) {
    const r = this.rollOne('latón'); rolls.push(r);
    let cost = 0;
    if (n === 2 && r < rolls[0]) cost = rolls[0] - r;
    if (n === 3 && r < rolls[1]) cost = Math.max(0, rolls[0] - r);
    if (cost > this.hero.energy) { this.log(`Tirada ${n}: ${r}. Necesitas ${cost} de energía y no la tienes: tienes que abandonar.`, 'plot'); return; }
    if (cost) this.lose('energy', cost, 'hombre de latón');
    this.log(`Tirada ${n}: ${r}${cost ? ` · gastas ${cost} de energía` : ''}.`, 'plot');
    if (n >= 3) { this.log('Terminas de armar al hombre de latón: ganas 2 cartas de botín y subes la moral.', 'plot'); this.gainLoot(2); this.addMorality(1); return; }
    this.ask('choice', { title: 'El Hombre de Latón', scene: 'generic', text: `Resultados hasta ahora: ${rolls.join(', ')}. ¿Sigues armando al hombre de latón?`,
      options: [{ id: 'go', label: 'Seguir armándolo', text: `Tirada ${n + 1}` }, { id: 'leave', label: 'Abandonar e irte', text: 'Sin recompensa.' }],
      onChoose: (id) => { if (id === 'go') this._latonStep(n + 1, rolls); else this.log('Abandonas al hombre de latón.', 'plot'); } });
  },
  _tunnel(side) {
    if (side === 'left') {
      const d = this.roll(3, 'túnel');
      if (!d.includes(6)) { this.log(`Túnel de la izquierda [${d.join(', ')}]: las arenas movedizas te atrapan. Pierdes 1 de salud y 1 de energía.`, 'plot'); this.lose('hp', 1, 'túnel'); this.lose('energy', 1, 'túnel'); this.checkDeath(); }
      else this.log(`Túnel de la izquierda [${d.join(', ')}]: sales sin problemas.`, 'plot');
    } else if (side === 'center') {
      const d = this.rollOne('túnel');
      if (d >= 3 && d <= 5) { this.log(`Túnel del centro (${d}): quedas cubierto de limo. +1 de veneno.`, 'plot'); this.addPoison(1, 'túnel'); this.checkDeath(); }
      else this.log(`Túnel del centro (${d}): lo cruzas sin problemas.`, 'plot');
    } else {
      const [x, y] = this.roll(2, 'túnel'); const v = Math.min(x, y);
      if (v <= 2) { this.log(`Túnel de la derecha [${x}, ${y}] → ${v}: el fango te llega a las rodillas. Pierdes 2 de energía (o de salud si no te alcanza).`, 'plot'); this._payEnergyOrHp(2, 'túnel'); }
      else this.log(`Túnel de la derecha [${x}, ${y}] → ${v}: sales sin problemas.`, 'plot');
    }
  },
  /** Cambio de Cuerpo: eliges otro personaje de la reserva */
  _bodySwapAsk() {
    const heroes = this.cat.pools.heroes.filter((x) => x.key !== this.hero.key);
    if (!heroes.length) { this.log('No hay otro personaje en la reserva.', 'plot'); return; }
    this.ask('choice', { title: 'Cambio de Cuerpo', scene: 'generic', text: 'Eliges el personaje de la reserva con el que te quedas.',
      options: heroes.map((x) => ({ id: x.id, label: x.name, text: `Salud ${x.health} · Energía ${x.energy} · Carga ${x.encumbrance}` })),
      onChoose: (id) => this._bodySwap(id) });
  },
  _bodySwap(id) {
    const nh = this.cat.pools.heroes.find((x) => x.id === id); if (!nh) return;
    const old = this.cat.pools.heroes.find((x) => x.key === this.hero.key) || this.cat.pools.heroes.find((x) => x.id === this.s.heroId);
    const h = this.hero; const z = this.s.z;
    this.log(`Cambias de cuerpo: ahora eres ${nh.name}.`, 'plot');
    h.name = nh.name; h.key = nh.key; this.s.heroId = nh.id; h.proficiency = nh.proficiency; h.race = nh.race || null; h.custom = nh.custom || null;
    h.scoreBonus = nh.finalScoreBonus || 0;
    h.maxHp = nh.health; if (h.hp > this.maxHp()) this._setStat('hp', this.maxHp(), 'cambio de cuerpo');
    if (h.energy > nh.energy) this._setStat('energy', nh.energy, 'cambio de cuerpo');
    h.encumbrance = typeof nh.encumbrance === 'number' ? nh.encumbrance : 0; delete h.carryRule;
    if (typeof nh.encumbrance !== 'number') h.carryRule = 'weaponsOnly';
    for (const sid of old?.skills || []) { // la habilidad inicial del personaje anterior vuelve a su mazo
      const i = h.skills.indexOf(sid); if (i < 0) continue;
      h.skills.splice(i, 1); const u = h.skillCards[sid]; delete h.skillCards[sid]; if (u != null) z.skills.push(u);
    }
    for (const sid of nh.skills || []) if (!h.skills.includes(sid)) this._learnSkillFree(sid);
    this._clampHp(); this.emit('heroSwap', { id: nh.id, name: nh.name });
    this.insert(this._weightCheck);
  },
  /** Arena de Combate: dos enemigos, primero el más débil; sin botín, 4 de oro al final */
  _arena() {
    const a = this._drawFightable(); const b = this._drawFightable();
    const list = [a, b].filter((u) => u != null);
    if (!list.length) { this.log('Arena de Combate: no quedan enemigos.', 'plot'); return; }
    list.sort((x, y) => this.def(x).health - this.def(y).health); // el más débil primero (empate: el robado antes)
    const [first, ...rest] = list;
    this.s.ctx.seriesQueue = rest;
    this.log(`Arena de Combate: combates primero contra ${this.def(first).name}${rest.length ? ` y después contra ${this.def(rest[0]).name}` : ''}.`, 'plot');
    const ser = { i: 0, n: list.length, wins: 0, onAll: [['gain', 'gold', 4]], fightOpts: { asUndead: true, noTreasure: true } };
    this._fightDrawn(first, { source: 'plot', ambush: 'normal', hpBonus: this.eLvl(), initialBonus: 0, series: ser, ...ser.fightOpts });
  },
  /** La Horda: tamaño d20; superas o igualas con 1-3 d6 (1 de energía por dado) o recibes la diferencia */
  _hordeAsk() {
    const H = this.roll(1, 'horda', 'hero', 20)[0]; const h = this.hero;
    this.log(`La horda zombie tiene tamaño ${H}.`, 'plot');
    const options = [1, 2, 3].map((n) => ({ id: `dice${n}`, label: `Tirar ${n} dado${n > 1 ? 's' : ''} (${n} de energía)`, text: '', disabled: h.energy < n, reason: 'Sin energía suficiente' }));
    if (h.energy < 1) options.push({ id: 'resign', label: 'No puedes tirar dados', text: `Recibes ${H} de daño.` });
    for (const m of this.s.mercs) options.push({ id: `merc:${m.uid}`, label: `Empujar a ${this.def(m.uid).name} hacia la horda`, text: 'Lo pierdes para siempre y huyes sin daño.' });
    this.ask('choice', { title: 'La Horda', scene: 'generic', text: `La horda zombie tiene tamaño ${H}. Tira de 1 a 3 d6 para igualarla o mejorarla; si no, recibes la diferencia.`, options,
      onChoose: (id) => {
        if (id.startsWith('merc:')) { const m = this.s.mercs.find((x) => x.uid === +id.slice(5)); if (m) this._mercLeave(m, 'Lo empujas hacia la horda.'); this.log('Huyes mientras la horda devora a tu esbirro.', 'plot'); return; }
        const n = id === 'resign' ? 0 : +id.slice(4);
        if (n) this.lose('energy', n, 'horda');
        const dice = n ? this.roll(n, 'horda') : []; const S = dice.reduce((x, y) => x + y, 0);
        if (S >= H) { this.log(`Sacas ${S} contra ${H}: escapas de la horda.`, 'plot'); return; }
        this.log(`Sacas ${S} contra ${H}: la horda te hiere por ${H - S}.`, 'plot'); this.lose('hp', H - S, 'horda'); this.checkDeath();
      } });
  },
  /** El Trato: robas las fichas de bendición que quieras, las volteas y se aplican */
  _dealStep() {
    const d = this.s.ctx.deal; const pile = this.s.z.blessingPile;
    if (!pile.length) { this._dealFinish(); return; }
    this.ask('choice', { title: 'El Trato', scene: 'generic', text: `Fichas de bendición robadas: ${d.drawn.length} (quedan ${pile.length} en la reserva). Las voltearás todas al terminar.`,
      options: [{ id: 'more', label: 'Robar otra ficha', text: '' }, { id: 'stop', label: 'Terminar y voltearlas', text: '' }],
      onChoose: (id) => { if (id === 'more') { d.drawn.push(pile.shift()); this._dealStep(); } else this._dealFinish(); } });
  },
  _dealFinish() {
    const d = this.s.ctx.deal; if (!d) return;
    this.s.ctx.deal = null;
    let hp = 0; let poison = 0;
    for (const f of d.drawn) { if (f.k === 'hp') hp += f.n; else if (f.k === 'cure') poison += 1; }
    this.log(`El Trato: volteas ${d.drawn.length} ficha(s): curas ${hp} de salud y ganas ${poison} de veneno.`, 'plot');
    this.s.z.blessingPile.push(...d.drawn); this.s.z.blessingPile = this.rng.shuffle(this.s.z.blessingPile);
    if (hp) this.gain('hp', hp, 'El Trato');
    if (poison) this.addPoison(poison, 'El Trato');
    this.checkDeath();
  },
});

/* ================================================================================ selecciones nuevas (pickCards) */
const origPickDone = Game.prototype._pickDone;
Game.prototype._pickDone = function pickDoneAnemia(pr, chosen) {
  if (pr.purpose === 'learnSkill') {
    const id = this.s.cards[chosen[0]].id;
    this._learnSkillFree(id); this.log(`Doya te enseña ${this.cat.def(id).name}.`, 'skill');
    if (this.cat.def(id).key === 'S2') this._grantAlchemy();
    return;
  }
  if (pr.purpose === 'loseSkill') {
    const u = chosen[0]; const id = this.s.cards[u].id; const h = this.hero;
    h.skills = h.skills.filter((x) => x !== id); delete h.skillCards[id]; this.s.z.removed.push(u);
    this.emit('discardCard', { uid: u, why: 'forgotten' }); this.log(`Pierdes para siempre la habilidad ${this.cat.def(id).name}.`, 'plot'); this._clampHp();
    return;
  }
  return origPickDone.call(this, pr, chosen);
};

