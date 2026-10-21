/* 서고 탐험의 복도(run.html · lib/sprite-actor.js) — docs/ATELIER_PIXEL_ART_PLAN.md P5(3절 서고 탐험 줄).
   - 덱에 도트가 있는 책이 있으면 그 첫 책의 주인공이 지도 위 복도에 선다(덱 첫 책이 아니어도) · 없으면 복도째 없다
   - 방을 고르면 상태는 바로 적히고(저장), 0.7초 제자리 걸음 동안 지도를 두었다가 그 방(싸움·상자)을 띄운다
   - 걷는 동안 누르면 바로 도착 · 움직임 끔·동작 줄이기·휴대폰 가로(복도 숨김)·새로고침이면 걷지 않고 바로
   - 화면 오류 없음, 옆으로 안 넘친다
   ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/run-sprite-screen.cjs */
const os = require('node:os'), fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { start } = require('./browser-harness.cjs');
const art = fs.mkdtempSync(path.join(os.tmpdir(), 'book-runsp-'));
const imgjson = execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-art.py'), art]).toString();
execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-sprites.py'), art]);
const SEED = 77, STORE = 'book_run_v1';
const MINE = ['don_quixote', 'alice', 'frankenstein'], PLAIN = ['hamlet', 'dracula', 'kosmos'];
const opt = extra => ({ viewport: { width: 390, height: 844 }, mobile: true, imgRoot: art, files: { 'data/img.json': imgjson }, ...extra });
const wait = ms => new Promise(ok => setTimeout(ok, ms));
const saved = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), STORE);
const walker = p => p.evaluate(() => { const a = document.querySelector('.run-corridor .sprite-actor'); return a && a.sprite ? a.sprite.debug() : null; });
const moving = p => p.locator('.run-corridor[data-moving]').count();

async function begin(p, books) {
  await p.waitForSelector('.run-screen[data-screen="pick"]');
  for (const k of books) await p.locator('.deck-cell[data-key="' + k + '"]').click();
  await p.waitForFunction(() => window.AtelierShelf && window.AtelierShelf.loaded());
  await p.locator('#run-start').click(); await p.waitForSelector('.run-screen[data-screen="map"]');
}
const readyWalker = p => p.waitForFunction(() => { const a = document.querySelector('.run-corridor .sprite-actor'); return a && a.sprite && a.sprite.debug().ready; }, null, { timeout: 30000 });
/* 지금 방을 끝낸다 — 상자는 지나가고, 싸움은 넘기기만, 결과 띠는 계속. 지도로 돌아오면 멈춘다 */
async function settle(p) {
  for (let i = 0; i < 200; i++) {
    if (await moving(p)) { await wait(100); continue; }
    if (await p.locator('.run-offer').count()) { await p.locator('#run-offer-skip, #run-scene-rest').first().click(); await wait(60); continue; }
    if (await p.locator('.run-fight-result').count()) { await p.locator('#run-continue').click(); await wait(60); continue; }
    if (await p.locator('.run-screen[data-screen="fight"]').count()) {
      await p.waitForSelector('#duel-pass:not([disabled]), .run-fight-result', { timeout: 20000 });
      if (await p.locator('#duel-pass:not([disabled])').count()) await p.locator('#duel-pass').click();
      await wait(80); continue;
    }
    if (await p.locator('.run-screen[data-screen="map"]').count()) return true;
    if (await p.locator('.run-end').count()) return false;
    await wait(80);
  }
  return false;
}
const nextBtn = p => p.locator('.run-next .btn[data-id]').first();
/* 다음 한 걸음 — 방 단추가 없으면(계단 방) 내려가기 */
const stepBtn = p => p.locator('.run-next .btn[data-id], #run-descend').first();

