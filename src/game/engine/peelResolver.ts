/**
 * Peel and reattach — the mechanic the whole game is named after.
 *
 * A peel is not a debuff counter. It removes the part from the build, which
 * removes its stats, its active skill, its passive rules and any synergy it was
 * part of, and it drops the sprite onto the desk. Reattaching reverses all of it.
 * `recalculateBuild` is what makes that true, and it is called from exactly two
 * places: `peelPart` and `reattachPart`.
 */

import { BALANCE } from '../data/balance';
import { PARTS } from '../data/parts';
import { computeBuild } from '../systems/assemblySystem';
import type { PartSlot } from '../data/types';
import { ALL_SLOTS, type BattleState, type FloorPart } from '../state/battleState';
import { rngChance, rngFloat, rngPick, type Rng } from './rng';
import { peelCatchChance, sumPassive, hasRelicRule, relicRules } from './rules';
import { addLog } from './log';
import { gainBlock } from './damageResolver';

function rngFor(state: BattleState): Rng {
  return { state: state.rngState };
}

function commitRng(state: BattleState, rng: Rng): void {
  state.rngState = rng.state;
}

/** Slots that currently hold an attached part. */
export function attachedSlots(state: BattleState): PartSlot[] {
  return ALL_SLOTS.filter((s) => state.player.slots[s].partId && !state.player.slots[s].peeled);
}

export function peeledSlots(state: BattleState): PartSlot[] {
  return ALL_SLOTS.filter((s) => state.player.slots[s].partId && state.player.slots[s].peeled);
}

/**
 * Recompute every derived player number from the currently attached parts.
 * Current hp/glue are clamped, never restored — losing max hp to a peel hurts.
 */
export function recalculateBuild(state: BattleState): void {
  const peeled = new Set(peeledSlots(state));
  const build = computeBuild(state.assembly, { peeled, relics: state.relics });
  state.player.maxHp = build.maxHp;
  state.player.maxGlue = build.maxGlue;
  state.player.atk = build.atk;
  state.player.spd = build.spd;
  state.player.peelResist = build.peelResist;
  state.player.hp = Math.min(state.player.hp, build.maxHp);
  state.player.glue = Math.min(state.player.glue, build.maxGlue);
}

/** Current rules, recomputed on demand so peel state is always reflected. */
export function currentRules(state: BattleState) {
  return computeBuild(state.assembly, { peeled: new Set(peeledSlots(state)), relics: state.relics }).rules;
}

export function currentBuild(state: BattleState) {
  return computeBuild(state.assembly, { peeled: new Set(peeledSlots(state)), relics: state.relics });
}

/**
 * Choose which slot an intent peels.
 * Drift lifts the trinket out of reach, so grounded slots are hit first.
 */
export function choosePeelTarget(state: BattleState, allowed: PartSlot[] | 'any'): PartSlot | null {
  const candidates = attachedSlots(state).filter((s) => allowed === 'any' || allowed.includes(s));
  if (candidates.length === 0) return null;

  const rng = rngFor(state);
  let pool = candidates;
  if (BALANCE.peel.driftProtectsTrinket && state.player.statuses.drift > 0) {
    const grounded = candidates.filter((s) => s !== 'trinket');
    if (grounded.length > 0) pool = grounded;
  }
  const pick = rngPick(rng, pool);
  commitRng(state, rng);
  return pick;
}

export function peelChance(state: BattleState): number {
  const raw = BALANCE.peel.baseChance - state.player.peelResist * BALANCE.peel.resistStep;
  return Math.max(BALANCE.peel.minChance, Math.min(BALANCE.peel.maxChance, raw));
}

export interface PeelAttempt {
  slot: PartSlot | null;
  peeled: boolean;
  reason?: 'noTarget' | 'blocked' | 'resisted' | 'caught';
}

/**
 * Try to peel a slot on behalf of an intent.
 * `blockThreshold` is the Block value that shrugs the attempt off entirely —
 * guarding is a real answer to peel pressure, not just to damage.
 */
