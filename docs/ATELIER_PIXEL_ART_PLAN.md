# Atelier 도트 캐릭터 적용 검토와 작업 인계

작성일: 2026-10-21 · 시간대: Asia/Seoul  
문서 버전: 1.1 (저장소 편입·검토 반영·P0 완료)  
상태: P5 진행 — 서고 탐험 복도(사용자 결정: 3절 서고 탐험 줄)  
첫 대상: book-atelier 서재의 작은 생활 공간  
자리: docs/ATELIER_PIXEL_ART_PLAN.md

## 0. 다음 세션이 먼저 읽을 내용

목표는 기존 일러스트의 매력을 유지하면서 공방과 게임에 캐릭터 자신의 움직임을 더하는 것이다. 첫 시범은 book-atelier에서 캐릭터 한 명의 정지 도트를 만든 뒤, 대기·걷기·선택 반응을 붙이고 서재의 작은 공간에 연결하는 안이다.

이 문서는 사용자가 요청한 검토안과 인계 문서다. 아래 수치·파일 구성·우선순위는 제안이며, 이미 구현되었거나 사용자가 전부 확정한 사양으로 읽지 않는다. 문서 작성 요청을 이미지 생성, 기존 이미지 교체, 저장소 커밋·push·배포 승인으로 확대하지 않는다. 후속 작업에서는 그 세션의 실제 요청과 기존에 명확히 승인된 범위를 따른다.

| 재개에 필요한 항목 | 현재 상태 |
|---|---|
| 완료한 일 | 검토, 저장소 편입, P0(시범 캐릭터·기준 이미지 확정), P1(정지 도트), P2(동작 시트), P3(독립 재생), P4(서재 연결), P5 서고 탐험 복도(10절) |
| 현재 단계 | P5 서고 탐험 복도 완료 — 다음 확대(인물 더, 전투)는 사용자 결정 |
| 아직 하지 않은 일 | 실기기(Fold5) 화면·성능 확인, 인물 늘리기·전투 적용 판단 |
| 시범 캐릭터 | alice(이상한 나라의 앨리스), 도트 폼 발단(begin) |
| 기준 이미지 | 정본 `img/alice_end_literary_fantasy_f.webp`, 도트 기준 `img/alice_begin_literary_fantasy_f.webp` (book-atelier-img) |
| 도트 산출물 | `book-atelier-img/sprites/alice/` — 정지 `alice_begin_still.png`, 시트 `alice_begin_idle.png`(4칸)·`_walk.png`(6칸)·`_react.png`(4칸), 칸 96×128. 원본 `raw/`, 기록 `records/sprites/alice/` |
| 변경한 프로젝트 코드 | 없음 |
| 이 작업의 커밋·push·배포 | 없음 |
| 다음 한 일 | 사용자가 실기기에서 서재·탐험을 보고 다음 범위를 정한다 |
| 작업 재개 기준 | 이 표와 10절 체크포인트를 실제 결과에 맞춰 갱신 |

**이미 완성된 생성 이미지는 사용자의 추가 요청 없이 자의적으로 재생성하거나 대체하지 않는다.** 첫 정지 도트가 나오면 그 결과를 보여준다. 스타일·노출·디테일에 대한 어시스턴트의 선호로 두 번째 결과를 만들지 않는다. 수정이나 후속 동작 제작은 실제 요청 범위에 맞춰 진행한다.

## 1. 문제와 방향

사용자는 코드로 단순한 입체를 조합한 Three.js 결과물에서 형태가 투박하고 표면이 밋밋하다는 아쉬움을 느낀다. 도트는 기존 일러스트를 대체하는 목표가 아니라, 캐릭터가 공간에 머무르고 행동하는 모습을 표현할 대안이다.

감상 화면에서는 고해상도 일러스트를 중심으로 유지하고, 생활 공간이나 전투 장면에서는 알아볼 수 있게 요약한 도트 캐릭터를 사용한다. 단순히 그림 전체를 위아래로 흔드는 것보다 눈 깜빡임, 걸음, 돌아보기처럼 캐릭터 자체의 동작을 보여준다.

홈의 생활 동작만으로 전투 화면의 정적인 느낌까지 해결되지는 않는다. 첫 시범은 미감과 동작 품질 검증이고, 전투 적용은 공격·피격·폼 전환을 실제 엔진 기록에 연결하는 별도 단계다.

## 2. 현재 구조에서 확인한 사실

아래는 2026-10-21 원격 기본 브랜치의 소스·문서를 읽어 확인한 내용이다. 브라우저 실화면을 직접 점검한 결과는 아니다. 구현할 때에는 최신 파일과 다시 대조한다.

| 공방 | 확인한 구조 | 적용 시 의미 |
|---|---|---|
| book-atelier | index.html과 lib/bookshelf.js의 책장·책 펼치기·감상 흐름. data/book-design.json에 책 20권 | 기존 책 열기 동작에 도트 선택을 연결할 수 있음 |
| pkm-atelier | index.html의 CapsuleBay, lib/capsule.css의 캡슐 진열. HOME_CAPSULE_PLAN의 구현 완료 기록 | 캡슐 주변 생활 동작이나 탐사 출발·복귀를 검토할 수 있음 |
| myth-atelier | index.html의 신전 홀, lib/auto.js 중심 오토 배틀. data/card.json에 카드 187개 | 전투 효과는 크지만 전체 캐릭터 제작으로 시작하면 범위가 커짐 |
| atelier | index.html과 gundam/hangar.js·hangar.css의 3D 격납고 | 도트가 기존 입체 공간과 어울리는지 별도 시험 필요 |
| 공통 움직임 | docs/SCENE_MOTION.md에 네 공방이 lib/scene-motion.js·css를 같은 버전으로 공유하도록 규정 | 기존 움직임 설정을 재사용하고 별도 도트 동작 계층을 연결하는 안이 적합 |

공통 모듈에는 켄 번스, 입자, 폼에서 개방으로 넘어가는 연출, 장 넘김이 있다. 전역 설정 키는 atelier_motion_v1이며, 동작 줄이기 설정과 화면 밖·숨은 탭의 일시정지 정책이 문서화되어 있다. 각 적용 화면이 모듈을 실제로 로드하는지는 구현 때 확인한다.

