/**
 * IRON HELM - Mazo de Mazmorra (Dungeon Deck)
 * Tipos:
 *   TIPO_1: Cartas narrativas / interactivas (Altar, Campamento, Claro, Mercader, Fuente)
 *   TIPO_2: Cartas con Opción 1 (revelada primera) y Opción 2 (revelada segunda obligatoria)
 */

export const DUNGEON_CARDS = [
  {
    id: 'd1_emboscada',
    code: 'D1',
    name: 'Emboscada',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_008.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Pillas a tu enemigo por sorpresa',
      description: 'Ganas la iniciativa y atacas primero. Roba 1 carta de Enemigo e ignora su daño inicial. Añade el nivel de mazmorra a su salud.',
      actionType: 'COMBAT',
      ambushType: 'PLAYER_AMBUSH', // Jugador tiene iniciativa, ignora daño inicial
      enemyHpBonus: 'LEVEL'
    },
    option2: {
      title: 'Tu enemigo te pilla por sorpresa',
      description: 'El enemigo gana la iniciativa. Roba 1 carta de Enemigo y añade el nivel de mazmorra a su daño inicial. Añade nivel de mazmorra + 4 a su salud.',
      actionType: 'COMBAT',
      ambushType: 'ENEMY_AMBUSH', // Enemigo ataca primero con daño potenciado
      enemyDamageBonus: 'LEVEL',
      enemyHpBonus: 'LEVEL_PLUS_4'
    }
  },
  {
    id: 'd2_escaramuza',
    code: 'D2',
    name: 'Escaramuza',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_012.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Combate frontal',
      description: 'Te topas con un enemigo en el pasillo. El enemigo ataca primero con su daño normal. Añade el nivel de mazmorra a su salud.',
      actionType: 'COMBAT',
      ambushType: 'NORMAL',
      enemyHpBonus: 'LEVEL'
    },
    option2: {
      title: 'Combate encarnizado',
      description: 'Enemigo hostil con posición ventajosa. Enemigo ataca primero con +1 al daño inicial. Añade nivel de mazmorra + 2 a su salud.',
      actionType: 'COMBAT',
      ambushType: 'NORMAL',
      enemyDamageBonus: 1,
      enemyHpBonus: 'LEVEL_PLUS_2'
    }
  },
  {
    id: 'd3_campamento',
    code: 'D3',
    name: 'Campamento',
    cardType: 'TIPO_1',
    image: 'assets/cards/base/card_014.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    description: 'Encuentras un rincón resguardado donde tomar un respiro.',
    choices: [
      {
        id: 'cook',
        label: 'Cocinar Ración',
        detail: 'Gasta 1 Ración para ganar 3 de Energía.',
        condition: (p) => p.rations > 0,
        execute(game) {
          game.hero.rations -= 1;
          game.hero.energy = Math.min(game.hero.maxEnergy, game.hero.energy + 3);
          return 'Cocinas un sustancioso plato al fuego: -1 Ración, +3 Energía.';
        }
      },
      {
        id: 'rest',
        label: 'Descanso Breve',
        detail: 'Recuperas 2 puntos de Salud y 1 de Energía.',
        execute(game) {
          game.hero.hp = Math.min(game.hero.maxHp, game.hero.hp + 2);
          game.hero.energy = Math.min(game.hero.maxEnergy, game.hero.energy + 1);
          return 'Descansas con la espalda contra la pared: +2 Salud, +1 Energía.';
        }
      },
      {
        id: 'search',
        label: 'Registrar Escombros',
        detail: 'Roba 1 carta del mazo de Botín.',
        execute(game) {
          const loot = game.drawLoot();
          return `Registras los restos y encuentras: ${loot.name}.`;
        }
      }
    ]
  },
  {
    id: 'd4_plantacion_setas',
    code: 'D4',
    name: 'Plantación de Setas',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_015.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Setas Jóvenes',
      description: 'Localizas un grupo de setas comestibles frescas. Ganas 1 ración.',
      actionType: 'REWARD',
      execute(game) {
        game.hero.rations += 1;
        return 'Recolectas setas nutritivas: +1 Ración.';
      }
    },
    option2: {
      title: 'Plantación Madura',
      description: 'Te adentras en una cámara subterránea repleta de hongos gigantes. Ganas 2 raciones.',
      actionType: 'REWARD',
      execute(game) {
        game.hero.rations += 2;
        return 'Llenas tu talego de hongos secos: +2 Raciones.';
      }
    }
  },
  {
    id: 'd5_altar',
    code: 'D5',
    name: 'Altar Olvidado',
    cardType: 'TIPO_1',
    image: 'assets/cards/base/card_016.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    description: 'Un antiguo santuario de piedra emana una débil energía sagrada.',
    choices: [
      {
        id: 'blessing',
        label: 'Rezar por Bendición',
        detail: 'Ganas 1 ficha de Bendición para usar antes del Jefe.',
        execute(game) {
          game.hero.blessings += 1;
          return 'Te arrodillas en plegaria: +1 Ficha de Bendición.';
        }
      },
      {
        id: 'cure_poison',
        label: 'Purificación',
        detail: 'Lanza 1d6 y descarta esa cantidad de fichas de veneno.',
        execute(game) {
          const roll = Math.floor(Math.random() * 6) + 1;
          const removed = Math.min(roll, game.hero.poison);
          game.hero.poison -= removed;
          return `El agua bendita del altar quema el veneno [1d6 = ${roll}]: eliminadas ${removed} fichas de veneno.`;
        }
      }
    ]
  },
  {
    id: 'd6_claro',
    code: 'D6',
    name: 'Claro en las Profundidades',
    cardType: 'TIPO_1',
    image: 'assets/cards/base/card_017.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    description: 'Una encrucijada en la mazmorra donde los ecos del destino resuenan.',
    choices: [
      {
        id: 'draw_plot',
        label: 'Averiguar qué acecha (Robar Carta de Trama)',
        detail: 'Roba inmediatamente una carta del mazo de Tramas y resuélvela.',
        execute(game) {
          return game.triggerPlotCard();
        }
      }
    ]
  },
  {
    id: 'd7_mercader',
    code: 'D7',
    name: 'Mercader Errante',
    cardType: 'TIPO_1',
    image: 'assets/cards/base/card_018.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    description: 'Un comerciante enano con una mula de carga ofrece sus mercancías.',
    choices: [
      {
        id: 'open_shop',
        label: 'Comerciar con el Mercader',
        detail: 'Abre la tienda para comprar o vender pociones, armas y raciones con tu oro.',
        execute(game) {
          game.openMerchant();
          return 'Abres el inventario del mercader.';
        }
      },
      {
        id: 'leave_merchant',
        label: 'Ignorar y Continuar',
        detail: 'No necesitas nada y sigues avanzando por el pasillo.',
        execute(game) {
          return 'Te despides del mercader y continúas explorando.';
        }
      }
    ]
  },
  {
    id: 'd8_laberinto',
    code: 'D8',
    name: 'Laberinto de Piedra',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_008.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Sendero Conocido',
      description: 'Encuentras marcas en la pared dejadas por otros aventureros. Cruzas sin peligro.',
      actionType: 'REWARD',
      execute(game) {
        return 'Sigues las marcas en la roca y sales rápidamente del laberinto.';
      }
    },
    option2: {
      title: 'Extravío en la Oscuridad',
      description: 'Los pasillos parecen repetirse infinitamente. Pierdes 2 puntos de Energía o sufres 2 de daño.',
      actionType: 'CHOICE',
      choices: [
        {
          label: 'Gastar 2 Energía',
          condition: (p) => p.energy >= 2,
          execute(game) {
            game.hero.energy -= 2;
            return 'Fuerzas el ritmo para salir del laberinto (-2 Energía).';
          }
        },
        {
          label: 'Recibir 2 de Daño',
          execute(game) {
            game.hero.hp -= 2;
            return 'Tropiezas y te raspas contra las rocas afiladas (-2 Salud).';
          }
        }
      ]
    }
  },
  {
    id: 'd9_trampa_flechas',
    code: 'D9',
    name: 'Trampa de Flechas',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_015.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Alerta Temprana',
      description: 'Ves una rendija en el muro a la altura del pecho. Pasas agachado sin activar el mecanismo.',
      actionType: 'REWARD',
      execute(game) {
        return '¡Esquivas la trampa de flechas con gran maestría!';
      }
    },
    option2: {
      title: '¡Mecanismo Activado!',
      description: 'Pisas una baldosa floja. Salen disparadas flechas oxidadas. Lanza 2d6 y resta tu armadura para determinar el daño.',
      actionType: 'TRAP',
      execute(game) {
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const totalRoll = Math.abs(d1 - d2);
        const armor = game.getPlayerArmor();
        const dmg = Math.max(0, totalRoll - armor);
        game.hero.hp -= dmg;
        return `¡Disparas la trampa [${d1}, ${d2} -> diff ${totalRoll}]! Armadura reduce ${armor}. Sufres ${dmg} daño.`;
      }
    }
  },
  {
    id: 'd10_tesoro_oculto',
    code: 'D10',
    name: 'Tesoro Oculto',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_017.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Cofre de Madera',
      description: 'Un cofre sin cerrar con llave. Ganas 2 Monedas de Oro y 1 carta de Botín.',
      actionType: 'REWARD',
      execute(game) {
        game.hero.gold += 2;
        const loot = game.drawLoot();
        return `Abres el cofre: +2 Oro y obtienes ${loot.name}.`;
      }
    },
    option2: {
      title: 'Cofre Trampeado',
      description: 'El cerrojo está atascado. Al forzarlo salta un resorte venenoso: ganas 3 Oro, 1 Poción, pero sufres 1 ficha de Veneno.',
      actionType: 'REWARD',
      execute(game) {
        game.hero.gold += 3;
        game.hero.poison += 1;
        const pot = game.drawPotion();
        return `Fuerzas el cofre: +3 Oro, obtienes ${pot.name}, pero el resorte te pincha (+1 Veneno).`;
      }
    }
  },
  {
    id: 'd11_cripta_olvidada',
    code: 'D11',
    name: 'Cripta Olvidada',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_008.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Sarcófago Sellado',
      description: 'Un antiguo sepulcro con grabados sagrados. Ganas 1 Bendición.',
      actionType: 'REWARD',
      execute(game) {
        game.hero.blessings += 1;
        return 'Rindes respeto a los antiguos reyes: +1 Bendición.';
      }
    },
    option2: {
      title: 'Espíritu Despertado',
      description: 'La tumba se abre y emerge un No Muerto. Combate contra un Arquero No Muerto con iniciativa para el enemigo.',
      actionType: 'COMBAT_SPECIFIC',
      enemyId: 'arquero_no_muerto',
      ambushType: 'ENEMY_AMBUSH'
    }
  },
  {
    id: 'd12_fuente_magica',
    code: 'D12',
    name: 'Fuente Mágica',
    cardType: 'TIPO_1',
    image: 'assets/cards/base/card_014.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    description: 'Un manantial subterráneo con aguas cristalinas que brillan en la penumbra.',
    choices: [
      {
        id: 'drink_health',
        label: 'Beber para Curar Salud',
        detail: 'Recuperas 3 puntos de Salud.',
        execute(game) {
          game.hero.hp = Math.min(game.hero.maxHp, game.hero.hp + 3);
          return 'Bebes de las aguas revitalizantes: +3 Salud.';
        }
      },
      {
        id: 'drink_energy',
        label: 'Beber para Restaurar Energía',
        detail: 'Recuperas 3 puntos de Energía.',
        execute(game) {
          game.hero.energy = Math.min(game.hero.maxEnergy, game.hero.energy + 3);
          return 'El agua fresca renueva tu vigor: +3 Energía.';
        }
      }
    ]
  },
  {
    id: 'd13_foso_estacas',
    code: 'D13',
    name: 'Foso con Estacas',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_015.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Salto Certero',
      description: 'Tomas carrerilla y saltas el abismo gastando 1 de Energía.',
      actionType: 'REWARD',
      execute(game) {
        if (game.hero.energy > 0) game.hero.energy -= 1;
        return 'Saltas con precisión al otro lado (-1 Energía).';
      }
    },
    option2: {
      title: 'Caída al Vacío',
      description: 'El borde se desmorona y caes a las estacas inferiores. Sufres 3 puntos de daño.',
      actionType: 'TRAP',
      execute(game) {
        game.hero.hp -= 3;
        return '¡Caes al foso y te clavas las estacas (-3 Salud)!';
      }
    }
  },
  {
    id: 'd14_guarida_bestias',
    code: 'D14',
    name: 'Guarida de Bestias',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_012.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Cubil Desierto',
      description: 'La criatura está cazando fuera. Encuentras huesos con carne fresca: ganas 1 Ración y 1 Botín.',
      actionType: 'REWARD',
      execute(game) {
        game.hero.rations += 1;
        const loot = game.drawLoot();
        return `Registras la guarida vacía: +1 Ración y encuentras ${loot.name}.`;
      }
    },
    option2: {
      title: '¡Bestia al Acecho!',
      description: 'La bestia está en su nido y se abalanza sobre ti. Combate contra Lobo de las Sombras.',
      actionType: 'COMBAT_SPECIFIC',
      enemyId: 'lobo_sombras',
      ambushType: 'ENEMY_AMBUSH'
    }
  },
  {
    id: 'd15_santuario_silencioso',
    code: 'D15',
    name: 'Santuario Silencioso',
    cardType: 'TIPO_1',
    image: 'assets/cards/base/card_016.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    description: 'Un círculo de runas iluminadas por velas de grasa que nunca se apagan.',
    choices: [
      {
        id: 'morale',
        label: 'Meditar sobre tu Propósito',
        detail: 'Sube 1 nivel en el Control de Moral.',
        execute(game) {
          game.hero.morale = Math.min(5, game.hero.morale + 1);
          return 'Enfocas tu mente y disipas el miedo: +1 Moral.';
        }
      },
      {
        id: 'vigor',
        label: 'Inhalar los Humos Mágicos',
        detail: 'Recuperas 2 de Energía y 1 de Salud.',
        execute(game) {
          game.hero.energy = Math.min(game.hero.maxEnergy, game.hero.energy + 2);
          game.hero.hp = Math.min(game.hero.maxHp, game.hero.hp + 1);
          return 'Los aromas reconstituyentes te fortalecen: +2 Energía, +1 Salud.';
        }
      }
    ]
  },
  {
    id: 'd16_pasaje_secreto',
    code: 'D16',
    name: 'Pasaje Secreto',
    cardType: 'TIPO_2',
    image: 'assets/cards/base/card_018.jpg',
    backImage: 'assets/cards/base/card_011.jpg',
    option1: {
      title: 'Atajo Seguro',
      description: 'Descubres una puerta oculta que te permite esquivar peligros del piso.',
      actionType: 'REWARD',
      execute(game) {
        game.hero.energy = Math.min(game.hero.maxEnergy, game.hero.energy + 1);
        return 'Avanzas con sigilo evitando trampas (+1 Energía).';
      }
    },
    option2: {
      title: 'Derrumbe Inminente',
      description: 'El túnel se colapsa tras de ti. Pierdes 2 puntos de Energía apartando rocas.',
      actionType: 'TRAP',
      execute(game) {
        game.hero.energy = Math.max(0, game.hero.energy - 2);
        return 'Consigues apartar las piedras a costa de tu vigor (-2 Energía).';
      }
    }
  }
];
