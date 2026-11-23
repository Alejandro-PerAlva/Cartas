/**
 * IRON HELM · Metadatos de las expansiones y comportamiento de sus cartas.
 *
 * Los datos (texto, estadísticas) se generan desde data-src/*.json (tools/gen-data.mjs).
 * Aquí se escribe a mano lo que NO está en esos datos:
 *   - PACKS: nombre, tipo (campaña / módulo), reglas de sustitución del juego base.
 *   - POWERS: poderes de enemigos y jefes (interpretados por js/engine/combat.js).
 *   - FX: efectos de objetos, habilidades y aflicciones (interpretados por js/engine/fx.js).
 *   - PLOT_OPS: operaciones de las tramas nuevas (interpretadas por js/engine/plots.js).
 *
 * Para añadir una expansión: transcribe sus cartas a data-src/<id>.json, ejecuta `npm run gen:data`,
 * registra aquí su metadato y los efectos de sus cartas, y deja sus imágenes en assets/cards/expansions/<id>/.
 */

/* Reglas de campaña: se retiran cartas del juego base (por código) y se sustituyen por las de la expansión. */
export const PACKS = [
  {
    id: 'warren', name: 'Warren of Despair', es: 'Laberinto de la Desesperación', type: 'campaign', number: 1, adventureLevel: 2,
    blurb: 'Bandas de forajidos grunkles saquean las aldeas del norte, lideradas por un gigante de hielo de un solo ojo.',
    remove: { enemies: ['E1', 'E7', 'E3'], plots: ['PT1', 'PT7', 'PT9'] }, boss: 'B4',
  },
  {
    id: 'blackened', name: 'Blackened Burrow', es: 'Madriguera Ennegrecida', type: 'campaign', number: 2, adventureLevel: 3,
    blurb: 'Una gran escalera desciende a las ardientes profundidades de la tierra. ¿Qué riquezas se esconderán allí…?',
    remove: { enemies: ['E2', 'E5', 'E6'], plots: ['PT7', 'PT2', 'PT8'] }, boss: 'B5',
  },
  {
    id: 'loot_lore', name: 'Loot & Lore', es: 'Botín y Leyendas', type: 'module', number: 8,
    blurb: 'Tres héroes nuevos, equipo, habilidades y tramas que añaden variedad a cualquier partida.',
  },
  {
    id: 'fanny_pack', name: 'The Fanny Pack', es: 'The Fanny Pack', type: 'module', number: 11,
    blurb: 'Contenido creado por seguidores: nuevos héroes, enemigos, trampas de foso y un espejo misterioso.',
  },
  {
    id: 'beasts', name: 'Beasts & Burdens', es: 'Bestias y Trabas', type: 'module', number: 12,
    blurb: 'Eleva mucho la dificultad: aflicciones, nuevos enemigos y tres minijefes entre las tramas.',
  },
];

/* Expansiones del registro oficial cuyas cartas NO están en este repositorio (no jugables todavía). */
export const MISSING_PACKS = [
  "Galnok's Labyrinth", 'Crystal Caverns', 'Throne of Embers', "Malicia's Refuge", 'The Spire of Zogar',
  'Realms & Relics', 'The Lonely Troll Inn', 'The Howling Abyss', 'Iron Chest', 'Gnome Pack #1',
];

/* ------------------------------------------------------------------------------------------------
 * Poderes de enemigos/jefes de expansión.  Claves reconocidas por combat.js:
 *   avoid:{gold|rations:n}  avoidDiscardValue:n  noInitial  noArmorInitial  ignoreShields
 *   poisonOnHit:n  poisonOnInitialHit:n  loseBlessingOnHit:n  loseBlessingOnInitialHit:n
 *   stealEnergyOnHit:n  energyLossOnHit:n  rationOnDefeat:n  eyesOnDefeat:n  blessingOnDefeat:n  moralityOnDefeat:n
 *   loseWeaponsOnOnes:n  breakWeaponOnDamage:n  doublePoisonOnInitialHit  noDamageAttack (avispa)
 *   doubleInitialIfAmbush2  nextAttackExtraEnergy  killWithLight  potionInsteadOfLoot
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
};

/* ------------------------------------------------------------------------------------------------
 * Efectos de objetos / habilidades (por código).  Claves reconocidas por js/engine/fx.js y combat.js.
 *   Declarativos: reduceInitial, reduceCounter, shield, brittle (se rompe con golpe >= n), preStrike,
 *   mustReroll:[valores], mayReroll:{values, vs?, weapon?}, dieValue:{6:7}, plusPerSix, onesDamage,
 *   attackVs:{fire:3}, doublesBonus, doublesBonusVs:{undead:4}, attackBonus, throwDice, potionBonus,
 *   extraDieCost:{gold:1}, weightZero:'potion', accessoriesFree:n, maxHpBonus, moralityBonus
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
  L7: { dieValue: { 6: 7 }, attackVs: { fire: 3 } },
  L14: { plusPerSix: 1 },
  L12: { attackVs: { undead: 3 } },
  T13: { mayReroll: { values: [1, 2], vs: 'undead' } },
  L17: { attackVs: { ice: 3 }, throwDice: 3 },
  T1: { throwDice: 3, axe: true },
  T9: { potionBonus: 3 },
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
};

/* Efectos de aflicciones (Bestias y Trabas); el resto de sus reglas se comprueban por código en el motor. */
FX.AF2 = { carryBonus: -2 };

/* ------------------------------------------------------------------------------------------------
 * Operaciones de las tramas de expansión (las de base.js las llevan inline).
 *   options[i] = ops de la opción i · plot = ops de una trama sin elección.
 * Operaciones: gain/lose/pay(stat,n) · morality(n) · loot(n) · potion(n) · plot(n) · pickLoot(n) ·
 *   pickPotionFromDeck · discardForBlessing · clerigaGift · dieTable · espejo
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
};
