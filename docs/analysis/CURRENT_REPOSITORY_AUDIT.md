# CURRENT REPOSITORY AUDIT — PEELBEAST (pre-redesign)

감사 대상 커밋: `1da65cd` (main)
감사 일자: 2026-07-25
감사 범위: 저장소 전체 (8개 파일), 실행 구조, 전투/조립 시스템, 에셋 파이프라인, 문서

이 문서는 **전면 재구현 이전의 상태**를 기록한다. 재구현 이후의 상태는
`docs/01_REPOSITORY_AUDIT.md`(요약본)와 `docs/00_MASTER_DEVELOPMENT_DOCUMENT.md`를 참조한다.

---

## 1. 현재 파일 구조

저장소는 8개 파일, 총 1.1 MB이다.

```
.
├── README.md                              (4 KB)
├── index.html                             (80 KB, 661줄)  ← 게임 전체
├── assets/
│   └── atlas.webp                         (68 KB)         ← 이미지 전체
├── docs/
│   ├── 00_MASTER_DEVELOPMENT_DOCUMENT_v0.8.md (12 KB)
│   ├── 01_VERSION_HISTORY.md              (4 KB)
│   ├── 02_COMBAT_AND_FEEL_SPEC.md         (4 KB)
│   └── 03_ROADMAP.md                      (4 KB)
└── .github/workflows/reconstruct.yml      (4 KB)
```

관측 사항:

- **소스 파일이 존재하지 않는다.** `src/`, `data/`, `tests/`, `package.json`, 빌드 설정, 린터 설정,
  타입 정의가 전부 없다. 저장소는 "빌드 산출물 2개 + 문서 4개"다.
- 문서 `00_MASTER_DEVELOPMENT_DOCUMENT_v0.8.md` §9는 `src/runState.js`, `src/battle.js`,
  `data/parts.json` 등의 파일 구조를 "권장"하고 있으나 **하나도 구현되어 있지 않다.**
  즉 문서가 기술하는 구조와 실제 저장소가 불일치한다.
- `.github/workflows/reconstruct.yml`은 `source_chunks/`, `asset_chunks/`를 base64+gzip으로
  이어붙여 `index.html`과 `assets/atlas.webp`를 복원하는 워크플로다. 이 워크플로는
  **chunk 디렉터리를 `git rm` 하는 것으로 끝난다.** 즉 원본 소스는 저장소에 남지 않는다.
  현재 트리에 `source_chunks/`, `asset_chunks/`, `UPLOAD_COMPLETE`가 없으므로 이 워크플로는
  영구히 트리거되지 않는 죽은 코드다. 커밋 히스토리상 `bc2a3b8`/`8fd087f`에서 업로드,
  `032f8e1`에서 조립 후 삭제되었다.

## 2. 현재 실행 구조

- 진입점: `index.html` 하나. `file://` 로 열어도, 정적 서버로 열어도 동작한다.
- 빌드 단계 없음, 의존성 없음, 번들러 없음, 트랜스파일 없음.
- 전체 JS는 `<script>` 태그 안의 **단일 IIFE 397줄**이다. 모듈 경계가 없다.
- 상태는 파일 스코프의 단일 객체 `state = { build, battle, run }`.
- 렌더링은 `document.getElementById(...).innerHTML = ...` 문자열 조립 방식.
  `renderBattle()` 한 함수가 HP 바, 스탯 그리드, 적 스프라이트, 슬롯 무결성, 의도 레일,
  히어로 피규어, 액션 버튼, 턴 표시, 메트릭, 로그를 전부 다시 그린다.
- 화면 전환은 `classList.toggle('hidden')` 두 개(`battlePanel`, `resultPanel`)로만 이루어진다.
  Title 화면, Route Map 화면, 별도 Shop/Event 화면이 **존재하지 않는다** — 전부 `resultPanel`
  하나를 `innerHTML`로 갈아끼워 재사용한다(`renderNodeScreen()`).

## 3. 전투 시스템 구조

**동작하는 것:**

- 1:1 턴제. `side: 'player' | 'enemy'`, `turn` 카운터.
- 코어 액션 4종: `attack` / `guard` / `repair` / `press` (`useCoreAction`).
- 파츠 스킬 12종 (`useSkill`의 `switch(skill.id)` — 12 case).
- 적 의도 큐 3개 (`battle.enemy.intents`), 매 턴 `shift()` 후 `push(createIntent())`.
- 상태 수치: `focus, haste, drift, pinned, vulnerable, fragile, bind, frazzle, insight,
  reflectInk, counterReady` (플레이어), `pinned, fragile, fury, upcomingWeaken` (적),
  전역 `ink` (0~6).
