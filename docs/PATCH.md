# 패치 기록

파일을 고친 쪽이 직접 한 칸 적는다. 규칙은 `AGENTS.md` 의 "4. 고쳤으면 적는다" 에 있다.

모양은 두 줄이 전부다. 한 칸은 `##` 으로 시작하고 `날짜 · 누가 · 무엇을 바꿨나` 를
가운뎃점으로 나눈다. 그 아래 `-` 줄에 `파일 — 왜/무엇` 을 파일마다 하나씩 적는다.
날짜는 `2026-10-15` 꼴, 누가는 `claude` 또는 `gpt`, 새 칸이 위로 간다.
이 안내글은 첫 `##` 앞이라 읽히지 않는다. `node tests/patch.cjs` 가 모양을 본다.

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
