//! art-index — 그림 저장소의 그림을 읽어 data/art-index.json 을 쓴다(모자이크 서명·dHash·색 막대).
//!
//!   cargo run --release -p art-index                 # rust/ 에서. 기본 자리를 쓴다
//!   cargo run --release -p art-index -- --check      # 다시 셈해 지금 파일과 같은지만 본다(다르면 1)
//!   --images <자리>  (여러 번) 그림을 찾을 자리, 앞의 것부터. 기본: ../book-atelier-img/img/thumb → ../book-atelier-img/img → img/thumb → img
//!   --registry <파일>  등록부(기본 data/img.json) — 여기 적힌 파일만 넣는다
//!   --out <파일>       기본 data/art-index.json (--similar 이면 data/art-similar.json)
//!
//!   cargo run --release -p art-index -- --similar    # 닮은 그림 — data/art-index.json 만 읽어 data/art-similar.json 을 쓴다
//!   --similar --check  지금 art-similar.json 이 색인에서 다시 셈한 것과 같은지만 본다(그림 저장소가 없어도 된다)
//!   --index <파일>     --similar 가 읽을 색인(기본 data/art-index.json)
//!
//! 같은 그림이면 같은 파일이 나온다 — 열쇠는 줄 세우고, 시각 같은 것은 적지 않는다.
use art_core::{
    features, near_duplicates, nearest, Features, Pixels, Signature, GX, GY, HIST_BINS, HIST_SIDE, SIM_LAB_SCALE, SIM_W_DHASH, SIM_W_HIST,
    SIM_W_LAB,
};
use serde_json::{json, Map, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};
use std::process::ExitCode;

const VERSION: u32 = 1;
/// 닮은 그림 — 그림마다 k 장, 한 책에서는 PER_BOOK 장까지, 점수가 NEAR_BELOW 보다 작으면 "거의 같은 그림".
const SIM_K: usize = 8;
const SIM_PER_BOOK: usize = 2;
const SIM_NEAR_BELOW: u32 = 50;

fn repo_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..").canonicalize().unwrap_or_else(|_| PathBuf::from("../.."))
}

/// 등록부에서 그림 파일 이름(…webp) 전부와, 다른 저장소에 있는 것의 번호(where).
fn registered(doc: &Value) -> (BTreeSet<String>, BTreeMap<String, u64>) {
    fn walk(v: &Value, out: &mut BTreeSet<String>) {
        match v {
            Value::String(s) if s.ends_with(".webp") && !s.contains('/') => {
                out.insert(s.clone());
            }
            Value::Array(a) => a.iter().for_each(|x| walk(x, out)),
            Value::Object(o) => o.values().for_each(|x| walk(x, out)),
            _ => {}
        }
    }
    let mut files = BTreeSet::new();
    walk(doc.get("img").unwrap_or(&Value::Null), &mut files);
    let mut wh = BTreeMap::new();
    if let Some(Value::Object(o)) = doc.get("where") {
        for (k, v) in o {
            if let Some(n) = v.as_u64() {
                wh.insert(k.clone(), n);
            }
        }
    }
    (files, wh)
}

fn b64(bytes: &[u8]) -> String {
    const A: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut s = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for c in bytes.chunks(3) {
        let n = (c[0] as u32) << 16 | (*c.get(1).unwrap_or(&0) as u32) << 8 | *c.get(2).unwrap_or(&0) as u32;
        s.push(A[(n >> 18) as usize & 63] as char);
        s.push(A[(n >> 12) as usize & 63] as char);
        s.push(if c.len() > 1 { A[(n >> 6) as usize & 63] as char } else { '=' });
        s.push(if c.len() > 2 { A[n as usize & 63] as char } else { '=' });
    }
    s
}