- Block 흡수 → HP 차감 순서 (`applyDamageToPlayer` / `applyDamageToEnemy`).
- 2페이즈 보스 (`advanceEnemyPhase`).

**구조적 문제:**

- `useCoreAction`과 `useSkill`이 **거대한 switch 문**이다. 각 case가 상태를 직접
  변이(mutate)하고, 로그를 쓰고, `endPlayerTurn()`을 호출한다. 계산·상태변경·UI 전환·로깅이
  한 덩어리다.
- 파츠 고유 규칙이 엔진 전역에 하드코딩되어 있다. 예:
  `if (state.build.hand === 'umbrella' && !battle.player.slotState.hand.peeled) amount -= 2`
  가 `applyDamageToPlayer` **안에** 있다. 파츠를 하나 추가하려면 데미지 계산기, 가드 처리기,
  리페어 처리기, 박리 처리기를 전부 열어서 `if` 를 추가해야 한다. 12개 파츠에 대해
  이런 하드코딩 분기가 `index.html` 전역에 27곳 흩어져 있다.
- **패시브가 데이터가 아니다.** `SLOT_CONFIG[*].passive`는 `{title, desc}` 뿐이고 실제 효과는
  엔진 곳곳의 `state.build.core === 'tape'` 같은 문자열 비교로 구현된다. 즉 UI에 표시되는
  패시브 설명과 실제 동작이 코드상 연결되어 있지 않다 — 설명만 고치고 로직을 잊는 것이 가능하다.
- **시너지 시스템이 존재하지 않는다.** 조합 보너스 개념이 코드에도 데이터에도 없다.
  UI의 "Synergy & Passive" 섹션은 실제로는 패시브 목록 + 리릭 목록만 렌더한다.
- 난수는 `Math.random()` 직접 호출 8곳 (`rand()`, `createIntent`, `peelSlot`의 35% 판정,
  `buildShopOffers`). **시드가 없어 재현이 불가능하다.** 동일 입력에 대한 회귀 테스트를 쓸 수 없다.
- 상태 만료 처리가 `runEnemyTurn()` 한 줄에 몰려 있다:
  `battle.enemy.pinned = Math.max(0, ...-1); battle.player.drift = ...` 형태로 8개 상태를
  수동 감소. 새 상태를 추가하면 이 줄을 고치는 것을 잊기 쉽다.
- 적 의도가 **의도 텍스트와 실행 코드로 이중 정의**되어 있다. `INTENT_LIBRARY.webWrap.text`는
  `'4 피해 · Bind 1 · 손 파츠 박리 시도'`라는 **문자열**이고, 실제 피해는
  `executeEnemyMove`의 `case 'webWrap'`에 `4 - weak + battle.enemy.fury`로 따로 있다.
  둘의 동기화를 보장하는 장치가 없다. 실제로 `fury`가 붙으면 표시값과 실제 피해가 어긋난다.
- 적 의도에 **위험도, 방어 가능 여부, 관통 여부, Glue 손실, 박리 대상**이 구조화되어 있지 않다.
  전부 자유 텍스트 안에 녹아 있어 UI가 색상/아이콘으로 위계를 줄 수 없다.
- 전투 종료 처리 `finishBattle()`가 결과 화면 DOM 조작 + 스크랩 계산 + 캐리오버 저장을
  동시에 한다. 보상 로직이 UI 함수 안에 있다.

## 4. 조립 시스템 구조

- `SLOT_CONFIG` 객체: 4슬롯 × 3옵션 = 12파츠. 각 파츠는
  `{name, icon, layer, desc, stats, active, passive, render:{x,y,w,r}}`.
- `computeBuild(activeMap)`이 베이스 스탯 `{hp:30, glue:26, atk:3, spd:8}`에 활성 슬롯의
  스탯을 더한다. 박리된 슬롯은 `activeMap[slot]=false`로 제외 → **박리 시 스탯/스킬/패시브가
  실제로 빠지는 것은 정상 동작한다.**
- 조립 UI는 사이드바의 `.opt-btn` 3×4 그리드. 클릭 시 `state.build[slot]` 교체 후 전체 재렌더.

**문제:**

