/**
 * Rule lookup helpers.
 *
 * Passives, synergies and relics all express themselves as small typed rule
 * objects. The resolvers ask questions like "how much extra block does Guard
 * grant?" instead of testing `state.build.head === 'box'` — which is exactly the
 * coupling that made the v0.8 engine impossible to extend.
 */

import { RELICS } from '../data/relics';
import type { PassiveRule, RelicRule, StatusId } from '../data/types';

export function sumPassive(rules: readonly PassiveRule[], kind: 'guardBonus' | 'sustainBonusGlue' | 'inkResist' | 'blockOnPeel' | 'basicPierce' | 'firstHitSoften'): number {
  let total = 0;
  for (const r of rules) if (r.kind === kind) total += r.amount;
  return total;
}

export function hasPassive(rules: readonly PassiveRule[], kind: 'repairReattach' | 'revealIntents'): boolean {
  return rules.some((r) => r.kind === kind);
}

/** Best (highest) peel-catch chance among all active rules. They do not stack. */
export function peelCatchChance(rules: readonly PassiveRule[]): number {
  let best = 0;
  for (const r of rules) if (r.kind === 'peelCatch') best = Math.max(best, r.chance);
  return best;
}

export function basicBonusVsStatus(rules: readonly PassiveRule[], statuses: Record<StatusId, number>): number {
  let total = 0;
  for (const r of rules) {
    if (r.kind === 'basicBonusVsStatus' && (statuses[r.status] ?? 0) > 0) total += r.amount;
  }
  return total;
}

export function basicAppliedStatuses(rules: readonly PassiveRule[]): Array<{ status: StatusId; amount: number }> {
  return rules.filter((r): r is Extract<PassiveRule, { kind: 'basicApplyStatus' }> => r.kind === 'basicApplyStatus').map((r) => ({ status: r.status, amount: r.amount }));
}

export function guardCleanses(rules: readonly PassiveRule[]): Array<{ status: StatusId; amount: number }> {
  return rules.filter((r): r is Extract<PassiveRule, { kind: 'guardCleanse' }> => r.kind === 'guardCleanse').map((r) => ({ status: r.status, amount: r.amount }));
}

export function turnStartStatuses(rules: readonly PassiveRule[]): Array<{ status: StatusId; amount: number }> {
  return rules
    .filter((r): r is Extract<PassiveRule, { kind: 'turnStartStatusIfEmpty' }> => r.kind === 'turnStartStatusIfEmpty')
    .map((r) => ({ status: r.status, amount: r.amount }));
}

// ─── relics ──────────────────────────────────────────────────────────────────

export function relicRules(relicIds: readonly string[]): RelicRule[] {
  const out: RelicRule[] = [];
  for (const id of relicIds) {
    const relic = RELICS[id];
    if (relic?.rules) out.push(...relic.rules);
  }
  return out;
}

export function sumRelic(rules: readonly RelicRule[], kind: 'pressCooldownBonus' | 'inkDrain' | 'startBlock' | 'startGlue' | 'firstSkillBonusDamage'): number {
  let total = 0;
  for (const r of rules) if (r.kind === kind) total += r.amount;
  return total;
}

export function relicRepairBonus(rules: readonly RelicRule[]): { hp: number; glue: number } {
  let hp = 0;
  let glue = 0;
  for (const r of rules) {
    if (r.kind === 'repairBonus') {
      hp += r.hp;
      glue += r.glue;
    }
  }
  return { hp, glue };
}

export function hasRelicRule(rules: readonly RelicRule[], kind: 'autoReattachOnce'): boolean {
  return rules.some((r) => r.kind === kind);
}

export function relicBasicStatuses(rules: readonly RelicRule[]): Array<{ status: StatusId; amount: number }> {
  return rules
    .filter((r): r is Extract<RelicRule, { kind: 'basicApplyStatus' }> => r.kind === 'basicApplyStatus')
    .map((r) => ({ status: r.status, amount: r.amount }));
}
