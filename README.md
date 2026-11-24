# Iron Helm Digital

Adaptación digital en solitario de **Iron Helm** (Jason Glover · Grey Gnome Games) para navegador y móvil.
Una mesa de juego de fantasía oscura con los tapetes oficiales, cartas reales que se voltean, dados 3D que
ruedan sobre el fieltro y todas las reglas del reglamento aplicadas por un motor probado con tests.

> Proyecto personal y no oficial. Diseño original e ilustraciones © Jason Glover, Daniel F. Walthall y Grey Gnome Games.

## Jugar

```bash
# opción 1: abrir directamente (funciona sin servidor)
open iron_helm_game/index.html

# opción 2: servidor local
node tools/serve.mjs 8123      # http://localhost:8123
```

No necesita instalar nada para jugar. `app.bundle.js` va incluido en el repositorio.

### Cómo se juega
1. **Elige héroe y aventura** en el menú. Cada expansión tiene un botón ⓘ que explica qué incluye y cómo cambia la partida.
   Elegir opciones no recarga ni mueve la pantalla. Con el Gnome Pack puedes **crear tu propio héroe** (raza, clase y signo astral).
2. **La Posada**: gasta tu oro inicial en equipo (y contrata esbirros con la Posada del Troll Solitario). Si no tienes nada que comprar, la partida empieza directamente.
3. **Explora**: toca la puerta para robar 2 cartas; la primera se revela sola. Afróntala (parte 1) o descártala y arriesga con la otra (parte 2).
4. **Combate**: el enemigo ataca primero (2d6, mayor − menor, dobles = falla). Tú gastas hasta 3 de energía, un d6 por ficha. Toca el fieltro para lanzar los dados.
5. **Cada nivel** (8 turnos): comes una ración, el veneno crece y robas una trama. Con **10 ojos** despierta el jefe.

### Dos tableros y la mochila
Las pestañas de abajo alternan entre **Mazmorra** (mazos, puertas, marcadores y franja de expansiones) y **Personaje**
(el equipo puesto, las habilidades, los esbirros y las aflicciones). Las fichas del héroe se ven como **montones** en los pocillos
de los dos tapetes (sin números: las cifras están en la barra superior).
El botón **MOCHILA** (en las dos pestañas) abre una bandeja con *todo* lo que llevas, lo que usas y lo que guardas: toca una carta
para ver sus opciones (usar, equipar, guardar, soltar) o, en Personaje, **arrástrala** a su ranura del tapete (con el dedo, tirando hacia arriba),
de una ranura a la bandeja para guardarla, o al cubo **SOLTAR** para descartarla. Solo se cambia de equipo entre turnos.

### Cartas que se leen sin prisa
Cada carta que se enseña (botín, jefe, aflicción, entorno, habilidad nueva, el enemigo derrotado o la carta de una trama tras elegir)
se queda en pantalla **hasta que tocas**. En *Ajustes → Pausas para leer* puedes elegir «Tocar», «Tiempo» (esperan según el texto) o «Sin pausas».

### Controles
| Acción | Táctil | Ratón / teclado |
|---|---|---|
| Actuar sobre mazos, puertas, cartas | tocar | clic |
| Ver una carta en grande | mantener pulsado | clic derecho |
| Qué hace cada ficha de la barra superior o de los pocillos | tocarla | clic |
| Mover / acercar la mesa | arrastrar / pellizcar | arrastrar / rueda |
| Cambiar de tablero | pestañas | `1` / `2` |
| Encuadrar la mesa | botón ⛶ | `F` |
| Diario (mapa, moral, tramas, cementerio, habilidades, registro) | 📖 | `J` |
| Mochila | botón MOCHILA | `I` |
| Ver una pila de descarte | tocarla | clic |
| Continuar tras una carta / aceptar la acción principal | tocar | `Espacio` / `Enter` |

La partida se guarda sola al inicio de cada turno y se retoma desde el menú. En ajustes puedes activar "robar solo al empezar cada turno".

