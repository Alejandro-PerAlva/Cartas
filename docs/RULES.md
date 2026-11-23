# Reglas implementadas

Fuentes: el reglamento v1.5 de Grey Gnome Games (greygnome.com), el resumen publicado de la edición actual y el
texto impreso de cada carta. Donde el reglamento y las cartas se contradicen, manda la carta. Las cifras están cubiertas por `tests/`.

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
5. **Botín**: tesoro 0 nada · 1 botín · 2 botín + poción · bolsa de oro. El enemigo va al cementerio.

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
1 por salud y energía restantes · 3 por oro · 1 por enemigo derrotado* · valor de los objetos · nivel · moral.
0–30 Tugurio · 31–40 Cabaña · 41–50 Granja · 51–60 Mansión · 61+ Fortaleza.

\* **Discrepancia entre fuentes**: el PDF v1.5 de greygnome.com dice 1 punto por enemigo (y 7 turnos, y un mazo de 14
cartas), mientras que el resumen publicado de la edición actual (8 turnos, mazo de 16 cartas, 2 puntos por
enemigo) coincide con las cartas impresas que usa este proyecto. Se ha implementado la edición actual (2 puntos).
La constante está en `Game.score()` por si se prefiere el valor antiguo.

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