pkm의 lib/battle-ui.js는 배우 상태와 박자별 g.log를 읽어 보여준다. 향후 전투 도트는 이처럼 기존 상태와 사건 기록을 소비해야 하며, 애니메이션 코드가 피해나 승패를 다시 계산하면 안 된다.

## 3. 화면별 적용안과 우선순위

| 적용 위치 | 제안 장면 | 기대 효과 | 부담과 판단 |
|---|---|---|---|
| book 서재 | 창가에서 대기, 책장 근처로 짧게 이동, 선택하면 돌아보고 해당 책 열기 | 서재에 사람이 머무는 느낌과 감상 진입 연결 | 첫 시범 권장 |
| book 서고 탐험(`run.html`) | 방 사이 이동 때 지도 위·아래 복도 띠에서 0.6~0.8초 걷기, 독서대·사서의 책상에서 대기, 싸움 이기면 반응. 걷는 이는 덱 첫 책의 주인공(도트가 있을 때만) | 층을 내려가는 느낌. 서재 시범의 14프레임을 그대로 다시 씀 | 서재 시범 뒤 P5에서 판단. 지도 SVG 안 말은 비정수 배율·방 칸(100×52)보다 커서 제외. 만남·싸움은 일러스트 유지. 연출은 상태(`book_run_v1`)를 바꾸지 않고 단추를 막지 않으며 새로고침·움직임 끔이면 즉시 도착. 전용 안내인(사서)은 새 인물 디자인이라 따로 결정 |
| pkm 연구소 | 캡슐 앞 대기, 정비대 이동, 탐사 출발·복귀 | 수집한 인물이 연구소에서 생활하는 느낌 | 두 번째 생활 공간 후보 |
| myth 전투 | 공격 준비, 타격, 피격, 각성 | 전투의 정적인 인상을 직접 개선 | 생활 동작 검증 후 별도 시범 |
| atelier 격납고 | 작은 정비 구역의 대기와 출격 | 격납고의 생활감 | 3D 공간과 화풍 조합부터 시험 |
| 도감 목록·큰 감상 화면 | 원본 일러스트 중심 | 기존 작품 감상 가치 유지 | 첫 시범의 도트 교체 대상에서 제외 |

현재 권장 순서는 book 한 명 → 같은 공간 세 명 → 전투용 소수 캐릭터다. 세 명 확대와 다른 공방 확장은 한 명의 결과를 보고 결정한다.

## 4. book 서재 1차 시범 범위

### 공간과 행동

서재의 작은 생활 공간 한 곳, 캐릭터 한 명, 가까운 정지 지점 두 곳으로 범위를 제한한다. 방 전체를 돌아다니는 이동·충돌 시스템은 첫 시범에 필요하지 않다.

일정 시간 대기하다가 가까운 지점으로 걷고 다시 멈춘다. 책장 조작이나 글 읽기를 계속 가로지르지 않도록 이동 구역을 분리한다. 캐릭터를 선택하면 짧은 반응을 보여주고 기존 책 감상 동작으로 연결한다. 반응을 끝까지 기다려야만 책을 열 수 있게 만들지는 않는다.

감상 화면이 열려 있는 동안 뒤쪽 도트 동작은 멈춘다. 닫았을 때에는 캐릭터를 새로 생성하지 않고 기존 자리로 돌아온다.

### 캐릭터 선정 원칙

등록된 승인 기준 이미지가 있고 머리·의상 실루엣·대표 색이 뚜렷한 캐릭터를 우선한다. 도트로 줄였을 때 구분이 어려운 복잡한 장식만으로 정체성이 결정되는 인물은 첫 시험에서 피하는 편이 낫다.

기준 이미지의 정확한 경로 또는 파일 ID, 폼, 화풍, 버전을 기록하고 실제 이미지를 본 뒤 작업한다. 대화 속 기억만으로 얼굴이나 의상을 재구성하지 않는다.

### P0 결정 — alice 발단

| 항목 | 결정 |
|---|---|
| 캐릭터 | `alice` — 실루엣 축 slender · bob · one_piece_dress · card_stock · tilted_curious · cream_blue |
| 도트 폼 | 발단(`begin`) — 부푼 짧은 원피스와 앞치마, 회중시계 줄 |
| 정본(얼굴·머리·팔레트) | `book-atelier-img/img/alice_end_literary_fantasy_f.webp` (설계표 시범 폼 결말, 2026-10-16 `aaef2b3`, sha1 `72b1635acce5`) |
| 도트 기준(의상·실루엣) | `book-atelier-img/img/alice_begin_literary_fantasy_f.webp` (2026-10-17 `26ae34f`, sha1 `7389f7e0a9f9`) |
| 화풍 | `literary_fantasy` 원본에서 도트로 옮긴다. 도트 자체의 화풍 열쇠는 P1 결과를 본 뒤 정한다 |
| 반전 | **허용**(2026-10-21 사용자 결정) — 리본(머리 왼쪽)·회중시계(허리 오른쪽)가 반전 때 자리를 바꾸지만 받아들인다. 걷기는 한 방향 6프레임 |

고른 이유:

- 검은 단발과 리본, 크림·파랑 두 색, 흰 스타킹의 카드 무늬가 96×128에서도 읽힌다. 장식이 아니라 머리·색 덩어리로 정체성이 선다.
- 발단은 치마가 짧아 다리가 보이므로 걷기 6프레임이 자연스럽다. 결말은 긴 카드 망토 자락이 바닥에 끌려 걷기마다 자락 처리가 늘고, 전개는 한쪽 소매만 긴 비대칭이라 반전이 안 된다.
- 옷이 대칭이라 반대 방향 걷기를 따로 만들지 않아 14프레임으로 끝난다.
- 차선은 gulliver(짧은 곱슬·지도 코트) — 견장과 코트 장식이 한쪽에 몰려 반전이 어렵다.

### 첫 범위에 넣지 않는 기능

- 전체 캐릭터 일괄 도트화
- 모든 폼·스킨·일상 의상의 도트 제작
- 자유 이동, 길 찾기, 물리 충돌, 다인 군중
- 전투 규칙 변경과 보상·능력치 추가
- 기존 고해상도 이미지의 도트 대체
- 여러 공방 동시 구현

