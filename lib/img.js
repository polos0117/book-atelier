/* 그림 자료 공통 계층 — 서가·생성기가 같이 쓴다. pkm-atelier 의 같은 파일에서 왔다.
   ES 모듈도 빌드도 쓰지 않는다. generation/loader.js 와 같은 방식으로
   window.AtelierImg 하나만 붙인다. 기존 페이지에 <script> 한 줄로 얹힌다.

   왜 모아 두는가:
   - URL 규칙(원본/썸네일), img.json 읽기, byStyle·casual·extra 구조를 읽는
     일이 페이지마다 따로 구현돼 있었다. 그래서 같은 버그를 여러 번 고쳤다.
     (2026-09: GitHub contents API 1,000개 상한 문제를 도감과 툴킷에서 따로 수정)
   - 여기 한 곳만 맞추면 세 화면이 같이 맞는다.

   img.json 구조:
     {"img": {"<카드>": {"face": {...}, "byStyle": {"<화풍>": <몫>}, ...<기본 몫>}}}
     <몫> = {"m": "파일", "f": "파일",
             "byForm": {"<폼>": {"f": "파일", "action": {"f": [...]}}},
             "casual": {"f": [...], "m": [...]}, "extra": {...}}
     성별 표시가 없던 예전 자료는 casual/extra 가 배열 그대로일 수 있고,
     그때는 여성 몫으로 친다.

   폼(byForm)에 대하여:
     한 책이 이야기의 단계(발단 begin · 전개 middle · 결말 end)에 따라 갈아 입는 것이다.
     카드를 쪼개지 않는다 — 쪼개면 기록이 폼 수만큼 갈라져 얼굴이 흔들린다(pkm 에서 한 번 겪었다).
     개방(명장면)은 폼마다 하나, byForm 의 '<폼>_open' 자리에 있다.
     · 폼 초상(f/m)은 비교용이다. 나란히 놓고 어느 쪽이 두꺼운지 보는 자리라
       카메라·프레이밍이 같아야 한다.
     · action 은 연출용이고 없어도 된다. 있는 폼만 있다 — 모든 폼에 강제하면
       캐릭터 하나에 필요한 그림이 바로 두 배가 된다.
     · 일상컷(casual)은 폼을 타지 않는다. byForm 밖에 그대로 둔다. */
