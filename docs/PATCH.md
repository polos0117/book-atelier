# 패치 기록

파일을 고친 쪽이 직접 한 칸 적는다. 규칙은 `AGENTS.md` 의 "4. 고쳤으면 적는다" 에 있다.

모양은 두 줄이 전부다. 한 칸은 `##` 으로 시작하고 `날짜 · 누가 · 무엇을 바꿨나` 를
가운뎃점으로 나눈다. 그 아래 `-` 줄에 `파일 — 왜/무엇` 을 파일마다 하나씩 적는다.
날짜는 `2026-10-15` 꼴, 누가는 `claude` 또는 `gpt`, 새 칸이 위로 간다.
이 안내글은 첫 `##` 앞이라 읽히지 않는다. `node tests/patch.cjs` 가 모양을 본다.

## 2026-10-15 · claude · 화면 옮기기 — 서재·서가·생성기·그림 등록
- index.html · lib/workspace-*.js · lib/workspace.css · lib/fresh.js · lib/words.js — pkm 의 껍데기(머리·항해·테마 여덟·밀도·새 판 알림·패치 기록)를 책 말로. 문양은 책 모양 여덟, 서재 진열대는 myth 신전 홀을 책장·마루로 바꿨다.
- dex.html · lib/dex-filter.js — 서가. pkm 도감 기능(거르기·나란히 보기 폼 셋/개방 셋·넘기기·책 넘기기·뒤로 가기·목록 자리) + myth(화풍 비교 띠·크게 보기·바로가기·진열) + 건담(그림 없음·빈 자리 있음·진척·생성기로 가는 길). 책의 인격·질문과 답·고유 규칙·세 폼·설계를 보인다. 시범 자리에 표.
- prompt.html · lib/prompt-spec.js · lib/prompt-book.js · lib/prompt-random.js · lib/prompt-ui.js · lib/figures.js · lib/prompt.css — 생성기. 폼 초상(새 인물·이어가기)·개방·일상컷. 설계표 줄(인격·물성·실루엣 6·얼굴 5·폼 모습·명장면)과 data/style.json 판 전문을 싣는다. pkm 의 외형 잠금·무작위·체형/머리 그림·장면 랜덤과 잠금·일상컷 갈래(포켓몬 전용 갈래는 빼고 "서고의 일상")·건담의 되돌리기·직전 책 외형·기록 내보내기·✓◐ 표시·myth 의 일상컷 번호·화풍 판.
- lib/img.js · tools/register-images.py · tools/roster.py · tools/make-thumbs.py · .github/workflows/register-images.yml · data/img.json — 그림 등록. 이름 꼴 <책>_<폼>[_open]_<화풍>_f.webp, 일상컷 <책>_<화풍>_f_casualN.webp. 그림 저장소에 썸네일 워크플로·records/·pilot/ 자리.
- data/book-design.json · tools/book-design.py — vocab.form_key(발단 begin·전개 middle·결말 end)와 책 열쇠 꼴(영문 소문자·숫자·밑줄)을 검사에 더했다.
- tests/* — register-images.py · img-shards · prompt-book · dex-screen · prompt-screen · header-layout · theme-screen · patch-screen · words. 가짜 그림은 tests/fixtures/make-art.py 가 실제 등록기로 짠다.
- IMAGE_RULES.md · docs/PORT_NOTES.md · AGENTS.md · README.md · docs/GAME_CONCEPT.md · docs/ART_STYLE.md — 그림 규칙, 가져온 것과 뺀 것, 화면·검사 목록.

## 2026-10-15 · claude · 화풍 기록 — literary_fantasy v1
- data/style.json — 공통 화풍 블록 literary_fantasy v1(전문·채택일·근거·참고 그림 자리). 판은 따로 쌓고 옛 판은 지우지 않는다. 기준 화풍은 화풍별 비교 뒤에 정한다.
- docs/ART_STYLE.md — 화풍 블록을 쓰는 법과 시험 네 장에서 확인한 것(책마다 다른 색, 금장식 강제 없음, 어두운 장면의 반실사 미끄러짐, 얼굴 닮음).
- AGENTS.md — 먼저 읽을 것에 화풍 문서를 더했다.

## 2026-10-15 · claude · 저장소 시작 — 기획·책 설계표·검사
- docs/GAME_CONCEPT.md — 대화로 정한 구조를 옮겼다: 한 책 하나의 전투 원리, 폼 = 발단·전개·결말(폼 결투의 세 줄), 개방 = 폼별 명장면, 개정판 = 외형, 장르 상성 초안(과학 포함), 책 설계표, 디자인·저작권 규칙, 장편 처리, 시범 다섯 권과 통과 기준, 예시 세 장(코스모스·삼국지·손자병법)에서 본 것.
- data/book-design.json — 책 설계표 양식과 정한 말(vocab), 시범 다섯 권(훔볼트 『코스모스』·돈키호테·이상한 나라의 앨리스·프랑켄슈타인·춘향전)을 채웠다. 다섯 권은 장르·시대·지역·실루엣 축 6이 서로 다 다르다.
- tools/book-design.py · tests/book-design.py — 칸·정한 말·실루엣 셋 이상·얼굴 둘 이상 다름·폼과 개방 셋·한 명 개방·고유 규칙의 대응·저작권(1962년 이전 사망 또는 작자 미상)·인용 출처·시범 장르 겹침을 본다.
- AGENTS.md · README.md · lib/patch.js · tests/patch.cjs — 작업 지침과 패치 기록(pkm-atelier 와 같은 모양).
