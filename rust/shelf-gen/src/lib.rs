//! shelf-gen — 서고 탐험의 지도 생성기. 씨앗 하나로 아홉 층의 평면도(방·길·종류·만나는 책·보스)를 결정적으로 뽑는다.
//! 규칙(docs/RUN_DESIGN.md 2절)을 여기서 지키고, 수천 씨앗을 돌려 어긴 것이 없음을 `cargo test` 가 본다.
//!
//! 층 하나 = 세로 칸(col) 4~5 열. 첫 열은 들어온 자리(entry) 하나, 마지막 열은 계단(stairs — 바닥 층은 boss) 하나,
//! 가운데 열은 방 2~3 개. 길(edges)은 이웃 열 사이에만, 서로 엇갈리지 않게(단조) 놓아 모든 방이 들어온 자리에서 닿고 계단까지 간다.
//! 방 종류: meet(책과 만남 — 결투 한 장) · read(독서대 — 책 하나 얻기) · rest(사서의 책상 — 등불 하나) · scene(장면 — 그 책을 얻거나 등불).
//! 계단 바로 앞 열은 모두 층지기(meet) — 층마다 적어도 한 번은 싸운다. 4층부터는 앞 열에 싸움 하나 더.
//! 깊이가 곧 장: 1~3층 발단(0), 4~6층 전개(1), 7~9층 결말(2). 책은 0..books 의 번호(설계표 차례)로만 적는다.
//!
//! 브라우저 쪽은 wasm-bindgen 없이 `extern "C"` 와 포인터·길이만 쓴다(lib/shelf-gen.js 가 잇는다).
//! `plan(seed_lo, seed_hi, books)` → JSON 길이, `plan_ptr()` → 그 글의 자리. 꼴은 `API_VERSION`.

use std::cell::RefCell;

include!(concat!(env!("OUT_DIR"), "/source_hash.rs"));

/// 내보내기·JSON 꼴이 바뀌면 올린다 — lib/shelf-gen.js 가 맞춰 본다.
pub const API_VERSION: u32 = 1;
pub const FLOORS: usize = 9;
pub const FOE_DECK: usize = 6;
pub const OFFERS: usize = 5;
pub const LOOT: usize = 2;
/// 책이 이보다 적으면 못 짠다 — 상대 덱 여섯에, 윗층에서 만난 책(넷까지)·보스를 빼고도 한 층의 만남(넷)을 다 다르게 채우려면 열둘은 있어야 한다
pub const MIN_BOOKS: u32 = 12;

/* ── 난수 — splitmix64. 같은 씨앗이면 같은 지도 ── */
pub struct Rng(u64);
impl Rng {
    pub fn new(lo: u32, hi: u32) -> Rng { Rng(((hi as u64) << 32) | lo as u64) }
    pub fn next(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }
    /// 0..n
    pub fn below(&mut self, n: usize) -> usize { if n == 0 { 0 } else { (self.next() % n as u64) as usize } }
    pub fn chance(&mut self, num: u32, den: u32) -> bool { (self.next() % den as u64) < num as u64 }
    pub fn shuffle<T>(&mut self, v: &mut [T]) { for i in (1..v.len()).rev() { let j = self.below(i + 1); v.swap(i, j); } }
    /// pool 에서 서로 다른 n 개(차례는 섞인다). pool 이 모자라면 있는 만큼
    pub fn pick(&mut self, pool: &[u32], n: usize) -> Vec<u32> { let mut p = pool.to_vec(); self.shuffle(&mut p); p.truncate(n); p }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Kind { Entry, Meet, Read, Rest, Scene, Stairs, Boss }
impl Kind {
    pub fn name(self) -> &'static str {
        match self { Kind::Entry => "entry", Kind::Meet => "meet", Kind::Read => "read", Kind::Rest => "rest", Kind::Scene => "scene", Kind::Stairs => "stairs", Kind::Boss => "boss" }
    }
}

#[derive(Clone, Debug)]
pub struct Room {
    pub id: usize,
    pub col: usize,
    pub row: usize,
    pub kind: Kind,
    /// meet·scene·boss 의 책
    pub book: Option<u32>,
    /// meet·boss 의 상대 덱 여섯 — 첫째가 그 책
    pub foe: Vec<u32>,
    /// meet 을 이기면 고르는 둘
    pub loot: Vec<u32>,
    /// read 가 내미는 다섯(화면은 덱에 없는 앞 셋을 보인다)
    pub offers: Vec<u32>,
}

