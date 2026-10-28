//! shelf-gen — 길 지도 생성기. 씨앗 하나와 규칙 표(spec, JSON)로 몇 층짜리 평면도(방·길·종류·아이템)를 결정적으로 뽑는다.
//! 책 공방의 서고 탐험(docs/RUN_DESIGN.md 2절)이 첫 손님이고, 같은 wasm 을 신화 공방 던전(갈림길·둘째 층)도 쓴다 — 규칙 표만 다르다.
//! 규칙 표의 예 둘(`BOOK_SPEC` · 신화 던전은 그쪽 data/run.json)이 아래 검사에 있고, 수천 씨앗을 돌려 어긴 것이 없음을 `cargo test` 가 본다.
//!
//! 층 하나 = 세로 열(col) 여럿. 첫 열은 들어온 자리(entry) 하나, 마지막 열은 나가는 자리(exit — 마지막 층은 last_exit) 하나,
//! 가운데 열은 방 middle[0]~middle[1] 개. 길(edges)은 이웃 열 사이에만, 서로 엇갈리지 않게(단조) 놓아 모든 방이 들어온 자리에서 닿고 나가는 자리까지 간다.
//! 가운데 열의 종류: guard 가 있으면 나가는 자리 바로 앞 열은 모두 guard(층마다 적어도 한 번은 싸운다). 그 앞 열들은 slots(급한 차례 — 층 범위·every 로 켜진다)를
//! 자리에 맞게 자르고, 남으면 fill 에서 뽑아 채운 뒤 섞는다. 아이템(책·카드 — 0..items 번호)은 kinds 의 main/draws 규칙으로 방에 붙인다.
//!
//! 규칙 표(JSON):
//!   floors, stage_div(층 → 장: (n-1)/stage_div), cols(수 또는 [[from, cols], …]), middle [min, max], entry, exit, last_exit, guard(없으면 null),
//!   slots [{kind, from?, to?, every?}], fill [kind…], items(수, 0 이면 아이템 없음), main_key(방에 적는 이름, 기본 "item"), boss_item(bool),
//!   kinds {kind: {main: true|"boss", avoid_prev: bool, draws: {name: {n, with_main, not_main}}}}
//!
//! 브라우저 쪽은 wasm-bindgen 없이 `extern "C"` 와 포인터·길이만 쓴다(lib/shelf-gen.js 가 잇는다).
//! `plan(seed_lo, seed_hi, books)` 는 책 규칙 표 그대로, `plan_spec(seed_lo, seed_hi, ptr, len)` 은 아무 규칙 표. 둘 다 JSON 길이를 돌려주고 `plan_ptr()` 가 글의 자리.

use std::cell::RefCell;

include!(concat!(env!("OUT_DIR"), "/source_hash.rs"));

/// 내보내기·JSON 꼴이 바뀌면 올린다 — lib/shelf-gen.js 가 맞춰 본다.
pub const API_VERSION: u32 = 2;

/// 책 공방 서고 탐험의 규칙 표 — `plan()` 이 쓴다. 아홉 층, 1~3층 열 넷·4층부터 다섯, 계단 앞 열은 모두 층지기(meet), 4층부터 싸움 하나 더,
/// 짝수 층 쉼, 독서대 하나(1~3층은 둘), 장면 하나, 남으면 독서대·쉼. 만남·보스는 상대 덱 여섯(첫째가 그 책), 만남은 전리품 둘, 독서대는 후보 다섯.
pub const BOOK_SPEC: &str = r#"{"floors":9,"stage_div":3,"cols":[[1,4],[4,5]],"middle":[2,3],"entry":"entry","exit":"stairs","last_exit":"boss","guard":"meet",
"slots":[{"kind":"read"},{"kind":"meet","from":4},{"kind":"rest","every":2},{"kind":"read","to":3},{"kind":"scene"}],"fill":["read","rest"],
"items":20,"main_key":"book","boss_item":true,
"kinds":{"meet":{"main":true,"avoid_prev":true,"draws":{"foe":{"n":6,"with_main":true},"loot":{"n":2,"not_main":true}}},
"scene":{"main":true},"read":{"draws":{"offers":{"n":5}}},"boss":{"main":"boss","draws":{"foe":{"n":6,"with_main":true}}}}}"#;

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
    pub fn below(&mut self, n: usize) -> usize { if n == 0 { 0 } else { (self.next() % n as u64) as usize } }
    pub fn shuffle<T>(&mut self, v: &mut [T]) { for i in (1..v.len()).rev() { let j = self.below(i + 1); v.swap(i, j); } }
    pub fn pick(&mut self, pool: &[u32], n: usize) -> Vec<u32> { let mut p = pool.to_vec(); self.shuffle(&mut p); p.truncate(n); p }
}

