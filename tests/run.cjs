/* 서고 탐험 규칙 — 화면 없이 하나하나. 지도는 진짜 wasm(lib/shelf-gen.wasm)으로 짠다.
   Run: node tests/run.cjs */
const fs = require('node:fs'), assert = require('node:assert/strict');
const D = require('../lib/duel.js'), R = require('../lib/run.js'), S = require('../lib/shelf-gen.js');
const J = n => JSON.parse(fs.readFileSync('data/' + n + '.json', 'utf8'));
const data = { design: J('book-design'), duel: J('duel'), run: J('run') };
const KEYS = R.keysOf(data);
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const kindOf = (st, id) => R.roomOf(st, id).kind;
/* 방 종류를 찾아 들어간다 — 그 종류가 다음 방에 있을 때까지 다른 방으로 간다(없으면 null) */
function resolve(st) {   /* 들른 방을 아무것도 안 얻고 지나간다 — 싸움은 이긴 것으로 */
  if (st.phase === 'fight') { st.fight.phase = 'done'; st.fight.winner = 'me'; R.settle(data, st); }
  if (st.phase === 'reward') R.takeLoot(data, st, null);
  if (st.phase === 'read') R.read(data, st, null);
  if (st.phase === 'scene') R.scene(data, st, 'rest');
}
function walkTo(st, kind) {
  for (let g = 0; g < 20; g++) {
    const L = R.legal(st); if (!L.rooms.length) return null;
    const hit = L.rooms.find(id => kindOf(st, id) === kind); if (hit != null) { R.enter(data, st, hit); return hit; }
    const next = L.rooms.find(id => kindOf(st, id) !== 'stairs' && kindOf(st, id) !== 'boss');
    if (next == null) return null;
    R.enter(data, st, next); resolve(st);
  }
  return null;
}
(async () => {
  await S.load(fs.readFileSync('lib/shelf-gen.wasm'));
  const plan = S.plan(21, 1021, KEYS.length);
  /* ── 새 탐험 ── */
  ok(R.newRun(data, plan, KEYS.slice(0, 2)) === null && R.newRun(data, plan, [KEYS[0], KEYS[0], KEYS[1]]) === null, '책 셋, 서로 다르게');
  ok(R.newRun(data, { floors: [] }, KEYS.slice(0, 3)) === null, '지도가 아니면 못 연다');
  const st = R.newRun(data, plan, KEYS.slice(0, 3), { daily: true });
  ok(st && st.phase === 'map' && st.floor === 0 && st.room === 0 && st.lamps === 3 && st.deck.length === 3 && st.daily === true, '들어온 자리, 등불 셋, 덱 셋');
  ok(JSON.parse(JSON.stringify(st)).plan.floors.length === 9, '상태는 통째로 JSON — 지도도 안에');
  /* ── 움직임 — 길이 있는 방으로만 ── */
  const L0 = R.legal(st);
  ok(L0.rooms.length >= 1 && L0.rooms.every(id => R.roomOf(st, id).col === 1) && !L0.descend, '첫 선택지는 1열의 방들');
  ok(!R.enter(data, st, 99).ok && !R.enter(data, st, R.floorOf(st).rooms.length - 1).ok, '길이 없는 방으로는 못 간다');
  /* ── 독서대 — 덱에 없는 책 셋을 내밀고, 하나를 얻거나 지나간다 ── */
  { const s = JSON.parse(JSON.stringify(st)); const id = walkTo(s, 'read');
    if (id != null) {
      ok(s.phase === 'read' && s.offer.length === 3 && s.offer.every(k => !s.deck.includes(k)), '독서대 — 덱에 없는 셋');
      ok(!R.read(data, s, 'hamlet_없음').ok, '내민 것만');
      const k = s.offer[0]; ok(R.read(data, s, k).ok && s.deck.length === 4 && s.deck.includes(k) && s.phase === 'map' && s.stats.books === 1, '하나 얻어 넷');
    } else ok(true, '(이 지도의 첫 길엔 독서대가 없다)');
    const s2 = JSON.parse(JSON.stringify(st)); if (walkTo(s2, 'read') != null) { ok(R.read(data, s2, null).ok && s2.deck.length === 3 && s2.phase === 'map', '지나가기'); } }
  /* ── 싸움 — 그 층의 폼으로 한 장, 만난 책은 상대 첫 손에 ── */
  { const s = JSON.parse(JSON.stringify(st)); const id = walkTo(s, 'meet'); ok(id != null, '1층에 싸움이 있다');
    const r = R.roomOf(s), f = s.fight;
    ok(s.phase === 'fight' && f && f.firstChapter === 0 && f.lastChapter === 0 && f.chapter === 0, '발단 한 장');
    ok(f.foe.hand.includes(R.keyOf(data, r.book)) && f.runBook === R.keyOf(data, r.book), '만난 책이 상대 손에');
    ok(f.me.hand.length === 3 && f.me.deck.length === 0 && f.foe.hand.length + f.foe.deck.length === 6, '내 손 셋(덱 셋), 상대 여섯');
    ok(!R.enter(data, s, 0).ok && !R.read(data, s, 'x').ok, '싸우는 중엔 다른 일을 못 한다');
    /* 결말을 손으로 — 이기면 전리품, 지면 등불 */
    const win = JSON.parse(JSON.stringify(s)); win.fight.phase = 'done'; win.fight.winner = 'me'; R.settle(data, win);
    ok(win.phase === 'reward' && win.offer.length === 2 && win.stats.wins === 1 && win.lamps === 3, '이기면 전리품 둘');
    ok(R.takeLoot(data, win, win.offer[1]).ok && win.deck.length === 4 && win.phase === 'map', '전리품 하나');
    const lose = JSON.parse(JSON.stringify(s)); lose.fight.phase = 'done'; lose.fight.winner = 'foe'; R.settle(data, lose);
    ok(lose.phase === 'map' && lose.lamps === 2 && lose.stats.losses === 1, '지면 등불 하나');
    const draw = JSON.parse(JSON.stringify(s)); draw.fight.phase = 'done'; draw.fight.winner = 'draw'; R.settle(data, draw);
    ok(draw.phase === 'map' && draw.lamps === 3 && draw.stats.draws === 1, '비기면 그대로');
    const dead = JSON.parse(JSON.stringify(s)); dead.lamps = 1; dead.fight.phase = 'done'; dead.fight.winner = 'foe'; R.settle(data, dead);
    ok(dead.phase === 'over' && dead.lamps === 0, '마지막 등불이 꺼지면 갇힌다');
    /* 진짜로 둔다 — 내 수는 fightMove, 상대는 fightAi. 끝나면 결과 단계 */
    const real = JSON.parse(JSON.stringify(s)); let g = 0;
    while (real.phase === 'fight' && g++ < 60) { if (real.fight.turn === 'me') R.fightMove(data, real, D.aiMove(data, real.fight, 'greedy')); else R.fightAi(data, real, 'greedy'); }
    ok(['reward', 'map', 'over'].includes(real.phase) && real.fight.phase === 'done' && real.fight.chapters.length === 1, '한 장이 끝나면 판이 끝난다: ' + real.phase); }
  /* ── 덱이 가득이면 하나를 내놓아야 ── */
  { const s = JSON.parse(JSON.stringify(st)); s.deck = KEYS.slice(0, 6); const id = walkTo(s, 'read');
    if (id != null) { const k = s.offer[0]; ok(!R.read(data, s, k).ok && R.read(data, s, k, 'x').ok === false, '가득이면 내놓을 책이 있어야'); ok(R.read(data, s, k, s.deck[0]).ok && s.deck.length === 6 && s.deck.includes(k) && !s.deck.includes(KEYS[0]), '바꿔 넣기'); } }
  /* ── 쉼·장면 ── */
  { const s = JSON.parse(JSON.stringify(st)); s.lamps = 1; s.floor = 1; s.room = 0; s.visited = [0]; const id = walkTo(s, 'rest');
    if (id != null) ok(s.phase === 'map' && s.lamps === 2 && s.last.kind === 'rest', '쉬면 등불 하나'); else ok(true, '(2층 첫 길에 쉼이 없다)');
    const s2 = JSON.parse(JSON.stringify(st)); s2.lamps = 3; if (walkTo(s2, 'rest') != null) ok(s2.lamps === 3 && s2.last.gained === 0, '등불은 셋까지'); }
  { let found = false; for (let fl = 0; fl < 9 && !found; fl++) { const s = JSON.parse(JSON.stringify(st)); s.floor = fl; s.room = 0; s.visited = [0]; if (walkTo(s, 'scene') != null) { found = true;
      ok(s.phase === 'scene' && s.offer.length <= 1, '장면 — 책 하나(덱에 있으면 없음)');
      const a = JSON.parse(JSON.stringify(s)); ok(R.scene(data, a, 'read').ok && a.deck.length === (s.offer.length ? 4 : 3), '읽어 얻는다(덱에 있으면 쉰다)');
      const b = JSON.parse(JSON.stringify(s)); b.lamps = 2; ok(R.scene(data, b, 'rest').ok && b.lamps === 3 && b.phase === 'map', '쉬어 등불'); } }
    ok(found, '아홉 층 어딘가에 장면이 있다'); }
  /* ── 계단·보스 ── */
  { const s = JSON.parse(JSON.stringify(st)); ok(!R.descend(data, s).ok, '계단이 아니면 못 내려간다');
    const f = R.floorOf(s), stairs = f.rooms.find(r => r.kind === 'stairs').id; s.room = stairs; ok(R.descend(data, s).ok && s.floor === 1 && s.room === 0 && s.visited.length === 1 && s.stats.floors === 1, '내려간다');
    s.floor = 8; s.room = 0; s.visited = [0]; const boss = walkTo(s, 'boss'); ok(boss != null && s.phase === 'fight' && s.fight.runBoss && s.fight.firstChapter === 0 && s.fight.lastChapter === 2 && R.stageOf(s) === 2, '바닥의 보스는 세 장 전부');
    const again = JSON.parse(JSON.stringify(s)); again.fight.phase = 'done'; again.fight.winner = 'foe'; R.settle(data, again);
    ok(again.phase === 'map' && again.lamps === 2 && R.legal(again).boss && R.legal(again).rooms.length === 0, '보스에게 지면 등불 하나, 길은 없고 다시 도전뿐');
    ok(R.challenge(data, again).ok && again.phase === 'fight' && again.fight.runBoss, '다시 도전');
    s.fight.phase = 'done'; s.fight.winner = 'me'; R.settle(data, s); ok(s.phase === 'clear', '보스를 이기면 완주'); ok(!R.challenge(data, s).ok, '완주 뒤엔 도전이 없다'); }
  /* ── 끝까지 자동으로 — 두 정책, 끝은 over 아니면 clear ── */
  for (const policy of ['greedy', 'random']) for (let i = 0; i < 6; i++) { const a = R.autoPlay(data, R.newRun(data, S.plan(i, 7 + i, KEYS.length), KEYS.slice(i, i + 3)), policy);
    ok(['over', 'clear'].includes(a.phase) && a.deck.length >= 3 && a.deck.length <= 6 && new Set(a.deck).size === a.deck.length, policy + ' ' + i + ' 끝: ' + a.phase + ' ' + a.floor); }
  console.log('PASS 서고 탐험 규칙: ' + n + ' 가지');
})().catch(e => { console.error(e); process.exit(1); });
