/**
 * Public battle API.
 *
 * Every exported function is `(state, ...args) => BattleState` and returns a NEW
 * state; the caller's object is never mutated. Internally each entry point clones
 * once and then lets the resolvers mutate the draft, which keeps the resolvers
 * readable without leaking mutation to React.
 *
 * Determinism contract: same `seed` + same call sequence = identical states.
 * `tests/unit/determinism.test.ts` enforces it.
 */

import { BALANCE } from '../data/balance';
import { ENCOUNTERS } from '../data/enemies';
import { PARTS } from '../data/parts';
import { emptyStatuses } from '../data/statuses';
import type { PartSlot, StatusId } from '../data/types';
import { computeBuild, type AssemblyState } from '../systems/assemblySystem';
import { ALL_SLOTS, type BattleState, type FxEvent, type PlayerBattleState } from '../state/battleState';
import { applyEffects, reduceCooldowns } from './effectResolver';
import { changeGlue, gainBlock, heal } from './damageResolver';
import { applyStatus, clearStatus, consumeStatus, getStatus } from './statusResolver';
import { currentBuild, currentRules, peeledSlots, reattachPart, recalculateBuild } from './peelResolver';
import { fillIntentQueue, checkOutcome, endPlayerTurn, resolveEnemyTurn, startPlayerTurn } from './turnResolver';
import {
  basicAppliedStatuses,
  basicBonusVsStatus,
  guardCleanses,
  hasPassive,
  relicBasicStatuses,
  relicRepairBonus,
  relicRules,
  sumPassive,
  sumRelic,
} from './rules';
import { addLog } from './log';

// ─── construction ────────────────────────────────────────────────────────────

export interface BattleSetup {
  encounterId: string;
  assembly: AssemblyState;
  relics: string[];
  seed: number;
  /** Carried in from the run: current hp/glue and any pre-battle boons. */
  carry?: {
    hp?: number;
    glue?: number;
    startBlock?: number;
    startStatuses?: Partial<Record<StatusId, number>>;
  };
}

function emptyPlayer(): PlayerBattleState {
  return {
    hp: 0,
    maxHp: 0,
    glue: 0,
    maxGlue: 0,
    block: 0,
    atk: 0,
    spd: 0,
    peelResist: 0,
    statuses: emptyStatuses(),
    slots: {
      head: { partId: null, peeled: false, cooldown: 0 },
      hand: { partId: null, peeled: false, cooldown: 0 },
      core: { partId: null, peeled: false, cooldown: 0 },
      trinket: { partId: null, peeled: false, cooldown: 0 },
    },
    floor: [],
    reflectInk: 0,
    counter: 0,
    used: {},
    tookHit: false,
    usedSkill: false,
    peelCount: 0,
  };
}

export function createBattle(setup: BattleSetup): BattleState {
  const encounter = ENCOUNTERS[setup.encounterId];
  if (!encounter) throw new Error(`unknown encounter "${setup.encounterId}"`);
  const phase = encounter.phases[0];
  const build = computeBuild(setup.assembly, { relics: setup.relics });

  const player = emptyPlayer();
  for (const slot of ALL_SLOTS) {
    player.slots[slot] = { partId: setup.assembly.slots[slot], peeled: false, cooldown: build.cooldownStart > 0 ? 0 : 0 };
  }
  player.maxHp = build.maxHp;
  player.maxGlue = build.maxGlue;
  player.atk = build.atk;
  player.spd = build.spd;
  player.peelResist = build.peelResist;
  player.hp = Math.max(1, Math.min(build.maxHp, setup.carry?.hp ?? build.maxHp));
  player.glue = Math.max(0, Math.min(build.maxGlue, setup.carry?.glue ?? build.maxGlue));

  const state: BattleState = {
    encounterId: setup.encounterId,
    assembly: structuredClone(setup.assembly),
    relics: [...setup.relics],
    rngState: (setup.seed >>> 0) || 0x9e3779b9,
    turn: 1,
    side: 'player',
    player,
    enemy: {
      encounterId: setup.encounterId,
      phaseIndex: 0,
      name: phase.name,
      subtitle: phase.subtitle,
      assetId: phase.assetId,
      hp: phase.maxHp,
      maxHp: phase.maxHp,
      block: 0,
      fury: 0,
      statuses: emptyStatuses(),
      intents: [],
    },
    ink: 0,
    inkMax: BALANCE.ink.max,
    log: [],
    fx: [],
    outcome: 'ongoing',
    seq: 0,
  };

  addLog(state, 'Stage', phase.intro, 'phase');

  // relic openers
  const rules = relicRules(state.relics);
  const startBlock = sumRelic(rules, 'startBlock') + (setup.carry?.startBlock ?? 0);
  if (startBlock > 0) gainBlock(state, 'player', startBlock, 'Opening');
  const startGlue = sumRelic(rules, 'startGlue');
  if (startGlue > 0) changeGlue(state, startGlue, 'Thick Glue Tube');

  for (const [status, amount] of Object.entries(setup.carry?.startStatuses ?? {})) {
    if (amount) applyStatus(state, 'player', status as StatusId, amount);
  }

  fillIntentQueue(state);
  startOfBattleTurn(state, build.cooldownStart);
  return state;
}

