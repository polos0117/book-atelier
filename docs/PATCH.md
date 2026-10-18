# 패치 기록

파일을 고친 쪽이 직접 한 칸 적는다. 규칙은 `AGENTS.md` 의 "4. 고쳤으면 적는다" 에 있다.

모양은 두 줄이 전부다. 한 칸은 `##` 으로 시작하고 `날짜 · 누가 · 무엇을 바꿨나` 를
가운뎃점으로 나눈다. 그 아래 `-` 줄에 `파일 — 왜/무엇` 을 파일마다 하나씩 적는다.
날짜는 `2026-10-15` 꼴, 누가는 `claude` 또는 `gpt`, 새 칸이 위로 간다.
이 안내글은 첫 `##` 앞이라 읽히지 않는다. `node tests/patch.cjs` 가 모양을 본다.

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
