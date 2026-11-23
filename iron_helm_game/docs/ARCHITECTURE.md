# Arquitectura del Sistema - Iron Helm Digital

Este documento detalla la estructura técnica, componentes y flujo de datos de la versión digital web de **Iron Helm**. Si necesitas modificar o arreglar cualquier parte del juego, consulta este mapa para saber exactamente a qué archivo dirigirte.

---

## 1. Mapa de Ficheros y Responsabilidades

```
iron_helm_game/
├── index.html                   # Punto de entrada HTML (carga style.css y js/ui/app.js)
├── style.css                    # Estilos visuales integrales y estética inmersiva de mazmorra
│
├── js/
│   ├── engine/                  # LÓGICA DE REGLAS PURA (Independiente de la UI)
│   │   ├── gameState.js         # Estado central reactivo, máquina de estados, hooks de debug
│   │   ├── dungeonEngine.js     # Barajado, regla 2 cartas boca abajo, fin de nivel y trama
│   │   ├── combatEngine.js      # Bucle de combate, dados 2d6 (resta mayor-menor), dobles=fallo, armadura
│   │   └── inventoryEngine.js   # Gestión de slots (MP, OM, 2M, CP, CA, AC), cálculo de peso y armadura
│   │
│   ├── data/                    # BASE DE DATOS DEL JUEGO
│   │   ├── characters.js        # Héroes (Fayon, Sortab, Zolla, Moliclan, Uln-Rolk + expansiones)
│   │   ├── enemies.js           # Catálogo de monstruos (HP, Daño, Debilidades, Oro, Poderes)
│   │   ├── bosses.js            # Jefes del juego base (Merodeador, Naga, Lich) y de campañas
│   │   ├── dungeonCards.js      # Cartas de mazmorra (Tipo 1 narrativas y Tipo 2 de opciones 1 y 2)
│   │   ├── equipment.js         # Armas, armaduras, escudos y accesorios
│   │   ├── potions.js           # Pociones curativas, de energía y arrojadizas de combate
│   │   ├── skills.js            # Habilidades por dominio (Agilidad, Mente, Fuerza)
│   │   ├── plots.js             # Cartas de Trama con dilemas morales e iconos de ojo
│   │   └── expansions.js        # Registro de las 15 expansiones oficiales + Fanmade Anemia
│   │
│   ├── ui/                      # COMPONENTES DE INTERFAZ Y VISTAS TABLETOP
│   │   ├── app.js               # Enrutador principal y gestor de atajos de teclado
│   │   ├── configMenu.js        # Menú de configuración inicial (Héroe, Campañas, Modular, Dificultad)
│   │   ├── dungeonMatView.js    # Tapete de Mazmorra Tabletop (interacción física directa, sin botones artificiales)
│   │   ├── characterMatView.js  # Tapete de Personaje con ranuras de equipo reales y fichas físicas
│   │   ├── inventoryFanView.js  # Abanico de cartas en mano del jugador con curvatura trigonométrica y hover 3D
│   │   ├── dice3D.js            # Motor de dados 3D con físicas de volteo, caras grabadas y sonido de choque
│   │   ├── tokenPile.js         # Renderizador de pilas isométricas 3D de discos de madera/cartón
│   │   ├── combatArenaView.js   # Arena de combate en bandeja de fieltro con tirada física de dados 3D
│   │   ├── cardInteractionModal.js # Modal para decisiones en cartas Tipo 1 (Campamento, Altar, etc.)
│   │   ├── merchantModal.js     # Tienda de compra/venta con el mercader
│   │   ├── logPanel.js          # Drawer lateral con historial categorizado en tiempo real
│   │   ├── debugConsole.js      # Consola flotante de trampas, spawners e inspector de mazmorra
│   │   ├── cardModal.js         # Visor emergente en alta resolución de cualquier carta
│   │   └── endGameModal.js      # Pantalla de victoria/derrota y cálculo de jubilación
│   │
│   └── utils/
│       ├── audio.js             # Efectos de sonido procedurales con Web Audio API (cero latencia)
│       └── logger.js            # Sistema estructurado de logging con categorías y callbacks
│
├── assets/                      # RECURSOS GRÁFICOS OPTIMIZADOS PARA WEB
│   ├── mats/                    # Tapetes optimizados (iron_helm_mat_web.jpg, personaje_mat_web.jpg)
│   └── cards/                   # Cartas extraídas en 480x675 (base_web y expansiones)
│
└── docs/                        # DOCUMENTACIÓN TÉCNICA Y DE REGLAS
    ├── ARCHITECTURE.md          # Este fichero
    ├── DEBUG_GUIDE.md           # Guía de debugging y atajos
    ├── RULES_REFERENCE.md       # Referencia de reglas oficiales
    └── EXPANSIONS_GUIDE.md      # Guía de funcionamiento de expansiones
```

