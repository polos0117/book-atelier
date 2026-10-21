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
| `docs/ART_INDEX.md` · `rust/README.md` | 그림 색인(모자이크 서명·dHash·색 막대)과 닮은 그림(거리·무게·한 책 둘까지), wasm 다시 짓기 |
| `docs/ATELIER_PIXEL_ART_PLAN.md` | 도트 캐릭터 시범 — 범위·사양·단계(P0~P5)·체크포인트·P1 생성 지시문. 시범은 alice 발단, 도트는 그림 저장소 `sprites/`, 정리는 `tools/sprite-grid.py`(정지 한 장 — `--rows`·`--outline`)·`tools/sprite-sheet.py`(동작 시트 — 프레임 찾기·`--grid`·느슨한/고른 격자·`--rows`·정지 도트 팔레트·발 기준선), 공용 `tools/sprite_px.py`. 인물마다 쓴 옵션은 `records/sprites/<인물>/<상태>.json` |
| `docs/SCENE_MOTION.md` | 움직임 — 켄 번스·입자·열리기·넘기기(`lib/scene-motion.js`·`.css`, 네 공방이 글자 그대로 나눠 쓴다), 입자 종류와 자료 잇기 |
| `docs/PATCH.md` | 무엇을 고쳤나 — 고친 쪽이 직접 적는다 (아래 규칙 7) |

## 화면

| 화면 | 파일 | 무엇 |
|---|---|---|
| 서재 | `index.html` · `lib/bookshelf.js` · `lib/bookshelf.css` | 책장(책등을 누르면 한 권 펼치기)·책장 밑 바닥의 도트 인물(폭에 맞춰 휴대폰 둘·넓은 화면 셋, 날마다 차례가 돈다, 누르면 그 인물의 책을 펼친다, 펼친 동안 쉰다 — `lib/sprite-actor.js`·`data/sprites.json`, 도트를 못 받으면 바닥째 없다)·패치 기록·공간. 펼친 책의 감상은 `lib/scene-motion.js` 로 움직인다(켄 번스·명장면 열리기·입자 — `docs/SCENE_MOTION.md`, 서가 상세·결투 절정도) |
| 서가 | `dex.html` · `lib/dex-filter.js` | 도감 — 최근 추가 줄·새 표·거르기·나란히 보기(폼 셋·개방 셋)·화풍 비교·넘기기·크게 보기·진열·닮은 그림 줄(`data/art-similar.json`, 상세를 열 때만 받는다)·도트(도트 인물이 있는 책은 목록 칸에 「도트」 표, 상세에 작은 무대 한 줄 — `data/sprites.json`). 최근·새는 `data/img.json` 의 `added`(등록한 날)만 읽는다 — 날짜 없는 그림은 안 뜬다 |
| 프롬프트 | `prompt.html` · `lib/prompt-*.js` · `lib/figures.js` | 생성기 — 폼 초상·개방·일상컷 |
| 모자이크 | `mosaic.html` · `lib/mosaic.js` · `lib/mosaic.wasm` · `data/art-index.json` | 그림 한 장을 서가의 썸네일 조각으로 다시 짠다(휴대폰 배경·포스터 PNG/JPEG). 서가 상세의 "모자이크로 만들기"·서재 펼친 책에서 들어온다 — 344 폭 머리에 탭 여섯은 안 들어 항해(서재·서가·프롬프트·결투·탐험)에는 없다 |
| 결투 | `duel.html` · `lib/duel.js` · `data/duel.json` | 책장 넘기기 — 덱 여섯 권, 세 장(발단·전개·결말), 자리 셋, 절정 한 번. 규칙은 엔진에만, 수치는 자료에만. 한 DOM 에 가로(펼친 책: 왼쪽 나·오른쪽 상대)·세로(위 상대·아래 나) 두 배치 — CSS 그리드 영역만 바뀐다(DUEL_DESIGN 3-8절). 「오늘의 판」은 날짜가 씨앗(`lib/today.js`), 끝난 판은 `atelier_today_v1:book` 에 적혀 공방 지도(polos0117.github.io)가 읽는다 |
| 도트 진열실 | `sprite.html` · `lib/sprite-actor.js`·`.css` · `data/sprites.json` | 도트 인물 모두 — 위는 고른 인물(`?who=`)의 무대(대기·걷기·고르기 반응·멈춤·1/2/3배·움직임 끔), 아래는 인물마다 정지 도트·동작 시트 칸 띠(원래 크기)·서가와 만든 기록 길. 시트는 그림 저장소 `sprites/`, 기록은 `records/sprites/`. 머리 항해에는 없다 — 서가 상세의 도트 줄·서재 바닥 밑 「도트 진열실」 에서 들어온다 |
| 탐험 | `run.html` · `lib/run.js` · `data/run.json` · `rust/shelf-gen` → `lib/shelf-gen.wasm`(싣개 `lib/shelf-gen.js`) · `lib/duel-ui.js`·`lib/duel.css`(결투와 같이 쓰는 판 조각) | 서고 탐험 — 로그라이크(docs/RUN_DESIGN.md). 씨앗 하나로 아홉 층 평면도(Rust → wasm), 깊이가 곧 장(1~3층 발단·4~6 전개·7~9 결말), 방마다 싸움(결투 엔진 한 장, 보스만 세 장)·독서대·장면·쉼, 덱 셋→여섯, 등불 셋 꺼지면 처음부터. 지도 위 복도에 덱의 도트 인물(길동무)이 서고, 방을 고르면 상태는 바로 적고 0.7초 제자리 걸음 뒤 그 방(보여주기만 — 누르면 바로, 움직임 끔·휴대폰 가로·새로고침이면 바로). 지도 규칙은 생성기에만, 걷는 규칙은 엔진에만, 수치는 자료에만 |

