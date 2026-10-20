import { h } from 'https://esm.sh/preact@10.24.3';
import { useState, useEffect, useRef } from 'https://esm.sh/preact@10.24.3/hooks';

/* Appearance is shared between pages; generation settings are independent. */
function useAppearance() {
  const [appearance, setAppearance] = useState(() => window.AtelierAppearance.get());
  useEffect(() => {
    const sync = () => setAppearance(window.AtelierAppearance.get());
    addEventListener('atelier-appearance', sync);
    sync();
    return () => removeEventListener('atelier-appearance', sync);
  }, []);
  return appearance;
}
/* 설정 — 메뉴 줄의 ⚙ 하나. 누르면 테마·화면 밀도가 같은 폭 두 칸으로 펼쳐지고, 아랫줄에 머리 조작이 붙는다.
   바깥을 누르거나 Esc 면 닫힌다. 펼침은 저장하지 않는다 */
export function AppearanceControls({children}) {
  const appearance = useAppearance(), W = window.W;
  const [open, setOpen] = useState(false), ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const away = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    addEventListener('pointerdown', away); addEventListener('keydown', esc);
    return () => { removeEventListener('pointerdown', away); removeEventListener('keydown', esc); };
  }, [open]);
  return h('div', {class:'appearance-controls' + (open ? ' open' : ''), ref},
    h('button', {type:'button', class:'appearance-toggle', 'aria-expanded':open, 'aria-label':W('ui.settings'), title:W('ui.settings'),
      onClick:() => setOpen(v => !v)}, h('span', {class:'theme-dot', 'aria-hidden':'true'}), h('span', {'aria-hidden':'true'}, '\u2699')),
    open && h('div', {class:'appearance-panel', role:'group', 'aria-label':W('ui.settings')},
      h('label', null, W('ui.theme'),
        h('select', {'aria-label':W('ui.theme'), value:appearance.theme,
          onChange:e => window.AtelierAppearance.set('theme', e.target.value)},
          window.AtelierAppearance.themes.map(key => h('option', {key, value:key}, W('theme.' + key))))),
      h('label', null, W('ui.density'),
        h('select', {'aria-label':W('ui.density'), value:appearance.density,
          onChange:e => window.AtelierAppearance.set('density', e.target.value)},
          ['compact', 'relaxed'].map(key => h('option', {key, value:key}, W('ui.density.' + key))))),
      children && h('div', {class:'appearance-extra'}, children)));
}

/* 서고 문양 — 테마마다 책 한 가지 모양. 경로는 자료이고, 테마를 바꿀 때마다 새로 그린다 */
const CREST_MARK = {
  midnight: [
    ['M11 7h21a4 4 0 0 1 4 4v30H15a4 4 0 0 1-4-4Z','line'],
    ['M15 41V7','line'],
    ['m27 15 1.5 4.5L33 21l-4.5 1.5L27 27l-1.5-4.5L21 21l4.5-1.5Z','paint']
  ],
  daylight: [
    ['M24 14q9-5 18-2v26q-9-3-18 2Z','primary'],
    ['M6 12q9-3 18 2 9-5 18-2v26q-9-3-18 2-9-5-18-2Z','line'],
    ['M24 14v26','line'],
    ['M10 20q5-1 10 1m-10 6q5-1 10 1','signal']
  ],
  blossom: [
    ['M15 5h18v36l-9-7-9 7Z','line'],
    ['M24 14c3-4 8-2 6 2 4 0 4 5 0 5 2 4-3 6-6 2-3 4-8 2-6-2-4 0-4-5 0-5-2-4 3-6 6-2Z','paint'],
    ['M38 34h4m-2-2v4','signal']
  ],
  moss: [
    ['M8 33h32v8H8Z','line'],
    ['M11 24h28v9H11Z','line'],
    ['M14 15h22v9H14Z','primary'],
    ['M14 15h22v9H14Z','line'],
    ['M24 15q-2-6 3-9 2 5-3 9','signal']
  ],
  plum: [
    ['M40 5C27 8 15 21 11 41','line'],
    ['M40 5c-1 12-9 22-22 25 5-12 12-20 22-25Z','primary'],
    ['M8 43h14','signal'],
    ['m35 34 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z','paint']
  ],
  sand: [
    ['M13 9h23v26a5 5 0 0 1-5 5H13','line'],
    ['M13 9a4 4 0 0 0-4 4v4h4M31 40a5 5 0 0 1-5-5v-2H8v2a5 5 0 0 0 5 5','line'],
    ['M18 17h12m-12 6h12m-12 6h8','signal']
  ],
  deep: [
    ['M11 8h20a4 4 0 0 1 4 4v18H15a4 4 0 0 1-4-4Z','line'],
    ['M15 30V8','line'],
    ['M6 38q6-5 12 0t12 0 12 0','signal'],
    ['M9 44q5-3 10 0t10 0','line'],
    ['M39 9a2 2 0 1 0 .1 0Z','paint']
  ],
  ember: [
    ['M24 6c4 6-3 8 0 13 4-1 5-5 4-7 5 5 4 12-4 13-8-1-8-9-3-13 0 3 1 4 3 4-2-4 0-7 0-10Z','paint'],
    ['M12 30h24l-4 8H16Z','line'],
    ['M10 30q14-4 28 0M20 42h8','line'],
    ['M38 26v-4m2 2h-4','signal']
  ]
};
const MARK_STYLE = {
  line:{stroke:'currentColor','stroke-width':2,'stroke-linejoin':'round','stroke-linecap':'round'},
  paint:{fill:'var(--signal)'},
  primary:{fill:'var(--accent)'},
  signal:{stroke:'var(--signal)','stroke-width':2.5,'stroke-linecap':'round','stroke-linejoin':'round'},
  surface:{fill:'var(--card)',stroke:'currentColor','stroke-width':2}
};
function Crest({theme}) {
  return h('svg',{class:'crest-mark',viewBox:'0 0 48 48',fill:'none','aria-hidden':'true'},
    (CREST_MARK[theme]||CREST_MARK.daylight).map(([d,kind],i)=>h('path',{key:i,d,...MARK_STYLE[kind]})));
}
export function WorkspaceHeading({title,subtitle,code}) {
  const {theme}=useAppearance(),W=window.W;
  /* 문양·제목은 연구소(index.html)로 가는 링크 — 덮개 화면에서는 항해의 '연구소' 탭이 숨고 이것이 집으로 가는 길이다 */
  return h('div',{class:'workspace-heading'},
    h('a',{class:'workspace-title',href:'index.html','aria-label':W('nav.index')},h(Crest,{theme}),
      h('div',null,h('div',{class:'eyebrow'},W('app.brand'),h('span',null,' / '+code)),
        h('h1',null,title),h('p',null,subtitle))),
    h('div',{class:'crest-signature','aria-hidden':'true'},
      h('span',{class:'crest-name'},W('theme.' + theme)),h('i'),
      h('b',null,W('workspace.signature'))));
}
/* The header folds: the title block hides, the navigation row (with its settings button) stays.
   The choice is a per-viewer convenience kept in this browser only — it can be missing or blocked. */