---

## 2. Flujo de Datos y Estados (`gameState.js`)

La aplicación funciona mediante un contenedor reactivo de estado simple y desacoplado:
1. `gameState.status` define el estado actual de la partida:
   * `'CONFIG'`: Menú de selección inicial.
   * `'EXPLORATION'`: Mesa con el par de cartas y mazos.
   * `'CARD_INTERACTION'`: Modal interactivo para cartas Tipo 1 (Campamento, Altar, etc.).
   * `'COMBAT'`: Arena de combate activo con tiradas de dados.
   * `'MERCHANT'`: Tienda abierta para compra y venta.
   * `'VICTORY'`: Victoria al derrotar al Jefe Final.
   * `'GAMEOVER'`: Derrota por Salud <= 0 o Veneno >= Salud.
2. Cada acción llama a métodos del estado o los motores específicos (`dungeonEngine`, `combatEngine`, `inventoryEngine`).
3. Al terminar cada acción, `gameState.notify()` emite la actualización a las vistas suscritas, renderizando de forma quirúrgica solo lo necesario.

---

## 3. Experiencia Tabletop e Interacción Física (V3)

Para eliminar cualquier sensación de aplicación artificial o software de ofimática, la versión 3 implementa directrices de simulación de mesa física:

1. **Interacción Directa con Mazos y Cartas (Sin Botones UI):**
   * **Robar Turno:** Se toca directamente el *Mazo de Mazmorra* físico sobre el tapete. Las dos cartas se reparten deslizándose boca abajo sobre las guías centrales.
   * **Voltear Carta 1:** El jugador toca directamente la *Carta 1* boca abajo, la cual gira en 3D (`rotateY(180deg)`) revelando su contenido y la cinta de Opción 1.
   * **Aceptar o Pasar:**
     * Tocar nuevamente la *Carta 1* la acepta (resuelve Opción 1), enviando la Carta 2 al descarte boca abajo.
     * Tocar la *Carta 2* (boca abajo) rechaza la Carta 1, enviando la Carta 1 al descarte y volteando forzosamente la Carta 2 para resolver su Opción 2 obligatoria.
2. **Abanico de Cartas en Mano (`inventoryFanView.js`):**
   * El inventario y la mochila se abren mediante una pestaña de cuero repujado inferior (o pulsando `I`/`B`).
   * Las cartas se proyectan en un arco trigonométrico simulando una mano de cartas de naipes reales.
   * Al pasar el ratón, la carta se eleva 65px hacia el frente, se endereza, amplía su sombra y revela las opciones táctiles de equipar, beber o soltar.
3. **Dados 3D con Físicas de Rodaje (`dice3D.js`):**
   * Cubos tridimensionales en CSS 3D (`preserve-3d`) con textura de madera roja/hueso y puntos cóncavos dorados.
   * Al atacar, los dados ruedan caóticamente con rotaciones multiaxiales (`@keyframes diceTumble3D`) y chocan en la bandeja de fieltro verde con sonido procedural de impacto.
