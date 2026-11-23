/**
 * Geometría de la mesa (coordenadas de mesa en píxeles, antes de la cámara).
 *
 * La mesa tiene DOS tableros, uno junto al otro, y la cámara se desliza entre ellos (pestañas):
 *   · Mazmorra  → tapete oficial de mazmorra (+ franja de expansiones si hace falta).
 *   · Personaje → mochila, tapete oficial del personaje y compañeros/aflicciones.
 * Los huecos salen del arte oficial de los tapetes (tools/analyze_mats.py).
 *
 * `L` es un objeto mutable que `configureLayout()` rellena al empezar cada partida.
 */
const CS = 1175 / 1900;            // escala del tapete de personaje
export const CARD_D = { w: 200, h: 281 };   // carta sobre el tapete de mazmorra
export const CARD_C = { w: 172, h: 242 };   // carta sobre el tapete de personaje
export const CARD_P = { w: 168, h: 236 };   // carta en la mochila
export const CARD_X = { w: 168, h: 236 };   // carta en la franja de expansiones
export const BOARD_H = 1275;

/** Huecos del tapete de mazmorra (coordenadas mostradas 2000×1175) */
const D = {
  plots: [55, 55, 260, 340], potions: [295, 55, 500, 340], loot: [535, 55, 740, 340], enemies: [775, 55, 980, 340],
  plotsUsed: [55, 375, 260, 660], potionsUsed: [295, 375, 500, 660], lootUsed: [535, 375, 740, 660], graveyard: [775, 375, 980, 660],
  trappings: [1495, 55, 1700, 340], skills: [1735, 55, 1940, 340],
  map: [1495, 375, 1700, 660], morality: [1735, 375, 1940, 660],
  dungeon: [150, 760, 390, 1115],
  door1: [530, 810, 740, 1090], door2: [775, 810, 980, 1090], door3: [1015, 810, 1220, 1090], door4: [1255, 810, 1460, 1090],
  rubble: [1580, 735, 1900, 1100],
};
/** Huecos del tapete de personaje (coordenadas originales 1199×1900) */
const C = {
  hero: [92, 165, 385, 640], head: [452, 165, 750, 640], skills: [815, 165, 1110, 640],
  main: [92, 710, 385, 1115], body: [452, 710, 750, 1115], off: [815, 710, 1110, 1115], acc: [92, 1185, 385, 1590],
};
/** Pocillos de fichas del tapete de mazmorra (la RESERVA), centro y radio en coords mostradas */
const W = { gold: [1228, 98, 42], poison: [1085, 193, 42], health: [1385, 193, 42], blessing: [1230, 240, 58], ration: [1130, 365, 38], energy: [1330, 365, 38] };
/** Pocillos del tapete de personaje (fichas del héroe) */
const CW = { gold: [88, 88], poison: [236, 88], ration: [406, 90], blessing: [590, 88], energy: [758, 90], health: [906, 90] };
export const BANK_TOTAL = { gold: 12, poison: 10, health: 18, blessing: 12, ration: 10, energy: 14 };

export const L = { ZONES: {}, WELLS: {}, CWELLS: {}, BOARDS: {}, FOCUS: {}, TABLE: { w: 0, h: 0 }, DMAT: null, CMAT: null, PACK: null, SIDE: null, EXTRAS: null };

export function configureLayout({ extras = false } = {}) {
  const extraW = extras ? 300 : 0;
  const dungeon = { x: 0, y: 0, w: 2110 + extraW, h: BOARD_H };
  const char = { x: dungeon.w + 260, y: 0, w: 2110, h: BOARD_H };
  const dmat = { x: dungeon.x + 60, y: 50, w: 2000, h: 1175, img: 'assets/mats/iron_helm_mat_web.jpg' };
  const cmatW = Math.round(1199 * CS);
  const cmat = { x: char.x + 872, y: 50, w: cmatW, h: 1175, img: 'assets/mats/personaje_mat_web.jpg' };
  const rect = (m, x0, y0, x1, y1, k = 1) => ({ x: m.x + x0 * k, y: m.y + y0 * k, w: (x1 - x0) * k, h: (y1 - y0) * k });

  const ZONES = {};
  const K = 1; // el tapete de mazmorra se dibuja a escala 1 (2000×1175)
  for (const [k, v] of Object.entries(D)) ZONES[k] = { ...rect(dmat, ...v, K), mat: 'd' };
  for (const [k, v] of Object.entries(C)) ZONES['c_' + k] = { ...rect(cmat, ...v, CS), mat: 'c' };

  // mochila (panel de madera a la izquierda del tapete de personaje)
  const pack = { x: char.x + 50, y: 50, w: 770, h: 1175 };
  ZONES.pack = { ...pack, mat: 'c' };
  ZONES.trash = { x: pack.x + 40, y: pack.y + pack.h - 150, w: pack.w - 80, h: 110, mat: 'c' };
  // panel lateral derecho (compañeros y aflicciones)
  const side = { x: cmat.x + cmat.w + 36, y: 50, w: char.x + char.w - (cmat.x + cmat.w + 36) - 50, h: 1175 };
  ZONES.side = { ...side, mat: 'c' };
  ZONES.mercs = { x: side.x + 20, y: side.y + 70, w: side.w - 40, h: 560, mat: 'c' };
  ZONES.afflictions = { x: side.x + 20, y: side.y + 700, w: side.w - 40, h: 420, mat: 'c' };

  // franja de expansiones (tablero de mazmorra)
  const strip = { x: dmat.x + dmat.w + 40, y: 50, w: extraW - 40 - 20, h: 1175 };
  ZONES.strip = { ...strip, mat: 'd' };
  const sx = strip.x + (strip.w - CARD_X.w) / 2;
  ZONES.x_env = { x: sx, y: strip.y + 120, w: CARD_X.w, h: CARD_X.h, mat: 'd' };
  ZONES.x_art = { x: sx, y: strip.y + 120 + 300, w: CARD_X.w, h: CARD_X.h, mat: 'd' };
  ZONES.x_aff = { x: sx, y: strip.y + 120 + 600, w: CARD_X.w, h: CARD_X.h, mat: 'd' };
  ZONES.x_enc = { x: sx - 8, y: strip.y + 120 + 900, w: CARD_X.w + 16, h: 120, mat: 'd' };

  const WELLS = {}; for (const [k, [x, y, r]] of Object.entries(W)) WELLS[k] = { cx: dmat.x + x, cy: dmat.y + y, r };
  const CWELLS = {}; for (const [k, [x, y]] of Object.entries(CW)) CWELLS[k] = { cx: cmat.x + x * CS, cy: cmat.y + y * CS, r: 36 };

  const FOCUS = {
    dungeon: { ...dungeon },
    dungeonMat: { x: dmat.x, y: dmat.y, w: dmat.w, h: dmat.h },
    doors: { x: dmat.x + 110, y: dmat.y + 690, w: 1440, h: 490 },
    doorsP: { x: dmat.x + 100, y: dmat.y + 690, w: 1000, h: 490 },
    char: { ...char },
    charMat: { x: cmat.x - 10, y: cmat.y, w: cmat.w + 20, h: cmat.h },
    charPack: { x: pack.x, y: pack.y, w: pack.w, h: pack.h },
  };
  Object.assign(L, { ZONES, WELLS, CWELLS, FOCUS, DMAT: dmat, CMAT: cmat, PACK: pack, SIDE: side, EXTRAS: strip, extras: !!extras,
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
