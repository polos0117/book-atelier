#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""책 설계표(data/book-design.json) 검사. docs/GAME_CONCEPT.md 5·6·7절의 규칙을 기계로 본다.

  python3 tools/book-design.py check   — 어기는 칸이 있으면 1 로 끝난다. 경고(!)는 알리기만 한다
  python3 tools/book-design.py conflicts [key] [--all] — 폼 지시문 충돌 후보(차림·자세·상징·개방이 말로 부딪히는 곳). 기본은 그림 없는 책만

보는 것:
  - 칸이 다 찼나(원전 범위·인용 출처·한 줄 인격·욕망·갈등·상징 셋·질문→갈등→답·장르·시대·지역·형태와 재료)
  - 정한 말(vocab)만 썼나 — 장르·실루엣 축 6·얼굴 5 묶음·역할·인용 출처·장정·얼굴 계통
  - 어느 두 책도 실루엣 축 6 중 셋 이상, 얼굴 5 묶음 중 둘 이상 다르다 — 화풍의 기본 얼굴·흔한 차림으로 수렴하지 않게
  - 폼·개방이 발단·전개·결말 셋씩, 폼마다 다른 자세(pose), 개방은 한 명으로 표현된다고 확인했다(one_figure)
  - 고유 규칙: 공통 원리 하나 + 폼별 사용법 셋 + 상대의 대응. 결투는 줄(lane)이 아니라 장(章)·자리로 돈다(docs/DUEL_DESIGN.md) —
    "이 줄의·다른 줄로·뒷줄" 같은 옛 3줄 엔진 말은 못 쓴다
  - 저작권: 저자 사망 연도(작자 미상이면 anonymous, 살아 있으면 alive)·해외 보호 여부를 적는다. 한국에서 아직 보호 중인 책
    (1963년 이후 사망·생존 작가)은 경고만 한다 — 개인 취미용이라 막지 않는다(2026-10-19). 보호 중인 책(국내·해외)은
    따라 하지 않을 각색(adaptations — 영화·드라마·게임·표지)을 적는다. 생성기가 원작 글에서만 그리라는 줄을 싣는다
  - 시범(pilot)은 폼 하나·개방 하나, 시범 책끼리 장르·시대가 겹치지 않는다
  - 움직임: 개방마다 입자(particles) 하나 — 명장면 글에서 고른 정한 말(vocab.particles, lib/scene-motion.js 의 KINDS 안).
    폼의 particles 는 적지 않아도 되지만 적으면 정한 말이어야 한다(docs/SCENE_MOTION.md)"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "book-design.json")
STAGES = ["발단", "전개", "결말"]
SIL = ["body", "hair", "garment", "material", "pose", "palette"]
FACE = ["face_shape", "eyes", "brows", "nose", "lips"]
KOREA_LAST_EXPIRED_DEATH = 1962   # 1962년 이전 사망은 옛 사후 50년으로 끝났다. 1963년부터는 사후 70년
SIL_MIN, FACE_MIN = 3, 2
# 옛 3줄(lane) 엔진 전제의 말 — 새 결투(docs/DUEL_DESIGN.md)에는 줄이 없다. "줄기·줄어든다" 는 걸리지 않게 조사까지 본다
LANE_WORDS = re.compile(r"(이|다른|같은|뒷|앞|결말|발단|전개|한) ?줄|줄(을|에|로|마다| 전체| 안| 하나)")
TEXT = ["source_scope", "persona", "desire", "conflict", "era", "region", "place", "form_material", "title", "key"]   # place — 일상컷 「이야기 속 장소」 의 영어 한 줄(2026-10-26)


