import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../lib/api';

export interface Shift {
  id: string;
  branchId: number;
  status: 'OPEN' | 'CLOSED';
  startingCash: number;
  actualCash: number | null;
  expectedCash: number | null;
  openedAt: string;
  closedAt: string | null;
  openedById: number;
  closedById: number | null;
  notes: string | null;
}

interface ShiftContextType {
  currentShift: Shift | null;
  loading: boolean;
  fetchCurrentShift: (branchId: string) => Promise<void>;
  openShift: (branchId: string, startingCash: number) => Promise<void>;
  closeShift: (branchId: string, actualCash: number, notes?: string) => Promise<void>;
  clearShift: () => void;
}

const ShiftContext = createContext<ShiftContextType>({
  currentShift: null,
  loading: false,
  fetchCurrentShift: async () => {},
  openShift: async () => {},
  closeShift: async () => {},
  clearShift: () => {},
});

export const useShift = () => useContext(ShiftContext);

export const ShiftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCurrentShift = useCallback(async (branchId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/branches/${branchId}/shifts/current`);
      setCurrentShift(res.data ?? null);
    } catch {
      setCurrentShift(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const openShift = useCallback(async (branchId: string, startingCash: number) => {
    const res = await api.post(`/branches/${branchId}/shifts/open`, { startingCash });
    setCurrentShift(res.data);
  }, []);

  const closeShift = useCallback(async (branchId: string, actualCash: number, notes?: string) => {
    const res = await api.post(`/branches/${branchId}/shifts/close`, { actualCash, notes });
    setCurrentShift(res.data);
  }, []);

  const clearShift = useCallback(() => setCurrentShift(null), []);

  return (
    <ShiftContext.Provider value={{ currentShift, loading, fetchCurrentShift, openShift, closeShift, clearShift }}>
      {children}
    </ShiftContext.Provider>
  );
};
