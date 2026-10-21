# 패치 기록

파일을 고친 쪽이 직접 한 칸 적는다. 규칙은 `AGENTS.md` 의 "4. 고쳤으면 적는다" 에 있다.

모양은 두 줄이 전부다. 한 칸은 `##` 으로 시작하고 `날짜 · 누가 · 무엇을 바꿨나` 를
가운뎃점으로 나눈다. 그 아래 `-` 줄에 `파일 — 왜/무엇` 을 파일마다 하나씩 적는다.
날짜는 `2026-10-15` 꼴, 누가는 `claude` 또는 `gpt`, 새 칸이 위로 간다.
이 안내글은 첫 `##` 앞이라 읽히지 않는다. `node tests/patch.cjs` 가 모양을 본다.

## 2026-10-21 · claude · 도트 걷기 다시 뽑기 준비 — 다리 자세 안내
- tools/walk-guide.py — 새 도구: 걷기 다리 자세 안내 그림(3×2 칸, 가까운 다리 남색·먼 다리 회색, 4칸은 1칸의 거울, 두 마디 IK). 생성 시트가 1·3·4·6 칸을 다 "가까운 다리 앞" 으로 그려 다리가 번갈아 나가지 않았다
- docs/ATELIER_PIXEL_ART_PLAN.md — 11절에 걷기 다시 뽑기 지시문(세 인물, 칸마다 다리 자리)과 받은 뒤 정리 순서

## 2026-10-21 · claude · 도트 걷기 — 발이 미끄러지고 오르내림이 다리와 어긋나던 것
- data/sprites.json — 걷기 칸 110 → 200ms(사용자: 더 천천히), 빠르기를 보폭에서 셈(접지 칸의 발 폭 ÷ 반 주기): alice·손자 32 → 55, 춘향 30 → 49. 다리가 몸보다 세 배 빨라 제자리에서 미끄러지듯 걸었다
- data/sprites.json — 걷기 칸마다 dy: 생성 시트의 뒤 세 칸이 오르내림 위상이 어긋나(alice 지나감 칸이 낮다, 춘향은 뒤 절반이 통째로 2줄 아래) 몸이 다리와 따로 출렁였다 → 머리 높이를 접지 가운데·내려앉음 1칸 아래·지나감 1칸 위 곡선에 맞추는 만큼 칸을 옮긴다(±2, 1/3 도트까지)
- tools/sprite-bob.py — 새 도구: 걷기 시트에서 그 dy 를 셈. lib/sprite-actor.js — 칸의 dy 를 실제 화소에 맞춰 옮기고 발밑 그림자는 반대로(땅에 둔다). 화면들의 sprite-actor.js ?v=4
- run.html — 탐험 복도 벽 흐름 120 → 38px(0.7초 × 걷기 빠르기)
- tests/sprites-data.py — 새 검사: 도트 자료 꼴, 그림 저장소가 옆에 있으면 시트 크기·걷기 빠르기 = 보폭 ÷ 반 주기(±15%)·dy 로 맞춘 머리 높이가 다리 교차를 따른다. AGENTS.md 검사 줄, docs/ATELIER_PIXEL_ART_PLAN.md 기록

## 2026-10-21 · claude · 생성기 — 상징 "들지 않는다" 와 손에 쥔 소품이 부딪히던 것, 안나 발단 자세
- lib/prompt-spec.js — SUBJECT 줄의 "Symbols worn as costume motifs, never carried" 에 "폼 글이나 자세가 손에 쥐어 준 한 가지는 예외" 를 더했다. 안나(손가방)·오만과 편견(편지)·걸리버(컴퍼스)·파우스트(플라스크·계약서)·자산어보(공책)는 폼이 소품을 손에 쥐는데 같은 프롬프트가 "들지 말라" 해서, 손이 소품을 어정쩡하게 걸치고 자세가 꼬였다
- data/book-design.json — 안나 발단 자세: "기차 계단을 한 칸 내려서며 … 어깨 너머를 돌아보는" 은 등을 보이라는 말이라 출력 줄(뒷모습 금지)·HOLD BACK(기차는 개방 장면)과 부딪혔다 → 승강장에 몸을 카메라 쪽 3/4으로, 한 손은 모피 깃, 다른 손은 손목에 빨간 손가방(두 손 할 일을 정했다)

## 2026-10-21 · claude · 도트 확대 P2 — 손자·춘향이 서재에, 바닥은 폭에 맞춰
- data/sprites.json — 손자·춘향(정지·대기·걷기·반응, 대기 차례 0→1→2→3, 춘향 걷기 30/초). 서재 바닥·서가·진열실·탐험 복도에 같이 나온다
- lib/bookshelf.js — 바닥 폭에 칸(96px × 1.25)이 드는 만큼만 세운다(휴대폰 둘, 넓은 화면 셋) — 셋이면 휴대폰에서 칸이 겹쳤다. 날마다 차례를 한 칸씩 돌려 모두 나온다. 두 자리는 제 구역 안(칸 반 폭만큼 안쪽). index.html — bookshelf.js ?v=11
- tools/sprite-sheet.py — --rows N(시트마다 프레임 높이 중앙값을 N 줄로, 고른 격자), --grid CxR(프레임끼리 붙으면 기대 경계 가까이 가장 빈 세로줄에서 자른다), 넓은 프레임은 칸 안으로 민다. alice 시트 결과는 바이트 같음
- tests/shelf-sprite-screen.cjs — 한 인물 검사는 alice 만 둔 자료로, 실제 자료로 폭(344·390 둘, 1280 셋)·겹침 없음·다음 날 차례 돎. tests/dex-dot-screen.cjs — 「도트」 표는 자료의 인물 책 모두
- docs/ATELIER_PIXEL_ART_PLAN.md — 확대 P2 결과. AGENTS.md — 서재 줄·도트 정리 도구 줄

## 2026-10-21 · claude · 도트 확대 P1 — 손자·춘향 정지 도트
- tools/sprite-grid.py — --rows N(인물 높이를 N 줄로 나눈 고른 격자, 시작점만 찾는다)·--outline(바깥 윤곽 한 칸). 격자 찾기가 빗나가는 생성 도트용, 인물끼리 키 맞추기. 기본 길은 그대로(alice 결과 바이트 같음)
- tools/sprite_px.py — sample_fixed(고른 격자, 칸 안 최다 색, 어두운 색이 30% 넘으면 그 색)
- docs/ATELIER_PIXEL_ART_PLAN.md — 확대 P1 결과, 반전 허용(손자·춘향), 체크포인트를 확대 P2 대기로. 그림은 book-atelier-img `sprites/sunzi/`·`sprites/chunhyang/`·`records/sprites/`

## 2026-10-21 · claude · 도트를 서가와 진열실에서 — 목록 「도트」 표·상세 도트 줄·sprite.html 진열실
- dex.html — data/sprites.json 을 한 번 받아, 도트 인물이 있는 책의 목록 칸에 「도트」 표(오른쪽 위), 상세의 닮은 그림 줄 밑에 작은 무대(대기·걷기·반응 단추, 인물을 눌러도 반응, 진열실 길). 그림을 못 받으면 줄째 숨김, 자료가 틀리면 표도 줄도 없음. sprite-actor.js·css 를 싣는다
- sprite.html — 도트 시범 → 도트 진열실. 무대는 ?who= 로 고른 인물(없으면 첫 인물), 아래에 인물마다 정지 도트·상태별 칸 띠(원래 크기)·무대에 세우기·서가·만든 기록(그림 저장소 records/sprites/)
- lib/bookshelf.js·css — 서재 바닥이 서면 바닥 밑 글줄에 「도트 진열실」 길. index.html — bookshelf ?v=10·8
- lib/words.js — sprite.title·subtitle(진열실), sprite.gallery·card.*, dex.dot.*, home.sprite.room
- tests/dex-dot-screen.cjs — 새 검사. tests/sprite-screen.cjs — 진열실 6가지. tests/shelf-sprite-screen.cjs — 진열실 길 2가지
- AGENTS.md — 서가·진열실 줄, 검사 줄. docs/ATELIER_PIXEL_ART_PLAN.md — 서가·진열실 기록

## 2026-10-21 · claude · 도트 확대 준비 — 서재 바닥에 셋까지, 손자·춘향 P0
- lib/bookshelf.js — 서재 바닥이 data/sprites.json 의 인물을 셋까지 세운다. 바닥을 나눠 인물마다 제 구역의 두 자리, 처음 자리·대기 시간을 엇갈리게. 못 받은 인물만 빠지고 한 명이라도 서면 바닥이 보인다. 펼친 동안 모두 쉰다. index.html — bookshelf.js ?v=9
- lib/words.js — sprite.name.sunzi·chunhyang
- tests/shelf-sprite-screen.cjs — 여럿(제 구역·못 받은 인물 빠짐·그 인물의 책·모두 쉼) 6가지
- docs/ATELIER_PIXEL_ART_PLAN.md — 확대 P0(손자·춘향, 기준 그림 경로·해시·고른 까닭), 11절 확대 P1 지시문, 체크포인트

## 2026-10-21 · claude · 도트 시범 P5 — 서고 탐험 복도의 길동무
- run.html — 지도 위 복도 띠(Corridor). 덱에서 도트가 있는 첫 책의 주인공이 서고, 방·계단·보스를 고르면 상태는 바로 적고 0.7초 제자리 걸음·벽 흐름 뒤 그 방을 띄운다(누르면 바로). 쉼에서 등불·이긴 뒤 전리품에 반응. 움직임 끔·동작 줄이기·휴대폰 가로·새로고침·도트 없는 덱이면 바로. sprite-actor.js·css 를 싣는다
- lib/sprite-actor.js — wander 옵션(저절로 걷지 않기), march(ms) 제자리 걸음. 화면들의 sprite-actor.js 를 ?v=3
- lib/words.js — run.corridor·run.walker
- tests/run-sprite-screen.cjs — 새 검사. docs/RUN_DESIGN.md 5절·docs/ATELIER_PIXEL_ART_PLAN.md P5 결과·AGENTS.md 탐험 줄·검사 줄

## 2026-10-21 · claude · 도트 시범 P4 — 서재 바닥의 alice
- lib/bookshelf.js — 책장 밑 바닥 줄(.shelf-floor)에 도트 인물 하나(data/sprites.json 의 인물 중 설계표에 책이 있는 것). 누르면 그 책을 펼친다(책장에 없어도), 펼친 동안 pause('reading')·닫으면 resume, 펼침·닫힘 움직임과 초점은 인물에서. 도트를 못 받으면 바닥째 숨김
- lib/bookshelf.css — 바닥 줄(가로 마루결, 테마마다 나무 빛). index.html — sprite-actor.js·css 를 싣고 bookshelf ?v=7·8
- lib/sprite-actor.js — api 를 인물 단추에 단다(el.sprite). data/sprites.json — 배율 1(사용자 결정)
- lib/words.js — home.sprite.floor·home.sprite.actor
- tests/shelf-sprite-screen.cjs — 새 검사. docs/ATELIER_PIXEL_ART_PLAN.md — P4 결과·알려진 문제, 체크포인트 P5 대기. AGENTS.md — 서재 줄·검사 줄

## 2026-10-21 · claude · 도트 시범 P3 — 독립 재생(sprite.html)
- lib/sprite-actor.js·lib/sprite-actor.css — 새 재생 모듈(window.AtelierSprite). 시트 한 장의 background-position·transform 만, 대기 차례·걷기(두 자리, 가는 쪽 반전)·고르기 반응, 고르기는 바로 알리고 반응 중 누른 것은 버린다, pause/resume(이유별)·숨은 탭·화면 밖·움직임 끔·동작 줄이기, 도트 한 칸 = 실제 화소 정수배(fit 이면 낮은 공간에 맞춰 낮춘다), 그림 실패면 숨김
- data/sprites.json — 새 자료. alice 발단 — 칸 96×128·발 기준선·배율 2·반전 허용, 정지·대기(1→4→1→3)·걷기(32/초)·반응 시트와 시간
- sprite.html — 새 예제 화면(머리 항해에 없다). 서재 배경 바닥의 작은 공간, 대기·걷기·고르기·멈춤·1/2/3배·움직임 끔, 고른 횟수
- lib/words.js — sprite.* 낱말. 화면들의 words.js 를 ?v=12(지난 즐겨찾기 낱말 변경에서 빠졌던 것도 함께)
- lib/workspace-ui.js — 부제 있는 화면에 sprite. 화면들의 workspace-ui.js 를 ?v=7 로 맞춤(5·6 이 섞여 있었다)
- tests/sprite-screen.cjs · tests/fixtures/make-sprites.py — 새 검사·가짜 시트. tests/browser-harness.cjs — 그림 저장소 sprites/ 경로, 화소비(dpr)·동작 줄이기(reducedMotion) 열기
- docs/ATELIER_PIXEL_ART_PLAN.md — P3 결과·알려진 문제, 체크포인트 P4 대기. AGENTS.md — 화면 표·검사 줄

