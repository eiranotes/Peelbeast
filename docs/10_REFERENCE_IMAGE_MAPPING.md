# 10 — 레퍼런스 이미지 매핑

## 1. 원본

업로드된 아트는 `assets/source/reference/legacy-atlas-v0.8.webp` 하나다 (1024×1500, 알파 없음).
`npm run assets:reference`가 v0.8 좌표표에 따라 32개 크롭으로 잘라
`public/assets/references/`에 넣고, 유효성 리포트를 `legacy-atlas-report.json`에 쓴다.

시트에 실제로 들어 있는 것:

1. **스테이지 스크린샷** — 링 노트 위의 종이 스티커 캐릭터, 좌상단 `STAGE 4` 태그,
   우상단 `Enemy HP 16` 바, 하단 `DRIFT / SLASH / COPY / BOOST` 4단 액션 레일
2. **히어로 카드** — 토스트 머리 고양이, 가슴에 테이프로 붙인 폭탄, 빨간 리본 달린 가위
3. **적 스티커** — 테이프 거미(테이프 롤 몸통 + 클립 다리), 연필 쥐(집게 클립),
   가위 까마귀(반창고 붙은 검은 깃털)
4. **소품** — 우산, 연필 창, 커피 머그, 연필꽂이, 찢어진 종이
5. **UI 조각** — 픽셀 손 커서 + `TO PRESS`, `GHOST` / `BOX` 라벨 칩

## 2. 매핑 표

`추출 요소`는 이 레퍼런스에서 실제로 가져온 것을 뜻한다.
`교체 상태`의 의미는 `05_ASSET_CATALOG_SPEC.md` §2.1을 따른다.

| Reference image | Used for | Extracted elements | Current asset IDs | Replacement status |
|---|---|---|---|---|
| `hero_full` | 플레이어 캐릭터 전체 | 실루엣, 자세, 팔레트, 키스컷 테두리 — **그리고 배경 제거로 원본 픽셀 자체를 복원** | `art.hero_card` (원본 복원), `body.cat` (신규 저작) | `art.hero_card` **production** / `body.cat` placeholder |
| `part_toast` | 토스트 머리 | 빵 껍질 비율, 고양이 얼굴 배치, 크림빛 속살 | `part.head.toast_helm` | placeholder |
| `part_box_shell` | 박스 껍질 | 골판지 색, 접힌 플랩 | `part.head.box_shell` | placeholder |
| `part_ghost_charm` | 유령 후드 | 물결 밑단, 둥근 눈, 볼 홍조 | `part.head.ghost_hood` | placeholder |
| `part_scissors` | 가위 | 빨간 손잡이 링, 은색 날, **묶인 리본** | `part.hand.scissors` | placeholder |
| `part_spear` | 연필 창 | 육각 몸통, 깎인 촉, 테이프 결속, 지우개 꽁지 | `part.hand.pencil_spear` | placeholder |
| `part_umbrella` | 우산 | 빨강/파랑 패널 배치, 갈고리 손잡이 | `part.hand.umbrella_hook` | placeholder |
| `part_bomb` | 폭탄 배 | 검은 구, 심지, 하이라이트, **테이프로 고정된 모습** | `part.core.bomb_belly` | placeholder |
| `part_coffee` | 커피 컵 | 머그 형태, 커피콩 로고, 김 | `part.core.coffee_cup` | placeholder |
| `part_tape_roll` | 테이프 롤 | 도넛 형태, 베이지 톤 — *원본 크롭은 UI 라벨을 담은 오염 영역이었다* | `part.core.tape_roll` | placeholder |
| `part_ribbon` | 리본 매듭 | 빨간 나비 매듭, 늘어진 꼬리 | `part.trinket.ribbon_knot` | placeholder |
| `part_eye_sticker` | 눈 스티커 | 눈 형태 — *원본 크롭은 `ICKER` 글자를 담은 오염 영역이었다* | `part.trinket.eye_sticker` | placeholder |
| `part_patchbread` | 빵 패치 | 빵 조각 + 꿰맨 자국 | `part.trinket.bread_patch` | placeholder |
| `enemy_pencil_rat` | 연필 쥐 | 회색 털, 집게 클립, 훔친 메모, 긴 꼬리 | `enemy.pencil_rat` (신규 저작), `ref.enemy_rat` (게임 내 액자) | placeholder — **원본 아트로 교체 필요** |
| `enemy_tape_spider` | 테이프 거미 | 테이프 롤 몸통, 클립 다리, 잉크 주머니 | `enemy.tape_spider`, `ref.enemy_spider` | placeholder — **원본 아트로 교체 필요** |
| `enemy_scissor_crow` | 가위 까마귀 | 검은 깃털, 가위 부리, 반창고 | `enemy.scissor_crow`, `ref.enemy_crow` | placeholder — **원본 아트로 교체 필요** |
| `stage_bg_base` | 전장 배경 | 링 노트, 괘선, 붉은 여백선, 갈색 책상, 테이프 장식 | `bg.desk`, `bg.nest`, `ref.stage` (상점 액자) | placeholder |
| `prop_pencilcup_left` | 연필꽂이 소품 | 컵 + 삐져나온 연필들 | `prop.pencil_cup`, `ref.pencilcup` | placeholder |
| `prop_tornpaper_right` | 찢어진 메모 | 찢긴 밑단, 괘선 | `prop.torn_note` | placeholder |
| `prop_hold_card` | UI 카드 | 점선 테두리, 종이 태그 형태 | `ui.tag`, `ref.holdcard` | placeholder |
| `icon_*` (10종) | — | **없음. 전부 빈 영역이었다** (`01_REPOSITORY_AUDIT.md` §2.2) | — | 사용 불가 |
| — (레퍼런스 없음) | 클립 나방 | 신규 디자인 | `enemy.clip_moth` | placeholder |
| — (레퍼런스 없음) | 상태 아이콘 11종 | 신규 디자인 | `icon.status.*` | placeholder |
| — (레퍼런스 없음) | 이펙트 5종 | 신규 디자인 | `fx.*` | placeholder |

