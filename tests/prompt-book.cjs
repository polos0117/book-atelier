/* 책 프롬프트 — 설계표 다섯 권 × 세 폼 × (새 인물·이어가기·개방) + 일상컷이 다 조립되고, 정한 말이 다 영어로 풀린다.
   Run: node tests/prompt-book.cjs */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const ctx = { window: {}, console }; vm.createContext(ctx);
for (const f of ['lib/prompt-spec.js', 'lib/casual-tree.js', 'lib/prompt-book.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
const S = ctx.window.AtelierSpec, P = ctx.window.AtelierPrompt, CT = ctx.window.AtelierCasualTree, T = S.BOOK_LINES;
const tree = JSON.parse(fs.readFileSync('data/casual-tree.json', 'utf8'));
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
// 몸 개수 줄 BODY 와 일상컷 HAND TASK 로 40낱말쯤 늘었다(2026-10-27). 폼 자세가 돌아보기면 LOOK-BACK 줄 20낱말(2026-10-29, 눈물을 마시는 새 발단 807)
assert(longest <= 820, '가장 긴 프롬프트(과감 노출·점검 줄 포함)가 820 낱말을 넘는다: ' + longest);

/* 3. 직접 고른 얼굴·체형은 설계표 묶음을 이긴다(그 묶음이 FACE·SILHOUETTE 줄에서 빠진다) */
const b = design.books[0];
const mine = P.buildPrompt({ outputMode: 'form', book: b, stage: '발단', styleText: text, params: [['face shape', 'oval'], ['body type', 'curvy']] });
assert(!mine.includes(S.VOCAB_EN.face_shape[b.face.face_shape]) && mine.includes('face shape: oval'), '직접 고른 윤곽이 이긴다');
assert(!mine.includes(S.VOCAB_EN.body[b.silhouette.body] + ' build') && mine.includes('body type: curvy'), '직접 고른 체형이 이긴다');
const off = P.buildPrompt({ outputMode: 'form', book: b, stage: '발단', styleText: text, faceDesignOn: false, silhouetteOn: false });
assert(!off.includes('FACE (') && !off.includes('SILHOUETTE:'), '끄면 빠진다');

/* 4. 일상컷 — 트리 길(시대 → 장소 → 하는 일 → 의상 → 구도, 2026-10-29 game-atelier 에서 옮김). 갈래 설명 문단·예시 문장은 없다 */
const cas = (x = {}) => P.buildCasual({ book: b, tree, styleText: text, ...x });
const sceneOf = t => t.split('SCENE (chosen):\n')[1].split('\n\n')[0];
const plain = cas();
assert(!/\nCategory: |\nExample scene: /.test(plain), '갈래 설명·예시 문장이 남았다');
assert(sceneOf(plain).startsWith('Place: ' + CT.place(tree, 'street_cafe').en + '\nActivity: ' + CT.act(tree, 'coffee_takeout').en + '\nOutfit: ' + CT.family(tree, 'everyday').en), '기본 길 — 카페·커피·평상복');
assert(!plain.includes('WORLD:') && !plain.includes('SCREENS:') && !plain.includes('ERA:') && !plain.includes('ADAPTATION:'), '지금 현실 기본');
assert(plain.includes(T.casualWardrobe) && plain.includes(T.casualPose) && plain.includes(T.casualOutput), '옷·각도·출력 줄');
assert(plain.includes(T.figureCasual) && !plain.includes(T.figure), '일상컷은 배경 인물 허용 줄(붐비는 장소) — 폼·개방은 한 명만');
/* 옷 — 고른 옷 > 계열 풀이, 직접 쓴 옷이 이긴다 */
const lace = cas({ era: 'now', place: 'home_bedroom', act: 'dress_up', ofam: 'lingerie', item: 'lace_set' });
assert(sceneOf(lace).includes('Outfit: ' + CT.item(tree, 'lingerie', 'lace_set').en), '고른 옷');
assert(sceneOf(cas({ era: 'now', place: 'home_bedroom', act: 'dress_up', ofam: 'lingerie', item: 'lace_set', outfit: 'a red silk robe' })).includes('Outfit: a red silk robe'), '직접 쓴 옷이 이긴다');
/* 시대 — 이야기 세계 안은 WORLD(설계표 place, 예전 「이야기 속 장소」), 무대·환상은 SETTING, 원작 시대는 ERA */
const world = cas({ era: 'in_story', place: 'story_bath', act: 'soak', ofam: 'bath' });
assert(world.includes('WORLD: this scene happens inside the world of «' + b.title + '», as if she simply lives there — ' + q(b.place) + '.') && !world.includes('ERA:'), '이야기 세계 안');
assert(sceneOf(cas({ era: 'in_story', place: 'story_place', act: 'stroll', ofam: 'everyday' })).startsWith('Place: the place named in WORLD'), '그 책의 장소는 WORLD 를 가리킨다');
assert(cas({ era: 'fantasy', place: 'fx_studio', act: 'editorial_pose', ofam: 'editorial' }).includes(T.casualFantasy), '무대·환상');
assert(CT.places(tree, 'in_story', b).every(p => p.group === 'story') && CT.places(tree, 'now', b).every(p => p.group !== 'story'), '이야기 세계 안은 그 세계의 장소만');
/* 각색 무대 — 장소 묶음 adapt 에만 ADAPTATION(책의 시대·지역), 각색 의상은 거기서만 */
const ad = cas({ era: 'now', place: 'adapt_fitting', act: 'costume_fitting', ofam: 'adaptation', item: 'period_gown' });
assert(ad.includes('ADAPTATION: the production adapts «' + b.title + '»') && ad.includes(q(b.era)) && !ad.includes('WORLD:'), '각색 줄');
assert(!lace.includes('ADAPTATION:') && !cas({ era: 'now', place: 'salon_cafe', act: 'read_aloud', ofam: 'everyday' }).includes('ADAPTATION:'), '다른 장소엔 없다');
assert(tree.places.filter(p => p.outfits.includes('adaptation')).every(p => p.group === 'adapt'), '각색 의상은 각색 무대에서만');
/* 원작 시대 — 시대·지역 줄, 그 시대로 옮기기 어려운 곳은 빠진다 */
{ const hm = design.books.find(x => x.key === 'hamlet'), base = { book: hm, tree, styleText: text, era: 'now', place: 'stage_event', act: 'event_greet', ofam: 'roleplay', item: 'adult_police' };
  const now = P.buildCasual(base), then = P.buildCasual({ ...base, era: 'book' });
  assert(!now.includes('ERA:') && then.includes('ERA: set this scene') && then.includes(q(hm.era)) && then.includes(q(hm.region)) && then.includes('city watch'), '원작 시대');
  assert(then.indexOf('FRAME:') < then.indexOf('ERA:') && then.indexOf('ERA:') < then.indexOf('SCENE (chosen):\n') && then.indexOf('SCENE (chosen):\n') < then.indexOf('WARDROBE:'), 'FRAME → 시대 줄 → 고른 장면 → 옷 줄');
  assert(!P.buildPrompt({ outputMode: 'form', book: hm, stage: '발단', styleText: text, era: 'book' }).includes('ERA:'), '폼 초상에는 없다');
  assert(!CT.places(tree, 'book', hm).some(p => ['arcade_hall', 'spa_jjimjil', 'night_karaoke'].includes(p.key)) && CT.places(tree, 'book', hm).some(p => p.key === 'lib_reading_room'), '원작 시대에 없는 곳'); }
/* 고른 장면은 위쪽 — 「아래 설정을 따른다」 는 말이 남지 않는다 */
assert(!/below describe|settings below|line below|Framing below|chosen below/.test(plain), '일상컷에 「아래」 말이 남았다');
/* 화면 줄 — 오락실·사진 부스만 */
assert(cas({ era: 'now', place: 'arcade_hall', act: 'play_cabinet', ofam: 'everyday' }).includes(T.casualScreens) && !lace.includes('SCREENS:'), '화면 줄');
/* 가까운 프레이밍이면 CROP 줄(game 2026-10-29) */
const station = { era: 'now', place: 'travel_rural_station', act: 'wait_train', ofam: 'everyday' };
for (const frame of S.CLOSE_FRAMES) {
  const t = cas({ ...station, frame, pose: 'sitting' });
  assert(t.includes('CROP: ' + S.CROP_EDGE[frame] + '. This crop wins'), frame + ' CROP 줄에 잘리는 선');
  assert(t.indexOf('CROP:') > t.indexOf('FRAME:') && t.indexOf('CROP:') < t.indexOf('WARDROBE:'), frame + ' CROP 은 FRAME 바로 밑');
  assert(t.includes(T.anatomyClose) && !t.includes('7.5 heads'), frame + ' 가까운 컷에 등신 말 없음');
  const tb = cas({ ...station, frame, axes: { skin_exposure: 'bold' } });
  assert(tb.includes(T.casualWardrobeClose) && !tb.includes(T.casualWardrobe), frame + ' 가까운 컷 옷 줄');
  assert(!/skin_exposure: [^\n]*(midriff|leg)/.test(tb) && tb.includes('inside the crop'), frame + ' 가까운 컷 노출 풀이');
}
assert(cas({ ...station, frame: 'full_body' }).includes(T.anatomy), '먼 컷은 등신 줄 그대로');
for (const frame of ['full_body', 'environmental', 'three_quarter', '']) assert(!cas({ ...station, frame }).includes('CROP:'), frame + ' CROP 없음');
/* 뒤돌아보기 — 등이 카메라를 보는 각도·돌아보는 자세에만 LOOK-BACK 줄(pkm 2026-10-25 같은 문제) */
const walk = { era: 'now', place: 'street_alley', act: 'stroll', ofam: 'everyday' };
for (const x of [{ orient: 'rear_3q' }, { orient: 'over_shoulder' }, { pose: 'turning_back' }]) assert(cas({ ...walk, ...x }).includes(T.casualLookBack), '뒤돌아보기 ' + JSON.stringify(x));
assert(!cas({ ...walk, orient: 'front_3q' }).includes('LOOK-BACK:'), '앞모습엔 뒤돌아보기 줄 없음');
/* 자세·방향은 하는 일의 자세 계열 안에서만 */
const fixed = CT.repair(tree, { ...station, pose: 'walking', orient: 'walking_away' }, b, S.CLOSE_FRAMES);
assert(fixed.pose === '' && fixed.orient === '', '앉기 계열에 걷기 자세·방향은 없다');
/* 상징 — 자동은 하나~둘, 하나를 골랐으면 그것만, 없음이면 줄이 없다 */
assert(plain.includes('SYMBOLS (one or two at most, as an accessory or an object in the scene — never printed on or woven into the clothes): ' + b.symbols.map(s => '"' + q(s) + '"').join(', ') + '.'), '일상컷 상징은 장신구·주변 사물로');
assert(cas({ prop: '1' }).includes(T.casualSignatureOne.replace('{item}', '"' + q(b.symbols[1]) + '"')), '상징 하나');
assert(!cas({ prop: 'none' }).includes('SYMBOL'), '상징 없음');
/* 전통 의상 — 고른 전통이 책의 지역을 이긴다(돈키호테 아오자이). 원작 시대 판은 그 시대로 옮긴다 */
const dq = design.books.find(x => x.key === 'don_quixote'), aoPath = { book: dq, tree, styleText: text, era: 'now', place: 'street_market', act: 'stroll', ofam: 'traditional', item: 'aodai_daily' };
const ao = P.buildCasual(aoPath);
assert(ao.includes("wins over her book's region") && ao.includes('mandarin collar'), '아오자이');
assert(!P.buildCasual({ ...aoPath, era: 'book' }).includes('Outfit note:'), '원작 시대 판엔 없다');
/* 분리형 선호는 고른 옷에 진다 */
for (const v of ['prefer separates', 'strongly prefer separates']) assert(S.SCENE_AXIS_GUIDES.separates_preference[v][1].includes('chosen Outfit'), '분리형 ' + v);
/* 일상컷 옷은 장면의 옷 그대로 — 책의 특징은 장신구·주변 사물로만(2026-10-29, game 에서 먼저) */
assert(!/color echo|motif on the clothing|source palette and motifs in clothing|integrated into everyday clothing/.test(JSON.stringify(T) + JSON.stringify(S.SCENE_AXIS_GUIDES)), '옷에 책 색·무늬를 넣으라는 말이 남았다');
assert(plain.includes("Do not carry the attached image's palette, patterns or trim into the outfit") && plain.includes("never in the outfit's colours, patterns or cut"), '옷은 첨부 그림의 색·무늬를 따르지 않는다');
for (const v of ['subtle', 'balanced', 'strong']) {
  const t = cas({ axes: { source_influence: v } });
  assert(/accessor|props|object in the scene/.test(t.match(/source_influence: [^\n]*/)[0]), '원본 반영 ' + v + ' 은 장신구·사물로');
}
/* 일상컷 화면비 — 기본 2:3 도 늘 FRAME 줄로 싣는다. 고르면 그 비율 하나만 (2026-10-28) */
assert(plain.includes('FRAME: a vertical 2:3 (1024×1536) image.') && !plain.includes('Aspect ratio'), '일상컷 FRAME 기본 2:3');
for (const [a, w] of [['3:2', 'a horizontal 3:2 (1536×1024)'], ['1:1', 'a square 1:1'], ['9:16', 'a tall vertical 9:16'], ['16:9', 'a wide horizontal 16:9']]) {
  const t = cas({ aspect: a });
  assert(t.includes('FRAME: ' + w) && !t.includes('2:3') && !t.includes('Aspect ratio'), '일상컷 FRAME ' + a);
}
assert(plain.includes(T.casualPose) && plain.indexOf('SCENE (chosen)') < plain.indexOf(T.casualPose), '고른 장면 → 각도 줄');
/* 예전 기록(갈래·예시) — 변환표로 같은 길이 된다. 예전 원작 시대는 그 장소가 받으면 그대로 */
assert.equal(cas({ cat: 'library_life', ex: 'lib_binding' }), cas({ era: 'now', place: 'lib_bindery', act: 'stitch_binding', ofam: 'everyday', item: 'apron_blouse' }), '예전 기록 → 추천 조합 길');
assert(sceneOf(cas({ cat: 'lingerie', ex: 'lace_set' })).includes(CT.item(tree, 'lingerie', 'lace_set').en), '예전 옷 예시 → 그 옷');
assert(cas({ cat: 'library_life', ex: 'lib_binding', era: 'book' }).includes('ERA:'), '예전 원작 시대는 그대로');
assert(cas({ cat: 'story_place', ex: 'sp_walk' }).includes('WORLD:') && cas({ cat: 'stage_adaptation', ex: 'ad_fitting' }).includes('ADAPTATION:'), '예전 이야기 속 장소·각색');
/* 추천 조합이 다 조립되고, 따옴표 밖은 영어, 길이 한도 */
let longestCasual = 0;
for (const bk of design.books) for (const pr of tree.presets) {
  const t = P.buildCasual({ book: bk, tree, styleText: text, ...CT.applyPreset(tree, {}, pr.key) });
  assert(t.includes('Place: ') && t.includes('Activity: ') && t.includes('Outfit: '), pr.key + ' 장면 줄');
  assert(!/[가-힣]/.test(t.replace(/"[^"]*"/g, '').replace(/«[^»]*»/g, '').replace(/STYLE: [^\n]*/, '')), bk.key + ' ' + pr.key + ' 따옴표 밖은 영어');
  longestCasual = Math.max(longestCasual, P.words(t));
}
assert(longestCasual <= 800, '가장 긴 일상컷이 800 낱말을 넘는다: ' + longestCasual);
assert.throws(() => P.buildCasual({ book: b, styleText: text }), /Casual tree is required/);
assert(!/Pok[eé]mon|포켓몬/.test(JSON.stringify(S)), '표에 포켓몬 말이 남았다');
assert(!S.ACTION_CONTROLS.some(c => c.key === 'equipment'), '책은 빈손 — 무장 고르기가 없다');

/* 5. 화풍 블록은 책 줄 바로 뒤, 판의 점검 줄은 맨 끝, 참고 그림이 있으면 "그리는 방식만" (2026-10-15 시범 세 묶음) */
const cur = lf.versions.find(v => v.v === lf.current);
/* 자리 검사는 점검 줄이 있는 판으로 본다(지금 판 v7 은 점검 줄이 없다) */
const full = { book: b, tree, stage: '발단', styleText: cur.text, styleCheck: cur.check || 'rendering check.', styleRef: true, params: [] };   // 참고 그림을 켰을 때
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
for (const m of ['form', 'open']) assert(!P.buildPrompt({ ...full, outputMode: m }).includes(S.BOOK_LINES.casualPose), m + ' 에는 얼굴 각도 줄이 없다');
// 실루엣 자세 축은 폼 자세(STANCE)가 있으면 빠진다 — 두 자세가 겹치면 팔이 하나 더 생기려 했다(game 마리오 엔딩, 2026-10-27)
assert(!/Default stance follows the SILHOUETTE/.test(S.BOOK_LINES.createOutput) && !pf.join('\n').includes('attitude: '), '폼 자세가 있으면 실루엣 자세는 빠진다');
assert(pf.join('\n').includes('nothing in front of her but what she holds') && pf.join('\n').includes('An object named in FORM or in her pose stays.'), '쥔 것은 앞을 가려도 되고, 폼·자세가 쥔 물건은 HOLD BACK 에서 빠지지 않는다');
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
// 손 줄은 짧은 긍정형 — 손가락 개수·금지 나열이 손에 주의를 끌었다(2026-10-27). 몸 줄은 팔·다리 개수만
assert(!/thumb|fingers|never|mirrored|thrust/.test(S.BOOK_LINES.hands + S.BOOK_LINES.handsKeep + S.BOOK_LINES.handsDefault + S.BOOK_LINES.handsPose), '손 줄에 손가락 개수·금지어');
assert(S.BOOK_LINES.body.includes('two arms and two legs') && S.BOOK_LINES.handsCasual.startsWith('HAND TASK:'), '몸 줄·일상컷 손 줄');
// 경찰·간호사 — 금지어만 있어 부품이 없었다. 옷 부품 + 동작, 극장 말 없이(햄릿이 무대 의상으로 끌려갔다)
for (const ex of ['adult_police', 'adult_nurse']) {
  const t = P.buildCasual({ book: design.books.find(x => x.key === 'hamlet'), tree, styleText: text, cat: 'adult_roleplay', ex });
  assert(/cap/.test(t) && !/theatrical/.test(t) && t.includes('never restyle the chosen outfit'), ex);
}
// 개방 명장면은 폼 배경에서 뺀다(바스커빌 사냥개) — 새 인물·이어가기 모두, 개방·일상컷엔 없음
{ const bk = design.books.find(x => x.key === 'baskervilles');
  for (const id of ['create', 'reference']) {
    const t = P.buildPrompt({ outputMode: 'form', book: bk, stage: '발단', baseStage: '발단', identityMode: id, styleText: text });
    assert(t.includes('HOLD BACK:') && Object.values(bk.opens).every(o => t.includes(q(o.scene))), id + ' 폼 — 개방 명장면을 미리 넣지 않는다');
  }
  assert(!P.buildPrompt({ outputMode: 'open', book: bk, stage: '결말', styleText: text }).includes('HOLD BACK'), '개방엔 없다'); }
// 이어가기는 첨부 그림의 겉옷을 다시 입지 않는다(바스커빌 발단·결말 같은 코트)
assert(P.buildPrompt({ outputMode: 'form', book: b, stage: '결말', baseStage: '발단', identityMode: 'reference', styleText: text }).includes("Do not reuse the attached image's outer garment"), '이어가기 — 겉옷 바꾸기');
// 얼굴 계통 — 설계표 값이 새 인물 FACE 줄에, 사람이 고르면 그쪽, 이어가기엔 없다
{ const ti = design.books.find(x => x.key === 'treasure_island');
  const t = P.buildPrompt({ outputMode: 'form', book: ti, stage: '발단', styleText: text });
  assert(/FACE \([^\n]*broad Latin American ancestry/.test(t), '설계표 계통');
  const mine2 = P.buildPrompt({ outputMode: 'form', book: ti, stage: '발단', styleText: text, params: [['facial ethnicity', 'Korean']] });
  assert(!mine2.includes('Latin American ancestry') && mine2.includes('facial ethnicity: Korean'), '고른 계통이 이긴다');
  assert(!P.buildPrompt({ outputMode: 'form', book: ti, stage: '전개', baseStage: '발단', identityMode: 'reference', styleText: text }).includes('ancestry'), '이어가기는 첨부 그림'); }
// 한복 — 한 낱말로는 한푸로 갔다(춘향전). 새 인물은 실루엣에, 이어가기는 GARMENT 줄에 구조를 싣는다
const ch = design.books.find(x => x.key === 'chunhyang');
assert(P.buildPrompt({ outputMode: 'form', book: ch, stage: '발단', styleText: text }).includes('jeogori') , '새 인물 — 한복 풀이');
const chRef = P.buildPrompt({ outputMode: 'form', book: ch, stage: '결말', baseStage: '발단', identityMode: 'reference', styleText: text });
assert(chRef.includes('GARMENT: ') && chRef.includes('not Chinese hanfu') && chRef.includes('jokduri'), '이어가기 — 한복 구조를 지킨다');
assert(!P.buildPrompt({ outputMode: 'open', book: ch, stage: '결말', styleText: text }).includes('GARMENT: '), '개방은 첨부 그림의 차림 그대로');
assert.throws(() => P.buildPrompt({ outputMode: 'form', book: b, stage: '발단', styleText: '' }), /Style text/);

/* 7. 아직 보호 중인 책 — 원작 글에서만 그리라는 줄이 새 인물·이어가기·개방·일상컷 모두에. 만료된 책엔 없다. 각색 이름은 싣지 않는다 */
const guard = S.BOOK_LINES.adaptation;
for (const bk of design.books) {
  const prot = bk.abroad_protected === true || (!bk.anonymous && (!!bk.alive || bk.author_death > S.KOREA_LAST_EXPIRED_DEATH));
  assert.equal(P.isProtected(bk), prot, bk.key + ' 보호 판정');
  const ts = [P.buildPrompt({ outputMode: 'form', book: bk, stage: '발단', styleText: text }),
    P.buildPrompt({ outputMode: 'form', book: bk, stage: '전개', baseStage: '발단', identityMode: 'reference', styleText: text }),
    P.buildPrompt({ outputMode: 'open', book: bk, stage: '결말', styleText: text }),
    P.buildCasual({ book: bk, tree, styleText: text, cat: 'library_life', ex: 'lib_binding' })];
  for (const t of ts) {
    assert.equal(t.includes(guard), prot, bk.key + (prot ? ' 에 원작 글만 줄이 없다' : ' 은 만료됐는데 원작 글만 줄이 있다'));
    for (const a of bk.adaptations || []) assert(!t.includes(a), '각색 이름은 프롬프트에 싣지 않는다: ' + a);
  }
}
assert(design.books.some(bk => P.isProtected(bk)), '보호 중인 책이 하나는 있다(검사가 헛돌지 않게)');
const py = fs.readFileSync('tools/book-design.py', 'utf8').match(/KOREA_LAST_EXPIRED_DEATH = (\d+)/);
assert.equal(Number(py[1]), S.KOREA_LAST_EXPIRED_DEATH, '보호 기준 해가 검사기와 생성기에서 같다');
console.log(`PASS 책 프롬프트: ${design.books.length}권 × 폼 3 × (새 인물·이어가기·개방) ${n}개 · 가장 긴 것 ${longest}낱말 · 정한 말 영어 · 직접 고른 값 우선 · 일상컷 트리(시대·장소·하는 일·옷·이야기 세계·각색·원작 시대·CROP·상징·예전 기록) · 추천 조합 ${tree.presets.length}개 × ${design.books.length}권 가장 긴 것 ${longestCasual}낱말 · 빈손 · 화풍 ${lf.current} 앞에·점검 끝에·참고 그림은 방식만 · 노출 칸·목 · 나이 줄(기본 20대) · 연출·카드 자세·폼 자세 · 한복 구조 · 보호 중인 책은 원작 글만`);