## 2026-10-21 · claude · 도트 시범 P2 — alice 대기·걷기·반응 시트
- tools/sprite-sheet.py — 새 도구. 한 장에 격자로 그린 프레임을 찾아(칸 경계에 걸쳐도), 프레임마다 느슨한 격자(10~13px 로 들쭉날쭉한 생성 도트를 따라)로 칸 안쪽 최다 색을 뽑고, 정지 도트 팔레트·발 기준선·몸 중심으로 가로 시트. --fixed-pitch·--cell·--speck
- tools/sprite_px.py — 새 공용(격자 찾기·Lab 팔레트·가까운 색·느슨한 격자). tools/sprite-grid.py 는 이것을 쓰도록 — 결과는 바이트까지 그대로
- docs/ATELIER_PIXEL_ART_PLAN.md — P2 결과(블록 11.6px → 절반 간격 6.0 으로 정리한 까닭, idle 재생 1→4→1→3, walk 오르내림), 체크포인트를 P3 대기로. 그림은 book-atelier-img `sprites/alice/`·`records/sprites/alice/`
- AGENTS.md — 도트 줄에 시트 도구

## 2026-10-21 · claude · 도트 계획 — P2 동작 시트 생성 지시문
- docs/ATELIER_PIXEL_ART_PLAN.md — 11절에 P2 지시문(공통 + idle 4 · walk 6 · react 4, 세로 한 장 격자 칸, 6×6 화소, 정지 도트 6배 첨부)과 받은 뒤 정리 순서

## 2026-10-21 · claude · 도트 계획 — gen2 재작업 요청 문구
- docs/ATELIER_PIXEL_ART_PLAN.md — gen2 를 만든 이어 요청(큰 화소·16색·4등신·장식 절반)을 체크포인트에 적고 P2 지시문에도 넣기로

## 2026-10-21 · claude · 도트 시범 P1 — alice 발단 정지 도트 확정
- tools/sprite-grid.py — 새 도구. 생성 그림의 실제 도트 격자(간격·시작점)를 찾아 칸 가운데 색을 뽑고 Lab 묶음 팔레트로 96×128 셀·발 기준선에 앉힌다(면적 평균 축소는 격자가 어긋나 뭉갰다)
- docs/ATELIER_PIXEL_ART_PLAN.md — P1 결과(gen1 안 씀·gen2 채택·정리 수치·합성 판단), 반전 허용 확정, 체크포인트를 P2 대기로. 그림은 book-atelier-img `sprites/alice/`·`records/sprites/alice/still.json`
- AGENTS.md — 도트 줄에 정리 도구

## 2026-10-21 · claude · 서가 상세 단추 줄 정리 — 담기와 도구 두 줄
- dex.html — 단추·글자가 한 줄에 섞이던 것을 둘로: 위는 담기(♡ 즐겨찾기 + 붙은 칸의 담은 수 링크 ›, 진열 단추 + 붙은 칸의 진열 수), 아래는 도구(움직임·틀·모자이크·생성기 — 테두리 없이 조용히). 묶음마다 role=group 이름
- lib/words.js — dex.fav.count·dex.hall.count 를 수만, 링크 이름 dex.fav.open, 묶음 이름 dex.bar.keep·dex.bar.tools, 진열 수 풀이 dex.hall.count.note
- lib/gallery.css — 붙은 칸 모서리, 담기 줄 글자색. 화면들의 gallery.css 를 ?v=6

## 2026-10-21 · claude · 모자이크 화면 검사를 머리 탭 다섯에 맞춤
- tests/mosaic-screen.cjs — 서고 탐험(run.html)이 머리 항해에 들어와 탭이 다섯이 됐다. 항해 넷을 기대하던 확인 셋(세로·가로·PC)을 다섯으로
- tests/header-layout.cjs · AGENTS.md — 주석과 모자이크 줄의 "탭 넷/다섯" 말을 지금 항해에 맞춤

## 2026-10-21 · claude · 서가 즐겨찾기 — 지금 보이는 그림을 하트로 담고, 공방 모음에서 모아 본다
- lib/favorites.js — 공방 넷과 공방 모음(polos0117.github.io)이 같이 쓰는 즐겨찾기 모듈(판 v1). 원본은 공방 모음의 favorites.js, 글자 하나 다르지 않게 복사했다. 열쇠 atelier_favorites_v1(한 출처라 공방끼리 같은 목록), 약속은 그쪽 README 「즐겨찾기」절
- dex.html — 서가 상세의 바로가기 줄 맨 앞에 하트 「즐겨찾기」(aria-pressed) — 책이 아니라 큰 그림에 떠 있는 그 그림(폼·개방·연출·일상·특별)을 담는다. 담은 수 「즐겨찾기 n」 은 /favorites.html 로, 담았다·뺐다·저장이 막혔다는 알림(aria-live). ?book=&pic= 로 오면 그 그림의 화풍·폼·컷으로 열고, 다음 주소에는 pic 을 끌고 가지 않는다
- lib/words.js — dex.fav.* 낱말 여섯
- tests/dex-favorites.cjs — 새 검사: 하트·저장된 칸의 모양·그림마다 따로·새로고침·link 로 열기·저장 막힘·다섯 크기 44px·넘침·초점, 공방 모음 원본과 같은 파일인가 · AGENTS.md — 공용 모듈 한 줄과 검사 목록

## 2026-10-21 · claude · 도트 계획에 서고 탐험 자리
- docs/ATELIER_PIXEL_ART_PLAN.md — 3절 적용안 표에 서고 탐험(복도 띠 걷기·대기·반응, 덱 첫 책 주인공, P5에서 판단) 한 줄

## 2026-10-21 · claude · 도트 캐릭터 시범 계획 편입과 P0
- docs/ATELIER_PIXEL_ART_PLAN.md — 사용자 검토안을 들이고 검토를 반영(시트 한 장 생성·팔레트 고정 정리, 실제 화소 정수배, dialog 멈춤, P1에 서재 바닥 합성). P0: 시범 alice 발단, 정본·도트 기준 그림 경로와 해시, 파일 자리, P1 생성 지시문
- AGENTS.md — 먼저 읽을 문서 표에 한 줄
- IMAGE_RULES.md — 7절 도트 스프라이트 자리(sprites/, img/ 밖)

## 2026-10-21 · claude · 서고 탐험 화면 — run.html, 머리 탭 다섯, 설계 문서

- run.html — 새 화면. 고르기(책 셋·전적·오늘의 서고·이어가기) → 지도(층·장·등불·덱 막대, SVG 평면도 — 길 닿는 방은 금테·다녀온 방은 흐리게, 갈 수 있는 방 단추, 지난 일 한 줄, 덱 띠) → 싸움(결투 판 조각, 끝나면 결과 띠와 계속) → 전리품·독서대·장면 상자(가득이면 내놓을 책) → 계단·보스 다시 도전 → 끝(갇힘·완주, 함께 간 책). 매 수 저장(book_run_v1), ?seed= 고정 씨앗, ?daily 오늘의 서고(날짜 씨앗), 끝나면 오늘 기록·탐험 전적(book_run_rec_v1). 가로 PC 는 덱이 오른쪽, 세로 폰은 지도를 옆으로 민다
- lib/words.js — run.*(화면 말 60여 개) · nav.run
- lib/workspace-ui.js — PAGES 에 run(탭 다섯), 부제 있는 화면
- lib/gallery.css · lib/workspace.css — 폴드 덮개(344)에서도 탭 다섯이 안 잘리게 아주 좁은 화면 규칙(gallery.css 의 같은 세기 선택자로)
- docs/RUN_DESIGN.md — 새 문서: 뼈대·지도 규칙·걷는 규칙·균형(욕심쟁이 58%)·화면
- tests/run-screen.cjs — 고르기 셋·지도(길 닿는 방만 = node 의 wasm 과 같은 지도)·1층 끝까지(독서대·장면·싸움·전리품)·계단·새로고침·나오기·끝 화면(오늘 기록·전적 한 번만)·오늘의 서고·네 크기 · tests/header-layout.cjs · theme-screen.cjs — 화면 다섯
- AGENTS.md · README.md · rust/README.md · docs/GAME_CONCEPT.md — 탐험 화면·검사·shelf-gen 짓는 법·11절 7번

## 2026-10-21 · claude · 닮은 그림 — 서가 상세의 큰 그림 아래 한 줄, 색인에서 미리 셈한 top-8

- rust/art-core/src/lib.rs — `similarity`(0.40·dHash 해밍/64 + 0.35·색 막대 카이제곱 + 0.25·min(1, Lab 서명 거리/40), 0..1, 대칭) · `similarity_score`(×1000 정수) · `nearest`(점수 오름차순·같으면 번호 차례·자기 자신 없음·한 책 per_group 장까지) · `near_duplicates`. 단위 검사: 같은 그림 0, 흔든 사본 < 0.05, 뒤집은 그림·빨강↔파랑 > 0.5, 대칭, 책 묶기·비김·거의 같은 쌍
- rust/art-index/src/main.rs — `--similar`(`--index`·`--check` 함께): 색인 + 등록부만 읽어 data/art-similar.json 을 쓴다(그림마다 8장, 한 책 2장, near_below 50). 색인을 다시 만들면 다음 단계를 알린다. base64 되읽기·문서 만들기 단위 검사
- data/art-similar.json — 새 파일. 154장 × 8, 73 KB(gzip 7 KB), 한 그림 한 줄. 거의 같은 쌍 없음(가장 가까운 쌍은 같은 책의 폼 ↔ 개방 85). data/art-index.json 은 다시 셈해도 그대로
- lib/mosaic.wasm · mosaic.html — art-core 소스 셈이 바뀌어 다시 지음(맞추기는 그대로), `mosaic.wasm?v=2`
- dex.html — `Similar`: 상세를 처음 열 때 한 번만 받고, 지금 보는 그림의 줄(그림이 바뀌면 같이), 등록부에 없는 그림은 뺀다. 다른 책이면 그 책 상세를 그 그림·그 화풍으로(?book=), 같은 책이면 그 자리에서. 자료가 없거나 틀리면 줄째 안 그린다
- lib/gallery.css · lib/landscape.css — 줄 모양(그 안에서만 옆으로, 칸 72/64px·44px 넘게, focus-visible). 펼친 쪽은 그림 단 밑, 휴대폰 가로는 글 단 밑. `gallery.css?v=5` · `landscape.css?v=4`
- lib/words.js — dex.similar.title · note · label, 낱말 표 `?v=11`(화면 다섯)
- tests/similar.cjs · tests/similar-screen.cjs — 새 검사: 자료가 색인·등록부와 맞나(k ≤ 8·자기 자신 없음·오름차순·한 책 둘까지·서로 같은 점수) / 화면(열 때 받기·그림 따라 바뀜·누르면 그 책 그 그림·같은 책·Enter·자료 없음이면 숨김·다섯 크기)
- docs/ART_INDEX.md · rust/README.md · AGENTS.md — 닮은 그림을 "한 것" 으로: 두 파일 다시 만드는 차례(그림 등록 뒤 색인 → --similar), 무게·고르기·꼴, 검사 목록

## 2026-10-21 · claude · 서고 탐험 — 지도 생성기(Rust → wasm)·탐험 엔진·시뮬레이터, 결투 판 조각 나누기 (화면은 다음 칸)

- rust/shelf-gen — 새 상자. 씨앗 하나로 아홉 층의 평면도(열 4~5, 들어온 자리·가운데 방 2~3·계단/보스, 이웃 열 사이 단조 길, 방 종류 meet·read·rest·scene, 계단 앞 열은 모두 층지기, 4층부터 싸움 하나 더, 짝수 층 쉼, 독서대 하나 이상, 층 안 책 겹침 없음·윗층 책·보스 책 피함, 상대 덱 여섯·전리품 둘·독서대 다섯). 손으로 쓴 JSON, splitmix64, build.rs 소스 셈. cargo test 가 3000 씨앗을 돈다
- lib/shelf-gen.wasm · lib/shelf-gen.js — 지은 wasm(35KB)과 싣개(load·plan·seedOf·nextOf)
- lib/duel.js — newMatch(opts: start 시작 장·chapters 몇 장)·validateDeck(opts.loose: 셋~여섯). 첫 장의 선공 보정은 판의 첫 장에, 마지막 장은 lastChapter — 서고 탐험의 한 장 결투가 쓴다. 보통 판은 그대로
- lib/run.js · data/run.json — 탐험 엔진: 지도 위를 걷는 규칙(enter·fightMove/fightAi·settle·takeLoot·read·scene·descend·challenge·autoPlay). 등불 셋, 덱 셋→여섯, 깊이가 곧 장, 보스는 세 장, 보스에게 지면 다시 도전. 상태는 통째로 JSON(지도 포함)
- lib/duel-ui.js · lib/duel.css — duel.html 의 판 조각(useData·picOf·Pic·Unit·Match·대화상자·speak)과 CSS 를 따로 — 결투와 탐험이 같이 쓴다. Match 의 결과 단추는 actions 로 받고 판 접기는 onForfeit 가 있을 때만
- duel.html — 조각을 가져다 쓴다(동작 그대로)
- tests/duel.cjs — 한 장 결투·시작 장·느슨한 덱 · tests/run-gen.cjs — wasm 소스 셈·330 씨앗 규칙 · tests/run.cjs — 탐험 규칙 47 · tests/run-sim.cjs — 400판 완주율(욕심쟁이 58%, 25~65% 문턱) · tests/duel-sim.cjs 그대로 통과

