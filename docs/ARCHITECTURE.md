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
- **`table.js`** — la mesa: dos tableros (Mazmorra y Personaje) sobre roble oscuro; el suelo de madera acompaña a la cámara.
  Las zonas (`layout.js`) están calibradas sobre el arte original. Dibuja mazos con grosor, pilas, puertas, peones y **montones de
  fichas** en los pocillos de los dos tapetes (el mismo montón del héroe en ambos, sin números: la cifra está en la barra superior).
  Trabaja sobre un *estado de vista* (`vs`) que el director mueve al ritmo de las animaciones. Los huecos (`.slot-hit`) quedan
  *debajo* de las cartas: si no, taparían las cartas del tapete de personaje y no se podrían tocar ni arrastrar.
- **`mapspots.js`** — posición del peón de nivel en cada carta de mapa (cada campaña trae el suyo; medidas con `tools/analyze_maps.py`).
- **`tray.js`** — la **mochila**: bandeja que se abre desde el botón MOCHILA en las dos pestañas con *todo* lo que lleva el héroe
  (en uso con su ranura y guardado). Tocar una carta abre su ficha con USAR / EQUIPAR / GUARDAR / SOLTAR (`App.itemActions`, que
  pregunta al motor con `usableNow`). En el tablero de personaje se arrastra: bandeja → ranura, ranura → bandeja, cualquiera → SOLTAR
  (`drag.js`; con el dedo se "levanta" la carta tirando hacia arriba para no estorbar al desplazamiento). La mesa se re-encuadra
  por encima de la bandeja abierta (`App.trayInset`).
- **`camera.js`** — pan/zoom por puntero (ratón, rueda, pellizco), encuadres por zona (`FOCUS`).
- **`director.js`** — convierte eventos en animaciones **en orden** y esperándolas (`await`). `Ghost` (en `fx.js`)
  son cartas fantasma en coordenadas de pantalla que vuelan entre zonas con volteo 3D. Gestiona las **pausas para leer**
  (`hold()`): las cartas que se enseñan (botín, jefe, aflicción, entorno, habilidad nueva, enemigo derrotado, la carta de una trama
  tras elegir…) se quedan a la vista hasta que el jugador toca (`tap`), esperan un tiempo según el texto (`timed`) o no esperan
  (`off`), según el ajuste «Pausas para leer». Mientras se enseña un objeto no hay nada más en pantalla: la carta que lo dio se retira antes.
- **`arena.js`** — combate: bandeja de fieltro, enemigo en grande con dados d12 de salud, fichas de energía,
  dados 3D (`dice.js`: cubos CSS con rebotes, orientación final exacta y volteo de un dado). Cubre las peticiones nuevas del motor
  (pagar con salud, dar la vuelta a un dado, reacciones del ataque enemigo…).
- **`overlays.js`** — escenas de elección (la carta de la escena se queda a la vista al elegir), selección de cartas, mercader (con
  trueque), La Posada (se construye una vez y se actualiza en sitio; tocar una carta la abre en grande con COMPRAR), pilas de
  descarte, visita divina, diario, ajustes, ayuda y la ficha de carta (`inspect`).
- **`menu.js` / `builder.js`** — menú (héroe, aventura, expansiones, modos fanmade y reglas variantes) y constructor del Gnome Pack.
- **`app.js`** — une todo: HUD, bandeja, enrutado *prompt → interfaz* (`showPrompt`), teclado,
  guardado automático (`localStorage`, al inicio de cada turno).
- **`audio.js`** — sonido procedural con Web Audio (sin ficheros).

### Interfaz de ANEMIA y de las reglas variantes
- El **menú** muestra el modo (`type:'mode'`) en «Modos fanmade» y las reglas variantes (`listVariants()`) agrupadas por `groupName`; cada regla
  tiene su ⓘ con las viñetas, se bloquea con el motivo si falta `needsPack`/`needsModules`, desactiva a las que excluye (`exclusive`) y fija
  el héroe si lleva `forcesHero` (Metal Inmortal → Gene Slash). Si `Game.create` rechaza la combinación, el menú muestra el motivo.
- **`showIntro`** enseña «La historia de…» (pueblo de origen, motivación, rumbo) cuando `setup.intro` existe. El **Diablillo** (`s.imp`) se
  dibuja sobre el mazo de botín o de pociones; «Gastar experiencia» (`spendXp`) está en el diario → Cementerio; la pantalla final
  muestra `epilogue`, `ending` y el lugar de retiro; La Bestia («solo armas») sustituye la carga por un rótulo.
- Los eventos nuevos (`afterlife`, `armLost`, `incantation`, `campMoment`, `dungeonSwap`, `heroSwap`, `skillForgotten`, `enemyEscaped`, `bomb`,
  `adventure`…) tienen su animación y pausa en `director.js`; Tzxefytd (su «salud» es energía) y el descanso de las pociones se explican en la arena.
