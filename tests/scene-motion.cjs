/* 움직임 — lib/scene-motion.js(공방 넷이 그대로 나눠 쓰는 파일)와 서재·서가·결투에 붙인 자리.
   그림은 tests/fixtures/make-art.py 의 가짜 그림(프랑켄슈타인: 폼 셋·개방 둘).
   ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/scene-motion.cjs */
const assert = require('node:assert/strict'), os = require('node:os'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { start, FOLD } = require('./browser-harness.cjs');
const D = require('../lib/duel.js');
const art = fs.mkdtempSync(path.join(os.tmpdir(), 'book-art-'));
const imgjson = execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-art.py'), art]).toString();
const design = JSON.parse(fs.readFileSync('data/book-design.json', 'utf8')), duel = JSON.parse(fs.readFileSync('data/duel.json', 'utf8'));
const VIEWPORTS = [FOLD.cover, { width: 390, height: 844 }, { width: 844, height: 390 }, FOLD.inner, { width: 1280, height: 900 }];
const opt = extra => ({ imgRoot: art, files: { 'data/img.json': imgjson, 'motion-lab.html': LAB }, ...extra });
/* 모듈만 따로 보는 빈 화면 — 검사 때만 있는 주소다 */
const LAB = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<link rel="stylesheet" href="lib/scene-motion.css?v=1"><script src="lib/scene-motion.js?v=1"></script>
<style>body{margin:0;background:#111}#box,#stage{position:relative;width:320px;height:320px;background:#0b0d12}
#stage>div{position:absolute;inset:0}#a{background:#a04030}#b{background:#3060a0}#far{height:3000px}</style></head>
<body><div id="box"></div><div id="stage"><div id="a"></div><div id="b"></div></div><img id="pic" width="200" height="300" alt=""><div id="far"></div></body></html>`;
const noOverflow = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const frameHash = p => p.evaluate(() => { const c = document.querySelector('#box canvas'); return c ? c.toDataURL() : null; });

(async () => {
  /* 0. 같은 파일을 넷이 나눠 쓴다 — 판 머리줄, 책 이름 없음, 바깥에서 받는 것 없음. 설계표의 입자 = 모듈의 종류 */
  const src = fs.readFileSync('lib/scene-motion.js', 'utf8'), css = fs.readFileSync('lib/scene-motion.css', 'utf8');
  assert.match(src.split('\n')[0], /^\/\* scene-motion\.js — version \d+ /, 'js 첫 줄에 판');
  assert.match(css.split('\n')[0], /^\/\* scene-motion\.css — version \d+ /, 'css 첫 줄에 판');
  assert.equal(src.match(/version (\d+)/)[1], css.match(/version (\d+)/)[1], 'js·css 판이 같다');
  assert(!/import |require\(|fetch\(|https?:\/\//.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), '바깥에서 받는 것이 없다');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const w of ['book', 'pokemon', 'gundam', 'myth', 'dracula']) assert(!code.toLowerCase().includes(w), '모듈에 ' + w + ' 가 없다');
  assert(!/\bW\(|localStorage\.getItem\('(?!atelier_motion_v1)/.test(code.replace(/KEY/g, "'atelier_motion_v1'")), '모듈은 낱말 표를 안 부르고 제 열쇠만 쓴다');
  const box = { window: {} }; vm.createContext(box); vm.runInContext(src, box);
  const M0 = box.window.AtelierMotion;
  assert.equal(M0.KEY, 'atelier_motion_v1');
  for (const k of ['petals', 'snow', 'embers', 'ash', 'bats', 'dust', 'sparks', 'bubbles', 'leaves', 'pages', 'stars', 'rain', 'mist', 'gold']) assert(M0.KINDS.includes(k), '종류 ' + k);
  assert.deepEqual([...design.vocab.particles].sort(), [...M0.KINDS].sort(), '설계표 vocab.particles = 모듈 KINDS');
  for (const b of design.books) for (const [s, o] of Object.entries(b.opens)) assert(M0.KINDS.includes(o.particles), b.key + ' ' + s + ' 개방 입자');

  const h = await start();
  try {
    /* 1. 입자 — 캔버스가 생기고, 프레임마다 화소가 바뀌고, 숨으면 멈추고, destroy 로 다 걷힌다 */
    const a = await h.open('motion-lab.html', opt({ viewport: { width: 390, height: 844 } })), p = a.page;
    await p.evaluate(() => { window.pc = AtelierMotion.particles(document.getElementById('box'), 'embers', { seed: 'lab' }); });
    await p.waitForFunction(() => window.pc.frames > 5);
    assert.equal(await p.locator('#box canvas.am-particles').count(), 1, '캔버스 하나');
    assert.equal(await p.evaluate(() => { const c = document.querySelector('#box canvas'); return c.width === Math.round(320 * Math.min(devicePixelRatio, 2)); }), true, '캔버스 크기 = 칸 × 화소비');
    const f1 = await frameHash(p); await p.waitForTimeout(250); const f2 = await frameHash(p);
    assert.notEqual(f1, f2, '프레임 사이 화소가 바뀐다');
    for (const kind of await p.evaluate(() => AtelierMotion.KINDS)) {
      const n = await p.evaluate(k => new Promise(ok => { const c = AtelierMotion.particles(document.getElementById('stage'), k, { seed: k });
        setTimeout(() => { const f = c.frames; c.destroy(); ok(f); }, 200); }), kind);
      assert(n > 3, kind + ' 이 돈다(' + n + ')');
    }
    assert.equal(await p.locator('#stage canvas').count(), 0, '종류마다 destroy 로 걷혔다');
    /* 숨김 — 탭이 숨으면 멈추고 돌아오면 다시 */
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    const hidden0 = await p.evaluate(() => window.pc.frames); await p.waitForTimeout(250);
    assert.equal(await p.evaluate(() => window.pc.running), false, '탭이 숨으면 멈춘다');
    assert(await p.evaluate(() => window.pc.frames) - hidden0 <= 1, '숨은 동안 프레임이 안 돈다');
    await p.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await p.waitForFunction(f => window.pc.frames > f + 3, hidden0);
    /* 화면 밖 — 칸을 아래로 밀어내면(IntersectionObserver) 멈춘다 */
    await p.evaluate(() => { document.getElementById('box').style.marginTop = '4000px'; });
    await p.waitForFunction(() => !window.pc.running);
    const off0 = await p.evaluate(() => window.pc.frames); await p.waitForTimeout(250);
    assert(await p.evaluate(() => window.pc.frames) - off0 <= 1, '화면 밖이면 프레임이 안 돈다');
    await p.evaluate(() => { document.getElementById('box').style.marginTop = '0'; });
    await p.waitForFunction(() => window.pc.running);
    await p.evaluate(() => window.pc.destroy());
    assert.equal(await p.locator('#box canvas').count(), 0, 'destroy — 캔버스가 없다');
    const d0 = await p.evaluate(() => window.pc.frames); await p.waitForTimeout(200);
    assert.equal(await p.evaluate(() => window.pc.frames), d0, 'destroy 뒤 프레임이 안 돈다');
    /* 개수 — 크기에 맞추되 상한이 있다 */
    const counts = await p.evaluate(() => { const s = document.getElementById('stage'); s.style.width = '1600px'; s.style.height = '1600px';
      const big = AtelierMotion.particles(s, 'rain', {}); const n = big.canvas ? 1 : 0; big.destroy(); return n; });
    assert.equal(counts, 1);
    await p.evaluate(() => { const s = document.getElementById('stage'); s.style.width = '320px'; s.style.height = '320px'; });

    /* 2. 켄 번스 — 한 그림에 애니메이션 하나, 같은 씨앗은 같은 방향, 다른 씨앗은 다르다, 12~20초 */
    const kb = await p.evaluate(() => { const el = document.getElementById('pic'), k = s => { const c = AtelierMotion.kenBurns(el, { seed: s }); const a = el.getAnimations(); const r = { n: a.length, frames: JSON.stringify(a[0].effect.getKeyframes().map(f => f.transform)), d: a[0].effect.getTiming().duration }; c.stop(); return r; };
      const x = k('frankenstein_begin'), y = k('frankenstein_begin'), z = k('dracula_end'); return { x, y, z, after: el.getAnimations().length }; });
    assert.equal(kb.x.n, 1, '켄 번스 애니메이션 하나');
    assert.equal(kb.x.frames, kb.y.frames, '같은 씨앗은 같은 움직임');
    assert.notEqual(kb.x.frames, kb.z.frames, '다른 씨앗은 다른 움직임');
    assert(kb.x.d >= 12000 && kb.x.d <= 20000 && kb.z.d >= 12000 && kb.z.d <= 20000, '12~20초: ' + kb.x.d + ' ' + kb.z.d);
    assert(/scale/.test(kb.x.frames) && !/rotate|left|top/.test(kb.x.frames), 'transform 만');
    assert.equal(kb.after, 0, 'stop 하면 걷힌다');

    /* 3. 열리기 — 1초 남짓에 끝나고 새 그림이 다 보인다. 입자가 한 번 터지고, 옛 그림은 걷힌다 */
    const rv = await p.evaluate(async () => { const a = document.getElementById('a'), b = document.getElementById('b'), t = performance.now();
      const run = AtelierMotion.reveal(a, b, { kind: 'petals', removeFrom: true, key: 'lab' });
      await new Promise(r => setTimeout(r, 380));
      const mid = { burst: document.querySelectorAll('#stage .am-burst').length, flash: document.querySelectorAll('#stage .am-flash').length, anim: b.getAnimations().length };
      const r = await run, cs = getComputedStyle(b);
      return { r, ms: performance.now() - t, mid, opacity: cs.opacity, clip: cs.clipPath, transform: cs.transform, fromGone: !a.isConnected, anims: b.getAnimations().length, style: b.getAttribute('style') || '' }; });
    assert.equal(rv.r.cancelled, false);
    assert(rv.ms >= 900 && rv.ms <= 1700, '열리기 900~1200ms(그림 기다림 포함): ' + rv.ms);
    assert(rv.mid.burst === 1 && rv.mid.flash === 1 && rv.mid.anim >= 1, '도중 — 입자 터짐·빛·조리개: ' + JSON.stringify(rv.mid));
    assert(rv.opacity === '1' && rv.clip === 'none' && rv.transform === 'none' && rv.anims === 0, '끝 — 새 그림이 다 보인다: ' + JSON.stringify(rv));
    assert(rv.fromGone, 'removeFrom — 옛 그림이 걷혔다');
    assert(!/clip-path|opacity/.test(rv.style), '안에 남긴 스타일 없음: ' + rv.style);
    await p.waitForFunction(() => !document.querySelector('#stage .am-overlay'), null, { timeout: 4000 });
    /* 끊기 — 같은 열쇠로 새로 부르면 앞의 것은 cancelled 로 끝나고 남는 것이 없다 */
    const cut = await p.evaluate(async () => { const st = document.getElementById('stage'); st.innerHTML = '<div id="a"></div><div id="b"></div><div id="c"></div>';
      const [a, b, c] = ['a', 'b', 'c'].map(id => document.getElementById(id)); c.style.background = '#40a060';
      const first = AtelierMotion.reveal(a, b, { kind: 'snow', key: 'lab' }); await new Promise(r => setTimeout(r, 150));
      const second = AtelierMotion.turn(b, c, { key: 'lab', direction: 'next' }); const r1 = await first, t = performance.now(), r2 = await second;
      return { r1, r2, turnMs: performance.now() - t, bClip: getComputedStyle(b).clipPath, left: st.querySelectorAll('.am-flash,.am-ghost').length, cOpacity: getComputedStyle(c).opacity }; });
    assert.equal(cut.r1.cancelled, true, '앞의 열리기는 끊긴다'); assert.equal(cut.r2.cancelled, false);
    assert.equal(cut.bClip, 'none', '끊긴 그림의 조리개가 풀린다');
    assert(cut.turnMs < 700, '넘기기는 짧다: ' + cut.turnMs); assert.equal(cut.left, 0); assert.equal(cut.cOpacity, '1');
    /* ghost — 나가는 그림의 정지 사본이 새 그림 자리에 꼭 맞게 */
    const gh = await p.evaluate(() => { const b = document.getElementById('b'), g = AtelierMotion.ghost(b, 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', { fit: 'cover' });
      const x = g.getBoundingClientRect(), y = b.getBoundingClientRect(); g.remove(); return [x.left - y.left, x.top - y.top, x.width - y.width, x.height - y.height].every(v => Math.abs(v) < 1); });
    assert(gh, 'ghost 가 새 그림 자리에 맞는다');

    /* 4. 스위치 — atelier_motion_v1 에 on/off, 끄면 켄 번스·떠도는 입자가 걷히고, 새로고침해도 남는다 */
    const sw = await p.evaluate(() => { const box = document.getElementById('box'), el = document.getElementById('pic');
      const pc = AtelierMotion.particles(box, 'snow', {}), k = AtelierMotion.kenBurns(el, { seed: 'x' }); const seen = [];
      AtelierMotion.subscribe(v => seen.push(v));
      AtelierMotion.setEnabled(false);
      const off = { store: localStorage.getItem('atelier_motion_v1'), canvas: box.querySelectorAll('canvas').length, kb: el.getAnimations().length, on: AtelierMotion.enabled() };
      AtelierMotion.setEnabled(true);
      const on = { store: localStorage.getItem('atelier_motion_v1'), canvas: box.querySelectorAll('canvas').length, kb: el.getAnimations().length };
      pc.destroy(); k.stop(); AtelierMotion.setEnabled(false); return { off, on, seen }; });
    assert.deepEqual(sw.off, { store: 'off', canvas: 0, kb: 0, on: false }, '끄면 걷힌다');
    assert.deepEqual(sw.on, { store: 'on', canvas: 1, kb: 1 }, '켜면 되살아난다');
    assert.deepEqual(sw.seen, [false, true, false], '구독자에게 알린다');
    await p.reload(); await p.waitForFunction(() => window.AtelierMotion);
    assert.equal(await p.evaluate(() => AtelierMotion.enabled()), false, '새로고침해도 꺼짐');
    const offRun = await p.evaluate(async () => { const t = performance.now(); await AtelierMotion.reveal(document.getElementById('a'), document.getElementById('b'), { kind: 'gold' }); return performance.now() - t; });
    assert(offRun < 400, '꺼짐이면 열리기는 빠른 사라짐: ' + offRun);
    assert.deepEqual(a.errors, []); await a.close();

    /* 5. 동작 줄이기 — 켄 번스 없음, 떠도는 캔버스 없음, 열리기는 거의 바로, 스위치는 잠김 */
    const r = await h.open('motion-lab.html', opt({ viewport: { width: 390, height: 844 } })), rp = r.page;
    await rp.emulateMedia({ reducedMotion: 'reduce' });
    const red = await rp.evaluate(async () => { const el = document.getElementById('pic'), box = document.getElementById('box');
      AtelierMotion.kenBurns(el, { seed: 'r' }); const pc = AtelierMotion.particles(box, 'embers', {});
      const t = performance.now(); await AtelierMotion.reveal(document.getElementById('a'), document.getElementById('b'), { kind: 'embers', removeFrom: true });
      return { kb: el.getAnimations().length, canvas: box.querySelectorAll('canvas').length, running: pc.running, ms: performance.now() - t, burst: document.querySelectorAll('.am-burst').length, enabled: AtelierMotion.enabled() }; });
    assert.deepEqual({ kb: red.kb, canvas: red.canvas, running: red.running, burst: red.burst, enabled: red.enabled }, { kb: 0, canvas: 0, running: false, burst: 0, enabled: false }, JSON.stringify(red));
    assert(red.ms < 250, '열리기가 거의 바로: ' + red.ms);
    await r.close();

    /* 6. 서재 — 감상 흐름: 그림에 켄 번스, 초상 → 명장면은 열리기(그 장면 입자가 터지고 떠돈다), 다른 장은 넘기기. 스위치는 감상 화면에 */
    const s = await h.open('index.html', opt({ viewport: { width: 390, height: 844 } })), sp = s.page;
    await sp.waitForSelector('.shelf-book[data-key="frankenstein"]');
    await sp.locator('.shelf-book[data-key="frankenstein"]').click();
    await sp.waitForFunction(() => document.querySelector('.reading-book')?.dataset.chapter === 'begin');
    await sp.waitForFunction(() => document.querySelector('.reading-art img')?.getAnimations().length === 1);
    assert.equal(await sp.locator('.reading-art .am-particles').count(), 0, '초상에는 떠도는 입자 없음');
    await sp.locator('.reading-next').click();
    assert.equal(await sp.locator('.reading-ghosts .am-ghost').count(), 1, '넘기기 — 나가는 그림의 사본');
    await sp.waitForFunction(() => !document.querySelector('.am-ghost') && document.querySelector('.reading-book').dataset.chapter === 'middle');
    await sp.locator('.reading-mode').click();
    await sp.waitForSelector('.reading-art .am-burst');
    assert.equal(await sp.locator('.reading-art .am-burst').getAttribute('data-kind'), 'snow', '전개 개방(눈폭풍) — 눈이 터진다');
    assert.equal(await sp.locator('.reading-art img').count(), 1, '그림은 하나(사본은 그림 요소가 아니다)');
    await sp.waitForSelector('.reading-motion-layer .am-particles[data-kind="snow"]');
    await sp.waitForFunction(() => !document.querySelector('.am-ghost') && document.querySelector('.reading-art img').getAnimations().length === 1);
    assert.equal(await sp.locator('.reading-image-page').getAttribute('data-particles'), 'snow');
    assert.match(await sp.locator('.reading-art img').getAttribute('src'), /middle_open/);
    /* 스위치 — 끄면 걷히고, 새로고침해도 꺼짐, 다시 켜면 돌아온다 */
    assert.equal(await sp.locator('.reading-motion').textContent(), '움직임 끄기');
    await sp.locator('.reading-motion').click();
    assert.equal(await sp.locator('.reading-motion').textContent(), '움직임 켜기');
    assert.equal(await sp.locator('.reading-art .am-particles').count(), 0, '끄면 입자가 걷힌다');
    assert.equal(await sp.evaluate(() => document.querySelector('.reading-art img').getAnimations().length), 0, '끄면 켄 번스가 걷힌다');
    await sp.reload(); await sp.waitForSelector('.reading-motion');
    assert.equal(await sp.locator('.reading-motion').textContent(), '움직임 켜기', '새로고침해도 꺼짐');
    assert.equal(await sp.evaluate(() => localStorage.getItem('atelier_motion_v1')), 'off');
    await sp.locator('.reading-motion').click();
    await sp.waitForSelector('.reading-motion-layer .am-particles[data-kind="snow"]');
    /* 감상 흐름은 그대로 — 끝까지, 돌아오면 그 책등에 */
    await sp.locator('.reading-next').click(); await sp.waitForFunction(() => document.querySelector('.reading-book').dataset.chapter === 'end');
    await sp.locator('.reading-next').click(); await sp.waitForSelector('.reading-book[data-finished="true"]');
    await sp.keyboard.press('Escape'); await sp.waitForFunction(() => !document.querySelector('.reading-dialog'));
    assert.equal(await sp.evaluate(() => document.activeElement.dataset.key), 'frankenstein');
    assert.deepEqual(s.errors, []); await s.close();

    /* 7. 서가 상세 — 폼 ↔ 그 폼의 개방은 열리기, 크게 보기는 켄 번스·입자 없음, 스위치 */
    const x = await h.open('dex.html?book=frankenstein', opt({ viewport: { width: 1280, height: 900 } })), xp = x.page;
    await xp.waitForSelector('.big img');
    assert.equal(await xp.locator('#dex-motion').textContent(), '움직임 끄기');
    await xp.click('.fcell[data-form="middle"]'); await xp.waitForTimeout(100);
    assert.equal(await xp.locator('.big .am-ghost').count(), 0, '다른 폼으로는 그대로 바꾼다');
    await xp.click('.fcell[data-form="middle_open"]');
    await xp.waitForSelector('.am-burst[data-kind="snow"]');
    assert.equal(await xp.locator('.big .am-ghost').count(), 1, '폼 → 개방: 열리기');
    await xp.waitForFunction(() => !document.querySelector('.am-ghost') && !document.querySelector('.big .am-flash'));
    await xp.waitForFunction(() => !document.querySelector('.am-burst, .am-overlay'), null, { timeout: 4000 });
    assert.equal(await xp.evaluate(() => getComputedStyle(document.querySelector('.big img')).clipPath), 'none');
    await xp.click('.fcell[data-form="middle"]'); await xp.waitForTimeout(60);
    assert.equal(await xp.locator('.big .am-ghost').count(), 1, '개방 → 폼도 열리기');
    assert.equal(await xp.locator('.am-burst').count(), 0, '폼으로 돌아갈 때는 입자가 안 터진다');
    await xp.waitForFunction(() => !document.querySelector('.am-ghost'));
    await xp.click('.big .zoom'); await xp.waitForSelector('.zoom-layer img');
    await xp.waitForTimeout(300);
    assert.equal(await xp.evaluate(() => document.querySelector('.zoom-layer img').getAnimations().length), 0, '크게 보기 — 켄 번스 없음');
    assert.equal(await xp.locator('.zoom-layer canvas').count(), 0, '크게 보기 — 입자 없음');
    await xp.keyboard.press('Escape');
    await xp.click('#dex-motion'); assert.equal(await xp.locator('#dex-motion').textContent(), '움직임 켜기');
    await xp.click('.fcell[data-form="middle_open"]'); await xp.waitForTimeout(50);
    assert.equal(await xp.locator('.am-burst').count(), 0, '꺼짐 — 입자 없음');
    assert.deepEqual(x.errors, []); await x.close();

    /* 8. 결투 절정 — 그 폼의 초상에서 명장면이 열리고 그 개방의 입자가 터진다 */
    const MINE = ['don_quixote', 'alice', 'frankenstein', 'kosmos', 'hamlet', 'chunhyang'], KEYS = design.books.map(b => b.key);
    const st = D.newMatch({ design, duel }, { me: MINE, foe: KEYS.slice(6, 12) }, 7);
    st.turn = st.first = st.coin = 'me'; st.turnNo = 0; st.me.hand = ['don_quixote']; st.me.deck = []; st.foe.hand = []; st.foe.deck = [];
    st.me.slots[1] = { id: 91, key: 'frankenstein', power: 5, tok: 0, offset: 0, mark: 0, flags: { entered: { 0: true } }, at: 91 };
    const dd = await h.open('duel.html', opt({ viewport: FOLD.cover, mobile: true, store: ['book_duel_v1', JSON.stringify({ deck: MINE, st })] })), dp = dd.page;
    await dp.waitForSelector('.duel-turn[data-turn="me"]');
    await dp.locator('#duel-open').tap();
    await dp.locator('.duel-row[data-side="me"] .duel-target[data-kind="open"][data-slot="1"]').tap();
    await dp.waitForSelector('.duel-scene .am-ghost');
    await dp.waitForSelector('.duel-scene .am-burst[data-kind="sparks"]');
    assert.match(await dp.locator('.duel-scene .pic img').getAttribute('src'), /frankenstein_begin_open/, '절정 — 발단 개방(번개 실험실)');
    await dp.waitForFunction(() => !document.querySelector('.duel-scene .am-ghost'));
    assert.equal(await dp.evaluate(() => getComputedStyle(document.querySelector('.duel-scene .pic img')).clipPath), 'none', '끝나면 명장면이 다 보인다');
    assert.equal(await dp.evaluate(() => document.activeElement.id), 'duel-scene-close', '포커스는 그대로 닫기에');
    await dp.keyboard.press('Escape'); await dp.waitForSelector('.duel-scene', { state: 'detached' });
    assert.deepEqual(dd.errors, []); await dd.close();

    /* 9. 다섯 크기 — 움직임을 켠 채 서재 감상(열리기)·서가 상세(열리기)·결투에서 가로 넘침·화면 오류 없음 */
    for (const viewport of VIEWPORTS) {
      const v = await h.open('index.html', opt({ viewport })), vp = v.page;
      await vp.waitForSelector('.shelf-book[data-key="frankenstein"]');
      await vp.locator('.shelf-book[data-key="frankenstein"]').click();
      await vp.waitForSelector('.reading-art img'); await vp.locator('.reading-next').click();
      await vp.locator('.reading-mode').click(); await vp.waitForSelector('.reading-art .am-burst');
      assert(await noOverflow(vp), 'reading overflow ' + JSON.stringify(viewport));
      await vp.waitForSelector('.reading-motion-layer .am-particles');
      const layer = await vp.evaluate(() => { const c = document.querySelector('.reading-motion-layer canvas').getBoundingClientRect(), a = document.querySelector('.reading-art').getBoundingClientRect();
        return c.width > 50 && c.height > 50 && c.left >= a.left - 1 && c.right <= a.right + 1 && c.top >= a.top - 1 && c.bottom <= a.bottom + 1; });
      assert(layer, '입자는 그림 칸 안 ' + JSON.stringify(viewport));
      assert(await noOverflow(vp), 'reading overflow after ' + JSON.stringify(viewport));
      for (const sel of ['.reading-controls', '.reading-next']) { const b = await vp.locator(sel).boundingBox(); assert(b.x >= 0 && b.y >= 0 && b.x + b.width <= viewport.width + 1 && b.y + b.height <= viewport.height + 1, sel + ' ' + JSON.stringify(viewport)); }
      assert.deepEqual(v.errors, [], 'index ' + JSON.stringify(viewport)); await v.close();
      const g = await h.open('dex.html?book=frankenstein', opt({ viewport })), gp = g.page;
      await gp.waitForSelector('.big img'); await gp.click('.fcell[data-form="begin_open"]'); await gp.waitForTimeout(400);
      assert(await noOverflow(gp), 'dex overflow ' + JSON.stringify(viewport));
      const tap = await gp.locator('#dex-motion').boundingBox(); assert(tap && tap.height >= 40, '#dex-motion 누르는 자리');
      assert.deepEqual(g.errors, [], 'dex ' + JSON.stringify(viewport)); await g.close();
      const u = await h.open('duel.html', opt({ viewport, store: ['book_duel_v1', JSON.stringify({ deck: MINE, st })] })), up = u.page;
      await up.waitForSelector('.duel-turn[data-turn="me"]'); await up.locator('#duel-open').click();
      await up.locator('.duel-row[data-side="me"] .duel-target[data-kind="open"][data-slot="1"]').click();
      await up.waitForSelector('.duel-scene .am-burst'); assert(await noOverflow(up), 'duel overflow ' + JSON.stringify(viewport));
      assert.deepEqual(u.errors, [], 'duel ' + JSON.stringify(viewport)); await u.close();
    }
    console.log('PASS 움직임: 같은 파일(판·바깥 없음)·설계표 입자 = 종류 ' + M0.KINDS.length + ' · 입자(화소 변화·숨김·화면 밖·destroy·종류마다) · 켄 번스(씨앗·12~20초) · 열리기·끊기·넘기기·ghost · 스위치(저장·구독·새로고침) · 동작 줄이기 · 서재 감상·서가 상세·크게 보기·결투 절정 · 다섯 크기 넘침·오류 없음');
  } finally { await h.stop(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
