/* 결투 판의 화면 조각 — duel.html(결투)과 run.html(서고 탐험)이 같이 쓴다. 규칙은 lib/duel.js 에만 있고 여기는 그리고 단추를 엔진에 넘길 뿐이다.
   자료 읽기(useData)·그 폼 그림(picOf)·자리(Unit)·판(Match — 결과 단추는 actions 로 받는다)·대화상자(크게 보기·절정·판 접기)·말풍선(speak). 말은 lib/words.js. */
import { h } from 'https://esm.sh/preact@10.24.3';
import { useState, useEffect, useLayoutEffect, useRef } from 'https://esm.sh/preact@10.24.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
export const html = htm.bind(h);
const W = window.W, IMG = window.AtelierImg, FILTER = window.AtelierDexFilter, D = window.AtelierDuel, MOTION = window.AtelierMotion, SP = window.AtelierSpeech;
/* 말풍선 — 판에 들어온 책이 그 장의 말을 한다(설계표 voice: 발단·전개·결말). 판이 끝나면 이긴 쪽 첫 책이 결말의 말. 그린 뒤에 자리를 찾는다 */
function speak(S, st) {
  const l = st.last; if (!SP || !l) return;
  const line = (key, stage) => ((S.books[key] || {}).voice || {})[stage];
  setTimeout(() => {
    if (l.kind === 'play' && l.key) { const el = document.querySelector(`.duel-unit[data-side="${l.who}"][data-key="${l.key}"] .face`); if (el) SP.say(el, line(l.key, S.stages[st.chapter]), { who: l.who }); }
    if (st.phase === 'done' && st.winner) { const el = document.querySelector(`.duel-unit[data-side="${st.winner}"]:not(.off)`); if (el) SP.say(el.querySelector('.face') || el, line(el.dataset.key, S.stages[S.stages.length - 1]), { who: st.winner, ms: 4000 }); }
  }, 40);
}
const V = 'f', NO = ['①', '②', '③'];

/* 자료 — 설계표·결투 수치·그림 등록부. extra 에 더 읽을 data/*.json 이름(서고 탐험의 'run') */
function useData(extra) {
  const [st, set] = useState({ loading: true });
  useEffect(() => {
    Promise.all([
      fetch('data/book-design.json', { cache: 'no-cache' }).then(r => r.json()),
      fetch('data/duel.json', { cache: 'no-cache' }).then(r => r.json()),
      IMG.load().catch(() => ({})),
    ].concat((extra || []).map(n => fetch('data/' + n + '.json', { cache: 'no-cache' }).then(r => r.json())))).then(([design, duel, img, ...more]) => {
      const fk = (design.vocab || {}).form_key || {}, defs = {};
      for (const stage of Object.keys(fk)) defs[fk[stage]] = { stage };
      const books = Object.fromEntries(design.books.map(b => [b.key, b]));
      const data = { design, duel }; (extra || []).forEach((n, i) => { data[n] = more[i]; });
      set({ data, img, defs, fk, books, stages: Object.keys(fk) });
    }).catch(e => set({ error: String((e && e.message) || e) }));
  }, []);
  return st;
}

/* 그 책의 그 폼 그림 — 가장 많이 채운 화풍에서. 없으면 null(이름표) */
function picOf(S, key, formIndex, open) {
  const entry = S.img[key]; if (!entry) return null;
  const style = FILTER.best(entry, S.defs).style; if (!style) return null;
  const fkey = S.fk[S.stages[formIndex]] + (open ? '_open' : '');
  return (IMG.formOf(IMG.styleMap(entry)[style], fkey) || {})[V] || null;
}
function Pic({ file, full, alt }) {
  if (!file) return html`<span class="ph">${alt}</span>`;
  return html`<img loading=${full ? 'eager' : 'lazy'} alt=${alt || ''} src=${full ? IMG.imgURL(file) : IMG.thumbURL(file)}
    onError=${e => { const t = e.currentTarget; if (full || t.dataset.fallback) return; t.dataset.fallback = '1'; t.src = IMG.imgURL(file); }} />`;
}
/* 크게 보기 단추 — 자리·손패 오른쪽 위 */
function ZoomBtn({ onZoom, label }) {
  return html`<button type="button" class="zoom" aria-label=${W('duel.zoom') + ' · ' + label} onClick=${e => { e.stopPropagation(); onZoom(); }}><span aria-hidden="true">⌕</span></button>`;
}

