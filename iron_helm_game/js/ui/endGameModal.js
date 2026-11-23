/**
 * IRON HELM - Pantalla de Fin de Partida (Victoria / Derrota y Jubilación)
 */

import { gameState } from '../engine/gameState.js';
import { soundManager } from '../utils/audio.js';

export class EndGameModalView {
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
