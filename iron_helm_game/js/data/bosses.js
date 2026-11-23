/**
 * IRON HELM - Jefes Finales (Base + Expansiones)
 */

export const BOSSES = [
  // Jefes del Juego Base (Determinados por la debilidad predominante en el Cementerio)
  {
    id: 'merodeador',
    code: 'B1',
    name: 'Merodeador',
    title: 'El Ojo de las Profundidades',
    health: 22,
    damage: 5,
    treasureType: 2,
    weakness: 'HIELO', // Vulnerable a daño de hielo
    ability: 'Ignora las bonificaciones defensivas de escudos y broqueles.',
    image: 'assets/cards/base/card_005.jpg',
    onEnemyAttack(player, combat) {
      combat.ignoreShields = true;
    }
  },
  {
    id: 'naga',
    code: 'B2',
    name: 'Naga',
    title: 'La Serpiente de la Desolación',
    health: 21,
    damage: 3,
    treasureType: 2,
    weakness: 'FUEGO', // Vulnerable a fuego
    ability: 'Cada vez que te impacta con éxito, ganas 2 fichas de veneno.',
    image: 'assets/cards/base/card_006.jpg',
    onEnemyHit(player, combat) {
      player.poison += 2;
      combat.log.push('¡La Naga te inyecta 2 fichas de veneno!');
    }
  },
  {
    id: 'lich',
    code: 'B3',
    name: 'Lich',
    title: 'El Soberano No Muerto',
    health: 20,
    damage: 4,
    treasureType: 2,
    weakness: 'NO_MUERTO', // Vulnerable a agua bendita / no muerto
    ability: 'Cuando impacta con su ataque inicial o contraataque, te roba 2 de energía.',
    image: 'assets/cards/base/card_007.jpg',
    onEnemyHit(player, combat) {
      const stolen = Math.min(2, player.energy);
      player.energy -= stolen;
      combat.log.push(`¡El Lich absorbe ${stolen} de tu energía!`);
    }
  },

  // Jefes de Campañas / Expansiones
  {
    id: 'vermin_king',
    code: 'BOSS_WARREN',
    expansion: 'warren',
    name: 'El Rey de las Alimañas',
    title: 'Jefe de Warren of Despair',
    health: 24,
    damage: 4,
    treasureType: 2,
    weakness: 'FUEGO',
    ability: 'Invoca enjambres. Al inicio de cada turno de combate, sufres 1 punto de daño inevitable por alimañas.',
    image: 'assets/cards/expansions/warren/card_005.jpg',
    onRoundStart(player, combat) {
      player.hp -= 1;
      combat.log.push('¡El enjambre de alimañas te muerde infligiéndote 1 de daño!');
    }
  },
  {
    id: 'lord_of_embers',
    code: 'BOSS_EMBERS',
    expansion: 'throne_of_embers',
    name: 'Señor de las Ascuas',
    title: 'Tirano del Trono de Fuego',
    health: 25,
    damage: 5,
    treasureType: 2,
    weakness: 'HIELO',
    ability: 'Quema el equipamiento. Cada golpe exitoso te destruye 1 ración o te inflige 1 daño adicional.',
    image: 'assets/cards/base/card_005.jpg'
  },
  {
    id: 'abyss_shadow',
    code: 'BOSS_ABYSS',
    expansion: 'howling_abyss',
    name: 'La Sombra del Abismo',
    title: 'Horror Primigenio de las Nieves',
    health: 26,
    damage: 4,
    treasureType: 2,
    weakness: 'FUEGO',
    ability: 'Frío glacial: El coste en energía de tus ataques aumenta en 1 ficha.',
    image: 'assets/cards/base/card_007.jpg'
  }
];