## 5. 도트 아트와 애니메이션 사양 초안

### 정지 도트

프레임 셀 96×128픽셀부터 시험한다. 이는 완성 스프라이트의 작업 격자 제안이며 이미지 생성 도구가 그 해상도로 정확한 픽셀 데이터를 출력한다는 보장은 아니다. 기존 일러스트의 2:3 규격을 바꾸는 뜻도 아니다.

작은 화면에서 머리 윤곽, 의상의 큰 구조, 대표 색을 먼저 읽을 수 있어야 한다. 지나치게 머리만 큰 비율을 기본값으로 삼지 않는다. 얼굴, 머리색, 의상 정체성은 기준 이미지에서 가져오고 미세한 장식만 크기에 맞게 정리한다.

캐릭터가 딛는 바닥과 가까운 소품은 도트 밀도와 시점을 맞춘다. 회화적인 배경 위에 도트만 올렸을 때 떠 보이면, 주변 한 구역을 같은 도트 스타일로 구성해 비교한다. UI 글자와 감상 그림은 선명한 기존 방식으로 표시한다.

고해상도 그림에 모자이크 필터를 적용한 결과만으로 도트 제작을 완료했다고 판단하지 않는다. 실제 표시 크기에서 윤곽과 색 덩어리를 읽을 수 있는지 본다.

### 동작과 제작량

| 상태 | 기본 프레임 제안 | 구현 목적 |
|---|---:|---|
| idle 대기 | 4 | 눈 깜빡임과 작은 머리·옷 움직임 |
| walk 걷기 | 6 | 정해진 두 지점 사이 이동 |
| react 선택 반응 | 4 | 돌아보기나 인사 |
| 합계 | 14 | 한 방향 걷기를 기준으로 한 명의 최초 범위 |

좌우 비대칭 의상이나 장식이 있으면 걷기를 단순 반전하지 않는다. 같은 6프레임 구성으로 반대 방향을 따로 만들 경우 한 명당 20프레임이 된다. 세 명이면 기본 42프레임, 세 명 모두 반대 방향이 필요하면 60프레임이다. 캐릭터별 특수 동작은 별도다.

프레임 수와 재생 속도는 초안이다. 대기 루프는 모든 프레임을 같은 속도로 반복하기보다 정지 구간을 충분히 두고, 걷기는 발의 움직임과 화면 이동 속도를 맞춘다. 재생 속도를 바꾸는 것으로 그림의 불연속을 숨기지 않는다.

### 산출물 규격

- 투명 배경의 PNG 또는 무손실 WebP를 후보로 사용한다.
- 같은 셀 크기, 같은 발 기준점, 같은 몸의 크기로 정렬한다.
- 상태별 프레임 순서와 재생 시간을 메타데이터에 기록한다.
- 반전 허용 여부를 캐릭터별로 명시한다.
- 승인된 정지 원본, 개별 프레임, 합친 시트, 메타데이터를 구분해 보존한다.
- 생성 도구 결과만으로 일관성을 보장하지 않는다. 픽셀 격자·투명도·프레임 위치를 별도로 정리한다.

파일 자리(그림 저장소 `book-atelier-img`, `img/` 밖이라 썸네일 워크플로·등록기가 읽지 않는다 — 2026-10-21 확인):

```
sprites/<책>/raw/<책>_<폼>_<상태>_gen<N>.png   생성 원본 그대로(지우지 않는다)
sprites/<책>/<책>_<폼>_still.png               정리한 정지 도트 96×128
sprites/<책>/<책>_<폼>_<상태>.png              정리한 시트 — 상태는 idle · walk · react, 칸은 가로로 잇는다
records/sprites/<책>/<상태>.json               프롬프트·첨부·생성 시각·정리 단계·팔레트
```

### 생성과 정리 방법

프레임을 한 장씩 따로 생성하면 얼굴·옷 장식이 매번 조금씩 달라진다. 이것이 이 작업의 가장 큰 위험이다.

- P1 정지 도트는 한 장이다. 생성기는 한 도트를 8×8 덩어리로 키운 큰 그림(96×128 → 768×1024)을 그리게 하고, 받은 그림을 최근접 축소로 96×128 격자에 맞춘다.
- P2 동작은 상태 하나를 **시트 한 장에 한꺼번에** 생성한다(idle 4칸, walk 6칸, react 4칸). 확정한 정지 도트를 첨부한다. 칸마다 따로 부르지 않는다.
- 정리는 claude 세션이 스크립트로 한다: 최근접 축소 → 팔레트 고정(정지 도트에서 뽑은 16~24색으로 모든 프레임 양자화) → 반투명 화소 제거 → 발 기준점 정렬. 남는 튐은 화소 단위로 손본다.
- 정리 스크립트와 정리 전 원본을 함께 보존해 같은 정리를 다시 돌릴 수 있게 한다.

## 6. 코드와 자료 연결안

아래 파일명은 새로 만들 수 있는 후보이며 현재 존재하는 구현이 아니다. 실제 편집 전 현재 저장소 구조를 다시 확인한다.

| 후보 위치 | 역할 |
|---|---|
| lib/sprite-actor.js | 시트 재생, 상태 전환, 위치와 일시정지 처리 |
| lib/sprite-actor.css | 표시 크기, 픽셀 렌더링, 선택 영역 |
| data/sprites.json | 캐릭터 식별자·기준 폼·화풍·시트 주소·셀 크기·기준점·동작·반전 허용 여부 |
| lib/bookshelf.js 또는 별도 연결 컴포넌트 | 서재 진입·책 선택·감상 열기와 닫기를 연결 |
| lib/words.js | 새 버튼과 접근성 이름 |
| 이미지 저장소의 sprites/ 하위 경로 | 도트 원본과 실행용 시트 |
| docs/ATELIER_PIXEL_ART_PLAN.md | 검토안, 실제 결정, 체크포인트 |
| docs/PATCH.md | 실제 코드를 바꾼 이유와 파일 기록 |

