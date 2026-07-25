import type { PartSlot, StatusId } from '../data/types';
import type { AssemblyState } from '../systems/assemblySystem';

/** Peeled part lying on the desk, waiting to be reattached. */
export interface FloorPart {
  slot: PartSlot;
  partId: string;
  /** Stable per-peel id so the view can animate each fall exactly once. */
  key: string;
  /** Where on the floor strip it landed, 0..1. Deterministic from the rng. */
  x: number;
  rotation: number;
}

export interface SlotRuntime {
  partId: string | null;
  peeled: boolean;
  cooldown: number;
}

export interface PlayerBattleState {
  hp: number;
  maxHp: number;
  glue: number;
  maxGlue: number;
  block: number;
  atk: number;
  spd: number;
  peelResist: number;
  statuses: Record<StatusId, number>;
  slots: Record<PartSlot, SlotRuntime>;
  floor: FloorPart[];
  reflectInk: number;
  counter: number;
  /** once-per-battle flags, keyed by rule id */
  used: Record<string, boolean>;
  tookHit: boolean;
  usedSkill: boolean;
  peelCount: number;
}

export interface IntentInstance {
  /** Unique per queued intent so React keys are stable through the queue shift. */
  key: string;
  intentId: string;
  /** Fury and Copy Eye adjust the queued instance, not the definition. */
  bonusDamage: number;
  weakened: number;
}

export interface EnemyBattleState {
  encounterId: string;
  phaseIndex: number;
  name: string;
  subtitle: string;
  assetId: string;
  hp: number;
  maxHp: number;
  block: number;
  fury: number;
  statuses: Record<StatusId, number>;
  intents: IntentInstance[];
}

export type BattleSide = 'player' | 'enemy';
export type BattleOutcome = 'ongoing' | 'won' | 'lost';

export interface LogEntry {
  id: number;
  who: string;
  text: string;
  tone: 'neutral' | 'player' | 'enemy' | 'peel' | 'repair' | 'phase';
}

/**
 * Animation instructions emitted by the engine and consumed by the battle view.
 * The engine never touches the DOM; the view never re-derives what happened.
 */
export type FxEvent =
  | { type: 'playerAttack'; animation: string }
  | { type: 'enemyAttack'; intentId: string }
  | { type: 'hit'; target: BattleSide; amount: number; blocked: number; pierced: boolean }
  | { type: 'block'; target: BattleSide; amount: number }
  | { type: 'heal'; amount: number }
  | { type: 'glue'; amount: number }
  | { type: 'status'; target: BattleSide; status: StatusId; amount: number }
  | { type: 'peel'; slot: PartSlot; partId: string; key: string }
  | { type: 'peelResisted'; slot: PartSlot; reason: string }
  | { type: 'reattach'; slot: PartSlot; partId: string }
  | { type: 'ink'; value: number }
  | { type: 'phase'; index: number; name: string }
  | { type: 'outcome'; outcome: BattleOutcome };

export interface BattleState {
  encounterId: string;
  assembly: AssemblyState;
  relics: string[];
  /** Serialised rng cursor — determinism depends on this travelling with state. */
  rngState: number;
  turn: number;
  side: BattleSide;
  player: PlayerBattleState;
  enemy: EnemyBattleState;
  ink: number;
  inkMax: number;
  log: LogEntry[];
  fx: FxEvent[];
  outcome: BattleOutcome;
  /** Monotonic, used for log ids and peel keys. */
  seq: number;
}

export const ALL_SLOTS: PartSlot[] = ['head', 'hand', 'core', 'trinket'];
