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
  const create = P.buildPrompt({ outputMode: 'form', book: b, stage, styleText: text, identityMode: 'create', params: [] });
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
    assert(!/[가-힣]/.test(t.replace(/"[^"]*"/g, '').replace(/«[^»]*»/g, '').replace(/BOOK:[^\n]*/, '').replace(/\([발전결][단개말]\)/g, '')),
      '설계표 글(따옴표 안)·책 줄 말고는 영어: ' + b.key + ' ' + stage);
    longest = Math.max(longest, P.words(t)); n++;
  }
}
assert(longest <= 700, '가장 긴 프롬프트가 700 낱말을 넘는다: ' + longest);

/* 3. 직접 고른 얼굴·체형은 설계표 묶음을 이긴다(그 묶음이 FACE·SILHOUETTE 줄에서 빠진다) */
const b = design.books[0];
const mine = P.buildPrompt({ outputMode: 'form', book: b, stage: '발단', styleText: text, params: [['face shape', 'oval'], ['body type', 'curvy']] });
assert(!mine.includes(S.VOCAB_EN.face_shape[b.face.face_shape]) && mine.includes('face shape: oval'), '직접 고른 윤곽이 이긴다');
assert(!mine.includes(S.VOCAB_EN.body[b.silhouette.body] + ' build') && mine.includes('body type: curvy'), '직접 고른 체형이 이긴다');
const off = P.buildPrompt({ outputMode: 'form', book: b, stage: '발단', styleText: text, faceDesignOn: false, silhouetteOn: false });
assert(!off.includes('FACE (') && !off.includes('SILHOUETTE:'), '끄면 빠진다');

/* 4. 일상컷 — 갈래·예시·세 축, 서고의 일상 */
const cas = P.buildCasual({ book: b, styleText: text, cat: 'library_life', ex: 'lib_binding', axes: { overall_intensity: 'strong', skin_exposure: 'bold' } });
assert(cas.includes('Stitching a book block') && cas.includes('overall_intensity: strong') && cas.startsWith('INPUT: the attached image'), '일상컷 조립');
assert(!/Pok[eé]mon|포켓몬/.test(JSON.stringify(S)), '표에 포켓몬 말이 남았다');
for (const r of S.CATS) if (r[0] !== 'auto_random' && r[0] !== '__custom__') assert((S.EXAMPLE_MAP[r[0]] || []).length, r[0] + ' 예시가 없다');
assert(!S.ACTION_CONTROLS.some(c => c.key === 'equipment'), '책은 빈손 — 무장 고르기가 없다');

/* 5. 화풍 블록은 책 줄 바로 뒤, 판의 점검 줄은 맨 끝, 참고 그림이 있으면 "그리는 방식만" (2026-10-15 시범 세 묶음) */
const cur = lf.versions.find(v => v.v === lf.current);
const full = { book: b, stage: '발단', styleText: cur.text, styleCheck: cur.check, styleRef: !!(cur.reference || {}).path, params: [] };
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

/* 6. 화풍 문장이 없으면 만들지 않는다 */
assert.throws(() => P.buildPrompt({ outputMode: 'form', book: b, stage: '발단', styleText: '' }), /Style text/);
console.log(`PASS 책 프롬프트: ${design.books.length}권 × 폼 3 × (새 인물·이어가기·개방) ${n}개 · 가장 긴 것 ${longest}낱말 · 정한 말 영어 · 직접 고른 값 우선 · 일상컷 · 빈손 · 화풍 ${lf.current} 앞에·점검 끝에·참고 그림은 방식만`);