- **조립 전용 화면이 없다.** 조립은 항상 전투 화면 왼쪽 사이드바에 붙어 있으며,
  전투 중에도 파츠를 바꿀 수 있다 (`renderWorkshop`의 click 핸들러가
  `if (state.battle && state.battle.side) openCurrentNode()` — 즉 전투가 **리셋**된다).
  이는 명백한 설계 결함이자 익스플로잇이다: 전투 중 불리해지면 파츠를 눌러 전투를 초기화할 수 있다.
- 장착 전후 **비교, 스탯 델타, 시너지 표시, 호환성 표시, 장착/해제 애니메이션**이 전부 없다.
- 캐릭터 미리보기는 전투 화면의 `heroFigure` 하나뿐이고, 전투가 시작되어야만 렌더된다
  (`renderHeroFigure`가 `state.battle.player.slotState`를 직접 참조하므로 `state.battle`이
  null이면 **예외가 난다**).
- `render:{x,y,w,r}` 앵커가 **픽셀 하드코딩**이다. `.hero-figure`가 390×410 px 고정이라
  반응형 축소 시 파츠 위치가 어긋난다.

## 5. 에셋 관리 방식

이 항목이 **가장 심각한 문제**다.

- 이미지는 `assets/atlas.webp` **단 하나**다. 원본 소스 이미지가 저장소에 없다.
- 좌표 맵 `ATLAS`는 `index.html` 안에 **인라인 JSON 리터럴**로 박혀 있다 (32개 엔트리).
- 스프라이트 적용은 CSS `background-position` 백분율 계산(`applyAtlas`)으로 이루어진다.

### 5.1 아틀라스 해상도 불일치 (확인됨)

```
코드가 선언한 크기 : 2048 × 2999
실제 파일 크기     : 1024 × 1500
알파 채널          : 없음 (hasAlpha = false)
```

좌표계가 실제 파일의 2배로 선언되어 있다. `applyAtlas()`가 **백분율** 기반이라
화면이 깨지지는 않지만, 결과적으로 모든 스프라이트가 **의도한 해상도의 절반**으로 렌더된다.
68 KB WebP를 2048 px 좌표계에서 쓰고 있으므로 캐릭터는 확대 시 뭉개진다.

### 5.2 아틀라스 영역의 1/3이 비어 있다 (확인됨)

32개 좌표 영역을 실제로 잘라내 평균 휘도를 측정한 결과:

| 스프라이트 | 검은 픽셀 비율 | 판정 |
|---|---|---|
| `icon_box_shell` | 100 % | **EMPTY** |
| `icon_eye_sticker` | 100 % | **EMPTY** |
| `icon_spear` | 100 % | **EMPTY** |
| `icon_tape_roll` | 100 % | **EMPTY** |
| `icon_mug` | 100 % | **EMPTY** |
| `icon_patch` | 100 % | **EMPTY** |
| `icon_umbrella` | 100 % | **EMPTY** |
| `icon_ghost` | 100 % | **EMPTY** |
| `icon_ribbon_red` | 100 % | **EMPTY** |
| `icon_scissors_red` | 100 % | **EMPTY** |
| `prop_tornpaper_right` | 70 % | PARTIAL |
| (나머지 21개) | < 25 % | OK |

즉 **조립 UI의 파츠 선택 아이콘 12개 중 10개가 순수 검정 사각형으로 렌더된다.**
게임의 첫 화면에서 가장 먼저 보이는 UI가 검은 네모 10개다. 좌표 맵과 아틀라스 이미지가
서로 다른 버전에서 생성되어 동기화가 깨진 상태다.

### 5.3 "파츠 레이어"가 스프라이트가 아니다 (확인됨)

`part_*` 엔트리는 캐릭터에 겹쳐 그리는 레이어로 사용되지만, 실제 내용은
**레퍼런스 스크린샷을 사각형으로 잘라낸 불투명 크롭**이다. 알파 채널이 없다.

잘라내 확인한 결과:

- `part_tape_roll` — UI 라벨 행의 크롭. `"PE"`, `"EY"` 라는 **글자가 그대로 들어 있다.**
- `part_eye_sticker` — `"ICKER"` 글자가 들어 있다.
- `part_box_shell` — 나무 막대기와 종이 배경. 박스 껍질이 아니다.
- `part_toast` — 토스트 머리 + **캐릭터 몸통 일부 + 하늘색 종이 배경**.
- `part_scissors` — 가위 + **캐릭터 몸통 + 폭탄**이 함께 들어 있다.
- `part_umbrella` — 우산 + **빵 조각 + 초록 배경 블록**.

