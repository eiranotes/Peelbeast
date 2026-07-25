# 11 — 아트 디렉션 & 에셋 제작 브리프

**목적**: 아트를 일괄 제작하기 위한 단일 발주 문서.
이 문서만 보고 작업하면 게임에 그대로 들어간다. 코드 수정은 필요 없다.

**현재 상태**: 68개 에셋 중 48개가 `placeholder`(손으로 저작한 벡터, 교체 대상),
1개가 `production`, 19개가 `reference`(원본 자료, 게임에 렌더되지 않음).

**교체 방법**: §8. 파일을 넣고 카탈로그 한 줄만 고치면 된다.

---

## 1. 디자인 톤

### 1.1 한 문장

> 갈색 나무 책상 위 크림색 링 노트에, 손으로 오려 붙인 종이 스티커들이 살아 움직인다.

### 1.2 반드시 지켜야 하는 것

| # | 규칙 | 이유 |
|---|---|---|
| 1 | **키스컷 스티커** — 모든 캐릭터·파츠·적은 실루엣을 감싸는 두꺼운 오프화이트 테두리를 가진다 | 이 게임의 정체성. "붙였다 떼는 것"이 시각적으로 성립해야 한다 |
| 2 | **손으로 자른 가장자리** — 테두리 외곽선이 미세하게 불규칙하다. 벡터 툴의 완벽한 오프셋 금지 | 아날로그 공예물 느낌 |
| 3 | **알파 채널 필수** — 배경 없는 PNG | 파츠가 몸체 위에 레이어로 올라간다 |
| 4 | **드롭섀도** — 아래쪽으로 부드럽게. 스티커가 책상 위에 떠 있다는 느낌 | 레이어 분리감 |
| 5 | **가시적인 잉크 선** — 채색 안쪽에 어두운 갈색 윤곽선 | 과슈·수채 일러스트 톤 |
| 6 | **둥글고 귀여운 비율** — 머리가 크고 손발이 짧다 | 레퍼런스의 캐릭터 비율 |

### 1.3 절대 하지 말 것

- ❌ 매끈한 SaaS/머티리얼 UI 톤, 균일한 라운드 사각형
- ❌ 사실적 렌더링, 3D 룩, 그라디언트 메시
- ❌ 파츠 안에 배경·다른 캐릭터·UI 글자가 섞여 들어가는 것 (v0.8의 실패)
- ❌ 알파 없는 사각 크롭
- ❌ 순백(`#ffffff`)이나 순흑(`#000000`) — 항상 따뜻하게 치우친 값

### 1.4 팔레트

`scripts/lib/paper.mjs`의 `PALETTE`가 코드상의 원본이다.

| 역할 | HEX | 용도 |
|---|---|---|
| 잉크 | `#3a2b1e` | 모든 윤곽선 |
| 잉크(연함) | `#5d4632` | 보조선, 수염, 스티치 |
| 종이 | `#f4e8ce` | 크림 종이 바탕 |
| 종이(밝음) | `#fbf4e2` | 하이라이트 면 |
| 키스컷 | `#fdfaf1` | **스티커 테두리 전용** |
| 책상 | `#8a6242` → `#6b492f` | 나무 바탕 |
| 털(밝음/기본/어두움) | `#c9d3dc` / `#8fa2b5` / `#6d8298` | 고양이 몸체 |
| 배 | `#f3e8d2` | 배·발바닥 |
| 빵 껍질 / 속살 | `#c08a4a` / `#f3e0b0` | 토스트·빵 패치 |
| 빨강 | `#b4533b` / `#8e3c28` | 리본, 가위 손잡이, 강조 |
| 파랑 | `#5b7396` / `#42566f` | 우산, 방어 계열 |
| 초록 | `#7e9166` / `#5f7049` | Glue, 안전 |
| 금색 | `#c4a05c` | Haste, 반짝임 |
| 보라 | `#8361a7` | 잉크, Frazzle |
| 금속 | `#c3c8cb` / `#8e979d` | 가위 날, 클립 |
| 검정 | `#2e2a28` | 폭탄, 까마귀 |

