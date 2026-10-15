"""책 설계표 검사. python3 tests/book-design.py
   - 실제 자료(data/book-design.json)가 통과한다
   - 규칙을 하나씩 어긴 자료가 그 이유로 걸린다"""
import copy, importlib.util, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('bd', ROOT / 'tools' / 'book-design.py')
B = importlib.util.module_from_spec(spec); spec.loader.exec_module(B)
doc = json.loads((ROOT / 'data' / 'book-design.json').read_text(encoding='utf-8'))
assert B.check(doc) == [], B.check(doc)


def fails(mutate, why):
    d = copy.deepcopy(doc); mutate(d)
    errs = B.check(d)
    assert any(why in e for e in errs), (why, errs)

# 실루엣·얼굴이 닮은 두 책 — 삼국지·손자병법 예시에서 본 문제
def twin(d):
    a, c = d['books'][0], d['books'][1]
    c['silhouette'] = dict(a['silhouette'], pose=c['silhouette']['pose'])
    c['face'] = dict(a['face'], lips=c['face']['lips'])
fails(twin, '실루엣 축 6 중')
fails(twin, '얼굴 5 묶음 중')
fails(lambda d: d['books'][0]['silhouette'].update(hair='mohawk'), '정한 말이 아니다')
fails(lambda d: d['books'][0].update(author_death=1996), '아직 보호 중')                    # 세이건 『코스모스』
fails(lambda d: d['books'][0].update(quote_source='국내 번역본'), '인용 출처')
fails(lambda d: d['books'][0]['opens']['결말'].update(one_figure=False), '한 명')
fails(lambda d: d['books'][0]['rule'].update(counter=''), '대응')
fails(lambda d: d['books'][0]['rule']['forms'].pop('전개'), '폼별 사용법')
fails(lambda d: d['books'][0]['forms'].pop('결말'), '셋씩')
fails(lambda d: [f.update(role='공격') for f in d['books'][0]['forms'].values()], '역할이 다 같다')
fails(lambda d: d['books'][0].update(symbols=['풍차']), '상징은 셋')
fails(lambda d: d['books'][0]['arc'].update(answer=''), 'answer')
fails(lambda d: d['books'][1].update(genre=d['books'][0]['genre']), '장르가 같다')
fails(lambda d: d['books'][4].pop('anonymous'), '사망 연도')
print('PASS 책 설계표: %d권 통과 · 실루엣·얼굴 닮음 · 정한 말 · 저작권 · 인용 출처 · 한 명 개방 · 대응 · 폼·개방 셋 · 역할 · 시범 장르' % len(doc['books']))
