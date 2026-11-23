/**
 * IRON HELM - Modal de Interacción con Cartas de Mazmorra / Trama (Tipo 1)
 */

import { gameState } from '../engine/gameState.js';
import { soundManager } from '../utils/audio.js';

export class CardInteractionModalView {
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
