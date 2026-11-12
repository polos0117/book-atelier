/* 서가 즐겨찾기 — 상세의 하트가 지금 보이는 그림 한 장을 담고 뺀다(lib/favorites.js, 열쇠 atelier_favorites_v1).
   - 담으면 aria-pressed·하트가 차고, 알림이 뜨고, 칸에 a·key·file·title·sub·thumb·full·link·at 이 맞게 적힌다
   - 그림마다 따로다(같은 책의 다른 폼은 안 담긴 상태), 새것이 앞
   - 새로고침해도 남고, 칸의 link(?book=&pic=)로 오면 그 그림으로 열린다. 목록으로 돌아가면 주소에서 book·pic 이 빠진다
   그림은 tests/fixtures/make-art.py 가 임시 자리에 만든 가짜 그림이다 — 실제 등록기로 짠 img.json 을 준다
   - 「즐겨찾기 n」 이 공방 모음의 /favorites.html 로 간다
   - 저장이 막힌 브라우저에서는 던지지 않고 "못 담았다" 를 알린다
   - 344×882 · 390×844 · 844×390 · 690×829 · 1280×900 에서 누르는 자리 44px, 옆으로 안 넘친다, 초점 고리
   - 크게 보기의 하트(344×882 터치) — 넘겨 보는 그림을 상세와 같은 칸으로 담고 뺀다, 넘기면 그 그림의 상태, 닫으면 상세 하트도 같다,
     알림은 넘기기 단추와 안 겹친다, 위 띠의 이웃 단추와 같은 줄 높이, 저장이 막히면 담긴 척하지 않는다
   lib/favorites.js 는 polos0117.github.io/favorites.js 와 글자 하나 다르지 않아야 한다(옆에 받아 두었으면 견준다).
   ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/dex-favorites.cjs */
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { execFileSync } = require('node:child_process');
const H = require('./browser-harness.cjs');
const ROOT = path.resolve(__dirname, '..');
const KEY = 'atelier_favorites_v1';
const W = (() => { const box = { window: {}, console: { warn() {} } }; require('node:vm').runInNewContext(fs.readFileSync(path.join(ROOT, 'lib/words.js'), 'utf8'), box); return box.window.W; })();

/* 가짜 그림 — 한 화풍에 폼 초상이 둘 넘는 책(나란히 보기에서 다른 그림을 고를 수 있다) */
const art = fs.mkdtempSync(path.join(os.tmpdir(), 'book-fav-'));
const imgjson = execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-art.py'), art]).toString();
const DOC = JSON.parse(imgjson);
const A = Object.keys(DOC.img).filter(n => Object.values(DOC.img[n].byStyle || {}).some(b => Object.values(b.byForm || {}).filter(f => f.f).length >= 2)).sort()[0];
const NAME = ((JSON.parse(fs.readFileSync(path.join(ROOT, 'data/book-design.json'), 'utf8')).books || []).find(b => b.key === A) || {}).title;
const FIX = { imgRoot: art, files: { 'data/img.json': imgjson } };

