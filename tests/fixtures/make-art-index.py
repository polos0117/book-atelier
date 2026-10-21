"""브라우저 검사용 조각 색인 — make-art.py 가 만든 가짜 그림의 모자이크 서명을 셈해 art-index.json 꼴로 찍는다.
   python3 tests/fixtures/make-art-index.py <자리>   → <자리>/img/*.webp 를 읽고 JSON 을 표준 출력으로
실제 색인은 rust/art-index 가 만든다(docs/ART_INDEX.md). 여기는 그 꼴과 Lab 서명(2×3 칸 + 평균)만 흉내 낸다 —
검사가 cargo 없이도 돌게. 그림을 20×30 으로 줄여(칸 하나 = 10×10 화소 평균) 화소마다 Lab 으로 바꿔 평균 낸다.
dHash·색 막대는 자리만 채운다(모자이크는 안 쓴다)."""
import json, sys
from pathlib import Path
from PIL import Image


def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def f(t):
    return t ** (1 / 3) if t > 216 / 24389 else (24389 / 27 * t + 16) / 116


def lab(r, g, b):
    r, g, b = lin(r), lin(g), lin(b)
    x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
    z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883
    return 116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))


def signature(path):
    im = Image.open(path).convert('RGB').resize((20, 30), Image.BOX)
    px = im.load()
    cells = []
    for j in range(3):
        for i in range(2):
            acc = [0.0, 0.0, 0.0]
            for y in range(j * 10, j * 10 + 10):
                for x in range(i * 10, i * 10 + 10):
                    for d, v in enumerate(lab(*px[x, y])):
                        acc[d] += v
            cells.append([v / 100 for v in acc])
    mean = [sum(c[d] for c in cells) / 6 for d in range(3)]
    return [max(-128, min(127, round(v))) for c in cells + [mean] for v in c]


def main(out):
    files = {}
    for p in sorted((Path(out) / 'img').glob('*.webp')):
        files[p.name] = {'dhash': '0' * 16, 'hist': 'AAAA' * 21 + 'AA==', 'lab': signature(p)}
    print(json.dumps({'count': len(files), 'files': files, 'grid': [2, 3], 'note': 'fixture', 'version': 1}, sort_keys=True))


if __name__ == '__main__':
    main(sys.argv[1])
