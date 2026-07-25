# 05 — 에셋 카탈로그 스펙

## 1. 원칙

**게임의 어떤 코드도 이미지 파일 경로를 알지 못한다.**
컴포넌트는 논리 ID(`part.head.toast_helm`)를 요청하고, 카탈로그가 파일·fallback·앵커·스케일·
z-index를 해결한다. 따라서 아트 교체는 **카탈로그 편집**이지 컴포넌트 편집이 아니다.

v0.8은 `data-asset="assets/part_toast.png"` 처럼 경로를 DOM과 로직에 직접 박아 두었고,
좌표가 없으면 `if(!a) return;` 으로 **조용히 아무것도 하지 않아** 크기 0의 빈 div가 남았다.

## 2. 스키마

`src/assets/assetTypes.ts` 가 정의처, `src/assets/assetCatalog.ts` 가 데이터.

```ts
interface AssetEntry {
  id: string;                    // 논리 ID. 게임이 아는 유일한 식별자
  displayName: string;
  category: AssetCategory;       // body | art | part | enemy | background | prop
                                 // | ui | icon | effect | placeholder | reference
  file: string;                  // public/ 기준 루트 상대 경로
  fallbackFile?: string;         // 로드 실패 시. 이 파일은 반드시 존재해야 한다
  referenceFile?: string;        // 이 아트가 기준으로 삼은 v0.8 크롭 (/dev/assets 비교용)

  width: number;                 // 실제 파일과 일치해야 한다 (assets:validate가 검사)
  height: number;

  anchorX: number;               // 파츠: attach 지점에 꽂히는 정규화 좌표
  anchorY: number;
  scale: number;                 // 렌더된 몸체 폭 대비 비율
  rotation: number;              // anchor를 중심으로 한 회전 (도)
  zIndex: number;

  slot?: PartSlot;               // 파츠 전용
  bodyCompatibility?: string[];  // 장착 가능한 몸체. 비면 제한 없음
  attach?: BodyAttachMap;        // 몸체 전용. 슬롯별 부착점
  animationProfile: AnimationProfile;  // static | soft-bounce | sway | jitter | float | spin-slow
  visualBounds?: { x, y, w, h }; // 히트 스파크·박리 원점용

  tags: string[];
  license: string;
  source: string;
  status: AssetStatus;           // reference | placeholder | production | deprecated
}
```

### 2.1 status의 의미

| status | 뜻 |
|---|---|
| `reference` | 아트 디렉션 자료. **게임에 렌더되지 않는다** |
| `placeholder` | 실제로 출하되는 이미지지만 교체 대상 |
| `production` | 최종 아트 |
| `deprecated` | 이력 보존용. 게임 데이터가 참조하면 검증 경고 |

현재 68개 엔트리: production 1 (`art.hero_card`), placeholder 48, reference 19.

## 3. fallback 사슬

```
file  →  fallbackFile  →  ph.generic
```

`ph.generic`은 fallback이 없는 유일한 에셋이며, 최후의 수단이다.
카탈로그에 없는 ID를 요청하면 예외를 던지지 않고 슬롯에 맞는 placeholder를 렌더한 뒤
누락 레지스트리에 기록한다 (`/dev/assets` 헤더의 "missing at runtime").

E2E가 이를 검증한다 — 네트워크 레벨에서 스프라이트 하나를 차단하고,
placeholder가 실제로 로드되는지(`naturalWidth === 480`) 확인한다.

## 4. 파이프라인

```
scripts/sprite-sources.mjs          저작 (SVG 생성기)
        ↓  npm run assets:sprites
assets/source/sprites/*.svg         편집 가능한 원본. 손으로 고쳐도 된다
        ↓
public/assets/<category>/*.png      런타임 이미지 (알파 포함)
        ↓  npm run assets:atlas
public/assets/generated/atlas.webp  좌표 + hash + logical id가 붙은 자동 생성물
public/assets/generated/atlas.json

assets/source/reference/legacy-atlas-v0.8.webp
        ↓  npm run assets:reference
public/assets/references/*.png      v0.8 크롭 + 유효성 리포트
        ↓  scripts/build-reference-cutouts.mjs
public/assets/bodies/hero_card_ref.png   배경 제거에 성공한 원본 스티커
```

