/**
 * IRON HELM · Reglas variantes de ANEMIA 4.0 (reglamento 4.0, pág. 4-8, 13-14 y 22-27).
 *
 * Se activan una a una con `config.variants = { id: true }` (ver `listVariants()` en catalog.js) y quedan en `s.variants`.
 * Los textos (pueblos, motivaciones, epílogos, encantamientos…) salen de data-src/anemia.json (`rules` con `group`).
 *   diablillo · pueblo · motivacion · ceroEnergia · gastarXP · hogarSonado · sinRetorno · justoAntesDeMorir · enfrentarseParca ·
 *   entornosTematicos · muertesAtroces · lugaresRetiro · encantamientos · momentosPaz · metalInmortal
 * (ceroEnergia vive en combat.js · doAttack; metalInmortal en game.js · _buildDecks y anemia.js · _timeLordStun).
 */
import { Game, ACTIONS } from './game.js';
import { buildCatalog, looseName } from './catalog.js';
import { GENERATED } from '../data/packs/index.js';

const FREE = ['turn', 'setup'];
/** texto del libro (reglas con `group`) */
const book = (group) => (GENERATED.anemia?.rules || []).filter((r) => r.group === group);

Object.assign(Game.prototype, {
  _bookTable(group) { return book(group)[0]?.table || []; },

  /* ============================================================================ preparación */
  /** Pueblo de Origen, Motivación, rumbo de los Entornos Temáticos y Diablillo: se resuelven al crear la partida */
  _variantsSetup(heroDef) {
    const V = this.s.variants || {}; const s = this.s; const h = this.hero;
    if (V.metalInmortal) this.log('Metal Inmortal: 1987. Persigues al hombre de la túnica morada hasta un frondoso maizal… y más allá.', 'plot');
    if (V.diablillo) { s.imp = 'loot'; this.log('El Diablillo empieza sobre el mazo de Botín.', 'game'); }
    if (V.pueblo) {
      const d = this.rollOne('pueblo'); const row = this._bookTable('origin').find((r) => r.dice.includes(d));
      s.origin = { roll: d, town: row.town, stat: row.stat, text: row.text };
      switch (row.stat) {
        case 'hp': h.maxHp += 1; h.hp += 1; break;
        case 'energy': h.energy += 1; h.initial.energy += 1; break;
        case 'carry': if (h.carryRule !== 'weaponsOnly') h.encumbrance += 1; break;
        case 'rations': h.rations += 1; break;
        case 'gold': h.gold += 1; break;
        case 'blessing': this.gainBlessing(1, 'pueblo'); break;
        default: break;
      }
      this.log(`Pueblo de origen (${d}): ${row.town}, ${row.text}`, 'game');
    }
    if (V.motivacion) {
      const d = this.rollOne('motivación'); const row = this._bookTable('motivation').find((r) => r.dice.includes(d));
      s.motivation = { roll: d, text: row.text };
      this.log(`Motivación (${d}): ${row.text}`, 'plot');
    }
    if (V.entornosTematicos) {
      const d = this.roll(1, 'rumbo', 'hero', 4)[0]; const row = this._bookTable('themed_env').find((r) => r.dice.includes(d));
      s.direction = { roll: d, name: row.dir };
      this.log(`Entornos temáticos: tu personaje se dirige hacia el ${row.dir}.`, 'game');
    }
    void heroDef;
  },

  /* ============================================================================ El Diablillo */
  _impMove() {
    if (!this.s.variants?.diablillo) return;
    const order = ['loot', 'potions', 'out']; const i = order.indexOf(this.s.imp || 'loot');
    this.s.imp = order[(i + 1) % 3];
    this.emit('imp', { pos: this.s.imp });
    this.log(`El Diablillo se mueve: ${{ loot: 'sobre el mazo de Botín', potions: 'sobre el mazo de Pociones', out: 'fuera de ambos mazos' }[this.s.imp]}.`, 'game');
  },
  /** el Diablillo reduce en 1 las cartas de ese mazo que ganes si está encima de él */
  _impCut(deck, n) {
    if (!this.s.variants?.diablillo || this.s.imp !== deck || n <= 0) return n;
    this.log(`El Diablillo te roba 1 carta de ${deck === 'loot' ? 'botín' : 'poción'}.`, 'game');
    this.emit('imp', { pos: this.s.imp, steals: deck });
    return n - 1;
  },

  /* ============================================================================ Gastar Puntos de Experiencia */
  spendXp(stat) {
    if (!this.s.variants?.gastarXP) this.fail('La variante «Gastar Puntos de Experiencia» no está activa.');
    if (stat !== 'hp' && stat !== 'energy') this.fail('Elige salud o energía.');
    if (this.unspentEnemies().length < 7) this.fail('Necesitas 7 enemigos derrotados sin gastar.');
    let n = 7; for (const e of this.s.z.graveyard) if (n > 0 && !e.spent) { e.spent = true; n--; }
    const h = this.hero;
    if (stat === 'hp') { h.maxHp += 1; this._setStat('hp', h.hp + 1, 'experiencia'); }
    else { h.energyBonus = (h.energyBonus || 0) + 1; h.initial.energy += 1; this.gain('energy', 1, 'experiencia'); }
    this.log(`Gastas 7 enemigos derrotados: +1 a tu ${stat === 'hp' ? 'salud' : 'energía'} máxima.`, 'skill');
    this.emit('xpSpent', { stat });
  },

  /* ============================================================================ Hogar Soñado */
  _dreamHome() {
    const h = this.hero;
    if (h.gold < 30) { this.log(`Hogar Soñado: solo tienes ${h.gold} de oro; no alcanza para tu mansión (30). Debes luchar contra el jefe final.`, 'boss'); return; }
    this.ask('choice', { title: 'Hogar Soñado', scene: 'generic',
      text: `Tienes ${h.gold} monedas de oro: puedes comprar la mansión de tus sueños (30) y retirarte sin plantar cara al jefe final.`,
      options: [{ id: 'buy', label: 'Comprar la mansión (30 de oro)', text: 'Cumples tu sueño y ganas la partida.' }, { id: 'fight', label: 'Enfrentarte al jefe final', text: 'Sigues las reglas de final de partida.' }],
      onChoose: (id) => {
        if (id !== 'buy') return;
        this.lose('gold', 30, 'mansión'); this.s.game.mansion = true;
        this.endGame('victory', 'Compras la mansión de tus sueños con 30 monedas de oro.', { ending: 'mansion' });
      } });
  },

  /* ============================================================================ Justo Antes de Morir */
  /** Ofrece perder el brazo en vez de morir. `apply(noDamage)` aplica el ataque (sin daño si se acepta). Devuelve true si preguntó. */
  _offerArm(c, apply) {
    const h = this.hero;
    if (!this.s.variants?.justoAntesDeMorir || h.armUsed || h.armLost) return false;
    this.ask('choice', { title: 'Justo antes de morir', scene: 'generic',
      text: `El ataque de ${c.name} acabaría contigo. Puedes perder para siempre el uso de tu otra mano (OM) y sobrevivir. Solo puedes hacerlo una vez por partida.`,
      options: [{ id: 'arm', label: 'Perder el uso de un brazo', text: 'No pierdes esa salud; no podrás portar nada en la otra mano ni usar armas a dos manos.' },
        { id: 'die', label: 'Aceptar el golpe', text: 'Mueres.' }],
      onChoose: (id) => { if (id === 'arm') { this._loseArm(); apply(true); } else apply(false); } });
    return true;
  },
  _loseArm() {
    const h = this.hero; const e = this.s.eq;
    h.armLost = true; h.armUsed = true;
    for (const slot of ['OM', 'MP']) {
      const u = e[slot]; if (!u) continue;
      if (slot === 'OM' || this.def(u).slot === '2M') { e[slot] = null; this.s.z.hand.push(u); this.emit('unequip', { uid: u, slot }); }
    }
    this.log('Pierdes el uso de tu otra mano para siempre: no podrás portar nada con ella ni usar armas a dos manos.', 'combat');
    this.emit('armLost', {});
  },

  /* ============================================================================ Enfrentarse a La Parca */
  /** Ofrece combatir contra La Parca. Devuelve true si la variante se hace cargo de la muerte. */
  _parcaOffer(reason) {
    const s = this.s;
    if (!s.variants?.enfrentarseParca || s.afterlife || s.parca) return false;
    const parca = this.cat.byCode.get('ANB1'); if (!parca) return false;
    s.parca = { stage: 'offer', reason };
    this._setStat('hp', Math.max(0, this.hero.hp), 'muerte');
    this.log(`Has muerto (${reason}). La Parca se presenta, sonríe y te ofrece combatir contra ella para regresar al mundo de los vivos.`, 'boss');
    this.emit('parcaOffer', { reason });
    this.ask('choice', { title: 'La Parca', scene: 'generic',
      text: 'Solo conservarás las armas de tus manos y no podrás usar bendiciones. Si la derrotas regresas al mundo de los vivos; si no, tu aventura termina para siempre.',
      options: [{ id: 'fight', label: 'Combatir contra La Parca', text: 'Empiezas con la salud y la energía al máximo.' }, { id: 'accept', label: 'Dejar que tu existencia se diluya', text: 'Fin de la partida.' }],
      onChoose: (id) => { if (id === 'fight') this._parcaFight(); else { s.parca = null; this.endGame('defeat', reason); } } });
    return true;
  },
  _parcaFight() {
    const s = this.s; const h = this.hero; const e = s.eq;
    const keep = new Set([e.MP, e.OM].filter((u) => u != null)); // solo las armas de las manos
    const lost = this.allItems().filter((u) => !keep.has(u));
    for (const u of lost) this.discardOwned(u, 'parca');
    s.afterlife = { skills: h.skills.slice(), blessings: h.blessings.splice(0), mercs: s.mercs.splice(0), combat: s.combat };
    if (s.afterlife.combat) this._dropCombatTasks();
    s.combat = null; h.skills = []; h.poison = 0;
    this._setStat('hp', this.maxHp(), 'la Parca'); this._setStat('energy', this.maxEnergy(), 'la Parca');
    const uid = this.mk(this.cat.byCode.get('ANB1').id);
    s.parca = { stage: 'duel', card: uid };
    this.log(`Cruzas a la Tierra de Nod con ${keep.size ? 'tus armas' : 'las manos vacías'}: pierdes ${lost.length} objeto(s). La Parca te espera.`, 'boss');
    this.emit('afterlife', { enter: true, card: uid });
    this.insert(function parcaDuel() {
      this.startCombat(uid, { ambush: 'normal', hpBonus: 0, source: 'parca', parca: true, noGrave: true, noTreasure: true });
    });
  },
  _parcaReturn() {
    const s = this.s; const h = this.hero; const a = s.afterlife; if (!a) return;
    h.skills = a.skills; h.blessings = a.blessings; s.mercs = a.mercs;
    h.gold = h.initial.gold; h.rations = h.initial.rations; h.poison = 0;
    if (s.parca?.card != null) s.z.removed.push(s.parca.card);
    s.afterlife = null; s.parca = null; s.combat = a.combat || null;
    this._clampHp();
    this.log('¡Has derrotado a La Parca! Regresas al mundo de los vivos con tus armas, tus habilidades y tus bendiciones; el oro y las raciones vuelven a sus cantidades iniciales.', 'boss');
    this.emit('afterlife', { enter: false });
    const c = s.combat;
    if (s.game.bossPending) { s.game.bossPending = false; this.push(this.startBoss); } // Necrofobia: el jefe aún no se ha combatido
    if (c && !c.defeated && !c.ended) {
      if (c.bombed) { c.bombed = false; this.insert(function bombFinish() { if (this.s.combat === c) this._defeat({ noTreasure: true }); }); }
      else if (!this.q.includes(this._cPlayerTurn)) this.insert(this._cPlayerTurn);
    }
  },

  /* ============================================================================ Entornos Temáticos */
  /** carta de entorno según el rumbo y el nivel (niveles 1-3); devuelve el uid o null (se roba al azar) */
  _themedEnvironment() {
    const dir = this.s.direction; if (!dir) return null;
    const row = this._bookTable('themed_env').find((r) => r.dir === dir.name); const lvl = this.s.level;
    let name = row?.levels?.[lvl - 1];
    if (!name) { this.log(`Entornos temáticos: el libro no define el nivel ${lvl}; se roba un entorno al azar.`, 'env'); return null; }
    if (Array.isArray(name)) { const d = this.rollOne('entorno'); name = name[d <= 3 ? 0 : 1]; this.log(`Entornos temáticos (Oeste, nivel 2): tiras ${d} y sale ${name}.`, 'env'); }
    const z = this.s.z;
    for (const zone of ['environments', 'environmentsDiscard']) {
      const i = z[zone].findIndex((u) => looseName(this.def(u).name) === looseName(name));
      if (i < 0) continue;
      const [uid] = z[zone].splice(i, 1); this.emit('draw', { uid, deck: 'environments' });
      this.log(`Entornos temáticos (${dir.name}, nivel ${lvl}): ${name}.`, 'env'); return uid;
    }
    this.log(`Entornos temáticos: «${name}» no está en el mazo de entornos; se roba uno al azar.`, 'env');
    return null;
  },

  /* ============================================================================ epílogos, lugares de retiro, encantamientos */
  /** Muertes Atroces: epílogo si caes ante un jefe final o un minijefe */
  _epilogue() {
    if (!this.s.variants?.muertesAtroces) return null;
    const c = this.s.combat; if (!c || c.parca || !(c.boss || c.miniboss)) return null;
    const r = book('epilogue').find((x) => looseName(x.name) === looseName(c.name));
    return r ? { name: r.name, text: r.text } : null;
  },
  _retreatText(rank) {
    if (!this.s.variants?.lugaresRetiro) return null;
    const r = book('retreat').find((x) => x.name === rank);
    return r ? { name: r.name, text: r.text } : null;
  },
  _incantation(d) {
    if (!this.s.variants?.encantamientos || d.deck !== 'potion') return;
    const r = book('enchantment').find((x) => looseName(x.name) === looseName(d.name));
    if (!r) return;
    this.log(`Recitas: «${r.text.replace(/\n/g, ' / ')}»`, 'item');
    this.emit('incantation', { name: d.name, text: r.text });
  },

  /* ============================================================================ aventuras encadenadas (Sin Retorno / Adrenalina) */
  /** Si quedan aventuras en la cadena, empieza la siguiente. Devuelve true si lo hace (la victoria final aún no ha llegado). */
  _nextAdventureIfChained() {
    const ch = this.s.chain;
    if (!ch || ch.index >= ch.total - 1) return false;
    this._startNextAdventure();
    return true;
  },
  _startNextAdventure() {
    const s = this.s; const ch = s.chain; const z = s.z; const h = this.hero;
    ch.index++;
    const adv = ch.adventures[ch.index];
    // 1. catálogo de la nueva aventura (otra campaña) con los mismos módulos y variantes
    const cfg = { modules: s.config.modules, ...(adv.campaign ? { campaign: adv.campaign } : {}), ...(s.config.custom ? { custom: s.config.custom } : {}),
      ...(s.config.variants ? { variants: s.config.variants } : {}) };
    this.cat = buildCatalog(cfg); s.config = this.cat.cfg; s.adventureLevel = this.cat.adventureLevel;
    // 2. se conserva lo que lleva el héroe (objetos, habilidades, aflicciones, esbirros, enemigos derrotados, cartas retiradas)
    const keep = new Set();
    const add = (u) => { if (u != null) keep.add(u); };
    z.hand.forEach(add); ['MP', 'OM', 'CA', 'CP'].forEach((k) => add(s.eq[k])); s.eq.AC.forEach(add);
    Object.values(h.skillCards).forEach(add); h.afflictions.forEach(add); s.mercs.forEach((m) => add(m.uid)); z.graveyard.forEach((e) => add(e.uid)); z.removed.forEach(add);
    for (const uid of Object.keys(s.cards).map(Number)) if (!keep.has(uid)) delete s.cards[uid];
    const skip = new Map(); for (const u of keep) { const id = s.cards[u].id; skip.set(id, (skip.get(id) || 0) + 1); }
    for (const k of ['dungeon', 'dungeonDiscard', 'enemies', 'enemiesDiscard', 'loot', 'lootDiscard', 'potions', 'potionsDiscard', 'plots', 'plotsPlayed', 'trappings',
      'skills', 'afflictions', 'afflictionsDiscard', 'bosses', 'environments', 'environmentsDiscard', 'artifacts', 'artifactsDiscard', 'mercenaries', 'adventure']) z[k] = [];
    z.pair = [null, null];
    s.level = 1; s.turn = 0; s.eyes = 0; s.bossStarted = false; s.env = null; s.encounter = null; s.lvl = {}; s.ctx = {}; s.combat = null; s.game.skipNext = 0;
    this._buildDecks(skip);
    this.q = []; s.prompt = null;
    this.log(`=== Aventura ${ch.index + 1} de ${ch.total}${adv.campaign ? ` (${adv.campaign})` : ''}: sigues adelante sin pasar por la Posada. ===`, 'level');
    this.emit('adventure', { index: ch.index, total: ch.total, level: adv.level, campaign: adv.campaign || null });
    this.push(this.startLevel);
  },
});

/* ================================================================================ acciones */
ACTIONS.spendXp = { // Gastar Puntos de Experiencia: 7 enemigos derrotados → +1 salud o energía máximas
  in: FREE,
  run({ stat }) { this.spendXp(stat); this.emit('prompt', { prompt: this.s.prompt }); return { ok: true }; },
};
