/**
 * IRON HELM - Motor de Combate (Combat Engine)
 * Implementa las reglas oficiales:
 * 1. Daño Inicial del Enemigo: 2d6 (resta el menor del mayor). Si saca dobles: ¡FALLA POR COMPLETO!
 *    Suma daño base de la carta y modificadores de mazmorra. Resta la armadura del jugador.
 * 2. Ataque del Jugador: Gasta hasta 3 de Energía para lanzar 1d6 a 3d6 (o 1 daño a puño sin gastar energía).
 *    Suma bonificadores de armas y habilidades.
 * 3. Contraataques del Enemigo: Misma fórmula de 2d6.
 */

import { logger } from '../utils/logger.js';
import { soundManager } from '../utils/audio.js';

export class CombatEngine {
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
