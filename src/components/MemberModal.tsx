import { X, Calendar, TrendingUp, Clock, Hash, AlertTriangle, Trash2 } from 'lucide-react';
import type { Member } from '../types';
import {
  roleLabel, roleColor, roleBgColor,
  formatMoney, formatDate, timeAgo,
} from '../utils/format';
import { useData } from '../context/DataContext';
import { deleteMemberWarn } from '../lib/db';
import { useAuth } from '../context/AuthContext';

interface MemberModalProps {
  member: Member;
  mission?: unknown;
  onClose: () => void;
}

export default function MemberModal({ member, onClose }: MemberModalProps) {
  const { transactions, warns, refetchWarns } = useData();
  const { user } = useAuth();
  const rColor = roleColor(member.role);
  const rBg = roleBgColor(member.role);
  const isBoss = user != null && ['boss', 'oncle', 'segundo'].includes(user.role);

  const memberWarns = warns
    .filter((w) => w.member_id === member.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const handleDeleteWarn = async (id: string) => {
    await deleteMemberWarn(id);
    await refetchWarns();
  };

  const memberTx = transactions
    .filter((t) => t.memberId === member.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <div
      className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="gang-card w-full max-w-lg max-h-[88vh] overflow-y-auto animate-slide-in-right"
        style={{ borderColor: `${rColor}30` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="sticky top-0 flex items-center justify-between p-5 border-b border-ink-border z-10"
          style={{ background: '#0f0f17' }}
        >
          <div className="flex items-center gap-3">
            {member.discordAvatar ? (
              <img
                src={member.discordAvatar}
                alt={member.name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                style={{ border: `1.5px solid ${rColor}50`, boxShadow: `0 0 20px ${rColor}30` }}
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-display font-black text-lg flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${rColor}20, ${rColor}40)`,
                  border: `1.5px solid ${rColor}50`,
                  color: rColor,
                  boxShadow: `0 0 20px ${rColor}30`,
                }}
              >
                {member.initials}
              </div>
            )}
            <div>
              <h2 className="font-display font-bold text-ink-primary text-base leading-tight">
                {member.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="role-badge"
                  style={{ background: rBg, color: rColor, border: `1px solid ${rColor}30` }}
                >
                  {roleLabel(member.role)}
                </span>
                <span
                  className="inline-flex items-center gap-1 text-xs text-ink-secondary font-mono"
                >
                  <Hash size={9} />
                  {member.discordTag}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-secondary hover:text-ink-primary transition-colors p-1.5 rounded hover:bg-bg-elevated flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Financial stats ── */}
        <div className="p-5 border-b border-ink-border">
          <p className="text-xs font-display font-bold tracking-widest uppercase text-ink-secondary mb-3">
            Finances
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Cette semaine', value: formatMoney(member.weeklyEarned),  color: '#d4af37' },
              { label: 'Ce mois',       value: formatMoney(member.monthlyEarned), color: rColor },
              { label: 'Total cumulé',  value: formatMoney(member.totalEarned),   color: '#22c55e' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded p-3 text-center"
                style={{ background: 'rgba(30,30,46,0.5)', border: '1px solid rgba(42,42,62,0.6)' }}
              >
                <p className="font-mono text-base font-bold leading-tight" style={{ color }}>{value}</p>
                <p className="text-xs text-ink-secondary mt-1 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Performance stats ── */}
        <div className="px-5 pt-4 pb-4 border-b border-ink-border">
          <p className="text-xs font-display font-bold tracking-widest uppercase text-ink-secondary mb-3">
            Performance
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded p-3 flex items-center gap-3"
              style={{ background: 'rgba(30,30,46,0.5)', border: '1px solid rgba(42,42,62,0.6)' }}
            >
              <TrendingUp size={18} style={{ color: rColor, flexShrink: 0 }} />
              <div>
                <p className="font-mono text-lg font-bold text-ink-primary leading-tight">
                  {member.missionsCompleted}
                </p>
                <p className="text-xs text-ink-secondary">Missions terminées</p>
              </div>
            </div>
            <div
              className="rounded p-3 flex items-center gap-3"
              style={{ background: 'rgba(30,30,46,0.5)', border: '1px solid rgba(42,42,62,0.6)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0"
                style={{
                  background: member.successRate >= 70
                    ? 'rgba(34,197,94,0.15)'
                    : member.successRate >= 40
                    ? 'rgba(212,175,55,0.15)'
                    : 'rgba(239,68,68,0.15)',
                  color: member.successRate >= 70 ? '#22c55e' : member.successRate >= 40 ? '#d4af37' : '#ef4444',
                }}
              >
                {member.successRate}%
              </div>
              <div>
                <p
                  className="font-mono text-lg font-bold leading-tight"
                  style={{ color: member.successRate >= 70 ? '#22c55e' : member.successRate >= 40 ? '#d4af37' : '#ef4444' }}
                >
                  {member.successRate}%
                </p>
                <p className="text-xs text-ink-secondary">Taux de succès</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Dernières transactions ── */}
        <div className="px-5 pt-4 pb-4 border-b border-ink-border">
          <p className="text-xs font-display font-bold tracking-widest uppercase text-ink-secondary mb-3">
            Dernières Transactions
          </p>
          {memberTx.length === 0 ? (
            <p className="text-sm text-ink-secondary italic">Aucune transaction enregistrée.</p>
          ) : (
            <div className="space-y-0">
              {memberTx.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2.5 border-b border-ink-border/50 last:border-0"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-1.5 h-5 rounded-full flex-shrink-0"
                      style={{ background: tx.type === 'PROPRE' ? '#22c55e' : '#ef4444' }}
                    />
                    <div>
                      <p className="text-xs text-ink-primary font-medium">{tx.activity}</p>
                      <p className="text-xs text-ink-secondary font-mono">{timeAgo(tx.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className="font-mono text-sm font-bold"
                      style={{ color: tx.type === 'PROPRE' ? '#22c55e' : '#ef4444' }}
                    >
                      {formatMoney(tx.amount)}
                    </p>
                    <span
                      className="text-[10px] font-display font-semibold tracking-wider"
                      style={{ color: tx.type === 'PROPRE' ? '#22c55e88' : '#ef444488' }}
                    >
                      {tx.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Avertissements ── */}
        <div className="px-5 pt-4 pb-4 border-b border-ink-border">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={13} style={{ color: memberWarns.length > 0 ? '#ef4444' : '#6b7280' }} />
            <span className="text-xs font-display font-bold tracking-widest uppercase text-ink-secondary">
              Avertissements
            </span>
            <span
              className="ml-auto text-xs font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                background: memberWarns.length > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(107,114,128,0.1)',
                color: memberWarns.length > 0 ? '#ef4444' : '#6b7280',
              }}
            >
              {memberWarns.length}
            </span>
          </div>

          {memberWarns.length === 0 ? (
            <p className="text-sm text-ink-secondary italic">Aucun avertissement.</p>
          ) : (
            <div className="space-y-2">
              {memberWarns.map((w) => (
                <div
                  key={w.id}
                  className="flex items-start gap-3 p-3 rounded"
                  style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink-primary font-medium">{w.reason}</p>
                    <p className="text-[10px] text-ink-secondary font-mono mt-1">
                      Semaine du {formatDate(w.week_start)} · par {w.issued_by}
                    </p>
                  </div>
                  {isBoss && (
                    <button
                      onClick={() => handleDeleteWarn(w.id)}
                      className="text-ink-secondary hover:text-sale transition-colors flex-shrink-0 p-0.5"
                      title="Supprimer l'avertissement"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Meta ── */}
        <div className="px-5 py-4">
          <div
            className="flex items-center justify-between text-xs text-ink-secondary rounded p-3"
            style={{ background: 'rgba(30,30,46,0.4)', border: '1px solid rgba(42,42,62,0.5)' }}
          >
            <div className="flex items-center gap-1.5">
              <Calendar size={11} />
              <span className="font-mono">Depuis le {formatDate(member.joinedAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={11} />
              <span className="font-mono">Vu {timeAgo(member.lastSeen)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
