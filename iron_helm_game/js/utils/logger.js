/**
 * IRON HELM DIGITAL - Sistema de Logging Estructurado
 * Permite registrar eventos categorizados, mantener historial y emitir eventos a la UI y consola de debug.
 */

export const LogCategory = {
  GAME: 'GAME',
  EXPLORATION: 'EXPLORATION',
  COMBAT: 'COMBAT',
  INVENTORY: 'INVENTORY',
  EXPANSION: 'EXPANSION',
  DEBUG: 'DEBUG'
};

class GameLogger {
  constructor() {
    this.logs = [];
    this.listeners = [];
    this.maxLogs = 500;
  }

  log(category, message, details = null) {
    const entry = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toLocaleTimeString(),
      category,
      message,
      details
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Notificar a listeners (UI panels)
    this.listeners.forEach(fn => fn(entry));

    // Console output con colores
    const colors = {
      [LogCategory.GAME]: 'color: #f59e0b; font-weight: bold',
      [LogCategory.EXPLORATION]: 'color: #10b981; font-weight: bold',
      [LogCategory.COMBAT]: 'color: #ef4444; font-weight: bold',
      [LogCategory.INVENTORY]: 'color: #3b82f6; font-weight: bold',
      [LogCategory.EXPANSION]: 'color: #8b5cf6; font-weight: bold',
      [LogCategory.DEBUG]: 'color: #ec4899; font-weight: bold'
    };

    console.log(`%c[${entry.category}] %c${entry.message}`, colors[category] || '', 'color: inherit', details || '');
    return entry;
  }

  game(msg, details) { return this.log(LogCategory.GAME, msg, details); }
  explore(msg, details) { return this.log(LogCategory.EXPLORATION, msg, details); }
  combat(msg, details) { return this.log(LogCategory.COMBAT, msg, details); }
  inventory(msg, details) { return this.log(LogCategory.INVENTORY, msg, details); }
  expansion(msg, details) { return this.log(LogCategory.EXPANSION, msg, details); }
  debug(msg, details) { return this.log(LogCategory.DEBUG, msg, details); }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(fn => fn !== listener);
    };
  }

  getLogs(category = null) {
    if (!category || category === 'ALL') return this.logs;
    return this.logs.filter(l => l.category === category);
  }

  clear() {
    this.logs = [];
    this.listeners.forEach(fn => fn({ type: 'CLEAR' }));
  }

  exportJson() {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new GameLogger();
