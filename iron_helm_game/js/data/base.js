/**
 * IRON HELM · Catálogo del juego base (v2.x en español).
 * Todos los datos están transcritos de las cartas impresas (assets/cards/base/card_NNN.jpg).
 * El campo `code` es el código impreso en la esquina inferior izquierda de cada carta.
 * `copies` = copias en el mazo; `imgs` = ilustraciones alternativas cuando hay varias impresiones.
 *
 * Las reglas que cada carta aplica en el motor están en js/engine/fx.js (ítems, habilidades)
 * y en `power` (poderes de enemigos). El texto (`text`) es el impreso, tal cual.
 */

const B = (n) => `base/card_${String(n).padStart(3, '0')}.jpg`;

/* ----------------------------------------------------------------------------- Héroes */
export const HEROES = [
  { id: 'c1', code: 'C1', name: 'Fayon', img: B(0), health: 14, energy: 11, encumbrance: 10, rations: 1, gold: 3,
    trappings: ['t8', 't12'], skill: 's7', proficiency: 'agilidad' },
  { id: 'c2', code: 'C2', name: 'Sortab', img: B(1), health: 12, energy: 12, encumbrance: 9, rations: 1, gold: 3,
    trappings: ['t9', 't6'], skill: 's2', proficiency: 'mente' },
  { id: 'c3', code: 'C3', name: 'Zolla', img: B(2), health: 14, energy: 12, encumbrance: 8, rations: 1, gold: 2,
    trappings: ['t10', 't4'], skill: 's5', proficiency: 'agilidad' },
  { id: 'c4', code: 'C4', name: 'Moliclan', img: B(3), health: 16, energy: 10, encumbrance: 11, rations: 1, gold: 3,
    trappings: ['t1', 't3'], skill: 's12', proficiency: 'fuerza' },
  { id: 'c11', code: 'C11', name: 'Uln-Rolk', img: B(4), health: 15, energy: 11, encumbrance: 10, rations: 1, gold: 3,
    trappings: ['t13'], skill: 's4', proficiency: 'fuerza' },
];

/* ----------------------------------------------------------------------------- Jefes finales */
export const BOSSES = [
  { id: 'b1', code: 'B1', name: 'Merodeador', img: B(5), health: 22, damage: 5, treasure: 2, weakness: 'ice', purse: 0,
    text: 'Los ataques del Merodeador ignoran las bonificaciones defensivas obtenidas con escudos o broqueles.',
    power: { ignoreShields: true } },
  { id: 'b2', code: 'B2', name: 'Naga', img: B(6), health: 21, damage: 3, treasure: 2, weakness: 'fire', purse: 0,
    text: 'Cada vez que te impacte la Naga, ganas 2 fichas de veneno.', power: { poisonOnHit: 2 } },
  { id: 'b3', code: 'B3', name: 'Lich', img: B(7), health: 20, damage: 4, treasure: 2, weakness: 'undead', purse: 0,
    text: 'Cuando el Lich impacta con su ataque inicial o contraataca, roba 2 de energía.', power: { stealEnergyOnHit: 2 } },
];

