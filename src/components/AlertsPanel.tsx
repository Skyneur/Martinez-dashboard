import { AlertTriangle, Clock, User } from 'lucide-react';
import { useData } from '../context/DataContext';
import { roleLabel, roleColor, timeAgo } from '../utils/format';

export default function AlertsPanel() {
  const { members } = useData();

  const activeMembers = members.filter((m) => m.active).length;
  const inactiveMembers = members.filter((m) => !m.active);

  return (
    <div className="gang-card p-5">
      <div className="flex items-center gap-2 mb-5">
        <div
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <AlertTriangle size={12} style={{ color: '#ef4444' }} />
        </div>
        <h3 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary">
          Alertes
        </h3>
        <span
          className="ml-auto font-mono text-xs px-1.5 py-0.5 rounded"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444',
          }}
        >
          {inactiveMembers.length}
        </span>
      </div>

      {inactiveMembers.length === 0 ? (
        <p className="text-xs text-ink-secondary text-center py-4">
          Aucune alerte active
        </p>
      ) : (
        <div className="space-y-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded text-xs"
            style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.15)',
            }}
          >
            <Clock size={11} style={{ color: '#ef4444' }} />
            <span className="text-ink-secondary">Membres sans activité cette semaine</span>
          </div>

          {inactiveMembers.map((member, i) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded animate-entry"
              style={{
                background: 'rgba(239,68,68,0.04)',
                border: '1px solid rgba(239,68,68,0.1)',
                animationDelay: `${i * 80}ms`,
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold flex-shrink-0"
                style={{
                  background: `${roleColor(member.role)}15`,
                  border: `1px solid ${roleColor(member.role)}35`,
                  color: roleColor(member.role),
                  opacity: 0.7,
                }}
              >
                {member.initials}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink-primary font-medium truncate">{member.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-xs font-display font-semibold"
                    style={{ color: roleColor(member.role), opacity: 0.8, fontSize: '10px' }}
                  >
                    {roleLabel(member.role)}
                  </span>
                  <span className="text-ink-muted text-xs">·</span>
                  <span className="text-xs text-ink-secondary font-mono">
                    {timeAgo(member.lastSeen)}
                  </span>
                </div>
              </div>

              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: '#ef4444', opacity: 0.6 }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-ink-border">
        <div className="flex items-center gap-2">
          <User size={11} className="text-ink-secondary" />
          <span className="text-xs text-ink-secondary">
            <span className="font-mono text-propre">{activeMembers}</span>
            {' '}/ {members.length} membres actifs cette semaine
          </span>
        </div>
      </div>
    </div>
  );
}