서가 상세의 하트(즐겨찾기)는 `lib/favorites.js` — 공방 모음(polos0117.github.io)의 `favorites.js` 를 글자 하나 다르지 않게 복사한 공용 모듈이다(열쇠 `atelier_favorites_v1`, 약속은 그쪽 README 「즐겨찾기」절). 여기서 따로 고치지 않는다 — 고치면 다섯 저장소를 같이, `tests/dex-favorites.cjs` 가 원본과 견준다.

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
개방의 `particles`(입자 하나)는 프롬프트에 안 실리는 움직임 말이다 — 영어 대신 `lib/scene-motion.js` 의 `KINDS` 와 같아야 한다(`tests/scene-motion.cjs`).

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

### 8. 그림 색인·닮은 그림과 wasm 은 다시 만든다

`data/art-index.json` 은 그림 저장소에서 셈한 표, `data/art-similar.json` 은 그 색인에서 셈한 닮은 그림 표다 — 새 그림이 등록된 뒤 **둘 다** 다시 만든다:
`cd rust && cargo run --release -p art-index && cargo run --release -p art-index -- --similar`(등록 흐름은 그대로, 늦어도 모자이크는 그 그림을 건너뛰고 서가는 그 그림의 닮은 그림 줄을 안 그리며 돈다).
`rust/art-core` · `rust/mosaic-wasm` 을 고치면 `lib/mosaic.wasm` 을 다시 지어 올린다(`rust/README.md`) — `node tests/mosaic.cjs` 가 소스 셈으로 묵은 wasm 을 잡는다. `rust/target/` 은 올리지 않는다.

### 9. 올리기

`main` 에 직접 올린다. 작업 브랜치·PR 은 만들지 않는다. 강제 push 와 남의 작업 지우기는 하지 않는다.

## 검사

