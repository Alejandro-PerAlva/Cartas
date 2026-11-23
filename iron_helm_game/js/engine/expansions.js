/**
 * IRON HELM · Mecánicas de los módulos con mazos propios:
 *  - Terreno y Reliquias (realms): cartas de entorno por nivel (los artefactos están en items.js).
 *  - Posada del Troll Solitario (troll): esbirros contratados en la posada.
 *  - Iron Chest (iron_chest): Encuentros Aleatorios entre niveles.
 */
import { Game, ACTIONS, MAX_MERCS } from './game.js';

const inRow = (row, v) => (Array.isArray(row) ? row.includes(v) : row === v);

Object.assign(Game.prototype, {
  /* ============================================================================ entornos */
  /** Efectos del entorno del nivel actual ({} sin Terreno y Reliquias) */
  envFx() { const u = this.s.env; return u ? this.def(u).env || {} : {}; },
  _drawEnvironment() {
    const z = this.s.z;
    if (this.s.env) { z.environmentsDiscard.push(this.s.env); this.s.env = null; }
    const uid = this.draw('environments');
    if (!uid) return;
    this.s.env = uid;
    const d = this.def(uid);
    this.emit('environment', { uid });
    this.log(`Entorno del nivel: ${d.name}.`, 'env');
    if (d.env?.onDraw) this.insert(function envNow() { this.applyOps(d.env.onDraw, d); });
  },

  /* ============================================================================ esbirros */
  merc(uid) { return this.s.mercs.find((m) => m.uid === uid) || null; },
  _mercByKey(key) { return this.s.mercs.find((m) => this.def(m.uid).key === key) || null; },
  hireMerc(uid) {
    const z = this.s.z;
    if (!this.cat.extras.mercenaries) this.fail('No juegas con La Posada del Troll Solitario.');
    if (!z.mercenaries.includes(uid)) this.fail('Ese esbirro no está en la posada.');
    if (this.s.mercs.length >= MAX_MERCS) this.fail(`No puedes contratar más de ${MAX_MERCS} esbirros.`);
    const d = this.def(uid);
    if (this.hero.gold < d.cost) this.fail(`No tienes oro suficiente: ${d.name} cuesta ${d.cost}.`);
    z.mercenaries.splice(z.mercenaries.indexOf(uid), 1);
    this.lose('gold', d.cost, 'contratar');
    this.s.mercs.push({ uid, morale: d.die, max: d.die });
    this.emit('mercenary', { uid, kind: 'hire', morale: d.die });
    this.log(`Contratas a ${d.name} por ${d.cost} de oro (moral ${d.die}).`, 'merc');
  },
  payMercMorale(uid) {
    const m = this.merc(uid);
    if (!m) this.fail('Ese esbirro no viaja contigo.');
    const d = this.def(uid);
    if (d.key === 'HM2') this.fail('La moral de Matilda no se recupera pagando oro.');
    if (m.morale >= m.max) this.fail(`${d.name} ya tiene la moral al máximo.`);
    if (this.hero.gold < 1) this.fail('No tienes oro.');
    this.lose('gold', 1, 'moral');
    m.morale++;
    this.emit('mercenary', { uid, kind: 'morale', morale: m.morale });
    this.log(`Pagas 1 de oro a ${d.name}: su moral sube a ${m.morale}.`, 'merc');
  },
  /** El esbirro pierde moral; con moral 0 te abandona */
  _mercLose(key, n, why) {
    const m = this._mercByKey(key); if (!m || n <= 0) return;
    const d = this.def(m.uid);
    m.morale = Math.max(0, m.morale - n);
    this.emit('mercenary', { uid: m.uid, kind: 'morale', morale: m.morale });
    this.log(`${d.name} pierde ${n} de moral (${why}): le queda ${m.morale}.`, 'merc');
    if (m.morale <= 0) this._mercLeave(m, 'Su moral ha llegado a 0.');
  },
  _mercLeave(m, why) {
    const d = this.def(m.uid);
    this.s.mercs.splice(this.s.mercs.indexOf(m), 1);
    this.s.z.removed.push(m.uid);
    this.emit('mercenary', { uid: m.uid, kind: 'leave', morale: m.morale });
    this.log(`${d.name} te abandona. ${why}`, 'merc');
    if (d.fx?.carryBonus) this.insert(this._weightCheck); // sin Yak puede sobrarte peso
  },
  /** Matilda: pierde 1 de moral cada vez que recibes 3 o más de daño */
  _mercHurt(n) { if (n >= 3) this._mercLose('HM2', 1, `recibes ${n} de daño`); },
  /** Farzad: pierde 1 de moral por cada ojo que ganes */
  _mercEyes(n) { this._mercLose('HM6', n, 'ganas ojos'); },
  /** al empezar un combate: Yak (no muertos) y Bogdana (enemigos de 5+ de salud) */
  _mercOnCombat(c) {
    if (c.weakness === 'undead') this._mercLose('HM3', 1, `encuentro con ${c.name}`);
    if (c.baseHp >= 5) this._mercLose('HM5', 1, `combate contra ${c.name}`);
  },
  /** al derrotar a un enemigo: Godfrey (no muertos) y Olive (6+ de salud) */
  _mercOnDefeat(c) {
    if (c.weakness !== 'undead') this._mercLose('HM7', 1, `derrotas a ${c.name}, que no es un no muerto`);
    if (c.baseHp >= 6) this._mercLose('HM8', 1, `derrotas a ${c.name}`);
  },
  /** efectos automáticos de los esbirros en el Campamento */
  _mercCamp() {
    if (this.hasMerc('HM1')) { this.gain('rations', 1, 'borko'); this.log('Borko busca provisiones: +1 ración.', 'merc'); }
    if (this.hasMerc('HM2')) { this.gain('energy', 1, 'matilda'); this.gain('hp', 1, 'matilda'); this.log('Matilda cocina con su propia comida: +1 de energía y +1 de salud.', 'merc'); }
    if (this.hasMerc('HM4')) { this.gain('rations', 1, 'eydis'); this.log('Eydis busca comida: +1 ración.', 'merc'); }
    if (this.hasMerc('HM5')) { this.gain('energy', 3, 'bogdana'); this.log('Bogdana te prepara una suculenta comida: +3 de energía.', 'merc'); }
    if (this.hasMerc('HM8') && this.hero.poison > 0) { this.lose('poison', this.hero.poison, 'olive'); this.log('Olive cura tus dolencias: eliminas todo el veneno.', 'merc'); }
    if (this.hasMerc('HM6')) this.log('Farzad solo se dedica a descansar.', 'merc');
  },
  /** fin de nivel: Borko necesita comer; a Eydis hay que pagarle 1 de oro */
  _mercUpkeep() {
    const borko = this._mercByKey('HM1');
    if (borko) {
      if (this.hero.rations > 0) { this.lose('rations', 1, 'borko'); this.log('Das de comer a Borko (1 ración).', 'merc'); }
      else this._mercLose('HM1', 1, 'no tienes comida para él');
    }
    const eydis = this._mercByKey('HM4');
    if (eydis) {
      if (this.hero.gold < 1) { this._mercLeave(eydis, 'No puedes pagarle.'); return; }
      this.ask('choice', { title: 'Eydis', source: eydis.uid, text: 'Al final de cada nivel debes pagar a Eydis una moneda de oro o te abandonará.', scene: 'generic',
        options: [{ id: 'pay', label: 'Pagar 1 de oro', text: 'Eydis sigue contigo.' }, { id: 'leave', label: 'Dejar que se marche', text: '' }],
        onChoose: (id) => {
          const m = this._mercByKey('HM4'); if (!m) return;
          if (id === 'pay') { this.lose('gold', 1, 'eydis'); this.log('Pagas 1 de oro a Eydis.', 'merc'); }
          else this._mercLeave(m, 'No le pagas.');
        } });
    }
  },

  /* ============================================================================ Iron Chest: encuentros aleatorios */
  _encounterStep(from, to) {
    const map = this.def(this.s.encounter.map);
    const tr = (map.transitions || []).find((t) => t.from === from && t.to === to);
    if (!tr) return;
    this.emit('encounter', { icon: tr.icon, from, to });
    this.log(`Encuentro aleatorio entre los niveles ${from} y ${to}.`, 'encounter');
    this._encounterIcon(tr.icon);
  },
  _encounterIcon(icon) {
    const T = this.cat.encounterTable || [];
    const sub = (name) => T.find((r) => r.name === name)?.subtable || [];
    const rowFor = (rows, d) => rows.find((r) => inRow(r.dice, d));
    switch (icon) {
      case 'trap': {
        const d = this.rollOne('encuentro'); const n = d === 1 ? 2 : d <= 4 ? 1 : 0;
        this.log(`TRAMPA (${d}): ${rowFor(sub('TRAMPA'), d)?.text || `ganas ${n} de veneno`}.`, 'encounter');
        if (n) { this.addPoison(n, 'trampa'); this.checkDeath(); }
        break;
      }
      case 'enemy':
        this.log('ENEMIGO: roba una carta de enemigo (sin bonificaciones de salud ni de daño inicial).', 'encounter');
        this._drawAndFight({ source: 'encounter', ambush: 'normal', hpBonus: 0, initialBonus: 0 });
        break;
      case 'mushrooms': {
        const d = this.rollOne('encuentro');
        this.log(`SETAS (${d}): ${rowFor(sub('SETAS'), d)?.text || ''}.`, 'encounter');
        if (d === 1) { this.addPoison(1, 'setas'); this.checkDeath(); } else this.gain('rations', d === 6 ? 2 : 1, 'setas');
        break;
      }
      case 'treasure': this.log('TESORO: ganas 1 carta de botín aleatoria.', 'encounter'); this.gainLoot(1); break;
      case 'potion': this.log('POCIÓN: ganas 1 carta de poción aleatoria.', 'encounter'); this.gainPotion(1); break;
      case 'random': {
        const d = this.rollOne('encuentro');
        if (d <= 5) { const next = ['trap', 'enemy', 'mushrooms', 'treasure', 'potion'][d - 1]; this.log(`ENCUENTRO ALEATORIO (${d}).`, 'encounter'); this._encounterIcon(next); break; }
        const e = this.rollOne('encuentro');
        this.log(`ENCUENTRO ALEATORIO (6 → ${e}): ${rowFor(sub('ENCUENTRO ALEATORIO'), e)?.text || ''}`, 'encounter');
        if (e === 1) { this.lose('hp', 3, 'desprendimiento'); this.checkDeath(); }
        else if (e === 2) { this.addPoison(1, 'espinas'); this.checkDeath(); }
        else if (e <= 4) {
          this.ask('choice', { title: 'Fuente', text: 'Ganas 2 de vida o 2 de energía.', scene: 'ops',
            options: [{ id: 'hp', label: '+2 de salud', text: '', ops: [['gain', 'hp', 2]] }, { id: 'energy', label: '+2 de energía', text: '', ops: [['gain', 'energy', 2]] }] });
        } else {
          const z = this.s.z;
          if (!z.trappings.length) { this.log('El cadáver no tiene nada útil.', 'encounter'); break; }
          const u = z.trappings.splice(this.rng.int(z.trappings.length), 1)[0];
          this.log(`Cadáver: encuentras ${this.def(u).name}.`, 'encounter');
          this.acquire(u);
        }
        break;
      }
      default: this.log(`Icono de encuentro desconocido: ${icon}`, 'encounter');
    }
  },
});

/* ================================================================================ acciones */
ACTIONS.hire = {
  in: ['setup'],
  run({ uid }) { this.hireMerc(uid); this.clear(); this.insert(function back() { this._askSetup(); }); },
};
ACTIONS.payMorale = {
  in: ['setup', 'turn'],
  run({ uid }, pr) {
    this.payMercMorale(uid);
    if (pr.type === 'setup') { this.clear(); this.insert(function back() { this._askSetup(); }); }
    else this.emit('prompt', { prompt: this.s.prompt });
  },
};
