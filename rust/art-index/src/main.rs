//! art-index — 그림 저장소의 그림을 읽어 data/art-index.json 을 쓴다(모자이크 서명·dHash·색 막대).
//!
//!   cargo run --release -p art-index                 # rust/ 에서. 기본 자리를 쓴다
//!   cargo run --release -p art-index -- --check      # 다시 셈해 지금 파일과 같은지만 본다(다르면 1)
//!   --images <자리>  (여러 번) 그림을 찾을 자리, 앞의 것부터. 기본: ../book-atelier-img/img/thumb → ../book-atelier-img/img → img/thumb → img
//!   --registry <파일>  등록부(기본 data/img.json) — 여기 적힌 파일만 넣는다
//!   --out <파일>       기본 data/art-index.json
//!
//! 같은 그림이면 같은 파일이 나온다 — 열쇠는 줄 세우고, 시각 같은 것은 적지 않는다.
use art_core::{features, Pixels, GX, GY, HIST_SIDE};
use serde_json::{json, Map, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};
use std::process::ExitCode;

const VERSION: u32 = 1;

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
    let mut out = root.join("data/art-index.json");
    let mut check = false;
    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        match a.as_str() {
            "--images" => images.push(args.next().expect("--images <자리>").into()),
            "--registry" => registry = args.next().expect("--registry <파일>").into(),
            "--out" => out = args.next().expect("--out <파일>").into(),
            "--check" => check = true,
            "-h" | "--help" => {
                println!("art-index [--images DIR]... [--registry data/img.json] [--out data/art-index.json] [--check]");
                return ExitCode::SUCCESS;
            }
            other => {
                eprintln!("모르는 인자: {other}");
                return ExitCode::from(2);
            }
        }
    }
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
    if check {
        let now = std::fs::read_to_string(&out).unwrap_or_default();
        if now == text {
            println!("art-index 그대로: {} — {n}장", out.display());
            return ExitCode::SUCCESS;
        }
        eprintln!("art-index 가 묵었다: {} — cargo run --release -p art-index 로 다시 만든다", out.display());
        return ExitCode::from(1);
    }
    if let Err(e) = std::fs::write(&out, &text) {
        eprintln!("못 썼다 {}: {e}", out.display());
        return ExitCode::from(1);
    }
    println!("art-index: {} — {n}장(썸네일 {from_thumb}), 건너뜀 {}", out.display(), missing.len());
    ExitCode::SUCCESS
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
