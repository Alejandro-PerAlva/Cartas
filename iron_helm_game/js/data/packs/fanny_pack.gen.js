// GENERADO por tools/gen-data.mjs a partir de data-src/fanny_pack.json. No editar a mano.
export default {
 "heroes": [
  {
   "id": "c16",
   "kind": "hero",
   "code": "C16",
   "name": "Grimwald",
   "img": "expansions/fanny_pack/card_025.jpg",
   "health": 15,
   "energy": 11,
   "encumbrance": 10,
   "rations": 1,
   "gold": 2,
   "trappingNames": [
    "Yelmo de Hierro"
   ],
   "skillNames": [
    "Parar con el Escudo",
    "Valorar"
   ],
   "proficiency": "fuerza",
   "pack": "fanny_pack"
  },
  {
   "id": "c17",
   "kind": "hero",
   "code": "C17",
   "name": "Nanoc el Bárbaro",
   "img": "expansions/fanny_pack/card_026.jpg",
   "health": 18,
   "energy": 12,
   "encumbrance": 6,
   "rations": 1,
   "gold": 3,
   "trappingNames": [
    "Riñonera"
   ],
   "skillNames": [
    "Bloquear"
   ],
   "proficiency": "fuerza",
   "pack": "fanny_pack"
  }
 ],
 "bosses": [],
 "enemies": [
  {
   "id": "e34",
   "kind": "enemy",
   "code": "E34",
   "name": "Asesino",
   "img": "expansions/fanny_pack/card_001.jpg",
   "text": "Si se está resolviendo una carta de emboscada robada como segunda carta, el Asesino inflige el daño inicial dos veces.",
   "pack": "fanny_pack",
   "health": 4,
   "damage": 1,
   "treasure": 1,
   "weakness": "fire",
   "purse": 1
  },
  {
   "id": "e35",
   "kind": "enemy",
   "code": "E35",
   "name": "Araña Gigante",
   "img": "expansions/fanny_pack/card_002.jpg",
   "text": "Cada vez que la Araña Gigante te impacte con éxito, realizar tu siguiente ataque te cuesta 1 de energía adicional.",
   "pack": "fanny_pack",
   "health": 6,
   "damage": 2,
   "treasure": 0,
   "weakness": "ice",
   "purse": 0
  },
  {
   "id": "e36",
   "kind": "enemy",
   "code": "E36",
   "name": "Trampa de Foso",
   "img": "expansions/fanny_pack/card_003.jpg",
   "text": "Si estás resolviendo una carta de emboscada robada como primera carta, evitas la Trampa de Foso. En cualquier otro caso, pierdes d6-d6 puntos de vida.",
   "pack": "fanny_pack",
   "trap": true,
   "copies": 2,
   "imgs": [
    "expansions/fanny_pack/card_003.jpg",
    "expansions/fanny_pack/card_004.jpg"
   ]
  },
  {
   "id": "e37",
   "kind": "enemy",
   "code": "E37",
   "name": "Morlock",
   "img": "expansions/fanny_pack/card_005.jpg",
   "text": "Puedes descartar una antorcha o usar una lámpara para derrotar al Morlock antes de recibir el daño inicial.",
   "pack": "fanny_pack",
   "health": 5,
   "damage": 2,
   "treasure": 1,
   "weakness": "fire",
   "purse": 0
  }
 ],
 "loot": [
  {
   "id": "l47",
   "kind": "item",
   "deck": "loot",
   "code": "L47",
   "name": "Mandoble Ávido",
   "img": "expansions/fanny_pack/card_006.jpg",
   "price": 4,
   "weight": 3,
   "slot": "2M",
   "text": "Por el coste de 1 moneda de oro, puedes añadir un dado adicional a tu tirada de ataque.",
   "pack": "fanny_pack"
  },
  {
   "id": "l48",
   "kind": "item",
   "deck": "loot",
   "code": "L48",
   "name": "Objeto de Recuerdo",
   "img": "expansions/fanny_pack/card_007.jpg",
   "price": 2,
   "weight": 1,
   "slot": "AC",
   "text": "Mientras el Objeto de Recuerdo esté en tu inventario, ganas 2 de moral.",
   "pack": "fanny_pack"
  },
  {
   "id": "l49",
   "kind": "item",
   "deck": "loot",
   "code": "L49",
   "name": "Poción de la No Muerte",
   "img": "expansions/fanny_pack/card_008.jpg",
   "price": 2,
   "weight": 1,
   "slot": "AC",
   "text": "Descártala para destruir a cualquier enemigo no muerto con 5 o menos puntos de vida. O bien, descártala para hacer que cualquier enemigo tenga como debilidad “no muerto”.",
   "pack": "fanny_pack"
  },
  {
   "id": "l50",
   "kind": "item",
   "deck": "loot",
   "code": "L50",
   "name": "Broquel de Talhoffer",
   "img": "expansions/fanny_pack/card_018.jpg",
   "price": 4,
   "weight": 2,
   "slot": "OM",
   "text": "Resta 1 del daño inicial.\n+1 daño a la suma de las tiradas de ataque.\nPuede usarse con armas a dos manos.",
   "pack": "fanny_pack"
  },
  {
   "id": "at9",
   "kind": "item",
   "deck": "loot",
   "code": "AT9",
   "name": "Cápsula Corazón",
   "img": "expansions/fanny_pack/card_021.jpg",
   "price": 8,
   "weight": 1,
   "slot": "AC",
   "text": "Mientras lo tengas equipada, añade +2 a tu salud máxima. O bien, descártala para ganar 2d6 puntos de vida.",
   "pack": "fanny_pack",
   "rare": true
  }
 ],
 "potions": [],
 "trappings": [
  {
   "id": "t38",
   "kind": "item",
   "deck": "trapping",
   "code": "T38",
   "name": "Poción de Suerte",
   "img": "expansions/fanny_pack/card_022.jpg",
   "price": 1,
   "weight": 1,
   "slot": "AC",
   "text": "Descártala para relanzar todos tus dados durante un ataque. O bien, descártala para relanzar los dados de un ataque enemigo.",
   "pack": "fanny_pack"
  },
  {
   "id": "t39",
   "kind": "item",
   "deck": "trapping",
   "code": "T39",
   "name": "Riñonera",
   "img": "expansions/fanny_pack/card_023.jpg",
   "price": 2,
   "weight": 1,
   "slot": "AC",
   "text": "Mientras lo tengas equipada, puedes llevar hasta tres accesorios (AC) sin que afecte a tu valor de carga.",
   "pack": "fanny_pack"
  },
  {
   "id": "t40",
   "kind": "item",
   "deck": "trapping",
   "code": "T40",
   "name": "Bellota Mágica",
   "img": "expansions/fanny_pack/card_024.jpg",
   "price": 2,
   "weight": 1,
   "slot": "AC",
   "text": "Descarta esta carta para derrotar a cualquier enemigo excepto a un jefe final. Puedes conservar la carta para aprender una habilidad, pero no ganas tesoro alguno.",
   "pack": "fanny_pack"
  }
 ],
 "skills": [],
 "plots": [
  {
   "id": "pt40",
   "kind": "plot",
   "code": "PT40",
   "name": "El Espejo",
   "img": "expansions/fanny_pack/card_020.jpg",
   "eyes": 3,
   "narrative": "Conforme te acercas al claro, ves a otro personaje caminando hacia ti. Enseguida te das cuenta de que estás contemplando la superficie de un espejo que cubre todo un muro. Posas tu mano en el espejo y ves, con asombro, como tus dedos lo atraviesan.",
   "text": "",
   "options": [
    {
     "id": "o1",
     "prompt": "¿Atravesar el espejo?",
     "text": "Atraviesas lentamente el espejo y sientes una extraña brisa pasar a tu lado. Realiza una tirada d6 y resuelve.\n[dados 1,2] Atraviesas el otro lado y te encuentras cara a cara con un enemigo. Roba y resuelve una carta de enemigo.\n[dados 3,4] Atraviesas el otro lado y te sientes ligeramente más corpulento. Puedes sumar 1 a valor máximo de carga.\n[dados 5,6] Descarta las siguientes cuatro cartas del mazo de mazmorra sin mirarlas. Si estás entre niveles, descarta las cuatro primeras cartas del siguiente nivel."
    },
    {
     "id": "o2",
     "prompt": "¿Ignorar el muro en el que te reflejas?",
     "text": "Trepas por unas escarpadas rocas y encuentras una salida. Pierdes 1 de energía."
    }
   ],
   "pack": "fanny_pack"
  }
 ],
 "plotEnemies": [
  {
   "id": "pt39",
   "kind": "plot",
   "code": "PT39",
   "name": "Rey Goblin",
   "img": "expansions/fanny_pack/card_019.jpg",
   "text": "Puedes evitar el conflicto descartando cartas de Botín y Equipo con un valor combinado total de 4 o más.",
   "pack": "fanny_pack",
   "health": 13,
   "damage": 3,
   "treasure": 2,
   "weakness": "fire",
   "purse": 0,
   "plotEnemy": true,
   "eyes": 4
  }
 ],
 "afflictions": [],
 "dungeon": [],
 "meta": {
  "intro": {
   "name": "The Fanny Pack",
   "text": "The Fanny Pack es una expansión para potenciar y complementar el juego base de Iron Helm. También se puede utilizar con cualquier otra expansión, para así mejorar la experiencia de juego.\nLo mejor de esta expansión es que la mayoría del contenido ha sido creado por seguidores del juego Iron Helm, cosa que la hace un producto muy especial. De ahí su nombre: \"The FANny Pack\".\nUn agradecimiento especial a los seguidores de Iron Helm por sus increíbles contribuciones creativas:\nJakub Wojtowicz, Matthew Biddle\nCraig Asquith, Jesse Juutilainen\nNicholas Hnatiuk, Joe Phelps\nFreek Kuper, Frederic Huot",
   "img": "expansions/fanny_pack/card_011.jpg"
  }
 }
};
