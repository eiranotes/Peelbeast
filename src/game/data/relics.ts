import type { RelicDef } from './types';

/** Run modifiers ("stage mods" in v0.8). Accumulate across a run, never reset mid-run. */
export const RELICS: Record<string, RelicDef> = {
  pin_badge: {
    id: 'pin_badge',
    name: 'Pin Badge',
    desc: 'ATK +1. 기본 공격이 Pinned 1을 부여한다.',
    type: 'offense',
    modifiers: { atk: 1 },
    rules: [{ kind: 'basicApplyStatus', status: 'pinned', amount: 1 }],
  },
  warm_saucer: {
    id: 'warm_saucer',
    name: 'Warm Saucer',
    desc: 'Repair 사용 시 HP +2, Glue +2 추가.',
    type: 'sustain',
    rules: [{ kind: 'repairBonus', hp: 2, glue: 2 }],
  },
  spring_clip: {
    id: 'spring_clip',
    name: 'Spring Clip',
    desc: 'Press의 쿨다운 감소가 1 커진다.',
    type: 'tempo',
    rules: [{ kind: 'pressCooldownBonus', amount: 1 }],
  },
  backup_patch: {
    id: 'backup_patch',
    name: 'Backup Patch',
    desc: '전투당 1회, 첫 파츠 박리 직후 즉시 되붙인다.',
    type: 'repair',
    rules: [{ kind: 'autoReattachOnce' }],
  },
  blotter_pad: {
    id: 'blotter_pad',
    name: 'Blotter Pad',
    desc: '적 턴 종료 시 Ink Tide가 1 내려간다.',
    type: 'control',
    rules: [{ kind: 'inkDrain', amount: 1 }],
  },
  feather_token: {
    id: 'feather_token',
    name: 'Feather Token',
    desc: 'SPD +2. 전투 첫 스킬 피해 +2.',
    type: 'speed',
    modifiers: { spd: 2 },
    rules: [{ kind: 'firstSkillBonusDamage', amount: 2 }],
  },
  thick_glue: {
    id: 'thick_glue',
    name: 'Thick Glue Tube',
    desc: '최대 Glue +4. 전투 시작 시 Glue +2.',
    type: 'resource',
    modifiers: { glue: 4 },
    rules: [{ kind: 'startGlue', amount: 2 }],
  },
  brass_clip: {
    id: 'brass_clip',
    name: 'Brass Clip',
    desc: '전투 시작 시 Block 5.',
    type: 'defense',
    rules: [{ kind: 'startBlock', amount: 5 }],
  },
  double_sided: {
    id: 'double_sided',
    name: 'Double-Sided Tape',
    desc: '박리 저항 +2.',
    type: 'repair',
    modifiers: { peelResist: 2 },
  },
  bone_folder: {
    id: 'bone_folder',
    name: 'Bone Folder',
    desc: '최대 HP +6.',
    type: 'defense',
    modifiers: { hp: 6 },
  },
};

export const RELIC_IDS = Object.keys(RELICS);