/* ----------------------------------------------------------------------------- Enemigos (mazo de 18) */
// treasure: 0 nada · 1 una carta de botín · 2 botín + poción · purse: monedas de oro
export const ENEMIES = [
  { id: 'e1', code: 'E1', name: 'Goblin', img: B(22), health: 2, damage: 1, treasure: 1, weakness: 'ice', purse: 1, copies: 2,
    text: 'Puedes evitar este enfrentamiento gastando 1 de oro.', power: { avoid: { gold: 1 } } },
  { id: 'e2', code: 'E2', name: 'Zombie', img: B(23), health: 2, damage: 0, treasure: 1, weakness: 'undead', purse: 0, copies: 2,
    text: 'Los Zombies no infligen daño inicial.', power: { noInitial: true } },
  { id: 'e3', code: 'E3', name: 'Skinkling', img: B(25), health: 1, damage: 0, treasure: 1, weakness: 'fire', purse: 1, copies: 2,
    text: 'Ganas 1 ficha de veneno cuando el Skinkling te impacte con éxito.', power: { poisonOnHit: 1 } },
  { id: 'e4', code: 'E4', name: 'Serpiente Alada', img: B(26), health: 3, damage: 1, treasure: 0, weakness: 'ice', purse: 0, copies: 2,
    text: 'Ganas 1 ficha de veneno con el daño inicial infligido.', power: { poisonOnInitialHit: 1 } },
  { id: 'e5', code: 'E5', name: 'Lobo', img: B(27), health: 3, damage: 2, treasure: 1, weakness: 'fire', purse: 0, copies: 2,
    text: 'Puedes evitar este enfrentamiento gastando 1 ración.', power: { avoid: { rations: 1 } } },
  { id: 'e6', code: 'E6', name: 'Arquero No Muerto', img: B(28), health: 4, damage: 2, treasure: 1, weakness: 'undead', purse: 1, copies: 2,
    text: 'No puedes defenderte del daño inicial infligido.', power: { noArmorInitial: true } },
  { id: 'e7', code: 'E7', name: 'Guerrero Orco', img: B(29), health: 5, damage: 2, treasure: 1, weakness: 'fire', purse: 1,
    text: 'Puedes evitar este enfrentamiento gastando 2 de oro.', power: { avoid: { gold: 2 } } },
  { id: 'e8', code: 'E8', name: 'Guerrero No Muerto', img: B(30), health: 5, damage: 3, treasure: 1, weakness: 'undead', purse: 1,
    text: 'Pierdes 1 ficha de bendición con el daño inicial infligido.', power: { loseBlessingOnInitialHit: 1 } },
  { id: 'e9', code: 'E9', name: 'Peciforme', img: B(31), health: 6, damage: 2, treasure: 1, weakness: 'ice', purse: 0,
    text: 'Ganas 1 ración cuando derrotes al Peciforme. ¡Pescado delicioso!', power: { rationOnDefeat: 1 } },
  { id: 'e10', code: 'E10', name: 'Masa Devoradora', img: B(32), health: 7, damage: 3, treasure: 2, weakness: 'ice', purse: 0,
    text: 'Pierdes las armas equipadas si sacas más de dos resultados de 1 durante un ataque.', power: { loseWeaponsOnOnes: 3 } },
  { id: 'e11', code: 'E11', name: 'Espectro', img: B(33), health: 7, damage: 3, treasure: 2, weakness: 'undead', purse: 0,
    text: 'Tanto el daño inicial infligido como los contraataques te roban 1 de bendición.', power: { loseBlessingOnHit: 1 } },
  { id: 'e12', code: 'E12', name: 'Troll de las Cavernas', img: B(34), health: 8, damage: 4, treasure: 2, weakness: 'fire', purse: 1,
    text: 'Puedes evitar este enfrentamiento gastando 3 de oro.', power: { avoid: { gold: 3 } } },
];

