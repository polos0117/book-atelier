import {h} from 'https://esm.sh/preact@10.24.3';
import {useState,useEffect,useLayoutEffect,useRef} from 'https://esm.sh/preact@10.24.3/hooks';

const W=window.W,IMG=window.AtelierImg,FILTER=window.AtelierDexFilter,FRAME=window.AtelierFrame,MOTION=window.AtelierMotion;
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
 const chapters=Object.entries(defs).map(([key,{stage}])=>({key,stage,file:b?(IMG.formOf(b,key)||{}).f||null:null,open:b?(IMG.formOf(b,key+'_open')||{}).f||null:null}));
 const selected=chapters.find(c=>c.stage===pilot?.form&&(c.file||c.open))||chapters.find(c=>c.file||c.open);
 return {file:selected?.file||selected?.open||null,open:selected?.file?selected.open:null,chapters};
}
function Artwork({file,title,thumb=false}) {
 const [state,setState]=useState('loading');
 if(!file||state==='failed')return h('div',{class:'shelf-no-art'},h(Mark,{seed:hash(title)}),h('p',null,W('home.shelf.noart')));
 return h('div',{class:'shelf-artwork','data-state':state},
  !thumb&&state==='loading'&&h('span',{class:'reading-loading',role:'status'},W('home.read.loading')),
  h('img',{src:thumb?IMG.thumbURL(file):IMG.imgURL(file),alt:thumb?'':title,decoding:'async',width:800,height:1200,
   onLoad:()=>setState('ready'),onError:e=>{const el=e.currentTarget;if(thumb&&!el.dataset.full){el.dataset.full='1';el.src=IMG.imgURL(file);}else setState('failed');}}));
}
/* 장마다 방의 빛 — 그 책의 표지·금박 빛(lib/book-frame.js COVER)을 장의 결로 물들인다.
   발단은 차고 어둡게, 전개는 세고 따뜻하게, 결말은 노을·남은 빛. 명장면은 빛이 한층 세다. 화면은 0.6초에 걸쳐 바뀐다 */
