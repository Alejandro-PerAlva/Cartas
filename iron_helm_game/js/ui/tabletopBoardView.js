/**
 * IRON HELM DIGITAL - Zona de Juego Tabletop Cómoda y Envolvente (V7)
 * - Sin efectos 3D forzados (vista cenital limpia, ordenada y ergonómica).
 * - Ocupa el 100% de la pantalla sin scroll vertical (todo a la vista).
 * - El Mazo de Mazmorra se sitúa EN EL CENTRO junto a las dos cartas del turno.
 * - Todos los elementos responden a los clics con total fiabilidad y feedback de audio.
 */

import { gameState } from '../engine/gameState.js';
import { soundManager } from '../utils/audio.js';
import { renderTokenPile } from './tokenPile.js';
import { Dice3DManager } from './dice3D.js';

export class TabletopBoardView {
  constructor(container) {
    this.container = container;
    this.energySpent = 1;
    this.combatAnimState = 'IDLE'; // IDLE, ROLLING, SLASH, HIT, ENEMY_LUNGE
    this.lastDamageNumber = null;
    this.showingHandbookModal = false;
    this.showingGraveyardModal = false;
  }

  // Compatibilidad hacia atrás
  getLevelPawnPosition(level) {
    return { x: (level || 1) * 20, y: 50 };
  }

  getTurnPawnPosition(turn) {
    return { x: (turn || 1) * 12, y: 50 };
  }

