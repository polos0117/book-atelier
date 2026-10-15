"""브라우저 검사용 가짜 그림 — 색 판에 이름을 적은 webp 를 만들고, 실제 등록기로 img.json 을 짜서 찍는다.
   python3 tests/fixtures/make-art.py <자리>   → <자리>/img/*.webp 를 만들고 img.json 을 표준 출력으로
그림 차례는 일부러 고르지 않다 — 빈 자리·화풍 둘·연출컷·일상컷이 다 있어야 서가의 갈래를 다 본다."""
import contextlib, importlib.util, io, json, sys
from pathlib import Path
from unittest.mock import patch
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
spec = importlib.util.spec_from_file_location('reg', ROOT / 'tools' / 'register-images.py')
reg = importlib.util.module_from_spec(spec); spec.loader.exec_module(reg)

S, T = 'literary_fantasy', 'style_trial'      # 둘째 화풍은 검사 때만 있는 열쇠
NAMES = []
for book in ('don_quixote', 'alice', 'frankenstein'):
    for form in ('begin', 'middle', 'end', 'begin_open', 'middle_open', 'end_open'):
        NAMES.append(f'{book}_{form}_{S}_f.webp')
NAMES.remove(f'frankenstein_end_open_{S}_f.webp')                      # 빈 자리 하나
NAMES += [f'don_quixote_middle_{S}_f_action1.webp', f'don_quixote_{S}_f_casual1.webp', f'don_quixote_{S}_f_casual2.webp',
          f'alice_{S}_f_extra1.webp', f'don_quixote_middle_{T}_f.webp', f'kosmos_begin_{S}_f.webp']
COLORS = [(170, 70, 60), (60, 110, 170), (80, 150, 90), (160, 130, 50), (120, 80, 160), (60, 140, 150)]


def main(out):
    d = Path(out) / 'img'; d.mkdir(parents=True, exist_ok=True)
    for i, n in enumerate(NAMES):
        im = Image.new('RGB', (200, 300), COLORS[i % len(COLORS)])
        ImageDraw.Draw(im).text((8, 8), n.replace('_', ' ')[:60], fill=(255, 255, 255))
        im.save(d / n, 'WEBP', quality=60)
    real = reg.roster.read
    styles = dict(reg.roster.styles(), **{T: 'trial'})
    saved = {}
    with patch.object(reg, 'IMG_DIR', str(d)), patch.object(reg, 'EXTRA_DIRS', []), \
         patch.object(reg.roster, 'read', side_effect=lambda n: {'img': {}} if n == 'img' else real(n)), \
         patch.object(reg.roster, 'styles', return_value=styles), \
         patch.object(reg.roster, 'art_size', return_value=[]), \
         patch.object(reg.roster, 'write', side_effect=lambda n, doc: saved.update(doc)), \
         patch.object(sys, 'argv', ['register-images.py']), contextlib.redirect_stdout(io.StringIO()):
        reg.main()
    print(json.dumps(saved, ensure_ascii=False))


if __name__ == '__main__':
    main(sys.argv[1])
