# -*- coding: utf-8 -*-
"""자료 파일 읽기·쓰기. pkm-atelier 의 tools/roster.py 에서 왔다.

책은 data/book-design.json 한 곳에 있다 — 책 한 권 = 한 칸, 열쇠(key)가 그림 파일 이름 맨 앞에 들어간다.
폼 열쇠는 vocab.form_key(발단 begin · 전개 middle · 결말 end), 화풍은 data/style.json 의 styles 열쇠다."""
import json, os

DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
ART_SIZE = (1024, 1536)          # 2:3 세로. 폼 초상·개방은 이 크기로 맞춘다
OPEN = "open"                    # 폼 열쇠 뒤에 붙는 개방(명장면) 자리 — begin_open


def path(name):
    return os.path.join(DIR, name if name.endswith(".json") else name + ".json")


def read(name):
    with open(path(name), encoding="utf-8") as f:
        return json.load(f)


def cards():
    """{책 열쇠: 책} — 설계표 차례 그대로."""
    return {b["key"]: b for b in read("book-design").get("books") or []}


def forms():
    """폼 열쇠 → 단계 이름(발단·전개·결말). 차례가 화면에 그대로 나가므로 dict 로 돌려준다."""
    fk = (read("book-design").get("vocab") or {}).get("form_key") or {}
    return {v: k for k, v in fk.items()}


def styles():
    """화풍 열쇠 → 이름. data/style.json 의 styles."""
    return {k: v.get("name") or k for k, v in (read("style").get("styles") or {}).items()}


def one_line(v):
    """줄바꿈 없이 한 줄로. 항목 하나가 한 줄이면 diff 로 바로 읽힌다."""
    return json.dumps(v, ensure_ascii=False, separators=(", ", ": "))


def _render(obj):
    def val(v, pad):
        if isinstance(v, list) and v and isinstance(v[0], dict):
            return "[\n" + ",\n".join(pad + " " + one_line(x) for x in v) + "\n" + pad + "]"
        if isinstance(v, dict) and len(v) > 8:
            return ("{\n" + ",\n".join('%s "%s": %s' % (pad, k, val(x, pad + " "))
                                       for k, x in v.items()) + "\n" + pad + "}")
        return one_line(v)
    return "{\n" + ",\n".join(' "%s": %s' % (k, val(v, " "))
                              for k, v in obj.items()) + "\n}\n"


def write(name, obj):
    open(path(name), "w", encoding="utf-8").write(_render(obj))


def _webp_size(rel):
    """webp 머리말에서 가로·세로만 읽는다. 외부 꾸러미 없이."""
    try:
        b = open(os.path.join(os.path.dirname(DIR), rel), "rb").read(64)
    except OSError:
        return None
    if b[:4] != b"RIFF" or b[8:12] != b"WEBP":
        return None
    if b[12:16] == b"VP8X":
        return (int.from_bytes(b[24:27], "little") + 1,
                int.from_bytes(b[27:30], "little") + 1)
    if b[12:16] == b"VP8L":
        n = int.from_bytes(b[21:25], "little")
        return ((n & 0x3FFF) + 1, ((n >> 14) & 0x3FFF) + 1)
    if b[12:16] == b"VP8 ":
        return (int.from_bytes(b[26:28], "little") & 0x3FFF,
                int.from_bytes(b[28:30], "little") & 0x3FFF)
    return None


def art_size(dirs=("img",)):
    """[(이름, 가로, 세로)…] — 그림 자리 안에서 ART_SIZE 가 아닌 그림.

    폼 초상은 나란히 놓고 견주는 자리라 크기가 같아야 한다. 연출컷·일상컷은 일부러
    다른 꼴로 뽑을 수 있으므로 여기서 서지는 않고 적어 내기만 한다."""
    root = os.path.dirname(DIR)
    bad = []
    for rel in dirs:
        d = rel if os.path.isabs(rel) else os.path.join(root, rel)
        if not os.path.isdir(d):
            continue
        for n in sorted(os.listdir(d)):
            if not n.lower().endswith(".webp"):
                continue
            sz = _webp_size(os.path.join(d, n))
            if sz and sz != ART_SIZE:
                bad.append((n, sz[0], sz[1]))
    return bad
