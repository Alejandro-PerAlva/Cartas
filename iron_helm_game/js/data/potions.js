/**
 * IRON HELM - Pociones y Consumibles
 */

export const POTIONS = [
  {
    id: 'pocion_salud',
    code: 'L5',
    name: 'Poción de Salud',
    type: 'POTION',
    price: 1,
    weight: 1,
    slot: 'AC',
    image: 'assets/cards/base/card_040.jpg',
    description: 'Descartar en cualquier momento para recuperar 4 puntos de salud.',
    usableAnytime: true,
    use(player) {
      const healed = Math.min(4, player.maxHp - player.hp);
      player.hp += healed;
      return `Bebes la poción y recuperas ${healed} puntos de vida.`;
    }
  },
  {
    id: 'pocion_energia',
    code: 'L6',
    name: 'Poción de Energía',
    type: 'POTION',
    price: 1,
    weight: 1,
    slot: 'AC',
    image: 'assets/cards/base/card_041.jpg',
    description: 'Descartar en cualquier momento para recuperar 4 puntos de energía.',
    usableAnytime: true,
    use(player) {
      const restored = Math.min(4, player.maxEnergy - player.energy);
      player.energy += restored;
      return `Bebes la poción y recuperas ${restored} puntos de energía.`;
    }
  },
  {
    id: 'antidoto',
    code: 'L7',
    name: 'Antídoto',
    type: 'POTION',
    price: 1,
    weight: 1,
    slot: 'AC',
    image: 'assets/cards/base/card_042.jpg',
    description: 'Neutraliza toxinas. Descarta inmediatamente todas las fichas de veneno que tengas.',
    usableAnytime: true,
    use(player) {
      const cleared = player.poison;
      player.poison = 0;
      return `El antídoto purga el veneno de tu cuerpo (eliminadas ${cleared} fichas).`;
    }
  },
  {
    id: 'esquirla_hielo',
    code: 'L8',
    name: 'Esquirla de Hielo',
    type: 'COMBAT_POTION',
    price: 2,
    weight: 1,
    slot: 'AC',
    damageType: 'HIELO',
    image: 'assets/cards/base/card_043.jpg',
    description: 'Poción arrojadiza ofensiva. Inflige 2d6 de daño de frío ignorando la armadura del enemigo.',
    combatOnly: true,
    throw(combat, enemy) {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      let total = d1 + d2;
      if (enemy.weakness === 'HIELO') {
        total += 3;
      }
      enemy.hp -= total;
      return `¡Arrojas la Esquirla de Hielo [${d1}, ${d2}] infligiendo ${total} de daño helado al ${enemy.name}!`;
    }
  },
  {
    id: 'agua_bendita',
    code: 'L9',
    name: 'Agua Bendita',
    type: 'COMBAT_POTION',
    price: 2,
    weight: 1,
    slot: 'AC',
    damageType: 'NO_MUERTO',
    image: 'assets/cards/base/card_044.jpg',
    description: 'Poción sagrada. Inflige 3d6 de daño masivo contra enemigos No Muertos (o 1d6 a otros).',
    combatOnly: true,
    throw(combat, enemy) {
      const isUndead = enemy.weakness === 'NO_MUERTO';
      const diceCount = isUndead ? 3 : 1;
      let total = 0;
      const rolls = [];
      for (let i = 0; i < diceCount; i++) {
        const r = Math.floor(Math.random() * 6) + 1;
        rolls.push(r);
        total += r;
      }
      enemy.hp -= total;
      return `¡Rocías con Agua Bendita [${rolls.join(', ')}] infligiendo ${total} de daño sagrado al ${enemy.name}!`;
    }
  },
  {
    id: 'bomba_mecha',
    code: 'L10',
    name: 'Bomba de Mecha',
    type: 'COMBAT_POTION',
    price: 3,
    weight: 1,
    slot: 'AC',
    damageType: 'FUEGO',
    image: 'assets/cards/base/card_045.jpg',
    description: 'Artefacto explosivo. Inflige 3d6 de daño de fuego a cualquier enemigo.',
    combatOnly: true,
    throw(combat, enemy) {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      let total = d1 + d2 + d3;
      if (enemy.weakness === 'FUEGO') total += 2;
      enemy.hp -= total;
      return `¡BOOM! La Bomba estalla [${d1}, ${d2}, ${d3}] causando ${total} de daño de fuego al ${enemy.name}!`;
    }
  }
];
