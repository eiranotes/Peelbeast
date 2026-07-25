/**
 * Content schema for PEELBEAST.
 *
 * The single most important rule here: an ability is described ONCE, as data.
 * Both the rules engine and the UI copy are derived from the same `Effect[]`.
 * The v0.8 build kept intent text ("4 damage · Bind 1") in one place and the
 * damage arithmetic in another, and they drifted apart the moment `fury` was
 * added. That failure mode is structurally impossible here.
 */

import type { PartSlot } from '@/assets/assetTypes';

export type { PartSlot };

// ─── statuses ────────────────────────────────────────────────────────────────

export type StatusId =
  | 'focus'
  | 'drift'
  | 'bind'
  | 'haste'
  | 'pinned'
  | 'fragile'
  | 'frazzle'
  | 'insight'
  | 'vulnerable';

export type StatusDecay = 'endOfRound' | 'onConsume' | 'persist';

export interface StatusDef {
  id: StatusId;
  name: string;
  /** Who normally carries it. Used to sort the status rails. */
  side: 'player' | 'enemy' | 'both';
  tone: 'good' | 'bad';
  iconAssetId: string;
  decay: StatusDecay;
  max: number;
  /** Player-facing rule text. Kept short enough for a tooltip. */
  desc: string;
}

// ─── effects ─────────────────────────────────────────────────────────────────

export type EffectTarget = 'self' | 'opponent';

/** Conditions are evaluated against the live battle state by the resolvers. */
export type EffectCondition =
  | { kind: 'opponentHasStatus'; status: StatusId; atLeast?: number }
  | { kind: 'selfHasStatus'; status: StatusId; atLeast?: number }
  | { kind: 'selfSpeedAtLeast'; value: number }
  | { kind: 'anyPartPeeled' }
  | { kind: 'noPartPeeled' };

export type Effect =
  | { kind: 'damage'; amount: number; ignoreBlock?: boolean; hits?: number; bonus?: { when: EffectCondition; amount: number } }
  | { kind: 'block'; amount: number }
  | { kind: 'heal'; amount: number }
  | { kind: 'glue'; amount: number }
  | { kind: 'drainGlue'; amount: number }
  | { kind: 'status'; target: EffectTarget; status: StatusId; amount: number }
  | { kind: 'cleanse'; target: EffectTarget; status: StatusId }
  | { kind: 'ink'; amount: number }
  | { kind: 'reattach'; count: number }
  | { kind: 'peel'; slots: PartSlot[] | 'any'; blockThreshold: number }
  | { kind: 'cooldown'; amount: number }
  | { kind: 'reflectInk'; amount: number }
  | { kind: 'counter'; amount: number }
  | { kind: 'weakenNextIntent'; amount: number }
  | { kind: 'enemyBlock'; amount: number }
  | { kind: 'fury'; amount: number }
  | { kind: 'shredBlock'; amount: number };

// ─── skills ──────────────────────────────────────────────────────────────────

export interface SkillDef {
  id: string;
  name: string;
  /** Logical asset id for the button glyph. */
  iconAssetId: string;
  cooldown: number;
  glueCost: number;
  /** Flavour line. The mechanical text is generated from `effects`. */
  flavour: string;
  effects: Effect[];
  /** Which fx clip the battle view plays. */
  animation: AnimationId;
}

export type AnimationId =
  | 'strike'
  | 'snip'
  | 'thrust'
  | 'burst'
  | 'hop'
  | 'shelter'
  | 'brew'
  | 'tape'
  | 'patch'
  | 'gaze'
  | 'guard'
  | 'repair'
  | 'press';

// ─── passives ────────────────────────────────────────────────────────────────

/**
 * Passives are declared as typed modifier bundles rather than free functions so
 * they can be listed, tested and displayed without executing anything.
 */
export interface PassiveDef {
  id: string;
  title: string;
  desc: string;
  /** Flat build modifiers while the part is attached. */
  modifiers?: BuildModifiers;
  /** Named rules the resolvers look for. Each is documented in 03_BATTLE_SYSTEM. */
  rules?: PassiveRule[];
}

export type PassiveRule =
  /** Basic attacks deal +n against an opponent carrying `status`. */
  | { kind: 'basicBonusVsStatus'; status: StatusId; amount: number }
  /** Basic attacks apply `status` to the opponent. */
  | { kind: 'basicApplyStatus'; status: StatusId; amount: number }
  /** Basic attacks ignore n block. */
  | { kind: 'basicPierce'; amount: number }
  /** Guard grants +n block. */
  | { kind: 'guardBonus'; amount: number }
  /** Guard also clears n stacks of `status` from the player. */
  | { kind: 'guardCleanse'; status: StatusId; amount: number }
  /** Repair and Press grant +n glue. */
  | { kind: 'sustainBonusGlue'; amount: number }
  /** Repair also reattaches one peeled part. */
  | { kind: 'repairReattach' }
  /** Incoming ink damage reduced by n. */
  | { kind: 'inkResist'; amount: number }
  /** Chance in [0,1] to shrug off a peel entirely. */
  | { kind: 'peelCatch'; chance: number }
  /** Gain n block whenever any part is peeled. */
  | { kind: 'blockOnPeel'; amount: number }
  /** At the start of the player's turn, gain `status` if they have none. */
  | { kind: 'turnStartStatusIfEmpty'; status: StatusId; amount: number }
  /** Reveal the enemy intent queue from turn 1. */
  | { kind: 'revealIntents' }
  /** First hit of a battle is reduced by n. */
  | { kind: 'firstHitSoften'; amount: number };

// ─── build modifiers ─────────────────────────────────────────────────────────

