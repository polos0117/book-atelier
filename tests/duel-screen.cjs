/* 결투 화면 — 덮개(344×882)에서 덱 고르기 → 한 판 끝까지. 그림은 tests/fixtures/make-art.py 의 가짜 그림(돈키호테·앨리스·프랑켄슈타인·코스모스).
   ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/duel-screen.cjs */
const assert = require('node:assert/strict'), os = require('node:os'), fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { start, FOLD } = require('./browser-harness.cjs');
const D = require('../lib/duel.js');
const art = fs.mkdtempSync(path.join(os.tmpdir(), 'book-art-'));
const imgjson = execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-art.py'), art]).toString();
const design = JSON.parse(fs.readFileSync('data/book-design.json', 'utf8')), duel = JSON.parse(fs.readFileSync('data/duel.json', 'utf8'));
const data = { design, duel };
const KEYS = design.books.map(b => b.key), STORE = 'book_duel_v1';
const opt = extra => ({ viewport: FOLD.cover, mobile: true, imgRoot: art, files: { 'data/img.json': imgjson }, ...extra });
const tappable = async (p, sel) => { for (const b of await p.locator(sel).all()) { if (!await b.isVisible()) continue; const r = await b.boundingBox(); assert(r && r.height >= 44 && r.width >= 40, sel + ' 누르는 자리 44px: ' + JSON.stringify(r)); } };
const noOverflow = async p => assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '가로 넘침');
/* 내 차례(또는 끝)를 기다린다. 상대 절정 장면은 저절로 닫히지 않으므로 떠 있으면 Esc 로 닫고 다시 기다린다 */
const myTurn = async p => { for (;;) {
  await p.waitForSelector('.duel-turn[data-turn="me"], .duel-result, .duel-scene', { timeout: 20000 });
  if (!await p.locator('.duel-scene').count()) return;
  await p.keyboard.press('Escape'); await p.waitForSelector('.duel-scene', { state: 'detached' }); } };
