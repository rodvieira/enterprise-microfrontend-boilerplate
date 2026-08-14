import { Card } from '@enterprise-mfe/ui';
import type { CardTrend } from '@enterprise-mfe/ui';

export type KpiCardStatus = 'loading' | 'loaded' | 'error';

export interface KpiCardProps {
  label: string;
  status: KpiCardStatus;
  value?: string;
  trend?: CardTrend;
}

/**
 * One KPI card, built on the shared design system's Card. Carries
 * its own loading and error visual states — driven entirely by
 * `status`, so `kpi-cards.tsx` never has to decide how a card *looks*, only
 * what state it's in.
 */
export function KpiCard({ label, status, value, trend }: KpiCardProps) {
  if (status === 'loading') {
    return <Card label={label} value="Loading…" />;
  }

  if (status === 'error') {
    return (
      <div role="alert">
        <Card label={label} value="Unavailable" />
      </div>
    );
  }

  return <Card label={label} value={value ?? ''} {...(trend ? { trend } : {})} />;
}
