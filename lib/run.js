/* 서고 탐험 — 로그라이크. 서고(책들의 서고)를 아홉 층 내려가며 책들을 만난다. 깊이가 곧 장(章): 1~3층 발단, 4~6층 전개, 7~9층 결말.
   지도는 lib/shelf-gen.wasm(rust/shelf-gen)이 씨앗으로 짠 평면도고, 여기는 그 위를 걷는 규칙뿐이다. 수치는 data/run.json.
   싸움은 결투 엔진(lib/duel.js)을 그대로 쓴다 — 그 층의 폼으로 한 장만, 바닥의 보스만 세 장 전부.
   덱은 셋으로 들어가 독서대·전리품으로 여섯까지 자란다. 등불 셋 — 싸움에 지면 하나 꺼지고 다 꺼지면 서고에 갇힌다(처음부터).

   엔진은 화면을 모른다. 상태는 통째로 JSON 이라 그대로 저장한다(지도도 안에 들어 있어 다시 열 때 wasm 이 필요 없다).
   window.AtelierRun 또는 module.exports. 결투 엔진은 window.AtelierDuel 또는 require. 말(한글)은 여기 없다. */
(function (root) {
  'use strict';
  var D = (typeof module !== 'undefined' && module.exports) ? require('./duel.js') : root.AtelierDuel;
  var VERSION = 1, FLOORS = 9;

  function rand(st) { st.rngState = (st.rngState + 0x6D2B79F5) | 0; var t = st.rngState; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function randInt(st, n) { return Math.floor(rand(st) * n); }
  function tune(data) { return data.run || {}; }
  function lampsMax(data) { return tune(data).lamps || 3; }
  function deckMin(data) { return tune(data).deck_min || 3; }
  function deckMax(data) { return tune(data).deck_max || D.DECK; }
  /* 책 번호 ↔ 열쇠 — 설계표 차례 */
  function keysOf(data) { return data.design.books.map(function (b) { return b.key; }); }
  function keyOf(data, i) { return keysOf(data)[i]; }

  function floorOf(st) { return st.plan.floors[st.floor]; }
  function roomOf(st, id) { return floorOf(st).rooms[id == null ? st.room : id]; }
  function nextOf(st) { var f = floorOf(st), out = [], i; for (i = 0; i < f.edges.length; i++) if (f.edges[i][0] === st.room) out.push(f.edges[i][1]); return out; }
  function stageOf(st) { return floorOf(st).stage; }

  /* 새 탐험. plan 은 shelf-gen 의 지도, deck 은 책 열쇠 셋(설계표에 있는 서로 다른 책). opts: daily */
  function newRun(data, plan, deck, opts) {
    opts = opts || {};
    var v = D.validateDeck(data, deck, { loose: true });
    if (!v.ok || deck.length !== (tune(data).start_pick || 3)) return null;
    if (!plan || !plan.floors || plan.floors.length !== FLOORS || plan.books !== keysOf(data).length) return null;
    return { v: VERSION, seed: plan.seed.slice(), daily: !!opts.daily, plan: plan, rngState: (plan.seed[0] ^ (plan.seed[1] << 1)) | 0,
      floor: 0, room: 0, visited: [0], deck: deck.slice(), lamps: lampsMax(data),
      phase: 'map', fight: null, offer: null, last: null,
      stats: { fights: 0, wins: 0, draws: 0, losses: 0, books: 0, floors: 0, rests: 0 }, log: [] };
  }

  /* ── 움직임 ── */
  /* boss: 보스에게 졌거나 비겨 보스 방에 서 있다 — 다시 도전할 수 있다(길은 더 없다) */
  function legal(st) {
    if (st.phase !== 'map') return { rooms: [], descend: false, boss: false };
    var k = roomOf(st).kind;
    return { rooms: nextOf(st), descend: k === 'stairs', boss: k === 'boss' };
  }
  function challenge(data, st) {
    if (st.phase !== 'map' || roomOf(st).kind !== 'boss') return { ok: false, why: 'boss' };
    startFight(data, st, roomOf(st), true); return { ok: true };
  }
  function enter(data, st, id) {
    if (st.phase !== 'map') return { ok: false, why: 'phase' };
    if (nextOf(st).indexOf(id) < 0) return { ok: false, why: 'edge' };
    var r = roomOf(st, id);
    st.room = id; st.visited.push(id); st.last = { kind: r.kind, room: id };
    st.log.push({ t: 'enter', floor: st.floor, room: id, kind: r.kind });
    if (r.kind === 'meet') startFight(data, st, r, false);
    else if (r.kind === 'boss') startFight(data, st, r, true);
    else if (r.kind === 'read') { st.phase = 'read'; st.offer = offersOf(data, st, r); }
    else if (r.kind === 'scene') { st.phase = 'scene'; st.offer = st.deck.indexOf(keyOf(data, r.book)) < 0 ? [keyOf(data, r.book)] : []; }   /* 이미 덱에 있는 책이면 쉬는 길뿐 */
    else if (r.kind === 'rest') { rest(data, st); }
    /* entry·stairs 는 서 있을 뿐 */
    return { ok: true };
  }
  function rest(data, st) {
    var before = st.lamps;
    st.lamps = Math.min(lampsMax(data), st.lamps + 1); st.stats.rests++;
    st.log.push({ t: 'rest', lamps: st.lamps, gained: st.lamps - before });
    st.last = { kind: 'rest', gained: st.lamps - before };
    st.phase = 'map';
  }
  /* 독서대가 내미는 책 — 덱에 없는 앞 셋 */
  function offersOf(data, st, r) { var out = [], i, k; for (i = 0; i < r.offers.length && out.length < 3; i++) { k = keyOf(data, r.offers[i]); if (st.deck.indexOf(k) < 0) out.push(k); } return out; }

  /* ── 싸움 — 결투 엔진 한 장(보스는 세 장). 만난 책은 상대의 첫 손에 반드시 있다 ── */
  function startFight(data, st, r, boss) {
    var foe = r.foe.map(function (i) { return keyOf(data, i); }), book = keyOf(data, r.book), seed = (rand(st) * 4294967296) | 0;
    var f = D.newMatch(data, { me: st.deck.slice(), foe: foe }, seed, boss ? { start: 0, chapters: D.CHAPTERS } : { start: stageOf(st), chapters: 1 }), j;
    if (f.foe.hand.indexOf(book) < 0) { j = f.foe.deck.indexOf(book); if (j >= 0) { f.foe.deck.splice(j, 1); f.foe.deck.unshift(f.foe.hand.pop()); f.foe.hand.unshift(book); } }
    f.runBook = book; f.runBoss = !!boss;
    st.fight = f; st.phase = 'fight'; st.stats.fights++;
    st.log.push({ t: 'fight', floor: st.floor, book: book, boss: !!boss, stage: f.chapter });
  }
  function fightMove(data, st, move) {
    if (st.phase !== 'fight' || !st.fight || st.fight.turn !== 'me') return { ok: false, why: 'turn' };
    var r = D.step(data, st.fight, move); if (!r.ok) return r;
    if (st.fight.phase === 'done') settle(data, st);
    return { ok: true };
  }
  function fightAi(data, st, level) {
    if (st.phase !== 'fight' || !st.fight || st.fight.turn !== 'foe') return { ok: false, why: 'turn' };
    var r = D.aiTurn(data, st.fight, level || 'greedy');
    if (st.fight.phase === 'done') settle(data, st);
    return r;
  }
  function settle(data, st) {
    var f = st.fight, w = f.winner, r = roomOf(st);
    st.log.push({ t: 'result', winner: w, boss: !!f.runBoss, book: f.runBook });
    if (w === 'me') {
      st.stats.wins++;
      if (f.runBoss) { st.phase = 'clear'; st.last = { kind: 'clear' }; return; }
      st.offer = r.loot.map(function (i) { return keyOf(data, i); }).filter(function (k) { return st.deck.indexOf(k) < 0; });
      st.phase = 'reward'; st.last = { kind: 'win', book: f.runBook };
    } else if (w === 'foe') {
      st.stats.losses++; st.lamps--;
      st.last = { kind: 'lose', book: f.runBook, lamps: st.lamps };
      st.phase = st.lamps <= 0 ? 'over' : 'map';
      if (st.phase === 'over') st.log.push({ t: 'over', floor: st.floor });
    } else { st.stats.draws++; st.last = { kind: 'draw', book: f.runBook }; st.phase = 'map'; }
  }

  /* ── 책 얻기 — 전리품(reward)·독서대(read)·장면(scene). 덱이 가득이면 하나를 내놓아야 한다. key 가 null 이면 그냥 지나간다 ── */
  function gain(data, st, key, drop) {
    if (key == null) { st.offer = null; st.phase = 'map'; return { ok: true }; }
    if (!st.offer || st.offer.indexOf(key) < 0) return { ok: false, why: 'offer' };
    if (st.deck.length >= deckMax(data)) {
      if (!drop || st.deck.indexOf(drop) < 0) return { ok: false, why: 'full' };
      st.deck[st.deck.indexOf(drop)] = key; st.log.push({ t: 'swap', out: drop, in_: key });
    } else { st.deck.push(key); st.log.push({ t: 'gain', key: key }); }
    st.stats.books++; st.offer = null; st.phase = 'map';
    return { ok: true };
  }
  function takeLoot(data, st, key, drop) { if (st.phase !== 'reward') return { ok: false, why: 'phase' }; return gain(data, st, key, drop); }
  function read(data, st, key, drop) { if (st.phase !== 'read') return { ok: false, why: 'phase' }; return gain(data, st, key, drop); }
  /* 장면 — 그 책을 읽어 얻거나(read), 쉬어 등불 하나(rest) */
  function scene(data, st, choice, drop) {
    if (st.phase !== 'scene') return { ok: false, why: 'phase' };
    if (choice === 'rest' || !st.offer.length) { st.offer = null; rest(data, st); return { ok: true }; }
    return gain(data, st, st.offer[0], drop);
  }
  function descend(data, st) {
    if (st.phase !== 'map' || roomOf(st).kind !== 'stairs') return { ok: false, why: 'stairs' };
    st.stats.floors++; st.floor++; st.room = 0; st.visited = [0]; st.last = { kind: 'descend', floor: st.floor };
    st.log.push({ t: 'descend', floor: st.floor });
    return { ok: true };
  }

  /* ── 자동으로 끝까지 — 시뮬레이터. policy: 'greedy'(싸움을 고르고 책을 모은다) · 'random' ── */
  function pickRoom(st, policy) {
    var rooms = legal(st).rooms, prefer, i;
    if (!rooms.length) return null;
    if (policy === 'random') return rooms[randInt(st, rooms.length)];
    prefer = ['read', 'rest', 'meet', 'scene', 'stairs', 'boss'];
    if (st.lamps <= 1) prefer = ['rest', 'read', 'scene', 'stairs', 'meet', 'boss'];
    for (i = 0; i < prefer.length; i++) { var pick = rooms.filter(function (id) { return roomOf(st, id).kind === prefer[i]; }); if (pick.length) return pick[randInt(st, pick.length)]; }
    return rooms[0];
  }
  function weakest(data, st) { var C = D.cardsOf(data), best = null, bv = 1e9, i, v; for (i = 0; i < st.deck.length; i++) { v = C.cards[st.deck[i]].roles.reduce(function (a, r) { return a + data.duel.roles[r].power; }, 0); if (v < bv) { bv = v; best = st.deck[i]; } } return best; }
  function autoPlay(data, st, policy, guard) {
    var n = 0, k, drop;
    guard = guard || 2000;
    while (st.phase !== 'over' && st.phase !== 'clear' && n++ < guard) {
      if (st.phase === 'fight') { if (st.fight.turn === 'me') fightMove(data, st, D.aiMove(data, st.fight, policy === 'random' ? 'random' : 'greedy')); else fightAi(data, st, 'greedy'); continue; }
      if (st.phase === 'reward' || st.phase === 'read') { k = st.offer && st.offer.length ? st.offer[0] : null; drop = k && st.deck.length >= deckMax(data) ? weakest(data, st) : null; gain(data, st, k, drop); continue; }
      if (st.phase === 'scene') { if (st.offer.length && st.deck.length < deckMax(data)) scene(data, st, 'read'); else scene(data, st, 'rest'); continue; }
      if (st.phase === 'map') { if (roomOf(st).kind === 'stairs') { descend(data, st); continue; } if (roomOf(st).kind === 'boss') { challenge(data, st); continue; } k = pickRoom(st, policy); if (k == null) break; enter(data, st, k); continue; }
      break;
    }
    return st;
  }

  var api = { VERSION: VERSION, FLOORS: FLOORS, keysOf: keysOf, keyOf: keyOf, lampsMax: lampsMax, deckMin: deckMin, deckMax: deckMax,
    newRun: newRun, legal: legal, enter: enter, challenge: challenge, fightMove: fightMove, fightAi: fightAi, takeLoot: takeLoot, read: read, scene: scene, descend: descend,
    floorOf: floorOf, roomOf: roomOf, nextOf: nextOf, stageOf: stageOf, offersOf: offersOf, autoPlay: autoPlay, settle: settle };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AtelierRun = api;
})(typeof window !== 'undefined' ? window : this);
