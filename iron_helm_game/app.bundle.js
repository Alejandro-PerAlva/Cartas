// IRON HELM DIGITAL - BUNDLED STANDALONE VERSION
(function() {
"use strict";

// --- FILE: iron_helm_game/js/utils/logger.js ---

/**
 * IRON HELM DIGITAL - Sistema de Logging Estructurado
 * Permite registrar eventos categorizados, mantener historial y emitir eventos a la UI y consola de debug.
 */
const LogCategory = {
  GAME: 'GAME',
  EXPLORATION: 'EXPLORATION',
  COMBAT: 'COMBAT',
  INVENTORY: 'INVENTORY',
  EXPANSION: 'EXPANSION',
  DEBUG: 'DEBUG'
};

class GameLogger {
  constructor() {
    this.logs = [];
    this.listeners = [];
    this.maxLogs = 500;
  }

  log(category, message, details = null) {
    const entry = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toLocaleTimeString(),
      category,
      message,
      details
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Notificar a listeners (UI panels)
    this.listeners.forEach(fn => fn(entry));

    // Console output con colores
    const colors = {
      [LogCategory.GAME]: 'color: #f59e0b; font-weight: bold',
      [LogCategory.EXPLORATION]: 'color: #10b981; font-weight: bold',
      [LogCategory.COMBAT]: 'color: #ef4444; font-weight: bold',
      [LogCategory.INVENTORY]: 'color: #3b82f6; font-weight: bold',
      [LogCategory.EXPANSION]: 'color: #8b5cf6; font-weight: bold',
      [LogCategory.DEBUG]: 'color: #ec4899; font-weight: bold'
    };

    console.log(`%c[${entry.category}] %c${entry.message}`, colors[category] || '', 'color: inherit', details || '');
    return entry;
  }

  game(msg, details) { return this.log(LogCategory.GAME, msg, details); }
  explore(msg, details) { return this.log(LogCategory.EXPLORATION, msg, details); }
  combat(msg, details) { return this.log(LogCategory.COMBAT, msg, details); }
  inventory(msg, details) { return this.log(LogCategory.INVENTORY, msg, details); }
  expansion(msg, details) { return this.log(LogCategory.EXPANSION, msg, details); }
  debug(msg, details) { return this.log(LogCategory.DEBUG, msg, details); }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(fn => fn !== listener);
    };
  }

  getLogs(category = null) {
    if (!category || category === 'ALL') return this.logs;
    return this.logs.filter(l => l.category === category);
  }

  clear() {
    this.logs = [];
    this.listeners.forEach(fn => fn({ type: 'CLEAR' }));
  }

  exportJson() {
    return JSON.stringify(this.logs, null, 2);
  }
}
const logger = new GameLogger();




// --- FILE: iron_helm_game/js/utils/audio.js ---

/**
 * IRON HELM DIGITAL - Sistema de Sonidos Procedurales Web Audio
 * Efectos sonoros inmersivos generados mediante síntesis en tiempo real (cero dependencias externas).
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Sonido de volteo o extracción de carta
  playCardFlip() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.12);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  // Sonido de repartir cartas (fricción rápida de naipe)
  playCardDeal() {
    this.playCardFlip();
  }

  // Clic táctil de interfaz / ficha de madera
  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(250, t + 0.04);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  // Tirada de dados
  playDiceRoll() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    for (let i = 0; i < 4; i++) {
      const delay = i * 0.05 + Math.random() * 0.03;
      const t = this.ctx.currentTime + delay;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(300 + Math.random() * 250, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.06);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.06);
    }
  }

  // Impacto de arma / espada
  playSwordHit() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.2);

    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Golpe del monstruo
  playMonsterAttack() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.25);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // Monedas de oro
  playCoin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(1800, t);
    osc2.frequency.setValueAtTime(2400, t + 0.05);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc1.stop(t + 0.2);
    osc2.start(t + 0.05);
    osc2.stop(t + 0.3);
  }

  // Beber poción / usar objeto
  playPotion() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const stepT = t + i * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(350 + i * 80, stepT);
      osc.frequency.exponentialRampToValueAtTime(500 + i * 100, stepT + 0.07);

      gain.gain.setValueAtTime(0.2, stepT);
      gain.gain.exponentialRampToValueAtTime(0.01, stepT + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(stepT);
      osc.stop(stepT + 0.07);
    }
  }

  // Fanfarria de victoria
  playVictory() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.15;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + (idx === 3 ? 0.6 : 0.25));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + (idx === 3 ? 0.6 : 0.25));
    });
  }

  // Derrota
  playDefeat() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [220, 196, 174.61, 146.83];
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.22;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.3);
    });
  }
}
const soundManager = new SoundManager();




// --- FILE: iron_helm_game/js/data/characters.js ---

/**
 * IRON HELM - Catálogo de Personajes Héroes
 */
const CHARACTERS = [
  {
    id: 'fayon',
    code: 'C1',
    name: 'Fayon',
    title: 'El Espadachín Ágil',
    health: 14,
    energy: 11,
    encumbrance: 10,
    rations: 1,
    gold: 3,
    domain: 'AGILIDAD', // Agilidad, Mente, Fuerza
    skill: 'Esquivar',
    startingEquipmentIds: ['broquel', 'vestiduras'],
    image: 'assets/cards/base/card_000.jpg',
    description: 'Versátil y rápido. Capaz de esquivar ataques letales y adaptarse a cualquier terreno.'
  },
  {
    id: 'sortab',
    code: 'C2',
    name: 'Sortab',
    title: 'El Sabio Alquimista',
    health: 12,
    energy: 12,
    encumbrance: 9,
    rations: 1,
    gold: 3,
    domain: 'MENTE',
    skill: 'Alquimia',
    startingEquipmentIds: ['baculo_madera', 'cuna_puerta'],
    image: 'assets/cards/base/card_001.jpg',
    description: 'Erudito con gran reserva de energía. Domina la preparación de elixires y el conocimiento arcano.'
  },
  {
    id: 'zolla',
    code: 'C3',
    name: 'Zolla',
    title: 'La Exploradora Cazadora',
    health: 14,
    energy: 12,
    encumbrance: 8,
    rations: 1,
    gold: 2,
    domain: 'AGILIDAD',
    skill: 'Ocultación',
    startingEquipmentIds: ['arco_corto', 'armadura_cuero'],
    image: 'assets/cards/base/card_002.jpg',
    description: 'Precisa y sigilosa. Ataca desde las sombras antes de que el enemigo pueda reaccionar.'
  },
  {
    id: 'moliclan',
    code: 'C4',
    name: 'Moliclan',
    title: 'El Bárbaro Implacable',
    health: 16,
    energy: 10,
    encumbrance: 11,
    rations: 1,
    gold: 3,
    domain: 'FUERZA',
    skill: 'Bloquear',
    startingEquipmentIds: ['hacha', 'antorcha'],
    image: 'assets/cards/base/card_003.jpg',
    description: 'Poderoso guerrero cuerpo a cuerpo con la mayor salud y capacidad de carga.'
  },
  {
    id: 'uln_rolk',
    code: 'C11',
    name: 'Uln-Rolk',
    title: 'El Cruzado Devoto',
    health: 15,
    energy: 11,
    encumbrance: 10,
    rations: 1,
    gold: 3,
    domain: 'FUERZA',
    skill: 'Divinidad',
    startingEquipmentIds: ['maza'],
    image: 'assets/cards/base/card_004.jpg',
    description: 'Guerrero sagrado con fe inquebrantable, bendecido por los dioses de las profundidades.'
  },
  // Héroes de expansiones
  {
    id: 'ozzlo',
    code: 'C5',
    name: 'Ozzlo',
    title: 'El Bárbaro del Norte',
    expansion: 'warren',
    health: 17,
    energy: 10,
    encumbrance: 12,
    rations: 1,
    gold: 2,
    domain: 'FUERZA',
    skill: 'Dominio del Hacha',
    startingEquipmentIds: ['hacha'],
    image: 'assets/cards/expansions/warren/card_022.jpg',
    description: 'Bárbaro salvaje de Warren of Despair. Posee una vitalidad descomunal y una furia implacable con el hacha.'
  },
  {
    id: 'orla',
    code: 'C6',
    name: 'Orla',
    title: 'La Ocultista de las Sombras',
    expansion: 'blackened',
    health: 13,
    energy: 13,
    encumbrance: 9,
    rations: 1,
    gold: 3,
    domain: 'MENTE',
    skill: 'Nigromancia',
    startingEquipmentIds: ['daga_hierro'],
    image: 'assets/cards/expansions/blackened/card_008.jpg',
    description: 'Mística de Blackened Burrow versada en los secretos de ultratumba y canalización de energía arcana.'
  }
];




// --- FILE: iron_helm_game/js/data/bosses.js ---

/**
 * IRON HELM - Jefes Finales (Base + Expansiones)
 */
const BOSSES = [
  // Jefes del Juego Base (Determinados por la debilidad predominante en el Cementerio)
  {
    id: 'merodeador',
    code: 'B1',
    name: 'Merodeador',
    title: 'El Ojo de las Profundidades',
    health: 22,
    damage: 5,
    treasureType: 2,
    weakness: 'HIELO', // Vulnerable a daño de hielo
    ability: 'Ignora las bonificaciones defensivas de escudos y broqueles.',
    image: 'assets/cards/base/card_005.jpg',
    onEnemyAttack(player, combat) {
      combat.ignoreShields = true;
    }
  },
  {
    id: 'naga',
    code: 'B2',
    name: 'Naga',
    title: 'La Serpiente de la Desolación',
    health: 21,
    damage: 3,
    treasureType: 2,
    weakness: 'FUEGO', // Vulnerable a fuego
    ability: 'Cada vez que te impacta con éxito, ganas 2 fichas de veneno.',
    image: 'assets/cards/base/card_006.jpg',
    onEnemyHit(player, combat) {
      player.poison += 2;
      combat.log.push('¡La Naga te inyecta 2 fichas de veneno!');
    }
  },
  {
    id: 'lich',
    code: 'B3',
    name: 'Lich',
    title: 'El Soberano No Muerto',
    health: 20,
    damage: 4,
    treasureType: 2,
    weakness: 'NO_MUERTO', // Vulnerable a agua bendita / no muerto
    ability: 'Cuando impacta con su ataque inicial o contraataque, te roba 2 de energía.',
    image: 'assets/cards/base/card_007.jpg',
    onEnemyHit(player, combat) {
      const stolen = Math.min(2, player.energy);
      player.energy -= stolen;
      combat.log.push(`¡El Lich absorbe ${stolen} de tu energía!`);
    }
  },

  // Jefes de Campañas / Expansiones
  {
    id: 'vermin_king',
    code: 'BOSS_WARREN',
    expansion: 'warren',
    name: 'El Rey de las Alimañas',
    title: 'Jefe de Warren of Despair',
    health: 24,
    damage: 4,
    treasureType: 2,
    weakness: 'FUEGO',
    ability: 'Invoca enjambres. Al inicio de cada turno de combate, sufres 1 punto de daño inevitable por alimañas.',
    image: 'assets/cards/expansions/warren/card_005.jpg',
    onRoundStart(player, combat) {
      player.hp -= 1;
      combat.log.push('¡El enjambre de alimañas te muerde infligiéndote 1 de daño!');
    }
  },
  {
    id: 'lord_of_embers',
    code: 'BOSS_EMBERS',
    expansion: 'throne_of_embers',
    name: 'Señor de las Ascuas',
    title: 'Tirano del Trono de Fuego',
    health: 25,
    damage: 5,
    treasureType: 2,
    weakness: 'HIELO',
    ability: 'Quema el equipamiento. Cada golpe exitoso te destruye 1 ración o te inflige 1 daño adicional.',
    image: 'assets/cards/base/card_005.jpg'
  },
  {
    id: 'abyss_shadow',
    code: 'BOSS_ABYSS',
    expansion: 'howling_abyss',
    name: 'La Sombra del Abismo',
    title: 'Horror Primigenio de las Nieves',
    health: 26,
    damage: 4,
    treasureType: 2,
    weakness: 'FUEGO',
    ability: 'Frío glacial: El coste en energía de tus ataques aumenta en 1 ficha.',
    image: 'assets/cards/base/card_007.jpg'
  }
];




// --- FILE: iron_helm_game/js/data/enemies.js ---

/**
 * IRON HELM - Catálogo de Enemigos / Monstruos
 */
const ENEMIES = [
  {
    id: 'skinkling',
    code: 'E3',
    name: 'Skinkling',
    health: 1,
    damage: 0,
    treasureType: 1, // 0: Nada, 1: Botín u Oro, 2: Botín y Poción
    gold: 1,
    weakness: 'FUEGO',
    ability: 'Ganas 1 ficha de veneno cuando te impacte con éxito.',
    image: 'assets/cards/base/card_025.jpg',
    onHit(player, combat) {
      player.poison += 1;
      combat.log.push('¡El Skinkling te envenena (+1 Veneno)!');
    }
  },
  {
    id: 'arquero_no_muerto',
    code: 'E6',
    name: 'Arquero No Muerto',
    health: 4,
    damage: 2,
    treasureType: 1,
    gold: 1,
    weakness: 'NO_MUERTO',
    ability: 'No puedes defenderte del daño inicial infligido (ignora armadura en el primer ataque).',
    image: 'assets/cards/base/card_020.jpg',
    onInitialAttack(player, combat) {
      combat.ignoreArmorInitial = true;
    }
  },
  {
    id: 'goblin_berserker',
    code: 'E1',
    name: 'Goblin Berserker',
    health: 6,
    damage: 2,
    treasureType: 1,
    gold: 1,
    weakness: 'FUEGO',
    ability: 'Furia ciega: Si su salud cae por debajo de 3, suma +1 a todos sus ataques.',
    image: 'assets/cards/base/card_021.jpg'
  },
  {
    id: 'lobo_sombras',
    code: 'E2',
    name: 'Lobo de las Sombras',
    health: 5,
    damage: 3,
    treasureType: 0,
    gold: 0,
    weakness: 'HIELO',
    ability: 'Mordisco salvaje: Al impactar, si la diferencia de dados fue 4+, inflige 1 daño adicional.',
    image: 'assets/cards/base/card_022.jpg'
  },
  {
    id: 'masa_devoradora',
    code: 'E4',
    name: 'Masa Devoradora',
    health: 8,
    damage: 1,
    treasureType: 1,
    gold: 1,
    weakness: 'FUEGO',
    ability: 'Cuerpo gelatinoso: Es inmune a las armas cortantes si no usas energía.',
    image: 'assets/cards/base/card_023.jpg'
  },
  {
    id: 'esqueleto_guerrero',
    code: 'E5',
    name: 'Esqueleto Guerrero',
    health: 5,
    damage: 2,
    treasureType: 1,
    gold: 1,
    weakness: 'NO_MUERTO',
    ability: 'Resistencia ósea: Resta 1 al daño recibido si el arma no es contundente (Maza/Martillo).',
    image: 'assets/cards/base/card_024.jpg'
  },
  {
    id: 'troll_cueva',
    code: 'E7',
    name: 'Troll de Cueva',
    health: 10,
    damage: 4,
    treasureType: 2,
    gold: 3,
    weakness: 'FUEGO',
    ability: 'Piel rocosa: Resta 1 a todo el daño que reciba.',
    image: 'assets/cards/base/card_026.jpg'
  },
  {
    id: 'necrofago',
    code: 'E8',
    name: 'Necrófago',
    health: 7,
    damage: 2,
    treasureType: 1,
    gold: 2,
    weakness: 'NO_MUERTO',
    ability: 'Parálisis cadavérica: Al impactar con éxito, pierdes 1 punto de energía adicional.',
    image: 'assets/cards/base/card_027.jpg',
    onHit(player, combat) {
      if (player.energy > 0) {
        player.energy -= 1;
        combat.log.push('¡El Necrófago drena 1 punto de tu energía!');
      }
    }
  },
  {
    id: 'serpiente_catacumba',
    code: 'E9',
    name: 'Serpiente de Catacumba',
    health: 3,
    damage: 1,
    treasureType: 0,
    gold: 0,
    weakness: 'HIELO',
    ability: 'Veneno neurotóxico: Ganas 1 ficha de veneno por cada impacto exitoso.',
    image: 'assets/cards/base/card_028.jpg',
    onHit(player, combat) {
      player.poison += 1;
      combat.log.push('¡La Serpiente inocula veneno (+1)!');
    }
  },
  {
    id: 'gargola_petrea',
    code: 'E10',
    name: 'Gárgola Pétrea',
    health: 8,
    damage: 3,
    treasureType: 1,
    gold: 2,
    weakness: 'HIELO',
    ability: 'Ataque en picado: El daño inicial del enemigo aumenta en +1.',
    image: 'assets/cards/base/card_029.jpg'
  },

  // Enemigos de Expansiones
  {
    id: 'rata_mutante',
    code: 'EXP_WARREN_E1',
    expansion: 'warren',
    name: 'Rata Mutante de Madriguera',
    health: 4,
    damage: 2,
    treasureType: 1,
    gold: 1,
    weakness: 'FUEGO',
    ability: 'Portador de plagas: Al final del combate, si te causó daño, ganas 1 ficha de veneno.',
    image: 'assets/cards/expansions/warren/card_010.jpg'
  },
  {
    id: 'demonio_cenizas',
    code: 'EXP_BEAST_E1',
    expansion: 'beasts',
    name: 'Demonio de Cenizas',
    health: 9,
    damage: 3,
    treasureType: 2,
    gold: 3,
    weakness: 'HIELO',
    ability: 'Aura ardiente: Sufres 1 de daño de calor al golpearle con armas cuerpo a cuerpo.',
    image: 'assets/cards/expansions/beasts/card_005.jpg'
  }
];




// --- FILE: iron_helm_game/js/data/equipment.js ---

/**
 * IRON HELM - Catálogo de Equipamiento y Armas
 * Slots:
 *   MP: Mano Principal
 *   OM: Otra Mano (Escudo, Antorcha, etc.)
 *   2M: Dos Manos (Arcos, Mandobles)
 *   CP: Cuerpo (Armadura)
 *   CA: Cabeza (Cascos)
 *   AC: Accesorio (Riñonera, Anillos, Cuña)
 */
const EQUIPMENT = [
  {
    id: 'broquel',
    name: 'Broquel',
    type: 'EQUIPMENT',
    slot: 'OM',
    price: 2,
    weight: 1,
    image: 'assets/cards/base/card_068.jpg',
    description: 'Escudo ligero de madera. Resta 1 punto al daño inicial del enemigo.',
    armorValueInitial: 1,
    armorValueCounter: 0
  },
  {
    id: 'vestiduras',
    name: 'Vestiduras de Viajero',
    type: 'EQUIPMENT',
    slot: 'CP',
    price: 1,
    weight: 1,
    image: 'assets/cards/base/card_069.jpg',
    description: 'Ropajes resistentes que amortiguan golpes ligeros.',
    armorValueInitial: 1,
    armorValueCounter: 0
  },
  {
    id: 'baculo_madera',
    name: 'Báculo de Madera',
    type: 'EQUIPMENT',
    slot: 'MP',
    price: 2,
    weight: 2,
    image: 'assets/cards/base/card_065.jpg',
    description: 'Arma mágica básica. Inflige 1d6 + 1 de daño por cada punto de energía gastado.',
    attackBonus: 1
  },
  {
    id: 'cuna_puerta',
    name: 'Cuña de Puerta',
    type: 'EQUIPMENT',
    slot: 'AC',
    price: 1,
    weight: 1,
    image: 'assets/cards/base/card_066.jpg',
    description: 'Herramienta útil para trabar puertas o evitar emboscadas al retirarse.',
    passive: 'Permite pasar una carta de trampa de puerta sin sufrir penalizaciones.'
  },
  {
    id: 'arco_corto',
    name: 'Arco Corto',
    type: 'EQUIPMENT',
    slot: '2M',
    price: 4,
    weight: 2,
    image: 'assets/cards/base/card_067.jpg',
    description: 'Arma a dos manos. Te permite disparar a distancia antes de que el enemigo se acerque.',
    attackBonus: 1,
    ranged: true
  },
  {
    id: 'armadura_cuero',
    name: 'Armadura de Cuero',
    type: 'EQUIPMENT',
    slot: 'CP',
    price: 3,
    weight: 2,
    image: 'assets/cards/base/card_071.jpg',
    description: 'Armadura flexible. Resta 1 tanto al daño inicial como a los contraataques del enemigo.',
    armorValueInitial: 1,
    armorValueCounter: 1
  },
  {
    id: 'hacha',
    name: 'Hacha de Mano',
    type: 'EQUIPMENT',
    slot: 'MP',
    price: 3,
    weight: 2,
    image: 'assets/cards/base/card_072.jpg',
    description: 'Inflige 1d6 + 2 de daño. Puedes descartarla para lanzarla e infligir 3d6 de daño sin gastar energía.',
    attackBonus: 2,
    canThrow: true
  },
  {
    id: 'antorcha',
    name: 'Antorcha',
    type: 'EQUIPMENT',
    slot: 'OM',
    price: 1,
    weight: 1,
    image: 'assets/cards/base/card_073.jpg',
    description: 'Ilumina los rincones oscuros. Otorga +1 a la moral o previene penalizadores por penumbra.',
    lightSource: true
  },
  {
    id: 'maza',
    name: 'Maza de Hierro',
    type: 'EQUIPMENT',
    slot: 'MP',
    price: 3,
    weight: 2,
    image: 'assets/cards/base/card_074.jpg',
    description: 'Arma contundente sagrada. Inflige 1d6 + 2 de daño (anula la resistencia de esqueletos).',
    attackBonus: 2,
    blunt: true
  },
  {
    id: 'espada_larga',
    name: 'Espada Larga',
    type: 'EQUIPMENT',
    slot: 'MP',
    price: 5,
    weight: 3,
    image: 'assets/cards/base/card_075.jpg',
    description: 'Hoja de acero templado. Inflige 1d6 + 3 de daño con cada impacto.',
    attackBonus: 3
  },
  {
    id: 'escudo',
    name: 'Escudo de Roble',
    type: 'EQUIPMENT',
    slot: 'OM',
    price: 4,
    weight: 3,
    image: 'assets/cards/base/card_070.jpg',
    description: 'Escudo pesado. Resta 1 tanto al daño inicial como a los contraataques del enemigo.',
    armorValueInitial: 1,
    armorValueCounter: 1
  },
  {
    id: 'cota_malla',
    name: 'Cota de Malla',
    type: 'EQUIPMENT',
    slot: 'CP',
    price: 6,
    weight: 4,
    image: 'assets/cards/base/card_076.jpg',
    description: 'Malla metálica entrelazada. Resta 2 puntos a todo el daño recibido.',
    armorValueInitial: 2,
    armorValueCounter: 2
  },
  {
    id: 'casco_hierro',
    name: 'Casco de Hierro (Iron Helm)',
    type: 'EQUIPMENT',
    slot: 'CA',
    price: 5,
    weight: 2,
    image: 'assets/cards/base/card_077.jpg',
    description: 'El legendario yelmo de hierro. Te protege de golpes críticos y trampas de techo.',
    armorValueInitial: 1,
    armorValueCounter: 1
  },
  // Expansiones
  {
    id: 'fanny_pack_item',
    name: 'Riñonera de Aventura',
    expansion: 'fanny_pack',
    type: 'EQUIPMENT',
    slot: 'AC',
    price: 2,
    weight: 0,
    image: 'assets/cards/expansions/fanny_pack/card_000.jpg',
    description: 'Proporciona compartimentos extra. Aumenta la capacidad de carga máxima en +2.',
    encumbranceBonus: 2
  }
];




// --- FILE: iron_helm_game/js/data/potions.js ---

/**
 * IRON HELM - Pociones y Consumibles
 */
