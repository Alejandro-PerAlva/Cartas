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

import { DUNGEON_CARDS } from '../data/dungeonCards.js';
import { logger } from '../utils/logger.js';
import { soundManager } from '../utils/audio.js';

export class DungeonEngine {
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