#[derive(Clone, Debug)]
pub struct Floor {
    /// 1..=9
    pub n: usize,
    /// 0 발단 · 1 전개 · 2 결말
    pub stage: usize,
    pub cols: usize,
    pub rooms: Vec<Room>,
    /// (from, to) — 이웃 열 사이, 단조
    pub edges: Vec<(usize, usize)>,
}

#[derive(Clone, Debug)]
pub struct Plan {
    pub seed: (u32, u32),
    pub books: u32,
    pub floors: Vec<Floor>,
    /// 바닥 층 boss 방의 책(floors[8] 에도 적혀 있다 — 빨리 찾으라고 한 번 더)
    pub boss: u32,
}

pub fn stage_of(floor_n: usize) -> usize { (floor_n - 1) / 3 }

/// 이웃 열 사이의 단조 길 — 두 열의 방을 위에서 아래로 짝지어 간다. 모든 방이 양쪽으로 적어도 하나씩 이어지고 길이 엇갈리지 않는다
fn link(rng: &mut Rng, left: &[usize], right: &[usize], out: &mut Vec<(usize, usize)>) {
    let (mut i, mut j) = (0usize, 0usize);
    out.push((left[0], right[0]));
    while i + 1 < left.len() || j + 1 < right.len() {
        let can_i = i + 1 < left.len();
        let can_j = j + 1 < right.len();
        match (can_i, can_j) {
            (true, true) => match rng.below(3) { 0 => i += 1, 1 => j += 1, _ => { i += 1; j += 1; } },
            (true, false) => i += 1,
            (false, true) => j += 1,
            _ => unreachable!(),
        }
        out.push((left[i], right[j]));
    }
}

fn gen_floor(n: usize, books: u32, rng: &mut Rng, recent: &[u32], boss: u32) -> Floor {
    let cols = if n <= 3 { 4 } else { 5 };   /* 4층부터는 열 하나 더 — 앞 열에 싸움·쉼·독서대·장면이 다 든다 */
    let mut rooms: Vec<Room> = Vec::new();
    let mut by_col: Vec<Vec<usize>> = vec![Vec::new(); cols];
    let push = |rooms: &mut Vec<Room>, by_col: &mut Vec<Vec<usize>>, col: usize, kind: Kind| {
        let id = rooms.len();
        let row = by_col[col].len();
        rooms.push(Room { id, col, row, kind, book: None, foe: Vec::new(), loot: Vec::new(), offers: Vec::new() });
        by_col[col].push(id);
        id
    };
    push(&mut rooms, &mut by_col, 0, Kind::Entry);
    for c in 1..cols - 1 {
        let k = 2 + rng.below(2);
        for _ in 0..k { push(&mut rooms, &mut by_col, c, Kind::Meet); }
    }
    let exit = push(&mut rooms, &mut by_col, cols - 1, if n == FLOORS { Kind::Boss } else { Kind::Stairs });

    /* 가운데 방의 종류 — 계단 바로 앞 열은 모두 층지기(meet: 층마다 적어도 한 번은 싸운다).
       그 앞 열들: 4층부터 싸움 하나 더, 쉼(짝수 층 하나), 독서대 하나(1~3층은 둘까지), 남으면 장면 하나, 그래도 남으면 독서대·쉼 */
    for &rid in &by_col[cols - 2] { rooms[rid].kind = Kind::Meet; }
    let mut front: Vec<usize> = (1..cols - 2).flat_map(|c| by_col[c].clone()).collect();
    rng.shuffle(&mut front);
    /* 급한 차례로 채우고(독서대 → 싸움 하나 더 → 쉼 → 둘째 독서대 → 장면 → 나머지) 자리에 맞게 자른 뒤 섞는다 */
    let mut kinds: Vec<Kind> = vec![Kind::Read];
    if n >= 4 { kinds.push(Kind::Meet); }
    if n % 2 == 0 { kinds.push(Kind::Rest); }
    if n <= 3 { kinds.push(Kind::Read); }
    kinds.push(Kind::Scene);
    while kinds.len() < front.len() { kinds.push(if rng.chance(1, 2) { Kind::Read } else { Kind::Rest }); }
    kinds.truncate(front.len());
    rng.shuffle(&mut kinds);
    for (idx, &rid) in front.iter().enumerate() { rooms[rid].kind = kinds[idx]; }

    /* 책 — 이 층에서 만나는 책은 서로 다르고, 바로 윗층에서 만난 책과 보스 책은 피한다 */
    let all: Vec<u32> = (0..books).collect();
    let fresh: Vec<u32> = all.iter().copied().filter(|b| *b != boss && !recent.contains(b)).collect();
    let mut met: Vec<u32> = Vec::new();
    for rid in 0..rooms.len() {
        match rooms[rid].kind {
            Kind::Meet | Kind::Scene => {
                let pool: Vec<u32> = fresh.iter().copied().filter(|b| !met.contains(b)).collect();
                let pool = if pool.is_empty() { all.iter().copied().filter(|b| *b != boss && !met.contains(b)).collect() } else { pool };
                let book = pool[rng.below(pool.len())];
                met.push(book);
                rooms[rid].book = Some(book);
                if rooms[rid].kind == Kind::Meet {
                    let others: Vec<u32> = all.iter().copied().filter(|b| *b != book).collect();
                    let mut foe = vec![book];
                    foe.extend(rng.pick(&others, FOE_DECK - 1));
                    rooms[rid].foe = foe;
                    rooms[rid].loot = rng.pick(&others, LOOT);
                }
            }
            Kind::Boss => {
                let others: Vec<u32> = all.iter().copied().filter(|b| *b != boss).collect();
                let mut foe = vec![boss];
                foe.extend(rng.pick(&others, FOE_DECK - 1));
                rooms[rid].book = Some(boss);
                rooms[rid].foe = foe;
            }
            Kind::Read => { rooms[rid].offers = rng.pick(&all, OFFERS); }
            _ => {}
        }
    }

    /* 길 — 이웃 열마다 단조로 */
    let mut edges = Vec::new();
    for c in 0..cols - 1 { link(rng, &by_col[c], &by_col[c + 1], &mut edges); }
    let _ = exit;
    Floor { n, stage: stage_of(n), cols, rooms, edges }
}

