#!/usr/bin/env python3
"""도트 걷기 뒤 반 주기 만들기 — 생성기가 "가까운 다리가 뒤로" 자세를 못 그려(두 번 다 같은 다리만 앞),
정리한 걷기 시트에서 반 주기(접지·내려앉음·지나감) 세 칸을 고르고 나머지 세 칸은 자세 그대로 다리 표시만 맞바꿔 만든다.

    python3 tools/walk-swap.py <인물> <정리 시트.png> <새 시트.png>

정리 시트는 tools/sprite-sheet.py 결과(96x128 칸 6개). 인물마다 고른 칸과 다리 축(엉덩이 -> 무릎 -> 발목, 칸 안 도트 좌표)은
아래 RECIPE 에 둔다 — 그 시트의 그림을 보고 잡은 값이라 다른 시트에는 맞지 않는다.

- alice: 무늬 스타킹(가까운 다리) <-> 민 스타킹. 축에서 w 안의 화소를 색으로 나눠 바탕색을 맞바꾸고,
  표식(하트·클로버)은 덩어리째 같은 자리(축을 따라 잰 길이)의 다른 다리로 옮긴다. 발목 아래 남색·빨강은 신이라 두지 않는다.
- sunzi: 두 다리 차림이 같고 앞 치마 트임의 맨 허벅지가 가까운 다리 표시 — 그 허벅지는 그늘(앞에 나간 먼 다리)로 낮추고,
  가까운 허벅지를 뒤로 간 장화 쪽으로 새로 그린다.
- chunhyang: 치마가 다리를 가리고 두 신이 같다 — 디딘 발이 앞 -> 가운데 -> 뒤로 미끄러지게 신을 옮기고,
  접지 칸에는 뒤에 남은 발의 앞코를 치마 밑(빈 화소)에 둔다.

docs/ATELIER_PIXEL_ART_PLAN.md 10절 체크포인트(걷기 고침)."""
import sys
import numpy as np
from PIL import Image

W, H = 96, 128


def rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def proj(pts, x, y):
    """꺾은선에 투영 — (t 호 길이, s 부호 있는 거리, d 거리)"""
    best = None; t0 = 0.0
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        vx, vy = bx - ax, by - ay; L = (vx * vx + vy * vy) ** .5
        u = max(0, min(1, ((x - ax) * vx + (y - ay) * vy) / (L * L)))
        px, py = ax + u * vx, ay + u * vy
        d = ((x - px) ** 2 + (y - py) ** 2) ** .5
        s = ((x - ax) * vy - (y - ay) * vx) / L
        if best is None or d < best[2]: best = (t0 + u * L, s, d)
        t0 += L
    return best


def point(pts, t, s):
    t0 = 0.0
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        vx, vy = bx - ax, by - ay; L = (vx * vx + vy * vy) ** .5
        if t <= t0 + L or (bx, by) == pts[-1]:
            u = (t - t0) / L
            if u > 1: return None
            return int(round(ax + u * vx + s * vy / L)), int(round(ay + u * vy - s * vx / L))
        t0 += L


def texswap(fr, legs, fam, w=6, sscale=0.3, ymark=999):
    """legs = {'A': (축, 위, 아래), 'B': ...}. fam: A·B·both·mark 색 모음과 A2B·B2A 바꿈표('#rrggbb')."""
    F = {k: {rgb(c) for c in fam[k]} for k in ('A', 'B', 'both', 'mark')}
    A2B = {rgb(k): rgb(v) for k, v in fam['A2B'].items()}
    B2A = {rgb(k): rgb(v) for k, v in fam['B2A'].items()}
    own = {}
    for y in range(H):
        for x in range(W):
            if fr[y, x, 3] == 0: continue
            c = tuple(int(v) for v in fr[y, x, :3])
            near = {}
            for k, (pts, yt, yb) in legs.items():
                if yt <= y <= yb:
                    t, s, d = proj(pts, x, y)
                    if d <= w: near[k] = (d, t, s)
            if not near: continue
            if c in F['mark'] and y > ymark: continue
            if c in F['A'] or c in F['mark']: k = 'A'
            elif c in F['B']: k = 'B'
            elif c in F['both']: k = min(near, key=lambda q: near[q][0])
            else: continue
            if k in near: own[(x, y)] = (k, c)
    out = fr.copy()
    for (x, y), (k, c) in own.items():
        out[y, x, :3] = (A2B if k == 'A' else B2A).get(c, c)
    bset = {p for p, v in own.items() if v[0] == 'B'}
    amark = {p: c for p, (k, c) in own.items() if k == 'A' and c in F['mark']}
    seen = set()
    for start in list(amark):
        if start in seen: continue
        blob = []; st = [start]; seen.add(start)
        while st:
            q = st.pop(); blob.append(q)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (q[0] + dx, q[1] + dy)
                if n in amark and n not in seen: seen.add(n); st.append(n)
        cx = sum(b[0] for b in blob) / len(blob); cy = sum(b[1] for b in blob) / len(blob)
        t, sv, _ = proj(legs['A'][0], cx, cy)
        p = point(legs['B'][0], t, sv * sscale)
        if not p: continue
        ox, oy = p[0] - round(cx), p[1] - round(cy)
        for (x, y) in blob:
            if (x + ox, y + oy) in bset: out[y + oy, x + ox, :3] = amark[(x, y)]
    return out


