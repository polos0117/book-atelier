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
const myTurn = p => p.waitForSelector('.duel-turn[data-turn="me"], .duel-result', { timeout: 20000 });
const saved = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), STORE);
(async () => {
  const h = await start();
  try {
    /* 1. 덱 고르기 — 열다섯 권, 여섯이 돼야 시작 */
    const a = await h.open('duel.html', opt()), p = a.page;
    await p.waitForSelector('.duel-screen[data-screen="deck"]');
    assert.equal(await p.locator('.deck-cell').count(), design.books.length, '열다섯 권');
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
    await q.locator('#duel-scene-close').tap(); await q.waitForSelector('.duel-scene', { state: 'detached' });
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
    /* 같은 덱으로 다시 → 새 판 · 덱 바꾸기 → 덱 화면, 고른 덱은 그대로 */
    await q.locator('#duel-again').tap(); await q.waitForFunction(k => { const s = JSON.parse(localStorage.getItem(k)); return s.st && s.st.phase === 'play' && s.st.chapter === 0; }, STORE);
    const again = await saved(q); assert(again.deck.join() === MINE.join() && again.st.me.hand.length + again.st.me.deck.length + again.st.me.slots.filter(Boolean).length === 6, '같은 덱으로 새 판');
    await q.waitForSelector('.duel-result, .duel-turn[data-turn="me"]', { timeout: 20000 });
    for (let i = 0; i < 40; i++) { await myTurn(q); if (await q.locator('.duel-result').count()) break; await q.locator('#duel-pass').tap(); await q.waitForTimeout(50); }
    await q.waitForSelector('.duel-result[data-result]', { timeout: 20000 });
    await q.locator('#duel-deck').tap(); await q.waitForSelector('.duel-screen[data-screen="deck"]');
    assert.equal(await q.locator('.deck-cell.in').count(), 6, '덱은 그대로');
    assert.deepEqual(b.errors, [], '화면 오류 없음');
    assert.deepEqual(await q.evaluate(() => window.AtelierWords.missing()), [], '낱말 표에 없는 열쇠');
    await b.close();
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
    console.log('PASS 결투 화면: 덱 고르기(열다섯·여섯·자동·저장) · 자리 셋씩 · 내기·공격·절정 장면·규칙 · 새로고침 · 끝까지 세 장 · 다시·덱 바꾸기 · 상대 차례');
  } finally { await h.stop(); fs.rmSync(art, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exit(1); });
