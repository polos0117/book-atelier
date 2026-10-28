"""도트 정리 공용 — 격자 찾기·칸 가운데 색 뽑기·Lab 팔레트. tools/sprite-grid.py(정지 한 장)와 tools/sprite-sheet.py(동작 시트)가 같이 쓴다."""
import numpy as np


def best_pitch(e, lo=9.5, hi=14.0):
    """경계 세기 e(한 축)에서 도트 간격·시작점을 고른다 — 격자선 위 경계가 평균보다 가장 센 것."""
    top = (0, 0, 0)
    for p in np.arange(lo, hi, 0.02):
        for o in np.arange(0, p, 0.25):
            idx = np.round(np.arange(o, len(e) - 1, p)).astype(int); idx = idx[idx < len(e)]
            sc = e[idx].mean() / e.mean()
            if sc > top[0]: top = (sc, p, o)
    return top


def best_square(ex, ey, lo, hi):
    """두 축이 같은 간격이라 보고 고른다 — 프레임 하나처럼 작은 조각에서 한 축만 보면 간격이 엇나간다."""
    top = (0, 0, 0, 0, 0, 0)
    for p in np.arange(lo, hi, 0.02):
        bx = max((ex[np.round(np.arange(o, len(ex) - 1, p)).astype(int)].mean() / ex.mean(), o) for o in np.arange(0, p, 0.25))
        by = max((ey[np.round(np.arange(o, len(ey) - 1, p)).astype(int)].mean() / ey.mean(), o) for o in np.arange(0, p, 0.25))
        if bx[0] + by[0] > top[0] + top[3]: top = (bx[0], p, bx[1], by[0], p, by[1])
    return top


def sample_grid(a, lo=9.5, hi=14.0, square=False):
    """RGBA 배열 a(float) → 칸 가운데 중앙값 색의 작은 격자 G, 그리고 (간격 x, 시작 x, 점수 x, 간격 y, 시작 y, 점수 y)."""
    rgb = a[..., :3]
    ex = np.abs(np.diff(rgb, axis=1)).sum(-1).sum(0)   # 열 경계 세기
    ey = np.abs(np.diff(rgb, axis=0)).sum(-1).sum(1)
    if square: sx, px, ox, sy, py, oy = best_square(ex, ey, lo, hi)
    else: (sx, px, ox), (sy, py, oy) = best_pitch(ex, lo, hi), best_pitch(ey, lo, hi)
    cx = np.arange(ox + px / 2, a.shape[1], px); cy = np.arange(oy + py / 2, a.shape[0], py)
    G = np.zeros((len(cy), len(cx), 4))
    r = max(1, int(min(px, py) * 0.25))
    for j, y in enumerate(cy):
        for i, x in enumerate(cx):
            yi, xi = int(y), int(x)
            blk = a[max(0, yi - r):yi + r + 1, max(0, xi - r):xi + r + 1].reshape(-1, 4)
            G[j, i] = np.median(blk, axis=0)
    return G, (px, ox, sx, py, oy, sy)


def lab(c):
    c = np.asarray(c, float) / 255; c = np.where(c > .04045, ((c + .055) / 1.055) ** 2.4, c / 12.92)
    X = c @ np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]]).T / [.9505, 1, 1.089]
    f = np.where(X > .008856, np.cbrt(X), 7.787 * X + 16 / 116)
    return np.stack([116 * f[:, 1] - 16, 500 * (f[:, 0] - f[:, 1]), 200 * (f[:, 1] - f[:, 2])], 1)


def palette(src_c, NC):
    """칸 색을 Lab 거리로 NC 묶음 — 무게 없이 서로 먼 색을 먼저 씨앗으로(빨강·금 같은 작은 강조색이 갈색에 먹히지 않게). (팔레트, 칸마다 번호)"""
    L = lab(src_c)
    cent = [L[np.argmin(L[:, 0])]]
    for _ in range(NC - 1):
        d = np.min([((L - c) ** 2).sum(1) for c in cent], 0); cent.append(L[np.argmax(d)])
    cent = np.array(cent)
    for _ in range(12):
        lab_i = np.argmin(((L[:, None] - cent[None]) ** 2).sum(-1), 1)
        cent = np.array([L[lab_i == k].mean(0) if (lab_i == k).any() else cent[k] for k in range(NC)])
    lab_i = np.argmin(((L[:, None] - cent[None]) ** 2).sum(-1), 1)
    pal = np.array([np.median(src_c[lab_i == k], 0) if (lab_i == k).any() else [0, 0, 0] for k in range(NC)]).round().astype(int)
    return pal, lab_i


