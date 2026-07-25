import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PartSlot } from '@/game/data/types';
import { BALANCE } from '@/game/data/balance';
import {
  createBattle,
  resolveEnemyIntent,
  resolvePlayerAction,
  resolveSkill,
  type CoreActionId,
} from '@/game/engine/battleEngine';
import { peeledSlots } from '@/game/engine/peelResolver';
import { randomSeed } from '@/game/engine/rng';
import {
  advanceNode,
  applyBattleResult,
  chooseEventOption,
  createRun,
  currentEncounter,
  currentNode,
  currentRoute,
  equipPart,
  purchase,
  rollShop,
  type BattleOutcomeSummary,
} from '@/game/engine/rewardResolver';
import type { BattleState } from '@/game/state/battleState';
import { loadRun, saveRun, type RunState } from '@/game/state/runState';
import { navigate, screenFromHash, type ScreenId } from './routes';

/**
 * Bridges the pure engine to React.
 *
 * The engine knows nothing about React; this store knows nothing about game
 * rules. Its only real job beyond plumbing is the enemy-turn timer, which exists
 * so the player can watch their own action land before the reply.
 */

interface GameContextValue {
  screen: ScreenId;
  go: (screen: ScreenId) => void;
  run: RunState | null;
  battle: BattleState | null;
  summary: BattleOutcomeSummary | null;
  hasSave: boolean;

  startRun: (routeId: string, seed?: number) => void;
  continueRun: () => void;
  abandonRun: () => void;

  enterCurrentNode: () => void;
  equip: (slot: PartSlot, partId: string | null) => void;

  act: (action: CoreActionId) => void;
  useSkill: (slot: PartSlot) => void;

  resolveEvent: (eventId: string, optionId: string) => void;
  buy: (shopId: string, itemId: string) => void;
  leaveNode: () => void;
  /** True while the enemy turn timer is pending. */
  enemyThinking: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<ScreenId>(() => screenFromHash(window.location.hash) ?? 'title');
  const [run, setRun] = useState<RunState | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [summary, setSummary] = useState<BattleOutcomeSummary | null>(null);
  const [hasSave, setHasSave] = useState(() => loadRun() !== null);
  const [enemyThinking, setEnemyThinking] = useState(false);
  const enemyTimer = useRef<number | null>(null);

  const go = useCallback((next: ScreenId) => {
    setScreen(next);
    navigate(next);
  }, []);

