/* 책 프롬프트 조립 — 표(lib/prompt-spec.js)·책 설계표 한 칸·화풍 판 하나를 받아 영어 프롬프트 한 덩이를 만든다.
   화면 없이 node 로도 부른다(tests/prompt-book.cjs). 말은 전부 표에서 꺼낸다 — 여기는 한글이 0자리다.

   pkm-atelier 의 lib/prompt-anthro.js 를 책 꼴로 옮겼다. 네 갈래:
   - 폼 초상 · 새 인물(create): 첨부 없이 한 장. 이 책의 첫 그림이 인물 기준이다(설계표의 시범 폼이 보통 첫 그림).
   - 폼 초상 · 이어가기(reference): 확정한 첫 그림을 첨부하고 의상만 그 폼으로.
   - 개방(open): 그 폼 그림을 첨부하고 같은 그림에서 둘레의 세계만 명장면으로.
   - 일상(casual): 확정한 그림을 첨부하고 평상복 장면 — 갈래·예시·세 축은 pkm 과 같다.
   차례: 입력 → 책 → 화풍(+ 참고 그림 줄) → (새 인물: 무엇·물성·실루엣·얼굴) → 폼 → 출력 → 고른 것 → 외형 → 금지 → 화풍 점검. */
(function (root) {
  'use strict';
  var S = root.AtelierSpec, T = S.BOOK_LINES, V = S.VOCAB_EN;

  function clean(value) { return typeof value === 'string' ? value.trim() : ''; }
  /* 설계표 글은 큰따옴표 안에 싣는다 — 글 속 큰따옴표(끝까지 "왜?" 라고)는 작은따옴표로 바꿔 따옴표가 엇갈리지 않게 */
  function quoted(value) { return clean(value).replace(/"/g, "'"); }
  function fill(text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; }); }
  function en(axis, key) { return (V[axis] || {})[key] || key || ''; }

  /* 외형 선택지 — pkm 과 같다. 저장된 열쇠는 그대로, 풀이만 붙인다 */
  function paramValues(raw) {
    var out = raw.map(function (p) { return p.slice(); });
    var value = function (k) { var p = raw.find(function (p) { return p[0] === k; }); return p ? p[1] : ''; };
    var has = function (k) { return !!value(k); };
    out = out.map(function (p) {
      var guide = S.PARAM_GUIDES[p[0]] && S.PARAM_GUIDES[p[0]][p[1]];
      if (p[0] === 'hair length' && guide && S.HAIR_LENGTH_LIMITS[value('hairstyle')])
        return [p[0], S.HAIR_LENGTH_LIMITS[value('hairstyle')][1]];
      if (p[0] === 'eye shape' && ((p[1] === 'large' && has('eye size')) || (p[1] !== 'large' && has('eye tilt'))) && S.EYE_CONTOURS[p[1]])
        return [p[0], S.EYE_CONTOURS[p[1]]];
      return [p[0], guide ? p[1] + ' — ' + guide[1] : p[1]];
    });
    if (has('body type')) out.push(['body scope', 'Body type sets the build; body details adjust within it. These describe anatomy beneath the costume, not costume volume.']);
    if (has('hairstyle')) out.push(['hair scope', 'Keep the cut and its fixed length; other hair settings adjust within it. Hair choices do not set ethnicity.']);
    if (S.FACE_KEYS.some(has)) out.push(['facial precedence', 'Explicit facial geometry controls the actual outline, above style, ethnicity or demeanor; shading and expression must not reshape it.']);
    if (has('facial character')) out.push(['demeanor scope', 'Facial character affects demeanor only; preserve age and geometry. Explicit scene expression takes priority.']);
    if (has('facial ethnicity')) out.push(['ethnicity scope', 'Broad ancestry cue with individual variation; preserve explicit geometry, skin tone and hair. No stereotyped features.']);
    var right = value('eye color'), left = value('second eye color');
    out = out.filter(function (p) { return p[0] !== 'second eye color'; });
    if (left && left !== right) out.push(['heterochromia', 'Character-relative right eye is ' + (right || 'one chosen primary color, different from ' + left) +
      '; left eye is ' + left + '. Keep the sides; do not blend colors.']);
    else if (right) out.push(['eye color consistency', 'both eyes are ' + right]);
    return out;
  }
  function identityParams(raw) {
    return (raw || []).filter(function (p) {
      var d = S.PARAM_DEFS.find(function (d) { return d.key === p[0]; });
      return d && S.IDENTITY_GROUPS.indexOf(d.group) >= 0 && S.IDENTITY_EXCLUDED.indexOf(d.key) < 0 &&
        p[1] && p[1] !== '__custom__' && p[1] !== 'AUTO';
    });
  }
  function chosenKeys(st) {
    var out = {}; identityParams(st.params).forEach(function (p) { out[p[0]] = 1; }); return out;
  }

  /* 책의 다섯 얼굴 묶음 → FACE 줄. 사람이 고른 얼굴 항목·끈 경우는 빠진다 */
  function faceItems(st) {
    var f = st.book && st.book.face;
    if (!f || st.faceDesignOn === false) return [];
    var chosen = chosenKeys(st);
    return Object.keys(S.FACE_PARAM).filter(function (k) { return f[k] && !chosen[S.FACE_PARAM[k]]; })
      .map(function (k) { return en(k, f[k]); });
  }
  function faceLine(st) { var items = faceItems(st); return items.length ? fill(T.face, { items: items.join('; ') }) : ''; }
  /* 실루엣 축 6 → 한 줄. 체형·머리를 직접 골랐으면 그 축은 빠진다 */
  function silhouetteItems(st) {
    var s = st.book && st.book.silhouette;
    if (!s || st.silhouetteOn === false) return [];
    var chosen = chosenKeys(st), out = [];
    if (s.body && !chosen[S.SIL_PARAM.body]) out.push(en('body', s.body) + ' build');
    if (s.hair && !chosen[S.SIL_PARAM.hair]) out.push(en('hair', s.hair));
    if (s.garment) out.push('garment structure: ' + en('garment', s.garment));
    if (s.material) out.push('main material: ' + en('material', s.material));
    if (s.pose) out.push('default pose: ' + en('pose', s.pose));
    if (s.palette) out.push('palette: ' + en('palette', s.palette));
    return out;
  }

  /* 연출 — pkm 과 같다(무장 고르기는 표에서 빠졌다) */
  function actionDirection(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    var lines = [], category = S.ACTION_CATEGORIES.find(function (r) { return r.key === raw.category; });
    if (category) {
      lines.push('Action category: ' + category.prompt);
      var example = category.examples.find(function (r) { return r.key === raw.example; });
      if (example) lines.push('Action example: ' + example.prompt);
    }
    S.ACTION_CONTROLS.forEach(function (control) {
      var option = control.options.find(function (r) { return r.key === raw[control.key]; });
      if (option) lines.push(control.promptLabel + ': ' + option.prompt);
    });
    return lines;
  }
  /* 고른 장면 값만 한 줄씩. 화면 비율은 2:3 이 아닐 때만 */
  function sceneDetails(st, mode) {
    var details = [];
    if (clean(st.expr)) details.push('Expression: ' + (S.EXPRESSION_DETAIL[st.expr] || st.expr));
    ['pose', 'orient', 'scene', 'outfit', 'categoryGuide', 'example', 'custom'].forEach(function (k) {
      var value = clean(st[k]);
      if (k === 'pose') {
        var actionPose = mode === 'form' && S.ACTION_POSES.find(function (r) { return r.key === value; });
        value = actionPose ? actionPose.prompt : ((S.POSE_GUIDES[value] || [])[1] || value);
      }
      if (k === 'orient') value = (S.ORIENTATION_GUIDES[value] || [])[1] || value;
      var label = { pose: 'Pose', orient: 'Orientation', scene: 'Scene', outfit: 'Outfit and props', categoryGuide: 'Category', example: 'Example scene', custom: 'Note' }[k];
      if (value) details.push(label + ': ' + value);
    });
    if (clean(st.frame)) details.push('Framing: ' + ((S.FRAME_GUIDES[st.frame] || [])[1] || clean(st.frame)));
    if (clean(st.lens)) details.push('Lens / perspective: ' + ((S.LENS_GUIDES[st.lens] || [])[1] || clean(st.lens)));
    if (clean(st.camera)) details.push('Camera: ' + clean(st.camera));
    if (mode === 'casual') (S.LOCAL_AXES || []).forEach(function (k) {
      var v = st.axes && st.axes[k];
      if (v && v !== 'AUTO' && (S.ADVANCED_OPTIONS[k] || []).indexOf(v) >= 0) details.push(k + ': ' + v + ' — ' + S.SCENE_AXIS_GUIDES[k][v][1]);
    });
    var aspect = clean(st.aspect);
    if (aspect && aspect !== '2:3') details.push('Aspect ratio: ' + aspect);
    return details;
  }

  function stageInfo(stage) {
    var s = S.STAGE_EN[stage];
    if (!s) throw new Error('Unknown stage: ' + stage);
    return s;
  }
  function bookLine(b) {
    return fill(T.book, { title: clean(b.title), author: clean(b.author) || 'anonymous', genre: en('genre', b.genre),
      era: clean(b.era), region: clean(b.region), scope: quoted(b.source_scope) });
  }
  function styleText(st) {
    var t = clean(st.styleText);
    if (!t) throw new Error('Style text is required (data/style.json)');
    return t;
  }
  /* 화풍 블록은 책 줄 바로 뒤에 둔다 — 설계 줄 뒤에 묻히면 그림 모델이 장르마다 제 기본 화풍으로 갔다(2026-10-15 시범).
     판에 참고 그림이 있으면 "그리는 방식만" 줄을, 판에 마무리 점검(check)이 있으면 맨 끝에 한 번 더 싣는다 */
  function styleLines(st) {
    var out = ['STYLE: ' + styleText(st)];
    if (st.styleRef) out.push(T.styleRef);
    return out;
  }
  function styleCheck(st) { return clean(st.styleCheck) ? ['FINAL CHECK: ' + clean(st.styleCheck)] : []; }
  /* 폼 초상의 노출 — 과감은 의상 구조(설계표 실루엣의 복식 구조)에 맞는 갈래를 고른다 */
  function exposureLine(st) {
    var e = S.FORM_EXPOSURE[st.exposure];
    if (!e || typeof e === 'string') return e || '';
    var g = st.book && st.book.silhouette && st.book.silhouette.garment;
    return e[S.GARMENT_LAYER[g]] || e.open;
  }
  function inputLine(line, st) { return st.styleRef ? line + ' ' + T.styleRefInput : line; }

  function buildPrompt(st) {
    st = st || {};
    var mode = st.outputMode || 'form';
    if (['form', 'open', 'casual'].indexOf(mode) < 0) throw new Error('Unknown output mode: ' + mode);
    var b = st.book;
    if (!b || !clean(b.title)) throw new Error('Book is required');
    var motifs = clean(st.motifs), lines = [];

    if (mode === 'casual') {
      lines.push(inputLine(T.casualInput, st));
      lines.push(fill(T.casualCharacter, { title: clean(b.title), genre: en('genre', b.genre) }));
      lines.push.apply(lines, styleLines(st));
      lines.push(T.casualOutput);
      if (motifs) lines.push('MOTIFS to echo lightly: ' + motifs + '.');
      var cd = sceneDetails(st, 'casual');
      if (cd.length) lines.push('SCENE (chosen):\n' + cd.join('\n'));
      lines.push(T.figure, T.anatomy, T.hands);
      lines.push.apply(lines, styleCheck(st));
      return lines.join('\n\n');
    }

    var stage = st.stage, info = stageInfo(stage);
    var form = (b.forms || {})[stage] || {}, open = (b.opens || {})[stage] || {};
    if (mode === 'open') {
      if (!clean(open.scene)) throw new Error('Open scene is missing for ' + stage);
      lines.push(inputLine(fill(T.openInput, { stage: info.name.toLowerCase() }), st));
      lines.push(bookLine(b));
      lines.push.apply(lines, styleLines(st));
      lines.push(T.notes);
      lines.push(fill(T.openOutput, { scene: quoted(open.scene) }));
      if (clean(st.lookNote)) lines.push('SCENE NOTE: ' + clean(st.lookNote));
      if (clean(st.custom)) lines.push('NOTE: ' + clean(st.custom));
      lines.push(T.figure, T.handsKeep);
      lines.push.apply(lines, styleCheck(st));
      return lines.join('\n\n');
    }

    var reference = st.identityMode === 'reference';
    var base = reference ? (S.STAGE_EN[st.baseStage] ? S.STAGE_EN[st.baseStage].name.toLowerCase() + ' form' : 'her first approved form') : '';
    lines.push(reference ? inputLine(fill(T.referenceInput, { base: base }), st) : (st.styleRef ? T.createInputRef : T.createInput));
    lines.push(bookLine(b));
    lines.push.apply(lines, styleLines(st));
    lines.push(T.notes);
    if (!reference) {
      lines.push(fill(T.subject, { persona: quoted(b.persona), desire: quoted(b.desire), conflict: quoted(b.conflict),
        symbols: (b.symbols || []).map(function (s) { return '"' + quoted(s) + '"'; }).join(', ') }));
      if (clean(b.form_material)) lines.push(fill(T.material, { material: quoted(b.form_material) }));
      var sil = silhouetteItems(st);
      if (sil.length) lines.push(fill(T.silhouette, { items: sil.join('; ') }));
      var face = faceLine(st);
      if (face) lines.push(face);
    }
    if (motifs) lines.push((reference ? 'MOTIFS to keep: ' : 'MOTIFS (user choice): ') + motifs + '.');
    lines.push(fill(T.form, { stage: stage, stage_en: info.name.toUpperCase(), look: quoted(form.look), role: en('role', form.role), arc: info.arc }) +
      (clean(st.lookNote) ? '\nFORM NOTE: ' + clean(st.lookNote) : ''));
    var exposure = exposureLine(st);
    if (exposure) lines.push(exposure);
    lines.push(reference ? fill(T.referenceOutput, { stage_en: info.name.toLowerCase(), card: T.card }) : fill(T.createOutput, { card: T.card }));
    var chosen = actionDirection(st.action).concat(sceneDetails(st, 'form'));
    if (chosen.length) lines.push(T.sceneRule + '\n' + chosen.join('\n'));
    if (!reference) {
      var values = paramValues(identityParams(st.params));
      if (values.length) lines.push(T.identity + '\n' + values.map(function (p) { return p[0] + ': ' + p[1]; }).join('\n') +
        (values.some(function (p) { return p[0] === 'body measurements (B/W/H)'; }) ? '\n' + T.measurement : ''));
    }
    var hands = [T.hands];
    if (!chosen.length) hands.push(T.handsDefault);
    if (reference) hands.push(T.handsWear);
    lines.push(T.figure, T.anatomy, hands.join(' '));
    lines.push.apply(lines, styleCheck(st));
    return lines.join('\n\n');
  }

  /* 일상컷 — 갈래 문구와 예시 문장을 채워 넣는다(pkm 의 prompt-lifestyle.js 와 같다) */
  function exampleText(cat, value, custom) {
    if (value === '__custom__') return clean(custom);
    if (!value) return '';
    var r = (S.EXAMPLE_MAP[cat] || []).find(function (r) { return r[0] === value; });
    return r ? (r[5] || r[1]) : '';
  }
  function buildCasual(st) {
    var cat = S.CATS.find(function (r) { return r[0] === st.cat; });
    return buildPrompt(Object.assign({}, st, { outputMode: 'casual',
      categoryGuide: st.cat === '__custom__' ? clean(st.catCustom) : (cat ? cat[3] || '' : ''),
      example: exampleText(st.cat, st.ex, st.exCustom) }));
  }
  function words(text) { return (String(text).match(/\S+/g) || []).length; }

  root.AtelierPrompt = { paramValues: paramValues, identityParams: identityParams, faceItems: faceItems, faceLine: faceLine,
    silhouetteItems: silhouetteItems, actionDirection: actionDirection, sceneDetails: sceneDetails,
    buildPrompt: buildPrompt, buildCasual: buildCasual, exampleText: exampleText, words: words };
})(typeof window !== 'undefined' ? window : globalThis);