export function attemptPeel(
  state: BattleState,
  allowed: PartSlot[] | 'any',
  blockThreshold: number,
  label: string,
): PeelAttempt {
  if (state.player.block >= blockThreshold && blockThreshold > 0) {
    addLog(state, label, `Block ${state.player.block}이 박리 시도를 막아냈다.`, 'player');
    state.fx.push({ type: 'peelResisted', slot: 'head', reason: 'block' });
    return { slot: null, peeled: false, reason: 'blocked' };
  }

  const slot = choosePeelTarget(state, allowed);
  if (!slot) return { slot: null, peeled: false, reason: 'noTarget' };

  const rng = rngFor(state);
  const landed = rngChance(rng, peelChance(state));
  commitRng(state, rng);

  if (!landed) {
    addLog(state, label, `${slotName(slot)} 슬롯이 흔들렸지만 버텼다. (저항 ${state.player.peelResist})`, 'player');
    state.fx.push({ type: 'peelResisted', slot, reason: 'resist' });
    return { slot, peeled: false, reason: 'resisted' };
  }

  return { slot, peeled: peelPart(state, slot, label), reason: undefined };
}

export function slotName(slot: PartSlot): string {
  return ({ head: 'Head', hand: 'Hand', core: 'Core', trinket: 'Trinket' } as const)[slot];
}

/**
 * Actually remove a part. Returns false if a catch rule saved it.
 */
export function peelPart(state: BattleState, slot: PartSlot, label: string): boolean {
  const runtime = state.player.slots[slot];
  if (!runtime.partId || runtime.peeled) return false;

  const rules = currentRules(state);
  const catchChance = peelCatchChance(rules);
  if (catchChance > 0) {
    const rng = rngFor(state);
    const caught = rngChance(rng, catchChance);
    commitRng(state, rng);
    if (caught) {
      addLog(state, 'Adhesive Memory', `${slotName(slot)} 슬롯이 벗겨질 뻔했지만 접착제가 붙잡았다.`, 'repair');
      state.fx.push({ type: 'peelResisted', slot, reason: 'catch' });
      return false;
    }
  }

  const partId = runtime.partId;
  runtime.peeled = true;
  runtime.cooldown = 0;
  state.player.peelCount += 1;
  state.seq += 1;

  const rng = rngFor(state);
  const floorPart: FloorPart = {
    slot,
    partId,
    key: `peel-${state.seq}`,
    // Scattered across the player's own side of the desk. The full width let
    // parts settle under the enemy, where they read as the enemy's trophies
    // rather than as pieces that just fell off the beast.
    x: 0.07 + rngFloat(rng) * 0.3,
    rotation: -30 + rngFloat(rng) * 60,
  };
  commitRng(state, rng);
  state.player.floor.push(floorPart);

  recalculateBuild(state);

  state.fx.push({ type: 'peel', slot, partId, key: floorPart.key });
  addLog(state, label, `${slotName(slot)} 슬롯의 ${PARTS[partId]?.name ?? partId}이(가) 벗겨져 책상에 떨어졌다.`, 'peel');

  // Bread Patch: gain block whenever anything peels
  const blockOnPeel = sumPassive(rules, 'blockOnPeel');
  if (blockOnPeel > 0) gainBlock(state, 'player', blockOnPeel, 'Emergency Stitch');

  // Backup Patch relic: one free reattach per battle
  if (hasRelicRule(relicRules(state.relics), 'autoReattachOnce') && !state.player.used.autoReattach) {
    state.player.used.autoReattach = true;
    reattachPart(state, slot, 'Backup Patch');
  }

  return true;
}

/** Reattach a specific slot, or the earliest-peeled one when omitted. */
export function reattachPart(state: BattleState, slot: PartSlot | undefined, label: string): PartSlot | null {
  const peeled = peeledSlots(state);
  if (peeled.length === 0) {
    addLog(state, label, '되붙일 파츠가 없다.', 'neutral');
    return null;
  }
  const target = slot && peeled.includes(slot) ? slot : peeled[0];
  const runtime = state.player.slots[target];
  runtime.peeled = false;
  const idx = state.player.floor.findIndex((f) => f.slot === target);
  if (idx >= 0) state.player.floor.splice(idx, 1);

  recalculateBuild(state);

  state.fx.push({ type: 'reattach', slot: target, partId: runtime.partId! });
  addLog(state, label, `${slotName(target)} 슬롯의 ${PARTS[runtime.partId!]?.name ?? ''}을(를) 다시 붙였다.`, 'repair');
  return target;
}

export function reattachMany(state: BattleState, count: number, label: string): number {
  let done = 0;
  for (let i = 0; i < count; i++) {
    if (reattachPart(state, undefined, label)) done++;
    else break;
  }
  return done;
}
