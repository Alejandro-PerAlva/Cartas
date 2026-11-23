#!/usr/bin/env python3
"""
Genera los iconos de lanzador de la app Android a partir del escudo con espadas cruzadas del tapete de mazmorra.

  python3 tools/gen-android-icons.py

Escribe en android/res/mipmap-*/ (versión clásica cuadrada y redonda, y capas del icono adaptativo) y
android/res/mipmap-anydpi-v26/*.xml. Los PNG generados se versionan: este script solo hace falta si se quiere
cambiar el diseño. Requiere Pillow y numpy.

Diseño: escudo recortado del tapete dentro de un medallón con aro de latón, sobre cuero oscuro.
  - adaptativo: capa de fondo (cuero) + capa frontal (medallón en la zona segura de 66 dp de 108 dp).
  - clásico: cuadrado con esquinas redondeadas y marco de latón; redondo: círculo con aro de latón.
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MAT = os.path.join(ROOT, 'iron_helm_game', 'assets', 'mats', 'iron_helm_mat_web.jpg')
LEATHER = os.path.join(ROOT, 'iron_helm_game', 'assets', 'textures', 'leather.jpg')
RES = os.path.join(ROOT, 'android', 'res')

M = 1296  # lienzo maestro (múltiplo de 432 = 108 dp a xxxhdpi)

# centro y radio del escudo + espadas dentro del tapete de 2399x1410
SHIELD_CENTER = (1488, 712)
SHIELD_HALF = 222


def radial(size, inner, outer, power=1.0):
    """Máscara radial 0..1 (1 en el centro hasta `inner`, 0 a partir de `outer`), fracciones del radio."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    c = (size - 1) / 2
    d = np.sqrt((x - c) ** 2 + (y - c) ** 2) / (size / 2)
    t = np.clip((outer - d) / max(outer - inner, 1e-6), 0, 1)
    return t ** power


def circle_mask(size, diameter, feather=1.2):
    ss = 4
    m = Image.new('L', (size * ss, size * ss), 0)
    d = ImageDraw.Draw(m)
    c = size * ss / 2
    r = diameter * ss / 2
    d.ellipse([c - r, c - r, c + r, c + r], fill=255)
    m = m.resize((size, size), Image.LANCZOS)
    if feather:
        m = m.filter(ImageFilter.GaussianBlur(feather * 0.35))
    return m


def leather_bg(size):
    """Cuero oscuro con viñeta: más claro en el centro, casi negro en los bordes."""
    tex = Image.open(LEATHER).convert('RGB')
    tile = tex.resize((size, size), Image.LANCZOS)
    a = np.asarray(tile).astype(np.float32) / 255.0
    lum = a.mean(axis=2, keepdims=True)
    a = a * 0.60 + lum * 0.10  # más oscuro y algo menos saturado
    v = radial(size, 0.0, 1.45, 0.9)[..., None]
    a = a * (0.45 + 0.75 * v)
    a *= np.array([1.0, 0.92, 0.82], dtype=np.float32)  # tono cálido
    return Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8), 'RGB')