def recolour(fr, box, cmap):
    x0, y0, x1, y1 = box; out = fr.copy(); m = {rgb(k): rgb(v) for k, v in cmap.items()}
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c = tuple(int(v) for v in out[y, x, :3])
            if out[y, x, 3] and c in m: out[y, x, :3] = m[c]
    return out


def limb(fr, p0, p1, r0, r1, fill, shade, outline, back=-1):
    """허벅지 한 토막: p0 -> p1 캡슐(반지름 r0 -> r1), 뒤쪽 가장자리는 shade, 1칸 둘레는 outline(양 끝은 이어지게 비운다)."""
    (ax, ay), (bx, by) = p0, p1
    vx, vy = bx - ax, by - ay; L2 = vx * vx + vy * vy; L = L2 ** .5
    inside = np.zeros((H, W), bool); edge = np.zeros((H, W), bool); u_at = np.zeros((H, W))
    for y in range(H):
        for x in range(W):
            u0 = ((x - ax) * vx + (y - ay) * vy) / L2; u_at[y, x] = u0
            u = max(0, min(1, u0))
            d = ((x - ax - u * vx) ** 2 + (y - ay - u * vy) ** 2) ** .5
            r = r0 + (r1 - r0) * u
            if d <= r:
                inside[y, x] = True
                if ((x - ax) * vy - (y - ay) * vx) / L * back > r - 1.6: edge[y, x] = True
    ring = np.zeros_like(inside)
    ring[1:] |= inside[:-1]; ring[:-1] |= inside[1:]; ring[:, 1:] |= inside[:, :-1]; ring[:, :-1] |= inside[:, 1:]
    ring &= ~inside
    out = fr.copy()
    for y, x in zip(*np.nonzero(ring)):
        if out[y, x, 3] and 0.08 <= u_at[y, x] <= 0.92: out[y, x] = (*rgb(outline), 255)
    for y, x in zip(*np.nonzero(inside)):
        out[y, x] = (*rgb(shade if edge[y, x] else fill), 255)
    return out


def stamp(f, src, x, y):
    """빈 화소에만 찍는다 — 치마 뒤에 놓인다"""
    h, w, _ = src.shape
    for j in range(h):
        for i in range(w):
            if src[j, i, 3] and f[y + j, x + i, 3] == 0: f[y + j, x + i] = src[j, i]


def alice(F):
    fam = dict(A={'#fdeacc'}, mark={'#a23337', '#232b44', '#2d4974'}, B={'#cba78e', '#b2856f'}, both={'#edcfb2'},
               A2B={'#fdeacc': '#cba78e', '#edcfb2': '#cba78e', '#a23337': '#cba78e', '#232b44': '#cba78e', '#2d4974': '#cba78e'},
               B2A={'#cba78e': '#fdeacc', '#b2856f': '#edcfb2', '#edcfb2': '#fdeacc'})
    L = {0: {'A': ([(50, 84), (54, 100), (60, 109), (63, 117)], 84, 120), 'B': ([(44, 86), (39, 100), (34, 109), (33, 117)], 86, 120)},
         2: {'A': ([(50, 84), (50, 100), (50, 108), (52, 118)], 84, 120), 'B': ([(46, 84), (45, 94), (42, 100)], 84, 100)},
         5: {'A': ([(48, 84), (48, 100), (48, 108), (50, 118)], 84, 120), 'B': ([(52, 80), (62, 88), (57, 100)], 78, 104)}}
    S = {i: texswap(F[i], L[i], fam, ymark=106) for i in L}
    # 0 접지(무늬 다리 앞) · 2 뒷발 들기 · 5 민 다리 앞으로 | 맞바꾼 0 · 2 · 5
    return [F[0], F[2], F[5], S[0], S[2], S[5]]


def sunzi(F):
    SHADE = {'#fdcca5': '#e49a77', '#fab792': '#af654c', '#e49a77': '#af654c'}
    def R(f, knee):
        return limb(recolour(f, (50, 78, 70, 102), SHADE), (51, 81), knee, 3.2, 2.8, '#fdcca5', '#fab792', '#130e12')
    # 0 접지(맨 허벅지 다리 앞) · 1 뒷발 들기 · 2 의 그늘판(먼 다리 넘기기) | 0 · 1 그늘판 · 2(가까운 다리 넘기기)
    return [F[0], F[1], R(F[2], (53, 101)), R(F[0], (42, 101)), R(F[1], (41, 100)), F[2]]


def chunhyang(F):
    SHOE = F[0][120:126, 54:67].copy()
    TOP = {0: 120, 1: 120, 2: 121, 3: 121, 4: 122, 5: 123}
    X0 = {0: 54, 1: 46, 2: 54, 3: 52, 4: 45, 5: 52}
    def moved(k, x):
        f = F[k].copy(); f[TOP[k]:126, X0[k] - 1:] = 0; stamp(f, SHOE, x, 120); return f
    def toe(f):
        f = f.copy(); stamp(f, SHOE[:, 5:], 41, 120); return f
    return [toe(F[0]), moved(1, 50), F[4], toe(F[3]), moved(4, 50), F[1]]


RECIPE = {'alice': alice, 'sunzi': sunzi, 'chunhyang': chunhyang}

if __name__ == '__main__':
    who, src, out = sys.argv[1:4]
    a = np.array(Image.open(src).convert('RGBA'))
    assert a.shape[:2] == (H, 6 * W), '96x128 칸 6개 시트만'
    F = [a[:, i * W:(i + 1) * W] for i in range(6)]
    Image.fromarray(np.concatenate(RECIPE[who](F), axis=1)).save(out)
    print(out)