export interface BuildModifiers {
  hp?: number;
  glue?: number;
  atk?: number;
  spd?: number;
  /** Subtracted from peel chance rolls. Higher = parts stay on. */
  peelResist?: number;
  /**
   * Subtracted from every cooldown a skill sets, floored at 0. A discount of 1
   * means a 3-turn skill comes back in 2.
   */
  cooldownDiscount?: number;
}

// ─── parts ───────────────────────────────────────────────────────────────────

export interface PartDef {
  id: string;
  slot: PartSlot;
  name: string;
  desc: string;
  /** Logical asset ids — never file paths. */
  assetId: string;
  stats: BuildModifiers;
  active: SkillDef;
  passive: PassiveDef;
  tags: string[];
}

export interface BodyDef {
  id: string;
  name: string;
  assetId: string;
  base: Required<Pick<BuildModifiers, 'hp' | 'glue' | 'atk' | 'spd' | 'peelResist'>>;
  slots: PartSlot[];
}

// ─── synergies ───────────────────────────────────────────────────────────────

export interface SynergyDef {
  id: string;
  name: string;
  desc: string;
  /** All of these part ids must be attached AND unpeeled. */
  requires: string[];
  modifiers?: BuildModifiers;
  rules?: PassiveRule[];
}

// ─── enemies & intents ───────────────────────────────────────────────────────

export type IntentCategory = 'attack' | 'peel' | 'debuff' | 'defend' | 'ink';

export interface IntentDef {
  id: string;
  name: string;
  category: IntentCategory;
  iconAssetId: string;
  /** Applied enemy → player. `self` means the enemy. */
  effects: Effect[];
  /** Damage can be reduced by Block. */
  blockable: boolean;
  /** Damage ignores Block entirely. */
  piercing: boolean;
  flavour: string;
}

export interface EnemyPhaseDef {
  enemyId: string;
  name: string;
  subtitle: string;
  assetId: string;
  maxHp: number;
  intro: string;
  moves: string[];
  /** Move forced when the phase drops below this fraction of max hp. */
  desperation?: { belowHpRatio: number; moveId: string; chance: number };
}

export type EncounterKind = 'combat' | 'elite' | 'boss';

export interface EncounterDef {
  id: string;
  name: string;
  kind: EncounterKind;
  summary: string;
  backgroundAssetId: string;
  phases: EnemyPhaseDef[];
  scrapReward: number;
}

// ─── relics ──────────────────────────────────────────────────────────────────

export interface RelicDef {
  id: string;
  name: string;
  desc: string;
  type: 'offense' | 'defense' | 'sustain' | 'tempo' | 'resource' | 'control' | 'repair' | 'speed';
  modifiers?: BuildModifiers;
  rules?: RelicRule[];
}

export type RelicRule =
  | { kind: 'basicApplyStatus'; status: StatusId; amount: number }
  | { kind: 'repairBonus'; hp: number; glue: number }
  | { kind: 'pressCooldownBonus'; amount: number }
  | { kind: 'autoReattachOnce' }
  | { kind: 'inkDrain'; amount: number }
  | { kind: 'startBlock'; amount: number }
  | { kind: 'startGlue'; amount: number }
  | { kind: 'firstSkillBonusDamage'; amount: number };

// ─── events / shops / routes ─────────────────────────────────────────────────

export type RunEffect =
  | { kind: 'scrap'; amount: number }
  | { kind: 'hp'; amount: number }
  | { kind: 'glue'; amount: number }
  | { kind: 'relic'; relicId: string }
  | { kind: 'randomRelic' }
  | { kind: 'startBlock'; amount: number }
  | { kind: 'startStatus'; status: StatusId; amount: number }
  | { kind: 'damagePart'; slot: PartSlot | 'random' }
  | { kind: 'repairAllParts' }
  | { kind: 'shopDiscount'; amount: number }
  | { kind: 'forceEncounter'; encounterId: string };

export interface EventOptionDef {
  id: string;
  title: string;
  /**
   * Flavour only, and optional. The numbers come from `effects` via
   * `effectLabel`, so an option must never restate them here — that is two
   * sources for one fact, which is how v0.8's intent text drifted from its
   * arithmetic. Use this for what the effect list cannot say.
   */
  desc?: string;
  effects: RunEffect[];
  /** Hidden unless the run satisfies this. */
  requires?: { minScrap?: number; hasRelic?: string };
}

export interface EventDef {
  id: string;
  title: string;
  text: string;
  artAssetId: string;
  options: EventOptionDef[];
}

export type ShopItemKind = 'relic' | 'service' | 'part';

export interface ShopItemDef {
  id: string;
  kind: ShopItemKind;
  cost: number;
  /** relic id, part id, or a service id. */
  ref: string;
  name?: string;
  /** Flavour only — see `EventOptionDef.desc`. Numbers come from `effects`. */
  desc?: string;
  effects?: RunEffect[];
}

export type NodeType = 'combat' | 'event' | 'shop' | 'elite' | 'boss';

export interface RouteNodeDef {
  type: NodeType;
  encounterId?: string;
  eventId?: string;
  shopId?: string;
  label: string;
}

export interface RouteDef {
  id: string;
  name: string;
  desc: string;
  /** Shown on the route picker so the two routes read as real choices. */
  profile: {
    risk: 'low' | 'medium' | 'high';
    scrap: 'low' | 'medium' | 'high';
    recovery: 'scarce' | 'normal' | 'generous';
    notes: string;
  };
  nodes: RouteNodeDef[];
}

export interface ShopDef {
  id: string;
  name: string;
  desc: string;
  artAssetId: string;
  pool: ShopItemDef[];
  offerCount: number;
}
