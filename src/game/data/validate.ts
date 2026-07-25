/**
 * Runtime content validation.
 *
 * A hand-written validator rather than Zod: the checks that actually matter here
 * are cross-references (does this part id exist? does this asset id exist? does
 * this intent appear in some enemy's move pool?), which a schema library does not
 * give you for free. Zero runtime dependency, and it runs in the test suite so
 * broken content fails CI rather than the browser.
 */

import { ASSET_CATALOG } from '@/assets/assetCatalog';
import { validateCatalog } from '@/assets/assetLoader';
import { BODIES, PARTS } from './parts';
import { SYNERGIES } from './synergies';
import { INTENTS } from './intents';
import { ENCOUNTERS } from './enemies';
import { RELICS } from './relics';
import { EVENTS } from './events';
import { SHOPS } from './shops';
import { ROUTES } from './routes';
import { STATUSES } from './statuses';
import type { Effect, RunEffect } from './types';

export interface ContentIssue {
  where: string;
  level: 'error' | 'warning';
  message: string;
}

const assetExists = (id: string) => Object.prototype.hasOwnProperty.call(ASSET_CATALOG, id);

function checkEffects(where: string, effects: Effect[], issues: ContentIssue[]): void {
  for (const [i, e] of effects.entries()) {
    const at = `${where}.effects[${i}]`;
    if ('status' in e && e.status && !STATUSES[e.status]) {
      issues.push({ where: at, level: 'error', message: `unknown status "${e.status}"` });
    }
    if (e.kind === 'damage' && e.amount < 0) {
      issues.push({ where: at, level: 'error', message: 'damage amount must be >= 0' });
    }
    if (e.kind === 'damage' && e.bonus && 'status' in e.bonus.when && !STATUSES[e.bonus.when.status]) {
      issues.push({ where: at, level: 'error', message: `unknown status in bonus condition` });
    }
    if (e.kind === 'peel' && e.slots !== 'any') {
      for (const s of e.slots) {
        if (!['head', 'hand', 'core', 'trinket'].includes(s)) {
          issues.push({ where: at, level: 'error', message: `unknown slot "${s}"` });
        }
      }
    }
  }
}

function checkRunEffects(where: string, effects: RunEffect[], issues: ContentIssue[]): void {
  for (const [i, e] of effects.entries()) {
    const at = `${where}[${i}]`;
    if (e.kind === 'relic' && !RELICS[e.relicId]) {
      issues.push({ where: at, level: 'error', message: `unknown relic "${e.relicId}"` });
    }
    if (e.kind === 'startStatus' && !STATUSES[e.status]) {
      issues.push({ where: at, level: 'error', message: `unknown status "${e.status}"` });
    }
    if (e.kind === 'forceEncounter' && !ENCOUNTERS[e.encounterId]) {
      issues.push({ where: at, level: 'error', message: `unknown encounter "${e.encounterId}"` });
    }
  }
}

