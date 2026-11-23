# Guía de Expansiones y Campañas - Iron Helm Digital

Este documento explica cómo están estructuradas las 15 expansiones oficiales y la expansión fanmade *Anemia*, y cómo añadir nuevas cartas o reglas al registro modular.

---

## 1. Registro Central de Expansiones (`expansions.js`)

Cada expansión se define en `js/data/expansions.js` con su identificador, nombre, tipo y comportamiento:

```javascript
{
  id: 'warren',
  name: '01. Warren of Despair',
  type: 'CAMPAIGN', // 'CAMPAIGN' | 'MODULAR' | 'FANMADE'
  bossId: 'vermin_king',
  description: 'Desciende a la madriguera infestada...',
  cardDir: 'assets/cards/expansions/warren'
}
```

---

## 2. Tipos de Expansiones

### A. Campañas de Aventura Independientes (`type: 'CAMPAIGN'`)
Modifican el objetivo final y el entorno:
* Reemplazan o fijan al **Jefe Final** con un encuentro temático (ej. el Rey de las Alimañas en *Warren of Despair*, el Señor de las Ascuas en *Throne of Embers* o la Sombra del Abismo en *The Howling Abyss*).
* Permiten seleccionar héroes exclusivos asociados a esa aventura (como *Rhae*).

### B. Expansiones Modulares de Contenido (`type: 'MODULAR'`)
Se pueden activar individualmente junto con el Juego Base o cualquier Campaña en el menú "Sandbox Modular":
* **Loot & Lore:** Inyecta armas arcanas y tesoros raros en el mazo de botín.
* **The Fanny Pack:** Introduce el objeto *Riñonera* (Accesorio que aumenta la carga máxima en +2).
* **Beasts & Burdens:** Añade criaturas letales con efectos de calor y veneno, y cartas de carga.
* **Realms & Relics:** Añade reliquias legendarias y altares avanzados.
* **The Lonely Troll Inn:** Añade la fase de preparación en la posada previa al descenso.
* **Iron Chest & Gnome Pack:** Equipamiento defensivo de refuerzo y cartas promocionales.

### C. Expansión Fanmade "Anemia" (`type: 'FANMADE'`)
* Basada en el reglamento de la comunidad v4.0.
* Añade cartas de aflicción severa, sangrado y mayores exigencias de supervivencia alimentaria.

---

## 3. Cómo Añadir Nuevo Contenido o Expansiones

1. **Añadir el registro:** Agrega el objeto con su `id` y `type` en `js/data/expansions.js`.
2. **Añadir cartas o monstruos:**
   * Si añade enemigos: defínelos en `js/data/enemies.js` indicando `expansion: '<id>'`.
   * Si añade equipamiento: agrégalo a `js/data/equipment.js` con `expansion: '<id>'`.
   * Si añade un Jefe: defínelo en `js/data/bosses.js`.
3. **Colocar los assets:** Coloca los JPEGs correspondientes en `assets/cards/expansions/<id>/card_XXX.jpg`.