/* ── 아주 작은 JSON 읽기 — 규칙 표만 읽는다(바깥 상자 없이). 글자열의 \" \\ \n \uXXXX 만 푼다 ── */
#[derive(Clone, Debug, PartialEq)]
pub enum Json { Null, Bool(bool), Num(f64), Str(String), Arr(Vec<Json>), Obj(Vec<(String, Json)>) }
impl Json {
    pub fn get(&self, k: &str) -> Option<&Json> { if let Json::Obj(o) = self { o.iter().find(|(kk, _)| kk == k).map(|(_, v)| v) } else { None } }
    pub fn num(&self) -> Option<f64> { if let Json::Num(n) = self { Some(*n) } else { None } }
    pub fn int(&self) -> Option<i64> { self.num().map(|n| n as i64) }
    pub fn str(&self) -> Option<&str> { if let Json::Str(s) = self { Some(s) } else { None } }
    pub fn arr(&self) -> Option<&Vec<Json>> { if let Json::Arr(a) = self { Some(a) } else { None } }
    pub fn boolean(&self) -> Option<bool> { if let Json::Bool(b) = self { Some(*b) } else { None } }
}
struct P<'a> { s: &'a [u8], i: usize }
impl<'a> P<'a> {
    fn ws(&mut self) { while self.i < self.s.len() && matches!(self.s[self.i], b' ' | b'\n' | b'\r' | b'\t') { self.i += 1; } }
    fn eat(&mut self, c: u8) -> Result<(), String> { self.ws(); if self.i < self.s.len() && self.s[self.i] == c { self.i += 1; Ok(()) } else { Err(format!("expected {} at {}", c as char, self.i)) } }
    fn value(&mut self) -> Result<Json, String> {
        self.ws();
        if self.i >= self.s.len() { return Err("eof".into()); }
        match self.s[self.i] {
            b'{' => { self.i += 1; let mut o = Vec::new(); self.ws(); if self.s.get(self.i) == Some(&b'}') { self.i += 1; return Ok(Json::Obj(o)); }
                loop { self.ws(); let k = self.string()?; self.eat(b':')?; let v = self.value()?; o.push((k, v)); self.ws();
                    match self.s.get(self.i) { Some(b',') => { self.i += 1; } Some(b'}') => { self.i += 1; return Ok(Json::Obj(o)); } _ => return Err(format!("bad object at {}", self.i)) } } }
            b'[' => { self.i += 1; let mut a = Vec::new(); self.ws(); if self.s.get(self.i) == Some(&b']') { self.i += 1; return Ok(Json::Arr(a)); }
                loop { let v = self.value()?; a.push(v); self.ws();
                    match self.s.get(self.i) { Some(b',') => { self.i += 1; } Some(b']') => { self.i += 1; return Ok(Json::Arr(a)); } _ => return Err(format!("bad array at {}", self.i)) } } }
            b'"' => Ok(Json::Str(self.string()?)),
            b't' if self.s[self.i..].starts_with(b"true") => { self.i += 4; Ok(Json::Bool(true)) }
            b'f' if self.s[self.i..].starts_with(b"false") => { self.i += 5; Ok(Json::Bool(false)) }
            b'n' if self.s[self.i..].starts_with(b"null") => { self.i += 4; Ok(Json::Null) }
            _ => { let st = self.i; while self.i < self.s.len() && matches!(self.s[self.i], b'0'..=b'9' | b'-' | b'+' | b'.' | b'e' | b'E') { self.i += 1; }
                std::str::from_utf8(&self.s[st..self.i]).ok().and_then(|t| t.parse::<f64>().ok()).map(Json::Num).ok_or_else(|| format!("bad number at {st}")) }
        }
    }
    fn string(&mut self) -> Result<String, String> {
        self.eat(b'"')?; let mut out = Vec::new();
        loop {
            let c = *self.s.get(self.i).ok_or("unterminated string")?; self.i += 1;
            match c { b'"' => break, b'\\' => { let e = *self.s.get(self.i).ok_or("bad escape")?; self.i += 1;
                    match e { b'n' => out.push(b'\n'), b't' => out.push(b'\t'), b'r' => out.push(b'\r'), b'u' => { let h = std::str::from_utf8(self.s.get(self.i..self.i + 4).ok_or("bad \\u")?).map_err(|_| "bad \\u")?; let cp = u32::from_str_radix(h, 16).map_err(|_| "bad \\u")?; self.i += 4; let mut b = [0u8; 4]; out.extend_from_slice(char::from_u32(cp).unwrap_or('?').encode_utf8(&mut b).as_bytes()); } x => out.push(x) } }
                x => out.push(x) }
        }
        String::from_utf8(out).map_err(|_| "bad utf8".into())
    }
}
pub fn parse_json(s: &str) -> Result<Json, String> { let mut p = P { s: s.as_bytes(), i: 0 }; let v = p.value()?; p.ws(); if p.i != s.len() { return Err(format!("trailing at {}", p.i)); } Ok(v) }

