#!/usr/bin/env python3
"""도트 스프라이트 정리 — 생성 그림의 실제 도트 격자(간격·시작점)를 찾아 칸 가운데 색을 뽑고, 96x128 셀에 발 기준선(아래에서 2칸 위)으로 앉힌다.

    python3 tools/sprite-grid.py <생성 원본.png> <정리본.png> [색 수=24]

알파 160 미만은 투명, 팔레트는 Lab 거리로 묶어(멀리 떨어진 색부터 씨앗) 빨강·금 같은 작은 강조색이 갈색에 먹히지 않게 한다.
정리본 옆에 <정리본>.json(격자 간격·시작점·크기·팔레트)을 둔다. 그냥 줄이기(면적 평균)는 격자가 어긋나 뭉개진다 — docs/ATELIER_PIXEL_ART_PLAN.md 5절."""
import sys, os, json
from PIL import Image
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sprite_px import sample_grid, palette
src, out = sys.argv[1], sys.argv[2]
NC = int(sys.argv[3]) if len(sys.argv) > 3 else 24
a = np.array(Image.open(src).convert('RGBA')).astype(float)
G, (px, ox, sx, py, oy, sy) = sample_grid(a)
print('pitch x %.2f off %.2f (%.2f)  y %.2f off %.2f (%.2f)' % (px, ox, sx, py, oy, sy))
mask = G[..., 3] >= 160
ys, xs = np.where(mask); g = G[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; m = mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
h, w = m.shape; print('grid sprite', w, h)
assert h <= 128 and w <= 96, (w, h)
pal, lab_i = palette(g[..., :3][m].reshape(-1, 3), NC)
idx = np.zeros(m.shape, int); idx[m] = lab_i
cell = np.zeros((128, 96, 4), 'uint8'); x0 = (96 - w) // 2; y0 = 126 - h
cell[y0:y0 + h, x0:x0 + w, :3] = pal[idx]; cell[y0:y0 + h, x0:x0 + w, 3] = np.where(m, 255, 0)
Image.fromarray(cell).save(out)
used = sorted({tuple(int(v) for v in pal[k]) for k in np.unique(idx[m])})
json.dump({'pitch': [round(px, 2), round(py, 2)], 'offset': [round(ox, 2), round(oy, 2)], 'sprite': [w, h], 'cell_offset': [x0, y0], 'foot_y': 126,
           'colours': len(used), 'palette': ['#%02x%02x%02x' % c for c in used]}, open(out + '.json', 'w'), indent=1)
