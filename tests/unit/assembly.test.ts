import { describe, expect, it } from 'vitest';
import { computeBuild, createAssembly, diffBuilds, activeParts } from '@/game/systems/assemblySystem';
import { BODIES, DEFAULT_BODY_ID, PARTS } from '@/game/data/parts';
import type { PartSlot } from '@/game/data/types';

const BASE = BODIES[DEFAULT_BODY_ID].base;

describe('assembly — equipping changes stats', () => {
  it('an empty body reports its base stats', () => {
    const build = computeBuild(createAssembly());
    expect(build.maxHp).toBe(BASE.hp);
    expect(build.maxGlue).toBe(BASE.glue);
    expect(build.atk).toBe(BASE.atk);
    expect(build.skills).toHaveLength(0);
  });

  it('equipping a part adds its stats and its skill', () => {
    const empty = computeBuild(createAssembly());
    const withToast = computeBuild(createAssembly({ head: 'part.head.toast_helm' }));
    const toast = PARTS['part.head.toast_helm'];

    expect(withToast.maxHp).toBe(empty.maxHp + (toast.stats.hp ?? 0));
    expect(withToast.atk).toBe(empty.atk + (toast.stats.atk ?? 0));
    expect(withToast.skills.map((s) => s.skill.id)).toContain('copySpark');
    expect(withToast.passives.map((p) => p.title)).toContain('Warm Crumb');
  });

  it('unequipping restores the previous stats exactly', () => {
    const before = computeBuild(createAssembly({ head: 'part.head.box_shell', hand: 'part.hand.scissors' }));
    const removed = computeBuild(createAssembly({ hand: 'part.hand.scissors' }));
    const restored = computeBuild(createAssembly({ head: 'part.head.box_shell', hand: 'part.hand.scissors' }));

    expect(restored).toEqual(before);
    expect(removed.maxHp).toBeLessThan(before.maxHp);
    expect(removed.skills.map((s) => s.skill.id)).not.toContain('foldGuard');
  });

  it('a peeled slot contributes nothing — stats, skill, passive all drop', () => {
    const assembly = createAssembly({ head: 'part.head.box_shell', core: 'part.core.coffee_cup' });
    const whole = computeBuild(assembly);
    const peeled = computeBuild(assembly, { peeled: new Set<PartSlot>(['head']) });

    expect(peeled.maxHp).toBe(whole.maxHp - 8);
    expect(peeled.peelResist).toBe(whole.peelResist - 2); // stats +1 and passive modifier +1
    expect(peeled.skills.map((s) => s.skill.id)).not.toContain('foldGuard');
    expect(peeled.rules.some((r) => r.kind === 'guardBonus')).toBe(false);
    // the untouched slot is unaffected
    expect(peeled.skills.map((s) => s.skill.id)).toContain('coffeeOverclock');
  });

  it('reattaching a peeled slot returns the build to identical numbers', () => {
    const assembly = createAssembly({ head: 'part.head.toast_helm', hand: 'part.hand.pencil_spear' });
    const whole = computeBuild(assembly);
    const peeled = computeBuild(assembly, { peeled: new Set<PartSlot>(['hand']) });
    const reattached = computeBuild(assembly, { peeled: new Set<PartSlot>() });

    expect(peeled).not.toEqual(whole);
    expect(reattached).toEqual(whole);
  });

  it('activeParts excludes peeled slots', () => {
    const assembly = createAssembly({ head: 'part.head.toast_helm', core: 'part.core.tape_roll' });
    expect(activeParts(assembly).map((p) => p.id)).toHaveLength(2);
    expect(activeParts(assembly, new Set<PartSlot>(['core'])).map((p) => p.id)).toEqual(['part.head.toast_helm']);
  });

  it('diffBuilds reports gained and lost skills', () => {
    const a = computeBuild(createAssembly({ hand: 'part.hand.scissors' }));
    const b = computeBuild(createAssembly({ hand: 'part.hand.umbrella_hook' }));
    const delta = diffBuilds(a, b);
    expect(delta.lostSkills).toContain('Scissor Flurry');
    expect(delta.gainedSkills).toContain('Umbrella Bastion');
    expect(delta.atk).toBe(b.atk - a.atk);
  });

  it('relics add stats but are never disabled by peeling', () => {
    const assembly = createAssembly({ head: 'part.head.toast_helm' });
    const withRelic = computeBuild(assembly, { relics: ['bone_folder'] });
    const peeledWithRelic = computeBuild(assembly, { peeled: new Set<PartSlot>(['head']), relics: ['bone_folder'] });
    const peeledNoRelic = computeBuild(assembly, { peeled: new Set<PartSlot>(['head']) });

    expect(withRelic.maxHp).toBe(computeBuild(assembly).maxHp + 6);
    expect(peeledWithRelic.maxHp).toBe(peeledNoRelic.maxHp + 6);
  });
});

describe('assembly — synergies', () => {
  it('activates only when every required part is equipped', () => {
    const half = computeBuild(createAssembly({ head: 'part.head.toast_helm' }));
    expect(half.activeSynergies.map((s) => s.id)).not.toContain('warm_breakfast');

    const full = computeBuild(createAssembly({ head: 'part.head.toast_helm', core: 'part.core.coffee_cup' }));
    expect(full.activeSynergies.map((s) => s.id)).toContain('warm_breakfast');
    expect(full.cooldownDiscount).toBe(1);
  });

  it('breaks when one of its parts is peeled, and reports it as broken not absent', () => {
    const assembly = createAssembly({ head: 'part.head.toast_helm', core: 'part.core.coffee_cup' });
    const broken = computeBuild(assembly, { peeled: new Set<PartSlot>(['core']) });

    expect(broken.activeSynergies.map((s) => s.id)).not.toContain('warm_breakfast');
    expect(broken.brokenSynergies.map((s) => s.id)).toContain('warm_breakfast');
    expect(broken.cooldownDiscount).toBe(0);
  });

  it('contributes rules as well as stats', () => {
    const build = computeBuild(createAssembly({ hand: 'part.hand.pencil_spear', trinket: 'part.trinket.eye_sticker' }));
    expect(build.activeSynergies.map((s) => s.id)).toContain('precision_draft');
    const pinnedBonuses = build.rules.filter((r) => r.kind === 'basicBonusVsStatus' && r.status === 'pinned');
    expect(pinnedBonuses.length).toBeGreaterThan(0);
  });
});