  useEffect(() => {
    const onHash = () => {
      const next = screenFromHash(window.location.hash);
      if (next) setScreen(next);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // persist after every run mutation
  useEffect(() => {
    if (run && run.status === 'active') {
      saveRun(run);
      setHasSave(true);
    } else if (run && run.status !== 'active') {
      saveRun(null);
      setHasSave(false);
    }
  }, [run]);

  useEffect(() => () => {
    if (enemyTimer.current) window.clearTimeout(enemyTimer.current);
  }, []);

  // ── run lifecycle ─────────────────────────────────────────────────────────

  const startRun = useCallback(
    (routeId: string, seed?: number) => {
      // `?seed=1234` forces a reproducible run. Used by E2E and by anyone
      // reporting a bug — "it happened on seed 1234" is actionable.
      const forced = new URLSearchParams(window.location.search).get('seed');
      const fresh = createRun(routeId, seed ?? (forced ? Number(forced) >>> 0 : randomSeed()));
      setRun(fresh);
      setBattle(null);
      setSummary(null);
      go('workshop');
    },
    [go],
  );

  const continueRun = useCallback(() => {
    const saved = loadRun();
    if (!saved) return;
    setRun(saved);
    setBattle(null);
    setSummary(null);
    go('workshop');
  }, [go]);

  const abandonRun = useCallback(() => {
    saveRun(null);
    setRun(null);
    setBattle(null);
    setSummary(null);
    setHasSave(false);
    go('title');
  }, [go]);

  // ── node entry ────────────────────────────────────────────────────────────

  const enterCurrentNode = useCallback(() => {
    if (!run) return;
    const node = currentNode(run);
    if (!node) {
      go('result');
      return;
    }
    if (node.type === 'event' && !run.pendingEncounterId) {
      setBattle(null);
      go('event');
      return;
    }
    if (node.type === 'shop' && !run.pendingEncounterId) {
      setBattle(null);
      setRun((r) => (r && !r.shopOffers ? rollShop(r, node.shopId!) : r));
      go('shop');
      return;
    }

    const encounter = currentEncounter(run);
    if (!encounter) {
      go('result');
      return;
    }
    const fresh = createBattle({
      encounterId: encounter.id,
      assembly: run.assembly,
      relics: run.relics,
      seed: run.rngState ^ (run.nodeIndex * 0x9e3779b9),
      carry: {
        hp: run.carry.hp,
        glue: run.carry.glue,
        startBlock: run.carry.startBlock,
        startStatuses: run.carry.startStatuses,
      },
      damagedSlots: run.damagedSlots,
    });
    setBattle(fresh);
    setSummary(null);
    go('battle');
  }, [run, go]);

  const equip = useCallback((slot: PartSlot, partId: string | null) => {
    // Deliberately blocked mid-battle: v0.8 let you swap parts during a fight,
    // which silently restarted the encounter and made it a free retry button.
    setRun((r) => (r ? equipPart(r, slot, partId) : r));
  }, []);

  // ── battle ────────────────────────────────────────────────────────────────

  const finishBattle = useCallback(
    (finished: BattleState) => {
      setRun((r) => {
        if (!r) return r;
        const { run: nextRun, summary: s } = applyBattleResult(r, {
          cleared: finished.outcome === 'won',
          hp: finished.player.hp,
          glue: finished.player.glue,
          turns: finished.turn,
          peelCount: finished.player.peelCount,
          encounterId: finished.encounterId,
        });
        setSummary(s);
        return nextRun;
      });
      go(finished.outcome === 'won' ? 'reward' : 'result');
    },
    [go],
  );

  const scheduleEnemyTurn = useCallback(
    (afterPlayer: BattleState) => {
      if (afterPlayer.outcome !== 'ongoing') {
        finishBattle(afterPlayer);
        return;
      }
      setEnemyThinking(true);
      enemyTimer.current = window.setTimeout(() => {
        setEnemyThinking(false);
        setBattle((current) => {
          if (!current) return current;
          const next = resolveEnemyIntent(current);
          if (next.outcome !== 'ongoing') {
            // defer so the outcome fx get one frame to play
            window.setTimeout(() => finishBattle(next), 620);
          }
          return next;
        });
      }, BALANCE.feel.enemyTurnDelay);
    },
    [finishBattle],
  );

  const act = useCallback(
    (action: CoreActionId) => {
      setBattle((current) => {
        if (!current || current.side !== 'player' || current.outcome !== 'ongoing') return current;
        const next = resolvePlayerAction(current, action);
        if (next === current) return current;
        scheduleEnemyTurn(next);
        return next;
      });
    },
    [scheduleEnemyTurn],
  );

  const useSkill = useCallback(
    (slot: PartSlot) => {
      setBattle((current) => {
        if (!current || current.side !== 'player' || current.outcome !== 'ongoing') return current;
        const next = resolveSkill(current, slot);
        if (next === current) return current;
        scheduleEnemyTurn(next);
        return next;
      });
    },
    [scheduleEnemyTurn],
  );

  // ── non-combat nodes ──────────────────────────────────────────────────────

  const resolveEvent = useCallback((eventId: string, optionId: string) => {
    setRun((r) => (r ? chooseEventOption(r, eventId, optionId) : r));
  }, []);

  const buy = useCallback((shopId: string, itemId: string) => {
    setRun((r) => (r ? purchase(r, shopId, itemId) : r));
  }, []);

  const leaveNode = useCallback(() => {
    setRun((r) => {
      if (!r) return r;
      // an event that forced a fight resolves that fight before moving on
      if (r.pendingEncounterId) return r;
      const next = advanceNode(r);
      if (next.status === 'won') {
        window.setTimeout(() => go('result'), 0);
      } else {
        window.setTimeout(() => go('workshop'), 0);
      }
      return next;
    });
  }, [go]);

  const value = useMemo<GameContextValue>(
    () => ({
      screen,
      go,
      run,
      battle,
      summary,
      hasSave,
      startRun,
      continueRun,
      abandonRun,
      enterCurrentNode,
      equip,
      act,
      useSkill,
      resolveEvent,
      buy,
      leaveNode,
      enemyThinking,
    }),
    [screen, go, run, battle, summary, hasSave, startRun, continueRun, abandonRun, enterCurrentNode, equip, act, useSkill, resolveEvent, buy, leaveNode, enemyThinking],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/** Slots currently peeled in the live battle, for figure rendering. */
export function battlePeeledSet(battle: BattleState | null): Set<PartSlot> {
  return new Set(battle ? peeledSlots(battle) : []);
}

export { currentRoute, currentNode };
