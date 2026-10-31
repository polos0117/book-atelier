#!/usr/bin/env node
/* 지시문 묶음 — 브라우저 없이 생성기와 같은 지시문·기록을 파일로(2026-10-31, game-atelier 의 tools/prompt-pack.cjs 를 책 꼴로 — 그쪽은 pkm 에서).
   GPT 세션은 브라우저를 못 띄운다 — 생성기 화면(lib/prompt-ui.js)이 부르는 조립부(lib/prompt-book.js 의 buildPrompt · buildCasual)를
   같은 저장 상태로 불러, 한 책 열한 자리(폼 셋 · 개방 셋 · 일상컷 다섯 — IMAGE_RULES 2절)의 지시문과 기록을 쓴다.
   기록(<자리>-ui.json)은 생성기 「기록 내보내기」 와 같은 꼴이고, 그 storage 를 생성기에 넣으면 같은 지시문이 나온다(tests/prompt-pack-screen.cjs 가 견준다).

   node tools/prompt-pack.cjs init <책> --dir <작업 폴더> [--plan <계획기 --out 폴더>/plan.json]
     작업 폴더에 settings.json(고칠 수 있는 칸만)을 만든다 — 이미 있으면 덮지 않고 멈춘다.
     --plan 은 일상컷 계획기(tools/casual-plan.cjs --out)의 plan.json. 일상 다섯 컷의 선택값은 계획에서만 온다.
   node tools/prompt-pack.cjs build --dir <작업 폴더>
     settings.json 을 읽어 자리마다 <자리>-prompt.txt · <자리>-ui.json 과 차례표 INDEX.md 를 쓴다.
     틀린 칸(없는 열쇠 · 표에 없는 값 · 사유 없는 직접 입력 · 계획에 없는 컷)이 하나라도 있으면 아무것도 쓰지 않고 1 로 끝난다.

   자리마다 고정인 것(모드 · 폼 · 인물 기준 · 첨부)은 도구가 정한다 — 첫 그림은 설계표 pilot.form(없으면 첫 폼)으로 새 인물,
   나머지 폼은 첫 그림 이어가기, 개방은 그 폼 그림(+ 되면 첫 그림), 일상은 첫 그림. 고칠 수 있는 칸:
     card                motifs · lookNote(직접 입력 — why 필요) · faceDesignOn · silhouetteOn · exposure · params(외형 — 표의 값, 아니면 직접 입력이라 why)
     폼 · 개방 자리       scene 의 expr · pose · orient · frame · lens(표의 값) · scene · outfit · camera · custom(직접 입력 — why)
     일상 자리           custom(추가 연출 — why) · 나머지는 계획 그대로 */
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ctx = { window: {}, console }; vm.createContext(ctx);
for (const f of ['lib/prompt-spec.js', 'lib/casual-tree.js', 'lib/prompt-book.js']) vm.runInContext(read(f), ctx);
const S = ctx.window.AtelierSpec, CT = ctx.window.AtelierCasualTree, P = ctx.window.AtelierPrompt;
const design = JSON.parse(read('data/book-design.json')), style = JSON.parse(read('data/style.json'));
const tree = JSON.parse(read('data/casual-tree.json'));
/* 화풍 — 생성기와 같이 default 가 비었으면 첫 화풍(prompt-ui 의 defaultStyle) */
const STYLE = style.default && style.styles[style.default] ? style.default : Object.keys(style.styles)[0];
const PLAN = require('./casual-plan.cjs');

const FORM_KEY = design.vocab.form_key, FORMS = Object.values(FORM_KEY), STAGE = Object.fromEntries(Object.entries(FORM_KEY).map(([s, f]) => [f, s]));
const SELECT = { expr: S.EXPRESSION_OPTIONS, pose: S.POSE_OPTIONS, orient: S.ORIENTATION_OPTIONS, frame: S.FRAME_OPTIONS, lens: S.LENS_OPTIONS };
const TEXT = ['scene', 'outfit', 'camera', 'custom'];
const CARD_KEYS = ['motifs', 'lookNote', 'faceDesignOn', 'silhouetteOn', 'exposure', 'params', 'why'];
const DEFS = S.PARAM_DEFS.filter(d => S.IDENTITY_GROUPS.includes(d.group) && !S.IDENTITY_EXCLUDED.includes(d.key));
const keys = rows => rows.map(r => r[0]).filter(v => v && v !== '__custom__');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