## 2026-10-21 · claude · 감상 흐름 — 장마다 방의 빛, 명장면 앞의 한 줄, 어디까지 읽었나 리본

- lib/bookshelf.js · lib/bookshelf.css — 장마다 방의 빛(`.reading-mood`): 그 책의 표지·금박 빛(book-frame COVER)을 발단 차고 어둡게·전개 세고 따뜻하게·결말 노을로, 명장면은 한층 세게. 색 변수를 @property 로 등록해 0.6초에 바뀐다. 책이 다가올 때 서고의 빛도 0.42초에 걸쳐 어두워진다(전에는 바로 떴다). 명장면을 열면 장면 글이 어두운 무대에 0.85초 먼저 뜨고 그다음 그림이 열리고 입자는 천천히 — 누르거나 Enter 면 바로 연 상태로. 동작 줄이기·움직임 끄기면 글과 그림이 함께. 책등 리본은 읽는 중이면 책갈피(없으면 마지막) 장의 첫 글자와 명장면 표, 이름 "전개 명장면까지 읽음"·"발단에 책갈피"(책등 단추 이름에도), 다 읽으면 ✓ 그대로
- lib/words.js — home.read.skip · home.read.ribbon.*
- tests/reading-journey-screen.cjs — 움직임을 켠 채: 장마다 빛이 다르다(화면 값도), 명장면 글이 먼저·그림은 그 뒤, Enter 로 건너뛰기, 포커스는 장 제목, 리본 이름이 장·명장면·책갈피를 따른다. 동작 줄이기면 앞의 한 줄이 없다
- docs/SCENE_MOTION.md — 서재 감상의 차례·방의 빛·리본

## 2026-10-21 · claude · 감상 흐름에 움직임 — 켄 번스·명장면 열리기·장면 입자

- lib/scene-motion.js · lib/scene-motion.css — 새 파일(판 1). 정지 그림으로 만드는 움직임: `kenBurns`(씨앗으로 방향·12~20초가 정해지는 느린 밀기), `particles`(캔버스 하나·rAF 고리 하나, 종류 16 — 꽃잎·눈·불티·재·박쥐·먼지·불꽃·물방울·잎·종잇조각·카드·별·비·안개·금빛·반딧불, 크기·화소비에 맞춘 개수와 상한, 화면 밖·숨은 탭이면 멈춤, 한 번 터지기), `reveal`(그림이 그려진 크기에 맞춘 조리개 + 빛 고리·번짐 + 그 장면 입자 터짐 + 켄 번스로 이어지는 밀어 들어가기, 1.1초), `turn`(엇갈려 사라지며 읽는 쪽으로 조금), `ghost`·`snapshot`(갈아 끼운 그림의 정지 사본). 동작 줄이기면 켄 번스·떠도는 입자 없이 빠른 사라짐, 스위치는 `atelier_motion_v1`(공방 넷이 같이), 같은 열쇠로 부르면 앞의 것을 끊는다. 책 말이 없다 — 네 공방에 글자 그대로 복사한다
- lib/bookshelf.js · lib/bookshelf.css · index.html — 감상 그림에 켄 번스, 명장면 장에는 그 장면 입자가 떠돈다. 같은 장의 초상 → 명장면은 열리기, 다른 장 이동·책갈피·마치기는 넘기기(옛 3D 책장 넘김 애니메이션을 걷었다). 링크 줄에 "움직임 끄기·켜기". 책갈피·이어보기·완료·포커스·주소·뒤로 가기는 그대로
- dex.html — 큰 그림에서 폼 ↔ 그 폼의 개방은 열리기(개방으로 갈 때만 입자), 크게 보기는 켄 번스·입자 없음, 링크 줄에 움직임 단추. duel.html — 절정 장면이 그 폼의 초상에서 열리고 그 개방의 입자가 터진다
- data/book-design.json · tools/book-design.py · tests/book-design.py — 개방 60칸마다 `particles` 하나(명장면 글에서: 드라큘라 안개·박쥐·재, 춘향전 꽃잎·비·꽃잎, 자산어보 물방울·안개·물방울, 헤일메리 금빛·별·안개 …), `vocab.particles`, 정한 말 검사(폼은 적을 때만)
- lib/words.js · index.html · dex.html · prompt.html · duel.html · mosaic.html — motion.on·off·note·reduced, 낱말 표 `?v=10`(화면 다섯 같은 판), bookshelf.css `?v=6` · bookshelf.js `?v=7`
- tests/scene-motion.cjs — 새 검사: 같은 파일(판·바깥 없음)·설계표 입자 = 모듈 종류, 입자(화소 변화·숨김·화면 밖·destroy·종류마다), 켄 번스, 열리기·끊기·넘기기·사본, 스위치(저장·새로고침), 동작 줄이기, 서재·서가·크게 보기·결투, 다섯 크기 넘침·오류 없음
- docs/SCENE_MOTION.md · AGENTS.md — API·종류·복사 규칙, 공방마다 자료를 종류로 잇는 법(pkm 타입·myth 원소·건담), 검사 목록

## 2026-10-21 · claude · 결투 전적 — 통산·연승·오늘의 판 연속, 책마다 판·승과 첫 승 도장
- lib/today.js — v2(다섯 저장소 공통): bump 가 atelier_record_v1:book 에 통산 {n, w, streak, best, days, dstreak, dbest} 도 같이 쌓는다. record()·dailyAlive()
- duel.html — 덱 화면 위에 전적 칸(통산 n판 w승·승률·연승(최고)·오늘의 판 연속 일수, 이긴 책 n/20), 책 칸마다 '{n}판 {w}승' 과 첫 승 도장(✓). 판이 끝나면 덱의 여섯 권에 판·승을 더한다(book_duel_rec_v1)
- lib/words.js — duel.rec.title · none · line · daily · books · cell
- tests/duel-screen.cjs — 세 판 뒤 통산 줄·책 칸의 3판·도장 수·이긴 책 수

## 2026-10-21 · claude · 말풍선 — 판에 들어온 책이 그 장의 말을 한다
- data/book-design.json — 스무 권에 voice(발단·전개·결말 한 줄씩). 명대사 인용이 아니라 설계표의 인물로 새로 쓴 말(저작권 문제 없게). 머리말에 뜻
- tools/book-design.py · tests/book-design.py — voice 가 있으면 셋 다 있고 70자까지(없는 책은 그냥 통과)
- lib/speech.js — 새 파일(원본은 지도 저장소 speech.js, 다섯 저장소에 같은 파일). 요소 위에 꼬리 달린 풍선 — 둘까지, 글 길이만큼, 움직임 줄이기면 애니메이션 없이. 화면 말 없음
- duel.html — 내기(내 것도 상대 것도)에 그 책의 그 장 voice 를 자리 위에, 판이 끝나면 이긴 쪽 첫 책이 결말의 말
- tests/duel-screen.cjs — 춘향전을 내면 발단의 말이 풍선으로

## 2026-10-21 · claude · 서가 최근 추가 줄과 새 표 — 등록한 날(added)

- tools/register-images.py — img.json 에 `added` {파일: "YYYY-MM-DD"}. 이번에 새로 적힌 그림만 오늘, 있던 날짜는 그대로, 틀린 날짜는 버린다, `--prune` 으로 빠진 그림은 날짜도. `--backfill-added <그림 저장소>` 는 날짜 없는 그림에만 git 이력의 처음 더해진 날(`git log --diff-filter=A --format=%cs` 와 같은 셈, 얕으면 `--depth` 를 늘려 받고 그래도 잘린 경계 커밋의 날짜는 안 쓴다). 날짜는 지어내지 않는다 — 이력에 없으면 날짜 없이 둔다
- data/img.json — 지금 등록된 154장 모두 그림 저장소(얕지 않은 로컬 체크아웃) 이력에서 한 번 채웠다(10-16 ~ 10-21). 워크플로의 그림 저장소 체크아웃은 기본 얕은 받기라 거기서는 채우지 않고 새 그림의 오늘만 적는다 — 워크플로는 안 고쳤다
- dex.html · lib/dex-filter.js · lib/img.js — 목록 맨 위(공간 띠 밑) "최근 추가": 7일 안에 등록된 그림, 새 날짜부터 24장, 줄 안에서만 옆으로 구른다. 누르면 그 책 상세를 그 그림(화풍·폼·컷)으로 연다(`?book=`), 돌아오면 그 칸에 초점. 없으면 줄째 숨는다. 지난번에 들른 뒤 들어온 그림은 목록 칸·최근 추가 칸 왼쪽 위에 "새"(대표 그림 목록은 그 책에 새 그림이 있으면, 컷을 고른 목록은 그 그림이). 들른 표는 시계가 아니라 그때 자료의 가장 늦은 날짜와 그날의 그림으로 적어(`book_dex_seen_v1`) 등록기(UTC)와 보는 사람의 날짜가 어긋나도 빠지거나 겹치지 않는다. 처음 오면 새 표 없음, 떠날 때(pagehide·숨김) 적고 이번 들름(30분 넘게 비우지 않으면, 새로고침 포함)은 기준이 그대로. 작업 현황에 "새 그림만"(새 그림이 있을 때만)
- lib/gallery.css · lib/landscape.css — 최근 추가 줄(넓으면 이름이 왼쪽, 좁으면 위, 휴대폰 가로는 검색 줄 밑 낮게)·새 표. 칸 44px 넘게, focus-visible
- lib/words.js · index.html · prompt.html · duel.html · mosaic.html — dex.recent.* · dex.new.* · dex.art.new, 거르기 안내에 새 그림만. 같은 날 감상 흐름이 올린 `?v=8` 위에 낱말 표 `?v=9`, img.js·dex-filter.js `?v=2`, gallery.css `?v=4`, landscape.css `?v=3` — 화면 다섯 모두 같은 판
- tests/register-images.py · tests/dex-recent-screen.cjs — 등록한 날 갈래와 git 이력 채우기(교체·지운 것·얕은 저장소 경계), 줄·새 표·새 그림만·다섯 크기(344×882·390×844·844×390·690×829·1280×900) 브라우저 검사
- tests/gallery-screen.cjs — "첫 화면에 그림" 을 최근 추가 줄이 있으면 그 줄로 보고, 책 칸은 첫 화면 안에서 시작하는지 따로 본다(줄이 책 칸을 백여 px 밀어 690 폭에서 600 선을 넘었다)
- data/art-index.json — `cargo run --release -p art-index` 로 다시 셈했다. 154장 그대로(이미 최신이라 바뀐 줄 없음)
- AGENTS.md · IMAGE_RULES.md — 서가 표에 최근·새, 검사 목록, 등록한 날과 한 번 채우기

## 2026-10-21 · gpt · 한 권을 꺼내 감상하고 서고로 돌아오는 흐름

- lib/bookshelf.js — 발단·전개·결말의 초상과 명장면을 순서대로 넘긴다. 장면 책갈피·마지막 장·감상 완료를 book_reading_v1 에 저장하고 다시 열면 이어본다. 마지막 장 뒤 여운 화면에서 책을 꽂거나 책갈피로 돌아간다. 서고에 돌아오면 같은 책등에 포커스와 리본·완료 표시가 남는다. 기존 주소·뒤로 가기와 연동, 그림 없음·저장 차단에도 감상은 계속된다
- lib/bookshelf.css — 펼친 책의 그림과 조작부는 화면에 남기고 본문만 스크롤. 작은 화면·가로 화면·폴드 대응, 장 넘김과 책 복귀 연출, 동작 줄이기·키보드 포커스 지원
- lib/words.js · index.html · dex.html · prompt.html · duel.html · mosaic.html — 감상 안내 문구와 새 자산 버전. 동시에 추가된 모자이크 진입 링크도 현재 장면에 맞춰 보존
- tests/reading-journey-screen.cjs — 다섯 화면 크기에서 세 장 감상·명장면·책갈피·새로고침·이어보기·완료·책등 포커스·스크롤 복귀·그림 없음·저장 차단 확인