  render() {
    if (!this.container) return;
    const hero = gameState.hero;
    if (!hero) return;

    const dungeonDeck = gameState.dungeonEngine?.deck || [];
    const enemyDeck = gameState.enemyDeck || [];
    const lootDeck = gameState.lootDeck || [];
    const potionDeck = gameState.potionDeck || [];
    const plotDeck = gameState.plotDeck || [];
    const graveyard = gameState.graveyard || [];
    const equipped = gameState.character?.equipped || hero.equipped || {};
    const backpack = gameState.character?.backpack || hero.backpack || [];
    const currentWeight = gameState.inventoryEngine?.calculateTotalEncumbrance?.() || 0;

    const currentLevel = gameState.dungeon?.currentLevel || 1;
    const turnNumber = gameState.dungeonEngine?.turnNumber || 1;
    const currentPair = gameState.dungeonEngine?.currentPair || { card1: null, card2: null };
    const revealedCard1 = !!gameState.dungeonEngine?.card1Revealed;
    const revealedCard2 = !!gameState.dungeonEngine?.card2Revealed;
    const totalEyes = gameState.plots?.totalEyes || 0;
    const morale = hero.morale || 0;

    this.container.innerHTML = `
      <div class="dungeon-board-viewport ${this.combatAnimState === 'SLASH' ? 'screen-shake-anim' : ''}">
        
        <!-- ========================================================
             TIER 1: BARRA SUPERIOR Y SUMINISTROS (TRACKERS & MAZOS)
             ======================================================== -->
        <header class="board-top-tier">
          
          <!-- Lado Izquierdo: Seguimiento de Piso, Turno, Ojos y Moral -->
          <div class="top-trackers-strip">
            
            <div class="track-group">
              <span class="track-label">PISO:</span>
              <div class="track-nodes">
                ${[1, 2, 3, 4, 5].map(lvl => `
                  <div class="t-node ${lvl === currentLevel ? 'active' : ''}" title="Piso ${lvl}">
                    ${lvl === currentLevel ? '<span class="red-pawn-dot">🔴</span>' : lvl}
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="track-group">
              <span class="track-label">TURNO:</span>
              <div class="track-nodes">
                ${[1, 2, 3, 4, 5, 6, 7, 8].map(trn => `
                  <div class="t-node ${trn === turnNumber ? 'active' : ''}" title="Turno ${trn}">
                    ${trn === turnNumber ? '<span class="red-pawn-dot">🔴</span>' : trn}
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="track-counters">
              <span class="counter-chip" title="Ojos del Jefe">👁️ ${totalEyes}/10</span>
              <span class="counter-chip" title="Moral del Héroe">⚖️ Moral ${morale >= 0 ? '+' : ''}${morale}</span>
            </div>

          </div>

          <!-- Lado Derecho: Mazos de Suministro y Manual -->
          <div class="top-supply-strip">
            
            <!-- Mazo Enemigos -->
            <div class="supply-deck-card" id="deckEnemies" title="Mazo de Enemigos (${enemyDeck.length} cartas)">
              <img src="assets/cards/card_back_enemies.jpg" class="supply-img" alt="Enemigos">
              <span class="supply-badge">${enemyDeck.length}</span>
              <span class="supply-tag">ENEMIGOS</span>
            </div>

            <!-- Mazo Botín -->
            <div class="supply-deck-card" id="deckLoot" title="Mazo de Botín (${lootDeck.length} cartas)">
              <img src="assets/cards/card_back_loot.jpg" class="supply-img" alt="Botín">
              <span class="supply-badge">${lootDeck.length}</span>
              <span class="supply-tag">BOTÍN</span>
            </div>

            <!-- Mazo Tramas -->
            <div class="supply-deck-card" id="deckPlots" title="Mazo de Tramas (${plotDeck.length} cartas)">
              <img src="assets/cards/card_back_plots.jpg" class="supply-img" alt="Tramas">
              <span class="supply-badge">${plotDeck.length}</span>
              <span class="supply-tag">TRAMAS</span>
            </div>

            <!-- Mazo Pociones -->
            <div class="supply-deck-card" id="deckPotions" title="Mazo de Pociones (${potionDeck.length} cartas)">
              <img src="assets/cards/card_back_potions.jpg" class="supply-img" alt="Pociones">
              <span class="supply-badge">${potionDeck.length}</span>
              <span class="supply-tag">POCIONES</span>
            </div>

            <!-- Manual de Reglas -->
            <div class="supply-deck-card handbook-card" id="deckHandbook" title="Abrir Manual de Reglas Oficial">
              <img src="assets/cards/card_handbook.jpg" class="supply-img" alt="Manual">
              <span class="supply-tag">MANUAL</span>
            </div>

            <!-- Controles de Audio y Menú -->
            <div class="top-system-btns">
              <button class="sys-btn" id="btnToggleSound" title="Sonido">${soundManager.muted ? '🔇' : '🔊'}</button>
              <button class="sys-btn" id="btnToggleLog" title="Historial">📜</button>
              <button class="sys-btn danger" id="btnAbandonGame" title="Salir al Menú">⚙️</button>
            </div>

          </div>

        </header>

        <!-- ========================================================
             TIER 2: ZONA CENTRAL DE MAZMORRA Y ENCUENTROS
             "las mazmorras en medio junto a donde se levantan las tarjetas"
             ======================================================== -->
        <main class="board-dungeon-center-tier">
          ${this.renderCentralEncounter(dungeonDeck, currentPair, revealedCard1, revealedCard2)}
        </main>

        <!-- ========================================================
             TIER 3: TABLERO DEL JUGADOR (FICHAS, HÉROE, EQUIPO Y MOCHILA)
             ======================================================== -->
        <footer class="board-player-bottom-tier">
          
          <!-- Fichas Físicas de Madera/Cartón -->
          <div class="player-tokens-tray">
            <div class="token-tray-cell" title="Salud del Héroe">
              ${renderTokenPile({ type: 'salud', image: 'assets/tokens/token_salud.png', count: hero.hp, maxCount: hero.maxHp, label: 'Salud', size: 36 })}
              <span class="token-val-txt">${hero.hp}/${hero.maxHp} HP</span>
            </div>
            <div class="token-tray-cell" title="Energía del Héroe">
              ${renderTokenPile({ type: 'energia', image: 'assets/tokens/token_energia.png', count: hero.energy, maxCount: hero.maxEnergy, label: 'Energía', size: 36 })}
              <span class="token-val-txt">${hero.energy}/${hero.maxEnergy} EN</span>
            </div>
            <div class="token-tray-cell" title="Monedas de Oro">
              ${renderTokenPile({ type: 'oro', image: 'assets/tokens/token_oro.png', count: hero.gold, label: 'Oro', size: 36 })}
              <span class="token-val-txt">${hero.gold} Oro</span>
            </div>
            <div class="token-tray-cell" title="Raciones de Comida">
              ${renderTokenPile({ type: 'racion', image: 'assets/tokens/token_racion.png', count: hero.rations, label: 'Raciones', size: 36 })}
              <span class="token-val-txt">${hero.rations} Raciones</span>
            </div>
            ${hero.poison > 0 ? `
              <div class="token-tray-cell poison" title="Veneno">
                ${renderTokenPile({ type: 'veneno', image: 'assets/tokens/token_veneno.png', count: hero.poison, label: 'Veneno', size: 36 })}
                <span class="token-val-txt">${hero.poison} Veneno</span>
              </div>
            ` : ''}
            ${hero.blessings > 0 ? `
              <div class="token-tray-cell blessing" title="Bendición">
                ${renderTokenPile({ type: 'bendicion', image: 'assets/tokens/token_bendicion.png', count: hero.blessings, label: 'Bendición', size: 36 })}
                <span class="token-val-txt">${hero.blessings} Bendición</span>
              </div>
            ` : ''}
          </div>

          <!-- Carta del Héroe y Habilidad -->
          <div class="player-hero-compartment">
            <div class="hero-card-frame">
              <img src="${hero.image || 'assets/cards/base/card_000.jpg'}" class="hero-card-pic" alt="${hero.name}">
              <div class="hero-name-banner">${hero.name}</div>
            </div>
            <div class="hero-skill-strip" title="${hero.skill || ''}">
              <span>⚡ ${hero.skill || 'Habilidad'} (${hero.domain || 'BÁSICO'})</span>
            </div>
          </div>

          <!-- Ranuras de Equipo Desplegadas con Cartas Reales -->
          <div class="player-equipment-strip">
            
            <div class="equip-slot-cell" id="slotMP">
              <span class="slot-title">MANO DERECHA</span>
              ${this.renderEquippedCard(equipped.MP, 'Mano Principal', '🗡️')}
            </div>

            <div class="equip-slot-cell" id="slotOM">
              <span class="slot-title">MANO IZQUIERDA</span>
              ${this.renderEquippedCard(equipped.OM, 'Otra Mano', '🛡️')}
            </div>

            <div class="equip-slot-cell" id="slotCP">
              <span class="slot-title">ARMADURA</span>
              ${this.renderEquippedCard(equipped.CP, 'Ropajes / Armadura', '🥋')}
            </div>

            <div class="equip-slot-cell" id="slotCA">
              <span class="slot-title">CABEZA</span>
              ${this.renderEquippedCard(equipped.CA, 'Casco / Yelmo', '🪖')}
            </div>

            <div class="equip-slot-cell" id="slotAC">
              <span class="slot-title">ACCESORIO</span>
              ${this.renderEquippedCard(equipped.AC, 'Accesorio / Amuleto', '💍')}
            </div>

          </div>

          <!-- Cementerio de Monstruos -->
          <div class="player-graveyard-cell" id="btnOpenGraveyard" title="Ver Cementerio">
            <div class="graveyard-card-pile">
              ${graveyard.length > 0 ? `
                <img src="${graveyard[graveyard.length - 1].image || 'assets/cards/card_back_enemies.jpg'}" class="graveyard-img" alt="Enemigos">
              ` : `
                <div class="graveyard-empty-slot">💀</div>
              `}
              <span class="graveyard-num-badge">${graveyard.length}</span>
            </div>
            <span class="slot-title">CEMENTERIO</span>
          </div>

          <!-- Botón de Mochila / Mano de Cartas en Abanico -->
          <button class="player-backpack-drawer-btn" id="btnToggleBackpack">
            <span>🎒 Mochila (${backpack.length} cartas · ${currentWeight}/${hero.encumbranceMax} Carga)</span>
            <span class="backpack-btn-arrow">▲ Abrir Abanico</span>
          </button>

        </footer>

        <!-- MODALES DE REGLAS Y CEMENTERIO -->
        ${this.showingHandbookModal ? this.renderHandbookModal() : ''}
        ${this.showingGraveyardModal ? this.renderGraveyardModal(graveyard) : ''}

      </div>
    `;

    this.bindEvents();
  }

  // Render del centro: MAZO DE MAZMORRA JUNTO A LAS CARTAS DEL TURNO
  renderCentralEncounter(dungeonDeck, currentPair, revealedCard1, revealedCard2) {
    // Si estamos en combate:
    if (gameState.status === 'COMBAT' && gameState.combatEngine?.combatState) {
      return this.renderCombatArena();
    }

    const c1 = currentPair.card1;
    const c2 = currentPair.card2;
    const hasDrawn = !!c1;

    return `
      <div class="dungeon-trio-workbench">
        
        <!-- 1. EL MAZO DE MAZMORRA (EN MEDIO JUNTO A LAS CARTAS) -->
        <div class="dungeon-deck-unit ${!hasDrawn ? 'ready-to-draw-glow' : ''}" id="deckDungeon" title="Mazo de Mazmorra (${dungeonDeck.length} cartas restantes)">
          <div class="deck-card-box">
            <img src="assets/cards/card_back_dungeon.jpg" class="deck-card-cover" alt="Mazo de Mazmorra">
            <span class="deck-count-pill">${dungeonDeck.length}</span>
          </div>
          <button class="deck-draw-action-btn" id="btnDirectDraw">
            ${hasDrawn ? 'MAZMORRA' : '👈 ROBAR 2 CARTAS'}
          </button>
        </div>

        <!-- 2. HUECO / CARTA 1 -->
        <div class="exploration-card-slot" id="slotCard1">
          ${!hasDrawn ? `
            <div class="empty-bay-placeholder" id="bayPlaceholder1" title="Haz clic para robar turno">
              <span class="bay-roman">I</span>
              <span class="bay-label">CARTA 1</span>
              <span class="bay-sub">Toca para robar</span>
            </div>
          ` : `
            <div class="table-card-item ${revealedCard1 ? 'revealed' : 'facedown'}" id="tableCard1">
              ${!revealedCard1 ? `
                <div class="card-facedown-view">
                  <img src="assets/cards/card_back_dungeon.jpg" alt="Carta 1 Oculta">
                  <button class="action-wax-seal" id="btnFlipCard1">
                    👆 VOLTEAR CARTA 1
                  </button>
                </div>
              ` : `
                <div class="card-revealed-view">
                  <img src="${c1.image || 'assets/cards/card_back_dungeon.jpg'}" alt="${c1.name}">
                  <div class="card-action-overlay">
                    <button class="card-resolve-btn accept" id="btnAcceptCard1">
                      ⚔️ RESOLVER OPCIÓN 1
                    </button>
                  </div>
                </div>
              `}
            </div>
          `}
        </div>

        <!-- 3. HUECO / CARTA 2 -->
        <div class="exploration-card-slot" id="slotCard2">
          ${!hasDrawn ? `
            <div class="empty-bay-placeholder" id="bayPlaceholder2" title="Haz clic para robar turno">
              <span class="bay-roman">II</span>
              <span class="bay-label">CARTA 2</span>
              <span class="bay-sub">Toca para robar</span>
            </div>
          ` : `
            <div class="table-card-item ${revealedCard2 ? 'revealed' : 'facedown'}" id="tableCard2">
              ${!revealedCard2 ? `
                <div class="card-facedown-view">
                  <img src="assets/cards/card_back_dungeon.jpg" alt="Carta 2 Oculta">
                  ${revealedCard1 ? `
                    <button class="action-wax-seal reject" id="btnRejectCard1">
                      🚪 RECHAZAR C1 Y PASAR A C2
                    </button>
                  ` : `
                    <div class="action-wax-seal locked">
                      🔒 CARTA 2 CERRADA
                    </div>
                  `}
                </div>
              ` : `
                <div class="card-revealed-view">
                  <img src="${c2?.image || 'assets/cards/card_back_dungeon.jpg'}" alt="${c2?.name}">
                  <div class="card-action-overlay">
                    <button class="card-resolve-btn mandatory" id="btnResolveCard2">
                      ⚠️ RESOLVER OPCIÓN 2 OBLIGATORIA
                    </button>
                  </div>
                </div>
              `}
            </div>
          `}
        </div>

      </div>
    `;
  }

  // Render del Combate en la Mesa
  renderCombatArena() {
    const combat = gameState.combatEngine.combatState;
    if (!combat) return '';

    const enemy = combat.enemy;
    const hero = gameState.hero;
    const isRolling = this.combatAnimState === 'ROLLING';
    const isEnemyTurn = combat.phase === 'ENEMY_ATTACK';

    return `
      <div class="combat-workbench-grid ${this.combatAnimState === 'HIT' ? 'monster-hit' : ''}">
        
        <!-- Enemigo -->
        <div class="combat-enemy-column ${this.combatAnimState === 'ENEMY_LUNGE' ? 'monster-lunge' : ''}">
          <div class="combat-enemy-card-wrap">
            <img src="${enemy.image || 'assets/cards/card_back_enemies.jpg'}" class="combat-enemy-img" alt="${enemy.name}">
            
            ${this.combatAnimState === 'SLASH' ? '<div class="sword-slash-fx"></div>' : ''}
            ${this.lastDamageNumber !== null ? `
              <div class="floating-damage-number">${this.lastDamageNumber}</div>
            ` : ''}

            <div class="combat-enemy-hp-strip">
              <div class="enemy-hp-bar">
                <div class="enemy-hp-fill" style="width: ${(combat.enemyHp / combat.enemyMaxHp) * 100}%;"></div>
                <span class="enemy-hp-text">${combat.enemyHp} / ${combat.enemyMaxHp} HP</span>
              </div>
              <div class="enemy-stats-row">
                <span>⚔️ Atq: +${enemy.attackInitial || 0}</span>
                <span>🛡️ Contra: +${enemy.attackCounter || 0}</span>
                <span>⭐ XP: +${enemy.xp || 1}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bandeja de Dados y Controles de Ataque -->
        <div class="combat-controls-column">
          
          <div class="combat-dice-tray-box ${isRolling ? 'is-rolling-shake' : ''}" id="combatDiceTray" title="Toca para rodar dados">
            ${Dice3DManager.renderDiceMarkup(combat.diceRolls || [3, 5], isRolling)}
          </div>

          <div class="combat-action-pod">
            ${isEnemyTurn ? `
              <div class="enemy-attack-alert">
                <span>⚠️ ${enemy.name} está atacando...</span>
                <button class="combat-btn continue" id="btnContinueEnemyAttack">Continuar Combate</button>
              </div>
            ` : `
              <div class="player-strike-form">
                <div class="energy-stepper-ctrl">
                  <button class="step-btn" id="btnDecEnergy" ${this.energySpent <= 1 ? 'disabled' : ''}>-</button>
                  <span class="step-num">⚡ ${this.energySpent} EN (${this.energySpent}d6)</span>
                  <button class="step-btn" id="btnIncEnergy" ${this.energySpent >= Math.min(3, hero.energy) ? 'disabled' : ''}>+</button>
                </div>
                <button class="combat-btn strike" id="btnExecuteAttack" ${hero.energy < this.energySpent ? 'disabled' : ''}>
                  ⚔️ LANZAR ATAQUE (${this.energySpent}d6)
                </button>
              </div>
            `}
          </div>

        </div>

      </div>
    `;
  }

  // Render de cartas de equipo
  renderEquippedCard(card, slotName, defaultIcon) {
    if (!card) {
      return `
        <div class="empty-slot-well" title="${slotName} vacío">
          <span class="well-icon">${defaultIcon}</span>
          <span class="well-name">${slotName}</span>
        </div>
      `;
    }

    return `
      <div class="equipped-card-view" title="${card.name} - ${card.description || ''}">
        <img src="${card.image || 'assets/cards/base/card_068.jpg'}" class="equipped-card-art" alt="${card.name}">
        <div class="equipped-card-bar">
          <span class="equipped-card-name">${card.name}</span>
          <button class="btn-slot-unequip" data-slot="${card.slot}" title="Desequipar a mochila">✕</button>
        </div>
      </div>
    `;
  }

  // Modal de Manual
  renderHandbookModal() {
    return `
      <div class="tabletop-overlay-backdrop" id="handbookModalBackdrop">
        <div class="tabletop-dialog-window">
          <div class="dialog-window-header">
            <h3>📖 IRON HELM - MANUAL DE REGLAS OFICIAL</h3>
            <button class="dialog-close-btn" id="btnCloseHandbook">✕</button>
          </div>
          <div class="dialog-window-body">
            <h4>1. Flujo del Turno de Exploración:</h4>
            <p>Cada piso de mazmorra consta de <strong>8 turnos</strong> (16 cartas de mazmorra):</p>
            <ul>
              <li><strong>Paso 1:</strong> Toca el Mazo de Mazmorra en el centro para repartir las 2 cartas del turno.</li>
              <li><strong>Paso 2:</strong> Voltea la Carta 1 tocándola. Puedes resolverla (Opción 1) o descartarla.</li>
              <li><strong>Paso 3:</strong> Si descartas la Carta 1, debes voltear la Carta 2 y resolver obligatoriamente su Opción 2.</li>
            </ul>
            <h4>2. Combate Físico con Dados:</h4>
            <ul>
              <li>El daño se calcula tirando dados y restando el valor menor del mayor.</li>
              <li><strong>¡Dobles significa Fallo Absoluto!</strong> Si sacas dobles, no infliges daño.</li>
              <li>Tu armadura reduce directamente el daño inicial recibido.</li>
            </ul>
            <h4>3. Fin de Nivel:</h4>
            <ul>
              <li>Al agotar las 16 cartas, consumes 1 Ración de comida (o sufres 2 de daño).</li>
              <li>El veneno causa daño según tus puntos de veneno.</li>
              <li>Avanzas al siguiente piso en el marcador de niveles.</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  // Modal del Cementerio
  renderGraveyardModal(graveyard) {
    return `
      <div class="tabletop-overlay-backdrop" id="graveyardModalBackdrop">
        <div class="tabletop-dialog-window">
          <div class="dialog-window-header">
            <h3>💀 CEMENTERIO (${graveyard.length} Enemigos Vencidos)</h3>
            <button class="dialog-close-btn" id="btnCloseGraveyard">✕</button>
          </div>
          <div class="dialog-window-body graveyard-entries">
            ${graveyard.length === 0 ? '<p>No has derrotado a ningún monstruo todavía.</p>' : ''}
            ${graveyard.map(m => `
              <div class="graveyard-card-row">
                <img src="${m.image || 'assets/cards/card_back_enemies.jpg'}" class="graveyard-card-thumb" alt="${m.name}">
                <div class="graveyard-meta">
                  <strong>${m.name}</strong>
                  <span>Recompensa: +${m.xp || 1} XP · +${m.gold || 0} Oro</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Helper de robo de cartas
    const doDraw = () => {
      if (gameState.status === 'EXPLORATION' && !gameState.dungeonEngine?.currentPair?.card1) {
        soundManager.playCardDeal();
        gameState.dungeonEngine.drawExplorationPair();
        gameState.notify();
      }
    };

    // 1. Clic en el Mazo de Mazmorra central o en el botón de robo
    const deckDungeon = this.container.querySelector('#deckDungeon');
    if (deckDungeon) deckDungeon.addEventListener('click', doDraw);

    const btnDirectDraw = this.container.querySelector('#btnDirectDraw');
    if (btnDirectDraw) btnDirectDraw.addEventListener('click', (e) => { e.stopPropagation(); doDraw(); });

    const p1 = this.container.querySelector('#bayPlaceholder1');
    if (p1) p1.addEventListener('click', doDraw);

    const p2 = this.container.querySelector('#bayPlaceholder2');
    if (p2) p2.addEventListener('click', doDraw);

    // 2. Voltear Carta 1
    const btnFlip1 = this.container.querySelector('#btnFlipCard1');
    const tableC1 = this.container.querySelector('#tableCard1');
    const doFlip1 = () => {
      if (!gameState.dungeonEngine?.card1Revealed) {
        soundManager.playCardFlip();
        gameState.dungeonEngine.revealCard1();
        gameState.notify();
      }
    };
    if (btnFlip1) btnFlip1.addEventListener('click', (e) => { e.stopPropagation(); doFlip1(); });
    if (tableC1 && !gameState.dungeonEngine?.card1Revealed) tableC1.addEventListener('click', doFlip1);

    // 3. Aceptar Carta 1
    const btnAccept1 = this.container.querySelector('#btnAcceptCard1');
    if (btnAccept1) {
      btnAccept1.addEventListener('click', (e) => {
        e.stopPropagation();
        soundManager.playCardFlip();
        gameState.dungeonEngine.acceptCard1();
        gameState.notify();
      });
    }

    // 4. Rechazar Carta 1 y revelar Carta 2
    const btnReject1 = this.container.querySelector('#btnRejectCard1');
    if (btnReject1) {
      btnReject1.addEventListener('click', (e) => {
        e.stopPropagation();
        soundManager.playCardFlip();
        gameState.dungeonEngine.rejectCard1AndRevealCard2();
        gameState.notify();
      });
    }

    // 5. Resolver Carta 2 obligatoria
    const btnResolve2 = this.container.querySelector('#btnResolveCard2');
    if (btnResolve2) {
      btnResolve2.addEventListener('click', (e) => {
        e.stopPropagation();
        soundManager.playCardFlip();
        gameState.dungeonEngine.resolveCard(gameState.dungeonEngine.currentPair.card2, 2);
        gameState.notify();
      });
    }

    // 6. Stepper de Energía en Combate
    const btnDec = this.container.querySelector('#btnDecEnergy');
    const btnInc = this.container.querySelector('#btnIncEnergy');
    if (btnDec) {
      btnDec.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.energySpent > 1) {
          this.energySpent--;
          soundManager.playClick();
          this.render();
        }
      });
    }
    if (btnInc) {
      btnInc.addEventListener('click', (e) => {
        e.stopPropagation();
        const maxEn = Math.min(3, gameState.hero?.energy || 1);
        if (this.energySpent < maxEn) {
          this.energySpent++;
          soundManager.playClick();
          this.render();
        }
      });
    }

    // 7. Lanzar Ataque en Combate
    const btnAtk = this.container.querySelector('#btnExecuteAttack');
    const diceTray = this.container.querySelector('#combatDiceTray');
    const doAttack = () => {
      if (gameState.status !== 'COMBAT' || gameState.combatEngine?.combatState?.phase === 'ENEMY_ATTACK') return;
      this.combatAnimState = 'ROLLING';
      this.render();
      soundManager.playDiceRoll();

      setTimeout(() => {
        this.combatAnimState = 'SLASH';
        soundManager.playSwordHit();
        const outcome = gameState.combatEngine.executePlayerAttack(this.energySpent);
        this.lastDamageNumber = outcome ? `-${outcome.damageDealt} HP` : '-0 HP';
        this.render();

        setTimeout(() => {
          this.combatAnimState = 'HIT';
          this.render();

          setTimeout(() => {
            this.combatAnimState = 'IDLE';
            this.lastDamageNumber = null;
            gameState.notify();
          }, 350);
        }, 200);
      }, 450);
    };

    if (btnAtk) btnAtk.addEventListener('click', (e) => { e.stopPropagation(); doAttack(); });
    if (diceTray && gameState.combatEngine?.combatState?.phase !== 'ENEMY_ATTACK') {
      diceTray.addEventListener('click', (e) => { e.stopPropagation(); doAttack(); });
    }

    // 8. Continuar ataque enemigo si está en espera
    const btnEnemyCont = this.container.querySelector('#btnContinueEnemyAttack');
    if (btnEnemyCont) {
      btnEnemyCont.addEventListener('click', (e) => {
        e.stopPropagation();
        this.combatAnimState = 'ENEMY_LUNGE';
        this.render();
        setTimeout(() => {
          this.combatAnimState = 'IDLE';
          gameState.combatEngine.combatState.phase = 'PLAYER_INPUT';
          gameState.notify();
        }, 250);
      });
    }

    // 9. Desequipar objetos
    this.container.querySelectorAll('.btn-slot-unequip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slot = e.currentTarget.dataset.slot;
        soundManager.playCardFlip();
        gameState.inventoryEngine.unequipItem(slot);
        gameState.notify();
      });
    });

    // 10. Mochila / Mano de cartas
    const btnBackpack = this.container.querySelector('#btnToggleBackpack');
    if (btnBackpack) {
      btnBackpack.addEventListener('click', (e) => {
        e.stopPropagation();
        const fan = document.getElementById('inventoryFanContainer');
        if (fan) fan.classList.toggle('active');
        soundManager.playCardFlip();
      });
    }

    // 11. Modales de Manual y Cementerio
    const btnHandbook = this.container.querySelector('#btnOpenHandbook');
    const deckHandbook = this.container.querySelector('#deckHandbook');
    const openHandbook = () => {
      this.showingHandbookModal = true;
      soundManager.playCardFlip();
      this.render();
    };
    if (btnHandbook) btnHandbook.addEventListener('click', openHandbook);
    if (deckHandbook) deckHandbook.addEventListener('click', openHandbook);

    const btnCloseH = this.container.querySelector('#btnCloseHandbook');
    const backdropH = this.container.querySelector('#handbookModalBackdrop');
    if (btnCloseH) btnCloseH.addEventListener('click', () => { this.showingHandbookModal = false; this.render(); });
    if (backdropH) backdropH.addEventListener('click', (e) => {
      if (e.target === backdropH) { this.showingHandbookModal = false; this.render(); }
    });

    const btnGraveyard = this.container.querySelector('#btnOpenGraveyard');
    if (btnGraveyard) {
      btnGraveyard.addEventListener('click', () => {
        this.showingGraveyardModal = true;
        soundManager.playCardFlip();
        this.render();
      });
    }
    const btnCloseG = this.container.querySelector('#btnCloseGraveyard');
    const backdropG = this.container.querySelector('#graveyardModalBackdrop');
    if (btnCloseG) btnCloseG.addEventListener('click', () => { this.showingGraveyardModal = false; this.render(); });
    if (backdropG) backdropG.addEventListener('click', (e) => {
      if (e.target === backdropG) { this.showingGraveyardModal = false; this.render(); }
    });

    // 12. Atajos y botones de sistema
    const btnSound = this.container.querySelector('#btnToggleSound');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        soundManager.toggleMute();
        this.render();
      });
    }

    const btnLog = this.container.querySelector('#btnToggleLog');
    if (btnLog) {
      btnLog.addEventListener('click', () => {
        const logDrawer = document.querySelector('.log-drawer-container');
        if (logDrawer) logDrawer.classList.toggle('open');
      });
    }

    const btnAbandon = this.container.querySelector('#btnAbandonGame');
    if (btnAbandon) {
      btnAbandon.addEventListener('click', () => {
        if (confirm('¿Deseas abandonar la partida actual y volver a la configuración?')) {
          gameState.setStatus('CONFIG');
        }
      });
    }
  }
}
