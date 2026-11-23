/**
 * IRON HELM · Metadatos de las expansiones y comportamiento de sus cartas.
 *
 * Los datos (texto, estadísticas) se generan desde data-src/*.json (tools/gen-data.mjs).
 * Aquí se escribe a mano lo que NO está en esos datos:
 *   - PACKS: nombre, tipo (campaña / módulo), reglas de sustitución del juego base, viñetas para el menú.
 *   - POWERS: poderes de enemigos y jefes (interpretados por js/engine/combat.js).
 *   - FX: efectos de objetos, habilidades, aflicciones y esbirros (combat.js, items.js, scenes.js).
 *   - PLOT_OPS: operaciones de las tramas nuevas (items.js · _op).
 *   - ENV_FX: efectos de las cartas de entorno (Terreno y Reliquias).
 *   - DUNGEON_FX: parámetros de cada carta de mazmorra (juego base y The Howling Abyss).
 *
 * Todo se une por la CLAVE de la carta (`key`): el código impreso (`T21`) o, cuando dos expansiones imprimen el
 * mismo código, `paquete:código` (`galnok:T21`). Ver tools/gen-data.mjs.
 */

/* ================================================================================================ PACKS */
export const PACKS = [
  {
    id: 'warren', name: 'Warren of Despair', es: 'Laberinto de la Desesperación', type: 'campaign', number: 1, adventureLevel: 2,
    blurb: 'Bandas de forajidos grunkles saquean las aldeas del norte, lideradas por un gigante de hielo de un solo ojo.',
    remove: { enemies: ['E1', 'E7', 'E3'], plots: ['PT1', 'PT7', 'PT9'] }, boss: 'B4',
    rules: ['Sustituye Goblins, Orcos y Skinklings por Grunkles y Titilantes.', 'Jefe final fijo: el Cíclope, que rompe tu arma si te inflige 9 o más.', 'Aventura de nivel 2.'],
  },
  {
    id: 'blackened', name: 'Blackened Burrow', es: 'Madriguera Ennegrecida', type: 'campaign', number: 2, adventureLevel: 3,
    blurb: 'Una gran escalera desciende a las ardientes profundidades de la tierra. ¿Qué riquezas se esconderán allí…?',
    remove: { enemies: ['E2', 'E5', 'E6'], plots: ['PT7', 'PT2', 'PT8'] }, boss: 'B5',
    rules: ['Avispas y Líderes Llameantes sustituyen a Zombies, Lobos y Arqueros No Muertos.', 'El Escorpión de Fuego acecha en el mazo de tramas.', 'Jefe final fijo: la Madre Colmena (duplica tu veneno).', 'Aventura de nivel 3.'],
  },
  {
    id: 'galnok', name: "Galnok's Labyrinth", es: 'El Laberinto de Galnok', type: 'campaign', number: 3, adventureLevel: 2,
    blurb: 'Aullidos de pesadilla te guían hasta la entrada de una cueva. Tal vez un buen lugar para descansar un rato…',
    remove: { enemies: ['E7', 'E1', 'E5', 'E9'], plots: ['PT1', 'PT4', 'PT7'] }, boss: 'B6',
    rules: ['Calaveras Flotantes (suben tu moral) y Videntes de la Muerte (inmunes a las pociones).', 'El tesoro de Mizlak: alijo, máscara y diario.', 'Jefe final fijo: Galnok; sus dobles no fallan, te golpean por el valor de un dado.', 'Aventura de nivel 2.'],
  },
  {
    id: 'crystal', name: 'Crystal Caverns', es: 'Cavernas de Cristal', type: 'campaign', number: 4, adventureLevel: 3,
    blurb: 'Congelado, llegas a las inaccesibles Cavernas de Cristal: grandes fortunas y terribles peligros.',
    remove: { enemies: ['E3', 'E2', 'E5', 'E9'], plots: ['PT3', 'PT4', 'PT2'] }, boss: 'B7',
    rules: ['Blizzlings (envenenan con golpes de 3+) y Cubos de Hielo (no fallan con dobles).', 'El Cetro te deja elegir entre dos enemigos.', 'Jefe final fijo: el Dragón de Cristal; con 8+ de daño destruye un objeto equipado.', 'Aventura de nivel 3.'],
  },
  {
    id: 'throne', name: 'Throne of Embers', es: 'El Trono Ardiente', type: 'campaign', number: 5, adventureLevel: 2,
    blurb: 'En las minas de Talora aguardan tesoros majestuosos… y una monstruosa criatura nacida del fuego.',
    remove: { enemies: ['E7', 'E12'], plots: ['PT9', 'PT4', 'PT1'] }, boss: 'B8',
    rules: ['Pieles de Lagarto (roban energía) y Vampiros de Fuego (veneno al contraatacar).', 'Habilidad Correr: evita cualquier carta de mazmorra una vez por nivel.', 'Jefe final fijo: el Elemental de Fuego; con 8+ de daño quema lo que llevas en el cuerpo.', 'Aventura de nivel 2.'],
  },
  {
    id: 'malicia', name: "Malicia's Refuge", es: 'El Refugio de Malicia', type: 'campaign', number: 6, adventureLevel: 3,
    blurb: 'No hay duda: aquella es la guarida de Malicia. Ahora debes encontrar el valor para entrar.',
    remove: { enemies: ['E3', 'E1'], plots: ['PT6', 'PT4', 'PT3'] }, boss: 'B9',
    rules: ['Guerreros y Sacerdotes Malditos castigan tus fichas de bendición.', 'Mimético No Muerto en el mazo de botín.', 'Jefe final fijo: Malicia; su daño se modifica con tu posición en el control de moral.', 'Aventura de nivel 3.'],
  },
  {
    id: 'spire', name: 'The Spire of Zogar', es: 'El Torreón de Zogar', type: 'campaign', number: 7, adventureLevel: 4, includes: ['beasts'],
    blurb: 'La aventura final: en lo alto del torreón maldito te espera el tirano que se esconde entre las sombras.',
    remove: { enemies: ['E3', 'E1', 'E5', 'E4'], plots: ['PT8', 'PT1', 'PT6'] }, boss: 'B10',
    rules: ['Incluye todas las cartas de Bestias y Trabas, aflicciones incluidas.', 'Umruss, Poseídos y el Señor de Huesos.', 'Jefe final fijo: Zogar, inmune a ataques sagrados, de fuego y de hielo; sus dobles te quitan 2 de energía.', 'Aventura de nivel 4.'],
  },
  {
    id: 'loot_lore', name: 'Loot & Lore', es: 'Botín y Leyendas', type: 'module', number: 8,
    blurb: 'Tres héroes nuevos, equipo, habilidades y tramas que añaden variedad a cualquier partida.',
    rules: ['Héroes Azra, Kiln-Olma y Skral.', 'Nuevas tramas, habilidades, botín y equipo.'],
  },
  {
    id: 'realms', name: 'Realms & Relics', es: 'Terreno y Reliquias', type: 'module', number: 9,
    blurb: 'Cada nivel de la mazmorra tiene su propio entorno, y los artefactos más poderosos se pagan con bendiciones.',
    rules: ['Al empezar cada nivel se roba una carta de entorno que lo modifica.', 'Cuando robes botín puedes pagar bendiciones (1, 2, 3…) para robar un artefacto.'],
  },
  {
    id: 'troll', name: 'The Lonely Troll Inn', es: 'Posada del Troll Solitario', type: 'module', number: 10,
    blurb: 'Contrata esbirros en la posada antes de bajar a la mazmorra, si puedes mantener su moral.',
    rules: ['Contrata hasta 3 esbirros en la posada pagando su coste en oro.', 'Cada esbirro tiene habilidades propias y pierde moral en ciertas situaciones; con moral 0 te abandona.', 'Paga 1 de oro por punto para restaurar su moral entre turnos.', 'Nuevo equipo y el héroe Mizlak el Mendigo (+10 puntos si ganas).'],
  },
  {
    id: 'fanny_pack', name: 'The Fanny Pack', es: 'The Fanny Pack', type: 'module', number: 11,
    blurb: 'Contenido creado por seguidores: nuevos héroes, enemigos, trampas de foso y un espejo misterioso.',
    rules: ['Héroes Grimwald y Nanoc.', 'Asesino, Araña, Morlock, Trampas de Foso y el Rey Goblin.', 'La Cápsula Corazón (artefacto).'],
  },
  {
    id: 'beasts', name: 'Beasts & Burdens', es: 'Bestias y Trabas', type: 'module', number: 12,
    blurb: 'Eleva mucho la dificultad: aflicciones, nuevos enemigos y tres minijefes entre las tramas.',
    rules: ['Mazo de aflicciones: hambre, veneno y algunos enemigos te las provocan.', 'Tres minijefes entre las tramas (4 ojos).'],
  },
  {
    id: 'howling', name: 'The Howling Abyss', es: 'El Abismo Aullante', type: 'module', number: 13, exclusive: 'dungeonDeck',
    blurb: 'Un mazo de mazmorra alternativo de 18 cartas: arcángeles, ídolos falsos, fuentes místicas y encuentros salvajes.',
    rules: ['Sustituye todo el mazo de mazmorra del juego base.', 'Cartas nuevas: Arcángel, Ídolo Falso, Fuente Mística y Encuentro Salvaje.', 'El Mercader permite comerciar objetos.'],
  },
  {
    id: 'iron_chest', name: 'Iron Chest', es: 'Encuentros Aleatorios', type: 'module', number: 14,
    blurb: 'Qué le ocurre a tu personaje entre nivel y nivel: trampas, enemigos, setas, tesoros y encuentros.',
    rules: ['Mapa de encuentros según el nivel de la aventura (juego base = 1).', 'Al bajar de nivel se resuelve el icono del tramo recorrido.'],
  },
  {
    id: 'gnome', name: 'Gnome Pack #1', es: 'Gnome Pack #1', type: 'module', number: 15,
    blurb: 'Crea tu propio personaje combinando raza, clase y signo astral. Incluye a Grubrot.',
    rules: ['Creador de personajes: raza → clase → signo astral.', 'Héroe Grubrot.'],
  },
];