def check(doc):
    errs = []
    V = doc.get("vocab") or {}
    books = doc.get("books") or []
    # 그림 파일 이름·화면이 쓰는 폼 열쇠 — 셋이 다 있고 겹치지 않는 영문 소문자
    fk = V.get("form_key") or {}
    if sorted(fk) != sorted(STAGES) or len(set(fk.values())) != 3 or \
            not all(isinstance(v, str) and v.isascii() and v.isalpha() and v.islower() for v in fk.values()):
        errs.append("vocab.form_key 는 발단·전개·결말 셋을 겹치지 않는 영문 소문자 열쇠로")
    keys = [b.get("key") for b in books]
    if len(set(keys)) != len(keys):
        errs.append("key 가 겹친다")
    for b in books:
        who = b.get("title") or b.get("key") or "?"
        bad = lambda m: errs.append("%s: %s" % (who, m))
        for k in TEXT:
            if not str(b.get(k) or "").strip():
                bad("%s 이(가) 비었다" % k)
        # 열쇠는 그림 파일 이름 맨 앞에 들어간다(<key>_<폼>_<화풍>_f.webp) — 영문 소문자·숫자·밑줄만
        if b.get("key") and not re.fullmatch(r"[a-z][a-z0-9_]*", b["key"]):
            bad("key 는 영문 소문자·숫자·밑줄만 — 그림 파일 이름에 그대로 들어간다")
        if len(b.get("symbols") or []) != 3:
            bad("상징은 셋")
        # 말풍선 — 있으면 발단·전개·결말 셋 다 있고 한 줄(70자)이다
        v = b.get("voice")
        if v is not None:
            for k in STAGES:
                if not str((v if isinstance(v, dict) else {}).get(k) or "").strip():
                    bad("voice 의 %s 이(가) 비었다" % k)
                elif len(v[k]) > 70:
                    bad("voice 의 %s 이(가) 너무 길다(70자까지)" % k)
        arc = b.get("arc") or {}
        for k in ("question", "conflict", "answer"):
            if not str(arc.get(k) or "").strip():
                bad("질문→갈등→답의 %s 이(가) 비었다" % k)
        if b.get("genre") not in V.get("genre", []):
            bad("장르 %r 는 정한 말이 아니다" % b.get("genre"))
        if b.get("quote_source") not in V.get("quote_source", []):
            bad("인용 출처는 %s 중 하나 — 번역문은 따로 저작권이 있다" % "·".join(V.get("quote_source", [])))
        # 장정 — 서가가 그림 둘레에 두르는 틀(lib/book-frame.js). 서양 양장 · 한지 선장
        if b.get("binding") not in V.get("binding", []):
            bad("장정 binding=%r 는 정한 말이 아니다(%s)" % (b.get("binding"), "·".join(V.get("binding", []))))
        # 얼굴 계통 — 새 인물(첫 그림)의 FACE 줄에 실린다. 비워 두면 모델이 서구권 얼굴로 쏠렸다(2026-10-18 여섯 권 중 다섯)
        if b.get("ethnicity") not in V.get("ethnicity", []):
            bad("얼굴 계통 ethnicity=%r 는 정한 말이 아니다(생성기 외형 선택지 facial ethnicity 와 같은 열쇠)" % b.get("ethnicity"))
        for k in SIL:
            if (b.get("silhouette") or {}).get(k) not in V.get(k, []):
                bad("실루엣 %s=%r 는 정한 말이 아니다" % (k, (b.get("silhouette") or {}).get(k)))
        for k in FACE:
            if (b.get("face") or {}).get(k) not in V.get(k, []):
                bad("얼굴 %s=%r 는 정한 말이 아니다" % (k, (b.get("face") or {}).get(k)))
        # 저작권 — 한국 기준 만료
        if not b.get("anonymous") and not b.get("alive") and not isinstance(b.get("author_death"), int):
            bad("저자 사망 연도가 없다(작자 미상이면 anonymous: true, 살아 있으면 alive: true)")
        if b.get("alive") and b.get("author_death") is not None:
            bad("살아 있는 저자(alive)에 사망 연도가 있다")
        if protected(b) and not [a for a in (b.get("adaptations") or []) if str(a).strip()]:
            bad("보호 중인 책은 따라 하지 않을 각색(adaptations — 영화·드라마·게임·표지)을 적는다")
        if not isinstance(b.get("abroad_protected"), bool):
            bad("abroad_protected(해외 보호 여부)를 적는다")
        # 폼·개방
        forms, opens = b.get("forms") or {}, b.get("opens") or {}
        if sorted(forms) != sorted(STAGES) or sorted(opens) != sorted(STAGES):
            bad("폼·개방은 발단·전개·결말 셋씩")
        for s in STAGES:
            f = forms.get(s) or {}
            if not str(f.get("look") or "").strip():
                bad("%s 폼의 모습이 비었다" % s)
            if f.get("role") not in V.get("role", []):
                bad("%s 폼의 역할 %r 는 정한 말이 아니다" % (s, f.get("role")))
            # 자세 — 폼마다 다르게. 생성기의 기본 자세가 된다(STANCE 줄)
            if not str(f.get("pose") or "").strip():
                bad("%s 폼의 자세(pose)가 비었다" % s)
            o = opens.get(s) or {}
            if not str(o.get("scene") or "").strip():
                bad("%s 개방의 장면이 비었다" % s)
            if o.get("one_figure") is not True:
                bad("%s 개방을 한 명(그녀 + 사물·환경·괴물)으로 표현할 수 있는지 확인하지 않았다" % s)
            # 움직임 — 명장면이 열릴 때 터지고 그 뒤 떠도는 입자. 화면이 lib/scene-motion.js 에 그대로 넘긴다
            if o.get("particles") not in V.get("particles", []):
                bad("%s 개방의 입자 particles=%r 는 정한 말이 아니다(%s)" % (s, o.get("particles"), "·".join(V.get("particles", []))))
            if "particles" in f and f.get("particles") not in V.get("particles", []):
                bad("%s 폼의 입자 particles=%r 는 정한 말이 아니다" % (s, f.get("particles")))
        if len({(forms.get(s) or {}).get("pose") for s in STAGES}) < 3:
            bad("세 폼의 자세가 겹친다 — 넘겨 볼 때 같은 그림처럼 보인다")
        if len({(forms.get(s) or {}).get("role") for s in STAGES}) < 2:
            bad("세 폼의 역할이 다 같다 — 위아래가 아니라 쓰임이 달라야 한다")
        # 고유 규칙
        r = b.get("rule") or {}
        if not str(r.get("principle") or "").strip():
            bad("고유 규칙의 공통 원리가 비었다")
        if sorted((r.get("forms") or {})) != sorted(STAGES) or not all(str(v).strip() for v in (r.get("forms") or {}).values()):
            bad("고유 규칙의 폼별 사용법이 셋 다 있어야 한다")
        if not str(r.get("counter") or "").strip():
            bad("상대의 대응 방법이 없다")
        for where, s in [("원리", r.get("principle")), ("대응", r.get("counter"))] + [("%s 사용법" % k, v) for k, v in (r.get("forms") or {}).items()]:
            if LANE_WORDS.search(str(s or "")):
                bad("고유 규칙 %s 에 줄(lane) 말이 있다 — 결투는 장(章)·자리·맞은편으로 쓴다: %s" % (where, s))
        p = b.get("pilot")
        if p is not None and (p.get("form") not in STAGES or p.get("open") not in STAGES):
            bad("시범은 폼 하나·개방 하나(발단·전개·결말 중)")
    # 어느 두 책도 — 실루엣·얼굴
    for i in range(len(books)):
        for j in range(i + 1, len(books)):
            a, c = books[i], books[j]
            pair = "%s·%s" % (a.get("title"), c.get("title"))
            sd = sum((a.get("silhouette") or {}).get(k) != (c.get("silhouette") or {}).get(k) for k in SIL)
            fd = sum((a.get("face") or {}).get(k) != (c.get("face") or {}).get(k) for k in FACE)
            if sd < SIL_MIN:
                errs.append("%s: 실루엣 축 6 중 %d 개만 다르다(%d 이상)" % (pair, sd, SIL_MIN))
            if fd < FACE_MIN:
                errs.append("%s: 얼굴 5 묶음 중 %d 개만 다르다(%d 이상)" % (pair, fd, FACE_MIN))
    pilots = [b for b in books if b.get("pilot")]
    for i in range(len(pilots)):
        for j in range(i + 1, len(pilots)):
            a, c = pilots[i], pilots[j]
            if a.get("genre") == c.get("genre"):
                errs.append("시범 %s·%s: 장르가 같다" % (a["title"], c["title"]))
    return errs


