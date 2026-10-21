//! 모자이크 — 브라우저 쪽. wasm-bindgen 없이 `extern "C"` 내보내기와 포인터·길이만 쓴다.
//! 부르는 쪽은 lib/mosaic.js(손으로 쓴 작은 싣개).
//!
//! 차례
//!   1. `alloc(n)` 으로 자리를 받아 조각 서명(i16 × 21 × 조각 수)을 써 넣고 `tiles_load(ptr, n)`.
//!   2. 과녁 그림을 (cols·2·k) × (rows·3·k) 로 줄인 RGBA 를 써 넣고 `target_rgba(ptr, w, h, cols, rows)`.
//!   3. `match_tiles(max_repeat, spacing, penalty, seed_lo, seed_hi, out)` — out 에 칸마다 조각 번호(u32).
//!   다 쓴 자리는 `dealloc(ptr, n)`.
//!
//! `source_hash` 는 빌드 때 art-core/src·mosaic-wasm/src 를 셈한 값 — 올려 둔 lib/mosaic.wasm 이
//! 소스보다 묵었는지 tests/mosaic.cjs 가 이것으로 본다(build.rs).

use art_core::{assign, effective_cap, target_signatures, MatchParams, Pixels, Signature, SIG_LEN};
use std::cell::RefCell;

include!(concat!(env!("OUT_DIR"), "/source_hash.rs"));

/// 내보내기 꼴이 바뀌면 올린다 — lib/mosaic.js 가 맞춰 본다.
pub const API_VERSION: u32 = 1;

struct State {
    tiles: Vec<Signature>,
    cells: Vec<Signature>,
    cols: usize,
}

thread_local! {
    static STATE: RefCell<State> = const { RefCell::new(State { tiles: Vec::new(), cells: Vec::new(), cols: 0 }) };
}

#[no_mangle]
pub extern "C" fn api_version() -> u32 {
    API_VERSION
}

#[no_mangle]
pub extern "C" fn sig_len() -> u32 {
    SIG_LEN as u32
}

#[no_mangle]
pub extern "C" fn source_hash_ptr() -> *const u8 {
    SOURCE_HASH.as_ptr()
}

#[no_mangle]
pub extern "C" fn source_hash_len() -> u32 {
    SOURCE_HASH.len() as u32
}

/// 바이트 n 개 자리 — 8바이트 맞춤(i16·u32·f32 를 그대로 읽고 쓴다). 0 이면 1 바이트 자리.
#[no_mangle]
pub extern "C" fn alloc(len: u32) -> *mut u8 {
    match layout(len) {
        // SAFETY: 크기가 0 이 아니다
        Some(l) => unsafe { std::alloc::alloc(l) },
        None => std::ptr::null_mut(),
    }
}

fn layout(len: u32) -> Option<std::alloc::Layout> {
    std::alloc::Layout::from_size_align(len.max(1) as usize, 8).ok()
}

/// # Safety
/// `ptr` 은 같은 `len` 으로 받은 `alloc` 자리여야 한다.
#[no_mangle]
pub unsafe extern "C" fn dealloc(ptr: *mut u8, len: u32) {
    if let (false, Some(l)) = (ptr.is_null(), layout(len)) {
        std::alloc::dealloc(ptr, l);
    }
}

/// 조각 서명을 싣는다 — i16 × SIG_LEN × n. 실은 조각 수를 돌려준다.
///
/// # Safety
/// `ptr` 에 i16 이 `n * SIG_LEN` 개 있어야 한다(2바이트 맞춤).
#[no_mangle]
pub unsafe extern "C" fn tiles_load(ptr: *const i16, n: u32) -> u32 {
    let q = if n == 0 || ptr.is_null() { &[][..] } else { std::slice::from_raw_parts(ptr, n as usize * SIG_LEN) };
    let tiles: Vec<Signature> = q.chunks_exact(SIG_LEN).filter_map(Signature::from_quantized).collect();
    let k = tiles.len() as u32;
    STATE.with(|s| s.borrow_mut().tiles = tiles);
    k
}

