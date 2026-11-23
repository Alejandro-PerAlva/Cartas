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
  mazmorra, tramas, mercader, jefe), `combat.js`, `items.js` (consumibles, robar botín, operaciones de trama),
  `catalog.js` (une base + campaña + módulos y aplica las reglas de sustitución).

### Datos
- `js/data/base.js`: juego base transcrito a mano de las cartas.
- `data-src/*.json` → `tools/gen-data.mjs` → `js/data/packs/*.gen.js`: expansiones (texto literal de la carta).
- `js/data/pack-fx.js`: lo que NO está en el texto de la carta, escrito a mano y unido por **código de carta**:
  metadatos de campaña, poderes de enemigos (`POWERS`), efectos de objetos/habilidades (`FX`) y operaciones de
  tramas nuevas (`PLOT_OPS`).

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
