/**
 * Build computation.
 *
 * `computeBuild` is the single place where "which parts are attached" becomes
 * "what are my numbers, skills, passives and synergies". The battle engine calls
 * it on every peel and reattach, so a peeled part loses its stats, its active
 * skill, its passive rules AND any synergy it was half of — all in one step.
 */

import { BODIES, PARTS, DEFAULT_BODY_ID } from '../data/parts';
import { SYNERGIES } from '../data/synergies';
import { RELICS } from '../data/relics';
import type { BodyDef, BuildModifiers, PartDef, PartSlot, PassiveRule, SkillDef, SynergyDef } from '../data/types';

export interface AssemblyState {
  bodyId: string;
  /** slot → part id, or null for an empty slot. */
  slots: Record<PartSlot, string | null>;
}

export interface BuildSkill {
  slot: PartSlot;
  partId: string;
  partName: string;
  skill: SkillDef;
}

export interface BuildPassive {
  slot: PartSlot;
  partId: string;
  partName: string;
  title: string;
  desc: string;
}

export interface BuildSummary {
  bodyId: string;
  maxHp: number;
  maxGlue: number;
  atk: number;
  spd: number;
  peelResist: number;
  cooldownStart: number;
  skills: BuildSkill[];
  passives: BuildPassive[];
  /** Aggregated from active parts + active synergies + relics. */
  rules: PassiveRule[];
  activeSynergies: SynergyDef[];
  /** Owned in the loadout but currently broken because a required part is peeled. */
  brokenSynergies: SynergyDef[];
}

export interface BuildContext {
  /** Slots currently peeled off; they contribute nothing. */
  peeled?: ReadonlySet<PartSlot>;
  relics?: readonly string[];
}

export function createAssembly(slots: Partial<Record<PartSlot, string | null>> = {}, bodyId = DEFAULT_BODY_ID): AssemblyState {
  return {
    bodyId,
    slots: {
      head: slots.head ?? null,
      hand: slots.hand ?? null,
      core: slots.core ?? null,
      trinket: slots.trinket ?? null,
    },
  };
}

export function getBody(assembly: AssemblyState): BodyDef {
  return BODIES[assembly.bodyId] ?? BODIES[DEFAULT_BODY_ID];
}

export function getPart(assembly: AssemblyState, slot: PartSlot): PartDef | null {
  const id = assembly.slots[slot];
  return id ? PARTS[id] ?? null : null;
}

/** Parts that count right now: equipped, known, and not peeled. */
export function activeParts(assembly: AssemblyState, peeled?: ReadonlySet<PartSlot>): PartDef[] {
  const out: PartDef[] = [];
  for (const slot of getBody(assembly).slots) {
    if (peeled?.has(slot)) continue;
    const part = getPart(assembly, slot);
    if (part) out.push(part);
  }
  return out;
}

function addModifiers(target: Record<string, number>, mods: BuildModifiers | undefined): void {
  if (!mods) return;
  for (const [k, v] of Object.entries(mods)) {
    if (typeof v === 'number') target[k] = (target[k] ?? 0) + v;
  }
}

export function computeBuild(assembly: AssemblyState, ctx: BuildContext = {}): BuildSummary {
  const body = getBody(assembly);
  const peeled = ctx.peeled ?? new Set<PartSlot>();
  const relicIds = ctx.relics ?? [];

  const totals: Record<string, number> = {
    hp: body.base.hp,
    glue: body.base.glue,
    atk: body.base.atk,
    spd: body.base.spd,
    peelResist: body.base.peelResist,
    cooldownStart: 0,
  };

  const skills: BuildSkill[] = [];
  const passives: BuildPassive[] = [];
  const rules: PassiveRule[] = [];

  for (const slot of body.slots) {
    const part = getPart(assembly, slot);
    if (!part || peeled.has(slot)) continue;
    addModifiers(totals, part.stats);
    addModifiers(totals, part.passive.modifiers);
    skills.push({ slot, partId: part.id, partName: part.name, skill: part.active });
    passives.push({ slot, partId: part.id, partName: part.name, title: part.passive.title, desc: part.passive.desc });
    if (part.passive.rules) rules.push(...part.passive.rules);
  }

  // synergies: equipped decides ownership, peeled decides activation
  const equipped = new Set(Object.values(assembly.slots).filter(Boolean) as string[]);
  const attached = new Set(activeParts(assembly, peeled).map((p) => p.id));
  const activeSynergies: SynergyDef[] = [];
  const brokenSynergies: SynergyDef[] = [];

  for (const syn of Object.values(SYNERGIES)) {
    const owned = syn.requires.every((r) => equipped.has(r));
    if (!owned) continue;
    if (syn.requires.every((r) => attached.has(r))) {
      activeSynergies.push(syn);
      addModifiers(totals, syn.modifiers);
      if (syn.rules) rules.push(...syn.rules);
    } else {
      brokenSynergies.push(syn);
    }
  }

  // relics are run-level: peeling never disables them
  for (const id of relicIds) {
    const relic = RELICS[id];
    if (!relic) continue;
    addModifiers(totals, relic.modifiers);
  }

  return {
    bodyId: body.id,
    maxHp: Math.max(1, Math.round(totals.hp)),
    maxGlue: Math.max(0, Math.round(totals.glue)),
    atk: Math.max(0, Math.round(totals.atk)),
    spd: Math.round(totals.spd),
    peelResist: Math.round(totals.peelResist),
    cooldownStart: Math.max(0, Math.round(totals.cooldownStart)),
    skills,
    passives,
    rules,
    activeSynergies,
    brokenSynergies,
  };
}

/** Difference between two builds, for the workshop's before/after strip. */
export interface BuildDelta {
  maxHp: number;
  maxGlue: number;
  atk: number;
  spd: number;
  peelResist: number;
  gainedSkills: string[];
  lostSkills: string[];
  gainedSynergies: string[];
  lostSynergies: string[];
}

export function diffBuilds(before: BuildSummary, after: BuildSummary): BuildDelta {
  const beforeSkills = new Set(before.skills.map((s) => s.skill.name));
  const afterSkills = new Set(after.skills.map((s) => s.skill.name));
  const beforeSyn = new Set(before.activeSynergies.map((s) => s.name));
  const afterSyn = new Set(after.activeSynergies.map((s) => s.name));

  return {
    maxHp: after.maxHp - before.maxHp,
    maxGlue: after.maxGlue - before.maxGlue,
    atk: after.atk - before.atk,
    spd: after.spd - before.spd,
    peelResist: after.peelResist - before.peelResist,
    gainedSkills: [...afterSkills].filter((s) => !beforeSkills.has(s)),
    lostSkills: [...beforeSkills].filter((s) => !afterSkills.has(s)),
    gainedSynergies: [...afterSyn].filter((s) => !beforeSyn.has(s)),
    lostSynergies: [...beforeSyn].filter((s) => !afterSyn.has(s)),
  };
}

/**
 * Can this part go in this slot on this body? Reported in the workshop so an
 * incompatible pick is explained rather than silently ignored.
 */
export function compatibility(assembly: AssemblyState, partId: string): { ok: boolean; reason?: string } {
  const part = PARTS[partId];
  if (!part) return { ok: false, reason: '알 수 없는 파츠' };
  const body = getBody(assembly);
  if (!body.slots.includes(part.slot)) return { ok: false, reason: `${body.name}에는 ${part.slot} 슬롯이 없다` };
  return { ok: true };
}
