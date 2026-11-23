/**
 * IRON HELM DIGITAL - Motor de Dados 3D Tabletop Físicos
 * Dados tridimensionales con relieve de madera y puntos dorados
 * que ruedan, botan y se asientan con físicas en la bandeja de dados.
 */

import { soundManager } from '../utils/audio.js';

export class Dice3DManager {
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
