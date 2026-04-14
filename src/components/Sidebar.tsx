import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Landmark,
  ClipboardList,
  LogOut,
  ShieldAlert,
  ChevronRight,
  Gauge,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { roleLabel, roleColor } from '../utils/format';

const NAV_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/membres',     icon: Users,           label: 'Membres & Missions' },
  { to: '/declarations',icon: ClipboardList,   label: 'Déclarations' },
  { to: '/speedo',      icon: Gauge,           label: 'Quota Speedo' },
  { to: '/tresorerie',  icon: Landmark,        label: 'Trésorerie' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="
      hidden md:flex flex-col
      w-60 flex-shrink-0 h-full
      bg-bg-card border-r border-ink-border
      relative z-10
    ">
      {/* Top glow line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #c41e3a, transparent)' }}
      />

      {/* Logo area */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-ink-border">
        {/* Crest */}
        <div
          className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #1a0a0e 0%, #2d0d16 100%)',
            border: '1px solid rgba(196,30,58,0.5)',
            boxShadow: '0 0 14px rgba(196,30,58,0.3)',
          }}
        >
          <span
            className="font-display font-black text-lg"
            style={{ color: '#c41e3a', textShadow: '0 0 8px rgba(196,30,58,0.8)' }}
          >
            M
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-sm tracking-wider text-ink-primary leading-tight truncate">
            FAMILLE MARTINEZ
          </p>
          <p className="text-xs text-ink-secondary tracking-widest uppercase mt-0.5">
            Système Interne
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded text-sm
               font-body transition-all duration-150 group
               ${isActive
                 ? 'nav-active text-ink-primary'
                 : 'text-ink-secondary hover:text-ink-primary hover:bg-bg-hover'
               }`
            }
            style={({ isActive }) =>
              isActive
                ? { background: 'rgba(196,30,58,0.08)' }
                : {}
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className="flex-shrink-0 transition-colors"
                  style={{ color: isActive ? '#c41e3a' : undefined }}
                />
                <span className="font-medium">{label}</span>
                {isActive && (
                  <ChevronRight size={12} className="ml-auto opacity-50" style={{ color: '#c41e3a' }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-ink-border" />

      {/* User profile + logout */}
      <div className="px-4 py-4 space-y-3">
        {user && (
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                style={{ border: `1px solid ${roleColor(user.role)}66` }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-bold flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${roleColor(user.role)}33, ${roleColor(user.role)}55)`,
                  border: `1px solid ${roleColor(user.role)}66`,
                  color: roleColor(user.role),
                }}
              >
                {user.initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-primary truncate leading-tight">
                {user.name}
              </p>
              <p
                className="text-xs font-display font-semibold tracking-widest uppercase"
                style={{ color: roleColor(user.role) }}
              >
                {roleLabel(user.role)}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-ink-secondary hover:text-sale transition-colors p-1 rounded"
              title="Déconnexion"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}

        {/* Security badge */}
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
          style={{ background: 'rgba(196,30,58,0.06)', border: '1px solid rgba(196,30,58,0.15)' }}
        >
          <ShieldAlert size={11} style={{ color: '#c41e3a' }} />
          <span className="text-ink-secondary font-mono tracking-wider">ACCÈS SÉCURISÉ</span>
        </div>
      </div>
    </aside>
  );
}
