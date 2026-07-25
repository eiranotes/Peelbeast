import type { SynergyDef } from './types';

/**
 * Combination bonuses. A synergy is active only while EVERY required part is
 * both equipped and un-peeled — losing one piece of a pair breaks the bonus,
 * which is the whole point of the peel mechanic.
 *
 * Adding a synergy is a data edit; no resolver changes.
 */
export const SYNERGIES: Record<string, SynergyDef> = {
  warm_breakfast: {
    id: 'warm_breakfast',
    name: 'Warm Breakfast',
    desc: '토스트와 커피가 함께 있으면 모든 스킬이 쿨다운 1 낮은 상태로 전투를 시작한다.',
    requires: ['part.head.toast_helm', 'part.core.coffee_cup'],
    modifiers: { cooldownStart: 1, glue: 2 },
  },
  precision_draft: {
    id: 'precision_draft',
    name: 'Precision Draft',
    desc: '연필 창과 눈 스티커. Pinned 상대에게 기본 공격 +3 피해.',
    requires: ['part.hand.pencil_spear', 'part.trinket.eye_sticker'],
    rules: [{ kind: 'basicBonusVsStatus', status: 'pinned', amount: 3 }],
  },
  weatherproof: {
    id: 'weatherproof',
    name: 'Weatherproof',
    desc: '우산과 테이프. 잉크 피해 -2, 박리 저항 +2.',
    requires: ['part.hand.umbrella_hook', 'part.core.tape_roll'],
    modifiers: { peelResist: 2 },
    rules: [{ kind: 'inkResist', amount: 2 }],
  },
  reinforced_package: {
    id: 'reinforced_package',
    name: 'Reinforced Package',
    desc: '박스 껍질과 빵 패치. Guard 시 벗겨진 파츠 하나를 자동으로 되붙인다.',
    requires: ['part.head.box_shell', 'part.trinket.bread_patch'],
    rules: [{ kind: 'repairReattach' }],
    modifiers: { hp: 3 },
  },
  cutting_crew: {
    id: 'cutting_crew',
    name: 'Cutting Crew',
    desc: '가위와 폭탄. 공격력 +2, 기본 공격이 Fragile 1을 부여한다.',
    requires: ['part.hand.scissors', 'part.core.bomb_belly'],
    modifiers: { atk: 2 },
    rules: [{ kind: 'basicApplyStatus', status: 'fragile', amount: 1 }],
  },
  ghost_ribbon: {
    id: 'ghost_ribbon',
    name: 'Ghost Ribbon',
    desc: '유령 후드와 리본. 속도 +3, 첫 피격 완화가 2 더 커진다.',
    requires: ['part.head.ghost_hood', 'part.trinket.ribbon_knot'],
    modifiers: { spd: 3 },
    rules: [{ kind: 'firstHitSoften', amount: 2 }],
  },
};

export const SYNERGY_IDS = Object.keys(SYNERGIES);