const POTIONS = [
  {
    id: 'pocion_salud',
    code: 'L5',
    name: 'Poción de Salud',
    type: 'POTION',
    price: 1,
    weight: 1,
    slot: 'AC',
    image: 'assets/cards/base/card_040.jpg',
    description: 'Descartar en cualquier momento para recuperar 4 puntos de salud.',
    usableAnytime: true,
    use(player) {
      const healed = Math.min(4, player.maxHp - player.hp);
      player.hp += healed;
      return `Bebes la poción y recuperas ${healed} puntos de vida.`;
    }
  },
  {
    id: 'pocion_energia',
    code: 'L6',
    name: 'Poción de Energía',
    type: 'POTION',
    price: 1,
    weight: 1,
    slot: 'AC',
    image: 'assets/cards/base/card_041.jpg',
    description: 'Descartar en cualquier momento para recuperar 4 puntos de energía.',
    usableAnytime: true,
    use(player) {
      const restored = Math.min(4, player.maxEnergy - player.energy);
      player.energy += restored;
      return `Bebes la poción y recuperas ${restored} puntos de energía.`;
    }
  },
  {
    id: 'antidoto',
    code: 'L7',
    name: 'Antídoto',
    type: 'POTION',
    price: 1,
    weight: 1,
    slot: 'AC',
    image: 'assets/cards/base/card_042.jpg',
    description: 'Neutraliza toxinas. Descarta inmediatamente todas las fichas de veneno que tengas.',
    usableAnytime: true,
    use(player) {
      const cleared = player.poison;
      player.poison = 0;
      return `El antídoto purga el veneno de tu cuerpo (eliminadas ${cleared} fichas).`;
    }
  },
  {
    id: 'esquirla_hielo',
    code: 'L8',
    name: 'Esquirla de Hielo',
    type: 'COMBAT_POTION',
    price: 2,
    weight: 1,
    slot: 'AC',
    damageType: 'HIELO',
    image: 'assets/cards/base/card_043.jpg',
    description: 'Poción arrojadiza ofensiva. Inflige 2d6 de daño de frío ignorando la armadura del enemigo.',
    combatOnly: true,
    throw(combat, enemy) {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      let total = d1 + d2;
      if (enemy.weakness === 'HIELO') {
        total += 3;
      }
      enemy.hp -= total;
      return `¡Arrojas la Esquirla de Hielo [${d1}, ${d2}] infligiendo ${total} de daño helado al ${enemy.name}!`;
    }
  },
  {
    id: 'agua_bendita',
    code: 'L9',
    name: 'Agua Bendita',
    type: 'COMBAT_POTION',
    price: 2,
    weight: 1,
    slot: 'AC',
    damageType: 'NO_MUERTO',
    image: 'assets/cards/base/card_044.jpg',
    description: 'Poción sagrada. Inflige 3d6 de daño masivo contra enemigos No Muertos (o 1d6 a otros).',
    combatOnly: true,
    throw(combat, enemy) {
      const isUndead = enemy.weakness === 'NO_MUERTO';
      const diceCount = isUndead ? 3 : 1;
      let total = 0;
      const rolls = [];
      for (let i = 0; i < diceCount; i++) {
        const r = Math.floor(Math.random() * 6) + 1;
        rolls.push(r);
        total += r;
      }
      enemy.hp -= total;
      return `¡Rocías con Agua Bendita [${rolls.join(', ')}] infligiendo ${total} de daño sagrado al ${enemy.name}!`;
    }
  },
  {
    id: 'bomba_mecha',
    code: 'L10',
    name: 'Bomba de Mecha',
    type: 'COMBAT_POTION',
    price: 3,
    weight: 1,
    slot: 'AC',
    damageType: 'FUEGO',
    image: 'assets/cards/base/card_045.jpg',
    description: 'Artefacto explosivo. Inflige 3d6 de daño de fuego a cualquier enemigo.',
    combatOnly: true,
    throw(combat, enemy) {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      let total = d1 + d2 + d3;
      if (enemy.weakness === 'FUEGO') total += 2;
      enemy.hp -= total;
      return `¡BOOM! La Bomba estalla [${d1}, ${d2}, ${d3}] causando ${total} de daño de fuego al ${enemy.name}!`;
    }
  }
];




// --- FILE: iron_helm_game/js/data/skills.js ---

/**
 * IRON HELM - Habilidades de Personajes
 * Dominios: AGILIDAD, MENTE, FUERZA
 */
const SKILLS = [
  {
    id: 'esquivar',
    name: 'Esquivar',
    domain: 'AGILIDAD',
    energyCost: 1,
    image: 'assets/cards/base/card_050.jpg',
    description: 'Gasta 1 punto de Energía durante un ataque enemigo para restar 1 al daño que recibas.',
    canUseInCombat: true,
    executeInCombat(player, combat) {
      if (player.energy >= 1) {
        player.energy -= 1;
        combat.damageReduction = (combat.damageReduction || 0) + 1;
        return '¡Te arqueas y esquivas parte del impacto (-1 Energía, -1 Daño recibido)!';
      }
      return 'No tienes suficiente energía para esquivar.';
    }
  },
  {
    id: 'alquimia',
    name: 'Alquimia',
    domain: 'MENTE',
    energyCost: 1,
    image: 'assets/cards/base/card_051.jpg',
    description: 'Gasta 1 de Energía para destilar un brebaje purificador: cura 2 de salud o quita 1 veneno.',
    canUseOutOfCombat: true,
    executeOutOfCombat(player) {
      if (player.energy >= 1) {
        player.energy -= 1;
        if (player.poison > 0) {
          player.poison -= 1;
          return 'Transmutas hierbas y neutralizas 1 ficha de veneno (-1 Energía).';
        } else {
          player.hp = Math.min(player.maxHp, player.hp + 2);
          return 'Destilas un ungüento curativo que te restaura +2 de Salud (-1 Energía).';
        }
      }
      return 'No tienes suficiente energía para practicar alquimia.';
    }
  },
  {
    id: 'ocultacion',
    name: 'Ocultación',
    domain: 'AGILIDAD',
    energyCost: 2,
    image: 'assets/cards/base/card_052.jpg',
    description: 'Gasta 2 de Energía para desvanecerte entre las sombras y huir del combate (excepto Jefes).',
    canUseInCombat: true,
    executeInCombat(player, combat) {
      if (combat.isBoss) {
        return '¡No puedes huir del Jefe Final!';
      }
      if (player.energy >= 2) {
        player.energy -= 2;
        combat.escaped = true;
        return '¡Arrojas polvo a los ojos de tu enemigo y te desvaneces en la penumbra!';
      }
      return 'Necesitas 2 de energía para ocultarte.';
    }
  },
  {
    id: 'bloquear',
    name: 'Bloquear',
    domain: 'FUERZA',
    energyCost: 1,
    image: 'assets/cards/base/card_053.jpg',
    description: 'Gasta 1 de Energía para plantar firmemente tu escudo o arma, absorbiendo 2 puntos de daño.',
    canUseInCombat: true,
    executeInCombat(player, combat) {
      if (player.energy >= 1) {
        player.energy -= 1;
        combat.damageReduction = (combat.damageReduction || 0) + 2;
        return '¡Afianzas tu guardia y absorbes 2 puntos de daño (-1 Energía)!';
      }
      return 'No tienes suficiente energía para bloquear.';
    }
  },
  {
    id: 'divinidad',
    name: 'Divinidad',
    domain: 'FUERZA',
    energyCost: 2,
    image: 'assets/cards/base/card_054.jpg',
    description: 'Gasta 2 de Energía para invocar la bendición de los dioses: cura 2 de salud y elimina 1 veneno.',
    canUseOutOfCombat: true,
    executeOutOfCombat(player) {
      if (player.energy >= 2) {
        player.energy -= 2;
        player.hp = Math.min(player.maxHp, player.hp + 2);
        if (player.poison > 0) player.poison -= 1;
        return 'Una luz divina te envuelve: +2 Salud y -1 Veneno (-2 Energía).';
      }
      return 'Necesitas 2 de energía para rezar por divinidad.';
    }
  },
  {
    id: 'golpe_brutal',
    name: 'Golpe Brutal',
    domain: 'FUERZA',
    energyCost: 2,
    image: 'assets/cards/base/card_050.jpg',
    description: 'Gasta 2 de Energía adicionales al atacar para infligir +3 de daño contundente garantizado.',
    canUseInCombat: true,
    executeInCombat(player, combat) {
      if (player.energy >= 2) {
        player.energy -= 2;
        combat.attackBonus = (combat.attackBonus || 0) + 3;
        return '¡Cargas toda tu masa muscular en el golpe (+3 daño, -2 Energía)!';
      }
      return 'No tienes suficiente energía.';
    }
  },
  {
    id: 'dominio_hacha',
    name: 'Dominio del Hacha',
    domain: 'FUERZA',
    energyCost: 1,
    image: 'assets/cards/expansions/warren/card_026.jpg',
    description: 'Gasta 1 de Energía para hendir tu hacha con violencia bárbara: suma +2 al daño de impacto.',
    canUseInCombat: true,
    executeInCombat(player, combat) {
      if (player.energy >= 1) {
        player.energy -= 1;
        combat.attackBonus = (combat.attackBonus || 0) + 2;
        return '¡Blandes tu hacha con violencia bárbara (+2 Daño, -1 Energía)!';
      }
      return 'No tienes suficiente energía.';
    }
  },
  {
    id: 'nigromancia',
    name: 'Nigromancia',
    domain: 'MENTE',
    energyCost: 2,
    image: 'assets/cards/expansions/blackened/card_010.jpg',
    description: 'Gasta 2 de Energía para canalizar el dolor ajeno: drena 2 de salud al enemigo para restaurar la tuya.',
    canUseInCombat: true,
    executeInCombat(player, combat) {
      if (player.energy >= 2) {
        player.energy -= 2;
        combat.attackBonus = (combat.attackBonus || 0) + 2;
        player.hp = Math.min(player.maxHp, player.hp + 2);
        return '¡Canalizas sombras oscuras: infliges +2 Daño y recuperas +2 Salud (-2 Energía)!';
      }
      return 'No tienes suficiente energía para practicar Nigromancia.';
    }
  }
];




// --- FILE: iron_helm_game/js/data/plots.js ---

/**
 * IRON HELM - Cartas de Trama (Plot Cards)
 * Cada carta de trama contiene un dilema moral y de 1 a 3 iconos de ojo.
 * Al acumular 10 iconos de ojo en total, se desencadena el combate contra el Jefe Final.
 */
const PLOT_CARDS = [
  {
    id: 'pt8_prisionero',
    code: 'PT8',
    name: 'El Prisionero',
    eyes: 3,
    image: 'assets/cards/base/card_085.jpg',
    narrative: 'En una celda ves a un solitario prisionero que te señala las llaves sobre la mesa donde duerme un guardia orco.',
    choices: [
      {
        id: 'free',
        label: '¿Liberar al prisionero?',
        detail: 'Pierdes 1 de energía y 3 de salud. Sube 1 nivel en moral. Ganas 2 de oro y 1 carta de botín.',
        execute(game) {
          game.hero.energy = Math.max(0, game.hero.energy - 1);
          game.hero.hp = Math.max(1, game.hero.hp - 3);
          game.hero.morale = Math.min(5, game.hero.morale + 1);
          game.hero.gold += 2;
          const loot = game.drawLoot();
          return `Liberas al prisionero: -1 Energía, -3 Salud, +1 Moral, +2 Oro y ${loot.name}.`;
        }
      },
      {
        id: 'steal',
        label: '¿Coger el oro y huir?',
        detail: 'Baja 1 nivel en el control de moral. Ganas 2 de oro.',
        execute(game) {
          game.hero.morale = Math.max(-5, game.hero.morale - 1);
          game.hero.gold += 2;
          return 'Coges las monedas sin liberar al preso: -1 Moral, +2 Oro.';
        }
      }
    ]
  },
  {
    id: 'pt1_mendigo',
    code: 'PT1',
    name: 'El Mendigo Ciego',
    eyes: 2,
    image: 'assets/cards/base/card_080.jpg',
    narrative: 'Un anciano harapiento extiende su cuenco tembloroso suplicando comida.',
    choices: [
      {
        id: 'share_food',
        label: 'Compartir 1 Ración',
        condition: (p) => p.rations > 0,
        detail: 'Gastas 1 Ración. Sube 1 de moral y ganas 1 Bendición.',
        execute(game) {
          game.hero.rations -= 1;
          game.hero.morale = Math.min(5, game.hero.morale + 1);
          game.hero.blessings += 1;
          return 'Compartes tu comida: -1 Ración, +1 Moral, +1 Bendición.';
        }
      },
      {
        id: 'ignore',
        label: 'Ignorar y Pasar de Largo',
        detail: 'Baja 1 nivel en el control de moral.',
        execute(game) {
          game.hero.morale = Math.max(-5, game.hero.morale - 1);
          return 'Apartas la mirada con el corazón endurecido: -1 Moral.';
        }
      }
    ]
  },
  {
    id: 'pt2_ladron_herido',
    code: 'PT2',
    name: 'El Ladrón Moribundo',
    eyes: 1,
    image: 'assets/cards/base/card_081.jpg',
    narrative: 'Un ladrón yace desangrándose en el suelo. A su lado descansa una bolsa con botín robado.',
    choices: [
      {
        id: 'heal_thief',
        label: 'Curar sus heridas (gasta 1 Energía)',
        detail: 'Gastas 1 de energía. Sube 1 nivel de moral y el ladrón te regala una poción.',
        execute(game) {
          game.hero.energy = Math.max(0, game.hero.energy - 1);
          game.hero.morale = Math.min(5, game.hero.morale + 1);
          const pot = game.drawPotion();
          return `Vendas sus heridas: -1 Energía, +1 Moral y te entrega ${pot.name}.`;
        }
      },
      {
        id: 'loot_body',
        label: 'Desvalijar al ladrón',
        detail: 'Ganas 3 Monedas de Oro y 1 carta de botín. Baja 2 niveles de moral.',
        execute(game) {
          game.hero.gold += 3;
          game.hero.morale = Math.max(-5, game.hero.morale - 2);
          const loot = game.drawLoot();
          return `Tomas su bolsa sin piedad: +3 Oro, ${loot.name}, -2 Moral.`;
        }
      }
    ]
  },
  {
    id: 'pt3_reliquia_maldita',
    code: 'PT3',
    name: 'La Reliquia Corrupta',
    eyes: 2,
    image: 'assets/cards/base/card_082.jpg',
    narrative: 'Un ídolo de obsidiana susurra promesas oscuras sobre un pedestal rodeado de calaveras.',
    choices: [
      {
        id: 'destroy_relic',
        label: 'Destruir el Ídolo con tu arma',
        detail: 'Gastas 2 de energía. Sube 1 de moral y ganas 1 Bendición.',
        execute(game) {
          game.hero.energy = Math.max(0, game.hero.energy - 2);
          game.hero.morale = Math.min(5, game.hero.morale + 1);
          game.hero.blessings += 1;
          return 'Haces añicos el ídolo oscuro: -2 Energía, +1 Moral, +1 Bendición.';
        }
      },
      {
        id: 'embrace_darkness',
        label: 'Aceptar el poder oscuro',
        detail: 'Recuperas toda tu energía al instante, pero sufres 2 fichas de veneno y -2 a la moral.',
        execute(game) {
          game.hero.energy = game.hero.maxEnergy;
          game.hero.poison += 2;
          game.hero.morale = Math.max(-5, game.hero.morale - 2);
          return 'El poder oscuro revitaliza tus músculos: Energía al máximo, +2 Veneno, -2 Moral.';
        }
      }
    ]
  },
  {
    id: 'pt4_fuente_lagrimas',
    code: 'PT4',
    name: 'La Fuente de las Lágrimas',
    eyes: 2,
    image: 'assets/cards/base/card_083.jpg',
    narrative: 'Una estatua de una doncella llora lágrimas de plata en una pila de mármol.',
    choices: [
      {
        id: 'offer_gold',
        label: 'Lanzar 1 Moneda de Oro en ofrenda',
        condition: (p) => p.gold >= 1,
        detail: 'Gastas 1 Oro. Ganas 1 Bendición y curas 2 de Salud.',
        execute(game) {
          game.hero.gold -= 1;
          game.hero.blessings += 1;
          game.hero.hp = Math.min(game.hero.maxHp, game.hero.hp + 2);
          return 'Ofreces tu moneda a la estatua: -1 Oro, +1 Bendición, +2 Salud.';
        }
      },
      {
        id: 'steal_silver',
        label: 'Saquear la plata de la fuente',
        detail: 'Ganas 3 de Oro. Baja 1 de moral.',
        execute(game) {
          game.hero.gold += 3;
          game.hero.morale = Math.max(-5, game.hero.morale - 1);
          return 'Coges la plata del agua: +3 Oro, -1 Moral.';
        }
      }
    ]
  }
];




// --- FILE: iron_helm_game/js/data/dungeonCards.js ---

/**
 * IRON HELM - Mazo de Mazmorra (Dungeon Deck)
 * Tipos:
 *   TIPO_1: Cartas narrativas / interactivas (Altar, Campamento, Claro, Mercader, Fuente)
 *   TIPO_2: Cartas con Opción 1 (revelada primera) y Opción 2 (revelada segunda obligatoria)
 */
const DUNGEON_CARDS = [
  {
    id: 'd1_emboscada',
    code: 'D1',
    name: 'Emboscada',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_008.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Pillas a tu enemigo por sorpresa',
      description: 'Ganas la iniciativa y atacas primero. Roba 1 carta de Enemigo e ignora su daño inicial. Añade el nivel de mazmorra a su salud.',
      actionType: 'COMBAT',
      ambushType: 'PLAYER_AMBUSH', // Jugador tiene iniciativa, ignora daño inicial
      enemyHpBonus: 'LEVEL'
    },
    option2: {
      title: 'Tu enemigo te pilla por sorpresa',
      description: 'El enemigo gana la iniciativa. Roba 1 carta de Enemigo y añade el nivel de mazmorra a su daño inicial. Añade nivel de mazmorra + 4 a su salud.',
      actionType: 'COMBAT',
      ambushType: 'ENEMY_AMBUSH', // Enemigo ataca primero con daño potenciado
      enemyDamageBonus: 'LEVEL',
      enemyHpBonus: 'LEVEL_PLUS_4'
    }
  },
  {
    id: 'd2_escaramuza',
    code: 'D2',
    name: 'Escaramuza',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_012.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Combate frontal',
      description: 'Te topas con un enemigo en el pasillo. El enemigo ataca primero con su daño normal. Añade el nivel de mazmorra a su salud.',
      actionType: 'COMBAT',
      ambushType: 'NORMAL',
      enemyHpBonus: 'LEVEL'
    },
    option2: {
      title: 'Combate encarnizado',
      description: 'Enemigo hostil con posición ventajosa. Enemigo ataca primero con +1 al daño inicial. Añade nivel de mazmorra + 2 a su salud.',
      actionType: 'COMBAT',
      ambushType: 'NORMAL',
      enemyDamageBonus: 1,
      enemyHpBonus: 'LEVEL_PLUS_2'
    }
  },
  {
    id: 'd3_campamento',
    code: 'D3',
    name: 'Campamento',
    cardType: 'TIPO_1',
    image: 'assets/cards/base/card_014.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    description: 'Encuentras un rincón resguardado donde tomar un respiro.',
    choices: [
      {
        id: 'cook',
        label: 'Cocinar Ración',
        detail: 'Gasta 1 Ración para ganar 3 de Energía.',
        condition: (p) => p.rations > 0,
        execute(game) {
          game.hero.rations -= 1;
          game.hero.energy = Math.min(game.hero.maxEnergy, game.hero.energy + 3);
          return 'Cocinas un sustancioso plato al fuego: -1 Ración, +3 Energía.';
        }
      },
      {
        id: 'rest',
        label: 'Descanso Breve',
        detail: 'Recuperas 2 puntos de Salud y 1 de Energía.',
        execute(game) {
          game.hero.hp = Math.min(game.hero.maxHp, game.hero.hp + 2);
          game.hero.energy = Math.min(game.hero.maxEnergy, game.hero.energy + 1);
          return 'Descansas con la espalda contra la pared: +2 Salud, +1 Energía.';
        }
      },
      {
        id: 'search',
        label: 'Registrar Escombros',
        detail: 'Roba 1 carta del mazo de Botín.',
        execute(game) {
          const loot = game.drawLoot();
          return `Registras los restos y encuentras: ${loot.name}.`;
        }
      }
    ]
  },
  {
    id: 'd4_plantacion_setas',
    code: 'D4',
    name: 'Plantación de Setas',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_015.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Setas Jóvenes',
      description: 'Localizas un grupo de setas comestibles frescas. Ganas 1 ración.',
      actionType: 'REWARD',
      execute(game) {
        game.hero.rations += 1;
        return 'Recolectas setas nutritivas: +1 Ración.';
      }
    },
    option2: {
      title: 'Plantación Madura',
      description: 'Te adentras en una cámara subterránea repleta de hongos gigantes. Ganas 2 raciones.',
      actionType: 'REWARD',
      execute(game) {
        game.hero.rations += 2;
        return 'Llenas tu talego de hongos secos: +2 Raciones.';
      }
    }
  },
  {
    id: 'd5_altar',
    code: 'D5',
    name: 'Altar Olvidado',
    cardType: 'TIPO_1',
    image: 'assets/cards/base/card_016.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    description: 'Un antiguo santuario de piedra emana una débil energía sagrada.',
    choices: [
      {
        id: 'blessing',
        label: 'Rezar por Bendición',
        detail: 'Ganas 1 ficha de Bendición para usar antes del Jefe.',
        execute(game) {
          game.hero.blessings += 1;
          return 'Te arrodillas en plegaria: +1 Ficha de Bendición.';
        }
      },
      {
        id: 'cure_poison',
        label: 'Purificación',
        detail: 'Lanza 1d6 y descarta esa cantidad de fichas de veneno.',
        execute(game) {
          const roll = Math.floor(Math.random() * 6) + 1;
          const removed = Math.min(roll, game.hero.poison);
          game.hero.poison -= removed;
          return `El agua bendita del altar quema el veneno [1d6 = ${roll}]: eliminadas ${removed} fichas de veneno.`;
        }
      }
    ]
  },
  {
    id: 'd6_claro',
    code: 'D6',
    name: 'Claro en las Profundidades',
    cardType: 'TIPO_1',
    image: 'assets/cards/base/card_017.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    description: 'Una encrucijada en la mazmorra donde los ecos del destino resuenan.',
    choices: [
      {
        id: 'draw_plot',
        label: 'Averiguar qué acecha (Robar Carta de Trama)',
        detail: 'Roba inmediatamente una carta del mazo de Tramas y resuélvela.',
        execute(game) {
          return game.triggerPlotCard();
        }
      }
    ]
  },
  {
    id: 'd7_mercader',
    code: 'D7',
    name: 'Mercader Errante',
    cardType: 'TIPO_1',
    image: 'assets/cards/base/card_018.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    description: 'Un comerciante enano con una mula de carga ofrece sus mercancías.',
    choices: [
      {
        id: 'open_shop',
        label: 'Comerciar con el Mercader',
        detail: 'Abre la tienda para comprar o vender pociones, armas y raciones con tu oro.',
        execute(game) {
          game.openMerchant();
          return 'Abres el inventario del mercader.';
        }
      },
      {
        id: 'leave_merchant',
        label: 'Ignorar y Continuar',
        detail: 'No necesitas nada y sigues avanzando por el pasillo.',
        execute(game) {
          return 'Te despides del mercader y continúas explorando.';
        }
      }
    ]
  },
  {
    id: 'd8_laberinto',
    code: 'D8',
    name: 'Laberinto de Piedra',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_008.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Sendero Conocido',
      description: 'Encuentras marcas en la pared dejadas por otros aventureros. Cruzas sin peligro.',
      actionType: 'REWARD',
      execute(game) {
        return 'Sigues las marcas en la roca y sales rápidamente del laberinto.';
      }
    },
    option2: {
      title: 'Extravío en la Oscuridad',
      description: 'Los pasillos parecen repetirse infinitamente. Pierdes 2 puntos de Energía o sufres 2 de daño.',
      actionType: 'CHOICE',
      choices: [
        {
          label: 'Gastar 2 Energía',
          condition: (p) => p.energy >= 2,
          execute(game) {
            game.hero.energy -= 2;
            return 'Fuerzas el ritmo para salir del laberinto (-2 Energía).';
          }
        },
        {
          label: 'Recibir 2 de Daño',
          execute(game) {
            game.hero.hp -= 2;
            return 'Tropiezas y te raspas contra las rocas afiladas (-2 Salud).';
          }
        }
      ]
    }
  },
  {
    id: 'd9_trampa_flechas',
    code: 'D9',
    name: 'Trampa de Flechas',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_015.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Alerta Temprana',
      description: 'Ves una rendija en el muro a la altura del pecho. Pasas agachado sin activar el mecanismo.',
      actionType: 'REWARD',
      execute(game) {
        return '¡Esquivas la trampa de flechas con gran maestría!';
      }
    },
    option2: {
      title: '¡Mecanismo Activado!',
      description: 'Pisas una baldosa floja. Salen disparadas flechas oxidadas. Lanza 2d6 y resta tu armadura para determinar el daño.',
      actionType: 'TRAP',
      execute(game) {
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const totalRoll = Math.abs(d1 - d2);
        const armor = game.getPlayerArmor();
        const dmg = Math.max(0, totalRoll - armor);
        game.hero.hp -= dmg;
        return `¡Disparas la trampa [${d1}, ${d2} -> diff ${totalRoll}]! Armadura reduce ${armor}. Sufres ${dmg} daño.`;
      }
    }
  },
  {
    id: 'd10_tesoro_oculto',
    code: 'D10',
    name: 'Tesoro Oculto',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_017.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Cofre de Madera',
      description: 'Un cofre sin cerrar con llave. Ganas 2 Monedas de Oro y 1 carta de Botín.',
      actionType: 'REWARD',
      execute(game) {
        game.hero.gold += 2;
        const loot = game.drawLoot();
        return `Abres el cofre: +2 Oro y obtienes ${loot.name}.`;
      }
    },
    option2: {
      title: 'Cofre Trampeado',
      description: 'El cerrojo está atascado. Al forzarlo salta un resorte venenoso: ganas 3 Oro, 1 Poción, pero sufres 1 ficha de Veneno.',
      actionType: 'REWARD',
      execute(game) {
        game.hero.gold += 3;
        game.hero.poison += 1;
        const pot = game.drawPotion();
        return `Fuerzas el cofre: +3 Oro, obtienes ${pot.name}, pero el resorte te pincha (+1 Veneno).`;
      }
    }
  },
  {
    id: 'd11_cripta_olvidada',
    code: 'D11',
    name: 'Cripta Olvidada',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_008.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Sarcófago Sellado',
      description: 'Un antiguo sepulcro con grabados sagrados. Ganas 1 Bendición.',
      actionType: 'REWARD',
      execute(game) {
        game.hero.blessings += 1;
        return 'Rindes respeto a los antiguos reyes: +1 Bendición.';
      }
    },
    option2: {
      title: 'Espíritu Despertado',
      description: 'La tumba se abre y emerge un No Muerto. Combate contra un Arquero No Muerto con iniciativa para el enemigo.',
      actionType: 'COMBAT_SPECIFIC',
      enemyId: 'arquero_no_muerto',
      ambushType: 'ENEMY_AMBUSH'
    }
  },
  {
    id: 'd12_fuente_magica',
    code: 'D12',
    name: 'Fuente Mágica',
    cardType: 'TIPO_1',
    image: 'assets/cards/base/card_014.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    description: 'Un manantial subterráneo con aguas cristalinas que brillan en la penumbra.',
    choices: [
      {
        id: 'drink_health',
        label: 'Beber para Curar Salud',
        detail: 'Recuperas 3 puntos de Salud.',
        execute(game) {
          game.hero.hp = Math.min(game.hero.maxHp, game.hero.hp + 3);
          return 'Bebes de las aguas revitalizantes: +3 Salud.';
        }
      },
      {
        id: 'drink_energy',
        label: 'Beber para Restaurar Energía',
        detail: 'Recuperas 3 puntos de Energía.',
        execute(game) {
          game.hero.energy = Math.min(game.hero.maxEnergy, game.hero.energy + 3);
          return 'El agua fresca renueva tu vigor: +3 Energía.';
        }
      }
    ]
  },
  {
    id: 'd13_foso_estacas',
    code: 'D13',
    name: 'Foso con Estacas',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_015.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Salto Certero',
      description: 'Tomas carrerilla y saltas el abismo gastando 1 de Energía.',
      actionType: 'REWARD',
      execute(game) {
        if (game.hero.energy > 0) game.hero.energy -= 1;
        return 'Saltas con precisión al otro lado (-1 Energía).';
      }
    },
    option2: {
      title: 'Caída al Vacío',
      description: 'El borde se desmorona y caes a las estacas inferiores. Sufres 3 puntos de daño.',
      actionType: 'TRAP',
      execute(game) {
        game.hero.hp -= 3;
        return '¡Caes al foso y te clavas las estacas (-3 Salud)!';
      }
    }
  },
  {
    id: 'd14_guarida_bestias',
    code: 'D14',
    name: 'Guarida de Bestias',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_012.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Cubil Desierto',
      description: 'La criatura está cazando fuera. Encuentras huesos con carne fresca: ganas 1 Ración y 1 Botín.',
      actionType: 'REWARD',
      execute(game) {
        game.hero.rations += 1;
        const loot = game.drawLoot();
        return `Registras la guarida vacía: +1 Ración y encuentras ${loot.name}.`;
      }
    },
    option2: {
      title: '¡Bestia al Acecho!',
      description: 'La bestia está en su nido y se abalanza sobre ti. Combate contra Lobo de las Sombras.',
      actionType: 'COMBAT_SPECIFIC',
      enemyId: 'lobo_sombras',
      ambushType: 'ENEMY_AMBUSH'
    }
  },
  {
    id: 'd15_santuario_silencioso',
    code: 'D15',
    name: 'Santuario Silencioso',
    cardType: 'TIPO_1',
    image: 'assets/cards/base/card_016.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    description: 'Un círculo de runas iluminadas por velas de grasa que nunca se apagan.',
    choices: [
      {
        id: 'morale',
        label: 'Meditar sobre tu Propósito',
        detail: 'Sube 1 nivel en el Control de Moral.',
        execute(game) {
          game.hero.morale = Math.min(5, game.hero.morale + 1);
          return 'Enfocas tu mente y disipas el miedo: +1 Moral.';
        }
      },
      {
        id: 'vigor',
        label: 'Inhalar los Humos Mágicos',
        detail: 'Recuperas 2 de Energía y 1 de Salud.',
        execute(game) {
          game.hero.energy = Math.min(game.hero.maxEnergy, game.hero.energy + 2);
          game.hero.hp = Math.min(game.hero.maxHp, game.hero.hp + 1);
          return 'Los aromas reconstituyentes te fortalecen: +2 Energía, +1 Salud.';
        }
      }
    ]
  },
  {
    id: 'd16_pasaje_secreto',
    code: 'D16',
    name: 'Pasaje Secreto',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_018.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Atajo Seguro',
      description: 'Descubres una puerta oculta que te permite esquivar peligros del piso.',
      actionType: 'REWARD',
      execute(game) {
        game.hero.energy = Math.min(game.hero.maxEnergy, game.hero.energy + 1);
        return 'Avanzas con sigilo evitando trampas (+1 Energía).';
      }
    },
    option2: {
      title: 'Derrumbe Inminente',
      description: 'El túnel se colapsa tras de ti. Pierdes 2 puntos de Energía apartando rocas.',
      actionType: 'TRAP',
      execute(game) {
        game.hero.energy = Math.max(0, game.hero.energy - 2);
        return 'Consigues apartar las piedras a costa de tu vigor (-2 Energía).';
      }
    }
  }
];




