# PEELBEAST — 마스터 개발문서 (v0.9)

이 문서는 프로젝트의 단일 진입점이다. 세부 사항은 각 전문 문서로 링크한다.
v0.8까지의 원본 개발문서는 `docs/legacy/v0.8/`에 원문 그대로 보존되어 있고,
그 내용은 아래 문서군에 통합되었다.

| 문서 | 내용 |
|---|---|
| `01_REPOSITORY_AUDIT.md` | v0.8 저장소 감사 요약 (전체본은 `analysis/CURRENT_REPOSITORY_AUDIT.md`) |
| `02_GAME_DESIGN.md` | 게임 정의, 런 구조, 콘텐츠 목표 |
| `03_BATTLE_SYSTEM.md` | 전투 규칙, 데미지 파이프라인, 상태 효과, 의도 |
| `04_ASSEMBLY_AND_PEEL_SYSTEM.md` | 조립, 시너지, 박리/재부착 |
| `05_ASSET_CATALOG_SPEC.md` | 에셋 카탈로그 스펙과 교체 절차 |
| `06_UI_UX_AND_FEEL.md` | 화면 구성, 시각 언어, 조작감 |
| `07_CONTENT_DATA_SCHEMA.md` | 콘텐츠 데이터 스키마와 검증 |
| `08_TEST_PLAN.md` | 테스트 계획과 완료 판정 기준 |
| `09_ROADMAP.md` | 버전 이력과 로드맵 |
| `10_REFERENCE_IMAGE_MAPPING.md` | 레퍼런스 이미지 → 현재 에셋 매핑 |
| `11_ART_DIRECTION_AND_ASSET_BRIEF.md` | **아트 일괄 제작 발주 문서** — 톤, 규격, 에셋별 브리프 |

---

## 1. 한 줄 정의

**PEELBEAST**는 종이 공예 감성의 파츠 조립형 턴제 로그라이크다.
머리·손·코어·장신구를 조합해 짐승을 만들고, 전투 중 **파츠가 실제로 벗겨지며 빌드가 무너지는** 것을
핵심 긴장으로 삼는다.

## 2. v0.9에서 무엇이 바뀌었나

v0.8은 단일 `index.html` 661줄에 게임 전체가 들어 있었다. v0.9는 그 구조를 유지하지 않고
전면 재구현했다. 감사 결과와 근거는 `docs/analysis/CURRENT_REPOSITORY_AUDIT.md`에 있다.

**보존한 것 (개념)**
4슬롯 조립 · 파츠별 스탯/액티브/패시브 · 박리와 재부착 · 코어 액션 4종 ·
파츠 스킬 12종의 설계 의도 · 상태 어휘(Focus/Drift/Bind/Haste/Pinned/Fragile/Frazzle/Ink Tide) ·
노드 5종 · Scrap 경제 · 리릭 · HP/Glue 캐리오버 · 복수 루트 · 2페이즈 보스 ·
종이 공예 시각 방향 · 15~25분 런과 4~8턴 전투라는 템포 목표.

**폐기한 것 (구조)**
단일 HTML · 인라인 IIFE · `innerHTML` 렌더링 · 전역 가변 싱글턴 ·
파일 경로로 이미지를 직접 참조하는 방식 · 인라인 아틀라스 좌표 리터럴 ·
`Math.random()` 직접 호출 · 죽은 `reconstruct.yml` 워크플로 ·
로직 없이 장식만 하던 CSS 도형과 유령 스프라이트.

**되살린 것**
`vulnerable`, `insight`는 v0.8에서 수치만 존재하고 규칙이 없는 죽은 상태값이었다.
삭제하지 않고 실제 규칙을 부여했다 (`03_BATTLE_SYSTEM.md` §3).

## 3. 아키텍처