### 1.5 참고 이미지

`public/assets/references/` (32개 크롭, `npm run assets:reference`로 재생성).
게임 안에서는 `/#/dev/assets`에서 **현재 에셋과 원본을 나란히** 볼 수 있다 — 작업 중 이 화면을 띄워두면 좋다.

원본 시트에서 특히 참고할 것:

- `hero_full.png` — 캐릭터 비율, 채색 밀도, 키스컷 테두리 두께의 **정답**
- `stage_bg_base.png` — 링 노트, 괘선, 붉은 여백선, 테이프 장식의 배치
- `enemy_*.png` — 적 3종의 디자인 (사물로 만든 생물)
- `part_scissors.png` — 가위에 묶인 리본. 소품에 장식을 더하는 방식

원본 크롭 10개(`icon_*`)는 **빈 영역**이라 참고 가치가 없다. §7 참조.

---

## 2. 제작 사양

### 2.1 파일

| 항목 | 값 |
|---|---|
| 포맷 | PNG-32 (알파 필수). WebP도 가능하나 카탈로그 `file` 확장자를 맞출 것 |
| 색공간 | sRGB |
| 해상도 | §5 표의 `size`와 **정확히 일치**해야 한다 (`npm run assets:validate`가 검사) |
| 여백 | 드롭섀도가 잘리지 않도록 사방 최소 8 px 투명 여백 |
| 파일명 | 기존 파일명을 그대로 덮어쓰는 것이 가장 안전하다 |

### 2.2 크기 기준

표의 크기는 **렌더 크기의 2배**다. 전투 화면에서 몸체는 최대 300 px 폭으로 그려지고,
파츠는 그 폭에 `scale`을 곱한 크기가 된다. 2배로 만드는 것은 고DPI 대응이다.

원본을 더 크게 그린 뒤 표의 크기로 다운샘플해 납품하는 것을 권장한다.

### 2.3 앵커 (파츠 전용)

파츠는 **자기 이미지 안의 한 점**이 몸체의 부착점에 핀으로 꽂히는 방식으로 배치된다.

```
anchorX, anchorY  = 파츠 이미지 안의 정규화 좌표 (0~1)
```

예: `part.head.toast_helm`의 앵커는 `(0.50, 0.90)` — 토스트 **아랫변 중앙**이
목 위에 꽂힌다. 따라서 새 토스트를 그릴 때 **아랫변이 이미지 높이의 90 % 지점**에 오도록
구도를 잡으면 앵커 수정 없이 그대로 들어간다.

구도가 달라지면 `/#/dev/assets`에서 슬라이더로 맞추고 JSON을 복사해 카탈로그에 붙여넣는다 (§8).

몸체(`body.cat`)의 부착점:

| 슬롯 | 몸체 이미지 기준 위치 |
|---|---|
| head | (0.50, 0.400) — 목 위 |
| hand | (0.855, 0.515) — 들어올린 오른쪽 앞발 |
| core | (0.50, 0.700) — 배 중앙 |
| trinket | (0.50, 0.475) — 목걸이 위치 |

**몸체를 새로 그릴 경우** 이 네 점이 신체 어디에 오는지 확인하고
`assetCatalog.ts`의 `body.cat.attach`를 갱신해야 한다.

### 2.4 z 순서

```
배경 0 → 소품 10 → 몸체 20 / 적 20 → 코어 26 → 머리 30 → 장신구 34 → 손 40 → 상태아이콘 50 → UI 60 → 이펙트 70
```

손(40)이 가장 위다. 가위·창·우산이 몸 앞으로 나온다는 뜻이므로, **손 파츠는 손잡이 쪽이
아래로 오도록** 그린다.

### 2.5 아이들 모션

카탈로그의 `animationProfile`이 정지 상태의 미세 움직임을 준다.
**아트에 움직임을 그려 넣지 않는다** — 코드가 처리한다.

