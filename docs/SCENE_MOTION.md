# 움직임 — 정지 그림에서 만드는 장면 연출

영상은 없다. 그림 한 장 한 장을 **천천히 다가가는 카메라(켄 번스)**, **그 장면의 입자**,
**폼 → 개방이 열리는 연출(reveal)**, **짧은 장 넘김(turn)** 으로 움직여 보이게 한다.

| 파일 | 무엇 |
|---|---|
| `lib/scene-motion.js` | 모듈 전부. 의존 없음·빌드 없음, `window.AtelierMotion` 을 단다 |
| `lib/scene-motion.css` | 모듈이 만드는 층(사본·빛·고리·입자 캔버스)의 꼴 |
| `tests/scene-motion.cjs` | 모듈과 이 저장소에 붙인 자리의 브라우저 검사 |

## 1. 네 공방이 같은 두 파일을 쓴다

`lib/scene-motion.js` · `lib/scene-motion.css` 는 **book · pkm · myth · atelier(건담) 네 저장소에 글자 하나 다르지 않게** 둔다.

- 두 파일 첫 줄에 판이 있다: `/* scene-motion.js — version 1 (2026-10-21)` · `/* scene-motion.css — version 1 (2026-10-21)`.
  고치면 **두 파일의 판을 함께 올리고**, 네 저장소에 그대로 복사한다. 한 저장소에서만 고치지 않는다.
- 파일 안에는 책·포켓몬·신화·건담의 말이 없다. 화면이 요소·그림 주소·씨앗·입자 종류를 넘긴다.
  화면 말(움직임 켜기·끄기)은 각 저장소의 낱말 표에 둔다 — 모듈은 낱말 표를 부르지 않는다.
- 스위치 열쇠 `atelier_motion_v1`(값 `on`·`off`)는 공방 지도(polos0117.github.io) 한 출처에서 네 공방이 같이 쓴다 — 한 곳에서 끄면 다 꺼진다.
- 검사(`tests/scene-motion.cjs` 의 0번)는 판 머리줄·js/css 판 일치·바깥에서 받는 것 없음·주제 말 없음을 본다. 다른 저장소로 옮길 때 그 부분만 떼어 가도 된다.

싣는 법:

```html
<link rel="stylesheet" href="lib/scene-motion.css?v=1">
<script src="lib/scene-motion.js?v=1"></script>
```

## 2. 지키는 것

- **동작 줄이기(prefers-reduced-motion)가 이긴다.** 켄 번스 없음, 떠도는 입자 캔버스 없음, 열리기·넘기기는 70ms 사라짐. 그동안 스위치는 잠긴다(눌러도 켤 수 없다).
- **스위치** — `setEnabled(false)` 면 켄 번스·떠도는 입자가 바로 걷히고 도는 전환은 끝 상태로 건너뛴다. 켜면 그 자리에서 되살아난다(이미 부른 컨트롤러가 다시 붙는다). 처음 값은 켜짐.
- **끊기** — 같은 열쇠(`key`, 없으면 새 그림의 부모)로 새 전환을 부르면 앞의 것은 `{cancelled: true}` 로 끝나고 남는 층이 없다. 같은 요소에 켄 번스를 다시 걸면 앞의 것이 멈춘다.
- **성능** — DOM 움직임은 transform·opacity 뿐(열리기의 조리개만 clip-path — Chromium 에서 합성기로 돈다). 입자는 캔버스 하나에 requestAnimationFrame 고리 하나, 크기는 ResizeObserver 로 받아 두고 고리 안에서 레이아웃을 읽지 않는다. 빛 입자는 색마다 한 번 그린 조각을 찍는다. 화면 밖(IntersectionObserver)·숨은 탭(visibilitychange)이면 멈춘다.

## 3. API

```js
const M = window.AtelierMotion;
M.VERSION; M.KEY;            // 1, 'atelier_motion_v1'
M.KINDS                      // 입자 종류 이름들(아래 4절)
M.enabled() · M.reduced() · M.setEnabled(bool) · M.subscribe(fn) → 풀기 함수   // fn(켜졌나)
```

### `kenBurns(el, {seed, duration, zoom, pan, startScale})` → `{pause, resume, stop, running}`
아주 느린 밀기·흘리기. `seed`(보통 그림 파일 이름)가 방향(여덟 방향 ± 조금)·속도(12~20초)·당기기/밀기를 정한다 — 같은 그림은 늘 같은 쪽으로 흐른다.
기본 1.00 → 1.07, 옆으로 2.2%, 왕복. `M.stop(el)` 로 걷는다. 꺼져 있으면 잠든 컨트롤러를 돌려주고 켜지면 돈다.