```
scripts/            에셋 파이프라인 (SVG 저작 → PNG → 아틀라스, 레퍼런스 추출, QA 스크린샷)
assets/source/      원본 SVG 스프라이트 + v0.8 레퍼런스 시트
public/assets/      런타임 이미지 (카테고리별) + catalog.json + generated/
src/app/            셸, 해시 라우팅, 게임 스토어 (엔진 ↔ React 접착)
src/assets/         assetTypes / assetCatalog / assetLoader
src/game/data/      parts, bodies, synergies, enemies, intents, statuses,
                    relics, events, shops, routes, balance, validate
src/game/engine/    battleEngine, turnResolver, damageResolver, peelResolver,
                    statusResolver, effectResolver, rewardResolver, describe, rng, rules, log
src/game/state/     battleState, runState
src/game/systems/   assemblySystem
src/components/     assembly / battle / route / event / shop / dev / common
tests/              unit / integration / e2e
```

### 3.1 지켜지는 경계

- **엔진은 React를 모른다.** `src/game/**`는 DOM API를 전혀 참조하지 않는다.
- **UI는 규칙을 다시 계산하지 않는다.** 엔진이 `FxEvent[]`로 "무엇이 일어났는가"를 알려주고,
  UI는 "어떻게 보일 것인가"만 결정한다.
- **컴포넌트는 파일 경로를 모른다.** 이미지는 논리 ID로만 요청한다.
- **밸런스 숫자는 `data/balance.ts`에만 있다.** 다른 파일의 매직넘버는 회귀로 간주한다.

### 3.2 기술 선택 근거

| 항목 | 선택 | 근거 |
|---|---|---|
| 빌드 | Vite | 정적 배포 유지, `base: './'` 로 서브패스·`file://` 모두 동작 |
| 언어 | TypeScript strict | v0.8의 오타 클래스 버그를 빌드 타임에 차단 |
| UI | React 18 | 화면 10개. 컴포넌트 경계가 책임 혼재를 구조적으로 막는다 |
| 게임 엔진 | **도입하지 않음** | 1:1 턴제에 씬 그래프·스프라이트 배칭·물리가 불필요하다. Phaser/PixiJS는 번들 +1 MB에 DOM 접근성(포커스·스크린리더·테스트 셀렉터)을 잃는다. 애니메이션은 CSS transform으로 충분하고, 그 편이 에셋 교체 가능성도 높다. 필요해지면 battle 뷰만 캔버스로 교체할 수 있도록 렌더러를 컴포넌트 경계 뒤에 두었다 |
| 검증 | 자체 validator | 정작 필요한 것은 스키마가 아니라 **교차 참조** 검사(존재하지 않는 파츠/에셋/스킬 ID)이고, 그건 Zod가 대신해주지 않는다. 런타임 의존성 0 |
| 난수 | seed 기반 mulberry32 | 재현 가능한 회귀 테스트의 전제 |

## 4. 결정론 계약

동일 seed + 동일 입력 = 동일 상태. RNG 커서는 상태에 담겨 직렬화되므로 저장·복원 후에도 유지된다.
`tests/unit/determinism.test.ts`가 이를 강제한다.
브라우저에서는 `?seed=1234`로 런을 고정할 수 있다 — 버그 리포트와 E2E가 이 위에 서 있다.

## 5. 현재 구현 범위

- 화면 10개: Title / Route Select / Workshop / Battle / Event / Shop / Reward / Result / `/dev/assets` / `/dev/data`
- 파츠 12종 (슬롯당 3), 시너지 6종, 적 4종, 조우 6종, 의도 19종, 리릭 10종, 이벤트 6종, 상태 9종
- 루트 2개 × 7노드, 2페이즈 보스, Scrap 경제, 캐리오버, localStorage 저장/이어하기
- 에셋 68종 카탈로그, 자동 아틀라스 생성, 누락 시 fallback
- 테스트 132 (단위/통합/컴포넌트) + E2E 15
- 밸런스 시뮬레이터 `npm run simulate`

## 6. 알려진 제약

`09_ROADMAP.md` §3에 정리했다. 요약: 최종 아트 미도입(현 스프라이트는 교체 대상 placeholder —
발주서는 `11_ART_DIRECTION_AND_ASSET_BRIEF.md`), 사운드 없음, 튜토리얼 없음,
밸런싱 1차만 완료(전투 길이가 목표의 2배, 순수 방어 빌드 승률 0 %), 콘텐츠 양이 목표치에 미달.
