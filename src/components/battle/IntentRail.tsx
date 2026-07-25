import { describeIntent, peelTargetLabel } from '@/game/engine/describe';
import type { BattleState } from '@/game/state/battleState';
import { Sprite } from '../common/Sprite';

const DANGER_LABEL = { low: '경미', medium: '주의', high: '위험', extreme: '치명' } as const;
const SLOT_ORDER = ['Now', 'Next', 'Then'];

/**
 * Three enemy intents, each showing the structured facts a decision needs:
 * damage, statuses, glue loss, ink, peel target, whether Block helps, and
 * whether it pierces. All of it is derived from the same effect data the
 * resolver executes.
 */
export function IntentRail({ battle, revealed }: { battle: BattleState; revealed: boolean }) {
  return (
    <ol className="intent-rail" data-testid="intent-rail" aria-label="적 의도">
      {battle.enemy.intents.slice(0, 3).map((instance, i) => {
        const p = describeIntent(battle, instance, revealed);
        return (
          <li
            key={instance.key}
            className={`intent-card intent-card--${p.danger}${i === 0 ? ' is-now' : ''}`}
            data-testid={`intent-${i}`}
            data-intent-id={p.intent.id}
          >
            <div className="intent-card__when">{SLOT_ORDER[i] ?? `+${i}`}</div>
            <Sprite assetId={p.intent.iconAssetId} className="intent-card__icon" decorative />
            <div className="intent-card__body">
              <strong className="intent-card__name">{p.intent.name}</strong>

              <div className="intent-card__facts">
                {p.damage !== null && (
                  <span className="fact fact--damage" data-testid={`intent-${i}-damage`}>
                    {revealed ? p.damage : approx(p.damage)}
                    {p.hits > 1 && <em> ×{p.hits}</em>} 피해
                  </span>
                )}
                {p.glueLoss > 0 && <span className="fact fact--glue">Glue −{p.glueLoss}</span>}
                {p.inkGain > 0 && <span className="fact fact--ink">Ink +{p.inkGain}</span>}
                {p.enemyBlockGain > 0 && <span className="fact fact--block">적 Block +{p.enemyBlockGain}</span>}
                {p.statuses.map((s) => (
                  <span key={s.status} className="fact fact--status">
                    <Sprite assetId={s.iconAssetId} className="fact__icon" decorative />
                    {s.name} {s.amount}
                  </span>
                ))}
                {p.peelTargets && (
                  <span className="fact fact--peel" data-testid={`intent-${i}-peel`}>
                    박리: {peelTargetLabel(p.peelTargets)}
                  </span>
                )}
              </div>

              <div className="intent-card__meta">
                <span className={`danger danger--${p.danger}`}>{DANGER_LABEL[p.danger]}</span>
                <span className="intent-card__flag">{p.piercing ? '관통 — Block 무시' : p.blockable ? 'Block 가능' : 'Block 무관'}</span>
                {p.peelBlockThreshold > 0 && <span className="intent-card__flag">Block {p.peelBlockThreshold}+ 면 박리 차단</span>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Without Insight the player sees a band rather than an exact figure. */
function approx(n: number): string {
  if (n <= 0) return '0';
  const lo = Math.max(1, Math.round(n * 0.8));
  const hi = Math.round(n * 1.2);
  return lo === hi ? `${lo}` : `${lo}–${hi}`;
}
