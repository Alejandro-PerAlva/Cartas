/**
 * IRON HELM - Arena de Combate Tabletop Fluida y Animada
 * Con animaciones de impacto, tajo de espada, estocada del monstruo,
 * números de daño flotantes y dados 3D reales.
 */

import { gameState } from '../engine/gameState.js';
import { soundManager } from '../utils/audio.js';
import { Dice3DManager } from './dice3D.js';

export class CombatArenaView {
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
