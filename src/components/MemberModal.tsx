import { X, Calendar, Target, CheckCircle, TrendingUp, Clock } from 'lucide-react';
import type { Member, Mission } from '../types';
import {
  roleLabel, roleColor, roleBgColor,
  formatMoney, formatDate, timeAgo
} from '../utils/format';
import { useData } from '../context/DataContext';

interface MemberModalProps {
  member: Member;
  mission: Mission | null;
  onClose: () => void;
}

export default function MemberModal({ member, mission, onClose }: MemberModalProps) {
  const { transactions } = useData();
  const rColor = roleColor(member.role);
  const rBg = roleBgColor(member.role);

  const memberTx = transactions
    .filter((t) => t.memberId === member.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div
      className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="gang-card w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-in-right"
        style={{ borderColor: `${rColor}30` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between p-5 border-b border-ink-border"
          style={{ background: '#0f0f17' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center font-display font-black text-lg"
              style={{
                background: `linear-gradient(135deg, ${rColor}20, ${rColor}40)`,
                border: `1.5px solid ${rColor}50`,
                color: rColor,
                boxShadow: `0 0 20px ${rColor}30`,
              }}
            >
              {member.initials}
            </div>
            <div>
              <h2 className="font-display font-bold text-ink-primary text-base">{member.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="role-badge"
                  style={{ background: rBg, color: rColor, border: `1px solid ${rColor}30` }}
                >
                  {roleLabel(member.role)}
                </span>
                <span className="text-xs font-mono text-ink-secondary">{member.discordTag}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-secondary hover:text-ink-primary transition-colors p-1 rounded hover:bg-bg-elevated"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 p-5 border-b border-ink-border">
          {[
            { label: 'Gains ce mois', value: formatMoney(member.monthlyEarned), color: '#d4af37' },
            { label: 'Missions terminées', value: String(member.missionsCompleted), color: rColor },
            { label: 'Taux de succès', value: `${member.successRate}%`, color: '#22c55e' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded p-3 text-center"
              style={{ background: 'rgba(30,30,46,0.5)', border: '1px solid rgba(42,42,62,0.6)' }}
            >
              <p className="font-mono text-lg font-bold" style={{ color }}>{value}</p>
              <p className="text-xs text-ink-secondary mt-1 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Mission actuelle */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target size={13} style={{ color: '#c41e3a' }} />
              <span className="text-xs font-display font-bold tracking-widest uppercase text-ink-secondary">
                Mission en cours
              </span>
            </div>
            {mission ? (
              <div
                className="rounded p-4"
                style={{ background: 'rgba(196,30,58,0.06)', border: '1px solid rgba(196,30,58,0.2)' }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-sm text-ink-primary font-medium">{mission.description}</p>
                  <span
                    className="text-xs font-display font-semibold tracking-wider px-1.5 py-0.5 rounded-sm flex-shrink-0"
                    style={{ background: 'rgba(196,30,58,0.15)', color: '#c41e3a', fontSize: '9px' }}
                  >
                    {mission.type.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-secondary">Progression</span>
                    <span className="font-mono text-ink-primary">{mission.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(42,42,62,0.8)' }}>
                    <div
                      className="h-full rounded-full progress-fill"
                      style={{
                        width: `${mission.progress}%`,
                        background: mission.progress >= 75 ? '#22c55e' : mission.progress >= 40 ? '#d4af37' : '#c41e3a',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-ink-secondary">
                      Objectif: <span style={{ color: '#d4af37' }}>{formatMoney(mission.target)}</span>
                    </span>
                    <div className="flex items-center gap-1 text-ink-secondary">
                      <Calendar size={10} />
                      <span>Deadline: {formatDate(mission.deadline)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-secondary italic">Aucune mission assignée.</p>
            )}
          </div>

          {/* Historique récent */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={13} style={{ color: '#d4af37' }} />
              <span className="text-xs font-display font-bold tracking-widest uppercase text-ink-secondary">
                Dernières Transactions
              </span>
            </div>
            {memberTx.length === 0 ? (
              <p className="text-sm text-ink-secondary italic">Aucune transaction récente.</p>
            ) : (
              <div className="space-y-2">
                {memberTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b border-ink-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-4 rounded-full flex-shrink-0"
                        style={{ background: tx.type === 'PROPRE' ? '#22c55e' : '#ef4444' }}
                      />
                      <div>
                        <p className="text-xs text-ink-primary">{tx.activity}</p>
                        <p className="text-xs text-ink-secondary font-mono">{timeAgo(tx.date)}</p>
                      </div>
                    </div>
                    <span
                      className="font-mono text-sm font-bold"
                      style={{ color: tx.type === 'PROPRE' ? '#22c55e' : '#ef4444' }}
                    >
                      {formatMoney(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meta */}
          <div
            className="flex items-center justify-between text-xs text-ink-secondary rounded p-3"
            style={{ background: 'rgba(30,30,46,0.4)', border: '1px solid rgba(42,42,62,0.5)' }}
          >
            <div className="flex items-center gap-1.5">
              <Clock size={11} />
              <span className="font-mono">Vu: {timeAgo(member.lastSeen)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle size={11} />
              <span className="font-mono">Depuis: {formatDate(member.joinedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
