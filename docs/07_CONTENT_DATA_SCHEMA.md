# 07 — 콘텐츠 데이터 스키마

정의: `src/game/data/types.ts` · 검증: `src/game/data/validate.ts`

## 1. 설계 원칙

> **능력은 한 번만 기술한다. 규칙 엔진과 UI 문구가 같은 데이터에서 파생된다.**

v0.8은 의도 텍스트와 데미지 산술을 따로 갖고 있었고, `fury`가 도입된 순간 어긋났다.
여기서는 그 실패 양식이 구조적으로 불가능하다.

두 번째 원칙: **파츠 효과는 코드가 아니라 데이터다.**
v0.8은 `state.build.hand === 'umbrella'` 같은 문자열 비교를 엔진 전역 27곳에 흩어 놓았다.

## 2. Effect — 실행 단위

플레이어 스킬과 적 의도 **둘 다** `Effect[]`이고, 같은 리졸버가 처리한다.
`self` / `opponent`는 `source`를 기준으로 해석되므로 한 구현이 양쪽을 처리한다.

```ts
type Effect =
  | { kind: 'damage'; amount; ignoreBlock?; hits?; bonus?: { when: EffectCondition; amount } }
  | { kind: 'block' | 'heal' | 'glue' | 'drainGlue' | 'ink' | 'cooldown'
      | 'reflectInk' | 'counter' | 'weakenNextIntent' | 'enemyBlock' | 'fury'
      | 'shredBlock'; amount: number }
  | { kind: 'status'; target: 'self' | 'opponent'; status: StatusId; amount }
  | { kind: 'cleanse'; target; status }
  | { kind: 'reattach'; count }
  | { kind: 'peel'; slots: PartSlot[] | 'any'; blockThreshold };
```

`EffectCondition`은 `opponentHasStatus` / `selfHasStatus` / `selfSpeedAtLeast` /
`anyPartPeeled` / `noPartPeeled`.

## 3. PassiveRule — 규칙 단위

패시브는 자유 함수가 아니라 **타입이 붙은 규칙**이다. 실행하지 않고도 나열·검증·표시할 수 있다.

```ts
type PassiveRule =
  | { kind: 'basicBonusVsStatus'; status; amount }   // 특정 상태의 상대에게 기본 공격 +n
  | { kind: 'basicApplyStatus'; status; amount }     // 기본 공격이 상태 부여
  | { kind: 'basicPierce'; amount }                  // 기본 공격이 Block n 무시
  | { kind: 'guardBonus'; amount }
  | { kind: 'guardCleanse'; status; amount }
  | { kind: 'sustainBonusGlue'; amount }             // Repair / Press에 Glue +n
  | { kind: 'repairReattach' }                       // Guard가 파츠도 복구
  | { kind: 'inkResist'; amount }
  | { kind: 'peelCatch'; chance }                    // 박리를 무효화할 확률
  | { kind: 'blockOnPeel'; amount }
  | { kind: 'turnStartStatusIfEmpty'; status; amount }
  | { kind: 'revealIntents' }
  | { kind: 'firstHitSoften'; amount };
```

리졸버는 `rules.ts`의 헬퍼로 이 목록에 질문한다:
`sumPassive(rules, 'guardBonus')`, `peelCatchChance(rules)`, `hasPassive(rules, 'revealIntents')`.

새 파츠가 Guard를 강화한다면 `guardBonus` 규칙을 데이터에 쓰면 되고, Guard 리졸버는 바뀌지 않는다.
새로운 **종류**의 효과가 필요할 때만 규칙 kind가 추가된다.

## 4. 데이터 파일

