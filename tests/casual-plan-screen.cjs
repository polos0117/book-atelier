/* 묶음 계획기의 기록 = 생성기 화면 — 계획기가 쓴 기록의 저장 상태를 화면에 넣으면 화면이 같은 지시문을 만든다.
   node tests/casual-plan-screen.cjs (BASE_URL 이 있으면 그 서버, 없으면 tests/browser-harness.cjs 가 띄운다) */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { start, FOLD } = require('./browser-harness.cjs');
const C = require('../tools/casual-plan.cjs');
const design = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/book-design.json'), 'utf8'));
(async () => {
  const h = await start();
  try {
    let n = 0;
    for (const key of ['hamlet', 'chunhyang', 'lord_of_the_rings']) {
      const g = design.books.find(x => x.key === key);
      for (const cut of C.plan(g, [1, 2, 3, 4, 5], [], { seed: 21 }).cuts.slice(0, 3)) {
        const rec = C.record(g, cut);
        const { page: p } = await h.open('index.html', { viewport: FOLD.inner, mobile: true });
        await p.evaluate(s => localStorage.setItem('book_prompt_v1', JSON.stringify(s)), rec.storage);
        await p.goto(p.url().replace(/index\.html.*$/, 'prompt.html?book=' + key + '&mode=casual'));
        await p.waitForSelector('#casual-tree');
        const shown = await p.$eval('#prompt-output', e => e.value);
        assert.equal(shown, rec.prompt, key + ' casual' + cut.n + ' 화면과 계획기 지시문이 다르다');
        assert.equal(await p.$eval('#place', e => e.value), cut.place, '장소 칸');
        assert.match(await p.$eval('#file-name code', e => e.textContent), new RegExp('casual' + cut.n + '\\.webp'));
        await p.close(); n++;
      }
    }
    console.log(`PASS 묶음 계획기 ↔ 생성기 화면: 기록 ${n}개를 화면에 넣으면 같은 지시문·같은 칸·같은 파일 이름`);
  } finally { await h.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
