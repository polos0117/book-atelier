//! 그림 특징 — 모자이크 조각 맞추기와 (나중의) 닮은 그림 찾기가 같이 쓴다.
//!
//! * 모자이크 서명: 2×3 칸(조각의 2:3 비율과 같다)마다 CIE Lab 평균 + 그림 전체 평균 = Lab 일곱 개(21 수).
//! * 닮은 그림 준비: dHash 64비트, Lab 4×4×4 거친 색 막대(합 ≈ 255 인 u8 64개).
//! * 맞추기: 칸마다 Lab 거리가 가장 가까운 조각 — 다시 쓸수록 벌점, 한 조각의 최대 횟수, 같은 조각이
//!   이웃(체비쇼프 거리 `spacing` 안)에 다시 앉지 않게. 칸을 도는 차례는 씨앗으로 섞는다(같은 씨앗 = 같은 결과).
//!
//! 바깥 의존이 없다 — 네이티브(art-index)와 wasm32(mosaic-wasm)에서 똑같이 돈다.

/// 서명 칸 — 가로 2 × 세로 3.
pub const GX: usize = 2;
pub const GY: usize = 3;
pub const CELLS: usize = GX * GY;
/// 서명 길이 — 칸 여섯 + 전체 평균, 각 L·a·b.
pub const SIG_LEN: usize = (CELLS + 1) * 3;
/// 전체 평균의 무게(칸 하나 = 1).
pub const MEAN_WEIGHT: f32 = 2.0;
/// 색 막대 — L·a·b 마다 4칸.
pub const HIST_SIDE: usize = 4;
pub const HIST_BINS: usize = HIST_SIDE * HIST_SIDE * HIST_SIDE;

pub type Lab = [f32; 3];

/// sRGB 0..255 → 선형 0..1 표. 한 번 만들어 두고 쓴다(powf 를 화소마다 부르지 않게).
pub struct Linear([f32; 256]);

impl Linear {
    pub fn new() -> Self {
        let mut t = [0f32; 256];
        for (i, v) in t.iter_mut().enumerate() {
            let c = i as f32 / 255.0;
            *v = if c <= 0.04045 { c / 12.92 } else { ((c + 0.055) / 1.055).powf(2.4) };
        }
        Linear(t)
    }

    /// sRGB 한 화소 → CIE Lab (D65).
    #[inline]
    pub fn lab(&self, r: u8, g: u8, b: u8) -> Lab {
        let (r, g, b) = (self.0[r as usize], self.0[g as usize], self.0[b as usize]);
        let x = (0.412_456_4 * r + 0.357_576_1 * g + 0.180_437_5 * b) / 0.950_47;
        let y = 0.212_672_9 * r + 0.715_152_2 * g + 0.072_175 * b;
        let z = (0.019_333_9 * r + 0.119_192 * g + 0.950_304_1 * b) / 1.088_83;
        let (fx, fy, fz) = (lab_f(x), lab_f(y), lab_f(z));
        [116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz)]
    }
}

impl Default for Linear {
    fn default() -> Self {
        Self::new()
    }
}

#[inline]
fn lab_f(t: f32) -> f32 {
    const E: f32 = 216.0 / 24389.0; // (6/29)^3
    const K: f32 = 24389.0 / 27.0;
    if t > E { t.cbrt() } else { (K * t + 16.0) / 116.0 }
}

/// 화소 묶음 — RGB(3) 또는 RGBA(4). 알파는 보지 않는다.
#[derive(Clone, Copy)]
pub struct Pixels<'a> {
    pub data: &'a [u8],
    pub width: usize,
    pub height: usize,
    pub channels: usize,
}

impl<'a> Pixels<'a> {
    pub fn new(data: &'a [u8], width: usize, height: usize, channels: usize) -> Option<Self> {
        if width == 0 || height == 0 || !(channels == 3 || channels == 4) {
            return None;
        }
        if data.len() < width * height * channels {
            return None;
        }
        Some(Pixels { data, width, height, channels })
    }

