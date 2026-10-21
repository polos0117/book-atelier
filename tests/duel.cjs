/* 책 결투 규칙을 화면 없이 하나하나 본다 — 파생·덱·판·치기·상성·장·절정·책마다 고유 규칙(설계표의 책 모두)·AI.
   Run: node tests/duel.cjs */
const fs = require('node:fs'), assert = require('node:assert/strict');
const D = require('../lib/duel.js');
const J = n => JSON.parse(fs.readFileSync('data/' + n + '.json', 'utf8'));
const data = { design: J('book-design'), duel: J('duel') };
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const KEYS = data.design.books.map(b => b.key);
const G = Object.fromEntries(data.design.books.map(b => [b.key, b.genre]));
const R = (key, f) => data.design.books.find(b => b.key === key).forms[D.stagesOf(data)[f]].role;

/* ── 파생 — 설계표의 책 모두, 폼 셋의 역할, 책마다 효과가 있다 ── */
{
  const C = D.cardsOf(data);
  ok(C.list.length === KEYS.length && KEYS.length >= 20 && C.list.every(k => C.cards[k].roles.length === 3 && data.duel.roles[C.cards[k].roles[0]]), '설계표의 책 ' + KEYS.length + '권 · 역할 셋 · 역할 수치가 있다');
  ok(KEYS.every(k => data.duel.books[k]), '책마다 data/duel.json 의 books 칸이 있다: ' + KEYS.filter(k => !data.duel.books[k]).join());
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
  { const s = scene('hamlet', 0, ['sunzi', 'kosmos']); ok(s.last.role === '정찰' && s.foe.revealedAll && u(s, 'foe', 0).power === 2 && u(s, 'foe', 1).power === 2, '정찰 장면 — 상대 손패가 보이고 상대 책 모두 −2'); }
  { const s = scene('alice', 0, ['sunzi', 'kosmos']); ok(s.last.role === '교란' && D.units(s, 'foe').length === 2 && D.sum(data, s, 'foe') === 4 + 4 - 2, '교란 장면 — 자리를 뒤섞고 상대 책 모두 −1'); }
}

