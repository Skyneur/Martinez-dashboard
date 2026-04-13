import type { Role, ActivityType } from '../types';

export const formatMoney = (amount: number): string =>
  `$ ${amount.toLocaleString('en-US')}`;

export const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export const formatDateTime = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export const timeAgo = (dateStr: string): string => {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'à l\'instant';
  if (diffMin < 60) return `il y a ${diffMin}min`;
  if (diffH < 24) return `il y a ${diffH}h`;
  return `il y a ${diffD}j`;
};

export const roleLabel = (role: Role): string => {
  const map: Record<Role, string> = {
    boss: 'Boss',
    capo: 'Capo',
    soldato: 'Soldato',
    associe: 'Associé',
  };
  return map[role];
};

export const roleColor = (role: Role): string => {
  const map: Record<Role, string> = {
    boss: '#c41e3a',
    capo: '#f97316',
    soldato: '#eab308',
    associe: '#64748b',
  };
  return map[role];
};

export const roleBgColor = (role: Role): string => {
  const map: Record<Role, string> = {
    boss: 'rgba(196,30,58,0.15)',
    capo: 'rgba(249,115,22,0.12)',
    soldato: 'rgba(234,179,8,0.12)',
    associe: 'rgba(100,116,139,0.12)',
  };
  return map[role];
};

export const activityIcon = (activity: ActivityType): string => {
  const map: Record<ActivityType, string> = {
    Transport: '🚚',
    Blanchiment: '🏦',
    Deal: '💊',
    Extorsion: '⚡',
    Vol: '🔧',
    Collecte: '💰',
    Surveillance: '👁',
  };
  return map[activity];
};