따라서 전투 화면에서 캐릭터에 파츠를 겹치면, 종이 배경과 UI 글자가 있는 **불투명 직사각형이
캐릭터 위에 붙는다.** "조립한 파츠가 캐릭터 외형에 반영된다"는 v0.8 문서의 주장은
기능적으로는 참(레이어가 토글됨)이지만 시각적으로는 성립하지 않는다.

### 5.4 파이프라인 부재

- 아틀라스를 만드는 스크립트가 없다. 아틀라스를 수정하려면 **68 KB WebP를 손으로 편집하고
  `index.html` 안의 JSON 리터럴 좌표를 손으로 고쳐야 한다.**
- 논리 ID가 없다. 컴포넌트는 `'assets/part_toast.png'` 같은 **파일 경로 문자열**로
  이미지를 요청한다 (`data-asset` 속성, `opt.icon`, `opt.layer`, `phase.sprite`).
  파일명을 바꾸면 게임 로직을 고쳐야 한다.
- fallback이 없다. 좌표가 없으면 `applyAtlas`는 `if(!a) return;` 으로 **조용히 아무것도 안 한다.**
  요소는 크기 0의 빈 div로 남는다. 누락을 알리는 경고가 없다.
- 앵커/스케일/z-index 메타데이터가 CSS와 `render:{}` 객체로 이원화되어 있다.

## 6. 상태 관리 방식

```js
const state = { build: {...}, battle: null, run: null };
```

- 전역 가변 싱글턴. 모든 함수가 이 객체를 직접 읽고 쓴다.
- `state.build`(조립)와 `state.battle`(전투)이 **양방향 결합**되어 있다.
  전투 엔진이 `state.build.hand === 'umbrella'` 를 직접 조회하고,
  조립 UI가 `state.battle`을 리셋한다.
- UI 상태와 게임 상태의 분리가 없다. `finishBattle()`이 런 상태(`state.run.scrap`,
  `state.run.carry`)를 갱신하면서 동시에 DOM을 조작한다.
- **저장/불러오기가 없다.** 새로고침하면 런이 사라진다.
- `state.run.carry`는 `normalizeCarry()`가 매번 `computeBuild()`를 호출해 클램프한다.
  즉 조립을 바꾸면 캐리오버 HP가 조용히 변한다(최대치가 바뀌므로). 의도된 규칙인지
  부작용인지 코드만으로 판별할 수 없고 문서에도 없다.

## 7. 단일 HTML에 결합된 책임

`index.html` 661줄이 동시에 담당하는 것:

1. 문서 골격 (HTML)
2. 전체 시각 디자인 (CSS 235줄, 종이 질감·그림자·반응형 3 breakpoint)
3. 아틀라스 좌표 테이블 (데이터)
4. 파츠 데이터 (`SLOT_CONFIG`)
5. 적/조우 데이터 (`ENCOUNTERS`)
6. 의도 데이터 (`INTENT_LIBRARY`)
7. 리릭 데이터 (`RELICS`)
8. 이벤트 데이터 (`EVENTS`, 콜백 함수 포함)
9. 상점 데이터 (`SHOP_POOL`)
10. 루트 데이터 (`ROUTES`)
11. 밸런스 상수 (베이스 스탯, 스크랩 보상, 회복량 — 전부 매직넘버로 산재)
12. 전투 규칙 엔진
13. 조립 계산기
14. 런 진행 로직
15. 전 화면 렌더러
16. 이벤트 핸들러 바인딩
17. 한국어 UI 문구 전량

**게임 데이터와 UI 문구가 컴포넌트에 하드코딩되어 있다.** 로컬라이제이션, 밸런스 조정,
콘텐츠 추가가 모두 같은 파일의 같은 함수를 건드린다.

## 8. 확장성을 막는 문제