def brass_gradient(size):
    """Degradado diagonal de latón (luz arriba a la izquierda) con un poco de grano."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    t = (x * 0.55 + y * 0.85) / (size * 1.4)  # 0..1 diagonal
    stops = [
        (0.00, (255, 238, 170)),
        (0.22, (232, 196, 104)),
        (0.50, (190, 146, 58)),
        (0.78, (124, 88, 28)),
        (1.00, (92, 62, 18)),
    ]
    out = np.zeros((size, size, 3), np.float32)
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        m = (t >= t0) & (t <= t1)
        k = ((t - t0) / (t1 - t0))[m][:, None]
        out[m] = np.array(c0) * (1 - k) + np.array(c1) * k
    rng = np.random.default_rng(7)
    out *= (1 + (rng.random((size, size, 1), dtype=np.float32) - 0.5) * 0.06)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGB')


def emblem(diameter):
    """Escudo con espadas recortado del tapete, como disco de `diameter` px, con viñeta de piedra."""
    mat = Image.open(MAT).convert('RGB')
    cx, cy = SHIELD_CENTER
    h = SHIELD_HALF
    crop = mat.crop((cx - h, cy - h, cx + h, cy + h)).resize((diameter, diameter), Image.LANCZOS)
    crop = ImageEnhance.Contrast(crop).enhance(1.12)
    crop = ImageEnhance.Color(crop).enhance(1.10)
    a = np.asarray(crop).astype(np.float32) / 255.0
    v = radial(diameter, 0.52, 1.0, 1.1)[..., None]
    a = a * (0.34 + 0.66 * v)  # la piedra se oscurece hacia el borde para que el escudo destaque
    a *= np.array([1.02, 0.97, 0.90], dtype=np.float32)
    return Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8), 'RGB')


def medallion(canvas, ring_diameter):
    """Medallón (RGBA, canvas×canvas) con aro de latón biselado y el escudo dentro, centrado."""
    ss = canvas
    R = ring_diameter
    ring_w = int(R * 0.105)
    inner_d = R - 2 * ring_w
    out = Image.new('RGBA', (ss, ss), (0, 0, 0, 0))

    # sombra suave bajo el medallón
    sh = Image.new('L', (ss, ss), 0)
    c = ss / 2
    ImageDraw.Draw(sh).ellipse([c - R / 2, c - R / 2 + R * 0.025, c + R / 2, c + R / 2 + R * 0.025], fill=150)
    sh = sh.filter(ImageFilter.GaussianBlur(R * 0.018))
    out.paste(Image.new('RGBA', (ss, ss), (0, 0, 0, 255)), (0, 0), sh)

    # aro de latón
    brass = brass_gradient(ss).convert('RGBA')
    outer = circle_mask(ss, R)
    out.paste(brass, (0, 0), outer)
    # borde oscuro exterior (contorno de tinta, como el arte del juego)
    edge = Image.new('L', (ss, ss), 0)
    ImageDraw.Draw(edge).ellipse([c - R / 2, c - R / 2, c + R / 2, c + R / 2], outline=255, width=max(2, int(R * 0.012)))
    out.paste(Image.new('RGBA', (ss, ss), (38, 24, 8, 255)), (0, 0), edge)
    # bisel interior del aro: línea clara arriba-izquierda y oscura abajo-derecha
    hl = Image.new('L', (ss, ss), 0)
    ImageDraw.Draw(hl).ellipse([c - R / 2 + ring_w * 0.30, c - R / 2 + ring_w * 0.30, c + R / 2 - ring_w * 0.30, c + R / 2 - ring_w * 0.30],
                               outline=255, width=max(2, int(ring_w * 0.12)))
    hl = hl.filter(ImageFilter.GaussianBlur(0.8))
    out.paste(Image.new('RGBA', (ss, ss), (255, 226, 140, 140)), (0, 0), hl)

    # hueco interior: borde oscuro + escudo
    cut_edge = Image.new('L', (ss, ss), 0)
    ImageDraw.Draw(cut_edge).ellipse([c - inner_d / 2 - 2, c - inner_d / 2 - 2, c + inner_d / 2 + 2, c + inner_d / 2 + 2], fill=255)
    out.paste(Image.new('RGBA', (ss, ss), (30, 18, 6, 255)), (0, 0), cut_edge)
    emb = emblem(inner_d).convert('RGBA')
    inner_mask = circle_mask(inner_d, inner_d)
    layer = Image.new('RGBA', (ss, ss), (0, 0, 0, 0))
    layer.paste(emb, (int(c - inner_d / 2), int(c - inner_d / 2)), inner_mask)
    out = Image.alpha_composite(out, layer)

    # sombra interior sobre el escudo (profundidad bajo el aro)
    ring_shadow = Image.new('L', (ss, ss), 0)
    ImageDraw.Draw(ring_shadow).ellipse([c - inner_d / 2, c - inner_d / 2, c + inner_d / 2, c + inner_d / 2], fill=255)
    inv = Image.eval(ring_shadow.filter(ImageFilter.GaussianBlur(R * 0.02)), lambda p: 255 - p)
    inv = Image.composite(inv, Image.new('L', (ss, ss), 0), ring_shadow)
    out.paste(Image.new('RGBA', (ss, ss), (0, 0, 0, 255)), (0, 0), inv.point(lambda p: int(p * 0.55)))
    return out


def adaptive_layers():
    bg = leather_bg(M)
    fg = medallion(M, int(M * 0.60))  # 60 % del lienzo: dentro de la zona segura (66/108 = 61 %)
    return bg, fg


def legacy_square():
    """Icono clásico cuadrado: cuero + marco de latón + medallón grande."""
    s = M
    base = leather_bg(s).convert('RGBA')
    r = int(s * 0.19)
    ss = 3
    mask = Image.new('L', (s * ss, s * ss), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s * ss - 1, s * ss - 1], radius=r * ss, fill=255)
    mask = mask.resize((s, s), Image.LANCZOS)
    # marco de latón
    frame_w = int(s * 0.035)
    brass = brass_gradient(s).convert('RGBA')
    ring = Image.new('L', (s * ss, s * ss), 0)
    d = ImageDraw.Draw(ring)
    inset = int(s * 0.012) * ss
    d.rounded_rectangle([inset, inset, s * ss - 1 - inset, s * ss - 1 - inset], radius=(r - int(s * 0.012)) * ss, outline=255, width=frame_w * ss)
    ring = ring.resize((s, s), Image.LANCZOS)
    base.paste(brass, (0, 0), ring)
    dark = Image.new('L', (s * ss, s * ss), 0)
    d = ImageDraw.Draw(dark)
    in2 = inset + frame_w * ss
    d.rounded_rectangle([in2, in2, s * ss - 1 - in2, s * ss - 1 - in2], radius=(r - int(s * 0.012) - frame_w) * ss, outline=255, width=max(2, int(s * 0.006)) * ss)
    dark = dark.resize((s, s), Image.LANCZOS)
    base.paste(Image.new('RGBA', (s, s), (24, 14, 5, 255)), (0, 0), dark)
    med = medallion(s, int(s * 0.80))
    base = Image.alpha_composite(base, med)
    out = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask)
    return out


def legacy_round():
    """Icono clásico redondo: cuero + aro de latón exterior + medallón."""
    s = M
    ss = 3
    base = leather_bg(s).convert('RGBA')
    brass = brass_gradient(s).convert('RGBA')
    c = s / 2
    ring = Image.new('L', (s * ss, s * ss), 0)
    ImageDraw.Draw(ring).ellipse([0, 0, s * ss - 1, s * ss - 1], fill=255)
    ImageDraw.Draw(ring).ellipse([s * ss * 0.04, s * ss * 0.04, s * ss * 0.96, s * ss * 0.96], fill=0)
    ring = ring.resize((s, s), Image.LANCZOS)
    base.paste(brass, (0, 0), ring)
    dark = Image.new('L', (s * ss, s * ss), 0)
    ImageDraw.Draw(dark).ellipse([s * ss * 0.04, s * ss * 0.04, s * ss * 0.96, s * ss * 0.96], outline=255, width=max(2, int(s * 0.006)) * ss)
    dark = dark.resize((s, s), Image.LANCZOS)
    base.paste(Image.new('RGBA', (s, s), (24, 14, 5, 255)), (0, 0), dark)
    med = medallion(s, int(s * 0.74))
    base = Image.alpha_composite(base, med)
    out = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    out.paste(base, (0, 0), circle_mask(s, s, feather=0.6))
    return out


DENS = {'mdpi': 1.0, 'hdpi': 1.5, 'xhdpi': 2.0, 'xxhdpi': 3.0, 'xxxhdpi': 4.0}


def save(img, path, size, mode='RGBA'):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im = img.resize((size, size), Image.LANCZOS)
    if mode == 'RGB':
        im = im.convert('RGB')
    im.save(path, 'PNG', optimize=True)


def main():
    bg, fg = adaptive_layers()
    sq = legacy_square()
    rd = legacy_round()
    for name, dens in DENS.items():
        d = os.path.join(RES, f'mipmap-{name}')
        save(sq, os.path.join(d, 'ic_launcher.png'), round(48 * dens))
        save(rd, os.path.join(d, 'ic_launcher_round.png'), round(48 * dens))
        save(fg, os.path.join(d, 'ic_launcher_foreground.png'), round(108 * dens))
        save(bg, os.path.join(d, 'ic_launcher_background.png'), round(108 * dens), 'RGB')
    xml = ('<?xml version="1.0" encoding="utf-8"?>\n'
           '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
           '    <background android:drawable="@mipmap/ic_launcher_background" />\n'
           '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
           '</adaptive-icon>\n')
    d = os.path.join(RES, 'mipmap-anydpi-v26')
    os.makedirs(d, exist_ok=True)
    for n in ('ic_launcher.xml', 'ic_launcher_round.xml'):
        with open(os.path.join(d, n), 'w') as f:
            f.write(xml)
    # vistas previas fuera del repo (si se indica una carpeta)
    prev = sys.argv[1] if len(sys.argv) > 1 else None
    if prev:
        os.makedirs(prev, exist_ok=True)
        sheet = Image.new('RGB', (4 * 260, 260), (60, 70, 90))
        # cuadrado, redondo, adaptativo con máscara circular, adaptativo con máscara cuadrada redondeada
        sheet.paste(sq.resize((240, 240), Image.LANCZOS), (10, 10), sq.resize((240, 240), Image.LANCZOS))
        sheet.paste(rd.resize((240, 240), Image.LANCZOS), (270, 10), rd.resize((240, 240), Image.LANCZOS))
        comp = Image.alpha_composite(bg.convert('RGBA'), fg)
        vis = comp.crop((int(M * 0.1667), int(M * 0.1667), int(M * 0.8333), int(M * 0.8333)))  # 72 dp visibles
        vis = vis.resize((240, 240), Image.LANCZOS)
        for i, shape in enumerate(('circle', 'squircle')):
            m = Image.new('L', (960, 960), 0)
            dr = ImageDraw.Draw(m)
            if shape == 'circle':
                dr.ellipse([0, 0, 959, 959], fill=255)
            else:
                dr.rounded_rectangle([0, 0, 959, 959], radius=250, fill=255)
            m = m.resize((240, 240), Image.LANCZOS)
            sheet.paste(vis, (530 + i * 260, 10), m)
        sheet.save(os.path.join(prev, 'icons-preview.png'))
        fg.save(os.path.join(prev, 'fg-full.png'))
    print('Iconos generados en', RES)


if __name__ == '__main__':
    main()