/* ── 책마다 고유 규칙 ── */
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
  st.chapter = 2; fr.power = 6; fr.flags.entered = {}; D.BOOK.frankenstein.form({ data, st }, fr, 2); ok(st.me.slots[0] === fr, '결말 — 아군이 없으면 남아 싸운다');
  const hm = put(st, 'me', 'hamlet', 2); fr.flags.entered = {}; D.BOOK.frankenstein.form({ data, st }, fr, 2);
  ok(st.me.slots[0] === null && hm.power === 6 + 6 + 2 && st.me.grave.includes('frankenstein') && st.me.lost === 1, '결말에 들면 지닌 힘(6) + 조각마다 2 를 가장 센 아군(햄릿)에게 넘기고 떠난다 — 떠난 것은 패배로 세지 않는다');
}
{ /* 춘향전 — 절개 */
  const st = rig(['chunhyang'], ['dracula', 'hamlet'], { chapter: 1 });
  const ch = put(st, 'me', 'chunhyang', 0); const dr = put(st, 'foe', 'dracula', 0);   /* 드라큘라 전개 공격 3 + 공포 → 로맨스 2 − 방패 1 = 4 */
  ok(ch.power === 3 && ch.tok === 1, '전개 — 맞으면 절개 +1');
  const MAX = data.duel.books.chunhyang.max;
  hit(st, 'foe', 0, 0); ok(ch.power === 1 && ch.flags.endured && ch.tok === Math.min(2, MAX), '닫힐 피해에 한 번 힘 1 로 버틴다 — 절개는 books.chunhyang.max 까지');
  st.chapter = 2; ch.power = 6; ch.tok = 2; const hm = put(st, 'foe', 'hamlet', 1); dr.power = 6; hm.power = 6;
  hit(st, 'me', 0, 0); ok(dr.power === 6 - (3 - 1 - 1) && hm.power === 6 - 2, '결말 — 공격(3, 로맨스 → 공포 −1, 드라큘라 결말 방패 1)하면 다른 상대 책 모두에게 절개(2)만큼 반격 — 맞은편은 빼고');
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
  st.chapter = 1; bk.tok = 2; start(st, 'me'); ok(bk.tok === 0 && st.foe.revealed.join() === 'sunzi', '전개 — 단서 둘로 상대 손패 한 장 공개');
  bk.tok = 2; st.foe.hand = []; start(st, 'me'); ok(bk.tok === 0 && u(st, 'foe', 1).flags.revealed, '손패가 비었으면 판 위 가장 센 상대 책을 공개'); st.foe.hand = ['sunzi', 'alice'];
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
  start(st, 'me'); ok(st.foe.slots[0] === ko && st.foe.slots[1] === dr && sz.tok === 2 && sz.flags.moved, '전개 — 형세 하나로 맞은편을 상대의 가장 약한 책과 바꿔 세운다(형세는 먼저 +1: 3 → 2)');
  sz.tok = 4; start(st, 'me'); ok(st.foe.slots[0] === ko && sz.tok === 5, '장마다 한 번 — 둘째 턴엔 쌓기만');
  st.chapter = 2; sz.tok = 3; sz.power = 4; ko.power = 9; hit(st, 'me', 0, 0);
  ok(st.foe.slots[0] === null && st.foe.grave.includes('kosmos') && sz.flags.won, '결말 — 형세 셋이면 첫 공격이 싸우지 않고 맞은편을 닫는다');
  st.foe.slots[0] = dr; st.foe.slots[1] = null; dr.power = 9; hit(st, 'me', 0, 0); ok(dr.power === 9 && !st.foe.grave.includes('dracula'), '둘째 공격은 보통(지원 타격 1, 사상 → 공포 0, 드라큘라 결말 방패 1 → 0)');
}
{ /* 오만과 편견 — 판정 */
  const st = rig(['pride_prejudice', 'alice'], ['dracula', 'kosmos']);
  const ko0 = put(st, 'foe', 'kosmos', 2); const pp = put(st, 'me', 'pride_prejudice', 0); ok(ko0.flags.judged, '발단에 들어서면 이미 판 위의 상대도 판정');
  const dr = put(st, 'foe', 'dracula', 1);
  ok(dr.flags.judged, '발단 — 상대가 낸 책에 판정');
  const al = put(st, 'me', 'alice', 1); ok(dr.power === 5 - 2 - 2, '내 책 모두 판정한 책을 칠 때 +2(앨리스 교란 2 + 2)');
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
  st.chapter = 1; dr.power = 3; al.power = 6; al.flags.dodge = false; hit(st, 'me', 0, 0); ok(al.power === 6 - 3 && dr.power === 6 && al.mark === 3, '전개 — 자국 난 책을 칠 때 준 피해만큼 힘을 빨고 자국을 하나 더');
  st.chapter = 2; const L = LG(st, 'me');
  ok(L.rule.length === 1 && L.rule[0].target === 0, '결말 — 자국 둘인 상대 책을 데려오는 수');
  st.turn = 'me'; ok(D.act(data, st, { kind: 'rule', slot: 0, target: 0 }).ok && st.me.slots[0] === al && st.foe.slots[0] === null && st.me.grave.includes('dracula') && st.me.lost === 0, '데려온 책이 그녀 자리에 서고 자신은 사라진다(패배가 아니다)');
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
{ /* 프로젝트 헤일메리 — 실험(표본) */
  const st = rig(['project_hail_mary', 'treasure_island'], ['sunzi']);
  const sz = put(st, 'foe', 'sunzi', 0), ph = put(st, 'me', 'project_hail_mary', 0);
  ok(sz.power === 4 - (2 - 1), '들어오며 맞은편을 친다(정찰 2, SF → 사상 −1)');
  start(st, 'me'); ok(ph.tok === 1 && sz.flags.sample === 1, '발단 — 내 턴마다 맞은편을 실험해 표본 +1');
  start(st, 'me'); start(st, 'me'); ok(ph.tok === 2 && sz.flags.sample === 2, '표본은 둘까지');
  hit(st, 'foe', 0, 0); ok(ph.power === 4 - (2 + 2 - 2), '표본마다 그 책에게 받는 피해 −1(정찰 2 + 사상 → SF 2 − 표본 2)');
  st.chapter = 1; ph.power = 7; sz.power = 9;
  hit(st, 'foe', 0, 0); ok(ph.power === 7 - (2 + 2 - 1 - 2) && ph.flags.fuel === 1, '전개 — 받은 피해(교란 2 + 2 − 방패 1 − 표본 2 = 1)를 금빛 연료로');
  hit(st, 'me', 0, 0); ok(sz.power === 9 - (0 + 1) && !ph.flags.fuel, '다음 타격에 연료를 모두 더한다(버티기 1, SF → 사상 −1 = 0 + 연료 1)');
  st.chapter = 2; const ti = put(st, 'me', 'treasure_island', 1); ph.flags.entered = {}; D.BOOK.project_hail_mary.form({ data, st }, ph, 2);
  ok(ph.flags.teacher && D.targets({ data, st }, ph).length === 0 && LG(st, 'me').attack.every(x => x.slot !== 0), '결말 — 표본 둘이면 선생님: 자신은 더 치지 않는다');
  st.foe.slots[1] = sz; st.foe.slots[0] = null; sz.power = 9;
  hit(st, 'me', 1, 1); ok(sz.power === 9 - (1 + 2 + 1), '아군 모두 타격 +1(보물섬 지원 1 + 모험 → 사상 2 + 1)');
  const s2 = rig(['project_hail_mary'], []); const p2 = put(s2, 'me', 'project_hail_mary', 0); start(s2, 'me'); ok(p2.tok === 0, '맞은편이 비면 실험할 것이 없다');
}
{ /* 안나 카레니나 — 열정과 시선 */
  const st = rig(['anna_karenina', 'hamlet', 'gulliver'], ['sunzi']);
  const an = put(st, 'me', 'anna_karenina', 0); ok(an.tok === 1 && an.power === 5 + 1, '발단 — 내 책이 들어올 때마다(자신 포함) 열정 하나, 힘 +1');
  put(st, 'me', 'hamlet', 1); put(st, 'me', 'gulliver', 2); ok(an.tok === 2 && an.power === 5 + 2, '열정은 둘까지');
  st.chapter = 1; an.power = 6; const sz = put(st, 'foe', 'sunzi', 0);
  ok(an.flags.gaze === 1 && an.power === 6 - 2, '전개 — 맞을 때마다 시선 하나(손자병법 교란 2)');
  sz.power = 9; hit(st, 'me', 0, 0); ok(sz.power === 9 - 3 - 3 && an.tok === 1, '공격하면 열정 하나를 태워 맞은편을 한 번 더 친다(공격 3 × 2)');
  st.chapter = 2; st.foe.slots[0] = null; an.flags.gaze = 3; an.flags.entered = {}; D.BOOK.anna_karenina.form({ data, st }, an, 2);
  ok(st.me.slots[0] === an, '맞은편이 비면 기차가 와도 데려갈 책이 없다');
  st.foe.slots[0] = sz; an.flags.gaze = 2; start(st, 'me'); ok(st.me.slots[0] === an && st.foe.slots[0] === sz, '시선이 셋이 안 되면 오지 않는다');
  an.flags.gaze = 3; start(st, 'me');
  ok(st.me.slots[0] === null && st.foe.slots[0] === null && st.me.grave.includes('anna_karenina') && st.foe.grave.includes('sunzi') && st.me.lost === 1, '결말 — 시선 셋이면 기차가 온다: 맞은편과 자신을 함께 닫는다');
}
{ /* 괴도 신사 아르센 뤼팽 — 예고장 */
  const st = rig(['arsene_lupin'], ['sunzi', 'treasure_island', 'hamlet']);
  const sz = put(st, 'foe', 'sunzi', 0), ti = put(st, 'foe', 'treasure_island', 1), lp = put(st, 'me', 'arsene_lupin', 2);
  ok(sz.flags.notice && !ti.flags.notice, '발단 — 들어오면 상대 책 하나(가장 센 것, 같으면 먼저 온 것)에 예고장');
  hit(st, 'me', 2, 0); ok(sz.power === 4 - (2 + 1), '예고장 붙은 책을 칠 때 +1(정찰 2, 추리 → 사상 0)');
  st.chapter = 1; const hm = put(st, 'foe', 'hamlet', 2);
  ok(st.me.slots[0] === lp && st.me.slots[2] === null && lp.power === 4 && hm.flags.notice, '전개 — 변장: 맞기 직전 빈 자리로 빠져나가고, 친 책에 예고장을 하나 더');
  hit(st, 'foe', 0, 0); ok(lp.power === 4 - 2 && st.me.slots[0] === lp, '장마다 한 번 — 둘째 타격은 맞는다');
  st.chapter = 2; lp.power = 6; sz.power = 1; ti.power = 5; hm.power = 6; lp.flags.entered = {}; D.BOOK.arsene_lupin.form({ data, st }, lp, 2);
  ok(lp.power === 6 + 2 && hm.power === 6 - 2 && sz.power === 1 && ti.power === 5, '결말 — 예고장 붙은 상대 책마다 힘 2 를 훔친다(힘 1 은 남긴다, 예고장 없는 책은 그대로)');
  const s2 = rig(['arsene_lupin'], ['sunzi']); const l2 = put(s2, 'me', 'arsene_lupin', 0); const z2 = put(s2, 'foe', 'sunzi', 1);
  ok(l2.flags.pending === false && z2.flags.notice, '판이 비어 있으면 다음에 들어오는 상대 책에 예고장');
}
{ /* 파우스트 — 계약과 빚 */
  const st = rig(['faust'], ['sunzi', 'treasure_island']);
  const sz = put(st, 'foe', 'sunzi', 0), fa = put(st, 'me', 'faust', 0);
  ok(fa.tok === 1 && sz.power === 4 - (1 + 2), '발단 — 들어오면 계약: 빚 하나, 이 장 동안 타격 +2(버티기 1 + 2, 사상 → 사상 0)');
  st.chapter = 1; fa.power = 5; const ti = put(st, 'foe', 'treasure_island', 1);
  ok(LG(st, 'me').attack.filter(x => x.slot === 0).map(x => x.target).sort().join() === '0,1', '전개 — 빚이 있으면 맞은편이 아닌 상대 책도 칠 수 있다');
  hit(st, 'me', 0, 1); ok(ti.power === 5 - (3 - 1) && fa.tok === 2, '맞은편이 아닌 책을 치면 빚 하나 더(돌파 3, 사상 → 모험 −1)');
  sz.power = 9; hit(st, 'me', 0, 0); ok(sz.power === 9 - 3 && fa.tok === 2, '맞은편은 빚 없이');
  st.chapter = 2; fa.power = 4; start(st, 'me'); ok(fa.power === 5, '결말 — 멈추지 않는다: 내 턴마다 힘 +1');
  st.turn = 'me'; st.turnNo = 5; D.pass(data, st);
  ok(st.phase === 'done' && st.me.slots[0] === null && st.me.grave.includes('faust') && sz.power === 6 - 2 * 2 && st.chapters[0].me === 0, '결말이 끝날 때 빚이 남았으면 — 빚마다 상대의 가장 센 책에 2, 자신은 닫힌다(합을 세기 전)');
  const s2 = rig(['faust'], ['sunzi', 'treasure_island'], { chapter: 1 }); const z2 = put(s2, 'foe', 'sunzi', 0); put(s2, 'foe', 'treasure_island', 1); const f2 = put(s2, 'me', 'faust', 0);
  ok(f2.tok === 0 && D.targets({ data, st: s2 }, f2).length === 1, '발단에 계약하지 않았으면 빚이 없어 맞은편만');
}
{ /* 자산어보 — 분류(표식) */
  const st = rig(['jasan_eobo', 'treasure_island'], ['gulliver', 'don_quixote', 'sunzi']);
  const gv = put(st, 'foe', 'gulliver', 0), js = put(st, 'me', 'jasan_eobo', 0);
  ok(gv.power === 7 - (2 - 1), '들어오며 친다(정찰 2, 과학 → 희극 0, 버티기 방패 1)');
  start(st, 'me'); ok(gv.flags.tag, '발단 — 내 턴마다 맞은편을 관찰해 표식');
  hit(st, 'me', 0, 0); ok(gv.power === 6 - (2 + 1 - 1), '표식 붙은 책을 칠 때 +1');
  st.chapter = 1; const dq = put(st, 'foe', 'don_quixote', 1), sz = put(st, 'foe', 'sunzi', 2);
  start(st, 'me'); ok(dq.flags.tag && !sz.flags.tag, '전개 — 표식 붙은 책과 장르가 같은 상대 책(돈키호테·걸리버 둘 다 희극)에 표식이 번진다');
  const ti = put(st, 'me', 'treasure_island', 1); ok(dq.power === 5 - (3 + 1), '아군도 표식 붙은 책을 칠 때 +1(보물섬 돌파 3)');
  st.chapter = 2; js.power = 7; ti.power = 4; js.flags.entered = {}; D.BOOK.jasan_eobo.form({ data, st }, js, 2);
  ok(js.power === 7 + 2 && ti.power === 4 + 2, '결말 — 표식 붙은 상대 책 수(2)만큼 아군 모두 힘 +1');
}
{ /* 해저 2만 리 — 깊이 */
  const st = rig(['twenty_thousand_leagues', 'treasure_island'], ['hamlet', 'sunzi']);
  const hm = put(st, 'foe', 'hamlet', 0), tw = put(st, 'me', 'twenty_thousand_leagues', 0);
  ok(hm.power === 4, '들어오며 친다(버티기 1, 모험 → 비극 −1 = 0)');
  start(st, 'me'); start(st, 'me'); start(st, 'me'); ok(tw.tok === 2, '발단 — 내 턴마다 깊이 하나, 둘까지');
  hit(st, 'foe', 0, 0); ok(tw.power === 7 - (2 + 2 - 1 - 1), '깊이가 있으면 받는 피해 −1(정찰 2 + 비극 → 모험 2 − 방패 1 − 깊이 1)');
  st.chapter = 1; tw.power = 6; hm.power = 9;
  hit(st, 'me', 0, 0); ok(hm.power === 9 - (3 - 1 + 2 * 2) && tw.tok === 0, '전개 — 충각: 깊이를 모두 태워 깊이마다 +2(공격 3, 모험 → 비극 −1)');
  hm.power = 2; tw.tok = 0; hit(st, 'me', 0, 0); ok(st.foe.slots[0] === null && tw.tok === 0, '깊이를 태우지 않은 타격으로 닫으면 되찾지 않는다');
  st.foe.slots[0] = hm; hm.power = 2; tw.tok = 1; hit(st, 'me', 0, 0); ok(st.foe.slots[0] === null && tw.tok === 1, '친 책이 닫히면 깊이 하나를 되찾는다');
  st.chapter = 2; const sz = put(st, 'foe', 'sunzi', 1), ti = put(st, 'me', 'treasure_island', 2);
  tw.power = 5; sz.power = 5; ti.power = 5; tw.flags.entered = {}; D.BOOK.twenty_thousand_leagues.form({ data, st }, tw, 2);
  ok(tw.power === 5 && sz.power === 5 - 2 && ti.power === 5 - 2 && tw.tok === 0, '결말 — 소용돌이: 판 위 다른 모든 책(아군도)에 1 + 남은 깊이 1');
}
{ /* 천일야화 — 이야기 */
  const st = rig(['arabian_nights', 'treasure_island'], ['hamlet', 'lord_of_the_rings']);
  const hm = put(st, 'foe', 'hamlet', 0), an = put(st, 'me', 'arabian_nights', 0);
  ok(hm.power === 4 - 2, '들어오며 친다(교란 2, 동화 → 비극 0)');
  for (let i = 0; i < 4; i++) start(st, 'me'); ok(an.tok === 3, '발단 — 내 턴마다 밤 이야기 하나, 셋까지');
  st.chapter = 1; an.power = 1; hm.power = 9;
  hit(st, 'foe', 0, 0); ok(st.me.slots[0] === an && an.power === 1 && an.tok === 2, '전개 — 닫힐 피해를 받으면 이야기 하나로 하룻밤 미룬다(힘 1)');
  an.power = 5; hit(st, 'foe', 0, 0); ok(an.power === 5 - (2 - 1) && an.tok === 2, '닫히지 않을 피해에는 이야기를 쓰지 않는다(교란 2 − 방패 1)');
  st.chapter = 2; const ti = put(st, 'me', 'treasure_island', 1); ti.power = 2;
  put(st, 'foe', 'lord_of_the_rings', 1);
  ok(st.me.slots[1] === ti && ti.power === 4 && an.tok === 1, '결말 — 아군이 닫히려 하면 이야기 하나로 되살린다(지원 기본 4, 반지 돌파 3)');
  an.tok = 0; ti.power = 1; hit(st, 'foe', 1, 1); ok(st.me.slots[1] === null, '이야기가 없으면 되살리지 못한다');
}
{ /* 구운몽 — 인연 */
  const st = rig(['guunmong', 'treasure_island'], ['sunzi', 'dracula', 'kosmos']);
  const gm = put(st, 'me', 'guunmong', 0); ok(gm.tok === 0, '자신이 들어올 때는 인연이 없다');
  const sz = put(st, 'foe', 'sunzi', 1); ok(gm.tok === 1, '발단 — 상대 책이 들어오면 인연 하나');
  put(st, 'me', 'treasure_island', 2); ok(gm.tok === 2, '아군이 들어와도 인연 하나');
  const dr = put(st, 'foe', 'dracula', 2); put(st, 'foe', 'kosmos', 0); ok(gm.tok === 3, '인연은 셋까지');
  st.chapter = 1; gm.power = 6; st.foe.slots[0] = sz; st.foe.slots[1] = null; sz.power = 9;
  hit(st, 'me', 0, 0); ok(sz.power === 9 - (3 + 2 + 3) && gm.tok === 3, '전개 — 칠 때 인연마다 +1, 인연은 남는다(공격 3, 로맨스 → 사상 2)');
  st.chapter = 2; sz.power = 9; dr.power = 3; gm.tok = 1; gm.flags.entered = {}; D.BOOK.guunmong.form({ data, st }, gm, 2);
  ok(sz.flags.silenced && !dr.flags.silenced && !D.live(sz) && gm.tok === 0, '결말 — 꿈에서 깬다: 인연 하나마다 센 상대 책 하나의 규칙을 잠재운다');
}
{ /* 크툴루의 부름 — 조각 */
  const st = rig(['call_of_cthulhu'], ['sunzi', 'treasure_island']);
  const sz = put(st, 'foe', 'sunzi', 0), ct = put(st, 'me', 'call_of_cthulhu', 0);
  ok(sz.power === 4 - 2, '들어오며 친다(정찰 2, 공포 → 사상 0)');
  for (let i = 0; i < 4; i++) start(st, 'me'); ok(ct.tok === 3, '발단 — 내 턴마다 조각 하나, 셋까지');
  st.chapter = 1; sz.power = 5; start(st, 'me');
  ok(sz.flags.bound && ct.tok === 2 && D.targets({ data, st }, sz).length === 0, '전개 — 조각 하나로 맞은편을 광기에: 이 장엔 못 친다');
  start(st, 'me'); ok(ct.tok === 3, '장마다 한 번 — 전개에도 조각을 모은다');
  st.chapter = 2; const ti = put(st, 'foe', 'treasure_island', 1); sz.power = 4; ti.power = 7; ct.tok = 2;
  ct.flags.entered = {}; D.BOOK.call_of_cthulhu.form({ data, st }, ct, 2);
  ok(sz.power === 2 && ti.power === 3 && ct.tok === 0, '결말 — 조각 둘이면 깨어난다: 상대 책 모두 힘이 반으로(내림)');
  sz.power = 4; ct.tok = 1; ct.flags.entered = {}; D.BOOK.call_of_cthulhu.form({ data, st }, ct, 2); ok(sz.power === 4, '조각이 모자라면 깨어나지 않는다');
}
{ /* 한여름 밤의 꿈 — 꽃즙 */
  const st = rig(['midsummer_dream', 'kosmos'], ['treasure_island', 'dracula']);
  const ti = put(st, 'foe', 'treasure_island', 0), dr = put(st, 'foe', 'dracula', 1), md = put(st, 'me', 'midsummer_dream', 0);
  ok(ti.power === 4 - 2, '들어오며 친다(교란 2, 희극 → 모험 0)');
  start(st, 'me');
  ok(ti.flags.juice && ti.flags.truce === md.id && D.targets({ data, st }, ti).length === 0 && D.targets({ data, st }, md).length === 0, '발단 — 맞은편에 꽃즙: 반해서 이 장 동안 서로 치지 않는다');
  st.chapter = 1; ti.flags.truce = null; md.flags.truce = null; ti.power = 5; dr.power = 9;
  start(st, 'me'); ok(dr.power === 9 - 3 && md.flags.prank === 1, '전개 — 꽃즙 묻은 상대 책이 제 편 다른 책을 친다(보물섬 돌파 3, 모험 → 공포 0)');
  start(st, 'me'); ok(dr.power === 6, '장마다 한 번');
  st.chapter = 2; const ko = put(st, 'me', 'kosmos', 2); md.power = 6; ko.power = 3;
  md.flags.entered = {}; D.BOOK.midsummer_dream.form({ data, st }, md, 2);
  ok(ko.power === 3 + 2 && md.power === 6 && !ti.flags.juice, '결말 — 모두 제짝으로: 꽃즙을 풀고, 푼 꽃즙마다 가장 약한 아군 +2');
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
/* ── 서고 탐험이 쓰는 꼴 — 한 장만, 시작 장 고르기, 덱 셋~여섯 ── */
{
  ok(D.validateDeck(data, KEYS.slice(0, 3), { loose: true }).ok && D.validateDeck(data, KEYS.slice(0, 6), { loose: true }).ok, '느슨한 덱 — 셋과 여섯');
  ok(!D.validateDeck(data, KEYS.slice(0, 2), { loose: true }).ok && !D.validateDeck(data, KEYS.slice(0, 7), { loose: true }).ok && !D.validateDeck(data, KEYS.slice(0, 3)).ok, '둘·일곱은 안 되고, 보통 덱은 여섯만');
  const one = D.newMatch(data, { me: KEYS.slice(0, 3), foe: KEYS.slice(6, 12) }, 5, { start: 1, chapters: 1 });
  ok(one.chapter === 1 && one.firstChapter === 1 && one.lastChapter === 1 && one.me.hand.length === 3 && one.me.deck.length === 0, '전개에서 시작하는 한 장 결투 — 손 셋, 덱 비움');
  ok(one.me.hand.every(k => D.formOf(one, { key: k, offset: 0, flags: {} }) === 1), '손의 책은 전개 폼');
  D.playOut(data, one, 'greedy', 'greedy');
  ok(one.phase === 'done' && one.chapters.length === 1 && one.chapter === 1 && ['me', 'foe', 'draw'].includes(one.winner), '한 장이 끝나면 판이 끝난다 — 책장을 안 넘긴다: ' + JSON.stringify(one.chapters));
  ok(one.chapters[0].winner === one.winner, '그 장의 승자가 곧 판의 승자');
  { const bonus = data.duel.first_bonus, st = D.newMatch(data, { me: KEYS.slice(0, 3), foe: KEYS.slice(6, 12) }, 9, { start: 2, chapters: 1 });
    st.me.hand = []; st.me.deck = []; st.foe.hand = []; st.foe.deck = []; D.playOut(data, st, 'greedy', 'greedy');
    ok(st.chapters[0][st.coin] === bonus && st.chapters[0][st.coin === 'me' ? 'foe' : 'me'] === 0, '시작 장이 결말이어도 첫 장의 선공 보정이 붙는다'); }
  const three = D.newMatch(data, { me: KEYS.slice(0, 6), foe: KEYS.slice(6, 12) }, 5);
  ok(three.firstChapter === 0 && three.lastChapter === 2, '보통 판은 발단에서 결말까지');
  const two = D.newMatch(data, { me: KEYS.slice(0, 6), foe: KEYS.slice(6, 12) }, 5, { start: 1, chapters: 5 });
  ok(two.lastChapter === 2, '장 수는 결말을 넘지 않는다');
}
console.log('PASS 책 결투 규칙: ' + n + ' 가지');
