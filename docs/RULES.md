# Reglas implementadas

Fuentes: el reglamento 2.4 en español (manda sobre las demás), el reglamento v1.5 de Grey Gnome Games, el resumen
publicado de la edición actual y el texto impreso de cada carta. Donde el reglamento y una carta se contradicen, manda la
carta. Las cifras están cubiertas por `tests/`.

## Preparación
Se toman los marcadores del héroe (salud, energía, raciones, oro) y su equipo inicial. Con el oro inicial se puede
comprar más equipo del mazo *Equipo* (recomendado). Las 12 fichas de bendición se barajan boca abajo
(caras: 5 de salud, 5 de energía, 2 de curar el veneno).

## Nivel y turno
Cada nivel tiene **8 turnos** (el mazo de mazmorra de 16 cartas se roba de dos en dos). Turno:
1. Robar 2 cartas boca abajo.
2. Revelar una. Se puede **afrontar** (parte 1) y la otra se descarta sin mirar, o **descartar** y resolver la otra
   obligatoriamente con su **parte 2**.
3. Entre turnos se puede equipar, comer una ración (+1 energía) y aprender habilidades; nunca durante una carta.

Cartas de mazmorra (parte 1 / parte 2): Emboscada ×2 (iniciativa / daño inicial +nivel, salud +nivel+4), Tesoro ×2
(1 de oro / botín y poción), Laberinto (1 ración / 2), Plantación de Setas (1 / 2 raciones), Trampa de Flechas ×2
(1 / 2 de veneno), Escaramuza ×3 (salud +nivel+2 / +4), y las narrativas Campamento, Mercader, Altar, Claro ×2.

## Combate
1. Salud del enemigo = salud de la carta + nivel + ajuste de la carta de mazmorra (se muestra con dados d12).
2. **Daño inicial** (salvo emboscada del héroe): 2d6, mayor − menor + daño base (+ajustes) − armadura. **Dobles: falla.**
3. **Turno del héroe**: gasta 0–3 de energía, 1d6 por ficha (hace falta arma en la mano principal o a dos manos).
   Sin energía, puñetazo de 1 (2 con Artes Marciales). Suma bonificaciones del arma. Pociones ofensivas y armas
   arrojadizas sustituyen al ataque.
4. **Contraataque** con la misma fórmula; se alterna hasta que uno cae.
5. **Botín**: tesoro 0 nada · **1 una carta de botín o una moneda de oro, a elegir** (reglamento 2.4, p. 14) ·
   2 botín + poción (sin elegir) · bolsa de oro. El enemigo va al cementerio. Con el Líder Llameante la elección de
   tesoro 1 incluye una poción; elegir botín respeta el Amuleto de la Suerte y la compra de artefactos.

Poderes de enemigos (texto literal de la carta) y poderes de objetos están en `js/data/pack-fx.js`.
Debilidades (fuego / hielo / no muerto) dan bonificación con armas y pociones específicas.

## Fin de nivel (en este orden)
1. Se baraja el mazo de mazmorra. 2. Se come una ración, o se pierden 3 de salud. 3. Por cada 2 de veneno se gana 1.
4. El peón sube un nivel (máx. 5). 5. Se roba y resuelve una trama. Tras el nivel 5 el jefe aparece aunque no
haya 10 ojos.

## Tramas y moral
Cada trama suma 1–3 ojos (los minijefes de Beasts & Burdens, 4). Al llegar a **10 ojos** se termina de resolver la
trama y empieza la secuencia final. Las elecciones suben/bajan el marcador de moral (−5…+5).

## Jefe final
1. El jefe lo determina la **debilidad más común** de tus enemigos derrotados; empates: Fuego > No muerto > Hielo > Fuego.
   Las campañas fijan su propio jefe.
2. **Visita divina**: se voltean todas las bendiciones (salud, energía, o curar todo el veneno).
3. Se combate como contra cualquier enemigo.

## Puntuación (fondo de jubilación)
1 por salud y energía restantes · 3 por oro · 2 por enemigo derrotado · valor de los objetos · nivel × 2 · moral.
0–30 Tugurio · 31–40 Cabaña · 41–50 Granja · 51–60 Mansión · 61+ Fortaleza.

Nota: el PDF v1.5 de greygnome.com difiere (7 turnos, 1 punto por enemigo); se sigue el reglamento 2.4 y las cartas.

## Equipo
Ranuras: **MP** mano principal · **OM** otra mano · **2M** dos manos · **CP** cuerpo · **CA** cabeza · **AC** accesorios
(ilimitados). No se puede superar la carga máxima: al pasarte hay que soltar objetos. Los objetos malditos (Yelmo del
Loco) no se quitan. Con *Doble Arma* una daga puede ir en la otra mano.

