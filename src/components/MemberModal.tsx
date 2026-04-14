import { useEffect, useMemo, useState } from 'react';
import { X, Calendar, Clock, Hash, AlertTriangle, Trash2, Gauge, CheckCircle2, XCircle } from 'lucide-react';
import type { Member } from '../types/index';
import {
  roleLabel, roleColor, roleBgColor,
  formatDate, timeAgo,
} from '../utils/format';
import { useData } from '../context/DataContext';
import { deleteMemberWarn, getSpeedoLogs, type SpeedoLogRow } from '../lib/db';
import { useAuth } from '../context/AuthContext';

const WEEKLY_QUOTA = 3.5;
const MAX_GAP_DAYS = 2;

// ── Helpers ────────────────────────────────────────────────────────────────────

function getMondayOf(d: Date): Date {
  const copy = new Date(d);
  const diff = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function currentWeekDates(): string[] {
  const monday = getMondayOf(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

const todayISO = () => new Date().toISOString().slice(0, 10);

function shortDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

type ComplianceStatus = 'ok' | 'warning' | 'overdue' | 'new';

function getStatus(logs: SpeedoLogRow[], weekDates: string[]): ComplianceStatus {
  const today = todayISO();
  const weekTotal = weekDates.reduce((s, d) => {
    const l = logs.find((x) => x.date === d);
    return s + (l?.amount ?? 0);
  }, 0);
  if (weekTotal >= WEEKLY_QUOTA) return 'ok';
  const active = [...logs].filter((l) => l.amount > 0).sort((a, b) => b.date.localeCompare(a.date));
  const last = active[0];
  if (!last) return 'new';
  const diff = Math.floor(
    (new Date(today + 'T12:00:00').getTime() - new Date(last.date + 'T12:00:00').getTime()) / 86400000,
  );
  if (diff > MAX_GAP_DAYS) return 'overdue';
  if (diff >= MAX_GAP_DAYS) return 'warning';
  return 'ok';
}

const STATUS_CFG: Record<ComplianceStatus, { color: string; bg: string; label: string; icon: typeof CheckCircle2 }> = {
  ok:      { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'Quota OK',    icon: CheckCircle2  },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Attention',   icon: AlertTriangle },
  overdue: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'En retard',   icon: XCircle       },
  new:     { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: 'Aucun log',   icon: AlertTriangle },
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface MemberModalProps {
  member: Member;
  mission?: unknown;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function MemberModal({ member, onClose }: MemberModalProps) {
  const { warns, refetchWarns } = useData();
  const { user } = useAuth();
  const rColor = roleColor(member.role);
  const rBg = roleBgColor(member.role);
  const isBoss = user != null && ['boss', 'oncle', 'segundo'].includes(user.role);

  const [speedoLogs, setSpeedoLogs] = useState<SpeedoLogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    getSpeedoLogs()
      .then((all) => setSpeedoLogs(all.filter((l) => l.member_id === member.id)))
      .finally(() => setLoadingLogs(false));
  }, [member.id]);

  // ── Warns ──────────────────────────────────────────────────────────────────

  const memberWarns = warns
    .filter((w) => w.member_id === member.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const handleDeleteWarn = async (id: string) => {
    await deleteMemberWarn(id);
    await refetchWarns();
  };

  // ── Speedo stats ───────────────────────────────────────────────────────────

  const weekDates = useMemo(() => currentWeekDates(), []);

  const weekTotal = useMemo(
    () => weekDates.reduce((s, d) => {
      const l = speedoLogs.find((x) => x.date === d);
      return s + (l?.amount ?? 0);
    }, 0),
    [speedoLogs, weekDates],
  );

  const status = useMemo(() => getStatus(speedoLogs, weekDates), [speedoLogs, weekDates]);
  const cfg = STATUS_CFG[status];
  const StatusIcon = cfg.icon;

  const quotaPct = Math.min(100, Math.round((weekTotal / WEEKLY_QUOTA) * 100));
  const barColor = weekTotal >= WEEKLY_QUOTA ? '#22c55e' : weekTotal >= WEEKLY_QUOTA * 0.5 ? '#f59e0b' : '#ef4444';

  const totalSpeedos = useMemo(
    () => speedoLogs.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0),
    [speedoLogs],
  );

  // Count weeks where quota was met
  const weeksCompleted = useMemo(() => {
    const byWeek: Record<string, number> = {};
    for (const l of speedoLogs.filter((x) => x.amount > 0)) {
      const monday = getMondayOf(new Date(l.date + 'T12:00:00')).toISOString().slice(0, 10);
      byWeek[monday] = (byWeek[monday] ?? 0) + l.amount;
    }
    return Object.values(byWeek).filter((v) => v >= WEEKLY_QUOTA).length;
  }, [speedoLogs]);

  // Last 8 sessions (amount > 0), sorted by date desc
  const recentSessions = useMemo(
    () => [...speedoLogs].filter((l) => l.amount > 0).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [speedoLogs],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="gang-card w-full max-w-lg max-h-[88vh] overflow-y-auto animate-fade-in-up"
        style={{ borderColor: `${rColor}30` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="sticky top-0 flex items-center justify-between p-5 border-b border-ink-border z-10"
          style={{ background: '#0f0f17' }}
        >
          <div className="flex items-center gap-3">
            {member.discordAvatar ? (
              <img
                src={member.discordAvatar}
                alt={member.name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                style={{ border: `1.5px solid ${rColor}50`, boxShadow: `0 0 20px ${rColor}30` }}
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-display font-black text-lg flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${rColor}20, ${rColor}40)`,
                  border: `1.5px solid ${rColor}50`,
                  color: rColor,
                  boxShadow: `0 0 20px ${rColor}30`,
                }}
              >
                {member.initials}
              </div>
            )}
            <div>
              <h2 className="font-display font-bold text-ink-primary text-base leading-tight">
                {member.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="role-badge"
                  style={{ background: rBg, color: rColor, border: `1px solid ${rColor}30` }}
                >
                  {roleLabel(member.role)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-ink-secondary font-mono">
                  <Hash size={9} />
                  {member.discordTag}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-secondary hover:text-ink-primary transition-colors p-1.5 rounded hover:bg-bg-elevated flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Quota semaine en cours ── */}
        <div className="p-5 border-b border-ink-border">
          <div className="flex items-center gap-2 mb-3">
            <Gauge size={13} style={{ color: rColor }} />
            <p className="text-xs font-display font-bold tracking-widest uppercase text-ink-secondary">
              Quota semaine en cours
            </p>
            <span
              className="ml-auto inline-flex items-center gap-1 text-xs font-display font-semibold px-2 py-0.5 rounded"
              style={{ color: cfg.color, background: cfg.bg }}
            >
              <StatusIcon size={10} />
              {cfg.label}
            </span>
          </div>

          {loadingLogs ? (
            <div className="h-2 rounded-full bg-bg-hover animate-pulse" />
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-2 rounded-full bg-bg-hover overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${quotaPct}%`, background: barColor }}
                  />
                </div>
                <span className="text-sm font-mono font-bold flex-shrink-0" style={{ color: barColor }}>
                  {weekTotal.toFixed(1)}<span className="text-ink-secondary font-normal">/3.5</span>
                </span>
              </div>
              <p className="text-xs text-ink-secondary">
                {weekTotal >= WEEKLY_QUOTA
                  ? 'Quota atteint cette semaine'
                  : `Il manque encore ${(WEEKLY_QUOTA - weekTotal).toFixed(1)} speedo(s)`}
              </p>
            </>
          )}
        </div>

        {/* ── Stats globales ── */}
        <div className="p-5 border-b border-ink-border">
          <p className="text-xs font-display font-bold tracking-widest uppercase text-ink-secondary mb-3">
            Statistiques
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total speedos', value: totalSpeedos.toFixed(1), color: rColor },
              { label: 'Semaines OK',   value: String(weeksCompleted),  color: '#22c55e' },
              { label: 'Warns',         value: String(memberWarns.length), color: memberWarns.length > 0 ? '#ef4444' : '#6b7280' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded p-3 text-center"
                style={{ background: 'rgba(30,30,46,0.5)', border: '1px solid rgba(42,42,62,0.6)' }}
              >
                <p className="font-mono text-base font-bold leading-tight" style={{ color }}>{value}</p>
                <p className="text-xs text-ink-secondary mt-1 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Dernières sessions ── */}
        <div className="px-5 pt-4 pb-4 border-b border-ink-border">
          <p className="text-xs font-display font-bold tracking-widest uppercase text-ink-secondary mb-3">
            Dernières sessions
          </p>
          {loadingLogs ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 rounded bg-bg-hover animate-pulse" />
              ))}
            </div>
          ) : recentSessions.length === 0 ? (
            <p className="text-sm text-ink-secondary italic">Aucune session enregistrée.</p>
          ) : (
            <div className="space-y-0">
              {recentSessions.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between py-2.5 border-b border-ink-border/50 last:border-0"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-1.5 h-5 rounded-full flex-shrink-0"
                      style={{ background: rColor }}
                    />
                    <div>
                      <p className="text-xs text-ink-primary font-medium">
                        {l.note || 'Farm Weed'}
                      </p>
                      <p className="text-xs text-ink-secondary font-mono">{shortDate(l.date)}</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold" style={{ color: rColor }}>
                    +{l.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Avertissements ── */}
        <div className="px-5 pt-4 pb-4 border-b border-ink-border">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={13} style={{ color: memberWarns.length > 0 ? '#ef4444' : '#6b7280' }} />
            <span className="text-xs font-display font-bold tracking-widest uppercase text-ink-secondary">
              Avertissements
            </span>
            <span
              className="ml-auto text-xs font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                background: memberWarns.length > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(107,114,128,0.1)',
                color: memberWarns.length > 0 ? '#ef4444' : '#6b7280',
              }}
            >
              {memberWarns.length}
            </span>
          </div>

          {memberWarns.length === 0 ? (
            <p className="text-sm text-ink-secondary italic">Aucun avertissement.</p>
          ) : (
            <div className="space-y-2">
              {memberWarns.map((w) => (
                <div
                  key={w.id}
                  className="flex items-start gap-3 p-3 rounded"
                  style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink-primary font-medium">{w.reason}</p>
                    <p className="text-[10px] text-ink-secondary font-mono mt-1">
                      Semaine du {formatDate(w.week_start)} · par {w.issued_by}
                    </p>
                  </div>
                  {isBoss && (
                    <button
                      onClick={() => handleDeleteWarn(w.id)}
                      className="text-ink-secondary hover:text-sale transition-colors flex-shrink-0 p-0.5"
                      title="Supprimer l'avertissement"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Meta ── */}
        <div className="px-5 py-4">
          <div
            className="flex items-center justify-between text-xs text-ink-secondary rounded p-3"
            style={{ background: 'rgba(30,30,46,0.4)', border: '1px solid rgba(42,42,62,0.5)' }}
          >
            <div className="flex items-center gap-1.5">
              <Calendar size={11} />
              <span className="font-mono">Depuis le {formatDate(member.joinedAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={11} />
              <span className="font-mono">Vu {timeAgo(member.lastSeen)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
