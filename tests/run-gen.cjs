/* 서고 탐험 지도 생성기 — lib/shelf-gen.wasm(올려 둔 것)과 lib/shelf-gen.js 싣개.
   Run: node tests/run-gen.cjs
   - wasm 이 소스보다 묵지 않았나: wasm 안의 source_hash 와 rust/shelf-gen 소스를 같은 규칙으로 셈한 값(rust/shelf-gen/build.rs)
   - 같은 씨앗 같은 지도 · 300 씨앗의 규칙(docs/RUN_DESIGN.md 2절): 아홉 층, 열 꼴, 길이 이웃 열 사이·단조·다 닿음, 종류 수, 책 겹침 없음, 상대 덱 여섯 */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const S = require('../lib/shelf-gen.js');
const ROOT = path.resolve(__dirname, '..'), RUST = path.join(ROOT, 'rust');
function walk(rel, out) { const p = path.join(RUST, rel); if (!fs.existsSync(p)) return; if (fs.statSync(p).isDirectory()) for (const n of fs.readdirSync(p).sort()) walk(rel + '/' + n, out); else out.push(rel); }
const files = []; for (const rel of ['shelf-gen/Cargo.toml', 'shelf-gen/build.rs', 'shelf-gen/src']) walk(rel, files); files.sort();
let h = 0xcbf29ce484222325n; const feed = buf => { for (const b of buf) { h ^= BigInt(b); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; } };
for (const f of files) { feed(Buffer.from(f)); feed([0]); feed(Buffer.from(fs.readFileSync(path.join(RUST, f), 'utf8').replace(/\r\n/g, '\n'))); feed([0]); }
const want = h.toString(16).padStart(16, '0');
const bytes = fs.readFileSync(path.join(ROOT, 'lib/shelf-gen.wasm'));
assert(bytes.length < 120 * 1024, 'lib/shelf-gen.wasm 이 120 KB 를 넘는다: ' + bytes.length);
assert.deepEqual(WebAssembly.Module.imports(new WebAssembly.Module(bytes)), [], 'wasm 이 바깥에서 받는 것이 없어야 한다');
const KINDS = ['entry', 'meet', 'read', 'rest', 'scene', 'stairs', 'boss'];
function check(p, books) {
  assert(p.v === 2 && p.books === books && p.items === books && p.floors.length === 9 && p.boss < books, '머리');
  let prev = [], metAny = new Set();
  p.floors.forEach((f, fi) => {
    assert(f.n === fi + 1 && f.stage === Math.floor((f.n - 1) / 3) && f.cols >= 4 && f.cols <= 5, '층 ' + f.n);
    assert.deepEqual(f.rooms.map(r => r.id), f.rooms.map((_, i) => i), 'id 차례');
    const col = c => f.rooms.filter(r => r.col === c);
    assert(col(0).length === 1 && col(0)[0].kind === 'entry', '들어온 자리 하나');
    assert(col(f.cols - 1).length === 1 && col(f.cols - 1)[0].kind === (f.n === 9 ? 'boss' : 'stairs'), '나가는 자리 하나');
    for (let c = 1; c < f.cols - 1; c++) assert(col(c).length >= 2 && col(c).length <= 3, '가운데 열 2~3');
    for (const r of f.rooms) assert(KINDS.includes(r.kind), r.kind);
    for (const [a, b] of f.edges) assert(f.rooms[b].col === f.rooms[a].col + 1, '이웃 열 사이');
    for (const r of f.rooms) { if (r.col > 0) assert(f.edges.some(e => e[1] === r.id), '들어오는 길'); if (r.col < f.cols - 1) assert(f.edges.some(e => e[0] === r.id), '나가는 길'); }
    for (const [a, b] of f.edges) for (const [c, d] of f.edges) if (f.rooms[a].col === f.rooms[c].col && f.rooms[a].row < f.rooms[c].row) assert(f.rooms[b].row <= f.rooms[d].row, '엇갈림');
    const seen = new Set([0]), q = [0]; while (q.length) { const x = q.shift(); for (const n of S.nextOf(f, x)) if (!seen.has(n)) { seen.add(n); q.push(n); } }
    assert.equal(seen.size, f.rooms.length, '다 닿는다');
    const meets = f.rooms.filter(r => r.kind === 'meet'), middle = f.rooms.length - 2;
    const guard = col(f.cols - 2); assert(guard.every(r => r.kind === 'meet'), '계단 앞 열은 모두 층지기'); assert.equal(meets.length, guard.length + (f.n >= 4 ? 1 : 0), '싸움 수'); assert(meets.length < middle, '방 하나는 싸움이 아니다');
    assert(f.rooms.some(r => r.kind === 'read'), '독서대'); if (f.n % 2 === 0) assert(f.rooms.some(r => r.kind === 'rest'), '쉼');
    const here = new Set();
    for (const r of f.rooms) {
      if (r.kind === 'meet' || r.kind === 'scene') { assert(r.book < books && r.book !== p.boss && !here.has(r.book), '책 겹침·보스'); here.add(r.book); if (r.kind === 'meet') { assert(!prev.includes(r.book), '윗층과 같은 책'); metAny.add(r.book); } }
      if (r.kind === 'meet' || r.kind === 'boss') { assert(r.foe.length === 6 && new Set(r.foe).size === 6 && r.foe[0] === r.book, '상대 덱'); }
      if (r.kind === 'meet') assert(r.loot.length === 2 && r.loot[0] !== r.loot[1] && !r.loot.includes(r.book), '전리품 둘');
      if (r.kind === 'read') assert(r.offers.length === 5 && new Set(r.offers).size === 5, '독서대 다섯');
      if (r.kind === 'boss') assert(r.book === p.boss, '보스 책');
    }
    prev = meets.map(r => r.book);
  });
  assert(!metAny.has(p.boss), '보스는 미리 안 나온다');
}
(async () => {
  await S.load(bytes);
  assert.equal(S.sourceHash(), want, 'lib/shelf-gen.wasm 이 rust/shelf-gen 소스보다 묵었다 — 다시 짓는다(rust/README.md): ' + S.sourceHash() + ' != ' + want);
  const a = S.plan(7, 11, 20), b = S.plan(7, 11, 20);
  assert.deepEqual(a, b, '같은 씨앗 같은 지도'); assert.notDeepEqual(S.plan(8, 11, 20), a, '다른 씨앗 다른 지도');
  assert.equal(S.plan(1, 1, 9), null, '책이 모자라면 null(열 권은 있어야 한 층의 만남·윗층 것·보스가 다 다르다)'); assert.match(S.lastError() || '', /items/, '까닭');
  /* 규칙 표로 — 책 표를 꺼내 그대로 주면 같은 지도, 다른 표(신화 던전 꼴)도 짠다, 틀린 표는 null */
  const bs = S.bookSpec(); assert(bs.floors === 9 && bs.guard === 'meet' && bs.kinds.meet.draws.foe.n === 6, '책 규칙 표');
  assert.deepEqual(S.planSpec(7, 11, bs), a, '표를 그대로 주면 plan 과 같은 지도');
  const myth = S.planSpec(1, 2, { floors: 2, stage_div: 1, cols: 9, middle: [1, 3], exit: 'boss', last_exit: 'boss', guard: 'fight', slots: [{ kind: 'shrine' }, { kind: 'gate' }, { kind: 'shop' }, { kind: 'rest' }, { kind: 'fight' }, { kind: 'fight' }], fill: ['fight', 'rest'], items: 0, kinds: {} });
  assert(myth && myth.floors.length === 2 && myth.boss === null && myth.floors.every(f => f.cols === 9 && f.rooms.filter(r => r.col === 7).every(r => r.kind === 'fight') && ['shrine', 'gate', 'shop', 'rest'].every(k => f.rooms.some(r => r.kind === k)) && f.rooms.every(r => r.book === undefined && r.foe === undefined)), '신화 던전 꼴의 표');
  assert.equal(S.planSpec(1, 1, { cols: 2 }), null, '틀린 표는 null'); assert.equal(S.planSpec(1, 1, '{nope'), null, '깨진 JSON 도 null');
  for (let s = 0; s < 300; s++) check(S.plan(s, (s * 2654435761) >>> 0, 20), 20);
  for (let s = 0; s < 30; s++) check(S.plan(s, 1, 10), 10);
  const [lo, hi] = S.seedOf('2026-10-21book'); assert(lo > 0 && hi > 0 && S.seedOf('2026-10-21book')[0] === lo, '글 씨앗');
  const sizes = a.floors.map(f => f.rooms.length);
  console.log('PASS 길 지도 생성기: 소스 셈 일치 · 같은 씨앗 같은 지도 · 330 씨앗 책 규칙(열·길·종류·책) · 규칙 표(책 표 그대로·신화 던전 꼴·틀린 표) · 방 수 ' + sizes.join('/') + ' · wasm ' + bytes.length + 'B');
})().catch(e => { console.error(e); process.exit(1); });
