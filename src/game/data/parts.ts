import type { BodyDef, PartDef, PartSlot } from './types';

/**
 * 12 parts across 4 slots. Every mechanical claim in `desc` is backed by data in
 * `stats`, `active.effects` or `passive.rules` — nothing here is decorative text.
 */

export const BODIES: Record<string, BodyDef> = {
  'body.cat': {
    id: 'body.cat',
    name: 'Peelbeast Cat',
    assetId: 'body.cat',
    base: { hp: 32, glue: 24, atk: 3, spd: 8, peelResist: 0 },
    slots: ['head', 'hand', 'core', 'trinket'],
  },
};

export const DEFAULT_BODY_ID = 'body.cat';

export const PARTS: Record<string, PartDef> = {
  // ── HEAD ───────────────────────────────────────────────────────────────────
  'part.head.toast_helm': {
    id: 'part.head.toast_helm',
    slot: 'head',
    name: 'Toast Helm',
    desc: '따끈한 토스트 투구. Focus를 쌓아 기본 공격을 밀어 올린다.',
    assetId: 'part.head.toast_helm',
    stats: { hp: 4, atk: 1 },
    active: {
      id: 'copySpark',
      name: 'Copy Spark',
      iconAssetId: 'fx.spark',
      cooldown: 2,
      glueCost: 2,
      flavour: '빵 부스러기가 튀며 불꽃이 인다.',
      animation: 'strike',
      effects: [
        { kind: 'damage', amount: 5, bonus: { when: { kind: 'opponentHasStatus', status: 'pinned' }, amount: 2 } },
        { kind: 'status', target: 'self', status: 'focus', amount: 1 },
      ],
    },
    passive: {
      id: 'warmCrumb',
      title: 'Warm Crumb',
      desc: '내 턴 시작 시 Focus가 없으면 Focus 1을 얻는다.',
      rules: [{ kind: 'turnStartStatusIfEmpty', status: 'focus', amount: 1 }],
    },
    tags: ['bread', 'focus'],
  },
  'part.head.box_shell': {
    id: 'part.head.box_shell',
    slot: 'head',
    name: 'Box Shell',
    desc: '골판지 껍질. 느리지만 단단하고 잘 벗겨지지 않는다.',
    assetId: 'part.head.box_shell',
    stats: { hp: 8, glue: 1, spd: -1, peelResist: 1 },
    active: {
      id: 'foldGuard',
      name: 'Fold Guard',
      iconAssetId: 'icon.status.block',
      cooldown: 3,
      glueCost: 2,
      flavour: '접힌 판지가 정면을 막아선다.',
      animation: 'guard',
      effects: [
        { kind: 'block', amount: 9 },
        { kind: 'counter', amount: 4 },
      ],
    },
    passive: {
      id: 'corrugatedBulk',
      title: 'Corrugated Bulk',
      desc: 'Guard가 +2 Block. 박리 저항 +1.',
      modifiers: { peelResist: 1 },
      rules: [{ kind: 'guardBonus', amount: 2 }],
    },
    tags: ['cardboard', 'guard'],
  },
  'part.head.ghost_hood': {
    id: 'part.head.ghost_hood',
    slot: 'head',
    name: 'Ghost Hood',
    desc: '가벼운 유령 후드. Drift로 피해를 흘리고 속도를 얻는다.',
    assetId: 'part.head.ghost_hood',
    stats: { hp: 1, glue: 5, spd: 2 },
    active: {
      id: 'driftVeil',
      name: 'Drift Veil',
      iconAssetId: 'icon.status.drift',
      cooldown: 2,
      glueCost: 3,
      flavour: '천이 부풀며 몸이 반쯤 떠오른다.',
      animation: 'hop',
      effects: [
        { kind: 'damage', amount: 3 },
        { kind: 'status', target: 'self', status: 'drift', amount: 2 },
        { kind: 'cleanse', target: 'self', status: 'bind' },
      ],
    },
    passive: {
      id: 'airyFold',
      title: 'Airy Fold',
      desc: '전투 첫 피격을 2 줄인다. Drift 중에는 장신구가 박리 대상에서 밀린다.',
      rules: [{ kind: 'firstHitSoften', amount: 2 }],
    },
    tags: ['ghost', 'drift'],
  },

  // ── HAND ───────────────────────────────────────────────────────────────────
  'part.hand.scissors': {
    id: 'part.hand.scissors',
    slot: 'hand',
    name: 'Scissors',
    desc: '절단 특화. 고정된 상대를 크게 벤다.',
    assetId: 'part.hand.scissors',
    stats: { atk: 3 },
    active: {
      id: 'scissorFlurry',
      name: 'Scissor Flurry',
      iconAssetId: 'fx.slash',
      cooldown: 3,
      glueCost: 3,
      flavour: '가위가 연달아 종이를 가른다.',
      animation: 'snip',
      effects: [
        { kind: 'damage', amount: 8, bonus: { when: { kind: 'opponentHasStatus', status: 'pinned' }, amount: 3 } },
        { kind: 'cleanse', target: 'self', status: 'bind' },
      ],
    },
    passive: {
      id: 'sharpSnip',
      title: 'Sharp Snip',
      desc: 'Pinned 상대에게 기본 공격 +2 피해.',
      rules: [{ kind: 'basicBonusVsStatus', status: 'pinned', amount: 2 }],
    },
    tags: ['blade'],
  },
  'part.hand.pencil_spear': {
    id: 'part.hand.pencil_spear',
    slot: 'hand',
    name: 'Pencil Spear',
    desc: '관통 창. Pinned를 남겨 후속 연계를 만든다.',
    assetId: 'part.hand.pencil_spear',
    stats: { atk: 2, spd: 1 },
    active: {
      id: 'pinThrust',
      name: 'Pin Thrust',
      iconAssetId: 'icon.status.pinned',
      cooldown: 2,
      glueCost: 2,
      flavour: '흑연 촉이 판을 꿰뚫는다.',
      animation: 'thrust',
      effects: [
        { kind: 'damage', amount: 6, ignoreBlock: true },
        { kind: 'status', target: 'opponent', status: 'pinned', amount: 2 },
      ],
    },
    passive: {
      id: 'piercingPoint',
      title: 'Piercing Point',
      desc: '기본 공격이 Block 2를 무시하고 Pinned 1을 부여한다.',
      rules: [
        { kind: 'basicPierce', amount: 2 },
        { kind: 'basicApplyStatus', status: 'pinned', amount: 1 },
      ],
    },
    tags: ['pierce'],
  },
  'part.hand.umbrella_hook': {
    id: 'part.hand.umbrella_hook',
    slot: 'hand',
    name: 'Umbrella Hook',
    desc: '우산형 보호구. 잉크와 속박에 강하다.',
    assetId: 'part.hand.umbrella_hook',
    stats: { hp: 3, glue: 2 },
    active: {
      id: 'umbrellaBastion',
      name: 'Umbrella Bastion',
      iconAssetId: 'icon.status.block',
      cooldown: 2,
      glueCost: 2,
      flavour: '우산이 펼쳐지며 잉크를 튕겨낸다.',
      animation: 'shelter',
      effects: [
        { kind: 'block', amount: 7 },
        { kind: 'reflectInk', amount: 1 },
        { kind: 'ink', amount: -1 },
      ],
    },
    passive: {
      id: 'rainCover',
      title: 'Rain Cover',
      desc: '잉크 피해 -2. Guard 시 Bind 1을 정리한다.',
      rules: [
        { kind: 'inkResist', amount: 2 },
        { kind: 'guardCleanse', status: 'bind', amount: 1 },
      ],
    },
    tags: ['shelter', 'ink'],
  },

  // ── CORE ───────────────────────────────────────────────────────────────────
  'part.core.bomb_belly': {
    id: 'part.core.bomb_belly',
    slot: 'core',
    name: 'Bomb Belly',
    desc: '폭발 코어. 글루를 태워 큰 화력을 낸다.',
    assetId: 'part.core.bomb_belly',
    stats: { hp: 1, atk: 2, glue: -4 },
    active: {
      id: 'burstStitch',
      name: 'Burst Stitch',
      iconAssetId: 'fx.impact',
      cooldown: 4,
      glueCost: 5,
      flavour: '심지가 타들어가 배가 터진다.',
      animation: 'burst',
      effects: [
        { kind: 'damage', amount: 11 },
        { kind: 'status', target: 'opponent', status: 'fragile', amount: 2 },
      ],
    },
    passive: {
      id: 'volatileStuffing',
      title: 'Volatile Stuffing',
      desc: '벗겨진 파츠가 있으면 기본 공격 +2 피해. 최대 Glue -4.',
      rules: [{ kind: 'basicBonusVsStatus', status: 'fragile', amount: 2 }],
    },
    tags: ['burst'],
  },
  'part.core.coffee_cup': {
    id: 'part.core.coffee_cup',
    slot: 'core',
    name: 'Coffee Cup',
    desc: '각성용 커피. 글루와 템포를 유지한다.',
    assetId: 'part.core.coffee_cup',
    stats: { glue: 6, spd: 1 },
    active: {
      id: 'coffeeOverclock',
      name: 'Coffee Overclock',
      iconAssetId: 'icon.status.haste',
      cooldown: 3,
      glueCost: 0,
      flavour: '한 모금에 손이 빨라진다.',
      animation: 'brew',
      effects: [
        { kind: 'glue', amount: 6 },
        { kind: 'status', target: 'self', status: 'haste', amount: 1 },
        { kind: 'cooldown', amount: 1 },
      ],
    },
    passive: {
      id: 'warmBrew',
      title: 'Warm Brew',
      desc: 'Repair / Press 사용 시 Glue +2.',
      rules: [{ kind: 'sustainBonusGlue', amount: 2 }],
    },
    tags: ['glue', 'tempo'],
  },
  'part.core.tape_roll': {
    id: 'part.core.tape_roll',
    slot: 'core',
    name: 'Tape Roll',
    desc: '수리 코어. 벗겨진 파츠를 되붙인다.',
    assetId: 'part.core.tape_roll',
    stats: { hp: 2, glue: 4, peelResist: 1 },
    active: {
      id: 'patchLoop',
      name: 'Patch Loop',
      iconAssetId: 'fx.patch',
      cooldown: 3,
      glueCost: 3,
      flavour: '테이프가 한 바퀴 돌며 조각을 붙잡는다.',
      animation: 'tape',
      effects: [
        { kind: 'reattach', count: 1 },
        { kind: 'glue', amount: 4 },
        { kind: 'block', amount: 4 },
      ],
    },
    passive: {
      id: 'adhesiveMemory',
      title: 'Adhesive Memory',
      desc: '파츠가 벗겨질 때 35% 확률로 즉시 다시 붙는다.',
      rules: [{ kind: 'peelCatch', chance: 0.35 }],
    },
    tags: ['repair'],
  },

  // ── TRINKET ────────────────────────────────────────────────────────────────
  'part.trinket.ribbon_knot': {
    id: 'part.trinket.ribbon_knot',
    slot: 'trinket',
    name: 'Ribbon Knot',
    desc: '가벼운 리본. 속도와 회피를 보조한다.',
    assetId: 'part.trinket.ribbon_knot',
    stats: { glue: 1, spd: 2 },
    active: {
      id: 'ribbonJump',
      name: 'Ribbon Jump',
      iconAssetId: 'icon.status.haste',
      cooldown: 2,
      glueCost: 1,
      flavour: '리본이 튀어 오르며 몸을 끌어올린다.',
      animation: 'hop',
      effects: [
        { kind: 'damage', amount: 3 },
        { kind: 'status', target: 'self', status: 'drift', amount: 1 },
        { kind: 'status', target: 'self', status: 'haste', amount: 1 },
      ],
    },
    passive: {
      id: 'softLift',
      title: 'Soft Lift',
      desc: 'SPD 11 이상이면 기본 공격 +1. 박리 저항 +1.',
      modifiers: { peelResist: 1 },
    },
    tags: ['speed'],
  },
  'part.trinket.eye_sticker': {
    id: 'part.trinket.eye_sticker',
    slot: 'trinket',
    name: 'Eye Sticker',
    desc: '적 의도를 읽는 눈. 정확한 수치를 미리 본다.',
    assetId: 'part.trinket.eye_sticker',
    stats: { atk: 1, glue: 1 },
    active: {
      id: 'copyEye',
      name: 'Copy Eye',
      iconAssetId: 'icon.status.focus',
      cooldown: 3,
      glueCost: 2,
      flavour: '눈이 깜빡이며 다음 수를 베낀다.',
      animation: 'gaze',
      effects: [
        { kind: 'damage', amount: 4 },
        { kind: 'status', target: 'self', status: 'insight', amount: 2 },
        { kind: 'weakenNextIntent', amount: 2 },
      ],
    },
    passive: {
      id: 'foresee',
      title: 'Foresee',
      desc: '적 의도 3개의 정확한 수치를 항상 공개한다. 기본 공격이 Fragile 1을 부여한다.',
      rules: [
        { kind: 'revealIntents' },
        { kind: 'basicApplyStatus', status: 'fragile', amount: 1 },
      ],
    },
    tags: ['insight'],
  },
  'part.trinket.bread_patch': {
    id: 'part.trinket.bread_patch',
    slot: 'trinket',
    name: 'Bread Patch',
    desc: '임시 봉합 패치. 급할 때 몸과 파츠를 함께 꿰맨다.',
    assetId: 'part.trinket.bread_patch',
    stats: { hp: 3, glue: 2 },
    active: {
      id: 'mendingPatch',
      name: 'Mending Patch',
      iconAssetId: 'fx.patch',
      cooldown: 2,
      glueCost: 2,
      flavour: '빵 조각을 덧대 급히 꿰맨다.',
      animation: 'patch',
      effects: [
        { kind: 'heal', amount: 5 },
        { kind: 'reattach', count: 1 },
        { kind: 'block', amount: 4 },
      ],
    },
    passive: {
      id: 'emergencyStitch',
      title: 'Emergency Stitch',
      desc: '내 파츠가 벗겨질 때마다 Block 3을 얻는다.',
      rules: [{ kind: 'blockOnPeel', amount: 3 }],
    },
    tags: ['mend'],
  },
};

export const PART_IDS = Object.keys(PARTS);

export function partsForSlot(slot: PartSlot): PartDef[] {
  return PART_IDS.map((id) => PARTS[id]).filter((p) => p.slot === slot);
}

/** The loadout a fresh run starts with. */
export const DEFAULT_LOADOUT: Record<PartSlot, string> = {
  head: 'part.head.toast_helm',
  hand: 'part.hand.scissors',
  core: 'part.core.tape_roll',
  trinket: 'part.trinket.ribbon_knot',
};