fn unb64(s: &str) -> Option<Vec<u8>> {
    let val = |c: u8| -> Option<u32> {
        Some(match c {
            b'A'..=b'Z' => c - b'A',
            b'a'..=b'z' => c - b'a' + 26,
            b'0'..=b'9' => c - b'0' + 52,
            b'+' => 62,
            b'/' => 63,
            _ => return None,
        } as u32)
    };
    let b = s.trim_end_matches('=').as_bytes();
    let mut out = Vec::with_capacity(b.len() * 3 / 4);
    for c in b.chunks(4) {
        let mut n = 0u32;
        for (i, &x) in c.iter().enumerate() {
            n |= val(x)? << (18 - 6 * i);
        }
        out.push((n >> 16) as u8);
        if c.len() > 2 {
            out.push((n >> 8) as u8);
        }
        if c.len() > 3 {
            out.push(n as u8);
        }
    }
    Some(out)
}

/// 색인 한 줄 → 특징. 꼴이 틀리면 None.
fn entry_features(e: &Value) -> Option<Features> {
    let dhash = u64::from_str_radix(e.get("dhash")?.as_str()?, 16).ok()?;
    let h = unb64(e.get("hist")?.as_str()?)?;
    let hist: [u8; HIST_BINS] = h.try_into().ok()?;
    let lab: Vec<i16> = e.get("lab")?.as_array()?.iter().map(|v| v.as_i64().map(|x| x as i16)).collect::<Option<_>>()?;
    Some(Features { signature: Signature::from_quantized(&lab)?, dhash, hist })
}

/// 등록부의 책 열쇠마다 그 책의 그림 파일 — 파일 → 책.
fn books_of(doc: &Value) -> BTreeMap<String, String> {
    let mut out = BTreeMap::new();
    if let Some(Value::Object(img)) = doc.get("img") {
        for (book, v) in img {
            let mut fs = BTreeSet::new();
            let one = json!({ "img": v });
            fs.extend(registered(&one).0);
            for f in fs {
                out.entry(f).or_insert_with(|| book.clone());
            }
        }
    }
    out
}

/// data/art-similar.json — 색인과 등록부에서. 색인에 있어도 등록부에 없는 그림은 뺀다.
fn similar_doc(index: &Value, registry: &Value) -> Result<Map<String, Value>, String> {
    let book = books_of(registry);
    let files = index.get("files").and_then(|v| v.as_object()).ok_or("색인에 files 가 없다")?;
    let mut names = Vec::new();
    let mut items = Vec::new();
    let mut groups = Vec::new();
    let keys: Vec<&String> = book.values().collect::<BTreeSet<_>>().into_iter().collect();
    for (f, e) in files {
        let Some(b) = book.get(f) else { continue };
        let ft = entry_features(e).ok_or_else(|| format!("색인 꼴이 틀렸다: {f}"))?;
        names.push(f.clone());
        items.push(ft);
        groups.push(keys.binary_search(&b).unwrap_or(usize::MAX) as u32);
    }
    let top = nearest(&items, &groups, SIM_K, SIM_PER_BOOK);
    let mut out = Map::new();
    for (i, row) in top.iter().enumerate() {
        out.insert(names[i].clone(), Value::Array(row.iter().map(|&(j, s)| json!([names[j], s])).collect()));
    }
    let near: Vec<Value> = near_duplicates(&items, SIM_NEAR_BELOW).into_iter().map(|(i, j, s)| json!([names[i], names[j], s])).collect();
    let mut top = Map::new();
    top.insert("count".into(), json!(names.len()));
    top.insert("files".into(), Value::Object(out));
    top.insert("k".into(), json!(SIM_K));
    top.insert("near".into(), Value::Array(near));
    top.insert("near_below".into(), json!(SIM_NEAR_BELOW));
    top.insert(
        "note".into(),
        json!("닮은 그림 — 그림마다 가장 닮은 다른 그림(점수 오름차순, 같으면 이름 차례). 한 책에서는 per_book 장까지. near 는 점수가 near_below 보다 작은 쌍(같은 그림을 두 번 올렸나 살필 것). rust/art-index --similar 가 data/art-index.json 에서 만든다 — 그림을 더하면 색인 다음에 다시 만든다(docs/ART_INDEX.md)"),
    );
    top.insert("per_book".into(), json!(SIM_PER_BOOK));
    top.insert(
        "score".into(),
        json!(format!(
            "round(1000 * ({SIM_W_DHASH:.2}*hamming(dhash)/64 + {SIM_W_HIST:.2}*chi_square(hist) + {SIM_W_LAB:.2}*min(1, sig_distance(lab)/{SIM_LAB_SCALE}))), 0 = same"
        )),
    );
    top.insert("version".into(), json!(VERSION));
    Ok(top)
}

