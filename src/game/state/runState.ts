import type { PartSlot, StatusId } from '../data/types';
import type { AssemblyState } from '../systems/assemblySystem';

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'peelbeast.run.v2';

/** Everything that survives between nodes. Serialisable by construction. */
export interface RunCarry {
  hp: number;
  glue: number;
  startBlock: number;
  startStatuses: Partial<Record<StatusId, number>>;
}

export interface RunNodeRecord {
  index: number;
  type: string;
  label: string;
  outcome: 'cleared' | 'failed' | 'resolved';
  detail: string;
}

export interface RunState {
  version: number;
  seed: number;
  /** Advances as the run makes choices; keeps shop rolls deterministic. */
  rngState: number;
  routeId: string;
  nodeIndex: number;
  assembly: AssemblyState;
  relics: string[];
  scrap: number;
  carry: RunCarry;
  /** Shop item ids currently on offer, or null before the roll. */
  shopOffers: string[] | null;
  shopPurchased: string[];
  /** Scrap discount applied to the next shop visit. */
  shopDiscount: number;
  /** Set by an event that forces a fight instead of the scheduled node. */
  pendingEncounterId: string | null;
  /** Parts damaged by events start the next battle already peeled. */
  damagedSlots: PartSlot[];
  history: RunNodeRecord[];
  status: 'active' | 'won' | 'lost';
  turnsTaken: number;
  battlesWon: number;
}

export function emptyCarry(): RunCarry {
  return { hp: 0, glue: 0, startBlock: 0, startStatuses: {} };
}

// ─── persistence ─────────────────────────────────────────────────────────────

export function saveRun(run: RunState | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (!run) localStorage.removeItem(SAVE_KEY);
    else localStorage.setItem(SAVE_KEY, JSON.stringify(run));
  } catch {
    // storage unavailable (private mode, file://) — the run just isn't saved
  }
}

export function loadRun(): RunState | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RunState;
    if (parsed.version !== SAVE_VERSION) return null;
    if (parsed.status !== 'active') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasSavedRun(): boolean {
  return loadRun() !== null;
}
