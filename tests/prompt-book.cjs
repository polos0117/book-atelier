/* 책 프롬프트 — 설계표 다섯 권 × 세 폼 × (새 인물·이어가기·개방) + 일상컷이 다 조립되고, 정한 말이 다 영어로 풀린다.
   Run: node tests/prompt-book.cjs */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const ctx = { window: {}, console }; vm.createContext(ctx);
for (const f of ['lib/prompt-spec.js', 'lib/prompt-book.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
const S = ctx.window.AtelierSpec, P = ctx.window.AtelierPrompt;
const design = JSON.parse(fs.readFileSync('data/book-design.json', 'utf8'));
const style = JSON.parse(fs.readFileSync('data/style.json', 'utf8'));
const lf = style.styles.literary_fantasy, text = lf.versions.find(v => v.v === lf.current).text;
const V = design.vocab;
const q = s => String(s).replace(/"/g, "'");   // 조립부가 글 속 큰따옴표를 작은따옴표로 바꾼다

/* 1. 정한 말이 다 영어로 — 설계표에 새 말을 더하고 표를 안 고치면 여기서 걸린다 */
for (const axis of ['genre', 'role', 'body', 'hair', 'garment', 'material', 'pose', 'palette', 'face_shape', 'eyes', 'brows', 'nose', 'lips'])
  for (const w of V[axis]) assert(S.VOCAB_EN[axis] && S.VOCAB_EN[axis][w], axis + ' ' + w + ' 의 영어가 없다(lib/prompt-spec.js VOCAB_EN)');
for (const stage of Object.keys(V.form_key)) assert(S.STAGE_EN[stage], stage + ' 의 영어 이름이 없다');

/* 2. 다섯 권 × 세 폼 × 갈래 — 다 조립되고, 설계표 글이 제자리에 들어간다 */
let n = 0, longest = 0;
for (const b of design.books) for (const stage of Object.keys(V.form_key)) {
  const create = P.buildPrompt({ outputMode: 'form', book: b, stage, styleText: text, styleCheck: lf.versions.find(v => v.v === lf.current).check, identityMode: 'create', params: [], exposure: 'bold' });
  assert(create.includes(q(b.persona)) && create.includes(q(b.forms[stage].look)) && create.includes(q(b.form_material)), b.key + ' ' + stage + ' 새 인물에 설계표 글');
  assert(create.includes('FACE (') && create.includes('SILHOUETTE:') && create.startsWith('INPUT: text only'), b.key + ' 새 인물에 얼굴·실루엣');
  assert(create.includes(text), '화풍 판 전문이 그대로');
  const ref = P.buildPrompt({ outputMode: 'form', book: b, stage, baseStage: '발단', styleText: text, identityMode: 'reference', params: [['apparent age', '20s']] });
  assert(!ref.includes('FACE (') && !ref.includes('SILHOUETTE:') && !ref.includes('IDENTITY'), '이어가기는 첨부 그림이 정한다 — 얼굴·실루엣·외형을 싣지 않는다');
  assert(ref.includes('the attached image is the approved character (beginning form)'), '이어가기는 첨부할 확정 그림을 말한다');
  const open = P.buildPrompt({ outputMode: 'open', book: b, stage, styleText: text });
  assert(open.includes(q(b.opens[stage].scene)) && /^INPUT: attach this book's \w+ form card image/.test(open), b.key + ' ' + stage + ' 개방에 명장면');
  assert(!open.includes(q(b.persona)), '개방은 첨부 그림이 인물을 정한다');
  for (const t of [create, ref, open]) {
    assert(t.includes('ONE FIGURE ONLY') && t.includes('HANDS'), '한 명·손 줄');
    assert(!/[가-힣]/.test(t.replace(/"[^"]*"/g, '').replace(/«[^»]*»/g, '').replace(/BOOK:[^\n]*/, '').replace(/STYLE: [^\n]*/, '').replace(/\([발전결][단개말]\)/g, '')),
      '설계표 글(따옴표 안)·책 줄·화풍 줄 말고는 영어: ' + b.key + ' ' + stage);
    longest = Math.max(longest, P.words(t)); n++;
  }
}
assert(longest <= 760, '가장 긴 프롬프트(과감 노출·점검 줄 포함)가 760 낱말을 넘는다: ' + longest);

/* 3. 직접 고른 얼굴·체형은 설계표 묶음을 이긴다(그 묶음이 FACE·SILHOUETTE 줄에서 빠진다) */
const b = design.books[0];
const mine = P.buildPrompt({ outputMode: 'form', book: b, stage: '발단', styleText: text, params: [['face shape', 'oval'], ['body type', 'curvy']] });
assert(!mine.includes(S.VOCAB_EN.face_shape[b.face.face_shape]) && mine.includes('face shape: oval'), '직접 고른 윤곽이 이긴다');
assert(!mine.includes(S.VOCAB_EN.body[b.silhouette.body] + ' build') && mine.includes('body type: curvy'), '직접 고른 체형이 이긴다');
const off = P.buildPrompt({ outputMode: 'form', book: b, stage: '발단', styleText: text, faceDesignOn: false, silhouetteOn: false });
assert(!off.includes('FACE (') && !off.includes('SILHOUETTE:'), '끄면 빠진다');

/* 4. 일상컷 — 갈래·예시·세 축, 서고의 일상 */
const cas = P.buildCasual({ book: b, styleText: text, cat: 'library_life', ex: 'lib_binding', axes: { overall_intensity: 'strong', skin_exposure: 'bold' } });
assert(cas.includes(S.BOOK_LINES.casualWardrobe), '일상컷은 첨부 그림의 옷을 버리고 장면의 옷을 입는다');
assert(cas.includes('Stitching a book block') && cas.includes('overall_intensity: strong') && cas.startsWith('INPUT: the attached image'), '일상컷 조립');
assert(!/Pok[eé]mon|포켓몬/.test(JSON.stringify(S)), '표에 포켓몬 말이 남았다');
for (const r of S.CATS) if (r[0] !== 'auto_random' && r[0] !== '__custom__') assert((S.EXAMPLE_MAP[r[0]] || []).length, r[0] + ' 예시가 없다');
assert(!S.ACTION_CONTROLS.some(c => c.key === 'equipment'), '책은 빈손 — 무장 고르기가 없다');

/* 5. 화풍 블록은 책 줄 바로 뒤, 판의 점검 줄은 맨 끝, 참고 그림이 있으면 "그리는 방식만" (2026-10-15 시범 세 묶음) */
const cur = lf.versions.find(v => v.v === lf.current);
/* 자리 검사는 점검 줄이 있는 판으로 본다(지금 판 v7 은 점검 줄이 없다) */
const full = { book: b, stage: '발단', styleText: cur.text, styleCheck: cur.check || 'rendering check.', styleRef: true, params: [] };   // 참고 그림을 켰을 때
for (const [name, t] of [['새 인물', P.buildPrompt({ ...full, outputMode: 'form' })], ['이어가기', P.buildPrompt({ ...full, outputMode: 'form', identityMode: 'reference', baseStage: '발단' })],
  ['개방', P.buildPrompt({ ...full, outputMode: 'open' })], ['일상', P.buildCasual({ ...full, cat: 'library_life', ex: 'lib_binding' })]]) {
  const parts = t.split('\n\n');
  assert(parts.findIndex(x => x.startsWith('STYLE: ')) <= 2, name + ' — 화풍 블록이 앞쪽(입력·책 다음)');
  assert(parts[parts.length - 1].startsWith('FINAL CHECK: '), name + ' — 맨 끝에 화풍 점검');
  if (full.styleRef) assert(t.includes('STYLE REFERENCE:') && /style reference image/.test(parts[0]), name + ' — 참고 그림을 첨부하고 그리는 방식만');
}
if (full.styleRef) assert(P.buildPrompt({ ...full, outputMode: 'form' }).startsWith('INPUT: attach only the style reference image'), '새 인물은 참고 그림만 첨부');
assert(!P.buildPrompt({ ...full, outputMode: 'form', styleRef: false, styleCheck: '' }).includes('FINAL CHECK'), '점검이 없는 판은 그 줄도 없다');
assert(!/game character art/.test(cur.text), '지금 판 첫 줄이 게임 키아트로 끌지 않는다');

/* 6. 폼 초상의 노출 — 고른 수준만 싣는다(자동이면 줄 없음). 지금 판 문장에 "노출은 책 설계를 따른다" 가 없다. 목·어깨 줄 */
const exp = k => P.buildPrompt({ ...full, styleRef: false, outputMode: 'form', exposure: k });
assert(exp('bold').includes('deep open neckline') && exp('bold').includes('Nothing slipped off'), '과감 줄');
for (const bk of design.books) {   /* 과감은 의상 구조에 맞는 갈래 — 겉옷 폼은 양 어깨에 제대로, 한복은 깃·동정 */
  const layer = S.GARMENT_LAYER[bk.silhouette.garment] || 'open';
  const t = P.buildPrompt({ outputMode: 'form', book: bk, stage: '발단', styleText: text, exposure: 'bold' });
  assert(t.includes(S.FORM_EXPOSURE.bold[layer]), bk.key + ' 과감 갈래 ' + layer);
}
assert(Object.keys(S.GARMENT_LAYER).sort().join() === V.garment.slice().sort().join(), '복식 구조 정한 말마다 과감 갈래가 있다');
assert(P.buildPrompt({ outputMode: 'form', book: design.books.find(x => x.key === 'kosmos'), stage: '결말', styleText: text, exposure: 'bold' }).includes('both shoulders'), '코스모스(코트) — 겉옷은 양 어깨에');
assert(P.buildPrompt({ outputMode: 'form', book: design.books.find(x => x.key === 'chunhyang'), stage: '발단', styleText: text, exposure: 'bold' }).includes('dongjeong'), '춘향전(한복) — 깃·동정');
assert(!exp('').includes('EXPOSURE'), '자동이면 노출 줄이 없다');
assert(exp('low').includes('EXPOSURE (low)') && !exp('low').includes('EXPOSURE (bold)'));
assert(!P.buildPrompt({ ...full, outputMode: 'open', exposure: 'bold' }).includes('EXPOSURE'), '개방은 첨부 그림의 차림 그대로');
assert.equal(S.FORM_EXPOSURE_DEFAULT, 'bold');
assert(!/exposure follow the book brief/.test(cur.text), '지금 판은 노출을 책 설계에 미루지 않는다 — 노출은 생성기 칸(EXPOSURE 줄)');
assert(exp('bold').includes('never a smaller head or a longer neck') && exp('bold').includes('7.5 heads'), '목·어깨·등신 줄');
assert(!S.PARAM_GUIDES['torso / chest build']['full bust'][1].includes('without widening'), '큰 가슴 설명이 어깨를 좁히지 않는다');

/* 7. 나이 — 자동이면 20대, SUBJECT 바로 뒤. 고른 나이는 그 줄로, 외형 목록에는 다시 안 싣는다. 첨부 그림이 정하는 갈래는 나이를 지킨다 */
const age = params => P.buildPrompt({ outputMode: 'form', book: b, stage: '발단', styleText: text, params });
const parts0 = age([]).split('\n\n'), si = parts0.findIndex(x => x.startsWith('SUBJECT:'));
assert(parts0[si + 1] === S.AGE_LINES['20s'], '자동이면 20대 줄이 SUBJECT 바로 뒤');
assert(age([['apparent age', '40s']]).includes(S.AGE_LINES['40s']) && !age([['apparent age', '40s']]).includes(S.AGE_LINES['20s']));
assert(!/apparent age:/.test(age([['apparent age', '20s'], ['hair color', 'black']])), '나이는 외형 목록에 다시 안 싣는다');
for (const t of [P.buildPrompt({ ...full, styleRef: false, outputMode: 'form', identityMode: 'reference', baseStage: '발단' }), P.buildPrompt({ ...full, outputMode: 'open' }), P.buildCasual({ ...full, cat: 'library_life', ex: 'lib_binding' })])
  assert(t.includes(S.AGE_KEEP) && !t.includes(S.AGE_LINES['20s']), '첨부 그림이 정하는 갈래는 나이를 지키고 주름을 더하지 않는다');
assert(cur.text.split(/\s+/).length <= 40, '지금 판 화풍은 짧다 — 긴 문단이 모델의 해석을 덮어써 판마다 흔들렸다(v2~v6)');
if (!cur.check) assert(!P.buildPrompt({ outputMode: 'form', book: b, stage: '발단', styleText: cur.text, styleCheck: cur.check }).includes('FINAL CHECK'), '점검 줄이 없는 판은 점검 줄도 없다');
assert(!/storybook|watercolor washes|muted, |gentle contrast|simplified into/.test(cur.text), '지금 판이 옅은 수채 동화를 주문하지 않는다(v2~v4 의 실수)');

/* 8. 화풍 문장이 없으면 만들지 않는다 */
// 연출 — 화려함·장식·역광·서 있는 카드 자세는 화풍 줄이 아니라 이 두 줄이 쥔다(돈키호테 v7 시범). 폼 초상에만, 자세·연출을 고르면 STANCE 는 빠진다
const pf = P.buildPrompt({ outputMode: 'form', book: b, stage: '발단', styleText: text, exposure: 'bold' }).split('\n\n');
const pi = pf.indexOf(S.BOOK_LINES.presentation);
assert(pi > 0 && pf[pi - 1].startsWith('EXPOSURE') && pf[pi + 1].startsWith('STANCE') && pf[pi + 2].startsWith('OUTPUT:'), '노출 → 연출 → 자세 → 출력');
assert(P.buildPrompt({ ...full, styleRef: false, outputMode: 'form', identityMode: 'reference', baseStage: '발단', stage: '전개' }).includes(S.BOOK_LINES.presentation), '이어가기에도 연출 줄');
assert(!P.buildPrompt({ outputMode: 'form', book: b, stage: '발단', styleText: text, pose: 'standing' }).includes('STANCE'), '자세를 고르면 기본 자세 줄이 빠진다');
assert(!P.buildPrompt({ outputMode: 'form', book: b, stage: '발단', styleText: text, action: { category: S.ACTION_CATEGORIES[0].key } }).includes('STANCE'), '연출을 고르면 기본 자세 줄이 빠진다');
for (const m of ['open', 'casual']) assert(!P.buildPrompt({ ...full, outputMode: m }).includes('PRESENTATION:'), m + ' 은 첨부 그림 그대로 — 연출 줄 없음');
assert(!/Default stance follows the SILHOUETTE/.test(S.BOOK_LINES.createOutput) && pf.join('\n').includes('attitude: '), '실루엣 자세는 태도로만');
// 폼마다 자세 — 설계표 pose 가 기본 STANCE. 고른 자세가 있으면 빠지고, 손 줄은 "빈손" 대신 자세를 따른다
for (const bk of design.books) for (const stage of Object.keys(V.form_key)) {
  const t = P.buildPrompt({ outputMode: 'form', book: bk, stage, styleText: text });
  assert(t.includes('STANCE (this form): "' + q(bk.forms[stage].pose) + '"') && t.includes(S.BOOK_LINES.handsPose) && !t.includes(S.BOOK_LINES.handsDefault), bk.key + ' ' + stage + ' 폼 자세');
}
const noPose = { ...b, forms: { ...b.forms, '발단': { ...b.forms['발단'], pose: '' } } };
assert(P.buildPrompt({ outputMode: 'form', book: noPose, stage: '발단', styleText: text }).includes(S.BOOK_LINES.stance), '자세가 빈 폼은 공통 카드 자세');
assert(!P.buildPrompt({ outputMode: 'open', book: b, stage: '발단', styleText: text }).includes('STANCE'), '개방은 첨부 그림의 자세 그대로');
// 색 RGB — 코드와 색 이름(myth 와 같다). 색 칸이 아닌 항목의 # 값은 그대로
assert(P.buildPrompt({ outputMode: 'form', book: b, stage: '발단', styleText: text, params: [['hair color', '#1b2a6b'], ['eye color', '#d4a017']] })
  .match(/hair color: #1B2A6B \(dark blue\)[\s\S]*both eyes are #D4A017 \(vivid medium golden amber\)/), '머리·눈 RGB');
assert.equal(P.hexName('#ffffff'), 'white');
// 손 — 엄지가 반대쪽에 붙은 손이 나왔다(햄릿 일상컷, 탁자 짚은 오른손). 손 줄은 엄지 자리와 손가락 차례까지
assert(S.BOOK_LINES.hands.includes('thumb on its inner side') && S.BOOK_LINES.handsKeep.includes('mirrored'), '손 줄에 엄지 방향');
// 경찰·간호사 — 금지어만 있어 부품이 없었다. 옷 부품 + 동작, 극장 말 없이(햄릿이 무대 의상으로 끌려갔다)
for (const ex of ['adult_police', 'adult_nurse']) {
  const t = P.buildCasual({ book: design.books.find(x => x.key === 'hamlet'), styleText: text, cat: 'adult_roleplay', ex });
  assert(/cap/.test(t) && !/theatrical/.test(t) && t.includes('never restyle the chosen outfit'), ex);
}
// 원작 시대 — 고르면 시대·지역 줄, 기본(현대)은 없다
{ const hm = design.books.find(x => x.key === 'hamlet'), base = { book: hm, styleText: text, cat: 'adult_roleplay', ex: 'adult_police' };
  const now = P.buildCasual(base), then = P.buildCasual({ ...base, era: 'book' });
  assert(!now.includes('ERA:') && then.includes('ERA: set this scene') && then.includes(q(hm.era)) && then.includes(q(hm.region)) && then.includes('city watch'), '원작 시대');
  assert(then.indexOf('ERA:') > then.indexOf('WARDROBE:') && then.indexOf('ERA:') < then.indexOf('SCENE (chosen)'), '시대 줄은 옷 줄 뒤, 장면 앞');
  assert(!P.buildPrompt({ outputMode: 'form', book: hm, stage: '발단', styleText: text, era: 'book' }).includes('ERA:'), '폼 초상에는 없다'); }
// 전통 의상 — 고른 전통이 책의 지역을 이긴다(돈키호테 아오자이). 장면 문장이 없던 예시는 짜임을 적는다
const ao = P.buildCasual({ book: design.books.find(x => x.key === 'don_quixote'), styleText: text, cat: 'traditional', ex: 'aodai_daily' });
assert(ao.includes('wins over her book') && ao.includes('mandarin collar') && ao.includes('wide-leg silk trousers'), '아오자이');
for (const [cat, rows] of Object.entries(S.EXAMPLE_MAP)) for (const r of rows) if (r[0] && r[0] !== '__custom__') {
  assert(r[5] || S.EXAMPLE_DETAIL[r[0]], cat + ' · ' + r[0] + ' 장면 문장이 없다 — 이름만 실린다(lib/prompt-spec.js EXAMPLE_DETAIL)');
  const t = P.buildCasual({ book: b, styleText: text, cat, ex: r[0] });
  assert(P.words(t) <= 760, cat + ' · ' + r[0] + ' 일상컷이 760 낱말을 넘는다');
}
assert(!/thruster|cockpit|Gundam|Pok[eé]mon/i.test(Object.values(S.EXAMPLE_DETAIL).join(' ')), '예시 풀이에 건담·포켓몬 말이 없다');
// 한복 — 한 낱말로는 한푸로 갔다(춘향전). 새 인물은 실루엣에, 이어가기는 GARMENT 줄에 구조를 싣는다
const ch = design.books.find(x => x.key === 'chunhyang');
assert(P.buildPrompt({ outputMode: 'form', book: ch, stage: '발단', styleText: text }).includes('jeogori') , '새 인물 — 한복 풀이');
const chRef = P.buildPrompt({ outputMode: 'form', book: ch, stage: '결말', baseStage: '발단', identityMode: 'reference', styleText: text });
assert(chRef.includes('GARMENT: ') && chRef.includes('not Chinese hanfu') && chRef.includes('jokduri'), '이어가기 — 한복 구조를 지킨다');
assert(!P.buildPrompt({ outputMode: 'open', book: ch, stage: '결말', styleText: text }).includes('GARMENT: '), '개방은 첨부 그림의 차림 그대로');
assert.throws(() => P.buildPrompt({ outputMode: 'form', book: b, stage: '발단', styleText: '' }), /Style text/);
console.log(`PASS 책 프롬프트: ${design.books.length}권 × 폼 3 × (새 인물·이어가기·개방) ${n}개 · 가장 긴 것 ${longest}낱말 · 정한 말 영어 · 직접 고른 값 우선 · 일상컷 · 빈손 · 화풍 ${lf.current} 앞에·점검 끝에·참고 그림은 방식만 · 노출 칸·목 · 나이 줄(기본 20대) · 연출·카드 자세·폼 자세 · 한복 구조`);