- **`window.ironHelmBack()`** (`App.back`) cierra lo más superficial (pausa, ficha, mochila, diario…) y devuelve `false` si no hay nada que cerrar:
  lo usa el botón «atrás» de la app Android (`android/`).

## Pruebas y herramientas
- `tests/rules.test.js`, `tests/expansions.test.js`: escenarios con **dados trucados** (`rig`) que comprueban cifras
  exactas de reglas y de cada poder de expansión.
- `tests/playthrough.test.js`: un bot juega 40 partidas por configuración (aleatorio y en modo dios hasta el jefe)
  comprobando invariantes en cada paso (sin cartas duplicadas o perdidas, estadísticas en rango).
- `tools/uibot.mjs`: el mismo tipo de bot, pero **pulsando la interfaz real** en Chromium (Playwright) y guardando
  capturas la primera vez que aparece cada tipo de decisión (también toca las pausas, compra en la tienda y abre la mochila). Admite viewport móvil y táctil.
- `tools/dragtest.mjs`: arrastres reales (ratón o táctil) ranura ↔ bandeja ↔ SOLTAR. `tools/review.mjs`: capturas guiadas de tienda, mesa, personaje y mochila en cualquier tamaño.
- `tools/build.mjs`: empaqueta con esbuild a un IIFE (`app.bundle.js`) que funciona con `file://`.
- `tools/gen_assets.py`, `tools/analyze_mats.py`: generan fichas y texturas, y calibran los huecos de los tapetes.

## Contrato motor-interfaz

Todo lo anterior sigue igual (`g.s.prompt.type`, `g.act(tipo, datos)`, eventos de `g.on`). Lo nuevo:

### Funciones exportadas (`js/engine/index.js`)
- `listPacks()` → `{ packs: [...], gnome: {races, classes, signs} | null, missing: [] }`. Cada paquete:
  `{ id, name, es, type: 'campaign'|'module'|'mode', number, blurb, adventureLevel?, rules: [viñetas], counts: { heroes, enemies,
  bosses, items, plots, skills, environments, artifacts, mercenaries, adventures, dungeonCards, afflictions },
  heroes: [defs], boss: def|null, bosses: [defs] (todos los jefes que trae el paquete; en un `mode` incluye los especiales con `special`/`only`), keyCards: [{ img, name, kind }] (hasta 8), exclusive?: 'dungeonDeck', includes?: [ids],
  intro: { name, text, img } | null, available, map }`.
- `buildCatalog(cfg)` → además de lo anterior: `cat.extras = { environments, artifacts, afflictions, mercenaries,
  encounters }` (booleanos), `cat.backs` con `environments, artifacts, mercenaries, afflictions, dungeon` (dorso de
  Howling si está activo), `cat.pools.{environments, artifacts, mercs, adventures}`, `cat.adventureLevel`,
  `cat.encounterTable`. `cfg = { campaign, modules, custom?, variants? }`; Zogar añade `beasts`, `custom` añade `gnome`.
  Nuevo: `cat.variants` = `{ id: true|false }` (todas las ids) y `cat.cfg.variants` solo con las activas (ausente si no hay ninguna).
- `listVariants()` → `[{ id, name, blurb, rules: [viñetas], default: false, needsPack: 'anemia'|null, needsModules: [ids], exclusive: [ids],
  forcesHero: id|null, group, groupName }]` (15 reglas variantes de ANEMIA 4.0; son copias).
  `normalizeVariants(variants, modules)` → `{ enabled, all }` o lanza un `Error` en español (ver «Reglas variantes» al final).
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

## ANEMIA 4.0: modo fanmade y reglas variantes (contrato para la interfaz)

Todo es **retrocompatible**: sin `config.variants` ni el módulo `anemia` el motor se comporta exactamente como antes
(`s.variants` es un objeto con todas las ids a `false`; no hay campos nuevos en los prompts existentes).

### Modo `anemia` (`type: 'mode'`)
- Se activa como un módulo (`config.modules: ['anemia', …]`) pero `listPacks()` lo devuelve con `type: 'mode'` (misma forma que el resto:
  `rules, counts, heroes, boss: null, keyCards, intro, available, map`). La interfaz debe agruparlo en «Modos fanmade»; el motor trata `mode`
  igual que `module` (`buildCatalog`, `Game.create`, colisiones de ids…). Sus dorsos (entornos, esbirros, aflicciones) solo se usan si ningún
  otro paquete los define.