/** Turn 1 setup without incrementing the turn counter. */
function startOfBattleTurn(state: BattleState, cooldownStart: number): void {
  const rules = currentRules(state);
  for (const { status, amount } of rules
    .filter((r): r is Extract<typeof r, { kind: 'turnStartStatusIfEmpty' }> => r.kind === 'turnStartStatusIfEmpty')
    .map((r) => ({ status: r.status, amount: r.amount }))) {
    if (getStatus(state, 'player', status) === 0) applyStatus(state, 'player', status, amount);
  }
  if (cooldownStart > 0) {
    addLog(state, 'Warm Breakfast', `모든 스킬이 쿨다운 ${cooldownStart} 낮은 상태로 시작한다.`, 'player');
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function draft(state: BattleState): BattleState {
  const next = structuredClone(state);
  next.fx = [];
  return next;
}

export function clearFx(state: BattleState): BattleState {
  if (state.fx.length === 0) return state;
  return { ...state, fx: [] };
}

/** Does the player currently see exact intent numbers? */
export function intentsRevealed(state: BattleState): boolean {
  return hasPassive(currentRules(state), 'revealIntents') || getStatus(state, 'player', 'insight') > 0;
}

export type CoreActionId = 'attack' | 'guard' | 'repair' | 'press';

export interface ActionAvailability {
  enabled: boolean;
  reason?: string;
}

export function coreActionAvailability(state: BattleState): ActionAvailability {
  if (state.outcome !== 'ongoing') return { enabled: false, reason: '전투가 끝났다' };
  if (state.side !== 'player') return { enabled: false, reason: '적 턴' };
  return { enabled: true };
}

export function skillAvailability(state: BattleState, slot: PartSlot): ActionAvailability {
  const base = coreActionAvailability(state);
  if (!base.enabled) return base;
  const runtime = state.player.slots[slot];
  if (!runtime.partId) return { enabled: false, reason: '빈 슬롯' };
  if (runtime.peeled) return { enabled: false, reason: '박리됨' };
  if (runtime.cooldown > 0) return { enabled: false, reason: `쿨다운 ${runtime.cooldown}` };
  const part = PARTS[runtime.partId];
  if (part && state.player.glue < part.active.glueCost) {
    return { enabled: false, reason: `Glue ${part.active.glueCost} 필요` };
  }
  return { enabled: true };
}

// ─── player actions ──────────────────────────────────────────────────────────

/**
 * Basic attack. Reads its bonuses from the aggregated rule list, so a new part
 * that buffs basics is a data change with no engine edit.
 */
function doAttack(state: BattleState): void {
  const D = BALANCE.damage;
  const rules = currentRules(state);
  const relRules = relicRules(state.relics);

  let amount = state.player.atk;
  if (consumeStatus(state, 'player', 'focus')) amount += D.focusBonus;
  if (state.player.spd >= D.fastSpeedThreshold) amount += D.fastSpeedBonus;
  if (getStatus(state, 'player', 'frazzle') > 0) amount = Math.max(1, amount - D.frazzlePenalty);
  amount += basicBonusVsStatus(rules, state.enemy.statuses);

  const pierce = sumPassive(rules, 'basicPierce');

  state.fx.push({ type: 'playerAttack', animation: 'strike' });
  applyEffects(state, [{ kind: 'damage', amount }], {
    source: 'player',
    label: 'Peel Strike',
    pierce: pierce > 0 ? pierce : undefined,
  });

  for (const { status, amount: n } of [...basicAppliedStatuses(rules), ...relicBasicStatuses(relRules)]) {
    applyStatus(state, 'enemy', status, n);
  }
}

function doGuard(state: BattleState): void {
  const rules = currentRules(state);
  const amount = BALANCE.core.guardBlock + sumPassive(rules, 'guardBonus');
  state.fx.push({ type: 'playerAttack', animation: 'guard' });
  gainBlock(state, 'player', amount, 'Guard');

  for (const { status, amount: n } of guardCleanses(rules)) {
    if (getStatus(state, 'player', status) > 0) {
      clearStatus(state, 'player', status, n);
      addLog(state, 'Guard', `${status} ${n} 해제.`, 'player');
    }
  }
  // Reinforced Package
  if (hasPassive(rules, 'repairReattach') && peeledSlots(state).length > 0) {
    reattachPart(state, undefined, 'Reinforced Package');
  }
}

function doRepair(state: BattleState): void {
  const rules = currentRules(state);
  const relBonus = relicRepairBonus(relicRules(state.relics));
  state.fx.push({ type: 'playerAttack', animation: 'repair' });

  heal(state, BALANCE.core.repairHp + relBonus.hp, 'Repair');
  changeGlue(state, BALANCE.core.repairGlue + relBonus.glue + sumPassive(rules, 'sustainBonusGlue'), 'Repair');
  if (peeledSlots(state).length > 0) {
    reattachPart(state, undefined, 'Repair');
  }
}

function doPress(state: BattleState): void {
  const rules = currentRules(state);
  const bonus = sumRelic(relicRules(state.relics), 'pressCooldownBonus');
  state.fx.push({ type: 'playerAttack', animation: 'press' });
  reduceCooldowns(state, BALANCE.core.pressCooldown + bonus);
  changeGlue(state, BALANCE.core.pressGlue + sumPassive(rules, 'sustainBonusGlue'), 'Press');
  addLog(state, 'Press', `쿨다운 ${BALANCE.core.pressCooldown + bonus} 감소.`, 'player');
}

/**
 * `resolvePlayerAction(state, action)` — the main entry point.
 * Returns a new state with the enemy still waiting; call `resolveEnemyIntent`
 * next. Splitting them lets the view animate the player's move before the reply.
 */
export function resolvePlayerAction(state: BattleState, action: CoreActionId): BattleState {
  if (!coreActionAvailability(state).enabled) return state;
  const next = draft(state);

  switch (action) {
    case 'attack':
      doAttack(next);
      break;
    case 'guard':
      doGuard(next);
      break;
    case 'repair':
      doRepair(next);
      break;
    case 'press':
      doPress(next);
      break;
  }

  if (!checkOutcome(next)) endPlayerTurn(next);
  return next;
}

export function resolveSkill(state: BattleState, slot: PartSlot): BattleState {
  if (!skillAvailability(state, slot).enabled) return state;
  const next = draft(state);
  const runtime = next.player.slots[slot];
  const part = PARTS[runtime.partId!];
  const skill = part.active;

  const firstSkillBonus = !next.player.usedSkill ? sumRelic(relicRules(next.relics), 'firstSkillBonusDamage') : 0;

  if (skill.glueCost > 0) changeGlue(next, -skill.glueCost, skill.name);
  next.fx.push({ type: 'playerAttack', animation: skill.animation });
  addLog(next, skill.name, skill.flavour, 'player');

  applyEffects(next, skill.effects, {
    source: 'player',
    label: skill.name,
    bonusDamage: firstSkillBonus,
  });

  runtime.cooldown = skill.cooldown;
  next.player.usedSkill = true;

  if (!checkOutcome(next)) endPlayerTurn(next);
  return next;
}

/** Runs the enemy's queued intent and hands the turn back. */
export function resolveEnemyIntent(state: BattleState): BattleState {
  if (state.side !== 'enemy' || state.outcome !== 'ongoing') return state;
  const next = draft(state);
  resolveEnemyTurn(next);
  return next;
}

// ─── derived views for the UI ────────────────────────────────────────────────

export interface SkillView {
  slot: PartSlot;
  partId: string | null;
  partName: string;
  skill: (typeof PARTS)[string]['active'] | null;
  cooldown: number;
  peeled: boolean;
  availability: ActionAvailability;
}

export function skillViews(state: BattleState): SkillView[] {
  return ALL_SLOTS.map((slot) => {
    const runtime = state.player.slots[slot];
    const part = runtime.partId ? PARTS[runtime.partId] : null;
    return {
      slot,
      partId: runtime.partId,
      partName: part?.name ?? '빈 슬롯',
      skill: part?.active ?? null,
      cooldown: runtime.cooldown,
      peeled: runtime.peeled,
      availability: skillAvailability(state, slot),
    };
  });
}

export function battleBuild(state: BattleState) {
  return currentBuild(state);
}

export function drainFx(state: BattleState): FxEvent[] {
  return state.fx;
}

export { recalculateBuild, startPlayerTurn };