/* ----------------------------------------------------------------------------- Mazo de mazmorra (16 cartas) */
// type 1: carta narrativa con acción · type 2: parte "1" (revelada primero) y parte "2" (revelada segunda)
export const DUNGEON = [
  { id: 'd1', code: 'D1', name: 'Emboscada', type: 2, kind: 'ambush', img: B(8), imgs: [B(8), B(12)], copies: 2,
    option1: 'Pillas a tu enemigo por sorpresa y ganas la iniciativa. Roba una carta de enemigo e ignora el daño inicial que inflige. Añade el nivel de la mazmorra a su valor de salud.',
    option2: 'Tu enemigo te pilla por sorpresa, ganando la iniciativa. Roba una carta de enemigo y añade el nivel de la mazmorra al daño inicial que inflige. Añade a su salud el nivel de la mazmorra +4.' },
  { id: 'd2', code: 'D2', name: 'Tesoro', type: 2, kind: 'treasure', img: B(13), copies: 2,
    option1: 'Encuentras un cofre que ha sido abierto y saqueado. Solo queda una moneda. Ganas 1 de oro.',
    option2: 'Este cofre debe haber sido abastecido recientemente de mercancías. Roba 1 carta de botín y 1 carta de poción.' },
  { id: 'd3', code: 'D3', name: 'Laberinto', type: 2, kind: 'labyrinth', img: B(14), copies: 1,
    option1: '¡Seguro que tu astucia te hace escapar del laberinto del mago! Descarta 1 ración. Si no tienes raciones, pierdes 3 de salud.',
    option2: '¡Maldición! ¡No eres capaz de encontrar la salida! Descarta 2 raciones. Pierdes 2 de salud por cada ración que no puedas descartar.' },
  { id: 'd4', code: 'D4', name: 'Plantación de Setas', type: 2, kind: 'mushrooms', img: B(15), copies: 1,
    option1: 'Has localizado una plantación de setas jóvenes. Ganas 1 ración.',
    option2: 'Te encuentras con una plantación de setas maduras. Ganas 2 raciones.' },
  { id: 'd5', code: 'D5', name: 'Trampa de Flechas', type: 2, kind: 'arrowTrap', img: B(16), copies: 2,
    option1: 'Tu curiosidad por la estatua de ojos de rubí tiene un coste. Ganas 1 ficha de veneno.',
    option2: 'Tu avaricia te hace ir cegado hasta una tormenta de flechas. Ganas 2 fichas de veneno.' },
  { id: 'd6', code: 'D6', name: 'Escaramuza', type: 2, kind: 'skirmish', img: B(17), copies: 3,
    option1: '¡Desenfundas tu arma y estás listo para el combate! Roba una carta de enemigo y añade a su salud el nivel de la mazmorra +2.',
    option2: '¡Te cogen desprevenido y tropiezas con tu arma! Roba una carta de enemigo y añade a su salud el nivel de la mazmorra +4.' },
  { id: 'd7', code: 'D7', name: 'Campamento', type: 1, kind: 'camp', img: B(18), copies: 1,
    text: 'Encuentras un lugar relativamente tranquilo para acampar, pero no tardarás en llamar la atención. Elige una de las siguientes acciones.',
    options: [
      { id: 'cook', label: 'Cocinar', text: 'Gasta 1 ración para ganar 3 de energía.' },
      { id: 'search', label: 'Buscar', text: 'Ganas 1 ración.' },
      { id: 'rest', label: 'Descansar', text: 'Gasta 1 ración para ganar 2 de salud y perder 1 de veneno.' },
    ] },
  { id: 'd8', code: 'D8', name: 'Mercader', type: 1, kind: 'merchant', img: B(19), copies: 1,
    text: 'Las profundidades de una mazmorra parece un lugar extraño para instalar un bazar, pero ¿quién eres tú para cuestionar su cordura? Puedes realizar un trato con el mercader. Comprar: para formar el bazar, roba cartas de botín y pociones según el nivel de mazmorra en el que te encuentras. Vender: el comerciante te comprará los objetos que no quieras por 1 de oro cada uno.' },
  { id: 'd9', code: 'D9', name: 'Altar', type: 1, kind: 'altar', img: B(20), copies: 1,
    text: 'A veces, se puede encontrar un santuario en el lugar más insospechado. Te dejas caer de rodillas frente al altar y rezas por...',
    options: [
      { id: 'bless', label: 'Una Bendición', text: 'Ganas 1 ficha de bendición.' },
      { id: 'cure', label: 'Curación', text: 'Descarta d6-d6 fichas de veneno.' },
    ] },
  { id: 'd10', code: 'D10', name: 'Claro', type: 1, kind: 'clearing', img: B(21), copies: 2,
    text: 'En un claro puede ocurrir cualquier cosa... Roba una carta de trama.' },
];