// --- FILE: iron_helm_game/js/data/expansions.js ---

/**
 * IRON HELM - Catálogo y Registro de Expansiones
 */
const EXPANSIONS = [
  // Módulo Base
  {
    id: 'base',
    name: 'Juego Base',
    type: 'CORE',
    version: '2.4',
    description: 'El núcleo de Iron Helm con 5 héroes, 3 jefes finales clásicos y la mazmorra original.',
    required: true,
    enabled: true
  },

  // Campañas de Aventura Independientes
  {
    id: 'warren',
    name: '01. Warren of Despair',
    type: 'CAMPAIGN',
    bossId: 'vermin_king',
    description: 'Desciende a la madriguera infestada. Incluye al Rey de las Alimañas, nuevas cartas de túneles y el héroe Rhae.',
    cardDir: 'assets/cards/expansions/warren'
  },
  {
    id: 'blackened',
    name: '02. Blackened Burrow',
    type: 'CAMPAIGN',
    description: 'Catacumbas oscuras con criaturas no muertas y trampas de pudrición.',
    cardDir: 'assets/cards/expansions/blackened'
  },
  {
    id: 'galnok',
    name: "03. Galnok's Labyrinth",
    type: 'CAMPAIGN',
    description: 'El intrincado laberinto custodiado por bestias cornígeras y rompecabezas mecánicos.'
  },
  {
    id: 'crystal',
    name: '04. Crystal Caverns',
    type: 'CAMPAIGN',
    description: 'Cavernas de gemas reflectantes con gólems y peligros cristalinos.'
  },
  {
    id: 'embers',
    name: '05. Throne of Embers',
    type: 'CAMPAIGN',
    bossId: 'lord_of_embers',
    description: 'Foso volcánico de fuego infernal. Los enemigos queman raciones y funden armaduras.'
  },
  {
    id: 'malicia',
    name: "06. Malicia's Refuge",
    type: 'CAMPAIGN',
    description: 'Refugio de brujería y pactos oscuros con demonios sombríos.'
  },
  {
    id: 'spire',
    name: '07. The Spire of Zogar',
    type: 'CAMPAIGN',
    description: 'Asciende por la torre del hechicero Zogar plagada de trampas mágicas y autómatas.'
  },
  {
    id: 'abyss',
    name: '13. The Howling Abyss',
    type: 'CAMPAIGN',
    bossId: 'abyss_shadow',
    description: 'La gran expansión del abismo helado con mayor desafío de resistencia y frío letal.'
  },

  // Expansiones Modulares de Contenido (Se pueden activar en paralelo con el Base o Campañas)
  {
    id: 'loot_lore',
    name: '08. Loot & Lore',
    type: 'MODULAR',
    description: 'Amplía el mazo de botín con armas raras, reliquias y cartas de trasfondo.',
    cardDir: 'assets/cards/expansions/loot_lore'
  },
  {
    id: 'realms_relics',
    name: '09. Realms & Relics',
    type: 'MODULAR',
    description: 'Añade reliquias divinas y santuarios arcanos.'
  },
  {
    id: 'lonely_troll',
    name: '10. The Lonely Troll Inn',
    type: 'MODULAR',
    description: 'Permite comenzar en la taberna para contratar mercenarios y adquirir misiones.'
  },
  {
    id: 'fanny_pack',
    name: '11. The Fanny Pack',
    type: 'MODULAR',
    description: 'Añade riñoneras para +2 espacios de carga y objetos de supervivencia.',
    cardDir: 'assets/cards/expansions/fanny_pack'
  },
  {
    id: 'beasts',
    name: '12. Beasts & Burdens',
    type: 'MODULAR',
    description: 'Nuevas bestias feroces y cartas de carga/maldición que aumentan la tensión.',
    cardDir: 'assets/cards/expansions/beasts'
  },
  {
    id: 'iron_chest',
    name: '14. Iron Chest',
    type: 'MODULAR',
    description: 'Recopilatorio de equipamiento mejorado y cartas promocionales de ayuda.'
  },
  {
    id: 'gnome_pack',
    name: '15. Gnome Pack #1 + Promo',
    type: 'MODULAR',
    description: 'Héroes y mecánicas especiales cruzadas con el universo Grey Gnome.'
  },

  // Expansión Fanmade
  {
    id: 'anemia',
    name: '03. Expansión Fanmade -Anemia- 4.0',
    type: 'FANMADE',
    description: 'Revisión extrema de supervivencia: mecánicas de sangrado, aflicciones severas y mazo temático 4.0.'
  }
];




// --- FILE: iron_helm_game/js/engine/inventoryEngine.js ---

/**
 * IRON HELM - Motor de Inventario y Equipamiento
 */
class InventoryEngine {
  constructor(game) {
    this.game = game;
  }

  // Obtiene el peso total actual que lleva el héroe
  getCurrentWeight() {
    let weight = 0;
    const hero = this.game.hero;
    if (!hero) return 0;

    // Equipados
    Object.values(hero.equipped).forEach(item => {
      if (item) weight += (item.weight || 0);
    });

    // Mochila
    hero.backpack.forEach(item => {
      weight += (item.weight || 0);
    });

    return weight;
  }

  getMaxEncumbrance() {
    const base = this.game.hero.encumbranceMax || 10;
    let bonus = 0;
    // Riñonera u otros accesorios
    if (this.game.hero.equipped.AC && this.game.hero.equipped.AC.encumbranceBonus) {
      bonus += this.game.hero.equipped.AC.encumbranceBonus;
    }
    return base + bonus;
  }

  // Comprueba si un objeto puede equiparse en su slot
  canEquip(item) {
    const hero = this.game.hero;
    if (!item || !item.slot) return false;

    // Si es arma a 2 manos (2M), necesita ambas manos libres o desequipar MP y OM
    return true;
  }

  equip(item, fromBackpackIndex = null) {
    const hero = this.game.hero;
    if (!item) return false;

    // Desequipar slot existente si está ocupado
    if (item.slot === '2M') {
      if (hero.equipped.MP) this.unequip('MP');
      if (hero.equipped.OM) this.unequip('OM');
      hero.equipped.MP = item;
      hero.equipped.OM = { name: '(Ocupada por 2M)', isTwoHandSlot: true };
    } else if (item.slot === 'MP') {
      if (hero.equipped.MP && hero.equipped.MP.slot === '2M') {
        hero.equipped.OM = null;
      }
      if (hero.equipped.MP) this.unequip('MP');
      hero.equipped.MP = item;
    } else if (item.slot === 'OM') {
      if (hero.equipped.MP && hero.equipped.MP.slot === '2M') {
        this.unequip('MP');
      }
      if (hero.equipped.OM && !hero.equipped.OM.isTwoHandSlot) {
        this.unequip('OM');
      }
      hero.equipped.OM = item;
    } else if (item.slot === 'CP') {
      if (hero.equipped.CP) this.unequip('CP');
      hero.equipped.CP = item;
    } else if (item.slot === 'CA') {
      if (hero.equipped.CA) this.unequip('CA');
      hero.equipped.CA = item;
    } else if (item.slot === 'AC') {
      if (hero.equipped.AC) this.unequip('AC');
      hero.equipped.AC = item;
    }

    if (fromBackpackIndex !== null) {
      hero.backpack.splice(fromBackpackIndex, 1);
    }

    logger.inventory(`Equipado: ${item.name} en slot ${item.slot}`);
    return true;
  }

  unequip(slot) {
    const hero = this.game.hero;
    const item = hero.equipped[slot];
    if (!item || item.isTwoHandSlot) return;

    hero.equipped[slot] = null;
    if (item.slot === '2M') {
      hero.equipped.OM = null;
    }

    hero.backpack.push(item);
    logger.inventory(`Desequipado ${item.name} a la mochila.`);
  }

  // Añadir objeto a la mochila (comprueba límite de peso)
  addToBackpack(item) {
    const currentWeight = this.getCurrentWeight();
    const maxWeight = this.getMaxEncumbrance();

    if (currentWeight + (item.weight || 0) > maxWeight) {
      logger.inventory(`¡Carga máxima superada! No puedes cargar ${item.name} (${item.weight} peso).`, { currentWeight, maxWeight });
      return { success: false, reason: 'OVERBURDENED' };
    }

    this.game.hero.backpack.push(item);
    logger.inventory(`Añadido a mochila: ${item.name}`);
    return { success: true };
  }

  dropItem(backpackIndex) {
    const item = this.game.hero.backpack[backpackIndex];
    if (item) {
      this.game.hero.backpack.splice(backpackIndex, 1);
      logger.inventory(`Descartado: ${item.name}`);
    }
  }

  // Valor total de reducción de daño por armadura
  getArmorReduction(isInitialDamage = false) {
    let total = 0;
    const hero = this.game.hero;
    if (!hero) return 0;

    Object.values(hero.equipped).forEach(item => {
      if (item && !item.isTwoHandSlot) {
        if (isInitialDamage && item.armorValueInitial) {
          total += item.armorValueInitial;
        } else if (!isInitialDamage && item.armorValueCounter) {
          total += item.armorValueCounter;
        }
      }
    });
    return total;
  }

  // Modificador de ataque de armas
  getWeaponAttackBonus() {
    let bonus = 0;
    const hero = this.game.hero;
    if (hero && hero.equipped.MP && hero.equipped.MP.attackBonus) {
      bonus += hero.equipped.MP.attackBonus;
    }
    return bonus;
  }
}




// --- FILE: iron_helm_game/js/engine/combatEngine.js ---

/**
 * IRON HELM - Motor de Combate (Combat Engine)
 * Implementa las reglas oficiales:
 * 1. Daño Inicial del Enemigo: 2d6 (resta el menor del mayor). Si saca dobles: ¡FALLA POR COMPLETO!
 *    Suma daño base de la carta y modificadores de mazmorra. Resta la armadura del jugador.
 * 2. Ataque del Jugador: Gasta hasta 3 de Energía para lanzar 1d6 a 3d6 (o 1 daño a puño sin gastar energía).
 *    Suma bonificadores de armas y habilidades.
 * 3. Contraataques del Enemigo: Misma fórmula de 2d6.
 */
class CombatEngine {
  constructor(game) {
    this.game = game;
    this.combatState = null;
  }

  // Iniciar un nuevo combate
  startCombat(enemy, options = {}) {
    // Calcular vida total del enemigo (Base + Mazmorra)
    let hpBonus = 0;
    const dungeonLevel = this.game.dungeon.currentLevel || 1;

    if (options.enemyHpBonus === 'LEVEL') {
      hpBonus = dungeonLevel;
    } else if (options.enemyHpBonus === 'LEVEL_PLUS_2') {
      hpBonus = dungeonLevel + 2;
    } else if (options.enemyHpBonus === 'LEVEL_PLUS_4') {
      hpBonus = dungeonLevel + 4;
    } else if (typeof options.enemyHpBonus === 'number') {
      hpBonus = options.enemyHpBonus;
    }

    const totalEnemyHp = (enemy.health || 5) + hpBonus;

    this.combatState = {
      enemy: { ...enemy },
      enemyHp: totalEnemyHp,
      enemyMaxHp: totalEnemyHp,
      round: 1,
      phase: 'INITIATIVE', // INITIATIVE, ENEMY_ATTACK, PLAYER_INPUT, RESOLUTION, FINISHED
      ambushType: options.ambushType || 'NORMAL', // 'PLAYER_AMBUSH', 'ENEMY_AMBUSH', 'NORMAL'
      enemyDamageBonus: options.enemyDamageBonus || 0,
      ignoreArmorInitial: false,
      ignoreShields: false,
      logs: [],
      diceRolls: [],
      isBoss: !!options.isBoss
    };

    logger.combat(`¡Comienza el combate contra ${enemy.name}! HP: ${totalEnemyHp} (Base: ${enemy.health} + Nivel: ${hpBonus})`, this.combatState);
    soundManager.playMonsterAttack();

    // Determinar quién ataca primero según la iniciativa
    if (this.combatState.ambushType === 'PLAYER_AMBUSH') {
      this.combatState.logs.push(`¡Pillas a ${enemy.name} por sorpresa! Ganas la iniciativa y atacas primero sin sufrir daño inicial.`);
      this.combatState.phase = 'PLAYER_INPUT';
    } else {
      // Enemigo ataca primero (Escaramuza o Emboscada enemiga)
      this.executeEnemyInitialAttack();
    }

    return this.combatState;
  }

  // Ataque inicial del enemigo
  executeEnemyInitialAttack() {
    this.combatState.phase = 'ENEMY_ATTACK';
    const enemy = this.combatState.enemy;

    // Hook de jefe o habilidad
    if (enemy.onEnemyAttack) {
      enemy.onEnemyAttack(this.game.hero, this.combatState);
    }

    // Tirada de 2d6 para el enemigo
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    this.combatState.diceRolls = [d1, d2];
    soundManager.playDiceRoll();

    let rollDiff = 0;
    let attackMessage = '';

    if (d1 === d2) {
      // Regla Oficial: Dobles significa que el enemigo FALLA por completo
      rollDiff = 0;
      attackMessage = `¡${enemy.name} saca dobles [${d1}, ${d2}] y FALLA completamente su ataque inicial! No recibes daño.`;
      logger.combat(attackMessage);
      this.combatState.logs.push(attackMessage);
    } else {
      rollDiff = Math.abs(d1 - d2);
      let totalDmg = rollDiff + (enemy.damage || 0);

      // Añadir bono de mazmorra (por ejemplo en Emboscada 2)
      if (this.combatState.enemyDamageBonus === 'LEVEL') {
        totalDmg += this.game.dungeon.currentLevel;
      } else if (typeof this.combatState.enemyDamageBonus === 'number') {
        totalDmg += this.combatState.enemyDamageBonus;
      }

      // Reducción por armadura del jugador
      let armor = 0;
      if (!this.combatState.ignoreArmorInitial) {
        armor = this.game.inventoryEngine.getArmorReduction(true);
      }

      const finalDamage = Math.max(0, totalDmg - armor);

      // Si el modo Dios está activo, no recibe daño
      if (!this.game.debug.godMode) {
        this.game.hero.hp -= finalDamage;
      }

      attackMessage = `${enemy.name} ataca [${d1}, ${d2} -> dif ${rollDiff}] + daño base ${enemy.damage} = ${totalDmg}. Armadura reduce ${armor}. Sufres ${finalDamage} de daño.`;
      logger.combat(attackMessage);
      this.combatState.logs.push(attackMessage);
      soundManager.playSwordHit();

      // Efectos secundarios por golpe (veneno, etc.)
      if (finalDamage > 0 && enemy.onHit) {
        enemy.onHit(this.game.hero, this.combatState);
      }
    }

    // Comprobar si el jugador ha muerto
    if (this.checkPlayerDeath()) {
      return this.combatState;
    }

    // Pasa al turno del jugador
    this.combatState.phase = 'PLAYER_INPUT';
    return this.combatState;
  }

  // Turno de ataque del jugador
  executePlayerAttack(energySpent = 0, options = {}) {
    if (this.combatState.phase !== 'PLAYER_INPUT') return;

    const hero = this.game.hero;
    const enemy = this.combatState.enemy;

    // Verificar si el jugador tiene suficiente energía
    if (energySpent > 0 && hero.energy < energySpent) {
      logger.combat('No tienes suficiente energía para ese ataque.');
      return;
    }

    // Consumir energía (a menos que sea modo Dios)
    if (!this.game.debug.godMode) {
      hero.energy -= energySpent;
    }

    let diceRolls = [];
    let totalAttack = 0;

    if (options.usePotion) {
      // Lanzar poción de combate
      const msg = options.usePotion.throw(this.combatState, this.combatState);
      this.combatState.logs.push(msg);
      soundManager.playPotion();
      this.game.inventoryEngine.dropItem(options.potionIndex);
    } else if (energySpent === 0 && !hero.equipped.MP) {
      // Puñetazo desarmado sin gastar energía: 1 de daño garantizado
      totalAttack = 1;
      this.combatState.diceRolls = [];
      this.combatState.logs.push('Asestas un golpe con los puños desarmados infligiendo 1 de daño.');
      soundManager.playSwordHit();
    } else {
      // Lanzar dados según energía gastada (mínimo 1d6 si gastó 1+, o con arma)
      const diceCount = Math.max(1, energySpent);
      for (let i = 0; i < diceCount; i++) {
        const roll = Math.floor(Math.random() * 6) + 1;
        diceRolls.push(roll);
        totalAttack += roll;
      }
      this.combatState.diceRolls = diceRolls;
      soundManager.playDiceRoll();

      // Añadir bonificador de arma
      const weaponBonus = this.game.inventoryEngine.getWeaponAttackBonus();
      totalAttack += weaponBonus;

      // Bonus de habilidad si se activó
      if (this.combatState.attackBonus) {
        totalAttack += this.combatState.attackBonus;
        this.combatState.attackBonus = 0;
      }

      // Bonificador por debilidad del monstruo
      if (options.damageType && enemy.weakness === options.damageType) {
        totalAttack += 2;
        this.combatState.logs.push(`¡Golpeas la debilidad de ${enemy.weakness}! (+2 daño).`);
      }

      const rollStr = diceRolls.length > 0 ? `[${diceRolls.join(', ')}]` : '';
      const msg = `Atacas gastando ${energySpent} Energía ${rollStr} + arma ${weaponBonus} = ¡${totalAttack} de daño!`;
      logger.combat(msg);
      this.combatState.logs.push(msg);
      soundManager.playSwordHit();
    }

    // Aplicar daño al enemigo
    this.combatState.enemyHp -= totalAttack;

    // Comprobar si el enemigo murió
    if (this.combatState.enemyHp <= 0) {
      this.handleEnemyDefeat();
      return this.combatState;
    }

    // Si el enemigo sigue vivo, realiza su CONTRAATAQUE
    this.executeEnemyCounterAttack();
    return this.combatState;
  }

  // Contraataque del enemigo
  executeEnemyCounterAttack() {
    this.combatState.phase = 'ENEMY_ATTACK';
    const enemy = this.combatState.enemy;

    // Hook de habilidad de inicio de ronda
    if (enemy.onRoundStart) {
      enemy.onRoundStart(this.game.hero, this.combatState);
    }

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    this.combatState.diceRolls = [d1, d2];
    soundManager.playDiceRoll();

    if (d1 === d2) {
      const msg = `¡${enemy.name} saca dobles en el contraataque [${d1}, ${d2}] y FALLA!`;
      logger.combat(msg);
      this.combatState.logs.push(msg);
    } else {
      const diff = Math.abs(d1 - d2);
      const totalDmg = diff + (enemy.damage || 0);

      // Reducción de armadura para contraataques
      let armor = this.game.inventoryEngine.getArmorReduction(false);
      if (this.combatState.damageReduction) {
        armor += this.combatState.damageReduction;
        this.combatState.damageReduction = 0;
      }

      const finalDamage = Math.max(0, totalDmg - armor);

      if (!this.game.debug.godMode) {
        this.game.hero.hp -= finalDamage;
      }

      const msg = `${enemy.name} contraataca [${d1}, ${d2} -> dif ${diff}] + base ${enemy.damage} = ${totalDmg}. Armadura reduce ${armor}. Pierdes ${finalDamage} de Salud.`;
      logger.combat(msg);
      this.combatState.logs.push(msg);
      soundManager.playMonsterAttack();

      if (finalDamage > 0 && enemy.onHit) {
        enemy.onHit(this.game.hero, this.combatState);
      }
    }

    // Comprobar si el héroe murió
    if (this.checkPlayerDeath()) {
      return;
    }

    this.combatState.round += 1;
    this.combatState.phase = 'PLAYER_INPUT';
  }

  // Victoria sobre el enemigo
  handleEnemyDefeat() {
    const enemy = this.combatState.enemy;
    this.combatState.phase = 'FINISHED';
    const victoryMsg = `¡Has derrotado a ${enemy.name}!`;
    logger.combat(victoryMsg);
    this.combatState.logs.push(victoryMsg);
    soundManager.playVictory();

    // Añadir al cementerio para aprendizaje de habilidades y recuento de Jefe
    this.game.graveyard.push(enemy);

    // Otorgar Oro
    if (enemy.gold > 0) {
      this.game.hero.gold += enemy.gold;
      this.combatState.logs.push(`Obtienes ${enemy.gold} Moneda(s) de Oro de sus restos.`);
      soundManager.playCoin();
    }

    // Otorgar Botín según Treasure Type (0: nada, 1: Botín u Oro, 2: Botín y Poción)
    if (enemy.treasureType === 1) {
      const loot = this.game.drawLoot();
      this.combatState.logs.push(`Reclamas un botín: ${loot.name}.`);
    } else if (enemy.treasureType === 2) {
      const loot = this.game.drawLoot();
      const pot = this.game.drawPotion();
      this.combatState.logs.push(`Reclamas gran tesoro: ${loot.name} y ${pot.name}.`);
    }

    // Si era el Jefe Final -> ¡Victoria Total de la Partida!
    if (this.combatState.isBoss) {
      this.game.triggerGameVictory();
    }
  }

  // Comprobar muerte del jugador
  checkPlayerDeath() {
    const hero = this.game.hero;
    if (hero.hp <= 0) {
      logger.combat('¡Tu salud ha llegado a 0! Has caído en la mazmorra.', hero);
      soundManager.playDefeat();
      this.game.triggerGameOver('MUERTE_EN_COMBATE');
      return true;
    }
    if (hero.poison >= hero.hp && hero.poison > 0) {
      logger.combat('¡El veneno ha alcanzado o superado tu nivel de salud actual! Sucumbes al veneno.', hero);
      soundManager.playDefeat();
      this.game.triggerGameOver('ENVENENADO');
      return true;
    }
    return false;
  }
}




