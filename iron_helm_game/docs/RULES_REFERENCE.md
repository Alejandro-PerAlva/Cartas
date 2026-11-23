# Referencia de Reglas Oficiales - Iron Helm

Este documento resume las reglas del reglamento oficial versión 2.4 incluidas en el motor digital.

---

## 1. El Bucle de Exploración (Push-Your-Luck)
* Cada nivel de mazmorra consta de **8 turnos** (16 cartas en total).
* En cada turno se extraen **2 cartas boca abajo**:
  1. Se voltea la **Carta 1**.
  2. El jugador puede:
     * **Aceptar la Carta 1:** Se resuelve de inmediato (Opción 1 en cartas Tipo 2). La Carta 2 se descarta boca abajo sin mirar.
     * **Rechazar la Carta 1:** Se descarta la Carta 1. Se revela la Carta 2 y se está **obligado** a resolverla (Opción 2 en cartas Tipo 2).

---

## 2. Tipos de Cartas de Mazmorra
* **Tipo 1 (Narrativas / Interactivas):**
  * *Campamento:* Cocinar ración (+3 Energía), Descanso (+2 Salud, +1 Energía) o Registrar (robar botín).
  * *Altar:* Plegaria (+1 Bendición) o Purificación (cura 1d6 de veneno).
  * *Claro:* Roba y resuelve 1 carta de Trama de inmediato.
  * *Mercader:* Compra y venta de objetos.
  * *Fuente:* Curación de Salud o Energía.
* **Tipo 2 (Divididas en Opción 1 y Opción 2):**
  * La **Opción 1** (arriba) se aplica si se aceptó como primera carta revelada.
  * La **Opción 2** (abajo) se aplica si fue forzada como segunda carta (suele acarrear emboscadas enemigas o trampas activadas).

---

## 3. Combate y Tiradas de Dados
1. **Salud del Enemigo:**
   * Salud Base de la carta + modificador de la carta de mazmorra (nivel actual o nivel + bonos).
2. **Daño Inicial del Enemigo:**
   * Tirada de **2d6**: se resta el menor del mayor (`|d1 - d2|`).
   * **¡DOBLES!:** Si los dados son iguales (ej. [3, 3] o [5, 5]), el enemigo **falla por completo** su ataque.
   * Si no hay dobles: `Daño = |d1 - d2| + Daño Base Enemigo + Modificador Mazmorra - Armadura del Jugador`.
3. **Turno de Ataque del Jugador:**
   * El jugador decide gastar entre **0 y 3 puntos de Energía**:
     * 0 Energía (o desarmado): 1 punto de daño fijo (puñetazo).
     * 1 a 3 Energía: Lanza de 1 a 3 dados d6 sumando sus valores + bonificador de arma + bonos de habilidad/debilidad.
4. **Contraataque del Enemigo:**
   * Si el enemigo sobrevive, ataca usando la misma fórmula de 2d6 con dobles fallidos.
5. **Victoria y Botín:**
   * Tipo 0: No otorga botín.
   * Tipo 1: Otorga carta de botín u oro.
   * Tipo 2: Otorga carta de botín y carta de poción.
   * El enemigo pasa al **Cementerio**.

---

## 4. Fin de Nivel de Mazmorra
Al agotarse el mazo de 16 cartas:
1. **Alimentación:** Gasta 1 Ración. Si no tienes, sufres **3 puntos de daño** por inanición.
2. **Veneno:** Por cada 2 fichas de veneno actuales, ganas **1 ficha adicional**. (Si el veneno iguala o supera tu salud actual, mueres al instante).
3. **Carta de Trama:** Roba la carta superior del mazo de Tramas. Suma sus iconos de ojo.
4. **Comprobación de Jefe:** Si tienes **10 iconos de ojo** o alcanzas el nivel 5, se activa el combate contra el Jefe Final.
5. **Avance:** Sube 1 nivel de mazmorra y se vuelve a barajar el mazo.

---

## 5. El Jefe Final y Presencia Divina
1. **Presencia Divina:** Justo antes de luchar contra el Jefe, todas las fichas de Bendición acumuladas se revelan: otorgan salud, energía y purgan todo el veneno.
2. **Determinación del Jefe (Juego Base):**
   * Se cuentan las debilidades de los monstruos en el Cementerio: No Muerto, Hielo o Fuego.
   * El tipo predominante determina el jefe:
     * Hielo $\rightarrow$ **Merodeador** (Salud 22, Daño 5, ignora escudos).
     * Fuego $\rightarrow$ **Naga** (Salud 21, Daño 3, inyecta veneno).
     * No Muerto $\rightarrow$ **Lich** (Salud 20, Daño 4, drena energía).
   * Desempate: Fuego vence a No Muerto, No Muerto vence a Hielo, Hielo vence a Fuego.

---

## 6. Puntuación Final y Jubilación
* +1 pt por cada punto de Salud y Energía restantes.
* +3 pts por cada Moneda de Oro.
* +2 pts por cada enemigo en el Cementerio.
* +Valor de compra de todo el equipamiento y pociones.
* +Nivel de Mazmorra x 2.
* +/- Posición en el Control de Moral.
* **Rangos de Jubilación:**
  * 0 - 30 pts: **Tugurio**
  * 31 - 40 pts: **Cabaña**
  * 41 - 50 pts: **Granja**
  * 51 - 60 pts: **Mansión**
  * 61+ pts: **Fortaleza**