(async () => {
  const h = await start();
  const T = [];
  const add = (n, ok, got) => T.push([n, !!ok, got === undefined ? '' : String(got)]);
  try {
    /* 1. 길동무 — 덱 둘째 책 alice */
    let s = await h.open('run.html?seed=' + SEED, opt()), p = s.page;
    await begin(p, MINE); await readyWalker(p);
    add('덱에 도트가 있는 책 → 복도에 길동무', await p.locator('.run-corridor .sprite-actor').isVisible());
    add('길동무는 그 책의 주인공', /앨리스/.test(await p.locator('.run-corridor .sprite-actor').getAttribute('aria-label')), await p.locator('.run-corridor .sprite-actor').getAttribute('aria-label'));
    add('저절로 걷지 않는다', (await walker(p)).state === 'idle');

    /* 2. 방 고르기 — 바로 저장, 걷는 동안 지도, 그다음 그 방 */
    const id = +(await nextBtn(p).getAttribute('data-id')), kind = await nextBtn(p).getAttribute('data-kind');
    await nextBtn(p).click();
    const st = (await saved(p)).st;
    add('고르는 즉시 상태가 적힌다', st.room === id, `${st.room} vs ${id}`);
    add('걷는 동안은 지도', await moving(p) === 1 && await p.locator('.run-screen[data-screen="map"]').count() === 1 && await p.locator('.run-offer, .run-screen[data-screen="fight"]').count() === 0);
    add('길동무가 걷는다(제자리)', (await walker(p)).state === 'walk', (await walker(p)).state);
    await p.waitForFunction(() => !document.querySelector('.run-corridor[data-moving]'), null, { timeout: 3000 });
    const want = kind === 'meet' ? '.run-screen[data-screen="fight"]' : kind === 'rest' ? '.run-screen[data-screen="map"]' : '.run-offer';
    add(`0.7초 뒤 그 방(${kind})`, await p.locator(want).count() >= 1, kind);
    await settle(p);

    /* 3. 걷는 동안 누르면 바로 도착 */
    if (await stepBtn(p).count()) {
      await stepBtn(p).click();
      add('(다음 방) 걷기 시작', await moving(p) === 1);
      await p.locator('.run-bar').click();
      add('걷는 동안 누르면 바로 도착', await moving(p) === 0);
      await settle(p);
    }
    /* 4. 새로고침 — 걷지 않고 바로 그 방 */
    if (await stepBtn(p).count()) {
      await stepBtn(p).click();
      await p.reload(); await p.waitForSelector('.run-screen');
      await wait(300);
      add('새로고침이면 걷기 없이', await moving(p) === 0);
      if (await p.locator('.run-screen[data-screen="pick"]').count()) await p.locator('#run-resume').click();
      await settle(p);
    }
    /* 5. 움직임 끔 */
    await readyWalker(p);
    await p.evaluate(() => window.AtelierMotion.setEnabled(false)); await wait(100);
    add('(움직임 끔) 한 걸음 갈 데가 있다', await stepBtn(p).count() > 0);
    if (await stepBtn(p).count()) {
      await stepBtn(p).click();
      add('움직임 끔 → 걷지 않고 바로', await moving(p) === 0);
      await settle(p);
    }
    await p.evaluate(() => window.AtelierMotion.setEnabled(true));
    add('화면 오류 없음', s.errors.length === 0, s.errors.join(' | '));
    await s.close();

    /* 6. 도트 없는 덱 — 복도째 없고 바로 */
    s = await h.open('run.html?seed=' + SEED, opt()); p = s.page;
    await begin(p, PLAIN); await wait(800);
    add('도트 없는 덱 → 복도 없음', await p.locator('.run-corridor').count() === 0);
    await nextBtn(p).click();
    add('도트 없는 덱 → 바로', await moving(p) === 0);
    add('도트 없는 덱 → 화면 오류 없음', s.errors.length === 0, s.errors.join(' | '));
    await s.close();

    /* 7. 동작 줄이기 */
    s = await h.open('run.html?seed=' + SEED, opt({ reducedMotion: 'reduce' })); p = s.page;
    await begin(p, MINE); await readyWalker(p);
    await nextBtn(p).click();
    add('동작 줄이기 → 걷지 않고 바로', await moving(p) === 0);
    await s.close();

    /* 8. 휴대폰 가로 — 복도 숨김, 바로 */
    s = await h.open('run.html?seed=' + SEED, opt({ viewport: { width: 844, height: 390 } })); p = s.page;
    await begin(p, MINE); await wait(800);
    add('휴대폰 가로 → 복도 숨김', await p.locator('.run-corridor').count() === 0 || await p.locator('.run-corridor').isHidden());
    await nextBtn(p).click();
    add('휴대폰 가로 → 바로', await moving(p) === 0);
    await s.close();

    /* 9. 크기 넷 — 복도 안의 길동무, 옆 넘침 없음 */
    for (const [w, hh] of [[344, 882], [390, 844], [690, 829], [1280, 900]]) {
      s = await h.open('run.html?seed=' + SEED, opt({ viewport: { width: w, height: hh }, mobile: w < 1000 })); p = s.page;
      await begin(p, MINE); await readyWalker(p);
      const r = await p.evaluate(() => {
        const c = document.querySelector('.run-corridor').getBoundingClientRect(), a = document.querySelector('.run-corridor .sprite-actor').getBoundingClientRect();
        return { over: document.documentElement.scrollWidth - innerWidth, inside: a.left >= c.left - 1 && a.right <= c.right + 1 && a.top >= c.top - 1 && a.bottom <= c.bottom + 8 };
      });
      add(`${w}×${hh} 옆으로 안 넘친다`, r.over <= 1, JSON.stringify(r));
      add(`${w}×${hh} 길동무가 복도 안`, r.inside, JSON.stringify(r));
      add(`${w}×${hh} 화면 오류 없음`, s.errors.length === 0, s.errors.join(' | '));
      await s.close();
    }
  } catch (err) {
    T.push(['검사가 끝까지 못 갔다', false, String(err && err.stack || err).slice(0, 400)]);
  } finally {
    await h.stop();
  }
  const bad = T.filter(t => !t[1]);
  for (const [n, ok, got] of T) if (!ok || process.env.VERBOSE) console.log(ok ? '  OK  ' : '  FAIL', n, got ? '← ' + got : '');
  console.log(bad.length ? `서고 복도 도트: ${T.length} 가운데 ${bad.length} 실패` : `PASS 서고 복도 도트 — ${T.length}가지`);
  process.exit(bad.length ? 1 : 0);
})();