/* ── 규칙 표 ── */
#[derive(Clone, Debug)]
pub struct Draw { pub name: String, pub n: usize, pub with_main: bool, pub not_main: bool }
#[derive(Clone, Debug, Default)]
pub struct KindRule { pub main: bool, pub boss_main: bool, pub avoid_prev: bool, pub draws: Vec<Draw> }
#[derive(Clone, Debug)]
pub struct Slot { pub kind: String, pub from: usize, pub to: usize, pub every: usize }
#[derive(Clone, Debug)]
pub struct Spec {
    pub floors: usize, pub stage_div: usize, pub cols: Vec<(usize, usize)>, pub middle: (usize, usize),
    pub entry: String, pub exit: String, pub last_exit: String, pub guard: Option<String>,
    pub slots: Vec<Slot>, pub fill: Vec<String>, pub items: u32, pub main_key: String, pub boss_item: bool,
    pub kinds: Vec<(String, KindRule)>,
}
impl Spec {
    pub fn from_json(j: &Json) -> Result<Spec, String> {
        let floors = j.get("floors").and_then(|v| v.int()).unwrap_or(9).max(1) as usize;
        let stage_div = j.get("stage_div").and_then(|v| v.int()).unwrap_or(3).max(1) as usize;
        let cols = match j.get("cols") {
            Some(Json::Num(n)) => vec![(1, *n as usize)],
            Some(Json::Arr(a)) => a.iter().map(|p| { let q = p.arr().ok_or("cols")?; Ok((q.first().and_then(|x| x.int()).ok_or("cols from")? as usize, q.get(1).and_then(|x| x.int()).ok_or("cols n")? as usize)) }).collect::<Result<Vec<_>, String>>()?,
            None => vec![(1, 4)], _ => return Err("cols".into()),
        };
        if cols.iter().any(|c| c.1 < 3) { return Err("cols < 3".into()); }
        let middle = j.get("middle").and_then(|v| v.arr()).map(|a| (a.first().and_then(|x| x.int()).unwrap_or(2) as usize, a.get(1).and_then(|x| x.int()).unwrap_or(3) as usize)).unwrap_or((2, 3));
        if middle.0 < 1 || middle.1 < middle.0 { return Err("middle".into()); }
        let s = |k: &str, d: &str| j.get(k).and_then(|v| v.str()).unwrap_or(d).to_string();
        let guard = match j.get("guard") { Some(Json::Str(g)) => Some(g.clone()), _ => None };
        let slots = j.get("slots").and_then(|v| v.arr()).map(|a| a.iter().map(|o| Ok(Slot { kind: o.get("kind").and_then(|v| v.str()).ok_or("slot kind")?.to_string(),
            from: o.get("from").and_then(|v| v.int()).unwrap_or(1) as usize, to: o.get("to").and_then(|v| v.int()).unwrap_or(i64::MAX / 2) as usize, every: o.get("every").and_then(|v| v.int()).unwrap_or(0) as usize })).collect::<Result<Vec<_>, String>>()).unwrap_or(Ok(Vec::new()))?;
        let fill: Vec<String> = j.get("fill").and_then(|v| v.arr()).map(|a| a.iter().filter_map(|x| x.str().map(String::from)).collect()).unwrap_or_default();
        if slots.is_empty() && fill.is_empty() { return Err("slots or fill".into()); }
        let items = j.get("items").and_then(|v| v.int()).unwrap_or(0).max(0) as u32;
        let mut kinds = Vec::new();
        if let Some(Json::Obj(o)) = j.get("kinds") {
            for (k, v) in o {
                let mut r = KindRule::default();
                match v.get("main") { Some(Json::Bool(true)) => r.main = true, Some(Json::Str(s)) if s == "boss" => { r.main = true; r.boss_main = true; } _ => {} }
                r.avoid_prev = v.get("avoid_prev").and_then(|x| x.boolean()).unwrap_or(false);
                if let Some(Json::Obj(d)) = v.get("draws") {
                    for (name, dv) in d { r.draws.push(Draw { name: name.clone(), n: dv.get("n").and_then(|x| x.int()).unwrap_or(1).max(1) as usize, with_main: dv.get("with_main").and_then(|x| x.boolean()).unwrap_or(false), not_main: dv.get("not_main").and_then(|x| x.boolean()).unwrap_or(false) }); }
                }
                kinds.push((k.clone(), r));
            }
        }
        let boss_item = j.get("boss_item").and_then(|v| v.boolean()).unwrap_or(items > 0 && kinds.iter().any(|(_, r)| r.boss_main));
        Ok(Spec { floors, stage_div, cols, middle, entry: s("entry", "entry"), exit: s("exit", "stairs"), last_exit: s("last_exit", "boss"), guard, slots, fill, items, main_key: s("main_key", "item"), boss_item, kinds })
    }
    pub fn cols_for(&self, n: usize) -> usize { let mut c = self.cols[0].1; for &(from, k) in &self.cols { if n >= from { c = k; } } c }
    pub fn rule(&self, kind: &str) -> Option<&KindRule> { self.kinds.iter().find(|(k, _)| k == kind).map(|(_, r)| r) }
    /// 아이템 수가 모자라지 않나 — 한 층의 main 이 다 다르고(guard 열 + main 인 slots), avoid_prev 면 윗층 것도 피하고, 보스 것도 빼고, draws 도 다 들어가려면
    pub fn min_items(&self) -> u32 {
        let maxdraw = self.kinds.iter().flat_map(|(_, r)| r.draws.iter().map(|d| d.n as u32 + 1)).max().unwrap_or(0);
        let is_main = |k: &str| self.rule(k).map(|r| r.main && !r.boss_main).unwrap_or(false);
        let avoids = |k: &str| self.rule(k).map(|r| r.main && r.avoid_prev).unwrap_or(false);
        let guard_n = self.guard.as_ref().map(|g| (if is_main(g) { self.middle.1 } else { 0 }, if avoids(g) { self.middle.1 } else { 0 })).unwrap_or((0, 0));
        let this = guard_n.0 + self.slots.iter().filter(|s| is_main(&s.kind)).count();
        let prev = guard_n.1 + self.slots.iter().filter(|s| avoids(&s.kind)).count();
        let boss = u32::from(self.boss_item);
        maxdraw.max((this + prev) as u32 + boss).max(if self.items > 0 { 1 } else { 0 })
    }
}

