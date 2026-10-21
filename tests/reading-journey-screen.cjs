const assert=require('node:assert/strict');
const {start,FOLD}=require('./browser-harness.cjs');
const fs=require('node:fs'),path=require('node:path');
const viewports=[{width:1440,height:1000},FOLD.inner,FOLD.cover,{width:390,height:844},{width:882,height:344}];
const saved=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('book_reading_v1')||'{}').alice);
const stage=(p,key)=>p.waitForFunction(k=>document.querySelector('.reading-book')?.dataset.chapter===k,key);
const returned=p=>p.waitForFunction(()=>!document.querySelector('.reading-dialog')&&!new URLSearchParams(location.search).has('open'));
(async()=>{const h=await start();try{
 for(const viewport of viewports){
  const a=await h.open('index.html',{viewport}),p=a.page;
  await p.waitForSelector('.shelf-book');await p.emulateMedia({reducedMotion:'reduce'});
  const spine=p.locator('.shelf-book[data-key="alice"]');await spine.scrollIntoViewIfNeeded();
  const before=await p.locator('.wrap').evaluate(e=>e.scrollTop);
  await spine.click();await stage(p,'begin');
  assert.equal(await p.locator('.reading-resume').count(),0,'first visit is not a resume');
  for(const key of ['begin','middle','end']){
   await stage(p,key);
   for(const sel of ['.reading-art','.reading-controls','.reading-next']){
    const r=await p.locator(sel).boundingBox();assert(r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width+1&&r.y+r.height<=viewport.height+1,sel+' visible '+JSON.stringify(viewport));
   }
   const image=p.locator('.reading-art img');
   if(await image.count()){
    await image.evaluate(e=>e.decode());
    await p.waitForFunction(()=>{const e=document.querySelector('.reading-art img');return e&&getComputedStyle(e).opacity==='1';});
    const bounds=await image.boundingBox(),art=await p.locator('.reading-art').boundingBox();
    assert(bounds.width>100&&bounds.height>100,'artwork has visible area');
    assert(bounds.x>=art.x&&bounds.y>=art.y&&bounds.x+bounds.width<=art.x+art.width+1&&bounds.y+bounds.height<=art.y+art.height+1,'full image stays inside artwork area');
    assert.equal(await image.evaluate(e=>getComputedStyle(e).objectFit),'contain');
   }
   if(key==='middle'){
    await p.locator('.reading-mode').click();assert.match(await p.locator('.reading-art img').getAttribute('src'),/middle_open/);
    assert.equal(await p.locator('.reading-prelude').count(),0,'reduced motion: sentence and image together');
    await p.locator('.reading-bookmark').click();assert.equal(await p.locator('.reading-bookmark').getAttribute('aria-pressed'),'true');
    await p.reload();await stage(p,'middle');assert.equal(await p.locator('.reading-mode').getAttribute('aria-pressed'),'true','reload keeps scene');
    assert.equal(await p.locator('.reading-bookmark').getAttribute('aria-pressed'),'true','reload keeps bookmark');
    await p.locator('.reading-return-button').click();await returned(p);assert.equal(await p.evaluate(()=>document.activeElement.dataset.key),'alice');
    assert.notEqual((await saved(p)).completed,true,'early return is not completion');
    await spine.click();await stage(p,'middle');assert(await p.locator('.reading-resume').isVisible());
   }
   assert(await p.evaluate(()=>{const a=document.querySelector('.reading-mosaic'),img=document.querySelector('.reading-art img');return a&&img&&AtelierImg.imgURL(new URL(a.href).searchParams.get('file'))===img.src;}),'mosaic follows current chapter and scene');
   if(process.env.READING_QA&&key==='end')await p.screenshot({path:path.join(process.env.READING_QA,'reading-'+viewport.width+'.png')});
   await p.locator('.reading-next').click();
  }
  await p.waitForSelector('.reading-book[data-finished="true"]');
  assert.equal((await saved(p)).completed,true);assert.deepEqual((await saved(p)).seen,[0,1,2]);
  assert.deepEqual((await saved(p)).mark,{chapter:1,mode:'open'});
  await p.locator('.reading-mark-link').click();await stage(p,'middle');assert.equal(await p.locator('.reading-mode').getAttribute('aria-pressed'),'true');
  await p.keyboard.press('ArrowLeft');await stage(p,'begin');await p.keyboard.press('ArrowRight');await stage(p,'middle');
  await p.keyboard.press('Escape');await returned(p);
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.key),'alice');
  assert.equal(await spine.getAttribute('data-read'),'true');assert.match(await p.locator('.bookshelf-receipt').textContent(),/앨리스/);
  assert.equal(await p.locator('.wrap').evaluate(e=>e.scrollTop),before,'shelf position preserved');
  await p.reload();await p.waitForSelector('.shelf-book');assert.equal(await spine.getAttribute('data-read'),'true','completion persists');
  assert.deepEqual(a.errors,[]);assert.deepEqual(await p.evaluate(()=>AtelierWords.missing()),[]);await a.close();
 }
 // Motion on: the room light follows the stage, the scene sentence leads the 명장면, the spine ribbon says where the reader stopped.
 const alice=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','book-design.json'),'utf8')).books.find(b=>b.key==='alice');
 const m=await h.open('index.html',{viewport:{width:390,height:844}}),mp=m.page;
 await mp.waitForSelector('.shelf-book');await mp.locator('.shelf-book[data-key="alice"]').click();await stage(mp,'begin');
 const tint=()=>mp.evaluate(()=>{const e=document.querySelector('.reading-mood'),c=getComputedStyle(e);return {mood:e.dataset.mood,base:e.style.getPropertyValue('--mood-base'),light:e.style.getPropertyValue('--mood-light'),shown:c.getPropertyValue('--mood-base')};});
 await mp.waitForTimeout(700);const t1=await tint();
 await mp.locator('.reading-next').click();await stage(mp,'middle');await mp.waitForTimeout(700);const t2=await tint();
 assert.equal(t1.mood,'begin-base');assert.equal(t2.mood,'middle-base');
 assert.notEqual(t1.base,t2.base,'stage tint differs');assert.notEqual(t1.shown,t2.shown,'room light changed on screen');
 await mp.locator('.reading-mode').click();
 await mp.waitForSelector('.reading-prelude');
 assert.equal(await mp.locator('.reading-prelude p').textContent(),alice.opens['전개'].scene,'scene sentence first');
 assert.equal(await mp.locator('.reading-image-page').evaluate(e=>getComputedStyle(e).opacity),'0','image waits behind the sentence');
 assert.equal(await mp.locator('.reading-prelude').getAttribute('aria-hidden'),'true','caption stays the spoken text');
 await mp.waitForSelector('.reading-prelude',{state:'detached'});
 await mp.waitForFunction(()=>{const e=document.querySelector('.reading-image-page');return !e.dataset.prelude&&getComputedStyle(e).clipPath==='none'&&!document.querySelector('.am-ghost');});
 await mp.waitForSelector('.reading-motion-layer .am-particles');
 const t3=await tint();assert.equal(t3.mood,'middle-open');assert.notEqual(t3.light,t2.light,'명장면 light is stronger');
 assert.equal(await mp.evaluate(()=>document.activeElement.tagName),'H3','focus on the page heading');
 // Enter skips straight to the revealed scene.
 await mp.locator('.reading-mode').click();await stage(mp,'middle');await mp.waitForFunction(()=>!document.querySelector('.am-ghost'));
 await mp.locator('.reading-mode').click();await mp.waitForSelector('.reading-prelude');
 await mp.locator('.reading-passage h3').focus();await mp.keyboard.press('Enter');
 assert.equal(await mp.locator('.reading-prelude').count(),0,'Enter skips');
 assert.deepEqual(await mp.locator('.reading-image-page').evaluate(e=>[getComputedStyle(e).opacity,getComputedStyle(e).clipPath]),['1','none'],'skip lands on the revealed scene');
 await mp.keyboard.press('Escape');await returned(mp);
 const rib=mp.locator('.shelf-book[data-key="alice"] .spine-ribbon');
 assert.equal(await rib.getAttribute('aria-label'),'전개 명장면까지 읽음');assert.match(await rib.textContent(),/^전/);
 assert.equal(await rib.getAttribute('data-scene'),'true');
 assert.match(await mp.locator('.shelf-book[data-key="alice"]').getAttribute('aria-label'),/전개 명장면까지 읽음$/,'spine button carries the progress');
 await mp.locator('.shelf-book[data-key="alice"]').click();await stage(mp,'middle');await mp.locator('.reading-previous').click();await stage(mp,'begin');
 await mp.locator('.reading-bookmark').click();await mp.keyboard.press('Escape');await returned(mp);
 assert.equal(await rib.getAttribute('aria-label'),'발단에 책갈피','bookmark wins over the last page');assert.equal(await rib.textContent(),'발');
 assert.deepEqual(m.errors,[]);await m.close();
 const lower=await h.open('index.html',{viewport:FOLD.cover}),lp=lower.page;
 await lp.waitForSelector('.shelf-book');await lp.emulateMedia({reducedMotion:'reduce'});
 const last=lp.locator('.shelf-book').last();await last.scrollIntoViewIfNeeded();
 const scroll=await lp.locator('.wrap').evaluate(e=>e.scrollTop);assert(scroll>0,'lower shelf needs scrolling');
 await last.click();await lp.locator('.reading-next').click();await lp.goBack();await returned(lp);
 assert.equal(await lp.locator('.wrap').evaluate(e=>e.scrollTop),scroll,'back preserves lower shelf scroll');
 assert.equal(await lp.evaluate(()=>document.activeElement.dataset.key),await last.getAttribute('data-key'));await lower.close();
 // Unavailable artwork and denied storage must not prevent a complete journey.
 const a=await h.open('index.html',{viewport:FOLD.cover,files:{'data/img.json':{}},init:()=>{Storage.prototype.setItem=function(){throw new DOMException('blocked','SecurityError')};}}),p=a.page;
 await p.waitForSelector('.shelf-book');await p.emulateMedia({reducedMotion:'reduce'});await p.locator('.shelf-book').first().click();
 for(let i=0;i<3;i++){assert(await p.locator('.reading-art .shelf-no-art').isVisible());await p.locator('.reading-next').click();}
 await p.waitForSelector('.reading-book[data-finished="true"]');await p.locator('.reading-return-button').click();await returned(p);assert.deepEqual(a.errors,[]);await a.close();
 console.log('PASS reading journey: 5 viewports, all chapters, scene, bookmark, reload, resume, completion, return focus/scroll, missing art and blocked storage, stage light, scene sentence before image (Enter skips), ribbon progress');
}finally{await h.stop();}})().catch(e=>{console.error(e);process.exitCode=1;});
