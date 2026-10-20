/* Room appearance: readable paper surfaces, persisted scenery and preserved legacy shelves. */
const assert=require('node:assert/strict'),{start,FOLD}=require('./browser-harness.cjs');
const luminance=hex=>{const c=hex.trim().slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
(async()=>{
 const harness=await start();
 try{
  const a=await harness.open('index.html',{viewport:{width:1440,height:1000},init:()=>{
   if(!sessionStorage.getItem('room-seeded')){
    localStorage.setItem('atelier_theme_v1','moss');
    localStorage.setItem('book_hall_v1',JSON.stringify({moss:['alice','kosmos'],ember:['hamlet']}));
    sessionStorage.setItem('room-seeded','1');
   }
  }}),p=a.page;
  await p.waitForSelector('.room-preview');
  assert.deepEqual(await p.evaluate(()=>window.AtelierAppearance.get()),{theme:'sunlit',background:'on',density:'compact'});
  assert.deepEqual(await p.evaluate(()=>window.AtelierImg.hallPicks()),['alice','kosmos']);
  assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('book_hall_v1'))),{moss:['alice','kosmos'],ember:['hamlet'],sunlit:['alice','kosmos']});
  assert.equal(await p.evaluate(()=>localStorage.getItem('atelier_theme_v1')),'moss','other ateliers retain their theme');
  assert.deepEqual(await p.evaluate(()=>window.AtelierAppearance.themes),['sunlit','moonlit','hanok']);
  for(const theme of ['sunlit','moonlit','hanok']) {
  await p.locator('.room-choice').filter({hasText:await p.evaluate(t=>W('theme.'+t),theme)}).click();
  assert.equal(await p.locator('.room-choice[aria-pressed="true"]').innerText(),await p.evaluate(t=>W('theme.'+t),theme));
  const colors=await p.evaluate(()=>{const s=getComputedStyle(document.documentElement),out={};for(const k of ['bg','card','card2','text','muted','accent','accent-soft','on-accent','deck'])out[k]=s.getPropertyValue('--'+k).trim();return out;});
  for(const [fg,bg] of [['text','bg'],['text','card'],['muted','bg'],['muted','card2'],['accent','accent-soft'],['on-accent','accent']])assert(contrast(colors[fg],colors[bg])>=4.5,fg+'/'+bg+': '+contrast(colors[fg],colors[bg]));
  assert.equal(await p.locator('meta[name="theme-color"]').getAttribute('content'),colors.deck);
  assert.equal(await p.locator('.crest-name').innerText(),await p.evaluate(t=>W('theme.'+t),theme));
  }
  await p.evaluate(()=>window.AtelierAppearance.set('theme','sunlit'));
  await p.locator('.room-background-toggle').click();
  assert.equal(await p.evaluate(()=>document.documentElement.dataset.background),'off');
  await p.evaluate(()=>window.AtelierImg.setHallPicks([]));
  await p.reload();await p.waitForSelector('.room-preview');
  assert.deepEqual(await p.evaluate(()=>window.AtelierImg.hallPicks()),[],'empty new shelf must not be replaced by old picks');
  for(const [file,ready] of [['dex.html','.grid .cell'],['prompt.html','#prompt-output'],['duel.html','.duel-screen'],['index.html','.room-preview']]){
   await p.goto(harness.base+'/'+file);await p.waitForSelector(ready);
   assert.equal(await p.evaluate(()=>document.documentElement.dataset.background),'off','background preference persists');
   const nav=await p.locator('.workspace-nav a').evaluateAll(es=>es.map(e=>({href:e.getAttribute('href'),current:e.getAttribute('aria-current')})));
   assert.deepEqual(nav.map(x=>x.href),['index.html','dex.html','prompt.html','duel.html']);
   assert.deepEqual(nav.filter(x=>x.current==='page').map(x=>x.href),[file]);
   const before=file==='prompt.html'?await p.locator('#prompt-output').inputValue():null;
   for(const theme of ['sunlit','moonlit','hanok']) {
   await p.evaluate(t=>window.AtelierAppearance.set('theme',t),theme);
   await p.reload();await p.waitForSelector(ready);
   assert.equal(await p.evaluate(()=>document.documentElement.dataset.theme),theme,'room persists after reload');
   for(const viewport of [FOLD.cover,{width:390,height:844},FOLD.inner,{width:1440,height:1000},{width:844,height:390}]){
    await p.setViewportSize(viewport);
    if(!await p.locator('.appearance-panel').count())await p.locator('.appearance-toggle').click();
    for(const setting of ['on','off']){
     await p.getByLabel('배경',{exact:true}).selectOption(setting);
     assert.equal(await p.evaluate(()=>document.documentElement.dataset.background),setting);
     if(setting==='on') {
      const bg=await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--room-image'));
      const slug={sunlit:'sunlit-library',moonlit:'moonlit-archive',hanok:'quiet-study'}[theme];
      assert(bg.includes(slug+(viewport.width<=599?'-small':'')+'.webp'),'correct responsive room image');
     }
     if(setting==='off')assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--room-image').trim()),'none');
    }
    await p.getByRole('combobox',{name:'공간',exact:true}).selectOption(theme);
    const roomRect=await p.getByRole('combobox',{name:'공간',exact:true}).boundingBox();assert(roomRect.x>=0&&roomRect.x+roomRect.width<=viewport.width+1,'visible room selector');
    const rect=await p.getByLabel('배경',{exact:true}).boundingBox();assert(rect.x>=0&&rect.x+rect.width<=viewport.width+1,'visible background selector');
    assert(await p.evaluate(()=>document.body.scrollWidth<=innerWidth),'no horizontal overflow');
    assert(await p.evaluate(()=>(document.querySelector('.collection-scroll')||document.querySelector('.wrap')).clientHeight>100),'usable scroll area');
    if(before)assert.equal(await p.locator('#prompt-output').inputValue(),before,'appearance does not change prompt');
    await p.keyboard.press('Escape');
    assert.equal(await p.evaluate(()=>document.activeElement.className),'appearance-toggle','Escape returns focus to settings');
   }
  }
  }
  assert.deepEqual(a.errors,[]);assert.deepEqual(await p.evaluate(()=>window.AtelierWords.missing()),[]);
  await a.close();console.log('PASS room theme: AA text contrast, legacy shelf migration, no cross-atelier mutation, persisted background, 3 rooms x 4 pages x 5 viewports');
 }finally{await harness.stop()}
})().catch(e=>{console.error(e);process.exitCode=1});
