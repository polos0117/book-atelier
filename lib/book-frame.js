/* 책 틀 — 그림은 틀 없이 깔끔하게 뽑고, 서가가 그 책의 장정을 둘러 보여 준다(lib/book-frame.css).
   그림 안에 틀을 그리면 개방·일상컷과 틀이 어긋나고 썸네일에서 인물이 작아졌다(2026-10-16 돈키호테 타로·양장 시험).

   장정은 설계표 책 칸의 binding(vocab.binding 중 하나)이 정한다:
   - hardcover: 서양 양장 — 가죽 표지, 금박 두 줄과 모서리 장식.
   - hanji: 한국 선장본 — 한지 바탕, 사주쌍변(굵은 줄 + 가는 줄), 오른쪽 다섯 구멍 붉은 실.
   - bamboo: 죽간 — 세로로 늘어선 대나무 쪽, 위아래 두 줄로 엮은 끈.
   가죽(또는 실) 빛은 그 책 팔레트에서 온다. 말은 없다 — 여기는 한글이 0자리다. */
(function (root) {
  'use strict';
  var KINDS = ['hardcover', 'hanji', 'bamboo'];
  var STORE = 'book_frame_v1';
  /* 실루엣 팔레트 → 표지 빛·금박 빛 */
  var COVER = {
    rust_parchment: ['#6a2d1d', '#d2a54e'],
    oxblood_gray: ['#4a181d', '#b9a07a'],
    navy_gold: ['#1b2947', '#d4b25a'],
    cream_blue: ['#2c4c78', '#e2c983'],
    ink_jade: ['#1f2b28', '#bfa86a'],
    tricolor_warm: ['#5a2a24', '#d3a85a'],
    black_white: ['#1c1b1d', '#c8c3b8'],
    rose_jade: ['#9d2b30', '#2b2724'],
    moss_tweed: ['#3d4a2f', '#c9a96a'],
    brass_teal: ['#1f4f52', '#d8b25a']
  };
  var DEFAULT = ['#3d2a20', '#cda55a'];

  function kind(book) {
    var k = book && book.binding;
    return KINDS.indexOf(k) >= 0 ? k : 'hardcover';
  }
  /* 틀에 붙일 class·style — style 은 CSS 변수 두 개(--cover 표지·실, --gilt 금박·먹) */
  function of(book) {
    var k = kind(book), p = (book && book.silhouette && book.silhouette.palette) || '';
    var c = COVER[p] || DEFAULT;
    return { kind: k, className: 'bframe bframe-' + k, style: '--cover:' + c[0] + ';--gilt:' + c[1] };
  }
  /* 켜고 끄기는 이 브라우저에만 남는다. 기본은 켬 */
  function on() { try { return root.localStorage.getItem(STORE) !== '0'; } catch (e) { return true; } }
  function setOn(v) { try { root.localStorage.setItem(STORE, v ? '1' : '0'); } catch (e) {} }

  root.AtelierFrame = { KINDS: KINDS, COVER: COVER, STORE: STORE, kind: kind, of: of, on: on, setOn: setOn };
})(typeof window !== 'undefined' ? window : globalThis);
