/**
 * Geometría de la mesa (coordenadas de mesa en píxeles, antes de la cámara).
 *
 * La mesa tiene DOS tableros, uno junto al otro, y la cámara se desliza entre ellos (pestañas):
 *   · Mazmorra  → tapete oficial de mazmorra (+ franja de expansiones si hace falta).
 *   · Personaje → tapete oficial del personaje y panel del aventurero (compañeros, aflicciones, SOLTAR).
 * La mochila no ocupa tablero: es una bandeja (`Tray`, app.js) que se abre desde el botón MOCHILA en ambas pestañas.
 * Los huecos salen del arte oficial de los tapetes (tools/analyze_mats.py).
 *
 * `L` es un objeto mutable que `configureLayout()` rellena al empezar cada partida.
 */
const CS = 1175 / 1900;            // escala del tapete de personaje
export const CARD_D = { w: 200, h: 281 };   // carta sobre el tapete de mazmorra
export const CARD_C = { w: 172, h: 242 };   // carta sobre el tapete de personaje
export const CARD_X = { w: 150, h: 211 };   // carta en la franja de expansiones
export const BOARD_H = 1275;

/** Huecos del tapete de mazmorra (coordenadas mostradas 2000×1175) */
const D = {
  plots: [55, 55, 260, 340], potions: [295, 55, 500, 340], loot: [535, 55, 740, 340], enemies: [775, 55, 980, 340],
  plotsUsed: [55, 375, 260, 660], potionsUsed: [295, 375, 500, 660], lootUsed: [535, 375, 740, 660], graveyard: [775, 375, 980, 660],
  trappings: [1495, 55, 1700, 340], skills: [1735, 55, 1940, 340],
  map: [1495, 375, 1700, 660], morality: [1735, 375, 1940, 660],
  // las 4 puertas verdes (la puerta decorada de la izquierda no se usa): descarte · mazo (la más iluminada) · las dos cartas del turno, hacia la derecha
  ddiscard: [530, 801, 740, 1081], dungeon: [775, 801, 980, 1081], door1: [1015, 801, 1220, 1081], door2: [1255, 801, 1460, 1081],
  rubble: [1580, 735, 1900, 1100],
};
/** Huecos del tapete de personaje (coordenadas originales 1199×1900) */
const C = {
  // la fila superior: el hueco real del arte queda ~30 px (originales) más abajo que el centro del rectángulo
  hero: [92, 196, 385, 671], head: [452, 196, 750, 671], skills: [815, 196, 1110, 671],
  main: [92, 710, 385, 1115], body: [452, 710, 750, 1115], off: [815, 710, 1110, 1115], acc: [92, 1185, 385, 1590],
};
/** Pocillos de fichas del tapete de mazmorra (la RESERVA), centro y radio en coords mostradas */
const W = { gold: [1228, 98, 42], poison: [1085, 193, 42], health: [1385, 193, 42], blessing: [1230, 240, 58], ration: [1130, 365, 38], energy: [1330, 365, 38] };
/** Pocillos del tapete de personaje (fichas del héroe) */
const CW = { gold: [88, 88], poison: [236, 88], ration: [406, 90], blessing: [590, 88], energy: [758, 90], health: [906, 90] };

export const L = { ZONES: {}, WELLS: {}, CWELLS: {}, BOARDS: {}, FOCUS: {}, TABLE: { w: 0, h: 0 }, DMAT: null, CMAT: null, SIDE: null, EXTRAS: null };

