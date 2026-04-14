export type Role = 'boss' | 'oncle' | 'segundo' | 'capo' | 'bandito' | 'soldato' | 'recrue' | 'associe';
export type MoneyType = 'SALE' | 'PROPRE';
export type ActivityType =
  | 'Transport'
  | 'Blanchiment'
  | 'Deal'
  | 'Extorsion'
  | 'Vol'
  | 'Collecte'
  | 'Surveillance';

export type MissionStatus = 'active' | 'completed' | 'failed';

export interface Member {
  id: string;
  name: string;
  initials: string;
  role: Role;
  discordTag: string;
  discordAvatar: string | null;
  missionId: string | null;
  totalEarned: number;
  weeklyEarned: number;
  monthlyEarned: number;
  missionsCompleted: number;
  successRate: number;
  lastSeen: string;
  joinedAt: string;
  active: boolean;
}

export interface Mission {
  id: string;
  type: ActivityType;
  description: string;
  assignedTo: string;
  deadline: string;
  target: number;
  progress: number;
  status: MissionStatus;
  createdAt: string;
}

export interface Transaction {
  id: string;
  date: string;
  memberId: string;
  type: MoneyType;
  activity: ActivityType;
  amount: number;
  proof: string | null;
}

export interface WeeklyData {
  name: string;
  amount: number;
  memberId: string;
}

export interface AuthUser {
  id: string;
  name: string;
  discordTag: string;
  role: Role;
  initials: string;
  avatarUrl?: string;
}