## 2026-10-21 · claude · 모자이크 — 그림 한 장을 서가의 조각으로 (Rust → WebAssembly)

- rust/ — 새 cargo 작업 공간. `art-core`(2×3 칸 Lab 서명·dHash 64·Lab 4×4×4 색 막대·칸마다 조각 고르기: 벌점·최대 횟수·이웃 간격·씨앗, 단위 검사), `art-index`(등록된 그림만 읽어 색인 쓰기, `--check`), `mosaic-wasm`(`extern "C"` 내보내기 + 포인터·길이, 소스 셈을 wasm 안에). 다시 짓는 법은 rust/README.md
- lib/mosaic.wasm · lib/mosaic.js — 크기 우선 판으로 지은 wasm(31 KB, 바깥에서 받는 것 없음)과 손으로 쓴 싣개·화면 없는 셈(칸·자르기·씨앗·파일 이름)
- data/art-index.json — 그림 저장소 썸네일 154장의 서명·dHash·색 막대(38 KB). 그림을 더하면 다시 만든다(등록 흐름은 그대로, 색인에 없는 그림은 모자이크가 건너뛴다)
- mosaic.html — 바탕 고르기(책 → 그림, `?file=`), 조각 밀도 거칠게·보통·촘촘하게(32·48·72칸), 휴대폰 배경 1170×2532·세로 포스터 2048×3072, 원본 겹치기 0–40%, 한 그림 반복, PNG/JPEG 받기, 다른 배치. 쓰인 조각만 받고 못 받으면 빼고 다시 맞춘다, 줄 단위로 나눠 그린다. 조각을 누르거나 방향키로 옮기면 그 책·그 그림과 서가 링크. wasm 이 없으면 낱말 표의 말. 세로·휴대폰 가로·PC 배치
- dex.html · lib/bookshelf.js · lib/bookshelf.css · index.html — 서가 상세 틀 단추 옆 "모자이크로 만들기"(지금 큰 그림), 서재 펼친 책에도 같은 길(초상·개방 따라). 머리 항해는 344 폭에 다섯이 안 들어 그대로 넷
- lib/words.js · lib/workspace-ui.js — 모자이크 말 전부, 모자이크 화면의 머리 소개. 낱말 표 판은 화면 다섯 모두 `?v=7`(duel.html · prompt.html 도 — 새 말이 캐시의 옛 표에 막히지 않게)
- tests/mosaic.cjs · tests/mosaic-screen.cjs · tests/fixtures/make-art-index.py · tests/dex-screen.cjs · tests/browser-harness.cjs — 묵은 wasm(소스 셈)·같은 씨앗·최대 횟수·간격·색인 꼴, 화면 61가지, 서가·서재 단추. 검사 서버의 그림 응답에 GitHub Pages 처럼 `Access-Control-Allow-Origin: *`
- docs/ART_INDEX.md · AGENTS.md · .gitignore — 색인 꼴·다시 만들기·다음 일 "닮은 그림" 계획(거리 = 해시 해밍 + 색 막대 카이제곱 + Lab 서명, top-k 는 따로 `data/similar.json`), `rust/target/` 은 올리지 않는다

## 2026-10-21 · claude · 결투 「오늘의 판」과 오늘 기록 — 공방 지도가 읽는다
- lib/today.js — 새 파일. 다섯 공방이 한 출처(polos0117.github.io)라 localStorage 를 같이 쓴다: 판이 끝나면 atelier_today_v1:book 에 {d, n, w, daily, at, seen} 한 칸(bump), 다녀가면 seen(visit), 날짜 씨앗(seed), ?daily(isDaily). 모양의 약속은 지도 저장소 README 「오늘 기록」절, 다섯 저장소에 같은 파일
- duel.html — 덱 화면에 「오늘의 판」 단추(날짜가 씨앗 → 하루 동안 같은 상대 덱·같은 순서·같은 선공)와 오늘 n판 w승·끝냈나 글, ?daily 로 오면 덱이 갖춰졌을 때 바로 시작, 판이 끝나는 수에서 오늘 기록 한 칸(st.recorded 가 두 번을 막는다), 결과 머리에 「오늘의 판」 표, 열면 다녀간 자국
- lib/words.js — duel.deck.daily · daily.note · daily.done · today, duel.result.daily
- tests/duel-screen.cjs — 끝난 판 둘이 오늘 기록에(n 2·daily 아직·오늘 날짜), 덱 화면의 오늘 2판, 오늘의 판을 두 번 열면 상대 덱·손패 순서·선공이 같다, 끝내면 n 3·daily, 결과의 표, 덱 화면의 끝냈다 표시
- AGENTS.md · docs/GAME_CONCEPT.md — 결투 화면 표와 11절 6번에 오늘의 판·오늘 기록

## 2026-10-20 · claude · 책 다섯 권 더 — 열 장르에 두 권씩

- data/book-design.json — 프로젝트 헤일메리(SF)·안나 카레니나(비극)·괴도 신사 아르센 뤼팽(추리)·파우스트(사상)·자산어보(과학) 설계표(앞 커밋). 결투에 맞춰 안나 발단 "(최대 3)" → "(최대 2)", 헤일메리 전개 연료에 "(최대 4)"
- lib/prompt-spec.js · lib/book-frame.js · docs/GAME_CONCEPT.md — 새 정한 말의 영어, 책 틀 색 다섯, 9-3절 네 번째 다섯 권(앞 커밋). 결투 안내의 "열다섯 권" → "스무 권"
- lib/duel.js — `BOOK` 에 효과 다섯: 헤일메리 표본(받는 피해 −1)·연료·선생님(아군 타격 +1), 안나 열정·시선·기차(맞은편과 함께 닫힌다), 뤼팽 예고장·변장(빈 자리로)·훔치기, 파우스트 계약(+2)·빚(어느 자리든)·갚기, 자산어보 표식(+1)·번짐(같은 장르)·기록. 갈고리 둘(`allyPlayed` · `chapterEnd`), 들어오며 치는 첫 타격도 `targets` 를 거친다
- data/duel.json — 새 다섯 권의 수. 스무 권에서 선공 41% → `first_bonus` 4 → 5, 춘향전 60.2% → 절개 `max` 2 → 1, 안나 열정 `max` 3 → 2
- lib/words.js · duel.html — 새 규칙 기록 말 열아홉, 판 위 깃발(예고장·표식·표본·선생님), 규칙 한 장의 선공 보정 "+n" 은 자료에서
- tests/duel.cjs · tests/duel-sim.cjs · tests/duel-screen.cjs — 새 다섯 권 규칙 확인, 책 수는 설계표에서(15 고정 걷기), 춘향전 절개 문턱은 자료에서
- docs/DUEL_DESIGN.md · AGENTS.md — 4절 표에 다섯 줄, 5절 균형을 스무 권 3,000판으로 다시

## 2026-10-20 · claude · 크게 보기 「원본 열기」를 「원본 크기」로

- dex.html — 크게 보기의 「원본 열기」는 그림 파일을 새 창으로 열었는데, 홈 화면 앱(허브 범위 `/`)에서는 같은 앱 창에 그림만 떠서 돌아올 길이 없었다. 새 창 대신 크게 보기 안에서 제 픽셀 크기로 펼쳐 손가락·휠로 미는 「원본 크기」 단추로(다시 누르면 「화면에 맞추기」, 넘기면 다시 맞춘다). 원본 크기에서는 넘기기 손짓을 끈다
- lib/words.js · lib/gallery.css — 단추 말, 원본 크기 칸(가로·세로로 굴림)
- tests/gallery-screen.cjs — 새 창이 안 열리고, 제 픽셀 크기로 펼치고, 다시 누르면 맞추는지

## 2026-10-20 · claude · 휴대폰 서재 탭, 결투 판 접기, 서재 아래 링크 카드 걷기

- lib/workspace.css · lib/gallery.css — 휴대폰에서 숨기던 서재 탭을 되살렸다. 탭이 넷뿐이라 344 폭에서도 한 줄에 든다(간격·안쪽 여백을 줄였다). pkm 시절 "연구소·일곱 탭" 주석도 고쳤다
- lib/workspace-ui.js — 머리의 서재 링크를 문양 하나로 줄였다. 화면 제목("서가"·"결투")을 감싼 링크의 접근성 이름이 "서재" 라 보이는 이름과 어긋났다(WCAG 2.5.3). 제목은 이제 링크가 아니다
- duel.html · lib/words.js — 한 판 도중 손패 줄에 "판 접기". 확인 상자(alertdialog — 기본 포커스는 계속 두기, Esc·바깥 누르기면 그대로, 그동안 상대도 기다린다)를 거쳐 판을 지우고 덱 고르기로. 고른 여섯 권은 남는다. 끝난 판에는 없다(덱 바꾸기가 있다)
- index.html · lib/words.js · lib/workspace.css · lib/gallery.css — 서재 아래 "01 / SHELF·02 / STUDIO·03 / DUEL" 링크 카드 셋을 지웠다. 위 탭과 같은 길이고 다른 곳에서 쓰지 않는다
- tests/header-layout.cjs — 다섯 크기 모두 탭 넷이 보이는지, 머리의 링크는 글자 없는 문양 하나뿐이고 제목은 링크가 아닌지. tests/duel-screen.cjs — 판 접기의 포커스·inert·Esc·계속 두기·접기(덱은 그대로)

## 2026-10-20 · claude · 주소에 상태 남기기 — 서가 상세·생성기·펼친 책

- dex.html — 상세를 열면 기록 칸에 ?book=<열쇠> 를 싣는다(pushState). 상세 안에서 책을 넘기면 주소만 바꾸고(replaceState), 앞으로 가기면 다시 그 책. 상세에서 새로고침해도 그 책이고 기록 칸이 늘지 않는다. 바로 온 ?book= 주소는 목록 칸 위에 상세 칸을 쌓아 뒤로 가기가 목록으로 간다
- lib/prompt-ui.js — 고른 책·모드를 ?book=&mode= 로 늘 적는다(replaceState — 고르기마다 기록이 쌓이지 않게). 주소의 모드가 저장값보다 먼저다. 공유한 주소가 그 책·그 모드로 열린다
- lib/bookshelf.js · index.html — 책을 펼치면 ?open=<열쇠>(서가의 ?book= 과 짝). 닫거나 뒤로 가기면 빠지고 포커스는 그 책등으로, 새로고침·앞으로 가기·공유면 그 책이 펼쳐진다
- tests/dex-screen.cjs · tests/prompt-screen.cjs · tests/bookshelf-screen.cjs — 주소·새로고침·뒤로·앞으로·공유 주소를 본다

## 2026-10-20 · claude · 글꼴을 실제로 싣고, 영어 어깨 글자를 걷다

- index.html · dex.html · prompt.html · duel.html — Google Fonts 에서 명조(Noto Serif KR 500·600·700)와 고딕(IBM Plex Sans KR 400–700)을 싣는다. preconnect 두 줄 + display=swap. 못 받으면 기기 글꼴로 그대로 뜬다(검사는 바깥이 막힌 채로 돈다)
- lib/workspace.css · lib/gallery.css — 본문은 IBM Plex Sans KR 를 먼저. 제목·책등은 이미 쓰던 --gallery-serif(Noto Serif KR). .editorial-kicker 는 고정폭·자간 큰 대문자 꼴을 버리고 본문 글꼴로
- lib/bookshelf.css — 책등·판·쪽 번호의 Georgia 를 같은 명조로. 걷어 낸 어깨 글자 자리의 규칙도 지웠다
- duel.html — 정의되지 않은 var(--display) 대신 --gallery-serif(절정 제목·이름표)
- lib/words.js · lib/workspace-ui.js · lib/bookshelf.js · dex.html · lib/room.css — "LIBRARY × ATELIER / BOOK / 001"·"STORIES THAT FIGHT"·"THE PRIVATE LIBRARY"·"A STORY BETWEEN THE PAGES"·"THE LITERARY PORTRAITS" 를 지웠다(정보가 없는 장식). 같은 사이트 안 링크의 ↗ 도 뺐다(서가에서 자세히 보기·책 고르기·생성기에서 열기·서가에서 보기·서가 칸). 원본 그림을 새 탭으로 여는 링크의 ↗ 만 남는다
- tests/header-layout.cjs — 화면 넷의 글꼴 링크(명조·고딕·swap·preconnect)와 영어 어깨 글자가 없는지 본다. tests/bookshelf-screen.cjs — 펼친 책의 서가 링크에 ↗ 가 없는지