/* Expansiones del registro oficial cuyas cartas NO están en este repositorio (no jugables todavía). */
export const MISSING_PACKS = [];

/* ================================================================================================ POWERS
 * Poderes de enemigos/jefes de expansión.  Claves reconocidas por combat.js:
 *   avoid:{gold|rations|blessing:n}  avoidDiscardValue:n  noInitial  noArmorInitial  ignoreShields
 *   poisonOnHit:n  poisonOnInitialHit:n  poisonOnCounterHit:n  poisonIfDamage:{min,n}  loseBlessingOnHit:n  loseBlessingOnInitialHit:n
 *   stealEnergyOnHit:n  energyLossOnHit:n  energyLossOnDamage:n  energyLossOnDoubles:n
 *   rationOnDefeat:n  eyesOnDefeat:n  blessingOnDefeat:n  moralityOnDefeat:n  blessingsByMoralityOnDefeat
 *   loseWeaponsOnOnes:n  breakWeaponOnDamage:n  destroyEquippedOnDamage:n  destroyBodyOnDamage:n
 *   doublePoisonOnInitialHit  noDamageAttack (avispa)  noMissOnDoubles  doublesHitDie  damageByMorality  initialPlusBlessings
 *   doubleInitialIfAmbush2  nextAttackExtraEnergy  killWithLight  potionInsteadOfLoot  potionImmune  immune:[holy|fire|ice]
 *   afflictionOnInitialDamage  afflictionOnOnes:n  afflictionOnEnemyDoubles  trap
 * ---------------------------------------------------------------------------------------------- */
