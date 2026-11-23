# Arquitectura

Dos capas con una frontera estricta: el **motor** decide qué pasa; la **interfaz** lo cuenta con animaciones.

```
 jugador ──tap/clic──▶ App.act(tipo, datos) ──▶ Game.act()  (motor, síncrono)
                                                   │ emite eventos
                                                   ▼
                              Director (cola) ──▶ animaciones (cartas que vuelan, dados, fichas…)
                                                   │ al terminar
                                                   ▼
                       App.afterIdle(): resincroniza la mesa y muestra la siguiente decisión (prompt)
```

## Motor (`js/engine`)
Sin DOM, sin tiempo, sin `Math.random`: todo con semilla (`rng.js`, mulberry32). Una partida es JSON puro
(`Game.snapshot()` / `Game.restore()`).

- **Estado** (`g.s`): héroe, zonas de cartas (`z.dungeon`, `z.enemies`, `z.hand`, `z.graveyard`…), equipo (`eq`),
  banderas de nivel (`lvl`), contexto del turno (`ctx`), combate en curso (`combat`) y la petición pendiente (`prompt`).
  Cada carta física tiene un `uid`; su definición se resuelve por `cat.def(id)`.
- **Cola de tareas** (`g.q`): el flujo se escribe como funciones encadenadas. Una tarea puede pedir una decisión
  con `g.ask(tipo, datos)`; el bucle `run()` se detiene hasta que llega la acción correspondiente.
- **Acciones** (`ACTIONS` en cada módulo): `{ in: [tipos de prompt válidos], run(payload, prompt) }`. `g.act()` valida
  que la acción sea legal en el prompt actual y devuelve `{ok, error?}`. Las excepciones de regla (`g.fail`)
  se convierten en errores amables; el estado no queda a medias porque se valida antes de mutar.
- **Eventos** (`g.on`): `dice`, `deal`, `reveal`, `stat`, `enemyHp`, `combatStart`… La interfaz nunca consulta
  "qué ha cambiado": solo reproduce eventos.
- **Módulos**: `game.js` (estado, inventario, estadísticas, puntuación), `scenes.js` (niveles, turnos, cartas de
  mazmorra, tramas, mercader, jefe), `combat.js`, `items.js` (consumibles, robar botín/artefactos, operaciones de trama),
  `expansions.js` (entornos, esbirros, encuentros aleatorios), `catalog.js` (une base + campaña + módulos, aplica las
  reglas de sustitución, resuelve nombres entre todas las expansiones y construye los personajes del Gnome Pack).

### Datos
- `js/data/base.js`: juego base transcrito a mano de las cartas.
- `data-src/*.json` → `tools/gen-data.mjs` → `js/data/packs/*.gen.js`: expansiones (texto literal de la carta).
- `js/data/pack-fx.js`: lo que NO está en el texto de la carta, escrito a mano y unido por **clave de carta** (código
  impreso o `paquete:código` si dos expansiones lo repiten): metadatos de campaña (`PACKS`), poderes de enemigos
  (`POWERS`), efectos de objetos/habilidades/esbirros (`FX`), operaciones de tramas (`PLOT_OPS`), entornos (`ENV_FX`)
  y parámetros de las cartas de mazmorra (`DUNGEON_FX`). Ver `docs/EXPANSIONS.md`.

## Interfaz (`js/ui`)
- **`table.js`** — la mesa: dos tapetes oficiales (2000×1175 y 745×1175 px de mesa) sobre roble oscuro. Las
  zonas (`layout.js`) están calibradas sobre el arte original. Dibuja mazos con grosor, pilas, puertas, fichas en
  los pocillos y peones. Trabaja sobre un *estado de vista* (`vs`) que el director mueve al ritmo de las animaciones.
