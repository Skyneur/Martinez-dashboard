import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Save, Trash2 } from 'lucide-react';
import type { Member } from '../types';

const DAILY_LOG_STORAGE_KEY = 'martinez.operations.dailyLogs';
const WEEKLY_ASSIGNMENTS_STORAGE_KEY = 'martinez.operations.weeklyAssignments';
const DAILY_TARGET_PERCENT_STORAGE_KEY = 'martinez.operations.dailyTargetPercent';

const MAX_CONTAINERS = 10;
const MAX_ATMS = 3;
const DEFAULT_TARGET_PERCENT = 70;

const WEEK_DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;
type WeekDay = (typeof WEEK_DAYS)[number];

interface DailyLog {
  id: string;
  memberId: string;
  date: string;
  containers: number;
  atms: number;
}

interface WeeklyAssignment {
  id: string;
  memberId: string;
  weekDay: WeekDay;
  missionLabel: string;
}

interface OperationsPlannerProps {
  members: Member[];
}

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const toNumber = (value: string, max: number): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > max) return max;
  return Math.floor(parsed);
};

const todayISO = (): string => new Date().toISOString().slice(0, 10);

export default function OperationsPlanner({ members }: OperationsPlannerProps) {
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(() =>
    safeParse(localStorage.getItem(DAILY_LOG_STORAGE_KEY), []),
  );
  const [assignments, setAssignments] = useState<WeeklyAssignment[]>(() =>
    safeParse(localStorage.getItem(WEEKLY_ASSIGNMENTS_STORAGE_KEY), []),
  );

  const [memberId, setMemberId] = useState<string>(members[0]?.id ?? '');
  const [date, setDate] = useState<string>(todayISO());
  const [containers, setContainers] = useState<string>('0');
  const [atms, setAtms] = useState<string>('0');

  const [assignmentMemberId, setAssignmentMemberId] = useState<string>(members[0]?.id ?? '');
  const [assignmentDay, setAssignmentDay] = useState<WeekDay>('lundi');
  const [missionLabel, setMissionLabel] = useState<string>('');
  const [targetPercent, setTargetPercent] = useState<number>(() => {
    const raw = localStorage.getItem(DAILY_TARGET_PERCENT_STORAGE_KEY);
    if (!raw) return DEFAULT_TARGET_PERCENT;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return DEFAULT_TARGET_PERCENT;
    if (parsed < 0) return 0;
    if (parsed > 100) return 100;
    return Math.floor(parsed);
  });

  useEffect(() => {
    localStorage.setItem(DAILY_LOG_STORAGE_KEY, JSON.stringify(dailyLogs));
  }, [dailyLogs]);

  useEffect(() => {
    localStorage.setItem(WEEKLY_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem(DAILY_TARGET_PERCENT_STORAGE_KEY, String(targetPercent));
  }, [targetPercent]);

  useEffect(() => {
    if (!members.length) {
      setMemberId('');
      setAssignmentMemberId('');
      return;
    }

    if (!members.some((m) => m.id === memberId)) {
      setMemberId(members[0].id);
    }

    if (!members.some((m) => m.id === assignmentMemberId)) {
      setAssignmentMemberId(members[0].id);
    }
  }, [members, memberId, assignmentMemberId]);

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );

  const todayTotals = useMemo(() => {
    const today = todayISO();
    return dailyLogs
      .filter((log) => log.date === today)
      .reduce(
        (acc, log) => {
          acc.containers += log.containers;
          acc.atms += log.atms;
          return acc;
        },
        { containers: 0, atms: 0 },
      );
  }, [dailyLogs]);

  const containerCapacity = members.length * MAX_CONTAINERS;
  const atmCapacity = members.length * MAX_ATMS;

  const containerTarget = Math.ceil((containerCapacity * targetPercent) / 100);
  const atmTarget = Math.ceil((atmCapacity * targetPercent) / 100);

  const containerProgress = containerTarget > 0
    ? Math.min(100, Math.round((todayTotals.containers / containerTarget) * 100))
    : 0;
  const atmProgress = atmTarget > 0
    ? Math.min(100, Math.round((todayTotals.atms / atmTarget) * 100))
    : 0;

  const saveDailyLog = () => {
    if (!memberId || !date) return;

    const nextLog: DailyLog = {
      id: `${memberId}-${date}`,
      memberId,
      date,
      containers: toNumber(containers, MAX_CONTAINERS),
      atms: toNumber(atms, MAX_ATMS),
    };

    setDailyLogs((prev) => {
      const withoutCurrent = prev.filter((log) => !(log.memberId === memberId && log.date === date));
      return [...withoutCurrent, nextLog].sort((a, b) => {
        const dateSort = b.date.localeCompare(a.date);
        if (dateSort !== 0) return dateSort;
        return a.memberId.localeCompare(b.memberId);
      });
    });
  };

  const removeDailyLog = (id: string) => {
    setDailyLogs((prev) => prev.filter((log) => log.id !== id));
  };

  const saveAssignment = () => {
    const cleanMission = missionLabel.trim();
    if (!assignmentMemberId || !cleanMission) return;

    const next: WeeklyAssignment = {
      id: `${assignmentDay}-${assignmentMemberId}`,
      weekDay: assignmentDay,
      memberId: assignmentMemberId,
      missionLabel: cleanMission,
    };

    setAssignments((prev) => {
      const withoutCurrent = prev.filter(
        (item) => !(item.weekDay === assignmentDay && item.memberId === assignmentMemberId),
      );
      return [...withoutCurrent, next].sort((a, b) => {
        const daySort = WEEK_DAYS.indexOf(a.weekDay) - WEEK_DAYS.indexOf(b.weekDay);
        if (daySort !== 0) return daySort;
        return a.memberId.localeCompare(b.memberId);
      });
    });

    setMissionLabel('');
  };

  const removeAssignment = (id: string) => {
    setAssignments((prev) => prev.filter((item) => item.id !== id));
  };

  if (!members.length) {
    return (
      <section className="gang-card p-5 mb-4">
        <h2 className="font-display font-bold text-lg text-ink-primary">Suivi par membre</h2>
        <p className="text-sm text-ink-secondary mt-2">
          Aucun membre disponible. Ajoute tes membres dans les donnees pour activer le suivi des braquages et des missions.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 mb-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="gang-card p-4">
          <p className="text-xs text-ink-secondary uppercase tracking-widest font-display">Conteneurs aujourd'hui</p>
          <p className="mt-2 font-mono text-2xl text-ink-primary">
            {todayTotals.containers}
            <span className="text-sm text-ink-secondary"> / {containerCapacity}</span>
          </p>
          <p className="mt-1 text-xs text-ink-secondary font-mono">
            Objectif: {containerTarget}
          </p>
          <div className="mt-2 h-1.5 rounded-full" style={{ background: 'rgba(42,42,62,0.8)' }}>
            <div
              className="h-full rounded-full progress-fill"
              style={{ width: `${containerProgress}%`, background: '#B4005D' }}
            />
          </div>
        </div>
        <div className="gang-card p-4">
          <p className="text-xs text-ink-secondary uppercase tracking-widest font-display">ATM aujourd'hui</p>
          <p className="mt-2 font-mono text-2xl text-ink-primary">
            {todayTotals.atms}
            <span className="text-sm text-ink-secondary"> / {atmCapacity}</span>
          </p>
          <p className="mt-1 text-xs text-ink-secondary font-mono">
            Objectif: {atmTarget}
          </p>
          <div className="mt-2 h-1.5 rounded-full" style={{ background: 'rgba(42,42,62,0.8)' }}>
            <div
              className="h-full rounded-full progress-fill"
              style={{ width: `${atmProgress}%`, background: '#22c55e' }}
            />
          </div>
        </div>
        <div className="gang-card p-4">
          <p className="text-xs text-ink-secondary uppercase tracking-widest font-display">Regles</p>
          <p className="mt-2 text-sm text-ink-primary">Max {MAX_CONTAINERS} conteneurs + {MAX_ATMS} ATM par membre / jour</p>
          <div className="mt-3">
            <label className="text-xs text-ink-secondary uppercase tracking-widest font-display">Objectif global (%)</label>
            <input
              className="gang-input mt-1 w-full"
              type="number"
              min={0}
              max={100}
              onChange={(e) => setTargetPercent(toNumber(e.target.value, 100))}
            />
          </div>
        </div>
      </div>

      <div className="gang-card p-5">
        <h3 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary mb-4">
          Suivi journalier des braquages
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select className="gang-select md:col-span-2" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            {members.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
          <input className="gang-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input
            className="gang-input"
            type="number"
            min={0}
            max={MAX_CONTAINERS}
            value={containers}
            onChange={(e) => setContainers(e.target.value)}
            placeholder="Conteneurs"
          />
          <input
            className="gang-input"
            type="number"
            min={0}
            max={MAX_ATMS}
            value={atms}
            onChange={(e) => setAtms(e.target.value)}
            placeholder="ATM"
          />
        </div>

        <button className="btn-crimson mt-3 inline-flex items-center gap-2" onClick={saveDailyLog}>
          <Save size={13} />
          Enregistrer le suivi
        </button>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="text-left text-ink-secondary text-xs uppercase tracking-wider border-b border-ink-border">
                <th className="py-2">Date</th>
                <th className="py-2">Membre</th>
                <th className="py-2">Conteneurs</th>
                <th className="py-2">ATM</th>
                <th className="py-2">Etat</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {dailyLogs.length === 0 && (
                <tr>
                  <td className="py-3 text-ink-secondary" colSpan={6}>Aucun suivi enregistre.</td>
                </tr>
              )}
              {dailyLogs.map((log) => {
                const member = memberMap.get(log.memberId);
                const containerOk = log.containers <= MAX_CONTAINERS;
                const atmOk = log.atms <= MAX_ATMS;
                const stateLabel = containerOk && atmOk ? 'OK' : 'Depasse';
                return (
                  <tr key={log.id} className="border-b border-ink-border/70 table-row-hover">
                    <td className="py-2.5 text-ink-secondary font-mono">{log.date}</td>
                    <td className="py-2.5 text-ink-primary">{member?.name ?? 'Membre supprime'}</td>
                    <td className="py-2.5 text-ink-primary font-mono">{log.containers} / {MAX_CONTAINERS}</td>
                    <td className="py-2.5 text-ink-primary font-mono">{log.atms} / {MAX_ATMS}</td>
                    <td className="py-2.5">
                      <span
                        className="text-xs px-2 py-1 rounded font-mono"
                        style={{
                          background: stateLabel === 'OK' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                          color: stateLabel === 'OK' ? '#22c55e' : '#ef4444',
                        }}
                      >
                        {stateLabel}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button className="btn-ghost !px-2 !py-1" onClick={() => removeDailyLog(log.id)}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="gang-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={14} style={{ color: '#B4005D' }} />
          <h3 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary">
            Planning hebdomadaire des missions
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            className="gang-select"
            value={assignmentMemberId}
            onChange={(e) => setAssignmentMemberId(e.target.value)}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>

          <select
            className="gang-select"
            value={assignmentDay}
            onChange={(e) => setAssignmentDay(e.target.value as WeekDay)}
          >
            {WEEK_DAYS.map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>

          <input
            className="gang-input md:col-span-2"
            type="text"
            value={missionLabel}
            onChange={(e) => setMissionLabel(e.target.value)}
            placeholder="Ex: Farm acide / Recup supplies / Vente stock"
          />
        </div>

        <button className="btn-crimson mt-3 inline-flex items-center gap-2" onClick={saveAssignment}>
          <Save size={13} />
          Assigner la mission
        </button>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
          {WEEK_DAYS.map((day) => {
            const dayAssignments = assignments.filter((item) => item.weekDay === day);
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
                          <p className="text-sm text-ink-primary">{memberMap.get(item.memberId)?.name ?? 'Membre supprime'}</p>
                          <p className="text-xs text-ink-secondary">{item.missionLabel}</p>
                        </div>
                        <button className="btn-ghost !px-2 !py-1" onClick={() => removeAssignment(item.id)}>
                          <Trash2 size={12} />
                        </button>
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