export const POWERS = {
  // Warren of Despair
  B4: { breakWeaponOnDamage: 9 },
  E13: { energyLossOnHit: 1 },
  E14: { eyesOnDefeat: 1 },
  L21: { avoid: { rations: 2 } },
  // Blackened Burrow
  B5: { doublePoisonOnInitialHit: true },
  E16: { noDamageAttack: true, poisonOnHit: 1, energyLossOnHit: 1 },
  E15: { potionInsteadOfLoot: true },
  PT13: { eyesOnDefeat: 1 },
  // The Fanny Pack
  E34: { doubleInitialIfAmbush2: true },
  E35: { nextAttackExtraEnergy: 1 },
  E36: { trap: true },
  E37: { killWithLight: true },
  PT39: { avoidDiscardValue: 4 },
  // Beasts & Burdens
  E25: { eyesOnDefeat: 1 },
  E26: { avoid: { rations: 2 } },
  E27: { blessingOnDefeat: 1, moralityOnDefeat: 1 },
  E28: { afflictionOnInitialDamage: true },
  E29: { poisonOnHit: 1 },
  E30: { afflictionOnOnes: 2 },
  PT31: { afflictionOnEnemyDoubles: true },
  PT32: { poisonOnHit: 1 },
  PT33: { blessingOnDefeat: 2 },
  // Galnok's Labyrinth
  B6: { doublesHitDie: true },
  E17: { moralityOnDefeat: 1 },
  E18: { potionImmune: true },
  // Crystal Caverns
  B7: { destroyEquippedOnDamage: 8 },
  E19: { noMissOnDoubles: true },
  E20: { poisonIfDamage: { min: 3, n: 1 } },
  // Throne of Embers
  B8: { destroyBodyOnDamage: 8 },
  E21: { energyLossOnDamage: 1 },
  E22: { poisonOnCounterHit: 2 },
  // Malicia's Refuge
  B9: { damageByMorality: true },
  E23: { avoid: { blessing: 1 }, blessingOnDefeat: 1 },
  E24: { initialPlusBlessings: true },
  L39: { avoid: { blessing: 1 } },
  // The Spire of Zogar
  B10: { immune: ['holy', 'fire', 'ice'], energyLossOnDoubles: 2 },
  E31: { poisonOnHit: 1 },
  E32: { loseBlessingOnHit: 1 },
  E33: { blessingsByMoralityOnDefeat: true },
};