한 명과 작은 공간의 시범은 이미지 시트와 CSS·JavaScript로 구현 가능한 범위다. Three.js나 새 게임 엔진 도입을 전제로 하지 않는다. 렌더링 방식은 화면 통합 난도와 실제 성능을 보고 정한다.

기존 data/img.json은 일러스트 등록 체계로 유지하고 도트 목록은 별도로 관리하는 안을 우선한다. 새 이미지 경로가 기존 등록기·썸네일 워크플로에 잘못 들어가지 않도록 관련 규칙을 확인한다. 프로젝트 지침에 따라 이미지 파일은 별도 이미지 저장소에 둔다.

이미 제작된 도트가 있는 캐릭터만 선택 가능하게 한다. 도트가 없는 인물에게 임의의 공통 캐릭터를 대신 보여주지 않는다. 파일이 없거나 로딩에 실패해도 기존 책장·감상·도감은 정상 동작해야 한다.

움직임은 기존 AtelierMotion 설정과 연결한다. 공통 scene-motion.js·css 자체를 바꿀 경우 네 저장소의 같은 버전 유지 규칙을 따른다. 첫 시범에서는 공통 파일을 직접 바꾸지 않고 별도 모듈에서 연결하는 방법을 먼저 검토한다.

전투 확장 시에는 기존 엔진의 공격·피격·변신·퇴장 사건을 받아 재생한다. 빠른 진행, 되감기, 건너뛰기, 애니메이션 비활성 상태에서도 전투 결과와 최종 표시 상태가 같아야 한다.

## 7. 모바일과 움직임 제어

- Fold5 바깥 화면에서는 한 명을 충분히 크게 보여주고, 안쪽 화면과 PC에서는 공간을 넓힌다.
- 96×128 원본의 1배·2배 표시를 먼저 비교한다. 첫 구현부터 화면 폭에 맞춰 임의 비율로 늘리지 않는다.
- 이미지의 부드러운 보간을 끄고(`image-rendering: pixelated`) 가능한 정수 배율을 사용한다. CSS 크기를 정수배로 줘도 화소비 2.625·3 기기에서는 실제 화소가 정수배가 아니므로, 표시 크기는 `devicePixelRatio`로 나눠 실제 화소 기준 정수배에 맞춘다. 브라우저 확대에 따른 흔들림도 실제 화면에서 확인한다.
- Fold 바깥 화면(344폭)에서 2배는 192×256으로 크다. 1배·2배 사이에서 실제 화소 정수배가 되는 크기를 고른다.
- 캐릭터 선택 외에 고정된 버튼 또는 동등한 키보드 접근 경로를 둔다. 움직이는 작은 픽셀을 정확히 맞혀야만 조작할 수 있게 만들지 않는다.
- 기존 움직임 끄기 설정과 prefers-reduced-motion을 존중한다. 정지 상태에서도 선택과 감상 진입은 가능해야 한다.
- 화면 밖, 숨은 탭, 감상 모달 뒤에서는 재생을 멈춘다. 서재의 책 펼치기는 `<dialog>`의 `showModal()`이다(`lib/bookshelf.js`) — 열림·`close` 이벤트에 멈춤·재개를 건다. 움직임 스위치는 `AtelierMotion`이 읽는 `atelier_motion_v1`을 그대로 쓴다.
- 첫 시범의 상시 동작 인물은 한 명으로 제한하고 필요한 시트만 로드한다.
- 작은 화면에서 도트 영역이 책장과 주요 메뉴를 밀어내는지 확인한다. 화면을 장식하기 위해 탐색성을 희생하지 않는다.

검토용 화면 크기: 344×882, 390×844, 690×829, 844×390, 1280×900. 실제 Fold5의 설정과 브라우저 환경에서도 한 번 더 확인한다.

## 8. 단계별 작업과 완료 기준

| 단계 | 작업 | 남길 산출물 | 완료 기준 |
|---|---|---|---|
| P0 준비 | 최신 지침·코드 확인, 시범 캐릭터와 기준 이미지 선택 | 선택 근거, 정확한 이미지 참조, 현재 저장소 상태 | 대상과 작업 범위가 명확함 |
| P1 정지 도트 | 승인 기준 이미지를 사용해 한 장 제작 | 첫 생성 결과, 프롬프트, 기준 이미지 참조, 96×128 정리본, 서재 바닥 합성 | 실제 표시 크기와 서재 배경(세 테마) 위 합성으로 사용자에게 제시 — 화풍 충돌을 여기서 판단 |
| P2 동작 | 확정된 도트를 기준으로 대기·걷기·반응 제작 | 개별 프레임, 시트, 메타데이터 | 인물 일관성·발 기준점·루프 연결 확인 |
| P3 독립 재생 | 한 명과 작은 공간에서 상태 전환 구현 | 재생 예제, 알려진 문제 | 재생·정지·선택·빠른 입력이 정상 |
| P4 서재 연결 | 기존 책 열기·닫기와 연결 | 변경 파일, 화면 확인 기록 | 기존 감상 흐름과 모바일 탐색 유지 |
| P5 확대 판단 | 세 명 또는 전투 시범의 비용과 효과 재검토 | 선택 결과와 다음 범위 | 첫 결과에 만족한 경우에만 확대 |

P1에서 첫 이미지가 나온 뒤 자의적 재생성은 하지 않는다. 사용자의 수정 요청이 있으면 무엇을 바꿨는지 기록하고, 첫 결과도 보존한다.

### 실제 완료 판정 목록

아래 항목은 지금 통과한 검사가 아니라 이후 구현에서 사용할 기준이다.

- [ ] 이름을 가려도 원본의 머리·색·의상 특징으로 캐릭터를 구분할 수 있다.
- [ ] 프레임마다 얼굴·체형·의상 장식이 엉뚱하게 바뀌지 않는다.
- [ ] 발 기준점이 고정되고 걷는 동안 미끄러짐이 두드러지지 않는다.
- [ ] 첫 프레임과 마지막 프레임 사이에 의도하지 않은 튐이 없다.
- [ ] 비대칭 장식을 확인하고 반전 허용 여부를 결정했다.
- [ ] 캐릭터 선택으로 올바른 책이 열리고 닫으면 기존 탐색 위치로 돌아온다.
- [ ] 연속 클릭, 빠른 열기·닫기에서 동작이나 이벤트가 중복되지 않는다.
- [ ] 이미지 실패·도트 미등록 상태에서도 기존 기능이 동작한다.
- [ ] 움직임 끄기, 동작 줄이기, 숨은 탭에서 정지 정책이 동작한다.
- [ ] 모바일과 PC에서 잘림·가로 넘침·잘못된 터치가 없다.
- [ ] 변경한 범위에 맞는 기존 검사와 실제 화면 점검을 완료했다.

