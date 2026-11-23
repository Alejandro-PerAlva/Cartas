/**
 * IRON HELM - Menú de Configuración y Selección Inicial
 */

import { CHARACTERS } from '../data/characters.js';
import { EXPANSIONS } from '../data/expansions.js';
import { gameState } from '../engine/gameState.js';
import { soundManager } from '../utils/audio.js';

export class ConfigMenuView {
  constructor(container) {
    this.container = container;
    this.selectedCharId = 'fayon';
    this.selectedMode = 'CAMPAIGN'; // 'CAMPAIGN', 'MODULAR', 'ANEMIA'
    this.selectedCampaignId = 'base';
    this.enabledModularExpansions = new Set(['loot_lore', 'fanny_pack']);
    this.selectedDifficulty = 'NORMAL';
  }

  render() {
    this.container.innerHTML = `
      <div class="config-screen">
        <header class="config-header">
          <div class="title-container">
            <h1 class="game-logo">IRON HELM</h1>
            <p class="game-subtitle">VERSIÓN DIGITAL WEB · EDICIÓN INTEGRAL</p>
          </div>
          <div class="version-tag">Juego Base 2.4 + 15 Expansiones Oficiales + Fanmade Anemia</div>
        </header>

        <div class="config-grid">
          <!-- SECCIÓN IZQUIERDA: MODO DE JUEGO Y EXPANSIONES -->
          <div class="config-panel left-panel">
            <h2 class="section-title">
              <span class="icon">📜</span> 1. Modo de Juego y Expansiones
            </h2>

            <div class="mode-tabs">
              <button class="mode-tab ${this.selectedMode === 'CAMPAIGN' ? 'active' : ''}" data-mode="CAMPAIGN">
                Aventura / Campaña
              </button>
              <button class="mode-tab ${this.selectedMode === 'MODULAR' ? 'active' : ''}" data-mode="MODULAR">
                Sandbox Modular
              </button>
              <button class="mode-tab ${this.selectedMode === 'ANEMIA' ? 'active' : ''}" data-mode="ANEMIA">
                Expansión Anemia
              </button>
            </div>

            <div class="mode-content-area" id="modeContent">
              <!-- Renderizado dinámico según el modo -->
            </div>

            <div class="difficulty-box">
              <label class="config-label">Dificultad:</label>
              <div class="difficulty-options">
                <button class="diff-btn ${this.selectedDifficulty === 'EXPLORER' ? 'active' : ''}" data-diff="EXPLORER">
                  Explorador (+1 Ración, +2 Salud)
                </button>
                <button class="diff-btn ${this.selectedDifficulty === 'NORMAL' ? 'active' : ''}" data-diff="NORMAL">
                  Estándar (Reglas Oficiales)
                </button>
                <button class="diff-btn ${this.selectedDifficulty === 'HARD' ? 'active' : ''}" data-diff="HARD">
                  Pesadilla (+1 Daño Enemigos)
                </button>
              </div>
            </div>
          </div>

          <!-- SECCIÓN DERECHA: SELECCIÓN DE HÉROE -->
          <div class="config-panel right-panel">
            <h2 class="section-title">
              <span class="icon">🛡️</span> 2. Elige a tu Héroe
            </h2>

            <div class="heroes-carousel" id="heroesCarousel">
              ${CHARACTERS.map(char => `
                <div class="hero-card-select ${this.selectedCharId === char.id ? 'selected' : ''}" data-id="${char.id}">
                  <div class="hero-thumb-wrapper">
                    <img src="${char.image}" alt="${char.name}" class="hero-thumb" />
                    <span class="domain-pill ${char.domain.toLowerCase()}">${char.domain}</span>
                  </div>
                  <div class="hero-info">
                    <h3 class="hero-name">${char.name}</h3>
                    <p class="hero-title">${char.title}</p>
                    <div class="hero-stats-row">
                      <span class="stat-badge hp">❤️ ${char.health} HP</span>
                      <span class="stat-badge energy">⚡ ${char.energy} EN</span>
                      <span class="stat-badge carry">🎒 ${char.encumbrance} Carga</span>
                    </div>
                    <div class="hero-skill-row">
                      <strong>Habilidad:</strong> ${char.skill}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- FOOTER: BOTÓN DE INICIO -->
        <div class="config-footer">
          <div class="summary-text" id="configSummary"></div>
          <button class="btn-start-adventure" id="btnStartGame">
            <span class="btn-glow"></span>
            <span class="btn-text">⚔️ ENTRAR EN LA MAZMORRA ⚔️</span>
          </button>
        </div>
      </div>
    `;

    this.renderModeContent();
    this.updateSummary();
    this.bindEvents();
  }

  renderModeContent() {
    const container = this.container.querySelector('#modeContent');
    if (!container) return;

    if (this.selectedMode === 'CAMPAIGN') {
      const campaigns = EXPANSIONS.filter(e => e.type === 'CORE' || e.type === 'CAMPAIGN');
      container.innerHTML = `
        <p class="mode-desc">Selecciona el escenario de tu aventura. Cada campaña introduce su propia mazmorra y Jefe temático:</p>
        <div class="campaign-list">
          ${campaigns.map(camp => `
            <label class="campaign-radio-card ${this.selectedCampaignId === camp.id ? 'active' : ''}">
              <input type="radio" name="campaign" value="${camp.id}" ${this.selectedCampaignId === camp.id ? 'checked' : ''} />
              <div class="campaign-card-content">
                <div class="camp-title">${camp.name}</div>
                <div class="camp-desc">${camp.description}</div>
              </div>
            </label>
          `).join('')}
        </div>
      `;
    } else if (this.selectedMode === 'MODULAR') {
      const modular = EXPANSIONS.filter(e => e.type === 'MODULAR');
      container.innerHTML = `
        <p class="mode-desc">Juega con el Juego Base y añade las expansiones de equipo, botín y mecánicas que prefieras:</p>
        <div class="modular-list">
          ${modular.map(exp => `
            <label class="modular-checkbox-card ${this.enabledModularExpansions.has(exp.id) ? 'active' : ''}">
              <input type="checkbox" value="${exp.id}" ${this.enabledModularExpansions.has(exp.id) ? 'checked' : ''} />
              <div class="modular-card-content">
                <div class="exp-title">${exp.name}</div>
                <div class="exp-desc">${exp.description}</div>
              </div>
            </label>
          `).join('')}
        </div>
      `;
    } else if (this.selectedMode === 'ANEMIA') {
      const anemia = EXPANSIONS.find(e => e.id === 'anemia');
      container.innerHTML = `
        <div class="anemia-showcase">
          <div class="anemia-badge">EXPANSIÓN FANMADE 4.0</div>
          <h3>${anemia.name}</h3>
          <p class="anemia-desc">${anemia.description}</p>
          <div class="anemia-features">
            <div class="feat-item">🩸 Sistema de Sangrado y Heridas abiertas</div>
            <div class="feat-item">💀 20+ Cartas de aflicción y supervivencia extrema</div>
            <div class="feat-item">📜 Reglamento oficial 4.0 de la comunidad integrado</div>
          </div>
        </div>
      `;
    }
  }

  updateSummary() {
    const summary = this.container.querySelector('#configSummary');
    if (!summary) return;

    const char = CHARACTERS.find(c => c.id === this.selectedCharId) || CHARACTERS[0];
    let modeText = '';
    if (this.selectedMode === 'CAMPAIGN') {
      const camp = EXPANSIONS.find(e => e.id === this.selectedCampaignId);
      modeText = `Campaña: ${camp ? camp.name : 'Juego Base'}`;
    } else if (this.selectedMode === 'MODULAR') {
      modeText = `Sandbox: Base + ${this.enabledModularExpansions.size} Expansiones`;
    } else {
      modeText = 'Modo Especial: Expansión Fanmade Anemia 4.0';
    }

    summary.innerHTML = `
      <span class="summary-item">Héroe: <strong>${char.name} (${char.domain})</strong></span> · 
      <span class="summary-item">${modeText}</span> · 
      <span class="summary-item">Dificultad: <strong>${this.selectedDifficulty}</strong></span>
    `;
  }

  bindEvents() {
    // Cambio de modo
    this.container.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.selectedMode = e.currentTarget.dataset.mode;
        this.container.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.renderModeContent();
        this.updateSummary();
        soundManager.playCardFlip();
      });
    });

    // Delegación para campañas / modular
    this.container.querySelector('#modeContent').addEventListener('change', (e) => {
      if (e.target.name === 'campaign') {
        this.selectedCampaignId = e.target.value;
        this.renderModeContent();
        this.updateSummary();
        soundManager.playCardFlip();
      } else if (e.target.type === 'checkbox') {
        const id = e.target.value;
        if (e.target.checked) this.enabledModularExpansions.add(id);
        else this.enabledModularExpansions.delete(id);
        this.renderModeContent();
        this.updateSummary();
        soundManager.playCardFlip();
      }
    });

    // Selección de Dificultad
    this.container.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectedDifficulty = e.currentTarget.dataset.diff;
        this.container.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.updateSummary();
        soundManager.playCardFlip();
      });
    });

    // Selección de Héroe
    this.container.querySelectorAll('.hero-card-select').forEach(card => {
      card.addEventListener('click', (e) => {
        this.selectedCharId = e.currentTarget.dataset.id;
        this.container.querySelectorAll('.hero-card-select').forEach(c => c.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        this.updateSummary();
        soundManager.playCardFlip();
      });
    });

    // Botón Iniciar Partida
    const btnStart = this.container.querySelector('#btnStartGame');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        soundManager.playSwordHit();
        const config = {
          mode: this.selectedMode,
          campaignId: this.selectedMode === 'CAMPAIGN' ? this.selectedCampaignId : 'base',
          enabledExpansions: this.selectedMode === 'MODULAR' 
            ? ['base', ...Array.from(this.enabledModularExpansions)]
            : (this.selectedMode === 'ANEMIA' ? ['base', 'anemia'] : ['base', this.selectedCampaignId]),
          difficulty: this.selectedDifficulty
        };
        gameState.startNewGame(this.selectedCharId, config);
      });
    }
  }
}