4. **Pilas de Fichas Isométricas (`tokenPile.js`):**
   * Salud, energía, oro, raciones, veneno y bendiciones se muestran como pilas superpuestas de discos de madera con sombras físicas, reflejando tangiblemente la cantidad restante.
5. **Ranuras de Equipo con Mini-Cartas Reales:**
   * Mano Principal, Otra Mano, Armadura, Casco y Accesorio alojan mini-cartas con las ilustraciones oficiales del juego, en lugar de cajas de texto genéricas.

---

## 4. Rediseño Estructural Orgánico y Combate Fluido (V4)

1. **Descuadriculado y Tapetes Orgánicos:**
   * Se ha eliminado la máscara oscura que asfixiaba los tapetes originales (`iron_helm_mat_web.jpg` y `personaje_mat_web.jpg`), sustituyéndola por una sutil iluminación cálida de antorcha/farol de mazmorra.
   * Se erradicaron las cajas negras y marcos cuadrados artificiales. Los contadores superiores forman un HUD minimalista integrado en madera, sin bordes pesados.
   * La mesa central de exploración se abre completamente: sin cajas gigantes de texto, con sellos de cera táctiles ("SELLO I" y "SELLO II") y cartas con perspectiva 3D realista.

2. **Cartas Superpuestas y Mazos Compactos:**
   * Las cartas de equipo en el tapete de personaje (como Arma + Broquel o Armadura de Cuerpo + Capa) se representan como cartas verticales completas con sutiles rotaciones naturales e intercalado horizontal (`margin-left: -22px; z-index`), permitiendo ver el arte y las estadísticas de ambas piezas a la vez como en un tapete físico.
   * Los mazos de Mazmorra, Enemigos, Botín y Pociones se han escalado a proporciones compactas de mesa (`64px x 90px`), con borde tridimensional de grosor de mazo y ligero ángulo de colocación manual.

3. **Combate Fluido y Efectos Cinemáticos:**
   * Eliminación del exceso de botones de energía y bloques estáticos de acción.
   * **Selector de Energía Compacto:** Stepper directo `[-] ⚡ 1 EN (1d6) [+]` que actualiza los dados automáticamente en tiempo real.
   * **Bandeja de Dados Interactiva:** Se puede pulsar directamente sobre la bandeja de fieltro para rodar los dados 3D con audio procedural.
   * **Animaciones y Efectos Visuales:**
     * *Tajo de espada cinemático (`.sword-slash-fx`):* Efecto de corte con estela de luz que cruza la carta enemiga al atacar.
     * *Impacto y temblor de pantalla (`.monster-hit`, `.screen-shake-anim`):* El monstruo tiembla violentamente al recibir daño y la pantalla sacude la mesa.
     * *Embestida del enemigo (`.monster-lunge`):* El enemigo se abalanza hacia adelante al asestar su contragolpe.
     * *Números flotantes de daño (`.floating-damage-number`):* Se elevan dinámicamente y se desvanecen (`-X HP`) sobre el objetivo afectado.
     * *Viñeta de sangre en pantalla (`.blood-vignette-fx`):* Flash de sangre periférico al sufrir daño en combate.


---

## 5. Simulador Físico de Mesa Tabletop (V5 - Inspirado en Partida Real)

Basado fielmente en la disposición física de una mesa de juego de *Iron Helm* (tapete de adoquines de mazmorra, mazos apilados, cartas de seguimiento con peón y cartas de equipo desplegadas):

1. **Tapete Físico de Adoquines de Mazmorra (cobblestone_mat.jpg):**
   * Sustituye la división artificial de dos tapetes estáticos por una mesa de juego continua y envolvente con textura de piedra de mazmorra, viñeta perimetral e iluminación cálida cenital.

