/* 프롬프트 자료 표 — 생성기에 나가는 영어 문구와 화면이 읽는 선택지가 전부 여기 있다.
   pkm-atelier 의 lib/prompt-spec.js 에서 책 생성기가 쓰는 표만 가져왔다(2026-10-15).
   - 외형(PARAM_*)·체형/머리 도식·표정·자세·방향·구도·렌즈·일상컷 갈래와 세 축·연출(ACTION_*)은 pkm 과 열쇠가 같다.
     갑주 말(armor·장갑)은 의상 말로 바꿨고, 포켓몬 세계 전용 일상컷 갈래(직업·파트너 돌봄·나무열매)는 빼고
     "서고의 일상(library_life)" 을 넣었다. 연출의 무장 고르기는 뺐다 — 책은 빈손이다.
   - 화풍 문장은 여기 없다. data/style.json 의 판(versions[current].text)이 정본이고 생성기가 그대로 싣는다.
   - 책마다 다른 것(인격·폼 모습·명장면·실루엣·얼굴)은 data/book-design.json 이 쥔다. 여기는 그것을 영어 문장에
     싣는 틀(BOOK_LINES)과 정한 말의 영어 풀이(VOCAB_EN) 뿐이다.

   lib/words.js 와 같은 취급을 받는다 — tests/words.cjs 의 한글 검사에서 빠지고, 대신 "표 말고 아무것도 없나"를 본다. */
(function (root) {
  'use strict';

  /* ══ 책 문장 ══
     첫 그림(인물 기준, 첨부 없음)은 고른 폼 하나로 만든다. 나머지 폼은 그 그림을 첨부하고 의상만 바꾼다.
     개방은 그 폼 그림을 첨부하고 같은 그림에서 둘레의 세계만 명장면으로 바꾼다. 일상은 확정한 그림을 첨부한다.
     설계표의 글(모습·명장면·인격)은 한국어 그대로 싣는다 — 그림 모델은 읽지만 글자로 그리지 말라고 같이 적는다. */
  const BOOK_LINES = {
    createInput: "INPUT: text only — no reference image is needed; do not reuse earlier conversation images.",
    /* 화풍 참고 그림(data/style.json 판의 reference.path) — 그리는 방식만. 참고 그림의 얼굴·차림이 따라왔다(2026-10-15 앨리스 참고) */
    createInputRef: "INPUT: attach only the style reference image — it is not this character; do not reuse earlier conversation images.",
    styleRefInput: "Also attach the style reference image.",
    styleRef: "STYLE REFERENCE: the attached style reference shows rendering only — linework, matte color, paper grain, light. Never take its face, hair, costume, exposure, props, pose or background; her face follows FACE or her own approved image.",
    referenceInput: "INPUT: the attached image is the approved character ({base}); keep her.",
    /* 이어가기는 실루엣을 안 싣는다 — 폼마다 의상이 바뀌면서 복식 구조까지 흘렀다(한복 → 한푸). 구조 한 줄만 남긴다 */
    garmentKeep: "GARMENT: whatever the form changes, keep her garment structure: {garment}.",
    openInput: "INPUT: attach this book's {stage} form card image (her closed state). If a second image fits, add her first approved form image for the face.",
    casualInput: "INPUT: the attached image is the approved character; keep her.",
    notes: "Design notes in quotes may be written in Korean; read them as description, never render them as text.",
    book: "BOOK: «{title}» by {author}. {genre} · {era} · {region}. Source scope: \"{scope}\".",
    /* 아직 보호 중인 책(설계표 author_death·alive·abroad_protected) — 그림 모델은 유명한 영상판 의상·소품부터 떠올린다.
       각색의 이름은 싣지 않는다(이름을 대면 오히려 그쪽으로 끌려간다). 설계표 adaptations 는 사람이 보는 기록 */
    adaptation: "SOURCE ONLY: this book is still under copyright — design only from its written text. Do not imitate costumes, armor, props, creature or character designs, emblems or color schemes from any film, series, game, animation or cover art based on it.",
    subject: "SUBJECT: one adult woman who is the personification of the book itself — not a cosplay of its protagonist and not a costume of its cover. Persona: \"{persona}\". Her desire: \"{desire}\"; her conflict: \"{conflict}\". Symbols worn as costume motifs, never carried — except one object her form description or pose explicitly puts in her hand: {symbols}.",
    material: "MATERIAL: the book's own body becomes her costume — \"{material}\". Books are never held in her hands or floated beside her; pages, bindings, slips, thread and ink are worn.",
    silhouette: "SILHOUETTE: {items}.",
    face: "FACE (her own structure, not the style's default face): {items}.",
    faceAncestry: "broad {ethnicity} ancestry with individual variation, no stereotyped features",
    form: "FORM — {stage_en} ({stage}): \"{look}\". Battle role: {role}. This is the {arc} stage of her story.",
    card: "Vertical 2:3 frame (1024×1536), full body with head and feet inside the frame and clear margins, nothing in front of her but what she holds, face toward the camera (front or three-quarter, never a back view).",
    createOutput: "OUTPUT: one full-body card image of this form, which also fixes who she is for every later form. {card} The setting is a rich, atmospheric place from her book that frames her without competing.",
    /* 첨부 그림의 겉옷을 그대로 다시 입었다 — 바스커빌 발단·결말이 같은 긴 코트·사냥개 그림 안감(2026-10-18) */
    referenceOutput: "OUTPUT: the {stage_en} form of the woman in the attached image, as a new card image. Keep her face, eye and hair colors, haircut, skin tone, body proportions and palette; change only her costume and bearing, as FORM says. Do not reuse the attached image's outer garment, coat, cape or lining artwork — build the costume FORM describes, keeping only her material and palette. {card} A new card-ready pose is fine.",
    openOutput: "OUTPUT: the OPEN state of the attached image — the climactic scene of this stage. Keep her face, hair, body, costume, camera, framing and subject scale. Change the world around her into this scene: \"{scene}\". She is the only person; the scene is carried by objects, environment, light, weather or a looming non-human presence. The pair must read as the same picture before and after the scene opens.",
    /* 연출 — 화풍 한 줄만으로는 설계표대로 칙칙한 갑옷·돌격 자세가 나왔다. 기준 그림(돈키호테)의 화려함·장식·역광·서 있는 카드 자세는
       화풍 문단이 아니라 이 두 줄이 쥔다(2026-10-15). 폼 초상에만. 자세·연출을 고르면 STANCE 는 빠진다 */
    presentation: "PRESENTATION: a refined, glamorous adult fantasy card illustration — a beautiful, polished face within her FACE structure; a dense, high-detail costume where decorative metal or gold accents (trim, clasps, a breastplate or corset, jewelry) frame the book material without replacing it; warm dramatic backlight with a rim light and strong value contrast.",
    /* 폼마다 자세 — 설계표 forms.<단계>.pose. 여섯 장이 다 같은 정면 서기로 나왔다(2026-10-17 춘향전). 고른 자세·연출이 있으면 빠진다 */
    stanceForm: "STANCE (this form): \"{pose}\" — a poised card pose seen from a slightly low camera, held still and easy to read.",
    handsPose: "Her hands do only what STANCE says and hold only what it names.",
    stance: "STANCE: a poised heroic card stance seen from a slightly low camera, held still and easy to read; her attitude shows in her bearing and gesture, never as a run, a lunge or a mid-air leap.",
    /* 개방의 명장면은 폼 그림에 미리 넣지 않는다 — 바스커빌가의 개 폼 셋 모두 창밖·바위 위에 사냥개가 서 있어
       결말 개방(사냥개의 정체)이 김빠졌다(2026-10-18). 그 책의 개방 셋을 그대로 적어 배경에서 뺀다 */
    holdBack: "HOLD BACK: these climactic scenes belong to the open images — keep their creatures and events out of this portrait's setting, even as a distant figure, statue, painting or reflection: {scenes}. An object named in FORM or in her pose stays.",
    sceneRule: "Chosen settings below override the default stance and camera; her identity and form stay fixed.",
    casualCharacter: "CHARACTER: the same woman as the attached image — the personification of «{title}» ({genre}). Keep her face, eye and hair colors, haircut, skin tone and body proportions; expression and hair motion may change.",
    casualOutput: "OUTPUT: one standalone off-duty scene of her. Everyday clothing chosen for the scene; her book shows only through accessories and objects around her — never in the outfit's colours, patterns or cut, never her form costume, never a carried book. Scene, outfit, pose and camera follow the settings below.",
    /* 일상컷 옷 — "평상복은 장면이 정한다" 만으로는 첨부한 폼 의상(한복의 겹·허리띠·술·노리개)이 그대로 따라왔다.
       간호사 코스튬을 골랐는데 한복이 나왔다(2026-10-17 춘향전). 첨부 그림에서는 얼굴·머리·몸만 가져온다 */
    casualWardrobe: "WARDROBE: change her clothes completely. From the attached image take only her face, hair and body — not its garment, layers, sash, tassels, jewelry, hair ornaments or background. Dress her exactly as the scene settings below describe; that outfit must read at first glance, keeping its own recognisable colours and parts. Do not carry the attached image's palette, patterns or trim into the outfit; her source belongs in accessories and props, never in the clothes — never restyle the chosen outfit into her own costume, genre or palette.",
    /* 일상컷 얼굴 각도 — 첨부한 폼 그림의 고개 각도·시선·얼굴 크기까지 따라와 일상컷 얼굴이 모두 비슷한 정면 3/4 로 나왔다(2026-10-24).
       첨부 그림은 "누구인가" 만 정하고, 고개·시선·카메라는 장면 설정이 정한다 */
    /* 뒤돌아보기 — 등이 카메라를 보는 각도·돌아보는 자세에서 등 위에 정면 얼굴이 붙었다(pkm 2026-10-25 같은 문제). LOOK_BACK 의 각도·자세에만 싣는다 */
    casualLookBack: "LOOK-BACK: her back is toward the camera, so her head turns at most a quarter turn over one shoulder — the face shows in profile or three-quarter view, never full-front on a back-facing torso. Her chin sits just above the near shoulder, the far eye and cheek may be partly hidden, the side of the neck shows the turn and the shoulder line continues behind the head; her eyes, not her whole face, swing toward the camera.",
    casualPose: "ANGLE: the attached image fixes who she is, not how she is posed or shot. Do not copy its head angle, head tilt, gaze direction, face size in frame, camera height or crop — turn her head, set her gaze and place the camera as the scene settings below describe, and let her face read naturally from that new angle (profile, three-quarter, looking down or away), with her features staying the same.",
    /* 원작 시대 — 일상컷을 그 책의 시대·지역으로 옮긴다. "당시 시대 경찰" 로 했더니 폼 의상(해골·책장·레이스)으로 흘렀다(2026-10-18 햄릿).
       고른 옷의 알아볼 부품은 남기고, 그 시대에 없던 직업은 가장 가까운 것으로, 폼 의상의 재료는 쓰지 않는다 */
    /* 이야기 속 장소·각색 갈래 — 책마다 다른 장소(설계표 place)·시대를 한 줄로(2026-10-26) */
    casualStoryPlace: "STORY PLACE: the setting of «{title}» — {place}.",
    casualAdaptation: "ADAPTATION: the production adapts «{title}»; its costumes belong to the book's own time and place — {era}, {region} — and are invented from the book's text, not copied from any existing film or stage design.",
    casualEra: "ERA: set this scene in her book's own time and place — {era}, {region}. Re-imagine the chosen category, example, outfit and setting as they would exist there, keeping two or three recognisable parts of the chosen outfit; a job that did not exist then becomes its closest period counterpart (police → a city watch or night guard). Period clothing only, not her form costume — no book pages, bindings or skull-and-symbol decoration beyond the usual small accent; no modern objects.",
    identity: "IDENTITY (chosen details override the automatic look)",
    measurement: "B/W/H are approximate bust/waist/hip circumferences in cm — proportion guidance within the chosen build, not costume sizes.",
    figure: "ONE FIGURE ONLY. No second character, no text, no lettering, no logo, no watermark, no speech bubble, no frame border; pages and spines stay unlettered.",
    /* 목 — 큰 키·짧은 머리·큰 깃이 겹치면 목이 길어지고 머리가 어깨에서 떴다(2026-10-15 코스모스). 큰 키는 다리로.
       다리로만 늘이니 머리가 작아져 9등신 패션 그림이 됐다 — 7.5등신, 머리는 줄이지 않는다 */
    anatomy: "ANATOMY: natural adult proportions, about 7.5 heads tall — height from the legs, never a smaller head or a longer neck. The neck is a natural length and the head sits close to the shoulders. No body-part enlargement, no extra limbs.",
    /* 몸 개수 — 팔·다리만 긍정형으로. 손가락·손·발 개수를 박으면 쥐거나 가려져야 할 구도에서도 다 보이려 한다(pkm 2026-10-27) */
    body: "BODY: a normal human body — one head, two arms and two legs, each joined at its natural joint; elbows, knees and wrists bend the human way. Hands and feet may be partly hidden by the pose, what she holds or the frame.",
    /* 손 — "엄지 하나와 손가락 넷, 엄지는 안쪽, 합쳐지거나 … 더 생기지 않게" 는 금지를 늘어놓아 손에 주의를 끌었다. 짧은 긍정형만(pkm 2026-10-27) */
    hands: "HANDS: natural human hands.",
    /* 일상컷 손 — 자세·장면대로, 쉬는 손은 편하게, 가려져도 된다(2026-10-27) */
    handsCasual: "HAND TASK: her hands act naturally for the pose and scene; any idle hand rests in a relaxed, anatomically plausible position. Natural occlusion is allowed; do not force every hand or finger into view.",
    handsDefault: "Keep both hands empty and relaxed — a loose fist, an open palm or resting on something.",
    handsWear: "Her hands keep the same gloves or bare hands as in the attached image.",
    handsKeep: "HANDS: keep both hands as in the attached image.",
    /* 일상컷 화면비 — 늘 싣는다. 2:3 일 때 빠지면 비율 말이 하나도 없었다(사용자 2026-10-28, game 에서 먼저) */
    casualFrame: "FRAME: {frame} image. Compose the whole scene for this frame; Framing below sets how much of her shows."
  };
  /* 일상컷 화면비 → FRAME 줄. 그림 저장소의 크기는 2:3 이 1024×1536 */
  const ASPECT_FRAME = { "2:3": "a vertical 2:3 (1024×1536)", "3:2": "a horizontal 3:2 (1536×1024)", "1:1": "a square 1:1 (1024×1024)",
    "9:16": "a tall vertical 9:16", "16:9": "a wide horizontal 16:9" };
  /* 예시 풀이 — pkm 에서 온 예시 중 장면 문장(6번째 칸)이 없는 것은 이름만 실렸다. 전통 의상은 이름 한 단어로는
     책의 지역 옷이 이겼다(2026-10-18 돈키호테: 아오자이를 골랐는데 스페인 농가 옷). 전통 의상은 짜임·여밈·실루엣을,
     나머지 갈래는 옷차림 + 한 가지 동작을 적는다. 건담·포켓몬에서 온 연출 예시(분사·조종석 등)는 책 말로 옮겼다 */
  const EXAMPLE_DETAIL = {
    auto_traditional: "the traditional dress of her book's own region and era, worn as a daily outfit",
    hanbok_formal: "a formal Korean hanbok — short jeogori with goreum bow and white dongjeong collar over a full high-wrapped chima; not hanfu",
    hanbok_daily: "a modern daily hanbok — a short cropped jeogori-style top with a goreum tie over a simplified mid-length chima skirt",
    kimono_formal: "a formal Japanese kimono — straight-cut silk robe wrapped left over right, wide obi tied at the back, tabi and zori",
    yukata_daily: "a light cotton summer yukata wrapped left over right with a soft obi and geta sandals",
    hanfu_formal: "a formal Chinese hanfu — cross-collar ruqun with wide flowing sleeves, high-waisted skirt and a sash",
    qipao_daily: "a modern daily qipao — fitted mandarin-collar dress with frog buttons and side slits",
    aodai_daily: "a Vietnamese áo dài — a long, close-fitting silk tunic with a high mandarin collar, long sleeves and full-length front and back panels slit to the waist, worn over loose wide-leg silk trousers; no corset, no Western bodice, no petticoat skirt",
    sari_formal: "a formal Indian sari — a long silk drape pleated at the waist with the pallu over one shoulder, worn with a fitted choli blouse",
    lehenga_formal: "an Indian lehenga — a full embroidered flared skirt, fitted choli blouse and a sheer dupatta",
    salwar_daily: "a daily salwar kameez — a long tunic with side slits over loose salwar trousers and a light dupatta",
    abaya_modern: "a modern abaya — a long flowing open-front robe in fine fabric over a simple dress, with a matching scarf",
    kaftan_daily: "a resort kaftan — a loose ankle-length tunic with a wide neckline and embroidered trim",
    thobe_inspired: "a thobe-inspired dress — a long straight-cut gown with an embroidered chest panel",
    dirndl_modern: "a modern dirndl — fitted bodice laced at the front, puff-sleeved blouse, full skirt and apron",
    folk_embroidery: "a folk-embroidered peasant blouse with dense cross-stitch on sleeves and yoke, over a simple skirt",
    kente_modern: "a modern dress cut from woven kente cloth in bold geometric strips",
    boubou_flow: "a flowing West African boubou — a wide, floor-length embroidered robe with matching head wrap",
    huipil_modern: "a modern Mesoamerican huipil — a square-cut woven tunic with brocade panels over a wrap skirt",
    poncho_andes: "an Andean woven layer — a striped handwoven poncho or lliclla over a pollera skirt and a felt hat",
    kilt_inspired: "a kilt-inspired pleated tartan skirt with a fitted knit top and a sash pin",
    kebaya_daily: "a daily kebaya — a sheer embroidered fitted blouse over a batik sarong",
    barong_inspired: "a barong-inspired sheer embroidered piña-style top over simple trousers or skirt",
    caftan_evening: "a Moroccan evening caftan — a long embroidered robe with a decorated belt and sfifa trim",
    seasonal_night: "walking an evening street in a seasonal outfit (light coat or summer dress to match the season), pausing under a street lamp",
    travel_cut: "unpacking a suitcase in a resort room in a relaxed travel outfit, folding a sun hat and setting out sandals",
    festival_night: "at a night festival in a light casual outfit, holding a paper-wrapped snack while browsing lantern-lit stalls",
    unexpected_contrast: "an everyday outfit in an unexpected place — one clear daily action anchors the scene, such as watering plants in a grand library hall",
    retro_future: "a retro-futurist home outfit (a sleek jumpsuit with vintage trim), making tea with old-fashioned appliances in a futuristic room",
    rainy_city: "on a rain-wet city evening in a trench coat, folding an umbrella under a shop awning",
    weekend_market: "at a weekend market in a sundress and cardigan, choosing fruit at a stall and placing it in a woven basket",
    late_studio: "in a late-night studio in a loose shirt and apron, tidying brushes and checking a work in progress",
    rooftop_wind: "on a windy rooftop in a flowing skirt and knit top, holding her hair back as her clothes catch the wind",
    seaside_offseason: "on an off-season beach in a long coat and scarf, walking along the empty shore or sitting on a bench",
    neon_alley: "in a neon-lit backstreet in a leather jacket and short skirt, holding a canned drink while checking the way",
    snow_evening: "on a snowy evening in a wool coat, retying her scarf and holding a warm cup",
    warmup: "warming up before training in a sports bra and leggings, swinging her arms and stretching her legs",
    stretch: "a slow mobility stretch on a mat in a fitted athletic set, the joint movement easy to read",
    dance_transition: "mid weight-shift in a dance studio in a leotard and wrap skirt, captured between two steps",
    pilates: "a Pilates core move on a reformer or mat in a fitted unitard and grip socks",
    tennis_active: "in a pleated tennis skirt and polo, racket raised in the ready stance before returning a ball",
    basketball_jersey: "in an oversized basketball jersey worn loose over shorts, dribbling or holding the ball on an outdoor court",
    boxing_fitness: "in boxing gloves, sports top and shorts, practising guard and footwork beside a heavy bag",
    running_recovery: "after a run in a running top and shorts, catching her breath with a water bottle",
    light_jog: "jogging lightly along a quiet park path in running wear, an easy stride and compact arm swing",
    parkour_stairs: "in flexible athletic wear, vaulting a stair rail mid-motion",
    roller_skating: "in roller skates, crop top and high-waisted shorts, balancing as she glides slowly",
    fencing_motion: "in a white fencing jacket and breeches with the mask tucked under her arm, stepping into an en garde stance",
    climbing_warmup: "in front of an indoor climbing wall in a tank top, harness and climbing shoes, chalking her hands and checking her gear",
    surf_prep: "at the water's edge in a wetsuit pulled down to the waist over a bikini top, waxing a surfboard",
    yoga_flow: "flowing through a yoga pose on a mat in a fitted yoga set",
    cycling_kit: "in a cycling jersey and bib shorts, checking her bicycle and buckling a helmet",
    track_sprint: "on a running track in a sprint crop top and briefs, crouched low in the starting position",
    archery_draw: "in a fitted archery top with an arm guard, holding a bow at full draw, perfectly still",
    aerial_silk: "in a fitted unitard, wrapped in aerial silks and holding a pose in mid-air",
    couture_gala: "preparing for a gala in an intricate couture gown whose colours and embroidered motifs echo her book",
    runway: "a runway walk in an editorial outfit whose silhouette and tailoring read clearly",
    aerodynamic_couture: "couture with layered panels cut like flowing air currents, like pages fanned by wind",
    metallic_asymmetry: "asymmetric tailoring in metallic-sheen fabric, each side cut differently",
    ceremonial_whitegold: "a ceremonial white-and-gold look with structured shoulders and gold braid",
    cyber_street: "futuristic streetwear carrying her book's symbols as printed patches and reflective trim",
    deconstructed_frame: "deconstructed couture whose seam lines trace the frame lines of a book page layout",
    floating_panel: "couture with stiff panels standing slightly away from the body, like loose book covers",
    luminous_circuit: "an editorial outfit with glowing line work stitched across it like illuminated manuscript borders",
    wing_light: "a kinetic editorial layer that fans out from the back like glowing open pages",
    heavy_architecture: "heavy, angular architectural tailoring with a rigid structured silhouette",
    stealth_monochrome: "a sleek all-matte-black monochrome look",
    transformation_drape: "a drape that folds and unfolds across the body like a pop-up book",
    orbital_ring: "jewellery and silhouette built from rings and halo shapes circling the body",
    thruster_flare: "a hemline that flares out sharply like a fanned stack of pages",
    cockpit_harness: "tailoring with harness-like belts and buckles crossing the torso as decoration",
    camo_couture: "couture printed with a camouflage-like pattern made from her book's motifs",
    ceramic_plate: "layered glossy ceramic-like plates sewn onto the garment to stress its structure",
    heritage_couture: "couture that keeps the structure and fastenings of a traditional dress, recoloured in her book's palette",
    soft_tank_shorts: "basic homewear — a soft ribbed tank top and short cotton shorts — relaxing at home",
    satin_lounge: "a satin lounge set of button shirt and shorts, more refined than pyjamas, lounging at home",
    offshoulder_knit: "an off-shoulder knit top slipping from one shoulder over shorts, curled up at home",
    camisole_wrap: "a thin-strap camisole with a wrap skirt or wrap shorts tied at the hip, at home",
    bralette_cardigan: "a lace bralette under an open, unbuttoned cardigan with soft shorts, at home",
    one_shoulder_lounge: "a one-shoulder lounge set — top covering one shoulder and matching soft pants",
    backless_lounge: "backless homewear — a lounge top or dress with a deeply open back",
    after_bath: "after a bath in a cotton camisole and shorts, drying her hair with a towel",
    window_vanity: "at a window-side vanity in a slip and light robe, brushing her hair or putting on earrings",
    late_night_kitchen: "late at night in the kitchen in oversized tee and shorts, pouring a drink or making a snack",
    laundry_lounge: "at home in a tank top and lounge shorts, folding laundry and bedding",
    sunroom_lounge: "in a sunlit sunroom in a light linen lounge set, resting with a book or a drink",
    oversized_shirt: "wearing only an oversized button shirt like a short dress, sleeves rolled, at home",
    hoodie_shorts: "in a cropped hoodie showing her midriff and short shorts, at home",
    knit_dress_home: "in a soft, body-hugging knit dress, relaxing at home",
    robe_morning: "in the morning wearing only a loosely tied robe, holding a coffee cup",
    floor_cushion: "lounging against big floor cushions in soft homewear",
    home_workout: "in a small home workout corner in a sports bra and leggings, stretching lightly",
    slip_dress: "an evening in a thin-strapped satin slip dress that flows along the body",
    cocktail_mini: "a structured cocktail mini dress above the knee with heels",
    one_shoulder_satin: "a one-shoulder satin evening dress",
    low_back_evening: "an evening dress, modest at the front with a deeply cut low back",
    after_party: "after a party in an evening dress, taking off her earrings and draping her coat over a chair",
    hotel_evening: "in a hotel room in an evening dress, getting ready to go out or unpacking",
    balcony_night: "on a night balcony in an evening dress, holding a glass and looking out",
    mirror_touchup: "at a mirror in an evening outfit, touching up lipstick or her hair",
    opera_night: "dressed for the opera in a long gown and evening coat, picking up a small clutch",
    penthouse_window: "at a penthouse window in an elegant evening outfit, resting while looking at the city lights",
    silk_robe_evening: "a silk robe thrown over an evening slip, adjusting how it falls",
    velvet_evening: "a heavy velvet evening dress with its deep sheen",
    halter_evening: "a halter-neck evening dress tied behind the neck, baring shoulders and back",
    high_slit_gown: "a long gown with a high leg slit",
    wine_bar: "in a corner seat of a wine bar in an evening dress, looking over a glass and menu",
    night_drive: "in the passenger seat at night in a light evening outfit, looking out at passing lights",
    heritage_evening: "an evening out in the formal traditional dress of her book's own region",
    tea_ceremony_night: "in a quiet evening room in an elegant robe-like dress, arranging tea cups and utensils",
    commute_train: "commuting on a train in a blazer, blouse and skirt, holding a strap and her bag",
    grocery_run: "at a grocery store in jeans and a casual top, picking produce into a basket",
    simple_cooking: "in her kitchen in a casual tee, jeans and apron, chopping ingredients",
    cafe_takeout: "at a café counter in a casual outfit, picking up a takeout cup and fixing the lid",
    laundry: "doing laundry in a casual tee and shorts, folding clothes on a table",
    rain_walk: "walking slowly in the rain with an umbrella, in a raincoat and boots",
    station_wait: "waiting at a station in a coat and casual outfit, checking her bag and the time",
    bookstore: "in a bookstore in a knit sweater and skirt, pulling a book from a shelf",
    parcel_pickup: "at a convenience-store counter in a hoodie and leggings, picking up a small parcel",
    midnight_laundromat: "at a laundromat at midnight in a hoodie and shorts, sorting a laundry basket and detergent",
    greenhouse: "in a greenhouse or plant shop in overalls or a linen dress, checking leaves and choosing a pot",
    pottery_class: "at a pottery class in a work apron, shaping clay on the wheel",
    record_store: "in a record store in a band tee and jacket, flipping through vinyl sleeves",
    hardware_store: "in a hardware store in a work shirt and jeans, looking at small tools and parts",
    hanbok_errand: "a daily errand in a modern daily hanbok — short jeogori-style top with goreum tie over a simple chima skirt",
    festival_daily: "at a local daytime festival in a comfortable casual outfit, browsing food stalls",
    rain_editorial: "an editorial in the rain, using an umbrella to show off the cut and movement of a coat or dress",
    arcade_night: "in a night arcade in streetwear, playing a game or looking at small prizes",
    ferry_deck: "on a ferry deck by the rail in a breezy dress and light jacket, facing the wind",
    retro_motel: "in a retro motel room in vintage-style clothes, sorting a suitcase",
    desert_resort: "at a desert resort in a linen wrap dress and sun hat, resting in the shade",
    futuristic_spa: "in a futuristic spa in a robe or towel wrap, arranging her things",
    observatory_night: "at a night observatory in a warm coat, looking through a telescope at the stars",
    greenhouse_afterdark: "in a greenhouse at night in a light cardigan and skirt, watering plants by lamp light",
    rooftop_cinema: "at a rooftop cinema in a casual outfit, settling a blanket and snacks before the film",
    winter_lodge: "in a winter lodge in a knit sweater and leggings, hanging up her coat and holding a hot drink",
    art_studio: "in an art studio after hours in a paint-splattered shirt, tidying tools and finished pieces"
  };
  /* 폼 초상의 노출 — 설계표에는 노출 칸이 없어 "책 설계를 따른다" 만으로는 보수적인 복장이 나왔다(2026-10-15).
     생성기의 노출 칸이 정한다. 기본은 과감. 폼 의상·재료·팔레트는 그대로 두고 재단으로 드러낸다. 빈 값(자동)은 줄을 안 싣는다 */
  const FORM_EXPOSURE = {
    low: "EXPOSURE (low): a mostly covered version of the FORM costume; face, neck and hands show.",
    moderate: "EXPOSURE (moderate): the FORM costume opens at the collarbone and shows the arms or lower legs; chest and pelvis covered.",
    /* 과감은 의상 구조에 따라 셋 — "폼이 허락하는 곳의 어깨" 를 긴 코트 폼에 걸었더니 코트를 한쪽 어깨만 흘러내렸다.
       높이 선 책장 깃 + 깊은 네크라인은 가슴만 붙여 넣은 듯했고 깃이 목에서 떠 목이 길어 보였다(2026-10-15 코스모스) */
    bold: {
      outer: "EXPOSURE (bold): her outer layer (coat, cloak, robe or armor) stays on both shoulders, worn symmetrically; skin shows through the inner garment — a deep open neckline with natural cleavage, a fitted corset-like waist, slits where the form allows. The collar opens with the neckline in a V or folds down, never standing away from the neck. Nothing slipped off. Chest and pelvis covered; keep the FORM costume, material and palette.",
      open: "EXPOSURE (bold): cut the FORM costume to show skin through its own structure — a deep open neckline with natural cleavage, a fitted corset-like waist, and bare shoulders, arms or thighs where the garment allows, kept symmetrical. The collar opens with the neckline in a V or folds down, never standing away from the neck. Nothing slipped off. Chest and pelvis covered; keep the FORM costume, material and palette.",
      hanbok: "EXPOSURE (bold): keep the hanbok structure — jeogori collar and dongjeong in place; skin shows through a lower open neckline that reveals neck and collarbones, the chima tied high at the chest and sheer jeogori sleeves. Chest and pelvis covered; keep the FORM costume, material and palette."
    }
  };
  /* 설계표 실루엣의 복식 구조 → 과감 줄의 갈래. 없는 값은 open */
  const GARMENT_LAYER = { armor_layered: "outer", robe_overlap: "outer", coat_trousers: "outer", cloak_wrapped: "outer", tailored_suit: "outer", flight_suit: "outer",
    one_piece_dress: "open", layered_skirt: "open", hanbok: "hanbok" };
  /* 나이 — 맨 아래 외형 목록의 "apparent age: 20s" 한 줄로는 약했다. 잉크 선이 팔자·웃음 주름을 그어 30~40대로 보였다(2026-10-15 코스모스).
     SUBJECT 바로 뒤에 싣는다. 자동(빈 값)이면 이 공방의 기본 20대. 이어가기·개방·일상은 첨부 그림의 나이를 지키고 주름을 더하지 않는다 */
  const AGE_DEFAULT = "20s";
  const AGE_LINES = {
    "20s": "AGE: in her twenties — smooth youthful skin, soft full cheeks; minimal facial lines (no nasolabial folds, crow's feet, under-eye bags or cheek creases) and a soft smile that never creases her face.",
    "youthful adult": "AGE: in her twenties with a youthful face and adult proportions — smooth skin, soft full cheeks; minimal facial lines (no nasolabial folds, crow's feet, under-eye bags or cheek creases) and a soft smile that never creases her face.",
    "30s": "AGE: a woman in her thirties — restrained age cues; at most faint lines, no deep folds or under-eye bags.",
    "40s": "AGE: a woman in her forties — natural, restrained age cues.",
    "mature adult": "AGE: a mature adult woman — visible but restrained age cues."
  };
  const AGE_KEEP = "AGE: keep her age as in the attached image; add no wrinkles, folds or under-eye shadows, even when she smiles.";
  const FORM_EXPOSURE_KEYS = ["", "low", "moderate", "bold"];
  const FORM_EXPOSURE_DEFAULT = "bold";

  /* 단계 — 화면 이름(발단·전개·결말)과 설계 기준(질문 → 갈등 → 답) */
  const STAGE_EN = {
    "발단": { name: "Beginning", arc: "question" },
    "전개": { name: "Development", arc: "conflict" },
    "결말": { name: "Ending", arc: "answer" }
  };
  /* lanky·tall 을 그대로 풀면 목까지 늘어났다(2026-10-15 코스모스 tall · 돈키호테 lanky) — 키는 다리로, 목은 자연스럽게.
     정한 말(data/book-design.json 의 vocab) → 영어. 설계표에 새 말을 더하면 여기도 더한다(tests/prompt-book.cjs 가 맞춰 본다) */
  /* 한국 저작권 — 이 해까지 죽은 저자는 만료(옛 사후 50년), 그 뒤·생존 작가는 보호 중. tools/book-design.py 와 같다 */
  const KOREA_LAST_EXPIRED_DEATH = 1962;
  const VOCAB_EN = {
    genre: { "비극": "tragedy", "희극·풍자": "comedy and satire", "추리": "mystery", "모험": "adventure", "로맨스": "romance", "공포": "horror",
      "SF": "science fiction", "동화·판타지": "fairy tale and fantasy", "사상": "philosophy", "과학": "science" },
    role: { "공격": "attacker", "돌파": "breaker", "버티기": "defender", "지원": "support", "정찰": "scout", "교란": "trickster" },
    body: { petite: "petite, small-framed", slender: "slender", lanky: "lean and long-legged, with a natural neck length", athletic: "athletic", curvy: "curvy",
      tall_statuesque: "statuesque, long-legged, with a natural neck length", broad_strong: "broad-shouldered and strong" },
    hair: { short_crop: "short cropped hair", bob: "a bob", ponytail: "a long ponytail", long_straight: "long straight hair", long_wavy: "long wavy hair",
      updo_bun: "an updo bun", braids: "long braids", voluminous: "voluminous hair" },
    garment: { one_piece_dress: "a one-piece dress", armor_layered: "layered armor over clothing", robe_overlap: "an overlapping robe", tailored_suit: "a tailored suit",
      coat_trousers: "a long coat over trousers", layered_skirt: "layered skirts", cloak_wrapped: "a wrapped cloak",
      flight_suit: "a fitted one-piece flight suit with harness straps",
      /* "hanbok" 한 낱말로는 판타지 기본값인 중국 한푸로 갔다 — 긴 겉옷·넓은 허리띠·겹 프릴·중국풍 관(2026-10-17 춘향전) */
      hanbok: "Korean hanbok — a short jeogori jacket tied with a goreum ribbon bow and a white dongjeong collar, over a full chima skirt wrapped high at the chest, with Korean ornaments (norigae, binyeo, daenggi ribbon, and for a bride a jokduri or hwagwan); not Chinese hanfu or Japanese kimono — no long cross-wrapped robe, no wide waist sash, no Chinese crown" },
    material: { bamboo_slips: "bound bamboo slips", paper_pages: "printed paper pages", paper_armor: "paper armor made of stiffened pages", parchment: "parchment",
      leather_binding: "leather bookbinding", cloth_binding: "cloth bookbinding", silk_scroll: "silk scroll", card_stock: "playing-card stock",
      stitched_patchwork: "stitched patchwork of bindings", hanji: "Korean hanji paper", metal_instruments: "brass scientific instruments",
      letter_paper: "folded letter paper with wax seals", scaled_pages: "pages overlapped like scales",
      lab_notes: "graph-paper lab notebook pages dense with equations", fur_velvet: "black velvet with fur trim",
      logbook_brass: "ship's-logbook pages joined by riveted brass plates", clippings: "layered newspaper clippings and field notes", petal_script: "play-script pages cut and layered like petals",
      gilt_invitations: "gilt-edged party invitation cards stitched on like sequins", gazette_columns: "dense printed columns of a Paris court gazette", blueprint_sheets: "factory blueprint sheets riveted together in panels",
      sealed_dispatches: "folded diplomatic dispatches stamped with red wax seals", specimen_plates: "naturalist's specimen plates of pressed finches and beetles",
      challenge_letters: "folded duel-challenge letters and musketeer commissions stitched in overlapping panels", brick_storybook: "storybook card pages printed with a yellow-brick pattern",
      governess_diary: "plain governess diary pages folded in neat pleats", split_casebook: "casebook pages in two handwritings, half a neat laboratory record and half torn scrawl", ledger_coins: "Joseon merchant ledger pages strung with brass coins" },
    pose: { striding: "striding forward", charging: "charging forward", seated_study: "seated in study", tilted_curious: "head tilted in curiosity",
      crouch_rise: "rising from a crouch", rising_swing: "rising on a swing", commanding_stand: "a commanding stand", kneeling_observe: "kneeling to observe",
      dance_turn: "turning mid-dance", towering_lean: "leaning down from a towering height", skyward_gaze: "gazing skyward with open palms",
      floating_drift: "floating weightless", veiled_glance: "glancing back through a veil", tipping_hat: "tipping a top hat", pact_reach: "reaching out to seize",
      porthole_gaze: "gazing out through a great round porthole, one palm on the glass", tale_gesture: "telling a tale with one open palm raised", cloud_recline: "reclining on a drifting cloud", recoil_reach: "recoiling with one arm raised against what she sees", mischief_leap: "a mischievous mid-air leap",
      dock_reach: "standing at the end of a dock, one arm reaching toward a distant green light", candle_deduce: "deducing by candlelight, two fingers at her temple",
      assembly_rise: "rising stiffly from an assembly line, one hand flexing open", throne_lean: "leaning on a carved chair back, chin raised, weighing a sealed letter", specimen_sketch: "sketching a finch perched on her outstretched finger",
      lunge_salute: "saluting with a raised rapier, then dropping into a deep lunge", road_skip: "skipping forward along a yellow-brick road, basket on her arm",
      wind_shawl: "facing the moorland wind, shawl clutched at her chest", potion_toast: "raising a smoking vial to her lips like a toast", coin_toss: "flinging a string of coins out over the sea" },
    palette: { ink_jade: "ink black and jade", tricolor_warm: "warm tricolor", navy_gold: "navy and gold", cream_blue: "cream and blue",
      oxblood_gray: "oxblood and gray", rose_jade: "rose and jade", rust_parchment: "rust and parchment", black_white: "black and white",
      moss_tweed: "moss green and tweed brown", brass_teal: "polished brass and teal",
      blush_ivory: "blush pink and ivory", crimson_black: "crimson and black", sea_sand: "sea blue and sand",
      teal_silver: "cold teal and silver", forest_red: "forest green and book-leather red",
      gold_void: "glowing gold on deep space black", violet_snow: "dark violet and snow white", noir_ivory: "black and ivory with a crimson accent", ash_ember: "ash gray and ember red", tide_ink: "sea-green tide and ink black",
      deep_pearl: "deep ocean navy and pearl", lamp_indigo: "lamplight gold on night indigo", lotus_cloud: "lotus pink and cloud white", drowned_green: "drowned sea-green and bone", moon_moss: "moonlit lilac and moss green",
      champagne_green: "champagne gold and green-light emerald", gaslight_umber: "gaslight amber on shuttered umber", factory_steel: "factory steel gray and warning orange",
      medici_crimson: "Florentine crimson and gilded bronze", volcanic_teal: "volcanic black and island-sea teal",
      musketeer_azure: "musketeer azure and silver lily", emerald_brick: "emerald-city green and yellow brick", heather_slate: "moorland heather purple and slate gray",
      fog_violet: "London-fog gray and potion violet", brine_brass: "sea-brine gray and old brass" },
    face_shape: { oval: "oval face", round: "round face", heart: "heart-shaped face", long: "long face", square_soft: "softly square face", diamond: "diamond-shaped face" },
    eyes: { almond_wide: "wide almond eyes", round_large: "large round eyes", narrow_upturned: "narrow upturned eyes", droopy_soft: "soft droopy eyes",
      deep_set: "deep-set eyes", monolid_long: "long monolid eyes" },
    brows: { straight_thick: "thick straight brows", arched_thin: "thin arched brows", soft_round: "soft rounded brows", angled_sharp: "sharp angled brows", low_heavy: "low heavy brows" },
    nose: { small_button: "small button nose", straight_narrow: "straight narrow nose", aquiline: "aquiline nose", broad_soft: "broad soft nose", upturned: "upturned nose" },
    lips: { full_wide: "full wide lips", thin_long: "thin long lips", small_bow: "small bow lips", heart_full: "full heart-shaped lips", wide_smile: "wide smiling mouth" }
  };
  /* 책 얼굴 다섯 묶음 ↔ 외형 선택지 열쇠 — 사람이 그 항목을 직접 고르면 그 묶음은 FACE 줄에서 빠진다(IDENTITY 가 쥔다) */
  const FACE_PARAM = { face_shape: "face shape", eyes: "eye shape", brows: "eyebrows", nose: "nose character", lips: "lips" };
  /* 실루엣 축 ↔ 외형 선택지 — 체형·머리를 직접 고르면 그 축은 SILHOUETTE 에서 빠진다 */
  const SIL_PARAM = { body: "body type", hair: "hairstyle" };

  /* 외형 선택지 — 열쇠는 pkm 과 같다(그림 기록·얼굴 설계와 이어진다). 네 묶음(base·build·face·hair)만 */
  const PARAM_DEFS = [
   {
    "key": "apparent age",
    "label": "Apparent Age",
    "ko": "외관상 나이",
    "options": [
     [
      "",
      "AUTO — 20대(이 공방의 기본)"
     ],
     [
      "20s",
      "20s — 20대 성인"
     ],
     [
      "30s",
      "30s — 30대 성인"
     ],
     [
      "40s",
      "40s — 40대 성인"
     ],
     [
      "mature adult",
      "Mature Adult — 성숙하고 연륜 있는 성인"
     ],
     [
      "youthful adult",
      "Youthful — 동안 (성인이되 어려 보이는 얼굴)"
     ],
     [
      "__custom__",
      "직접 입력… — 원하는 나이 인상 직접 작성"
     ]
    ],
    "group": "base"
   },
   {
    "key": "facial ethnicity",
    "label": "Facial Ethnicity",
    "ko": "얼굴 계통",
    "options": [
     [
      "",
      "AUTO — 지정 안 함 (모델 기본값 = 서구권으로 쏠리기 쉬움)"
     ],
     [
      "East Asian",
      "East Asian — 동아시아 계열"
     ],
     [
      "Korean",
      "Korean — 한국계"
     ],
     [
      "Japanese",
      "Japanese — 일본계"
     ],
     [
      "Chinese",
      "Chinese — 중국계"
     ],
     [
      "Southeast Asian",
      "Southeast Asian — 동남아 계열"
     ],
     [
      "Central Asian",
      "Central Asian — 중앙아시아 계열"
     ],
     [
      "South Asian",
      "South Asian — 남아시아 계열"
     ],
     [
      "Middle Eastern",
      "Middle Eastern — 중동 계열"
     ],
     [
      "European",
      "European — 유럽 계열"
     ],
     [
      "Nordic",
      "Nordic — 북유럽 계열"
     ],
     [
      "Mediterranean",
      "Mediterranean — 지중해 계열"
     ],
     [
      "Slavic",
      "Slavic — 슬라브 계열"
     ],
     [
      "Latin American",
      "Latin American — 라틴 계열"
     ],
     [
      "African",
      "African — 아프리카 계열"
     ],
     [
      "mixed East Asian and European",
      "Mixed (EA×EU) — 동아시아·유럽 혼혈"
     ],
     [
      "__custom__",
      "직접 입력… — 원하는 계통 직접 작성"
     ]
    ],
    "group": "base"
   },
   {
    "key": "body type",
    "label": "Body Type",
    "ko": "체형",
    "options": [
     [
      "",
      "AUTO — 책 설계표 실루엣에서 자동 추론"
     ],
     [
      "slender",
      "Slender — 가늘고 슬림한 체형"
     ],
     [
      "athletic",
      "Athletic — 탄탄한 운동형 체형"
     ],
     [
      "curvy",
      "Curvy — 허리와 골반 곡선이 강조된 체형"
     ],
     [
      "glamorous",
      "Glamorous — 풍만하고 화려한 체형"
     ],
     [
      "muscular",
      "Muscular — 근육이 뚜렷한 체형"
     ],
     [
      "heavy-built",
      "Heavy-built — 중후하고 묵직한 체형"
     ],
     [
      "tall and lean",
      "Tall & Lean — 장신의 길고 슬림한 체형"
     ],
     [
      "petite",
      "Petite — 작고 아담한 체형"
     ],
     [
      "hourglass",
      "Hourglass — 허리가 잘록한 모래시계형"
     ],
     [
      "voluptuous",
      "Voluptuous — 굴곡이 크고 육감적인 체형"
     ],
     [
      "toned",
      "Toned — 군살 없이 잔근육이 잡힌 체형"
     ],
     [
      "wiry",
      "Wiry — 가늘지만 단단한 체형"
     ],
     [
      "soft-figured",
      "Soft-figured — 부드럽고 살집 있는 체형"
     ],
     [
      "pear-shaped",
      "Pear-shaped — 하체에 무게가 실린 체형"
     ],
     [
      "inverted triangle",
      "Inverted Triangle — 어깨가 넓고 하체가 좁은 역삼각형"
     ],
     [
      "stocky",
      "Stocky — 짧고 다부진 체형"
     ],
     [
      "statuesque",
      "Statuesque — 크고 당당한 조각상 같은 체형"
     ],
     [
      "broad-shouldered",
      "Broad-shouldered — 어깨가 특히 넓은 체형"
     ],
     [
      "burly",
      "Burly — 크고 두꺼운 거구"
     ],
     [
      "lanky",
      "Lanky — 키만 크고 마른 체형"
     ],
     [
      "barrel-chested",
      "Barrel-chested — 흉곽이 통처럼 두꺼운 체형"
     ],
     [
      "rangy",
      "Rangy — 길고 유연한 근육질"
     ],
     [
      "__custom__",
      "직접 입력… — 원하는 체형 직접 작성"
     ]
    ],
    "group": "build"
   },
   {
    "key": "height impression",
    "label": "Height Impression",
    "ko": "키 인상",
    "options": [
     [
      "",
      "AUTO — 전체 비율에서 자동 결정"
     ],
     [
      "short",
      "Short — 비교적 작은 키 인상"
     ],
     [
      "average",
      "Average — 평균적인 키 인상"
     ],
     [
      "tall",
      "Tall — 장신 인상"
     ],
     [
      "very tall",
      "Very Tall — 매우 큰 키 인상"
     ],
     [
      "__custom__",
      "직접 입력… — 원하는 키/비율 직접 작성"
     ]
    ],
    "group": "build",
    "sub": "body type"
   },
   {
    "key": "shoulder build",
    "label": "Shoulder Build",
    "ko": "어깨 체형",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "narrow",
      "Narrow — 좁은 어깨"
     ],
     [
      "average",
      "Average — 평균적인 어깨"
     ],
     [
      "broad",
      "Broad — 넓은 어깨"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "build",
    "sub": "body type"
   },
   {
    "key": "torso / chest build",
    "label": "Torso / Chest Build",
    "ko": "상체/흉곽 인상",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "slim",
      "Slim — 얇고 가벼운 상체"
     ],
     [
      "balanced",
      "Balanced — 균형 잡힌 상체"
     ],
     [
      "full",
      "Full — 풍만한 상체"
     ],
     [
      "powerful",
      "Powerful — 넓고 강한 흉곽"
     ],
     [
      "v-taper",
      "V-taper — 어깨에서 허리로 급히 좁아지는 상체"
     ],
     [
      "full bust",
      "Full Bust — 가슴 볼륨이 뚜렷한 상체"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "build",
    "sub": "body type"
   },
   {
    "key": "torso length",
    "label": "Torso Length",
    "ko": "몸통 길이",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "short",
      "Short — 짧은 몸통"
     ],
     [
      "balanced",
      "Balanced — 보통"
     ],
     [
      "long",
      "Long — 긴 몸통"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "build",
    "sub": "body type"
   },
   {
    "key": "waist / hip silhouette",
    "label": "Waist / Hip Silhouette",
    "ko": "허리/골반 실루엣",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "straight",
      "Straight — 직선적인 실루엣"
     ],
     [
      "athletic",
      "Athletic — 운동형 허리/골반"
     ],
     [
      "balanced",
      "Balanced — 균형형"
     ],
     [
      "hourglass",
      "Hourglass — 허리가 잘록한 모래시계형"
     ],
     [
      "curvy",
      "Curvy — 골반 곡선이 강조된 형태"
     ],
     [
      "narrow-hipped",
      "Narrow-hipped — 골반이 좁은 형태"
     ],
     [
      "broad-hipped",
      "Broad-hipped — 골반이 넓게 벌어진 형태"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "build",
    "sub": "body type"
   },
   {
    "key": "leg proportion",
    "label": "Leg Proportion",
    "ko": "다리 비율",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "balanced",
      "Balanced — 균형형"
     ],
     [
      "long",
      "Long — 긴 다리"
     ],
     [
      "very long",
      "Very Long — 매우 긴 다리"
     ],
     [
      "powerful",
      "Powerful — 굵고 힘 있는 다리"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "build",
    "sub": "body type"
   },
   {
    "key": "lower-body build",
    "label": "Lower-body Build",
    "ko": "하체 굵기",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "slender",
      "Slender — 가는 하체"
     ],
     [
      "balanced",
      "Balanced — 보통"
     ],
     [
      "full",
      "Full — 굵은 하체"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "build",
    "sub": "body type"
   },
   {
    "key": "body measurements (B/W/H)",
    "label": "Body Measurements",
    "ko": "신체 치수 B/W/H",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "build",
    "sub": "body type",
    "ph": "94 / 61 / 95"
   },
   {
    "key": "facial character",
    "label": "Facial Character",
    "ko": "얼굴 인상",
    "options": [
     [
      "",
      "AUTO — 책 설계표 성격에 맞춰 자동 결정"
     ],
     [
      "elegant",
      "Elegant — 우아하고 정제된 인상"
     ],
     [
      "cool",
      "Cool — 차갑고 세련된 인상"
     ],
     [
      "sharp",
      "Sharp — 예리하고 공격적인 인상"
     ],
     [
      "mature",
      "Mature — 성숙하고 안정된 인상"
     ],
     [
      "soft",
      "Soft — 부드럽고 온화한 인상"
     ],
     [
      "glamorous",
      "Glamorous — 화려하고 매력적인 인상"
     ],
     [
      "rugged",
      "Rugged — 거칠고 강인한 인상"
     ],
     [
      "stoic",
      "Stoic — 무표정하고 절제된 인상"
     ],
     [
      "weathered",
      "Weathered — 풍상을 겪은 거친 인상"
     ],
     [
      "boyish",
      "Boyish — 앳되고 장난기 있는 인상"
     ],
     [
      "regal",
      "Regal — 위엄 있고 고압적인 인상"
     ],
     [
      "cute",
      "Cute — 귀엽고 사랑스러운 인상"
     ],
     [
      "doll-like",
      "Doll-like — 인형처럼 정제된 인상"
     ],
     [
      "cheerful",
      "Cheerful — 밝고 명랑한 인상"
     ],
     [
      "innocent",
      "Innocent — 맑고 순수해 보이는 인상"
     ],
     [
      "friendly",
      "Friendly — 다가가기 쉬운 인상"
     ],
     [
      "sleepy-eyed",
      "Sleepy-eyed — 나른한 인상"
     ],
     [
      "refined",
      "Refined — 단정하고 세련된 인상"
     ],
     [
      "fierce",
      "Fierce — 사납고 거센 인상"
     ],
     [
      "exotic",
      "Exotic — 이국적인 인상"
     ],
     [
      "androgynous",
      "Androgynous — 중성적인 인상"
     ],
     [
      "melancholic",
      "Melancholic — 어딘가 쓸쓸한 인상"
     ],
     [
      "__custom__",
      "직접 입력… — 원하는 얼굴 인상 직접 작성"
     ]
    ],
    "group": "face"
   },
   {
    "key": "skin tone",
    "label": "Skin Tone",
    "ko": "피부 톤",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "pale",
      "Pale — 매우 밝은 피부"
     ],
     [
      "light",
      "Light — 밝은 피부"
     ],
     [
      "medium",
      "Medium — 중간 피부톤"
     ],
     [
      "tan",
      "Tan — 태닝된 피부"
     ],
     [
      "deep",
      "Deep — 짙은 피부톤"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "face"
   },
   {
    "key": "face shape",
    "label": "Face Shape",
    "ko": "얼굴형",
    "options": [
     [
      "",
      "AUTO — 책 설계표 디자인에서 자동 추론"
     ],
     [
      "oval",
      "Oval — 균형 잡힌 타원형"
     ],
     [
      "angular",
      "Angular — 각지고 선명한 얼굴형"
     ],
     [
      "heart-shaped",
      "Heart-shaped — 이마가 넓고 턱이 가는 하트형"
     ],
     [
      "elongated",
      "Elongated — 길고 세련된 얼굴형"
     ],
     [
      "compact",
      "Compact — 짧고 응축된 얼굴형"
     ],
     [
      "softly rounded",
      "Softly Rounded — 부드럽고 둥근 얼굴형"
     ],
     [
      "sharp",
      "Sharp — 턱선과 골격이 날카로운 얼굴형"
     ],
     [
      "__custom__",
      "직접 입력… — 얼굴형 직접 작성"
     ]
    ],
    "group": "face",
    "sub": "facial character"
   },
   {
    "key": "eye shape",
    "label": "Eye Shape",
    "ko": "눈매",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "narrow",
      "Narrow — 가늘고 날카로운 눈"
     ],
     [
      "almond",
      "Almond — 아몬드형 눈"
     ],
     [
      "large",
      "Large — 큰 눈"
     ],
     [
      "sharp",
      "Sharp — 강하게 치켜올라간 눈"
     ],
     [
      "drooping",
      "Drooping — 살짝 처진 부드러운 눈"
     ],
     [
      "upturned",
      "Upturned — 끝이 올라간 눈"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "face",
    "sub": "facial character"
   },
   {
    "key": "eye color",
    "label": "Eye Color",
    "ko": "눈동자 색 · 오른쪽",
    "options": [
     [
      "",
      "AUTO — 책 팔레트에서 자동 결정"
     ],
     [
      "red",
      "Red — 적색"
     ],
     [
      "crimson",
      "Crimson — 진홍색"
     ],
     [
      "amber",
      "Amber — 호박색"
     ],
     [
      "gold",
      "Gold — 금색"
     ],
     [
      "orange",
      "Orange — 주황색"
     ],
     [
      "green",
      "Green — 녹색"
     ],
     [
      "teal",
      "Teal — 청록색"
     ],
     [
      "pale blue",
      "Pale Blue — 옅은 하늘색"
     ],
     [
      "blue",
      "Blue — 청색"
     ],
     [
      "navy",
      "Navy — 짙은 남색"
     ],
     [
      "purple",
      "Purple — 보라색"
     ],
     [
      "lavender",
      "Lavender — 연보라"
     ],
     [
      "pink",
      "Pink — 분홍색"
     ],
     [
      "gray",
      "Gray — 회색"
     ],
     [
      "silver",
      "Silver — 은색"
     ],
     [
      "brown",
      "Brown — 갈색"
     ],
     [
      "black",
      "Black — 검은색"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "face",
    "sub": "facial character"
   },
   {
    "key": "second eye color",
    "label": "Second Eye Color",
    "ko": "오드아이 · 왼쪽 눈",
    "group": "face",
    "sub": "facial character",
    "options": [
     [
      "",
      "사용 안 함 — 양쪽 같은 색"
     ],
     [
      "red",
      "Red — 적색"
     ],
     [
      "crimson",
      "Crimson — 진홍색"
     ],
     [
      "amber",
      "Amber — 호박색"
     ],
     [
      "gold",
      "Gold — 금색"
     ],
     [
      "orange",
      "Orange — 주황색"
     ],
     [
      "green",
      "Green — 녹색"
     ],
     [
      "teal",
      "Teal — 청록색"
     ],
     [
      "pale blue",
      "Pale Blue — 옅은 하늘색"
     ],
     [
      "blue",
      "Blue — 청색"
     ],
     [
      "navy",
      "Navy — 짙은 남색"
     ],
     [
      "purple",
      "Purple — 보라색"
     ],
     [
      "lavender",
      "Lavender — 연보라"
     ],
     [
      "pink",
      "Pink — 분홍색"
     ],
     [
      "gray",
      "Gray — 회색"
     ],
     [
      "silver",
      "Silver — 은색"
     ],
     [
      "brown",
      "Brown — 갈색"
     ],
     [
      "black",
      "Black — 검은색"
     ],
     [
      "__custom__",
      "직접 입력… — 원하는 색 직접 작성"
     ]
    ]
   },
   {
    "key": "face length",
    "label": "Face Length",
    "ko": "얼굴 길이",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "short",
      "Short — 짧은 얼굴"
     ],
     [
      "balanced",
      "Balanced — 보통"
     ],
     [
      "long",
      "Long — 긴 얼굴"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "face",
    "sub": "facial character"
   },
   {
    "key": "face width",
    "label": "Face Width",
    "ko": "얼굴 폭",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "narrow",
      "Narrow — 좁은 얼굴"
     ],
     [
      "medium",
      "Medium — 보통"
     ],
     [
      "wide",
      "Wide — 넓은 얼굴"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "face",
    "sub": "facial character"
   },
   {
    "key": "jaw & chin",
    "label": "Jaw & Chin",
    "ko": "턱선 · 턱끝",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "soft rounded jaw",
      "Soft — 부드럽고 둥근 턱"
     ],
     [
      "balanced jawline",
      "Balanced — 보통"
     ],
     [
      "angular defined jaw",
      "Angular — 각지고 또렷한 턱"
     ],
     [
      "square broad jaw",
      "Square — 넓고 각진 사각 턱"
     ],
     [
      "narrow tapered chin",
      "Tapered — 아래로 갈수록 좁아지는 턱끝"
     ],
     [
      "wide heavy chin",
      "Heavy — 넓고 묵직한 턱끝"
     ],
     [
      "long chin with defined jaw",
      "Long — 턱끝이 길고 턱선이 또렷한"
     ],
     [
      "receding soft chin",
      "Receding — 턱끝이 뒤로 물러난"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "face",
    "sub": "facial character"
   },
   {
    "key": "eye size",
    "label": "Eye Size",
    "ko": "눈 크기",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "small",
      "Small — 작은 눈"
     ],
     [
      "medium",
      "Medium — 보통"
     ],
     [
      "large",
      "Large — 큰 눈"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "face",
    "sub": "facial character"
   },
   {
    "key": "eye tilt",
    "label": "Eye Tilt",
    "ko": "눈꼬리 각도",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "downturned outer corners",
      "Downturned — 처진 눈꼬리"
     ],
     [
      "level outer corners",
      "Level — 수평"
     ],
     [
      "upturned outer corners",
      "Upturned — 올라간 눈꼬리"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "face",
    "sub": "facial character"
   },
   {
    "key": "eye spacing",
    "label": "Eye Spacing",
    "ko": "눈 간격",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "close-set eyes",
      "Close-set — 눈 사이가 가까운"
     ],
     [
      "average eye spacing",
      "Average — 눈 하나 너비 안팎"
     ],
     [
      "wide-set eyes",
      "Wide-set — 눈 사이가 넓은"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "face",
    "sub": "facial character"
   },
   {
    "key": "eyebrows",
    "label": "Eyebrows",
    "ko": "눈썹",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "fine soft arches",
      "Fine Arch — 가늘고 완만한 곡선"
     ],
     [
      "long arched brows",
      "Long Arch — 길고 바깥 아치가 선명한"
     ],
     [
      "straight medium brows",
      "Straight — 중간 두께의 직선"
     ],
     [
      "thin straight brows",
      "Thin Straight — 가늘고 곧은"
     ],
     [
      "thick low brows",
      "Thick Low — 굵고 눈 가까이 낮은"
     ],
     [
      "angled brows",
      "Angled — 바깥에서 꺾이는 사선"
     ],
     [
      "short rounded brows",
      "Short Round — 짧고 둥근"
     ],
     [
      "feathered full brows",
      "Feathered — 숱 많고 결이 보이는"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "face",
    "sub": "facial character"
   },
   {
    "key": "nose character",
    "label": "Nose Character",
    "ko": "코",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "small delicate nose",
      "Delicate — 작고 여린 코"
     ],
     [
      "balanced nose",
      "Balanced — 보통"
     ],
     [
      "prominent defined nose",
      "Prominent — 크고 또렷한 코"
     ],
     [
      "straight slender bridge",
      "Straight — 곧고 가는 콧대"
     ],
     [
      "aquiline nose with convex bridge",
      "Aquiline — 콧대가 볼록한 매부리코"
     ],
     [
      "rounded soft tip",
      "Rounded Tip — 코끝이 둥근"
     ],
     [
      "broad low bridge",
      "Broad Low — 콧대가 낮고 넓은"
     ],
     [
      "short nose with upturned tip",
      "Upturned — 짧고 코끝이 들린"
     ],
     [
      "long nose with low tip",
      "Long — 길고 코끝이 내려온"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "face",
    "sub": "facial character"
   },
   {
    "key": "lips",
    "label": "Lips",
    "ko": "입술",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "thin lips",
      "Thin — 얇은 입술"
     ],
     [
      "medium lips",
      "Medium — 보통"
     ],
     [
      "full lips",
      "Full — 도톰한 입술"
     ],
     [
      "fuller lower lip",
      "Fuller Lower — 아랫입술이 더 도톰한"
     ],
     [
      "bow-shaped upper lip",
      "Bow — 윗입술이 활 모양인"
     ],
     [
      "straight even lips",
      "Even — 굴곡 없이 곧은"
     ],
     [
      "wide mouth",
      "Wide — 입이 넓은"
     ],
     [
      "small mouth",
      "Small — 입이 작은"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "face",
    "sub": "facial character"
   },
   {
    "key": "hair color",
    "label": "Hair Color",
    "ko": "머리색",
    "options": [
     [
      "",
      "AUTO — 책 설계표 색상에 맞춰 자동 결정"
     ],
     [
      "white",
      "White — 흰색"
     ],
     [
      "platinum",
      "Platinum — 백금색"
     ],
     [
      "silver",
      "Silver — 은색"
     ],
     [
      "ash blonde",
      "Ash Blonde — 애시 블론드"
     ],
     [
      "blonde",
      "Blonde — 금발"
     ],
     [
      "gold",
      "Gold — 금색"
     ],
     [
      "orange",
      "Orange — 주황색"
     ],
     [
      "red",
      "Red — 붉은색"
     ],
     [
      "crimson",
      "Crimson — 진홍색"
     ],
     [
      "pink",
      "Pink — 분홍색"
     ],
     [
      "purple",
      "Purple — 보라색"
     ],
     [
      "lavender",
      "Lavender — 연보라"
     ],
     [
      "navy",
      "Navy — 짙은 남색"
     ],
     [
      "blue",
      "Blue — 파란색"
     ],
     [
      "teal",
      "Teal — 청록색"
     ],
     [
      "mint",
      "Mint — 민트색"
     ],
     [
      "green",
      "Green — 녹색"
     ],
     [
      "brown",
      "Brown — 갈색"
     ],
     [
      "black",
      "Black — 검은색"
     ],
     [
      "__custom__",
      "직접 입력… — 원하는 색 직접 작성"
     ]
    ],
    "group": "hair"
   },
   {
    "key": "hairstyle",
    "label": "Hairstyle",
    "ko": "헤어스타일",
    "options": [
     [
      "",
      "AUTO — 책 설계표 디자인에 맞춰 자동 결정"
     ],
     [
      "bob",
      "Bob — 단정한 보브컷"
     ],
     [
      "pixie cut",
      "Pixie Cut — 짧고 가벼운 픽시컷"
     ],
     [
      "layered",
      "Layered — 층을 살린 레이어드"
     ],
     [
      "ponytail",
      "Ponytail — 포니테일"
     ],
     [
      "twin tail",
      "Twin Tail — 트윈테일"
     ],
     [
      "wolf cut",
      "Wolf Cut — 층감이 강한 울프컷"
     ],
     [
      "slicked back",
      "Slicked Back — 뒤로 넘긴 스타일"
     ],
     [
      "wavy",
      "Wavy — 웨이브 헤어"
     ],
     [
      "straight",
      "Straight — 곧은 생머리"
     ],
     [
      "side ponytail",
      "Side Ponytail — 사이드 포니테일"
     ],
     [
      "high ponytail",
      "High Ponytail — 높이 묶은 포니테일"
     ],
     [
      "braid",
      "Single Braid — 한 갈래 땋은 머리"
     ],
     [
      "twin braids",
      "Twin Braids — 양갈래 땋은 머리"
     ],
     [
      "crown braid",
      "Crown Braid — 머리를 둘러 땋은 왕관형"
     ],
     [
      "chignon",
      "Chignon — 단정하게 말아 올린 시뇽"
     ],
     [
      "messy bun",
      "Messy Bun — 흐트러진 번"
     ],
     [
      "top knot",
      "Top Knot — 정수리에 묶어 올린 번"
     ],
     [
      "low bun",
      "Low Bun — 목덜미 낮은 번"
     ],
     [
      "half-up",
      "Half-up — 반묶음"
     ],
     [
      "space buns",
      "Space Buns — 양쪽 동그란 번"
     ],
     [
      "hime cut",
      "Hime Cut — 히메컷"
     ],
     [
      "asymmetric cut",
      "Asymmetric Cut — 좌우 길이가 다른 비대칭컷"
     ],
     [
      "undercut",
      "Undercut — 옆/뒤를 밀어낸 언더컷"
     ],
     [
      "side-shaved long hair",
      "Side-shaved Long — 한쪽만 밀고 나머지는 긴 머리"
     ],
     [
      "curly",
      "Curly — 굵은 곱슬"
     ],
     [
      "tight curls",
      "Tight Curls — 잔곱슬 / 아프로"
     ],
     [
      "locs",
      "Locs — 로크스 / 드레드풍"
     ],
     [
      "ringlet curls",
      "Ringlet Curls — 세로로 말린 드릴 컬"
     ],
     [
      "finger waves",
      "Finger Waves — 레트로 웨이브"
     ],
     [
      "feathered",
      "Feathered — 끝을 가볍게 친 페더컷"
     ],
     [
      "blunt cut",
      "Blunt Cut — 끝을 일자로 자른 컷"
     ],
     [
      "wet-look slick",
      "Wet-look Slick — 젖은 듯 넘긴 스타일"
     ],
     [
      "windswept",
      "Windswept — 바람에 날린 듯한 스타일"
     ],
     [
      "buzz cut",
      "Buzz Cut — 아주 짧게 민 머리"
     ],
     [
      "crew cut",
      "Crew Cut — 짧고 단정한 크루컷"
     ],
     [
      "side part",
      "Side Part — 가르마를 탄 단정한 컷"
     ],
     [
      "fade",
      "Fade — 옆을 그라데이션으로 짧게 친 컷"
     ],
     [
      "man bun",
      "Man Bun — 뒤로 묶어 올린 번"
     ],
     [
      "swept back",
      "Swept Back — 뒤로 넘긴 볼륨 있는 스타일"
     ],
     [
      "shaggy",
      "Shaggy — 덥수룩하게 흐트러진 컷"
     ],
     [
      "mullet",
      "Mullet — 앞은 짧고 뒤만 긴 컷"
     ],
     [
      "afro",
      "Afro — 둥글게 부풀린 아프로"
     ],
     [
      "afro puffs",
      "Afro Puffs — 양쪽 아프로 퍼프"
     ],
     [
      "box braids",
      "Box Braids — 가는 박스 브레이드"
     ],
     [
      "cornrows",
      "Cornrows — 두피에 붙여 땋은 콘로"
     ],
     [
      "fishtail braid",
      "Fishtail Braid — 한쪽으로 넘긴 피시테일"
     ],
     [
      "beach waves",
      "Beach Waves — 느슨한 해변 웨이브"
     ],
     [
      "__custom__",
      "직접 입력… — 헤어스타일 직접 작성"
     ]
    ],
    "group": "hair"
   },
   {
    "key": "hair length",
    "label": "Hair Length",
    "ko": "머리 길이",
    "options": [
     [
      "",
      "AUTO — 책 설계표 실루엣에 맞춰 자동 결정"
     ],
     [
      "very short",
      "Very Short — 매우 짧은 머리"
     ],
     [
      "short",
      "Short — 짧은 머리"
     ],
     [
      "medium",
      "Medium — 중간 길이"
     ],
     [
      "long",
      "Long — 긴 머리"
     ],
     [
      "very long",
      "Very Long — 매우 긴 머리"
     ],
     [
      "__custom__",
      "직접 입력… — 길이 직접 작성"
     ]
    ],
    "group": "hair",
    "sub": "hairstyle"
   },
   {
    "key": "bangs",
    "label": "Bangs",
    "ko": "앞머리",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "none",
      "None — 앞머리 없음"
     ],
     [
      "straight bangs",
      "Straight Bangs — 일자 앞머리"
     ],
     [
      "side-swept bangs",
      "Side-swept Bangs — 옆으로 넘긴 앞머리"
     ],
     [
      "curtain bangs",
      "Curtain Bangs — 커튼뱅"
     ],
     [
      "long side bangs",
      "Long Side Bangs — 긴 사이드뱅"
     ],
     [
      "long side bangs covering one eye",
      "One-eye Cover — 한쪽 눈을 덮는 긴 사이드뱅"
     ],
     [
      "asymmetric bangs",
      "Asymmetric Bangs — 좌우 길이가 다른 앞머리"
     ],
     [
      "parted bangs",
      "Parted Bangs — 가운데를 가른 앞머리"
     ],
     [
      "choppy bangs",
      "Choppy Bangs — 끝을 불규칙하게 친 앞머리"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "hair",
    "sub": "hairstyle"
   },
   {
    "key": "hair accent",
    "label": "Hair Accent",
    "ko": "머리 삐침 · 잔머리",
    "group": "hair",
    "sub": "hairstyle",
    "options": [
     [
      "",
      "AUTO — 지정 안 함"
     ],
     [
      "a single antenna strand standing up",
      "Antenna Strand — 안테나 헤어 한 가닥"
     ],
     [
      "two antenna strands standing up",
      "Twin Antennae — 안테나 헤어 두 가닥"
     ],
     [
      "a prominent cowlick",
      "Cowlick — 크게 뻗친 가마머리"
     ],
     [
      "loose stray strands framing the face",
      "Stray Strands — 얼굴 옆 잔머리"
     ],
     [
      "neatly kept, no stray strands",
      "Neat — 삐침 없이 정돈"
     ],
     [
      "__custom__",
      "직접 입력… — 원하는 형태 직접 작성"
     ]
    ]
   },
   {
    "key": "hair texture",
    "label": "Hair Texture",
    "ko": "머릿결",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "fine",
      "Fine — 가늘고 매끄러운"
     ],
     [
      "medium",
      "Medium — 보통"
     ],
     [
      "thick",
      "Thick — 굵고 뻣뻣한"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "hair",
    "sub": "hairstyle"
   },
   {
    "key": "hair volume",
    "label": "Hair Volume",
    "ko": "머리 볼륨",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "flat",
      "Flat — 납작한"
     ],
     [
      "moderate",
      "Moderate — 보통"
     ],
     [
      "full",
      "Full — 풍성한"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "hair",
    "sub": "hairstyle"
   },
   {
    "key": "parting",
    "label": "Parting",
    "ko": "가르마",
    "options": [
     [
      "",
      "AUTO — 자동 결정"
     ],
     [
      "center part",
      "Center — 가운데 가르마"
     ],
     [
      "slight off-center part",
      "Slight off-center — 살짝 비낀 가르마"
     ],
     [
      "deep side part",
      "Deep side — 깊은 옆 가르마"
     ],
     [
      "no visible part",
      "None — 가르마 없음"
     ],
     [
      "swept back",
      "Swept back — 뒤로 넘긴"
     ],
     [
      "__custom__",
      "직접 입력…"
     ]
    ],
    "group": "hair",
    "sub": "hairstyle"
   }
  ];
  const PARAM_GUIDES = {
   "body type": {
    "slender": [
     "골격과 팔다리가 가늘고 연부조직 볼륨이 적어요.",
     "narrow frame and slim limbs, low soft-tissue volume"
    ],
    "athletic": [
     "중간 골격에 운동으로 발달한 근육을 표현해요.",
     "moderate frame with developed functional muscles"
    ],
    "curvy": [
     "허리와 가슴·골반 사이의 부드러운 곡선 차이를 강조해요.",
     "flowing bust-to-waist and hip-to-waist curves"
    ],
    "glamorous": [
     "가슴과 골반의 풍만함, 잘록한 허리로 표현해요. 화장이나 의상 지시는 아니에요.",
     "full bust and hips with a defined waist; anatomy, not makeup or outfit"
    ],
    "muscular": [
     "어깨·팔·몸통·다리에 근육의 두께와 구분이 뚜렷해요.",
     "substantial, visibly defined muscles through torso and limbs"
    ],
    "heavy-built": [
     "넓은 골격과 두꺼운 몸통·팔다리를 뜻해요. 두꺼운 의상이나 키를 뜻하지 않아요.",
     "broad frame, thick torso and limbs; independent of costume and height"
    ],
    "tall and lean": [
     "큰 키에 가늘고 길게 이어지는 몸통과 팔다리를 조합해요.",
     "tall stature, lean torso and long slender limbs"
    ],
    "petite": [
     "작은 성인 골격과 아담한 키예요. 아동 비례로 바꾸지 않아요.",
     "short stature and small adult frame; adult head-to-body proportions"
    ],
    "hourglass": [
     "가슴과 골반의 정면 폭이 비슷하고 허리가 좁아요. 전체 볼륨은 별개예요.",
     "similar bust and hip widths, distinctly narrower waist; volume is separate"
    ],
    "voluptuous": [
     "가슴·골반·허벅지의 풍부한 연부조직과 큰 굴곡을 표현해요.",
     "generous soft-tissue volume at bust, hips and thighs with pronounced curves"
    ],
    "toned": [
     "근육 크기를 키우기보다 피부 아래 잔근육 윤곽을 보여줘요.",
     "subtle muscle definition without large muscle mass"
    ],
    "wiry": [
     "가느다란 골격 위에 힘줄과 단단한 근육 윤곽이 보여요.",
     "slim frame with taut, sinewy muscle definition"
    ],
    "soft-figured": [
     "근육 경계가 두드러지지 않는 부드러운 살집이에요.",
     "soft flesh contours with little visible muscle separation"
    ],
    "pear-shaped": [
     "어깨·가슴보다 골반과 허벅지 쪽에 폭과 볼륨이 많아요.",
     "hips and thighs wider and fuller than shoulders and bust"
    ],
    "inverted triangle": [
     "골반보다 어깨가 넓고 아래로 좁아지는 골격이에요.",
     "shoulders wider than hips, upper body tapering downward"
    ],
    "stocky": [
     "상대적으로 짧은 팔다리와 폭이 있는 단단한 몸통이에요.",
     "compact broad torso and relatively short, sturdy limbs"
    ],
    "statuesque": [
     "큰 키와 균형 잡힌 긴 비례, 탄탄한 볼륨이에요.",
     "tall, balanced long proportions with substantial firm contours"
    ],
    "broad-shouldered": [
     "골반과 비교해 어깨뼈 사이 폭이 넓어요. 견갑 장비 크기와 달라요.",
     "wide skeletal shoulder span relative to hips"
    ],
    "burly": [
     "넓은 골격 위로 몸통과 팔다리의 근육·살집이 두꺼워요.",
     "large broad frame with thick muscular and soft-tissue mass"
    ],
    "lanky": [
     "큰 키에 특히 길고 가느다란 팔다리예요.",
     "tall frame with especially long, thin limbs"
    ],
    "barrel-chested": [
     "흉곽 자체가 앞뒤로 깊고 옆으로 넓어요. 가슴 크기와는 별개예요.",
     "wide, deep ribcage; independent of breast volume"
    ],
    "rangy": [
     "긴 팔다리에 가늘고 유연한 근육이 이어져요.",
     "long limbs with lean, flexible muscle contours"
    ]
   },
   "height impression": {
    "short": [
     "성인 비례 안에서 키가 작게 읽히도록 해요. 화면 속 인물 크기를 줄이지 않아요.",
     "short adult stature; keep subject framing unchanged"
    ],
    "average": [
     "선택한 체형 안에서 키의 크고 작음이 두드러지지 않아요.",
     "moderate stature within the build"
    ],
    "tall": [
     "성인 장신 비례로 표현해요. 카메라를 뒤로 빼라는 뜻은 아니에요.",
     "tall adult stature; preserve framing"
    ],
    "very tall": [
     "장신보다 더 큰 키 인상이며 머리나 관절을 왜곡하지 않아요.",
     "exceptionally tall adult stature with plausible head and joint proportions"
    ]
   },
   "shoulder build": {
    "narrow": [
     "선택한 체형 안에서 어깨뼈 사이 폭을 조금 좁혀요.",
     "relatively narrow skeletal shoulder span within the build"
    ],
    "average": [
     "체형에 맞는 중간 어깨 폭을 유지해요.",
     "moderate skeletal shoulder span within the build"
    ],
    "broad": [
     "골격의 어깨 폭을 넓혀요. 어깨 의상 부피와는 별개예요.",
     "relatively broad skeletal shoulder span, independent of pauldrons"
    ]
   },
   "torso / chest build": {
    "slim": [
     "흉곽의 폭·앞뒤 두께와 상체 살집을 절제해요.",
     "slim ribcage and low upper-torso soft-tissue volume"
    ],
    "balanced": [
     "선택한 체형에 맞는 중간 흉곽·가슴 볼륨이에요.",
     "moderate ribcage and bust volume within the build"
    ],
    "full": [
     "흉곽 주변과 가슴을 포함한 상체의 부드러운 볼륨을 늘려요.",
     "fuller upper-torso soft tissue including bust"
    ],
    "powerful": [
     "흉곽 폭·두께와 등·가슴 주변 근육을 강조해요.",
     "broad deep ribcage with strong upper-torso muscles"
    ],
    "v-taper": [
     "어깨·등의 폭에서 허리로 뚜렷하게 좁아져요.",
     "upper back and shoulders taper distinctly to the waist"
    ],
    "full bust": [
     "가슴 볼륨을 풍성하게, 흉곽·어깨는 자연스러운 비율로 두어 모래시계 선을 살려요.",
     "fuller breast volume with a naturally proportioned ribcage and shoulders, keeping a feminine hourglass line"
    ]
   },
   "torso length": {
    "short": [
     "어깨선에서 골반까지의 길이가 체형 내에서 짧은 편이에요. 복부를 찌그러뜨리지 않아요.",
     "relatively short shoulder-to-pelvis span; retain anatomical spacing"
    ],
    "balanced": [
     "선택한 체형에 맞는 중간 몸통 길이예요.",
     "moderate shoulder-to-pelvis span within the build"
    ],
    "long": [
     "어깨선에서 골반까지의 길이를 조금 길게 잡아요.",
     "relatively long shoulder-to-pelvis span within the build"
    ]
   },
   "waist / hip silhouette": {
    "straight": [
     "허리와 골반 폭의 차이가 적은 윤곽이에요.",
     "small waist-to-hip width contrast"
    ],
    "athletic": [
     "허리가 탄탄하고 골반으로 이어지는 굴곡이 절제돼요.",
     "firm waist with restrained hip curvature"
    ],
    "balanced": [
     "체형에 이미 정한 허리·골반 비율을 과장 없이 유지해요.",
     "retain the build's waist-to-hip ratio without extra exaggeration"
    ],
    "hourglass": [
     "골반보다 허리가 확실히 좁고 양옆 곡선이 이어져요.",
     "distinct waist indentation curving outward into hips"
    ],
    "curvy": [
     "허리에서 골반 바깥으로 이어지는 둥근 곡선을 강조해요.",
     "rounded outward hip curves from the waist"
    ],
    "narrow-hipped": [
     "선택한 골격 안에서 골반 폭을 좁게 잡아요.",
     "relatively narrow pelvic span within the build"
    ],
    "broad-hipped": [
     "골반 자체의 가로 폭을 넓혀요. 허벅지 굵기와는 별개예요.",
     "relatively broad pelvic span; thigh thickness is separate"
    ]
   },
   "leg proportion": {
    "balanced": [
     "몸통에 맞는 다리 길이예요. 굵기는 하체 굵기에서 정해요.",
     "moderate leg length relative to torso"
    ],
    "long": [
     "몸통 대비 다리가 긴 편이며 무릎 위치도 함께 맞춰요.",
     "long hip-to-floor span with proportionate thigh and shin lengths"
    ],
    "very long": [
     "몸통 대비 다리가 특히 길되 관절과 성인 비례를 유지해요.",
     "especially long legs with plausible adult joint proportions"
    ],
    "powerful": [
     "길이보다는 허벅지·종아리의 발달한 근육을 뜻해요.",
     "developed thigh and calf muscles; no implied leg-length change"
    ]
   },
   "lower-body build": {
    "slender": [
     "의상 아래 허벅지·종아리의 굵기를 가늘게 잡아요.",
     "slender anatomical thighs and calves beneath the costume"
    ],
    "balanced": [
     "체형에 맞는 중간 허벅지·종아리 굵기예요.",
     "moderate thigh and calf thickness within the build"
    ],
    "full": [
     "허벅지·종아리 자체의 볼륨을 풍부하게 해요. 의상 부피와 별개예요.",
     "fuller anatomical thighs and calves, independent of costume volume"
    ]
   },
   "face shape": {
    "oval": [
     "광대 부근이 조금 넓고 이마·턱으로 완만하게 좁아지는 타원형이에요.",
     "oval outline, slightly widest at cheekbones with gradual taper"
    ],
    "angular": [
     "광대와 턱 모서리의 방향 전환이 보여요. 턱끝 모양은 턱 설정을 따라요.",
     "visible cheekbone and jaw-angle transitions; chin follows its own setting"
    ],
    "heart-shaped": [
     "이마·광대가 하관보다 넓어요. 턱끝까지 반드시 뾰족할 필요는 없어요.",
     "forehead and cheekbones wider than lower face; chin tip follows its own setting"
    ],
    "elongated": [
     "가로 폭보다 세로 길이가 도드라지는 얼굴형이에요.",
     "vertical face length pronounced relative to width"
    ],
    "compact": [
     "이마부터 턱까지의 구간이 짧고 응축된 성인 얼굴이에요.",
     "compact adult facial proportions with short vertical spacing"
    ],
    "softly rounded": [
     "얼굴 외곽이 넓은 곡선으로 이어져요. 볼살을 자동으로 늘리지 않아요.",
     "rounded outer facial outline with smooth transitions; no added cheek fullness"
    ],
    "sharp": [
     "광대와 하관의 윤곽이 또렷해요. 턱끝과 폭은 세부 선택이 우선이에요.",
     "crisp cheekbone and lower-face contours; explicit width and chin take priority"
    ]
   },
   "jaw & chin": {
    "soft rounded jaw": [
     "하관 폭을 적당히 유지하고 턱끝을 넓은 U자 곡선으로 그려요. 볼살 추가나 V자 턱이 아니에요.",
     "rounded U-shaped lower-face outline with moderate width and a broad curved chin tip; no pointed apex, V taper or added cheek fullness"
    ],
    "balanced jawline": [
     "턱의 폭·각·길이가 두드러지지 않는 완만한 윤곽이에요.",
     "moderate jaw width, angle and chin length with gradual transitions"
    ],
    "angular defined jaw": [
     "귀 아래 턱 모서리와 하악선을 또렷하게 해요. 사각 폭을 강제하지 않아요.",
     "defined mandibular corners and lower-jaw edges; no automatic widening"
    ],
    "square broad jaw": [
     "하관 폭을 유지하고 양쪽 턱 모서리와 넓은 턱끝을 표현해요.",
     "broad lower jaw with squared corners and a wide chin tip"
    ],
    "narrow tapered chin": [
     "볼 아래에서 턱끝으로 확실히 좁아져요. 턱 길이를 늘리지는 않아요.",
     "lower face narrows distinctly toward a small chin tip without lengthening it"
    ],
    "wide heavy chin": [
     "턱끝의 폭과 앞쪽 볼륨을 강조해요. 볼이나 얼굴 전체를 키우지 않아요.",
     "wide, substantial chin tip without enlarging cheeks or the entire face"
    ],
    "long chin with defined jaw": [
     "아랫입술 아래부터 턱끝까지를 길게 하고 턱선을 또렷하게 해요.",
     "longer lower-lip-to-chin span with defined jaw edges"
    ],
    "receding soft chin": [
     "측면에서 턱끝이 아랫입술보다 뒤로 들어가요. 짧은 얼굴과는 달라요.",
     "chin projects less forward than lower lip in profile, with a soft jaw edge"
    ]
   },
   "face length": {
    "short": [
     "헤어라인부터 턱까지의 세로 길이가 상대적으로 짧아요.",
     "relatively short hairline-to-chin span"
    ],
    "balanced": [
     "얼굴형 안에서 과장 없는 중간 세로 길이예요.",
     "moderate hairline-to-chin span within the face shape"
    ],
    "long": [
     "헤어라인부터 턱까지의 세로 길이가 상대적으로 길어요.",
     "relatively long hairline-to-chin span"
    ]
   },
   "face width": {
    "narrow": [
     "광대 사이 가로 폭이 상대적으로 좁아요. 턱끝 모양은 별개예요.",
     "relatively narrow cheekbone-to-cheekbone span; chin shape is separate"
    ],
    "medium": [
     "얼굴형에 맞는 중간 광대 폭이에요.",
     "moderate cheekbone-to-cheekbone span within the face shape"
    ],
    "wide": [
     "광대 사이 가로 폭이 넓어요. 볼살을 더하는 지시가 아니에요.",
     "relatively wide cheekbone span, not extra cheek fat"
    ]
   },
   "eye shape": {
    "narrow": [
     "눈꺼풀 사이 세로 틈이 좁은 눈이에요. 눈꼬리 각도와 구분해요.",
     "low vertical eyelid opening; corner tilt is separate"
    ],
    "almond": [
     "가운데가 넓고 양끝으로 좁아지는 아몬드 윤곽이에요.",
     "almond outline, widest centrally and tapering toward both corners"
    ],
    "large": [
     "눈꺼풀 개방이 큰 기본 눈매예요. 별도 눈 크기 선택이 우선해요.",
     "open, rounded eyelid outline; explicit eye size controls scale"
    ],
    "sharp": [
     "눈꺼풀 선이 또렷하고 바깥쪽이 들린 기본 눈매예요. 별도 각도가 우선해요.",
     "crisp eyelid edges, upward corners unless eye tilt is specified"
    ],
    "drooping": [
     "바깥 눈꼬리가 내려간 기본 눈매예요. 별도 각도가 우선해요.",
     "soft eyelid contour, downward outer corners unless eye tilt is specified"
    ],
    "upturned": [
     "바깥 눈꼬리가 안쪽보다 올라가요. 별도 각도가 우선해요.",
     "outer corners above inner corners unless eye tilt is specified"
    ]
   },
   "eye size": {
    "small": [
     "얼굴 폭에 비해 눈의 크기가 작아요. 눈을 가늘게 뜨는 표정과 달라요.",
     "small eyes relative to face width, not squinting"
    ],
    "medium": [
     "얼굴 폭에 맞는 중간 눈 크기예요.",
     "moderate eye size relative to face width"
    ],
    "large": [
     "얼굴 폭 대비 큰 눈이에요. 나이나 턱 모양은 바꾸지 않아요.",
     "large eyes relative to face width"
    ]
   },
   "eye tilt": {
    "downturned outer corners": [
     "눈의 안쪽 끝보다 바깥 끝을 낮게 그려요.",
     "outer eye corners lower than inner corners"
    ],
    "level outer corners": [
     "눈의 안쪽과 바깥쪽 끝 높이를 비슷하게 맞춰요.",
     "inner and outer eye corners at similar height"
    ],
    "upturned outer corners": [
     "눈의 안쪽 끝보다 바깥 끝을 높게 그려요.",
     "outer eye corners higher than inner corners"
    ]
   },
   "eye spacing": {
    "close-set eyes": [
     "두 눈 사이를 눈 하나 너비보다 좁게 둬요.",
     "inner eye corners closer than one eye width apart"
    ],
    "average eye spacing": [
     "두 눈 사이를 눈 하나 너비 안팎으로 둬요.",
     "about one eye width between the inner corners"
    ],
    "wide-set eyes": [
     "두 눈 사이를 눈 하나 너비보다 넓게 둬요.",
     "more than one eye width between the inner corners"
    ]
   },
   "eyebrows": {
    "fine soft arches": [
     "가늘고 완만한 곡선, 눈과의 거리는 넉넉해요.",
     "fine softly curved brows set high above the eyes"
    ],
    "long arched brows": [
     "눈보다 길게 뻗고 바깥쪽 아치가 또렷해요.",
     "long brows with a clear outer arch"
    ],
    "straight medium brows": [
     "중간 두께의 곧은 눈썹, 눈과의 거리는 보통이에요.",
     "medium straight brows at a moderate height"
    ],
    "thin straight brows": [
     "가늘고 곧은 눈썹이에요.",
     "thin straight brows"
    ],
    "thick low brows": [
     "굵고 눈 가까이 낮게 놓여요.",
     "thick brows set low and close to the eyes"
    ],
    "angled brows": [
     "바깥쪽에서 꺾여 내려가는 사선 눈썹이에요.",
     "brows rising to a defined angle and dropping at the tail"
    ],
    "short rounded brows": [
     "짧고 둥근 눈썹이에요.",
     "short softly rounded brows"
    ],
    "feathered full brows": [
     "숱이 많고 결이 보이는 눈썹이에요.",
     "full brows with visible feathered hair strokes"
    ]
   },
   "nose character": {
    "small delicate nose": [
     "콧대·콧방울·코끝을 얼굴 대비 작고 가늘게 해요.",
     "small nose with fine bridge, narrow alae and small tip"
    ],
    "balanced nose": [
     "코의 길이·폭·돌출을 얼굴 안에서 중간 정도로 해요.",
     "moderate nose length, width and projection relative to face"
    ],
    "prominent defined nose": [
     "콧대와 코끝의 돌출·입체감을 뚜렷하게 해요.",
     "noticeably projecting bridge and tip with defined structure"
    ],
    "straight slender bridge": [
     "콧등이 곧고 콧대 폭이 가늘어요.",
     "straight nasal profile with a narrow bridge"
    ],
    "aquiline nose with convex bridge": [
     "측면 콧등이 바깥으로 볼록하게 휘어요.",
     "convex bridge visible in nasal profile"
    ],
    "rounded soft tip": [
     "코끝이 둥글고 부드러워요. 코 전체를 크게 하지 않아요.",
     "rounded nasal tip without enlarging the whole nose"
    ],
    "broad low bridge": [
     "콧대 높이가 낮고 가로 폭이 넓어요.",
     "low nasal bridge with broad width"
    ],
    "short nose with upturned tip": [
     "코 길이가 짧고 끝이 조금 위로 향해요.",
     "short nasal length with a slightly upward tip"
    ],
    "long nose with low tip": [
     "코 길이가 길고 끝이 아래로 향해요.",
     "long nasal length with a downward tip"
    ]
   },
   "lips": {
    "thin lips": [
     "입술의 붉은 부분 두께가 얇아요. 입 너비는 별개예요.",
     "thin upper and lower vermilion; mouth width is separate"
    ],
    "medium lips": [
     "입술 두께가 중간 정도예요.",
     "moderate upper and lower lip thickness"
    ],
    "full lips": [
     "윗입술·아랫입술의 두께를 도톰하게 해요.",
     "full upper and lower vermilion"
    ],
    "fuller lower lip": [
     "윗입술보다 아랫입술을 더 도톰하게 해요.",
     "lower lip fuller than upper lip"
    ],
    "bow-shaped upper lip": [
     "윗입술 중앙에 두 봉우리와 오목한 홈을 표현해요.",
     "defined Cupid's bow with two peaks and a central dip"
    ],
    "straight even lips": [
     "기본 입술 경계의 굴곡이 작아요. 무표정을 강제하지 않아요.",
     "relatively even lip border at rest; expression may change"
    ],
    "wide mouth": [
     "입꼬리 사이의 가로 길이를 넓혀요. 두께와 달라요.",
     "wide corner-to-corner mouth span; thickness is separate"
    ],
    "small mouth": [
     "입꼬리 사이의 가로 길이를 작게 해요. 나이를 낮추지 않아요.",
     "short corner-to-corner mouth span; preserve adult age"
    ]
   },
   "hair length": {
    "very short": [
     "풀어 놓은 머리 기준 두피 가까이에서 귀 위까지예요. 짧은 고정 컷은 그 범위 안에서 조절해요.",
     "scalp-close to above-ear length; within the selected cut"
    ],
    "short": [
     "풀어 놓은 머리 기준 귀에서 턱선 부근이에요. 픽시·버즈 등은 고유 길이를 유지해요.",
     "ear-to-jaw length unless the selected cut requires shorter hair"
    ],
    "medium": [
     "풀어 놓은 머리 기준 목에서 어깨 부근이에요. 픽시·버즈 등 고정 컷을 늘리지 않아요.",
     "neck-to-shoulder length unless the selected cut fixes another range"
    ],
    "long": [
     "풀어 놓은 머리 기준 어깨 아래에서 등 중간까지예요. 묶은 길이와 구분해요.",
     "below-shoulder to mid-back loose length; tied hair may appear shorter"
    ],
    "very long": [
     "풀어 놓은 머리 기준 허리 또는 그 아래까지예요. 짧은 고정 컷을 덮어쓰지 않아요.",
     "waist-length or longer when loose; preserve any fixed short cut"
    ]
   },
   "hair texture": {
    "fine": [
     "머리카락 한 올이 가늘고 유연해요. 숱이 적다는 뜻은 아니에요.",
     "fine flexible strands, independent of hair density"
    ],
    "medium": [
     "한 올 굵기와 뻣뻣함이 중간 정도예요. 머리 길이와 달라요.",
     "medium strand thickness/stiffness"
    ],
    "thick": [
     "한 올이 굵고 형태를 잘 유지해요. 부피·인종·곱슬은 별개예요.",
     "coarse, firm strands; independent of volume, ethnicity and curl pattern"
    ]
   },
   "hair volume": {
    "flat": [
     "모근이 두피 가까이 붙고 옆으로 부풀지 않아요.",
     "low root lift and little outward fullness"
    ],
    "moderate": [
     "모근 들림과 머리 전체 부피가 중간 정도예요.",
     "moderate root lift and overall fullness"
    ],
    "full": [
     "모근이 들리고 머리 덩어리의 부피가 풍성해요. 머리통을 키우지 않아요.",
     "high root lift and full hair mass without enlarging the skull"
    ]
   },
   "parting": {
    "center part": [
     "정수리에서 이마 중앙으로 가르마가 보여요.",
     "visible central scalp part"
    ],
    "slight off-center part": [
     "중앙에서 조금 벗어난 가르마예요.",
     "visible scalp part slightly off center"
    ],
    "deep side part": [
     "한쪽 관자놀이 쪽으로 치우친 가르마예요.",
     "visible scalp part far to one side"
    ],
    "no visible part": [
     "두피에 선명한 가르마 선이 보이지 않아요. 옆으로 넘긴 앞머리는 가능해요.",
     "no exposed scalp part line; directional fringe is allowed"
    ],
    "swept back": [
     "이마에서 뒤쪽으로 모근 방향을 넘겨요. 앞머리를 골랐다면 그 부분은 유지해요.",
     "roots directed backward; retain explicitly selected fringe"
    ]
   },
   "bangs": {
    "none": [
     "앞으로 내린 앞머리 없이 이마가 드러나요.",
     "no fringe hanging over forehead"
    ],
    "straight bangs": [
     "이마 위 앞머리의 끝이 수평에 가깝게 이어져요.",
     "fringe with a nearly horizontal lower edge"
    ],
    "side-swept bangs": [
     "이마를 비스듬히 가로질러 한쪽으로 흐르는 앞머리예요.",
     "fringe swept diagonally across forehead"
    ],
    "curtain bangs": [
     "가운데가 갈라져 얼굴 양옆으로 곡선처럼 흘러요.",
     "split fringe curving outward on both sides"
    ],
    "long side bangs": [
     "옆으로 흐르는 긴 앞머리예요. 고정된 짧은 컷은 그 범위 안에서 표현해요.",
     "long lateral fringe within the selected cut's length range"
    ],
    "long side bangs covering one eye": [
     "한쪽 눈 위를 머리카락으로 덮어요. 눈 자체를 없애지 않아요.",
     "side fringe occluding one eye, which remains anatomically present"
    ],
    "asymmetric bangs": [
     "좌우 끝 길이가 다른 앞머리예요.",
     "fringe with unequal left and right lengths"
    ],
    "parted bangs": [
     "앞머리를 가운데에서 두 갈래로 나눠요.",
     "fringe divided centrally; scalp part may remain concealed"
    ],
    "choppy bangs": [
     "앞머리 끝이 여러 길이의 층과 삐침으로 나뉘어요.",
     "fringe with uneven, clearly separated tips"
    ]
   },
   "apparent age": {
    "20s": [
     "20대 성인의 얼굴과 신체 비례예요.",
     "adult woman in her twenties"
    ],
    "30s": [
     "30대 성인의 인상이며 노화 흔적을 과장하지 않아요.",
     "adult woman in her thirties; restrained age cues"
    ],
    "40s": [
     "40대 성인의 인상이며 주름을 과장하지 않아요.",
     "adult woman in her forties; natural age cues"
    ],
    "mature adult": [
     "연륜 있는 성인 인상이에요. 정확한 나이는 직접 입력으로 정할 수 있어요.",
     "mature adult woman with visible but restrained age cues"
    ],
    "youthful adult": [
     "20대 성인에 동안 인상을 더해요. 아동의 신체 비례로 바꾸지 않아요.",
     "adult woman in her twenties with youthful styling and adult proportions"
    ]
   },
   "skin tone": {
    "pale": [
     "피부 고유색이 매우 밝아요. 조명을 밝게 하거나 창백하게 탈색하지 않아요.",
     "very light natural skin tone; retain living skin coloration"
    ],
    "light": [
     "피부 고유색이 밝아요. 조명이나 민족을 지정하는 값은 아니에요.",
     "light natural skin tone"
    ],
    "medium": [
     "피부 고유색이 중간 명도예요. 책 설계표 색을 적용하지 않아요.",
     "medium natural skin tone, independent of source colors"
    ],
    "tan": [
     "따뜻한 황갈색 피부톤이에요. 특정 민족이나 태닝 자국을 강제하지 않아요.",
     "warm tan skin tone; no implied ethnicity or tan lines"
    ],
    "deep": [
     "피부 고유색이 짙어요. 조명으로 어둡게 만드는 것과 달라요.",
     "deep natural skin tone; preserve readable lighting"
    ]
   },
   "facial character": {
    "elegant": [
     "정제된 태도와 섬세한 표정으로 우아함을 표현해요.",
     "composed, graceful demeanor"
    ],
    "cool": [
     "절제된 시선과 담담한 표정의 인상이에요.",
     "reserved, self-possessed demeanor"
    ],
    "sharp": [
     "집중한 시선의 예리한 인상이에요. 턱을 뾰족하게 바꾸지 않아요.",
     "alert, incisive demeanor; no implied pointed jaw"
    ],
    "mature": [
     "침착하고 안정적인 태도예요. 선택한 나이를 올리지 않아요.",
     "self-assured composure without increasing selected age"
    ],
    "soft": [
     "표정의 긴장이 약하고 온화해요. 볼살을 추가하지 않아요.",
     "gentle demeanor without added facial fullness"
    ],
    "glamorous": [
     "정돈된 스타일링과 자신감 있는 인상이에요. 얼굴 구조는 유지해요.",
     "polished, confident glamour without changing facial geometry"
    ],
    "rugged": [
     "꾸밈이 적고 강인한 인상이에요. 흉터를 자동 추가하지 않아요.",
     "unpolished, resilient demeanor; no automatic scars"
    ],
    "stoic": [
     "감정 변화가 적고 절제된 인상이에요.",
     "emotionally restrained demeanor"
    ],
    "weathered": [
     "선택한 나이 안에서 생활감 있는 피부 표현을 더해요.",
     "weather-exposed skin character within the selected age"
    ],
    "boyish": [
     "성인 여성에게 장난스럽고 중성적인 스타일링을 더해요.",
     "playful, tomboyish adult styling"
    ],
    "regal": [
     "침착한 권위와 품위가 느껴지는 인상이에요.",
     "dignified, authoritative composure"
    ],
    "cute": [
     "친근한 표정으로 귀여움을 더해요. 턱·눈 크기나 나이는 바꾸지 않아요.",
     "endearing demeanor without changing age or facial geometry"
    ],
    "doll-like": [
     "피부와 스타일링이 정교하고 단정해요. 인형 관절이나 아동 비례는 아니에요.",
     "meticulously groomed adult styling; no doll anatomy"
    ],
    "cheerful": [
     "활기 있는 시선과 밝은 인상이에요. 장면 표정이 우선이에요.",
     "lively, upbeat demeanor"
    ],
    "innocent": [
     "꾸밈없고 열린 인상이에요. 볼살이나 아동화를 뜻하지 않아요.",
     "open, unguarded demeanor"
    ],
    "friendly": [
     "편안하고 다가가기 쉬운 인상이에요.",
     "approachable, welcoming demeanor"
    ],
    "sleepy-eyed": [
     "눈꺼풀 힘이 풀린 나른한 인상이에요. 눈의 구조는 유지해요.",
     "relaxed eyelids and drowsy demeanor; preserve eye geometry"
    ],
    "refined": [
     "단정하고 절제된 스타일링이에요.",
     "neat, understated grooming and demeanor"
    ],
    "fierce": [
     "강한 집중과 긴장이 느껴지는 인상이에요.",
     "intense, determined demeanor"
    ],
    "exotic": [
     "개성 있는 스타일링을 뜻해요. 특정 민족이나 피부색을 추가하지 않아요.",
     "distinctive styling; no inferred ethnicity or skin-tone change"
    ],
    "androgynous": [
     "성인 여성의 중성적인 스타일링이에요. 신체나 나이를 바꾸지 않아요.",
     "androgynous adult styling without anatomy or age changes"
    ],
    "melancholic": [
     "시선과 미세한 표정에 쓸쓸함을 담아요.",
     "subdued, wistful demeanor"
    ]
   },
   "hairstyle": {
    "bob": [
     "턱선 부근에서 끝나는 보브 윤곽이에요. 길이는 귀 아래~목 범위에서 조절해요.",
     "bob outline ending between below-ear and neck level"
    ],
    "pixie cut": [
     "옆·뒤는 짧고 정수리만 약간 긴 픽시컷이에요. 중간 길이를 골라도 목까지 늘리지 않아요.",
     "cropped sides/nape, slightly longer crown"
    ],
    "layered": [
     "여러 길이의 층으로 머리 윤곽을 만들어요.",
     "distinct graduated layers"
    ],
    "ponytail": [
     "뒤에서 한 갈래로 묶고 남은 머리가 아래로 이어져요.",
     "one rear tie with a hanging tail"
    ],
    "twin tail": [
     "좌우 두 갈래로 묶은 머리예요.",
     "two side ties with hanging tails"
    ],
    "wolf cut": [
     "정수리의 짧은 층과 목덜미의 긴 층을 연결해요.",
     "short layered crown transitioning to longer nape layers"
    ],
    "slicked back": [
     "모근부터 뒤로 매끈하게 빗어 넘겨요.",
     "smooth backward-directed hair from the roots"
    ],
    "wavy": [
     "머리카락이 느슨한 S자 물결을 만들어요.",
     "loose S-shaped waves"
    ],
    "straight": [
     "큰 굴곡 없이 곧게 내려오는 머리예요.",
     "straight strands without waves"
    ],
    "side ponytail": [
     "한쪽 옆에서 한 갈래로 묶어요.",
     "single ponytail tied to one side"
    ],
    "high ponytail": [
     "머리 뒤 높은 위치에서 한 갈래로 묶어요.",
     "single ponytail tied high on the head"
    ],
    "braid": [
     "한 갈래를 규칙적으로 엮어 땋아요.",
     "one interwoven braid"
    ],
    "twin braids": [
     "좌우 두 갈래를 각각 땋아요.",
     "two interwoven braids"
    ],
    "crown braid": [
     "땋은 머리를 머리 둘레로 감아요.",
     "braid wrapped around the head"
    ],
    "chignon": [
     "뒤통수 아래에서 머리를 매끈하게 말아 고정해요.",
     "smooth coiled updo at the lower rear head"
    ],
    "messy bun": [
     "한 덩어리로 말아 묶고 일부 가닥을 느슨하게 남겨요.",
     "loosely gathered bun; stray strands follow the accent setting"
    ],
    "top knot": [
     "정수리에서 머리를 말아 한 덩어리로 묶어요.",
     "single coiled bun at the crown"
    ],
    "low bun": [
     "목덜미 가까이에 낮게 말아 묶어요.",
     "single bun near the nape"
    ],
    "half-up": [
     "윗부분만 묶고 아래 머리는 풀어 두어요.",
     "upper section tied back, lower section loose"
    ],
    "space buns": [
     "머리 좌우에 둥근 번을 하나씩 만들어요.",
     "two rounded side buns"
    ],
    "hime cut": [
     "일자 앞머리와 턱 부근 옆머리, 긴 뒷머리의 단차예요.",
     "blunt fringe, cheek-to-jaw side locks and longer back section"
    ],
    "asymmetric cut": [
     "좌우 머리 끝 길이가 다른 컷이에요.",
     "unequal left and right cut lengths"
    ],
    "undercut": [
     "옆·뒤의 아래층을 짧게 밀고 윗머리를 남겨요.",
     "closely clipped lower sides or nape under a longer top"
    ],
    "side-shaved long hair": [
     "한쪽 옆만 짧게 밀고 나머지는 어깨 아래로 길게 남겨요.",
     "one clipped side, remaining hair below shoulders"
    ],
    "curly": [
     "머리가 굵고 느슨한 고리 형태로 말려요.",
     "broad loose curls"
    ],
    "tight curls": [
     "작은 반경의 촘촘한 컬이에요. 인종이나 피부색을 지정하지 않아요.",
     "small-radius dense curls; independent of ethnicity"
    ],
    "locs": [
     "머리카락을 여러 개의 로프 같은 가닥으로 뭉친 스타일이에요. 피부·민족과 별개예요.",
     "separate rope-like locs; independent of ethnicity and skin tone"
    ],
    "ringlet curls": [
     "세로로 이어지는 나선형 컬이에요.",
     "distinct vertical spiral ringlets"
    ],
    "finger waves": [
     "두피 가까이에서 규칙적인 S자 굴곡을 만들어요.",
     "sculpted close-to-scalp S-shaped waves"
    ],
    "feathered": [
     "끝을 가볍게 층내 바깥으로 퍼지게 해요.",
     "light layered ends fanning outward"
    ],
    "blunt cut": [
     "머리 끝이 한 줄의 뚜렷한 경계로 끝나요.",
     "hair ends cut along a clean even edge"
    ],
    "wet-look slick": [
     "머리카락이 젖은 듯 뭉쳐 윤기가 나요. 피부를 젖게 하지 않아요.",
     "sleek grouped glossy hair; no wet-skin treatment"
    ],
    "windswept": [
     "바람을 받은 듯 가닥 흐름을 한쪽으로 모아요. 길이·컷은 유지해요.",
     "directional wind-shaped strands within the chosen length"
    ],
    "buzz cut": [
     "두피 가까이 아주 짧고 고르게 민 머리예요.",
     "uniform scalp-close crop"
    ],
    "crew cut": [
     "짧은 옆머리와 조금 더 긴 짧은 윗머리예요.",
     "short clipped sides and a slightly longer short top"
    ],
    "side part": [
     "한쪽에 가르마를 두고 머리를 나눠 빗어요.",
     "hair divided along a side part"
    ],
    "fade": [
     "옆·뒤가 아래로 갈수록 점점 짧아져요.",
     "sides and nape graded progressively shorter downward"
    ],
    "man bun": [
     "뒤쪽에 한 덩어리로 말아 묶어요. 성별을 바꾸지 않아요.",
     "single rear bun; no gender change"
    ],
    "swept back": [
     "볼륨을 남긴 채 머리를 뒤로 넘겨요.",
     "hair swept backward with root lift"
    ],
    "shaggy": [
     "끝과 층이 불규칙하게 흩어지는 컷이에요.",
     "tousled uneven layers and ends"
    ],
    "mullet": [
     "앞·옆은 짧고 목덜미 쪽이 길어요.",
     "short front and sides with a longer nape"
    ],
    "afro": [
     "촘촘한 곱슬을 둥글고 크게 부풀린 모양이에요. 피부·민족과 별개예요.",
     "a full rounded afro of dense coils; independent of ethnicity and skin tone"
    ],
    "afro puffs": [
     "곱슬머리를 양쪽 위로 모아 동그란 퍼프 두 개로 묶어요.",
     "two rounded coily puffs gathered high on each side"
    ],
    "box braids": [
     "두피를 네모 칸으로 나눠 가늘게 땋은 가닥이 여러 줄 늘어져요.",
     "many slim box braids hanging loose from neat square parts"
    ],
    "cornrows": [
     "두피에 바짝 붙여 앞에서 뒤로 줄지어 땋아요.",
     "neat cornrows braided flat along the scalp from front to back"
    ],
    "fishtail braid": [
     "두 갈래를 잘게 엇갈려 엮은 땋기를 한쪽 어깨로 넘겨요.",
     "a finely woven fishtail braid swept over one shoulder"
    ],
    "beach waves": [
     "바닷바람에 말린 듯 느슨하고 자연스럽게 흐트러진 웨이브예요.",
     "loose, tousled beach waves with an undone, sun-dried texture"
    ]
   },
   "hair accent": {
    "a single antenna strand standing up": [
     "정수리에서 머리카락 한 가닥이 서요. 장비 안테나가 아니에요.",
     "one upright hair tuft, not an antenna"
    ],
    "two antenna strands standing up": [
     "정수리에서 머리카락 두 가닥이 서요. 뿔이나 장비가 아니에요.",
     "two upright hair tufts, not horns or ornaments"
    ],
    "a prominent cowlick": [
     "가마 주변에서 한 덩어리의 머리가 튀어나와요.",
     "a pronounced tuft lifted at the crown whorl"
    ],
    "loose stray strands framing the face": [
     "얼굴 양옆에 가는 잔머리를 남겨요.",
     "loose fine strands beside the face"
    ],
    "neatly kept, no stray strands": [
     "선택한 머리 윤곽 안으로 가닥을 정리해요.",
     "neatly contained strands without stray tufts"
    ]
   }
  };
  const PARAM_GROUP_HELP = {
   "base": "명시한 나이와 피부·얼굴 설정을 우선하며, 원본 종이나 장비 크기에서 사람의 외형을 강제하지 않아요.",
   "build": "의상 아래 성인 신체를 정해요. 체형이 큰 방향이고 세부값은 그 범위에서 조절해요. 보통·균형은 체형을 초기화하지 않아요.",
   "face": "얼굴 인상보다 구체적인 윤곽·크기·각도가 우선해요. 세부값은 해당 부위만 바꾸며 선택한 나이를 유지해요.",
   "hair": "스타일의 구조·고유 길이가 우선해요. 길이는 풀었을 때, 머릿결은 한 올의 굵기, 볼륨은 전체 부피를 뜻해요."
  };
  const PARAM_HELP = {
   "auto": "지정하지 않은 부분만 다른 선택과 모순되지 않게 결정해요.",
   "custom": "직접 입력한 내용은 그대로 전달돼요. 바꿀 부위·길이·윤곽을 구체적으로 적어 주세요.",
   "ethnicity": "넓은 외모 참고 범위예요. 같은 계통 안에서도 개인차를 허용하고, 얼굴 윤곽·피부톤·헤어 선택을 우선해요.",
   "measurement": "가슴 / 허리 / 골반 둘레를 cm로 입력해요. 폭이나 의상 치수가 아니며, 체형 안에서 비율 참고로 사용해요.",
   "eye": "인물 본인의 오른쪽·왼쪽 기준이에요. 왼쪽 색을 비우면 양쪽에 기본 눈 색을 사용해요.",
   "color": "피부나 조명 대신 선택한 머리 또는 홍채의 고유색에 적용해요."
  };
  const HAIR_LENGTH_LIMITS = {
   "pixie cut": [
    "픽시컷은 길이 선택과 관계없이 짧은 옆·뒤와 약간 긴 정수리를 유지해요.",
    "short pixie range: cropped sides/nape and slightly longer crown"
   ],
   "buzz cut": [
    "버즈컷은 두피 가까이 짧게 민 길이를 유지해요.",
    "scalp-close buzz-cut length"
   ],
   "crew cut": [
    "크루컷은 짧은 옆머리와 짧은 윗머리 범위를 유지해요.",
    "short crew-cut range with clipped sides and a slightly longer top"
   ],
   "bob": [
    "보브컷은 귀 아래부터 목까지의 범위로 해석해요.",
    "below-ear to neck-length bob range"
   ],
   "side-shaved long hair": [
    "한쪽을 민 긴 머리는 나머지 머리가 어깨 아래로 내려오는 구조를 유지해요.",
    "remaining unshaved section below shoulders"
   ]
  };
  const EYE_CONTOURS = {
   "large": "open rounded eyelid outline; scale follows eye size",
   "sharp": "crisp eyelid contour; corner direction follows eye tilt",
   "drooping": "soft eyelid contour; corner direction follows eye tilt",
   "upturned": "tapered eyelid contour; corner direction follows eye tilt"
  };
  const COLOR_HEX = {
   "white": "#F2F2F2",
   "platinum": "#E4E6EA",
   "silver": "#C8CCD2",
   "ash blonde": "#C9BBA0",
   "blonde": "#E3C574",
   "gold": "#D8A72B",
   "amber": "#C87E24",
   "orange": "#D97524",
   "red": "#C0392B",
   "crimson": "#8E1B2B",
   "pink": "#E08AA8",
   "purple": "#7E5AA8",
   "lavender": "#B9A6DE",
   "pale blue": "#9EC7E8",
   "blue": "#2F6FD0",
   "navy": "#1E3A6E",
   "teal": "#1F8A8A",
   "mint": "#7FD8C0",
   "green": "#2E9E5B",
   "brown": "#7A5230",
   "gray": "#8A8F98",
   "black": "#14161A"
  };
  const COLOR_KEYS = {
   "hair color": 1,
   "eye color": 1,
   "second eye color": 1
  };
  /* 체형 도식 — 어깨·가슴·허리·골반 반폭(px)과 키·굵기 배율(lib/figures.js 가 그린다) */
  const BODY_FIG = {
   "slender": [
    18,
    16,
    11,
    17,
    1,
    0.85,
    "가늘고 굴곡이 완만한 체형. 어깨와 골반 폭이 비슷하고 전체적으로 얇다."
   ],
   "athletic": [
    22,
    18,
    14,
    19,
    1,
    1,
    "어깨가 적당히 넓고 허리가 단단한 운동형. 굴곡보다 균형이 먼저 보인다."
   ],
   "curvy": [
    19,
    22,
    13,
    25,
    1,
    1,
    "가슴과 골반이 허리보다 확실히 넓은 곡선형."
   ],
   "glamorous": [
    20,
    25,
    13,
    26,
    1.02,
    1,
    "굴곡이 크고 화려한 체형. curvy보다 상하체 볼륨이 한 단계 더 크다."
   ],
   "muscular": [
    26,
    22,
    18,
    22,
    1,
    1.2,
    "근육량이 뚜렷해 어깨와 사지가 굵다. 허리도 얇지 않다."
   ],
   "heavy-built": [
    26,
    25,
    25,
    26,
    0.98,
    1.25,
    "상하체가 고르게 두껍고 묵직한 중후한 체격."
   ],
   "tall and lean": [
    19,
    16,
    12,
    17,
    1.12,
    0.85,
    "키가 크면서 폭은 좁다. slender를 세로로 늘린 형태."
   ],
   "petite": [
    17,
    17,
    12,
    18,
    0.86,
    0.95,
    "키가 작고 전체 비율이 아담하다. 폭은 평균이라 마른 인상은 아니다."
   ],
   "hourglass": [
    20,
    23,
    12,
    23,
    1,
    1,
    "가슴과 골반 폭이 같고 허리만 크게 들어간 모래시계형."
   ],
   "voluptuous": [
    20,
    27,
    15,
    28,
    1,
    1.1,
    "가슴·골반 볼륨이 가장 큰 육감형. 허리는 상대적으로만 얇다."
   ],
   "toned": [
    21,
    18,
    13,
    19,
    1,
    0.95,
    "군살 없이 잔근육이 잡힌 체형. muscular보다 가늘고 선이 곱다."
   ],
   "wiry": [
    18,
    15,
    11,
    15,
    1,
    0.8,
    "얇지만 단단한 체형. 굴곡이 거의 없고 힘줄이 도드라진다."
   ],
   "soft-figured": [
    21,
    23,
    22,
    25,
    0.98,
    1.15,
    "허리 굴곡이 적고 전체적으로 부드럽게 살집이 있다."
   ],
   "pear-shaped": [
    17,
    17,
    14,
    26,
    1,
    1.05,
    "상체는 좁고 골반·허벅지에 무게가 실린 형태."
   ],
   "inverted triangle": [
    26,
    21,
    14,
    17,
    1,
    1,
    "어깨가 가장 넓고 아래로 갈수록 좁아진다. pear의 반대."
   ],
   "stocky": [
    24,
    22,
    21,
    23,
    0.88,
    1.2,
    "키는 작고 폭은 넓은 다부진 체격."
   ],
   "statuesque": [
    22,
    21,
    14,
    22,
    1.15,
    1,
    "장신에 골격이 당당한 조각상 같은 체형."
   ],
   "broad-shouldered": [
    28,
    22,
    17,
    20,
    1.02,
    1.05,
    "어깨가 가장 넓고 아래로 갈수록 좁아진다. 상체 인상이 지배적이다."
   ],
   "burly": [
    27,
    26,
    24,
    25,
    1.05,
    1.3,
    "키도 크고 폭도 넓은 거구. heavy-built보다 한 단계 더 크다."
   ],
   "lanky": [
    19,
    17,
    14,
    17,
    1.14,
    0.8,
    "키는 크고 살은 거의 없다. 팔다리가 유난히 길어 보인다."
   ],
   "barrel-chested": [
    25,
    27,
    23,
    23,
    0.98,
    1.2,
    "흉곽이 통처럼 앞뒤로 두껍다. 어깨보다 가슴이 먼저 보인다."
   ],
   "rangy": [
    23,
    20,
    15,
    19,
    1.08,
    0.95,
    "길고 유연한 근육질. muscular보다 가늘고 움직임이 가벼워 보인다."
   ]
  };
  const HAIR_FIG = {
   "bob": [
    1,
    "straight",
    2,
    "",
    "blunt",
    "턱선 근처에서 일자로 떨어지는 단정한 길이."
   ],
   "pixie cut": [
    0,
    "straight",
    1,
    "",
    "wispy",
    "귀와 목덜미가 드러나는 아주 짧은 컷."
   ],
   "layered": [
    2,
    "wavy",
    4,
    "",
    "side",
    "층을 내 끝으로 갈수록 가벼워지는 컷."
   ],
   "ponytail": [
    3,
    "straight",
    2,
    "mid",
    "side",
    "뒤로 모아 한 갈래로 묶은 기본형."
   ],
   "twin tail": [
    3,
    "straight",
    2,
    "twin",
    "blunt",
    "좌우 높은 위치에서 두 갈래로 묶는다."
   ],
   "wolf cut": [
    2,
    "wavy",
    6,
    "",
    "wispy",
    "윗머리는 짧고 아랫머리는 길어 층감이 강하다."
   ],
   "slicked back": [
    1,
    "flat",
    0,
    "",
    "none",
    "이마를 완전히 드러내고 뒤로 붙여 넘긴 스타일."
   ],
   "wavy": [
    3,
    "wavy",
    4,
    "",
    "side",
    "전체가 완만한 S자 웨이브."
   ],
   "straight": [
    3,
    "straight",
    2,
    "",
    "blunt",
    "굴곡 없이 곧게 떨어지는 생머리."
   ],
   "side ponytail": [
    2,
    "straight",
    2,
    "sidetail",
    "side",
    "한쪽 어깨로 넘겨 묶는다."
   ],
   "high ponytail": [
    3,
    "straight",
    2,
    "high",
    "wispy",
    "정수리 가까이 높게 묶어 얼굴선이 당겨진다."
   ],
   "braid": [
    4,
    "braid",
    2,
    "mid",
    "side",
    "뒤로 한 갈래 땋아 내린다."
   ],
   "twin braids": [
    4,
    "braid",
    2,
    "twin",
    "blunt",
    "좌우로 나눠 두 갈래로 땋는다."
   ],
   "crown braid": [
    0,
    "braid",
    3,
    "crown",
    "none",
    "머리를 둘러 땋아 왕관처럼 올린다."
   ],
   "chignon": [
    0,
    "straight",
    2,
    "lowbun",
    "side",
    "목덜미에 매끈하게 말아 붙인 단정한 번."
   ],
   "messy bun": [
    0,
    "wavy",
    4,
    "midbun",
    "wispy",
    "대충 올려 묶어 잔머리가 빠져나온 번."
   ],
   "top knot": [
    0,
    "straight",
    2,
    "topbun",
    "none",
    "정수리에 높이 올려 묶은 번."
   ],
   "low bun": [
    0,
    "straight",
    2,
    "lowbun",
    "blunt",
    "목덜미 낮은 위치의 번. 시뇽보다 느슨하다."
   ],
   "half-up": [
    3,
    "straight",
    3,
    "half",
    "side",
    "윗머리만 묶고 아랫머리는 내린다."
   ],
   "space buns": [
    0,
    "straight",
    2,
    "twinbun",
    "blunt",
    "양쪽에 동그란 번을 두 개 만든다."
   ],
   "hime cut": [
    4,
    "straight",
    3,
    "",
    "hime",
    "일자 앞머리 + 얼굴 옆 사이드를 턱선에서 자른 형태."
   ],
   "asymmetric cut": [
    2,
    "asym",
    3,
    "",
    "side",
    "좌우 길이가 확연히 다른 비대칭컷."
   ],
   "undercut": [
    1,
    "straight",
    2,
    "",
    "side",
    "옆과 뒤를 짧게 밀고 윗머리만 남긴다."
   ],
   "side-shaved long hair": [
    3,
    "shave",
    3,
    "",
    "side",
    "한쪽만 밀고 나머지는 길게 남긴다."
   ],
   "curly": [
    2,
    "curly",
    6,
    "",
    "wispy",
    "굵고 탄력 있는 곱슬. 옆 볼륨이 크다."
   ],
   "tight curls": [
    1,
    "coily",
    8,
    "",
    "none",
    "잔곱슬이 둥글게 부풀어 오른 형태."
   ],
   "locs": [
    3,
    "locs",
    3,
    "",
    "none",
    "가닥이 굵게 뭉쳐 늘어지는 로크스."
   ],
   "ringlet curls": [
    3,
    "ringlet",
    4,
    "",
    "side",
    "세로로 말린 드릴 형태의 컬."
   ],
   "finger waves": [
    1,
    "fwave",
    2,
    "",
    "none",
    "머리에 붙은 얕은 물결의 레트로 웨이브."
   ],
   "feathered": [
    2,
    "wavy",
    4,
    "",
    "side",
    "끝을 가볍게 쳐서 바깥으로 흐르게 한 컷."
   ],
   "blunt cut": [
    2,
    "straight",
    2,
    "",
    "blunt",
    "끝을 층 없이 일자로 자른 컷."
   ],
   "wet-look slick": [
    2,
    "flat",
    1,
    "",
    "none",
    "젖은 듯 광이 나게 붙여 넘긴 스타일."
   ],
   "windswept": [
    2,
    "wind",
    4,
    "",
    "wispy",
    "한쪽으로 바람에 날린 듯한 흐름."
   ],
   "buzz cut": [
    0,
    "flat",
    0,
    "",
    "none",
    "두피가 비칠 만큼 짧게 민 머리."
   ],
   "crew cut": [
    0,
    "straight",
    1,
    "",
    "none",
    "윗머리만 조금 남긴 짧고 단정한 컷."
   ],
   "side part": [
    1,
    "straight",
    2,
    "",
    "side",
    "가르마를 타 한쪽으로 넘긴 단정한 컷."
   ],
   "fade": [
    0,
    "shave",
    1,
    "",
    "none",
    "옆과 뒤를 위로 갈수록 길어지게 친 그라데이션 컷."
   ],
   "man bun": [
    0,
    "straight",
    2,
    "lowbun",
    "none",
    "뒤로 모아 작게 묶어 올린 번."
   ],
   "swept back": [
    1,
    "wind",
    3,
    "",
    "none",
    "이마를 드러내고 뒤로 넘겨 볼륨을 준 스타일."
   ],
   "shaggy": [
    2,
    "wavy",
    5,
    "",
    "wispy",
    "층 없이 덥수룩하게 흐트러진 컷."
   ],
   "mullet": [
    2,
    "asym",
    2,
    "",
    "blunt",
    "앞과 옆은 짧고 뒤만 길게 남긴 컷."
   ],
   "afro": [
    2,
    "coily",
    10,
    "",
    "none",
    "둥글고 크게 부풀린 아프로."
   ],
   "afro puffs": [
    0,
    "coily",
    4,
    "twinbun",
    "none",
    "곱슬머리를 양쪽 위로 동그랗게 묶어 올린 퍼프."
   ],
   "box braids": [
    3,
    "locs",
    3,
    "",
    "none",
    "가늘게 나눠 땋은 가닥을 여러 줄 늘어뜨린다."
   ],
   "cornrows": [
    1,
    "braid",
    1,
    "",
    "none",
    "두피에 붙여 줄지어 땋아 뒤로 넘긴다."
   ],
   "fishtail braid": [
    4,
    "braid",
    2,
    "sidetail",
    "side",
    "한쪽 어깨로 넘겨 잘게 엮은 피시테일 땋기."
   ],
   "beach waves": [
    3,
    "wavy",
    5,
    "",
    "side",
    "햇볕과 바닷바람에 말린 듯 느슨하게 흐트러진 웨이브."
   ]
  };
  const IDENTITY_GROUPS = [
   "base",
   "build",
   "face",
   "hair"
  ];
  const IDENTITY_EXCLUDED = [];
  /* 얼굴 설계가 채우는 얼굴 항목 — 이 차례로 FACE 줄에 실린다 */
  const FACE_KEYS = [
   "face shape",
   "face length",
   "face width",
   "jaw & chin",
   "eye shape",
   "eye size",
   "eye tilt",
   "eye spacing",
   "eyebrows",
   "nose character",
   "lips"
  ];
  /* 일상컷 갈래 [열쇠, 영문, 이름, 갈래 문구, 성별] */
  const CATS = [
   [
    "auto_random",
    "AUTO / RANDOM",
    "자동 / 랜덤",
    ""
   ],
   [
    "adult_roleplay",
    "ADULT ROLEPLAY / OCCUPATION EVENT FASHION",
    "성인 역할극 / 직업풍 이벤트 패션",
    "Create playful adult event fashion inspired by occupation or roleplay motifs. It must read as a costume made for a stage presentation or themed event, not as an authentic workplace uniform. Use original colours and decorative details — no real institutional insignia, no weapons, no tactical gear. Describe the costume by its tailoring, trim, and props, and show a believable styling or preparation action.",
    "f"
   ],
   [
    "everyday_basic",
    "EVERYDAY LIFE — BASIC",
    "일상컷 — 기본",
    "Create candid ordinary personal-life moments. The scene should feel lived-in, believable, and visually specific rather than staged. Use normal contemporary clothing with clear character personality. Avoid glamour-shoot posing, professional work, and costume styling."
   ],
   [
    "library_life",
    "LIBRARY LIFE",
    "서고의 일상",
    "Show one believable moment of quiet work in a library, archive, bookshop, bindery or print shop. Make the task readable through concrete tools and practical clothing. She never holds an open book toward the camera; pages, labels and spines stay unlettered."
   ],
   [
    "story_place",
    "STORY PLACE VISIT",
    "이야기 속 장소",
    "Show a quiet visit to the real or imagined place where her own book is set (see STORY PLACE). Modern travel clothing unless an ERA line says otherwise; the place reads through its landscape and architecture, and a small knowing gesture or gaze connects her to it. Nothing from the story in her hands — no book pages, props or costume pieces; scenery only, no lettered plaques."
   ],
   [
    "stage_adaptation",
    "STAGE & SCREEN ADAPTATION",
    "무대·영화 각색",
    "Show one backstage moment from a stage or screen adaptation of her own book (see ADAPTATION): a costume fitting, a script read-through, waiting on set, a lighting rehearsal, a premiere. She wears the production's period costume for her own story, designed fresh from the book's text and era rather than copied from any known film or stage design, or her own clothes between takes. Crew and equipment stay soft in the background."
   ],
   [
    "literary_salon",
    "LITERARY SALON & BOOK CLUB",
    "낭독회·북클럽",
    "Show one moment at a gathering around books: a cafe reading, a book-club discussion, an author talk, a poetry night, a garden reading circle. Smart-casual or evening clothing that suits the venue, and one specific action — reading aloud from a slim book, listening with a cup, raising a hand to ask a question. Other guests stay soft in the background; pages and posters stay unlettered."
   ],
   [
    "everyday_sensual",
    "EVERYDAY LIFE — SENSUAL",
    "일상컷 — 섹시",
    "Create a sensual but non-explicit everyday lifestyle moment with the same clearly adult character. The situation must read as believable ordinary life, so specify the room, the clothing, and a concrete action already in progress rather than a posed shoot. Use natural household or street lighting and eye-level framing; fabric drape, movement, and light carry the mood. Avoid turning the scene into a lingerie catalogue or a deliberate glamour shoot."
   ],
   [
    "travel_exploration",
    "TRAVEL & FIELD EXPLORATION",
    "여행·필드 탐험",
    "Show travel or peaceful exploration in a world that echoes her book, with useful travel clothing and a specific activity. Let the environment support the woman without overwhelming her or turning the scene into combat."
   ],
   [
    "festivals_contests",
    "FESTIVALS & CONTESTS",
    "축제·콘테스트 나들이",
    "Show one moment attending a festival, fair, reading or stage event, with an identifiable activity and event props. Preserve the approved identity and let the selected scene determine clothing and mood."
   ],
   [
    "hobbies_leisure",
    "HOBBIES & QUIET LEISURE",
    "취미·느긋한 휴식",
    "Show a personal hobby or restful leisure moment with a specific action and relevant objects. Motifs from her book may appear naturally in the activity, without requiring her form costume."
   ],
   [
    "swimwear",
    "SWIMWEAR LIFESTYLE",
    "수영복 라이프스타일",
    "This single scene is swimwear-focused. Use modern swimwear that is fully lined and stays secure during movement, described by its construction — neckline, straps, panels, leg line, fabric. Prioritize a memorable swimwear scene with real action and water context over static posing. Keep the setting a public or resort one: poolside, shoreline, deck, or open water.",
    "f"
   ],
   [
    "active",
    "ACTIVE / MOVEMENT FASHION",
    "액티브 / 무브먼트 패션",
    "Show real movement with fashion-forward activewear or movement-oriented clothing. Avoid generic gym snapshots. Prioritize dynamic motion, readable silhouette, waist and hip lines, fabric movement, and varied action."
   ],
   [
    "source_editorial",
    "SOURCE-INSPIRED EDITORIAL FASHION",
    "SOURCE 영감 에디토리얼 패션",
    "This scene reinterprets her book as human editorial fashion. Translate the book's palette, symbols, era and material (paper, binding, ink, thread) into couture or themed fashion. No literal form costume, no carried book, no printed text."
   ],
   [
    "homewear",
    "FASHION HOMEWEAR / LOUNGE LIFE",
    "패션 홈웨어 / 라운지 라이프",
    "Create designed, fashion-forward homewear or lounge-life scenes. Avoid plain pajamas and bland static sofa poses. Use believable home-life actions, stylish home fashion silhouettes, and a sensual but natural private-life atmosphere.",
    "f"
   ],
   [
    "private_evening",
    "PRIVATE EVENING FASHION",
    "프라이빗 이브닝 패션",
    "Create mature private evening fashion scenes with intimate but non-explicit atmosphere. Use elegant, attractive, clearly adult styling, confident body language, and believable private-life context.",
    "f"
   ],
   [
    "lingerie",
    "LINGERIE-INSPIRED FASHION",
    "란제리풍 패션",
    "Use tasteful adult lingerie-inspired evening fashion with full intimate coverage. Describe the garment by its construction — cut, fabric, trim, straps, closures, layers — rather than by mood words. The garments are securely fitted and fully opaque, and the look is suitable for a mainstream evening-fashion editorial. Build the image through framing, silhouette, posture, and lighting rather than exposure.",
    "f"
   ],
   [
    "everyday",
    "EVERYDAY LIFESTYLE",
    "일상 라이프스타일",
    "Depict ordinary personal-life moments rather than occupation, costume, or formal editorial shoots. Keep them candid, believable, visually varied, and attractive without becoming too plain."
   ],
   [
    "traditional",
    "TRADITIONAL / HERITAGE FASHION",
    "전통 의상 / 헤리티지 패션",
    "This cut is built around the traditional dress named in the example — that tradition wins over her book's region, her apparent ethnicity and the attached image's costume; only Auto takes the dress of her book's own region. Use either authentic formal traditional clothing or a modernised everyday interpretation of it, as specified by the example. Keep the garment structure, layering logic, fastening, and silhouette faithful to that tradition rather than generic orientalism or costume-shop pastiche. Colours may follow her book palette, but the construction must remain true to the tradition. Place the character in a setting where such clothing is plausibly worn."
   ],
   [
    "retro_glamour",
    "RETRO GLAMOUR",
    "레트로 글래머",
    "Build the cut around one past decade's glamour fashion, as the example names it — its silhouette, fabrics, hair-styling cues and set dressing — worn by the same adult woman in a believable scene with a concrete action. Real construction details carry the era (bias cut, dropped waist, high waist, structured bra, wiggle skirt, lurex, leg warmers), not costume-shop pastiche. Use the bold, flattering exposure that era itself would show — high-waisted swimsuits, playsuits, slips, mini dresses — in fully opaque, secure garments; keep her own haircut and colours.",
    "f"
   ],
   [
    "subculture_fashion",
    "SUBCULTURE FASHION",
    "서브컬처 패션",
    "Dress her in one real street subculture as the example names it — goth, punk, rock, gyaru, Harajuku, cybergoth, grunge and so on — with its true silhouettes, materials and accessories (leather, lace, plaid, studs, chains, corset belts, platform boots, layered jewelry), and place her where that scene actually lives: a live house, a record store, a back alley, a street crossing, a club queue. Confident styling with bold exposure through cut, never through see-through fabric; original designs only, no band names, logos or lettering; keep her own haircut and colours.",
    "f"
   ],
   [
    "nightlife",
    "NIGHTLIFE",
    "나이트라이프",
    "Show one moment of public nightlife — a club dance floor, a DJ booth, a neon bar, a karaoke room, a rooftop party, a jazz bar. Bold night-out fashion such as bodycon, sequins, cut-outs, backless or mini dresses, with a specific action already in progress. Other guests stay soft, out-of-focus shapes in the background; coloured club light, haze and reflections carry the mood.",
    "f"
   ],
   [
    "dance_stage",
    "DANCE STAGE",
    "댄스 무대",
    "Show her dancing — one clear, readable move from a named dance style (tango, salsa, flamenco, belly dance, ballet, jazz, hula, cabaret, K-pop choreography) on a stage, in a studio or at a social dance hall. A dance costume or dancewear built for movement — backless dresses, high slits, fitted bodices, flaring skirts — with fabric motion that follows the step. She dances solo; any partner or troupe is only implied or far in the soft background.",
    "f"
   ],
   [
    "spa_wellness",
    "SPA & WELLNESS",
    "스파·온천·사우나",
    "Show a moment of rest at a spa, hot spring, sauna or bathhouse: an open-air bath edge, a cedar tub, a robe lounge, a hammam, a cold plunge. She wears swimwear, a secure towel wrap, a plush robe or bathhouse loungewear that stays fully covering at chest and hips; steam, wood, stone and water light carry the scene. Calm, unhurried posture; no shower scenes.",
    "f"
   ],
   [
    "fantasy_costume",
    "FANTASY COSTUME",
    "판타지 코스튬",
    "Show her in an original fantasy costume made for a costume party, a cosplay event or a themed photoshoot — elf, fairy, angel and devil, sorceress, forest spirit, star goddess, vampire. Costume details are fabric, craft and props (wing props, pointed ear tips, staffs, capes), never armor, real weapons or creature anatomy; no existing franchise characters. Show a believable styling, posing or event moment.",
    "f"
   ],
   [
    "bridal",
    "BRIDAL",
    "웨딩·브라이덜",
    "Show one moment of her own bridal day or bridal styling: a gown fitting, waiting before the ceremony, walking a garden aisle, a solo bridal photoshoot, the reception dress, the honeymoon suite. Wedding gowns, veils and reception dresses with bold, elegant cuts (open backs, sweetheart necklines, slits) in secure, opaque fabric. She is alone in the frame; any groom or guests are only implied.",
    "f"
   ],
   [
    "gala_red_carpet",
    "GALA & RED CARPET",
    "레드카펫·갈라",
    "Show a public gala or red-carpet moment: arriving on a red carpet, posing at a photo wall, a film-festival staircase, an award ceremony, a gala dinner, a charity auction, a fashion-week front row. A show-stopping evening gown or couture look — high slits, open backs, plunging or one-shoulder necklines, trains — with event lights and flashes. Photographers and guests stay blurred in the background; no real event names or logos.",
    "f"
   ],
   [
    "wildcard",
    "WILDCARD",
    "와일드카드",
    "Invent one fresh adult lifestyle scene. It should remain stylish, sensual, cinematic, and non-explicit with a coherent specific activity."
   ],
   [
    "__custom__",
    "CUSTOM",
    "직접 입력",
    ""
   ]
  ];
  /* 갈래별 예시 [열쇠, 영문, 이름, 등급, 성별, 프롬프트] */
  const EXAMPLE_MAP = {
   "auto_random": [
    [
     "",
     "AUTO",
     "자동",
     "basic"
    ],
    [
     "seasonal_night",
     "Seasonal Night Mood",
     "계절감 있는 야간 무드",
     "basic"
    ],
    [
     "travel_cut",
     "Travel / Resort Vibe",
     "여행 / 리조트 무드",
     "popular"
    ],
    [
     "festival_night",
     "Night Festival",
     "야간 페스티벌",
     "popular"
    ],
    [
     "unexpected_contrast",
     "Unexpected Contrast Concept",
     "예상 밖 대비 콘셉트",
     "special"
    ],
    [
     "retro_future",
     "Retro-Future Lifestyle",
     "레트로 퓨처 라이프",
     "special"
    ],
    [
     "rainy_city",
     "Rainy City Evening",
     "비 오는 도시의 저녁",
     "popular"
    ],
    [
     "weekend_market",
     "Weekend Market Stroll",
     "주말 시장 산책",
     "popular"
    ],
    [
     "late_studio",
     "Late-night Studio",
     "심야 작업실",
     "popular"
    ],
    [
     "rooftop_wind",
     "Windy Rooftop",
     "바람 부는 옥상",
     "popular"
    ],
    [
     "seaside_offseason",
     "Off-season Seaside",
     "비수기 바닷가",
     "special"
    ],
    [
     "neon_alley",
     "Neon Backstreet",
     "네온 뒷골목",
     "special"
    ],
    [
     "snow_evening",
     "Snowy Evening",
     "눈 내리는 저녁",
     "special"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "special"
    ]
   ],
   "adult_roleplay": [
    [
     "",
     "AUTO",
     "자동",
     "basic"
    ],
    [
     "event_staff",
     "Adult Event Staff Costume",
     "성인 이벤트 스태프 코스튬",
     "basic",
     "f",
     "an event staff costume with a fitted vest, name-tag ribbon, and lanyard, at a themed venue"
    ],
    [
     "uniform_inspired",
     "Stylized Uniform-inspired Look",
     "스타일화된 유니폼풍 룩",
     "basic",
     "f",
     "a stylized uniform-inspired costume with crisp lapels and decorative epaulettes, no real insignia"
    ],
    [
     "adult_police",
     "Adult Police Costume",
     "성인 경찰 코스튬",
     "popular",
     "f",
     "a fitted navy police-style party costume — a short-brimmed peaked cap, a short-sleeved button shirt with epaulettes and a tie, a star-shaped decorative badge, a belted pencil skirt and boots; adjusting the cap with one hand at a costume-party mirror (an invented badge, no real insignia or weapons)"
    ],
    [
     "adult_nurse",
     "Adult Nurse Costume",
     "성인 간호사 코스튬",
     "popular",
     "f",
     "a retro nurse-style party costume — a fitted white button-front dress with short puffed sleeves, a folded white cap, a red-trimmed apron edge and white stockings; pinning the cap in place at a costume-party mirror (invented emblem, no real hospital marks)"
    ],
    [
     "adult_maid",
     "Adult Maid Costume",
     "성인 메이드 코스튬",
     "popular",
     "f",
     "a black-and-white maid costume with a structured bodice, puffed sleeves, and a full apron, at a costume event"
    ],
    [
     "adult_secretary",
     "Adult Secretary Costume",
     "성인 비서 코스튬",
     "popular",
     "f",
     "a retro secretary-inspired costume with a fitted blazer, pencil skirt, and decorative eyewear, at a themed office party"
    ],
    [
     "bunny",
     "Bunny Costume",
     "바니 코스튬",
     "popular",
     "f",
     "a retro casino bunny costume with a fitted one-piece garment, cuffs, bow-tie collar, and rabbit-ear headband, on a stage floor"
    ],
    [
     "flight_attendant",
     "Flight-attendant-inspired Costume",
     "승무원풍 코스튬",
     "popular",
     "f",
     "a retro flight-attendant-inspired costume with a fitted jacket, scarf, and original airline-style trim, at a themed event"
    ],
    [
     "casino_dealer",
     "Casino Dealer / Hostess Styling",
     "카지노 딜러 / 호스티스 스타일",
     "popular",
     "f",
     "a casino dealer costume with a fitted waistcoat, bow tie, and cuffs, at a card table"
    ],
    [
     "lab_roleplay",
     "Laboratory Roleplay Fashion",
     "연구실 역할극 패션",
     "special",
     "f",
     "a laboratory-themed costume with a crisp white coat over a fitted dress, using original decorative badges"
    ],
    [
     "ceremonial_instructor",
     "Ceremonial Instructor Styling",
     "세리머니얼 인스트럭터 스타일",
     "special",
     "f",
     "a ceremonial instructor costume with a belted jacket, gloves, and a decorative sash"
    ],
    [
     "retro_racer",
     "Retro Grid / Racing Costume",
     "레트로 레이싱 코스튬",
     "special",
     "f",
     "a retro racing grid costume with a cropped team jacket, shorts, and boots, beside a track barrier"
    ],
    [
     "vinyl_stage",
     "Vinyl Stage Fashion",
     "비닐 스테이지 패션",
     "special",
     "f",
     "a vinyl stage costume with a glossy fitted jacket and boots under stage lighting"
    ],
    [
     "masquerade",
     "Masquerade Costume Fashion",
     "마스커레이드 코스튬 패션",
     "special",
     "f",
     "a masquerade costume with a feathered eye mask, a structured bodice, and a full skirt"
    ],
    [
     "adult_teacher",
     "Adult Teacher Costume",
     "성인 교사 코스튬",
     "popular",
     "f",
     "a teacher-inspired costume look with a fitted blazer, pleated skirt, reading glasses, and books"
    ],
    [
     "adult_librarian",
     "Adult Librarian Styling",
     "성인 사서 스타일",
     "popular",
     "f",
     "a librarian-inspired costume with a fitted cardigan, pencil skirt, and glasses, among bookshelves"
    ],
    [
     "cheer_costume",
     "Cheer Squad Costume",
     "치어 코스튬",
     "popular",
     "f",
     "a varsity cheer costume with a pleated skirt, striped fitted top, and team-colour panels, on a gym floor"
    ],
    [
     "cabin_crew_retro",
     "Retro Cabin Crew",
     "레트로 객실승무원",
     "special",
     "f",
     "a retro cabin crew costume with a fitted jacket, pillbox hat, and neck scarf"
    ],
    [
     "circus_ringmaster",
     "Circus Ringmaster Fashion",
     "서커스 링마스터 패션",
     "special",
     "f",
     "a circus ringmaster costume with a tailcoat, high boots, and a top hat, under a tent canopy"
    ],
    [
     "witch_party",
     "Halloween Witch Costume",
     "핼러윈 마녀 코스튬",
     "popular",
     "f",
     "a Halloween witch party costume — a tall pointed hat, a lace-up bodice short dress and striped stockings; holding a pumpkin lantern at a costume party"
    ],
    [
     "majorette",
     "Majorette Costume",
     "마칭 마조렛 코스튬",
     "popular",
     "f",
     "a marching majorette costume — a plumed shako hat, a braided short jacket without real insignia, a pleated mini skirt and white boots; twirling a baton at a parade"
    ],
    [
     "sailor_stage",
     "Sailor Stage Costume",
     "세일러 무대 의상",
     "basic",
     "f",
     "a sailor stage costume — a sailor-collar cropped top, a pleated mini skirt and a small cap; saluting playfully on a harbour-set stage (no real navy insignia)"
    ],
    [
     "lifeguard_event",
     "Lifeguard Event Costume",
     "라이프가드 이벤트 코스튬",
     "basic",
     "f",
     "a lifeguard event costume — a red one-piece-style costume with a whistle on a cord and a rescue buoy prop; posing beside a prop lifeguard tower"
    ],
    [
     "cat_cafe",
     "Cat Cafe Event Costume",
     "고양이 카페 이벤트 의상",
     "basic",
     "f",
     "a cat cafe event costume — a cat-ear headband, a bow choker and a frilled apron dress; serving a latte at a themed cafe"
    ],
    [
     "santa_party",
     "Christmas Party Costume",
     "크리스마스 파티 코스튬",
     "popular",
     "f",
     "a Christmas party costume — a fur-trimmed red velvet mini dress, a Santa hat and boots; hanging an ornament on a tree at a party"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "special"
    ]
   ],
   "swimwear": [
    [
     "",
     "AUTO",
     "자동",
     "basic"
    ],
    [
     "classic_bikini",
     "Classic Bikini",
     "클래식 비키니",
     "basic",
     "f",
     "a navy high-waisted bikini with a supportive halter top"
    ],
    [
     "sport_onepiece",
     "Sporty One-piece",
     "스포티 원피스",
     "basic",
     "f",
     "a sporty one-piece swimsuit with a racerback and a high neckline in solid performance fabric"
    ],
    [
     "highleg_onepiece",
     "High-leg One-piece",
     "하이레그 원피스",
     "popular",
     "f",
     "a high-leg one-piece swimsuit with a high neckline and supportive racerback"
    ],
    [
     "monokini",
     "Monokini",
     "모노키니",
     "popular",
     "f",
     "a sculptural monokini with asymmetric side cut-outs joined by a solid central panel"
    ],
    [
     "triangle_bikini",
     "Triangle Bikini",
     "트라이앵글 비키니",
     "popular",
     "f",
     "a triangle bikini with slider cups and tie-side bottoms"
    ],
    [
     "bandeau_bikini",
     "Bandeau Bikini",
     "반두 비키니",
     "popular",
     "f",
     "a bandeau bikini with a straight strapless top and matching bottoms"
    ],
    [
     "halter_bikini",
     "Halter Bikini",
     "홀터 비키니",
     "popular",
     "f",
     "a halter bikini with a neck tie and a supportive underbust band"
    ],
    [
     "asymmetric_swim",
     "Asymmetric One-shoulder Swimwear",
     "비대칭 원숄더 수영복",
     "popular",
     "f",
     "an asymmetric one-shoulder swimsuit with a single wide strap and a clean diagonal neckline"
    ],
    [
     "crossstrap_swim",
     "Cross-strap Swimwear",
     "크로스 스트랩 수영복",
     "popular",
     "f",
     "a swimsuit with crossed back straps and a scooped front neckline"
    ],
    [
     "moonlit_pool",
     "Moonlit Outdoor Pool",
     "달빛 야외풀",
     "special",
     "f",
     "in swimwear at an outdoor pool at night, lit by underwater lamps and moonlight"
    ],
    [
     "rooftop_infinity_pool",
     "Rooftop Infinity Pool",
     "루프탑 인피니티 풀",
     "special",
     "f",
     "in swimwear at a rooftop infinity pool with the city skyline behind her"
    ],
    [
     "outdoor_shower",
     "Outdoor Shower / Rinse-off",
     "야외 샤워 / 린스오프",
     "special",
     "f",
     "rinsing off at an open-air poolside shower after swimming, still in swimwear"
    ],
    [
     "cabana_daybed",
     "Resort Cabana / Daybed",
     "리조트 카바나 / 데이베드",
     "special",
     "f",
     "seated at a resort cabana daybed in swimwear with an open cover-up, a book and a cold drink beside her"
    ],
    [
     "thermal_spa",
     "Modern Thermal Spa Pool",
     "모던 온천 / 스파 풀",
     "special",
     "f",
     "in swimwear at a modern thermal spa pool, steam rising off the water"
    ],
    [
     "shoreline_walk",
     "Wet Shoreline Walk",
     "젖은 해변 산책",
     "special",
     "f",
     "walking along a wet shoreline in swimwear, wet sand and shallow surf underfoot"
    ],
    [
     "boyshort_swim",
     "Boyshort Swimwear",
     "보이쇼트 수영복",
     "popular",
     "f",
     "a boyshort swimsuit set with a fitted top and short square-cut bottoms"
    ],
    [
     "rashguard_set",
     "Rashguard Set",
     "래시가드 세트",
     "popular",
     "f",
     "a long-sleeve rashguard with a zip front over matching swim bottoms"
    ],
    [
     "wrap_swim",
     "Wrap-front Swimwear",
     "랩 프론트 수영복",
     "popular",
     "f",
     "a wrap-front swimsuit with a crossed bodice and a tie at the waist"
    ],
    [
     "swim_coverup",
     "Swimwear + Cover-up",
     "수영복 + 커버업",
     "popular",
     "f",
     "swimwear worn under an open gauzy cover-up, tied loosely at the hip"
    ],
    [
     "poolside_bar",
     "Poolside Bar",
     "풀사이드 바",
     "special",
     "f",
     "in swimwear at a poolside bar, a cold drink on the counter"
    ],
    [
     "river_dock",
     "River Dock / Lake Pier",
     "강가 데크 / 호수 선착장",
     "special",
     "f",
     "in swimwear on a wooden river dock, feet over the edge above the water"
    ],
    [
     "burkini_modest",
     "Modest Full-cover Swimwear",
     "부르키니 · 전신형",
     "popular",
     "f",
     "a modest full-cover swimsuit with long sleeves, full-length legs, and a fitted hood"
    ],
    [
     "sarong_wrap",
     "Sarong Wrap over Swimwear",
     "사롱을 두른 수영복",
     "popular",
     "f",
     "swimwear with a printed sarong knotted at the hip"
    ],
    [
     "yukata_poolside",
     "Yukata over Swimwear",
     "수영복 위 유카타",
     "popular",
     "f",
     "swimwear with a light yukata worn open over it, poolside"
    ],
    [
     "heritage_pattern_swim",
     "Heritage-pattern Swimwear",
     "전통 문양 수영복",
     "special",
     "f",
     "a swimsuit in a heritage textile pattern with matching trim"
    ],
    [
     "onsen_after",
     "Hot Spring, After Bath",
     "온천 후",
     "special",
     "f",
     "at an outdoor hot-spring bathing area after a soak, wrapped in a towel, steam and a stone basin around her"
    ],
    [
     "hanbok_coverup",
     "Hanbok-line Cover-up",
     "한복 선을 딴 커버업",
     "special",
     "f",
     "swimwear under a hanbok-line cover-up with a high waist and wide flowing skirt"
    ],
    [
     "cutout_onepiece",
     "Cut-out One-piece",
     "컷아웃 원피스",
     "popular",
     "f",
     "a fully lined one-piece swimsuit with large cut-outs at the sides of the waist"
    ],
    [
     "plunge_onepiece",
     "Plunge One-piece",
     "딥 플런지 원피스",
     "popular",
     "f",
     "a one-piece swimsuit with a deep plunging V neckline and a secure wide band at the waist"
    ],
    [
     "oring_bikini",
     "O-ring Bikini",
     "링 장식 비키니",
     "special",
     "f",
     "a bikini whose top and bottom are joined at the centre and hips by polished metal rings"
    ],
    [
     "crochet_bikini",
     "Crochet Bikini",
     "크로셰 비키니",
     "special",
     "f",
     "a fully lined crochet-knit bikini in a sunny resort colour"
    ],
    [
     "yacht_deck",
     "Yacht Foredeck",
     "요트 갑판",
     "special",
     "f",
     "sunbathing in a bikini on the cushioned foredeck of a moored yacht, leaning back on her hands"
    ],
    [
     "waterfall_pool",
     "Waterfall Pool",
     "폭포 웅덩이",
     "special",
     "f",
     "standing waist-deep in a rocky waterfall pool in a swimsuit, pushing wet hair back with both hands"
    ],
    [
     "beach_volley",
     "Beach Volleyball",
     "비치발리볼",
     "popular",
     "f",
     "playing beach volleyball in a sporty bikini, crouching low to receive the ball on hot sand"
    ],
    [
     "paddle_board",
     "Paddleboard",
     "패들보드",
     "popular",
     "f",
     "standing on a paddleboard in a swimsuit on a calm bay, the paddle mid-stroke"
    ],
    [
     "pool_float",
     "Pool Float",
     "튜브 위 휴식",
     "special",
     "f",
     "lounging on a large inflatable ring in a swimsuit in a sunny pool, a drink in one hand"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "special"
    ]
   ],
   "active": [
    [
     "",
     "AUTO",
     "자동",
     "basic"
    ],
    [
     "warmup",
     "Warm-up / Cool-down",
     "워밍업 / 쿨다운",
     "basic"
    ],
    [
     "stretch",
     "Mobility Stretch Session",
     "모빌리티 스트레칭",
     "basic"
    ],
    [
     "dance_transition",
     "Dance Practice Transition",
     "댄스 연습 중 전환 동작",
     "popular"
    ],
    [
     "pilates",
     "Pilates / Core Session",
     "필라테스 / 코어 세션",
     "popular"
    ],
    [
     "tennis_active",
     "Tennis-inspired Active Fashion",
     "테니스풍 액티브 패션",
     "popular"
    ],
    [
     "basketball_jersey",
     "Loose Basketball Jersey Fashion",
     "루즈 농구저지 패션",
     "popular"
    ],
    [
     "boxing_fitness",
     "Boxing Fitness Styling",
     "복싱 피트니스 스타일",
     "popular"
    ],
    [
     "running_recovery",
     "Post-run Recovery",
     "러닝 후 리커버리",
     "popular"
    ],
    [
     "light_jog",
     "Light Morning Jog",
     "가벼운 아침 조깅",
     "basic"
    ],
    [
     "parkour_stairs",
     "Stair / Parkour Transition",
     "계단 / 파쿠르 전환 동작",
     "special"
    ],
    [
     "roller_skating",
     "Roller-skating Fashion",
     "롤러스케이트 패션",
     "special"
    ],
    [
     "fencing_motion",
     "Fencing-inspired Movement Fashion",
     "펜싱풍 무브먼트 패션",
     "special"
    ],
    [
     "climbing_warmup",
     "Climbing Warm-up",
     "클라이밍 워밍업",
     "special"
    ],
    [
     "surf_prep",
     "Surf Preparation",
     "서핑 준비 장면",
     "special"
    ],
    [
     "yoga_flow",
     "Yoga Flow",
     "요가 플로우",
     "popular"
    ],
    [
     "cycling_kit",
     "Cycling Kit",
     "사이클링 복장",
     "popular"
    ],
    [
     "track_sprint",
     "Track Sprint Start",
     "트랙 스타트 자세",
     "popular"
    ],
    [
     "archery_draw",
     "Archery Draw",
     "활 당기는 순간",
     "special"
    ],
    [
     "aerial_silk",
     "Aerial Silk Practice",
     "에어리얼 실크 연습",
     "special"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "special"
    ]
   ],
   "source_editorial": [
    [
     "",
     "AUTO — strongest source motif",
     "AUTO — 책 설계표 대표 모티프 자동",
     "basic"
    ],
    [
     "couture_gala",
     "Couture Gala Look",
     "쿠튀르 갈라 룩",
     "basic"
    ],
    [
     "runway",
     "Runway Editorial",
     "런웨이 에디토리얼",
     "basic"
    ],
    [
     "aerodynamic_couture",
     "Aerodynamic Layered Couture",
     "공기역학적 레이어드 쿠튀르",
     "popular"
    ],
    [
     "metallic_asymmetry",
     "Metallic Asymmetric Tailoring",
     "메탈릭 비대칭 테일러링",
     "popular"
    ],
    [
     "ceremonial_whitegold",
     "Ceremonial White / Gold Look",
     "의전풍 화이트 / 골드 룩",
     "popular"
    ],
    [
     "cyber_street",
     "Cyber Street Editorial",
     "사이버 스트리트 에디토리얼",
     "popular"
    ],
    [
     "deconstructed_frame",
     "Deconstructed Frame-line Couture",
     "프레임 라인 해체형 쿠튀르",
     "special"
    ],
    [
     "floating_panel",
     "Floating-panel Inspired Couture",
     "플로팅 패널 영감 쿠튀르",
     "special"
    ],
    [
     "luminous_circuit",
     "Luminous Circuit Editorial",
     "루미너스 서킷 에디토리얼",
     "special"
    ],
    [
     "wing_light",
     "Wing-light / Kinetic Layer Editorial",
     "윙 라이트 / 키네틱 레이어 에디토리얼",
     "special"
    ],
    [
     "heavy_architecture",
     "Heavy Architectural Tailoring",
     "중량감 있는 아키텍처럴 테일러링",
     "special"
    ],
    [
     "stealth_monochrome",
     "Stealth Monochrome Editorial",
     "스텔스 모노크롬 에디토리얼",
     "special"
    ],
    [
     "transformation_drape",
     "Transforming Drape Construction",
     "변형 구조 드레이프",
     "special"
    ],
    [
     "orbital_ring",
     "Orbital Ring / Halo Geometry",
     "궤도 링 / 헤일로 지오메트리",
     "special"
    ],
    [
     "thruster_flare",
     "Thruster-flare Hemline",
     "스러스터 플레어 헴라인",
     "popular",
     "f"
    ],
    [
     "cockpit_harness",
     "Cockpit Harness Tailoring",
     "콕핏 하네스 테일러링",
     "popular"
    ],
    [
     "camo_couture",
     "Camouflage Couture",
     "카모 쿠튀르",
     "special"
    ],
    [
     "ceramic_plate",
     "Ceramic Plate Layering",
     "세라믹 플레이트 레이어링",
     "special"
    ],
    [
     "heritage_couture",
     "Heritage × Source Couture",
     "전통 구조 + 책 설계표색 쿠튀르",
     "popular"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "special"
    ]
   ],
   "homewear": [
    [
     "",
     "AUTO",
     "자동",
     "basic"
    ],
    [
     "soft_tank_shorts",
     "Soft Tank Top + Shorts",
     "소프트 탱크탑 + 쇼츠",
     "basic",
     "f"
    ],
    [
     "satin_lounge",
     "Satin Lounge Set",
     "새틴 라운지 세트",
     "basic",
     "f"
    ],
    [
     "offshoulder_knit",
     "Off-shoulder Knit Homewear",
     "오프숄더 니트 홈웨어",
     "popular",
     "f"
    ],
    [
     "camisole_wrap",
     "Camisole + Wrap Bottom",
     "캐미솔 + 랩 바텀",
     "popular",
     "f"
    ],
    [
     "bralette_cardigan",
     "Bralette + Open Cardigan",
     "브라렛 + 오픈 가디건",
     "popular",
     "f"
    ],
    [
     "one_shoulder_lounge",
     "One-shoulder Lounge Set",
     "원숄더 라운지 세트",
     "popular",
     "f"
    ],
    [
     "backless_lounge",
     "Backless Lounge Look",
     "백리스 라운지 룩",
     "special",
     "f"
    ],
    [
     "after_bath",
     "After-bath Homewear",
     "목욕 후 홈웨어",
     "special",
     "f"
    ],
    [
     "window_vanity",
     "Window-side Vanity Moment",
     "창가 화장대 순간",
     "special",
     "f"
    ],
    [
     "late_night_kitchen",
     "Late-night Kitchen Homewear",
     "늦은 밤 주방 홈웨어",
     "special",
     "f"
    ],
    [
     "laundry_lounge",
     "Laundry / Bedding Lounge Scene",
     "빨래 / 침구 정리 라운지 장면",
     "special",
     "f"
    ],
    [
     "sunroom_lounge",
     "Sunroom Lounge Fashion",
     "선룸 라운지 패션",
     "special",
     "f"
    ],
    [
     "oversized_shirt",
     "Oversized Shirt Homewear",
     "오버사이즈 셔츠 홈웨어",
     "popular",
     "f"
    ],
    [
     "hoodie_shorts",
     "Cropped Hoodie + Shorts",
     "크롭 후디 + 쇼츠",
     "popular",
     "f"
    ],
    [
     "knit_dress_home",
     "Soft Knit Dress",
     "소프트 니트 원피스",
     "popular",
     "f"
    ],
    [
     "robe_morning",
     "Morning Robe",
     "아침 로브",
     "popular",
     "f"
    ],
    [
     "floor_cushion",
     "Floor Cushion Lounging",
     "바닥 쿠션에서 뒹굴기",
     "special",
     "f"
    ],
    [
     "home_workout",
     "Home Stretch Corner",
     "집 안 스트레칭 코너",
     "special",
     "f"
    ],
    [
     "hammock_balcony",
     "Balcony Hammock",
     "발코니 해먹",
     "popular",
     "f",
     "swaying in a balcony hammock in a silk lounge set, one leg trailing over the side"
    ],
    [
     "breakfast_bed",
     "Breakfast in Bed",
     "침대 위 아침",
     "popular",
     "f",
     "sitting up in bed in satin pyjamas with a breakfast tray across her lap"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "special"
    ]
   ],
   "private_evening": [
    [
     "",
     "AUTO",
     "자동",
     "basic"
    ],
    [
     "slip_dress",
     "Slip Dress Evening",
     "슬립 드레스 이브닝",
     "basic",
     "f"
    ],
    [
     "cocktail_mini",
     "Cocktail Mini Dress",
     "칵테일 미니드레스",
     "basic",
     "f"
    ],
    [
     "one_shoulder_satin",
     "One-shoulder Satin Evening",
     "원숄더 새틴 이브닝",
     "popular",
     "f"
    ],
    [
     "low_back_evening",
     "Low-back Evening Dress",
     "로우백 이브닝 드레스",
     "popular",
     "f"
    ],
    [
     "after_party",
     "After-party Styling",
     "애프터파티 스타일링",
     "popular",
     "f"
    ],
    [
     "hotel_evening",
     "Hotel Room Evening",
     "호텔룸 이브닝",
     "popular",
     "f"
    ],
    [
     "balcony_night",
     "Night Balcony Mood",
     "야간 발코니 무드",
     "popular",
     "f"
    ],
    [
     "mirror_touchup",
     "Mirror Touch-up",
     "거울 앞 메이크업 수정",
     "special",
     "f"
    ],
    [
     "opera_night",
     "Opera / Theater Night Styling",
     "오페라 / 극장 나이트 스타일",
     "special",
     "f"
    ],
    [
     "penthouse_window",
     "Penthouse Window Mood",
     "펜트하우스 창가 무드",
     "special",
     "f"
    ],
    [
     "silk_robe_evening",
     "Silk Robe over Evening Base",
     "이브닝 베이스 위 실크 로브",
     "special",
     "f"
    ],
    [
     "velvet_evening",
     "Velvet Evening Dress",
     "벨벳 이브닝 드레스",
     "popular",
     "f"
    ],
    [
     "halter_evening",
     "Halter-neck Evening",
     "홀터넥 이브닝",
     "popular",
     "f"
    ],
    [
     "high_slit_gown",
     "High-slit Gown",
     "하이슬릿 가운",
     "popular",
     "f"
    ],
    [
     "wine_bar",
     "Wine Bar Corner",
     "와인바 구석 자리",
     "special",
     "f"
    ],
    [
     "night_drive",
     "Night Drive Passenger Seat",
     "야간 드라이브 조수석",
     "special",
     "f"
    ],
    [
     "heritage_evening",
     "Traditional Formal Evening",
     "전통 정장 차림의 저녁",
     "popular",
     "f"
    ],
    [
     "tea_ceremony_night",
     "Evening Tea Ceremony",
     "저녁 다례",
     "special",
     "f"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "special"
    ]
   ],
   "lingerie": [
    [
     "",
     "AUTO",
     "자동",
     "basic"
    ],
    [
     "lace_set",
     "Lace Lingerie Set",
     "레이스 란제리 세트",
     "basic",
     "f",
     "a black lace lingerie set with a longline top, high-waisted bottoms, and geometric lace trim"
    ],
    [
     "satin_set",
     "Satin Lingerie Set",
     "새틴 란제리 세트",
     "basic",
     "f",
     "a satin lingerie set with a smooth bias-cut top and matching bottoms in a single deep colour"
    ],
    [
     "bralette_highwaist",
     "Bralette + High-waist Bottom",
     "브라렛 + 하이웨이스트 바텀",
     "popular",
     "f",
     "a soft-cup bralette with wide supportive straps and matching high-waisted lingerie bottoms"
    ],
    [
     "bustier_inspired",
     "Bustier-inspired Lingerie",
     "뷔스티에풍 란제리",
     "popular",
     "f",
     "a bustier-inspired satin lingerie top with a long structured bodice and vertical seam detailing"
    ],
    [
     "bodysuit",
     "Lingerie Bodysuit",
     "란제리 보디수트",
     "popular",
     "f",
     "a lingerie bodysuit with a scooped neckline, wide shoulder straps, and lace side panels"
    ],
    [
     "garter_set",
     "Garter-inspired Styling",
     "가터풍 스타일링",
     "popular",
     "f",
     "a lingerie set with decorative garter straps, worn as styling detail"
    ],
    [
     "corset_lingerie",
     "Corset-inspired Lingerie",
     "코르셋풍 란제리",
     "popular",
     "f",
     "a corset-inspired lingerie bodice with visible boning seams and a matching high-waisted piece"
    ],
    [
     "open_shirt_lingerie",
     "Open Shirt over Lingerie",
     "란제리 위 오픈 셔츠",
     "special",
     "f",
     "a tailored oversized shirt worn open over a matching satin lingerie set"
    ],
    [
     "night_robe",
     "Night Robe + Lingerie",
     "나이트 로브 + 란제리",
     "special",
     "f",
     "a lingerie set worn under an open silk night robe with a tied sash"
    ],
    [
     "back_strap",
     "Back-strap Lingerie",
     "백스트랩 란제리",
     "special",
     "f",
     "a lingerie set with a decorative strap arrangement across the upper back"
    ],
    [
     "asymmetric_lingerie",
     "Asymmetric Lingerie Set",
     "비대칭 란제리 세트",
     "special",
     "f",
     "an asymmetric lingerie set with one shoulder strap, a diagonal neckline, and matching high-waisted bottoms"
    ],
    [
     "slip_lingerie",
     "Lingerie Slip",
     "란제리 슬립",
     "popular",
     "f",
     "a bias-cut satin lingerie slip with narrow straps and a straight hem"
    ],
    [
     "babydoll",
     "Babydoll",
     "베이비돌",
     "popular",
     "f",
     "a babydoll lingerie slip with narrow shoulder straps, an empire waist, and a softly flared hem"
    ],
    [
     "longline_bra",
     "Longline Bra Set",
     "롱라인 브라 세트",
     "popular",
     "f",
     "a longline bra set with a wide supportive underband and matching high-waisted bottoms"
    ],
    [
     "knit_lingerie",
     "Knit-blend Lingerie",
     "니트 혼방 란제리",
     "special",
     "f",
     "a knit-blend lingerie set in soft ribbed jersey with a relaxed cropped top"
    ],
    [
     "morning_lingerie",
     "Morning-light Lingerie",
     "아침 햇살 란제리",
     "special",
     "f",
     "a simple cotton lingerie set in morning window light, sheets and a mug nearby"
    ],
    [
     "juban_inspired",
     "Juban-inspired Silk Layer",
     "나가주반 응용 실크 레이어",
     "popular",
     "f",
     "a juban-inspired silk underlayer with a wrapped front and a narrow sash"
    ],
    [
     "hanbok_slip",
     "Hanbok Underlayer-inspired Set",
     "속적삼·속치마 응용 세트",
     "popular",
     "f",
     "a hanbok underlayer-inspired lingerie set with a short wrapped top and a full high-waisted skirt"
    ],
    [
     "qipao_silk_set",
     "Qipao-inspired Silk Set",
     "치파오 응용 실크 세트",
     "popular",
     "f",
     "a qipao-inspired silk lingerie set with a mandarin collar and frog-button closures"
    ],
    [
     "embroidered_corset",
     "Folk-embroidered Corset",
     "민속 자수 코르셋",
     "special",
     "f",
     "a folk-embroidered corset with structured boning and colourful thread work over a matching piece"
    ],
    [
     "kebaya_lace",
     "Kebaya-inspired Lace Top",
     "크바야 응용 레이스 상의",
     "special",
     "f",
     "a kebaya-inspired sheer lace top with fine floral embroidery over a fitted camisole"
    ],
    [
     "sari_blouse_set",
     "Sari Blouse-inspired Set",
     "사리 블라우스 응용 세트",
     "special",
     "f",
     "a sari blouse-inspired lingerie set with a short fitted top and a draped lower piece"
    ],
    [
     "satin_teddy",
     "Satin Teddy",
     "새틴 테디",
     "basic",
     "f",
     "a satin teddy — a single-piece lingerie garment from neckline to hip in one smooth deep colour"
    ],
    [
     "velvet_set",
     "Velvet Lingerie Set",
     "벨벳 란제리 세트",
     "basic",
     "f",
     "a deep-coloured velvet lingerie set of a bralette and high-waisted bottoms"
    ],
    [
     "cage_back",
     "Cage-back Bralette Set",
     "스트랩 등판 브라렛",
     "special",
     "f",
     "a lingerie set whose bralette back is crossed by geometric straps"
    ],
    [
     "sport_cotton",
     "Sporty Cotton Set",
     "스포티 코튼 세트",
     "basic",
     "f",
     "a sporty cotton lingerie set with plain wide bands, on a bright bedroom morning"
    ],
    [
     "chemise_silk",
     "Silk Chemise",
     "실크 슈미즈",
     "popular",
     "f",
     "a knee-skimming silk chemise slip with a lace hem and an opaque lining"
    ],
    [
     "front_lace_corset",
     "Front-lace Corset",
     "앞 끈 코르셋",
     "special",
     "f",
     "a front-lacing corset over matching high-waisted lingerie bottoms"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "special"
    ]
   ],
   "everyday_basic": [
    [
     "",
     "AUTO",
     "자동",
     "basic"
    ],
    [
     "commute_train",
     "Train / Subway Commute",
     "지하철 / 기차 통근",
     "basic"
    ],
    [
     "grocery_run",
     "Grocery Run",
     "장보기",
     "basic"
    ],
    [
     "simple_cooking",
     "Simple Cooking",
     "간단한 요리",
     "basic"
    ],
    [
     "cafe_takeout",
     "Coffee / Takeout Run",
     "커피 / 테이크아웃",
     "popular"
    ],
    [
     "laundry",
     "Laundry / Folding Clothes",
     "세탁 / 빨래 개기",
     "popular"
    ],
    [
     "rain_walk",
     "Rainy Day Walk",
     "비 오는 날 걷기",
     "popular"
    ],
    [
     "station_wait",
     "Waiting at Station",
     "역에서 기다리기",
     "popular"
    ],
    [
     "bookstore",
     "Bookstore Browsing",
     "서점 구경",
     "popular"
    ],
    [
     "parcel_pickup",
     "Parcel / Convenience-store Pickup",
     "택배 / 편의점 픽업",
     "popular"
    ],
    [
     "midnight_laundromat",
     "Midnight Laundromat",
     "심야 코인세탁방",
     "special"
    ],
    [
     "greenhouse",
     "Greenhouse / Plant Shop",
     "온실 / 식물가게",
     "special"
    ],
    [
     "pottery_class",
     "Pottery / Craft Class",
     "도예 / 공예 클래스",
     "special"
    ],
    [
     "record_store",
     "Vinyl Record Store",
     "레코드숍",
     "special"
    ],
    [
     "hardware_store",
     "Hardware / Home-improvement Store",
     "철물 / 홈센터",
     "special"
    ],
    [
     "hanbok_errand",
     "Modern Traditional Daily Errand",
     "생활한복 차림의 외출",
     "popular"
    ],
    [
     "festival_daily",
     "Local Festival Day",
     "지역 축제날",
     "special"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "special"
    ]
   ],
   "everyday_sensual": [
    [
     "",
     "AUTO",
     "자동",
     "basic"
    ],
    [
     "morning_stretch",
     "Morning Stretch",
     "아침 스트레칭",
     "basic",
     "",
     "stretching her shoulders beside a sunlit window just after opening the curtains"
    ],
    [
     "window_light",
     "Window-light Casual Moment",
     "창가 자연광 캐주얼 순간",
     "basic",
     "",
     "standing in casual clothes in the light of a large window, one hand on the frame"
    ],
    [
     "late_snack",
     "Late-night Snack / Drink",
     "늦은 밤 간식 / 음료",
     "popular",
     "",
     "eating a late-night snack at the kitchen counter in loungewear"
    ],
    [
     "high_shelf",
     "Reaching to a High Shelf",
     "높은 선반 손 뻗기",
     "popular",
     "",
     "reaching for a storage box on a high kitchen shelf, shown from an eye-level three-quarter view"
    ],
    [
     "hair_tie",
     "Tying Hair after Shower",
     "샤워 후 머리 묶기",
     "popular",
     "",
     "tying her hair up after a shower, wearing a soft robe in a bright bathroom"
    ],
    [
     "laundry_soft",
     "Laundry with Soft Fashion Reveal",
     "소프트 패션 리빌 세탁 장면",
     "popular",
     "",
     "folding laundry at home in soft loungewear, a cardigan slipping loosely off one shoulder"
    ],
    [
     "sunroom_relax",
     "Sunroom Relaxation",
     "선룸 휴식",
     "popular",
     "",
     "curled on a sunroom sofa in soft knitwear with a blanket and a book"
    ],
    [
     "balcony_plants",
     "Watering Balcony Plants",
     "발코니 식물 물주기",
     "popular",
     "",
     "watering balcony plants in a fitted knit dress, morning light across the railing"
    ],
    [
     "rainy_return",
     "Returning Home after Rain",
     "비 맞고 귀가한 순간",
     "special",
     "",
     "coming in from the rain and slipping off a damp raincoat in the entryway, hair slightly wet"
    ],
    [
     "floor_organizing",
     "Floor-level Closet Organizing",
     "바닥에 앉아 옷장 정리",
     "special",
     "",
     "kneeling on the floor to sort folded clothes into a low drawer"
    ],
    [
     "after_work_change",
     "Changing Outer Layers after Work",
     "퇴근 후 겉옷 정리",
     "special",
     "",
     "hanging up a work jacket and changing into home wear just after getting in"
    ],
    [
     "fridge_light",
     "Refrigerator-light Late-night Moment",
     "냉장고 불빛 늦은 밤 순간",
     "special",
     "",
     "standing at the open refrigerator late at night, lit only by its interior light"
    ],
    [
     "shoe_bench",
     "Sitting to Tie Shoes",
     "신발 신으려 앉은 순간",
     "popular",
     "",
     "sitting on the entryway bench to tie her shoes before going out"
    ],
    [
     "mirror_selfie",
     "Full-length Mirror Check",
     "전신거울 앞 옷매무새",
     "popular",
     "",
     "checking her outfit in a full-length mirror, phone raised"
    ],
    [
     "window_rain",
     "Watching Rain from Window",
     "창밖 비 구경",
     "popular",
     "",
     "watching rain run down the window from an armchair, mug in hand"
    ],
    [
     "stair_landing",
     "Stair Landing Pause",
     "계단 참에서 잠깐 멈춤",
     "special",
     "",
     "pausing on a stair landing with one hand on the railing"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "special"
    ]
   ],
   "traditional": [
    [
     "auto_traditional",
     "Auto — Match Ethnicity",
     "계통에 맞춰 자동 선택",
     "basic"
    ],
    [
     "hanbok_formal",
     "Hanbok — Formal",
     "한복(한국) · 정장",
     "popular"
    ],
    [
     "hanbok_daily",
     "Hanbok — Modern Daily",
     "생활한복(한국) · 일상형",
     "popular"
    ],
    [
     "kimono_formal",
     "Kimono — Formal",
     "기모노(일본) · 정장",
     "popular"
    ],
    [
     "yukata_daily",
     "Yukata — Summer Casual",
     "유카타(일본) · 여름 일상",
     "popular"
    ],
    [
     "hanfu_formal",
     "Hanfu — Formal",
     "한푸(중국) · 정장",
     "popular"
    ],
    [
     "qipao_daily",
     "Qipao — Modern Daily",
     "치파오(중국) · 현대형",
     "popular",
     "f"
    ],
    [
     "aodai_daily",
     "Áo Dài",
     "아오자이(베트남)",
     "popular",
     "f"
    ],
    [
     "sari_formal",
     "Sari — Formal",
     "사리(인도) · 정장",
     "popular",
     "f"
    ],
    [
     "lehenga_formal",
     "Lehenga",
     "레헹가(인도)",
     "special",
     "f"
    ],
    [
     "salwar_daily",
     "Salwar Kameez — Daily",
     "살와르 카미즈(인도·파키스탄) · 일상",
     "special",
     "f"
    ],
    [
     "abaya_modern",
     "Modern Abaya",
     "아바야(아라비아반도) · 현대형",
     "popular",
     "f"
    ],
    [
     "kaftan_daily",
     "Kaftan — Resort Daily",
     "카프탄(북아프리카·중동) · 리조트 일상",
     "special"
    ],
    [
     "thobe_inspired",
     "Thobe-inspired Dress",
     "토브(아라비아반도) 응용 드레스",
     "special"
    ],
    [
     "dirndl_modern",
     "Modern Dirndl",
     "디른들(독일·오스트리아) 현대형",
     "special",
     "f"
    ],
    [
     "folk_embroidery",
     "Folk Embroidery Blouse",
     "자수 블라우스(동유럽)",
     "special",
     "f"
    ],
    [
     "kente_modern",
     "Kente-patterned Modern Dress",
     "켄테(가나) 무늬 현대 드레스",
     "popular",
     "f"
    ],
    [
     "boubou_flow",
     "Flowing Boubou",
     "부부(서아프리카) · 흐르는 실루엣",
     "special"
    ],
    [
     "huipil_modern",
     "Modern Huipil",
     "우이필(중미) 현대형",
     "special",
     "f"
    ],
    [
     "poncho_andes",
     "Andean Woven Layer",
     "안데스(페루·볼리비아) 직조 레이어",
     "special"
    ],
    [
     "kilt_inspired",
     "Kilt-inspired Skirt",
     "킬트(스코틀랜드) 응용 스커트",
     "special"
    ],
    [
     "kebaya_daily",
     "Kebaya — Daily",
     "크바야(인도네시아) · 일상",
     "special",
     "f"
    ],
    [
     "barong_inspired",
     "Barong-inspired Sheer Top",
     "바롱(필리핀) 응용 시스루 상의",
     "special"
    ],
    [
     "caftan_evening",
     "Traditional Evening Layering",
     "전통 이브닝 레이어링(지역은 계통에 따름)",
     "popular"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "special"
    ]
   ],
   "wildcard": [
    [
     "",
     "AUTO",
     "자동",
     "basic"
    ],
    [
     "festival_night",
     "Night Festival Cut",
     "야간 페스티벌 컷",
     "basic"
    ],
    [
     "rain_editorial",
     "Rain Editorial",
     "비 오는 에디토리얼",
     "popular"
    ],
    [
     "arcade_night",
     "Night Arcade Styling",
     "야간 아케이드 스타일",
     "popular"
    ],
    [
     "ferry_deck",
     "Ferry / Ship Deck Fashion",
     "페리 / 선박 데크 패션",
     "popular"
    ],
    [
     "retro_motel",
     "Retro Motel Mood",
     "레트로 모텔 무드",
     "special"
    ],
    [
     "desert_resort",
     "Desert Resort Fashion",
     "사막 리조트 패션",
     "special"
    ],
    [
     "futuristic_spa",
     "Futuristic Spa",
     "퓨처리스틱 스파",
     "special"
    ],
    [
     "observatory_night",
     "Night Observatory",
     "야간 천문대",
     "special"
    ],
    [
     "greenhouse_afterdark",
     "Greenhouse after Dark",
     "심야 온실",
     "special"
    ],
    [
     "rooftop_cinema",
     "Rooftop Cinema",
     "루프탑 시네마",
     "special"
    ],
    [
     "winter_lodge",
     "Winter Lodge Fashion",
     "겨울 로지 패션",
     "special"
    ],
    [
     "art_studio",
     "After-hours Art Studio",
     "영업 종료 후 아트 스튜디오",
     "special"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "special"
    ]
   ],
   "__custom__": [
    [
     "",
     "AUTO",
     "자동",
     "basic"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "special"
    ]
   ],
   "travel_exploration": [
    [
     "",
     "AUTO",
     "자동 — 이 갈래에 맞는 장면",
     "basic"
    ],
    [
     "travel_trail",
     "Pausing at a forest trail junction to compare a folded map with a trail marker, wearing a light travel pack.",
     "숲길 지도 확인",
     "basic",
     "",
     "Pausing at a forest trail junction to compare a folded map with a trail marker, wearing a light travel pack."
    ],
    [
     "travel_station",
     "Waiting on a rural station bench with a travel bag, holding a snack and checking a route card.",
     "여행 열차 기다리기",
     "basic",
     "",
     "Waiting on a rural station bench with a travel bag, holding a snack and checking a route card."
    ],
    [
     "travel_camp",
     "Folding a camping blanket beside a small tent and a neatly arranged cooking kit at a quiet campsite.",
     "캠프 정리",
     "basic",
     "",
     "Folding a camping blanket beside a small tent and a neatly arranged cooking kit at a quiet campsite."
    ],
    [
     "travel_lakeside",
     "Taking a water break on a flat lakeside rock, with walking shoes and a travel bag clearly grounded.",
     "호숫가 쉬어가기",
     "basic",
     "",
     "Taking a water break on a flat lakeside rock, with walking shoes and a travel bag clearly grounded."
    ],
    [
     "travel_lookout",
     "Looking through binoculars from a hilltop lookout, with a folded habitat map in a side pocket.",
     "전망대 풍경 감상",
     "basic",
     "",
     "Looking through binoculars from a hilltop lookout, with a folded habitat map in a side pocket."
    ],
    [
     "travel_coast",
     "Examining shells and small tracks on a beach while making a quick sketch in a travel notebook.",
     "해변 탐사 산책",
     "basic",
     "",
     "Examining shells and small tracks on a beach while making a quick sketch in a travel notebook."
    ],
    [
     "travel_ferry",
     "Leaning on the rail of a harbor ferry deck with a travel bag at her feet, watching an island coastline approach.",
     "페리 갑판에서 섬 바라보기",
     "basic",
     "",
     "Leaning on the rail of a harbor ferry deck with a travel bag at her feet, watching an island coastline approach."
    ],
    [
     "travel_lodge",
     "Receiving a wooden room key at the front counter of a mountain lodge, her hiking pack still on one shoulder.",
     "산장 체크인",
     "basic",
     "",
     "Receiving a wooden room key at the front counter of a mountain lodge, her hiking pack still on one shoulder."
    ],
    [
     "travel_cablecar",
     "Gazing out of a cable car window over a misty valley, one hand on the window rail and a small daypack on the seat.",
     "케이블카 창밖 보기",
     "popular",
     "",
     "Gazing out of a cable car window over a misty valley, one hand on the window rail and a small daypack on the seat."
    ],
    [
     "travel_footbath",
     "Soaking her feet in a hot-spring town footbath under a wooden roof, trouser hems rolled up and a small towel folded beside her.",
     "온천 마을 족욕",
     "popular",
     "",
     "Soaking her feet in a hot-spring town footbath under a wooden roof, trouser hems rolled up and a small towel folded beside her."
    ],
    [
     "travel_dunes",
     "Checking a brass compass on a wind-rippled desert dune trail, a light scarf around her shoulders and a canteen at her hip.",
     "사막 길에서 나침반 보기",
     "special",
     "",
     "Checking a brass compass on a wind-rippled desert dune trail, a light scarf around her shoulders and a canteen at her hip."
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "basic"
    ]
   ],
   "festivals_contests": [
    [
     "",
     "AUTO",
     "자동 — 이 갈래에 맞는 장면",
     "basic"
    ],
    [
     "fest_lantern",
     "Walking through a lantern festival with a small snack, wearing comfortable event clothing with a subtle motif from her book.",
     "등불 축제 산책",
     "basic",
     "",
     "Walking through a lantern festival with a small snack, wearing comfortable event clothing with a subtle motif from her book."
    ],
    [
     "fest_ribbon",
     "Adjusting a small microphone stand and a reading lamp on a stage before an evening poetry reading.",
     "낭독회 무대 준비",
     "basic",
     "",
     "Adjusting a small microphone stand and a reading lamp on a stage before an evening poetry reading."
    ],
    [
     "fest_cheering",
     "Clapping from an outdoor theater seat during a play, a folded program resting on her bag.",
     "관중석 응원",
     "basic",
     "",
     "Clapping from an outdoor theater seat during a play, a folded program resting on her bag."
    ],
    [
     "fest_booth",
     "Browsing a book-fair stall of handmade bookmarks and lifting one to the light for a closer look.",
     "책 시장 구경",
     "basic",
     "",
     "Browsing a book-fair stall of handmade bookmarks and lifting one to the light for a closer look."
    ],
    [
     "fest_rehearsal",
     "Practicing a simple stage gesture with a ribbon prop backstage before a costume parade.",
     "무대 전 가벼운 연습",
     "basic",
     "",
     "Practicing a simple stage gesture with a ribbon prop backstage before a costume parade."
    ],
    [
     "fest_fireworks",
     "Waiting for festival fireworks at a riverside seating area, holding a drink with a small bag beside her.",
     "불꽃놀이 기다리기",
     "basic",
     "",
     "Waiting for festival fireworks at a riverside seating area, holding a drink with a small bag beside her."
    ],
    [
     "fest_parade",
     "Riding a flower-decked parade float and tossing petals toward the street below.",
     "꽃차 퍼레이드",
     "basic",
     "",
     "Riding a flower-decked parade float and tossing petals toward the street below."
    ],
    [
     "fest_ringtoss",
     "Aiming a ring at the bottles of a festival ring-toss stall, one eye narrowed in concentration.",
     "고리 던지기 노점",
     "basic",
     "",
     "Aiming a ring at the bottles of a festival ring-toss stall, one eye narrowed in concentration."
    ],
    [
     "fest_illumination",
     "Strolling under a tunnel of winter illumination lights, holding a warm drink in gloved hands.",
     "겨울 조명 축제",
     "popular",
     "",
     "Strolling under a tunnel of winter illumination lights, holding a warm drink in gloved hands."
    ],
    [
     "fest_flowercrown",
     "Weaving a crown of fresh flowers at a spring flower-festival workshop table.",
     "꽃관 만들기",
     "popular",
     "",
     "Weaving a crown of fresh flowers at a spring flower-festival workshop table."
    ],
    [
     "fest_dance",
     "Dancing a simple circle step around a festival drum tower under paper lanterns.",
     "축제 춤판",
     "special",
     "",
     "Dancing a simple circle step around a festival drum tower under paper lanterns."
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "basic"
    ]
   ],
   "hobbies_leisure": [
    [
     "",
     "AUTO",
     "자동 — 이 갈래에 맞는 장면",
     "basic"
    ],
    [
     "hobby_reading",
     "Turning a page of an unlettered illustrated book while seated by a window with a cup of tea.",
     "창가 독서",
     "basic",
     "",
     "Turning a page of an unlettered illustrated book while seated by a window with a cup of tea."
    ],
    [
     "hobby_sketch",
     "Sketching park trees and a fountain in a notebook on a park bench.",
     "풍경 스케치",
     "basic",
     "",
     "Sketching park trees and a fountain in a notebook on a park bench."
    ],
    [
     "hobby_craft",
     "Threading beads onto a ribbon bookmark at a hobby table with tidy craft tools.",
     "책갈피 만들기",
     "basic",
     "",
     "Threading beads onto a ribbon bookmark at a hobby table with tidy craft tools."
    ],
    [
     "hobby_music",
     "Practicing a small acoustic instrument in a cozy room with a music stand and a resting cushion nearby.",
     "악기 연습",
     "basic",
     "",
     "Practicing a small acoustic instrument in a cozy room with a music stand and a resting cushion nearby."
    ],
    [
     "hobby_photo",
     "Sorting printed walk photographs beside a camera and a scrapbook at a cafe table.",
     "산책 사진 고르기",
     "basic",
     "",
     "Sorting printed walk photographs beside a camera and a scrapbook at a cafe table."
    ],
    [
     "hobby_gardening",
     "Watering small herb seedlings on a windowsill and trimming a dry leaf with gardening scissors.",
     "창가 화분 돌보기",
     "basic",
     "",
     "Watering small herb seedlings on a windowsill and trimming a dry leaf with gardening scissors."
    ],
    [
     "hobby_boardgame",
     "Moving a game piece across a wooden board game at a cozy table, weighing her next move.",
     "보드게임",
     "basic",
     "",
     "Moving a game piece across a wooden board game at a cozy table, weighing her next move."
    ],
    [
     "hobby_fishing",
     "Casting a fishing line from a quiet wooden pier at dawn, a small tackle box at her feet.",
     "낚시",
     "basic",
     "",
     "Casting a fishing line from a quiet wooden pier at dawn, a small tackle box at her feet."
    ],
    [
     "hobby_birdwatch",
     "Watching the far side of a marsh through compact binoculars from a reed-lined observation hide, a field notebook on the ledge.",
     "탐조 관찰",
     "popular",
     "",
     "Watching the far side of a marsh through compact binoculars from a reed-lined observation hide, a field notebook on the ledge."
    ],
    [
     "hobby_origami",
     "Folding a small paper crane at a low table, a few finished paper figures lined up beside her.",
     "종이접기",
     "popular",
     "",
     "Folding a small paper crane at a low table, a few finished paper figures lined up beside her."
    ],
    [
     "hobby_knitting",
     "Knitting a soft scarf on a window seat, a ball of yarn resting in a basket at her side.",
     "뜨개질",
     "special",
     "",
     "Knitting a soft scarf on a window seat, a ball of yarn resting in a basket at her side."
    ],
    [
     "hobby_stargazing",
     "Adjusting a small telescope on a rooftop at night to look at the stars, a thermos beside the tripod.",
     "별 보기",
     "special",
     "",
     "Adjusting a small telescope on a rooftop at night to look at the stars, a thermos beside the tripod."
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "basic"
    ]
   ],
   "everyday": [
    [
     "",
     "AUTO",
     "자동",
     "basic"
    ],
    [
     "commute_train",
     "Train / Subway Commute",
     "지하철 / 기차 통근",
     "basic"
    ],
    [
     "grocery_run",
     "Grocery Run",
     "장보기",
     "basic"
    ],
    [
     "simple_cooking",
     "Simple Cooking",
     "간단한 요리",
     "basic"
    ],
    [
     "cafe_takeout",
     "Coffee / Takeout Run",
     "커피 / 테이크아웃",
     "popular"
    ],
    [
     "laundry",
     "Laundry / Folding Clothes",
     "세탁 / 빨래 개기",
     "popular"
    ],
    [
     "rain_walk",
     "Rainy Day Walk",
     "비 오는 날 걷기",
     "popular"
    ],
    [
     "station_wait",
     "Waiting at Station",
     "역에서 기다리기",
     "popular"
    ],
    [
     "bookstore",
     "Bookstore Browsing",
     "서점 구경",
     "popular"
    ],
    [
     "parcel_pickup",
     "Parcel / Convenience-store Pickup",
     "택배 / 편의점 픽업",
     "popular"
    ],
    [
     "midnight_laundromat",
     "Midnight Laundromat",
     "심야 코인세탁방",
     "special"
    ],
    [
     "greenhouse",
     "Greenhouse / Plant Shop",
     "온실 / 식물가게",
     "special"
    ],
    [
     "pottery_class",
     "Pottery / Craft Class",
     "도예 / 공예 클래스",
     "special"
    ],
    [
     "record_store",
     "Vinyl Record Store",
     "레코드숍",
     "special"
    ],
    [
     "hardware_store",
     "Hardware / Home-improvement Store",
     "철물 / 홈센터",
     "special"
    ],
    [
     "hanbok_errand",
     "Modern Traditional Daily Errand",
     "생활한복 차림의 외출",
     "popular"
    ],
    [
     "festival_daily",
     "Local Festival Day",
     "지역 축제날",
     "special"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "special"
    ]
   ],
   "library_life": [
    [
     "",
     "AUTO",
     "자동 — 이 갈래에 맞는 장면",
     "basic"
    ],
    [
     "lib_shelving",
     "Reshelving a small stack of returned books on a tall wooden library shelf, one hand on the rolling ladder rail.",
     "서가 정리",
     "basic",
     "",
     "Reshelving a small stack of returned books on a tall wooden library shelf, one hand on the rolling ladder rail."
    ],
    [
     "lib_binding",
     "Stitching a book block at a bindery workbench with waxed thread, an awl and folded signatures laid out in order.",
     "제본 공방",
     "basic",
     "",
     "Stitching a book block at a bindery workbench with waxed thread, an awl and folded signatures laid out in order."
    ],
    [
     "lib_restoring",
     "Mending a torn page with Japanese tissue and a fine brush under a magnifying lamp in a conservation studio.",
     "고서 복원",
     "basic",
     "",
     "Mending a torn page with Japanese tissue and a fine brush under a magnifying lamp in a conservation studio."
    ],
    [
     "lib_bookshop",
     "Arranging secondhand books on an outdoor bookshop cart under a striped awning on a quiet street.",
     "헌책방 점원",
     "basic",
     "",
     "Arranging secondhand books on an outdoor bookshop cart under a striped awning on a quiet street."
    ],
    [
     "lib_press",
     "Inking a small letterpress plate at a hand press, a tray of loose type blocks beside her apron.",
     "활판 인쇄소",
     "basic",
     "",
     "Inking a small letterpress plate at a hand press, a tray of loose type blocks beside her apron."
    ],
    [
     "lib_reading_room",
     "Switching off green reading lamps one by one along a long table in an empty evening reading room.",
     "열람실 정리",
     "basic",
     "",
     "Switching off green reading lamps one by one along a long table in an empty evening reading room."
    ],
    [
     "lib_archive",
     "Pulling an archival box from a high metal shelf in a cool records room, a pencil tucked behind her ear.",
     "기록 보관소",
     "basic",
     "",
     "Pulling an archival box from a high metal shelf in a cool records room, a pencil tucked behind her ear."
    ],
    [
     "lib_catalog",
     "Flipping through a wooden card-catalog drawer with one finger, the drawer pulled halfway out.",
     "카드 목록함",
     "basic",
     "",
     "Flipping through a wooden card-catalog drawer with one finger, the drawer pulled halfway out."
    ],
    [
     "lib_storyhour",
     "Arranging floor cushions and a basket of picture books in a library corner before the afternoon story hour.",
     "이야기 시간 준비",
     "basic",
     "",
     "Arranging floor cushions and a basket of picture books in a library corner before the afternoon story hour."
    ],
    [
     "lib_mobile",
     "Loading a crate of books onto the shelves of a mobile library van parked in a village square.",
     "이동 도서관",
     "popular",
     "",
     "Loading a crate of books onto the shelves of a mobile library van parked in a village square."
    ],
    [
     "lib_night_round",
     "Walking the dark stacks after closing with a small lantern, checking that every reading lamp is off.",
     "폐관 순찰",
     "popular",
     "",
     "Walking the dark stacks after closing with a small lantern, checking that every reading lamp is off."
    ],
    [
     "lib_map_room",
     "Unrolling a large old map across a wide table in a map room, weighing its corners with small brass weights.",
     "지도실",
     "special",
     "",
     "Unrolling a large old map across a wide table in a map room, weighing its corners with small brass weights."
    ],
    [
     "__custom__",
     "직접 입력",
     "직접 입력",
     "basic"
    ]
   ],
   "story_place": [
    [
     "",
     "AUTO",
     "자동 — 이 갈래에 맞는 장면",
     "basic"
    ],
    [
     "sp_overlook",
     "Standing at an overlook above the place where her story is set, a light daypack on one shoulder and wind in her hair.",
     "전망대에서 내려다보기",
     "basic",
     "",
     "Standing at an overlook above the place where her story is set, a light daypack on one shoulder and wind in her hair."
    ],
    [
     "sp_walk",
     "Walking slowly along an old path through her story's landscape at golden hour, one hand trailing along a weathered stone wall.",
     "옛길 산책",
     "basic",
     "",
     "Walking slowly along an old path through her story's landscape at golden hour, one hand trailing along a weathered stone wall."
    ],
    [
     "sp_rest",
     "Sitting on worn stone steps at the heart of her story's setting with a paper cup, travellers blurred behind her.",
     "돌계단에서 쉬기",
     "basic",
     "",
     "Sitting on worn stone steps at the heart of her story's setting with a paper cup, travellers blurred behind her."
    ],
    [
     "sp_sketch",
     "Sketching her story's landscape in a small notebook from a bench, a camera bag beside her.",
     "풍경 스케치",
     "popular",
     "",
     "Sketching her story's landscape in a small notebook from a bench, a camera bag beside her."
    ],
    [
     "sp_dawn",
     "Watching the first light reach her story's setting from a quiet spot, a warm scarf around her shoulders.",
     "새벽 풍경",
     "popular",
     "",
     "Watching the first light reach her story's setting from a quiet spot, a warm scarf around her shoulders."
    ],
    [
     "sp_window",
     "Looking out from the window seat of a local guesthouse toward her story's setting, a cup of tea in her hands.",
     "숙소 창가",
     "special",
     "",
     "Looking out from the window seat of a local guesthouse toward her story's setting, a cup of tea in her hands."
    ],
    [
     "__custom__",
     "직접 입력",
     "직접 입력",
     "basic"
    ]
   ],
   "stage_adaptation": [
    [
     "",
     "AUTO",
     "자동 — 이 갈래에 맞는 장면",
     "basic"
    ],
    [
     "ad_fitting",
     "Standing on a fitting platform in a costume workshop while a period costume for her own story is pinned at the waist, a long mirror beside her.",
     "의상 피팅",
     "basic",
     "",
     "Standing on a fitting platform in a costume workshop while a period costume for her own story is pinned at the waist, a long mirror beside her."
    ],
    [
     "ad_readthrough",
     "Reading her lines from a script at a long read-through table with a pencil and a glass of water.",
     "대본 리딩",
     "basic",
     "",
     "Reading her lines from a script at a long read-through table with a pencil and a glass of water."
    ],
    [
     "ad_waiting",
     "Waiting between takes on a film set in her period costume, a light jacket over her shoulders and a folding chair behind her.",
     "촬영 대기",
     "basic",
     "",
     "Waiting between takes on a film set in her period costume, a light jacket over her shoulders and a folding chair behind her."
    ],
    [
     "ad_rehearsal",
     "Rehearsing a scene under warm stage lights on a bare wooden stage marked with tape.",
     "무대 리허설",
     "popular",
     "",
     "Rehearsing a scene under warm stage lights on a bare wooden stage marked with tape."
    ],
    [
     "ad_makeup",
     "Sitting at a bulb-lit makeup mirror backstage while her hair is pinned up for the role.",
     "분장실",
     "popular",
     "",
     "Sitting at a bulb-lit makeup mirror backstage while her hair is pinned up for the role."
    ],
    [
     "ad_premiere",
     "Arriving at the adaptation's premiere on a red carpet in an evening gown, a soft crowd behind velvet ropes.",
     "시사회 레드카펫",
     "special",
     "",
     "Arriving at the adaptation's premiere on a red carpet in an evening gown, a soft crowd behind velvet ropes."
    ],
    [
     "__custom__",
     "직접 입력",
     "직접 입력",
     "basic"
    ]
   ],
   "literary_salon": [
    [
     "",
     "AUTO",
     "자동 — 이 갈래에 맞는 장면",
     "basic"
    ],
    [
     "ls_reading",
     "Standing at a small lectern in a cozy cafe, reading aloud from a slim book to a quiet audience.",
     "카페 낭독회",
     "basic",
     "",
     "Standing at a small lectern in a cozy cafe, reading aloud from a slim book to a quiet audience."
    ],
    [
     "ls_bookclub",
     "Leaning forward to make a point in a book-club discussion around a low table with teacups.",
     "북클럽 토론",
     "basic",
     "",
     "Leaning forward to make a point in a book-club discussion around a low table with teacups."
    ],
    [
     "ls_authortalk",
     "Listening from the front row of an author talk in a bookshop, a book resting on her lap.",
     "작가와의 대화",
     "basic",
     "",
     "Listening from the front row of an author talk in a bookshop, a book resting on her lap."
    ],
    [
     "ls_poetry",
     "Reciting a short poem from memory at a candlelit poetry night, one hand lifting with the rhythm.",
     "시 낭송의 밤",
     "popular",
     "",
     "Reciting a short poem from memory at a candlelit poetry night, one hand lifting with the rhythm."
    ],
    [
     "ls_garden",
     "Sharing a passage with a small reading circle on blankets in a summer garden.",
     "정원 독서 모임",
     "popular",
     "",
     "Sharing a passage with a small reading circle on blankets in a summer garden."
    ],
    [
     "ls_salon",
     "Pouring tea for guests in an elegant salon with bookshelves and a piano, mid-conversation.",
     "문학 살롱",
     "special",
     "",
     "Pouring tea for guests in an elegant salon with bookshelves and a piano, mid-conversation."
    ],
    [
     "__custom__",
     "직접 입력",
     "직접 입력",
     "basic"
    ]
   ],
   "retro_glamour": [
    [
     "",
     "AUTO",
     "자동 — 이 갈래에 맞는 장면",
     "basic"
    ],
    [
     "flapper_party",
     "1920s Flapper Party",
     "20년대 플래퍼 파티",
     "basic",
     "f",
     "a 1920s flapper fringe dress with a dropped waist and a beaded headband, mid-Charleston step at a speakeasy party"
    ],
    [
     "deco_lounge",
     "1920s Art Deco Lounge",
     "아르데코 라운지",
     "special",
     "f",
     "a 1920s bias-cut satin lounge gown, lighting a candle in an Art Deco hotel lounge"
    ],
    [
     "hollywood_bias",
     "1930s Hollywood Gown",
     "30년대 할리우드 가운",
     "popular",
     "f",
     "a 1930s Hollywood bias-cut satin gown with a cowl back, posing on the staircase of a vintage film set"
    ],
    [
     "swing_dress",
     "1940s Swing Dance",
     "40년대 스윙 댄스",
     "basic",
     "f",
     "a 1940s swing dress with a sweetheart neckline, mid-twirl at a swing dance hall"
    ],
    [
     "retro_highwaist",
     "1950s High-waist Bikini",
     "50년대 하이웨이스트 비키니",
     "basic",
     "f",
     "a 1950s pin-up bikini with a high-waisted bottom above the navel and a halter top"
    ],
    [
     "pinup_beachball",
     "1950s Boardwalk Pin-up",
     "50년대 해변 핀업",
     "popular",
     "f",
     "a 1950s high-waisted pin-up swimsuit, holding a striped beach ball on a sunny boardwalk"
    ],
    [
     "pinup_car",
     "1950s Convertible Pin-up",
     "클래식 카 핀업",
     "popular",
     "f",
     "a 1950s halter playsuit, leaning against the fender of a classic convertible"
    ],
    [
     "diner_counter",
     "1950s Diner Counter",
     "50년대 다이너",
     "basic",
     "f",
     "a 1950s wiggle skirt and a fitted cropped blouse, perched on a chrome diner stool with a milkshake"
    ],
    [
     "retro_pinup",
     "Retro Pin-up Lingerie",
     "레트로 핀업 란제리",
     "popular",
     "f",
     "a 1950s pin-up lingerie set with a structured bra and high-waisted bottoms"
    ],
    [
     "mod_mini",
     "1960s Mod Mini",
     "60년대 모드 미니",
     "basic",
     "f",
     "a 1960s mod shift mini dress with geometric colour blocks and go-go boots, dancing on a checkerboard floor"
    ],
    [
     "jetset_pool",
     "1960s Riviera Pool",
     "60년대 리비에라 수영장",
     "popular",
     "f",
     "a 1960s jet-set one-piece swimsuit with a matching headscarf and cat-eye sunglasses at a Riviera hotel pool"
    ],
    [
     "disco_halter",
     "1970s Disco Floor",
     "70년대 디스코",
     "popular",
     "f",
     "a 1970s lurex halter jumpsuit with flared legs, under a mirror ball on a lit disco floor"
    ],
    [
     "boho_crochet",
     "1970s Boho Festival",
     "70년대 보헤미안 페스티벌",
     "basic",
     "f",
     "a 1970s crochet halter top with low-rise flared jeans at a sunny festival field"
    ],
    [
     "roller_disco",
     "1970s Roller Disco",
     "롤러 디스코",
     "special",
     "f",
     "1970s satin hot pants and a tube top on roller skates, gliding through a roller disco"
    ],
    [
     "aerobics_80s",
     "1980s Aerobics Studio",
     "80년대 에어로빅",
     "popular",
     "f",
     "an 1980s high-cut aerobics leotard over shiny tights with leg warmers and a headband, mid-move in a mirrored studio"
    ],
    [
     "power_glam",
     "1980s Power Glam",
     "80년대 파워 글램",
     "special",
     "f",
     "an 1980s sequined mini dress with strong padded shoulders in a neon nightclub"
    ],
    [
     "nineties_slip",
     "1990s Minimal Slip",
     "90년대 미니멀 슬립",
     "basic",
     "f",
     "a 1990s minimal satin slip dress with thin straps under a small cropped cardigan, at a city loft party"
    ],
    [
     "y2k_lowrise",
     "Y2K Mall Fountain",
     "Y2K 쇼핑몰",
     "popular",
     "f",
     "a Y2K low-rise mini skirt, a butterfly halter top and platform sandals, posing with a flip phone at a mall fountain"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "basic"
    ]
   ],
   "subculture_fashion": [
    [
     "",
     "AUTO",
     "자동 — 이 갈래에 맞는 장면",
     "basic"
    ],
    [
     "goth_chapel",
     "Romantic Goth Chapel",
     "로맨틱 고스 예배당",
     "popular",
     "f",
     "romantic goth — a black velvet dress with a corset belt and lace sleeves, lighting candles in an old stone chapel"
    ],
    [
     "goth_cafe",
     "Goth Cafe",
     "고스 카페",
     "basic",
     "f",
     "trad goth — a black lace mini dress with platform boots and stacked silver rings, at a candlelit gothic cafe"
    ],
    [
     "punk_gig",
     "Punk Live House",
     "펑크 라이브 하우스",
     "popular",
     "f",
     "punk — a studded leather jacket over a ripped plain tee, a tartan mini skirt and combat boots, at the barrier of a small live house"
    ],
    [
     "punk_alley",
     "Punk Back Alley",
     "펑크 뒷골목",
     "basic",
     "f",
     "punk — tartan trousers with straps and safety pins and a cropped top with mesh sleeves over an opaque base, lacing her boots on a brick alley step"
    ],
    [
     "rock_backstage",
     "Rock Backstage",
     "록 백스테이지",
     "basic",
     "f",
     "rock — a leather mini skirt, a cropped vest and a choker, tuning a guitar backstage"
    ],
    [
     "gyaru_street",
     "Gyaru Street",
     "갸루 거리",
     "popular",
     "f",
     "gyaru — a bodycon mini dress, platform heels, long nail art and layered accessories, posing for a photo-booth picture in a busy shopping street"
    ],
    [
     "decora_harajuku",
     "Harajuku Decora",
     "하라주쿠 데코라",
     "special",
     "f",
     "decora — a pastel tutu skirt, layered bright tops and stacks of colourful clips and bracelets on a Harajuku side street"
    ],
    [
     "yami_kawaii",
     "Yami-kawaii Crepe Stand",
     "얌카와 크레페 가게",
     "special",
     "f",
     "yami-kawaii — a pink-and-black sailor-collar mini dress with heart chokers, at a crepe stand"
    ],
    [
     "cybergoth_rave",
     "Cybergoth Warehouse Rave",
     "사이버고스 레이브",
     "popular",
     "f",
     "cybergoth — neon goggles worn on the forehead, a reflective mini skirt, a cropped top and tall platform boots, at a UV-lit warehouse rave"
    ],
    [
     "grunge_records",
     "Grunge Record Store",
     "그런지 레코드 가게",
     "basic",
     "f",
     "grunge — an oversized plaid flannel shirt tied at the waist over a slip dress and combat boots, in a second-hand record store"
    ],
    [
     "emo_gig",
     "Emo Scene Gig",
     "이모 공연",
     "special",
     "f",
     "emo — a fitted striped long-sleeve top, a studded belt, skinny jeans and checkered sneakers at an all-ages gig"
    ],
    [
     "steampunk_fair",
     "Steampunk Fair",
     "스팀펑크 박람회",
     "popular",
     "f",
     "steampunk — a brocade underbust corset belt over a blouse, a short bustle skirt and brass goggles, at a steampunk fair"
    ],
    [
     "gothic_lolita",
     "Gothic Lolita Tea",
     "고딕 로리타 티 살롱",
     "special",
     "f",
     "gothic lolita — a black-and-white lace jumper skirt with a bonnet, at a rose-garden tea salon"
    ],
    [
     "skater_bowl",
     "Skater Bowl",
     "스케이트 보울",
     "basic",
     "f",
     "skater — a cropped hoodie, low-slung cargo shorts and high socks, dropping into a skate bowl"
    ],
    [
     "biker_cafe",
     "Biker Roadside Cafe",
     "바이커 카페",
     "popular",
     "f",
     "biker — a fitted leather riding jacket open over a bandeau top, leather trousers and boots, beside a motorcycle at a roadside cafe"
    ],
    [
     "raver_kandi",
     "Outdoor Rave",
     "야외 레이브",
     "basic",
     "f",
     "raver — a metallic halter crop top, a cargo mini skirt and beaded bracelets, under laser lights at an outdoor rave"
    ],
    [
     "visual_kei",
     "Visual Kei Live House",
     "비주얼계 라이브",
     "special",
     "f",
     "visual kei — a dramatic black-and-silver layered stage outfit with lace cuffs, under a spotlight at a live house"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "basic"
    ]
   ],
   "nightlife": [
    [
     "",
     "AUTO",
     "자동 — 이 갈래에 맞는 장면",
     "basic"
    ],
    [
     "club_floor",
     "Club Dance Floor",
     "클럽 댄스 플로어",
     "basic",
     "f",
     "dancing in a sequined bodycon mini dress on a crowded club floor under coloured lights"
    ],
    [
     "dj_booth",
     "Beside the DJ Booth",
     "DJ 부스 옆",
     "popular",
     "f",
     "leaning on the rail beside a DJ booth in a cut-out mini dress, one hand raised to the beat"
    ],
    [
     "neon_bar",
     "Neon Bar Counter",
     "네온 바 카운터",
     "basic",
     "f",
     "at a neon-lit bar counter in a backless satin top and a leather mini skirt, lifting a coloured drink"
    ],
    [
     "karaoke_room",
     "Karaoke Room",
     "노래방",
     "basic",
     "f",
     "singing into a microphone in a private karaoke room in an off-shoulder sequin top and shorts, coloured lights spinning"
    ],
    [
     "powder_mirror",
     "Club Powder-room Mirror",
     "클럽 파우더룸 거울",
     "special",
     "f",
     "touching up lipstick at a club powder-room mirror in a halter mini dress, neon light on the tiles"
    ],
    [
     "club_queue",
     "Club Queue",
     "클럽 앞 줄",
     "basic",
     "f",
     "waiting in the queue outside a club at night in a short faux-fur jacket over a slip mini dress"
    ],
    [
     "vip_booth",
     "Velvet VIP Booth",
     "VIP 벨벳 부스",
     "popular",
     "f",
     "lounging in a velvet VIP booth in a one-shoulder sequin dress, a bucket of ice beside her"
    ],
    [
     "night_taxi",
     "Taxi Home",
     "귀갓길 택시",
     "special",
     "f",
     "in the back seat of a taxi after a night out in a mini dress, city lights streaking across the window"
    ],
    [
     "rooftop_party",
     "Rooftop Party",
     "옥상 파티",
     "popular",
     "f",
     "at a city rooftop party in a backless mini dress, raising a glass under string lights"
    ],
    [
     "jazz_bar_stage",
     "Jazz Bar Piano",
     "재즈 바 피아노",
     "special",
     "f",
     "leaning on the grand piano of a dim jazz bar in a high-slit gown, a glass in hand"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "basic"
    ]
   ],
   "dance_stage": [
    [
     "",
     "AUTO",
     "자동 — 이 갈래에 맞는 장면",
     "basic"
    ],
    [
     "tango_solo",
     "Tango Practice",
     "탱고 연습",
     "popular",
     "f",
     "practising a solo tango ocho in a backless high-slit dance dress on a wooden milonga floor"
    ],
    [
     "salsa_spin",
     "Salsa Spin",
     "살사 회전",
     "basic",
     "f",
     "mid-spin in a fringed salsa dress at a social dance hall, the fringe flaring out"
    ],
    [
     "flamenco",
     "Flamenco",
     "플라멩코",
     "popular",
     "f",
     "a flamenco dress with a ruffled train and a fitted bodice, stamping a step with one arm raised on a tablao stage"
    ],
    [
     "belly_dance",
     "Belly Dance",
     "벨리댄스",
     "popular",
     "f",
     "a belly dance costume with a coin-trimmed bra top and a low-slung chiffon skirt, swirling a veil on a lamp-lit stage"
    ],
    [
     "jazz_kick",
     "Jazz Stage Kick",
     "재즈 무대 킥",
     "basic",
     "f",
     "a sequined jazz dance leotard with a short flared skirt, mid high-kick on a lit stage"
    ],
    [
     "dance_mirror",
     "Studio Mirror Practice",
     "연습실 거울",
     "basic",
     "f",
     "a cropped dance top and high-waisted shorts, checking a pose in the mirror of a dance studio"
    ],
    [
     "hula",
     "Hula",
     "훌라",
     "special",
     "f",
     "a hula costume with a flower lei, a bandeau top and a grass-style skirt over shorts, swaying on a beach stage at sunset"
    ],
    [
     "kpop_practice",
     "K-pop Choreography",
     "K팝 안무 연습",
     "popular",
     "f",
     "a cropped jersey top and cargo mini skirt, hitting a sharp choreography pose in a practice room"
    ],
    [
     "ballroom_waltz",
     "Ballroom Gown",
     "볼룸 가운",
     "special",
     "f",
     "a flowing ballroom gown with a fitted bodice, turning a solo waltz step across a chandelier ballroom"
    ],
    [
     "mermaid_show",
     "Mermaid Show Costume",
     "인어 쇼 의상",
     "special",
     "f",
     "a mermaid show costume — a scale-sequined bodice and a flowing chiffon wrap skirt; posing by the glass of an aquarium stage"
    ],
    [
     "ballet_stage",
     "Ballet Stage Costume",
     "발레 무대 의상",
     "special",
     "f",
     "a ballet stage costume — a fitted bodice, a short stiff tutu and satin pointe shoes; stretching at the rehearsal barre"
    ],
    [
     "cabaret_showgirl",
     "Cabaret Showgirl Costume",
     "카바레 쇼걸 코스튬",
     "popular",
     "f",
     "a cabaret showgirl costume — a sparkling structured bodice, a feathered headpiece and a large feather fan; descending a backstage stair before the show"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "basic"
    ]
   ],
   "spa_wellness": [
    [
     "",
     "AUTO",
     "자동 — 이 갈래에 맞는 장면",
     "basic"
    ],
    [
     "rotenburo_edge",
     "Open-air Bath Edge",
     "노천탕 가장자리",
     "popular",
     "f",
     "sitting on the stone edge of an open-air hot spring in a swimsuit, feet in the steaming water, snow on the rocks"
    ],
    [
     "hinoki_bath",
     "Cedar Tub",
     "히노키 탕",
     "special",
     "f",
     "in a swimsuit in a cedar-wood tub by a window of a mountain inn, arms resting on the rim"
    ],
    [
     "jjimjilbang",
     "Korean Bathhouse Lounge",
     "찜질방",
     "basic",
     "f",
     "in matching bathhouse loungewear with a towel folded into a small sheep-ear headband, sipping a sweet rice drink on a heated floor"
    ],
    [
     "spa_robe_lounge",
     "Spa Robe Lounge",
     "가운 라운지",
     "basic",
     "f",
     "in a plush spa robe over a swimsuit, pouring herbal tea in a quiet spa lounge"
    ],
    [
     "hammam",
     "Hammam",
     "하맘",
     "special",
     "f",
     "wrapped in a striped cotton peshtemal on the warm marble slab of a domed hammam, a brass bowl beside her"
    ],
    [
     "mud_mask",
     "Spa Facial",
     "스파 팩",
     "special",
     "f",
     "in a spa robe with a clay mask on her face, resting with cucumber slices in hand in a treatment room"
    ],
    [
     "spa_pool",
     "Spa Pool",
     "스파 풀",
     "popular",
     "f",
     "in a swimsuit at the edge of a steaming thermal spa pool at dusk, elbows on the tiled edge"
    ],
    [
     "cold_plunge",
     "Cold Plunge",
     "냉탕",
     "basic",
     "f",
     "in a sporty swimsuit stepping down into a cold plunge tub after the sauna, breath sharp"
    ],
    [
     "sauna_lounge",
     "Sauna Lounge",
     "사우나 라운지",
     "special",
     "f",
     "wrapped in a large towel in a sauna lounge, sipping cold water between rounds"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "basic"
    ]
   ],
   "fantasy_costume": [
    [
     "",
     "AUTO",
     "자동 — 이 갈래에 맞는 장면",
     "basic"
    ],
    [
     "elf_costume",
     "Elf Costume",
     "엘프 코스튬",
     "popular",
     "f",
     "an elf costume — a leaf-trimmed short dress, a hooded half-cape and pointed ear tips, raising a lantern at a forest-themed costume party"
    ],
    [
     "fairy_wings",
     "Fairy Costume",
     "요정 코스튬",
     "popular",
     "f",
     "a fairy costume — a petal-layered mini dress with glittering wing props, sprinkling glitter in a flower photo studio"
    ],
    [
     "angel_devil",
     "Angel & Devil Party",
     "천사·악마 파티",
     "basic",
     "f",
     "an angel-and-devil party costume — a red satin mini dress with a small horn headband and a tail prop, one white feathered wing prop over her shoulder, at a Halloween party"
    ],
    [
     "sorceress_robe",
     "Sorceress Costume",
     "마법사 코스튬",
     "basic",
     "f",
     "a sorceress costume — an off-shoulder velvet robe gown with a jeweled belt and a crystal staff prop, posing at a fantasy photoshoot"
    ],
    [
     "cosplay_photozone",
     "Cosplay Photo Zone",
     "코스프레 포토존",
     "basic",
     "f",
     "in an original fantasy costume with a short cape, striking a pose at a convention photo zone under ring lights"
    ],
    [
     "forest_spirit",
     "Forest Spirit",
     "숲의 정령",
     "special",
     "f",
     "a forest spirit costume — a moss-green draped gown with a flower crown and trailing ivy, in a misty garden shoot"
    ],
    [
     "star_goddess",
     "Star Goddess",
     "별의 여신",
     "special",
     "f",
     "a star goddess costume — a midnight-blue gown scattered with crystal stars and a crescent headpiece, on a starry studio set"
    ],
    [
     "fae_ball",
     "Fae Masquerade Ball",
     "요정 가면무도회",
     "popular",
     "f",
     "a fae ball costume — a backless gown with a wing-shaped satin cape and a leaf mask, at a fantasy masquerade"
    ],
    [
     "moon_priestess",
     "Moon Priestess",
     "달의 무녀",
     "special",
     "f",
     "a moon priestess costume — a white draped one-shoulder gown with silver bangles and a moonstone circlet, at a lantern-lit costume festival"
    ],
    [
     "vampire_gala",
     "Vampire Countess Costume",
     "뱀파이어 백작 부인 코스튬",
     "special",
     "f",
     "a vampire countess costume — a high-collared velvet cape over a fitted gown with a cinched waist; raising a glass of red juice in a candlelit masquerade hall"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "basic"
    ]
   ],
   "bridal": [
    [
     "",
     "AUTO",
     "자동 — 이 갈래에 맞는 장면",
     "basic"
    ],
    [
     "gown_fitting",
     "Gown Fitting",
     "드레스 가봉",
     "basic",
     "f",
     "standing on a fitting platform in an open-back wedding gown while the bodice is pinned, a long mirror beside her"
    ],
    [
     "before_ceremony",
     "Before the Ceremony",
     "예식 전 대기",
     "basic",
     "f",
     "in a sweetheart-neckline wedding gown and veil, holding her bouquet by a sunlit window of the bridal room"
    ],
    [
     "garden_aisle",
     "Garden Aisle",
     "정원 버진로드",
     "popular",
     "f",
     "walking alone down a garden aisle under a flower arch in a flowing gown, the train trailing on the petals"
    ],
    [
     "self_wedding_shoot",
     "Solo Wedding Shoot",
     "셀프 웨딩 촬영",
     "popular",
     "f",
     "a solo bridal photoshoot on a windy sea cliff in a slit wedding gown, the veil lifting in the wind"
    ],
    [
     "veil_wind",
     "Beach Veil",
     "해변 베일",
     "special",
     "f",
     "in a simple slip wedding dress on a beach at sunset, holding a long veil as the wind pulls it out"
    ],
    [
     "reception_gown",
     "Reception Dress",
     "피로연 드레스",
     "basic",
     "f",
     "at the wedding reception in a backless reception gown, mid-turn on the dance floor"
    ],
    [
     "second_dress",
     "After-party Mini",
     "2부 미니드레스",
     "popular",
     "f",
     "in a short beaded after-party wedding dress, laughing as she kicks off her heels at the reception"
    ],
    [
     "bridal_shower",
     "Bridal Shower",
     "브라이덜 샤워",
     "special",
     "f",
     "in a white off-shoulder mini dress and a sash, opening a gift box at a bridal shower table"
    ],
    [
     "honeymoon_suite",
     "Honeymoon Suite",
     "신혼여행 스위트",
     "popular",
     "f",
     "on the balcony of a honeymoon suite in a silk slip dress, a breeze off the sea, a glass in hand"
    ],
    [
     "bridal_lace",
     "Bridal Lace Lingerie",
     "브라이덜 레이스",
     "popular",
     "f",
     "a white lace bridal lingerie set with a short veil, in a dressing room before the ceremony"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "basic"
    ]
   ],
   "gala_red_carpet": [
    [
     "",
     "AUTO",
     "자동 — 이 갈래에 맞는 장면",
     "basic"
    ],
    [
     "red_carpet",
     "Red Carpet Arrival",
     "레드카펫 입장",
     "basic",
     "f",
     "arriving on a red carpet in a high-slit evening gown, turning toward the flashes"
    ],
    [
     "photo_wall",
     "Photo Wall",
     "포토월",
     "basic",
     "f",
     "posing at a plain step-and-repeat wall in a one-shoulder sequined gown, one hand on her hip"
    ],
    [
     "festival_steps",
     "Film Festival Steps",
     "영화제 계단",
     "popular",
     "f",
     "climbing a grand red-carpeted staircase at a film festival in a gown with a long train"
    ],
    [
     "award_ceremony",
     "Award Ceremony",
     "시상식",
     "popular",
     "f",
     "walking to the stage at an award ceremony in a plunging velvet gown, a plain golden statuette in hand"
    ],
    [
     "gala_dinner",
     "Gala Dinner",
     "갈라 디너",
     "basic",
     "f",
     "seated at a candlelit gala dinner table in an open-back silk gown, raising a champagne glass"
    ],
    [
     "charity_auction",
     "Charity Auction",
     "자선 경매",
     "special",
     "f",
     "raising a bidding paddle at a charity auction in a strapless satin gown and long gloves"
    ],
    [
     "front_row",
     "Fashion Week Front Row",
     "패션위크 앞줄",
     "popular",
     "f",
     "seated in the front row of a fashion week show in a sculptural mini dress, legs crossed, runway lights ahead"
    ],
    [
     "museum_gala",
     "Museum Gala",
     "박물관 갈라",
     "special",
     "f",
     "at a gala in a grand museum hall in a backless column gown, a marble statue behind her"
    ],
    [
     "afterparty_stairs",
     "Gala After-party Stairs",
     "갈라 뒤 계단",
     "special",
     "f",
     "sitting on a grand staircase after the gala in a satin gown, heels in one hand, the train pooled around her"
    ],
    [
     "__custom__",
     "CUSTOM",
     "직접 입력",
     "basic"
    ]
   ]
  };
  const EX_NOTE = {
   "classic_bikini": "상하의가 나뉜 가장 기본적인 비키니.",
   "sport_onepiece": "경영복에 가까운 스포티한 원피스 수영복.",
   "highleg_onepiece": "다리 라인이 골반 위까지 파인 원피스.",
   "monokini": "원피스인데 옆구리나 배 쪽이 크게 뚫린 형태. 조각이 이어져 있어 비키니는 아니다.",
   "triangle_bikini": "상의 컵이 삼각형이고 목 뒤로 끈을 묶는 형태.",
   "bandeau_bikini": "어깨끈 없이 가슴을 가로로 감싸는 튜브형 상의.",
   "halter_bikini": "목 뒤로 끈을 걸어 어깨선을 드러내는 상의.",
   "asymmetric_swim": "한쪽 어깨만 덮는 비대칭 구조.",
   "crossstrap_swim": "등이나 가슴 앞에서 끈이 교차하는 구조.",
   "boyshort_swim": "하의가 짧은 반바지 형태라 엉덩이를 더 덮는다.",
   "rashguard_set": "긴팔 또는 반팔 상의로 팔까지 덮는 서핑용 세트.",
   "wrap_swim": "앞자락을 겹쳐 여미는 랩 구조의 수영복.",
   "swim_coverup": "수영복 위에 얇은 셔츠나 사롱을 걸친 상태.",
   "lace_set": "레이스 소재의 브라와 하의 세트.",
   "satin_set": "광택 있는 새틴 소재 세트.",
   "bralette_highwaist": "와이어 없는 브라렛에 배꼽 위까지 오는 하의를 맞춘 조합.",
   "bustier_inspired": "가슴부터 허리까지 이어진 상의. 코르셋보다 짧고 조임이 약하다.",
   "bodysuit": "상하의가 하나로 붙은 원피스형 란제리.",
   "garter_set": "허벅지에 두르는 밴드로 스타킹을 고정하는 구성.",
   "corset_lingerie": "허리를 조여 실루엣을 만드는 뻣뻣한 구조물. 뷔스티에보다 길고 단단하다.",
   "open_shirt_lingerie": "란제리 위에 셔츠를 걸치고 단추를 잠그지 않은 상태.",
   "night_robe": "란제리 위에 얇은 가운을 덧입은 구성.",
   "back_strap": "등 쪽 끈 배치가 장식이 되는 디자인.",
   "asymmetric_lingerie": "좌우 구조가 다른 비대칭 세트.",
   "slip_lingerie": "어깨끈이 가는 민소매 원피스형. 잠옷과 속옷의 중간.",
   "babydoll": "가슴 아래부터 퍼지는 짧고 하늘하늘한 형태.",
   "longline_bra": "브라 밑단이 갈비뼈 아래까지 내려오는 긴 형태.",
   "soft_tank_shorts": "민소매 상의에 짧은 하의를 맞춘 가장 기본적인 실내복.",
   "satin_lounge": "광택 있는 상하의 세트. 파자마보다 격이 있다.",
   "offshoulder_knit": "어깨가 흘러내리는 니트 상의.",
   "camisole_wrap": "가는 끈 상의에 감아 입는 하의를 맞춘 조합.",
   "bralette_cardigan": "브라렛 위에 가디건을 걸치고 여미지 않은 상태.",
   "one_shoulder_lounge": "한쪽 어깨만 덮는 실내복 세트.",
   "backless_lounge": "등이 크게 트인 실내복.",
   "oversized_shirt": "몸보다 큰 셔츠 한 장을 원피스처럼 입은 차림.",
   "hoodie_shorts": "배가 드러나는 짧은 후디에 쇼츠를 맞춘 조합.",
   "knit_dress_home": "몸에 붙는 부드러운 니트 원피스.",
   "robe_morning": "아침에 가운만 걸친 상태.",
   "slip_dress": "어깨끈이 가늘고 몸을 따라 흐르는 원피스.",
   "cocktail_mini": "무릎 위로 짧은 정장풍 드레스.",
   "one_shoulder_satin": "한쪽 어깨만 덮는 새틴 드레스.",
   "low_back_evening": "앞은 단정하고 등이 크게 파인 드레스.",
   "velvet_evening": "벨벳 특유의 묵직한 광택이 나는 드레스.",
   "halter_evening": "목 뒤로 끈을 걸어 어깨와 등을 드러내는 드레스.",
   "high_slit_gown": "긴 드레스에 다리까지 트임이 들어간 형태.",
   "event_staff": "행사 진행요원풍 의상. 실제 유니폼이 아니라 이벤트용 해석.",
   "uniform_inspired": "제복의 요소만 빌린 스타일. 특정 기관을 특정할 수 없게 한다.",
   "bunny": "몸에 붙는 원피스형에 토끼 귀와 커프스를 더한 고전적 코스튬.",
   "casino_dealer": "조끼·나비넥타이·소매 밴드 같은 딜러 요소를 쓴 스타일.",
   "lab_roleplay": "가운과 실험 도구를 소품으로 쓰는 연구실 역할극.",
   "retro_racer": "70~80년대 레이싱 이벤트풍 의상.",
   "vinyl_stage": "광택 있는 비닐 소재의 무대 의상.",
   "masquerade": "가면무도회풍. 가면과 장식이 중심.",
   "circus_ringmaster": "긴 재킷과 실크햇을 쓴 서커스 단장풍.",
   "aerodynamic_couture": "공기 흐름을 형상화한 겹겹의 재단.",
   "metallic_asymmetry": "금속 광택 원단으로 좌우를 다르게 재단한 옷.",
   "ceremonial_whitegold": "흰색과 금색을 쓴 의전복풍.",
   "deconstructed_frame": "책 설계표 내부 프레임 선을 옷의 절개선으로 옮긴 형태.",
   "floating_panel": "책 설계표 판넬처럼 몸에서 살짝 떠 있는 조각들.",
   "luminous_circuit": "회로 형태의 발광 라인이 들어간 옷.",
   "wing_light": "날개나 바인더를 빛나는 레이어로 번역한 형태.",
   "heavy_architecture": "건축물처럼 구조가 무겁고 각진 재단.",
   "stealth_monochrome": "무광 검정 계열 단색으로 통일한 스타일.",
   "transformation_drape": "변형기구를 접히고 펼쳐지는 드레이프로 옮긴 형태.",
   "orbital_ring": "책 설계표의 링·헤일로 구조를 장신구나 실루엣으로 옮긴 형태.",
   "thruster_flare": "스러스터 분사를 밑단이 퍼지는 형태로 번역.",
   "cockpit_harness": "조종석 하네스를 벨트 장식으로 옮긴 재단.",
   "pilates": "매트나 기구 위에서 코어를 쓰는 동작.",
   "basketball_jersey": "몸보다 큰 농구 유니폼을 헐렁하게 입은 차림.",
   "parkour_stairs": "계단이나 난간을 넘는 순간의 동작.",
   "aerial_silk": "천에 매달려 자세를 잡는 공중 동작.",
   "archery_draw": "활시위를 당겨 정지한 순간.",
   "auto_traditional": "계통 설정을 보고 어울리는 전통 의상을 알아서 고른다.",
   "hanbok_formal": "한국 한복. 저고리와 치마의 비율, 고름 매듭, 배래선을 지킨 정장형.",
   "hanbok_daily": "한국 한복의 구조만 남기고 길이와 소재를 현대화한 생활한복.",
   "kimono_formal": "일본 기모노. 오비를 갖춘 정식 형태로, 옷깃 여밈 방향까지 지킨다.",
   "yukata_daily": "일본의 여름용 홑겹 기모노. 축제·저녁 산책에 어울린다.",
   "hanfu_formal": "중국 한푸. 교령·유군 같은 특유의 여밈과 층 구성.",
   "qipao_daily": "중국 치파오(청삼). 입식 칼라와 옆트임을 살린 현대적 형태.",
   "aodai_daily": "긴 상의에 통 넓은 바지를 받쳐 입는 베트남 전통복.",
   "sari_formal": "인도 사리. 한 장의 천을 감아 두르는 방식과 어깨 드레이프가 핵심.",
   "lehenga_formal": "인도 레헹가. 긴 치마 + 짧은 상의 + 두파타 세 겹 구성.",
   "salwar_daily": "인도·파키스탄 지역의 살와르 카미즈. 통 넓은 바지에 긴 튜닉을 걸친 일상 차림.",
   "abaya_modern": "아라비아반도의 아바야. 몸을 감싸는 긴 겉옷을 현대적으로 재단한 형태.",
   "kaftan_daily": "북아프리카·중동 지역의 카프탄. 품이 넉넉하고 소매가 넓은 원피스형 겉옷.",
   "thobe_inspired": "아라비아반도 토브의 직선 재단과 자수를 응용한 드레스.",
   "dirndl_modern": "독일·오스트리아의 디른들. 보디스 + 앞치마 구조를 현대적으로 다듬은 형태.",
   "folk_embroidery": "동유럽 민속 자수를 살린 블라우스.",
   "kente_modern": "가나 켄테 직조 무늬를 현대 드레스에 옮긴 형태.",
   "boubou_flow": "서아프리카의 넓고 길게 흐르는 겉옷.",
   "huipil_modern": "중미의 사각 재단 상의와 자수 문양.",
   "poncho_andes": "안데스 직조 천을 겹쳐 두른 레이어.",
   "kilt_inspired": "스코틀랜드 킬트의 타탄 주름과 여밈 구조를 응용한 스커트.",
   "kebaya_daily": "인도네시아 크바야. 몸에 붙는 자수 상의 + 사롱 조합.",
   "barong_inspired": "비치는 원단에 자수를 넣은 필리핀풍 상의.",
   "caftan_evening": "전통 겉옷을 이브닝 룩으로 겹쳐 입은 구성.",
   "heritage_couture": "전통 의상의 구조·여밈을 책 설계표 색으로 옮긴 쿠튀르.",
   "hanbok_errand": "생활한복 차림으로 장을 보거나 나들이하는 장면.",
   "heritage_evening": "전통 정장을 갖춰 입고 나선 저녁 자리.",
   "burkini_modest": "머리부터 발목까지 덮는 모디스트 수영복. 노출 없이 물놀이 상황을 만든다.",
   "sarong_wrap": "수영복 위에 전통 사롱 천을 허리에 둘러 묶은 차림.",
   "yukata_poolside": "수영복 위에 유카타를 걸친 온천·여름 축제 분위기.",
   "heritage_pattern_swim": "켄테·이카트·자수 같은 전통 문양을 현대 수영복에 옮긴 형태.",
   "onsen_after": "온천에서 나온 직후. 수건과 유카타, 젖은 머리.",
   "hanbok_coverup": "저고리 깃과 고름 선을 응용한 비치 커버업.",
   "juban_inspired": "기모노 속옷인 나가주반의 여밈과 실루엣을 응용한 실크 레이어.",
   "hanbok_slip": "속적삼과 속치마의 층 구성을 현대 란제리로 옮긴 세트.",
   "qipao_silk_set": "입식 칼라와 매듭 단추를 살린 실크 상하 세트.",
   "embroidered_corset": "동유럽 민속 자수를 얹은 코르셋.",
   "kebaya_lace": "크바야 특유의 몸에 붙는 자수 레이스 상의를 응용.",
   "sari_blouse_set": "사리의 짧은 블라우스와 페티코트 구성을 응용한 세트.",
   "travel_trail": "갈림길에서 지도와 이정표를 번갈아 살펴요.",
   "travel_station": "역 벤치에서 짐과 간식을 챙기며 열차를 기다려요.",
   "travel_camp": "텐트 옆에서 담요나 취사 도구를 정리해요.",
   "travel_lakeside": "물가의 돌에 앉아 물병을 들고 잠깐 쉬어요.",
   "travel_lookout": "난간 옆에서 쌍안경으로 멀리 펼쳐진 지형을 살펴요.",
   "travel_coast": "해변에서 조개와 발자국을 관찰하며 기록해요.",
   "fest_lantern": "등불 사이를 걸으며 작은 축제 간식을 들어요.",
   "fest_ribbon": "작은 소품 테이블에서 색과 소재가 다른 리본을 비교해요.",
   "fest_cheering": "대회장 관중석에서 박수치며 경기를 응원해요.",
   "fest_booth": "가판대의 작은 공예품을 살펴보고 하나를 집어 들어요.",
   "fest_rehearsal": "무대 뒤에서 소품을 들고 차분히 동작을 맞춰요.",
   "fest_fireworks": "강변에 앉아 음료를 들고 저녁 하늘을 바라봐요.",
   "hobby_reading": "편한 의자에서 도감의 그림을 보며 페이지를 넘겨요.",
   "hobby_sketch": "공원 벤치에서 나무와 분수를 그려요.",
   "hobby_craft": "작업 테이블에서 작은 비즈와 끈으로 장식을 만들어요.",
   "hobby_music": "방 안에서 작은 악기를 연주하며 리듬을 맞춰요.",
   "hobby_photo": "테이블 위의 카메라와 사진을 보며 여행 기록을 정리해요.",
   "hobby_gardening": "실내 화분에 물을 주고 잎을 손질해요.",
   "seasonal_night": "계절이 드러나는 옷차림으로 저녁 거리를 걷거나 쉬어요.",
   "travel_cut": "숙소나 여행지에서 짐을 정리하고 잠깐 쉬는 장면이에요.",
   "festival_night": "밤 축제에서 간식을 들거나 부스를 구경해요.",
   "unexpected_contrast": "평소 의외의 장소와 소품을 조합하되 한 가지 생활 동작을 중심으로 해요.",
   "retro_future": "복고풍 생활용품과 미래적인 공간을 섞어 일상을 그려요.",
   "rainy_city": "비 젖은 도시에서 우산을 접거나 처마 아래 잠깐 멈춰요.",
   "weekend_market": "주말 시장의 가판대에서 물건을 고르고 장바구니에 담아요.",
   "late_studio": "늦은 시간 작업실에서 도구를 정리하거나 작품을 살펴요.",
   "rooftop_wind": "바람 부는 옥상에서 옷자락이나 머리카락을 정리해요.",
   "seaside_offseason": "한산한 바닷가를 걷거나 벤치에서 바다를 바라봐요.",
   "neon_alley": "간판 불빛이 비치는 골목에서 길을 찾거나 음료를 들어요.",
   "snow_evening": "눈 내리는 저녁에 목도리를 고쳐 매거나 따뜻한 컵을 들어요.",
   "adult_police": "경찰복의 재단을 차용한 이벤트 의상을 입고 소품을 정리해요.",
   "adult_nurse": "간호복에서 따온 이벤트 의상의 단추와 액세서리를 손질해요.",
   "adult_maid": "메이드풍 앞치마와 장식이 있는 이벤트 의상으로 준비 동작을 해요.",
   "adult_secretary": "셔츠와 재킷을 조합한 비서풍 이벤트 의상을 정돈해요.",
   "flight_attendant": "승무원풍 스카프와 재킷을 갖춘 이벤트 스타일이에요.",
   "ceremonial_instructor": "장식 재킷과 단정한 소품을 갖춘 행사 진행자풍 의상이에요.",
   "adult_teacher": "셔츠·카디건·책을 조합한 교사풍 이벤트 스타일이에요.",
   "adult_librarian": "책과 안경을 소품으로 사용하는 사서풍 이벤트 스타일이에요.",
   "cheer_costume": "움직임에 맞는 치어 의상과 응원 소품을 준비해요.",
   "cabin_crew_retro": "복고풍 모자와 스카프로 객실승무원 스타일을 표현해요.",
   "moonlit_pool": "달빛이 비치는 야외 수영장 가장자리에서 쉬어요.",
   "rooftop_infinity_pool": "옥상 수영장에서 도시 풍경과 수면이 함께 보여요.",
   "outdoor_shower": "수영복을 착용한 채 수영 후 물기를 씻어내요.",
   "cabana_daybed": "카바나 그늘에서 타월과 음료를 두고 쉬어요.",
   "thermal_spa": "수영복 차림으로 온천형 스파 풀에서 휴식해요.",
   "shoreline_walk": "얕은 물이 밀려오는 해변을 천천히 걸어요.",
   "poolside_bar": "수영장 옆 바에서 음료를 받거나 잠깐 쉬어요.",
   "river_dock": "강이나 호수의 데크에서 수영을 준비해요.",
   "warmup": "운동 전후에 팔과 다리를 가볍게 풀어요.",
   "stretch": "관절의 움직임이 읽히도록 몸을 천천히 늘여요.",
   "dance_transition": "춤 연습 중 무게중심을 옮기는 순간을 보여줘요.",
   "tennis_active": "라켓을 들고 공을 받기 전의 준비 동작을 해요.",
   "boxing_fitness": "운동용 글러브를 착용하고 기본 스텝이나 가드를 연습해요.",
   "running_recovery": "달리기를 마친 뒤 호흡을 고르거나 물을 마셔요.",
   "light_jog": "공원 길을 가볍게 뛰어요. 러닝웨어 차림.",
   "roller_skating": "롤러스케이트로 균형을 잡으며 천천히 이동해요.",
   "fencing_motion": "펜싱복의 움직임과 발의 스텝을 중심으로 표현해요.",
   "climbing_warmup": "실내 암벽 앞에서 손을 풀고 장비를 점검해요.",
   "surf_prep": "물가에서 보드를 챙기고 서핑 장비를 정돈해요.",
   "yoga_flow": "매트 위에서 자연스러운 요가 동작을 이어가요.",
   "cycling_kit": "사이클링 복장으로 자전거와 헬멧을 점검해요.",
   "track_sprint": "트랙에서 출발을 준비하며 낮게 중심을 잡아요.",
   "couture_gala": "책의 색과 상징을 반영한 정교한 드레스로 행사를 준비해요.",
   "runway": "의상의 실루엣과 재단이 잘 드러나는 런웨이 걸음이에요.",
   "cyber_street": "책의 상징을 미래적인 스트리트 의상에 옮겨요.",
   "camo_couture": "몸의 무늬를 위장무늬 같은 패션 패턴으로 재해석해요.",
   "ceramic_plate": "매끈한 장식 소재를 겹쳐 의복의 구조를 강조해요.",
   "after_bath": "목욕 후 홈웨어를 입고 타월이나 머리카락을 정리해요.",
   "window_vanity": "창가 화장대에서 빗이나 액세서리를 사용해요.",
   "late_night_kitchen": "홈웨어 차림으로 늦은 밤 음료나 간식을 준비해요.",
   "laundry_lounge": "집에서 세탁물이나 침구를 접고 정리해요.",
   "sunroom_lounge": "햇빛이 드는 실내에서 책이나 음료와 함께 쉬어요.",
   "floor_cushion": "바닥 쿠션에 편하게 기대어 휴식해요.",
   "home_workout": "집의 작은 운동 공간에서 몸을 가볍게 풀어요.",
   "after_party": "행사가 끝난 뒤 겉옷이나 액세서리를 정리해요.",
   "hotel_evening": "호텔 방에서 저녁 외출을 준비하거나 짐을 풀어요.",
   "balcony_night": "밤의 발코니에서 음료를 들고 바깥을 바라봐요.",
   "mirror_touchup": "거울 앞에서 립 메이크업이나 머리 모양을 다듬어요.",
   "opera_night": "극장에 갈 차림으로 코트와 작은 가방을 챙겨요.",
   "penthouse_window": "큰 창가에서 도시 야경을 보며 잠깐 쉬어요.",
   "silk_robe_evening": "이브닝 의상 위에 실크 로브를 걸치고 옷매무새를 정리해요.",
   "wine_bar": "와인바의 구석 자리에서 잔과 메뉴를 살펴요.",
   "night_drive": "차의 조수석에서 밤 풍경을 바라보는 장면이에요.",
   "tea_ceremony_night": "저녁의 조용한 공간에서 찻잔과 다구를 정돈해요.",
   "knit_lingerie": "니트 질감이 드러나는 란제리풍 의상을 불투명한 소재로 표현해요.",
   "morning_lingerie": "아침 빛 속에서 란제리풍 의상의 겹침과 소재를 보여줘요.",
   "commute_train": "대중교통에서 손잡이를 잡거나 가방을 챙기며 이동해요.",
   "grocery_run": "가게에서 식재료를 고르고 장바구니에 담아요.",
   "simple_cooking": "주방에서 재료를 썰거나 간단한 음식을 만들어요.",
   "cafe_takeout": "카페에서 테이크아웃 컵을 받거나 뚜껑을 정리해요.",
   "laundry": "세탁물을 꺼내거나 테이블 위에서 접어요.",
   "rain_walk": "우산을 들고 비 오는 길을 천천히 걸어요.",
   "station_wait": "역에서 가방과 시간을 확인하며 교통편을 기다려요.",
   "bookstore": "서가 앞에서 책 한 권을 꺼내 살펴봐요.",
   "parcel_pickup": "편의점이나 수령대에서 작은 택배 상자를 받아요.",
   "midnight_laundromat": "늦은 시간 세탁실에서 빨래 바구니와 세제를 정리해요.",
   "greenhouse": "온실이나 식물가게에서 잎을 살피고 화분을 고르세요.",
   "pottery_class": "공방에서 흙을 빚거나 도구로 작은 작품을 다듬어요.",
   "record_store": "음반 가게에서 재킷을 넘겨 보며 음반을 골라요.",
   "hardware_store": "생활 수리에 필요한 작은 공구나 재료를 살펴요.",
   "festival_daily": "지역 축제에 편한 옷차림으로 나가 먹거리와 가판대를 구경해요.",
   "morning_stretch": "아침에 편한 실내복으로 팔과 어깨를 가볍게 늘여요.",
   "window_light": "창가에서 책이나 음료를 들고 자연스럽게 쉬어요.",
   "late_snack": "늦은 밤 주방에서 간식이나 음료를 꺼내요.",
   "high_shelf": "높은 선반의 물건을 꺼내려고 팔을 위로 뻗어요.",
   "hair_tie": "편한 옷을 입고 양손으로 젖은 머리를 묶어요.",
   "laundry_soft": "부드러운 생활복 차림으로 빨래를 접거나 건조대에 걸어요.",
   "sunroom_relax": "햇빛이 드는 방에서 몸을 기대고 잠깐 쉬어요.",
   "balcony_plants": "발코니의 화분에 물을 주고 잎을 살펴요.",
   "rainy_return": "집에 들어와 젖은 겉옷과 우산을 정리해요.",
   "floor_organizing": "바닥에 앉아 옷이나 수납함을 차례로 정리해요.",
   "after_work_change": "퇴근 후 재킷을 벗어 옷걸이에 걸고 가방을 내려놓아요.",
   "fridge_light": "냉장고를 열고 늦은 밤 먹을 음료나 간식을 골라요.",
   "shoe_bench": "현관 벤치에 앉아 신발 끈이나 버클을 정리해요.",
   "mirror_selfie": "전신거울 앞에서 옷매무새를 살피거나 휴대폰을 들어요.",
   "window_rain": "실내 창가에서 빗방울을 바라보며 쉬어요.",
   "stair_landing": "계단참에서 걸음을 멈추고 가방이나 머리카락을 정리해요.",
   "rain_editorial": "비와 우산을 활용해 의상의 재단과 움직임을 보여줘요.",
   "arcade_night": "밤의 오락실에서 게임을 하거나 작은 경품을 살펴요.",
   "ferry_deck": "배의 갑판에서 난간 곁에 서서 바람을 맞아요.",
   "retro_motel": "복고풍 숙소에서 여행 가방과 옷을 정리해요.",
   "desert_resort": "건조한 풍경의 리조트에서 그늘을 찾아 쉬어요.",
   "futuristic_spa": "미래적인 휴식 공간에서 가운이나 타월을 정돈해요.",
   "observatory_night": "야간 천문대에서 망원경과 별자리를 살펴요.",
   "greenhouse_afterdark": "밤의 온실에서 식물을 관찰하거나 물을 줘요.",
   "rooftop_cinema": "옥상 상영회에서 담요와 간식을 챙기며 영화를 기다려요.",
   "winter_lodge": "겨울 산장에서 겉옷을 정리하고 따뜻한 음료를 들어요.",
   "art_studio": "작업이 끝난 공방에서 도구와 작품을 정돈해요.",
   "lib_shelving": "반납된 책을 높은 서가에 다시 꽂아요.",
   "lib_binding": "밀랍 실과 송곳으로 책을 엮어요.",
   "lib_restoring": "돋보기 등 아래에서 찢긴 장을 기워요.",
   "lib_bookshop": "헌책방 앞 수레에 책을 늘어놓아요.",
   "lib_press": "손 인쇄기에 잉크를 바르고 활자를 고르는 장면이에요.",
   "lib_reading_room": "저녁 열람실의 등을 하나씩 꺼요.",
   "lib_archive": "높은 철제 서가에서 보관 상자를 꺼내요.",
   "lib_catalog": "나무 카드 목록함을 손가락으로 넘겨요.",
   "sp_overlook": "이야기의 배경이 내려다보이는 전망대에 서요.",
   "sp_walk": "해 질 녘 이야기 속 풍경을 지나는 옛길을 천천히 걸어요.",
   "sp_rest": "배경 한가운데의 낡은 돌계단에 앉아 종이컵을 들고 쉬어요.",
   "sp_sketch": "벤치에서 작은 수첩에 이야기 속 풍경을 그려요.",
   "sp_dawn": "조용한 자리에서 이야기의 배경에 첫 햇살이 닿는 것을 봐요.",
   "sp_window": "그 고장 숙소의 창가 자리에서 찻잔을 들고 배경을 바라봐요.",
   "ad_fitting": "의상 공방 피팅대에서 자기 이야기의 시대 의상 허리를 핀으로 맞춰요.",
   "ad_readthrough": "긴 리딩 테이블에서 연필을 들고 대본의 제 대사를 읽어요.",
   "ad_waiting": "촬영 사이 시대 의상 위에 가벼운 재킷을 걸치고 기다려요.",
   "ad_rehearsal": "테이프 표시가 붙은 빈 나무 무대에서 조명 아래 장면을 맞춰 봐요.",
   "ad_makeup": "전구 거울 앞에 앉아 배역에 맞게 머리를 올려요.",
   "ad_premiere": "이브닝드레스 차림으로 각색 작품 시사회 레드카펫에 들어서요.",
   "ls_reading": "아늑한 카페의 작은 낭독대에서 얇은 책을 소리 내어 읽어요.",
   "ls_bookclub": "찻잔이 놓인 낮은 탁자에서 몸을 기울여 제 생각을 말해요.",
   "ls_authortalk": "서점의 작가와의 대화 맨 앞줄에서 무릎에 책을 얹고 들어요.",
   "ls_poetry": "촛불 켠 시 낭송의 밤에 짧은 시를 외워 읊어요.",
   "ls_garden": "여름 정원의 담요 위 독서 모임에서 한 구절을 나눠 읽어요.",
   "ls_salon": "서가와 피아노가 있는 살롱에서 대화하며 손님에게 차를 따라요.",
   "travel_ferry": "항구를 떠난 페리 갑판 난간에 기대어 다가오는 섬을 바라봐요.",
   "travel_lodge": "산장 프런트에서 배낭을 멘 채 나무 열쇠를 받아요.",
   "travel_cablecar": "케이블카 창가에서 안개 낀 골짜기를 내려다봐요.",
   "travel_footbath": "온천 마을의 지붕 있는 족욕탕에 발을 담그고 쉬어요.",
   "travel_dunes": "바람 무늬 진 사막 모래언덕 길에서 놋쇠 나침반으로 방향을 확인해요.",
   "fest_parade": "꽃으로 꾸민 퍼레이드 차에 올라 거리로 꽃잎을 뿌려요.",
   "fest_ringtoss": "축제 고리 던지기 가판대에서 한쪽 눈을 가늘게 뜨고 병을 겨눠요.",
   "fest_illumination": "겨울 조명 터널 아래를 걸으며 장갑 낀 손으로 따뜻한 음료를 들어요.",
   "fest_flowercrown": "봄꽃 축제 공방 테이블에서 생화로 꽃관을 엮어요.",
   "fest_dance": "종이 등불 아래 축제 북 무대를 돌며 간단한 원무를 춰요.",
   "hobby_boardgame": "아늑한 테이블에서 보드게임 말을 옮기며 다음 수를 고민해요.",
   "hobby_fishing": "새벽의 조용한 나무 잔교에서 낚싯줄을 던져요.",
   "hobby_birdwatch": "갈대 관찰소에서 작은 쌍안경으로 습지 건너편을 살펴요.",
   "hobby_origami": "낮은 탁자에서 작은 종이학을 접고, 완성한 종이 인형을 옆에 세워 둬요.",
   "hobby_knitting": "창가 의자에서 부드러운 목도리를 떠요. 실뭉치는 옆 바구니에 있어요.",
   "hobby_stargazing": "밤 옥상에서 작은 망원경을 맞추며 별을 봐요.",
   "lib_storyhour": "오후 이야기 시간 전에 서고 구석에 방석과 그림책 바구니를 놓아요.",
   "lib_mobile": "마을 광장에 선 이동 도서관 차의 서가에 책 상자를 채워요.",
   "lib_night_round": "폐관 뒤 작은 등을 들고 어두운 서가를 돌며 독서등을 확인해요.",
   "lib_map_room": "지도실 넓은 탁자에 오래된 큰 지도를 펼치고 놋쇠 문진으로 모서리를 눌러요.",
   "cutout_onepiece": "허리 옆이 크게 트인 안감 댄 원피스 수영복.",
   "plunge_onepiece": "가슴 가운데가 깊게 파인 V 원피스. 허리 밴드가 단단히 잡아 준다.",
   "retro_highwaist": "배꼽 위까지 오는 하의에 홀터 상의를 맞춘 핀업풍 비키니.",
   "oring_bikini": "가슴 가운데와 골반 옆을 금속 링으로 이은 비키니.",
   "crochet_bikini": "안감을 댄 코바늘 니트 비키니. 휴양지 분위기.",
   "yacht_deck": "정박한 요트 앞 갑판 쿠션에 손을 짚고 기대 햇볕을 쬐어요.",
   "waterfall_pool": "바위 사이 폭포 웅덩이에 허리까지 들어가 두 손으로 젖은 머리를 넘겨요.",
   "beach_volley": "뜨거운 모래 위에서 스포티한 비키니 차림으로 몸을 낮춰 공을 받아요.",
   "paddle_board": "잔잔한 만에서 패들보드 위에 서서 노를 저어요.",
   "pool_float": "햇살 드는 수영장에서 커다란 튜브에 몸을 맡기고 음료를 들어요.",
   "cabaret_showgirl": "반짝이는 보디스와 깃털 머리장식·큰 깃털 부채의 카바레 쇼걸풍.",
   "witch_party": "뾰족 모자·코르셋 끈 짧은 드레스·줄무늬 스타킹의 핼러윈 마녀 의상.",
   "vampire_gala": "높은 깃의 벨벳 망토와 허리를 조인 드레스의 뱀파이어 백작 부인풍.",
   "majorette": "깃털 모자·장식 끈 재킷·주름 미니스커트·흰 부츠의 마조렛 의상. 실제 휘장은 없다.",
   "sailor_stage": "세일러 칼라 크롭 상의와 주름 미니스커트의 무대 의상. 실제 해군 표식은 없다.",
   "lifeguard_event": "빨간 원피스풍 의상에 호루라기와 구명 튜브 소품을 든 라이프가드 이벤트 의상.",
   "cat_cafe": "고양이 귀 머리띠·리본 초커·프릴 앞치마 드레스의 테마 카페 의상.",
   "santa_party": "퍼 트림 빨간 벨벳 미니드레스와 산타 모자의 크리스마스 파티 의상.",
   "mermaid_show": "비늘 스팽글 보디스와 흐르는 시폰 랩스커트의 인어 쇼 의상.",
   "ballet_stage": "몸에 붙는 보디스와 짧은 튀튀·토슈즈의 발레 무대 의상.",
   "bridal_lace": "흰 레이스 세트에 짧은 베일을 쓴 예식 전 드레스룸.",
   "satin_teddy": "목선부터 골반까지 이어진 원피스형 새틴 란제리.",
   "retro_pinup": "구조 잡힌 브라와 하이웨이스트 하의의 50년대 핀업 세트.",
   "velvet_set": "깊은 색 벨벳 브라렛과 하이웨이스트 하의 세트.",
   "cage_back": "등판에서 끈이 기하학적으로 엮인 브라렛 세트.",
   "sport_cotton": "글자 없는 넓은 밴드의 면 세트. 밝은 아침 침실.",
   "chemise_silk": "무릎 위 길이에 레이스 단을 댄 불투명 실크 슈미즈.",
   "front_lace_corset": "앞섶을 끈으로 여미는 코르셋에 하이웨이스트 하의를 맞춘 세트.",
   "sauna_lounge": "사우나 휴게실에서 큰 수건을 두르고 냉수를 마셔요.",
   "hammock_balcony": "실크 라운지 세트 차림으로 발코니 해먹에 누워 한쪽 다리를 늘어뜨려요.",
   "breakfast_bed": "새틴 파자마 차림으로 침대에 앉아 무릎 위 아침 쟁반을 받쳐요.",
   "rooftop_party": "전구 줄 아래 도시 옥상 파티에서 등이 트인 미니드레스로 잔을 들어요.",
   "jazz_bar_stage": "어두운 재즈 바의 그랜드피아노에 하이 슬릿 가운 차림으로 기대요.",
   "flapper_party": "드롭 웨이스트 술 장식 드레스로 스피크이지 파티에서 찰스턴을 춰요.",
   "deco_lounge": "아르데코 호텔 라운지에서 바이어스컷 새틴 가운 차림으로 초에 불을 붙여요.",
   "hollywood_bias": "등이 늘어지는 30년대 바이어스컷 새틴 가운으로 옛 영화 세트 계단에 서요.",
   "swing_dress": "하트 넥라인 스윙 드레스로 댄스홀에서 빙그르 돌아요.",
   "pinup_beachball": "햇살 드는 보드워크에서 하이웨이스트 핀업 수영복 차림으로 줄무늬 비치볼을 들어요.",
   "pinup_car": "50년대 홀터 플레이수트 차림으로 클래식 오픈카 펜더에 기대요.",
   "diner_counter": "위글 스커트와 짧은 블라우스로 크롬 다이너 의자에 걸터앉아 밀크셰이크를 들어요.",
   "mod_mini": "기하학 색 면의 60년대 모드 미니드레스와 고고 부츠로 체크무늬 바닥에서 춤춰요.",
   "jetset_pool": "60년대 원피스 수영복에 스카프와 캣아이 선글라스로 리비에라 호텔 수영장에 있어요.",
   "disco_halter": "루렉스 홀터 점프슈트로 미러볼 아래 빛나는 디스코 바닥에 서요.",
   "boho_crochet": "코바늘 홀터 상의와 로우라이즈 나팔바지로 햇살 드는 페스티벌 들판에 있어요.",
   "roller_disco": "새틴 핫팬츠와 튜브톱 차림으로 롤러스케이트를 타고 롤러 디스코장을 미끄러져요.",
   "aerobics_80s": "하이컷 레오타드와 레그워머·헤어밴드로 거울 스튜디오에서 에어로빅 동작을 해요.",
   "power_glam": "어깨가 각진 스팽글 미니드레스로 네온 나이트클럽에 있어요.",
   "nineties_slip": "가는 끈 새틴 슬립드레스에 짧은 가디건을 걸치고 도시 로프트 파티에 있어요.",
   "y2k_lowrise": "로우라이즈 미니스커트·나비 홀터 상의·플랫폼 샌들로 쇼핑몰 분수 앞에서 폴더폰을 들어요.",
   "goth_chapel": "코르셋 벨트와 레이스 소매의 검은 벨벳 드레스로 옛 돌 예배당에서 초를 켜요.",
   "goth_cafe": "검은 레이스 미니드레스·플랫폼 부츠·은반지로 촛불 켠 고딕 카페에 있어요.",
   "punk_gig": "징 박힌 가죽 재킷·찢어진 티·타탄 미니스커트·워커로 작은 라이브 하우스 펜스 앞에 있어요.",
   "punk_alley": "끈·옷핀 달린 타탄 바지와 짧은 상의로 벽돌 골목 계단에서 부츠 끈을 매요.",
   "rock_backstage": "가죽 미니스커트·짧은 조끼·초커 차림으로 무대 뒤에서 기타를 조율해요.",
   "gyaru_street": "바디콘 미니드레스·플랫폼 힐·긴 네일아트로 번화가 스티커 사진기 앞에서 포즈를 잡아요.",
   "decora_harajuku": "파스텔 튀튀 스커트와 겹겹의 원색 상의·핀·팔찌로 하라주쿠 골목에 서요.",
   "yami_kawaii": "분홍·검정 세일러 칼라 미니드레스와 하트 초커로 크레페 가게 앞에 있어요.",
   "cybergoth_rave": "이마에 얹은 네온 고글·반사 미니스커트·높은 플랫폼 부츠로 자외선 조명 창고 레이브에 있어요.",
   "grunge_records": "허리에 묶은 큰 체크 셔츠·슬립드레스·워커로 중고 레코드 가게에 있어요.",
   "emo_gig": "줄무늬 긴팔·징 벨트·스키니진·체크 스니커즈로 작은 공연장에 있어요.",
   "steampunk_fair": "블라우스 위 브로케이드 언더버스트 벨트·짧은 버슬 스커트·놋쇠 고글로 스팀펑크 박람회에 있어요.",
   "gothic_lolita": "흑백 레이스 점퍼스커트와 보닛 차림으로 장미 정원 티 살롱에 있어요.",
   "skater_bowl": "짧은 후디·카고 반바지·긴 양말로 스케이트 보울에 뛰어들어요.",
   "biker_cafe": "밴도 상의 위로 연 가죽 라이딩 재킷·가죽 바지로 길가 카페의 오토바이 옆에 서요.",
   "raver_kandi": "메탈릭 홀터 크롭톱·카고 미니스커트·비즈 팔찌로 레이저 아래 야외 레이브에 있어요.",
   "visual_kei": "레이스 소맷부리의 검정·은색 겹 무대 의상으로 라이브 하우스 조명 아래 서요.",
   "club_floor": "스팽글 바디콘 미니드레스로 색 조명 아래 붐비는 클럽 플로어에서 춤춰요.",
   "dj_booth": "컷아웃 미니드레스로 DJ 부스 옆 난간에 기대 한 손을 박자에 맞춰 들어요.",
   "neon_bar": "등이 트인 새틴 상의와 가죽 미니스커트로 네온 바 카운터에서 색 음료를 들어요.",
   "karaoke_room": "오프숄더 스팽글 상의와 반바지 차림으로 노래방에서 마이크를 잡고 노래해요.",
   "powder_mirror": "홀터 미니드레스로 클럽 파우더룸 거울 앞에서 립스틱을 고쳐 발라요.",
   "club_queue": "슬립 미니드레스 위에 짧은 인조 퍼 재킷을 걸치고 밤의 클럽 앞 줄에 서요.",
   "vip_booth": "원숄더 스팽글 드레스로 벨벳 VIP 부스에 기대앉아요.",
   "night_taxi": "밤 외출 뒤 미니드레스 차림으로 택시 뒷좌석에서 창밖 불빛을 봐요.",
   "tango_solo": "등 트인 하이 슬릿 댄스 드레스로 밀롱가 나무 바닥에서 혼자 탱고 오초를 연습해요.",
   "salsa_spin": "술 장식 살사 드레스로 댄스홀에서 회전하는 순간, 술이 퍼져요.",
   "flamenco": "프릴 자락과 몸에 붙는 보디스의 플라멩코 드레스로 타블라오 무대에서 발을 굴러요.",
   "belly_dance": "동전 장식 상의와 낮게 두른 시폰 스커트로 등불 무대에서 베일을 돌려요.",
   "jazz_kick": "스팽글 재즈 레오타드와 짧은 플레어 스커트로 조명 무대에서 하이킥을 해요.",
   "dance_mirror": "짧은 댄스 상의와 하이웨이스트 반바지로 연습실 거울을 보며 자세를 확인해요.",
   "hula": "꽃 레이·밴도 상의·반바지 위 풀치마로 노을 진 해변 무대에서 훌라를 춰요.",
   "kpop_practice": "짧은 저지 상의와 카고 미니스커트로 연습실에서 날카로운 안무 동작을 잡아요.",
   "ballroom_waltz": "몸에 붙는 보디스의 볼룸 가운으로 샹들리에 무도회장에서 혼자 왈츠 스텝을 돌아요.",
   "rotenburo_edge": "수영복 차림으로 노천탕 돌 가장자리에 앉아 김 나는 물에 발을 담가요.",
   "hinoki_bath": "산속 료칸 창가의 히노키 탕에 수영복 차림으로 팔을 가장자리에 얹어요.",
   "jjimjilbang": "찜질복에 양머리 수건을 쓰고 뜨끈한 바닥에서 식혜를 마셔요.",
   "spa_robe_lounge": "수영복 위에 두툼한 가운을 걸치고 조용한 스파 라운지에서 허브차를 따라요.",
   "hammam": "줄무늬 면 페슈테말을 두르고 돔 지붕 하맘의 따뜻한 대리석에 앉아요.",
   "mud_mask": "가운 차림에 얼굴에 진흙 팩을 바르고 오이 조각을 든 채 쉬어요.",
   "spa_pool": "해 질 녘 김 오르는 스파 풀 가장자리에 수영복 차림으로 팔꿈치를 얹어요.",
   "cold_plunge": "사우나를 마치고 스포티한 수영복 차림으로 냉탕에 들어서며 숨을 들이켜요.",
   "elf_costume": "잎 장식 짧은 드레스·후드 반망토·뾰족 귀 소품의 엘프 의상으로 숲 테마 파티에 있어요.",
   "fairy_wings": "꽃잎 겹 미니드레스와 반짝이는 날개 소품으로 꽃 촬영 스튜디오에서 반짝이를 뿌려요.",
   "angel_devil": "빨간 새틴 미니드레스·뿔 머리띠·꼬리 소품에 한쪽 어깨엔 흰 깃털 날개를 단 천사·악마 의상으로 핼러윈 파티에 있어요.",
   "sorceress_robe": "오프숄더 벨벳 로브 드레스와 보석 벨트·수정 지팡이 소품으로 판타지 촬영에 서요.",
   "cosplay_photozone": "짧은 망토의 창작 판타지 의상으로 행사장 포토존 링라이트 아래 포즈를 잡아요.",
   "forest_spirit": "이끼색 드레이프 드레스와 꽃관·덩굴로 안개 낀 정원 촬영에 서요.",
   "star_goddess": "수정 별을 흩뿌린 짙은 남색 드레스와 초승달 머리장식으로 별빛 세트에 서요.",
   "fae_ball": "등 트인 드레스와 날개 모양 망토·잎사귀 가면으로 판타지 가면무도회에 있어요.",
   "moon_priestess": "흰 원숄더 드레이프 드레스·은 팔찌·월장석 머리띠로 등불 축제에 있어요.",
   "gown_fitting": "등이 트인 웨딩드레스를 입고 가봉대에 서서 보디스를 핀으로 맞춰요.",
   "before_ceremony": "하트 넥라인 웨딩드레스와 베일 차림으로 신부 대기실 창가에서 부케를 들어요.",
   "garden_aisle": "꽃 아치 아래 정원 버진로드를 흐르는 드레스 차림으로 혼자 걸어요.",
   "self_wedding_shoot": "바닷바람 부는 절벽에서 트임 있는 웨딩드레스로 셀프 웨딩 촬영을 해요.",
   "veil_wind": "노을 진 해변에서 슬립 웨딩드레스 차림으로 바람에 날리는 긴 베일을 잡아요.",
   "reception_gown": "피로연에서 등 트인 드레스로 댄스 플로어에서 돌아요.",
   "second_dress": "비즈 장식 짧은 2부 드레스로 피로연에서 웃으며 구두를 벗어요.",
   "bridal_shower": "흰 오프숄더 미니드레스와 띠를 두르고 브라이덜 샤워 테이블에서 선물 상자를 열어요.",
   "honeymoon_suite": "바다 바람이 드는 신혼여행 스위트 발코니에서 실크 슬립드레스로 잔을 들어요.",
   "red_carpet": "하이 슬릿 이브닝 가운으로 레드카펫에 들어서며 플래시 쪽으로 몸을 돌려요.",
   "photo_wall": "원숄더 스팽글 가운으로 무늬만 있는 포토월 앞에서 한 손을 허리에 얹어요.",
   "festival_steps": "긴 자락 가운 차림으로 영화제의 붉은 대계단을 올라요.",
   "award_ceremony": "깊이 파인 벨벳 가운으로 시상식 무대로 걸어 나가며 금빛 트로피를 들어요.",
   "gala_dinner": "등 트인 실크 가운으로 촛불 켠 갈라 디너 테이블에서 샴페인 잔을 들어요.",
   "charity_auction": "어깨 없는 새틴 가운과 긴 장갑으로 자선 경매에서 응찰 패를 들어요.",
   "front_row": "조형적인 미니드레스로 패션위크 쇼 앞줄에 다리를 꼬고 앉아요.",
   "museum_gala": "등 트인 칼럼 가운으로 웅장한 박물관 홀 갈라에 서요. 뒤로 대리석 조각상이 있어요.",
   "afterparty_stairs": "갈라가 끝난 뒤 새틴 가운 차림으로 대계단에 앉아 구두를 한 손에 들어요."
  };
  const CAT_KO = {
   "auto_random": "카테고리를 지정하지 않고 GPT가 알아서 고른다. 무엇이 나올지 예측이 어려운 대신 매번 다른 결과가 나온다.",
   "adult_roleplay": "직업을 소재로 한 성인 코스튬 패션. 실제 제복이 아니라 이벤트용 의상처럼 보이게 한다. 실제 계급장·무기·전술장비는 나오지 않는다.",
   "everyday_basic": "꾸미지 않은 생활 장면. 연출된 화보가 아니라 우연히 찍힌 순간처럼 보이게 한다. 평범한 현대 옷차림.",
   "everyday_sensual": "같은 생활 장면에 옷의 드레이프·어깨·허리·조명으로 분위기를 얹는다. 상황 자체는 여전히 평범해야 하고 란제리 화보가 되면 안 된다.",
   "swimwear": "수영장·해변·물가에서 현대적인 수영복과 자연스러운 움직임을 보여줘요.",
   "active": "실제 움직임이 보이는 액티브웨어. 헬스장 스냅 같은 뻔한 컷을 피하고 동작·천의 흐름·실루엣을 강조한다.",
   "source_editorial": "책의 색·상징·시대·재료(종이·제본·잉크·실)를 일상 패션이나 쿠튀르로 옮겨요. 폼 의상을 그대로 입히는 갈래는 아니에요.",
   "homewear": "집에서 입는 옷이되 디자인된 홈웨어. 밋밋한 잠옷과 소파에 앉은 정적인 포즈를 피하고 생활 동작을 넣는다.",
   "private_evening": "성인의 사적인 저녁 시간. 우아하고 세련된 이브닝 스타일링과 호텔·발코니·거울 앞 같은 사적인 맥락.",
   "lingerie": "란제리풍 패션. 중요 부위는 전부 가린 채로 프레이밍·실루엣·자세·조명으로 분위기를 만든다.",
   "everyday": "평범한 생활 동작과 편한 옷차림을 중심으로 한 장면이에요.",
   "wildcard": "새로운 장소와 활동을 자유롭게 조합해 한 장면을 만들어요.",
   "__custom__": "카테고리를 직접 문장으로 적는다. 아래 입력란에 원하는 방향을 그대로 쓰면 된다.",
   "traditional": "그 캐릭터의 계통에 맞는 전통 의상. 정장형과 현대화된 일상형 중에서 고른다. 고증을 지키되 색은 책 설계표을 따를 수 있다.",
   "travel_exploration": "그 책의 세계를 닮은 곳을 걷거나 둘러보는 여행 장면이에요.",
   "festivals_contests": "축제 구경·응원·무대 준비처럼 행사에 참여하는 일상을 그려요.",
   "hobbies_leisure": "독서·그림·공예·음악처럼 평소 취향이 드러나는 조용한 장면이에요.",
   "library_life": "도서관·기록 보관소·헌책방·제본 공방처럼 책 곁에서 일하는 조용한 장면이에요. 펼친 책을 카메라로 내밀지 않고 글자는 쓰지 않아요.",
   "story_place": "자기 책의 배경이 된 실제·상상 속 장소를 찾아가는 장면이에요. 책마다 설계표의 place 한 줄을 실어요.",
   "stage_adaptation": "자기 이야기를 각색한 연극·영화의 무대 뒤예요. 의상은 책의 시대를 따라 새로 지어요 — 이미 있는 영화·무대 디자인을 베끼지 않아요.",
   "literary_salon": "낭독회·북클럽·작가와의 대화처럼 책을 둘러싼 모임이에요. 일하는 장면인 서고의 일상과 달라요.",
   "retro_glamour": "20년대 플래퍼부터 50년대 핀업·70년대 디스코·80년대 에어로빅·Y2K까지, 한 시대의 글래머 패션을 그 시대의 재단과 소재로 입혀요. 머리 모양과 색은 그대로예요.",
   "subculture_fashion": "고스·펑크·록·갸루·하라주쿠·사이버고스·그런지처럼 실제 거리 문화의 옷차림과 그 문화가 사는 장소예요. 밴드 이름·로고는 쓰지 않아요.",
   "nightlife": "클럽·DJ 부스·네온 바·노래방·옥상 파티처럼 사람들 사이의 밤 외출이에요. 조용한 둘만의 밤인 프라이빗 이브닝과 달라요.",
   "dance_stage": "탱고·살사·플라멩코·벨리댄스·발레·재즈·훌라·카바레·K팝 안무처럼 춤 하나의 동작이 중심이에요. 파트너 없이 혼자 춰요.",
   "spa_wellness": "노천탕·히노키 탕·가운 라운지·하맘·냉탕처럼 스파와 온천의 휴식 장면이에요. 수영복·수건·가운이 가슴과 골반을 덮어요.",
   "fantasy_costume": "엘프·요정·천사와 악마·마법사·숲의 정령처럼 판타지 의상을 입은 코스프레 행사나 촬영이에요. 다른 작품의 캐릭터는 쓰지 않아요.",
   "bridal": "가봉·예식 전 대기·정원 버진로드·셀프 웨딩 촬영·피로연 드레스·신혼여행처럼 그녀의 웨딩 하루예요. 화면에는 혼자예요.",
   "gala_red_carpet": "레드카펫·포토월·영화제 계단·시상식·갈라 디너처럼 공개된 행사장의 이브닝 가운이에요. 둘만의 밤인 프라이빗 이브닝과 반대예요."
  };
  const EXPRESSION_OPTIONS = [
   [
    "",
    "AUTO — 자동"
   ],
   [
    "calm",
    "calm — 차분함"
   ],
   [
    "focused",
    "focused — 집중"
   ],
   [
    "soft_smile",
    "soft smile — 옅은 미소"
   ],
   [
    "half_smile",
    "half-smile — 은은한 미소"
   ],
   [
    "playful",
    "playful — 장난기"
   ],
   [
    "confident",
    "confident — 자신감"
   ],
   [
    "sensual",
    "sensual — 자연스러운 섹시"
   ],
   [
    "provocative",
    "provocative — 도발적이되 비노출"
   ],
   [
    "sleepy",
    "sleepy — 졸린 느낌"
   ],
   [
    "candid",
    "candid — 생활감"
   ],
   [
    "mildly_annoyed",
    "mildly annoyed — 약간 짜증"
   ],
   [
    "surprised",
    "surprised — 놀람"
   ],
   [
    "curious",
    "curious — 호기심"
   ],
   [
    "serious",
    "serious — 진지함"
   ],
   [
    "amused",
    "amused — 재미있어하는"
   ],
   [
    "bored",
    "bored — 심드렁함"
   ],
   [
    "pensive",
    "pensive — 생각에 잠긴"
   ],
   [
    "smug",
    "smug — 우쭐한"
   ],
   [
    "gentle",
    "gentle — 온화함"
   ],
   [
    "determined",
    "determined — 결의에 찬"
   ],
   [
    "exhausted",
    "exhausted — 지친"
   ],
   [
    "nostalgic",
    "nostalgic — 아련한"
   ],
   [
    "unimpressed",
    "unimpressed — 시큰둥함"
   ],
   [
    "flustered",
    "flustered — 당황한"
   ],
   [
    "proud",
    "proud — 자랑스러운"
   ],
   [
    "wistful",
    "wistful — 그리운 듯한"
   ],
   [
    "mischievous",
    "mischievous — 짓궂은"
   ],
   [
    "relieved",
    "relieved — 안도한"
   ],
   [
    "cold_smile",
    "cold smile — 차가운 미소"
   ],
   [
    "laughing",
    "laughing — 소리내어 웃는 · 눈 감김"
   ],
   [
    "laughing_open",
    "laughing, eyes open — 소리내어 웃는 · 눈 뜬 채"
   ]
  ];
  const EXPRESSION_DETAIL = {
   "calm": "relaxed brow, softly open eyes, lips closed and unstrained, no smile",
   "focused": "slightly drawn brow, narrowed steady eyes fixed on one point, mouth firmly closed",
   "soft_smile": "faint upward pull at the mouth corners, lips together, warmth reaching the lower eyelids",
   "half_smile": "one mouth corner lifted higher than the other, lips closed, gaze slightly to the side",
   "playful": "asymmetric grin with teeth just showing, one brow raised, eyes narrowed with amusement",
   "confident": "level brow, direct unhurried gaze, chin slightly raised, mouth closed and composed",
   "sensual": "heavy-lidded eyes, lips slightly parted and relaxed, brow smooth, chin a little lowered",
   "provocative": "direct challenging gaze under lowered lids, one brow raised, mouth corner tugged in a slight smirk",
   "sleepy": "heavy drooping eyelids, unfocused gaze, softened slack mouth, brow low and relaxed",
   "candid": "caught mid-motion, eyes off camera, mouth in an unposed in-between shape",
   "mildly_annoyed": "inner brows drawn together, one eye slightly narrowed, mouth pressed flat to one side",
   "surprised": "raised brows, widened eyes with visible upper white, mouth open in a small round shape",
   "curious": "one brow raised higher, head tilted, eyes wide and attentive, lips slightly parted",
   "serious": "level lowered brow, steady unblinking gaze, mouth closed in a straight line, jaw set",
   "amused": "crinkled lower eyelids, closed-lip smile pushing the cheeks up, brows relaxed",
   "bored": "lidded half-open eyes looking away, slack mouth, brows flat and unengaged",
   "pensive": "gaze angled down and away, slightly furrowed brow, lips lightly pressed or touched",
   "smug": "one mouth corner lifted, lids lowered in a knowing look, chin tipped slightly up",
   "gentle": "softly lowered brows, warm relaxed eyes, faint closed-lip smile, no tension anywhere",
   "determined": "brows pulled down and in, hard forward gaze, jaw clenched, mouth a tight line",
   "exhausted": "drooping lids and brows, dull unfocused gaze, mouth slightly open and slack, shoulders of the face fallen",
   "nostalgic": "soft distant gaze past the camera, faint wistful half-smile, brows gently raised at the inner ends",
   "unimpressed": "flat level brows, half-lidded deadpan stare, mouth in a straight unmoved line",
   "flustered": "raised inner brows, darting or averted eyes, mouth slightly open, faint blush across the cheeks and nose",
   "proud": "chin lifted, brows level, eyes bright and steady, closed-lip smile with a firm mouth",
   "wistful": "gaze softened and directed slightly upward or away, faint sad smile, inner brows raised",
   "mischievous": "narrowed sparkling eyes, one brow up, closed-lip grin pushed to one side",
   "relieved": "brows released upward and outward, eyes half closed, breath-out mouth slightly open, whole face loosened",
   "cold_smile": "mouth smiling while the eyes stay flat and unsmiling, brows level, gaze direct and unwarm",
   "laughing": "head tipped back slightly, eyes squeezed nearly shut, mouth open wide with teeth showing, cheeks raised high",
   "laughing_open": "mouth open wide in a laugh with teeth showing and cheeks raised, but the eyes stay open and engaged — lids only slightly narrowed, gaze still readable rather than squeezed shut"
  };
  const POSE_OPTIONS = [
   [
    "",
    "자동 — 장면에 맞게"
   ],
   [
    "standing_relaxed",
    "편하게 선 자세"
   ],
   [
    "standing_formal",
    "반듯하게 서기"
   ],
   [
    "contrapposto",
    "한쪽 다리에 무게 싣기"
   ],
   [
    "hand_on_hip",
    "허리에 손"
   ],
   [
    "arms_crossed",
    "팔짱"
   ],
   [
    "sitting",
    "의자에 앉기"
   ],
   [
    "sitting_floor",
    "바닥에 앉기"
   ],
   [
    "kneeling",
    "무릎을 댄 자세"
   ],
   [
    "leaning_wall",
    "벽에 기대기"
   ],
   [
    "leaning_furniture",
    "가구에 기대기"
   ],
   [
    "walking",
    "걷기"
   ],
   [
    "mid_stride",
    "걸음 중간"
   ],
   [
    "stretching",
    "기지개"
   ],
   [
    "bending_over",
    "상체 숙이기"
   ],
   [
    "on_tiptoe",
    "발끝 세우기"
   ],
   [
    "hands_in_hair",
    "머리 정리하기"
   ],
   [
    "carrying_something",
    "물건 들기"
   ],
   [
    "mid_action",
    "동작 한가운데"
   ],
   [
    "squatting",
    "쪼그려 앉기"
   ],
   [
    "one_knee_up",
    "한쪽 무릎 세워 앉기"
   ],
   [
    "side_sitting",
    "다리를 옆으로 두고 앉기"
   ],
   [
    "cross_legged",
    "책상다리로 앉기"
   ],
   [
    "perched_seat",
    "걸터앉기"
   ],
   [
    "turning_back",
    "돌아보는 순간"
   ],
   [
    "waving",
    "가볍게 손 흔들기"
   ],
   [
    "holding_cup",
    "컵 들고 쉬기"
   ],
   [
    "reading_book",
    "책 읽기"
   ],
   [
    "offering_food",
    "간식 건네기"
   ],
   [
    "watering",
    "물 주기"
   ],
   [
    "preparing_food",
    "음식 준비하기"
   ],
   [
    "taking_photo",
    "사진 찍기"
   ],
   [
    "adjusting_bag",
    "가방끈 고쳐 메기"
   ],
   [
    "checking_map",
    "지도 펼쳐 보기"
   ],
   [
    "dance_step",
    "작은 댄스 스텝"
   ]
  ];
  const POSE_GUIDES = {
   "standing_relaxed": [
    "어깨를 풀고 두 발에 자연스럽게 무게를 나눠 서요.",
    "Stand at ease with relaxed shoulders and naturally balanced feet."
   ],
   "standing_formal": [
    "등을 펴고 안정적으로 서서 또렷한 실루엣을 보여줘요.",
    "Stand upright with a balanced stance and a composed posture."
   ],
   "contrapposto": [
    "한쪽 다리에 체중을 싣고 반대쪽 무릎을 편하게 풀어요.",
    "Rest weight on one leg with the opposite knee relaxed in natural contrapposto."
   ],
   "hand_on_hip": [
    "한 손을 허리에 두고 다른 손은 장면에 맞게 내려요.",
    "Place one hand on the hip and let the other arm rest naturally or support the scene's prop."
   ],
   "arms_crossed": [
    "가슴 앞에서 팔을 편하게 교차해요.",
    "Fold the arms comfortably across the torso with readable hands."
   ],
   "sitting": [
    "의자나 벤치에 앉아 발과 손을 자연스럽게 놓아요.",
    "Sit naturally on a chair or bench with supported feet and readable hands."
   ],
   "sitting_floor": [
    "바닥이나 매트에 앉아 두 다리를 앞으로 뻗거나 무릎을 세워 두 발이 다 보이게 놓아요.",
    "Sit on the floor or a mat with both legs in front of the hips — stretched out or knees loosely raised — two separate legs and both feet in view, heels resting on the floor."
   ],
   "kneeling": [
    "낮은 작업에 맞게 무릎을 대고, 정강이는 바닥에 나란히, 두 발은 엉덩이 뒤로 발등이 바닥에 닿게 놓아요.",
    "Kneel for a low task: both knees on the floor, shins lying flat and parallel behind them, both feet behind the hips with the tops of the feet on the floor and the soles facing up."
   ],
   "leaning_wall": [
    "벽에 어깨나 등을 가볍게 기대어 쉬어요.",
    "Lean a shoulder or the back lightly against a wall while keeping balance through the feet."
   ],
   "leaning_furniture": [
    "테이블이나 난간에 손 또는 팔꿈치를 올려요.",
    "Rest a hand or forearm on a table, counter or railing in a relaxed supported pose."
   ],
   "walking": [
    "한 발을 내디디며 팔이 자연스럽게 따라 움직여요.",
    "Walk at a comfortable pace with a natural step and arm swing."
   ],
   "mid_stride": [
    "발을 옮기는 순간을 잡아 이동감을 보여줘요.",
    "Capture a clear mid-stride step with believable weight transfer."
   ],
   "stretching": [
    "팔과 등을 천천히 펴는 편안한 동작이에요.",
    "Stretch the arms and upper back gently in a comfortable everyday motion."
   ],
   "bending_over": [
    "낮은 물건을 살피듯 허리를 가볍게 숙여요.",
    "Bend forward slightly to examine or reach a low object with a balanced stance."
   ],
   "on_tiptoe": [
    "높은 물건을 향해 발뒤꿈치를 조금 들어요.",
    "Rise slightly onto the toes to reach a higher object without changing limb proportions."
   ],
   "hands_in_hair": [
    "양손이나 한 손으로 머리 모양을 정돈해요.",
    "Use the hands to tidy the established hairstyle without changing its cut or length."
   ],
   "carrying_something": [
    "장면의 가방·바구니·상자를 무게에 맞게 들어요.",
    "Carry the scene's bag, basket or box with believable hand contact and weight."
   ],
   "mid_action": [
    "선택한 장면의 활동이 진행 중인 순간을 잡아요.",
    "Capture the selected activity already in progress with a readable natural gesture."
   ],
   "squatting": [
    "낮은 대상과 눈높이를 맞추며 무릎을 굽혀요.",
    "Squat comfortably to interact at a lower height with balanced feet."
   ],
   "one_knee_up": [
    "바닥에 앉아 한쪽 무릎을 세워 그 발바닥을 바닥에 대고, 다른 다리는 앞으로 눕혀 접고, 팔을 세운 무릎에 올려요.",
    "Sit on a mat with one knee raised and that foot flat on the floor, the other leg folded flat in front, and an arm resting on the raised knee; both feet in view."
   ],
   "side_sitting": [
    "엉덩이를 매트에 대고 두 무릎을 같은 쪽으로 모아 접어, 두 발을 반대쪽 엉덩이 옆에 나란히 놓아요.",
    "Side-sit on a mat: hips on the mat, both knees bent and pointing to the same side, both lower legs folded back so the two feet lie side by side next to the opposite hip; torso upright."
   ],
   "cross_legged": [
    "방석에 앉아 두 무릎을 양옆으로 벌리고 정강이를 앞에서 교차해, 두 발을 반대쪽 무릎 아래에 놓아요.",
    "Sit cross-legged on a floor cushion: knees open to either side, shins crossed in front of the hips, each foot tucked under the opposite knee with its outer edge on the cushion; relaxed shoulders and readable hands."
   ],
   "perched_seat": [
    "벤치나 낮은 턱에 가볍게 걸터앉아 발을 내려요.",
    "Perch on a low ledge or bench with the feet resting naturally below."
   ],
   "turning_back": [
    "몸의 진행 방향을 유지하며 고개와 어깨만 어깨 너머로 4분의 1까지 살짝 돌려요 — 얼굴은 3/4이나 옆얼굴.",
    "Pause mid-step and turn the head and shoulders gently back over one shoulder — a quarter turn at most, face in three-quarter or profile — without twisting the torso unnaturally."
   ],
   "waving": [
    "한 손을 어깨 높이로 들어 인사해요.",
    "Raise one hand near shoulder height in a friendly small wave."
   ],
   "holding_cup": [
    "컵을 한 손 또는 두 손으로 받쳐 들고 쉬어요.",
    "Hold a cup comfortably in one or both hands during a quiet break."
   ],
   "reading_book": [
    "책을 펼쳐 들고 페이지를 살피는 자세예요.",
    "Hold an open book with readable finger placement and look toward its pages."
   ],
   "offering_food": [
    "그릇이나 작은 간식을 대상 쪽으로 내밀어요.",
    "Offer a small treat or food bowl toward the scene's companion, keeping hands and companion separate."
   ],
   "watering": [
    "물뿌리개를 기울여 낮은 화분이나 식물에 물을 줘요.",
    "Tilt a small watering can toward plants with a clear grip and believable balance."
   ],
   "preparing_food": [
    "작업대 앞에서 반죽을 섞거나 재료를 정리해요.",
    "Work at a kitchen counter, stirring a bowl or arranging ingredients with clearly separated hands and utensils."
   ],
   "taking_photo": [
    "카메라를 안정적으로 잡고 장면 속 대상을 촬영해요.",
    "Hold a camera with both hands to photograph a subject in the scene."
   ],
   "adjusting_bag": [
    "한 손으로 어깨끈을 당겨 여행 가방을 정돈해요.",
    "Adjust a shoulder strap with one hand while supporting the travel bag naturally."
   ],
   "checking_map": [
    "두 손으로 지도를 펴고 길을 확인해요.",
    "Hold a folded-out route map in both hands while checking the surroundings."
   ],
   "dance_step": [
    "한 발을 옮기며 손과 어깨로 리듬을 표현해요.",
    "Take a small rhythmic dance step with coordinated arms and balanced feet."
   ]
  };
  const ORIENTATION_OPTIONS = [
   [
    "",
    "AUTO — 자동"
   ],
   [
    "front",
    "front — 정면"
   ],
   [
    "front_3q",
    "front three-quarter — 앞 3/4"
   ],
   [
    "side",
    "side profile — 측면"
   ],
   [
    "rear_3q",
    "rear three-quarter — 뒤 3/4"
   ],
   [
    "back",
    "back view — 뒷태"
   ],
   [
    "over_shoulder",
    "over shoulder — 뒤돌아보기"
   ],
   [
    "seated_twist",
    "seated twist — 앉은 비틀기"
   ],
   [
    "walking_away",
    "walking away — 멀어지는 방향"
   ],
   [
    "turning_midmotion",
    "turning mid-motion — 움직임 중 회전"
   ],
   [
    "low_angle",
    "low angle — 아래에서 올려다본 각도"
   ],
   [
    "high_angle",
    "high angle — 위에서 내려다본 각도"
   ],
   [
    "leaning_forward",
    "leaning forward — 앞으로 기울인 상체"
   ],
   [
    "leaning_back",
    "leaning back — 뒤로 젖힌 상체"
   ],
   [
    "crouching",
    "crouching — 쪼그린 자세"
   ],
   [
    "reclining",
    "reclining — 기대 누운 자세"
   ],
   [
    "reaching_up",
    "reaching up — 위로 손 뻗기"
   ],
   [
    "looking_down",
    "looking down — 시선을 아래로"
   ],
   [
    "looking_away",
    "looking away — 시선을 밖으로"
   ],
   [
    "back_to_camera",
    "back to camera — 완전히 등진 자세"
   ],
   [
    "profile_close",
    "close profile — 측면 근접"
   ],
   [
    "three_quarter_back",
    "three-quarter back — 뒤 3/4 강조"
   ]
  ];
  /* 등이 카메라를 보는 각도·돌아보는 자세 — 일상컷에 LOOK-BACK 줄(lib/prompt-book.js) */
  const LOOK_BACK = { orient: ['rear_3q', 'three_quarter_back', 'over_shoulder', 'back'], pose: ['turning_back'] };
  const ORIENTATION_GUIDES = {
   "front": [
    "몸통·골반이 카메라를 향해요. 시선은 별도예요.",
    "torso and pelvis face the camera; gaze is independent"
   ],
   "front_3q": [
    "몸통과 골반을 함께 약 30~45도 돌린 앞쪽 시점이에요.",
    "front three-quarter body turn of about 30-45 degrees; rotate torso and pelvis together"
   ],
   "side": [
    "몸통·골반을 옆으로 약 90도 돌려요.",
    "side body profile, approximately 90 degrees to camera"
   ],
   "rear_3q": [
    "등과 한쪽 옆면이 함께 보이도록 몸통·골반을 돌려요. 고개는 어깨 너머로 4분의 1까지만 — 얼굴은 옆얼굴이나 3/4.",
    "rear three-quarter view showing back and one flank; the head turns no more than a quarter turn, face in profile or three-quarter"
   ],
   "back": [
    "등 중앙이 카메라를 향해요. 얼굴이 보이면 어깨 너머로 4분의 1까지만 — 옆얼굴.",
    "back centered toward camera; if the face shows, the head turns no more than a quarter turn over one shoulder, face in profile"
   ],
   "over_shoulder": [
    "몸은 뒤쪽을 향하고 얼굴만 어깨 너머로 4분의 1까지 돌려요 — 턱은 그 어깨 위, 얼굴은 3/4이나 옆얼굴.",
    "body turned away, head looking back over one shoulder — a quarter turn at most, face in three-quarter or profile with the chin above that shoulder"
   ],
   "seated_twist": [
    "앉은 골반을 지지하고 상체만 자연스럽게 비틀어요.",
    "seated with supported pelvis and a natural torso twist"
   ],
   "walking_away": [
    "카메라에서 멀어지는 방향으로 걷는 모습이에요.",
    "walking away from camera with a readable rearward stride"
   ],
   "turning_midmotion": [
    "몸을 돌리는 중간 동작을 포착해요. 장비도 부착 부위를 따라요.",
    "mid-turn body motion with the costume following her movement"
   ],
   "low_angle": [
    "카메라가 인물보다 낮아요. 전신·상반신 범위는 프레이밍 선택을 따라요.",
    "camera below subject looking upward; obey selected framing"
   ],
   "high_angle": [
    "카메라가 인물보다 높아요. 전신·상반신 범위는 프레이밍 선택을 따라요.",
    "camera above subject looking downward; obey selected framing"
   ],
   "leaning_forward": [
    "상체를 앞쪽으로 기울이되 발·골반으로 균형을 유지해요.",
    "torso leaning forward with supported balance"
   ],
   "leaning_back": [
    "상체를 뒤로 기울이며 지지점을 분명히 해요.",
    "torso leaning backward with clear support"
   ],
   "crouching": [
    "무릎과 골반을 굽혀 낮게 앉아요.",
    "low crouch with flexed knees and hips"
   ],
   "reclining": [
    "몸의 무게를 바닥·의자 등에 맡겨 비스듬히 누워요.",
    "reclined body supported by a surface"
   ],
   "reaching_up": [
    "팔을 위로 뻗되 어깨·몸통 연결을 자연스럽게 해요.",
    "reach upward with natural shoulder articulation"
   ],
   "looking_down": [
    "시선이 아래쪽이에요. 카메라 높이를 바꾸는 지시가 아니에요.",
    "gaze directed downward; camera height unchanged"
   ],
   "looking_away": [
    "시선이 카메라 밖을 향해요. 몸 방향을 강제하지 않아요.",
    "gaze off-camera; body orientation independent"
   ],
   "back_to_camera": [
    "몸의 후면이 카메라를 향해요. 얼굴을 억지로 노출하지 않아요.",
    "body fully facing away; no forced face visibility"
   ],
   "profile_close": [
    "측면을 강조해요. 프레이밍을 따로 고르면 그 범위를 우선해요.",
    "side profile, close only when no explicit framing is selected"
   ],
   "three_quarter_back": [
    "후면과 옆면을 함께 보여 장비의 깊이를 읽기 쉽게 해요. 고개는 4분의 1까지만 — 얼굴은 옆얼굴이나 3/4.",
    "rear three-quarter view with natural costume depth and occlusion; the head turns no more than a quarter turn, face in profile or three-quarter"
   ]
  };
  const FRAME_OPTIONS = [
   [
    "",
    "자동 — 장면에 맞게"
   ],
   [
    "environmental",
    "환경 중심 와이드"
   ],
   [
    "full_body",
    "전신"
   ],
   [
    "three_quarter",
    "무릎 위"
   ],
   [
    "waist_up",
    "허리 위"
   ],
   [
    "chest_up",
    "가슴 위"
   ],
   [
    "face_close",
    "얼굴 클로즈업"
   ],
   [
    "detail",
    "손·소품 디테일"
   ]
  ];
  const FRAME_GUIDES = {
   "environmental": [
    "인물의 전신과 주변 장소를 함께 넓게 보여줘요.",
    "Environmental long shot: show the complete woman and enough surroundings to establish the activity and location."
   ],
   "full_body": [
    "머리부터 발끝까지 인물이 빠짐없이 보여요.",
    "Full-body framing: keep the complete head, hands and feet inside the frame with restrained margins."
   ],
   "three_quarter": [
    "머리부터 무릎 부근까지 담아 동작과 표정을 함께 보여줘요.",
    "Three-quarter portrait framing from the head to just above the knees, with the scene's hand action readable."
   ],
   "waist_up": [
    "얼굴·상체·손동작을 중심으로 담아요.",
    "Waist-up framing showing the head, torso and relevant hand gesture; place essential props inside this crop."
   ],
   "chest_up": [
    "얼굴과 어깨, 작은 표정 변화에 집중해요.",
    "Chest-up framing focused on the face, shoulders and expression with a small amount of setting."
   ],
   "face_close": [
    "머리 모양과 얼굴이 중심이 되는 가까운 구도예요.",
    "Close-up of the face and hairstyle, preserving the approved facial identity and using only a subtle background."
   ],
   "detail": [
    "장면에서 쓰는 손과 도구를 가까이 보여줘요.",
    "Detail framing centered on the woman's hands and the scene's object or task, with natural anatomy and readable contact."
   ]
  };
  const LENS_OPTIONS = [
   [
    "",
    "자동 — 장면에 맞게"
   ],
   [
    "wide24",
    "광각 · 24mm 느낌"
   ],
   [
    "documentary35",
    "준광각 · 35mm 느낌"
   ],
   [
    "natural50",
    "표준 · 50mm 느낌"
   ],
   [
    "portrait85",
    "준망원 · 85mm 느낌"
   ],
   [
    "telephoto135",
    "망원 · 135mm 느낌"
   ]
  ];
  const LENS_GUIDES = {
   "wide24": [
    "24mm 광각: 주변 장소와 앞뒤 거리감이 넓게 드러나요. 숲길·도시 전투처럼 공간과 움직임을 함께 보여주기 좋아요. 가까운 손발이나 얼굴이 과장되지 않도록 억제해요.",
    "24mm-equivalent wide-angle impression with spacious environmental depth; use enough camera distance to avoid stretching the face or limbs."
   ],
   "documentary35": [
    "35mm 준광각: 인물과 주변 상황을 균형 있게 담는 생활 스냅 느낌이에요. 산책·카페·여행이나 주변 지형이 중요한 액션 장면에 어울려요.",
    "35mm-equivalent environmental perspective balancing the woman and the setting with moderate depth."
   ],
   "natural50": [
    "50mm 표준: 앞뒤 거리감을 과하게 벌리거나 압축하지 않는 무난한 표현이에요. 인물의 자세·의상·표정을 자연스럽게 보여주고 싶을 때 고르세요.",
    "50mm-equivalent natural perspective with balanced proportions and modest depth compression."
   ],
   "portrait85": [
    "85mm 준망원: 같은 프레이밍에서 배경이 조금 가까워 보이고 얼굴과 몸의 원근감이 차분해져요. 상반신·표정 중심의 컷이나 정돈된 전신 인물컷에 어울려요.",
    "85mm-equivalent short-telephoto perspective from a suitable distance, with gentle background compression."
   ],
   "telephoto135": [
    "135mm 망원: 멀리서 바라보듯 앞뒤 공간이 압축되고 배경 요소가 겹쳐 보여요. 군더더기 없는 인물 강조나 멀리서 포착한 순간에 어울려요. 배경 흐림은 필요하면 추가 지시로 정해요.",
    "135mm-equivalent telephoto perspective from farther away, with compressed background depth and unchanged anatomy."
   ]
  };
  /* 일상컷 세 축 — 장부(IMAGE_RULES)가 보는 축 */
  const LOCAL_AXES = [
   "overall_intensity",
   "skin_exposure",
   "action_level",
   "source_influence",
   "separates_preference"
  ];
  const ADVANCED_OPTIONS = {
   "overall_intensity": [
    "AUTO",
    "restrained",
    "sensual",
    "bold",
    "strong"
   ],
   "pair_gap": [
    "AUTO",
    "small",
    "medium",
    "strong",
    "extreme"
   ],
   "outfit_variety": [
    "AUTO",
    "normal",
    "high",
    "extreme"
   ],
   "scene_variety": [
    "AUTO",
    "normal",
    "high",
    "extreme"
   ],
   "pose_variety": [
    "AUTO",
    "normal",
    "high",
    "extreme"
   ],
   "camera_variety": [
    "AUTO",
    "normal",
    "high",
    "extreme"
   ],
   "skin_exposure": [
    "AUTO",
    "low",
    "moderate",
    "bold"
   ],
   "separates_preference": [
    "AUTO",
    "balanced",
    "prefer separates",
    "strongly prefer separates"
   ],
   "action_level": [
    "AUTO",
    "mostly posed",
    "balanced",
    "mostly active"
   ],
   "direct_gaze_limit": [
    "AUTO",
    "0",
    "1",
    "2"
   ],
   "smile_limit": [
    "AUTO",
    "0",
    "1",
    "2"
   ],
   "unexpected_cuts": [
    "AUTO",
    "1",
    "2",
    "3"
   ],
   "source_influence": [
    "AUTO",
    "subtle",
    "balanced",
    "strong"
   ]
  };
  const ADVANCED_LABELS = {
   "overall_intensity": [
    "Overall Intensity",
    "전체 강도"
   ],
   "pair_gap": [
    "Pair Gap",
    "약한 컷↔강한 컷 차이"
   ],
   "outfit_variety": [
    "Outfit Variety",
    "의상 다양성"
   ],
   "scene_variety": [
    "Scene Variety",
    "장면 다양성"
   ],
   "pose_variety": [
    "Pose Variety",
    "포즈 다양성"
   ],
   "camera_variety": [
    "Camera Variety",
    "카메라 다양성"
   ],
   "skin_exposure": [
    "Skin Exposure",
    "피부 노출 정도"
   ],
   "separates_preference": [
    "Separates Preference",
    "분리형 의상 선호"
   ],
   "action_level": [
    "Action Level",
    "액션 비중"
   ],
   "direct_gaze_limit": [
    "Direct Gaze Limit",
    "정면 시선 최대"
   ],
   "smile_limit": [
    "Smile Limit",
    "미소 최대"
   ],
   "unexpected_cuts": [
    "Unexpected Cuts",
    "예상 밖 컷 수"
   ],
   "source_influence": [
    "Source Influence",
    "SOURCE 영향도"
   ]
  };
  const ADV_AXIS = {
   "overall_intensity": "이 장면의 스타일링과 분위기를 얼마나 강하게 표현할지 정해요.",
   "pair_gap": "각 쌍에서 앞 컷과 뒤 컷의 강도 차이.",
   "outfit_variety": "여섯 컷의 의상이 서로 얼마나 달라야 하는지.",
   "scene_variety": "장소와 상황이 서로 얼마나 달라야 하는지.",
   "pose_variety": "자세와 몸의 방향이 서로 얼마나 달라야 하는지.",
   "camera_variety": "카메라 거리와 각도가 얼마나 달라야 하는지.",
   "skin_exposure": "가슴·골반을 제외한 부위의 노출 정도.",
   "separates_preference": "상하의가 나뉜 옷을 얼마나 선호할지. 원피스 쏠림을 막는다.",
   "action_level": "쉬는 장면부터 활발한 움직임까지 동작의 크기를 정해요.",
   "direct_gaze_limit": "카메라를 정면으로 보는 컷을 최대 몇 개까지 둘지.",
   "smile_limit": "미소 짓는 컷을 최대 몇 개까지 둘지. 표정이 하나로 수렴하는 걸 막는다.",
   "unexpected_cuts": "예상 밖 발상의 컷을 몇 개 섞을지.",
   "source_influence": "책의 특징을 장신구와 주변 사물에 얼마나 보여줄지 정해요. 옷의 색·무늬에는 넣지 않아요(2026-10-29)."
  };
  const ADV_VAL = {
   "overall_intensity": {
    "restrained": "절제",
    "sensual": "자연스럽게 관능적",
    "bold": "과감",
    "strong": "가장 강함"
   },
   "pair_gap": {
    "small": "차이 거의 없음",
    "medium": "적당한 차이",
    "strong": "뚜렷한 차이",
    "extreme": "극단적 대비"
   },
   "outfit_variety": {
    "normal": "보통",
    "high": "많이 다르게",
    "extreme": "전부 다르게"
   },
   "scene_variety": {
    "normal": "보통",
    "high": "많이 다르게",
    "extreme": "전부 다르게"
   },
   "pose_variety": {
    "normal": "보통",
    "high": "많이 다르게",
    "extreme": "전부 다르게"
   },
   "camera_variety": {
    "normal": "보통",
    "high": "많이 다르게",
    "extreme": "전부 다르게"
   },
   "skin_exposure": {
    "low": "적게",
    "moderate": "보통",
    "bold": "많이"
   },
   "separates_preference": {
    "balanced": "균형",
    "prefer separates": "분리형 선호",
    "strongly prefer separates": "분리형 강하게 선호"
   },
   "action_level": {
    "mostly posed": "대부분 포즈",
    "balanced": "절반씩",
    "mostly active": "대부분 동작"
   },
   "direct_gaze_limit": {
    "0": "없음",
    "1": "최대 1컷",
    "2": "최대 2컷"
   },
   "smile_limit": {
    "0": "없음",
    "1": "최대 1컷",
    "2": "최대 2컷"
   },
   "unexpected_cuts": {
    "1": "1컷",
    "2": "2컷",
    "3": "3컷"
   },
   "source_influence": {
    "subtle": "은은하게",
    "balanced": "적당히",
    "strong": "강하게"
   }
  };
  const SCENE_AXIS_GUIDES = {
   "overall_intensity": {
    "restrained": [
     "의상과 태도를 차분하게 절제해요. 노출량은 별도 선택이에요.",
     "understated styling and restrained demeanor; exposure is separate"
    ],
    "sensual": [
     "부드러운 옷의 흐름과 여유 있는 몸짓으로 관능미를 표현해요.",
     "sensual fabric drape and relaxed expressive posture; no automatic extra exposure"
    ],
    "bold": [
     "대담한 의상선과 자신감 있는 태도로 강도를 높여요.",
     "bold outfit lines and confident demeanor; honor chosen coverage"
    ],
    "strong": [
     "선택한 장면 안에서 의상·태도의 존재감을 가장 강하게 해요.",
     "maximal styling presence within the scene; retain chosen exposure and anatomy"
    ]
   },
   "skin_exposure": {
    "low": [
     "목·손 정도의 제한된 노출이에요. 직접 지정한 의상이 우선해요.",
     "mostly covered clothing, limited neck/hand exposure unless outfit is explicit"
    ],
    "moderate": [
     "팔이나 종아리 등 일부 부위를 드러내요. 가슴·골반은 가려요.",
     "some exposed arms or lower legs, with chest and pelvis covered"
    ],
    "bold": [
     "어깨·등·복부·다리에서 장면에 맞는 부위를 더 드러내요. 가슴·골반은 가려요.",
     "more scene-appropriate shoulder, back, midriff or leg exposure; cover chest and pelvis"
    ]
   },
   "action_level": {
    "mostly posed": [
     "한 장 안에서 잠시 멈추거나 자세를 유지하는 순간이에요.",
     "a paused or held moment of the selected activity"
    ],
    "balanced": [
     "자세를 읽기 쉬운 가벼운 동작의 한 순간이에요. 컷 수 비율이 아니에요.",
     "a readable moment of gentle movement, not a ratio of multiple images"
    ],
    "mostly active": [
     "선택한 활동을 실제로 수행하는 중간 순간이에요. 포즈 선택과 충돌하면 포즈를 유지해요.",
     "an active mid-action moment compatible with the selected pose"
    ]
   },
   "source_influence": {
    "subtle": [
     "책의 특징을 작은 장신구 하나로만 보여줘요. 옷은 장면의 옷 그대로예요.",
     "her book shows only as one small accessory; the outfit keeps its own colours and patterns"
    ],
    "balanced": [
     "장신구 하나와 주변 사물 하나로 책의 특징을 보여줘요. 옷에는 넣지 않아요.",
     "her book shows as one accessory and one object in the scene; the outfit keeps its own colours and patterns"
    ],
    "strong": [
     "장신구와 주변 사물 몇 가지로 책을 분명히 알아보게 해요. 옷의 색·무늬는 여전히 장면의 옷 그대로예요. 갑옷이나 들고 있는 책은 더하지 않아요.",
     "her book is clearly recognizable through a few accessories and props in the scene, never through the outfit's colours, patterns or cut; no new armor or carried books"
    ]
   },
   "separates_preference": {
    "balanced": [
     "장면에 맞춰 원피스나 상하의 조합을 선택해요. 둘을 겹치라는 뜻은 아니에요.",
     "choose either a one-piece outfit or separates to suit the scene"
    ],
    "prefer separates": [
     "옷 칸이나 장면 예시에 적힌 옷이 없으면 상의·하의를 나눈 조합을 선호해요.",
     "prefer separate top and bottom unless Outfit or the Example scene names a garment, which wins"
    ],
    "strongly prefer separates": [
     "옷 칸이나 장면 예시에 적힌 옷이 없으면 상의·하의 조합을 기본으로 해요.",
     "use separate top and bottom by default; a garment named in Outfit or the Example scene takes priority"
    ]
   }
  };
  /* 폼 초상의 연출 — 갈래·예시. pkm 의 전투 연출에서 왔고 무장 고르기는 뺐다(책은 빈손) */
  const ACTION_CATEGORIES = [
   {
    "key": "ready",
    "label": "전투 준비·대치",
    "description": "공격 전의 긴장감과 준비 자세를 보여줘요.",
    "prompt": "Stage a tense preparation or standoff with deliberate balance and a readable costume, before an exchange begins.",
    "examples": [
     {
      "key": "ready_guard",
      "label": "경계 자세",
      "description": "주변을 살피며 무게중심을 낮추고 다음 움직임을 준비해요.",
      "prompt": "Scan the surroundings from a balanced guard stance with one foot ready to move."
     },
     {
      "key": "ready_corner",
      "label": "엄폐물 뒤 상황 확인",
      "description": "엄폐물 옆에서 상체를 살짝 돌려 진로를 확인해요.",
      "prompt": "Check a route from beside low cover, keeping hands and the her costume readable."
     },
     {
      "key": "ready_charge",
      "label": "기술 준비",
      "description": "기존 장비나 타입 모티프에 맞춰 기술을 준비하는 자세예요.",
      "prompt": "Prepare an established source-derived technique with a deliberate hand position; emission depends on the power and effects selections."
     }
    ]
   },
   {
    "key": "melee",
    "label": "근접 공방",
    "description": "거리 좁히기·타격·반격처럼 가까운 거리의 움직임을 보여줘요.",
    "prompt": "Stage a close-range exchange with coherent footwork, readable hands and a clear line of action.",
    "examples": [
     {
      "key": "melee_step",
      "label": "거리 좁히기",
      "description": "짧은 스텝으로 접근하며 몸과 손의 방향을 맞춰요.",
      "prompt": "Close distance with one compact step and a coordinated torso and hand position."
     },
     {
      "key": "melee_counter",
      "label": "비껴서 반격",
      "description": "공격선을 비껴난 뒤 상체와 팔을 돌려 반격해요.",
      "prompt": "Pivot off an implied attack line into a controlled counter motion, keeping an unseen opponent outside the frame."
     },
     {
      "key": "melee_sweep",
      "label": "넓은 궤적의 일격",
      "description": "장비나 팔의 이동 궤적이 한눈에 보이는 동작이에요.",
      "prompt": "Execute a broad but anatomically coherent strike arc with an unarmed motion."
     }
    ]
   },
   {
    "key": "ranged",
    "label": "원거리 기술",
    "description": "기존 장비나 원본 타입의 기술로 먼 대상을 겨냥해요.",
    "prompt": "Stage a ranged technique using the established source-derived capability or her costume, with a readable aim and release direction.",
    "examples": [
     {
      "key": "aimed_release",
      "label": "겨냥 후 발동",
      "description": "한 방향을 향해 자세를 잡고 기술을 발동해요.",
      "prompt": "Aim an existing source-derived ability toward an off-frame target and stage a controlled release."
     },
     {
      "key": "ranged_sidestep",
      "label": "옆으로 이동하며 겨냥",
      "description": "옆걸음 중에도 시선과 기술 방향을 유지해요.",
      "prompt": "Track an off-frame target during a lateral step with a stable torso and readable aiming direction."
     },
     {
      "key": "ranged_recover",
      "label": "발동 후 자세 회복",
      "description": "기술을 쓴 뒤 몸의 균형과 손 위치를 되돌려요.",
      "prompt": "Recover balance after a ranged action, returning the hands to a controlled position."
     }
    ]
   },
   {
    "key": "evasion",
    "label": "회피·지상 기동",
    "description": "옆으로 피하거나 지형을 이용해 빠르게 이동해요.",
    "prompt": "Stage evasive ground movement with believable weight transfer, clear limb separation and a readable travel path.",
    "examples": [
     {
      "key": "evasion_side",
      "label": "측면 회피",
      "description": "몸을 옆으로 옮겨 가상의 공격선을 벗어나요.",
      "prompt": "Shift laterally away from an implied incoming attack with a planted push-off foot."
     },
     {
      "key": "evasion_cover",
      "label": "엄폐물 사이 이동",
      "description": "낮은 장애물 사이를 이동하며 다음 진로를 살펴요.",
      "prompt": "Move between low obstacles while checking the next route and keeping the existing silhouette recognizable."
     },
     {
      "key": "evasion_slide",
      "label": "낮게 미끄러져 피하기",
      "description": "무게중심을 낮춰 짧게 미끄러지고 다시 균형을 잡아요.",
      "prompt": "Perform a short low slide into a stable recovery, with clear knees, feet and hand placement."
     }
    ]
   },
   {
    "key": "aerial",
    "label": "도약·공중 기동",
    "description": "점프·공중 선회·착지 장면이에요. 비행 장비가 없으면 짧은 도약으로 표현해요.",
    "prompt": "Stage a jump or aerial maneuver appropriate to existing capability; without established flight use a brief physical leap, not sustained flight.",
    "examples": [
     {
      "key": "aerial_leap",
      "label": "장애물 넘기",
      "description": "낮은 장애물을 뛰어넘으며 팔과 다리를 자연스럽게 펴요.",
      "prompt": "Leap over a low obstacle with a plausible trajectory and clearly separated limbs."
     },
     {
      "key": "aerial_turn",
      "label": "공중 방향 전환",
      "description": "점프 중 몸을 살짝 틀거나 기존 추진 장비로 방향을 바꿔요.",
      "prompt": "Change direction during a jump, or without adding wings."
     },
     {
      "key": "aerial_landing",
      "label": "착지 순간",
      "description": "발이 닿고 무릎이 충격을 받는 순간을 보여줘요.",
      "prompt": "Land with bent knees and a stable contact point; any dust or impact effect follows the selected effect amount."
     }
    ]
   },
   {
    "key": "defense",
    "label": "방어·호위",
    "description": "막아내기·버티기·진로 보호처럼 방어 중심의 동작이에요.",
    "prompt": "Stage a defensive action with a stable center of gravity and a clear protected direction, using the selected form's existing protection.",
    "examples": [
     {
      "key": "defense_brace",
      "label": "정면에서 버티기",
      "description": "발을 넓게 디디고 기존 방어 구조로 힘을 받아내요.",
      "prompt": "Brace against an implied force through the feet and the existing protective surfaces."
     },
     {
      "key": "defense_intercept",
      "label": "공격선 가로막기",
      "description": "보호할 방향 앞으로 나서며 방어 자세를 취해요.",
      "prompt": "Step across an implied attack line to protect an off-frame route, using her costume or a guarded stance."
     },
     {
      "key": "defense_retreat",
      "label": "방어하며 물러나기",
      "description": "상체의 경계를 유지하면서 한 발씩 뒤로 물러나요.",
      "prompt": "Take a measured backward step while maintaining a coherent guard and a clear protected direction."
     }
    ]
   },
   {
    "key": "rescue",
    "label": "구조·현장 돌파",
    "description": "위험한 구역을 통과하거나 길을 확보하는 임무 장면이에요.",
    "prompt": "Stage a non-graphic rescue or hazardous-terrain maneuver with a specific practical task and readable surroundings.",
    "examples": [
     {
      "key": "rescue_reach",
      "label": "안전한 쪽으로 손 내밀기",
      "description": "안정적으로 발을 딛고 화면 밖 대상을 돕는 손짓을 해요.",
      "prompt": "Plant the feet securely and reach toward an off-frame person to guide them toward safety, without adding another visible human body."
     },
     {
      "key": "rescue_route",
      "label": "통로 확보",
      "description": "기존 능력과 장비에 맞는 작은 장애물을 옮기거나 우회해요.",
      "prompt": "Clear or bypass a manageable obstacle using only established strength to open a safe route."
     },
     {
      "key": "rescue_crossing",
      "label": "불안정한 지형 건너기",
      "description": "흔들리는 발판을 확인하며 중심을 잡고 이동해요.",
      "prompt": "Cross uneven ground cautiously, testing the next foothold with controlled weight transfer."
     }
    ]
   },
   {
    "key": "training",
    "label": "훈련·기술 시연",
    "description": "자세 연습·표적 훈련·기술 점검처럼 동작이 잘 읽히는 장면이에요.",
    "prompt": "Stage a controlled training or demonstration activity with a specific task and readable technique.",
    "examples": [
     {
      "key": "training_form",
      "label": "기본 동작 연습",
      "description": "한 동작의 발·골반·팔 배치를 또렷하게 보여줘요.",
      "prompt": "Practice one precise technique with clearly readable foot, torso and hand alignment."
     },
     {
      "key": "training_target",
      "label": "표적 훈련",
      "description": "작은 훈련용 표적을 향해 기존 능력의 방향을 맞춰요.",
      "prompt": "Align an existing capability or a physical technique toward a simple practice target appropriate to the chosen technique."
     },
     {
      "key": "training_system",
      "label": "장비 작동 점검",
      "description": "폼을 바꾸지 않고 의상의 상태를 살펴요.",
      "prompt": "Check the operation of an her costume unit in the selected costume without opening or changing the form."
     }
    ]
   },
   {
    "key": "aftermath",
    "label": "전투 직후·정비",
    "description": "동작을 마친 뒤 자세를 추스르거나 장비를 확인하는 순간이에요.",
    "prompt": "Stage the immediate aftermath of exertion, focusing on recovery, awareness or an costume check without inventing damage.",
    "examples": [
     {
      "key": "after_breath",
      "label": "호흡과 자세 정돈",
      "description": "동작이 끝난 뒤 어깨를 낮추고 균형을 회복해요.",
      "prompt": "Pause after exertion to settle the shoulders and regain a stable breathing posture."
     },
     {
      "key": "after_check",
      "label": "장비 상태 확인",
      "description": "팔이나 장착부를 살펴보며 이상 여부를 확인해요.",
      "prompt": "Inspect a costume detail on her forearm with a focused glance, preserving the established costume."
     },
     {
      "key": "after_watch",
      "label": "주변 경계 유지",
      "description": "몸의 긴장을 조금 풀되 시선은 주변을 살펴요.",
      "prompt": "Relax slightly after an exchange while keeping an alert gaze toward the surrounding area."
     }
    ]
   }
  ];
  const ACTION_POSES = [
   {
    "key": "combat_ready",
    "label": "기본 전투 자세",
    "description": "한 발을 앞에 두고 손과 시선을 다음 동작에 맞춰요.",
    "prompt": "Use a balanced combat-ready stance with one foot forward and hands prepared for the chosen action."
   },
   {
    "key": "low_guard",
    "label": "낮은 가드",
    "description": "무릎을 굽히고 몸 가까이 손을 두어 안정감을 줘요.",
    "prompt": "Lower the center of gravity with bent knees and a compact guard close to the torso."
   },
   {
    "key": "forward_lunge",
    "label": "전방 런지",
    "description": "앞발에 무게를 옮기며 한 방향으로 길게 내디뎌요.",
    "prompt": "Lunge forward with controlled weight transfer and a planted leading foot."
   },
   {
    "key": "cross_step",
    "label": "교차 스텝",
    "description": "발을 짧게 교차해 이동 방향을 바꾸는 순간이에요.",
    "prompt": "Use a brief crossing step to redirect travel with clearly separated legs and stable balance."
   },
   {
    "key": "pivot_strike",
    "label": "회전 동작",
    "description": "발을 축으로 골반과 어깨를 함께 돌려요.",
    "prompt": "Pivot through the feet, hips and shoulders in a coordinated turning action without twisting the anatomy unnaturally."
   },
   {
    "key": "aiming",
    "label": "겨냥 자세",
    "description": "손이나 기존 장비를 한 방향으로 안정적으로 향하게 해요.",
    "prompt": "Align the hands toward one clear off-frame direction in a stable aiming posture."
   },
   {
    "key": "braced_shot",
    "label": "지지하며 발동",
    "description": "발을 단단히 디디고 기술의 반동이나 힘을 받아요.",
    "prompt": "Brace through the feet and torso for the selected technique, retaining the original body proportions."
   },
   {
    "key": "side_dodge",
    "label": "옆으로 피하기",
    "description": "한쪽 발로 밀어내며 상체를 옆으로 이동해요.",
    "prompt": "Push laterally from one planted foot into a clear sidestep dodge."
   },
   {
    "key": "low_slide",
    "label": "낮은 슬라이딩",
    "description": "한쪽 다리를 펴고 몸을 낮춰 짧게 미끄러져요.",
    "prompt": "Perform a low controlled slide with one leg extended and readable foot, knee and hand placement."
   },
   {
    "key": "running_start",
    "label": "달려 나가는 순간",
    "description": "앞으로 기울며 첫 발을 힘 있게 내디뎌요.",
    "prompt": "Lean into the first driving step of a run, with a coherent push-off and arm swing."
   },
   {
    "key": "aerial_twist",
    "label": "공중 선회",
    "description": "도약 중 어깨와 골반을 조금 돌려 방향을 바꿔요.",
    "prompt": "Turn slightly in a brief airborne leap with coherent torso alignment and separated limbs."
   },
   {
    "key": "diving",
    "label": "전방 도약",
    "description": "양발로 밀어 전방으로 짧게 뛰어드는 자세예요.",
    "prompt": "Launch into a short forward leap with a plausible trajectory; do not imply sustained flight without established capability."
   },
   {
    "key": "landing",
    "label": "착지 자세",
    "description": "무릎과 발목을 굽혀 충격을 받으며 중심을 잡아요.",
    "prompt": "Land with knees and ankles absorbing the motion and a believable contact point."
   },
   {
    "key": "shielding",
    "label": "진로를 가로막는 자세",
    "description": "한쪽 팔이나 기존 방어 장비를 앞세워 통로를 지켜요.",
    "prompt": "Place the body across a protected route with a guarded arm or an existing defensive unit held forward."
   },
   {
    "key": "braced_stance",
    "label": "묵직하게 버티기",
    "description": "두 발을 넓게 딛고 허리와 어깨를 안정적으로 유지해요.",
    "prompt": "Plant both feet firmly in a grounded bracing stance, using posture rather than a larger body to convey weight."
   },
   {
    "key": "rescue_reach",
    "label": "손을 내밀어 돕기",
    "description": "안정적으로 서거나 한쪽 무릎을 대고 손을 앞으로 내밀어요.",
    "prompt": "Reach one hand forward in a stable supported rescue gesture while preserving clear fingers and limb anatomy."
   }
  ];
  const ACTION_CONTROLS = [
   {
    "key": "timing",
    "label": "동작 타이밍",
    "description": "한 동작에서 어느 순간을 잡을지 정해요. 자동이면 선택한 예시를 따라요.",
    "promptLabel": "Action timing",
    "options": [
     {
      "key": "before",
      "label": "동작 직전",
      "description": "움직이기 바로 전의 준비와 긴장감을 잡아요.",
      "prompt": "Capture the instant immediately before the chosen action begins."
     },
     {
      "key": "windup",
      "label": "힘을 모으는 순간",
      "description": "발·허리·팔에 힘이 모이는 준비 동작을 잡아요.",
      "prompt": "Capture the action's wind-up with coordinated weight loading, without anatomical enlargement."
     },
     {
      "key": "release",
      "label": "동작 전개",
      "description": "기술이나 이동이 시작되어 궤적이 읽히는 순간이에요.",
      "prompt": "Capture the selected movement or technique as it unfolds with a clear direction."
     },
     {
      "key": "impact",
      "label": "접촉·착지 순간",
      "description": "타격·방어·착지처럼 힘이 닿는 순간을 잡아요.",
      "prompt": "Capture the contact or landing beat appropriate to the activity, keeping anatomy and costume readable."
     },
     {
      "key": "followthrough",
      "label": "후속·회복 동작",
      "description": "기술을 마치고 균형을 되찾는 순간이에요.",
      "prompt": "Capture a controlled follow-through or balance recovery after the selected action."
     }
    ]
   },
   {
    "key": "power",
    "label": "기술·에너지 발현",
    "description": "책의 고유 규칙에 맞는 힘이 드러나는 단계를 정해요. 개방(명장면)을 자동으로 켜지 않아요.",
    "promptLabel": "Power manifestation",
    "options": [
     {
      "key": "none",
      "label": "발현 없음",
      "description": "새로운 속성 에너지 없이 동작과 장비만 보여줘요.",
      "prompt": "Add no newly emitted elemental energy or charging aura; preserve only the design's established sensor lights."
     },
     {
      "key": "subtle",
      "label": "약한 기운",
      "description": "기존 장치 주변에 작은 타입별 기운만 표현해요.",
      "prompt": "Show a restrained hint of the source-appropriate ability localized to its existing origin point, if effects are enabled."
     },
     {
      "key": "concentrated",
      "label": "응축·준비",
      "description": "작은 범위에 힘이 모이는 준비 상태예요.",
      "prompt": "Suggest source-appropriate power gathering in a compact area at an established functional point, without changing the costume."
     },
     {
      "key": "released",
      "label": "기술 발동",
      "description": "원본 타입의 기술이 한 방향으로 뻗는 순간이에요.",
      "prompt": "Show a source-appropriate technique directed along the action line, using an established emission point and respecting the selected effects amount."
     },
     {
      "key": "residual",
      "label": "발동 후 잔류",
      "description": "기술을 마친 뒤 남은 작은 기운을 표현해요.",
      "prompt": "Show only a fading source-appropriate trace after the technique, if effects are enabled; do not tear or change the costume."
     }
    ]
   },
   {
    "key": "effects",
    "label": "효과량",
    "description": "섬광·잔상·먼지 같은 부가 효과의 양을 정해요. 없음이면 기술 선택과 관계없이 추가 효과를 억제해요.",
    "promptLabel": "Added effects",
    "options": [
     {
      "key": "none",
      "label": "없음",
      "description": "섬광·잔상·먼지 없이 자세와 구조가 또렷하게 보여요.",
      "prompt": "No added VFX: omit attack glows, auras, trails, motion blur, impact flashes, dust and debris; use the pose to communicate the action."
     },
     {
      "key": "minimal",
      "label": "적게",
      "description": "접촉점이나 기술 발생점에만 작은 효과를 넣어요.",
      "prompt": "Use minimal localized effects at contact or emission points, with the face, hands and costume edges unobscured."
     },
     {
      "key": "balanced",
      "label": "보통",
      "description": "동작의 방향이 보이되 인물과 장비를 가리지 않아요.",
      "prompt": "Use moderate effects to clarify the action direction while keeping the character and defining costume unobscured."
     },
     {
      "key": "dramatic",
      "label": "강하게",
      "description": "선택한 동작 주변의 효과를 강조하되 얼굴과 주요 구조는 남겨요.",
      "prompt": "Use strong but controlled source-appropriate action effects around the movement, preserving clear face, hands, body contours and defining costume."
     }
    ]
   },
   {
    "key": "speed",
    "label": "속도감",
    "description": "정지된 힘부터 순간 가속까지 움직임의 인상을 정해요. 체형과 카메라 거리는 유지해요.",
    "promptLabel": "Motion impression",
    "options": [
     {
      "key": "still",
      "label": "순간 정지",
      "description": "빠른 동작도 멈춘 프레임처럼 선명하게 보여요.",
      "prompt": "Freeze a readable instant with crisp contours and no speed blur, even if the underlying action is fast."
     },
     {
      "key": "slow",
      "label": "느리고 묵직하게",
      "description": "천천히 힘을 싣는 자세와 안정적인 접지감을 강조해요.",
      "prompt": "Convey slow deliberate power through weight transfer and grounded posture, not a thicker body or a larger costume."
     },
     {
      "key": "fast",
      "label": "빠르고 경쾌하게",
      "description": "짧은 스텝과 분명한 이동 방향으로 속도를 보여줘요.",
      "prompt": "Convey brisk movement through coordinated pose and a clear travel direction; any trails follow the effects selection."
     },
     {
      "key": "burst",
      "label": "순간 가속",
      "description": "밀어내는 첫 동작과 강한 방향성을 강조해요.",
      "prompt": "Convey a sudden acceleration through a strong push-off and compact action line, without adding boosters or changing the selected form."
     }
    ]
   },
   {
    "key": "environment",
    "label": "전장·장소",
    "description": "액션이 벌어질 기본 환경을 고르고, 장소·상황 입력으로 날씨와 시간을 덧붙일 수 있어요.",
    "promptLabel": "Action environment",
    "options": [
     {
      "key": "training_ground",
      "label": "훈련장",
      "description": "낮은 장애물과 훈련용 표적이 있는 공간이에요.",
      "prompt": "Set the action in a clear training area with restrained practice obstacles appropriate to the chosen activity."
     },
     {
      "key": "city",
      "label": "도시 거리",
      "description": "도로와 건물 사이의 진로를 활용해요.",
      "prompt": "Set the action on a readable city street with clear movement space and restrained background detail."
     },
     {
      "key": "forest",
      "label": "숲·초목 지대",
      "description": "나무와 낮은 식물 사이에서 이동과 교전을 표현해요.",
      "prompt": "Set the action in woodland with spaced trunks, low plants and a readable route around the woman."
     },
     {
      "key": "rocky",
      "label": "암석·협곡",
      "description": "바위와 단단한 지면으로 접지감과 높낮이를 보여줘요.",
      "prompt": "Set the action on rocky terrain with stable ledges and a clear ground plane."
     },
     {
      "key": "coast",
      "label": "물가·해안",
      "description": "물과 젖은 지면을 활용하되 동작이 잘 보이게 해요.",
      "prompt": "Set the action at a shoreline or shallow waterside area with a clear footing and restrained reflections."
     },
     {
      "key": "ruins",
      "label": "유적·폐허",
      "description": "기둥과 낮은 잔해로 엄폐와 통로를 만들어요.",
      "prompt": "Set the action among old stone ruins with low obstacles and a readable passage, without forcing explosions or debris clouds."
     },
     {
      "key": "grassland",
      "label": "초원·평원",
      "description": "넓은 지면에서 동작과 실루엣을 또렷하게 보여줘요.",
      "prompt": "Set the action on an open grassy plain with a clear horizon and enough contextual detail for depth."
     },
     {
      "key": "indoor",
      "label": "실내 시설",
      "description": "단단한 바닥과 설비가 있는 실내에서 동작을 보여줘요.",
      "prompt": "Set the action in a spacious indoor facility with functional structures and a clear movement path."
     }
    ]
   }
  ];

  root.AtelierSpec = { BOOK_LINES, ASPECT_FRAME, KOREA_LAST_EXPIRED_DEATH, EXAMPLE_DETAIL, AGE_DEFAULT, AGE_LINES, AGE_KEEP, FORM_EXPOSURE, GARMENT_LAYER, FORM_EXPOSURE_KEYS, FORM_EXPOSURE_DEFAULT, STAGE_EN, VOCAB_EN, FACE_PARAM, SIL_PARAM, PARAM_DEFS, PARAM_GUIDES, PARAM_GROUP_HELP, PARAM_HELP, HAIR_LENGTH_LIMITS, EYE_CONTOURS, COLOR_HEX, COLOR_KEYS, BODY_FIG, HAIR_FIG, IDENTITY_GROUPS, IDENTITY_EXCLUDED, FACE_KEYS, CATS, EXAMPLE_MAP, EX_NOTE, CAT_KO, EXPRESSION_OPTIONS, EXPRESSION_DETAIL, POSE_OPTIONS, POSE_GUIDES, ORIENTATION_OPTIONS, ORIENTATION_GUIDES, LOOK_BACK, FRAME_OPTIONS, FRAME_GUIDES, LENS_OPTIONS, LENS_GUIDES, LOCAL_AXES, ADVANCED_OPTIONS, ADVANCED_LABELS, ADV_AXIS, ADV_VAL, SCENE_AXIS_GUIDES, ACTION_CATEGORIES, ACTION_POSES, ACTION_CONTROLS };
})(window);
