/**
 * Every tunable number lives here. Nothing else in the codebase may contain a
 * balance magic number — the v0.8 build scattered them across 27 call sites.
 */

export const BALANCE = {
  /** Base action values before parts, passives and relics. */
  core: {
    guardBlock: 6,
    repairHp: 5,
    repairGlue: 7,
    pressGlue: 4,
    pressCooldown: 1,
  },

  /** Damage pipeline. */
  damage: {
    focusBonus: 2,
    fastSpeedThreshold: 11,
    fastSpeedBonus: 1,
    frazzlePenalty: 2,
    fragileBonus: 1,
    vulnerableMultiplier: 1.5,
    driftReduction: 1,
  },

  /** Peel rules. */
  peel: {
    /** Base chance an intent's peel actually lands, before resist. */
    baseChance: 0.72,
    /** Each point of peelResist removes this much chance. */
    resistStep: 0.11,
    /** Drift makes grounded slots likelier targets than the trinket. */
    driftProtectsTrinket: true,
    /** Running out of glue peels a random part at the start of your turn. */
    glueBreakEnabled: true,
    minChance: 0.1,
    maxChance: 0.95,
  },

  /** Battle-wide ink tide. */
  ink: {
    max: 6,
    floodThreshold: 5,
    floodDamage: 2,
    decayPerRound: 0,
  },

  /** Run economy. */
  run: {
    startingScrap: 12,
    /**
     * Recovery after a won fight. A flat +4 could not keep up with cumulative
     * damage across a 7-node run — simulation showed every build dying before
     * the boss regardless of loadout. Winning now restores a share of max HP,
     * which is what makes a whole run survivable.
     */
    carryHpRefundRatio: 0.34,
    carryHpRefund: 4,
    carryGlueRefundRatio: 0.5,
    carryGlueRefund: 6,
    scrap: { combat: 9, elite: 14, boss: 20 },
    /** Applied when entering any node after the first. */
    minCarryHp: 1,
  },

  /** Enemy behaviour. */
  enemy: {
    phaseShiftBlock: 4,
    phaseShiftFury: 1,
    intentQueueLength: 3,
    /**
     * Fury is added to every hit and never decays, so without a ceiling a long
     * fight compounds into an unwinnable spiral — simulation showed a 0% win
     * rate before this cap existed.
     */
    maxFury: 2,
    /** Share of max HP the player recovers when a boss changes phase. */
    phaseShiftPlayerHeal: 0.25,
  },

  /** Presentation timings the battle view uses (ms). Engine never reads these. */
  feel: {
    inputAck: 90,
    hitStop: 130,
    enemyTurnDelay: 520,
    intentAdvance: 240,
    peelFall: 900,
  },
} as const;

export type Balance = typeof BALANCE;
