/* 일상컷 묶음 계획기. node tests/casual-plan.cjs
   - ${design.books.length}권 × 씨앗 셋 — 다섯 칸이 묶음 규칙을 다 지키고, 기록·지시문이 생성기 조립과 같다
   - 이미 있는 컷이 있으면 그 위에 더 짜도 규칙을 지킨다
   - 규칙 검사가 겹침·필수 갈래 없음·트리 밖 값을 건다 */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm');
const C = require('../tools/casual-plan.cjs');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const ctx = { window: {}, console }; vm.createContext(ctx);
for (const f of ['lib/prompt-spec.js', 'lib/casual-tree.js', 'lib/prompt-book.js']) vm.runInContext(read(f), ctx);
const CT = ctx.window.AtelierCasualTree, P = ctx.window.AtelierPrompt, tree = JSON.parse(read('data/casual-tree.json')), design = JSON.parse(read('data/book-design.json'));
const style = JSON.parse(read('data/style.json')), gs = style.styles[style.default || Object.keys(style.styles)[0]], cur = gs.versions.find(v => v.v === gs.current);

let n = 0;
for (const g of design.books) for (const seed of [1, 2, 3]) {
  const res = C.plan(g, [1, 2, 3, 4, 5], [], { seed });
  assert.equal(res.cuts.length, 5);
  assert.deepEqual(C.check(res.cuts, g), [], g.key + ' ' + seed);
  assert(res.cuts.some(c => C.requiredType(c) === res.required), g.key + ' 필수 갈래 ' + res.required);
  assert(res.cuts.every(c => c.item), g.key + ' 옷은 구체적으로');
  for (const c of res.cuts) { const lowOff = (tree.frame_rules[c.frame] || {}).low === false, pf = (tree.activities.find(a => a.key === c.act).prefer || []).filter(k => tree.outfits.find(o => o.key === c.ofam).items.some(i => i.key === k && !(lowOff && i.low))); if (pf.length) assert(pf.includes(c.item), g.key + ' ' + c.act + ' 에 맞는 옷'); }
  /* 칸끼리 규칙(트리 표) — 자세는 앉는 자리·손·보이는 부위가 맞고 물건 드는 자세·돌아보기는 안 고른다, 표정은 하는 일·방향이 허락할 때만,
     가까운 컷·3/4 엔 광각 없음, 가슴 위·클로즈업엔 허리 아래로 알아보는 옷 없음 */
  for (const c of res.cuts) {
    const a = tree.activities.find(x => x.key === c.act), fr = tree.frame_rules[c.frame] || {}, m = tree.pose_meta[c.pose] || {};
    if (c.pose) {
      assert(!m.seat || !a.seat || a.seat.includes(m.seat), g.key + ' 앉는 자리 ' + c.act + '·' + c.pose);
      assert(!m.hands || a.hands === 'free', g.key + ' 손 ' + c.act + '·' + c.pose);
      assert(!fr.zones || fr.zones.includes(m.zone || 'legs'), g.key + ' 보이는 부위 ' + c.frame + '·' + c.pose);
      assert(!['holding_cup', 'reading_book', 'taking_photo', 'adjusting_bag', 'checking_map', 'waving', 'offering_food', 'watering', 'preparing_food', 'carrying_something', 'turning_back', 'bending_over'].includes(c.pose), g.key + ' 계획기는 안 고르는 자세 ' + c.pose);
    }
    assert(!c.expr || (!a.mood && !tree.back_orients.includes(c.orient)), g.key + ' 표정 ' + c.act + '·' + c.orient);
    assert(!['reaching_up', 'leaning_forward', 'leaning_back', 'crouching', 'seated_twist', 'turning_midmotion', 'reclining'].includes(c.orient), g.key + ' 계획기는 동작 방향을 안 고른다 ' + c.orient);
    assert(fr.wide !== false || !tree.wide_lenses.includes(c.lens), g.key + ' 광각 ' + c.frame + '·' + c.lens);
    assert(!(a.not_frames || []).includes(c.frame), g.key + ' 하는 일이 안 받는 프레이밍 ' + c.act + '·' + c.frame);
    if (a.family === 'sit' && CT.poses(tree, c.act, c.frame).some(k => (tree.pose_meta[k] || {}).seat)) assert((tree.pose_meta[c.pose] || {}).seat, g.key + ' 앉기 계열엔 앉는 자세 ' + c.act + '·' + c.pose);
    assert(fr.low !== false || !tree.outfits.find(o => o.key === c.ofam).items.find(i => i.key === c.item).low, g.key + ' 허리 아래 옷 ' + c.frame + '·' + c.item);
  }
  for (const c of res.cuts) {
    const rec = C.record(g, c), sc = rec.storage.cards[g.key].scenes.casual;
    assert.equal(rec.file, `${g.key}_literary_fantasy_f_casual${c.n}.webp`);
    assert.equal(rec.record, `records/${g.key}/casual${c.n}-ui.json`);
    assert(rec.prompt.includes('STYLE: ' + cur.text) && (cur.check ? rec.prompt.endsWith('FINAL CHECK: ' + cur.check) : !rec.prompt.includes('FINAL CHECK')), '화풍 판·점검');
    assert(sc.axes.overall_intensity === 'strong' && sc.axes.skin_exposure === 'bold' && sc.aspect === '2:3', '일상컷 고정값');
    assert(rec.prompt.includes('SCENE (chosen):\n') && rec.prompt.includes('overall_intensity: strong'), '지시문');
  }
  n++;
}
/* 필수 갈래는 책 차례대로 돌린다, --required 로 바꾼다 */
const req = design.books.slice(0, 4).map(g => C.plan(g, [1, 2, 3], [], { seed: 5 }).required);
assert.deepEqual(req, C.REQUIRED_TYPES, '필수 갈래 돌리기');
assert.equal(C.plan(design.books[0], [1, 2, 3], [], { seed: 5, required: 'in_story' }).required, 'in_story');
/* 이미 있는 컷 위에 더 짠다 — 일곱 장이어도 규칙 */
const g = design.books.find(x => x.key === 'hamlet');
const first = C.plan(g, [1, 2, 3, 4, 5], [], { seed: 9 }).cuts.map(c => ({ ...c, old: true }));
const more = C.plan(g, [6, 7], first, { seed: 9 });
assert.deepEqual(C.check(more.cuts, g, first), [], '더 짠 두 장');
assert(!more.cuts.some(c => first.some(o => o.place === c.place)), '이미 있는 장소는 피한다');
/* 규칙 검사 */
const base = C.plan(g, [1, 2, 3, 4, 5], [], { seed: 4 }).cuts;
const errs = f => C.check(f(base.map(c => ({ ...c, axes: { ...c.axes } }))), g).join(' | ');
assert.match(errs(cs => { cs[1].frame = cs[0].frame; return cs; }), /프레이밍/);
assert.match(errs(cs => { cs[1].place = cs[0].place; cs[1].era = cs[0].era; cs[1].act = cs[0].act; cs[1].ofam = cs[0].ofam; cs[1].item = cs[0].item; return cs; }), /장소/);
assert.match(errs(cs => cs.filter(c => !C.requiredType(c))), /필수 갈래가 없다/);
/* 사용자가 고른 칸(free)은 겹침엔 안 세도 「있어야 할 것」엔 센다 — 문명 5 일상1(하나뿐인 란제리·전신 컷, 방향만 2번과 겹침) */
const keep = base.filter(c => C.requiredType(c) || ['full_body', 'environmental', 'chest_up', 'face_close'].includes(c.frame)).map(c => c.n);
assert.deepEqual(C.check(base, g, [], keep), [], '고른 칸도 필수 갈래·먼 컷·가까운 컷으로 센다');
/* 장소가 달라도 하는 일은 겹치지 않는다 — GTA V 계획에 쇼핑몰·편의점 「앉아 쉬기」 둘 */
const rest = ['street_mall', 'street_grocery'].map(place => CT.repair(tree, { era: 'now', place, act: 'rest_seat', ofam: 'everyday' }, g, P.spec ? P.spec.CLOSE_FRAMES : []));
assert(rest.every(c => c.act === 'rest_seat'), '두 장소 다 앉아 쉬기');
assert.match(errs(cs => { Object.assign(cs[0], rest[0], { item: '' }); Object.assign(cs[1], rest[1], { item: '' }); return cs; }), /하는 일 rest_seat/);
assert.match(errs(cs => { cs[2].pose = 'walking'; cs[2].act = 'wait_train'; cs[2].place = 'travel_rural_station'; cs[2].era = 'now'; return cs; }), /트리에서 못 고른다|장소/);
/* 기록 폴더 읽기 — 예전 갈래·예시 기록도 변환표로 */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-'));
fs.writeFileSync(path.join(dir, 'casual1-ui.json'), JSON.stringify({ book: g.key, storage: { cards: { [g.key]: { scenes: { casual: { cat: 'travel_exploration', ex: 'travel_station', frame: 'face_close', orient: 'looking_down', lens: 'telephoto135' } } } } } }));
const old = C.oldCuts(dir, g);
assert(old.length === 1 && old[0].place === 'travel_rural_station' && old[0].n === 1, '예전 기록 → 트리 길');
console.log(`PASS 일상컷 묶음 계획: ${design.books.length}권 × 씨앗 셋 ${n}묶음 규칙·기록·고정값 · 필수 갈래 돌리기 · 있는 컷 위에 더 짜기 · 규칙 검사 · 고른 칸 · 예전 기록`);
