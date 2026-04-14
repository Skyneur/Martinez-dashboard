import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Plus, Trash2, Save, ShieldAlert } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  getSpeedoLogs,
  upsertSpeedoLog,
  deleteSpeedoLog,
  addMemberWarn,
  type SpeedoLogRow,
} from '../lib/db';
import type { Member } from '../types';

// ── Constants ──────────────────────────────────────────────────────────────────

const WEEKLY_QUOTA = 3.5;
const MAX_GAP_DAYS = 2; // alert if no speedo within this many days

const WEEK_DAYS_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Monday of the week containing `d` */
function getMondayOf(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // Mon=0 … Sun=6
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Returns array of 7 ISO date strings Mon…Sun for the given week offset */
function weekDates(offsetWeeks = 0): string[] {
  const monday = getMondayOf(new Date());
  monday.setDate(monday.getDate() + offsetWeeks * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/** Friendly date label "14 avr." */
function shortDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const todayISO = () => new Date().toISOString().slice(0, 10);

type ComplianceStatus = 'ok' | 'warning' | 'overdue' | 'new';

function memberStatus(logs: SpeedoLogRow[], dates: string[]): ComplianceStatus {
  const today = todayISO();
  const weekTotal = dates.reduce((sum, d) => {
    const log = logs.find((l) => l.date === d);
    return sum + (log?.amount ?? 0);
  }, 0);

  if (weekTotal >= WEEKLY_QUOTA) return 'ok';

  // Find the most recent day with an actual speedo (amount > 0)
  const allLogsDesc = [...logs].filter((l) => l.amount > 0).sort((a, b) => b.date.localeCompare(a.date));
  const lastLog = allLogsDesc[0];
  if (!lastLog) return 'new';

  const lastDate = new Date(lastLog.date + 'T12:00:00');
  const now = new Date(today + 'T12:00:00');
  const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);

  if (diffDays > MAX_GAP_DAYS) return 'overdue';
  if (diffDays >= MAX_GAP_DAYS) return 'warning';
  return 'ok';
}

function StatusBadge({ status }: { status: ComplianceStatus }) {
  const cfg = {
    ok:      { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: CheckCircle2,   label: 'OK'        },
    warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: AlertTriangle,  label: 'Attention'  },
    overdue: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: XCircle,        label: 'En retard'  },
    new:     { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: AlertTriangle,  label: 'Aucun log'  },
  }[status];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-display font-semibold tracking-wider px-2 py-0.5 rounded"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────

function QuotaBar({ value, max = WEEKLY_QUOTA }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = value >= max ? '#22c55e' : value >= max * 0.5 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-bg-hover overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color }}>
        {value.toFixed(1)}/{max}
      </span>
    </div>
  );
}

// ── Day cell ──────────────────────────────────────────────────────────────────