## 2026-10-20 · claude · 책등 빛을 그 책의 팔레트에서, 제목은 한 줄로 다

- lib/bookshelf.js — 이름 해시로 여섯 색 중 하나를 고르던 것을 없애고, 서가 장정 틀과 같은 lib/book-frame.js 의 표지·금박 빛으로 책등을 칠한다. 양장은 가죽 빛 바탕에 금박(대비 4.5 가 안 되면 양피지 빛 글자), 한지 선장은 한지 바탕에 그 책의 실 빛, 죽간은 대나무에 그 책의 끈 빛. 높이는 제목 길이에서 정하고, 펼친 책 그림에 width/height 를 준다
- lib/bookshelf.css — 책등 제목이 잘리거나("프랑켄슈타이") 두 단으로 갈리던 것을 고쳤다. 제목 칸 높이(100cqh)를 글자 수로 나눠 글자 크기를 줄이고 한 줄로 둔다. 긴 제목은 문양을 뺀다
- index.html — lib/book-frame.js 를 싣는다
- tests/bookshelf-screen.cjs — 책등 빛 = 그 책의 COVER(양장 바탕·한지 실·죽간 끈), 책마다 다른 빛, 다섯 크기에서 제목이 한 줄로 칸 안에 드는지 본다

## 2026-10-20 · claude · 결투 크게 보기·절정 대화상자 접근성

- duel.html — 크게 보기·절정이 서가의 Zoom 처럼 연다: 닫기 단추로 포커스, 뒤쪽 판은 inert, Esc 로 닫기, Tab 은 안에서만, 닫으면 연 자리로 포커스. aria-modal 을 달았다. 절정은 2.2초 뒤 저절로 닫히던 것을 없애고 누르거나 Esc 로 닫게 했다(그동안 상대 차례도 기다린다). 움직임 줄이기면 나타나는 움직임을 끈다
- tests/duel-screen.cjs — 두 대화상자의 포커스·inert·Tab·Esc·포커스 되돌림, 절정이 3초 뒤에도 남는지 본다. 상대 절정이 뜨면 닫고 차례를 기다린다

## 2026-10-20 · claude · 화면 다듬기 스킬 둘

- .claude/skills/frontend-design/ — 화면을 새로 만들거나 손볼 때 흔한 기본값을 피하고 주제에 맞는 색·서체·배치를 정하게 하는 지침. anthropics/skills 의 것을 그대로(Apache 2.0, LICENSE.txt 같이)
- .claude/skills/web-design-guidelines/ — "UI 검토해 줘" 에 화면 코드를 Vercel Web Interface Guidelines(접근성·포커스·터치 자리·대비)로 검사. 쓸 때마다 지침 원문을 GitHub 에서 받는다. vercel-labs/agent-skills 의 것을 그대로

## 2026-10-20 · claude · find-skills 스킬

- .claude/skills/find-skills/SKILL.md — "이런 일 하는 스킬 있나" 를 물으면 공개 스킬 모음(skills.sh, `npx skills find`)에서 찾아 설치까지 돕는 스킬. vercel-labs/skills v1.7.4 의 것을 그대로(MIT)

## 2026-10-20 · gpt · 회전 진열대를 책장과 펼친 책으로
- index.html · lib/bookshelf.js · lib/bookshelf.css — 자동 회전을 없애고 책등이 꽂힌 목제 책장으로 바꿨다. 책을 누르면 앞으로 나와 펼쳐지고, 왼쪽 인물 그림·오른쪽 소개에서 개방 보기와 서가 상세로 이어진다. 좁은 세로 화면은 그림과 소개를 위아래로 읽는다.
- 책장 — 공간별 진열 목록을 유지하고 기본 책 순서를 고정했다. 두께·색·문양·한지/죽간 장정을 구분하며, 포인터와 키보드로 표지를 미리 볼 수 있다. 세 공간은 목재 색과 기존 배경을 공유한다.
- 펼친 책 — 닫기·Esc·바깥 누르기, 포커스 가두기와 원래 책등으로 복귀, 배경 스크롤 잠금, 화면 회전 후 복귀, 동작 줄이기, 그림 없는 책의 안내를 지원한다.
- lib/workspace.css · lib/landscape.css · lib/room.css — 쓰지 않는 회전 진열대 스타일·반복 애니메이션을 제거하고 화면별 CSS 캐시 버전을 갱신했다.
- lib/words.js · AGENTS.md — 책장 문구와 현재 화면 구조·검사 목록을 갱신했다.
- tests/bookshelf-screen.cjs · tests/dex-screen.cjs · tests/landscape-screen.cjs — 새 책장 동작과 기존 진열 연동, 가로 화면 검사를 새 구조에 맞췄다.

## 2026-10-20 · gpt · 달빛 서고·고요한 서재 공간 배경
- lib/workspace-theme.js · lib/workspace.css · lib/room.css — 세 공간의 색상, 배경 경로와 모바일 축소본 경로를 분리했다. 본문은 불투명 바탕에 두며 배경 끄기가 모든 공간·화면 크기에서 우선한다.
- lib/workspace-ui.js · lib/words.js — 설정과 서재에서 공간을 고를 수 있고, 이름·소개·문양·진열 목록이 선택한 공간을 따른다. 다른 atelier의 저장값과 기존 진열 목록은 보존한다.
- index.html · dex.html · prompt.html · duel.html — 공용 자산 캐시 버전을 올렸다.
- book-atelier-img/backgrounds — 사용자가 제공한 달빛 서고·한옥 서재 이미지를 1536px WebP(약 208~236 KiB)와 800px 모바일본(약 56~61 KiB)으로 등록했다. 생성 기록은 records/backgrounds에 보관한다.
- tests/theme-screen.cjs · tests/browser-harness.cjs — 세 공간 × 네 화면 × 다섯 화면 크기에서 공간 선택·설정 저장·배경 끄기·이미지 경로·글자 대비·스크롤을 확인했다. 실제 배경을 시험할 BACKGROUND_DIR을 지원한다. 가로 화면 검사와 결투 한 판 끝까지 진행·화면 회전 검사도 통과했다.
- lib/room.css — 공간별 이미지 선택보다 배경 끄기 설정이 우선하도록 CSS 선택자의 우선순위를 수정했다.

## 2026-10-20 · gpt · 햇살의 도서관 — 공간 배경
- 기존 색상 테마 선택을 햇살의 도서관으로 새로 구성했다. 상단과 바깥 여백에는 창과 책장이 보이고, 작품·본문 뒤에는 불투명한 종이 바탕을 둔다. 서재·서가·프롬프트·결투가 같은 색을 쓴다.
- 설정에서 도서관 풍경 / 종이 바탕을 고른다. book 전용 설정 키를 사용하고, 이전에 선택한 테마의 진열 목록을 한 번 복사한다. 다른 테마의 기존 진열 목록과 공용 설정은 그대로 보존한다.
- 배경은 book-atelier-img/backgrounds에 보관한다. 1536px WebP 약 216 KiB, 모바일 800px 약 64 KiB. 배경을 못 받아도 종이 바탕이 유지되고, CSS 배경이므로 로딩 중 배치가 움직이지 않는다.
- 데스크톱·모바일·가로 화면, 글자 대비, 키보드 감상, 설정 유지와 진열 이전을 검증했다.

## 2026-10-20 · claude · 폴드 덮개 가로(882×344)도 첫 화면에
- lib/landscape.css — 서가 목록: 장르 띠·검색 조건·권 수와 크기 단추를 한 줄에(세 줄이면 덮개 가로에서 책 칸이 안 보였다), 책 칸 조금 더 좁게. 프롬프트: 책 고르기도 왼쪽 단으로 넣고 결과를 오른쪽 단 맨 위부터 붙인다(전에는 책 고르기 줄 밑에서 결과가 시작해 덮개에선 거의 안 보였다). 서재: 높이 400 아래에선 글 띠의 머리말·꼬리표를 접고 소개 두 줄.
- duel.html — 가로 낮은 화면의 덱 고르기 칸을 좁게 여럿(다섯 칸이면 그림 하나가 화면보다 높았다).
- tests/landscape-screen.cjs — 882×344 를 더하고, 크기 단추도 같은 줄인지.

## 2026-10-20 · claude · 휴대폰 가로 화면 — 서재·서가·프롬프트
- lib/landscape.css(새) — 가로이고 높이 550px 아래일 때만. 서가 목록은 안내문을 접고 장르 띠·검색 조건을 한 줄에, 책 칸을 좁게 여럿 — 첫 화면에 책 그림이 보인다(전에는 머리글·안내문·장르 단추가 첫 화면을 다 먹었다). 책 보기는 큰 그림을 남는 높이에 맞춰 왼쪽에, 글은 오른쪽. 프롬프트는 책 고르기를 한 줄로, 설정은 왼쪽·결과는 오른쪽에 붙여 둔다(설정을 내려도 결과가 보인다). 서재는 진열대를 화면 높이에, 글을 왼쪽 띠로. 세로·폴드·PC·결투는 그대로.
- index.html · dex.html · prompt.html — gallery.css 뒤에 landscape.css.
- lib/prompt-ui.js — 결과 칸에 studio-out 표시(오른쪽 단 자리).
- lib/gallery.css — 머리글 소개 문장을 한 줄(말줄임)로. 690 폭에서 프롬프트 화면만 소개가 두 줄이 되어 제목이 9px 올라가 header-layout 검사가 깨져 있었다.
- tests/landscape-screen.cjs(새) — 844×390·915×412·740×360 에서 첫 화면 책 칸·한 줄 거르기·큰 그림이 화면 안·결과 오른쪽 붙임·서재 진열대·가로 넘침 없음, 세로는 그대로.
- AGENTS.md — 새 검사.

## 2026-10-20 · claude · 결투 화면 — 가로·세로 두 배치, 크게 보기
- duel.html — 판(.duel-board)을 CSS 그리드로: 영역(bar·hint·foe·me·hand·log·extra)만 방향에 따라 다르게 놓는다. 세로는 위 상대·아래 나·손패 맨 아래, 가로(너비 600 이상)는 펼친 책 — 왼쪽 면 나(자리·손패)·오른쪽 면 상대(자리·기록), 가운데 접힌 선, 맞은편은 번호 ①②③. 발단→전개→결말은 어느 배치든 왼쪽→오른쪽. 휴대폰 가로(높이 550 이하)는 자리 그림 60×72, 손패 그림·수치 숨김, 힌트 접고 고르기 모드는 위에 띄워 844×390 한 화면에(머리 자리는 안 건드린다). 자리·손패마다 ⌕ 크게 보기(그 폼 그림·역할 수치·고유 규칙 쓰임, 화면 가득), 표적이 아닌 책은 눌러도 크게. 자리·손패는 단추 안에 단추가 안 들어가게 칸(div) + 누르기(.pick) + ⌕(.zoom). 절정·크게 보기는 가로에선 그림 왼쪽·글 오른쪽. 한 판 도중 돌려도 같은 상태를 다른 그리드에 그린다.
- lib/words.js — duel.zoom · duel.zoom.power.
- tests/duel-screen.cjs — 휴대폰 가로(844×390)·세로(390×844)·폴드 안쪽·PC 넷에서: 배치(가로는 왼쪽 나·오른쪽 상대·손패 내 면 아래·자리 번호, 세로는 위 상대·아래 나·손패 맨 아래), 발단→결말 왼쪽→오른쪽, 가로 넘침 없음, 휴대폰 가로는 한 화면, 크게 보기 화면 가득, 한 수 두고 돌려도 판·기록 그대로이고 배치만 바뀜, 끝까지 세 장.
- docs/DUEL_DESIGN.md — 2절 기준표에 '가로·세로 두 배치에 다 들어가나', 3-8절 배치.
- AGENTS.md — 결투 화면 두 배치, 검사 설명.

## 2026-10-20 · claude · 결투를 기획·지침에
- docs/GAME_CONCEPT.md — 3절을 책장 넘기기 결투로(폼 = 시간, 자리 셋·세 턴, 절정, 상성·역할·고유 규칙), 11절에 결투 완료와 다음 숙제.
- AGENTS.md — 첫 줄·문서 표·화면 표에 결투, 규칙 1 에 결투의 폼 = 장과 책을 더할 때 할 일, 검사 목록에 duel·duel-sim·duel-screen.
- README.md — 화면에 결투, 결투 문서.
- duel.html — 같은 때 올라온 문학 화보집 머리(lib/gallery.css)를 결투 화면도 두른다 — 화면 넷의 머리 자리가 같게.

