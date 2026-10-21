/* 서재 바닥의 도트 인물(index.html · lib/bookshelf.js · lib/sprite-actor.js) — docs/ATELIER_PIXEL_ART_PLAN.md P4.
   - 도트 그림이 오면 책장 밑에 바닥 한 줄이 생기고 인물이 선다 · 못 받으면 바닥째 없다(책장은 그대로, 화면 오류 없음)
   - 인물을 누르면 그 인물의 책(alice)이 펼쳐진다 · 연달아 눌러도 한 번(기록 한 칸)
   - 펼친 동안 인물은 쉰다(reading) · 닫으면 같은 인물이 그 자리에서 다시 돌고, 초점은 인물로
   - 키보드(Enter)로도 · 동작 줄이기·움직임 끔에도 펼친다(인물은 서 있다)
   - 여럿: 인물마다 제 구역(겹치지 않게), 그림 없는 인물만 빠진다, 누르면 그 인물의 책, 펼친 동안 모두 쉰다
   - 다섯 크기·테마 셋에서 옆으로 안 넘치고 인물이 바닥 안, 누르는 자리 44px
   ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/shelf-sprite-screen.cjs
   그림은 tests/fixtures/make-art.py(책)·make-sprites.py(도트)가 한 임시 자리에 만든다 */
const os = require('node:os'), fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { start } = require('./browser-harness.cjs');
const art = fs.mkdtempSync(path.join(os.tmpdir(), 'book-floor-'));
const img = execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-art.py'), art]).toString();
execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-sprites.py'), art]);
const noSprites = fs.mkdtempSync(path.join(os.tmpdir(), 'book-floor-none-'));
execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-art.py'), noSprites]);
const wait = ms => new Promise(ok => setTimeout(ok, ms));
const dbg = p => p.evaluate(() => { const a = document.querySelector('.shelf-floor .sprite-actor'); return a && a.sprite && a.sprite.debug(); });
const ready = p => p.waitForFunction(() => { const a = document.querySelector('.shelf-floor:not([hidden]) .sprite-actor'); return a && a.sprite && a.sprite.debug().ready; }, null, { timeout: 30000 });
const frames = (p, ms) => p.evaluate(ms => new Promise(ok => {
  const el = document.querySelector('.shelf-floor .sprite-actor'), seen = [el.dataset.state + ':' + el.dataset.frame], t0 = performance.now();
  (function look() { const k = el.dataset.state + ':' + el.dataset.frame; if (k !== seen[seen.length - 1]) seen.push(k); if (performance.now() - t0 < ms) requestAnimationFrame(look); else ok(seen); })();
}), ms);
const opt = (extra) => ({ viewport: { width: 390, height: 844 }, mobile: true, imgRoot: art, files: { 'data/img.json': img }, ...extra });