def protected_kr(b):
    """한국에서 아직 보호 중 — 생존 작가이거나 1963년 이후 사망. lib/prompt-book.js 의 isProtected 와 같은 기준"""
    d = b.get("author_death")
    return not b.get("anonymous") and (bool(b.get("alive")) or (isinstance(d, int) and d > KOREA_LAST_EXPIRED_DEATH))


def protected(b):
    return protected_kr(b) or b.get("abroad_protected") is True


def warnings(doc):
    """막지는 않고 알리는 것 — 한국에서 아직 보호 중인 책. 넣어도 되지만 삽화·영화 디자인·번역문을 더 조심한다"""
    out = []
    for b in doc.get("books") or []:
        if not protected_kr(b):
            continue
        who, d = b.get("title") or b.get("key"), b.get("author_death")
        why = "저자가 살아 있다" if b.get("alive") else "저자가 %d년에 죽었다(%d년까지)" % (d, d + 70)
        out.append("%s: 한국에서 아직 보호 중 — %s. 원작 글에서만 그리고, 각색 디자인·번역문을 싣지 않는다" % (who, why))
    return out


# ── 폼 지시문 충돌 후보(2026-10-29, game-atelier 에서 옮김 — GTA V) ──
# 그리기 전에 지시문을 보니 설계표 칸끼리 부딪혔다. 말 겹침으로 찾는 거라 사람이 보고 고치거나,
# 괜찮으면 그 책의 conflicts_ok 에 열쇠(종류:말)를 적어 다음부터 안 뜨게 한다. 기본은 아직 그림이 없는 책만 본다.
#   garment   — 타이틀 차림에 실루엣 복식 구조(garment)의 옷이 없다(「긴 코트에 바지」 ↔ 「데님 재킷과 짧은 반바지」)
#   sig_open  — 상징(symbols)이 개방 사건과 두 말 이상 겹친다(「경찰 헬기 탐조등」 ↔ 「헬기 탐조등이 휩쓸고」 — 중반·엔딩에 헬기).
#               한 말(물건 하나)만 겹치는 건 정상 — 물건은 폼에, 사건은 개방에(동굴 입구 ↔ 빛이 새는 동굴)
#   pose_open — 폼 자세가 그 폼 개방과 같은 물건·같은 동사다(「보물 상자 뚜껑을 열며」 ↔ 「보물 상자가 열리며」 — 개방 그림이 폼에서 벌써 일어난다).
#               물건만 같으면 정상 — 폼은 준비, 개방은 터짐(열쇠를 꽂는다 ↔ 자물쇠가 풀린다)
#   look_pose — 차림이 몸에 건 물건을 자세는 손에 든다(「목에 건 선글라스」 ↔ 「선글라스를 한 손에 들고」)
GARMENT_WORDS = {
    "one_piece_dress": ["원피스", "드레스"], "armor_layered": ["갑옷", "갑주", "판금", "철"], "robe_overlap": ["겹옷", "전포", "도포", "예복", "로브", "두루마기", "가운", "장삼", "겉옷"],
    "tailored_suit": ["정장", "수트", "슈트", "재킷", "연미복", "더블릿"], "coat_trousers": ["코트"], "layered_skirt": ["치마", "스커트"],
    "cloak_wrapped": ["망토", "두건", "클로크", "외투"], "flight_suit": ["비행복", "잠수복", "슈트", "수트", "작업복"],
    "hanbok": ["한복", "저고리", "치마", "당의"],
}
PARTICLE = re.compile(r"(으로|에서|까지|처럼|마다|이며|이고|을|를|이|가|은|는|의|에|로|와|과|도|만)$")
STOP = {"그녀", "하나", "하나씩", "하늘", "순간", "둘레", "사이", "모든", "전체", "거대한", "작은", "위로", "아래", "앞으로", "속에서",
        "한꺼번에", "차례로", "그림자", "세상", "발밑", "그녀만", "빛나는", "빛으로", "빛이", "위에", "아래로", "끝으로", "이어지며", "푸른", "붉은", "누런"}