// --- FILE: iron_helm_game/js/engine/dungeonEngine.js ---

/**
 * IRON HELM - Motor de Exploración de Mazmorra (Dungeon Engine)
 * Implementa la regla central de Iron Helm:
 * 1. Cada turno se extraen 2 cartas boca abajo.
 * 2. Se da la vuelta a la Carta 1.
 * 3. El jugador decide:
 *    - Aceptar y Resolver la Carta 1 (ejecuta Opción 1 de Tipo 2 o interacciones de Tipo 1). La Carta 2 se descarta boca abajo sin mirar.
 *    - O Descartar Carta 1 y dar la vuelta a la Carta 2, teniendo que resolver OBLIGATORIAMENTE la Opción 2 de la Carta 2.
 * 4. Al completar 8 turnos (16 cartas): Fin de Nivel (Consumo de raciones, veneno, avance de mapa y robar carta de trama).
 */
class DungeonEngine {
  constructor(game) {
    this.game = game;
    this.deck = [];
    this.discardPile = [];
    this.currentPair = { card1: null, card2: null };
    this.card1Revealed = false;
    this.card2Revealed = false;
    this.resolvedCard = null;
    this.turnNumber = 0; // 1 a 8 por nivel
  }

  // Inicializa el mazo de mazmorra según la campaña y expansiones activas
  initDungeonDeck() {
    let pool = [...DUNGEON_CARDS];

    // Si hay cartas de expansión, inyectarlas según la configuración
    if (this.game.config.campaignId === 'warren') {
      logger.expansion('Inyectando cartas de mazmorra de Warren of Despair.');
    }

    // Barajar aleatoriamente
    this.deck = this.shuffle([...pool]);
    this.discardPile = [];
    this.turnNumber = 0;
    this.currentPair = { card1: null, card2: null };
    this.card1Revealed = false;
    this.card2Revealed = false;
    this.resolvedCard = null;

    logger.explore(`Mazo de mazmorra preparado con ${this.deck.length} cartas.`);
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Iniciar un nuevo turno de exploración: extrae 2 cartas boca abajo
  drawExplorationPair() {
    if (this.deck.length < 2) {
      // Fin del nivel si se agota el mazo
      this.finishLevel();
      return null;
    }

    this.turnNumber += 1;
    const card1 = this.deck.pop();
    const card2 = this.deck.pop();

    this.currentPair = { card1, card2 };
    this.card1Revealed = false;
    this.card2Revealed = false;
    this.resolvedCard = null;

    logger.explore(`--- Turno ${this.turnNumber}/8 del Nivel ${this.game.dungeon.currentLevel} --- Robadas 2 cartas boca abajo.`);
    soundManager.playCardFlip();
    return this.currentPair;
  }

  // Revelar la Carta 1
  revealCard1() {
    if (!this.currentPair.card1) return null;
    this.card1Revealed = true;
    soundManager.playCardFlip();
    logger.explore(`Revelas la Carta 1: ${this.currentPair.card1.name} (${this.currentPair.card1.cardType})`);
    return this.currentPair.card1;
  }

  // Jugador decide ACEPTAR la Carta 1
  acceptCard1() {
    if (!this.card1Revealed || this.resolvedCard) return;

    const card = this.currentPair.card1;
    this.resolvedCard = card;
    this.discardPile.push(this.currentPair.card2); // Carta 2 descartada sin mirar
    logger.explore(`Decides aceptar la Carta 1: ${card.name}. Descartas la Carta 2 sin mirar.`);

    this.resolveCard(card, 1);
  }

  // Jugador decide RECHAZAR la Carta 1 -> Debe revelar y resolver obligatoriamente la Carta 2
  declineCard1() {
    if (!this.card1Revealed || this.resolvedCard) return;

    this.discardPile.push(this.currentPair.card1); // Carta 1 descartada
    this.card2Revealed = true;
    const card = this.currentPair.card2;
    this.resolvedCard = card;

    soundManager.playCardFlip();
    logger.explore(`Rechazas la Carta 1. Revelas y estás OBLIGADO a resolver la Carta 2: ${card.name} (Opción 2).`);

    this.resolveCard(card, 2);
  }

  // Alias para interacción física directa
  rejectCard1AndRevealCard2() {
    return this.declineCard1();
  }

  // Resolución de la carta según si fue aceptada como Opción 1 o forzada como Opción 2
  resolveCard(card, optionNumber) {
    if (card.cardType === 'TIPO_2') {
      const opt = optionNumber === 1 ? card.option1 : card.option2;
      logger.explore(`Resolviendo [${card.name} - Opción ${optionNumber}]: ${opt.title}`);

      if (opt.actionType === 'COMBAT') {
        const enemy = this.game.drawEnemy();
        this.game.combatEngine.startCombat(enemy, {
          ambushType: opt.ambushType,
          enemyHpBonus: opt.enemyHpBonus,
          enemyDamageBonus: opt.enemyDamageBonus
        });
        this.game.setStatus('COMBAT');
      } else if (opt.actionType === 'COMBAT_SPECIFIC') {
        const enemy = this.game.getEnemyById(opt.enemyId) || this.game.drawEnemy();
        this.game.combatEngine.startCombat(enemy, {
          ambushType: opt.ambushType
        });
        this.game.setStatus('COMBAT');
      } else if (opt.actionType === 'REWARD' && opt.execute) {
        const res = opt.execute(this.game);
        logger.explore(res);
      } else if (opt.actionType === 'TRAP' && opt.execute) {
        const res = opt.execute(this.game);
        logger.explore(res);
        this.game.combatEngine.checkPlayerDeath();
      } else if (opt.actionType === 'CHOICE') {
        this.game.activeChoices = opt.choices;
        this.game.setStatus('CARD_CHOICE');
      }
    } else if (card.cardType === 'TIPO_1') {
      // Cartas narrativas / interactivas
      logger.explore(`Resolviendo [${card.name}]: ${card.description}`);
      this.game.activeCard = card;
      this.game.activeChoices = card.choices || [];
      this.game.setStatus('CARD_INTERACTION');
    }
  }

  // Rutina de Fin de Nivel (cuando se agotan las 16 cartas = 8 turnos)
  finishLevel() {
    logger.explore(`=== FIN DEL NIVEL DE MAZMORRA ${this.game.dungeon.currentLevel} ===`);

    const hero = this.game.hero;

    // 1. Alimentar al héroe (consumir 1 ración o perder 3 de salud por inanición)
    if (hero.rations > 0) {
      hero.rations -= 1;
      logger.explore('Consumes 1 Ración de sustento para no debilitarte.');
    } else {
      if (!this.game.debug.godMode) {
        hero.hp -= 3;
      }
      logger.explore('¡No tienes raciones para alimentarte! Sufres 3 puntos de daño por inanición (-3 Salud).');
      soundManager.playMonsterAttack();
      if (this.game.combatEngine.checkPlayerDeath()) return;
    }

    // 2. Progresión del veneno: por cada 2 fichas de veneno, ganas 1 adicional
    if (hero.poison >= 2) {
      const extraPoison = Math.floor(hero.poison / 2);
      hero.poison += extraPoison;
      logger.explore(`El veneno avanza por tu torrente sanguíneo (+${extraPoison} fichas de veneno).`);
      if (this.game.combatEngine.checkPlayerDeath()) return;
    }

    // 3. Robar carta de Trama del piso
    const plot = this.game.drawPlotCard();
    logger.explore(`Robas la carta de Trama del nivel: ${plot.name} (+${plot.eyes} iconos de ojo).`);

    // 4. Comprobar si se alcanzaron 10 ojos o se llegó al nivel 5
    if (this.game.plots.totalEyes >= 10 || this.game.dungeon.currentLevel >= 5) {
      this.game.triggerBossEncounter();
      return;
    }

    // 5. Avanzar de nivel de mapa
    this.game.dungeon.currentLevel += 1;
    logger.explore(`¡Avanzas hacia el Nivel de Mazmorra ${this.game.dungeon.currentLevel}!`);

    // 6. Volver a barajar el mazo para el nuevo nivel
    this.initDungeonDeck();
    this.game.setStatus('EXPLORATION');
  }
}




// --- FILE: iron_helm_game/js/engine/gameState.js ---

/**
 * IRON HELM - Estado Global del Juego (Game State & Controller)
 * Administra la máquina de estados, suscripciones reactivas a la UI, lógica de guardado y trampas de depuración.
 */











class GameState {
  constructor() {
    this.status = 'CONFIG'; // CONFIG, EXPLORATION, CARD_INTERACTION, CARD_CHOICE, COMBAT, MERCHANT, BOSS_INTRO, VICTORY, GAMEOVER
    this.config = {
      campaignId: 'base',
      enabledExpansions: ['base'],
      difficulty: 'NORMAL'
    };

    this.hero = null;
    this.graveyard = [];
    this.enemyDeck = [];
    this.lootDeck = [];
    this.potionDeck = [];
    this.plotDeck = [];

    this.dungeon = {
      currentLevel: 1,
      maxLevel: 5
    };

    this.plots = {
      drawnCards: [],
      totalEyes: 0
    };

    this.activeCard = null;
    this.activeChoices = [];
    this.activeMerchantItems = [];

    this.debug = {
      godMode: false,
      visiblePiles: false
    };

    this.listeners = [];

    // Motores subsidiarios
    this.inventoryEngine = new InventoryEngine(this);
    this.combatEngine = new CombatEngine(this);
    this.dungeonEngine = new DungeonEngine(this);
  }

  // Suscripción reactiva para la UI
  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  setStatus(newStatus) {
    this.status = newStatus;
    logger.game(`Estado cambiado a: ${newStatus}`);
    this.notify();
  }

  // Iniciar una nueva partida con el personaje y configuración seleccionados
  startNewGame(characterId, config) {
    this.config = { ...this.config, ...config };
    const charTemplate = CHARACTERS.find(c => c.id === characterId) || CHARACTERS[0];

    this.hero = {
      id: charTemplate.id,
      name: charTemplate.name,
      title: charTemplate.title,
      domain: charTemplate.domain,
      skill: charTemplate.skill,
      image: charTemplate.image,
      hp: charTemplate.health,
      maxHp: charTemplate.health,
      energy: charTemplate.energy,
      maxEnergy: charTemplate.energy,
      encumbranceMax: charTemplate.encumbrance,
      rations: charTemplate.rations,
      gold: charTemplate.gold,
      poison: 0,
      blessings: 0,
      morale: 0, // -5 a +5
      equipped: {
        MP: null,
        OM: null,
        CP: null,
        CA: null,
        AC: null
      },
      backpack: []
    };

    // Equipar objetos iniciales
    if (charTemplate.startingEquipmentIds) {
      charTemplate.startingEquipmentIds.forEach(eqId => {
        const eq = EQUIPMENT.find(e => e.id === eqId);
        if (eq) {
          this.inventoryEngine.equip(eq);
        }
      });
    }

    this.graveyard = [];
    this.dungeon.currentLevel = 1;
    this.plots = { drawnCards: [], totalEyes: 0 };

    // Inicializar mazos
    this.enemyDeck = this.shuffle([...ENEMIES]);
    this.lootDeck = this.shuffle([...EQUIPMENT, ...POTIONS]);
    this.potionDeck = this.shuffle([...POTIONS]);
    this.plotDeck = this.shuffle([...PLOT_CARDS]);

    // Inicializar motor de mazmorra
    this.dungeonEngine.initDungeonDeck();

    logger.game(`¡Partida iniciada con ${this.hero.name} en modo ${this.config.campaignId}!`, this.hero);
    this.setStatus('EXPLORATION');
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  drawEnemy() {
    if (this.enemyDeck.length === 0) {
      this.enemyDeck = this.shuffle([...ENEMIES]);
    }
    return this.enemyDeck.pop();
  }

  getEnemyById(id) {
    return ENEMIES.find(e => e.id === id);
  }

  drawLoot() {
    if (this.lootDeck.length === 0) {
      this.lootDeck = this.shuffle([...EQUIPMENT, ...POTIONS]);
    }
    const item = this.lootDeck.pop();
    this.inventoryEngine.addToBackpack(item);
    return item;
  }

  drawPotion() {
    if (this.potionDeck.length === 0) {
      this.potionDeck = this.shuffle([...POTIONS]);
    }
    const pot = this.potionDeck.pop();
    this.inventoryEngine.addToBackpack(pot);
    return pot;
  }

  drawPlotCard() {
    if (this.plotDeck.length === 0) {
      this.plotDeck = this.shuffle([...PLOT_CARDS]);
    }
    const plot = this.plotDeck.pop();
    this.plots.drawnCards.push(plot);
    this.plots.totalEyes += (plot.eyes || 1);
    logger.game(`Carta de Trama añadida: ${plot.name} (+${plot.eyes} ojos). Ojos totales: ${this.plots.totalEyes}/10`);
    return plot;
  }

  triggerPlotCard() {
    const plot = this.drawPlotCard();
    this.activeCard = plot;
    this.activeChoices = plot.choices;
    this.setStatus('CARD_INTERACTION');
    return `Carta de Trama activada: ${plot.name}`;
  }

  openMerchant() {
    this.activeMerchantItems = [
      POTIONS.find(p => p.id === 'pocion_salud'),
      POTIONS.find(p => p.id === 'pocion_energia'),
      POTIONS.find(p => p.id === 'antidoto'),
      EQUIPMENT.find(e => e.id === 'antorcha'),
      EQUIPMENT.find(e => e.id === 'escudo'),
      EQUIPMENT.find(e => e.id === 'espada_larga')
    ].filter(Boolean);
    this.setStatus('MERCHANT');
  }

  buyItem(item) {
    if (this.hero.gold >= item.price) {
      const res = this.inventoryEngine.addToBackpack(item);
      if (res.success) {
        this.hero.gold -= item.price;
        logger.inventory(`Comprado ${item.name} por ${item.price} de oro.`);
        soundManager.playCoin();
        this.notify();
      }
    } else {
      logger.game('No tienes suficiente oro para comprar este objeto.');
    }
  }

  sellItem(backpackIndex) {
    const item = this.hero.backpack[backpackIndex];
    if (item) {
      const sellPrice = Math.max(1, Math.floor((item.price || 1) / 2));
      this.hero.backpack.splice(backpackIndex, 1);
      this.hero.gold += sellPrice;
      logger.inventory(`Vendido ${item.name} por ${sellPrice} de oro.`);
      soundManager.playCoin();
      this.notify();
    }
  }

  // Determinar el Jefe Final según las debilidades del Cementerio o Campaña
  determineBoss() {
    // Si es campaña, usar el jefe específico
    if (this.config.campaignId === 'warren') {
      return BOSSES.find(b => b.id === 'vermin_king');
    }
    if (this.config.campaignId === 'embers') {
      return BOSSES.find(b => b.id === 'lord_of_embers');
    }
    if (this.config.campaignId === 'abyss') {
      return BOSSES.find(b => b.id === 'abyss_shadow');
    }

    // Regla Oficial del Juego Base:
    // Cuenta debilidades de los enemigos derrotados en el cementerio: NO_MUERTO, HIELO, FUEGO
    let counts = { NO_MUERTO: 0, HIELO: 0, FUEGO: 0 };
    this.graveyard.forEach(enemy => {
      if (enemy.weakness && counts[enemy.weakness] !== undefined) {
        counts[enemy.weakness]++;
      }
    });

    logger.game(`Recuento de debilidades en el Cementerio: No Muerto (${counts.NO_MUERTO}), Hielo (${counts.HIELO}), Fuego (${counts.FUEGO})`);

    // Determinar ganador con desempate (Fuego > No Muerto > Hielo > Fuego)
    let chosenWeakness = 'HIELO';
    if (counts.FUEGO > counts.NO_MUERTO && counts.FUEGO > counts.HIELO) {
      chosenWeakness = 'FUEGO';
    } else if (counts.NO_MUERTO > counts.FUEGO && counts.NO_MUERTO > counts.HIELO) {
      chosenWeakness = 'NO_MUERTO';
    } else if (counts.HIELO > counts.FUEGO && counts.HIELO > counts.NO_MUERTO) {
      chosenWeakness = 'HIELO';
    } else {
      // Empates según regla: Fuego vence a No Muerto, No Muerto a Hielo, Hielo a Fuego
      if (counts.FUEGO === counts.NO_MUERTO && counts.FUEGO >= counts.HIELO) chosenWeakness = 'FUEGO';
      else if (counts.NO_MUERTO === counts.HIELO && counts.NO_MUERTO >= counts.FUEGO) chosenWeakness = 'NO_MUERTO';
      else chosenWeakness = 'HIELO';
    }

    // B1: Merodeador (Hielo), B2: Naga (Fuego), B3: Lich (No Muerto)
    const boss = BOSSES.find(b => b.weakness === chosenWeakness) || BOSSES[0];
    logger.game(`¡El Jefe Final determinado por el destino es: ${boss.name}!`, boss);
    return boss;
  }

  // Activa el encuentro de Jefe Final con la Presencia Divina
  triggerBossEncounter() {
    logger.game('================ ¡EL JEFE FINAL DESPIERTA! ================');

    // Presencia Divina: Voltear todas las fichas de Bendición acumuladas
    if (this.hero.blessings > 0) {
      const healedHp = this.hero.blessings * 2;
      const restoredEnergy = this.hero.blessings * 2;
      this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + healedHp);
      this.hero.energy = Math.min(this.hero.maxEnergy, this.hero.energy + restoredEnergy);
      this.hero.poison = 0; // Se purga todo el veneno
      logger.game(`¡Presencia Divina! Tus ${this.hero.blessings} bendiciones te otorgan +${healedHp} Salud, +${restoredEnergy} Energía y purgan todo el veneno.`);
      soundManager.playVictory();
    }

    const boss = this.determineBoss();
    this.combatEngine.startCombat(boss, { isBoss: true });
    this.setStatus('COMBAT');
  }

  // Cálculo de Puntuación Final de Jubilación (Scoring oficial de la página 18-19)
  calculateFinalScore() {
    const h = this.hero;
    let score = 0;

    // 1. Salud y Energía restantes (1 pt cada uno)
    score += (h.hp + h.energy);

    // 2. Monedas de Oro (3 pts cada una)
    score += (h.gold * 3);

    // 3. Enemigos derrotados en cementerio (2 pts cada uno)
    score += (this.graveyard.length * 2);

    // 4. Valor de compra de todos los objetos que lleves encima
    let itemsValue = 0;
    Object.values(h.equipped).forEach(item => {
      if (item && item.price) itemsValue += item.price;
    });
    h.backpack.forEach(item => {
      if (item.price) itemsValue += item.price;
    });
    score += itemsValue;

    // 5. Nivel de Mazmorra al ganar x 2
    score += (this.dungeon.currentLevel * 2);

    // 6. Control de Moral (suma o resta)
    score += h.morale;

    // Título de jubilación
    let retirement = 'Tugurio';
    let retirementDesc = 'Tu vivienda es una choza en la periferia de un pueblo minero.';
    if (score >= 61) {
      retirement = 'Fortaleza';
      retirementDesc = 'Te retiras en un pequeño castillo junto al acantilado con un séquito de sirvientes y una torre llena de tesoros.';
    } else if (score >= 51) {
      retirement = 'Mansión';
      retirementDesc = 'Te retiras en una gran y hermosa mansión rodeada de sirvientes y árboles centenarios.';
    } else if (score >= 41) {
      retirement = 'Granja';
      retirementDesc = 'Te retiras en una robusta casa de piedra rodeada de colinas y un granero lleno de animales.';
    } else if (score >= 31) {
      retirement = 'Cabaña';
      retirementDesc = 'Te retiras en una agradable cabaña con chimenea en la espesura del bosque.';
    }

    return { score, retirement, retirementDesc };
  }

  triggerGameVictory() {
    this.finalResults = this.calculateFinalScore();
    logger.game(`¡VICTORIA ÉPICA! Puntuación final: ${this.finalResults.score} - Rango: ${this.finalResults.retirement}`);
    soundManager.playVictory();
    this.setStatus('VICTORY');
  }

  triggerGameOver(reason) {
    this.gameOverReason = reason;
    logger.game(`FIN DE LA PARTIDA: ${reason}`);
    this.setStatus('GAMEOVER');
  }

  // Métodos de trampas / debug para pruebas ágiles
  cheatAddHp(amount) {
    if (!this.hero) return;
    this.hero.hp = Math.min(this.hero.maxHp, Math.max(0, this.hero.hp + amount));
    logger.debug(`[CHEAT] Salud modificada en ${amount}. Actual: ${this.hero.hp}`);
    this.notify();
  }

  cheatAddEnergy(amount) {
    if (!this.hero) return;
    this.hero.energy = Math.min(this.hero.maxEnergy, Math.max(0, this.hero.energy + amount));
    logger.debug(`[CHEAT] Energía modificada en ${amount}. Actual: ${this.hero.energy}`);
    this.notify();
  }

  cheatAddGold(amount) {
    if (!this.hero) return;
    this.hero.gold = Math.max(0, this.hero.gold + amount);
    logger.debug(`[CHEAT] Oro modificado en ${amount}. Actual: ${this.hero.gold}`);
    soundManager.playCoin();
    this.notify();
  }

  cheatAddRations(amount) {
    if (!this.hero) return;
    this.hero.rations = Math.max(0, this.hero.rations + amount);
    logger.debug(`[CHEAT] Raciones modificadas en ${amount}. Actual: ${this.hero.rations}`);
    this.notify();
  }

  cheatAddPoison(amount) {
    if (!this.hero) return;
    this.hero.poison = Math.max(0, this.hero.poison + amount);
    logger.debug(`[CHEAT] Veneno modificado en ${amount}. Actual: ${this.hero.poison}`);
    this.notify();
  }

  cheatToggleGodMode() {
    this.debug.godMode = !this.debug.godMode;
    logger.debug(`[CHEAT] Modo Dios: ${this.debug.godMode ? 'ACTIVADO' : 'DESACTIVADO'}`);
    this.notify();
  }

  cheatKillCurrentEnemy() {
    if (this.status === 'COMBAT' && this.combatEngine.combatState) {
      this.combatEngine.combatState.enemyHp = 0;
      this.combatEngine.handleEnemyDefeat();
      this.notify();
    }
  }

  cheatTriggerBoss() {
    this.triggerBossEncounter();
  }

  cheatNextFloor() {
    this.dungeon.currentLevel = Math.min(5, this.dungeon.currentLevel + 1);
    this.dungeonEngine.initDungeonDeck();
    logger.debug(`[CHEAT] Saltado al nivel ${this.dungeon.currentLevel}`);
    this.setStatus('EXPLORATION');
  }
}
const gameState = new GameState();




// --- FILE: iron_helm_game/js/ui/tokenPile.js ---

/**
 * IRON HELM DIGITAL - Renderizador de Pilas de Fichas Físicas (Token Stacks)
 * Muestra las fichas del héroe (salud, energía, oro, raciones, veneno, bendiciones)
 * como pilas 3D isométricas de discos de madera/cartón sobre el tapete.
 */
function renderTokenPile(options) {
  const {
    type,           // 'salud', 'energia', 'oro', 'racion', 'veneno', 'bendicion'
    image,          // ruta a 'assets/tokens/token_X.png'
    count,          // valor actual
    maxCount = null,// valor máximo (opcional)
    label,          // nombre visible
    tooltip = '',   // descripción
    size = 42       // tamaño del token en px
  } = options;

  // Calculamos el número de fichas visuales en la pila (máximo 8 para no saturar el DOM)
  const visualDiscs = Math.min(8, Math.max(1, count));
  const isZero = count <= 0;

  let stackHtml = '';
  if (!isZero) {
    for (let i = 0; i < visualDiscs; i++) {
      const offsetY = i * 3.5;
      const offsetX = (i % 2 === 0 ? 0 : 1.5);
      const zIndex = i + 1;
      const shadowBlur = 3 + i * 1.5;
      stackHtml += `
        <div class="physical-token-disc" style="
          bottom: ${offsetY}px;
          left: ${offsetX}px;
          z-index: ${zIndex};
          width: ${size}px;
          height: ${size}px;
          filter: drop-shadow(0 ${shadowBlur}px ${shadowBlur}px rgba(0,0,0,0.6));
        ">
          <img src="${image}" alt="${label}" class="token-disc-face" />
        </div>
      `;
    }
  } else {
    // Espacio de pila vacía sobre el fieltro
    stackHtml = `
      <div class="empty-token-slot" style="width: ${size}px; height: ${size}px;">
        <span class="empty-slot-cross">✕</span>
      </div>
    `;
  }

  const countDisplay = maxCount !== null ? `${count}/${maxCount}` : `${count}`;

  return `
    <div class="physical-token-pile ${type}-pile ${isZero ? 'empty' : ''}" title="${tooltip}">
      <div class="token-stack-container" style="width: ${size + 6}px; height: ${size + (visualDiscs * 3.5)}px;">
        ${stackHtml}
      </div>
      <div class="token-pile-badge">
        <span class="token-pile-num">${countDisplay}</span>
        <span class="token-pile-label">${label}</span>
      </div>
    </div>
  `;
}




// --- FILE: iron_helm_game/js/ui/dice3D.js ---

/**
 * IRON HELM DIGITAL - Motor de Dados 3D Tabletop Físicos
 * Dados tridimensionales con relieve de madera y puntos dorados
 * que ruedan, botan y se asientan con físicas en la bandeja de dados.
 */
class Dice3DManager {
  static getFaceRotation(value) {
    switch (value) {
      case 1: return { x: 0, y: 0 };
      case 2: return { x: 0, y: -90 };
      case 3: return { x: 0, y: -180 };
      case 4: return { x: 0, y: 90 };
      case 5: return { x: -90, y: 0 };
      case 6: return { x: 90, y: 0 };
      default: return { x: 0, y: 0 };
    }
  }

