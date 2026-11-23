/**
 * IRON HELM - Vista del Tapete de Mazmorra (Mesa Abierta Tabletop)
 * Sin recuadros negros ni paneles pesados. El tapete oficial de juego es el protagonista.
 * Cartas y fichas descansan directamente sobre la mesa con sombras y física táctil.
 */

import { gameState } from '../engine/gameState.js';
import { soundManager } from '../utils/audio.js';
import { renderTokenPile } from './tokenPile.js';

export class DungeonMatView {
  constructor(container) {
    this.container = container;
  }

  render() {
    const d = gameState.dungeon;
    const hero = gameState.hero;
    const de = gameState.dungeonEngine;
    const currentPair = de.currentPair;
    const c1 = currentPair.card1;
    const c2 = currentPair.card2;

    this.container.innerHTML = `
      <div class="dungeon-mat-surface" style="background-image: url('assets/mats/iron_helm_mat_web.jpg');">
        
        <!-- PISTA DE TRACKERS INTEGRADA DIRECTAMENTE SOBRE EL TAPETE (SIN CAJONES NEGROS) -->
        <div class="dungeon-hud-minimal">
          
          <!-- PISO / NIVEL CON PEÓN ROJO DE MADERA -->
          <div class="tabletop-tracker-item" title="Nivel de Mazmorra actual (1 a 5)">
            <span class="tracker-micro-label">Piso</span>
            <div class="tracker-pips-strip">
              ${[1, 2, 3, 4, 5].map(lvl => `
                <div class="tracker-pip ${d.currentLevel === lvl ? 'has-pawn' : (d.currentLevel > lvl ? 'cleared' : '')}">
                  ${d.currentLevel === lvl ? `<div class="wooden-pawn-red"></div>` : lvl}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- TURNO DEL PISO (1 A 8) -->
          <div class="tabletop-tracker-item" title="Turno del piso actual (8 turnos = fin de nivel)">
            <span class="tracker-micro-label">Turno</span>
            <div class="turn-brass-display">
              <span class="turn-curr">${de.turnNumber}</span>
              <span class="turn-sep">/</span>
              <span class="turn-max">8</span>
            </div>
          </div>

          <!-- OJOS DEL JEFE -->
          <div class="tabletop-tracker-item" title="Al acumular 10 Ojos despierta el Jefe Final">
            <span class="tracker-micro-label">Ojos</span>
            <div class="eyes-brass-display">
              <span class="eye-symbol">👁️</span>
              <span class="eyes-val">${gameState.plots.totalEyes}/10</span>
            </div>
          </div>

          <!-- MORAL -->
          <div class="tabletop-tracker-item" title="Moral del héroe (-5 a +5)">
            <span class="tracker-micro-label">Moral</span>
            <span class="moral-badge-num ${hero.morale > 0 ? 'pos' : (hero.morale < 0 ? 'neg' : '')}">
              ${hero.morale >= 0 ? '+' : ''}${hero.morale}
            </span>
          </div>

          <!-- PILAS DE FICHAS FÍSICAS FLOTANTES (RACIONES, ORO, VENENO, BENDICIONES) -->
          <div class="tabletop-token-shelf-direct">
            ${renderTokenPile({
              type: 'racion',
              image: 'assets/tokens/token_racion.png',
              count: hero.rations,
              label: 'Raciones',
              tooltip: 'Fichas de Ración para alimentarse al descender de piso.',
              size: 38
            })}
            ${renderTokenPile({
              type: 'oro',
              image: 'assets/tokens/token_oro.png',
              count: hero.gold,
              label: 'Oro',
              tooltip: 'Monedas de Oro para mercaderes y altares.',
              size: 38
            })}
            ${renderTokenPile({
              type: 'veneno',
              image: 'assets/tokens/token_veneno.png',
              count: hero.poison,
              label: 'Veneno',
              tooltip: 'Fichas de Veneno en tu cuerpo. ¡Peligro si iguala tu salud!',
              size: 38
            })}
            ${renderTokenPile({
              type: 'bendicion',
              image: 'assets/tokens/token_bendicion.png',
              count: hero.blessings,
              label: 'Bendición',
              tooltip: 'Fichas de Bendición sagrada.',
              size: 38
            })}
          </div>

        </div>

        <!-- MESA DE EXPLORACIÓN ABIERTA (SIN PANELES CUADRICULADOS) -->
        <div class="dungeon-mat-open-board">
          
          <!-- COLUMNA IZQUIERDA: MAZO DE MAZMORRA Y DESCARTES (COMPACTO Y ELEGANTE) -->
          <div class="mat-deck-stack-column">
            
            <!-- MAZO DE MAZMORRA FÍSICO -->
            <div class="tabletop-compact-deck draw-deck ${!c1 ? 'deck-active-glow' : ''}" 
                 id="dungeonDrawDeck"
                 title="${!c1 ? '¡Toca el mazo para repartir las 2 cartas del turno!' : 'Mazo de Mazmorra'}">
              <span class="deck-engraved-title">Mazmorra</span>
              
              <div class="card-stack-visual">
                ${de.deck.length > 0 ? `
                  <div class="card-stack-layers"></div>
                  <div class="card-stack-top">
                    <img src="assets/cards/base/card_011.jpg" alt="Reverso Mazmorra" />
                    ${!c1 ? `
                      <div class="deck-touch-tag">
                        <span>Toca para Robar</span>
                      </div>
                    ` : ''}
                  </div>
                  <span class="wax-seal-badge">${de.deck.length}</span>
                ` : `
                  <div class="exhausted-deck-placeholder">Agotado</div>
                `}
              </div>
            </div>

            <!-- PILA DE DESCARTES -->
            <div class="tabletop-compact-deck discard-deck" title="Pila de Descartes">
              <span class="deck-engraved-title">Descartes</span>
              <div class="card-stack-visual discard-visual">
                ${de.discardPile.length > 0 ? `
                  <div class="card-stack-top">
                    <img src="${de.discardPile[de.discardPile.length - 1].image || 'assets/cards/base/card_011.jpg'}" alt="Descarte" />
                  </div>
                  <span class="wax-seal-badge discard">${de.discardPile.length}</span>
                ` : `
                  <div class="empty-mat-slot-outline">Vacío</div>
                `}
              </div>
            </div>

          </div>

          <!-- ZONA CENTRAL DE EXPLORACIÓN: ESPACIO ABIERTO PARA LAS 2 CARTAS -->
          <div class="dungeon-exploration-open-center" id="openExplorationArea">
            
            ${!c1 ? `
              <!-- MESA DESPEJADA: INDICADOR ORGÁNICO DE ROBAR -->
              <div class="open-table-cue" id="cueTapToDeal">
                <div class="cue-compass-glow"></div>
                <div class="cue-text-cluster">
                  <span class="cue-turn-tag">Turno ${de.turnNumber + 1} de 8</span>
                  <span class="cue-action-txt">Toca el <strong>Mazo de Mazmorra</strong> para revelar el camino</span>
                </div>
              </div>
            ` : `
              <!-- LAS DOS CARTAS DEL TURNO DIRECTAMENTE SOBRE EL TAPETE -->
              <div class="turn-cards-pairing-table">
                
                <!-- CARTA 1 -->
                <div class="direct-card-pod pod-card-1">
                  <div class="interactive-card-3d ${de.card1Revealed ? 'is-flipped' : 'is-facedown'} ${de.resolvedCard === c1 ? 'is-accepted' : ''}"
                       id="interactiveCard1">
                    
                    <div class="card-inner-rotator">
                      <!-- REVERSO -->
                      <div class="card-side side-back">
                        <img src="assets/cards/base/card_011.jpg" alt="Carta Boca Abajo" />
                        <div class="card-tap-turn-hint">
                          <span>👆 Voltear</span>
                        </div>
                      </div>

                      <!-- ANVERSO REVELADO -->
                      <div class="card-side side-front">
                        <img src="${c1.image}" alt="${c1.name}" class="zoomable" data-img="${c1.image}" />
                        
                        ${de.card1Revealed && !de.resolvedCard ? `
                          <div class="card-subtle-wax-decision accept-seal" id="bannerAcceptCard1">
                            <span>⚔️ Aceptar Opción 1</span>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  </div>

                  <span class="card-under-caption">
                    ${!de.card1Revealed ? 'Carta 1 (Toca para voltear)' : (de.resolvedCard === c1 ? '✅ Aceptada' : 'Toca para aceptar (Opción 1)')}
                  </span>
                </div>

                <!-- CARTA 2 -->
                <div class="direct-card-pod pod-card-2">
                  <div class="interactive-card-3d ${de.card2Revealed ? 'is-flipped enforced-danger' : 'is-facedown'} ${de.resolvedCard === c2 ? 'is-accepted' : ''}"
                       id="interactiveCard2">
                    
                    <div class="card-inner-rotator">
                      <!-- REVERSO -->
                      <div class="card-side side-back">
                        <img src="assets/cards/base/card_011.jpg" alt="Carta Boca Abajo" />
                        
                        ${de.card1Revealed && !de.resolvedCard ? `
                          <div class="card-subtle-wax-decision decline-seal" id="bannerDeclineToCard2">
                            <span>⏩ Rechazar Carta 1<br><small>Forzar Opción 2</small></span>
                          </div>
                        ` : `
                          <div class="card-locked-veil">🔒</div>
                        `}
                      </div>

                      <!-- ANVERSO REVELADO FORZADO -->
                      <div class="card-side side-front">
                        <img src="${c2.image}" alt="${c2.name}" class="zoomable" data-img="${c2.image}" />
                        <div class="enforced-danger-badge">⚠️ Opción 2 Obligatoria</div>
                      </div>
                    </div>
                  </div>

                  <span class="card-under-caption">
                    ${de.card2Revealed ? '⚠️ Forzada (Opción 2)' : (de.card1Revealed && !de.resolvedCard ? 'Toca para pasar a Carta 2' : 'Carta 2')}
                  </span>
                </div>

              </div>
            `}

          </div>

          <!-- COLUMNA DERECHA: MAZOS SECUNDARIOS COMPACTOS EN SUS ESPACIOS DE ESTANTERÍA -->
          <div class="mat-aux-decks-column">
            
            <!-- ENEMIGOS -->
            <div class="aux-mini-deck" title="Mazo de Enemigos de Mazmorra">
              <span class="aux-deck-name">Enemigos</span>
              <div class="aux-card-visual">
                <img src="assets/cards/base/card_010.jpg" alt="Enemigos" />
                <span class="aux-count-pip">${gameState.enemyDeck.length}</span>
              </div>
            </div>

            <!-- BOTÍN -->
            <div class="aux-mini-deck" title="Mazo de Botín y Tesoro">
              <span class="aux-deck-name">Botín</span>
              <div class="aux-card-visual">
                <img src="assets/cards/base/card_055.jpg" alt="Botín" />
                <span class="aux-count-pip">${gameState.lootDeck.length}</span>
              </div>
            </div>

            <!-- TRAMAS -->
            <div class="aux-mini-deck" title="Mazo de Tramas">
              <span class="aux-deck-name">Tramas</span>
              <div class="aux-card-visual">
                <img src="assets/cards/base/card_055.jpg" alt="Tramas" />
                <span class="aux-count-pip">${gameState.plotDeck.length}</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const de = gameState.dungeonEngine;

    // Robar tocando el mazo de mazmorra o la mesa
    const deckSpot = this.container.querySelector('#dungeonDrawDeck');
    const cueSpot = this.container.querySelector('#cueTapToDeal');
    const triggerDraw = () => {
      if (!de.currentPair.card1) {
        soundManager.playCardFlip();
        de.drawExplorationPair();
        gameState.notify();
      }
    };

    if (deckSpot) deckSpot.addEventListener('click', triggerDraw);
    if (cueSpot) cueSpot.addEventListener('click', triggerDraw);

    // Interacción física con Carta 1
    const card1 = this.container.querySelector('#interactiveCard1');
    if (card1) {
      card1.addEventListener('click', (e) => {
        if (e.target.classList.contains('zoomable') && de.card1Revealed) {
          if (window.openCardModal) {
            window.openCardModal(e.target.dataset.img);
            return;
          }
        }

        if (!de.card1Revealed) {
          soundManager.playCardFlip();
          de.revealCard1();
          gameState.notify();
          return;
        }

        if (de.card1Revealed && !de.resolvedCard) {
          soundManager.playCardFlip();
          de.acceptCard1();
          gameState.notify();
        }
      });
    }

    // Interacción física con Carta 2
    const card2 = this.container.querySelector('#interactiveCard2');
    if (card2) {
      card2.addEventListener('click', (e) => {
        if (e.target.classList.contains('zoomable') && de.card2Revealed) {
          if (window.openCardModal) {
            window.openCardModal(e.target.dataset.img);
            return;
          }
        }

        // Si Carta 1 está revelada y tocamos Carta 2 -> Rechazar Carta 1 y forzar Carta 2
        if (de.card1Revealed && !de.resolvedCard) {
          soundManager.playCardFlip();
          de.rejectCard1AndRevealCard2();
          gameState.notify();
        }
      });
    }

    // Zoom en cartas auxiliares
    this.container.querySelectorAll('.zoomable').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.openCardModal) window.openCardModal(e.currentTarget.dataset.img);
      });
    });
  }
}
