# Añadir una expansión

Las expansiones son datos más una pequeña tabla de comportamiento. No hace falta tocar el motor salvo para
mecánicas totalmente nuevas.

## 1. Imágenes
Coloca las cartas (480×675 JPG) en `iron_helm_game/assets/cards/expansions/<id>/card_000.jpg … card_NNN.jpg`.

## 2. Transcribir las cartas
Crea `iron_helm_game/data-src/<id>.json`: un array con un objeto por carta, **con el texto literal** impreso.
Esquema (ver los ficheros existentes):

```jsonc
{"img":"card_002.jpg","kind":"enemy","code":"E13","name":"Grunkle","health":3,"damage":2,"treasure":1,"weakness":"fire","purse":0,"text":"…"}
{"img":"card_022.jpg","kind":"hero","code":"C5","name":"Ozzlo","health":17,"energy":10,"encumbrance":12,"rations":1,"gold":2,"trappings":"Hacha de Batalla","skill":"Dominio del Hacha","proficiency":"fuerza"}
{"img":"card_020.jpg","kind":"trapping","code":"T16","name":"Broche…","price":3,"weight":1,"slot":"AC","text":"…"}
{"img":"card_024.jpg","kind":"plot","code":"PT10","name":"…","eyes":1,"narrative":"…","options":[{"prompt":"¿…?","text":"…"}]}
```
`kind` puede ser: `hero`, `boss`, `enemy`, `loot`, `trapping`, `potion`, `plot`, `skill`, `campaign`, `map`, `divider`, `other`.
Los enemigos con `"inLootDeck": true` (mimos) o `"inPlotDeck": true` (minijefes) se colocan en su mazo.
Genera el módulo con `npm run gen:data`.

## 3. Comportamiento (`js/data/pack-fx.js`)
- `PACKS`: nombre, tipo (`campaign` | `module`), y para campañas `remove` (códigos del juego base que se retiran) y `boss`.
- `POWERS[código]`: poder del enemigo/jefe (`poisonOnHit`, `avoid`, `eyesOnDefeat`…; claves documentadas en el fichero).
- `FX[código]`: efecto del objeto/habilidad (`reduceInitial`, `mayReroll`, `doublesBonus`, `attackVs`…).
- `PLOT_OPS[código]`: operaciones de las tramas (`gain`, `lose`, `pay`, `morality`, `loot`, `dieTable`…).

## 4. Comprobar
Añade un escenario a `tests/expansions.test.js` con `rig()` (dados trucados) por cada poder nuevo y ejecuta
`npm test`. Los tests de partidas completas (`playthrough`) recorren todas las configuraciones registradas en
`tests/playthrough.test.js`; añade la tuya a `CONFIGS`.

## Estado
Incluidas: Warren of Despair, Blackened Burrow, Loot & Lore, The Fanny Pack, Beasts & Burdens.
Pendientes de cartas en el repositorio: Galnok's Labyrinth, Crystal Caverns, Throne of Embers, Malicia's Refuge,
The Spire of Zogar, Realms & Relics, The Lonely Troll Inn, The Howling Abyss (mazo de mazmorra alternativo de 18
cartas), Iron Chest y Gnome Pack #1.
