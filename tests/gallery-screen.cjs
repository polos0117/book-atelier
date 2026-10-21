/* Gallery regressions. Uses deterministic delayed images; visual review uses real artwork. */
const assert = require('node:assert/strict');
const { start } = require('./browser-harness.cjs');
const svg = (wide = false) => '<svg xmlns="http://www.w3.org/2000/svg" width="' + (wide ? 1200 : 800) + '" height="' + (wide ? 800 : 1200) + '"><rect width="100%" height="100%" fill="#735a48"/></svg>';
(async () => {
  const h = await start();
  try {
    for (const width of [344, 390, 690, 1440]) {
      const a = await h.open('dex.html', { viewport: { width, height: width === 1440 ? 1000 : 844 }, mobile: width < 720 });
      const p = a.page;
      try {
        let release, waiting = new Promise(r => { release = r; });
        await a.ctx.route(u => u.hostname === 'polos0117.github.io', async r => {
          await waiting;
          if (r.request().url().includes('/thumb/')) return r.fulfill({ status: 404, body: '' });
          return r.fulfill({ contentType: 'image/svg+xml', body: svg(r.request().url().includes('casual')) });
        });
        await p.reload({ waitUntil: 'domcontentloaded' });
        await p.locator('.grid>.cell').first().waitFor();
        assert.equal(await p.locator('.dex-filters').evaluate(e => e.open), false);
        const before = await p.locator('.grid>.cell').first().boundingBox();
        release();
        await p.waitForFunction(() => { const i = document.querySelector('.grid img'); return i.complete && i.naturalWidth > 0; });
        const after = await p.locator('.grid>.cell').first().boundingBox();
        assert.deepEqual(after, before, 'image loading must not move card geometry');
        /* 최근 추가 줄이 있으면 그 줄이 첫 그림이다 — 책 칸은 그 밑에서 첫 화면 안에 시작한다 */
        const recent = await p.locator('.recent-shelf').count() ? await p.locator('.recent-shelf').boundingBox() : null;
        assert((recent || after).y < 600, 'artwork is visible on entry');
        assert(after.y < (width === 1440 ? 1000 : 844) - 120, 'first card starts on the first screen: ' + Math.round(after.y));
        assert(await p.evaluate(() => document.body.scrollWidth <= innerWidth), 'no horizontal page overflow');
        await p.locator('.genre-strip button').nth(1).click();
        assert.equal(await p.locator('.genre-strip button').nth(1).getAttribute('aria-pressed'), 'true');
        assert.equal(await p.locator('#dex-genre').inputValue(), await p.locator('.genre-strip button').nth(1).textContent());
        await p.locator('#dex-reset').click();
        await p.locator('input[type="search"]').fill('코스모스');
        assert.equal(await p.locator('.grid>.cell').count(), 1);
        await p.locator('.grid>.cell').first().click();
        await p.locator('.big img').evaluate(i => i.decode());
        assert.equal(await p.evaluate(() => document.activeElement.id), 'detail-title');
        assert.equal(await p.locator('.fcell').count(), 6);
        const big = await p.locator('.big').boundingBox();
        assert(big.y >= 0 && big.y + big.height <= (width === 1440 ? 1000 : 844), 'full hero fits first viewport');
        assert.equal(await p.locator('.big img').evaluate(i => getComputedStyle(i).objectFit), 'contain');
        await p.locator('.big .zoom').click();
        assert.equal(await p.evaluate(() => document.activeElement.className), 'zoom-close');
        assert(await p.locator('.workspace-header').evaluate(e => e.inert), 'background is inert');
        for (let i = 0; i < 10; i++) {
          await p.keyboard.press('Tab');
          assert(await p.evaluate(() => !!document.activeElement.closest('.zoom-layer')), 'focus remains in viewer');
        }
        await p.keyboard.press('Shift+Tab');
        assert(await p.evaluate(() => !!document.activeElement.closest('.zoom-layer')));
        await p.keyboard.press('ArrowRight');
        assert((await p.locator('.zoom-bar>span').innerText()).startsWith('2 / '));
        await p.locator('.viewer-frame').click();
        assert.equal(await p.locator('.zoom-body>.bframe').count(), 0);
        const image = await p.locator('.zoom-body>img').boundingBox(), body = await p.locator('.zoom-body').boundingBox();
        assert(image.width <= body.width && image.height <= body.height, 'unframed artwork fits viewer');
        /* 원본 크기 — 새 창을 열지 않고 이 안에서 제 픽셀 크기로. 홈 화면 앱에서는 새 창이 같은 앱 창에 떠서 돌아올 길이 없었다 */
        const pages = p.context().pages().length;
        await p.locator('.zoom-open').click();
        assert.equal(await p.locator('.zoom-body.actual').count(), 1, '원본 크기로 펼친다');
        assert.equal(p.context().pages().length, pages, '새 창을 열지 않는다');
        assert(await p.locator('.zoom-body.actual img').evaluate(i => Math.round(i.getBoundingClientRect().width) === i.naturalWidth), '제 픽셀 크기');
        await p.locator('.zoom-open').click();
        assert.equal(await p.locator('.zoom-body.actual').count(), 0, '다시 누르면 화면에 맞춘다');
        await p.keyboard.press('Escape');
        assert.equal(await p.locator('.zoom-layer').count(), 0);
        assert.equal(await p.evaluate(() => document.activeElement.className), 'zoom');
        assert.equal(await p.locator('.workspace-header').evaluate(e => e.inert), false);
        await p.locator('.back').click();
        await p.locator('.grid>.cell').waitFor();
        assert.equal(await p.evaluate(() => document.activeElement.dataset.card), 'kosmos');
        assert.equal(await p.locator('input[type="search"]').inputValue(), '코스모스');
        if (width === 1440) {
          await p.locator('#dex-reset').click();
          await p.locator('.grid>.cell').first().click();
          await p.locator('.big .zoom').click();
          const total = Number((await p.locator('.zoom-bar>span').innerText()).split('/')[1]);
          for (let n = 2; n <= total; n++) {
            await p.keyboard.press('ArrowRight');
            await p.waitForFunction(n => document.querySelector('.zoom-bar>span').textContent.trim().startsWith(n + ' /'), n);
          }
          await p.keyboard.press('ArrowRight');
          await p.waitForFunction(() => document.querySelector('.zoom-bar b').textContent.includes('돈키호테'));
          assert(await p.locator('.workspace-header').evaluate(e => e.inert));
          await p.keyboard.press('Escape');
          assert.equal(await p.evaluate(() => document.activeElement.className), 'zoom', 'focus returns after crossing into another book');
        }
        assert.deepEqual(a.errors, []);
        console.log('PASS gallery ' + width + ': delayed images, filters, detail, containment, keyboard, focus return');
      } finally { await a.close(); }
    }
  } finally { await h.stop(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