book의 기존 검사 후보는 tests/bookshelf-screen.cjs, tests/reading-journey-screen.cjs, tests/header-layout.cjs, tests/landscape-screen.cjs, tests/words.cjs다. 공통 움직임 연결을 바꾸면 tests/scene-motion.cjs도 검토한다. 실행 준비와 정확한 명령은 최신 AGENTS.md를 따른다. 엔진을 고치지 않았다면 무관한 전체 전투 균형 검사를 반복할 필요는 없다.

## 9. 제작 부담과 보류 판단

코드 연결은 비교적 작은 범위로 시작할 수 있지만, 인물의 정체성을 지키는 도트 프레임 제작이 주된 부담이다. 특히 복잡한 옷, 긴 머리, 비대칭 장비, 폼 전환이 제작량을 키운다.

정지 도트 자체가 원본의 매력을 충분히 살리지 못하면 동작을 늘리기 전에 그 문제를 판단한다. 한 명을 보고 만족하지 못한 상태에서 여러 캐릭터를 제작하지 않는다. 다만 이 판단이 사용자 요청 없는 재생성의 근거가 되어서는 안 된다.

홈 생활 동작은 분위기 개선용이다. 목표가 전투의 타격감이라면 생활 공간 검증 후 전투용 소수 인물과 실제 사건 연결에 작업 범위를 옮겨야 한다.

현재 프레임 수와 공간 구성은 범위 산정을 위한 초안이며, 작업 시간·비용·생성 성공률을 보장하는 견적은 아니다.

## 10. 세션 중단에 대비한 체크포인트

계획 문서만으로 실행이 자동으로 계속되지는 않는다. 생성 결과와 편집 파일을 실제로 저장하고, 재개할 세션이 찾을 수 있는 정확한 참조를 남겨야 한다.

긴 작업을 한 번에 끝내려 하지 말고 P0~P5 중 완료한 단계마다 아래 기록을 갱신한다. 이미지 생성처럼 반복 실행 비용이 큰 작업은 호출 전에 요청을 기록하고, 결과를 받으면 곧바로 결과 참조를 추가한다. 세션 한계가 임박할 때까지 기록을 미루지 않는다.

### 현재 체크포인트

- 마지막 갱신: 2026-10-21 · claude
- 완료 단계: 검토, 저장소 편입, P0, P1, P2, P3, P4, P5(서고 탐험 복도)
- 다음 단계: 사용자 결정 — 같은 바닥에 인물 더(인물마다 P1~P2 한 벌), 전투 적용, 그대로 두기
- 시범 캐릭터와 기준 이미지: alice 발단(4절 P0 결정)
- P1 결과:
  - gen1(11절 지시문 그대로, 16:36:48~16:37:50 KST) — 쓰지 않음. 1~2px 단위의 도트풍 일러스트(격자 없음, 약 7.5등신)라 96×128로 줄이면 얼굴 7px, 모자이크처럼 뭉갬
  - gen2(gen1 대화에 이어 "아주 큰 화소 · 색 16개 · 4등신 · 장식 절반"으로 재작업 요청) — 채택. 약 12px 도트 격자, 4.5~5등신, 윤곽선 있음. **P2 시트도 같은 네 줄을 지시문에 넣는다** — 큰 화소를 직접 요구해야 격자가 선다
  - 정리: `tools/sprite-grid.py` 로 격자(12.14×11.96px)를 찾아 칸 가운데 색 → 50×123, 24색(Lab 묶음 — 빨강·금 살림), 알파 160 문턱, 발 기준선 y=126. 그냥 줄이기(면적 평균)는 격자가 어긋나 뭉개졌다
  - 서재 세 테마 합성: 발밑 타원 그림자를 깔면 햇살·한옥에서 자연스럽고 달밤에서도 크게 뜨지 않음. 표시는 2배 권장
- P2 결과(시트마다 한 번, 이어 요청 없음 — 17:31~17:35 KST, 기록 `records/sprites/alice/p2-gpt-record.txt`):
  - 지시한 6px 가 아니라 약 11.6px 블록, 블록은 10~13px 로 들쭉날쭉, 눈·하이라이트는 블록보다 잘게 그렸다
  - 정리: `tools/sprite-sheet.py` — 블록 간격으로 뽑으면 64줄이 되어 얼굴이 뭉개져서 **절반 간격(6.0px) 고정**으로 뽑는다(큰 블록은 2×2, 잔디테일은 남고 정지 도트와 같은 해상도). 경계는 실제 블록 경계를 따라가는 느슨한 격자, 칸 안쪽에서 가장 많은 색, 정지 도트 24색, 떨어진 반짝이(react 2칸) 지움, 발 기준선·몸 중심 맞춤
  - idle: 2칸이 팔·시계 자세가 달라 머리가 3줄 내려간다 — 재생은 1→4→1→3(깜빡임)으로 2칸을 쓰지 않는다(사용자 결정)
  - walk: 다리 교차는 맞다. 머리 오르내림 4줄(지시는 2), 5칸은 조금 더 정면. 이 크기에서는 받아들인다
  - react: 돌아봄 → 인사 → 돌아오기, 끝 칸이 처음 자세와 거의 같다
  - 도구 재현: 원본에서 다시 돌리면 올린 정리본 넷과 바이트가 같다
