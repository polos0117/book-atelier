/* 책 결투 규칙을 화면 없이 하나하나 본다 — 파생·덱·판·치기·상성·장·절정·열다섯 권 고유 규칙·AI.
   Run: node tests/duel.cjs */
const fs = require('node:fs'), assert = require('node:assert/strict');
const D = require('../lib/duel.js');
const J = n => JSON.parse(fs.readFileSync('data/' + n + '.json', 'utf8'));
const data = { design: J('book-design'), duel: J('duel') };
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const KEYS = data.design.books.map(b => b.key);
const G = Object.fromEntries(data.design.books.map(b => [b.key, b.genre]));
const R = (key, f) => data.design.books.find(b => b.key === key).forms[D.STAGES[f]].role;

/* ── 파생 — 열다섯 권, 폼 셋의 역할, 책마다 효과가 있다 ── */
{
  const C = D.cardsOf(data);
  ok(C.list.length === 15 && C.list.every(k => C.cards[k].roles.length === 3 && data.duel.roles[C.cards[k].roles[0]]), '열다섯 권 · 역할 셋 · 역할 수치가 있다');
  ok(KEYS.every(k => D.BOOK[k]), '책마다 고유 규칙 효과가 있다: ' + KEYS.filter(k => !D.BOOK[k]).join());
  ok(Object.keys(D.BOOK).every(k => KEYS.includes(k)), '효과 표에 설계표에 없는 책이 없다');
  ok(data.design.vocab.role.every(r => data.duel.roles[r] && data.duel.opens[r]), '정한 역할 여섯 모두 수치와 절정 장면이 있다');
  ok(data.design.vocab.genre.every(g => data.duel.chart[g]), '장르마다 상성 줄');
  for (const a of data.design.vocab.genre) for (const b of Object.keys(data.duel.chart[a])) {
    ok(data.design.vocab.genre.includes(b), a + ' → ' + b + ' 는 정한 장르');
    if (data.duel.chart[a][b] > 0) ok((data.duel.chart[b][a] || 0) <= 0, a + ' 가 ' + b + ' 에 유리하면 ' + b + ' 는 ' + a + ' 에 유리하지 않다');
  }
  ok(D.mult(data, '비극', '로맨스') === 2 && D.mult(data, '로맨스', '비극') === -1 && D.mult(data, '추리', '모험') === 0, '상성 보정 — 유리 +2 · 불리 −1 · 없으면 0');
  ok(D.cardOf(data, 'hamlet').genre === '비극' && D.cardOf(data, '없는책') === null, '카드 찾기');
}
/* ── 덱 — 서로 다른 여섯 ── */
{
  ok(D.validateDeck(data, KEYS.slice(0, 6)).ok, '여섯 권');
  ok(D.validateDeck(data, KEYS.slice(0, 5)).problems.join() === 'count', '다섯 권은 count');
  ok(D.validateDeck(data, KEYS.slice(0, 5).concat(KEYS[0])).problems.includes('dup'), '같은 책 둘');
  ok(D.validateDeck(data, KEYS.slice(0, 5).concat('없는책')).problems.includes('unknown'), '모르는 책');
  const d1 = D.randomDeck(data, { rngState: 3 }), d2 = D.randomDeck(data, { rngState: 3 });
  ok(d1.length === 6 && new Set(d1).size === 6 && d1.join() === d2.join() && d1.join() !== D.randomDeck(data, { rngState: 4 }).join(), '무작위 덱 — 여섯 · 같은 시드 같은 덱');
}
/* ── 판 — 시드·손패·선공 ── */
const fresh = seed => D.newMatch(data, { me: KEYS.slice(0, 6), foe: KEYS.slice(6, 12) }, seed);
{
  const a = fresh(42), b = fresh(42);
  ok(JSON.stringify(a) === JSON.stringify(b), '같은 시드 같은 판');
  ok(a.phase === 'play' && a.chapter === 0 && a.turnNo === 0 && a.turn === a.first && a.first === a.coin, '놀이 중 · 발단 · 첫 턴은 선공');
  ok(a[a.first].hand.length === D.HAND + 1 && a[D.other(a.first)].hand.length === D.HAND && a[a.first].deck.length === D.DECK - D.HAND - 1, '선공은 손 셋 + 한 장 뽑음, 후공은 셋');
  ok(a.me.slots.every(x => x === null) && !a.me.opened && a.chapters.length === 0, '빈 자리 셋 · 절정 안 씀');
  let me = 0; for (let s = 0; s < 40; s++) if (fresh(s).first === 'me') me++;
  ok(me > 8 && me < 32, '선공은 양쪽 다 나온다: ' + me);
}
/* 손으로 짠 판 — 손패를 정하고 선공을 me 로. 덱은 비운다 */
function rig(myHand, foeHand, opt) {
  opt = opt || {};
  const st = D.newMatch(data, { me: KEYS.slice(0, 6), foe: KEYS.slice(6, 12) }, opt.seed || 1);
  st.me.hand = myHand.slice(); st.foe.hand = foeHand.slice(); st.me.deck = []; st.foe.deck = [];
  st.first = st.coin = st.turn = opt.first || 'me'; st.turnNo = 0; st.chapter = opt.chapter || 0;
  st.me.seen = []; st.foe.seen = []; st.auto = [];
  return st;
}
/* 수는 st.turn 쪽 것 — put 은 차례를 그쪽으로 돌려놓고 낸다(턴을 끝내지 않는다 — 장이 넘어가지 않게) */
const put = (st, who, key, slot) => { st.turn = who; const r = D.act(data, st, { kind: 'play', key, slot }); assert(r.ok, `${who} ${key} 자리 ${slot}: ${r.why}`); return st[who].slots[slot]; };
const hit = (st, who, slot, target) => { st.turn = who; const r = D.act(data, st, { kind: 'attack', slot, target }); assert(r.ok, `${who} 공격 ${slot}→${target}: ${r.why}`); return r; };
const start = (st, who) => { st.turn = who; D.BOOK; const c = { data, st }; for (const u of D.units(st, who)) if (D.live(u) && D.BOOK[u.key].turnStart) D.BOOK[u.key].turnStart(c, u); };
const u = (st, who, slot) => st[who].slots[slot];
/* 합법 수는 그쪽 차례일 때만 — 차례를 돌려놓고 본다 */
const LG = (st, who) => { st.turn = who; return D.legal(data, st, who); };

