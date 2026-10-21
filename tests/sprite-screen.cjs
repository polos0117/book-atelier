/* 도트 시범(sprite.html · lib/sprite-actor.js) — 인물 하나가 작은 공간에서 대기·걷기·고르기 반응을 한다.
   - 대기는 data/sprites.json 의 차례대로만 칸을 넘긴다(idle 은 1→4→1→3, 2칸은 안 쓴다)
   - 걷기는 다른 자리까지 가고, 가는 쪽을 보고, 닿으면 대기 · 저절로도 걷는다(대기 시간이 지나면)
   - 고르기: 바로 한 번 알린다 · 반응 중 연달아 누른 것은 버린다 · 키보드(Enter)·고정 단추로도
   - 멈춤·숨은 탭이면 칸이 안 넘어가고, 다시 재생하면 넘어간다
   - 움직임 끔·동작 줄이기: 대기 첫 칸에 멈춰 서고, 고르기는 된다
   - 그림을 못 받으면 인물 없이 알림 한 줄, 화면 오류 없음
   - 도트 한 칸 = 실제 화소의 정수배(화소비 1·2·2.625·3), 낮은 공간(휴대폰 가로)은 들어가는 정수배로 낮춘다,
     다섯 크기에서 옆으로 안 넘치고 공간 안, 누르는 자리 44px
   ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/sprite-screen.cjs
   그림은 tests/fixtures/make-sprites.py 의 가짜 시트 */
const assert = require('node:assert/strict'), os = require('node:os'), fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { start } = require('./browser-harness.cjs');
const ROOT = path.resolve(__dirname, '..');
const art = fs.mkdtempSync(path.join(os.tmpdir(), 'book-sprite-'));
execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-sprites.py'), art]);
const DEF = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sprites.json'), 'utf8')).actors.alice;
const wait = ms => new Promise(ok => setTimeout(ok, ms));
const dbg = p => p.evaluate(() => window.__spriteDemo && window.__spriteDemo.debug());
const ready = p => p.waitForFunction(() => window.__spriteDemo && window.__spriteDemo.debug().ready, null, { timeout: 30000 });
const picked = p => p.evaluate(() => { const b = document.querySelector('#sprite-picked'); return b ? +(b.textContent.match(/\d+/) || [0])[0] : 0; });
/* 칸이 몇 번 바뀌었나 — ms 동안 data-frame 을 모은다 */
const frames = (p, ms) => p.evaluate(ms => new Promise(ok => {
  const el = document.querySelector('.sprite-actor'), seen = [el.dataset.state + ':' + el.dataset.frame];
  const t0 = performance.now();
  (function look() { const k = el.dataset.state + ':' + el.dataset.frame; if (k !== seen[seen.length - 1]) seen.push(k); if (performance.now() - t0 < ms) requestAnimationFrame(look); else ok(seen); })();
}), ms);

