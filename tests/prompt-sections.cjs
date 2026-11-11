/* 칸 꼴 — 폼 초상(새 인물 · 이어가기) · 개방 지시문을 core 칸 틀(AtelierSpec.CORE_FRAME, 화풍공방 core v4~ — 삼국지 · 원소와 같은 틀)로 짓는다
   (사용자 2026-11-11 「초안 없이 다 진행해줘」 — 3단계 칸 꼴 통일). 일상컷은 칸 꼴이 없다.
   - 쉰 권 × 세 단계 × (새 인물 · 이어가기 · 개방) + 고른 값 · 판 · 스위치 변주: 여섯 덩어리 · 칸 머리 = CORE_FRAME · 2칸은 해부 줄로 끝 · 빛 줄 하나 · Avoid 는 5칸 맨 끝
   - Avoid 줄 밖에 「No …」 나열 문장이 없다 · 없어진 줄 이름(옛 대문자 머리)을 가리키는 말이 없다 · 찌꺼기(.. · 빈 머리 · {…} · undefined)가 없다
   - 잃은 지시가 없다: 스위치를 끈 줄 꼴 지시문을 마디로 쪼개 칸 꼴에 그대로 있는지 본다. 달라진 마디는 아래 CHANGED 표에 전부 적는다(무엇이 왜).
     거꾸로도 본다 — 칸 꼴의 마디가 줄 꼴에 없으면(새로 쓴 글) 걸린다
   - 스위치: data/style.json "sections" — 끄거나 CORE_FRAME 이 없으면 줄 꼴 그대로
   Run: node tests/prompt-sections.cjs */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const load = () => { const c = { window: {}, console }; vm.createContext(c); for (const f of ['lib/prompt-spec.js', 'lib/casual-tree.js', 'lib/casual-tree-v2.js', 'lib/prompt-book.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), c); return c.window; };
const win = load(), S = win.AtelierSpec, P = win.AtelierPrompt, T = S.BOOK_LINES, CF = S.CORE_FRAME, K = S.BOOK_SECTIONS;
const design = JSON.parse(fs.readFileSync('data/book-design.json', 'utf8')), style = JSON.parse(fs.readFileSync('data/style.json', 'utf8'));
const sk = style.default && style.styles[style.default] ? style.default : Object.keys(style.styles)[0], lf = style.styles[sk], cur = lf.versions.find(v => v.v === lf.current);
const stages = Object.keys(design.vocab.form_key), EN = st => S.STAGE_EN[st].name;

assert(CF && CF.s1 && CF.s2 && CF.s3 && CF.s4 && CF.s5 && CF.anatomy && CF.avoid, 'core 칸 틀(CORE_FRAME) — lib/prompt-spec.js 끝의 core 블록');
assert(K && K.refs && K.heads && K.openKeep, '칸 꼴 표(BOOK_SECTIONS)');
/* 스위치 — data/style.json 최상위 "sections"(판의 "sections": false 는 그 판만 끔). 지금 판은 켜져 있다 */
assert.equal(style.sections, true, 'data/style.json 의 "sections": true');
assert(P.sectionsOn(style, cur), '지금 판은 칸 꼴');
assert(!P.sectionsOn({ ...style, sections: false }, cur) && !P.sectionsOn(style, { ...cur, sections: false }) && P.sectionsOn({}, { sections: true }), '스위치 — 최상위 · 판');
/* 칸 머리 · 해부 줄 · Avoid 줄은 코드 · 표에 다시 적지 않는다(R3) */
for (const f of ['lib/prompt-book.js'])
  for (const w of ['1. STYLE', '2. CHARACTER', '4. SCENE', '5. CONSTRAINTS', 'Avoid: ', 'natural hands with five fingers'])
    assert(!fs.readFileSync(f, 'utf8').includes(w), f + ' 에 칸 틀 글(' + w + ')이 박혀 있다 — CORE_FRAME 에서 꺼낸다');
assert(!/1\. STYLE|5\. CONSTRAINTS|Avoid: \{list\}/.test(fs.readFileSync('lib/prompt-spec.js', 'utf8').split('/* ── core:')[0]), '표에도 칸 머리를 다시 적지 않는다');

const KINDS = { create: { outputMode: 'form', identityMode: 'create' }, reference: { outputMode: 'form', identityMode: 'reference' }, open: { outputMode: 'open' } };
const input = (b, stage, kind, x) => ({ book: b, stage, baseStage: stages[0], styleText: cur.text, styleCheck: cur.check || '', params: [], exposure: S.FORM_EXPOSURE_DEFAULT, ...KINDS[kind], ...x });
const both = (b, stage, kind, x) => [P.buildPrompt(input(b, stage, kind, x)), P.buildPrompt({ ...input(b, stage, kind, x), sections: true })];

/* ── 달라진 마디(R4~R8) — 줄 꼴 마디 → 칸 꼴에 있어야 할 글. 여기 없는 마디는 글자 그대로 있어야 한다 ── */
const R = K.refs, list = s => s.replace(/^no\s+/i, '').split(/,\s*(?:or\s+)?(?:no\s+)?|\s+or\s+(?:no\s+)?/i).filter(Boolean);
const sw = k => [new RegExp(R[k][0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), R[k]];
const CHANGED = [
  /* R5 — 「No …」 나열은 5칸 Avoid 로. 같은 문장의 남은 마디는 문장 처음이 돼 첫 글자를 올린다 */
  ['R5', '한 사람 줄의 금지 나열 → Avoid', /^No second character, no text, /, c => list(c).map(x => [5, x, 'avoid'])],
  ['R5', '비율 줄의 금지 나열 → Avoid', /^No body-part enlargement, no extra limbs$/, c => list(c).map(x => [5, x, 'avoid'])],
  ['R5', '금지 나열이 빠진 문장의 남은 마디 — 첫 글자 대문자', /^pages and spines stay unlettered$/, () => [[5, 'Pages and spines stay unlettered']]],
  ['R5', '고른 계통 풀이의 금지 문장 → Avoid', /^No stereotyped features$/, c => list(c).map(x => [5, x, 'avoid'])],
  ['R5', '옛 화풍 판 글의 금지 마디 → Avoid', /^no (?:neon glow|[a-z -]+, no )/, c => list(c).map(x => [5, x, 'avoid'])],
  /* R6 — 옛 줄 이름(FORM · FACE · STANCE)을 가리키던 말 → 칸 꼴의 자리 말 */
  ['R6', '이어가기 출력 「as FORM says」 — 차림(3칸) · 자세(4칸)는 2칸 아래', ...sw('formSays'), 2],
  ['R6', '이어가기 출력 「the costume FORM describes」 — 3칸 Costume 줄 바로 아래', ...sw('formDescribes'), 3],
  ['R6', '노출 줄 「the FORM costume」 — 3칸 Costume 줄 아래', ...sw('formCostume'), 3],
  ['R6', 'HOLD BACK 끝 「named in FORM」 — 5칸에서 본 3칸', ...sw('formNamed'), 5],
  ['R6', '연출 줄 「her FACE structure」 — 1칸에서 본 2칸 Face 줄(얼굴 줄이 없으면 가리키지 않는다)', ...sw('faceStructure'), 1],
  ['R6', '참고 그림 줄 「follows FACE」 — 1칸에서 본 2칸', ...sw('faceFollows'), 1],
  ['R6', '손 줄 「what STANCE says」 — 4칸 Pose 줄 바로 아래', ...sw('stanceSays'), 4],
  /* R7 — core 해부 줄과 글자 그대로 겹치는 마디는 해부 줄이 말한다 */
  ['R7', '몸 줄의 「one head, two arms and two legs, each joined at its natural joint」 — 해부 줄과 겹침', /^a normal human body — one head, two arms and two legs, each joined at its natural joint$/,
    () => [[2, 'Body: a normal human body — elbows, knees and wrists bend the human way'], [2, CF.anatomy.replace(/^[^:]*:\s*/, '').split(/;\s*/)[0]]]],
  ['R7', '손 줄의 「natural human hands」 — 해부 줄의 natural hands 와 겹침', /^natural human hands$/, () => [[2, CF.anatomy.replace(/^[^:]*:\s*/, '').split(/;\s*/)[1]]]],
  ['R7', '빛 줄은 하나 — 연출 줄의 빛 마디는 4칸 Light 줄로, 화풍 판에 제 빛 줄이 있으면(옛 판 v2~v6) 싣지 않는다', /^warm dramatic backlight with a rim light and strong value contrast$/,
    (c, t) => /^Light\b[^:\n]*: (?!warm dramatic backlight)/m.test(t) ? [] : [[4, 'Light: ' + c + '.']]],
  /* R8 — 고른 값이 표정 · 옷뿐이면 2 · 3칸(위)으로 가고 4칸 아래엔 남는 줄이 없다 */
  ['R8', '고른 값 줄 「Chosen settings below」 — 남은 값이 없으면 above', /^Chosen settings below override the default stance and camera$/, (c, t) => [[4, /\nChosen settings below[^\n]*\n[A-Z]/.test(t) ? c : c.replace(R.chosenBelow[0], R.chosenBelow[1])]]],
  /* R4 — 실루엣 줄의 항목 이름이 줄 머리가 된다 */
  ['R4', '실루엣 줄의 palette 항목 → 3칸 Colours 줄', /^palette: /, c => [[3, 'Colours: ' + c.slice(9)]]],
  ['R4', '실루엣 줄의 attitude 항목 → 4칸 Attitude 줄', /^attitude: /, c => [[4, 'Attitude: ' + c.slice(10)]]],
  /* R1 을 못 지킨 한 곳 — 개방의 Keep 한 문장을 세 칸에 나눴다(3칸이 비지 않게, 첨부 그림의 사람 · 차림 · 구도) */
  ['R1', '개방 「Keep her face, hair, body, costume, camera, framing and subject scale」 → 2 · 3 · 4칸 세 줄', /^Keep her face, hair, body, costume, camera, framing and subject scale$/,
    () => [[2, K.openKeep.character.replace(/\.$/, '')], [3, 'Costume: ' + K.openKeep.costume.replace(/\.$/, '')], [4, 'Composition: ' + K.openKeep.composition.replace(/\.$/, '')]]]
];
/* 줄 머리(R4) — 줄 꼴 머리 → 칸 꼴 머리 · 칸. 머리만 바뀌고 내용은 그대로. 칸 번호 0 은 머리말 */
const HEADS = [
  [/^INPUT: /, 'Input: ', 0], [/^OUTPUT: /, 'Output: ', 0], [/^BOOK: /, 'Book: ', 0], [/^SUBJECT: /, 'Subject: ', 0],
  [/^STYLE: /, '', 1], [/^STYLE REFERENCE: /, 'Style reference: ', 1], [/^PRESENTATION: /, 'Presentation: ', 1],
  [/^AGE: /, 'Age: ', 2], [/^FACE \(([^)]*)\): /, m => 'Face — ' + m[1] + ': ', 2], [/^SILHOUETTE: /, 'Body and hair: ', 2], [/^IDENTITY \(/, 'Identity (', 2],
  [/^EXPRESSION \([A-Z]+\): /, 'Expression: ', 2], [/^MOTIFS \(user choice\): /, 'Motifs (user choice): ', 2], [/^MOTIFS to keep: /, 'Motifs to keep: ', 2],
  [/^ANATOMY: /, 'Proportions: ', 2], [/^BODY: /, 'Body: ', 2],
  [/^FORM — [A-Z]+ \([가-힣]+\): /, 'Costume: ', 3], [/^FORM NOTE: /, 'Form note: ', 3], [/^MATERIAL: /, 'Material: ', 3], [/^GARMENT: /, 'Garment: ', 3], [/^EXPOSURE \(/, 'Exposure (', 3],
  [/^STANCE(?: \(this form\))?: /, 'Pose: ', 4], [/^LOOK-BACK: /, 'Look-back: ', 4], [/^HANDS: /, 'Hands: ', 4], [/^SCENE NOTE: /, 'Scene note: ', 4], [/^NOTE: /, 'Note: ', 4],
  [/^ONE FIGURE ONLY\. /, 'One figure only. ', 5], [/^SOURCE ONLY: /, 'Source only: ', 5], [/^HOLD BACK: /, 'Hold back: ', 5], [/^FINAL CHECK: /, 'Final check: ', 5]
];
/* 칸 꼴에서만 생기는 글 — 칸 머리 · 해부 줄 · Avoid 줄(CORE_FRAME)과 R4 의 새 줄 머리. 거꾸로 견줄 때 줄 꼴에 없어도 된다 */
const NEW_HEADS = Object.values(K.heads).map(h => h.split('{')[0]).concat(['Costume: ', 'Silhouette: ', 'Colours: ', 'Attitude: ', 'Light: ']);
const OLD_NAMES = /\b(?:INPUT|OUTPUT|BOOK|STYLE REFERENCE|SOURCE ONLY|SUBJECT|AGE|MATERIAL|SILHOUETTE|FACE|GARMENT|MOTIFS|FORM|HOLD BACK|EXPOSURE|PRESENTATION|STANCE|LOOK-BACK|EXPRESSION|IDENTITY|ONE FIGURE ONLY|ANATOMY|BODY|HANDS|FINAL CHECK|NOTE)\b/;
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const quotes = s => s.replace(/"[^"]*"/g, '""').replace(/«[^»]*»/g, '«»');
/* 마디 — 문장(마침표 + 대문자 · 따옴표) → 쌍반점. 따옴표 안(설계표 글)은 통째로 */
const clauses = text => { const hold = []; const masked = text.replace(/"[^"]*"/g, m => '\u0001' + (hold.push(m) - 1) + '\u0002');
  return masked.split(/(?<=\.)\s+(?=[A-Z\u0001])/).flatMap(s => s.replace(/\.$/, '').split(/;\s+/)).map(c => c.replace(/\u0001(\d+)\u0002/g, (m, i) => hold[i]).trim()).filter(Boolean); };

const used = {};   /* CHANGED 줄마다 몇 번 걸렸나 — 한 번도 안 걸리는 줄은 죽은 예외 */
function check(id, oldT, newT, o) {
  o = o || {};
  const B = newT.split('\n\n'), lines = newT.split('\n');
  /* 1. 여섯 덩어리 · 칸 머리 = CORE_FRAME · 차례 */
  assert.equal(B.length, 6, id + ' 머리말 + 다섯 칸');
  assert.deepEqual(B.slice(1).map(x => x.split('\n')[0]), [CF.s1, CF.s2, CF.s3.replace('{costume}', K.costume).replace('{genre}', o.genre), CF.s4, CF.s5], id + ' 칸 머리 차례');
  for (const x of B.slice(1)) assert(x.split('\n').length >= 2, id + ' 빈 칸: ' + x);
  assert(/^Input: /.test(B[0]) && /^Output: /m.test(B[0]) && /^Book: «/m.test(B[0]) && B[0].endsWith(T.notes), id + ' 머리말 — 입력 · 출력 · 책 · 따옴표 읽는 법');
  /* 2. 2칸은 해부 줄로 끝 · 빛 줄 하나 이하 · Avoid 는 5칸 맨 끝 한 줄 */
  assert(B[2].endsWith('\n' + CF.anatomy), id + ' 2칸은 해부 줄로 끝난다');
  assert.equal(lines.filter(l => l === CF.anatomy).length, 1, id + ' 해부 줄 한 번');
  const lights = lines.filter(l => /^Light\b[^:]*: /.test(l));
  assert(lights.length <= 1 && (o.oldStyle || lights.length === (o.kind === 'open' ? 0 : 1)), id + ' 빛 줄은 하나(개방은 첨부 그림의 빛 — 없음)');
  const av = lines.filter(l => /^Avoid: /.test(l));
  assert(av.length === 1 && lines[lines.length - 1] === av[0] && /^Avoid: [^.]+\.$/.test(av[0]), id + ' Avoid 는 5칸 맨 끝 한 줄');
  const items = av[0].slice(7, -1).split(', ');
  assert.equal(new Set(items).size, items.length, id + ' Avoid 에 겹치는 낱말');
  /* 3. Avoid 밖에 「No …」 나열 문장이 없다 — 「No added VFX: …」 는 나열이 아니라 연출 선택지의 지시 문장이라 남는다 */
  for (const l of lines) if (!/^Avoid: /.test(l)) assert(!/(?:^|[.;:] )No [a-z]/.test(l.replace(/No added VFX: /, '')) || /unless/.test(l), id + ' 「No …」 나열이 Avoid 밖에: ' + l);
  /* 4. 없어진 줄 이름 · 찌꺼기 */
  const bare = quotes(B[0]) + '\n' + B.slice(1).map(x => x.split('\n').slice(1).join('\n')).map(quotes).join('\n');
  /* 화풍 판 글 · 점검 줄(화풍 자료) · 직접 쓴 글(o.free)은 이 공방 조립의 말이 아니다 */
  const styleOwn = B[1].split('\n').slice(1).filter(l => !/^(?:Presentation|Style reference): /.test(l));
  const own = (o.free || []).reduce((t, x) => t.split(x).join('x'), bare.split('\n').filter(l => !styleOwn.includes(l) && !/^Final check: /.test(l)).join('\n'));
  assert(!OLD_NAMES.test(own), id + ' 옛 줄 이름이 남았다: ' + (own.match(OLD_NAMES) || [])[0]);
  assert(!/\b[A-Z]{3,}\b/.test(own.replace(/the OPEN state/, '').replace(/#[0-9A-F]{6}/g, '').replace(/\b(?:VFX|EVA)\b/g, '')), id + ' 대문자 낱말: ' + (own.match(/\b[A-Z]{3,}\b/g) || []).join(' '));
  assert(!/\.\.|: \.|:\s*$|\{|\}|undefined|\bnull\b|  /m.test(own) && !/\n\n\n/.test(newT), id + ' 찌꺼기: ' + (own.match(/[^\n]*(?:\.\.|: \.|\{|\}|undefined|  )[^\n]*/) || [])[0]);
  assert(!/[가-힣]/.test(quotes(newT).split('\n').filter(l => !styleOwn.includes(l)).join('\n').replace(/^Book: [^\n]*/m, '')), id + ' 따옴표 · 책 줄 · 화풍 글 밖은 영어');
  /* 5. 잃은 지시가 없다 — 줄 꼴의 마디가 칸 꼴에 그대로(머리는 HEADS 대로, 달라진 마디는 CHANGED 대로) */
  const block = n => n === 0 ? B[0] : B[n], has = (n, frag, mode) => mode === 'avoid' ? items.includes(frag) : block(n).includes(frag);
  for (const para of oldT.split('\n\n')) for (const line of para.split('\n')) {
    const hd = HEADS.find(h => h[0].test(line)), m = hd && line.match(hd[0]);
    const body = hd ? line.slice(m[0].length) : line, nh = hd ? (typeof hd[1] === 'function' ? hd[1](m) : hd[1]) : '';
    if (hd && nh && !/^(?:SILHOUETTE|HANDS|ANATOMY|OUTPUT|SUBJECT|ONE FIGURE)/.test(line)) assert(lines.some(l => l.startsWith(nh)) || (/^HANDS/.test(line)), id + ' 줄 머리 ' + m[0] + ' → ' + nh);
    for (const c of clauses(body)) {
      const ch = CHANGED.find(x => x[2].test(c));
      if (ch) {
        used[ch[1]] = (used[ch[1]] || 0) + 1;
        const want = typeof ch[3] === 'function' ? ch[3](c, newT) : [[ch[4], c.replace(ch[2], ch[3][o.noFace && ch[3][2] ? 2 : 1])]];
        for (const [n, frag, mode] of want) assert(has(n, frag, mode), id + ' [' + ch[0] + '] ' + ch[1] + ' — ' + n + '칸에 없다: ' + frag);
        if (ch[0] === 'R6') assert(!newT.includes(c.match(ch[2])[0]), id + ' 옛 줄 이름 말이 남았다: ' + c);
        continue;
      }
      assert(newT.includes(c), id + ' 잃은 마디: ' + c);
      if (hd && hd[2] != null && !/^(?:OUTPUT|SUBJECT|SILHOUETTE|PRESENTATION|ANATOMY|HANDS)/.test(line)) assert(block(hd[2]).includes(c), id + ' ' + hd[2] + '칸에 없다(' + m[0] + '): ' + c);
    }
  }
  /* 6. 거꾸로 — 칸 꼴의 마디는 줄 꼴에 있던 글이다(새로 쓴 글이 없다). 칸 머리 · 해부 줄 · Avoid · 새 줄 머리 · CHANGED 의 새 글만 빼고 */
  const made = new Set([CF.anatomy.replace(/\.$/, ''), R.chosenBelow[1]]);
  for (const x of CHANGED) if (Array.isArray(x[3])) x[3].slice(1).forEach(v => made.add(v));
  const madeHas = c => [...made].some(v => c.includes(v)) || /^Pages and spines stay unlettered$|^a normal human body — elbows, knees|^keep her costume$|^keep her camera, framing and subject scale$|^Keep her face, hair and body$/.test(c);
  for (const [bi, blk] of B.entries()) for (const line of blk.split('\n').slice(bi ? 1 : 0)) {
    if (/^Avoid: /.test(line)) { for (const it of items) assert(new RegExp('\\b[Nn]o ' + esc(it) + '\\b|[,;] (?:or )?' + esc(it) + '\\b').test(oldT) || (o.styleAvoid || []).includes(it), id + ' Avoid 낱말이 줄 꼴에 없다: ' + it); continue; }
    if (line === CF.anatomy) continue;
    let body = line; const nh = NEW_HEADS.concat(HEADS.map(h => typeof h[1] === 'string' ? h[1] : 'Face — ')).filter(Boolean).find(h => body.startsWith(h));
    if (nh) body = body.slice(nh.length);
    for (const c of clauses(body)) {
      if (oldT.includes(c) || madeHas(c)) continue;
      const lc = c.charAt(0).toLowerCase() + c.slice(1);   /* 줄 머리가 된 항목 이름(garment structure · Attitude) · 「her own structure, …」 */
      assert(oldT.includes(lc) || oldT.includes(c.replace(/^([^:]+): /, '$1): ')) || oldT.includes('(' + c.split(': ')[0] + ')'), id + ' 줄 꼴에 없는 글: ' + c);
    }
  }
  /* 7. 낱말 수 — 줄 꼴보다 조금 길다(칸 머리 · 해부 줄) */
  const wo = P.words(oldT), wn = P.words(newT);
  assert(wn <= wo + 45 && wn >= wo - 25 && wn <= (o.max || 880), id + ' 낱말 수 ' + wo + ' → ' + wn);
  return { B, lines, items, words: wn };
}

/* ── 전 범위: 쉰 권 × 세 단계 × 세 갈래 ── */
let n = 0, longest = 0, shortest = 1e9;
for (const b of design.books) for (const stage of stages) for (const kind of Object.keys(KINDS)) {
  const [o, t] = both(b, stage, kind), id = b.key + ' ' + stage + ' ' + kind;
  const r = check(id, o, t, { kind, genre: EN(stage).toUpperCase(), noFace: kind !== 'create' }), B = r.B;
  longest = Math.max(longest, r.words); shortest = Math.min(shortest, r.words); n++;
  /* 칸 대조 — 갈래마다 */
  assert.equal(B[1].split('\n')[1], cur.text, id + ' 1칸 첫 줄은 화풍 판 전문');
  if (kind === 'open') {
    assert(B[0].startsWith("Input: attach this book's " + EN(stage).toLowerCase() + ' form card image') && /^Output: the OPEN state of the attached image/m.test(B[0]), id + ' 머리말');
    assert.equal(B[1].split('\n').length, 2, id + ' 1칸 — 화풍만(연출 줄 없음)');
    assert.deepEqual(B[2].split('\n').slice(1).map(l => l.split(/[ :]/)[0]), ['Keep', 'Age', 'Body', 'Hands', 'Anatomy'], id + ' 2칸 — 첨부 그림의 그 사람 · 나이 · 몸 · 손 · 해부');
    assert.equal(B[3].split('\n')[1], 'Costume: ' + K.openKeep.costume, id + ' 3칸 — 차림은 첨부 그림 그대로');
    assert(B[4].split('\n')[1].startsWith('World: Change the world around her into this scene: "' + b.opens[stage].scene.replace(/"/g, "'") + '". She is the only person;') && /^Composition: keep her camera, framing and subject scale\. The pair must read/m.test(B[4]), id + ' 4칸 — 명장면 · 구도');
    assert(!/Hold back|Exposure|Presentation|Pose:/.test(t), id + ' 개방엔 폼 줄이 없다');
  } else {
    const ref = kind === 'reference';
    assert(B[0].startsWith(ref ? 'Input: the attached image is the approved character (' + EN(stages[0]).toLowerCase() + ' form); keep her.' : 'Input: text only') && /^Output: /m.test(B[0]), id + ' 머리말');
    assert.equal(/^Subject: one adult woman who is the personification of the book itself/m.test(B[0]), !ref, id + ' 머리말의 누구인지(새 인물만)');
    assert(/^Presentation: [^\n]*without replacing it\.$/m.test(B[1]) && !/backlight/.test(B[1]), id + ' 1칸 — 연출 줄(빛 마디는 4칸)');
    if (ref) assert(B[2].split('\n')[1].startsWith('Keep her face, eye and hair colors') && B[2].split('\n')[1].endsWith('as described below.') && B[2].includes('\n' + S.AGE_KEEP.replace(/^AGE/, 'Age')) && !/^(?:Face —|Body and hair:|Persona:)/m.test(B[2]), id + ' 2칸 — 첨부 그림의 그 사람이 맨 위 · 얼굴 · 실루엣 없음');
    else assert(/^Age: /m.test(B[2]) && /^Face — her own structure, not the style's default face: /m.test(B[2]) && /^Body and hair: /m.test(B[2]) && /^Persona: "/m.test(B[2]) && /^Her desire: "/m.test(B[2]) && /^Symbols worn as costume motifs/m.test(B[2]), id + ' 2칸 — 나이 · 얼굴 · 몸과 머리 · 인격 · 상징');
    assert(/^Expression: /m.test(B[2]) && /^Proportions: natural adult proportions/m.test(B[2]) && /^Body: a normal human body — elbows/m.test(B[2]), id + ' 2칸 — 표정 · 비율 · 몸');
    assert.equal(B[3].split('\n')[1], 'Costume: "' + b.forms[stage].look.replace(/"/g, "'") + '".', id + ' 3칸 첫 줄 — 그 단계의 차림');
    assert(/^Battle role: [a-z]+\. This is the (?:question|conflict|answer) stage of her story\.$/m.test(B[3]) && /^Exposure \(bold\): /m.test(B[3]) && B[3].split('\n').pop().startsWith('Exposure ('), id + ' 3칸 — 역할 · 단계 · 노출(맨 끝)');
    if (ref) assert(/^Do not reuse the attached image's outer garment[^\n]*build the costume described above/m.test(B[3]) && /^Garment: whatever the form changes/m.test(B[3]) && !/^(?:Material|Silhouette|Colours): /m.test(B[3]), id + ' 3칸 — 겉옷 바꾸기 · 복식 구조');
    else assert(/^Material: the book's own body becomes her costume/m.test(B[3]) && /^Silhouette: garment structure: .+; main material: /m.test(B[3]) && /^Colours: /m.test(B[3]), id + ' 3칸 — 재료 · 복식 구조 · 색');
    assert.equal(/^Place: The setting is a rich, atmospheric place from her book/m.test(B[4]), !ref, id + ' 4칸 — 곳(새 인물만)');
    assert(B[4].includes('Pose: "' + b.forms[stage].pose.replace(/"/g, "'") + '" — a poised card pose seen from a slightly low camera, held still and easy to read.') && /^Hands: Her hands do only what the pose above says and hold only what it names\./m.test(B[4]) &&
      /^Light: warm dramatic backlight with a rim light and strong value contrast\.$/m.test(B[4]) && B[4].includes('Composition: ' + T.card + (ref ? ' A new card-ready pose is fine.' : '')), id + ' 4칸 — 자세 · 손 · 빛 · 구도(카메라 글 그대로)');
    assert(B[4].indexOf('Pose: ') < B[4].indexOf('Hands: ') && B[3].indexOf('Costume: ') < B[3].indexOf('Exposure ('), id + ' above 가 가리키는 줄이 위에 있다');
    assert(/^Hold back: these climactic scenes belong to the open images/m.test(B[5]) && /An object named in the costume above or in her pose stays\.$/m.test(B[5]) && Object.values(b.opens).every(x => B[5].includes(x.scene.replace(/"/g, "'"))), id + ' 5칸 — 개방 명장면 미루기(글 그대로)');
  }
  assert.equal(B[5].split('\n')[1], 'One figure only. Pages and spines stay unlettered.', id + ' 5칸 첫 줄');
  assert.equal(B[5].includes('\nSource only: ' + T.adaptation.slice(13)), P.isProtected(b), id + ' 5칸 — 보호 중인 책 줄(글 그대로)');
  assert.deepEqual(r.items, ['second character', 'text', 'lettering', 'logo', 'watermark', 'speech bubble', 'frame border'].concat(kind === 'open' ? [] : ['body-part enlargement', 'extra limbs']), id + ' Avoid 낱말');
}
assert(design.books.some(b => P.isProtected(b)) && design.books.some(b => !P.isProtected(b)), '보호 중인 책 · 만료된 책이 다 있다');

/* ── 변주: 고른 값 · 외형 · 참고 그림 · 점검 줄 · 노출 · 자세 없는 폼 · 옛 판 ── */
let vn = 0;
const b0 = design.books.find(x => x.key === 'baskervilles'), turn = design.books.find(x => stages.some(s => S.FORM_LOOK_BACK.some(w => x.forms[s].pose.includes(w))));
const vary = (id, b, stage, kind, x, o) => { const [ot, nt] = both(b, stage, kind, x); vn++; return check('변주 ' + id, ot, nt, { kind, genre: EN(stage).toUpperCase(), noFace: kind !== 'create', max: 1100, ...o }); };   /* 변주는 고른 값만큼 길다 */
for (const kind of Object.keys(KINDS)) {
  /* 참고 그림 · 점검 줄(지금 판엔 없다 — 있는 판으로) · 화풍 판의 avoid 목록 */
  const r = vary('참고 그림 · 점검 ' + kind, b0, stages[1], kind, { styleRef: true, styleCheck: 'rendering is visible linework; not glossy.', styleAvoid: ['plastic skin', 'text'] }, { styleAvoid: ['plastic skin'] });
  assert(/^Style reference: [^\n]*her face follows the face described below or her own approved image\.$/m.test(r.B[1]) && /style reference image/.test(r.B[0]), kind + ' 참고 그림 줄은 1칸 · 입력은 머리말');
  assert(r.B[5].split('\n').slice(-2)[0] === 'Final check: rendering is visible linework; not glossy.' && r.items.includes('plastic skin') && r.items.filter(x => x === 'text').length === 1, kind + ' 점검 줄은 Avoid 바로 위 · 판의 avoid 는 합치고 겹치면 한 번');
}
assert(both(b0, stages[0], 'create', { styleRef: true })[1].startsWith('Input: attach only the style reference image'), '새 인물 + 참고 그림');
for (const kind of ['create', 'reference']) {
  /* 고른 값 — 표정은 2칸, 옷 · 소품은 3칸, 나머지는 4칸의 고른 값 줄 아래. 자세를 고르면 기본 자세 · 손 자세 줄이 빠진다 */
  let r = vary('고른 값 ' + kind, b0, stages[1], kind, { expr: 'soft_smile', pose: 'standing', orient: 'front_3q', frame: 'waist_up', lens: S.LENS_OPTIONS[1][0], camera: 'eye-level camera', scene: 'cold torchlight', outfit: 'a silver brooch', custom: 'wind in her hair', aspect: '3:2', motifs: 'pressed violets', lookNote: 'longer cape' },
    { free: ['eye-level camera', 'cold torchlight', 'a silver brooch', 'wind in her hair', 'pressed violets', 'longer cape'] });
  assert(r.B[2].includes('\nExpression: ' + S.EXPRESSION_DETAIL.soft_smile) && r.lines.filter(l => /^Expression: /.test(l)).length === 1 && r.B[2].includes(kind === 'create' ? '\nMotifs (user choice): pressed violets.' : '\nMotifs to keep: pressed violets.'), kind + ' 고른 표정 · 모티프는 2칸');
  assert(r.B[3].split('\n')[2] === 'Form note: longer cape' && r.B[3].includes('\nOutfit and props: a silver brooch'), kind + ' 폼 세부 · 옷은 3칸');
  const s4 = r.B[4].split('\n'), ci = s4.indexOf(T.sceneRule);
  assert(ci > 0 && s4.slice(ci + 1).map(l => l.split(':')[0]).join('|') === 'Pose|Orientation|Scene|Note|Framing|Lens / perspective|Camera|Aspect ratio' && r.lines.filter(l => /^Pose: /.test(l)).length === 1 && !s4.some(l => /^Hands: Her hands do/.test(l)), kind + ' 4칸 — 고른 값 줄 아래 자세 · 방향 · 구도, 기본 자세 없음');
  r = vary('표정만 ' + kind, b0, stages[1], kind, { expr: 'calm' });
  assert(r.B[4].split('\n').pop() === T.sceneRule.replace('below', 'above') && r.B[2].includes('\nExpression: ' + S.EXPRESSION_DETAIL.calm) && /^Pose: "/m.test(r.B[4]), kind + ' 고른 값이 표정뿐이면 above');
  r = vary('연출 ' + kind, b0, stages[2], kind, { action: Object.fromEntries([['category', S.ACTION_CATEGORIES[0].key], ['example', S.ACTION_CATEGORIES[0].examples[0].key]].concat(S.ACTION_CONTROLS.map(c => [c.key, c.options[0].key]))) });
  assert(/^Action category: /m.test(r.B[4]) && !/^Pose: /m.test(r.B[4]), kind + ' 연출을 고르면 기본 자세 줄이 없다');
  for (const ex of ['', 'low', 'moderate']) {
    r = vary('노출 ' + (ex || '자동') + ' ' + kind, b0, stages[0], kind, { exposure: ex });
    assert.equal(/^Exposure \(/m.test(r.B[3]), !!ex, kind + ' 노출 ' + ex); if (ex) assert(r.B[3].includes('Exposure (' + ex + '): ') && /the costume above/.test(r.B[3]));
  }
  for (const bk of design.books.filter((x, i, a) => a.findIndex(y => S.GARMENT_LAYER[y.silhouette.garment] === S.GARMENT_LAYER[x.silhouette.garment]) === i))   /* 과감 세 갈래(겉옷 · 드러내기 · 한복) */
    assert(vary('과감 ' + bk.key + ' ' + kind, bk, stages[0], kind, {}).B[3].includes(S.FORM_EXPOSURE.bold[S.GARMENT_LAYER[bk.silhouette.garment]].replace(/^EXPOSURE/, 'Exposure').split(R.formCostume[0]).join(R.formCostume[1])), bk.key + ' 과감 갈래');
  /* 자세가 빈 폼 — 공통 카드 자세 · 빈손, 새 인물은 실루엣의 태도 항목이 4칸에 */
  const noPose = { ...b0, forms: { ...b0.forms, [stages[0]]: { ...b0.forms[stages[0]], pose: '' } } };
  r = vary('자세 없는 폼 ' + kind, noPose, stages[0], kind, {});
  assert(r.B[4].includes('Pose: ' + T.stance.slice(8)) && r.B[4].includes('Hands: ' + T.handsDefault) && /^Attitude: /m.test(r.B[4]) === (kind === 'create'), kind + ' 공통 카드 자세');
  if (turn) { const st = stages.find(s => S.FORM_LOOK_BACK.some(w => turn.forms[s].pose.includes(w))); assert(vary('돌아보기 ' + kind, turn, st, kind, {}).B[4].includes('\nLook-back: ' + T.formLookBack.slice(11)), '돌아보는 폼 자세 — 4칸 Look-back'); }
}
assert(turn, '돌아보는 폼 자세가 있는 책(검사가 헛돌지 않게)');
{ /* 외형을 고르면 2칸 Identity — 고른 얼굴 · 체형은 설계 묶음을 이긴다. 계통 풀이의 금지 문장은 Avoid */
  const params = [['face shape', 'oval'], ['body type', 'curvy'], ['hair color', '#1b2a6b'], ['eye color', '#d4a017'], ['second eye color', 'green'], ['facial ethnicity', 'Korean'], ['hairstyle', 'man bun'], ['facial character', 'sharp'], ['body measurements (B/W/H)', '88/60/90'], ['apparent age', '30s']];
  const r = vary('외형', b0, stages[0], 'create', { params }, { free: ['88/60/90'] }), s2 = r.B[2].split('\n'), ii = s2.indexOf('Identity (chosen details override the automatic look)');
  assert(ii > 0 && s2[ii + 1].startsWith('face shape: oval') && r.B[2].includes('\nhair color: #1B2A6B (dark blue)') && r.B[2].includes('\n' + T.measurement) && s2[1] === S.AGE_LINES['30s'].replace(/^AGE/, 'Age') && !/apparent age:/.test(r.B[2]), '2칸 Identity · 고른 나이는 Age 줄');
  assert(r.items.includes('stereotyped features') && /hairstyle: man bun — single rear bun; no gender change/.test(r.B[2]) && !/No stereotyped/.test(r.B[2]), '계통 풀이의 금지 문장은 Avoid, 풀이 안의 「; no …」 는 그 지시의 일부라 남는다');
  const off = vary('설계 끔', b0, stages[0], 'create', { faceDesignOn: false, silhouetteOn: false }, { noFace: true });
  assert(!/^(?:Face —|Body and hair:)/m.test(off.B[2]) && !/^(?:Silhouette|Colours): /m.test(off.B[3]) && /within her own face structure;/.test(off.B[1]), '얼굴 · 실루엣 설계를 끄면 그 줄이 없고 연출 줄도 얼굴 줄을 가리키지 않는다');
  const refOff = vary('이어가기 복식 끔', b0, stages[1], 'reference', { silhouetteOn: false });
  assert(!/^Garment: /m.test(refOff.B[3]), '실루엣을 끄면 이어가기 복식 줄도 없다');
}
{ /* 개방의 덧글 — 4칸, 명장면 줄 아래 */
  const r = vary('개방 덧글', b0, stages[2], 'open', { lookNote: 'thicker fog', custom: 'moonlight' }, { free: ['thicker fog', 'moonlight'] });
  assert.deepEqual(r.B[4].split('\n').slice(2, 4), ['Scene note: thicker fog', 'Note: moonlight'], '개방 덧글');
}
/* 옛 화풍 판(생성기에서 고를 수 있다) — 문단이 여럿이어도 여섯 덩어리, 「; no a, no b」 는 Avoid */
for (const v of lf.versions) for (const kind of Object.keys(KINDS)) {
  const r = vary('판 ' + v.v + ' ' + kind, b0, stages[0], kind, { styleText: v.text, styleCheck: v.check || '' }, { oldStyle: true });
  assert(v.text.split(/\n+/).every(l => r.B[1].includes(P.splitNo(l).text)), v.v + ' 화풍 글이 1칸에');
}

/* ── 스위치를 끄면 줄 꼴 그대로 — sections 가 없거나, core 블록(CORE_FRAME)이 없을 때 ── */
{
  const bare = load(); delete bare.AtelierSpec.CORE_FRAME;
  for (const kind of Object.keys(KINDS)) {
    const [o, t] = both(b0, stages[0], kind);
    assert(o !== t && /^INPUT: /.test(o) && !o.includes(CF.s1) && o.split('\n\n').length > 6, kind + ' 스위치를 끄면 줄 꼴');
    assert.equal(bare.AtelierPrompt.buildPrompt({ ...input(b0, stages[0], kind), sections: true }), o, kind + ' CORE_FRAME 이 없으면 줄 꼴');
  }
  assert(!bare.AtelierPrompt.sectionsOn(style, cur), 'CORE_FRAME 이 없으면 스위치도 꺼진 것으로');
}
/* 일상컷은 칸 꼴이 없다 — 스위치가 켜져도 그대로 */
{
  const tree = JSON.parse(fs.readFileSync('data/casual-tree.json', 'utf8')), tree2 = JSON.parse(fs.readFileSync('data/casual-tree-v2.json', 'utf8'));
  for (const x of [{ tree }, { tree, tree2, treeV: 2 }]) assert.equal(P.buildCasual({ book: b0, styleText: cur.text, ...x, sections: true }), P.buildCasual({ book: b0, styleText: cur.text, ...x }), '일상컷은 그대로');
}
/* 부르는 쪽이 스위치를 읽는다 — 생성기 화면 · 지시문 묶음 */
assert(/sections:P\.sectionsOn\(/.test(fs.readFileSync('lib/prompt-ui.js', 'utf8')) && /sections: P\.sectionsOn\(/.test(fs.readFileSync('tools/prompt-pack.cjs', 'utf8')), '생성기 화면 · 지시문 묶음이 스위치를 넘긴다');
const dead = CHANGED.filter(x => !used[x[1]]).map(x => x[1]);
assert.deepEqual(dead, [], '한 번도 안 걸린 예외(죽은 줄)');
console.log(`PASS 칸 꼴 지시문: ${design.books.length}권 × 단계 ${stages.length} × (새 인물 · 이어가기 · 개방) = ${n}장 + 변주 ${vn}장 · 칸 머리 = core 칸 틀 · 2칸 끝 해부 줄 · 빛 줄 하나 · Avoid 맨 끝 · 옛 줄 이름 없음 · 잃은 마디 0(달라진 마디 ${CHANGED.length}가지는 표에) · 새로 쓴 글 0 · 낱말 ${shortest}~${longest} · 스위치 끄면 줄 꼴`);
