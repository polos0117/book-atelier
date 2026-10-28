#!/usr/bin/env python3
"""도트 스프라이트 정리 — 생성 그림의 실제 도트 격자(간격·시작점)를 찾아 칸 가운데 색을 뽑고, 96x128 셀에 발 기준선(아래에서 2칸 위)으로 앉힌다.

    python3 tools/sprite-grid.py <생성 원본.png> <정리본.png> [색 수=24] [--rows N] [--outline]

--rows N: 격자를 찾지 않고 인물 높이를 N 줄로 나눈 간격의 고른 격자(sprite_px.sample_fixed — 시작점만 찾는다)로 뽑는다 —
  생성 도트가 들쭉날쭉해 격자 찾기가 엇나갈 때. 인물끼리 키를 맞출 때도(alice 정지 도트가 123 줄).
--outline: 바깥에 윤곽 한 칸(그 인물의 가장 어두운 색) — 키가 두 줄 는다.

알파 160 미만은 투명, 팔레트는 Lab 거리로 묶어(멀리 떨어진 색부터 씨앗) 빨강·금 같은 작은 강조색이 갈색에 먹히지 않게 한다.
정리본 옆에 <정리본>.json(격자 간격·시작점·크기·팔레트)을 둔다. 그냥 줄이기(면적 평균)는 격자가 어긋나 뭉개진다 — docs/ATELIER_PIXEL_ART_PLAN.md 5절."""
import sys, os, json
from PIL import Image
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sprite_px import sample_grid, sample_fixed, palette
args = [x for x in sys.argv[1:] if not x.startswith('--')]
ROWS = int(sys.argv[sys.argv.index('--rows') + 1]) if '--rows' in sys.argv else None
if ROWS: args = [x for x in args if x != str(ROWS)] if args.count(str(ROWS)) and len(args) > 3 else args[:3] if len(args) > 3 else args
src, out = args[0], args[1]
NC = int(args[2]) if len(args) > 2 else 24
a = np.array(Image.open(src).convert('RGBA')).astype(float)
if ROWS:
    solid = a[..., 3] >= 160
    ys, xs = np.where(solid); a = a[max(0, ys.min() - 4):ys.max() + 5, max(0, xs.min() - 4):xs.max() + 5]
    px = py = (ys.max() - ys.min() + 1) / ROWS; ox = oy = sx = sy = 0
    opaque = a[..., :3][a[..., 3] >= 160].reshape(-1, 3)
    pal0, _ = palette(opaque[::max(1, len(opaque) // 20000)], NC)
    E, (ox, oy) = sample_fixed(a, pal0, px); py = px
    mask = E >= 0
    ys2, xs2 = np.where(mask); E = E[ys2.min():ys2.max() + 1, xs2.min():xs2.max() + 1]; m = mask[ys2.min():ys2.max() + 1, xs2.min():xs2.max() + 1]
    pal, idx = pal0, np.where(m, E, 0)
    print('rows %d → pitch %.2f' % (ROWS, px))
else:
    G, (px, ox, sx, py, oy, sy) = sample_grid(a)
    print('pitch x %.2f off %.2f (%.2f)  y %.2f off %.2f (%.2f)' % (px, ox, sx, py, oy, sy))
    mask = G[..., 3] >= 160
    ys, xs = np.where(mask); g = G[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; m = mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    pal, lab_i = palette(g[..., :3][m].reshape(-1, 3), NC)
    idx = np.zeros(m.shape, int); idx[m] = lab_i
if '--outline' in sys.argv:   # 바깥 윤곽 한 칸 — 그 인물의 가장 어두운 색. 격자가 칸 반쯤 비껴 원본 윤곽이 투명으로 빠질 때
    from sprite_px import lab
    used = sorted(set(np.unique(idx[m]).tolist())); darkest = min(used, key=lambda k: lab(pal[k:k + 1])[0, 0])
    m2 = np.pad(m, 1); idx = np.pad(idx, 1)
    near = np.zeros_like(m2); near[1:] |= m2[:-1]; near[:-1] |= m2[1:]; near[:, 1:] |= m2[:, :-1]; near[:, :-1] |= m2[:, 1:]
    edge = near & ~m2; idx[edge] = darkest; m = m2 | edge
h, w = m.shape; print('grid sprite', w, h)
assert h <= 126 and w <= 96, (w, h)
cell = np.zeros((128, 96, 4), 'uint8'); x0 = (96 - w) // 2; y0 = 126 - h
cell[y0:y0 + h, x0:x0 + w, :3] = pal[idx]; cell[y0:y0 + h, x0:x0 + w, 3] = np.where(m, 255, 0)
Image.fromarray(cell).save(out)
used = sorted({tuple(int(v) for v in pal[k]) for k in np.unique(idx[m])})
json.dump({'pitch': [round(px, 2), round(py, 2)], 'offset': [round(ox, 2), round(oy, 2)], 'sprite': [w, h], 'cell_offset': [x0, y0], 'foot_y': 126,
           'colours': len(used), 'palette': ['#%02x%02x%02x' % c for c in used]}, open(out + '.json', 'w'), indent=1)
