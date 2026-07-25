/**
 * Run-level rules: creating a run, applying `RunEffect[]`, shop rolls and
 * purchases, battle rewards and carry-over.
 *
 * All of this lived inside DOM callbacks in v0.8 (`finishBattle` mutated
 * `state.run.scrap` while writing innerHTML), which made none of it testable.
 * Here every function is `(run, ...) => RunState`.
 */

import { BALANCE } from '../data/balance';
import { ENCOUNTERS } from '../data/enemies';
import { EVENTS } from '../data/events';
import { PARTS, DEFAULT_LOADOUT } from '../data/parts';
import { RELICS, RELIC_IDS } from '../data/relics';
import { ROUTES } from '../data/routes';
import { SHOPS } from '../data/shops';
import type { EncounterDef, PartSlot, RouteNodeDef, RunEffect, ShopItemDef } from '../data/types';
import { computeBuild, createAssembly } from '../systems/assemblySystem';
import { SAVE_VERSION, type RunState } from '../state/runState';
import { rngInt, rngPick, rngSample, type Rng } from './rng';

function rngFor(run: RunState): Rng {
  return { state: run.rngState };
}

function clone(run: RunState): RunState {
  return structuredClone(run);
}

// ─── lifecycle ───────────────────────────────────────────────────────────────

export function createRun(routeId: string, seed: number, loadout = DEFAULT_LOADOUT): RunState {
  const assembly = createAssembly(loadout);
  const build = computeBuild(assembly, {});
  return {
    version: SAVE_VERSION,
    seed,
    rngState: (seed >>> 0) || 0x9e3779b9,
    routeId,
    nodeIndex: 0,
    assembly,
    relics: [],
    scrap: BALANCE.run.startingScrap,
    carry: { hp: build.maxHp, glue: build.maxGlue, startBlock: 0, startStatuses: {} },
    shopOffers: null,
    shopPurchased: [],
    shopDiscount: 0,
    pendingEncounterId: null,
    damagedSlots: [],
    history: [],
    status: 'active',
    turnsTaken: 0,
    battlesWon: 0,
  };
}

export function currentRoute(run: RunState) {
  return ROUTES[run.routeId] ?? ROUTES[Object.keys(ROUTES)[0]];
}

export function currentNode(run: RunState): RouteNodeDef | null {
  return currentRoute(run).nodes[run.nodeIndex] ?? null;
}

export function isFinalNode(run: RunState): boolean {
  return run.nodeIndex >= currentRoute(run).nodes.length - 1;
}

/** Encounter for the current node, honouring an event-forced fight. */
export function currentEncounter(run: RunState): EncounterDef | null {
  if (run.pendingEncounterId) return ENCOUNTERS[run.pendingEncounterId] ?? null;
  const node = currentNode(run);
  if (!node?.encounterId) return null;
  return ENCOUNTERS[node.encounterId] ?? null;
}

/** Clamp carry values against the build the player currently has assembled. */
export function normaliseCarry(run: RunState): RunState {
  const next = clone(run);
  const build = computeBuild(next.assembly, { relics: next.relics });
  next.carry.hp = Math.max(BALANCE.run.minCarryHp, Math.min(build.maxHp, next.carry.hp));
  next.carry.glue = Math.max(0, Math.min(build.maxGlue, next.carry.glue));
  return next;
}

// ─── run effects ─────────────────────────────────────────────────────────────

