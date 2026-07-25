/**
 * Executes an `Effect[]`.
 *
 * Both player skills and enemy intents are `Effect[]`, so both run through here.
 * `self` / `opponent` are resolved relative to `source`, which is why one
 * resolver can serve both sides without duplicated arithmetic.
 */

import { BALANCE } from '../data/balance';
import type { Effect, EffectCondition, PassiveRule, StatusId } from '../data/types';
import type { BattleSide, BattleState } from '../state/battleState';
import { applyDamage, changeGlue, changeInk, gainBlock, heal, shredBlock } from './damageResolver';
import { applyStatus, clearStatus, getStatus } from './statusResolver';
import { attemptPeel, peeledSlots, reattachMany } from './peelResolver';
import { addLog } from './log';
import { ALL_SLOTS } from '../state/battleState';

export interface EffectContext {
  source: BattleSide;
  label: string;
  /** Player passive rules, needed for ink resist and first-hit softening. */
  rules?: readonly PassiveRule[];
  /** Flat damage added to every damage effect in this batch (fury, relics). */
  bonusDamage?: number;
  /** Flat damage removed (Copy Eye weakening). */
  weaken?: number;
  /** Ink-flavoured, for resistances and reflection. */
  isInk?: boolean;
  /** Partial block pierce from passives. */
  pierce?: number;
}

function evaluateCondition(state: BattleState, source: BattleSide, cond: EffectCondition): boolean {
  const opponent: BattleSide = source === 'player' ? 'enemy' : 'player';
  switch (cond.kind) {
    case 'opponentHasStatus':
      return getStatus(state, opponent, cond.status) >= (cond.atLeast ?? 1);
    case 'selfHasStatus':
      return getStatus(state, source, cond.status) >= (cond.atLeast ?? 1);
    case 'selfSpeedAtLeast':
      return source === 'player' && state.player.spd >= cond.value;
    case 'anyPartPeeled':
      return peeledSlots(state).length > 0;
    case 'noPartPeeled':
      return peeledSlots(state).length === 0;
  }
}

export function applyEffects(state: BattleState, effects: readonly Effect[], ctx: EffectContext): void {
  const opponent: BattleSide = ctx.source === 'player' ? 'enemy' : 'player';
  const resolveTarget = (t: 'self' | 'opponent'): BattleSide => (t === 'self' ? ctx.source : opponent);

  for (const effect of effects) {
    switch (effect.kind) {
      case 'damage': {
        let base = effect.amount;
        if (effect.bonus && evaluateCondition(state, ctx.source, effect.bonus.when)) {
          base += effect.bonus.amount;
        }
        // Fury and weakening adjust the intent as a whole, not each hit — a
        // 2-hit move at Fury 3 used to gain +6 and outscale everything.
        const first = Math.max(0, base + (ctx.bonusDamage ?? 0) - (ctx.weaken ?? 0));
        const hits = effect.hits ?? 1;
        for (let i = 0; i < hits; i++) {
          const amount = i === 0 ? first : Math.max(0, base);
          if (state.outcome !== 'ongoing') break;
          applyDamage(state, {
            amount,
            target: opponent,
            ignoreBlock: effect.ignoreBlock,
            pierce: ctx.pierce,
            isInk: ctx.isInk,
            label: ctx.label,
            rules: ctx.rules,
          });
          if (opponent === 'player' && state.player.hp <= 0) break;
          if (opponent === 'enemy' && state.enemy.hp <= 0) break;
        }
        break;
      }
      case 'block':
        gainBlock(state, ctx.source, effect.amount, ctx.label);
        break;
      case 'enemyBlock':
        // block for whoever is acting; named for how it reads on an intent card
        gainBlock(state, ctx.source, effect.amount, ctx.label);
        break;
      case 'shredBlock':
        shredBlock(state, opponent, effect.amount, ctx.label);
        break;
      case 'heal':
        heal(state, effect.amount, ctx.label);
        break;
      case 'glue':
        changeGlue(state, effect.amount, ctx.label);
        break;
      case 'drainGlue':
        changeGlue(state, -effect.amount, ctx.label);
        break;
      case 'status':
        applyStatus(state, resolveTarget(effect.target), effect.status, effect.amount);
        break;
      case 'cleanse':
        clearStatus(state, resolveTarget(effect.target), effect.status);
        break;
      case 'ink':
        changeInk(state, effect.amount, ctx.label);
        break;
      case 'reattach':
        reattachMany(state, effect.count, ctx.label);
        break;
      case 'peel':
        attemptPeel(state, effect.slots, effect.blockThreshold, ctx.label);
        break;
      case 'cooldown':
        reduceCooldowns(state, effect.amount);
        addLog(state, ctx.label, `쿨다운 ${effect.amount} 감소.`, 'player');
        break;
      case 'reflectInk':
        state.player.reflectInk += effect.amount;
        break;
      case 'counter':
        state.player.counter += effect.amount;
        addLog(state, ctx.label, `반격 ${effect.amount} 준비.`, 'player');
        break;
      case 'weakenNextIntent': {
        const next = state.enemy.intents[0];
        if (next) {
          next.weakened += effect.amount;
          addLog(state, ctx.label, `다음 적 의도의 위력을 ${effect.amount} 깎았다.`, 'player');
        }
        break;
      }
      case 'fury':
        state.enemy.fury = Math.min(BALANCE.enemy.maxFury, state.enemy.fury + effect.amount);
        addLog(state, ctx.label, `${state.enemy.name}의 Fury +${effect.amount}.`, 'enemy');
        break;
    }
  }
}

export function reduceCooldowns(state: BattleState, amount: number): void {
  if (amount <= 0) return;
  for (const slot of ALL_SLOTS) {
    const runtime = state.player.slots[slot];
    runtime.cooldown = Math.max(0, runtime.cooldown - amount);
  }
}

/** Statuses a batch of effects would apply, for intent previews. */
export function previewStatuses(effects: readonly Effect[]): Array<{ status: StatusId; amount: number; target: 'self' | 'opponent' }> {
  return effects
    .filter((e): e is Extract<Effect, { kind: 'status' }> => e.kind === 'status')
    .map((e) => ({ status: e.status, amount: e.amount, target: e.target }));
}