/* ================================================================================================ FX
 * Efectos de objetos / habilidades / esbirros (por clave).  Declarativos (sumados con sumFx o leídos del arma):
 *   reduceInitial, reduceCounter, reduceVs:{ice:1}, armorByMorality, shield, brittle (se rompe con golpe >= n), preStrike,
 *   mustReroll:[valores], mayReroll:{values, vs?, weaponTag?}, dieValue:{6:7}, plusPerSix, oneDamage, plusPerHigh:{values,vs,n},
 *   plusPerSixLevel, healPerSix, attackVs:{fire:3} (arma), attackVsAll:{fire:1} (cualquier fuente), attackVsTags:{tags,n},
 *   doublesBonus, doublesBonusVs:{undead:4}, attackBonus, throwDice, throwAny, potionBonus, potionDouble:'P4', healBonus,
 *   extraDieCost:{gold:1}, weightZero:'potion', accessoriesFree:n, maxHpBonus, moralityBonus, carryBonus, fist,
 *   element:'fire'|'ice'|'holy' (Zogar es inmune), cursed, dagger, bow, axe, instant (se resuelve al robarla).
 *   Con nombre propio (interpretados en el motor por su clave): ver docs/EXPANSIONS.md.
 * ---------------------------------------------------------------------------------------------- */