  static renderDiceMarkup(diceArray, isRolling = false) {
    if (!diceArray || diceArray.length === 0) {
      return `
        <div class="empty-tray-notice">
          <span class="dice-cup-icon">🎲</span>
          <span>Bandeja de dados de fieltro lista para la tirada.</span>
        </div>
      `;
    }

    return `
      <div class="dice-3d-arena-tray ${isRolling ? 'tumbling' : ''}">
        ${diceArray.map((val, idx) => {
          const faceRot = this.getFaceRotation(val);
          // Si está rodando, añadimos rotaciones caóticas extras de 720 a 1440 grados
          const extraRotX = isRolling ? (1080 + (idx * 360)) : 0;
          const extraRotY = isRolling ? (1440 + (idx * 360)) : 0;
          const finalRotX = faceRot.x + extraRotX;
          const finalRotY = faceRot.y + extraRotY;

          return `
            <div class="dice-3d-wrapper" style="animation-delay: ${idx * 0.12}s;">
              <div class="dice-cube-3d ${isRolling ? 'is-rolling' : ''}"
                   data-value="${val}"
                   style="transform: rotateX(${finalRotX}deg) rotateY(${finalRotY}deg);">
                <!-- CARA 1 -->
                <div class="dice-face face-1">
                  <span class="pip pip-center"></span>
                </div>
                <!-- CARA 2 -->
                <div class="dice-face face-2">
                  <span class="pip pip-top-left"></span>
                  <span class="pip pip-bottom-right"></span>
                </div>
                <!-- CARA 3 -->
                <div class="dice-face face-3">
                  <span class="pip pip-top-left"></span>
                  <span class="pip pip-center"></span>
                  <span class="pip pip-bottom-right"></span>
                </div>
                <!-- CARA 4 -->
                <div class="dice-face face-4">
                  <span class="pip pip-top-left"></span>
                  <span class="pip pip-top-right"></span>
                  <span class="pip pip-bottom-left"></span>
                  <span class="pip pip-bottom-right"></span>
                </div>
                <!-- CARA 5 -->
                <div class="dice-face face-5">
                  <span class="pip pip-top-left"></span>
                  <span class="pip pip-top-right"></span>
                  <span class="pip pip-center"></span>
                  <span class="pip pip-bottom-left"></span>
                  <span class="pip pip-bottom-right"></span>
                </div>
                <!-- CARA 6 -->
                <div class="dice-face face-6">
                  <span class="pip pip-top-left"></span>
                  <span class="pip pip-top-right"></span>
                  <span class="pip pip-mid-left"></span>
                  <span class="pip pip-mid-right"></span>
                  <span class="pip pip-bottom-left"></span>
                  <span class="pip pip-bottom-right"></span>
                </div>
              </div>
              <div class="dice-3d-shadow"></div>
              <div class="dice-value-pill">${val}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}




// --- FILE: iron_helm_game/js/ui/configMenu.js ---

/**
 * IRON HELM - Menú de Configuración y Selección Inicial
 */
class ConfigMenuView {
  constructor(container) {
    this.container = container;
    this.selectedCharId = 'fayon';
    this.selectedMode = 'CAMPAIGN'; // 'CAMPAIGN', 'MODULAR', 'ANEMIA'
    this.selectedCampaignId = 'base';
    this.enabledModularExpansions = new Set(['loot_lore', 'fanny_pack']);
    this.selectedDifficulty = 'NORMAL';
  }

  render() {
    this.container.innerHTML = `
      <div class="config-screen">
        <header class="config-header">
          <div class="title-container">
            <h1 class="game-logo">IRON HELM</h1>
            <p class="game-subtitle">VERSIÓN DIGITAL WEB · EDICIÓN INTEGRAL</p>
          </div>
          <div class="version-tag">Juego Base 2.4 + 15 Expansiones Oficiales + Fanmade Anemia</div>
        </header>

        <div class="config-grid">
          <!-- SECCIÓN IZQUIERDA: MODO DE JUEGO Y EXPANSIONES -->
          <div class="config-panel left-panel">
            <h2 class="section-title">
              <span class="icon">📜</span> 1. Modo de Juego y Expansiones
            </h2>

            <div class="mode-tabs">
              <button class="mode-tab ${this.selectedMode === 'CAMPAIGN' ? 'active' : ''}" data-mode="CAMPAIGN">
                Aventura / Campaña
              </button>
              <button class="mode-tab ${this.selectedMode === 'MODULAR' ? 'active' : ''}" data-mode="MODULAR">
                Sandbox Modular
              </button>
              <button class="mode-tab ${this.selectedMode === 'ANEMIA' ? 'active' : ''}" data-mode="ANEMIA">
                Expansión Anemia
              </button>
            </div>

            <div class="mode-content-area" id="modeContent">
              <!-- Renderizado dinámico según el modo -->
            </div>

            <div class="difficulty-box">
              <label class="config-label">Dificultad:</label>
              <div class="difficulty-options">
                <button class="diff-btn ${this.selectedDifficulty === 'EXPLORER' ? 'active' : ''}" data-diff="EXPLORER">
                  Explorador (+1 Ración, +2 Salud)
                </button>
                <button class="diff-btn ${this.selectedDifficulty === 'NORMAL' ? 'active' : ''}" data-diff="NORMAL">
                  Estándar (Reglas Oficiales)
                </button>
                <button class="diff-btn ${this.selectedDifficulty === 'HARD' ? 'active' : ''}" data-diff="HARD">
                  Pesadilla (+1 Daño Enemigos)
                </button>
              </div>
            </div>
          </div>

          <!-- SECCIÓN DERECHA: SELECCIÓN DE HÉROE -->
          <div class="config-panel right-panel">
            <h2 class="section-title">
              <span class="icon">🛡️</span> 2. Elige a tu Héroe
            </h2>

            <div class="heroes-carousel" id="heroesCarousel">
              ${CHARACTERS.map(char => `
                <div class="hero-card-select ${this.selectedCharId === char.id ? 'selected' : ''}" data-id="${char.id}">
                  <div class="hero-thumb-wrapper">
                    <img src="${char.image}" alt="${char.name}" class="hero-thumb" />
                    <span class="domain-pill ${char.domain.toLowerCase()}">${char.domain}</span>
                  </div>
                  <div class="hero-info">
                    <h3 class="hero-name">${char.name}</h3>
                    <p class="hero-title">${char.title}</p>
                    <div class="hero-stats-row">
                      <span class="stat-badge hp">❤️ ${char.health} HP</span>
                      <span class="stat-badge energy">⚡ ${char.energy} EN</span>
                      <span class="stat-badge carry">🎒 ${char.encumbrance} Carga</span>
                    </div>
                    <div class="hero-skill-row">
                      <strong>Habilidad:</strong> ${char.skill}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- FOOTER: BOTÓN DE INICIO -->
        <div class="config-footer">
          <div class="summary-text" id="configSummary"></div>
          <button class="btn-start-adventure" id="btnStartGame">
            <span class="btn-glow"></span>
            <span class="btn-text">⚔️ ENTRAR EN LA MAZMORRA ⚔️</span>
          </button>
        </div>
      </div>
    `;

    this.renderModeContent();
    this.updateSummary();
    this.bindEvents();
  }

  renderModeContent() {
    const container = this.container.querySelector('#modeContent');
    if (!container) return;

    if (this.selectedMode === 'CAMPAIGN') {
      const campaigns = EXPANSIONS.filter(e => e.type === 'CORE' || e.type === 'CAMPAIGN');
      container.innerHTML = `
        <p class="mode-desc">Selecciona el escenario de tu aventura. Cada campaña introduce su propia mazmorra y Jefe temático:</p>
        <div class="campaign-list">
          ${campaigns.map(camp => `
            <label class="campaign-radio-card ${this.selectedCampaignId === camp.id ? 'active' : ''}">
              <input type="radio" name="campaign" value="${camp.id}" ${this.selectedCampaignId === camp.id ? 'checked' : ''} />
              <div class="campaign-card-content">
                <div class="camp-title">${camp.name}</div>
                <div class="camp-desc">${camp.description}</div>
              </div>
            </label>
          `).join('')}
        </div>
      `;
    } else if (this.selectedMode === 'MODULAR') {
      const modular = EXPANSIONS.filter(e => e.type === 'MODULAR');
      container.innerHTML = `
        <p class="mode-desc">Juega con el Juego Base y añade las expansiones de equipo, botín y mecánicas que prefieras:</p>
        <div class="modular-list">
          ${modular.map(exp => `
            <label class="modular-checkbox-card ${this.enabledModularExpansions.has(exp.id) ? 'active' : ''}">
              <input type="checkbox" value="${exp.id}" ${this.enabledModularExpansions.has(exp.id) ? 'checked' : ''} />
              <div class="modular-card-content">
                <div class="exp-title">${exp.name}</div>
                <div class="exp-desc">${exp.description}</div>
              </div>
            </label>
          `).join('')}
        </div>
      `;
    } else if (this.selectedMode === 'ANEMIA') {
      const anemia = EXPANSIONS.find(e => e.id === 'anemia');
      container.innerHTML = `
        <div class="anemia-showcase">
          <div class="anemia-badge">EXPANSIÓN FANMADE 4.0</div>
          <h3>${anemia.name}</h3>
          <p class="anemia-desc">${anemia.description}</p>
          <div class="anemia-features">
            <div class="feat-item">🩸 Sistema de Sangrado y Heridas abiertas</div>
            <div class="feat-item">💀 20+ Cartas de aflicción y supervivencia extrema</div>
            <div class="feat-item">📜 Reglamento oficial 4.0 de la comunidad integrado</div>
          </div>
        </div>
      `;
    }
  }

  updateSummary() {
    const summary = this.container.querySelector('#configSummary');
    if (!summary) return;

    const char = CHARACTERS.find(c => c.id === this.selectedCharId) || CHARACTERS[0];
    let modeText = '';
    if (this.selectedMode === 'CAMPAIGN') {
      const camp = EXPANSIONS.find(e => e.id === this.selectedCampaignId);
      modeText = `Campaña: ${camp ? camp.name : 'Juego Base'}`;
    } else if (this.selectedMode === 'MODULAR') {
      modeText = `Sandbox: Base + ${this.enabledModularExpansions.size} Expansiones`;
    } else {
      modeText = 'Modo Especial: Expansión Fanmade Anemia 4.0';
    }

    summary.innerHTML = `
      <span class="summary-item">Héroe: <strong>${char.name} (${char.domain})</strong></span> · 
      <span class="summary-item">${modeText}</span> · 
      <span class="summary-item">Dificultad: <strong>${this.selectedDifficulty}</strong></span>
    `;
  }

  bindEvents() {
    // Cambio de modo
    this.container.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.selectedMode = e.currentTarget.dataset.mode;
        this.container.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.renderModeContent();
        this.updateSummary();
        soundManager.playCardFlip();
      });
    });

    // Delegación para campañas / modular
    this.container.querySelector('#modeContent').addEventListener('change', (e) => {
      if (e.target.name === 'campaign') {
        this.selectedCampaignId = e.target.value;
        this.renderModeContent();
        this.updateSummary();
        soundManager.playCardFlip();
      } else if (e.target.type === 'checkbox') {
        const id = e.target.value;
        if (e.target.checked) this.enabledModularExpansions.add(id);
        else this.enabledModularExpansions.delete(id);
        this.renderModeContent();
        this.updateSummary();
        soundManager.playCardFlip();
      }
    });

    // Selección de Dificultad
    this.container.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectedDifficulty = e.currentTarget.dataset.diff;
        this.container.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.updateSummary();
        soundManager.playCardFlip();
      });
    });

    // Selección de Héroe
    this.container.querySelectorAll('.hero-card-select').forEach(card => {
      card.addEventListener('click', (e) => {
        this.selectedCharId = e.currentTarget.dataset.id;
        this.container.querySelectorAll('.hero-card-select').forEach(c => c.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        this.updateSummary();
        soundManager.playCardFlip();
      });
    });

    // Botón Iniciar Partida
    const btnStart = this.container.querySelector('#btnStartGame');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        soundManager.playSwordHit();
        const config = {
          mode: this.selectedMode,
          campaignId: this.selectedMode === 'CAMPAIGN' ? this.selectedCampaignId : 'base',
          enabledExpansions: this.selectedMode === 'MODULAR' 
            ? ['base', ...Array.from(this.enabledModularExpansions)]
            : (this.selectedMode === 'ANEMIA' ? ['base', 'anemia'] : ['base', this.selectedCampaignId]),
          difficulty: this.selectedDifficulty
        };
        gameState.startNewGame(this.selectedCharId, config);
      });
    }
  }
}




// --- FILE: iron_helm_game/js/ui/dungeonMatView.js ---

/**
 * IRON HELM - Vista del Tapete de Mazmorra (Mesa Abierta Tabletop)
 * Sin recuadros negros ni paneles pesados. El tapete oficial de juego es el protagonista.
 * Cartas y fichas descansan directamente sobre la mesa con sombras y física táctil.
 */
class DungeonMatView {
  constructor(container) {
    this.container = container;
  }

  render() {
    const d = gameState.dungeon;
    const hero = gameState.hero;
    const de = gameState.dungeonEngine;
    const currentPair = de.currentPair;
    const c1 = currentPair.card1;
    const c2 = currentPair.card2;

    this.container.innerHTML = `
      <div class="dungeon-mat-surface" style="background-image: url('assets/mats/iron_helm_mat_web.jpg');">
        
        <!-- PISTA DE TRACKERS INTEGRADA DIRECTAMENTE SOBRE EL TAPETE (SIN CAJONES NEGROS) -->
        <div class="dungeon-hud-minimal">
          
          <!-- PISO / NIVEL CON PEÓN ROJO DE MADERA -->
          <div class="tabletop-tracker-item" title="Nivel de Mazmorra actual (1 a 5)">
            <span class="tracker-micro-label">Piso</span>
            <div class="tracker-pips-strip">
              ${[1, 2, 3, 4, 5].map(lvl => `
                <div class="tracker-pip ${d.currentLevel === lvl ? 'has-pawn' : (d.currentLevel > lvl ? 'cleared' : '')}">
                  ${d.currentLevel === lvl ? `<div class="wooden-pawn-red"></div>` : lvl}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- TURNO DEL PISO (1 A 8) -->
          <div class="tabletop-tracker-item" title="Turno del piso actual (8 turnos = fin de nivel)">
            <span class="tracker-micro-label">Turno</span>
            <div class="turn-brass-display">
              <span class="turn-curr">${de.turnNumber}</span>
              <span class="turn-sep">/</span>
              <span class="turn-max">8</span>
            </div>
          </div>

          <!-- OJOS DEL JEFE -->
          <div class="tabletop-tracker-item" title="Al acumular 10 Ojos despierta el Jefe Final">
            <span class="tracker-micro-label">Ojos</span>
            <div class="eyes-brass-display">
              <span class="eye-symbol">👁️</span>
              <span class="eyes-val">${gameState.plots.totalEyes}/10</span>
            </div>
          </div>

          <!-- MORAL -->
          <div class="tabletop-tracker-item" title="Moral del héroe (-5 a +5)">
            <span class="tracker-micro-label">Moral</span>
            <span class="moral-badge-num ${hero.morale > 0 ? 'pos' : (hero.morale < 0 ? 'neg' : '')}">
              ${hero.morale >= 0 ? '+' : ''}${hero.morale}
            </span>
          </div>

          <!-- PILAS DE FICHAS FÍSICAS FLOTANTES (RACIONES, ORO, VENENO, BENDICIONES) -->
          <div class="tabletop-token-shelf-direct">
            ${renderTokenPile({
              type: 'racion',
              image: 'assets/tokens/token_racion.png',
              count: hero.rations,
              label: 'Raciones',
              tooltip: 'Fichas de Ración para alimentarse al descender de piso.',
              size: 38
            })}
            ${renderTokenPile({
              type: 'oro',
              image: 'assets/tokens/token_oro.png',
              count: hero.gold,
              label: 'Oro',
              tooltip: 'Monedas de Oro para mercaderes y altares.',
              size: 38
            })}
            ${renderTokenPile({
              type: 'veneno',
              image: 'assets/tokens/token_veneno.png',
              count: hero.poison,
              label: 'Veneno',
              tooltip: 'Fichas de Veneno en tu cuerpo. ¡Peligro si iguala tu salud!',
              size: 38
            })}
            ${renderTokenPile({
              type: 'bendicion',
              image: 'assets/tokens/token_bendicion.png',
              count: hero.blessings,
              label: 'Bendición',
              tooltip: 'Fichas de Bendición sagrada.',
              size: 38
            })}
          </div>

        </div>

        <!-- MESA DE EXPLORACIÓN ABIERTA (SIN PANELES CUADRICULADOS) -->
        <div class="dungeon-mat-open-board">
          
          <!-- COLUMNA IZQUIERDA: MAZO DE MAZMORRA Y DESCARTES (COMPACTO Y ELEGANTE) -->
          <div class="mat-deck-stack-column">
            
            <!-- MAZO DE MAZMORRA FÍSICO -->
            <div class="tabletop-compact-deck draw-deck ${!c1 ? 'deck-active-glow' : ''}" 
                 id="dungeonDrawDeck"
                 title="${!c1 ? '¡Toca el mazo para repartir las 2 cartas del turno!' : 'Mazo de Mazmorra'}">
              <span class="deck-engraved-title">Mazmorra</span>
              
              <div class="card-stack-visual">
                ${de.deck.length > 0 ? `
                  <div class="card-stack-layers"></div>
                  <div class="card-stack-top">
                    <img src="assets/cards/base/card_011.jpg" alt="Reverso Mazmorra" />
                    ${!c1 ? `
                      <div class="deck-touch-tag">
                        <span>Toca para Robar</span>
                      </div>
                    ` : ''}
                  </div>
                  <span class="wax-seal-badge">${de.deck.length}</span>
                ` : `
                  <div class="exhausted-deck-placeholder">Agotado</div>
                `}
              </div>
            </div>

            <!-- PILA DE DESCARTES -->
            <div class="tabletop-compact-deck discard-deck" title="Pila de Descartes">
              <span class="deck-engraved-title">Descartes</span>
              <div class="card-stack-visual discard-visual">
                ${de.discardPile.length > 0 ? `
                  <div class="card-stack-top">
                    <img src="${de.discardPile[de.discardPile.length - 1].image || 'assets/cards/base/card_011.jpg'}" alt="Descarte" />
                  </div>
                  <span class="wax-seal-badge discard">${de.discardPile.length}</span>
                ` : `
                  <div class="empty-mat-slot-outline">Vacío</div>
                `}
              </div>
            </div>

          </div>

          <!-- ZONA CENTRAL DE EXPLORACIÓN: ESPACIO ABIERTO PARA LAS 2 CARTAS -->
          <div class="dungeon-exploration-open-center" id="openExplorationArea">
            
            ${!c1 ? `
              <!-- MESA DESPEJADA: INDICADOR ORGÁNICO DE ROBAR -->
              <div class="open-table-cue" id="cueTapToDeal">
                <div class="cue-compass-glow"></div>
                <div class="cue-text-cluster">
                  <span class="cue-turn-tag">Turno ${de.turnNumber + 1} de 8</span>
                  <span class="cue-action-txt">Toca el <strong>Mazo de Mazmorra</strong> para revelar el camino</span>
                </div>
              </div>
            ` : `
              <!-- LAS DOS CARTAS DEL TURNO DIRECTAMENTE SOBRE EL TAPETE -->
              <div class="turn-cards-pairing-table">
                
                <!-- CARTA 1 -->
                <div class="direct-card-pod pod-card-1">
                  <div class="interactive-card-3d ${de.card1Revealed ? 'is-flipped' : 'is-facedown'} ${de.resolvedCard === c1 ? 'is-accepted' : ''}"
                       id="interactiveCard1">
                    
                    <div class="card-inner-rotator">
                      <!-- REVERSO -->
                      <div class="card-side side-back">
                        <img src="assets/cards/base/card_011.jpg" alt="Carta Boca Abajo" />
                        <div class="card-tap-turn-hint">
                          <span>👆 Voltear</span>
                        </div>
                      </div>

                      <!-- ANVERSO REVELADO -->
                      <div class="card-side side-front">
                        <img src="${c1.image}" alt="${c1.name}" class="zoomable" data-img="${c1.image}" />
                        
                        ${de.card1Revealed && !de.resolvedCard ? `
                          <div class="card-subtle-wax-decision accept-seal" id="bannerAcceptCard1">
                            <span>⚔️ Aceptar Opción 1</span>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  </div>

                  <span class="card-under-caption">
                    ${!de.card1Revealed ? 'Carta 1 (Toca para voltear)' : (de.resolvedCard === c1 ? '✅ Aceptada' : 'Toca para aceptar (Opción 1)')}
                  </span>
                </div>

                <!-- CARTA 2 -->
                <div class="direct-card-pod pod-card-2">
                  <div class="interactive-card-3d ${de.card2Revealed ? 'is-flipped enforced-danger' : 'is-facedown'} ${de.resolvedCard === c2 ? 'is-accepted' : ''}"
                       id="interactiveCard2">
                    
                    <div class="card-inner-rotator">
                      <!-- REVERSO -->
                      <div class="card-side side-back">
                        <img src="assets/cards/base/card_011.jpg" alt="Carta Boca Abajo" />
                        
                        ${de.card1Revealed && !de.resolvedCard ? `
                          <div class="card-subtle-wax-decision decline-seal" id="bannerDeclineToCard2">
                            <span>⏩ Rechazar Carta 1<br><small>Forzar Opción 2</small></span>
                          </div>
                        ` : `
                          <div class="card-locked-veil">🔒</div>
                        `}
                      </div>

                      <!-- ANVERSO REVELADO FORZADO -->
                      <div class="card-side side-front">
                        <img src="${c2.image}" alt="${c2.name}" class="zoomable" data-img="${c2.image}" />
                        <div class="enforced-danger-badge">⚠️ Opción 2 Obligatoria</div>
                      </div>
                    </div>
                  </div>

                  <span class="card-under-caption">
                    ${de.card2Revealed ? '⚠️ Forzada (Opción 2)' : (de.card1Revealed && !de.resolvedCard ? 'Toca para pasar a Carta 2' : 'Carta 2')}
                  </span>
                </div>

              </div>
            `}

          </div>

          <!-- COLUMNA DERECHA: MAZOS SECUNDARIOS COMPACTOS EN SUS ESPACIOS DE ESTANTERÍA -->
          <div class="mat-aux-decks-column">
            
            <!-- ENEMIGOS -->
            <div class="aux-mini-deck" title="Mazo de Enemigos de Mazmorra">
              <span class="aux-deck-name">Enemigos</span>
              <div class="aux-card-visual">
                <img src="assets/cards/base/card_010.jpg" alt="Enemigos" />
                <span class="aux-count-pip">${gameState.enemyDeck.length}</span>
              </div>
            </div>

            <!-- BOTÍN -->
            <div class="aux-mini-deck" title="Mazo de Botín y Tesoro">
              <span class="aux-deck-name">Botín</span>
              <div class="aux-card-visual">
                <img src="assets/cards/base/card_055.jpg" alt="Botín" />
                <span class="aux-count-pip">${gameState.lootDeck.length}</span>
              </div>
            </div>

            <!-- TRAMAS -->
            <div class="aux-mini-deck" title="Mazo de Tramas">
              <span class="aux-deck-name">Tramas</span>
              <div class="aux-card-visual">
                <img src="assets/cards/base/card_055.jpg" alt="Tramas" />
                <span class="aux-count-pip">${gameState.plotDeck.length}</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const de = gameState.dungeonEngine;

    // Robar tocando el mazo de mazmorra o la mesa
    const deckSpot = this.container.querySelector('#dungeonDrawDeck');
    const cueSpot = this.container.querySelector('#cueTapToDeal');
    const triggerDraw = () => {
      if (!de.currentPair.card1) {
        soundManager.playCardFlip();
        de.drawExplorationPair();
        gameState.notify();
      }
    };

    if (deckSpot) deckSpot.addEventListener('click', triggerDraw);
    if (cueSpot) cueSpot.addEventListener('click', triggerDraw);

    // Interacción física con Carta 1
    const card1 = this.container.querySelector('#interactiveCard1');
    if (card1) {
      card1.addEventListener('click', (e) => {
        if (e.target.classList.contains('zoomable') && de.card1Revealed) {
          if (window.openCardModal) {
            window.openCardModal(e.target.dataset.img);
            return;
          }
        }

        if (!de.card1Revealed) {
          soundManager.playCardFlip();
          de.revealCard1();
          gameState.notify();
          return;
        }

        if (de.card1Revealed && !de.resolvedCard) {
          soundManager.playCardFlip();
          de.acceptCard1();
          gameState.notify();
        }
      });
    }

    // Interacción física con Carta 2
    const card2 = this.container.querySelector('#interactiveCard2');
    if (card2) {
      card2.addEventListener('click', (e) => {
        if (e.target.classList.contains('zoomable') && de.card2Revealed) {
          if (window.openCardModal) {
            window.openCardModal(e.target.dataset.img);
            return;
          }
        }

        // Si Carta 1 está revelada y tocamos Carta 2 -> Rechazar Carta 1 y forzar Carta 2
        if (de.card1Revealed && !de.resolvedCard) {
          soundManager.playCardFlip();
          de.rejectCard1AndRevealCard2();
          gameState.notify();
        }
      });
    }

    // Zoom en cartas auxiliares
    this.container.querySelectorAll('.zoomable').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.openCardModal) window.openCardModal(e.currentTarget.dataset.img);
      });
    });
  }
}




