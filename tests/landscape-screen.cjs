/* 휴대폰 가로 — 서재·서가(목록·책 보기)·프롬프트의 첫 화면에 핵심이 보이는가(lib/landscape.css).
   세로·폴드·PC 는 다른 검사가 본다. 결투는 tests/duel-screen.cjs.
   ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/landscape-screen.cjs */
const assert = require('node:assert/strict'), os = require('node:os'), fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { start } = require('./browser-harness.cjs');
const art = fs.mkdtempSync(path.join(os.tmpdir(), 'book-art-'));
const imgjson = execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-art.py'), art]).toString();
const SIZES = [{ width: 844, height: 390 }, { width: 915, height: 412 }, { width: 740, height: 360 }];
const box = (p, sel) => p.locator(sel).first().boundingBox();
const wide = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
(async () => {
  const h = await start();
  try {
    for (const vp of SIZES) {
      const at = vp.width + '×' + vp.height, opt = { viewport: vp, mobile: true, imgRoot: art, files: { 'data/img.json': imgjson } };

      /* 서가 목록 — 안내문은 접히고, 장르 띠와 검색 조건이 한 줄, 첫 화면에 책 칸이 보인다 */
      let a = await h.open('dex.html', opt), p = a.page;
      await p.waitForSelector('.grid > .cell');
      assert.equal(await p.locator('.gallery-intro').isVisible(), false, at + ' 서가 안내문은 접힌다');
      const genre = await box(p, '.genre-strip'), filt = await box(p, '.dex-filters summary');
      assert(Math.abs(genre.y + genre.height / 2 - (filt.y + filt.height / 2)) < 12, at + ' 장르 띠와 검색 조건이 한 줄');
      const cell = await box(p, '.grid > .cell .face');
      assert(cell.y + cell.height * 0.4 < vp.height, at + ' 첫 화면에 책 그림이 반쯤은 보인다: ' + Math.round(cell.y));
      assert(await wide(p), at + ' 서가 목록이 가로로 넘치지 않는다');
      /* 검색 조건을 펼치면 한 줄을 다 쓴다 */
      await p.click('.dex-filters summary');
      const grid = await box(p, '.dex-filter-grid');
      assert(grid.width > vp.width * 0.8, at + ' 펼친 검색 조건은 줄 전체');
      await p.click('.dex-filters summary');

      /* 책 보기 — 큰 그림이 화면 안에 다 든다(아래가 잘리지 않는다), 글은 그 옆 */
      await p.click('.grid > .cell[data-card="don_quixote"]');
      await p.waitForSelector('.big');
      const big = await box(p, '.big'), story = await box(p, '.story-panel');
      assert(big.y + big.height <= vp.height + 1, at + ' 큰 그림이 화면 안에: ' + Math.round(big.y + big.height));
      assert(big.height >= vp.height * 0.45, at + ' 큰 그림이 너무 작지 않다: ' + Math.round(big.height));
      assert(story.x >= big.x + big.width, at + ' 글은 그림 오른쪽');
      assert(await wide(p), at + ' 책 보기가 가로로 넘치지 않는다');
      assert.deepEqual(a.errors, []);
      await a.close();

      /* 프롬프트 — 결과가 오른쪽 단에, 첫 화면에 보인다. 설정을 내려도 결과는 붙어 있다 */
      a = await h.open('prompt.html', opt); p = a.page;
      await p.waitForSelector('#prompt-output');
      let out = await box(p, '#prompt-output');
      assert(out.x > vp.width * 0.45, at + ' 결과는 오른쪽 단');
      assert(out.y < vp.height - 60, at + ' 첫 화면에 결과가 보인다: ' + Math.round(out.y));
      assert(out.y + out.height <= vp.height + 1 || out.height > 120, at + ' 결과 칸이 쓸 만한 높이');
      await p.locator('.prompt-page .wrap').evaluate(e => { e.scrollTop = e.scrollHeight / 2; });
      await p.waitForTimeout(100);
      out = await box(p, '#prompt-output');
      assert(out.y >= 0 && out.y < vp.height - 60, at + ' 설정을 내려도 결과가 화면에 붙어 있다: ' + Math.round(out.y));
      assert(await wide(p), at + ' 프롬프트가 가로로 넘치지 않는다');
      assert.deepEqual(a.errors, []);
      await a.close();

      /* 서재 — 진열대가 화면 높이 안에, 글 띠와 진열 그림이 겹치지 않게 왼쪽 */
      a = await h.open('index.html', opt); p = a.page;
      await p.waitForSelector('.hall-copy h2');
      const hall = await box(p, '.hall'), copy = await box(p, '.hall-copy');
      assert(hall.y + hall.height <= vp.height + 2, at + ' 진열대가 첫 화면 안에');
      assert(copy.width < vp.width * 0.5 && copy.x < vp.width * 0.1, at + ' 글은 왼쪽 띠');
      const t = await box(p, '.hall-copy h2');
      assert(t.height < 64, at + ' 제목이 두 줄을 넘지 않는다');
      assert(await wide(p), at + ' 서재가 가로로 넘치지 않는다');
      assert.deepEqual(a.errors, []);
      await a.close();
    }
    /* 세로는 그대로 — 서가 안내문이 보이고 프롬프트는 한 단 */
    const a = await h.open('dex.html', { viewport: { width: 390, height: 844 }, mobile: true, imgRoot: art, files: { 'data/img.json': imgjson } });
    await a.page.waitForSelector('.grid > .cell');
    assert.equal(await a.page.locator('.gallery-intro').isVisible(), true, '세로 서가는 안내문 그대로');
    await a.close();
    console.log('PASS 가로 화면: ' + SIZES.map(s => s.width + '×' + s.height).join('·') + ' · 서가 목록 첫 화면 책 칸·한 줄 거르기 · 책 보기 그림 높이 · 프롬프트 결과 오른쪽 붙임 · 서재 진열대 · 세로는 그대로');
  } finally { await h.stop(); fs.rmSync(art, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exit(1); });