## 3. 배경 제거 결과

`scripts/build-reference-cutouts.mjs`는 이미지 테두리에서 안쪽으로 배경을 flood fill하고
가장 큰 덩어리를 남겨 알파 컷아웃을 만든다.

**성공: `hero_full` → `art.hero_card`**
토스트 고양이가 흰 스티커 테두리를 포함해 깨끗하게 분리됐다. `production` 상태로 출하하며,
타이틀 화면에 조립된 캐릭터 옆에 "ORIGINAL ART"로 표시된다.

**실패: 적 3종**
크롭이 175×230 수준의 절반 해상도 스크린샷이고, 피사체 팔레트와 배경 팔레트가 겹친다
(회녹색 벽 위의 회색 쥐, 베이지 종이 위의 베이지 테이프 롤, 갈색 책상 위의 검은 깃털).
tolerance를 19부터 46까지 훑었으나, 배경을 지우는 값은 피사체도 먹고
피사체를 살리는 값은 벽 조각을 남겼다. 중간값은 없었다.

따라서 적 3종은 레퍼런스를 보고 새로 저작한 스프라이트로 출하하고,
원본 크롭은 두 곳에 남긴다: `/dev/assets`에서 목표 이미지로 나란히,
그리고 **전투 화면 적 생체정보 카드에 액자 초상으로**.

## 4. 게임 안에서 원본 아트가 보이는 곳

원본은 알파가 없는 회화적 스크린샷이라 캐릭터 위에 레이어로 올릴 수 없다.
대신 **책상에 테이프로 붙인 사진**으로 액자에 넣어 쓴다 (`RefPhoto` 컴포넌트).

| 화면 | 원본 아트 |
|---|---|
| Title | `art.hero_card` — 배경 제거된 원본 스티커, 조립 캐릭터 옆 |
| Battle | 현재 적의 원본 초상 (`ref.enemy_rat` / `ref.enemy_spider` / `ref.enemy_crow`) |
| Event | 이벤트별 원본 크롭 (`ref.tape`, `ref.pencilcup`, `ref.boxshell`, `ref.stage`, `ref.toast` …) |
| Shop | `ref.stage` — "desk, as drawn" |
| `/dev/assets` | 19개 `ref.*` 전부, 각 프로덕션 에셋과 나란히 |

## 5. 시각 방향 준수

| 레퍼런스가 보여주는 것 | v0.8 | v0.9 |
|---|---|---|
| 링 노트 종이 위 스테이지 | 스크린샷 전체를 배경에 깖 | 노트·괘선·링·테이프를 요소로 재구성 (`bg.desk`) |
| 캐릭터가 화면의 주인공 | 420 px 카드가 390 px 히어로를 덮음 | 무대가 화면 최대 블록, 생체정보는 위쪽 얇은 띠 |
| 4단 아이콘 액션 레일 | 2×2 텍스트 버튼 | 아이콘 + 이름 + 효과의 큼직한 버튼 8개 |
| 흰 키스컷 외곽선, 불규칙 절단 | 직사각 크롭, 균일 라운드 | SVG 필터로 실루엣마다 흔들리는 키스컷 테두리 |
| 테이프·클립·메모지 장식 | 초록 사각형 1개 | 패널 테이프, 종이 클립, 액자 사진, 손으로 자른 `clip-path` |
| 상태를 아이콘으로 | 텍스트 그리드 | 아이콘 + 이름 + 수치 칩 |

## 6. 라이선스

| 자산 | 출처 | 라이선스 |
|---|---|---|
| `assets/source/reference/legacy-atlas-v0.8.webp` 및 그 크롭 | v0.8 업로드에서 상속 | **불명.** 프로젝트 내부 참조용으로만 사용한다. 게임에 들어가는 것은 §4의 액자 사용과 `art.hero_card` 뿐이며, 배포 전 권리 확인이 필요하다 |
| `assets/source/sprites/*.svg` 및 그 래스터 | 이 저장소에서 저작 (`scripts/sprite-sources.mjs`) | CC0-1.0 |

카탈로그의 모든 엔트리가 `license`와 `source` 필드를 갖고 있고, `/dev/assets`에 표시된다.
