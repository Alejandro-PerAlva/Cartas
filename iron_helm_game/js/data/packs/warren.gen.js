// GENERADO por tools/gen-data.mjs a partir de data-src/warren.json. No editar a mano.
export default {
 "heroes": [
  {
   "id": "c5",
   "kind": "hero",
   "code": "C5",
   "name": "Ozzlo",
   "img": "expansions/warren/card_022.jpg",
   "health": 17,
   "energy": 10,
   "encumbrance": 12,
   "rations": 1,
   "gold": 2,
   "trappingNames": [
    "Hacha de Batalla"
   ],
   "skillNames": [
    "Dominio del Hacha"
   ],
   "proficiency": "fuerza",
   "pack": "warren"
  }
 ],
 "bosses": [
  {
   "id": "b4",
   "kind": "boss",
   "code": "B4",
   "name": "Cíclope",
   "img": "expansions/warren/card_001.jpg",
   "health": 22,
   "damage": 5,
   "treasure": 2,
   "weakness": "fire",
   "purse": 3,
   "text": "Si el Cíclope te inflige 9 o más de daño, rompe tu arma principal.",
   "pack": "warren"
  }
 ],
 "enemies": [
  {
   "id": "e13",
   "kind": "enemy",
   "code": "E13",
   "name": "Grunkle",
   "img": "expansions/warren/card_002.jpg",
   "text": "Si el Grunkle te impacta con éxito, pierdes 1 de energía.",
   "pack": "warren",
   "health": 3,
   "damage": 2,
   "treasure": 1,
   "weakness": "fire",
   "purse": 0,
   "copies": 3,
   "imgs": [
    "expansions/warren/card_002.jpg",
    "expansions/warren/card_003.jpg",
    "expansions/warren/card_004.jpg"
   ]
  },
  {
   "id": "e14",
   "kind": "enemy",
   "code": "E14",
   "name": "Titilante",
   "img": "expansions/warren/card_005.jpg",
   "text": "Si derrotas a un Titilante, ganas 1 [ojo].",
   "pack": "warren",
   "health": 7,
   "damage": 3,
   "treasure": 2,
   "weakness": "fire",
   "purse": 0,
   "copies": 2,
   "imgs": [
    "expansions/warren/card_005.jpg",
    "expansions/warren/card_006.jpg"
   ]
  }
 ],
 "loot": [
  {
   "id": "l18",
   "kind": "item",
   "deck": "loot",
   "code": "L18",
   "name": "Amuleto de la Suerte",
   "img": "expansions/warren/card_007.jpg",
   "price": 2,
   "weight": 1,
   "slot": "AC",
   "text": "Cada vez que ganes botín roba dos cartas, elige una para quedártela y descarta la otra.",
   "pack": "warren"
  },
  {
   "id": "l19",
   "kind": "item",
   "deck": "loot",
   "code": "L19",
   "name": "Shuriken",
   "img": "expansions/warren/card_008.jpg",
   "price": 1,
   "weight": 1,
   "slot": "AC",
   "text": "Antes de recibir el daño inicial, puedes descartar esta carta para infligir d6 de daño a tu enemigo.",
   "pack": "warren"
  },
  {
   "id": "l20",
   "kind": "item",
   "deck": "loot",
   "code": "L20",
   "name": "Poción de Energía",
   "img": "expansions/warren/card_018.jpg",
   "price": 1,
   "weight": 1,
   "slot": "AC",
   "text": "Puedes descartar esta carta para ganar 2 de energía.",
   "pack": "warren"
  },
  {
   "id": "l21",
   "kind": "enemy",
   "code": "L21",
   "name": "Mimético de Hielo",
   "img": "expansions/warren/card_019.jpg",
   "text": "Puedes evitar este enfrentamiento gastando 2 raciones.",
   "pack": "warren",
   "health": 9,
   "damage": 3,
   "treasure": 0,
   "weakness": "fire",
   "purse": 0,
   "inLootDeck": true
  }
 ],
 "potions": [],
 "trappings": [
  {
   "id": "t16",
   "kind": "item",
   "deck": "trapping",
   "code": "T16",
   "name": "Broche de la Penitencia",
   "img": "expansions/warren/card_020.jpg",
   "price": 3,
   "weight": 1,
   "slot": "AC",
   "text": "En el Altar obtienes 2 bendiciones en vez de 1.",
   "pack": "warren"
  },
  {
   "id": "t15",
   "kind": "item",
   "deck": "trapping",
   "code": "T15",
   "name": "Hacha de Batalla",
   "img": "expansions/warren/card_021.jpg",
   "price": 4,
   "weight": 3,
   "slot": "2M",
   "text": "Los resultados de 1 infligen 6 de daño.",
   "pack": "warren"
  }
 ],
 "skills": [
  {
   "id": "s13",
   "kind": "skill",
   "code": "S13",
   "name": "Dominio del Hacha",
   "img": "expansions/warren/card_026.jpg",
   "proficiency": "fuerza",
   "text": "Cuando uses un hacha, puedes relanzar todos los resultados de 1 o 2.",
   "pack": "warren"
  }
 ],
 "plots": [
  {
   "id": "pt11",
   "kind": "plot",
   "code": "PT11",
   "name": "La Urna Dorada",
   "img": "expansions/warren/card_023.jpg",
   "eyes": 1,
   "narrative": "Unos escalones conducen hasta una plataforma de mármol con cuatro pilares. En el centro descansa una gran urna dorada con los restos de un monje fallecido. Se pueden ver ofrendas esparcidas por la base de la urna.",
   "text": "",
   "options": [
    {
     "id": "o1",
     "prompt": "¿Dejar una ofrenda?",
     "text": "Depositas una ofrenda junto a la urna.\nGanas 1 ficha de bendición por cada dos cartas de botín, poción o equipo que descartes.\nSube un nivel en el control de moral."
    },
    {
     "id": "o2",
     "prompt": "¿Quién echará esto de menos?",
     "text": "Rebuscas entre los objetos dejados junto a la urna y encuentras algo que te viene bien.\nBaja un nivel en el control de moral.\nRoba 3 cartas de botín, quédate con una de ellas y descarta el resto."
    }
   ],
   "pack": "warren"
  },
  {
   "id": "pt10",
   "kind": "plot",
   "code": "PT10",
   "name": "El Alquimista",
   "img": "expansions/warren/card_024.jpg",
   "eyes": 1,
   "narrative": "En el claro te encuentras con un anciano envuelto en una túnica desgarrada. Tiene los ojos cubiertos con un trapo. Ante él, sobre una manta extendida en el suelo, se puede ver un revoltijo de jarras llenas de diversos líquidos. A un lado hay un cuenco de arcilla con una sola moneda y un cartel que reza:\n\"Deja una moneda, llévate un milagro\".",
   "text": "",
   "options": [
    {
     "id": "o1",
     "prompt": "¿Comprar una poción?",
     "text": "Dejas caer una moneda en el cuenco y coges una poción.\nDescarta 1 de oro. Roba una carta cualquiera del mazo de pociones.\nSube un nivel en el control de moral."
    },
    {
     "id": "o2",
     "prompt": "¿Robar al ciego?",
     "text": "Te frotas codiciosamente las manos antes salir huyendo con algunas de las pertenencias del ciego.\nBaja un nivel en el control de moral.\nGanas 1 de oro y una poción de tu elección del mazo de pociones."
    }
   ],
   "pack": "warren"
  },
  {
   "id": "pt12",
   "kind": "plot",
   "code": "PT12",
   "name": "La Clériga",
   "img": "expansions/warren/card_025.jpg",
   "eyes": 2,
   "narrative": "Una mujer de mediana edad y piel oscura se te acerca. Está ataviada con ropa de color gris y lleva un cayado en la mano.\nEl broche de la penitencia que sujeta su manto te hace saber que es una mujer eclesiástica. Sus ojos parecen capaces de juzgarte con una sola mirada.",
   "text": "De entre las que tengas, elimina una cantidad fichas de veneno igual a tu posición en el control de moral.\nSi tu posición en el control de moral es 3 o superior, la clériga te concede la carta de equipo Broche de la Penitencia.\nSi ya tienes el Broche de la Penitencia, independientemente de tu posición en el control de moral, la clériga te concede una poción aleatoria del mazo de pociones y una ficha de bendición.",
   "options": [],
   "pack": "warren"
  }
 ],
 "plotEnemies": [],
 "afflictions": [],
 "dungeon": [],
 "meta": {
  "intro": {
   "name": "Laberinto de la Desesperación",
   "text": "Bandas de forajidos grunkles han estado saqueando varias aldeas del norte. Se rumorea que están liderados por un enorme gigante de hielo de un solo ojo. Alguien debería investigar estos sucesos…\nRetira las siguientes cartas del juego base y sustitúyelas por las cartas de esta expansión de aventuras.\nEnemigos: Goblins, Orcos y Skinklings.\nTramas: La Anciana, El Lobo y El Cadáver.\nJefe Final: Cíclope.\nNIVEL 2",
   "img": "expansions/warren/card_000.jpg"
  },
  "map": "expansions/warren/card_011.jpg"
 }
};
