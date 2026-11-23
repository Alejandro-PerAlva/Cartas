"""Detecta los números rojos (salas 1-5) de cada carta de mapa. Uso: python3 tools/analyze_maps.py (desde iron_helm_game/)."""
import numpy as np, sys
from PIL import Image
from collections import deque
import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "iron_helm_game"))
maps={'base':'assets/cards/base/card_074.jpg','warren':'assets/cards/expansions/warren/card_011.jpg','blackened':'assets/cards/expansions/blackened/card_011.jpg','galnok':'assets/cards/expansions/galnok/card_011.jpg','crystal':'assets/cards/expansions/crystal/card_011.jpg','throne':'assets/cards/expansions/throne/card_011.jpg','malicia':'assets/cards/expansions/malicia/card_011.jpg'}
def comps(mask):
    H,W=mask.shape; seen=np.zeros_like(mask,bool); out=[]
    for y in range(H):
        for x in range(W):
            if mask[y,x] and not seen[y,x]:
                q=deque([(y,x)]); seen[y,x]=True; pts=[]
                while q:
                    cy,cx=q.popleft(); pts.append((cy,cx))
                    for dy in (-1,0,1):
                        for dx in (-1,0,1):
                            ny,nx=cy+dy,cx+dx
                            if 0<=ny<H and 0<=nx<W and mask[ny,nx] and not seen[ny,nx]: seen[ny,nx]=True; q.append((ny,nx))
                out.append(pts)
    return out
for n,p in maps.items():
    a=np.asarray(Image.open(p).convert('RGB')).astype(int)
    m=(a[...,0]>150)&(a[...,1]<110)&(a[...,2]<110)&(a[...,0]-a[...,1]>80)
    # merge near blobs by dilation
    from numpy import pad
    d=m.copy()
    for _ in range(3):
        d=d|np.roll(d,1,0)|np.roll(d,-1,0)|np.roll(d,1,1)|np.roll(d,-1,1)
    cs=comps(d)
    res=[]
    for c in cs:
        ys=[y for y,x in c]; xs=[x for y,x in c]
        area=int(sum(m[y,x] for y,x in c))
        if area<25: continue
        res.append((round(np.mean(xs)),round(np.mean(ys)),area,max(xs)-min(xs)+1,max(ys)-min(ys)+1))
    print(n,len(res)); 
    for r in sorted(res,key=lambda r:(r[1],r[0])): print('   ',r)
