/**
 * IRON HELM - Cartas de Trama (Plot Cards)
 * Cada carta de trama contiene un dilema moral y de 1 a 3 iconos de ojo.
 * Al acumular 10 iconos de ojo en total, se desencadena el combate contra el Jefe Final.
 */

export const PLOT_CARDS = [
  {
    id: 'pt8_prisionero',
    code: 'PT8',
    name: 'El Prisionero',
    eyes: 3,
    image: 'assets/cards/base/card_085.jpg',
    narrative: 'En una celda ves a un solitario prisionero que te señala las llaves sobre la mesa donde duerme un guardia orco.',
    choices: [
      {
        id: 'free',
        label: '¿Liberar al prisionero?',
        detail: 'Pierdes 1 de energía y 3 de salud. Sube 1 nivel en moral. Ganas 2 de oro y 1 carta de botín.',
        execute(game) {
          game.hero.energy = Math.max(0, game.hero.energy - 1);
          game.hero.hp = Math.max(1, game.hero.hp - 3);
          game.hero.morale = Math.min(5, game.hero.morale + 1);
          game.hero.gold += 2;
          const loot = game.drawLoot();
          return `Liberas al prisionero: -1 Energía, -3 Salud, +1 Moral, +2 Oro y ${loot.name}.`;
        }
      },
      {
        id: 'steal',
        label: '¿Coger el oro y huir?',
        detail: 'Baja 1 nivel en el control de moral. Ganas 2 de oro.',
        execute(game) {
          game.hero.morale = Math.max(-5, game.hero.morale - 1);
          game.hero.gold += 2;
          return 'Coges las monedas sin liberar al preso: -1 Moral, +2 Oro.';
        }
      }
    ]
  },
  {
    id: 'pt1_mendigo',
    code: 'PT1',
    name: 'El Mendigo Ciego',
    eyes: 2,
    image: 'assets/cards/base/card_080.jpg',
    narrative: 'Un anciano harapiento extiende su cuenco tembloroso suplicando comida.',
    choices: [
      {
        id: 'share_food',
        label: 'Compartir 1 Ración',
        condition: (p) => p.rations > 0,
        detail: 'Gastas 1 Ración. Sube 1 de moral y ganas 1 Bendición.',
        execute(game) {
          game.hero.rations -= 1;
          game.hero.morale = Math.min(5, game.hero.morale + 1);
          game.hero.blessings += 1;
          return 'Compartes tu comida: -1 Ración, +1 Moral, +1 Bendición.';
        }
      },
      {
        id: 'ignore',
        label: 'Ignorar y Pasar de Largo',
        detail: 'Baja 1 nivel en el control de moral.',
        execute(game) {
          game.hero.morale = Math.max(-5, game.hero.morale - 1);
          return 'Apartas la mirada con el corazón endurecido: -1 Moral.';
        }
      }
    ]
  },
  {
    id: 'pt2_ladron_herido',
    code: 'PT2',
    name: 'El Ladrón Moribundo',
    eyes: 1,
    image: 'assets/cards/base/card_081.jpg',
    narrative: 'Un ladrón yace desangrándose en el suelo. A su lado descansa una bolsa con botín robado.',
    choices: [
      {
        id: 'heal_thief',
        label: 'Curar sus heridas (gasta 1 Energía)',
        detail: 'Gastas 1 de energía. Sube 1 nivel de moral y el ladrón te regala una poción.',
        execute(game) {
          game.hero.energy = Math.max(0, game.hero.energy - 1);
          game.hero.morale = Math.min(5, game.hero.morale + 1);
          const pot = game.drawPotion();
          return `Vendas sus heridas: -1 Energía, +1 Moral y te entrega ${pot.name}.`;
        }
      },
      {
        id: 'loot_body',
        label: 'Desvalijar al ladrón',
        detail: 'Ganas 3 Monedas de Oro y 1 carta de botín. Baja 2 niveles de moral.',
        execute(game) {
          game.hero.gold += 3;
          game.hero.morale = Math.max(-5, game.hero.morale - 2);
          const loot = game.drawLoot();
          return `Tomas su bolsa sin piedad: +3 Oro, ${loot.name}, -2 Moral.`;
        }
      }
    ]
  },
  {
    id: 'pt3_reliquia_maldita',
    code: 'PT3',
    name: 'La Reliquia Corrupta',
    eyes: 2,
    image: 'assets/cards/base/card_082.jpg',
    narrative: 'Un ídolo de obsidiana susurra promesas oscuras sobre un pedestal rodeado de calaveras.',
    choices: [
      {
        id: 'destroy_relic',
        label: 'Destruir el Ídolo con tu arma',
        detail: 'Gastas 2 de energía. Sube 1 de moral y ganas 1 Bendición.',
        execute(game) {
          game.hero.energy = Math.max(0, game.hero.energy - 2);
          game.hero.morale = Math.min(5, game.hero.morale + 1);
          game.hero.blessings += 1;
          return 'Haces añicos el ídolo oscuro: -2 Energía, +1 Moral, +1 Bendición.';
        }
      },
      {
        id: 'embrace_darkness',
        label: 'Aceptar el poder oscuro',
        detail: 'Recuperas toda tu energía al instante, pero sufres 2 fichas de veneno y -2 a la moral.',
        execute(game) {
          game.hero.energy = game.hero.maxEnergy;
          game.hero.poison += 2;
          game.hero.morale = Math.max(-5, game.hero.morale - 2);
          return 'El poder oscuro revitaliza tus músculos: Energía al máximo, +2 Veneno, -2 Moral.';
        }
      }
    ]
  },
  {
    id: 'pt4_fuente_lagrimas',
    code: 'PT4',
    name: 'La Fuente de las Lágrimas',
    eyes: 2,
    image: 'assets/cards/base/card_083.jpg',
    narrative: 'Una estatua de una doncella llora lágrimas de plata en una pila de mármol.',
    choices: [
      {
        id: 'offer_gold',
        label: 'Lanzar 1 Moneda de Oro en ofrenda',
        condition: (p) => p.gold >= 1,
        detail: 'Gastas 1 Oro. Ganas 1 Bendición y curas 2 de Salud.',
        execute(game) {
          game.hero.gold -= 1;
          game.hero.blessings += 1;
          game.hero.hp = Math.min(game.hero.maxHp, game.hero.hp + 2);
          return 'Ofreces tu moneda a la estatua: -1 Oro, +1 Bendición, +2 Salud.';
        }
      },
      {
        id: 'steal_silver',
        label: 'Saquear la plata de la fuente',
        detail: 'Ganas 3 de Oro. Baja 1 de moral.',
        execute(game) {
          game.hero.gold += 3;
          game.hero.morale = Math.max(-5, game.hero.morale - 1);
          return 'Coges la plata del agua: +3 Oro, -1 Moral.';
        }
      }
    ]
  }
];
