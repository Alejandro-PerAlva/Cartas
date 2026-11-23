/**
 * IRON HELM - Consola y Panel de Depuración (Debug & Cheat Console)
 * Herramienta para realizar pruebas rápidas, activar trucos, forzar encuentros y diagnosticar bugs.
 */

import { gameState } from '../engine/gameState.js';
import { ENEMIES } from '../data/enemies.js';
import { logger } from '../utils/logger.js';

export class DebugConsoleView {
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