VERB_END = re.compile(r"(리며|며|고|는|어|아|여|ㄴ다|는다|인다|친다|른다|다|며서)$")
WORN = re.compile(r"(?:목|허리|등|머리|어깨|손목|이마|귀|가슴|발목)에\s*(?:건|맨|찬|두른|쓴|낀|꽂은|단|매단|올린)?\s*((?:[가-힣]{2,}\s){0,2}[가-힣]{2,})")
HELD = r"(?:을|를)\s+(?:한 손에\s+|두 손으로\s+|손에\s+)?(?:들|쥐|잡|돌리|뽑|내밀|흔들|겨누|펼쳐|받쳐)"


def words(text):
    """낱말 — 조사를 뗀 꼴과 그대로인 꼴 둘 다(「지도」 의 「도」 를 조사로 떼면 「지」 가 된다 — 문명 V 두루마리 지도를 못 잡았다)"""
    out = set()
    for w0 in re.findall(r"[가-힣]{2,}", text or ""):
        for w in (w0, PARTICLE.sub("", w0)):
            if len(w) >= 2 and w not in STOP:
                out.add(w)
    return out


def verbs(text):
    """동사 줄기 — 「열며」 → 열, 「열리며」 → 열 (리며를 떼고), 「터지며」 → 터지"""
    out = set()
    for w in re.findall(r"[가-힣]+(?:며|고|는|어|아|여|다)\b", text or ""):
        st = VERB_END.sub("", w)
        if st:
            out.add(st)
    return out


def drawn_keys():
    """그림이 이미 있는 책 — data/img.json"""
    try:
        with open(os.path.join(os.path.dirname(DATA), "img.json"), encoding="utf-8") as f:
            img = json.load(f)
    except (OSError, ValueError):
        return set()
    return {k for k, v in (img.get("img") or {}).items() if v}


