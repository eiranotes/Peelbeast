/**
 * Turn structure: intent generation, the enemy's turn, phase shifts and the
 * start-of-turn housekeeping that used to be one 400-character line in v0.8.
 */

import { BALANCE } from '../data/balance';
import { ENCOUNTERS } from '../data/enemies';
import { INTENTS } from '../data/intents';
import type { EnemyPhaseDef } from '../data/types';
import { ALL_SLOTS, type BattleState, type IntentInstance } from '../state/battleState';
import { rngChance, rngPick, type Rng } from './rng';
import { applyEffects } from './effectResolver';
import { changeInk } from './damageResolver';
import { applyStatus, consumeStatus, getStatus, tickStatusDecay } from './statusResolver';
import { currentRules, peelPart, recalculateBuild, attachedSlots } from './peelResolver';
import { relicRules, sumRelic, turnStartStatuses } from './rules';
import { addLog } from './log';

export function currentPhase(state: BattleState): EnemyPhaseDef {
  const enc = ENCOUNTERS[state.encounterId];
  return enc.phases[Math.min(state.enemy.phaseIndex, enc.phases.length - 1)];
}

function rngFor(state: BattleState): Rng {
  return { state: state.rngState };
}

export function createIntent(state: BattleState): IntentInstance {
  const phase = currentPhase(state);
  const rng = rngFor(state);
  let moveId = rngPick(rng, phase.moves);

  // A queue showing the same card three times tells the player nothing. Reroll
  // a couple of times to keep the three-intent preview informative; a small pool
  // can still legitimately repeat, which is why this gives up rather than loops.
  const queued = state.enemy.intents.map((i) => i.intentId);
  const distinct = new Set(phase.moves).size;
  for (let tries = 0; tries < 3 && distinct > 1; tries++) {
    if (queued.filter((id) => id === moveId).length < 1) break;
    moveId = rngPick(rng, phase.moves);
  }

  if (phase.desperation && state.enemy.hp < state.enemy.maxHp * phase.desperation.belowHpRatio) {
    if (rngChance(rng, phase.desperation.chance)) moveId = phase.desperation.moveId;
  }
  state.rngState = rng.state;
  state.seq += 1;
  return { key: `intent-${state.seq}`, intentId: moveId, bonusDamage: 0, weakened: 0 };
}

export function fillIntentQueue(state: BattleState): void {
  while (state.enemy.intents.length < BALANCE.enemy.intentQueueLength) {
    state.enemy.intents.push(createIntent(state));
  }
}

/** True when the boss moved to its next phase instead of dying. */
export function advancePhase(state: BattleState): boolean {
  const enc = ENCOUNTERS[state.encounterId];
  if (state.enemy.phaseIndex >= enc.phases.length - 1) return false;

  state.enemy.phaseIndex += 1;
  const phase = currentPhase(state);
  state.enemy.name = phase.name;
  state.enemy.subtitle = phase.subtitle;
  state.enemy.assetId = phase.assetId;
  state.enemy.hp = phase.maxHp;
  state.enemy.maxHp = phase.maxHp;
  state.enemy.block = BALANCE.enemy.phaseShiftBlock;
  state.enemy.fury = BALANCE.enemy.phaseShiftFury;
  state.enemy.statuses.pinned = 0;
  state.enemy.statuses.fragile = 0;
  state.enemy.statuses.vulnerable = 0;
  state.enemy.intents = [];
  fillIntentQueue(state);

  // The boss gets Block and Fury on the shift; without a matching breather the
  // second phase always opened against a spent build and was near-unwinnable.
  const relief = Math.round(state.player.maxHp * BALANCE.enemy.phaseShiftPlayerHeal);
  if (relief > 0) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + relief);
    addLog(state, 'Phase Shift', `숨을 고르며 HP ${relief}를 회복했다.`, 'repair');
  }

  state.fx.push({ type: 'phase', index: state.enemy.phaseIndex, name: phase.name });
  addLog(state, 'Phase Shift', phase.intro, 'phase');
  return true;
}

