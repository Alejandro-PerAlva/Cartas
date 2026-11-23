/**
 * Posición del peón de nivel sobre cada carta de mapa. Cada campaña trae SU mapa y las salas 1-5 están en sitios
 * distintos: las coordenadas son el centro del número rojo de cada sala (píxeles de la carta 480×675 → fracción),
 * medidas con `tools/analyze_maps.py` sobre las imágenes reales.
 */
const px = (list) => Object.fromEntries(list.map(([x, y], i) => [i + 1, [+(x / 480).toFixed(4), +(y / 675).toFixed(4)]]));

export const MAP_SPOTS_BY_IMG = {
  'expansions/warren/card_011.jpg': px([[198, 107], [365, 310], [119, 314], [145, 562], [363, 512]]),
  'expansions/blackened/card_011.jpg': px([[148, 566], [376, 514], [361, 224], [165, 120], [179, 334]]),
  'expansions/galnok/card_011.jpg': px([[153, 102], [384, 130], [385, 544], [124, 545], [182, 323]]),
  'expansions/crystal/card_011.jpg': px([[148, 532], [354, 505], [353, 246], [146, 167], [225, 374]]),
  'expansions/throne/card_011.jpg': px([[128, 115], [364, 120], [380, 268], [157, 296], [267, 504]]),
  'expansions/malicia/card_011.jpg': px([[172, 103], [369, 105], [174, 298], [145, 570], [395, 326]]),
};

/** posiciones del peón de nivel para el mapa activo (el del juego base si la campaña no trae el suyo) */
export const mapSpotsFor = (cat) => MAP_SPOTS_BY_IMG[cat.mapImg] || cat.mapSpots;
