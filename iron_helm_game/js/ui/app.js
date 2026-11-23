/**
 * IRON HELM DIGITAL - Coordinador Principal de la Aplicación (App Router Tabletop)
 */

import { gameState } from '../engine/gameState.js';
import { ConfigMenuView } from './configMenu.js';
import { TabletopBoardView } from './tabletopBoardView.js';
import { DungeonMatView } from './dungeonMatView.js';
import { CharacterMatView } from './characterMatView.js';
import { CombatArenaView } from './combatArenaView.js';
import { CardInteractionModalView } from './cardInteractionModal.js';
import { MerchantModalView } from './merchantModal.js';
import { LogPanelView } from './logPanel.js';
import { DebugConsoleView } from './debugConsole.js';
import { CardModalView } from './cardModal.js';
import { EndGameModalView } from './endGameModal.js';
import { InventoryFanView } from './inventoryFanView.js';
import { soundManager } from '../utils/audio.js';

class AppController {
  constructor() {
    this.root = document.getElementById('app');
    this.gameState = gameState;

    this.configView = null;
    this.tabletopView = null;
    this.dungeonView = null;
    this.characterView = null;
    this.combatView = null;
    this.interactionView = null;
    this.merchantView = null;
    this.logView = null;
    this.debugView = null;
    this.cardModalView = null;
    this.endGameView = null;
    this.inventoryFanView = null;

    this.init();
  }

  init() {
    this.root.innerHTML = `
      <div id="mainViewContainer"></div>
      <div id="inventoryFanContainer"></div>
      <div id="modalOverlayContainer"></div>
      <div id="logContainer"></div>
      <div id="debugContainer"></div>
      <div id="cardZoomContainer"></div>
    `;

    this.logView = new LogPanelView(document.getElementById('logContainer'));
    this.debugView = new DebugConsoleView(document.getElementById('debugContainer'));
    this.cardModalView = new CardModalView(document.getElementById('cardZoomContainer'));
    this.endGameView = new EndGameModalView(document.getElementById('modalOverlayContainer'));
    this.inventoryFanView = new InventoryFanView(document.getElementById('inventoryFanContainer'));

    gameState.subscribe(() => {
      this.render();
    });

    this.bindKeyboardShortcuts();
    this.render();
  }

  render() {
    const main = document.getElementById('mainViewContainer');
    const modal = document.getElementById('modalOverlayContainer');
    const handContainer = document.getElementById('inventoryFanContainer');

    // 1. Configuración de Partida
    if (gameState.status === 'CONFIG') {
      main.innerHTML = '<div id="configView"></div>';
      modal.innerHTML = '';
      handContainer.innerHTML = '';
      this.tabletopView = null;
      this.dungeonView = null;
      this.characterView = null;
      this.configView = new ConfigMenuView(document.getElementById('configView'));
      this.configView.render();
      this.logView.render();
      this.debugView.render();
      return;
    }

    // 2. Tablero de Juego (Simulador Físico Tabletop de Iron Helm)
    if (!this.tabletopView || !document.getElementById('tabletopBoardMount')) {
      main.innerHTML = `<div id="tabletopBoardMount"></div>`;
      this.tabletopView = new TabletopBoardView(document.getElementById('tabletopBoardMount'));
      // Mantener alias para compatibilidad
      this.dungeonView = this.tabletopView;
      this.characterView = this.tabletopView;
    }

    this.tabletopView.render();
    this.inventoryFanView.render();
    this.logView.render();
    this.debugView.render();

    // 3. Modales Tabletop de Interacción o Comercio (si aplican)
    if (gameState.status === 'CARD_INTERACTION' || gameState.status === 'CARD_CHOICE') {
      modal.innerHTML = '<div id="interactionViewMount"></div>';
      this.interactionView = new CardInteractionModalView(document.getElementById('interactionViewMount'));
      this.interactionView.render();
    } else if (gameState.status === 'MERCHANT') {
      modal.innerHTML = '<div id="merchantViewMount"></div>';
      this.merchantView = new MerchantModalView(document.getElementById('merchantViewMount'));
      this.merchantView.render();
    } else if (gameState.status === 'VICTORY' || gameState.status === 'GAMEOVER') {
      this.endGameView.render();
    } else {
      modal.innerHTML = '';
    }
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // D -> Debug console toggle (discreto para desarrolladores)
      if (e.key === 'd' || e.key === 'D') {
        const container = document.querySelector('.debug-floating-container');
        if (container) {
          container.classList.toggle('visible');
          container.classList.toggle('open');
        }
      }
      // L -> Log drawer toggle
      if (e.key === 'l' || e.key === 'L') {
        const drawer = document.querySelector('.log-panel-drawer');
        if (drawer) {
          drawer.classList.toggle('visible');
          drawer.classList.toggle('open');
        }
      }
      // I o B -> Toggle Abanico de Mochila
      if (e.key === 'i' || e.key === 'I' || e.key === 'b' || e.key === 'B') {
        if (this.inventoryFanView) {
          this.inventoryFanView.toggle();
        }
      }
      // M -> Mute
      if (e.key === 'm' || e.key === 'M') {
        soundManager.toggleMute();
      }
    });
  }
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
  window.ironHelmApp = new AppController();
});