- P3 결과 — `sprite.html`(머리 항해에 없는 예제 화면) · `lib/sprite-actor.js`·`.css` · `data/sprites.json`:
  - 재생: 시트 background-position + transform 만, 루프 하나(requestAnimationFrame), 공간 폭은 ResizeObserver. 대기 차례 1→4→1→3, 걷기 32 도트 화소/초로 두 자리(공간 폭 28%·72%) 사이, 대기 3~6초 뒤 저절로 걷는다, 가는 쪽을 보고(반전 허용) 닿으면 대기
  - 고르기: onSelect 를 바로 부르고 반응 재생, 반응 중 다시 누른 것은 버린다. 인물 자체가 단추(Enter·Space), 화면에 고정 단추도 있다
  - 멈춤: pause/resume(이유별 — manual·hidden·offscreen), 숨은 탭·화면 밖은 저절로. 움직임 끔(`atelier_motion_v1`)·동작 줄이기면 대기 첫 칸에 서고 고르기만 된다
  - 크기: 도트 한 칸 = 실제 화소 정수배(scale 2 에 가장 가까운 정수 ÷ devicePixelRatio), 자리도 실제 화소에 맞춘다. `fit` 이면 낮은 공간(휴대폰 가로)에서 들어가는 정수배로 낮춘다(844×390·화소비 3 → 한 칸 5 실제 화소)
  - 그림 실패: 인물을 숨기고 알림 한 줄, 화면 오류 없음
  - 검사 `tests/sprite-screen.cjs`(가짜 시트 `tests/fixtures/make-sprites.py`) — 48가지 통과. 검사 틀(`tests/browser-harness.cjs`)에 그림 저장소 `sprites/` 경로·화소비(dpr)·동작 줄이기(reducedMotion) 열기를 더했다
- P4 결과 — 서재(`index.html` · `lib/bookshelf.js` · `lib/bookshelf.css`):
  - 자리: 책장 바로 밑 마루 한 줄(`.shelf-floor`, 높이 160px, 가로 마루결). 책장·책등과 겹치지 않고 감상 창과도 따로라 책 고르기를 가로지르지 않는다. 두 자리는 바닥 폭 20%·50%
  - 크기: 1배(사용자 결정 2026-10-21) — 96×128 CSS px, 화소비 3이면 한 칸 3 실제 화소. 2.625 면 3 실제 화소(1.14 CSS px)
  - 고르기: 인물을 누르면(Enter 도) 설계표의 그 책(alice)을 펼친다 — 책장에 꽂혀 있지 않아도. 펼침·닫힘 움직임과 닫은 뒤 초점은 인물에서(책등이 아니라). 연달아 눌러도 기록 한 칸
  - 감상 중: `active` 가 있으면 `pause('reading')`, 닫으면 `resume('reading')` — 같은 인물이 그 자리에서 다시. 새로 만들지 않는다
  - 실패: 도트를 못 받으면 바닥 줄째 숨는다(빈 마루를 남기지 않는다). 다른 검사(책장·감상 흐름 등)는 도트 없이 돌아 그대로 통과
  - 검사 `tests/shelf-sprite-screen.cjs` 82가지
  - 알려진 문제: ⑥ 바닥이 그림을 받은 뒤에 나타나 그 아래(바닥 글·패치 기록)가 한 번 밀린다 ⑦ 인물은 alice 한 명뿐 — 책장 고르기(진열)와 상관없이 늘 나온다
- P5 결과 — 서고 탐험(`run.html`, 사용자 결정 2026-10-21):
  - 길동무: 덱에서 도트가 있는 첫 책의 주인공(덱 첫 책이 아니어도 — 지금은 alice 하나라 첫 책만 보면 거의 안 나온다). 없으면 복도째 없다
  - 복도: 지도 위 띠(높이 150px, 책등 빛 벽·선반·마루). 저절로 걷지 않는다(`wander:false`), 방·계단·보스를 고르면 `march(700)` 제자리 걸음과 벽 흐름. PC 가로는 지도 단 위, 휴대폰 가로(높이 550 아래)는 숨김
  - 상태: 고르는 즉시 적고(save), 0.7초 동안 지도를 둔 뒤 그 방(싸움·상자)을 띄운다 — 걷는 동안 아무 데나 누르면 바로. 새로고침·움직임 끔·동작 줄이기·도트 없는 덱·복도 숨김이면 걷지 않고 바로. 지도 단추는 엔진의 legal 그대로(걷는 동안엔 새 방 기준이라 싸움 방이면 단추 없음)
  - 반응: 쉼에서 등불을 얻을 때(걷고 나서), 이긴 뒤 전리품을 고르거나 지나갈 때. 길동무를 눌러도 반응만
  - `lib/sprite-actor.js`: `wander` 옵션, `march(ms)`(제자리 걸음)
  - 검사 `tests/run-sprite-screen.cjs` 31가지. 기존 `tests/run-screen.cjs` 는 도트 없이 돌아 그대로 통과
  - 알려진 문제: ⑧ 걷는 동안의 지도는 이미 새 방이 "여기" 로 보인다(상태를 먼저 적으니까) ⑨ 싸움 화면·상자 위에는 복도가 없다
  - P3 의 알려진 문제: ① 단추 판이 비치던 것(`.prompt-page button` 꼴)은 `button.sprite-actor.sprite-actor` 로 막았다 — 서재에 놓을 때도 같은 꼴이 있는지 본다 ② 휴대폰 가로에서 fit 으로 배율이 낮아져도 예제의 「2배」 단추가 눌린 채 보인다(예제 화면만) ③ 걷기 머리 오르내림 4줄·5칸 정면(P2 그대로) ④ 누르는 자리는 칸 전체(96×128 × 배율) — 투명한 곳을 눌러도 고른다(작은 화소를 맞히지 않아도 되게 일부러) ⑤ 실기기(Fold5)에서 아직 안 봤다