(async () => {
  const h = await start();
  const T = [];
  const add = (n, ok, got) => T.push([n, !!ok, got === undefined ? '' : String(got)]);
  try {
    /* 1. 서고 — 서고, 누르면 펼치기, 펼친 동안 쉼, 닫으면 다시 */
    let s = await h.open('index.html', opt()), p = s.page;
    await p.waitForSelector('.shelf-book'); await ready(p);
    add('책장 밑에 바닥이 생기고 인물이 선다', await p.locator('.shelf-floor .sprite-actor').isVisible());
    add('바닥은 책장 바로 밑', await p.evaluate(() => { const c = document.querySelector('.bookcase').getBoundingClientRect(), f = document.querySelector('.shelf-floor').getBoundingClientRect(); return Math.abs(f.top - c.bottom) < 4; }));
    add('바닥이 서면 진열실 길', await p.locator('.bookshelf-dots').getAttribute('href') === 'sprite.html');
    add('인물 이름에 책 제목', /앨리스/.test(await p.locator('.shelf-floor .sprite-actor').getAttribute('aria-label')), await p.locator('.shelf-floor .sprite-actor').getAttribute('aria-label'));
    const len0 = await p.evaluate(() => history.length);
    await p.evaluate(() => { document.querySelector('.shelf-floor .sprite-actor').dataset.mark = 'first'; });
    const actor = p.locator('.shelf-floor .sprite-actor');
    for (let i = 0; i < 4; i++) await actor.click({ delay: 5, force: true });
    await p.waitForSelector('.reading-dialog[open]');
    add('누르면 그 인물의 책이 펼쳐진다', await p.evaluate(() => new URLSearchParams(location.search).get('open')) === 'alice', await p.evaluate(() => location.search));
    add('연달아 눌러도 기록은 한 칸', await p.evaluate(() => history.length) - len0 === 1, await p.evaluate(() => history.length) - len0);
    add('펼친 책은 하나', await p.locator('.reading-dialog[open]').count() === 1);
    await wait(300);
    let d = await dbg(p);
    add('펼친 동안 인물은 쉰다', !d.running && d.paused.includes('reading'), JSON.stringify(d));
    const still = await frames(p, 1200);
    add('펼친 동안 칸이 안 넘어간다', still.length === 1, still.join(' '));
    const at = d.x;
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.querySelector('.reading-dialog[open]'), null, { timeout: 5000 });
    await wait(450);
    d = await dbg(p);
    add('닫으면 다시 돈다', d.running && !d.paused.includes('reading'), JSON.stringify(d));
    add('같은 인물(새로 만들지 않는다)', await p.evaluate(() => document.querySelectorAll('.shelf-floor .sprite-actor').length === 1 && document.querySelector('.shelf-floor .sprite-actor').dataset.mark === 'first'));
    add('그 자리에서', Math.abs(d.x - at) < 40, `${at} → ${d.x}`);
    add('초점은 인물로', await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('sprite-actor')));
    add('닫으면 주소에서 open 이 빠진다', await p.evaluate(() => !new URLSearchParams(location.search).get('open')));
    /* 키보드 */
    await p.waitForFunction(() => document.querySelector('.shelf-floor .sprite-actor').sprite.debug().state !== 'react', null, { timeout: 5000 });
    await actor.focus(); await p.keyboard.press('Enter');
    await p.waitForSelector('.reading-dialog[open]');
    add('키보드(Enter)로도 펼친다', true);
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.querySelector('.reading-dialog[open]'), null, { timeout: 5000 });
    /* 움직임 끔 */
    await p.evaluate(() => window.AtelierMotion.setEnabled(false)); await wait(100);
    d = await dbg(p);
    add('움직임 끔 → 인물은 서 있다', !d.running && d.state === 'idle', JSON.stringify(d));
    await wait(400);
    await actor.click({ force: true });
    await p.waitForSelector('.reading-dialog[open]');
    add('움직임 끔에도 누르면 펼친다', true);
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.querySelector('.reading-dialog[open]'), null, { timeout: 5000 });
    await p.evaluate(() => window.AtelierMotion.setEnabled(true));
    add('화면 오류 없음', s.errors.length === 0, s.errors.join(' | '));
    await s.close();

    /* 2. 동작 줄이기 */
    s = await h.open('index.html', opt({ reducedMotion: 'reduce' })); p = s.page;
    await p.waitForSelector('.shelf-book'); await ready(p);
    d = await dbg(p);
    add('동작 줄이기 → 인물은 서 있다', !d.running, JSON.stringify(d));
    await p.locator('.shelf-floor .sprite-actor').click();
    await p.waitForSelector('.reading-dialog[open]');
    add('동작 줄이기에도 펼친다', true);
    await s.close();

    /* 3. 도트 그림 없음 — 바닥째 없다 */
    s = await h.open('index.html', opt({ imgRoot: noSprites })); p = s.page;
    await p.waitForSelector('.shelf-book'); await wait(1500);
    add('도트 없음 → 바닥이 안 보인다', await p.locator('.shelf-floor').isHidden());
    add('도트 없음 → 진열실 길도 없다', await p.locator('.bookshelf-dots').count() === 0);
    add('도트 없음 → 책장은 그대로', await p.locator('.shelf-book').count() > 0);
    add('도트 없음 → 화면 오류 없음', s.errors.length === 0, s.errors.join(' | '));
    await s.close();

    /* 4. 여럿 — 인물마다 제 구역(겹치지 않게), 못 받은 인물만 빠진다, 누르면 그 인물의 책, 펼친 동안 모두 쉰다 */
    const SPR = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'sprites.json'), 'utf8'));
    const two = JSON.parse(JSON.stringify(SPR));
    two.actors.sunzi = { ...JSON.parse(JSON.stringify(SPR.actors.alice)), book: 'sunzi' };
    two.actors.chunhyang = { ...JSON.parse(JSON.stringify(SPR.actors.alice)), book: 'chunhyang' };
    for (const st of Object.values(two.actors.chunhyang.states)) st.file = 'missing/' + st.file;   // 이 인물만 그림이 없다
    s = await h.open('index.html', opt({ viewport: { width: 1280, height: 900 }, mobile: false, files: { 'data/img.json': img, 'data/sprites.json': two } })); p = s.page;
    await p.waitForSelector('.shelf-book'); await ready(p); await wait(1200);
    const who = await p.evaluate(() => [...document.querySelectorAll('.shelf-floor .sprite-actor')].filter(e => !e.hidden).map(e => e.dataset.who));
    add('여럿 — 받은 인물만 선다(그림 없는 인물은 빠진다)', who.join() === 'alice,sunzi', who.join());
    const zones = await p.evaluate(() => [...document.querySelectorAll('.shelf-floor .sprite-actor')].filter(e => !e.hidden).map(e => e.getBoundingClientRect()).map(r => [r.left, r.right]));
    add('여럿 — 서로 겹치지 않는다', zones.length === 2 && zones[0][1] <= zones[1][0] + 1, JSON.stringify(zones));
    await p.locator('.shelf-floor .sprite-actor[data-who="sunzi"]').click({ force: true });
    await p.waitForSelector('.reading-dialog[open]');
    add('여럿 — 누르면 그 인물의 책', await p.evaluate(() => new URLSearchParams(location.search).get('open')) === 'sunzi', await p.evaluate(() => location.search));
    await wait(300);
    add('여럿 — 펼친 동안 모두 쉰다', await p.evaluate(() => [...document.querySelectorAll('.shelf-floor .sprite-actor')].filter(e => !e.hidden).every(e => e.sprite.debug().paused.includes('reading'))));
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.querySelector('.reading-dialog[open]'), null, { timeout: 5000 }); await wait(450);
    add('여럿 — 닫으면 모두 다시', await p.evaluate(() => [...document.querySelectorAll('.shelf-floor .sprite-actor')].filter(e => !e.hidden).every(e => e.sprite.debug().running)));
    add('여럿 — 화면 오류 없음', s.errors.length === 0, s.errors.join(' | '));
    await s.close();

    /* 5. 다섯 크기 · 테마 셋 */
    for (const [w, hh] of [[344, 882], [390, 844], [690, 829], [844, 390], [1280, 900]]) {
      for (const theme of ['sunlit', 'moonlit', 'hanok']) {
        s = await h.open('index.html', opt({ viewport: { width: w, height: hh }, mobile: w < 1000, init: [t => { try { localStorage.setItem('book_room_v1', t); } catch (e) {} }, theme] }));
        p = s.page; await p.waitForSelector('.shelf-book'); await ready(p);
        const r = await p.evaluate(() => {
          const f = document.querySelector('.shelf-floor').getBoundingClientRect(), a = document.querySelector('.shelf-floor .sprite-actor').getBoundingClientRect();
          return { over: document.body.scrollWidth - innerWidth, inside: a.left >= f.left - 1 && a.right <= f.right + 1 && a.top >= f.top - 1 && a.bottom <= f.bottom + 8, w: a.width, h: a.height };
        });
        add(`${w}×${hh} ${theme} 옆으로 안 넘친다`, r.over <= 1, JSON.stringify(r));
        add(`${w}×${hh} ${theme} 인물이 바닥 안`, r.inside, JSON.stringify(r));
        add(`${w}×${hh} ${theme} 누르는 자리 44px`, r.w >= 44 && r.h >= 44, JSON.stringify(r));
        add(`${w}×${hh} ${theme} 화면 오류 없음`, s.errors.length === 0, s.errors.join(' | '));
        await s.close();
      }
    }
  } catch (err) {
    T.push(['검사가 끝까지 못 갔다', false, String(err && err.stack || err).slice(0, 400)]);
  } finally {
    await h.stop();
  }
  const bad = T.filter(t => !t[1]);
  for (const [n, ok, got] of T) if (!ok) console.log('  FAIL', n, got ? '← ' + got : '');
  console.log(bad.length ? `서재 바닥 도트: ${T.length} 가운데 ${bad.length} 실패` : `PASS 서재 바닥 도트 — ${T.length}가지`);
  process.exit(bad.length ? 1 : 0);
})();