fn write_or_check(out: &Path, text: &str, check: bool, what: &str, how: &str, n: u64) -> ExitCode {
    if check {
        let now = std::fs::read_to_string(out).unwrap_or_default();
        if now == text {
            println!("{what} 그대로: {} — {n}장", out.display());
            return ExitCode::SUCCESS;
        }
        eprintln!("{what} 가 묵었다: {} — {how} 로 다시 만든다", out.display());
        return ExitCode::from(1);
    }
    if let Err(e) = std::fs::write(out, text) {
        eprintln!("못 썼다 {}: {e}", out.display());
        return ExitCode::from(1);
    }
    ExitCode::SUCCESS
}

fn read_json(p: &Path, what: &str) -> Option<Value> {
    match std::fs::read_to_string(p).map(|s| serde_json::from_str(&s)) {
        Ok(Ok(v)) => Some(v),
        _ => {
            eprintln!("{what}를 못 읽었다: {}", p.display());
            None
        }
    }
}

/// 맨 위는 한 줄에 열쇠 하나, files 는 한 줄에 그림 하나 — 그림을 더하면 그 줄만 바뀐다.
fn render(doc: &Map<String, Value>) -> String {
    let mut s = String::from("{\n");
    let n = doc.len();
    for (i, (k, v)) in doc.iter().enumerate() {
        s += &format!("  {}: ", serde_json::to_string(k).unwrap());
        if let (true, Value::Object(files)) = (k == "files", v) {
            s += "{\n";
            for (j, (f, e)) in files.iter().enumerate() {
                s += &format!("    {}: {}{}\n", serde_json::to_string(f).unwrap(), serde_json::to_string(e).unwrap(), if j + 1 < files.len() { "," } else { "" });
            }
            s += "  }";
        } else {
            s += &serde_json::to_string(v).unwrap();
        }
        s += if i + 1 < n { ",\n" } else { "\n" };
    }
    s + "}\n"
}