| 파일 | 내용 | 개수 |
|---|---|---|
| `parts.ts` | `BodyDef`, `PartDef` (스탯 + 액티브 + 패시브) | 몸체 1, 파츠 12 |
| `synergies.ts` | `SynergyDef` (요구 파츠 + modifiers + rules) | 6 |
| `statuses.ts` | `StatusDef` (감쇠 정책, 최대치, 아이콘, 설명) | 9 |
| `intents.ts` | `IntentDef` (effects + blockable/piercing + 카테고리) | 19 |
| `enemies.ts` | `EncounterDef` → `EnemyPhaseDef[]` | 조우 6, 적 4 |
| `relics.ts` | `RelicDef` (modifiers + RelicRule[]) | 10 |
| `events.ts` | `EventDef` → `EventOptionDef[]` → `RunEffect[]` | 6 |
| `shops.ts` | `ShopDef` (relic / part / service 풀) | 1 (23 품목) |
| `routes.ts` | `RouteDef` (프로필 + 노드) | 2 |
| `balance.ts` | 모든 튜닝 상수 | — |

### 4.1 이벤트는 데이터다

v0.8은 이벤트 테이블 안에 `apply(run){ run.scrap += 3; }` 클로저를 넣어 두었다 —
테스트도 직렬화도 불가능했다. 여기서는 `RunEffect[]`이고 `rewardResolver`가 적용한다.

```ts
{ id: 'salvage', title: 'Salvage the mess', desc: 'Scrap +10',
  effects: [{ kind: 'scrap', amount: 10 }] }
```

`RunEffect`: `scrap` / `hp` / `glue` / `relic` / `randomRelic` / `startBlock` /
`startStatus` / `damagePart` / `repairAllParts` / `shopDiscount` / `forceEncounter`.

옵션에 `requires: { minScrap, hasRelic }`를 붙이면 조건부 선택지가 된다.

### 4.2 밸런스 상수

`balance.ts` **밖의 밸런스 매직넘버는 회귀로 간주한다.**
`core` / `damage` / `peel` / `ink` / `run` / `enemy` / `feel` 로 묶여 있으며,
`feel`(연출 타이밍)은 UI만 읽고 엔진은 읽지 않는다.

## 5. 검증

`validateContent()`는 스키마가 아니라 **교차 참조**를 본다 — 여기가 실제 버그가 사는 곳이다.

확인 항목:

- 모든 파츠의 `assetId`가 카탈로그에 있고 category/slot이 일치하는가
- 스킬 ID가 유일한가
- 모든 의도가 카탈로그 아이콘을 갖고, 어떤 조우에서든 **참조되는가** (고아 의도 경고)
- 모든 조우의 배경·적 스프라이트가 존재하고, move pool이 비어 있지 않은가
- 시너지가 요구하는 파츠가 존재하고, **같은 슬롯 두 개를 요구하지 않는가**
  (그러면 영원히 활성화될 수 없다)
- 이벤트·상점의 relic/part/encounter 참조가 유효한가
- 루트가 보스로 끝나고, 노드 타입과 조우 kind가 일치하는가
  (`elite` 노드에 `combat` 조우를 넣으면 에러)
- 의도가 piercing과 blockable을 동시에 주장하지 않는가

`assertContentValid()`는 에러가 있으면 던진다.
`tests/unit/content.test.ts`가 매 실행마다 호출하므로 잘못된 콘텐츠는 CI에서 잡힌다.
`/dev/data`가 같은 결과를 브라우저에 표시한다.

## 6. 콘텐츠 추가하기

**파츠**: `parts.ts`에 `PartDef` 추가 → `assetCatalog.ts`에 에셋 등록 →
필요하면 새 `PassiveRule` kind 추가. 리졸버·컴포넌트는 그대로.

**적**: `intents.ts`에 의도 추가 → `enemies.ts`에 `EnemyPhaseDef` → 조우에 배치 →
스프라이트를 `sprite-sources.mjs`에 저작하거나 파일을 넣고 카탈로그에 등록.

**이벤트**: `events.ts`에 `EventDef` → 루트 노드에 배치.

세 경우 모두 `npm test`가 참조 오류를 잡아준다.