export function configureLayout({ extras = false, side: withSide = false } = {}) {
  const extraW = extras ? 300 : 0;
  const dungeon = { x: 0, y: 0, w: 2110 + extraW, h: BOARD_H };
  const cmatW0 = Math.round(1199 * CS);
  const char = { x: dungeon.w + 260, y: 0, w: withSide ? 1300 : cmatW0 + 100, h: BOARD_H };
  const dmat = { x: dungeon.x + 60, y: 50, w: 2000, h: 1175, img: 'assets/mats/iron_helm_mat_web.jpg' };
  const cmatW = Math.round(1199 * CS);
  const cmat = { x: char.x + 50, y: 50, w: cmatW, h: 1175, img: 'assets/mats/personaje_mat_web.jpg' };
  const rect = (m, x0, y0, x1, y1, k = 1) => ({ x: m.x + x0 * k, y: m.y + y0 * k, w: (x1 - x0) * k, h: (y1 - y0) * k });

  const ZONES = {};
  const K = 1; // el tapete de mazmorra se dibuja a escala 1 (2000×1175)
  for (const [k, v] of Object.entries(D)) ZONES[k] = { ...rect(dmat, ...v, K), mat: 'd' };
  for (const [k, v] of Object.entries(C)) ZONES['c_' + k] = { ...rect(cmat, ...v, CS), mat: 'c' };

  // panel lateral derecho: solo si hay esbirros o aflicciones que mostrar (expansiones); la ficha del aventurero ya está en la barra superior
  let side = null;
  if (withSide) {
    side = { x: cmat.x + cmat.w + 36, y: 50, w: char.x + char.w - (cmat.x + cmat.w + 36) - 50, h: 1175 };
    ZONES.side = { ...side, mat: 'c' };
    ZONES.mercs = { x: side.x + 20, y: side.y + 96, w: side.w - 40, h: 330, mat: 'c' };
    ZONES.afflictions = { x: side.x + 20, y: side.y + 500, w: side.w - 40, h: 190, mat: 'c' };
  }
  // zona de soltar objetos: la reja de hierro del tapete de personaje (aparece solo mientras se arrastra un objeto)
  ZONES.trash = { ...rect(cmat, 596, 1196, 978, 1604, CS), mat: 'c' };

  // franja de expansiones (tablero de mazmorra)
  const strip = { x: dmat.x + dmat.w + 40, y: 50, w: extraW - 40 - 20, h: 1175 };
  ZONES.strip = { ...strip, mat: 'd' };
  const sx = strip.x + (strip.w - CARD_X.w) / 2;
  ZONES.x_boss = { x: sx, y: strip.y + 75, w: CARD_X.w, h: CARD_X.h, mat: 'd' };
  ZONES.x_env = { x: sx, y: strip.y + 75 + 232, w: CARD_X.w, h: CARD_X.h, mat: 'd' };
  ZONES.x_art = { x: sx, y: strip.y + 75 + 464, w: CARD_X.w, h: CARD_X.h, mat: 'd' };
  ZONES.x_aff = { x: sx, y: strip.y + 75 + 696, w: CARD_X.w, h: CARD_X.h, mat: 'd' };
  ZONES.x_enc = { x: sx - 8, y: strip.y + 75 + 932, w: CARD_X.w + 16, h: 120, mat: 'd' };

  const WELLS = {}; for (const [k, [x, y, r]] of Object.entries(W)) WELLS[k] = { cx: dmat.x + x, cy: dmat.y + y, r };
  const CWELLS = {}; for (const [k, [x, y]] of Object.entries(CW)) CWELLS[k] = { cx: cmat.x + x * CS, cy: cmat.y + y * CS, r: 36 };

  const FOCUS = {
    dungeon: { ...dungeon },
    dungeonMat: { x: dmat.x, y: dmat.y, w: dmat.w, h: dmat.h },
    // las puertas están a la derecha: descarte · mazo · puerta 1 · puerta 2 (x 530 → 1460 del tapete)
    doors: { x: dmat.x + 505, y: dmat.y + 690, w: 980, h: 490 },
    doorsP: { x: dmat.x + 750, y: dmat.y + 690, w: 735, h: 490 },
    char: { ...char },
    charMat: { x: cmat.x - 10, y: cmat.y, w: cmat.w + 20, h: cmat.h },
    charTop: { x: cmat.x - 10, y: cmat.y, w: cmat.w + 20, h: Math.round(cmat.h * 0.64) },   // héroe, habilidades y equipo (lo que más se usa en pantallas bajas)
  };
  Object.assign(L, { ZONES, WELLS, CWELLS, FOCUS, DMAT: dmat, CMAT: cmat, SIDE: side, EXTRAS: strip, extras: !!extras,
    BOARDS: { dungeon, char }, TABLE: { w: char.x + char.w + 60, h: BOARD_H + 20 } });
  return L;
}
configureLayout({ extras: false });

/** centro de una zona */
export const center = (z) => ({ x: z.x + z.w / 2, y: z.y + z.h / 2 });
/** rectángulo de carta de tamaño `size` centrado en una zona */
export function cardRect(zoneName, size, dx = 0, dy = 0) {
  const z = L.ZONES[zoneName];
  const s = size || (z.mat === 'd' ? CARD_D : CARD_C);
  const c = center(z);
  return { x: c.x - s.w / 2 + dx, y: c.y - s.h / 2 + dy, w: s.w, h: s.h };
}
export const hit = (zoneName, x, y) => { const z = L.ZONES[zoneName]; return !!z && x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h; };