/** Resolve win/loss, handling boss phase transitions. Returns true when over. */
export function checkOutcome(state: BattleState): boolean {
  if (state.enemy.hp <= 0) {
    if (advancePhase(state)) return false;
    state.outcome = 'won';
    state.fx.push({ type: 'outcome', outcome: 'won' });
    addLog(state, 'Result', `${state.enemy.name}을(를) 쓰러뜨렸다.`, 'player');
    return true;
  }
  if (state.player.hp <= 0) {
    state.outcome = 'lost';
    state.fx.push({ type: 'outcome', outcome: 'lost' });
    addLog(state, 'Result', 'Peelbeast가 무너졌다.', 'enemy');
    return true;
  }
  return false;
}

/** Runs after the player commits an action. Mutates `state` in place. */
export function endPlayerTurn(state: BattleState): void {
  if (state.outcome !== 'ongoing') return;
  state.player.block = Math.max(0, state.player.block);
  state.side = 'enemy';
}

/** The enemy executes exactly one intent, then the round wraps up. */
export function resolveEnemyTurn(state: BattleState): void {
  if (state.outcome !== 'ongoing' || state.side !== 'enemy') return;

  const instance = state.enemy.intents.shift();
  if (instance) {
    const intent = INTENTS[instance.intentId];
    state.fx.push({ type: 'enemyAttack', intentId: intent.id });
    addLog(state, state.enemy.name, `${intent.name} — ${intent.flavour}`, 'enemy');

    // Insight is spent to read the exact numbers of the intent being executed
    consumeStatus(state, 'player', 'insight');

    applyEffects(state, intent.effects, {
      source: 'enemy',
      label: intent.name,
      rules: currentRules(state),
      bonusDamage: state.enemy.fury + instance.bonusDamage,
      weaken: instance.weakened,
      isInk: intent.category === 'ink',
    });
  }

  fillIntentQueue(state);

  if (checkOutcome(state)) return;

  endOfRound(state);
  if (checkOutcome(state)) return;

  startPlayerTurn(state);
}

function endOfRound(state: BattleState): void {
  const rules = relicRules(state.relics);

  // ink flood
  if (state.ink >= BALANCE.ink.floodThreshold) {
    addLog(state, 'Ink Tide', '잉크가 넘쳐 책상 위로 번진다.', 'enemy');
    applyEffects(state, [{ kind: 'damage', amount: BALANCE.ink.floodDamage }], {
      source: 'enemy',
      label: 'Ink Tide',
      rules: currentRules(state),
      isInk: true,
    });
  }
  const drain = sumRelic(rules, 'inkDrain') + BALANCE.ink.decayPerRound;
  if (drain > 0 && state.ink > 0) changeInk(state, -drain, 'Blotter Pad');

  tickStatusDecay(state);
  state.enemy.block = 0;
}

export function startPlayerTurn(state: BattleState): void {
  state.side = 'player';
  state.turn += 1;
  state.player.block = 0;
  state.player.counter = 0;

  const rules = currentRules(state);

  // Toast Helm: top up Focus when empty
  for (const { status, amount } of turnStartStatuses(rules)) {
    if (getStatus(state, 'player', status) === 0) applyStatus(state, 'player', status, amount);
  }

  // Bind freezes cooldowns; Haste accelerates them
  if (getStatus(state, 'player', 'bind') > 0) {
    addLog(state, 'Bind', '테이프에 묶여 쿨다운이 내려가지 않는다.', 'enemy');
  } else {
    const step = 1 + (getStatus(state, 'player', 'haste') > 0 ? 1 : 0);
    for (const slot of ALL_SLOTS) {
      const runtime = state.player.slots[slot];
      runtime.cooldown = Math.max(0, runtime.cooldown - step);
    }
  }

  // running dry on glue tears a part off
  if (BALANCE.peel.glueBreakEnabled && state.player.glue <= 0 && attachedSlots(state).length > 0) {
    addLog(state, 'Glue Break', '글루가 바닥나 조각이 헐거워졌다.', 'peel');
    const rng = rngFor(state);
    const slot = rngPick(rng, attachedSlots(state));
    state.rngState = rng.state;
    peelPart(state, slot, 'Glue Break');
  }

  recalculateBuild(state);
}
