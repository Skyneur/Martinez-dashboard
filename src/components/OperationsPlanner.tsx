import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Lock, Save, Trash2 } from 'lucide-react';
import type { Member } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getDailyLogs,
  getWeeklyAssignments,
  upsertDailyLog,
  deleteDailyLog,
  upsertWeeklyAssignment,
  deleteWeeklyAssignment,
  type DailyLogRow,
  type WeeklyAssignmentRow,
} from '../lib/db';

const ACID_PER_TRUCK = 300;

const WEEK_DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;
type WeekDay = (typeof WEEK_DAYS)[number];

interface ActivityField {
  key: 'atms' | 'acid_farm';
  label: string;
  max: number;
  color: string;
  isAcid?: boolean;
}

const ACTIVITY_FIELDS: ActivityField[] = [
  { key: 'atms',      label: 'ATM',        max: 3,    color: '#22c55e' },
  { key: 'acid_farm', label: 'Farm Acide', max: 9999, color: '#d4af37', isAcid: true },
];

const BLANK = { atms: 0, acid_farm: 0 };

interface OperationsPlannerProps {
  members: Member[];
}

const toNumber = (value: string, max: number): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  if (parsed > max) return max;
  return Math.floor(parsed);
};

const todayISO = (): string => new Date().toISOString().slice(0, 10);

