/* 생성기 화면 — pkm-atelier 의 lib/prompt-ui.js 를 책 꼴로 옮겼다.
   pkm 에서 그대로: 외형 선택지(잠금·무작위·직접 입력·색 팔레트·체형/머리 그림 고르기), 얼굴 설계 켜고 끄기,
   장면 값마다 랜덤·잠금, 전체 랜덤, 일상컷 갈래·예시·세 축, 등록 그림 보기, 복사(안 되면 글을 골라 둔다), 책마다 이 브라우저에 저장.
   atelier(건담) 생성기에서: 한 단계 되돌리기·다시 하기, 직전 책 외형 가져오기, 기록 내보내기(JSON), 책 고르개의 ✓·◐ 표시, 올릴 파일 이름.
   myth 생성기에서: 일상컷 번호(1~9), 화풍 판 고르기와 참고 그림 자리.
   말은 전부 lib/words.js 와 lib/prompt-spec.js 에서 온다. */
import {h,render} from 'https://esm.sh/preact@10.24.3';
import {useState,useEffect,useLayoutEffect,useMemo,useRef} from 'https://esm.sh/preact@10.24.3/hooks';
import {WorkspaceHeader} from './workspace-ui.js?v=1';
const S=window.AtelierSpec,P=window.AtelierPrompt,A=window.AtelierImg,F=window.AtelierFigures,W=window.W,R=window.AtelierSceneRandom,
 FILTER=window.AtelierDexFilter;
const STORE='book_prompt_v1',MODES=['form','open','casual'],HISTORY=50;
const defs=S.PARAM_DEFS.filter(d=>S.IDENTITY_GROUPS.includes(d.group)&&!S.IDENTITY_EXCLUDED.includes(d.key));
const blankScene=()=>({expr:'',pose:'',orient:'',scene:'',outfit:'',frame:'',lens:'',camera:'',custom:'',aspect:'2:3',
 cat:'everyday_basic',catCustom:'',ex:'',exCustom:'',axes:{},action:{},randomLocks:{}});
const defaults=()=>({style:'',version:'',identityMode:'create',form:'',baseForm:'',casualN:1,exposure:S.FORM_EXPOSURE_DEFAULT,attachStyleRef:false,
 motifs:'',lookNote:'',faceDesignOn:true,silhouetteOn:true,params:{},locks:{},mode:'form',
 scenes:{form:blankScene(),open:blankScene(),casual:blankScene()}});
const object=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
function normalizeAction(raw){
 const x=object(raw),category=S.ACTION_CATEGORIES.find(r=>r.key===x.category);
 return {category:category?.key||'',
  example:category?.examples.some(r=>r.key===x.example)?x.example:'',
  ...Object.fromEntries(S.ACTION_CONTROLS.map(control=>[control.key,
   control.options.some(r=>r.key===x[control.key])?x[control.key]:'']))};
}
function readStore(){try{return object(JSON.parse(localStorage.getItem(STORE)||'{}'))}catch{return {}}}
let saved=readStore();
/* 저장값을 지금 자료에 맞춘다 — 없는 폼·화풍·판은 기본으로 */
function normalize(input,ctx){
 const d=defaults(),x=object(input);
 const out={...d,...x,params:object(x.params),locks:object(x.locks),scenes:{}};
 if(!MODES.includes(out.mode))out.mode=d.mode;
 if(!ctx.styles[out.style])out.style=ctx.defaultStyle;
 const st=ctx.styles[out.style];
 /* 판은 고르지 않았으면 지금 판을 따라간다 — 새 판이 나오면 옛 저장값이 옛 판에 남지 않게. 일부러 옛 판을 고른 것(versionPinned)만 남긴다 */
 if(!st.versions.some(v=>v.v===out.version)||(!out.versionPinned&&out.version!==st.current)){out.version=st.current;out.versionPinned=false}
 if(!ctx.formKeys.includes(out.form))out.form=ctx.firstForm;
 if(!ctx.formKeys.includes(out.baseForm))out.baseForm=ctx.firstForm;
 if(!['create','reference'].includes(out.identityMode))out.identityMode='create';
 out.casualN=Math.min(9,Math.max(1,Math.floor(Number(out.casualN))||1));
 if(!S.FORM_EXPOSURE_KEYS.includes(out.exposure))out.exposure=S.FORM_EXPOSURE_DEFAULT;
 if(typeof out.attachStyleRef!=='boolean')out.attachStyleRef=false;
 for(const k of ['motifs','lookNote'])if(typeof out[k]!=='string')out[k]='';
 for(const k of ['faceDesignOn','silhouetteOn'])if(typeof out[k]!=='boolean')out[k]=true;
 for(const mode of MODES){
  out.scenes[mode]={...blankScene(),...object(object(x.scenes)[mode])};
  out.scenes[mode].axes=object(out.scenes[mode].axes);
  out.scenes[mode].action=normalizeAction(out.scenes[mode].action);
  out.scenes[mode].randomLocks=Object.fromEntries(Object.entries(object(out.scenes[mode].randomLocks)).filter(([,v])=>v===true));
 }
 return out;
}
const note=(text,props={})=>h('p',{class:'studio-note',...props},text);
function Select({id,label,value,options,onChange,description,disabled=false}){
 return h('label',{class:'studio-field'},h('span',{id:id+'-label'},label),
  h('select',{id,value,disabled,'aria-labelledby':id+'-label',
   'aria-describedby':description?id+'-description':undefined,onChange:e=>onChange(e.target.value)},
   options.map(([v,t])=>h('option',{key:v,value:v},t))),
  description&&h('small',{class:'studio-field-help',id:id+'-description'},description));
}
function Text({id,label,value,onChange,multiline=false,placeholder='',description}){
 return h('label',{class:'studio-field'},h('span',{id:id+'-label'},label),
  h(multiline?'textarea':'input',{id,type:multiline?undefined:'text',value:value||'',placeholder,
   'aria-labelledby':id+'-label','aria-describedby':description?id+'-description':undefined,
   onInput:e=>onChange(e.target.value)}),
  description&&h('small',{class:'studio-field-help',id:id+'-description'},description));
}
function Figure({param,value}){
 const ref=useRef(),[failed,setFailed]=useState(false),png=F.pngURL(param,value);
 useEffect(()=>{
  if(png&&!failed)return;
  const draw=()=>{if(ref.current&&F.has(param,value))F.drawForKey(param,value,'female',ref.current)};
  draw();addEventListener('atelier-appearance',draw);
  return()=>removeEventListener('atelier-appearance',draw);
 },[param,value,png,failed]);
 if(png&&!failed)return h('img',{class:'figure-png',src:png,alt:'','aria-hidden':'true',
  loading:'lazy',decoding:'async',draggable:false,onError:()=>setFailed(true)});
 if(!F.has(param,value))return null;
 const [width,height]=F.dimensions(param);
 return h('canvas',{ref,width,height,'aria-hidden':'true'});
}
function FigurePicker({d,value,onValue}){
 const row=useRef(),choices=d.options.filter(([v])=>F.has(d.key,v));
 useEffect(()=>{
  const active=row.current?.querySelector('[aria-pressed="true"]');
  if(active)row.current.scrollTo({left:Math.max(0,active.offsetLeft-(row.current.clientWidth-active.offsetWidth)/2)});
 },[value]);
 if(!choices.length)return null;
 return h('div',{class:'figure-picker','data-figure-picker':d.key},
  h('div',{class:'figure-picker-head'},h('span',null,W('prompt.figure.pick',{label:d.ko})),
   h('button',{type:'button','data-value':'','aria-pressed':!value,onClick:()=>onValue('')},W('prompt.auto'))),
  h('div',{class:'figure-row',ref:row,role:'group','aria-label':W('prompt.figure.pick',{label:d.ko})},
   choices.map(([v,t])=>h('button',{key:v,type:'button',class:'figure-choice','data-value':v,
    'aria-pressed':value===v,'aria-label':t,title:t,onClick:()=>onValue(v)},
    h('span',{class:'figure-image'},h(Figure,{param:d.key,value:v})),h('b',null,t.split(' — ')[0])))));
}
/* RGB 로 고르기 — myth-atelier 생성기에서. 색 상자(브라우저 색 선택)·HEX 칸·R/G/B 막대와 숫자. 값은 "#rrggbb" 로 남고
   프롬프트에는 코드와 색 이름이 같이 들어간다(lib/prompt-book.js 의 hexName). 아래 팔레트는 빠른 시작점 */
