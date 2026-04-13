import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  trend?: number; // positive = up, negative = down, 0 = neutral
  trendLabel?: string;
  accentColor?: string;
  delay?: number;
}

export default function KPICard({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  trendLabel,
  accentColor = '#c41e3a',
  delay = 0,
}: KPICardProps) {
  const TrendIcon =
    trend === undefined ? null
    : trend > 0 ? TrendingUp
    : trend < 0 ? TrendingDown
    : Minus;

  const trendColor =
    trend === undefined ? ''
    : trend > 0 ? '#22c55e'
    : trend < 0 ? '#ef4444'
    : '#5a5a7a';

  return (
    <div
      className="gang-card p-5 relative overflow-hidden animate-entry group"
      style={{
        animationDelay: `${delay}ms`,
        borderTop: `1px solid ${accentColor}33`,
      }}
    >
      {/* Corner glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${accentColor}08, transparent 60%)` }}
      />

      {/* Top row: label + icon */}
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-display font-semibold tracking-widest uppercase text-ink-secondary">
          {label}
        </span>
        <div
          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
          style={{
            background: `${accentColor}15`,
            border: `1px solid ${accentColor}30`,
          }}
        >
          <Icon size={15} style={{ color: accentColor }} />
        </div>
      </div>

      {/* Value */}
      <div className="mb-2">
        <span
          className="font-mono text-2xl font-bold text-ink-primary"
          style={{ letterSpacing: '-0.01em' }}
        >
          {value}
        </span>
        {subValue && (
          <span className="ml-2 text-sm text-ink-secondary font-body">{subValue}</span>
        )}
      </div>

      {/* Trend */}
      {TrendIcon && trend !== undefined && (
        <div className="flex items-center gap-1.5">
          <TrendIcon size={12} style={{ color: trendColor }} />
          <span className="text-xs font-mono" style={{ color: trendColor }}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          {trendLabel && (
            <span className="text-xs text-ink-secondary">{trendLabel}</span>
          )}
        </div>
      )}

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 h-px transition-all duration-300 group-hover:w-full"
        style={{
          width: '30%',
          background: `linear-gradient(90deg, ${accentColor}, transparent)`,
        }}
      />
    </div>
  );
}