// Fichas de bazar del Mercader por nivel de mazmorra: [botín, pociones]
export const MERCHANT_STOCK = { 1: [1, 1], 2: [2, 1], 3: [2, 2], 4: [3, 2], 5: [3, 3] };

/* ----------------------------------------------------------------------------- Objetos: slot MP OM 2M CP CA AC */
const item = (deck, code, name, n, price, weight, slot, text, extra = {}) =>
  ({ id: code.toLowerCase(), kind: 'item', deck, code, name, img: B(n), price, weight, slot, text, ...extra });

export const LOOT = [
  item('loot', 'L1', 'Ración', 35, 1, 1, 'AC', 'Puedes descartar esta carta para recuperar 2 de energía.', { copies: 2 }),
  item('loot', 'L2', 'Yelmo de Hierro', 36, 4, 2, 'CA', 'Resta 1 tanto al daño inicial como a los contraataques.'),
  item('loot', 'L3', 'Escudo', 38, 4, 3, 'OM', 'Resta 1 tanto al daño inicial como a los contraataques.'),
  item('loot', 'L4', 'Daga', 39, 2, 1, 'MP', 'Debes relanzar los resultados de 6 cuando uses una Daga como arma principal.'),
  item('loot', 'L5', 'Poción de Salud', 40, 1, 1, 'AC', 'Puedes descartar esta carta para ganar 4 de salud.'),
  item('loot', 'L6', 'Armadura de Escamas', 41, 5, 3, 'CP', 'Resta 2 al daño inicial y a los contraataques. No se pueden usar las habilidades Ocultación ni Sombra.'),
  item('loot', 'L7', 'Espada Ardiente', 42, 5, 2, 'MP', 'Los resultados de 6 en un ataque infligen 7 de daño. Se suma +3 a tu tirada de ataque contra enemigos con la debilidad fuego.'),
  { id: 'l8', kind: 'enemy', inLootDeck: true, code: 'L8', name: 'Mimético', img: B(43), health: 6, damage: 3, treasure: 0, weakness: 'fire', purse: 0,
    text: 'Puedes evitar este enfrentamiento gastando 1 ración.', power: { avoid: { rations: 1 } } },
  item('loot', 'L9', 'Arco Élfico', 44, 5, 2, '2M', 'Inflige 2 de daño a tu enemigo antes de recibir el daño inicial.'),
  item('loot', 'L10', 'Guía de Campo', 45, 2, 1, 'AC', 'Ganas 1 ración adicional cada vez que entres en la Plantación de Setas.'),
  item('loot', 'L11', 'Mapa de Explorador', 46, 2, 1, 'AC', 'Pierdes 1 ración menos cuando te pierdas en el Laberinto.'),
  item('loot', 'L12', 'Martillo de Guerra', 47, 5, 3, '2M', 'Suma +3 a tu tirada de ataque contra enemigos con debilidad no muerto.'),
  item('loot', 'L13', 'Libro de Cocina', 48, 3, 1, 'AC', 'Ganas 1 de energía adicional cuando comas una ración en un campamento.'),
  item('loot', 'L14', 'Espada Larga', 49, 4, 2, 'MP', 'Los resultados de 6 infligen un punto de daño adicional.'),
  item('loot', 'L15', 'Anillo Mágico', 50, 3, 1, 'AC', 'Una vez por nivel de mazmorra, puedes evitar una emboscada.'),
  item('loot', 'L16', 'Lámpara', 51, 3, 1, 'AC', 'Una vez por nivel de mazmorra, puedes revelar ambas cartas de mazmorra y elegir una de ellas.'),
  item('loot', 'L17', 'Quebradora de Hielo', 52, 5, 2, 'MP', 'Puedes descartar esta carta para infligir 3d6 de daño sin gastar energía. Suma +3 a tu tirada de ataque contra enemigos con la debilidad hielo.'),
];