export const FX = {
  // --- Juego base: objetos ---
  L2: { reduceInitial: 1, reduceCounter: 1 }, T14: { reduceInitial: 1, reduceCounter: 1 },
  L3: { reduceInitial: 1, reduceCounter: 1, shield: true }, T11: { reduceInitial: 1, reduceCounter: 1, shield: true },
  T8: { reduceInitial: 1, shield: true, brittle: 4 },
  T4: { reduceInitial: 1 },
  L6: { reduceInitial: 2, reduceCounter: 2, noSkills: ['S5', 'S8'] },
  L4: { mustReroll: [6], dagger: true }, T5: { mustReroll: [6], dagger: true },
  T10: { preStrike: 2, mustReroll: [6], bow: true }, L9: { preStrike: 2, bow: true },
  L7: { dieValue: { 6: 7 }, attackVs: { fire: 3 }, element: 'fire' },
  L14: { plusPerSix: 1 },
  L12: { attackVs: { undead: 3 } },
  T13: { mayReroll: { values: [1, 2], vs: 'undead' } },
  L17: { attackVs: { ice: 3 }, throwDice: 3 },
  T1: { throwDice: 3, axe: true },
  T9: { potionBonus: 3 },
  P3: { element: 'ice' }, P4: { element: 'fire' }, P5: { element: 'holy' },
  // --- Habilidades ---
  S6: { mayReroll: { values: [1], weaponTag: 'bow' } },
  S13: { mayReroll: { values: [1, 2], weaponTag: 'axe' } },
  S10: { attackBonusIfOffDagger: 2 },
  // --- Warren ---
  T15: { oneDamage: 6, axe: true },
  // --- Blackened ---
  L23: { doublesBonus: 5, anyDoubles: true },
  L22: { reduceInitial: 1, attackBonus: 1, cursed: true },
  T17: { weightZero: 'potion' },
  T18: { mustReroll: [1] },
  // --- Loot & Lore ---
  L28: { doublesBonusVs: { undead: 4 } },
  T21: { doublesBonus: 3 },
  // --- Fanny Pack ---
  L47: { extraDieCost: { gold: 1 } },
  L50: { reduceInitial: 1, attackBonus: 1, shield: true, withTwoHanded: true },
  T39: { accessoriesFree: 3 },
  AT9: { maxHpBonus: 2 },
  L48: { moralityBonus: 2 },
  // --- Galnok's Labyrinth ---
  'galnok:T21': { carryBonus: 2, restHp: 1 },     // Mochila Grande
  T20: { dagger: true },                           // Daga de la Luna: relanza un ataque enemigo (1/nivel)
  L27: { instant: true },                          // Alijo de Mizlak
  'galnok:L25': { avoidUndeadMaxHp: 4 },           // Máscara de Mizlak
  // --- Crystal Caverns ---
  L31: { healBonus: 1, potionBonus: 2 },           // Mortero y Maja
  T25: { attackVsTags: { tags: ['goblin', 'orc', 'troll'], n: 2 } }, // Espada Enana
  // --- Throne of Embers ---
  L35: { bow: true },                              // Aguijón de Grasgol: dispara una flecha (1/nivel)
  L36: { cursed: true },                           // Cuerno Maldito
  L37: { plusPerHigh: { values: [5, 6], vs: 'fire', n: 3 } },
  L38: { reduceInitial: 1, reduceCounter: 1, shield: true, reduceVs: { ice: 1 } },
  T27: { mustReroll: [6], attackVs: { undead: 2 } },
  // --- Malicia's Refuge ---
  L40: { element: 'holy' },                        // Granada de Mano Sagrada
  L42: { whip: true },                             // Látigo
  // --- The Spire of Zogar ---
  // --- Realms & Relics (artefactos) ---
  AT3: { armorByMorality: 1 },
  AT4: { healPerSix: 1 },
  AT6: { plusPerSixLevel: true },
  AT8: { instant: true },
  // --- The Lonely Troll Inn ---
  T36: { fist: 2 },
  T37: { reduceInitial: 1, brittle: 4 },
  T32: { throwDice: 3, throwAny: true },
  T34: { potionDouble: 'P4', attackVsAll: { fire: 1 } },
  T35: { potionDouble: 'P3', attackVsAll: { ice: 1 } },
  // esbirros
  HM2: { healBonus: 1, potionBonus: 1 },           // Matilda
  HM3: { carryBonus: 4 },                          // Yak
  HM4: { attackBonus: 1, reduceInitial: 1, reduceCounter: 1 }, // Eydis
  HM7: { attackVsAll: { undead: 2 } },             // Godfrey
};

/* Efectos de aflicciones (Bestias y Trabas); el resto de sus reglas se comprueban por código en el motor. */
FX.AF2 = { carryBonus: -2 };

