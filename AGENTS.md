# 작업 지침

**기획·책 설계표 · 화면(서재·서가·생성기·결투)·그림 등록** 까지 왔다. 놀이는 책장 넘기기 결투(`docs/DUEL_DESIGN.md`) — AI 와 한 판.
화면은 pkm-atelier 를 바탕으로 myth·atelier(건담)의 것을 얹었다 — 무엇을 어디서 가져왔는지는 `docs/PORT_NOTES.md`. 결투는 옮기지 않고 책에 맞게 새로 만들었다.

## 먼저 읽을 것

| 문서 | 무엇 |
|---|---|
| 이 문서 | 규칙과 자리 |
| `docs/GAME_CONCEPT.md` | 게임 구조 — 고정 원칙·전투·장르·설계표·디자인 규칙·저작권·시범 |
| `docs/DUEL_DESIGN.md` | 결투 — 세 방향 비교와 선택, 규칙 전체, 스무 권 규칙, 시뮬레이터 균형 |
| `data/book-design.json` | 책 설계표. 책 한 권 = 한 칸, 외형과 전투를 함께 뽑는다 |
| `IMAGE_RULES.md` | 그림 만들기·파일 이름·기록·등록 — 그림 작업 전에 |
| `docs/ART_STYLE.md` · `data/style.json` | 화풍 — 책별 설계 프롬프트 뒤에 붙이는 공통 블록(키·판 따로) |
| `docs/PORT_NOTES.md` | 어디서 무엇을 가져왔고, 무엇을 일부러 뺐나 |
| `docs/PATCH.md` | 무엇을 고쳤나 — 고친 쪽이 직접 적는다 (아래 규칙 7) |

## 화면

| 화면 | 파일 | 무엇 |
|---|---|---|
| 서재 | `index.html` · `lib/bookshelf.js` · `lib/bookshelf.css` | 책장(책등을 누르면 한 권 펼치기)·패치 기록·공간 |
| 서가 | `dex.html` · `lib/dex-filter.js` | 도감 — 거르기·나란히 보기(폼 셋·개방 셋)·화풍 비교·넘기기·크게 보기·진열 |
| 프롬프트 | `prompt.html` · `lib/prompt-*.js` · `lib/figures.js` | 생성기 — 폼 초상·개방·일상컷 |
| 결투 | `duel.html` · `lib/duel.js` · `data/duel.json` | 책장 넘기기 — 덱 여섯 권, 세 장(발단·전개·결말), 자리 셋, 절정 한 번. 규칙은 엔진에만, 수치는 자료에만. 한 DOM 에 가로(펼친 책: 왼쪽 나·오른쪽 상대)·세로(위 상대·아래 나) 두 배치 — CSS 그리드 영역만 바뀐다(DUEL_DESIGN 3-8절) |

## 지켜야 할 것

### 1. 한 책은 하나의 전투 원리

세 폼은 그 원리를 이야기의 단계(발단·전개·결말 — 설계 기준은 질문 → 갈등 → 답)에 따라 다르게 쓴다.
폼은 위아래가 아니라 쓰임이 다르다. 고유 규칙에는 반드시 상대의 대응 방법이 있다.
결투에서 폼은 장(章) = 시간이다 — 설계표 `rule.forms` 는 장·자리·맞은편으로 쓰고 줄(lane) 말은 못 쓴다(`tools/book-design.py` 가 본다).
책을 더하면 `lib/duel.js` 의 `BOOK` 표에 효과 하나(폼 셋의 쓰임)를 더하고 `tests/duel.cjs` 에 확인을 적는다 — `node tests/duel-sim.cjs` 가 승률 40~60% 를 본다.

### 2. 책은 손에 들지 않는다, 책끼리 닮지 않는다

책은 입는 재료(종이 갑옷·책등·제본 실·죽간·한지)로만 쓴다. 어느 두 책도 실루엣 축 6 중 셋 이상,
얼굴 5 묶음 중 둘 이상 다르다 — 설계표를 고치면 `python3 tools/book-design.py check` 를 돌린다.
개방 명장면은 그녀 한 명과 사물·환경·괴물로 표현할 수 있어야 한다.
설계표에 새 정한 말(vocab)을 더하면 `lib/prompt-spec.js` 의 `VOCAB_EN` 에 영어도 더한다(`node tests/prompt-book.cjs` 가 본다).

### 3. 저작권 (비상업)