def conflicts(doc, only=None, include_drawn=False):
    """폼 지시문 충돌 후보 — (책 key, 열쇠, 풀이). conflicts_ok 에 적힌 열쇠는 뺀다"""
    out = []
    stages = STAGES
    drawn = set() if (only or include_drawn) else drawn_keys()
    for g in doc.get("books") or []:
        if (only and g.get("key") != only) or g.get("key") in drawn:
            continue
        ok = set(g.get("conflicts_ok") or [])
        forms, opens = g.get("forms") or {}, g.get("opens") or {}
        found = []
        title = (forms.get(STAGES[0]) or {}).get("look", "")
        gw = GARMENT_WORDS.get((g.get("silhouette") or {}).get("garment"), [])
        if gw and not any(w in title for w in gw):
            found.append(("garment:" + g["silhouette"]["garment"], "발단 차림 %r 에 복식 구조 %s(%s)의 옷이 없다" % (title, g["silhouette"]["garment"], "·".join(gw))))
        for sig in g.get("symbols") or []:
            for st in stages:
                common = words(sig) & words((opens.get(st) or {}).get("scene", ""))
                if len(common) >= 2:
                    found.append(("sig_open:" + "·".join(sorted(common)), "상징 %r 가 %s 개방 %r 와 「%s」 를 같이 말한다 — 폼에 그 사건이 미리 그려질 수 있다" % (sig, st, opens[st]["scene"], "·".join(sorted(common)))))
        for st in stages:
            pose, scene = (forms.get(st) or {}).get("pose", ""), (opens.get(st) or {}).get("scene", "")
            nouns = words(pose) & words(scene)
            vs = [(a, b) for a in verbs(pose) for b in verbs(scene) if a == b or (len(a) < len(b) and b.startswith(a)) or (len(b) < len(a) and a.startswith(b))]
            if nouns and vs:
                found.append(("pose_open:" + "·".join(sorted(nouns)), "%s 자세 %r 가 %s 개방 %r 와 같은 물건(%s)·같은 동사(%s)다 — 개방 사건이 폼에서 벌써 일어난다"
                              % (st, pose, st, scene, "·".join(sorted(nouns)), "·".join(sorted({a for a, _ in vs})))))
            look = (forms.get(st) or {}).get("look", "")
            for obj in WORN.findall(look):
                for head in {obj.split()[-1], PARTICLE.sub("", obj.split()[-1])}:
                    if len(head) < 2 or not re.search(re.escape(head) + HELD, pose):
                        continue
                    found.append(("look_pose:" + head, "%s 차림은 「%s」 를 몸에 거는데(%r) 자세는 손에 든다(%r)" % (st, head, look, pose)))
        seen = set()
        for k, msg in found:
            if k not in ok and k not in seen:
                seen.add(k)
                out.append((g["key"], k, msg))
    return out


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "conflicts":
        with open(DATA, encoding="utf-8") as f:
            doc = json.load(f)
        args = [a for a in sys.argv[2:] if a != "--all"]
        rows = conflicts(doc, args[0] if args else None, "--all" in sys.argv)
        for key, k, msg in rows:
            print("  ? %s [%s] %s" % (key, k, msg))
        print("폼 지시문 충돌 후보 %d — 고치거나, 괜찮으면 그 책 conflicts_ok 에 [열쇠]를 적는다" % len(rows))
        return
    if len(sys.argv) < 2 or sys.argv[1] != "check":
        raise SystemExit("python3 tools/book-design.py check | conflicts [key] [--all]")
    with open(DATA, encoding="utf-8") as f:
        doc = json.load(f)
    errs = check(doc)
    for w in warnings(doc):
        print("  ! " + w)
    n = len(conflicts(doc))
    if n:
        print("  ! 그림 없는 책의 폼 지시문 충돌 후보 %d — python3 tools/book-design.py conflicts [key] 로 본다(그리기 전에 그 책은 0)" % n)
    for e in errs:
        print("  ✗ " + e)
    if errs:
        print("책 설계표 미통과 %d건" % len(errs))
        sys.exit(1)
    books = doc["books"]
    print("책 설계표 통과 — %d권 · 시범 %d권 · 어느 두 책도 실루엣 %d+·얼굴 %d+ 다름"
          % (len(books), sum(1 for b in books if b.get("pilot")), SIL_MIN, FACE_MIN))


if __name__ == "__main__":
    main()