(async () => {
  const h = await H.start();
  const T = [];
  const add = (n, ok, got) => T.push([n, !!ok, String(got === undefined ? '' : got)]);
  const stored = p => p.evaluate(k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return 'bad'; } }, KEY);
  const bigFile = p => p.evaluate(() => { const i = document.querySelector('.big .zoom img'); return i ? decodeURIComponent(i.getAttribute('src').split('?')[0].split('/').pop()) : ''; });
  const url = n => 'dex.html?book=' + encodeURIComponent(n);
  try {
    const hub = path.resolve(ROOT, '../polos0117.github.io/favorites.js');
    if (fs.existsSync(hub)) add('lib/favorites.js 가 공방 모음의 원본과 같다', fs.readFileSync(hub, 'utf8') === fs.readFileSync(path.join(ROOT, 'lib/favorites.js'), 'utf8'));
    add('폼이 둘 넘는 책이 있다', !!A && !!NAME, A + ' ' + NAME);

    const s = await h.open(url(A), { viewport: { width: 390, height: 844 }, mobile: true, ...FIX });
    const p = s.page;
    await p.locator('#dex-fav').waitFor({ timeout: 30000 });
    add('처음엔 담기지 않았다', await p.locator('#dex-fav').getAttribute('aria-pressed') === 'false');
    add('하트 단추에 이름', (await p.locator('#dex-fav').textContent()).includes(W('dex.fav')));
    add('담은 게 없으면 수 링크도 없다', await p.locator('#dex-fav-count').count() === 0);
    const f1 = await bigFile(p);
    await p.locator('#dex-fav').tap();
    await p.waitForTimeout(150);
    add('누르면 담긴다(aria-pressed)', await p.locator('#dex-fav').getAttribute('aria-pressed') === 'true');
    add('하트가 찬다', (await p.locator('#dex-fav').textContent()).includes('♥'));
    add('알림 — 담았어요', (await p.locator('.fav-toast').textContent()) === W('dex.fav.added'), await p.locator('.fav-toast').textContent());
    add('알림 자리는 aria-live', await p.locator('.fav-toast').getAttribute('aria-live') === 'polite');
    let list = await stored(p);
    const e = Array.isArray(list) ? list[0] : {};
    add('한 칸이 적힌다', Array.isArray(list) && list.length === 1, JSON.stringify(list).slice(0, 200));
    add('칸 — 공방·카드·그림', e.a === 'book' && e.key === A && e.title === NAME && e.file === f1, JSON.stringify(e));
    add('칸 — 짧은 이름표(폼·컷)', typeof e.sub === 'string' && e.sub.length > 0 && e.sub.length < 30, e.sub);
    add('칸 — 썸네일·원본은 절대 주소', /^https:\/\/polos0117\.github\.io\/book-atelier-img(-\d+)?\/img\/thumb\//.test(e.thumb) && /^https:\/\/polos0117\.github\.io\/book-atelier-img(-\d+)?\/img\/[^/]+$/.test(e.full), e.thumb + ' ' + e.full);
    const lk = new URL(e.link || '/', 'http://x');
    add('칸 — link 는 서가의 절대 경로 + ?book=&pic=', /^\/(.*\/)?dex\.html$/.test(lk.pathname) && lk.searchParams.get('book') === A && lk.searchParams.get('pic') === f1, e.link);
    add('칸 — 담은 때(ISO)', !isNaN(Date.parse(e.at)) && /T/.test(e.at), e.at);
    add('「즐겨찾기 1」 이 공방 모음으로', await p.locator('#dex-fav-count').textContent() === W('dex.fav.count', { n: 1 }) && await p.locator('#dex-fav-count').getAttribute('href') === '/favorites.html');

    /* 같은 책의 다른 폼 — 따로다 */
    await p.locator('.fstrip .fcell:not([disabled]):not(.on)').first().tap();
    await p.waitForTimeout(300);
    const f2 = await bigFile(p);
    add('다른 그림으로 바꾸면 담기지 않은 상태', f2 && f2 !== f1 && await p.locator('#dex-fav').getAttribute('aria-pressed') === 'false', f2);
    await p.locator('#dex-fav').tap();
    await p.waitForTimeout(150);
    list = await stored(p);
    add('둘째 그림 — 새것이 앞', list.length === 2 && list[0].file === f2 && list[1].file === f1, list.map(x => x.file).join(','));

    /* 새로고침해도 남는다 */
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.locator('#dex-fav').waitFor({ timeout: 30000 });
    await p.waitForTimeout(200);
    add('새로고침해도 남는다', (await stored(p)).length === 2 && await p.locator('#dex-fav-count').textContent() === W('dex.fav.count', { n: 2 }));
    /* 칸의 link 로 오면 그 그림으로 연다 */
    const link2 = (await stored(p))[0].link;
    await p.goto(new URL(link2, h.base).href, { waitUntil: 'domcontentloaded' });
    await p.locator('#dex-fav').waitFor({ timeout: 30000 });
    await p.waitForTimeout(300);
    add('link 로 오면 그 그림이 크게 뜨고 하트가 차 있다', await bigFile(p) === f2 && await p.locator('#dex-fav').getAttribute('aria-pressed') === 'true', await bigFile(p));
    await p.locator('#dex-fav').tap();
    await p.waitForTimeout(150);
    add('다시 누르면 빠진다', (await stored(p)).length === 1 && await p.locator('#dex-fav').getAttribute('aria-pressed') === 'false');
    add('알림 — 뺐어요', (await p.locator('.fav-toast').textContent()) === W('dex.fav.removed'));
    await p.locator('.bar .back').tap();
    await p.waitForSelector('.grid > .cell', { timeout: 10000 });
    add('목록으로 가면 주소에서 book·pic 이 빠진다', !/[?&](book|pic)=/.test(new URL(p.url()).search), p.url());
    add('오류 없음', !s.errors.length, s.errors.join(' | '));
    await s.close();

    /* 저장이 막힌 브라우저 */
    const b = await h.open(url(A), { viewport: { width: 1280, height: 900 }, ...FIX,
      init: () => { const no = () => { throw new DOMException('blocked', 'SecurityError'); }; Storage.prototype.setItem = no; Storage.prototype.getItem = no; } });
    await b.page.locator('#dex-fav').waitFor({ timeout: 30000 });
    await b.page.locator('#dex-fav').click();
    await b.page.waitForTimeout(150);
    add('저장이 막히면 담긴 척하지 않는다', await b.page.locator('#dex-fav').getAttribute('aria-pressed') === 'false');
    add('저장이 막히면 못 담았다고 알린다', (await b.page.locator('.fav-toast').textContent()) === W('dex.fav.blocked'));
    add('저장이 막혀도 오류 없음', !b.errors.length, b.errors.join(' | '));
    await b.close();

    /* 크게 보기의 하트 — 폴드 덮개 344×882 터치 */
    const zoomFile = p => p.evaluate(() => { const i = document.querySelector('.zoom-layer .zoom-body img'); return i ? decodeURIComponent(i.getAttribute('src').split('?')[0].split('/').pop()) : ''; });
    const zp = (p, v) => p.waitForFunction(v => (document.querySelector('#zoom-fav') || {}).ariaPressed === v, v, { timeout: 3000 }).then(() => true, () => false);
    const z = await h.open(url(A), { viewport: { width: 344, height: 882 }, mobile: true, ...FIX });
    const q = z.page;
    await q.locator('#dex-fav').waitFor({ timeout: 30000 });
    const d1 = await bigFile(q);
    await q.locator('.big .zoom').tap();
    await q.locator('#zoom-fav').waitFor({ timeout: 10000 });
    const z1 = await zoomFile(q);
    add('크게 보기 — 상세의 그 그림', z1 === d1, z1 + ' ' + d1);
    add('크게 보기 — 하트 단추(이름·안 담김)', (await q.locator('#zoom-fav').textContent()).includes(W('dex.fav')) && (await q.locator('#zoom-fav').textContent()).includes('♡') && await zp(q, 'false'));
    const zr = await q.evaluate(() => {
      const box = el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
      const fav = document.querySelector('#zoom-fav'), open = document.querySelector('.zoom-open'), bar = document.querySelector('.zoom-bar');
      const line = el => getComputedStyle(el).lineHeight + '/' + getComputedStyle(el).fontSize + '/' + getComputedStyle(el).fontFamily;
      return { fav: box(fav), open: box(open), bar: box(bar), favLine: line(fav), openLine: line(open), over: document.documentElement.scrollWidth - innerWidth, barOver: bar.scrollWidth - bar.clientWidth };
    });
    add('크게 보기 하트 — 44px', zr.fav.h >= 44 && zr.fav.w >= 44, JSON.stringify(zr.fav));
    add('크게 보기 하트 — 화면 안·위 띠 안', zr.fav.x >= 0 && zr.fav.x + zr.fav.w <= 345 && zr.fav.y >= zr.bar.y && zr.fav.y + zr.fav.h <= zr.bar.y + zr.bar.h + 1, JSON.stringify(zr));
    add('크게 보기 — 옆으로 안 넘친다', zr.over <= 1 && zr.barOver <= 1, JSON.stringify(zr));
    add('크게 보기 하트 — 원본 크기 단추 앞, 같은 줄·같은 높이·같은 글 줄 높이', Math.abs(zr.fav.y - zr.open.y) <= 1 && Math.abs(zr.fav.h - zr.open.h) <= 1 && zr.favLine === zr.openLine && zr.fav.x < zr.open.x, JSON.stringify(zr));
    await q.locator('#zoom-fav').tap();
    add('크게 보기 — 누르면 담긴다', await zp(q, 'true') && (await q.locator('#zoom-fav').textContent()).includes('♥'));
    add('크게 보기 — 알림 담았어요(aria-live)', (await q.locator('.zoom-layer .fav-toast').textContent()) === W('dex.fav.added') && await q.locator('.zoom-layer .fav-toast').getAttribute('aria-live') === 'polite');
    const tr = await q.evaluate(() => {
      const box = el => el.getBoundingClientRect(), t = box(document.querySelector('.zoom-layer .fav-toast'));
      const hit = el => { const b = box(el); return !(b.right <= t.left || b.left >= t.right || b.bottom <= t.top || b.top >= t.bottom); };
      return { t: [t.left, t.top, t.right, t.bottom], vis: t.width > 0 && t.left >= 0 && t.right <= innerWidth && t.bottom <= innerHeight,
        hit: [...document.querySelectorAll('.zoom-nav button, .zoom-bar button')].some(hit) };
    });
    add('크게 보기 — 알림이 화면 안, 넘기기·위 띠 단추와 안 겹친다', tr.vis && !tr.hit, JSON.stringify(tr));
    let zl = await stored(q);
    const ze = zl[0] || {}, zk = new URL(ze.link || '/', 'http://x');
    add('크게 보기 — 칸이 상세와 같은 꼴', zl.length === 1 && ze.a === 'book' && ze.key === A && ze.title === NAME && ze.file === z1 && typeof ze.sub === 'string' && ze.sub.length > 0
      && /\/img\/thumb\//.test(ze.thumb) && /\/img\/[^/]+$/.test(ze.full) && /^\/(.*\/)?dex\.html$/.test(zk.pathname) && zk.searchParams.get('book') === A && zk.searchParams.get('pic') === z1
      && Object.keys(ze).sort().join() === 'a,at,file,full,key,link,sub,thumb,title', JSON.stringify(ze));
    await q.locator('.zoom-next').tap();
    await q.waitForFunction(f => { const i = document.querySelector('.zoom-layer .zoom-body img'); return i && !decodeURIComponent(i.getAttribute('src')).includes(f); }, z1, { timeout: 5000 });
    const z2 = await zoomFile(q);
    add('크게 보기 — 넘기면 그 그림의 상태(안 담김)', z2 && z2 !== z1 && await zp(q, 'false'), z2);
    await q.locator('#zoom-fav').tap();
    const twoOk = await zp(q, 'true');
    zl = await stored(q);
    add('크게 보기 — 둘째 그림 담기, 새것이 앞', twoOk && zl.length === 2 && zl[0].file === z2 && zl[1].file === z1, zl.map(x => x.file).join(','));
    await q.locator('.zoom-prev').tap();
    add('크게 보기 — 앞으로 돌아오면 담긴 상태', await zp(q, 'true') && await zoomFile(q) === z1);
    await q.locator('#zoom-fav').tap();
    add('크게 보기 — 다시 누르면 빠진다', await zp(q, 'false') && (await stored(q)).length === 1 && (await q.locator('.zoom-layer .fav-toast').textContent()) === W('dex.fav.removed'));
    await q.locator('.zoom-next').tap();
    await zp(q, 'true');
    await q.locator('.zoom-close').tap();
    await q.locator('.zoom-layer').waitFor({ state: 'detached', timeout: 5000 });
    add('닫으면 상세가 그 그림, 상세 하트도 담김', await bigFile(q) === z2 && await q.locator('#dex-fav').getAttribute('aria-pressed') === 'true' && await q.locator('#dex-fav-count').textContent() === W('dex.fav.count', { n: 1 }), await bigFile(q));
    await q.locator('#dex-fav').tap();
    await q.waitForTimeout(150);
    await q.locator('.big .zoom').tap();
    await q.locator('#zoom-fav').waitFor({ timeout: 10000 });
    add('상세에서 빼고 다시 크게 보면 안 담김', await zp(q, 'false') && (await stored(q)).length === 0);
    add('크게 보기 — 오류 없음', !z.errors.length, z.errors.join(' | '));
    await z.close();
    const zb = await h.open(url(A), { viewport: { width: 344, height: 882 }, mobile: true, ...FIX,
      init: () => { const no = () => { throw new DOMException('blocked', 'SecurityError'); }; Storage.prototype.setItem = no; Storage.prototype.getItem = no; } });
    await zb.page.locator('#dex-fav').waitFor({ timeout: 30000 });
    await zb.page.locator('.big .zoom').tap();
    await zb.page.locator('#zoom-fav').tap();
    await zb.page.waitForTimeout(150);
    add('크게 보기 — 저장이 막히면 담긴 척하지 않고 못 담았다고 알린다', await zb.page.locator('#zoom-fav').getAttribute('aria-pressed') === 'false'
      && (await zb.page.locator('.zoom-layer .fav-toast').textContent()) === W('dex.fav.blocked'));
    add('크게 보기 — 저장이 막혀도 오류 없음', !zb.errors.length, zb.errors.join(' | '));
    await zb.close();

    /* 다섯 크기 — 누르는 자리·넘침·초점 고리 */
    for (const vp of [[344, 882], [390, 844], [844, 390], [690, 829], [1280, 900]]) {
      const v = await h.open(url(A), { viewport: { width: vp[0], height: vp[1] }, mobile: vp[0] < 1000, ...FIX,
        store: [KEY, JSON.stringify([{ a: 'book', key: 'x', file: 'x.webp', title: 'x', sub: '', thumb: '', full: '', link: '/', at: new Date().toISOString() }])] });
      await v.page.locator('#dex-fav').waitFor({ timeout: 30000 });
      await v.page.locator('#dex-fav').scrollIntoViewIfNeeded();
      const r = await v.page.evaluate(() => {
        const box = el => { const b = el.getBoundingClientRect(); return { x: b.x, w: b.width, h: b.height }; };
        return { heart: box(document.querySelector('#dex-fav')), count: box(document.querySelector('#dex-fav-count')), over: document.documentElement.scrollWidth - innerWidth };
      });
      add(vp.join('×') + ' 하트·수 링크 44px', r.heart.h >= 44 && r.count.h >= 44, JSON.stringify(r));
      add(vp.join('×') + ' 화면 안', r.heart.x >= 0 && r.heart.x + r.heart.w <= vp[0] + 1 && r.count.x + r.count.w <= vp[0] + 1, JSON.stringify(r));
      add(vp.join('×') + ' 옆으로 안 넘친다', r.over <= 1, JSON.stringify(r));
      await v.page.focus('#dex-fav');
      await v.page.keyboard.press('Shift+Tab'); await v.page.keyboard.press('Tab');
      add(vp.join('×') + ' 초점 고리', await v.page.evaluate(() => { const el = document.activeElement; return el.id === 'dex-fav' && getComputedStyle(el).outlineStyle !== 'none'; }));
      await v.close();
    }
  } catch (err) {
    add('검사가 끝까지 돌았다', false, String(err && err.stack || err).slice(0, 300));
  }
  await h.stop();
  fs.rmSync(art, { recursive: true, force: true });
  H.report(T, '서가 즐겨찾기');
})();