### `particles(container, kind, {density, max, seed, alpha, burst, count, origin, speed})` → `{canvas, kind, running, frames, pause, resume, destroy, done}`
- 떠도는 입자: 칸을 채우는 캔버스(칸이 static 이면 relative 로). 개수 = 넓이 ÷ 4000 css px² × 종류 밀도 × `density`, 화소비 2 이상이면 15%·3 이상이면 30% 덜, 종류마다 최소·`max`(기본 70) 상한. 캔버스 해상도는 화소비 2까지.
- `burst: true` — 한 번 터지고(가운데 또는 `origin {x,y}` 비율에서 퍼져 나가 끌림·중력으로 가라앉는다) 저절로 걷힌다. `done` 이 그때 풀린다.
- 꺼져 있으면 떠도는 것은 캔버스 없이 기다리고, 터지는 것은 아무것도 안 한다.

### `reveal(fromEl, toEl, {kind, duration, removeFrom, kenBurns:{el, seed}, key, wait, seed})` → `Promise<{cancelled}>`
폼 → 개방. 새 그림(`toEl`)이 **그 그림이 실제로 그려진 크기에 맞춘 조리개(clip-path circle)** 로 가운데서 열리고, 가장자리를 따라 빛 고리, 가운데 빛 번짐,
`kind` 입자 한 번 터짐, 옛 그림(`fromEl`)은 조금 다가가며 사라진다. 앞 55%가 열리기, 뒤가 살짝 밀어 들어가기 — `kenBurns` 를 주면 그 배율(1.04)에서 켄 번스가 이어받아 튀지 않는다. 기본 1100ms.
새 그림이 아직 안 받혔으면 `wait`(1500ms)까지 기다린다(그동안 옛 그림이 남아 빈칸이 안 보인다). `removeFrom` 이면 끝에 `fromEl` 을 걷는다.

### `turn(fromEl, toEl, {direction:'next'|'previous', duration, shift, removeFrom, kenBurns, key})` → `Promise<{cancelled}>`
장 넘김. 420ms 엇갈려 사라지기 + 읽는 쪽으로 18px 미끄러짐. 3D 책장 말림이 아니다.

### `ghost(toEl, src, {fit, transform, parent, position})` · `snapshot(el)`
화면이 그림 요소를 갈아 끼우면(Preact 의 key 등) 옛 그림은 이미 없다. 넘기기 **직전에** `snapshot(지금 그림 칸)` 으로 주소와 지금 켄 번스 변형을 적어 두고,
새 그림이 그려진 뒤 `ghost(새 칸, 주소, {transform})` 로 같은 자리에 정지 사본(배경 그림 div — `img` 가 아니라서 그림 찾기 검사에 안 걸린다)을 깔아 `fromEl` 로 넘긴다.
`parent` 를 주면 그 안에(그 칸은 positioned), 없으면 새 그림 바로 앞에 넣는다.

`cancel(key?)` — 그 열쇠(없으면 전부)의 전환을 끝 상태로.

## 4. 입자 종류

| 종류 | 모양 | 떠도는 쪽 |
|---|---|---|
| `petals` | 분홍 꽃잎, 팔랑이며 | 위에서 비스듬히 |
| `snow` | 흰 눈송이(빛) | 위에서 천천히 |
| `embers` | 주황 불티, 깜빡임 | 아래에서 올라감 |
| `ash` | 회색 재 조각 | 아무 데나 흩날림 |
| `bats` | 날갯짓하는 박쥐 몇 마리 | 옆에서 가로질러 |
| `dust` | 빛 속 먼지(따뜻한 점) | 제자리에서 떠오르고 사라짐 |
| `sparks` | 튀는 불꽃 줄 | 아무 데서 튀어 떨어짐 |
| `bubbles` | 물방울 고리 | 아래에서 올라감 |
| `leaves` | 초록·갈색 잎, 뒤집히며 | 위에서 비스듬히 |
| `pages` | 종잇조각(줄 몇 개) | 옆에서 날림 |
| `cards` | 트럼프·예고장 카드 | 옆에서 날림 |
| `stars` | 반짝이는 별(큰 것은 십자 빛) | 제자리에서 깜빡임 |
| `rain` | 비스듬한 빗줄기 | 위에서 빠르게 |
| `mist` | 큰 안개 덩이(몇 개) | 옆으로 느리게 |
| `gold` | 금빛 반짝이 | 천천히 떠오름 |
| `fireflies` | 연두 반딧불·도깨비불 | 제멋대로 떠돎 |

새 종류는 모듈에 더하고(판을 올리고 네 저장소에 복사) 각 저장소의 자료 표가 그 이름을 쓴다.