/* 덱 고르기 — 설계표의 책에서 여섯 */
function Unit({ S, st, u, who, sel, target, onClick, onZoom }) {
  const data = S.data, b = S.books[u.key], f = D.formOf(st, u), role = D.roleOf(data, st, u), slot = D.slotOf(st, u);
  const flags = [];
  if (u.flags.erased) flags.push(W('duel.flag.erased')); else if (u.flags.silenced) flags.push(W('duel.flag.silenced'));
  if (u.flags.bound) flags.push(W('duel.flag.bound'));
  if (u.flags.hidden) flags.push(W('duel.flag.hidden'));
  if (u.flags.revealed) flags.push(W('duel.flag.revealed'));
  if (u.flags.judged) flags.push(W('duel.flag.judged'));
  if (u.flags.linked) flags.push(W('duel.flag.linked'));
  if (u.mark > 0) flags.push(W('duel.flag.mark', { n: u.mark }));
  if (u.flags.notice) flags.push(W('duel.flag.notice'));
  if (u.flags.tag) flags.push(W('duel.flag.tag'));
  if (u.flags.sample) flags.push(W('duel.flag.sample'));
  if (u.flags.teacher) flags.push(W('duel.flag.teacher'));
  return html`<div class=${'duel-slot duel-unit' + (sel ? ' sel' : '') + (target ? ' duel-target' : '') + (!D.live(u) ? ' off' : '')}
      data-side=${who} data-slot=${slot} data-key=${u.key} data-kind=${target || undefined}>
    <i class="no" aria-hidden="true">${NO[slot]}</i>
    <button type="button" class="pick" onClick=${onClick} aria-label=${b.title + ' · ' + S.stages[f] + ' · ' + role}>
      <span class="face"><${Pic} file=${picOf(S, u.key, f)} alt=${b.title} />
        ${flags.length > 0 && html`<span class="flags">${flags.map((x, i) => html`<i key=${i}>${x}</i>`)}</span>`}
        <span class="pw">${D.cur(data, st, u)}</span>
        ${u.tok > 0 && html`<span class="tok">${W('duel.flag.tok', { n: u.tok })}</span>`}
      </span>
      <span class="unit-cap">${b.title}<i>${S.stages[f]} · ${role}</i></span>
    </button>
    <${ZoomBtn} label=${b.title} onZoom=${onZoom} />
  </div>`;
}
function EmptySlot({ who, slot, target, onClick }) {
  return html`<div class=${'duel-slot empty' + (target ? ' duel-target' : '')} data-side=${who} data-slot=${slot} data-kind=${target || undefined}>
    <i class="no" aria-hidden="true">${NO[slot]}</i>
    <button type="button" class="pick" disabled=${!target} onClick=${onClick}><span class="face">${W('duel.empty')}</span></button></div>`;
}

/* 기록 한 줄로 */
function logLine(S, st, e) {
  const name = k => (S.books[k] || {}).title || k, who = w => W(w === 'me' ? 'duel.me' : 'duel.foe');
  const at = (side, slot) => { const u = st[side] && st[side].slots[slot]; return u ? name(u.key) : ''; };
  switch (e.t) {
    case 'first': return W('duel.log.first', { who: who(e.who) });
    case 'play': return W('duel.log.play', { who: who(e.who), book: name(e.key) });
    case 'attack': return W('duel.log.attack', { who: who(e.who), book: name(e.key), target: at(D.other(e.who), e.target) });
    case 'strike': case 'hit': return e.instant ? W('duel.log.instant', { target: at(e.side, e.to) }) : e.dmg > 0 ? W('duel.log.strike', { target: at(e.side, e.to), n: e.dmg }) : '';
    case 'close': return W(e.why === 'left' || e.why === 'dawn' ? 'duel.log.left' : 'duel.log.close', { book: name(e.key) });
    case 'revive': return W('duel.log.revive', { book: name(e.key) });
    case 'open': return W('duel.log.open', { who: who(e.who), book: name(e.key) });
    case 'pass': return W('duel.log.pass', { who: who(e.who) });
    case 'chapter': return W('duel.log.chapter', { stage: S.stages[e.n], me: e.me, foe: e.foe });
    case 'page': return W('duel.log.page', { stage: S.stages[e.chapter] });
    case 'rule': return W('duel.log.rule', { book: name(e.key), what: W('duel.rule.' + e.what) });
    case 'done': return W('duel.log.done', { result: W(e.winner === 'me' ? 'duel.result.win' : e.winner === 'foe' ? 'duel.result.lose' : 'duel.result.draw') });
  }
  return '';
}

