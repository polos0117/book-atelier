#!/usr/bin/env python3
"""걷기 시트의 몸 오르내림을 다리와 맞추는 칸마다 dy(도트 화소) — data/sprites.json 의 walk.dy 에 넣는다.

    python3 tools/sprite-bob.py <걷기 시트.png> [--cell 96x128] [--bob 1]

6칸 걷기의 차례: 0 접지(가운데) · 1 내려앉음(가장 낮다) · 2 지나감(가장 높다) · 3 접지 · 4 내려앉음 · 5 지나감.
생성기가 그린 머리 높이(위 22% 의 무게중심)를 이 곡선(평균 ± bob)에 맞추는 만큼 칸을 위아래로 옮긴다(+ 는 아래).
발이 땅에서 뜨지 않게 ±2 로 자른다. 발밑 그림자는 lib/sprite-actor.js 가 반대로 옮겨 땅에 둔다."""
import sys, json
from PIL import Image
import numpy as np
src = sys.argv[1]
cw, ch = (int(v) for v in (sys.argv[sys.argv.index('--cell') + 1] if '--cell' in sys.argv else '96x128').split('x'))
bob = float(sys.argv[sys.argv.index('--bob') + 1]) if '--bob' in sys.argv else 1.0
s = np.array(Image.open(src).convert('RGBA'))[..., 3] > 0
n = s.shape[1] // cw; assert n == 6, '걷기 6칸만'
head = []
for k in range(n):
    f = s[:, k * cw:(k + 1) * cw]; ys, _ = np.where(f); top, bot = ys.min(), ys.max()
    hy, _ = np.where(f[top:top + int(.22 * (bot - top))]); head.append(top + hy.mean())
head = np.array(head); m = head.mean(); want = m + bob * np.array([0, 1, -1, 0, 1, -1])
dy = np.clip(np.round((want - head) * 3) / 3, -2, 2)   # 3분의 1 도트까지(화소비 3 기기의 실제 화소)
print(json.dumps({'head': [round(float(v), 2) for v in head], 'dy': [round(float(v), 2) for v in dy]}))