/* 생성기 저장 상태 — lib/prompt-ui.js 의 blankScene · defaults · normalizeAction 과 같은 모양 */
const blankScene = () => ({ expr: '', pose: '', orient: '', scene: '', outfit: '', frame: '', lens: '', camera: '', custom: '', aspect: '2:3',
  cat: 'everyday_basic', catCustom: '', ex: '', exCustom: '', axes: {}, action: blankAction(), randomLocks: {} });
const blankAction = () => ({ category: '', example: '', ...Object.fromEntries(S.ACTION_CONTROLS.map(c => [c.key, ''])) });
const CASUAL_LOCKS = { 'axes.overall_intensity': true, 'axes.skin_exposure': true, aspect: true };
/* 일상 — 계획기(tools/casual-plan.cjs 의 cardState)와 같은 모양(트리 버전1) */
const planScene = () => ({ expr: '', pose: '', orient: '', scene: '', outfit: '', frame: '', lens: '', camera: '', custom: '', aspect: '2:3', axes: {}, action: {}, randomLocks: {} });
const blankCasual = () => ({ ...blankScene(), axes: { overall_intensity: 'strong', skin_exposure: 'bold' }, randomLocks: { ...CASUAL_LOCKS } });

/* 안에서는 game-atelier 판과 줄을 맞추려고 책 한 권(설계표 books 한 칸)을 game 이라 부른다 */
function gameOf(key) {
  const g = design.books.find(x => x.key === key);
  if (!g) throw new Error('책이 없다: ' + key + ' (data/book-design.json 의 books[].key)');
  return g;
}
function styleOf() { const st = style.styles[STYLE]; const v = st.current || st.versions[st.versions.length - 1].v; return { key: STYLE, v, ver: st.versions.find(x => x.v === v) }; }
/* 자리 — 첫 그림(인물 기준) · 나머지 폼 · 개방 셋 · 일상 다섯 */
function slots(game, plan) {
  const pilot = FORM_KEY[(game.pilot || {}).form] || FORMS[0];
  const out = [{ slot: pilot, mode: 'form', form: pilot, identityMode: 'create', attach: [] }];
  for (const f of FORMS) if (f !== pilot) out.push({ slot: f, mode: 'form', form: f, identityMode: 'reference', attach: [pilot] });
  /* 개방은 그 폼 그림(+ 되면 첫 그림 — IMAGE_RULES 2절 표) */
  for (const f of [pilot, ...FORMS.filter(f => f !== pilot)]) out.push({ slot: f + '_open', mode: 'open', form: f, identityMode: 'reference', attach: f === pilot ? [f] : [f, pilot + '?'] });
  for (const c of (plan ? plan.cuts : [])) out.push({ slot: 'casual' + c.n, mode: 'casual', form: pilot, identityMode: 'reference', attach: [pilot], cut: c });
  return { pilot, list: out };
}
const fileOf = (game, s, st) => s.mode === 'casual' ? `${game.key}_${st}_f_${s.slot}.webp` : `${game.key}_${s.slot}_${st}_f.webp`;

function initSettings(game, planPath) {
  const plan = planPath ? JSON.parse(fs.readFileSync(planPath, 'utf8')) : null;
  if (plan && plan.book !== game.key) throw new Error('계획이 다른 책 것이다: ' + plan.book);
  const { list } = slots(game, plan);
  return {
    _: 'tools/prompt-pack.cjs 의 설정 — 고칠 수 있는 칸만 있다. 직접 입력(글 칸 · 표에 없는 값)엔 why 에 까닭을 적는다. 고친 뒤 build',
    book: game.key, style: styleOf().key, plan: planPath ? path.resolve(planPath) : '',
    card: { motifs: '', lookNote: '', faceDesignOn: true, silhouetteOn: true, exposure: S.FORM_EXPOSURE_DEFAULT, params: {}, why: '' },
    slots: Object.fromEntries(list.map(s => [s.slot, s.mode === 'casual' ? { custom: '', why: '' } : { scene: {}, why: '' }]))
  };
}

