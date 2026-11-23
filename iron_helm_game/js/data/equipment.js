/**
 * IRON HELM - Catálogo de Equipamiento y Armas
 * Slots:
 *   MP: Mano Principal
 *   OM: Otra Mano (Escudo, Antorcha, etc.)
 *   2M: Dos Manos (Arcos, Mandobles)
 *   CP: Cuerpo (Armadura)
 *   CA: Cabeza (Cascos)
 *   AC: Accesorio (Riñonera, Anillos, Cuña)
 */

export const EQUIPMENT = [
  {
    id: 'broquel',
    name: 'Broquel',
    type: 'EQUIPMENT',
    slot: 'OM',
    price: 2,
    weight: 1,
    image: 'assets/cards/base/card_068.jpg',
    description: 'Escudo ligero de madera. Resta 1 punto al daño inicial del enemigo.',
    armorValueInitial: 1,
    armorValueCounter: 0
  },
  {
    id: 'vestiduras',
    name: 'Vestiduras de Viajero',
    type: 'EQUIPMENT',
    slot: 'CP',
    price: 1,
    weight: 1,
    image: 'assets/cards/base/card_069.jpg',
    description: 'Ropajes resistentes que amortiguan golpes ligeros.',
    armorValueInitial: 1,
    armorValueCounter: 0
  },
  {
    id: 'baculo_madera',
    name: 'Báculo de Madera',
    type: 'EQUIPMENT',
    slot: 'MP',
    price: 2,
    weight: 2,
    image: 'assets/cards/base/card_065.jpg',
    description: 'Arma mágica básica. Inflige 1d6 + 1 de daño por cada punto de energía gastado.',
    attackBonus: 1
  },
  {
    id: 'cuna_puerta',
    name: 'Cuña de Puerta',
    type: 'EQUIPMENT',
    slot: 'AC',
    price: 1,
    weight: 1,
    image: 'assets/cards/base/card_066.jpg',
    description: 'Herramienta útil para trabar puertas o evitar emboscadas al retirarse.',
    passive: 'Permite pasar una carta de trampa de puerta sin sufrir penalizaciones.'
  },
  {
    id: 'arco_corto',
    name: 'Arco Corto',
    type: 'EQUIPMENT',
    slot: '2M',
    price: 4,
    weight: 2,
    image: 'assets/cards/base/card_067.jpg',
    description: 'Arma a dos manos. Te permite disparar a distancia antes de que el enemigo se acerque.',
    attackBonus: 1,
    ranged: true
  },
  {
    id: 'armadura_cuero',
    name: 'Armadura de Cuero',
    type: 'EQUIPMENT',
    slot: 'CP',
    price: 3,
    weight: 2,
    image: 'assets/cards/base/card_071.jpg',
    description: 'Armadura flexible. Resta 1 tanto al daño inicial como a los contraataques del enemigo.',
    armorValueInitial: 1,
    armorValueCounter: 1
  },
  {
    id: 'hacha',
    name: 'Hacha de Mano',
    type: 'EQUIPMENT',
    slot: 'MP',
    price: 3,
    weight: 2,
    image: 'assets/cards/base/card_072.jpg',
    description: 'Inflige 1d6 + 2 de daño. Puedes descartarla para lanzarla e infligir 3d6 de daño sin gastar energía.',
    attackBonus: 2,
    canThrow: true
  },
  {
    id: 'antorcha',
    name: 'Antorcha',
    type: 'EQUIPMENT',
    slot: 'OM',
    price: 1,
    weight: 1,
    image: 'assets/cards/base/card_073.jpg',
    description: 'Ilumina los rincones oscuros. Otorga +1 a la moral o previene penalizadores por penumbra.',
    lightSource: true
  },
  {
    id: 'maza',
    name: 'Maza de Hierro',
    type: 'EQUIPMENT',
    slot: 'MP',
    price: 3,
    weight: 2,
    image: 'assets/cards/base/card_074.jpg',
    description: 'Arma contundente sagrada. Inflige 1d6 + 2 de daño (anula la resistencia de esqueletos).',
    attackBonus: 2,
    blunt: true
  },
  {
    id: 'espada_larga',
    name: 'Espada Larga',
    type: 'EQUIPMENT',
    slot: 'MP',
    price: 5,
    weight: 3,
    image: 'assets/cards/base/card_075.jpg',
    description: 'Hoja de acero templado. Inflige 1d6 + 3 de daño con cada impacto.',
    attackBonus: 3
  },
  {
    id: 'escudo',
    name: 'Escudo de Roble',
    type: 'EQUIPMENT',
    slot: 'OM',
    price: 4,
    weight: 3,
    image: 'assets/cards/base/card_070.jpg',
    description: 'Escudo pesado. Resta 1 tanto al daño inicial como a los contraataques del enemigo.',
    armorValueInitial: 1,
    armorValueCounter: 1
  },
  {
    id: 'cota_malla',
    name: 'Cota de Malla',
    type: 'EQUIPMENT',
    slot: 'CP',
    price: 6,
    weight: 4,
    image: 'assets/cards/base/card_076.jpg',
    description: 'Malla metálica entrelazada. Resta 2 puntos a todo el daño recibido.',
    armorValueInitial: 2,
    armorValueCounter: 2
  },
  {
    id: 'casco_hierro',
    name: 'Casco de Hierro (Iron Helm)',
    type: 'EQUIPMENT',
    slot: 'CA',
    price: 5,
    weight: 2,
    image: 'assets/cards/base/card_077.jpg',
    description: 'El legendario yelmo de hierro. Te protege de golpes críticos y trampas de techo.',
    armorValueInitial: 1,
    armorValueCounter: 1
  },
  // Expansiones
  {
    id: 'fanny_pack_item',
    name: 'Riñonera de Aventura',
    expansion: 'fanny_pack',
    type: 'EQUIPMENT',
    slot: 'AC',
    price: 2,
    weight: 0,
    image: 'assets/cards/expansions/fanny_pack/card_000.jpg',
    description: 'Proporciona compartimentos extra. Aumenta la capacidad de carga máxima en +2.',
    encumbranceBonus: 2
  }
];
