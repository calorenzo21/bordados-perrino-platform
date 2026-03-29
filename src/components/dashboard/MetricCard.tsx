import { type LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  iconColor?: 'blue' | 'green' | 'amber' | 'purple' | 'rose';
  loading?: boolean;
  /** Clases para el valor principal (ej. text-lg line-clamp-2 para textos largos) */
  valueClassName?: string;
}

const iconStyles = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    shadow: 'shadow-blue-200 dark:shadow-blue-900/50',
    ring: 'ring-blue-100 dark:ring-blue-900/50',
    accent: 'bg-blue-50 dark:bg-blue-900/30',
    dot: 'bg-blue-400',
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    shadow: 'shadow-emerald-200 dark:shadow-emerald-900/50',
    ring: 'ring-emerald-100 dark:ring-emerald-900/50',
    accent: 'bg-emerald-50 dark:bg-emerald-900/30',
    dot: 'bg-emerald-400',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-500 to-amber-600',
    shadow: 'shadow-amber-200 dark:shadow-amber-900/50',
    ring: 'ring-amber-100 dark:ring-amber-900/50',
    accent: 'bg-amber-50 dark:bg-amber-900/30',
    dot: 'bg-amber-400',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    shadow: 'shadow-purple-200 dark:shadow-purple-900/50',
    ring: 'ring-purple-100 dark:ring-purple-900/50',
    accent: 'bg-purple-50 dark:bg-purple-900/30',
    dot: 'bg-purple-400',
  },
  rose: {
    bg: 'bg-gradient-to-br from-rose-500 to-rose-600',
    shadow: 'shadow-rose-200 dark:shadow-rose-900/50',
    ring: 'ring-rose-100 dark:ring-rose-900/50',
    accent: 'bg-rose-50 dark:bg-rose-900/30',
    dot: 'bg-rose-400',
  },
};

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  iconColor = 'blue',
  loading = false,
  valueClassName,
}: MetricCardProps) {
  const styles = iconStyles[iconColor];

  if (loading) {
    return (
      <Card className="group relative overflow-hidden rounded-2xl border-0 bg-white dark:bg-slate-800 shadow-sm">
        <CardContent className="metric-card-content p-4 lg:p-3 xl:p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="metric-icon-box h-10 w-10 rounded-2xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-white dark:bg-slate-800 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      {/* Decorative background element */}
      <div
        className={cn(
          'absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-[0.08] transition-transform duration-500 group-hover:scale-150',
          styles.bg
        )}
      />

      {/* Subtle top accent line */}
      <div className={cn('absolute left-0 top-0 h-1 w-full opacity-80', styles.bg)} />

      <CardContent className="metric-card-content relative flex flex-1 flex-col p-4 pb-3 lg:p-3 lg:pb-2 xl:p-4 xl:pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            {/* Title with dot indicator */}
            <div className="metric-title-gap flex items-center gap-1.5">
              <div className={cn('metric-dot h-1.5 w-1.5 shrink-0 rounded-full', styles.dot)} />
              <p className="whitespace-nowrap text-xs xl:text-sm font-medium text-slate-500 dark:text-slate-400">
                {title}
              </p>
            </div>

            {/* Value */}
            <div className="metric-value-pt pt-1">
              <p
                className={cn(
                  'font-bold tracking-tight text-slate-900 dark:text-white',
                  valueClassName ?? 'metric-value text-xl xl:text-[35px]'
                )}
              >
                {value}
              </p>
            </div>

            {/* Description */}
            {description && (
              <p className="metric-description pt-1 text-[11px] xl:text-xs text-slate-400 dark:text-slate-500">
                {description}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end justify-between h-full">
            {/* Icon container with enhanced styling */}
            <div
              className={cn(
                'metric-icon-box ml-2 flex h-9 w-9 xl:h-12 xl:w-12 shrink-0 items-center justify-center rounded-xl shadow-lg ring-2 transition-transform duration-300 group-hover:scale-110',
                styles.bg,
                styles.shadow,
                styles.ring
              )}
            >
              <Icon className="metric-icon-svg h-4 w-4 xl:h-5 xl:w-5 text-white" strokeWidth={2} />
            </div>
            <div className="flex gap-1 opacity-30">
              <div className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} />
              <div className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} />
              <div className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