/* ================================================================================================ PLOT_OPS
 * Operaciones de las tramas de expansión (las de base.js las llevan inline).
 *   options[i] = ops de la opción i · plot = ops de una trama sin elección · pre = ops antes de elegir
 *   req[i] = requisito de la opción i: ['morality','>'|'<',n] · ['graveyard',clave] · ['unspentEnemy'] · ['blessings',n]
 * Operaciones (items.js · _op): gain/lose/pay(stat,n) · morality(n) · loot(n) · potion(n) · plot · pickLoot(n) ·
 *   pickPotionFromDeck · discardForBlessing · clerigaGift · dieTable([[caras],ops]) · dieParity(par,impar) · espejo ·
 *   removeMimic(clave) · fight({hpBonus,initialBonus,ambush,hpLevel,onWin}) · fightRandom · randomSkill · feedFire · climb ·
 *   moralityTable([[valores],ops]) · loseAllBlessings · loseLevelHp · discardItem · blessingByLevel · lootSearch ·
 *   sellBlessings · lightenTo(n) · gainDie(stat) · eyes(n) · curePoison · blessingByMorality · healthOrEnergyByMorality
 * ---------------------------------------------------------------------------------------------- */
export const PLOT_OPS = {
  PT10: { options: [[['pay', 'gold', 1], ['potion', 1], ['morality', 1]], [['morality', -1], ['gain', 'gold', 1], ['pickPotionFromDeck']]] },
  PT11: { options: [[['discardForBlessing'], ['morality', 1]], [['morality', -1], ['pickLoot', 3]]] },
  PT12: { plot: [['clerigaGift']] },
  PT14: { options: [[['gain', 'energy', 3]], [['gain', 'rations', 2]]] },
  PT15: { options: [[['lose', 'rations', 1], ['morality', 1]], [['gain', 'gold', 1], ['morality', -1]]] },
  PT19: { options: [[['lose', 'energy', 1], ['gain', 'blessing', 1], ['morality', 1]], [['gain', 'rations', 1], ['loot', 1], ['morality', -1]]] },
  PT20: { options: [[['lose', 'hp', 3], ['gain', 'poison', 1], ['morality', 2]], [['morality', -1]]] },
  PT21: { options: [[['dieTable', [
    [1, [['gain', 'poison', 2]]], [2, [['gain', 'poison', 1]]], [3, [['gain', 'blessing', 1]]],
    [4, [['gain', 'hp', 2]]], [5, [['gain', 'energy', 2]]], [6, [['curePoison']]]]]], []] },
  PT40: { options: [[['espejo']], [['lose', 'energy', 1]]] },
  // --- Galnok's Labyrinth ---
  PT16: { pre: [['lose', 'hp', 1]], options: [[['gain', 'gold', 2]], [['morality', 1], ['gain', 'blessing', 1]]] },
  PT18: { options: [[], [['dieParity', [['gain', 'energy', 2]], [['gain', 'energy', 1], ['gain', 'poison', 1]]]],
    [['pay', 'rations', 1], ['gain', 'blessing', 1], ['morality', 1]]] },
  PT17: { options: [[['pay', 'gold', 2], ['removeMimic', 'L8']], [], [['gain', 'gold', 2]]], req: [null, null, ['graveyard', 'L8']] },
  // --- Crystal Caverns ---
  PT22: { options: [[['pay', 'rations', 1], ['morality', 2]], [], [['potion', 1], ['morality', -2]]] },
  PT23: { options: [[['blessingByMorality']], [['fight', { hpBonus: 6, initialBonus: 3 }]]], req: [['morality', '>', 0], ['morality', '<', 0]] },
  PT24: { options: [[['lose', 'hp', 2], ['randomSkill']], []] },
  // --- Throne of Embers ---
  PT25: { options: [[['dieTable', [[[1, 2], [['fightRandom']]], [[3, 4], [['gain', 'energy', 2]]], [[5, 6], [['loot', 1]]]]]], []] },
  PT26: { options: [[['potion', 1], ['lose', 'energy', 2], ['morality', 2]], [['potion', 1], ['gain', 'gold', 2], ['morality', -2]]] },
  PT27: { options: [[['feedFire']], []], req: [['unspentEnemy'], null] },
  // --- Malicia's Refuge ---
  PT28: { options: [[['climb']], []] },
  PT29: { options: [[['moralityTable', [
    [[-5, -4], [['loseAllBlessings'], ['loseLevelHp']]], [[-3, -2], [['discardItem'], ['lose', 'energy', 1]]], [[-1, 0, 1], []],
    [[2, 3], [['blessingByLevel'], ['gain', 'energy', 1]]], [[4, 5], [['lootSearch']]]]]]] },
  PT30: { options: [[['lose', 'energy', 2], ['morality', 2]], [['potion', 1], ['morality', -2]]] },
  // --- The Spire of Zogar (PT31-PT33 colisionan con los minijefes de Bestias y Trabas: clave "spire:") ---
  'spire:PT31': { options: [[['sellBlessings']], []], req: [['blessings', 1], null] },
  'spire:PT32': { options: [[['fight', { ambush: 'player', hpLevel: true, onWin: [['loot', 1], ['gain', 'gold', 3]] }]], [['lose', 'energy', 1]]] },
  'spire:PT33': { options: [[['morality', 2], ['gain', 'blessing', 1]], [['gain', 'hp', 3], ['gain', 'energy', 2], ['morality', -2]]] },
  PT34: { options: [[['lightenTo', 8]], [['lose', 'hp', 2], ['lose', 'energy', 1]]] },
  PT35: { options: [[['potion', 1], ['gain', 'gold', 2], ['lose', 'energy', 1], ['morality', -1]], [['morality', 2]]] },
};