| # | 문제 | 결과 |
|---|---|---|
| 1 | 파츠 효과가 엔진 전역에 하드코딩 (`state.build.X === 'y'` 27곳) | 파츠 1종 추가에 파일 전역 수정 필요. 문서 목표치인 슬롯당 8종(총 32종)은 현 구조에서 비현실적 |
| 2 | 시드 없는 `Math.random()` | 회귀 테스트 불가, 버그 재현 불가, 밸런스 시뮬레이션 불가 |
| 3 | 모듈/타입 부재 | 오타난 파츠 ID·스킬 ID·에셋 ID가 런타임까지 살아남음 |
| 4 | 아틀라스 수작업 편집 | 아티스트가 이미지 하나 교체하려면 개발자가 코드를 고쳐야 함 |
| 5 | 의도 표시 텍스트와 실행 로직 이중 정의 | 밸런스 조정 시 표시/실제 불일치가 필연적으로 발생 |
| 6 | 결과·보상 로직이 DOM 함수 내부 | 보상 규칙 테스트 불가 |
| 7 | 화면이 2개 패널의 innerHTML 교체 | Title/Route/Reward 등 화면 추가 시마다 `renderNodeScreen` 시그니처가 비대해짐 |
| 8 | CSS 235줄 전역 네임스페이스 | 화면 추가 시 클래스명 충돌 위험 |
| 9 | 테스트 인프라 0 | 리팩터 안전망 없음 |

## 9. 실제 동작하지 않거나 시각적으로만 존재하는 기능

| 기능 | 문서/UI의 주장 | 실제 |
|---|---|---|
| 파츠 선택 아이콘 | 12종 아이콘 | **10종이 검은 사각형** (§5.2) |
| 파츠 레이어 | 조립이 외형에 반영 | 불투명 크롭이 겹쳐짐, UI 글자 포함 (§5.3) |
| "Synergy & Passive" 섹션 | 시너지 | **시너지 시스템 없음.** 패시브+리릭 목록만 표시 |
| 적 의도 상세 | 피해/상태/박리 정보 | 자유 텍스트 1줄. `fury` 보정이 표시에 반영 안 됨 |
| 박리 연출 | "종이 찢김 연출" (문서 §5.4) | `opacity:.18 + grayscale(1)` CSS 전환뿐. 떨어지는 애니메이션 없음, 바닥 파츠 영역 없음 |
| 바닥 스크랩 `floorScraps` | 종이 조각 | 하드코딩된 8개 **반투명 초록 사각형** (`.scrap`), 게임 상태와 무관한 순수 장식 |
| 거미줄 `.webs` | 배경 연출 | CSS로 그린 선 5개 + 원호 4개. 적 종류와 무관하게 항상 표시 |
| `enemySupportCrow` | 보스 지원 유닛 | 보스 1페이즈에서 이미지만 표시. **전투 로직에 전혀 참여하지 않음** |
| 히트 연출 | 문서 §5.4 계획 | 없음. 버튼을 눌러도 캐릭터·적이 전혀 움직이지 않고 로그만 갱신됨 |
| 피해 숫자 팝업 | 문서 §5.4 계획 | 없음 |
| 상태 아이콘 | 문서 §5.4 계획 | 없음. `mini-cell` 텍스트 그리드뿐 |
| 저장/불러오기 | 문서 §2 "아직 없는 것" | 없음 (문서와 일치) |
| `Continue` / Title 화면 | — | 없음. 로드 즉시 `startRun('snip')` |
| Route Map 화면 | 루트 선택 | 사이드바의 세로 목록. 선택 시 **런 전체가 즉시 재시작**됨 |
| `vulnerable` 상태 | 상태값 존재 | 감소 코드만 있고 **부여하는 코드가 없다.** 죽은 상태값 |
| `insight` 상태 | Eye Sticker 패시브 | 수치만 증가하고 **읽는 코드가 없다.** 죽은 상태값 |
| Elite 노드 | 노드 타입 | 전투 로직상 일반 전투와 동일. 스크랩 보상만 8→12 |
| 상점 재입장 | "여러 번 이용해도 된다" | 맞음. 단 offer 목록이 `state.run.shopOffers`에 고정되어 갱신 안 됨 |

## 10. 유지해야 할 기능 (개념으로 보존)

재구현에서도 **개념은 유지하고 구현만 새로 한다.**

- 4슬롯 조립 (Head / Hand / Core / Trinket)과 슬롯당 복수 파츠
- 파츠별 스탯 / 액티브 1종 / 패시브 1종
- 박리(peel)와 재부착(reattach) — 이 게임의 핵심 차별점
- 박리 시 스탯·스킬·패시브가 실제로 비활성화되는 규칙 (현 구현에서 정상 동작)
- 1:1 턴제, 적 의도 큐 3개
- 코어 액션 4종: Peel Strike / Guard / Repair / Press
- 파츠 스킬 12종의 **설계 의도** (Copy Spark, Fold Guard, Drift Veil, Scissor Flurry,
  Pin Thrust, Umbrella Bastion, Burst Stitch, Coffee Overclock, Patch Loop, Ribbon Jump,
  Copy Eye, Mending Patch)
