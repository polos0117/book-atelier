/* Tab changes must preserve the shared header's geometry, including native scrollbars. */
const assert=require('node:assert/strict'),{start,FOLD}=require('./browser-harness.cjs');
const selectors=['.workspace-heading','.workspace-heading h1','.workspace-nav',
 '.workspace-nav a:nth-child(1)','.workspace-nav a:nth-child(2)','.workspace-nav a:nth-child(3)',
 '.appearance-controls','.appearance-toggle'];
/* 테마·밀도·머리 조작은 ⚙ 패널 안에 있다 — 누르기 전에 연다 */
const settings=async p=>{if(!await p.locator('.appearance-panel').count())await p.locator('.appearance-toggle').click();await p.waitForSelector('.appearance-panel');};
async function geometry(p){
 return p.evaluate(ss=>Object.fromEntries(ss.map(s=>{
  const e=document.querySelector(s),r=e.getBoundingClientRect();
  return [s,{x:r.x,y:r.y,width:r.width,height:r.height,visible:getComputedStyle(e).display!=='none'}];
 })),selectors);
}
function same(actual,expected,label){
 for(const s of selectors){
  assert.equal(actual[s].visible,expected[s].visible,label+' '+s+' visibility');
  if(!expected[s].visible)continue;
  // Titles have different text lengths; their starting point and line height still agree.
  for(const k of s.endsWith('h1')?['x','y','height']:['x','y','width','height'])
   assert(Math.abs(actual[s][k]-expected[s][k])<=1,`${label} ${s} ${k}: ${actual[s][k]} vs ${expected[s][k]}`);
 }
}
(async()=>{
 const h=await start();
 try{
  for(const [viewport,mobile] of [[FOLD.cover,true],[FOLD.inner,true],
   [{width:1280,height:900},false],[{width:1920,height:1080},false],[{width:882,height:344},true]]){
   const a=await h.open('index.html',{viewport,mobile}),p=a.page;
   try{
    for(const density of ['compact','relaxed']){
     await p.goto(h.base+'/index.html');await p.waitForSelector('.workspace-nav');
     await p.evaluate(d=>window.AtelierAppearance.set('density',d),density);
     const reference=await geometry(p);
     for(const [file,ready] of [['dex.html','.grid .cell'],['prompt.html','#prompt-output'],['duel.html','.duel-screen'],['index.html','.theme-card']]){
      /* 서재 탭은 덮개에서 숨는다 — 집으로는 문양·제목 링크로 간다 */
      const tab=p.locator(`.workspace-nav a[href="${file}"]`);
      await (file==='index.html'&&!await tab.isVisible()?p.locator('a.workspace-title'):tab).click();
      await p.waitForSelector(ready);
      same(await geometry(p),reference,`${viewport.width} ${density} ${file}`);
      assert(await p.evaluate(()=>document.body.scrollWidth<=innerWidth),'horizontal overflow');
      const scroll=p.locator(file==='dex.html'?'.collection-scroll':'.wrap').first();
      assert((await scroll.boundingBox()).height>100,file+' usable scroll viewport');
      /* 책이 다섯뿐이라 넓은 화면에서는 굴릴 것이 없다 — 굴릴 수 있을 때만 본다 */
      if(file==='dex.html'&&await scroll.evaluate(e=>e.scrollHeight-e.clientHeight>40)){
       await scroll.evaluate(e=>{e.scrollTop=300});
       await p.waitForSelector('main.dex-scrolled');
       same(await geometry(p),reference,'dex scroll keeps navigation in place');
      }
     }
    }
    /* 덮개(599px 이하)에서는 항해가 한 줄 — 서재 탭은 숨고 문양·제목이 서재 링크. 넓은 화면에서는 탭 전부 */
    await p.goto(h.base+'/prompt.html');await p.waitForSelector('#prompt-output');
    const navH=(await p.locator('.workspace-nav').boundingBox()).height,narrow=viewport.width<=599;
    assert(navH<=56,viewport.width+' 항해는 한 줄: '+navH);
    const titleShown=await p.locator('a.workspace-title[href="index.html"]').isVisible();
    assert.equal(await p.locator('.workspace-nav a[href="index.html"]').isVisible(),!narrow||!titleShown,viewport.width+' 서재 탭은 넓은 화면에서만(제목이 숨는 낮은 화면은 예외)');
    assert(titleShown||await p.locator('.workspace-nav a[href="index.html"]').isVisible(),viewport.width+' 집으로 가는 길이 하나는 있다');
    assert(await p.locator('.workspace-nav a[href="dex.html"]').isVisible()&&await p.locator('.workspace-nav a[href="prompt.html"]').isVisible(),viewport.width+' 서가·프롬프트 탭이 보인다');
    for(const a of await p.locator('.workspace-nav a').all()) if(await a.isVisible()) assert(await a.evaluate(e=>e.scrollWidth<=e.clientWidth+1),viewport.width+' 탭 글자가 안 잘린다: '+await a.textContent());
    /* 접기 — 제목이 숨고 항해(와 ⚙)만 남는다. 다음 화면에서도 접힌 채다. 펼치면 돌아온다 */
    await p.goto(h.base+'/index.html');await p.waitForSelector('.workspace-nav');
    const open=await geometry(p);
    await settings(p);await p.locator('.header-fold').click();
    await p.waitForSelector('.workspace-header.folded');
    assert.equal(await p.locator('.workspace-heading').evaluate(e=>getComputedStyle(e).display),narrow?'flex':'none','접으면 제목이 숨는다(덮개는 한 줄로 준다)');
    if(narrow){
     assert((await p.locator('.workspace-heading').boundingBox()).height<=48,viewport.width+' 접은 제목은 한 줄');
     assert(await p.locator('a.workspace-title[href="index.html"]').isVisible(),viewport.width+' 접어도 서재 링크가 있다');
     assert((await p.locator('.workspace-nav').boundingBox()).height<=56,viewport.width+' 접어도 항해는 한 줄');
    }
    assert(await p.locator('.appearance-toggle').isVisible(),'접어도 설정 단추는 남는다');
    assert((await p.locator('.workspace-nav').boundingBox()).y<=open['.workspace-nav'].y,'접으면 항해가 위로 온다 (낮은 화면에서는 이미 제목이 숨어 같다)');
    await p.locator('.workspace-nav a[href="dex.html"]').click();await p.waitForURL(/dex\.html/);await p.waitForSelector('.grid .cell');await p.waitForSelector('.workspace-header.folded');
    assert.equal(await p.locator('.workspace-heading').evaluate(e=>getComputedStyle(e).display),narrow?'flex':'none','다음 화면에서도 접힌 채');
    await settings(p);await p.locator('.header-fold').click();await p.waitForFunction(()=>!document.querySelector('.workspace-header.folded'));
    /* 낮은 화면(max-height:550)에서는 제목이 원래 숨어 있다 — 접기 전 상태로 돌아오면 된다 */
    assert.equal(await p.locator('.workspace-heading').evaluate(e=>getComputedStyle(e).display!=='none'),open['.workspace-heading'].visible,'펼치면 접기 전으로 돌아온다');
    assert.deepEqual(a.errors,[]);
   }finally{await a.close()}
  }
  console.log('PASS header layout: 4 pages, 5 viewport sizes, both densities, stable navigation while scrolling');
 }finally{await h.stop()}
})().catch(e=>{console.error(e);process.exitCode=1});
