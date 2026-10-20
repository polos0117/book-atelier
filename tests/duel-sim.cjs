/* 책 결투를 화면 없이 수천 판 굴려 균형을 본다 — 단순 AI(욕심쟁이) 둘이 무작위 덱 여섯 권으로.
   책별 승률(그 책이 든 덱이 이긴 비율) · 장르별 · 폼별 쓰임(고유 규칙이 어느 폼에서 몇 번 돌았나) · 선공 승률 · 무승부 · 판 길이.
   한 책이 60% 를 넘거나 40% 밑이면 실패한다 — data/duel.json 의 그 책 수를 고친다. 결과 요약은 docs/DUEL_DESIGN.md 5절.
   Run: node tests/duel-sim.cjs [판 수=3000] [--quick] */
const fs = require('node:fs'), assert = require('node:assert/strict');
const D = require('../lib/duel.js');
const J = n => JSON.parse(fs.readFileSync('data/' + n + '.json', 'utf8'));
const data = { design: J('book-design'), duel: J('duel') };
const quick = process.argv.includes('--quick');
const N = Number(process.argv.find(a => /^\d+$/.test(a))) || (quick ? 600 : 3000);
const LO = 0.40, HI = 0.60;
const books = data.design.books, G = Object.fromEntries(books.map(b => [b.key, b.genre]));

const per = Object.fromEntries(books.map(b => [b.key, { games: 0, wins: 0, draws: 0 }]));
const genre = {}; for (const b of books) genre[b.genre] = genre[b.genre] || { games: 0, wins: 0 };
const forms = Object.fromEntries(books.map(b => [b.key, [0, 0, 0]]));   /* 고유 규칙이 돈 횟수 — 폼마다 */
const roles = {}; for (const r of data.design.vocab.role) roles[r] = { opens: 0 };
let first = 0, decided = 0, draws = 0, chapters = { me: 0, foe: 0, draw: 0 }, turns = 0, opens = 0, closes = 0, totalWon = { 1: 0, 2: 0, tie: 0 };

for (let s = 0; s < N; s++) {
  const rng = { rngState: s * 7919 + 17 };
  const decks = { me: D.randomDeck(data, rng), foe: D.randomDeck(data, rng) };
  const st = D.newMatch(data, decks, s);
  D.playOut(data, st, 'greedy', 'greedy');
  assert(st.phase === 'done' && st.chapters.length === 3, '판이 끝나지 않았다: ' + s);
  if (st.winner === 'draw') draws++; else { decided++; if (st.winner === st.coin) first++; }
  for (const c of st.chapters) chapters[c.winner]++;
  const won = st.chapters.filter(c => c.winner === st.winner).length; if (st.winner !== 'draw') totalWon[won === 3 ? 2 : won === 2 ? 2 : 1]++;
  for (const who of ['me', 'foe']) for (const k of decks[who]) {
    per[k].games++; genre[G[k]].games++;
    if (st.winner === who) { per[k].wins++; genre[G[k]].wins++; } else if (st.winner === 'draw') per[k].draws++;
  }
  for (const e of st.log) {
    if (e.t === 'rule' && forms[e.key]) forms[e.key][e.form]++;
    if (e.t === 'play' || e.t === 'pass' || e.t === 'open' || e.t === 'attack' || (e.t === 'rule' && e.what === 'thrall')) turns++;
    if (e.t === 'open') { opens++; roles[e.role].opens++; }
    if (e.t === 'close') closes++;
  }
}
const pct = x => (x * 100).toFixed(1).padStart(5) + '%';
const rate = p => (p.wins + p.draws / 2) / Math.max(1, p.games);
console.log(`\n책 결투 ${N}판 — 선공 승률 ${pct(first / decided)} (무승부 ${draws}) · 장당 평균 수 ${(turns / N / 3).toFixed(1)} · 판당 절정 ${(opens / N).toFixed(2)} · 판당 닫힌 책 ${(closes / N).toFixed(2)} · first_bonus=${D.firstBonus(data)}`);
console.log('  장 승자 — 선공(me) ' + chapters.me + ' · 후공(foe) ' + chapters.foe + ' · 동점 ' + chapters.draw + '  (me/foe 는 자리일 뿐 — 선공은 동전)');
console.log('\n  책                 승률    판   발단  전개  결말 (고유 규칙이 돈 횟수)');
const rows = books.map(b => ({ key: b.key, title: b.title, r: rate(per[b.key]), n: per[b.key].games, f: forms[b.key] })).sort((a, b) => b.r - a.r);
for (const r of rows) console.log('  ' + r.title.padEnd(14, ' ') + ' ' + pct(r.r) + ' ' + String(r.n).padStart(5) + '  ' + r.f.map(x => String(x).padStart(5)).join(' ') + (r.r > HI || r.r < LO ? '  ← 40~60% 밖' : ''));
console.log('\n  장르');
for (const g of Object.keys(genre)) console.log('  ' + g.padEnd(8, ' ') + ' ' + pct(genre[g].wins / Math.max(1, genre[g].games)) + ' ' + String(genre[g].games).padStart(6));
console.log('\n  절정을 터뜨린 폼의 역할 — ' + Object.keys(roles).map(r => r + ' ' + roles[r].opens).join(' · '));

/* 문턱 — 선공 40~60%, 책마다 40~60%, 책마다 세 폼의 규칙이 다 돌아야 한다(한 폼이 한 번도 안 돌면 그 규칙은 죽은 글) */
const bad = [];
if (first / decided < LO || first / decided > HI) bad.push('선공 승률 ' + pct(first / decided) + ' — data/duel.json 의 first_bonus 를 고친다');
for (const r of rows) if (r.r > HI || r.r < LO) bad.push(r.title + ' ' + pct(r.r));
for (const r of rows) r.f.forEach((n, i) => { if (!n) bad.push(r.title + ' ' + D.stagesOf(data)[i] + ' 규칙이 한 번도 안 돌았다'); });
if (bad.length) { console.error('\n균형 미통과:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log('\nPASS 책 결투 균형: ' + N + '판 · 열다섯 권 모두 40~60% · 세 폼 규칙 모두 돈다 · 선공 40~60%');