- **`camera.js`** — pan/zoom por puntero (ratón, rueda, pellizco), encuadres por zona (`FOCUS`).
- **`director.js`** — convierte eventos en animaciones **en orden** y esperándolas (`await`). `Ghost` (en `fx.js`)
  son cartas fantasma en coordenadas de pantalla que vuelan entre zonas con volteo 3D.
- **`arena.js`** — combate: bandeja de fieltro, enemigo en grande con dados d12 de salud, fichas de energía,
  dados 3D (`dice.js`: cubos CSS con rebotes y orientación final exacta).
- **`overlays.js`** — escenas de elección, selección de cartas, mercader, tienda, visita divina, diario,
  ajustes, ayuda, inspector.
- **`app.js`** — une todo: HUD, mochila en abanico, enrutado *prompt → interfaz* (`showPrompt`), teclado,
  guardado automático (`localStorage`, al inicio de cada turno).
- **`audio.js`** — sonido procedural con Web Audio (sin ficheros).

## Pruebas y herramientas
- `tests/rules.test.js`, `tests/expansions.test.js`: escenarios con **dados trucados** (`rig`) que comprueban cifras
  exactas de reglas y de cada poder de expansión.
- `tests/playthrough.test.js`: un bot juega 40 partidas por configuración (aleatorio y en modo dios hasta el jefe)
  comprobando invariantes en cada paso (sin cartas duplicadas o perdidas, estadísticas en rango).
- `tools/uibot.mjs`: el mismo tipo de bot, pero **pulsando la interfaz real** en Chromium (Playwright) y guardando
  capturas la primera vez que aparece cada tipo de decisión. Admite viewport móvil y táctil.
- `tools/build.mjs`: empaqueta con esbuild a un IIFE (`app.bundle.js`) que funciona con `file://`.
- `tools/gen_assets.py`, `tools/analyze_mats.py`: generan fichas y texturas, y calibran los huecos de los tapetes.

## Contrato motor-interfaz

Todo lo anterior sigue igual (`g.s.prompt.type`, `g.act(tipo, datos)`, eventos de `g.on`). Lo nuevo:

### Funciones exportadas (`js/engine/index.js`)
- `listPacks()` → `{ packs: [...], gnome: {races, classes, signs} | null, missing: [] }`. Cada paquete:
  `{ id, name, es, type: 'campaign'|'module', number, blurb, adventureLevel?, rules: [viñetas], counts: { heroes, enemies,
  bosses, items, plots, skills, environments, artifacts, mercenaries, adventures, dungeonCards, afflictions },
  heroes: [defs], boss: def|null, keyCards: [{ img, name, kind }] (hasta 8), exclusive?: 'dungeonDeck', includes?: [ids],
  intro: { name, text, img } | null, available, map }`.
- `buildCatalog(cfg)` → además de lo anterior: `cat.extras = { environments, artifacts, afflictions, mercenaries,
  encounters }` (booleanos), `cat.backs` con `environments, artifacts, mercenaries, afflictions, dungeon` (dorso de
  Howling si está activo), `cat.pools.{environments, artifacts, mercs, adventures}`, `cat.adventureLevel`,
  `cat.encounterTable`. `cfg = { campaign, modules, custom? }`; Zogar añade `beasts`, `custom` añade `gnome`.
- `buildCustomHeroPreview(sel)` → `{ valid, errors[], name, race, klass, sign, raceAbility, health, energy, encumbrance,
  rations, gold, morality, proficiency, skills: [{id,name,img}], equipment: [{id,name,img}], potion }` (nunca lanza).
- `Game.create({ heroId: 'custom', config: { campaign, modules, custom: { race, klass, sign, skill, equipment,
  equipment2?, potion?, name? } } })`: lanza un `Error` con el motivo si la selección no es válida.
- En la partida: `g.canBuyArtifact()`, `g.nextArtifactCost()`, `g.envFx()`, `g.hasMerc(clave)`, `g.merc(uid)`,
  `g.canFlee()`, `g.canSixthSense()`, `g.immune(elemento)`, `g.cardParams(def, parte)`.

