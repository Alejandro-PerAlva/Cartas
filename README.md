# Iron Helm Digital - Simulador Tabletop Web

![Iron Helm Digital](iron_helm_game/assets/cards/card_base_000.jpg)

**Iron Helm Digital** es una adaptación web integral, inmersiva y de alta fidelidad del célebre juego de mesa en solitario ***Iron Helm*** (diseñado por Jason Glover / Grey Gnome Games).

Este simulador traslada al navegador la experiencia táctil de jugar en una mesa física, con cartas de dorso oficial, dados 3D con físicas sonoras, fichas de madera en pilas isométricas, abanico de mano desplegable y soporte completo para el Juego Base y todas sus expansiones.

---

## 🎮 Características Principales

* **Experiencia Tabletop Realista:**
  * Vista cenital limpia y ergonómica a pantalla completa (`100vh` sin desplazamientos innecesarios).
  * Montaje inicial de mesa con todos los mazos oficiales (Mazmorra, Enemigos, Botín, Tramas, Pociones, Manual).
  * Fichas de madera apiladas de Salud, Energía, Monedas de Oro, Raciones, Veneno y Bendición.
  * Cartas de seguimiento de Mazmorra con peón de plástico rojo animado que avanza con cada turno y piso.
  * Abanico de mano desplegable con curvatura trigonométrica para inspeccionar el inventario.
* **Mecánicas y Reglas Oficiales (Fidelidad 100%):**
  * Extracción de 2 cartas boca abajo: decide si revelar la primera o descartarla a ciegas para afrontar la segunda.
  * Motor de combate 2d6 con cálculo oficial de diferencia (mayor menos menor), pifias en dobles y penalizadores de armadura.
  * Gestión de carga/peso, hambre al finalizar piso, veneno y cálculo de puntuación final de jubilación.
* **Catálogo Completo y Expansiones:**
  * **Juego Base:** 5 Héroes oficiales (Fayon, Sortab, Zolla, Molclon, Uln-Rolk), 3 Jefes finales y catálogo completo de cartas.
  * **15 Expansiones Oficiales:** *Warren of Despair, Blackened Burrow, Galnok's Labyrinth, Crystal Caverns, Throne of Embers, Malicia's Refuge, The Spire of Zogar, Loot & Lore, Realms & Relics, The Lonely Troll Inn, The Fanny Pack, Beasts & Burdens, The Howling Abyss, Iron Chest, Gnome Pack #1*.
  * **Expansión Fanmade:** *Anemia 4.0* (vampirismo y mecánicas de sed de sangre).
* **Sintetizador de Audio Procedural:**
  * Efectos sonoros realistas generados en tiempo real con Web Audio API (barajado de naipes, dados rodando, tajos de espada, impacto de golpes, monedas de oro y rugidos).
* **Standalone y sin dependencias externas:**
  * Funciona directamente en cualquier navegador moderno abriendo `iron_helm_game/index.html`. No requiere servidor Node.js ni paquetes externos.

---

## 🚀 Inicio Rápido

1. Clona este repositorio:
   ```bash
   git clone https://github.com/Alejandro-PerAlva/Cartas.git
   ```
2. Entra en el directorio del juego:
   ```bash
   cd Cartas/iron_helm_game
   ```
3. Abre `index.html` en tu navegador favorito (o haz doble clic sobre el archivo). ¡Listo para jugar!

---

## 🕹️ Controles y Atajos de Teclado

| Tecla / Acción | Función |
| :--- | :--- |
| **Clic en Mazo de Mazmorra** | Extrae las 2 cartas del turno boca abajo sobre el tapete. |
| **Clic en Carta I** | Voltea la primera carta para descubrir el encuentro. |
| **Aceptar Carta I** | Afronta el evento o combate de la Carta I. |
| **Descartar y Pasar a Carta II** | Descarta la Carta I y revela forzosamente la Carta II. |
| **Barra Espaciadora** | Tirar los dados en combate / Confirmar acción principal. |
| **Tecla `I`** | Abrir o cerrar el abanico de cartas en mano. |
| **Tecla `L`** | Abrir el panel lateral de historial de eventos (Log). |
| **Tecla `D`** | Abrir consola de depuración y pruebas. |

---

## 📁 Estructura del Proyecto

```
Cartas/
├── README.md                     # Presentación del proyecto y guía rápida
├── .gitignore                    # Reglas de exclusión para git
├── bundle.py                     # Compilador standalone ES6 -> app.bundle.js
└── iron_helm_game/
    ├── index.html                # Punto de entrada de la aplicación
    ├── style.css                 # Hoja de estilos de ambientación de mazmorra
    ├── app.bundle.js             # Fichero distribuible autónomo compilado
    ├── js/                       # Código fuente modular
    │   ├── engine/               # Lógica de reglas pura (combate, mazmorra, inventario)
    │   ├── data/                 # Base de datos de cartas, héroes, expansiones y enemigos
    │   ├── ui/                   # Componentes visuales interactivos y dados 3D
    │   └── utils/                # Audio procedural y sistema de logging
    ├── assets/                   # Recursos visuales optimizados (cartas, fichas y tapetes)
    └── docs/                     # Documentación técnica completa
        ├── AUDITORIA_PROYECTO.md # Auditoría integral y cronología de iteraciones
        ├── ARCHITECTURE.md       # Arquitectura técnica detallada
        ├── RULES_REFERENCE.md    # Manual y compendio de reglas oficiales
        ├── DEBUG_GUIDE.md        # Guía de atajos y panel de depuración
        └── EXPANSIONS_GUIDE.md   # Guía de integración de expansiones
```

---

## 📚 Documentación Técnica Detallada

* Para consultar la auditoría completa de cambios, requerimientos e iteraciones del usuario:  
  👉 **[AUDITORIA_PROYECTO.md](iron_helm_game/docs/AUDITORIA_PROYECTO.md)**
* Para ver la arquitectura de software y flujo de datos:  
  👉 **[ARCHITECTURE.md](iron_helm_game/docs/ARCHITECTURE.md)**
* Para el reglamento completo de Iron Helm:  
  👉 **[RULES_REFERENCE.md](iron_helm_game/docs/RULES_REFERENCE.md)**

---

## 🛠️ Herramientas de Desarrollo

Si realizas cambios en los archivos modulares de `iron_helm_game/js/`, puedes recompilar el bundle unificado ejecutando:

```bash
python bundle.py
```

---

## ⚖️ Licencia y Créditos

* **Diseño original de Iron Helm:** Jason Glover / Grey Gnome Games.
* **Ilustraciones:** Jason Glover & Daniel F. Walthall.
* **Adaptación Digital Web:** Desarrollado como proyecto interactivo de simulación tabletop para uso personal y educativo.