// --- FILE: iron_helm_game/js/ui/characterMatView.js ---

/**
 * IRON HELM - Vista del Tapete de Personaje Tabletop (Orgánico y Superpuesto)
 * Cartas de equipo en posición vertical superpuestas naturalmente,
 * pilas de fichas físicas sin cajas oscuras y ficha de héroe integrada.
 */
class CharacterMatView {
  constructor(container) {
    this.container = container;
  }

  render() {
    const hero = gameState.hero;
    if (!hero) return;

    const ie = gameState.inventoryEngine;
    const currentWeight = ie.getCurrentWeight();
    const maxWeight = ie.getMaxEncumbrance();
    const isOverburdened = currentWeight > maxWeight;

    // Renderiza una carta de equipo en formato vertical auténtico
    const renderEquippedCard = (slotCode, slotName, defaultIcon, tiltDeg = 0) => {
      const item = hero.equipped[slotCode];
      if (!item) {
        return `
          <div class="tabletop-open-slot empty" data-slot="${slotCode}" title="Ranura ${slotName} (Vacía)">
            <span class="slot-chalk-icon">${defaultIcon}</span>
            <span class="slot-chalk-name">${slotName}</span>
          </div>
        `;
      }

      return `
        <div class="tabletop-open-slot occupied" 
             data-slot="${slotCode}" 
             style="transform: rotate(${tiltDeg}deg);"
             title="${item.name}">
          
          <div class="equipped-card-leaf">
            <img src="${item.image || 'assets/cards/base/card_055.jpg'}" 
                 alt="${item.name}" 
                 class="equipped-card-img zoomable" 
                 data-img="${item.image || 'assets/cards/base/card_055.jpg'}" />

            <div class="equipped-card-badge">
              ${item.attackBonus ? `<span class="stat-tag atk">+${item.attackBonus} ATK</span>` : ''}
              ${item.armorValueInitial ? `<span class="stat-tag def">🛡️ -${item.armorValueInitial}</span>` : ''}
              ${item.encumbranceBonus ? `<span class="stat-tag carry">+${item.encumbranceBonus}</span>` : ''}
            </div>

            ${!item.isTwoHandSlot ? `
              <button class="btn-card-pop-unequip" data-slot="${slotCode}" title="Desequipar carta">✕</button>
            ` : ''}
          </div>

          <span class="equipped-card-caption">${item.name}</span>
        </div>
      `;
    };

    this.container.innerHTML = `
      <div class="char-mat-surface-organic" style="background-image: url('assets/mats/personaje_mat_web.jpg');">
        
        <!-- CABECERA DE HÉROE INTEGRADA (SIN CAJA NEGRA) -->
        <div class="hero-mat-header-direct">
          <!-- CARTA DE HÉROE OFICIAL EN FORMATO VERTICAL REAL -->
          <div class="hero-card-table-anchor" title="${hero.name}">
            <img src="${hero.image}" alt="${hero.name}" class="hero-card-portrait zoomable" data-img="${hero.image}" />
          </div>

          <!-- DETALLES Y CREDENCIALES DEL HÉROE -->
          <div class="hero-bio-plaque">
            <div class="hero-name-gold">${hero.name}</div>
            <div class="hero-title-italic">${hero.title || ''}</div>
            <div class="hero-domain-tag">Dominio: <strong>${hero.domain}</strong></div>
            
            <div class="hero-skill-action-row">
              <span class="skill-tag">Habilidad: <strong>${hero.skill}</strong></span>
              ${this.canUseSkillOutOfCombat() ? `
                <button class="btn-rune-skill" id="btnUseSkillHero">
                  ✨ Usar Habilidad
                </button>
              ` : ''}
            </div>

            <div class="hero-load-indicator">
              <span>Carga: <strong>${currentWeight} / ${maxWeight}</strong></span>
              ${isOverburdened ? '<span class="overburden-warning">¡SOBRECARGA!</span>' : ''}
            </div>
          </div>
        </div>

        <!-- PILAS DE SALUD Y ENERGÍA FÍSICAS SOBRE EL TAPETE -->
        <div class="hero-vitals-piles-direct">
          ${renderTokenPile({
            type: 'salud',
            image: 'assets/tokens/token_salud.png',
            count: hero.hp,
            maxCount: hero.maxHp,
            label: 'Salud',
            tooltip: 'Fichas de Salud del héroe.',
            size: 46
          })}

          ${renderTokenPile({
            type: 'energia',
            image: 'assets/tokens/token_energia.png',
            count: hero.energy,
            maxCount: hero.maxEnergy,
            label: 'Energía',
            tooltip: 'Fichas de Energía para dados y habilidades.',
            size: 46
          })}
        </div>

        <!-- ZONA DE CARTAS DE EQUIPAMIENTO SUPERPUESTAS (ORGANIC TABLETOP LAYOUT) -->
        <div class="equipment-overlapping-table-zone">
          <div class="equipment-zone-caption">⚔️ Equipamiento en Uso</div>

          <!-- FILA 1: ARMAS Y MANOS (SUPERPUESTAS) -->
          <div class="hands-overlapping-cluster">
            <!-- MANO PRINCIPAL (ARMA) -->
            ${renderEquippedCard('MP', 'Mano Principal', '🗡️', -2)}
            <!-- OTRA MANO (ESCUDO / ANTORCHA) -->
            ${renderEquippedCard('OM', 'Otra Mano', '🛡️', 2)}
          </div>

          <!-- FILA 2: ARMADURA, CASCO Y ACCESORIO (SUPERPUESTOS EN ABANICO CORTO) -->
          <div class="armor-overlapping-cluster">
            <!-- ARMADURA (CUERPO) -->
            ${renderEquippedCard('CP', 'Armadura', '🦺', -1)}
            <!-- CASCO (CABEZA) -->
            ${renderEquippedCard('CA', 'Casco', '🪖', 1)}
            <!-- ACCESORIO -->
            ${renderEquippedCard('AC', 'Accesorio', '💍', 0)}
          </div>
        </div>

        <!-- CEMENTERIO DE ENEMIGOS VENCIDOS (MONTONCITO DE CARTAS DE MONSTRUO) -->
        <div class="graveyard-tabletop-pile">
          <div class="graveyard-header-row">
            <span class="grave-title">💀 Cementerio (${gameState.graveyard.length})</span>
          </div>

          <div class="graveyard-cards-fan">
            ${gameState.graveyard.slice(-6).map((e, idx) => `
              <div class="graveyard-mini-card" style="transform: rotate(${(idx - 2.5) * 4}deg); z-index: ${idx + 1};" title="${e.name}">
                <img src="${e.image || 'assets/cards/base/card_010.jpg'}" alt="${e.name}" class="zoomable" data-img="${e.image || 'assets/cards/base/card_010.jpg'}" />
              </div>
            `).join('')}
            ${gameState.graveyard.length === 0 ? '<span class="empty-grave-note">Sin víctimas aún</span>' : ''}
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
  }

  canUseSkillOutOfCombat() {
    const hero = gameState.hero;
    if (!hero) return false;
    return (hero.skill === 'Alquimia' && hero.energy >= 1) ||
           (hero.skill === 'Divinidad' && hero.energy >= 2);
  }

  bindEvents() {
    const ie = gameState.inventoryEngine;

    // Desequipar cartas
    this.container.querySelectorAll('.btn-card-pop-unequip[data-slot]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slot = e.currentTarget.dataset.slot;
        ie.unequip(slot);
        soundManager.playCardFlip();
        gameState.notify();
      });
    });

    // Usar habilidad fuera de combate
    const btnSkill = this.container.querySelector('#btnUseSkillHero');
    if (btnSkill) {
      btnSkill.addEventListener('click', () => {
        const hero = gameState.hero;
        if (hero.skill === 'Alquimia' && hero.energy >= 1) {
          hero.energy -= 1;
          if (hero.poison > 0) hero.poison -= 1;
          else hero.hp = Math.min(hero.maxHp, hero.hp + 2);
          soundManager.playPotion();
          gameState.notify();
        } else if (hero.skill === 'Divinidad' && hero.energy >= 2) {
          hero.energy -= 2;
          hero.hp = Math.min(hero.maxHp, hero.hp + 2);
          if (hero.poison > 0) hero.poison -= 1;
          soundManager.playPotion();
          gameState.notify();
        }
      });
    }

    // Zoom
    this.container.querySelectorAll('.zoomable').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.openCardModal) window.openCardModal(e.currentTarget.dataset.img);
      });
    });
  }
}




// --- FILE: iron_helm_game/js/ui/inventoryFanView.js ---

/**
 * IRON HELM DIGITAL - Abanico de Cartas de Inventario (Hand Fan Tabletop View)
 * Muestra las cartas que el jugador lleva en su mochila y equipo como una mano
 * física de cartas en abanico, con físicas de elevación, giro y selección táctil.
 */
class InventoryFanView {
  constructor(container) {
    this.container = container;
    this.isOpen = false;
  }

  toggle() {
    this.isOpen = !this.isOpen;
    soundManager.playCardFlip();
    this.render();
  }

  render() {
    const hero = gameState.hero;
    if (!hero) return;

    const ie = gameState.inventoryEngine;
    const backpack = hero.backpack || [];
    const currentWeight = ie.getCurrentWeight();
    const maxWeight = ie.getMaxEncumbrance();
    const isOverburdened = currentWeight > maxWeight;

    // Renderiza el botón pestaña fijo en la parte inferior o la mano completa
    this.container.innerHTML = `
      <div class="inventory-hand-wrapper ${this.isOpen ? 'open' : 'closed'}">
        <!-- PESTAÑA DE CUERO REPUJADO PARA ABRIR/CERRAR LA MANO -->
        <button class="inventory-drawer-tab" id="btnToggleHand">
          <span class="tab-icon">🎒</span>
          <span class="tab-text">Mano de Cartas (${backpack.length} cartas · ${currentWeight}/${maxWeight} Carga)</span>
          ${isOverburdened ? '<span class="warning-badge">¡SOBRECARGA!</span>' : ''}
          <span class="tab-arrow">${this.isOpen ? '▼ Guardar Mano' : '▲ Desplegar Abanico'}</span>
        </button>

        <!-- BANDEJA DEL ABANICO DE CARTAS -->
        <div class="card-fan-tray">
          <div class="card-fan-container">
            ${backpack.length === 0 ? `
              <div class="empty-backpack-message">
                <span style="font-size: 2rem;">👝</span>
                <p>Tu mochila está vacía. Encuentra botín explorando la mazmorra.</p>
              </div>
            ` : backpack.map((item, idx) => {
              const total = backpack.length;
              // Cálculo trigonométrico del arco del abanico
              const mid = (total - 1) / 2;
              const normalizedPos = idx - mid;
              const angle = normalizedPos * 7; // Grados de inclinación
              const translateY = Math.abs(normalizedPos) * 6; // Arco curvado hacia abajo en los bordes

              return `
                <div class="fan-card-leaf"
                     style="
                       transform: rotate(${angle}deg) translateY(${translateY}px);
                       z-index: ${idx + 10};
                     "
                     data-idx="${idx}">
                  
                  <div class="fan-card-inner">
                    <img src="${item.image || 'assets/cards/base/card_055.jpg'}" 
                         alt="${item.name}" 
                         class="fan-card-art zoomable"
                         data-img="${item.image || 'assets/cards/base/card_055.jpg'}" />

                    <div class="fan-card-header-bar">
                      <span class="fan-item-title">${item.name}</span>
                      <span class="fan-item-weight">⚖️ ${item.weight || 1}</span>
                    </div>

                    <!-- ACCIONES TÁCTILES AL ELEVAR LA CARTA -->
                    <div class="fan-card-actions-ribbon">
                      ${item.slot ? `
                        <button class="btn-fan-action equip" data-action="equip" data-idx="${idx}">
                          🛡️ Equipar
                        </button>
                      ` : ''}
                      ${item.use ? `
                        <button class="btn-fan-action use" data-action="use" data-idx="${idx}">
                          🧪 Beber
                        </button>
                      ` : ''}
                      <button class="btn-fan-action drop" data-action="drop" data-idx="${idx}" title="Soltar objeto">
                        ✕ Soltar
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const btnToggle = this.container.querySelector('#btnToggleHand');
    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        this.toggle();
      });
    }

    const ie = gameState.inventoryEngine;

    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = e.currentTarget.dataset.action;
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        const item = gameState.hero.backpack[idx];
        if (!item) return;

        if (act === 'equip') {
          ie.equip(item, idx);
          soundManager.playCardFlip();
        } else if (act === 'use') {
          if (item.use) {
            item.use(gameState.hero);
            soundManager.playPotion();
            ie.dropItem(idx);
          }
        } else if (act === 'drop') {
          ie.dropItem(idx);
          soundManager.playCardFlip();
        }

        gameState.notify();
      });
    });

    this.container.querySelectorAll('.zoomable').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.openCardModal) {
          window.openCardModal(e.currentTarget.dataset.img);
        }
      });
    });
  }
}




// --- FILE: iron_helm_game/js/ui/combatArenaView.js ---

/**
 * IRON HELM - Arena de Combate Tabletop Fluida y Animada
 * Con animaciones de impacto, tajo de espada, estocada del monstruo,
 * números de daño flotantes y dados 3D reales.
 */
class CombatArenaView {
  constructor(container) {
    this.container = container;
    this.selectedEnergy = 1;
    this.animPhase = 'IDLE'; // 'IDLE', 'ROLLING', 'PLAYER_SLASH', 'ENEMY_LUNGE'
    this.lastPlayerDamage = null;
    this.lastEnemyDamage = null;
  }

  render() {
    const cs = gameState.combatEngine.combatState;
    if (!cs) return;

    const enemy = cs.enemy;
    const hero = gameState.hero;
    const isPlayerTurn = cs.phase === 'PLAYER_INPUT' && this.animPhase === 'IDLE';
    const isFinished = cs.phase === 'FINISHED';

    const weapon = hero.equipped.MP;
    const weaponName = weapon ? weapon.name : 'Puños';
    const weaponBonus = gameState.inventoryEngine.getWeaponAttackBonus();
    const maxUsableEnergy = Math.min(3, hero.energy);

    this.container.innerHTML = `
      <div class="combat-overlay-modal ${this.animPhase === 'ENEMY_LUNGE' ? 'screen-shake' : ''}">
        
        <!-- DESTELLO DE SANGRE EN PANTALLA AL RECIBIR DAÑO -->
        <div class="blood-screen-vignette ${this.animPhase === 'ENEMY_LUNGE' ? 'flash' : ''}"></div>

        <div class="wooden-combat-stage">
          
          <!-- CABECERA DE COMBATE (ELEGANTE, SIN BARRAS PESADAS) -->
          <div class="combat-stage-header">
            <div class="combat-enemy-title-row">
              <span class="combat-vs-badge">Ronda ${cs.round}</span>
              <h2 class="combat-enemy-name-wood">${enemy.name}</h2>
              ${cs.isBoss ? '<span class="boss-crown-tag">👑 JEFE FINAL</span>' : ''}
            </div>
            
            <div class="combat-enemy-hp-pills">
              <span class="enemy-hp-badge">❤️ ${Math.max(0, cs.enemyHp)} / ${cs.enemyMaxHp} Salud</span>
              <span class="enemy-weakness-badge">Debilidad: <strong>${enemy.weakness}</strong></span>
            </div>
          </div>

          <div class="combat-arena-center-stage">
            
            <!-- CARTA DE MONSTRUO CON FÍSICAS Y ANIMACIONES DE DAÑO -->
            <div class="monster-card-showcase ${this.animPhase === 'PLAYER_SLASH' ? 'monster-hit' : ''} ${this.animPhase === 'ENEMY_LUNGE' ? 'monster-lunge' : ''}">
              
              <div class="monster-card-frame">
                <img src="${enemy.image}" alt="${enemy.name}" class="monster-card-art zoomable" data-img="${enemy.image}" />
                
                <!-- EFECTO DE TAJO DE ESPADA AL ATACAR -->
                <div class="sword-slash-fx ${this.animPhase === 'PLAYER_SLASH' ? 'active' : ''}"></div>

                <!-- NÚMERO DE DAÑO FLOTANTE AL MONSTRUO -->
                ${this.lastPlayerDamage !== null ? `
                  <div class="floating-damage-number monster-dmg">-${this.lastPlayerDamage} HP</div>
                ` : ''}

                <!-- BARRA DE SALUD VIVA DEL ENEMIGO -->
                <div class="monster-hp-underbar">
                  <div class="monster-hp-fill" style="width: ${Math.max(0, (cs.enemyHp / cs.enemyMaxHp) * 100)}%;"></div>
                </div>
              </div>

              <div class="monster-stats-tag">
                <span>Daño Base: <strong>+${enemy.damage || 0}</strong></span>
              </div>
            </div>

            <!-- BANDEJA DE DADOS 3D CENTRAL (TÁCTIL) -->
            <div class="combat-dice-and-log-col">
              
              <!-- BANDEJA DE DADOS DE FIELTRO VERDE CON DADOS 3D -->
              <div class="felt-dice-tray interactive-tray" id="feltDiceTray" title="Toca para lanzar los dados">
                <div class="tray-subtle-caption">Bandeja de Fieltro · Dados 3D</div>
                
                <div class="dice-tumbler-area">
                  ${Dice3DManager.renderDiceMarkup(cs.diceRolls, this.animPhase === 'ROLLING')}
                </div>

                ${this.animPhase === 'IDLE' && isPlayerTurn ? `
                  <div class="tray-click-prompt">
                    <span>👆 Haz clic en la bandeja o en ATACAR para lanzar</span>
                  </div>
                ` : ''}
              </div>

              <!-- REGISTRO NARRATIVO DINÁMICO (MINIMALISTA) -->
              <div class="combat-micro-narrative" id="combatLogScroll">
                ${cs.logs.slice(-4).map(line => `<div class="log-line-item">${line}</div>`).join('')}
              </div>

            </div>

          </div>

          <!-- BARRA DE ACCIÓN FLUIDA (SIN BOTONES MASIVOS) -->
          <div class="combat-fluid-action-bar">
            ${isPlayerTurn && !isFinished ? `
              <!-- SELECTOR DE ENERGÍA FLUIDO Y COMPACTO -->
              <div class="energy-flow-selector">
                <span class="energy-selector-label">Inversión de Energía:</span>
                <div class="energy-tokens-stepper">
                  <button class="btn-energy-step" id="btnEnergyMinus" ${this.selectedEnergy <= 0 ? 'disabled' : ''}>−</button>
                  <div class="energy-step-display">
                    <img src="assets/tokens/token_energia.png" alt="Energía" class="step-token-img" />
                    <span class="step-count">${this.selectedEnergy} EN</span>
                    <span class="step-dice">(${Math.max(1, this.selectedEnergy)}d6)</span>
                  </div>
                  <button class="btn-energy-step" id="btnEnergyPlus" ${this.selectedEnergy >= maxUsableEnergy ? 'disabled' : ''}>+</button>
                </div>
              </div>

              <!-- BOTÓN PRINCIPAL DE LANZAR ATAQUE -->
              <div class="combat-main-actions">
                <button class="btn-fluid-attack" id="btnFluidAttack">
                  <span class="btn-attack-icon">⚔️</span>
                  <span class="btn-attack-text">Atacar con ${weaponName} (+${weaponBonus})</span>
                </button>

                ${this.hasAvailableCombatSkill() ? `
                  <button class="btn-fluid-skill" id="btnFluidSkill" title="Activar ${hero.skill}">
                    ✨ ${hero.skill}
                  </button>
                ` : ''}
              </div>
            ` : (isFinished ? `
              <div class="combat-victory-banner">
                <button class="btn-continue-dungeon" id="btnEndCombat">
                  🏆 Recoger Botín y Continuar
                </button>
              </div>
            ` : `
              <div class="combat-resolving-notice">
                <span>⚔️ Resolviendo choque de combate...</span>
              </div>
            `)}
          </div>

        </div>
      </div>
    `;

    this.bindEvents();
  }

  hasAvailableCombatSkill() {
    const hero = gameState.hero;
    return (hero.skill === 'Esquivar' && hero.energy >= 1) ||
           (hero.skill === 'Bloquear' && hero.energy >= 1) ||
           (hero.skill === 'Ocultación' && hero.energy >= 2 && !gameState.combatEngine.combatState.isBoss) ||
           (hero.skill === 'Golpe Brutal' && hero.energy >= 2) ||
           (hero.skill === 'Dominio del Hacha' && hero.energy >= 1) ||
           (hero.skill === 'Nigromancia' && hero.energy >= 2);
  }

  executeFluidAttack() {
    const ce = gameState.combatEngine;
    const hero = gameState.hero;

    // 1. Fase de rodaje de dados 3D
    this.animPhase = 'ROLLING';
    soundManager.playDiceRoll();
    this.render();

    setTimeout(() => {
      // 2. Resolver tirada y animar tajo
      const prevHp = ce.combatState.enemyHp;
      ce.executePlayerAttack(this.selectedEnergy);
      const dealtDmg = Math.max(0, prevHp - ce.combatState.enemyHp);

      this.lastPlayerDamage = dealtDmg > 0 ? dealtDmg : 0;
      this.animPhase = 'PLAYER_SLASH';
      soundManager.playSwordHit();
      this.render();

      setTimeout(() => {
        // 3. Si el enemigo contraataca y el combate no terminó
        if (ce.combatState.phase === 'ENEMY_COUNTER' || ce.combatState.phase === 'PLAYER_INPUT') {
          this.animPhase = 'IDLE';
          this.lastPlayerDamage = null;
          this.render();
        } else {
          this.animPhase = 'IDLE';
          this.lastPlayerDamage = null;
          gameState.notify();
        }
      }, 600);

    }, 650);
  }

  bindEvents() {
    const ce = gameState.combatEngine;
    const hero = gameState.hero;

    // Stepper de energía (+ y -)
    const btnMinus = this.container.querySelector('#btnEnergyMinus');
    if (btnMinus) {
      btnMinus.addEventListener('click', () => {
        if (this.selectedEnergy > 0) {
          this.selectedEnergy--;
          soundManager.playCardFlip();
          this.render();
        }
      });
    }

    const btnPlus = this.container.querySelector('#btnEnergyPlus');
    if (btnPlus) {
      btnPlus.addEventListener('click', () => {
        if (this.selectedEnergy < Math.min(3, hero.energy)) {
          this.selectedEnergy++;
          soundManager.playCardFlip();
          this.render();
        }
      });
    }

    // Botón de ataque y clic en la bandeja de dados
    const btnAttack = this.container.querySelector('#btnFluidAttack');
    if (btnAttack) {
      btnAttack.addEventListener('click', () => {
        this.executeFluidAttack();
      });
    }

    const diceTray = this.container.querySelector('#feltDiceTray');
    if (diceTray && this.animPhase === 'IDLE' && ce.combatState.phase === 'PLAYER_INPUT') {
      diceTray.addEventListener('click', () => {
        this.executeFluidAttack();
      });
    }

    // Habilidad
    const btnSkill = this.container.querySelector('#btnFluidSkill');
    if (btnSkill) {
      btnSkill.addEventListener('click', () => {
        ce.usePlayerSkill();
        soundManager.playSwordHit();
        gameState.notify();
      });
    }

    // Finalizar combate
    const btnEnd = this.container.querySelector('#btnEndCombat');
    if (btnEnd) {
      btnEnd.addEventListener('click', () => {
        gameState.setStatus('EXPLORATION');
      });
    }

    // Zoom
    this.container.querySelectorAll('.zoomable').forEach(img => {
      img.addEventListener('click', (e) => {
        if (window.openCardModal) window.openCardModal(e.currentTarget.dataset.img);
      });
    });
  }
}




// --- FILE: iron_helm_game/js/ui/cardInteractionModal.js ---

/**
 * IRON HELM - Modal de Interacción con Cartas de Mazmorra / Trama (Tipo 1)
 */
class CardInteractionModalView {
  constructor(container) {
    this.container = container;
  }

  render() {
    const card = gameState.activeCard;
    const choices = gameState.activeChoices || [];
    if (!card) return;

    this.container.innerHTML = `
      <div class="card-interaction-overlay">
        <div class="interaction-card-modal">
          <div class="modal-card-preview">
            <img src="${card.image || 'assets/cards/base/card_014.jpg'}" alt="${card.name}" class="preview-img zoomable" data-img="${card.image}" />
          </div>

          <div class="modal-content-panel">
            <h3 class="interaction-title">${card.name}</h3>
            <p class="interaction-narrative">${card.description || card.narrative || 'Elige cómo afrontar esta situación:'}</p>

            <div class="choices-button-list">
              ${choices.map((ch, idx) => {
                const canChoose = ch.condition ? ch.condition(gameState.hero) : true;
                return `
                  <button class="btn-interaction-choice ${!canChoose ? 'disabled' : ''}" data-index="${idx}" ${!canChoose ? 'disabled' : ''}>
                    <div class="choice-label">${ch.label}</div>
                    <div class="choice-detail">${ch.detail || ''}</div>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelectorAll('.btn-interaction-choice').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        const choice = gameState.activeChoices[idx];
        if (choice && choice.execute) {
          const res = choice.execute(gameState);
          soundManager.playCardFlip();
          gameState.activeCard = null;
          gameState.activeChoices = [];
          gameState.setStatus('EXPLORATION');
        }
      });
    });

    this.container.querySelectorAll('.zoomable').forEach(img => {
      img.addEventListener('click', (e) => {
        if (window.openCardModal) window.openCardModal(e.currentTarget.dataset.img);
      });
    });
  }
}




// --- FILE: iron_helm_game/js/ui/merchantModal.js ---

/**
 * IRON HELM - Modal del Mercader Errante
 */
class MerchantModalView {
  constructor(container) {
    this.container = container;
  }

  render() {
    const hero = gameState.hero;
    const items = gameState.activeMerchantItems || [];

    this.container.innerHTML = `
      <div class="merchant-overlay">
        <div class="merchant-modal-box">
          <div class="merchant-header">
            <span class="shop-badge">🏪 TIENDA DEL MERCADER</span>
            <div class="merchant-gold">Tu Oro: <strong>${hero.gold} 🪙</strong></div>
          </div>

          <div class="merchant-columns">
            <!-- ARTÍCULOS EN VENTA -->
            <div class="merchant-wares-col">
              <h4>Objetos en Venta</h4>
              <div class="wares-list">
                ${items.map((item, idx) => `
                  <div class="ware-card">
                    <div class="ware-info">
                      <span class="ware-name">${item.name}</span>
                      <span class="ware-meta">Precio: <strong>${item.price} 🪙</strong> · Peso: ${item.weight || 1}</span>
                      <p class="ware-desc">${item.description || ''}</p>
                    </div>
                    <button class="btn-buy ${hero.gold < item.price ? 'disabled' : ''}" data-index="${idx}" ${hero.gold < item.price ? 'disabled' : ''}>
                      Comprar (${item.price} 🪙)
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- TU MOCHILA PARA VENDER -->
            <div class="player-sell-col">
              <h4>Vender Objetos de tu Mochila</h4>
              <div class="sell-list">
                ${hero.backpack.length === 0 ? '<div class="empty-backpack-note">No tienes objetos en la mochila para vender.</div>' : hero.backpack.map((item, idx) => {
                  const sellPrice = Math.max(1, Math.floor((item.price || 1) / 2));
                  return `
                    <div class="sell-card">
                      <div class="sell-info">
                        <span class="sell-name">${item.name}</span>
                        <span class="sell-price">Valor de venta: +${sellPrice} 🪙</span>
                      </div>
                      <button class="btn-sell" data-index="${idx}">
                        Vender (+${sellPrice} 🪙)
                      </button>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <div class="merchant-footer">
            <button class="btn-action primary" id="btnCloseMerchant">
              👋 Cerrar Tienda y Continuar la Aventura
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelectorAll('.btn-buy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        const item = gameState.activeMerchantItems[idx];
        if (item) {
          gameState.buyItem(item);
          this.render();
        }
      });
    });

    this.container.querySelectorAll('.btn-sell').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        gameState.sellItem(idx);
        this.render();
      });
    });

    const btnClose = this.container.querySelector('#btnCloseMerchant');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        gameState.setStatus('EXPLORATION');
      });
    }
  }
}




