import type { BattleState, LogEntry } from '../state/battleState';

const MAX_LOG = 40;

export function addLog(state: BattleState, who: string, text: string, tone: LogEntry['tone'] = 'neutral'): void {
  state.seq += 1;
  state.log.unshift({ id: state.seq, who, text, tone });
  if (state.log.length > MAX_LOG) state.log.length = MAX_LOG;
}
