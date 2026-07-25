import type { IntentDef } from './types';

/**
 * Enemy intents.
 *
 * The intent card the player reads is GENERATED from `effects` (see
 * `describeIntent` in engine/describe.ts) and the resolver EXECUTES the same
 * `effects`. There is no second copy of the numbers to drift out of sync — the
 * exact failure the v0.8 build had once `fury` started modifying damage.
 */
export const INTENTS: Record<string, IntentDef> = {
  // Pencil Rat
  gnawNib: {
    id: 'gnawNib',
    name: 'Gnaw Nib',
    category: 'attack',
    iconAssetId: 'fx.slash',
    blockable: true,
    piercing: false,
    flavour: '펜촉을 갉아 글루를 훔친다.',
    effects: [
      { kind: 'damage', amount: 5 },
      { kind: 'drainGlue', amount: 3 },
    ],
  },
  dartSteal: {
    id: 'dartSteal',
    name: 'Dart Steal',
    category: 'attack',
    iconAssetId: 'fx.spark',
    blockable: true,
    piercing: false,
    flavour: '치고 빠지며 몸을 웅크린다.',
    effects: [
      { kind: 'damage', amount: 4 },
      { kind: 'enemyBlock', amount: 4 },
    ],
  },
  scratchRush: {
    id: 'scratchRush',
    name: 'Scratch Rush',
    category: 'attack',
    iconAssetId: 'fx.slash',
    blockable: true,
    piercing: false,
    flavour: '앞발이 두 번 스친다.',
    effects: [{ kind: 'damage', amount: 3, hits: 2 }],
  },
  stashScrap: {
    id: 'stashScrap',
    name: 'Stash Scrap',
    category: 'defend',
    iconAssetId: 'icon.status.block',
    blockable: false,
    piercing: false,
    flavour: '훔친 조각을 쌓아 벽을 만든다.',
    effects: [
      { kind: 'enemyBlock', amount: 6 },
      { kind: 'fury', amount: 1 },
    ],
  },
  undercut: {
    id: 'undercut',
    name: 'Undercut',
    category: 'peel',
    iconAssetId: 'icon.status.peel',
    blockable: true,
    piercing: false,
    flavour: '아래를 훑어 코어나 장신구를 뜯어낸다.',
    effects: [
      { kind: 'damage', amount: 3 },
      { kind: 'peel', slots: ['core', 'trinket'], blockThreshold: 4 },
    ],
  },

  // Tape Spider
  webWrap: {
    id: 'webWrap',
    name: 'Web Wrap',
    category: 'peel',
    iconAssetId: 'icon.status.bind',
    blockable: true,
    piercing: false,
    flavour: '테이프가 손을 감아 묶는다.',
    effects: [
      { kind: 'damage', amount: 4 },
      { kind: 'status', target: 'opponent', status: 'bind', amount: 1 },
      { kind: 'peel', slots: ['hand'], blockThreshold: 4 },
    ],
  },
  inkSpit: {
    id: 'inkSpit',
    name: 'Ink Spit',
    category: 'ink',
    iconAssetId: 'icon.status.ink',
    blockable: true,
    piercing: false,
    flavour: '잉크가 책상 위로 번진다.',
    effects: [
      { kind: 'damage', amount: 5 },
      { kind: 'drainGlue', amount: 4 },
      { kind: 'ink', amount: 2 },
    ],
  },
  snarePluck: {
    id: 'snarePluck',
    name: 'Snare Pluck',
    category: 'peel',
    iconAssetId: 'icon.status.peel',
    blockable: true,
    piercing: false,
    flavour: '실을 당겨 아무 조각이나 뜯는다.',
    effects: [
      { kind: 'damage', amount: 2 },
      { kind: 'peel', slots: 'any', blockThreshold: 3 },
    ],
  },
  braceNest: {
    id: 'braceNest',
    name: 'Brace Nest',
    category: 'defend',
    iconAssetId: 'icon.status.block',
    blockable: false,
    piercing: false,
    flavour: '둥지를 조여 방벽을 세운다.',
    effects: [
      { kind: 'enemyBlock', amount: 8 },
      { kind: 'fury', amount: 1 },
    ],
  },
  pounce: {
    id: 'pounce',
    name: 'Pounce',
    category: 'attack',
    iconAssetId: 'fx.impact',
    blockable: true,
    piercing: false,
    flavour: '단숨에 덮친다.',
    effects: [{ kind: 'damage', amount: 6 }],
  },

  // Scissor Crow
  diveBomb: {
    id: 'diveBomb',
    name: 'Dive Bomb',
    category: 'attack',
    iconAssetId: 'fx.impact',
    blockable: true,
    piercing: false,
    flavour: '높은 곳에서 급강하한다.',
    effects: [
      { kind: 'damage', amount: 7, bonus: { when: { kind: 'selfHasStatus', status: 'pinned' }, amount: 2 } },
    ],
  },
  shearPluck: {
    id: 'shearPluck',
    name: 'Shear Pluck',
    category: 'peel',
    iconAssetId: 'icon.status.peel',
    blockable: true,
    piercing: false,
    flavour: '가위 부리로 머리나 장신구를 잘라낸다.',
    effects: [
      { kind: 'damage', amount: 4 },
      { kind: 'peel', slots: ['head', 'trinket'], blockThreshold: 5 },
    ],
  },
  featherBurst: {
    id: 'featherBurst',
    name: 'Feather Burst',
    category: 'attack',
    iconAssetId: 'fx.slash',
    blockable: true,
    piercing: false,
    flavour: '깃털이 두 번 터지고 방어를 깎는다.',
    effects: [
      { kind: 'damage', amount: 3, hits: 2 },
      { kind: 'shredBlock', amount: 3 },
    ],
  },
  inkShriek: {
    id: 'inkShriek',
    name: 'Ink Shriek',
    category: 'ink',
    iconAssetId: 'icon.status.frazzle',
    blockable: true,
    piercing: false,
    flavour: '비명이 잉크를 튀긴다.',
    effects: [
      { kind: 'damage', amount: 3 },
      { kind: 'status', target: 'opponent', status: 'frazzle', amount: 1 },
      { kind: 'ink', amount: 1 },
    ],
  },
  rallyFlock: {
    id: 'rallyFlock',
    name: 'Rally Flock',
    category: 'defend',
    iconAssetId: 'icon.status.block',
    blockable: false,
    piercing: false,
    flavour: '무리를 불러 모은다.',
    effects: [
      { kind: 'enemyBlock', amount: 7 },
      { kind: 'fury', amount: 1 },
    ],
  },
  talonRake: {
    id: 'talonRake',
    name: 'Talon Rake',
    category: 'attack',
    iconAssetId: 'fx.slash',
    blockable: false,
    piercing: true,
    flavour: '발톱이 방어를 무시하고 파고든다.',
    effects: [
      { kind: 'damage', amount: 4, ignoreBlock: true },
      { kind: 'status', target: 'opponent', status: 'fragile', amount: 1 },
    ],
  },

  // Clip Moth
  dustVeil: {
    id: 'dustVeil',
    name: 'Dust Veil',
    category: 'debuff',
    iconAssetId: 'icon.status.frazzle',
    blockable: true,
    piercing: false,
    flavour: '비늘가루가 시야를 흐린다.',
    effects: [
      { kind: 'damage', amount: 2 },
      { kind: 'status', target: 'opponent', status: 'frazzle', amount: 1 },
      { kind: 'status', target: 'opponent', status: 'vulnerable', amount: 1 },
    ],
  },
  clipSnip: {
    id: 'clipSnip',
    name: 'Clip Snip',
    category: 'peel',
    iconAssetId: 'icon.status.peel',
    blockable: true,
    piercing: false,
    flavour: '클립 다리가 조각을 집어 든다.',
    effects: [
      { kind: 'damage', amount: 3 },
      { kind: 'peel', slots: 'any', blockThreshold: 4 },
    ],
  },
  flutterGuard: {
    id: 'flutterGuard',
    name: 'Flutter Guard',
    category: 'defend',
    iconAssetId: 'icon.status.block',
    blockable: false,
    piercing: false,
    flavour: '날개를 접어 몸을 감싼다.',
    effects: [{ kind: 'enemyBlock', amount: 6 }],
  },
  paperCut: {
    id: 'paperCut',
    name: 'Paper Cut',
    category: 'attack',
    iconAssetId: 'fx.slash',
    blockable: true,
    piercing: false,
    flavour: '얇은 날개 끝이 살을 벤다.',
    effects: [{ kind: 'damage', amount: 5 }],
  },
};

export const INTENT_IDS = Object.keys(INTENTS);