const focusIn = (p, sel) => p.evaluate(s => !!document.activeElement && !!document.activeElement.closest(s), sel);
const boardInert = p => p.evaluate(() => !!document.querySelector('.duel-board').closest('[inert]'));
const saved = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), STORE);
(async () => {
  const h = await start();
  try {
    /* 1. 덱 고르기 — 설계표의 책 모두, 여섯이 돼야 시작 */
    const a = await h.open('duel.html', opt()), p = a.page;
    await p.waitForSelector('.duel-screen[data-screen="deck"]');
    assert.equal(await p.locator('.deck-cell').count(), design.books.length, '설계표의 책 ' + design.books.length + '권');
    assert(await p.locator('#duel-start').isDisabled(), '빈 덱은 시작 못 한다');
    assert.equal(await p.locator('.deck-cell[data-key="don_quixote"] img').count(), 1, '그림 있는 책은 발단 그림');
    assert.equal(await p.locator('.deck-cell[data-key="hamlet"] img').count(), 0, '그림 없는 책은 이름표');
    for (const k of KEYS.slice(0, 7)) await p.locator('.deck-cell[data-key="' + k + '"]').tap();
    assert.equal(await p.locator('.deck-cell.in').count(), 6, '여섯까지만 든다');
    assert.match(await p.locator('.deck-act .n').textContent(), /6 \/ 6/);
    assert((await saved(p)).deck.length === 6, '덱이 저장된다');
    await p.locator('#duel-auto').tap(); assert.equal(await p.locator('.deck-cell.in').count(), 6, '자동으로 여섯');
    await tappable(p, '.deck-cell, #duel-auto, #duel-start'); await noOverflow(p);
    /* 고른 덱을 손으로 — 돈키호테·앨리스·프랑켄슈타인·코스모스(그림 있음) + 햄릿·춘향전 */
    await p.locator('#duel-clear').tap();
    const MINE = ['don_quixote', 'alice', 'frankenstein', 'kosmos', 'hamlet', 'chunhyang'];
    for (const k of MINE) await p.locator('.deck-cell[data-key="' + k + '"]').tap();
    assert(await p.locator('#duel-start').isEnabled(), '여섯이면 시작할 수 있다');
    await p.locator('#duel-start').tap();
    await p.waitForSelector('.duel-screen[data-screen="match"]');
    /* 2. 대결 — 자리 셋씩, 손패, 막대. 상대 덱은 무작위라 여기선 내기 하나만 본다 */
    assert.equal(await p.locator('.duel-row[data-side="foe"] .duel-slot').count(), 3, '상대 자리 셋');
    assert.equal(await p.locator('.duel-row[data-side="me"] .duel-slot').count(), 3, '내 자리 셋');
    assert.equal(await p.locator('.duel-bar .stages b.on').textContent(), '발단', '첫 장은 발단');
    await myTurn(p);
    const s1 = await saved(p); assert(s1.st && s1.st.phase === 'play' && s1.st.me.hand.length >= 3, '판이 저장된다');
    const handN = await p.locator('.duel-hand .card').count(); assert(handN === s1.st.me.hand.length && handN >= 3, '손패 수 = 저장된 손패');
    await noOverflow(p); await tappable(p, '#duel-pass, #duel-open, #duel-help, .duel-hand .card');
    const first = s1.st.me.hand[0], empty = s1.st.me.slots.findIndex(x => !x);
    await p.locator('.duel-hand .card[data-key="' + first + '"]').tap();
    assert.equal(await p.locator('.duel-row[data-side="me"] .duel-target[data-kind="play"]').count(), s1.st.me.slots.filter(x => !x).length, '빈 자리가 표적');
    assert.equal(await p.locator('.duel-mode').count(), 1, '고르기 모드');
    await p.locator('#duel-cancel').tap(); assert.equal(await p.locator('.duel-target').count(), 0, '취소');
    await p.locator('.duel-hand .card[data-key="' + first + '"]').tap();
    await p.locator('.duel-row[data-side="me"] .duel-slot[data-slot="' + empty + '"]').tap();
    await p.waitForFunction(() => !document.querySelector('.duel-target'));
    const s2 = await saved(p); assert(s2.st.log.some(e => e.t === 'play' && e.who === 'me' && e.key === first), '매 수 저장 — 내기가 기록에');
    assert.deepEqual(a.errors, [], '화면 오류 없음');
    await a.close();

    /* 3. 짜 둔 판 — 상대는 보물섬(정찰 4) 하나, 손패·덱 없음. 내 손엔 춘향전(버티기 7)·돈키호테·앨리스 */
    const rigged = () => { const st = D.newMatch(data, { me: MINE, foe: KEYS.slice(6, 12) }, 11);
      st.turn = st.first = st.coin = 'me'; st.turnNo = 0; st.me.hand = ['chunhyang', 'don_quixote', 'alice']; st.me.deck = []; st.foe.hand = []; st.foe.deck = [];
      st.foe.slots[1] = { id: 90, key: 'treasure_island', power: 4, tok: 0, offset: 0, mark: 0, flags: { entered: { 0: true } }, at: 90 }; return st; };
    const b = await h.open('duel.html', opt({ store: [STORE, JSON.stringify({ deck: MINE, st: rigged() })] })), q = b.page;
    await q.waitForSelector('.duel-screen[data-screen="match"]'); await myTurn(q);
    assert.equal(await q.locator('.duel-row[data-side="foe"] .duel-unit[data-key="treasure_island"] .pw').textContent(), '4', '저장된 판의 상대 책');
    /* 내기 — 춘향전을 보물섬 맞은편(자리 1)에. 들어오며 친다(타격 1) */
    await q.locator('.duel-hand .card[data-key="chunhyang"]').tap();
    await q.locator('.duel-row[data-side="me"] .duel-slot[data-slot="1"]').tap();
    await q.waitForSelector('.duel-row[data-side="me"] .duel-unit[data-slot="1"][data-key="chunhyang"]');
    assert.equal(await q.locator('.duel-row[data-side="me"] .duel-unit[data-slot="1"] .pw').textContent(), '7', '춘향전 발단 버티기 7');
    assert.equal(await q.locator('.duel-row[data-side="foe"] .duel-unit[data-slot="1"] .pw').textContent(), '3', '들어오며 보물섬을 쳤다 4 → 3');
    assert.equal(await q.locator('.duel-hand .card').count(), 2, '손패가 줄었다');
    await myTurn(q);
    /* 공격 — 내 책을 누르면 맞은편이 표적 */
    await q.locator('.duel-row[data-side="me"] .duel-unit[data-slot="1"]').tap();
    assert.equal(await q.locator('.duel-row[data-side="foe"] .duel-target[data-kind="attack"]').count(), 1, '맞은편 하나가 표적');
    const before = Number(await q.locator('.duel-row[data-side="foe"] .duel-unit[data-slot="1"] .pw').textContent());
    await q.locator('.duel-row[data-side="foe"] .duel-target[data-kind="attack"]').tap();
    await q.waitForFunction(() => !document.querySelector('.duel-target'));
    const s3 = await saved(q); assert(s3.st.log.some(e => e.t === 'attack' && e.who === 'me'), '공격이 기록에');
    const after = s3.st.foe.slots[1]; assert(!after || after.power === before - 1, '보물섬이 1 맞았다(버티기 타격 1): ' + (after && after.power));
    await myTurn(q);
    /* 절정 — 내 책을 골라 터뜨리면 장면이 뜨고 단추가 잠긴다 */
    await q.locator('#duel-open').tap();
    assert(await q.locator('.duel-row[data-side="me"] .duel-target[data-kind="open"]').count() >= 1, '내 책이 표적');
    await q.locator('.duel-row[data-side="me"] .duel-target[data-kind="open"][data-slot="1"]').tap();
    await q.waitForSelector('.duel-scene');
    assert.equal(await q.locator('.duel-scene').getAttribute('data-key'), 'chunhyang', '절정 장면 — 그 책');
    assert.match(await q.locator('.duel-scene p').textContent(), /그네/, '발단 개방의 명장면 글(단옷날 그네)');
    /* 대화상자 — 포커스가 닫기로, 뒤쪽은 inert, Tab 은 안에서 돈다. 2.2초가 지나도 저절로 닫히지 않는다 */
    assert.equal(await q.locator('.duel-scene').getAttribute('aria-modal'), 'true', '절정 aria-modal');
    assert.equal(await q.evaluate(() => document.activeElement.id), 'duel-scene-close', '절정 — 열면 닫기 단추로 포커스');
    assert(await boardInert(q), '절정 — 뒤쪽 판은 inert');
    for (let i = 0; i < 3; i++) { await q.keyboard.press('Tab'); assert(await focusIn(q, '.duel-scene'), '절정 — Tab 은 안에서만'); }
    await q.waitForTimeout(3000);
    assert.equal(await q.locator('.duel-scene').count(), 1, '절정은 저절로 닫히지 않는다(명장면 글을 읽을 때까지)');
    await q.keyboard.press('Escape'); await q.waitForSelector('.duel-scene', { state: 'detached' });
    assert(!await boardInert(q), '닫으면 판이 다시 살아난다');
    assert(await focusIn(q, '.duel-board'), '닫으면 포커스가 판으로 돌아온다');
    assert(await q.locator('#duel-open').isDisabled(), '절정은 한 판에 한 번');
    assert((await saved(q)).st.me.opened, '저장에도');
    await myTurn(q);
    /* 규칙 보기 */
    await q.locator('#duel-help').tap(); await q.waitForSelector('.duel-rules');
    assert.equal(await q.locator('.duel-rules li').count(), 5, '규칙 다섯 줄');
    await q.locator('#duel-rules-close').tap(); await q.waitForSelector('.duel-rules', { state: 'detached' });
    /* 새로고침해도 이어진다 */
    const beforeReload = await saved(q);
    await q.reload(); await q.waitForSelector('.duel-screen[data-screen="match"]');
    assert.equal((await saved(q)).st.log.length, beforeReload.st.log.length, '새로고침해도 같은 판');
    /* 끝까지 — 내 차례마다 넘긴다. 책장이 넘어가고 결과가 뜬다 */
    for (let i = 0; i < 40; i++) { await myTurn(q); if (await q.locator('.duel-result').count()) break; await q.locator('#duel-pass').tap(); await q.waitForTimeout(50); }
    await q.waitForSelector('.duel-result[data-result]', { timeout: 20000 });
    const end = await saved(q);
    assert(end.st.phase === 'done' && end.st.chapters.length === 3, '세 장이 끝났다');
    assert.equal(await q.locator('.duel-result li').count(), 3, '장마다 합이 보인다');
    assert(['win', 'lose', 'draw'].includes(await q.locator('.duel-result').getAttribute('data-result')), '결과');
    assert.equal(await q.locator('.duel-bar .stages b.on').textContent(), '결말', '마지막 장은 결말');
    assert(end.st.log.some(e => e.t === 'page'), '책장을 넘긴 기록');
    await tappable(q, '#duel-again, #duel-deck'); await noOverflow(q);
    assert.equal(await q.locator('#duel-forfeit').count(), 0, '끝난 판엔 판 접기가 없다(덱 바꾸기가 있다)');
    /* 같은 덱으로 다시 → 새 판 · 덱 바꾸기 → 덱 화면, 고른 덱은 그대로 */
    await q.locator('#duel-again').tap(); await q.waitForFunction(k => { const s = JSON.parse(localStorage.getItem(k)); return s.st && s.st.phase === 'play' && s.st.chapter === 0; }, STORE);
    const again = await saved(q); assert(again.deck.join() === MINE.join() && again.st.me.hand.length + again.st.me.deck.length + again.st.me.slots.filter(Boolean).length === 6, '같은 덱으로 새 판');
    await q.waitForSelector('.duel-result, .duel-turn[data-turn="me"]', { timeout: 20000 });
    for (let i = 0; i < 40; i++) { await myTurn(q); if (await q.locator('.duel-result').count()) break; await q.locator('#duel-pass').tap(); await q.waitForTimeout(50); }
    await q.waitForSelector('.duel-result[data-result]', { timeout: 20000 });
    await q.locator('#duel-deck').tap(); await q.waitForSelector('.duel-screen[data-screen="deck"]');
    assert.equal(await q.locator('.deck-cell.in').count(), 6, '덱은 그대로');
    /* 오늘 기록 — 끝난 판 둘이 공방 지도가 읽는 칸에 적혔다(오늘 날짜, 판 2, 오늘의 판은 아직) */
    const TODAY = 'atelier_today_v1:book', today = await q.evaluate(k => JSON.parse(localStorage.getItem(k)), TODAY);
    assert(today && today.n === 2 && today.w + (today.n - today.w) === 2 && today.daily === false && today.seen > 0, '오늘 기록 — 판 둘: ' + JSON.stringify(today));
    assert.equal(today.d, await q.evaluate(() => window.AtelierToday.today()), '오늘 날짜');
    assert.match(await q.locator('.deck-daily .note').textContent(), /2판/, '덱 화면에 오늘 2판');
    /* 오늘의 판 — 날짜가 씨앗: 두 번 열어도 상대 덱·내 손패 순서가 같다. 끝내면 daily 가 선다 */
    await tappable(q, '#duel-daily');
    await q.locator('#duel-daily').tap(); await q.waitForSelector('.duel-screen[data-screen="match"]'); await myTurn(q);
    const d1 = await saved(q); assert(d1.st.daily === true, '오늘의 판 표시');
    const foeOf = s => s.st.foe.hand.concat(s.st.foe.deck, s.st.foe.slots.filter(Boolean).map(u => u.key)).join();
    await q.locator('#duel-forfeit').tap(); await q.locator('#duel-forfeit-yes').tap(); await q.waitForSelector('.duel-screen[data-screen="deck"]');
    await q.locator('#duel-daily').tap(); await q.waitForSelector('.duel-screen[data-screen="match"]'); await myTurn(q);
    const d2 = await saved(q);
    assert.equal(foeOf(d2), foeOf(d1), '오늘의 판 — 상대 덱이 같다'); assert.equal(d2.st.me.hand.join(), d1.st.me.hand.join(), '오늘의 판 — 내 손패 순서가 같다'); assert.equal(d2.st.first, d1.st.first, '선공도 같다');
    for (let i = 0; i < 40; i++) { await myTurn(q); if (await q.locator('.duel-result').count()) break; await q.locator('#duel-pass').tap(); await q.waitForTimeout(50); }
    await q.waitForSelector('.duel-result[data-result]', { timeout: 20000 });
    assert.equal(await q.locator('.duel-result h3 .daily').count(), 1, '결과에 오늘의 판 표');
    const today2 = await q.evaluate(k => JSON.parse(localStorage.getItem(k)), TODAY);
    assert(today2.n === 3 && today2.daily === true, '오늘의 판을 끝내면 daily: ' + JSON.stringify(today2));
    await q.locator('#duel-deck').tap(); await q.waitForSelector('.deck-daily[data-done="true"]');
    assert.deepEqual(b.errors, [], '화면 오류 없음');
    assert.deepEqual(await q.evaluate(() => window.AtelierWords.missing()), [], '낱말 표에 없는 열쇠');
    await b.close();
    /* 판 접기 — 한 판 도중에 확인 상자. 기본 포커스는 계속 두기, Esc 면 그대로, 접으면 덱 화면(고른 덱은 그대로) */
    const f = await h.open('duel.html', opt({ store: [STORE, JSON.stringify({ deck: MINE, st: rigged() })] })), fp = f.page;
    await fp.waitForSelector('.duel-screen[data-screen="match"]'); await myTurn(fp);
    await tappable(fp, '#duel-forfeit'); await noOverflow(fp);
    await fp.locator('#duel-forfeit').tap(); await fp.waitForSelector('.duel-confirm[role="alertdialog"][aria-modal="true"]');
    assert.equal(await fp.evaluate(() => document.activeElement.id), 'duel-forfeit-no', '판 접기 — 기본 포커스는 계속 두기');
    assert(await boardInert(fp), '판 접기 — 뒤쪽 판은 inert');
    await fp.keyboard.press('Escape'); await fp.waitForSelector('.duel-confirm', { state: 'detached' });
    assert.equal(await fp.evaluate(() => document.activeElement.id), 'duel-forfeit', '닫으면 판 접기 단추로');
    assert((await saved(fp)).st, 'Esc 면 판은 그대로');
    await fp.locator('#duel-forfeit').tap(); await fp.locator('#duel-forfeit-no').tap(); await fp.waitForSelector('.duel-confirm', { state: 'detached' });
    assert.equal(await fp.locator('.duel-screen[data-screen="match"]').count(), 1, '계속 두기');
    await fp.locator('#duel-forfeit').tap(); await fp.locator('#duel-forfeit-yes').tap();
    await fp.waitForSelector('.duel-screen[data-screen="deck"]');
    const fs2 = await saved(fp); assert(!fs2.st && fs2.deck.join() === MINE.join(), '접으면 판이 지워지고 덱은 그대로');
    assert.equal(await fp.locator('.deck-cell.in').count(), 6, '덱 화면에 고른 여섯');
    assert.deepEqual(f.errors, [], '판 접기 오류 없음');
    await f.close();
    /* 4. 상대 차례부터 — 상대 AI 가 두고 내 차례가 온다 */
    const st4 = rigged(); st4.turn = st4.first = st4.coin = 'foe'; st4.foe.hand = ['baskervilles'];
    const c = await h.open('duel.html', opt({ store: [STORE, JSON.stringify({ deck: MINE, st: st4 })] })), r = c.page;
    await r.waitForSelector('.duel-screen[data-screen="match"]');
    await myTurn(r);
    const s4 = await saved(r); assert(s4.st.log.length > st4.log.length && s4.st.turn === 'me', '상대가 두고 내 차례');
    assert.equal(await r.locator('.duel-row[data-side="foe"] .duel-unit').count(), 2, '상대가 바스커빌을 냈다(값이 오르는 수)');
    await noOverflow(r);
    assert.deepEqual(c.errors, [], '오류 없음');
    await c.close();
    /* 5. 네 크기 — 휴대폰 가로(펼친 책: 왼쪽 나·오른쪽 상대)·휴대폰 세로(위 상대·아래 나·손패 맨 아래)·폴드 안쪽·PC.
          넘치지 않고 끝까지, 크게 보기는 화면 가득, 한 수 두고 화면을 돌려도 판이 그대로(배치만 바뀐다) */
    const SIZES = [['phone-land', { width: 844, height: 390 }, true], ['phone-port', { width: 390, height: 844 }, true], ['fold', FOLD.inner, true], ['pc', { width: 1280, height: 900 }, false]];
    for (const [name, vp, mobile] of SIZES) {
      const e = await h.open('duel.html', opt({ viewport: vp, mobile, store: [STORE, JSON.stringify({ deck: MINE, st: rigged() })] })), g = e.page;
      const press = sel => mobile ? g.locator(sel).first().tap() : g.locator(sel).first().click();
      const box = sel => g.locator(sel).first().boundingBox();
      const spread = async (expectLand, label) => {
        const me = await box('.duel-row[data-side="me"]'), foe = await box('.duel-row[data-side="foe"]'), hand = await box('.duel-dock');
        if (expectLand) {
          assert(me.x + me.width <= foe.x + 1 && Math.abs(me.y - foe.y) < 2, label + ' 가로 — 왼쪽 면 나, 오른쪽 면 상대, 같은 높이: ' + JSON.stringify([me, foe]));
          assert(hand.x + hand.width <= foe.x + 1, label + ' 손패는 내 면 아래');
          assert(await g.locator('.duel-slot .no').first().isVisible(), label + ' 가로엔 자리 번호(맞은편)');
        } else {
          assert(foe.y + foe.height <= me.y + 1, label + ' 세로 — 위 상대, 아래 나');
          assert(hand.y > me.y && hand.y + hand.height >= me.y + me.height - 1, label + ' 손패는 맨 아래(바닥에 붙어 내 자리 아래에)');
          assert(!(await g.locator('.duel-slot .no').first().isVisible()), label + ' 세로엔 번호 없음');
        }
        const xs = await g.locator('.duel-bar .stages b').evaluateAll(es => es.map(x => x.getBoundingClientRect().x));
        assert(xs[0] < xs[1] && xs[1] < xs[2], label + ' 발단→전개→결말은 왼쪽→오른쪽');
        await noOverflow(g);
      };
      await g.waitForSelector('.duel-screen[data-screen="match"]'); await myTurn(g);
      const land = vp.width > vp.height;
      await spread(land, name);
      if (name === 'phone-land') assert(await g.evaluate(() => { const w = document.querySelector('.wrap'); return w.scrollHeight <= w.clientHeight + 1; }), '휴대폰 가로 — 높이 390 한 화면에 다 들어간다');
      /* 크게 보기 — 자리의 ⌕, 화면 가득 */
      await press('.duel-row[data-side="foe"] .duel-unit .zoom'); await g.waitForSelector('.duel-zoom');
      assert.equal(await g.locator('.duel-zoom').getAttribute('data-key'), 'treasure_island', name + ' 크게 보기 — 그 책');
      const zb = await box('.duel-zoom'); assert(zb.width >= vp.width - 1 && zb.height >= vp.height - 1, name + ' 크게 보기는 화면 가득');
      assert(await g.locator('.duel-zoom .pic').isVisible() && (await box('.duel-zoom .pic')).height >= 150, name + ' 큰 그림');
      assert.equal(await g.evaluate(() => document.activeElement.id), 'duel-zoom-close', name + ' 크게 보기 — 열면 닫기 단추로 포커스');
      assert(await boardInert(g), name + ' 크게 보기 — 뒤쪽 판은 inert');
      await press('#duel-zoom-close'); await g.waitForSelector('.duel-zoom', { state: 'detached' });
      /* 키보드로 — ⌕ 에 포커스, Enter 로 열고 Esc 로 닫으면 그 ⌕ 로 돌아온다 */
      await g.locator('.duel-row[data-side="foe"] .duel-unit .zoom').first().focus(); await g.keyboard.press('Enter');
      await g.waitForSelector('.duel-zoom[aria-modal="true"]');
      await g.keyboard.press('Tab'); await g.keyboard.press('Tab'); assert(await focusIn(g, '.duel-zoom'), name + ' 크게 보기 — Tab 은 안에서만');
      await g.keyboard.press('Escape'); await g.waitForSelector('.duel-zoom', { state: 'detached' });
      assert(await g.evaluate(() => document.activeElement.matches('.duel-row[data-side="foe"] .duel-unit .zoom')), name + ' 크게 보기 — 닫으면 연 ⌕ 로 포커스');
      assert(!await boardInert(g), name + ' 닫으면 inert 풀림');
      /* 한 수 두고 돌린다 */
      await press('.duel-hand .card[data-key="chunhyang"]'); await press('.duel-row[data-side="me"] .duel-slot[data-slot="1"]');
      await g.waitForSelector('.duel-row[data-side="me"] .duel-unit[data-slot="1"][data-key="chunhyang"]'); await myTurn(g);
      const before = await saved(g);
      await g.setViewportSize({ width: vp.height, height: vp.width }); await g.waitForTimeout(150);
      assert.equal(await g.locator('.duel-row[data-side="me"] .duel-unit[data-slot="1"][data-key="chunhyang"]').count(), 1, name + ' 돌려도 판 위 책 그대로');
      assert.equal((await saved(g)).st.log.length, before.st.log.length, name + ' 돌려도 기록 그대로');
      await spread(!land, name + ' 돌린 뒤');
      await g.setViewportSize(vp); await g.waitForTimeout(150); await spread(land, name + ' 되돌린 뒤');
      for (let i = 0; i < 40; i++) { await myTurn(g); if (await g.locator('.duel-result').count()) break; await press('#duel-pass'); await g.waitForTimeout(50); }
      await g.waitForSelector('.duel-result[data-result]', { timeout: 20000 }); await noOverflow(g);
      assert.deepEqual(e.errors, [], name + ' 오류 없음');
      await e.close();
    }
    console.log('PASS 결투 화면: 덱 고르기(' + design.books.length + '권·여섯·자동·저장) · 자리 셋씩 · 내기·공격·절정 장면·규칙 · 새로고침 · 끝까지 세 장 · 다시·덱 바꾸기 · 상대 차례 · 네 크기(가로 펼친 책·세로·폴드·PC) 끝까지·크게 보기·돌려도 그대로');
  } finally { await h.stop(); fs.rmSync(art, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exit(1); });
