/**
 * IRON HELM DIGITAL - Abanico de Cartas de Inventario (Hand Fan Tabletop View)
 * Muestra las cartas que el jugador lleva en su mochila y equipo como una mano
 * física de cartas en abanico, con físicas de elevación, giro y selección táctil.
 */

import { gameState } from '../engine/gameState.js';
import { soundManager } from '../utils/audio.js';

export class InventoryFanView {
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
