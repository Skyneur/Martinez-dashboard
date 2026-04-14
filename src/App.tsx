import { useEffect, useMemo, useState, useCallback } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Users, ShieldCheck, LogIn, Search, Gauge, CheckCircle2, AlertTriangle, Trophy, Crown } from 'lucide-react';
import Sidebar from './components/Sidebar';
import KPICard from './components/KPICard';
import AlertsPanel from './components/AlertsPanel';
import MemberCard from './components/MemberCard';
import MemberModal from './components/MemberModal';
import SelfReportsPage from './components/SelfReportsPage';
import SpeedoTracker from './components/SpeedoTracker';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import type { Member, Role } from './types';
import { roleLabel, roleColor } from './utils/format';
import { getSpeedoLogs, type SpeedoLogRow } from './lib/db';
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
        const authUser = await mapDiscordUserToAuthUser(discordUser, guildMember);
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

// ── Speedo week helpers ───────────────────────────────────────────────────────

const getCurrentWeekDates = (): string[] => {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

type SpeedoStatus = 'ok' | 'warning' | 'overdue' | 'new';

const getSpeedoStatus = (weekTotal: number, allLogs: SpeedoLogRow[]): SpeedoStatus => {
  if (weekTotal >= 3.5) return 'ok';
  const activeLogs = allLogs.filter((l) => l.amount > 0);
  const sorted = [...activeLogs].sort((a, b) => b.date.localeCompare(a.date));
  const last = sorted[0];
  if (!last) return 'new';
  const diffDays = Math.floor(
    (new Date(todayISO()).getTime() - new Date(last.date).getTime()) / 86400000,
  );
  if (diffDays > 2) return 'overdue';
  if (diffDays >= 2) return 'warning';
  return 'ok';
};

const STATUS_CFG: Record<SpeedoStatus, { color: string; label: string }> = {
  ok:      { color: '#22c55e', label: 'OK' },
  warning: { color: '#f59e0b', label: 'Attention' },
  overdue: { color: '#ef4444', label: 'En retard' },
  new:     { color: '#6b7280', label: 'Aucun log' },
};

// ─────────────────────────────────────────────────────────────────────────────

function DashboardPage() {
  const { members, warns, loading, error, refetch } = useData();
  const [speedoLogs, setSpeedoLogs] = useState<SpeedoLogRow[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    getSpeedoLogs().then(setSpeedoLogs).catch(console.error);
  }, []);

  const weekDates = useMemo(() => getCurrentWeekDates(), []);
  const activeMembers = useMemo(() => members.filter((m) => m.active), [members]);

  const memberStats = useMemo(() =>
    activeMembers.map((m) => {
      const memberLogs = speedoLogs.filter((l) => l.member_id === m.id);
      const weekTotal = memberLogs
        .filter((l) => weekDates.includes(l.date))
        .reduce((s, l) => s + l.amount, 0);
      const status = getSpeedoStatus(weekTotal, memberLogs);
      return { member: m, weekTotal, status };
    }),
    [activeMembers, speedoLogs, weekDates],
  );

  const weeklySpeedoTotal = useMemo(
    () => memberStats.reduce((s, d) => s + d.weekTotal, 0),
    [memberStats],
  );
  const compliantCount = useMemo(
    () => memberStats.filter((d) => d.weekTotal >= 3.5).length,
    [memberStats],
  );
  const overdueCount = useMemo(
    () => memberStats.filter((d) => d.status === 'overdue').length,
    [memberStats],
  );

  // Sorted by alert urgency for AlertsPanel
  const alertStats = useMemo(() => {
    const order: Record<SpeedoStatus, number> = { overdue: 0, warning: 1, new: 2, ok: 3 };
    return [...memberStats].sort((a, b) => order[a.status] - order[b.status]);
  }, [memberStats]);

  // Sorted by score DESC for the competition leaderboard
  const leaderboard = useMemo(
    () => [...memberStats].sort((a, b) => b.weekTotal - a.weekTotal || a.member.name.localeCompare(b.member.name)),
    [memberStats],
  );

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={refetch} />;

  return (
    <>
      {/* KPIs */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          label="Speedos semaine"
          value={weeklySpeedoTotal.toFixed(1)}
          icon={Gauge}
          accentColor="#c41e3a"
          trendLabel="total équipe cette semaine"
        />
        <KPICard
          label="Membres conformes"
          value={`${compliantCount}/${activeMembers.length}`}
          icon={CheckCircle2}
          accentColor="#22c55e"
          trendLabel="quota ≥ 3.5 atteint"
        />
        <KPICard
          label="Membres actifs"
          value={String(activeMembers.length)}
          subValue={`/ ${members.length}`}
          icon={Users}
          accentColor="#d4af37"
          trendLabel="dans l'équipe"
        />
        <KPICard
          label="En retard"
          value={String(overdueCount)}
          icon={AlertTriangle}
          accentColor="#ef4444"
          trendLabel="gap > 2 jours sans speedo"
        />
      </section>

      {/* Competition + Alerts */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
        <div className="xl:col-span-2 gang-card p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Trophy size={15} style={{ color: '#d4af37' }} />
              <h3 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary">
                Classement Speedo
              </h3>
            </div>
            <span className="text-xs font-mono text-ink-secondary bg-bg-elevated px-2 py-1 rounded border border-ink-border">
              Objectif 3.5
            </span>
          </div>

          {leaderboard.length === 0 && (
            <p className="text-xs text-ink-secondary text-center py-8">Aucun membre actif.</p>
          )}

          {/* ── Podium top 3 ── */}
          {leaderboard.length >= 1 && (() => {
            const RANKS = [
              { idx: 1, color: '#94a3b8', base: 52, label: '2' },
              { idx: 0, color: '#d4af37', base: 80, label: '1' },
              { idx: 2, color: '#b87333', base: 36, label: '3' },
            ];
            return (
              <div className="flex items-end justify-center gap-2 mb-6 px-2">
                {RANKS.map(({ idx, color, base, label }) => {
                  const entry = leaderboard[idx];
                  if (!entry) return null;
                  const { member, weekTotal, status } = entry;
                  const pct = Math.min(100, (weekTotal / 3.5) * 100);
                  const done = weekTotal >= 3.5;
                  return (
                    <div
                      key={member.id}
                      className="flex flex-col items-center flex-1 max-w-[140px] cursor-pointer group"
                      onClick={() => setSelectedMember(member)}
                    >
                      {/* Crown for #1 */}
                      {idx === 0 && done && (
                        <Crown size={14} className="mb-1" style={{ color: '#d4af37' }} />
                      )}
                      {idx === 0 && !done && (
                        <div className="h-[18px] mb-1" />
                      )}

                      {/* Card */}
                      <div
                        className="w-full rounded-t px-3 py-3 text-center transition-all group-hover:scale-[1.02]"
                        style={{
                          background: `linear-gradient(180deg, ${color}12 0%, ${color}06 100%)`,
                          border: `1px solid ${color}30`,
                          borderBottom: 'none',
                        }}
                      >
                        {/* Avatar */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-display font-black mx-auto mb-2"
                          style={{
                            background: `linear-gradient(135deg, ${color}30, ${color}50)`,
                            border: `2px solid ${color}70`,
                            color,
                            boxShadow: idx === 0 ? `0 0 18px ${color}40` : 'none',
                          }}
                        >
                          {member.initials}
                        </div>
                        {/* Name */}
                        <p className="text-xs font-display font-bold text-ink-primary truncate leading-tight">
                          {member.name.split(' ')[0]}
                        </p>
                        {/* Score */}
                        <p
                          className="font-mono font-black text-lg leading-tight mt-0.5"
                          style={{ color }}
                        >
                          {weekTotal.toFixed(1)}
                        </p>
                        {/* Mini progress */}
                        <div className="h-1 rounded-full bg-bg-hover overflow-hidden mt-2">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                        {done && (
                          <p className="text-[9px] font-display font-bold tracking-wider mt-1.5" style={{ color }}>
                            QUOTA ✓
                          </p>
                        )}
                      </div>

                      {/* Pedestal */}
                      <div
                        className="w-full flex items-center justify-center rounded-b font-display font-black text-lg"
                        style={{
                          height: base,
                          background: `linear-gradient(180deg, ${color}25 0%, ${color}10 100%)`,
                          border: `1px solid ${color}40`,
                          color,
                          textShadow: `0 0 12px ${color}80`,
                        }}
                      >
                        #{label}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ── Leaderboard rows (4th+) ── */}
          {leaderboard.length > 3 && (
            <div className="space-y-1.5 border-t border-ink-border pt-4">
              {leaderboard.slice(3).map(({ member, weekTotal, status }, i) => {
                const cfg = STATUS_CFG[status];
                const pct = Math.min(100, (weekTotal / 3.5) * 100);
                const rank = i + 4;
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 px-2 py-2 rounded cursor-pointer group hover:bg-bg-hover transition-colors"
                    onClick={() => setSelectedMember(member)}
                  >
                    <span className="text-xs font-mono text-ink-secondary w-5 text-right flex-shrink-0">
                      #{rank}
                    </span>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold flex-shrink-0"
                      style={{
                        background: `${roleColor(member.role)}20`,
                        border: `1px solid ${roleColor(member.role)}40`,
                        color: roleColor(member.role),
                      }}
                    >
                      {member.initials}
                    </div>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <p className="text-xs font-medium text-ink-primary truncate group-hover:text-white transition-colors">
                        {member.name}
                      </p>
                      {warns.filter((w) => w.member_id === member.id).length > 0 && (
                        <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold flex-shrink-0"
                          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                          <AlertTriangle size={8} />
                          {warns.filter((w) => w.member_id === member.id).length}
                        </span>
                      )}
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <div className="h-1.5 rounded-full bg-bg-hover overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.color }} />
                      </div>
                    </div>
                    <span className="text-xs font-mono flex-shrink-0 w-14 text-right" style={{ color: cfg.color }}>
                      {weekTotal.toFixed(1)}/3.5
                    </span>
                    <span
                      className="text-[9px] font-display font-bold tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ color: cfg.color, background: `${cfg.color}15` }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <AlertsPanel speedoStats={alertStats} speedoLogs={speedoLogs} weekDates={weekDates} />
      </section>

      {selectedMember && (
        <MemberModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </>
  );
}

// ── Members page ──────────────────────────────────────────────────────────────

const ROLE_ORDER: Role[] = ['boss', 'oncle', 'segundo', 'capo', 'bandito', 'soldato', 'recrue', 'associe'];

function MembersPage() {
  const { members, warns, loading, error, refetch } = useData();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [activeOnly, setActiveOnly] = useState(false);

  const presentRoles = useMemo(
    () => ROLE_ORDER.filter((r) => members.some((m) => m.role === r)),
    [members],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members
      .filter((m) => !activeOnly || m.active)
      .filter((m) => roleFilter === 'all' || m.role === roleFilter)
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.discordTag.toLowerCase().includes(q))
      .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
  }, [members, search, roleFilter, activeOnly]);

  const handleSelect = useCallback((m: Member) => setSelectedMember(m), []);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={refetch} />;

  return (
    <>
      {/* Header + controls */}
      <section className="gang-card p-5 mb-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-lg text-ink-primary">Membres</h2>
            <p className="text-sm text-ink-secondary mt-0.5">
              {filtered.length} / {members.length} membre{members.length > 1 ? 's' : ''}
            </p>
          </div>
          {/* Active toggle */}
          <button
            onClick={() => setActiveOnly((v) => !v)}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded transition-colors flex-shrink-0"
            style={{
              background: activeOnly ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeOnly ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'}`,
              color: activeOnly ? '#22c55e' : '#94a3b8',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: activeOnly ? '#22c55e' : '#94a3b8', boxShadow: activeOnly ? '0 0 5px #22c55e' : 'none' }}
            />
            Actifs seulement
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou tag Discord…"
            className="w-full bg-bg-base border border-ink-border rounded pl-8 pr-4 py-2 text-sm text-ink-primary placeholder-ink-secondary/50 focus:outline-none focus:border-crimson transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-ink-primary text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Role filter pills */}
        <div className="flex flex-wrap gap-2">
          {(['all', ...presentRoles] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className="text-xs px-3 py-1 rounded font-display font-semibold tracking-wider transition-all"
              style={
                roleFilter === r
                  ? { background: 'rgba(196,30,58,0.15)', color: '#c41e3a', border: '1px solid rgba(196,30,58,0.35)' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              {r === 'all' ? 'Tous' : roleLabel(r)}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="gang-card p-8 md:col-span-2 2xl:col-span-3 text-center">
            <p className="text-sm text-ink-secondary">Aucun membre ne correspond à ces filtres.</p>
          </div>
        )}
        {filtered.map((member, i) => (
          <MemberCard
            key={member.id}
            member={member}
            warnCount={warns.filter((w) => w.member_id === member.id).length}
            onClick={() => handleSelect(member)}
            delay={i * 40}
          />
        ))}
      </section>

      {selectedMember && (
        <MemberModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
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
          <Route path="/speedo" element={<SpeedoTracker />} />
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
