import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardCheck, Coins, Save, CheckCircle2, Check, X, RefreshCw, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  getMissionReports,
  addMissionReport,
  reviewMissionReport,
  getMoneyReports,
  addMoneyReport,
  reviewMoneyReport,
  type MissionReportRow,
  type MoneyReportRow,
} from '../lib/db';
import { formatMoney } from '../utils/format';

type ReportScreen = 'mission' | 'money';
type ReviewStatus = 'pending' | 'approved' | 'rejected';

const statusLabel = (status: ReviewStatus | string): string => {
  if (status === 'approved') return 'ACCEPTE';
  if (status === 'rejected') return 'REFUSE';
  return 'EN ATTENTE';
};

const statusStyle = (status: ReviewStatus | string) => {
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

const MISSION_OPTIONS = [
  'Farm Acide',
  'Farm Weed',
  'ATM',
];

function MissionCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = value.trim()
    ? MISSION_OPTIONS.filter((o) =>
        o.toLowerCase().includes(value.toLowerCase()),
      )
    : MISSION_OPTIONS;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          className="gang-input w-full pr-8"
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Sélectionner ou saisir une mission…"
          autoComplete="off"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-ink-primary transition-colors"
          onClick={() => setOpen((o) => !o)}
          tabIndex={-1}
        >
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <ul
          className="absolute z-50 w-full mt-1 rounded overflow-hidden"
          style={{
            background: '#1a1a28',
            border: '1px solid #2a2a3e',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-xs text-ink-secondary italic">Valeur personnalisée</li>
          )}
          {filtered.map((option) => (
            <li
              key={option}
              className="px-3 py-2 text-sm cursor-pointer transition-colors"
              style={{ color: value === option ? '#c41e3a' : '#c8c8d8' }}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(option);
                setOpen(false);
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(196,30,58,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SelfReportsPage() {
  const { user } = useAuth();
  const { members } = useData();
  const [activeScreen, setActiveScreen] = useState<ReportScreen>('mission');
  const [adminView, setAdminView] = useState<ReportScreen>('mission');

  // Mission form
  const [missionLabel, setMissionLabel] = useState('');
  const [missionDetails, setMissionDetails] = useState('');
  const [missionProofFile, setMissionProofFile] = useState<File | null>(null);
  const [missionReceipt, setMissionReceipt] = useState<MissionReportRow | null>(null);
  const [missionReviewNotes, setMissionReviewNotes] = useState<Record<string, string>>({});

  // Money form
  const [moneyAmount, setMoneyAmount] = useState('');
  const [moneySource, setMoneySource] = useState('');
  const [moneyNotes, setMoneyNotes] = useState('');
  const [moneyProofFile, setMoneyProofFile] = useState<File | null>(null);
  const [moneyReceipt, setMoneyReceipt] = useState<MoneyReportRow | null>(null);
  const [moneyReviewNotes, setMoneyReviewNotes] = useState<Record<string, string>>({});

  // Data
  const [missionReports, setMissionReports] = useState<MissionReportRow[]>([]);
  const [moneyReports, setMoneyReports] = useState<MoneyReportRow[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isReviewer = ['boss', 'oncle', 'segundo', 'capo'].includes(user?.role ?? '');

  // Cherche par id (UUID) OU discordId (snowflake) pour compatibilité sessions anciennes
  const findMember = useCallback(
    (uid: string) =>
      members.find((m) => m.id === uid || m.discordId === uid) ?? null,
    [members],
  );

  const currentMember = useMemo(
    () => (user ? findMember(user.id) : null),
    [findMember, user],
  );

  const memberName = (memberId: string): string =>
    (members.find((m) => m.id === memberId || m.discordId === memberId)?.name) ?? 'Membre inconnu';

  // ── Load reports ────────────────────────────────────────────────────────────

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const [mr, mo] = await Promise.all([getMissionReports(), getMoneyReports()]);
      setMissionReports(mr);
      setMoneyReports(mo);
    } catch {
      // silently fail — tables may not exist yet
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => { void loadReports(); }, [loadReports]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const submitMission = async () => {
    if (!user) return;
    const label = missionLabel.trim();
    if (!label) return;
    setSubmitError(null);

    const memberId = currentMember?.id ?? user.id;

    try {
      const proof_data = missionProofFile ? await toDataUrl(missionProofFile) : null;
      const report = {
        member_id: memberId,
        mission_label: label,
        details: missionDetails.trim(),
        completed_at: nowIso(),
        proof_data,
        status: 'pending',
      };
      await addMissionReport(report);
      await loadReports();

      const inserted = missionReports[0]; // will be refreshed above
      setMissionReceipt({ ...report, id: crypto.randomUUID(), reviewed_by: null, reviewed_at: null, review_note: '' });
      setMissionLabel('');
      setMissionDetails('');
      setMissionProofFile(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(`Erreur mission : ${msg}`);
      console.error('[SelfReports] submitMission:', err);
    }
  };

  const submitMoney = async () => {
    if (!user) return;
    const amount = Number(moneyAmount);
    if (Number.isNaN(amount) || amount <= 0) return;
    setSubmitError(null);

    const memberId = currentMember?.id ?? user.id;

    try {
      const proof_data = moneyProofFile ? await toDataUrl(moneyProofFile) : null;
      const report = {
        member_id: memberId,
        amount,
        source: moneySource.trim(),
        notes: moneyNotes.trim(),
        submitted_at: nowIso(),
        proof_data,
        status: 'pending',
      };
      await addMoneyReport(report);
      await loadReports();

      setMoneyReceipt({ ...report, id: crypto.randomUUID(), reviewed_by: null, reviewed_at: null, review_note: '' });
      setMoneyAmount('');
      setMoneySource('');
      setMoneyNotes('');
      setMoneyProofFile(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(`Erreur argent : ${msg}`);
      console.error('[SelfReports] submitMoney:', err);
    }
  };

  // ── Review ──────────────────────────────────────────────────────────────────

  const reviewMission = async (id: string, status: Exclude<ReviewStatus, 'pending'>) => {
    if (!user || !isReviewer) return;
    const note = (missionReviewNotes[id] ?? '').trim();
    await reviewMissionReport(id, status, user.id, note);
    await loadReports();
  };

  const reviewMoney = async (id: string, status: Exclude<ReviewStatus, 'pending'>) => {
    if (!user || !isReviewer) return;
    const note = (moneyReviewNotes[id] ?? '').trim();
    await reviewMoneyReport(id, status, user.id, note);
    await loadReports();
  };

  // ── Visibility ──────────────────────────────────────────────────────────────

  const visibleMissionReports = isReviewer
    ? missionReports
    : missionReports.filter((r) => r.member_id === user?.id);

  const visibleMoneyReports = isReviewer
    ? moneyReports
    : moneyReports.filter((r) => r.member_id === user?.id);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <section className="gang-card p-5 mb-4">
        <h2 className="font-display font-bold text-lg text-ink-primary">Déclarations Membres</h2>
        <p className="text-sm text-ink-secondary mt-1">
          Chaque membre déclare ici ses missions réalisées et les montants apportés.
        </p>
        <p className="text-xs text-ink-secondary mt-2 font-mono">
          Connecté en tant que: {currentMember?.name ?? user?.name ?? 'Inconnu'}
        </p>
      </section>

      <section className="gang-card p-5 mb-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {(['mission', 'money'] as const).map((screen) => (
            <button
              key={screen}
              className={`px-3 py-2 rounded text-sm font-display tracking-wider uppercase border transition-colors ${
                activeScreen === screen
                  ? 'text-ink-primary border-gang-crimson bg-gang-crimson/10'
                  : 'text-ink-secondary border-ink-border hover:text-ink-primary'
              }`}
              onClick={() => setActiveScreen(screen)}
            >
              {screen === 'mission' ? 'Ecran Mission' : 'Ecran Argent'}
            </button>
          ))}
        </div>

        {submitError && (
          <p className="mb-3 text-xs text-red-400 font-mono">{submitError}</p>
        )}

        {activeScreen === 'mission' ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck size={14} style={{ color: '#B4005D' }} />
              <h3 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary">
                Déclarer une mission réalisée
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MissionCombobox value={missionLabel} onChange={setMissionLabel} />
              <input
                className="gang-input"
                type="text"
                value={currentMember?.name ?? user?.name ?? ''}
                disabled
              />
            </div>

            <textarea
              className="gang-input mt-3 w-full min-h-[100px]"
              value={missionDetails}
              onChange={(e) => setMissionDetails(e.target.value)}
              placeholder="Détails: zone, durée, résultat, problème rencontré..."
            />

            <div className="mt-3">
              <label className="text-xs text-ink-secondary uppercase tracking-widest font-display">Preuve (capture)</label>
              <input
                className="gang-input mt-1 w-full"
                type="file"
                accept="image/*"
                onChange={(e) => setMissionProofFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <button className="btn-crimson mt-3 inline-flex items-center gap-2" onClick={() => void submitMission()}>
              <Save size={13} />
              Envoyer la déclaration mission
            </button>

            {missionReceipt && (
              <div
                className="mt-4 rounded p-4"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                  <p className="text-sm text-ink-primary font-medium">Accusé de réception mission</p>
                </div>
                <p className="text-xs text-ink-secondary font-mono">Mission: {missionReceipt.mission_label}</p>
                <p className="text-xs text-ink-secondary font-mono mt-1">
                  Horodatage: {new Date(missionReceipt.completed_at).toLocaleString('fr-FR')}
                </p>
                {missionReceipt.proof_data && (
                  <img
                    src={missionReceipt.proof_data}
                    alt="Preuve mission"
                    className="mt-3 max-h-48 w-auto rounded border border-ink-border"
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Coins size={14} style={{ color: '#22c55e' }} />
              <h3 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary">
                Déclarer un apport d'argent
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                className="gang-input"
                type="number"
                min={0}
                value={moneyAmount}
                onChange={(e) => setMoneyAmount(e.target.value)}
                placeholder="Montant"
              />
              <input
                className="gang-input md:col-span-2"
                type="text"
                value={moneySource}
                onChange={(e) => setMoneySource(e.target.value)}
                placeholder="Source: ATM / Conteneur / Vente / Mission"
              />
            </div>

            <textarea
              className="gang-input mt-3 w-full min-h-[100px]"
              value={moneyNotes}
              onChange={(e) => setMoneyNotes(e.target.value)}
              placeholder="Détails: preuve, contexte, qui était présent..."
            />

            <div className="mt-3">
              <label className="text-xs text-ink-secondary uppercase tracking-widest font-display">Preuve (capture)</label>
              <input
                className="gang-input mt-1 w-full"
                type="file"
                accept="image/*"
                onChange={(e) => setMoneyProofFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <button className="btn-crimson mt-3 inline-flex items-center gap-2" onClick={() => void submitMoney()}>
              <Save size={13} />
              Envoyer la déclaration argent
            </button>

            {moneyReceipt && (
              <div
                className="mt-4 rounded p-4"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                  <p className="text-sm text-ink-primary font-medium">Accusé de réception argent</p>
                </div>
                <p className="text-xs text-ink-secondary font-mono">Montant: {formatMoney(moneyReceipt.amount)}</p>
                <p className="text-xs text-ink-secondary font-mono mt-1">
                  Horodatage: {new Date(moneyReceipt.submitted_at).toLocaleString('fr-FR')}
                </p>
                {moneyReceipt.proof_data && (
                  <img
                    src={moneyReceipt.proof_data}
                    alt="Preuve argent"
                    className="mt-3 max-h-48 w-auto rounded border border-ink-border"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="gang-card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary">
            Historique des déclarations
          </h3>
          <button
            className="text-ink-secondary hover:text-ink-primary transition-colors p-1"
            onClick={() => void loadReports()}
            title="Rafraîchir"
          >
            <RefreshCw size={14} className={loadingReports ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {(['mission', 'money'] as const).map((screen) => (
            <button
              key={screen}
              className={`px-3 py-2 rounded text-sm font-display tracking-wider uppercase border transition-colors ${
                adminView === screen
                  ? 'text-ink-primary border-gang-crimson bg-gang-crimson/10'
                  : 'text-ink-secondary border-ink-border hover:text-ink-primary'
              }`}
              onClick={() => setAdminView(screen)}
            >
              {screen === 'mission' ? 'Historique Missions' : 'Historique Argent'}
            </button>
          ))}
        </div>

        {adminView === 'mission' ? (
          <div className="space-y-3">
            {visibleMissionReports.length === 0 && (
              <p className="text-sm text-ink-secondary">Aucune déclaration mission.</p>
            )}
            {visibleMissionReports.map((item) => (
              <div key={item.id} className="rounded border border-ink-border p-3 bg-bg-elevated/40">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-sm text-ink-primary font-medium">
                    {memberName(item.member_id)} · {item.mission_label}
                  </p>
                  <span className="text-xs font-mono px-2 py-1 rounded" style={statusStyle(item.status)}>
                    {statusLabel(item.status)}
                  </span>
                </div>
                <p className="text-xs text-ink-secondary">{item.details || 'Sans détails'}</p>
                <p className="text-xs text-ink-secondary font-mono mt-2">
                  Soumis le {new Date(item.completed_at).toLocaleString('fr-FR')}
                </p>
                {item.proof_data && (
                  <img src={item.proof_data} alt="Preuve mission" className="mt-3 max-h-48 w-auto rounded border border-ink-border" />
                )}

                {isReviewer && item.status === 'pending' && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      className="gang-input md:col-span-3"
                      type="text"
                      placeholder="Note de validation (optionnel)"
                      value={missionReviewNotes[item.id] ?? ''}
                      onChange={(e) =>
                        setMissionReviewNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                    />
                    <button
                      className="btn-crimson inline-flex items-center justify-center gap-2"
                      onClick={() => void reviewMission(item.id, 'approved')}
                    >
                      <Check size={13} />
                      Accepter
                    </button>
                    <button
                      className="btn-ghost inline-flex items-center justify-center gap-2"
                      onClick={() => void reviewMission(item.id, 'rejected')}
                    >
                      <X size={13} />
                      Refuser
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleMoneyReports.length === 0 && (
              <p className="text-sm text-ink-secondary">Aucune déclaration argent.</p>
            )}
            {visibleMoneyReports.map((item) => (
              <div key={item.id} className="rounded border border-ink-border p-3 bg-bg-elevated/40">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-sm text-ink-primary font-medium">
                    {memberName(item.member_id)} · {formatMoney(item.amount)}
                  </p>
                  <span className="text-xs font-mono px-2 py-1 rounded" style={statusStyle(item.status)}>
                    {statusLabel(item.status)}
                  </span>
                </div>
                <p className="text-xs text-ink-secondary">Source: {item.source || 'Non précisée'}</p>
                <p className="text-xs text-ink-secondary mt-1">{item.notes || 'Sans détails'}</p>
                <p className="text-xs text-ink-secondary font-mono mt-2">
                  Soumis le {new Date(item.submitted_at).toLocaleString('fr-FR')}
                </p>
                {item.proof_data && (
                  <img src={item.proof_data} alt="Preuve argent" className="mt-3 max-h-48 w-auto rounded border border-ink-border" />
                )}

                {isReviewer && item.status === 'pending' && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      className="gang-input md:col-span-3"
                      type="text"
                      placeholder="Note de validation (optionnel)"
                      value={moneyReviewNotes[item.id] ?? ''}
                      onChange={(e) =>
                        setMoneyReviewNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                    />
                    <button
                      className="btn-crimson inline-flex items-center justify-center gap-2"
                      onClick={() => void reviewMoney(item.id, 'approved')}
                    >
                      <Check size={13} />
                      Accepter
                    </button>
                    <button
                      className="btn-ghost inline-flex items-center justify-center gap-2"
                      onClick={() => void reviewMoney(item.id, 'rejected')}
                    >
                      <X size={13} />
                      Refuser
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
