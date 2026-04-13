import { Clock, Target, ChevronRight } from 'lucide-react';
import type { Member, Mission } from '../types';
import { roleLabel, roleColor, roleBgColor, timeAgo, formatMoney } from '../utils/format';

interface MemberCardProps {
  member: Member;
  mission: Mission | null;
  onClick: () => void;
  delay?: number;
}

export default function MemberCard({ member, mission, onClick, delay = 0 }: MemberCardProps) {
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

      {/* Active dot */}
      <div className="absolute top-4 right-4">
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: member.active ? '#22c55e' : '#ef4444',
            boxShadow: member.active ? '0 0 6px #22c55e' : 'none',
          }}
        />
      </div>

      {/* Avatar + name */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-base font-display font-black flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${rColor}20, ${rColor}35)`,
            border: `1.5px solid ${rColor}50`,
            color: rColor,
            boxShadow: `0 0 16px ${rColor}25`,
          }}
        >
          {member.initials}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-display font-bold text-base text-ink-primary truncate pr-4">
            {member.name}
          </p>
          <span
            className="role-badge mt-1 inline-block"
            style={{ background: rBg, color: rColor, border: `1px solid ${rColor}30` }}
          >
            {roleLabel(member.role)}
          </span>
        </div>
      </div>

      {/* Mission block */}
      <div
        className="rounded p-3 mb-4"
        style={{ background: 'rgba(30,30,46,0.5)', border: '1px solid rgba(42,42,62,0.6)' }}
      >
        {mission ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Target size={11} style={{ color: '#c41e3a' }} />
              <span className="text-xs text-ink-secondary uppercase tracking-widest font-display font-semibold">
                Mission active
              </span>
            </div>
            <p className="text-xs text-ink-primary font-medium mb-3 truncate">{mission.description}</p>
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(42,42,62,0.8)' }}>
                <div
                  className="h-full rounded-full progress-fill"
                  style={{
                    width: `${mission.progress}%`,
                    background: mission.progress >= 75
                      ? '#22c55e'
                      : mission.progress >= 40
                      ? '#d4af37'
                      : '#c41e3a',
                  }}
                />
              </div>
              <span className="text-xs font-mono text-ink-secondary flex-shrink-0">
                {mission.progress}%
              </span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-ink-secondary font-mono">
                Objectif: {formatMoney(mission.target)}
              </span>
              <span
                className="text-xs font-display font-semibold tracking-wider px-1.5 py-0.5 rounded-sm"
                style={{ background: 'rgba(196,30,58,0.12)', color: '#c41e3a', fontSize: '9px' }}
              >
                {mission.type.toUpperCase()}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-ink-secondary">
            <Target size={11} />
            <span className="text-xs">Aucune mission assignée</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-ink-secondary">
          <Clock size={11} />
          <span className="text-xs font-mono">{timeAgo(member.lastSeen)}</span>
        </div>
        <ChevronRight
          size={14}
          className="text-ink-secondary group-hover:text-ink-primary transition-colors"
          style={{ color: '#c41e3a' }}
        />
      </div>
    </div>
  );
}