| 프로필 | 움직임 | 적용 대상 |
|---|---|---|
| `static` | 없음 | 박스, 창, 배경, 아이콘 |
| `soft-bounce` | 위아래 4 px | 토스트, 커피, 빵 패치, 몸체 |
| `sway` | ±3° 회전 | 우산, 리본, 거미 |
| `jitter` | 미세 떨림 | 가위, 폭탄, 눈, 쥐 |
| `float` | 위아래 7 px + 회전 | 유령, 나방 |
| `spin-slow` | 14초 1회전 | 테이프 롤 |

`spin-slow`가 붙은 테이프 롤은 **회전 중심이 이미지 중앙**이어야 자연스럽다.

---

## 3. 우선순위

| 순위 | 대상 | 개수 | 이유 |
|---|---|---|---|
| **P0** | 적 3종 | 3 | 원본 회화 아트가 있는데 배경 분리에 실패해 벡터로 대체된 상태. 원본 톤과 가장 이질적이다 |
| **P0** | 몸체 + 파츠 12종 | 13 | 화면에 항상 떠 있고 조립의 핵심 |
| **P1** | 배경 2종 | 2 | 화면 면적이 가장 크다 |
| **P1** | 상태 아이콘 11종 | 11 | 전투 정보 전달의 핵심 |
| **P2** | 이펙트 5종 | 5 | 현재도 읽히지만 타격감을 크게 좌우 |
| **P2** | 소품 4 + UI 3 | 7 | 장식 |
| **P3** | placeholder 7종 | 7 | 개발용. 마지막에 해도 된다 |

---

## 4. 캐릭터 브리프

### 4.1 `body.cat` — Peelbeast 몸체 · 800×940

파츠를 붙일 **몸통만** 그린다. **머리는 그리지 않는다** (머리는 슬롯이다).

- 회청색 고양이. 크림색 배. 정면을 향해 두 발로 선 자세
- 어깨 위에 짧은 목 그루터기 — 여기에 머리 파츠가 얹힌다
- **오른쪽(화면 기준 오른쪽) 앞발을 들어올린다** — 손 파츠를 쥐는 손
- 왼쪽 앞발은 몸에 붙여 내린다
- 꼬리는 왼쪽 뒤로 감아 올린다 (들어올린 팔과 헷갈리지 않게 충분히 떨어뜨릴 것)
- 발바닥은 크림색, 발가락 선 3개
- 배는 파츠(코어)에 절반쯤 가려지므로 과한 무늬 금지

레퍼런스: `hero_full.png`에서 머리·가위·폭탄·리본을 제외한 부분.

### 4.2 적

| 에셋 | 크기 | 브리프 | 레퍼런스 |
|---|---|---|---|
| `enemy.pencil_rat` | 660×680 | 회색 쥐. **검은 집게 클립**을 등에 짊어지고, 훔친 메모지를 가슴에 안고 있다. 분홍 긴 꼬리, 큰 둥근 귀 | `enemy_pencil_rat.png` |
| `enemy.tape_spider` | 732×600 | **베이지 테이프 롤이 몸통**. 다리는 펴진 종이 클립 6개. 눈이 여러 개. 보라색 잉크 주머니 | `enemy_tape_spider.png` |
| `enemy.scissor_crow` | 684×644 | 검은 깃털 새. **부리가 가위**. 몸에 반창고가 붙어 있다. 금색 발 | `enemy_scissor_crow.png` |
| `enemy.clip_moth` | 640×524 | 종이 날개 나방. **몸통이 금속 클립**. 날개에 보라색 눈알 무늬. 더듬이 | 레퍼런스 없음 — 신규 |

적은 **모두 문구류로 만들어진 생물**이라는 규칙을 지킨다. 이게 세계관이다.

적은 몸체 파츠 시스템을 쓰지 않으므로 완성된 한 장으로 그린다.
바닥에 닿는 지점이 이미지 **아랫변**에 오게 한다 (`anchorY: 1`).