interface DayCellProps {
  date: string;
  log: SpeedoLogRow | undefined;
  isToday: boolean;
  isFuture: boolean;
  canEdit: boolean;
  onSave: (date: string, amount: number, note: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function DayCell({ date, log, isToday, isFuture, canEdit, onSave, onDelete }: DayCellProps) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(log?.amount.toString() ?? '');
  const [note, setNote] = useState(log?.note ?? '');
  const [saving, setSaving] = useState(false);

  // Reset local state when log prop changes (e.g. after save)
  useEffect(() => {
    setAmount(log?.amount.toString() ?? '');
    setNote(log?.note ?? '');
  }, [log]);

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) return;
    setSaving(true);
    try {
      await onSave(date, num, note);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!log) return;
    setSaving(true);
    try {
      await onDelete(log.id);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const hasLog = log && log.amount > 0;

  if (!canEdit) {
    // Read-only: just show amount
    return (
      <div
        className="text-center py-2 px-1 rounded text-xs font-mono"
        style={{
          background: hasLog ? 'rgba(34,197,94,0.08)' : isFuture ? 'transparent' : 'rgba(239,68,68,0.06)',
          color: hasLog ? '#22c55e' : '#6b7280',
          border: isToday ? '1px solid rgba(196,30,58,0.4)' : '1px solid transparent',
        }}
      >
        {hasLog ? `+${log.amount}` : '—'}
      </div>
    );
  }

  if (editing) {
    return (
      <div
        className="p-2 rounded space-y-1.5"
        style={{ border: '1px solid rgba(196,30,58,0.4)', background: 'rgba(196,30,58,0.04)' }}
      >
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            step={0.5}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-16 bg-bg-base border border-ink-border rounded px-1.5 py-0.5 text-xs font-mono text-ink-primary focus:outline-none focus:border-crimson"
            placeholder="0.0"
            autoFocus
          />
          <span className="text-xs text-ink-secondary">speedo(s)</span>
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full bg-bg-base border border-ink-border rounded px-1.5 py-0.5 text-xs text-ink-primary focus:outline-none focus:border-crimson"
          placeholder="Note (optionnel)"
        />
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-1 py-0.5 rounded text-xs font-medium transition-colors"
            style={{ background: '#c41e3a', color: '#fff' }}
          >
            <Save size={10} />
            OK
          </button>
          {log && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="p-1 rounded text-xs text-ink-secondary hover:text-sale transition-colors"
              title="Supprimer"
            >
              <Trash2 size={10} />
            </button>
          )}
          <button
            onClick={() => setEditing(false)}
            className="px-2 py-0.5 rounded text-xs text-ink-secondary hover:text-ink-primary transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => !isFuture && setEditing(true)}
      disabled={isFuture}
      className="w-full text-center py-2 px-1 rounded text-xs font-mono transition-all group"
      style={{
        background: hasLog ? 'rgba(34,197,94,0.08)' : isToday ? 'rgba(196,30,58,0.06)' : 'transparent',
        color: hasLog ? '#22c55e' : isToday ? '#c41e3a' : '#6b7280',
        border: isToday ? '1px solid rgba(196,30,58,0.3)' : '1px solid transparent',
        cursor: isFuture ? 'default' : 'pointer',
      }}
      title={isFuture ? 'Jour futur' : 'Cliquer pour éditer'}
    >
      {hasLog ? `+${log.amount}` : isToday ? (
        <Plus size={10} className="mx-auto opacity-60 group-hover:opacity-100" />
      ) : '—'}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SpeedoTracker() {
  const { members, warns, refetchWarns } = useData();
  const { user } = useAuth();
  const [logs, setLogs] = useState<SpeedoLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  // warnForm: memberId → { open, reason, saving }
  const [warnForms, setWarnForms] = useState<Record<string, { open: boolean; reason: string; saving: boolean }>>({});

  const isBoss = user != null && ['boss', 'oncle', 'segundo'].includes(user.role);

  // Load logs
  const loadLogs = useCallback(async () => {
    try {
      const data = await getSpeedoLogs();
      setLogs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const dates = useMemo(() => weekDates(weekOffset), [weekOffset]);
  const today = todayISO();

  // Everyone sees all active members; only bosses can edit
  const visibleMembers = useMemo(
    () => members.filter((m) => m.active),
    [members],
  );

  const logsForMember = useCallback(
    (memberId: string, weekDatesArr: string[]) =>
      logs.filter((l) => l.member_id === memberId && weekDatesArr.includes(l.date)),
    [logs],
  );

  const handleSave = useCallback(
    async (memberId: string, date: string, amount: number, note: string) => {
      await upsertSpeedoLog({ member_id: memberId, date, amount, note });
      await loadLogs();
    },
    [loadLogs],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteSpeedoLog(id);
      await loadLogs();
    },
    [loadLogs],
  );

  const handleWarn = useCallback(
    async (memberId: string, weekStart: string, reason: string) => {
      if (!user) return;
      setWarnForms((prev) => ({ ...prev, [memberId]: { ...prev[memberId], saving: true } }));
      try {
        await addMemberWarn({ member_id: memberId, week_start: weekStart, reason, issued_by: user.name });
        await refetchWarns();
        setWarnForms((prev) => ({ ...prev, [memberId]: { open: false, reason: '', saving: false } }));
      } catch {
        setWarnForms((prev) => ({ ...prev, [memberId]: { ...prev[memberId], saving: false } }));
      }
    },
    [user, refetchWarns],
  );

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return 'Cette semaine';
    if (weekOffset === -1) return 'Semaine dernière';
    const monday = new Date(dates[0] + 'T12:00:00');
    return monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  }, [weekOffset, dates]);

  const summaryStats = useMemo(() => {
    if (loading) return null;
    const totals = visibleMembers.map((m) =>
      logsForMember(m.id, dates).reduce((s, l) => s + l.amount, 0),
    );
    const total = totals.reduce((a, b) => a + b, 0);
    const compliant = visibleMembers.filter((_, i) => totals[i] >= WEEKLY_QUOTA).length;
    return { total, compliant };
  }, [loading, visibleMembers, logsForMember, dates]);

  return (
    <div className="space-y-4">
      {/* ── Header (always stable, never re-mounts) ── */}
      <div className="gang-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg text-ink-primary">Quota Speedo</h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Objectif&nbsp;: <strong className="text-ink-primary">3,5 speedos / semaine</strong>
            <span className="mx-1.5 opacity-40">·</span>
            min. 1 tous les 2 jours
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="btn-ghost px-3 py-1.5 text-sm">
            ←
          </button>
          <span className="text-sm font-medium text-ink-primary min-w-[140px] text-center">
            {weekLabel}
          </span>
          <button
            onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
            disabled={weekOffset >= 0}
            className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>

      {/* ── Boss KPIs ── */}
      {isBoss && summaryStats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total speedos', value: summaryStats.total.toFixed(1), sub: 'cette semaine' },
            { label: 'Conformes', value: `${summaryStats.compliant}/${visibleMembers.length}`, sub: 'quota atteint' },
            {
              label: 'Taux',
              value: visibleMembers.length
                ? `${Math.round((summaryStats.compliant / visibleMembers.length) * 100)}%`
                : '—',
              sub: 'de conformité',
            },
          ].map(({ label, value, sub }) => (
            <div key={label} className="gang-card p-4 text-center">
              <p className="text-xs text-ink-secondary uppercase tracking-wider font-display">{label}</p>
              <p className="font-display font-black text-2xl text-ink-primary mt-1">{value}</p>
              <p className="text-xs text-ink-secondary mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Loading / error ── */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full animate-spin"
            style={{ border: '2px solid rgba(196,30,58,0.2)', borderTopColor: '#c41e3a' }} />
        </div>
      )}
      {error && !loading && (
        <div className="gang-card p-6 text-center">
          <p className="text-sale text-sm font-mono">{error}</p>
          <button className="btn-crimson mt-4" onClick={loadLogs}>Réessayer</button>
        </div>
      )}

      {/* Member grids */}
      {!loading && !error && (
      <div className="space-y-3">
        {visibleMembers.map((member) => {
          const memberLogs = logsForMember(member.id, dates);
          const weekTotal = memberLogs.reduce((s, l) => s + l.amount, 0);
          const status = memberStatus(memberLogs, dates);
          const canEditThisMember = isBoss;
          const weekStart = dates[0]; // Monday of displayed week
          const isPastWeek = weekOffset < 0;
          const quotaMissed = weekTotal < WEEKLY_QUOTA;
          const alreadyWarned = warns.some((w) => w.member_id === member.id && w.week_start === weekStart);
          const memberWarnCount = warns.filter((w) => w.member_id === member.id).length;
          const form = warnForms[member.id] ?? { open: false, reason: `Quota non atteint (${weekTotal.toFixed(1)}/3.5)`, saving: false };

          return (
            <div key={member.id} className="gang-card p-4 space-y-3">
              {/* Member header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold flex-shrink-0"
                    style={{
                      background: 'rgba(196,30,58,0.15)',
                      border: '1px solid rgba(196,30,58,0.3)',
                      color: '#c41e3a',
                    }}
                  >
                    {member.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink-primary leading-tight truncate">{member.name}</p>
                      {memberWarnCount > 0 && (
                        <span
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-display font-bold flex-shrink-0"
                          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
                        >
                          <AlertTriangle size={8} />
                          {memberWarnCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-secondary capitalize">{member.role}</p>
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>

              {/* Progress bar */}
              <QuotaBar value={weekTotal} />

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-1">
                {dates.map((date, idx) => {
                  const log = memberLogs.find((l) => l.date === date);
                  const isToday = date === today;
                  const isFuture = date > today;

                  return (
                    <div key={date}>
                      <p className="text-center text-[10px] text-ink-secondary mb-1 font-display">
                        {WEEK_DAYS_LABELS[idx]}
                      </p>
                      <p className="text-center text-[10px] text-ink-secondary/60 mb-1">
                        {shortDate(date)}
                      </p>
                      <DayCell
                        date={date}
                        log={log}
                        isToday={isToday}
                        isFuture={isFuture}
                        canEdit={canEditThisMember}
                        onSave={(d, amt, note) => handleSave(member.id, d, amt, note)}
                        onDelete={handleDelete}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Notes for this week */}
              {memberLogs.some((l) => l.note) && (
                <div className="space-y-1">
                  {memberLogs
                    .filter((l) => l.note)
                    .map((l) => (
                      <p key={l.id} className="text-xs text-ink-secondary font-mono">
                        <span className="text-ink-secondary/50">{shortDate(l.date)}</span>{' '}
                        {l.note}
                      </p>
                    ))}
                </div>
              )}

              {/* ── Warn section (boss, past week, quota missed) ── */}
              {isBoss && isPastWeek && quotaMissed && (
                <div className="border-t border-ink-border/60 pt-3">
                  {alreadyWarned ? (
                    <div className="flex items-center gap-2 text-xs" style={{ color: '#ef4444' }}>
                      <ShieldAlert size={12} />
                      <span className="font-display font-semibold">Avertissement émis pour cette semaine</span>
                    </div>
                  ) : form.open ? (
                    <div className="space-y-2">
                      <p className="text-xs font-display font-bold uppercase tracking-wider" style={{ color: '#ef4444' }}>
                        Émettre un avertissement
                      </p>
                      <input
                        type="text"
                        value={form.reason}
                        onChange={(e) =>
                          setWarnForms((prev) => ({ ...prev, [member.id]: { ...form, reason: e.target.value } }))
                        }
                        className="w-full bg-bg-base border border-ink-border rounded px-2.5 py-1.5 text-xs text-ink-primary focus:outline-none focus:border-crimson"
                        placeholder="Motif de l'avertissement"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleWarn(member.id, weekStart, form.reason)}
                          disabled={form.saving || !form.reason.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-display font-bold transition-opacity disabled:opacity-50"
                          style={{ background: '#c41e3a', color: '#fff' }}
                        >
                          <ShieldAlert size={11} />
                          {form.saving ? 'Envoi…' : 'Confirmer'}
                        </button>
                        <button
                          onClick={() => setWarnForms((prev) => ({ ...prev, [member.id]: { ...form, open: false } }))}
                          className="px-3 py-1.5 rounded text-xs text-ink-secondary hover:text-ink-primary transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        setWarnForms((prev) => ({
                          ...prev,
                          [member.id]: { open: true, reason: `Quota non atteint (${weekTotal.toFixed(1)}/3.5)`, saving: false },
                        }))
                      }
                      className="flex items-center gap-1.5 text-xs font-display font-semibold transition-colors hover:opacity-80"
                      style={{ color: '#ef4444' }}
                    >
                      <ShieldAlert size={12} />
                      Émettre un avertissement
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {visibleMembers.length === 0 && (
          <div className="gang-card p-8 text-center">
            <p className="text-ink-secondary text-sm">Aucun membre actif trouvé.</p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
