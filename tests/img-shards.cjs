/* 그림 주소·등록기·워크플로·.gitignore 가 같은 저장소 차례를 말하나. pkm-atelier 의 같은 검사에서 왔다.
   Run: node tests/img-shards.cjs
   - 등록된 파일의 원본·썸네일 주소가 BASES[0] + 파일 이름(where 에 적힌 것만 다른 저장소)
   - lib/img.js 의 BASES · tools/register-images.py 의 SHARDS · 워크플로가 받는 저장소 · .gitignore 가 같은 차례 */
const fs = require('node:fs'), vm = require('node:vm');
const assert = require('node:assert/strict');

const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('lib/img.js', 'utf8'), ctx);
const A = ctx.window.AtelierImg;
const doc = JSON.parse(fs.readFileSync('data/img.json', 'utf8'));
const files = [...new Set(Object.values(doc.img).flatMap(e => A.allShotsOf(e).concat(
  ...Object.values(A.styleMap(e)).flatMap(b => Object.values(A.formMap(b)).flatMap(f => [f.f, f.m, ...A.cuts(f, 'action', 'f')]))
)).filter(Boolean))];

const FIRST = 'https://polos0117.github.io/book-atelier-img/img/';
const enc = f => encodeURIComponent(f).replace(/'/g, '%27');
A.setShards(doc);
assert.equal(A.BASE, FIRST);
for (const f of files.concat(['alice_begin_literary_fantasy_f.webp'])) {
  if ((doc.where || {})[f]) continue;
  assert.equal(A.imgURL(f), FIRST + enc(f), f);
  assert.equal(A.thumbURL(f), FIRST + 'thumb/' + enc(f), f);
}
for (const [f, i] of Object.entries(doc.where || {}))
  assert(Number.isInteger(i) && i > 0 && i < A.BASES.length, f + ' 의 저장소 번호 ' + i);

const py = fs.readFileSync('tools/register-images.py', 'utf8');
const SHARDS = JSON.parse(py.match(/^SHARDS = (\[.*\])$/m)[1]);
const EXTRA = JSON.parse(py.match(/^EXTRA_DIRS = (\[.*\])$/m)[1]);
assert.equal(SHARDS.length, A.BASES.length, '저장소 수');
SHARDS.forEach((s, i) => assert.equal(A.BASES[i], 'https://polos0117.github.io/' + s + '/img/', i + ' 번 저장소'));
assert.deepEqual(EXTRA, SHARDS.slice(1).map((_, i) => 'img-' + (i + 2)), '둘째부터의 자리 이름은 img-N');
const wf = fs.readFileSync('.github/workflows/register-images.yml', 'utf8');
SHARDS.forEach((s, i) => {
  const path = i ? 'img-repo-' + (i + 1) : 'img-repo';
  assert(new RegExp('repository: polos0117/' + s + '\\s*\\n\\s*path: ' + path + '\\b').test(wf), s + ' 를 ' + path + ' 로 받는다');
  assert(wf.includes('ln -s ' + path + '/img ' + (i ? EXTRA[i - 1] : 'img')), path + ' 를 잇는다');
});
const ignore = fs.readFileSync('.gitignore', 'utf8').split('\n');
for (const d of ['img', ...EXTRA]) assert(ignore.includes('/' + d), d + ' 는 올리지 않는다');
console.log(`PASS 그림 저장소: 등록 ${files.length}개 주소 · BASES=SHARDS=워크플로=.gitignore`);
