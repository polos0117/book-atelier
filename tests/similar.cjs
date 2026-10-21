/* 닮은 그림 — data/art-similar.json 이 data/art-index.json · data/img.json 과 맞나.
   만드는 쪽은 rust/art-index --similar(셈은 rust/art-core 의 similarity · nearest), 쓰는 쪽은 서가 상세의 "닮은 그림" 줄.
   - 꼴: version 1 · k ≤ 8 · 열쇠가 줄 서 있다 · 한 그림 한 줄
   - 올린 파일(열쇠·닮은 그림)이 다 색인과 등록부에 있다, 자기 자신 없음, 같은 그림 두 번 없음
   - 점수는 0..1000 정수 오름차순, 같으면 이름 차례 · 한 책에서 per_book 장까지
   - near(거의 같은 쌍)는 점수 < near_below, 앞 이름 < 뒤 이름
   - 색인에 있는데 닮은 그림에 없는 장은 세기만 한다(줄이 그 그림에서는 안 뜬다) — 다시 만들라고 알린다
   Run: node tests/similar.cjs */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const text = read('data/art-similar.json');
const sim = JSON.parse(text), idx = JSON.parse(read('data/art-index.json')), img = JSON.parse(read('data/img.json'));

/* 파일 → 책 — 등록부 img 의 맨 위 열쇠가 책이다 */
const bookOf = new Map();
const walk = (v, book) => { if (typeof v === 'string') { if (v.endsWith('.webp')) bookOf.set(v, book); } else if (v && typeof v === 'object') Object.values(v).forEach(x => walk(x, book)); };
for (const [book, v] of Object.entries(img.img || {})) walk(v, book);

assert.equal(sim.version, 1);
assert(Number.isInteger(sim.k) && sim.k >= 1 && sim.k <= 8, 'k ≤ 8: ' + sim.k);
assert(Number.isInteger(sim.per_book) && sim.per_book >= 1, 'per_book');
assert(Number.isInteger(sim.near_below) && sim.near_below > 0, 'near_below');
assert(/hamming/.test(sim.score) && /chi_square/.test(sim.score) && /sig_distance/.test(sim.score), '점수 식이 적혀 있다');
const names = Object.keys(sim.files);
assert.equal(sim.count, names.length);
assert.deepEqual(names, [...names].sort(), '열쇠가 줄 서 있다');
/* 한 그림 한 줄 — 그림을 더하면 그 줄만 바뀐다 */
for (const n of names) assert(text.includes('\n    ' + JSON.stringify(n) + ': ['), n + ' 이 한 줄이 아니다');

let pairs = 0;
for (const n of names) {
  assert(idx.files[n], n + ' 은 색인에 없다');
  assert(bookOf.has(n), n + ' 은 등록부에 없다');
  const row = sim.files[n];
  assert(Array.isArray(row) && row.length <= sim.k, n + ' 은 k 장을 넘는다');
  assert(names.length < 2 || row.length > 0, n + ' 줄이 비었다');
  const seen = new Set(), per = new Map();
  let last = [-1, ''];
  for (const pair of row) {
    assert(Array.isArray(pair) && pair.length === 2, n + ' 칸 꼴');
    const [f, s] = pair;
    assert.notEqual(f, n, n + ' 자기 자신');
    assert(!seen.has(f), n + ' 에 ' + f + ' 가 두 번');
    seen.add(f);
    assert(idx.files[f], f + ' 은 색인에 없다(' + n + ')');
    assert(bookOf.has(f), f + ' 은 등록부에 없다(' + n + ')');
    assert(Number.isInteger(s) && s >= 0 && s <= 1000, n + ' 점수 ' + s);
    assert(s > last[0] || (s === last[0] && f > last[1]), n + ' 오름차순(같으면 이름 차례)');
    last = [s, f];
    const b = bookOf.get(f);
    per.set(b, (per.get(b) || 0) + 1);
    pairs++;
  }
  for (const [b, c] of per) assert(c <= sim.per_book, n + ' 에 ' + b + ' 가 ' + c + '장(최대 ' + sim.per_book + ')');
}

/* 점수는 둘 사이에 하나 — 서로 실렸으면 같은 점수 */
for (const n of names) for (const [f, s] of sim.files[n]) {
  const back = (sim.files[f] || []).find(p => p[0] === n);
  if (back) assert.equal(back[1], s, n + ' ↔ ' + f + ' 점수가 다르다');
}

assert(Array.isArray(sim.near), 'near');
for (const p of sim.near) {
  assert(p.length === 3 && p[0] < p[1] && Number.isInteger(p[2]) && p[2] < sim.near_below, '거의 같은 쌍 꼴: ' + JSON.stringify(p));
  assert(sim.files[p[0]] && sim.files[p[1]], '거의 같은 쌍은 둘 다 실려 있다');
}

const lag = Object.keys(idx.files).filter(n => bookOf.has(n) && !sim.files[n]);
console.log(`PASS 닮은 그림: ${names.length}장 × ≤${sim.k} (${pairs}칸) · 한 책 ${sim.per_book}장까지 · 자기 자신 없음 · 색인·등록부에 다 있다 · 거의 같은 쌍 ${sim.near.length}`
  + (sim.near.length ? '\n  ' + sim.near.map(p => `${p[0]} ↔ ${p[1]} (${p[2]})`).join('\n  ') : '')
  + (lag.length ? ` (색인에 있지만 닮은 그림에 없는 ${lag.length}장 — cargo run --release -p art-index -- --similar)` : ''));