## 2026-10-20 · claude · 결투 화면 — 휴대폰 세로 한 화면에서 AI 와 한 판
- duel.html — 덱 고르기(열다섯 권에서 여섯, 자동·비우기) → 대결: 위 막대(장·턴·차례·합·가져간 장·상대 손패·본 손패), 상대 자리 셋·내 자리 셋(그 폼 초상, 힘·토큰·깃발), 손패 한 줄(발단 폼 그림·역할·수치), 손패를 고르면 빈 자리가 표적·내 책을 누르면 칠 상대가 표적·절정은 내 책 고르기·고유 규칙 수(드라큘라)·넘기기·규칙 한 장, 절정이 터지면 그 폼의 개방 그림이 판 전체 장면으로, 기록 여섯 줄, 결과(세 장 합)와 다시·덱 바꾸기. 판은 매 수 localStorage(book_duel_v1)에 — 새로고침해도 이어진다. 상대 AI 는 0.65초 뒤에 둔다. 그림은 lib/img.js·data/img.json 으로, 없으면 이름표.
- lib/words.js — nav.duel · home.duel.* · duel.* (덱·막대·단추·힌트·깃발·기록·결과·규칙 다섯 줄·고유 규칙이 돈 순간 47개).
- lib/workspace-ui.js — PAGES 에 duel(머리 탭 넷, 서재의 길 하나), 부제 있는 화면.
- tests/duel-screen.cjs — 덮개 크기: 덱 고르기·저장, 자리 셋씩, 짜 둔 판으로 내기(들어오며 친다)·공격·절정 장면(단옷날 그네)·규칙·새로고침·끝까지 세 장·다시·덱 바꾸기·상대 차례. 누르는 자리 44px·가로 넘침 없음·낱말 표 열쇠.
- tests/theme-screen.cjs · tests/header-layout.cjs — 화면 넷(결투 포함).
- lib/duel.js · data/duel.json · data/book-design.json · tests/duel.cjs · tests/duel-sim.cjs · docs/DUEL_DESIGN.md — 균형 손질 둘: 춘향전 결말 반격은 맞은편 말고 다른 상대에게만(59 → 58%), 손자병법 자리 바꾸기는 형세 하나(결말 7 → 16회). 빠른 모드(--quick)는 문턱을 보고만 한다. 5절 표를 최종 수치로.

## 2026-10-20 · claude · 책 결투 시뮬레이터와 균형
- tests/duel-sim.cjs — 욕심쟁이 AI 둘이 무작위 여섯 권 덱으로 3,000판. 책별·장르별 승률, 폼별 규칙이 돈 횟수, 선공 승률, 절정 역할. 책이 40~60% 밖이거나 선공이 밖이거나 어느 폼 규칙이 한 번도 안 돌면 실패.
- lib/duel.js — 균형 손질: 프랑켄슈타인 결말은 결말에 들면 저절로 넘기고 떠난다(아군이 있을 때, 조각마다 +2), 드라큘라는 발단·전개 내내 친 책에 자국·데려온 책이 그녀 자리에 선다, 바스커빌은 상대 손패가 비면 판 위 가장 센 책을 공개, 보물섬 항해·손자병법 형세는 발단·전개 내내(자리 바꾸기는 장마다 한 번), 오만과 편견은 들어서며 판 위 상대도 판정하고 판정한 책은 내 책 모두가 +2(allyStrike 갈고리), 춘향전 절개 상한. 스스로 떠난 책(left·dawn)은 AI 값에서 패배로 안 센다(lost). 공격도 기록(t:'attack'). 한글 리터럴을 없앴다 — 폼 이름은 설계표 form_key 차례에서(stagesOf).
- data/duel.json — 바스커빌 단서 2, 드라큘라·반지·보물섬 문턱 2, 춘향전 절개 상한 2, 정찰 절정 −2.
- tests/duel.cjs — 바뀐 규칙에 맞춘 기대값, 떠남은 lost 에 안 센다, 판정은 아군 모두, 공개는 판 위도.
- docs/DUEL_DESIGN.md — 5절 균형 결과 표와 남은 숙제.

## 2026-10-20 · claude · 책 결투 엔진
- lib/duel.js — 책장 넘기기 엔진. 장 셋 × 양쪽 세 턴, 자리 셋, 내기(들어오며 맞은편을 친다)·공격·절정·넘기기, 치기 = 타격 + 상성 − 방패, 역할 여섯의 하나 더(돌파 방패 무시 · 지원 아군 힘 · 정찰 어느 자리든 · 교란 번짐), 책장을 넘기면 폼·힘이 새로, 절정 장면 효과 여섯, 첫 장 선공 보정, 열다섯 권 고유 규칙(BOOK 표 — 책 하나 = 효과 하나, 갈고리 열둘), 한 수 앞만 보는 AI 둘(욕심쟁이·무작위). 난수는 mulberry32 하나라 같은 시드 같은 판.
- data/duel.json — 수치: 역할 여섯의 힘·타격·방패, 장르 상성표(공격 → 수비), 절정 장면, 선공 보정 4(스모크 400판에서 0 이면 선공 28%, 4 면 52%), 책마다 고유 규칙의 수.
- tests/duel.cjs — 규칙 236가지: 파생·상성표 대칭·덱·시드·손패·내기·치기·역할·장·책장 넘기기·승패·선공 보정·절정 여섯·열다섯 권 규칙 하나하나·자동 넘기기·AI.

## 2026-10-20 · claude · 열다섯 권 고유 규칙을 장(章) 구조로
- data/book-design.json — rule.forms 열다섯 권을 새 결투(책장 넘기기)에 맞춰 다시 썼다: 줄(lane)·판 대신 장·자리·맞은편·내 턴마다. 원리·대응은 그대로 두되 줄 말이 든 여섯 권(앨리스 원리, 춘향전·보물섬·손자병법·드라큘라·눈물을 마시는 새 대응)만 자리 말로. 눈물을 마시는 새 결말 동행 넷→셋(자리가 셋), 보물섬 발단 이긴 판→내 턴. 바꾼 까닭은 docs/DUEL_DESIGN.md 4절.
- tools/book-design.py — 고유 규칙(원리·사용법·대응)에 옛 3줄 엔진 말(이 줄의·다른 줄로·뒷줄 …)이 있으면 걸린다. 줄기·줄어든다는 통과.
- tests/book-design.py — 줄 말이 걸리고 줄기·줄어든다는 통과하는 경우.

## 2026-10-20 · claude · 책 결투 규칙 전체
- docs/DUEL_DESIGN.md — 3절 규칙: 덱 여섯(같은 책 둘 안 됨)·손 넷 + 턴마다 한 장, 자리 셋씩, 장(章) 셋 × 양쪽 세 턴, 책장을 넘기면 폼·힘이 새로, 한 턴에 내기·공격·절정·넘기기 하나, 치기 = 타격 + 상성(+2/−1) − 방패, 역할 여섯의 수치와 개방 장면 효과, 장르 상성표(공격→수비), 장을 많이 가져간 쪽이 이김·앞 장을 잃은 쪽이 후공. 4절: 열다섯 권 고유 규칙을 장 구조로 다시 쓴 표와 바꾼 이유 셋.

## 2026-10-20 · claude · 책 결투 — 세 방향 비교와 선택
- docs/DUEL_DESIGN.md — 책장 넘기기·절정 중심·장르 충돌 세 방향을 한 판 흐름·이기는 조건·폼·개방·장르·예시 한 판으로 구체화하고 기준표 여섯으로 견줬다. 책장 넘기기(폼 = 장(章) = 시간)를 고르고, 절정의 개방 연출과 장르 충돌의 상성 배율을 들여온다. 설계표의 폼별 사용법이 이미 모은다→쓴다→터뜨린다 꼴이라 줄(lane)을 장(章)으로 풀면 규칙 문장이 거의 그대로 산다.
## 2026-10-20 · gpt · 일러스트를 먼저 만나는 문학 화보집 서가
- dex.html — 큰 작품 목록·장르 바로가기·접을 수 있는 상세 필터, 대표 그림과 인격을 먼저 보는 상세 펼침면, 일상컷과 작품 설명의 분리. 기존 검색·폼 비교·화풍·진열·책 넘기기·원본·생성기 연결은 유지.
- lib/gallery.css · index.html · prompt.html — 공통 머리와 명조 제목·종이색 바탕·얇은 구분선, 반응형 갤러리와 모바일 감상 조작. 기존 여덟 테마·밀도·단일 스크롤 영역 유지.
- dex.html · lib/words.js — 감상 창의 초점 고정·배경 inert·닫기 후 초점 복귀, 목록 복귀 시 작품에 초점, 이미지 실패 안내와 예약 비율, 감상 창 안의 장정 토글. 표시 문구는 낱말 표에만 추가.
- tests/dex-screen.cjs · tests/gallery-screen.cjs — 접힌 필터 조작을 반영하고 감상 창 키보드·비율·이미지 지연·모바일 넘침을 확인.
- tests/header-layout.cjs · tests/img-shards.cjs — 헤더 검사에서 데이터 로딩 뒤 새 화면을 기다리고, Windows CRLF에서도 이미지 제외 규칙을 읽게 했다.

## 2026-10-19 · claude · 보호 중인 책은 원작 글에서만 — 반지의 제왕·눈물을 마시는 새
- lib/prompt-book.js · lib/prompt-spec.js — 아직 보호 중인 책(생존 작가·1963년 이후 사망·해외 보호)이면 새 인물·이어가기·개방·일상컷 모두에 SOURCE ONLY 줄: 원작 글에서만 그리고 영화·드라마·게임·애니·표지의 의상·소품·디자인·문장·배색을 따라 하지 않는다. 각색 이름은 싣지 않는다. 기준 해(1962)를 `KOREA_LAST_EXPIRED_DEATH` 로.
- tools/book-design.py — 생존 작가 `alive: true`(사망 연도 대신). 보호 중인 책은 따라 하지 않을 각색 `adaptations` 를 적어야 통과. 경고에 생존 작가도.
- data/book-design.json — 세 번째 다섯 권에서 삼총사·천일야화를 빼고 반지의 제왕(모험)·눈물을 마시는 새(동화·판타지)를 넣었다. 둘 다 인용 안 함(정한 말에 더함). 재료 scaled_pages, 자세 skyward_gaze, 팔레트 teal_silver·forest_red. 빠진 두 권만 쓰던 말(en_garde·reclining_tale·lapis_saffron)은 걷었다.
- dex.html · lib/words.js — 책 정보에 생존 작가·국내 보호 중 표시, 따라 하지 않을 각색 줄.
- lib/book-frame.js — 새 팔레트 표지 빛.
- tests/prompt-book.cjs · tests/book-design.py — 보호 판정과 줄이 네 갈래에 다 실리고 만료된 책엔 없다, 각색 이름이 프롬프트에 없다, 기준 해가 검사기와 같다. 생존 작가·각색 칸 검사.
- AGENTS.md · docs/GAME_CONCEPT.md — 기준 문장, 세 번째 다섯 권 표, 후보 목록의 보호 중 줄.

## 2026-10-19 · claude · 저작권 사망 연도 검사를 경고로
- tools/book-design.py — 한국에서 아직 보호 중인 책(저자 1963년 이후 사망)을 막지 않고 `!` 경고로 알린다(`warnings()`). 개인 취미용이라. 사망 연도·작자 미상·해외 보호 여부·인용 출처 칸은 그대로 검사한다.
- tests/book-design.py — 1996년 사망 저자는 통과하되 경고가 나온다, 지금 열다섯 권은 경고가 없다.
- AGENTS.md · docs/GAME_CONCEPT.md · data/book-design.json(note) — 기준 문장. 원작 삽화와 함께 영화·게임이 만든 모습(오즈의 루비 구두 같은)도 베끼지 않는다.

## 2026-10-19 · claude · 책 다섯 권 더 — 장르 두 바퀴째
- data/book-design.json — 오만과 편견(로맨스)·드라큘라(공포)·삼총사(모험)·천일야화(동화·판타지)·걸리버 여행기(희극·풍자). 원리·폼 셋(모습·역할·자세)·개방 셋·고유 규칙과 대응·장면 카드·얼굴 계통까지. 정한 말에 재료 letter_paper, 자세 dance_turn·en_garde·reclining_tale·towering_lean, 팔레트 blush_ivory·crimson_black·lapis_saffron·sea_sand. 새 책은 시범을 두지 않는다(시범끼리 장르가 겹치면 안 된다). 설계표 검사 통과 — 열다섯 권 어느 둘도 실루엣 3+·얼굴 2+ 다르다.
- lib/prompt-spec.js — 새 말의 영어 풀이.
- lib/book-frame.js — 새 팔레트 넷의 표지 빛.
- docs/GAME_CONCEPT.md — 세 번째 다섯 권, 후보 목록에 천일야화.