### 4.3 파츠 12종

| 에셋 | 크기 | 앵커 | 브리프 |
|---|---|---|---|
| `part.head.toast_helm` | 496×464 | 0.50, 0.90 | 식빵 한 장을 투구처럼. **빵 안쪽에 회색 고양이 얼굴**이 그려져 있다. 갈색 껍질 테두리 |
| `part.head.box_shell` | 472×448 | 0.50, 0.94 | 골판지 상자를 뒤집어쓴 모습. 위 플랩이 열려 있고 테이프가 붙어 있다. 눈구멍은 없어도 된다 |
| `part.head.ghost_hood` | 424×468 | 0.50, 0.88 | 흰 천 유령 후드. 밑단이 물결. 검은 둥근 눈 두 개와 벌린 입. 볼에 옅은 홍조 |
| `part.hand.scissors` | 492×524 | 0.50, 0.78 | 가위. **빨간 손잡이 링**, 은색 날, 축에 **빨간 리본이 묶여** 있다. 손잡이가 아래 |
| `part.hand.pencil_spear` | 288×624 | 0.50, 0.62 | 노란 육각 연필을 창처럼. 깎인 흑연 촉이 위, 지우개 꽁지가 아래. 중간에 테이프 결속 |
| `part.hand.umbrella_hook` | 524×548 | 0.36, 0.82 | 펼친 우산. 빨강/파랑/크림 패널. **갈고리 손잡이**. 앵커가 왼쪽으로 치우친 것은 손잡이를 쥐기 때문 |
| `part.core.bomb_belly` | 428×428 | 0.49, 0.55 | 검은 구형 폭탄. 심지에 불꽃. **가로로 테이프가 붙어** 몸에 고정된 모습 |
| `part.core.coffee_cup` | 448×388 | 0.44, 0.55 | 흰 머그. **커피콩 로고**. 김이 두 줄기. 손잡이가 오른쪽 |
| `part.core.tape_roll` | 432×404 | 0.48, 0.52 | 베이지 테이프 롤 정면. **회전 중심이 이미지 중앙**에 오게 할 것 (`spin-slow`). 끝이 조금 풀려 나옴 |
| `part.trinket.ribbon_knot` | 468×324 | 0.50, 0.50 | 빨간 나비 리본. 고리 두 개 + 늘어진 꼬리 두 줄 |
| `part.trinket.eye_sticker` | 344×344 | 0.50, 0.50 | 동그란 눈알 스티커. 파란 홍채. 주변에 금색 반짝임 |
| `part.trinket.bread_patch` | 448×312 | 0.50, 0.50 | 식빵 조각을 패치처럼. **꿰맨 자국(스티치)**이 가로로 지나간다 |

**중요**: 파츠는 몸체 위에 얹히므로, 이미지에 **몸의 일부를 그려 넣지 않는다.**
가위만, 우산만, 토스트만 그린다. (v0.8은 파츠 크롭에 몸통과 폭탄이 함께 들어 있었다.)

---

## 5. 전체 에셋 표