const FOLD_KEY='book_header_fold';
/* 화면 차례 — 머리의 항해와 서재의 길잡이가 같이 쓴다. 화면을 더하면 여기 한 줄과 낱말 표(nav.*·home.*)를 같이 고친다 */
export const PAGES=['index','dex','prompt','duel'];
const SUBTITLED=['prompt','duel'];
function readFold(){ try { return localStorage.getItem(FOLD_KEY)==='1'; } catch(e){ return false; } }
function writeFold(v){ try { if(v) localStorage.setItem(FOLD_KEY,'1'); else localStorage.removeItem(FOLD_KEY); } catch(e){} }
/* Every page uses the same header markup and navigation order. */
export function WorkspaceHeader({page}) {
  const W=window.W;
  const [folded,setFolded]=useState(readFold);
  const toggle=()=>setFolded(v=>{ writeFold(!v); return !v; });
  const title=page==='index'?'app.title':page+'.title';
  return h('div',{class:'workspace-header'+(folded?' folded':'')},
    h(WorkspaceHeading,{title:W(title),code:W('app.code'),
      subtitle:W(SUBTITLED.includes(page)?page+'.subtitle':'app.subtitle')}),
    h('div',{class:'workspace-nav-row'},
      h('nav',{class:'workspace-nav'},PAGES.map(key=>
        h('a',{key,href:key+'.html','aria-current':key===page?'page':undefined},
          W('nav.'+key)))),
      h(AppearanceControls,null,
        h('button',{type:'button',class:'header-fold','aria-expanded':!folded,
          'aria-label':W(folded?'ui.header.unfold':'ui.header.fold'),title:W(folded?'ui.header.unfold':'ui.header.fold'),onClick:toggle},
          W(folded?'ui.header.unfold':'ui.header.fold.short')))));
}
export function ThemeGallery() {
  const {theme}=useAppearance(),W=window.W;
  return h('section',{'aria-label':W('home.themes')},
    h('div',{class:'theme-gallery-head'},h('h2',null,W('home.themes')),h('p',null,W('home.themes.note'))),
    h('div',{class:'theme-gallery'},window.AtelierAppearance.themes.map(key=>
      h('button',{key,type:'button',class:'theme-card','data-theme-preview':key,
        'aria-pressed':theme===key,onClick:()=>window.AtelierAppearance.set('theme',key)},
        h(Crest,{theme:key}),h('span',{class:'theme-swatches','aria-hidden':'true'},h('i'),h('i'),h('i')),
        h('strong',null,W('theme.' + key)),h('small',null,W('theme.note.'+key)),
        theme===key&&h('span',{class:'theme-selected','aria-hidden':'true'},'✓')))));
}
