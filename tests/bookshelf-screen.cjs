const assert=require('node:assert/strict');
const {start,FOLD}=require('./browser-harness.cjs');
const boxes=[{width:1440,height:1000},FOLD.inner,{width:390,height:844},FOLD.cover,{width:882,height:344}];
(async()=>{
 const h=await start();try {
  const a=await h.open('index.html',{viewport:boxes[0]}),p=a.page;
  await p.waitForSelector('.shelf-book');
  const keys=await p.locator('.shelf-book').evaluateAll(es=>es.map(e=>e.dataset.key));
  assert.equal(keys.length,12);assert.equal(await p.locator('.hall-carousel').count(),0);
  await p.reload();await p.waitForSelector('.shelf-book');
  assert.deepEqual(await p.locator('.shelf-book').evaluateAll(es=>es.map(e=>e.dataset.key)),keys,'stable shelf order');
  for(const theme of ['sunlit','moonlit','hanok']) {
   await p.evaluate(t=>AtelierAppearance.set('theme',t),theme);
   for(const viewport of boxes) {
    await p.setViewportSize(viewport);
    await p.locator('.wrap').evaluate(e=>e.scrollTop=0);
    assert(await p.evaluate(()=>document.body.scrollWidth<=innerWidth),'no page overflow');
    const button=p.locator('.shelf-book').first();
    const key=await button.getAttribute('data-key');
    const b=await button.boundingBox();assert(b.width>=44&&b.height>=44,'touch target');
    await button.click();
    await p.waitForSelector('.reading-dialog[open]');await p.waitForTimeout(510);
    assert.equal(await p.locator('.reading-book').getAttribute('data-book'),key);
    const r=await p.locator('.reading-book').boundingBox();
    assert(r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width+1&&r.y+r.height<=viewport.height+1,'open book fits viewport');
    assert(await p.locator('.reading-detail').getAttribute('href')==='dex.html?book='+key);
    for(let i=0;i<5;i++){await p.keyboard.press('Tab');assert(await p.evaluate(()=>!!document.activeElement.closest('.reading-dialog')),'dialog contains focus');}
    if(await p.locator('.reading-mode').count()) {
     await p.locator('.reading-mode').click();
     assert.equal(await p.locator('.reading-mode').getAttribute('aria-pressed'),'true');
     assert.match(await p.locator('.reading-art img').getAttribute('src'),/_open_/);
     await p.locator('.reading-mode').click();
    }
    await p.keyboard.press('Escape');await p.waitForSelector('.reading-dialog',{state:'detached'});
    assert.equal(await p.evaluate(()=>document.activeElement.dataset.key),key,'focus returns to the book');
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
  assert.deepEqual(a.errors,[]);assert.deepEqual(await p.evaluate(()=>AtelierWords.missing()),[]);
  await a.close();
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
