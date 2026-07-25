#!/usr/bin/env node
/**
 * Balance simulation.
 *
 * Plays whole runs headlessly with a scripted policy and reports win rates,
 * fight length, peel pressure and where runs die. This is only possible because
 * the engine is deterministic and free of DOM dependencies — the v0.8 build
 * could do neither.
 *
 *   node scripts/simulate.mjs                       # every build x every route
 *   node scripts/simulate.mjs --runs 200            # more samples
 *   node scripts/simulate.mjs --route stitch        # one route
 *   node scripts/simulate.mjs --loadout toast,scissors,tape,ribbon
 *   node scripts/simulate.mjs --encounters          # per-encounter breakdown
 *
 * The policy is a competent-but-not-optimal player: reattach when hurt, spend a
 * ready skill, otherwise attack; guard when the incoming intent is dangerous.
 * Absolute win rates are therefore pessimistic — the useful signal is the
 * SPREAD between builds and between routes.
 */
import {
  createBattle,
  resolveEnemyIntent,
  resolvePlayerAction,
  resolveSkill,
  skillAvailability,
} from '../src/game/engine/battleEngine.ts';
import { peeledSlots } from '../src/game/engine/peelResolver.ts';
import { describeIntent } from '../src/game/engine/describe.ts';
import {
  advanceNode,
  applyBattleResult,
  chooseEventOption,
  createRun,
  currentEncounter,
  currentNode,
  isFinalNode,
  purchase,
  rollShop,
  shopOfferItems,
} from '../src/game/engine/rewardResolver.ts';
import { PARTS } from '../src/game/data/parts.ts';
import { ROUTES } from '../src/game/data/routes.ts';
import { EVENTS } from '../src/game/data/events.ts';

// ─── args ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const RUNS = Number(arg('runs', 60));
const ONLY_ROUTE = arg('route', null);
const ONLY_LOADOUT = arg('loadout', null);
const PER_ENCOUNTER = argv.includes('--encounters');

// ─── loadouts under test ─────────────────────────────────────────────────────

const short = (id) => id.split('.').pop();
const build = (head, hand, core, trinket) => ({
  head: `part.head.${head}`,
  hand: `part.hand.${hand}`,
  core: `part.core.${core}`,
  trinket: `part.trinket.${trinket}`,
});

/** Named archetypes rather than the full 81-way cross product. */
const LOADOUTS = {
  'toast/scissors/tape/ribbon': build('toast_helm', 'scissors', 'tape_roll', 'ribbon_knot'),
  'toast/scissors/coffee/eye': build('toast_helm', 'scissors', 'coffee_cup', 'eye_sticker'),
  'toast/scissors/bomb/ribbon': build('toast_helm', 'scissors', 'bomb_belly', 'ribbon_knot'),
  'box/umbrella/tape/patch': build('box_shell', 'umbrella_hook', 'tape_roll', 'bread_patch'),
  'box/spear/tape/patch': build('box_shell', 'pencil_spear', 'tape_roll', 'bread_patch'),
  'ghost/spear/coffee/eye': build('ghost_hood', 'pencil_spear', 'coffee_cup', 'eye_sticker'),
  'ghost/scissors/coffee/ribbon': build('ghost_hood', 'scissors', 'coffee_cup', 'ribbon_knot'),
  'toast/umbrella/tape/patch': build('toast_helm', 'umbrella_hook', 'tape_roll', 'bread_patch'),
  'box/scissors/bomb/eye': build('box_shell', 'scissors', 'bomb_belly', 'eye_sticker'),
};

// ─── policy ──────────────────────────────────────────────────────────────────

const SLOT_ORDER = ['hand', 'core', 'head', 'trinket'];

/** How much damage the next intent threatens, so Guard can be timed. */
function incomingThreat(b) {
  const next = b.enemy.intents[0];
  if (!next) return 0;
  const p = describeIntent(b, next, true);
  return (p.damage ?? 0) + (p.peelTargets ? 6 : 0);
}

function playBattle(state, maxTurns = 120) {
  let b = state;
  let guard = 0;
  while (b.outcome === 'ongoing' && guard++ < maxTurns) {
    if (b.side !== 'player') {
      b = resolveEnemyIntent(b);
      continue;
    }

    const hpRatio = b.player.hp / Math.max(1, b.player.maxHp);
    const threat = incomingThreat(b);
    const peeled = peeledSlots(b).length;

    // 1. reattach when the build is coming apart and we can afford to
    if (peeled >= 2 || (peeled >= 1 && hpRatio < 0.55)) {
      const patcher = SLOT_ORDER.find(
        (s) => skillAvailability(b, s).enabled && ['patchLoop', 'mendingPatch'].includes(partSkillId(b, s)),
      );
      b = patcher ? resolveSkill(b, patcher) : resolvePlayerAction(b, 'repair');
      continue;
    }
    // 2. block a dangerous incoming hit when low
    if (threat >= b.player.hp * 0.45 || (threat >= 6 && hpRatio < 0.4)) {
      b = resolvePlayerAction(b, 'guard');
      continue;
    }
    // 3. top up glue rather than sitting at zero and tearing a part off
    if (b.player.glue <= 2) {
      b = resolvePlayerAction(b, b.player.hp < b.player.maxHp * 0.7 ? 'repair' : 'press');
      continue;
    }
    // 4. spend a ready skill, else swing
    const ready = SLOT_ORDER.find((s) => skillAvailability(b, s).enabled);
    b = ready ? resolveSkill(b, ready) : resolvePlayerAction(b, 'attack');
  }
  return b;
}

function partSkillId(b, slot) {
  const id = b.player.slots[slot].partId;
  return id ? PARTS[id]?.active.id ?? '' : '';
}

