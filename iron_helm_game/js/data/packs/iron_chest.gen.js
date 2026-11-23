// GENERADO por tools/gen-data.mjs a partir de data-src/iron_chest.json. No editar a mano.
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
 "dungeon": [],
 "environments": [],
 "artifacts": [],
 "mercenaries": [],
 "adventures": [
  {
   "kind": "adventure",
   "code": "MAP1",
   "name": "Aventura de Nivel 1",
   "img": "expansions/iron_chest/card_000.jpg",
   "level": 1,
   "color": "negro",
   "transitions": [
    {
     "from": 1,
     "to": 2,
     "icon": "random"
    },
    {
     "from": 2,
     "to": 3,
     "icon": "mushrooms"
    },
    {
     "from": 3,
     "to": 4,
     "icon": "trap"
    },
    {
     "from": 4,
     "to": 5,
     "icon": "potion"
    }
   ],
   "pack": "iron_chest",
   "id": "map1",
   "key": "MAP1",
   "copies": 2,
   "imgs": [
    "expansions/iron_chest/card_000.jpg",
    "expansions/iron_chest/card_005.jpg"
   ]
  },
  {
   "kind": "adventure",
   "code": "MAP2",
   "name": "Aventura de Nivel 2",
   "img": "expansions/iron_chest/card_001.jpg",
   "level": 2,
   "color": "verde",
   "transitions": [
    {
     "from": 1,
     "to": 2,
     "icon": "random"
    },
    {
     "from": 2,
     "to": 3,
     "icon": "trap"
    },
    {
     "from": 3,
     "to": 4,
     "icon": "mushrooms"
    },
    {
     "from": 4,
     "to": 5,
     "icon": "enemy"
    }
   ],
   "pack": "iron_chest",
   "id": "map2",
   "key": "MAP2",
   "copies": 2,
   "imgs": [
    "expansions/iron_chest/card_001.jpg",
    "expansions/iron_chest/card_004.jpg"
   ]
  },
  {
   "kind": "adventure",
   "code": "MAP3",
   "name": "Aventura de Nivel 3",
   "img": "expansions/iron_chest/card_002.jpg",
   "level": 3,
   "color": "azul",
   "transitions": [
    {
     "from": 1,
     "to": 2,
     "icon": "random"
    },
    {
     "from": 2,
     "to": 3,
     "icon": "enemy"
    },
    {
     "from": 3,
     "to": 4,
     "icon": "treasure"
    },
    {
     "from": 4,
     "to": 5,
     "icon": "potion"
    }
   ],
   "pack": "iron_chest",
   "id": "map3",
   "key": "MAP3",
   "copies": 2,
   "imgs": [
    "expansions/iron_chest/card_002.jpg",
    "expansions/iron_chest/card_007.jpg"
   ]
  },
  {
   "kind": "adventure",
   "code": "MAP4",
   "name": "Aventura de Nivel 4",
   "img": "expansions/iron_chest/card_003.jpg",
   "level": 4,
   "color": "morado",
   "transitions": [
    {
     "from": 1,
     "to": 2,
     "icon": "enemy"
    },
    {
     "from": 2,
     "to": 3,
     "icon": "random"
    },
    {
     "from": 3,
     "to": 4,
     "icon": "mushrooms"
    },
    {
     "from": 4,
     "to": 5,
     "icon": "trap"
    }
   ],
   "pack": "iron_chest",
   "id": "map4",
   "key": "MAP4",
   "copies": 2,
   "imgs": [
    "expansions/iron_chest/card_003.jpg",
    "expansions/iron_chest/card_006.jpg"
   ]
  }
 ],
 "gnome": null,
 "rules": [
  {
   "name": "Encuentros Aleatorios",
   "text": "Los Encuentros Aleatorios añaden una nueva mecánica a Iron Helm y responde a la pregunta de qué le ocurre a tu personaje entre nivel y nivel de una mazmorra. Roba la carta de mapa de encuentro aleatorio que corresponda al nivel de dificultad de la aventura en la que te encuentres (el nivel viene indicado en la propia carta de aventura).\nSi estás jugando con el juego base de Iron Helm, el nivel de la aventura es 1.\nColoca una miniatura (o un marcador cualquiera) en el nivel número 1 del mapa de la carta y ya estarías listo para jugar. Cuando termines un nivel de mazmorra y bajes al siguiente nivel del mapa, fíjate en el icono que se muestra entre cada nivel de la carta del mapa. A continuación, consulta el listado de iconos de abajo y resuelve.\nTRAMPA - Lanza un dado d6 y aplica el resultado: (1= Ganas 2 fichas de veneno), (2-4= Ganas 1 ficha de veneno), (5-6= Ganas 0 fichas de veneno).\nENEMIGO - Roba una carta de enemigo y resuelve el combate. Los enemigos no obtienen bonificaciones para su salud o la cantidad de daño inicial que infligen.\nSETAS - Lanza un dado d6 y aplica el resultado: (1= Ganas 1 ficha de veneno), (2-5= Ganas 1 ración), (6= Ganas 2 raciones).\nTESORO - Ganas 1 carta de botín aleatoria.\nPOCIÓN - Ganas 1 carta de poción aleatoria.\nENCUENTRO ALEATORIO - Realiza una tirada d6 y aplica y resuelve según los iconos de dados de esta carta. Si sacas como resultado un 6, vuelve a realizar otra tirada d6 y aplica el siguiente resultado:\n(1= Desprendimiento de Piedras. Pierdes 3 de vida).\n(2= Espinas Venenosas. Ganas 1 ficha de veneno).\n(3-4= Fuente. Ganas 2 de vida o 2 de energía).\n(5-6= Cadáver. Ganas 1 carta de equipo).",
   "img": "expansions/iron_chest/card_008.jpg",
   "table": [
    {
     "dice": [
      1
     ],
     "icon": "trampa (mandíbulas/pinchos)",
     "name": "TRAMPA",
     "text": "Lanza un dado d6 y aplica el resultado: (1= Ganas 2 fichas de veneno), (2-4= Ganas 1 ficha de veneno), (5-6= Ganas 0 fichas de veneno).",
     "subtable": [
      {
       "dice": [
        1
       ],
       "text": "Ganas 2 fichas de veneno"
      },
      {
       "dice": [
        2,
        3,
        4
       ],
       "text": "Ganas 1 ficha de veneno"
      },
      {
       "dice": [
        5,
        6
       ],
       "text": "Ganas 0 fichas de veneno"
      }
     ]
    },
    {
     "dice": [
      2
     ],
     "icon": "enemigo (hacha)",
     "name": "ENEMIGO",
     "text": "Roba una carta de enemigo y resuelve el combate. Los enemigos no obtienen bonificaciones para su salud o la cantidad de daño inicial que infligen."
    },
    {
     "dice": [
      3
     ],
     "icon": "setas",
     "name": "SETAS",
     "text": "Lanza un dado d6 y aplica el resultado: (1= Ganas 1 ficha de veneno), (2-5= Ganas 1 ración), (6= Ganas 2 raciones).",
     "subtable": [
      {
       "dice": [
        1
       ],
       "text": "Ganas 1 ficha de veneno"
      },
      {
       "dice": [
        2,
        3,
        4,
        5
       ],
       "text": "Ganas 1 ración"
      },
      {
       "dice": [
        6
       ],
       "text": "Ganas 2 raciones"
      }
     ]
    },
    {
     "dice": [
      4
     ],
     "icon": "tesoro (cofre)",
     "name": "TESORO",
     "text": "Ganas 1 carta de botín aleatoria."
    },
    {
     "dice": [
      5
     ],
     "icon": "poción",
     "name": "POCIÓN",
     "text": "Ganas 1 carta de poción aleatoria."
    },
    {
     "dice": [
      6
     ],
     "icon": "dado con interrogaciones (encuentro aleatorio)",
     "name": "ENCUENTRO ALEATORIO",
     "text": "Realiza una tirada d6 y aplica y resuelve según los iconos de dados de esta carta. Si sacas como resultado un 6, vuelve a realizar otra tirada d6 y aplica el siguiente resultado:",
     "subtable": [
      {
       "dice": [
        1
       ],
       "text": "Desprendimiento de Piedras. Pierdes 3 de vida."
      },
      {
       "dice": [
        2
       ],
       "text": "Espinas Venenosas. Ganas 1 ficha de veneno."
      },
      {
       "dice": [
        3,
        4
       ],
       "text": "Fuente. Ganas 2 de vida o 2 de energía."
      },
      {
       "dice": [
        5,
        6
       ],
       "text": "Cadáver. Ganas 1 carta de equipo."
      }
     ]
    }
   ]
  },
  {
   "name": "Iron Chest",
   "text": "IRON CHEST\nIron Chest es una expansión para Iron Helm y necesitarás el juego base para poder jugarla. Lo ideal sería empezar organizando todas las expansiones. Para ello, busca entre todas las cartas las que se parezcan a las que se muestran a continuación; son las cartas con la portada de cada expansión\n[Portadas, de izquierda a derecha: Iron Helm Expansión 7 - El Torreón de Zogar (icono: tentáculo); Iron Helm - Terreno y Reliquias (icono: cesto de setas); Iron Helm - Bestias y Trabas (icono: criatura con un ojo); Iron Helm - Posada del Troll Solitario (icono: chimenea)]\nSi das la vuelta a cada carta, encontrarás las instrucciones de las cuatro expansiones. En la esquina superior izquierda y derecha verás un icono de expansión, es el mismo que muestran todas las cartas que pertenecen a cada expansión. Justo encima de este párrafo puedes ver los cuatro iconos y, arriba, la expansión a la que pertenece. Debes separar todas cartas de Iron Chest en función de estos iconos. Cada expansión contiene 18 cartas, incluida la de la portada. El dado verde de 12mm que se incluye con Iron Chest sirve para las cartas de Esbirros de la expansión La Posada del Troll Solitario. A estas alturas ya deberías tener todas las expansiones separadas y ordenadas.\nA continuación, podrás encontrar 4 cartas de mapa de tamaño grande, una carta de reglas para los Encuentros Aleatorios y 3 miniaturas de plástico que se utilizan con esta expansión. Con los Encuentros Aleatorios se añaden eventos que se activarán entre los niveles de la mazmorra.\nPor último, esta expansión incluye 15 separadores: 4 con el fondo negro son para los nuevos tipos de carta, 4 con el fondo gris son para las nuevas expansiones y 7 con el fondo rojo para aventuras de reemplazo.\n¿CÓMO AÑADIR TODO ESTO?\nUtilizar cualquiera de las expansiones sueltas o la de los Encuentros Aleatorios es tan sencillo como leer la carta de instrucciones correspondiente y decidir si quieres añadirla a tus aventuras. Puedes añadir un único componente de una expansión, como los Esbirros de La Posada del Troll Solitario, e ignorar el resto de cartas de esa expansión. También puedes añadirlo todo al mismo tiempo, tú decides. La mayor parte de estas expansiones aumenta algo la dificultad; esto se indica en las cartas de instrucciones.\nIron Chest incluye también la expansión considerada como la aventura final: El Torreón de Zogar. Es una mazmorra de nivel 4 que requiere que hayas superado antes el juego base, una mazmorra de nivel 2 y otra de nivel 3.\nSi tienes más preguntas acerca del juego puedes encontrar en la web de Game Crafter un vídeo tutorial que explica con detalle todo lo necesario para jugar a Iron Helm.\nIron Chest is Copyright 2022 Grey Gnome Games and Jason Glover. All Rights Reserved. Designed by Jason Glover & Illustrated by Jason Glover & Daniel Walthall\nTradumaquetación: Aizen Myo 4U 2023",
   "img": "expansions/iron_chest/card_009.jpg"
  },
  {
   "name": "Iron Chest",
   "text": "IRON CHEST\nIron Chest es una expansión para Iron Helm y necesitarás el juego base para poder jugarla. Lo ideal sería empezar organizando todas las expansiones. Para ello, busca entre todas las cartas las que se parezcan a las que se muestran a continuación; son las cartas con la portada de cada expansión\n[Portadas, de izquierda a derecha: Iron Helm Expansión 7 - El Torreón de Zogar (icono: tentáculo); Iron Helm - Terreno y Reliquias (icono: cesto de setas); Iron Helm - Bestias y Trabas (icono: criatura con un ojo); Iron Helm - Posada del Troll Solitario (icono: chimenea)]\nSi das la vuelta a cada carta, encontrarás las instrucciones de las cuatro expansiones. En la esquina superior izquierda y derecha verás un icono de expansión, es el mismo que muestran todas las cartas que pertenecen a cada expansión. Justo encima de este párrafo puedes ver los cuatro iconos y, arriba, la expansión a la que pertenece. Debes separar todas cartas de Iron Chest en función de estos iconos. Cada expansión contiene 18 cartas, incluida la de la portada. El dado verde de 12mm que se incluye con Iron Chest sirve para las cartas de Esbirros de la expansión La Posada del Troll Solitario. A estas alturas ya deberías tener todas las expansiones separadas y ordenadas.\nA continuación, podrás encontrar 4 cartas de mapa de tamaño grande, una carta de reglas para los Encuentros Aleatorios y 3 miniaturas de plástico que se utilizan con esta expansión. Con los Encuentros Aleatorios se añaden eventos que se activarán entre los niveles de la mazmorra.\nPor último, esta expansión incluye 15 separadores: 4 con el fondo negro son para los nuevos tipos de carta, 4 con el fondo gris son para las nuevas expansiones y 7 con el fondo rojo para aventuras de reemplazo.\n¿CÓMO AÑADIR TODO ESTO?\nUtilizar cualquiera de las expansiones sueltas o la de los Encuentros Aleatorios es tan sencillo como leer la carta de instrucciones correspondiente y decidir si quieres añadirla a tus aventuras. Puedes añadir un único componente de una expansión, como los Esbirros de La Posada del Troll Solitario, e ignorar el resto de cartas de esa expansión. También puedes añadirlo todo al mismo tiempo, tú decides. La mayor parte de estas expansiones aumenta algo la dificultad; esto se indica en las cartas de instrucciones.\nIron Chest incluye también la expansión considerada como la aventura final: El Torreón de Zogar. Es una mazmorra de nivel 4 que requiere que hayas superado antes el juego base, una mazmorra de nivel 2 y otra de nivel 3.\nSi tienes más preguntas acerca del juego puedes encontrar en la web de Game Crafter un vídeo tutorial que explica con detalle todo lo necesario para jugar a Iron Helm.\nIron Chest is Copyright 2022 Grey Gnome Games and Jason Glover. All Rights Reserved. Designed by Jason Glover & Illustrated by Jason Glover & Daniel Walthall\nTradumaquetación: Aizen Myo 4U 2023",
   "img": "expansions/iron_chest/card_010.jpg"
  }
 ],
 "meta": {
  "backs": {},
  "intro": {
   "name": "Encuentros Aleatorios",
   "text": "Los Encuentros Aleatorios añaden una nueva mecánica a Iron Helm y responde a la pregunta de qué le ocurre a tu personaje entre nivel y nivel de una mazmorra. Roba la carta de mapa de encuentro aleatorio que corresponda al nivel de dificultad de la aventura en la que te encuentres (el nivel viene indicado en la propia carta de aventura).\nSi estás jugando con el juego base de Iron Helm, el nivel de la aventura es 1.\nColoca una miniatura (o un marcador cualquiera) en el nivel número 1 del mapa de la carta y ya estarías listo para jugar. Cuando termines un nivel de mazmorra y bajes al siguiente nivel del mapa, fíjate en el icono que se muestra entre cada nivel de la carta del mapa. A continuación, consulta el listado de iconos de abajo y resuelve.\nTRAMPA - Lanza un dado d6 y aplica el resultado: (1= Ganas 2 fichas de veneno), (2-4= Ganas 1 ficha de veneno), (5-6= Ganas 0 fichas de veneno).\nENEMIGO - Roba una carta de enemigo y resuelve el combate. Los enemigos no obtienen bonificaciones para su salud o la cantidad de daño inicial que infligen.\nSETAS - Lanza un dado d6 y aplica el resultado: (1= Ganas 1 ficha de veneno), (2-5= Ganas 1 ración), (6= Ganas 2 raciones).\nTESORO - Ganas 1 carta de botín aleatoria.\nPOCIÓN - Ganas 1 carta de poción aleatoria.\nENCUENTRO ALEATORIO - Realiza una tirada d6 y aplica y resuelve según los iconos de dados de esta carta. Si sacas como resultado un 6, vuelve a realizar otra tirada d6 y aplica el siguiente resultado:\n(1= Desprendimiento de Piedras. Pierdes 3 de vida).\n(2= Espinas Venenosas. Ganas 1 ficha de veneno).\n(3-4= Fuente. Ganas 2 de vida o 2 de energía).\n(5-6= Cadáver. Ganas 1 carta de equipo).",
   "img": "expansions/iron_chest/card_008.jpg"
  },
  "encounterTable": [
   {
    "dice": [
     1
    ],
    "icon": "trampa (mandíbulas/pinchos)",
    "name": "TRAMPA",
    "text": "Lanza un dado d6 y aplica el resultado: (1= Ganas 2 fichas de veneno), (2-4= Ganas 1 ficha de veneno), (5-6= Ganas 0 fichas de veneno).",
    "subtable": [
     {
      "dice": [
       1
      ],
      "text": "Ganas 2 fichas de veneno"
     },
     {
      "dice": [
       2,
       3,
       4
      ],
      "text": "Ganas 1 ficha de veneno"
     },
     {
      "dice": [
       5,
       6
      ],
      "text": "Ganas 0 fichas de veneno"
     }
    ]
   },
   {
    "dice": [
     2
    ],
    "icon": "enemigo (hacha)",
    "name": "ENEMIGO",
    "text": "Roba una carta de enemigo y resuelve el combate. Los enemigos no obtienen bonificaciones para su salud o la cantidad de daño inicial que infligen."
   },
   {
    "dice": [
     3
    ],
    "icon": "setas",
    "name": "SETAS",
    "text": "Lanza un dado d6 y aplica el resultado: (1= Ganas 1 ficha de veneno), (2-5= Ganas 1 ración), (6= Ganas 2 raciones).",
    "subtable": [
     {
      "dice": [
       1
      ],
      "text": "Ganas 1 ficha de veneno"
     },
     {
      "dice": [
       2,
       3,
       4,
       5
      ],
      "text": "Ganas 1 ración"
     },
     {
      "dice": [
       6
      ],
      "text": "Ganas 2 raciones"
     }
    ]
   },
   {
    "dice": [
     4
    ],
    "icon": "tesoro (cofre)",
    "name": "TESORO",
    "text": "Ganas 1 carta de botín aleatoria."
   },
   {
    "dice": [
     5
    ],
    "icon": "poción",
    "name": "POCIÓN",
    "text": "Ganas 1 carta de poción aleatoria."
   },
   {
    "dice": [
     6
    ],
    "icon": "dado con interrogaciones (encuentro aleatorio)",
    "name": "ENCUENTRO ALEATORIO",
    "text": "Realiza una tirada d6 y aplica y resuelve según los iconos de dados de esta carta. Si sacas como resultado un 6, vuelve a realizar otra tirada d6 y aplica el siguiente resultado:",
    "subtable": [
     {
      "dice": [
       1
      ],
      "text": "Desprendimiento de Piedras. Pierdes 3 de vida."
     },
     {
      "dice": [
       2
      ],
      "text": "Espinas Venenosas. Ganas 1 ficha de veneno."
     },
     {
      "dice": [
       3,
       4
      ],
      "text": "Fuente. Ganas 2 de vida o 2 de energía."
     },
     {
      "dice": [
       5,
       6
      ],
      "text": "Cadáver. Ganas 1 carta de equipo."
     }
    ]
   }
  ]
 }
};