export const POTIONS = [
  item('potion', 'P1', 'Poción de Salud', 53, 1, 1, 'AC', 'Puedes descartar esta carta para ganar 4 de salud.', { copies: 2 }),
  item('potion', 'P2', 'Antídoto', 54, 1, 1, 'AC', 'Puedes descartar esta carta para eliminar 3 fichas de veneno.', { copies: 2 }),
  item('potion', 'P3', 'Esquirla de Hielo', 56, 1, 1, 'AC', 'Puedes descartar esta carta para infligir 2d6 de daño. +5 de daño contra enemigos con la debilidad hielo.', { copies: 2 }),
  item('potion', 'P4', 'Bomba de Mecha', 57, 1, 1, 'AC', 'Puedes descartar esta carta para infligir 2d6 de daño. +5 de daño contra enemigos con la debilidad fuego.', { copies: 2 }),
  item('potion', 'P5', 'Agua Bendita', 58, 1, 1, 'AC', 'Puedes descartar esta carta para infligir 2d6 de daño. +5 de daño contra enemigos con la debilidad no muerto.', { copies: 2 }),
];

export const TRAPPINGS = [
  item('trapping', 'T1', 'Hacha', 59, 2, 2, 'MP', 'Puedes descartar esta carta para infligir 3d6 de daño sin gastar energía.'),
  item('trapping', 'T2', 'Raciones', 60, 1, 0, 'AC', 'Descarta esta carta para ganar inmediatamente 2 raciones adicionales.'),
  item('trapping', 'T3', 'Antorcha', 62, 1, 1, 'AC', 'Puedes descartar esta carta para revelar ambas cartas de mazmorra y, a continuación, elegir una para resolverla.'),
  item('trapping', 'T4', 'Armadura de Cuero', 63, 3, 2, 'CP', 'Resta 1 cuando recibas daño inicial.'),
  item('trapping', 'T5', 'Daga', 64, 2, 1, 'MP', 'Debes relanzar los resultados de 6 cuando uses una Daga como arma principal.'),
  item('trapping', 'T6', 'Cuña de Puerta', 65, 1, 1, 'AC', 'Descarta esta carta para evitar una emboscada o una escaramuza.'),
  item('trapping', 'T7', 'Tiara', 66, 3, 1, 'CA', 'Al beber una poción de salud, ganas 2 puntos de salud adicionales.'),
  item('trapping', 'T8', 'Broquel', 67, 2, 1, 'OM', 'Resta 1 al daño inicial. Si sufres un impacto que inflija 4 o más de daño, tu Broquel se rompe.'),
  item('trapping', 'T9', 'Báculo de Madera', 68, 3, 1, '2M', 'Suma 3 de daño adicional a todos los ataques realizados con pociones.'),
  item('trapping', 'T10', 'Arco Corto', 69, 3, 1, '2M', 'Inflige 2 de daño a tu enemigo antes de recibir daño inicial. Debes relanzar los resultados de 6.'),
  item('trapping', 'T11', 'Escudo', 70, 4, 3, 'OM', 'Resta 1 tanto al daño inicial como a los contraataques.'),
  item('trapping', 'T12', 'Vestiduras', 71, 2, 1, 'CP', 'Puedes evitar 1 escaramuza por nivel de mazmorra.'),
  item('trapping', 'T13', 'Maza', 72, 3, 2, 'MP', 'Cuando combatas contra un enemigo con debilidad no muerto, puedes relanzar los resultados de 1 y 2.'),
  item('trapping', 'T14', 'Yelmo de Hierro', 73, 4, 2, 'CA', 'Resta 1 tanto al daño inicial como a los contraataques.'),
];