export function validateContent(): ContentIssue[] {
  const issues: ContentIssue[] = [];

  // asset catalog integrity first — everything else references it
  for (const ci of validateCatalog()) {
    issues.push({ where: `asset:${ci.id}`, level: ci.level, message: ci.message });
  }

  // bodies
  for (const [id, body] of Object.entries(BODIES)) {
    if (!assetExists(body.assetId)) issues.push({ where: `body:${id}`, level: 'error', message: `missing asset "${body.assetId}"` });
    const entry = ASSET_CATALOG[body.assetId];
    if (entry && !entry.attach) issues.push({ where: `body:${id}`, level: 'error', message: 'body asset has no attach points' });
    for (const slot of body.slots) {
      if (entry?.attach && !entry.attach[slot]) {
        issues.push({ where: `body:${id}`, level: 'error', message: `asset has no attach point for slot "${slot}"` });
      }
    }
  }

  // parts
  const skillIds = new Set<string>();
  for (const [id, part] of Object.entries(PARTS)) {
    if (part.id !== id) issues.push({ where: `part:${id}`, level: 'error', message: 'id does not match key' });
    if (!assetExists(part.assetId)) issues.push({ where: `part:${id}`, level: 'error', message: `missing asset "${part.assetId}"` });
    const entry = ASSET_CATALOG[part.assetId];
    if (entry && entry.slot !== part.slot) {
      issues.push({ where: `part:${id}`, level: 'error', message: `asset slot "${entry.slot}" != part slot "${part.slot}"` });
    }
    if (entry && entry.category !== 'part') {
      issues.push({ where: `part:${id}`, level: 'error', message: `asset category must be "part", got "${entry.category}"` });
    }
    if (skillIds.has(part.active.id)) {
      issues.push({ where: `part:${id}`, level: 'error', message: `duplicate skill id "${part.active.id}"` });
    }
    skillIds.add(part.active.id);
    if (!assetExists(part.active.iconAssetId)) {
      issues.push({ where: `part:${id}.active`, level: 'error', message: `missing icon asset "${part.active.iconAssetId}"` });
    }
    if (part.active.cooldown < 0) issues.push({ where: `part:${id}.active`, level: 'error', message: 'cooldown must be >= 0' });
    checkEffects(`part:${id}.active`, part.active.effects, issues);
    for (const rule of part.passive.rules ?? []) {
      if ('status' in rule && rule.status && !STATUSES[rule.status]) {
        issues.push({ where: `part:${id}.passive`, level: 'error', message: `unknown status "${rule.status}"` });
      }
    }
  }

  // synergies
  for (const [id, syn] of Object.entries(SYNERGIES)) {
    for (const req of syn.requires) {
      if (!PARTS[req]) issues.push({ where: `synergy:${id}`, level: 'error', message: `unknown part "${req}"` });
    }
    if (syn.requires.length < 2) issues.push({ where: `synergy:${id}`, level: 'warning', message: 'synergy with fewer than 2 requirements' });
    const slots = syn.requires.map((r) => PARTS[r]?.slot).filter(Boolean);
    if (new Set(slots).size !== slots.length) {
      issues.push({ where: `synergy:${id}`, level: 'error', message: 'requires two parts in the same slot, can never activate' });
    }
  }

  // intents
  for (const [id, intent] of Object.entries(INTENTS)) {
    if (intent.id !== id) issues.push({ where: `intent:${id}`, level: 'error', message: 'id does not match key' });
    if (!assetExists(intent.iconAssetId)) issues.push({ where: `intent:${id}`, level: 'error', message: `missing icon asset "${intent.iconAssetId}"` });
    checkEffects(`intent:${id}`, intent.effects, issues);
    if (intent.piercing && intent.blockable) {
      issues.push({ where: `intent:${id}`, level: 'error', message: 'cannot be both piercing and blockable' });
    }
  }

  // encounters
  const usedIntents = new Set<string>();
  for (const [id, enc] of Object.entries(ENCOUNTERS)) {
    if (enc.id !== id) issues.push({ where: `encounter:${id}`, level: 'error', message: 'id does not match key' });
    if (!assetExists(enc.backgroundAssetId)) {
      issues.push({ where: `encounter:${id}`, level: 'error', message: `missing background asset "${enc.backgroundAssetId}"` });
    }
    if (enc.phases.length === 0) issues.push({ where: `encounter:${id}`, level: 'error', message: 'no phases' });
    for (const [pi, phase] of enc.phases.entries()) {
      const at = `encounter:${id}.phases[${pi}]`;
      if (!assetExists(phase.assetId)) issues.push({ where: at, level: 'error', message: `missing asset "${phase.assetId}"` });
      if (phase.maxHp <= 0) issues.push({ where: at, level: 'error', message: 'maxHp must be > 0' });
      if (phase.moves.length === 0) issues.push({ where: at, level: 'error', message: 'empty move pool' });
      for (const m of phase.moves) {
        if (!INTENTS[m]) issues.push({ where: at, level: 'error', message: `unknown intent "${m}"` });
        usedIntents.add(m);
      }
      if (phase.desperation) {
        if (!INTENTS[phase.desperation.moveId]) {
          issues.push({ where: at, level: 'error', message: `unknown desperation intent "${phase.desperation.moveId}"` });
        }
        usedIntents.add(phase.desperation.moveId);
      }
    }
  }
  for (const id of Object.keys(INTENTS)) {
    if (!usedIntents.has(id)) issues.push({ where: `intent:${id}`, level: 'warning', message: 'not referenced by any encounter' });
  }

  // relics
  for (const [id, relic] of Object.entries(RELICS)) {
    if (relic.id !== id) issues.push({ where: `relic:${id}`, level: 'error', message: 'id does not match key' });
    for (const rule of relic.rules ?? []) {
      if ('status' in rule && rule.status && !STATUSES[rule.status]) {
        issues.push({ where: `relic:${id}`, level: 'error', message: `unknown status "${rule.status}"` });
      }
    }
  }

  // events
  for (const [id, ev] of Object.entries(EVENTS)) {
    if (ev.id !== id) issues.push({ where: `event:${id}`, level: 'error', message: 'id does not match key' });
    if (!assetExists(ev.artAssetId)) issues.push({ where: `event:${id}`, level: 'error', message: `missing art asset "${ev.artAssetId}"` });
    if (ev.options.length < 2) issues.push({ where: `event:${id}`, level: 'warning', message: 'fewer than 2 options' });
    for (const opt of ev.options) {
      checkRunEffects(`event:${id}.${opt.id}`, opt.effects, issues);
      if (opt.requires?.hasRelic && !RELICS[opt.requires.hasRelic]) {
        issues.push({ where: `event:${id}.${opt.id}`, level: 'error', message: `unknown relic requirement` });
      }
    }
  }

  // shops
  for (const [id, shop] of Object.entries(SHOPS)) {
    if (!assetExists(shop.artAssetId)) issues.push({ where: `shop:${id}`, level: 'error', message: `missing art asset "${shop.artAssetId}"` });
    if (shop.pool.length < shop.offerCount) {
      issues.push({ where: `shop:${id}`, level: 'error', message: 'pool smaller than offerCount' });
    }
    for (const item of shop.pool) {
      const at = `shop:${id}.${item.id}`;
      if (item.cost <= 0) issues.push({ where: at, level: 'error', message: 'cost must be > 0' });
      if (item.kind === 'relic' && !RELICS[item.ref]) issues.push({ where: at, level: 'error', message: `unknown relic "${item.ref}"` });
      if (item.kind === 'part' && !PARTS[item.ref]) issues.push({ where: at, level: 'error', message: `unknown part "${item.ref}"` });
      if (item.kind === 'service') {
        if (!item.effects?.length) issues.push({ where: at, level: 'error', message: 'service with no effects' });
        else checkRunEffects(at, item.effects, issues);
      }
    }
  }

  // routes
  for (const [id, route] of Object.entries(ROUTES)) {
    if (route.id !== id) issues.push({ where: `route:${id}`, level: 'error', message: 'id does not match key' });
    if (route.nodes.length < 3) issues.push({ where: `route:${id}`, level: 'warning', message: 'very short route' });
    const last = route.nodes[route.nodes.length - 1];
    if (last.type !== 'boss') issues.push({ where: `route:${id}`, level: 'error', message: 'route must end on a boss node' });
    for (const [ni, node] of route.nodes.entries()) {
      const at = `route:${id}.nodes[${ni}]`;
      if (node.type === 'event') {
        if (!node.eventId || !EVENTS[node.eventId]) issues.push({ where: at, level: 'error', message: `unknown event "${node.eventId}"` });
      } else if (node.type === 'shop') {
        if (!node.shopId || !SHOPS[node.shopId]) issues.push({ where: at, level: 'error', message: `unknown shop "${node.shopId}"` });
      } else {
        if (!node.encounterId || !ENCOUNTERS[node.encounterId]) {
          issues.push({ where: at, level: 'error', message: `unknown encounter "${node.encounterId}"` });
        } else {
          const enc = ENCOUNTERS[node.encounterId];
          const expected = node.type === 'boss' ? 'boss' : node.type === 'elite' ? 'elite' : 'combat';
          if (enc.kind !== expected) {
            issues.push({ where: at, level: 'error', message: `node type "${node.type}" uses a "${enc.kind}" encounter` });
          }
        }
      }
    }
  }

  return issues;
}

export function assertContentValid(): void {
  const errors = validateContent().filter((i) => i.level === 'error');
  if (errors.length) {
    throw new Error(`content validation failed:\n${errors.map((e) => `  ${e.where}: ${e.message}`).join('\n')}`);
  }
}