- 그림 저장소: `sprites/alice/raw/`(받은 그대로 — still gen1·gen2, idle·walk·react gen1), `sprites/alice/alice_begin_{still,idle,walk,react}.png`(정리본), `records/sprites/alice/{still,idle,walk,react}.json`(프롬프트·시각·격자·팔레트·재생·반전) — 커밋 `34a3959`·`384e188`
- 수정한 프로젝트 파일: 이 문서, `tools/sprite_px.py`·`sprite-grid.py`·`sprite-sheet.py`, `lib/sprite-actor.js`·`.css`, `data/sprites.json`, `sprite.html`, `index.html`·`lib/bookshelf.js`·`lib/bookshelf.css`, `tests/shelf-sprite-screen.cjs`, `run.html`·`docs/RUN_DESIGN.md`·`tests/run-sprite-screen.cjs`, `lib/words.js`(sprite.*), `lib/workspace-ui.js`(부제), `tests/sprite-screen.cjs`·`tests/fixtures/make-sprites.py`·`tests/browser-harness.cjs`, `AGENTS.md`, `IMAGE_RULES.md`, `docs/PATCH.md`
- 승인 범위: 저장소 편입·P0, P1 결과 업로드와 반전 허용, P2 시트 업로드와 idle 재생 순서, P3 진행, 1배·P4 진행, P5 서고 탐험 복도(모두 2026-10-21)
- 남은 결정: 다음 확대 범위, 도트 화풍 열쇠

### 작업 중 갱신 양식

| 항목 | 기록할 내용 |
|---|---|
| 갱신 시각 | Asia/Seoul 기준 날짜와 시간 |
| 현재 단계와 상태 | P0~P5, 진행 중·완료·막힘 |
| 대상 | 저장소, 캐릭터 ID·이름, 폼, 화풍 |
| 기준 이미지 | 실제 파일 경로 또는 파일 ID, 가능하면 버전 |
| 완료한 결과 | 검토 가능한 산출물과 정확한 위치 |
| 이미지 생성 요청 | 사용한 프롬프트·참조, 요청 시각, 반환된 작업 ID가 있으면 그대로 |
| 생성 결과 상태 | 요청 전·처리 중·결과 확보·검토 대기 등 실제 상태 |
| 변경 파일 | 파일마다 무엇을 왜 고쳤는지 |
| 저장소 상태 | 현재 브랜치·HEAD, 미커밋 파일, 다른 작업과 겹치는 부분 |
| 검사 | 실행한 명령, 결과, 실패 원인, 확인하지 못한 부분 |
| 승인 범위 | 사용자가 실제로 요청·승인한 작업만 기록 |
| 다음 한 단계 | 재개 직후 실행할 구체적인 한 작업 |
| 알려진 문제 | 재현 방법과 영향 |
| 다시 하지 않을 일 | 이미 생성·저장·반영한 항목 |

요청 결과가 불명확하면 성공 또는 실패로 추정해 같은 생성을 다시 실행하지 않는다. 반환된 작업 ID나 저장 결과를 먼저 확인한다. 파일을 만들었다는 기록과 원격 저장소에 반영되었다는 기록을 구분한다.

이 파일만으로 현재 프로젝트나 다른 작업의 배포 권한을 새로 만들지 않는다.

## 11. P1 생성 지시문과 다음 세션용 요청문

아래 문구는 사용자가 복사해 보내는 예시다. 문서 안에 적혀 있다는 이유만으로 지금 실행할 지시가 되는 것은 아니다.

### P1 — gpt 세션에 보낼 정지 도트 생성 지시

첨부 두 장: ① `img/alice_end_literary_fantasy_f.webp`(정본) ② `img/alice_begin_literary_fantasy_f.webp`(의상). 한 장만 생성한다. 결과는 손대지 말고 원본 그대로 받는다(정리는 claude 세션).

~~~text
Pixel art game sprite of the SAME young woman shown in the two attached images.
Image 1 is the canonical character: copy her face, short dark-brown bob with the small bow headpiece,
eye colour, skin tone and the cream / navy-blue palette exactly.
Image 2 is the outfit to draw: short puffed cream dress with navy trim and white apron, pocket-watch chain
at the waist, white stockings with small red and black card-suit marks, dark heeled shoes, small navy bows.
Do not draw the background, floating cards, clocks or teacups from the attachments.

One full-body character, standing idle on flat ground, three-quarter view turned slightly toward the viewer's
right, arms relaxed at her sides, feet close together, head tilted a little with a curious expression.
Natural proportions about 4.5 heads tall — not chibi, not a big head.

True pixel art on a strict 96 x 128 pixel grid: every pixel is one crisp square block of the same size
(8 x 8 screen pixels, so the sprite area is 768 x 1024), centred on the canvas with her feet near the bottom
of that area. Hard edges only: no anti-aliasing, no blur, no gradients, no painterly texture, no noise
dithering. Limited palette of about 20 colours, dark selective outline, simple 2-3 tone shading lit from the
upper left. Keep the face readable: two clear eyes, small mouth, no tiny unreadable detail.

Transparent background. If transparency is not possible, use one flat solid #00FF00 green with nothing else.
No ground shadow, no floor, no text, no frame, no border, no second character.
Portrait canvas 1024 x 1536.
~~~

받은 뒤 할 일(claude): 원본을 `sprites/alice/raw/alice_begin_still_gen1.png`로 보존 → 8칸 격자 추정·최근접 축소로 96×128 → 팔레트 고정·투명 정리 → 1배·2배·실제 화소 정수배 미리보기와 서재 세 테마(sunlit-library·moonlit-archive·quiet-study) 바닥 합성 → 사용자 검토. 결과가 아쉬워도 사용자가 요청하기 전에는 다시 생성하지 않는다.

### P2 — gpt 세션에 보낼 동작 시트 생성 지시

첨부: ① 정지 도트 6배 확대본(`sprites/alice/alice_begin_still.png` 을 최근접 6배, 576×768) ② 정본 `img/alice_end_literary_fantasy_f.webp`. 시트 셋(idle·walk·react)을 **각각 한 번씩 따로** 생성한다. P1 gen2 에서 배운 대로 큰 화소·16색·4등신·장식 단순을 처음부터 넣었다. 칸 배치는 세로 1024×1536 한 장에 격자: idle·react 2×2(칸 512×768), walk 3×2(칸 341×768) — 스프라이트 한 화소 = 6×6 이면 125행이 750px 로 칸에 든다.

공통(세 장 맨 앞):

