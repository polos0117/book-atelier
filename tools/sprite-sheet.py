#!/usr/bin/env python3
"""도트 동작 시트 정리 — 생성기가 한 장에 격자로 그린 프레임들을 찾아, 프레임마다 도트 격자를 다시 찾고,
확정한 정지 도트의 팔레트로 색을 맞춘 뒤, 같은 칸 크기·같은 발 기준선·같은 몸 중심으로 가로 한 줄 시트를 만든다.

    python3 tools/sprite-sheet.py <생성 시트.png> <정리 시트.png> --frames N --palette <정지 도트.png> [--pitch 9,14 | --fixed-pitch 11.6] [--cell 40x68]

- 격자: 프레임마다 두 축 같은 간격을 찾거나(--fixed-pitch 면 모든 프레임 같은 간격 — 한 인물의 시트들은 이쪽), 경계는 느슨하게(10~13px 로 들쭉날쭉한 생성 도트를 따라) 잡아 칸 안쪽 절반에서 가장 많은 색.
- 프레임 찾기: 알파 160 이상 화소의 빈 가로줄로 줄을 나누고, 그 줄 안의 빈 세로줄로 프레임을 나눈다(칸 경계에 걸쳐 그려도 된다).
  폭이 좁은 조각(60px 미만)은 프레임이 아니다.
- 색: 정지 도트에 쓰인 색 중 Lab 거리로 가장 가까운 것 — 시트끼리, 정지 도트와 색이 같다.
- 떨어진 조각: 몸에서 떨어진 작은 덩어리(--speck 칸 미만, 기본 6)는 지운다. 요청하지 않은 반짝이·강조선 같은 것.
- 줄 세우기: 발(가장 아래 줄)을 칸 바닥에서 2칸 위에, 가로는 몸 위쪽 45%(머리·몸통)의 무게중심을 칸 가운데에.
- 옆에 <정리 시트>.json(칸 크기·프레임 수·프레임마다 격자 간격·크기·자리)을 둔다. docs/ATELIER_PIXEL_ART_PLAN.md 5절."""
import sys, os, json, argparse
from PIL import Image
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sprite_px import sample_elastic

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--frames', type=int, required=True)
ap.add_argument('--palette', required=True)
ap.add_argument('--pitch', default='9,14', help='도트 간격 찾는 범위(px) — 프레임마다 두 축 같은 간격으로 찾는다')
ap.add_argument('--speck', type=int, default=6, help='몸에서 떨어진 덩어리를 지우는 크기(칸 수 미만)')
ap.add_argument('--cell', help='칸 크기 WxH — 한 인물의 시트끼리 맞춘다')
ap.add_argument('--fixed-pitch', type=float, help='모든 프레임에 같은 간격(px) — 시트끼리 키를 맞출 때')
args = ap.parse_args()
lo, hi = (float(v) for v in args.pitch.split(','))

a = np.array(Image.open(args.src).convert('RGBA')).astype(float)
solid = a[..., 3] >= 160


def runs(v, minlen):
    """참인 칸이 이어지는 구간들."""
    out, start = [], None
    for i, x in enumerate(list(v) + [False]):
        if x and start is None: start = i
        if not x and start is not None:
            if i - start >= minlen: out.append((start, i))
            start = None
    return out


boxes = []
for y0, y1 in runs(solid.any(1), 60):
    for x0, x1 in runs(solid[y0:y1].any(0), 60):
        boxes.append((x0, y0, x1, y1))
assert len(boxes) == args.frames, '프레임 %d 개를 찾았다(기대 %d): %s' % (len(boxes), args.frames, boxes)

still = np.array(Image.open(args.palette).convert('RGBA'))
pal = np.unique(still[still[..., 3] > 0][:, :3], axis=0)


def keep_body(m):
    """가장 큰 덩어리와 이웃한 것만 남기고, 떨어진 작은 덩어리(칸 --speck 개 미만)는 지운다."""
    lab = np.zeros(m.shape, int); n = 0; sizes = {}
    for y, x in zip(*np.where(m)):
        if lab[y, x]: continue
        n += 1; stack = [(y, x)]; lab[y, x] = n; c = 0
        while stack:
            cy, cx = stack.pop(); c += 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = n; stack.append((ny, nx))
        sizes[n] = c
    big = max(sizes, key=sizes.get)
    keep = {k for k, c in sizes.items() if k == big or c >= args.speck}
    return np.isin(lab, list(keep)), sum(c for k, c in sizes.items() if k not in keep)


frames, info = [], []
for (x0, y0, x1, y1) in boxes:
    pad = 4
    crop = a[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad]
    G, p = sample_elastic(crop, pal, lo, hi, args.fixed_pitch)
    m = G >= 0
    ys, xs = np.where(m); G = G[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    m, dropped = keep_body(m)
    ys, xs = np.where(m); G = G[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    rgb = np.zeros(G.shape + (3,), int); rgb[m] = pal[G[m]]
    h, w = m.shape
    top = m[:max(1, int(h * .45))]; cx = np.where(top)[1].mean()
    frames.append((rgb, m)); info.append({'box_px': [int(x0), int(y0), int(x1), int(y1)], 'pitch': round(float(p), 2), 'size': [w, h],
                                          'anchor_x': round(float(cx), 2), 'dropped_specks': int(dropped)})

H = max(f[1].shape[0] for f in frames) + 2   # 발(가장 아래 줄)이 H-3 — 정지 도트의 foot_y 126(칸 128)과 같은 뜻
reach = max(max(i['anchor_x'], i['size'][0] - i['anchor_x']) for i in info)
W = int(np.ceil((2 * reach + 4) / 2) * 2)
if args.cell:   # 한 인물의 시트들은 같은 칸 — 화면의 배우 상자가 상태를 바꿔도 그대로
    cw, ch = (int(v) for v in args.cell.split('x'))
    assert cw >= W and ch >= H, '칸 %dx%d 가 프레임보다 작다(%dx%d)' % (cw, ch, W, H)
    W, H = cw, ch
sheet = np.zeros((H, W * len(frames), 4), 'uint8')
for k, ((rgb, m), i) in enumerate(zip(frames, info)):
    h, w = m.shape
    gx = k * W + int(round(W / 2 - i['anchor_x'])); gy = H - 2 - h
    sheet[gy:gy + h, gx:gx + w, :3][m] = rgb[m]; sheet[gy:gy + h, gx:gx + w, 3][m] = 255
    i['at'] = [gx - k * W, gy]
Image.fromarray(sheet).save(args.out)
json.dump({'src': os.path.basename(args.src), 'cell': [W, H], 'frames': len(frames), 'foot_y': H - 2, 'palette_from': os.path.basename(args.palette),
           'colours': int(len(np.unique(sheet[sheet[..., 3] > 0][:, :3], axis=0))), 'frame': info}, open(args.out + '.json', 'w'), indent=1)
print('cell', W, H, 'frames', len(frames), [i['size'] for i in info], 'pitch', [i['pitch'] for i in info], 'specks', [i['dropped_specks'] for i in info])
