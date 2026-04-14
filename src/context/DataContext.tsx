import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Member, Mission, Transaction } from '../types';
import { getMembers, getMissions, getTransactions, getMemberWarns, type MemberWarnRow } from '../lib/db';

interface DataContextValue {
  members: Member[];
  missions: Mission[];
  transactions: Transaction[];
  warns: MemberWarnRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  refetchWarns: () => Promise<void>;
}

const DataContext = createContext<DataContextValue>({
  members: [],
  missions: [],
  transactions: [],
  warns: [],
  loading: true,
  error: null,
  refetch: () => {},
  refetchWarns: async () => {},
});

export const useData = () => useContext(DataContext);

export function DataProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [warns, setWarns] = useState<MemberWarnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, ms, tx, w] = await Promise.all([
        getMembers(),
        getMissions(),
        getTransactions(),
        getMemberWarns(),
      ]);
      setMembers(m);
      setMissions(ms);
      setTransactions(tx);
      setWarns(w);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement des données.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refetchWarns = useCallback(async () => {
    const w = await getMemberWarns();
    setWarns(w);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <DataContext.Provider value={{ members, missions, transactions, warns, loading, error, refetch: load, refetchWarns }}>
      {children}
    </DataContext.Provider>
  );
}
