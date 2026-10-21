/* 모자이크 — lib/mosaic.wasm(올려 둔 것)과 lib/mosaic.js 의 셈, data/art-index.json 의 꼴.
   Run: node tests/mosaic.cjs
   - wasm 이 소스보다 묵지 않았나: wasm 안의 source_hash 와 rust/ 소스를 여기서 같은 규칙으로 셈한 값(rust/mosaic-wasm/build.rs)
   - 가짜 색인(조각 40) + 가짜 과녁으로: 같은 씨앗이면 같은 결과, 최대 횟수, 이웃 간격, 제 색 찾기
   - 색인: 등록된 그림만, 서명 21 · dHash 16자 · 색 막대 64바이트, 정렬된 열쇠 */
const fs = require('node:fs'), path = require('node:path');
const assert = require('node:assert/strict');
const M = require('../lib/mosaic.js');
const ROOT = path.resolve(__dirname, '..'), RUST = path.join(ROOT, 'rust');

/* 1. 소스 셈 — build.rs 와 같은 규칙: rust/ 아래 상대 경로로 줄 세워  경로·0·내용(\r\n→\n)·0  을 FNV-1a 64 */
function walk(rel, out) {
  const p = path.join(RUST, rel);
  if (!fs.existsSync(p)) return;
  if (fs.statSync(p).isDirectory()) for (const n of fs.readdirSync(p).sort()) walk(rel + '/' + n, out);
  else out.push(rel);
}
const files = [];
for (const rel of ['art-core/Cargo.toml', 'art-core/src', 'mosaic-wasm/Cargo.toml', 'mosaic-wasm/build.rs', 'mosaic-wasm/src']) walk(rel, files);
files.sort();
let h = 0xcbf29ce484222325n;
const feed = buf => { for (const b of buf) { h ^= BigInt(b); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; } };
for (const f of files) {
  feed(Buffer.from(f)); feed([0]);
  feed(Buffer.from(fs.readFileSync(path.join(RUST, f), 'utf8').replace(/\r\n/g, '\n'))); feed([0]);
}
const want = h.toString(16).padStart(16, '0');
assert(files.length >= 5, '셈할 소스가 없다: ' + files.join(', '));

const bytes = fs.readFileSync(path.join(ROOT, 'lib/mosaic.wasm'));
assert(bytes.length < 200 * 1024, 'lib/mosaic.wasm 이 200 KB 를 넘는다: ' + bytes.length);
assert.deepEqual(WebAssembly.Module.imports(new WebAssembly.Module(bytes)), [], 'wasm 이 바깥에서 받는 것이 없어야 한다(손 싣개)');