#[derive(Clone, Debug)]
pub struct Room { pub id: usize, pub col: usize, pub row: usize, pub kind: String, pub main: Option<u32>, pub draws: Vec<(String, Vec<u32>)> }
#[derive(Clone, Debug)]
pub struct Floor { pub n: usize, pub stage: usize, pub cols: usize, pub rooms: Vec<Room>, pub edges: Vec<(usize, usize)> }
#[derive(Clone, Debug)]
pub struct Plan { pub seed: (u32, u32), pub items: u32, pub floors: Vec<Floor>, pub boss: Option<u32>, pub main_key: String }

/// 이웃 열 사이의 단조 길 — 두 열의 방을 위에서 아래로 짝지어 간다. 모든 방이 양쪽으로 적어도 하나씩 이어지고 길이 엇갈리지 않는다
fn link(rng: &mut Rng, left: &[usize], right: &[usize], out: &mut Vec<(usize, usize)>) {
    let (mut i, mut j) = (0usize, 0usize);
    out.push((left[0], right[0]));
    while i + 1 < left.len() || j + 1 < right.len() {
        match (i + 1 < left.len(), j + 1 < right.len()) {
            (true, true) => match rng.below(3) { 0 => i += 1, 1 => j += 1, _ => { i += 1; j += 1; } },
            (true, false) => i += 1,
            (false, true) => j += 1,
            _ => unreachable!(),
        }
        out.push((left[i], right[j]));
    }
}