### 4.1 아틀라스는 산출물이다

v0.8은 아틀라스를 손으로 편집하고 좌표를 `index.html`에 손으로 적었다. 그 둘이 어긋나
영역의 1/3이 빈 공간을 가리켰다 (`01_REPOSITORY_AUDIT.md` §2.2).

여기서는 소스 이미지와 논리 카탈로그가 먼저 있고, 아틀라스가 거기서 파생된다.
`atlas.json`에는 sprite 좌표·크기·**논리 ID·원본 경로·해시**가 함께 기록된다.
`public/assets/generated/`는 gitignore된다 — 생성물이므로.

런타임은 아틀라스를 요구하지 않는다. 개별 PNG가 기본이고, 그래야 아트 교체가 즉시 반영된다.
아틀라스는 향후 패킹 빌드를 위한 것이며, 동시에 모든 카탈로그 엔트리가 실제 파일로
해결되는지 확인하는 검사 역할을 한다.

## 5. `/dev/assets`

- 전체 썸네일 (알파가 보이도록 체커보드 배경)
- 카테고리 필터 · 검색 (id / 이름 / 태그)
- 카탈로그 유효성 검사 결과, 런타임 누락 카운트
- 선택 시: 현재 아트와 **v0.8 레퍼런스를 나란히**, 전체 메타데이터, 이 에셋을 쓰는 게임 오브젝트 목록
- 파츠는 **실제 몸체에 장착한 미리보기** + 앵커 크로스헤어
- **조정 도구**: anchorX / anchorY / scale / rotation / zIndex 슬라이더 →
  결과를 JSON으로 복사 → `assetCatalog.ts`에 붙여넣기

## 6. 이미지 교체 절차 (5단계)

1. 새 이미지를 `public/assets/<category>/` 에 넣는다 (알파 PNG 권장)
2. `src/assets/assetCatalog.ts`에서 해당 엔트리의 `file`, `width`, `height`를 고친다
3. `npm run dev` → `/#/dev/assets` → 해당 에셋 선택 → 슬라이더로 앵커·스케일·회전 조정 →
   **JSON 복사** → 카탈로그에 붙여넣기
4. `npm run assets:validate` (파일 존재·크기 일치·알파 유무 확인)
5. `npm run assets:atlas && npm run assets:catalog` — 아틀라스와 JSON 미러 갱신

컴포넌트·CSS·엔진은 건드리지 않는다.

## 7. 검증

`npm run assets:validate`가 확인하는 것:

- 모든 `file` / `fallbackFile` / `referenceFile`이 디스크에 존재하는가
- 선언한 width/height가 실제 파일과 일치하는가
- 배경이 아닌 에셋에 알파 채널이 있는가 (없으면 불투명 사각형으로 렌더된다)
- 카탈로그가 참조하지 않는 고아 파일

`tests/unit/content.test.ts`가 추가로 확인하는 것:

- 모든 파츠의 `assetId`가 category `part` + 같은 slot으로 해결되는가
- 몸체 에셋이 슬롯마다 attach 지점을 갖는가
- placeholder는 fallback을 갖지 않는가 (자기 자신이 fallback이므로)

## 8. `catalog.json`

`src/assets/assetCatalog.ts`가 원본이다 (타입 검사와 IDE 보조를 받으므로).
`npm run assets:catalog`이 `public/assets/catalog.json`으로 미러를 내보낸다 —
TypeScript를 돌리지 않는 외부 도구가 같은 메타데이터를 읽을 수 있게 하기 위해서다.
