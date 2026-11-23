/**
 * IRON HELM - Catálogo y Registro de Expansiones
 */

export const EXPANSIONS = [
  // Módulo Base
  {
    id: 'base',
    name: 'Juego Base',
    type: 'CORE',
    version: '2.4',
    description: 'El núcleo de Iron Helm con 5 héroes, 3 jefes finales clásicos y la mazmorra original.',
    required: true,
    enabled: true
  },

  // Campañas de Aventura Independientes
  {
    id: 'warren',
    name: '01. Warren of Despair',
    type: 'CAMPAIGN',
    bossId: 'vermin_king',
    description: 'Desciende a la madriguera infestada. Incluye al Rey de las Alimañas, nuevas cartas de túneles y el héroe Rhae.',
    cardDir: 'assets/cards/expansions/warren'
  },
  {
    id: 'blackened',
    name: '02. Blackened Burrow',
    type: 'CAMPAIGN',
    description: 'Catacumbas oscuras con criaturas no muertas y trampas de pudrición.',
    cardDir: 'assets/cards/expansions/blackened'
  },
  {
    id: 'galnok',
    name: "03. Galnok's Labyrinth",
    type: 'CAMPAIGN',
    description: 'El intrincado laberinto custodiado por bestias cornígeras y rompecabezas mecánicos.'
  },
  {
    id: 'crystal',
    name: '04. Crystal Caverns',
    type: 'CAMPAIGN',
    description: 'Cavernas de gemas reflectantes con gólems y peligros cristalinos.'
  },
  {
    id: 'embers',
    name: '05. Throne of Embers',
    type: 'CAMPAIGN',
    bossId: 'lord_of_embers',
    description: 'Foso volcánico de fuego infernal. Los enemigos queman raciones y funden armaduras.'
  },
  {
    id: 'malicia',
    name: "06. Malicia's Refuge",
    type: 'CAMPAIGN',
    description: 'Refugio de brujería y pactos oscuros con demonios sombríos.'
  },
  {
    id: 'spire',
    name: '07. The Spire of Zogar',
    type: 'CAMPAIGN',
    description: 'Asciende por la torre del hechicero Zogar plagada de trampas mágicas y autómatas.'
  },
  {
    id: 'abyss',
    name: '13. The Howling Abyss',
    type: 'CAMPAIGN',
    bossId: 'abyss_shadow',
    description: 'La gran expansión del abismo helado con mayor desafío de resistencia y frío letal.'
  },

  // Expansiones Modulares de Contenido (Se pueden activar en paralelo con el Base o Campañas)
  {
    id: 'loot_lore',
    name: '08. Loot & Lore',
    type: 'MODULAR',
    description: 'Amplía el mazo de botín con armas raras, reliquias y cartas de trasfondo.',
    cardDir: 'assets/cards/expansions/loot_lore'
  },
  {
    id: 'realms_relics',
    name: '09. Realms & Relics',
    type: 'MODULAR',
    description: 'Añade reliquias divinas y santuarios arcanos.'
  },
  {
    id: 'lonely_troll',
    name: '10. The Lonely Troll Inn',
    type: 'MODULAR',
    description: 'Permite comenzar en la taberna para contratar mercenarios y adquirir misiones.'
  },
  {
    id: 'fanny_pack',
    name: '11. The Fanny Pack',
    type: 'MODULAR',
    description: 'Añade riñoneras para +2 espacios de carga y objetos de supervivencia.',
    cardDir: 'assets/cards/expansions/fanny_pack'
  },
  {
    id: 'beasts',
    name: '12. Beasts & Burdens',
    type: 'MODULAR',
    description: 'Nuevas bestias feroces y cartas de carga/maldición que aumentan la tensión.',
    cardDir: 'assets/cards/expansions/beasts'
  },
  {
    id: 'iron_chest',
    name: '14. Iron Chest',
    type: 'MODULAR',
    description: 'Recopilatorio de equipamiento mejorado y cartas promocionales de ayuda.'
  },
  {
    id: 'gnome_pack',
    name: '15. Gnome Pack #1 + Promo',
    type: 'MODULAR',
    description: 'Héroes y mecánicas especiales cruzadas con el universo Grey Gnome.'
  },

  // Expansión Fanmade
  {
    id: 'anemia',
    name: '03. Expansión Fanmade -Anemia- 4.0',
    type: 'FANMADE',
    description: 'Revisión extrema de supervivencia: mecánicas de sangrado, aflicciones severas y mazo temático 4.0.'
  }
];
