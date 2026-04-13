import { useEffect, useMemo, useState } from 'react';
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
import {
  ACTIVE_MEMBERS,
  ACTIVE_MISSIONS,
  MEMBERS,
  MISSIONS,
  TOTAL_PROPRE,
  TOTAL_SALE,
  TRANSACTIONS,
  VAULT_TOTAL,
  WEEKLY_PRODUCTION,
} from './data/mockData';
import type { Member } from './types';
import { formatMoney, formatDateTime } from './utils/format';
import {
  fetchDiscordUser,
  mapDiscordUserToAuthUser,
  parseDiscordTokenFromHash,
  startDiscordOAuth,
  validateDiscordState,
} from './utils/discordAuth';

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

function DiscordCallbackPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const { token, state } = parseDiscordTokenFromHash();
        validateDiscordState(state);
        const discordUser = await fetchDiscordUser(token);
        const authUser = mapDiscordUserToAuthUser(discordUser);
        login(authUser);
        window.history.replaceState(null, '', '/dashboard');
        navigate('/dashboard', { replace: true });
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Erreur lors du callback Discord.');
      }
    };

    run();
  }, [login, navigate]);

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

function DashboardPage() {
  const topMembers = useMemo(
    () => [...MEMBERS].sort((a, b) => b.weeklyEarned - a.weeklyEarned).slice(0, 3),
    [],
  );
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          label="Coffre Total"
          value={formatMoney(VAULT_TOTAL)}
          icon={Wallet}
          accentColor="#B4005D"
          trend={12}
          trendLabel="vs mois dernier"
        />
        <KPICard
          label="Production Hebdo"
          value={formatMoney(WEEKLY_PRODUCTION)}
          icon={TrendingUp}
          accentColor="#d4af37"
          trend={7}
        />
        <KPICard
          label="Membres Actifs"
          value={String(ACTIVE_MEMBERS)}
          subValue="/ 10"
          icon={Users}
          accentColor="#22c55e"
          trend={0}
        />
        <KPICard
          label="Missions Actives"
          value={String(ACTIVE_MISSIONS)}
          icon={Target}
          accentColor="#ef4444"
          trend={-3}
          trendLabel="surcharge"
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
        <div className="xl:col-span-2">
          <TopMembersChart />
        </div>
        <AlertsPanel />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
        <div className="xl:col-span-2">
          <ActivityFeed />
        </div>
        <div className="gang-card p-5">
          <h3 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary mb-4">
            Top Membres
          </h3>
          <div className="space-y-3">
            {topMembers.map((member, i) => (
              <MemberCard
                key={member.id}
                member={member}
                mission={MISSIONS.find((m) => m.id === member.missionId) ?? null}
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
          mission={MISSIONS.find((m) => m.id === selectedMember.missionId) ?? null}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </>
  );
}

function MembersPage() {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  return (
    <>
      <section className="gang-card p-5 mb-4">
        <h2 className="font-display font-bold text-lg text-ink-primary">Membres & Missions</h2>
        <p className="text-sm text-ink-secondary mt-1">
          Vue opérationnelle complète des profils, performance et mission en cours.
        </p>
      </section>

      <OperationsPlanner members={MEMBERS} />

      <section className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {MEMBERS.length === 0 && (
          <div className="gang-card p-5 md:col-span-2 2xl:col-span-3">
            <p className="text-sm text-ink-secondary">
              Aucun membre a afficher pour le moment.
            </p>
          </div>
        )}
        {MEMBERS.map((member, i) => (
          <MemberCard
            key={member.id}
            member={member}
            mission={MISSIONS.find((m) => m.id === member.missionId) ?? null}
            onClick={() => setSelectedMember(member)}
            delay={i * 50}
          />
        ))}
      </section>

      {selectedMember && (
        <MemberModal
          member={selectedMember}
          mission={MISSIONS.find((m) => m.id === selectedMember.missionId) ?? null}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </>
  );
}

function TreasuryPage() {
  const lastTen = [...TRANSACTIONS]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <KPICard
          label="Flux Propre"
          value={formatMoney(TOTAL_PROPRE)}
          icon={Wallet}
          accentColor="#22c55e"
          trend={9}
        />
        <KPICard
          label="Flux Sale"
          value={formatMoney(TOTAL_SALE)}
          icon={TrendingUp}
          accentColor="#ef4444"
          trend={5}
        />
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
            {lastTen.map((tx) => {
              const member = MEMBERS.find((m) => m.id === tx.memberId);
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

function AuthenticatedLayout() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/auth/discord/callback"
          element={user ? <Navigate to="/dashboard" replace /> : <DiscordCallbackPage />}
        />
        <Route path="/*" element={<AuthenticatedLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
