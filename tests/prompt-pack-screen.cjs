/* 지시문 묶음 = 생성기 화면 — tools/prompt-pack.cjs 가 쓴 기록의 저장 상태를 화면에 넣으면 화면이 같은 지시문 · 같은 파일 이름을 만든다.
   폼 · 개방 여섯 자리(외형 · 장면 칸을 고친 설정도 하나)와 일상 다섯 자리(계획기 계획 — 트리 버전1).
   node tests/prompt-pack-screen.cjs (BASE_URL 이 있으면 그 서버, 없으면 tests/browser-harness.cjs 가 띄운다) */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { start, FOLD } = require('./browser-harness.cjs');
const C = require('../tools/casual-plan.cjs'), K = require('../tools/prompt-pack.cjs');
const design = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/book-design.json'), 'utf8'));
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-pack-'));
  const h = await start();
  try {
    let n = 0;
    for (const [key, edit] of [['alice', null], ['hamlet', set => {
      set.card.params = { 'hair color': 'silver', 'eye color': '#3a7bd5' }; set.card.motifs = 'pressed violets at the collar'; set.card.why = '검사 — 직접 입력';
      const [a, b] = Object.keys(set.slots); set.slots[a].scene = { expr: 'soft_smile', frame: 'waist_up' }; set.slots[b].scene = { custom: 'cold castle torchlight' }; set.slots[b].why = '검사';
      set.slots.casual2.custom = 'Her right hand holds one letter; her left hand rests on the table.'; set.slots.casual2.why = '검사';
    }]]) {
      const g = design.books.find(x => x.key === key), dir = path.join(tmp, key);
      fs.mkdirSync(dir);
      const res = C.plan(g, [1, 2, 3, 4, 5], [], { seed: 21 });
      fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify({ book: key, seed: 21, required: res.required, slots: [1, 2, 3, 4, 5], cuts: res.cuts }));
      const set = K.initSettings(g, path.join(dir, 'plan.json'));
      if (edit) edit(set);
      fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify(set));
      const log = console.log; console.log = () => {};
      try { assert.equal(K.build(dir), 0, key + ' build'); } finally { console.log = log; }
      const { list } = K.slots(g, res);
      assert.equal(list.length, 11, '열한 자리');
      for (const s of list) {
        const rec = JSON.parse(fs.readFileSync(path.join(dir, s.slot + '-ui.json'), 'utf8'));
        assert.equal(fs.readFileSync(path.join(dir, s.slot + '-prompt.txt'), 'utf8'), rec.prompt);
        const { page: p } = await h.open('index.html', { viewport: FOLD.inner, mobile: true });
        await p.evaluate(st => localStorage.setItem('book_prompt_v1', JSON.stringify(st)), rec.storage);
        await p.goto(p.url().replace(/index\.html.*$/, 'prompt.html?book=' + key + '&mode=' + s.mode));
        await p.waitForSelector('#prompt-output');
        await p.waitForFunction(() => document.querySelector('#prompt-output').value.length > 0);
        assert.equal(await p.$eval('#prompt-output', e => e.value), rec.prompt, key + ' ' + s.slot + ' 화면과 묶음 지시문이 다르다');
        assert.equal(await p.$eval('#file-name code', e => e.textContent.trim()), rec.file, key + ' ' + s.slot + ' 파일 이름');
        await p.close(); n++;
      }
    }
    /* 틀린 칸은 아무것도 안 쓴다 */
    const g = design.books.find(x => x.key === 'alice'), bad = path.join(tmp, 'bad');
    fs.mkdirSync(bad);
    const set = K.initSettings(g, '');
    set.card.params = { 'hair color': 'not-a-value' }; set.slots.end.scene = { frame: 'nope' }; set.slots.begin.scene = { custom: 'x' }; set.slots.middle.extra = 1;
    fs.writeFileSync(path.join(bad, 'settings.json'), JSON.stringify(set));
    const err = console.error; const said = []; console.error = m => said.push(m);
    try { assert.equal(K.build(bad), 1); } finally { console.error = err; }
    assert(!fs.existsSync(path.join(bad, 'end-prompt.txt')), '틀리면 쓰지 않는다');
    for (const re of [/card 에 직접 입력/, /scene\.frame 의 값 nope/, /slots\.begin 에 직접 입력/, /slots\.middle 에 없는 칸 extra/]) assert(said.some(m => re.test(m)), re + ' 를 알린다');
    console.log(`PASS 지시문 묶음 ↔ 생성기 화면: ${n} 자리(두 책 · 폼 · 개방 · 일상 · 고친 설정 하나)를 화면에 넣으면 같은 지시문 · 같은 파일 이름 · 틀린 설정은 안 쓴다`);
  } finally { await h.stop(); fs.rmSync(tmp, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exit(1); });