/* ================================================================================================ ENV_FX
 * Terreno y Reliquias: efectos de cada carta de entorno mientras dura su nivel (scenes.js · combat.js).
 *   dmgAll:n · dmgVs:{fire|ice|undead:n} · noForage (sin Buscar en el Campamento ni raciones de setas) ·
 *   campSearchRations · mushroomsRations · campEyes · altarBlessings · altarGold · altarHp · altarHpByMorality · noAltar ·
 *   treasureGold · treasurePotion · treasureBlessing · goldOnDefeat · goldVs:{w:n} · potionOnDefeat · blessingOnDefeat ·
 *   ambushAsSecond · merchantToAmbush · arrowTrapDamage · labyrinthExtra · plotPick2 · bossAttackBonus ·
 *   onDraw: ops inmediatas (texto azul / ojo de EN8)
 * ---------------------------------------------------------------------------------------------- */
export const ENV_FX = {
  EN1: { dmgAll: 1, campSearchRations: 1, mushroomsRations: 1 },
  EN2: { dmgVs: { ice: 2 }, noForage: true, altarBlessings: 2, goldVs: { ice: 1 } },
  EN3: { ambushAsSecond: true, treasureGold: 2, potionOnDefeat: 1 },
  EN4: { dmgVs: { fire: 2 }, noForage: true, treasurePotion: 1, goldVs: { fire: 1 } },
  EN5: { dmgVs: { undead: 2 }, noAltar: true, plotPick2: true, goldVs: { undead: 1 } },
  EN6: { arrowTrapDamage: 2, merchantToAmbush: true, treasureGold: 1, altarGold: 1, goldOnDefeat: 1 },
  EN7: { onDraw: [['gain', 'blessing', 1]], treasurePotion: 1, altarHp: 3, blessingOnDefeat: 1 },
  EN8: { onDraw: [['eyes', 1]], campEyes: 1, treasureBlessing: 1 },
  EN9: { labyrinthExtra: 1, altarHpByMorality: true, bossAttackBonus: 2 },
};

/* ================================================================================================ DUNGEON_FX
 * Parámetros de las cartas de mazmorra (scenes.js · resolveDungeon). Las del juego base son los valores por
 * defecto de cada tipo; The Howling Abyss redefine los suyos.
 *   ambush/skirmish {1|2:{ambush, hp, initialLevel, firstAttackBonus, goldOnDefeat}} · treasure {1|2:{ops|choice}} ·
 *   labyrinth {1|2:{rations, missingFlat|perMissing, after}} · mushrooms {1|2:{rations|table}} · arrowTrap {1|2:{poison|table}} ·
 *   camp {cook,search,rest} · merchant {stock:'level'|[botín,pociones], trade} · altar {options:{id:ops}} ·
 *   archangel/fountain {table} · falseIdol {options} · wildEncounter {1|2:{draw, hp}}
 * ---------------------------------------------------------------------------------------------- */
