#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""game-atelier data/casual-tree-v2.json → book-atelier data/casual-tree-v2.json(2026-11-01). 모듈 · 검사기는 그대로, 표만 책 몫으로."""
import json, copy
G = json.load(open(__import__('sys').argv[1] if len(__import__('sys').argv) > 1 else __import__('os').path.join(__import__('os').path.dirname(__file__), '..', '..', 'game-atelier', 'data', 'casual-tree-v2.json')))
B1 = json.load(open(__import__('os').path.join(__import__('os').path.dirname(__file__), '..', 'data', 'casual-tree.json')))
d = copy.deepcopy(G)
book_places = {p['key'] for p in B1['places']}
book_groups = {g['key'] for g in B1['groups']}
RENAME = {f'game_{x}': f'story_{x}' for x in ('bath', 'field', 'inn', 'market', 'place', 'roof', 'room')}
DROP_EXTRA = {'library_reading', 'boardgame_lounge'}
ERA = {'release': 'book', 'in_game': 'in_story'}
# 1. 장소 받침 — 게임 장소를 이야기 장소로, 책에 없는 게임 장소는 빼고, 책 장소는 닮은 자리의 받침으로
pl = {}
for k, v in G['places'].items():
    if k == 'note': pl[k] = v; continue
    k2 = RENAME.get(k, k)
    if k2 in book_places or k in {x['key'] for x in G.get('extra_places', [])} - DROP_EXTRA:
        pl[k2] = v
ALIKE = {
 'lib_reading_room': ['chair', 'table', 'wall', 'floor'], 'lib_stacks': ['wall', 'floor', 'edge', 'chair'], 'lib_archive': ['wall', 'table', 'floor', 'chair'],
 'lib_bookshop': G['places'].get('street_shop'), 'lib_press': ['worktable', 'wall', 'floor', 'rail_waist'], 'lib_bindery': ['worktable', 'chair', 'wall', 'floor'],
 'lib_map_room': ['table', 'chair', 'wall', 'floor'], 'lib_children': ['floor', 'chair', 'wall', 'lie'], 'lib_mobile': ['wall', 'edge', 'floor', 'rail_waist'],
 'salon_cafe': G['places'].get('street_cafe'), 'salon_club': ['chair', 'table', 'floor', 'wall'], 'salon_talk': ['chair', 'wall', 'floor', 'edge'],
 'salon_poetry': ['chair', 'table', 'wall', 'edge'], 'salon_garden': ['floor', 'lie', 'edge', 'chair'], 'salon_parlor': G['places'].get('home_living'),
 'adapt_fitting': ['wall', 'floor', 'edge', 'worktable'], 'adapt_table': ['chair', 'table', 'wall', 'floor'], 'adapt_set': ['chair', 'wall', 'floor', 'edge'],
 'adapt_stage': ['floor', 'edge', 'wall', 'chair'], 'adapt_makeup': ['chair', 'table', 'wall', 'rail_waist'], 'adapt_premiere': G['places'].get('stage_redcarpet'),
}
for k, v in ALIKE.items():
    assert v, k
    pl[k] = list(v)
missing = book_places - set(pl)
assert not missing, missing
d['places'] = pl
# 2. 새 장소 — 시대 release → book(그 책이 나온 무렵) — 그 무렵에 없을 것은 지금만
NOW_ONLY = set()
d['extra_places'] = []
for x in G.get('extra_places', []):
    if x['key'] in DROP_EXTRA: continue
    y = dict(x); y['eras'] = ['now', 'book']
    if y['group'] not in book_groups: y['group'] = {'arcade': 'street'}.get(y['group'], y['group'])
    d['extra_places'].append(y)
gone = ({k for k in G['places'] if k != 'note'} - set(RENAME)) - set(pl) | DROP_EXTRA
def fix_refs(lst):
    out = []
    for r in lst:
        neg = r.startswith('!'); k = r[1:] if neg else r
        if k.startswith('@'):
            gk = k[1:]; gk = {'game': 'story'}.get(gk, gk)
            if gk not in book_groups: continue
            out.append(('!' if neg else '') + '@' + gk); continue
        if k == '*': out.append(r); continue
        k = RENAME.get(k, k)
        if k in gone or k not in pl: continue
        out.append(('!' if neg else '') + k)
    return out
# 3. 소품 — 휴대용 게임기(since 1989 — 책의 시대엔 연도 거르기가 없다) · 오락실 판은 뺀다. 장소 열쇠를 이야기 장소로
d['props'] = []
for p in G['props']:
    if p['key'] in ('handheld', 'arcade_panel', 'gamepad'): continue
    q = dict(p)
    if 'places' in q: q['places'] = fix_refs(q['places'])
    if 'eras' in q: q['eras'] = [ERA.get(e, e) for e in q['eras']]
    if q.get('places') == [] and 'places' in p: continue
    d['props'].append(q)
