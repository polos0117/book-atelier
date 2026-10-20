/* 서가 — 목록·거르기·상세(나란히 보기·화풍 비교·큰 그림 넘기기·크게 보기)·책 넘기기·뒤로 가기·진열·바로가기.
   ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/dex-screen.cjs
   그림은 tests/fixtures/make-art.py 가 임시 자리에 만든 가짜 그림이다 — 실제 등록기로 짠 img.json 을 준다 */
const assert = require('node:assert/strict'), os = require('node:os'), fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { start, FOLD } = require('./browser-harness.cjs');
const art = fs.mkdtempSync(path.join(os.tmpdir(), 'book-art-'));
const imgjson = execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-art.py'), art]).toString();
const design = JSON.parse(fs.readFileSync('data/book-design.json', 'utf8'));
const opt = extra => ({ viewport: FOLD.cover, mobile: true, imgRoot: art, files: { 'data/img.json': imgjson }, ...extra });
const cells = p => p.$$eval('.grid > .cell', es => es.map(e => e.dataset.card));
const title = p => p.$eval('.bar h2', e => e.firstChild.textContent.trim());
const count = p => p.$eval('.big-count', e => e.textContent.trim()).catch(() => '');
(async () => {
  const h = await start();
  try {
    const a = await h.open('dex.html', opt()), p = a.page;
    await p.waitForSelector('.grid > .cell');
    /* 1. 목록 — 설계표의 책 다, 그림 없는 책(춘향전·새 책)도 이름표로. 가짜 그림이 있는 책은 make-art.py 가 정한다 */
    const ART = ['don_quixote', 'alice', 'frankenstein', 'kosmos'], keys = design.books.map(b => b.key);
    const none = keys.filter(k => !ART.includes(k)).sort();
    assert.deepEqual((await cells(p)).sort(), design.books.map(b => b.key).sort(), '설계표의 책이 다 선다');
    assert.equal(await p.$$eval('.grid > .cell[data-card="chunhyang"] img', x => x.length), 0, '그림 없는 책은 이름표');
    /* 작업 현황 — 그림 없음 · 빈 자리 있음 */
    await p.locator('.dex-filters summary').click();
    await p.selectOption('#dex-art', 'none');
    assert.deepEqual((await cells(p)).sort(), none, '그림 없음');
    await p.selectOption('#dex-art', 'left');
    assert.deepEqual((await cells(p)).sort(), [...none, 'frankenstein', 'kosmos'].sort(), '빈 자리 있음 — 여섯 칸이 덜 찬 책');
    assert.match(await p.$eval('#dex-reset', e => e.textContent), /1/, '초기화 단추가 켠 조건 수를 보인다');
    await p.click('#dex-reset');
    /* 컷 거르기 — 개방만 */
    if (!await p.locator('.dex-filters').evaluate(e => e.open)) await p.locator('.dex-filters summary').click();
    await p.selectOption('#dex-cut', 'open');
    const opens = await p.$$eval('.grid > .cell', es => es.map(e => e.dataset.form));
    assert(opens.length === 8 && opens.every(f => f.endsWith('_open')), '개방만: ' + opens.join(','));
    await p.click('#dex-reset');
    await p.fill('input[type="search"]', '세르반테스');
    assert.deepEqual(await cells(p), ['don_quixote'], '저자로 찾는다');
    await p.click('#dex-reset');

    /* 2. 상세 — 나란히 보기 여섯 칸(위 폼 · 아래 개방), 시범 표시, 화풍 비교 띠 */
    const len0 = await p.evaluate(() => history.length);
    await p.click('.grid > .cell[data-card="don_quixote"]');
    await p.waitForSelector('.fstrip');
    assert.equal(await title(p), '돈키호테');
    assert.equal(await p.evaluate(() => history.length), len0 + 1, '상세를 열면 기록이 한 칸');
    assert.deepEqual(await p.$$eval('.fcell', es => es.map(e => e.dataset.form)), ['begin', 'middle', 'end', 'begin_open', 'middle_open', 'end_open']);
    assert.deepEqual(await p.$$eval('.fcell .pilot', es => es.map(e => e.closest('.fcell').dataset.form)), ['middle', 'middle_open'], '시범 자리 — 전개 폼·전개 개방');
    assert.equal(await p.$$eval('.style-cell', x => x.length), 2, '화풍 비교 띠 — 화풍 둘');
    assert((await p.$eval('.stage.on', e => e.dataset.stage)) === 'begin', '세 폼 칸에 지금 폼 표시');
    /* 큰 그림 — 방향키로 그 책의 그림을 차례로, 끝을 넘으면 다음 책 */
    const total = Number((await count(p)).split('/')[1]);
    assert.equal(total, 9, '돈키호테 그림 수 — 폼·개방 여섯 · 연출 하나 · 일상 둘(기본 화풍): ' + await count(p));
    await p.keyboard.press('ArrowRight');
    assert.equal(await count(p), '2 / ' + total);
    assert.match(await p.$eval('.big img', e => e.getAttribute('src')), /don_quixote_middle_literary/, '두 번째는 전개 폼');
    await p.click('.fcell[data-form="end_open"]');
    assert.match(await p.$eval('.note', e => e.textContent), /라만차 평원/, '개방이면 명장면 글');
    /* 사람처럼 한 번씩 — 한 칸 넘어간 것을 보고 다음을 누른다 */
    for (let i = 7; i <= total; i++) { await p.keyboard.press('ArrowRight'); await p.waitForFunction(n => (document.querySelector('.big-count') || {}).textContent === n + ' / ' + 9, i); }
    await p.keyboard.press('ArrowRight');
    await p.waitForFunction(() => document.querySelector('.bar h2').firstChild.textContent.trim() !== '돈키호테');
    const second = await title(p);
    assert.notEqual(second, '돈키호테', '끝을 넘으면 다음 책');
    assert.equal(await p.evaluate(() => history.length), len0 + 1, '책을 넘겨도 기록은 한 칸');
    await p.keyboard.press('ArrowLeft');
    await p.waitForFunction(() => document.querySelector('.bar h2').firstChild.textContent.trim() === '돈키호테');
    assert.equal(await count(p), total + ' / ' + total, '앞 책으로 돌아가면 마지막 그림');
    /* 책 틀 — 그림은 틀 없이, 서가가 그 책의 장정을 두른다. 틀도 안쪽 그림 칸도 2:3 */
    assert.equal(await p.$eval('.big .bframe', e => e.dataset.binding), 'hardcover', '돈키호테는 양장 틀');
    for (const sel of ['.big .bframe', '.big .bframe-page']) assert(Math.abs(await p.$eval(sel, e => { const r = e.getBoundingClientRect(); return r.width / r.height; }) - 2 / 3) < 0.02, sel + ' 는 2:3');
    await p.click('#dex-frame');
    assert.equal(await p.$('.big .bframe'), null, '틀 끄기');
    assert.equal(await p.evaluate(() => localStorage.getItem('book_frame_v1')), '0', '끈 것이 남는다');
    await p.click('#dex-frame');
    assert(await p.$('.big .bframe'), '틀 다시 켜기');
    assert.equal(await p.evaluate(() => window.AtelierFrame.of({ binding: 'hanji', silhouette: { palette: 'rose_jade' } }).kind), 'hanji');
    assert.equal(await p.evaluate(() => window.AtelierFrame.of({ binding: 'bamboo' }).kind), 'bamboo');
    for (const k of await p.evaluate(() => window.AtelierFrame.KINDS)) assert(await p.evaluate(k => window.W('dex.frame.' + k) !== 'dex.frame.' + k, k), k + ' 틀 단추 말');
    assert.deepEqual(await p.evaluate(() => window.AtelierFrame.KINDS), design.vocab.binding, '틀 종류 = 설계표 장정');
    /* 크게 보기 — 열고 넘기고 Esc */
    await p.click('.big button.zoom');
    await p.waitForSelector('.zoom-layer');
    assert(Math.abs(await p.$eval('.zoom-layer .bframe', e => { const r = e.getBoundingClientRect(); return r.width / r.height; }) - 2 / 3) < 0.02, '크게 보기에도 2:3 틀');
    await p.keyboard.press('ArrowLeft');
    assert.match(await p.$eval('.zoom-bar span', e => e.textContent), new RegExp('^' + (total - 1) + ' / '));
    await p.keyboard.press('Escape');
    assert.equal(await p.$('.zoom-layer'), null, 'Esc 로 닫힌다');
    /* 진열 — 이 서고(테마)에 올리면 목록 칸에 금테 */
    await p.click('#dex-hall');
    assert.equal(await p.$eval('#dex-hall', e => e.getAttribute('aria-pressed')), 'true');
    /* 뒤로 가기 — 목록으로 */
    await p.goBack();
    await p.waitForSelector('.grid > .cell');
    assert(/dex\.html/.test(p.url()), '뒤로 가기는 서가 목록에 머문다');
    assert.equal(await p.$$eval('.grid > .cell.hall-on', es => es.map(e => e.dataset.card).join()), 'don_quixote', '진열한 책에 금테');
    /* 서재 책장 — 진열한 책 한 권을 꺼내 펼친다 */
    await p.goto(h.base + '/index.html');
    await p.waitForSelector('.shelf-book');
    assert.deepEqual(await p.$$eval('.shelf-book', es => es.map(e => e.dataset.key)), ['don_quixote'], '서재 진열대에 진열한 책');
    await p.click('.shelf-book');
    await p.waitForSelector('.reading-dialog[open]');
    await p.click('.reading-mode');
    assert.match(await p.$eval('.reading-art img', e => e.getAttribute('src')), /_open_/, '개방 보기 — 명장면으로');
    assert.deepEqual(a.errors, []);
    assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), [], '낱말 표에 없는 열쇠');
    await a.close();

    /* 3. 바로가기 — dex.html?book= 가 그 책의 상세로, 생성기로 가는 길 */
    const b = await h.open('dex.html?book=alice', opt({ viewport: FOLD.inner }));
    await b.page.waitForSelector('.fstrip');
    assert.equal(await title(b.page), '이상한 나라의 앨리스');
    assert.equal(await b.page.$eval('#dex-to-prompt', e => e.getAttribute('href')), 'prompt.html?book=alice');
    assert(await b.page.evaluate(() => document.body.scrollWidth <= innerWidth), '펼친 화면에서 가로로 넘치지 않는다');
    assert.deepEqual(b.errors, []);
    await b.close();
    console.log(`PASS 서가: 목록 ${design.books.length}권 · 그림 없음·빈 자리·개방·저자 거르기 · 여섯 칸·시범·화풍 비교 · 넘기기·책 넘기기·크게 보기 · 책 틀(양장·한지·죽간) · 뒤로 가기 · 진열·서재 진열대 · 바로가기`);
  } finally { await h.stop(); fs.rmSync(art, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exit(1); });