## 2026-10-19 · claude · 테마 빛깔·배경을 책 재료로
- lib/workspace.css — 테마 여덟의 빛깔과 배경이 pkm·myth 와 거의 같았다. 열쇠는 그대로 두고(같은 주소의 테마 선택이 이어진다) 책 재료로: 열람실 = 줄 쳐진 종이결·창빛, 한밤의 서고 = 금빛 별자리 지도, 꽃잎 책갈피 = 눌러 말린 꽃잎, 이끼 낀 서가 = 녹색 가죽에 금박 격자, 자줏빛 장정 = 천 장정 결, 양피지 = 얼룩진 양피지, 심해 문고 = 청록 마블지, 등잔불 = 마호가니 나뭇결과 등잔빛. 그림 조각은 다 인라인 SVG. 글자 대비(AA)는 여덟 다 지킨다.
- lib/workspace-theme.js · index.html · dex.html · prompt.html — 주소창 빛(theme-color)을 새 판 빛깔로.
- lib/words.js — 테마 설명 넷을 새 배경에 맞췄다.

## 2026-10-18 · claude · 생성기 화면이 안 뜨던 것 고침
- lib/prompt-ui.js — 바로 앞 칸(얼굴 계통)에서 얼굴 설계 목록에 괄호 하나가 남아 생성기 화면 전체가 안 떴다. 화면 검사가 실패한 채로 올렸다 — 괄호를 고치고 화면 검사를 다 돌려 확인했다.

## 2026-10-18 · claude · 설계표 얼굴 계통
- data/book-design.json · tools/book-design.py — 책마다 ethnicity(생성기 외형 선택지 facial ethnicity 와 같은 열쇠). 코스모스·앨리스·프랑켄슈타인·바스커빌 European, 돈키호테 Mediterranean, 햄릿 Nordic, 춘향전 Korean, 손자병법 Chinese, 보물섬 Latin American(카리브해), 타임머신 mixed East Asian and European(먼 미래). 비워 두면 모델이 서구권 얼굴로 쏠렸다 — 그린 여섯 권 중 다섯이 유럽계. 정한 말인지 검사.
- lib/prompt-spec.js · lib/prompt-book.js — 새 인물 FACE 줄에 "broad … ancestry with individual variation, no stereotyped features". 외형에서 계통을 고르면 그쪽이 이기고, 이어가기는 첨부 그림이 정한다. 이미 그린 책은 바뀌지 않는다.
- lib/prompt-ui.js · lib/words.js — 얼굴 설계 목록에 얼굴 계통.
- tests/prompt-book.cjs — 설계표 계통·고른 계통이 이김·이어가기엔 없음.

## 2026-10-18 · claude · 이어가기 폼은 겉옷을 새로
- lib/prompt-spec.js — 이어가기 출력 줄에 "첨부 그림의 겉옷·코트·망토·안감 그림을 다시 쓰지 말고 FORM 이 말한 옷을 짓는다, 재료·팔레트만 남긴다". 바스커빌가의 개 발단·결말이 사냥개 그림 안감의 같은 긴 코트를 입어 폼 차이가 자세·배경에만 났다.
- tests/prompt-book.cjs — 이어가기에 겉옷 바꾸기 줄.

## 2026-10-18 · claude · 폼 초상에 개방 명장면을 미리 넣지 않기
- lib/prompt-spec.js · lib/prompt-book.js — 폼 초상(새 인물·이어가기)에 HOLD BACK 줄: 그 책의 개방 장면 셋을 적고, 그 괴물·사건·핵심 물건은 먼 형체·조각상·그림·비친 모습으로도 배경에 넣지 않는다. 바스커빌가의 개 폼 셋 모두 창밖·바위 위에 사냥개가 서 있어 결말 개방의 정체 드러남이 김빠졌다.
- tests/prompt-book.cjs — 새 인물·이어가기에 개방 장면 셋, 개방엔 없음.

## 2026-10-18 · claude · 일상컷 원작 시대
- lib/prompt-ui.js · lib/prompt-random.js · lib/words.js — 일상컷 장면 설정에 "시대" 칸: 현대(기본) · 원작 시대(설계표 era·region). 랜덤·잠금·기록에 같이.
- lib/prompt-spec.js · lib/prompt-book.js — 원작 시대를 고르면 ERA 줄: 같은 갈래·예시·옷·장소를 그 시대·지역 판으로, 고른 옷의 알아볼 부품 두세 개는 남기고, 그 시대에 없던 직업은 가장 가까운 것으로(경찰 → 경비대·야경꾼), 폼 의상의 재료(책장·제본·해골 같은 상징 장식)와 현대 물건은 쓰지 않는다. 햄릿 "당시 시대 경찰" 이 폼 의상 쪽으로 흘렀다.
- tests/prompt-book.cjs · tests/prompt-screen.cjs — 시대 줄의 자리·기본은 현대·폼 초상엔 없음, 화면에서 고르기·잠금·기록.

## 2026-10-18 · claude · 손 엄지 방향 · 경찰·간호사 코스튬 · 고른 옷은 제 모습대로
- lib/prompt-spec.js — 손 줄: "엄지는 그 손의 안쪽, 뒤집힌 손 없이". 햄릿 일상컷에서 탁자 짚은 오른손의 엄지가 바깥쪽에 붙어 손가락 차례가 거꾸로였다(개수만 보는 줄이라 통과했다). 경찰·간호사 예시가 금지어뿐이라 부품이 없었다 — 모자·견장 셔츠·넥타이·장식 배지·벨트 스커트(경찰), 흰 단추 원피스·접은 캡·앞치마 단(간호사)과 한 손 동작으로, "극장" 말은 빼고 코스튬 파티로(햄릿이 극장 분장실의 고딕 무대 의상으로 끌려갔다). WARDROBE: 고른 옷은 제 색·부품을 지키고, 원작은 작은 장식 하나까지 — 옷을 제 의상·장르·팔레트로 바꾸지 않는다.
- tests/prompt-book.cjs — 손 줄의 엄지 방향, 경찰·간호사 프롬프트(모자·극장 말 없음·옷 지키기).

## 2026-10-18 · claude · 새 다섯 권의 시범 폼을 발단으로
- data/book-design.json — 햄릿·바스커빌가의 개·보물섬·타임머신·손자병법의 시범(폼·개방)을 발단으로 맞췄다. 처음 다섯 권은 그대로 — 그 시범 폼으로 정본 그림이 이미 있어, 바꾸면 생성기가 다른 그림을 정본으로 첨부하라고 한다.

## 2026-10-18 · claude · 책 다섯 권 더 — 열 장르에 한 권씩
- data/book-design.json — 햄릿(비극)·바스커빌가의 개(추리)·보물섬(모험)·타임머신(SF)·손자병법(사상). 아직 없던 장르 다섯. 원리·폼 셋(모습·역할·자세)·개방 셋·고유 규칙과 대응·장면 카드까지. 정한 말에 팔레트 moss_tweed·brass_teal, 장정 bamboo(죽간). 설계표 검사 통과 — 열 권 어느 둘도 실루엣 3+·얼굴 2+ 다르고, 시범 장르가 겹치지 않는다.
- lib/prompt-spec.js — 새 팔레트 둘의 영어 풀이.
- lib/book-frame.js · lib/book-frame.css · lib/words.js — 죽간 틀: 세로로 늘어선 대나무 쪽, 위아래로 엮은 두 줄 끈. 손자병법에. 새 팔레트의 표지 빛.
- tests/dex-screen.cjs · tests/prompt-screen.cjs · tests/register-images.py — 책 수·그림 없는 책을 설계표에서 읽는다(다섯 권을 박아 두지 않는다). 죽간 틀·틀 종류마다 단추 말·틀 종류 = 설계표 장정. 없는 책 예시를 hamlet 에서 no_such_book 으로.
- docs/GAME_CONCEPT.md · IMAGE_RULES.md — 두 번째 다섯 권, 죽간 틀.

## 2026-10-18 · claude · 일상컷 예시 장면 문장 모두 채우기
- lib/prompt-spec.js — EXAMPLE_DETAIL 에 나머지 갈래(자동·운동·책 에디토리얼·홈웨어·이브닝·일상·와일드카드) 예시 115개의 장면 문장: 옷차림 + 한 가지 동작. 장면 문장이 없던 예시는 프롬프트에 영어 이름만 실려 옷이 흐렸다. 건담·포켓몬에서 온 에디토리얼 예시(분사 밑단·조종석 하네스·발광 회로 …)는 책 말(펼친 책장·책 테두리 …)로 옮겼다.
- tests/prompt-book.cjs — 모든 갈래의 예시가 장면 문장을 갖는지, 일상컷 760 낱말 안, 풀이에 건담·포켓몬 말이 없는지.

## 2026-10-18 · claude · 전통 의상 일상컷 — 고른 전통이 이긴다
- lib/prompt-spec.js — 전통 의상 갈래 풀이가 "그녀의 계통에서 온 전통복" 이라 책의 지역(라만차)이 이겼다 — 돈키호테에서 아오자이를 골랐는데 스페인 농가 옷이 나왔다. "예시에 적힌 전통이 책의 지역·겉보기 계통·첨부 그림의 옷을 이긴다, 자동만 책의 지역 옷" 으로. EXAMPLE_DETAIL: 장면 문장이 없어 이름("Áo Dài")만 실리던 전통 의상 스물넷에 짜임·여밈·실루엣을 적었다.
- lib/prompt-book.js — 예시에 장면 문장이 없으면 EXAMPLE_DETAIL 을 싣는다.
- tests/prompt-book.cjs — 아오자이 프롬프트, 전통 의상 예시마다 풀이가 있는지.

## 2026-10-18 · claude · 색 RGB 로 고르기(myth 생성기에서)
- lib/prompt-ui.js · lib/prompt.css — 머리색·눈색·다른 쪽 눈색 칸에 RGB 고르개: 색 상자·HEX 칸·R/G/B 막대와 숫자. 값은 "#rrggbb" 로 남고 고르개에 "RGB #…" 줄로 보인다. 팔레트 동그라미는 빠른 시작점으로 그대로.
- lib/prompt-book.js — RGB 값은 프롬프트에 코드와 색 이름으로("#1B2A6B (dark blue)"). 색 이름 풀이는 myth-atelier 의 lib/prompt-myth.js 와 같다. 오드아이 줄에도.
- lib/words.js — 색 상자·프롬프트에·RGB 안내·RGB 줄 말.
- tests/prompt-book.cjs · tests/prompt-screen.cjs — 머리·눈 RGB 의 프롬프트 글, HEX 칸·R 막대·자동 되돌리기.

## 2026-10-17 · claude · 일상컷 옷 갈아입히기
- lib/prompt-spec.js · lib/prompt-book.js — 일상컷에 WARDROBE 줄: 옷을 통째로 바꾸고, 첨부 그림에서는 얼굴·머리·몸만(옷·겹·허리띠·술·장신구·머리 장식·배경은 아니다), 장면 설정의 옷이 한눈에 읽히게. 춘향전에서 간호사 코스튬을 골랐는데 첨부한 한복이 그대로 나왔다 — "평상복은 장면이 정한다" 만으로는 화려한 폼 의상을 못 이겼다.
- tests/prompt-book.cjs — 일상컷에 WARDROBE 줄.

## 2026-10-17 · claude · 폼마다 기본 자세
- data/book-design.json — 다섯 권 × 폼 셋에 자세(pose)를 적었다. 춘향전 여섯 장이 모두 같은 정면 서기로 나왔다. 서 있는 카드 자세 안에서 손·시선·무게로 폼마다 다르게, 얼굴은 정면이나 3/4.
- lib/prompt-spec.js · lib/prompt-book.js — 폼 초상의 STANCE 가 그 폼의 자세를 싣는다(고른 자세·연출이 있으면 빠지고, 자세가 빈 폼은 공통 카드 자세). 손 줄은 "빈손" 대신 "STANCE 가 말한 것만".
- tools/book-design.py — 폼마다 자세가 있고 세 폼의 자세가 서로 다른지 본다.
- lib/prompt-ui.js · dex.html · lib/words.js — 생성기 설계 칸과 서가 단계 칸에 자세를 보인다.
- tests/prompt-book.cjs — 열다섯 폼의 자세 줄·손 줄, 고른 자세가 이김, 빈 자세, 개방엔 없음.