pub fn generate(seed_lo: u32, seed_hi: u32, books: u32) -> Option<Plan> {
    if books < MIN_BOOKS { return None; }
    let mut rng = Rng::new(seed_lo, seed_hi);
    let boss = rng.below(books as usize) as u32;
    let mut floors = Vec::with_capacity(FLOORS);
    let mut recent: Vec<u32> = Vec::new();
    for n in 1..=FLOORS {
        let f = gen_floor(n, books, &mut rng, &recent, boss);
        recent = f.rooms.iter().filter(|r| r.kind == Kind::Meet).filter_map(|r| r.book).collect();
        floors.push(f);
    }
    Some(Plan { seed: (seed_lo, seed_hi), books, floors, boss })
}

/* ── JSON — 손으로 쓴다(바깥 상자 없이). 숫자·고정 글자뿐이라 벗어날 글자가 없다 ── */
fn nums(v: &[u32]) -> String { let s: Vec<String> = v.iter().map(|x| x.to_string()).collect(); format!("[{}]", s.join(",")) }
pub fn to_json(p: &Plan) -> String {
    let mut s = String::with_capacity(8192);
    s.push_str(&format!("{{\"v\":{},\"seed\":[{},{}],\"books\":{},\"boss\":{},\"floors\":[", API_VERSION, p.seed.0, p.seed.1, p.books, p.boss));
    for (fi, f) in p.floors.iter().enumerate() {
        if fi > 0 { s.push(','); }
        s.push_str(&format!("{{\"n\":{},\"stage\":{},\"cols\":{},\"rooms\":[", f.n, f.stage, f.cols));
        for (ri, r) in f.rooms.iter().enumerate() {
            if ri > 0 { s.push(','); }
            s.push_str(&format!("{{\"id\":{},\"col\":{},\"row\":{},\"kind\":\"{}\"", r.id, r.col, r.row, r.kind.name()));
            if let Some(b) = r.book { s.push_str(&format!(",\"book\":{b}")); }
            if !r.foe.is_empty() { s.push_str(&format!(",\"foe\":{}", nums(&r.foe))); }
            if !r.loot.is_empty() { s.push_str(&format!(",\"loot\":{}", nums(&r.loot))); }
            if !r.offers.is_empty() { s.push_str(&format!(",\"offers\":{}", nums(&r.offers))); }
            s.push('}');
        }
        s.push_str("],\"edges\":[");
        for (ei, e) in f.edges.iter().enumerate() {
            if ei > 0 { s.push(','); }
            s.push_str(&format!("[{},{}]", e.0, e.1));
        }
        s.push_str("]}");
    }
    s.push_str("]}");
    s
}

