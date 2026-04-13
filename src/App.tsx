import { useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, Users, Target, ShieldCheck, LogIn } from 'lucide-react';
import Sidebar from './components/Sidebar';
import KPICard from './components/KPICard';
import ActivityFeed from './components/ActivityFeed';
import AlertsPanel from './components/AlertsPanel';
import TopMembersChart from './components/TopMembersChart';
import MemberCard from './components/MemberCard';
import MemberModal from './components/MemberModal';
import OperationsPlanner from './components/OperationsPlanner';
import SelfReportsPage from './components/SelfReportsPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import type { Member } from './types';
import { formatMoney, formatDateTime } from './utils/format';
import {
  fetchDiscordUser,
  fetchGuildMember,
  mapDiscordUserToAuthUser,
  parseDiscordTokenFromHash,
  startDiscordOAuth,
  validateDiscordState,
} from './utils/discordAuth';

// ── Login ─────────────────────────────────────────────────────────────────────

function LoginPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDiscordLogin = () => {
    setErrorMsg(null);
    try {
      startDiscordOAuth();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Erreur de connexion Discord.');
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-bg-base relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div
        className="absolute -top-24 -right-10 w-72 h-72 rounded-full blur-3xl"
        style={{ background: 'rgba(180,0,93,0.16)' }}
      />
      <div
        className="absolute -bottom-28 -left-12 w-80 h-80 rounded-full blur-3xl"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      />

      <div className="gang-card w-full max-w-md p-8 relative z-10">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-secondary font-display mb-2">
          Martinez Internal System
        </p>
        <h1 className="font-display text-3xl font-black text-ink-primary leading-tight">
          Contrôle Opérationnel
        </h1>
        <p className="text-sm text-ink-secondary mt-3">
          Espace privé de pilotage des missions, flux financiers et activité équipe.
        </p>

        <div className="mt-6 rounded p-4 border border-ink-border bg-bg-elevated">
          <div className="flex items-center gap-2 mb-2 text-ink-primary">
            <ShieldCheck size={14} style={{ color: '#B4005D' }} />
            <span className="text-sm font-medium">Accès sécurisé validé</span>
          </div>
          <p className="text-xs text-ink-secondary font-mono">Session locale: 13/04/2026</p>
        </div>

        <button className="btn-crimson w-full mt-6 flex items-center justify-center gap-2" onClick={handleDiscordLogin}>
          <LogIn size={14} />
          Continuer avec Discord
        </button>

        {errorMsg && (
          <p className="mt-4 text-xs text-sale font-mono">{errorMsg}</p>
        )}
      </div>
    </div>
  );
}

// ── Discord callback ──────────────────────────────────────────────────────────

function DiscordCallbackPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useMemo(() => {
    const run = async () => {
      try {
        const { token, state } = parseDiscordTokenFromHash();
        validateDiscordState(state);
        const [discordUser, guildMember] = await Promise.all([
          fetchDiscordUser(token),
          fetchGuildMember(token),
        ]);
        const authUser = mapDiscordUserToAuthUser(discordUser, guildMember);
        login(authUser);
        window.history.replaceState(null, '', '/dashboard');
        navigate('/dashboard', { replace: true });
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Erreur lors du callback Discord.');
      }
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-bg-base">
      <div className="gang-card w-full max-w-md p-8">
        <h2 className="font-display text-2xl font-black text-ink-primary">Connexion Discord</h2>
        {errorMsg ? (
          <>
            <p className="mt-3 text-sm text-sale">{errorMsg}</p>
            <button
              className="btn-ghost w-full mt-5"
              onClick={() => navigate('/login', { replace: true })}
            >
              Retour connexion
            </button>
          </>
        ) : (
          <p className="mt-3 text-sm text-ink-secondary">Validation du compte en cours...</p>
        )}
      </div>
    </div>
  );
}

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-full flex items-center justify-center bg-bg-base">
      <div className="text-center">
        <div
          className="w-10 h-10 rounded-full mx-auto mb-4 animate-spin"
          style={{ border: '2px solid rgba(196,30,58,0.2)', borderTopColor: '#c41e3a' }}
        />
        <p className="text-sm text-ink-secondary font-mono">Chargement des données...</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-full flex items-center justify-center bg-bg-base p-6">
      <div className="gang-card w-full max-w-md p-8 text-center">
        <p className="text-sale text-sm font-mono">{message}</p>
        <button className="btn-crimson mt-4" onClick={onRetry}>Réessayer</button>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function DashboardPage() {
  const { members, missions, loading, error, refetch } = useData();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const vaultTotal = useMemo(() => members.reduce((s, m) => s + m.totalEarned, 0), [members]);
  const weeklyProduction = useMemo(() => members.reduce((s, m) => s + m.weeklyEarned, 0), [members]);
  const activeMembers = useMemo(() => members.filter((m) => m.active).length, [members]);
  const activeMissions = useMemo(() => missions.filter((m) => m.status === 'active').length, [missions]);
  const topMembers = useMemo(
    () => [...members].sort((a, b) => b.weeklyEarned - a.weeklyEarned).slice(0, 3),
    [members],
  );

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={refetch} />;

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard label="Coffre Total" value={formatMoney(vaultTotal)} icon={Wallet} accentColor="#B4005D" trend={12} trendLabel="vs mois dernier" />
        <KPICard label="Production Hebdo" value={formatMoney(weeklyProduction)} icon={TrendingUp} accentColor="#d4af37" trend={7} />
        <KPICard label="Membres Actifs" value={String(activeMembers)} subValue={`/ ${members.length}`} icon={Users} accentColor="#22c55e" trend={0} />
        <KPICard label="Missions Actives" value={String(activeMissions)} icon={Target} accentColor="#ef4444" trend={-3} trendLabel="surcharge" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
        <div className="xl:col-span-2"><TopMembersChart /></div>
        <AlertsPanel />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
        <div className="xl:col-span-2"><ActivityFeed /></div>
        <div className="gang-card p-5">
          <h3 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary mb-4">Top Membres</h3>
          <div className="space-y-3">
            {topMembers.map((member, i) => (
              <MemberCard
                key={member.id}
                member={member}
                mission={missions.find((m) => m.id === member.missionId) ?? null}
                onClick={() => setSelectedMember(member)}
                delay={i * 80}
              />
            ))}
          </div>
        </div>
      </section>

      {selectedMember && (
        <MemberModal
          member={selectedMember}
          mission={missions.find((m) => m.id === selectedMember.missionId) ?? null}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </>
  );
}

// ── Members page ──────────────────────────────────────────────────────────────

function MembersPage() {
  const { members, missions, loading, error, refetch } = useData();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={refetch} />;

  return (
    <>
      <section className="gang-card p-5 mb-4">
        <h2 className="font-display font-bold text-lg text-ink-primary">Membres & Missions</h2>
        <p className="text-sm text-ink-secondary mt-1">
          Vue opérationnelle complète des profils, performance et mission en cours.
        </p>
      </section>

      <OperationsPlanner members={members} />

      <section className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {members.length === 0 && (
          <div className="gang-card p-5 md:col-span-2 2xl:col-span-3">
            <p className="text-sm text-ink-secondary">Aucun membre à afficher.</p>
          </div>
        )}
        {members.map((member, i) => (
          <MemberCard
            key={member.id}
            member={member}
            mission={missions.find((m) => m.id === member.missionId) ?? null}
            onClick={() => setSelectedMember(member)}
            delay={i * 50}
          />
        ))}
      </section>

      {selectedMember && (
        <MemberModal
          member={selectedMember}
          mission={missions.find((m) => m.id === selectedMember.missionId) ?? null}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </>
  );
}

// ── Treasury page ─────────────────────────────────────────────────────────────

function TreasuryPage() {
  const { members, transactions, loading, error, refetch } = useData();

  const totalPropre = useMemo(
    () => transactions.filter((t) => t.type === 'PROPRE').reduce((s, t) => s + t.amount, 0),
    [transactions],
  );
  const totalSale = useMemo(
    () => transactions.filter((t) => t.type === 'SALE').reduce((s, t) => s + t.amount, 0),
    [transactions],
  );
  const lastTen = useMemo(() => transactions.slice(0, 10), [transactions]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={refetch} />;

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <KPICard label="Flux Propre" value={formatMoney(totalPropre)} icon={Wallet} accentColor="#22c55e" trend={9} />
        <KPICard label="Flux Sale" value={formatMoney(totalSale)} icon={TrendingUp} accentColor="#ef4444" trend={5} />
      </section>

      <section className="gang-card p-5 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary">
            Dernières Transactions
          </h2>
          <span className="text-xs text-ink-secondary font-mono">10 entrées</span>
        </div>

        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="text-left text-ink-secondary text-xs uppercase tracking-wider border-b border-ink-border">
              <th className="py-2">Date</th>
              <th className="py-2">Membre</th>
              <th className="py-2">Activité</th>
              <th className="py-2">Type</th>
              <th className="py-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {lastTen.length === 0 && (
              <tr>
                <td className="py-3 text-ink-secondary text-sm" colSpan={5}>Aucune transaction.</td>
              </tr>
            )}
            {lastTen.map((tx) => {
              const member = members.find((m) => m.id === tx.memberId);
              return (
                <tr key={tx.id} className="table-row-hover border-b border-ink-border/70">
                  <td className="py-2.5 text-ink-secondary font-mono">{formatDateTime(tx.date)}</td>
                  <td className="py-2.5 text-ink-primary">{member?.name ?? 'Inconnu'}</td>
                  <td className="py-2.5 text-ink-primary">{tx.activity}</td>
                  <td className="py-2.5">
                    <span
                      className="text-xs font-display font-semibold tracking-wider px-1.5 py-0.5 rounded-sm"
                      style={{
                        background: tx.type === 'PROPRE' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: tx.type === 'PROPRE' ? '#22c55e' : '#ef4444',
                      }}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td
                    className="py-2.5 text-right font-mono font-semibold"
                    style={{ color: tx.type === 'PROPRE' ? '#22c55e' : '#ef4444' }}
                  >
                    {formatMoney(tx.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

function AuthenticatedLayout() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="h-full bg-bg-base flex overflow-hidden noise-bg scanlines">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 relative z-10">
        <header className="mb-4 gang-card p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-ink-secondary font-display">
            Martinez Dashboard
          </p>
          <h1
            className="font-display font-black text-2xl md:text-3xl mt-1"
            style={{
              background: 'linear-gradient(90deg, #ffffff 0%, #B4005D 55%, #ffffff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Vue Stratégique
          </h1>
        </header>

        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/membres" element={<MembersPage />} />
          <Route path="/declarations" element={<SelfReportsPage />} />
          <Route path="/tresorerie" element={<TreasuryPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function AppShell() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/auth/discord/callback" element={user ? <Navigate to="/dashboard" replace /> : <DiscordCallbackPage />} />
        <Route path="/*" element={<AuthenticatedLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppShell />
      </DataProvider>
    </AuthProvider>
  );
}