### Estado nuevo (todo JSON)
`s.env` (uid del entorno del nivel o `null`) · `s.mercs = [{ uid, morale, max }]` · `s.artifactsBought` ·
`s.encounter = { map: uid } | null` · `s.adventureLevel` · `s.hero.custom` (selección del Gnome Pack o `null`) ·
`s.hero.race` · `s.hero.scoreBonus` · zonas `z.environments`, `z.environmentsDiscard`, `z.artifacts`,
`z.artifactsDiscard`, `z.mercenaries` (posada), `z.adventure` (el mapa) · `s.cards[uid].empty` (Petaca vacía) ·
`s.ctx.inPlay` (tramas en resolución) · `s.ctx.trade` (el mercader comercia).

### Peticiones (`s.prompt`) nuevas o ampliadas
| tipo | campos nuevos |
|---|---|
| `setup` | `{ shop: true, inn: null \| { candidates: [uids de los 8 esbirros], hired: [uids], max: 3 } }` |
| `pair` | `sixthSense` (se puede usar Sexto Sentido) |
| `decide` | `flee` (se puede usar Correr) |
| `avoidCard` | `side`; `resolve: true` = carta no combativa (la opción "fight" la resuelve); ids: `wedge, ring, sexto, vest, hide, boots, correr` |
| `avoidEnemy` | ids: `pay_gold, pay_rations, pay_blessing, discardValue, mask, cultist, halforc` (`free: true` = sin coste) |
| `pre` | ids nuevos: `drain, sting, drainShield, granada` (además de `bloquear, sombra, shuriken, light_torch, light_lamp, bellota, nomuerto_*`) |
| `attack` | `payHp: [{ id: 'AT7'\|'kroling', label, extra, text }]`, `fist` (1 o 2); `potions` ya filtra inmunidades |
| `postRoll` | ids nuevos: `all:S19`, `all:HM6`, `flip:T31`, `flip:HM1` (`needsDie: true`), `bonus:AT1` |
| `enemyRoll` | `{ kind, dice, dmg, uid (Poción de Suerte o null), options: [{ id: 'luck'\|'moon'\|'cape'\|'garlic', label, text }], react }` |
| `merchant` | `trade` (Mercader de Howling) |
| `choice` | escenas nuevas: `ops` (cada opción lleva sus operaciones); marcas `treasure: 1` (tesoro tipo 1), `artifact: true` (botín o artefacto) |
| `pickCards` | `purpose` nuevos: `scepter, wild, destroy, diary, lighten, discardItem, feedFire` (`deckPick` con `reshuffle`) |

### Acciones nuevas
`hire {uid}` (setup) · `payMorale {uid}` (setup, turn) · `sixthSense` (pair) · `flee` (decide) ·
`enemyReact {id}` (enemyRoll; `luckReroll`/`luckKeep` siguen valiendo) · `merchantTrade {give, take}` (merchant) ·
`attack {energy, furia?, mandoble?, payHp?}` (con `payHp`, `energy` = nº de dados) · `reroll {id, die?}` (`die` = índice
del dado para `flip:*`). `begin` sigue cerrando la preparación.

### Eventos nuevos
`environment {uid}` · `mercenary {uid, kind: 'hire'|'morale'|'leave', morale}` · `encounter {icon: 'trap'|'enemy'|
'mushrooms'|'treasure'|'potion'|'random', from, to}` · `artifactPaid {uid, cost}` · `peekCards {uids, deck}` (Sello de
Zogar) · `tradeCard {give, take}` · `cardState {uid, empty}` (Petaca) · `diceReroll {…, flip: true}` ·
`enemyMiss {kind, avoided: true}` (Ajo). Robos, ganancias y descartes reutilizan `draw`, `gainCard`, `discardCard`
(`why: 'destroyed'|'burned'|'diary'|'fled'…`) y `peek {uid}`.
