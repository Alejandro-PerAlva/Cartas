/**
 * IRON HELM - Catálogo de Enemigos / Monstruos
 */

export const ENEMIES = [
  {
    id: 'skinkling',
    code: 'E3',
    name: 'Skinkling',
    health: 1,
    damage: 0,
    treasureType: 1, // 0: Nada, 1: Botín u Oro, 2: Botín y Poción
    gold: 1,
    weakness: 'FUEGO',
    ability: 'Ganas 1 ficha de veneno cuando te impacte con éxito.',
    image: 'assets/cards/base/card_025.jpg',
    onHit(player, combat) {
      player.poison += 1;
      combat.log.push('¡El Skinkling te envenena (+1 Veneno)!');
    }
  },
  {
    id: 'arquero_no_muerto',
    code: 'E6',
    name: 'Arquero No Muerto',
    health: 4,
    damage: 2,
    treasureType: 1,
    gold: 1,
    weakness: 'NO_MUERTO',
    ability: 'No puedes defenderte del daño inicial infligido (ignora armadura en el primer ataque).',
    image: 'assets/cards/base/card_020.jpg',
    onInitialAttack(player, combat) {
      combat.ignoreArmorInitial = true;
    }
  },
  {
    id: 'goblin_berserker',
    code: 'E1',
    name: 'Goblin Berserker',
    health: 6,
    damage: 2,
    treasureType: 1,
    gold: 1,
    weakness: 'FUEGO',
    ability: 'Furia ciega: Si su salud cae por debajo de 3, suma +1 a todos sus ataques.',
    image: 'assets/cards/base/card_021.jpg'
  },
  {
    id: 'lobo_sombras',
    code: 'E2',
    name: 'Lobo de las Sombras',
    health: 5,
    damage: 3,
    treasureType: 0,
    gold: 0,
    weakness: 'HIELO',
    ability: 'Mordisco salvaje: Al impactar, si la diferencia de dados fue 4+, inflige 1 daño adicional.',
    image: 'assets/cards/base/card_022.jpg'
  },
  {
    id: 'masa_devoradora',
    code: 'E4',
    name: 'Masa Devoradora',
    health: 8,
    damage: 1,
    treasureType: 1,
    gold: 1,
    weakness: 'FUEGO',
    ability: 'Cuerpo gelatinoso: Es inmune a las armas cortantes si no usas energía.',
    image: 'assets/cards/base/card_023.jpg'
  },
  {
    id: 'esqueleto_guerrero',
    code: 'E5',
    name: 'Esqueleto Guerrero',
    health: 5,
    damage: 2,
    treasureType: 1,
    gold: 1,
    weakness: 'NO_MUERTO',
    ability: 'Resistencia ósea: Resta 1 al daño recibido si el arma no es contundente (Maza/Martillo).',
    image: 'assets/cards/base/card_024.jpg'
  },
  {
    id: 'troll_cueva',
    code: 'E7',
    name: 'Troll de Cueva',
    health: 10,
    damage: 4,
    treasureType: 2,
    gold: 3,
    weakness: 'FUEGO',
    ability: 'Piel rocosa: Resta 1 a todo el daño que reciba.',
    image: 'assets/cards/base/card_026.jpg'
  },
  {
    id: 'necrofago',
    code: 'E8',
    name: 'Necrófago',
    health: 7,
    damage: 2,
    treasureType: 1,
    gold: 2,
    weakness: 'NO_MUERTO',
    ability: 'Parálisis cadavérica: Al impactar con éxito, pierdes 1 punto de energía adicional.',
    image: 'assets/cards/base/card_027.jpg',
    onHit(player, combat) {
      if (player.energy > 0) {
        player.energy -= 1;
        combat.log.push('¡El Necrófago drena 1 punto de tu energía!');
      }
    }
  },
  {
    id: 'serpiente_catacumba',
    code: 'E9',
    name: 'Serpiente de Catacumba',
    health: 3,
    damage: 1,
    treasureType: 0,
    gold: 0,
    weakness: 'HIELO',
    ability: 'Veneno neurotóxico: Ganas 1 ficha de veneno por cada impacto exitoso.',
    image: 'assets/cards/base/card_028.jpg',
    onHit(player, combat) {
      player.poison += 1;
      combat.log.push('¡La Serpiente inocula veneno (+1)!');
    }
  },
  {
    id: 'gargola_petrea',
    code: 'E10',
    name: 'Gárgola Pétrea',
    health: 8,
    damage: 3,
    treasureType: 1,
    gold: 2,
    weakness: 'HIELO',
    ability: 'Ataque en picado: El daño inicial del enemigo aumenta en +1.',
    image: 'assets/cards/base/card_029.jpg'
  },

  // Enemigos de Expansiones
  {
    id: 'rata_mutante',
    code: 'EXP_WARREN_E1',
    expansion: 'warren',
    name: 'Rata Mutante de Madriguera',
    health: 4,
    damage: 2,
    treasureType: 1,
    gold: 1,
    weakness: 'FUEGO',
    ability: 'Portador de plagas: Al final del combate, si te causó daño, ganas 1 ficha de veneno.',
    image: 'assets/cards/expansions/warren/card_010.jpg'
  },
  {
    id: 'demonio_cenizas',
    code: 'EXP_BEAST_E1',
    expansion: 'beasts',
    name: 'Demonio de Cenizas',
    health: 9,
    damage: 3,
    treasureType: 2,
    gold: 3,
    weakness: 'HIELO',
    ability: 'Aura ardiente: Sufres 1 de daño de calor al golpearle con armas cuerpo a cuerpo.',
    image: 'assets/cards/expansions/beasts/card_005.jpg'
  }
];
