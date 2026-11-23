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
1. **Elige héroe y aventura** en el menú: juego base, una campaña (Warren of Despair, Blackened Burrow) y los
   módulos que quieras (Loot & Lore, The Fanny Pack, Beasts & Burdens).
2. **Prepara la partida**: gasta tu oro inicial en equipo (toca el mazo *Equipo*) y pulsa *Comenzar aventura*.
3. **Explora**: toca la puerta grande para robar 2 cartas, revela una y decide: *afrontarla* (parte 1) o
   *descartarla y arriesgarte con la otra* (parte 2, obligatoria).
4. **Combate**: el enemigo ataca primero (2d6, mayor − menor, dobles = falla). Tú gastas hasta 3 de energía:
   un d6 por ficha. Sin energía, puñetazo de 1.
5. **Cada nivel** (8 turnos): comes una ración, el veneno crece y robas una trama. Con **10 ojos** despierta el jefe.

### Controles
| Acción | Táctil | Ratón / teclado |
|---|---|---|
| Actuar sobre mazos, puertas, cartas | tocar | clic |
| Ver una carta en grande | mantener pulsado | clic derecho |
| Mover / acercar la mesa | arrastrar / pellizcar | arrastrar / rueda |
| Ver toda la mesa | botón ⌂ | `F` |
| Diario (mapa, moral, tramas, cementerio, habilidades, registro) | botón 📖 | `J` |
| Mochila | pestaña inferior | `I` |
| Sonido | ajustes ⚙ | `M` |
| Continuar / aceptar | sellos de lacre | `Espacio` / `Enter` |

La partida se guarda sola al inicio de cada turno y se retoma desde el menú.

## Contenido incluido

| Mazo | Cartas |
|---|---|
| Juego base | 5 héroes · 3 jefes · 18 enemigos · 16 cartas de mazmorra · 18 botines · 10 pociones · 14 equipos · 12 habilidades · 9 tramas |
| Warren of Despair (campaña) | héroe Ozzlo · jefe Cíclope · Grunkles y Titilantes · 3 tramas · objetos |
| Blackened Burrow (campaña) | héroe Qara · jefe Madre Colmena · Avispas y Líderes Llameantes · Escorpión de Fuego · objetos |
| Loot & Lore (módulo) | héroes Azra, Kiln-Olma y Skral · 3 tramas · 3 habilidades · equipo y botín |
| The Fanny Pack (módulo) | héroes Grimwald y Nanoc · Asesino, Araña, Morlock, Trampas de Foso · Rey Goblin · Riñonera y más |
| Beasts & Burdens (módulo) | 8 aflicciones · 6 enemigos · 3 minijefes (Dreadtrodón, Tundra, Caballero de la Muerte) |

Todos los datos están **transcritos de las cartas impresas** (`iron_helm_game/assets/cards`), no inventados.
Las otras diez expansiones del registro oficial aún no tienen sus cartas en el repositorio: ver
[`docs/EXPANSIONS.md`](docs/EXPANSIONS.md) para añadirlas.

## Desarrollo

```bash
npm install            # esbuild + playwright-core (solo desarrollo)
npm test               # 51 pruebas del motor (reglas, expansiones, partidas completas)
npm run build          # regenera iron_helm_game/app.bundle.js
npm run gen:data       # regenera js/data/packs/*.gen.js desde data-src/*.json
node tools/uibot.mjs 3 c1 1     # juega una partida entera pulsando la interfaz y guarda capturas en shots/
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