- Héroes (5): se eligen con los ids `anc1…anc5` (Gene Slash, La Bestia, Mae, Samurái, Thorn). **Gene Slash** siempre es seleccionable; su
  Guitarra Hacha, la Chaqueta con Tachuelas y Lírica Bestial **no entran en ningún mazo** (cartas `only:'metalInmortal'`, se inyectan como
  equipo inicial). **La Parca** (`special:'parca'`) y el Señor del Tiempo tampoco están en el mazo de jefes (la Parca solo con su variante, el
  Señor del Tiempo solo con Metal Inmortal). Siguen resolviéndose con `cat.byCode.get('ANT1' | 'ANB1' | 'ANB8')`.
- Los **entornos** de ANEMIA solo se juegan con el módulo `realms` (que es quien trae el mazo de entornos); sin él quedan fuera de la partida.
- **La Bestia** tiene `encumbrance: '*'` en su carta (número en el resto): `s.hero.carryRule === 'weaponsOnly'`, `maxWeight() = 0` y `weight()` cuenta
  los objetos que sobran (solo puede llevar dos armas de una mano o una de dos). El prompt `overweight` sigue siendo `{ need }`.
- Claves de carta (la carta no imprime código): `ANC1-5` héroes, `ANB1-8` jefes, `ANE1-12` enemigos, `ANT1-5` equipo, `ANP1-4` pociones,
  `ANAF1-3` aflicciones, `ANS1-7` habilidades, `ANEN1-4` entornos, `ANM1-2` esbirros, `ANPT1-22` tramas.

### Reglas variantes: `config.variants`
`Game.create({ heroId, config: { campaign, modules, variants: { diablillo: true, … } } })`.
- Valores falsos o ausentes = desactivada. `s.variants` guarda **todas** las ids (`true|false`); `s.config.variants` solo las activas.
- `Game.create` (y `buildCatalog`) **lanzan un `Error`** con el motivo si: la id no existe (`Variante desconocida: x`), falta el paquete
  (`needsPack`: «necesita el paquete anemia»), falta un módulo (`needsModules`: `entornosTematicos` → `realms`, `momentosPaz` → `troll`), hay dos
  incompatibles (`exclusive`: `hogarSonado` ↔ `sinRetorno`) o `metalInmortal` se combina con un héroe que no es Gene Slash (`forcesHero`).
  La interfaz debe deshabilitar esas casillas con los datos de `listVariants()`.
- Las variantes sin `needsPack` funcionan con cualquier configuración (base, campañas, otros módulos).
- Con `sinRetorno` y una campaña elegida, el **héroe puede ser de esa campaña** aunque la primera aventura sea el juego base.

| id | grupo | efecto en el motor |
|---|---|---|
| `diablillo` | reglas | `s.imp: 'loot'\|'potions'\|'out'` (avanza al robar cada par de cartas de mazmorra); `gainLoot/gainPotion/pickLoot…` dan 1 carta menos si está sobre ese mazo. Evento `imp {pos, steals?}` |
| `pueblo` | reglas | d6 al crear: `s.origin = { roll, town, stat, text }` y el beneficio ya aplicado; también en `setup.intro.origin` |
| `motivacion` | narrativa | d6 al crear: `s.motivation = { roll, text }` y `setup.intro.motivation` |
| `ceroEnergia` | reglas | el puñetazo (0 de energía) tira un d6 (tabla del libro) |
| `gastarXP` | reglas | acción `spendXp { stat: 'hp'\|'energy' }` (en `turn` y `setup`): gasta 7 enemigos derrotados; `hero.maxHp` / `hero.energyBonus` +1; evento `xpSpent` |
| `hogarSonado` | desafíos | al empezar la secuencia del jefe, con ≥ 30 de oro `choice` (`buy`/`fight`); comprar = victoria con `s.over.ending = 'mansion'` |
| `sinRetorno` | desafíos | `s.chain = { total: 3, index, adventures: [{ level, campaign }] }`; al derrotar al jefe empieza la siguiente aventura (evento `adventure`) sin pasar por `setup`; solo el último jefe da la victoria; +25 de oro en la puntuación |
| `justoAntesDeMorir` | muerte | si un ataque enemigo te mataría: `choice` (`arm`/`die`); `hero.armLost`, `hero.armUsed`; evento `armLost` |
| `enfrentarseParca` | muerte | al morir: `choice` (`fight`/`accept`); duelo contra La Parca (`s.parca`, `s.afterlife`; eventos `parcaOffer`, `afterlife`) |
| `entornosTematicos` | mazmorra | d4 al crear: `s.direction = { roll, name }`; el entorno de los niveles 1-3 sale de la tabla del libro |
| `muertesAtroces` | epílogos | `s.over.epilogue = { name, text }` (y en el evento `gameover`) si mueres ante un jefe o minijefe |
| `lugaresRetiro` | epílogos | `s.over.score.retreat = { name, text }` al ganar |
| `encantamientos` | narrativa | evento `incantation { name, text }` al usar una poción |
| `momentosPaz` | narrativa | evento `campMoment { roll, text, who }` al acampar con David Galahad o Gral |
| `metalInmortal` | aventura | héroe obligatorio `anc1`; 18 enemigos y 12 tramas al azar; jefe Señor del Tiempo; `s.over.ending: 'home' \| 'trapped'` |

