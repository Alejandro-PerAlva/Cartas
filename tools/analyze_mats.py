#!/usr/bin/env python3
"""Genera una superposición de depuración con los huecos (slots) del tapete y recorta las fichas
desde el arte original de los tapetes.  Uso: python3 tools/analyze_mats.py [debug_out_dir]"""
import json, sys, os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..', 'iron_helm_game', 'assets')
MAT_D = Image.open(os.path.join(ROOT, 'mats', 'iron_helm_mat_web.jpg')).convert('RGB')   # 2399x1410
MAT_C = Image.open(os.path.join(ROOT, 'mats', 'personaje_mat_web.jpg')).convert('RGB')   # 1199x1900
K = 1.2  # coordenadas "mostradas" (2000x1175) -> originales (2399x1410)

# --- Huecos del tapete de mazmorra, en coordenadas mostradas (2000x1175) ---
# (x0, y0, x1, y1)
DUN = {
  'plots':      (55, 55, 260, 340),  'potions':   (295, 55, 500, 340),
  'loot':       (535, 55, 740, 340), 'enemies':   (775, 55, 980, 340),
  'plotsUsed':  (55, 375, 260, 660), 'potionsUsed': (295, 375, 500, 660),
  'lootUsed':   (535, 375, 740, 660), 'graveyard': (775, 375, 980, 660),
  'trappings':  (1495, 55, 1700, 340), 'skills':   (1735, 55, 1940, 340),
  'map':        (1495, 375, 1700, 660), 'morality': (1735, 375, 1940, 660),
  'dungeon':    (150, 760, 390, 1115),
  'door1':      (530, 810, 740, 1090), 'door2': (775, 810, 980, 1090),
  'door3':      (1015, 810, 1220, 1090), 'door4': (1255, 810, 1460, 1090),
  'rubble':     (1580, 735, 1900, 1100),
}
# Pocillos de fichas (centro y radio), coordenadas mostradas
WELLS = {
  'gold': (1228, 95, 42), 'poison': (1085, 190, 42), 'health': (1385, 190, 42),
  'blessing': (1230, 240, 58), 'ration': (1130, 365, 38), 'energy': (1330, 365, 38),
}
# --- Tapete de personaje: coordenadas originales (1199x1900) ---
CHAR = {
  'hero':   (92, 165, 385, 640),  'head':  (452, 165, 750, 640), 'skills': (815, 165, 1110, 640),
  'main':   (92, 710, 385, 1115), 'body':  (452, 710, 750, 1115), 'off':    (815, 710, 1110, 1115),
  'acc':    (92, 1185, 385, 1590),
}
CWELLS = {  # fila superior
  'gold': (85, 85, 62), 'poison': (250, 85, 62), 'ration': (405, 85, 52),
  'blessing': (540, 85, 62), 'energy': (762, 85, 52), 'health1': (925, 85, 62), 'health2': (1085, 85, 62),
}

def debug(out):
    d = MAT_D.copy(); dr = ImageDraw.Draw(d)
    for k, (a, b, c, e) in DUN.items():
        dr.rectangle([a*K, b*K, c*K, e*K], outline=(255, 0, 0), width=4); dr.text((a*K+6, b*K+6), k, fill=(255, 255, 0))
    for k, (x, y, r) in WELLS.items():
        dr.ellipse([(x-r)*K, (y-r)*K, (x+r)*K, (y+r)*K], outline=(0, 255, 255), width=4); dr.text((x*K-10, y*K), k, fill=(0, 255, 255))
    d.resize((2000, 1175)).save(os.path.join(out, 'dbg_dungeon.jpg'), quality=85)
    c = MAT_C.copy(); dr = ImageDraw.Draw(c)
    for k, (a, b, cc, e) in CHAR.items():
        dr.rectangle([a, b, cc, e], outline=(255, 0, 0), width=4); dr.text((a+6, b+6), k, fill=(255, 255, 0))
    for k, (x, y, r) in CWELLS.items():
        dr.ellipse([x-r, y-r, x+r, y+r], outline=(0, 255, 255), width=4)
    c.resize((600, 950)).save(os.path.join(out, 'dbg_char.jpg'), quality=85)

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    debug(out)
    print('ok')