(function (root) {
  'use strict';

  /* 그림은 이 저장소에 없다. 코드가 무거워지지 않게 처음부터 따로 둔다 —
     <이름>-img 저장소에 올리고 Pages 를 켜면 그쪽이 1 GB 를 따로 받는다.

     그림 저장소는 여럿이 될 수 있다(pkm 은 2026-10-13 에 둘이 됐다). 한 Pages 사이트는 1 GB 까지라
     차면 새 그림은 다음 저장소에 올린다. 지금은 하나다. 어느 파일이 몇 번 저장소에 있는지는 등록기가
     img.json 의 where 에 적는다 — 0 번(첫 저장소)은 적지 않으므로 옛 그림의 주소는
     한 글자도 안 바뀐다. 차례는 tools/register-images.py 의 SHARDS·워크플로 받기와 같다
     (tests/img-shards.cjs 가 셋을 맞춰 본다). 저장소를 더할 때는 이 목록 끝에만 붙인다 */
  var BASES = ['https://polos0117.github.io/book-atelier-img/img/'];
  var BASE = BASES[0];
  var DATA = 'data/img.json';
  var WHERE = {};
  /* 등록한 날 {파일: 'YYYY-MM-DD'} — 등록기가 img.json 의 added 에 적는다. 날짜 없는 그림은 여기 없다(지어내지 않는다) */
  var ADDED = {};

  /* encodeURIComponent 는 작은따옴표를 그대로 둔다.
     onerror="...src='<여기>'" 처럼 속성 안에 넣을 때 깨지므로 같이 막는다 */
  function enc(f) { return encodeURIComponent(f).replace(/'/g, '%27'); }
  function baseOf(f) { return BASES[WHERE[f]] || BASE; }
  function imgURL(f) { return baseOf(f) + enc(f); }
  function thumbURL(f) { return baseOf(f) + 'thumb/' + enc(f); }
  /* img.json 을 직접 읽는 화면(생성기)도 이것을 불러 저장소 자리를 맞춘다. where 가 없는 문서면 비운다 */
  function setShards(doc) {
    var w = (doc && doc.where) || {}, out = {}, k;
    for (k in w) if (w[k] > 0 && w[k] < BASES.length && w[k] === Math.floor(w[k])) out[k] = w[k];
    WHERE = out;
  }
  function setAdded(doc) {
    var a = (doc && doc.added) || {}, out = {}, k;
    for (k in a) if (typeof a[k] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a[k])) out[k] = a[k];
    ADDED = out;
  }
  function added() { return ADDED; }

  /* 목록·갤러리에 쓰는 <img>. 썸네일을 먼저 걸고, 아직 없으면 원본으로 되돌아간다.
     썸네일은 register-images 워크플로가 make-thumbs.py 로 만들어 둔다 */
  function thumbTag(f, attr) {
    return '<img loading="lazy" src="' + thumbURL(f) + '" alt=""' +
      (attr ? ' ' + attr : '') +
      ' onerror="this.onerror=null;this.src=\'' + imgURL(f) + '\'">';
  }

  function isArr(x) { return Object.prototype.toString.call(x) === '[object Array]'; }

  /* 한 몫에서 일상컷·특별컷 목록 */
  function cuts(bucket, slot, v) {
    var box = bucket && bucket[slot];
    if (!box) return [];
    if (isArr(box)) return v === 'f' ? box : [];
    return box[v] || [];
  }

  /* 성별 가리지 않은 장수 */
  function cutCount(bucket, slot) {
    var box = bucket && bucket[slot], n = 0, g;
    if (!box) return 0;
    if (isArr(box)) return box.length;
    for (g in box) n += box[g].length;
    return n;
  }

  function hasPic(b) { return !!(b && (b.m || b.f)); }

  /* ── 폼 ───────────────────────────────────────────
     없는 폼은 없는 대로 정상이다. 부르는 쪽이 빈 칸을 다루지 않아도 되게
     여기서 늘 배열·객체를 돌려준다 */
  function formMap(bucket) { return (bucket && bucket.byForm) || {}; }
  function formKeys(bucket) {
    var m = formMap(bucket), out = [], k;
    for (k in m) if (hasPic(m[k])) out.push(k);
    return out;
  }
  function formOf(bucket, form) { return formMap(bucket)[form] || null; }
  /* 그 폼의 연출컷. 안 만든 폼이 대부분이라 빈 배열이 기본이다 */
  function formActs(bucket, form, v) { return cuts(formOf(bucket, form) || {}, 'action', v); }

  /* 폼 초상이 다 찼나. 성별은 보지 않는다 — 지금은 여성만 만들고,
     남성을 더해도 이 판정은 안 바뀐다(파일 이름에는 _f 를 붙여 둔다) */
  function formsDone(bucket, want, v) {
    var have = formMap(bucket), left = [], i, k;
    v = v || 'f';
    for (i = 0; i < (want || []).length; i++) {
      k = want[i];
      if (!(have[k] && have[k][v])) left.push(k);
    }
    return { done: (want || []).length - left.length, all: (want || []).length,
             left: left, ok: left.length === 0 };
  }
  function styleMap(entry) { return (entry && entry.byStyle) || {}; }
  function styleKeys(entry) {
    var bs = styleMap(entry), out = [], k;
    for (k in bs) out.push(k);
    return out;
  }

  /* 한 몫이 내놓는 그림 전부 — 초상 → 일상 → 특별 차례 */
  function shotsOf(bucket, v) {
    if (!bucket) return [];
    return (bucket[v] ? [bucket[v]] : [])
      .concat(cuts(bucket, 'casual', v), cuts(bucket, 'extra', v));
  }

  /* 한 카드가 가진 그림 전부 (모든 화풍 · 남녀 · 화풍 미상인 기본 몫 포함) */
  function allShotsOf(entry) {
    if (!entry) return [];
    var bs = styleMap(entry), out = [], k, i;
    function add(list) {
      for (i = 0; i < list.length; i++) if (out.indexOf(list[i]) < 0) out.push(list[i]);
    }
    for (k in bs) { add(shotsOf(bs[k], 'f')); add(shotsOf(bs[k], 'm')); }
    add(shotsOf(entry, 'f')); add(shotsOf(entry, 'm'));
    return out;
  }

  /* 예시로 쓸 초상 한 장. 원하는 화풍이 있으면 그쪽을 먼저 보고,
     없으면 아무 화풍이나, 그것도 없으면 화풍 미상인 기본 몫 */
  function portraitOf(entry, v, preferStyle) {
    if (!entry) return null;
    var bs = styleMap(entry), k;
    if (preferStyle && bs[preferStyle] && bs[preferStyle][v]) return bs[preferStyle][v];
    for (k in bs) if (bs[k][v]) return bs[k][v];
    return entry[v] || null;
  }

  /* 목록에 쓸 대표 그림 한 장. 폼을 쓰는 카드는 초상이 byForm 안에만 있어서
     portraitOf 가 빈손으로 돌아온다 — 그때는 원하는 폼, 없으면 첫 폼을 쓴다.
     portraitOf 를 안 고치고 따로 둔 까닭: 그쪽은 "화풍 몫의 초상"이라는 뜻이고
     폼까지 뒤지기 시작하면 폼을 안 쓰는 화면이 모르는 사이에 다른 그림을 받는다 */
  function coverOf(entry, v, preferStyle, preferForm) {
    var direct = portraitOf(entry, v, preferStyle);
    if (direct) return direct;
    var bs = styleMap(entry), order = [], k, i, j, b, ks, one;
    if (preferStyle && bs[preferStyle]) order.push(preferStyle);
    for (k in bs) if (order.indexOf(k) < 0) order.push(k);
    for (i = 0; i < order.length; i++) {
      b = bs[order[i]];
      one = preferForm && formOf(b, preferForm);
      if (one && one[v]) return one[v];
      ks = formKeys(b);
      for (j = 0; j < ks.length; j++) if (formOf(b, ks[j])[v]) return formOf(b, ks[j])[v];
    }
    return null;
  }

  /* ── 진열 — 서재(index.html) 진열대에 도는 책. 서고(테마)마다 따로 열둘, 서가에서 올리고 내린다.
     myth-atelier 의 신전에서 왔다. 비어 있으면 서재가 그림 있는 책에서 무작위로 고른다.
     저장은 {테마: [책 열쇠…]} — 이 브라우저에만 남는 편의다(지워지거나 막혀도 화면은 돈다) ── */
  var HALL_STORE = 'book_hall_v1', HALL_MAX = 12;
  function hallTheme(theme) {
    return theme || (root.AtelierAppearance && root.AtelierAppearance.get().theme) || 'sunlit';
  }
  function hallAll() {
    try {
      var j = JSON.parse(localStorage.getItem(HALL_STORE));
      return j && typeof j === 'object' && !isArr(j) ? j : {};
    } catch (e) { return {}; }
  }
  function hallPicks(theme) { var l = hallAll()[hallTheme(theme)]; return isArr(l) ? l.slice(0, HALL_MAX) : []; }
  function setHallPicks(list, theme) {
    var all = hallAll(); all[hallTheme(theme)] = (list || []).slice(0, HALL_MAX);
    try { localStorage.setItem(HALL_STORE, JSON.stringify(all)); } catch (e) {}
  }
  /* 올리기·내리기. 찼으면 {ok:false, why:'full'} */
  function toggleHall(key, theme) {
    var p = hallPicks(theme), i = p.indexOf(key);
    if (i >= 0) { p.splice(i, 1); setHallPicks(p, theme); return { ok: true, on: false }; }
    if (p.length >= HALL_MAX) return { ok: false, why: 'full' };
    p.push(key); setHallPicks(p, theme); return { ok: true, on: true };
  }

  /* img.json 을 읽는다. GitHub API 는 쓰지 않는다 —
     contents API 는 디렉터리를 1,000개까지만 돌려주고(img/ 는 그보다 많다)
     비로그인 호출은 시간당 60회 제한도 있다. 이 파일은 등록 자동화가 갱신한다 */
  function load(url) {
    return fetch(url || DATA, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('img.json — ' + r.status);
      return r.json();
    }).then(function (j) { setShards(j); setAdded(j); return (j && j.img) || {}; });
  }

  root.AtelierImg = {
    BASE: BASE, BASES: BASES, DATA: DATA,
    baseOf: baseOf, setShards: setShards, setAdded: setAdded, added: added, imgURL: imgURL, thumbURL: thumbURL, thumbTag: thumbTag,
    cuts: cuts, cutCount: cutCount, hasPic: hasPic,
    styleMap: styleMap, styleKeys: styleKeys,
    formMap: formMap, formKeys: formKeys, formOf: formOf,
    formActs: formActs, formsDone: formsDone,
    shotsOf: shotsOf, allShotsOf: allShotsOf, portraitOf: portraitOf, coverOf: coverOf,
    HALL_MAX: HALL_MAX, hallTheme: hallTheme, hallPicks: hallPicks, setHallPicks: setHallPicks, toggleHall: toggleHall,
    load: load
  };
})(window);