fn main() -> ExitCode {
    let root = repo_root();
    let mut images: Vec<PathBuf> = Vec::new();
    let mut registry = root.join("data/img.json");
    let mut out: Option<PathBuf> = None;
    let mut index = root.join("data/art-index.json");
    let mut check = false;
    let mut similar = false;
    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        match a.as_str() {
            "--images" => images.push(args.next().expect("--images <자리>").into()),
            "--registry" => registry = args.next().expect("--registry <파일>").into(),
            "--out" => out = Some(args.next().expect("--out <파일>").into()),
            "--index" => index = args.next().expect("--index <파일>").into(),
            "--check" => check = true,
            "--similar" => similar = true,
            "-h" | "--help" => {
                println!("art-index [--images DIR]... [--registry data/img.json] [--out data/art-index.json] [--check]");
                println!("art-index --similar [--index data/art-index.json] [--registry data/img.json] [--out data/art-similar.json] [--check]");
                return ExitCode::SUCCESS;
            }
            other => {
                eprintln!("모르는 인자: {other}");
                return ExitCode::from(2);
            }
        }
    }
    if similar {
        let out = out.unwrap_or_else(|| root.join("data/art-similar.json"));
        let (Some(ix), Some(reg)) = (read_json(&index, "색인"), read_json(&registry, "등록부")) else {
            return ExitCode::from(1);
        };
        let top = match similar_doc(&ix, &reg) {
            Ok(t) => t,
            Err(e) => {
                eprintln!("{e}");
                return ExitCode::from(1);
            }
        };
        let text = render(&top);
        let n = top["count"].as_u64().unwrap_or(0);
        let code = write_or_check(&out, &text, check, "art-similar", "cargo run --release -p art-index -- --similar", n);
        if !check && code == ExitCode::SUCCESS {
            println!("art-similar: {} — {n}장 × {SIM_K}, 거의 같은 쌍 {}", out.display(), top["near"].as_array().map_or(0, |a| a.len()));
        }
        for p in top["near"].as_array().into_iter().flatten() {
            println!("  거의 같은 그림: {} ↔ {} ({})", p[0].as_str().unwrap_or(""), p[1].as_str().unwrap_or(""), p[2]);
        }
        return code;
    }
    let out = out.unwrap_or_else(|| root.join("data/art-index.json"));
    let custom = !images.is_empty();
    if !custom {
        let sib = root.join("../book-atelier-img/img");
        images = vec![sib.join("thumb"), sib, root.join("img/thumb"), root.join("img")];
    }

    let doc: Value = match std::fs::read_to_string(&registry).map(|s| serde_json::from_str(&s)) {
        Ok(Ok(v)) => v,
        _ => {
            eprintln!("등록부를 못 읽었다: {}", registry.display());
            return ExitCode::from(1);
        }
    };
    let (files, wh) = registered(&doc);

    let mut entries = Map::new();
    let (mut from_thumb, mut missing) = (0usize, Vec::new());
    for f in &files {
        // 둘째 저장소부터(where = n)는 book-atelier-img-(n+1) · img-(n+1) 에서 찾는다
        let dirs: Vec<PathBuf> = match wh.get(f) {
            Some(&n) if n > 0 && !custom => {
                let sib = root.join(format!("../book-atelier-img-{}/img", n + 1));
                let loc = root.join(format!("img-{}", n + 1));
                vec![sib.join("thumb"), sib, loc.join("thumb"), loc]
            }
            _ => images.clone(),
        };
        let Some(path) = dirs.iter().map(|d| d.join(f)).find(|p| p.is_file()) else {
            missing.push(f.clone());
            continue;
        };
        let img = match image::open(&path) {
            Ok(i) => i.to_rgb8(),
            Err(e) => {
                eprintln!("못 읽은 그림 {}: {e}", path.display());
                missing.push(f.clone());
                continue;
            }
        };
        if path.parent().and_then(|p| p.file_name()).is_some_and(|n| n == "thumb") {
            from_thumb += 1;
        }
        let px = Pixels::new(img.as_raw(), img.width() as usize, img.height() as usize, 3).expect("화소");
        let ft = features(&px);
        let mut e = Map::new();
        e.insert("dhash".into(), json!(format!("{:016x}", ft.dhash)));
        e.insert("hist".into(), json!(b64(&ft.hist)));
        e.insert("lab".into(), json!(ft.signature.quantize().to_vec()));
        entries.insert(f.clone(), Value::Object(e));
    }

    let mut top = Map::new();
    top.insert("count".into(), json!(entries.len()));
    top.insert("files".into(), Value::Object(entries));
    top.insert("grid".into(), json!([GX, GY]));
    top.insert(
        "hist".into(),
        json!({"bins": [HIST_SIDE, HIST_SIDE, HIST_SIDE], "edges": {"L": [25, 50, 75], "a": [-16, 0, 16], "b": [-16, 0, 16]},
               "encoding": "base64 u8 x 64, (L*4+a)*4+b, ratio*255 rounded"}),
    );
    top.insert("lab".into(), json!("CIE Lab D65, rounded ints: grid cells row-major (L,a,b)x6, then whole-image mean (L,a,b)"));
    top.insert(
        "note".into(),
        json!("모자이크 서명·dHash·색 막대. rust/art-index 가 그림 저장소에서 만든다 — 그림을 더하면 다시 만든다(docs/ART_INDEX.md). 여기 없는 그림은 모자이크가 건너뛴다"),
    );
    top.insert("source".into(), json!("thumb 341x512 (fallback: full image)"));
    top.insert("version".into(), json!(VERSION));
    let text = render(&top);

    for f in &missing {
        eprintln!("건너뜀(그림 파일 없음): {f}");
    }
    let n = top["count"].as_u64().unwrap_or(0);
    let code = write_or_check(&out, &text, check, "art-index", "cargo run --release -p art-index", n);
    if !check && code == ExitCode::SUCCESS {
        println!("art-index: {} — {n}장(썸네일 {from_thumb}), 건너뜀 {}", out.display(), missing.len());
        println!("닮은 그림도 다시: cargo run --release -p art-index -- --similar");
    }
    code
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base64_matches_reference() {
        assert_eq!(b64(b""), "");
        assert_eq!(b64(b"f"), "Zg==");
        assert_eq!(b64(b"fo"), "Zm8=");
        assert_eq!(b64(b"foobar"), "Zm9vYmFy");
    }

    #[test]
    fn base64_round_trip() {
        for v in [&b""[..], b"f", b"fo", b"foo", b"foobar", &[0, 255, 7, 128, 64][..]] {
            assert_eq!(unb64(&b64(v)).unwrap(), v);
        }
        assert!(unb64("a*==").is_none());
    }

    fn entry(seed: u8) -> Value {
        let hist: Vec<u8> = (0..64).map(|i| if i == seed as usize % 64 { 255 } else { 0 }).collect();
        json!({"dhash": format!("{:016x}", (seed as u64) * 0x0101_0101_0101_0101), "hist": b64(&hist), "lab": vec![seed as i64; 21]})
    }

    #[test]
    fn similar_doc_caps_books_and_lists_registered_only() {
        let mut files = Map::new();
        for (f, s) in [("a1.webp", 10), ("a2.webp", 11), ("a3.webp", 12), ("b1.webp", 30), ("c1.webp", 60), ("x.webp", 10)] {
            files.insert(f.into(), entry(s));
        }
        // a1 과 같은 특징의 사본(다른 책)
        files.insert("d1.webp".into(), entry(10));
        let index = json!({"files": files});
        let reg = json!({"img": {
            "a": {"byStyle": {"s": {"casual": {"f": ["a1.webp", "a2.webp", "a3.webp"]}}}},
            "b": {"byStyle": {"s": {"byForm": {"begin": {"f": "b1.webp"}}}}},
            "c": {"byStyle": {"s": {"byForm": {"end": {"f": "c1.webp"}}}}},
            "d": {"byStyle": {"s": {"byForm": {"end": {"f": "d1.webp"}}}}}}});
        let doc = similar_doc(&index, &reg).unwrap();
        let fs = doc["files"].as_object().unwrap();
        assert!(!fs.contains_key("x.webp"), "등록 안 된 그림");
        assert_eq!(doc["count"], 6);
        let a1: Vec<&str> = fs["a1.webp"].as_array().unwrap().iter().map(|p| p[0].as_str().unwrap()).collect();
        assert_eq!(a1[0], "d1.webp", "같은 특징이 맨 앞");
        assert!(!a1.contains(&"a1.webp") && !a1.contains(&"x.webp"));
        assert_eq!(a1.iter().filter(|f| f.starts_with('a')).count(), SIM_PER_BOOK);
        assert_eq!(doc["near"], json!([["a1.webp", "d1.webp", 0]]));
        assert_eq!(render(&doc), render(&similar_doc(&index, &reg).unwrap()), "같은 입력 같은 파일");
    }

    #[test]
    fn registry_walk() {
        let doc = json!({"img": {"a": {"byStyle": {"s": {"byForm": {"begin": {"f": "a_begin_s_f.webp"}}, "casual": {"f": ["a_s_f_casual1.webp"]}}}}},
                         "where": {"a_s_f_casual1.webp": 1}, "count": 1});
        let (f, w) = registered(&doc);
        assert_eq!(f.into_iter().collect::<Vec<_>>(), vec!["a_begin_s_f.webp", "a_s_f_casual1.webp"]);
        assert_eq!(w.get("a_s_f_casual1.webp"), Some(&1));
    }

    #[test]
    fn render_is_sorted_and_one_line_per_file() {
        let mut files = Map::new();
        files.insert("b.webp".into(), json!({"lab": [1]}));
        files.insert("a.webp".into(), json!({"lab": [2]}));
        let mut top = Map::new();
        top.insert("version".into(), json!(1));
        top.insert("files".into(), Value::Object(files));
        let s = render(&top);
        assert_eq!(s, "{\n  \"files\": {\n    \"a.webp\": {\"lab\":[2]},\n    \"b.webp\": {\"lab\":[1]}\n  },\n  \"version\": 1\n}\n");
        let back: Value = serde_json::from_str(&s).unwrap();
        assert_eq!(back["version"], 1);
    }
}