    #[inline]
    fn rgb(&self, x: usize, y: usize) -> (u8, u8, u8) {
        let i = (y * self.width + x) * self.channels;
        (self.data[i], self.data[i + 1], self.data[i + 2])
    }
}

/// 그림을 gx × gy 칸으로 나눠 칸마다 Lab 평균(화소마다 Lab 으로 바꾼 뒤 평균). 칸 차례는 줄 먼저.
/// 화소 (x, y) 는 칸 (x·gx/w, y·gy/h) 에 든다 — 칸이 화소보다 많으면 빈 칸은 이웃 화소 하나로 채운다.
pub fn lab_grid(px: &Pixels, lin: &Linear, gx: usize, gy: usize) -> Vec<Lab> {
    let mut sum = vec![[0f64; 3]; gx * gy];
    let mut n = vec![0u32; gx * gy];
    let cx: Vec<usize> = (0..px.width).map(|x| x * gx / px.width).collect();
    for y in 0..px.height {
        let row = y * gy / px.height * gx;
        for x in 0..px.width {
            let (r, g, b) = px.rgb(x, y);
            let l = lin.lab(r, g, b);
            let k = row + cx[x];
            sum[k][0] += l[0] as f64;
            sum[k][1] += l[1] as f64;
            sum[k][2] += l[2] as f64;
            n[k] += 1;
        }
    }
    let mut out = Vec::with_capacity(gx * gy);
    for j in 0..gy {
        for i in 0..gx {
            let k = j * gx + i;
            if n[k] > 0 {
                let c = n[k] as f64;
                out.push([(sum[k][0] / c) as f32, (sum[k][1] / c) as f32, (sum[k][2] / c) as f32]);
            } else {
                let x = ((2 * i + 1) * px.width / (2 * gx)).min(px.width - 1);
                let y = ((2 * j + 1) * px.height / (2 * gy)).min(px.height - 1);
                let (r, g, b) = px.rgb(x, y);
                out.push(lin.lab(r, g, b));
            }
        }
    }
    out
}

/// 서명 — 칸 여섯의 Lab 과 그 평균.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Signature {
    pub cells: [Lab; CELLS],
    pub mean: Lab,
}

impl Signature {
    /// 칸 여섯에서 — 평균은 칸 평균의 평균이다(칸 크기가 거의 같다).
    pub fn from_cells(cells: [Lab; CELLS]) -> Self {
        let mut m = [0f32; 3];
        for c in &cells {
            for d in 0..3 {
                m[d] += c[d];
            }
        }
        for v in &mut m {
            *v /= CELLS as f32;
        }
        Signature { cells, mean: m }
    }

    pub fn of(px: &Pixels, lin: &Linear) -> Self {
        let g = lab_grid(px, lin, GX, GY);
        let mut cells = [[0f32; 3]; CELLS];
        cells.copy_from_slice(&g);
        Self::from_cells(cells)
    }

    /// 색인에 적는 꼴 — 반올림한 정수 21개(L 0..100, a·b 대략 −128..127).
    pub fn quantize(&self) -> [i16; SIG_LEN] {
        let mut q = [0i16; SIG_LEN];
        for (k, c) in self.cells.iter().chain(std::iter::once(&self.mean)).enumerate() {
            for d in 0..3 {
                q[k * 3 + d] = c[d].round().clamp(-128.0, 127.0) as i16;
            }
        }
        q
    }

    pub fn from_quantized(q: &[i16]) -> Option<Self> {
        if q.len() < SIG_LEN {
            return None;
        }
        let mut cells = [[0f32; 3]; CELLS];
        for (k, c) in cells.iter_mut().enumerate() {
            for d in 0..3 {
                c[d] = q[k * 3 + d] as f32;
            }
        }
        let b = CELLS * 3;
        Some(Signature { cells, mean: [q[b] as f32, q[b + 1] as f32, q[b + 2] as f32] })
    }
}