2. **Fila Superior de Mazos Montados desde el Inicio (.tabletop-decks-row):**
   * Todos los mazos del juego están presentes en la mesa desde el primer turno, con grosor físico 3D escalonado y contador de cartas restantes:
     * **Mazo de Mazmorra:** Cartas con reverso de puerta verde (card_back_dungeon.jpg). Al tocarlo en fase de exploración, reparte las 2 cartas del turno.
     * **Mazo de Enemigos:** Reverso oficial (card_back_enemies.jpg).
     * **Mazo de Botín:** Reverso oficial con cofre (card_back_loot.jpg).
     * **Mazo de Tramas:** Reverso oficial con grimorios (card_back_plots.jpg).
     * **Mazo de Pociones:** Reverso oficial con frascos (card_back_potions.jpg).
     * **Manual del Jugador:** Libreto físico con portada oficial (card_handbook.jpg). Al tocarlo, abre el modal de consulta rápida de reglas oficiales.
     * **Dados Físicos en Reposo:** Dados de 6 caras rojos y amarillos descansando en la mesa.

3. **Cartas de Seguimiento con Peón de Plástico Rojo 3D (	abletopBoardView.js):**
   * **Carta de Nivel de Mazmorra (card_level_tracker.jpg):** Camino de 5 calaveras. Un peón rojo tridimensional estilizado con degradado brillante y sombra física marca el piso activo (1 al 5).
   * **Carta de Turnos (card_turn_tracker.jpg):** Laberinto de 8 habitaciones. El peón rojo avanza casilla por casilla con animación de salto al resolver cada turno.
   * Contadores integrados de Ojos del Jefe (👁️) y Moral (⚖️).

4. **Exploración y Combate In Situ (En el Centro de la Mesa):**
   * **Exploración:** Las 2 cartas del turno caen boca abajo sobre guías marcadas en la piedra. Tocar la Carta 1 la voltea en 3D. El jugador decide resolverla mediante el sello de cera o descartarla para voltear forzosamente la Carta 2.
   * **Combate:** La criatura se sitúa frente al héroe en el centro del tapete. La bandeja de dados se integra directamente en la mesa, permitiendo lanzar tiradas con físicas 3D, cortes de espada cinemáticos y temblor de impacto sin cambiar de pantalla.

5. **Área del Jugador Físico:**
   * **Pilas de Fichas 3D:** Salud, Energía, Monedas de Oro, Raciones, Veneno y Bendiciones representadas como pilas de discos de madera/cartón isométricas con recuento numérico.
   * **Carta del Héroe y Habilidades Asomando:** La carta de personaje reposa sobre la mesa con su carta de habilidad inicial asomando por debajo con un sutil ángulo de colocación manual.
   * **Equipo Desplegado sobre la Mesa:** Mano Principal, Otra Mano/Escudo, Armadura/Ropajes, Casco y Accesorio expuestos como cartas verticales completas con estadísticas visibles y opción de desequipar.
   * **Cementerio de Monstruos:** Pila fanned de enemigos derrotados en la esquina derecha de la mesa.
   * **Mochila / Mano de Cartas:** Pestaña repujada de cuero en el borde inferior que despliega el abanico interactivo al hacer clic o pulsar I/B.


---

## 6. Reestructuración Integral 3D y Orden de Mesa (V6 Overhaul)

En respuesta a la necesidad de máxima inmersión física, volumen 3D y orden arquitectónico sin artefactos visuales:

1. **Iluminación Cenital y Superficie de Mesa de Madera y Fieltro:**
   * Eliminado cualquier patrón de repetición o texturas inadecuadas. La mesa de juego combina madera noble de nogal oscuro en los marcos con un tapete central de fieltro esmeralda (#152219), bañado por una cálida luz cenital de farol de mazmorra (
adial-gradient) que proyecta sombras arrojadas realistas.

2. **Estante Superior de Mazos en Madera Tallada (.tabletop-upper-shelf):**
   * Alojamiento de los 5 mazos de cartas en hendiduras talladas con biseles dorados y relieve tridimensional escalonado de cartas apiladas.
   * Incluye el Mazo de Mazmorra (animación de pulso áureo al robar), Enemigos, Botín, Tramas, Pociones, el Manual del Jugador en atril y la bandeja de dados de resina en reposo.