한국에서 아직 보호 중인 책(저자가 1963년 이후 사망)도 넣을 수 있다 — 개인 취미용이라 검사는 경고만 한다.
저자 사망 연도(작자 미상이면 `anonymous: true`, 살아 있으면 `alive: true`)는 꼭 적는다. 원작 삽화·영화 디자인을 따라 그리지 않는다.
보호 중인 책(국내·해외)은 따라 하지 않을 각색을 `adaptations` 에 적는다 — 생성기가 "원작 글에서만" 줄을 자동으로 싣는다.
번역문은 따로 저작권이 있으니 명대사는 원문이나 직접 옮긴 문장으로 쓴다. 해외에서 보호 중인 책은
`abroad_protected: true` 로 표시한다.

### 4. 화면에 말을 적지 않는다

사람이 읽는 말은 전부 `lib/words.js` 에서 온다(`W('kind.unit')`). 생성기의 선택지·영어 문구는 `lib/prompt-spec.js` 에 있다.
둘은 한글 검사에서 빠지는 대신 "표뿐인가" 를 따로 본다 — `node tests/words.cjs`. `<title>` 은 `app.title` 과 같아야 한다.

### 5. 그림은 이 저장소에 두지 않는다

그림은 `book-atelier-img` 에 올리고, `data/img.json` 에 적힌 것만 화면에 뜬다(등록은 워크플로가 한다).
`img/` 는 `.gitignore` 에 있다 — 브라우저 검사 때만 쓰는 임시 자리다. 자세한 것은 `IMAGE_RULES.md`.

### 6. 화면은 껍데기가 정한 자리에 들어간다

`lib/workspace.css` 는 `.dex-page` · `.prompt-page` 를 화면 높이로 잠그고 한 자리만 구르게 한다 — 서가는 `.collection-scroll`,
서재·생성기는 `.wrap`. 그 자리를 안 쓰면 아래쪽이 잘리고 스크롤만 안 된다. 화면을 갈아치우면 딸린 검사도 같이 옮긴다.

### 7. 고쳤으면 적는다

파일을 고쳤으면 `docs/PATCH.md` 맨 위에 한 칸 적는다. 커밋 메시지로 갈음하지 않는다 — 두 세션
(`claude` · `gpt`)이 같은 `main` 에 번갈아 민다.

```
## 2026-10-15 · claude · 무엇을 바꿨나
- data/foo.json — 왜 고쳤나
```

날짜는 `2026-10-15` 꼴, 누가는 `claude` 또는 `gpt`, 새 칸이 맨 위로 간다. `node tests/patch.cjs` 가 모양을 본다.

### 8. 올리기

`main` 에 직접 올린다. 작업 브랜치·PR 은 만들지 않는다. 강제 push 와 남의 작업 지우기는 하지 않는다.

## 검사

```bash
python3 tests/book-design.py         # 책 설계표 — 실루엣·얼굴 닮음, 저작권, 한 명 개방, 대응, 폼 열쇠
python3 tools/book-design.py check
python3 tests/register-images.py     # 그림 등록 — 파일 이름 꼴·자리·틀린 이름은 저장 안 함
node tests/img-shards.cjs            # 그림 주소·등록기·워크플로·.gitignore 가 같은 저장소 차례
node tests/prompt-book.cjs           # 프롬프트 — 다섯 권 × 폼 셋 × 갈래, 정한 말 영어
node tests/words.cjs                 # 낱말 표
node tests/patch.cjs                 # 패치 기록 모양
node tests/duel.cjs                  # 결투 규칙 — 파생·덱·판·치기·상성·장·절정·책마다 고유 규칙·AI
node tests/duel-sim.cjs [--quick]    # 결투 균형 — 3,000판(빠른 모드 600판은 보고만): 책마다 40~60% · 세 폼 규칙 모두 돈다 · 선공

# 브라우저 — ESM_DIR 에 preact·htm 이 든 node_modules, CHROMIUM_PATH 에 브라우저
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/dex-screen.cjs      # 서가
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/prompt-screen.cjs   # 생성기
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/header-layout.cjs   # 머리 자리(화면 넷 · 크기 다섯)
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/theme-screen.cjs    # 테마 여덟 · 대비
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/patch-screen.cjs    # 서재의 패치 기록
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/bookshelf-screen.cjs # 책장 — 진열·펼치기·개방·닫기·키보드·반응형
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/duel-screen.cjs     # 결투 — 덱 고르기·한 판 끝까지 · 휴대폰 가로·세로·폴드·PC 넷에서 끝까지, 돌려도 그대로
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/landscape-screen.cjs # 휴대폰 가로 — 서재·서가·프롬프트 첫 화면(lib/landscape.css)
```

브라우저 검사의 그림은 `tests/fixtures/make-art.py` 가 임시 자리에 만든다(Pillow 필요) — 실제 등록기로 img.json 을 짠다.