// --- FILE: iron_helm_game/js/ui/logPanel.js ---

/**
 * IRON HELM - Panel de Registro de Eventos (Event Log Panel)
 */
class LogPanelView {
  constructor(container) {
    this.container = container;
    this.isOpen = false;
    this.activeFilter = 'ALL';
    logger.subscribe(() => {
      if (this.isOpen) this.renderLogs();
    });
  }

  render() {
    this.container.innerHTML = `
      <div class="log-panel-drawer ${this.isOpen ? 'open' : ''}">
        <div class="log-panel-toggle" id="btnToggleLog" title="Abrir/Cerrar Registro de Partida">
          <span>📜 Registro</span>
        </div>

        <div class="log-panel-content">
          <div class="log-panel-header">
            <h3>Registro de la Mazmorra</h3>
            <div class="log-actions">
              <button class="btn-log-action" id="btnClearLog">Limpiar</button>
              <button class="btn-log-action" id="btnCloseLog">✕</button>
            </div>
          </div>

          <!-- Filtros de categoría -->
          <div class="log-filter-tabs">
            <button class="log-tab ${this.activeFilter === 'ALL' ? 'active' : ''}" data-cat="ALL">Todos</button>
            <button class="log-tab ${this.activeFilter === LogCategory.COMBAT ? 'active' : ''}" data-cat="${LogCategory.COMBAT}">Combate</button>
            <button class="log-tab ${this.activeFilter === LogCategory.EXPLORATION ? 'active' : ''}" data-cat="${LogCategory.EXPLORATION}">Exploración</button>
            <button class="log-tab ${this.activeFilter === LogCategory.INVENTORY ? 'active' : ''}" data-cat="${LogCategory.INVENTORY}">Inventario</button>
            <button class="log-tab ${this.activeFilter === LogCategory.DEBUG ? 'active' : ''}" data-cat="${LogCategory.DEBUG}">Debug</button>
          </div>

          <!-- Lista de entradas de log -->
          <div class="log-entries-list" id="logEntriesList">
            <!-- Renderizado dinámico -->
          </div>
        </div>
      </div>
    `;

    this.renderLogs();
    this.bindEvents();
  }

  renderLogs() {
    const list = this.container.querySelector('#logEntriesList');
    if (!list) return;

    const entries = logger.getLogs(this.activeFilter);
    if (entries.length === 0) {
      list.innerHTML = '<div class="empty-logs">No hay eventos registrados en esta categoría.</div>';
      return;
    }

    list.innerHTML = entries.map(e => `
      <div class="log-entry-row ${e.category.toLowerCase()}">
        <span class="log-time">${e.timestamp}</span>
        <span class="log-cat">[${e.category}]</span>
        <span class="log-msg">${e.message}</span>
      </div>
    `).join('');
  }

  bindEvents() {
    const btnToggle = this.container.querySelector('#btnToggleLog');
    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        this.isOpen = !this.isOpen;
        this.container.querySelector('.log-panel-drawer').classList.toggle('open', this.isOpen);
        if (this.isOpen) this.renderLogs();
      });
    }

    const btnClose = this.container.querySelector('#btnCloseLog');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.isOpen = false;
        this.container.querySelector('.log-panel-drawer').classList.remove('open');
      });
    }

    const btnClear = this.container.querySelector('#btnClearLog');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        logger.clear();
        this.renderLogs();
      });
    }

    this.container.querySelectorAll('.log-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.activeFilter = e.currentTarget.dataset.cat;
        this.container.querySelectorAll('.log-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.renderLogs();
      });
    });
  }
}




// --- FILE: iron_helm_game/js/ui/debugConsole.js ---

/**
 * IRON HELM - Consola y Panel de Depuración (Debug & Cheat Console)
 * Herramienta para realizar pruebas rápidas, activar trucos, forzar encuentros y diagnosticar bugs.
 */
class DebugConsoleView {
  constructor(container) {
    this.container = container;
    this.isOpen = false;
  }

  render() {
    const isGod = gameState.debug.godMode;
    const hero = gameState.hero;

    this.container.innerHTML = `
      <div class="debug-floating-container ${this.isOpen ? 'open' : ''}">
        <button class="btn-debug-pill" id="btnToggleDebug" title="Consola de Debug y Trampas">
          🐞 DEBUG
        </button>

        <div class="debug-panel-card">
          <div class="debug-header">
            <h3>Consola de Debugging</h3>
            <button class="btn-close-debug" id="btnCloseDebug">✕</button>
          </div>

          <div class="debug-sections-grid">
            <!-- TRUCOS DIRECTOS DEL HÉROE -->
            <div class="debug-group">
              <span class="debug-group-title">Modificadores de Héroe</span>
              <div class="debug-btn-row">
                <button class="btn-dbg" data-action="addHp" data-val="5">+5 Salud</button>
                <button class="btn-dbg" data-action="addHp" data-val="-5">-5 Salud</button>
                <button class="btn-dbg" data-action="addEnergy" data-val="5">+5 Energía</button>
                <button class="btn-dbg" data-action="addGold" data-val="5">+5 Oro</button>
                <button class="btn-dbg" data-action="addRations" data-val="2">+2 Raciones</button>
                <button class="btn-dbg" data-action="addPoison" data-val="1">+1 Veneno</button>
                <button class="btn-dbg" data-action="clearPoison">Curar Veneno</button>
                <button class="btn-dbg" data-action="addBlessing">+1 Bendición</button>
              </div>
              <div class="godmode-toggle-row">
                <label class="toggle-switch-label">
                  <input type="checkbox" id="chkGodMode" ${isGod ? 'checked' : ''} />
                  <span>Modo Dios (Invulnerabilidad y Energía)</span>
                </label>
              </div>
            </div>

            <!-- SPAWNERS Y CONTROL DE MAZMORRA -->
            <div class="debug-group">
              <span class="debug-group-title">Control de Mazmorra y Encuentros</span>
              <div class="debug-btn-row">
                <button class="btn-dbg primary" data-action="triggerBoss">👑 Despertar Jefe Final</button>
                <button class="btn-dbg" data-action="nextFloor">🪜 Siguiente Piso (+1)</button>
                <button class="btn-dbg" data-action="openShop">🏪 Abrir Mercader</button>
                <button class="btn-dbg" data-action="drawLoot">🎁 Robar Botín</button>
                <button class="btn-dbg" data-action="drawPotion">🧪 Robar Poción</button>
                <button class="btn-dbg danger" data-action="killEnemy">💀 Matar Enemigo Actual</button>
              </div>

              <div class="spawn-enemy-box">
                <label>Generar Enemigo Específico:</label>
                <div class="select-spawn-row">
                  <select id="selEnemySpawn">
                    ${ENEMIES.map(e => `<option value="${e.id}">${e.name} (HP: ${e.health})</option>`).join('')}
                  </select>
                  <button class="btn-dbg" id="btnSpawnEnemy">Luchar</button>
                </div>
              </div>
            </div>

            <!-- INSPECTOR DE MAZOS -->
            <div class="debug-group">
              <span class="debug-group-title">Inspector de Mazmorra</span>
              <div class="inspector-summary">
                Cartas restantes en mazo de mazmorra: <strong>${gameState.dungeonEngine.deck.length}</strong>
              </div>
              <div class="upcoming-cards-preview">
                ${gameState.dungeonEngine.deck.slice(-3).reverse().map(c => `
                  <span class="preview-badge">${c.name} (${c.code})</span>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const btnToggle = this.container.querySelector('#btnToggleDebug');
    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        this.isOpen = !this.isOpen;
        this.container.querySelector('.debug-floating-container').classList.toggle('open', this.isOpen);
      });
    }

    const btnClose = this.container.querySelector('#btnCloseDebug');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.isOpen = false;
        this.container.querySelector('.debug-floating-container').classList.remove('open');
      });
    }

    // Botones de acción debug
    this.container.querySelectorAll('.btn-dbg[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const act = e.currentTarget.dataset.action;
        const val = parseInt(e.currentTarget.dataset.val || '0', 10);

        if (act === 'addHp') gameState.cheatAddHp(val);
        else if (act === 'addEnergy') gameState.cheatAddEnergy(val);
        else if (act === 'addGold') gameState.cheatAddGold(val);
        else if (act === 'addRations') gameState.cheatAddRations(val);
        else if (act === 'addPoison') gameState.cheatAddPoison(val);
        else if (act === 'clearPoison') {
          if (gameState.hero) {
            gameState.hero.poison = 0;
            logger.debug('[CHEAT] Veneno eliminado.');
            gameState.notify();
          }
        }
        else if (act === 'addBlessing') {
          if (gameState.hero) {
            gameState.hero.blessings += 1;
            logger.debug('[CHEAT] Bendición añadida.');
            gameState.notify();
          }
        }
        else if (act === 'triggerBoss') gameState.cheatTriggerBoss();
        else if (act === 'nextFloor') gameState.cheatNextFloor();
        else if (act === 'openShop') gameState.openMerchant();
        else if (act === 'drawLoot') gameState.drawLoot();
        else if (act === 'drawPotion') gameState.drawPotion();
        else if (act === 'killEnemy') gameState.cheatKillCurrentEnemy();
      });
    });

    // Checkbox Modo Dios
    const chkGod = this.container.querySelector('#chkGodMode');
    if (chkGod) {
      chkGod.addEventListener('change', (e) => {
        gameState.cheatToggleGodMode();
      });
    }

    // Spawn enemigo específico
    const btnSpawn = this.container.querySelector('#btnSpawnEnemy');
    if (btnSpawn) {
      btnSpawn.addEventListener('click', () => {
        const sel = this.container.querySelector('#selEnemySpawn');
        const enemy = gameState.getEnemyById(sel.value);
        if (enemy) {
          gameState.combatEngine.startCombat(enemy, { ambushType: 'NORMAL' });
          gameState.setStatus('COMBAT');
        }
      });
    }
  }
}




// --- FILE: iron_helm_game/js/ui/cardModal.js ---

/**
 * IRON HELM - Modal de Zoom de Cartas en Alta Resolución
 */
class CardModalView {
  constructor(container) {
    this.container = container;
    this.currentSrc = null;

    window.openCardModal = (src) => {
      this.open(src);
    };
  }

  open(src) {
    this.currentSrc = src;
    this.render();
  }

  close() {
    this.currentSrc = null;
    this.container.innerHTML = '';
  }

  render() {
    if (!this.currentSrc) return;

    this.container.innerHTML = `
      <div class="card-zoom-overlay" id="zoomOverlay">
        <div class="card-zoom-wrapper">
          <img src="${this.currentSrc}" alt="Carta en Detalle" class="zoomed-card-img" />
          <button class="btn-close-zoom" id="btnCloseZoom">✕ Cerrar</button>
        </div>
      </div>
    `;

    const overlay = this.container.querySelector('#zoomOverlay');
    const btnClose = this.container.querySelector('#btnCloseZoom');

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.close();
      });
    }
    if (btnClose) {
      btnClose.addEventListener('click', () => this.close());
    }
  }
}




// --- FILE: iron_helm_game/js/ui/endGameModal.js ---

/**
 * IRON HELM - Pantalla de Fin de Partida (Victoria / Derrota y Jubilación)
 */
class EndGameModalView {
  constructor(container) {
    this.container = container;
  }

  render() {
    const isVictory = gameState.status === 'VICTORY';
    const isGameOver = gameState.status === 'GAMEOVER';
    if (!isVictory && !isGameOver) {
      this.container.innerHTML = '';
      return;
    }

    const hero = gameState.hero;
    const res = isVictory ? gameState.finalResults : null;

    this.container.innerHTML = `
      <div class="endgame-overlay">
        <div class="endgame-card-box ${isVictory ? 'victory' : 'defeat'}">
          <div class="endgame-banner">
            ${isVictory ? '🏆 ¡VICTORIA ÉPICA EN IRON HELM!' : '💀 HAS CAÍDO EN LA MAZMORRA'}
          </div>

          <div class="endgame-content">
            ${isVictory ? `
              <h2 class="retirement-title">Rango de Jubilación: ${res.retirement}</h2>
              <p class="retirement-desc">"${res.retirementDesc}"</p>

              <div class="score-breakdown-card">
                <h3>Desglose Oficial de Puntuación:</h3>
                <div class="score-row">
                  <span>Salud y Energía Restantes:</span>
                  <strong>+${hero.hp + hero.energy} pts</strong>
                </div>
                <div class="score-row">
                  <span>Riqueza en Oro (${hero.gold} x 3 pts):</span>
                  <strong>+${hero.gold * 3} pts</strong>
                </div>
                <div class="score-row">
                  <span>Enemigos Vencidos en Cementerio (${gameState.graveyard.length} x 2 pts):</span>
                  <strong>+${gameState.graveyard.length * 2} pts</strong>
                </div>
                <div class="score-row">
                  <span>Nivel de Mazmorra (${gameState.dungeon.currentLevel} x 2 pts):</span>
                  <strong>+${gameState.dungeon.currentLevel * 2} pts</strong>
                </div>
                <div class="score-row">
                  <span>Control de Moral:</span>
                  <strong>${hero.morale >= 0 ? '+' : ''}${hero.morale} pts</strong>
                </div>
                <div class="score-total-row">
                  <span>PUNTUACIÓN TOTAL:</span>
                  <span class="total-pts">${res.score} PTS</span>
                </div>
              </div>
            ` : `
              <div class="defeat-message">
                <p>Tu cuerpo se une al de los cientos de aventureros que perecieron antes que tú en estas catacumbas.</p>
                <div class="defeat-cause">Causa de muerte: <strong>${gameState.gameOverReason}</strong></div>
              </div>
            `}
          </div>

          <div class="endgame-footer">
            <button class="btn-action primary" id="btnRestart">
              🔄 Volver al Menú Principal
            </button>
          </div>
        </div>
      </div>
    `;

    const btnRestart = this.container.querySelector('#btnRestart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        soundManager.playCardFlip();
        gameState.setStatus('CONFIG');
      });
    }
  }
}




// --- FILE: iron_helm_game/js/ui/tabletopBoardView.js ---

/**
 * IRON HELM DIGITAL - Zona de Juego Tabletop Cómoda y Envolvente (V7)
 * - Sin efectos 3D forzados (vista cenital limpia, ordenada y ergonómica).
 * - Ocupa el 100% de la pantalla sin scroll vertical (todo a la vista).
 * - El Mazo de Mazmorra se sitúa EN EL CENTRO junto a las dos cartas del turno.
 * - Todos los elementos responden a los clics con total fiabilidad y feedback de audio.
 */
class TabletopBoardView {
  constructor(container) {
    this.container = container;
    this.energySpent = 1;
    this.combatAnimState = 'IDLE'; // IDLE, ROLLING, SLASH, HIT, ENEMY_LUNGE
    this.lastDamageNumber = null;
    this.showingHandbookModal = false;
    this.showingGraveyardModal = false;
  }

  // Compatibilidad hacia atrás
  getLevelPawnPosition(level) {
    return { x: (level || 1) * 20, y: 50 };
  }

  getTurnPawnPosition(turn) {
    return { x: (turn || 1) * 12, y: 50 };
  }

