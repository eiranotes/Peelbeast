import type { CSSProperties, ReactNode } from 'react';
import { Sprite } from './Sprite';
import { STATUSES } from '@/game/data/statuses';
import type { StatusId } from '@/game/data/types';

export function Panel({
  children,
  className,
  tape,
  style,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  tape?: boolean;
  style?: CSSProperties;
} & Record<string, unknown>) {
  return (
    <section className={['paper', 'panel', className].filter(Boolean).join(' ')} style={style} {...rest}>
      {tape && (
        <>
          <span className="tape-strip tape-strip--tl" />
          <span className="tape-strip tape-strip--tr" />
        </>
      )}
      {children}
    </section>
  );
}

export function SectionTitle({ label, title, aside }: { label?: string; title: string; aside?: ReactNode }) {
  return (
    <header className="section-title">
      <div>
        {label && <div className="label">{label}</div>}
        <h2>{title}</h2>
      </div>
      {aside && <div className="section-title__aside">{aside}</div>}
    </header>
  );
}

export function Bar({
  value,
  max,
  variant,
  label,
  compact,
}: {
  value: number;
  max: number;
  variant: 'hp' | 'glue' | 'block' | 'ink' | 'enemy';
  label?: string;
  compact?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`bar bar--${variant}${compact ? ' bar--compact' : ''}`}>
      {label && (
        <div className="bar__label">
          <span>{label}</span>
          <b>
            {value}
            <span className="bar__max"> / {max}</span>
          </b>
        </div>
      )}
      <div className="bar__track">
        <div className="bar__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function StatusChip({ status, value, size = 'md' }: { status: StatusId; value: number; size?: 'sm' | 'md' }) {
  const def = STATUSES[status];
  return (
    <span className={`status-chip status-chip--${def.tone} status-chip--${size}`} title={`${def.name} — ${def.desc}`}>
      <Sprite assetId={def.iconAssetId} className="status-chip__icon" decorative />
      <span className="status-chip__name">{def.name}</span>
      <b className="status-chip__value">{value}</b>
    </span>
  );
}

export function StatBlock({ items }: { items: Array<{ key: string; label: string; value: ReactNode; delta?: number }> }) {
  return (
    <div className="stat-block">
      {items.map((it) => (
        <div key={it.key} className="stat-block__cell">
          <span className="label">{it.label}</span>
          <b>
            {it.value}
            {it.delta !== undefined && it.delta !== 0 && (
              <em className={it.delta > 0 ? 'delta delta--up' : 'delta delta--down'}>
                {it.delta > 0 ? '+' : ''}
                {it.delta}
              </em>
            )}
          </b>
        </div>
      ))}
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="empty-note">{children}</p>;
}