# 6. 책 장소의 소품 — 서재 · 살롱 · 각색(게임 표엔 없던 묶음)
BOOKP = {
 'book': ['@library', '@salon', 'adapt_table', 'adapt_set'], 'letter': ['@library', 'salon_parlor', 'salon_club', 'salon_garden'], 'notebook': ['@library', '@salon', 'adapt_table', 'adapt_set'],
 'cup': ['@library', 'salon_cafe', 'salon_club', 'salon_parlor', 'salon_talk', 'adapt_table', 'adapt_set', 'adapt_makeup'], 'teapot': ['salon_club', 'salon_parlor', 'salon_garden'],
 'map': ['lib_map_room', 'lib_archive', 'lib_stacks'], 'sketchbook': ['lib_reading_room', 'lib_children', 'salon_garden', 'adapt_fitting'], 'camera': ['adapt_set', 'adapt_premiere', 'lib_mobile'],
 'microphone': ['salon_poetry', 'salon_talk', 'adapt_stage'], 'compact': ['adapt_makeup', 'adapt_premiere'], 'hairbrush': ['adapt_makeup'], 'lantern': ['lib_stacks', 'lib_archive'],
 'tote_bag': ['lib_bookshop', 'lib_mobile', 'salon_talk'], 'shopping_bag': ['lib_bookshop'], 'bouquet': ['adapt_premiere', 'salon_garden'], 'loose_flowers': ['salon_garden'],
 'vinyl': ['salon_club', 'salon_parlor'], 'headphones': ['lib_reading_room', 'lib_children'], 'umbrella': ['lib_bookshop', 'adapt_premiere'], 'fan': ['salon_parlor', 'salon_poetry'],
 'embroidery': ['salon_club', 'salon_parlor'], 'drink_glass': ['adapt_premiere', 'salon_poetry'], 'ice_cream': ['salon_garden'], 'sun_hat': ['salon_garden'],
 'water_bottle': ['adapt_set', 'adapt_stage', 'adapt_table'], 'phone': ['@library', '@salon', '@adapt'],
}
for q in d['props']:
    extra = [x for x in BOOKP.get(q['key'], []) if (x[1:] in book_groups if x.startswith('@') else x in pl)]
    if extra and 'places' in q: q['places'] = q['places'] + [x for x in extra if x not in q['places']]
pkeys = {p['key'] for p in d['props']}
d['prop_uses'] = []
for u in G['prop_uses']:
    if u['prop'] not in pkeys: continue
    v = dict(u)
    if 'places' in v: v['places'] = fix_refs(v['places'])
    if 'needs_any' in v: pass
    d['prop_uses'].append(v)
# 4. 어색한 조합 — 장소 열쇠 · 묶음을 책 꼴로
aw = []
for a in G['awkward']:
    b = dict(a); b['places'] = fix_refs(a['places'])
    if b['places']: aw.append(b)
d['awkward'] = aw
# 5. 옷 — 책 표(버전1)에 없는 옷(game 이 2026-10-31 넓힌 여덟 가지)은 가리키지 않는다. 각색 의상 계열은 특징 없음, 외투 차림만 옷깃
items = {i['key'] for o in B1['outfits'] for i in o['items']}
fams = {o['key'] for o in B1['outfits']}
of = d['outfit_features']
of['defaults'] = {k: v for k, v in of['defaults'].items() if k in fams}
for f in fams: of['defaults'].setdefault(f, [])
of['add'] = {k: v for k, v in of.get('add', {}).items() if k in items}
if 'period_outer' in items: of['add']['period_outer'] = ['collar']
if 'remove' in of: of['remove'] = {k: v for k, v in of['remove'].items() if k in items}
for w in d.get('weather_awkward', []): w['items'] = [i for i in w.get('items', []) if i in items]
for a in d['awkward']:
    if 'items' in a: a['items'] = [i for i in a['items'] if i in items]
d['note'] = G['note'] + ' 책 공방 몫(2026-11-01, game 표에서 변환 — docs/CASUAL_TREE_PORT.md): 게임 장소 → 이야기 장소(story_*), 서재 · 살롱 · 각색 장소의 받침, 오락실 소품 · 휴대용 게임기 뺌, 시대 release → book.'
s = json.dumps(d, ensure_ascii=False)
for bad in ['game_', '"release"', 'in_game', '@game']:
    assert bad not in s.replace('game_keyart', ''), bad
json.dump(d, open(__import__('os').path.join(__import__('os').path.dirname(__file__), '..', 'data', 'casual-tree-v2.json'), 'w'), ensure_ascii=False, indent=1)
open(__import__('os').path.join(__import__('os').path.dirname(__file__), '..', 'data', 'casual-tree-v2.json'), 'a').write('\n')
print('places', len(pl) - 1, 'props', len(d['props']), 'uses', len(d['prop_uses']), 'awkward', len(aw), 'extra', len(d['extra_places']))
