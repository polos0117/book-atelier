/* 모자이크 화면 — mosaic.html?file= 로 열어 가장 거친 밀도로 그리고, 캔버스·받기·조각 누르기·겹치기를 본다.
   휴대폰 세로 390×844 · 휴대폰 가로 844×390 · PC 1280×900. 주소의 그림이 없을 때, WebAssembly 가 없을 때.
   ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/mosaic-screen.cjs
   그림은 tests/fixtures/make-art.py 의 가짜 그림(색 판), 조각 색인은 tests/fixtures/make-art-index.py 가 그것으로 셈한다 */
const assert = require('node:assert/strict'), os = require('node:os'), fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { start, report } = require('./browser-harness.cjs');
const art = fs.mkdtempSync(path.join(os.tmpdir(), 'book-art-'));
const imgjson = execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-art.py'), art]).toString();
const index = JSON.parse(execFileSync('python3', [path.join(__dirname, 'fixtures', 'make-art-index.py'), art]).toString());
const LEFT_OUT = 'alice_literary_fantasy_f_extra1.webp';      // 등록됐지만 색인에 없는 그림 — 건너뛴다
delete index.files[LEFT_OUT]; index.count--;
const design = JSON.parse(fs.readFileSync('data/book-design.json', 'utf8'));
const TARGET = 'don_quixote_begin_literary_fantasy_f.webp';
const opt = (viewport, mobile, extra) => ({ viewport, mobile, imgRoot: art, files: { 'data/img.json': imgjson, 'data/art-index.json': index }, ...extra });
const phase = p => p.$eval('.mosaic-frame', e => e.dataset.phase);
const done = p => p.waitForFunction(() => document.querySelector('.mosaic-frame')?.dataset.phase === 'done', null, { timeout: 60000 });
const wide = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
/* 캔버스 평균 색과 퍼짐, 그리고 바탕 그림을 같은 비율로 덮게 잘라 줄인 평균 색 */
const canvasStats = p => p.evaluate(() => {
  const c = document.getElementById('mosaic-canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let s = [0, 0, 0], n = 0, sum = 0;
  const colours = new Set(), opaque = [0];
  for (let i = 0; i < d.length; i += 4 * 7) {
    s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; n++;
    colours.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); if (d[i + 3] === 255) opaque[0]++;
    sum = (sum * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) % 1000000007;
  }
  return { w: c.width, h: c.height, mean: s.map(v => v / n), colours: colours.size, opaque: opaque[0] / n, sum };
});
const targetMean = (p, file) => p.evaluate(file => new Promise(ok => {
  const im = new Image(); im.crossOrigin = 'anonymous';
  im.onload = () => {
    const c = document.getElementById('mosaic-canvas'), cv = window.AtelierMosaic.cover(im.naturalWidth, im.naturalHeight, c.width, c.height);
    const t = document.createElement('canvas'); t.width = 60; t.height = Math.round(60 * c.height / c.width);
    t.getContext('2d').drawImage(im, cv.sx, cv.sy, cv.sw, cv.sh, 0, 0, t.width, t.height);
    const d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data, s = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) { s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; }
    ok(s.map(v => v / (d.length / 4)));
  };
  im.src = window.AtelierImg.imgURL(file);
}), file);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

