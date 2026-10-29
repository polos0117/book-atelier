/* 장면만 무작위 — pkm-atelier 의 같은 파일에서 왔다. 폼 초상(form)은 연출 갈래, 일상(casual)은 일상 갈래. 잠근 예시의 갈래는 안 바꾼다. */
(function(root){
 'use strict';
 const S=root.AtelierSpec;
 const concrete=values=>values.filter(v=>v&&v!=='AUTO'&&v!=='__custom__'&&!v.startsWith('auto_'));
 const keys=rows=>concrete(rows.map(r=>r[0]));
 function value(scene,key){
  const [group,name]=key.split('.');
  return name?scene[group]?.[name]:scene[key];
 }
 function fields(scene,mode){
  if(!['form','casual'].includes(mode))return {};
  const result={};
  if(mode==='form'){
   result['action.category']=S.ACTION_CATEGORIES.map(r=>r.key);
   result['action.example']=(S.ACTION_CATEGORIES.find(r=>r.key===scene.action?.category)?.examples||[]).map(r=>r.key);
   for(const c of S.ACTION_CONTROLS)result['action.'+c.key]=c.options.map(r=>r.key);
  }else{
   result.cat=keys(S.CATS.filter(r=>r[4]!=='m'));
   result.ex=keys((S.EXAMPLE_MAP[scene.cat]||[]).filter(r=>r[4]!=='m'));
   // 시대(원작 시대)는 랜덤에 넣지 않는다 — 일부러 고르는 연출이고, 랜덤이 고르면 현대·미래풍 예시와 부딪혔다(2026-10-29, game 젤다 일상2)
   for(const k of S.LOCAL_AXES)result['axes.'+k]=concrete(S.ADVANCED_OPTIONS[k]);
  }
  return {...result,expr:keys(S.EXPRESSION_OPTIONS),
   pose:mode==='form'?S.ACTION_POSES.map(r=>r.key):keys(S.POSE_OPTIONS),
   orient:keys(S.ORIENTATION_OPTIONS),frame:keys(S.FRAME_OPTIONS),lens:keys(S.LENS_OPTIONS),
   aspect:['2:3','3:2','1:1','9:16','16:9']};
 }
 function canRandomize(scene,mode,key){
  const locks=scene.randomLocks||{};
  if(locks[key])return false;
  if((key==='cat'&&locks.ex)||(key==='action.category'&&locks['action.example']))return false;
  return (fields(scene,mode)[key]||[]).some(v=>v!==value(scene,key));
 }
 function randomize(scene,mode,key=null,rng=Math.random){
  if(!['form','casual'].includes(mode))return scene;
  const next={...scene,action:{...scene.action},axes:{...scene.axes},randomLocks:{...scene.randomLocks}};
  function assign(k,v){const [group,name]=k.split('.');if(name)next[group][name]=v;else next[k]=v;}
  // Dependency order is defined by fields(): choose a category before its example.
  for(const k of key?[key]:Object.keys(fields(next,mode))){
   if(!canRandomize(next,mode,k))continue;
   const options=fields(next,mode)[k].filter(v=>v!==value(next,k));
   assign(k,options[Math.min(options.length-1,Math.max(0,Math.floor(rng()*options.length)))]);
   if(k==='cat')next.ex='';
   if(k==='action.category')next.action.example='';
  }
  return next;
 }
 root.AtelierSceneRandom={fields,value,canRandomize,randomize};
})(window);
