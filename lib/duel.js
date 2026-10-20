/* 책 결투 엔진 — 책장 넘기기. 한 판이 발단 → 전개 → 결말 세 장(章)으로 흐르고, 판 위 모든 책이 그 장의 폼이 된다.
   양쪽 자리 셋, 장마다 양쪽 세 턴, 장이 끝나면 힘 합이 큰 쪽이 그 장을 가져간다 — 세 장 가운데 둘.
   놀이 규칙은 여기에만 있다. 수치는 data/duel.json, 설명은 docs/DUEL_DESIGN.md. 화면(duel.html)은 상태를 그리고 단추를 넘길 뿐이다.
   ES 모듈도 빌드도 쓰지 않는다. window.AtelierDuel 하나만 붙이고, node 에서는 module.exports.
   상태(st)는 통째로 JSON. 난수도 st.rngState 정수 하나(mulberry32)라서 같은 seed 는 같은 판 — tests/duel-sim.cjs 가 그걸 믿는다.

   data = { design: data/book-design.json, duel: data/duel.json }
   책 고유 규칙은 BOOK[열쇠] — 책 하나 = 효과 하나, 폼(0 발단 · 1 전개 · 2 결말)에 따라 다르게 쓴다. 토큰은 u.tok 하나. */
(function (root) {
  'use strict';

  var VERSION = 1;
  var SLOTS = 3, DECK = 6, HAND = 3, TURNS = 3, CHAPTERS = 3;
  /* 폼 이름(발단·전개·결말)은 설계표 vocab.form_key 의 차례에서 온다 — 여기엔 한글이 0자리다(tests/words.cjs) */
  function stagesOf(data) { return Object.keys(((data.design || {}).vocab || {}).form_key || {}); }
  var KILL = 4;             /* AI 값 — 닫힌 책 하나는 남은 장의 힘이기도 하다 */
  /* 선공 보정 — 뒤에 두는 쪽이 늘 마지막 수를 두므로 구조적으로 후공이 유리하다. 첫 장의 선공은 그 장 합에 이만큼 더 받는다(data/duel.json 의 first_bonus) */
  function firstBonus(data) { var n = (data.duel || {}).first_bonus; return typeof n === 'number' ? n : 0; }
  var OPEN_HOLD = 4;        /* AI 값 — 결말 전에 절정을 쓰면 이만큼 아낀 것으로 본다 */

  /* ── 난수 — mulberry32, 상태는 정수 하나 ── */
  function rand(st) {
    st.rngState = (st.rngState + 0x6D2B79F5) | 0;
    var t = st.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function randInt(st, n) { return Math.floor(rand(st) * n); }
  function shuffle(st, a) { var i, j, t; for (i = a.length - 1; i > 0; i--) { j = randInt(st, i + 1); t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ── 파생 — 설계표에서 결투에 쓰는 것만: 장르, 폼 셋의 역할 ── */
  function derive(data) {
    var out = { cards: {}, list: [], stages: stagesOf(data) }, books = (data.design && data.design.books) || [], firstRole = Object.keys(data.duel.roles)[0], i, b, card;
    for (i = 0; i < books.length; i++) {
      b = books[i];
      card = { key: b.key, title: b.title, genre: b.genre, roles: [], has: !!BOOK[b.key] };
      for (var s = 0; s < out.stages.length; s++) card.roles.push(((b.forms || {})[out.stages[s]] || {}).role || firstRole);
      out.cards[card.key] = card; out.list.push(card.key);
    }
    return out;
  }
  function cardsOf(data) { if (!data.__duel) data.__duel = derive(data); return data.__duel; }
  function cardOf(data, key) { return cardsOf(data).cards[key] || null; }
  function P(data, key) { return ((data.duel || {}).books || {})[key] || {}; }
  function other(who) { return who === 'me' ? 'foe' : 'me'; }
  function clampForm(f) { return Math.max(0, Math.min(CHAPTERS - 1, f)); }
  function formOf(st, u) { return clampForm(st.chapter + (u.offset || 0)); }
  function roleOf(data, st, u) { return cardOf(data, u.key).roles[formOf(st, u)]; }
  function stats(data, st, u) { return data.duel.roles[roleOf(data, st, u)] || data.duel.roles[Object.keys(data.duel.roles)[0]]; }
  function base(data, st, u) { return stats(data, st, u).power; }
  function strikeOf(data, st, u) { return stats(data, st, u).strike; }
  function guardOf(data, st, u) { return stats(data, st, u).guard || 0; }
  function genreOf(data, u) { return cardOf(data, u.key).genre; }
  /* 공격 장르 → 수비 장르의 타격 보정(유리 +2 · 불리 −1 · 없으면 0) */
  function mult(data, atk, def) { var row = (data.duel.chart || {})[atk] || {}; return row[def] || 0; }
  /* 살아 있는 규칙 — 뒤틀리거나(이 장) 지워진(영영) 책은 규칙이 돌지 않는다 */
  function live(u) { return !(u.flags.silenced || u.flags.erased); }

  /* ── 판 위 ── */
  function units(st, who) { var out = [], i; for (i = 0; i < SLOTS; i++) if (st[who].slots[i]) out.push(st[who].slots[i]); return out; }
  function sideOf(st, u) { var i; for (i = 0; i < SLOTS; i++) { if (st.me.slots[i] === u) return 'me'; if (st.foe.slots[i] === u) return 'foe'; } return null; }
  function slotOf(st, u) { var who = sideOf(st, u); return who ? st[who].slots.indexOf(u) : -1; }
  function facing(st, u) { var who = sideOf(st, u), i = slotOf(st, u); return who && i >= 0 ? st[other(who)].slots[i] : null; }
  function byAt(a, b) { return a.at - b.at; }
  function allUnits(st) { return units(st, 'me').concat(units(st, 'foe')).sort(byAt); }
  /* 현재 힘 = 힘 + 다른 지원 아군의 보너스. 바닥 0 */
  function cur(data, st, u) {
    var who = sideOf(st, u), aura = 0, list, i, s;
    if (!who) return Math.max(0, u.power);
    list = units(st, who);
    for (i = 0; i < list.length; i++) { if (list[i] === u) continue; s = stats(data, st, list[i]); if (s.aura) aura += s.aura; }
    return Math.max(0, u.power + aura);
  }
  function sum(data, st, who) { var list = units(st, who), s = 0, i; for (i = 0; i < list.length; i++) s += cur(data, st, list[i]); return s; }
  function strongest(data, st, who, not) { var list = units(st, who), best = null, i; for (i = 0; i < list.length; i++) { if (list[i] === not) continue; if (!best || cur(data, st, list[i]) > cur(data, st, best)) best = list[i]; } return best; }
  function weakest(data, st, who, not) { var list = units(st, who), best = null, i; for (i = 0; i < list.length; i++) { if (list[i] === not) continue; if (!best || cur(data, st, list[i]) < cur(data, st, best)) best = list[i]; } return best; }
  function log(st, e) { st.log.push(e); if (st.last) st.last.fx.push(e); }
  function rule(st, u, what, extra) { var e = { t: 'rule', key: u.key, form: formOf(st, u), what: what, who: sideOf(st, u), slot: slotOf(st, u) }, k; for (k in extra || {}) e[k] = extra[k]; log(st, e); }

  /* ── 책 고유 규칙 — 책 하나 = 효과 하나. 갈고리:
       turnStart(c,u)             내 턴이 시작될 때(모은다)
       form(c,u,f)                그 폼에 처음 들 때 — 내거나 책장을 넘겨서(결말에 들면 …)
       foePlayed(c,u,v)           상대가 책 v 를 냈을 때
       allyPlayed(c,u,v)          같은 편에 책 v 가 들어왔을 때(u 자신 포함)
       chapterEnd(c,u)            장이 끝나 합을 세기 직전
       beforeStrike(c,u,hit)      u 가 칠 때 — hit.dmg 를 고친다. hit.instant 면 싸우지 않고 닫는다
       allyStrike(c,u,hit)        같은 편 누가 칠 때든(u 자신 포함) — hit.dmg 를 고친다
       afterStrike(c,u,hit)       u 가 친 뒤 — hit.target 은 최종 표적, hit.dealt 는 준 피해
       allyHit(c,u,hit)           아군(hit.target)이 맞기 전 — hit.target 을 u 로 돌릴 수 있다
       beforeDamage(c,u,hit)      u 가 맞기 전 — hit.dmg 를 고친다
       damaged(c,u,hit)           u 가 피해를 받은 뒤
       closing(c,u,v)             아군 v 가 닫히려 할 때 — true 면 되살린다
       allyClosed(c,u,v) / foeClosed(c,u,v)
       targets(c,u,list)          칠 수 있는 상대 — 기본은 맞은편. 더하거나 바꾼다
       moves(c,u,out)             공격 대신 하는 수(kind:'rule', on:'ally'|'foe')를 out 에 더한다
       ruleMove(c,u,target)       그 수를 적용한다
     c = { data, st }. u 의 토큰은 u.tok 하나, 깃발은 u.flags. */
  var BOOK = {
    /* 코스모스 — 흩어진 것을 이어 하나의 질서로 */
    kosmos: {
      turnStart: function (c, u) {
        var who = sideOf(c.st, u), list, i, a;
        if (formOf(c.st, u) !== 0) return;
        list = units(c.st, who);
        for (i = 0; i < list.length; i++) {
          a = list[i];
          if (a === u || a.flags.linked || genreOf(c.data, a) === genreOf(c.data, u)) continue;
          a.flags.linked = true; a.power += P(c.data, 'kosmos').link || 1; u.power += P(c.data, 'kosmos').link || 1; u.tok++;
          rule(c.st, u, 'link', { with: a.key }); return;
        }
      },
      beforeDamage: function (c, u, hit) {
        var n;
        if (formOf(c.st, u) !== 1) return;
        n = linked(c.st, sideOf(c.st, u));
        if (n > 0 && hit.dmg > 0) { hit.dmg = Math.max(0, hit.dmg - n); rule(c.st, u, 'absorb', { n: n }); }
      },
      form: function (c, u, f) {
        var list, i, n = 0;
        if (f !== 2) return;
        list = units(c.st, sideOf(c.st, u));
        for (i = 0; i < list.length; i++) if (list[i].flags.linked) { list[i].power += P(c.data, 'kosmos').end || 2; n++; }
        if (n) rule(c.st, u, 'cosmos', { n: n });
      }
    },
    /* 돈키호테 — 위협을 망상이라는 힘으로 */
    don_quixote: {
      turnStart: function (c, u) {
        var f = facing(c.st, u), g = P(c.data, 'don_quixote').gain || 1;
        if (formOf(c.st, u) !== 0 || !f) return;
        if (cur(c.data, c.st, f) > cur(c.data, c.st, u)) { u.tok++; u.power += g; rule(c.st, u, 'delusion'); }
      },
      beforeStrike: function (c, u, hit) {
        if (formOf(c.st, u) !== 1 || u.tok <= 0) return;
        hit.dmg += u.tok; rule(c.st, u, 'charge', { n: u.tok }); u.tok = 0;
      },
      form: function (c, u, f) {
        var list, i, n = 0;
        if (f !== 2 || u.tok <= 0) return;
        list = units(c.st, sideOf(c.st, u));
        for (i = 0; i < list.length; i++) if (list[i] !== u) { list[i].power += u.tok; n++; }
        if (n) rule(c.st, u, 'cheer', { n: u.tok });
        u.tok = 0;
      }
    },
    /* 앨리스 — 크기를 바꾼다 */
    alice: {
      beforeDamage: function (c, u, hit) {
        if (formOf(c.st, u) !== 0 || !u.flags.dodge || hit.source !== 'strike' || hit.dmg <= 0) return;
        u.flags.dodge = false; hit.dmg = 0; rule(c.st, u, 'shrink');
      },
      turnStart: function (c, u) {
        var f = facing(c.st, u), n = P(c.data, 'alice').steal || 1;
        if (formOf(c.st, u) !== 1 || !f || f.power <= n) return;
        f.power -= n; u.power += n; rule(c.st, u, 'grow', { from: f.key });
      },
      form: function (c, u, f) {
        var who, big, small, t;
        if (f === 0) { u.flags.dodge = true; return; }
        if (f !== 2) return;
        who = other(sideOf(c.st, u)); big = strongest(c.data, c.st, who); small = weakest(c.data, c.st, who);
        if (!big || !small || big === small || big.power === small.power) return;
        t = big.power; big.power = small.power; small.power = t;
        rule(c.st, u, 'swap', { big: big.key, small: small.key });
      }
    },
    /* 프랑켄슈타인 — 버려진 것을 기워 자기 것으로 */
    frankenstein: {
      allyClosed: function (c, u, v) {
        var max = P(c.data, 'frankenstein').max || 2, n;
        if (formOf(c.st, u) !== 0 || u.tok >= max) return;
        n = Math.ceil(base(c.data, c.st, v) / 2); u.power += n; u.tok++; rule(c.st, u, 'stitch', { from: v.key, n: n });
      },
      foeClosed: function (c, u) {
        var max = P(c.data, 'frankenstein').max || 2;
        if (formOf(c.st, u) !== 1 || (u.flags.borrow || 0) >= max) return;
        u.flags.borrow = (u.flags.borrow || 0) + 1; rule(c.st, u, 'borrow');
      },
      beforeStrike: function (c, u, hit) { if (u.flags.borrow) hit.dmg += u.flags.borrow; },
      /* 결말에 들면 지닌 힘을 모두(기운 조각마다 2 를 더해) 가장 센 아군에게 넘기고 떠난다 — 아군이 없으면 남아 싸운다 */
      form: function (c, u, f) {
        var target, n;
        if (f !== 2) return;
        target = strongest(c.data, c.st, sideOf(c.st, u), u);
        if (!target) return;
        n = Math.max(0, u.power) + u.tok * 2;
        target.power += n; rule(c.st, u, 'leave', { to: target.key, n: n });
        remove(c, u, 'left');
      }
    },
    /* 춘향전 — 버틸수록 마음이 굳어 절개가 된다 */
    chunhyang: {
      form: function (c, u, f) { if (f === 0) u.flags.firstGuard = true; },
      beforeDamage: function (c, u, hit) {
        var f = formOf(c.st, u);
        if (hit.dmg <= 0) return;
        if (f === 0 && u.flags.firstGuard) { u.flags.firstGuard = false; hit.dmg = 0; rule(c.st, u, 'refuse'); return; }
        if (f === 1 && !u.flags.endured && hit.dmg >= u.power) { u.flags.endured = true; hit.dmg = Math.max(0, u.power - 1); rule(c.st, u, 'endure'); }
      },
      damaged: function (c, u, hit) { if (formOf(c.st, u) === 1 && hit.dealt > 0 && u.tok < (P(c.data, 'chunhyang').max || 3)) { u.tok++; rule(c.st, u, 'fidelity', { n: u.tok }); } },
      afterStrike: function (c, u, hit) {
        var list, i;
        if (formOf(c.st, u) !== 2 || u.tok <= 0) return;
        list = units(c.st, other(sideOf(c.st, u))).filter(function (v) { return v !== hit.target; });   /* 맞은편은 이미 쳤다 — 다른 상대 모두에게 */
        if (!list.length) return;
        rule(c.st, u, 'retort', { n: u.tok });
        for (i = 0; i < list.length; i++) damage(c, { attacker: u, target: list[i], dmg: u.tok, source: 'rule' });
      }
    },
    /* 햄릿 — 망설임을 의심으로 쌓았다가 한 번에 */
    hamlet: {
      turnStart: function (c, u) {
        var f = formOf(c.st, u), foe;
        if (f === 2) return;
        u.tok++; rule(c.st, u, 'doubt', { n: u.tok });
        if (f === 0) { foe = c.st[other(sideOf(c.st, u))]; if (foe.hand.length && foe.seen.indexOf(foe.hand[0]) < 0) foe.seen.push(foe.hand[0]); }
      },
      beforeStrike: function (c, u, hit) {
        var n;
        if (formOf(c.st, u) !== 2 || hit.via !== 'attack') return;
        n = u.tok * (P(c.data, 'hamlet').burst || 1); hit.dmg += n; u.flags.burst = true; rule(c.st, u, 'burst', { n: n });
      },
      afterStrike: function (c, u, hit) {
        var f = formOf(c.st, u);
        if (f === 1 && u.tok > 0 && hit.target && sideOf(c.st, hit.target) && hit.via === 'attack') { u.tok--; hit.target.flags.silenced = true; rule(c.st, u, 'twist', { target: hit.target.key }); }
        if (f === 2 && u.flags.burst) { u.flags.burst = false; u.tok = 0; remove(c, u, 'fell'); }
      }
    },
    /* 바스커빌가의 개 — 흔적을 단서로 모아 정체를 밝힌다 */
    baskervilles: {
      foePlayed: function (c, u) { if (formOf(c.st, u) === 0) { u.tok++; rule(c.st, u, 'clue', { n: u.tok }); } },
      turnStart: function (c, u) {
        var need = P(c.data, 'baskervilles').need || 3, foe, foes, i;
        if (formOf(c.st, u) !== 1 || u.tok < need) return;
        foe = c.st[other(sideOf(c.st, u))];
        for (i = 0; i < foe.hand.length; i++) if (foe.revealed.indexOf(foe.hand[i]) < 0) {
          foe.revealed.push(foe.hand[i]); u.tok -= need; rule(c.st, u, 'reveal', { card: foe.hand[i] }); return;
        }
        /* 손패가 비었으면 판 위 — 가장 센 상대 책의 정체를 밝힌다 */
        foes = units(c.st, other(sideOf(c.st, u))).filter(function (v) { return !v.flags.revealed; }).sort(function (a, b) { return cur(c.data, c.st, b) - cur(c.data, c.st, a); });
        if (foes.length) { foes[0].flags.revealed = true; u.tok -= need; rule(c.st, u, 'reveal', { card: foes[0].key }); }
      },
      targets: function (c, u, list) {
        var foes, i;
        if (formOf(c.st, u) !== 2) return;
        foes = units(c.st, other(sideOf(c.st, u)));
        for (i = 0; i < foes.length; i++) if (foes[i].flags.revealed && list.indexOf(foes[i]) < 0) list.push(foes[i]);
      },
      beforeStrike: function (c, u, hit) { if (formOf(c.st, u) === 2 && hit.target.flags.revealed) hit.dmg += P(c.data, 'baskervilles').expose || 2; },
      afterStrike: function (c, u, hit) {
        if (formOf(c.st, u) !== 2 || !hit.target || !hit.target.flags.revealed || !sideOf(c.st, hit.target)) return;
        hit.target.flags.erased = true; rule(c.st, u, 'unmask', { target: hit.target.key });
      }
    },
    /* 보물섬 — 위험을 항해 거리로 */
    treasure_island: {
      turnStart: function (c, u) { if (formOf(c.st, u) < 2) { u.tok++; rule(c.st, u, 'sail', { n: u.tok }); } },   /* 발단·전개 내내 항해한다 */
      targets: function (c, u, list) {
        var foes, i;
        if (formOf(c.st, u) !== 1 || u.tok <= 0) return;
        foes = units(c.st, other(sideOf(c.st, u)));
        for (i = 0; i < foes.length; i++) if (list.indexOf(foes[i]) < 0) list.push(foes[i]);
      },
      beforeStrike: function (c, u, hit) {
        if (formOf(c.st, u) === 1 && hit.via === 'attack' && hit.target !== facing(c.st, u) && u.tok > 0) { u.tok--; rule(c.st, u, 'leap'); }
      },
      form: function (c, u, f) {
        var p = P(c.data, 'treasure_island'), list, i;
        if (f !== 2 || u.tok < (p.need || 3)) return;
        list = units(c.st, sideOf(c.st, u));
        for (i = 0; i < list.length; i++) list[i].power += p.treasure || 2;
        rule(c.st, u, 'treasure', { n: list.length });
      }
    },
    /* 타임머신 — 턴을 시간으로 바꿔 앞당기거나 되돌린다 */
    time_machine: {
      turnStart: function (c, u) {
        var list, i, a;
        if (formOf(c.st, u) !== 0) return;
        list = units(c.st, sideOf(c.st, u));
        for (i = 0; i < list.length; i++) {
          a = list[i];
          if (a === u || a.flags.advanced || formOf(c.st, a) >= CHAPTERS - 1) continue;
          a.offset = (a.offset || 0) + 1; a.flags.advanced = true;
          rule(c.st, u, 'hasten', { target: a.key });
          enterForm(c, a); return;
        }
      },
      afterStrike: function (c, u, hit) {
        var v = hit.target;
        if (formOf(c.st, u) !== 1 || !v || !sideOf(c.st, v) || formOf(c.st, v) <= 0) return;
        v.offset = (v.offset || 0) - 1; rule(c.st, u, 'delay', { target: v.key });
      },
      closing: function (c, u, v) {
        if (formOf(c.st, u) !== 2 || u.flags.revived || v === u) return false;
        u.flags.revived = true; rule(c.st, u, 'rewind', { target: v.key }); return true;
      }
    },
    /* 손자병법 — 싸우기 전에 형세를 만든다 */
    sunzi: {
      turnStart: function (c, u) {
        var f = formOf(c.st, u), p = P(c.data, 'sunzi'), who, foeSide, face, weak, i, j;
        if (f === 2) return;
        u.tok++; rule(c.st, u, 'position', { n: u.tok });   /* 발단·전개 내내 형세를 쌓는다 */
        if (f !== 1 || u.flags.moved || u.tok < (p.move || 2)) return;   /* 장마다 한 번 — 형세를 다 써 버리면 결말에 남는 것이 없다 */
        who = other(sideOf(c.st, u)); foeSide = c.st[who]; face = facing(c.st, u); weak = weakest(c.data, c.st, who);
        if (!weak || weak === face) return;
        i = slotOf(c.st, u); j = foeSide.slots.indexOf(weak);
        foeSide.slots[j] = face; foeSide.slots[i] = weak; u.tok -= p.move || 2; u.flags.moved = true;
        rule(c.st, u, 'reposition', { target: weak.key });
      },
      beforeStrike: function (c, u, hit) {
        if (formOf(c.st, u) !== 2 || u.flags.won || u.tok < (P(c.data, 'sunzi').need || 3) || hit.via !== 'attack') return;
        u.flags.won = true; hit.instant = true; rule(c.st, u, 'subdue', { target: hit.target.key });
      }
    },
    /* 오만과 편견 — 첫인상을 판정해 두고, 틀렸으면 뒤집는다 */
    pride_prejudice: {
      foePlayed: function (c, u, v) { if (formOf(c.st, u) === 0) { v.flags.judged = true; rule(c.st, u, 'judge', { target: v.key }); } },
      /* 발단에 들어서면 이미 판 위에 있는 상대도 첫인상으로 판정한다 */
      form: function (c, u, f) {
        var foes, i, best;
        if (f === 0) { foes = units(c.st, other(sideOf(c.st, u))); for (i = 0; i < foes.length; i++) if (!foes[i].flags.judged) { foes[i].flags.judged = true; rule(c.st, u, 'judge', { target: foes[i].key }); } return; }
        if (f !== 2 || u.tok <= 0) return;
        best = strongest(c.data, c.st, sideOf(c.st, u));
        if (!best) return;
        best.power += u.tok * (P(c.data, 'pride_prejudice').flip || 2); rule(c.st, u, 'answer', { target: best.key, n: u.tok });
      },
      allyStrike: function (c, u, hit) { if (hit.target.flags.judged) hit.dmg += P(c.data, 'pride_prejudice').judge || 2; },
      turnStart: function (c, u) {
        var foes, i, v;
        if (formOf(c.st, u) !== 1) return;
        foes = units(c.st, other(sideOf(c.st, u)));
        for (i = 0; i < foes.length; i++) {
          v = foes[i];
          if (!v.flags.judged) continue;
          v.flags.judged = false; v.flags.truce = u.id; u.flags.truce = v.id; u.tok++;
          rule(c.st, u, 'letter', { target: v.key }); return;
        }
      },
    },
    /* 드라큘라 — 들어온 책에 자국을 남겨 내 편으로 */
    dracula: {
      foePlayed: function (c, u, v) { if (formOf(c.st, u) === 0 && facing(c.st, u) === v) { v.mark = (v.mark || 0) + 1; rule(c.st, u, 'invite', { target: v.key }); } },
      afterStrike: function (c, u, hit) {
        var f = formOf(c.st, u), v = hit.target;
        if (!v || !sideOf(c.st, v)) return;
        if (f === 1 && v.mark > 0 && hit.dealt > 0) { u.power += hit.dealt; rule(c.st, u, 'drain', { n: hit.dealt }); }
        if (f < 2) { v.mark = (v.mark || 0) + 1; rule(c.st, u, 'mark', { target: v.key, n: v.mark }); }   /* 발단·전개 — 친 책마다 자국 */
      },
      moves: function (c, u, out) {
        var who = sideOf(c.st, u), need = P(c.data, 'dracula').need || 3, foes, i;
        if (formOf(c.st, u) !== 2) return;
        foes = units(c.st, other(who));
        for (i = 0; i < foes.length; i++) if ((foes[i].mark || 0) >= need) out.push({ kind: 'rule', slot: slotOf(c.st, u), target: slotOf(c.st, foes[i]), on: 'foe' });
      },
      /* 데려온 책은 그녀가 사라진 자리에 선다 — 해 뜰 녘, 밤의 귀족이 남긴 자리 */
      ruleMove: function (c, u, target) {
        var who = sideOf(c.st, u), from = other(who), at = slotOf(c.st, u);
        rule(c.st, u, 'thrall', { target: target.key });
        remove(c, u, 'dawn');
        c.st[from].slots[c.st[from].slots.indexOf(target)] = null;
        c.st[who].slots[at] = target; target.flags.hidden = false; target.flags.truce = null;
      }
    },
    /* 눈물을 마시는 새 — 서로 다른 아군을 동행으로 */
    tear_drinking_bird: {
      turnStart: function (c, u) {
        var list = units(c.st, sideOf(c.st, u)), seen = {}, i, n = 0;
        for (i = 0; i < list.length; i++) if (!seen[genreOf(c.data, list[i])]) { seen[genreOf(c.data, list[i])] = 1; n++; }
        u.tok = Math.max(u.tok, n); rule(c.st, u, 'company', { n: u.tok });
      },
      allyHit: function (c, u, hit) {
        if (formOf(c.st, u) !== 1 || u.tok < (P(c.data, 'tear_drinking_bird').shield || 2) || u.flags.took || !hit.attacker || hit.source !== 'strike') return;
        if (mult(c.data, genreOf(c.data, hit.attacker), genreOf(c.data, hit.target)) <= 0) return;
        u.flags.took = true; hit.target = u; rule(c.st, u, 'instead');
      },
      form: function (c, u, f) {
        var best;
        if (f !== 2 || u.tok < (P(c.data, 'tear_drinking_bird').need || 3)) return;
        best = strongest(c.data, c.st, other(sideOf(c.st, u)));
        if (!best) return;
        best.flags.erased = true; rule(c.st, u, 'drink', { target: best.key });
      }
    },
    /* 반지의 제왕 — 짐을 지고 버틴다 */
    lord_of_the_rings: {
      allyHit: function (c, u, hit) {
        if (formOf(c.st, u) !== 0 || hit.source !== 'strike') return;
        hit.target = u; u.tok++; rule(c.st, u, 'burden', { n: u.tok });
      },
      turnStart: function (c, u) {
        var list, i, weak;
        if (formOf(c.st, u) !== 1) return;
        list = units(c.st, sideOf(c.st, u));
        for (i = 0; i < list.length; i++) list[i].flags.hidden = false;
        if (u.tok < (P(c.data, 'lord_of_the_rings').hide || 2)) return;
        weak = weakest(c.data, c.st, sideOf(c.st, u), u);
        if (weak) { weak.flags.hidden = true; rule(c.st, u, 'hide', { target: weak.key }); }
      },
      form: function (c, u, f) {
        var best;
        if (f !== 2 || u.tok < (P(c.data, 'lord_of_the_rings').need || 3)) return;
        best = strongest(c.data, c.st, other(sideOf(c.st, u)));
        if (!best) return;
        rule(c.st, u, 'ring', { target: best.key });
        remove(c, best, 'destroyed'); remove(c, u, 'left');
      }
    },
    /* 걸리버 여행기 — 잣대로 재어 뒤집는다 */
    gulliver: {
      turnStart: function (c, u) {
        var foes, i, me;
        if (formOf(c.st, u) !== 0) return;
        foes = units(c.st, other(sideOf(c.st, u))); me = cur(c.data, c.st, u);
        if (!foes.length) return;
        for (i = 0; i < foes.length; i++) if (cur(c.data, c.st, foes[i]) >= me) return;
        for (i = 0; i < foes.length; i++) foes[i].flags.bound = true;
        rule(c.st, u, 'bind', { n: foes.length });
      },
      afterStrike: function (c, u, hit) {
        var v = hit.target, t;
        if (formOf(c.st, u) !== 1 || !v || !sideOf(c.st, v) || v.power <= u.power) return;
        t = v.power; v.power = u.power; u.power = t; rule(c.st, u, 'measure', { target: v.key });
      },
      form: function (c, u, f) {
        var list, powers, i;
        if (f !== 2) return;
        list = allUnits(c.st).slice().sort(function (a, b) { return b.power - a.power || a.at - b.at; });
        if (list.length < 2) return;
        powers = list.map(function (x) { return x.power; }).reverse();
        for (i = 0; i < list.length; i++) list[i].power = powers[i];
        rule(c.st, u, 'invert', { n: list.length });
      }
    },
    /* 프로젝트 헤일메리 — 실험으로 상대를 알아내고, 알아낸 것을 나눠 모두를 살린다. 표본은 u.tok, 표본 낸 상대 책은 flags.sample */
    project_hail_mary: {
      turnStart: function (c, u) {
        var f = facing(c.st, u);
        if (formOf(c.st, u) !== 0 || !f || u.tok >= (P(c.data, 'project_hail_mary').max || 2)) return;
        u.tok++; f.flags.sample = (f.flags.sample || 0) + 1; rule(c.st, u, 'sample', { target: f.key, n: u.tok });
      },
      beforeDamage: function (c, u, hit) {
        var a = hit.attacker, n;
        if (!a || !a.flags.sample || hit.dmg <= 0 || sideOf(c.st, a) === sideOf(c.st, u)) return;
        n = Math.min(hit.dmg, a.flags.sample); hit.dmg -= n; rule(c.st, u, 'immune', { n: n });
      },
      damaged: function (c, u, hit) {
        var max = P(c.data, 'project_hail_mary').fuel || 4;
        if (formOf(c.st, u) !== 1 || (u.flags.fuel || 0) >= max) return;
        u.flags.fuel = Math.min(max, (u.flags.fuel || 0) + hit.dealt); rule(c.st, u, 'fuel', { n: u.flags.fuel });
      },
      beforeStrike: function (c, u, hit) {
        if (formOf(c.st, u) !== 1 || !u.flags.fuel) return;
        hit.dmg += u.flags.fuel; rule(c.st, u, 'burn', { n: u.flags.fuel }); u.flags.fuel = 0;
      },
      /* 결말 — 표본이 넉넉하면 선생님이 된다: 아군의 타격 +1, 자신은 더 치지 않는다 */
      form: function (c, u, f) {
        if (f !== 2 || u.tok < (P(c.data, 'project_hail_mary').need || 2)) return;
        u.flags.teacher = true; rule(c.st, u, 'teach');
      },
      allyStrike: function (c, u, hit) { if (u.flags.teacher && hit.attacker !== u && formOf(c.st, u) === 2) hit.dmg += P(c.data, 'project_hail_mary').share || 1; },
      targets: function (c, u, list) { if (u.flags.teacher) list.length = 0; }
    },
    /* 안나 카레니나 — 열정을 태워 강해지지만, 쌓인 시선이 끝내 그녀를 무너뜨린다. 열정은 u.tok, 시선은 flags.gaze */
    anna_karenina: {
      allyPlayed: function (c, u) {
        if (formOf(c.st, u) !== 0 || u.tok >= (P(c.data, 'anna_karenina').max || 3)) return;
        u.tok++; u.power++; rule(c.st, u, 'passion', { n: u.tok });
      },
      damaged: function (c, u, hit) {
        if (formOf(c.st, u) !== 1 || hit.dealt <= 0) return;
        u.flags.gaze = (u.flags.gaze || 0) + 1; rule(c.st, u, 'gaze', { n: u.flags.gaze });
      },
      afterStrike: function (c, u, hit) {
        var f = facing(c.st, u);
        if (formOf(c.st, u) !== 1 || u.tok <= 0 || hit.via !== 'attack' || !f || !sideOf(c.st, u)) return;
        u.tok--; rule(c.st, u, 'flare'); strike(c, u, f, 'passion');
      },
      form: function (c, u, f) { if (f === 2) train(c, u); },
      turnStart: function (c, u) { if (formOf(c.st, u) === 2) train(c, u); }
    },
    /* 괴도 신사 아르센 뤼팽 — 예고장을 보내 두었다가 정한 때에 가져간다. 예고장은 상대 책의 flags.notice */
    arsene_lupin: {
      form: function (c, u, f) {
        var p = P(c.data, 'arsene_lupin'), foes, i, n = 0, v, k;
        if (f === 0) { if (!notice(c, u)) u.flags.pending = true; return; }
        if (f !== 2) return;
        foes = units(c.st, other(sideOf(c.st, u)));
        for (i = 0; i < foes.length; i++) {
          v = foes[i]; if (!v.flags.notice) continue;
          k = Math.min(p.steal || 2, Math.max(0, v.power - 1)); if (!k) continue;
          v.power -= k; u.power += k; n += k;
        }
        if (n) rule(c.st, u, 'heist', { n: n });
      },
      foePlayed: function (c, u, v) {
        if (formOf(c.st, u) !== 0 || !u.flags.pending) return;
        u.flags.pending = false; v.flags.notice = true; rule(c.st, u, 'notice', { target: v.key });
      },
      beforeStrike: function (c, u, hit) { if (hit.target.flags.notice) hit.dmg += P(c.data, 'arsene_lupin').notice || 1; },
      /* 전개 — 맞기 직전 내 빈 자리로 빠져나간다(장마다 한 번), 그리고 예고장 하나 더 */
      beforeDamage: function (c, u, hit) {
        var who = sideOf(c.st, u), side = c.st[who], to = side.slots.indexOf(null);
        if (formOf(c.st, u) !== 1 || hit.source !== 'strike' || hit.dmg <= 0 || u.flags.slip === c.st.chapter || to < 0) return;
        side.slots[slotOf(c.st, u)] = null; side.slots[to] = u; u.flags.slip = c.st.chapter; hit.dmg = 0;
        rule(c.st, u, 'disguise');
        notice(c, u, hit.attacker);
      }
    },
    /* 파우스트 — 계약으로 힘을 빌리고, 갚을 때가 반드시 온다. 빚은 u.tok */
    faust: {
      form: function (c, u, f) { if (f === 0) { u.flags.pact = true; u.tok++; rule(c.st, u, 'pact', { n: u.tok }); } },
      beforeStrike: function (c, u, hit) {
        var f = formOf(c.st, u);
        if (f === 0 && u.flags.pact) hit.dmg += P(c.data, 'faust').pact || 2;
        if (f === 1 && hit.via === 'attack' && hit.target !== facing(c.st, u)) { u.tok++; rule(c.st, u, 'reach', { n: u.tok }); }
      },
      targets: function (c, u, list) {
        var foes, i;
        if (formOf(c.st, u) !== 1 || u.tok <= 0) return;
        foes = units(c.st, other(sideOf(c.st, u)));
        for (i = 0; i < foes.length; i++) if (list.indexOf(foes[i]) < 0) list.push(foes[i]);
      },
      turnStart: function (c, u) { if (formOf(c.st, u) === 2) { u.power += P(c.data, 'faust').strive || 1; rule(c.st, u, 'strive'); } },
      /* 결말이 끝날 때 빚이 남았으면 — 빚마다 상대의 가장 센 책에 피해, 그리고 그녀가 닫힌다 */
      chapterEnd: function (c, u) {
        var best;
        if (formOf(c.st, u) !== 2 || u.tok <= 0) return;
        best = strongest(c.data, c.st, other(sideOf(c.st, u)));
        rule(c.st, u, 'due', { n: u.tok });
        if (best) damage(c, { attacker: u, target: best, dmg: u.tok * (P(c.data, 'faust').toll || 2), source: 'rule', ignoreGuard: true, dealt: 0 });
        u.tok = 0; if (sideOf(c.st, u)) remove(c, u, 'fell');
      }
    },
    /* 자산어보 — 바다 생물을 분류해 이름을 붙이면 아군이 그 약점을 안다. 표식은 상대 책의 flags.tag */
    jasan_eobo: {
      turnStart: function (c, u) {
        var f = formOf(c.st, u), v = facing(c.st, u), foes, genres = {}, i, n = 0;
        if (f === 0) { if (v && !v.flags.tag) { v.flags.tag = true; rule(c.st, u, 'observe', { target: v.key }); } return; }
        if (f !== 1) return;
        foes = units(c.st, other(sideOf(c.st, u)));
        for (i = 0; i < foes.length; i++) if (foes[i].flags.tag) genres[genreOf(c.data, foes[i])] = 1;
        for (i = 0; i < foes.length; i++) if (!foes[i].flags.tag && genres[genreOf(c.data, foes[i])]) { foes[i].flags.tag = true; n++; }
        if (n) rule(c.st, u, 'classify', { n: n });
      },
      allyStrike: function (c, u, hit) { if (hit.target.flags.tag) hit.dmg += P(c.data, 'jasan_eobo').tag || 1; },
      form: function (c, u, f) {
        var n = 0, foes, list, i;
        if (f !== 2) return;
        foes = units(c.st, other(sideOf(c.st, u)));
        for (i = 0; i < foes.length; i++) if (foes[i].flags.tag) n++;
        if (!n) return;
        list = units(c.st, sideOf(c.st, u));
        for (i = 0; i < list.length; i++) list[i].power += n * (P(c.data, 'jasan_eobo').record || 1);
        rule(c.st, u, 'record', { n: n });
      }
    }
  };
  /* 안나 결말 — 시선이 넉넉하면 기차가 온다: 맞은편과 자신을 함께 닫는다(맞은편이 비면 오지 않는다) */
  function train(c, u) {
    var f = facing(c.st, u);
    if ((u.flags.gaze || 0) < (P(c.data, 'anna_karenina').need || 3) || !f) return;
    rule(c.st, u, 'train', { target: f.key });
    remove(c, f, 'closed'); if (sideOf(c.st, u)) remove(c, u, 'fell');
  }
  /* 뤼팽 — 예고장을 붙인다: 고른 책(없으면 아직 예고장이 없는 가장 센 상대) */
  function notice(c, u, pick) {
    var foes = units(c.st, other(sideOf(c.st, u))).filter(function (v) { return !v.flags.notice; }), v;
    if (!foes.length) return false;
    v = pick && foes.indexOf(pick) >= 0 ? pick : foes.sort(function (a, b) { return cur(c.data, c.st, b) - cur(c.data, c.st, a) || a.at - b.at; })[0];
    v.flags.notice = true; rule(c.st, u, 'notice', { target: v.key }); return true;
  }
  function linked(st, who) { var list = units(st, who), n = 0, i; for (i = 0; i < list.length; i++) if (list[i].flags.linked) n++; return n; }
  /* 갈고리 부르기 — 뒤틀린 책은 건너뛴다 */
  function hook(c, u, name) {
    var b = BOOK[u.key];
    if (!b || !b[name] || !live(u)) return undefined;
    return b[name].apply(null, [c, u].concat(Array.prototype.slice.call(arguments, 3)));
  }
  function hookAll(c, who, name, a, b) { var list = units(c.st, who).slice(), i; for (i = 0; i < list.length; i++) if (sideOf(c.st, list[i])) hook(c, list[i], name, a, b); }

  /* ── 판 ── */
  function blankSide() { return { hand: [], deck: [], slots: [null, null, null], grave: [], lost: 0, opened: false, seen: [], revealed: [], revealedAll: false }; }
  function ctx(data, st) { return { data: data, st: st }; }
  /* 덱 둘로 새 판. decks = { me: [열쇠 여섯], foe: [열쇠 여섯] }. 같은 책 둘·모르는 책은 validateDeck 이 본다 */
  function newMatch(data, decks, seed) {
    var st = { v: VERSION, seed: seed | 0, rngState: seed | 0, chapter: 0, turnNo: 0, turn: null, first: null, coin: null,
      me: blankSide(), foe: blankSide(), chapters: [], seq: 0, log: [], phase: 'play', winner: null, last: null, auto: [] }, c = ctx(data, st);
    st.me.deck = shuffle(st, decks.me.slice()); st.foe.deck = shuffle(st, decks.foe.slice());
    st.me.hand = st.me.deck.splice(0, HAND); st.foe.hand = st.foe.deck.splice(0, HAND);
    st.first = st.coin = rand(st) < 0.5 ? 'me' : 'foe';
    st.turn = st.first;
    st.log.push({ t: 'first', who: st.first });
    turnStart(c, st.turn);
    return st;
  }
  function validateDeck(data, deck) {
    var out = { ok: true, problems: [], n: (deck || []).length }, seen = {}, i;
    if (out.n !== DECK) out.problems.push('count');
    for (i = 0; i < out.n; i++) {
      if (!cardOf(data, deck[i])) { if (out.problems.indexOf('unknown') < 0) out.problems.push('unknown'); }
      if (seen[deck[i]]) { if (out.problems.indexOf('dup') < 0) out.problems.push('dup'); }
      seen[deck[i]] = 1;
    }
    out.ok = out.problems.length === 0;
    return out;
  }
  /* 무작위 덱 — 설계표의 책에서 여섯. 화면의 "자동" 과 시뮬레이터가 쓴다 */
  function randomDeck(data, rng) { return shuffle(rng, cardsOf(data).list.slice()).slice(0, DECK); }

  function begin(st, who, kind, extra) { var k; st.last = { who: who, kind: kind, fx: [] }; for (k in extra || {}) st.last[k] = extra[k]; }
  function turnStart(c, who) {
    var st = c.st, side = st[who], list, i;
    list = allUnits(st); for (i = 0; i < list.length; i++) list[i].flags.took = false;   /* 눈물을 마시는 새 — 상대 턴마다 한 번 */
    if (side.deck.length) side.hand.push(side.deck.shift());
    hookAll(c, who, 'turnStart');
    autoPass(c);
  }
  /* 할 수 있는 수가 넘기기뿐이면 자동으로 넘긴다 — 둘 다 그러면 장이 끝까지 간다 */
  function autoPass(c) {
    var st = c.st, L, guard = 0;
    while (st.phase === 'play' && guard++ < TURNS * 4) {
      L = legal(c.data, st, st.turn);
      if (L.play.length || L.attack.length || L.rule.length || L.open.length) return;
      st.auto.push(st.turn); st.log.push({ t: 'pass', who: st.turn, auto: true });
      endTurn(c.data, st);
    }
  }
  /* 책 하나가 폼에 처음 든다 — 내거나 책장을 넘기거나 앞당겨서. 같은 폼엔 한 번 */
  function enterForm(c, u) {
    var f = formOf(c.st, u);
    if (u.flags.entered[f]) return;
    u.flags.entered[f] = true;
    hook(c, u, 'form', f);
  }
  function makeUnit(st, key) { return { id: ++st.seq, key: key, power: 0, tok: 0, offset: 0, mark: 0, flags: { entered: {} }, at: st.seq }; }

  /* 합법인 수 — play 는 손패 × 빈 자리, attack 은 내 책 × 칠 수 있는 상대, rule 은 공격 대신 하는 수, open 은 절정을 아직 안 썼으면 내 책마다 */
  function legal(data, st, who) {
    var out = { play: [], attack: [], rule: [], open: [], pass: false }, side, empty = [], i, j, list, c = ctx(data, st), tg;
    if (st.phase !== 'play' || st.turn !== who) return out;
    side = st[who];
    for (i = 0; i < SLOTS; i++) if (!side.slots[i]) empty.push(i);
    for (i = 0; i < side.hand.length; i++) if (empty.length) out.play.push({ key: side.hand[i], slots: empty.slice() });
    list = units(st, who);
    for (i = 0; i < list.length; i++) {
      tg = targets(c, list[i]);
      for (j = 0; j < tg.length; j++) out.attack.push({ slot: slotOf(st, list[i]), target: slotOf(st, tg[j]) });
      hook(c, list[i], 'moves', out.rule);
      if (!side.opened) out.open.push(slotOf(st, list[i]));
    }
    out.pass = true;
    return out;
  }
  /* u 가 칠 수 있는 상대 — 묶였으면 없다. 기본은 맞은편, 정찰은 어느 자리든, 책 규칙이 더한다. 숨은 책·휴전 짝은 뺀다 */
  function targets(c, u) {
    var st = c.st, list = [], f, foes, i, s = stats(c.data, st, u);
    if (u.flags.bound) return list;
    foes = units(st, other(sideOf(st, u)));
    if (s.any) list = foes.slice(); else { f = facing(st, u); if (f) list.push(f); }
    hook(c, u, 'targets', list);
    return list.filter(function (v) { return canStrike(u, v) && foes.indexOf(v) >= 0; });
  }
  function canStrike(u, v) { return !v.flags.hidden && !(u.flags.truce && u.flags.truce === v.id) && !(v.flags.truce && v.flags.truce === u.id); }

  /* 한 수를 적용한다 — endTurn 은 안 한다(AI 의 evaluate 가 장 끝 전 값을 재려고).
     move = {kind:'play', key, slot} | {kind:'attack', slot, target} | {kind:'rule', slot, target} | {kind:'open', slot} | {kind:'pass'} */
  function act(data, st, move) {
    var who = st.turn, side = st[who], c = ctx(data, st), i, u, v, L;
    if (st.phase !== 'play') return { ok: false, why: 'phase' };
    if (!move || !move.kind) return { ok: false, why: 'kind' };
    if (move.kind === 'pass') { begin(st, who, 'pass'); st.log.push({ t: 'pass', who: who }); return { ok: true }; }
    if (move.kind === 'play') {
      i = side.hand.indexOf(move.key);
      if (i < 0 || !cardOf(data, move.key)) return { ok: false, why: 'hand' };
      if (!(move.slot >= 0 && move.slot < SLOTS) || side.slots[move.slot]) return { ok: false, why: 'slot' };
      side.hand.splice(i, 1);
      u = makeUnit(st, move.key); side.slots[move.slot] = u; u.power = base(data, st, u);
      if (side.revealed.indexOf(move.key) >= 0) u.flags.revealed = true;
      begin(st, who, 'play', { key: move.key, slot: move.slot });
      log(st, { t: 'play', who: who, key: move.key, slot: move.slot, form: formOf(st, u) });
      enterForm(c, u);
      hookAll(c, who, 'allyPlayed', u);
      hookAll(c, other(who), 'foePlayed', u);
      /* 들어온 책은 바로 맞은편을 친다 — 공개된 책(바스커빌)은 못 친다 */
      v = facing(st, u);
      if (v && sideOf(st, u) && !u.flags.revealed && targets(c, u).indexOf(v) >= 0) strike(c, u, v, 'entry');   /* 묶였거나 칠 수 없는 책(헤일메리 결말의 선생님)은 못 친다 */
      return { ok: true };
    }
    if (move.kind === 'attack') {
      u = side.slots[move.slot]; v = st[other(who)].slots[move.target];
      if (!u || !v) return { ok: false, why: 'slot' };
      if (targets(c, u).indexOf(v) < 0) return { ok: false, why: 'target' };
      begin(st, who, 'attack', { slot: move.slot, target: move.target });
      log(st, { t: 'attack', who: who, slot: move.slot, target: move.target, key: u.key });
      strike(c, u, v, 'attack');
      return { ok: true };
    }
    if (move.kind === 'rule') {
      u = side.slots[move.slot];
      if (!u) return { ok: false, why: 'slot' };
      L = []; hook(c, u, 'moves', L);
      for (i = 0; i < L.length; i++) if (L[i].slot === move.slot && L[i].target === move.target) break;
      if (i >= L.length) return { ok: false, why: 'target' };
      v = (L[i].on === 'ally' ? side : st[other(who)]).slots[move.target];
      begin(st, who, 'rule', { slot: move.slot, target: move.target, key: u.key });
      BOOK[u.key].ruleMove(c, u, v);
      return { ok: true };
    }
    if (move.kind === 'open') {
      u = side.slots[move.slot];
      if (side.opened) return { ok: false, why: 'opened' };
      if (!u) return { ok: false, why: 'slot' };
      side.opened = true;
      begin(st, who, 'open', { slot: move.slot, key: u.key, form: formOf(st, u), role: roleOf(data, st, u) });
      log(st, { t: 'open', who: who, key: u.key, slot: move.slot, form: formOf(st, u), role: roleOf(data, st, u) });
      openScene(c, who, u);
      return { ok: true };
    }
    return { ok: false, why: 'kind' };
  }
  function step(data, st, move) { var r = act(data, st, move); if (r.ok) endTurn(data, st); return r; }
  function play(data, st, key, slot) { return step(data, st, { kind: 'play', key: key, slot: slot }); }
  function attack(data, st, slot, target) { return step(data, st, { kind: 'attack', slot: slot, target: target }); }
  function open(data, st, slot) { return step(data, st, { kind: 'open', slot: slot }); }
  function pass(data, st) { return step(data, st, { kind: 'pass' }); }

  /* ── 치기 — 피해 = 타격 + 상성 − 방패(돌파는 무시). 책 규칙이 앞뒤에서 고친다. via = 'entry'|'attack'|'open' ── */
  function strike(c, u, v, via) {
    var st = c.st, data = c.data, s = stats(data, st, u), hit, splashed;
    hit = { attacker: u, target: v, dmg: Math.max(0, strikeOf(data, st, u) + mult(data, genreOf(data, u), genreOf(data, v))), source: 'strike', via: via, ignoreGuard: !!s.pierce, dealt: 0, instant: false };
    hook(c, u, 'beforeStrike', hit);
    hookAll(c, sideOf(st, u), 'allyStrike', hit);   /* 아군의 치기에 끼는 규칙(오만과 편견의 판정) — 치는 책 자신도 포함 */
    if (hit.instant) { log(st, { t: 'strike', who: sideOf(st, u), from: slotOf(st, u), to: slotOf(st, v), dmg: 0, instant: true }); remove(c, v, 'closed'); }
    else damage(c, hit);
    if (s.splash && sideOf(st, u)) {
      splashed = strongest(data, st, other(sideOf(st, u)), hit.target);
      if (splashed && canStrike(u, splashed)) damage(c, { attacker: u, target: splashed, dmg: s.splash, source: 'splash', via: via, ignoreGuard: true, dealt: 0 });
    }
    if (sideOf(st, u)) hook(c, u, 'afterStrike', hit);
    return hit;
  }
  /* 피해 하나 — 아군이 대신 받을 수 있고(allyHit), 맞는 쪽이 줄일 수 있고(beforeDamage), 타격이면 방패를 뺀다 */
  function damage(c, hit) {
    var st = c.st, data = c.data, who, list, i, v;
    v = hit.target; who = sideOf(st, v);
    if (!who) return hit;
    list = units(st, who);
    for (i = 0; i < list.length; i++) if (list[i] !== v && hit.target === v) hook(c, list[i], 'allyHit', hit);
    v = hit.target;
    if (hit.source === 'strike' && !hit.ignoreGuard) hit.dmg = Math.max(0, hit.dmg - guardOf(data, st, v));   /* 방패 먼저 — 그 뒤 책 규칙이 남은 피해를 본다(춘향전의 힘 1 버티기가 정확히 1 에 멈추게) */
    hook(c, v, 'beforeDamage', hit);
    hit.dmg = Math.max(0, hit.dmg);
    v.power -= hit.dmg; hit.dealt = hit.dmg;
    log(st, { t: hit.source === 'strike' ? 'strike' : 'hit', who: hit.attacker ? sideOf(st, hit.attacker) : null, from: hit.attacker ? slotOf(st, hit.attacker) : -1, side: who, to: slotOf(st, v), dmg: hit.dmg, source: hit.source });
    if (hit.dmg > 0) hook(c, v, 'damaged', hit);
    if (v.power <= 0) close(c, v);
    return hit;
  }
  /* 힘이 0 — 닫힌다. 아군이 되살릴 수 있다(타임머신 결말) */
  function close(c, v) {
    var st = c.st, who = sideOf(st, v), list, i;
    if (!who) return;
    list = units(st, who);
    for (i = 0; i < list.length; i++) if (list[i] !== v && hook(c, list[i], 'closing', v) === true) { v.power = base(c.data, st, v); log(st, { t: 'revive', side: who, slot: slotOf(st, v), key: v.key }); return; }
    remove(c, v, 'closed');
  }
  /* 판에서 내려간다 — closed(힘 0) · fell(햄릿·안나·파우스트) · left(떠남) · dawn(드라큘라) · destroyed(반지). 남은 아군·상대에게 알린다 */
  function remove(c, v, why) {
    var st = c.st, who = sideOf(st, v), i;
    if (!who) return;
    i = slotOf(st, v); st[who].slots[i] = null; st[who].grave.push(v.key);
    if (why === 'closed' || why === 'fell' || why === 'destroyed') st[who].lost++;   /* 스스로 떠난 것(left·dawn)은 패배가 아니다 — AI 값에 안 센다 */
    log(st, { t: 'close', side: who, slot: i, key: v.key, why: why });
    hookAll(c, who, 'allyClosed', v); hookAll(c, other(who), 'foeClosed', v);
  }

  /* ── 절정(개방) — 그 폼의 역할이 장면 효과를 정한다(data/duel.json 의 opens) ── */
  function openScene(c, who, u) {
    var st = c.st, data = c.data, o = data.duel.opens[roleOf(data, st, u)] || { kind: 'shield', n: 1 }, mine = units(st, who), foes, i, v, order, tmp;
    foes = units(st, other(who));
    if (o.kind === 'strikeAll') { for (i = 0; i < mine.length; i++) if (sideOf(st, mine[i])) { v = facing(st, mine[i]); if (v && !mine[i].flags.bound && canStrike(mine[i], v)) strike(c, mine[i], v, 'open'); } }
    else if (o.kind === 'pierce') { v = strongest(data, st, other(who)); if (v) damage(c, { attacker: u, target: v, dmg: o.n, source: 'open', via: 'open', ignoreGuard: true, dealt: 0 }); }
    else if (o.kind === 'shield') for (i = 0; i < mine.length; i++) mine[i].power += o.n;
    else if (o.kind === 'heal') for (i = 0; i < mine.length; i++) mine[i].power = Math.max(mine[i].power, base(data, st, mine[i])) + o.n;
    else if (o.kind === 'reveal') { st[other(who)].revealedAll = true; for (i = 0; i < foes.length; i++) damage(c, { attacker: u, target: foes[i], dmg: o.n, source: 'open', via: 'open', ignoreGuard: true, dealt: 0 }); }
    else if (o.kind === 'shuffle') {
      order = shuffle(st, [0, 1, 2]); tmp = st[other(who)].slots.slice();
      for (i = 0; i < SLOTS; i++) st[other(who)].slots[i] = tmp[order[i]];
      for (i = 0; i < foes.length; i++) if (sideOf(st, foes[i])) damage(c, { attacker: u, target: foes[i], dmg: o.n, source: 'open', via: 'open', ignoreGuard: true, dealt: 0 });
    }
  }

  /* ── 턴·장 ── */
  function endTurn(data, st) {
    var c = ctx(data, st);
    if (st.phase !== 'play') return;
    st.turnNo++;
    if (st.turnNo >= TURNS * 2) return endChapter(c);
    st.turn = other(st.turn);
    turnStart(c, st.turn);
  }
  function endChapter(c) {
    var st = c.st, data = c.data, a, b, winner, won = { me: 0, foe: 0 }, i, list;
    list = allUnits(st); for (i = 0; i < list.length; i++) if (sideOf(st, list[i])) hook(c, list[i], 'chapterEnd');   /* 합을 세기 직전(파우스트의 빚) */
    a = sum(data, st, 'me'); b = sum(data, st, 'foe');
    if (st.chapter === 0) { if (st.coin === 'me') a += firstBonus(data); else b += firstBonus(data); }
    winner = a > b ? 'me' : b > a ? 'foe' : 'draw';
    st.chapters.push({ me: a, foe: b, winner: winner });
    st.log.push({ t: 'chapter', n: st.chapter, winner: winner, me: a, foe: b });
    if (st.chapter >= CHAPTERS - 1) {
      for (i = 0; i < st.chapters.length; i++) if (st.chapters[i].winner !== 'draw') won[st.chapters[i].winner]++;
      a = 0; b = 0; for (i = 0; i < st.chapters.length; i++) { a += st.chapters[i].me; b += st.chapters[i].foe; }
      st.winner = won.me > won.foe ? 'me' : won.foe > won.me ? 'foe' : a > b ? 'me' : b > a ? 'foe' : 'draw';
      st.phase = 'done'; st.turn = null;
      st.log.push({ t: 'done', winner: st.winner, won: won });
      return;
    }
    /* 책장을 넘긴다 — 모든 책이 다음 폼, 힘은 새 폼의 기본으로, 이 장의 깃발은 걷는다 */
    st.chapter++; st.turnNo = 0;
    list = allUnits(st);
    for (i = 0; i < list.length; i++) {
      list[i].power = base(data, st, list[i]);
      list[i].flags.bound = false; list[i].flags.silenced = false; list[i].flags.truce = null; list[i].flags.won = false; list[i].flags.moved = false;
    }
    st.log.push({ t: 'page', chapter: st.chapter });
    for (i = 0; i < list.length; i++) if (sideOf(st, list[i])) enterForm(c, list[i]);
    /* 앞 장을 잃은 쪽이 후공(마지막 수를 둔다). 같았으면 바꿔 가며 */
    st.first = winner === 'draw' ? other(st.first) : winner;
    st.turn = st.first;
    turnStart(c, st.turn);
  }

  /* ── AI — 시드 난수로 결정적. 값 = 내 합 − 상대 합 + 닫힌 책 차이 × KILL. 한 수 앞만 본다 ── */
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function value(data, st, who) { var v = sum(data, st, who) - sum(data, st, other(who)) + KILL * (st[other(who)].lost - st[who].lost); if (st.chapter === 0) v += (st.coin === who ? 1 : -1) * firstBonus(data); return v; }
  function evaluate(data, st, move) { var who = st.turn, before = value(data, st, who), c = clone(st); act(data, c, move); return value(data, c, who) - before; }
  function candidates(data, st, who) {
    var L = legal(data, st, who), out = [], i, j, mv, g;
    for (i = 0; i < L.play.length; i++) for (j = 0; j < L.play[i].slots.length; j++) { mv = { kind: 'play', key: L.play[i].key, slot: L.play[i].slots[j] }; out.push({ m: mv, g: evaluate(data, st, mv) }); }
    for (i = 0; i < L.attack.length; i++) { mv = { kind: 'attack', slot: L.attack[i].slot, target: L.attack[i].target }; out.push({ m: mv, g: evaluate(data, st, mv) }); }
    for (i = 0; i < L.rule.length; i++) { mv = { kind: 'rule', slot: L.rule[i].slot, target: L.rule[i].target }; out.push({ m: mv, g: evaluate(data, st, mv) }); }
    for (i = 0; i < L.open.length; i++) { mv = { kind: 'open', slot: L.open[i] }; g = evaluate(data, st, mv); if (st.chapter < CHAPTERS - 1) g -= OPEN_HOLD; out.push({ m: mv, g: g }); }
    return out;
  }
  /* level: 'greedy'(값이 가장 큰 수) · 'random'(값이 오르는 수 가운데 아무거나) */
  function aiMove(data, st, level) {
    var who = st.turn, cands, pos;
    if (!who || st.phase !== 'play') return { kind: 'pass' };
    cands = candidates(data, st, who);
    if (!cands.length) return { kind: 'pass' };
    if (level === 'random') {
      pos = cands.filter(function (x) { return x.g > 0; });
      if (!pos.length) return { kind: 'pass' };
      return pos[randInt(st, pos.length)].m;
    }
    cands.sort(function (a, b) { return b.g - a.g; });
    return cands[0].g > 0 ? cands[0].m : { kind: 'pass' };
  }
  function aiTurn(data, st, level) { var m = aiMove(data, st, level), r = act(data, st, m); if (r.ok) endTurn(data, st); return { ok: r.ok, move: m, why: r.why }; }
  function playOut(data, st, me, foe) { var guard = 0; while (st.phase === 'play' && guard++ < TURNS * CHAPTERS * 4) aiTurn(data, st, st.turn === 'me' ? me : foe); return st; }

  var api = {
    VERSION: VERSION, SLOTS: SLOTS, DECK: DECK, HAND: HAND, TURNS: TURNS, CHAPTERS: CHAPTERS, KILL: KILL, OPEN_HOLD: OPEN_HOLD, BOOK: BOOK, stagesOf: stagesOf,
    rand: rand, randInt: randInt, shuffle: shuffle,
    derive: derive, cardsOf: cardsOf, cardOf: cardOf, formOf: formOf, roleOf: roleOf, stats: stats, base: base, strikeOf: strikeOf, guardOf: guardOf, genreOf: genreOf, mult: mult, live: live,
    units: units, sideOf: sideOf, slotOf: slotOf, facing: facing, allUnits: allUnits, cur: cur, sum: sum, strongest: strongest, weakest: weakest, other: other,
    newMatch: newMatch, validateDeck: validateDeck, randomDeck: randomDeck, legal: legal, targets: targets, act: act, step: step, play: play, attack: attack, open: open, pass: pass, endTurn: endTurn,
    firstBonus: firstBonus, value: value, evaluate: evaluate, candidates: candidates, aiMove: aiMove, aiTurn: aiTurn, playOut: playOut
  };
  root.AtelierDuel = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