/* ── wasm 내보내기 ── */
thread_local! { static OUT: RefCell<String> = const { RefCell::new(String::new()) }; }

#[no_mangle]
pub extern "C" fn api_version() -> u32 { API_VERSION }
#[no_mangle]
pub extern "C" fn source_hash_ptr() -> *const u8 { SOURCE_HASH.as_ptr() }
#[no_mangle]
pub extern "C" fn source_hash_len() -> usize { SOURCE_HASH.len() }
#[no_mangle]
pub extern "C" fn floors() -> u32 { FLOORS as u32 }
#[no_mangle]
pub extern "C" fn min_books() -> u32 { MIN_BOOKS }
/// 지도를 짜서 JSON 으로 둔다. 돌려주는 값은 글의 길이(바이트). 책이 모자라면 0
#[no_mangle]
pub extern "C" fn plan(seed_lo: u32, seed_hi: u32, books: u32) -> usize {
    let s = match generate(seed_lo, seed_hi, books) { Some(p) => to_json(&p), None => String::new() };
    let n = s.len();
    OUT.with(|o| *o.borrow_mut() = s);
    n
}
/// 마지막 plan 의 글이 있는 자리
#[no_mangle]
pub extern "C" fn plan_ptr() -> *const u8 { OUT.with(|o| o.borrow().as_ptr()) }

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::{HashSet, VecDeque};

    fn check(p: &Plan) {
        assert_eq!(p.floors.len(), FLOORS);
        let mut met_any: HashSet<u32> = HashSet::new();
        let mut prev: Vec<u32> = Vec::new();
        for (fi, f) in p.floors.iter().enumerate() {
            assert_eq!(f.n, fi + 1);
            assert_eq!(f.stage, (f.n - 1) / 3);
            let ids: Vec<usize> = f.rooms.iter().map(|r| r.id).collect();
            assert_eq!(ids, (0..f.rooms.len()).collect::<Vec<_>>(), "id 는 차례대로");
            /* 열 — 첫 열 entry 하나, 마지막 열 stairs/boss 하나, 가운데 2~3 */
            let col = |c: usize| f.rooms.iter().filter(|r| r.col == c).count();
            assert_eq!(col(0), 1);
            assert_eq!(col(f.cols - 1), 1);
            for c in 1..f.cols - 1 { assert!((2..=3).contains(&col(c)), "가운데 열은 2~3 방"); }
            assert_eq!(f.rooms[0].kind, Kind::Entry);
            let last = f.rooms.iter().find(|r| r.col == f.cols - 1).unwrap();
            assert_eq!(last.kind, if f.n == FLOORS { Kind::Boss } else { Kind::Stairs });
            /* 길 — 이웃 열 사이뿐, 모든 방이 양쪽으로 이어지고, 단조(엇갈리지 않음) */
            for &(a, b) in &f.edges { assert_eq!(f.rooms[b].col, f.rooms[a].col + 1, "이웃 열 사이뿐"); }
            for r in &f.rooms {
                if r.col > 0 { assert!(f.edges.iter().any(|e| e.1 == r.id), "들어오는 길"); }
                if r.col < f.cols - 1 { assert!(f.edges.iter().any(|e| e.0 == r.id), "나가는 길"); }
            }
            for &(a, b) in &f.edges { for &(c, d) in &f.edges {
                if f.rooms[a].col == f.rooms[c].col && f.rooms[a].row < f.rooms[c].row { assert!(f.rooms[b].row <= f.rooms[d].row, "길이 엇갈린다"); }
            } }
            /* 들어온 자리에서 모든 방에 닿는다 */
            let mut seen = vec![false; f.rooms.len()]; let mut q = VecDeque::from([0usize]); seen[0] = true;
            while let Some(x) = q.pop_front() { for &(a, b) in &f.edges { if a == x && !seen[b] { seen[b] = true; q.push_back(b); } } }
            assert!(seen.iter().all(|&s| s), "닿지 않는 방");
            /* 종류 — 싸움은 1~4 이고 가운데 방 하나는 늘 싸움이 아니다, 독서대 하나 이상, 짝수 층엔 쉼 */
            let meets = f.rooms.iter().filter(|r| r.kind == Kind::Meet).count();
            let middle = f.rooms.len() - 2;
            let guard = f.rooms.iter().filter(|r| r.col == f.cols - 2).count();
            assert!(f.rooms.iter().filter(|r| r.col == f.cols - 2).all(|r| r.kind == Kind::Meet), "계단 앞 열은 모두 층지기");
            assert_eq!(meets, guard + usize::from(f.n >= 4), "싸움 수 {meets}");
            assert!(meets < middle, "방 하나는 싸움이 아니다 {meets} / {middle}");
            assert!(f.rooms.iter().any(|r| r.kind == Kind::Read), "독서대");
            if f.n % 2 == 0 { assert!(f.rooms.iter().any(|r| r.kind == Kind::Rest), "짝수 층의 쉼"); }
            /* 책 — 층 안에서 겹치지 않고, 윗층에서 만난 책과 보스는 피한다. 상대 덱은 여섯이 다 다르고 첫째가 그 책 */
            let mut here: HashSet<u32> = HashSet::new();
            for r in &f.rooms {
                match r.kind {
                    Kind::Meet | Kind::Scene => {
                        let b = r.book.expect("책");
                        assert!(b < p.books && b != p.boss, "보스 책은 미리 안 나온다");
                        assert!(here.insert(b), "한 층에 같은 책");
                        if r.kind == Kind::Meet { assert!(!prev.contains(&b), "윗층에서 만난 책을 또"); met_any.insert(b); }
                    }
                    Kind::Boss => { assert_eq!(r.book, Some(p.boss)); }
                    Kind::Read => { assert_eq!(r.offers.len(), OFFERS); assert_eq!(r.offers.iter().collect::<HashSet<_>>().len(), OFFERS); }
                    _ => { assert!(r.book.is_none() && r.foe.is_empty()); }
                }
                if matches!(r.kind, Kind::Meet | Kind::Boss) {
                    assert_eq!(r.foe.len(), FOE_DECK); assert_eq!(r.foe[0], r.book.unwrap());
                    assert_eq!(r.foe.iter().collect::<HashSet<_>>().len(), FOE_DECK, "상대 덱에 같은 책");
                    if r.kind == Kind::Meet { assert_eq!(r.loot.len(), LOOT); assert_ne!(r.loot[0], r.loot[1]); assert!(!r.loot.contains(&r.book.unwrap())); }
                }
            }
            prev = f.rooms.iter().filter(|r| r.kind == Kind::Meet).filter_map(|r| r.book).collect();
        }
        assert!(!met_any.contains(&p.boss));
    }

    #[test]
    fn same_seed_same_plan() {
        let a = to_json(&generate(7, 11, 20).unwrap());
        let b = to_json(&generate(7, 11, 20).unwrap());
        assert_eq!(a, b);
        assert_ne!(a, to_json(&generate(8, 11, 20).unwrap()));
    }
    #[test]
    fn thousands_of_seeds_keep_the_rules() {
        for s in 0..3000u32 { check(&generate(s, s.wrapping_mul(2654435761), 20).unwrap()); }
        for s in 0..300u32 { check(&generate(s, 1, 12).unwrap()); }   /* 책이 딱 열둘이어도 */
        assert!(generate(1, 1, 11).is_none(), "책이 모자라면 못 짠다");
    }
    #[test]
    fn json_is_well_formed() {
        let s = to_json(&generate(3, 4, 20).unwrap());
        assert!(s.starts_with("{\"v\":1,\"seed\":[3,4],\"books\":20,\"boss\":"));
        assert_eq!(s.matches('{').count(), s.matches('}').count());
        assert_eq!(s.matches('[').count(), s.matches(']').count());
        assert!(s.contains("\"kind\":\"boss\""));
    }
    #[test]
    fn exports_work() {
        let n = plan(5, 6, 20);
        assert!(n > 1000);
        let bytes = unsafe { std::slice::from_raw_parts(plan_ptr(), n) };
        assert_eq!(std::str::from_utf8(bytes).unwrap(), to_json(&generate(5, 6, 20).unwrap()));
        assert_eq!(plan(1, 1, 3), 0);
        assert_eq!(source_hash_len(), 16);
    }
}
