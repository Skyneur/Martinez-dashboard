import { Clock, TrendingUp, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { Member } from '../types';
import { roleLabel, roleColor, roleBgColor, timeAgo, formatMoney } from '../utils/format';

interface MemberCardProps {
  member: Member;
  mission?: unknown;
  warnCount?: number;
  onClick: () => void;
  delay?: number;
}

export default function MemberCard({ member, warnCount = 0, onClick, delay = 0 }: MemberCardProps) {
  const rColor = roleColor(member.role);
  const rBg = roleBgColor(member.role);

  return (
    <div
      className="gang-card p-5 cursor-pointer animate-entry group relative overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top center, ${rColor}08, transparent 65%)` }}
      />

      {/* Warn badge */}
      {warnCount > 0 && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-1.5 py-0.5 rounded z-10"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)' }}
        >
          <AlertTriangle size={9} style={{ color: '#ef4444' }} />
          <span className="text-[9px] font-display font-bold" style={{ color: '#ef4444' }}>{warnCount}</span>
        </div>
      )}

      {/* Header: avatar + name + status */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-shrink-0">
          {member.discordAvatar ? (
            <img
              src={member.discordAvatar}
              alt={member.name}
              className="w-12 h-12 rounded-full object-cover"
              style={{ border: `1.5px solid ${rColor}50`, boxShadow: `0 0 14px ${rColor}25` }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-base font-display font-black"
              style={{
                background: `linear-gradient(135deg, ${rColor}20, ${rColor}35)`,
                border: `1.5px solid ${rColor}50`,
                color: rColor,
                boxShadow: `0 0 16px ${rColor}25`,
              }}
            >
              {member.initials}
            </div>
          )}
          {/* Active dot */}
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-card"
            style={{
              background: member.active ? '#22c55e' : '#ef4444',
              boxShadow: member.active ? '0 0 6px #22c55e88' : 'none',
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-base text-ink-primary truncate leading-tight">
            {member.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="role-badge"
              style={{ background: rBg, color: rColor, border: `1px solid ${rColor}30` }}
            >
              {roleLabel(member.role)}
            </span>
            <span className="text-xs text-ink-secondary/60 font-mono truncate">
              {member.discordTag}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div
          className="rounded p-2 text-center"
          style={{ background: 'rgba(30,30,46,0.5)', border: '1px solid rgba(42,42,62,0.6)' }}
        >
          <p className="text-xs text-ink-secondary leading-tight mb-0.5">Hebdo</p>
          <p className="font-mono text-sm font-bold" style={{ color: '#d4af37' }}>
            {formatMoney(member.weeklyEarned)}
          </p>
        </div>
        <div
          className="rounded p-2 text-center"
          style={{ background: 'rgba(30,30,46,0.5)', border: '1px solid rgba(42,42,62,0.6)' }}
        >
          <p className="text-xs text-ink-secondary leading-tight mb-0.5">Total</p>
          <p className="font-mono text-sm font-bold text-ink-primary">
            {formatMoney(member.totalEarned)}
          </p>
        </div>
        <div
          className="rounded p-2 text-center"
          style={{ background: 'rgba(30,30,46,0.5)', border: '1px solid rgba(42,42,62,0.6)' }}
        >
          <p className="text-xs text-ink-secondary leading-tight mb-0.5">Succès</p>
          <p
            className="font-mono text-sm font-bold"
            style={{ color: member.successRate >= 70 ? '#22c55e' : member.successRate >= 40 ? '#d4af37' : '#ef4444' }}
          >
            {member.successRate}%
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-ink-secondary">
        <div className="flex items-center gap-1.5">
          <Clock size={11} />
          <span className="font-mono">{timeAgo(member.lastSeen)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp size={11} />
          <span className="font-mono">{member.missionsCompleted} missions</span>
        </div>
        <ShieldCheck
          size={13}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: rColor }}
        />
      </div>
    </div>
  );
}
