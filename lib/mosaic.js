/* 모자이크 — lib/mosaic.wasm 싣개와 화면 없는 셈(크기·칸·자르기·파일 이름). mosaic.html 과 tests/mosaic.cjs 가 같이 쓴다.
   wasm-bindgen 같은 붙임 생성기는 쓰지 않는다 — 내보내기는 포인터·길이뿐이라 여기 손으로 잇는다.
   wasm 의 소스는 rust/mosaic-wasm · rust/art-core, 다시 짓는 법은 rust/README.md.

   브라우저에서는 window.AtelierMosaic, node 에서는 require 로 같은 것을 받는다.
   말(한글)은 여기 없다 — 화면 말은 lib/words.js. */
(function (root) {
  'use strict';

  var API = 1;
  /* 조각 밀도 — 가로 칸 수. 크기 — 받는 그림의 화소 */
  var DENSITY = { coarse: 32, normal: 48, fine: 72 };
  var SIZES = { phone: [1170, 2532], poster: [2048, 3072] };
  /* 한 그림 반복 — 고른 몫(칸 ÷ 조각)의 몇 배까지, 벌점은 고른 몫만큼 썼을 때 ΔE 몇. free 는 끝없이 */
  var REPEAT = { even: { share: 1.5, penalty: 8 }, normal: { share: 3, penalty: 4 }, free: { share: 0, penalty: 1 } };
  /* 과녁 그림을 줄일 때 작은 칸(조각의 1/2 × 1/3) 하나에 화소 K × K */
  var SAMPLE = 3;

  /* 칸 — 가로 cols 칸, 조각은 2:3 에 가깝게. 세로 칸 수는 반올림이라 조각 높이가 1~2% 늘거나 준다(빈틈 없이 꼭 찬다) */
  function layout(w, h, cols) {
    cols = Math.max(1, Math.round(cols));
    var tw = w / cols, rows = Math.max(1, Math.round(h / (tw * 1.5)));
    return { cols: cols, rows: rows, tileW: tw, tileH: h / rows, cells: cols * rows };
  }
  /* 칸 하나의 정수 자리 — 이웃 칸과 겹치거나 틈이 나지 않는다 */
  function rect(L, c, r) {
    var x0 = Math.round(c * L.tileW), y0 = Math.round(r * L.tileH);
    return { x: x0, y: y0, w: Math.round((c + 1) * L.tileW) - x0, h: Math.round((r + 1) * L.tileH) - y0 };
  }
  /* 바탕 그림을 받는 그림 비율로 덮게 자른다(가운데) */
  function cover(sw, sh, dw, dh) {
    var s = Math.max(dw / sw, dh / sh), w = dw / s, h = dh / s;
    return { sx: (sw - w) / 2, sy: (sh - h) / 2, sw: w, sh: h };
  }
  /* 같은 조각 사이 최소 간격 — 조각이 적으면 줄인다(다섯 칸 안에 스물넷이 다 달라야 하는데 조각이 그보다 적으면 색이 무너진다) */
  function spacingFor(tiles) { return tiles >= 100 ? 2 : tiles >= 30 ? 1 : 0; }
  function repeatFor(mode, cells, tiles) {
    var m = REPEAT[mode] || REPEAT.normal, share = cells / Math.max(1, tiles);
    return { max: m.share ? Math.max(1, Math.ceil(share * m.share)) : 0, penalty: m.penalty / Math.max(1, share) };
  }
  /* 씨앗 — 글자열에서 FNV-1a 두 벌(아래·위 32비트). 같은 그림·같은 설정이면 같은 배치 */
  function seedOf(s) {
    var a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995, i, c;
    s = String(s);
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      a = Math.imul(a ^ c, 0x01000193) >>> 0;
      b = Math.imul(b ^ c ^ (i & 255), 0x01000193) >>> 0;
    }
    return [a >>> 0, b >>> 0];
  }
  function fileName(file, size, cols, ext) {
    var base = String(file || 'mosaic').replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9_-]+/gi, '_');
    return 'mosaic_' + base + '_' + size + '_' + cols + '.' + (ext === 'jpeg' ? 'jpg' : 'png');
  }
  /* 색인 → 조각 목록. allow(파일) 이 거짓이면 뺀다(등록 안 된 것). 서명이 모자라는 것도 뺀다 */
  function tilesOf(index, allow, len) {
    var files = Object.keys((index && index.files) || {}).sort(), out = [], sig = [], i, k, lab;
    len = len || 21;
    for (i = 0; i < files.length; i++) {
      lab = index.files[files[i]] && index.files[files[i]].lab;
      if (!lab || lab.length < len || (allow && !allow(files[i]))) continue;
      out.push(files[i]);
      for (k = 0; k < len; k++) sig.push(lab[k] | 0);
    }
    return { files: out, sig: new Int16Array(sig) };
  }

  /* ── wasm 잇기 ── */
  function wrap(instance) {
    var x = instance.exports;
    function mem() { return x.memory.buffer; }
    function put(bytes) {
      var p = x.alloc(bytes.byteLength);
      new Uint8Array(mem(), p, bytes.byteLength).set(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
      return p;
    }
    var hash = new TextDecoder().decode(new Uint8Array(mem(), x.source_hash_ptr(), x.source_hash_len()));
    if (x.api_version() !== API) throw new Error('mosaic.wasm api ' + x.api_version() + ' != ' + API);
    var cellCount = 0;
    return {
      hash: hash, version: x.api_version(), sigLen: x.sig_len(),
      setTiles: function (sig) {
        var n = Math.floor(sig.length / x.sig_len()), p = put(sig), k = x.tiles_load(p, n);
        x.dealloc(p, sig.byteLength); return k;
      },
      setTarget: function (rgba, w, h, cols, rows) {
        var p = put(rgba), n = x.target_rgba(p, w, h, cols, rows);
        x.dealloc(p, rgba.byteLength); cellCount = n; return n;
      },
      cap: function (max) { return x.repeat_cap(max >>> 0); },
      targetMean: function () {
        var p = x.alloc(12), ok = x.target_mean(p), v = ok ? Array.from(new Float32Array(mem(), p, 3)) : null;
        x.dealloc(p, 12); return v;
      },
      match: function (o) {
        if (!cellCount) return new Uint32Array(0);
        var bytes = cellCount * 4, p = x.alloc(bytes), seed = o.seed || [0, 0];
        var n = x.match_tiles(o.maxRepeat >>> 0, o.spacing >>> 0, +o.penalty || 0, seed[0] >>> 0, seed[1] >>> 0, p);
        var out = new Uint32Array(n); out.set(new Uint32Array(mem(), p, n));
        x.dealloc(p, bytes); return out;
      }
    };
  }
  /* bytes(ArrayBuffer·Uint8Array) 또는 WebAssembly.Module */
  function instantiate(src) {
    return WebAssembly.instantiate(src, {}).then(function (r) { return wrap(r.instance || r); });
  }
  function supported() {
    return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
  }
  function load(url) {
    if (!supported()) return Promise.reject(new Error('wasm'));
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('mosaic.wasm ' + r.status);
      return r.arrayBuffer();
    }).then(instantiate);
  }

  var api = { API: API, DENSITY: DENSITY, SIZES: SIZES, REPEAT: REPEAT, SAMPLE: SAMPLE,
    layout: layout, rect: rect, cover: cover, spacingFor: spacingFor, repeatFor: repeatFor, seedOf: seedOf,
    fileName: fileName, tilesOf: tilesOf, supported: supported, instantiate: instantiate, load: load };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AtelierMosaic = api;
})(typeof window !== 'undefined' ? window : globalThis);
