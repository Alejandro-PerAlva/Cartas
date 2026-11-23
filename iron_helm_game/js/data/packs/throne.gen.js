// GENERADO por tools/gen-data.mjs a partir de data-src/throne.json. No editar a mano.
export default {
 "heroes": [
  {
   "kind": "hero",
   "code": "C9",
   "name": "Grimmly",
   "img": "expansions/throne/card_007.jpg",
   "health": 14,
   "energy": 10,
   "encumbrance": 9,
   "rations": 2,
   "gold": 4,
   "trappingNames": [
    "Bastón de Peregrino",
    "Petaca"
   ],
   "skillNames": [
    "Correr"
   ],
   "proficiency": "agilidad",
   "pack": "throne",
   "id": "c9",
   "key": "C9"
  }
 ],
 "bosses": [
  {
   "kind": "boss",
   "code": "B8",
   "name": "Elemental de Fuego",
   "img": "expansions/throne/card_001.jpg",
   "health": 24,
   "damage": 4,
   "treasure": 2,
   "weakness": "ice",
   "purse": 3,
   "text": "Si el Elemental de Fuego te inflige 8 o más puntos de daño, destruye todo lo que lleves puesto en tu Cuerpo.",
   "pack": "throne",
   "id": "b8",
   "key": "B8"
  }
 ],
 "enemies": [
  {
   "kind": "enemy",
   "code": "E21",
   "name": "Piel de Lagarto",
   "img": "expansions/throne/card_002.jpg",
   "text": "Si el Piel de Lagarto te inflige daño con éxito, pierdes también 1 de energía.",
   "pack": "throne",
   "health": 6,
   "damage": 2,
   "treasure": 1,
   "weakness": "ice",
   "purse": 1,
   "id": "e21",
   "key": "E21",
   "copies": 2,
   "imgs": [
    "expansions/throne/card_002.jpg",
    "expansions/throne/card_003.jpg"
   ]
  },
  {
   "kind": "enemy",
   "code": "E22",
   "name": "Vampiro de Fuego",
   "img": "expansions/throne/card_004.jpg",
   "text": "Si el Vampiro de Fuego contraataca con éxito, ganas 2 fichas de veneno.",
   "pack": "throne",
   "health": 4,
   "damage": 1,
   "treasure": 0,
   "weakness": "ice",
   "purse": 0,
   "id": "e22",
   "key": "E22",
   "copies": 3,
   "imgs": [
    "expansions/throne/card_004.jpg",
    "expansions/throne/card_005.jpg",
    "expansions/throne/card_006.jpg"
   ]
  }
 ],
 "loot": [
  {
   "kind": "item",
   "deck": "loot",
   "code": "L35",
   "name": "Aguijón de Grasgol",
   "img": "expansions/throne/card_008.jpg",
   "price": 6,
   "weight": 1,
   "slot": "2M",
   "text": "Una vez por nivel de mazmorra, antes de recibir el daño inicial, puedes disparar una flecha infligiendo d6 de daño.",
   "pack": "throne",
   "id": "l35",
   "key": "L35"
  },
  {
   "kind": "item",
   "deck": "loot",
   "code": "L36",
   "name": "Cuerno Maldito",
   "img": "expansions/throne/card_018.jpg",
   "price": 0,
   "weight": 1,
   "slot": "AC",
   "text": "¡Es tan bonito!\nDebes quedarte con este objeto y no puedes tirarlo ni venderlo.",
   "pack": "throne",
   "id": "l36",
   "key": "L36"
  },
  {
   "kind": "item",
   "deck": "loot",
   "code": "L37",
   "name": "Cazadora de Olum",
   "img": "expansions/throne/card_019.jpg",
   "price": 7,
   "weight": 2,
   "slot": "MP",
   "text": "Los resultados de 5 o 6 en tiradas de ataque infligen, cada uno, 3 de daño adicional contra enemigos con debilidad Fuego.",
   "pack": "throne",
   "id": "l37",
   "key": "L37"
  },
  {
   "kind": "item",
   "deck": "loot",
   "code": "L38",
   "name": "Protección de Olum",
   "img": "expansions/throne/card_020.jpg",
   "price": 5,
   "weight": 3,
   "slot": "OM",
   "text": "Resta 1 tanto al daño inicial como a los contraataques. Resta 1 adicional si los enemigos tienen como debilidad Hielo.",
   "pack": "throne",
   "id": "l38",
   "key": "L38"
  }
 ],
 "potions": [],
 "trappings": [
  {
   "kind": "item",
   "deck": "trapping",
   "code": "T27",
   "name": "Bastón de Peregrino",
   "img": "expansions/throne/card_024.jpg",
   "price": 3,
   "weight": 2,
   "slot": "2M",
   "text": "Siempre debes relanzar los resultados de 6 en los ataques.\nAñade +2 a la suma de tus tiradas de ataque contra enemigos no muertos.",
   "pack": "throne",
   "id": "t27",
   "key": "T27"
  },
  {
   "kind": "item",
   "deck": "trapping",
   "code": "T26",
   "name": "Petaca",
   "img": "expansions/throne/card_025.jpg",
   "price": 1,
   "weight": 1,
   "slot": "AC",
   "text": "Bebe de la Petaca para ganar 2 de salud. Solo se puede usar una vez, pero se puede rellenar de forma gratuita en el campamento.",
   "pack": "throne",
   "id": "t26",
   "key": "T26"
  }
 ],
 "skills": [
  {
   "kind": "skill",
   "code": "S20",
   "name": "Correr",
   "img": "expansions/throne/card_026.jpg",
   "proficiency": "agilidad",
   "text": "Una vez por nivel de mazmorra, puedes gastar energía para evitar cualquier carta de mazmorra. Realiza una tirada para ver cuánta energía has gastado.",
   "pack": "throne",
   "table": [
    {
     "dice": [
      1,
      2
     ],
     "text": "La mitad de tu Energía."
    },
    {
     "dice": [
      3,
      4
     ],
     "text": "1 de Energía."
    },
    {
     "dice": [
      5,
      6
     ],
     "text": "Nada de Energía."
    }
   ],
   "id": "s20",
   "key": "S20"
  }
 ],
 "plots": [
  {
   "kind": "plot",
   "code": "PT26",
   "name": "La Vieja Goblin",
   "img": "expansions/throne/card_021.jpg",
   "eyes": 1,
   "narrative": "En el claro ves a una vieja goblin intentando bajar un cubo al interior de un pozo. Va vestida como una chamán y parece que le cuesta manejar la manivela que hace descender el cubo.",
   "text": "",
   "options": [
    {
     "id": "o1",
     "prompt": "¿Ayudar a la vieja goblin?",
     "text": "Te encaminas hacia la vieja goblin. Parece sobresaltarse al verte y, aún más, cuando le ayudas a sacar agua. Te devuelve el favor regalándote una poción.\nGanas 1 poción aleatoria y pierdes 2 de energía.\nSube dos niveles en el control de moral."
    },
    {
     "id": "o2",
     "prompt": "¡Robar a la vieja bruja!",
     "text": "Vences fácilmente a la débil criatura y te llevas todas sus pertenencias.\nGanas 1 poción aleatoria y 2 monedas de oro.\nBaja dos niveles en el control de moral."
    }
   ],
   "pack": "throne",
   "id": "pt26",
   "key": "PT26"
  },
  {
   "kind": "plot",
   "code": "PT27",
   "name": "Columna de Fuego",
   "img": "expansions/throne/card_022.jpg",
   "eyes": 3,
   "narrative": "Al frente se alza una columna de fuego que llega hasta el techo de la cueva. Para tu sorpresa, la propia llama del fuego comienza a hablarte:\n\"Tengo hambre de carne y hueso. Compláceme y tendrás tu recompensa\".",
   "text": "",
   "options": [
    {
     "id": "o1",
     "prompt": "¿Alimentar al fuego?",
     "text": "Coges el cadáver de un enemigo al que acabas de derrotar y lo arrojas a las llamas. El fuego suspira de placer.\nDescarta una carta de enemigo derrotado que no hayas gastado. Gana un tesoro con una cantidad de monedas de oro igual a la recompensa mostrada en dicha carta de enemigo descartada.\nPierdes 1 ficha de energía."
    },
    {
     "id": "o2",
     "prompt": "¿Ignoras las voces que resuenan en tu cabeza?",
     "text": "Haces como si no hubieras escuchado nada y sigues tu camino."
    }
   ],
   "pack": "throne",
   "id": "pt27",
   "key": "PT27"
  },
  {
   "kind": "plot",
   "code": "PT25",
   "name": "El Loco",
   "img": "expansions/throne/card_023.jpg",
   "eyes": 2,
   "narrative": "\"¡Es mío, todo mío. Por fin lo tengo otra vez!\". Te encuentras a una figura sombría en el claro que susurra para sí mismo, mientras sostiene un objeto envuelto en una tela.",
   "text": "",
   "options": [
    {
     "id": "o1",
     "prompt": "¿Preguntar al hombre por el objeto?",
     "text": ""
    },
    {
     "id": "o2",
     "prompt": "¡Dejas al hombre en paz!",
     "text": "Evitas que el hombre te vea mientras rodeas la caverna hasta el pasadizo del otro lado."
    }
   ],
   "table": [
    {
     "dice": [
      1,
      2
     ],
     "text": "Cuando te acercas, el hombre gira sobre sí mismo y desaparece en una nube de humo. En su lugar aparece un enemigo. Roba y enfréntate a un enemigo aleatorio."
    },
    {
     "dice": [
      3,
      4
     ],
     "text": "El hombre te revela el objeto con cierta vacilación. Solo verlo te llena de poder. A continuación, El hombre lo cubre rápidamente y sale corriendo. Ganas 2 de energía."
    },
    {
     "dice": [
      5,
      6
     ],
     "text": "El hombre no te muestra el objeto. Sin embargo, te entrega un objeto antes de desaparecer entre las sombras. Ganas 1 carta de Botín aleatoria."
    }
   ],
   "pack": "throne",
   "id": "pt25",
   "key": "PT25"
  }
 ],
 "plotEnemies": [],
 "afflictions": [],
 "dungeon": [],
 "environments": [],
 "artifacts": [],
 "mercenaries": [],
 "adventures": [],
 "gnome": null,
 "rules": [],
 "meta": {
  "backs": {},
  "intro": {
   "name": "El Trono Ardiente",
   "text": "Corren rumores acerca de majestuosos tesoros que se encuentran en las profundidades de las minas de Talora. Pero esas mismas historias hablan de que allí abajo hay una monstruosa criatura creada por el fuego.\nRetira las siguientes cartas del juego base y sustitúyelas por las cartas de esta expansión de aventuras.\nEnemigos: Orcos y Troll de las Cavernas.\nTramas: El Cadáver, El Pasadizo y La Anciana.\nJefe Final: Elemental de Fuego.\nNIVEL 2",
   "img": "expansions/throne/card_000.jpg"
  },
  "campaign": {
   "name": "El Trono Ardiente",
   "level": 2,
   "removes": {
    "enemies": [
     "Orcos",
     "Troll de las Cavernas"
    ],
    "plots": [
     "El Cadáver",
     "El Pasadizo",
     "La Anciana"
    ]
   },
   "boss": "Elemental de Fuego",
   "adds": "Retira las siguientes cartas del juego base y sustitúyelas por las cartas de esta expansión de aventuras."
  },
  "map": "expansions/throne/card_011.jpg"
 }
};
