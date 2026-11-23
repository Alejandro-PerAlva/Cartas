/**
 * IRON HELM - Estado Global del Juego (Game State & Controller)
 * Administra la máquina de estados, suscripciones reactivas a la UI, lógica de guardado y trampas de depuración.
 */

import { CHARACTERS } from '../data/characters.js';
import { BOSSES } from '../data/bosses.js';
import { ENEMIES } from '../data/enemies.js';
import { EQUIPMENT } from '../data/equipment.js';
import { POTIONS } from '../data/potions.js';
import { PLOT_CARDS } from '../data/plots.js';
import { EXPANSIONS } from '../data/expansions.js';

import { InventoryEngine } from './inventoryEngine.js';
import { CombatEngine } from './combatEngine.js';
import { DungeonEngine } from './dungeonEngine.js';
import { logger } from '../utils/logger.js';
import { soundManager } from '../utils/audio.js';

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

export const gameState = new GameState();