/* ----------------------------------------------------------------------------- Habilidades */
const skill = (code, name, n, proficiency, text) => ({ id: code.toLowerCase(), kind: 'skill', code, name, img: B(n), proficiency, text });
export const SKILLS = [
  skill('S1', 'Valorar', 87, 'mente', 'Cuando vendas mercancías al comerciante, ganas 2 de oro en vez de 1. Cuando compres al comerciante, pagas la mitad del precio (redondeado hacia arriba).'),
  skill('S2', 'Alquimia', 88, 'mente', 'Ganas 2 pociones de tu elección. Cada vez que tengas que robar una carta de poción aleatoria puedes robar una carta adicional, elegir una para quedártela y, a continuación, descartar la otra.'),
  skill('S3', 'Herboristería', 89, 'mente', 'Ganas +1 de energía cuando cocines en un campamento. Si bebes un antídoto, te curas todo el veneno.'),
  skill('S4', 'Divinidad', 90, 'mente', 'Siempre que ganes energía, puedes convertirla en salud. Obtienes 2 fichas de bendición cuando eliges rezar por una bendición en el Altar.'),
  skill('S5', 'Ocultación', 92, 'agilidad', 'Puedes intentar evitar una escaramuza. [dados 1,2] FALLO - Suma 2 al daño inicial. [dados 3,4] FALLO. [dados 5,6] ÉXITO - Evitas el combate.'),
  skill('S6', 'Tiro con Arco', 93, 'agilidad', 'Cuando uses un arco, puedes relanzar todos los resultados de 1.'),
  skill('S7', 'Esquivar', 94, 'agilidad', 'Ganas 1 ficha de veneno menos en la Trampa de Flechas.'),
  skill('S8', 'Sombra', 95, 'agilidad', 'Con una daga en tu mano principal, puedes infligir d6 de daño antes de recibir daño inicial durante la fase 1 de una Emboscada.'),
  skill('S9', 'Furia', 96, 'fuerza', 'Puedes gastar 2 de salud para añadir un dado adicional a tu tirada de ataque. Además: añade 5 de daño si arrojas tu Hacha.'),
  skill('S10', 'Doble Arma', 97, 'fuerza', 'Puedes equiparte con una Daga en tu otra mano, ganando +2 a la suma de tus resultados de ataque.'),
  skill('S11', 'Parar con el Escudo', 98, 'fuerza', 'Resta 1 punto adicional al daño inicial cuando tengas equipado un Escudo o un Broquel. Tu Broquel no puede romperse.'),
  skill('S12', 'Bloquear', 99, 'fuerza', 'Puedes intentar bloquear todo el daño inicial con tu arma principal. [dado 1] FALLO - El arma principal se rompe. [dados 2,3,4] FALLO. [dados 5,6] ÉXITO - Evitas el daño.'),
];

/* ----------------------------------------------------------------------------- Tramas (con ojos) */
// ops: ver js/engine/plots.js. 'ask' = elección de la carta; cada opción lleva su lista de operaciones.
const plot = (code, name, n, eyes, narrative, options, extra = {}) =>
  ({ id: code.toLowerCase(), kind: 'plot', code, name, img: B(n), eyes, narrative, options, ...extra });

