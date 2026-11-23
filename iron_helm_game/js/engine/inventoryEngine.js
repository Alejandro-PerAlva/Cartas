/**
 * IRON HELM - Motor de Inventario y Equipamiento
 */

import { EQUIPMENT } from '../data/equipment.js';
import { POTIONS } from '../data/potions.js';
import { logger } from '../utils/logger.js';

export class InventoryEngine {
  constructor(game) {
    this.game = game;
  }

  // Obtiene el peso total actual que lleva el héroe
  getCurrentWeight() {
    let weight = 0;
    const hero = this.game.hero;
    if (!hero) return 0;

    // Equipados
    Object.values(hero.equipped).forEach(item => {
      if (item) weight += (item.weight || 0);
    });

    // Mochila
    hero.backpack.forEach(item => {
      weight += (item.weight || 0);
    });

    return weight;
  }

  getMaxEncumbrance() {
    const base = this.game.hero.encumbranceMax || 10;
    let bonus = 0;
    // Riñonera u otros accesorios
    if (this.game.hero.equipped.AC && this.game.hero.equipped.AC.encumbranceBonus) {
      bonus += this.game.hero.equipped.AC.encumbranceBonus;
    }
    return base + bonus;
  }

  // Comprueba si un objeto puede equiparse en su slot
  canEquip(item) {
    const hero = this.game.hero;
    if (!item || !item.slot) return false;

    // Si es arma a 2 manos (2M), necesita ambas manos libres o desequipar MP y OM
    return true;
  }

  equip(item, fromBackpackIndex = null) {
    const hero = this.game.hero;
    if (!item) return false;

    // Desequipar slot existente si está ocupado
    if (item.slot === '2M') {
      if (hero.equipped.MP) this.unequip('MP');
      if (hero.equipped.OM) this.unequip('OM');
      hero.equipped.MP = item;
      hero.equipped.OM = { name: '(Ocupada por 2M)', isTwoHandSlot: true };
    } else if (item.slot === 'MP') {
      if (hero.equipped.MP && hero.equipped.MP.slot === '2M') {
        hero.equipped.OM = null;
      }
      if (hero.equipped.MP) this.unequip('MP');
      hero.equipped.MP = item;
    } else if (item.slot === 'OM') {
      if (hero.equipped.MP && hero.equipped.MP.slot === '2M') {
        this.unequip('MP');
      }
      if (hero.equipped.OM && !hero.equipped.OM.isTwoHandSlot) {
        this.unequip('OM');
      }
      hero.equipped.OM = item;
    } else if (item.slot === 'CP') {
      if (hero.equipped.CP) this.unequip('CP');
      hero.equipped.CP = item;
    } else if (item.slot === 'CA') {
      if (hero.equipped.CA) this.unequip('CA');
      hero.equipped.CA = item;
    } else if (item.slot === 'AC') {
      if (hero.equipped.AC) this.unequip('AC');
      hero.equipped.AC = item;
    }

    if (fromBackpackIndex !== null) {
      hero.backpack.splice(fromBackpackIndex, 1);
    }

    logger.inventory(`Equipado: ${item.name} en slot ${item.slot}`);
    return true;
  }

  unequip(slot) {
    const hero = this.game.hero;
    const item = hero.equipped[slot];
    if (!item || item.isTwoHandSlot) return;

    hero.equipped[slot] = null;
    if (item.slot === '2M') {
      hero.equipped.OM = null;
    }

    hero.backpack.push(item);
    logger.inventory(`Desequipado ${item.name} a la mochila.`);
  }

  // Añadir objeto a la mochila (comprueba límite de peso)
  addToBackpack(item) {
    const currentWeight = this.getCurrentWeight();
    const maxWeight = this.getMaxEncumbrance();

    if (currentWeight + (item.weight || 0) > maxWeight) {
      logger.inventory(`¡Carga máxima superada! No puedes cargar ${item.name} (${item.weight} peso).`, { currentWeight, maxWeight });
      return { success: false, reason: 'OVERBURDENED' };
    }

    this.game.hero.backpack.push(item);
    logger.inventory(`Añadido a mochila: ${item.name}`);
    return { success: true };
  }

  dropItem(backpackIndex) {
    const item = this.game.hero.backpack[backpackIndex];
    if (item) {
      this.game.hero.backpack.splice(backpackIndex, 1);
      logger.inventory(`Descartado: ${item.name}`);
    }
  }

  // Valor total de reducción de daño por armadura
  getArmorReduction(isInitialDamage = false) {
    let total = 0;
    const hero = this.game.hero;
    if (!hero) return 0;

    Object.values(hero.equipped).forEach(item => {
      if (item && !item.isTwoHandSlot) {
        if (isInitialDamage && item.armorValueInitial) {
          total += item.armorValueInitial;
        } else if (!isInitialDamage && item.armorValueCounter) {
          total += item.armorValueCounter;
        }
      }
    });
    return total;
  }

  // Modificador de ataque de armas
  getWeaponAttackBonus() {
    let bonus = 0;
    const hero = this.game.hero;
    if (hero && hero.equipped.MP && hero.equipped.MP.attackBonus) {
      bonus += hero.equipped.MP.attackBonus;
    }
    return bonus;
  }
}