const MOOD=[{tone:'#0b1428',dim:.62,light:'#9db6e0',glow:.16},{tone:'#1c0d05',dim:.42,light:'#ffb35c',glow:.3},{tone:'#2a1222',dim:.52,light:'#ff8a5c',glow:.24}];
const rgbOf=hex=>{const n=parseInt(hex.slice(1),16);return [n>>16,n>>8&255,n&255];};
const mixRGB=(a,b,t)=>{const x=rgbOf(a),y=rgbOf(b);return x.map((v,i)=>Math.round(v+(y[i]-v)*t));};
const rgba=(c,a)=>'rgba('+c.join(', ')+', '+a+')';
export function readingMood(book,chapter,open) {
 const c=FRAME.COVER[book.silhouette?.palette]||['#3d2a20','#cda55a'],m=MOOD[chapter]||MOOD[0];
 return {'--mood-base':rgba(mixRGB(c[0],m.tone,m.dim-(open?.14:0)),.84),'--mood-light':rgba(mixRGB(c[1],m.light,.45),+(m.glow+(open?.22:0)).toFixed(2)),
  '--mood-edge':rgba(mixRGB(c[0],'#000000',open?.62:.74),.94)};
}
/* 책등 리본 — 다 읽었으면 ✓, 읽는 중이면 책갈피(없으면 마지막으로 연) 장의 첫 글자, 명장면이면 작은 표 */
function ribbonOf(book,r) {
 if(!r)return null;
 if(r.completed)return {mark:'✓',label:W('home.read.complete')};
 const ok=n=>Number.isInteger(n)&&n>=0&&n<3,at=r.mark&&ok(r.mark.chapter)?r.mark:{chapter:ok(r.chapter)?r.chapter:0,mode:r.mode};
 const stage=book.chapters?.[at.chapter]?.stage||'',scene=at.mode==='open';
 return {mark:Array.from(stage)[0]||'•',scene,stage:at.chapter,label:W('home.read.ribbon.'+(r.mark?'mark':'at')+(scene?'Scene':''),{stage})};
}
const PRELUDE_MS=850;
const READING_KEY='book_reading_v1';
function readJournal(){try{const v=JSON.parse(localStorage.getItem(READING_KEY));return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}}
function readingRecord(value){
 const v=value&&typeof value==='object'?value:{},valid=n=>Number.isInteger(n)&&n>=0&&n<3;
 return {chapter:valid(v.chapter)?v.chapter:0,mode:v.mode==='open'?'open':'base',seen:Array.isArray(v.seen)?v.seen.filter(valid):[],completed:v.completed===true,
  mark:v.mark&&valid(v.mark.chapter)?{chapter:v.mark.chapter,mode:v.mark.mode==='open'?'open':'base'}:null};
}
/* 주소의 ?open= — 펼친 책. 서가의 ?book= 과 짝이다. 다른 물음표 값은 그대로 둔다 */
const askedOpen=()=>{try{return new URLSearchParams(location.search).get('open');}catch{return null;}};
const openURL=key=>{const q=new URLSearchParams(location.search);if(key)q.set('open',key);else q.delete('open');const s=q.toString();return location.pathname+(s?'?'+s:'')+location.hash;};
/* 움직임 켜기·끄기 — lib/scene-motion.js 의 스위치(모든 공방이 같이 쓰는 atelier_motion_v1). 기기가 동작 줄이기면 잠근다 */
export function useMotion(){
 const [on,setOn]=useState(()=>!!MOTION&&MOTION.enabled());
 useEffect(()=>MOTION?MOTION.subscribe(setOn):undefined,[]);
 return on;
}
export function MotionToggle({className}) {
 const on=useMotion(),locked=!MOTION||MOTION.reduced();
 return h('button',{type:'button',class:className,disabled:locked,title:W(locked?'motion.reduced':'motion.note'),onClick:()=>MOTION.setEnabled(!on)},W(on?'motion.off':'motion.on'));
}
function OpenBook({book,origin,onClose,closer,record,onRecord}) {
 const dialog=useRef(null),paper=useRef(null),timer=useRef(null),closing=useRef(false),pageHeading=useRef(null);
 /* 움직임 — 지금 장 그림(page) 위 입자 자리(layer), 나가는 그림의 정지 사본이 깔리는 자리(under). leaving 은 넘기기 직전의 그림 */
 const page=useRef(null),layer=useRef(null),under=useRef(null),leaving=useRef(null);
 /* 명장면을 열 때 — 장면 글이 어두운 무대에 먼저 뜨고(prelude), 그다음 그림이 열리고, 입자는 천천히. 누르거나 Enter 면 바로(skip) */
 const [prelude,setPrelude]=useState(null),skip=useRef(null);
 const resumed=useRef((record?.seen?.length||0)>0);
 const [reading,setReading]=useState(()=>readingRecord(record)),[finished,setFinished]=useState(false),[turn,setTurn]=useState(0),[direction,setDirection]=useState('next');
 const chapter=reading.chapter,current=book.chapters[chapter],mode=reading.mode==='open'&&current.open?'open':'base';
 const file=mode==='open'?current.open:current.file||current.open;
 const marked=reading.mark?.chapter===chapter&&reading.mark?.mode===mode;
 const sceneKind=mode==='open'?book.opens?.[current.stage]?.particles:null;
 /* 넘기기 직전에 지금 그림을 적어 둔다. 같은 장의 초상 → 명장면이면 열리기(reveal), 그 밖은 장 넘김(turn) */
 const leave=(n,nextMode)=>{
  if(!MOTION)return;
  const into=n===chapter&&mode==='base'&&nextMode==='open'&&!finished;
  leaving.current={snap:MOTION.snapshot(page.current),kind:into?'reveal':'turn',direction:n<chapter||(n===chapter&&nextMode==='base'&&mode==='open')?'previous':'next'};
 };
 /* 서재 바닥의 도트 인물에서 펼쳤으면 그 인물로 열고 닫는다(초점도 인물로) — 아니면 책등 */
 const source=()=>(origin?.isConnected&&origin.classList?.contains('sprite-actor')?origin:null)||document.querySelector('.shelf-book[data-key="'+book.key+'"]')||origin;
 const geometry=()=>{
  const a=source()?.getBoundingClientRect(),b=paper.current?.getBoundingClientRect();
  if(!a||!b)return;
  paper.current.style.setProperty('--book-x',(a.x+a.width/2-b.x-b.width/2)+'px');
  paper.current.style.setProperty('--book-y',(a.y+a.height/2-b.y-b.height/2)+'px');
  paper.current.style.setProperty('--book-scale',Math.min(a.width/b.width,a.height/b.height).toFixed(3));
 };
 const save=next=>{setReading(next);onRecord(book.key,next);};
 const move=(n,nextMode='base')=>{
  if(closing.current||n<0||n>2)return;
  leave(n,nextMode);setDirection(n<chapter?'previous':'next');setFinished(false);setTurn(v=>v+1);
  save({...reading,chapter:n,mode:nextMode,seen:[...new Set([...reading.seen,n])]});
 };
 const finish=()=>{if(closing.current)return;leave(chapter+1,'base');save({...reading,completed:true});setFinished(true);setTurn(v=>v+1);};
 const next=()=>chapter<2?move(chapter+1):finish();
 const close=()=>{
  if(closing.current)return;
  closing.current=true;geometry();dialog.current.dataset.phase='closing';
  timer.current=setTimeout(()=>{
   dialog.current?.close();onClose(book,reading);const target=source()||document.querySelector('.bookshelf-manage');target?.focus({preventScroll:true});
  },matchMedia('(prefers-reduced-motion: reduce)').matches?0:280);
 };
 closer.current=close;
 const keepFocus=e=>{
  if(e.key==='Enter'&&skip.current&&page.current?.dataset.prelude){e.preventDefault();skip.current();return;}
  if(e.key==='ArrowRight'&&!finished){e.preventDefault();next();return;}
  if(e.key==='ArrowLeft'&&!finished){e.preventDefault();move(chapter-1);return;}
  if(e.key!=='Tab')return;
  const nodes=Array.from(dialog.current.querySelectorAll('button:not(:disabled),a[href]')).filter(el=>el.getClientRects().length);
  const first=nodes[0],last=nodes[nodes.length-1];
  if(e.shiftKey&&(document.activeElement===first||document.activeElement===pageHeading.current)){e.preventDefault();last?.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
 };
 useLayoutEffect(()=>{
  const el=dialog.current;el.showModal();geometry();el.dataset.phase='opening';
  el.querySelector('.reading-close').focus({preventScroll:true});
  const wrap=document.querySelector('.lab-page .wrap'),before=wrap?.style.overflow;
  if(wrap)wrap.style.overflow='hidden';
  save({...reading,mode,seen:[...new Set([...reading.seen,chapter])]});
  return()=>{clearTimeout(timer.current);if(wrap)wrap.style.overflow=before;el.close();};
 },[]);
 /* 장이 바뀔 때마다 — 나가는 그림의 사본을 깔고 열리기·넘기기, 끝나면 이 그림에 켄 번스, 명장면이면 그 장면의 입자가 떠돈다 */
 const pageKey=chapter+'-'+mode+'-'+turn;
 useLayoutEffect(()=>{
  if(!MOTION||!page.current)return;
  const el=page.current,img=el.querySelector('img'),l=leaving.current;leaving.current=null;
  let alive=true,ambient=null,timer=0,waiting=null;
  const kenBurns=img?{el:img,seed:file}:null,sceneText=mode==='open'?book.opens?.[current.stage]?.scene:null;
  const from=l&&l.snap?MOTION.ghost(el,l.snap.src,{parent:under.current,transform:l.snap.transform}):null;
  const open=()=>MOTION.reveal(from,el,{kind:sceneKind,removeFrom:true,kenBurns,key:'reading',seed:file});
  let shown;
  if(!l)shown=Promise.resolve(kenBurns&&MOTION.kenBurns(img,{seed:file}));
  else if(l.kind==='reveal'&&sceneText&&MOTION.enabled()){
   el.dataset.prelude='on';setPrelude(sceneText);waiting=from;
   let go;shown=new Promise(ok=>{go=ok;});
   const begin=()=>{if(!el.dataset.prelude)return;clearTimeout(timer);delete el.dataset.prelude;waiting=null;setPrelude(null);go(open());};
   timer=setTimeout(begin,PRELUDE_MS);
   skip.current=()=>{begin();MOTION.cancel('reading');};
  }
  else shown=l.kind==='reveal'?open():MOTION.turn(from,el,{direction:l.direction,removeFrom:true,kenBurns,key:'reading'});
  shown.then(()=>{if(!alive)return;skip.current=null;if(sceneKind&&layer.current)ambient=MOTION.particles(layer.current,sceneKind,{seed:file});});
  return()=>{alive=false;clearTimeout(timer);skip.current=null;if(waiting){waiting.remove();setPrelude(null);}ambient?.destroy();if(img)MOTION.stop(img);};
 },[pageKey]);
 useEffect(()=>()=>MOTION?.cancel('reading'),[]);
 useLayoutEffect(()=>{if(turn){pageHeading.current?.focus({preventScroll:true});const area=dialog.current?.querySelector('.reading-story');if(area)area.scrollTop=0;}},[turn]);
 return h('dialog',{class:'reading-dialog',ref:dialog,'aria-labelledby':'reading-title',onKeyDown:keepFocus,
  onCancel:e=>{e.preventDefault();close();},onClick:e=>{if(e.target===dialog.current)close();}},
  h('div',{class:'reading-mood','aria-hidden':'true','data-mood':finished?'after':current.key+'-'+mode,style:readingMood(book,chapter,!finished&&mode==='open')}),
  h('article',{class:'reading-book',ref:paper,'data-book':book.key,'data-chapter':current.key,'data-finished':String(finished),'data-direction':direction},
   h('button',{type:'button',class:'reading-close','aria-label':W('home.shelf.close'),onClick:close},'×'),
   h('div',{class:'reading-art'},
    h('div',{class:'reading-ghosts',ref:under,'aria-hidden':'true'}),
    h('div',{class:'reading-image-page',key:pageKey,ref:page,'data-particles':sceneKind||undefined},h(Artwork,{file,title:book.title+' · '+current.stage}),h('div',{class:'reading-motion-layer',ref:layer,'aria-hidden':'true'})),
    h('span',{class:'reading-page-number'},W('home.read.page',{n:chapter+1})),
    prelude&&h('div',{class:'reading-prelude','aria-hidden':'true',onClick:()=>skip.current?.()},h('p',null,prelude),h('span',null,W('home.read.skip')))),
   h('div',{class:'reading-story'},
    h('p',{class:'reading-genre'},book.genre+' · '+book.author),
    h('h2',{id:'reading-title'},book.title),
    h('ol',{class:'reading-journey','aria-label':W('home.read.journey')},book.chapters.map((c,i)=>
     h('li',{'aria-current':!finished&&i===chapter?'step':undefined,'data-seen':reading.seen.includes(i)?'true':undefined},h('span',null,String(i+1).padStart(2,'0')),c.stage))),
    finished?h('div',{class:'reading-passage',key:'finished'},
     h('p',{class:'reading-eyebrow'},W('home.read.complete')),
     h('h3',{ref:pageHeading,tabIndex:-1},W('home.read.afterglow')),
     h('blockquote',null,book.arc?.answer||book.persona),
     h('p',{class:'reading-caption'},reading.mark?W('home.read.markedSummary',{stage:book.chapters[reading.mark.chapter].stage}):W('home.read.completeNote')),
     h('div',{class:'reading-actions'},h('button',{type:'button',class:'reading-restart',onClick:()=>move(0)},W('home.read.restart')))):
    h('div',{class:'reading-passage',key:chapter},
     h('p',{class:'reading-eyebrow'},W('home.read.chapter',{stage:current.stage})),
     h('h3',{ref:pageHeading,tabIndex:-1},book.arc?.[['question','conflict','answer'][chapter]]||book.persona),
     h('p',{class:'reading-caption'},mode==='open'?book.opens?.[current.stage]?.scene:book.forms?.[current.stage]?.look),
     h('div',{class:'reading-actions'},
      current.file&&current.open&&h('button',{type:'button',class:'reading-mode','aria-pressed':mode==='open',onClick:()=>{leave(chapter,mode==='open'?'base':'open');setTurn(v=>v+1);save({...reading,mode:mode==='open'?'base':'open'});}},W(mode==='open'?'home.shelf.portrait':'home.hall.open')),
      h('button',{type:'button',class:'reading-bookmark','aria-pressed':marked,onClick:()=>save({...reading,mark:marked?null:{chapter,mode}})},W(marked?'home.read.marked':'home.read.bookmark'))),
     resumed.current&&h('p',{class:'reading-resume'},W('home.read.resume'))),
    h('div',{class:'reading-links'},
     h('a',{class:'reading-detail',href:'dex.html?book='+encodeURIComponent(book.key)},W('home.shelf.detail')),
     file&&h('a',{class:'reading-mosaic',href:'mosaic.html?file='+encodeURIComponent(file)},W('home.shelf.mosaic')),
     h(MotionToggle,{className:'reading-motion'}))),
   h('footer',{class:'reading-controls'},
    h('button',{type:'button',class:'reading-return-button',onClick:close},W('home.read.return')),
    !finished&&h('div',{class:'reading-pagination'},
     h('button',{type:'button',class:'reading-previous',disabled:chapter===0,onClick:()=>move(chapter-1),'aria-label':W('home.read.previous')},'←'),
     h('button',{type:'button',class:'reading-next',onClick:next},W(chapter===2?'home.read.finish':'home.read.next'),' →')),
    finished&&reading.mark&&h('button',{type:'button',class:'reading-mark-link',onClick:()=>move(reading.mark.chapter,reading.mark.mode)},W('home.read.markLink'))),
   h('span',{class:'reading-announcement',role:'status','aria-live':'polite'},finished?W('home.read.complete'):W('home.read.position',{stage:current.stage,n:chapter+1}))));
}
export function Bookshelf() {
 const [data,setData]=useState(null),[error,setError]=useState(false),[theme,setTheme]=useState(()=>IMG.hallTheme());
 const [revision,setRevision]=useState(0),[columns,setColumns]=useState(()=>matchMedia('(max-width:599px)').matches?4:6);
 const [active,setActive]=useState(null),origin=useRef(null),closer=useRef(null);
 const [journal,setJournal]=useState(readJournal),[returned,setReturned]=useState(null),journalRef=useRef(journal);
 const recordReading=(key,value)=>{const next={...journalRef.current,[key]:value};journalRef.current=next;setJournal(next);try{localStorage.setItem(READING_KEY,JSON.stringify(next));}catch{}};
 /* 펼치면 기록을 한 칸 쌓고(?open=<열쇠>) 닫으면 그 칸을 내린다. 뒤로 가기면 책이 닫히고, 앞으로 가기·새로고침·공유면 그 책이 펼쳐진다 */
 const pushed=useRef(false),skipPop=useRef(false),live=useRef();
 const openBook=(b,el)=>{origin.current=el||null;setActive(b);
  if(!pushed.current&&askedOpen()!==b.key){try{history.pushState({shelf:'open'},'',openURL(b.key));pushed.current=true;}catch{}}};
 const closed=(book,reading)=>{setReturned({key:book.key,title:book.title,completed:reading.completed});setActive(null);
  if(pushed.current){pushed.current=false;skipPop.current=true;try{history.back();}catch{skipPop.current=false;}}
  else if(askedOpen()){try{history.replaceState(history.state,'',openURL(null));}catch{}}};
 live.current={data,active,openBook};
 /* 서재 바닥 — 도트 인물(data/sprites.json, lib/sprite-actor.js)이 셋까지, 바닥을 나눠 제 구역의 두 자리 사이를 거닌다(서로 겹치지 않게).
    고르면 그 인물의 책을 펼친다. 도트가 있는 인물만, 그 책이 설계표에 있을 때만. 한 명이라도 서면 바닥이 보이고, 아무도 못 서면 바닥째 안 보인다.
    책을 펼친 동안은 모두 멈추고, 닫으면 그 자리에서 다시 */
 const FLOOR_MAX=3;
 const floor=useRef(null),actors=useRef([]),[floorOn,setFloorOn]=useState(false);
 useEffect(()=>{
  const SP=window.AtelierSprite;
  if(!data||actors.current.length||!SP||!floor.current)return;
  let gone=false;
  SP.load('data/sprites.json').then(sp=>{
   const keys=Object.keys(sp.actors||{}).filter(k=>data.some(b=>b.key===sp.actors[k].book)).slice(0,FLOOR_MAX);
   if(gone||!keys.length)return;
   const n=keys.length,seed=Date.now()%100000;
   keys.forEach((key,i)=>{
    const d=sp.actors[key],book=data.find(b=>b.key===d.book);
    const a=SP.create(floor.current,d,{base:sp.base,label:W('home.sprite.actor',{name:W('sprite.name.'+key),title:book.title}),
     points:n===1?[0.2,0.5]:[(i+0.2)/n,(i+0.8)/n],start:i%2,floor:14,seed:seed+i*977,idleMs:[3000+i*700,6500+i*900],
     onSelect:()=>{const {data,active,openBook}=live.current,b=(data||[]).find(x=>x.key===d.book);if(b&&!active)openBook(b,a.el);}});
    a.el.dataset.who=key;
    actors.current.push(a);
    a.ready.then(x=>{if(!gone&&!x.failed)setFloorOn(true);});
   });
  }).catch(()=>{});
  return()=>{gone=true;};
 },[data]);
 useEffect(()=>()=>{actors.current.forEach(a=>a.destroy());actors.current=[];},[]);
 useEffect(()=>{actors.current.forEach(a=>active?a.pause('reading'):a.resume('reading'));},[active,floorOn]);
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
     const seed=hash(b.key),c=spineColors(b),len=titleLength(b.title),rib=ribbonOf(b,journal[b.key]);
     return h('button',{type:'button',key:b.key,class:'shelf-book','data-key':b.key,'data-binding':FRAME.kind(b),'data-long':len>6?'true':undefined,
      'data-returned':returned?.key===b.key?'true':undefined,'data-read':journal[b.key]?.completed?'true':undefined,
      'data-selected':active?.key===b.key?'true':undefined,'aria-haspopup':'dialog','aria-label':W('home.shelf.open',{title:b.title})+(rib?' · '+rib.label:''),
      style:'--spine:'+c.spine+';--spine-ink:'+c.ink+';--spine-gild:'+c.gild+';--title-len:'+len+';--book-width:'+(64+seed%5*6)+'px;--book-height:'+(202+Math.min(3,Math.max(0,Math.ceil(len)-4))*9+seed%3*3)+'px',
      onClick:e=>openBook(b,e.currentTarget)},
      h('span',{class:'book-volume'},
       rib&&h('span',{class:'spine-ribbon','aria-label':rib.label,'data-stage':rib.stage,'data-scene':rib.scene?'true':undefined},rib.mark,rib.scene&&h('i',{'aria-hidden':'true'},W('home.read.ribbon.sceneMark'))),
       h('span',{class:'book-spine'},h('span',{class:'spine-mark'},h(Mark,{seed})),h('span',{class:'spine-title'},h('span',null,b.title)),
        h('span',{class:'spine-number','aria-hidden':'true'},String(r*columns+i+1).padStart(2,'0'))),
       h('span',{class:'book-peek','aria-hidden':'true'},h(Artwork,{file:b.file,title:b.title,thumb:true}))));})),
    h('div',{class:'shelf-plank','aria-hidden':'true'},h('span',null,String(r+1).padStart(2,'0')))))),
  h('div',{class:'shelf-floor',ref:floor,hidden:!floorOn,role:'group','aria-label':W('home.sprite.floor')}),
  h('div',{class:'bookshelf-foot'},h('span',null,W('theme.'+theme)),floorOn&&h('a',{class:'bookshelf-dots',href:'sprite.html'},W('home.sprite.room')),h('span',null,W('home.shelf.count',{n:books.length}))),
  h('p',{class:'bookshelf-receipt',role:'status'},returned?W(returned.completed?'home.read.returnedComplete':'home.read.returned',{title:returned.title}):W('home.read.invitation')),
  active&&h(OpenBook,{key:active.key,book:active,origin:origin.current,closer,record:journal[active.key],onRecord:recordReading,onClose:closed}));
}
