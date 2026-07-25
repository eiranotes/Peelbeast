import type { EventDef } from './types';

/**
 * Event choices are pure data (`RunEffect[]`) applied by `rewardResolver`.
 * v0.8 stored `apply(run){...}` closures inside the event table, which made
 * events untestable and impossible to serialise into a save.
 */
export const EVENTS: Record<string, EventDef> = {
  gluePool: {
    id: 'gluePool',
    title: 'Warm Glue Puddle',
    text: '잘못 엎질러진 글루가 아직 따뜻하다. 조금 챙기면 다음 전투 준비가 쉬워진다.',
    artAssetId: 'prop.tape_dispenser',
    options: [
      { id: 'scoop', title: 'Scoop the glue', desc: '다음 전투 시작 Glue +8, Scrap +3', effects: [{ kind: 'glue', amount: 8 }, { kind: 'scrap', amount: 3 }] },
      { id: 'patch', title: 'Patch the seams', desc: 'HP +8, 벗겨진 파츠 전부 정비', effects: [{ kind: 'hp', amount: 8 }, { kind: 'repairAllParts' }] },
      { id: 'salvage', title: 'Salvage the mess', desc: 'Scrap +10', effects: [{ kind: 'scrap', amount: 10 }] },
    ],
  },
  pencilMarks: {
    id: 'pencilMarks',
    title: 'Pencil Mark Shortcut',
    text: '연필 자국이 보드 아래로 이어진다. 위험하지만 보상이 크다.',
    artAssetId: 'prop.pencil_cup',
    options: [
      { id: 'study', title: 'Study the marks', desc: 'Pin Badge 획득', effects: [{ kind: 'relic', relicId: 'pin_badge' }] },
      { id: 'rush', title: 'Rush through', desc: 'Feather Token 획득, HP -4', effects: [{ kind: 'relic', relicId: 'feather_token' }, { kind: 'hp', amount: -4 }] },
      { id: 'rest', title: 'Hide and rest', desc: 'HP +6, Glue +5', effects: [{ kind: 'hp', amount: 6 }, { kind: 'glue', amount: 5 }] },
    ],
  },
  clipDrawer: {
    id: 'clipDrawer',
    title: 'The Clip Drawer',
    text: '서랍이 반쯤 열려 있다. 안쪽에서 금속이 서로 부딪히는 소리가 난다.',
    artAssetId: 'prop.clip_pile',
    options: [
      { id: 'reach', title: 'Reach in blind', desc: '무작위 리릭 1개, 무작위 파츠 1개 손상', effects: [{ kind: 'randomRelic' }, { kind: 'damagePart', slot: 'random' }] },
      { id: 'tip', title: 'Tip the drawer out', desc: 'Scrap +14', effects: [{ kind: 'scrap', amount: 14 }] },
      { id: 'brace', title: 'Wedge it shut', desc: 'Double-Sided Tape 획득', effects: [{ kind: 'relic', relicId: 'double_sided' }] },
      { id: 'haggle', title: 'Trade a handful of scrap', desc: 'Scrap -8, 다음 상점 8 할인 + Glue +6', requires: { minScrap: 8 }, effects: [{ kind: 'scrap', amount: -8 }, { kind: 'shopDiscount', amount: 8 }, { kind: 'glue', amount: 6 }] },
    ],
  },
  inkSpill: {
    id: 'inkSpill',
    title: 'Ink Spill',
    text: '잉크가 종이 결을 타고 번진다. 지금 막지 않으면 다음 전투까지 따라온다.',
    artAssetId: 'prop.torn_note',
    options: [
      { id: 'blot', title: 'Blot it out', desc: 'Blotter Pad 획득', effects: [{ kind: 'relic', relicId: 'blotter_pad' }] },
      { id: 'ignore', title: 'Step around it', desc: 'Scrap +8, 다음 전투를 Frazzle 1로 시작', effects: [{ kind: 'scrap', amount: 8 }, { kind: 'startStatus', status: 'frazzle', amount: 1 }] },
      { id: 'soak', title: 'Soak it with a spare patch', desc: 'HP +4, 다음 전투 Block 6으로 시작', effects: [{ kind: 'hp', amount: 4 }, { kind: 'startBlock', amount: 6 }] },
    ],
  },
  nestNoise: {
    id: 'nestNoise',
    title: 'Something in the Nest',
    text: '보드 뒤쪽에서 테이프가 팽팽해지는 소리가 난다. 지금 덤비면 준비된 쪽은 이쪽이다.',
    artAssetId: 'prop.torn_note',
    options: [
      { id: 'ambush', title: 'Strike first', desc: '즉시 엘리트 전투. 승리 시 보상이 크다', effects: [{ kind: 'forceEncounter', encounterId: 'eliteSpider' }] },
      { id: 'slip', title: 'Slip past quietly', desc: 'Glue +6, Scrap +4', effects: [{ kind: 'glue', amount: 6 }, { kind: 'scrap', amount: 4 }] },
      { id: 'fortify', title: 'Tape yourself down', desc: '벗겨진 파츠 전부 정비, 다음 전투 Block 5', effects: [{ kind: 'repairAllParts' }, { kind: 'startBlock', amount: 5 }] },
    ],
  },
  breadCrumbs: {
    id: 'breadCrumbs',
    title: 'Crumb Trail',
    text: '누군가 아침을 먹고 흘린 부스러기가 줄지어 있다. 따뜻하다.',
    artAssetId: 'prop.pencil_cup',
    options: [
      { id: 'eat', title: 'Eat the trail', desc: 'HP +10', effects: [{ kind: 'hp', amount: 10 }] },
      { id: 'follow', title: 'Follow it', desc: 'Bone Folder 획득', effects: [{ kind: 'relic', relicId: 'bone_folder' }] },
      { id: 'pocket', title: 'Pocket the crumbs', desc: 'Scrap +6, Glue +4', effects: [{ kind: 'scrap', amount: 6 }, { kind: 'glue', amount: 4 }] },
    ],
  },
};

export const EVENT_IDS = Object.keys(EVENTS);
