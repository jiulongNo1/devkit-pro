import { useState, useCallback, createContext, useContext } from 'react';
import { storage } from '../utils/storage';
import type { HistoryItem } from '../types';

interface HistoryContextType {
  history: HistoryItem[];
  addHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  getModuleHistory: (moduleId: string) => HistoryItem[];
  clearModuleHistory: (moduleId: string) => void;
}

const HistoryContext = createContext<HistoryContextType | null>(null);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<HistoryItem[]>(() => storage.getHistory());

  const addHistory = useCallback((item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
    };
    storage.addHistory(newItem);
    setHistory(prev => [newItem, ...prev].slice(0, 200));
  }, []);

  const clearHistory = useCallback(() => {
    storage.clearHistory();
    setHistory([]);
  }, []);

  const getModuleHistory = useCallback((moduleId: string) => {
    return history.filter(h => h.moduleId === moduleId).slice(0, 20);
  }, [history]);

  const clearModuleHistory = useCallback((moduleId: string) => {
    const newHistory = history.filter(h => h.moduleId !== moduleId);
    storage.saveHistory(newHistory);
    setHistory(newHistory);
  }, [history]);

  return (
    <HistoryContext.Provider value={{ history, addHistory, clearHistory, getModuleHistory, clearModuleHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
}