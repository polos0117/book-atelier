import {h} from 'https://esm.sh/preact@10.24.3';
import {useState,useEffect,useLayoutEffect,useRef} from 'https://esm.sh/preact@10.24.3/hooks';

const W=window.W,IMG=window.AtelierImg,FILTER=window.AtelierDexFilter,FRAME=window.AtelierFrame;
const MARKS=[
 'M24 6v36M6 24h36M11 11l26 26M11 37l26-26',
 'M24 40V18M24 28C6 27 8 10 8 10c15 0 16 18 16 18ZM24 23C40 22 40 6 40 6c-14 1-16 17-16 17Z',
 'M8 36 24 8l16 28ZM14 28h20M24 8v28',
 'M32 7a17 17 0 1 0 9 27A18 18 0 0 1 32 7Z',
 'M8 12h12l4 5 4-5h12v27H28l-4 4-4-4H8ZM24 17v26',
 'M24 6 40 24 24 42 8 24ZM16 24h16M24 16v16'
];
const hash=s=>Array.from(s).reduce((n,c)=>n+c.charCodeAt(0),0);
/* 책등 빛 — 서가의 장정 틀과 같은 팔레트(lib/book-frame.js COVER). 양장은 가죽 빛 바탕에 금박,
   한지 선장은 한지 바탕에 그 책의 실 빛, 죽간은 대나무에 그 책의 끈 빛. 글자는 대비 4.5 가 안 되면 양피지 빛으로 */
