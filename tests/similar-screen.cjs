/* 서가 상세의 "닮은 그림" 줄 — 큰 그림 아래(펼친 쪽은 그림 쪽 단 밑, 휴대폰 가로는 글 쪽 단 밑).
   상세를 열 때만 data/art-similar.json 을 받는다 · 등록부에 없는 그림은 뺀다 · 보는 그림이 바뀌면 줄도 바뀐다 ·
   누르면 그 책 그 그림(?book=, 다른 화풍이면 그 화풍) · 같은 책이면 그 자리에서 · 자료가 없거나 틀리면 줄째 숨는다 ·
   다섯 크기에서 쪽 넘침 없음·줄 안에서만 옆으로·44px·focus-visible.
   ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/similar-screen.cjs
   그림은 tests/fixtures/make-art.py 의 가짜 그림, 닮은 그림 자료는 여기서 짠다(실제 자료의 꼴은 tests/similar.cjs) */
const assert = require('node:assert/strict'), os = require('node:os'), fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { start, FOLD } = require('./browser-harness.cjs');
const art = fs.mkdtempSync(path.join(os.tmpdir(), 'book-art-'));
const img = execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-art.py'), art]).toString();
const S = 'literary_fantasy', T = 'style_trial';
const f = (book, form) => `${book}_${form}_${S}_f.webp`;
const F = {
  alice: f('alice', 'begin'), aliceMid: f('alice', 'middle'), aliceOpen: f('alice', 'begin_open'), aliceEnd: f('alice', 'end'),
  frankMid: f('frankenstein', 'middle'), frank: f('frankenstein', 'begin'), kosmos: f('kosmos', 'begin'),
  casual1: `don_quixote_${S}_f_casual1.webp`, casual2: `don_quixote_${S}_f_casual2.webp`, trial: `don_quixote_middle_${T}_f.webp`,
};
const SIM = { version: 1, k: 8, per_book: 2, near: [], near_below: 50, files: {
  [F.alice]: [[F.frankMid, 100], [F.aliceOpen, 120], [F.casual2, 150], ['not_registered_f.webp', 160], [F.trial, 170], [F.frank, 180], [F.kosmos, 190], [F.aliceEnd, 200]],
  [F.aliceMid]: [[F.kosmos, 90]],
  [F.trial]: [[F.casual1, 80], [F.alice, 140]],
} };
const opt = (sim, extra) => ({ viewport: FOLD.cover, mobile: true, imgRoot: art,
  files: Object.assign({ 'data/img.json': img }, sim === undefined ? {} : { 'data/art-similar.json': sim }), ...extra });