/* sRGB → Lab (art-core 와 같은 식) — 가짜 조각 서명을 만들고, wasm 의 Lab 과도 견준다 */
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
function lab([r, g, b]) {
  [r, g, b] = [lin(r), lin(g), lin(b)];
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047, y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b,
    z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
/* 조각 40 — 색 바퀴 둘레와 밝기 */
const COLORS = Array.from({ length: 40 }, (_, i) => {
  const a = i / 40 * Math.PI * 2, v = 60 + (i % 4) * 45;
  return [Math.round(v + 70 * Math.cos(a)), Math.round(v + 70 * Math.cos(a - 2.1)), Math.round(v + 70 * Math.cos(a + 2.1))].map(c => Math.max(0, Math.min(255, c)));
});
const index = { version: 1, grid: [2, 3], files: {} };
COLORS.forEach((c, i) => { const l = lab(c).map(Math.round); index.files['t' + String(i).padStart(2, '0') + '.webp'] = { lab: [].concat(l, l, l, l, l, l, l) }; });
index.files['broken.webp'] = { lab: [1, 2, 3] };                                           // 서명이 모자라면 뺀다
index.files['ghost.webp'] = index.files['t00.webp'];                                       // 등록 안 된 것도 뺀다

(async () => {
  const W = await M.instantiate(bytes);
  assert.equal(W.hash, want, 'lib/mosaic.wasm 이 소스보다 묵었다 — rust/README.md 대로 다시 지어 올릴 것 (wasm ' + W.hash + ' · 소스 ' + want + ')');
  assert.equal(W.sigLen, 21);
  assert.equal(W.version, M.API);

  const T = M.tilesOf(index, f => f !== 'ghost.webp', W.sigLen);
  assert.equal(T.files.length, 40, '조각 40 — 모자란 서명·등록 안 된 것은 빠진다');
  assert.equal(T.files.indexOf('ghost.webp'), -1);
  assert.equal(W.setTiles(T.sig), 40);

  /* 과녁 — 칸마다 조각 색 하나로 칠한 그림(칸 i 는 COLORS[(i*7) % 40]) */
  const cols = 24, rows = 16, K = M.SAMPLE, w = cols * 2 * K, hh = rows * 3 * K;
  const rgba = new Uint8ClampedArray(w * hh * 4), colourAt = k => COLORS[(k * 7) % 40];
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    const k = Math.floor(y / (3 * K)) * cols + Math.floor(x / (2 * K)), c = colourAt(k), o = (y * w + x) * 4;
    rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = 255;
  }
  assert.equal(W.setTarget(rgba, w, hh, cols, rows), cols * rows);
  assert.equal(W.setTarget(rgba, 3, 3, cols, rows), 0, '칸보다 작은 과녁은 거절');
  assert.equal(W.match({ maxRepeat: 0, spacing: 0, penalty: 0, seed: [1, 0] }).length, 0, '거절한 뒤엔 칸이 없다');
  W.setTarget(rgba, w, hh, cols, rows);
  /* Lab 이 이 검사의 식과 같은가 — 과녁 평균 */
  const mean = W.targetMean(), wantMean = [0, 1, 2].map(d => Array.from({ length: cols * rows }, (_, k) => lab(colourAt(k))[d]).reduce((a, b) => a + b) / (cols * rows));
  assert(mean.every((v, d) => Math.abs(v - wantMean[d]) < 0.05), 'Lab 셈이 다르다: ' + mean + ' vs ' + wantMean);

  /* 끝없이·간격 없이면 칸마다 제 색 조각 */
  const free = W.match({ maxRepeat: 0, spacing: 0, penalty: 0, seed: [5, 0] });
  assert.equal(free.length, cols * rows);
  free.forEach((t, k) => assert.equal(T.files[t], 't' + String((k * 7) % 40).padStart(2, '0') + '.webp', '칸 ' + k));

  /* 최대 횟수와 간격 — 다 같은 색 과녁이면 한 조각으로 몰리려 한다 */
  const flat = new Uint8ClampedArray(rgba.length);
  for (let o = 0; o < flat.length; o += 4) { flat[o] = COLORS[3][0]; flat[o + 1] = COLORS[3][1]; flat[o + 2] = COLORS[3][2]; flat[o + 3] = 255; }
  W.setTarget(flat, w, hh, cols, rows);
  /* 같은 씨앗 = 같은 결과, 다른 씨앗 = 대개 다른 결과 — 고를 것이 여럿인 한 색 과녁에서 */
  const opt = { maxRepeat: 9, spacing: 2, penalty: 0.4, seed: M.seedOf('alice_begin.webp|48') };
  const a = W.match(opt), b = W.match(opt), c = W.match({ ...opt, seed: M.seedOf('other') });
  assert.deepEqual(Array.from(a), Array.from(b), '같은 씨앗이면 같은 배치');
  assert.notDeepEqual(Array.from(a), Array.from(c), '다른 씨앗이면 다른 배치');
  for (const [maxRepeat, spacing] of [[12, 1], [12, 2], [3, 1]]) {
    const cap = W.cap(maxRepeat), got = W.match({ maxRepeat, spacing, penalty: 0, seed: [9, 9] });
    assert.equal(cap, Math.max(maxRepeat, Math.ceil(cols * rows / 40)), '최대 횟수는 고른 몫 아래로 안 간다');
    const uses = {}; got.forEach(t => { uses[t] = (uses[t] || 0) + 1; });
    assert(Math.max(...Object.values(uses)) <= cap, `최대 ${cap} 을 넘었다: ${Math.max(...Object.values(uses))}`);
    for (let k = 0; k < got.length; k++) for (let dr = -spacing; dr <= spacing; dr++) for (let dc = -spacing; dc <= spacing; dc++) {
      const r = Math.floor(k / cols) + dr, cc = k % cols + dc;
      if ((dr || dc) && r >= 0 && r < rows && cc >= 0 && cc < cols) assert.notEqual(got[r * cols + cc], got[k], `간격 ${spacing} 안에 같은 조각 (${k})`);
    }
  }
  const lazy = W.match({ maxRepeat: 0, spacing: 0, penalty: 0, seed: [1, 1] });
  assert(Array.from(lazy).every(t => t === lazy[0]), '벌점·간격이 없으면 가장 가까운 한 조각');
  const spread = W.match({ maxRepeat: 0, spacing: 0, penalty: M.repeatFor('even', cols * rows, 40).penalty, seed: [1, 1] });
  assert(new Set(spread).size > 3, '벌점이 있으면 퍼진다');

  /* 2. 화면 없는 셈 */
  for (const [k, [ow, oh]] of Object.entries(M.SIZES)) for (const cols of Object.values(M.DENSITY)) {
    const L = M.layout(ow, oh, cols);
    assert(Math.abs(L.tileH / L.tileW - 1.5) < 0.03, `${k} ${cols}: 조각이 2:3 — ${L.tileW}×${L.tileH}`);
    const last = M.rect(L, cols - 1, L.rows - 1);
    assert.equal(last.x + last.w, ow); assert.equal(last.y + last.h, oh);
    const r0 = M.rect(L, 0, 0), r1 = M.rect(L, 1, 0);
    assert.equal(r0.x + r0.w, r1.x, '이웃 칸 사이에 틈이 없다');
  }
  assert.deepEqual(M.layout(1170, 2532, 32), { cols: 32, rows: 46, tileW: 1170 / 32, tileH: 2532 / 46, cells: 32 * 46 });
  const cv = M.cover(1024, 1536, 1170, 2532);
  assert(Math.abs(cv.sw / cv.sh - 1170 / 2532) < 1e-9 && cv.sy === 0 && Math.abs(cv.sx * 2 + cv.sw - 1024) < 1e-9, '가운데를 덮게 자른다');
  assert.deepEqual(M.cover(1024, 1536, 2048, 3072), { sx: 0, sy: 0, sw: 1024, sh: 1536 });
  assert.equal(M.fileName('don_quixote_middle_literary_fantasy_f.webp', 'poster', 48, 'png'), 'mosaic_don_quixote_middle_literary_fantasy_f_poster_48.png');
  assert.equal(M.fileName('a b.webp', 'phone', 32, 'jpeg'), 'mosaic_a_b_phone_32.jpg');
  assert.deepEqual(M.seedOf('x'), M.seedOf('x')); assert.notDeepEqual(M.seedOf('x'), M.seedOf('y'));
  assert.deepEqual([M.spacingFor(154), M.spacingFor(40), M.spacingFor(18)], [2, 1, 0]);
  assert.deepEqual(M.repeatFor('free', 1000, 100), { max: 0, penalty: 0.1 });
  assert.equal(M.repeatFor('even', 1000, 100).max, 15);

  /* 3. 색인 — 등록된 그림만, 꼴이 맞나. 등록은 됐는데 색인에 없는 것은 세기만 한다(모자이크가 건너뛴다) */
  const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/art-index.json'), 'utf8'));
  const reg = new Set(), walkReg = v => { if (typeof v === 'string') { if (v.endsWith('.webp')) reg.add(v); } else if (v && typeof v === 'object') Object.values(v).forEach(walkReg); };
  walkReg(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/img.json'), 'utf8')).img);
  assert.equal(idx.version, 1); assert.deepEqual(idx.grid, [2, 3]);
  const names = Object.keys(idx.files);
  assert.equal(idx.count, names.length);
  assert.deepEqual(names, [...names].sort(), '색인 열쇠가 줄 서 있다');
  for (const n of names) {
    const e = idx.files[n];
    assert(reg.has(n), n + ' 은 등록되지 않은 그림이다');
    assert.deepEqual(Object.keys(e), ['dhash', 'hist', 'lab'], n);
    assert(e.lab.length === 21 && e.lab.every(v => Number.isInteger(v) && v >= -128 && v <= 127), n + ' 서명');
    assert(e.lab.filter((_, i) => i % 3 === 0).every(v => v >= 0 && v <= 100), n + ' L 은 0..100');
    assert(/^[0-9a-f]{16}$/.test(e.dhash), n + ' dHash');
    const hist = Buffer.from(e.hist, 'base64');
    assert.equal(hist.length, 64, n + ' 색 막대 64');
    const sum = hist.reduce((a, b) => a + b, 0);
    assert(sum >= 223 && sum <= 287, n + ' 색 막대 합 ≈ 255: ' + sum);
  }
  const lag = [...reg].filter(n => !idx.files[n]);
  const real = M.tilesOf(idx, n => reg.has(n), W.sigLen);
  assert.equal(W.setTiles(real.sig), real.files.length);
  console.log(`PASS 모자이크: wasm ${(bytes.length / 1024).toFixed(1)} KB · 소스 셈 ${want} 일치 · 같은 씨앗 같은 배치 · 최대 횟수 · 간격 1·2 · 제 색 찾기 · 칸·자르기·파일 이름 · 색인 ${names.length}장`
    + (lag.length ? ` (등록됐지만 색인에 없는 ${lag.length}장 — cargo run --release -p art-index)` : ''));
})().catch(e => { console.error(e); process.exit(1); });