## Decisiones de interpretación
- **Alquimia** concede 2 pociones elegidas del mazo al empezar; robar pociones ofrece 2 cartas y te quedas con una.
- **Comer una ración entre turnos** da +1 de energía (reglamento); en el Campamento, +3.
- Las **tramas de campaña** sustituyen a las del juego base indicadas en la carta de la aventura.
- Cuando se da la opción de evitar un enemigo pagando (oro/raciones), se pregunta antes del combate.
- **Cetrería** (Qara): la tirada al inicio de cada nivel se hace automáticamente.
- La **Poción de Suerte** puede relanzar los dados del ataque del héroe o los de un ataque enemigo (antes de aplicar su daño).
- Textos de carta con erratas de imprenta se conservan tal cual en los datos.

- **Tesoro tipo 1**: se pregunta siempre (`choice`, escena `generic`, `treasure:1`): botín, 1 de oro (o poción con el Líder
  Llameante). La moneda elegida cuenta para Cazadora de Tesoros.
- **Puntuación**: se aplica el reglamento 2.4 (p. 18): nivel de mazmorra × 2.

## Expansiones: reglas e interpretaciones

### Generales
- El **"NIVEL n"** de una carta de campaña es el *nivel de la aventura* (dificultad), no el nivel inicial de la mazmorra:
  se guarda en `s.adventureLevel` (1 en el juego base) y solo lo usan los Encuentros Aleatorios. El peón empieza en 1.
- Las cartas retiradas por una campaña se resuelven por **nombre** de la carta de campaña ("Goblins" → E1, "Orcos" →
  E7…); un test comprueba que coinciden con `PACKS.remove`.
- **El Torreón de Zogar** añade siempre Bestias y Trabas (aflicciones incluidas).
- El equipo y las habilidades iniciales de un héroe se buscan por nombre en **todas** las expansiones (también las no
  activas); si su mazo no está en juego la carta se crea como objeto propio del héroe (no entra en ningún mazo).
- "Destruir" un objeto (Dragón de Cristal, Elemental de Fuego) lo saca de la partida; "descartar" lo deja en su descarte.
- Las reacciones a un ataque enemigo (Poción de Suerte, Daga de la Luna, Capa de Lana, Ajo) se ofrecen tras ver la
  tirada y solo si el ataque va a hacer daño.
- Un Mimético destapado al cobrar el botín de un enemigo se combate antes de terminar ese cobro (se corrigió un fallo
  por el que un minijefe así derrotado no llegaba a la pila de tramas ni daba sus ojos).

### Campañas
- **Galnok**: con dobles no falla; el impacto es el valor de uno de los dados + su daño − armadura.
- **Malicia**: daño = su daño impreso (4) + tu posición efectiva en el control de moral (−5…+5; nunca menos de 0).
  Interpretación: el refugio castiga la virtud, igual que sus Guerreros y Sacerdotes Malditos castigan las bendiciones.
- **Zogar** (`weakness:"*"`, no cuenta para el recuento de debilidades): inmune a ataques **sagrados, de fuego y de
  hielo**. No se ofrecen contra él Esquirla de Hielo, Bomba de Mecha ni Agua Bendita (y por tanto tampoco cuentan sus
  potenciadores: Tomos, Báculo, Mortero); la Espada Ardiente pierde su parte de fuego (sus 6 valen 6); la Granada de Mano
  Sagrada y la Poción de la No Muerte no le afectan. Las armas físicas (también arrojar la Quebradora de Hielo, que es un
  arma *contra* el hielo) le dañan con normalidad; las bonificaciones por debilidad nunca aplican. Cada vez que saca
  dobles (falla igualmente) pierdes 2 de energía.
- **Dragón de Cristal**: con 8+ de daño final eliges qué objeto equipado (manos, cabeza, cuerpo o accesorio) se destruye.
- **Daga de la Luna** es una daga (Sombra, Doble Arma) pero no relanza 6 (no lo dice la carta).
  **Aguijón de Grasgol** cuenta como arco (Tiro con Arco).
- **Sexto Sentido**: un solo uso por nivel compartido entre "evitar una emboscada" y "revelar ambas cartas".
- **Correr**: d6 → 1-2 la mitad de tu energía (redondeo hacia abajo), 3-4 una, 5-6 nada. Se puede usar sobre la carta
  revelada (la otra se descarta sin mirar), en cualquier combate de mazmorra y sobre la segunda carta obligada.
- **Drenaje Vital**: una vez por combate, antes del daño inicial; un único d6 da el daño y la salud. Su portador no gana
  nunca fichas de bendición.
