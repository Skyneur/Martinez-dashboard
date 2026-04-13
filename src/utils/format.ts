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
    boss:    'Boss',
    oncle:   'Oncle',
    segundo: 'Segundo',
    capo:    'Capo',
    bandito: 'Bandito',
    soldato: 'Soldado',
    recrue:  'Recrue',
    associe: 'Associé',
  };
  return map[role];
};

export const roleColor = (role: Role): string => {
  const map: Record<Role, string> = {
    boss:    '#c41e3a',
    oncle:   '#e11d48',
    segundo: '#f97316',
    capo:    '#d4af37',
    bandito: '#84cc16',
    soldato: '#22c55e',
    recrue:  '#94a3b8',
    associe: '#64748b',
  };
  return map[role];
};

export const roleBgColor = (role: Role): string => {
  const map: Record<Role, string> = {
    boss:    'rgba(196,30,58,0.15)',
    oncle:   'rgba(225,29,72,0.12)',
    segundo: 'rgba(249,115,22,0.12)',
    capo:    'rgba(212,175,55,0.12)',
    bandito: 'rgba(132,204,22,0.12)',
    soldato: 'rgba(34,197,94,0.12)',
    recrue:  'rgba(148,163,184,0.10)',
    associe: 'rgba(100,116,139,0.10)',
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
