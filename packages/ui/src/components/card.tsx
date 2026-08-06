import type { WithClassName } from '@enterprise-mfe/shared-types';
import { cx } from '../utils/cx';

export type CardTrend = 'up' | 'down' | 'flat';

export interface CardProps extends WithClassName {
  label: string;
  value: string;
  trend?: CardTrend;
}

const TREND_LABEL: Record<CardTrend, string> = {
  up: '▲',
  down: '▼',
  flat: '▬',
};

const TREND_CLASSES: Record<CardTrend, string> = {
  up: 'text-(--color-success-500)',
  down: 'text-(--color-danger-500)',
  flat: 'text-(--color-text-muted)',
};

export function Card({ label, value, trend, className }: CardProps) {
  return (
    <div
      className={cx(
        'flex flex-col gap-1 rounded-(--radius-surface) border border-(--color-border)',
        'bg-(--color-surface) p-4',
        className,
      )}
    >
      <span className="text-sm text-(--color-text-muted)">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-2xl font-medium text-(--color-text)">{value}</span>
        {trend ? (
          <span aria-hidden="true" className={cx('text-sm', TREND_CLASSES[trend])}>
            {TREND_LABEL[trend]}
          </span>
        ) : null}
      </span>
    </div>
  );
}
