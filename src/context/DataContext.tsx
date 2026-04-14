import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Member, Mission, Transaction } from '../types';
import { getMembers, getMissions, getTransactions } from '../lib/db';

interface DataContextValue {
  members: Member[];
  missions: Mission[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const DataContext = createContext<DataContextValue>({
  members: [],
  missions: [],
  transactions: [],
  loading: true,
  error: null,
  refetch: () => {},
});

export const useData = () => useContext(DataContext);

export function DataProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, ms, tx] = await Promise.all([
        getMembers(),
        getMissions(),
        getTransactions(),
      ]);
      setMembers(m);
      setMissions(ms);
      setTransactions(tx);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement des données.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <DataContext.Provider value={{ members, missions, transactions, loading, error, refetch: load }}>
      {children}
    </DataContext.Provider>
  );
}
