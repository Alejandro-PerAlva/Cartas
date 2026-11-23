// GENERADO por tools/gen-data.mjs a partir de data-src/howling.json. No editar a mano.
export default {
 "heroes": [],
 "bosses": [],
 "enemies": [],
 "loot": [],
 "potions": [],
 "trappings": [],
 "skills": [],
 "plots": [],
 "plotEnemies": [],
 "afflictions": [],
 "dungeon": [
  {
   "kind": "ambush",
   "type": 2,
   "code": "D11",
   "name": "Emboscada",
   "img": "expansions/howling/card_000.jpg",
   "isDungeon": true,
   "pack": "howling",
   "option1": "Pillas a tu enemigo por sorpresa y ganas la iniciativa.\nRoba una carta de enemigo e ignora el daño inicial que inflige. Añade 3 de daño a tu primer ataque.\nAñade el nivel de la mazmorra a su valor de salud.",
   "option2": "Tu enemigo te pilla por sorpresa, ganando la iniciativa.\nRoba una carta de enemigo y añade el nivel de la mazmorra al daño inicial que inflige.\nAñade a su salud el nivel de la mazmorra +5.",
   "id": "d11",
   "key": "D11",
   "copies": 3,
   "imgs": [
    "expansions/howling/card_000.jpg",
    "expansions/howling/card_001.jpg",
    "expansions/howling/card_002.jpg"
   ]
  },
  {
   "kind": "treasure",
   "type": 2,
   "code": "D12",
   "name": "Tesoro",
   "img": "expansions/howling/card_003.jpg",
   "isDungeon": true,
   "pack": "howling",
   "option1": "Encuentras un cofre que ha sido abierto y saqueado. Solo queda una moneda.\nGanas 1 de oro.",
   "option2": "Este cofre debe haber sido olvidado hace tiempo ya que está repleto de botín.\nRoba 1 carta de botín y 1 carta de poción.\n- o -\nGanas d6 de oro y 1 ración.",
   "id": "d12",
   "key": "D12"
  },
  {
   "kind": "labyrinth",
   "type": 2,
   "code": "D13",
   "name": "Laberinto",
   "img": "expansions/howling/card_004.jpg",
   "isDungeon": true,
   "pack": "howling",
   "option1": "¡Seguro que tu astucia te hace escapar del laberinto del mago!\nDescarta 1 ración. Si no tienes raciones, pierdes 3 de salud.\nGanas 1 de oro.",
   "option2": "¡Maldición! ¡No eres capaz de encontrar la salida!\nDescarta 2 raciones. Pierdes 3 de salud por cada ración que no puedas descartar.\nGanas 1 poción.",
   "id": "d13",
   "key": "D13"
  },
  {
   "kind": "mushrooms",
   "type": 2,
   "code": "D14",
   "name": "Plantación de Setas",
   "img": "expansions/howling/card_005.jpg",
   "isDungeon": true,
   "pack": "howling",
   "option1": "Has localizado una plantación de setas jóvenes.",
   "option2": "Te encuentras con una plantación de setas maduras.",
   "table1": [
    {
     "dice": [
      1,
      2
     ],
     "text": "Ganas 1 ficha de veneno."
    },
    {
     "dice": [
      3,
      4
     ],
     "text": "Ganas 1 ración."
    },
    {
     "dice": [
      5,
      6
     ],
     "text": "Ganas 2 raciones."
    }
   ],
   "table2": [
    {
     "dice": [
      1,
      2
     ],
     "text": "Ganas 1 ración."
    },
    {
     "dice": [
      3,
      4
     ],
     "text": "Ganas 2 raciones."
    },
    {
     "dice": [
      5,
      6
     ],
     "text": "Ganas 3 raciones."
    }
   ],
   "id": "d14",
   "key": "D14"
  },
  {
   "kind": "arrowTrap",
   "type": 2,
   "code": "D15",
   "name": "Trampa de Flechas",
   "img": "expansions/howling/card_006.jpg",
   "isDungeon": true,
   "pack": "howling",
   "option1": "Tu curiosidad por la estatua de ojos de rubí tiene un coste.",
   "option2": "Tu avaricia te hace ir cegado hasta una tormenta de flechas.",
   "table1": [
    {
     "dice": [
      1,
      2
     ],
     "text": "Ganas 2 fichas de veneno."
    },
    {
     "dice": [
      3,
      4
     ],
     "text": "Ganas 1 ficha de veneno."
    },
    {
     "dice": [
      5,
      6
     ],
     "text": "Ganas 0 fichas de veneno."
    }
   ],
   "table2": [
    {
     "dice": [
      1,
      2
     ],
     "text": "Ganas 3 fichas de veneno."
    },
    {
     "dice": [
      3,
      4
     ],
     "text": "Ganas 2 fichas de veneno."
    },
    {
     "dice": [
      5,
      6
     ],
     "text": "Ganas 1 ficha de veneno."
    }
   ],
   "id": "d15",
   "key": "D15"
  },
  {
   "kind": "skirmish",
   "type": 2,
   "code": "D16",
   "name": "Escaramuza",
   "img": "expansions/howling/card_007.jpg",
   "isDungeon": true,
   "pack": "howling",
   "option1": "¡Desenfundas tu arma y estás listo para el combate!\nRoba una carta de enemigo y añade a su salud el nivel de la mazmorra.",
   "option2": "¡Te cogen desprevenido y tropiezas con tu arma!\nRoba una carta de enemigo y añade a su salud el nivel de la mazmorra +4.\nSi derrotas a este enemigo ganas 1 de oro adicional.",
   "id": "d16",
   "key": "D16",
   "copies": 2,
   "imgs": [
    "expansions/howling/card_007.jpg",
    "expansions/howling/card_008.jpg"
   ]
  },
  {
   "kind": "camp",
   "type": 1,
   "code": "D17",
   "name": "Campamento",
   "img": "expansions/howling/card_018.jpg",
   "isDungeon": true,
   "pack": "howling",
   "text": "Encuentras un lugar relativamente tranquilo para acampar, pero no tardarás en llamar la atención. Elige una de las siguientes acciones.\nCocinar\nGasta 1 ración para ganar 3 de energía.\n- o -\nBuscar\nGanas 1 ración y 1 de oro.\n- o -\nDescansar\nGasta 1 ración para ganar 3 de salud y perder 1 de veneno.",
   "options": [
    {
     "id": "cook",
     "label": "Cocinar",
     "text": "Gasta 1 ración para ganar 3 de energía."
    },
    {
     "id": "search",
     "label": "Buscar",
     "text": "Ganas 1 ración y 1 de oro."
    },
    {
     "id": "rest",
     "label": "Descansar",
     "text": "Gasta 1 ración para ganar 3 de salud y perder 1 de veneno."
    }
   ],
   "id": "d17",
   "key": "D17"
  },
  {
   "kind": "merchant",
   "type": 1,
   "code": "D18",
   "name": "Mercader",
   "img": "expansions/howling/card_019.jpg",
   "isDungeon": true,
   "pack": "howling",
   "text": "Las profundidades de una mazmorra parece un lugar extraño para instalar un bazar, pero ¿quién eres tú para cuestionar su cordura? Puedes realizar un trato con el mercader.\nComprar\nPara ver qué mercancías tiene el mercader, roba 3 cartas de botín y 2 cartas de poción.\nVender\nEl comerciante te comprará los objetos que no quieras por 1 de oro cada uno.\nComerciar\nPuedes intercambiar cualquier objeto que tengas con un objeto que tenga el mercader, siempre que el objeto que le entregues tenga un valor superior al que recibas.",
   "options": [
    {
     "id": "buy",
     "label": "Comprar",
     "text": "Para ver qué mercancías tiene el mercader, roba 3 cartas de botín y 2 cartas de poción."
    },
    {
     "id": "sell",
     "label": "Vender",
     "text": "El comerciante te comprará los objetos que no quieras por 1 de oro cada uno."
    },
    {
     "id": "trade",
     "label": "Comerciar",
     "text": "Puedes intercambiar cualquier objeto que tengas con un objeto que tenga el mercader, siempre que el objeto que le entregues tenga un valor superior al que recibas."
    }
   ],
   "id": "d18",
   "key": "D18"
  },
  {
   "kind": "altar",
   "type": 1,
   "code": "D19",
   "name": "Altar",
   "img": "expansions/howling/card_020.jpg",
   "isDungeon": true,
   "pack": "howling",
   "text": "A veces, se puede encontrar un santuario en el lugar más insospechado.\nTe dejas caer de rodillas frente al altar y rezas por...?\nUna Bendición\nGanas 1 ficha de bendición.\n- o por...-\nFuerza\nGanas 2 de energía.\n- o por...-\nCuración\nDescarta d6-d6 fichas de veneno.\n- o por...-\nMerced\nSube un nivel en el control de moral.",
   "options": [
    {
     "id": "bless",
     "label": "Una Bendición",
     "text": "Ganas 1 ficha de bendición."
    },
    {
     "id": "strength",
     "label": "Fuerza",
     "text": "Ganas 2 de energía."
    },
    {
     "id": "cure",
     "label": "Curación",
     "text": "Descarta d6-d6 fichas de veneno."
    },
    {
     "id": "mercy",
     "label": "Merced",
     "text": "Sube un nivel en el control de moral."
    }
   ],
   "id": "d19",
   "key": "D19"
  },
  {
   "kind": "clearing",
   "type": 1,
   "code": "D20",
   "name": "Claro",
   "img": "expansions/howling/card_021.jpg",
   "isDungeon": true,
   "pack": "howling",
   "text": "En un claro puede ocurrir cualquier cosa...\nRoba una carta de trama y resuélvela.",
   "id": "d20",
   "key": "D20"
  },
  {
   "kind": "archangel",
   "type": 1,
   "code": "D21",
   "name": "Arcángel",
   "img": "expansions/howling/card_022.jpg",
   "isDungeon": true,
   "pack": "howling",
   "table": [
    {
     "moral": [
      "4",
      "5"
     ],
     "text": "Ganas 4 de salud."
    },
    {
     "moral": [
      "2",
      "3"
     ],
     "text": "Ganas 2 de salud."
    },
    {
     "moral": [
      "1"
     ],
     "text": "Ganas 1 de salud."
    },
    {
     "moral": [
      "0"
     ],
     "text": "No ocurre nada."
    },
    {
     "moral": [
      "-1"
     ],
     "text": "Pierdes 1 de salud."
    },
    {
     "moral": [
      "-2",
      "-3"
     ],
     "text": "Pierdes 2 de salud."
    },
    {
     "moral": [
      "-4",
      "-5"
     ],
     "text": "Pierdes 4 de salud."
    }
   ],
   "text": "Ante ti se manifiesta un destello de luz sagrada que te produce escalofríos. Cuando el resplandor se desvanece, ves el rostro de una mujer provista de grandes alas. Es el arcángel que ha venido a juzgar tus actos. Comprueba tu posición en el control de moral y consulta siguiente tabla.\n4/5 Ganas 4 de salud.\n2/3 Ganas 2 de salud.\n1 Ganas 1 de salud.\n0 No ocurre nada.\n-1 Pierdes 1 de salud.\n-2/-3 Pierdes 2 de salud.\n-4/-5 Pierdes 4 de salud.",
   "id": "d21",
   "key": "D21"
  },
  {
   "kind": "falseIdol",
   "type": 1,
   "code": "D22",
   "name": "Ídolo Falso",
   "img": "expansions/howling/card_023.jpg",
   "isDungeon": true,
   "pack": "howling",
   "text": "Tus ojos se clavan en una enorme y diabólica estatua tallada en la roca. Ruega ser adorada. ¿Qué vas a hacer?\nSuplicar Poder\nBaja un nivel en el control de moral. Ganas 2 de energía y 1 carta de botín.\nSuplicar Riqueza\nBaja un nivel en el control de moral. Ganas 2 de oro y 1 poción.\nSuplicar Por Tu Vida\nBaja un nivel en el control de moral. Ganas 2 de salud y 1 ración.\nIgnorar el Falso Ídolo\nSube un nivel en el control de moral. Pierdes 1 de salud.",
   "options": [
    {
     "id": "power",
     "label": "Suplicar Poder",
     "text": "Baja un nivel en el control de moral. Ganas 2 de energía y 1 carta de botín."
    },
    {
     "id": "wealth",
     "label": "Suplicar Riqueza",
     "text": "Baja un nivel en el control de moral. Ganas 2 de oro y 1 poción."
    },
    {
     "id": "life",
     "label": "Suplicar Por Tu Vida",
     "text": "Baja un nivel en el control de moral. Ganas 2 de salud y 1 ración."
    },
    {
     "id": "ignore",
     "label": "Ignorar el Falso Ídolo",
     "text": "Sube un nivel en el control de moral. Pierdes 1 de salud."
    }
   ],
   "id": "d22",
   "key": "D22"
  },
  {
   "kind": "fountain",
   "type": 1,
   "code": "D23",
   "name": "Fuente Mística",
   "img": "expansions/howling/card_024.jpg",
   "isDungeon": true,
   "pack": "howling",
   "table": [
    {
     "dice": [
      1
     ],
     "text": "Roba una carta de enemigo y añade el nivel de la mazmorra a su valor de salud."
    },
    {
     "dice": [
      3
     ],
     "text": "Te arrepientes inmediatamente de tus actos. Ganas 1 ficha de veneno."
    },
    {
     "dice": [
      5
     ],
     "text": "¡Qué suerte! Encuentras 1 de oro."
    },
    {
     "dice": [
      2
     ],
     "text": "De repente, te sientes revitalizado. Ganas 3 de salud."
    },
    {
     "dice": [
      4
     ],
     "text": "¡Se te concede un presente! Ganas 1 poción."
    },
    {
     "dice": [
      6
     ],
     "text": "Ganas una cantidad de fichas de bendición igual a nivel de mazmorra en el que estés."
    }
   ],
   "text": "Ante ti se alza una imponente fuente y te sientes atraído hacia ella por un poderoso encanto. Con los ojos muy abiertos, tomas algo de agua caliente con las manos y te la llevas a los labios...\nRoba una carta de enemigo y añade el nivel de la mazmorra a su valor de salud.\nTe arrepientes inmediatamente de tus actos. Ganas 1 ficha de veneno.\n¡Qué suerte! Encuentras 1 de oro.\nDe repente, te sientes revitalizado. Ganas 3 de salud.\n¡Se te concede un presente! Ganas 1 poción.\nGanas una cantidad de fichas de bendición igual a nivel de mazmorra en el que estés.",
   "id": "d23",
   "key": "D23"
  },
  {
   "kind": "wildEncounter",
   "type": 2,
   "code": "D24",
   "name": "Encuentro Salvaje",
   "img": "expansions/howling/card_025.jpg",
   "isDungeon": true,
   "pack": "howling",
   "option1": "¡Ante ti se alza un formidable enemigo!\nRoba 2 cartas de enemigo y descarta al que tenga menos salud *. Debes luchar contra el enemigo que permanezca, añadiendo a su salud el nivel de mazmorra +1.\n*En caso de empate, el jugador elige.",
   "option2": "¡No hay escapatoria ante esta terrible criatura!\nRoba 4 cartas de enemigo y descarta a los 3 que tengan menos salud*. Debes luchar contra el enemigo que permanezca, añadiendo a su salud el nivel de mazmorra +3.\n*En caso de empate, el jugador elige.",
   "id": "d24",
   "key": "D24",
   "copies": 2,
   "imgs": [
    "expansions/howling/card_025.jpg",
    "expansions/howling/card_026.jpg"
   ]
  }
 ],
 "environments": [],
 "artifacts": [],
 "mercenaries": [],
 "adventures": [],
 "gnome": null,
 "rules": [],
 "meta": {
  "backs": {
   "dungeon": "expansions/howling/card_009.jpg"
  }
 }
};
