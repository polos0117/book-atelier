/* 서고 탐험 화면 — 고르기(책 셋) → 지도(길이 닿는 방만) → 독서대·장면·쉼·싸움(한 장)·전리품 → 계단 → 다음 층 · 새로고침해도 이어진다 · 나오기 ·
   끝(갇힘·완주 — 오늘 기록·전적) · 오늘의 서고(?daily) · 네 크기에서 넘치지 않고 누르는 자리 44px.
   지도는 ?seed= 로 고정해 node 에서 같은 wasm 으로 짠 것과 맞춘다.
   Run: ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/run-screen.cjs */
const assert = require('node:assert/strict'), os = require('node:os'), fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { start, FOLD } = require('./browser-harness.cjs');
const D = require('../lib/duel.js'), R = require('../lib/run.js'), S = require('../lib/shelf-gen.js');
const art = fs.mkdtempSync(path.join(os.tmpdir(), 'book-art-'));
const imgjson = execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-art.py'), art]).toString();
const J = n => JSON.parse(fs.readFileSync('data/' + n + '.json', 'utf8'));
const data = { design: J('book-design'), duel: J('duel'), run: J('run') }, KEYS = R.keysOf(data);
const STORE = 'book_run_v1', SEED = 77, seed = [SEED >>> 0, (SEED ^ 0x9e3779b9) >>> 0];
const opt = extra => ({ viewport: FOLD.cover, mobile: true, imgRoot: art, files: { 'data/img.json': imgjson }, ...extra });
const tappable = async (p, sel) => { for (const b of await p.locator(sel).all()) { if (!await b.isVisible()) continue; const r = await b.boundingBox(); assert(r && r.height >= 44 && r.width >= 40, sel + ' 누르는 자리 44px: ' + JSON.stringify(r)); } };
const noOverflow = async p => assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '가로 넘침');
const saved = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), STORE);
const MINE = ['don_quixote', 'alice', 'frankenstein'];
(async () => {
  await S.load(fs.readFileSync('lib/shelf-gen.wasm'));
  const plan = S.plan(seed[0], seed[1], KEYS.length);
  const h = await start();
  try {
    /* 1. 고르기 — 책 셋이 돼야 들어간다 */
    const a = await h.open('run.html?seed=' + SEED, opt()), p = a.page;
    await p.waitForSelector('.run-screen[data-screen="pick"]');
    assert.equal(await p.locator('.deck-cell').count(), KEYS.length, '책 모두');
    assert(await p.locator('#run-start').isDisabled() && await p.locator('#run-daily').isDisabled(), '빈 손으론 못 들어간다');
    assert.match(await p.locator('.deck-rec .note').textContent(), /아직/, '전적 없음');
    for (const k of MINE.concat('hamlet')) await p.locator('.deck-cell[data-key="' + k + '"]').tap();
    assert.equal(await p.locator('.deck-cell.in').count(), 3, '셋까지만');
    await tappable(p, '.deck-cell, #run-start, #run-daily'); await noOverflow(p);
    await p.waitForFunction(() => window.AtelierShelf && window.AtelierShelf.loaded());
    await p.locator('#run-start').tap(); await p.waitForSelector('.run-screen[data-screen="map"]');
    /* 2. 지도 — 1층, 들어온 자리, 길이 닿는 방만 단추 */
    const s0 = await saved(p);
    assert(s0.st && s0.st.floor === 0 && s0.st.room === 0 && s0.st.lamps === 3 && s0.st.deck.join() === MINE.join(), '탐험 시작 — 저장');
    assert.deepEqual(s0.st.plan.floors.map(f => f.rooms.length), plan.floors.map(f => f.rooms.length), '지도는 node 의 wasm 과 같은 것(씨앗 고정)');
    assert.match(await p.locator('.run-bar b').textContent(), /^1층/, '1층');
    assert.equal(await p.locator('.run-bar .lamps i.on').count(), 3, '등불 셋');
    assert.equal(await p.locator('.run-room[data-state="here"]').getAttribute('data-id'), '0', '들어온 자리에 서 있다');
    const next0 = S.nextOf(plan.floors[0], 0);
    assert.deepEqual((await p.locator('.run-next .btn[data-id]').evaluateAll(es => es.map(e => +e.dataset.id))).sort(), next0.slice().sort(), '길이 닿는 방 단추');
    assert.equal(await p.locator('.run-room[data-state="next"]').count(), next0.length, '지도에서도 그 방들만 빛난다');
    assert.equal(await p.locator('.run-deck .book').count(), 3, '덱 띠 셋');
    await tappable(p, '.run-next .btn'); await noOverflow(p);
    /* 3. 1층을 끝까지 — 방마다 상자·싸움을 처리하며 계단까지. 싸움은 넘기기만(결과는 어느 쪽이든 띠가 뜬다) */
    let fights = 0, offers = 0, scenes = 0;
    for (let g = 0; g < 40; g++) {
      if (await p.locator('#run-descend').count()) break;
      if (await p.locator('.run-fight-result').count()) { fights++; assert(/이겼다|졌다|비겼다|마지막/.test(await p.locator('.run-fight-result').textContent()), '결과 띠'); await p.locator('#run-continue').tap(); await p.waitForSelector('.run-fight-result', { state: 'detached' }); continue; }
      if (await p.locator('.run-screen[data-screen="fight"]').count()) { await p.waitForSelector('#duel-pass:not([disabled]), .run-fight-result', { timeout: 20000 }); if (await p.locator('#duel-pass:not([disabled])').count()) await p.locator('#duel-pass').tap(); await p.waitForTimeout(80); continue; }
      if (await p.locator('.run-offer').count()) {
        const phase = await p.locator('.run-offer').getAttribute('data-phase');
        if (phase === 'scene') { scenes++; await p.locator('#run-scene-rest').tap(); }
        else { offers++; const cells = p.locator('.run-offer .books .deck-cell'); if (await cells.count()) await cells.first().tap(); else await p.locator('#run-offer-skip').tap(); }
        await p.waitForSelector('.run-offer', { state: 'detached' }); continue;
      }
      if (await p.locator('.run-screen[data-screen="over"]').count()) break;
      const btns = p.locator('.run-next .btn[data-id]'); assert(await btns.count() > 0, '갈 방이 있다');
      const order = ['read', 'rest', 'scene', 'meet'];
      let picked = false;
      for (const k of order) { const b = p.locator('.run-next .btn[data-kind="' + k + '"]'); if (await b.count()) { await b.first().tap(); picked = true; break; } }
      if (!picked) await btns.first().tap();
      await p.waitForTimeout(120);
    }
    const s1 = await saved(p);
    if (s1.st.phase === 'over') { assert(fights >= 1 && s1.st.lamps === 0, '등불이 다 꺼져 갇혔다'); console.log('  (1층에서 세 번 져 갇혔다 — 드문 일, 나머지는 심은 판으로 본다)'); }
    else {
      assert(fights >= 1, '계단 앞은 층지기라 적어도 한 번 싸웠다: ' + fights);
      assert(await p.locator('#run-descend').count() === 1 && R.roomOf(s1.st).kind === 'stairs', '계단에 서 있다');
      assert(s1.st.stats.fights === fights && s1.st.deck.length >= 3 && s1.st.deck.length <= 6 && new Set(s1.st.deck).size === s1.st.deck.length, '전적·덱이 저장과 맞다');
      await p.locator('#run-descend').tap(); await p.waitForFunction(() => /^2층/.test(document.querySelector('.run-bar b').textContent));
      assert.equal((await saved(p)).st.floor, 1, '2층으로');
      /* 새로고침해도 그대로 */
      await p.reload(); await p.waitForSelector('.run-screen[data-screen="map"]');
      assert.match(await p.locator('.run-bar b').textContent(), /^2층/, '새로고침해도 2층');
      /* 나오기 — 묻고(대화상자 수락) 지운다 → 고르기, 이어가기 단추 없음 */
      p.once('dialog', d => d.accept());
      await p.locator('#run-leave').tap(); await p.waitForSelector('.run-screen[data-screen="pick"]');
      assert.equal(await p.locator('#run-resume').count(), 0, '나오면 하던 탐험이 없다'); assert.equal((await saved(p)).st, null, '저장도 비운다');
    }
    assert.deepEqual(a.errors, [], '화면 오류 없음'); assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), [], '낱말 표에 없는 열쇠');
    await a.close();
    /* 4. 심은 판 — 끝까지 자동으로 간 탐험을 심어 끝 화면·오늘 기록·전적을 본다 */
    const done = R.autoPlay(data, R.newRun(data, plan, MINE), 'greedy');
    const b = await h.open('run.html', opt({ store: [STORE, JSON.stringify({ st: done, picks: MINE })] })), q = b.page;
    await q.waitForSelector('.run-screen[data-screen="' + done.phase + '"]');
    assert.match(await q.locator('.run-end h2').textContent(), done.phase === 'clear' ? /완주/ : /갇혔다/, '끝 화면');
    assert.equal(await q.locator('.run-end .run-deck .book').count(), done.deck.length, '함께 간 책');
    await q.waitForFunction(k => (JSON.parse(localStorage.getItem(k)).st || {}).recorded, STORE);
    const today = await q.evaluate(() => JSON.parse(localStorage.getItem('atelier_today_v1:book'))), rec = await q.evaluate(() => JSON.parse(localStorage.getItem('book_run_rec_v1')));
    assert(today.n === 1 && today.w === (done.phase === 'clear' ? 1 : 0), '오늘 기록 한 칸: ' + JSON.stringify(today));
    assert(rec.runs === 1 && rec.clears === (done.phase === 'clear' ? 1 : 0) && rec.best === (done.phase === 'clear' ? 9 : done.floor + 1), '탐험 전적: ' + JSON.stringify(rec));
    await q.reload(); await q.waitForSelector('.run-end'); assert.equal((await q.evaluate(() => JSON.parse(localStorage.getItem('atelier_today_v1:book')))).n, 1, '새로고침해도 한 번만');
    await q.locator('#run-again').tap(); await q.waitForSelector('.run-screen[data-screen="pick"]');
    assert.match(await q.locator('.deck-rec .note').textContent(), /탐험 1번/, '고르기 화면에 전적');
    assert.deepEqual(b.errors, []); await b.close();
    /* 5. 오늘의 서고 — ?daily 로 오면 골라 둔 셋으로 바로, 날짜 씨앗이라 같은 날 두 번 열어도 같은 지도 */
    const seedDaily = S.seedOf((() => { const d = new Date(), p2 = n => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); })() + ':book:run');
    const dplan = S.plan(seedDaily[0], seedDaily[1], KEYS.length);
    const c = await h.open('run.html?daily', opt({ store: [STORE, JSON.stringify({ st: null, picks: MINE })] })), r = c.page;
    await r.waitForSelector('.run-screen[data-screen="map"]');
    const sd = await saved(r); assert(sd.st.daily === true && sd.st.seed.join() === seedDaily.join() && sd.st.plan.boss === dplan.boss, '오늘의 서고 — 날짜 씨앗의 지도');
    assert.equal(await r.locator('.run-bar .daily').count(), 1, '오늘의 서고 표');
    assert.deepEqual(c.errors, []); await c.close();
    /* 6. 네 크기 — 지도 화면이 넘치지 않고 단추가 눌린다. 가로 PC 는 덱이 옆에 */
    const SIZES = [['phone-land', { width: 844, height: 390 }, true], ['phone-port', { width: 390, height: 844 }, true], ['fold', FOLD.inner, true], ['pc', { width: 1280, height: 900 }, false]];
    for (const [name, vp, mobile] of SIZES) {
      const mid = R.newRun(data, plan, MINE); R.enter(data, mid, S.nextOf(plan.floors[0], 0)[0]); if (mid.phase === 'read') R.read(data, mid, null); if (mid.phase === 'scene') R.scene(data, mid, 'rest'); if (mid.phase === 'fight') { mid.fight.phase = 'done'; mid.fight.winner = 'me'; R.settle(data, mid); R.takeLoot(data, mid, null); }
      const e = await h.open('run.html', opt({ viewport: vp, mobile, store: [STORE, JSON.stringify({ st: mid, picks: MINE })] })), g = e.page;
      await g.waitForSelector('.run-screen[data-screen="map"]');
      await noOverflow(g); await tappable(g, '.run-next .btn, #run-descend');
      const map = await g.locator('.run-map').boundingBox(); assert(map.width > 200 && map.height > 100, name + ' 지도가 보인다');
      if (name === 'pc') { const side = await g.locator('.run-side').boundingBox(); assert(side.x >= map.x + map.width - 1, 'PC 가로 — 덱은 지도 오른쪽'); }
      assert.deepEqual(e.errors, [], name + ' 오류 없음'); await e.close();
    }
    console.log('PASS 서고 탐험 화면: 고르기 셋 · 지도(길 닿는 방만) · 1층 끝까지(독서대 ' + offers + ' 장면 ' + scenes + ' 싸움 ' + fights + ') · 계단 · 새로고침 · 나오기 · 끝 화면(오늘 기록·전적) · 오늘의 서고 · 네 크기');
  } finally { await h.stop(); fs.rmSync(art, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exit(1); });