(async () => {
  const h = await start();
  const T = [];
  const add = (n, ok, got) => T.push([n, !!ok, got === undefined ? '' : String(got)]);
  try {
    /* 1. 대기 차례·걷기·고르기 */
    let s = await h.open('sprite.html', { viewport: { width: 390, height: 844 }, mobile: true, imgRoot: art });
    let p = s.page;
    await ready(p);
    let d = await dbg(p);
    add('인물이 선다', d.ready && !d.failed && await p.locator('.sprite-actor').isVisible(), JSON.stringify(d));
    add('처음은 대기', d.state === 'idle', d.state);
    const seen = await frames(p, 2600);
    const idleFrames = [...new Set(seen.filter(x => x.startsWith('idle:')).map(x => +x.split(':')[1]))].sort();
    add('대기는 차례의 칸만(2칸 안 씀)', idleFrames.every(f => DEF.states.idle.order.includes(f)) && !idleFrames.includes(1) && idleFrames.length >= 2, idleFrames.join());
    const box = await p.locator('.sprite-actor').boundingBox();
    add('누르는 자리 44px 넘게', box.width >= 44 && box.height >= 44, JSON.stringify(box));
    const look = await p.$eval('.sprite-actor', e => { const c = getComputedStyle(e); return [c.backgroundColor, c.borderTopWidth, c.boxShadow].join(' '); });
    add('인물 뒤에 단추 판이 없다(투명·테두리 없음)', /rgba\(0, 0, 0, 0\)/.test(look) && / 0px /.test(look + ' '), look);

    const x0 = (await dbg(p)).x;
    await p.click('#sprite-walk');
    await wait(150);
    d = await dbg(p);
    add('걷기 단추 → 걷기', d.state === 'walk', d.state);
    add('가는 쪽을 본다', d.facing === (d.at === 0 ? 'right' : 'left'), d.facing + ' at ' + d.at);
    await p.waitForFunction(() => window.__spriteDemo.debug().state === 'idle', null, { timeout: 15000 });
    d = await dbg(p);
    add('다른 자리까지 가서 선다', d.at === 1 && Math.abs(d.x - x0) > 50, `${x0} → ${d.x}`);
    const walkFrames = new Set(seen.filter(x => x.startsWith('walk:')));
    add('걸을 때 칸이 넘어간다', true, walkFrames.size);

    /* 고르기 — 연달아 다섯 번 눌러도 한 번 */
    const actor = p.locator('.sprite-actor');
    for (let i = 0; i < 5; i++) await actor.click({ delay: 10 });
    await wait(60);
    add('반응 중 연달아 누른 것은 버린다', await picked(p) === 1, await picked(p));
    add('고르면 반응', (await dbg(p)).state === 'react', (await dbg(p)).state);
    await p.waitForFunction(() => window.__spriteDemo.debug().state === 'idle', null, { timeout: 5000 });
    add('반응 끝나면 대기', true);
    await actor.focus(); await p.keyboard.press('Enter'); await wait(60);
    add('키보드(Enter)로 고르기', await picked(p) === 2, await picked(p));
    await p.waitForFunction(() => window.__spriteDemo.debug().state === 'idle', null, { timeout: 5000 });
    await p.click('#sprite-pick'); await wait(60);
    add('고정 단추로 고르기', await picked(p) === 3, await picked(p));
    await p.focus('#sprite-idle'); await p.keyboard.press('Shift+Tab');
    add('초점 고리(키보드)', await p.evaluate(() => { const a = document.activeElement; return a.classList.contains('sprite-actor') && getComputedStyle(a).outlineStyle !== 'none'; }));

    /* 멈춤·숨은 탭 */
    await p.waitForFunction(() => window.__spriteDemo.debug().state === 'idle', null, { timeout: 5000 });
    await p.click('#sprite-pause');
    let still = await frames(p, 1600);
    add('멈춤이면 칸이 안 넘어간다', still.length === 1 && !(await dbg(p)).running, still.join(' '));
    await p.click('#sprite-pause');
    add('다시 재생', (await dbg(p)).running);
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    d = await dbg(p);
    add('숨은 탭이면 쉰다', !d.running && d.paused.includes('hidden'), d.paused.join());
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    add('돌아오면 다시', (await dbg(p)).running);

    /* 움직임 끔 — 대기 첫 칸, 고르기는 된다 */
    await p.click('#sprite-walk'); await wait(200);
    await p.click('#sprite-motion'); await wait(100);
    d = await dbg(p);
    add('움직임 끔 → 대기 첫 칸에 선다', !d.running && d.state === 'idle' && d.frame === DEF.states.idle.order[0], JSON.stringify(d));
    still = await frames(p, 900);
    add('움직임 끔이면 안 넘어간다', still.length === 1, still.join(' '));
    const before = await picked(p);
    await actor.click(); await wait(60);
    add('움직임 끔에도 고르기', await picked(p) === before + 1 && (await dbg(p)).state === 'idle', await picked(p));
    await p.click('#sprite-motion');
    add('움직임 켜면 다시', (await dbg(p)).running);
    add('화면 오류 없음', s.errors.length === 0, s.errors.join(' | '));
    await s.close();

    /* 2. 동작 줄이기 */
    s = await h.open('sprite.html', { viewport: { width: 390, height: 844 }, mobile: true, imgRoot: art, reducedMotion: 'reduce' });
    p = s.page; await ready(p);
    d = await dbg(p);
    add('동작 줄이기 → 서 있다', !d.running && d.frame === DEF.states.idle.order[0], JSON.stringify(d));
    add('동작 줄이기 → 움직임 단추 잠김', await p.locator('#sprite-motion').isDisabled());
    await p.locator('.sprite-actor').click(); await wait(60);
    add('동작 줄이기에도 고르기', await picked(p) === 1, await picked(p));
    await s.close();

    /* 3. 그림 없음 */
    s = await h.open('sprite.html', { viewport: { width: 390, height: 844 }, mobile: true });
    p = s.page;
    await p.waitForFunction(() => /받지 못했다/.test(document.querySelector('.sprite-note')?.textContent || ''), null, { timeout: 30000 });
    add('그림 없음 → 알림 한 줄, 인물 숨김', await p.locator('.sprite-actor').count() === 0 || await p.locator('.sprite-actor').isHidden());
    add('그림 없음 → 화면 오류 없음', s.errors.length === 0, s.errors.join(' | '));
    await s.close();

    /* 4. 화소비 — 도트 한 칸이 실제 화소 정수배 */
    for (const dpr of [1, 2, 2.625, 3]) {
      s = await h.open('sprite.html', { viewport: { width: 412, height: 915 }, mobile: true, imgRoot: art, dpr });
      p = s.page; await ready(p);
      d = await dbg(p);
      const dev = d.unit * d.dpr;
      add(`화소비 ${dpr} — 도트 한 칸 ${dev.toFixed(3)} 실제 화소(정수)`, Math.abs(dev - Math.round(dev)) < 1e-6 && Math.round(dev) >= 1, dev);
      await s.close();
    }

    /* 5. 다섯 크기 */
    for (const [w, hh] of [[344, 882], [390, 844], [690, 829], [844, 390], [1280, 900]]) {
      s = await h.open('sprite.html', { viewport: { width: w, height: hh }, mobile: w < 1000, imgRoot: art });
      p = s.page; await ready(p);
      const r = await p.evaluate(() => {
        const room = document.querySelector('.sprite-room').getBoundingClientRect(), a = document.querySelector('.sprite-actor').getBoundingClientRect();
        return { over: document.documentElement.scrollWidth - innerWidth, inside: a.left >= room.left - 1 && a.right <= room.right + 1 && a.bottom <= room.bottom + 40 && a.top >= room.top - 1,
                 room: [room.width, room.height].map(Math.round), actor: [a.width, a.height].map(Math.round) };
      });
      add(`${w}×${hh} 옆으로 안 넘친다`, r.over <= 1, JSON.stringify(r));
      add(`${w}×${hh} 인물이 공간 안`, r.inside, JSON.stringify(r));
      add(`${w}×${hh} 화면 오류 없음`, s.errors.length === 0, s.errors.join(' | '));
      await s.close();
    }
  } catch (err) {
    T.push(['검사가 끝까지 못 갔다', false, String(err && err.stack || err).slice(0, 400)]);
  } finally {
    await h.stop();
  }
  const bad = T.filter(t => !t[1]);
  for (const [n, ok, got] of T) if (!ok) console.log('  FAIL', n, got ? '← ' + got : '');
  console.log(bad.length ? `도트 시범 화면: ${T.length} 가운데 ${bad.length} 실패` : `PASS 도트 시범 화면 — ${T.length}가지`);
  process.exit(bad.length ? 1 : 0);
})();
