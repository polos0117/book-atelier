#!/usr/bin/env python3
"""도트 스프라이트 정리 — 생성 그림의 실제 도트 격자(간격·시작점)를 찾아 칸 가운데 색을 뽑고, 96x128 셀에 발 기준선(아래에서 2칸 위)으로 앉힌다.

    python3 tools/sprite-grid.py <생성 원본.png> <정리본.png> [색 수=24]

알파 160 미만은 투명, 팔레트는 Lab 거리로 묶어(멀리 떨어진 색부터 씨앗) 빨강·금 같은 작은 강조색이 갈색에 먹히지 않게 한다.
정리본 옆에 <정리본>.json(격자 간격·시작점·크기·팔레트)을 둔다. 그냥 줄이기(면적 평균)는 격자가 어긋나 뭉개진다 — docs/ATELIER_PIXEL_ART_PLAN.md 5절."""
import sys, json
from PIL import Image
import numpy as np
src, out = sys.argv[1], sys.argv[2]
a = np.array(Image.open(src).convert('RGBA')).astype(float)
rgb = a[..., :3]; al = a[..., 3]
ex = np.abs(np.diff(rgb, axis=1)).sum(-1).sum(0)   # 열 경계 세기
ey = np.abs(np.diff(rgb, axis=0)).sum(-1).sum(1)
def best(e):
    top = (0, 0, 0)
    for p in np.arange(9.5, 14.0, 0.02):
        for o in np.arange(0, p, 0.25):
            idx = np.round(np.arange(o, len(e) - 1, p)).astype(int); idx = idx[idx < len(e)]
            sc = e[idx].mean() / e.mean()
            if sc > top[0]: top = (sc, p, o)
    return top
sx, px, ox = best(ex); sy, py, oy = best(ey)
print('pitch x %.2f off %.2f (%.2f)  y %.2f off %.2f (%.2f)' % (px, ox, sx, py, oy, sy))
cx = np.arange(ox + px / 2, a.shape[1], px); cy = np.arange(oy + py / 2, a.shape[0], py)
G = np.zeros((len(cy), len(cx), 4))
r = max(1, int(min(px, py) * 0.25))
for j, y in enumerate(cy):
    for i, x in enumerate(cx):
        yi, xi = int(y), int(x)
        blk = a[max(0, yi - r):yi + r + 1, max(0, xi - r):xi + r + 1].reshape(-1, 4)
        G[j, i] = np.median(blk, axis=0)
mask = G[..., 3] >= 160
ys, xs = np.where(mask); g = G[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; m = mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
h, w = m.shape; print('grid sprite', w, h)
assert h <= 128 and w <= 96, (w, h)
# 팔레트: 칸 색을 Lab 거리로 묶는다(빨강·금 같은 작은 강조색이 갈색에 먹히지 않게 — 무게 없이 서로 다른 색을 먼저 뽑는다)
src_c = g[..., :3][m].reshape(-1, 3)
def lab(c):
    c = c / 255; c = np.where(c > .04045, ((c + .055) / 1.055) ** 2.4, c / 12.92)
    X = c @ np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]]).T / [.9505, 1, 1.089]
    f = np.where(X > .008856, np.cbrt(X), 7.787 * X + 16 / 116)
    return np.stack([116 * f[:, 1] - 16, 500 * (f[:, 0] - f[:, 1]), 200 * (f[:, 1] - f[:, 2])], 1)
L = lab(src_c); NC = int(sys.argv[3]) if len(sys.argv) > 3 else 24
cent = [L[np.argmin(L[:, 0])]]
for _ in range(NC - 1):
    d = np.min([((L - c) ** 2).sum(1) for c in cent], 0); cent.append(L[np.argmax(d)])
cent = np.array(cent)
for _ in range(12):
    lab_i = np.argmin(((L[:, None] - cent[None]) ** 2).sum(-1), 1)
    cent = np.array([L[lab_i == k].mean(0) if (lab_i == k).any() else cent[k] for k in range(NC)])
lab_i = np.argmin(((L[:, None] - cent[None]) ** 2).sum(-1), 1)
pal = np.array([np.median(src_c[lab_i == k], 0) if (lab_i == k).any() else [0, 0, 0] for k in range(NC)]).round().astype(int)
idx = np.zeros(m.shape, int); idx[m] = lab_i
cell = np.zeros((128, 96, 4), 'uint8'); x0 = (96 - w) // 2; y0 = 126 - h
cell[y0:y0 + h, x0:x0 + w, :3] = pal[idx]; cell[y0:y0 + h, x0:x0 + w, 3] = np.where(m, 255, 0)
Image.fromarray(cell).save(out)
used = sorted({tuple(int(v) for v in pal[k]) for k in np.unique(idx[m])})
json.dump({'pitch': [round(px, 2), round(py, 2)], 'offset': [round(ox, 2), round(oy, 2)], 'sprite': [w, h], 'cell_offset': [x0, y0], 'foot_y': 126,
           'colours': len(used), 'palette': ['#%02x%02x%02x' % c for c in used]}, open(out + '.json', 'w'), indent=1)
