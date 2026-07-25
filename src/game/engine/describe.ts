/**
 * Player-facing text DERIVED from effect data.
 *
 * This module exists to make one class of bug impossible: an ability card that
 * says "4 damage" while the resolver deals 6. Both read the same `Effect[]`.
 *
 * `describeIntent` additionally reports the structured fields the battle UI needs
 * for the intent rail: predicted damage, statuses, glue loss, peel target,
 * pierce, blockability and a danger rating.
 */

import { INTENTS } from '../data/intents';
import { STATUSES } from '../data/statuses';
import { slotName } from './peelResolver';
import type { Effect, IntentDef, PartSlot, StatusId } from '../data/types';
import type { BattleState, IntentInstance } from '../state/battleState';

export type Danger = 'low' | 'medium' | 'high' | 'extreme';

export interface IntentPreview {
  key: string;
  intent: IntentDef;
  /** Total damage across all hits, after fury / weakening. Null when it deals none. */
  damage: number | null;
  hits: number;
  statuses: Array<{ status: StatusId; amount: number; name: string; iconAssetId: string }>;
  glueLoss: number;
  inkGain: number;
  enemyBlockGain: number;
  peelTargets: PartSlot[] | 'any' | null;
  peelBlockThreshold: number;
  blockable: boolean;
  piercing: boolean;
  danger: Danger;
  /** Whether the player currently sees exact numbers (Eye Sticker / Insight). */
  exact: boolean;
}

function damageOf(effects: readonly Effect[]): { amount: number; hits: number } {
  let amount = 0;
  let hits = 0;
  for (const e of effects) {
    if (e.kind === 'damage') {
      const h = e.hits ?? 1;
      amount += e.amount * h;
      hits += h;
    }
  }
  return { amount, hits };
}

function dangerFor(damage: number, peels: boolean, maxHp: number): Danger {
  const ratio = maxHp > 0 ? damage / maxHp : 0;
  if (ratio >= 0.32 || (peels && ratio >= 0.2)) return 'extreme';
  if (ratio >= 0.2 || peels) return 'high';
  if (ratio >= 0.09) return 'medium';
  return 'low';
}

/**
 * Build the preview shown on an intent card.
 * `state` supplies fury, weakening and the player's max hp for the danger scale.
 */
export function describeIntent(state: BattleState, instance: IntentInstance, revealed: boolean): IntentPreview {
  const intent = INTENTS[instance.intentId];
  const base = damageOf(intent.effects);
  const perHitBonus = state.enemy.fury + instance.bonusDamage - instance.weakened;
  const damage = base.hits > 0 ? Math.max(0, base.amount + perHitBonus * base.hits) : null;

  const statuses = intent.effects
    .filter((e): e is Extract<Effect, { kind: 'status' }> => e.kind === 'status')
    .map((e) => ({
      status: e.status,
      amount: e.amount,
      name: STATUSES[e.status].name,
      iconAssetId: STATUSES[e.status].iconAssetId,
    }));

  const glueLoss = intent.effects.reduce((n, e) => (e.kind === 'drainGlue' ? n + e.amount : n), 0);
  const inkGain = intent.effects.reduce((n, e) => (e.kind === 'ink' ? n + e.amount : n), 0);
  const enemyBlockGain = intent.effects.reduce((n, e) => (e.kind === 'enemyBlock' ? n + e.amount : n), 0);
  const peelEffect = intent.effects.find((e): e is Extract<Effect, { kind: 'peel' }> => e.kind === 'peel');

  return {
    key: instance.key,
    intent,
    damage,
    hits: base.hits,
    statuses,
    glueLoss,
    inkGain,
    enemyBlockGain,
    peelTargets: peelEffect ? peelEffect.slots : null,
    peelBlockThreshold: peelEffect?.blockThreshold ?? 0,
    blockable: intent.blockable,
    piercing: intent.piercing,
    danger: dangerFor(damage ?? 0, !!peelEffect, state.player.maxHp),
    exact: revealed,
  };
}

/** One-line summary of what a peel effect can take. */
export function peelTargetLabel(targets: PartSlot[] | 'any' | null): string | null {
  if (!targets) return null;
  if (targets === 'any') return '아무 파츠나';
  return targets.map(slotName).join(' / ');
}

/** Mechanical text for a skill or intent, generated from its effects. */
export function describeEffects(effects: readonly Effect[]): string[] {
  const out: string[] = [];
  for (const e of effects) {
    switch (e.kind) {
      case 'damage': {
        const hits = e.hits ?? 1;
        let s = hits > 1 ? `${e.amount} 피해 x${hits}` : `${e.amount} 피해`;
        if (e.ignoreBlock) s += ' (관통)';
        if (e.bonus) {
          const w = e.bonus.when;
          const cond =
            w.kind === 'opponentHasStatus'
              ? `상대가 ${STATUSES[w.status].name}이면`
              : w.kind === 'selfHasStatus'
                ? `내가 ${STATUSES[w.status].name}이면`
                : w.kind === 'selfSpeedAtLeast'
                  ? `SPD ${w.value} 이상이면`
                  : w.kind === 'anyPartPeeled'
                    ? '벗겨진 파츠가 있으면'
                    : '벗겨진 파츠가 없으면';
          s += `, ${cond} +${e.bonus.amount}`;
        }
        out.push(s);
        break;
      }
      case 'block':
        out.push(`Block ${e.amount}`);
        break;
      case 'enemyBlock':
        out.push(`적 Block +${e.amount}`);
        break;
      case 'shredBlock':
        out.push(`내 Block ${e.amount} 절단`);
        break;
      case 'heal':
        out.push(`HP +${e.amount}`);
        break;
      case 'glue':
        out.push(`Glue ${e.amount >= 0 ? '+' : ''}${e.amount}`);
        break;
      case 'drainGlue':
        out.push(`Glue -${e.amount}`);
        break;
      case 'status':
        out.push(`${e.target === 'self' ? '나' : '상대'} ${STATUSES[e.status].name} ${e.amount >= 0 ? '+' : ''}${e.amount}`);
        break;
      case 'cleanse':
        out.push(`${STATUSES[e.status].name} 해제`);
        break;
      case 'ink':
        out.push(`Ink Tide ${e.amount >= 0 ? '+' : ''}${e.amount}`);
        break;
      case 'reattach':
        out.push(`벗겨진 파츠 ${e.count}개 복구`);
        break;
      case 'peel':
        out.push(`${peelTargetLabel(e.slots)} 박리 시도 (Block ${e.blockThreshold} 이상이면 막힘)`);
        break;
      case 'cooldown':
        out.push(`쿨다운 -${e.amount}`);
        break;
      case 'reflectInk':
        out.push('잉크 반사 준비');
        break;
      case 'counter':
        out.push(`반격 ${e.amount}`);
        break;
      case 'weakenNextIntent':
        out.push(`다음 적 의도 -${e.amount}`);
        break;
      case 'fury':
        out.push(`적 Fury +${e.amount}`);
        break;
    }
  }
  return out;
}
