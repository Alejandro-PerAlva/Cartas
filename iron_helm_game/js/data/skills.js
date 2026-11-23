/**
 * IRON HELM - Habilidades de Personajes
 * Dominios: AGILIDAD, MENTE, FUERZA
 */

export const SKILLS = [
  {
    id: 'esquivar',
    name: 'Esquivar',
    domain: 'AGILIDAD',
    energyCost: 1,
    image: 'assets/cards/base/card_050.jpg',
    description: 'Gasta 1 punto de Energía durante un ataque enemigo para restar 1 al daño que recibas.',
    canUseInCombat: true,
    executeInCombat(player, combat) {
      if (player.energy >= 1) {
        player.energy -= 1;
        combat.damageReduction = (combat.damageReduction || 0) + 1;
        return '¡Te arqueas y esquivas parte del impacto (-1 Energía, -1 Daño recibido)!';
      }
      return 'No tienes suficiente energía para esquivar.';
    }
  },
  {
    id: 'alquimia',
    name: 'Alquimia',
    domain: 'MENTE',
    energyCost: 1,
    image: 'assets/cards/base/card_051.jpg',
    description: 'Gasta 1 de Energía para destilar un brebaje purificador: cura 2 de salud o quita 1 veneno.',
    canUseOutOfCombat: true,
    executeOutOfCombat(player) {
      if (player.energy >= 1) {
        player.energy -= 1;
        if (player.poison > 0) {
          player.poison -= 1;
          return 'Transmutas hierbas y neutralizas 1 ficha de veneno (-1 Energía).';
        } else {
          player.hp = Math.min(player.maxHp, player.hp + 2);
          return 'Destilas un ungüento curativo que te restaura +2 de Salud (-1 Energía).';
        }
      }
      return 'No tienes suficiente energía para practicar alquimia.';
    }
  },
  {
    id: 'ocultacion',
    name: 'Ocultación',
    domain: 'AGILIDAD',
    energyCost: 2,
    image: 'assets/cards/base/card_052.jpg',
    description: 'Gasta 2 de Energía para desvanecerte entre las sombras y huir del combate (excepto Jefes).',
    canUseInCombat: true,
    executeInCombat(player, combat) {
      if (combat.isBoss) {
        return '¡No puedes huir del Jefe Final!';
      }
      if (player.energy >= 2) {
        player.energy -= 2;
        combat.escaped = true;
        return '¡Arrojas polvo a los ojos de tu enemigo y te desvaneces en la penumbra!';
      }
      return 'Necesitas 2 de energía para ocultarte.';
    }
  },
  {
    id: 'bloquear',
    name: 'Bloquear',
    domain: 'FUERZA',
    energyCost: 1,
    image: 'assets/cards/base/card_053.jpg',
    description: 'Gasta 1 de Energía para plantar firmemente tu escudo o arma, absorbiendo 2 puntos de daño.',
    canUseInCombat: true,
    executeInCombat(player, combat) {
      if (player.energy >= 1) {
        player.energy -= 1;
        combat.damageReduction = (combat.damageReduction || 0) + 2;
        return '¡Afianzas tu guardia y absorbes 2 puntos de daño (-1 Energía)!';
      }
      return 'No tienes suficiente energía para bloquear.';
    }
  },
  {
    id: 'divinidad',
    name: 'Divinidad',
    domain: 'FUERZA',
    energyCost: 2,
    image: 'assets/cards/base/card_054.jpg',
    description: 'Gasta 2 de Energía para invocar la bendición de los dioses: cura 2 de salud y elimina 1 veneno.',
    canUseOutOfCombat: true,
    executeOutOfCombat(player) {
      if (player.energy >= 2) {
        player.energy -= 2;
        player.hp = Math.min(player.maxHp, player.hp + 2);
        if (player.poison > 0) player.poison -= 1;
        return 'Una luz divina te envuelve: +2 Salud y -1 Veneno (-2 Energía).';
      }
      return 'Necesitas 2 de energía para rezar por divinidad.';
    }
  },
  {
    id: 'golpe_brutal',
    name: 'Golpe Brutal',
    domain: 'FUERZA',
    energyCost: 2,
    image: 'assets/cards/base/card_050.jpg',
    description: 'Gasta 2 de Energía adicionales al atacar para infligir +3 de daño contundente garantizado.',
    canUseInCombat: true,
    executeInCombat(player, combat) {
      if (player.energy >= 2) {
        player.energy -= 2;
        combat.attackBonus = (combat.attackBonus || 0) + 3;
        return '¡Cargas toda tu masa muscular en el golpe (+3 daño, -2 Energía)!';
      }
      return 'No tienes suficiente energía.';
    }
  },
  {
    id: 'dominio_hacha',
    name: 'Dominio del Hacha',
    domain: 'FUERZA',
    energyCost: 1,
    image: 'assets/cards/expansions/warren/card_026.jpg',
    description: 'Gasta 1 de Energía para hendir tu hacha con violencia bárbara: suma +2 al daño de impacto.',
    canUseInCombat: true,
    executeInCombat(player, combat) {
      if (player.energy >= 1) {
        player.energy -= 1;
        combat.attackBonus = (combat.attackBonus || 0) + 2;
        return '¡Blandes tu hacha con violencia bárbara (+2 Daño, -1 Energía)!';
      }
      return 'No tienes suficiente energía.';
    }
  },
  {
    id: 'nigromancia',
    name: 'Nigromancia',
    domain: 'MENTE',
    energyCost: 2,
    image: 'assets/cards/expansions/blackened/card_010.jpg',
    description: 'Gasta 2 de Energía para canalizar el dolor ajeno: drena 2 de salud al enemigo para restaurar la tuya.',
    canUseInCombat: true,
    executeInCombat(player, combat) {
      if (player.energy >= 2) {
        player.energy -= 2;
        combat.attackBonus = (combat.attackBonus || 0) + 2;
        player.hp = Math.min(player.maxHp, player.hp + 2);
        return '¡Canalizas sombras oscuras: infliges +2 Daño y recuperas +2 Salud (-2 Energía)!';
      }
      return 'No tienes suficiente energía para practicar Nigromancia.';
    }
  }
];
