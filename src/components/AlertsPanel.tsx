import { AlertTriangle, CheckCircle2, Clock, CalendarX, Timer } from 'lucide-react';
import type { Member } from '../types';
import type { SpeedoLogRow } from '../lib/db';
import { roleColor } from '../utils/format';

interface MemberStat {
  member: Member;
  weekTotal: number;
  status: 'ok' | 'warning' | 'overdue' | 'new';
}

interface AlertsPanelProps {
  speedoStats?: MemberStat[];
  speedoLogs?: SpeedoLogRow[];
  weekDates?: string[];
}

// Returns true if the member has 2+ consecutive days with no speedo (up to today)
function hasConsecutiveGap(memberId: string, datesUpToToday: string[], logs: SpeedoLogRow[]): boolean {
  let streak = 0;
  for (const date of datesUpToToday) {
    const worked = logs.some((l) => l.member_id === memberId && l.date === date && l.amount > 0);
    if (!worked) {
      streak++;
      if (streak >= 2) return true;
    } else {
      streak = 0;
    }
  }
  return false;
}

export default function AlertsPanel({
  speedoStats = [],
  speedoLogs = [],
  weekDates = [],
}: AlertsPanelProps) {
  const today = new Date().toISOString().slice(0, 10);
  const datesUpToToday = weekDates.filter((d) => d <= today);

  // Days remaining in the week including today (Mon=7 … Sun=1)
  const dayOfWeekMon0 = (new Date().getDay() + 6) % 7; // Mon=0 … Sun=6
  const daysLeft = 7 - dayOfWeekMon0; // Mon=7 … Sun=1
  const approachingDeadline = daysLeft <= 3; // vendredi, samedi, dimanche

  // Alert 1 — 2 jours consécutifs sans speedo
  const gapAlerts = speedoStats.filter(({ member }) =>
    hasConsecutiveGap(member.id, datesUpToToday, speedoLogs),
  );

  // Alert 2 — quota non atteint et échéance proche
  const deadlineAlerts = approachingDeadline
    ? speedoStats.filter(({ weekTotal }) => weekTotal < 3.5)
    : [];

  // Merge unique for the header count (a member can appear in both categories)
  const alertedIds = new Set([
    ...gapAlerts.map((a) => a.member.id),
    ...deadlineAlerts.map((a) => a.member.id),
  ]);
  const totalAlerts = alertedIds.size;

  const compliantCount = speedoStats.filter((s) => s.weekTotal >= 3.5).length;
  const noAlerts = totalAlerts === 0;

  return (
    <div className="gang-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <AlertTriangle size={12} style={{ color: '#ef4444' }} />
        </div>
        <h3 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary">
          Alertes Quota
        </h3>
        {totalAlerts > 0 && (
          <span
            className="ml-auto font-mono text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
          >
            {totalAlerts}
          </span>
        )}
      </div>

      {noAlerts ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center gap-2">
          <CheckCircle2 size={24} style={{ color: '#22c55e', opacity: 0.6 }} />
          <p className="text-xs text-ink-secondary">Aucune alerte cette semaine</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 flex-1">

          {/* ── 2 jours consécutifs sans activité ── */}
          {gapAlerts.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <CalendarX size={11} style={{ color: '#f59e0b' }} />
                <span className="text-[10px] font-display font-bold tracking-widest uppercase" style={{ color: '#f59e0b' }}>
                  Pause prolongée
                </span>
                <span className="ml-auto text-[10px] font-mono" style={{ color: '#f59e0b' }}>
                  2j sans speedo
                </span>
              </div>
              <div className="space-y-1.5">
                {gapAlerts.map(({ member, weekTotal }) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2.5 p-2.5 rounded"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold flex-shrink-0"
                      style={{
                        background: `${roleColor(member.role)}15`,
                        border: `1px solid ${roleColor(member.role)}35`,
                        color: roleColor(member.role),
                      }}
                    >
                      {member.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-ink-primary truncate">{member.name}</p>
                      <p className="text-[10px] font-mono text-ink-secondary mt-0.5">
                        {weekTotal.toFixed(1)} / 3.5 cette semaine
                      </p>
                    </div>
                    <span
                      className="text-[9px] font-display font-bold tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.15)' }}
                    >
                      INACTIF
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Quota non atteint, échéance proche ── */}
          {deadlineAlerts.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Timer size={11} style={{ color: '#ef4444' }} />
                <span className="text-[10px] font-display font-bold tracking-widest uppercase" style={{ color: '#ef4444' }}>
                  Quota en danger
                </span>
                <span className="ml-auto text-[10px] font-mono" style={{ color: '#ef4444' }}>
                  J-{daysLeft} avant fin
                </span>
              </div>
              <div className="space-y-1.5">
                {deadlineAlerts
                  .sort((a, b) => a.weekTotal - b.weekTotal)
                  .map(({ member, weekTotal }) => {
                    const missing = Math.max(0, 3.5 - weekTotal);
                    const pct = Math.min(100, (weekTotal / 3.5) * 100);
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-2.5 p-2.5 rounded"
                        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold flex-shrink-0"
                          style={{
                            background: `${roleColor(member.role)}15`,
                            border: `1px solid ${roleColor(member.role)}35`,
                            color: roleColor(member.role),
                          }}
                        >
                          {member.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium text-ink-primary truncate">{member.name}</p>
                            <span className="text-[10px] font-mono ml-2 flex-shrink-0" style={{ color: '#ef4444' }}>
                              -{missing.toFixed(1)}
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-bg-hover overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: '#ef4444' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="pt-3 border-t border-ink-border flex items-center gap-2">
        <Clock size={11} className="text-ink-secondary flex-shrink-0" />
        <span className="text-xs text-ink-secondary">
          <span className="font-mono" style={{ color: '#22c55e' }}>{compliantCount}</span>
          {' '}/ {speedoStats.length} membres conformes
        </span>
      </div>
    </div>
  );
}
