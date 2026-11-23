/**
 * IRON HELM - Panel de Registro de Eventos (Event Log Panel)
 */

import { logger, LogCategory } from '../utils/logger.js';

export class LogPanelView {
  constructor(container) {
    this.container = container;
    this.isOpen = false;
    this.activeFilter = 'ALL';
    logger.subscribe(() => {
      if (this.isOpen) this.renderLogs();
    });
  }

  render() {
    this.container.innerHTML = `
      <div class="log-panel-drawer ${this.isOpen ? 'open' : ''}">
        <div class="log-panel-toggle" id="btnToggleLog" title="Abrir/Cerrar Registro de Partida">
          <span>📜 Registro</span>
        </div>

        <div class="log-panel-content">
          <div class="log-panel-header">
            <h3>Registro de la Mazmorra</h3>
            <div class="log-actions">
              <button class="btn-log-action" id="btnClearLog">Limpiar</button>
              <button class="btn-log-action" id="btnCloseLog">✕</button>
            </div>
          </div>

          <!-- Filtros de categoría -->
          <div class="log-filter-tabs">
            <button class="log-tab ${this.activeFilter === 'ALL' ? 'active' : ''}" data-cat="ALL">Todos</button>
            <button class="log-tab ${this.activeFilter === LogCategory.COMBAT ? 'active' : ''}" data-cat="${LogCategory.COMBAT}">Combate</button>
            <button class="log-tab ${this.activeFilter === LogCategory.EXPLORATION ? 'active' : ''}" data-cat="${LogCategory.EXPLORATION}">Exploración</button>
            <button class="log-tab ${this.activeFilter === LogCategory.INVENTORY ? 'active' : ''}" data-cat="${LogCategory.INVENTORY}">Inventario</button>
            <button class="log-tab ${this.activeFilter === LogCategory.DEBUG ? 'active' : ''}" data-cat="${LogCategory.DEBUG}">Debug</button>
          </div>

          <!-- Lista de entradas de log -->
          <div class="log-entries-list" id="logEntriesList">
            <!-- Renderizado dinámico -->
          </div>
        </div>
      </div>
    `;

    this.renderLogs();
    this.bindEvents();
  }

  renderLogs() {
    const list = this.container.querySelector('#logEntriesList');
    if (!list) return;

    const entries = logger.getLogs(this.activeFilter);
    if (entries.length === 0) {
      list.innerHTML = '<div class="empty-logs">No hay eventos registrados en esta categoría.</div>';
      return;
    }

    list.innerHTML = entries.map(e => `
      <div class="log-entry-row ${e.category.toLowerCase()}">
        <span class="log-time">${e.timestamp}</span>
        <span class="log-cat">[${e.category}]</span>
        <span class="log-msg">${e.message}</span>
      </div>
    `).join('');
  }

  bindEvents() {
    const btnToggle = this.container.querySelector('#btnToggleLog');
    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        this.isOpen = !this.isOpen;
        this.container.querySelector('.log-panel-drawer').classList.toggle('open', this.isOpen);
        if (this.isOpen) this.renderLogs();
      });
    }

    const btnClose = this.container.querySelector('#btnCloseLog');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.isOpen = false;
        this.container.querySelector('.log-panel-drawer').classList.remove('open');
      });
    }

    const btnClear = this.container.querySelector('#btnClearLog');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        logger.clear();
        this.renderLogs();
      });
    }

    this.container.querySelectorAll('.log-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.activeFilter = e.currentTarget.dataset.cat;
        this.container.querySelectorAll('.log-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.renderLogs();
      });
    });
  }
}