const lum=hex=>{const n=parseInt(hex.slice(1),16);return [n>>16,n>>8&255,n&255].map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;}).reduce((t,v,i)=>t+v*[.2126,.7152,.0722][i],0);};
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const PAPER={hanji:['#e4dcc5','#3c4639'],bamboo:['#b79c69','#322e22']};
export function spineColors(book) {
 const m=FRAME.of(book).style.match(/--cover:(#[0-9a-f]{6});--gilt:(#[0-9a-f]{6})/i),cover=m[1],gilt=m[2],kind=FRAME.kind(book);
 if(PAPER[kind]){const [bg,ink]=PAPER[kind];return {spine:bg,ink:contrast(gilt,bg)>=4.5?gilt:ink,gild:cover};}
 return {spine:cover,ink:contrast(gilt,cover)>=4.5?gilt:'#f1dfb9',gild:gilt};
}
/* 책등 제목은 한 줄로 다 보인다 — 자르거나 두 단으로 가르지 않는다. 글자 수(띄어쓰기는 반 칸)에 맞춰 CSS 가 글자 크기를 줄이고,
   긴 제목은 책을 조금 크게 하고 문양을 뺀다 */
const titleLength=t=>Array.from(t).reduce((n,c)=>n+(c===' '?.5:1),0);
function Mark({seed}) {
 return h('svg',{viewBox:'0 0 48 48',fill:'none','aria-hidden':'true'},
  h('path',{d:MARKS[seed%MARKS.length],stroke:'currentColor','stroke-width':1.6,'stroke-linecap':'round','stroke-linejoin':'round'}));
}
function cover(entry,defs,pilot) {
 const top=FILTER.best(entry,defs),b=top.style?IMG.styleMap(entry)[top.style]:null;
 if(!b)return {file:null,open:null};
 const forms=Object.keys(defs),stage=pilot&&forms.find(k=>defs[k].stage===pilot.form);
 const order=stage?[stage].concat(forms.filter(k=>k!==stage)):forms;
 const k=order.find(x=>(IMG.formOf(b,x)||{}).f)||order.find(x=>(IMG.formOf(b,x+'_open')||{}).f);
 if(!k)return {file:null,open:null};
 const f=(IMG.formOf(b,k)||{}).f||null,o=(IMG.formOf(b,k+'_open')||{}).f||null;
 return {file:f||o,open:f&&o?o:null};
}
function Artwork({file,title,thumb=false}) {
 const [failed,setFailed]=useState(false);
 if(!file||failed)return h('div',{class:'shelf-no-art'},h(Mark,{seed:hash(title)}),h('p',null,W('home.shelf.noart')));
 return h('img',{src:thumb?IMG.thumbURL(file):IMG.imgURL(file),alt:thumb?'':title,decoding:'async',width:800,height:1200,
  onError:e=>{const el=e.currentTarget;if(thumb&&!el.dataset.full){el.dataset.full='1';el.src=IMG.imgURL(file);}else setFailed(true);}});
}
/* 주소의 ?open= — 펼친 책. 서가의 ?book= 과 짝이다. 다른 물음표 값은 그대로 둔다 */
const askedOpen=()=>{try{return new URLSearchParams(location.search).get('open');}catch{return null;}};
const openURL=key=>{const q=new URLSearchParams(location.search);if(key)q.set('open',key);else q.delete('open');const s=q.toString();return location.pathname+(s?'?'+s:'')+location.hash;};
function OpenBook({book,origin,onClose,closer}) {
 const dialog=useRef(null),paper=useRef(null),timer=useRef(null),closing=useRef(false);
 const [mode,setMode]=useState('base');
 const source=()=>document.querySelector('.shelf-book[data-key="'+book.key+'"]')||origin;
 const geometry=()=>{
  const a=source()?.getBoundingClientRect(),b=paper.current?.getBoundingClientRect();
  if(!a||!b)return;
  paper.current.style.setProperty('--book-x',(a.x+a.width/2-b.x-b.width/2)+'px');
  paper.current.style.setProperty('--book-y',(a.y+a.height/2-b.y-b.height/2)+'px');
  paper.current.style.setProperty('--book-scale',Math.min(a.width/b.width,a.height/b.height).toFixed(3));
 };
 const keepFocus=e=>{
  if(e.key!=='Tab')return;
  const nodes=Array.from(dialog.current.querySelectorAll('button:not(:disabled),a[href]')).filter(el=>el.getClientRects().length);
  const first=nodes[0],last=nodes[nodes.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
 };
 const close=()=>{
  if(closing.current)return;
  closing.current=true;geometry();
  dialog.current.dataset.phase='closing';
  timer.current=setTimeout(()=>{
   dialog.current?.close();onClose();source()?.focus({preventScroll:true});
  },matchMedia('(prefers-reduced-motion: reduce)').matches?0:280);
 };
 closer.current=close;
 useLayoutEffect(()=>{
  const el=dialog.current;el.showModal();geometry();el.dataset.phase='opening';
  el.querySelector('.reading-close').focus({preventScroll:true});
  const wrap=document.querySelector('.lab-page .wrap'),before=wrap?.style.overflow;
  if(wrap)wrap.style.overflow='hidden';
  return()=>{clearTimeout(timer.current);if(wrap)wrap.style.overflow=before;el.close();};
 },[]);
 return h('dialog',{class:'reading-dialog',ref:dialog,'aria-labelledby':'reading-title',onKeyDown:keepFocus,
  onCancel:e=>{e.preventDefault();close();},onClick:e=>{if(e.target===dialog.current)close();}},
  h('article',{class:'reading-book',ref:paper,'data-book':book.key},
   h('button',{type:'button',class:'reading-close','aria-label':W('home.shelf.close'),onClick:close},'×'),
   h('div',{class:'reading-art'},h(Artwork,{key:mode,file:mode==='open'?book.open:book.file,title:book.title}),
    h('span',{class:'reading-page-number','aria-hidden':'true'},'01')),
   h('div',{class:'reading-story'},
    h('div',{class:'reading-ornament'},h(Mark,{seed:hash(book.key)})),
    h('p',{class:'reading-genre'},book.genre),
    h('h2',{id:'reading-title'},book.title),
    h('p',{class:'reading-author'},book.author),
    h('p',{class:'reading-persona'},book.persona),
    book.arc?.question&&h('blockquote',null,book.arc.question),
    h('div',{class:'reading-actions'},
     book.open&&h('button',{type:'button',class:'reading-mode','aria-pressed':mode==='open',
      onClick:()=>setMode(v=>v==='open'?'base':'open')},W(mode==='open'?'home.shelf.portrait':'home.hall.open')),
     h('a',{class:'reading-detail',href:'dex.html?book='+encodeURIComponent(book.key)},W('home.shelf.detail'))),
    h('p',{class:'reading-return'},W('home.shelf.return')),
    h('span',{class:'reading-page-number','aria-hidden':'true'},'02'))));
}
export function Bookshelf() {
 const [data,setData]=useState(null),[error,setError]=useState(false),[theme,setTheme]=useState(()=>IMG.hallTheme());
 const [revision,setRevision]=useState(0),[columns,setColumns]=useState(()=>matchMedia('(max-width:599px)').matches?4:6);
 const [active,setActive]=useState(null),origin=useRef(null),closer=useRef(null);
 /* 펼치면 기록을 한 칸 쌓고(?open=<열쇠>) 닫으면 그 칸을 내린다. 뒤로 가기면 책이 닫히고, 앞으로 가기·새로고침·공유면 그 책이 펼쳐진다 */
 const pushed=useRef(false),skipPop=useRef(false),live=useRef();
 const openBook=(b,el)=>{origin.current=el||null;setActive(b);
  if(!pushed.current&&askedOpen()!==b.key){try{history.pushState({shelf:'open'},'',openURL(b.key));pushed.current=true;}catch{}}};
 const closed=()=>{setActive(null);
  if(pushed.current){pushed.current=false;skipPop.current=true;try{history.back();}catch{skipPop.current=false;}}
  else if(askedOpen()){try{history.replaceState(history.state,'',openURL(null));}catch{}}};
 live.current={data,active};
 useEffect(()=>{
  const media=matchMedia('(max-width:599px)'),resize=()=>setColumns(media.matches?4:6);
  const sync=()=>{setTheme(IMG.hallTheme());setRevision(v=>v+1);};
  media.addEventListener('change',resize);addEventListener('atelier-appearance',sync);addEventListener('storage',sync);
  return()=>{media.removeEventListener('change',resize);removeEventListener('atelier-appearance',sync);removeEventListener('storage',sync);};
 },[]);
 useEffect(()=>{
  const pop=()=>{
   if(skipPop.current){skipPop.current=false;return;}
   const {data,active}=live.current,k=askedOpen(),b=k&&(data||[]).find(x=>x.key===k);
   if(b){pushed.current=history.state?.shelf==='open';if(active?.key!==b.key)setActive(b);return;}
   if(active){pushed.current=false;closer.current?closer.current():setActive(null);}
  };
  addEventListener('popstate',pop);return()=>removeEventListener('popstate',pop);
 },[]);
 /* 처음 주소에 ?open= 이 있으면 책이 준비되는 대로 펼친다. 새로고침이면 이미 펼친 칸이라 칸을 더 쌓지 않는다 */
 useEffect(()=>{
  const k=askedOpen(),b=k&&(data||[]).find(x=>x.key===k);
  if(!b||active)return;
  if(history.state?.shelf==='open')pushed.current=true;
  else{try{history.replaceState(history.state,'',openURL(null));}catch{}}
  openBook(b,document.querySelector('.shelf-book[data-key="'+b.key+'"]'));
 },[data]);
 useEffect(()=>{
  let live=true;
  Promise.all([fetch('data/book-design.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json();}),IMG.load().catch(()=>({}))])
   .then(([design,img])=>{
    if(!live)return;
    const defs={};for(const [stage,key] of Object.entries(design.vocab?.form_key||{}))defs[key]={stage};
    setData((design.books||[]).map(b=>({...b,...cover(img[b.key],defs,b.pilot)})));
   }).catch(()=>{if(live)setError(true);});
  return()=>{live=false};
 },[]);
 const mine=IMG.hallPicks(theme),by=Object.fromEntries((data||[]).map(b=>[b.key,b]));
 const picks=mine.map(k=>by[k]).filter(Boolean);
 // Stable catalog order keeps a book in its place when the reader returns.
 const books=picks.length?picks:(data||[]).filter(b=>b.file).concat((data||[]).filter(b=>!b.file)).slice(0,IMG.HALL_MAX);
 const rows=[];for(let i=0;i<books.length;i+=columns)rows.push(books.slice(i,i+columns));
 return h('section',{class:'bookshelf','aria-labelledby':'bookshelf-title','data-theme':theme,'data-revision':revision},
  h('div',{class:'bookshelf-head'},
   h('div',null,h('h2',{id:'bookshelf-title'},W('home.shelf.title')),h('p',{class:'bookshelf-intro'},W('home.shelf.intro'))),
   h('a',{class:'bookshelf-manage',href:'dex.html'},W(picks.length?'home.shelf.manage':'home.shelf.choose'))),
  h('div',{class:'bookcase','aria-busy':!data&&!error},
   (!data||!books.length)&&h('p',{class:'bookshelf-status',role:'status'},W(error?'home.shelf.error':data?'home.shelf.empty':'home.shelf.loading')),
   rows.map((row,r)=>h('div',{class:'shelf-row',key:r},
    h('div',{class:'shelf-books'},row.map((b,i)=>{
     const seed=hash(b.key),c=spineColors(b),len=titleLength(b.title);
     return h('button',{type:'button',key:b.key,class:'shelf-book','data-key':b.key,'data-binding':FRAME.kind(b),'data-long':len>6?'true':undefined,
      'data-selected':active?.key===b.key?'true':undefined,'aria-haspopup':'dialog','aria-label':W('home.shelf.open',{title:b.title}),
      style:'--spine:'+c.spine+';--spine-ink:'+c.ink+';--spine-gild:'+c.gild+';--title-len:'+len+';--book-width:'+(64+seed%5*6)+'px;--book-height:'+(202+Math.min(3,Math.max(0,Math.ceil(len)-4))*9+seed%3*3)+'px',
      onClick:e=>openBook(b,e.currentTarget)},
      h('span',{class:'book-volume'},
       h('span',{class:'book-spine'},h('span',{class:'spine-mark'},h(Mark,{seed})),h('span',{class:'spine-title'},h('span',null,b.title)),
        h('span',{class:'spine-number','aria-hidden':'true'},String(r*columns+i+1).padStart(2,'0'))),
       h('span',{class:'book-peek','aria-hidden':'true'},h(Artwork,{file:b.file,title:b.title,thumb:true}))));})),
    h('div',{class:'shelf-plank','aria-hidden':'true'},h('span',null,String(r+1).padStart(2,'0')))))),
  h('div',{class:'bookshelf-foot'},h('span',null,W('theme.'+theme)),h('span',null,W('home.shelf.count',{n:books.length}))),
  active&&h(OpenBook,{key:active.key,book:active,origin:origin.current,closer,onClose:closed}));
}
