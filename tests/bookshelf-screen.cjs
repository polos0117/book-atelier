const assert=require('node:assert/strict');
const {start,FOLD}=require('./browser-harness.cjs');
const fs=require('node:fs');
const design=JSON.parse(fs.readFileSync('data/book-design.json','utf8')),BOOK=Object.fromEntries(design.books.map(b=>[b.key,b]));
const FRAME=(()=>{const g={};new Function('globalThis','window',fs.readFileSync('lib/book-frame.js','utf8'))(g,g);return g.AtelierFrame;})();
const hex=c=>'#'+c.match(/\d+/g).slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join('');
/* 책등 제목 — 한 줄(두 단으로 갈리지 않는다)이고 제목 칸 안에 다 든다(잘리지 않는다) */
const spineFit=p=>p.locator('.spine-title').evaluateAll(es=>es.filter(e=>{const s=e.firstElementChild,c=e.getBoundingClientRect(),b=s.getBoundingClientRect(),f=parseFloat(getComputedStyle(s).fontSize);
 return !(b.height<=c.height+.5&&b.top>=c.top-.5&&b.width<f*1.6&&f>=10);}).map(e=>e.textContent));
const openParam=p=>p.evaluate(()=>new URLSearchParams(location.search).get('open'));
const boxes=[{width:1440,height:1000},FOLD.inner,{width:390,height:844},FOLD.cover,{width:882,height:344}];
(async()=>{
 const h=await start();try {
  const a=await h.open('index.html',{viewport:boxes[0]}),p=a.page;
  await p.waitForSelector('.shelf-book');
  const keys=await p.locator('.shelf-book').evaluateAll(es=>es.map(e=>e.dataset.key));
  assert.equal(keys.length,12);assert.equal(await p.locator('.hall-carousel').count(),0);
  await p.reload();await p.waitForSelector('.shelf-book');
  assert.deepEqual(await p.locator('.shelf-book').evaluateAll(es=>es.map(e=>e.dataset.key)),keys,'stable shelf order');
  /* 책등 빛은 그 책의 팔레트(book-frame.js COVER) — 양장은 가죽 빛 바탕, 한지·죽간은 실·끈이 그 빛 */
  for(const [key,bg,thread,bands] of await p.locator('.shelf-book').evaluateAll(es=>es.map(e=>{const s=e.querySelector('.book-spine'),cs=getComputedStyle(s);
   return [e.dataset.key,cs.backgroundColor,cs.borderLeftColor,getComputedStyle(s,'::before').backgroundColor];}))) {
   const b=BOOK[key],kind=FRAME.kind(b),[cover]=FRAME.of(b).style.match(/#[0-9a-f]{6}/gi);
   if(kind==='hardcover')assert.equal(hex(bg),cover.toLowerCase(),key+' 책등 = 표지 빛');
   if(kind==='hanji')assert.equal(hex(thread),cover.toLowerCase(),key+' 한지 실 = 그 책 빛');
   if(kind==='bamboo')assert.equal(hex(bands),cover.toLowerCase(),key+' 죽간 끈 = 그 책 빛');
  }
  assert(new Set(await p.locator('.book-spine').evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor))).size>=8,'책등 빛이 책마다 다르다');
  for(const theme of ['sunlit','moonlit','hanok']) {
   await p.evaluate(t=>AtelierAppearance.set('theme',t),theme);
   for(const viewport of boxes) {
    await p.setViewportSize(viewport);
    await p.locator('.wrap').evaluate(e=>e.scrollTop=0);
    assert(await p.evaluate(()=>document.body.scrollWidth<=innerWidth),'no page overflow');
    assert.deepEqual(await spineFit(p),[],'spine titles fit on one line '+JSON.stringify(viewport));
    const button=p.locator('.shelf-book').first();
    const key=await button.getAttribute('data-key');
    const b=await button.boundingBox();assert(b.width>=44&&b.height>=44,'touch target');
    await button.click();
    await p.waitForSelector('.reading-dialog[open]');await p.waitForTimeout(510);
    assert.equal(await p.locator('.reading-book').getAttribute('data-book'),key);
    assert.equal(await openParam(p),key,'opened book is in the address (?open=)');
    const r=await p.locator('.reading-book').boundingBox();
    assert(r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width+1&&r.y+r.height<=viewport.height+1,'open book fits viewport');
    assert(await p.locator('.reading-detail').getAttribute('href')==='dex.html?book='+key);
    assert(!(await p.locator('.reading-detail').textContent()).includes('↗'),'internal link has no external-link arrow');
    for(let i=0;i<5;i++){await p.keyboard.press('Tab');assert(await p.evaluate(()=>!!document.activeElement.closest('.reading-dialog')),'dialog contains focus');}
    if(await p.locator('.reading-mode').count()) {
     await p.locator('.reading-mode').click();
     assert.equal(await p.locator('.reading-mode').getAttribute('aria-pressed'),'true');
     assert.match(await p.locator('.reading-art img').getAttribute('src'),/_open_/);
     await p.locator('.reading-mode').click();
    }
    await p.keyboard.press('Escape');await p.waitForSelector('.reading-dialog',{state:'detached'});
    assert.equal(await p.evaluate(()=>document.activeElement.dataset.key),key,'focus returns to the book');
    assert.equal(await openParam(p),null,'closing removes ?open=');
    assert.notEqual(await p.locator('.wrap').evaluate(e=>e.style.overflow),'hidden','page scroll restored');
   }
  }
  await p.setViewportSize(boxes[0]);
  await p.locator('.shelf-book').first().focus();await p.keyboard.press('Enter');
  await p.waitForSelector('.reading-dialog[open]');
  await p.setViewportSize(FOLD.cover);await p.keyboard.press('Escape');
  await p.waitForSelector('.reading-dialog',{state:'detached'});
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.key),keys[0],'focus survives responsive regrouping');
  await p.emulateMedia({reducedMotion:'reduce'});
  await p.locator('.shelf-book').first().click();
  assert.equal(await p.locator('.reading-book').evaluate(e=>getComputedStyle(e).animationName),'none');
  await p.locator('.reading-close').click();await p.waitForSelector('.reading-dialog',{state:'detached'});
  await p.setViewportSize(boxes[0]);await p.locator('.shelf-book').first().click();
  await p.locator('.reading-dialog').click({position:{x:2,y:2}});
  await p.waitForSelector('.reading-dialog',{state:'detached'});
  /* 주소 — 펼친 책은 ?open=. 새로고침해도 그 책, 뒤로 가기면 닫히고(포커스는 책등으로), 앞으로 가기면 다시 펼친다 */
  await p.emulateMedia({reducedMotion:'no-preference'});
  const third=keys[2];
  await p.locator('.shelf-book[data-key="'+third+'"]').click();await p.waitForSelector('.reading-dialog[open]');
  const len=await p.evaluate(()=>history.length)-1;
  await p.reload();await p.waitForSelector('.reading-dialog[open]');
  assert.equal(await p.locator('.reading-book').getAttribute('data-book'),third,'reload keeps the opened book');
  assert.equal(await p.evaluate(()=>history.length),len+1,'reload adds no entry');
  await p.goBack();await p.waitForSelector('.reading-dialog',{state:'detached'});
  assert.equal(await openParam(p),null,'back closes the book');
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.key),third,'back returns focus to the spine');
  await p.goForward();await p.waitForSelector('.reading-dialog[open]');
  assert.equal(await p.locator('.reading-book').getAttribute('data-book'),third,'forward reopens it');
  await p.locator('.reading-close').click();await p.waitForSelector('.reading-dialog',{state:'detached'});
  assert.equal(await openParam(p),null);
  assert.deepEqual(a.errors,[]);assert.deepEqual(await p.evaluate(()=>AtelierWords.missing()),[]);
  await a.close();
  /* 공유한 주소로 바로 — 그 책이 펼쳐지고, 뒤로 가기면 책장 */
  const shared=await h.open('index.html?open=hamlet',{viewport:boxes[2]});
  await shared.page.waitForSelector('.reading-dialog[open]');
  assert.equal(await shared.page.locator('.reading-book').getAttribute('data-book'),'hamlet','shared ?open= opens that book');
  await shared.page.goBack();await shared.page.waitForSelector('.reading-dialog',{state:'detached'});
  assert.equal(await openParam(shared.page),null);assert.deepEqual(shared.errors,[]);
  await shared.close();
  const picked=await h.open('index.html',{store:['book_hall_v1',JSON.stringify({sunlit:['don_quixote','kosmos'],moonlit:['alice']})]});
  await picked.page.waitForSelector('.shelf-book');
  assert.deepEqual(await picked.page.locator('.shelf-book').evaluateAll(es=>es.map(e=>e.dataset.key)),['don_quixote','kosmos']);
  await picked.page.evaluate(()=>AtelierAppearance.set('theme','moonlit'));
  await picked.page.waitForFunction(()=>document.querySelectorAll('.shelf-book').length===1);
  assert.equal(await picked.page.locator('.shelf-book').getAttribute('data-key'),'alice');
  await picked.close();
  const empty=await h.open('index.html',{files:{'data/img.json':{}},viewport:FOLD.cover});
  await empty.page.waitForSelector('.shelf-book');
  await empty.page.locator('.shelf-book').first().click();
  assert(await empty.page.locator('.reading-art .shelf-no-art').isVisible(),'missing art is still readable');
  assert.equal(await empty.page.locator('.reading-mode').count(),0,'no unavailable open toggle');
  await empty.close();
  console.log('PASS bookshelf: 3 rooms x 5 viewports, stable order, per-room picks, open/close/scene, keyboard focus, resize, reduced motion, missing artwork');
 } finally {await h.stop();}
})().catch(e=>{console.error(e);process.exitCode=1});
