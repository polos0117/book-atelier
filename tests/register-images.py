"""그림 등록 — 폼 초상·개방·연출컷·일상컷이 제자리에, 틀린 이름은 저장하지 않고 실패. python3 tests/register-images.py"""
import contextlib, copy, importlib.util, io, sys, tempfile
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
spec = importlib.util.spec_from_file_location('register_images', ROOT / 'tools' / 'register-images.py')
reg = importlib.util.module_from_spec(spec); spec.loader.exec_module(reg)

# 실제 자료의 열쇠를 쓴다 — 설계표·화풍 기록과 등록기가 같은 말을 하는지도 같이 본다
forms = reg.roster.forms()
styles = reg.roster.styles()
assert list(forms) == ['begin', 'middle', 'end'], forms
assert 'literary_fantasy' in styles and 'don_quixote' in reg.roster.cards()
S = 'literary_fantasy'


real_read = reg.roster.read


def run(doc, folder, argv=()):
    """img.json 만 바꿔 끼우고 설계표·화풍 기록은 실제 것을 읽는다. 매번 새로 읽어 앞 차례가 고친 것이 새지 않게"""
    out = io.StringIO()
    with patch.object(reg, 'IMG_DIR', folder), patch.object(reg, 'EXTRA_DIRS', []), \
         patch.object(reg.roster, 'read', side_effect=lambda n: copy.deepcopy(doc) if n == 'img' else real_read(n)), \
         patch.object(reg.roster, 'art_size', return_value=[]), \
         patch.object(reg.roster, 'write') as write, \
         patch.object(sys, 'argv', ['register-images.py', *argv]), contextlib.redirect_stdout(out):
        try:
            reg.main(); code = 0
        except SystemExit as e:
            code = e.code
    return code, (write.call_args[0][1] if write.called else None), out.getvalue()


with tempfile.TemporaryDirectory() as d:
    names = {'begin': f'don_quixote_begin_{S}_f.webp', 'middle': f'don_quixote_middle_{S}_f.webp',
             'end_open': f'don_quixote_end_open_{S}_f.webp'}
    act = f'don_quixote_middle_{S}_f_action1.webp'
    cas = f'don_quixote_{S}_f_casual2.webp'
    for n in [*names.values(), act, cas, 'style-sample.webp']:
        (Path(d) / n).touch()
    code, saved, out = run({'img': {}}, d)
    assert code == 0 and saved, out
    b = saved['img']['don_quixote']['byStyle'][S]
    assert {k: v['f'] for k, v in b['byForm'].items()} == names
    assert b['byForm']['middle']['action']['f'] == [act]
    assert b['casual']['f'] == [cas]
    assert saved['count'] == 1
    # 다시 돌려도 겹치지 않는다
    code, again, out = run(saved, d)
    assert code == 0 and reg.listed_files(again['img']) == set([*names.values(), act, cas]), out

    # 틀린 이름은 하나라도 있으면 아무것도 저장하지 않는다
    for bad, why in [(f'don_quixote_prologue_{S}_f.webp', '열쇠'),        # 없는 폼
                     (f'no_such_book_begin_{S}_f.webp', '열쇠'),          # 없는 책
                     (f'alice_begin_watercolor_f.webp', '화풍 열쇠'),      # 없는 화풍 → 책 이름으로 읽혀 실패
                     (f'alice_begin_{S}.webp', '이름 꼴'),               # 성별 표시 없음
                     (f'alice_begin_{S}_f_casual1.webp', '폼에는')]:     # 일상컷은 폼을 안 탄다
        p = Path(d) / bad; p.touch()
        code, s2, out = run(saved, d)
        assert code == 1 and s2 is None and why in out, (bad, out)
        p.unlink()
    # 같은 자리 둘
    (Path(d) / f'don_quixote_{S}_f_casual02.webp').touch()
    code, s2, out = run({'img': {}}, d)
    assert code == 1 and '중복' in out, out
print('PASS 그림 등록: 폼 초상·개방·연출컷·일상컷 자리 · 다시 돌려도 그대로 · 없는 폼·책·화풍·성별 표시·폼 붙은 일상컷·같은 자리는 저장 안 함')