export const PLOTS = [
  plot('PT1', 'La Anciana', 76, 2,
    'Oyes un gemido que procede de unas sombras y descubres a una anciana que está perdida. Parece frágil y murmura que ha perdido algo en la oscuridad.',
    [{ id: 'help', prompt: '¿Ayudarla a escapar de la mazmorra?',
       text: 'Tardas un buen rato en acompañarla volviendo por tus pasos. Al llegar a la entrada de la mazmorra, la anciana se vuelve hacia ti y, antes de marcharse, te bendice. Pierdes 1 ración y 1 de energía. Ganas 1 ficha de bendición y sube un nivel en el control de moral.',
       ops: [['lose', 'rations', 1], ['lose', 'energy', 1], ['gain', 'blessing', 1], ['morality', 1]] },
     { id: 'leave', prompt: '¿Abandonarla y buscar en las sombras?',
       text: 'Ignoras a la vieja bruja y prefieres buscar lo que dice haber perdido. Baja un nivel en el control de moral. Roba una carta de botín aleatoria.',
       ops: [['morality', -1], ['loot', 1]] }]),
  plot('PT2', 'El Hombre Cerdo', 77, 1,
    'Te sientes atraído por extraños sonidos que parecen gemidos de un animal. Te sorprende encontrar una criatura muy pequeña, parecida a un cerdo pero con apariencia humana, atrapada en un cepo.',
    [{ id: 'free', prompt: '¿Liberar al hombre cerdo?',
       text: 'La asustada criatura parece confusa cuando la liberas. Se queda unos segundos quieta mirándote y, luego, se va andando a dos patas. Sube un nivel en el control de moral.',
       ops: [['morality', 1]] },
     { id: 'butcher', prompt: '¿Descuartizar al hombre cerdo?',
       text: 'Tu barriga ruge al ver al hombre cerdo y te pones manos a la obra para preparar un fuego. Baja un nivel en el control de moral. Ganas 3 de energía.',
       ops: [['morality', -1], ['gain', 'energy', 3]] }]),
  plot('PT3', 'El Santuario', 78, 3,
    'En un claro encuentras un imponente santuario cubierto de vegetación. Te invade una sensación de poder justo cuando una suave brisa pasa a tu lado.',
    [], { text: 'Ganas una cantidad de fichas de bendición igual a tu posición en el control de moral.', ops: [['blessingByMorality']] }),
  plot('PT4', 'El Pasadizo', 79, 1,
    'Te llama la atención una extraña roca que sobresale de los muros. Pasas la mano por ella y, de repente, el suelo empieza a temblar. Pierdes el equilibrio cayendo al suelo y el aire se llena de polvo. Cuando te levantas, observas un pasadizo secreto donde antes había un muro.',
    [], { text: 'Roba otra carta de trama.', ops: [['plot', 1]] }),
  plot('PT5', 'El Viajero', 82, 2,
    'Una figura embozada se acerca a ti. Pones la mano sobre la empuñadura de tu arma temiendo un conflicto. Sin embargo, el anciano se presenta como un clérigo y hace un gesto de paz. Coloca sus manos sobre tus hombros y susurra algo para sí mismo.',
    [], { text: 'Ganas una cantidad de salud o energía igual a tu posición en el control de moral.', ops: [['healthOrEnergyByMorality']] }),
  plot('PT6', 'Posada de Hidd', 83, 2,
    'Te viene olor a carne asada y se oyen risas y ruido de platos. Es un sitio de lo más extraño para encontrar una taberna clandestina. Entras por la pequeña puerta y te encuentras con miradas amistosas.',
    [{ id: 'eat', prompt: '¿Comer y descansar junto al fuego?',
       text: 'Paga 1 de oro por una comida y gana 2 de salud y 1 de energía (solo se puede realizar una vez).',
       ops: [['pay', 'gold', 1], ['gain', 'hp', 2], ['gain', 'energy', 1]] },
     { id: 'play', prompt: '¿Jugar?',
       text: 'Gasta 1 de oro para jugar. [dados 1,2,3,4] Pierdes tu oro. [dado 5] Ganas 1 de oro. [dado 6] Ganas 2 de oro. Si ganas 5 de oro o más, te echan a patadas de la taberna.',
       ops: [['gamble']] }]),
  plot('PT7', 'El Lobo', 84, 2,
    'Tus ojos se encuentran con los de un lobo de aspecto frágil, agazapado al amparo de las sombras. Parece que el lobo está famélico porque ni siquiera tiene fuerzas para gruñir.',
    [{ id: 'feed', prompt: '¿Alimentar al lobo?',
       text: 'Coges una de tus raciones y se la ofreces al lobo. La asustada criatura la recibe con un chasquido de dientes que te hace sangrar la mano pero, rápidamente, se concentra en comerse tu ofrenda. Pierdes 1 ración y 2 de salud. Sube un nivel en el control de moral. El enemigo Lobo te ignora a partir de ahora.',
       ops: [['lose', 'rations', 1], ['lose', 'hp', 2], ['morality', 1], ['removeEnemy', 'E5']] },
     { id: 'ignore', prompt: '¿Ignorar al lobo?',
       text: 'Te das la vuelta y dejas al lobo a su suerte. Baja un nivel en el control de moral.',
       ops: [['morality', -1]] }]),
  plot('PT8', 'El Prisionero', 85, 3,
    'Te encuentras en el umbral de una pequeña sala junto a una celda. Un guardia orco está profundamente dormido apoyado en una mesa en la que descansan, entre otras cosas, un par de monedas de oro. Un solitario prisionero encerrado en la celda te ve y señala, en silencio, las llaves que hay sobre la mesa.',
    [{ id: 'free', prompt: '¿Liberar al prisionero?',
       text: 'Te encaminas lentamente hacia la mesa pero, al acercarte, el orco se despierta. Se entabla un combate y sales victorioso. Liberas al prisionero, que sale huyendo sin ni siquiera darte las gracias. Pierdes 1 de energía y 3 de salud. Sube un nivel en el control de moral. Ganas 2 de oro y roba una carta de botín.',
       ops: [['lose', 'energy', 1], ['lose', 'hp', 3], ['morality', 1], ['gain', 'gold', 2], ['loot', 1]] },
     { id: 'steal', prompt: '¿Coger el oro y salir corriendo?',
       text: 'Atraviesas la sala corriendo y coges las monedas al pasar junto a la mesa. El orco se despierta confuso, pero tú ya has desaparecido. Baja un nivel en el control de moral. Ganas 2 de oro.',
       ops: [['morality', -1], ['gain', 'gold', 2]] }]),
  plot('PT9', 'El Cadáver', 86, 1,
    'Tropiezas con el cadáver de otro aventurero y caes al suelo. Al incorporarte reconoces que el cadáver pertenece a un amigo que tuviste años atrás.',
    [{ id: 'bury', prompt: '¿Enterrar el cadáver?',
       text: 'Decides que la mejor forma de rendir homenaje a tu viejo amigo es darle un digno entierro. Pierdes 1 de energía. Sube un nivel en el control de moral.',
       ops: [['lose', 'energy', 1], ['morality', 1]] },
     { id: 'rob', prompt: '¿Robarle el dinero y salir corriendo?',
       text: 'Registras el cadáver en busca de cualquier cosa que pueda ayudarte en tu aventura y lo abandonas a su suerte. Baja un nivel en el control de moral. Roba una carta de botín.',
       ops: [['morality', -1], ['loot', 1]] }]),
];