/* 틀린 칸 — 하나라도 있으면 build 가 아무것도 안 쓴다 */
function validate(set, game, plan) {
  const errs = [], { list } = slots(game, plan), names = list.map(s => s.slot);
  const unknown = (obj, allowed, where) => Object.keys(obj || {}).forEach(k => { if (!allowed.includes(k)) errs.push(where + ' 에 없는 칸 ' + k); });
  if (set.book !== game.key) errs.push('settings.book 이 ' + game.key + ' 가 아니다');
  if (set.style !== styleOf().key) errs.push('화풍은 책마다 하나(' + styleOf().key + ') — data/style.json');
  const c = set.card || {};
  unknown(c, CARD_KEYS, 'card');
  if (!S.FORM_EXPOSURE_KEYS.includes(c.exposure)) errs.push('card.exposure 는 ' + S.FORM_EXPOSURE_KEYS.map(k => k || "''").join(' · ') + ' 중 하나');
  for (const k of ['faceDesignOn', 'silhouetteOn']) if (typeof c[k] !== 'boolean') errs.push('card.' + k + ' 는 true · false');
  let cardManual = !!(c.motifs || '').trim() || !!(c.lookNote || '').trim();
  for (const [k, v] of Object.entries(c.params || {})) {
    const d = DEFS.find(x => x.key === k);
    if (!d) { errs.push('card.params 에 없는 외형 ' + k); continue; }
    if (typeof v !== 'string' || !v) errs.push('card.params.' + k + ' 는 글(비우려면 칸을 지운다)');
    else if (!keys(d.options).includes(v) && !(S.COLOR_KEYS[k] && /^#[0-9a-f]{6}$/i.test(v))) cardManual = true;
  }
  if (cardManual && !(c.why || '').trim()) errs.push('card 에 직접 입력(motifs · lookNote · 표에 없는 외형)이 있는데 why 가 비었다');
  unknown(set.slots, names, 'slots');
  for (const s of list) {
    const x = (set.slots || {})[s.slot];
    if (!x) { errs.push('slots.' + s.slot + ' 가 없다'); continue; }
    if (s.mode === 'casual') {
      unknown(x, ['custom', 'why'], 'slots.' + s.slot);
      if ((x.custom || '').trim() && !(x.why || '').trim()) errs.push('slots.' + s.slot + '.custom 의 why 가 비었다');
      continue;
    }
    unknown(x, ['scene', 'why'], 'slots.' + s.slot);
    unknown(x.scene, [...Object.keys(SELECT), ...TEXT], 'slots.' + s.slot + '.scene');
    for (const [k, rows] of Object.entries(SELECT)) { const v = (x.scene || {})[k]; if (v && !keys(rows).includes(v)) errs.push('slots.' + s.slot + '.scene.' + k + ' 의 값 ' + v + ' 가 표에 없다'); }
    if (TEXT.some(k => ((x.scene || {})[k] || '').trim()) && !(x.why || '').trim()) errs.push('slots.' + s.slot + ' 에 직접 입력이 있는데 why 가 비었다');
  }
  if (plan) for (const cut of plan.cuts) {
    const { n, ...sc } = cut, fixed = CT.repair(tree, { ...sc }, game, S.CLOSE_FRAMES);
    for (const k of ['era', 'place', 'act', 'ofam', 'item', 'frame', 'orient', 'lens', 'pose']) if (sc[k] && fixed[k] !== sc[k]) errs.push('계획 컷 ' + n + ' 의 ' + k + ' 가 트리에 안 맞는다(' + sc[k] + ')');
  }
  return errs;
}

/* 한 자리의 저장 상태와 지시문 — 화면의 Editor 가 input 을 만드는 길 그대로 */
function stateOf(game, set, s, pilot) {
  const c = set.card, sv = styleOf();
  const st = { style: sv.key, version: sv.v, identityMode: s.identityMode, form: s.form, baseForm: pilot, casualN: s.cut ? s.cut.n : 1,
    exposure: c.exposure, attachStyleRef: false, motifs: c.motifs || '', lookNote: c.lookNote || '', faceDesignOn: c.faceDesignOn, silhouetteOn: c.silhouetteOn,
    params: { ...(c.params || {}) }, locks: {}, mode: s.mode, scenes: { form: blankScene(), open: blankScene(), casual: blankCasual() }, versionPinned: false };
  if (s.mode === 'casual') {
    const { n, ...cut } = s.cut, x = set.slots[s.slot];
    st.scenes.casual = { ...planScene(), ...cut, custom: x.custom || '', preset: '', randomLocks: { ...CASUAL_LOCKS } };
  } else st.scenes[s.mode] = { ...blankScene(), ...((set.slots[s.slot] || {}).scene || {}) };
  return st;
}
function promptOf(game, st, s) {
  const sv = styleOf(), scene = st.scenes[s.mode];
  const input = { ...st, ...scene, book: game, tree, stage: STAGE[st.form], baseStage: STAGE[st.baseForm], styleText: sv.ver.text,
    styleCheck: sv.ver.check || '', styleRef: false, outputMode: s.mode, identityMode: s.mode !== 'form' || st.identityMode === 'reference' ? 'reference' : 'create',
    params: Object.entries(st.params) };
  return s.mode === 'casual' ? P.buildCasual(input) : P.buildPrompt(input);
}
function recordOf(game, st, s, text) {
  const rec = s.mode === 'casual' ? 'casual' + st.casualN : st.form + (s.mode === 'open' ? '_open' : '');
  return { version: 1, book: game.key, title: game.title, mode: s.mode, form: st.form, stage: STAGE[st.form], style: st.style, styleVersion: st.version,
    file: fileOf(game, s, st.style), record: `records/${game.key}/${rec}-ui.json`, at: new Date().toISOString(),
    storage: { last: game.key, cards: { [game.key]: st } }, prompt: text };
}

function build(dir) {
  const set = JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8'));
  const game = gameOf(set.book), plan = set.plan ? JSON.parse(fs.readFileSync(set.plan, 'utf8')) : null;
  const errs = validate(set, game, plan);
  if (errs.length) { for (const e of errs) console.error('  X ' + e); console.error('settings.json 에 ' + errs.length + ' 가지 — 아무것도 안 썼다'); return 1; }
  const { pilot, list } = slots(game, plan), out = [];
  for (const s of list) {
    const st = stateOf(game, set, s, pilot), text = promptOf(game, st, s);
    if (!text) { console.error('  X ' + s.slot + ' 지시문이 비었다'); return 1; }
    out.push({ s, rec: recordOf(game, st, s, text) });
  }
  for (const { s, rec } of out) {
    fs.writeFileSync(path.join(dir, s.slot + '-prompt.txt'), rec.prompt);
    fs.writeFileSync(path.join(dir, s.slot + '-ui.json'), JSON.stringify(rec, null, 1) + '\n');
  }
  const st = styleOf().key, rows = out.map(({ s, rec }, i) =>
    `| ${i + 1} | ${s.slot} | ${s.mode === 'form' ? (s.identityMode === 'create' ? '새 인물(첫 그림)' : '첫 그림 이어가기') : s.mode === 'open' ? '개방' : '일상'} | ${s.attach.map(a => a.endsWith('?') ? '(되면 ' + fileOf(game, { slot: a.slice(0, -1), mode: 'form' }, st) + ')' : fileOf(game, { slot: a, mode: 'form' }, st)).join(' + ') || '없음'} | ${rec.file} | ${rec.record} | ${sha(rec.prompt).slice(0, 12)} |`);
  fs.writeFileSync(path.join(dir, 'INDEX.md'), `# ${game.title} — 지시문 묶음\n\n만든 때 ${new Date().toISOString()} · 화풍 ${st} · 계획 ${set.plan || '없음(일상 자리 없음)'}\n\n` +
    '차례대로 그린다. 첨부는 앞에서 받아 정한 그림(원본)을 붙인다. `<자리>-prompt.txt` 를 고치지 않고 그대로 낸다.\n\n' +
    '| 차례 | 자리 | 인물 기준 | 첨부 | 올릴 파일 | 기록 자리 | 지시문 sha256 |\n|---|---|---|---|---|---|---|\n' + rows.join('\n') + '\n');
  console.log(`${game.title} — ${out.length} 자리 → ${dir}`);
  return 0;
}

function main(argv) {
  const cmd = argv[0], o = {};
  for (let i = 1; i < argv.length; i++) { if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[++i]; else o.key = argv[i]; }
  if (!o.dir || !['init', 'build'].includes(cmd)) { console.error(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 20).join('\n')); return 2; }
  if (cmd === 'build') return build(o.dir);
  const game = gameOf(o.key), f = path.join(o.dir, 'settings.json');
  if (fs.existsSync(f)) { console.error(f + ' 가 이미 있다 — 덮지 않는다'); return 1; }
  fs.mkdirSync(o.dir, { recursive: true });
  fs.writeFileSync(f, JSON.stringify(initSettings(game, o.plan), null, 1) + '\n');
  console.log('→ ' + f);
  return 0;
}
module.exports = { slots, initSettings, validate, stateOf, promptOf, recordOf, build };
if (require.main === module) process.exit(main(process.argv.slice(2)));
