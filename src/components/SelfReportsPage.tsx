import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gauge, Save, CheckCircle2, Check, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  getSpeedoLogs,
  getMissionReports,
  addMissionReport,
  reviewMissionReport,
  type SpeedoLogRow,
  type MissionReportRow,
} from '../lib/db';

const WEEKLY_QUOTA = 3.5;

const SPEEDO_ACTIVITIES = ['Farm Acide', 'Farm Weed'];

type ReviewStatus = 'pending' | 'approved' | 'rejected';

const statusLabel = (status: string): string => {
  if (status === 'approved') return 'ACCEPTÉ';
  if (status === 'rejected') return 'REFUSÉ';
  return 'EN ATTENTE';
};

const statusStyle = (status: string) => {
  if (status === 'approved') return { background: 'rgba(34,197,94,0.12)', color: '#22c55e' };
  if (status === 'rejected') return { background: 'rgba(239,68,68,0.12)', color: '#ef4444' };
  return { background: 'rgba(212,175,55,0.12)', color: '#d4af37' };
};

const toDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Lecture image impossible'));
    reader.readAsDataURL(file);
  });

const nowIso = () => new Date().toISOString();

/** Returns ISO dates Mon…Sun for the current week */
function currentWeekDates(): string[] {
  const today = new Date();
  const day = today.getDay();
  const diff = (day + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function QuotaBar({ value, max = WEEKLY_QUOTA }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = value >= max ? '#22c55e' : value >= max * 0.5 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-bg-hover overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-sm font-mono font-bold flex-shrink-0" style={{ color }}>
        {value.toFixed(1)}<span className="text-ink-secondary font-normal">/{max}</span>
      </span>
    </div>
  );
}

export default function SelfReportsPage() {
  const { user } = useAuth();
  const { members } = useData();

  // Form state
  const [activity, setActivity] = useState(SPEEDO_ACTIVITIES[0]);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<MissionReportRow | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Review notes state (per report id)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  // Data
  const [reports, setReports] = useState<MissionReportRow[]>([]);
  const [speedoLogs, setSpeedoLogs] = useState<SpeedoLogRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const isReviewer = ['boss', 'oncle', 'segundo', 'capo'].includes(user?.role ?? '');

  const findMember = useCallback(
    (uid: string) => members.find((m) => m.id === uid || m.discordId === uid) ?? null,
    [members],
  );

  const currentMember = useMemo(
    () => (user ? findMember(user.id) : null),
    [findMember, user],
  );

  const memberName = (memberId: string): string =>
    members.find((m) => m.id === memberId || m.discordId === memberId)?.name ?? 'Membre inconnu';

  // ── Load data ────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [mr, sl] = await Promise.all([getMissionReports(), getSpeedoLogs()]);
      setReports(mr);
      setSpeedoLogs(sl);
    } catch {
      // silently fail — tables may not exist yet
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  // ── Current week progress ────────────────────────────────────────────────────

  const weekDates = useMemo(() => currentWeekDates(), []);

  const myWeeklyTotal = useMemo(() => {
    const memberId = currentMember?.id ?? user?.id;
    if (!memberId) return 0;
    return speedoLogs
      .filter((l) => l.member_id === memberId && weekDates.includes(l.date) && l.amount > 0)
      .reduce((s, l) => s + l.amount, 0);
  }, [speedoLogs, currentMember, user, weekDates]);

  const pendingCount = useMemo(() => {
    const memberId = currentMember?.id ?? user?.id;
    if (!memberId) return 0;
    return reports.filter(
      (r) => (r.member_id === memberId) && r.status === 'pending',
    ).length;
  }, [reports, currentMember, user]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user) return;
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;
    setSubmitError(null);
    setSubmitting(true);

    const memberId = currentMember?.id ?? user.id;

    try {
      const proof_data = proofFile ? await toDataUrl(proofFile) : null;
      const notesTrimmed = notes.trim();
      const report = {
        member_id: memberId,
        mission_label: activity,
        details: notesTrimmed ? `${num}|${notesTrimmed}` : String(num),
        completed_at: nowIso(),
        proof_data,
        status: 'pending',
      };
      await addMissionReport(report);
      await loadData();

      setReceipt({ ...report, id: crypto.randomUUID(), reviewed_by: null, reviewed_at: null, review_note: '' });
      setAmount('');
      setNotes('');
      setProofFile(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(`Erreur : ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Review ──────────────────────────────────────────────────────────────────

  const handleReview = async (id: string, status: Exclude<ReviewStatus, 'pending'>) => {
    if (!user || !isReviewer) return;
    const note = (reviewNotes[id] ?? '').trim();
    await reviewMissionReport(id, status, user.id, note);
    await loadData();
  };

  // ── Visibility ──────────────────────────────────────────────────────────────

  const visibleReports = isReviewer
    ? reports
    : reports.filter((r) => r.member_id === (currentMember?.id ?? user?.id));

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="gang-card p-5">
        <div className="flex items-center gap-3 mb-1">
          <Gauge size={18} style={{ color: '#c41e3a' }} />
          <h2 className="font-display font-bold text-lg text-ink-primary">Déclarations Speedos</h2>
        </div>
        <p className="text-sm text-ink-secondary">
          Déclare tes sessions ici. Un boss validera chaque soumission.
        </p>
        <p className="text-xs text-ink-secondary mt-1.5 font-mono">
          Connecté : <span className="text-ink-primary">{currentMember?.name ?? user?.name ?? 'Inconnu'}</span>
        </p>
      </div>

      {/* ── My weekly progress ── */}
      <div className="gang-card p-5">
        <p className="text-xs font-display font-bold tracking-widest uppercase text-ink-secondary mb-3">
          Ma semaine en cours
        </p>
        <QuotaBar value={myWeeklyTotal} />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-ink-secondary">
            Objectif : <span className="text-ink-primary font-mono font-bold">3,5 speedos / semaine</span>
          </p>
          {pendingCount > 0 && (
            <span
              className="flex items-center gap-1 text-xs font-display font-semibold px-2 py-0.5 rounded"
              style={{ background: 'rgba(212,175,55,0.12)', color: '#d4af37' }}
            >
              <AlertTriangle size={10} />
              {pendingCount} déclaration{pendingCount > 1 ? 's' : ''} en attente
            </span>
          )}
        </div>
        {myWeeklyTotal >= WEEKLY_QUOTA && (
          <p className="text-xs mt-2 font-display font-semibold" style={{ color: '#22c55e' }}>
            Quota atteint cette semaine
          </p>
        )}
      </div>

      {/* ── Declaration form ── */}
      <div className="gang-card p-5">
        <p className="text-xs font-display font-bold tracking-widest uppercase text-ink-secondary mb-4">
          Nouvelle déclaration
        </p>

        {submitError && (
          <p className="mb-3 text-xs text-red-400 font-mono">{submitError}</p>
        )}

        <div className="space-y-3">
          {/* Activity + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-secondary uppercase tracking-widest font-display block mb-1">
                Activité
              </label>
              <select
                className="gang-input w-full"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
              >
                {SPEEDO_ACTIVITIES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-secondary uppercase tracking-widest font-display block mb-1">
                Nombre de speedos
              </label>
              <input
                className="gang-input w-full"
                type="number"
                min={0.5}
                step={0.5}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="ex: 1.5"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-ink-secondary uppercase tracking-widest font-display block mb-1">
              Notes (optionnel)
            </label>
            <input
              className="gang-input w-full"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zone, durée, remarque..."
            />
          </div>

          {/* Proof */}
          <div>
            <label className="text-xs text-ink-secondary uppercase tracking-widest font-display block mb-1">
              Capture d'écran (preuve)
            </label>
            <input
              className="gang-input w-full"
              type="file"
              accept="image/*"
              onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <button
            className="btn-crimson inline-flex items-center gap-2"
            onClick={() => void handleSubmit()}
            disabled={submitting || !amount || parseFloat(amount) <= 0}
          >
            <Save size={13} />
            {submitting ? 'Envoi...' : 'Envoyer la déclaration'}
          </button>
        </div>

        {/* Receipt */}
        {receipt && (
          <div
            className="mt-4 rounded p-4"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
              <p className="text-sm text-ink-primary font-medium">Déclaration envoyée</p>
            </div>
            <p className="text-xs text-ink-secondary font-mono">
              {receipt.mission_label} · <span className="text-ink-primary font-bold">{receipt.details} speedo(s)</span>
            </p>
            <p className="text-xs text-ink-secondary font-mono mt-1">
              {new Date(receipt.completed_at).toLocaleString('fr-FR')}
            </p>
            {receipt.proof_data && (
              <img
                src={receipt.proof_data}
                alt="Preuve"
                className="mt-3 max-h-48 w-auto rounded border border-ink-border"
              />
            )}
          </div>
        )}
      </div>

      {/* ── History / review ── */}
      <div className="gang-card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-display font-bold tracking-widest uppercase text-ink-secondary">
            {isReviewer ? 'Toutes les déclarations' : 'Mes déclarations'}
          </p>
          <button
            className="text-ink-secondary hover:text-ink-primary transition-colors p-1"
            onClick={() => void loadData()}
            title="Rafraîchir"
          >
            <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} />
          </button>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <div
              className="w-6 h-6 rounded-full animate-spin"
              style={{ border: '2px solid rgba(196,30,58,0.2)', borderTopColor: '#c41e3a' }}
            />
          </div>
        ) : visibleReports.length === 0 ? (
          <p className="text-sm text-ink-secondary italic">Aucune déclaration.</p>
        ) : (
          <div className="space-y-3">
            {visibleReports.map((item) => {
              const [rawAmount, rawNote] = item.details.split('|');
              const speedoAmount = parseFloat(rawAmount);
              const hasAmount = !isNaN(speedoAmount);
              const detailNote = rawNote?.trim() || null;
              return (
                <div
                  key={item.id}
                  className="rounded border border-ink-border p-3"
                  style={{ background: 'rgba(30,30,46,0.4)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm text-ink-primary font-medium">
                        {isReviewer && (
                          <span className="text-ink-secondary mr-1">{memberName(item.member_id)} ·</span>
                        )}
                        {item.mission_label}
                        {hasAmount && (
                          <span className="ml-2 font-mono font-bold" style={{ color: '#c41e3a' }}>
                            +{speedoAmount}
                          </span>
                        )}
                        {hasAmount && (
                          <span className="ml-1 text-xs text-ink-secondary">speedo{speedoAmount > 1 ? 's' : ''}</span>
                        )}
                      </p>
                      <p className="text-xs text-ink-secondary font-mono mt-0.5">
                        {new Date(item.completed_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <span
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                      style={statusStyle(item.status)}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  {detailNote && (
                    <p className="text-xs text-ink-secondary mt-1 font-mono">{detailNote}</p>
                  )}

                  {item.review_note && item.status !== 'pending' && (
                    <p className="text-xs text-ink-secondary italic mt-1">
                      Note boss : {item.review_note}
                    </p>
                  )}

                  {item.proof_data && (
                    <img
                      src={item.proof_data}
                      alt="Preuve"
                      className="mt-2 max-h-40 w-auto rounded border border-ink-border"
                    />
                  )}

                  {isReviewer && item.status === 'pending' && (
                    <div className="mt-3 space-y-2">
                      <input
                        className="gang-input w-full"
                        type="text"
                        placeholder="Note de validation (optionnel)"
                        value={reviewNotes[item.id] ?? ''}
                        onChange={(e) =>
                          setReviewNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                      />
                      <div className="flex gap-2">
                        <button
                          className="btn-crimson inline-flex items-center gap-1.5 text-xs"
                          onClick={() => void handleReview(item.id, 'approved')}
                        >
                          <Check size={12} />
                          Accepter
                        </button>
                        <button
                          className="btn-ghost inline-flex items-center gap-1.5 text-xs"
                          onClick={() => void handleReview(item.id, 'rejected')}
                        >
                          <X size={12} />
                          Refuser
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
