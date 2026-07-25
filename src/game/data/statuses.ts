import type { StatusDef, StatusId } from './types';

/**
 * The v0.8 vocabulary, kept intact. Two statuses that existed there but had no
 * rules attached (`vulnerable` had only a decrement, `insight` had only an
 * increment) are given real behaviour here rather than being deleted.
 */
export const STATUSES: Record<StatusId, StatusDef> = {
  focus: {
    id: 'focus',
    name: 'Focus',
    side: 'player',
    tone: 'good',
    iconAssetId: 'icon.status.focus',
    decay: 'onConsume',
    max: 3,
    desc: '기본 공격이 +2 피해. 공격할 때 1 소모된다.',
  },
  drift: {
    id: 'drift',
    name: 'Drift',
    side: 'player',
    tone: 'good',
    iconAssetId: 'icon.status.drift',
    decay: 'endOfRound',
    max: 4,
    desc: '받는 피해 -1. 떠 있는 동안 장신구가 박리 대상에서 밀려난다.',
  },
  bind: {
    id: 'bind',
    name: 'Bind',
    side: 'player',
    tone: 'bad',
    iconAssetId: 'icon.status.bind',
    decay: 'endOfRound',
    max: 4,
    desc: '테이프에 묶였다. 스킬 쿨다운이 내려가지 않는다.',
  },
  haste: {
    id: 'haste',
    name: 'Haste',
    side: 'player',
    tone: 'good',
    iconAssetId: 'icon.status.haste',
    decay: 'endOfRound',
    max: 3,
    desc: '턴 종료 시 쿨다운이 1 더 내려간다.',
  },
  pinned: {
    id: 'pinned',
    name: 'Pinned',
    side: 'enemy',
    tone: 'bad',
    iconAssetId: 'icon.status.pinned',
    decay: 'endOfRound',
    max: 5,
    desc: '고정되었다. 절단·강타 계열이 추가 피해를 준다.',
  },
  fragile: {
    id: 'fragile',
    name: 'Fragile',
    side: 'both',
    tone: 'bad',
    iconAssetId: 'icon.status.fragile',
    decay: 'endOfRound',
    max: 4,
    desc: '받는 모든 피해 +1.',
  },
  frazzle: {
    id: 'frazzle',
    name: 'Frazzle',
    side: 'player',
    tone: 'bad',
    iconAssetId: 'icon.status.frazzle',
    decay: 'endOfRound',
    max: 3,
    desc: '기본 공격 피해 -2.',
  },
  insight: {
    id: 'insight',
    name: 'Insight',
    side: 'player',
    tone: 'good',
    iconAssetId: 'icon.status.focus',
    decay: 'onConsume',
    max: 4,
    desc: '적 의도의 정확한 수치가 공개된다. 의도가 실행될 때 1 소모된다.',
  },
  vulnerable: {
    id: 'vulnerable',
    name: 'Vulnerable',
    side: 'both',
    tone: 'bad',
    iconAssetId: 'icon.status.fragile',
    decay: 'endOfRound',
    max: 3,
    desc: '받는 피해가 1.5배가 된다.',
  },
};

export const STATUS_IDS = Object.keys(STATUSES) as StatusId[];

export function emptyStatuses(): Record<StatusId, number> {
  return {
    focus: 0,
    drift: 0,
    bind: 0,
    haste: 0,
    pinned: 0,
    fragile: 0,
    frazzle: 0,
    insight: 0,
    vulnerable: 0,
  };
}