#[inline]
fn de2(a: &Lab, b: &Lab) -> f32 {
    let (x, y, z) = (a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    x * x + y * y + z * z
}

/// 두 서명의 거리 — 칸 여섯과 평균(무게 MEAN_WEIGHT)의 ΔE76 제곱 평균의 제곱근. 단위는 ΔE.
pub fn sig_distance(a: &Signature, b: &Signature) -> f32 {
    let mut s = 0.0;
    for k in 0..CELLS {
        s += de2(&a.cells[k], &b.cells[k]);
    }
    s += MEAN_WEIGHT * de2(&a.mean, &b.mean);
    (s / (CELLS as f32 + MEAN_WEIGHT)).sqrt()
}

/// dHash — 밝기를 9×8 로 줄여(칸 평균) 가로로 이웃한 두 칸을 견준다. 왼쪽이 더 밝으면 1. 줄 먼저, 첫 비트가 가장 높은 자리.
pub fn dhash(px: &Pixels) -> u64 {
    const W: usize = 9;
    const H: usize = 8;
    let mut sum = [0f64; W * H];
    let mut n = [0u32; W * H];
    for y in 0..px.height {
        let row = y * H / px.height * W;
        for x in 0..px.width {
            let (r, g, b) = px.rgb(x, y);
            let k = row + x * W / px.width;
            sum[k] += 0.299 * r as f64 + 0.587 * g as f64 + 0.114 * b as f64;
            n[k] += 1;
        }
    }
    let v: Vec<f64> = (0..W * H).map(|k| if n[k] > 0 { sum[k] / n[k] as f64 } else { 0.0 }).collect();
    let mut h = 0u64;
    for y in 0..H {
        for x in 0..W - 1 {
            h = (h << 1) | (v[y * W + x] > v[y * W + x + 1]) as u64;
        }
    }
    h
}

/// 색 막대 칸 — L 은 25 씩, a·b 는 −16·0·16 에서 끊는다(그림 대부분이 무채색 가까이에 모여 있다).
#[inline]
pub fn hist_bin(l: &Lab) -> usize {
    let li = ((l[0] / 25.0).floor() as i32).clamp(0, 3) as usize;
    let ai = (((l[1] + 32.0) / 16.0).floor() as i32).clamp(0, 3) as usize;
    let bi = (((l[2] + 32.0) / 16.0).floor() as i32).clamp(0, 3) as usize;
    (li * HIST_SIDE + ai) * HIST_SIDE + bi
}

/// Lab 4×4×4 색 막대 — 화소 비율을 255 배해 반올림한 u8(합은 255 언저리).
pub fn histogram(px: &Pixels, lin: &Linear) -> [u8; HIST_BINS] {
    let mut c = [0u32; HIST_BINS];
    for y in 0..px.height {
        for x in 0..px.width {
            let (r, g, b) = px.rgb(x, y);
            c[hist_bin(&lin.lab(r, g, b))] += 1;
        }
    }
    let total = (px.width * px.height) as f64;
    let mut out = [0u8; HIST_BINS];
    for k in 0..HIST_BINS {
        out[k] = (c[k] as f64 * 255.0 / total).round().min(255.0) as u8;
    }
    out
}

/// 한 그림의 특징 전부.
#[derive(Clone, Debug)]
pub struct Features {
    pub signature: Signature,
    pub dhash: u64,
    pub hist: [u8; HIST_BINS],
}

pub fn features(px: &Pixels) -> Features {
    let lin = Linear::new();
    Features { signature: Signature::of(px, &lin), dhash: dhash(px), hist: histogram(px, &lin) }
}

/// dHash 해밍 거리 0..64.
pub fn hamming(a: u64, b: u64) -> u32 {
    (a ^ b).count_ones()
}

/// 색 막대 카이제곱 거리 ½Σ(p−q)²/(p+q), 0..1 (둘 다 255 로 나눠 비율로 본다).
pub fn chi_square(a: &[u8], b: &[u8]) -> f32 {
    let mut s = 0.0f32;
    for (x, y) in a.iter().zip(b) {
        let (p, q) = (*x as f32 / 255.0, *y as f32 / 255.0);
        if p + q > 0.0 {
            s += (p - q) * (p - q) / (p + q);
        }
    }
    s * 0.5
}

/// 과녁 그림 → 모자이크 칸 cols × rows 의 서명. 칸 하나를 다시 2×3 으로 나눈다 —
/// 그림 전체를 (cols·2) × (rows·3) 작은 칸으로 평균 낸 뒤 칸마다 여섯씩 묶는다.
pub fn target_signatures(px: &Pixels, cols: usize, rows: usize) -> Vec<Signature> {
    let lin = Linear::new();
    let (sx, sy) = (cols * GX, rows * GY);
    let g = lab_grid(px, &lin, sx, sy);
    let mut out = Vec::with_capacity(cols * rows);
    for r in 0..rows {
        for c in 0..cols {
            let mut cells = [[0f32; 3]; CELLS];
            for j in 0..GY {
                for i in 0..GX {
                    cells[j * GX + i] = g[(r * GY + j) * sx + c * GX + i];
                }
            }
            out.push(Signature::from_cells(cells));
        }
    }
    out
}

/// 맞추기 설정.
#[derive(Clone, Copy, Debug)]
pub struct MatchParams {
    /// 한 조각을 쓸 수 있는 최대 횟수. 0 이면 끝이 없다. 칸 수를 다 못 채우는 값이면 ⌈칸 ÷ 조각⌉ 으로 올린다.
    pub max_repeat: u32,
    /// 같은 조각 사이 최소 간격 — 체비쇼프 거리 이 값 안의 이웃에는 같은 조각이 없다. 0 이면 보지 않는다.
    pub spacing: u32,
    /// 한 번 쓸 때마다 더하는 벌점(ΔE 단위).
    pub penalty: f32,
    pub seed: u64,
}

/// 실제로 쓰는 최대 횟수 — 0 은 끝없음.
pub fn effective_cap(max_repeat: u32, cells: usize, tiles: usize) -> u32 {
    if max_repeat == 0 || tiles == 0 {
        return 0;
    }
    let need = cells.div_ceil(tiles) as u32;
    max_repeat.max(need)
}

/// SplitMix64 — 칸 차례 섞기용. 작고 어디서나 같은 수를 낸다.
pub struct Rng(u64);

impl Rng {
    pub fn new(seed: u64) -> Self {
        Rng(seed)
    }
    pub fn next_u64(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }
    /// 0..n (n > 0)
    pub fn below(&mut self, n: usize) -> usize {
        ((self.next_u64() >> 11) as u128 * n as u128 >> 53) as usize
    }
}

/// 칸마다 조각 번호. `cells` 는 줄 먼저 cols × rows. 조각이 없으면 빈 벡터.
/// 차례: 씨앗으로 섞은 칸 차례대로, 최대 횟수가 남고 이웃에 없는 조각 가운데 (거리 + 벌점 × 쓴 횟수) 가 가장 작은 것.
/// 그런 조각이 없으면 간격을 풀고, 그래도 없으면(최대 횟수를 다 썼으면) 아무 조각에서 고른다.
/// 비기면 번호가 작은 쪽.
pub fn assign(cells: &[Signature], cols: usize, tiles: &[Signature], p: &MatchParams) -> Vec<u32> {
    let n = cells.len();
    let t = tiles.len();
    if t == 0 || n == 0 || cols == 0 {
        return Vec::new();
    }
    let rows = n.div_ceil(cols);
    let cap = effective_cap(p.max_repeat, n, t);
    let mut order: Vec<usize> = (0..n).collect();
    let mut rng = Rng::new(p.seed);
    for i in (1..n).rev() {
        let j = rng.below(i + 1);
        order.swap(i, j);
    }
    const NONE: u32 = u32::MAX;
    let mut out = vec![NONE; n];
    let mut uses = vec![0u32; t];
    let mut banned = vec![0u32; t];
    let mut stamp = 0u32;
    let s = p.spacing as isize;
    let mut cost = vec![0f32; t];
    for &k in &order {
        stamp += 1;
        let (r, c) = ((k / cols) as isize, (k % cols) as isize);
        if s > 0 {
            for dr in -s..=s {
                let rr = r + dr;
                if rr < 0 || rr >= rows as isize {
                    continue;
                }
                for dc in -s..=s {
                    let cc = c + dc;
                    if (dr == 0 && dc == 0) || cc < 0 || cc >= cols as isize {
                        continue;
                    }
                    let q = rr as usize * cols + cc as usize;
                    if q < n && out[q] != NONE {
                        banned[out[q] as usize] = stamp;
                    }
                }
            }
        }
        for (i, tile) in tiles.iter().enumerate() {
            cost[i] = sig_distance(&cells[k], tile) + p.penalty * uses[i] as f32;
        }
        let pick = |spaced: bool, capped: bool| -> Option<usize> {
            let mut best: Option<usize> = None;
            for i in 0..t {
                if capped && cap > 0 && uses[i] >= cap {
                    continue;
                }
                if spaced && banned[i] == stamp {
                    continue;
                }
                if best.is_none_or(|b| cost[i] < cost[b]) {
                    best = Some(i);
                }
            }
            best
        };
        let i = pick(true, true).or_else(|| pick(false, true)).or_else(|| pick(false, false)).unwrap_or(0);
        out[k] = i as u32;
        uses[i] += 1;
    }
    out
}

/// 맞춘 결과를 검사할 때 쓰는 셈 — 가장 많이 쓴 횟수와, 간격 안에서 같은 조각이 이웃한 쌍의 수.
pub fn audit(assign: &[u32], cols: usize, spacing: u32) -> (u32, usize) {
    let mut count = std::collections::HashMap::<u32, u32>::new();
    for &a in assign {
        *count.entry(a).or_default() += 1;
    }
    let most = count.values().copied().max().unwrap_or(0);
    let n = assign.len();
    let rows = n.div_ceil(cols.max(1));
    let s = spacing as isize;
    let mut bad = 0;
    for k in 0..n {
        let (r, c) = ((k / cols) as isize, (k % cols) as isize);
        for dr in 0..=s {
            for dc in -s..=s {
                if dr == 0 && dc <= 0 {
                    continue;
                }
                let (rr, cc) = (r + dr, c + dc);
                if rr >= rows as isize || cc < 0 || cc >= cols as isize {
                    continue;
                }
                let q = rr as usize * cols + cc as usize;
                if q < n && assign[q] == assign[k] {
                    bad += 1;
                }
            }
        }
    }
    (most, bad)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn solid(w: usize, h: usize, rgb: (u8, u8, u8)) -> Vec<u8> {
        let mut v = Vec::with_capacity(w * h * 3);
        for _ in 0..w * h {
            v.extend_from_slice(&[rgb.0, rgb.1, rgb.2]);
        }
        v
    }

    fn close(a: f32, b: f32, tol: f32) -> bool {
        (a - b).abs() <= tol
    }

    #[test]
    fn lab_reference_colours() {
        let lin = Linear::new();
        let w = lin.lab(255, 255, 255);
        assert!(close(w[0], 100.0, 0.05) && close(w[1], 0.0, 0.05) && close(w[2], 0.0, 0.05), "{w:?}");
        let k = lin.lab(0, 0, 0);
        assert!(close(k[0], 0.0, 0.01), "{k:?}");
        let r = lin.lab(255, 0, 0);
        assert!(close(r[0], 53.24, 0.1) && close(r[1], 80.09, 0.2) && close(r[2], 67.20, 0.2), "{r:?}");
        let g = lin.lab(0, 128, 0);
        assert!(close(g[0], 46.23, 0.1) && close(g[1], -51.70, 0.3) && close(g[2], 49.90, 0.3), "{g:?}");
    }

    #[test]
    fn signature_follows_grid() {
        // 위 1/3 은 빨강, 아래 2/3 은 파랑 — 2×3 칸의 첫 줄만 빨강
        let (w, h) = (20, 30);
        let mut v = solid(w, h, (0, 0, 255));
        for y in 0..10 {
            for x in 0..w {
                let i = (y * w + x) * 3;
                v[i..i + 3].copy_from_slice(&[255, 0, 0]);
            }
        }
        let px = Pixels::new(&v, w, h, 3).unwrap();
        let s = Signature::of(&px, &Linear::new());
        let lin = Linear::new();
        let (red, blue) = (lin.lab(255, 0, 0), lin.lab(0, 0, 255));
        for k in 0..CELLS {
            let want = if k < GX { red } else { blue };
            assert!(de2(&s.cells[k], &want) < 0.01, "cell {k}");
        }
        let q = s.quantize();
        assert_eq!(q.len(), SIG_LEN);
        let back = Signature::from_quantized(&q).unwrap();
        assert!(sig_distance(&s, &back) < 1.0);
        // RGBA 도 같다
        let mut rgba = Vec::new();
        for c in v.chunks(3) {
            rgba.extend_from_slice(&[c[0], c[1], c[2], 255]);
        }
        let s4 = Signature::of(&Pixels::new(&rgba, w, h, 4).unwrap(), &lin);
        assert_eq!(s, s4);
    }

    #[test]
    fn dhash_gradients() {
        let (w, h) = (90, 80);
        let mut up = vec![0u8; w * h * 3];
        for y in 0..h {
            for x in 0..w {
                let v = (x * 255 / (w - 1)) as u8;
                up[(y * w + x) * 3..(y * w + x) * 3 + 3].copy_from_slice(&[v, v, v]);
            }
        }
        let down: Vec<u8> = up.iter().map(|v| 255 - v).collect();
        assert_eq!(dhash(&Pixels::new(&up, w, h, 3).unwrap()), 0);
        assert_eq!(dhash(&Pixels::new(&down, w, h, 3).unwrap()), u64::MAX);
        assert_eq!(hamming(0, u64::MAX), 64);
    }

    #[test]
    fn histogram_is_normalised() {
        let v = solid(10, 10, (200, 40, 40));
        let px = Pixels::new(&v, 10, 10, 3).unwrap();
        let h = histogram(&px, &Linear::new());
        assert_eq!(h.iter().map(|&x| x as u32).sum::<u32>(), 255);
        assert_eq!(h.iter().filter(|&&x| x > 0).count(), 1);
        assert!(chi_square(&h, &h).abs() < 1e-6);
        let other = histogram(&Pixels::new(&solid(10, 10, (40, 40, 200)), 10, 10, 3).unwrap(), &Linear::new());
        assert!((chi_square(&h, &other) - 1.0).abs() < 1e-3);
    }

    fn sig(l: f32, a: f32, b: f32) -> Signature {
        Signature::from_cells([[l, a, b]; CELLS])
    }

    fn palette(n: usize) -> Vec<Signature> {
        (0..n).map(|i| sig(10.0 + (i * 80 / n.max(1)) as f32, (i % 7) as f32 * 8.0 - 24.0, (i % 5) as f32 * 9.0 - 18.0)).collect()
    }

    #[test]
    fn exact_match_without_limits() {
        let tiles = palette(12);
        let cells: Vec<Signature> = (0..24).map(|k| tiles[k % 12]).collect();
        let p = MatchParams { max_repeat: 0, spacing: 0, penalty: 0.0, seed: 7 };
        let a = assign(&cells, 6, &tiles, &p);
        for (k, &i) in a.iter().enumerate() {
            assert_eq!(i as usize, k % 12);
        }
    }

    #[test]
    fn deterministic_and_seeded() {
        let tiles = palette(40);
        let cells: Vec<Signature> = (0..30 * 20).map(|k| sig((k % 97) as f32, ((k * 7) % 40) as f32 - 20.0, 0.0)).collect();
        let p = MatchParams { max_repeat: 30, spacing: 1, penalty: 0.5, seed: 42 };
        let a = assign(&cells, 30, &tiles, &p);
        assert_eq!(a, assign(&cells, 30, &tiles, &p));
        let b = assign(&cells, 30, &tiles, &MatchParams { seed: 43, ..p });
        assert_eq!(a.len(), b.len());
        assert_ne!(a, b, "다른 씨앗이면 대개 다르다");
    }

    #[test]
    fn repeat_cap_and_spacing() {
        let tiles = palette(30);
        // 다 같은 색 — 가장 가까운 조각 하나로 몰리려 한다
        let cells = vec![tiles[3]; 20 * 15];
        for spacing in [1u32, 2] {
            let p = MatchParams { max_repeat: 12, spacing, penalty: 0.0, seed: 1 };
            let a = assign(&cells, 20, &tiles, &p);
            let (most, bad) = audit(&a, 20, spacing);
            assert!(most <= 12, "최대 {most}");
            assert_eq!(bad, 0, "간격 {spacing} 안에 같은 조각");
        }
        // 최대 횟수가 너무 작으면 ⌈칸 ÷ 조각⌉ 으로 올린다
        assert_eq!(effective_cap(2, 300, 30), 10);
        assert_eq!(effective_cap(0, 300, 30), 0);
        let a = assign(&cells, 20, &tiles, &MatchParams { max_repeat: 2, spacing: 0, penalty: 0.0, seed: 1 });
        assert!(audit(&a, 20, 0).0 <= 10);
    }

    #[test]
    fn penalty_spreads_use() {
        let tiles = palette(20);
        let cells = vec![tiles[5]; 200];
        let none = assign(&cells, 20, &tiles, &MatchParams { max_repeat: 0, spacing: 0, penalty: 0.0, seed: 3 });
        assert!(none.iter().all(|&i| i == 5));
        let some = assign(&cells, 20, &tiles, &MatchParams { max_repeat: 0, spacing: 0, penalty: 1.0, seed: 3 });
        let distinct: std::collections::HashSet<_> = some.iter().collect();
        assert!(distinct.len() > 3);
    }

    #[test]
    fn target_grid_split() {
        // 4 × 2 칸 과녁: 왼쪽 반 검정, 오른쪽 반 흰색
        let (cols, rows) = (4, 2);
        let (w, h) = (cols * GX * 3, rows * GY * 3);
        let mut v = solid(w, h, (0, 0, 0));
        for y in 0..h {
            for x in w / 2..w {
                v[(y * w + x) * 3..(y * w + x) * 3 + 3].copy_from_slice(&[255, 255, 255]);
            }
        }
        let t = target_signatures(&Pixels::new(&v, w, h, 3).unwrap(), cols, rows);
        assert_eq!(t.len(), cols * rows);
        for (k, s) in t.iter().enumerate() {
            let want = if k % cols < cols / 2 { 0.0 } else { 100.0 };
            assert!(close(s.mean[0], want, 0.1), "{k}: {:?}", s.mean);
        }
        let tiles = vec![sig(0.0, 0.0, 0.0), sig(100.0, 0.0, 0.0)];
        let a = assign(&t, cols, &tiles, &MatchParams { max_repeat: 0, spacing: 0, penalty: 0.0, seed: 0 });
        assert_eq!(a, vec![0, 0, 1, 1, 0, 0, 1, 1]);
    }

    #[test]
    fn rng_is_stable() {
        let mut r = Rng::new(0);
        assert_eq!(r.next_u64(), 0xE220_A839_7B1D_CDAF);
        let mut r = Rng::new(9);
        for _ in 0..1000 {
            assert!(r.below(7) < 7);
        }
    }
}
