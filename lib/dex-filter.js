/* 서가 목록 고르기 — 화면 없이 자료만. pkm-atelier 의 lib/dex-filter.js 에서 왔다.
   고른 화풍·폼·컷은 다른 화풍·컷으로 되돌아가지 않는다(없으면 없는 것이다).

   폼 열쇠는 data/book-design.json 의 vocab.form_key(begin·middle·end), 개방은 '<폼>_open'.
   그림 자리(art): '' 전체 · has 그림 있음 · none 그림 없음 · left 빈 자리 있음(작업 현황 — 건담 도감의 '남은 것')
     · new 새 그림만(지난번 들른 뒤 등록된 그림 — st.fresh 가 있을 때만)

   최근 추가·새 표 — 날짜는 img.json 의 added(등록기가 적는다). 날짜 없는 그림은 어느 쪽에도 안 뜬다.
   "지난번 들른 때" 는 시계가 아니라 자료로 적는다: 그때 자료의 가장 늦은 날짜(upTo)와 그날 날짜의 그림(seen).
   등록기의 오늘(UTC)과 보는 사람의 오늘이 하루 어긋나도, 같은 날 두 번 들러도 빠지거나 겹치지 않는다 */
(function(root){
  'use strict';
  var IMG=root.AtelierImg;
  var OPEN='_open';
  var CUTS=['auto','all','portrait','open','action','casual','extra'];
  var ARTS=['','has','none','left','new'];
  var RECENT_DAYS=7,RECENT_MAX=24;
  function defaults(){return {q:'',style:'',genre:'',form:'',cut:'auto',art:''}}
  /* 폼 셋 → 폼 셋 + 개방 셋. 서가의 그림 자리 여섯이 이 차례다 */
  function forms(defs){
    var normal=Object.keys(defs||{});
    return normal.concat(normal.map(function(k){return k+OPEN}));
  }
  function isOpen(form){return /_open$/.test(form||'')}
  function baseForm(form){return String(form||'').replace(/_open$/,'')}
  function normalize(raw,st){
    raw=raw&&typeof raw==='object'?raw:{};
    var out=defaults();
    Object.keys(out).forEach(function(k){if(typeof raw[k]==='string')out[k]=raw[k]});
    if(CUTS.indexOf(out.cut)<0)out.cut='auto';
    if(ARTS.indexOf(out.art)<0)out.art='';
    if(st){
      if(!Object.prototype.hasOwnProperty.call(st.styleName||{},out.style))out.style='';
      if(!st.cards.some(function(c){return c.genre===out.genre}))out.genre='';
      if(forms(st.defs).indexOf(out.form)<0)out.form='';
      if(out.art==='new'&&!(st.fresh&&st.fresh.size))out.art='';
    }
    if(['casual','extra'].indexOf(out.cut)>=0)out.form='';
    /* 폼 초상을 고르고 개방 폼을 고르면 아무것도 없다 — 컷이 폼 쪽을 정한다 */
    if(out.cut==='portrait'&&isOpen(out.form))out.form=baseForm(out.form);
    if(out.cut==='open'&&out.form&&!isOpen(out.form))out.form=out.form+OPEN;
    return out;
  }
  /* 한 책의 그림 전부를 한 줄로 — 화풍마다 폼 초상(개방 포함) → 그 폼의 연출컷 → 일상컷 → 특별컷 */
  function shots(entry,defs){
    var rows=[],bs=IMG.styleMap(entry),order=forms(defs);
    function bucket(b,style){
      function add(file,cut,form,index){
        if(typeof file==='string'&&file)rows.push({file:file,style:style,cut:cut,form:form||'',index:index||0});
      }
      Object.keys(IMG.formMap(b)).sort(function(a,c){return order.indexOf(a)-order.indexOf(c)}).forEach(function(form){
        add(IMG.formOf(b,form).f,isOpen(form)?'open':'portrait',form);
        IMG.formActs(b,form,'f').forEach(function(f,i){add(f,'action',form,i+1)});
      });
      ['casual','extra'].forEach(function(cut){IMG.cuts(b,cut,'f').forEach(function(f,i){add(f,cut,'',i+1)})});
    }
    Object.keys(bs).forEach(function(style){bucket(bs[style],style)});
    return rows;
  }
  /* 가장 많이 채운 화풍과 그 진척. 화풍을 섞어 견주지 않는다 */
  function best(entry,defs,style){
    var want=forms(defs),out={style:'',prog:IMG.formsDone({},want,'f')};
    IMG.styleKeys(entry||{}).forEach(function(k){
      if(style&&k!==style)return;
      var p=IMG.formsDone(IMG.styleMap(entry)[k],want,'f');
      if(!out.style||p.done>out.prog.done)out={style:k,prog:p};
    });
    return out;
  }
  function matchText(card,q){
    return [card.title,card.key,card.author,card.persona].some(function(s){return String(s||'').toLowerCase().indexOf(q)>=0});
  }
  function select(st,raw){
    var f=normalize(raw,st),q=f.q.trim().toLowerCase(),rows=[];
    st.cards.forEach(function(card){
      if(q&&!matchText(card,q))return;
      if(f.genre&&card.genre!==f.genre)return;
      var entry=st.img[card.key],all=shots(entry,st.defs);
      if(f.art==='new'){all=all.filter(function(s){return st.fresh.has(s.file)});if(!all.length)return;}
      if(f.art==='has'&&!all.length)return;
      if(f.art==='none'&&all.length)return;
      if(f.art==='left'&&best(entry,st.defs,f.style).prog.ok)return;
      var matched=all.filter(function(s){return (!f.style||s.style===f.style)&&(!f.form||s.form===f.form)&&
        (f.cut==='auto'||f.cut==='all'||s.cut===f.cut)});
      if(f.cut==='auto'){
        var top=best(entry,st.defs,f.style),pick=null;
        /* 가장 많이 채운 화풍의 폼 초상 → 그 화풍의 개방 → 그 화풍의 아무 컷 → 아무 컷 */
        if(top.style)pick=matched.find(function(s){return s.style===top.style&&s.cut==='portrait'})||
          matched.find(function(s){return s.style===top.style&&s.cut==='open'})||
          matched.find(function(s){return s.style===top.style});
        pick=pick||matched[0]||null;
        if(pick)rows.push(Object.assign({card:card},pick));
        else if(!f.style&&!f.form&&f.art!=='has'&&f.art!=='new')rows.push({card:card,file:null,style:'',cut:'auto',form:'',index:0});
      }else matched.forEach(function(s){rows.push(Object.assign({card:card},s))});
    });
    return rows;
  }
  /* 'YYYY-MM-DD' 에서 n 날 앞. 달력 셈만 — 시각대는 안 탄다 */
  function dayBefore(day,n){
    var t=Date.parse(day+'T00:00:00Z');
    return isNaN(t)?'':new Date(t-n*864e5).toISOString().slice(0,10);
  }
  /* 최근 추가 — 오늘 포함 days 날 안에 등록된 그림, 새 날짜부터 max 장. 같은 날이면 설계표 차례·그 책의 그림 차례 */
  function recent(st,added,today,days,max){
    var from=dayBefore(today,(days||RECENT_DAYS)-1),rows=[];
    if(!from)return rows;
    st.cards.forEach(function(card){
      shots(st.img[card.key],st.defs).forEach(function(s){
        var d=added&&added[s.file];
        if(d&&d>=from&&!rows.some(function(r){return r.file===s.file}))rows.push(Object.assign({card:card,added:d},s));
      });
    });
    return rows.map(function(r,i){return [r,i]}).sort(function(a,b){
      return a[0].added<b[0].added?1:a[0].added>b[0].added?-1:a[1]-b[1];
    }).map(function(x){return x[0]}).slice(0,max||RECENT_MAX);
  }
  /* 들른 표 — 지금 자료의 가장 늦은 날짜와 그날의 그림. 다음에 들렀을 때 이것보다 늦게 적힌 것이 "새" 다 */
  function visitMark(added){
    var up='',k;
    for(k in added||{})if(added[k]>up)up=added[k];
    return {upTo:up,seen:Object.keys(added||{}).filter(function(f){return up&&added[f]===up}).sort()};
  }
  /* 지난 들른 표 뒤에 등록된 그림. 표가 없으면(처음 왔다) 아무것도 새것이 아니다 */
  function freshSince(added,mark){
    var out=new Set(),k,seen;
    if(!mark||typeof mark!=='object'||typeof mark.upTo!=='string')return out;
    seen=new Set(Array.isArray(mark.seen)?mark.seen:[]);
    for(k in added||{})if(added[k]>mark.upTo||(added[k]===mark.upTo&&!seen.has(k)))out.add(k);
    return out;
  }
  root.AtelierDexFilter={defaults:defaults,forms:forms,isOpen:isOpen,baseForm:baseForm,normalize:normalize,
    shots:shots,best:best,select:select,CUTS:CUTS,ARTS:ARTS,
    recent:recent,visitMark:visitMark,freshSince:freshSince,dayBefore:dayBefore,RECENT_DAYS:RECENT_DAYS,RECENT_MAX:RECENT_MAX};
})(window);