| id | 이름 | size | slot | anchor | scale | rot | z | motion | 레퍼런스 |
|---|---|---|---|---|---|---|---|---|---|
| `body.cat` | Peelbeast 몸체 | 800×940 | — | — | — | 0° | 20 | soft-bounce | `hero_full.png` |
| `part.head.toast_helm` | Toast Helm | 496×464 | head | 0.50, 0.90 | 0.46 | −5° | 30 | soft-bounce | `part_toast.png` |
| `part.head.box_shell` | Box Shell | 472×448 | head | 0.50, 0.94 | 0.46 | −3° | 30 | static | `part_box_shell.png` |
| `part.head.ghost_hood` | Ghost Hood | 424×468 | head | 0.50, 0.88 | 0.40 | 2° | 30 | float | `part_ghost_charm.png` |
| `part.hand.scissors` | Scissors | 492×524 | hand | 0.50, 0.78 | 0.36 | 12° | 40 | jitter | `part_scissors.png` |
| `part.hand.pencil_spear` | Pencil Spear | 288×624 | hand | 0.50, 0.62 | 0.17 | 16° | 40 | static | `part_spear.png` |
| `part.hand.umbrella_hook` | Umbrella Hook | 524×548 | hand | 0.36, 0.82 | 0.44 | −6° | 40 | sway | `part_umbrella.png` |
| `part.core.bomb_belly` | Bomb Belly | 428×428 | core | 0.49, 0.55 | 0.34 | 0° | 26 | jitter | `part_bomb.png` |
| `part.core.coffee_cup` | Coffee Cup | 448×388 | core | 0.44, 0.55 | 0.32 | 4° | 26 | soft-bounce | `part_coffee.png` |
| `part.core.tape_roll` | Tape Roll | 432×404 | core | 0.48, 0.52 | 0.32 | −6° | 26 | spin-slow | `part_tape_roll.png` |
| `part.trinket.ribbon_knot` | Ribbon Knot | 468×324 | trinket | 0.50, 0.50 | 0.30 | −4° | 34 | sway | `part_ribbon.png` |
| `part.trinket.eye_sticker` | Eye Sticker | 344×344 | trinket | 0.50, 0.50 | 0.19 | 8° | 34 | jitter | `part_eye_sticker.png` |
| `part.trinket.bread_patch` | Bread Patch | 448×312 | trinket | 0.50, 0.50 | 0.24 | −8° | 34 | soft-bounce | `part_patchbread.png` |
| `enemy.pencil_rat` | Pencil Rat | 660×680 | — | — | — | 0° | 20 | jitter | `enemy_pencil_rat.png` |
| `enemy.tape_spider` | Tape Spider | 732×600 | — | — | — | 0° | 20 | sway | `enemy_tape_spider.png` |
| `enemy.scissor_crow` | Scissor Crow | 684×644 | — | — | — | 0° | 20 | soft-bounce | `enemy_scissor_crow.png` |
| `enemy.clip_moth` | Clip Moth | 640×524 | — | — | — | 0° | 20 | float | — |
| `bg.desk` | 책상 & 노트 | 1600×900 | — | — | — | 0° | 0 | static | `stage_bg_base.png` |
| `bg.nest` | 드래프트보드 둥지 | 1600×900 | — | — | — | 0° | 0 | static | `stage_bg_base.png` |
| `prop.pencil_cup` | 연필꽂이 | 336×576 | — | — | — | −3° | 10 | static | `prop_pencilcup_left.png` |
| `prop.torn_note` | 찢어진 메모 | 472×548 | — | — | — | 6° | 10 | static | `prop_tornpaper_right.png` |
| `prop.clip_pile` | 클립 더미 | 488×312 | — | — | — | 0° | 10 | static | — |
| `prop.tape_dispenser` | 테이프 디스펜서 | 512×380 | — | — | — | −2° | 10 | static | — |
| `ui.clip` | 종이 클립 | 240×380 | — | — | — | 0° | 60 | static | — |
| `ui.tape_strip` | 테이프 조각 | 480×180 | — | — | — | 0° | 60 | static | — |
| `ui.tag` | 종이 태그 | 520×260 | — | — | — | 0° | 60 | static | `prop_hold_card.png` |
| `icon.status.focus` | Focus | 192×192 | — | — | — | 0° | 50 | static | — |
| `icon.status.drift` | Drift | 192×192 | — | — | — | 0° | 50 | static | — |
| `icon.status.bind` | Bind | 192×192 | — | — | — | 0° | 50 | static | — |
| `icon.status.haste` | Haste | 192×192 | — | — | — | 0° | 50 | static | — |
| `icon.status.pinned` | Pinned | 192×192 | — | — | — | 0° | 50 | static | — |
| `icon.status.fragile` | Fragile | 192×192 | — | — | — | 0° | 50 | static | — |
| `icon.status.frazzle` | Frazzle | 192×192 | — | — | — | 0° | 50 | static | — |
| `icon.status.ink` | Ink Tide | 192×192 | — | — | — | 0° | 50 | static | — |
| `icon.status.block` | Block | 192×192 | — | — | — | 0° | 50 | static | — |
| `icon.status.glue` | Glue | 192×192 | — | — | — | 0° | 50 | static | — |
| `icon.status.peel` | Peel | 192×192 | — | — | — | 0° | 50 | static | — |
| `fx.slash` | 베기 궤적 | 360×225 | — | — | — | 0° | 70 | static | — |
| `fx.spark` | 불꽃 | 360×360 | — | — | — | 0° | 70 | static | — |
| `fx.impact` | 충격 폭발 | 360×360 | — | — | — | 0° | 70 | static | — |
| `fx.patch` | 반창고 | 360×225 | — | — | — | 0° | 70 | static | — |
| `fx.scrap` | 종이 조각 | 184×152 | — | — | — | 0° | 70 | static | — |
| `ph.head/hand/core/trinket/body/enemy/generic` | placeholder 7종 | §5 코드 참조 | — | — | — | 0° | 20 | static | — |