export function applyRunEffects(run: RunState, effects: readonly RunEffect[]): RunState {
  let next = clone(run);
  const rng = rngFor(next);

  for (const effect of effects) {
    switch (effect.kind) {
      case 'scrap':
        next.scrap = Math.max(0, next.scrap + effect.amount);
        break;
      case 'hp':
        next.carry.hp += effect.amount;
        break;
      case 'glue':
        next.carry.glue += effect.amount;
        break;
      case 'relic':
        if (!next.relics.includes(effect.relicId)) next.relics.push(effect.relicId);
        break;
      case 'randomRelic': {
        const pool = RELIC_IDS.filter((id) => !next.relics.includes(id));
        if (pool.length) next.relics.push(rngPick(rng, pool));
        break;
      }
      case 'startBlock':
        next.carry.startBlock += effect.amount;
        break;
      case 'startStatus':
        next.carry.startStatuses[effect.status] = (next.carry.startStatuses[effect.status] ?? 0) + effect.amount;
        break;
      case 'damagePart': {
        const equipped = (Object.keys(next.assembly.slots) as PartSlot[]).filter(
          (s) => next.assembly.slots[s] && !next.damagedSlots.includes(s),
        );
        if (equipped.length) {
          const slot = effect.slot === 'random' ? equipped[rngInt(rng, equipped.length)] : effect.slot;
          if (equipped.includes(slot)) next.damagedSlots.push(slot);
        }
        break;
      }
      case 'repairAllParts':
        next.damagedSlots = [];
        break;
      case 'shopDiscount':
        next.shopDiscount += effect.amount;
        break;
      case 'forceEncounter':
        next.pendingEncounterId = effect.encounterId;
        break;
    }
  }

  next.rngState = rng.state;
  next = normaliseCarry(next);
  return next;
}

// ─── events ──────────────────────────────────────────────────────────────────

export function eventOptionAvailable(run: RunState, eventId: string, optionId: string): boolean {
  const opt = EVENTS[eventId]?.options.find((o) => o.id === optionId);
  if (!opt) return false;
  if (opt.requires?.minScrap !== undefined && run.scrap < opt.requires.minScrap) return false;
  if (opt.requires?.hasRelic && !run.relics.includes(opt.requires.hasRelic)) return false;
  return true;
}

export function chooseEventOption(run: RunState, eventId: string, optionId: string): RunState {
  const event = EVENTS[eventId];
  const option = event?.options.find((o) => o.id === optionId);
  if (!option || !eventOptionAvailable(run, eventId, optionId)) return run;

  const next = applyRunEffects(run, option.effects);
  next.history.push({
    index: next.nodeIndex,
    type: 'event',
    label: event.title,
    outcome: 'resolved',
    detail: option.title,
  });
  return next;
}

// ─── shop ────────────────────────────────────────────────────────────────────

export function rollShop(run: RunState, shopId: string): RunState {
  const shop = SHOPS[shopId];
  if (!shop) return run;
  const next = clone(run);
  const rng = rngFor(next);

  const pool = shop.pool.filter((item) => {
    if (item.kind === 'relic') return !next.relics.includes(item.ref);
    if (item.kind === 'part') {
      // never offer a part the player already has equipped
      return !Object.values(next.assembly.slots).includes(item.ref);
    }
    return true;
  });

  // guarantee at least one service so a broke player still has something useful
  const services = pool.filter((i) => i.kind === 'service');
  const rest = pool.filter((i) => i.kind !== 'service');
  const picked = [
    ...(services.length ? [rngPick(rng, services)] : []),
    ...rngSample(rng, rest, Math.max(0, shop.offerCount - 1)),
  ];

  next.shopOffers = picked.map((i) => i.id);
  next.shopPurchased = [];
  next.rngState = rng.state;
  return next;
}

export function shopItemCost(run: RunState, item: ShopItemDef): number {
  return Math.max(1, item.cost - run.shopDiscount);
}

export function canAfford(run: RunState, shopId: string, itemId: string): boolean {
  const item = SHOPS[shopId]?.pool.find((i) => i.id === itemId);
  if (!item) return false;
  if (run.shopPurchased.includes(itemId)) return false;
  return run.scrap >= shopItemCost(run, item);
}

export function purchase(run: RunState, shopId: string, itemId: string): RunState {
  const item = SHOPS[shopId]?.pool.find((i) => i.id === itemId);
  if (!item || !canAfford(run, shopId, itemId)) return run;

  let next = clone(run);
  next.scrap -= shopItemCost(next, item);
  next.shopPurchased.push(itemId);

  if (item.kind === 'relic') {
    if (!next.relics.includes(item.ref)) next.relics.push(item.ref);
  } else if (item.kind === 'part') {
    const part = PARTS[item.ref];
    if (part) {
      next.assembly.slots[part.slot] = part.id;
      // a fresh part arrives intact
      next.damagedSlots = next.damagedSlots.filter((s) => s !== part.slot);
    }
  } else if (item.effects) {
    next = applyRunEffects(next, item.effects);
  }

  return normaliseCarry(next);
}

