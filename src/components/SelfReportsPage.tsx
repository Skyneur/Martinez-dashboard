import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Coins, Save, CheckCircle2, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MEMBERS } from '../data/mockData';
import { formatMoney } from '../utils/format';

type ReportScreen = 'mission' | 'money';
type ReviewStatus = 'pending' | 'approved' | 'rejected';

type MissionSelfReport = {
  id: string;
  memberId: string;
  missionLabel: string;
  details: string;
  completedAt: string;
  proofImage: string | null;
  status: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string;
};

type MoneySelfReport = {
  id: string;
  memberId: string;
  amount: number;
  source: string;
  notes: string;
  submittedAt: string;
  proofImage: string | null;
  status: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string;
};

const MISSION_REPORTS_STORAGE_KEY = 'martinez.selfReports.missions';
const MONEY_REPORTS_STORAGE_KEY = 'martinez.selfReports.money';

const readStorage = <T,>(key: string): T[] => {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
};

const nowIso = () => new Date().toISOString();

const toDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Lecture image impossible'));
    reader.readAsDataURL(file);
  });

const statusLabel = (status: ReviewStatus): string => {
  if (status === 'approved') return 'ACCEPTE';
  if (status === 'rejected') return 'REFUSE';
  return 'EN ATTENTE';
};

const statusStyle = (status: ReviewStatus) => {
  if (status === 'approved') {
    return { background: 'rgba(34,197,94,0.12)', color: '#22c55e' };
  }
  if (status === 'rejected') {
    return { background: 'rgba(239,68,68,0.12)', color: '#ef4444' };
  }
  return { background: 'rgba(212,175,55,0.12)', color: '#d4af37' };
};

