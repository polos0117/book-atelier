"""도트 자료(data/sprites.json) — 꼴과, 그림 저장소가 옆에 받아져 있으면 그림과 맞는지.
   - 인물마다 칸·발 기준선, 상태마다 칸 수·차례(order 의 칸 번호 < 칸 수)·시간(ms 가 차례 길이와 같다)
   - 설계표에 그 책이 있다, 낱말 표에 sprite.name.<인물> 이 있다
   - (../book-atelier-img 가 있으면) 시트 크기 = 칸 × 칸 수, 걷기 빠르기가 보폭과 맞는다(접지 칸 0·3 의 발 폭 ÷ 반 주기, ±15%) — 어긋나면 발이 미끄러진다,
     걷기 dy 로 맞춘 머리 높이가 다리 교차를 따른다(접지 가운데·내려앉음 낮게·지나감 높게)
   python3 tests/sprites-data.py"""
import json, os, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT.parent / 'book-atelier-img' / 'sprites'
sp = json.loads((ROOT / 'data' / 'sprites.json').read_text(encoding='utf-8'))
books = {b['key'] for b in json.loads((ROOT / 'data' / 'book-design.json').read_text(encoding='utf-8'))['books']}
words = (ROOT / 'lib' / 'words.js').read_text(encoding='utf-8')
bad, seen = [], 0
for key, a in sp['actors'].items():
    cw, ch = a['cell']; fx, fy = a['foot']
    if a['book'] not in books: bad.append(f'{key}: 설계표에 책 {a["book"]} 이 없다')
    if f"'sprite.name.{key}'" not in words: bad.append(f'{key}: 낱말 표에 sprite.name.{key} 가 없다')
    if not (0 < fx < cw and 0 < fy <= ch): bad.append(f'{key}: 발 기준선이 칸 밖')
    if 'still' not in a['states'] and 'idle' not in a['states']: bad.append(f'{key}: 정지·대기 둘 다 없다')
    for name, st in a['states'].items():
        n = st.get('frames', 1)
        if 'order' in st:
            if any(not (0 <= i < n) for i in st['order']): bad.append(f'{key} {name}: 차례에 없는 칸')
            if len(st.get('ms', [])) != len(st['order']): bad.append(f'{key} {name}: 시간 수가 차례와 다르다')
        f = IMG / st['file']
        if IMG.exists():
            if not f.exists(): bad.append(f'{key} {name}: 그림 없음 {st["file"]}'); continue
            from PIL import Image
            im = Image.open(f); seen += 1
            if im.size != (cw * n, ch): bad.append(f'{key} {name}: 시트 {im.size} ≠ {cw * n}×{ch}')
            if name == 'walk' and n == 6:
                import numpy as np
                s = np.array(im.convert('RGBA'))[..., 3] > 0; spans = []
                for k in (0, 3):
                    g = s[:, k * cw:(k + 1) * cw]; ys, xs = np.where(g); bot = ys.max(); _, fx2 = np.where(g[bot - 6:bot + 1]); spans.append(fx2.max() - fx2.min())
                want = float(np.mean(spans)) / (sum(st['ms'][i] for i in range(3)) / 1000)
                if 'dy' in st:   # 오르내림이 다리와 맞는다 — 머리 높이 + dy 가 접지 가운데 · 내려앉음 가장 낮다 · 지나감 가장 높다(±0.6, 잘린 칸은 넘어간다)
                    if len(st['dy']) != n: bad.append(f'{key} 걷기: dy 칸 수')
                    head = []
                    for k in range(n):
                        g = s[:, k * cw:(k + 1) * cw]; ys, _ = np.where(g); top, bot = ys.min(), ys.max(); hy, _ = np.where(g[top:top + int(.22 * (bot - top))]); head.append(top + hy.mean())
                    y = np.array(head) + np.array(st['dy']); m = y.mean(); pat = np.array([0, 1, -1, 0, 1, -1])
                    off = [k for k in range(n) if abs(st['dy'][k]) < 2 and abs(y[k] - m - pat[k]) > .6]
                    if off: bad.append(f'{key} 걷기: 오르내림이 다리와 어긋난 칸 {off}')
                if abs(st['speed'] - want) > want * .15: bad.append(f'{key} 걷기: 빠르기 {st["speed"]} 가 보폭 셈 {want:.0f} 와 15% 넘게 다르다 — 발이 미끄러진다')
for b in bad: print('  FAIL', b)
print(('도트 자료: %d 가운데 실패' % len(bad)) if bad else f'PASS 도트 자료 — 인물 {len(sp["actors"])} · 그림 {seen}장' + ('' if IMG.exists() else ' (그림 저장소 없음 — 꼴만)'))
sys.exit(1 if bad else 0)