export function shopOfferItems(run: RunState, shopId: string): ShopItemDef[] {
  const shop = SHOPS[shopId];
  if (!shop || !run.shopOffers) return [];
  return run.shopOffers.map((id) => shop.pool.find((i) => i.id === id)).filter((i): i is ShopItemDef => !!i);
}

/** Human-readable name/desc for any shop item, resolving relic and part refs. */
export function describeShopItem(item: ShopItemDef): { name: string; desc: string } {
  if (item.kind === 'relic') {
    const relic = RELICS[item.ref];
    return { name: relic?.name ?? item.ref, desc: relic?.desc ?? '' };
  }
  if (item.kind === 'part') {
    const part = PARTS[item.ref];
    return { name: part?.name ?? item.ref, desc: `${part?.slot ?? ''} 슬롯 · ${part?.desc ?? ''}` };
  }
  return { name: item.name ?? item.ref, desc: item.desc ?? '' };
}

// ─── battle rewards & progression ────────────────────────────────────────────

export interface BattleOutcomeSummary {
  cleared: boolean;
  hp: number;
  glue: number;
  turns: number;
  peelCount: number;
  scrapGained: number;
  encounterName: string;
}

export function applyBattleResult(
  run: RunState,
  result: { cleared: boolean; hp: number; glue: number; turns: number; peelCount: number; encounterId: string },
): { run: RunState; summary: BattleOutcomeSummary } {
  let next = clone(run);
  const encounter = ENCOUNTERS[result.encounterId];
  const node = currentNode(next);

  next.carry.hp = result.hp;
  next.carry.glue = result.glue;
  next.carry.startBlock = 0;
  next.carry.startStatuses = {};
  next.pendingEncounterId = null;
  next.turnsTaken += result.turns;

  let scrapGained = 0;
  if (result.cleared) {
    scrapGained = encounter?.scrapReward ?? BALANCE.run.scrap.combat;
    next.scrap += scrapGained;
    next.battlesWon += 1;
    // Breather between fights. Proportional to the build's own maximum, so a
    // tanky beast is not punished for having a bigger bar to refill.
    const build = computeBuild(next.assembly, { relics: next.relics });
    next.carry.hp += BALANCE.run.carryHpRefund + Math.round(build.maxHp * BALANCE.run.carryHpRefundRatio);
    next.carry.glue += BALANCE.run.carryGlueRefund + Math.round(build.maxGlue * BALANCE.run.carryGlueRefundRatio);
    next.damagedSlots = [];
    next.history.push({
      index: next.nodeIndex,
      type: node?.type ?? 'combat',
      label: encounter?.name ?? result.encounterId,
      outcome: 'cleared',
      detail: `${result.turns}턴 · 박리 ${result.peelCount}회 · Scrap +${scrapGained}`,
    });
  } else {
    next.status = 'lost';
    next.history.push({
      index: next.nodeIndex,
      type: node?.type ?? 'combat',
      label: encounter?.name ?? result.encounterId,
      outcome: 'failed',
      detail: `${result.turns}턴에서 무너졌다`,
    });
  }

  next = normaliseCarry(next);
  return {
    run: next,
    summary: {
      cleared: result.cleared,
      hp: next.carry.hp,
      glue: next.carry.glue,
      turns: result.turns,
      peelCount: result.peelCount,
      scrapGained,
      encounterName: encounter?.name ?? result.encounterId,
    },
  };
}

export function advanceNode(run: RunState): RunState {
  const next = clone(run);
  if (isFinalNode(next)) {
    next.status = 'won';
    return next;
  }
  next.nodeIndex += 1;
  next.shopOffers = null;
  next.shopPurchased = [];
  next.pendingEncounterId = null;
  return normaliseCarry(next);
}

/** Swap a part in the workshop. Rejected while a battle is live (see App). */
export function equipPart(run: RunState, slot: PartSlot, partId: string | null): RunState {
  const next = clone(run);
  next.assembly.slots[slot] = partId;
  next.damagedSlots = next.damagedSlots.filter((s) => s !== slot);
  return normaliseCarry(next);
}