/// 과녁 RGBA → 칸 cols × rows 의 서명. w ≥ cols·2, h ≥ rows·3 이어야 한다. 칸 수(실패면 0).
///
/// # Safety
/// `ptr` 에 바이트가 `w * h * 4` 개 있어야 한다.
#[no_mangle]
pub unsafe extern "C" fn target_rgba(ptr: *const u8, w: u32, h: u32, cols: u32, rows: u32) -> u32 {
    let (w, h, cols, rows) = (w as usize, h as usize, cols as usize, rows as usize);
    if ptr.is_null() || cols == 0 || rows == 0 || w < cols * 2 || h < rows * 3 {
        return 0;
    }
    let data = std::slice::from_raw_parts(ptr, w * h * 4);
    let Some(px) = Pixels::new(data, w, h, 4) else { return 0 };
    let cells = target_signatures(&px, cols, rows);
    let n = cells.len() as u32;
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        s.cells = cells;
        s.cols = cols;
    });
    n
}

/// 과녁 전체의 Lab 평균을 f32 셋으로 out 에.
///
/// # Safety
/// `out` 에 f32 셋 자리가 있어야 한다.
#[no_mangle]
pub unsafe extern "C" fn target_mean(out: *mut f32) -> u32 {
    STATE.with(|s| {
        let s = s.borrow();
        if s.cells.is_empty() || out.is_null() {
            return 0;
        }
        let mut m = [0f32; 3];
        for c in &s.cells {
            for d in 0..3 {
                m[d] += c.mean[d];
            }
        }
        let o = std::slice::from_raw_parts_mut(out, 3);
        for d in 0..3 {
            o[d] = m[d] / s.cells.len() as f32;
        }
        1
    })
}

/// 실제로 쓸 최대 횟수(0 = 끝없음). 실은 조각·과녁 칸 수로 셈한다.
#[no_mangle]
pub extern "C" fn repeat_cap(max_repeat: u32) -> u32 {
    STATE.with(|s| {
        let s = s.borrow();
        effective_cap(max_repeat, s.cells.len(), s.tiles.len())
    })
}

/// 칸마다 조각 번호를 out(u32 × 칸 수)에. 돌려주는 값: 쓴 칸 수, 조각이나 과녁이 없으면 0.
///
/// # Safety
/// `out` 에 u32 가 칸 수만큼 들어갈 자리가 있어야 한다(4바이트 맞춤).
#[no_mangle]
pub unsafe extern "C" fn match_tiles(max_repeat: u32, spacing: u32, penalty: f32, seed_lo: u32, seed_hi: u32, out: *mut u32) -> u32 {
    STATE.with(|s| {
        let s = s.borrow();
        if s.tiles.is_empty() || s.cells.is_empty() || out.is_null() {
            return 0;
        }
        let p = MatchParams {
            max_repeat,
            spacing,
            penalty: if penalty.is_finite() { penalty.max(0.0) } else { 0.0 },
            seed: (seed_hi as u64) << 32 | seed_lo as u64,
        };
        let a = assign(&s.cells, s.cols, &s.tiles, &p);
        let o = std::slice::from_raw_parts_mut(out, a.len());
        o.copy_from_slice(&a);
        a.len() as u32
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_is_hex() {
        assert_eq!(SOURCE_HASH.len(), 16);
        assert!(SOURCE_HASH.bytes().all(|b| b.is_ascii_hexdigit()));
    }

    #[test]
    fn round_trip_through_exports() {
        // 조각 둘(검정·흰색), 과녁 2 × 1 칸: 왼쪽 검정, 오른쪽 흰색
        let mut q = vec![0i16; SIG_LEN * 2];
        for k in 0..7 {
            q[SIG_LEN + k * 3] = 100;
        }
        unsafe {
            assert_eq!(tiles_load(q.as_ptr(), 2), 2);
            let (w, h) = (8usize, 6usize);
            let mut rgba = vec![0u8; w * h * 4];
            for y in 0..h {
                for x in w / 2..w {
                    rgba[(y * w + x) * 4..(y * w + x) * 4 + 4].copy_from_slice(&[255, 255, 255, 255]);
                }
            }
            assert_eq!(target_rgba(rgba.as_ptr(), w as u32, h as u32, 2, 1), 2);
            let mut out = [9u32; 2];
            assert_eq!(match_tiles(0, 0, 0.0, 1, 0, out.as_mut_ptr()), 2);
            assert_eq!(out, [0, 1]);
            let mut m = [0f32; 3];
            assert_eq!(target_mean(m.as_mut_ptr()), 1);
            assert!((m[0] - 50.0).abs() < 0.1);
            assert_eq!(repeat_cap(0), 0);
            assert_eq!(repeat_cap(1), 1);
            assert_eq!(target_rgba(rgba.as_ptr(), 1, 1, 2, 1), 0, "너무 작은 과녁");
        }
    }
}