def nearest(src_c, pal):
    """정해진 팔레트에서 Lab 거리로 가장 가까운 색 번호."""
    return np.argmin(((lab(src_c)[:, None] - lab(pal)[None]) ** 2).sum(-1), 1)


def bounds(e, p, n):
    """느슨한 격자 — 생성 그림의 도트는 10~13px 로 들쭉날쭉해 고정 간격이 칸 경계를 밟는다. 다음 경계를 b+0.7p ~ b+1.35p 에서 가장 센 경계로."""
    e = np.convolve(e, [.25, .5, .25], 'same')
    b = [int(np.argmax(e[:int(p * 1.5)]))]
    while b[-1] + p * .7 < n - 1:
        lo, hi = int(b[-1] + p * .7), min(n - 1, int(b[-1] + p * 1.35) + 1)
        if lo >= hi: break
        b.append(lo + int(np.argmax(e[lo:hi])))
    while b[0] - p * .7 > 0:
        lo, hi = max(0, int(b[0] - p * 1.35)), int(b[0] - p * .7) + 1
        b.insert(0, lo + int(np.argmax(e[lo:hi])))
    return b


def sample_elastic(a, pal, lo=9, hi=14, pitch=None):
    """RGBA 배열 a(float) → 칸마다 팔레트 번호(-1 은 투명)의 작은 격자와 간격. 칸 안쪽 절반에서 가장 많은 팔레트 색을 고른다.
    pitch 를 주면 그 간격을 쓴다(프레임마다 따로 찾으면 간격이 조금씩 달라 키가 들쭉날쭉해진다)."""
    rgb = a[..., :3]
    ex = np.abs(np.diff(rgb, axis=1)).sum(-1).sum(0); ey = np.abs(np.diff(rgb, axis=0)).sum(-1).sum(1)
    p = pitch or best_square(ex, ey, lo, hi)[1]
    bx, by = bounds(ex, p, a.shape[1]), bounds(ey, p, a.shape[0])
    solid = a[..., 3] >= 160
    idx = np.full(a.shape[:2], -1); idx[solid] = nearest(rgb[solid], pal)
    G = np.full((len(by) - 1, len(bx) - 1), -1)
    for j in range(len(by) - 1):
        for i in range(len(bx) - 1):
            y0, y1, x0, x1 = by[j] + 1, by[j + 1] + 1, bx[i] + 1, bx[i + 1] + 1
            sy, sx = max(1, (y1 - y0) // 4), max(1, (x1 - x0) // 4)
            blk = idx[y0 + sy:y1 - sy, x0 + sx:x1 - sx].ravel()
            if blk.size == 0: blk = idx[y0:y1, x0:x1].ravel()
            v, c = np.unique(blk, return_counts=True)
            G[j, i] = v[np.argmax(c)]
    return G, p


def sample_fixed(a, pal, p, dark=0.3):
    """간격 p 로 고정한 고른 격자 — 시작점만 경계 세기로 고르고, 칸 안쪽에서 가장 많은 팔레트 색. 줄 수가 정확히 맞는다(인물끼리 키 맞추기).
    dark: 어두운 색(윤곽·눈, Lab L 35 아래)이 칸의 이만큼을 넘으면 그 색 — 칸보다 잘게 그린 눈·윤곽이 살색에 먹히지 않게"""
    rgb = a[..., :3]
    ex = np.abs(np.diff(rgb, axis=1)).sum(-1).sum(0); ey = np.abs(np.diff(rgb, axis=0)).sum(-1).sum(1)
    def off(e):
        return max((e[np.round(np.arange(o, len(e) - 1, p)).astype(int)].mean(), o) for o in np.arange(0, p, 0.25))[1]
    ox, oy = off(ex), off(ey)
    solid = a[..., 3] >= 160
    idx = np.full(a.shape[:2], -1); idx[solid] = nearest(rgb[solid], pal)
    xs = np.arange(ox, a.shape[1] - 1, p); ys = np.arange(oy, a.shape[0] - 1, p)
    G = np.full((len(ys) - 1, len(xs) - 1), -1)
    q = p / 8
    darkset = set(np.where(lab(pal)[:, 0] < 35)[0].tolist())
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            blk = idx[int(ys[j] + q):int(ys[j + 1] - q) + 1, int(xs[i] + q):int(xs[i + 1] - q) + 1].ravel()
            v, c = np.unique(blk, return_counts=True)
            pick = v[np.argmax(c)]
            if pick >= 0 and dark:
                d = [(n, k) for k, n in zip(v, c) if k in darkset]
                if d and max(d)[0] >= dark * blk.size: pick = max(d)[1]
            G[j, i] = pick
    return G, (ox, oy)