fn gen_floor(sp: &Spec, n: usize, rng: &mut Rng, recent: &[u32], boss: Option<u32>) -> Floor {
    let cols = sp.cols_for(n);
    let mut rooms: Vec<Room> = Vec::new();
    let mut by_col: Vec<Vec<usize>> = vec![Vec::new(); cols];
    let push = |rooms: &mut Vec<Room>, by_col: &mut Vec<Vec<usize>>, col: usize, kind: &str| {
        let id = rooms.len(); let row = by_col[col].len();
        rooms.push(Room { id, col, row, kind: kind.to_string(), main: None, draws: Vec::new() });
        by_col[col].push(id); id
    };
    push(&mut rooms, &mut by_col, 0, &sp.entry);
    for c in 1..cols - 1 { let k = sp.middle.0 + rng.below(sp.middle.1 - sp.middle.0 + 1); for _ in 0..k { push(&mut rooms, &mut by_col, c, ""); } }
    push(&mut rooms, &mut by_col, cols - 1, if n == sp.floors { &sp.last_exit } else { &sp.exit });

    /* 종류 — 나가는 자리 앞 열은 guard, 그 앞 열들은 slots 를 급한 차례로 채우고 자리에 맞게 자른 뒤 섞는다 */
    let (front_cols, guard_col) = if sp.guard.is_some() && cols >= 4 { (1..cols - 2, Some(cols - 2)) } else { (1..cols - 1, None) };
    if let Some(gc) = guard_col { for &rid in &by_col[gc] { rooms[rid].kind = sp.guard.clone().unwrap(); } }
    let mut front: Vec<usize> = front_cols.flat_map(|c| by_col[c].clone()).collect();
    rng.shuffle(&mut front);
    let mut kinds: Vec<String> = Vec::new();
    for s in &sp.slots { if n >= s.from && n <= s.to && (s.every == 0 || n % s.every == 0) { kinds.push(s.kind.clone()); } }
    while kinds.len() < front.len() { kinds.push(if sp.fill.is_empty() { sp.slots[0].kind.clone() } else { sp.fill[rng.below(sp.fill.len())].clone() }); }
    kinds.truncate(front.len());
    rng.shuffle(&mut kinds);
    for (idx, &rid) in front.iter().enumerate() { rooms[rid].kind = kinds[idx].clone(); }

    /* 아이템 — main 은 층 안에서 겹치지 않고, avoid_prev 면 윗층의 것과 보스 것을 피한다. draws 는 main 과 함께/빼고 뽑는다 */
    if sp.items > 0 {
        let all: Vec<u32> = (0..sp.items).collect();
        let mut used: Vec<u32> = Vec::new();
        for rid in 0..rooms.len() {
            let rule = match sp.rule(&rooms[rid].kind) { Some(r) => r.clone(), None => continue };
            let main = if rule.boss_main { boss } else if rule.main {
                let fresh: Vec<u32> = all.iter().copied().filter(|b| Some(*b) != boss && !used.contains(b) && !(rule.avoid_prev && recent.contains(b))).collect();
                let pool = if fresh.is_empty() { all.iter().copied().filter(|b| Some(*b) != boss && !used.contains(b)).collect::<Vec<_>>() } else { fresh };
                let pool = if pool.is_empty() { all.clone() } else { pool };
                let m = pool[rng.below(pool.len())]; used.push(m); Some(m)
            } else { None };
            rooms[rid].main = main;
            for d in &rule.draws {
                let others: Vec<u32> = all.iter().copied().filter(|b| Some(*b) != main).collect();
                let v = if d.with_main && main.is_some() { let mut v = vec![main.unwrap()]; v.extend(rng.pick(&others, d.n - 1)); v }
                    else if d.not_main { rng.pick(&others, d.n) } else { rng.pick(&all, d.n) };
                rooms[rid].draws.push((d.name.clone(), v));
            }
        }
    }
    let mut edges = Vec::new();
    for c in 0..cols - 1 { link(rng, &by_col[c], &by_col[c + 1], &mut edges); }
    Floor { n, stage: (n - 1) / sp.stage_div, cols, rooms, edges }
}

pub fn generate(sp: &Spec, seed_lo: u32, seed_hi: u32) -> Option<Plan> {
    if sp.items > 0 && sp.items < sp.min_items() { return None; }
    let mut rng = Rng::new(seed_lo, seed_hi);
    let boss = if sp.items > 0 && sp.boss_item { Some(rng.below(sp.items as usize) as u32) } else { None };
    let mut floors = Vec::with_capacity(sp.floors);
    let mut recent: Vec<u32> = Vec::new();
    for n in 1..=sp.floors {
        let f = gen_floor(sp, n, &mut rng, &recent, boss);
        recent = f.rooms.iter().filter(|r| sp.rule(&r.kind).map(|k| k.avoid_prev).unwrap_or(false)).filter_map(|r| r.main).collect();
        floors.push(f);
    }
    Some(Plan { seed: (seed_lo, seed_hi), items: sp.items, floors, boss, main_key: sp.main_key.clone() })
}
pub fn generate_spec(spec: &str, seed_lo: u32, seed_hi: u32) -> Result<Plan, String> { let sp = Spec::from_json(&parse_json(spec)?)?; generate(&sp, seed_lo, seed_hi).ok_or_else(|| "items".into()) }