export const DUNGEON_FX = {
  // --- Juego base (valores por defecto) ---
  D1: { 1: { ambush: 'player', hp: 0 }, 2: { ambush: 'enemy', hp: 4, initialLevel: true } },
  D2: { 1: { ops: [['gain', 'gold', 1]] }, 2: { ops: [['loot', 1], ['potion', 1]] } },
  D3: { 1: { rations: 1, missingFlat: 3 }, 2: { rations: 2, perMissing: 2 } },
  D4: { 1: { rations: 1 }, 2: { rations: 2 } },
  D5: { 1: { poison: 1 }, 2: { poison: 2 } },
  D6: { 1: { ambush: 'normal', hp: 2 }, 2: { ambush: 'normal', hp: 4 } },
  D7: { cook: { energy: 3 }, search: { rations: 1 }, rest: { hp: 2, poison: 1 } },
  D8: { stock: 'level' },
  D9: { options: { bless: [['altarBlessing']], cure: [['altarCure']] } },
  D10: {},
  // --- The Howling Abyss ---
  D11: { 1: { ambush: 'player', hp: 0, firstAttackBonus: 3 }, 2: { ambush: 'enemy', hp: 5, initialLevel: true } },
  D12: { 1: { ops: [['gain', 'gold', 1]] }, 2: { choice: [
    { id: 'loot', label: 'Botín y poción', text: 'Roba 1 carta de botín y 1 carta de poción.', ops: [['loot', 1], ['potion', 1]] },
    { id: 'gold', label: 'Oro y ración', text: 'Ganas d6 de oro y 1 ración.', ops: [['gainDie', 'gold'], ['gain', 'rations', 1]] }] } },
  D13: { 1: { rations: 1, missingFlat: 3, after: [['gain', 'gold', 1]] }, 2: { rations: 2, perMissing: 3, after: [['potion', 1]] } },
  D14: { 1: { table: [[[1, 2], { poison: 1 }], [[3, 4], { rations: 1 }], [[5, 6], { rations: 2 }]] },
    2: { table: [[[1, 2], { rations: 1 }], [[3, 4], { rations: 2 }], [[5, 6], { rations: 3 }]] } },
  D15: { 1: { table: [[[1, 2], 2], [[3, 4], 1], [[5, 6], 0]] }, 2: { table: [[[1, 2], 3], [[3, 4], 2], [[5, 6], 1]] } },
  D16: { 1: { ambush: 'normal', hp: 0 }, 2: { ambush: 'normal', hp: 4, goldOnDefeat: 1 } },
  D17: { cook: { energy: 3 }, search: { rations: 1, gold: 1 }, rest: { hp: 3, poison: 1 } },
  D18: { stock: [3, 2], trade: true },
  D19: { options: { bless: [['altarBlessing']], strength: [['gain', 'energy', 2]], cure: [['altarCure']], mercy: [['morality', 1]] } },
  D20: {},
  D21: { table: [[[4, 5], [['gain', 'hp', 4]]], [[2, 3], [['gain', 'hp', 2]]], [[1], [['gain', 'hp', 1]]], [[0], []],
    [[-1], [['lose', 'hp', 1]]], [[-2, -3], [['lose', 'hp', 2]]], [[-4, -5], [['lose', 'hp', 4]]]] },
  D22: { options: {
    power: [['morality', -1], ['gain', 'energy', 2], ['loot', 1]], wealth: [['morality', -1], ['gain', 'gold', 2], ['potion', 1]],
    life: [['morality', -1], ['gain', 'hp', 2], ['gain', 'rations', 1]], ignore: [['morality', 1], ['lose', 'hp', 1]] } },
  D23: { table: [[[1], [['fight', { hpLevel: true }]]], [[2], [['gain', 'hp', 3]]], [[3], [['gain', 'poison', 1]]], [[4], [['potion', 1]]],
    [[5], [['gain', 'gold', 1]]], [[6], [['blessingByLevel']]]] },
  D24: { 1: { draw: 2, hp: 1 }, 2: { draw: 4, hp: 3 } },
};