const toHex=a=>'#'+a.map(n=>Math.max(0,Math.min(255,Math.round(+n||0))).toString(16).padStart(2,'0')).join('');
function RgbPicker({d,value,onValue}){
 const hex=(P.isHex(value)?value:S.COLOR_HEX[value]||'').toLowerCase(),id='param-'+d.key.replace(/\W/g,'-');
 const [draft,setDraft]=useState(hex);
 useEffect(()=>setDraft(hex),[hex]);
 const rgb=hex?[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)):[128,128,128];
 const bar=i=>{const lo=rgb.slice(),hi=rgb.slice();lo[i]=0;hi[i]=255;return '--bar:linear-gradient(90deg,'+toHex(lo)+','+toHex(hi)+')';};
 const setCh=(i,n)=>{const a=rgb.slice();a[i]=n;onValue(toHex(a));};
 const typed=t=>{setDraft(t);const m=/^#?([0-9a-f]{6})$/i.exec(t.trim());if(m)onValue('#'+m[1].toLowerCase());};
 return h('div',{class:'rgb-picker','data-rgb-picker':d.key,'data-auto':!hex||undefined},
  h('div',{class:'rgb-main'},
   h('input',{type:'color',id:id+'-wheel','aria-label':W('prompt.color.wheel',{label:d.ko}),value:hex||'#808080',onInput:e=>onValue(e.currentTarget.value)}),
   h('label',{for:id+'-hex'},'HEX',h('input',{id:id+'-hex',type:'text',maxlength:7,spellcheck:false,autocomplete:'off',
    placeholder:'#RRGGBB',value:draft,onInput:e=>typed(e.currentTarget.value)})),
   h('span',{class:'rgb-name'},P.isHex(value)?[W('prompt.color.says')+' ',h('b',{key:'b'},value.toUpperCase()+' ('+P.hexName(value)+')')]:W('prompt.color.rgb.note'))),
  h('div',{class:'rgb-bars'},['R','G','B'].map((c,i)=>h('label',{key:c,style:bar(i)},c,
   h('input',{type:'range',min:0,max:255,id:id+'-'+c.toLowerCase(),'aria-label':d.ko+' '+c,value:rgb[i],onInput:e=>setCh(i,+e.currentTarget.value)}),
   h('input',{type:'number',min:0,max:255,'aria-label':d.ko+' '+c+' 0-255',value:hex?rgb[i]:'',placeholder:'-',
    onChange:e=>{const n=e.currentTarget.value;if(n!=='')setCh(i,+n);}})))));
}
function ColorPicker({d,selected,options,onValue}){
 return h('div',{class:'color-picker','data-color-picker':d.key,role:'group',
  'aria-label':W('prompt.color.pick',{label:d.ko})},options.map(([v,t])=>
  h('button',{key:v,type:'button',class:'color-choice'+(!v?' color-auto':v==='__custom__'?' color-custom':''),
   'data-value':v,'aria-label':t,title:t,'aria-pressed':selected===v,onClick:()=>onValue(v)},
   h('i',{'aria-hidden':'true',style:S.COLOR_HEX[v]?{backgroundColor:S.COLOR_HEX[v]}:undefined}),
   h('span',null,v==='__custom__'?W('prompt.custom'):t.split(' — ').pop()))));
}
function Param({d,value,params,locked,onValue,onLock}){
 const color=!!S.COLOR_KEYS[d.key],rgb=color&&P.isHex(value);
 const options=d.options.map(([v,t])=>[v,v===''?W(d.key==='second eye color'?'prompt.eye.same':'prompt.auto'):t]);
 /* RGB 값은 직접 입력이 아니라 고르개의 한 줄로 보인다 */
 if(rgb)options.push([value,W('prompt.color.rgb.option',{hex:value.toUpperCase()})]);
 const custom=value&&!options.some(([v])=>v===value),selected=custom?'__custom__':value||'';
 const visual=d.key==='body type'||d.key==='hairstyle';
 const guide=S.PARAM_GUIDES[d.key]?.[value]?.[0];
 const help=d.key==='facial ethnicity'?S.PARAM_HELP.ethnicity:
  d.key==='body measurements (B/W/H)'?S.PARAM_HELP.measurement:
  ['eye color','second eye color'].includes(d.key)?S.PARAM_HELP.eye:
  color?S.PARAM_HELP.color:S.PARAM_GROUP_HELP[d.group];
 const description=[selected==='__custom__'?S.PARAM_HELP.custom:!selected?S.PARAM_HELP.auto:guide,
  help,d.key==='hair length'&&value?S.HAIR_LENGTH_LIMITS[params.hairstyle]?.[0]:null].filter(Boolean).join(' ');
 return h('div',{class:'studio-param'+(visual||color?' studio-param-visual':'')},
  h('button',{type:'button',class:'param-lock','aria-label':W(locked?'prompt.unlock':'prompt.lock')+' · '+d.ko,
   'aria-pressed':!!locked,onClick:onLock},locked?'●':'○'),
  h(Select,{id:'param-'+d.key.replace(/\W/g,'-'),label:d.ko,value:selected,options,description,onChange:onValue}),
  color&&h(ColorPicker,{d,selected,options:options.filter(([v])=>!P.isHex(v)),onValue}),
  color&&h(RgbPicker,{d,value,onValue}),
  selected==='__custom__'&&h('div',{class:'custom-value'},h(Text,{label:W('prompt.custom'),
   value:custom?value:'',onChange:v=>onValue(v||'__custom__')})),
  visual&&h(FigurePicker,{d,value,onValue}));
}
/* 등록된 그림 — 고른 화풍의 이 폼(개방이면 그 폼의 개방)·일상컷. 첨부할 그림을 찾는 자리다 */
function Gallery({entry,style,form,mode}){
 const b=A.styleMap(entry)[style]||{},slot=mode==='open'?form+'_open':form,fb=A.formOf(b,slot);
 const files=mode==='casual'?A.cuts(b,'casual','f'):[...(fb&&fb.f?[fb.f]:[]),...A.formActs(b,slot,'f')];
 return h('details',{class:'studio-gallery',id:'gallery'},
  h('summary',null,W('prompt.gallery')+' · '+W('art.count',{n:files.length})),
  note(W('prompt.gallery.note')),
  files.length?h('div',{class:'studio-preview'},files.map(file=>h('a',{key:file,href:A.imgURL(file),target:'_blank',rel:'noopener'},
   h('img',{src:A.thumbURL(file),alt:W('prompt.gallery'),loading:'lazy',onError:e=>{
    const img=e.currentTarget;
    if(!img.dataset.fallback){img.dataset.fallback='1';img.src=A.imgURL(file)}
    else img.classList.add('failed');
   }})))):h('div',{class:'studio-empty studio-note'},W('art.none')));
}
/* 화풍 참고 그림 — data/style.json 의 판에 reference.path 가 있으면 그림 저장소의 그 파일을 보인다 */
function StyleRef({version}){
 const ref=object(version.reference),[failed,setFailed]=useState(false);
 const url=ref.path?A.BASE.replace(/img\/$/,'')+ref.path.replace(/^\//,''):'';
 return h('details',{class:'studio-style-sample',id:'style-sample'},
  h('summary',null,W('prompt.style.ref')+' · '+W(url?'prompt.style.ref.has':'prompt.style.ref.empty')),
  url&&!failed?h('a',{href:url,target:'_blank',rel:'noopener'},h('img',{src:url,alt:W('prompt.style.ref'),decoding:'async',onError:()=>setFailed(true)})):
   note(W(url?'prompt.style.ref.error':'prompt.style.ref.none',{n:(ref.candidates||[]).length})),
  (ref.candidates||[]).length>0&&note(W('prompt.style.ref.candidates')+' '+ref.candidates.join(' · ')),
  (version.why||[]).length>0&&h('ul',{class:'studio-note',id:'style-why'},version.why.map((t,i)=>h('li',{key:i},t))));
}
/* 책 얼굴 설계 — 설계표의 다섯 묶음. 새 인물에만 FACE 줄로 실린다. 직접 고른 얼굴 항목은 그 묶음을 빼고 이긴다 */
function FaceDesign({book,on,params,onToggle}){
 const f=object(book.face);
 return h('div',{id:'face-design'},
  h('h3',{class:'studio-label'},W('prompt.face.title')),
  h('label',{class:'studio-check'},h('input',{type:'checkbox',id:'face-design-on',checked:on,onChange:onToggle}),' ',W('prompt.face.use')),
  note(W('prompt.face.note')),
  on&&h('ul',{class:'studio-note',id:'face-design-list'},Object.keys(S.FACE_PARAM).filter(k=>f[k]).map(k=>h('li',{key:k,'data-key':k,class:params[S.FACE_PARAM[k]]?'overridden':''},
   W('book.face.'+k)+' · '+S.VOCAB_EN[k][f[k]]+(params[S.FACE_PARAM[k]]?' — '+W('prompt.face.overridden'):'')))));
}
function Silhouette({book,on,params,onToggle}){
 const s=object(book.silhouette);
 return h('div',{id:'silhouette-design'},
  h('h3',{class:'studio-label'},W('prompt.sil.title')),
  h('label',{class:'studio-check'},h('input',{type:'checkbox',id:'silhouette-on',checked:on,onChange:onToggle}),' ',W('prompt.sil.use')),
  on&&h('ul',{class:'studio-note',id:'silhouette-list'},Object.keys(s).map(k=>{const over=S.SIL_PARAM[k]&&params[S.SIL_PARAM[k]];
   return h('li',{key:k,'data-key':k,class:over?'overridden':''},W('book.sil.'+k)+' · '+(S.VOCAB_EN[k]||{})[s[k]]+(over?' — '+W('prompt.face.overridden'):''))})));
}
/* 올릴 파일 이름 — 등록기(tools/register-images.py)가 읽는 꼴 그대로 */
function fileName(key,st,ctx){
 const style=st.style;
 if(st.mode==='casual')return key+'_'+style+'_f_casual'+st.casualN+'.webp';
 return key+'_'+st.form+(st.mode==='open'?'_open':'')+'_'+style+'_f.webp';
}
function recordName(key,st){
 return 'records/'+key+'/'+(st.mode==='casual'?'casual'+st.casualN:st.form+(st.mode==='open'?'_open':''))+'-ui.json';
}
function Editor({book,ctx,images}){
 /* 처음 여는 책은 시범 폼에서 시작한다 — 보통 그것이 첫 그림(인물 기준)이다 */
 const pilotForm=ctx.formKeys.find(k=>ctx.defs[k].stage===object(book.pilot).form);
 const [st,setSt]=useState(()=>normalize(object(saved.cards)[book.key],pilotForm?{...ctx,firstForm:pilotForm}:ctx));
 const past=useRef([]),future=useRef([]),[,tick]=useState(0);
 /* 바꾸기는 모두 이 길로 — 한 단계씩 되돌릴 수 있게 앞 상태를 쌓는다(건담 생성기의 되돌리기) */
 const set=fn=>setSt(prev=>{const next=typeof fn==='function'?fn(prev):fn;if(next!==prev){past.current.push(prev);if(past.current.length>HISTORY)past.current.shift();future.current=[];}return next;});
 const undo=()=>{const p=past.current.pop();if(!p)return;setSt(cur=>{future.current.push(cur);return p});tick(n=>n+1)};
 const redo=()=>{const n=future.current.pop();if(!n)return;setSt(cur=>{past.current.push(cur);return n});tick(n=>n+1)};
 const [notice,setNotice]=useState(''),[storageError,setStorageError]=useState(false),[record,setRecord]=useState('');
 const outputRef=useRef();
 const mode=st.mode,scene=st.scenes[mode],stage=ctx.defs[st.form].stage;
 const reference=mode!=='form'||st.identityMode==='reference';
 const style=ctx.styles[st.style],version=style.versions.find(v=>v.v===st.version)||style.versions[0];
 const update=(key,value)=>{set(s=>({...s,[key]:value}));setNotice('')};
 const setScene=(key,value)=>set(s=>({...s,scenes:{...s.scenes,[mode]:{...s.scenes[mode],[key]:value}}}));
 const setAction=(key,value)=>set(s=>{
  const current=s.scenes[mode];
  return {...s,scenes:{...s.scenes,[mode]:{...current,action:{...current.action,[key]:value,...(key==='category'?{example:''}:{})}}}};
 });
 const setParam=(key,value)=>set(s=>({...s,params:{...s.params,[key]:value}}));
 useLayoutEffect(()=>{
  const order=[book.key,...(saved.order||[]).filter(k=>k!==book.key)].slice(0,20);
  saved={...saved,last:book.key,order,cards:{...object(saved.cards),[book.key]:st}};
  try{localStorage.setItem(STORE,JSON.stringify(saved));setStorageError(false)}catch{setStorageError(true)}
 },[st,book.key]);
 const result=useMemo(()=>{
  try{
   const input={...st,...scene,book,stage,baseStage:ctx.defs[st.baseForm].stage,styleText:version.text,styleCheck:version.check||'',styleRef:st.attachStyleRef&&!!object(version.reference).path,
    outputMode:mode,identityMode:reference?'reference':'create',params:Object.entries(st.params)};
   return {text:mode==='casual'?P.buildCasual(input):P.buildPrompt(input)};
  }catch(e){return {text:'',error:W('prompt.output.error',{message:e.message})}}
 },[st,book,mode,reference,scene,version]);
 async function copyText(text,ok){
  try{await navigator.clipboard.writeText(text);setNotice(W(ok))}
  catch{outputRef.current?.focus();outputRef.current?.select();setNotice(W('prompt.copy.failed'))}
 }
 /* 기록 — 그림 저장소의 records/<책>/<자리>-ui.json 으로 둔다. storage 는 pkm 의 casualN-ui.json 과 같은 꼴(장부가 읽는다) */
 function exportRecord(){
  const rec={version:1,book:book.key,title:book.title,mode,form:st.form,stage,style:st.style,styleVersion:st.version,
   file:fileName(book.key,st,ctx),record:recordName(book.key,st),at:new Date().toISOString(),
   storage:{last:book.key,cards:{[book.key]:st}},prompt:result.text};
  const text=JSON.stringify(rec,null,1);setRecord(text);copyText(text,'prompt.record.copied');
 }
 function randomize(){
  /* 얼굴 설계·실루엣이 켜져 있으면 그 항목은 무작위로 바꾸지 않는다 — 비워 두어 설계가 채운다 */
  const designed=k=>(st.faceDesignOn&&Object.values(S.FACE_PARAM).includes(k))||(st.silhouetteOn&&Object.values(S.SIL_PARAM).includes(k));
  set(s=>({...s,params:{...s.params,...Object.fromEntries(defs.filter(d=>!s.locks[d.key]&&!designed(d.key)).map(d=>{
   const choices=d.options.filter(([v])=>v&&v!=='__custom__');
   return [d.key,choices.length?choices[Math.floor(Math.random()*choices.length)][0]:''];
  }))}}));
 }
 /* 직전에 손댄 다른 책의 외형·잠금을 가져온다(건담 생성기의 "앞 카드 설정") */
 const prevKey=(saved.order||[]).find(k=>k!==book.key&&object(object(saved.cards)[k]).params&&Object.keys(saved.cards[k].params).length);
 const prevBook=prevKey&&ctx.books.find(b=>b.key===prevKey);
 const takePrev=()=>{const p=object(saved.cards[prevKey]);set(s=>({...s,params:{...object(p.params)},locks:{...object(p.locks)}}));setNotice(W('prompt.prev.done',{book:prevBook.title}))};
 const randomScene=key=>set(s=>({...s,scenes:{...s.scenes,[mode]:R.randomize(s.scenes[mode],mode,key)}}));
 const toggleSceneLock=key=>set(s=>{
  const current=s.scenes[mode];
  return {...s,scenes:{...s.scenes,[mode]:{...current,randomLocks:{...current.randomLocks,[key]:!current.randomLocks[key]}}}};
 });
 const randomSelect=(props,key)=>h('div',{class:'scene-choice',key:props.key||key},
  h(Select,props),h('div',{class:'scene-choice-actions'},
   h('button',{type:'button',id:'random-'+props.id,disabled:!R.canRandomize(scene,mode,key),
    'aria-label':W('prompt.scene.random.field',{label:props.label}),onClick:()=>randomScene(key)},W('prompt.scene.random.short')),
   h('button',{type:'button',id:'lock-'+props.id,'aria-pressed':!!scene.randomLocks[key],
    'aria-label':W(scene.randomLocks[key]?'prompt.scene.unlock.field':'prompt.scene.lock.field',{label:props.label}),
    onClick:()=>toggleSceneLock(key)},W(scene.randomLocks[key]?'prompt.scene.locked':'prompt.scene.lock'))));
 const sceneSelect=(id,key,options,label,description)=>randomSelect({id,label:W('prompt.'+(label||key)),value:scene[key],
  description:description||W('prompt.help.'+(label||key)),options,onChange:v=>setScene(key,v)},key);
 const sceneText=key=>h(Text,{key,id:key,label:W(key==='custom'?'prompt.extra':'prompt.'+key),
  description:W('prompt.help.'+key),value:scene[key],multiline:true,onChange:v=>setScene(key,v)});
 const categoryOptions=S.CATS.filter(r=>r[4]!=='m').map(r=>[r[0],r[2]]);
 const examples=(S.EXAMPLE_MAP[scene.cat]||[['','',W('prompt.auto')]]).filter(r=>r[4]!=='m').map(r=>[r[0],r[2]]);
 if(!examples.some(r=>r[0]==='__custom__'))examples.push(['__custom__',W('prompt.custom')]);
 const action=scene.action,actionCategory=S.ACTION_CATEGORIES.find(r=>r.key===action.category);
 const actionExample=actionCategory?.examples.find(r=>r.key===action.example);
 const actionOptions=rows=>[['',W('prompt.auto')],...rows.map(r=>[r.key,r.label])];
 const poses=mode==='form'?actionOptions(S.ACTION_POSES):S.POSE_OPTIONS;
 const poseDescription=(mode==='form'&&S.ACTION_POSES.find(r=>r.key===scene.pose)?.description)||S.POSE_GUIDES[scene.pose]?.[0]||W(mode==='form'?'prompt.action.pose.help':'prompt.help.pose');
 const form=object(object(book.forms)[stage]),open=object(object(book.opens)[stage]),rule=object(book.rule);
 const formOptions=ctx.formKeys.map(k=>[k,ctx.defs[k].stage+(isPilot(book,ctx.defs[k].stage,mode)?' · '+W('dex.pilot'):'')]);
 const done=FILTER.best(images[book.key],ctx.defs,st.style).prog;
 return h('div',{class:'studio-editor'},
  h('div',{class:'studio-tabs',role:'group','aria-label':W('prompt.output')},MODES.map(m=>h('button',{
   id:'mode-'+m,key:m,'aria-pressed':mode===m,onClick:()=>update('mode',m)},W('prompt.'+m)))),
  h('div',{class:'studio-row studio-history'},
   h('button',{type:'button',id:'undo',disabled:!past.current.length,onClick:undo},W('prompt.undo')),
   h('button',{type:'button',id:'redo',disabled:!future.current.length,onClick:redo},W('prompt.redo')),
   h('a',{href:'dex.html?book='+encodeURIComponent(book.key),id:'to-dex',class:'studio-link'},W('prompt.toDex'))),
  h('section',{class:'studio-card'},
   h('div',{class:'studio-row'},
    h(Select,{id:'style',label:W('prompt.style'),value:st.style,options:Object.keys(ctx.styles).map(k=>[k,ctx.styles[k].name]),onChange:v=>update('style',v)}),
    h(Select,{id:'style-version',label:W('prompt.style.version'),value:st.version,
     options:style.versions.map(v=>[v.v,v.v+(v.v===style.current?' · '+W('prompt.style.current'):'')+' · '+v.adopted]),onChange:v=>set(s=>({...s,version:v,versionPinned:v!==style.current}))})),
   note(W('prompt.style.note',{key:st.style,v:st.version}),{id:'style-description'}),
   h(StyleRef,{key:st.style+st.version,version}),
   /* 참고 그림을 같이 첨부하면 그리는 방식뿐 아니라 얼굴·구도까지 따라왔다(2026-10-15) — 기본은 텍스트만 */
   object(version.reference).path&&h('label',{class:'studio-check'},h('input',{type:'checkbox',id:'attach-style-ref',checked:st.attachStyleRef,
    onChange:()=>update('attachStyleRef',!st.attachStyleRef)}),' ',W('prompt.style.ref.attach')),
   mode!=='casual'&&h('div',{class:'studio-row'},
    h(Select,{id:'form',label:W('prompt.form'),value:st.form,options:formOptions,onChange:v=>update('form',v)}),
    mode==='form'&&h(Select,{id:'identity-mode',label:W('prompt.stage'),value:st.identityMode,
     options:[['create',W('prompt.create')],['reference',W('prompt.reference')]],onChange:v=>update('identityMode',v)}),
    mode==='form'&&st.identityMode==='reference'&&h(Select,{id:'base-form',label:W('prompt.base'),value:st.baseForm,
     options:ctx.formKeys.map(k=>[k,ctx.defs[k].stage]),onChange:v=>update('baseForm',v)}),
    mode==='form'&&h(Select,{id:'exposure',label:W('prompt.exposure'),value:st.exposure,description:W('prompt.exposure.help.'+(st.exposure||'auto')),
     options:S.FORM_EXPOSURE_KEYS.map(k=>[k,W('prompt.exposure.'+(k||'auto'))]),onChange:v=>update('exposure',v)})),
   mode==='casual'&&h(Select,{id:'casual-n',label:W('prompt.casual.n'),value:String(st.casualN),
    options:[1,2,3,4,5,6,7,8,9].map(n=>[String(n),W('prompt.casual.cut',{n})]),onChange:v=>update('casualN',Number(v))}),
   note(W(mode==='form'?(reference?'prompt.reference.note':'prompt.create.note'):'prompt.'+mode+'.note'),{id:'identity-note'}),
   mode==='form'&&reference&&note(W('prompt.anchor.note')),
   h('p',{class:'studio-note',id:'file-name'},W('prompt.file')+' ',h('code',null,fileName(book.key,st,ctx)),' · ',W('art.form.done',done))),
  mode!=='casual'&&h('section',{class:'studio-card',id:'book-design'},
   h('h2',{class:'studio-title'},W(mode==='open'?'prompt.design.open':'prompt.design.form',{stage})),
   h('dl',{class:'studio-facts'},
    h('dt',null,W('book.persona')),h('dd',null,book.persona),
    mode==='form'&&[h('dt',{key:'l'},W('book.look')),h('dd',{key:'ld'},form.look||'—'),
     h('dt',{key:'p'},W('book.pose')),h('dd',{key:'pd'},form.pose||'—'),
     h('dt',{key:'r'},W('prompt.role')),h('dd',{key:'rd'},form.role||'—'),
     h('dt',{key:'u'},W('book.rule.use')),h('dd',{key:'ud'},object(rule.forms)[stage]||'—')],
    mode==='open'&&[h('dt',{key:'o'},W('book.open')),h('dd',{key:'od'},open.scene||'—')]),
   h(Text,{id:'look-note',label:W(mode==='open'?'prompt.open.override':'prompt.override'),value:st.lookNote,
    placeholder:W(mode==='open'?'prompt.open.override.ph':'prompt.override.ph'),onChange:v=>update('lookNote',v)})),
  mode!=='open'&&h('section',{class:'studio-card'},
   h(Text,{id:'motifs',label:W('prompt.motifs'),value:st.motifs,description:W(mode==='casual'?'prompt.help.motifs':'prompt.help.motifs.form'),
    placeholder:W('prompt.motifs.ph'),onChange:v=>update('motifs',v)})),
  mode==='form'&&!reference&&h('section',{class:'studio-card',id:'design-lines'},
   h('h2',{class:'studio-title'},W('prompt.design.lines')),
   h(Silhouette,{book,on:st.silhouetteOn,params:st.params,onToggle:()=>update('silhouetteOn',!st.silhouetteOn)}),
   h(FaceDesign,{book,on:st.faceDesignOn,params:st.params,onToggle:()=>update('faceDesignOn',!st.faceDesignOn)})),
  mode==='form'&&!reference&&h('section',{class:'studio-card',id:'appearance-settings'},
   h('div',{class:'studio-actions'},h('h2',{class:'studio-title'},W('prompt.appearance')),
    h('div',{class:'studio-row'},h('button',{id:'randomize',onClick:randomize},W('prompt.random')),
     prevBook&&h('button',{id:'take-prev',onClick:takePrev},W('prompt.prev',{book:prevBook.title})),
     h('button',{id:'reset-params',onClick:()=>update('params',{})},W('prompt.reset')))),
   note(W('prompt.appearance.note')),
   S.IDENTITY_GROUPS.map(group=>h('details',{class:'grp',key:group,open:group==='base'},
    h('summary',null,h('span',null,W('prompt.group.'+group))),
    h('div',{class:'grp-in'},defs.filter(d=>d.group===group).map(d=>h(Param,{key:d.key,d,
     value:st.params[d.key]||'',params:st.params,locked:st.locks[d.key],onValue:v=>setParam(d.key,v),
     onLock:()=>update('locks',{...st.locks,[d.key]:!st.locks[d.key]})})))))),
  mode==='open'?h('section',{class:'studio-card'},h('h2',{class:'studio-title'},W('prompt.scene.settings')),sceneText('custom')):
  h('section',{class:'studio-card'},h('h2',{class:'studio-title'},W('prompt.scene.settings')),
   h('div',null,
    h('button',{type:'button',id:'random-scene',disabled:!Object.keys(R.fields(scene,mode)).some(k=>R.canRandomize(scene,mode,k)),
     onClick:()=>randomScene(null)},W('prompt.scene.random.all')),note(W('prompt.scene.random.help'))),
   sceneSelect('expression','expr',S.EXPRESSION_OPTIONS,'expression'),
   h('div',null,
    mode==='casual'&&h('div',{class:'studio-grid-fields'},
     randomSelect({id:'category',label:W('prompt.category'),value:scene.cat,options:categoryOptions,
      description:S.CAT_KO[scene.cat],
      onChange:v=>set(s=>({...s,scenes:{...s.scenes,casual:{...s.scenes.casual,cat:v,ex:''}}}))},'cat'),
     sceneSelect('example','ex',examples,'example',S.EX_NOTE[scene.ex]||W(scene.ex==='__custom__'?'prompt.help.example.custom':'prompt.help.example')),
     scene.cat==='__custom__'&&h(Text,{id:'category-custom',label:W('prompt.custom'),
      description:W('prompt.help.category.custom'),value:scene.catCustom,onChange:v=>setScene('catCustom',v)}),
     scene.ex==='__custom__'&&h(Text,{id:'example-custom',label:W('prompt.custom'),
      description:W('prompt.help.example.custom'),value:scene.exCustom,onChange:v=>setScene('exCustom',v)})),
    mode==='form'&&h('div',{id:'action-settings'},
     h('h3',{class:'studio-label'},W('prompt.action.settings')),
     h('div',{class:'studio-grid-fields'},
      randomSelect({id:'action-category',label:W('prompt.action.category'),value:action.category,
       options:actionOptions(S.ACTION_CATEGORIES),description:actionCategory?.description||W('prompt.action.category.help'),
       onChange:v=>setAction('category',v)},'action.category'),
      randomSelect({id:'action-example',label:W('prompt.action.example'),value:action.example,
       options:actionOptions(actionCategory?.examples||[]),disabled:!actionCategory,
       description:actionExample?.description||W(actionCategory?'prompt.action.example.help':'prompt.action.example.empty'),
       onChange:v=>setAction('example',v)},'action.example'),
      S.ACTION_CONTROLS.map(control=>randomSelect({key:control.key,id:'action-'+control.key,
       label:control.label,value:action[control.key],options:actionOptions(control.options),
       description:control.options.find(r=>r.key===action[control.key])?.description||control.description,
       onChange:v=>setAction(control.key,v)},'action.'+control.key)))),
    h('div',{class:'studio-grid-fields'},
     sceneSelect('pose','pose',poses,'pose',poseDescription),
     sceneSelect('orientation','orient',S.ORIENTATION_OPTIONS,'orientation',S.ORIENTATION_GUIDES[scene.orient]?.[0]),
     sceneSelect('frame','frame',S.FRAME_OPTIONS,'frame',[W('prompt.help.frame'),S.FRAME_GUIDES[scene.frame]?.[0]].filter(Boolean).join('\n')),
     sceneSelect('lens','lens',S.LENS_OPTIONS,'lens',[W('prompt.help.lens'),S.LENS_GUIDES[scene.lens]?.[0]].filter(Boolean).join('\n')),
     sceneSelect('aspect','aspect',['2:3','3:2','1:1','9:16','16:9'].map(v=>[v,v])),
     h(Text,{id:'camera',label:W('prompt.camera'),value:scene.camera,
      description:W('prompt.help.camera'),onChange:v=>setScene('camera',v)})),
    ['scene','outfit','custom'].map(sceneText),
    mode==='casual'&&h('details',{class:'grp'},h('summary',null,h('span',null,W('prompt.axes'))),
     h('div',{class:'grp-in'},S.LOCAL_AXES.map(k=>randomSelect({key:k,id:'axis-'+k,
      label:S.ADVANCED_LABELS[k][1],value:scene.axes[k]||'AUTO',
      description:S.SCENE_AXIS_GUIDES[k]?.[scene.axes[k]]?.[0]||S.ADV_AXIS[k],
      options:S.ADVANCED_OPTIONS[k].map(v=>[v,v==='AUTO'?W('prompt.auto'):(S.ADV_VAL[k]?.[v]||v)]),
      onChange:v=>setScene('axes',{...scene.axes,[k]:v})},'axes.'+k)))))),
  h('section',{class:'studio-card'},
   h('div',{class:'studio-actions'},h('strong',null,W('prompt.output')+' ',h('small',null,W('prompt.count',{n:result.text.length,w:P.words(result.text)}))),
    h('div',{class:'studio-row'},
     h('button',{id:'copy-prompt',class:'studio-copy',disabled:!result.text,onClick:()=>copyText(result.text,'prompt.copied')},W('prompt.copy')),
     h('button',{id:'export-record',disabled:!result.text,onClick:exportRecord},W('prompt.record')))),
   h('p',{role:'status',class:'studio-status'},result.error||notice),
   h('textarea',{id:'prompt-output',class:'studio-output','aria-label':W('prompt.output'),readOnly:true,
    value:result.text,ref:outputRef}),
   record&&h('details',{class:'studio-record',open:true},h('summary',null,W('prompt.record.title',{path:recordName(book.key,st)})),
    h('textarea',{id:'record-output',class:'studio-output','aria-label':W('prompt.record'),readOnly:true,value:record})),
   note(W(storageError?'prompt.storage.failed':'prompt.local.note'))),
  h('section',{class:'studio-card'},h(Gallery,{entry:images[book.key],style:st.style,form:st.form,mode})));
}
/* 시범 자리 — 설계표의 pilot(폼 하나 + 개방 하나) */
function isPilot(book,stage,mode){const p=book.pilot;return !!p&&(mode==='open'?p.open===stage:p.form===stage)}
function App(){
 const [data,setData]=useState(null),[error,setError]=useState(''),[key,setKey]=useState(''),
  [query,setQuery]=useState(''),[genre,setGenre]=useState('');
 useEffect(()=>{
  let live=true;
  Promise.all([fetch('data/book-design.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('book-design: '+r.status);return r.json()}),
   fetch('data/style.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('style: '+r.status);return r.json()}),
   fetch('data/img.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{img:{}}).catch(()=>({img:{}}))]).then(([design,style,images])=>{
   if(!live)return;
   A.setShards(images);
   const fk=object(object(design.vocab).form_key),defs={};
   for(const stage of Object.keys(fk))defs[fk[stage]]={stage};
   const styles={};
   for(const [k,v] of Object.entries(object(style.styles)))if((v.versions||[]).length)styles[k]={name:String(v.name||k).split(' — ')[0],current:v.current||v.versions[v.versions.length-1].v,versions:v.versions};
   const books=design.books||[],requested=new URLSearchParams(location.search).get('book')||saved.last;
   const ctx={defs,formKeys:Object.keys(defs),firstForm:Object.keys(defs)[0],styles,defaultStyle:style.default&&styles[style.default]?style.default:Object.keys(styles)[0],books};
   setKey(books.some(b=>b.key===requested)?requested:books[0].key);
   setData({ctx,books,genres:object(design.vocab).genre||[],images:images.img||{}});
  }).catch(e=>{if(live)setError(W('ui.error',{message:e.message}))});
  return()=>{live=false};
 },[]);
 const filtered=data?data.books.filter(b=>(!genre||b.genre===genre)&&
  (!query||[b.title,b.key,b.author].join(' ').toLowerCase().includes(query.trim().toLowerCase()))):[];
 const book=data?.books.find(b=>b.key===key);
 const choices=book&&!filtered.includes(book)?[book,...filtered]:filtered;
 /* ✓ 여섯 자리 다 · ◐ 일부 · · 아직(건담 생성기의 표시) — 가장 많이 채운 화풍 기준 */
 const mark=b=>{const p=FILTER.best(data.images[b.key],data.ctx.defs).prog;return p.ok?'✓':p.done?'◐':'·'};
 return h('div',null,
  h(WorkspaceHeader,{page:'prompt'}),
  error?h('div',null,h('p',{role:'alert'},error),h('button',{onClick:()=>location.reload()},W('prompt.retry'))):
  !data?h('p',{role:'status'},W('ui.loading')):
  h('div',{class:'studio-grid'},h('aside',{class:'studio-source'},
   h('h2',{class:'studio-title'},W('prompt.source')),
   h('div',{class:'source-fields'},h(Text,{id:'search',label:W('ui.search'),value:query,onChange:setQuery}),
    h(Select,{id:'genre',label:W('prompt.genre'),value:genre,
     options:[['',W('dex.filter.all')],...data.genres.filter(g=>data.books.some(b=>b.genre===g)).map(g=>[g,g])],onChange:setGenre})),
   h(Select,{id:'source',label:W('prompt.source'),value:key,
    options:choices.map(b=>[b.key,mark(b)+' '+b.title]),onChange:setKey}),
   note(W('prompt.source.count',{n:filtered.length})),
   book&&note([book.author,book.genre,book.era,book.region].filter(Boolean).join(' · '),{id:'source-note'})),
   h('main',{class:'studio-main'},
    book&&h(Editor,{key:book.key,book,ctx:data.ctx,images:data.images}))));
}
render(h(App),document.getElementById('app'));
window.AtelierFresh&&window.AtelierFresh.watch();
