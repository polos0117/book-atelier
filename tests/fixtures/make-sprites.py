"""브라우저 검사용 가짜 도트 시트 — data/sprites.json 의 칸·칸 수대로, 칸마다 색이 다른 사람 꼴을 투명 바탕에 그린다.
   python3 tests/fixtures/make-sprites.py <자리>   → <자리>/sprites/<인물 파일> 들
칸 색으로 지금 몇 번째 칸인지 화면에서 알 수 있다(검사는 data-frame 을 보지만, 눈으로 볼 때를 위해)."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]


def main(out):
    data = json.loads((ROOT / 'data' / 'sprites.json').read_text(encoding='utf-8'))
    for key, a in data['actors'].items():
        cw, ch = a['cell']; fx, fy = a['foot']
        for name, st in a['states'].items():
            n = st.get('frames', 1)
            im = Image.new('RGBA', (cw * n, ch), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
            for k in range(n):
                c = ((60 + 40 * k) % 256, (140 + 70 * (sum(map(ord, name)) % 3)) % 256, (200 - 30 * k) % 256, 255)
                x = k * cw + fx
                d.ellipse((x - 10, fy - 120, x + 10, fy - 98), fill=c)             # 머리
                d.rectangle((x - 14, fy - 98, x + 14, fy - 40), fill=c)           # 몸
                d.rectangle((x - 12, fy - 40, x - 3, fy - 1), fill=c)             # 다리
                d.rectangle((x + 3, fy - 40, x + 12, fy - 1), fill=c)
            f = Path(out) / 'sprites' / st['file']; f.parent.mkdir(parents=True, exist_ok=True); im.save(f)


if __name__ == '__main__':
    main(sys.argv[1])
