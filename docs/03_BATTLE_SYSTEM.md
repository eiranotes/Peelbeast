# 03 — 전투 시스템

구현: `src/game/engine/`. 모든 공개 함수는 `(state, ...) => BattleState` 이고 **새 상태를 반환**한다.
호출자의 객체는 변하지 않는다. 내부적으로는 진입점에서 한 번 복제하고 리졸버가 draft를 변이한다.

---

## 1. 턴 구조

```
플레이어 턴 시작
  ├ Block 0으로 초기화, counter 해제
  ├ 턴 시작 패시브 (Toast Helm: Focus가 없으면 +1)
  ├ Bind가 있으면 쿨다운 정지, 없으면 -1 (Haste면 -2)
  └ Glue가 0이면 파츠 하나가 벗겨진다
플레이어 행동 1회  ← resolvePlayerAction / resolveSkill
적 턴              ← resolveEnemyIntent
  ├ 의도 큐에서 하나 실행
  ├ 큐 보충
  └ 라운드 종료: Ink 범람 → Ink 감소 → 상태 감쇠 → 적 Block 0
```

행동과 반격이 분리된 것은 UI를 위해서다. 플레이어의 동작이 화면에서 끝난 뒤 적이 움직인다
(`BALANCE.feel.enemyTurnDelay` = 520 ms).

## 2. 데미지 파이프라인

`damageResolver.applyDamage`가 유일한 통로다. 순서가 한 곳에 적혀 있고 테스트된다.

```
1. Fragile   (방어자)  → +1
2. Vulnerable(방어자)  → ×1.5
3. Drift     (방어자)  → -1
4. 잉크 저항  (잉크 패킷) → -n
5. 첫 피격 완화 (전투당 1회) → -n
6. Block 흡수 (관통이 아니면)
7. HP 차감
8. 반격 / 잉크 반사
```

부분 관통(`pierce`)은 Block을 n만큼 무시하고 나머지로 흡수한다.
전체 관통(`ignoreBlock`)은 Block을 아예 건너뛴다.

## 3. 상태 효과

`src/game/data/statuses.ts`가 유일한 정의처다. 감쇠 정책이 정의에 붙어 있고,
`statusResolver.tickStatusDecay`만 그것을 읽는다 — v0.8처럼 8줄을 손으로 감소시키지 않는다.

| 상태 | 진영 | 감쇠 | 규칙 |
|---|---|---|---|
| Focus | 플레이어 | 소비 시 | 기본 공격 +2, 공격할 때 1 소모 |
| Drift | 플레이어 | 라운드 | 받는 피해 -1, 장신구가 박리 대상에서 밀린다 |
| Bind | 플레이어 | 라운드 | 쿨다운이 내려가지 않는다 |
| Haste | 플레이어 | 라운드 | 턴 종료 시 쿨다운 1 추가 감소 |
| Pinned | 적 | 라운드 | 절단·강타 계열이 추가 피해 |
| Fragile | 양쪽 | 라운드 | 받는 피해 +1 |
| Frazzle | 플레이어 | 라운드 | 기본 공격 -2 |
| **Insight** | 플레이어 | 소비 시 | 적 의도의 정확한 수치 공개, 의도 실행 시 1 소모 |
| **Vulnerable** | 양쪽 | 라운드 | 받는 피해 ×1.5 |

굵게 표시한 둘은 v0.8에서 수치만 있고 규칙이 없던 죽은 상태값이다. 삭제하지 않고 되살렸다.

## 4. 플레이어 행동

### 4.1 코어 액션

| 액션 | 기본 효과 | 확장 지점 |
|---|---|---|
| Peel Strike | ATK 기반 공격 | `basicBonusVsStatus`, `basicApplyStatus`, `basicPierce` |
| Guard | Block 6 | `guardBonus`, `guardCleanse`, `repairReattach` |
| Repair | HP +3, Glue +7, 파츠 1개 복구 | `sustainBonusGlue`, 리릭 `repairBonus` |
| Press | 쿨다운 -1, Glue +4 | `sustainBonusGlue`, 리릭 `pressCooldownBonus` |

리졸버는 `state.build.head === 'box'` 같은 문자열 비교를 하지 않는다.
집계된 규칙 목록에 "Guard가 몇 만큼 늘어나는가"를 묻는다. 파츠 추가는 데이터 변경으로 끝난다.

### 4.2 스킬

스킬은 `Effect[]`다. 쿨다운과 Glue 비용을 가지며, 슬롯이 벗겨지면 즉시 사용 불가가 된다.

