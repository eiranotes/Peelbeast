/**
 * The damage pipeline. Every point of damage in the game goes through
 * `applyDamage`, so the order of operations is stated once and testable.
 *
 * Order (attacker-side modifiers are applied by the caller before this):
 *   1. Fragile on the defender      → +1 per stack source
 *   2. Vulnerable on the defender   → x1.5
 *   3. Drift on the defender        → -1
 *   4. Ink resistance (ink packets) → -n
 *   5. First-hit softening          → -n, once per battle
 *   6. Block absorption             → unless the packet pierces
 */

import { BALANCE } from '../data/balance';
import type { BattleSide, BattleState } from '../state/battleState';
import { getStatus } from './statusResolver';
import { sumPassive } from './rules';
import type { PassiveRule } from '../data/types';
import { addLog } from './log';

export interface DamagePacket {
  amount: number;
  /** Who is being hit. */
  target: BattleSide;
  /** Bypasses Block entirely. */
  ignoreBlock?: boolean;
  /** Reduces Block by this much before absorbing (partial pierce). */
  pierce?: number;
  /** Ink-flavoured damage participates in ink resistance and reflection. */
  isInk?: boolean;
  /** Log label. */
  label: string;
  /** Player-side passive rules, needed for ink resist and first-hit softening. */
  rules?: readonly PassiveRule[];
}

export interface DamageResult {
  dealt: number;
  blocked: number;
  pierced: boolean;
  lethal: boolean;
}

export function applyDamage(state: BattleState, packet: DamagePacket): DamageResult {
  const D = BALANCE.damage;
  const defenderIsPlayer = packet.target === 'player';
  let amount = Math.max(0, packet.amount);

  if (amount > 0) {
    if (getStatus(state, packet.target, 'fragile') > 0) amount += D.fragileBonus;
    if (getStatus(state, packet.target, 'vulnerable') > 0) amount = Math.round(amount * D.vulnerableMultiplier);
    if (getStatus(state, packet.target, 'drift') > 0) amount = Math.max(0, amount - D.driftReduction);

    if (defenderIsPlayer && packet.isInk && packet.rules) {
      amount = Math.max(0, amount - sumPassive(packet.rules, 'inkResist'));
    }
    if (defenderIsPlayer && !state.player.tookHit && packet.rules) {
      const soften = sumPassive(packet.rules, 'firstHitSoften');
      if (soften > 0) amount = Math.max(0, amount - soften);
    }
  }

  amount = Math.round(amount);

  const actor = defenderIsPlayer ? state.player : state.enemy;
  let blocked = 0;

  if (!packet.ignoreBlock) {
    let effectiveBlock = actor.block;
    if (packet.pierce) effectiveBlock = Math.max(0, effectiveBlock - packet.pierce);
    const absorbed = Math.min(amount, effectiveBlock);
    if (absorbed > 0) {
      actor.block -= absorbed;
      amount -= absorbed;
      blocked = absorbed;
    }
  }

  if (defenderIsPlayer) {
    state.player.hp = Math.max(0, state.player.hp - amount);
    if (amount > 0) state.player.tookHit = true;
  } else {
    state.enemy.hp = Math.max(0, state.enemy.hp - amount);
  }

  state.fx.push({ type: 'hit', target: packet.target, amount, blocked, pierced: !!packet.ignoreBlock });

  const who = defenderIsPlayer ? 'Peelbeast' : state.enemy.name;
  const bits = [`${who}가 ${amount} 피해를 받았다.`];
  if (blocked > 0) bits.push(`Block ${blocked} 흡수.`);
  if (packet.ignoreBlock) bits.push('(관통)');
  addLog(state, packet.label, bits.join(' '), defenderIsPlayer ? 'enemy' : 'player');

  // Box Shell's counter, and anything else that armed one
  if (defenderIsPlayer && amount > 0 && state.player.counter > 0) {
    const thorns = state.player.counter;
    state.player.counter = 0;
    addLog(state, 'Counter', `반격으로 ${thorns} 피해를 되돌렸다.`, 'player');
    applyDamage(state, { amount: thorns, target: 'enemy', ignoreBlock: true, label: 'Counter' });
  }

  // Umbrella's reflected ink
  if (defenderIsPlayer && packet.isInk && state.player.reflectInk > 0) {
    state.player.reflectInk -= 1;
    addLog(state, 'Umbrella', '튄 잉크가 되돌아갔다.', 'player');
    applyDamage(state, { amount: 2, target: 'enemy', ignoreBlock: true, label: 'Umbrella' });
  }

  const lethal = defenderIsPlayer ? state.player.hp <= 0 : state.enemy.hp <= 0;
  return { dealt: amount, blocked, pierced: !!packet.ignoreBlock, lethal };
}

export function gainBlock(state: BattleState, side: BattleSide, amount: number, label: string): void {
  if (amount <= 0) return;
  const actor = side === 'player' ? state.player : state.enemy;
  actor.block += amount;
  state.fx.push({ type: 'block', target: side, amount });
  addLog(state, label, `${side === 'player' ? 'Peelbeast' : state.enemy.name}가 Block ${amount}을 얻었다.`, side);
}

export function shredBlock(state: BattleState, side: BattleSide, amount: number, label: string): void {
  const actor = side === 'player' ? state.player : state.enemy;
  const lost = Math.min(actor.block, amount);
  if (lost <= 0) return;
  actor.block -= lost;
  addLog(state, label, `Block ${lost}이 추가로 깎였다.`, 'enemy');
}

export function heal(state: BattleState, amount: number, label: string): void {
  if (amount === 0) return;
  const before = state.player.hp;
  state.player.hp = Math.max(0, Math.min(state.player.maxHp, state.player.hp + amount));
  const delta = state.player.hp - before;
  if (delta !== 0) {
    state.fx.push({ type: 'heal', amount: delta });
    addLog(state, label, `HP ${delta > 0 ? '+' : ''}${delta}.`, 'repair');
  }
}

export function changeGlue(state: BattleState, amount: number, label: string): void {
  if (amount === 0) return;
  const before = state.player.glue;
  state.player.glue = Math.max(0, Math.min(state.player.maxGlue, state.player.glue + amount));
  const delta = state.player.glue - before;
  if (delta !== 0) {
    state.fx.push({ type: 'glue', amount: delta });
    addLog(state, label, `Glue ${delta > 0 ? '+' : ''}${delta}.`, delta > 0 ? 'repair' : 'enemy');
  }
}

export function changeInk(state: BattleState, amount: number, label: string): void {
  const before = state.ink;
  state.ink = Math.max(0, Math.min(state.inkMax, state.ink + amount));
  if (state.ink !== before) {
    state.fx.push({ type: 'ink', value: state.ink });
    addLog(state, label, `Ink Tide ${state.ink > before ? '+' : ''}${state.ink - before} (${state.ink}/${state.inkMax}).`, state.ink > before ? 'enemy' : 'player');
  }
}
