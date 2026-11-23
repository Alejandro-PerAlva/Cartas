/**
 * IRON HELM - Vista del Tapete de Personaje Tabletop (Orgánico y Superpuesto)
 * Cartas de equipo en posición vertical superpuestas naturalmente,
 * pilas de fichas físicas sin cajas oscuras y ficha de héroe integrada.
 */

import { gameState } from '../engine/gameState.js';
import { soundManager } from '../utils/audio.js';
import { renderTokenPile } from './tokenPile.js';

export class CharacterMatView {
  constructor(container) {
    this.container = container;
  }

  render() {
    const hero = gameState.hero;
    if (!hero) return;

    const ie = gameState.inventoryEngine;
    const currentWeight = ie.getCurrentWeight();
    const maxWeight = ie.getMaxEncumbrance();
    const isOverburdened = currentWeight > maxWeight;

    // Renderiza una carta de equipo en formato vertical auténtico
    const renderEquippedCard = (slotCode, slotName, defaultIcon, tiltDeg = 0) => {
      const item = hero.equipped[slotCode];
      if (!item) {
        return `
          <div class="tabletop-open-slot empty" data-slot="${slotCode}" title="Ranura ${slotName} (Vacía)">
            <span class="slot-chalk-icon">${defaultIcon}</span>
            <span class="slot-chalk-name">${slotName}</span>
          </div>
        `;
      }

      return `
        <div class="tabletop-open-slot occupied" 
             data-slot="${slotCode}" 
             style="transform: rotate(${tiltDeg}deg);"
             title="${item.name}">
          
          <div class="equipped-card-leaf">
            <img src="${item.image || 'assets/cards/base/card_055.jpg'}" 
                 alt="${item.name}" 
                 class="equipped-card-img zoomable" 
                 data-img="${item.image || 'assets/cards/base/card_055.jpg'}" />

            <div class="equipped-card-badge">
              ${item.attackBonus ? `<span class="stat-tag atk">+${item.attackBonus} ATK</span>` : ''}
              ${item.armorValueInitial ? `<span class="stat-tag def">🛡️ -${item.armorValueInitial}</span>` : ''}
              ${item.encumbranceBonus ? `<span class="stat-tag carry">+${item.encumbranceBonus}</span>` : ''}
            </div>

            ${!item.isTwoHandSlot ? `
              <button class="btn-card-pop-unequip" data-slot="${slotCode}" title="Desequipar carta">✕</button>
            ` : ''}
          </div>

          <span class="equipped-card-caption">${item.name}</span>
        </div>
      `;
    };

    this.container.innerHTML = `
      <div class="char-mat-surface-organic" style="background-image: url('assets/mats/personaje_mat_web.jpg');">
        
        <!-- CABECERA DE HÉROE INTEGRADA (SIN CAJA NEGRA) -->
        <div class="hero-mat-header-direct">
          <!-- CARTA DE HÉROE OFICIAL EN FORMATO VERTICAL REAL -->
          <div class="hero-card-table-anchor" title="${hero.name}">
            <img src="${hero.image}" alt="${hero.name}" class="hero-card-portrait zoomable" data-img="${hero.image}" />
          </div>

          <!-- DETALLES Y CREDENCIALES DEL HÉROE -->
          <div class="hero-bio-plaque">
            <div class="hero-name-gold">${hero.name}</div>
            <div class="hero-title-italic">${hero.title || ''}</div>
            <div class="hero-domain-tag">Dominio: <strong>${hero.domain}</strong></div>
            
            <div class="hero-skill-action-row">
              <span class="skill-tag">Habilidad: <strong>${hero.skill}</strong></span>
              ${this.canUseSkillOutOfCombat() ? `
                <button class="btn-rune-skill" id="btnUseSkillHero">
                  ✨ Usar Habilidad
                </button>
              ` : ''}
            </div>

            <div class="hero-load-indicator">
              <span>Carga: <strong>${currentWeight} / ${maxWeight}</strong></span>
              ${isOverburdened ? '<span class="overburden-warning">¡SOBRECARGA!</span>' : ''}
            </div>
          </div>
        </div>

        <!-- PILAS DE SALUD Y ENERGÍA FÍSICAS SOBRE EL TAPETE -->
        <div class="hero-vitals-piles-direct">
          ${renderTokenPile({
            type: 'salud',
            image: 'assets/tokens/token_salud.png',
            count: hero.hp,
            maxCount: hero.maxHp,
            label: 'Salud',
            tooltip: 'Fichas de Salud del héroe.',
            size: 46
          })}

          ${renderTokenPile({
            type: 'energia',
            image: 'assets/tokens/token_energia.png',
            count: hero.energy,
            maxCount: hero.maxEnergy,
            label: 'Energía',
            tooltip: 'Fichas de Energía para dados y habilidades.',
            size: 46
          })}
        </div>

        <!-- ZONA DE CARTAS DE EQUIPAMIENTO SUPERPUESTAS (ORGANIC TABLETOP LAYOUT) -->
        <div class="equipment-overlapping-table-zone">
          <div class="equipment-zone-caption">⚔️ Equipamiento en Uso</div>

          <!-- FILA 1: ARMAS Y MANOS (SUPERPUESTAS) -->
          <div class="hands-overlapping-cluster">
            <!-- MANO PRINCIPAL (ARMA) -->
            ${renderEquippedCard('MP', 'Mano Principal', '🗡️', -2)}
            <!-- OTRA MANO (ESCUDO / ANTORCHA) -->
            ${renderEquippedCard('OM', 'Otra Mano', '🛡️', 2)}
          </div>

          <!-- FILA 2: ARMADURA, CASCO Y ACCESORIO (SUPERPUESTOS EN ABANICO CORTO) -->
          <div class="armor-overlapping-cluster">
            <!-- ARMADURA (CUERPO) -->
            ${renderEquippedCard('CP', 'Armadura', '🦺', -1)}
            <!-- CASCO (CABEZA) -->
            ${renderEquippedCard('CA', 'Casco', '🪖', 1)}
            <!-- ACCESORIO -->
            ${renderEquippedCard('AC', 'Accesorio', '💍', 0)}
          </div>
        </div>

        <!-- CEMENTERIO DE ENEMIGOS VENCIDOS (MONTONCITO DE CARTAS DE MONSTRUO) -->
        <div class="graveyard-tabletop-pile">
          <div class="graveyard-header-row">
            <span class="grave-title">💀 Cementerio (${gameState.graveyard.length})</span>
          </div>

          <div class="graveyard-cards-fan">
            ${gameState.graveyard.slice(-6).map((e, idx) => `
              <div class="graveyard-mini-card" style="transform: rotate(${(idx - 2.5) * 4}deg); z-index: ${idx + 1};" title="${e.name}">
                <img src="${e.image || 'assets/cards/base/card_010.jpg'}" alt="${e.name}" class="zoomable" data-img="${e.image || 'assets/cards/base/card_010.jpg'}" />
              </div>
            `).join('')}
            ${gameState.graveyard.length === 0 ? '<span class="empty-grave-note">Sin víctimas aún</span>' : ''}
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
  }

  canUseSkillOutOfCombat() {
    const hero = gameState.hero;
    if (!hero) return false;
    return (hero.skill === 'Alquimia' && hero.energy >= 1) ||
           (hero.skill === 'Divinidad' && hero.energy >= 2);
  }

  bindEvents() {
    const ie = gameState.inventoryEngine;

    // Desequipar cartas
    this.container.querySelectorAll('.btn-card-pop-unequip[data-slot]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slot = e.currentTarget.dataset.slot;
        ie.unequip(slot);
        soundManager.playCardFlip();
        gameState.notify();
      });
    });

    // Usar habilidad fuera de combate
    const btnSkill = this.container.querySelector('#btnUseSkillHero');
    if (btnSkill) {
      btnSkill.addEventListener('click', () => {
        const hero = gameState.hero;
        if (hero.skill === 'Alquimia' && hero.energy >= 1) {
          hero.energy -= 1;
          if (hero.poison > 0) hero.poison -= 1;
          else hero.hp = Math.min(hero.maxHp, hero.hp + 2);
          soundManager.playPotion();
          gameState.notify();
        } else if (hero.skill === 'Divinidad' && hero.energy >= 2) {
          hero.energy -= 2;
          hero.hp = Math.min(hero.maxHp, hero.hp + 2);
          if (hero.poison > 0) hero.poison -= 1;
          soundManager.playPotion();
          gameState.notify();
        }
      });
    }

    // Zoom
    this.container.querySelectorAll('.zoomable').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.openCardModal) window.openCardModal(e.currentTarget.dataset.img);
      });
    });
  }
}