/** Pick the option that does not start a fight, so the walk stays comparable. */
function safeOption(eventId) {
  const ev = EVENTS[eventId];
  const risky = new Set(['forceEncounter']);
  const ok = ev.options.find((o) => !o.effects.some((e) => risky.has(e.kind)));
  return (ok ?? ev.options[0]).id;
}

// ─── one run ─────────────────────────────────────────────────────────────────

function playRun(routeId, loadout, seed, stats) {
  let run = createRun(routeId, seed, loadout);
  let steps = 0;

  while (run.status === 'active' && steps++ < 40) {
    const node = currentNode(run);
    if (!node) break;

    if (node.type === 'event' && !run.pendingEncounterId) {
      run = chooseEventOption(run, node.eventId, safeOption(node.eventId));
    } else if (node.type === 'shop' && !run.pendingEncounterId) {
      run = rollShop(run, node.shopId);
      // buy the most expensive affordable thing, twice
      for (let i = 0; i < 2; i++) {
        const affordable = shopOfferItems(run, node.shopId)
          .filter((it) => it.cost <= run.scrap && !run.shopPurchased.includes(it.id))
          .sort((a, b) => b.cost - a.cost);
        if (!affordable.length) break;
        run = purchase(run, node.shopId, affordable[0].id);
      }
    } else {
      const enc = currentEncounter(run);
      if (!enc) break;
      const finished = playBattle(
        createBattle({
          encounterId: enc.id,
          assembly: run.assembly,
          relics: run.relics,
          seed: run.rngState ^ (run.nodeIndex * 0x9e3779b9),
          carry: { ...run.carry },
          damagedSlots: run.damagedSlots,
        }),
      );

      const rec = (stats.encounters[enc.id] ??= { plays: 0, wins: 0, turns: 0, peels: 0 });
      rec.plays++;
      rec.turns += finished.turn;
      rec.peels += finished.player.peelCount;
      if (finished.outcome === 'won') rec.wins++;

      stats.totalTurns += finished.turn;
      stats.totalPeels += finished.player.peelCount;
      stats.fights++;

      const res = applyBattleResult(run, {
        cleared: finished.outcome === 'won',
        hp: finished.player.hp,
        glue: finished.player.glue,
        turns: finished.turn,
        peelCount: finished.player.peelCount,
        encounterId: finished.encounterId,
      });
      run = res.run;
      if (run.status === 'lost') {
        stats.diedAt[enc.id] = (stats.diedAt[enc.id] ?? 0) + 1;
        break;
      }
    }

    if (run.status !== 'active') break;
    run = advanceNode(run);
    if (run.status !== 'active') break;
    if (isFinalNode(run) && currentNode(run) === null) break;
  }
  return run;
}

// ─── drive ───────────────────────────────────────────────────────────────────

const routes = ONLY_ROUTE ? [ONLY_ROUTE] : Object.keys(ROUTES);
const loadoutNames = ONLY_LOADOUT
  ? [ONLY_LOADOUT]
  : Object.keys(LOADOUTS);

const table = [];
const encounterTotals = {};

for (const routeId of routes) {
  for (const name of loadoutNames) {
    const loadout = LOADOUTS[name] ?? LOADOUTS[Object.keys(LOADOUTS)[0]];
    const stats = { encounters: {}, diedAt: {}, totalTurns: 0, totalPeels: 0, fights: 0 };
    let wins = 0;

    for (let i = 0; i < RUNS; i++) {
      const run = playRun(routeId, loadout, 1000 + i * 7919, stats);
      if (run.status === 'won') wins++;
    }

    for (const [id, rec] of Object.entries(stats.encounters)) {
      const t = (encounterTotals[id] ??= { plays: 0, wins: 0, turns: 0, peels: 0 });
      t.plays += rec.plays;
      t.wins += rec.wins;
      t.turns += rec.turns;
      t.peels += rec.peels;
    }

    const worst = Object.entries(stats.diedAt).sort((a, b) => b[1] - a[1])[0];
    table.push({
      route: routeId,
      loadout: name,
      'win%': +((wins / RUNS) * 100).toFixed(1),
      'turns/fight': +(stats.totalTurns / Math.max(1, stats.fights)).toFixed(1),
      'peels/fight': +(stats.totalPeels / Math.max(1, stats.fights)).toFixed(2),
      'died most at': worst ? `${worst[0]} (${worst[1]})` : '—',
    });
  }
}

console.log(`\n${RUNS} runs per cell · scripted policy · seeds 1000+7919n\n`);
table.sort((a, b) => b['win%'] - a['win%']);
console.table(table);

const rates = table.map((r) => r['win%']);
console.log(`win rate spread: ${Math.min(...rates)}% – ${Math.max(...rates)}%  (range ${(Math.max(...rates) - Math.min(...rates)).toFixed(1)} pts)`);

if (PER_ENCOUNTER) {
  console.log('\nper encounter:');
  console.table(
    Object.entries(encounterTotals)
      .map(([id, r]) => ({
        encounter: id,
        plays: r.plays,
        'clear%': +((r.wins / r.plays) * 100).toFixed(1),
        'avg turns': +(r.turns / r.plays).toFixed(1),
        'avg peels': +(r.peels / r.plays).toFixed(2),
      }))
      .sort((a, b) => a['clear%'] - b['clear%']),
  );
}

console.log(`
Targets (docs/02_GAME_DESIGN.md §8): combat 4-6 turns, elite 6-9, boss 10-14.
A healthy spread is meaningful but not decisive — if one build is 30+ points
ahead of the field, it is doing something the others cannot answer.
`);