- 상태 효과 어휘: Focus, Drift, Bind, Haste, Pinned, Fragile, Frazzle, Ink Tide
  (+ Block, Glue). `vulnerable`/`insight`는 죽어 있었으므로 실제 규칙을 부여해 되살린다.
- 노드 타입 5종: Combat / Event / Shop / Elite / Boss
- Scrap 경제, 리릭(Run Modifier) 누적, HP/Glue 캐리오버
- 복수 루트 (Snip Lane / Stitch Loop)
- 2페이즈 보스
- 종이 공예 / 크림색 종이 / 갈색 책상 / 키스컷 스티커 비주얼 방향
- 15~25분 런, 4~8턴 전투라는 템포 목표

## 11. 폐기하거나 다시 작성해야 할 기능

**폐기 (구조 자체를 버림):**

- 단일 `index.html` 구조 전체
- 인라인 IIFE 397줄
- `innerHTML` 문자열 렌더링
- 전역 가변 `state` 싱글턴
- `applyAtlas()` / `data-asset` 파일경로 결합
- `index.html` 인라인 `ATLAS` 좌표 리터럴
- `.github/workflows/reconstruct.yml` (죽은 워크플로, chunk 기반 업로드 방식)
- 장식용 `.webs`, `.floor-scraps` CSS 도형 (게임 상태에 연동된 실제 연출로 대체)
- `enemySupportCrow` (로직 없는 유령 스프라이트)

**다시 작성:**

- 전투 엔진 → 순수 함수 리졸버 체인 + 시드 RNG
- 파츠 효과 → 하드코딩 `if` → 데이터 정의 효과(effect descriptor) + 훅
- 적 의도 → 표시 텍스트와 실행 로직 통합 (하나의 데이터에서 둘 다 파생)
- 조립 화면 → 전투 사이드바에서 분리된 독립 작업대 화면
- 에셋 → 논리 ID 기반 카탈로그 + fallback + 자동 아틀라스 생성
- 아트 → 알파 채널 있는 실제 스프라이트로 교체 (§13)
- 상태 효과 → 통합 status 레지스트리 (부여/감소/만료가 한 곳)
- 보상/상점/이벤트 → UI에서 분리된 리졸버

## 12. 레퍼런스 이미지와 현재 구현의 차이

`assets/atlas.webp`는 실질적으로 **레퍼런스 시트**다. 안에 들어 있는 것:

1. **스테이지 스크린샷** (`stage_bg_base`) — 링 노트 위에 놓인 종이 스티커 캐릭터,
   좌상단 `STAGE 4` 태그, 우상단 `Enemy HP 16` 바, 하단 `DRIFT / SLASH / COPY / BOOST`
   4단 액션 레일. 클립·테이프·별 스티커 장식.
2. **히어로 카드** (`hero_full`) — 토스트 머리 고양이, 가슴에 테이프로 붙인 폭탄,
   빨간 리본 달린 가위. 흰색 키스컷 외곽선 + 드롭섀도.
3. **적 스티커** — 테이프 거미(테이프 롤 몸통 + 클립 다리), 연필 쥐(집게 클립),
   가위 까마귀(반창고 붙은 검은 깃털).
4. **소품** — 우산, 연필 창, 커피 머그, 연필꽂이, 찢어진 종이.
5. **UI 조각** — 픽셀 손 커서 + `TO PRESS` 라벨, `GHOST` / `BOX` / `...CKER` 라벨 칩.