`scale`은 렌더된 몸체 폭 대비 비율이다. 새 아트의 피사체가 이미지 안에서 차지하는 비율이
달라지면 이 값도 조정해야 한다 (§8의 3단계).

---

## 6. 배경 · 아이콘 · 이펙트 브리프

### 6.1 배경 (1600×900, 알파 불필요)

**`bg.desk`** — 기본 전장.
갈색 나무 책상 위에 크림색 링 노트가 살짝 기울어 놓여 있다.
상단에 금속 스프링 링, 가로 괘선, 왼쪽에 붉은 여백선. 모서리에 테이프 조각과 메모지.
**캐릭터가 서는 하단 중앙 2/3은 비교적 비워둘 것** — 캐릭터와 겹친다.

**`bg.nest`** — 보스 전장.
같은 구성이되 어둡고 채도가 낮다. 오른쪽 상단에서 **테이프 실이 늘어져** 거미줄을 이룬다.
보라색 잉크 얼룩이 번져 있다.

### 6.2 상태 아이콘 (192×192)

작은 **종이 칩** 위에 픽토그램. 칩 색으로 성격을 구분한다.

| 아이콘 | 픽토그램 | 칩 색 |
|---|---|---|
| Focus | 과녁 / 조준선 | 따뜻한 노랑 |
| Drift | 물결선 두 줄 | 연한 파랑 |
| Bind | 교차한 테이프 X | 베이지 |
| Haste | 번개 | 금색 |
| Pinned | 압정 / 핀 | 금속 회색 |
| Fragile | 금 간 유리 | 연한 빨강 |
| Frazzle | 헝클어진 선 | 연한 보라 |
| Ink Tide | 잉크 방울 | 보라 |
| Block | 방패 + 체크 | 파랑 |
| Glue | 풀 튜브 | 초록 |
| Peel | 모서리가 들린 스티커 | 크림 |

32 px까지 축소되어 표시되므로 **형태가 단순하고 실루엣이 명확해야** 한다.

### 6.3 이펙트

캐릭터 위에 겹쳐 잠깐 나타난다. 배경이 크림색이므로 **밝은 색은 보이지 않는다** —
채도와 명도 대비를 반드시 확보할 것. (현재 `fx.slash`가 흰색이라 안 보여서 빨강으로 바꾼 전례가 있다.)

| 이펙트 | 브리프 |
|---|---|
| `fx.slash` | 대각선 베기 궤적. 빨강 계열 |
| `fx.spark` | 4갈래 별 반짝임. 금색 |
| `fx.impact` | 지그재그 폭발 테두리. 크림 속 + 빨강 외곽 |
| `fx.patch` | 가로 반창고 + 스티치 |
| `fx.scrap` | 찢어진 종이 조각 (박리 파티클용) |

---

## 7. 사용 불가 레퍼런스

