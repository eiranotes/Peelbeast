# 04 — 조립과 박리

## 1. 조립 계산

`src/game/systems/assemblySystem.ts` — `computeBuild(assembly, ctx)`가 유일한 계산처다.

```
computeBuild(assembly, { peeled: Set<PartSlot>, relics: string[] }) → BuildSummary
```

돌려주는 것:

```ts
{ maxHp, maxGlue, atk, spd, peelResist, cooldownStart,
  skills[], passives[], rules[],
  activeSynergies[], brokenSynergies[] }
```

핵심 규칙 하나: **`peeled`에 든 슬롯은 아무것도 기여하지 않는다.**
스탯도, 스킬도, 패시브 규칙도, 시너지 자격도. 그래서 "박리 시 능력이 사라진다"가
곳곳에 흩어진 처리가 아니라 이 함수의 성질이다.

`peelResolver.recalculateBuild(state)`가 이 함수를 호출하며, 호출되는 곳은 정확히 두 군데다:
`peelPart()`와 `reattachPart()`.

### 1.1 시너지의 3상태

| 상태 | 조건 | UI |
|---|---|---|
| active | 요구 파츠가 전부 장착 + 전부 부착 | 초록, 효과 적용 |
| broken | 전부 장착됐지만 하나가 벗겨짐 | "깨짐"으로 표시, 효과 없음 |
| dormant | 요구 파츠를 다 갖지 않음 | 흐리게, 요구 조건 표시 |

`brokenSynergies`를 따로 반환하는 이유는 "원래 있었는데 지금 없다"와 "애초에 없다"가
플레이어에게 완전히 다른 정보이기 때문이다.

## 2. 시각 조립 — 앵커 모델

캐릭터는 **몸체 이미지 + 슬롯당 파츠 이미지 레이어**다. 위치는 전부 카탈로그에서 나온다.

```
몸체가 attach[slot] 을 선언한다     — 몸체 이미지 기준 정규화 좌표
파츠가 anchorX/anchorY 를 선언한다  — 파츠 이미지 기준 정규화 좌표

렌더링: 파츠의 anchor를 몸체의 attach 위에 핀으로 꽂고,
        폭을 scale × 렌더된 몸체 폭으로 맞추고,
        anchor를 중심으로 rotation만큼 돌린다
```

`assetLoader.computePartLayout()`이 이 계산의 유일한 구현이고 순수 함수다.
`/dev/assets`의 조정 도구, 작업대, 전투 화면, 그리고 헤드리스 미리보기
(`scripts/preview-assembly.mjs`)가 전부 같은 함수를 쓴다.

`body.cat`의 attach 좌표:

| 슬롯 | x | y |
|---|---|---|
| head | 0.50 | 0.400 |
| hand | 0.855 | 0.515 |
| core | 0.50 | 0.700 |
| trinket | 0.50 | 0.475 |

z 순서: 배경 0 → 소품 10 → 몸체 20 → 코어 26 → 머리 30 → 장신구 34 → 손 40 → 이펙트 70

몸체를 몇 px로 그리든 파츠가 따라온다. 전투 화면은 무대 높이에서 몸체 폭을 역산하므로
1280×720에서는 캐릭터가 잘리지 않고 작아진다.

## 3. 박리

### 3.1 판정 순서

```
1. Block ≥ 임계값?           → 시도 자체가 막힌다 (Guard가 박리의 대답이 된다)
2. 대상 슬롯 선택            → 의도가 지정한 슬롯 목록 중 부착된 것
                               Drift 중이면 장신구는 뒤로 밀린다
3. 박리 확률 판정            → 0.72 - (박리저항 × 0.11), [0.10, 0.95]로 클램프
4. 캐치 판정                 → Tape Roll의 Adhesive Memory 35%
5. 실제 박리
```

### 3.2 박리 시 일어나는 일 (동시에)

1. `slots[slot].peeled = true`, 쿨다운 초기화
2. 바닥 목록에 `FloorPart` 추가 — 착지 위치와 회전은 시드 RNG로 결정
3. `recalculateBuild()` → 스탯·스킬·패시브·시너지가 한 번에 빠진다
4. `FxEvent{type:'peel'}` 방출 → 화면에서 파츠가 뜯겨 낙하
5. 로그 기록
6. Bread Patch의 Emergency Stitch가 있으면 Block +3
7. Backup Patch 리릭이 있으면 전투당 1회 즉시 재부착

현재 HP/Glue는 새 최대치로 **클램프될 뿐 회복되지 않는다.** 최대 HP를 잃으면 아프다.

### 3.3 재부착

`Repair`, `Patch Loop`(Tape Roll), `Mending Patch`(Bread Patch),
`Reinforced Package` 시너지의 Guard, `Backup Patch` 리릭.

역과정이 정확히 대칭이다: `peeled = false` → 바닥에서 제거 → `recalculateBuild()` →
레이어 복귀. `tests/integration/fullRun.test.ts`가 **네 슬롯을 전부 벗기고 전부 되붙였을 때
원래 수치와 완전히 일치하는지** 검증한다.

### 3.4 Glue 파열

턴 시작 시 Glue가 0이면 부착된 슬롯 하나가 무작위로 벗겨진다.
Glue를 스킬 자원으로만 보다가 바닥내면 몸이 헐거워진다.

## 4. 작업대 화면

v0.8에서 조립은 전투 화면 사이드바에 있었고, 파츠를 바꾸면 전투가 조용히 리셋됐다 —
불리할 때 누르는 무료 재시도 버튼이었다. v0.9에서 작업대는 **독립 화면**이고
전투 중 교체는 불가능하다.

제공하는 것:

- 몸체 중심 미리보기, 슬롯 클릭으로 해당 서랍 열기
- 파츠 서랍 (슬롯 탭 + 카드 그리드), 장착/해제/교체
- **호버 시 장착 전후 비교** — 스탯 델타, 얻는 스킬, 잃는 스킬, 얻는/잃는 시너지
- 액티브 스킬 목록 (설명은 effect 데이터에서 생성)
- 패시브 / 시너지 / 런 모드 목록
- 경로 진행 보드

호환 불가한 조합은 비활성화하고 **이유를 표시한다** (`compatibility()`).