~~~text
Pixel art sprite sheet of the EXACT same character as attached image 1 — a finished pixel-art sprite.
Copy it pixel for pixel in style: same very large chunky pixels, same 16-colour palette, same dark outline,
same proportions (about 4 heads tall), same face, short dark-brown bob with the bow on the image-left side of the head,
cream dress with navy trim and white apron, red and navy card-suit marks, pocket watch at the image-right hip,
white stockings with suit marks, navy shoes. Keep decoration as simple as image 1 — do not add new details.
Image 2 is only a colour and face reference; do not copy its painterly style.

Sheet layout: portrait canvas 1024 x 1536, frames arranged in a regular grid of equal cells,
read left to right, top to bottom. In every cell the character is the same size (about 125 pixels tall
on the sprite's own pixel grid, each sprite pixel drawn as a crisp 6 x 6 square), centred horizontally,
with both feet on the same baseline near the bottom of the cell. Every frame faces the same direction
as described below. Hard edges only: no anti-aliasing, no blur, no gradients, no dithering noise.
Transparent background. No grid lines, no cell borders, no numbers, no labels, no text, no ground,
no shadow, no motion lines, no extra characters.
~~~

idle 4:

~~~text
IDLE animation, 4 frames in a 2 x 2 grid (cell 512 x 768). Same standing pose as image 1, three-quarter view
turned slightly toward the viewer's right, arms relaxed. Changes between frames are tiny (1-2 sprite pixels):
frame 1 = exactly image 1; frame 2 = slight breath in, shoulders and hair 1 pixel up, skirt hem 1 pixel wider;
frame 3 = same as frame 2 but eyes closed (blink); frame 4 = back between frame 2 and frame 1.
Feet never move. The loop 4 -> 1 must be seamless.
~~~

walk 6:

~~~text
WALK cycle, 6 frames in a 3 x 2 grid (cell 341 x 768). Side three-quarter view walking toward the viewer's right,
same body and outfit as image 1. A standard 6-frame walk: frame 1 = right foot forward contact,
frame 2 = down (weight on right foot, body 1 pixel lower), frame 3 = passing (left leg passing, body 1 pixel higher),
frame 4 = left foot forward contact, frame 5 = down, frame 6 = passing. Arms swing opposite to the legs,
small steps, skirt and hair bounce 1-2 pixels. Head height changes by at most 2 sprite pixels.
The character does not travel across the cell — she walks in place, feet on the baseline. The loop 6 -> 1 must be seamless.
~~~

react 4:

~~~text
REACT animation when selected, 4 frames in a 2 x 2 grid (cell 512 x 768). Starts and ends in the image 1 pose.
frame 1 = image 1 pose, frame 2 = turns head and body toward the viewer with a small surprised smile,
frame 3 = small curtsy: knees slightly bent, one hand lifting the skirt edge, head tilted, body 3 pixels lower,
frame 4 = rising back halfway toward the image 1 pose, smiling. Feet stay on the baseline.
~~~

받은 뒤 할 일(claude): 원본을 `sprites/alice/raw/alice_begin_<상태>_gen1.png` 로 보존 → 칸으로 나눠 `tools/sprite-grid.py` 를 칸마다(정지 도트 팔레트에 맞춰) → 발 기준선 y=126 정렬, 칸 사이 머리·발 위치 튐 확인 → 가로로 이은 시트 `sprites/alice/alice_begin_<상태>.png` 와 재생 미리보기(GIF) → 사용자 검토. 아쉬워도 사용자가 요청하기 전에는 다시 생성하지 않는다.

### 다음 세션용 요청문

~~~text
첨부한 ATELIER_PIXEL_ART_PLAN.md를 읽고 book-atelier의 도트 시범 작업을 이어가줘.

먼저 0절과 10절의 현재 체크포인트를 확인하고, 최신 저장소 지침과 실제 파일 상태를 대조해줘. 이미 완성된 이미지와 작업은 다시 만들지 마.

첫 목표는 캐릭터 한 명의 정지 도트야. 등록된 승인 이미지를 기준으로 삼고, 캐릭터가 지정되지 않았다면 특징이 잘 읽히는 한 명을 선정한 이유를 알려줘. 첫 결과 한 장을 보여준 뒤 자의적으로 재생성하거나 대체하지 말아줘. 동작 제작은 정지 도트 확인 뒤 이어갈 수 있게 준비해줘.

작업 단계마다 생성 결과 위치, 변경 파일, 검사 결과, 남은 일, 다음 한 단계를 문서에 기록해줘. 커밋·push·배포는 이 세션에서 실제로 승인한 범위를 따라줘.
~~~

## 12. 근거와 다시 읽을 파일

프로젝트 현황 근거:

- [book 작업 지침](https://github.com/polos0117/book-atelier/blob/main/AGENTS.md)
- [book 게임 구조](https://github.com/polos0117/book-atelier/blob/main/docs/GAME_CONCEPT.md)
- [book 책 설계표](https://github.com/polos0117/book-atelier/blob/main/data/book-design.json)
- [book 책장 구현](https://github.com/polos0117/book-atelier/blob/main/lib/bookshelf.js)
- [공통 장면 움직임 규약](https://github.com/polos0117/book-atelier/blob/main/docs/SCENE_MOTION.md)
- [pkm 작업 지침](https://github.com/polos0117/pkm-atelier/blob/main/AGENTS.md)
- [pkm 캡슐 화면 계획과 완료 기록](https://github.com/polos0117/pkm-atelier/blob/main/docs/HOME_CAPSULE_PLAN.md)
- [pkm 전투 표시 코드](https://github.com/polos0117/pkm-atelier/blob/main/lib/battle-ui.js)
- [myth 작업 지침](https://github.com/polos0117/myth-atelier/blob/main/AGENTS.md)
- [myth 게임 구조](https://github.com/polos0117/myth-atelier/blob/main/docs/GAME_CONCEPT.md)
- [atelier 격납고 진입 화면](https://github.com/polos0117/atelier/blob/main/index.html)

기술 참고:

- [MDN 픽셀 아트를 선명하게 표시하기](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)
- [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)

이미지 제작을 시작할 때에는 선택한 저장소의 최신 IMAGE_RULES.md와 관련 이미지 작업 지침을 추가로 읽는다. 검토 당시 문서와 현재 코드가 다르면 현재 상태를 확인하고 차이를 기록한다.
