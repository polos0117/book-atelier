/* core 낱말 블록 — lib/prompt-spec.js 끝의 「core:v1」 블록이 화풍공방 core/v1/vocab.json 과 같은지(사용자 2026-11-11 「프롬포트 … 문구관리를 하나의 공방에서」 → 「응 1번부터 진행해줘」).
   이 공방은 look-spec.js 가 없어 표정 표(EXPRESSION_DETAIL) · 외형 풀이(VOCAB_EN) 가 prompt-spec.js 한 블록으로 온다 — 공방에 있는 열쇠만 덮는다.
   옆에 ../style-atelier 가 있으면 그 sync.cjs --check 로, 없으면 블록이 있고 실려서 CORE_VERSION 이 서는지만 본다.
   Run: node tests/core-sync.cjs */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), cp = require('node:child_process'), assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..'), CORE = path.join(ROOT, '..', 'style-atelier', 'core', 'sync.cjs'), F = path.join(ROOT, 'lib/prompt-spec.js');
assert(/\/\* ── core:v\d+ begin/.test(fs.readFileSync(F, 'utf8')), 'lib/prompt-spec.js 에 core 블록이 없다');
const ctx = { window: {}, console }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(F, 'utf8'), ctx);
const T = ctx.window.AtelierSpec; assert(/^v\d+$/.test(T.CORE_VERSION || ''), 'CORE_VERSION');
assert.equal(T.EXPRESSION_DETAIL.confident, 'a composed, self-assured look', '표정 표가 core 글');
if (fs.existsSync(CORE)) {
  const r = cp.spawnSync('node', [CORE, ROOT, '--check', '--ver', T.CORE_VERSION], { encoding: 'utf8' });
  assert.equal(r.status, 0, 'core 블록이 원본과 다르다 — node ../style-atelier/core/sync.cjs . 로 다시 옮긴다\n' + r.stdout + r.stderr);
  console.log('PASS core 낱말: ' + T.CORE_VERSION + ' 블록 = style-atelier core 원본');
} else console.log('PASS core 낱말: ' + T.CORE_VERSION + ' 블록 있음(옆에 style-atelier 가 없어 원본 대조는 건너뜀)');
