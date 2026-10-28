/* 서가의 도트(dex.html · data/sprites.json · lib/sprite-actor.js) — 도트가 있는 책의 목록 칸에 「도트」 표, 상세에 작은 무대 한 줄.
   - 표는 도트 인물의 책(alice)에만 · 상세 도트 줄은 그 책에만, 다른 책에는 없다
   - 줄의 인물이 대기하고, 단추로 걷기·반응, 인물을 눌러도 반응 · 「도트 진열실에서 보기」 는 sprite.html?who=
   - 움직임 끔이면 단추가 잠기고 인물은 선다 · 도트 그림을 못 받으면 줄째 숨고, 자료가 틀리면 표도 줄도 없다(화면 오류 없음)
   - 다섯 크기에서 옆으로 안 넘치고 줄 단추 44px
   ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/dex-dot-screen.cjs */
const os = require('node:os'), fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { start } = require('./browser-harness.cjs');
const art = fs.mkdtempSync(path.join(os.tmpdir(), 'book-dexdot-'));
const img = execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-art.py'), art]).toString();
execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-sprites.py'), art]);
const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'book-dexdot-none-'));
execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-art.py'), bare]);
const wait = ms => new Promise(ok => setTimeout(ok, ms));
const opt = extra => ({ viewport: { width: 390, height: 844 }, mobile: true, imgRoot: art, files: { 'data/img.json': img }, ...extra });
const dbg = p => p.evaluate(() => { const a = document.querySelector('.dex-dot .sprite-actor'); return a && a.sprite ? a.sprite.debug() : null; });
const ready = p => p.waitForFunction(() => { const a = document.querySelector('.dex-dot:not([hidden]) .sprite-actor'); return a && a.sprite && a.sprite.debug().ready; }, null, { timeout: 30000 });

