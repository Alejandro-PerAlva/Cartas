# Guía de Debugging y Trampas de Prueba - Iron Helm

Esta guía describe cómo utilizar el sistema de depuración integrado para probar mecánicas, reproducir comportamientos y verificar correcciones rápidamente.

---

## 1. Atajos de Teclado Rápidos

* **Tecla `D`**: Abre o cierra la **Consola Flotante de Debug**.
* **Tecla `L`**: Abre o cierra el **Drawer de Registro de Eventos (Logs)**.
* **Tecla `M`**: Silencia o reactiva los efectos de sonido procedimentales.

---

## 2. Consola de Debugging (Botón `🐞 DEBUG`)

Al hacer clic en el botón inferior derecho o pulsar la tecla `D`, se despliega un panel con las siguientes herramientas:

### A. Modificadores Inmediatos del Héroe
* **`+5 Salud` / `-5 Salud`**: Ajusta la vida actual del personaje.
* **`+5 Energía`**: Otorga energía inmediata para lanzar dados máximos en combate.
* **`+5 Oro`**: Añade oro para probar la compra de equipo y puntuación final.
* **`+2 Raciones`**: Añade comida para evitar la inanición al final del piso.
* **`+1 Veneno` / `Curar Veneno`**: Para probar la progresión de veneno y la muerte por toxicidad.
* **`+1 Bendición`**: Añade fichas de bendición para probar la Presencia Divina previa al Jefe.
* **Checkbox `Modo Dios`**: Vuelve al héroe completamente inmune al daño y no consume energía al atacar.

### B. Spawners y Control de Mazmorra
* **`👑 Despertar Jefe Final`**: Salta directamente al combate contra el Jefe Final correspondiente según el recuento del cementerio o la campaña activa.
* **`🪜 Siguiente Piso (+1)`**: Avanza de nivel de mazmorra (1 a 5) reiniciando el mazo.
* **`🏪 Abrir Mercader`**: Despliega la tienda errante inmediatamente.
* **`🎁 Robar Botín` / `🧪 Robar Poción`**: Otorga una carta aleatoria a la mochila.
* **`💀 Matar Enemigo Actual`**: Elimina de un golpe al enemigo activo para verificar recompensas y cementerio.
* **Selector `Generar Enemigo Específico`**: Permite elegir cualquier monstruo del catálogo y comenzar un combate directo contra él.

### C. Inspector de Mazmorra
* Muestra en tiempo real el número de cartas restantes en el mazo y las **próximas cartas en cola** para saber qué saldrá a continuación.

---

## 3. Panel de Registro de Eventos (`📜 Registro`)

Ubicado en la esquina inferior izquierda (o tecla `L`). Registra cada suceso con marca de tiempo y categoría:
* **Filtros disponibles:** `Todos`, `Combate`, `Exploración`, `Inventario`, `Debug`.
* En la categoría **Combate**, desglosa la matemática exacta de cada tirada:
  `[COMBAT] Goblin Berserker ataca [5, 2 -> dif 3] + daño base 2 = 5. Armadura reduce 1. Sufres 4 de daño.`