```ts
{ id: 'scissorFlurry', cooldown: 3, glueCost: 3,
  effects: [
    { kind: 'damage', amount: 8,
      bonus: { when: { kind: 'opponentHasStatus', status: 'pinned' }, amount: 3 } },
    { kind: 'cleanse', target: 'self', status: 'bind' },
  ] }
```

## 5. 적 의도 — 이중 정의를 구조적으로 제거

v0.8은 의도 텍스트(`'4 피해 · Bind 1'`)와 실행 코드(`4 - weak + fury`)를 따로 갖고 있었고,
`fury`가 도입된 순간 어긋났다.

여기서는 **하나의 `Effect[]`에서 둘 다 파생된다.**

```
IntentDef.effects ──┬──> effectResolver.applyEffects   (실행)
                    └──> describe.describeIntent        (표시)
```

의도 카드는 다음을 **구조화된 필드로** 제공한다: 총 피해(Fury·약화 반영), 타격 횟수,
상태 부여, Glue 손실, Ink 증가, 적 Block 증가, 박리 대상 슬롯, 박리를 막는 Block 임계값,
방어 가능 여부, 관통 여부, 위험도 4단계.

`tests/unit/describe.test.ts`가 **모든 순수 피해 의도에 대해 예고값 == 실제 HP 감소량**을 검증한다.
Fury와 약화가 걸린 경우도 함께 검증한다.

Insight 없이는 추정 구간(`8–12 피해`)으로, Eye Sticker나 Insight가 있으면 정확한 값으로 표시된다.

## 6. 적 AI

- 페이즈별 move pool에서 시드 RNG로 추출
- 큐에 이미 있는 수는 최대 2회까지 재추첨한다 — 같은 카드 3장이 뜨면 예고가 정보를 주지 못한다
- HP가 임계 비율 아래로 떨어지면 desperation 수가 확률적으로 끼어든다
- 보스는 페이즈 1이 죽어도 전투가 끝나지 않고 페이즈 2로 넘어간다 (Block·Fury를 갖고 등장).
  같은 순간 플레이어도 최대 HP의 25 %를 회복한다 — 그 대칭이 없으면 2페이즈는
  항상 소진된 빌드를 상대로 열려 승률이 사실상 0이 된다

### 6.1 Fury

방어 계열 의도가 Fury를 쌓고, Fury는 **의도 하나당 1회** 피해에 더해진다 (상한 2).
초기 구현은 상한도 감쇠도 없이 **타격마다** 더했고, 그 결과 2타 의도가 Fury 3에서
+6을 얻어 긴 전투가 되돌릴 수 없는 나선이 됐다 — 시뮬레이션에서 전 빌드 승률 0 %로 드러났다.

## 7. 결정론

`Math.random()`은 `src/game/**` 어디에도 없다. mulberry32 상태가 `BattleState.rngState`에 담겨 있어
직렬화·복제·저장을 견딘다.

```
동일 seed + 동일 행동 순서 = 동일 상태
```

`tests/unit/determinism.test.ts`가 전투·상점 롤·랜덤 리릭 전부에 대해 이를 강제한다.
브라우저에서는 `?seed=1234`.

## 8. 조작감 (feel)

엔진은 DOM을 모른다. 대신 무슨 일이 일어났는지를 `FxEvent[]`로 방출한다:

```ts
{ type: 'hit', target: 'enemy', amount: 9, blocked: 0, pierced: false }
{ type: 'peel', slot: 'hand', partId: 'part.hand.scissors', key: 'peel-14' }
```

`BattleScreen`이 이를 모션으로 번역한다:

| 이벤트 | 연출 |
|---|---|
| playerAttack | 캐릭터가 전진하며 회전 (340 ms) |
| hit (적) | 적 흔들림 + 밝기 플래시, 화면 hit-stop 130 ms, 피해 숫자 부양 |
| hit (플레이어) | 캐릭터 피격 포즈 + 숫자 |
| block / heal / glue | 색상별 숫자 부양 |
| peel | 파츠가 뜯겨 120° 회전하며 낙하 (900 ms) → 책상 위에 착지 |
| reattach | 레이어 복귀, 낙하 클론 즉시 제거 |
| outcome | 승리 점프 / 패배 붕괴 |

타이밍 상수는 `BALANCE.feel`에 있고 **엔진은 이를 읽지 않는다.**

`prefers-reduced-motion`에서는 모든 애니메이션이 1 ms로 축약된다.
