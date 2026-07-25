import type { EncounterDef, EnemyPhaseDef } from './types';

const PENCIL_RAT: EnemyPhaseDef = {
  enemyId: 'pencil_rat',
  name: 'Pencil Rat',
  subtitle: 'skirmish — scavenger thief',
  assetId: 'enemy.pencil_rat',
  maxHp: 24,
  intro: '연필 쥐가 책상 모서리에서 뛰쳐나와 종이 조각과 글루를 훔치려 든다.',
  moves: ['gnawNib', 'dartSteal', 'scratchRush', 'stashScrap', 'undercut'],
  desperation: { belowHpRatio: 0.4, moveId: 'stashScrap', chance: 0.35 },
};

const TAPE_SPIDER: EnemyPhaseDef = {
  enemyId: 'tape_spider',
  name: 'Tape Spider',
  subtitle: 'midfight — nest keeper',
  assetId: 'enemy.tape_spider',
  maxHp: 28,
  intro: '테이프 거미가 실끈으로 책상 가장자리를 봉합하며 다가온다.',
  moves: ['webWrap', 'inkSpit', 'snarePluck', 'braceNest', 'pounce'],
  desperation: { belowHpRatio: 0.4, moveId: 'braceNest', chance: 0.34 },
};

const CLIP_MOTH: EnemyPhaseDef = {
  enemyId: 'clip_moth',
  name: 'Clip Moth',
  subtitle: 'skirmish — dust flier',
  assetId: 'enemy.clip_moth',
  maxHp: 22,
  intro: '클립 나방이 스탠드 불빛 아래에서 비늘가루를 흩뿌리며 내려앉는다.',
  moves: ['dustVeil', 'clipSnip', 'paperCut', 'flutterGuard', 'paperCut'],
  desperation: { belowHpRatio: 0.35, moveId: 'flutterGuard', chance: 0.4 },
};

const SCISSOR_CROW: EnemyPhaseDef = {
  enemyId: 'scissor_crow',
  name: 'Scissor Crow',
  subtitle: 'elite — aggressive raider',
  assetId: 'enemy.scissor_crow',
  maxHp: 34,
  intro: '가위 까마귀가 높은 곳에서 급강하하며 재빠르게 파츠를 노린다.',
  moves: ['diveBomb', 'shearPluck', 'featherBurst', 'inkShriek', 'rallyFlock', 'talonRake'],
  desperation: { belowHpRatio: 0.35, moveId: 'featherBurst', chance: 0.36 },
};

export const ENCOUNTERS: Record<string, EncounterDef> = {
  rat: {
    id: 'rat',
    name: 'Nib Alley',
    kind: 'combat',
    summary: '빠른 선봉전. Pencil Rat가 글루를 훔친다.',
    backgroundAssetId: 'bg.desk',
    phases: [PENCIL_RAT],
    scrapReward: 9,
  },
  moth: {
    id: 'moth',
    name: 'Lamp Shade Drift',
    kind: 'combat',
    summary: '가벼운 전투. Clip Moth가 Frazzle과 Vulnerable을 쌓는다.',
    backgroundAssetId: 'bg.desk',
    phases: [CLIP_MOTH],
    scrapReward: 9,
  },
  spider: {
    id: 'spider',
    name: 'Tape Web Annex',
    kind: 'combat',
    summary: '중반전. Tape Spider가 Bind와 Ink를 누적시킨다.',
    backgroundAssetId: 'bg.desk',
    phases: [TAPE_SPIDER],
    scrapReward: 10,
  },
  eliteCrow: {
    id: 'eliteCrow',
    name: 'High Perch Raid',
    kind: 'elite',
    summary: '엘리트전. Scissor Crow가 머리와 장신구를 집요하게 노린다.',
    backgroundAssetId: 'bg.nest',
    phases: [{ ...SCISSOR_CROW, maxHp: 36 }],
    scrapReward: 14,
  },
  eliteSpider: {
    id: 'eliteSpider',
    name: 'Reinforced Annex',
    kind: 'elite',
    summary: '엘리트전. 보강된 Tape Spider가 잉크를 빠르게 채운다.',
    backgroundAssetId: 'bg.nest',
    phases: [{ ...TAPE_SPIDER, maxHp: 38, subtitle: 'elite — reinforced keeper' }],
    scrapReward: 14,
  },
  boss: {
    id: 'boss',
    name: 'Draftboard Nest',
    kind: 'boss',
    summary: '보스전. 거미가 길을 막고, 쓰러지면 까마귀가 내려온다.',
    backgroundAssetId: 'bg.nest',
    phases: [
      { ...TAPE_SPIDER, maxHp: 24, subtitle: 'boss phase 1 — nest keeper', intro: '드래프트보드 중심부를 지키는 거미가 먼저 길을 막는다.' },
      {
        ...SCISSOR_CROW,
        maxHp: 28,
        subtitle: 'boss phase 2 — high perch raider',
        intro: '상공에서 가위 까마귀가 급강하하며 전장을 장악한다.',
      },
    ],
    scrapReward: 20,
  },
};

export const ENCOUNTER_IDS = Object.keys(ENCOUNTERS);
