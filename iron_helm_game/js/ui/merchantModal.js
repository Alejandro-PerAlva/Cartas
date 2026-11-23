/**
 * IRON HELM - Modal del Mercader Errante
 */

import { gameState } from '../engine/gameState.js';
import { soundManager } from '../utils/audio.js';

export class MerchantModalView {
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
