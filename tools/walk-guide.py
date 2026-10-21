#!/usr/bin/env python3
"""걷기 다리 자세 안내 그림 — 생성기에 걷기 시트를 시킬 때 세 번째 첨부(docs/ATELIER_PIXEL_ART_PLAN.md 11절 걷기 다시 뽑기).

    python3 tools/walk-guide.py <out.png>

1024×1536, 3×2 칸(341×768) — 생성 시트와 같은 배치. 진한 남색 = 가까운 다리, 회색 = 먼 다리, 엉덩이 높이로 오르내림.
4칸은 1칸의 거울(가까운 다리가 뒤로 뻗고 먼 다리가 앞) — 생성기가 1·3·4·6 칸을 다 "가까운 다리 앞" 으로 그려 다리가 번갈아 나가지 않던 것을 막는다.
무릎은 두 마디 IK(넓적다리·정강이 150px)로 앞으로 굽는다."""
import sys, math
from PIL import Image, ImageDraw
W, H = 1024, 1536; cw, ch = W // 3, H // 2; L = 150
NEAR, FAR = (40, 52, 96), (168, 168, 176)
# 칸마다 (엉덩이 높이 +는 아래, 가까운 발(앞 x, 들림), 먼 발(앞 x, 들림))
P = [(0, (95, 0), (-95, 0)),      # 1 접지 — 가까운 다리 앞(뒤꿈치), 먼 다리 뒤(발끝)
     (10, (45, 0), (-110, 25)),   # 2 내려앉음 — 가까운 다리에 무게, 먼 발이 떨어진다
     (-8, (0, 0), (35, 70)),      # 3 지나감 — 먼 다리가 무릎을 들고 앞으로
     (0, (-95, 0), (95, 0)),      # 4 접지(1의 거울) — 먼 다리 앞, 가까운 다리 뒤로 뻗어 발끝
     (10, (-110, 25), (45, 0)),   # 5 내려앉음 — 먼 다리에 무게
     (-8, (35, 70), (0, 0))]      # 6 지나감 — 가까운 다리가 무릎을 들고 앞으로


def main(out):
    im = Image.new('RGB', (W, H), (250, 248, 244)); d = ImageDraw.Draw(im)

    def leg(hx, hy, fx, fy, col, w):
        dx, dy = fx - hx, fy - hy; n = math.hypot(dx, dy); D = min(n, 2 * L - 1); ux, uy = dx / n, dy / n
        mx, my = hx + ux * D / 2, hy + uy * D / 2; hgt = math.sqrt(max(0, L * L - (D / 2) ** 2))
        nx, ny = uy, -ux
        if nx < 0: nx, ny = -nx, -ny   # 무릎은 앞(+x)으로
        kx, ky = mx + nx * hgt, my + ny * hgt; ex, ey = hx + ux * D, hy + uy * D
        d.line((hx, hy, kx, ky), fill=col, width=w); d.line((kx, ky, ex, ey), fill=col, width=w)
        d.ellipse((kx - w / 2, ky - w / 2, kx + w / 2, ky + w / 2), fill=col)
        d.polygon([(ex - 10, ey - 8), (ex + 36, ey - 4), (ex + 36, ey + 8), (ex - 10, ey + 8)], fill=col)

    for i, (bob, near, far) in enumerate(P):
        cx = (i % 3) * cw + cw // 2; top = (i // 3) * ch; ground = top + 700; hip = ground - 2 * L + 8 + bob
        d.rounded_rectangle((cx - 42, hip - 250, cx + 42, hip + 12), radius=30, fill=(226, 223, 216))
        d.ellipse((cx - 38, hip - 345, cx + 38, hip - 262), fill=(226, 223, 216))
        for (fx, lift), col, w, o in [(far, FAR, 28, -6), (near, NEAR, 32, 6)]:
            leg(cx + o, hip, cx + o + fx, ground - lift, col, w)
        d.line(((i % 3) * cw + 16, ground + 10, (i % 3) * cw + cw - 16, ground + 10), fill=(205, 200, 192), width=3)
        d.text(((i % 3) * cw + 14, top + 14), str(i + 1), fill=(130, 125, 118))
    im.save(out)


if __name__ == '__main__':
    main(sys.argv[1])