/* ── 내기·치기 — 들어온 책은 맞은편을 친다, 역할 수치, 상성, 방패 ── */
{
  const st = rig(['don_quixote', 'hamlet', 'kosmos'], ['treasure_island', 'chunhyang', 'sunzi']);
  ok(D.act(data, st, { kind: 'play', key: 'treasure_island', slot: 0 }).why === 'hand' && D.act(data, st, { kind: 'play', key: 'don_quixote', slot: 3 }).why === 'slot', '손에 없는 책 · 없는 자리');
  const L = LG(st, 'me'); ok(L.play.length === 3 && L.play[0].slots.join() === '0,1,2' && L.attack.length === 0 && L.open.length === 0 && L.pass && D.legal(data, st, 'foe').play.length === 0, '내 차례의 합법 수');
  const ti = put(st, 'foe', 'treasure_island', 0);
  ok(ti.power === 4 && D.roleOf(data, st, ti) === '정찰' && D.formOf(st, ti) === 0, '보물섬 발단은 정찰 — 힘 4');
  ok(st.foe.hand.join() === 'chunhyang,sunzi' && st.log[st.log.length - 1].t === 'play', '손에서 자리로 · 기록');
  const dq = put(st, 'me', 'don_quixote', 0);
  ok(dq.power === 6 && ti.power === 1, '돈키호테 발단 공격(타격 3) — 들어오며 맞은편 보물섬을 쳐서 4 → 1');
  ok(D.act(data, st, { kind: 'play', key: 'hamlet', slot: 0 }).why === 'slot', '찬 자리엔 못 낸다');
  const hm = put(st, 'me', 'hamlet', 1); ok(hm.power === 4 && D.roleOf(data, st, hm) === '정찰', '햄릿 발단 정찰 — 맞은편이 비어 아무도 안 맞는다');
  const ch = put(st, 'foe', 'chunhyang', 1);
  ok(ch.power === 7 && hm.power === 4, '춘향전 발단 버티기 7 — 들어오며 햄릿을 치지만 타격 1 + 비극에 불리 −1 = 0');
  ok(D.sum(data, st, 'me') === 10 && D.sum(data, st, 'foe') === 8, '합 — 나 6 + 4, 상대 1 + 7');
  /* 공격 — 햄릿(정찰)은 어느 자리든, 돈키호테는 맞은편만 */
  const A = LG(st, 'me').attack;
  ok(A.filter(x => x.slot === 0).map(x => x.target).join() === '0' && A.filter(x => x.slot === 1).map(x => x.target).sort().join() === '0,1', '돈키호테는 맞은편만, 햄릿(정찰)은 어느 자리든: ' + JSON.stringify(A));
  ok(D.act(data, st, { kind: 'attack', slot: 0, target: 1 }).why === 'target' && D.act(data, st, { kind: 'attack', slot: 2, target: 0 }).why === 'slot', '맞은편이 아닌 자리 · 빈 자리');
  hit(st, 'me', 1, 0); ok(st.foe.slots[0] === null && st.foe.grave.join() === 'treasure_island', '햄릿(비극 → 모험 +2) 타격 4 → 보물섬 1 닫힌다');
  hit(st, 'me', 1, 1); ok(ch.power === 7, '춘향전 발단 — 첫 타격을 무효로 한다(절개)');
  hit(st, 'me', 1, 1); ok(ch.power === 7 - (2 + 2 - 1), '둘째 타격 — 2 + 비극→로맨스 2 − 방패 1 = 3');
}
/* ── 턴·장·책장 넘기기·승패 ── */
{
  const st = rig(['don_quixote', 'alice'], ['sunzi', 'kosmos']);
  ok(D.play(data, st, 'don_quixote', 0).ok && st.turn === 'foe' && st.turnNo === 1, '내면 차례가 넘어간다');
  ok(D.pass(data, st).ok && st.turn === 'me' && st.turnNo === 2, '넘기기');
  D.play(data, st, 'alice', 1); D.play(data, st, 'sunzi', 2); D.pass(data, st);
  ok(st.turnNo === 5 && st.chapter === 0, '다섯 수');
  D.play(data, st, 'kosmos', 0);   /* 여섯째 수 → 장이 끝난다 */
  ok(st.chapter === 1 && st.turnNo === 0 && st.chapters.length === 1, '양쪽 세 턴이면 책장을 넘긴다');
  const c = st.chapters[0]; ok(c.me === 4 + 5 + D.firstBonus(data) && c.foe === 4 + 4 && c.winner === 'me', '발단 합 — 나 돈키호테 6(코스모스 정찰 2 맞고 4) + 앨리스 5 + 선공 보정, 상대 손자병법 4 + 코스모스 4: ' + JSON.stringify(c));
  ok(st.first === 'me' && st.turn === 'me', '장을 가져간 쪽이 다음 장 선공(잃은 쪽이 마지막 수)');
  const dq = u(st, 'me', 0), al = u(st, 'me', 1), sz = u(st, 'foe', 2);
  ok(D.formOf(st, dq) === 1 && D.roleOf(data, st, dq) === '돌파' && dq.power === 5 && D.roleOf(data, st, al) === '교란' && al.power === 5 && D.roleOf(data, st, sz) === '교란', '전개 — 모든 책이 새 폼, 힘은 새 폼 기본으로');
  for (let i = 0; i < 6; i++) D.pass(data, st);
  ok(st.chapter === 2 && st.chapters.length === 2 && st.chapters[1].winner === 'foe' && st.chapters[1].me === 10 && st.chapters[1].foe === 12 && st.first === 'foe', '전개도 넘겼다 — 돌파 5 + 교란 5 대 교란 5 + 버티기 7, 이번엔 상대가 가져가 상대 선공');
  for (let i = 0; i < 6; i++) D.pass(data, st);
  ok(st.phase === 'done' && st.chapters.length === 3 && st.chapters[2].winner === 'draw' && st.chapters[2].me === 10 && st.chapters[2].foe === 10, '결말 — 지원 4 + 돌파 5 + 지원 보너스 1 대 지원 4 + 지원 4 + 서로 1: 동점');
  ok(st.winner === 'me' && st.turn === null && st.log[st.log.length - 1].t === 'done', '한 장씩 가져가고 하나 동점 → 세 장 총합(33 대 30)으로 내가 이긴다');
  ok(D.pass(data, st).why === 'phase' && D.play(data, st, 'x', 0).why === 'phase', '끝난 판엔 못 둔다');
}
{ /* 선공 보정 — 첫 장의 선공 합에 더한다. 빈 판은 자동 넘기기로 한 번에 끝까지 간다 */
  const FB = D.firstBonus(data);
  ok(FB > 0, '선공 보정이 있다(후공이 마지막 수를 둔다 — tests/duel-sim.cjs 가 선공 승률로 맞춘다)');
  const st = rig([], [], { first: 'foe' }); D.pass(data, st);
  ok(st.phase === 'done' && st.chapters.length === 3 && st.auto.length >= 15, '빈 판 — 할 것이 없으면 자동으로 넘어가 끝까지 간다: ' + st.auto.length);
  ok(st.chapters[0].foe === FB && st.chapters[0].me === 0 && st.chapters[0].winner === 'foe' && st.chapters[1].winner === 'draw' && st.chapters[2].winner === 'draw' && st.winner === 'foe', '첫 장은 선공 보정만, 나머지는 동점 → 선공이 이긴다: ' + JSON.stringify(st.chapters));
  const t2 = rig(['kosmos'], ['sunzi']);   /* 둘 다 책을 들고 있어 자동으로 넘어가지 않는다 */
  for (let i = 0; i < 6; i++) D.pass(data, t2);
  ok(t2.chapters.length === 1 && t2.chapters[0].winner === 'me' && t2.first === 'me' && t2.turn === 'me', '선공(me)이 보정으로 첫 장을 가져가고 다음 장도 선공');
  D.play(data, t2, 'kosmos', 0); while (t2.chapters.length < 2 && t2.phase === 'play') D.pass(data, t2);
  ok(t2.chapters[1].winner === 'me' && t2.chapters[1].me === 7 && t2.chapters[1].foe === 0, '전개 — 코스모스 버티기 7, 둘째 장엔 보정이 없다');
}
/* ── 역할 하나 더 — 돌파 방패 무시 · 지원 아군 힘 · 교란 번짐 ── */
{
  const st = rig(['hamlet', 'baskervilles'], ['chunhyang', 'kosmos'], { chapter: 2 });   /* 결말: 햄릿 공격 6/3, 바스커빌 공격 6/3 · 춘향전 공격 6/3, 코스모스 지원 4/1 */
  const ch = put(st, 'foe', 'chunhyang', 0), ko = put(st, 'foe', 'kosmos', 1);
  ok(D.cur(data, st, ch) === 7 && D.cur(data, st, ko) === 4 && D.sum(data, st, 'foe') === 11, '지원(코스모스 결말) — 다른 아군 힘 +1');
  const st2 = rig(['frankenstein'], ['chunhyang'], { chapter: 1 });   /* 전개: 프랑켄슈타인 공격 6/3 · 춘향전 버티기 7/1/1 */
  const c2 = put(st2, 'foe', 'chunhyang', 0); put(st2, 'me', 'frankenstein', 0);
  ok(c2.power === 7 - (3 + 2 - 1), '공포 → 로맨스 +2, 방패 1 — 7 → 3 (전개 춘향전은 첫 타격 무효가 없다)');
  const st3 = rig(['don_quixote'], ['chunhyang'], { chapter: 1 });   /* 전개 돈키호테 돌파 5/3 — 방패 무시 */
  const c3 = put(st3, 'foe', 'chunhyang', 0); put(st3, 'me', 'don_quixote', 0);
  ok(c3.power === 7 - 3 && c3.tok === 1, '돌파는 방패를 무시한다 — 7 → 4, 춘향전 전개는 맞을 때마다 절개');
  const st4 = rig(['alice'], ['sunzi', 'kosmos'], { chapter: 1 });   /* 전개 앨리스 교란 5/2 — 번짐 1 */
  const sz4 = put(st4, 'foe', 'sunzi', 0), ko4 = put(st4, 'foe', 'kosmos', 1); put(st4, 'me', 'alice', 0);
  ok(sz4.power === 5 - 2 && ko4.power === 7 - 1, '교란 — 맞은편 2, 다른 상대 가운데 센 것에 1 번진다');
}
/* ── 절정(개방) — 한 판에 한 번, 그 폼의 역할이 장면을 정한다 ── */
{
  const st = rig(['don_quixote', 'alice', 'hamlet'], ['chunhyang', 'kosmos', 'treasure_island']);
  ok(LG(st, 'me').open.length === 0 && D.act(data, st, { kind: 'open', slot: 0 }).why === 'slot', '빈 자리는 못 연다');
  put(st, 'foe', 'chunhyang', 0); put(st, 'foe', 'kosmos', 1); put(st, 'foe', 'treasure_island', 2);
  const dq = put(st, 'me', 'don_quixote', 0), al = put(st, 'me', 'alice', 1);
  const ch = u(st, 'foe', 0), ko = u(st, 'foe', 1);
  ok(ch.power === 6 && ko.power === 4 - 1, '들어오며 — 춘향전은 돈키호테의 첫 타격을 무효로 하고 앨리스의 번짐 1 은 맞는다, 코스모스는 앨리스(교란 2, 동화 → 과학 −1) 1');
  ok(LG(st, 'me').open.join() === '0,1', '내 책마다 열 수 있다');
  st.turn = 'me';
  ok(D.act(data, st, { kind: 'open', slot: 0 }).ok && st.me.opened && st.last.kind === 'open' && st.last.role === '공격', '돈키호테 발단 공격 — 절정');
  ok(ch.power === 6 - (3 - 1) - 1 && ko.power === 3 - 1, '공격 장면 — 내 책 모두 맞은편을 한 번 더 친다(돈키호테 2 + 앨리스 번짐 1, 코스모스 1)');
  ok(D.act(data, st, { kind: 'open', slot: 1 }).why === 'opened' && LG(st, 'me').open.length === 0, '한 판에 한 번');
  /* 다른 장면들 */
  const scene = (key, chapter, foes) => { const s = rig([key], foes, { chapter }); foes.forEach((k, i) => put(s, 'foe', k, i)); const me = put(s, 'me', key, 2); s.turn = 'me'; const r = D.act(data, s, { kind: 'open', slot: 2 }); assert(r.ok); return s; };
  { const s = scene('don_quixote', 1, ['chunhyang', 'kosmos']); ok(s.last.role === '돌파' && u(s, 'foe', 0).power === 7 - 4, '돌파 장면 — 가장 센 상대(춘향전 7)에 4, 방패 무시'); }
  { const s = scene('chunhyang', 0, ['sunzi']); ok(s.last.role === '버티기' && u(s, 'me', 2).power === 9, '버티기 장면 — 내 책 모두 +2'); }
  { const s = scene('kosmos', 2, ['sunzi']); u(s, 'me', 2).power = 1; s.turn = 'me'; s.me.opened = false; D.act(data, s, { kind: 'open', slot: 2 }); ok(s.last.role === '지원' && u(s, 'me', 2).power === 4 + 1, '지원 장면 — 기본 힘까지 회복하고 +1'); }
  { const s = scene('hamlet', 0, ['sunzi', 'kosmos']); ok(s.last.role === '정찰' && s.foe.revealedAll && u(s, 'foe', 0).power === 3 && u(s, 'foe', 1).power === 3, '정찰 장면 — 상대 손패가 보이고 상대 책 모두 −1'); }
  { const s = scene('alice', 0, ['sunzi', 'kosmos']); ok(s.last.role === '교란' && D.units(s, 'foe').length === 2 && D.sum(data, s, 'foe') === 4 + 4 - 2, '교란 장면 — 자리를 뒤섞고 상대 책 모두 −1'); }
}

