import { supabase } from './supabase';
import type { Member, Mission, Transaction, Role, ActivityType, MissionStatus, MoneyType } from '../types';

// ── Types Supabase (snake_case) ───────────────────────────────────────────────

interface MemberRow {
  id: string;
  name: string;
  initials: string;
  role: string;
  discord_id: string | null;
  discord_tag: string;
  discord_avatar: string | null;
  mission_id: string | null;
  total_earned: number;
  weekly_earned: number;
  monthly_earned: number;
  missions_completed: number;
  success_rate: number;
  last_seen: string | null;
  joined_at: string;
  active: boolean;
}

interface MissionRow {
  id: string;
  type: string;
  description: string;
  assigned_to: string | null;
  deadline: string;
  target: number;
  progress: number;
  status: string;
  created_at: string;
}

interface TransactionRow {
  id: string;
  date: string;
  member_id: string | null;
  type: string;
  activity: string;
  amount: number;
  proof: string | null;
}

export interface DailyLogRow {
  id: string;
  member_id: string;
  date: string;
  atms: number;
  acid_farm: number;
}

export interface WeeklyAssignmentRow {
  id: string;
  member_id: string;
  week_day: string;
  mission_label: string;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

const toMember = (r: MemberRow): Member => ({
  id: r.id,
  name: r.name,
  initials: r.initials,
  role: r.role as Role,
  discordTag: r.discord_tag,
  discordAvatar: r.discord_avatar,
  missionId: r.mission_id,
  totalEarned: r.total_earned,
  weeklyEarned: r.weekly_earned,
  monthlyEarned: r.monthly_earned,
  missionsCompleted: r.missions_completed,
  successRate: r.success_rate,
  lastSeen: r.last_seen ?? new Date().toISOString(),
  joinedAt: r.joined_at,
  active: r.active,
});

const toMission = (r: MissionRow): Mission => ({
  id: r.id,
  type: r.type as ActivityType,
  description: r.description,
  assignedTo: r.assigned_to ?? '',
  deadline: r.deadline,
  target: r.target,
  progress: r.progress,
  status: r.status as MissionStatus,
  createdAt: r.created_at,
});

const toTransaction = (r: TransactionRow): Transaction => ({
  id: r.id,
  date: r.date,
  memberId: r.member_id ?? '',
  type: r.type as MoneyType,
  activity: r.activity as ActivityType,
  amount: r.amount,
  proof: r.proof,
});

// ── Members ───────────────────────────────────────────────────────────────────

export const getMembers = async (): Promise<Member[]> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data as MemberRow[]).map(toMember);
};

// ── Missions ──────────────────────────────────────────────────────────────────

export const getMissions = async (): Promise<Mission[]> => {
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as MissionRow[]).map(toMission);
};

// ── Transactions ──────────────────────────────────────────────────────────────

export const getTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data as TransactionRow[]).map(toTransaction);
};

// ── Daily logs ────────────────────────────────────────────────────────────────

export const getDailyLogs = async (): Promise<DailyLogRow[]> => {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return data as DailyLogRow[];
};

export const upsertDailyLog = async (log: DailyLogRow): Promise<void> => {
  const { error } = await supabase
    .from('daily_logs')
    .upsert(log, { onConflict: 'member_id,date' });
  if (error) throw error;
};

export const deleteDailyLog = async (id: string): Promise<void> => {
  const { error } = await supabase.from('daily_logs').delete().eq('id', id);
  if (error) throw error;
};

// ── Weekly assignments ────────────────────────────────────────────────────────

export const getWeeklyAssignments = async (): Promise<WeeklyAssignmentRow[]> => {
  const { data, error } = await supabase.from('weekly_assignments').select('*');
  if (error) throw error;
  return data as WeeklyAssignmentRow[];
};

export const upsertWeeklyAssignment = async (a: WeeklyAssignmentRow): Promise<void> => {
  const { error } = await supabase
    .from('weekly_assignments')
    .upsert(a, { onConflict: 'member_id,week_day' });
  if (error) throw error;
};

export const deleteWeeklyAssignment = async (id: string): Promise<void> => {
  const { error } = await supabase.from('weekly_assignments').delete().eq('id', id);
  if (error) throw error;
};