| 레퍼런스가 보여주는 것 | 현재 구현 | 차이 |
|---|---|---|
| 링 노트 종이 위 스테이지 | CSS 그라디언트 + 반투명 스크린샷 배경(`opacity:.78, multiply`) | 레퍼런스 **전체 스크린샷을 그대로 배경으로 깔고** 그 위에 UI를 얹음. 금지된 방식 |
| 캐릭터가 화면의 주인공 (스테이지 폭의 ~40 %) | 히어로 390 px + 그 위에 **420 px 카드 UI가 겹쳐** 캐릭터 상반신을 가림 | 정보 패널이 캐릭터를 덮음 |
| 4단 액션 레일 (아이콘 + 이름, 큼직) | 2×2 텍스트 버튼 그리드 (104 px, 설명 문구 포함) | 레퍼런스의 아이콘 중심 위계가 사라지고 텍스트 대시보드가 됨 |
| 흰 키스컷 외곽선, 손으로 자른 불규칙 형태 | 파츠는 직사각 크롭, 패널은 `border-radius:28px` 균일 라운드 | 아날로그 불규칙성 없음 |
| 테이프·클립·메모지 장식 | `.title-wrap::before` 초록 사각형 1개 | 거의 없음 |
| 상태를 아이콘으로 표시 | 4×2 `mini-cell` 텍스트 그리드 (`Focus 0`, `Drift 0`...) | 관리자 대시보드형 |
| 적 HP 하나만 크게 | HP + Block + Ink 3바 + 8칸 미니그리드 | 정보 과밀, 위계 없음 |

**요약: 현재 구현은 레퍼런스의 색상 팔레트만 가져오고 화면 밀도·위계·촉감은 가져오지 않았다.**
그리고 레퍼런스 이미지를 분해해서 쓰는 대신 통째로 배경에 깔았다.

## 13. 모바일 · 데스크톱 대응 상태

- breakpoint 3개: `1200px`, `860px` (동일 `860px` 블록이 3번 중복 선언됨 — 177, 183, 213, 235행).
- 데스크톱: `max-width:1480px`, `390px + 1fr` 2단.
- 1200 px 이하: 사이드바가 위로 쌓임 → 조립 UI가 화면 전체를 차지하고 전투가 화면 밖으로 밀림.
- 860 px 이하: `.combat-row{display:block}` 으로 히어로와 적이 세로로 쌓임.
  `.hero-figure`가 **390 px 고정 폭**이라 360 px 뷰포트에서 잘린다.
  `.hero-layer`의 `left/top` 픽셀 앵커도 고정이므로 파츠가 몸에서 떨어져 보인다.
- 터치 대응 없음. `:hover` 기반 피드백만 존재하므로 터치 기기에서 눌린 느낌이 없다.
- 세로 화면 최적화 없음.

**판정: 데스크톱만 실사용 가능. 모바일은 레이아웃이 성립하지 않는다.**

## 14. 테스트 가능성

**현재: 0.**

- 테스트 파일 없음, 테스트 러너 없음, `package.json` 없음.
- 테스트를 **쓸 수 없는** 구조적 이유:
  1. 모든 로직이 IIFE 안에 갇혀 있어 import 할 수 없다.
  2. `Math.random()` 직접 호출로 결정론이 없다.
  3. 규칙 함수가 `document.getElementById`를 직접 호출한다 (`finishBattle`, `renderNodeScreen`).
     DOM 없이 실행 불가.
  4. 전역 `state` 싱글턴이라 테스트 간 격리가 안 된다.
- CI 없음. `reconstruct.yml`은 빌드 조립용이며 검증 단계가 `test -s` (파일이 비어있지 않은지)뿐이다.

## 15. 전면 재구현 계획

### 15.1 기술 선택

| 항목 | 선택 | 근거 |
|---|---|---|
| 빌드 | **Vite** | 정적 배포 유지, 빠른 HMR, `base` 설정만으로 GitHub Pages 대응 |
| 언어 | **TypeScript (strict)** | §8-3의 오타 클래스 버그를 빌드 타임에 차단 |
| UI | **React 18** | 화면 10개 + 상태 연동 UI. 컴포넌트 경계가 §7의 책임 혼재를 강제로 분리 |
| 게임 엔진 | **도입하지 않음** | 턴제 1:1, 실시간 물리·스프라이트 배칭·씬 그래프가 불필요. Phaser/PixiJS는 번들 +1 MB에 DOM 접근성(스크린리더·포커스)을 잃는다. 애니메이션은 CSS transform + Web Animations API로 충분하며, 이 편이 에셋 교체 가능성(§6 요구사항)도 높다. **필요해지면 battle 뷰만 캔버스로 교체 가능하도록 렌더러를 컴포넌트 경계 뒤에 둔다.** |
| 단위 테스트 | **Vitest** | Vite 설정 공유 |
| E2E | **Playwright** | 스크린샷 검수까지 한 도구로 |
| 상태 | **순수 리듀서 + React context** | 외부 상태 라이브러리 없이도 충분. 엔진은 React를 모른다 |
| 검증 | **자체 validator** | Zod 의존성 없이 타입 + 런타임 검사 (번들 절감) |

