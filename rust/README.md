# rust — 그림 특징 · 모자이크

| 상자 | 무엇 | 나오는 것 |
|---|---|---|
| `art-core` | 그림 특징과 맞추기 — 2×3 칸 Lab 서명, dHash 64비트, Lab 4×4×4 색 막대, 칸마다 조각 고르기(벌점·최대 횟수·간격, 씨앗). 바깥 의존 없음 | (라이브러리) |
| `art-index` | 그림 저장소의 그림 → 색인. `data/img.json` 에 등록된 것만 | `data/art-index.json` |
| `mosaic-wasm` | 브라우저 쪽 맞추기. `extern "C"` 내보내기 + 포인터·길이(붙임 생성기 없음) | `lib/mosaic.wasm` |

화면(`mosaic.html`)과 싣개(`lib/mosaic.js`)는 빌드 없이 그대로 뜬다. 지은 `.wasm` 만 저장소에 올린다 — `rust/target/` 은 `.gitignore`.

## 다시 짓기

`rust/` 에서(cargo 1.94, `rustup target add wasm32-unknown-unknown`):

```bash
cargo test                                                                  # art-core · art-index · mosaic-wasm 단위 검사
cargo build -p mosaic-wasm --target wasm32-unknown-unknown --profile wasm   # 크기 우선 판(opt-level z · lto · panic=abort · strip)
cp target/wasm32-unknown-unknown/wasm/mosaic_wasm.wasm ../lib/mosaic.wasm
cargo run --release -p art-index                                            # data/art-index.json 다시 셈(그림 저장소: ../../book-atelier-img)
cargo run --release -p art-index -- --check                                 # 색인이 그림과 같은지만(다르면 1)
```

그다음 저장소 뿌리에서 `node tests/mosaic.cjs` — wasm 이 소스와 맞는지, 맞추기 규칙, 색인 꼴을 본다.
`mosaic.html` 의 `lib/mosaic.wasm?v=` · `lib/mosaic.js?v=` 숫자도 하나 올린다(Pages 캐시).

## 묵은 wasm 막기

`mosaic-wasm/build.rs` 가 아래 파일의 셈(FNV-1a 64)을 wasm 안에 넣고 `source_hash_ptr/len` 으로 내보낸다.
`tests/mosaic.cjs` 가 같은 셈을 해서 올려 둔 `lib/mosaic.wasm` 의 값과 견준다 — 소스를 고치고 다시 짓지 않으면 검사가 실패한다.

- 파일: `art-core/Cargo.toml`, `art-core/src/**`, `mosaic-wasm/Cargo.toml`, `mosaic-wasm/build.rs`, `mosaic-wasm/src/**`
- 규칙: `rust/` 아래 상대 경로(`/`)로 줄 세워, 파일마다 `경로 · 0x00 · 내용(\r\n → \n) · 0x00` 을 이어 셈한다
- 같은 도구 사슬이면 같은 바이트가 나온다(경로는 상대로만 들어간다)

## 내보내기 (`API_VERSION` 1)

| 이름 | 꼴 | 무엇 |
|---|---|---|
| `alloc(len) → ptr` · `dealloc(ptr, len)` | 8바이트 맞춤 | 자리 받기·돌려주기 |
| `tiles_load(ptr, n) → n` | i16 × 21 × n | 조각 서명 싣기(색인의 `lab`) |
| `target_rgba(ptr, w, h, cols, rows) → 칸 수` | RGBA, w ≥ cols·2, h ≥ rows·3 | 바탕 그림 → 칸 서명(칸 하나를 다시 2×3 으로) |
| `match_tiles(max, spacing, penalty, seed_lo, seed_hi, out) → 칸 수` | out: u32 × 칸 수 | 칸마다 조각 번호 |
| `repeat_cap(max) → n` · `target_mean(out) → 1` | | 실제 최대 횟수, 바탕 평균 Lab |
| `api_version` · `sig_len` · `source_hash_ptr` · `source_hash_len` | | 맞춰 보기 |

색인 꼴과 닮은 그림 계획은 `docs/ART_INDEX.md`.