export default function SelfReportsPage() {
  const { user } = useAuth();
  const [activeScreen, setActiveScreen] = useState<ReportScreen>('mission');
  const [adminView, setAdminView] = useState<ReportScreen>('mission');

  const [missionLabel, setMissionLabel] = useState('');
  const [missionDetails, setMissionDetails] = useState('');
  const [missionProofFile, setMissionProofFile] = useState<File | null>(null);
  const [missionReceipt, setMissionReceipt] = useState<MissionSelfReport | null>(null);
  const [missionReviewNotes, setMissionReviewNotes] = useState<Record<string, string>>({});

  const [moneyAmount, setMoneyAmount] = useState('');
  const [moneySource, setMoneySource] = useState('');
  const [moneyNotes, setMoneyNotes] = useState('');
  const [moneyProofFile, setMoneyProofFile] = useState<File | null>(null);
  const [moneyReceipt, setMoneyReceipt] = useState<MoneySelfReport | null>(null);
  const [moneyReviewNotes, setMoneyReviewNotes] = useState<Record<string, string>>({});

  const [missionReports, setMissionReports] = useState<MissionSelfReport[]>(() =>
    readStorage<MissionSelfReport>(MISSION_REPORTS_STORAGE_KEY),
  );
  const [moneyReports, setMoneyReports] = useState<MoneySelfReport[]>(() =>
    readStorage<MoneySelfReport>(MONEY_REPORTS_STORAGE_KEY),
  );

  const isReviewer = user?.role === 'boss' || user?.role === 'capo';

  const currentMember = useMemo(
    () => MEMBERS.find((member) => member.id === user?.id) ?? null,
    [user],
  );

  useEffect(() => {
    localStorage.setItem(MISSION_REPORTS_STORAGE_KEY, JSON.stringify(missionReports));
  }, [missionReports]);

  useEffect(() => {
    localStorage.setItem(MONEY_REPORTS_STORAGE_KEY, JSON.stringify(moneyReports));
  }, [moneyReports]);

  const submitMission = async () => {
    if (!user) return;
    const mission = missionLabel.trim();
    if (!mission) return;

    const proofImage = missionProofFile ? await toDataUrl(missionProofFile) : null;

    const payload: MissionSelfReport = {
      id: crypto.randomUUID(),
      memberId: user.id,
      missionLabel: mission,
      details: missionDetails.trim(),
      completedAt: nowIso(),
      proofImage,
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: '',
    };

    setMissionReports((prev) => [payload, ...prev]);

    setMissionReceipt(payload);
    setMissionLabel('');
    setMissionDetails('');
    setMissionProofFile(null);
  };

  const submitMoney = async () => {
    if (!user) return;
    const amount = Number(moneyAmount);
    if (Number.isNaN(amount) || amount <= 0) return;

    const proofImage = moneyProofFile ? await toDataUrl(moneyProofFile) : null;

    const payload: MoneySelfReport = {
      id: crypto.randomUUID(),
      memberId: user.id,
      amount,
      source: moneySource.trim(),
      notes: moneyNotes.trim(),
      submittedAt: nowIso(),
      proofImage,
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: '',
    };

    setMoneyReports((prev) => [payload, ...prev]);

    setMoneyReceipt(payload);
    setMoneyAmount('');
    setMoneySource('');
    setMoneyNotes('');
    setMoneyProofFile(null);
  };

  const reviewMission = (id: string, status: Exclude<ReviewStatus, 'pending'>) => {
    if (!user || !isReviewer) return;
    const reviewNote = (missionReviewNotes[id] ?? '').trim();

    setMissionReports((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              reviewedBy: user.id,
              reviewedAt: nowIso(),
              reviewNote,
            }
          : item,
      ),
    );
  };

  const reviewMoney = (id: string, status: Exclude<ReviewStatus, 'pending'>) => {
    if (!user || !isReviewer) return;
    const reviewNote = (moneyReviewNotes[id] ?? '').trim();

    setMoneyReports((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              reviewedBy: user.id,
              reviewedAt: nowIso(),
              reviewNote,
            }
          : item,
      ),
    );
  };

  const visibleMissionReports = isReviewer
    ? missionReports
    : missionReports.filter((item) => item.memberId === user?.id);

  const visibleMoneyReports = isReviewer
    ? moneyReports
    : moneyReports.filter((item) => item.memberId === user?.id);

  const memberName = (memberId: string): string =>
    MEMBERS.find((m) => m.id === memberId)?.name ?? 'Membre inconnu';

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
          <button
            className={`px-3 py-2 rounded text-sm font-display tracking-wider uppercase border transition-colors ${
              activeScreen === 'mission'
                ? 'text-ink-primary border-gang-crimson bg-gang-crimson/10'
                : 'text-ink-secondary border-ink-border hover:text-ink-primary'
            }`}
            onClick={() => setActiveScreen('mission')}
          >
            Ecran Mission
          </button>
          <button
            className={`px-3 py-2 rounded text-sm font-display tracking-wider uppercase border transition-colors ${
              activeScreen === 'money'
                ? 'text-ink-primary border-gang-crimson bg-gang-crimson/10'
                : 'text-ink-secondary border-ink-border hover:text-ink-primary'
            }`}
            onClick={() => setActiveScreen('money')}
          >
            Ecran Argent
          </button>
        </div>

        {activeScreen === 'mission' ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck size={14} style={{ color: '#B4005D' }} />
              <h3 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary">
                Déclarer une mission réalisée
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="gang-input"
                type="text"
                value={missionLabel}
                onChange={(e) => setMissionLabel(e.target.value)}
                placeholder="Ex: Farm acide / Escorte / Collecte"
              />
              <input className="gang-input" type="text" value={currentMember?.name ?? user?.name ?? ''} disabled />
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
                <p className="text-xs text-ink-secondary font-mono">Mission: {missionReceipt.missionLabel}</p>
                <p className="text-xs text-ink-secondary font-mono mt-1">
                  Horodatage: {new Date(missionReceipt.completedAt).toLocaleString('fr-FR')}
                </p>
                {missionReceipt.proofImage && (
                  <img
                    src={missionReceipt.proofImage}
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
                  Horodatage: {new Date(moneyReceipt.submittedAt).toLocaleString('fr-FR')}
                </p>
                {moneyReceipt.proofImage && (
                  <img
                    src={moneyReceipt.proofImage}
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
        <h3 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary mb-3">
          Historique des declarations
        </h3>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            className={`px-3 py-2 rounded text-sm font-display tracking-wider uppercase border transition-colors ${
              adminView === 'mission'
                ? 'text-ink-primary border-gang-crimson bg-gang-crimson/10'
                : 'text-ink-secondary border-ink-border hover:text-ink-primary'
            }`}
            onClick={() => setAdminView('mission')}
          >
            Historique Missions
          </button>
          <button
            className={`px-3 py-2 rounded text-sm font-display tracking-wider uppercase border transition-colors ${
              adminView === 'money'
                ? 'text-ink-primary border-gang-crimson bg-gang-crimson/10'
                : 'text-ink-secondary border-ink-border hover:text-ink-primary'
            }`}
            onClick={() => setAdminView('money')}
          >
            Historique Argent
          </button>
        </div>

        {adminView === 'mission' ? (
          <div className="space-y-3">
            {visibleMissionReports.length === 0 && (
              <p className="text-sm text-ink-secondary">Aucune declaration mission.</p>
            )}
            {visibleMissionReports.map((item) => (
              <div key={item.id} className="rounded border border-ink-border p-3 bg-bg-elevated/40">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-sm text-ink-primary font-medium">{memberName(item.memberId)} · {item.missionLabel}</p>
                  <span className="text-xs font-mono px-2 py-1 rounded" style={statusStyle(item.status)}>
                    {statusLabel(item.status)}
                  </span>
                </div>
                <p className="text-xs text-ink-secondary">{item.details || 'Sans details'}</p>
                <p className="text-xs text-ink-secondary font-mono mt-2">
                  Soumis le {new Date(item.completedAt).toLocaleString('fr-FR')}
                </p>
                {item.proofImage && (
                  <img src={item.proofImage} alt="Preuve mission" className="mt-3 max-h-48 w-auto rounded border border-ink-border" />
                )}

                {isReviewer && item.status === 'pending' && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      className="gang-input md:col-span-3"
                      type="text"
                      placeholder="Note de validation (optionnel)"
                      value={missionReviewNotes[item.id] ?? ''}
                      onChange={(e) => setMissionReviewNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    />
                    <button className="btn-crimson inline-flex items-center justify-center gap-2" onClick={() => reviewMission(item.id, 'approved')}>
                      <Check size={13} />
                      Accepter
                    </button>
                    <button className="btn-ghost inline-flex items-center justify-center gap-2" onClick={() => reviewMission(item.id, 'rejected')}>
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
              <p className="text-sm text-ink-secondary">Aucune declaration argent.</p>
            )}
            {visibleMoneyReports.map((item) => (
              <div key={item.id} className="rounded border border-ink-border p-3 bg-bg-elevated/40">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-sm text-ink-primary font-medium">{memberName(item.memberId)} · {formatMoney(item.amount)}</p>
                  <span className="text-xs font-mono px-2 py-1 rounded" style={statusStyle(item.status)}>
                    {statusLabel(item.status)}
                  </span>
                </div>
                <p className="text-xs text-ink-secondary">Source: {item.source || 'Non precisee'}</p>
                <p className="text-xs text-ink-secondary mt-1">{item.notes || 'Sans details'}</p>
                <p className="text-xs text-ink-secondary font-mono mt-2">
                  Soumis le {new Date(item.submittedAt).toLocaleString('fr-FR')}
                </p>
                {item.proofImage && (
                  <img src={item.proofImage} alt="Preuve argent" className="mt-3 max-h-48 w-auto rounded border border-ink-border" />
                )}

                {isReviewer && item.status === 'pending' && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      className="gang-input md:col-span-3"
                      type="text"
                      placeholder="Note de validation (optionnel)"
                      value={moneyReviewNotes[item.id] ?? ''}
                      onChange={(e) => setMoneyReviewNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    />
                    <button className="btn-crimson inline-flex items-center justify-center gap-2" onClick={() => reviewMoney(item.id, 'approved')}>
                      <Check size={13} />
                      Accepter
                    </button>
                    <button className="btn-ghost inline-flex items-center justify-center gap-2" onClick={() => reviewMoney(item.id, 'rejected')}>
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
