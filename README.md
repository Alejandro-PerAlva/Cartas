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

### Dos tableros
Las pestañas de abajo alternan entre **Mazmorra** (mazos, puertas, marcadores y franja de expansiones) y **Personaje**
(tus fichas, el equipo puesto, la mochila, los esbirros y las aflicciones). En Personaje **arrastras** los objetos de la mochila
a las ranuras del tapete (o a SOLTAR AQUÍ) entre turnos.

### Controles
| Acción | Táctil | Ratón / teclado |
|---|---|---|
| Actuar sobre mazos, puertas, cartas | tocar | clic |
| Ver una carta en grande | mantener pulsado | clic derecho |
| Qué hace cada ficha del HUD | tocarla | clic |
| Mover / acercar la mesa | arrastrar / pellizcar | arrastrar / rueda |
| Cambiar de tablero | pestañas | `1` / `2` |
| Encuadrar la mesa | botón ⛶ | `F` |
| Diario (mapa, moral, tramas, cementerio, habilidades, registro) | 📖 | `J` |
| Mochila en abanico | pestaña Mochila | `I` |
| Aceptar la acción principal | botón | `Espacio` / `Enter` |

La partida se guarda sola al inicio de cada turno y se retoma desde el menú. En ajustes puedes activar "robar solo al empezar cada turno".

## Contenido incluido
Las **15 expansiones oficiales** están jugables (7 campañas y 8 módulos), además del juego base: Warren of Despair, Blackened Burrow,
Galnok's Labyrinth, Crystal Caverns, Throne of Embers, Malicia's Refuge, The Spire of Zogar, Loot & Lore, Realms & Relics,
The Lonely Troll Inn, The Fanny Pack, Beasts & Burdens, The Howling Abyss, Iron Chest y Gnome Pack #1.
Todos los datos están **transcritos de las cartas impresas** (`iron_helm_game/assets/cards`); la tabla de cobertura carta → efecto → test
está en [`docs/EXPANSIONS.md`](docs/EXPANSIONS.md). La expansión fanmade *Anemia* (reglamento en `17. Iron Helm/`) no está integrada.

## Desarrollo

```bash
npm install            # esbuild + playwright-core (solo desarrollo)
npm test               # 230 pruebas del motor (reglas, cada carta de cada expansión, partidas completas)
npm run build          # regenera iron_helm_game/app.bundle.js
npm run gen:data       # regenera js/data/packs/*.gen.js desde data-src/*.json
node tools/uibot.mjs 3 c1 1     # juega una partida entera pulsando la interfaz y guarda capturas en shots/
node tools/uisuite.mjs          # batería de partidas de interfaz con distintas expansiones (añade `móvil` para pantalla táctil)
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