원본 아틀라스의 다음 10개 영역은 **완전히 비어 있다**. 참고하지 말 것.

`icon_box_shell`, `icon_eye_sticker`, `icon_spear`, `icon_tape_roll`, `icon_mug`,
`icon_patch`, `icon_umbrella`, `icon_ghost`, `icon_ribbon_red`, `icon_scissors_red`

또한 다음 크롭은 **오염되어 있다** (다른 대상이나 UI 글자가 섞임):

| 크롭 | 실제 내용 |
|---|---|
| `part_tape_roll.png` | UI 라벨 행. `PE`, `EY` 글자 |
| `part_eye_sticker.png` | `ICKER` 글자 |
| `part_box_shell.png` | 나무 막대기와 종이 배경 |
| `prop_tornpaper_right.png` | 70 % 가 빈 영역 |

경위: `docs/01_REPOSITORY_AUDIT.md` §2

---

## 8. 교체 절차

### 8.1 파일 하나 교체 (5단계)

1. 새 이미지를 `public/assets/<category>/` 에 넣는다 (기존 파일명을 덮어쓰는 것이 가장 쉽다)
2. `src/assets/assetCatalog.ts` 에서 해당 엔트리의 `file`, `width`, `height` 를 실제 값으로 맞춘다
3. `npm run dev` → `#/dev/assets` → 해당 에셋 선택 →
   슬라이더로 `anchorX/anchorY/scale/rotation/zIndex` 조정 → **JSON 복사** → 카탈로그에 붙여넣기
4. `npm run assets:validate` — 존재·크기·알파 검사
5. `npm run assets:atlas && npm run assets:catalog`

컴포넌트·CSS·엔진은 건드리지 않는다.

### 8.2 일괄 교체

```bash
# 1. 새 아트를 public/assets/** 에 전부 덮어쓴다
# 2. 실제 크기를 뽑아 카탈로그와 대조
npm run assets:validate          # 크기 불일치를 전부 나열해준다
# 3. 나열된 값으로 assetCatalog.ts의 width/height를 갱신
# 4. 앵커 확인 — 브라우저 없이 5가지 빌드를 합성해 본다
node scripts/preview-assembly.mjs        # → docs/screenshots/assembly-preview.png
# 5. 어긋난 파츠만 /#/dev/assets 에서 조정
# 6. 최종 확인
npm run assets:all && npm test && npm run build
```

### 8.3 상태 갱신

교체한 에셋은 카탈로그에서 `status: 'placeholder'` → `'production'` 으로 바꾸고,
`license` 와 `source` 를 실제 값으로 적는다. `/#/dev/assets`에 그대로 표시된다.

### 8.4 현재 벡터 원본

현재 placeholder는 `assets/source/sprites/*.svg` 에 편집 가능한 SVG로 있다.
새로 그리는 대신 **이것을 고쳐 쓰는 것도 가능하다**:

```bash
# SVG를 직접 편집한 뒤
npm run assets:sprites           # 손으로 고친 SVG를 존중하고 래스터만 다시 만든다
npm run assets:sprites -- --regen  # 생성기 코드에서 SVG를 다시 써서 덮어쓴다 (주의)
```

---

## 9. 납품 체크리스트

- [ ] 알파 채널이 있다 (`npm run assets:validate` 가 없으면 경고한다)
- [ ] 크기가 카탈로그와 일치한다
- [ ] 키스컷 흰 테두리가 있다
- [ ] 드롭섀도가 잘리지 않을 여백이 있다
- [ ] 파츠에 몸의 일부·배경·글자가 섞이지 않았다
- [ ] 앵커 지점의 구도가 표와 맞거나, 맞지 않으면 새 앵커 값을 함께 전달했다
- [ ] `node scripts/preview-assembly.mjs` 결과에서 파츠가 몸에 제대로 붙는다
- [ ] `npm run assets:validate` 가 에러 0
- [ ] 라이선스와 출처를 카탈로그에 기입했다