const row = p => p.$$eval('.similar-cell', es => es.map(e => e.dataset.file));
const title = p => p.$eval('.bar h2', e => e.firstChild.textContent.trim());
const bigSrc = p => p.$eval('.big img', e => e.getAttribute('src'));
const asked = p => p.evaluate(() => new URLSearchParams(location.search).get('book'));
const fetched = p => p.evaluate(() => performance.getEntriesByType('resource').filter(e => e.name.includes('art-similar.json')).length);
const openBook = async (p, key) => { await p.click(`.grid > .cell[data-card="${key}"]`); await p.waitForSelector('.fstrip'); };
(async () => {
  const h = await start();
  try {
    /* 1. 목록에서는 안 받는다 — 상세를 열 때 한 번 */
    let a = await h.open('dex.html', opt(SIM)), p = a.page;
    await p.waitForSelector('.grid > .cell');
    assert.equal(await fetched(p), 0, '목록에서는 닮은 그림을 안 받는다');
    await openBook(p, 'alice');
    await p.waitForSelector('.similar-cell');
    assert.equal(await p.$eval('.similar', e => e.dataset.for), F.alice, '지금 보는 그림의 줄');
    assert.deepEqual(await row(p), [F.frankMid, F.aliceOpen, F.casual2, F.trial, F.frank, F.kosmos, F.aliceEnd], '점수 차례 · 등록 안 된 그림은 뺀다');
    assert.equal(await p.$eval('.similar-head', e => e.textContent), await p.evaluate(() => W('dex.similar.title') + W('dex.similar.note', { n: 7 })));
    assert.deepEqual(await p.$$eval('.similar-book', es => es.slice(0, 3).map(e => e.textContent)), ['프랑켄슈타인', '이상한 나라의 앨리스', '돈키호테'], '칸마다 책 이름');
    assert.match(await p.$eval('.similar-cell', e => e.getAttribute('aria-label')), /^프랑켄슈타인 · 전개/, '칸 이름 — 책 · 그림');
    /* 줄은 큰 그림 아래, 글 단보다 앞(세로 한 단) */
    const order = await p.evaluate(() => { const y = s => document.querySelector(s).getBoundingClientRect().top; return [y('.big') < y('.similar'), y('.similar') < y('.story-panel')]; });
    assert.deepEqual(order, [true, true], '큰 그림 → 닮은 그림 → 글');
    /* 2. 보는 그림이 바뀌면 줄도 — 전개로 */
    await p.click('.fcell[data-form="middle"]');
    await p.waitForFunction(f => document.querySelector('.similar')?.dataset.for === f, F.aliceMid);
    assert.deepEqual(await row(p), [F.kosmos], '전개의 줄');
    /* 줄이 없는 그림(자료에 없음)이면 줄째 숨는다 */
    await p.click('.fcell[data-form="end"]');
    await p.waitForFunction(() => !document.querySelector('.similar'));
    await p.click('.fcell[data-form="middle"]');
    await p.waitForSelector('.similar-cell');
    /* 3. 누르면 그 책 그 그림 — 주소는 ?book= */
    await p.click(`.similar-cell[data-file="${F.kosmos}"]`);
    await p.waitForFunction(() => document.querySelector('.bar h2')?.firstChild.textContent.trim() === '코스모스');
    assert.equal(await asked(p), 'kosmos', '?book= 이 그 책으로');
    assert.match(await bigSrc(p), /kosmos_begin_literary_fantasy/, '누른 그림이 큰 그림');
    assert.equal(await p.evaluate(() => document.querySelector('.collection-scroll').scrollTop), 0, '그 책 상세의 맨 위에서');
    assert.equal(await fetched(p), 1, '한 번만 받는다');
    /* 뒤로 가기 — 목록으로(상세 칸은 하나) */
    await p.goBack(); await p.waitForSelector('.grid > .cell');
    /* 4. 다른 화풍 그림 — 그 화풍으로 열린다 */
    await openBook(p, 'alice');
    await p.waitForSelector('.similar-cell');
    await p.locator(`.similar-cell[data-file="${F.trial}"]`).scrollIntoViewIfNeeded();
    await p.click(`.similar-cell[data-file="${F.trial}"]`);
    await p.waitForFunction(() => document.querySelector('.bar h2')?.firstChild.textContent.trim() === '돈키호테');
    assert.match(await bigSrc(p), /don_quixote_middle_style_trial/);
    assert.equal(await p.$eval('.style-cell.on', e => e.dataset.style), T, '그 화풍');
    assert.equal(await asked(p), 'don_quixote');
    /* 5. 같은 책의 그림이면 그 자리에서 — 화풍도 그 그림 것으로 */
    await p.waitForFunction(f => document.querySelector('.similar')?.dataset.for === f, F.trial);
    await p.click(`.similar-cell[data-file="${F.casual1}"]`);
    await p.waitForFunction(() => /don_quixote_literary_fantasy_f_casual1/.test(document.querySelector('.big img')?.getAttribute('src')));
    assert.equal(await title(p), '돈키호테');
    assert.equal(await p.$eval('.style-cell.on', e => e.dataset.style), S, '같은 책 — 그 그림의 화풍');
    assert.match(await p.$eval('.artwork-panel > .sec', e => e.textContent), /일상컷 1/);
    /* 6. 키보드 — 초점이 보이고 Enter 로 연다 */
    await p.click('.fcell[data-form="middle"]');
    await p.waitForSelector('.style-cell');
    await p.click(`.style-cell[data-style="${T}"]`);
    await p.waitForFunction(f => document.querySelector('.similar')?.dataset.for === f, F.trial);
    await p.keyboard.press('Tab');
    await p.locator(`.similar-cell[data-file="${F.alice}"]`).focus();
    assert(await p.$eval(`.similar-cell[data-file="${F.alice}"]`, e => e.matches(':focus-visible') && getComputedStyle(e).outlineStyle !== 'none'), 'focus-visible');
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => document.querySelector('.bar h2')?.firstChild.textContent.trim() === '이상한 나라의 앨리스');
    assert.match(await bigSrc(p), /alice_begin_literary_fantasy/, 'Enter 로 연다');
    assert.deepEqual(a.errors, []);
    assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), [], '낱말 표에 없는 열쇠');
    await a.close();

    /* 7. 자료가 없으면(404·꼴이 틀림·버전이 다름) 줄째 안 그린다 — 화면은 그대로 돈다 */
    for (const [why, body] of [['404', null], ['JSON 아님', 'not json'], ['버전 다름', JSON.stringify({ ...SIM, version: 2 })]]) {
      a = await h.open('dex.html', opt(body === null ? undefined : body)); p = a.page;
      if (body === null) await a.ctx.route(u => new URL(u).pathname === '/data/art-similar.json', r => r.fulfill({ status: 404, body: '' }));
      await p.waitForSelector('.grid > .cell');
      await openBook(p, 'alice');
      await p.waitForFunction(() => performance.getEntriesByType('resource').some(e => e.name.includes('art-similar.json')));
      await p.waitForTimeout(150);
      assert.equal(await p.$$eval('.similar', x => x.length), 0, why + ' — 줄을 숨긴다');
      assert(await p.$('.big img'), why + ' — 상세는 그대로');
      assert.deepEqual(a.errors, [], why);
      await a.close();
    }

    /* 8. 다섯 크기 — 쪽은 가로로 안 넘치고, 줄은 그 안에서만 옆으로, 칸 44px. 휴대폰 가로는 글 쪽 단 밑 */
    for (const vp of [{ width: 344, height: 882 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 690, height: 829 }, { width: 1280, height: 900 }]) {
      const at = vp.width + '×' + vp.height;
      a = await h.open('dex.html?book=alice', opt(SIM, { viewport: vp, mobile: vp.width < 1000 })); p = a.page;
      await p.waitForSelector('.similar-cell');
      assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth), at + ' 쪽이 가로로 넘치지 않는다');
      assert.equal(await p.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight + 1), true, at + ' 쪽 자체는 세로로 안 구른다');
      const s = await p.$eval('.similar-strip', e => ({ sw: e.scrollWidth, cw: e.clientWidth, right: e.getBoundingClientRect().right, ox: getComputedStyle(e).overflowX }));
      assert(s.right <= vp.width + 1 && s.ox === 'auto', at + ' 줄은 화면 안, 옆으로 구른다: ' + JSON.stringify(s));
      if (vp.width < 600) assert(s.sw > s.cw, at + ' 넘치는 칸은 줄 안에서 민다');
      for (const b of await p.locator('.similar-cell').evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; })))
        assert(b[0] >= 44 && b[1] >= 44, at + ' 칸 44px: ' + b);
      const box = await p.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect();
        return { art: r('.artwork-panel'), sim: r('.similar'), story: r('.story-panel') }; });
      if (vp.height < 551) assert(box.sim.left >= box.story.left - 1 && box.sim.top >= box.story.bottom - 1, at + ' 휴대폰 가로 — 글 쪽 단 밑');
      else assert(box.sim.left >= box.art.left - 1 && box.sim.right <= box.art.right + 1 && box.sim.top >= box.art.bottom - 1, at + ' 그림 쪽 단 밑: ' + JSON.stringify(box));
      assert.deepEqual(a.errors, [], at);
      await a.close();
    }
    console.log('PASS 서가 닮은 그림: 상세를 열 때 한 번 받기 · 등록 안 된 그림 빼기 · 보는 그림 따라 바뀜·없는 그림이면 숨김 · 누르면 그 책 그 그림(?book=·다른 화풍)·같은 책은 그 자리 · Enter·focus-visible · 자료 없음·틀림·버전 다름이면 숨김 · 다섯 크기 넘침·44px·자리');
  } finally { await h.stop(); fs.rmSync(art, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exit(1); });