- **Látigo**: si al menos dos dados coinciden (2+ dados) atacas de nuevo sin contraataque (pagando el nuevo ataque).
- **Bastón del Cuervo**: cada vez que fueras a ganar veneno eliges veneno o la misma salud.
- **Petaca**: se rellena sola al llegar a un Campamento. **Mortero y Maja** y **Matilda** suman a la Poción de Salud.
- **Escudo de Drenaje**, **Aguijón**, **Drenaje Vital** y la **Granada** son opciones previas al daño inicial (`pre`).
- **Máscara de Mizlak**/**Capa de Cultista** miran la salud base impresa y no sirven contra jefes.
- Tramas: **Venganza** considera "mimético normal" al Mimético del juego base (L8); **El Pináculo** con moral 0 no hace
  nada; **La Pendiente** se repite a voluntad hasta sacar un 6; **La Estatua con Alas** usa la moral efectiva;
  **Columna de Fuego** da el oro de la bolsa del enemigo descartado (va al descarte de enemigos); **El Viejo Libro** da una
  habilidad aleatoria del mazo; **El Viejo Puente** no hace nada si ya llevas 8 o menos; **El Maligno** permite un cambio.

### Terreno y Reliquias
- El entorno se roba al empezar cada nivel (si el mazo se agota se baraja el descarte) y dura hasta el siguiente: el jefe
  que aparece tras el nivel 5 se enfrenta con el entorno del nivel 5. Sus efectos valen para todos los combates del nivel
  (jefe incluido) y para las cartas de mazmorra de ese tipo (también las de Howling). Texto azul / ojo de Las Miradas: al
  robarlo (ese ojo puede despertar al jefe).
- La Sombra obliga a resolver la Emboscada revelada como parte 2; en Túnel Abandonado el Mercader se resuelve como la
  Emboscada del mazo en uso y con la misma parte; en Las Catacumbas el Altar no tiene efecto.
- **Artefactos**: cada vez que el juego te manda robar una carta de botín (tesoro de enemigos, Tesoro, tramas) y tienes
  bendiciones suficientes puedes pagar `artefactos comprados + 1` para robar uno aleatorio. No aplica a "roba N y quédate
  con una", al bazar ni al Diario. Los artefactos descartados van a su propio descarte. Con Realms la Cápsula Corazón de
  The Fanny Pack pasa al mazo de artefactos. Cinturón de Ogro: se decide tras la tirada (+2 por energía gastada).
  Portador del Destino: n dados cuestan n+1 de salud y no puedes quedarte a 0. La Seta Dorada sustituye a la acción del
  Campamento.

### Posada del Troll Solitario
- Los esbirros se contratan en la preparación (la Posada); máximo **3** (el reglamento no fija límite: decisión de
  diseño). La moral se restaura a 1 de oro por punto en la preparación y entre turnos (Matilda no).
- **Con moral 0 un esbirro te abandona** (sale de la partida). Eydis (moral 1) se va si no le pagas 1 de oro al final del
  nivel (se pregunta; sin oro se va). Borko come después que tú; si no queda ración pierde 1 de moral.
- Sus acciones de Campamento son automáticas y se suman a la tuya. Matilda pierde moral con cada pérdida de 3+ de salud
  que no sea un coste voluntario; Bogdana con cada combate contra salud base 5+; Olive al derrotar salud base 6+; Yak al
  empezar un combate contra un no muerto; Godfrey al derrotar a un enemigo que no es no muerto (y desactiva las opciones de
  trama que bajan la moral). Farzad te deja elegir si ignoras el Laberinto.

### The Howling Abyss (módulo exclusivo: sustituye el mazo de mazmorra)
- 18 cartas, niveles de 8 turnos; las 2 que sobran vuelven al barajar. Encuentro Salvaje: las trampas cuentan como la
  menor salud; en empate eliges (`pickCards`). Mercader: bazar fijo de 3 botines y 2 pociones; Comerciar exige que el
  objeto entregado valga **más** que el recibido y lo deja en el bazar.

### Iron Chest (Encuentros Aleatorios)
- Mapa = una de las dos copias del nivel de la aventura. El icono del tramo se resuelve tras la trama de fin de nivel y
  antes de empezar el siguiente (no hay tramo tras el nivel 5). ENEMIGO sin bonificaciones de salud ni de daño inicial;
  Cadáver = una carta aleatoria del mazo de Equipo.

### Gnome Pack #1
- `Game.create({ heroId: 'custom', config: { …, custom: { race, klass, sign, skill, equipment, equipment2?, potion? } } })`
  (activa el módulo `gnome`). Nombres literales de las cartas, con comparación tolerante a artículos y género
  ("Cazador de Tesoros" = Cazadora de Tesoros, "Zurrón del Alquimista"). "2 de Oro" = +2 de oro.
- Humano: `equipment2` debe costar exactamente 1. Gnomo: `potion` o, si no, elige al empezar. Kroling: una vez por nivel
  ataca pagando salud (n dados = n de salud) y +1 bendición si ese ataque mata. Mediano: +1 ración inicial y +1 de salud por
  ración ganada. Semiorco: evita gratis orcos, grunkles y goblins (no jefes). Enano, Elfo y Tritón según su carta.
- **Mizlak el Mendigo**: +10 puntos solo si ganas (`score().parts.bonus`).
