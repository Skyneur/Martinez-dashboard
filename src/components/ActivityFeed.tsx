import { TRANSACTIONS, MEMBERS } from '../data/mockData';
import { formatMoney, timeAgo, roleColor } from '../utils/format';
import type { ActivityType } from '../types';

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  Transport:    '↗',
  Blanchiment:  '◈',
  Deal:         '◆',
  Extorsion:    '⚡',
  Vol:          '◇',
  Collecte:     '●',
  Surveillance: '◉',
};

export default function ActivityFeed() {
  // Show last 10 transactions sorted by date desc
  const recent = [...TRANSACTIONS]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return (
    <div className="gang-card p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary">
          Flux d'Activité
        </h3>
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse-glow"
            style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}
          />
          <span className="text-xs text-ink-secondary font-mono">EN DIRECT</span>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 stagger-children" style={{ maxHeight: 340 }}>
        {recent.length === 0 && (
          <p className="text-xs text-ink-secondary text-center py-6">
            Aucune activité pour le moment.
          </p>
        )}
        {recent.map((tx, i) => {
          const member = MEMBERS.find(m => m.id === tx.memberId);
          if (!member) return null;
          const isNew = i < 3;

          return (
            <div
              key={tx.id}
              className="flex items-center gap-3 p-3 rounded animate-entry"
              style={{
                background: isNew ? 'rgba(30,30,46,0.6)' : 'rgba(20,20,33,0.4)',
                borderLeft: `2px solid ${tx.type === 'PROPRE' ? '#22c55e' : '#ef4444'}`,
                animationDelay: `${i * 50}ms`,
              }}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold flex-shrink-0"
                style={{
                  background: `${roleColor(member.role)}20`,
                  border: `1px solid ${roleColor(member.role)}40`,
                  color: roleColor(member.role),
                }}
              >
                {member.initials}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-ink-primary truncate">
                    {member.name.split(' ')[0]}
                  </span>
                  <span className="text-ink-muted text-xs">·</span>
                  <span className="text-xs text-ink-secondary">
                    {ACTIVITY_ICONS[tx.activity]} {tx.activity}
                  </span>
                </div>
                <span className="text-xs text-ink-secondary font-mono">
                  {timeAgo(tx.date)}
                </span>
              </div>

              {/* Right side */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span
                  className="font-mono text-sm font-bold"
                  style={{ color: tx.type === 'PROPRE' ? '#22c55e' : '#ef4444' }}
                >
                  {formatMoney(tx.amount)}
                </span>
                <span
                  className="text-xs font-display font-semibold tracking-widest px-1.5 py-0.5 rounded-sm"
                  style={{
                    background: tx.type === 'PROPRE' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                    color: tx.type === 'PROPRE' ? '#22c55e' : '#ef4444',
                    fontSize: '9px',
                  }}
                >
                  {tx.type}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