## Contenido incluido
Las **15 expansiones oficiales** están jugables (7 campañas y 8 módulos), además del juego base: Warren of Despair, Blackened Burrow,
Galnok's Labyrinth, Crystal Caverns, Throne of Embers, Malicia's Refuge, The Spire of Zogar, Loot & Lore, Realms & Relics,
The Lonely Troll Inn, The Fanny Pack, Beasts & Burdens, The Howling Abyss, Iron Chest y Gnome Pack #1.
Todos los datos están **transcritos de las cartas impresas** (`iron_helm_game/assets/cards`); la tabla de cobertura carta → efecto → test
está en [`docs/EXPANSIONS.md`](docs/EXPANSIONS.md).

**Modo fanmade ANEMIA 4.0** (Aizen Myo): 5 personajes, 8 jefes, 12 enemigos, 22 tramas, objetos, pociones, habilidades, aflicciones,
entornos y esbirros, más **15 reglas variantes** independientes que se activan en el menú (Diablillo, Pueblo de Origen, Motivación,
Cero Energía, Gastar XP, Hogar Soñado, Sin Retorno, Justo Antes de Morir, Enfrentarse a La Parca, entornos temáticos, Muertes Atroces,
Lugares de Retiro, Encantamientos, Momentos de Paz y la aventura Metal Inmortal). Algunas necesitan el modo, un módulo concreto o se excluyen entre sí;
el menú lo indica.

## Android e iOS (APK y PWA)
- **Android (APK nativa):** `node tools/build-apk.mjs` (o `npm run apk`) genera `releases/IronHelm.apk`: la misma web empaquetada en una app nativa mínima (WebView sin conexión, pantalla completa, notch, botón atrás, rotación). Ver [`android/README.md`](android/README.md).
- **iOS y Android (PWA sin conexión):** [`iron_helm_game/manifest.webmanifest`](iron_helm_game/manifest.webmanifest) y [`iron_helm_game/sw.js`](iron_helm_game/sw.js) permiten servir la web por HTTPS (p. ej. mediante [`.github/workflows/pages.yml`](.github/workflows/pages.yml) en GitHub Pages) e instalarla en iPhone (*Safari → Compartir → Añadir a pantalla de inicio*) o Android (*Chrome → Instalar aplicación*), con juego base automático en caché y descarga opcional de todas las expansiones sin conexión.

## Desarrollo

```bash
npm install            # esbuild + playwright-core (solo desarrollo)
npm test               # ~370 pruebas del motor (reglas, cada carta de cada expansión y de ANEMIA, variantes, partidas completas)
npm run build          # regenera iron_helm_game/app.bundle.js
npm run gen:data       # regenera js/data/packs/*.gen.js desde data-src/*.json
node tools/uibot.mjs 3 c1 1     # juega una partida entera pulsando la interfaz y guarda capturas en shots/
node tools/uisuite.mjs          # batería de partidas de interfaz con distintas expansiones (añade `móvil` para pantalla táctil)
node tools/dragtest.mjs         # arrastres reales: ranura ↔ mochila ↔ SOLTAR (ratón; añade `1024 768 1` para táctil)
node tools/review.mjs rv        # capturas guiadas de tienda, mesa, personaje y mochila en shots/ (ancho alto táctil campaña módulos)
node tools/pawncheck.mjs        # el peón de nivel sobre cada sala de cada mapa de campaña
node tools/formatcheck.mjs       # audita el formato (nada cortado, sin barras sobrantes, muescas) en 7 tamaños de móvil/tableta/escritorio
npm run apk                     # genera releases/IronHelm.apk (app Android)
```

```
iron_helm_game/
├── index.html · css/style.css · app.bundle.js · fonts/
├── js/engine/    motor de reglas (sin DOM, determinista, serializable)
├── js/data/      cartas del juego base + efectos de expansiones
├── js/ui/        mesa, cámara, cartas, dados 3D, arena de combate, overlays, director de animaciones
├── assets/       cartas (480×675), tapetes oficiales, fichas, texturas
└── data-src/     transcripciones JSON de las expansiones
tests/ · tools/
```

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitectura del motor y de la interfaz.
- [`docs/RULES.md`](docs/RULES.md) — reglas tal como están implementadas y decisiones de interpretación.
- [`docs/EXPANSIONS.md`](docs/EXPANSIONS.md) — cómo añadir una expansión.

## Licencia y créditos
Código de la adaptación: uso personal y educativo. Iron Helm © Grey Gnome Games; las ilustraciones y textos de
las cartas pertenecen a sus autores. Fuentes tipográficas: Cinzel e IM Fell (SIL OFL 1.1).