### Estado nuevo (todo JSON)
`s.variants` · `s.chain` (`null` o `{ total, index, adventures[], adrenaline? }`) · `s.imp` · `s.origin` · `s.motivation` · `s.direction` ·
`s.parca` (`{ stage: 'offer'\|'duel', reason?, card? }`) · `s.afterlife` (`{ skills, blessings, mercs, combat }`) · `s.hero.key` (clave de la carta del
héroe actual) · `s.hero.initial = { rations, gold, energy }` · `s.hero.armLost/armUsed` · `s.hero.energyBonus` · `s.hero.carryRule` ·
`s.lvl.forgotten` (id de la habilidad que Amnesia te hace olvidar este nivel) · `s.game.curse` (maldición del Aquelarre) · `s.game.wolf` ·
`s.game.delayed` (fichas de La Pitonisa) · `s.game.mansion` · `s.ctx.seriesQueue` · `s.over.ending` (`'mansion'|'home'|'trapped'|'evaded'`) ·
`s.over.epilogue` · `s.over.score.retreat`. En combate: `c.weaknesses` (lista; los jefes con dos debilidades), `c.restMode/restSkips`,
`c.stuck`, `c.avoidBonus`, `c.series`, `c.asUndead`, `c.noTreasure`, `c.parca`, `c.gral`.
**Tzxefytd** no tiene salud: `c.hp/c.maxHp` son su **energía** (d6+10 redondeada a par; −2 por ataque) y el prompt `attack` lleva `duel: true`.
La energía puede superar 14 (`maxEnergy() = 14 + hero.energyBonus`) y la salud puede superar `maxHp()` mientras dura la Sangre de Lobo.

### Peticiones (`s.prompt`) nuevas o ampliadas
| tipo | cambios |
|---|---|
| `setup` | `shop` es `false` entre las aventuras encadenadas (no hay `setup` en ellas); `intro: { origin, motivation, direction }` (solo con esas variantes) |
| `attack` | `rest: { mode: 'energy'\|'power', skipped }` (tras Energía Potencial / Absorción) y `duel: true` (Tzxefytd); `specials` con ids nuevos: `rest, pacificador, punos, gral, moneda` (acción `special`; todos **sustituyen al ataque** salvo `moneda`, que mata al enemigo y también acaba el combate) |
| `pre` | `options` puede incluir `moneda` (Hombre Lobo) |
| `avoidEnemy` | ids nuevos: `lirica, centauro` (`free: true`) y `ciudad` (`bossAvoid: true`: evita al jefe con 1 ración, +1 de energía y gana la partida con `ending: 'evaded'`) |
| `enemyRoll` | reacción nueva `fase` (Doble Fase) |
| `pickCards` | `purpose` nuevos: `learnSkill` (Doya), `loseSkill` (El Libro Prohibido) |
| `choice` | escena `generic` en las decisiones nuevas (Parca, brazo, mansión, La Horda, El Trato, Hombre de Latón, Cambio de Cuerpo, Más Rápido que la Vista…); `camp` añade la opción `endLevel` (Cielo Resquebrajado) |
| `overweight` | ahora acepta la acción `use` (beber una poción en vez de soltarla) |

### Acciones y utilidades nuevas
`spendXp {stat}` · `special {id}` con los ids de arriba · `enemyReact {id: 'fase'}` · `use {uid}` válido también en `overweight` ·
`Game.usableNow(uid)` devuelve `{ when: 'combat' }` (valor nuevo) para las pociones de combate y La Bomba de Dios (solo durante un combate) y
`{ when: 'free' }` para Sangre de Lobo; sus claves están en `USE_KEYS` (items.js). Métodos nuevos: `g.maxEnergy()`, `g.poisonImmune()`,
`g.heroFemale()`, `g.eLvl()`.

### Eventos nuevos
`imp {pos, steals?}` · `xpSpent {stat}` · `armLost` · `parcaOffer {reason}` · `afterlife {enter, card?}` · `bomb {uid}` ·
`adventure {index, total, level, campaign}` · `incantation {name, text}` · `campMoment {roll, text, who}` · `dungeonSwap {from, to}` (Reino
Arborícola) · `enemyEscaped {uid}` (Asesino Sigiloso; además `combatEnd {result: 'avoid', escaped: true}`) · `heroSwap {id, name}` (Cambio de
Cuerpo) · `skillForgotten {id}` (Amnesia) · `trap {uid, hazard: 'gas'|'sand'|'acid'}` · `levelUp {level, portal: true}` (El Portal puede bajar de
nivel) · `gameover` puede llevar `epilogue` y `ending`.