  render() {
    if (!this.container) return;
    const hero = gameState.hero;
    if (!hero) return;

    const dungeonDeck = gameState.dungeonEngine?.deck || [];
    const enemyDeck = gameState.enemyDeck || [];
    const lootDeck = gameState.lootDeck || [];
    const potionDeck = gameState.potionDeck || [];
    const plotDeck = gameState.plotDeck || [];
    const graveyard = gameState.graveyard || [];
    const equipped = gameState.character?.equipped || hero.equipped || {};
    const backpack = gameState.character?.backpack || hero.backpack || [];
    const currentWeight = gameState.inventoryEngine?.calculateTotalEncumbrance?.() || 0;

    const currentLevel = gameState.dungeon?.currentLevel || 1;
    const turnNumber = gameState.dungeonEngine?.turnNumber || 1;
    const currentPair = gameState.dungeonEngine?.currentPair || { card1: null, card2: null };
    const revealedCard1 = !!gameState.dungeonEngine?.card1Revealed;
    const revealedCard2 = !!gameState.dungeonEngine?.card2Revealed;
    const totalEyes = gameState.plots?.totalEyes || 0;
    const morale = hero.morale || 0;

    this.container.innerHTML = `
      <div class="dungeon-board-viewport ${this.combatAnimState === 'SLASH' ? 'screen-shake-anim' : ''}">
        
        <!-- ========================================================
             TIER 1: BARRA SUPERIOR Y SUMINISTROS (TRACKERS & MAZOS)
             ======================================================== -->
        <header class="board-top-tier">
          
          <!-- Lado Izquierdo: Seguimiento de Piso, Turno, Ojos y Moral -->
          <div class="top-trackers-strip">
            
            <div class="track-group">
              <span class="track-label">PISO:</span>
              <div class="track-nodes">
                ${[1, 2, 3, 4, 5].map(lvl => `
                  <div class="t-node ${lvl === currentLevel ? 'active' : ''}" title="Piso ${lvl}">
                    ${lvl === currentLevel ? '<span class="red-pawn-dot">🔴</span>' : lvl}
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="track-group">
              <span class="track-label">TURNO:</span>
              <div class="track-nodes">
                ${[1, 2, 3, 4, 5, 6, 7, 8].map(trn => `
                  <div class="t-node ${trn === turnNumber ? 'active' : ''}" title="Turno ${trn}">
                    ${trn === turnNumber ? '<span class="red-pawn-dot">🔴</span>' : trn}
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="track-counters">
              <span class="counter-chip" title="Ojos del Jefe">👁️ ${totalEyes}/10</span>
              <span class="counter-chip" title="Moral del Héroe">⚖️ Moral ${morale >= 0 ? '+' : ''}${morale}</span>
            </div>

          </div>

          <!-- Lado Derecho: Mazos de Suministro y Manual -->
          <div class="top-supply-strip">
            
            <!-- Mazo Enemigos -->
            <div class="supply-deck-card" id="deckEnemies" title="Mazo de Enemigos (${enemyDeck.length} cartas)">
              <img src="assets/cards/card_back_enemies.jpg" class="supply-img" alt="Enemigos">
              <span class="supply-badge">${enemyDeck.length}</span>
              <span class="supply-tag">ENEMIGOS</span>
            </div>

            <!-- Mazo Botín -->
            <div class="supply-deck-card" id="deckLoot" title="Mazo de Botín (${lootDeck.length} cartas)">
              <img src="assets/cards/card_back_loot.jpg" class="supply-img" alt="Botín">
              <span class="supply-badge">${lootDeck.length}</span>
              <span class="supply-tag">BOTÍN</span>
            </div>

            <!-- Mazo Tramas -->
            <div class="supply-deck-card" id="deckPlots" title="Mazo de Tramas (${plotDeck.length} cartas)">
              <img src="assets/cards/card_back_plots.jpg" class="supply-img" alt="Tramas">
              <span class="supply-badge">${plotDeck.length}</span>
              <span class="supply-tag">TRAMAS</span>
            </div>

            <!-- Mazo Pociones -->
            <div class="supply-deck-card" id="deckPotions" title="Mazo de Pociones (${potionDeck.length} cartas)">
              <img src="assets/cards/card_back_potions.jpg" class="supply-img" alt="Pociones">
              <span class="supply-badge">${potionDeck.length}</span>
              <span class="supply-tag">POCIONES</span>
            </div>

            <!-- Manual de Reglas -->
            <div class="supply-deck-card handbook-card" id="deckHandbook" title="Abrir Manual de Reglas Oficial">
              <img src="assets/cards/card_handbook.jpg" class="supply-img" alt="Manual">
              <span class="supply-tag">MANUAL</span>
            </div>

            <!-- Controles de Audio y Menú -->
            <div class="top-system-btns">
              <button class="sys-btn" id="btnToggleSound" title="Sonido">${soundManager.muted ? '🔇' : '🔊'}</button>
              <button class="sys-btn" id="btnToggleLog" title="Historial">📜</button>
              <button class="sys-btn danger" id="btnAbandonGame" title="Salir al Menú">⚙️</button>
            </div>

          </div>

        </header>

        <!-- ========================================================
             TIER 2: ZONA CENTRAL DE MAZMORRA Y ENCUENTROS
             "las mazmorras en medio junto a donde se levantan las tarjetas"
             ======================================================== -->
        <main class="board-dungeon-center-tier">
          ${this.renderCentralEncounter(dungeonDeck, currentPair, revealedCard1, revealedCard2)}
        </main>

        <!-- ========================================================
             TIER 3: TABLERO DEL JUGADOR (FICHAS, HÉROE, EQUIPO Y MOCHILA)
             ======================================================== -->
        <footer class="board-player-bottom-tier">
          
          <!-- Fichas Físicas de Madera/Cartón -->
          <div class="player-tokens-tray">
            <div class="token-tray-cell" title="Salud del Héroe">
              ${renderTokenPile({ type: 'salud', image: 'assets/tokens/token_salud.png', count: hero.hp, maxCount: hero.maxHp, label: 'Salud', size: 36 })}
              <span class="token-val-txt">${hero.hp}/${hero.maxHp} HP</span>
            </div>
            <div class="token-tray-cell" title="Energía del Héroe">
              ${renderTokenPile({ type: 'energia', image: 'assets/tokens/token_energia.png', count: hero.energy, maxCount: hero.maxEnergy, label: 'Energía', size: 36 })}
              <span class="token-val-txt">${hero.energy}/${hero.maxEnergy} EN</span>
            </div>
            <div class="token-tray-cell" title="Monedas de Oro">
              ${renderTokenPile({ type: 'oro', image: 'assets/tokens/token_oro.png', count: hero.gold, label: 'Oro', size: 36 })}
              <span class="token-val-txt">${hero.gold} Oro</span>
            </div>
            <div class="token-tray-cell" title="Raciones de Comida">
              ${renderTokenPile({ type: 'racion', image: 'assets/tokens/token_racion.png', count: hero.rations, label: 'Raciones', size: 36 })}
              <span class="token-val-txt">${hero.rations} Raciones</span>
            </div>
            ${hero.poison > 0 ? `
              <div class="token-tray-cell poison" title="Veneno">
                ${renderTokenPile({ type: 'veneno', image: 'assets/tokens/token_veneno.png', count: hero.poison, label: 'Veneno', size: 36 })}
                <span class="token-val-txt">${hero.poison} Veneno</span>
              </div>
            ` : ''}
            ${hero.blessings > 0 ? `
              <div class="token-tray-cell blessing" title="Bendición">
                ${renderTokenPile({ type: 'bendicion', image: 'assets/tokens/token_bendicion.png', count: hero.blessings, label: 'Bendición', size: 36 })}
                <span class="token-val-txt">${hero.blessings} Bendición</span>
              </div>
            ` : ''}
          </div>

          <!-- Carta del Héroe y Habilidad -->
          <div class="player-hero-compartment">
            <div class="hero-card-frame">
              <img src="${hero.image || 'assets/cards/base/card_000.jpg'}" class="hero-card-pic" alt="${hero.name}">
              <div class="hero-name-banner">${hero.name}</div>
            </div>
            <div class="hero-skill-strip" title="${hero.skill || ''}">
              <span>⚡ ${hero.skill || 'Habilidad'} (${hero.domain || 'BÁSICO'})</span>
            </div>
          </div>

          <!-- Ranuras de Equipo Desplegadas con Cartas Reales -->
          <div class="player-equipment-strip">
            
            <div class="equip-slot-cell" id="slotMP">
              <span class="slot-title">MANO DERECHA</span>
              ${this.renderEquippedCard(equipped.MP, 'Mano Principal', '🗡️')}
            </div>

            <div class="equip-slot-cell" id="slotOM">
              <span class="slot-title">MANO IZQUIERDA</span>
              ${this.renderEquippedCard(equipped.OM, 'Otra Mano', '🛡️')}
            </div>

            <div class="equip-slot-cell" id="slotCP">
              <span class="slot-title">ARMADURA</span>
              ${this.renderEquippedCard(equipped.CP, 'Ropajes / Armadura', '🥋')}
            </div>

            <div class="equip-slot-cell" id="slotCA">
              <span class="slot-title">CABEZA</span>
              ${this.renderEquippedCard(equipped.CA, 'Casco / Yelmo', '🪖')}
            </div>

            <div class="equip-slot-cell" id="slotAC">
              <span class="slot-title">ACCESORIO</span>
              ${this.renderEquippedCard(equipped.AC, 'Accesorio / Amuleto', '💍')}
            </div>

          </div>

          <!-- Cementerio de Monstruos -->
          <div class="player-graveyard-cell" id="btnOpenGraveyard" title="Ver Cementerio">
            <div class="graveyard-card-pile">
              ${graveyard.length > 0 ? `
                <img src="${graveyard[graveyard.length - 1].image || 'assets/cards/card_back_enemies.jpg'}" class="graveyard-img" alt="Enemigos">
              ` : `
                <div class="graveyard-empty-slot">💀</div>
              `}
              <span class="graveyard-num-badge">${graveyard.length}</span>
            </div>
            <span class="slot-title">CEMENTERIO</span>
          </div>

          <!-- Botón de Mochila / Mano de Cartas en Abanico -->
          <button class="player-backpack-drawer-btn" id="btnToggleBackpack">
            <span>🎒 Mochila (${backpack.length} cartas · ${currentWeight}/${hero.encumbranceMax} Carga)</span>
            <span class="backpack-btn-arrow">▲ Abrir Abanico</span>
          </button>

        </footer>

        <!-- MODALES DE REGLAS Y CEMENTERIO -->
        ${this.showingHandbookModal ? this.renderHandbookModal() : ''}
        ${this.showingGraveyardModal ? this.renderGraveyardModal(graveyard) : ''}

      </div>
    `;

    this.bindEvents();
  }

  // Render del centro: MAZO DE MAZMORRA JUNTO A LAS CARTAS DEL TURNO
  renderCentralEncounter(dungeonDeck, currentPair, revealedCard1, revealedCard2) {
    // Si estamos en combate:
    if (gameState.status === 'COMBAT' && gameState.combatEngine?.combatState) {
      return this.renderCombatArena();
    }

    const c1 = currentPair.card1;
    const c2 = currentPair.card2;
    const hasDrawn = !!c1;

    return `
      <div class="dungeon-trio-workbench">
        
        <!-- 1. EL MAZO DE MAZMORRA (EN MEDIO JUNTO A LAS CARTAS) -->
        <div class="dungeon-deck-unit ${!hasDrawn ? 'ready-to-draw-glow' : ''}" id="deckDungeon" title="Mazo de Mazmorra (${dungeonDeck.length} cartas restantes)">
          <div class="deck-card-box">
            <img src="assets/cards/card_back_dungeon.jpg" class="deck-card-cover" alt="Mazo de Mazmorra">
            <span class="deck-count-pill">${dungeonDeck.length}</span>
          </div>
          <button class="deck-draw-action-btn" id="btnDirectDraw">
            ${hasDrawn ? 'MAZMORRA' : '👈 ROBAR 2 CARTAS'}
          </button>
        </div>

        <!-- 2. HUECO / CARTA 1 -->
        <div class="exploration-card-slot" id="slotCard1">
          ${!hasDrawn ? `
            <div class="empty-bay-placeholder" id="bayPlaceholder1" title="Haz clic para robar turno">
              <span class="bay-roman">I</span>
              <span class="bay-label">CARTA 1</span>
              <span class="bay-sub">Toca para robar</span>
            </div>
          ` : `
            <div class="table-card-item ${revealedCard1 ? 'revealed' : 'facedown'}" id="tableCard1">
              ${!revealedCard1 ? `
                <div class="card-facedown-view">
                  <img src="assets/cards/card_back_dungeon.jpg" alt="Carta 1 Oculta">
                  <button class="action-wax-seal" id="btnFlipCard1">
                    👆 VOLTEAR CARTA 1
                  </button>
                </div>
              ` : `
                <div class="card-revealed-view">
                  <img src="${c1.image || 'assets/cards/card_back_dungeon.jpg'}" alt="${c1.name}">
                  <div class="card-action-overlay">
                    <button class="card-resolve-btn accept" id="btnAcceptCard1">
                      ⚔️ RESOLVER OPCIÓN 1
                    </button>
                  </div>
                </div>
              `}
            </div>
          `}
        </div>

        <!-- 3. HUECO / CARTA 2 -->
        <div class="exploration-card-slot" id="slotCard2">
          ${!hasDrawn ? `
            <div class="empty-bay-placeholder" id="bayPlaceholder2" title="Haz clic para robar turno">
              <span class="bay-roman">II</span>
              <span class="bay-label">CARTA 2</span>
              <span class="bay-sub">Toca para robar</span>
            </div>
          ` : `
            <div class="table-card-item ${revealedCard2 ? 'revealed' : 'facedown'}" id="tableCard2">
              ${!revealedCard2 ? `
                <div class="card-facedown-view">
                  <img src="assets/cards/card_back_dungeon.jpg" alt="Carta 2 Oculta">
                  ${revealedCard1 ? `
                    <button class="action-wax-seal reject" id="btnRejectCard1">
                      🚪 RECHAZAR C1 Y PASAR A C2
                    </button>
                  ` : `
                    <div class="action-wax-seal locked">
                      🔒 CARTA 2 CERRADA
                    </div>
                  `}
                </div>
              ` : `
                <div class="card-revealed-view">
                  <img src="${c2?.image || 'assets/cards/card_back_dungeon.jpg'}" alt="${c2?.name}">
                  <div class="card-action-overlay">
                    <button class="card-resolve-btn mandatory" id="btnResolveCard2">
                      ⚠️ RESOLVER OPCIÓN 2 OBLIGATORIA
                    </button>
                  </div>
                </div>
              `}
            </div>
          `}
        </div>

      </div>
    `;
  }

  // Render del Combate en la Mesa
  renderCombatArena() {
    const combat = gameState.combatEngine.combatState;
    if (!combat) return '';

    const enemy = combat.enemy;
    const hero = gameState.hero;
    const isRolling = this.combatAnimState === 'ROLLING';
    const isEnemyTurn = combat.phase === 'ENEMY_ATTACK';

    return `
      <div class="combat-workbench-grid ${this.combatAnimState === 'HIT' ? 'monster-hit' : ''}">
        
        <!-- Enemigo -->
        <div class="combat-enemy-column ${this.combatAnimState === 'ENEMY_LUNGE' ? 'monster-lunge' : ''}">
          <div class="combat-enemy-card-wrap">
            <img src="${enemy.image || 'assets/cards/card_back_enemies.jpg'}" class="combat-enemy-img" alt="${enemy.name}">
            
            ${this.combatAnimState === 'SLASH' ? '<div class="sword-slash-fx"></div>' : ''}
            ${this.lastDamageNumber !== null ? `
              <div class="floating-damage-number">${this.lastDamageNumber}</div>
            ` : ''}

            <div class="combat-enemy-hp-strip">
              <div class="enemy-hp-bar">
                <div class="enemy-hp-fill" style="width: ${(combat.enemyHp / combat.enemyMaxHp) * 100}%;"></div>
                <span class="enemy-hp-text">${combat.enemyHp} / ${combat.enemyMaxHp} HP</span>
              </div>
              <div class="enemy-stats-row">
                <span>⚔️ Atq: +${enemy.attackInitial || 0}</span>
                <span>🛡️ Contra: +${enemy.attackCounter || 0}</span>
                <span>⭐ XP: +${enemy.xp || 1}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bandeja de Dados y Controles de Ataque -->
        <div class="combat-controls-column">
          
          <div class="combat-dice-tray-box ${isRolling ? 'is-rolling-shake' : ''}" id="combatDiceTray" title="Toca para rodar dados">
            ${Dice3DManager.renderDiceMarkup(combat.diceRolls || [3, 5], isRolling)}
          </div>

          <div class="combat-action-pod">
            ${isEnemyTurn ? `
              <div class="enemy-attack-alert">
                <span>⚠️ ${enemy.name} está atacando...</span>
                <button class="combat-btn continue" id="btnContinueEnemyAttack">Continuar Combate</button>
              </div>
            ` : `
              <div class="player-strike-form">
                <div class="energy-stepper-ctrl">
                  <button class="step-btn" id="btnDecEnergy" ${this.energySpent <= 1 ? 'disabled' : ''}>-</button>
                  <span class="step-num">⚡ ${this.energySpent} EN (${this.energySpent}d6)</span>
                  <button class="step-btn" id="btnIncEnergy" ${this.energySpent >= Math.min(3, hero.energy) ? 'disabled' : ''}>+</button>
                </div>
                <button class="combat-btn strike" id="btnExecuteAttack" ${hero.energy < this.energySpent ? 'disabled' : ''}>
                  ⚔️ LANZAR ATAQUE (${this.energySpent}d6)
                </button>
              </div>
            `}
          </div>

        </div>

      </div>
    `;
  }

  // Render de cartas de equipo
  renderEquippedCard(card, slotName, defaultIcon) {
    if (!card) {
      return `
        <div class="empty-slot-well" title="${slotName} vacío">
          <span class="well-icon">${defaultIcon}</span>
          <span class="well-name">${slotName}</span>
        </div>
      `;
    }

    return `
      <div class="equipped-card-view" title="${card.name} - ${card.description || ''}">
        <img src="${card.image || 'assets/cards/base/card_068.jpg'}" class="equipped-card-art" alt="${card.name}">
        <div class="equipped-card-bar">
          <span class="equipped-card-name">${card.name}</span>
          <button class="btn-slot-unequip" data-slot="${card.slot}" title="Desequipar a mochila">✕</button>
        </div>
      </div>
    `;
  }

  // Modal de Manual
  renderHandbookModal() {
    return `
      <div class="tabletop-overlay-backdrop" id="handbookModalBackdrop">
        <div class="tabletop-dialog-window">
          <div class="dialog-window-header">
            <h3>📖 IRON HELM - MANUAL DE REGLAS OFICIAL</h3>
            <button class="dialog-close-btn" id="btnCloseHandbook">✕</button>
          </div>
          <div class="dialog-window-body">
            <h4>1. Flujo del Turno de Exploración:</h4>
            <p>Cada piso de mazmorra consta de <strong>8 turnos</strong> (16 cartas de mazmorra):</p>
            <ul>
              <li><strong>Paso 1:</strong> Toca el Mazo de Mazmorra en el centro para repartir las 2 cartas del turno.</li>
              <li><strong>Paso 2:</strong> Voltea la Carta 1 tocándola. Puedes resolverla (Opción 1) o descartarla.</li>
              <li><strong>Paso 3:</strong> Si descartas la Carta 1, debes voltear la Carta 2 y resolver obligatoriamente su Opción 2.</li>
            </ul>
            <h4>2. Combate Físico con Dados:</h4>
            <ul>
              <li>El daño se calcula tirando dados y restando el valor menor del mayor.</li>
              <li><strong>¡Dobles significa Fallo Absoluto!</strong> Si sacas dobles, no infliges daño.</li>
              <li>Tu armadura reduce directamente el daño inicial recibido.</li>
            </ul>
            <h4>3. Fin de Nivel:</h4>
            <ul>
              <li>Al agotar las 16 cartas, consumes 1 Ración de comida (o sufres 2 de daño).</li>
              <li>El veneno causa daño según tus puntos de veneno.</li>
              <li>Avanzas al siguiente piso en el marcador de niveles.</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  // Modal del Cementerio
  renderGraveyardModal(graveyard) {
    return `
      <div class="tabletop-overlay-backdrop" id="graveyardModalBackdrop">
        <div class="tabletop-dialog-window">
          <div class="dialog-window-header">
            <h3>💀 CEMENTERIO (${graveyard.length} Enemigos Vencidos)</h3>
            <button class="dialog-close-btn" id="btnCloseGraveyard">✕</button>
          </div>
          <div class="dialog-window-body graveyard-entries">
            ${graveyard.length === 0 ? '<p>No has derrotado a ningún monstruo todavía.</p>' : ''}
            ${graveyard.map(m => `
              <div class="graveyard-card-row">
                <img src="${m.image || 'assets/cards/card_back_enemies.jpg'}" class="graveyard-card-thumb" alt="${m.name}">
                <div class="graveyard-meta">
                  <strong>${m.name}</strong>
                  <span>Recompensa: +${m.xp || 1} XP · +${m.gold || 0} Oro</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Helper de robo de cartas
    const doDraw = () => {
      if (gameState.status === 'EXPLORATION' && !gameState.dungeonEngine?.currentPair?.card1) {
        soundManager.playCardDeal();
        gameState.dungeonEngine.drawExplorationPair();
        gameState.notify();
      }
    };

    // 1. Clic en el Mazo de Mazmorra central o en el botón de robo
    const deckDungeon = this.container.querySelector('#deckDungeon');
    if (deckDungeon) deckDungeon.addEventListener('click', doDraw);

    const btnDirectDraw = this.container.querySelector('#btnDirectDraw');
    if (btnDirectDraw) btnDirectDraw.addEventListener('click', (e) => { e.stopPropagation(); doDraw(); });

    const p1 = this.container.querySelector('#bayPlaceholder1');
    if (p1) p1.addEventListener('click', doDraw);

    const p2 = this.container.querySelector('#bayPlaceholder2');
    if (p2) p2.addEventListener('click', doDraw);

    // 2. Voltear Carta 1
    const btnFlip1 = this.container.querySelector('#btnFlipCard1');
    const tableC1 = this.container.querySelector('#tableCard1');
    const doFlip1 = () => {
      if (!gameState.dungeonEngine?.card1Revealed) {
        soundManager.playCardFlip();
        gameState.dungeonEngine.revealCard1();
        gameState.notify();
      }
    };
    if (btnFlip1) btnFlip1.addEventListener('click', (e) => { e.stopPropagation(); doFlip1(); });
    if (tableC1 && !gameState.dungeonEngine?.card1Revealed) tableC1.addEventListener('click', doFlip1);

    // 3. Aceptar Carta 1
    const btnAccept1 = this.container.querySelector('#btnAcceptCard1');
    if (btnAccept1) {
      btnAccept1.addEventListener('click', (e) => {
        e.stopPropagation();
        soundManager.playCardFlip();
        gameState.dungeonEngine.acceptCard1();
        gameState.notify();
      });
    }

    // 4. Rechazar Carta 1 y revelar Carta 2
    const btnReject1 = this.container.querySelector('#btnRejectCard1');
    if (btnReject1) {
      btnReject1.addEventListener('click', (e) => {
        e.stopPropagation();
        soundManager.playCardFlip();
        gameState.dungeonEngine.rejectCard1AndRevealCard2();
        gameState.notify();
      });
    }

    // 5. Resolver Carta 2 obligatoria
    const btnResolve2 = this.container.querySelector('#btnResolveCard2');
    if (btnResolve2) {
      btnResolve2.addEventListener('click', (e) => {
        e.stopPropagation();
        soundManager.playCardFlip();
        gameState.dungeonEngine.resolveCard(gameState.dungeonEngine.currentPair.card2, 2);
        gameState.notify();
      });
    }

    // 6. Stepper de Energía en Combate
    const btnDec = this.container.querySelector('#btnDecEnergy');
    const btnInc = this.container.querySelector('#btnIncEnergy');
    if (btnDec) {
      btnDec.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.energySpent > 1) {
          this.energySpent--;
          soundManager.playClick();
          this.render();
        }
      });
    }
    if (btnInc) {
      btnInc.addEventListener('click', (e) => {
        e.stopPropagation();
        const maxEn = Math.min(3, gameState.hero?.energy || 1);
        if (this.energySpent < maxEn) {
          this.energySpent++;
          soundManager.playClick();
          this.render();
        }
      });
    }

    // 7. Lanzar Ataque en Combate
    const btnAtk = this.container.querySelector('#btnExecuteAttack');
    const diceTray = this.container.querySelector('#combatDiceTray');
    const doAttack = () => {
      if (gameState.status !== 'COMBAT' || gameState.combatEngine?.combatState?.phase === 'ENEMY_ATTACK') return;
      this.combatAnimState = 'ROLLING';
      this.render();
      soundManager.playDiceRoll();

      setTimeout(() => {
        this.combatAnimState = 'SLASH';
        soundManager.playSwordHit();
        const outcome = gameState.combatEngine.executePlayerAttack(this.energySpent);
        this.lastDamageNumber = outcome ? `-${outcome.damageDealt} HP` : '-0 HP';
        this.render();

        setTimeout(() => {
          this.combatAnimState = 'HIT';
          this.render();

          setTimeout(() => {
            this.combatAnimState = 'IDLE';
            this.lastDamageNumber = null;
            gameState.notify();
          }, 350);
        }, 200);
      }, 450);
    };

    if (btnAtk) btnAtk.addEventListener('click', (e) => { e.stopPropagation(); doAttack(); });
    if (diceTray && gameState.combatEngine?.combatState?.phase !== 'ENEMY_ATTACK') {
      diceTray.addEventListener('click', (e) => { e.stopPropagation(); doAttack(); });
    }

    // 8. Continuar ataque enemigo si está en espera
    const btnEnemyCont = this.container.querySelector('#btnContinueEnemyAttack');
    if (btnEnemyCont) {
      btnEnemyCont.addEventListener('click', (e) => {
        e.stopPropagation();
        this.combatAnimState = 'ENEMY_LUNGE';
        this.render();
        setTimeout(() => {
          this.combatAnimState = 'IDLE';
          gameState.combatEngine.combatState.phase = 'PLAYER_INPUT';
          gameState.notify();
        }, 250);
      });
    }

    // 9. Desequipar objetos
    this.container.querySelectorAll('.btn-slot-unequip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slot = e.currentTarget.dataset.slot;
        soundManager.playCardFlip();
        gameState.inventoryEngine.unequipItem(slot);
        gameState.notify();
      });
    });

    // 10. Mochila / Mano de cartas
    const btnBackpack = this.container.querySelector('#btnToggleBackpack');
    if (btnBackpack) {
      btnBackpack.addEventListener('click', (e) => {
        e.stopPropagation();
        const fan = document.getElementById('inventoryFanContainer');
        if (fan) fan.classList.toggle('active');
        soundManager.playCardFlip();
      });
    }

    // 11. Modales de Manual y Cementerio
    const btnHandbook = this.container.querySelector('#btnOpenHandbook');
    const deckHandbook = this.container.querySelector('#deckHandbook');
    const openHandbook = () => {
      this.showingHandbookModal = true;
      soundManager.playCardFlip();
      this.render();
    };
    if (btnHandbook) btnHandbook.addEventListener('click', openHandbook);
    if (deckHandbook) deckHandbook.addEventListener('click', openHandbook);

    const btnCloseH = this.container.querySelector('#btnCloseHandbook');
    const backdropH = this.container.querySelector('#handbookModalBackdrop');
    if (btnCloseH) btnCloseH.addEventListener('click', () => { this.showingHandbookModal = false; this.render(); });
    if (backdropH) backdropH.addEventListener('click', (e) => {
      if (e.target === backdropH) { this.showingHandbookModal = false; this.render(); }
    });

    const btnGraveyard = this.container.querySelector('#btnOpenGraveyard');
    if (btnGraveyard) {
      btnGraveyard.addEventListener('click', () => {
        this.showingGraveyardModal = true;
        soundManager.playCardFlip();
        this.render();
      });
    }
    const btnCloseG = this.container.querySelector('#btnCloseGraveyard');
    const backdropG = this.container.querySelector('#graveyardModalBackdrop');
    if (btnCloseG) btnCloseG.addEventListener('click', () => { this.showingGraveyardModal = false; this.render(); });
    if (backdropG) backdropG.addEventListener('click', (e) => {
      if (e.target === backdropG) { this.showingGraveyardModal = false; this.render(); }
    });

    // 12. Atajos y botones de sistema
    const btnSound = this.container.querySelector('#btnToggleSound');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        soundManager.toggleMute();
        this.render();
      });
    }

    const btnLog = this.container.querySelector('#btnToggleLog');
    if (btnLog) {
      btnLog.addEventListener('click', () => {
        const logDrawer = document.querySelector('.log-drawer-container');
        if (logDrawer) logDrawer.classList.toggle('open');
      });
    }

    const btnAbandon = this.container.querySelector('#btnAbandonGame');
    if (btnAbandon) {
      btnAbandon.addEventListener('click', () => {
        if (confirm('¿Deseas abandonar la partida actual y volver a la configuración?')) {
          gameState.setStatus('CONFIG');
        }
      });
    }
  }
}




// --- FILE: iron_helm_game/js/ui/app.js ---

/**
 * IRON HELM DIGITAL - Coordinador Principal de la Aplicación (App Router Tabletop)
 */














class AppController {
  constructor() {
    this.root = document.getElementById('app');
    this.gameState = gameState;

    this.configView = null;
    this.tabletopView = null;
    this.dungeonView = null;
    this.characterView = null;
    this.combatView = null;
    this.interactionView = null;
    this.merchantView = null;
    this.logView = null;
    this.debugView = null;
    this.cardModalView = null;
    this.endGameView = null;
    this.inventoryFanView = null;

    this.init();
  }

  init() {
    this.root.innerHTML = `
      <div id="mainViewContainer"></div>
      <div id="inventoryFanContainer"></div>
      <div id="modalOverlayContainer"></div>
      <div id="logContainer"></div>
      <div id="debugContainer"></div>
      <div id="cardZoomContainer"></div>
    `;

    this.logView = new LogPanelView(document.getElementById('logContainer'));
    this.debugView = new DebugConsoleView(document.getElementById('debugContainer'));
    this.cardModalView = new CardModalView(document.getElementById('cardZoomContainer'));
    this.endGameView = new EndGameModalView(document.getElementById('modalOverlayContainer'));
    this.inventoryFanView = new InventoryFanView(document.getElementById('inventoryFanContainer'));

    gameState.subscribe(() => {
      this.render();
    });

    this.bindKeyboardShortcuts();
    this.render();
  }

  render() {
    const main = document.getElementById('mainViewContainer');
    const modal = document.getElementById('modalOverlayContainer');
    const handContainer = document.getElementById('inventoryFanContainer');

    // 1. Configuración de Partida
    if (gameState.status === 'CONFIG') {
      main.innerHTML = '<div id="configView"></div>';
      modal.innerHTML = '';
      handContainer.innerHTML = '';
      this.tabletopView = null;
      this.dungeonView = null;
      this.characterView = null;
      this.configView = new ConfigMenuView(document.getElementById('configView'));
      this.configView.render();
      this.logView.render();
      this.debugView.render();
      return;
    }

    // 2. Tablero de Juego (Simulador Físico Tabletop de Iron Helm)
    if (!this.tabletopView || !document.getElementById('tabletopBoardMount')) {
      main.innerHTML = `<div id="tabletopBoardMount"></div>`;
      this.tabletopView = new TabletopBoardView(document.getElementById('tabletopBoardMount'));
      // Mantener alias para compatibilidad
      this.dungeonView = this.tabletopView;
      this.characterView = this.tabletopView;
    }

    this.tabletopView.render();
    this.inventoryFanView.render();
    this.logView.render();
    this.debugView.render();

    // 3. Modales Tabletop de Interacción o Comercio (si aplican)
    if (gameState.status === 'CARD_INTERACTION' || gameState.status === 'CARD_CHOICE') {
      modal.innerHTML = '<div id="interactionViewMount"></div>';
      this.interactionView = new CardInteractionModalView(document.getElementById('interactionViewMount'));
      this.interactionView.render();
    } else if (gameState.status === 'MERCHANT') {
      modal.innerHTML = '<div id="merchantViewMount"></div>';
      this.merchantView = new MerchantModalView(document.getElementById('merchantViewMount'));
      this.merchantView.render();
    } else if (gameState.status === 'VICTORY' || gameState.status === 'GAMEOVER') {
      this.endGameView.render();
    } else {
      modal.innerHTML = '';
    }
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // D -> Debug console toggle (discreto para desarrolladores)
      if (e.key === 'd' || e.key === 'D') {
        const container = document.querySelector('.debug-floating-container');
        if (container) {
          container.classList.toggle('visible');
          container.classList.toggle('open');
        }
      }
      // L -> Log drawer toggle
      if (e.key === 'l' || e.key === 'L') {
        const drawer = document.querySelector('.log-panel-drawer');
        if (drawer) {
          drawer.classList.toggle('visible');
          drawer.classList.toggle('open');
        }
      }
      // I o B -> Toggle Abanico de Mochila
      if (e.key === 'i' || e.key === 'I' || e.key === 'b' || e.key === 'B') {
        if (this.inventoryFanView) {
          this.inventoryFanView.toggle();
        }
      }
      // M -> Mute
      if (e.key === 'm' || e.key === 'M') {
        soundManager.toggleMute();
      }
    });
  }
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
  window.ironHelmApp = new AppController();
});





})();
