#!/usr/bin/env python3
"""Genera fichas (recortadas del arte oficial de los tapetes) y texturas procedurales sin costuras.
Uso: python3 tools/gen_assets.py"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..', 'iron_helm_game', 'assets')
os.makedirs(os.path.join(ROOT, 'tokens'), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'textures'), exist_ok=True)
K = 1.2
rng = np.random.default_rng(7)

# ---------------------------------------------------------------- fichas
mat = Image.open(os.path.join(ROOT, 'mats', 'iron_helm_mat_web.jpg')).convert('RGB')
HSV = mat.convert('HSV')
TOK = {  # nombre: (cx, cy, radio_busqueda, forma)  (coords mostradas)
    'gold': (1228, 98, 52, 'disc'), 'poison': (1085, 195, 50, 'cut'), 'health': (1385, 195, 50, 'cut'),
    'blessing': (1230, 240, 62, 'disc'), 'ration': (1130, 365, 46, 'square'), 'energy': (1330, 365, 46, 'cut'),
}
def saturated_bbox(cx, cy, r):
    box = (int(cx - r), int(cy - r), int(cx + r), int(cy + r))
    h = np.array(HSV.crop(box)); a = (h[..., 1] > 95) & (h[..., 2] > 80)
    ys, xs = np.where(a)
    return box, (xs.min(), ys.min(), xs.max(), ys.max())
for name, (cx, cy, r, shape) in TOK.items():
    cx, cy, r = cx * K, cy * K, r * K
    box, (x0, y0, x1, y1) = saturated_bbox(cx, cy, r)
    bx, by = box[0] + (x0 + x1) / 2, box[1] + (y0 + y1) / 2
    half = max(x1 - x0, y1 - y0) / 2
    pad = 0.30 if shape == 'cut' else 0.04
    h2 = half * (1 + pad) + (5 if shape == 'cut' else 0)
    crop = mat.crop((int(bx - h2), int(by - h2), int(bx + h2), int(by + h2))).resize((192, 192), Image.LANCZOS).convert('RGBA')
    S4 = 192 * 4
    mask = Image.new('L', (S4, S4), 0); d = ImageDraw.Draw(mask)
    if shape == 'disc':
        d.ellipse([6, 6, S4 - 6, S4 - 6], fill=255)
    elif shape == 'square':
        d.rounded_rectangle([6, 6, S4 - 6, S4 - 6], radius=60, fill=255)
    else:  # recorte por silueta: todo lo que no sea el gris oscuro del fondo
        arr = np.array(crop.convert('RGB')).astype(int)
        smp = np.concatenate([arr[88:104, 8:24].reshape(-1, 3), arr[88:104, -24:-8].reshape(-1, 3), arr[60:72, 12:28].reshape(-1, 3), arr[60:72, -28:-12].reshape(-1, 3)])
        bg = np.median(smp, axis=0)
        dist = np.abs(arr - bg).sum(axis=2)
        m = Image.fromarray(((dist > 46) * 255).astype('uint8'))
        m = m.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MinFilter(3))
        mask = m.filter(ImageFilter.GaussianBlur(1.2))
        mask = mask.resize((192, 192), Image.LANCZOS)
        clip = Image.new('L', (192 * 4, 192 * 4), 0)
        ImageDraw.Draw(clip).ellipse([int(192 * 4 * 0.035), int(192 * 4 * 0.035), int(192 * 4 * 0.965), int(192 * 4 * 0.965)], fill=255)
        clip = clip.resize((192, 192), Image.LANCZOS)
        mask = Image.fromarray((np.array(mask).astype(float) * np.array(clip).astype(float) / 255).astype('uint8'))
        crop.putalpha(mask); crop.save(os.path.join(ROOT, 'tokens', f'tk_{name}.png'), optimize=True); continue
    mask = mask.resize((192, 192), Image.LANCZOS)
    crop.putalpha(mask)
    crop.save(os.path.join(ROOT, 'tokens', f'tk_{name}.png'), optimize=True)
print('tokens ok')

# ---------------------------------------------------------------- texturas
def noise(h, w, sx, sy, seed):
    """Ruido periódico (sin costuras) filtrado en frecuencia; sx, sy = escala (px) en x e y."""
    r = np.random.default_rng(seed)
    f = np.fft.fft2(r.standard_normal((h, w)))
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    filt = np.exp(-((fx * sx) ** 2 + (fy * sy) ** 2) * 2.0)
    n = np.real(np.fft.ifft2(f * filt))
    n = (n - n.mean()) / (n.std() + 1e-9)
    return n

def to_img(a):
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'))

def mix(c0, c1, t):
    t = np.clip(t, 0, 1)[..., None]
    return np.array(c0)[None, None, :] * (1 - t) + np.array(c1)[None, None, :] * t

N = 1024
# madera de roble oscuro con tablones horizontales
g1 = noise(N, N, 220, 5, 1); g2 = noise(N, N, 90, 3, 2); g3 = noise(N, N, 30, 1.5, 3)
rings = np.sin((np.arange(N)[:, None] * 0.045) + g1 * 2.6 + g2 * 0.9) * 0.5 + 0.5
wood_t = 0.5 * rings + 0.18 * g2 + 0.10 * g3 + 0.05 * noise(N, N, 3, 3, 4)
wood = mix((26, 15, 9), (86, 54, 30), (wood_t + 0.4) / 1.4)
plank = 256
for i in range(0, N, plank):
    shade = rng.uniform(-14, 14)
    wood[i:i + plank] += shade
    wood[i:i + 3] *= 0.45            # junta entre tablones
    wood[i + 3:i + 5] *= 0.75
# nudos
for _ in range(7):
    x, y = rng.integers(0, N), rng.integers(0, N)
    yy, xx = np.ogrid[:N, :N]
    dx = np.minimum(abs(xx - x), N - abs(xx - x)); dy = np.minimum(abs(yy - y), N - abs(yy - y))
    d2 = (dx / 26.0) ** 2 + (dy / 10.0) ** 2
    knot = np.exp(-d2) * 0.55 + np.exp(-d2 * 0.18) * 0.12 * np.sin(np.sqrt(d2) * 5)
    wood *= (1 - knot[..., None] * 0.75)
to_img(wood).filter(ImageFilter.GaussianBlur(0.4)).save(os.path.join(ROOT, 'textures', 'wood.jpg'), quality=82, optimize=True)

# fieltro verde oscuro
fl = 0.55 * noise(N, N, 2, 2, 11) + 0.35 * noise(N, N, 10, 10, 12) + 0.35 * noise(N, N, 160, 160, 13)
felt = mix((14, 38, 26), (34, 78, 52), (fl + 1.4) / 3.2)
to_img(felt).save(os.path.join(ROOT, 'textures', 'felt.jpg'), quality=80, optimize=True)

# cuero marrón con grietas
lt = 0.5 * noise(N, N, 3, 3, 21) + 0.45 * noise(N, N, 14, 14, 22) + 0.3 * noise(N, N, 90, 90, 23)
cr = np.abs(noise(N, N, 22, 22, 24)); cracks = np.clip(1 - cr * 5.5, 0, 1) ** 3
leather = mix((38, 22, 13), (98, 62, 36), (lt + 1.3) / 2.8) * (1 - cracks[..., None] * 0.5)
to_img(leather).save(os.path.join(ROOT, 'textures', 'leather.jpg'), quality=80, optimize=True)

# pergamino envejecido
pt = 0.35 * noise(N, N, 4, 4, 31) + 0.55 * noise(N, N, 60, 60, 32) + 0.45 * noise(N, N, 200, 200, 33)
fib = 0.25 * noise(N, N, 40, 1.2, 34)
parch = mix((176, 150, 104), (232, 214, 170), (pt + fib + 1.3) / 2.9)
stain = np.clip(noise(N, N, 120, 120, 35) - 0.9, 0, 1)[..., None]
parch = parch * (1 - stain * 0.28) + np.array([120, 84, 40])[None, None, :] * stain * 0.28
to_img(parch).save(os.path.join(ROOT, 'textures', 'parchment.jpg'), quality=82, optimize=True)

# piedra oscura (para paneles)
st = 0.5 * noise(N, N, 2, 2, 41) + 0.4 * noise(N, N, 18, 18, 42) + 0.4 * noise(N, N, 100, 100, 43)
stone = mix((24, 24, 28), (66, 64, 70), (st + 1.4) / 2.9)
to_img(stone).save(os.path.join(ROOT, 'textures', 'stone.jpg'), quality=80, optimize=True)
print('textures ok')