3. **Tablilla de Mazmorra Tallada (Tracker Slate):**
   * En lugar de imágenes recortadas estáticas, una elegante tablilla de roble oscuro (.tracker-slate-wood) integra:
     * **Pista de Niveles (1 a 5):** 5 alvéolos tallados donde se aloja el Peón Rojo 3D.
     * **Pista de Turnos (1 a 8):** Cuadrícula de 8 alvéolos con el Peón Rojo 3D que salta con animación parabólica al avanzar el turno.
     * **Engarces de Gemas:** Marcadores de Ojos del Jefe (👁️) y Moral (⚖️).

4. **Tapete Central de Encuentros y Combate:**
   * **Exploración:** Dos bahías marcadas con los números romanos I y II. Las cartas vuelan desde el mazo con animación de reparto y volteo 3D de 180° en eje Y.
   * **Combate In Situ:** El enemigo se alza en un marco de bronce y carmesí con barra de salud de sangre. La bandeja de fieltro verde aloja los dados 3D que ruedan con sonido físico, acompañados de tajo de espada cinemático, temblor de impacto, contragolpe y números de daño flotantes.

5. **Tablero del Héroe (Player Dashboard):**
   * **Cuencos de Fichas 3D:** Hendiduras circulares en la madera que contienen las pilas isométricas de Salud, Energía, Monedas de Oro, Raciones, Veneno y Bendición.
   * **Altar del Héroe:** Carta del héroe en funda dorada con placa de nombre y habilidad asomando por debajo.
   * **5 Ranuras de Equipo:** Cavidades específicas para Mano Derecha, Mano Izquierda, Armadura, Cabeza y Accesorio, con mini-cartas verticales reales y opción de desequipar.
   * **Pedestal de Cementerio:** Pila de trofeos de enemigos derrotados.
   * **Mochila de Cuero:** Cajón inferior retráctil para acceder al abanico de mano.


---

## 7. Rediseño Ergonómico y Cómodo de Mesa Completa (V7)

En respuesta a las indicaciones del usuario:
1. **Eliminación de la Perspectiva 3D Forzada:** Se eliminan las rotaciones y deformaciones de perspectiva en el tablero. Las cartas y fichas adoptan una vista cenital nítida y limpia de juego de mesa físico sobre el tapete.
2. **Reversos Oficiales de Cartas Intactos:** Se mantienen los reversos auténticos extraídos del juego base (card_back_dungeon.jpg, card_back_enemies.jpg, card_back_loot.jpg, card_back_plots.jpg, card_back_potions.jpg).
3. **Aprovechamiento Total del Espacio (100% Viewport, Cero Scroll):**
   * Toda la partida se distribuye en 3 franjas horizontales perfectamente encajadas en una sola pantalla:
     * **Franja Superior (Suministros):** Marcadores de Piso (1..5), Turno (1..8), Ojos, Moral, y los 4 mazos de reserva con sus contadores de cartas.
     * **Franja Central (Zona de Mazmorra Activa):** El **Mazo de Mazmorra** se sitúa en el centro junto a las 2 cartas de exploración ([ Mazo Mazmorra ] -> [ Carta 1 ] [ Carta 2 ]), permitiendo robar y voltear en un espacio compacto, natural e intuitivo.
     * **Franja Inferior (Tablero del Jugador):** Ocupa todo el ancho inferior sin huecos vacíos: bandeja de fichas (Salud, Energía, Oro, Raciones, Veneno, Bendición), héroe y habilidad, 5 ranuras de equipo completas y cementerio.
4. **Interactividad Garantizada:**
   * Solucionado el error de método de sonido que bloqueaba la ejecución del robo de cartas.
   * Ahora tanto el mazo central como los huecos de carta responden a los clics con stopPropagation, puntero de ratón claro y feedback de sonido.