/* ── JSON — 손으로 쓴다. 종류 이름은 규칙 표에서 왔으니 글자열로 벗어나게 적는다 ── */
fn esc(s: &str) -> String { s.chars().flat_map(|c| match c { '"' => vec!['\\', '"'], '\\' => vec!['\\', '\\'], '\n' => vec!['\\', 'n'], c => vec![c] }).collect() }
fn nums(v: &[u32]) -> String { let s: Vec<String> = v.iter().map(|x| x.to_string()).collect(); format!("[{}]", s.join(",")) }
pub fn to_json(p: &Plan) -> String {
    let mut s = String::with_capacity(8192);
    s.push_str(&format!("{{\"v\":{},\"seed\":[{},{}],\"books\":{},\"items\":{},\"boss\":{},\"floors\":[", API_VERSION, p.seed.0, p.seed.1, p.items, p.items, p.boss.map(|b| b.to_string()).unwrap_or_else(|| "null".into())));
    for (fi, f) in p.floors.iter().enumerate() {
        if fi > 0 { s.push(','); }
        s.push_str(&format!("{{\"n\":{},\"stage\":{},\"cols\":{},\"rooms\":[", f.n, f.stage, f.cols));
        for (ri, r) in f.rooms.iter().enumerate() {
            if ri > 0 { s.push(','); }
            s.push_str(&format!("{{\"id\":{},\"col\":{},\"row\":{},\"kind\":\"{}\"", r.id, r.col, r.row, esc(&r.kind)));
            if let Some(b) = r.main { s.push_str(&format!(",\"{}\":{}", esc(&p.main_key), b)); }
            for (name, v) in &r.draws { s.push_str(&format!(",\"{}\":{}", esc(name), nums(v))); }
            s.push('}');
        }
        s.push_str("],\"edges\":[");
        for (ei, e) in f.edges.iter().enumerate() { if ei > 0 { s.push(','); } s.push_str(&format!("[{},{}]", e.0, e.1)); }
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
pub extern "C" fn book_spec_ptr() -> *const u8 { BOOK_SPEC.as_ptr() }
#[no_mangle]
pub extern "C" fn book_spec_len() -> usize { BOOK_SPEC.len() }
/// 자리 받기·돌려주기 — 규칙 표를 써 넣는 데 쓴다(8바이트 맞춤)
#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 { let mut v: Vec<u64> = Vec::with_capacity(len.div_ceil(8).max(1)); let p = v.as_mut_ptr() as *mut u8; std::mem::forget(v); p }
#[no_mangle]
pub extern "C" fn dealloc(ptr: *mut u8, len: usize) { unsafe { drop(Vec::from_raw_parts(ptr as *mut u64, 0, len.div_ceil(8).max(1))); } }
fn finish(r: Result<Plan, String>) -> usize {
    let s = match r { Ok(p) => to_json(&p), Err(e) => { OUT.with(|o| *o.borrow_mut() = format!("{{\"error\":\"{}\"}}", esc(&e))); return 0; } };
    let n = s.len(); OUT.with(|o| *o.borrow_mut() = s); n
}
/// 책 규칙 표로 지도를 짠다(책 수만 바꿔). 돌려주는 값은 JSON 길이, 못 짜면 0(그때 plan_ptr 의 글은 {"error":…})
#[no_mangle]
pub extern "C" fn plan(seed_lo: u32, seed_hi: u32, books: u32) -> usize {
    finish(parse_json(BOOK_SPEC).and_then(|j| Spec::from_json(&j)).and_then(|mut sp| { sp.items = books; generate(&sp, seed_lo, seed_hi).ok_or_else(|| "items".to_string()) }))
}
/// 아무 규칙 표(JSON, 자리는 alloc 으로)로 지도를 짠다
#[no_mangle]
pub extern "C" fn plan_spec(seed_lo: u32, seed_hi: u32, ptr: *const u8, len: usize) -> usize {
    let spec = unsafe { std::slice::from_raw_parts(ptr, len) };
    finish(std::str::from_utf8(spec).map_err(|_| "utf8".to_string()).and_then(|s| generate_spec(s, seed_lo, seed_hi)))
}
/// 마지막 plan 의 글이 있는 자리
#[no_mangle]
pub extern "C" fn plan_ptr() -> *const u8 { OUT.with(|o| o.borrow().as_ptr()) }
#[no_mangle]
pub extern "C" fn plan_len() -> usize { OUT.with(|o| o.borrow().len()) }

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::{HashSet, VecDeque};

    /// 신화 던전 — 두 층, 층마다 열 아홉(들어온 자리 + 가운데 일곱 + 보스), 가운데 방 1~3, 보스 앞 열은 싸움, 제단·문·상점·휴식 하나씩, 싸움 둘 더, 남으면 싸움·휴식. 아이템 없음
    pub const MYTH_SPEC: &str = r#"{"floors":2,"stage_div":1,"cols":9,"middle":[1,3],"entry":"entry","exit":"boss","last_exit":"boss","guard":"fight",
      "slots":[{"kind":"shrine"},{"kind":"gate"},{"kind":"shop"},{"kind":"rest"},{"kind":"fight"},{"kind":"fight"}],"fill":["fight","rest"],"items":0,"kinds":{}}"#;

    fn structure(sp: &Spec, p: &Plan) {
        assert_eq!(p.floors.len(), sp.floors);
        for (fi, f) in p.floors.iter().enumerate() {
            assert_eq!(f.n, fi + 1); assert_eq!(f.stage, (f.n - 1) / sp.stage_div); assert_eq!(f.cols, sp.cols_for(f.n));
            assert_eq!(f.rooms.iter().map(|r| r.id).collect::<Vec<_>>(), (0..f.rooms.len()).collect::<Vec<_>>());
            let col = |c: usize| f.rooms.iter().filter(|r| r.col == c).count();
            assert_eq!(col(0), 1); assert_eq!(col(f.cols - 1), 1);
            for c in 1..f.cols - 1 { assert!((sp.middle.0..=sp.middle.1).contains(&col(c)), "가운데 열 방 수"); }
            assert_eq!(f.rooms[0].kind, sp.entry);
            assert_eq!(f.rooms.iter().find(|r| r.col == f.cols - 1).unwrap().kind, if f.n == sp.floors { sp.last_exit.clone() } else { sp.exit.clone() });
            for &(a, b) in &f.edges { assert_eq!(f.rooms[b].col, f.rooms[a].col + 1); }
            for r in &f.rooms { if r.col > 0 { assert!(f.edges.iter().any(|e| e.1 == r.id)); } if r.col < f.cols - 1 { assert!(f.edges.iter().any(|e| e.0 == r.id)); } }
            for &(a, b) in &f.edges { for &(c, d) in &f.edges { if f.rooms[a].col == f.rooms[c].col && f.rooms[a].row < f.rooms[c].row { assert!(f.rooms[b].row <= f.rooms[d].row, "엇갈림"); } } }
            let mut seen = vec![false; f.rooms.len()]; let mut q = VecDeque::from([0usize]); seen[0] = true;
            while let Some(x) = q.pop_front() { for &(a, b) in &f.edges { if a == x && !seen[b] { seen[b] = true; q.push_back(b); } } }
            assert!(seen.iter().all(|&s| s), "닿지 않는 방");
            if let Some(g) = &sp.guard { assert!(f.rooms.iter().filter(|r| r.col == f.cols - 2).all(|r| &r.kind == g), "guard 열"); }
            for r in &f.rooms { assert!(!r.kind.is_empty()); }
            /* slots — 켜진 것은 자리가 있으면 다 들어간다(앞 열 방 수까지) */
            let front: usize = (1..f.cols - if sp.guard.is_some() { 2 } else { 1 }).map(col).sum();
            let mut want: Vec<&str> = sp.slots.iter().filter(|s| f.n >= s.from && f.n <= s.to && (s.every == 0 || f.n % s.every == 0)).map(|s| s.kind.as_str()).collect();
            want.truncate(front);
            for k in want.iter().collect::<HashSet<_>>() { let need = want.iter().filter(|x| *x == k).count(); let have = f.rooms.iter().filter(|r| r.col > 0 && r.col < f.cols - 1 && Some(r.col) != sp.guard.as_ref().map(|_| f.cols - 2) && r.kind == *k).count(); assert!(have >= need, "{} 가 {need} 있어야 하는데 {have}", k); }
        }
    }
    fn items(sp: &Spec, p: &Plan) {
        let mut prev: Vec<u32> = Vec::new();
        for f in &p.floors {
            let mut here: HashSet<u32> = HashSet::new();
            for r in &f.rooms {
                let rule = sp.rule(&r.kind);
                match rule {
                    Some(k) if k.boss_main => assert_eq!(r.main, p.boss),
                    Some(k) if k.main => { let m = r.main.expect("main"); assert!(m < sp.items && Some(m) != p.boss); assert!(here.insert(m), "한 층에 같은 main"); if k.avoid_prev { assert!(!prev.contains(&m), "윗층 것을 또"); } }
                    _ => assert!(r.main.is_none()),
                }
                if let Some(k) = rule { for d in &k.draws { let v = &r.draws.iter().find(|(n, _)| n == &d.name).unwrap().1; assert_eq!(v.len(), d.n); assert_eq!(v.iter().collect::<HashSet<_>>().len(), d.n, "draw 겹침"); if d.with_main { assert_eq!(Some(v[0]), r.main); } if d.not_main { assert!(!v.contains(&r.main.unwrap())); } } }
                else { assert!(r.draws.is_empty()); }
            }
            prev = f.rooms.iter().filter(|r| sp.rule(&r.kind).map(|k| k.avoid_prev).unwrap_or(false)).filter_map(|r| r.main).collect();
        }
    }
    fn book_rules(p: &Plan) {   /* 책 규칙 표 고유 — docs/RUN_DESIGN.md 2절 */
        let mut met: HashSet<u32> = HashSet::new();
        for f in &p.floors {
            let meets = f.rooms.iter().filter(|r| r.kind == "meet").count();
            let guard = f.rooms.iter().filter(|r| r.col == f.cols - 2).count();
            assert_eq!(meets, guard + usize::from(f.n >= 4), "싸움 수");
            assert!(meets < f.rooms.len() - 2);
            assert!(f.rooms.iter().any(|r| r.kind == "read"));
            if f.n % 2 == 0 { assert!(f.rooms.iter().any(|r| r.kind == "rest")); }
            for r in &f.rooms { if r.kind == "meet" { met.insert(r.main.unwrap()); } }
        }
        assert!(!met.contains(&p.boss.unwrap()));
    }
    fn book() -> Spec { Spec::from_json(&parse_json(BOOK_SPEC).unwrap()).unwrap() }
    fn myth() -> Spec { Spec::from_json(&parse_json(MYTH_SPEC).unwrap()).unwrap() }

    #[test]
    fn json_reader() {
        let j = parse_json(r#"{"a":[1,2.5,-3],"b":"x\"y\\n","c":true,"d":null,"e":{}}"#).unwrap();
        assert_eq!(j.get("a").unwrap().arr().unwrap()[1].num(), Some(2.5)); assert_eq!(j.get("b").unwrap().str(), Some("x\"y\\n")); assert_eq!(j.get("c").unwrap().boolean(), Some(true));
        assert!(parse_json("{").is_err()); assert!(parse_json("[1,]").is_err());
    }
    #[test]
    fn same_seed_same_plan() {
        let a = to_json(&generate(&book(), 7, 11).unwrap()); let b = to_json(&generate(&book(), 7, 11).unwrap());
        assert_eq!(a, b); assert_ne!(a, to_json(&generate(&book(), 8, 11).unwrap()));
    }
    #[test]
    fn book_spec_keeps_the_rules() {
        let sp = book();
        for s in 0..3000u32 { let p = generate(&sp, s, s.wrapping_mul(2654435761)).unwrap(); structure(&sp, &p); items(&sp, &p); book_rules(&p); }
        let mut small = book(); small.items = 10; for s in 0..300u32 { let p = generate(&small, s, 1).unwrap(); structure(&small, &p); items(&small, &p); book_rules(&p); }
        let mut few = book(); few.items = 9; assert!(generate(&few, 1, 1).is_none(), "책이 모자라면 못 짠다"); assert_eq!(book().min_items(), 10);
    }
    #[test]
    fn myth_spec_keeps_the_rules() {
        let sp = myth();
        for s in 0..3000u32 { let p = generate(&sp, s, s ^ 0x9e3779b9).unwrap(); structure(&sp, &p); items(&sp, &p);
            for f in &p.floors { assert_eq!(f.cols, 9); assert!(f.rooms.iter().filter(|r| r.col == 7).all(|r| r.kind == "fight")); for k in ["shrine", "gate", "shop", "rest"] { assert!(f.rooms.iter().any(|r| r.kind == k), "{k}"); }
                assert!(f.rooms.iter().filter(|r| r.kind == "fight").count() >= 3); assert!(f.rooms.iter().all(|r| r.main.is_none() && r.draws.is_empty())); assert_eq!(f.rooms.iter().filter(|r| r.kind == "boss").count(), 1); }
            assert!(p.boss.is_none()); }
    }
    #[test]
    fn spec_errors() {
        assert!(generate_spec(r#"{"cols":2}"#, 1, 1).is_err());
        assert!(generate_spec(r#"{"floors":1,"cols":3,"middle":[1,1],"fill":["x"]}"#, 1, 1).is_ok(), "가장 작은 표 — 들어온 자리·방 하나·나가는 자리");
        assert!(generate_spec("nope", 1, 1).is_err());
    }
    #[test]
    fn json_is_well_formed_and_exports_work() {
        let s = to_json(&generate(&book(), 3, 4).unwrap());
        assert!(s.starts_with("{\"v\":2,\"seed\":[3,4],\"books\":20,\"items\":20,\"boss\":"));
        assert_eq!(s.matches('{').count(), s.matches('}').count()); assert!(s.contains("\"kind\":\"boss\"") && s.contains("\"book\":") && s.contains("\"offers\":"));
        let n = plan(5, 6, 20); assert!(n > 1000);
        let bytes = unsafe { std::slice::from_raw_parts(plan_ptr(), n) }; assert_eq!(std::str::from_utf8(bytes).unwrap(), to_json(&generate(&book(), 5, 6).unwrap()));
        assert_eq!(plan(1, 1, 3), 0); assert!(unsafe { std::str::from_utf8(std::slice::from_raw_parts(plan_ptr(), plan_len())).unwrap() }.contains("error"));
        let m = plan_spec(1, 2, MYTH_SPEC.as_ptr(), MYTH_SPEC.len()); assert!(m > 500);
        let mj = unsafe { std::str::from_utf8(std::slice::from_raw_parts(plan_ptr(), m)).unwrap() }; assert!(mj.contains("\"kind\":\"shrine\"") && mj.contains("\"boss\":null"));
        assert_eq!(source_hash_len(), 16); assert_eq!(book_spec_len(), BOOK_SPEC.len());
    }
}