/* ----------------------------------------------------------------------------- Imágenes de apoyo */
export const IMAGES = {
  backs: {
    dungeon: B(11), enemies: B(24), loot: B(37), plots: B(80), potions: B(55),
    trappings: B(61), skills: B(91), heroes: B(9), bosses: B(10), afflictions: B(24),
  },
  map: B(74), morality: B(75),
};

/* Posiciones (fracción del ancho/alto de la carta) donde se apoya cada peón en las cartas de marcador */
export const MAP_SPOTS = { 1: [0.452, 0.158], 2: [0.754, 0.496], 3: [0.754, 0.852], 4: [0.271, 0.366], 5: [0.271, 0.80] };
export const MORALITY_SPOTS = {
  5: [0.788, 0.104], 4: [0.225, 0.148], 3: [0.531, 0.207], 2: [0.823, 0.271], 1: [0.458, 0.351], 0: [0.202, 0.471],
  '-1': [0.66, 0.519], '-2': [0.869, 0.655], '-3': [0.448, 0.689], '-4': [0.163, 0.81], '-5': [0.871, 0.852],
};

export const BASE_PACK = {
  id: 'base', name: 'Juego Base', type: 'core', description: 'Cinco héroes, tres jefes finales y la mazmorra original.',
  heroes: HEROES, bosses: BOSSES, enemies: ENEMIES, dungeon: DUNGEON, loot: LOOT, potions: POTIONS,
  trappings: TRAPPINGS, skills: SKILLS, plots: PLOTS,
};
