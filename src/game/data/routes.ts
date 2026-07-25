import type { RouteDef } from './types';

/**
 * Two routes that differ in more than node order:
 *   Snip Lane   — lower risk, more recovery, shop before the boss, less scrap.
 *   Stitch Loop — elite early, ink-heavy enemies, best scrap, shop comes late.
 *
 * The profile block is shown on the route picker so the choice reads as a real
 * decision instead of a flavour label.
 */
export const ROUTES: Record<string, RouteDef> = {
  snip: {
    id: 'snip',
    name: 'Snip Lane',
    desc: '안정적인 진행. 이벤트로 정비하고 상점을 거쳐 보스로 간다.',
    profile: {
      risk: 'low',
      scrap: 'medium',
      recovery: 'generous',
      notes: '박리 압박이 낮아 파츠 의존 빌드에 유리하다. Ink는 보스에서만 본격적으로 쌓인다.',
    },
    nodes: [
      { type: 'combat', encounterId: 'rat', label: 'Combat' },
      { type: 'event', eventId: 'gluePool', label: 'Event' },
      { type: 'combat', encounterId: 'moth', label: 'Combat' },
      { type: 'shop', shopId: 'bench', label: 'Shop' },
      { type: 'combat', encounterId: 'spider', label: 'Combat' },
      { type: 'event', eventId: 'breadCrumbs', label: 'Event' },
      { type: 'boss', encounterId: 'boss', label: 'Boss' },
    ],
  },
  stitch: {
    id: 'stitch',
    name: 'Stitch Loop',
    desc: '거미 선행전 후 엘리트 압박. 회복 기회는 적지만 스크랩이 많다.',
    profile: {
      risk: 'high',
      scrap: 'high',
      recovery: 'scarce',
      notes: 'Ink와 박리가 일찍부터 몰아친다. Tape Roll·Umbrella·Bread Patch 계열이 크게 유리하다.',
    },
    nodes: [
      { type: 'combat', encounterId: 'spider', label: 'Combat' },
      { type: 'event', eventId: 'inkSpill', label: 'Event' },
      { type: 'elite', encounterId: 'eliteCrow', label: 'Elite' },
      { type: 'event', eventId: 'clipDrawer', label: 'Event' },
      { type: 'shop', shopId: 'bench', label: 'Shop' },
      { type: 'event', eventId: 'nestNoise', label: 'Event' },
      { type: 'boss', encounterId: 'boss', label: 'Boss' },
    ],
  },
};

export const ROUTE_IDS = Object.keys(ROUTES);
export const DEFAULT_ROUTE_ID = 'snip';