function Match({ S, st, onMove, onZoom, onForfeit, actions }) {
  const data = S.data, mine = st.turn === 'me' && st.phase === 'play';
  const [sel, setSel] = useState(null);   /* {kind:'hand', key} | {kind:'unit', slot} | {kind:'rule', slot} | {kind:'open'} */
  const [help, setHelp] = useState(false);
  useEffect(() => { setSel(null); }, [st.turn, st.turnNo, st.chapter]);
  const L = mine ? D.legal(data, st, 'me') : { play: [], attack: [], rule: [], open: [], pass: false };
  const selUnit = sel && (sel.kind === 'unit' || sel.kind === 'rule') ? st.me.slots[sel.slot] : null;
  /* 표적 — 고른 것에 따라 빈 자리(내기) · 상대 책(공격·규칙) · 내 책(절정) */
  const targetOf = (who, slot) => {
    if (!sel) return null;
    if (sel.kind === 'hand' && who === 'me' && !st.me.slots[slot] && L.play.some(p => p.key === sel.key && p.slots.includes(slot))) return 'play';
    if (sel.kind === 'unit' && who === 'foe' && L.attack.some(a => a.slot === sel.slot && a.target === slot)) return 'attack';
    if (sel.kind === 'rule' && who === 'foe' && L.rule.some(a => a.slot === sel.slot && a.target === slot)) return 'rule';
    if (sel.kind === 'open' && who === 'me' && L.open.includes(slot)) return 'open';
    return null;
  };
  const tap = (who, slot) => {
    const t = targetOf(who, slot), u = st[who].slots[slot];
    if (t === 'play') return onMove({ kind: 'play', key: sel.key, slot });
    if (t === 'attack') return onMove({ kind: 'attack', slot: sel.slot, target: slot });
    if (t === 'rule') return onMove({ kind: 'rule', slot: sel.slot, target: slot });
    if (t === 'open') return onMove({ kind: 'open', slot });
    if (who === 'me' && u && mine) return setSel(sel && sel.kind === 'unit' && sel.slot === slot ? null : { kind: 'unit', slot });
    if (u) onZoom({ kind: 'unit', who, slot });   /* 표적이 아닌 책(상대 책, 내 차례가 아닐 때의 내 책)은 누르면 크게 */
  };
  const hint = !mine ? (st.phase === 'done' ? W('duel.hint.done') : W('duel.hint.foe')) : !sel ? W('duel.hint.idle') : W('duel.hint.' + (sel.kind === 'unit' ? 'attack' : sel.kind));
  const row = who => html`<div class="duel-row" data-side=${who}><span class="who">${W(who === 'me' ? 'duel.me' : 'duel.foe')}</span>${[0, 1, 2].map(i => {
    const u = st[who].slots[i], t = targetOf(who, i);
    return u ? html`<${Unit} key=${u.id} S=${S} st=${st} u=${u} who=${who} sel=${who === 'me' && selUnit === u} target=${t} onClick=${() => tap(who, i)} onZoom=${() => onZoom({ kind: 'unit', who, slot: i })} />`
      : html`<${EmptySlot} key=${'e' + i} who=${who} slot=${i} target=${t} onClick=${() => tap(who, i)} />`; })}</div>`;
  const won = who => st.chapters.filter(c => c.winner === who).length;
  const dots = who => html`<span class="won">${[0, 1, 2].map(i => html`<i key=${i} class=${i < won(who) ? 'on' : ''}></i>`)}</span>`;
  const ruleMoves = selUnit ? L.rule.filter(r => r.slot === sel.slot) : [];
  const recent = st.log.slice(-6).map(e => logLine(S, st, e)).filter(Boolean);
  const done = st.phase === 'done';
  return html`<section class="duel-screen" data-screen="match"><div class="duel-board">
    <div class="duel-bar">
      <span class="stages">${S.stages.map((s, i) => html`<b key=${s} class=${i === st.chapter ? 'on' : ''}>${s}</b>`)}</span>
      <span>${W('duel.chapter', { stage: S.stages[st.chapter], n: Math.min(D.TURNS, Math.floor(st.turnNo / 2) + 1), max: D.TURNS })}</span>
      <span class="duel-turn" data-turn=${st.turn || 'none'}>${done ? '' : W(mine ? 'duel.turn.me' : 'duel.turn.foe')}</span>
      <span class="duel-score">
        <span>${W('duel.me')} <b data-side="me">${D.sum(data, st, 'me')}</b>${dots('me')}</span>
        <span>${W('duel.foe')} <b data-side="foe">${D.sum(data, st, 'foe')}</b>${dots('foe')}</span>
        <span>${W('duel.foe.hand', { n: st.foe.hand.length })}${st.foe.seen.length > 0 || st.foe.revealedAll ? ' · ' + W('duel.seen', { list: (st.foe.revealedAll ? st.foe.hand : st.foe.seen.filter(k => st.foe.hand.includes(k))).map(k => S.books[k].title).join(', ') }) : ''}</span>
      </span>
    </div>
    <div class="duel-hint-area">${sel && mine
      ? html`<div class="duel-mode" role="status">${hint}<button type="button" class="btn" id="duel-cancel" onClick=${() => setSel(null)}>${W('duel.act.cancel')}</button></div>`
      : html`<p class="duel-hint" role="status">${hint}</p>`}</div>
    ${row('foe')}
    ${row('me')}
    <div class="duel-log" aria-live="polite">${recent.map((x, i) => html`<div key=${i}>${i === recent.length - 1 ? html`<b>${x}</b>` : x}</div>`)}</div>
    <div class="duel-extra">
    ${done && html`<div class="duel-result" data-result=${st.winner === 'me' ? 'win' : st.winner === 'foe' ? 'lose' : 'draw'}>
      <h3>${W(st.winner === 'me' ? 'duel.result.win' : st.winner === 'foe' ? 'duel.result.lose' : 'duel.result.draw')}${st.daily && html` <small class="daily">${W('duel.result.daily')}</small>`}</h3>
      <p class="sec">${W('duel.result.chapters')}</p>
      <ol>${st.chapters.map((c, i) => html`<li key=${i}>${W('duel.log.chapter', { stage: S.stages[i], me: c.me, foe: c.foe })}</li>`)}</ol>
      ${actions}
    </div>`}
    ${help && html`<div class="duel-rules" role="dialog" aria-label=${W('duel.rules.title')}>
      <p class="sec">${W('duel.rules.title')}</p>
      <ol>${[1, 2, 3, 4, 5].map(i => html`<li key=${i}>${W('duel.rules.' + i, { first: D.firstBonus(data) })}</li>`)}</ol>
      <div class="acts"><button type="button" class="btn" id="duel-rules-close" onClick=${() => setHelp(false)}>${W('duel.rules.close')}</button></div>
    </div>`}
    </div>
    <div class="duel-dock">
      <p class="sec">${W('duel.hand')}<span>${W('duel.deckLeft', { n: st.me.deck.length })}</span>
        <span class="acts">
          ${ruleMoves.length > 0 && sel.kind === 'unit' && html`<button type="button" class="btn" id="duel-rule" onClick=${() => setSel({ kind: 'rule', slot: sel.slot })}>${W('duel.act.rule')}</button>`}
          ${!done && onForfeit && html`<button type="button" class="btn quiet" id="duel-forfeit" aria-haspopup="dialog" onClick=${onForfeit}>${W('duel.act.forfeit')}</button>`}
          <button type="button" class="btn" id="duel-help" aria-pressed=${help} onClick=${() => setHelp(v => !v)}>${W('duel.act.help')}</button>
          <button type="button" class="btn" id="duel-open" disabled=${!mine || st.me.opened || !L.open.length} aria-pressed=${!!sel && sel.kind === 'open'} onClick=${() => setSel(sel && sel.kind === 'open' ? null : { kind: 'open' })}>${W(st.me.opened ? 'duel.act.open.used' : 'duel.act.open')}</button>
          <button type="button" class="btn" id="duel-pass" disabled=${!mine} onClick=${() => onMove({ kind: 'pass' })}>${W('duel.act.pass')}</button>
        </span></p>
      <div class="duel-hand">${st.me.hand.length ? st.me.hand.map(k => { const b = S.books[k], roles = S.stages.map(s => b.forms[s].role), r = roles[st.chapter], s = data.duel.roles[r];
        return html`<div key=${k} class=${'card' + (sel && sel.kind === 'hand' && sel.key === k ? ' sel' : '') + (st.me.revealed.includes(k) ? ' seen' : '')} data-key=${k}>
          <button type="button" class="pick" disabled=${!mine || !L.play.length} aria-label=${b.title} onClick=${() => setSel(sel && sel.kind === 'hand' && sel.key === k ? null : { kind: 'hand', key: k })}>
            <span class="face"><${Pic} file=${picOf(S, k, st.chapter)} alt=${b.title} /><span class="pw">${s.power}</span></span>
            <span class="cap"><span class="pw2">${s.power}</span>${b.title}<i>${S.stages[st.chapter]} · ${r}</i><i>${W('duel.card.stats', { p: s.power, s: s.strike, g: s.guard || 0 })}</i></span>
          </button>
          <${ZoomBtn} label=${b.title} onZoom=${() => onZoom({ kind: 'hand', key: k })} />
        </div>`; }) : html`<span class="empty">${W('duel.hand.empty')}</span>`}</div>
    </div>
  </div></section>`;
}