/* ── 열다섯 권 ── */
{ /* 코스모스 — 연결 */
  const st = rig(['kosmos', 'hamlet', 'treasure_island'], ['sunzi']);
  const ko = put(st, 'me', 'kosmos', 0), hm = put(st, 'me', 'hamlet', 1);
  start(st, 'me'); ok(hm.flags.linked && hm.power === 5 && ko.power === 5 && ko.tok === 1, '발단 — 다른 장르 아군과 연결, 둘 다 +1(코스모스 발단 정찰 4 → 5)');
  start(st, 'me'); ok(ko.tok === 1, '같은 아군과 또 연결하지 않는다');
  const ti = put(st, 'me', 'treasure_island', 2); start(st, 'me'); ok(ti.flags.linked && ko.tok === 2, '턴마다 하나씩 더');
  st.chapter = 1; ko.power = 7; const sz = put(st, 'foe', 'sunzi', 0);   /* 손자병법 전개 교란 2, 사상 → 과학 +2 = 4 */
  ok(ko.power === 7 - Math.max(0, 4 - 1 - 2), '전개 — 연결된 아군 수(2)만큼 받는 피해가 준다(손자병법 교란 2 + 사상 → 과학 2 − 방패 1 − 연결 2 = 1)');
  st.chapter = 2; ko.flags.entered = {}; D.BOOK.kosmos.form({ data, st }, ko, 2); ok(hm.power === 4 + 2 && ti.power === 5 + 2, '결말 — 연결된 아군 모두 +2(햄릿은 손자병법 번짐에 1 맞아 4)');
}
{ /* 돈키호테 — 망상 */
  const st = rig(['don_quixote', 'alice'], ['chunhyang']);
  const ch = put(st, 'foe', 'chunhyang', 0), dq = put(st, 'me', 'don_quixote', 0);
  start(st, 'me'); ok(dq.tok === 1 && dq.power === 7, '발단 — 맞은편(춘향전 7)이 더 세면 망상 +1, 힘 +1');
  start(st, 'me'); ok(dq.tok === 1 && dq.power === 7, '7 대 7 — 더 세지 않으면 안 쌓인다');
  ch.power = 9; start(st, 'me'); ok(dq.tok === 2 && dq.power === 8, '다시 더 세면 또');
  st.chapter = 1; dq.power = 5; ch.power = 7; hit(st, 'me', 0, 0); ok(ch.power === 7 - (3 + 2) && dq.tok === 0, '전개 — 돌격: 타격 3 + 망상 2(방패 무시)');
  dq.tok = 3; st.chapter = 2; const al = put(st, 'me', 'alice', 1); D.BOOK.don_quixote.form({ data, st }, dq, 2); ok(al.power === 5 + 3 && dq.tok === 0, '결말 — 남은 망상을 아군에게');
}
{ /* 앨리스 — 크기 */
  const st = rig(['alice'], ['don_quixote', 'kosmos']);
  const al = put(st, 'me', 'alice', 0); const dq = put(st, 'foe', 'don_quixote', 0);
  ok(al.power === 5 && !al.flags.dodge, '발단 — 첫 타격을 피한다(돈키호테 3)');
  hit(st, 'foe', 0, 0); ok(al.power === 2, '둘째는 맞는다');
  st.chapter = 1; al.power = 5; dq.power = 5; start(st, 'me'); ok(dq.power === 4 && al.power === 6, '전개 — 맞은편의 힘 1 을 빼앗는다');
  const ko = put(st, 'foe', 'kosmos', 1); dq.power = 2; ko.power = 7; st.chapter = 2; D.BOOK.alice.form({ data, st }, al, 2);
  ok(dq.power === 7 && ko.power === 2, '결말 — 상대의 가장 큰 책과 가장 작은 책의 힘을 맞바꾼다');
}
{ /* 프랑켄슈타인 — 기워 붙이기 */
  const st = rig(['frankenstein', 'alice', 'hamlet'], ['chunhyang', 'dracula']);
  const fr = put(st, 'me', 'frankenstein', 0), al = put(st, 'me', 'alice', 1); const ch = put(st, 'foe', 'chunhyang', 1);
  ok(al.power === 5 && !al.flags.dodge, '춘향전이 들어오며 앨리스를 치지만(1) 앨리스가 피했다');
  al.power = 1; hit(st, 'foe', 1, 1);
  ok(st.me.slots[1] === null && fr.power === 7 + 3 && fr.tok === 1, '발단 — 아군(앨리스 5)이 닫히면 절반(3)을 이어받는다');
  st.chapter = 1; fr.power = 6; ch.power = 1; ch.flags.endured = true; st.foe.slots[0] = ch; st.foe.slots[1] = null; hit(st, 'me', 0, 0);
  ok(st.foe.slots[0] === null && fr.flags.borrow === 1, '전개 — 상대 책이 닫히면 타격을 하나 이어받는다');
  const dr = put(st, 'foe', 'dracula', 0); fr.power = 6; hit(st, 'me', 0, 0); ok(dr.power === 6 - (3 + 1), '빌린 타격 +1(공격 3 + 1, 공포 → 공포 0)');
  st.chapter = 2; const hm = put(st, 'me', 'hamlet', 2); fr.power = 6;
  const L = LG(st, 'me'); ok(L.attack.filter(x => x.slot === 0).length === 0 && L.rule.length === 1 && L.rule[0].target === 2, '결말 — 공격 대신 넘기고 떠난다: ' + JSON.stringify(L.rule));
  st.turn = 'me'; ok(D.act(data, st, { kind: 'rule', slot: 0, target: 2 }).ok && st.me.slots[0] === null && hm.power === 6 + 6 + 1 && st.me.grave.includes('frankenstein'), '지닌 힘(6) + 조각(1)을 햄릿에게 넘기고 떠난다');
}
{ /* 춘향전 — 절개 */
  const st = rig(['chunhyang'], ['dracula', 'hamlet'], { chapter: 1 });
  const ch = put(st, 'me', 'chunhyang', 0); const dr = put(st, 'foe', 'dracula', 0);   /* 드라큘라 전개 공격 3 + 공포 → 로맨스 2 − 방패 1 = 4 */
  ok(ch.power === 3 && ch.tok === 1, '전개 — 맞으면 절개 +1');
  hit(st, 'foe', 0, 0); ok(ch.power === 1 && ch.flags.endured && ch.tok === 2, '닫힐 피해에 한 번 힘 1 로 버틴다');
  st.chapter = 2; ch.power = 6; const hm = put(st, 'foe', 'hamlet', 1); dr.power = 6; hm.power = 6;
  hit(st, 'me', 0, 0); ok(dr.power === 6 - (3 - 1 - 1) - 2 && hm.power === 6 - 2, '결말 — 공격(3, 로맨스 → 공포 −1, 드라큘라 결말 방패 1)하면 상대 책 모두에게 절개(2)만큼 반격');
}
{ /* 햄릿 — 의심 */
  const st = rig(['hamlet'], ['dracula', 'kosmos']);
  const hm = put(st, 'me', 'hamlet', 0);
  start(st, 'me'); ok(hm.tok === 1 && st.foe.seen.join() === 'dracula', '발단 — 의심 +1, 상대 손패 한 장이 보인다');
  st.chapter = 1; start(st, 'me'); ok(hm.tok === 2, '전개도 쌓는다');
  const dr = put(st, 'foe', 'dracula', 0); hm.power = 5;
  hit(st, 'me', 0, 0); ok(hm.tok === 1 && dr.flags.silenced && !D.live(dr), '전개 — 의심 하나로 맞은편 규칙을 뒤튼다');
  dr.power = 6; hit(st, 'me', 0, 0); ok(dr.power === 6 - 2 && dr.mark === 0, '뒤틀린 드라큘라는 자국을 못 남긴다(공격 2, 비극 → 공포 0)');
  st.chapter = 2; hm.power = 6; hm.tok = 3; dr.power = 9; hit(st, 'me', 0, 0);
  ok(dr.power === 9 - (3 + 3 - 1) && st.me.slots[0] === null && st.me.grave.includes('hamlet'), '결말 — 의심을 다 공격으로(3 + 3, 드라큘라 결말 버티기 방패 1) 치고 자신도 닫힌다');
}
{ /* 바스커빌가의 개 — 단서 */
  const st = rig(['baskervilles'], ['dracula', 'kosmos', 'sunzi', 'alice']);
  const bk = put(st, 'me', 'baskervilles', 0);
  put(st, 'foe', 'dracula', 1); put(st, 'foe', 'kosmos', 2); ok(bk.tok === 2, '발단 — 상대가 책을 낼 때마다 단서');
  st.chapter = 1; bk.tok = 3; start(st, 'me'); ok(bk.tok === 0 && st.foe.revealed.join() === 'sunzi', '전개 — 단서 셋으로 상대 손패 한 장 공개');
  bk.power = 5; const sz = put(st, 'foe', 'sunzi', 0); ok(sz.flags.revealed && bk.power === 5, '공개된 책은 들어올 때 첫 타격이 없다(손자병법 사상 → 추리 0, 교란 2 였을 것)');
  st.chapter = 2; bk.power = 6; const dr = u(st, 'foe', 1); st.foe.slots[0] = dr; st.foe.slots[1] = sz;   /* 공개된 책을 다른 자리로 */
  const T = LG(st, 'me').attack.filter(x => x.slot === 0).map(x => x.target).sort().join(); ok(T === '0,1', '결말 — 맞은편(드라큘라)과 공개된 책(손자병법, 자리 1): ' + T);
  sz.power = 9; hit(st, 'me', 0, 1); ok(sz.power === 9 - (3 + 2) && sz.flags.erased && !D.live(sz), '공개된 책을 쳐서(+2) 규칙을 지운다');
}
{ /* 보물섬 — 항해 */
  const st = rig(['treasure_island', 'alice'], ['dracula', 'kosmos']);
  const ti = put(st, 'me', 'treasure_island', 0); start(st, 'me'); start(st, 'me'); ok(ti.tok === 2, '발단 — 턴마다 항해 +1');
  const dr = put(st, 'foe', 'dracula', 0), ko = put(st, 'foe', 'kosmos', 1); st.chapter = 1; ti.power = 5; ko.power = 7;
  ok(LG(st, 'me').attack.filter(x => x.slot === 0).map(x => x.target).sort().join() === '0,1', '전개 — 항해가 있으면 어느 자리든');
  hit(st, 'me', 0, 1); ok(ti.tok === 1 && ko.power === 7 - 3, '맞은편이 아닌 자리를 치면 항해 하나(돌파 3, 모험 → 과학 0, 코스모스 전개 버티기의 방패는 돌파가 무시)');
  ti.tok = 2; st.chapter = 2; const al = put(st, 'me', 'alice', 1); ti.flags.entered = {}; D.BOOK.treasure_island.form({ data, st }, ti, 2);
  ok(ti.power === 5 + 2 && al.power === 5 + 2, '결말 — 항해 둘이면 보물: 아군 전체 +2');
}
{ /* 타임머신 — 시간 */
  const st = rig(['time_machine', 'hamlet'], ['dracula']);
  const hm = put(st, 'me', 'hamlet', 0), tm = put(st, 'me', 'time_machine', 1);
  start(st, 'me'); ok(hm.offset === 1 && hm.flags.advanced && D.formOf(st, hm) === 1 && D.roleOf(data, st, hm) === '교란', '발단 — 아군(햄릿)의 책장을 한 쪽 앞으로: 발단인데 전개 폼');
  start(st, 'me'); ok(hm.offset === 1, '책마다 한 번');
  st.chapter = 1; const dr = put(st, 'foe', 'dracula', 1); tm.power = 5; hit(st, 'me', 1, 1); ok(dr.offset === -1 && D.formOf(st, dr) === 0, '전개 — 친 상대의 책장을 한 쪽 뒤로');
  st.chapter = 2; tm.power = 7; hm.power = 1; hm.offset = 0; dr.power = 6; dr.offset = 0; st.foe.slots[0] = dr; st.foe.slots[1] = null;
  hit(st, 'foe', 0, 0); ok(st.me.slots[0] === hm && hm.power === D.base(data, st, hm) && tm.flags.revived, '결말 — 닫히는 아군을 기본 힘으로 되돌린다');
  hm.power = 1; hit(st, 'foe', 0, 0); ok(st.me.slots[0] === null, '한 번만');
}
{ /* 손자병법 — 형세 */
  const st = rig(['sunzi'], ['dracula', 'kosmos', 'alice']);
  const sz = put(st, 'me', 'sunzi', 0); start(st, 'me'); start(st, 'me'); ok(sz.tok === 2, '발단 — 턴마다 형세');
  const dr = put(st, 'foe', 'dracula', 0), ko = put(st, 'foe', 'kosmos', 1); st.chapter = 1; sz.power = 5; ko.power = 2;
  start(st, 'me'); ok(st.foe.slots[0] === ko && st.foe.slots[1] === dr && sz.tok === 1, '전개 — 형세 둘로 맞은편을 상대의 가장 약한 책과 바꿔 세운다(형세는 먼저 +1)');
  st.chapter = 2; sz.tok = 3; sz.power = 4; ko.power = 9; hit(st, 'me', 0, 0);
  ok(st.foe.slots[0] === null && st.foe.grave.includes('kosmos') && sz.flags.won, '결말 — 형세 셋이면 첫 공격이 싸우지 않고 맞은편을 닫는다');
  st.foe.slots[0] = dr; st.foe.slots[1] = null; dr.power = 9; hit(st, 'me', 0, 0); ok(dr.power === 9 && !st.foe.grave.includes('dracula'), '둘째 공격은 보통(지원 타격 1, 사상 → 공포 0, 드라큘라 결말 방패 1 → 0)');
}
{ /* 오만과 편견 — 판정 */
  const st = rig(['pride_prejudice', 'alice'], ['dracula', 'kosmos']);
  const pp = put(st, 'me', 'pride_prejudice', 0); const dr = put(st, 'foe', 'dracula', 1);
  ok(dr.flags.judged, '발단 — 상대가 낸 책에 판정');
  const al = put(st, 'me', 'alice', 1); ok(dr.power === 5 - 2, '다른 아군(앨리스 교란 2)은 보통으로 친다');
  dr.power = 9; hit(st, 'me', 0, 1); ok(dr.power === 9 - (2 + 2 - 1), '판정한 책을 칠 때 +2(정찰 2 + 2, 로맨스 → 공포 −1)');
  st.chapter = 1; start(st, 'me'); ok(!dr.flags.judged && dr.flags.truce === pp.id && pp.flags.truce === dr.id && pp.tok === 1, '전개 — 판정 하나를 뒤집는다, 서로 휴전');
  st.foe.slots[0] = dr; st.foe.slots[1] = null;
  ok(LG(st, 'me').attack.filter(x => x.slot === 0).length === 0 && D.targets({ data, st }, dr).length === 0, '뒤집힌 책과는 서로 치지 않는다');
  st.chapter = 2; al.power = 9; pp.flags.entered = {}; D.BOOK.pride_prejudice.form({ data, st }, pp, 2); ok(al.power === 11, '결말 — 뒤집은 수(1)만큼 가장 센 아군 +2');
}
{ /* 드라큘라 — 자국 */
  const st = rig(['dracula'], ['alice', 'kosmos']);
  const dr = put(st, 'me', 'dracula', 0); const al = put(st, 'foe', 'alice', 0); const ko = put(st, 'foe', 'kosmos', 1);
  ok(al.mark === 1 && ko.mark === 0, '발단 — 맞은편에 들어오는 책에 자국(초대)');
  dr.power = 5; hit(st, 'me', 0, 0); ok(al.mark === 2, '친 책에도 자국');
  st.chapter = 1; dr.power = 3; al.power = 6; al.flags.dodge = false; hit(st, 'me', 0, 0); ok(al.power === 6 - 3 && dr.power === 6, '전개 — 자국 난 책을 칠 때 준 피해만큼 힘을 빤다');
  st.chapter = 2; const L = LG(st, 'me');
  ok(L.rule.length === 1 && L.rule[0].target === 0, '결말 — 자국 둘인 상대 책을 데려오는 수');
  st.turn = 'me'; ok(D.act(data, st, { kind: 'rule', slot: 0, target: 0 }).ok && st.me.slots.includes(al) && st.foe.slots[0] === null && st.me.slots[0] === null && st.me.grave.includes('dracula'), '데려오고 자신은 사라진다');
}
{ /* 눈물을 마시는 새 — 동행 */
  const st = rig(['tear_drinking_bird', 'frankenstein', 'hamlet'], ['dracula', 'kosmos'], { chapter: 1 });
  const tb = put(st, 'me', 'tear_drinking_bird', 1), hm = put(st, 'me', 'hamlet', 2);
  start(st, 'me'); ok(tb.tok === 2, '서로 다른 장르 둘(동화·비극) — 동행 2');
  put(st, 'foe', 'dracula', 2);   /* 공포 → 비극 0: 상성이 아니라 그대로 햄릿이 맞는다 */
  ok(hm.power === 5 - 3 && tb.power === 7, '상성이 없으면 대신 받지 않는다');
  const fr = put(st, 'me', 'frankenstein', 0);
  const ko = put(st, 'foe', 'kosmos', 0);   /* 과학 → 공포 +2: 프랑켄슈타인 대신 눈물이 받는다(버티기 방패 1) */
  ok(fr.power === 6 && tb.power === 7 - (1 + 2 - 1) && tb.flags.took, '전개 — 상성에 밀리는 아군 대신 한 번 받는다');
  hit(st, 'foe', 0, 0); ok(fr.power === 6 - 3, '상대 턴에 한 번만');
  start(st, 'me'); ok(tb.tok === 3, '장르 셋(동화·공포·비극)이면 동행 3');
  st.chapter = 2; ko.power = 9; tb.flags.entered = {}; D.BOOK.tear_drinking_bird.form({ data, st }, tb, 2); ok(ko.flags.erased && !D.live(ko), '결말 — 상대의 가장 센 책 규칙을 지운다');
}
{ /* 반지의 제왕 — 짐 */
  const st = rig(['lord_of_the_rings', 'alice', 'hamlet'], ['dracula', 'kosmos']);
  const lr = put(st, 'me', 'lord_of_the_rings', 0), al = put(st, 'me', 'alice', 1);
  const dr = put(st, 'foe', 'dracula', 1);   /* 드라큘라 발단 교란 2 — 앨리스를 치려는데 반지가 대신 받는다 */
  ok(al.power === 5 - 1 && lr.power === 7 - (2 - 1) && lr.tok === 1 && lr.mark === 1, '발단 — 아군이 맞을 타격을 대신 받는다(방패 1), 짐 +1, 드라큘라의 자국도 반지에(교란 번짐 1 은 앨리스가 맞는다)');
  hit(st, 'foe', 1, 1); ok(lr.tok === 2 && lr.power === 5 && al.power === 3, '또 대신');
  st.chapter = 1; const hm = put(st, 'me', 'hamlet', 2); hm.power = 2; start(st, 'me'); ok(hm.flags.hidden && !al.flags.hidden, '전개 — 짐 둘이면 가장 약한 아군이 숨는다');
  ok(LG(st, 'foe').attack.every(x => x.target !== 2) && D.targets({ data, st }, dr).length === 1, '숨은 책은 못 친다');
  st.chapter = 2; const ko = put(st, 'foe', 'kosmos', 0); ko.power = 9; lr.flags.entered = {}; D.BOOK.lord_of_the_rings.form({ data, st }, lr, 2);
  ok(st.foe.slots[0] === null && st.me.slots[0] === null && st.foe.grave.includes('kosmos') && st.me.grave.includes('lord_of_the_rings'), '결말 — 짐 둘이면 상대의 가장 센 책을 없애고 자신도 내려간다');
}
{ /* 걸리버 여행기 — 잣대 */
  const st = rig(['gulliver', 'alice'], ['hamlet', 'treasure_island']);
  const gv = put(st, 'me', 'gulliver', 0); const hm = put(st, 'foe', 'hamlet', 0), ti = put(st, 'foe', 'treasure_island', 1);
  start(st, 'me'); ok(hm.flags.bound && ti.flags.bound && LG(st, 'foe').attack.length === 0, '발단 — 상대 책이 모두 자신(7)보다 작으면 묶인다: 이 장엔 못 친다');
  ok(gv.power === 7, '묶인 햄릿은 들어올 때 이미 친 뒤라 상관없고, 지금은 못 친다');
  st.chapter = 1; hm.flags.bound = ti.flags.bound = false; gv.power = 5; hm.power = 12; hit(st, 'me', 0, 0);
  ok(hm.power === 5 && gv.power === 12 - 4, '전개 — 친 상대(12)가 맞고도(교란 2 + 희극 → 비극 2) 자신(5)보다 세면 힘을 맞바꾼다: 8 ↔ 5');
  st.chapter = 2; const al = put(st, 'me', 'alice', 1); gv.power = 6; al.power = 3; hm.power = 9; ti.power = 1;
  gv.flags.entered = {}; D.BOOK.gulliver.form({ data, st }, gv, 2);
  ok(hm.power === 1 && ti.power === 9 && gv.power === 3 && al.power === 6, '결말 — 판 위 모든 책의 힘 차례를 뒤집는다(아군도)');
}
/* ── 자동 넘기기 — 할 수 있는 것이 없으면 넘긴다 ── */
{
  const st = rig(['kosmos'], []);
  ok(st.turn === 'me', '상대는 손도 판도 비어 — 내 차례만 이어진다');
  D.play(data, st, 'kosmos', 0); ok(st.turn === 'me' && st.turnNo === 2 && st.auto.join() === 'foe', '상대 턴은 자동으로 넘어갔다');
}
/* ── AI — 시드로 결정적, 합법인 수만, 끝까지 간다 ── */
{
  const game = (s, a, b) => { const rng = { rngState: s * 7 + 1 }; const st = D.newMatch(data, { me: D.randomDeck(data, rng), foe: D.randomDeck(data, rng) }, s); D.playOut(data, st, a || 'greedy', b || 'greedy'); return st; };
  for (let s = 0; s < 40; s++) { const st = game(s); ok(st.phase === 'done' && st.chapters.length === 3 && ['me', 'foe', 'draw'].includes(st.winner), '판 ' + s + ' 끝: ' + st.winner); }
  ok(JSON.stringify(game(7).log) === JSON.stringify(game(7).log), '같은 시드 같은 판 — AI 도');
  { let diff = 0; for (let s = 0; s < 20; s++) if (JSON.stringify(game(s, 'random', 'greedy').log) !== JSON.stringify(game(s).log)) diff++; ok(diff > 0, '무작위 AI 는 다른 수를 둔다: ' + diff); }
  { let w = 0, n = 0; for (let s = 0; s < 60; s++) { const st = game(s, 'greedy', 'random'); if (st.winner === 'me') w++; if (st.winner !== 'draw') n++; } ok(w / n >= 0.6, '욕심쟁이가 무작위를 60% 는 이긴다: ' + w + '/' + n); }
  { const st = rig(['don_quixote'], ['treasure_island']); put(st, 'foe', 'treasure_island', 1); st.turn = 'me';
    const mv = D.aiMove(data, st, 'greedy'); ok(mv.kind === 'play' && mv.key === 'don_quixote' && mv.slot === 1, '맞은편을 칠 수 있는 자리에 낸다: ' + JSON.stringify(mv)); }
  { const st = rig([], ['treasure_island']); put(st, 'foe', 'treasure_island', 1); st.turn = 'me'; ok(D.aiMove(data, st, 'greedy').kind === 'pass', '할 것이 없으면 넘긴다'); }
}
console.log('PASS 책 결투 규칙: ' + n + ' 가지');
