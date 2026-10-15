/* 생성기 — 책 고르기(✓·◐ 표시)·세 갈래·시범 폼에서 시작·파일 이름·외형 잠금과 무작위·되돌리기·직전 책 외형·장면 랜덤과 잠금·복사·기록·저장.
   ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/prompt-screen.cjs */
const assert = require('node:assert/strict'), os = require('node:os'), fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { start, FOLD } = require('./browser-harness.cjs');
const art = fs.mkdtempSync(path.join(os.tmpdir(), 'book-art-'));
const imgjson = execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-art.py'), art]).toString();
const opt = extra => ({ viewport: FOLD.inner, mobile: true, imgRoot: art, files: { 'data/img.json': imgjson }, ...extra });
const out = p => p.$eval('#prompt-output', e => e.value);
(async () => {
  const h = await start();
  try {
    const a = await h.open('prompt.html?book=don_quixote', opt()), p = a.page;
    await p.waitForSelector('#prompt-output');
    await p.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    /* 1. 책 고르개 — ✓ 여섯 자리 다 · ◐ 일부 · · 아직 */
    const marks = await p.$$eval('#source option', os => Object.fromEntries(os.map(o => [o.value, o.textContent.trim()[0]])));
    assert.deepEqual(marks, { kosmos: '◐', don_quixote: '✓', alice: '✓', frankenstein: '◐', chunhyang: '·' }, JSON.stringify(marks));
    /* 2. 처음 연 책은 시범 폼(돈키호테 = 전개)에서, 새 인물 */
    assert.equal(await p.$eval('#form', e => e.value), 'middle');
    let t = await out(p);
    assert(t.startsWith('INPUT: attach only the style reference image') && t.includes('STYLE REFERENCE:') && t.includes('FORM — DEVELOPMENT (전개)') && t.includes('SILHOUETTE:') && t.includes('FACE ('));
    assert(t.trim().split('\n\n').pop().startsWith('FINAL CHECK: '), '지금 판(v2)의 점검 줄이 맨 끝');
    assert.equal(await p.$eval('#style-version', e => e.value), 'v2', '지금 판을 따라간다');
    assert.match(await p.$eval('#file-name code', e => e.textContent), /^don_quixote_middle_literary_fantasy_f\.webp$/);
    /* 3. 외형 — 고르면 IDENTITY 에, 얼굴 설계 끄기, 되돌리기·다시 하기 */
    await p.selectOption('#param-apparent-age', '20s');
    assert((await out(p)).includes('apparent age: 20s'));
    await p.click('#face-design-on');
    assert(!(await out(p)).includes('FACE ('), '얼굴 설계를 끄면 FACE 줄이 빠진다');
    await p.click('#undo');
    assert((await out(p)).includes('FACE ('), '되돌리기 — 얼굴 설계가 다시 켜진다');
    await p.click('#redo');
    assert(!(await out(p)).includes('FACE ('), '다시 하기');
    await p.click('#undo');
    /* 잠근 항목은 무작위가 안 바꾼다 */
    await p.click('button.param-lock[aria-label$="외관상 나이"]');
    await p.click('#randomize');
    assert.equal(await p.$eval('#param-apparent-age', e => e.value), '20s', '잠근 나이는 그대로');
    /* 4. 이어가기 — 확정한 첫 그림(기본은 시범 폼)을 첨부하고 다른 폼으로, 설계 줄이 빠진다 */
    await p.selectOption('#form', 'begin');
    await p.selectOption('#identity-mode', 'reference');
    assert.equal(await p.$eval('#base-form', e => e.value), 'middle', '첨부할 확정 그림은 시범 폼');
    t = await out(p);
    assert(t.includes('approved character (development form)') && t.includes('FORM — BEGINNING') && !t.includes('SILHOUETTE:') && !t.includes('IDENTITY'), '이어가기');
    await p.selectOption('#form', 'middle');
    /* 5. 개방 — 그 폼 그림 첨부, 명장면, 파일 이름에 _open */
    await p.click('#mode-open');
    t = await out(p);
    assert(t.includes('풍차 앞으로 돌진하는 순간') && t.startsWith("INPUT: attach this book's development form card image"));
    assert.match(await p.$eval('#file-name code', e => e.textContent), /don_quixote_middle_open_literary_fantasy_f\.webp/);
    /* 6. 일상컷 — 번호·갈래·예시, 장면 랜덤과 잠금 */
    await p.click('#mode-casual');
    await p.selectOption('#casual-n', '3');
    assert.match(await p.$eval('#file-name code', e => e.textContent), /don_quixote_literary_fantasy_f_casual3\.webp/);
    await p.selectOption('#category', 'library_life');
    await p.selectOption('#example', 'lib_binding');
    assert((await out(p)).includes('Stitching a book block'));
    await p.click('#lock-example');
    await p.click('#random-scene');
    assert.equal(await p.$eval('#example', e => e.value), 'lib_binding', '잠근 예시는 그대로');
    assert.equal(await p.$eval('#category', e => e.value), 'library_life', '예시를 잠그면 그 갈래도 그대로');
    /* 7. 복사·기록 — 기록은 records/<책>/<자리>-ui.json, storage 는 장부가 읽는 꼴 */
    await p.click('#copy-prompt');
    await p.waitForFunction(() => document.querySelector('.studio-status').textContent.length > 0);
    await p.click('#export-record');
    const rec = JSON.parse(await p.$eval('#record-output', e => e.value));
    assert.equal(rec.record, 'records/don_quixote/casual3-ui.json');
    assert.equal(rec.file, 'don_quixote_literary_fantasy_f_casual3.webp');
    assert.equal(rec.storage.cards.don_quixote.scenes.casual.ex, 'lib_binding');
    assert.equal(rec.styleVersion, 'v2');
    /* 8. 저장 — 새로고침해도 이어지고, 다른 책은 직전 책 외형을 가져올 수 있다 */
    await p.reload(); await p.waitForSelector('#prompt-output');
    assert.equal(await p.$eval('#mode-casual', e => e.getAttribute('aria-pressed')), 'true', '새로고침해도 일상컷');
    await p.selectOption('#source', 'alice');
    await p.waitForFunction(() => document.querySelector('#mode-form'));
    assert.equal(await p.$eval('#form', e => e.value), 'end', '앨리스는 시범 폼(결말)에서');
    await p.click('#take-prev');
    assert.equal(await p.$eval('#param-apparent-age', e => e.value), '20s', '직전 책 외형');
    assert.deepEqual(a.errors, []);
    assert.deepEqual(await p.evaluate(() => window.AtelierWords.missing()), [], '낱말 표에 없는 열쇠');
    /* 덮개 화면에서 가로로 넘치지 않는다 */
    await p.setViewportSize(FOLD.cover);
    assert(await p.evaluate(() => document.body.scrollWidth <= innerWidth + 1), '덮개 화면에서 가로로 넘친다');
    await a.close();
    console.log('PASS 생성기: 책 표시 ✓◐· · 시범 폼 · 파일 이름 · 외형·얼굴 설계·되돌리기·잠금 · 이어가기 · 개방 · 일상컷 번호·갈래·잠금 · 복사·기록 · 저장·직전 책 외형');
  } finally { await h.stop(); fs.rmSync(art, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exit(1); });