(async () => {
  const h = await start();
  const T = [];
  const add = (n, ok, got) => T.push([n, !!ok, got === undefined ? '' : String(got)]);
  try {
    /* 1. 목록 표 */
    let s = await h.open('dex.html', opt()), p = s.page;
    await p.waitForSelector('.grid > .cell'); await p.waitForSelector('.dot-badge', { timeout: 15000 });
    const badged = await p.$$eval('.grid > .cell', es => [...new Set(es.filter(e => e.querySelector('.dot-badge')).map(e => e.dataset.card))]);
    const WANT = [...new Set(Object.values(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'sprites.json'), 'utf8')).actors).map(x => x.book))].sort();   // 한 책에 인물 둘(alice · alice_4k)이어도 표는 하나
    add('「도트」 표는 도트 인물의 책에만', badged.slice().sort().join() === WANT.join(), badged.join());
    add('표에 풀이', /도트/.test(await p.locator('.dot-badge').first().getAttribute('title')));
    await s.close();

    /* 2. 상세 — alice 에는 줄, 돈키호테에는 없다 */
    s = await h.open('dex.html?book=alice', opt()); p = s.page;
    await ready(p);
    await p.locator('.dex-dot').scrollIntoViewIfNeeded(); await p.waitForFunction(() => document.querySelector('.dex-dot .sprite-actor').sprite.debug().running, null, { timeout: 5000 });   // 화면 밖이면 쉰다
    add('상세에 도트 줄', await p.locator('.dex-dot .sprite-actor').isVisible());
    add('줄의 인물은 대기', (await dbg(p)).state === 'idle', (await dbg(p)).state);
    await p.click('.dex-dot-acts button[data-state="walk"]'); await wait(120);
    add('걷기 단추 → 걷기', (await dbg(p)).state === 'walk', (await dbg(p)).state);
    await p.click('.dex-dot-acts button[data-state="react"]'); await wait(80);
    add('반응 단추 → 반응', (await dbg(p)).state === 'react', (await dbg(p)).state);
    await p.waitForFunction(() => document.querySelector('.dex-dot .sprite-actor').sprite.debug().state !== 'react', null, { timeout: 5000 });
    await p.locator('.dex-dot .sprite-actor').click({ force: true }); await wait(80);
    add('인물을 눌러도 반응', (await dbg(p)).state === 'react', (await dbg(p)).state);
    add('진열실 길', await p.locator('.dex-dot-room').getAttribute('href') === 'sprite.html?who=alice');
    await p.evaluate(() => window.AtelierMotion.setEnabled(false)); await wait(100);
    add('움직임 끔 → 단추 잠김·인물은 선다', await p.locator('.dex-dot-acts button[data-state="walk"]').isDisabled() && !(await dbg(p)).running);
    await p.evaluate(() => window.AtelierMotion.setEnabled(true));
    add('화면 오류 없음', s.errors.length === 0, s.errors.join(' | '));
    await s.close();
    s = await h.open('dex.html?book=don_quixote', opt()); p = s.page;
    await p.waitForSelector('.fstrip'); await wait(1200);
    add('도트 없는 책 → 줄 없음', await p.locator('.dex-dot').count() === 0);
    await s.close();

    /* 3. 도트 그림 없음 — 줄째 숨는다 */
    s = await h.open('dex.html?book=alice', opt({ imgRoot: bare })); p = s.page;
    await p.waitForSelector('.fstrip'); await wait(1500);
    add('도트 그림 없음 → 줄 숨김', await p.locator('.dex-dot').count() === 0 || await p.locator('.dex-dot').isHidden());
    add('도트 그림 없음 → 화면 오류 없음', s.errors.length === 0, s.errors.join(' | '));
    await s.close();
    /* 4. 자료가 틀림 — 표도 줄도 없다 */
    s = await h.open('dex.html?book=alice', opt({ files: { 'data/img.json': img, 'data/sprites.json': 'not json' } })); p = s.page;
    await p.waitForSelector('.fstrip'); await wait(1200);
    add('자료가 틀림 → 줄 없음', await p.locator('.dex-dot').count() === 0);
    add('자료가 틀림 → 화면 오류 없음', s.errors.length === 0, s.errors.join(' | '));
    await s.close();

    /* 5. 다섯 크기 */
    for (const [w, hh] of [[344, 882], [390, 844], [690, 829], [844, 390], [1280, 900]]) {
      s = await h.open('dex.html?book=alice', opt({ viewport: { width: w, height: hh }, mobile: w < 1000 })); p = s.page;
      await ready(p);
      const r = await p.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth,
        small: [...document.querySelectorAll('.dex-dot-acts button, .dex-dot-acts a')].filter(e => e.getBoundingClientRect().height < 44).length,
        inside: (() => { const st = document.querySelector('.dex-dot-stage').getBoundingClientRect(), a = document.querySelector('.dex-dot .sprite-actor').getBoundingClientRect(); return a.left >= st.left - 1 && a.right <= st.right + 1 && a.top >= st.top - 1; })() }));
      add(`${w}×${hh} 옆으로 안 넘친다`, r.over <= 1, JSON.stringify(r));
      add(`${w}×${hh} 줄 단추 44px`, r.small === 0, JSON.stringify(r));
      add(`${w}×${hh} 인물이 무대 안`, r.inside, JSON.stringify(r));
      add(`${w}×${hh} 화면 오류 없음`, s.errors.length === 0, s.errors.join(' | '));
      await s.close();
    }
    /* ── 화소 배율이 정수가 아닌 화면 — 폴드(2.625: 도트 한 칸 3화소 = 1.14배) · 노트북 150%(1.5: 2화소 = 1.33배). 공간이 도트만큼 늘어 머리가 안 잘린다(재생기 grow) ── */
    for (const [dpr, vp, mobile] of [[2.625, { width: 344, height: 882 }, true], [2.625, { width: 690, height: 829 }, true], [1.5, { width: 1280, height: 800 }, false]]) {
      const f = await h.open('dex.html?book=alice', opt({ viewport: vp, mobile, dpr })), q = f.page;
      await ready(q);
      add('서가 상세 무대에서 머리가 안 잘린다 — 배율 ' + dpr + ' · 폭 ' + vp.width, await q.evaluate(([host, sel]) => { const r = document.querySelector(host).getBoundingClientRect(), as = [...document.querySelectorAll(sel)];
        return as.length > 0 && as.every(a => { const u = a.sprite.debug().unit, b = a.getBoundingClientRect(); return b.top - 2 * u >= r.top - 0.5 && b.bottom <= r.bottom + 0.5; }); }, ['.dex-dot-stage', '.dex-dot .sprite-actor']));
      await f.close();
    }
  } catch (err) {
    T.push(['검사가 끝까지 못 갔다', false, String(err && err.stack || err).slice(0, 400)]);
  } finally {
    await h.stop();
  }
  const bad = T.filter(t => !t[1]);
  for (const [n, ok, got] of T) if (!ok || process.env.VERBOSE) console.log(ok ? '  OK  ' : '  FAIL', n, got ? '← ' + got : '');
  console.log(bad.length ? `서가 도트: ${T.length} 가운데 ${bad.length} 실패` : `PASS 서가 도트 — ${T.length}가지`);
  process.exit(bad.length ? 1 : 0);
})();