## 5. 각 공방이 제 자료를 종류로 잇는 법

모듈은 자료를 모른다. 각 저장소가 제 자료에서 종류 이름 하나를 골라 넘긴다.

### book(이 저장소)
- `data/book-design.json` 의 개방마다 `particles` 하나 — 명장면 글에서 골랐다. 정한 말은 `vocab.particles`(= 모듈 `KINDS`, `tests/scene-motion.cjs` 가 맞춘다), `tools/book-design.py check` 가 본다.
  폼에도 `particles` 를 적을 수 있지만(정한 말이어야 한다) 지금은 개방만 쓴다 — 초상은 켄 번스만.
- 고른 예: 드라큘라 안개(산성)·박쥐(런던 지붕)·재(흙 상자), 춘향전 꽃잎·비·꽃잎, 자산어보 물방울·안개·물방울, 헤일메리 금빛·별·안개, 햄릿 안개·먼지·재, 반지의 제왕 잎·불티·안개, 앨리스 먼지·꽃잎·카드, 뤼팽 카드·먼지·카드.
- 붙인 자리:
  - 서재 감상(`lib/bookshelf.js`) — 지금 장 그림에 켄 번스, 명장면 장에는 그 장면 입자가 떠돈다. 같은 장의 초상 → 명장면은 `reveal`(그 입자가 터진다), 나머지 장 이동은 `turn`(다음·앞·책갈피·마치기). "움직임 켜기·끄기" 단추는 감상 화면 아래 링크 줄에.
  - 서가 상세(`dex.html`) — 큰 그림에서 폼 ↔ 그 폼의 개방이 바뀌면 `reveal`(개방으로 갈 때만 입자). 다른 그림으로 넘기기·크게 보기는 그대로(살펴보는 자리라 켄 번스·입자 없음). 단추는 상세의 링크 줄(`#dex-motion`).
  - 결투 절정(`duel.html`) — 그 폼의 초상 사본에서 명장면이 `reveal` 로 열리고 그 개방의 입자가 터진다.

### pkm — 타입으로

| 타입 | 종류 | 타입 | 종류 |
|---|---|---|---|
| fire 불꽃 | `embers` | water 물 | `bubbles` |
| grass 풀 | `leaves` | electric 전기 | `sparks` |
| ice 얼음 | `snow` | ghost 고스트 | `mist` |
| psychic 에스퍼 · fairy 페어리 | `stars` | rock 바위 · ground 땅 | `dust` |
| steel 강철 | `sparks` | dragon 드래곤 | `embers` |
| dark 악 | `ash` | flying 비행 | `leaves`(들판) · `mist`(하늘) |
| bug 벌레 | `leaves` | poison 독 | `bubbles` |
| fighting 격투 | `dust` | normal 노말 | `dust` |

두 타입이면 첫 타입. 장면 그림이 따로 있으면 그 글에서 고르는 것이 먼저다(책처럼 자료에 `particles` 를 적는다).

### myth — 원소·신화로
원소가 있으면 원소로: 불 `embers`, 물·바다 `bubbles`, 바람·하늘 `mist`, 땅·산 `dust`, 번개 `sparks`, 얼음·겨울 `snow`, 빛·태양 `gold`, 밤·달·별 `stars`, 죽음·저승 `ash`, 숲·풍요 `leaves`, 꽃·사랑 `petals`.
원소가 없으면 신화로 기본을 둔다(북유럽 `snow`, 그리스 `gold`, 이집트 `dust`, 일본 `petals`, 켈트 `mist` …) — 그 저장소의 자료 표에 적고 검사로 정한 말만 쓰게 한다.

### atelier(건담)
기체·장면 성격으로 세 가지만: 빔·전투·추진 `sparks`, 지상·사막·격납고 `dust`, 우주 `stars`.

## 6. 검사

```bash
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/scene-motion.cjs
```

같은 파일(판·바깥 없음·주제 말 없음)·설계표 입자 = 종류, 입자(화소가 프레임마다 바뀐다·숨은 탭·화면 밖이면 멈춘다·destroy 로 캔버스와 고리가 걷힌다·종류마다 돈다), 켄 번스(같은 씨앗 같은 움직임·12~20초·transform 만),
열리기(1초 남짓·도중 조리개·빛·입자, 끝에 새 그림이 다 보이고 안에 남긴 스타일 없음)·끊기·넘기기·사본 자리, 스위치(저장·구독·새로고침), 동작 줄이기(켄 번스·캔버스 없음·열리기 거의 바로),
서재 감상·서가 상세·크게 보기·결투 절정, 다섯 크기(344×882·390×844·844×390·690×829·1280×900)에서 가로 넘침·화면 오류 없음.
