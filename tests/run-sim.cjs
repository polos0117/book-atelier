/* 서고 탐험 균형 — 자동으로 끝까지 가 보며 완주율·닿는 층을 잰다.
   Run: node tests/run-sim.cjs [--quick]   (빠른 모드는 60판, 보고만. 빼면 400판 — 욕심쟁이(greedy) 정책의 완주율이 25~65% 를 벗어나면 실패) */
const fs = require('node:fs'), assert = require('node:assert/strict');
const R = require('../lib/run.js'), S = require('../lib/shelf-gen.js');
const J = n => JSON.parse(fs.readFileSync('data/' + n + '.json', 'utf8'));
const data = { design: J('book-design'), duel: J('duel'), run: J('run') };
const KEYS = R.keysOf(data), QUICK = process.argv.includes('--quick'), N = QUICK ? 60 : 400;
/* 실험 — --lamps N 으로 등불 수를 바꿔 본다(보고만) */
const li = process.argv.indexOf('--lamps'); if (li > 0) data.run.lamps = +process.argv[li + 1];
(async () => {
  await S.load(fs.readFileSync('lib/shelf-gen.wasm'));
  const rows = [];
  for (const policy of ['greedy', 'random']) {
    let clear = 0, floors = 0, fights = 0, wins = 0, books = 0; const byFloor = new Array(10).fill(0);
    for (let i = 0; i < N; i++) {
      const deck = [KEYS[i % KEYS.length], KEYS[(i * 7 + 1) % KEYS.length], KEYS[(i * 13 + 2) % KEYS.length]];
      if (new Set(deck).size < 3) { deck[2] = KEYS[(i * 13 + 5) % KEYS.length]; if (new Set(deck).size < 3) deck[1] = KEYS[(i + 9) % KEYS.length]; }
      const st = R.autoPlay(data, R.newRun(data, S.plan(i + 1, (i * 2654435761) >>> 0, KEYS.length), deck), policy);
      assert(['over', 'clear'].includes(st.phase), '끝나지 않은 판 ' + i + ' ' + st.phase);
      if (st.phase === 'clear') clear++; floors += st.floor + 1; fights += st.stats.fights; wins += st.stats.wins; books += st.deck.length; byFloor[st.phase === 'clear' ? 9 : st.floor]++;
    }
    rows.push({ policy, clear: clear / N, floor: floors / N, fights: fights / N, winRate: wins / Math.max(1, fights), deck: books / N, byFloor });
  }
  for (const r of rows) console.log(`  ${r.policy.padEnd(6)} 완주 ${(r.clear * 100).toFixed(1)}% · 평균 ${r.floor.toFixed(1)}층 · 싸움 ${r.fights.toFixed(1)}판(승률 ${(r.winRate * 100).toFixed(0)}%) · 덱 ${r.deck.toFixed(1)}권 · 끝난 층 ` + r.byFloor.map((n, i) => (i === 9 ? '완주' : (i + 1) + '층') + ' ' + n).join(' · '));
  const g = rows[0];
  if (!QUICK) assert(g.clear >= 0.25 && g.clear <= 0.65, '욕심쟁이 완주율이 25~65% 를 벗어난다: ' + (g.clear * 100).toFixed(1) + '%');
  console.log('PASS 서고 탐험 균형: ' + N + '판' + (QUICK ? ' (빠른 모드 — 보고만)' : ''));
})().catch(e => { console.error(e); process.exit(1); });