```bash
python3 tests/book-design.py         # 책 설계표 — 실루엣·얼굴 닮음, 저작권, 한 명 개방, 대응, 폼 열쇠
python3 tools/book-design.py check
python3 tests/register-images.py     # 그림 등록 — 파일 이름 꼴·자리·틀린 이름은 저장 안 함·등록한 날(added)·git 이력 채우기
node tests/img-shards.cjs            # 그림 주소·등록기·워크플로·.gitignore 가 같은 저장소 차례
node tests/prompt-book.cjs           # 프롬프트 — 다섯 권 × 폼 셋 × 갈래, 정한 말 영어
node tests/words.cjs                 # 낱말 표
node tests/patch.cjs                 # 패치 기록 모양
node tests/duel.cjs                  # 결투 규칙 — 파생·덱·판·치기·상성·장·절정·책마다 고유 규칙·AI
node tests/mosaic.cjs                # 모자이크 — 올린 wasm 이 소스와 맞나(소스 셈), 같은 씨앗 같은 배치·최대 횟수·간격, 색인 꼴
node tests/similar.cjs               # 닮은 그림 — 색인·등록부에 다 있다, k ≤ 8, 자기 자신 없음, 오름차순, 한 책 둘까지, 거의 같은 쌍
(cd rust && cargo test)               # art-core(닮음 거리·top-k 포함) · art-index · mosaic-wasm 단위 검사
node tests/duel-sim.cjs [--quick]    # 결투 균형 — 3,000판(빠른 모드 600판은 보고만): 책마다 40~60% · 세 폼 규칙 모두 돈다 · 선공
node tests/run-gen.cjs               # 서고 지도 생성기 — 올린 wasm 이 소스와 맞나(소스 셈), 같은 씨앗 같은 지도, 330 씨앗의 규칙(열·길·종류·책)
node tests/run.cjs                   # 서고 탐험 규칙 — 들어가기·길·독서대·싸움(한 장)·전리품·쉼·장면·계단·보스·끝·자동 완주
node tests/run-sim.cjs [--quick]     # 서고 탐험 균형 — 400판 완주율(욕심쟁이 25~65%; 빠른 모드는 보고만). --lamps N 으로 실험
(cd rust && cargo test -p shelf-gen)  # 생성기 단위 검사 — 3000 씨앗. 고치면 lib/shelf-gen.wasm 을 다시 지어 올린다(rust/README.md)

# 브라우저 — ESM_DIR 에 preact·htm 이 든 node_modules, CHROMIUM_PATH 에 브라우저
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/dex-screen.cjs      # 서가
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/dex-recent-screen.cjs # 서가 최근 추가·새 표·새 그림만 · 다섯 크기
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/similar-screen.cjs  # 서가 닮은 그림 줄 — 열 때 받기·그림 따라 바뀜·누르면 그 책 그 그림·자료 없음이면 숨김 · 다섯 크기
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/prompt-screen.cjs   # 생성기
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/header-layout.cjs   # 머리 자리(화면 넷 · 크기 다섯)
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/theme-screen.cjs    # 테마 여덟 · 대비
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/patch-screen.cjs    # 서재의 패치 기록
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/bookshelf-screen.cjs # 책장 — 진열·펼치기·개방·닫기·키보드·반응형
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/duel-screen.cjs     # 결투 — 덱 고르기·한 판 끝까지·오늘의 판(같은 씨앗)·오늘 기록 · 휴대폰 가로·세로·폴드·PC 넷에서 끝까지, 돌려도 그대로
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/run-screen.cjs      # 서고 탐험 — 고르기·지도·1층 끝까지·계단·새로고침·나오기·끝(오늘 기록·전적)·오늘의 서고·네 크기
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/mosaic-screen.cjs   # 모자이크 — ?file= 로 거칠게 그리기·받기·조각 누르기·겹치기 · 세로·가로·PC · wasm 없음
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/landscape-screen.cjs # 휴대폰 가로 — 서재·서가·프롬프트 첫 화면(lib/landscape.css)
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/scene-motion.cjs     # 움직임 — 입자·켄 번스·열리기·넘기기·스위치·동작 줄이기 · 서재 감상·서가 상세·결투 절정 · 다섯 크기
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/reading-journey-screen.cjs # 감상 흐름 — 세 장·명장면·책갈피·이어보기·완료·책등 포커스
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/sprite-screen.cjs   # 도트 진열실 — 무대(대기 차례·걷기·고르기·멈춤·숨은 탭·움직임 끔·동작 줄이기·그림 없음·화소비 넷·다섯 크기)·인물 목록(칸 띠 원래 크기·서가·기록·?who=)
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/dex-dot-screen.cjs  # 서가 도트 — 목록 「도트」 표·상세 도트 줄(대기·걷기·반응·진열실 길)·움직임 끔·그림 없음·자료 틀림·다섯 크기
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/shelf-sprite-screen.cjs # 서재 바닥 도트 — 누르면 alice 펼치기(연달아도 한 번)·펼친 동안 쉼·닫으면 같은 인물이 그 자리에서·초점·Enter·움직임 끔·동작 줄이기·도트 없음·다섯 크기 × 테마 셋
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/run-sprite-screen.cjs   # 서고 복도 도트 — 덱의 도트 책 주인공·즉시 저장·걷는 동안 지도·누르면 바로·새로고침·움직임 끔·동작 줄이기·휴대폰 가로·도트 없는 덱·크기 넷
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/dex-favorites.cjs      # 서가 즐겨찾기 — 상세의 하트·저장된 칸·?pic= 로 열기·저장 막힘·다섯 크기
```

브라우저 검사의 그림은 `tests/fixtures/make-art.py` 가 임시 자리에 만든다(Pillow 필요) — 실제 등록기로 img.json 을 짠다. 도트 시트는 `tests/fixtures/make-sprites.py`(data/sprites.json 의 칸대로).
모자이크 검사의 조각 색인은 `tests/fixtures/make-art-index.py` 가 그 가짜 그림으로 셈한다(cargo 없이).
