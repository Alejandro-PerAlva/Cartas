#!/usr/bin/env python3
"""
Recomprime las imágenes de cartas para la APK (la copia; los originales no se tocan).

  python3 tools/android-optimize-images.py <origen> <destino> <caché> [--format webp|jpeg] [--quality 78]

Recorre <origen> (p. ej. iron_helm_game/assets/cards), recomprime cada .jpg con Pillow y deja el resultado en
<destino> con la misma estructura de carpetas, mismas dimensiones y mismo nombre base:
  - webp (por defecto): <nombre>.webp. El WebView sirve las peticiones de <nombre>.jpg desde el .webp.
  - jpeg: <nombre>.jpg progresivo y optimizado.
Si la recompresión no reduce el tamaño, se copia el original. <caché> guarda los resultados por hash del
contenido, así que las compilaciones posteriores solo recomprimen lo que haya cambiado.
Imprime una línea final "RESUMEN n originales_bytes nuevos_bytes".
"""
import argparse
import hashlib
import os
import shutil
import sys
from concurrent.futures import ProcessPoolExecutor

from PIL import Image

VERSION = 'v1'


def encode(src, out, fmt, quality):
    im = Image.open(src)
    im.load()
    size = im.size
    if im.mode not in ('RGB', 'L'):
        im = im.convert('RGB')
    icc = im.info.get('icc_profile')
    kw = {}
    if icc:
        kw['icc_profile'] = icc
    tmp = f'{out}.{os.getpid()}.tmp'  # único por proceso: puede haber imágenes idénticas repetidas
    if fmt == 'webp':
        im.save(tmp, 'WEBP', quality=quality, method=6, **kw)
    else:
        im.save(tmp, 'JPEG', quality=quality, optimize=True, progressive=True, **kw)
    # comprobación: se decodifica y se compara el tamaño en píxeles
    chk = Image.open(tmp)
    chk.load()
    if chk.size != size:
        os.remove(tmp)
        raise RuntimeError(f'{src}: dimensiones distintas tras recomprimir {size} -> {chk.size}')
    os.replace(tmp, out)


def job(a):
    src, dst_dir, rel, cache, fmt, quality = a
    with open(src, 'rb') as f:
        data = f.read()
    h = hashlib.sha1(data + f'|{fmt}|{quality}|{VERSION}'.encode()).hexdigest()
    ext = 'webp' if fmt == 'webp' else 'jpg'
    cached = os.path.join(cache, f'{h}.{ext}')
    if not os.path.exists(cached):
        encode(src, cached, fmt, quality)
    base = os.path.splitext(rel)[0]
    orig_size = len(data)
    if os.path.getsize(cached) >= orig_size:
        out_rel = rel  # no mejora: se queda el original
        out = os.path.join(dst_dir, out_rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        shutil.copyfile(src, out)
        return orig_size, orig_size
    out = os.path.join(dst_dir, f'{base}.{ext}')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    try:
        if os.path.exists(out):
            os.remove(out)
        os.link(cached, out)
    except OSError:
        shutil.copyfile(cached, out)
    return orig_size, os.path.getsize(cached)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument('cache')
    ap.add_argument('--format', default='webp', choices=['webp', 'jpeg'])
    ap.add_argument('--quality', type=int, default=78)
    a = ap.parse_args()
    os.makedirs(a.cache, exist_ok=True)
    jobs = []
    for dp, _, fns in os.walk(a.src):
        for fn in sorted(fns):
            if fn.startswith('.') or not fn.lower().endswith(('.jpg', '.jpeg')):
                continue
            p = os.path.join(dp, fn)
            jobs.append((p, a.dst, os.path.relpath(p, a.src), a.cache, a.format, a.quality))
    tot_o = tot_n = 0
    with ProcessPoolExecutor() as ex:
        for o, n in ex.map(job, jobs, chunksize=8):
            tot_o += o
            tot_n += n
    print(f'RESUMEN {len(jobs)} {tot_o} {tot_n}')


if __name__ == '__main__':
    sys.exit(main())