(async () => {
  const h = await start(), rows = [];
  try {
    for (const [name, viewport, mobile] of [['세로 390×844', { width: 390, height: 844 }, true], ['가로 844×390', { width: 844, height: 390 }, true], ['PC 1280×900', { width: 1280, height: 900 }, false]]) {
      const a = await h.open('mosaic.html?file=' + TARGET, opt(viewport, mobile)), p = a.page;
      await p.waitForSelector('.mosaic-frame');
      /* 가장 거친 밀도 · 겹치기 0 · 반복 자유롭게 — 조각 색만으로 바탕 색이 나오는지 본다 */
      await p.click('.mosaic-seg button[data-value="coarse"]');
      await p.fill('#mosaic-overlay', '0');
      await p.selectOption('#mosaic-repeat', 'free');
      await p.waitForSelector('.mosaic-frame[data-done="coarse phone free"]', { timeout: 60000 });
      const status0 = await p.$eval('#mosaic-status', e => e.textContent);
      rows.push([name + ' 거칠게 = 가로 32칸 · 휴대폰 1,472칸', status0.includes('1,472'), status0]);
      const st = await canvasStats(p), want = await targetMean(p, TARGET), all = index.count;
      rows.push([name + ' 캔버스 크기 1170×2532', st.w === 1170 && st.h === 2532, st.w + '×' + st.h]);
      rows.push([name + ' 캔버스가 비지 않았다(다 칠했고 조각 무늬가 있다)', st.opaque === 1 && st.colours > 20, st.opaque + ' · ' + st.colours + '색']);
      rows.push([name + ' 평균 색이 바탕 그림과 비슷하다', dist(st.mean, want) < 45, st.mean.map(Math.round) + ' vs ' + want.map(Math.round) + ' · ' + dist(st.mean, want).toFixed(1)]);
      rows.push([name + ' 건너뛴 그림을 알린다(색인에 없는 하나)', /건너뛰었어요/.test(await p.$eval('#mosaic-status', e => e.textContent)), await p.$eval('#mosaic-status', e => e.textContent)]);
      /* 받기 */
      await p.waitForSelector('#mosaic-download[href^="blob:"]');
      const dl = await p.$eval('#mosaic-download', e => [e.getAttribute('download'), e.getAttribute('aria-disabled')]);
      rows.push([name + ' 받기 링크 — 파일 이름', dl[0] === 'mosaic_don_quixote_begin_literary_fantasy_f_phone_32.png' && dl[1] === 'false', dl.join(' · ')]);
      const head = await p.$eval('#mosaic-download', async e => { const b = await (await fetch(e.href)).blob(); const u = new Uint8Array(await b.slice(0, 4).arrayBuffer()); return [b.type, b.size, Array.from(u)]; });
      rows.push([name + ' 받는 파일은 PNG', head[0] === 'image/png' && head[2].join() === '137,80,78,71' && head[1] > 10000, head.join(' ')]);
      /* 조각 누르기 — 어느 책의 어느 그림인지, 서가로 가는 길 */
      const frame = p.locator('.mosaic-frame');
      await frame.scrollIntoViewIfNeeded();
      const box = await frame.boundingBox();
      await frame.click({ position: { x: box.width * 0.5, y: box.height * 0.4 } });
      await p.waitForSelector('#mosaic-tile-dex');
      const dex = await p.$eval('#mosaic-tile-dex', e => e.getAttribute('href'));
      rows.push([name + ' 조각 → 서가 링크', /^dex\.html\?book=[a-z0-9_]+$/.test(dex) && design.books.some(b => 'dex.html?book=' + b.key === dex), dex]);
      const m0 = await p.$eval('.mosaic-mark', e => e.style.left);
      await p.focus('.mosaic-frame'); await p.keyboard.press('ArrowRight');
      rows.push([name + ' 방향키로 조각을 옮긴다', (await p.$eval('.mosaic-mark', e => e.style.left)) !== m0, m0]);
      /* 겹치기 — 다시 맞추지 않고 파일만 새로 */
      const href0 = await p.$eval('#mosaic-download', e => e.href);
      await p.fill('#mosaic-overlay', '30');
      await p.waitForFunction(h0 => { const e = document.querySelector('#mosaic-download'); return e.href && e.href !== h0 && e.href.startsWith('blob:'); }, href0);
      rows.push([name + ' 겹치기는 다시 그리지 않는다', await phase(p) === 'done']);
      const st2 = await canvasStats(p);
      rows.push([name + ' 겹치기 30% 면 캔버스가 바뀌고 색은 그대로 바탕 쪽', st2.sum !== st.sum && dist(st2.mean, want) < 45, dist(st2.mean, want).toFixed(1)]);
      /* 자리 — 가로로 넘치지 않고, 그림 칸이 화면 안에, 누르는 자리 44px */
      rows.push([name + ' 가로로 넘치지 않는다', await wide(p)]);
      const fb = await p.locator('.mosaic-frame').boundingBox();
      rows.push([name + ' 그림 칸이 화면 높이 안에', fb.height <= viewport.height && fb.width > 80, Math.round(fb.width) + '×' + Math.round(fb.height)]);
      if (name.startsWith('가로')) {
        const panel = await p.locator('.mosaic-panel').boundingBox();
        rows.push([name + ' 설정은 그림 오른쪽', panel.x >= fb.x + fb.width - 1, panel.x + ' / ' + (fb.x + fb.width)]);
      }
      if (name.startsWith('PC')) {
        /* 다른 배치 — 같은 설정, 다른 씨앗 */
        const before = (await canvasStats(p)).sum;
        await p.click('#mosaic-shuffle');
        await p.waitForSelector('.mosaic-frame[data-round="1"][data-done="coarse phone free"]', { timeout: 60000 });
        rows.push([name + ' 다른 배치는 조각 자리를 바꾼다', (await canvasStats(p)).sum !== before]);
        const panel = await p.locator('.mosaic-panel').boundingBox();
        rows.push([name + ' 설정은 오른쪽 단, 첫 화면에 받기 단추', panel.x > viewport.width / 2 && (await p.locator('#mosaic-download').boundingBox()).y < viewport.height + 120, String(panel.x)]);
      }
      const small = await p.$$eval('.mosaic-panel button, .mosaic-panel select, .mosaic-panel a, .mosaic-panel input[type=range], .mosaic-tile a, .mosaic-tile button',
        es => es.filter(e => e.getClientRects().length).map(e => [e.id || e.className || e.tagName, Math.round(e.getBoundingClientRect().height)]).filter(([, h]) => h < 44));
      rows.push([name + ' 누르는 자리는 44px 이상', small.length === 0, JSON.stringify(small)]);
      /* 머리 — 다른 화면과 같은 항해 넷, 이 화면은 탭에 없다(344 폭에 다섯은 안 든다) */
      const nav = await p.$$eval('.workspace-nav a', es => es.map(e => [e.getAttribute('href'), e.getAttribute('aria-current')]));
      rows.push([name + ' 머리 항해 넷 그대로', nav.map(x => x[0]).join() === 'index.html,dex.html,prompt.html,duel.html' && nav.every(x => !x[1]), JSON.stringify(nav)]);
      rows.push([name + ' 화면 오류 없음', a.errors.length === 0, a.errors.join(' | ')]);
      rows.push([name + ' 낱말 표에 없는 열쇠 없음', (await p.evaluate(() => window.AtelierWords.missing())).length === 0, String(await p.evaluate(() => window.AtelierWords.missing()))]);
      await a.close();
    }

    /* 고르개 — 책 → 그림을 바꾸면 주소도 바뀌고 다시 그린다. 모르는 ?file= 이면 첫 그림으로 열고 알린다 */
    let a = await h.open('mosaic.html?file=nope.webp', opt({ width: 390, height: 844 }, true, { store: ['book_mosaic_v1', JSON.stringify({ density: 'coarse', overlay: 0 })] })), p = a.page;
    await done(p);
    rows.push(['모르는 그림 → 알리고 첫 그림으로', (await p.$$eval('.mosaic-status', es => es.map(e => e.textContent).join(' '))).includes('찾지 못해')
      && !(await p.evaluate(() => location.search)).includes('nope'), await p.evaluate(() => location.search)]);
    await p.selectOption('#mosaic-book', 'alice');
    await p.waitForFunction(() => new URLSearchParams(location.search).get('file')?.startsWith('alice_'));
    const cuts = await p.$$eval('#mosaic-cut option', es => es.map(e => e.value));
    rows.push(['책을 고르면 그 책의 그림들', cuts.length >= 6 && cuts.every(f => f.startsWith('alice_')), cuts.join(',')]);
    await p.selectOption('#mosaic-cut', 'alice_end_open_literary_fantasy_f.webp');
    await p.waitForFunction(() => new URLSearchParams(location.search).get('file') === 'alice_end_open_literary_fantasy_f.webp');
    await done(p);
    rows.push(['그림을 고르면 다시 그린다', (await p.$eval('#mosaic-download', e => e.getAttribute('download'))).startsWith('mosaic_alice_end_open'), await p.$eval('#mosaic-download', e => e.getAttribute('download'))]);
    rows.push(['고르개 오류 없음', a.errors.length === 0, a.errors.join(' | ')]);
    await a.close();

    /* WebAssembly 가 없으면 — 낱말 표의 말, 화면은 선다 */
    a = await h.open('mosaic.html?file=' + TARGET, opt({ width: 390, height: 844 }, true, { init: () => { delete window.WebAssembly; } })); p = a.page;
    await p.waitForFunction(() => document.querySelector('.mosaic-frame')?.dataset.phase === 'error');
    const msg = await p.$eval('#mosaic-status', e => e.textContent), want = await p.evaluate(() => W('mosaic.error.wasm'));
    rows.push(['WebAssembly 없음 → 낱말 표의 말', msg === want, msg]);
    rows.push(['WebAssembly 없어도 고르개는 선다', await p.locator('#mosaic-book').isVisible()]);
    rows.push(['WebAssembly 없음 — 화면 오류 없음', a.errors.length === 0, a.errors.join(' | ')]);
    await a.close();
  } finally { await h.stop(); fs.rmSync(art, { recursive: true, force: true }); }
  if (report(rows, '모자이크 화면')) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
