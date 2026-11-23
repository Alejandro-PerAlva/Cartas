// GENERADO por tools/gen-data.mjs a partir de data-src/spire.json. No editar a mano.
export default {
 "heroes": [],
 "bosses": [
  {
   "kind": "boss",
   "code": "B10",
   "name": "Zogar",
   "img": "expansions/spire/card_001.jpg",
   "health": 24,
   "damage": 4,
   "treasure": 2,
   "weakness": "*",
   "purse": 5,
   "text": "* Zogar es inmune a los ataques sagrados, de fuego y de hielo. Siempre que Zogar saque resultados dobles, pierdes 2 de energía.",
   "pack": "spire",
   "immunities": [
    "sagrado",
    "fuego",
    "hielo"
   ],
   "id": "b10",
   "key": "B10"
  }
 ],
 "enemies": [
  {
   "kind": "enemy",
   "code": "E31",
   "name": "Umruss",
   "img": "expansions/spire/card_002.jpg",
   "text": "Cuando el Umruss te impacta con éxito, ganas 1 ficha de veneno.",
   "pack": "spire",
   "health": 8,
   "damage": 2,
   "treasure": 1,
   "weakness": "fire",
   "purse": 1,
   "id": "e31",
   "key": "E31",
   "copies": 2,
   "imgs": [
    "expansions/spire/card_002.jpg",
    "expansions/spire/card_003.jpg"
   ]
  },
  {
   "kind": "enemy",
   "code": "E32",
   "name": "Poseído",
   "img": "expansions/spire/card_004.jpg",
   "text": "Cuando el Poseído te impacta con éxito, pierdes 1 ficha de bendición.",
   "pack": "spire",
   "health": 7,
   "damage": 1,
   "treasure": 1,
   "weakness": "ice",
   "purse": 1,
   "id": "e32",
   "key": "E32",
   "copies": 3,
   "imgs": [
    "expansions/spire/card_004.jpg",
    "expansions/spire/card_005.jpg",
    "expansions/spire/card_006.jpg"
   ]
  },
  {
   "kind": "enemy",
   "code": "E33",
   "name": "Señor de Huesos",
   "img": "expansions/spire/card_007.jpg",
   "text": "Cuando el Señor de Huesos sea derrotado, ganas una cantidad de fichas de bendición igual a tu posición en el control de moral.",
   "pack": "spire",
   "health": 11,
   "damage": 3,
   "treasure": 1,
   "weakness": "undead",
   "purse": 0,
   "id": "e33",
   "key": "E33"
  }
 ],
 "loot": [
  {
   "kind": "item",
   "deck": "loot",
   "code": "L43",
   "name": "Espada del Vidente",
   "img": "expansions/spire/card_008.jpg",
   "price": 5,
   "weight": 1,
   "slot": "MP",
   "text": "Cuando derrotes a un enemigo con la Espada del Vidente, puedes revelar la siguiente carta del mazo de enemigos.",
   "pack": "spire",
   "id": "l43",
   "key": "L43"
  },
  {
   "kind": "item",
   "deck": "loot",
   "code": "L44",
   "name": "Escudo de Drenaje",
   "img": "expansions/spire/card_018.jpg",
   "price": 6,
   "weight": 2,
   "slot": "OM",
   "text": "Una vez por nivel de mazmorra, puedes boquear todo el daño inicial y ganar 3 de salud.",
   "pack": "spire",
   "id": "l44",
   "key": "L44"
  },
  {
   "kind": "item",
   "deck": "loot",
   "code": "L45",
   "name": "Capa de Cultista",
   "img": "expansions/spire/card_019.jpg",
   "price": 6,
   "weight": 2,
   "slot": "CA",
   "text": "Una vez por nivel de mazmorra, puedes evitar cualquier conflicto contra un enemigo que tenga 5 o menos de salud base.",
   "pack": "spire",
   "id": "l45",
   "key": "L45"
  },
  {
   "kind": "item",
   "deck": "loot",
   "code": "L46",
   "name": "Elixir de Helgen",
   "img": "expansions/spire/card_020.jpg",
   "price": 4,
   "weight": 1,
   "slot": "AC",
   "text": "Descarta esta carta para ganar 3 de salud y 3 de energía. Además, Elimina 2 fichas de veneno.",
   "pack": "spire",
   "id": "l46",
   "key": "L46",
   "copies": 2,
   "imgs": [
    "expansions/spire/card_020.jpg",
    "expansions/spire/card_021.jpg"
   ]
  }
 ],
 "potions": [],
 "trappings": [],
 "skills": [],
 "plots": [
  {
   "kind": "plot",
   "code": "PT31",
   "name": "El Maligno",
   "img": "expansions/spire/card_022.jpg",
   "eyes": 1,
   "narrative": "En el claro te está esperando una figura misteriosa. Al aferrar tu arma, la figura extiende su mano hacia arriba en un gesto de paz. Te mantienes a cierta distancia de la figura embozada cuando empieza a hablarte. \"Debe suponer una gran carga llevar esas bendiciones de dioses moribundos. Yo puedo acarrearlas por ti\".",
   "text": "",
   "options": [
    {
     "id": "o1",
     "prompt": "¿Vender tus bendiciones?",
     "text": "Puedes cambiar 1 ficha de bendición por 2 monedas de oro o 1 ración.\no bien\nPuedes cambiar 2 fichas de bendición por 1 poción."
    },
    {
     "id": "o2",
     "prompt": "¿Marcharte?",
     "text": "Sabes perfectamente que no debes hacer tratos con ese ser oscuro."
    }
   ],
   "pack": "spire",
   "id": "spire_pt31",
   "key": "spire:PT31"
  },
  {
   "kind": "plot",
   "code": "PT32",
   "name": "La Choza",
   "img": "expansions/spire/card_023.jpg",
   "eyes": 1,
   "narrative": "En el claro se ve una pequeña cabaña y lo que parece una hoguera. Al examinarla más de cerca, observas un cadáver junto al fuego y huesos esparcidos por el suelo. En ese momento oyes movimiento en el interior de la improvisada choza.",
   "text": "",
   "options": [
    {
     "id": "o1",
     "prompt": "¿Atacar?",
     "text": "Realizas un ataque de emboscada contra tu enemigo en el interior de la choza.\nRoba 1 carta de enemigo y resuélvela. Tienes la oportunidad de atacar primero, ignorando su daño inicial. Suma el nivel de mazmorra al valor de salud de tu enemigo.\nTras la victoria, ganas una carta de botín adicional y 3 monedas de oro."
    },
    {
     "id": "o2",
     "prompt": "¿Pasar de largo sigilosamente?",
     "text": "Dedicas un buen rato en atravesar con cuidado las irregulares rocas del perímetro del claro. A continuación, llegas al pasadizo y escapas de allí.\nPierdes 1 de energía."
    }
   ],
   "pack": "spire",
   "id": "spire_pt32",
   "key": "spire:PT32"
  },
  {
   "kind": "plot",
   "code": "PT33",
   "name": "El Ciervo Atrapado",
   "img": "expansions/spire/card_024.jpg",
   "eyes": 2,
   "narrative": "Oyes ruidos provenientes de un animal en apuros mucho antes de que puedas presenciar lo que está ocurriendo. Te encuentras con un ciervo en el claro y parece que su pata trasera ha quedado atrapada entre dos rocas. El animal se percata de tu presencia y se queda inmóvil.",
   "text": "",
   "options": [
    {
     "id": "o1",
     "prompt": "¿Liberar al animal?",
     "text": "Te acercas lentamente al ciervo y, al ponerle la mano en la frente, parece calmarse. A continuación, dedicas un buen rato en liberar su pata de entre las rocas. Su extremidad está ensangrentada, pero se curará con el tiempo. En cuanto se ve libre, el ciervo se adentra rápidamente en la oscuridad cojeando levemente.\nSube dos niveles en el control de moral.\nGanas una ficha de bendición."
    },
    {
     "id": "o2",
     "prompt": "¿Hora de darse un festín?",
     "text": "Terminas rápidamente con la vida de la asustada criatura y preparas un festín.\nGanas 3 de salud y 2 de energía.\nBaja dos niveles en el control de moral."
    }
   ],
   "pack": "spire",
   "id": "spire_pt33",
   "key": "spire:PT33"
  },
  {
   "kind": "plot",
   "code": "PT34",
   "name": "El Viejo Puente",
   "img": "expansions/spire/card_025.jpg",
   "eyes": 2,
   "narrative": "Una profunda sima atraviesa el claro y no hay forma de rodearla ni sortearla, salvo atravesando un viejo puente fabricado con cuerdas. Al examinarlo más de cerca, te preguntas si aguantará tu peso.",
   "text": "",
   "options": [
    {
     "id": "o1",
     "prompt": "¿Aligerar tu carga?",
     "text": "Revisas todo lo que llevas y haces una pila con una serie de objetos que puedes dejar atrás. Así podrás cruzar el puente sin problemas.\nDescarta objetos de tu inventario hasta alcanzar un máximo de 8 de carga."
    },
    {
     "id": "o2",
     "prompt": "¿Probar el puente de cuerdas?",
     "text": "Decides cruzar el puente con una carga superior a 8. Casi lo has cruzado entero cuando las cuerdas se rompen. Pierdes el equilibrio pero, en el último momento, consigues agarrarte al borde y consigues alzarte a duras penas.\nPierdes 2 de salud y 1 de energía."
    }
   ],
   "pack": "spire",
   "id": "pt34",
   "key": "PT34"
  },
  {
   "kind": "plot",
   "code": "PT35",
   "name": "La Pila de Huesos",
   "img": "expansions/spire/card_026.jpg",
   "eyes": 3,
   "narrative": "En el centro del claro hay una gran pila de huesos. Están apilados de tal manera que supones que alguien, o algo, los colocó de esa forma.",
   "text": "",
   "options": [
    {
     "id": "o1",
     "prompt": "¿Buscar en la pila de huesos?",
     "text": "Dedicas un buen rato a registrar la pila de huesos en busca de algo de valor. Al hacerlo, destruyes la forma que tenía.\nGanas 1 poción y 2 monedas de oro, pero gastas 1 de energía.\nBaja un nivel en el control de moral."
    },
    {
     "id": "o2",
     "prompt": "¿Ignorar la pila de huesos?",
     "text": "Algo te dice que deberías dejar en paz la pila de huesos.\nSube dos niveles en el control de moral."
    }
   ],
   "pack": "spire",
   "id": "pt35",
   "key": "PT35"
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
   "name": "El Torreón de Zogar",
   "text": "Una tenue luz brilla, proyectada por la luna creciente, mientras terminas de subir los últimos peldaños que dan paso hasta la plataforma superior del torreón maldito. En toda la ascensión has podido sentir la presencia de una fuerza maligna y oscura y, a medida que subías, tu mirada no dejaba de mirar constantemente y en alerta las sombras de cada oscuro rincón, proyectadas por los picos escarpados de las montañas que circunvalan el torreón. Sientes como tu corazón se encoge cuando un ser emerge de entre la negrura. ¡Es él! El que atormenta tu espíritu, el tirano que se esconde entre las sombras... ¡el mismísimo Zogar!\nRetira las siguientes cartas del juego base y sustitúyelas por las cartas de esta expansión de aventuras.\nEnemigos: Skinklings, Goblins, Lobos y Serpientes Aladas.\nTramas: El Prisionero, La Anciana y Posada de Hidd.\nAdemás, añade todas las cartas de la expansión Bestias y Trabas, incluidas las cartas de Aflicción.\nJefe Final: Zogar.\nNIVEL 4",
   "img": "expansions/spire/card_011.jpg"
  },
  "campaign": {
   "name": "El Torreón de Zogar",
   "level": 4,
   "removes": {
    "enemies": [
     "Skinklings",
     "Goblins",
     "Lobos",
     "Serpientes Aladas"
    ],
    "plots": [
     "El Prisionero",
     "La Anciana",
     "Posada de Hidd"
    ]
   },
   "boss": "Zogar",
   "adds": [
    "Añade todas las cartas de la expansión Bestias y Trabas, incluidas las cartas de Aflicción."
   ]
  }
 }
};
