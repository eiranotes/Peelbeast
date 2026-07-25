/**
 * Status application, decay and expiry — one place, not eight scattered lines.
 *
 * v0.8 decremented eight statuses by hand inside `runEnemyTurn`; adding a status
 * meant remembering to edit that line. Here the decay policy is declared on the
 * status definition and this file is the only thing that reads it.
 */

import { STATUSES, STATUS_IDS } from '../data/statuses';
import type { StatusId } from '../data/types';
import type { BattleSide, BattleState } from '../state/battleState';

function bag(state: BattleState, side: BattleSide): Record<StatusId, number> {
  return side === 'player' ? state.player.statuses : state.enemy.statuses;
}

export function getStatus(state: BattleState, side: BattleSide, status: StatusId): number {
  return bag(state, side)[status] ?? 0;
}

export function applyStatus(state: BattleState, side: BattleSide, status: StatusId, amount: number): number {
  const def = STATUSES[status];
  const b = bag(state, side);
  const before = b[status] ?? 0;
  const next = Math.max(0, Math.min(def.max, before + amount));
  b[status] = next;
  const delta = next - before;
  if (delta !== 0) {
    state.fx.push({ type: 'status', target: side, status, amount: delta });
  }
  return delta;
}

export function clearStatus(state: BattleState, side: BattleSide, status: StatusId, amount?: number): number {
  const b = bag(state, side);
  const before = b[status] ?? 0;
  if (before === 0) return 0;
  const next = amount === undefined ? 0 : Math.max(0, before - amount);
  b[status] = next;
  state.fx.push({ type: 'status', target: side, status, amount: next - before });
  return before - next;
}

/** Spend one stack of an `onConsume` status. Returns true if a stack was spent. */
export function consumeStatus(state: BattleState, side: BattleSide, status: StatusId): boolean {
  const b = bag(state, side);
  if ((b[status] ?? 0) <= 0) return false;
  b[status] -= 1;
  return true;
}

/** End-of-round tick: every `endOfRound` status loses one stack from both sides. */
export function tickStatusDecay(state: BattleState): void {
  for (const side of ['player', 'enemy'] as const) {
    const b = bag(state, side);
    for (const id of STATUS_IDS) {
      if (STATUSES[id].decay !== 'endOfRound') continue;
      if ((b[id] ?? 0) > 0) b[id] = Math.max(0, b[id] - 1);
    }
  }
}

/** Statuses with a non-zero stack, ordered for display. */
export function activeStatuses(state: BattleState, side: BattleSide): Array<{ id: StatusId; value: number }> {
  const b = bag(state, side);
  return STATUS_IDS.filter((id) => (b[id] ?? 0) > 0)
    .map((id) => ({ id, value: b[id] }))
    .sort((a, x) => {
      const ta = STATUSES[a.id].tone === 'bad' ? 1 : 0;
      const tx = STATUSES[x.id].tone === 'bad' ? 1 : 0;
      return ta - tx || a.id.localeCompare(x.id);
    });
}
