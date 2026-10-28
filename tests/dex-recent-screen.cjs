/* 서가 최근 추가·새 표 — 목록 맨 위 "최근 추가" 줄(7일 안·새 날짜부터·24장), 누르면 그 책 상세를 그 그림으로(?book=),
   지난번에 들른 뒤 들어온 그림의 "새" 표(처음 온 사람은 없음·보는 동안 그대로·떠날 때 적는다), "새 그림만" 거르기,
   다섯 크기에서 가로 넘침 없음·줄 안에서만 옆으로·44px·focus-visible.
   ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/dex-recent-screen.cjs
   그림은 tests/fixtures/make-art.py 의 가짜 그림, 날짜(added)는 여기서 오늘 기준으로 갈아 끼운다 */
const assert = require('node:assert/strict'), os = require('node:os'), fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { start, FOLD } = require('./browser-harness.cjs');
const BOOKS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'book-design.json'), 'utf8')).books.length;
const art = fs.mkdtempSync(path.join(os.tmpdir(), 'book-art-'));
const base = JSON.parse(execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-art.py'), art]).toString());
const S = 'literary_fantasy';
/* 브라우저와 같은 기계 시계의 오늘에서 n 날 앞(지역 날짜) */
const day = n => { const d = new Date(); d.setDate(d.getDate() - n); return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((x, i) => String(x).padStart(i ? 2 : 4, '0')).join('-'); };
const F = {
  extra: `alice_${S}_f_extra1.webp`, casual: `don_quixote_${S}_f_casual2.webp`,
  frank: `frankenstein_begin_${S}_f.webp`, trial: 'don_quixote_middle_style_trial_f.webp', kosmos: `kosmos_begin_${S}_f.webp`,
};
const doc = added => JSON.stringify(Object.assign({}, base, { added }));
const DATED = { [F.extra]: day(0), [F.casual]: day(1), [F.frank]: day(3), [F.trial]: day(6), [F.kosmos]: day(7),
                'not_registered_f.webp': day(0) };   // 등록 안 된 이름은 날짜가 있어도 안 뜬다
const SEEN = 'book_dex_seen_v1';
const opt = (added, extra) => ({ viewport: FOLD.cover, mobile: true, imgRoot: art, files: { 'data/img.json': doc(added) }, ...extra });
const strip = p => p.$$eval('.recent-cell', es => es.map(e => e.dataset.file));
const badges = p => p.$$eval('.grid > .cell .new-badge', es => es.map(e => e.closest('.cell').dataset.card));
const title = p => p.$eval('.bar h2', e => e.firstChild.textContent.trim());
const bigSrc = p => p.$eval('.big img', e => e.getAttribute('src'));
const wide = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth);
(async () => {
  const h = await start();
  try {
    /* 1. 처음 온 사람 — 줄은 있고 "새" 표는 없다 */
    let a = await h.open('dex.html', opt(DATED)), p = a.page;
    await p.waitForSelector('.recent-cell');
    assert.deepEqual(await strip(p), [F.extra, F.casual, F.frank, F.trial], '7일 안 · 새 날짜부터 · 7일째는 빠진다 · 등록 안 된 이름은 없다');
    assert.equal(await p.$eval('.recent-head', e => e.textContent), await p.evaluate(() => W('dex.recent.title') + W('dex.recent.note', { days: 7, n: 4 })));
    assert.equal(await p.$$eval('.new-badge', x => x.length), 0, '처음 오면 새 표가 없다');
    assert.deepEqual(await p.$$eval('#dex-art option', es => es.map(e => e.value)), ['', 'has', 'none', 'left'], '새 그림이 없으면 "새 그림만" 도 없다');
    assert.match(await p.$eval('.recent-cell', e => e.getAttribute('aria-label')), /이상한 나라의 앨리스 · 특별컷 1 · \d+월 \d+일 등록$/, '칸 이름 — 책 · 그림 · 등록한 날');
    for (const b of await p.locator('.recent-cell').evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; })))
      assert(b[0] >= 44 && b[1] >= 44, '최근 추가 칸 44px: ' + b);
    /* 누르면 그 책 상세를 그 그림으로 — 주소는 ?book= */
    await p.click(`.recent-cell[data-file="${F.extra}"]`);
    await p.waitForSelector('.fstrip');
    assert.equal(await title(p), '이상한 나라의 앨리스');
    assert.equal(await p.evaluate(() => new URLSearchParams(location.search).get('book')), 'alice', '?book= 로 연다');
    assert.match(await bigSrc(p), /alice_literary_fantasy_f_extra1/, '누른 그림이 큰 그림');
    /* 목록으로 — 누른 칸으로 초점이 돌아온다 */
    await p.click('.back');
    await p.waitForSelector('.recent-cell');
    assert.equal(await p.evaluate(() => document.activeElement.dataset.file), F.extra, '돌아오면 누른 최근 추가 칸');
    /* 다른 화풍 그림 — 그 화풍으로 열린다 · 뒤로 가기는 목록 */
    await p.click(`.recent-cell[data-file="${F.trial}"]`);
    await p.waitForSelector('.fstrip');
    assert.match(await bigSrc(p), /don_quixote_middle_style_trial/, '다른 화풍 그림도 그 그림으로');
    assert.equal(await p.$eval('.style-cell.on', e => e.dataset.style), 'style_trial');
    await p.goBack(); await p.waitForSelector('.recent-cell');
    /* 떠나면 들른 표를 적는다 — 이번 자료의 가장 늦은 날과 그날의 그림 */
    await p.goto(h.base + '/index.html'); await p.waitForSelector('.shelf-book, .bookshelf-head');
    const mark = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), SEEN);
    assert.equal(mark.upTo, day(0)); assert(mark.seen.includes(F.extra) && !mark.seen.includes(F.casual), '그날의 그림: ' + mark.seen);
    assert(Math.abs(mark.at - Date.now()) < 60000, '들른 때');
    /* 같은 들름 안에서 돌아오면 기준이 그대로 — 처음 온 들름이라 여전히 새 표 없음 */
    await p.goto(h.base + '/dex.html'); await p.waitForSelector('.recent-cell');
    assert.equal(await p.$$eval('.new-badge', x => x.length), 0, '같은 들름에서는 기준이 안 바뀐다');
    assert.deepEqual(a.errors, []);
    assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), [], '낱말 표에 없는 열쇠');
    await a.close();

    /* 2. 다시 온 사람 — 지난번(그저께까지 본 자료) 뒤에 들어온 그림만 "새" */
    a = await h.open('dex.html', opt(DATED, { store: [SEEN, JSON.stringify({ at: 1, upTo: day(2), seen: [] })] })); p = a.page;
    await p.waitForSelector('.recent-cell');
    assert.deepEqual((await badges(p)).sort(), ['alice', 'don_quixote'], '대표 그림 목록 — 새 그림이 든 책');
    assert.deepEqual(await p.$$eval('.recent-cell', es => es.filter(e => e.querySelector('.new-badge')).map(e => e.dataset.file)), [F.extra, F.casual], '최근 추가 칸에도 새 표');
    assert.match(await p.$eval('.recent-cell', e => e.getAttribute('aria-label')), /지난번에 들른 뒤/, '새 표는 칸 이름에도');
    /* 새 그림만 — 거르기의 작업 현황에 생긴다. 그 그림이 대표로 선다 */
    await p.locator('.dex-filters summary').click();
    assert((await p.$$eval('#dex-art option', es => es.map(e => e.value))).includes('new'));
    await p.selectOption('#dex-art', 'new');
    assert.deepEqual(await p.$$eval('.grid > .cell', es => es.map(e => e.dataset.card + ':' + e.dataset.cut)), ['don_quixote:casual', 'alice:extra'], '새 그림만');
    assert.match(await p.$eval('#dex-reset', e => e.textContent), /1/);
    /* 컷을 고른 목록이면 그 그림이 새것일 때만 */
    await p.selectOption('#dex-art', '');
    await p.selectOption('#dex-cut', 'all');
    assert.deepEqual(await p.$$eval('.grid > .cell .new-badge', es => es.map(e => e.closest('.cell').dataset.cut)).then(x => x.sort()), ['casual', 'extra'], '전체 컷 — 새 그림 칸만');
    await p.click('#dex-reset');
    /* 보는 동안(새로고침해도) 새 표가 그대로 */
    await p.reload(); await p.waitForSelector('.recent-cell');
    assert.deepEqual((await badges(p)).sort(), ['alice', 'don_quixote'], '새로고침해도 이번 들름의 새 표');
    /* 키보드 — 최근 추가 칸에 초점이 보이고 Enter 로 연다 */
    await p.keyboard.press('Tab');
    await p.locator('.recent-cell').first().focus();
    assert(await p.$eval('.recent-cell', e => e.matches(':focus-visible') && getComputedStyle(e).outlineStyle !== 'none'), 'focus-visible');
    await p.keyboard.press('Enter');
    await p.waitForSelector('.fstrip');
    assert.equal(await title(p), '이상한 나라의 앨리스', 'Enter 로 연다');
    await p.click('.back'); await p.waitForSelector('.recent-cell');
    await p.goto(h.base + '/index.html'); await p.waitForSelector('.shelf-book, .bookshelf-head');
    const after = await p.evaluate(k => localStorage.getItem(k), SEEN);
    assert.deepEqual(a.errors, []);
    await a.close();
    /* 떠날 때 적은 표로 다음에 오면 — 본 것은 더 새것이 아니다. 저장해 둔 "새 그림만" 도 풀린다 */
    a = await h.open('dex.html', opt(DATED, { store: [SEEN, after] })); p = a.page;
    await p.waitForSelector('.recent-cell');
    assert.equal(await p.$$eval('.new-badge', x => x.length), 0, '다음 들름 — 본 것은 새것이 아니다');
    await a.close();
    a = await h.open('dex.html', opt(DATED, { store: ['book_dex_filters_v1', JSON.stringify({ art: 'new' })] })); p = a.page;
    await p.waitForSelector('.grid > .cell');
    assert.equal(await p.$$eval('.grid > .cell', x => x.length), BOOKS, '새 그림이 없으면 "새 그림만" 은 풀린다 — 설계표의 책 모두');
    await a.close();

    /* 3. 7일 안에 든 것이 없거나 날짜가 아예 없으면 줄째 숨는다 */
    for (const [why, added] of [['7일 밖뿐', { [F.extra]: day(9), [F.kosmos]: day(30) }], ['날짜 없음', undefined]]) {
      a = await h.open('dex.html', opt(added)); p = a.page;
      await p.waitForSelector('.grid > .cell');
      assert.equal(await p.$$eval('.recent-shelf', x => x.length), 0, why + ' — 줄을 숨긴다');
      assert.deepEqual(a.errors, []);
      await a.close();
    }

    /* 4. 다섯 크기 — 줄은 그 안에서만 옆으로, 쪽은 가로로 안 넘치고, 책 칸은 첫 화면에 */
    const ALL = {}; for (const f of Object.keys(DATED).slice(0, 5)) ALL[f] = day(0);
    for (const e of Object.values(base.img).flatMap(x => Object.values(x.byStyle || {}))) for (const f of JSON.stringify(e).match(/[\w]+\.webp/g)) ALL[f] = day(0);
    for (const vp of [{ width: 344, height: 882 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 690, height: 829 }, { width: 1280, height: 900 }]) {
      const at = vp.width + '×' + vp.height;
      a = await h.open('dex.html', opt(ALL, { viewport: vp, mobile: vp.width < 1000 })); p = a.page;
      await p.waitForSelector('.recent-cell');
      assert.equal((await strip(p)).length, Object.keys(ALL).length, at + ' 등록한 날이 오늘인 그림 다');
      assert(await wide(p), at + ' 쪽이 가로로 넘치지 않는다');
      const s = await p.$eval('.recent-strip', e => ({ sw: e.scrollWidth, cw: e.clientWidth, right: e.getBoundingClientRect().right, ox: getComputedStyle(e).overflowX }));
      assert(s.right <= vp.width + 1 && s.ox === 'auto', at + ' 줄은 화면 안, 옆으로 구른다: ' + JSON.stringify(s));
      if (vp.width < 1000) assert(s.sw > s.cw, at + ' 넘치는 칸은 줄 안에서 민다');
      const cell = await p.locator('.recent-cell').first().boundingBox();
      assert(cell.width >= 44 && cell.height >= 44, at + ' 칸 44px');
      const g = await p.locator('.grid > .cell').first().boundingBox();
      assert(g.y < vp.height - 60, at + ' 책 칸이 첫 화면에 보인다: ' + Math.round(g.y));
      /* 굴림 자리는 하나 — 목록(.collection-scroll)만 세로로 구른다 */
      assert.equal(await p.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight + 1), true, at + ' 쪽 자체는 세로로 안 구른다');
      assert.deepEqual(a.errors, []);
      await a.close();
    }

    /* 5. 자료 셈 — 24장까지 · 같은 날 본 그림은 새것이 아니다 */
    a = await h.open('dex.html', opt(DATED)); p = a.page;
    await p.waitForSelector('.grid > .cell');
    const unit = await p.evaluate(() => {
      const F = window.AtelierDexFilter, files = Array.from({ length: 30 }, (_, i) => 'b_' + i + '.webp');
      const st = { cards: [{ key: 'b' }], defs: {}, img: { b: { byStyle: { s: { casual: { f: files } } } } } };
      const added = {}; files.forEach((f, i) => { added[f] = '2026-10-' + String(10 + (i % 5)).padStart(2, '0'); });
      const r = F.recent(st, added, '2026-10-14');
      return { n: r.length, first: r[0].added, last: r[r.length - 1].added, sorted: r.every((x, i) => !i || r[i - 1].added >= x.added),
        fresh: [...F.freshSince({ a: '2026-10-14', b: '2026-10-14', c: '2026-10-13', d: '2026-10-15' }, { upTo: '2026-10-14', seen: ['a'] })].sort(),
        none: F.freshSince({ a: '2026-10-14' }, null).size, mark: F.visitMark({ a: '2026-10-13', b: '2026-10-14' }),
        edge: F.dayBefore('2026-03-01', 1) };
    });
    assert.deepEqual(unit, { n: 24, first: '2026-10-14', last: '2026-10-11', sorted: true, fresh: ['b', 'd'], none: 0,
      mark: { upTo: '2026-10-14', seen: ['b'] }, edge: '2026-02-28' });
    await a.close();
    console.log('PASS 서가 최근 추가·새 표: 7일 안·새 날짜부터·24장 · 누르면 그 책 그 그림(?book=·다른 화풍)·돌아오면 그 칸 · 처음 온 사람 새 표 없음 · 지난번 뒤 새 그림만 새 표(대표·전체 컷) · 새로고침해도 그대로 · 떠날 때 적기 · 새 그림만 거르기 · 줄 숨기기 · 다섯 크기 넘침·44px·focus-visible');
  } finally { await h.stop(); fs.rmSync(art, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exit(1); });
