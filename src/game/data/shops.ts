import type { ShopDef } from './types';

/**
 * Shops offer relics, services AND parts. Buying a part swaps it into the
 * assembly immediately, which is what makes the shop matter to the build rather
 * than just to the numbers.
 */
export const SHOPS: Record<string, ShopDef> = {
  bench: {
    id: 'bench',
    name: 'Supply Bench',
    desc: '스크랩으로 파츠, 리릭, 수리, 임시 보강을 산다.',
    artAssetId: 'prop.tape_dispenser',
    offerCount: 5,
    pool: [
      { id: 'relic_warm_saucer', kind: 'relic', ref: 'warm_saucer', cost: 13 },
      { id: 'relic_spring_clip', kind: 'relic', ref: 'spring_clip', cost: 13 },
      { id: 'relic_backup_patch', kind: 'relic', ref: 'backup_patch', cost: 15 },
      { id: 'relic_blotter_pad', kind: 'relic', ref: 'blotter_pad', cost: 12 },
      { id: 'relic_thick_glue', kind: 'relic', ref: 'thick_glue', cost: 11 },
      { id: 'relic_brass_clip', kind: 'relic', ref: 'brass_clip', cost: 12 },
      { id: 'relic_double_sided', kind: 'relic', ref: 'double_sided', cost: 14 },
      { id: 'relic_bone_folder', kind: 'relic', ref: 'bone_folder', cost: 12 },

      { id: 'part_umbrella', kind: 'part', ref: 'part.hand.umbrella_hook', cost: 16 },
      { id: 'part_spear', kind: 'part', ref: 'part.hand.pencil_spear', cost: 16 },
      { id: 'part_scissors', kind: 'part', ref: 'part.hand.scissors', cost: 16 },
      { id: 'part_coffee', kind: 'part', ref: 'part.core.coffee_cup', cost: 16 },
      { id: 'part_bomb', kind: 'part', ref: 'part.core.bomb_belly', cost: 16 },
      { id: 'part_tape', kind: 'part', ref: 'part.core.tape_roll', cost: 16 },
      { id: 'part_box', kind: 'part', ref: 'part.head.box_shell', cost: 16 },
      { id: 'part_ghost', kind: 'part', ref: 'part.head.ghost_hood', cost: 16 },
      { id: 'part_toast', kind: 'part', ref: 'part.head.toast_helm', cost: 16 },
      { id: 'part_eye', kind: 'part', ref: 'part.trinket.eye_sticker', cost: 14 },
      { id: 'part_patch', kind: 'part', ref: 'part.trinket.bread_patch', cost: 14 },
      { id: 'part_ribbon', kind: 'part', ref: 'part.trinket.ribbon_knot', cost: 14 },

      {
        id: 'svc_repair',
        kind: 'service',
        ref: 'repair',
        cost: 7,
        name: 'Repair Service',
        desc: 'HP +10, Glue +10, 벗겨진 파츠 전부 정비',
        effects: [{ kind: 'hp', amount: 10 }, { kind: 'glue', amount: 10 }, { kind: 'repairAllParts' }],
      },
      {
        id: 'svc_bundle',
        kind: 'service',
        ref: 'bundle',
        cost: 6,
        name: 'Supply Bundle',
        desc: '다음 전투 시작 Block 6, Glue +5',
        effects: [{ kind: 'startBlock', amount: 6 }, { kind: 'glue', amount: 5 }],
      },
      {
        id: 'svc_focus',
        kind: 'service',
        ref: 'focus',
        cost: 5,
        name: 'Sharpening Kit',
        desc: '다음 전투를 Focus 2로 시작',
        effects: [{ kind: 'startStatus', status: 'focus', amount: 2 }],
      },
    ],
  },
};

export const SHOP_IDS = Object.keys(SHOPS);