## 2026-10-17 · claude · 한복 풀이 — 한푸로 가지 않게
- lib/prompt-spec.js — 복식 구조 hanbok 이 영어 "hanbok" 한 낱말이라 춘향전 여섯 장이 중국 한푸(긴 겉옷·넓은 허리띠·겹 프릴·중국풍 관)로 나왔다. 짧은 저고리·고름·흰 동정·가슴께 여민 치마·한국 장신구(노리개·비녀·댕기, 혼례면 족두리·화관), 한푸·기모노 아님으로 풀었다. 과감 노출 한복 갈래의 "겹 소매" 를 "비치는 저고리 소매·가슴께 여민 치마" 로. STANCE 는 이어가기에 없는 SILHOUETTE 를 가리키지 않게.
- lib/prompt-book.js — 이어가기(폼 초상)에 GARMENT 줄: 폼이 의상을 바꿔도 복식 구조는 지킨다. 실루엣을 안 싣는 갈래라 폼마다 구조가 흘렀다.
- tests/prompt-book.cjs — 새 인물의 한복 풀이, 이어가기의 GARMENT 줄, 개방에는 없음.

## 2026-10-16 · claude · 서가 책 틀 — 양장·한지 선장
- lib/book-frame.js · lib/book-frame.css — 그림은 틀 없이 뽑고 서가가 그 책의 장정을 두른다. 양장은 가죽 표지(빛은 책 팔레트)·금박 두 줄·네 모서리 꽃장식, 한지는 닥나무 섬유 결 책장·사주쌍변·오른쪽 치자빛 책등에 다섯 구멍 실. 틀과 안쪽 그림 칸이 늘 2:3 이 되게 두께를 cqw 로 맞췄다. 돈키호테 시험에서 타로·양장 틀을 그림에 그려 보니 좋았지만, 개방·일상컷과 틀이 어긋나고 썸네일에서 인물이 작아졌다.
- dex.html — 큰 그림·크게 보기에 틀. "양장 틀/한지 틀" 단추로 켜고 끈다(이 브라우저에만, 기본 켬). 큰 그림 칸은 너비를 줄여 늘 2:3.
- data/book-design.json · tools/book-design.py — 책마다 binding(hardcover·hanji). 춘향전은 한지, 나머지는 양장. 정한 말인지 검사.
- lib/words.js — 틀 단추 말.
- tests/dex-screen.cjs — 양장 틀·틀과 그림 칸 2:3·끄고 켜기·남기기·한지 판별·크게 보기 틀.
- IMAGE_RULES.md — 틀은 그림에 그리지 않는다.

## 2026-10-15 · claude · 폼 초상 연출·카드 자세 줄 · 설계표 얼굴·체형 손질
- lib/prompt-spec.js · lib/prompt-book.js — 폼 초상(새 인물·이어가기)에 PRESENTATION 줄(세련되고 화려한 성인 판타지 카드 삽화, 그 얼굴 구조 안의 미형, 책 재료를 살리는 금속·금 장식, 따뜻한 역광·강한 명암)과 STANCE 줄(낮은 카메라의 서 있는 영웅 카드 자세, 달리기·돌진·도약 아님)을 노출 줄 뒤에. 자세·연출을 고르면 STANCE 는 빠진다. 실루엣의 "default pose" 는 "attitude" 로, 새 인물 출력의 "자세는 실루엣 자세를 따른다" 는 뺐다. v7 돈키호테 시범이 화풍은 맞았는데 설계표대로 돌격·칙칙한 종이 갑옷으로 나와 기준 그림의 화려함이 없었다.
- data/book-design.json — 돈키호테 체형 lanky → athletic, 자세 charging → commanding_stand, 얼굴 long·deep_set·aquiline·thin_long → diamond·narrow_upturned·straight_narrow·full_wide(늙고 여윈 원작 얼굴로 갔다). 앨리스 petite·round → slender·heart(과감 노출과 어린 인상이 겹치지 않게). 프랑켄슈타인 눈썹·코 low_heavy·broad_soft → straight_thick·straight_narrow. 설계표 검사 통과.
- tests/prompt-book.cjs — 연출·자세 줄의 자리, 이어가기에도 싣기, 자세·연출을 고르면 자세 줄 없음, 개방·일상은 없음.
- docs/ART_STYLE.md — 화려함·자세는 화풍이 아니라 연출·자세 줄이 쥔다.

## 2026-10-15 · claude · 화풍 v7 — 한 줄로 되돌리기
- data/style.json — literary_fantasy v7(지금 판) = "섬세한 선화 + 회화적 채색의 성인 판타지 삽화풍" 한 줄, 점검 줄 없음. 사용자가 원한 돈키호테가 이 한 줄로 나왔다. v2~v6 의 긴 문단이 모델의 해석을 덮어써 흔들렸다.
- tests/prompt-book.cjs · tests/prompt-screen.cjs — 지금 판 화풍은 40 낱말 이하, 점검 줄이 없는 판은 FINAL CHECK 도 없다, 화풍 줄은 한국어여도 된다, v7.
- docs/ART_STYLE.md — 화풍은 짧게, 문제는 그 문제를 맡은 줄에서 고친다.

## 2026-10-15 · claude · 체형 lanky·tall_statuesque 풀이 — 목 늘림 막기
- lib/prompt-spec.js — VOCAB_EN.body 의 lanky("lanky, long-limbed and lean")·tall_statuesque 가 목까지 늘였다(돈키호테 v6 시범). "lean and long-legged, with a natural neck length" 꼴로.

## 2026-10-15 · claude · 화풍 v6 — 그림으로 붙잡기 · 프롬프트 줄이기
- data/style.json — literary_fantasy v6(지금 판). v5 가 실사 쪽으로 갔다(반실사 얼굴·사진 노을). 사진 조명 말(cinematic·bloom·golden-hour·luminous skin)을 빼고 2.5D 삽화의 얼굴 그리는 법(보이는 윤곽선·또렷한 눈매와 속눈썹·단순한 코와 입·2~3단 피부 명암·선으로 그린 머리)을 적었다. 나이·노출 문장은 AGE·EXPOSURE 줄에 맡기고 뺐다.
- lib/prompt-spec.js — 과감 노출 세 갈래·ANATOMY 를 같은 뜻으로 줄였다(845 → 760 낱말 안쪽).
- tests/prompt-book.cjs · tests/prompt-screen.cjs — 길이 검사를 실제 폼 초상(과감 노출·점검 줄 포함) 기준 760 으로, 지금 판이 사진 조명 말을 쓰지 않고 윤곽선을 적는지, v6.
- docs/ART_STYLE.md — v6.

## 2026-10-15 · claude · 화풍 v5 — 진한 채색·노을 역광·꽉 찬 배경
- data/style.json — literary_fantasy v5(지금 판). 사용자가 고른 돈키호테(진한 채색·강한 명암·역광·공기 원근)를 기준으로. v2~v4 의 storybook·watercolor·muted·gentle contrast·no specular shine·simplified background 를 뺐다 — 옅은 수채 동화가 나왔다. 형광·반짝이·젖은 거울 바닥만 막는다. 보기용 기준 그림 pilot/style-ref-literary_fantasy-v5-don_quixote.webp(첨부 안 함).
- lib/prompt-spec.js — 새 인물 출력의 "quiet, readable backdrop" 를 "그녀의 책에서 온 풍성한 공기의 장소, 그녀와 다투지 않게" 로.
- tests/prompt-book.cjs · tests/prompt-screen.cjs — v5, 지금 판이 수채 동화 말을 쓰지 않는지.
- docs/ART_STYLE.md — v5 와 v2~v4 에서 배운 것.

## 2026-10-15 · claude · 코스모스 머리 — 긴 웨이브
- data/book-design.json — 코스모스 실루엣 머리 short_crop → long_wavy. 사용자가 시범에서 바꾼 머리(긴 갈색 웨이브)를 설계표에 맞췄다. 다섯 권 중 long_wavy 는 코스모스뿐, 실루엣·얼굴 검사 통과.

## 2026-10-15 · claude · 화풍 v4 · 나이 줄(기본 20대)
- data/style.json — literary_fantasy v4(지금 판). 얼굴은 "잉크 윤곽" 대신 "깨끗하고 적은 잉크 선, 둥근 명암". 주름·처짐은 나이를 골랐을 때만. 점검 줄에도. 코스모스를 20대로 골랐는데 팔자·웃음 주름이 선으로 그어져 30~40대로 보였다.
- lib/prompt-spec.js · lib/prompt-book.js — AGE 줄을 SUBJECT 바로 뒤에(맨 아래 외형 목록의 한 줄은 약했다). 나이가 자동이면 20대. 20대 줄은 팔자·눈가·눈밑·볼 주름 없이, 웃어도 얼굴이 접히지 않게. 이어가기·개방·일상은 첨부 그림의 나이를 지키고 주름을 더하지 않는다(AGE_KEEP). 외형 목록에서 나이는 뺀다.
- tests/prompt-book.cjs · tests/prompt-screen.cjs — 나이 줄 자리·기본 20대·고른 나이·목록 중복 없음·첨부 갈래의 나이 지키기·v4.

## 2026-10-15 · claude · 과감 노출을 의상 구조별로 · 깃은 네크라인과 같이 · 7.5등신
- lib/prompt-spec.js — 과감을 셋으로: 겉옷 폼(코트·망토·로브·갑옷·정장)은 겉옷을 양 어깨에 제대로 입고 안쪽 재단(네크라인·코르셋 허리·트임)으로만, 원피스·치마 폼은 어깨·팔·허벅지까지, 한복은 깃·동정을 지키고 목선·쇄골까지. 모든 갈래에 "깃은 네크라인을 따라 V로 열리거나 접힌다, 흘러내리거나 반쯤 벗지 않는다". GARMENT_LAYER 로 설계표 복식 구조를 잇는다. ANATOMY 에 7.5등신(머리를 줄이지 않는다). 코스모스 시범에서 코트가 한쪽 어깨만 흘러내렸고, 높은 깃 + 깊은 네크라인이 따로 놀고, 머리가 작아졌다.
- lib/prompt-book.js — 과감 줄을 그 책의 복식 구조로 고른다.
- lib/words.js — 노출 과감 설명.
- tests/prompt-book.cjs — 다섯 권의 과감 갈래, 복식 구조 정한 말마다 갈래가 있는지, 등신 줄.

## 2026-10-15 · claude · 화풍 v3 · 폼 초상 노출 칸(기본 과감) · 참고 그림 첨부 기본 끔 · 목·어깨
- data/style.json — literary_fantasy v3(지금 판). v2 에서 "costume and exposure follow the book brief" 를 빼고 노출은 생성기 칸에 맡긴다. 참고 그림은 보기용(attach false).
- lib/prompt-spec.js · lib/prompt-book.js — FORM_EXPOSURE(적게·보통·과감, 기본 과감)를 폼 초상의 FORM 줄 뒤에 싣는다. 개방은 첨부 그림의 차림 그대로라 안 싣는다. ANATOMY 에 목·어깨(머리는 어깨 가까이, 큰 키는 다리로). 큰 가슴 설명에서 "어깨를 넓히지 않고" 를 "흉곽·어깨는 자연스러운 비율" 로.
- lib/prompt-ui.js · lib/words.js — 폼 초상에 노출 칸, "참고 그림 같이 첨부" 칸(기본 끔 — 붙이면 얼굴·구도까지 따라왔다).
- tests/prompt-book.cjs · tests/prompt-screen.cjs — 노출 줄·자동이면 없음·개방엔 없음·기본 과감·텍스트만 기본·켜면 참고 그림 줄·목 줄.
- docs/ART_STYLE.md · IMAGE_RULES.md — v3 와 참고 그림 첨부 기본 끔.

## 2026-10-15 · claude · 화풍 v2 — 참고 그림·화풍 블록 앞으로·점검 줄
- data/style.json — literary_fantasy v2(지금 판). 매체를 "손으로 그린 삽화, 게임 CG 아님" 으로, 무광 바닥·표면, 배경은 인물보다 덜, 얼굴은 잉크 윤곽. 맨 끝 점검 줄(check), 참고 그림 pilot/style-ref-literary_fantasy-v2-alice.webp. v1 은 남긴다.
- lib/prompt-book.js · lib/prompt-spec.js — 화풍 블록을 책 줄 바로 뒤로(설계 줄 뒤에 묻혀 장르마다 화풍이 갈라졌다), 판의 check 를 맨 끝에 한 번 더, 참고 그림이 있으면 INPUT 에 첨부 안내 + "STYLE REFERENCE — 그리는 방식만, 얼굴·차림·노출은 따르지 않는다".
- lib/prompt-ui.js — 판을 일부러 고르지 않았으면 지금 판을 따라간다(versionPinned). 참고 그림·점검 줄을 조립부로 넘긴다.
- tests/prompt-book.cjs · tests/prompt-screen.cjs — 화풍 블록 자리·점검 줄·참고 그림 줄·지금 판.
- docs/ART_STYLE.md · IMAGE_RULES.md — 시범 세 묶음에서 배운 것, 참고 그림을 매번 같이 붙인다.

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
