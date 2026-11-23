/**
 * Geometría de la mesa (coordenadas de mesa en píxeles, antes de la cámara).
 * Los huecos salen del arte oficial de los tapetes (tools/analyze_mats.py).
 */
export const DMAT = { x: 60, y: 50, w: 2000, h: 1175, img: 'assets/mats/iron_helm_mat_web.jpg' };
const CS = 1175 / 1900; // escala del tapete de personaje
export const CMAT = { x: 2110, y: 50, w: Math.round(1199 * CS), h: 1175, img: 'assets/mats/personaje_mat_web.jpg' };
export const TABLE = { w: CMAT.x + CMAT.w + 60, h: DMAT.y + DMAT.h + 60 };

export const CARD_D = { w: 200, h: 281 };   // carta sobre el tapete de mazmorra
export const CARD_C = { w: 172, h: 242 };   // carta sobre el tapete de personaje

const rect = (m, x0, y0, x1, y1, k = 1) => ({ x: m.x + x0 * k, y: m.y + y0 * k, w: (x1 - x0) * k, h: (y1 - y0) * k });

/** Huecos del tapete de mazmorra (coordenadas mostradas 2000×1175) */
const D = {
  plots: [55, 55, 260, 340], potions: [295, 55, 500, 340], loot: [535, 55, 740, 340], enemies: [775, 55, 980, 340],
  plotsUsed: [55, 375, 260, 660], potionsUsed: [295, 375, 500, 660], lootUsed: [535, 375, 740, 660], graveyard: [775, 375, 980, 660],
  trappings: [1495, 55, 1700, 340], skills: [1735, 55, 1940, 340], map: [1495, 375, 1700, 660], morality: [1735, 375, 1940, 660],
  dungeon: [150, 760, 390, 1115],
  door1: [530, 810, 740, 1090], door2: [775, 810, 980, 1090], door3: [1015, 810, 1220, 1090], door4: [1255, 810, 1460, 1090],
  rubble: [1580, 735, 1900, 1100],
};
/** Huecos del tapete de personaje (coordenadas originales 1199×1900, escaladas) */
const C = {
  hero: [92, 165, 385, 640], head: [452, 165, 750, 640], skills: [815, 165, 1110, 640],
  main: [92, 710, 385, 1115], body: [452, 710, 750, 1115], off: [815, 710, 1110, 1115], acc: [92, 1185, 385, 1590],
};

export const ZONES = {};
for (const [k, v] of Object.entries(D)) ZONES[k] = { ...rect(DMAT, ...v), mat: 'd' };
for (const [k, v] of Object.entries(C)) ZONES['c_' + k] = { ...rect(CMAT, ...v, CS), mat: 'c' };

/** Pocillos de fichas (centro y radio) en tapete de mazmorra */
const W = { gold: [1228, 98, 42], poison: [1085, 193, 42], health: [1385, 193, 42], blessing: [1230, 240, 58], ration: [1130, 365, 38], energy: [1330, 365, 38] };
export const WELLS = {};
for (const [k, [x, y, r]] of Object.entries(W)) WELLS[k] = { cx: DMAT.x + x, cy: DMAT.y + y, r };
/** Pocillos del tapete de personaje (espejo numérico) */
const CW = { gold: [88, 88], poison: [236, 88], ration: [406, 90], blessing: [590, 88], energy: [758, 90], health: [906, 90] };
export const CWELLS = {};
for (const [k, [x, y]] of Object.entries(CW)) CWELLS[k] = { cx: CMAT.x + x * CS, cy: CMAT.y + y * CS, r: 36 };

/** centro de una zona */
export const center = (z) => ({ x: z.x + z.w / 2, y: z.y + z.h / 2 });
/** rectángulo de carta de tamaño `size` centrado en una zona */
export function cardRect(zoneName, size, dx = 0, dy = 0) {
  const z = ZONES[zoneName];
  const s = size || (z.mat === 'd' ? CARD_D : CARD_C);
  const c = center(z);
  return { x: c.x - s.w / 2 + dx, y: c.y - s.h / 2 + dy, w: s.w, h: s.h };
}

/** Regiones de enfoque de cámara (coordenadas de mesa) */
export const FOCUS = {
  all: { x: 0, y: 0, w: TABLE.w, h: TABLE.h },
  dungeon: { x: DMAT.x, y: DMAT.y, w: DMAT.w, h: DMAT.h },
  hero: { x: CMAT.x - 20, y: CMAT.y, w: CMAT.w + 40, h: CMAT.h },
  doors: { x: DMAT.x + 110, y: DMAT.y + 690, w: 1440, h: 490 },
  doorsP: { x: DMAT.x + 100, y: DMAT.y + 690, w: 1000, h: 490 },
  play: { x: DMAT.x + 20, y: DMAT.y + 40, w: 1980, h: 1130 },
};