/* 크게 보기·절정의 대화상자 살림 — 서가의 Zoom(dex.html)과 같다. 열면 닫기 단추로 포커스, 뒤쪽은 inert,
   Esc 로 닫고 Tab 은 안에서만 돈다. 닫으면 연 자리로 포커스가 돌아간다(그 자리가 없어졌으면 손패 쪽 단추로).
   둘이 겹치면(크게 보는 동안 상대가 절정) 맨 위 하나만 키를 받는다 */
function useModal(onClose) {
  const layer = useRef(), live = useRef(); live.current = onClose;
  useLayoutEffect(() => {
    const previous = document.activeElement, hidden = [];
    let branch = layer.current;
    while (branch && branch !== document.body) {
      for (const sibling of branch.parentElement.children)
        if (sibling !== branch && !['SCRIPT', 'STYLE'].includes(sibling.tagName)) { hidden.push([sibling, sibling.inert]); sibling.inert = true; }
      branch = branch.parentElement;
    }
    layer.current.querySelector('.modal-close').focus({ preventScroll: true });
    const key = e => {
      const top = [...document.querySelectorAll('[aria-modal="true"]')].pop();
      if (top !== layer.current || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'Escape') { e.preventDefault(); live.current(); }
      if (e.key === 'Tab') {
        const items = [...layer.current.querySelectorAll('button:not(:disabled), a[href]')];
        e.preventDefault();
        const at = items.indexOf(document.activeElement);
        items[(at + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
      }
    };
    addEventListener('keydown', key);
    return () => {
      removeEventListener('keydown', key);
      hidden.forEach(([el, inert]) => { el.inert = inert; });
      queueMicrotask(() => {
        if (document.querySelector('[aria-modal="true"]')) return;
        const target = previous?.isConnected && previous !== document.body && !previous.closest('[aria-modal]') ? previous : document.querySelector('#duel-help');
        target?.focus({ preventScroll: true });
      });
    };
  }, []);
  return layer;
}

/* 절정 — 그 폼의 개방 그림이 판 전체에. 저절로 닫히지 않는다 — 명장면 글을 다 읽고 누르거나 Esc 로 닫는다(그동안 상대도 기다린다) */
function Scene({ S, scene, onClose }) {
  const layer = useModal(onClose);
  const b = S.books[scene.key], file = picOf(S, scene.key, scene.form, true), text = ((b.opens || {})[S.stages[scene.form]] || {}).scene || '';
  const title = W('duel.log.open', { who: W(scene.who === 'me' ? 'duel.me' : 'duel.foe'), book: b.title });
  /* 움직임 — 그 폼의 초상에서 명장면이 열리고(lib/scene-motion.js reveal), 그 개방의 입자가 한 번 터진다 */
  const pic = useRef(null);
  useLayoutEffect(() => {
    const img = MOTION && pic.current && pic.current.querySelector('img'), base = picOf(S, scene.key, scene.form, false);
    if (!img) return;
    const kind = ((b.opens || {})[S.stages[scene.form]] || {}).particles;
    MOTION.reveal(base ? MOTION.ghost(img, IMG.imgURL(base), { fit: 'cover' }) : null, img, { kind, removeFrom: true, key: 'duel-scene', seed: file });
    return () => MOTION.cancel('duel-scene');
  }, [scene.key, scene.form]);
  return html`<div ref=${layer} class="duel-scene" role="dialog" aria-modal="true" aria-labelledby="duel-scene-title" aria-describedby="duel-scene-text" data-key=${scene.key} onClick=${onClose}>
    <div class="pic" ref=${pic}><${Pic} full file=${file} alt=${b.title} /></div>
    <div class="text"><h3 id="duel-scene-title">${title}</h3><p id="duel-scene-text">${text}</p>
      <button type="button" class="btn modal-close" id="duel-scene-close" onClick=${onClose}>${W('duel.scene.close')}</button></div>
  </div>`;
}
/* 판 접기 확인 — 기본 포커스는 "계속 두기"(되돌릴 수 없는 쪽을 먼저 쥐여 주지 않는다). Esc·바깥 누르기도 계속 두기 */
function Forfeit({ onYes, onNo }) {
  const layer = useModal(onNo);
  return html`<div ref=${layer} class="duel-confirm" role="alertdialog" aria-modal="true" aria-labelledby="duel-forfeit-title" aria-describedby="duel-forfeit-note"
      onClick=${e => { if (e.target === e.currentTarget) onNo(); }}>
    <div class="box">
      <h3 id="duel-forfeit-title">${W('duel.forfeit.title')}</h3>
      <p id="duel-forfeit-note">${W('duel.forfeit.note')}</p>
      <div class="acts">
        <button type="button" class="btn modal-close" id="duel-forfeit-no" onClick=${onNo}>${W('duel.forfeit.no')}</button>
        <button type="button" class="btn danger" id="duel-forfeit-yes" onClick=${onYes}>${W('duel.forfeit.yes')}</button>
      </div>
    </div>
  </div>`;
}
/* 크게 보기 — 자리의 책(지금 폼)이나 손패의 책(이번 장의 폼). 그 폼 그림·역할 수치·고유 규칙의 그 폼 쓰임 */
function Zoom({ S, st, zoom, onClose }) {
  const layer = useModal(onClose);
  const data = S.data, u = zoom.kind === 'unit' ? st[zoom.who].slots[zoom.slot] : null;
  const key = u ? u.key : zoom.key, b = S.books[key];
  const f = u ? D.formOf(st, u) : st.chapter, stage = S.stages[f], role = b.forms[stage].role, s = data.duel.roles[role];
  return html`<div ref=${layer} class="duel-zoom" role="dialog" aria-modal="true" aria-label=${b.title} data-key=${key} onClick=${onClose}>
    <div class="pic"><${Pic} full file=${picOf(S, key, f)} alt=${b.title} /></div>
    <div class="text">
      <h3>${b.title}<small>${stage} · ${role}${u ? ' · ' + W('duel.zoom.power', { n: D.cur(data, st, u) }) : ''}${u && u.tok > 0 ? ' · ' + W('duel.flag.tok', { n: u.tok }) : ''}</small></h3>
      <p>${W('duel.card.stats', { p: s.power, s: s.strike, g: s.guard || 0 })} · ${b.genre}</p>
      <p class="rule">${(b.rule || {}).principle}</p>
      <p>${((b.rule || {}).forms || {})[stage]}</p>
      <button type="button" class="btn modal-close" id="duel-zoom-close" onClick=${onClose}>${W('duel.scene.close')}</button>
    </div>
  </div>`;
}

/* 크게 보던 자리의 책이 판에서 사라졌으면 대화상자도 닫는다 — 빈 대화상자가 포커스를 쥐고 남지 않게 */
const zoomKey = (st, zoom) => zoom.kind === 'unit' ? (st[zoom.who].slots[zoom.slot] || {}).key : zoom.key;


export { V, NO, useData, picOf, Pic, ZoomBtn, Unit, EmptySlot, logLine, Match, useModal, Scene, Forfeit, Zoom, zoomKey, speak };