export default function OperationsPlanner({ members }: OperationsPlannerProps) {
  const { user } = useAuth();
  const isBoss = user?.role === 'boss';

  const [logs, setLogs] = useState<DailyLogRow[]>([]);
  const [assignments, setAssignments] = useState<WeeklyAssignmentRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Form — daily log
  const [memberId, setMemberId] = useState<string>(members[0]?.id ?? '');
  const [date, setDate] = useState<string>(todayISO());
  const [activities, setActivities] = useState(BLANK);

  // Form — assignment
  const [assignMemberId, setAssignMemberId] = useState<string>(members[0]?.id ?? '');
  const [assignDay, setAssignDay] = useState<WeekDay>('lundi');
  const [missionLabel, setMissionLabel] = useState('');

  // ── Load from Supabase ──────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [l, a] = await Promise.all([getDailyLogs(), getWeeklyAssignments()]);
      setLogs(l);
      setAssignments(a);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Sync member selectors when members list changes
  useEffect(() => {
    if (!members.length) return;
    if (!members.some((m) => m.id === memberId)) setMemberId(members[0].id);
    if (!members.some((m) => m.id === assignMemberId)) setAssignMemberId(members[0].id);
  }, [members, memberId, assignMemberId]);

  // ── Computed ────────────────────────────────────────────────────────────────

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const todayTotals = useMemo(() => {
    const today = todayISO();
    return logs
      .filter((l) => l.date === today)
      .reduce(
        (acc, l) => ({ atms: acc.atms + l.atms, acid_farm: acc.acid_farm + l.acid_farm }),
        { atms: 0, acid_farm: 0 },
      );
  }, [logs]);

  // ── Daily log CRUD ──────────────────────────────────────────────────────────

  const saveDailyLog = async () => {
    if (!memberId || !date) return;
    const log: DailyLogRow = {
      id: `${memberId}-${date}`,
      member_id: memberId,
      date,
      atms: toNumber(String(activities.atms), 3),
      acid_farm: toNumber(String(activities.acid_farm), 9999),
    };
    await upsertDailyLog(log);
    setLogs((prev) => {
      const without = prev.filter((l) => l.id !== log.id);
      return [log, ...without].sort((a, b) => b.date.localeCompare(a.date));
    });
    setActivities(BLANK);
  };

  const removeLog = async (id: string) => {
    await deleteDailyLog(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  // ── Assignment CRUD (boss only) ─────────────────────────────────────────────

  const saveAssignment = async () => {
    if (!isBoss || !assignMemberId || !missionLabel.trim()) return;
    const a: WeeklyAssignmentRow = {
      id: `${assignDay}-${assignMemberId}`,
      member_id: assignMemberId,
      week_day: assignDay,
      mission_label: missionLabel.trim(),
    };
    await upsertWeeklyAssignment(a);
    setAssignments((prev) => {
      const without = prev.filter((x) => x.id !== a.id);
      return [...without, a].sort((x, y) => WEEK_DAYS.indexOf(x.week_day as WeekDay) - WEEK_DAYS.indexOf(y.week_day as WeekDay));
    });
    setMissionLabel('');
  };

  const removeAssignment = async (id: string) => {
    if (!isBoss) return;
    await deleteWeeklyAssignment(id);
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!members.length) {
    return (
      <section className="gang-card p-5 mb-4">
        <p className="text-sm text-ink-secondary">Aucun membre disponible.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 mb-4">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4">
        {ACTIVITY_FIELDS.map((field) => {
          const total = todayTotals[field.key];

          if (field.isAcid) {
            const trucks = total / ACID_PER_TRUCK;
            return (
              <div key={field.key} className="gang-card p-4">
                <p className="text-xs text-ink-secondary uppercase tracking-widest font-display">{field.label} aujourd'hui</p>
                <p className="mt-2 font-mono text-2xl" style={{ color: field.color }}>
                  {total}<span className="text-sm text-ink-secondary"> acide</span>
                </p>
                <p className="mt-1 text-xs font-mono" style={{ color: field.color, opacity: 0.7 }}>
                  ~{trucks.toFixed(1)} camion{trucks >= 2 ? 's' : ''}
                </p>
              </div>
            );
          }

          const capacity = members.length * field.max;
          const progress = capacity > 0 ? Math.min(100, Math.round((total / capacity) * 100)) : 0;

          return (
            <div key={field.key} className="gang-card p-4">
              <p className="text-xs text-ink-secondary uppercase tracking-widest font-display">{field.label} aujourd'hui</p>
              <p className="mt-2 font-mono text-2xl text-ink-primary">
                {total}<span className="text-sm text-ink-secondary"> / {capacity}</span>
              </p>
              <div className="mt-3 h-1.5 rounded-full" style={{ background: 'rgba(42,42,62,0.8)' }}>
                <div className="h-full rounded-full progress-fill" style={{ width: `${progress}%`, background: field.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Suivi journalier */}
      <div className="gang-card p-5">
        <h3 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary mb-4">
          Suivi journalier des activités
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select className="gang-select md:col-span-2" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input className="gang-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {ACTIVITY_FIELDS.map((field) => (
            <input
              key={field.key}
              className="gang-input"
              type="number"
              min={0}
              max={field.max}
              value={activities[field.key]}
              onChange={(e) => setActivities((prev) => ({ ...prev, [field.key]: toNumber(e.target.value, field.max) }))}
              placeholder={field.isAcid ? 'Acide (ex: 293)' : field.label}
            />
          ))}
        </div>

        <button className="btn-crimson mt-3 inline-flex items-center gap-2" onClick={saveDailyLog}>
          <Save size={13} />
          Enregistrer
        </button>

        {dataLoading ? (
          <p className="mt-4 text-xs text-ink-secondary font-mono">Chargement...</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wider border-b border-ink-border">
                  <th className="py-2">Date</th>
                  <th className="py-2">Membre</th>
                  {ACTIVITY_FIELDS.map((f) => <th key={f.key} className="py-2">{f.label}</th>)}
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr><td className="py-3 text-ink-secondary" colSpan={3 + ACTIVITY_FIELDS.length}>Aucun suivi enregistré.</td></tr>
                )}
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-ink-border/70 table-row-hover">
                    <td className="py-2.5 text-ink-secondary font-mono">{log.date}</td>
                    <td className="py-2.5 text-ink-primary">{memberMap.get(log.member_id)?.name ?? 'Inconnu'}</td>
                    {ACTIVITY_FIELDS.map((field) => {
                      const val = log[field.key];
                      return (
                        <td key={field.key} className="py-2.5 font-mono" style={{ color: field.color }}>
                          {val}
                          {field.isAcid
                            ? <span className="text-ink-secondary text-xs"> (~{(val / ACID_PER_TRUCK).toFixed(1)})</span>
                            : <span className="text-ink-secondary text-xs"> /{field.max}</span>
                          }
                        </td>
                      );
                    })}
                    <td className="py-2.5 text-right">
                      <button className="btn-ghost !px-2 !py-1" onClick={() => removeLog(log.id)}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Planning hebdomadaire */}
      <div className="gang-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={14} style={{ color: '#B4005D' }} />
          <h3 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary">
            Planning hebdomadaire des missions
          </h3>
          {!isBoss && (
            <span
              className="ml-auto flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded"
              style={{ background: 'rgba(180,0,93,0.1)', color: '#B4005D', border: '1px solid rgba(180,0,93,0.25)' }}
            >
              <Lock size={10} />
              Réservé aux Boss
            </span>
          )}
        </div>

        {isBoss && (
          <div className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <select className="gang-select" value={assignMemberId} onChange={(e) => setAssignMemberId(e.target.value)}>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select className="gang-select" value={assignDay} onChange={(e) => setAssignDay(e.target.value as WeekDay)}>
                {WEEK_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <input
                className="gang-input md:col-span-2"
                type="text"
                value={missionLabel}
                onChange={(e) => setMissionLabel(e.target.value)}
                placeholder="Ex: Farm Acide / ATM secteur nord"
              />
            </div>
            <button className="btn-crimson inline-flex items-center gap-2" onClick={saveAssignment}>
              <Save size={13} />
              Assigner la mission
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {WEEK_DAYS.map((day) => {
            const dayAssignments = assignments.filter((a) => a.week_day === day);
            return (
              <div key={day} className="rounded border border-ink-border p-3 bg-bg-elevated/40">
                <p className="text-xs uppercase tracking-widest font-display text-ink-secondary mb-2">{day}</p>
                {dayAssignments.length === 0 ? (
                  <p className="text-xs text-ink-secondary">Aucune mission.</p>
                ) : (
                  <div className="space-y-2">
                    {dayAssignments.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded p-2"
                        style={{ background: 'rgba(20,20,33,0.5)', border: '1px solid rgba(42,42,62,0.7)' }}
                      >
                        <div>
                          <p className="text-sm text-ink-primary">{memberMap.get(item.member_id)?.name ?? 'Inconnu'}</p>
                          <p className="text-xs text-ink-secondary">{item.mission_label}</p>
                        </div>
                        {isBoss && (
                          <button className="btn-ghost !px-2 !py-1" onClick={() => removeAssignment(item.id)}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