### 15.2 목표 구조

```
scripts/          에셋 파이프라인 (SVG→PNG, PNG→atlas, catalog 검증)
assets/source/    원본 SVG 스프라이트 + 레거시 레퍼런스 크롭
public/assets/    런타임 이미지 (카테고리별 디렉터리) + generated/atlas
src/app/          라우팅, 셸
src/assets/       assetTypes / assetCatalog / assetLoader / effectCatalog
src/game/data/    parts, bodies, synergies, enemies, intents, statuses,
                  relics, events, shops, routes, encounters, balance
src/game/engine/  battleEngine, turnResolver, damageResolver, peelResolver,
                  statusResolver, rewardResolver, rng
src/game/state/   runState, battleState, assemblyState
src/game/systems/ assemblySystem, synergySystem, assetSystem, animationSystem
src/components/   assembly / battle / route / event / shop / dev / common
tests/            unit / integration / e2e
```

### 15.3 실행 순서

1. **Phase 1 — Audit** (본 문서)
2. **Phase 2 — Architecture**: 타입, 데이터 스키마, 엔진 인터페이스
3. **Phase 3 — Foundation**: Vite 셸, 라우팅, 에셋 카탈로그 + 로더 + fallback, 저장 가능한 RunState
4. **Phase 4 — Assembly**: 독립 작업대 화면, 실시간 레이어 미리보기, 시너지, 스탯 델타
5. **Phase 5 — Battle**: 리졸버 체인, 구조화된 의도, 박리/재부착 연출, 히트 피드백
6. **Phase 6 — Run**: 루트 맵, 이벤트, 상점, 엘리트, 보스, 보상, 캐리오버, 저장
7. **Phase 7 — QA**: 단위/통합/E2E, 1440×900 · 1280×720 스크린샷 검수
8. **Phase 8 — Documentation**: `docs/00`~`10` 재작성, README 에셋 교체 절차

### 15.4 에셋 재구축 방침

§5의 조사 결과 레거시 아틀라스는 **프로덕션 에셋으로 사용할 수 없다** (알파 없음,
1/3이 빈 영역, 파츠 크롭에 UI 글자 포함, 실해상도 절반).

자동 배경 제거(border flood-fill + 최대 연결성분)를 시도했으나, 레퍼런스가 회화적 배경 위에
그려진 스크린샷이라 피사체와 배경 색이 겹쳐 안정적으로 분리되지 않았다
(고스트·커피컵은 성공, 쥐·거미·까마귀는 배경 덩어리가 남음).

따라서:

1. 레거시 아틀라스는 **`assets/source/reference/`에 크롭으로 보존**하고 카탈로그에
   `status:"reference"`로 등록한다. 게임에는 쓰지 않되 `/dev/assets`에서 목표 이미지로 나란히 본다.
2. 프로덕션 스프라이트는 **알파 채널을 가진 SVG로 새로 작성**하고 빌드 스크립트가 PNG로
   래스터화한다. 레퍼런스의 실루엣·팔레트·키스컷 흰 외곽선·불규칙 절단면을 따른다.
   카탈로그 `status:"placeholder"` — 최종 아트가 준비되면 **카탈로그 파일만 고쳐** 교체한다.
3. 아틀라스는 `scripts/build-atlas.mjs`가 `public/assets/**`에서 자동 생성한다
   (좌표 + hash + logical id 산출). 손으로 편집하지 않는다.

### 15.5 완료 판정 기준

`docs/08_TEST_PLAN.md`에 체크리스트로 옮긴다. 요약:

- 조립한 파츠 이미지가 전투 화면에 동일하게 반영되고, 해제 시 사라진다
- 박리 시 파츠가 캐릭터에서 떨어지는 연출이 재생되고 바닥에 남는다
- 박리된 파츠의 스킬·패시브·시너지가 실제로 비활성화되고 재부착 시 복구된다
- 적 의도 3개가 구조화된 정보(피해/상태/박리/관통/위험도)로 표시된다
- Combat → Event → Shop → Elite → Boss가 한 런으로 연결되고 끝까지 플레이 가능하다
- 누락 에셋이 fallback으로 대체되어 게임이 깨지지 않는다
- `/dev/assets`에서 전체 카탈로그와 장착 미리보기를 확인할 수 있다
- 동일 시드 + 동일 입력 → 동일 결과 (테스트로 검증)
- 단위/통합/E2E 테스트가 통과한다
